import { Request, Response, NextFunction } from 'express';
import { ProfileService } from '@modules/profile/services/profile.service';
import { ForbiddenError } from '@shared/errors/app-error';
import { asyncHandler } from './async-handler';

const profileService = new ProfileService();

// Block access until user completes onboarding setup
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

// Read onboarding status without blocking access
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