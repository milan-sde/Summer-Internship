import { Request, Response, NextFunction } from "express";
import { JwtService } from "@modules/auth/services/jwt.service";
import { UnauthorizedError } from "@shared/errors/app-error";
import { asyncHandler } from "./async-handler";

const jwtService = new JwtService();

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 *
 * Usage: app.get('/protected', authenticate, (req, res) => {...})
 */
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

/**
 * Role-Based Access Control (RBAC) Middleware
 * Checks if authenticated user has required role
 *
 * Usage: app.get('/admin-only', authenticate, requireRole('ADMIN'), handler)
 */
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

/**
 * Onboarding Guard
 * Checks if user has completed onboarding
 *
 * Usage: app.get('/dashboard', authenticate, requireOnboarding, handler)
 */
export const requireOnboarding = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // This requires fetching user from database
    // We'll implement this in the profile module
    // For now, it's a placeholder
    next();
  },
);

/**
 * Optional Authentication
 * Doesn't throw if no token, but attaches user if token is valid
 *
 * Usage: app.get('/public-but-with-user', optionalAuth, handler)
 */
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
