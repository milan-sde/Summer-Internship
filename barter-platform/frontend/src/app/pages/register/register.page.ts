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
  IonButton,
  IonIcon,
  IonItem,
  IonText,
  IonInput,
  IonGrid,
  IonRow,
  IonCol,
  LoadingController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personAddOutline,
  mailOutline,
  peopleOutline,
  briefcaseOutline,
} from 'ionicons/icons';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    IonInput,
    IonText,
    IonItem,
    IonIcon,
    IonButton,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonGrid,
    IonRow,
    IonCol,
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
  ],
})
export class RegisterPage implements OnInit {
  registerForm!: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
  ) {
    addIcons({
      personAddOutline,
      mailOutline,
      peopleOutline,
      briefcaseOutline,
    });
  }

  ngOnInit() {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      role: ['INFLUENCER', Validators.required],
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

  // Submit registration request
  async onSubmit() {
    if (this.registerForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;

      // Show loading spinner
      const loading = await this.loadingController.create({
        message: 'Sending verification code...',
      });
      await loading.present();

      const { email, role } = this.registerForm.value;

      try {
        // Call register API and wait for response
        const response: any = await this.authService.register(email, role);

        await loading.dismiss();
        await this.showToast('Verification code sent to your email!', 'success');
        
        // Navigate to OTP verification page
        await this.router.navigate(['/verify-otp'], {
          queryParams: { email },
        });
      } catch (error: any) {
        await loading.dismiss();
        await this.showToast(error.message || 'Registration failed', 'danger');
      } finally {
        this.isSubmitting = false;
      }
    }
  }
}
