import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { StorageService } from '../../../services/storage.service';
import { IonIcon, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { menuOutline, notificationsOutline, arrowBackOutline, sunnyOutline, moonOutline, desktopOutline } from 'ionicons/icons';
import { ThemeService } from '../../../services/theme.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink, IonIcon, IonButton]
})
export class HeaderComponent implements OnInit {
  @Input() title = '';
  @Input() showBackButton = false;
  @Input() backRoute = '';

  @Output() toggleSidebar = new EventEmitter<void>();

  user: any;

  constructor(
    private storage: StorageService,
    private router: Router,
    public themeService: ThemeService
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
}
