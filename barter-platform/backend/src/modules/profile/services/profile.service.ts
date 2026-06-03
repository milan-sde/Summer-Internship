import { ProfileRepository } from '../repositories/profile.repository';
import { UserRepository } from '@modules/users/repositories/user.repository';
import { ValidationError, NotFoundError, ConflictError } from '@shared/errors/app-error';
import type { CreateProfileDto, UpdateProfileDto, ProfileResponseDto } from '../dto/profile.dto';
import mongoose from 'mongoose';

export class ProfileService {
  private profileRepository: ProfileRepository;
  private userRepository: UserRepository;

  constructor() {
    this.profileRepository = new ProfileRepository();
    this.userRepository = new UserRepository();
  }

  // Create profile and complete user onboarding registration
  async createProfile(
    userId: string,
    data: CreateProfileDto
  ): Promise<ProfileResponseDto> {
    // Check if user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Check if profile already exists
    const existingProfile = await this.profileRepository.findByUserId(userId);
    if (existingProfile) {
      throw new ConflictError('Profile already exists');
    }

    // Role-specific validations
    if (user.role === 'INFLUENCER') {
      if (!data.username) {
        throw new ValidationError('Username is required for influencers');
      }
      if (!data.phoneNumber) {
        throw new ValidationError('Phone number is required for influencers');
      }
      if (!data.categories || data.categories.length === 0) {
        throw new ValidationError('At least one category is required');
      }
      if (!data.countries || data.countries.length === 0) {
        throw new ValidationError('At least one country is required');
      }

      if (!data.fullName) {
        throw new ValidationError('Full name is required');
      }

      // Check if username is taken
      const usernameTaken = await this.profileRepository.findByUsername(data.username);
      if (usernameTaken) {
        throw new ConflictError('Username is already in use');
      }

      // Platforms validation
      const platforms = data.platforms;
      if (!platforms) {
        throw new ValidationError('Platforms details are required');
      }
      const { instagram, youtube, twitter } = platforms;
      const hasInstagram = instagram && instagram.username && instagram.followers !== undefined;
      const hasYoutube = youtube && youtube.username && youtube.followers !== undefined;
      const hasTwitter = twitter && twitter.username && twitter.followers !== undefined;

      if (!hasInstagram && !hasYoutube && !hasTwitter) {
        throw new ValidationError('At least one social media platform must be fully filled with both username and followers');
      }

      // If one field is present in any platform, the other must also be present
      if (instagram && ((instagram.username && instagram.followers === undefined) || (!instagram.username && instagram.followers !== undefined))) {
        throw new ValidationError('Instagram username and followers must both be filled if one is provided');
      }
      if (youtube && ((youtube.username && youtube.followers === undefined) || (!youtube.username && youtube.followers !== undefined))) {
        throw new ValidationError('YouTube username and followers must both be filled if one is provided');
      }
      if (twitter && ((twitter.username && twitter.followers === undefined) || (!twitter.username && twitter.followers !== undefined))) {
        throw new ValidationError('Twitter username and followers must both be filled if one is provided');
      }

      // Also check instagramHandle uniqueness if provided
      if (data.instagramHandle) {
        const handleTaken = await this.profileRepository.findByInstagramHandle(data.instagramHandle);
        if (handleTaken) {
          throw new ConflictError('Instagram handle is already in use');
        }
      }
    } else if (user.role === 'BRAND') {
      if (!data.firstName || !data.lastName) {
        throw new ValidationError('First name and last name are required for brands');
      }
      if (!data.phoneNumber) {
        throw new ValidationError('Contact number is required for brands');
      }
      if (!data.industries || data.industries.length === 0) {
        throw new ValidationError('At least one industry is required');
      }
      if (data.budgetMin === undefined || data.budgetMax === undefined) {
        throw new ValidationError('Budget range (min and max) is required');
      }
      if (data.budgetMin > data.budgetMax) {
        throw new ValidationError('Minimum budget cannot exceed maximum budget');
      }

      // Automatically construct fullName for brands
      data.fullName = `${data.firstName} ${data.lastName}`;
    }

    // Calculate stats.followers as max of platform followers
    let initialFollowers = 0;
    if (data.platforms) {
      initialFollowers = Math.max(
        data.platforms.instagram?.followers || 0,
        data.platforms.youtube?.followers || 0,
        data.platforms.twitter?.followers || 0
      );
    }

    // Create profile
    const profile = await this.profileRepository.create({
      userId: new mongoose.Types.ObjectId(userId),
      fullName: data.fullName!,
      instagramHandle: data.instagramHandle,
      bio: data.bio,
      role: user.role,
      avatarUrl: data.avatarUrl,
      website: data.website,
      location: data.location,
      stats: {
        followers: initialFollowers,
        engagementRate: 0,
        totalPosts: 0
      },

      // Influencer fields
      username: data.username,
      phoneNumber: data.phoneNumber,
      categories: data.categories,
      countries: data.countries,
      platforms: data.platforms,
      pastWorkLinks: data.pastWorkLinks,

      // Brand fields
      firstName: data.firstName,
      lastName: data.lastName,
      industries: data.industries,
      budgetMin: data.budgetMin,
      budgetMax: data.budgetMax
    });

    // Mark onboarding as complete
    await this.userRepository.completeOnboarding(userId);

    // Log analytics event (for monitoring)
    console.log(`✅ Onboarding completed for user ${userId} (${user.role})`);

    return this.toResponseDto(profile);
  }

