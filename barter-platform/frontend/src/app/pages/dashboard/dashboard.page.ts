import { Component, OnInit } from '@angular/core';
import { CommonModule, LowerCasePipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { StorageService } from '../../services/storage.service';
import { AppStateService } from '../../services/app-state.service';
import { AnalyticsService, InfluencerAnalytics, BrandAnalytics } from '../../services/analytics.service';
import {
  IonIcon,
  IonContent,
  IonRefresher,
  IonRefresherContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonSpinner,
  LoadingController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  logOutOutline,
  checkmarkCircle,
  barChartOutline,
  eyeOutline,
  documentTextOutline,
  checkmarkDoneOutline,
  hourglassOutline,
  closeCircleOutline,
  flashOutline,
  refreshOutline,
  alertCircleOutline,
  ribbonOutline,
  statsChartOutline,
  megaphoneOutline,
  timeOutline,
  thumbsUpOutline,
  createOutline,
  cloudUploadOutline,
  checkmarkOutline,
  flagOutline,
} from 'ionicons/icons';

import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { HeaderComponent } from '../../shared/components/header/header.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    LowerCasePipe,
    IonIcon,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonSpinner,
    SidebarComponent,
    HeaderComponent
  ],
})
export class DashboardPage implements OnInit {
  user: any;
  isSidebarOpen = false;

  analyticsLoading = false;
  analyticsError = false;
  influencerAnalytics: InfluencerAnalytics | null = null;
  brandAnalytics: BrandAnalytics | null = null;

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  constructor(
    private authService: AuthService,
    private profileService: ProfileService,
    private appState: AppStateService,
    private storage: StorageService,
    private analyticsService: AnalyticsService,
    private router: Router,
    private route: ActivatedRoute,
    private loadingController: LoadingController,
    private toastController: ToastController,
  ) {
    addIcons({
      logOutOutline,
      checkmarkCircle,
      barChartOutline,
      eyeOutline,
      documentTextOutline,
      checkmarkDoneOutline,
      hourglassOutline,
      closeCircleOutline,
      flashOutline,
      refreshOutline,
      alertCircleOutline,
      ribbonOutline,
      statsChartOutline,
      megaphoneOutline,
      timeOutline,
      thumbsUpOutline,
      createOutline,
      cloudUploadOutline,
      checkmarkOutline,
      flagOutline,
    });
  }

  ngOnInit() {
    this.appState.user$.subscribe((u: any) => this.user = u);
    this.loadProfile();
    this.checkInstagramCallback();
    this.loadAnalytics();
  }

  loadAnalytics() {
    this.analyticsLoading = true;
    this.analyticsError = false;
    this.analyticsService.getOverview().subscribe({
      next: (res) => {
        if (res?.success && res?.data) {
          if (res.data.role === 'INFLUENCER') {
            this.influencerAnalytics = res.data.analytics as InfluencerAnalytics;
            this.brandAnalytics = null;
          } else {
            this.brandAnalytics = res.data.analytics as BrandAnalytics;
            this.influencerAnalytics = null;
          }
        }
        this.analyticsLoading = false;
      },
      error: () => {
        this.analyticsLoading = false;
        this.analyticsError = true;
      },
    });
  }

  getDeliverableCount(status: string): number {
    if (this.influencerAnalytics) {
      return this.influencerAnalytics.deliverablesByStatus[status] || 0;
    }
    if (this.brandAnalytics) {
      return this.brandAnalytics.deliverablesByStatus[status] || 0;
    }
    return 0;
  }

  get influencerInReviewDeliverables(): number {
    return this.getDeliverableCount('SUBMITTED') + this.getDeliverableCount('CHANGES_REQUESTED');
  }

  get influencerApprovedDeliverables(): number {
    return this.getDeliverableCount('APPROVED');
  }

  get influencerPublishedDeliverables(): number {
    return this.getDeliverableCount('PUBLISHED');
  }

  get brandPendingReviewDeliverables(): number {
    return this.getDeliverableCount('SUBMITTED');
  }

  get brandApprovedDeliverables(): number {
    return this.getDeliverableCount('APPROVED');
  }

  get brandChangesRequestedDeliverables(): number {
    return this.getDeliverableCount('CHANGES_REQUESTED');
  }

  get brandPublishedDeliverables(): number {
    return this.getDeliverableCount('PUBLISHED');
  }

  // Monitor query parameters for successful Instagram OAuth callbacks
  checkInstagramCallback() {
    this.route.queryParams.subscribe(params => {
      if (params['instagram'] === 'connected') {
        this.showToast('Instagram connected successfully!', 'success');
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { instagram: null, message: null },
          queryParamsHandling: 'merge'
        });
        this.loadProfile();
      } else if (params['instagram'] === 'error') {
        const errorMsg = params['message'] || 'Failed to connect Instagram';
        this.showToast(errorMsg, 'danger');
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { instagram: null, message: null },
          queryParamsHandling: 'merge'
        });
      }
    });
  }

  // Load authenticated user profile details from API via subscribe
  loadProfile(callback?: () => void) {
    this.profileService.getMyProfile().subscribe({
      next: (profile: any) => {
        this.user = { ...this.user, ...profile };
        this.appState.setFromProfile(profile);
        if (callback) callback();
      },
      error: (error: any) => {
        console.error('Failed to load profile:', error);
        if (callback) callback();
      }
    });
  }

  // Reload profile on pull-to-refresh
  doRefresh(event: any) {
    this.loadProfile(() => {
      this.loadAnalytics();
      event.target.complete();
    });
  }

  // Process user logout API request and clear local session storage via subscribe
  logout() {
    this.loadingController.create({
      message: 'Logging out...',
    }).then((loading) => {
      loading.present();

      this.authService.logout().subscribe({
        next: (response: any) => {
          loading.dismiss();
          this.authService.clearSession();
          this.showToast('Logged out successfully', 'success');
        },
        error: (error: any) => {
          loading.dismiss();
          console.error('Logout error:', error);
          this.authService.clearSession();
          this.showToast('Logged out successfully', 'success');
        }
      });
    });
  }

  // Display toast feedback messages
  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'top',
      color: color,
      buttons: ['OK'],
    });
    await toast.present();
  }
}
