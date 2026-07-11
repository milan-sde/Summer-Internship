import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import {
  IonModal,
  IonButton,
  IonIcon,
  IonSpinner,
  IonItem,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonGrid,
  IonRow,
  IonCol,
  IonText,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { sparkles } from 'ionicons/icons';
import { AiService } from 'src/app/services/ai.service';

@Component({
  selector: 'app-ai-caption-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonModal,
    IonButton,
    IonIcon,
    IonSpinner,
    IonItem,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonGrid,
    IonRow,
    IonCol,
    IonText,
  ],
  templateUrl: './ai-caption-modal.component.html',
  styleUrls: ['./ai-caption-modal.component.scss'],
})
export class AiCaptionModalComponent {
  @Output() captionGenerated = new EventEmitter<string>();

  isOpen = false;
  isGenerating = false;
  aiForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private aiService: AiService,
    private toastController: ToastController,
  ) {
    addIcons({ sparkles });
    this.aiForm = this.fb.group({
      description: ['', [Validators.required]],
      tone: ['Casual', [Validators.required]],
      length: ['Medium', [Validators.required]],
      platform: ['Instagram', [Validators.required]],
      includeEmojis: [true],
      includeHashtags: [true],
    });
  }

  open() {
    this.aiForm.reset({
      description: '',
      tone: 'Casual',
      length: 'Medium',
      platform: 'Instagram',
      includeEmojis: true,
      includeHashtags: true,
    });
    this.isOpen = true;
  }

  close() {
    this.isOpen = false;
  }

  generate() {
    if (this.aiForm.invalid) {
      this.aiForm.markAllAsTouched();
      return;
    }

    this.isGenerating = true;

    this.aiService.generateCaption(this.aiForm.value).subscribe({
      next: (response: any) => {
        this.isGenerating = false;
        if (response?.success && response.data?.caption) {
          this.captionGenerated.emit(response.data.caption);
          this.close();
          this.showToast('Caption generated successfully!', 'success');
        } else {
          this.showToast('Failed to generate caption. Please try again.', 'danger');
        }
      },
      error: (error: any) => {
        this.isGenerating = false;
        console.error('Caption generation failed:', error);
        this.showToast(
          error.error?.error?.message || error.message || 'Failed to generate caption',
          'danger',
        );
      },
    });
  }

  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      color,
      duration: 3000,
      position: 'top',
      buttons: ['OK'],
    });
    await toast.present();
  }
}
