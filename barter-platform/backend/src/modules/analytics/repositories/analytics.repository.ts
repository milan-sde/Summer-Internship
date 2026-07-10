import mongoose from "mongoose";
import { Campaign } from "@modules/campaign/models/campaign.model";
import { ContentSubmission } from "@modules/campaign/models/content-submission.model";
import { Profile } from "@modules/profile/models/profile.model";

export interface InfluencerAnalyticsRaw {
  // Application stats
  totalApplications: number;
  acceptedApplications: number;
  rejectedApplications: number;
  pendingApplications: number;
  acceptanceRate: number; // accepted / (accepted + rejected) * 100, 0 if denominator is 0

  // Active campaign participation
  activeCampaigns: number;

  // Deliverable stats
  totalDeliverables: number;
  deliverablesByStatus: Record<string, number>;
  publishingSuccessRate: number; // PUBLISHED / (PUBLISHED + FAILED) * 100, 0 if both are 0

  // Instagram stats (if connected)
  instagramFollowers: number;
  instagramMediaCount: number;
}

export interface BrandAnalyticsRaw {
  // Campaign stats
  totalCampaigns: number;
  activeCampaigns: number;
  pastCampaigns: number;

  // Application stats (across all campaigns)
  totalApplicationsReceived: number;
  pendingApplications: number;
  acceptedInfluencers: number;
  rejectedApplications: number;
  applicationAcceptanceRate: number; // accepted / (accepted + rejected) * 100

  // Deliverable stats
  totalDeliverables: number;
  deliverablesByStatus: Record<string, number>;

  // Performance
  avgReviewTurnaroundHours: number | null; // avg(approvedAt - submittedAt) in hours, null if no data
}

export class AnalyticsRepository {
  // ─── Influencer Analytics ────────────────────────────────────────────────────

