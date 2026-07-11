import mongoose, { Document, Schema } from "mongoose";

export interface ICampaignMedia extends Document {
  campaignId: mongoose.Types.ObjectId;
  mediaId: mongoose.Types.ObjectId;
  type: "cover" | "gallery";
  createdAt: Date;
}

const campaignMediaSchema = new Schema<ICampaignMedia>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },
    mediaId: {
      type: Schema.Types.ObjectId,
      ref: "Media",
      required: true,
    },
    type: {
      type: String,
      default: "gallery",
      enum: ["cover", "gallery"],
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

campaignMediaSchema.index(
  { campaignId: 1, mediaId: 1 },
  { unique: true },
);
campaignMediaSchema.index({ mediaId: 1 });

export const CampaignMedia = mongoose.model<ICampaignMedia>(
  "CampaignMedia",
  campaignMediaSchema,
);
