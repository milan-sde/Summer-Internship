import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';

export interface CreateProfileDto {
  fullName?: string;
  instagramHandle?: string;
  bio: string;
  avatarUrl?: string;
  website?: string;
  location?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    tiktok?: string;
  };
  preferences?: {
    emailNotifications?: boolean;
    collaborationAlerts?: boolean;
  };

  // Influencer-specific fields
  username?: string;
  phoneNumber?: string;
  categories?: string[];
  countries?: string[];
  platforms?: {
    instagram?: { username?: string; followers?: number };
    youtube?: { username?: string; followers?: number };
    twitter?: { username?: string; followers?: number };
  };
  pastWorkLinks?: string[];

  // Brand-specific fields
  firstName?: string;
  lastName?: string;
  industries?: string[];
  budgetMin?: number;
  budgetMax?: number;
}

export interface UpdateProfileDto {
  fullName?: string;
  instagramHandle?: string;
  bio?: string;
  avatarUrl?: string;
  website?: string;
  location?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    tiktok?: string;
  };
  preferences?: {
    emailNotifications?: boolean;
    collaborationAlerts?: boolean;
  };

  // Influencer-specific fields
  username?: string;
  phoneNumber?: string;
  categories?: string[];
  countries?: string[];
  platforms?: {
    instagram?: { username?: string; followers?: number };
    youtube?: { username?: string; followers?: number };
    twitter?: { username?: string; followers?: number };
  };
  pastWorkLinks?: string[];

  // Brand-specific fields
  firstName?: string;
  lastName?: string;
  industries?: string[];
  budgetMin?: number;
  budgetMax?: number;
}

export interface ProfileResponse {
  id: string;
  userId: string;
  fullName: string;
  instagramHandle?: string;
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

  // New fields
  username?: string;
  phoneNumber?: string;
  categories?: string[];
  countries?: string[];
  platforms?: {
    instagram?: { username?: string; followers?: number };
    youtube?: { username?: string; followers?: number };
    twitter?: { username?: string; followers?: number };
  };
  pastWorkLinks?: string[];
  isVerified?: boolean;
  firstName?: string;
  lastName?: string;
  industries?: string[];
  budgetMin?: number;
  budgetMax?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  constructor(
    private apiService: ApiService,
    private storage: StorageService
  ) {}

  // Create a new user profile on onboarding completion via API
  createProfile(profileData: CreateProfileDto): Observable<any> {
    return this.apiService.authPost('profile', profileData);
  }

  // Get current user's profile details via API
  getMyProfile(): Observable<any> {
    return this.apiService.authGet<any>('profile/me').pipe(
      map(res => res?.data?.profile)
    );
  }

  // Update current user's profile details via API
  updateProfile(profileData: UpdateProfileDto): Observable<any> {
    return this.apiService.authPut('profile', profileData);
  }

  // Get profile details by user ID via API
  getProfileById(userId: string): Observable<any> {
    return this.apiService.authGet(`profile/${userId}`);
  }

  // Get public profile details by Instagram handle via API
  getPublicProfile(instagramHandle: string): Observable<any> {
    return this.apiService.authGet(`profile/public/${instagramHandle}`);
  }

  // Search profiles with optional filters and pagination via API
  searchProfiles(query: string, role?: string, page: number = 1, limit: number = 20): Observable<any> {
    let url = `profile/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`;
    if (role) {
      url += `&role=${role}`;
    }
    return this.apiService.authGet(url);
  }

  // Check if onboarding is completed by requesting onboarding status via API
  getOnboardingStatus(): Observable<any> {
    return this.apiService.authGet('profile/onboarding-status');
  }

  // Upload user avatar image using multipart/form-data via API
  uploadAvatar(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.apiService.authPutFormData('profile/avatar', formData);
  }
}
