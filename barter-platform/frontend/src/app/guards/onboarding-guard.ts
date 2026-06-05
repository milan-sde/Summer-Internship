import { Injectable } from "@angular/core";
import { CanActivate, Router } from "@angular/router";
import { StorageService } from "../services/storage.service";


@Injectable({
  providedIn: 'root'
})
export class OnboardingGuard implements CanActivate {
  constructor(
    private storage: StorageService,
    private router: Router
  ) {}

  // Synchronously determine if user profile onboarding is completed before allowing access
  canActivate(): boolean {
    const user = this.storage.getUser();

    if (!user || !user.onboardingCompleted) {
      this.router.navigate(['/complete-profile']);
      return false;
    }

    return true;
  }
}
