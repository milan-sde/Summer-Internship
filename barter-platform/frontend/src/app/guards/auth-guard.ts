import { Injectable } from "@angular/core";
import { CanActivate, Router } from "@angular/router";
import { StorageService } from "../services/storage.service";


@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private storage: StorageService,
    private router: Router
  ) {}

  // Synchronously determine if user is authenticated before allowing routing
  canActivate(): boolean {
    const isLoggedIn = this.storage.isLoggedIn();

    if (!isLoggedIn) {
      this.router.navigate(['/login']);
      return false;
    }

    return true;
  }
}
