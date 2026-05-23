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

  /**
   * Create user profile and complete onboarding
   * This is the final step of registration
   */
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

    // Check if Instagram handle is taken
    const handleTaken = await this.profileRepository.findByInstagramHandle(
      data.instagramHandle
    );
    if (handleTaken) {
      throw new ConflictError('Instagram handle is already in use');
    }

    // Create profile
    const profile = await this.profileRepository.create({
      userId: new mongoose.Types.ObjectId(userId),
      fullName: data.fullName,
      instagramHandle: data.instagramHandle,
      bio: data.bio,
      role: user.role,
      avatarUrl: data.avatarUrl,
      website: data.website,
      location: data.location
    });

    // Mark onboarding as complete
    await this.userRepository.completeOnboarding(userId);

    // Log analytics event (for monitoring)
    console.log(`✅ Onboarding completed for user ${userId} (${user.role})`);

    return this.toResponseDto(profile);
  }

  /**
   * Get profile by user ID
   */
  async getProfile(userId: string): Promise<ProfileResponseDto> {
    const profile = await this.profileRepository.findByUserId(userId);
    
    if (!profile) {
      throw new NotFoundError('Profile');
    }
    
    return this.toResponseDto(profile);
  }

  /**
   * Get public profile by Instagram handle (for discovery)
   */
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

  /**
   * Update profile
   */
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

    // Update profile
    const updatedProfile = await this.profileRepository.updateByUserId(userId, data);
    
    return this.toResponseDto(updatedProfile);
  }

  /**
   * Search profiles (for brand discovery)
   */
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

  /**
   * Check if user has completed onboarding
   */
  async isOnboardingComplete(userId: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    return user?.onBoardingCompleted || false;
  }

  /**
   * Delete profile (when user account is deleted)
   */
  async deleteProfile(userId: string): Promise<void> {
    await this.profileRepository.deleteByUserId(userId);
  }

  /**
   * Convert profile model to response DTO
   */
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
      updatedAt: profile.updatedAt
    };
  }
}