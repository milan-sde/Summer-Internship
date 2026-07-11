import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { StorageService } from './storage.service';
import { environment } from 'src/environments/environment';
import { bustMediaCache } from '../shared/utils/media.utils';

export interface UserState {
  id: string;
  email: string;
  role: string;
  fullName: string;
  avatarUrl: string;
  onboardingCompleted: boolean;
}

const backendBase = environment.apiUrl.replace('/api', '');

let avatarCacheBust = 0;

function resolveAvatarUrl(url: string | null | undefined): string {
  if (!url) return '';
  const separator = url.includes('?') ? '&' : '?';
  const cacheBust = `_cb=${avatarCacheBust}`;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return `${url}${separator}${cacheBust}`;
  }
  return `${backendBase}${url}${separator}${cacheBust}`;
}

@Injectable({
  providedIn: 'root',
})
export class AppStateService {
  private userSubject = new BehaviorSubject<UserState>(this.loadFromStorage());

  user$: Observable<UserState> = this.userSubject.asObservable();

  constructor(private storage: StorageService) {}

  private loadFromStorage(): UserState {
    const stored = this.storage.getUser();
    if (stored) {
      return {
        id: (stored as any).id || '',
        email: (stored as any).email || '',
        role: (stored as any).role || '',
        fullName: (stored as any).fullName || '',
        avatarUrl: resolveAvatarUrl((stored as any).avatarUrl || (stored as any).avatar || ''),
        onboardingCompleted: (stored as any).onboardingCompleted || false,
      };
    }
    return { id: '', email: '', role: '', fullName: '', avatarUrl: '', onboardingCompleted: false };
  }

  private persist(user: UserState): void {
    this.storage.setUser(user as any);
  }

  get currentUser(): UserState {
    return this.userSubject.getValue();
  }

  setUser(user: Partial<UserState>): void {
    const current = this.currentUser;
    const updated = { ...current, ...user };
    if (updated.avatarUrl && updated.avatarUrl !== current.avatarUrl?.replace(/[?&]_cb=\d+/, '')) {
      avatarCacheBust++;
      updated.avatarUrl = resolveAvatarUrl(updated.avatarUrl);
      bustMediaCache();
    }
    this.userSubject.next(updated);
    this.persist(updated);
  }

  setFromAuth(user: any): void {
    this.setUser({
      id: user.id || '',
      email: user.email || '',
      role: user.role || '',
      fullName: user.fullName || '',
      avatarUrl: user.avatarUrl || user.avatar || '',
      onboardingCompleted: user.onboardingCompleted || false,
    });
  }

  setFromProfile(profile: any): void {
    this.setUser({
      fullName: profile.fullName || '',
      avatarUrl: profile.avatarUrl || '',
    });
  }

  get resolvedAvatarUrl(): string {
    return resolveAvatarUrl(this.currentUser.avatarUrl);
  }

  getUserInitial(): string {
    const u = this.currentUser;
    if (u.fullName) return u.fullName.charAt(0).toUpperCase();
    if (u.email) return u.email.charAt(0).toUpperCase();
    return 'U';
  }

  clear(): void {
    this.userSubject.next({ id: '', email: '', role: '', fullName: '', avatarUrl: '', onboardingCompleted: false });
  }
}
