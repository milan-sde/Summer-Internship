import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
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

  // Generate public request headers
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
    });
  }

  // Generate authentication headers synchronously using sessionStorage token
  private getAuthHeaders(): HttpHeaders {
    const token = this.storage.getAccessToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    });
  }

  // Attempt to refresh the access token using the refresh token from storage
  private refreshToken(): Observable<string | null> {
    const refreshToken = this.storage.getRefreshToken();
    if (!refreshToken || refreshToken === 'undefined' || refreshToken === 'null') {
      return of(null);
    }

    const url = `${this.baseUrl}/auth/refresh`;
    return this.http.post<any>(url, { refreshToken }, { headers: this.getHeaders(), withCredentials: true }).pipe(
      map((response) => {
        if (response && response.success) {
          this.storage.setAccessToken(response.data.accessToken);
          this.storage.setRefreshToken(response.data.refreshToken);
          return response.data.accessToken;
        }
        return null;
      }),
      catchError(() => of(null))
    );
  }

  // Log out the user synchronously by clearing credentials and routing to login
  private logout(): void {
    this.storage.clear();
    this.router.navigate(['/login']);
  }

  // Handle authorized requests and automatically attempt token refresh on 401 Unauthorized status
  private requestWithAuth<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: any,
    isFormData: boolean = false
  ): Observable<T> {
    const token = this.storage.getAccessToken();
    const headers = isFormData
      ? new HttpHeaders({ 'Authorization': `Bearer ${token}` })
      : this.getAuthHeaders();

    const url = `${this.baseUrl}/${endpoint}`;

    let observable: Observable<T>;
    if (method === 'GET') {
      observable = this.http.get<T>(url, { headers, withCredentials: true });
    } else if (method === 'POST') {
      observable = this.http.post<T>(url, body, { headers, withCredentials: true });
    } else if (method === 'PUT') {
      observable = this.http.put<T>(url, body, { headers, withCredentials: true });
    } else {
      observable = this.http.delete<T>(url, { headers, withCredentials: true });
    }

    return observable.pipe(
      catchError((error: any) => {
        // If request is unauthorized (401), perform a token refresh check and retry once
        if (error.status === 401 && !endpoint.includes('auth/refresh')) {
          return this.refreshToken().pipe(
            switchMap((newToken) => {
              if (newToken) {
                const retryHeaders = new HttpHeaders({
                  'Content-Type': isFormData ? undefined : 'application/json',
                  'Authorization': `Bearer ${newToken}`,
                } as any);

                if (method === 'GET') {
                  return this.http.get<T>(url, { headers: retryHeaders, withCredentials: true });
                } else if (method === 'POST') {
                  return this.http.post<T>(url, body, { headers: retryHeaders, withCredentials: true });
                } else if (method === 'PUT') {
                  return this.http.put<T>(url, body, { headers: retryHeaders, withCredentials: true });
                } else {
                  return this.http.delete<T>(url, { headers: retryHeaders, withCredentials: true });
                }
              } else {
                // If refresh token validation fails, log out the user and return session expired error
                this.logout();
                return throwError(() => new Error('Session expired. Please log in again.'));
              }
            })
          );
        }
        return throwError(() => new Error(error.error?.error?.message || error.message || 'Request failed'));
      })
    );
  }

  // Public HTTP POST request wrapper returning Observable
  public post<T>(endpoint: string, data: any): Observable<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    return this.http.post<T>(url, data, { headers: this.getHeaders(), withCredentials: true }).pipe(
      catchError((error: any) => {
        return throwError(() => new Error(error.error?.error?.message || error.message || 'Request failed'));
      })
    );
  }

  // Authenticated HTTP POST request wrapper returning Observable
  authPost<T>(endpoint: string, data: any): Observable<T> {
    return this.requestWithAuth<T>('POST', endpoint, data);
  }

  // Authenticated HTTP GET request wrapper returning Observable
  authGet<T>(endpoint: string): Observable<T> {
    return this.requestWithAuth<T>('GET', endpoint);
  }

  // Authenticated HTTP PUT request wrapper returning Observable
  authPut<T>(endpoint: string, data: any): Observable<T> {
    return this.requestWithAuth<T>('PUT', endpoint, data);
  }

  // Authenticated HTTP DELETE request wrapper returning Observable
  authDelete<T>(endpoint: string): Observable<T> {
    return this.requestWithAuth<T>('DELETE', endpoint);
  }

  // Authenticated HTTP POST request for file uploads (FormData) returning Observable
  authPostFormData<T>(endpoint: string, formData: FormData): Observable<T> {
    return this.requestWithAuth<T>('POST', endpoint, formData, true);
  }

  // Authenticated HTTP PUT request for file uploads (FormData) returning Observable
  authPutFormData<T>(endpoint: string, formData: FormData): Observable<T> {
    return this.requestWithAuth<T>('PUT', endpoint, formData, true);
  }
}
