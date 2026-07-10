import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, interval, Subscription } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export enum NotificationType {
  APPLICATION_RECEIVED = 'APPLICATION_RECEIVED',
  APPLICATION_ACCEPTED = 'APPLICATION_ACCEPTED',
  APPLICATION_REJECTED = 'APPLICATION_REJECTED',
  DELIVERABLE_SUBMITTED = 'DELIVERABLE_SUBMITTED',
  DELIVERABLE_APPROVED = 'DELIVERABLE_APPROVED',
  DELIVERABLE_CHANGES_REQUESTED = 'DELIVERABLE_CHANGES_REQUESTED',
  CONTENT_PUBLISHED = 'CONTENT_PUBLISHED',
  CONTENT_PUBLISH_FAILED = 'CONTENT_PUBLISH_FAILED',
}

export interface INotification {
  id: string;
  recipientId: string;
  actorId?: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType: 'campaign' | 'submission';
  entityId: string;
  actionUrl: string;
  isRead: boolean;
  readAt?: string;
  metadata: {
    campaignTitle?: string;
    campaignId?: string;
    submissionId?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResult {
  notifications: INotification[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  unreadCount: number;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly apiUrl = environment.apiUrl.replace(/\/+$/, '') + '/notifications';
  private unreadCountSubject = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCountSubject.asObservable();
  private pollingSubscription: Subscription | null = null;

  constructor(private http: HttpClient) {}

  getNotifications(page = 1, limit = 20, unreadOnly = false): Observable<ApiResponse<NotificationListResult>> {
    const params: string[] = [`page=${page}`, `limit=${limit}`];
    if (unreadOnly) params.push('unread=true');
    return this.http.get<ApiResponse<NotificationListResult>>(
      `${this.apiUrl}?${params.join('&')}`,
      { withCredentials: true }
    );
  }

  getUnreadCount(): Observable<ApiResponse<UnreadCountResponse>> {
    return this.http.get<ApiResponse<UnreadCountResponse>>(
      `${this.apiUrl}/unread-count`,
      { withCredentials: true }
    );
  }

  markAsRead(notificationId: string): Observable<ApiResponse<{ notification: INotification }>> {
    return this.http.patch<ApiResponse<{ notification: INotification }>>(
      `${this.apiUrl}/${notificationId}/read`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(() => {
        const current = this.unreadCountSubject.value;
        if (current > 0) this.unreadCountSubject.next(current - 1);
      })
    );
  }

  markAllAsRead(): Observable<ApiResponse<{ updatedCount: number }>> {
    return this.http.patch<ApiResponse<{ updatedCount: number }>>(
      `${this.apiUrl}/read-all`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(() => this.unreadCountSubject.next(0))
    );
  }

  refreshUnreadCount(): void {
    this.getUnreadCount().subscribe({
      next: (res) => {
        if (res?.success && res?.data) {
          this.unreadCountSubject.next(res.data.unreadCount);
        }
      },
      error: () => {},
    });
  }

  startPolling(intervalMs = 30000): void {
    this.stopPolling();
    this.pollingSubscription = interval(intervalMs).pipe(
      switchMap(() => this.getUnreadCount())
    ).subscribe({
      next: (res) => {
        if (res?.success && res?.data) {
          this.unreadCountSubject.next(res.data.unreadCount);
        }
      },
      error: () => {},
    });
  }

  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }
}
