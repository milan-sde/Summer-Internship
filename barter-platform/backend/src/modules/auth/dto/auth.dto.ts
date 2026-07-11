import { z } from "zod";
import { UserRole } from "@modules/users/models/user.model";

// Register request schema (email and role)
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

// Verify OTP request schema (6-digit code)
export const VerifyOtpDtoSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address")
    .transform((val) => val.toLowerCase().trim()),
  otp: z
    .preprocess(
      (val) => (typeof val === "number" ? val.toString() : val),
      z
        .string()
        .length(6, "OTP must be exactly 6 digits")
        .regex(/^\d+$/, "OTP must contain only numbers")
    ),
});

export type VerifyOtpDto = z.infer<typeof VerifyOtpDtoSchema>;

// Create Password request schema (after OTP verification)
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

// Login request credentials schema
export const LoginDtoSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address")
    .transform((val) => val.toLowerCase().trim()),
  password: z.string().min(1, "Password is required"),
});

export type LoginDto = z.infer<typeof LoginDtoSchema>;

// Refresh token request schema
export const RefreshTokenDtoSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type RefreshTokenDto = z.infer<typeof RefreshTokenDtoSchema>;

// Resend OTP request schema
export const ResendOtpDtoSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address")
    .transform((val) => val.toLowerCase().trim()),
});

export type ResendOtpDto = z.infer<typeof ResendOtpDtoSchema>;

// Forgot password email request schema
export const ForgotPasswordDtoSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address")
    .transform((val) => val.toLowerCase().trim()),
});

export type ForgotPasswordDto = z.infer<typeof ForgotPasswordDtoSchema>;

// Reset password token and password schema
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

// Interfaces for responses
export interface UserResponseDto {
  id: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  onboardingCompleted: boolean;
  avatar?: string;
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
      avatar?: string;
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

// Check if object is a valid AuthResponseDto
export function isAuthResponse(obj: any): obj is AuthResponseDto {
  return (
    obj &&
    typeof obj.success === "boolean" &&
    obj.data &&
    typeof obj.data.accessToken === "string" &&
    typeof obj.data.refreshToken === "string"
  );
}

// Check if object is an error response
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
