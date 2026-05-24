// src/app/pages/complete-profile/complete-profile.page.ts
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
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-complete-profile',
  templateUrl: './complete-profile.page.html',
  styleUrls: ['./complete-profile.page.scss'],
  standalone: true,
  imports: [
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
      website: [''],
      location: [''],
      followers: [''],
      engagementRate: [''],
      twitter: [''],
      tiktok: [''],
    });
  }

  async ngOnInit() {
    this.currentUser = await this.storage.getUser();
  }

  async onSubmit() {
    if (this.profileForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;

      const profileData = {
        fullName: this.profileForm.value.fullName,
        instagramHandle: this.profileForm.value.instagramHandle,
        bio: this.profileForm.value.bio,
        website: this.profileForm.value.website,
        location: this.profileForm.value.location,
        stats:
          this.currentUser?.role === 'INFLUENCER'
            ? {
                followers: this.profileForm.value.followers,
                engagementRate: this.profileForm.value.engagementRate,
              }
            : undefined,
        socialLinks: {
          twitter: this.profileForm.value.twitter,
          tiktok: this.profileForm.value.tiktok,
        },
      };

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
