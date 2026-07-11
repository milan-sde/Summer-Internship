import { UserRepository } from "@modules/users/repositories/user.repository";
import { JwtService } from "./jwt.service";
import { OtpService } from "./otp.service";
import { EmailService } from "./email.service";
import { UserSessionService } from "./user-session.service";
import { ActivityLogService } from "./activity-log.service";
import { UserSettingsService } from "@modules/profile/services/user-settings.service";
import { User, IUser, UserRole } from "@modules/users/models/user.model";
import {
  ValidationError,
  UnauthorizedError,
  ConflictError,
} from "@shared/errors/app-error";
import type {
  RegisterDto,
  VerifyOtpDto,
  CreatePasswordDto,
  LoginDto,
  AuthResponseDto,
} from "../dto/auth.dto";

export class AuthService {
  private userRepository: UserRepository;
  private jwtService: JwtService;
  private otpService: OtpService;
  private emailService: EmailService;
  private userSessionService: UserSessionService;
  private activityLogService: ActivityLogService;
  private userSettingsService: UserSettingsService;

  constructor() {
    this.userRepository = new UserRepository();
    this.jwtService = new JwtService();
    this.otpService = new OtpService();
    this.emailService = new EmailService();
    this.userSessionService = new UserSessionService();
    this.activityLogService = new ActivityLogService();
    this.userSettingsService = new UserSettingsService();
  }

  async register(data: RegisterDto): Promise<void> {
    const { email, role } = data;

    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser && existingUser.isEmailVerified) {
      throw new ConflictError("User with this email already exists");
    }

    if (existingUser && !existingUser.isEmailVerified) {
      console.log(`User ${email} exists but not verified, resending OTP`);
      await this.sendOtp(email);
      return;
    }

    const user = await this.userRepository.create({
      email,
      role,
      isEmailVerified: false,
    });

    // Create default user settings
    await this.userSettingsService.createDefaults(user._id.toString());

