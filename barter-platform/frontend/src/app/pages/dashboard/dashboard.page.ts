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
  ) {
    addIcons({
      logOutOutline,
      checkmarkCircle,
      peopleOutline,
      personOutline,
      barChartOutline,
    });
  }

  async ngOnInit() {
    this.user = await this.storage.getUser();
    await this.loadProfile();
  }

  async loadProfile() {
    try {
      const profile = await this.profileService.getMyProfile();
      this.user = { ...this.user, ...profile };
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  }

  async doRefresh(event: any) {
    await this.loadProfile();
    event.target.complete();
  }

  exploreCollaborations() {
    this.router.navigate(['/campaigns']);
  }

  viewProfile() {
    this.router.navigate(['/profile']);
  }

  async logout() {
    await this.authService.logout();
  }
}
