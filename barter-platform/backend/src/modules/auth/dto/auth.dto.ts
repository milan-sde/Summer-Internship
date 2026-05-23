import { UserRole } from "@modules/users/models/user.model";
import z from "zod";

// Register Request DTO
export const RegisterDtoSchema = z.object({
  email: z
    .string()
    .email("Please provide valid email address")
    .min(1, "Email is required")
    .transform((val) => val.toLowerCase().trim()),
  role: z.enum([UserRole.INFLUENCER, UserRole.BRAND], {
    error: () => ({ message: "Role must be either INFLUENCER or BRAND" }),
  }),
});
export type RegisterDto = z.infer<typeof RegisterDtoSchema>;

//verify otp request dto:
export const VerifyOtpDtoSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address")
    .transform((val) => val.toLowerCase().trim()),
  otp: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d+$/, "OTP must contain only numbers."),
});
export type VerifyOtpDto = z.infer<typeof VerifyOtpDtoSchema>;

//Auth response DTO (what we send backt to the client):

export interface AuthResponseDto {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      role: string;
      onBoardingCompleted: boolean;
    };
    accessToken: string;
    refreshToken: string;
  };
}

// Refresh Token Request DTO
export const RefreshTokenDtoSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type RefreshTokenDto = z.infer<typeof RefreshTokenDtoSchema>;

// Resend OTP Request DTO
export const ResendOtpDtoSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address")
    .transform((val) => val.toLowerCase().trim()),
});

export type ResendOtpDto = z.infer<typeof ResendOtpDtoSchema>;
