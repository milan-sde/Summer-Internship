import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export enum SocialPlatform {
  Instagram = 'Instagram',
  YouTube = 'YouTube',
  Twitter = 'Twitter',
}

export interface ICampaign {
  id: string;
  brandId: string;
  brandName: string;
  brandLogo?: string;
  title: string;
  description: string;
  platform: SocialPlatform;
  category: 'Tech' | 'Fashion' | 'Food' | 'Beauty' | 'Other';
  budget: number;
  daysLeft: number;
  startDate?: string;
  endDate?: string;
  totalSlots: number;
  filledSlots: number;
  followersRequired: string;
  applicants?: any[];
  status: 'ACTIVE' | 'PAST';
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class CampaignService {
  private readonly apiUrl = environment.apiUrl.replace(/\/+$/, '');

  constructor(private http: HttpClient) {}

  // Create a new campaign (Brands only) via API
  createCampaign(campaignData: {
    title: string;
    description: string;
    platform: string;
    category: string;
    budget: number;
    totalSlots: number;
    followersRequired: string;
    startDate?: string;
    endDate?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/campaigns`, campaignData, {
      withCredentials: true,
    });
  }

  // Get active campaigns list with optional category/platform query filters via API
  getCampaigns(filters?: {
    category?: string;
    platform?: string;
    search?: string;
    minBudget?: number;
    maxBudget?: number;
  }): Observable<any> {
    let queryParams: string[] = [];
    if (filters) {
      if (filters.category && filters.category !== 'All') {
        queryParams.push(`category=${encodeURIComponent(filters.category)}`);
      }
      if (filters.platform) {
        queryParams.push(`platform=${encodeURIComponent(filters.platform)}`);
      }
      if (filters.search) {
        queryParams.push(`search=${encodeURIComponent(filters.search)}`);
      }
      if (filters.minBudget !== undefined) {
        queryParams.push(`minBudget=${filters.minBudget}`);
      }
      if (filters.maxBudget !== undefined) {
        queryParams.push(`maxBudget=${filters.maxBudget}`);
      }
    }

    const queryString =
      queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
    return this.http.get(`${this.apiUrl}/campaigns${queryString}`, {
      withCredentials: true,
    });
  }

  // Submit request to apply for a campaign (Influencers only) via API
  applyToCampaign(campaignId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/campaigns/${campaignId}/apply`,
      {},
      { withCredentials: true },
    );
  }

  // Fetch campaigns created by the currently authenticated brand user via API
  getMyCampaigns(): Observable<any> {
    return this.http.get(`${this.apiUrl}/campaigns/my-campaigns`, {
      withCredentials: true,
    });
  }

  // Fetch campaigns applied to by the currently authenticated influencer user via API
  getAppliedCampaigns(): Observable<any> {
    return this.http.get(`${this.apiUrl}/campaigns/applied`, {
      withCredentials: true,
    });
  }

  // Update status of a campaign applicant (Brands only) via API
  updateApplicantStatus(
    campaignId: string,
    influencerId: string,
    status: 'APPROVED' | 'REJECTED',
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/campaigns/${campaignId}/applicants/${influencerId}/status`,
      { status },
      { withCredentials: true },
    );
  }
}
