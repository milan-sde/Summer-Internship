import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
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
  IonGrid,
  IonRow,
  IonCol,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardContent,
  IonText,
  AlertController,
  ToastController,
  LoadingController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  cloudUploadOutline,
  trashOutline,
  imageOutline,
  videocamOutline,
  folderOpenOutline,
} from 'ionicons/icons';
import {
  PortfolioService,
  PortfolioItem,
} from 'src/app/services/portfolio.service';
import {
  InstagramService,
  InstagramMediaItem,
} from 'src/app/services/instagram.service';
import { StorageService } from 'src/app/services/storage.service';
import { ProfileService } from 'src/app/services/profile.service';
import { environment } from 'src/environments/environment';

import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { HeaderComponent } from '../../shared/components/header/header.component';

@Component({
  selector: 'app-portfolio',
  templateUrl: './portfolio.page.html',
  styleUrls: ['./portfolio.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
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
    IonCard,
    IonCardContent,
    IonText,
    SidebarComponent,
    HeaderComponent
  ],
})
export class PortfolioPage implements OnInit {
  uploadForm!: FormGroup;
  portfolioItems: PortfolioItem[] = [];
  instagramMedia: InstagramMediaItem[] = [];
  selectedFile: File | null = null;
  filePreview: string | null = null;
  fileType: 'image' | 'video' | null = null;
  isUploading = false;
  isLoading = true;
  isSidebarOpen = false;

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  constructor(
    private fb: FormBuilder,
    private portfolioService: PortfolioService,
    private instagramService: InstagramService,
    private profileService: ProfileService,
    private storage: StorageService,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private router: Router,
  ) {
    addIcons({
      arrowBackOutline,
      cloudUploadOutline,
      trashOutline,
      imageOutline,
      videocamOutline,
      folderOpenOutline,
    });
  }

  ngOnInit() {
    this.initForm();
    this.loadPortfolio();
    this.loadInstagramMedia();
  }

  // Set up form with validators using Reactive Forms
  initForm() {
    this.uploadForm = this.fb.group({
      caption: ['', [Validators.required, Validators.maxLength(500)]],
      category: ['', [Validators.required, Validators.maxLength(100)]],
    });
  }

  // Load the current influencer portfolio from the backend using RxJS subscribe()
  loadPortfolio() {
    this.isLoading = true;
    this.portfolioService.getMyPortfolio().subscribe({
      next: (response: any) => {
        if (response && response.success && response.data) {
          this.portfolioItems = response.data.portfolio || [];
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Failed to load portfolio items:', error);
        this.showToast('Failed to load portfolio items.', 'danger');
        this.isLoading = false;
      },
    });
  }

  loadInstagramMedia() {
    const currentUser = this.storage.getUser();
    if (!currentUser?.id) {
      return;
    }

    this.profileService.getInfluencerProfile(currentUser.id).subscribe({
      next: (data: any) => {
        this.instagramMedia = (data?.instagramMedia || []).map((item: any) => ({
          id: item.id || item._id,
          mediaId: item.mediaId || item.instagramMediaId || item.id || item._id,
          caption: item.caption,
          mediaType: item.mediaType,
          mediaUrl: item.mediaUrl,
          thumbnailUrl: item.thumbnailUrl,
          permalink: item.permalink,
          selectedForPortfolio: item.selectedForPortfolio || false,
          source: item.source || 'instagram',
          timestamp: item.timestamp,
        }));
      },
      error: (error: any) => {
        console.error('Failed to load Instagram media:', error);
      },
    });
  }

  toggleInstagramSelection(item: InstagramMediaItem) {
    const nextValue = !item.selectedForPortfolio;

    this.instagramService
      .updatePortfolio(item.mediaId || item.id, nextValue)
      .subscribe({
        next: () => {
          item.selectedForPortfolio = nextValue;
          this.showToast(
            nextValue
              ? 'Instagram item selected for portfolio'
              : 'Instagram item hidden from portfolio',
            'success',
          );
        },
        error: (error: any) => {
          console.error(
            'Failed to update Instagram portfolio selection:',
            error,
          );
          this.showToast(
            error.message || 'Failed to update selection',
            'danger',
          );
        },
      });
  }

  // Preview the selected image/video file locally using FileReader API
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      if (!isImage && !isVideo) {
        this.showToast('Only image or video files are allowed', 'danger');
        return;
      }

      this.selectedFile = file;
      this.fileType = isImage ? 'image' : 'video';

      const reader = new FileReader();
      reader.onload = () => {
        this.filePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  // Reset file selector state
  clearSelectedFile() {
    this.selectedFile = null;
    this.filePreview = null;
    this.fileType = null;
  }

  // Submit file and text fields as FormData via subscribe()
  onSubmit() {
    if (this.uploadForm.invalid) {
      this.uploadForm.markAllAsTouched();
      return;
    }

    if (!this.selectedFile) {
      this.showToast(
        'Please select an image or video file to upload',
        'danger',
      );
      return;
    }

    this.isUploading = true;
    this.loadingController
      .create({
        message: 'Uploading portfolio item...',
      })
      .then((loading) => {
        loading.present();

        const raw = this.uploadForm.value;
        this.portfolioService
          .uploadPortfolioMedia(this.selectedFile!, raw.caption, raw.category)
          .subscribe({
            next: (response: any) => {
              loading.dismiss();
              this.showToast(
                'Portfolio item uploaded successfully!',
                'success',
              );
              this.uploadForm.reset();
              this.clearSelectedFile();
              this.isUploading = false;
              this.loadPortfolio(); // Refresh list to show new item
            },
            error: (error: any) => {
              loading.dismiss();
              console.error('Upload failed:', error);
              this.showToast(
                error.message || 'Failed to upload portfolio item',
                'danger',
              );
              this.isUploading = false;
            },
          });
      });
  }

  // Show a confirmation alert dialog before deleting portfolio item
  confirmDelete(item: PortfolioItem) {
    this.alertController
      .create({
        header: 'Delete Item',
        message: 'Are you sure you want to delete this portfolio item?',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
          },
          {
            text: 'Delete',
            role: 'destructive',
            handler: () => {
              this.deleteItem(item.id);
            },
          },
        ],
      })
      .then((alert) => alert.present());
  }

  // Delete portfolio item via api and update local state via subscribe()
  deleteItem(id: string) {
    this.loadingController
      .create({
        message: 'Deleting item...',
      })
      .then((loading) => {
        loading.present();

        this.portfolioService.deletePortfolioMedia(id).subscribe({
          next: (response: any) => {
            loading.dismiss();
            this.showToast('Portfolio item deleted successfully!', 'success');

            // State Update: Filter out deleted item locally to refresh UI instantly
            this.portfolioItems = this.portfolioItems.filter(
              (item) => item.id !== id,
            );
          },
          error: (error: any) => {
            loading.dismiss();
            console.error('Delete failed:', error);
            this.showToast(
              error.message || 'Failed to delete portfolio item',
              'danger',
            );
          },
        });
      });
  }

  getInstagramMediaUrl(item: InstagramMediaItem): string {
    const url = item.thumbnailUrl || item.mediaUrl;
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

  // Help construct full URL for backend static assets
  getMediaUrl(url: string): string {
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

  // Toast feedback helper
  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: color,
      buttons: ['OK'],
    });
    await toast.present();
  }
}
