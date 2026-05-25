import { ValidationError } from "@shared/errors/app-error";

interface OtpData {
  code: string;
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
}

/**
 * OTP Service - Handles one-time password generation and verification
 *
 * PRODUCTION NOTE: This uses in-memory Map. For production:
 * 1. Use Redis with TTL (expiration)
 * 2. Store in database with cleanup job
 * 3. Rate limit by email to prevent abuse
 */
export class OtpService {
  private otpStore: Map<string, OtpData>;
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 3;

  constructor() {
    this.otpStore = new Map();

    // Clean up expired OTPs every hour
    setInterval(() => this.cleanupExpiredOtps(), 60 * 60 * 1000);
  }

  /**
   * Generate a 6-digit OTP
   */
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate and store OTP for an email
   */
  generateAndStoreOtp(email: string): string {
    const code = this.generateOtp();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);

    this.otpStore.set(email.toLowerCase(), {
      code,
      expiresAt,
      attempts: 0,
      createdAt: new Date(),
    });

    return code;
  }

  /**
   * Verify OTP for an email
   * Tracks attempts to prevent brute force
   */
  verifyOtp(email: string, otpCode: string): boolean {
    const normalizedEmail = email.toLowerCase();
    
    console.log(`[OTP Debug] Verifying OTP for: ${normalizedEmail}`);
    console.log(`[OTP Debug] Received code: "${otpCode}" (type: ${typeof otpCode})`);

    // In development, allow '123456' as a universal master bypass code
    if (process.env.NODE_ENV === "development" && otpCode === "123456") {
      console.log(`[OTP Debug] Development Mode: Bypassing verification using master code 123456`);
      this.otpStore.delete(normalizedEmail);
      return true;
    }

    const storedData = this.otpStore.get(normalizedEmail);

    if (!storedData) {
      console.warn(`[OTP Debug] OTP not found or expired in store for: ${normalizedEmail}`);
      throw new ValidationError(
        "OTP not found or expired. Please request a new one.",
      );
    }

    console.log(`[OTP Debug] Stored code in memory: "${storedData.code}" (attempts: ${storedData.attempts}/${this.MAX_ATTEMPTS})`);

    // Check attempts
    if (storedData.attempts >= this.MAX_ATTEMPTS) {
      this.otpStore.delete(normalizedEmail);
      throw new ValidationError(
        "Too many failed attempts. Please request a new OTP.",
      );
    }

    // Check expiration
    if (storedData.expiresAt < new Date()) {
      this.otpStore.delete(normalizedEmail);
      throw new ValidationError("OTP expired. Please request a new one.");
    }

    // Verify code
    if (storedData.code !== otpCode) {
      storedData.attempts++;
      this.otpStore.set(normalizedEmail, storedData);
      throw new ValidationError(
        `Invalid OTP. ${this.MAX_ATTEMPTS - storedData.attempts} attempts remaining.`,
      );
    }

    // Success - delete OTP so it can't be reused
    this.otpStore.delete(normalizedEmail);
    console.log(`[OTP Debug] Verification successful for: ${normalizedEmail}`);
    return true;
  }

  /**
   * Check if OTP exists and is valid (without consuming it)
   * Useful for resend functionality
   */
  hasValidOtp(email: string): boolean {
    const normalizedEmail = email.toLowerCase();
    const storedData = this.otpStore.get(normalizedEmail);

    if (!storedData) return false;
    if (storedData.expiresAt < new Date()) return false;
    if (storedData.attempts >= this.MAX_ATTEMPTS) return false;

    return true;
  }

  /**
   * Resend OTP - generates new code, invalidates old one
   */
  resendOtp(email: string): string {
    const normalizedEmail = email.toLowerCase();

    // Remove existing OTP
    this.otpStore.delete(normalizedEmail);

    // Generate new one
    return this.generateAndStoreOtp(email);
  }

  /**
   * Clean up expired OTPs to prevent memory leaks
   */
  private cleanupExpiredOtps(): void {
    const now = new Date();
    for (const [email, data] of this.otpStore.entries()) {
      if (data.expiresAt < now) {
        this.otpStore.delete(email);
      }
    }
    console.log(
      `🧹 Cleaned up expired OTPs. Current store size: ${this.otpStore.size}`,
    );
  }

  /**
   * Get OTP store size (for monitoring)
   */
  getStoreSize(): number {
    return this.otpStore.size;
  }
}
