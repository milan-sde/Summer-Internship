import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  FormsModule,
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
  IonIcon,
  IonItem,
  IonInput,
  IonTextarea,
  IonButton,
  IonText,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cameraOutline,
  checkmarkCircleOutline,
  addOutline,
  trashOutline,
  logoInstagram,
  logoYoutube,
  logoTwitter,
  lockClosedOutline,
  personOutline,
  callOutline,
  mailOutline,
  documentTextOutline,
  globeOutline,
  locationOutline,
  cashOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-complete-profile',
  templateUrl: './complete-profile.page.html',
  styleUrls: ['./complete-profile.page.scss'],
  standalone: true,
  imports: [
    IonText,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonIcon,
    IonItem,
    IonInput,
    IonTextarea,
    IonButton,
    IonGrid,
    IonRow,
    IonCol,
  ],
})
export class CompleteProfilePage implements OnInit {
  profileForm!: FormGroup;
  isSubmitting = false;
  currentUser: any;

  // Custom visual chips selections lists
  industriesList = [
    'Apparel & Fashion',
    'Beauty & Personal Care',
    'SaaS & Software',
    'Food & Beverage',
    'Retail & E-commerce',
    'Agency & Marketing',
    'Wellness & Health',
    'Travel & Hospitality',
  ];

  selectedIndustries: string[] = [];

  // Past work links dynamic fields
  pastWorkLinks: string[] = [''];

