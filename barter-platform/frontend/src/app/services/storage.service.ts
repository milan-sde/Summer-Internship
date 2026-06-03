// src/app/services/storage.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  constructor() {}

  async setAccessToken(token: string): Promise<void> {
    sessionStorage.setItem('access_token', token);
  }
  async getAccessToken(): Promise<string | null> {
    return sessionStorage.getItem('access_token') || null;
  }

  async setRefreshToken(token: string): Promise<void> {
    sessionStorage.setItem('refresh_token', token);
  }

  async getRefreshToken(): Promise<string | null> {
    return sessionStorage.getItem('refresh_token') || null;
  }

  async setUser(user: any): Promise<void> {
    sessionStorage.setItem('user', JSON.stringify(user));
  }


  async getUser(): Promise<any> {
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

  async isLoggedIn(): Promise<boolean> {
    const token = await this.getAccessToken();
    return token !== null;
  }

  async clear(): Promise<void> {
    sessionStorage.clear();
  }
}

