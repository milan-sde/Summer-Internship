import { Profile, IProfile } from "../models/profile.model";
import { NotFoundError } from "@shared/errors/app-error";
import mongoose from "mongoose";

export interface CreateProfileDto {
  userId: mongoose.Types.ObjectId;
  fullName: string;
  instagramHandle?: string;
  bio: string;
  role: string;
  avatarUrl?: string;
  website?: string;
  location?: string;

  // Influencer-specific fields
  username?: string;
  phoneNumber?: string;
  categories?: string[];
  countries?: string[];
  platforms?: {
    instagram?: { username?: string; followers?: number };
    youtube?: { username?: string; followers?: number };
    twitter?: { username?: string; followers?: number };
  };
  pastWorkLinks?: string[];
  isVerified?: boolean;

  // Brand-specific fields
  firstName?: string;
  lastName?: string;
  industries?: string[];
  budgetMin?: number;
  budgetMax?: number;
}

export interface UpdateProfileDto {
  fullName?: string;
  instagramHandle?: string;
  bio?: string;
  avatarUrl?: string;
  website?: string;
  location?: string;
  stats?: Partial<IProfile["stats"]>;
  socialLinks?: Partial<IProfile["socialLinks"]>;
  preferences?: Partial<IProfile["preferences"]>;

  // Influencer-specific fields
  username?: string;
  phoneNumber?: string;
  categories?: string[];
  countries?: string[];
  platforms?: {
    instagram?: { username?: string; followers?: number };
    youtube?: { username?: string; followers?: number };
    twitter?: { username?: string; followers?: number };
  };
  pastWorkLinks?: string[];
  isVerified?: boolean;

  // Brand-specific fields
  firstName?: string;
  lastName?: string;
  industries?: string[];
  budgetMin?: number;
  budgetMax?: number;
}

export class ProfileRepository {
  /**
   * Create a new profile
   */
  async create(data: CreateProfileDto): Promise<IProfile> {
    const profile = new Profile(data);
    return profile.save();
  }

  /**
   * Find profile by user ID
   */
  async findByUserId(userId: string): Promise<IProfile | null> {
    return Profile.findOne({ userId: new mongoose.Types.ObjectId(userId) });
  }

  /**
   * Find profile by Instagram handle
   */
  async findByInstagramHandle(handle: string): Promise<IProfile | null> {
    if (!handle) return null;
    return Profile.findOne({ instagramHandle: handle.toLowerCase() });
  }

  /**
   * Find profile by Fluencr username
   */
  async findByUsername(username: string): Promise<IProfile | null> {
    if (!username) return null;
    return Profile.findOne({ username: username.toLowerCase() });
  }

  /**
   * Update profile by user ID
   */
  async updateByUserId(
    userId: string,
    data: UpdateProfileDto,
  ): Promise<IProfile> {
    const profile = await Profile.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      { $set: data },
      { new: true, runValidators: true },
    );

    if (!profile) {
      throw new NotFoundError("Profile", userId);
    }

    return profile;
  }

  /**
   * Check if profile exists for user
   */
  async exists(userId: string): Promise<boolean> {
    const count = await Profile.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
    });
    return count > 0;
  }

  /**
   * Search profiles (for brand discovery)
   */
  async searchProfiles(
    query: string,
    role?: string,
    limit: number = 20,
    skip: number = 0,
  ): Promise<{ profiles: IProfile[]; total: number }> {
    const filter: any = {};

    if (query) {
      filter.$text = { $search: query };
    }

    if (role) {
      filter.role = role;
    }

    const [profiles, total] = await Promise.all([
      Profile.find(filter).sort({ createdAt: -1 }).limit(limit).skip(skip),
      Profile.countDocuments(filter),
    ]);

    return { profiles, total };
  }

  /**
   * Get profile with user details (aggregation)
   */
  async getProfileWithUser(userId: string): Promise<any> {
    const result = await Profile.aggregate([
      {
        $match: { userId: new mongoose.Types.ObjectId(userId) },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          fullName: 1,
          instagramHandle: 1,
          bio: 1,
          avatarUrl: 1,
          stats: 1,
          "user.email": 1,
          "user.role": 1,
          "user.createdAt": 1,
        },
      },
    ]);

    return result[0] || null;
  }

  /**
   * Delete profile (when user is deleted)
   */
  async deleteByUserId(userId: string): Promise<boolean> {
    const result = await Profile.deleteOne({
      userId: new mongoose.Types.ObjectId(userId),
    });
    return result.deletedCount > 0;
  }

  /**
   * Update profile stats (for influencer metrics)
   */
  async updateStats(
    userId: string,
    stats: Partial<IProfile["stats"]>,
  ): Promise<IProfile> {
    const profile = await Profile.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      { $set: { stats } },
      { new: true },
    );

    if (!profile) {
      throw new NotFoundError("Profile", userId);
    }

    return profile;
  }
}
