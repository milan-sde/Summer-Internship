// src/modules/auth/services/auth.service.ts
import { UserRepository } from "@modules/users/repositories/user.repository";
import { JwtService } from "./jwt.service";
import { OtpService } from "./otp.service";
import { EmailService } from "./email.service";
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

  constructor() {
    this.userRepository = new UserRepository();
    this.jwtService = new JwtService();
    this.otpService = new OtpService();
    this.emailService = new EmailService();
  }

  // Register a new user and send verification OTP
  async register(data: RegisterDto): Promise<void> {
    const { email, role } = data;

    // Check if user exists and is verified
    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser && existingUser.isEmailVerified) {
      throw new ConflictError("User with this email already exists");
    }

    // If user exists but not verified, reuse the record
    if (existingUser && !existingUser.isEmailVerified) {
      console.log(`User ${email} exists but not verified, resending OTP`);
      await this.sendOtp(email);
      return;
    }

    // Create new unverified user
    await this.userRepository.create({
      email,
      role,
      isEmailVerified: false,
    });

    // Send OTP
    await this.sendOtp(email);
  }

  // Helper: Generate and send OTP email
  private async sendOtp(email: string): Promise<void> {
    const otp = this.otpService.generateAndStoreOtp(email);
    try {
      await this.emailService.sendOtpEmail(email, otp);
    } catch (error) {
      this.otpService.deleteOtp(email);
      throw new ValidationError("Unable to send verification email. Please try again.");
    }
  }

  // Verify email using the OTP code
  async verifyOtp(data: VerifyOtpDto): Promise<void> {
    const { email, otp } = data;

    // Verify OTP
    const isValid = this.otpService.verifyOtp(email, otp);
    if (!isValid) {
      throw new ValidationError("Invalid OTP");
    }

    // Get user
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new ValidationError("User not found. Please register first.");
    }

    // Check if already verified
    if (user.isEmailVerified) {
      throw new ConflictError("Email already verified");
    }

    // Mark as verified
    await this.userRepository.update(user._id.toString(), {
      isEmailVerified: true,
    });

    console.log(`✅ Email verified for ${email}`);
  }

  // Set password after email verification
  async createPassword(data: CreatePasswordDto): Promise<void> {
    const { email, password } = data;

    // Find user
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new ValidationError("User not found");
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      throw new ValidationError("Please verify your email first");
    }

    // Check if password already set
    if (user.password) {
      throw new ConflictError("Password already set. Please login.");
    }

    // Set password
    await this.userRepository.update(user._id.toString(), { password });

    // Send confirmation
    await this.emailService.sendPasswordSetConfirmation(email);

    console.log(`🔐 Password set for ${email}`);
  }

  // Authenticate user credentials and generate tokens
  async login(data: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = data;

    // Find user
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new ValidationError("Invalid credentials");
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      throw new ValidationError("Please verify your email first");
    }

    // Check if password exists
    if (!user.password) {
      throw new ValidationError("Please set your password first");
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new ValidationError("Invalid credentials");
    }

    // Update last login
    await this.userRepository.updateLastLogin(user._id.toString());

    // Generate tokens
    const tokens = await this.generateTokens(user);

    console.log(`🔓 User logged in: ${email}`);

    return {
      success: true,
      data: {
        user: {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
          onboardingCompleted: user.onBoardingCompleted,
        },
        ...tokens,
      },
    };
  }

  // Create access and refresh JWTs
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

  // Invalidate old refresh token and rotate new ones
  async refreshTokens(refreshToken: string): Promise<AuthResponseDto> {
    // Verify refresh token
    const payload = this.jwtService.verifyRefreshToken(refreshToken);

    // Get user
    const user = await this.userRepository.findById(payload.userId);
    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    // Check if token version matches
    if (payload.version !== user.refreshTokenVersion) {
      // Token reuse detected! Someone might have stolen the token
      console.warn(`⚠️ Token reuse detected for user ${user.email}`);
      // Invalidate all tokens for this user
      await user.incrementRefreshTokenVersion();
      throw new UnauthorizedError("Token reuse detected. Please login again.");
    }

    // Increment version (invalidate old refresh token)
    await user.incrementRefreshTokenVersion();

    // Generate new tokens
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

    console.log(`🔄 Tokens refreshed for ${user.email}`);

    return {
      success: true,
      data: {
        user: {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
          onboardingCompleted: user.onBoardingCompleted,
        },
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    };
  }

  // Invalidate refresh token for the user
  async logout(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (user) {
      await user.incrementRefreshTokenVersion();
      console.log(`🚪 User logged out: ${user.email}`);
    }
  }

  // Re-generate and send verification OTP
  async resendOtp(email: string): Promise<void> {
    // Check if user exists
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new ValidationError("User not found");
    }

    if (user.isEmailVerified) {
      throw new ConflictError("Email already verified");
    }

    // Resend OTP
    const otp = this.otpService.resendOtp(email);
    try {
      await this.emailService.sendOtpEmail(email, otp);
    } catch (error) {
      this.otpService.deleteOtp(email);
      throw new ValidationError("Unable to send verification email. Please try again.");
    }

    console.log(`📧 OTP resent to ${email}`);
  }

  // Find user by ID
  async getUserById(userId: string): Promise<IUser | null> {
    return this.userRepository.findById(userId);
  }
}
