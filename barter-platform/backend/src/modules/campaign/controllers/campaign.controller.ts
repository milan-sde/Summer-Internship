import { Request, Response } from 'express';
import { CampaignService } from '../services/campaign.service';
import { asyncHandler } from '@shared/middlewares/async-handler';

const campaignService = new CampaignService();

// Create a new campaign (Brands only)
export const createCampaign = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const campaign = await campaignService.createCampaign(userId, req.body);

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully!',
      data: { campaign }
    });
  }
);

// Get all active campaigns for discovery feed
export const getCampaigns = asyncHandler(
  async (req: Request, res: Response) => {
    const { category, platform, search, minBudget, maxBudget } = req.query;

    const campaigns = await campaignService.getCampaigns({
      category: category as string,
      platform: platform as string,
      search: search as string,
      minBudget: minBudget ? Number(minBudget) : undefined,
      maxBudget: maxBudget ? Number(maxBudget) : undefined
    });

    res.status(200).json({
      success: true,
      data: { campaigns }
    });
  }
);

// Apply to a campaign (Influencers only)
export const applyToCampaign = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const campaignId = req.params.id as string;
    const campaign = await campaignService.applyToCampaign(campaignId, userId);

    res.status(200).json({
      success: true,
      message: 'Successfully applied to campaign!',
      data: { campaign }
    });
  }
);

// Get campaigns created by the brand user
export const getMyCampaigns = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const campaigns = await campaignService.getMyCampaigns(userId);

    res.status(200).json({
      success: true,
      data: { campaigns }
    });
  }
);

// Get campaigns applied to by the influencer user
export const getAppliedCampaigns = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const campaigns = await campaignService.getAppliedCampaigns(userId);

    res.status(200).json({
      success: true,
      data: { campaigns }
    });
  }
);
