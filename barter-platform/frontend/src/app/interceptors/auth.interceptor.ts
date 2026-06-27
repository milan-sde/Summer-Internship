import {
  HttpClient,
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { StorageService } from '../services/storage.service';

const apiBaseUrl = environment.apiUrl.replace(/\/+$/, '');
const refreshEndpoint = `${apiBaseUrl}/auth/refresh`;
const protectedRetryFlag = new HttpContextToken<boolean>(() => false);

const publicEndpoints = [
  '/auth/login',
  '/auth/register',
  '/auth/verify-otp',
  '/auth/create-password',
  '/auth/resend-otp',
  '/auth/refresh',
];

type RefreshResponse = {
  success?: boolean;
  data?: {
    accessToken?: string;
    refreshToken?: string;
  };
};

function getRequestPath(url: string): string {
  if (!url.startsWith(apiBaseUrl)) {
    return url.split('?')[0].replace(/\/+$/, '');
  }

  return url
    .slice(apiBaseUrl.length)
    .split('?')[0]
    .replace(/\/+$/, '');
}

function isPublicRequest(url: string): boolean {
  const requestPath = getRequestPath(url);

  return publicEndpoints.some((endpoint) => requestPath === endpoint || requestPath.endsWith(endpoint));
}

function getErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    return error.error?.error?.message || error.error?.message || error.message || 'Request failed';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Request failed';
}

function clearSessionAndRedirect(storage: StorageService, router: Router): Error {
  storage.clear();
  router.navigate(['/login']);
  return new Error('Session expired. Please log in again.');
}

function addAccessToken(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(apiBaseUrl)) {
    return next(request);
  }

  const http = inject(HttpClient);
  const storage = inject(StorageService);
  const router = inject(Router);

  const requestWithCredentials = request.clone({ withCredentials: true });

  if (isPublicRequest(request.url)) {
    return next(requestWithCredentials).pipe(
      catchError((error) => throwError(() => new Error(getErrorMessage(error))))
    );
  }

  const authenticatedRequest = requestWithCredentials.clone({
    setHeaders: addAccessToken(storage.getAccessToken()),
  });

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => new Error(getErrorMessage(error)));
      }

      if (request.context.get(protectedRetryFlag)) {
        return throwError(() => clearSessionAndRedirect(storage, router));
      }

      const refreshToken = storage.getRefreshToken();
      if (!refreshToken || refreshToken === 'undefined' || refreshToken === 'null') {
        return throwError(() => clearSessionAndRedirect(storage, router));
      }

      return http.post<RefreshResponse>(refreshEndpoint, { refreshToken }, { withCredentials: true }).pipe(
        switchMap((response) => {
          const newAccessToken = response?.data?.accessToken;
          const newRefreshToken = response?.data?.refreshToken;

          if (!response?.success || !newAccessToken || !newRefreshToken) {
            return throwError(() => clearSessionAndRedirect(storage, router));
          }

          storage.setAccessToken(newAccessToken);
          storage.setRefreshToken(newRefreshToken);

          const retriedRequest = authenticatedRequest.clone({
            context: request.context.set(protectedRetryFlag, true),
            setHeaders: {
              Authorization: `Bearer ${newAccessToken}`,
            },
          });

          return next(retriedRequest);
        }),
        catchError(() => throwError(() => clearSessionAndRedirect(storage, router)))
      );
    })
  );
};