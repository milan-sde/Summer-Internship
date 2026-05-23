import { CanActivateFn } from '@angular/router';

export const onboardingGuard: CanActivateFn = (route, state) => {
  return true;
};
