/**
 * Base error class for all application errors
 * Every error we throw extends this
 */
export abstract class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errorCode: string;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number,
    errorCode: string,
    details?: any,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true; // Expected errors vs programming bugs
    this.details = details;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 - Validation Error
 * Use when request data is invalid
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

/**
 * 401 - Unauthorized
 * Use when user is not authenticated
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized access") {
    super(message, 401, "UNAUTHORIZED");
  }
}

/**
 * 403 - Forbidden
 * Use when authenticated user lacks permission
 */
export class ForbiddenError extends AppError {
  constructor(message: string = "Insufficient permissions") {
    super(message, 403, "FORBIDDEN");
  }
}

/**
 * 404 - Not Found
 * Use when resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} with id ${id} not found`
      : `${resource} not found`;
    super(message, 404, "NOT_FOUND");
  }
}

/**
 * 409 - Conflict
 * Use when resource already exists
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

/**
 * 429 - Too Many Requests
 * Use with rate limiting
 */
export class TooManyRequestsError extends AppError {
  constructor(message: string = "Too many requests, please try again later") {
    super(message, 429, "TOO_MANY_REQUESTS");
  }
}
