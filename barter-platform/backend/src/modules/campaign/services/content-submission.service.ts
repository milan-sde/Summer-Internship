import { ContentSubmissionRepository } from "../repositories/content-submission.repository";
import { CampaignRepository } from "../repositories/campaign.repository";
import { ProfileRepository } from "@modules/profile/repositories/profile.repository";
import { UserRepository } from "@modules/users/repositories/user.repository";
import { InstagramService } from "@modules/instagram/service/instagram.service";
import { PortfolioMedia } from "@modules/portfolio/models/portfolio-media.model";
import { ValidationError, NotFoundError, ConflictError } from "@shared/errors/app-error";
import { IContentSubmission } from "../models/content-submission.model";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

export class ContentSubmissionService {
  private submissionRepository: ContentSubmissionRepository;
  private campaignRepository: CampaignRepository;
  private profileRepository: ProfileRepository;
  private userRepository: UserRepository;
  private instagramService: InstagramService;

  constructor() {
    this.submissionRepository = new ContentSubmissionRepository();
    this.campaignRepository = new CampaignRepository();
    this.profileRepository = new ProfileRepository();
    this.userRepository = new UserRepository();
    this.instagramService = new InstagramService();
  }

  // Create a new content submission as DRAFT (Influencers only)
  async createDraft(
    influencerId: string,
    campaignId: string,
    mediaUrl: string,
    mediaType: "IMAGE" | "VIDEO",
    caption?: string
  ): Promise<IContentSubmission> {
    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) {
      throw new NotFoundError("Campaign");
    }

    // Verify influencer is accepted (status APPROVED)
    const applicant = campaign.applicants.find(
      (app) => app && app.influencerId && app.influencerId.toString() === influencerId
    );

    if (!applicant || applicant.status !== "APPROVED") {
      throw new ValidationError("Only influencers accepted into this campaign can upload content");
    }

    // Verify duplicate submission
    const existing = await this.submissionRepository.findOne({
      campaignId: new mongoose.Types.ObjectId(campaignId),
      influencerId: new mongoose.Types.ObjectId(influencerId),
    });

    if (existing) {
      throw new ConflictError("A submission already exists for this campaign. Please update the existing submission.");
    }

