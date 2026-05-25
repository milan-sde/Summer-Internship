import { Component } from '@angular/core';
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
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonText,
  IonInput,
  IonGrid,
  IonRow,
  IonCol,
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
    IonLabel,
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
export class RegisterPage {
  registerForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
  ) {
    addIcons({
      personAddOutline,
      mailOutline,
      peopleOutline,
      briefcaseOutline,
    });

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
