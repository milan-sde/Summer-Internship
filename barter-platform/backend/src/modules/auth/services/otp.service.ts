import { ValidationError } from "@shared/errors/app-error";
import crypto from "crypto";
import { OtpRepository } from "../repositories/otp.repository";

export class OtpService {
  private otpRepository: OtpRepository;
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 3;
  private readonly COOLDOWN_SECONDS = 60;

  constructor() {
    this.otpRepository = new OtpRepository();
  }

  private hashOtp(code: string): string {
    return crypto.createHash("sha256").update(code).digest("hex");
  }

  private generateOtp(): string {
    return crypto.randomInt(100000, 1000000).toString().padStart(this.OTP_LENGTH, "0");
  }

  async generateAndStoreOtp(
    email: string,
    purpose: "email_verification" | "password_reset" = "email_verification",
  ): Promise<string> {
    const normalizedEmail = email.toLowerCase();

    // Enforce cooldown
    const existing = await this.otpRepository.findValid(normalizedEmail, purpose);
    if (existing) {
      const elapsedMs = new Date().getTime() - existing.createdAt.getTime();
      const cooldownMs = this.COOLDOWN_SECONDS * 1000;
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

    // Delete any existing OTPs for this email + purpose before creating new one
    await this.otpRepository.deleteForEmail(normalizedEmail, purpose);

    await this.otpRepository.create({
      email: normalizedEmail,
      otp: hashedCode,
      purpose,
      attempts: 0,
      verifiedAt: null,
      expiresAt,
    });

    console.log("OTP record saved to database");
    return code;
  }

  async verifyOtp(
    email: string,
    otpCode: string,
    purpose: "email_verification" | "password_reset" = "email_verification",
  ): Promise<boolean> {
    const normalizedEmail = email.toLowerCase();

    if (process.env.NODE_ENV === "development") {
      console.log(`[OTP Debug] Verifying OTP for: ${normalizedEmail} (purpose: ${purpose})`);
    }

    if (process.env.NODE_ENV === "development" && otpCode === "123456") {
      console.log(`[OTP Debug] Development Mode: Bypassing verification using master code 123456`);
      await this.otpRepository.deleteForEmail(normalizedEmail, purpose);
      return true;
    }

    const storedData = await this.otpRepository.findValid(normalizedEmail, purpose);

    if (!storedData) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[OTP Debug] OTP not found or expired for: ${normalizedEmail}`);
      }
      throw new ValidationError(
        "OTP not found or expired. Please request a new one.",
      );
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`[OTP Debug] Stored hashed code in DB: "${storedData.otp}" (attempts: ${storedData.attempts}/${this.MAX_ATTEMPTS})`);
    }

    if (storedData.attempts >= this.MAX_ATTEMPTS) {
      await this.otpRepository.deleteForEmail(normalizedEmail, purpose);
      throw new ValidationError(
        "Too many failed attempts. Please request a new OTP.",
      );
    }

    if (storedData.expiresAt < new Date()) {
      await this.otpRepository.deleteForEmail(normalizedEmail, purpose);
      throw new ValidationError("OTP expired. Please request a new one.");
    }

    const hashedSubmitted = this.hashOtp(otpCode);
    if (storedData.otp !== hashedSubmitted) {
      await this.otpRepository.incrementAttempts(storedData._id.toString());
      const remaining = this.MAX_ATTEMPTS - storedData.attempts - 1;
      throw new ValidationError(
        `Invalid OTP. ${remaining} attempts remaining.`,
      );
    }

    await this.otpRepository.markVerified(storedData._id.toString());

    if (process.env.NODE_ENV === "development") {
      console.log(`[OTP Debug] Verification successful for: ${normalizedEmail}`);
    }
    return true;
  }

  async hasValidOtp(
    email: string,
    purpose: "email_verification" | "password_reset" = "email_verification",
  ): Promise<boolean> {
    const storedData = await this.otpRepository.findValid(email.toLowerCase(), purpose);
    if (!storedData) return false;
    if (storedData.expiresAt < new Date()) return false;
    if (storedData.attempts >= this.MAX_ATTEMPTS) return false;
    return true;
  }

  async resendOtp(
    email: string,
    purpose: "email_verification" | "password_reset" = "email_verification",
  ): Promise<string> {
    return this.generateAndStoreOtp(email, purpose);
  }

  async deleteOtp(
    email: string,
    purpose: "email_verification" | "password_reset" = "email_verification",
  ): Promise<void> {
    await this.otpRepository.deleteForEmail(email.toLowerCase(), purpose);
  }
}
