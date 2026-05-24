import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';
import { LoadingController, ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

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
    const user = await this.storage.getUser();
    this.currentUserSubject.next(user);
  }

  async register(email: string, role: string): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Sending verification code...',
    });
    await loading.present();

    try {
      const response: any = await firstValueFrom(
        this.apiService.post('auth/register', { email, role }),
      );

      await this.showToast('Verification code sent to your email!', 'success');
      await this.router.navigate(['/verify-otp'], {
        queryParams: { email },
      });
    } catch (error: any) {
      await this.showToast(error.message, 'danger');
      throw error;
    } finally {
      await loading.dismiss();
    }
  }

  async verifyOtp(email: string, otp: string): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Verifying...',
    });
    await loading.present();

    try {
      const response: any = await firstValueFrom(
        this.apiService.post('auth/verify-otp', { email, otp }),
      );

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
      const response: any = await firstValueFrom(
        this.apiService.post('auth/create-password', {
          email,
          password,
          confirmPassword,
        }),
      );

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
      const response: any = await firstValueFrom(
        this.apiService.post('auth/resend-otp', { email }),
      );

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

  async login(email: string, password: string): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Logging in...',
    });
    await loading.present();

    try {
      const response: any = await firstValueFrom(
        this.apiService.post('auth/login', { email, password }),
      );

      if (response.success) {
        await this.storage.setAccessToken(response.data.accessToken);
        await this.storage.setRefreshToken(response.data.refreshToken);
        await this.storage.setUser(response.data.user);
        this.currentUserSubject.next(response.data.user);

        await this.showToast('Login successful!', 'success');

        // Redirect based on onboarding status
        if (response.data.user.onboardingCompleted) {
          await this.router.navigate(['/dashboard']);
        } else {
          await this.router.navigate(['/complete-profile']);
        }
      }
    } catch (error: any) {
      await this.showToast(error.message, 'danger');
      throw error;
    } finally {
      await loading.dismiss();
    }
  }

  async logout(): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Logging out...',
    });
    await loading.present();

    try {
      // Call logout API
      const authPost = await this.apiService.authPost('auth/logout', {});
      await firstValueFrom(authPost);
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear local storage regardless
      await this.storage.clear();
      this.currentUserSubject.next(null);
      await loading.dismiss();
      await this.router.navigate(['/login']);
      await this.showToast('Logged out successfully', 'success');
    }
  }

  async refreshToken(): Promise<string | null> {
    const refreshToken = await this.storage.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const response: any = await firstValueFrom(
        this.apiService.post('auth/refresh', { refreshToken }),
      );

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
    const user = await this.storage.getUser();
    return user;
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
