import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StorageService } from '../../../services/storage.service';
import { NotificationService } from '../../../services/notification.service';
import { NotificationPanelComponent } from '../notification-panel/notification-panel.component';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { menuOutline, notificationsOutline, arrowBackOutline, sunnyOutline, moonOutline, desktopOutline } from 'ionicons/icons';
import { ThemeService } from '../../../services/theme.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon, NotificationPanelComponent]
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() title = '';
  @Input() showBackButton = false;
  @Input() backRoute = '';

  @Output() toggleSidebar = new EventEmitter<void>();

  user: any;
  unreadCount = 0;
  isNotificationPanelOpen = false;

  constructor(
    private storage: StorageService,
    private router: Router,
    public themeService: ThemeService,
    public notificationService: NotificationService
  ) {
    addIcons({
      menuOutline,
      notificationsOutline,
      arrowBackOutline,
      sunnyOutline,
      moonOutline,
      desktopOutline
    });
  }

  ngOnInit() {
    this.user = this.storage.getUser();
    this.notificationService.refreshUnreadCount();
    this.notificationService.startPolling(30000);
    this.notificationService.unreadCount$.subscribe(count => {
      this.unreadCount = count;
    });
  }

  ngOnDestroy() {
    this.notificationService.stopPolling();
  }

  getCurrentThemeIcon(): string {
    const theme = this.themeService.getTheme();
    if (theme === 'light') return 'sunny-outline';
    if (theme === 'dark') return 'moon-outline';
    return 'desktop-outline';
  }

  onMenuClick() {
    this.toggleSidebar.emit();
  }

  goBack() {
    if (this.backRoute) {
      this.router.navigate([this.backRoute]);
    } else {
      window.history.back();
    }
  }

  viewProfile() {
    this.router.navigate(['/profile']);
  }

  toggleNotificationPanel() {
    this.isNotificationPanelOpen = !this.isNotificationPanelOpen;
  }

  closeNotificationPanel() {
    this.isNotificationPanelOpen = false;
  }

  onUnreadCountChanged(count: number) {
    this.unreadCount = count;
  }
}
