import mongoose, { Document, Schema } from "mongoose";

export interface IUploadedMedia extends Document {
  userId: mongoose.Types.ObjectId;
  fileUrl: string;
  type: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
}

const uploadedMediaSchema = new Schema<IUploadedMedia>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: false,
      trim: true,
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

uploadedMediaSchema.index({ userId: 1, createdAt: -1 });

export const UploadedMedia = mongoose.model<IUploadedMedia>(
  "UploadedMedia",
  uploadedMediaSchema,
);
