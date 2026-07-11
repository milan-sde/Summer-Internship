import crypto from "crypto";
import { UserSessionRepository } from "../repositories/user-session.repository";

export class UserSessionService {
  private sessionRepository: UserSessionRepository;
  private readonly SESSION_EXPIRY_DAYS = 7;

  constructor() {
    this.sessionRepository = new UserSessionRepository();
  }

  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  async createSession(
    userId: string,
    refreshToken: string,
    deviceInfo?: string | null,
    ipAddress?: string | null,
  ): Promise<string> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.SESSION_EXPIRY_DAYS);

    const hashedToken = this.hashToken(refreshToken);

    const session = await this.sessionRepository.create({
      userId: userId as any,
      refreshToken: hashedToken,
      deviceInfo: deviceInfo || null,
      ipAddress: ipAddress || null,
      expiresAt,
      isRevoked: false,
    });

    return session._id.toString();
  }

  async validateSession(refreshToken: string): Promise<{ userId: string; sessionId: string } | null> {
    const hashedToken = this.hashToken(refreshToken);
    const sessions = await this.sessionRepository.findByTokenHash(hashedToken);

    if (!sessions) return null;
    if (sessions.isRevoked) return null;
    if (sessions.expiresAt < new Date()) return null;

    return { userId: sessions.userId.toString(), sessionId: sessions._id.toString() };
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.sessionRepository.revoke(sessionId);
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.sessionRepository.revokeAllByUserId(userId);
  }
}
