import mongoose, { Schema, Document } from "mongoose";

export interface IInstagramMedia extends Document {
  userId: mongoose.Types.ObjectId;
  instagramMediaId: string;
  caption?: string;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  mediaUrl: string;
  permalink: string;
  thumbnailUrl?: string;
  timestamp: Date;
  syncedAt: Date;
}

const instagramMediaSchema = new Schema<IInstagramMedia>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    instagramMediaId: {
      type: String,
      required: true,
      unique: true, // Prevents duplicate posts for the same influencer
      index: true,
    },
    caption: {
      type: String,
      required: false,
    },
    mediaType: {
      type: String,
      enum: ["IMAGE", "VIDEO", "CAROUSEL_ALBUM"],
      required: true,
    },
    mediaUrl: {
      type: String,
      required: true,
    },
    permalink: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
      required: false,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    syncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index for querying a specific user's media ordered by posting date
instagramMediaSchema.index({ userId: 1, timestamp: -1 });

export const InstagramMedia = mongoose.model<IInstagramMedia>(
  "InstagramMedia",
  instagramMediaSchema
);
