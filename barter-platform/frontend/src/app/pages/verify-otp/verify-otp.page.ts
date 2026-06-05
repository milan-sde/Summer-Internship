import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonIcon,
  IonText,
  IonInputOtp,
  IonButtons,
  IonBackButton,
  LoadingController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mailUnreadOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-otp',
  templateUrl: './verify-otp.page.html',
  styleUrls: ['./verify-otp.page.scss'],
  standalone: true,
  imports: [
    IonInputOtp,
    IonText,
    IonIcon,
    IonButton,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
  ],
})
export class VerifyOtpPage implements OnInit, OnDestroy {
  verifyOtpForm!: FormGroup;
  isSubmitting = false;
  email: string = '';
  timer: number = 60; // 60 seconds countdown
  canResend: boolean = false;
  private intervalId: any;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private loadingController: LoadingController,
    private toastController: ToastController,
  ) {
    addIcons({ mailUnreadOutline, checkmarkCircleOutline });
  }

  ngOnInit() {
    this.verifyOtpForm = this.fb.group({
      otp: [
        '',
        [
          Validators.required,
          Validators.minLength(6),
          Validators.maxLength(6),
          Validators.pattern(/^\d+$/),
        ],
      ],
    });

    // Get email from navigation state or query params
    this.route.queryParams.subscribe((params) => {
      this.email = params['email'] || '';
      if (!this.email) {
        // Try to get from navigation state
        const navigation = this.router.getCurrentNavigation();
        this.email = navigation?.extras.state?.['email'] || '';
      }
    });

    // Start countdown timer
    this.startTimer();
  }

  startTimer() {
    this.canResend = false;
    this.timer = 60;

    this.intervalId = setInterval(() => {
      if (this.timer > 0) {
        this.timer--;
      } else {
        this.canResend = true;
        clearInterval(this.intervalId);
      }
    }, 1000);
  }

  // Submit OTP verification code and redirect to password setting
  onSubmit() {
    if (this.verifyOtpForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      const { otp } = this.verifyOtpForm.value;

      this.loadingController.create({
        message: 'Verifying...',
      }).then((loading) => {
        loading.present();

        this.authService.verifyOtp(this.email, otp).subscribe({
          next: (response: any) => {
            loading.dismiss();
            this.showToast('Email verified! Now set your password.', 'success');
            this.router.navigate(['/create-password'], {
              queryParams: { email: this.email },
              state: { email: this.email },
            });
            this.isSubmitting = false;
          },
          error: (error: any) => {
            loading.dismiss();
            console.error('OTP verification failed:', error);
            this.showToast(error.message || 'OTP verification failed', 'danger');
            this.verifyOtpForm.patchValue({ otp: '' });
            this.isSubmitting = false;
          }
        });
      });
    }
  }

  // Resend OTP code to registration email via API
  resendOtp() {
    if (!this.canResend) return;

    this.loadingController.create({
      message: 'Resending verification code...',
    }).then((loading) => {
      loading.present();

      this.authService.resendOtp(this.email).subscribe({
        next: (response: any) => {
          loading.dismiss();
          this.startTimer();
          this.showToast('New OTP sent to your email!', 'success');
        },
        error: (error: any) => {
          loading.dismiss();
          console.error('Resend OTP failed:', error);
          this.showToast(error.message || 'Failed to resend OTP. Please try again.', 'danger');
        }
      });
    });
  }

  // Display toast feedback messages
  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'top',
      color: color,
      buttons: ['OK'],
    });
    await toast.present();
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
