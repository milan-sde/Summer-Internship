import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';

export interface User {
  id: string;
  email: string;
  role: 'INFLUENCER' | 'BRAND';
  onboardingCompleted: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUser: User | null = null;

  constructor(
    private apiService: ApiService,
    private storage: StorageService,
    private router: Router,
  ) {
    this.loadUser();
  }

  // Load user profile information synchronously from sessionStorage
  private loadUser() {
    this.currentUser = this.storage.getUser();
  }

  // Send verification email to register a new user via API
  register(email: string, role: string): Observable<any> {
    return this.apiService.post('auth/register', { email, role });
  }

  // Send request to verify email with OTP code via API
  verifyOtp(email: string, otp: string): Observable<any> {
    return this.apiService.post('auth/verify-otp', { email, otp });
  }

  // Create password for user account registration via API
  createPassword(
    email: string,
    password: string,
    confirmPassword: string,
  ): Observable<any> {
    return this.apiService.post('auth/create-password', {
      email,
      password,
      confirmPassword,
    });
  }

  // Send request to resend OTP code to registration email
  resendOtp(email: string): Observable<any> {
    return this.apiService.post('auth/resend-otp', { email });
  }

  // Authenticate user credentials using email and password
  login(email: string, password: string): Observable<any> {
    return this.apiService.post('auth/login', { email, password });
  }

  // Save authentication tokens and update user state synchronously in storage
  saveUserSession(accessToken: string, refreshToken: string, user: any): void {
    this.storage.setAccessToken(accessToken);
    this.storage.setRefreshToken(refreshToken);
    this.storage.setUser(user);
    this.currentUser = user;
  }

  // Destroy session by calling API logout endpoint
  logout(): Observable<any> {
    return this.apiService.authPost('auth/logout', {});
  }

  // Clear local session state and navigate back to login screen
  clearSession(): void {
    this.storage.clear();
    this.currentUser = null;
    this.router.navigate(['/login']);
  }

  // Attempt to refresh access token using the refresh token from storage
  refreshToken(): Observable<string | null> {
    const refreshToken = this.storage.getRefreshToken();
    if (!refreshToken || refreshToken === 'undefined' || refreshToken === 'null') {
      return of(null);
    }

    return this.apiService.post<any>('auth/refresh', { refreshToken }).pipe(
      map((response: any) => {
        if (response && response.success) {
          this.storage.setAccessToken(response.data.accessToken);
          this.storage.setRefreshToken(response.data.refreshToken);
          return response.data.accessToken;
        }
        return null;
      }),
      catchError(() => {
        this.clearSession();
        return of(null);
      })
    );
  }

  // Fetch current user details synchronously from local storage cache
  getCurrentUser(): User | null {
    if (!this.currentUser) {
      this.currentUser = this.storage.getUser();
    }
    return this.currentUser;
  }
}
