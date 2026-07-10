import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CampaignService } from '../../services/campaign.service';
import { StorageService } from '../../services/storage.service';
import { environment } from 'src/environments/environment';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonBadge,
  IonSpinner,
  IonModal,
  IonTextarea,
  IonRefresher,
  IonRefresherContent,
  ToastController,
  LoadingController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  logoInstagram,
  checkmarkCircleOutline,
  closeCircleOutline,
  hourglassOutline,
  alertCircleOutline,
  playCircleOutline,
  documentTextOutline,
  cloudUploadOutline,
  imageOutline,
  videocamOutline,
  openOutline,
  closeOutline,
  refreshOutline,
  copyOutline,
  arrowBackOutline,
  sparkles
} from 'ionicons/icons';

import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { HeaderComponent } from '../../shared/components/header/header.component';

@Component({
  selector: 'app-content-workspace',
  templateUrl: './content-workspace.page.html',
  styleUrls: ['./content-workspace.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonBadge,
    IonSpinner,
    IonModal,
    IonTextarea,
    IonRefresher,
    IonRefresherContent,
    SidebarComponent,
    HeaderComponent
  ]
})
export class ContentWorkspacePage implements OnInit {
  currentUser: any;
  submissions: any[] = [];
  isLoading = true;
  isSidebarOpen = false;

