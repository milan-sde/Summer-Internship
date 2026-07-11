import { Component, OnInit, OnDestroy, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotificationService, INotification } from '../../../services/notification.service';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkDoneOutline, timeOutline, alertCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-notification-panel',
  templateUrl: './notification-panel.component.html',
  styleUrls: ['./notification-panel.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon, IonSpinner],
})
export class NotificationPanelComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Output() closePanel = new EventEmitter<void>();
  @Output() unreadCountChanged = new EventEmitter<number>();

  notifications: INotification[] = [];
  loading = true;
  error = false;
  private subscription: Subscription | null = null;

  constructor(
    private notificationService: NotificationService,
    private router: Router
  ) {
    addIcons({ checkmarkDoneOutline, timeOutline, alertCircleOutline });
  }

  ngOnInit(): void {
    if (this.isOpen) {
      this.loadNotifications();
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  loadNotifications(): void {
    this.loading = true;
    this.error = false;
    this.subscription = this.notificationService.getNotifications(1, 20).subscribe({
      next: (res) => {
        if (res?.success && res?.data) {
          this.notifications = res.data.notifications || [];
          this.unreadCountChanged.emit(res.data.unreadCount);
        } else {
          this.notifications = [];
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = true;
      },
    });
  }

  onNotificationClick(notification: INotification): void {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => {
          notification.isRead = true;
          notification.readAt = new Date().toISOString();
          this.unreadCountChanged.emit(
            this.notifications.filter((n) => !n.isRead).length
          );
        },
        error: () => {},
      });
    }
    this.closePanel.emit();
    this.router.navigate([notification.actionUrl]);
  }

  onMarkAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach((n) => {
          n.isRead = true;
          n.readAt = new Date().toISOString();
        });
        this.unreadCountChanged.emit(0);
      },
      error: () => {},
    });
  }

  getRelativeTime(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  trackById(_index: number, item: INotification): string {
    return item.id;
  }
}
