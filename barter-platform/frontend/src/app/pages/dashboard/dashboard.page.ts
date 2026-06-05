import { Component, OnInit } from '@angular/core';
import { CommonModule, LowerCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { StorageService } from '../../services/storage.service';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonRefresher,
  IonRefresherContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  LoadingController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  logOutOutline,
  checkmarkCircle,
  peopleOutline,
  personOutline,
  barChartOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    LowerCasePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonGrid,
    IonRow,
    IonCol,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
  ],
})
export class DashboardPage implements OnInit {
  user: any;

  constructor(
    private authService: AuthService,
    private profileService: ProfileService,
    private storage: StorageService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
  ) {
    addIcons({
      logOutOutline,
      checkmarkCircle,
      peopleOutline,
      personOutline,
      barChartOutline,
    });
  }

  ngOnInit() {
    this.user = this.storage.getUser();
    this.loadProfile();
  }

  // Load authenticated user profile details from API via subscribe
  loadProfile(callback?: () => void) {
    this.profileService.getMyProfile().subscribe({
      next: (profile: any) => {
        this.user = { ...this.user, ...profile };
        if (callback) callback();
      },
      error: (error: any) => {
        console.error('Failed to load profile:', error);
        if (callback) callback();
      }
    });
  }

  // Reload profile on pull-to-refresh
  doRefresh(event: any) {
    this.loadProfile(() => {
      event.target.complete();
    });
  }

  exploreCollaborations() {
    this.router.navigate(['/campaigns']);
  }

  viewProfile() {
    this.router.navigate(['/profile']);
  }

  // Process user logout API request and clear local session storage via subscribe
  logout() {
    this.loadingController.create({
      message: 'Logging out...',
    }).then((loading) => {
      loading.present();

      this.authService.logout().subscribe({
        next: (response: any) => {
          loading.dismiss();
          this.authService.clearSession();
          this.showToast('Logged out successfully', 'success');
        },
        error: (error: any) => {
          loading.dismiss();
          console.error('Logout error:', error);
          this.authService.clearSession();
          this.showToast('Logged out successfully', 'success');
        }
      });
    });
  }

  // Display toast feedback messages
  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'top',
      color: color,
      buttons: ['OK'],
    });
    await toast.present();
  }
}