  // Avatar / Logo simulation
  avatarPreview: string | null = null;
  selectedFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService,
    private storage: StorageService,
    private router: Router,
    private toastController: ToastController,
  ) {
    addIcons({
      cameraOutline,
      checkmarkCircleOutline,
      addOutline,
      trashOutline,
      logoInstagram,
      logoYoutube,
      logoTwitter,
      lockClosedOutline,
      personOutline,
      callOutline,
      mailOutline,
      documentTextOutline,
      globeOutline,
      locationOutline,
      cashOutline,
    });
  }

  async ngOnInit() {
    this.currentUser = await this.storage.getUser();
    this.setupForm();
  }

  setupForm() {
    if (this.currentUser?.role === 'INFLUENCER') {
      this.profileForm = this.fb.group({
        fullName: ['', [Validators.required, Validators.minLength(2)]],
        username: [
          '',
          [Validators.required, Validators.pattern(/^[a-zA-Z0-9_.]{1,30}$/)],
        ],
        phoneNumber: ['', [Validators.required, Validators.minLength(5)]],
        email: [{ value: this.currentUser?.email || '', disabled: true }],
        bio: [
          '',
          [
            Validators.required,
            Validators.minLength(10),
            Validators.maxLength(500),
          ],
        ],
        avatarUrl: [''],

        // Platforms usernames/followers
        instagramUsername: [''],
        instagramFollowers: [null],
        youtubeUsername: [''],
        youtubeFollowers: [null],
        twitterUsername: [''],
        twitterFollowers: [null],
      });
    } else {
      // BRAND
      this.profileForm = this.fb.group({
        firstName: ['', [Validators.required]],
        lastName: ['', [Validators.required]],
        phoneNumber: ['', [Validators.required, Validators.minLength(5)]],
        email: [{ value: this.currentUser?.email || '', disabled: true }],
        bio: [
          '',
          [
            Validators.required,
            Validators.minLength(10),
            Validators.maxLength(500),
          ],
        ],
        avatarUrl: [''],
        budgetMin: [0, [Validators.required, Validators.min(0)]],
        budgetMax: [0, [Validators.required, Validators.min(0)]],
      });
    }
  }

  // Toggles for chips
  toggleIndustry(industry: string) {
    const idx = this.selectedIndustries.indexOf(industry);
    if (idx > -1) {
      this.selectedIndustries.splice(idx, 1);
    } else {
      this.selectedIndustries.push(industry);
    }
  }

  // Links management
  addLink() {
    this.pastWorkLinks.push('');
  }

  removeLink(index: number) {
    this.pastWorkLinks.splice(index, 1);
    if (this.pastWorkLinks.length === 0) {
      this.pastWorkLinks.push('');
    }
  }

  trackByIndex(index: number, obj: any): any {
    return index;
  }

  // Initials computation
  getInitials() {
    if (this.currentUser?.role === 'INFLUENCER') {
      const name = this.profileForm?.get('fullName')?.value || '';
      return name ? name.charAt(0).toUpperCase() : 'I';
    } else {
      const name = this.profileForm?.get('firstName')?.value || '';
      return name ? name.charAt(0).toUpperCase() : 'B';
    }
  }

  // Image loading preview
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.avatarPreview = reader.result as string;
        this.profileForm.patchValue({ avatarUrl: this.avatarPreview });
      };
      reader.readAsDataURL(file);
    }
  }

  // Validation display helper
  getInvalidControls(): string[] {
    const invalid: string[] = [];
    if (!this.profileForm) return [];
    const controls = this.profileForm.controls;
    for (const name in controls) {
      if (controls[name].invalid) invalid.push(name);
    }
    return invalid;
  }

  async onSubmit() {
    if (!this.profileForm) return;

    if (this.profileForm.valid && !this.isSubmitting) {
      const raw = this.profileForm.value;
      const profileData: any = {
        bio: raw.bio,
        avatarUrl: raw.avatarUrl || '',
      };

      if (this.currentUser?.role === 'INFLUENCER') {
        profileData.fullName = raw.fullName;
        profileData.username = raw.username;
        profileData.phoneNumber = raw.phoneNumber;

        // Collect platforms
        const platforms: any = {};
        if (raw.instagramUsername || raw.instagramFollowers) {
          platforms.instagram = {
            username: raw.instagramUsername || '',
            followers:
              raw.instagramFollowers !== null && raw.instagramFollowers !== ''
                ? Number(raw.instagramFollowers)
                : 0,
          };
          profileData.instagramHandle = raw.instagramUsername || '';
        }
        if (raw.youtubeUsername || raw.youtubeFollowers) {
          platforms.youtube = {
            username: raw.youtubeUsername || '',
            followers:
              raw.youtubeFollowers !== null && raw.youtubeFollowers !== ''
                ? Number(raw.youtubeFollowers)
                : 0,
          };
        }
        if (raw.twitterUsername || raw.twitterFollowers) {
          platforms.twitter = {
            username: raw.twitterUsername || '',
            followers:
              raw.twitterFollowers !== null && raw.twitterFollowers !== ''
                ? Number(raw.twitterFollowers)
                : 0,
          };
        }

        profileData.platforms = platforms;
        profileData.pastWorkLinks = this.pastWorkLinks.filter(
          (link) => link && link.trim() !== '',
        );

        const hasInstagram =
          platforms.instagram &&
          platforms.instagram.username &&
          platforms.instagram.followers !== undefined;
        const hasYoutube =
          platforms.youtube &&
          platforms.youtube.username &&
          platforms.youtube.followers !== undefined;
        const hasTwitter =
          platforms.twitter &&
          platforms.twitter.username &&
          platforms.twitter.followers !== undefined;

        if (!hasInstagram && !hasYoutube && !hasTwitter) {
          this.showValidationToast(
            'At least one social media platform must be fully filled with Username and Followers.',
          );
          return;
        }

        // Mutual fields validations
        if (
          raw.instagramUsername &&
          (raw.instagramFollowers === null || raw.instagramFollowers === '')
        ) {
          this.showValidationToast('Please fill in followers for Instagram.');
          return;
        }
        if (!raw.instagramUsername && raw.instagramFollowers) {
          this.showValidationToast('Please fill in username for Instagram.');
          return;
        }
        if (
          raw.youtubeUsername &&
          (raw.youtubeFollowers === null || raw.youtubeFollowers === '')
        ) {
          this.showValidationToast('Please fill in followers for YouTube.');
          return;
        }
        if (!raw.youtubeUsername && raw.youtubeFollowers) {
          this.showValidationToast('Please fill in username for YouTube.');
          return;
        }
        if (
          raw.twitterUsername &&
          (raw.twitterFollowers === null || raw.twitterFollowers === '')
        ) {
          this.showValidationToast('Please fill in followers for Twitter.');
          return;
        }
        if (!raw.twitterUsername && raw.twitterFollowers) {
          this.showValidationToast('Please fill in username for Twitter.');
          return;
        }
      } else {
        // Brand fields
        profileData.firstName = raw.firstName;
        profileData.lastName = raw.lastName;
        profileData.fullName = `${raw.firstName} ${raw.lastName}`;
        profileData.phoneNumber = raw.phoneNumber;
        profileData.industries = this.selectedIndustries;
        profileData.budgetMin = Number(raw.budgetMin);
        profileData.budgetMax = Number(raw.budgetMax);

        if (this.selectedIndustries.length === 0) {
          this.showValidationToast('Please select at least one Industry.');
          return;
        }
        if (profileData.budgetMin > profileData.budgetMax) {
          this.showValidationToast(
            'Minimum budget cannot exceed maximum budget.',
          );
          return;
        }
      }

      this.isSubmitting = true;

      try {
        const profile = await this.profileService.createProfile(profileData);

        // Update user in storage
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
    } else {
      this.profileForm.markAllAsTouched();
    }
  }

  async showValidationToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      color: 'danger',
      duration: 3500,
      position: 'bottom',
      buttons: ['OK'],
    });
    await toast.present();
  }
}
