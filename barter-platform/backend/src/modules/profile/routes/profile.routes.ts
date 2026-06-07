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
  getOnboardingStatus,
  uploadAvatar
} from '../controllers/profile.controller';
import { authenticate } from '@shared/middlewares/auth.middleware';
import { validate, validateQuery } from '@modules/auth/validators/auth.validator';
import { createUploader } from '@shared/middlewares/multer';

const router = Router();

// All routes in this file require user login
router.use(authenticate);

// Initialize Multer uploader for avatar uploads
const avatarUploader = createUploader('avatars', 'avatar');

// Avatar upload endpoint
router.put('/avatar', avatarUploader.single('avatar'), uploadAvatar);

// Discovery and search endpoints
router.get('/search', validateQuery(SearchProfilesQuerySchema), searchProfiles);
router.get('/public/:handle', getPublicProfile);
router.get('/onboarding-status', getOnboardingStatus);

// Current user profile endpoints
router.get('/me', getMyProfile);
router.post('/', validate(CreateProfileDtoSchema), createProfile);
router.put('/', validate(UpdateProfileDtoSchema), updateProfile);

// Admin or other user profile endpoints
router.get('/:userId', getProfileById);

export default router;