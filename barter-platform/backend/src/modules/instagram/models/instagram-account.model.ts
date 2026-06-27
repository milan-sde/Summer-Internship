import mongoose, { Document, Schema } from "mongoose";

export interface IInstagramAccount extends Document {
  userId: mongoose.Types.ObjectId;
  instagramId: string;
  username: string;
  followersCount: number;
  mediaCount: number;
  profilePicture?: string;
  accessToken: string;
  connectedAt: Date;
  tokenExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const instagramAccountSchema = new Schema<IInstagramAccount>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    instagramId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    followersCount: {
      type: Number,
      default: 0,
    },
    mediaCount: {
      type: Number,
      default: 0,
    },
    profilePicture: {
      type: String,
      required: false,
    },
    accessToken: {
      type: String,
      required: true,
    },
    connectedAt: {
      type: Date,
      default: Date.now,
    },
    tokenExpiresAt: {
      type: Date,
      required: false,
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

export const InstagramAccount = mongoose.model<IInstagramAccount>(
  "InstagramAccount",
  instagramAccountSchema,
);
