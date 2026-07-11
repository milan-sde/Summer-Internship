import mongoose, { Document, Schema } from "mongoose";

export interface IPortfolioItem {
  section: "hero" | "gallery" | "video" | "featured";
  description: string;
  mediaId: mongoose.Types.ObjectId;
  order: number;
}

export interface IPortfolio extends Document {
  influencerId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  isPublic: boolean;
  items: IPortfolioItem[];
  createdAt: Date;
  updatedAt: Date;
}

const portfolioItemSchema = new Schema<IPortfolioItem>(
  {
    section: {
      type: String,
      default: "gallery",
      enum: ["hero", "gallery", "video", "featured"],
    },
    description: {
      type: String,
      default: "",
      maxlength: 300,
    },
    mediaId: {
      type: Schema.Types.ObjectId,
      ref: "Media",
      required: true,
    },
    order: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false },
);

const portfolioSchema = new Schema<IPortfolio>(
  {
    influencerId: {
      type: Schema.Types.ObjectId,
      ref: "InfluencerProfile",
      required: true,
      unique: true,
    },
    title: {
      type: String,
      default: "Portfolio",
      maxlength: 100,
    },
    description: {
      type: String,
      default: "",
      maxlength: 500,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    items: {
      type: [portfolioItemSchema],
      default: [],
      validate: {
        validator: (v: IPortfolioItem[]) => v.length <= 100,
        message: "Portfolio items cannot exceed 100",
      },
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

portfolioSchema.index({ isPublic: 1 });

export const Portfolio = mongoose.model<IPortfolio>(
  "Portfolio",
  portfolioSchema,
);
