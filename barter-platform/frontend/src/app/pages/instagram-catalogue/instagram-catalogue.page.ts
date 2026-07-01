import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonRow,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  checkmarkCircleOutline,
  eyeOffOutline,
  logoInstagram,
  playCircleOutline,
  syncOutline,
} from 'ionicons/icons';
import { ProfileService } from 'src/app/services/profile.service';
import {
  InstagramMediaItem,
  InstagramService,
} from 'src/app/services/instagram.service';
import { StorageService } from 'src/app/services/storage.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-instagram-catalogue',
  templateUrl: './instagram-catalogue.page.html',
  styleUrls: ['./instagram-catalogue.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardContent,
  ],
})
export class InstagramCataloguePage implements OnInit {
  currentUser: any;
  instagramMedia: InstagramMediaItem[] = [];
  profileInstagram: any = null;
  isLoading = true;

  constructor(
    private profileService: ProfileService,
    private instagramService: InstagramService,
    private storage: StorageService,
    private toastController: ToastController,
    private router: Router,
  ) {
    addIcons({
      arrowBackOutline,
      checkmarkCircleOutline,
      eyeOffOutline,
      logoInstagram,
      playCircleOutline,
      syncOutline,
    });
  }

  ngOnInit() {
    this.currentUser = this.storage.getUser();
    this.loadCatalogue();
  }

  loadCatalogue() {
    if (!this.currentUser?.id) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.profileService.getInfluencerProfile(this.currentUser.id).subscribe({
      next: (data: any) => {
        this.profileInstagram = data?.profile?.instagram || null;
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
        console.error('Failed to load Instagram catalogue:', error);
        this.showToast('Failed to load Instagram catalogue', 'danger');
        this.isLoading = false;
      },
    });
  }

  refreshFromInstagram() {
    this.instagramService.syncMedia().subscribe({
      next: () => {
        this.showToast('Instagram media synced successfully', 'success');
        this.loadCatalogue();
      },
      error: (error: any) => {
        console.error('Failed to sync Instagram media:', error);
        this.showToast(
          error.message || 'Failed to sync Instagram media',
          'danger',
        );
      },
    });
  }

  togglePortfolioSelection(item: InstagramMediaItem) {
    const nextValue = !item.selectedForPortfolio;

    this.instagramService
      .updatePortfolio(item.mediaId || item.id, nextValue)
      .subscribe({
        next: () => {
          item.selectedForPortfolio = nextValue;
          this.showToast(
            nextValue ? 'Selected for portfolio' : 'Hidden from portfolio',
            'success',
          );
        },
        error: (error: any) => {
          console.error('Failed to update portfolio selection:', error);
          this.showToast(
            error.message || 'Failed to update portfolio',
            'danger',
          );
        },
      });
  }

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

  getMediaPreview(item: InstagramMediaItem): string {
    return this.getMediaUrl(item.thumbnailUrl || item.mediaUrl);
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color,
      buttons: ['OK'],
    });
    await toast.present();
  }
}
