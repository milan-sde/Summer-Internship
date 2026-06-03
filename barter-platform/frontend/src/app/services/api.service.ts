import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private storage: StorageService,
    private router: Router,
  ) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
    });
  }

  private async getAuthHeaders(): Promise<HttpHeaders> {
    const token = await this.storage.getAccessToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    });
  }

  // Refresh token helper to run when a 401 error occurs
  private async refreshToken(): Promise<string | null> {
    const refreshToken = await this.storage.getRefreshToken();
    if (!refreshToken || refreshToken === 'undefined' || refreshToken === 'null') return null;

    try {
      const response = await this.post<any>('auth/refresh', { refreshToken });
      if (response && response.success) {
        await this.storage.setAccessToken(response.data.accessToken);
        await this.storage.setRefreshToken(response.data.refreshToken);
        return response.data.accessToken;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // Logout helper to run when refresh token fails
  private async logout(): Promise<void> {
    await this.storage.clear();
    await this.router.navigate(['/login']);
  }

  // Helper to execute authenticated HTTP request & handle token refreshing on 401 response
  private async requestWithAuth<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: any,
    isFormData: boolean = false
  ): Promise<T> {
    let headers = await this.getAuthHeaders();
    if (isFormData) {
      // Don't set Content-Type header when uploading files: let browser set it automatically
      const token = await this.storage.getAccessToken();
      headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
      });
    }

    const url = `${this.baseUrl}/${endpoint}`;

    try {
      let observable;
      if (method === 'GET') {
        observable = this.http.get<T>(url, { headers, withCredentials: true });
      } else if (method === 'POST') {
        observable = this.http.post<T>(url, body, { headers, withCredentials: true });
      } else if (method === 'PUT') {
        observable = this.http.put<T>(url, body, { headers, withCredentials: true });
      } else {
        observable = this.http.delete<T>(url, { headers, withCredentials: true });
      }

      return await firstValueFrom(observable);
    } catch (error: any) {
      // If unauthorized (401 status), attempt to refresh token once and retry
      if (error.status === 401 && !endpoint.includes('auth/refresh')) {
        const newToken = await this.refreshToken();
        if (newToken) {
          const retryHeaders = new HttpHeaders({
            'Content-Type': isFormData ? undefined : 'application/json',
            'Authorization': `Bearer ${newToken}`,
          } as any);

          let retryObservable;
          if (method === 'GET') {
            retryObservable = this.http.get<T>(url, { headers: retryHeaders, withCredentials: true });
          } else if (method === 'POST') {
            retryObservable = this.http.post<T>(url, body, { headers: retryHeaders, withCredentials: true });
          } else if (method === 'PUT') {
            retryObservable = this.http.put<T>(url, body, { headers: retryHeaders, withCredentials: true });
          } else {
            retryObservable = this.http.delete<T>(url, { headers: retryHeaders, withCredentials: true });
          }

          return await firstValueFrom(retryObservable);
        } else {
          // Token refresh failed, perform logout
          await this.logout();
          throw new Error('Session expired. Please log in again.');
        }
      }
      throw new Error(error.error?.error?.message || error.message || 'Request failed');
    }
  }

  // Public POST request (no auth required)
  public async post<T>(endpoint: string, data: any): Promise<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    const observable = this.http.post<T>(url, data, { headers: this.getHeaders(), withCredentials: true });
    try {
      return await firstValueFrom(observable);
    } catch (error: any) {
      throw new Error(error.error?.error?.message || error.message || 'Request failed');
    }
  }

  // Authenticated requests
  async authPost<T>(endpoint: string, data: any): Promise<T> {
    return this.requestWithAuth<T>('POST', endpoint, data);
  }

  async authGet<T>(endpoint: string): Promise<T> {
    return this.requestWithAuth<T>('GET', endpoint);
  }

  async authPut<T>(endpoint: string, data: any): Promise<T> {
    return this.requestWithAuth<T>('PUT', endpoint, data);
  }

  async authDelete<T>(endpoint: string): Promise<T> {
    return this.requestWithAuth<T>('DELETE', endpoint);
  }

  // For file uploads (multipart/form-data)
  async authPostFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    return this.requestWithAuth<T>('POST', endpoint, formData, true);
  }

  // For PUT requests with form data
  async authPutFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    return this.requestWithAuth<T>('PUT', endpoint, formData, true);
  }
}
