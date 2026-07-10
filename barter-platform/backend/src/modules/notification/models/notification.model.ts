import mongoose, { Document, Schema } from 'mongoose';

// Controlled enum for all notification types supported by the platform
export enum NotificationType {
  APPLICATION_RECEIVED = 'APPLICATION_RECEIVED',
  APPLICATION_ACCEPTED = 'APPLICATION_ACCEPTED',
  APPLICATION_REJECTED = 'APPLICATION_REJECTED',
  DELIVERABLE_SUBMITTED = 'DELIVERABLE_SUBMITTED',
  DELIVERABLE_APPROVED = 'DELIVERABLE_APPROVED',
  DELIVERABLE_CHANGES_REQUESTED = 'DELIVERABLE_CHANGES_REQUESTED',
  CONTENT_PUBLISHED = 'CONTENT_PUBLISHED',
  CONTENT_PUBLISH_FAILED = 'CONTENT_PUBLISH_FAILED',
}

export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId; // User._id of the receiver
  actorId?: mongoose.Types.ObjectId;    // User._id of the actor (who caused the event)
  type: NotificationType;
  title: string;
  message: string;
  entityType: 'campaign' | 'submission';
  entityId: mongoose.Types.ObjectId;   // Campaign._id or ContentSubmission._id
  actionUrl: string;                   // Frontend navigation path
  isRead: boolean;
  readAt?: Date;
  // Minimal, safe, non-sensitive context only — no tokens, passwords, or OTPs
  metadata: {
    campaignTitle?: string;
    campaignId?: string;
    submissionId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    entityType: {
      type: String,
      enum: ['campaign', 'submission'],
      required: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    actionUrl: {
      type: String,
      required: true,
      maxlength: 300,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      required: false,
    },
    metadata: {
      campaignTitle: { type: String, required: false, maxlength: 200 },
      campaignId: { type: String, required: false },
      submissionId: { type: String, required: false },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Index for efficiently fetching a user's notifications sorted by newest first
notificationSchema.index({ recipientId: 1, createdAt: -1 });

// Index for efficiently counting/filtering unread notifications per user
notificationSchema.index({ recipientId: 1, isRead: 1 });

export const Notification = mongoose.model<INotification>(
  'Notification',
  notificationSchema,
);
