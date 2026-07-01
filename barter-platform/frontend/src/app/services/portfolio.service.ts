import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface PortfolioItem {
  id: string;
  userId: string;
  title?: string;
  description?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  mimeType: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class PortfolioService {
  private readonly apiUrl = environment.apiUrl.replace(/\/+$/, '');

  constructor(private http: HttpClient) {}

  // Upload portfolio media (image/video) along with description (Caption) and title (Category) using multipart/form-data via API
  uploadPortfolioMedia(
    file: File,
    caption: string,
    category: string,
  ): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', caption); // UI Caption -> Backend Description
    formData.append('title', category); // UI Category -> Backend Title
    return this.http.post(`${this.apiUrl}/portfolio`, formData, {
      withCredentials: true,
    });
  }

  // Retrieve logged-in influencer's own portfolio media list via API
  getMyPortfolio(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/portfolio/me`, {
      withCredentials: true,
    });
  }

  // Delete portfolio media item from database and disk via API
  deletePortfolioMedia(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/portfolio/${id}`, {
      withCredentials: true,
    });
  }
}
