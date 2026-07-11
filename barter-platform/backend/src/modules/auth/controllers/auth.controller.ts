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

export const register = asyncHandler(async (req: Request, res: Response) => {
  console.log("Registration request reached controller");
  await authService.register(req.body);

  console.log("Registration response returned");
  res.status(201).json({
    success: true,
    message: "OTP sent to your email. Please verify to continue.",
  });
});

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  await authService.verifyOtp(req.body);

  res.status(200).json({
    success: true,
    message: "Email verified successfully. You can now set your password.",
  });
});

export const createPassword = asyncHandler(
  async (req: Request, res: Response) => {
    await authService.createPassword(req.body);

    res.status(200).json({
      success: true,
      message: "Password created successfully. You can now login.",
    });
  },
);

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body, {
    ipAddress: req.ip || req.socket.remoteAddress || undefined,
    userAgent: req.headers["user-agent"] || undefined,
  });

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
      refreshToken: result.data.refreshToken,
    },
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  let refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (refreshToken === "undefined" || refreshToken === "null") {
    refreshToken = undefined;
  }

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
      refreshToken: result.data.refreshToken,
    },
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (userId) {
    await authService.logout(userId, {
      ipAddress: req.ip || req.socket.remoteAddress || undefined,
      userAgent: req.headers["user-agent"] || undefined,
    });
  }

  res.clearCookie("refreshToken");

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

export const resendOtp = asyncHandler(async (req: Request, res: Response) => {
  await authService.resendOtp(req.body.email);

  res.status(200).json({
    success: true,
    message: "OTP resent to your email",
  });
});

// Forgot password: Send password reset OTP
export const forgotPassword = asyncHandler(
  async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body.email);

    res.status(200).json({
      success: true,
      message:
        "If an account with that email exists, a password reset code has been sent.",
    });
  },
);

// Reset password: Verify OTP and set new password
export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    await authService.resetPassword(req.body);

    res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now login.",
    });
  },
);

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
        avatar: user.avatar || undefined,
        createdAt: user.createdAt,
      },
    },
  });
});
