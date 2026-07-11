import { UserSession, IUserSession } from "../models/user-session.model";

export class UserSessionRepository {
  async create(data: Partial<IUserSession>): Promise<IUserSession> {
    const session = new UserSession(data);
    return session.save();
  }

  async findByTokenHash(tokenHash: string): Promise<IUserSession | null> {
    return UserSession.findOne({
      refreshToken: tokenHash,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });
  }

  async findActiveByUserId(userId: string): Promise<IUserSession | null> {
    return UserSession.findOne({
      userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });
  }

  async revoke(id: string): Promise<void> {
    await UserSession.findByIdAndUpdate(id, { isRevoked: true });
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await UserSession.updateMany(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
  }

  async cleanupExpired(): Promise<void> {
    await UserSession.deleteMany({ expiresAt: { $lt: new Date() } });
  }
}
