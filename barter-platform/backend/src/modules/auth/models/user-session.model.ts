import mongoose, { Document, Schema } from "mongoose";

export interface IUserSession extends Document {
  userId: mongoose.Types.ObjectId;
  refreshToken: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  lastActivity: Date;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
}

const userSessionSchema = new Schema<IUserSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    refreshToken: {
      type: String,
      required: true,
    },
    deviceInfo: {
      type: String,
      default: null,
      maxlength: 500,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(doc, ret: any) {
        delete ret.refreshToken;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSessionSchema.index({ userId: 1, isRevoked: 1 });

export const UserSession = mongoose.model<IUserSession>(
  "UserSession",
  userSessionSchema,
);
