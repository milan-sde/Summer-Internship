import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { StorageService } from './storage.service';
import { AppStateService } from './app-state.service';

export interface User {
  id: string;
  email: string;
  role: 'INFLUENCER' | 'BRAND';
  onboardingCompleted: boolean;
  avatar?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUser: User | null = null;
  private readonly apiUrl = environment.apiUrl.replace(/\/+$/, '');

  constructor(
    private http: HttpClient,
    private storage: StorageService,
    private appState: AppStateService,
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
    return this.http.post(
      `${this.apiUrl}/auth/register`,
      { email, role },
      { withCredentials: true },
    );
  }

  // Send request to verify email with OTP code via API
  verifyOtp(email: string, otp: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/auth/verify-otp`,
      { email, otp },
      { withCredentials: true },
    );
  }

  // Create password for user account registration via API
  createPassword(
    email: string,
    password: string,
    confirmPassword: string,
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/auth/create-password`,
      {
        email,
        password,
        confirmPassword,
      },
      { withCredentials: true },
    );
  }

  // Send request to resend OTP code to registration email
  resendOtp(email: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/auth/resend-otp`,
      { email },
      { withCredentials: true },
    );
  }

  // Authenticate user credentials using email and password
  login(email: string, password: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/auth/login`,
      { email, password },
      { withCredentials: true },
    );
  }

  // Save authentication tokens and update user state synchronously in storage
  saveUserSession(accessToken: string, refreshToken: string, user: any): void {
    this.storage.setAccessToken(accessToken);
    this.storage.setRefreshToken(refreshToken);
    this.storage.setUser(user);
    this.currentUser = user;
    this.appState.setFromAuth(user);
  }

  // Destroy session by calling API logout endpoint
  logout(): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/auth/logout`,
      {},
      { withCredentials: true },
    );
  }

  // Clear local session state and navigate back to login screen
  clearSession(): void {
    this.storage.clear();
    this.currentUser = null;
    this.router.navigate(['/login']);
  }

  // Fetch current user details synchronously from local storage cache
  getCurrentUser(): User | null {
    if (!this.currentUser) {
      this.currentUser = this.storage.getUser();
    }
    return this.currentUser;
  }
}
