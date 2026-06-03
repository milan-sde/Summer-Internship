import mongoose, { Schema, Document } from 'mongoose';

export interface ICampaignApplicant {
  influencerId: mongoose.Types.ObjectId;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  appliedAt: Date;
}

export interface ICampaign extends Document {
  brandId: mongoose.Types.ObjectId;
  brandName: string;
  brandLogo?: string;
  title: string;
  description: string;
  platform: 'Instagram' | 'YouTube' | 'Twitter';
  category: 'Tech' | 'Fashion' | 'Food' | 'Beauty' | 'Other';
  budget: number;
  daysLeft: number;
  totalSlots: number;
  filledSlots: number;
  followersRequired: string;
  applicants: ICampaignApplicant[];
  status: 'ACTIVE' | 'PAST';
  createdAt: Date;
  updatedAt: Date;
}

const campaignSchema = new Schema<ICampaign>(
  {
    brandId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    brandName: {
      type: String,
      required: true,
      trim: true
    },
    brandLogo: {
      type: String,
      required: false
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    platform: {
      type: String,
      enum: ['Instagram', 'YouTube', 'Twitter'],
      required: true
    },
    category: {
      type: String,
      enum: ['Tech', 'Fashion', 'Food', 'Beauty', 'Other'],
      required: true,
      index: true
    },
    budget: {
      type: Number,
      required: true,
      min: 0
    },
    daysLeft: {
      type: Number,
      default: 35
    },
    totalSlots: {
      type: Number,
      default: 10,
      min: 1
    },
    filledSlots: {
      type: Number,
      default: 0,
      min: 0
    },
    followersRequired: {
      type: String,
      default: '1K+'
    },
    applicants: [
      {
        influencerId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        status: {
          type: String,
          enum: ['PENDING', 'APPROVED', 'REJECTED'],
          default: 'PENDING'
        },
        appliedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    status: {
      type: String,
      enum: ['ACTIVE', 'PAST'],
      default: 'ACTIVE',
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Search text index
campaignSchema.index({ title: 'text', description: 'text', brandName: 'text' });

export const Campaign = mongoose.model<ICampaign>('Campaign', campaignSchema);
