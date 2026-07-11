import mongoose, { Document, Schema } from "mongoose";

export interface IApplication extends Document {
  campaignId: mongoose.Types.ObjectId;
  influencerId: mongoose.Types.ObjectId;
  proposal: string;
  status: "pending" | "shortlisted" | "approved" | "rejected" | "withdrawn";
  appliedAt: Date;
  reviewedAt: Date | null;
  reviewNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const applicationSchema = new Schema<IApplication>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },
    influencerId: {
      type: Schema.Types.ObjectId,
      ref: "InfluencerProfile",
      required: true,
    },
    proposal: {
      type: String,
      required: true,
      minlength: 50,
      maxlength: 2000,
    },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "shortlisted", "approved", "rejected", "withdrawn"],
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewNote: {
      type: String,
      default: null,
      maxlength: 1000,
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

applicationSchema.index({ campaignId: 1, influencerId: 1 }, { unique: true });
applicationSchema.index({ campaignId: 1, status: 1 });
applicationSchema.index({ influencerId: 1, status: 1 });

export const Application = mongoose.model<IApplication>(
  "Application",
  applicationSchema,
);
