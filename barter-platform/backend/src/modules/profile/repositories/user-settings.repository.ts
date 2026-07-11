import { UserSettings, IUserSettings } from "../models/user-settings.model";

export class UserSettingsRepository {
  async create(data: Partial<IUserSettings>): Promise<IUserSettings> {
    const settings = new UserSettings(data);
    return settings.save();
  }

  async findByUserId(userId: string): Promise<IUserSettings | null> {
    return UserSettings.findOne({ userId });
  }

  async upsert(
    userId: string,
    data: Partial<IUserSettings>,
  ): Promise<IUserSettings | null> {
    return UserSettings.findOneAndUpdate(
      { userId },
      { $set: data },
      { upsert: true, returnDocument: "after", runValidators: true },
    );
  }
}
