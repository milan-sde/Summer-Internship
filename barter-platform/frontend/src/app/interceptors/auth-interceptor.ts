
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  catchError,
  filter,
  from,
  Observable,
  switchMap,
  take,
  throwError,
} from 'rxjs';
import { AuthService } from '../services/auth.service';
import { StorageService } from '../services/storage.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> =
    new BehaviorSubject<string | null>(null);

  constructor(
    private authService: AuthService,
    private storage: StorageService,
  ) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    // Skip token refresh endpoint
    if (req.url.includes('/auth/refresh')) {
      return next.handle(req);
    }

    return this.addTokenToRequest(req).pipe(
      switchMap((newReq) => next.handle(newReq)),
      catchError((error) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          return this.handle401Error(req, next);
        }
        return throwError(() => error);
      }),
    );
  }

  private addTokenToRequest(
    req: HttpRequest<any>,
  ): Observable<HttpRequest<any>> {
    return new Observable((observer) => {
      this.storage.getAccessToken().then((token) => {
        if (token) {
          req = req.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`,
            },
          });
        }
        observer.next(req);
        observer.complete();
      });
    });
  }

  private handle401Error(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return from(this.authService.refreshToken()).pipe(
        switchMap((token: string | null) => {
          this.isRefreshing = false;
          if (token) {
            this.refreshTokenSubject.next(token);
            return this.addTokenToRequest(req).pipe(
              switchMap((newReq) => next.handle(newReq)),
            );
          }
          return throwError(() => new Error('Token refresh failed'));
        }),
        catchError((error) => {
          this.isRefreshing = false;
          this.authService.logout();
          return throwError(() => error);
        }),
      );
    } else {
      return this.refreshTokenSubject.pipe(
        filter((token) => token !== null),
        take(1),
        switchMap((token) => {
          return this.addTokenToRequest(req).pipe(
            switchMap((newReq) => next.handle(newReq)),
          );
        }),
      );
    }
  }
}
