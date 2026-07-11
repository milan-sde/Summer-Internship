import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CampaignService } from '../../services/campaign.service';
import { StorageService } from '../../services/storage.service';
import { AiService } from 'src/app/services/ai.service';
import { environment } from 'src/environments/environment';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonModal,
  IonTextarea,
  IonRefresher,
  IonRefresherContent,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonItem,
  IonText,
  IonGrid,
  IonRow,
  IonCol,
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
  sparkles,
  createOutline,
  timeOutline,
  syncOutline,
  checkmarkDoneOutline,
  chatbubbleOutline,
  addOutline,
  chevronUpOutline,
  chevronDownOutline
} from 'ionicons/icons';
import { Subscription, forkJoin } from 'rxjs';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

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
    ReactiveFormsModule,
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner,
    IonModal,
    IonTextarea,
    IonRefresher,
    IonRefresherContent,
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonItem,
    IonText,
    IonGrid,
    IonRow,
    IonCol,
    SidebarComponent,
    HeaderComponent
  ]
})
export class ContentWorkspacePage implements OnInit, OnDestroy {
  currentUser: any;
  isSidebarOpen = false;

  // Route state
  campaignId: string | null = null;
  private paramsSub: Subscription | null = null;
  private hasLoaded = false;

  // Overview mode state
  overviewCampaigns: any[] = [];
  overviewStats = { totalCampaigns: 0, totalDeliverables: 0, inReview: 0, changesRequested: 0, readyToPublish: 0, published: 0 };
  isLoadingOverview = true;

  // Campaign mode state
  campaign: any = null;
  submissions: any[] = [];
  submissionsLoading = true;
  submissionsError = false;
  selectedStatusFilter = 'all';
  briefExpanded = true;

  // Detail / form view state
  activeSubmission: any = null;
  isCreatingNew = false;
  submissionCaption = '';
  submissionMediaType: 'IMAGE' | 'VIDEO' = 'IMAGE';
  submissionFile: File | null = null;
  submissionFilePreview: string | null = null;
  isSubmittingContent = false;
  isPublishingToInstagram = false;

  // AI caption modal
  isAiModalOpen = false;
  isGenerating = false;
  aiForm!: FormGroup;

