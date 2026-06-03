import { Campaign, ICampaign } from '../models/campaign.model';
import mongoose from 'mongoose';

export class CampaignRepository {
  async create(data: Partial<ICampaign>): Promise<ICampaign> {
    const campaign = new Campaign(data);
    return await campaign.save();
  }

  async findById(id: string): Promise<ICampaign | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await Campaign.findById(id);
  }

  async findByBrandId(brandId: string): Promise<ICampaign[]> {
    if (!mongoose.Types.ObjectId.isValid(brandId)) return [];
    return await Campaign.find({ brandId: new mongoose.Types.ObjectId(brandId) }).sort({ createdAt: -1 });
  }

  async findAppliedByInfluencerId(influencerId: string): Promise<ICampaign[]> {
    if (!mongoose.Types.ObjectId.isValid(influencerId)) return [];
    return await Campaign.find({
      'applicants.influencerId': new mongoose.Types.ObjectId(influencerId)
    }).sort({ createdAt: -1 });
  }

  async findAll(filters: {
    category?: string;
    platform?: string;
    search?: string;
    minBudget?: number;
    maxBudget?: number;
    status?: string;
  }): Promise<ICampaign[]> {
    const query: any = {};

    if (filters.status) {
      query.status = filters.status;
    } else {
      query.status = 'ACTIVE';
    }

    if (filters.category && filters.category !== 'All') {
      query.category = filters.category;
    }

    if (filters.platform) {
      query.platform = filters.platform;
    }

    if (filters.minBudget !== undefined || filters.maxBudget !== undefined) {
      query.budget = {};
      if (filters.minBudget !== undefined) {
        query.budget.$gte = filters.minBudget;
      }
      if (filters.maxBudget !== undefined) {
        query.budget.$lte = filters.maxBudget;
      }
    }

    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    return await Campaign.find(query).sort({ createdAt: -1 });
  }

  async addApplicant(campaignId: string, influencerId: string): Promise<ICampaign | null> {
    if (!mongoose.Types.ObjectId.isValid(campaignId) || !mongoose.Types.ObjectId.isValid(influencerId)) {
      return null;
    }

    return await Campaign.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(campaignId),
        'applicants.influencerId': { $ne: new mongoose.Types.ObjectId(influencerId) } // Avoid duplicate applications
      },
      {
        $push: {
          applicants: {
            influencerId: new mongoose.Types.ObjectId(influencerId),
            status: 'PENDING',
            appliedAt: new Date()
          }
        }
      },
      { returnDocument: 'after' }
    );
  }
}
