import mongoose, { Schema, Document } from "mongoose";
import { UserRole } from "@modules/users/models/user.model";

// Profile document fields and type interface
export interface IProfile extends Document {
  userId: mongoose.Types.ObjectId;
  fullName: string;
  instagramHandle?: string;
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

  // Influencer-specific fields
  username?: string;
  phoneNumber?: string;
  categories?: string[];
  countries?: string[];
  platforms?: {
    instagram?: { username?: string; followers?: number };
    youtube?: { username?: string; followers?: number };
    twitter?: { username?: string; followers?: number };
  };
  instagram?: {
    instagramId: string;
    username: string;
    accessToken: string;
    tokenExpiresAt?: Date;
    followersCount: number;
    mediaCount?: number;
    profilePicture?: string;
    connectedAt: Date;
  };
  pastWorkLinks?: string[];
  isVerified?: boolean;

  // Brand-specific fields
  firstName?: string;
  lastName?: string;
  industries?: string[];
  budgetMin?: number;
  budgetMax?: number;

  createdAt: Date;
  updatedAt: Date;
}

const profileSchema = new Schema<IProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One profile per user
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    instagramHandle: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
      match: [/^@?[a-zA-Z0-9_.]{1,30}$/, "Invalid Instagram handle"],
      set: (value: string) => (value ? value.replace("@", "") : undefined),
    },
    bio: {
      type: String,
      required: true,
      maxlength: 500,
      default: "",
    },
    avatarUrl: {
      type: String,
      match: [/^((https?:\/\/|data:|\/static\/).+)?$/, "Invalid URL format"],
    },
    website: {
      type: String,
      match: [/^(https?:\/\/.+)?$/, "Invalid URL format"],
    },
    location: {
      type: String,
      maxlength: 100,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
    },
    stats: {
      followers: { type: Number, default: 0 },
      engagementRate: { type: Number, default: 0 },
      totalPosts: { type: Number, default: 0 },
    },
    socialLinks: {
      twitter: String,
      linkedin: String,
      tiktok: String,
    },
    preferences: {
      emailNotifications: { type: Boolean, default: true },
      collaborationAlerts: { type: Boolean, default: true },
    },

    // Influencer fields
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      match: [/^[a-zA-Z0-9_.]{1,30}$/, "Invalid username"],
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    categories: {
      type: [String],
      default: [],
    },
    countries: {
      type: [String],
      default: [],
    },
    platforms: {
      instagram: {
        username: String,
        followers: Number,
      },
      youtube: {
        username: String,
        followers: Number,
      },
      twitter: {
        username: String,
        followers: Number,
      },
    },
    instagram: {
      instagramId: { type: String, required: false },
      username: { type: String, required: false },
      accessToken: { type: String, required: false },
      tokenExpiresAt: { type: Date, required: false },
      followersCount: { type: Number, default: 0 },
      mediaCount: { type: Number, default: 0 },
      profilePicture: { type: String, required: false },
      connectedAt: { type: Date, default: Date.now },
    },
    pastWorkLinks: {
      type: [String],
      default: [],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },

    // Brand fields
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    industries: {
      type: [String],
      default: [],
    },
    budgetMin: {
      type: Number,
      default: 0,
    },
    budgetMax: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;

        if (ret.avatarUrl) {
          ret.avatarUrl = "http://localhost:3000" + ret.avatarUrl;
        }

        return ret;
      },
    },
  },
);

// Compound index for searching
profileSchema.index({ fullName: "text", username: "text", bio: "text" });

export const Profile = mongoose.model<IProfile>("Profile", profileSchema);
