// src/modules/profile/routes/profile.routes.ts
import { Router } from 'express';
// import { authenticate, requireOnboarding } from '@shared/middleware/auth.middleware';
// import { validate } from '../validators/profile.validator';
import {
  CreateProfileDtoSchema,
  UpdateProfileDtoSchema,
  SearchProfilesQuerySchema
} from '../dto/profile.dto';
import {
  createProfile,
  getMyProfile,
  getProfileById,
  getPublicProfile,
  updateProfile,
  searchProfiles,
  getOnboardingStatus
} from '../controllers/profile.controller';
import { authenticate } from '@shared/middlewares/auth.middleware';
import { validate } from '@modules/auth/validators/auth.validator';

const router = Router();

/**
 * All profile routes require authentication
 */
router.use(authenticate);

/**
 * Public profile endpoints (still need auth to view)
 */
router.get('/search', validate(SearchProfilesQuerySchema), searchProfiles);
router.get('/public/:handle', getPublicProfile);
router.get('/onboarding-status', getOnboardingStatus);

/**
 * My profile endpoints
 */
router.get('/me', getMyProfile);
router.post('/', validate(CreateProfileDtoSchema), createProfile);
router.put('/', validate(UpdateProfileDtoSchema), updateProfile);

/**
 * Admin/user specific profile endpoints
 */
router.get('/:userId', getProfileById);

export default router;