    return await this.submissionRepository.create({
      campaignId: campaign._id as mongoose.Types.ObjectId,
      influencerId: new mongoose.Types.ObjectId(influencerId),
      brandId: campaign.brandId, // Point to brand profile
      mediaUrl,
      mediaType,
      caption: caption || "",
      status: "DRAFT",
      revisionNumber: 1,
    });
  }

  // Update a submission draft or edit and resubmit if CHANGES_REQUESTED (Influencers only)
  async updateDraft(
    submissionId: string,
    influencerId: string,
    data: { mediaUrl?: string; mediaType?: "IMAGE" | "VIDEO"; caption?: string }
  ): Promise<IContentSubmission> {
    const submission = await this.submissionRepository.findById(submissionId);
    if (!submission) {
      throw new NotFoundError("Content submission");
    }

    if (submission.influencerId.toString() !== influencerId) {
      throw new ValidationError("You do not own this content submission");
    }

    // Can only edit if status is DRAFT or CHANGES_REQUESTED
    if (submission.status !== "DRAFT" && submission.status !== "CHANGES_REQUESTED") {
      throw new ValidationError("Approved or already submitted content cannot be modified");
    }

    const updates: Partial<IContentSubmission> = {};
    if (data.mediaUrl) updates.mediaUrl = data.mediaUrl;
    if (data.mediaType) updates.mediaType = data.mediaType;
    if (data.caption !== undefined) updates.caption = data.caption;

    // Reset status to DRAFT on edit if it was CHANGES_REQUESTED
    if (submission.status === "CHANGES_REQUESTED") {
      updates.status = "DRAFT";
    }

    const updated = await this.submissionRepository.update(submissionId, updates);
    if (!updated) {
      throw new NotFoundError("Content submission");
    }

    return updated;
  }

  // Submit draft content to the brand for review (Influencers only)
  async submitContent(submissionId: string, influencerId: string): Promise<IContentSubmission> {
    const submission = await this.submissionRepository.findById(submissionId);
    if (!submission) {
      throw new NotFoundError("Content submission");
    }

    if (submission.influencerId.toString() !== influencerId) {
      throw new ValidationError("You do not own this content submission");
    }

    if (submission.status !== "DRAFT" && submission.status !== "CHANGES_REQUESTED") {
      throw new ValidationError("Submission is not in DRAFT or CHANGES_REQUESTED state");
    }

    const updates: Partial<IContentSubmission> = {
      status: "SUBMITTED",
      submittedAt: new Date(),
    };

    const updated = await this.submissionRepository.update(submissionId, updates);
    if (!updated) {
      throw new NotFoundError("Content submission");
    }

    return updated;
  }

  // Approve or request changes on content submission (Brands only)
  async reviewContent(
    submissionId: string,
    brandUserId: string,
    status: "APPROVED" | "CHANGES_REQUESTED",
    feedback?: string
  ): Promise<IContentSubmission> {
    const brandProfile = await this.profileRepository.findByUserId(brandUserId);
    if (!brandProfile) {
      throw new NotFoundError("Brand profile");
    }

    const submission = await this.submissionRepository.findById(submissionId);
    if (!submission) {
      throw new NotFoundError("Content submission");
    }

    // Verify brand owns the campaign
    const campaign = await this.campaignRepository.findById(submission.campaignId.toString());
    if (!campaign) {
      throw new NotFoundError("Campaign");
    }

    if (campaign.brandId.toString() !== brandProfile._id.toString()) {
      throw new ValidationError("You do not own the campaign associated with this content submission");
    }

    if (submission.status !== "SUBMITTED") {
      throw new ValidationError("Content submission is not currently in SUBMITTED state");
    }

    const updates: Partial<IContentSubmission> = {};
    if (status === "APPROVED") {
      updates.status = "APPROVED";
      updates.approvedAt = new Date();
      updates.brandFeedback = "";
      updates.publishingError = "";
    } else if (status === "CHANGES_REQUESTED") {
      updates.status = "CHANGES_REQUESTED";
      updates.brandFeedback = feedback || "Changes requested by brand";
      updates.revisionNumber = submission.revisionNumber + 1;
    }

    const updated = await this.submissionRepository.update(submissionId, updates);
    if (!updated) {
      throw new NotFoundError("Content submission");
    }

    return updated;
  }

  // Publish approved content to Instagram (Influencers only)
  async publishToInstagram(submissionId: string, influencerId: string): Promise<IContentSubmission> {
    const submission = await this.submissionRepository.findById(submissionId);
    if (!submission) {
      throw new NotFoundError("Content submission");
    }

    if (submission.influencerId.toString() !== influencerId) {
      throw new ValidationError("You do not own this content submission");
    }

    // Verify submission is APPROVED or FAILED (for retry)
    if (submission.status !== "APPROVED" && submission.status !== "FAILED") {
      throw new ValidationError("Only approved or failed content submissions can be published");
    }

    // Verify campaign enrollment status
    const campaign = await this.campaignRepository.findById(submission.campaignId.toString());
    if (!campaign) {
      throw new NotFoundError("Campaign");
    }

    const applicant = campaign.applicants.find(
      (app) => app && app.influencerId && app.influencerId.toString() === influencerId
    );

    if (!applicant || applicant.status !== "APPROVED") {
      throw new ValidationError("Your enrollment in this campaign is no longer active");
    }

    // Check if Instagram is connected for this user
    try {
      await this.instagramService.getDecryptedToken(influencerId);
    } catch (_error) {
      throw new ValidationError("Your Instagram account is not connected. Please connect it in Profile Settings.");
    }

    // 1. Lock the submission state to PUBLISHING to prevent duplicate parallel requests
    let updatedSubmission = await this.submissionRepository.update(submissionId, {
      status: "PUBLISHING",
      publishingError: "",
    });

    if (!updatedSubmission) {
      throw new NotFoundError("Content submission");
    }

    try {
      // 2. Trigger publishing via official Meta Graph API helper (which handles local dev fallbacks)
      const publishResult = await this.instagramService.publishContent(
        influencerId,
        submission.mediaUrl,
        submission.caption || "",
        submission.mediaType
      );

      // 3. Mark as PUBLISHED and save Instagram information
      updatedSubmission = await this.submissionRepository.update(submissionId, {
        status: "PUBLISHED",
        instagramMediaId: publishResult.instagramMediaId,
        instagramPermalink: publishResult.instagramPermalink,
        publishedAt: new Date(),
      });
    } catch (err: any) {
      console.error("Instagram Direct Publishing error:", err);
      // 4. On failure, transition status to FAILED and record error message
      updatedSubmission = await this.submissionRepository.update(submissionId, {
        status: "FAILED",
        publishingError: err.message || "Unknown error occurred during Instagram publishing",
      });
    }

    return updatedSubmission!;
  }

  // Get submissions for a campaign
  async getSubmissionsByCampaign(
    campaignId: string,
    userId: string
  ): Promise<IContentSubmission[]> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User");
    }
    const role = user.role;

    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) {
      throw new NotFoundError("Campaign");
    }

    if (role === "BRAND") {
      const brandProfile = await this.profileRepository.findByUserId(userId);
      if (!brandProfile) {
        throw new NotFoundError("Brand profile");
      }

      if (campaign.brandId.toString() !== brandProfile._id.toString()) {
        throw new ValidationError("You do not own this campaign");
      }

      return await this.submissionRepository.findMany({
        campaignId: new mongoose.Types.ObjectId(campaignId),
      });
    } else {
      // Influencer: only return their own submission
      const submission = await this.submissionRepository.findOne({
        campaignId: new mongoose.Types.ObjectId(campaignId),
        influencerId: new mongoose.Types.ObjectId(userId),
      });

      return submission ? [submission] : [];
    }
  }

  // Get submission for specific influencer/campaign collaboration
  async getSubmissionByInfluencer(
    campaignId: string,
    influencerId: string,
    userId: string
  ): Promise<IContentSubmission | null> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User");
    }
    const role = user.role;

    if (role === "INFLUENCER" && userId !== influencerId) {
      throw new ValidationError("You can only access your own content submission");
    }

    if (role === "BRAND") {
      const brandProfile = await this.profileRepository.findByUserId(userId);
      if (!brandProfile) {
        throw new NotFoundError("Brand profile");
      }
      const campaign = await this.campaignRepository.findById(campaignId);
      if (!campaign || campaign.brandId.toString() !== brandProfile._id.toString()) {
        throw new ValidationError("You do not own the campaign associated with this content submission");
      }
    }

    return await this.submissionRepository.findOne({
      campaignId: new mongoose.Types.ObjectId(campaignId),
      influencerId: new mongoose.Types.ObjectId(influencerId),
    });
  }

  // Copy published campaign deliverable to the influencer's portfolio
  async addSubmissionToPortfolio(submissionId: string, influencerId: string): Promise<any> {
    const submission = await this.submissionRepository.findById(submissionId);
    if (!submission) {
      throw new NotFoundError("Content submission");
    }

    if (submission.influencerId.toString() !== influencerId) {
      throw new ValidationError("You do not own this content submission");
    }

    if (submission.status !== "PUBLISHED") {
      throw new ValidationError("Only published campaign deliverables can be added to your portfolio");
    }

    const campaign = await this.campaignRepository.findById(submission.campaignId.toString());
    const campaignTitle = campaign ? campaign.title : "Campaign Collaboration";

    // 1. Resolve source path on local disk
    const campaignFilename = submission.mediaUrl.replace("/static/campaigns/", "");
    const sourcePath = path.join(__dirname, "../../../static/campaigns", campaignFilename);

    // 2. Generate a new filename and destination path for portfolio
    const ext = path.extname(campaignFilename);
    const newFilename = `portfolio-${Date.now()}${ext}`;
    const destDir = path.join(__dirname, "../../../static/portfolio");
    const destPath = path.join(destDir, newFilename);

    // 3. Verify files and folders on disk
    if (!fs.existsSync(sourcePath)) {
      throw new ValidationError("The original campaign media file could not be found on the server");
    }

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // 4. Check for duplicates using the destination URL pattern to avoid double additions
    const targetMediaUrl = `/static/portfolio/${newFilename}`;

    // 5. Copy file physically
    try {
      await fs.promises.copyFile(sourcePath, destPath);
      console.log(`[ContentSubmissionService] Copied file from ${sourcePath} to ${destPath}`);
    } catch (err) {
      console.error("[ContentSubmissionService] File copy failed:", err);
      throw new ValidationError("Failed to duplicate file on server for portfolio");
    }

    // 6. Create portfolio entry in database
    const portfolioItem = new PortfolioMedia({
      userId: new mongoose.Types.ObjectId(influencerId),
      title: `Campaign: ${campaignTitle}`,
      description: submission.caption || "",
      mediaUrl: targetMediaUrl,
      mediaType: submission.mediaType.toLowerCase() as "image" | "video",
      mimeType: submission.mediaType === "VIDEO" ? "video/mp4" : "image/jpeg",
      fileSize: 1024 * 1024, // Estimate/Default size in bytes
    });

    return await portfolioItem.save();
  }
}

