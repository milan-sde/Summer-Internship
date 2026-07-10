import { Router } from 'express';
import { authenticate } from '@shared/middlewares/auth.middleware';
import { getAnalyticsOverview } from '../controllers/analytics.controller';

const router = Router();

// All analytics routes require authentication
router.use(authenticate);

// GET /api/analytics/overview
router.get('/overview', getAnalyticsOverview);

export default router;
