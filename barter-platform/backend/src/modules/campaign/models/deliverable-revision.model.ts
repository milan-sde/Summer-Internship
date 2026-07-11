import mongoose, { Document, Schema } from "mongoose";

export interface IRevisionMedia {
  mediaId: mongoose.Types.ObjectId;
  type: "hero" | "thumbnail" | "supporting" | "file";
  order: number;
}

export interface IDeliverableRevision extends Document {
  deliverableId: mongoose.Types.ObjectId;
  version: number;
  media: IRevisionMedia[];
  note: string | null;
  status: "submitted" | "approved" | "changes_requested" | "rejected";
  feedback: string | null;
  reviewedBy: mongoose.Types.ObjectId | null;
  reviewedAt: Date | null;
  createdAt: Date;
}

const revisionMediaSchema = new Schema<IRevisionMedia>(
  {
    mediaId: {
      type: Schema.Types.ObjectId,
      ref: "Media",
      required: true,
    },
    type: {
      type: String,
      default: "supporting",
      enum: ["hero", "thumbnail", "supporting", "file"],
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: false },
);

const deliverableRevisionSchema = new Schema<IDeliverableRevision>(
  {
    deliverableId: {
      type: Schema.Types.ObjectId,
      ref: "Deliverable",
      required: true,
    },
    version: {
      type: Number,
      required: true,
      min: 1,
    },
    media: {
      type: [revisionMediaSchema],
      default: [],
    },
    note: {
      type: String,
      default: null,
      maxlength: 1000,
    },
    status: {
      type: String,
      required: true,
      enum: ["submitted", "approved", "changes_requested", "rejected"],
    },
    feedback: {
      type: String,
      default: null,
      maxlength: 2000,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(doc, ret: any) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

deliverableRevisionSchema.index(
  { deliverableId: 1, version: -1 },
  { unique: true },
);

export const DeliverableRevision = mongoose.model<IDeliverableRevision>(
  "DeliverableRevision",
  deliverableRevisionSchema,
);
