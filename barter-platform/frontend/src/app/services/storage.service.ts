import { Injectable } from '@angular/core';
import { User } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  constructor() {}

  // Save access token synchronously in sessionStorage
  setAccessToken(token: string): void {
    sessionStorage.setItem('access_token', token);
  }

  // Get access token synchronously from sessionStorage
  getAccessToken(): string | null {
    return sessionStorage.getItem('access_token') || null;
  }

  // Save refresh token synchronously in sessionStorage
  setRefreshToken(token: string): void {
    sessionStorage.setItem('refresh_token', token);
  }

  // Get refresh token synchronously from sessionStorage
  getRefreshToken(): string | null {
    return sessionStorage.getItem('refresh_token') || null;
  }

  // Save user details synchronously in sessionStorage
  setUser(user: User): void {
    sessionStorage.setItem('user', JSON.stringify(user));
  }

  // Get user details synchronously from sessionStorage
  getUser(): User | null {
    const userString = sessionStorage.getItem('user');
    if (!userString) {
      return null;
    }
    try {
      return JSON.parse(userString);
    } catch (error) {
      console.error('Error parsing user object from sessionStorage', error);
      return null;
    }
  }

  // Check login status synchronously based on access token availability
  isLoggedIn(): boolean {
    const token = this.getAccessToken();
    return token !== null;
  }

  // Clear all items synchronously from sessionStorage
  clear(): void {
    sessionStorage.clear();
  }
}

