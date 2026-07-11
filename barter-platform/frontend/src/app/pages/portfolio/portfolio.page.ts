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
  IonContent,
  IonIcon,
  IonItem,
  IonInput,
  IonTextarea,
  IonButton,
  IonModal,
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
  addOutline,
  closeOutline,
  eyeOutline,
  eyeOffOutline,
  checkmarkCircleOutline,
  openOutline,
  playCircleOutline,
  ellipsisHorizontalOutline,
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
import { getMediaUrl } from '../../shared/utils/media.utils';

import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { AiCaptionModalComponent } from '../../shared/components/ai-caption-modal/ai-caption-modal.component';
import { InstagramDetailModalComponent } from '../../shared/components/instagram-detail-modal/instagram-detail-modal.component';

@Component({
  selector: 'app-portfolio',
  templateUrl: './portfolio.page.html',
  styleUrls: ['./portfolio.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonIcon,
    IonItem,
    IonInput,
    IonTextarea,
    IonButton,
    IonModal,
    IonText,
    SidebarComponent,
    HeaderComponent,
    AiCaptionModalComponent,
    InstagramDetailModalComponent,
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

  isUploadModalOpen = false;
  isDetailModalOpen = false;
  selectedItem: any = null;
  selectedItemType: 'catalog' | 'instagram' | null = null;

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  openUploadModal() {
    this.clearSelectedFile();
    this.uploadForm.reset();
    this.isUploadModalOpen = true;
  }

  closeUploadModal() {
    this.isUploadModalOpen = false;
  }

  openDetail(item: any, type: 'catalog' | 'instagram') {
    this.selectedItem = item;
    this.selectedItemType = type;
    this.isDetailModalOpen = true;
  }

  closeDetail() {
    this.isDetailModalOpen = false;
    this.selectedItem = null;
    this.selectedItemType = null;
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
      addOutline,
      closeOutline,
      eyeOutline,
      eyeOffOutline,
      checkmarkCircleOutline,
      openOutline,
      playCircleOutline,
      ellipsisHorizontalOutline,
    });
  }

  ngOnInit() {
    this.initForm();
    this.loadShowcaseData();
  }

  // Set up form with validators using Reactive Forms
  initForm() {
    this.uploadForm = this.fb.group({
      caption: ['', [Validators.required, Validators.maxLength(500)]],
      category: ['', [Validators.required, Validators.maxLength(100)]],
    });
  }

  // Load the current influencer portfolio and synced Instagram feed in a single API call
  loadShowcaseData() {
    const currentUser = this.storage.getUser();
    if (!currentUser?.id) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.profileService.getInfluencerProfile(currentUser.id).subscribe({
      next: (data: any) => {
        // Load portfolio catalog items
        this.portfolioItems = data?.portfolioMedia || [];

        // Load synced Instagram feed items
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
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Failed to load showcase data:', error);
        this.showToast('Failed to load showcase data.', 'danger');
        this.isLoading = false;
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
          if (this.selectedItem && (this.selectedItem.mediaId === item.mediaId || this.selectedItem.id === item.id)) {
            this.selectedItem.selectedForPortfolio = nextValue;
          }
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
              this.closeUploadModal();
              this.loadShowcaseData(); // Refresh list to show new item
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
            this.closeDetail();

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

  getMediaUrl = getMediaUrl;

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

  onCaptionGenerated(caption: string) {
    this.uploadForm.patchValue({ caption });
  }
}
