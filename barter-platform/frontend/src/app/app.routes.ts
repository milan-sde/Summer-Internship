import { Routes } from '@angular/router';
import { GuestGuard } from './guards/guest-guard';
import { AuthGuard } from './guards/auth-guard';
import { OnboardingGuard } from './guards/onboarding-guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
    canActivate: [GuestGuard],
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.page').then((m) => m.RegisterPage),
    canActivate: [GuestGuard],
  },
  {
    path: 'verify-otp',
    loadComponent: () =>
      import('./pages/verify-otp/verify-otp.page').then((m) => m.VerifyOtpPage),
    canActivate: [GuestGuard],
  },
  {
    path: 'create-password',
    loadComponent: () =>
      import('./pages/create-password/create-password.page').then(
        (m) => m.CreatePasswordPage,
      ),
    canActivate: [GuestGuard],
  },
  {
    path: 'complete-profile',
    loadComponent: () =>
      import('./pages/complete-profile/complete-profile.page').then(
        (m) => m.CompleteProfilePage,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/profile/profile.page').then((m) => m.ProfilePage),
    canActivate: [AuthGuard, OnboardingGuard],
  },
  {
    path: 'profile/settings',
    loadComponent: () =>
      import('./pages/profile/profile.page').then((m) => m.ProfilePage),
    canActivate: [AuthGuard, OnboardingGuard],
  },
  {
    path: 'portfolio',
    loadComponent: () =>
      import('./pages/portfolio/portfolio.page').then((m) => m.PortfolioPage),
    canActivate: [AuthGuard, OnboardingGuard],
  },
  {
    path: 'content-workspace',
    loadComponent: () =>
      import('./pages/content-workspace/content-workspace.page').then(
        (m) => m.ContentWorkspacePage,
      ),
    canActivate: [AuthGuard, OnboardingGuard],
  },
  {
    path: 'instagram-catalogue',
    loadComponent: () =>
      import('./pages/instagram-catalogue/instagram-catalogue.page').then(
        (m) => m.InstagramCataloguePage,
      ),
    canActivate: [AuthGuard, OnboardingGuard],
  },
  {
    path: 'influencers/:id',
    loadComponent: () =>
      import('./pages/influencer-profile/influencer-profile.page').then(
        (m) => m.InfluencerProfilePage,
      ),
    canActivate: [AuthGuard, OnboardingGuard],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
    canActivate: [AuthGuard, OnboardingGuard],
  },
  {
    path: 'campaigns',
    loadComponent: () =>
      import('./pages/campaigns/campaigns.page').then((m) => m.CampaignsPage),
    canActivate: [AuthGuard, OnboardingGuard],
  },
  {
    path: 'create-campaign',
    loadComponent: () =>
      import('./pages/create-campaign/create-campaign.page').then(
        (m) => m.CreateCampaignPage,
      ),
    canActivate: [AuthGuard, OnboardingGuard],
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
