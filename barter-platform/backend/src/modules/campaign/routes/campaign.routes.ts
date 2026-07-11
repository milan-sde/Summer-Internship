import { Router } from 'express';
import { authenticate, requireRole } from '@shared/middlewares/auth.middleware';
import { validate, validateQuery } from '@modules/auth/validators/auth.validator';
import { CreateCampaignDtoSchema, GetCampaignsQuerySchema } from '../dto/campaign.dto';
import {
  createCampaign,
  getCampaigns,
  getCampaign,
  applyToCampaign,
  getMyCampaigns,
  getAppliedCampaigns,
  updateApplicationStatus
} from '../controllers/campaign.controller';
import { createUploader } from '@shared/middlewares/multer';
import {
  createDraft,
  updateDraft,
  submitContent,
  reviewContent,
  publishToInstagram,
  getSubmissionsByCampaign,
  getSubmissionsByInfluencer,
  getMySubmissions,
  addSubmissionToPortfolio
} from '../controllers/content-submission.controller';

const router = Router();

// Configure Multer for campaign submissions: 50MB max, allows images and videos
const submissionUploader = createUploader(
  'campaigns',
  'content',
  50 * 1024 * 1024,
  ['image', 'video']
);

// All campaign routes require authentication
router.use(authenticate);

// Discovery campaign routes
router.get('/', validateQuery(GetCampaignsQuerySchema), getCampaigns);
router.get('/applied', getAppliedCampaigns);
router.get('/my-campaigns', getMyCampaigns);
router.get('/submissions/my', requireRole('INFLUENCER'), getMySubmissions);
router.get('/:id', getCampaign);

// Application route
router.post('/:id/apply', applyToCampaign);

// Brand status decision route
router.post('/:id/applicants/:influencerId/status', updateApplicationStatus);

// Campaign creation route
router.post('/', validate(CreateCampaignDtoSchema), createCampaign);

// Campaign Content Submissions Routes
router.get('/:campaignId/submissions', getSubmissionsByCampaign);
router.get('/:campaignId/submissions/influencer/:influencerId', getSubmissionsByInfluencer);
router.post('/:campaignId/submissions', requireRole('INFLUENCER'), submissionUploader.single('file'), createDraft);
router.put('/:campaignId/submissions/:submissionId', requireRole('INFLUENCER'), submissionUploader.single('file'), updateDraft);
router.post('/:campaignId/submissions/:submissionId/submit', requireRole('INFLUENCER'), submitContent);
router.post('/:campaignId/submissions/:submissionId/review', requireRole('BRAND'), reviewContent);
router.post('/:campaignId/submissions/:submissionId/publish', requireRole('INFLUENCER'), publishToInstagram);
router.post('/:campaignId/submissions/:submissionId/to-portfolio', requireRole('INFLUENCER'), addSubmissionToPortfolio);

export default router;
