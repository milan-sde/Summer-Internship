import { ValidationError } from "@shared/errors/app-error";
import crypto from "crypto";

interface OtpData {
  code: string; // Stored as a SHA-256 hash
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
}

// OTP Service handles one-time password generation and verification in memory
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

  // Helper to hash OTP code using SHA-256
  private hashOtp(code: string): string {
    return crypto.createHash("sha256").update(code).digest("hex");
  }

  // Generate a cryptographically secure 6-digit OTP code
  private generateOtp(): string {
    return crypto.randomInt(100000, 1000000).toString().padStart(this.OTP_LENGTH, "0");
  }

  // Save generated OTP code in memory map (with 60 seconds cooldown)
  generateAndStoreOtp(email: string): string {
    const normalizedEmail = email.toLowerCase();
    
    // Enforce 60 seconds cooldown between OTP requests
    const storedData = this.otpStore.get(normalizedEmail);
    if (storedData) {
      const elapsedMs = new Date().getTime() - storedData.createdAt.getTime();
      const cooldownMs = 60 * 1000;
      if (elapsedMs < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
        throw new ValidationError(
          `Please wait ${remainingSeconds} seconds before requesting a new OTP.`,
        );
      }
    }

    const code = this.generateOtp();
    const hashedCode = this.hashOtp(code);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);

    this.otpStore.set(normalizedEmail, {
      code: hashedCode,
      expiresAt,
      attempts: 0,
      createdAt: new Date(),
    });

    console.log("OTP record prepared");
    return code;
  }

  // Verify OTP code and check attempts/expiry
  verifyOtp(email: string, otpCode: string): boolean {
    const normalizedEmail = email.toLowerCase();
    
    if (process.env.NODE_ENV === "development") {
      console.log(`[OTP Debug] Verifying OTP for: ${normalizedEmail}`);
    }

    // In development, allow '123456' as a universal master bypass code
    if (process.env.NODE_ENV === "development" && otpCode === "123456") {
      console.log(`[OTP Debug] Development Mode: Bypassing verification using master code 123456`);
      this.otpStore.delete(normalizedEmail);
      return true;
    }

    const storedData = this.otpStore.get(normalizedEmail);

    if (!storedData) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[OTP Debug] OTP not found or expired in store for: ${normalizedEmail}`);
      }
      throw new ValidationError(
        "OTP not found or expired. Please request a new one.",
      );
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`[OTP Debug] Stored hashed code in memory: "${storedData.code}" (attempts: ${storedData.attempts}/${this.MAX_ATTEMPTS})`);
    }

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

    // Hash submitted OTP and verify
    const hashedSubmitted = this.hashOtp(otpCode);
    if (storedData.code !== hashedSubmitted) {
      storedData.attempts++;
      this.otpStore.set(normalizedEmail, storedData);
      throw new ValidationError(
        `Invalid OTP. ${this.MAX_ATTEMPTS - storedData.attempts} attempts remaining.`,
      );
    }

    // Success - delete OTP so it can't be reused
    this.otpStore.delete(normalizedEmail);
    
    if (process.env.NODE_ENV === "development") {
      console.log(`[OTP Debug] Verification successful for: ${normalizedEmail}`);
    }
    return true;
  }

  // Check if a valid OTP code exists in storage
  hasValidOtp(email: string): boolean {
    const normalizedEmail = email.toLowerCase();
    const storedData = this.otpStore.get(normalizedEmail);

    if (!storedData) return false;
    if (storedData.expiresAt < new Date()) return false;
    if (storedData.attempts >= this.MAX_ATTEMPTS) return false;

    return true;
  }

  // Resend OTP code after cooldown verification (handled inside generateAndStoreOtp)
  resendOtp(email: string): string {
    return this.generateAndStoreOtp(email);
  }

  // Manually delete OTP (e.g. if sending email fails)
  deleteOtp(email: string): void {
    this.otpStore.delete(email.toLowerCase());
  }

  // Delete expired OTP codes from memory
  private cleanupExpiredOtps(): void {
    const now = new Date();
    for (const [email, data] of this.otpStore.entries()) {
      if (data.expiresAt < now) {
        this.otpStore.delete(email);
      }
    }
    if (process.env.NODE_ENV === "development") {
      console.log(
        `Detailed log: 🧹 Cleaned up expired OTPs. Current store size: ${this.otpStore.size}`,
      );
    }
  }

  // Count how many OTPs are currently saved
  getStoreSize(): number {
    return this.otpStore.size;
  }
}
