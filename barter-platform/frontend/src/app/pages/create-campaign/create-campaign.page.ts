import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CampaignService } from '../../services/campaign.service';
import { ProfileService } from '../../services/profile.service';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonItem,
  IonIcon,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonText,
  IonCol,
  IonRow,
  IonGrid,
  LoadingController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  checkmarkCircleOutline,
  documentTextOutline,
  cashOutline,
  peopleOutline,
  logoInstagram,
  logoYoutube,
  logoTwitter,
  optionsOutline,
  helpCircleOutline,
  calendarOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-create-campaign',
  templateUrl: './create-campaign.page.html',
  styleUrls: ['./create-campaign.page.scss'],
  standalone: true,
  imports: [
    IonGrid,
    IonRow,
    IonCol,
    CommonModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonItem,
    IonIcon,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonText,
  ],
})
export class CreateCampaignPage implements OnInit {
  campaignForm!: FormGroup;
  isSubmitting = false;

  categoriesList = ['Tech', 'Fashion', 'Food', 'Beauty', 'Other'];
  platformsList = ['Instagram', 'YouTube', 'Twitter'];

  constructor(
    private fb: FormBuilder,
    private campaignService: CampaignService,
    private profileService: ProfileService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
  ) {
    addIcons({
      arrowBackOutline,
      checkmarkCircleOutline,
      documentTextOutline,
      cashOutline,
      peopleOutline,
      logoInstagram,
      logoYoutube,
      logoTwitter,
      optionsOutline,
      helpCircleOutline,
      calendarOutline,
    });
  }

  ngOnInit() {
    this.setupForm();
    this.loadBrandProfileAndOrderCategories();
  }

  // Load the brand profile to prioritize categories relevant to their industries
  loadBrandProfileAndOrderCategories() {
    this.profileService.getMyProfile().subscribe({
      next: (profile: any) => {
        const brandIndustries = profile?.industries;
        if (brandIndustries && brandIndustries.length > 0) {
          const defaultCategories = ['Tech', 'Fashion', 'Food', 'Beauty', 'Other'];

          const selected = defaultCategories.filter(cat =>
            brandIndustries.some((ind: string) => ind.toLowerCase() === cat.toLowerCase())
          );
          const remaining = defaultCategories.filter(cat =>
            !brandIndustries.some((ind: string) => ind.toLowerCase() === cat.toLowerCase())
          );

          this.categoriesList = [...selected, ...remaining];

          if (selected.length > 0) {
            this.campaignForm.get('category')?.setValue(selected[0]);
          }
        }
      },
      error: (error: any) => {
        console.error('Failed to load brand profile for industry ordering:', error);
      }
    });
  }

  setupForm() {
    const todayStr = new Date().toISOString().substring(0, 10);
    const futureStr = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);

    this.campaignForm = this.fb.group({
      title: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
        ],
      ],
      description: [
        '',
        [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(1000),
        ],
      ],
      platform: ['Instagram', [Validators.required]],
      category: ['Tech', [Validators.required]],
      budget: [null, [Validators.required, Validators.min(0)]],
      totalSlots: [10, [Validators.required, Validators.min(1)]],
      followersRequired: ['1K+', [Validators.required]],
      startDate: [todayStr, [Validators.required]],
      endDate: [futureStr, [Validators.required]],
    }, { validators: this.dateLessThanValidator });
  }

  dateLessThanValidator(group: any): { [key: string]: boolean } | null {
    const start = group.get('startDate')?.value;
    const end = group.get('endDate')?.value;
    if (start && end && new Date(start) >= new Date(end)) {
      return { 'dateInvalid': true };
    }
    return null;
  }

  // Submit and create new campaign details via subscribe
  onSubmit() {
    if (!this.campaignForm) return;

    if (this.campaignForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;

      // Show loading spinner
      this.loadingController.create({
        message: 'Creating campaign...'
      }).then((loading) => {
        loading.present();

        this.campaignService.createCampaign(this.campaignForm.value).subscribe({
          next: (response: any) => {
            loading.dismiss();
            this.showToast('Campaign created successfully!', 'success');
            this.router.navigate(['/campaigns']);
            this.isSubmitting = false;
          },
          error: (error: any) => {
            loading.dismiss();
            console.error('Failed to create campaign:', error);
            this.showToast(error.message || 'Failed to create campaign', 'danger');
            this.isSubmitting = false;
          }
        });
      });
    } else {
      this.campaignForm.markAllAsTouched();
    }
  }

  // Display toast feedback messages
  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3500,
      position: 'bottom',
      color: color,
      buttons: ['OK']
    });
    await toast.present();
  }

  getPlatformIcon(platform: string): string {
    switch (platform) {
      case 'YouTube':
        return 'logo-youtube';
      case 'Twitter':
        return 'logo-twitter';
      default:
        return 'logo-instagram';
    }
  }
}
