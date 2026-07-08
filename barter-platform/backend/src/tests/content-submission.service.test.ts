import "dotenv/config";
import { describe, expect, it, beforeEach, afterEach, beforeAll, afterAll, jest } from "@jest/globals";
import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "@shared/database/connection";
import { ContentSubmissionService } from "@modules/campaign/services/content-submission.service";
import { ContentSubmission } from "@modules/campaign/models/content-submission.model";
import { Campaign, SocialPlatform } from "@modules/campaign/models/campaign.model";
import { Profile } from "@modules/profile/models/profile.model";
import { User, UserRole } from "@modules/users/models/user.model";
import { PortfolioMedia } from "@modules/portfolio/models/portfolio-media.model";
import { InstagramAccount } from "@modules/instagram/models/instagram-account.model";
import { encrypt } from "@shared/utils/encryption";
import { ValidationError, NotFoundError } from "@shared/errors/app-error";
import fs from "fs";
import path from "path";

describe("ContentSubmissionService Workflow Tests", () => {
  let submissionService: ContentSubmissionService;
  let influencerUser: any;
  let brandUser: any;
  let influencerProfile: any;
  let brandProfile: any;
  let testCampaign: any;
  let mockFilePaths: string[] = [];

  beforeAll(async () => {
    await connectDatabase();
    submissionService = new ContentSubmissionService();

    // Ensure upload and portfolio directories exist on server for file copies
    const campaignDir = path.join(__dirname, "../static/campaigns");
    const portfolioDir = path.join(__dirname, "../static/portfolio");
    if (!fs.existsSync(campaignDir)) fs.mkdirSync(campaignDir, { recursive: true });
    if (!fs.existsSync(portfolioDir)) fs.mkdirSync(portfolioDir, { recursive: true });
  });

  afterAll(async () => {
    // Cleanup any test files generated on disk
    for (const filePath of mockFilePaths) {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {}
      }
    }
    await disconnectDatabase();
  });

  beforeEach(async () => {
    // 1. Create Influencer
    influencerUser = await User.create({
      email: `test_influencer_${Date.now()}@example.com`,
      role: UserRole.INFLUENCER,
      onBoardingCompleted: true,
    });

    influencerProfile = await Profile.create({
      userId: influencerUser._id,
      fullName: "Jane Influencer",
      bio: "Top tier content creator",
      role: UserRole.INFLUENCER,
      username: `jane_creator_${Date.now().toString().slice(-4)}`,
      instagramHandle: `jane_insta_${Date.now()}`,
      stats: { followers: 10000 },
    });

    // Create mock connected InstagramAccount for the influencer
    await InstagramAccount.create({
      userId: influencerUser._id,
      instagramId: "17841400000000000",
      username: "jane_insta_test",
      accessToken: encrypt("mock_instagram_access_token"),
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      followersCount: 10000,
      connectedAt: new Date(),
    });

    // 2. Create Brand
    brandUser = await User.create({
      email: `test_brand_${Date.now()}@example.com`,
      role: UserRole.BRAND,
      onBoardingCompleted: true,
    });

    brandProfile = await Profile.create({
      userId: brandUser._id,
      fullName: "Acme Brand Representative",
      bio: "Acme Corp Brand Representative",
      role: UserRole.BRAND,
      username: `acme_brand_${Date.now().toString().slice(-4)}`,
      instagramHandle: `acme_insta_${Date.now()}`,
    });

    // 3. Create Campaign
    testCampaign = await Campaign.create({
      brandId: brandProfile._id, // Set brandId to the brand profile ID
      brandName: "Acme Corp",
      title: "Holiday Showcase 2026",
      description: "Post a high-quality reel showcasing our products.",
      platform: SocialPlatform.Instagram,
      category: "Fashion",
      budget: 500,
      totalSlots: 5,
      filledSlots: 1,
      followersRequired: "10K+",
      applicants: [
        {
          influencerId: influencerUser._id,
          status: "APPROVED",
          appliedAt: new Date(),
        },
      ],
      status: "ACTIVE",
      startDate: new Date(),
      endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    });

    // Mock global fetch for Instagram Graph API publishing endpoints
    jest.spyOn(global, "fetch").mockImplementation((url: any) => {
      const urlString = String(url);
      if (urlString.includes("/media") && !urlString.includes("fields=permalink") && !urlString.includes("media_publish")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "mock_container_id" }),
        } as Response);
      }
      if (urlString.includes("/media_publish")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "mock_media_id" }),
        } as Response);
      }
      if (urlString.includes("fields=permalink")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ permalink: "https://instagram.com/p/mock-permalink-url" }),
        } as Response);
      }
      return Promise.reject(new Error("Unhandled URL in fetch spy: " + urlString));
    });
  });

  afterEach(async () => {
    jest.restoreAllMocks();

    // Clean up DB documents
    if (influencerUser) {
      await User.deleteOne({ _id: influencerUser._id });
      await Profile.deleteOne({ userId: influencerUser._id });
      await InstagramAccount.deleteOne({ userId: influencerUser._id });
      await PortfolioMedia.deleteMany({ userId: influencerUser._id });
    }
    if (brandUser) {
      await User.deleteOne({ _id: brandUser._id });
      await Profile.deleteOne({ userId: brandUser._id });
    }
    if (testCampaign) {
      await Campaign.deleteOne({ _id: testCampaign._id });
      await ContentSubmission.deleteMany({ campaignId: testCampaign._id });
    }
  });

  // Helper to create a dummy mock file for upload testing
  const createMockFile = (filename: string): string => {
    const filePath = path.join(__dirname, "../static/campaigns", filename);
    fs.writeFileSync(filePath, "dummy-binary-data");
    mockFilePaths.push(filePath);
    return `/static/campaigns/${filename}`;
  };

  describe("Workflow State Machine", () => {
    it("should carry out the entire submission-review-publish lifecycle successfully", async () => {
      const mockFilename = `test-content-${Date.now()}.jpg`;
      const mediaUrl = createMockFile(mockFilename);

      // --- STEP 1: CREATE DRAFT ---
      const draft = await submissionService.createDraft(
        influencerUser._id.toString(),
        testCampaign._id.toString(),
        mediaUrl,
        "IMAGE",
        "Loving this winter jacket from Acme! #ad"
      );

      expect(draft).toBeDefined();
      expect(draft.status).toBe("DRAFT");
      expect(draft.caption).toContain("Loving this winter jacket");
      expect(draft.revisionNumber).toBe(1);

      // --- STEP 2: REJECT DIRECT INSTAGRAM PUBLISHING IN DRAFT ---
      await expect(
        submissionService.publishToInstagram(draft._id.toString(), influencerUser._id.toString())
      ).rejects.toThrow(ValidationError);

      // --- STEP 3: UPDATE DRAFT ---
      const updated = await submissionService.updateDraft(
        draft._id.toString(),
        influencerUser._id.toString(),
        { caption: "New updated caption! #ad" }
      );
      expect(updated.caption).toBe("New updated caption! #ad");
      expect(updated.status).toBe("DRAFT");

      // --- STEP 4: SUBMIT FOR REVIEW ---
      const submitted = await submissionService.submitContent(
        draft._id.toString(),
        influencerUser._id.toString()
      );
      expect(submitted.status).toBe("SUBMITTED");

      // --- STEP 5: BRAND REQUESTS REVISION (CHANGES_REQUESTED) ---
      const revisionRequest = await submissionService.reviewContent(
        draft._id.toString(),
        brandUser._id.toString(),
        "CHANGES_REQUESTED",
        "Could you please add #AcmeShowcase to the caption?"
      );
      expect(revisionRequest.status).toBe("CHANGES_REQUESTED");
      expect(revisionRequest.brandFeedback).toBe("Could you please add #AcmeShowcase to the caption?");

      // --- STEP 6: INFLUENCER RESUBMITS (REVISION COUNTER INCREMENTS) ---
      const resubmittedDraft = await submissionService.updateDraft(
        draft._id.toString(),
        influencerUser._id.toString(),
        { caption: "New updated caption with #AcmeShowcase! #ad" }
      );
      expect(resubmittedDraft.status).toBe("DRAFT"); // goes back to draft
      
      const resubmitted = await submissionService.submitContent(
        draft._id.toString(),
        influencerUser._id.toString()
      );
      expect(resubmitted.status).toBe("SUBMITTED");
      expect(resubmitted.revisionNumber).toBe(2);

      // --- STEP 7: BRAND APPROVES CONTENT ---
      const approved = await submissionService.reviewContent(
        draft._id.toString(),
        brandUser._id.toString(),
        "APPROVED",
        "Looks great!"
      );
      expect(approved.status).toBe("APPROVED");

      // --- STEP 8: PUBLISH TO INSTAGRAM (FALLBACK TRIGGERED FOR LOCALHOST) ---
      const published = await submissionService.publishToInstagram(
        draft._id.toString(),
        influencerUser._id.toString()
      );
      expect(published.status).toBe("PUBLISHED");
      expect(published.instagramPermalink).toBeDefined();
      expect(published.instagramMediaId).toBeDefined();

      // --- STEP 9: ADD TO PORTFOLIO ---
      const portfolioItem = await submissionService.addSubmissionToPortfolio(
        draft._id.toString(),
        influencerUser._id.toString()
      );
      expect(portfolioItem).toBeDefined();
      expect(portfolioItem.title).toContain("Campaign: Holiday Showcase 2026");
      expect(portfolioItem.mediaUrl).toMatch(/^\/static\/portfolio\/.+$/);
      expect(portfolioItem.mediaType).toBe("image");

      // Verify physical file was copied to static/portfolio/
      const copiedFilename = portfolioItem.mediaUrl.replace("/static/portfolio/", "");
      const copiedFilePath = path.join(__dirname, "../static/portfolio", copiedFilename);
      expect(fs.existsSync(copiedFilePath)).toBe(true);
      mockFilePaths.push(copiedFilePath); // mark for cleanup
    });
  });
});
