import { Request, Response } from 'express';
import { asyncHandler } from '@shared/middlewares/async-handler';
import { AnalyticsService } from '../services/analytics.service';
import { JwtService } from '@modules/auth/services/jwt.service';

const analyticsService = new AnalyticsService();
const jwtService = new JwtService();

/**
 * GET /api/analytics/overview
 * Returns role-specific analytics for the authenticated user.
 * Reads role from JWT payload to avoid an extra DB call.
 */
export const getAnalyticsOverview = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    // Decode role from JWT — avoids an extra User DB lookup
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : '';
    const payload = token ? jwtService.verifyAccessToken(token) : null;
    const role = payload?.role;

    if (role === 'BRAND') {
      const analytics = await analyticsService.getBrandAnalytics(userId);
      return res.status(200).json({
        success: true,
        data: { role: 'BRAND', analytics },
      });
    }

    // Default: INFLUENCER analytics
    const analytics = await analyticsService.getInfluencerAnalytics(userId);
    return res.status(200).json({
      success: true,
      data: { role: 'INFLUENCER', analytics },
    });
  },
);
