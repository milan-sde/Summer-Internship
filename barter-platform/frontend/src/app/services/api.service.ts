import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { StorageService } from './storage.service';
import { catchError, Observable, retry, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private storage: StorageService,
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
      Authorization: `Bearer ${token}`,
    });
  }

  // public request no auth required:
  public post<T>(endpoint: string, data: any): Observable<T> {
    return this.http
      .post<T>(`${this.baseUrl}/${endpoint}`, data, {
        headers: this.getHeaders(),
      })
      .pipe(retry(1), catchError(this.handleError));
  }

  //authenticated requests:
  async authPost<T>(endpoint: string, data: any): Promise<Observable<T>> {
    const headers = await this.getAuthHeaders();
    return this.http
      .post<T>(`${this.baseUrl}/${endpoint}`, data, { headers })
      .pipe(retry(1), catchError(this.handleError));
  }

  async authGet<T>(endpoint: string): Promise<Observable<T>> {
    const headers = await this.getAuthHeaders();
    return this.http
      .get<T>(`${this.baseUrl}/${endpoint}`, { headers })
      .pipe(retry(1), catchError(this.handleError));
  }

  async authPut<T>(endpoint: string, data: any): Promise<Observable<T>> {
    const headers = await this.getAuthHeaders();
    return this.http
      .put<T>(`${this.baseUrl}/${endpoint}`, data, { headers })
      .pipe(retry(1), catchError(this.handleError));
  }

  async authDelete<T>(endpoint: string): Promise<Observable<T>> {
    const headers = await this.getAuthHeaders();
    return this.http
      .delete<T>(`${this.baseUrl}/${endpoint}`, { headers })
      .pipe(retry(1), catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      errorMessage =
        error.error?.error?.message ||
        `Error Code: ${error.status}\nMessage: ${error.message}`;
    }

    console.error('API Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
