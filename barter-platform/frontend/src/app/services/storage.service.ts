// src/app/services/storage.service.ts
import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private _storage: Storage | null = null;
  private storageReady: Promise<Storage>;

  constructor(private storage: Storage) {
    this.storageReady = this.init();
  }

  async init(): Promise<Storage> {
    const storage = await this.storage.create();
    this._storage = storage;
    return storage;
  }

  // Store access token (short-lived)
  async setAccessToken(token: string): Promise<void> {
    const storage = await this.storageReady;
    await storage.set('access_token', token);
  }

  async getAccessToken(): Promise<string | null> {
    const storage = await this.storageReady;
    return (await storage.get('access_token')) || null;
  }

  // Store refresh token (with security flag)
  async setRefreshToken(token: string): Promise<void> {
    const storage = await this.storageReady;
    await storage.set('refresh_token', token);
  }

  async getRefreshToken(): Promise<string | null> {
    const storage = await this.storageReady;
    return (await storage.get('refresh_token')) || null;
  }

  // Store user data
  async setUser(user: any): Promise<void> {
    const storage = await this.storageReady;
    await storage.set('user', JSON.stringify(user));
  }

  async getUser(): Promise<any> {
    const storage = await this.storageReady;
    const user = await storage.get('user');
    return user ? JSON.parse(user) : null;
  }

  // Check if user is logged in
  async isLoggedIn(): Promise<boolean> {
    const token = await this.getAccessToken();
    return !!token;
  }

  // Clear all data on logout
  async clear(): Promise<void> {
    const storage = await this.storageReady;
    await storage.clear();
  }
}
