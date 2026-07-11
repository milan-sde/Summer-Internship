import mongoose, { Document, Schema } from "mongoose";

export interface IDeliverableMedia {
  mediaId: mongoose.Types.ObjectId;
  type: "hero" | "thumbnail" | "supporting" | "file";
  order: number;
}

export interface IDeliverable extends Document {
  collaborationId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  dueDate: Date | null;
  media: IDeliverableMedia[];
  status: "pending" | "submitted" | "changes_requested" | "approved" | "rejected";
  submittedAt: Date | null;
  approvedAt: Date | null;
  feedback: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const deliverableMediaSchema = new Schema<IDeliverableMedia>(
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
      min: 0,
    },
  },
  { _id: false },
);

const deliverableSchema = new Schema<IDeliverable>(
  {
    collaborationId: {
      type: Schema.Types.ObjectId,
      ref: "Collaboration",
      required: true,
    },
    title: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 200,
    },
    description: {
      type: String,
      default: "",
      maxlength: 1000,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    media: {
      type: [deliverableMediaSchema],
      default: [],
      validate: {
        validator: (v: IDeliverableMedia[]) => v.length <= 20,
        message: "Media cannot exceed 20 items",
      },
    },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "submitted", "changes_requested", "approved", "rejected"],
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    feedback: {
      type: String,
      default: null,
      maxlength: 2000,
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

deliverableSchema.index({ collaborationId: 1, status: 1 });
deliverableSchema.index({ status: 1, dueDate: 1 });

export const Deliverable = mongoose.model<IDeliverable>(
  "Deliverable",
  deliverableSchema,
);
