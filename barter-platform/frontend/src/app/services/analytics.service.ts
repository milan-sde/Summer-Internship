import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface InfluencerAnalytics {
  totalApplications: number;
  acceptedApplications: number;
  rejectedApplications: number;
  pendingApplications: number;
  acceptanceRate: number;
  activeCampaigns: number;
  totalDeliverables: number;
  deliverablesByStatus: Record<string, number>;
  publishingSuccessRate: number;
  instagramFollowers: number;
  instagramMediaCount: number;
}

export interface BrandAnalytics {
  totalCampaigns: number;
  activeCampaigns: number;
  pastCampaigns: number;
  totalApplicationsReceived: number;
  pendingApplications: number;
  acceptedInfluencers: number;
  rejectedApplications: number;
  applicationAcceptanceRate: number;
  totalDeliverables: number;
  deliverablesByStatus: Record<string, number>;
  avgReviewTurnaroundHours: number | null;
}

export type AnalyticsData = InfluencerAnalytics | BrandAnalytics;

export interface AnalyticsOverviewResponse {
  success: boolean;
  data: {
    role: 'INFLUENCER' | 'BRAND';
    analytics: AnalyticsData;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private readonly apiUrl = environment.apiUrl.replace(/\/+$/, '') + '/analytics';

  constructor(private http: HttpClient) {}

  getOverview(): Observable<AnalyticsOverviewResponse> {
    return this.http.get<AnalyticsOverviewResponse>(
      `${this.apiUrl}/overview`,
      { withCredentials: true }
    );
  }
}
