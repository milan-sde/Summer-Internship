import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';
import { LoadingController, ToastController } from '@ionic/angular/standalone';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUser: any = null;

  constructor(
    private apiService: ApiService,
    private storage: StorageService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
  ) {
    this.loadUser();
  }

  private async loadUser() {
    this.currentUser = await this.storage.getUser();
  }

  // Send verification email to register a new user
  register(email: string, role: string): Promise<any> {
    return this.apiService.post('auth/register', { email, role });
  }

  async verifyOtp(email: string, otp: string): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Verifying...',
    });
    await loading.present();

    try {
      const response: any = await this.apiService.post('auth/verify-otp', { email, otp });

      await this.showToast('Email verified! Now set your password.', 'success');
      await this.router.navigate(['/create-password'], {
        queryParams: { email },
      });
    } catch (error: any) {
      await this.showToast(error.message, 'danger');
      throw error;
    } finally {
      await loading.dismiss();
    }
  }

  async createPassword(
    email: string,
    password: string,
    confirmPassword: string,
  ): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Setting up your account...',
    });
    await loading.present();

    try {
      const response: any = await this.apiService.post('auth/create-password', {
        email,
        password,
        confirmPassword,
      });

      await this.showToast('Password created! Please login.', 'success');
      await this.router.navigate(['/login']);
    } catch (error: any) {
      await this.showToast(error.message, 'danger');
      throw error;
    } finally {
      await loading.dismiss();
    }
  }

  async resendOtp(email: string): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Resending verification code...',
    });
    await loading.present();

    try {
      const response: any = await this.apiService.post('auth/resend-otp', { email });

      await this.showToast(
        'Verification code resent to your email!',
        'success',
      );
    } catch (error: any) {
      await this.showToast(error.message || 'Failed to resend OTP', 'danger');
      throw error;
    } finally {
      await loading.dismiss();
    }
  }

  // Authenticate user credentials, returns Promise
  login(email: string, password: string): Promise<any> {
    return this.apiService.post('auth/login', { email, password });
  }

  // Save authentication tokens and update user state
  async saveUserSession(accessToken: string, refreshToken: string, user: any): Promise<void> {
    await this.storage.setAccessToken(accessToken);
    await this.storage.setRefreshToken(refreshToken);
    await this.storage.setUser(user);
    this.currentUser = user;
  }

  async logout(): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Logging out...',
    });
    await loading.present();

    try {
      // Call logout API
      await this.apiService.authPost('auth/logout', {});
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear local storage regardless
      await this.storage.clear();
      this.currentUser = null;
      await loading.dismiss();
      await this.router.navigate(['/login']);
      await this.showToast('Logged out successfully', 'success');
    }
  }

  async refreshToken(): Promise<string | null> {
    const refreshToken = await this.storage.getRefreshToken();
    if (!refreshToken || refreshToken === 'undefined' || refreshToken === 'null') return null;

    try {
      const response: any = await this.apiService.post('auth/refresh', { refreshToken });

      if (response.success) {
        await this.storage.setAccessToken(response.data.accessToken);
        await this.storage.setRefreshToken(response.data.refreshToken);
        return response.data.accessToken;
      }
      return null;
    } catch (error) {
      await this.logout();
      return null;
    }
  }

  async getCurrentUser(): Promise<any> {
    if (!this.currentUser) {
      this.currentUser = await this.storage.getUser();
    }
    return this.currentUser;
  }

  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'top',
      color: color,
      buttons: ['OK'],
    });
    await toast.present();
  }
}
