import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonButton,
  IonCardTitle,
  IonIcon,
  IonCardSubtitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonNote,
  IonText,
  IonListHeader,
  IonRadio,
  IonRadioGroup,
  IonInput,
} from '@ionic/angular/standalone';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    IonRadio,
    IonRadioGroup,
    IonListHeader,
    IonInput,
    IonText,
    IonLabel,
    IonItem,
    IonCardContent,
    IonCardSubtitle,
    IonIcon,
    IonCardTitle,
    IonButton,
    IonCardHeader,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    IonCard,
  ],
})
export class RegisterPage {
  registerForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      role: ['INFLUENCER', Validators.required],
    });
  }

  async onSubmit() {
    if (this.registerForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      const { email, role } = this.registerForm.value;

      try {
        await this.authService.register(email, role);
      } catch (error) {
        console.log('Registration failed', error);
      } finally {
        this.isSubmitting = false;
      }
    }
  }
}
