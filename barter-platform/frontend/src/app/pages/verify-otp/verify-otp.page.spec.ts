import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerifyOtpPage } from './verify-otp.page';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

describe('VerifyOtpPage', () => {
  let component: VerifyOtpPage;
  let fixture: ComponentFixture<VerifyOtpPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyOtpPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VerifyOtpPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

