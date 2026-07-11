import mongoose, { Schema, Document } from "mongoose";

export interface IPortfolioMedia extends Document {
  userId: mongoose.Types.ObjectId;
  title?: string;
  description?: string;
  mediaUrl: string;
  mediaPublicId?: string;
  mediaType: "image" | "video";
  mimeType: string;
  fileSize: number;
  createdAt: Date;
  updatedAt: Date;
}

const portfolioMediaSchema = new Schema<IPortfolioMedia>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      required: false,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      required: false,
      maxlength: 500,
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
      enum: ["image", "video"],
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
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

// Index for fetching an influencer's portfolio sorted by creation date
portfolioMediaSchema.index({ userId: 1, createdAt: -1 });

export const PortfolioMedia = mongoose.model<IPortfolioMedia>(
  "PortfolioMedia",
  portfolioMediaSchema
);
