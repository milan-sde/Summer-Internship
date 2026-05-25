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
  IonButtons,
  IonBackButton,
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
  arrowBackOutline,
  personOutline,
  callOutline,
  mailOutline,
  documentTextOutline,
  globeOutline,
  locationOutline,
  cashOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
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
    IonButtons,
    IonBackButton,
  ],
})
export class ProfilePage implements OnInit {
  profileForm!: FormGroup;
  isSubmitting = false;
  isLoading = true;
  currentUser: any;
  profileData: any;

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
      arrowBackOutline,
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
    await this.loadProfileData();
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

  async loadProfileData() {
    this.isLoading = true;
    try {
      this.profileData = await this.profileService.getMyProfile();
      if (this.profileData) {
        this.avatarPreview = this.profileData.avatarUrl || null;

        if (this.currentUser?.role === 'INFLUENCER') {
          this.profileForm.patchValue({
            fullName: this.profileData.fullName || '',
            username: this.profileData.username || '',
            phoneNumber: this.profileData.phoneNumber || '',
            bio: this.profileData.bio || '',
            avatarUrl: this.profileData.avatarUrl || '',
            instagramUsername:
              this.profileData.platforms?.instagram?.username || '',
            instagramFollowers:
              this.profileData.platforms?.instagram?.followers || null,
            youtubeUsername:
              this.profileData.platforms?.youtube?.username || '',
            youtubeFollowers:
              this.profileData.platforms?.youtube?.followers || null,
            twitterUsername:
              this.profileData.platforms?.twitter?.username || '',
            twitterFollowers:
              this.profileData.platforms?.twitter?.followers || null,
          });

          this.pastWorkLinks =
            this.profileData.pastWorkLinks &&
            this.profileData.pastWorkLinks.length > 0
              ? [...this.profileData.pastWorkLinks]
              : [''];
        } else {
          this.profileForm.patchValue({
            firstName: this.profileData.firstName || '',
            lastName: this.profileData.lastName || '',
            phoneNumber: this.profileData.phoneNumber || '',
            bio: this.profileData.bio || '',
            avatarUrl: this.profileData.avatarUrl || '',
            budgetMin: this.profileData.budgetMin || 0,
            budgetMax: this.profileData.budgetMax || 0,
          });

          this.selectedIndustries = this.profileData.industries || [];
        }
      }
    } catch (error) {
      console.error('Failed to load user profile details:', error);
    } finally {
      this.isLoading = false;
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
        const profile = await this.profileService.updateProfile(profileData);
        await this.showToast('Profile updated successfully!', 'success');
        await this.router.navigate(['/dashboard']);
      } catch (error) {
        console.error('Profile update failed:', error);
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
}
