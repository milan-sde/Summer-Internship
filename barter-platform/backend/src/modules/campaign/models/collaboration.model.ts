import mongoose, { Document, Schema } from "mongoose";

export interface ICollaboration extends Document {
  campaignId: mongoose.Types.ObjectId;
  applicationId: mongoose.Types.ObjectId;
  influencerId: mongoose.Types.ObjectId;
  brandId: mongoose.Types.ObjectId;
  status: "active" | "completed" | "cancelled" | "disputed";
  startDate: Date | null;
  endDate: Date | null;
  terms: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const collaborationSchema = new Schema<ICollaboration>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      unique: true,
    },
    influencerId: {
      type: Schema.Types.ObjectId,
      ref: "InfluencerProfile",
      required: true,
    },
    brandId: {
      type: Schema.Types.ObjectId,
      ref: "BrandProfile",
      required: true,
    },
    status: {
      type: String,
      default: "active",
      enum: ["active", "completed", "cancelled", "disputed"],
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    terms: {
      type: String,
      default: null,
      maxlength: 2000,
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

collaborationSchema.index({ campaignId: 1 });
collaborationSchema.index({ influencerId: 1, status: 1 });
collaborationSchema.index({ brandId: 1, status: 1 });

export const Collaboration = mongoose.model<ICollaboration>(
  "Collaboration",
  collaborationSchema,
);