  async getInfluencerAnalytics(
    userId: string,
  ): Promise<InfluencerAnalyticsRaw> {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // 1. Application counts via Campaign aggregation
    const applicationAgg = await Campaign.aggregate([
      {
        $match: {
          "applicants.influencerId": userObjectId,
        },
      },
      {
        $unwind: "$applicants",
      },
      {
        $match: {
          "applicants.influencerId": userObjectId,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          approved: {
            $sum: {
              $cond: [{ $eq: ["$applicants.status", "APPROVED"] }, 1, 0],
            },
          },
          rejected: {
            $sum: {
              $cond: [{ $eq: ["$applicants.status", "REJECTED"] }, 1, 0],
            },
          },
          pending: {
            $sum: { $cond: [{ $eq: ["$applicants.status", "PENDING"] }, 1, 0] },
          },
        },
      },
    ]);

    // 2. Active campaign count (approved in ACTIVE campaigns)
    const activeCampaignsAgg = await Campaign.aggregate([
      {
        $match: {
          status: "ACTIVE",
          "applicants.influencerId": userObjectId,
        },
      },
      { $unwind: "$applicants" },
      {
        $match: {
          "applicants.influencerId": userObjectId,
          "applicants.status": "APPROVED",
        },
      },
      { $count: "count" },
    ]);

    // 3. Deliverable stats via ContentSubmission aggregation
    const deliverableAgg = await ContentSubmission.aggregate([
      { $match: { influencerId: userObjectId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // 4. Instagram profile stats
    const profile = await Profile.findOne({ userId: userObjectId }).select(
      "instagram stats",
    );

    // ─── Compute derived metrics ────────────────────────────────────────────

    const appStats = applicationAgg[0] || {
      total: 0,
      approved: 0,
      rejected: 0,
      pending: 0,
    };

    const acceptanceRateDenominator = appStats.approved + appStats.rejected;
    const acceptanceRate =
      acceptanceRateDenominator > 0
        ? Math.round((appStats.approved / acceptanceRateDenominator) * 100)
        : 0;

    const activeCampaigns = activeCampaignsAgg[0]?.count || 0;

    const deliverablesByStatus: Record<string, number> = {};
    let totalDeliverables = 0;
    for (const item of deliverableAgg) {
      deliverablesByStatus[item._id] = item.count;
      totalDeliverables += item.count;
    }

    const published = deliverablesByStatus["PUBLISHED"] || 0;
    const failed = deliverablesByStatus["FAILED"] || 0;
    const publishDenominator = published + failed;
    const publishingSuccessRate =
      publishDenominator > 0
        ? Math.round((published / publishDenominator) * 100)
        : 0;

    const instagramFollowers =
      profile?.instagram?.followersCount || profile?.stats?.followers || 0;
    const instagramMediaCount = profile?.instagram?.mediaCount || 0;

    return {
      totalApplications: appStats.total,
      acceptedApplications: appStats.approved,
      rejectedApplications: appStats.rejected,
      pendingApplications: appStats.pending,
      acceptanceRate,
      activeCampaigns,
      totalDeliverables,
      deliverablesByStatus,
      publishingSuccessRate,
      instagramFollowers,
      instagramMediaCount,
    };
  }

  // ─── Brand Analytics ────────────────────────────────────────────────────────

  async getBrandAnalytics(brandProfileId: string): Promise<BrandAnalyticsRaw> {
    const brandObjectId = new mongoose.Types.ObjectId(brandProfileId);

    // 1. Campaign counts
    const campaignCountAgg = await Campaign.aggregate([
      { $match: { brandId: brandObjectId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ["$status", "ACTIVE"] }, 1, 0] } },
          past: { $sum: { $cond: [{ $eq: ["$status", "PAST"] }, 1, 0] } },
        },
      },
    ]);

    // 2. Applications received across all brand campaigns
    const applicationsAgg = await Campaign.aggregate([
      { $match: { brandId: brandObjectId } },
      { $unwind: { path: "$applicants", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ["$applicants.status", "PENDING"] }, 1, 0] },
          },
          approved: {
            $sum: {
              $cond: [{ $eq: ["$applicants.status", "APPROVED"] }, 1, 0],
            },
          },
          rejected: {
            $sum: {
              $cond: [{ $eq: ["$applicants.status", "REJECTED"] }, 1, 0],
            },
          },
        },
      },
    ]);

    // 3. Deliverable stats
    const deliverableAgg = await ContentSubmission.aggregate([
      { $match: { brandId: brandObjectId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // 4. Average review turnaround (only for APPROVED submissions with both timestamps)
    const turnaroundAgg = await ContentSubmission.aggregate([
      {
        $match: {
          brandId: brandObjectId,
          status: "APPROVED",
          submittedAt: { $exists: true, $ne: null },
          approvedAt: { $exists: true, $ne: null },
        },
      },
      {
        $project: {
          turnaroundMs: { $subtract: ["$approvedAt", "$submittedAt"] },
        },
      },
      {
        $group: {
          _id: null,
          avgMs: { $avg: "$turnaroundMs" },
        },
      },
    ]);

    // ─── Compute derived metrics ────────────────────────────────────────────

    const campaignStats = campaignCountAgg[0] || {
      total: 0,
      active: 0,
      past: 0,
    };
    const appStats = applicationsAgg[0] || {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    const acceptanceDenominator = appStats.approved + appStats.rejected;
    const applicationAcceptanceRate =
      acceptanceDenominator > 0
        ? Math.round((appStats.approved / acceptanceDenominator) * 100)
        : 0;

    const deliverablesByStatus: Record<string, number> = {};
    let totalDeliverables = 0;
    for (const item of deliverableAgg) {
      deliverablesByStatus[item._id] = item.count;
      totalDeliverables += item.count;
    }

    const avgTurnaroundMs = turnaroundAgg[0]?.avgMs;
    const avgReviewTurnaroundHours =
      avgTurnaroundMs != null
        ? Math.round((avgTurnaroundMs / (1000 * 60 * 60)) * 10) / 10 // 1 decimal place
        : null;

    return {
      totalCampaigns: campaignStats.total,
      activeCampaigns: campaignStats.active,
      pastCampaigns: campaignStats.past,
      totalApplicationsReceived: appStats.total,
      pendingApplications: appStats.pending,
      acceptedInfluencers: appStats.approved,
      rejectedApplications: appStats.rejected,
      applicationAcceptanceRate,
      totalDeliverables,
      deliverablesByStatus,
      avgReviewTurnaroundHours,
    };
  }
}