  // Selected deliverable details modal state
  isDetailModalOpen = false;
  activeSubmission: any = null;
  submissionCaption = '';
  submissionMediaType: 'IMAGE' | 'VIDEO' = 'IMAGE';
  submissionFile: File | null = null;
  submissionFilePreview: string | null = null;
  isSubmittingContent = false;
  isPublishingToInstagram = false;

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  constructor(
    private campaignService: CampaignService,
    private storage: StorageService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {
    addIcons({
      logoInstagram,
      checkmarkCircleOutline,
      closeCircleOutline,
      hourglassOutline,
      alertCircleOutline,
      playCircleOutline,
      documentTextOutline,
      cloudUploadOutline,
      imageOutline,
      videocamOutline,
      openOutline,
      closeOutline,
      refreshOutline,
      copyOutline,
      arrowBackOutline,
      sparkles
    });
  }

  ngOnInit() {
    this.currentUser = this.storage.getUser();
    this.loadMySubmissions();
  }

  ionViewWillEnter() {
    this.loadMySubmissions();
  }

  loadMySubmissions(callback?: () => void) {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.campaignService.getMySubmissions().subscribe({
      next: (response: any) => {
        this.submissions = response.success ? response.data.submissions : [];
        this.isLoading = false;
        this.cdr.markForCheck();
        if (callback) callback();
      },
      error: (error: any) => {
        console.error('Failed to load global deliverables:', error);
        this.showToast('Failed to load content deliverables.', 'danger');
        this.isLoading = false;
        this.cdr.markForCheck();
        if (callback) callback();
      }
    });
  }

  doRefresh(event: any) {
    this.loadMySubmissions(() => {
      event.target.complete();
    });
  }

  openSubmissionDetail(sub: any) {
    this.activeSubmission = sub;
    this.submissionCaption = sub.caption || '';
    this.submissionMediaType = sub.mediaType || 'IMAGE';
    this.submissionFilePreview = this.getAvatarUrl(sub.mediaUrl);
    this.submissionFile = null;
    this.isDetailModalOpen = true;
    this.cdr.markForCheck();
  }

  closeDetailModal() {
    this.isDetailModalOpen = false;
    this.activeSubmission = null;
    this.cdr.markForCheck();
  }

  onSubmissionFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.submissionFile = file;
      this.submissionFilePreview = URL.createObjectURL(file);
      this.cdr.markForCheck();
    }
  }

  async saveSubmissionDraft() {
    if (!this.activeSubmission) return;

    this.isSubmittingContent = true;
    this.cdr.markForCheck();

    const campaignId = this.activeSubmission.campaignId?.id || this.activeSubmission.campaignId;

    this.campaignService.updateSubmission(
      campaignId,
      this.activeSubmission.id,
      this.submissionFile || undefined,
      this.submissionMediaType,
      this.submissionCaption
    ).subscribe({
      next: (response: any) => {
        this.isSubmittingContent = false;
        if (response.success && response.data?.submission) {
          this.activeSubmission = response.data.submission;
          this.submissionFilePreview = this.getAvatarUrl(this.activeSubmission.mediaUrl);
          this.submissionFile = null;
          this.showToast('Deliverable draft saved successfully!', 'success');
          this.loadMySubmissions();
        }
        this.cdr.markForCheck();
      },
      error: (error: any) => {
        this.isSubmittingContent = false;
        console.error('Failed to save draft:', error);
        this.showToast(error?.error?.message || 'Failed to save deliverable draft', 'danger');
        this.cdr.markForCheck();
      }
    });
  }

  submitDeliverable() {
    if (!this.activeSubmission) return;

    this.isSubmittingContent = true;
    this.cdr.markForCheck();

    const campaignId = this.activeSubmission.campaignId?.id || this.activeSubmission.campaignId;

    this.campaignService.submitContent(
      campaignId,
      this.activeSubmission.id
    ).subscribe({
      next: (response: any) => {
        this.isSubmittingContent = false;
        if (response.success && response.data?.submission) {
          this.activeSubmission = response.data.submission;
          this.showToast('Deliverable submitted successfully to brand for review!', 'success');
          this.loadMySubmissions();
        }
        this.cdr.markForCheck();
      },
      error: (error: any) => {
        this.isSubmittingContent = false;
        console.error('Failed to submit content:', error);
        this.showToast(error?.error?.message || 'Failed to submit content', 'danger');
        this.cdr.markForCheck();
      }
    });
  }

  publishDeliverableToInstagram() {
    if (!this.activeSubmission) return;

    this.isPublishingToInstagram = true;
    this.cdr.markForCheck();

    const campaignId = this.activeSubmission.campaignId?.id || this.activeSubmission.campaignId;

    this.campaignService.publishToInstagram(
      campaignId,
      this.activeSubmission.id
    ).subscribe({
      next: (response: any) => {
        this.isPublishingToInstagram = false;
        if (response.success && response.data?.submission) {
          this.activeSubmission = response.data.submission;
          this.showToast('Successfully published approved deliverable directly to Instagram!', 'success');
          this.loadMySubmissions();
        }
        this.cdr.markForCheck();
      },
      error: (error: any) => {
        this.isPublishingToInstagram = false;
        console.error('Failed to publish to Instagram:', error);
        if (error?.error?.data?.submission) {
          this.activeSubmission = error.error.data.submission;
        }
        this.showToast(error?.error?.message || 'Instagram publishing failed. Please check access token.', 'danger');
        this.cdr.markForCheck();
      }
    });
  }

  addDeliverableToPortfolio() {
    if (!this.activeSubmission) return;

    const campaignId = this.activeSubmission.campaignId?.id || this.activeSubmission.campaignId;

    this.loadingController.create({
      message: 'Adding to your portfolio showcase...'
    }).then((loading) => {
      loading.present();

      this.campaignService.addSubmissionToPortfolio(
        campaignId,
        this.activeSubmission.id
      ).subscribe({
        next: (response: any) => {
          loading.dismiss();
          this.showToast('Successfully added campaign deliverable to your portfolio!', 'success');
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          loading.dismiss();
          console.error('Failed to add to portfolio:', error);
          this.showToast(error?.error?.message || 'Failed to add deliverable to portfolio', 'danger');
          this.cdr.markForCheck();
        }
      });
    });
  }

  getAvatarUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    const backendBase = environment.apiUrl.replace('/api', '');
    return `${backendBase}${url}`;
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      color: color,
      duration: 3000,
      position: 'top',
      buttons: ['OK'],
    });
    await toast.present();
  }

  navigateToCampaigns() {
    this.router.navigate(['/campaigns']);
  }
}
