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
      id => id.toString() === userId
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
    return campaigns.map(c => this.toResponseDto(c));
  }

  async getAppliedCampaigns(userId: string): Promise<CampaignResponseDto[]> {
    const campaigns = await this.campaignRepository.findAppliedByInfluencerId(userId);
    return campaigns.map(c => this.toResponseDto(c));
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
      applicants: campaign.applicants.map(id => id.toString()),
      status: campaign.status,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt
    };
  }
}
