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

  async canActivate(): Promise<boolean> {
    const isLoggedIn = await this.storage.isLoggedIn();

    if (isLoggedIn) {
      const user = await this.storage.getUser();
      if (user?.onboardingCompleted) {
        await this.router.navigate(['/dashboard']);
      } else {
        await this.router.navigate(['/complete-profile']);
      }
      return false;
    }

    return true;
  }
}
