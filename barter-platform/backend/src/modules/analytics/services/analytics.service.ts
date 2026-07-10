import { AnalyticsRepository, InfluencerAnalyticsRaw, BrandAnalyticsRaw } from '../repositories/analytics.repository';
import { ProfileRepository } from '@modules/profile/repositories/profile.repository';
import { NotFoundError } from '@shared/errors/app-error';

export type { InfluencerAnalyticsRaw, BrandAnalyticsRaw };

export class AnalyticsService {
  private analyticsRepository: AnalyticsRepository;
  private profileRepository: ProfileRepository;

  constructor() {
    this.analyticsRepository = new AnalyticsRepository();
    this.profileRepository = new ProfileRepository();
  }

  /**
   * Get analytics for the calling influencer user.
   * Uses User._id directly since ContentSubmission.influencerId = User._id.
   */
  async getInfluencerAnalytics(userId: string): Promise<InfluencerAnalyticsRaw> {
    return await this.analyticsRepository.getInfluencerAnalytics(userId);
  }

  /**
   * Get analytics for the calling brand user.
   * Campaign.brandId and ContentSubmission.brandId = Profile._id,
   * so we must first look up the brand's Profile to get their Profile._id.
   */
  async getBrandAnalytics(userId: string): Promise<BrandAnalyticsRaw> {
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Brand profile');
    }

    return await this.analyticsRepository.getBrandAnalytics(profile._id.toString());
  }
}
