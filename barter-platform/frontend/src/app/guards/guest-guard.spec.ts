import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { GuestGuard } from './guest-guard';
import { StorageService } from '../services/storage.service';

describe('GuestGuard', () => {
  let guard: GuestGuard;

  beforeEach(() => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [
        GuestGuard,
        StorageService,
        { provide: Router, useValue: routerSpy }
      ]
    });
    guard = TestBed.inject(GuestGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});

