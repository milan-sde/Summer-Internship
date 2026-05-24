import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { StorageService } from '../../services/storage.service';
import { Router } from '@angular/router';
import { ProfileService } from 'src/app/services/profile.service';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonNote,
  IonButton,
  IonText,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-complete-profile',
  templateUrl: './complete-profile.page.html',
  styleUrls: ['./complete-profile.page.scss'],
  standalone: true,
  imports: [
    IonText,
    CommonModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonIcon,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonNote,
    IonButton,
  ],
})
export class CompleteProfilePage implements OnInit {
  profileForm: FormGroup;
  isSubmitting = false;
  currentUser: any;

  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService,
    private storage: StorageService,
    private router: Router,
  ) {
    this.profileForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      instagramHandle: [
        '',
        [Validators.required, Validators.pattern(/^@?[a-zA-Z0-9_.]{1,30}$/)],
      ],
      bio: [
        '',
        [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(500),
        ],
      ],
      website: [null],
      location: [null],
      followers: [null],
      engagementRate: [null],
      twitter: [null],
      tiktok: [null],
    });
  }

  // Help debug: returns names of invalid controls
  getInvalidControls(): string[] {
    const invalid: string[] = [];
    const controls = this.profileForm.controls;
    for (const name in controls) {
      if (controls[name].invalid) invalid.push(name);
    }
    return invalid;
  }

  async ngOnInit() {
    this.currentUser = await this.storage.getUser();
  }

  async onSubmit() {
    if (this.profileForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;

      // Sanitize form values to match backend DTO expectations (no nulls)
      const raw = this.profileForm.value;

      const profileData: any = {
        fullName: raw.fullName,
        instagramHandle: raw.instagramHandle,
        bio: raw.bio,
      };

      if (raw.website) profileData.website = raw.website;
      if (raw.location) profileData.location = raw.location;

      if (this.currentUser?.role === 'INFLUENCER') {
        const followers =
          raw.followers !== null && raw.followers !== ''
            ? Number(raw.followers)
            : undefined;
        const engagementRate =
          raw.engagementRate !== null && raw.engagementRate !== ''
            ? Number(raw.engagementRate)
            : undefined;

        profileData.stats = {} as any;
        if (followers !== undefined && !isNaN(followers))
          profileData.stats.followers = followers;
        if (engagementRate !== undefined && !isNaN(engagementRate))
          profileData.stats.engagementRate = engagementRate;
      }

      const social: any = {};
      if (raw.twitter) social.twitter = raw.twitter;
      if (raw.tiktok) social.tiktok = raw.tiktok;
      if (Object.keys(social).length) profileData.socialLinks = social;

      try {
        const profile = await this.profileService.createProfile(profileData);

        // Update user in storage with onboarding completed
        if (this.currentUser) {
          this.currentUser.onboardingCompleted = true;
          await this.storage.setUser(this.currentUser);
        }

        await this.router.navigate(['/dashboard']);
      } catch (error) {
        console.error('Profile creation failed:', error);
      } finally {
        this.isSubmitting = false;
      }
    }
  }
}
