import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '@modules/users/models/user.model';

/**
 * Profile Interface
 * Extends Document for Mongoose compatibility
 */
export interface IProfile extends Document {
  userId: mongoose.Types.ObjectId;
  fullName: string;
  instagramHandle: string;
  bio: string;
  avatarUrl?: string;
  website?: string;
  location?: string;
  role: UserRole; // Denormalized for quick access
  stats: {
    followers?: number;
    engagementRate?: number;
    totalPosts?: number;
  };
  socialLinks: {
    twitter?: string;
    linkedin?: string;
    tiktok?: string;
  };
  preferences: {
    emailNotifications: boolean;
    collaborationAlerts: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const profileSchema = new Schema<IProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One profile per user
      index: true
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100
    },
    instagramHandle: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^@?[a-zA-Z0-9_.]{1,30}$/, 'Invalid Instagram handle'],
      set: (value: string) => value.replace('@', '') // Remove @ if provided
    },
    bio: {
      type: String,
      required: true,
      maxlength: 500,
      default: ''
    },
    avatarUrl: {
      type: String,
      match: [/^https?:\/\/.+/, 'Invalid URL format']
    },
    website: {
      type: String,
      match: [/^https?:\/\/.+/, 'Invalid URL format']
    },
    location: {
      type: String,
      maxlength: 100
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true
    },
    stats: {
      followers: { type: Number, default: 0 },
      engagementRate: { type: Number, default: 0 },
      totalPosts: { type: Number, default: 0 }
    },
    socialLinks: {
      twitter: String,
      linkedin: String,
      tiktok: String
    },
    preferences: {
      emailNotifications: { type: Boolean, default: true },
      collaborationAlerts: { type: Boolean, default: true }
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret:any) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Compound index for searching
profileSchema.index({ fullName: 'text', instagramHandle: 'text', bio: 'text' });

export const Profile = mongoose.model<IProfile>('Profile', profileSchema);