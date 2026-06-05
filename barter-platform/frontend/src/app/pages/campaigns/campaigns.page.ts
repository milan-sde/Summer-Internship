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

  ngOnInit() {
    this.currentUser = this.storage.getUser();
    this.loadCampaigns();
  }

  ionViewWillEnter() {
    this.loadCampaigns();
  }

  // Load campaigns list depending on user role and active discover/applied segment via subscribe
  loadCampaigns(callback?: () => void) {
    this.isLoading = true;
    if (this.currentUser?.role === 'BRAND') {
      this.campaignService.getMyCampaigns().subscribe({
        next: (response: any) => {
          this.campaigns = response.success ? response.data.campaigns : [];
          this.isLoading = false;
          if (callback) callback();
        },
        error: (error: any) => {
          console.error('Failed to load campaigns:', error);
          this.isLoading = false;
          if (callback) callback();
        }
      });
    } else {
      // Influencers flow: fetch applied count first, then discover or show applied campaigns
      this.campaignService.getAppliedCampaigns().subscribe({
        next: (appliedRes: any) => {
          const appliedCampaigns = appliedRes.success ? appliedRes.data.campaigns : [];
          this.appliedCount = appliedCampaigns.length;

          if (this.activeSegment === 'discover') {
            this.campaignService.getCampaigns({
              category: this.selectedCategory !== 'All' ? this.selectedCategory : undefined,
              platform: this.selectedPlatform ? this.selectedPlatform : undefined
            }).subscribe({
              next: (discoverRes: any) => {
                const rawCampaigns = discoverRes.success ? discoverRes.data.campaigns : [];
                this.campaigns = this.applyClientSideFilters(rawCampaigns);
                this.isLoading = false;
                if (callback) callback();
              },
              error: (error: any) => {
                console.error('Failed to load discover campaigns:', error);
                this.isLoading = false;
                if (callback) callback();
              }
            });
          } else {
            this.campaigns = this.applyClientSideFilters(appliedCampaigns);
            this.isLoading = false;
            if (callback) callback();
          }
        },
        error: (error: any) => {
          console.error('Failed to load applied campaigns count:', error);
          this.isLoading = false;
          if (callback) callback();
        }
      });
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

  segmentChanged(event: any) {
    this.activeSegment = event.detail.value;
    this.loadCampaigns();
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
    this.loadCampaigns();
  }

  onFilterChanged() {
    this.loadCampaigns();
  }

  // Submit request to apply for campaign via subscribe
  applyToCampaign(campaign: ICampaign, event: Event) {
    if (event) {
      event.stopPropagation();
    }

    this.campaignService.applyToCampaign(campaign.id).subscribe({
      next: (response: any) => {
        const updated = response.success ? response.data.campaign : null;
        if (updated) {
          const idx = this.campaigns.findIndex(c => c.id === campaign.id);
          if (idx > -1) {
            this.campaigns[idx] = updated;
          }
        }
        this.loadCampaigns();
      },
      error: (error: any) => {
        console.error('Failed to apply:', error);
      }
    });
  }

  hasApplied(campaign: ICampaign): boolean {
    if (!this.currentUser || !campaign.applicants) return false;
    const userId = this.currentUser.id;
    return campaign.applicants.some(
      (app: any) => (app && app.influencerId === userId) || (app === userId)
    );
  }

  getApplicationStatus(campaign: ICampaign): string {
    if (!this.currentUser || !campaign.applicants) return '';
    const userId = this.currentUser.id;
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

  // Update applicant status (APPROVED/REJECTED) via subscribe
  updateStatus(campaignId: string, influencerId: string, status: 'APPROVED' | 'REJECTED') {
    this.campaignService.updateApplicantStatus(campaignId, influencerId, status).subscribe({
      next: (response: any) => {
        const updated = response.success ? response.data.campaign : null;
        if (updated) {
          const idx = this.campaigns.findIndex(c => c.id === campaignId);
          if (idx > -1) {
            this.campaigns[idx] = updated;
          }
        }
      },
      error: (error: any) => {
        console.error('Failed to update status:', error);
      }
    });
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

  doRefresh(event: any) {
    this.loadCampaigns(() => {
      event.target.complete();
    });
  }

  viewProfile() {
    this.router.navigate(['/profile']);
  }
}
