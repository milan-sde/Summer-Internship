import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CampaignService, ICampaign } from '../../services/campaign.service';
import { StorageService } from '../../services/storage.service';
import { ProfileService } from '../../services/profile.service';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  IonSelect,
  IonSelectOption
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  logoInstagram,
  logoYoutube,
  logoTwitter,
  cashOutline,
  timeOutline,
  peopleOutline,
  funnelOutline,
  optionsOutline,
  addOutline,
  arrowBackOutline,
  personCircleOutline,
  hourglassOutline,
  laptopOutline,
  shirtOutline,
  restaurantOutline,
  sparklesOutline,
  ellipsisHorizontalOutline,
  chevronDownOutline,
  swapVerticalOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  personOutline,
  chevronUpOutline,
  playCircleOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-campaigns',
  templateUrl: './campaigns.page.html',
  styleUrls: ['./campaigns.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonRefresher,
    IonRefresherContent,
    IonSelect,
    IonSelectOption
  ]
})
export class CampaignsPage implements OnInit {
  currentUser: any;
  campaigns: ICampaign[] = [];
  isLoading = true;
  appliedCount = 0;

  // Active filters and segment
  activeSegment: 'discover' | 'applied' = 'discover';
  selectedCategory = 'All';

  // Filters selectors
  selectedPlatform: string = '';
  selectedBudgetSort: string = '';
  selectedSort: string = 'newest';

  // Toggle for applicants view (Brands only)
  showApplicants: { [key: string]: boolean } = {};

  categoriesList = ['All', 'Fashion', 'Tech', 'Food', 'Beauty'];

  constructor(
    private campaignService: CampaignService,
    private storage: StorageService,
    private profileService: ProfileService,
    private router: Router
  ) {
    addIcons({
      logoInstagram,
      logoYoutube,
      logoTwitter,
      cashOutline,
      timeOutline,
      peopleOutline,
      funnelOutline,
      optionsOutline,
      addOutline,
      arrowBackOutline,
      personCircleOutline,
      hourglassOutline,
      laptopOutline,
      shirtOutline,
      restaurantOutline,
      sparklesOutline,
      ellipsisHorizontalOutline,
      chevronDownOutline,
      swapVerticalOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      personOutline,
      chevronUpOutline,
      playCircleOutline
    });
  }

  async ngOnInit() {
    this.currentUser = await this.storage.getUser();
    await this.loadCampaigns();
  }

  async ionViewWillEnter() {
    await this.loadCampaigns();
  }

  async loadCampaigns() {
    this.isLoading = true;
    try {
      if (this.currentUser?.role === 'BRAND') {
        // Brands manage their created campaigns
        this.campaigns = await this.campaignService.getMyCampaigns();
      } else {
        // Fetch applied campaigns to keep count updated
        const appliedCampaigns = await this.campaignService.getAppliedCampaigns();
        this.appliedCount = appliedCampaigns.length;

        // Influencers discover or view applied campaigns
        if (this.activeSegment === 'discover') {
          const rawCampaigns = await this.campaignService.getCampaigns({
            category: this.selectedCategory !== 'All' ? this.selectedCategory : undefined,
            platform: this.selectedPlatform ? this.selectedPlatform : undefined
          });

          // Client-side sorting & filters
          this.campaigns = this.applyClientSideFilters(rawCampaigns);
        } else {
          // Applied
          this.campaigns = this.applyClientSideFilters(appliedCampaigns);
        }
      }
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      this.isLoading = false;
    }
  }

  applyClientSideFilters(list: ICampaign[]): ICampaign[] {
    let result = [...list];

    // Budget sorting
    if (this.selectedBudgetSort === 'asc') {
      result.sort((a, b) => a.budget - b.budget);
    } else if (this.selectedBudgetSort === 'desc') {
      result.sort((a, b) => b.budget - a.budget);
    }

    // Sort by newest or open slots
    if (this.selectedSort === 'newest') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (this.selectedSort === 'slots') {
      result.sort((a, b) => (b.totalSlots - b.filledSlots) - (a.totalSlots - a.filledSlots));
    }

    return result;
  }

  async segmentChanged(event: any) {
    this.activeSegment = event.detail.value;
    await this.loadCampaigns();
  }

  async selectCategory(category: string) {
    this.selectedCategory = category;
    await this.loadCampaigns();
  }

  async onFilterChanged() {
    await this.loadCampaigns();
  }

  async applyToCampaign(campaign: ICampaign, event: Event) {
    if (event) {
      event.stopPropagation();
    }

    try {
      const updated = await this.campaignService.applyToCampaign(campaign.id);
      // update item in local list
      const idx = this.campaigns.findIndex(c => c.id === campaign.id);
      if (idx > -1) {
        this.campaigns[idx] = updated;
      }
      await this.loadCampaigns();
    } catch (error) {
      console.error('Failed to apply:', error);
    }
  }

  hasApplied(campaign: ICampaign): boolean {
    if (!this.currentUser || !campaign.applicants) return false;
    const userId = this.currentUser.id || this.currentUser._id;
    return campaign.applicants.some(
      (app: any) => (app && app.influencerId === userId) || (app === userId)
    );
  }

  getApplicationStatus(campaign: ICampaign): string {
    if (!this.currentUser || !campaign.applicants) return '';
    const userId = this.currentUser.id || this.currentUser._id;
    const app = campaign.applicants.find(
      (a: any) => (a && a.influencerId === userId) || (a === userId)
    );
    if (app === userId) {
      return 'PENDING';
    }
    return app ? app.status : '';
  }

  toggleApplicants(campaignId: string) {
    this.showApplicants[campaignId] = !this.showApplicants[campaignId];
  }

  async updateStatus(campaignId: string, influencerId: string, status: 'APPROVED' | 'REJECTED') {
    try {
      const updated = await this.campaignService.updateApplicantStatus(campaignId, influencerId, status);
      const idx = this.campaigns.findIndex(c => c.id === campaignId);
      if (idx > -1) {
        this.campaigns[idx] = updated;
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  }

  getInitials(name: string): string {
    if (!name) return 'B';
    return name.charAt(0).toUpperCase();
  }

  getCategoryIcon(category: string): string {
    switch (category) {
      case 'Tech': return 'laptop-outline';
      case 'Fashion': return 'shirt-outline';
      case 'Food': return 'restaurant-outline';
      case 'Beauty': return 'sparkles-outline';
      default: return 'ellipsis-horizontal-outline';
    }
  }

  getProgress(campaign: ICampaign): number {
    if (!campaign.totalSlots) return 0;
    return campaign.filledSlots / campaign.totalSlots;
  }

  getCampaignTimeLabel(campaign: ICampaign): string {
    if (!campaign.startDate || !campaign.endDate) {
      return `${campaign.daysLeft}d left`;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const start = new Date(campaign.startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(campaign.endDate);
    end.setHours(0, 0, 0, 0);

    if (now < start) {
      const diffTime = start.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `Starting in ${diffDays}d`;
    } else if (now > end) {
      return 'Ended';
    } else {
      const diffTime = end.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `${diffDays}d left`;
    }
  }

  onCreateCampaign() {
    this.router.navigate(['/create-campaign']);
  }

  async doRefresh(event: any) {
    await this.loadCampaigns();
    event.target.complete();
  }

  viewProfile() {
    this.router.navigate(['/profile']);
  }
}
