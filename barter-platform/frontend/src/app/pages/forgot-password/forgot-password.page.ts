import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
import { mailOutline, arrowBack } from 'ionicons/icons';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
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
export class ForgotPasswordPage implements OnInit {
  forgotForm!: FormGroup;
  isSubmitting = false;
  isEmailSent = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
  ) {
    addIcons({ mailOutline, arrowBack });
  }

  ngOnInit() {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
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
    if (this.forgotForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;

      this.loadingController
        .create({ message: 'Sending reset code...' })
        .then((loading) => {
          loading.present();

          const { email } = this.forgotForm.value;

          this.authService.forgotPassword(email).subscribe({
            next: (response: any) => {
              loading.dismiss();
              this.isSubmitting = false;
              if (response.success) {
                this.isEmailSent = true;
                this.showToast('Reset code sent to your email', 'success');
                setTimeout(() => {
                  this.router.navigate(['/reset-password'], {
                    queryParams: { email },
                  });
                }, 1500);
              }
            },
            error: (error: any) => {
              loading.dismiss();
              this.isSubmitting = false;
              // Don't reveal whether email exists
              this.isEmailSent = true;
              this.showToast(
                'If an account exists, a reset code has been sent',
                'success',
              );
              setTimeout(() => {
                this.router.navigate(['/reset-password'], {
                  queryParams: { email },
                });
              }, 1500);
            },
          });
        });
    }
  }
}
