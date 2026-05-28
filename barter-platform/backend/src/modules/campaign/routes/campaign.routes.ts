import { Router } from 'express';
import { authenticate } from '@shared/middlewares/auth.middleware';
import { validate } from '@modules/auth/validators/auth.validator';
import { CreateCampaignDtoSchema } from '../dto/campaign.dto';
import {
  createCampaign,
  getCampaigns,
  applyToCampaign,
  getMyCampaigns,
  getAppliedCampaigns
} from '../controllers/campaign.controller';

const router = Router();

// All campaign routes require authentication
router.use(authenticate);

// Discovery campaign routes
router.get('/', getCampaigns);
router.get('/applied', getAppliedCampaigns);
router.get('/my-campaigns', getMyCampaigns);

// Application route
router.post('/:id/apply', applyToCampaign);

// Campaign creation route
router.post('/', validate(CreateCampaignDtoSchema), createCampaign);

export default router;
