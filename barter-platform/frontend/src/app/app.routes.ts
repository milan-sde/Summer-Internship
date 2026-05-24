// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { GuestGuard } from './guards/guest-guard';
import { AuthGuard } from './guards/auth-guard';
import { OnboardingGuard } from './guards/onboarding-guard';


export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage),
    canActivate: [GuestGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page').then(m => m.RegisterPage),
    canActivate: [GuestGuard]
  },
  {
    path: 'verify-otp',
    loadComponent: () => import('./pages/verify-otp/verify-otp.page').then(m => m.VerifyOtpPage),
    canActivate: [GuestGuard]
  },
  {
    path: 'create-password',
    loadComponent: () => import('./pages/create-password/create-password.page').then(m => m.CreatePasswordPage),
    canActivate: [GuestGuard]
  },
  {
    path: 'complete-profile',
    loadComponent: () => import('./pages/complete-profile/complete-profile.page').then(m => m.CompleteProfilePage),
    canActivate: [AuthGuard]
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage),
    canActivate: [AuthGuard, OnboardingGuard]
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  }
];
