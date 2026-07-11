import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { StorageService } from '../../../services/storage.service';
import { AuthService } from '../../../services/auth.service';
import { AppStateService, UserState } from '../../../services/app-state.service';
import { IonIcon, LoadingController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  appsOutline,
  peopleOutline,
  personOutline,
  folderOpenOutline,
  logoInstagram,
  logOutOutline,
  closeOutline,
  documentTextOutline
} from 'ionicons/icons';

interface MenuItem {
  label: string;
  route: string;
  icon: string;
  roles?: string[];
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink, IonIcon]
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Output() closeSidebar = new EventEmitter<void>();

  user: UserState = { id: '', email: '', role: '', fullName: '', avatarUrl: '', onboardingCompleted: false };
  currentRoute = '';
  private userSub?: Subscription;

  menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      route: '/dashboard',
      icon: 'apps-outline'
    },
    {
      label: 'Campaigns',
      route: '/campaigns',
      icon: 'people-outline'
    },
    {
      label: 'Content Workspace',
      route: '/content-workspace',
      icon: 'document-text-outline',
      roles: ['INFLUENCER']
    },
    {
      label: 'My Profile',
      route: '/profile',
      icon: 'person-outline'
    },
    {
      label: 'My Portfolio',
      route: '/portfolio',
      icon: 'folder-open-outline',
      roles: ['INFLUENCER']
    },
    {
      label: 'Instagram Shop',
      route: '/instagram-catalogue',
      icon: 'logo-instagram',
      roles: ['INFLUENCER']
    }
  ];

  constructor(
    private appState: AppStateService,
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController
  ) {
    addIcons({
      appsOutline,
      peopleOutline,
      personOutline,
      folderOpenOutline,
      logoInstagram,
      logOutOutline,
      closeOutline,
      documentTextOutline
    });

    // Track route changes to highlight the active menu item
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentRoute = event.urlAfterRedirects || event.url;
      });
  }

  ngOnInit() {
    this.userSub = this.appState.user$.subscribe(u => this.user = u);
    this.currentRoute = this.router.url;
  }

  ngOnDestroy() {
    this.userSub?.unsubscribe();
  }

  onAvatarError() {
    this.user = { ...this.user, avatarUrl: '' };
  }

  shouldShowItem(item: MenuItem): boolean {
    if (!item.roles) return true;
    if (!this.user || !this.user.role) return false;
    return item.roles.includes(this.user.role);
  }

  isActive(route: string): boolean {
    if (route === '/dashboard') {
      return this.currentRoute === '/dashboard';
    }
    return this.currentRoute.startsWith(route);
  }

  onLinkClick() {
    this.closeSidebar.emit();
  }

  logout() {
    this.closeSidebar.emit();
    this.loadingController.create({
      message: 'Logging out...',
    }).then((loading) => {
      loading.present();
      this.authService.logout().subscribe({
        next: () => {
          loading.dismiss();
          this.authService.clearSession();
        },
        error: (error) => {
          loading.dismiss();
          console.error('Logout error:', error);
          this.authService.clearSession();
        }
      });
    });
  }
}
