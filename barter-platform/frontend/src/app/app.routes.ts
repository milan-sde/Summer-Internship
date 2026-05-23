import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page').then( m => m.RegisterPage)
  },
  {
    path: 'verify-otp',
    loadComponent: () => import('./pages/verify-otp/verify-otp.page').then( m => m.VerifyOtpPage)
  },
  {
    path: 'create-password',
    loadComponent: () => import('./pages/create-password/create-password.page').then( m => m.CreatePasswordPage)
  },
  {
    path: 'complete-profile',
    loadComponent: () => import('./pages/complete-profile/complete-profile.page').then( m => m.CompleteProfilePage)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.page').then( m => m.DashboardPage)
  },
];
