import mongoose, { Document, Schema } from "mongoose";

export interface IBrandProfile extends Document {
  userId: mongoose.Types.ObjectId;
  companyName: string;
  website: string | null;
  industry: string | null;
  companySize: string | null;
  description: string;
  logo: mongoose.Types.ObjectId | null;
  location: string | null;
  contactEmail: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const brandProfileSchema = new Schema<IBrandProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
    },
    website: {
      type: String,
      default: null,
      maxlength: 500,
    },
    industry: {
      type: String,
      default: null,
      enum: [
        "tech", "fashion", "beauty", "food-beverage", "travel-hospitality",
        "finance", "health-wellness", "education", "entertainment",
        "sports", "automotive", "real-estate", "e-commerce", "other",
      ],
    },
    companySize: {
      type: String,
      default: null,
      enum: ["1-10", "11-50", "51-200", "201+"],
    },
    description: {
      type: String,
      default: "",
      maxlength: 1000,
    },
    logo: {
      type: Schema.Types.ObjectId,
      ref: "Media",
      default: null,
    },
    location: {
      type: String,
      default: null,
      maxlength: 100,
    },
    contactEmail: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      default: null,
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

brandProfileSchema.index({ industry: 1 });
brandProfileSchema.index({ deletedAt: 1 }, { sparse: true });
brandProfileSchema.index(
  { companyName: "text", description: "text" },
);

export const BrandProfile = mongoose.model<IBrandProfile>(
  "BrandProfile",
  brandProfileSchema,
);
