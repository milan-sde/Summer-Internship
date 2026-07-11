import mongoose, { Document, Schema } from "mongoose";

export interface IMedia extends Document {
  url: string;
  publicId: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  altText: string;
  uploadedBy: mongoose.Types.ObjectId;
  source: "user_upload" | "instagram_fetch" | "system";
  tags: string[];
  createdAt: Date;
  deletedAt: Date | null;
}

const mediaSchema = new Schema<IMedia>(
  {
    url: {
      type: String,
      required: true,
      maxlength: 500,
    },
    publicId: {
      type: String,
      required: true,
      maxlength: 200,
      unique: true,
      index: true,
    },
    mimeType: {
      type: String,
      required: true,
      enum: [
        "image/jpeg", "image/png", "image/webp", "image/gif",
        "video/mp4", "video/quicktime", "application/pdf",
      ],
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    width: {
      type: Number,
      default: 0,
      min: 0,
    },
    height: {
      type: Number,
      default: 0,
      min: 0,
    },
    altText: {
      type: String,
      default: "",
      maxlength: 200,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    source: {
      type: String,
      required: true,
      enum: ["user_upload", "instagram_fetch", "system"],
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (v: string[]) => v.length <= 10,
        message: "Tags cannot exceed 10 items",
      },
    },
    deletedAt: {
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

mediaSchema.index({ uploadedBy: 1 });
mediaSchema.index({ source: 1 });
mediaSchema.index({ mimeType: 1 });
mediaSchema.index({ tags: 1 });
mediaSchema.index({ deletedAt: 1 }, { sparse: true });

export const Media = mongoose.model<IMedia>("Media", mediaSchema);
