import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export enum UserRole {
  INFLUENCER = "INFLUENCER",
  BRAND = "BRAND",
  ADMIN = "ADMIN",
}

export interface IUser extends Document {
  email: string;
  password: string | null;
  role: UserRole;
  isEmailVerified: boolean;
  emailVerifiedAt: Date | null;
  onBoardingCompleted: boolean;
  lastLoginAt: Date;
  refreshTokenVersion: number;
  avatar?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  comparePassword(candidatePassword: string): Promise<boolean>;
  incrementRefreshTokenVersion(): Promise<void>;
  markOnBoardingComplete(): Promise<void>;
}

// userSchema
const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },

    password: {
      type: String,
      default: null,
      minlength: [8, "Password must be at least 8 characters"],
    },

    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
      default: UserRole.INFLUENCER,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerifiedAt: {
      type: Date,
      default: null,
    },

    onBoardingCompleted: {
      type: Boolean,
      default: false,
    },

    lastLoginAt: {
      type: Date,
      default: Date.now,
    },

    refreshTokenVersion: {
      type: Number,
      default: 0,
    },
    avatar: {
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
      transform(doc, ret: any, options) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  },
);

//hashpassword:
// Use async pre hook without next to satisfy TypeScript mongoose types
userSchema.pre("save", async function (this: IUser) {
  if (!this.isModified("password") || !this.password) {
    return;
  }

  // Prevent double-hashing if it's already a bcrypt hash
  const isHashed = /^\$2[ayb]\$[0-9]{2}\$[A-Za-z0-9./]{53}$/.test(this.password);
  if (isHashed) {
    return;
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error as Error;
  }
});

//compare password method:
userSchema.methods.comparePassword = async function (
  this: IUser,
  candidatePassword: string,
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

//increment refresh token version:
userSchema.methods.incrementRefreshTokenVersion = async function (
  this: IUser,
): Promise<void> {
  this.refreshTokenVersion += 1;
  await (this as any).save();
};

//mark on boarkding complete:
userSchema.methods.markOnBoardingComplete = async function (
  this: IUser,
): Promise<void> {
  this.onBoardingCompleted = true;
  await (this as any).save();
};

export const User = mongoose.model<IUser>("User", userSchema);
