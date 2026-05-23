import { z } from "zod";
import { UserRole } from "@modules/users/models/user.model";

// ============================================
// 1. REGISTER DTO
// ============================================
/**
 * Register Request DTO
 * Step 1: User provides email and selects role
 * OTP is sent to the provided email
 */
export const RegisterDtoSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address")
    .min(1, "Email is required")
    .transform((val) => val.toLowerCase().trim()),
  role: z.enum([UserRole.INFLUENCER, UserRole.BRAND], {
    error: () => ({ message: "Role must be either INFLUENCER or BRAND" }),
  }),
});

export type RegisterDto = z.infer<typeof RegisterDtoSchema>;

// ============================================
// 2. VERIFY OTP DTO
// ============================================
/**
 * Verify OTP Request DTO
 * Step 2: User enters OTP received via email
 * Validates the 6-digit code
 */
export const VerifyOtpDtoSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address")
    .transform((val) => val.toLowerCase().trim()),
  otp: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d+$/, "OTP must contain only numbers"),
});

export type VerifyOtpDto = z.infer<typeof VerifyOtpDtoSchema>;

// ============================================
// 3. CREATE PASSWORD DTO (MISSING - ADDED NOW)
// ============================================
/**
 * Create Password Request DTO
 * Step 3: After email verification, user creates password
 * Password must meet security requirements
 */
export const CreatePasswordDtoSchema = z
  .object({
    email: z
      .string()
      .email("Please provide a valid email address")
      .transform((val) => val.toLowerCase().trim()),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain at least one special character",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type CreatePasswordDto = z.infer<typeof CreatePasswordDtoSchema>;

// ============================================
// 4. LOGIN DTO (MISSING - ADDED NOW)
// ============================================
/**
 * Login Request DTO
 * Step 4: User provides credentials to get tokens
 * Returns access token and refresh token
 */
export const LoginDtoSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address")
    .transform((val) => val.toLowerCase().trim()),
  password: z.string().min(1, "Password is required"),
});

export type LoginDto = z.infer<typeof LoginDtoSchema>;

// ============================================
// 5. REFRESH TOKEN DTO
// ============================================
/**
 * Refresh Token Request DTO
 * Used to get new access token when old one expires
 */
export const RefreshTokenDtoSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type RefreshTokenDto = z.infer<typeof RefreshTokenDtoSchema>;

// ============================================
// 6. RESEND OTP DTO
// ============================================
/**
 * Resend OTP Request DTO
 * When user doesn't receive OTP or it expires
 */
export const ResendOtpDtoSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address")
    .transform((val) => val.toLowerCase().trim()),
});

export type ResendOtpDto = z.infer<typeof ResendOtpDtoSchema>;

// ============================================
// 7. FORGOT PASSWORD DTO (Bonus - for future feature)
// ============================================
/**
 * Forgot Password Request DTO
 * User requests password reset link
 */
export const ForgotPasswordDtoSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address")
    .transform((val) => val.toLowerCase().trim()),
});

export type ForgotPasswordDto = z.infer<typeof ForgotPasswordDtoSchema>;

// ============================================
// 8. RESET PASSWORD DTO (Bonus - for future feature)
// ============================================
/**
 * Reset Password Request DTO
 * User sets new password using reset token
 */
export const ResetPasswordDtoSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain at least one special character",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type ResetPasswordDto = z.infer<typeof ResetPasswordDtoSchema>;

// ============================================
// 9. RESPONSE DTOS
// ============================================
/**
 * User Response DTO (what we send to client)
 * Excludes sensitive data like password
 */
export interface UserResponseDto {
  id: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Auth Response DTO (login/refresh response)
 */
export interface AuthResponseDto {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      role: string;
      onboardingCompleted: boolean;
    };
    accessToken: string;
    refreshToken: string;
  };
}

/**
 * Message Response DTO (for simple responses)
 */
export interface MessageResponseDto {
  success: boolean;
  message: string;
}

// ============================================
// 10. TYPE GUARDS (for runtime type checking)
// ============================================
/**
 * Type guard to check if object is a valid AuthResponseDto
 */
export function isAuthResponse(obj: any): obj is AuthResponseDto {
  return (
    obj &&
    typeof obj.success === "boolean" &&
    obj.data &&
    typeof obj.data.accessToken === "string" &&
    typeof obj.data.refreshToken === "string"
  );
}

/**
 * Type guard to check if object is a valid error response
 */
export function isErrorResponse(
  obj: any,
): obj is { success: false; error: { code: string; message: string } } {
  return (
    obj &&
    obj.success === false &&
    obj.error &&
    typeof obj.error.code === "string" &&
    typeof obj.error.message === "string"
  );
}
