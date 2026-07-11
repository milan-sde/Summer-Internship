import mongoose, { Document, Schema } from "mongoose";

export interface IUserSettings extends Document {
  userId: mongoose.Types.ObjectId;
  language: string;
  timezone: string;
  theme: "light" | "dark" | "system";
  notifications: {
    email: {
      campaignUpdates: boolean;
      applicationUpdates: boolean;
      collaborationUpdates: boolean;
      marketing: boolean;
    };
    push: {
      enabled: boolean;
      campaignUpdates: boolean;
      collaborationUpdates: boolean;
      messages: boolean;
    };
    inApp: {
      campaignUpdates: boolean;
      applicationUpdates: boolean;
      collaborationUpdates: boolean;
      messages: boolean;
    };
  };
  privacy: {
    showProfile: boolean;
    showPortfolio: boolean;
    showContactEmail: boolean;
    showSocialLinks: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const defaultNotifications = {
  email: {
    campaignUpdates: true,
    applicationUpdates: true,
    collaborationUpdates: true,
    marketing: false,
  },
  push: {
    enabled: false,
    campaignUpdates: true,
    collaborationUpdates: true,
    messages: true,
  },
  inApp: {
    campaignUpdates: true,
    applicationUpdates: true,
    collaborationUpdates: true,
    messages: true,
  },
};

const defaultPrivacy = {
  showProfile: true,
  showPortfolio: true,
  showContactEmail: false,
  showSocialLinks: true,
};

const userSettingsSchema = new Schema<IUserSettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    language: {
      type: String,
      default: "en",
    },
    timezone: {
      type: String,
      default: "UTC",
    },
    theme: {
      type: String,
      default: "system",
      enum: ["light", "dark", "system"],
    },
    notifications: {
      type: Schema.Types.Mixed,
      default: defaultNotifications,
    },
    privacy: {
      type: Schema.Types.Mixed,
      default: defaultPrivacy,
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

export const UserSettings = mongoose.model<IUserSettings>(
  "UserSettings",
  userSettingsSchema,
);
