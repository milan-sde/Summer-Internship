import "dotenv/config";
import { describe, expect, it, beforeEach, afterEach, beforeAll, afterAll, jest } from "@jest/globals";
import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "@shared/database/connection";
import { InstagramService } from "@modules/instagram/service/instagram.service";
import { Profile } from "@modules/profile/models/profile.model";
import { User, UserRole } from "@modules/users/models/user.model";
import { InstagramAccount } from "@modules/instagram/models/instagram-account.model";
import { MediaCatalogue } from "@modules/instagram/models/media-catalogue.model";
import { encrypt, decrypt } from "@shared/utils/encryption";
import { ValidationError, NotFoundError } from "@shared/errors/app-error";

describe("InstagramService", () => {
  let instagramService: InstagramService;
  let testUser: any;
  let testProfile: any;
  const mockAccessToken = "EAABw0_mock_token";
  let fetchSpy: any;

  beforeAll(async () => {
    await connectDatabase();
    instagramService = new InstagramService();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    // Create a temporary user and profile for testing
    const uniqueEmail = `test_service_${Date.now()}@example.com`;
    testUser = await User.create({
      email: uniqueEmail,
      role: UserRole.INFLUENCER,
      onBoardingCompleted: true,
    });

    testProfile = await Profile.create({
      userId: testUser._id,
      fullName: "Service Tester",
      bio: "Testing instagram service",
      role: UserRole.INFLUENCER,
      username: `test_service_${Date.now().toString().slice(-6)}`,
      instagramHandle: `handle_${Date.now()}_${Math.random().toString().slice(2, 6)}`,
      stats: { followers: 0 },
    });

    fetchSpy = jest.spyOn(global, "fetch");
  });

  afterEach(async () => {
    // Cleanup database documents
    if (testUser) {
      await User.deleteOne({ _id: testUser._id });
      await Profile.deleteOne({ userId: testUser._id });
      await InstagramAccount.deleteOne({ userId: testUser._id });
      await MediaCatalogue.deleteMany({ userId: testUser._id });
    }
    fetchSpy.mockRestore();
  });

  describe("getAuthUrl", () => {
    it("should generate a valid Facebook OAuth redirect URL containing encrypted state", () => {
      const authUrl = instagramService.getAuthUrl(testUser._id.toString(), "settings");
      expect(authUrl).toContain("https://www.facebook.com/");
      expect(authUrl).toContain("client_id=");
      expect(authUrl).toContain("state=");

      // Parse state
      const url = new URL(authUrl);
      const stateParam = url.searchParams.get("state");
      expect(stateParam).not.toBeNull();

      const decrypted = JSON.parse(decrypt(stateParam!));
      expect(decrypted.userId).toBe(testUser._id.toString());
      expect(decrypted.origin).toBe("settings");
    });

    it("should throw a ValidationError if required environment configuration is missing", () => {
      const origAppId = process.env.FACEBOOK_APP_ID;
      delete process.env.FACEBOOK_APP_ID;
      try {
        expect(() => {
          instagramService.getAuthUrl(testUser._id.toString(), "settings");
        }).toThrow(ValidationError);
      } finally {
        process.env.FACEBOOK_APP_ID = origAppId;
      }
    });
  });

  describe("handleOAuthCallback", () => {
    it("should throw ValidationError if code or state is missing", async () => {
      await expect(
        instagramService.handleOAuthCallback("", "someState")
      ).rejects.toThrow(ValidationError);

      await expect(
        instagramService.handleOAuthCallback("someCode", "")
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError if state is invalid or tampered", async () => {
      await expect(
        instagramService.handleOAuthCallback("someCode", "invalidStateString")
      ).rejects.toThrow(ValidationError);
    });

    it("should successfully upgrade token, find business page, and connect account", async () => {
      const stateObj = {
        userId: testUser._id.toString(),
        origin: "onboarding",
        timestamp: Date.now(),
      };
      const encryptedState = encrypt(JSON.stringify(stateObj));

      // Mock fetch responses for OAuth handshake & discovery:
      // 1. Short-lived token exchange
      // 2. Long-lived token upgrade
      // 3. FB Pages accounts list
      // 4. IG Profile statistics
      // 5. Media list fetch (triggered inside handleOAuthCallback)
      fetchSpy.mockImplementation((url: string) => {
        const u = url.toString();
        if (u.includes("/oauth/access_token") && u.includes("code=")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ access_token: "short_lived_token_123" }),
          } as any);
        }
        if (u.includes("/oauth/access_token") && u.includes("fb_exchange_token=")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ access_token: mockAccessToken, expires_in: 3600 }),
          } as any);
        }
        if (u.includes("/me/accounts")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              data: [
                {
                  id: "facebook_page_id",
                  name: "My Page",
                  instagram_business_account: {
                    id: "ig_business_id_456",
                    username: "tester_ig",
                    profile_picture_url: "https://mock.com/avatar.png",
                  },
                },
              ],
            }),
          } as any);
        }
        if (u.includes("/ig_business_id_456") && !u.includes("/media")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              username: "tester_ig",
              followers_count: 5000,
              media_count: 2,
              profile_picture_url: "https://mock.com/avatar.png",
            }),
          } as any);
        }
        if (u.includes("/media")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              data: [
                {
                  id: "media_1",
                  caption: "Great day!",
                  media_type: "IMAGE",
                  media_url: "https://mock.com/image.jpg",
                  permalink: "https://mock.com/post1",
                  timestamp: new Date().toISOString(),
                },
              ],
            }),
          } as any);
        }
        return Promise.reject(new Error(`Unhandled URL: ${u}`));
      });

      const result = await instagramService.handleOAuthCallback("testCode", encryptedState);
      expect(result.origin).toBe("onboarding");
      expect(result.userId).toBe(testUser._id.toString());

      // Verify db account exists
      const account = await InstagramAccount.findOne({ userId: testUser._id });
      expect(account).not.toBeNull();
      expect(account?.instagramId).toBe("ig_business_id_456");
      expect(account?.username).toBe("tester_ig");
      expect(account?.followersCount).toBe(5000);
      expect(decrypt(account!.accessToken)).toBe(mockAccessToken);

      // Verify profile updated
      const profile = await Profile.findOne({ userId: testUser._id });
      expect(profile?.instagram?.instagramId).toBe("ig_business_id_456");
      expect(profile?.platforms?.instagram?.followers).toBe(5000);
      expect(profile?.stats.followers).toBe(5000);
    });

    it("should throw ValidationError if Facebook Pages API reports error", async () => {
      const stateObj = {
        userId: testUser._id.toString(),
        origin: "settings",
        timestamp: Date.now(),
      };
      const encryptedState = encrypt(JSON.stringify(stateObj));

      fetchSpy.mockImplementation((url: string) => {
        const u = url.toString();
        if (u.includes("/oauth/access_token")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ access_token: "short_lived" }),
          } as any);
        }
        if (u.includes("/me/accounts")) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: { message: "Graph error message" } }),
          } as any);
        }
        return Promise.reject(new Error(`Unhandled URL: ${u}`));
      });

      await expect(
        instagramService.handleOAuthCallback("testCode", encryptedState)
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError if no connected Instagram Business account is found on Facebook pages", async () => {
      const stateObj = {
        userId: testUser._id.toString(),
        origin: "settings",
        timestamp: Date.now(),
      };
      const encryptedState = encrypt(JSON.stringify(stateObj));

      fetchSpy.mockImplementation((url: string) => {
        const u = url.toString();
        if (u.includes("/oauth/access_token")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ access_token: "short_lived" }),
          } as any);
        }
        if (u.includes("/me/accounts")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              data: [
                {
                  id: "facebook_page_id",
                  name: "My Page"
                  // No instagram_business_account
                },
              ],
            }),
          } as any);
        }
        return Promise.reject(new Error(`Unhandled: ${u}`));
      });

      await expect(
        instagramService.handleOAuthCallback("testCode", encryptedState)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("syncProfile", () => {
    it("should successfully fetch profile data, update InstagramAccount, and update Profile document", async () => {
      await InstagramAccount.create({
        userId: testUser._id,
        instagramId: "ig_business_id_456",
        username: "tester_ig",
        followersCount: 100,
        mediaCount: 1,
        accessToken: encrypt(mockAccessToken),
        connectedAt: new Date(),
      });

      fetchSpy.mockImplementation((url: string) => {
        const u = url.toString();
        if (u.includes("/ig_business_id_456")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              username: "tester_ig_updated",
              followers_count: 7500,
              media_count: 5,
              profile_picture_url: "https://mock.com/avatar-updated.png",
            }),
          } as any);
        }
        return Promise.reject(new Error(`Unhandled: ${u}`));
      });

      const updatedAccount = await instagramService.syncProfile(testUser._id.toString());
      expect(updatedAccount?.username).toBe("tester_ig_updated");
      expect(updatedAccount?.followersCount).toBe(7500);

      // Verify profile is also updated
      const profile = await Profile.findOne({ userId: testUser._id });
      expect(profile?.instagram?.followersCount).toBe(7500);
      expect(profile?.instagram?.username).toBe("tester_ig_updated");
      expect(profile?.instagram?.profilePicture).toBe("https://mock.com/avatar-updated.png");
      expect(profile?.platforms?.instagram?.followers).toBe(7500);
      expect(profile?.stats.followers).toBe(7500);
    });

    it("should throw ValidationError if account is not connected", async () => {
      await expect(
        instagramService.syncProfile(testUser._id.toString())
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError if access token is expired or Graph API returns error", async () => {
      await InstagramAccount.create({
        userId: testUser._id,
        instagramId: "ig_business_id_456",
        username: "tester_ig",
        followersCount: 100,
        accessToken: encrypt(mockAccessToken),
        connectedAt: new Date(),
      });

      fetchSpy.mockImplementation((url: string) => {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: { message: "Error: Session has expired" } }),
        } as any);
      });

      await expect(
        instagramService.syncProfile(testUser._id.toString())
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("syncMedia", () => {
    beforeEach(async () => {
      await InstagramAccount.create({
        userId: testUser._id,
        instagramId: "ig_business_id_456",
        username: "tester_ig",
        followersCount: 100,
        mediaCount: 1,
        accessToken: encrypt(mockAccessToken),
        connectedAt: new Date(),
      });
    });

    it("should fetch media items, upsert to MediaCatalogue, and preserve existing portfolio selections", async () => {
      // Create an existing media item that is selected for portfolio
      await MediaCatalogue.create({
        userId: testUser._id,
        mediaId: "media_selected",
        mediaType: "IMAGE",
        mediaUrl: "https://mock.com/old.jpg",
        selectedForPortfolio: true,
        source: "instagram",
      });

      fetchSpy.mockImplementation((url: string) => {
        const u = url.toString();
        if (u.includes("/ig_business_id_456/media")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              data: [
                {
                  id: "media_selected", // Same ID as above, should preserve portfolio selection
                  caption: "Updated caption",
                  media_type: "IMAGE",
                  media_url: "https://mock.com/updated.jpg",
                  permalink: "https://mock.com/updated-link",
                  timestamp: new Date().toISOString(),
                },
                {
                  id: "media_new",
                  caption: "Brand new post",
                  media_type: "VIDEO",
                  media_url: "https://mock.com/video.mp4",
                  thumbnail_url: "https://mock.com/video-thumb.jpg",
                  permalink: "https://mock.com/video-link",
                  timestamp: new Date().toISOString(),
                },
              ],
            }),
          } as any);
        }
        return Promise.reject(new Error(`Unhandled: ${u}`));
      });

      const syncedMedia = await instagramService.syncMedia(testUser._id.toString());
      expect(syncedMedia.length).toBe(2);

      // Verify the selected item preserved its portfolio state
      const itemSelected = await MediaCatalogue.findOne({ userId: testUser._id, mediaId: "media_selected" });
      expect(itemSelected?.selectedForPortfolio).toBe(true);
      expect(itemSelected?.mediaUrl).toBe("https://mock.com/updated.jpg"); // updated
      expect(itemSelected?.caption).toBe("Updated caption"); // updated

      // Verify the new item got created with false as default
      const itemNew = await MediaCatalogue.findOne({ userId: testUser._id, mediaId: "media_new" });
      expect(itemNew?.selectedForPortfolio).toBe(false);
      expect(itemNew?.mediaType).toBe("VIDEO");
      expect(itemNew?.thumbnailUrl).toBe("https://mock.com/video-thumb.jpg");
    });
  });

  describe("disconnect", () => {
    it("should delete all user Instagram database entries and clear profile instagram properties", async () => {
      // 1. Setup account and media items
      await InstagramAccount.create({
        userId: testUser._id,
        instagramId: "ig_business_id_456",
        username: "tester_ig",
        followersCount: 5000,
        accessToken: encrypt(mockAccessToken),
        connectedAt: new Date(),
      });

      await MediaCatalogue.create({
        userId: testUser._id,
        mediaId: "media_to_delete",
        mediaType: "IMAGE",
        mediaUrl: "https://mock.com/img.jpg",
        source: "instagram",
      });

      // Update Profile to have active Instagram config
      testProfile.instagram = {
        instagramId: "ig_business_id_456",
        username: "tester_ig",
        accessToken: encrypt(mockAccessToken),
        followersCount: 5000,
        connectedAt: new Date(),
      };
      testProfile.platforms = {
        instagram: { username: "tester_ig", followers: 5000 },
        youtube: { username: "yt_chan", followers: 3000 },
      };
      testProfile.stats.followers = 5000;
      await testProfile.save();

      // 2. Perform disconnect
      await instagramService.disconnect(testUser._id.toString());

      // 3. Verify cleanups
      const account = await InstagramAccount.findOne({ userId: testUser._id });
      expect(account).toBeNull();

      const mediaItems = await MediaCatalogue.find({ userId: testUser._id });
      expect(mediaItems.length).toBe(0);

      const profile = await Profile.findOne({ userId: testUser._id });
      expect(profile?.instagram?.instagramId).toBeUndefined();
      expect(profile?.platforms?.instagram?.username).toBeUndefined();
      
      // Maximum followers should fall back to YouTube followers
      expect(profile?.stats.followers).toBe(3000);
    });
  });
});
