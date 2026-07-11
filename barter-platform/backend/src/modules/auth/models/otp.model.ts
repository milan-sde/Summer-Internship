import mongoose, { Document, Schema } from "mongoose";

export interface IOtp extends Document {
  email: string;
  otp: string;
  purpose: "email_verification" | "password_reset";
  attempts: number;
  verifiedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}

const otpSchema = new Schema<IOtp>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      required: true,
      enum: ["email_verification", "password_reset"],
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(doc, ret: any) {
        delete ret.otp;
        delete ret.__v;
        return ret;
      },
    },
  },
);

otpSchema.index({ email: 1, purpose: 1 });

export const Otp = mongoose.model<IOtp>("Otp", otpSchema);
