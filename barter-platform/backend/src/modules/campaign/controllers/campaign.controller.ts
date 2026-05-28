import { Request, Response } from 'express';
import { CampaignService } from '../services/campaign.service';
import { asyncHandler } from '@shared/middlewares/async-handler';

const campaignService = new CampaignService();

/**
 * Create campaign
 * POST /api/campaigns
 */
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

/**
 * Get all active campaigns (discovery feed)
 * GET /api/campaigns
 */
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

/**
 * Apply to campaign
 * POST /api/campaigns/:id/apply
 */
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

/**
 * Get my campaigns (for Brands)
 * GET /api/campaigns/my-campaigns
 */
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

/**
 * Get applied campaigns (for Influencers)
 * GET /api/campaigns/applied
 */
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
