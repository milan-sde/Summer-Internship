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
  verifyOtpForm: FormGroup;
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
  ) {
    addIcons({ mailUnreadOutline, checkmarkCircleOutline });

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
  }

  ngOnInit() {
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

  async onSubmit() {
    if (this.verifyOtpForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      const { otp } = this.verifyOtpForm.value;

      try {
        await this.authService.verifyOtp(this.email, otp);
        // Navigate to create password page
        await this.router.navigate(['/create-password'], {
          queryParams: { email: this.email },
          state: { email: this.email },
        });
      } catch (error) {
        console.error('OTP verification failed:', error);
        // Clear OTP field on error
        this.verifyOtpForm.patchValue({ otp: '' });
      } finally {
        this.isSubmitting = false;
      }
    }
  }

  async resendOtp() {
    if (!this.canResend) return;

    try {
      await this.authService.resendOtp(this.email);
      // Reset timer
      this.startTimer();
      // Show success message
      const toast = await this.createToast(
        'New OTP sent to your email!',
        'success',
      );
      await toast.present();
    } catch (error) {
      console.error('Resend OTP failed:', error);
      const toast = await this.createToast(
        'Failed to resend OTP. Please try again.',
        'danger',
      );
      await toast.present();
    }
  }

  async createToast(message: string, color: string) {
    const { ToastController } = await import('@ionic/angular/standalone');
    const toastController = new ToastController();
    return await toastController.create({
      message: message,
      duration: 3000,
      position: 'top',
      color: color,
    });
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
