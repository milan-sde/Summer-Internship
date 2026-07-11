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
import { ValidationError, NotFoundError, ConflictError } from "@shared/errors/app-error";
import fs from "fs";
import path from "path";

jest.setTimeout(20000);

describe("ContentSubmissionService Multi-Deliverable Tests", () => {
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

    const campaignDir = path.join(__dirname, "../../static/campaigns");
    const portfolioDir = path.join(__dirname, "../../static/portfolio");
    if (!fs.existsSync(campaignDir)) fs.mkdirSync(campaignDir, { recursive: true });
    if (!fs.existsSync(portfolioDir)) fs.mkdirSync(portfolioDir, { recursive: true });
  });

  afterAll(async () => {
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
      email: `test_influencer_multi_${Date.now()}@example.com`,
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
      email: `test_brand_multi_${Date.now()}@example.com`,
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
      brandId: brandProfile._id,
      brandName: "Acme Corp",
      title: "Holiday Showcase Multi 2026",
      description: "Post high-quality items showcasing our products.",
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
      if (urlString.includes("fields=status_code")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ status_code: "FINISHED" }),
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

  const createMockFile = (filename: string): string => {
    const filePath = path.join(__dirname, "../../static/campaigns", filename);
    fs.writeFileSync(filePath, "dummy-binary-data");
    mockFilePaths.push(filePath);
    return `/static/campaigns/${filename}`;
  };

  describe("Multi-Deliverable Operations", () => {
    it("should allow creating, submitting, reviewing, and publishing multiple deliverables independently", async () => {
      const influencerId = influencerUser._id.toString();
      const campaignId = testCampaign._id.toString();
      const brandUserId = brandUser._id.toString();

      // TEST 1: Influencer creates Post 1 -> DRAFT
      const file1 = createMockFile(`post-1-${Date.now()}.jpg`);
      const post1 = await submissionService.createDraft(
        influencerId,
        campaignId,
        file1,
        "test-public-id-1",
        "IMAGE",
        "This is deliverable 1!"
      );
      expect(post1).toBeDefined();
      expect(post1.status).toBe("DRAFT");
      expect(post1.caption).toBe("This is deliverable 1!");

      // TEST 2: Influencer submits Post 1 -> SUBMITTED
      const post1Submitted = await submissionService.submitContent(post1._id.toString(), influencerId);
      expect(post1Submitted.status).toBe("SUBMITTED");

      // TEST 3: Without waiting for brand review, influencer creates Post 2 -> DRAFT (SUCCESS)
      const file2 = createMockFile(`post-2-${Date.now()}.jpg`);
      const post2 = await submissionService.createDraft(
        influencerId,
        campaignId,
        file2,
        "test-public-id-2",
        "IMAGE",
        "This is deliverable 2!"
      );
      expect(post2).toBeDefined();
      expect(post2.status).toBe("DRAFT");
      expect(post2.caption).toBe("This is deliverable 2!");

      // TEST 4: Influencer submits Post 2 -> SUBMITTED
      const post2Submitted = await submissionService.submitContent(post2._id.toString(), influencerId);
      expect(post2Submitted.status).toBe("SUBMITTED");

      // Verify that getSubmissionsByCampaign returns BOTH submissions for the influencer
      const submissions = await submissionService.getSubmissionsByCampaign(campaignId, influencerId);
      expect(submissions.length).toBe(2);
      expect(submissions.map(s => s.status)).toContain("SUBMITTED");

      // TEST 5: Brand approves only Post 1 -> APPROVED, Post 2 remains SUBMITTED
      const post1Reviewed = await submissionService.reviewContent(
        post1._id.toString(),
        brandUserId,
        "APPROVED",
        "Post 1 approved!"
      );
      expect(post1Reviewed.status).toBe("APPROVED");

      // Verify Post 2 remains SUBMITTED
      const post2Check = await ContentSubmission.findById(post2._id);
      expect(post2Check?.status).toBe("SUBMITTED");

      // TEST 7: Brand requests changes to Post 2 -> CHANGES_REQUESTED
      const post2Reviewed = await submissionService.reviewContent(
        post2._id.toString(),
        brandUserId,
        "CHANGES_REQUESTED",
        "Update the caption for Post 2, please."
      );
      expect(post2Reviewed.status).toBe("CHANGES_REQUESTED");
      expect(post2Reviewed.brandFeedback).toBe("Update the caption for Post 2, please.");

      // Verify Post 1 remains APPROVED
      const post1Check = await ContentSubmission.findById(post1._id);
      expect(post1Check?.status).toBe("APPROVED");

      // TEST 8: Influencer edits and resubmits Post 2
      const post2Draft = await submissionService.updateDraft(
        post2._id.toString(),
        influencerId,
        { caption: "Updated caption for Post 2!" }
      );
      expect(post2Draft.status).toBe("DRAFT");

      const post2Resubmitted = await submissionService.submitContent(post2._id.toString(), influencerId);
      expect(post2Resubmitted.status).toBe("SUBMITTED");
      expect(post2Resubmitted.revisionNumber).toBe(2);

      // TEST 9: Influencer publishes Post 1 -> PUBLISHED (Post 2 remains SUBMITTED)
      const post1Published = await submissionService.publishToInstagram(post1._id.toString(), influencerId);
      expect(post1Published.status).toBe("PUBLISHED");

      const post2CheckAfterPublish = await ContentSubmission.findById(post2._id);
      expect(post2CheckAfterPublish?.status).toBe("SUBMITTED");

      // TEST 10: Influencer creates Post 3 after Post 1 is published -> DRAFT (SUCCESS)
      const file3 = createMockFile(`post-3-${Date.now()}.jpg`);
      const post3 = await submissionService.createDraft(
        influencerId,
        campaignId,
        file3,
        "test-public-id-3",
        "IMAGE",
        "This is deliverable 3!"
      );
      expect(post3).toBeDefined();
      expect(post3.status).toBe("DRAFT");
    });
  });
});
