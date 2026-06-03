// src/app/services/profile.service.ts
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';
import { LoadingController, ToastController } from '@ionic/angular/standalone';

export interface CreateProfileDto {
  fullName: string;
  instagramHandle: string;
  bio: string;
  website?: string;
  location?: string;
  stats?: {
    followers?: number;
    engagementRate?: number;
  };
  socialLinks?: {
    twitter?: string;
    tiktok?: string;
  };
}

export interface UpdateProfileDto {
  fullName?: string;
  instagramHandle?: string;
  bio?: string;
  website?: string;
  location?: string;
  avatarUrl?: string;
}

export interface ProfileResponse {
  id: string;
  userId: string;
  fullName: string;
  instagramHandle: string;
  bio: string;
  avatarUrl?: string;
  website?: string;
  location?: string;
  role: string;
  stats: {
    followers?: number;
    engagementRate?: number;
    totalPosts?: number;
  };
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    tiktok?: string;
  };
  preferences: {
    emailNotifications: boolean;
    collaborationAlerts: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  constructor(
    private apiService: ApiService,
    private storage: StorageService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  /**
   * Create profile (completes onboarding)
   */
  async createProfile(profileData: CreateProfileDto): Promise<ProfileResponse> {
    const loading = await this.loadingController.create({
      message: 'Creating your profile...'
    });
    await loading.present();

    try {
      const response: any = await this.apiService.authPost('profile', profileData);

      if (response.success) {
        await this.showToast('Profile created successfully! Welcome aboard!', 'success');
        return response.data.profile;
      }
      throw new Error('Profile creation failed');
    } catch (error: any) {
      await this.showToast(error.message || 'Failed to create profile', 'danger');
      throw error;
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Get my profile
   */
  async getMyProfile(): Promise<ProfileResponse> {
    try {
      const response: any = await this.apiService.authGet('profile/me');

      if (response.success) {
        return response.data.profile;
      }
      throw new Error('Failed to load profile');
    } catch (error: any) {
      console.error('Get profile error:', error);
      throw error;
    }
  }

  /**
   * Update profile
   */
  async updateProfile(profileData: UpdateProfileDto): Promise<ProfileResponse> {
    const loading = await this.loadingController.create({
      message: 'Updating your profile...'
    });
    await loading.present();

    try {
      const response: any = await this.apiService.authPut('profile', profileData);

      if (response.success) {
        await this.showToast('Profile updated successfully!', 'success');
        return response.data.profile;
      }
      throw new Error('Profile update failed');
    } catch (error: any) {
      await this.showToast(error.message || 'Failed to update profile', 'danger');
      throw error;
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Get profile by user ID (for viewing other profiles)
   */
  async getProfileById(userId: string): Promise<ProfileResponse> {
    try {
      const response: any = await this.apiService.authGet(`profile/${userId}`);

      if (response.success) {
        return response.data.profile;
      }
      throw new Error('Failed to load profile');
    } catch (error: any) {
      console.error('Get profile by ID error:', error);
      throw error;
    }
  }

  /**
   * Get public profile by Instagram handle
   */
  async getPublicProfile(instagramHandle: string): Promise<any> {
    try {
      const response: any = await this.apiService.authGet(`profile/public/${instagramHandle}`);

      if (response.success) {
        return response.data.profile;
      }
      throw new Error('Failed to load public profile');
    } catch (error: any) {
      console.error('Get public profile error:', error);
      throw error;
    }
  }

  /**
   * Search profiles
   */
  async searchProfiles(query: string, role?: string, page: number = 1, limit: number = 20): Promise<{
    profiles: ProfileResponse[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      let url = `profile/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`;
      if (role) {
        url += `&role=${role}`;
      }

      const response: any = await this.apiService.authGet(url);

      if (response.success) {
        return {
          profiles: response.data,
          pagination: response.pagination
        };
      }
      throw new Error('Failed to search profiles');
    } catch (error: any) {
      console.error('Search profiles error:', error);
      throw error;
    }
  }

  /**
   * Check if user has completed onboarding
   */
  async getOnboardingStatus(): Promise<boolean> {
    try {
      const response: any = await this.apiService.authGet('profile/onboarding-status');

      if (response.success) {
        return response.data.onboardingCompleted;
      }
      return false;
    } catch (error) {
      console.error('Get onboarding status error:', error);
      return false;
    }
  }

  /**
   * Upload profile picture
   */
  async uploadAvatar(file: File): Promise<string> {
    const loading = await this.loadingController.create({
      message: 'Uploading image...'
    });
    await loading.present();

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      // Note: You'll need to add a custom endpoint for file uploads
      // Or modify the update profile endpoint to handle multipart/form-data

      const response: any = await this.apiService.authPost('profile/upload-avatar', formData);

      if (response.success) {
        await this.showToast('Avatar uploaded successfully!', 'success');
        return response.data.avatarUrl;
      }
      throw new Error('Avatar upload failed');
    } catch (error: any) {
      await this.showToast(error.message || 'Failed to upload avatar', 'danger');
      throw error;
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Show toast message
   */
  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: color,
      buttons: ['OK']
    });
    await toast.present();
  }
}
