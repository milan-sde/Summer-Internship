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

  async canActivate(): Promise<boolean> {
    const user = await this.storage.getUser();

    if (!user || !user.onboardingCompleted) {
      await this.router.navigate(['/complete-profile']);
      return false;
    }

    return true;
  }
}
