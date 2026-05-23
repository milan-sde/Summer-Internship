import { IRepository } from "@shared/database/repository.interface";
import { IUser, User, UserRole } from "../models/user.model";
import { NotFoundError } from "@shared/errors/app-error";
import bcrypt from "bcryptjs";

export interface CreateUserDto {
  email: string;
  role: UserRole;
}

export interface UpdateUserDto {
  email?: string;
  password?: string;
  isEmailVerified?: boolean;
  onboardingCompleted?: boolean;
  lastLoginAt?: Date;
}

export class UserRepository implements IRepository<IUser> {
  async create(data: Partial<IUser>): Promise<IUser> {
    const user = new User(data);
    return user.save();
  }

  async findById(id: string): Promise<IUser | null> {
    return User.findById(id);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase() });
  }

  async findOne(filter: Partial<IUser>): Promise<IUser | null> {
    return User.findOne(filter);
  }

  async findMany(filter: Partial<IUser> = {}): Promise<IUser[]> {
    return User.find(filter);
  }

  async update(id: string, data: Partial<IUser>): Promise<IUser | null> {
    const updatedData: any = { ...data };

    // If password is being set/updated, hash it before updating
    if (data.password) {
      const isHashed = /^\$2[ayb]\$[0-9]{2}\$[A-Za-z0-9./]{53}$/.test(
        data.password,
      );
      if (!isHashed) {
        const salt = await bcrypt.genSalt(12);
        updatedData.password = await bcrypt.hash(data.password as string, salt);
      }
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: updatedData },
      { new: true, runValidators: true },
    );

    if (!user) {
      throw new NotFoundError("User", id);
    }

    return user;
  }

  async delete(id: string): Promise<boolean> {
    const result = await User.findByIdAndDelete(id);
    return !!result;
  }

  async updateLastLogin(id: string): Promise<void> {
    await User.findByIdAndUpdate(id, { lastLoginAt: new Date() });
  }

  async completeOnboarding(id: string): Promise<IUser> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundError("User", id);
    }

    await user.markOnBoardingComplete();
    return user;
  }

  async exists(email: string): Promise<boolean> {
    const count = await User.countDocuments({ email: email.toLowerCase() });
    return count > 0;
  }

  async countByRole(role: UserRole): Promise<number> {
    return User.countDocuments({ role });
  }
}
