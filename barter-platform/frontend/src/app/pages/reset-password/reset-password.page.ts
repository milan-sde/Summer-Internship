import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import {
  IonContent,
  IonIcon,
  IonItem,
  IonInput,
  IonText,
  IonButton,
  LoadingController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  eye,
  eyeOff,
  mailOutline,
  lockClosedOutline,
  keyOutline,
} from 'ionicons/icons';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
  standalone: true,
  imports: [
    IonText,
    IonItem,
    IonInput,
    IonIcon,
    IonContent,
    IonButton,
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
  ],
})
export class ResetPasswordPage implements OnInit {
  resetForm!: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  isSubmitting = false;
  email = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private loadingController: LoadingController,
    private toastController: ToastController,
  ) {
    addIcons({ eye, eyeOff, mailOutline, lockClosedOutline, keyOutline });
  }

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.email = params['email'] || '';
    });

    this.resetForm = this.fb.group({
      email: [this.email, [Validators.required, Validators.email]],
      otp: [
        '',
        [
          Validators.required,
          Validators.minLength(6),
          Validators.maxLength(6),
          Validators.pattern(/^\d+$/),
        ],
      ],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/[A-Z]/),
          Validators.pattern(/[a-z]/),
          Validators.pattern(/[0-9]/),
          Validators.pattern(/[^A-Za-z0-9]/),
        ],
      ],
      confirmPassword: ['', [Validators.required]],
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'top',
      color,
      buttons: ['OK'],
    });
    await toast.present();
  }

  onSubmit() {
    if (this.resetForm.valid && !this.isSubmitting) {
      const { email, otp, password, confirmPassword } = this.resetForm.value;

      if (password !== confirmPassword) {
        this.showToast('Passwords do not match', 'danger');
        return;
      }

      this.isSubmitting = true;

      this.loadingController
        .create({ message: 'Resetting password...' })
        .then((loading) => {
          loading.present();

          this.authService
            .resetPassword(email, otp, password, confirmPassword)
            .subscribe({
              next: (response: any) => {
                loading.dismiss();
                this.isSubmitting = false;
                if (response.success) {
                  this.showToast(
                    'Password reset successfully!',
                    'success',
                  );
                  setTimeout(() => {
                    this.router.navigate(['/login']);
                  }, 1500);
                }
              },
              error: (error: any) => {
                loading.dismiss();
                this.isSubmitting = false;
                this.showToast(
                  error.error?.error?.message ||
                    error.message ||
                    'Failed to reset password',
                  'danger',
                );
              },
            });
        });
    }
  }
}
