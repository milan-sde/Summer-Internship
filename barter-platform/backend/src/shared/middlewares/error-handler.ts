import { AppError } from "@shared/errors/app-error";
import { NextFunction, Request, Response } from "express";

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Log error for debugging
  console.error("Error occurred: ", {
    name: error.name,
    message: error.message,
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // handle our custom AppErrors
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.errorCode,
        message: error.message,
        ...(error.details && { details: error.details }),
        ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
      },
    });
  }

  // handling mongoose duplicate key error:
  if (error.name === "MongoServerError" && (error as any).code === 11000) {
    const field = Object.keys((error as any).keyPattern)[0];
    return res.status(409).json({
      success: false,
      error: {
        code: "DUPLICATE_KEY",
        message: `${field} already exists`,
        ...(process.env.NODE_ENV === "development" && {
          details: error.message,
        }),
      },
    });
  }

  // handling mongoose validation error:
  if (error.name === "ValidationError") {
    const errors = Object.values((error as any).errors).map(
      (err: any) => err.message,
    );
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: errors,
        ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
      },
    });
  }

  //handle jwt error:
  if (error.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid authentication token",
      },
    });
  }

  //token expired error:
  if (error.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      error: {
        code: "TOKEN_EXPIRED",
        message: "Authentication token expired",
      },
    });
  }

  // default error for unexpected issues:
  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message:
        process.env.NODE_ENV === "production"
          ? "something went wrong"
          : error.message,
    },
  });
};
