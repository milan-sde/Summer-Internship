import { Component, OnInit } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  FormsModule,
  Validators,
} from '@angular/forms';
import { StorageService } from '../../services/storage.service';
import { Router, ActivatedRoute } from '@angular/router';
import { ProfileService } from 'src/app/services/profile.service';
import { InstagramService } from 'src/app/services/instagram.service';
import { environment } from 'src/environments/environment';
import {
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
import { ToastController, LoadingController } from '@ionic/angular/standalone';
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

import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { HeaderComponent } from '../../shared/components/header/header.component';

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
    IonContent,
    IonIcon,
    IonItem,
    IonInput,
    IonTextarea,
    IonButton,
    IonGrid,
    IonRow,
    IonCol,
    TitleCasePipe,
    SidebarComponent,
    HeaderComponent
  ],
})
export class ProfilePage implements OnInit {
  profileForm!: FormGroup;
  isSubmitting = false;
  isLoading = true;
  currentUser: any;
  profileData: any;
  isSidebarOpen = false;

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  // Custom visual chips selections lists
  categoriesList = [
    'Fashion',
    'Beauty & Cosmetics',
    'Travel & Adventure',
    'Food & Culinary',
    'Tech & Gaming',
    'Fitness & Wellness',
    'Lifestyle & Decor',
    'Business & Finance',
  ];
  countriesList = [
    'United States',
    'United Kingdom',
    'Canada',
    'Australia',
    'India',
    'Germany',
    'France',
    'Japan',
  ];
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

  selectedCategories: string[] = [];
  selectedCountries: string[] = [];
  selectedIndustries: string[] = [];

  // Past work links dynamic fields
  pastWorkLinks: string[] = [''];

  // Avatar / Logo simulation
  avatarPreview: string | null | undefined = null;
  selectedFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService,
    private instagramService: InstagramService,
    private storage: StorageService,
    private router: Router,
    private route: ActivatedRoute,
    private toastController: ToastController,
    private loadingController: LoadingController,
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

  ngOnInit() {
    this.currentUser = this.storage.getUser();
    this.setupForm();
    this.loadProfileData();
    this.checkInstagramCallback();
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
        email: [{ value: this.currentUser?.email, disabled: true }],
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
        email: [{ value: this.currentUser?.email, disabled: true }],
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

  // Loading the authenticated user's profile details and patch the form
  loadProfileData() {
    this.isLoading = true;
    this.profileService.getMyProfile().subscribe({
      next: (profile: any) => {
        this.profileData = profile;
        if (this.profileData) {
          this.avatarPreview = this.profileData.avatarUrl;

          if (this.currentUser?.role === 'INFLUENCER') {
            this.profileForm.patchValue({
              fullName: this.profileData.fullName,
              username: this.profileData.username,
              phoneNumber: this.profileData.phoneNumber,
              bio: this.profileData.bio,
              avatarUrl: this.profileData.avatarUrl,
              instagramUsername:
                this.profileData.platforms?.instagram?.username,
              instagramFollowers:
                this.profileData.platforms?.instagram?.followers,
              youtubeUsername: this.profileData.platforms?.youtube?.username,
              youtubeFollowers: this.profileData.platforms?.youtube?.followers,
              twitterUsername: this.profileData.platforms?.twitter?.username,
              twitterFollowers: this.profileData.platforms?.twitter?.followers,
            });

            this.selectedCategories = this.profileData.categories || [];
            this.selectedCountries = this.profileData.countries || [];
            this.pastWorkLinks =
              this.profileData.pastWorkLinks &&
              this.profileData.pastWorkLinks.length > 0
                ? [...this.profileData.pastWorkLinks]
                : [''];
          } else {
            this.profileForm.patchValue({
              firstName: this.profileData.firstName,
              lastName: this.profileData.lastName,
              phoneNumber: this.profileData.phoneNumber,
              bio: this.profileData.bio,
              avatarUrl: this.profileData.avatarUrl,
              budgetMin: this.profileData.budgetMin,
              budgetMax: this.profileData.budgetMax,
            });

            this.selectedIndustries = this.profileData.industries || [];
          }
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Failed to load user profile details:', error);
        this.isLoading = false;
      },
    });
  }

  // Toggles for chips
  toggleCategory(category: string) {
    const idx = this.selectedCategories.indexOf(category);
    if (idx > -1) {
      this.selectedCategories.splice(idx, 1);
    } else {
      this.selectedCategories.push(category);
    }
  }

  toggleCountry(country: string) {
    const idx = this.selectedCountries.indexOf(country);
    if (idx > -1) {
      this.selectedCountries.splice(idx, 1);
    } else {
      this.selectedCountries.push(country);
    }
  }

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

  // Helper to construct full avatar URL for static files
  getAvatarUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('data:')
    ) {
      return url;
    }
    const backendBase = environment.apiUrl.replace('/api', '');
    return `${backendBase}${url}`;
  }

  // Image upload and preview handling
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;

