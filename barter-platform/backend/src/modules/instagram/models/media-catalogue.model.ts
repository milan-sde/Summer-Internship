import mongoose, { Document, Schema } from "mongoose";
import {
  InstagramMediaSource,
  InstagramMediaType,
} from "../interfaces/instagram.interfaces";

export interface IMediaCatalogue extends Document {
  userId: mongoose.Types.ObjectId;
  mediaId: string;
  mediaType: InstagramMediaType;
  mediaUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  permalink?: string;
  selectedForPortfolio: boolean;
  source: InstagramMediaSource;
  createdAt: Date;
  updatedAt: Date;
}

const mediaCatalogueSchema = new Schema<IMediaCatalogue>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    mediaId: {
      type: String,
      required: true,
      index: true,
    },
    mediaType: {
      type: String,
      enum: ["IMAGE", "VIDEO", "CAROUSEL_ALBUM"],
      required: true,
    },
    mediaUrl: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
      required: false,
    },
    caption: {
      type: String,
      required: false,
    },
    permalink: {
      type: String,
      required: false,
    },
    selectedForPortfolio: {
      type: Boolean,
      default: false,
    },
    source: {
      type: String,
      enum: ["instagram", "upload"],
      default: "instagram",
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

mediaCatalogueSchema.index({ userId: 1, mediaId: 1 }, { unique: true });
mediaCatalogueSchema.index({ userId: 1, createdAt: -1 });

export const MediaCatalogue = mongoose.model<IMediaCatalogue>(
  "MediaCatalogue",
  mediaCatalogueSchema,
);
