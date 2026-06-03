import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { OnboardingGuard } from './onboarding-guard';
import { StorageService } from '../services/storage.service';

describe('OnboardingGuard', () => {
  let guard: OnboardingGuard;

  beforeEach(() => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [
        OnboardingGuard,
        StorageService,
        { provide: Router, useValue: routerSpy }
      ]
    });
    guard = TestBed.inject(OnboardingGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});

