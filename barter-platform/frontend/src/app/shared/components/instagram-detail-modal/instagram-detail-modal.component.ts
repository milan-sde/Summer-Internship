import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonModal,
  IonIcon,
  IonButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  logoInstagram,
  personOutline,
  trashOutline,
  openOutline,
  playCircleOutline,
} from 'ionicons/icons';
import { getMediaUrl } from '../../utils/media.utils';

@Component({
  selector: 'app-instagram-detail-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonModal,
    IonIcon,
    IonButton,
  ],
  templateUrl: './instagram-detail-modal.component.html',
  styleUrls: ['./instagram-detail-modal.component.scss'],
})
export class InstagramDetailModalComponent {
  @Input({ required: true }) isOpen = false;
  @Output() isOpenChange = new EventEmitter<boolean>();
  @Input() selectedItem: any = null;
  @Input() selectedItemType: 'catalog' | 'instagram' | null = 'instagram';
  @Input() authorTitle: string = '';
  @Input() authorSubtitle: string = '';
  @Input() timestampLabel: string = 'Synced:';
  @Input() showDeleteButton: boolean = false;
  @Input() fallbackText: string = 'Instagram Feed Post';

  @Output() dismissed = new EventEmitter<void>();
  @Output() deleteRequested = new EventEmitter<any>();

  constructor() {
    addIcons({
      logoInstagram,
      personOutline,
      trashOutline,
      openOutline,
      playCircleOutline,
    });
  }

  get isCatalog(): boolean {
    return this.selectedItemType === 'catalog';
  }

  get authorIconName(): string {
    return this.isCatalog ? 'person-outline' : 'logo-instagram';
  }

  get isCatalogImage(): boolean {
    return this.isCatalog && this.selectedItem?.mediaType === 'image';
  }

  get isCatalogVideo(): boolean {
    return this.isCatalog && this.selectedItem?.mediaType === 'video';
  }

  get isInstagramVideo(): boolean {
    return !this.isCatalog && this.selectedItem?.mediaType === 'VIDEO';
  }

  get computedAuthorTitle(): string {
    if (this.authorTitle) return this.authorTitle;
    if (this.isCatalog) return this.selectedItem?.title || 'Portfolio Showcase Item';
    return 'Instagram Media';
  }

  getMediaUrl = getMediaUrl;

  get hasPermalink(): boolean {
    return !this.isCatalog && this.selectedItem?.permalink;
  }

  get captionText(): string {
    if (this.isCatalog) return this.selectedItem?.description || 'No caption text.';
    return this.selectedItem?.caption || 'No caption text.';
  }

  onClose() {
    this.isOpen = false;
    this.isOpenChange.emit(false);
    this.dismissed.emit();
  }

  onDelete() {
    this.deleteRequested.emit(this.selectedItem);
  }
}
