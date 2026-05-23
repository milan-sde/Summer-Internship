import jwt from "jsonwebtoken";
import { UnauthorizedError } from "@shared/errors/app-error";

/**
 * Payload that goes inside our JWT tokens
 * This is the "claims" - information about the user
 */

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Extended payload for refresh tokens (includes version for rotation)
 */
export interface RefreshTokenPayload extends TokenPayload {
  version: number;
}

export class JwtService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: jwt.SignOptions["expiresIn"];
  private readonly refreshTokenExpiry: jwt.SignOptions["expiresIn"];

  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET!;
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET!;
    this.accessTokenExpiry = (process.env.ACCESS_TOKEN_EXPIRY ||
      "15m") as jwt.SignOptions["expiresIn"];
    this.refreshTokenExpiry = (process.env.REFRESH_TOKEN_EXPIRY ||
      "7d") as jwt.SignOptions["expiresIn"];

    //if secret doesn't exists:

    if (!this.accessTokenSecret || !this.refreshTokenSecret) {
      throw new Error(
        "JWT secrets not configured! Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in .env",
      );
    }
  }

  //generate access token: for authenticating the api requests
  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
      issuer: "barter-platform",
      audience: "barter-api",
    });
  }

  //generate refresh token:    * Version allows us to invalidate all tokens for a user
  generateRefreshToken(payload: TokenPayload, version: number) {
    return jwt.sign({ ...payload, version }, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
      issuer: "barter-platform",
      audience: "barter-api",
    });
  }

  //      * Verify Access Token : throws invalid or expired:
  verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: "barter-platform",
        audience: "barter-api",
      }) as TokenPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError("Access token expired");
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError("Invalid access token");
      }
      throw new UnauthorizedError("Authentication failed");
    }
  }

  //* Verify Refresh Token - Returns payload with version for rotation check
  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        issuer: "barter-platform",
        audience: "barter-api",
      }) as RefreshTokenPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError(
          "Refresh token expired, please login again",
        );
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError("Invalid refresh token");
      }
      throw new UnauthorizedError("Refresh token validation failed");
    }
  }

  decodeToken(token: string): TokenPayload | null {
    const decoded = jwt.decode(token);
    return decoded as TokenPayload | null;
  }
}
