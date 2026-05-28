import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { CampaignService } from '../../services/campaign.service';
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
    private router: Router,
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
    });
  }

  ngOnInit() {
    this.setupForm();
  }

  setupForm() {
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
    });
  }

  async onSubmit() {
    if (!this.campaignForm) return;

    if (this.campaignForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      try {
        await this.campaignService.createCampaign(this.campaignForm.value);
        await this.router.navigate(['/campaigns']);
      } catch (error) {
        console.error('Failed to create campaign:', error);
      } finally {
        this.isSubmitting = false;
      }
    } else {
      this.campaignForm.markAllAsTouched();
    }
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
