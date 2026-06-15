import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

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
  instagram?: {
    instagramId: string;
    username: string;
    followersCount: number;
    profilePicture?: string;
    connectedAt?: Date;
  };
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private readonly apiUrl = environment.apiUrl.replace(/\/+$/, '');

  constructor(private http: HttpClient) {}

  // Create a new user profile on onboarding completion via API
  createProfile(profileData: CreateProfileDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/profile`, profileData, {
      withCredentials: true,
    });
  }

  // Get current user's profile details via API
  getMyProfile(): Observable<any> {
    return this.http
      .get<any>(`${this.apiUrl}/profile/me`, { withCredentials: true })
      .pipe(map((res) => res?.data?.profile));
  }

  // Update current user's profile details via API
  updateProfile(profileData: UpdateProfileDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/profile`, profileData, {
      withCredentials: true,
    });
  }

  // Get profile details by user ID via API
  getProfileById(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/profile/${userId}`, {
      withCredentials: true,
    });
  }

  // Get unified influencer profile details (profile, instagram media, and portfolio) via API
  getInfluencerProfile(influencerId: string): Observable<any> {
    return this.http
      .get<any>(`${this.apiUrl}/influencers/${influencerId}`, {
        withCredentials: true,
      })
      .pipe(map((res) => res?.data));
  }

  // Trigger manual synchronization of connected Instagram metrics & media caching via API
  syncInstagram(): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/instagram/sync`,
      {},
      { withCredentials: true },
    );
  }

  // Get public profile details by Instagram handle via API
  getPublicProfile(instagramHandle: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/profile/public/${instagramHandle}`, {
      withCredentials: true,
    });
  }

  // Search profiles with optional filters and pagination via API
  searchProfiles(
    query: string,
    role?: string,
    page: number = 1,
    limit: number = 20,
  ): Observable<any> {
    let url = `profile/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`;
    if (role) {
      url += `&role=${role}`;
    }
    return this.http.get(`${this.apiUrl}/${url}`, { withCredentials: true });
  }

  // Check if onboarding is completed by requesting onboarding status via API
  getOnboardingStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/profile/onboarding-status`, {
      withCredentials: true,
    });
  }

  // Upload user avatar image using multipart/form-data via API
  uploadAvatar(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.http.put(`${this.apiUrl}/profile/avatar`, formData, {
      withCredentials: true,
    });
  }
}
