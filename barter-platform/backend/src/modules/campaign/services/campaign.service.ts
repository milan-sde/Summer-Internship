import { CampaignRepository } from '../repositories/campaign.repository';
import { ProfileRepository } from '@modules/profile/repositories/profile.repository';
import { UserRepository } from '@modules/users/repositories/user.repository';
import { ValidationError, NotFoundError, ConflictError } from '@shared/errors/app-error';
import { CreateCampaignDto, CampaignResponseDto } from '../dto/campaign.dto';
import { ICampaign } from '../models/campaign.model';
import mongoose from 'mongoose';

export class CampaignService {
  private campaignRepository: CampaignRepository;
  private profileRepository: ProfileRepository;
  private userRepository: UserRepository;

  constructor() {
    this.campaignRepository = new CampaignRepository();
    this.profileRepository = new ProfileRepository();
    this.userRepository = new UserRepository();
  }

  async createCampaign(userId: string, data: CreateCampaignDto): Promise<CampaignResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    if (user.role !== 'BRAND') {
      throw new ValidationError('Only Brands are allowed to create campaigns');
    }

    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Brand profile details not found. Please complete profile setup first.');
    }

    const campaign = await this.campaignRepository.create({
      brandId: profile._id as mongoose.Types.ObjectId,
      brandName: profile.fullName,
      brandLogo: profile.avatarUrl || '',
      title: data.title,
      description: data.description,
      platform: data.platform,
      category: data.category,
      budget: data.budget,
      totalSlots: data.totalSlots,
      followersRequired: data.followersRequired,
      daysLeft: data.daysLeft,
      filledSlots: 0,
      applicants: [],
      status: 'ACTIVE'
    });

    return this.toResponseDto(campaign);
  }

  async getCampaigns(filters: {
    category?: string;
    platform?: string;
    search?: string;
    minBudget?: number;
    maxBudget?: number;
  }): Promise<CampaignResponseDto[]> {
    const campaigns = await this.campaignRepository.findAll(filters);
    return campaigns.map(c => this.toResponseDto(c));
  }

  async applyToCampaign(campaignId: string, userId: string): Promise<CampaignResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    if (user.role !== 'INFLUENCER') {
      throw new ValidationError('Only Influencers are allowed to apply to campaigns');
    }

    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) {
      throw new NotFoundError('Campaign');
    }

    if (campaign.status !== 'ACTIVE') {
      throw new ValidationError('This campaign is no longer active');
    }

    if (campaign.filledSlots >= campaign.totalSlots) {
      throw new ValidationError('This campaign slots are fully filled');
    }

    const alreadyApplied = campaign.applicants.some(
      app => app && app.influencerId && app.influencerId.toString() === userId
    );

    if (alreadyApplied) {
      throw new ConflictError('You have already applied to this campaign');
    }

    const updatedCampaign = await this.campaignRepository.addApplicant(campaignId, userId);
    if (!updatedCampaign) {
      throw new ConflictError('Failed to apply. You might have already applied or slots are filled.');
    }

    return this.toResponseDto(updatedCampaign);
  }

  async getMyCampaigns(userId: string): Promise<CampaignResponseDto[]> {
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Profile');
    }

    const campaigns = await this.campaignRepository.findByBrandId(profile._id.toString());
    return await this.populateCampaignApplicants(campaigns);
  }

  async getAppliedCampaigns(userId: string): Promise<CampaignResponseDto[]> {
    const campaigns = await this.campaignRepository.findAppliedByInfluencerId(userId);
    return campaigns.map(c => this.toResponseDto(c));
  }

  async populateCampaignApplicants(campaigns: ICampaign[]): Promise<CampaignResponseDto[]> {
    const responseCampaigns: CampaignResponseDto[] = [];
    
    for (const campaign of campaigns) {
      const populatedApplicants = [];
      for (const app of campaign.applicants) {
        if (!app || !app.influencerId) continue;
        const influencerIdStr = app.influencerId.toString();
        const profile = await this.profileRepository.findByUserId(influencerIdStr);
        populatedApplicants.push({
          influencerId: influencerIdStr,
          status: app.status,
          appliedAt: app.appliedAt,
          fullName: profile?.fullName || 'Anonymous Influencer',
          username: profile?.username || '',
          avatarUrl: profile?.avatarUrl || '',
          followers: profile?.stats?.followers || 0
        });
      }
      
      responseCampaigns.push({
        ...this.toResponseDto(campaign),
        applicants: populatedApplicants
      });
    }
    
    return responseCampaigns;
  }

  async updateApplicationStatus(
    campaignId: string,
    brandUserId: string,
    influencerId: string,
    status: 'APPROVED' | 'REJECTED'
  ): Promise<CampaignResponseDto> {
    const brandProfile = await this.profileRepository.findByUserId(brandUserId);
    if (!brandProfile) {
      throw new NotFoundError('Brand profile details not found. Please complete profile setup first.');
    }

    const campaign = await this.campaignRepository.findById(campaignId);
    if (!campaign) {
      throw new NotFoundError('Campaign');
    }

    // Check if brand owns this campaign
    if (campaign.brandId.toString() !== brandProfile._id.toString()) {
      throw new ValidationError('You do not own this campaign');
    }

    // Find the applicant
    const applicantIndex = campaign.applicants.findIndex(
      app => app && app.influencerId && app.influencerId.toString() === influencerId
    );

    if (applicantIndex === -1) {
      throw new NotFoundError('Application not found for this influencer');
    }

    const currentStatus = campaign.applicants[applicantIndex].status;
    if (currentStatus === status) {
      throw new ConflictError(`Application is already ${status}`);
    }

    // Update status
    campaign.applicants[applicantIndex].status = status;

    // Handle slots
    if (status === 'APPROVED') {
      if (campaign.filledSlots >= campaign.totalSlots) {
        throw new ValidationError('All campaign slots are fully filled');
      }
      campaign.filledSlots += 1;
    } else if (status === 'REJECTED' && currentStatus === 'APPROVED') {
      campaign.filledSlots = Math.max(0, campaign.filledSlots - 1);
    }

    await campaign.save();

    const populated = await this.populateCampaignApplicants([campaign]);
    return populated[0];
  }

  private toResponseDto(campaign: ICampaign): CampaignResponseDto {
    return {
      id: campaign._id.toString(),
      brandId: campaign.brandId.toString(),
      brandName: campaign.brandName,
      brandLogo: campaign.brandLogo,
      title: campaign.title,
      description: campaign.description,
      platform: campaign.platform,
      category: campaign.category,
      budget: campaign.budget,
      daysLeft: campaign.daysLeft,
      totalSlots: campaign.totalSlots,
      filledSlots: campaign.filledSlots,
      followersRequired: campaign.followersRequired,
      applicants: campaign.applicants.map(app => {
        if (app && app.influencerId) {
          return {
            influencerId: app.influencerId.toString(),
            status: app.status,
            appliedAt: app.appliedAt
          };
        }
        return {
          influencerId: app ? app.toString() : '',
          status: 'PENDING',
          appliedAt: new Date()
        };
      }),
      status: campaign.status,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt
    };
  }
}