  get isOverview(): boolean {
    return !this.campaignId;
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  constructor(
    private campaignService: CampaignService,
    private storage: StorageService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private fb: FormBuilder,
    private aiService: AiService
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
      sparkles,
      createOutline,
      timeOutline,
      syncOutline,
      checkmarkDoneOutline,
      chatbubbleOutline,
      addOutline,
      chevronUpOutline,
      chevronDownOutline
    });
  }

  ngOnInit() {
    this.currentUser = this.storage.getUser();
    this.initForm();
  }

  ionViewWillEnter() {
    this.paramsSub?.unsubscribe();
    this.paramsSub = this.route.queryParams.subscribe(params => {
      const newId = params['campaignId'] || null;
      if (newId !== this.campaignId || !this.hasLoaded) {
        this.campaignId = newId;
        this.hasLoaded = true;
        this.loadData();
      }
    });
  }

  ionViewWillLeave() {
    this.paramsSub?.unsubscribe();
  }

  ngOnDestroy() {
    this.paramsSub?.unsubscribe();
  }

  initForm() {
    this.aiForm = this.fb.group({
      description: ['', [Validators.required]],
      tone: ['Casual', [Validators.required]],
      length: ['Medium', [Validators.required]],
      platform: ['Instagram', [Validators.required]],
      includeEmojis: [true],
      includeHashtags: [true],
    });
  }

  // ================= DATA LOADING =================

  loadData() {
    if (this.campaignId) {
      this.loadCampaignSubmissions();
    } else {
      this.loadOverviewData();
    }
  }

  refreshCurrentData() {
    if (this.campaignId) {
      this.loadCampaignSubmissions();
    } else {
      this.isLoadingOverview = true;
      this.cdr.markForCheck();
      this.loadOverviewData();
    }
  }

  // ================= OVERVIEW MODE =================

  loadOverviewData() {
    this.resetCampaignState();
    this.isLoadingOverview = true;
    this.cdr.markForCheck();

    forkJoin({
      campaigns: this.campaignService.getAppliedCampaigns(),
      submissions: this.campaignService.getMySubmissions()
    }).subscribe({
      next: (results) => {
        const appliedCampaigns = results.campaigns.success ? results.campaigns.data.campaigns : [];
        const allSubmissions = results.submissions.success ? results.submissions.data.submissions : [];

        const approvedCampaigns = appliedCampaigns.filter((c: any) => {
          const status = this.getApplicationStatus(c);
          return status === 'APPROVED';
        });

        const subsByCampaign = new Map<string, any[]>();
        for (const sub of allSubmissions) {
          const subCampaignId = sub.campaignId?.id || sub.campaignId;
          if (!subsByCampaign.has(subCampaignId)) {
            subsByCampaign.set(subCampaignId, []);
          }
          subsByCampaign.get(subCampaignId)!.push(sub);
        }

        this.overviewCampaigns = approvedCampaigns.map((c: any) => {
          const campaignSubs = subsByCampaign.get(c.id) || [];
          return {
            campaign: c,
            submissions: campaignSubs,
            stats: this.computeSubmissionStats(campaignSubs)
          };
        });

        this.overviewStats = this.computeOverviewStats(this.overviewCampaigns);
        this.isLoadingOverview = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load overview data:', error);
        this.isLoadingOverview = false;
        this.cdr.markForCheck();
      }
    });
  }

  getApplicationStatus(campaign: any): string {
    if (!this.currentUser || !campaign.applicants) return '';
    const userId = this.currentUser.id;
    const app = campaign.applicants.find(
      (a: any) => (a && a.influencerId === userId) || (a === userId)
    );
    if (app === userId) return 'PENDING';
    return app ? app.status : '';
  }

  computeSubmissionStats(subs: any[]) {
    return {
      total: subs.length,
      draft: subs.filter(s => s.status === 'DRAFT').length,
      submitted: subs.filter(s => s.status === 'SUBMITTED').length,
      changesRequested: subs.filter(s => s.status === 'CHANGES_REQUESTED').length,
      approved: subs.filter(s => s.status === 'APPROVED').length,
      published: subs.filter(s => s.status === 'PUBLISHED').length,
      failed: subs.filter(s => s.status === 'FAILED').length,
    };
  }

  computeOverviewStats(items: any[]) {
    let inReview = 0;
    let changesRequested = 0;
    let readyToPublish = 0;
    let published = 0;
    let totalDeliverables = 0;

    for (const item of items) {
      totalDeliverables += item.submissions.length;
      inReview += item.stats.submitted;
      changesRequested += item.stats.changesRequested;
      readyToPublish += item.stats.approved;
      published += item.stats.published;
    }

    return {
      totalCampaigns: items.length,
      totalDeliverables,
      inReview,
      changesRequested,
      readyToPublish,
      published
    };
  }

  navigateToCampaign(campaignId: string) {
    this.router.navigate(['/content-workspace'], { queryParams: { campaignId } });
  }

  goBackToOverview() {
    this.router.navigate(['/content-workspace']);
  }

  // ================= CAMPAIGN MODE =================

  loadCampaignSubmissions() {
    this.resetOverviewState();
    if (!this.campaignId) {
      this.submissionsLoading = false;
      this.submissionsError = false;
      this.cdr.markForCheck();
      return;
    }
    this.submissionsLoading = true;
    this.submissionsError = false;
    this.campaign = null;
    this.activeSubmission = null;
    this.isCreatingNew = false;
    this.selectedStatusFilter = 'all';
    this.cdr.markForCheck();

    this.campaignService.getSubmissions(this.campaignId).subscribe({
      next: (response: any) => {
        this.submissions = response.success ? response.data.submissions : [];
        this.submissionsLoading = false;
        if (this.submissions.length > 0) {
          this.campaign = this.submissions[0].campaignId;
        }
        this.cdr.markForCheck();
      },
      error: (error: any) => {
        console.error('Failed to load campaign submissions:', error);
        this.submissionsLoading = false;
        this.submissionsError = true;
        this.cdr.markForCheck();
      }
    });
  }

  doRefresh(event: any) {
    this.refreshCurrentData();
    event.target.complete();
  }

  // ================= SUBMISSION CRUD =================

  resetFormFields() {
    this.submissionCaption = '';
    this.submissionMediaType = 'IMAGE';
    this.submissionFile = null;
    this.submissionFilePreview = null;
  }

  resetCampaignState() {
    this.campaign = null;
    this.submissions = [];
    this.activeSubmission = null;
    this.isCreatingNew = false;
    this.submissionCaption = '';
    this.submissionMediaType = 'IMAGE';
    this.submissionFile = null;
    this.submissionFilePreview = null;
    this.isSubmittingContent = false;
    this.isPublishingToInstagram = false;
    this.submissionsLoading = true;
    this.submissionsError = false;
    this.selectedStatusFilter = 'all';
  }

  resetOverviewState() {
    this.overviewCampaigns = [];
    this.isLoadingOverview = false;
  }

  startNewSubmission() {
    this.isCreatingNew = true;
    this.activeSubmission = null;
    this.resetFormFields();
    this.cdr.markForCheck();
  }

  selectSubmission(sub: any) {
    this.activeSubmission = sub;
    this.isCreatingNew = false;
    this.submissionCaption = sub.caption || '';
    this.submissionMediaType = sub.mediaType || 'IMAGE';
    this.submissionFilePreview = this.getAvatarUrl(sub.mediaUrl);
    this.submissionFile = null;
    this.cdr.markForCheck();
  }

  backToList() {
    this.activeSubmission = null;
    this.isCreatingNew = false;
    this.resetFormFields();
    if (this.campaignId) {
      this.loadCampaignSubmissions();
    }
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
    if (!this.campaignId) return;

    if (!this.activeSubmission && !this.submissionFile) {
      this.showToast('Please upload an image or video file for your deliverable', 'danger');
      return;
    }

    this.isSubmittingContent = true;
    this.cdr.markForCheck();

    if (this.activeSubmission) {
      this.campaignService.updateSubmission(
        this.campaignId,
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
    } else {
      this.campaignService.createSubmission(
        this.campaignId,
        this.submissionFile!,
        this.submissionMediaType,
        this.submissionCaption
      ).subscribe({
        next: (response: any) => {
          this.isSubmittingContent = false;
          if (response.success && response.data?.submission) {
            this.activeSubmission = response.data.submission;
            this.submissionFilePreview = this.getAvatarUrl(this.activeSubmission.mediaUrl);
            this.submissionFile = null;
            this.isCreatingNew = false;
            this.showToast('Deliverable draft created successfully!', 'success');
            this.loadCampaignSubmissions();
          }
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          this.isSubmittingContent = false;
          console.error('Failed to create draft:', error);
          this.showToast(error?.error?.message || 'Failed to save deliverable draft', 'danger');
          this.cdr.markForCheck();
        }
      });
    }
  }

  submitDeliverable() {
    if (!this.campaignId || !this.activeSubmission) return;

    this.isSubmittingContent = true;
    this.cdr.markForCheck();

    this.campaignService.submitContent(
      this.campaignId,
      this.activeSubmission.id
    ).subscribe({
      next: (response: any) => {
        this.isSubmittingContent = false;
        if (response.success && response.data?.submission) {
          this.activeSubmission = response.data.submission;
          this.showToast('Deliverable submitted successfully to brand for review!', 'success');
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
    if (!this.campaignId || !this.activeSubmission) return;

    this.isPublishingToInstagram = true;
    this.cdr.markForCheck();

    this.campaignService.publishToInstagram(
      this.campaignId,
      this.activeSubmission.id
    ).subscribe({
      next: (response: any) => {
        this.isPublishingToInstagram = false;
        if (response.success && response.data?.submission) {
          this.activeSubmission = response.data.submission;
          this.showToast('Successfully published approved deliverable directly to Instagram!', 'success');
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
    if (!this.campaignId || !this.activeSubmission) return;

    this.loadingController.create({
      message: 'Adding to your portfolio showcase...'
    }).then((loading) => {
      loading.present();

      this.campaignService.addSubmissionToPortfolio(
        this.campaignId!,
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

  // ================= FILTERS =================

  setStatusFilter(filter: string) {
    this.selectedStatusFilter = filter;
    this.cdr.markForCheck();
  }

  toggleBrief() {
    this.briefExpanded = !this.briefExpanded;
    this.cdr.markForCheck();
  }

  getFilteredSubmissions(): any[] {
    if (this.selectedStatusFilter === 'all') return this.submissions;
    return this.submissions.filter(s => s.status === this.selectedStatusFilter);
  }

  getStatusCount(status: string): number {
    return this.submissions.filter(s => s.status === status).length;
  }

  // ================= AI CAPTION =================

  openAiModal() {
    this.aiForm.reset({
      description: '',
      tone: 'Casual',
      length: 'Medium',
      platform: 'Instagram',
      includeEmojis: true,
      includeHashtags: true,
    });
    this.isAiModalOpen = true;
    this.cdr.markForCheck();
  }

  closeAiModal() {
    this.isAiModalOpen = false;
    this.cdr.markForCheck();
  }

  generateAiCaption() {
    if (this.aiForm.invalid) {
      this.aiForm.markAllAsTouched();
      return;
    }

    this.isGenerating = true;
    this.cdr.markForCheck();

    this.aiService.generateCaption(this.aiForm.value).subscribe({
      next: (response) => {
        this.isGenerating = false;
        if (response && response.success && response.data?.caption) {
          this.submissionCaption = response.data.caption;
          this.showToast('Caption generated successfully!', 'success');
          this.closeAiModal();
        } else {
          this.showToast('Failed to generate caption. Please try again.', 'danger');
        }
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.isGenerating = false;
        console.error('Caption generation failed:', error);
        this.showToast(
          error.error?.error?.message || error.message || 'Failed to generate caption',
          'danger'
        );
        this.cdr.markForCheck();
      }
    });
  }

  // ================= UTILITIES =================

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