  // Find profile details by user ID
  async getProfile(userId: string): Promise<ProfileResponseDto> {
    const profile = await this.profileRepository.findByUserId(userId);
    
    if (!profile) {
      throw new NotFoundError('Profile');
    }
    
    return this.toResponseDto(profile);
  }

  // Retrieve limited public info by Instagram handle
  async getPublicProfile(instagramHandle: string): Promise<any> {
    const profile = await this.profileRepository.findByInstagramHandle(instagramHandle);
    
    if (!profile) {
      throw new NotFoundError('Profile');
    }
    
    // Return limited data for public view
    return {
      fullName: profile.fullName,
      instagramHandle: profile.instagramHandle,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      stats: profile.stats,
      role: profile.role
    };
  }

  // Update profile details and recalculate brand names if needed
  async updateProfile(
    userId: string,
    data: UpdateProfileDto
  ): Promise<ProfileResponseDto> {
    // Check if profile exists
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Profile');
    }

    // If updating Instagram handle, check uniqueness
    if (data.instagramHandle && data.instagramHandle !== profile.instagramHandle) {
      const handleTaken = await this.profileRepository.findByInstagramHandle(
        data.instagramHandle
      );
      if (handleTaken && handleTaken.userId.toString() !== userId) {
        throw new ConflictError('Instagram handle is already in use');
      }
    }

    // If updating Fluencr username, check uniqueness
    if (data.username && data.username !== profile.username) {
      const usernameTaken = await this.profileRepository.findByUsername(data.username);
      if (usernameTaken && usernameTaken.userId.toString() !== userId) {
        throw new ConflictError('Username is already in use');
      }
    }

    // Copy payload to a new mutable object of type any to prevent DTO schema type constraints
    const updateData: any = { ...data };

    // Dynamic brand logic for full name construction on update
    if (profile.role === 'BRAND') {
      const firstName = data.firstName !== undefined ? data.firstName : profile.firstName;
      const lastName = data.lastName !== undefined ? data.lastName : profile.lastName;
      if (firstName || lastName) {
        updateData.fullName = `${firstName || ''} ${lastName || ''}`.trim();
      }
    }

    if (profile.role === 'INFLUENCER' && data.platforms) {
      const instagramFollowers = data.platforms.instagram?.followers !== undefined 
        ? data.platforms.instagram.followers 
        : profile.platforms?.instagram?.followers || 0;
      const youtubeFollowers = data.platforms.youtube?.followers !== undefined 
        ? data.platforms.youtube.followers 
        : profile.platforms?.youtube?.followers || 0;
      const twitterFollowers = data.platforms.twitter?.followers !== undefined 
        ? data.platforms.twitter.followers 
        : profile.platforms?.twitter?.followers || 0;
        
      const maxFollowers = Math.max(instagramFollowers, youtubeFollowers, twitterFollowers);
      
      updateData.stats = {
        ...profile.stats,
        followers: maxFollowers
      };
    }

    // Update profile
    const updatedProfile = await this.profileRepository.updateByUserId(userId, updateData);
    
    return this.toResponseDto(updatedProfile);
  }

  // Search matching profiles with paginated results
  async searchProfiles(
    query: string,
    role?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    profiles: ProfileResponseDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const skip = (page - 1) * limit;
    
    const { profiles, total } = await this.profileRepository.searchProfiles(
      query,
      role,
      limit,
      skip
    );
    
    return {
      profiles: profiles.map(p => this.toResponseDto(p)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Check onboarding completion status
  async isOnboardingComplete(userId: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    return user?.onBoardingCompleted || false;
  }

  // Delete profile by user ID
  async deleteProfile(userId: string): Promise<void> {
    await this.profileRepository.deleteByUserId(userId);
  }

  // Map Mongoose model fields to response DTO format
  private toResponseDto(profile: any): ProfileResponseDto {
    return {
      id: profile.id || profile._id,
      userId: profile.userId.toString(),
      fullName: profile.fullName,
      instagramHandle: profile.instagramHandle,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      website: profile.website,
      location: profile.location,
      role: profile.role,
      stats: profile.stats,
      socialLinks: profile.socialLinks,
      preferences: profile.preferences,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,

      // Influencer-specific fields
      username: profile.username,
      phoneNumber: profile.phoneNumber,
      categories: profile.categories,
      countries: profile.countries,
      platforms: profile.platforms,
      pastWorkLinks: profile.pastWorkLinks,
      isVerified: profile.isVerified,

      // Brand-specific fields
      firstName: profile.firstName,
      lastName: profile.lastName,
      industries: profile.industries,
      budgetMin: profile.budgetMin,
      budgetMax: profile.budgetMax
    };
  }
}