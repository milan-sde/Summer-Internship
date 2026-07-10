import { Request, Response } from "express";
import { ContentSubmissionService } from "../services/content-submission.service";
import { asyncHandler } from "@shared/middlewares/async-handler";
import { ValidationError } from "@shared/errors/app-error";
import {
  CreateContentSubmissionSchema,
  UpdateContentSubmissionSchema,
  ReviewContentSubmissionSchema,
} from "../dto/content-submission.dto";

const contentSubmissionService = new ContentSubmissionService();

// Create a new content submission as DRAFT (Influencers only)
export const createDraft = asyncHandler(async (req: Request, res: Response) => {
  const influencerId = req.user!.userId;
  const campaignId = req.params.campaignId as string;

  if (!req.file) {
    throw new ValidationError("Campaign content media file is required");
  }

  const validatedData = CreateContentSubmissionSchema.parse(req.body);
  const mediaUrl = `/static/campaigns/${req.file.filename}`;

  const submission = await contentSubmissionService.createDraft(
    influencerId,
    campaignId,
    mediaUrl,
    validatedData.mediaType,
    validatedData.caption
  );

  res.status(201).json({
    success: true,
    message: "Content draft saved successfully!",
    data: { submission },
  });
});

// Update draft or resubmit content (Influencers only)
export const updateDraft = asyncHandler(async (req: Request, res: Response) => {
  const influencerId = req.user!.userId;
  const submissionId = req.params.submissionId as string;

  const validatedData = UpdateContentSubmissionSchema.parse(req.body);

  const updates: any = {
    caption: validatedData.caption,
    mediaType: validatedData.mediaType,
  };

  if (req.file) {
    updates.mediaUrl = `/static/campaigns/${req.file.filename}`;
  }

  const submission = await contentSubmissionService.updateDraft(
    submissionId,
    influencerId,
    updates
  );

  res.status(200).json({
    success: true,
    message: "Content draft updated successfully!",
    data: { submission },
  });
});

// Transition content status to SUBMITTED (Influencers only)
export const submitContent = asyncHandler(async (req: Request, res: Response) => {
  const influencerId = req.user!.userId;
  const submissionId = req.params.submissionId as string;

  const submission = await contentSubmissionService.submitContent(
    submissionId,
    influencerId
  );

  res.status(200).json({
    success: true,
    message: "Content submitted successfully for review!",
    data: { submission },
  });
});

// Approve or request changes (Brands only)
export const reviewContent = asyncHandler(async (req: Request, res: Response) => {
  const brandUserId = req.user!.userId;
  const submissionId = req.params.submissionId as string;

  const validatedData = ReviewContentSubmissionSchema.parse(req.body);

  const submission = await contentSubmissionService.reviewContent(
    submissionId,
    brandUserId,
    validatedData.status,
    validatedData.feedback
  );

  const actionMsg =
    validatedData.status === "APPROVED"
      ? "Content approved successfully!"
      : "Changes requested on content successfully.";

  res.status(200).json({
    success: true,
    message: actionMsg,
    data: { submission },
  });
});

// Publish approved content to Instagram (Influencers only)
export const publishToInstagram = asyncHandler(async (req: Request, res: Response) => {
  const influencerId = req.user!.userId;
  const submissionId = req.params.submissionId as string;

  const submission = await contentSubmissionService.publishToInstagram(
    submissionId,
    influencerId
  );

  if (submission.status === "FAILED") {
    res.status(400).json({
      success: false,
      message: submission.publishingError || "Failed to publish content to Instagram.",
      data: { submission },
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Successfully published approved content to Instagram!",
    data: { submission },
  });
});

// Get submissions list for a campaign (Influencer gets own, Brand gets all)
export const getSubmissionsByCampaign = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const campaignId = req.params.campaignId as string;

  const submissions = await contentSubmissionService.getSubmissionsByCampaign(
    campaignId,
    userId
  );

  res.status(200).json({
    success: true,
    data: { submissions },
  });
});

// Get submissions list for a specific influencer collaboration
export const getSubmissionsByInfluencer = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const campaignId = req.params.campaignId as string;
  const influencerId = req.params.influencerId as string;

  const submissions = await contentSubmissionService.getSubmissionsByInfluencer(
    campaignId,
    influencerId,
    userId
  );

  res.status(200).json({
    success: true,
    data: { submissions },
  });
});

// Get all submissions belonging to the authenticated influencer (Global Workspace)
export const getMySubmissions = asyncHandler(async (req: Request, res: Response) => {
  const influencerId = req.user!.userId;

  const submissions = await contentSubmissionService.getMySubmissions(influencerId);

  res.status(200).json({
    success: true,
    data: { submissions },
  });
});

// Copy published campaign deliverable to the influencer's portfolio (Influencers only)
export const addSubmissionToPortfolio = asyncHandler(async (req: Request, res: Response) => {
  const influencerId = req.user!.userId;
  const submissionId = req.params.submissionId as string;

  const portfolioItem = await contentSubmissionService.addSubmissionToPortfolio(
    submissionId,
    influencerId
  );

  res.status(200).json({
    success: true,
    message: "Successfully added campaign deliverable to your portfolio!",
    data: { portfolioItem },
  });
});
