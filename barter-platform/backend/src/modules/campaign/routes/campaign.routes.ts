import { Router } from 'express';
import { authenticate } from '@shared/middlewares/auth.middleware';
import { validate, validateQuery } from '@modules/auth/validators/auth.validator';
import { CreateCampaignDtoSchema, GetCampaignsQuerySchema } from '../dto/campaign.dto';
import {
  createCampaign,
  getCampaigns,
  applyToCampaign,
  getMyCampaigns,
  getAppliedCampaigns,
  updateApplicationStatus
} from '../controllers/campaign.controller';

const router = Router();

// All campaign routes require authentication
router.use(authenticate);

// Discovery campaign routes
router.get('/', validateQuery(GetCampaignsQuerySchema), getCampaigns);
router.get('/applied', getAppliedCampaigns);
router.get('/my-campaigns', getMyCampaigns);

// Application route
router.post('/:id/apply', applyToCampaign);

// Brand status decision route
router.post('/:id/applicants/:influencerId/status', updateApplicationStatus);

// Campaign creation route
router.post('/', validate(CreateCampaignDtoSchema), createCampaign);

export default router;
