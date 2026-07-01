// src/app/services/theme.service.ts

import { Injectable } from '@angular/core';

export type AppTheme = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private activeTheme: AppTheme = 'system';
  private mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  constructor() {
    // Listen for OS/browser theme preference modifications
    this.mediaQuery.addEventListener('change', () => {
      if (this.activeTheme === 'system') {
        this.applyTheme();
      }
    });
  }

  // Fetch from storage on startup
  initTheme() {
    const savedTheme = localStorage.getItem('app-theme') as AppTheme;
    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
      this.activeTheme = savedTheme;
    } else {
      this.activeTheme = 'system';
    }
    this.applyTheme();
  }

  getTheme(): AppTheme {
    return this.activeTheme;
  }

  setTheme(theme: AppTheme) {
    this.activeTheme = theme;
    localStorage.setItem('app-theme', theme);
    this.applyTheme();
  }

  toggleTheme() {
    const current = this.activeTheme;
    let next: AppTheme = 'system';
    if (current === 'light') {
      next = 'dark';
    } else if (current === 'dark') {
      next = 'system';
    } else {
      next = 'light';
    }
    this.setTheme(next);
  }

  private applyTheme() {
    const isDark =
      this.activeTheme === 'dark' ||
      (this.activeTheme === 'system' && this.mediaQuery.matches);

    if (isDark) {
      document.documentElement.classList.add('ion-palette-dark');
    } else {
      document.documentElement.classList.remove('ion-palette-dark');
    }
  }
}
