import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
  IonButton,
  IonGrid,
  IonRow,
  IonCol,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardContent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  logoInstagram,
  peopleOutline,
  folderOpenOutline,
  playCircleOutline,
  imageOutline,
  videocamOutline
} from 'ionicons/icons';
import { ProfileService } from 'src/app/services/profile.service';
import { environment } from 'src/environments/environment';

import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { HeaderComponent } from '../../shared/components/header/header.component';

@Component({
  selector: 'app-influencer-profile',
  templateUrl: './influencer-profile.page.html',
  styleUrls: ['./influencer-profile.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonIcon,
    IonButton,
    IonGrid,
    IonRow,
    IonCol,
    IonButtons,
    IonBackButton,
    IonCard,
    IonCardContent,
    SidebarComponent,
    HeaderComponent
  ]
})
export class InfluencerProfilePage implements OnInit {
  isSidebarOpen = false;

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
  influencerId!: string;
  profile: any = null;
  instagramMedia: any[] = [];
  portfolioMedia: any[] = [];
  isLoading = true;
  errorMsg: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private profileService: ProfileService,
    private router: Router
  ) {
    addIcons({
      arrowBackOutline,
      logoInstagram,
      peopleOutline,
      folderOpenOutline,
      playCircleOutline,
      imageOutline,
      videocamOutline
    });
  }

  ngOnInit() {
    this.influencerId = this.route.snapshot.paramMap.get('id') || '';
    if (this.influencerId) {
      this.loadFullProfile();
    } else {
      this.errorMsg = 'No influencer ID specified.';
      this.isLoading = false;
    }
  }

  // Load the unified profile payload using subscribe()
  loadFullProfile() {
    this.isLoading = true;
    this.profileService.getInfluencerProfile(this.influencerId).subscribe({
      next: (data: any) => {
        if (data) {
          this.profile = data.profile;
          this.instagramMedia = data.instagramMedia || [];
          this.portfolioMedia = data.portfolioMedia || [];
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Failed to load influencer details:', error);
        this.errorMsg = error.message || 'Failed to retrieve influencer profile.';
        this.isLoading = false;
      }
    });
  }

  // Resolves the full URL for static assets from backend
  getMediaUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    const backendBase = environment.apiUrl.replace('/api', '');
    return `${backendBase}${url}`;
  }

  // Get initials for profile picture fallback
  getInitials(name: string): string {
    if (!name) return 'I';
    return name.charAt(0).toUpperCase();
  }
}