    await this.sendOtp(email);
  }

  private async sendOtp(email: string): Promise<void> {
    const otp = await this.otpService.generateAndStoreOtp(email, "email_verification");
    try {
      console.log("Calling email service");
      await this.emailService.sendOtpEmail(email, otp);
    } catch (error) {
      await this.otpService.deleteOtp(email, "email_verification");
      throw new ValidationError("Unable to send verification email. Please try again.");
    }
  }

  async verifyOtp(data: VerifyOtpDto): Promise<void> {
    const { email, otp } = data;

    await this.otpService.verifyOtp(email, otp, "email_verification");

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new ValidationError("User not found. Please register first.");
    }

    if (user.isEmailVerified) {
      throw new ConflictError("Email already verified");
    }

    await this.userRepository.update(user._id.toString(), {
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    });

    // Log activity
    await this.activityLogService.log({
      actorId: user._id.toString(),
      action: "verify",
      entity: "User",
      entityId: user._id.toString(),
      metadata: { email },
    });

    console.log(`Email verified for ${email}`);
  }

  async createPassword(data: CreatePasswordDto): Promise<void> {
    const { email, password } = data;

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new ValidationError("User not found");
    }

    if (!user.isEmailVerified) {
      throw new ValidationError("Please verify your email first");
    }

    if (user.password) {
      throw new ConflictError("Password already set. Please login.");
    }

    await this.userRepository.update(user._id.toString(), { password });

    await this.emailService.sendPasswordSetConfirmation(email);

    // Log activity
    await this.activityLogService.log({
      actorId: user._id.toString(),
      action: "password_change",
      entity: "User",
      entityId: user._id.toString(),
      metadata: { email },
    });

    console.log(`Password set for ${email}`);
  }

  async login(
    data: LoginDto,
    options?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthResponseDto> {
    const { email, password } = data;

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new ValidationError("Invalid credentials");
    }

    if (!user.isEmailVerified) {
      throw new ValidationError("Please verify your email first");
    }

    if (!user.password) {
      throw new ValidationError("Please set your password first");
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new ValidationError("Invalid credentials");
    }

    await this.userRepository.updateLastLogin(user._id.toString());

    // Generate tokens (do NOT increment refreshTokenVersion for new sessions)
    const tokens = await this.generateTokens(user);

    // Create UserSession for refresh token rotation
    await this.userSessionService.createSession(
      user._id.toString(),
      tokens.refreshToken,
      options?.userAgent || null,
      options?.ipAddress || null,
    );

    // Log activity
    await this.activityLogService.log({
      actorId: user._id.toString(),
      action: "login",
      entity: "User",
      entityId: user._id.toString(),
      ipAddress: options?.ipAddress || null,
      userAgent: options?.userAgent || null,
    });

    console.log(`User logged in: ${email}`);

    return {
      success: true,
      data: {
        user: {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
          onboardingCompleted: user.onBoardingCompleted,
          avatar: user.avatar || undefined,
        },
        ...tokens,
      },
    };
  }

  private async generateTokens(user: IUser): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.generateAccessToken(payload);
    const refreshToken = this.jwtService.generateRefreshToken(
      payload,
      user.refreshTokenVersion,
    );

    return { accessToken, refreshToken };
  }

  async refreshTokens(
    refreshToken: string,
  ): Promise<AuthResponseDto> {
    // Try UserSession-based rotation first (new mechanism)
    const session = await this.userSessionService.validateSession(refreshToken);

    if (session) {
      const user = await this.userRepository.findById(session.userId);
      if (!user) {
        throw new UnauthorizedError("User not found");
      }

      // Revoke old session (rotation)
      await this.userSessionService.revokeSession(session.sessionId);

      // Generate new tokens with same version
      const payload = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      };

      const newAccessToken = this.jwtService.generateAccessToken(payload);
      const newRefreshToken = this.jwtService.generateRefreshToken(
        payload,
        user.refreshTokenVersion,
      );

      // Create new session
      // Note: we don't have deviceInfo/IP here since it comes from the token, not request
      await this.userSessionService.createSession(
        user._id.toString(),
        newRefreshToken,
      );

      console.log(`Tokens refreshed for ${user.email} (session rotation)`);

      return {
        success: true,
        data: {
          user: {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            onboardingCompleted: user.onBoardingCompleted,
            avatar: user.avatar || undefined,
          },
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      };
    }

    // Fallback to refreshTokenVersion mechanism (backward compat)
    const payload = this.jwtService.verifyRefreshToken(refreshToken);

    const user = await this.userRepository.findById(payload.userId);
    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    if (payload.version !== user.refreshTokenVersion) {
      console.warn(`Token reuse detected for user ${user.email}`);
      await user.incrementRefreshTokenVersion();
      throw new UnauthorizedError("Token reuse detected. Please login again.");
    }

    await user.incrementRefreshTokenVersion();

    const newPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const newAccessToken = this.jwtService.generateAccessToken(newPayload);
    const newRefreshToken = this.jwtService.generateRefreshToken(
      newPayload,
      user.refreshTokenVersion,
    );

    console.log(`Tokens refreshed for ${user.email} (legacy rotation)`);

    return {
      success: true,
      data: {
        user: {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
          onboardingCompleted: user.onBoardingCompleted,
          avatar: user.avatar || undefined,
        },
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    };
  }

  async logout(
    userId: string,
    options?: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    // Revoke all sessions (new mechanism)
    await this.userSessionService.revokeAllSessions(userId);

    // Also increment version (backward compat)
    const user = await this.userRepository.findById(userId);
    if (user) {
      await user.incrementRefreshTokenVersion();

      // Log activity
      await this.activityLogService.log({
        actorId: userId,
        action: "logout",
        entity: "User",
        entityId: userId,
        ipAddress: options?.ipAddress || null,
        userAgent: options?.userAgent || null,
      });

      console.log(`User logged out: ${user.email}`);
    }
  }

  async resendOtp(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new ValidationError("User not found");
    }

    if (user.isEmailVerified) {
      throw new ConflictError("Email already verified");
    }

    const otp = await this.otpService.resendOtp(email, "email_verification");
    try {
      await this.emailService.sendOtpEmail(email, otp);
    } catch (error) {
      await this.otpService.deleteOtp(email, "email_verification");
      throw new ValidationError("Unable to send verification email. Please try again.");
    }

    console.log(`OTP resent to ${email}`);
  }

  async forgotPassword(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();

    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user) {
      // Don't reveal whether email exists
      console.log(`Password reset requested for non-existent email: ${normalizedEmail}`);
      return;
    }

    if (!user.isEmailVerified) {
      throw new ValidationError("Please verify your email first before resetting password.");
    }

    const otp = await this.otpService.generateAndStoreOtp(normalizedEmail, "password_reset");
    try {
      await this.emailService.sendPasswordResetEmail(normalizedEmail, otp);
    } catch (error) {
      await this.otpService.deleteOtp(normalizedEmail, "password_reset");
      throw new ValidationError("Unable to send password reset email. Please try again.");
    }

    console.log(`Password reset OTP sent to ${normalizedEmail}`);
  }

  async resetPassword(data: {
    email: string;
    otp: string;
    password: string;
  }): Promise<void> {
    const { email, otp, password } = data;
    const normalizedEmail = email.toLowerCase();

    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user) {
      throw new ValidationError("User not found");
    }

    // Verify OTP with password_reset purpose
    await this.otpService.verifyOtp(normalizedEmail, otp, "password_reset");

    // Update password
    await this.userRepository.update(user._id.toString(), { password });

    // Revoke all sessions since password changed
    await this.userSessionService.revokeAllSessions(user._id.toString());

    // Log activity
    await this.activityLogService.log({
      actorId: user._id.toString(),
      action: "password_change",
      entity: "User",
      entityId: user._id.toString(),
      metadata: { reason: "password_reset" },
    });

    console.log(`Password reset completed for ${normalizedEmail}`);
  }

  async getUserById(userId: string): Promise<IUser | null> {
    return this.userRepository.findById(userId);
  }
}
