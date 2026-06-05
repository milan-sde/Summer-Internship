//(for login/register pages)

import { Injectable } from "@angular/core";
import { CanActivate, Router } from "@angular/router";
import { StorageService } from "../services/storage.service";


@Injectable({
  providedIn: 'root'
})
export class GuestGuard implements CanActivate {
  constructor(
    private storage: StorageService,
    private router: Router
  ) {}

  // Synchronously determine if the guest route is accessible (user is not logged in)
  canActivate(): boolean {
    const isLoggedIn = this.storage.isLoggedIn();

    if (isLoggedIn) {
      const user = this.storage.getUser();
      if (user?.onboardingCompleted) {
        this.router.navigate(['/dashboard']);
      } else {
        this.router.navigate(['/complete-profile']);
      }
      return false;
    }

    return true;
  }
}
