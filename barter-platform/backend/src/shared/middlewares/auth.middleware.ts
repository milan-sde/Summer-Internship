import { Request, Response, NextFunction } from "express";
import { JwtService } from "@modules/auth/services/jwt.service";
import { UnauthorizedError } from "@shared/errors/app-error";
import { asyncHandler } from "./async-handler";

const jwtService = new JwtService();

// Verify JWT token from Authorization header
export const authenticate = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("No token provided. Please login.");
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = jwtService.verifyAccessToken(token);

    // Attach user to request for downstream handlers
    req.user = {
      userId: payload.userId,
    };

    next();
  },
);

// Check if user role is allowed
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError("Not authenticated");
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("No token provided. Please login.");
    }

    const token = authHeader.substring(7);
    const payload = jwtService.verifyAccessToken(token);

    if (!allowedRoles.includes(payload.role)) {
      throw new UnauthorizedError(
        `Access denied. Required role: ${allowedRoles.join(" or ")}`,
      );
    }

    next();
  };
};

export { requireOnboarding } from "./onboarding.guard";

// Attach user if JWT is valid, but do not block if it is missing
export const optionalAuth = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7);
        const payload = jwtService.verifyAccessToken(token);
        req.user = {
          userId: payload.userId,
        };
      } catch (error) {
        // Invalid token - just proceed without user
        console.log("Optional auth: Invalid token provided");
      }
    }

    next();
  },
);