      // Show loader during immediate image upload
      this.loadingController
        .create({
          message: 'Uploading image...',
        })
        .then((loading) => {
          loading.present();

          this.profileService.uploadAvatar(file).subscribe({
            next: (response: any) => {
              loading.dismiss();
              if (response && response.success && response.data) {
                const uploadedPath = response.data.avatar;
                // Update visual preview immediately
                this.avatarPreview = uploadedPath;
                // Patch form control to store relative URL path
                this.profileForm.patchValue({ avatarUrl: uploadedPath });
                this.showToast('Image uploaded successfully!', 'success');
              }
            },
            error: (error: any) => {
              loading.dismiss();
              console.error('Failed to upload avatar:', error);
              this.showToast(
                'Failed to upload image. Please try again.',
                'danger',
              );
            },
          });
        });
    }
  }

  async onSubmit() {
    if (!this.profileForm) return;

    if (this.profileForm.valid && !this.isSubmitting) {
      const raw = this.profileForm.value;
      const profileData: any = {
        bio: raw.bio,
        avatarUrl: raw.avatarUrl,
      };

      if (this.currentUser?.role === 'INFLUENCER') {
        profileData.fullName = raw.fullName;
        profileData.username = raw.username;
        profileData.phoneNumber = raw.phoneNumber;
        profileData.categories = this.selectedCategories;
        profileData.countries = this.selectedCountries;

        // Collect platforms
        const platforms: any = {};
        if (raw.instagramUsername || raw.instagramFollowers) {
          platforms.instagram = {
            username: raw.instagramUsername,
            followers:
              raw.instagramFollowers !== null && raw.instagramFollowers !== ''
                ? Number(raw.instagramFollowers)
                : 0,
          };
          profileData.instagramHandle = raw.instagramUsername;
        }
        if (raw.youtubeUsername || raw.youtubeFollowers) {
          platforms.youtube = {
            username: raw.youtubeUsername,
            followers:
              raw.youtubeFollowers !== null && raw.youtubeFollowers !== ''
                ? Number(raw.youtubeFollowers)
                : 0,
          };
        }
        if (raw.twitterUsername || raw.twitterFollowers) {
          platforms.twitter = {
            username: raw.twitterUsername,
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

        // Core validation checks
        if (this.selectedCategories.length === 0) {
          this.showValidationToast(
            'Please select at least one Category/Niche.',
          );
          return;
        }
        if (this.selectedCountries.length === 0) {
          this.showValidationToast('Please select at least one Country.');
          return;
        }

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

      // Show loader during profile update save operation
      this.loadingController
        .create({
          message: 'Updating your profile...',
        })
        .then((loading) => {
          loading.present();

          this.profileService.updateProfile(profileData).subscribe({
            next: (profile: any) => {
              loading.dismiss();
              this.showToast('Profile updated successfully!', 'success');
              this.router.navigate(['/dashboard']);
              this.isSubmitting = false;
            },
            error: (error: any) => {
              loading.dismiss();
              console.error('Profile update failed:', error);
              this.showToast(
                error.message || 'Profile update failed',
                'danger',
              );
              this.isSubmitting = false;
            },
          });
        });
    } else {
      this.profileForm.markAllAsTouched();
    }
  }

  // Check if routed back from Meta OAuth redirect and display toaster feedback
  checkInstagramCallback() {
    this.route.queryParams.subscribe((params) => {
      if (params['instagram'] === 'connected') {
        this.showToast('Instagram connected successfully!', 'success');
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { instagram: null, message: null },
          queryParamsHandling: 'merge',
        });
        this.loadProfileData();
      } else if (params['instagram'] === 'error') {
        const errorMsg = params['message'] || 'Failed to connect Instagram';
        this.showToast(errorMsg, 'danger');
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { instagram: null, message: null },
          queryParamsHandling: 'merge',
        });
      }
    });
  }

  // Redirect top-level window to backend Instagram Auth endpoint with user token
  connectInstagram() {
    this.instagramService.getAuthUrl('settings').subscribe({
      next: (response: any) => {
        const authUrl = response?.data?.authUrl || response?.authUrl;
        if (authUrl) {
          window.location.href = authUrl;
        } else {
          this.showToast('Failed to start Instagram connection', 'danger');
        }
      },
      error: (error: any) => {
        console.error('Failed to get Instagram auth URL:', error);
        this.showToast(
          error.message || 'Failed to start Instagram connection',
          'danger',
        );
      },
    });
  }

  // Disconnect the Instagram account link
  disconnectInstagram() {
    this.loadingController
      .create({
        message: 'Disconnecting Instagram...',
      })
      .then((loading) => {
        loading.present();
        this.instagramService.disconnect().subscribe({
          next: () => {
            loading.dismiss();
            this.showToast('Instagram account disconnected successfully.', 'success');
            this.loadProfileData();
          },
          error: (error: any) => {
            loading.dismiss();
            console.error('Failed to disconnect Instagram:', error);
            this.showToast('Failed to disconnect Instagram account.', 'danger');
          },
        });
      });
  }

  // Request backend manual synchronization of followers count and media feed
  syncInstagram() {
    this.loadingController
      .create({
        message: 'Syncing Instagram feed...',
      })
      .then((loading) => {
        loading.present();
        this.profileService.syncInstagram().subscribe({
          next: (response: any) => {
            loading.dismiss();
            this.showToast('Instagram data synced successfully!', 'success');
            this.loadProfileData();
          },
          error: (error: any) => {
            loading.dismiss();
            console.error('Failed to sync Instagram:', error);
            this.showToast(
              error.message || 'Failed to sync Instagram',
              'danger',
            );
          },
        });
      });
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
