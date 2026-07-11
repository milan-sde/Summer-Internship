import mongoose, { Document, Schema } from "mongoose";

export interface IInfluencerProfile extends Document {
  userId: mongoose.Types.ObjectId;
  displayName: string;
  bio: string;
  avatar: mongoose.Types.ObjectId | null;
  location: string | null;
  category: string | null;
  skills: string[];
  experienceLevel: string | null;
  socialLinks: { platform: string; url: string }[];
  contactEmail: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const influencerProfileSchema = new Schema<IInfluencerProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    bio: {
      type: String,
      default: "",
      maxlength: 500,
    },
    avatar: {
      type: Schema.Types.ObjectId,
      ref: "Media",
      default: null,
    },
    location: {
      type: String,
      default: null,
      maxlength: 100,
    },
    category: {
      type: String,
      default: null,
      enum: [
        "fashion", "beauty", "tech", "travel", "food",
        "fitness", "lifestyle", "finance", "music", "gaming",
        "education", "photography", "art", "sports", "other",
      ],
    },
    skills: {
      type: [String],
      default: [],
      validate: {
        validator: (v: string[]) => v.length <= 10,
        message: "Skills cannot exceed 10 items",
      },
    },
    experienceLevel: {
      type: String,
      default: null,
      enum: ["beginner", "intermediate", "advanced", "pro"],
    },
    socialLinks: {
      type: [
        {
          platform: {
            type: String,
            required: true,
            enum: ["instagram", "youtube", "tiktok", "twitter", "linkedin", "website"],
          },
          url: { type: String, required: true },
        },
      ],
      default: [],
      validate: {
        validator: (v: any[]) => v.length <= 5,
        message: "Social links cannot exceed 5 items",
      },
    },
    contactEmail: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret: any) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

influencerProfileSchema.index({ category: 1 });
influencerProfileSchema.index({ experienceLevel: 1 });
influencerProfileSchema.index({ deletedAt: 1 }, { sparse: true });
influencerProfileSchema.index(
  { displayName: "text", bio: "text" },
);

export const InfluencerProfile = mongoose.model<IInfluencerProfile>(
  "InfluencerProfile",
  influencerProfileSchema,
);
