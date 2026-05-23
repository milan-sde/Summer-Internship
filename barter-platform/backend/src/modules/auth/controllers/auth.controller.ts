import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { asyncHandler } from "@shared/middlewares/async-handler";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
      };
    }
  }
}

const authService = new AuthService();

/**
 * Register - Step 1: Send OTP
 * POST /api/auth/register
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  await authService.register(req.body);

  res.status(201).json({
    success: true,
    message: "OTP sent to your email. Please verify to continue.",
  });
});

/**
 * Verify OTP - Step 2: Confirm email
 * POST /api/auth/verify-otp
 */
export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  await authService.verifyOtp(req.body);

  res.status(200).json({
    success: true,
    message: "Email verified successfully. You can now set your password.",
  });
});

/**
 * Create Password - Step 3: Set password after verification
 * POST /api/auth/create-password
 */
export const createPassword = asyncHandler(
  async (req: Request, res: Response) => {
    await authService.createPassword(req.body);

    res.status(200).json({
      success: true,
      message: "Password created successfully. You can now login.",
    });
  },
);

/**
 * Login - Step 4: Authenticate and get tokens
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);

  // Set refresh token as HTTP-only cookie (more secure)
  res.cookie("refreshToken", result.data.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(200).json({
    success: true,
    data: {
      user: result.data.user,
      accessToken: result.data.accessToken,
    },
  });
});

/**
 * Refresh Token - Get new access token
 * POST /api/auth/refresh
 */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  // Get refresh token from cookie or body
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      error: {
        code: "MISSING_TOKEN",
        message: "Refresh token required",
      },
    });
  }

  const result = await authService.refreshTokens(refreshToken);

  // Set new refresh token cookie
  res.cookie("refreshToken", result.data.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({
    success: true,
    data: {
      user: result.data.user,
      accessToken: result.data.accessToken,
    },
  });
});

/**
 * Logout - Invalidate refresh token
 * POST /api/auth/logout
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (userId) {
    await authService.logout(userId);
  }

  // Clear refresh token cookie
  res.clearCookie("refreshToken");

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

/**
 * Resend OTP
 * POST /api/auth/resend-otp
 */
export const resendOtp = asyncHandler(async (req: Request, res: Response) => {
  await authService.resendOtp(req.body.email);

  res.status(200).json({
    success: true,
    message: "OTP resent to your email",
  });
});

/**
 * Get current user
 * GET /api/auth/me
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getUserById(req.user!.userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        code: "USER_NOT_FOUND",
        message: "User not found",
      },
    });
  }

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        onboardingCompleted: user.onBoardingCompleted,
        createdAt: user.createdAt,
      },
    },
  });
});
