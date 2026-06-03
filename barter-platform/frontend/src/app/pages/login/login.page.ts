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
  IonHeader,
  IonTitle,
  IonToolbar,
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
  logInOutline,
  eye,
  eyeOff,
  mailOutline,
  lockClosedOutline,
} from 'ionicons/icons';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    IonText,
    IonItem,
    IonInput,
    IonIcon,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
  ],
})
export class LoginPage implements OnInit {
  loginForm!: FormGroup;
  showPassword = false;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
  ) {
    addIcons({ logInOutline, eye, eyeOff, mailOutline, lockClosedOutline });
  }

  ngOnInit() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
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

  // Submit login credentials
  async onSubmit() {
    if (this.loginForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;

      // Show loading spinner
      const loading = await this.loadingController.create({
        message: 'Logging in...',
      });
      await loading.present();

      const { email, password } = this.loginForm.value;

      try {
        // Call login API and wait for response
        const response: any = await this.authService.login(email, password);

        if (response.success) {
          // Save tokens and session details
          await this.authService.saveUserSession(
            response.data.accessToken,
            response.data.refreshToken,
            response.data.user,
          );

          await loading.dismiss();
          await this.showToast('Login successful!', 'success');

          // Redirect based on onboarding status
          if (response.data.user.onboardingCompleted) {
            await this.router.navigate(['/dashboard']);
          } else {
            await this.router.navigate(['/complete-profile']);
          }
        } else {
          await loading.dismiss();
          await this.showToast('Login failed', 'danger');
        }
      } catch (error: any) {
        await loading.dismiss();
        await this.showToast(error.message || 'Login failed', 'danger');
      } finally {
        this.isSubmitting = false;
      }
    }
  }
}
