import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface InstagramAuthUrlResponse {
  authUrl: string;
}

export interface InstagramMediaItem {
  id: string;
  mediaId?: string;
  caption?: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  mediaUrl: string;
  thumbnailUrl?: string;
  permalink?: string;
  selectedForPortfolio?: boolean;
  source?: 'instagram' | 'upload';
  timestamp?: string;
}

@Injectable({
  providedIn: 'root',
})
export class InstagramService {
  private readonly apiUrl = environment.apiUrl.replace(/\/+$/, '');

  constructor(private http: HttpClient) {}

  getAuthUrl(origin: 'onboarding' | 'settings' = 'settings'): Observable<any> {
    return this.http.get<InstagramAuthUrlResponse>(
      `${this.apiUrl}/instagram/auth-url?origin=${origin}`,
      { withCredentials: true },
    );
  }

  syncProfile(): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/instagram/sync-profile`,
      {},
      { withCredentials: true },
    );
  }

  syncMedia(): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/instagram/sync-media`,
      {},
      { withCredentials: true },
    );
  }

  syncAll(): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/instagram/sync`,
      {},
      { withCredentials: true },
    );
  }

  updatePortfolio(
    mediaId: string,
    selectedForPortfolio: boolean,
  ): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/instagram/portfolio`,
      { mediaId, selectedForPortfolio },
      { withCredentials: true },
    );
  }

  disconnect(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/instagram/disconnect`, {
      withCredentials: true,
    });
  }
}
