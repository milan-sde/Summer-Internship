import mongoose, { Document, Schema } from "mongoose";

export interface IContentSubmission extends Document {
  campaignId: mongoose.Types.ObjectId;
  influencerId: mongoose.Types.ObjectId;
  brandId: mongoose.Types.ObjectId;
  mediaUrl: string;
  mediaPublicId?: string;
  mediaType: "IMAGE" | "VIDEO";
  caption?: string;
  status:
    | "DRAFT"
    | "SUBMITTED"
    | "CHANGES_REQUESTED"
    | "APPROVED"
    | "PUBLISHING"
    | "PUBLISHED"
    | "FAILED";
  revisionNumber: number;
  brandFeedback?: string;
  instagramContainerId?: string;
  instagramMediaId?: string;
  instagramPermalink?: string;
  publishingError?: string;
  submittedAt?: Date;
  approvedAt?: Date;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const contentSubmissionSchema = new Schema<IContentSubmission>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },
    influencerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    brandId: {
      type: Schema.Types.ObjectId,
      ref: "Profile", // Campaign's brandId refers to Profile
      required: true,
      index: true,
    },
    mediaUrl: {
      type: String,
      required: true,
    },
    mediaPublicId: {
      type: String,
      required: false,
    },
    mediaType: {
      type: String,
      enum: ["IMAGE", "VIDEO"],
      required: true,
    },
    caption: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: [
        "DRAFT",
        "SUBMITTED",
        "CHANGES_REQUESTED",
        "APPROVED",
        "PUBLISHING",
        "PUBLISHED",
        "FAILED",
      ],
      default: "DRAFT",
      required: true,
      index: true,
    },
    revisionNumber: {
      type: Number,
      default: 1,
      required: true,
    },
    brandFeedback: {
      type: String,
      required: false,
    },
    instagramContainerId: {
      type: String,
      required: false,
    },
    instagramMediaId: {
      type: String,
      required: false,
    },
    instagramPermalink: {
      type: String,
      required: false,
    },
    publishingError: {
      type: String,
      required: false,
    },
    submittedAt: {
      type: Date,
      required: false,
    },
    approvedAt: {
      type: Date,
      required: false,
    },
    publishedAt: {
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
  }
);

// Support multiple deliverables per influencer per campaign
contentSubmissionSchema.index({ campaignId: 1, influencerId: 1 }, { unique: false });

export const ContentSubmission = mongoose.model<IContentSubmission>(
  "ContentSubmission",
  contentSubmissionSchema
);
