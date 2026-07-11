import { UserSettingsRepository } from "../repositories/user-settings.repository";

export class UserSettingsService {
  private userSettingsRepository: UserSettingsRepository;

  constructor() {
    this.userSettingsRepository = new UserSettingsRepository();
  }

  async createDefaults(userId: string): Promise<void> {
    await this.userSettingsRepository.create({ userId: userId as any });
  }

  async getSettings(userId: string) {
    return this.userSettingsRepository.findByUserId(userId);
  }

  async updateSettings(userId: string, data: Record<string, any>) {
    return this.userSettingsRepository.upsert(userId, data);
  }
}
