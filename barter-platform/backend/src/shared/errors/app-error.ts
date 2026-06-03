// Base class for all application errors
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

// 400 - Validation Error (invalid request data)
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

// 401 - Unauthorized (user not authenticated)
export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized access") {
    super(message, 401, "UNAUTHORIZED");
  }
}

// 403 - Forbidden (user lacks permission)
export class ForbiddenError extends AppError {
  constructor(message: string = "Insufficient permissions") {
    super(message, 403, "FORBIDDEN");
  }
}

// 404 - Not Found (resource does not exist)
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} with id ${id} not found`
      : `${resource} not found`;
    super(message, 404, "NOT_FOUND");
  }
}

// 409 - Conflict (resource already exists)
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

// 429 - Too Many Requests (rate limiting)
export class TooManyRequestsError extends AppError {
  constructor(message: string = "Too many requests, please try again later") {
    super(message, 429, "TOO_MANY_REQUESTS");
  }
}
