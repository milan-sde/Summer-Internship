import { Request, Response, NextFunction } from 'express';
import { ProfileService } from '@modules/profile/services/profile.service';
import { ForbiddenError } from '@shared/errors/app-error';
import { asyncHandler } from './async-handler';

const profileService = new ProfileService();

/**
 * Onboarding Guard Middleware
 * Prevents access to dashboard until user completes profile
 * 
 * Usage: app.get('/dashboard', authenticate, requireOnboarding, dashboardHandler)
 */
export const requireOnboarding = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.userId;
  
  if (!userId) {
    throw new ForbiddenError('Authentication required');
  }
  
  const isOnboardingComplete = await profileService.isOnboardingComplete(userId);
  
  if (!isOnboardingComplete) {
    throw new ForbiddenError(
      'Please complete your profile before accessing the dashboard'
    );
  }
  
  next();
});

/**
 * Optional Onboarding Check
 * Attaches onboarding status to request but doesn't block
 */
export const optionalOnboarding = asyncHandler(async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.userId;
  
  if (userId) {
    const isOnboardingComplete = await profileService.isOnboardingComplete(userId);
    (req as any).onboardingComplete = isOnboardingComplete;
  }
  
  next();
});