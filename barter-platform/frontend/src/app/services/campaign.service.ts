import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { LoadingController, ToastController } from '@ionic/angular/standalone';

export interface ICampaign {
  id: string;
  brandId: string;
  brandName: string;
  brandLogo?: string;
  title: string;
  description: string;
  platform: 'Instagram' | 'YouTube' | 'Twitter';
  category: 'Tech' | 'Fashion' | 'Food' | 'Beauty' | 'Other';
  budget: number;
  daysLeft: number;
  startDate?: string;
  endDate?: string;
  totalSlots: number;
  filledSlots: number;
  followersRequired: string;
  applicants: any[];
  status: 'ACTIVE' | 'PAST';
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class CampaignService {
  constructor(
    private apiService: ApiService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  /**
   * Create a new campaign (Brands only)
   */
  async createCampaign(campaignData: {
    title: string;
    description: string;
    platform: string;
    category: string;
    budget: number;
    totalSlots: number;
    followersRequired: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ICampaign> {
    const loading = await this.loadingController.create({
      message: 'Creating campaign...'
    });
    await loading.present();

    try {
      const response: any = await this.apiService.authPost('campaigns', campaignData);

      if (response.success) {
        await this.showToast('Campaign created successfully!', 'success');
        return response.data.campaign;
      }
      throw new Error('Failed to create campaign');
    } catch (error: any) {
      await this.showToast(error.message || 'Failed to create campaign', 'danger');
      throw error;
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Get all active campaigns with optional filters (Discovery)
   */
  async getCampaigns(filters?: {
    category?: string;
    platform?: string;
    search?: string;
    minBudget?: number;
    maxBudget?: number;
  }): Promise<ICampaign[]> {
    try {
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

      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      const response: any = await this.apiService.authGet(`campaigns${queryString}`);

      if (response.success) {
        return response.data.campaigns;
      }
      throw new Error('Failed to fetch campaigns');
    } catch (error: any) {
      console.error('Fetch campaigns error:', error);
      throw error;
    }
  }

  /**
   * Apply to a campaign (Influencers only)
   */
  async applyToCampaign(campaignId: string): Promise<ICampaign> {
    const loading = await this.loadingController.create({
      message: 'Applying for campaign...'
    });
    await loading.present();

    try {
      const response: any = await this.apiService.authPost(`campaigns/${campaignId}/apply`, {});

      if (response.success) {
        await this.showToast('Applied successfully! Application is pending brand review.', 'success');
        return response.data.campaign;
      }
      throw new Error('Application failed');
    } catch (error: any) {
      await this.showToast(error.message || 'Failed to apply to campaign', 'danger');
      throw error;
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Get brand campaigns (Brands only)
   */
  async getMyCampaigns(): Promise<ICampaign[]> {
    try {
      const response: any = await this.apiService.authGet('campaigns/my-campaigns');

      if (response.success) {
        return response.data.campaigns;
      }
      throw new Error('Failed to fetch my campaigns');
    } catch (error: any) {
      console.error('Get my campaigns error:', error);
      throw error;
    }
  }

  /**
   * Get influencer applied campaigns (Influencers only)
   */
  async getAppliedCampaigns(): Promise<ICampaign[]> {
    try {
      const response: any = await this.apiService.authGet('campaigns/applied');

      if (response.success) {
        return response.data.campaigns;
      }
      throw new Error('Failed to fetch applied campaigns');
    } catch (error: any) {
      console.error('Get applied campaigns error:', error);
      throw error;
    }
  }

  /**
   * Update the status of an applicant (Brands only)
   */
  async updateApplicantStatus(campaignId: string, influencerId: string, status: 'APPROVED' | 'REJECTED'): Promise<ICampaign> {
    const loading = await this.loadingController.create({
      message: 'Updating application...'
    });
    await loading.present();

    try {
      const response: any = await this.apiService.authPost(`campaigns/${campaignId}/applicants/${influencerId}/status`, { status });

      if (response.success) {
        await this.showToast(`Application successfully ${status.toLowerCase()}!`, 'success');
        return response.data.campaign;
      }
      throw new Error('Failed to update status');
    } catch (error: any) {
      await this.showToast(error.message || 'Failed to update application', 'danger');
      throw error;
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Show dynamic toast messages
   */
  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3500,
      position: 'bottom',
      color: color,
      buttons: ['OK']
    });
    await toast.present();
  }
}
