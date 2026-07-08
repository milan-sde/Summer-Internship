import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "@shared/database/connection";
import { UserRepository } from "@modules/users/repositories/user.repository";
import { UserRole } from "@modules/users/models/user.model";
import { Profile } from "@modules/profile/models/profile.model";
import { User } from "@modules/users/models/user.model";
import { InstagramService } from "@modules/instagram/service/instagram.service";
import { InstagramMedia } from "@modules/instagram/models/instagram-media.model";
import { InstagramAccount } from "@modules/instagram/models/instagram-account.model";

dotenv.config();

// MOCK GLOBAL FETCH API
const mockFetch = () => {
  const originalFetch = global.fetch;

  global.fetch = (async (url: any, init?: any) => {
    const urlString = String(url);

    // Mock Profile Details call
    if (urlString.includes("followers_count") && !urlString.includes("/media")) {
      console.log(`📡 [Mock HTTP Get] Profile request intercepted: ${urlString}`);
      return {
        ok: true,
        json: async () => ({
          id: "17841400000000000",
          username: "instagram_tester_jane",
          name: "Jane Tester",
          profile_picture_url: "https://mock-cdn.com/jane-avatar.jpg",
          followers_count: 8900,
        }),
      } as Response;
    }

    // Mock Media Feed call
    if (urlString.includes("/media?")) {
      console.log(`📡 [Mock HTTP Get] Media feed request intercepted: ${urlString}`);
      return {
        ok: true,
        json: async () => ({
          data: [
            {
              id: "ig_post_1001",
              caption: "Loving the sunset! #lifestyle",
              media_type: "IMAGE",
              media_url: "https://mock-cdn.com/sunset.jpg",
              permalink: "https://www.instagram.com/p/sunset1001/",
              timestamp: new Date().toISOString(),
              username: "instagram_tester_jane",
            },
            {
              id: "ig_post_1002",
              caption: "Reviewing this new unboxing video!",
              media_type: "VIDEO",
              media_url: "https://mock-cdn.com/unboxing.mp4",
              permalink: "https://www.instagram.com/p/unboxing1002/",
              thumbnail_url: "https://mock-cdn.com/unboxing-thumb.jpg",
              timestamp: new Date(Date.now() - 3600000).toISOString(),
              username: "instagram_tester_jane",
            },
          ],
        }),
      } as Response;
    }

    return originalFetch(url, init);
  }) as any;
};

const runInstagramSyncTest = async () => {
  console.log("🧪 Starting Instagram Sync Mock Integration Test...\n");

  const userRepo = new UserRepository();
  const instagramService = new InstagramService();
  
  let tempUser: any = null;
  let tempProfile: any = null;

  try {
    // 1. Connect to MongoDB
    await connectDatabase();
    console.log("✅ Connected to MongoDB");

    // Enable mock network calls
    mockFetch();
    console.log("🛠️ Hooked mock HTTP intercepts for Graph API");

    // 2. Create mock user
    console.log("🤳 Creating test influencer...");
    tempUser = await userRepo.create({
      email: `ig_sync_test_${Date.now()}@example.com`,
      role: UserRole.INFLUENCER,
    });

    // We store a mock encrypted token
    const mockToken = "EAABw0...dummy_long_lived_token";
    const encryptedMockToken = require("@shared/utils/encryption").encrypt(mockToken);

    tempProfile = await Profile.create({
      userId: tempUser._id,
      fullName: "Jane Tester",
      bio: "Influencer content test",
      role: UserRole.INFLUENCER,
      username: `ig_test_user_${Date.now().toString().slice(-10)}`,
      instagramHandle: `ig_handle_${Date.now().toString().slice(-10)}`,
      instagram: {
        instagramId: "17841400000000000",
        username: "instagram_tester_jane",
        accessToken: encryptedMockToken,
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        followersCount: 0,
        connectedAt: new Date(),
      },
    });
    console.log(`✅ Test influencer profile created (ID: ${tempUser._id})`);

    await InstagramAccount.create({
      userId: tempUser._id,
      instagramId: "17841400000000000",
      username: "instagram_tester_jane",
      accessToken: encryptedMockToken,
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      followersCount: 0,
      connectedAt: new Date(),
    });
    console.log("✅ Test InstagramAccount connection created");

    // 3. Trigger Sync Service
    console.log("\n♻️ Triggering Instagram Sync service...");
    await instagramService.syncInstagramData(tempUser._id.toString());

    // 4. Validate updates in Profile
    console.log("\n🔍 Test 4: Verifying Profile updates...");
    const updatedProfile = await Profile.findOne({ userId: tempUser._id });
    if (!updatedProfile) throw new Error("Profile not found");

    console.log(`   Followers Count (Cached): ${updatedProfile.instagram?.followersCount}`);
    console.log(`   Profile Picture URL: ${updatedProfile.instagram?.profilePicture}`);
    console.log(`   Denormalized followers: ${updatedProfile.platforms?.instagram?.followers}`);
    console.log(`   Global profile stats.followers: ${updatedProfile.stats.followers}`);

    if (updatedProfile.instagram?.followersCount !== 8900) {
      throw new Error("Instagram followers count was not updated to 8900");
    }
    if (updatedProfile.stats.followers !== 8900) {
      throw new Error("Global stats.followers was not updated to 8900");
    }
    console.log("✅ Profile updates verified successfully!");

    // 5. Validate synced media in Mongoose
    console.log("\n🔍 Test 5: Verifying Synced Media cache in MongoDB...");
    const syncedMedia = await InstagramMedia.find({ userId: tempUser._id }).sort({ createdAt: 1 });
    console.log(`   Retrieved ${syncedMedia.length} posts from cache database`);

    if (syncedMedia.length !== 2) {
      throw new Error(`Expected 2 synced posts, but got ${syncedMedia.length}`);
    }

    console.log(`   Post 1 Type: ${syncedMedia[0].mediaType}, ID: ${syncedMedia[0].mediaId}`);
    console.log(`   Post 2 Type: ${syncedMedia[1].mediaType}, ID: ${syncedMedia[1].mediaId}`);

    if (syncedMedia[0].mediaId !== "ig_post_1001" || syncedMedia[1].mediaId !== "ig_post_1002") {
      throw new Error("Media syncing chronological sort / insertion ID mismatch");
    }
    console.log("✅ Synced media validation verified successfully!");

    console.log("\n🎉 ALL INSTAGRAM MEDIA SYNC INTEGRATION TESTS PASSED!");
  } catch (error) {
    console.error("❌ Integration Test failed:", error);
  } finally {
    // Cleanup database
    console.log("\n🧹 Cleaning up test users, profiles, and media caches...");
    if (tempProfile) {
      await Profile.deleteOne({ _id: tempProfile._id });
    }
    if (tempUser) {
      await User.deleteOne({ _id: tempUser._id });
      await InstagramMedia.deleteMany({ userId: tempUser._id });
      await InstagramAccount.deleteOne({ userId: tempUser._id });
    }
    
    await disconnectDatabase();
    console.log("📴 Database disconnected");
  }
};

runInstagramSyncTest();
