import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
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
  IonButtons,
  IonBackButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  lockClosedOutline,
  eye,
  eyeOff,
  checkmarkCircle,
  closeCircle,
  saveOutline,
} from 'ionicons/icons';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-create-password',
  templateUrl: './create-password.page.html',
  styleUrls: ['./create-password.page.scss'],
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
    IonButtons,
    IonBackButton,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
  ],
})
export class CreatePasswordPage implements OnInit {
  createPasswordForm: FormGroup;
  isSubmitting = false;
  email: string = '';
  showPassword = false;
  showConfirmPassword = false;

  // Password strength indicators
  passwordStrength = {
    hasMinLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
  };

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    addIcons({
      lockClosedOutline,
      eye,
      eyeOff,
      checkmarkCircle,
      closeCircle,
      saveOutline,
    });

    this.createPasswordForm = this.fb.group(
      {
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            this.passwordStrengthValidator.bind(this),
          ],
        ],
        confirmPassword: ['', [Validators.required]],
      },
      { validator: this.passwordMatchValidator },
    );
  }

  ngOnInit() {
    // Get email from query params or navigation state
    this.route.queryParams.subscribe((params) => {
      this.email = params['email'] || '';
      if (!this.email) {
        const navigation = this.router.getCurrentNavigation();
        this.email = navigation?.extras.state?.['email'] || '';
      }
    });

    // Listen to password changes for strength indicator
    this.createPasswordForm
      .get('password')
      ?.valueChanges.subscribe((password: string) => {
        this.updatePasswordStrength(password);
      });
  }

  // Custom validator for password strength
  passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.value || '';

    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

    const isValid =
      hasMinLength &&
      hasUpperCase &&
      hasLowerCase &&
      hasNumber &&
      hasSpecialChar;

    return !isValid ? { weakPassword: true } : null;
  }

  // Confirm password validator
  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  updatePasswordStrength(password: string) {
    this.passwordStrength = {
      hasMinLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[^A-Za-z0-9]/.test(password),
    };
  }

  getPasswordStrengthScore(): number {
    let score = 0;
    if (this.passwordStrength.hasMinLength) score++;
    if (this.passwordStrength.hasUpperCase) score++;
    if (this.passwordStrength.hasLowerCase) score++;
    if (this.passwordStrength.hasNumber) score++;
    if (this.passwordStrength.hasSpecialChar) score++;
    return score;
  }

  getPasswordStrengthText(): string {
    const score = this.getPasswordStrengthScore();
    if (score <= 2) return 'Weak';
    if (score <= 4) return 'Medium';
    return 'Strong';
  }

  getPasswordStrengthColor(): string {
    const score = this.getPasswordStrengthScore();
    if (score <= 2) return 'danger';
    if (score <= 4) return 'warning';
    return 'success';
  }

  async onSubmit() {
    if (this.createPasswordForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      const { password, confirmPassword } = this.createPasswordForm.value;

      try {
        await this.authService.createPassword(
          this.email,
          password,
          confirmPassword,
        );
        // Navigate to login page
        await this.router.navigate(['/login']);
      } catch (error) {
        console.error('Password creation failed:', error);
      } finally {
        this.isSubmitting = false;
      }
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
}
