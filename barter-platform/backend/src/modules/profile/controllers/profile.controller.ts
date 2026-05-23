// src/modules/profile/controllers/profile.controller.ts
import { Request, Response } from "express";
import { ProfileService } from "../services/profile.service";
import { asyncHandler } from "@shared/middlewares/async-handler";
// import { asyncHandler } from '@shared/middleware/async-handler';

const profileService = new ProfileService();

/**
 * Create profile (complete onboarding)
 * POST /api/profile
 */
export const createProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const profile = await profileService.createProfile(userId, req.body);

    res.status(201).json({
      success: true,
      message: "Profile created successfully! Welcome to the platform.",
      data: { profile },
    });
  },
);

/**
 * Get my profile
 * GET /api/profile/me
 */
export const getMyProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const profile = await profileService.getProfile(userId);

    res.status(200).json({
      success: true,
      data: { profile },
    });
  },
);

/**
 * Get profile by ID (for admin or viewing other profiles)
 * GET /api/profile/:userId
 */
export const getProfileById = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = Array.isArray(req.params.userId)
      ? req.params.userId[0]
      : req.params.userId;
    const profile = await profileService.getProfile(userId);

    res.status(200).json({
      success: true,
      data: { profile },
    });
  },
);

/**
 * Get public profile by Instagram handle
 * GET /api/profile/public/:handle
 */
export const getPublicProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const handle = Array.isArray(req.params.handle)
      ? req.params.handle[0]
      : req.params.handle;
    const profile = await profileService.getPublicProfile(handle);

    res.status(200).json({
      success: true,
      data: { profile },
    });
  },
);

/**
 * Update my profile
 * PUT /api/profile
 */
export const updateProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const profile = await profileService.updateProfile(userId, req.body);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: { profile },
    });
  },
);

/**
 * Search profiles
 * GET /api/profile/search?q=keyword&role=INFLUENCER&page=1&limit=20
 */
export const searchProfiles = asyncHandler(
  async (req: Request, res: Response) => {
    const { q, role, page, limit } = req.query;

    const result = await profileService.searchProfiles(
      q as string,
      role as string,
      Number(page),
      Number(limit),
    );

    res.status(200).json({
      success: true,
      data: result.profiles,
      pagination: result.pagination,
    });
  },
);

/**
 * Check onboarding status
 * GET /api/profile/onboarding-status
 */
export const getOnboardingStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const isComplete = await profileService.isOnboardingComplete(userId);

    res.status(200).json({
      success: true,
      data: {
        onboardingCompleted: isComplete,
      },
    });
  },
);
