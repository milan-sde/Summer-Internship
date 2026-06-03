import { Request, Response, NextFunction } from "express";
import { ZodObject, ZodError } from "zod";
import { ValidationError } from "@shared/errors/app-error";
import { asyncHandler } from "@shared/middlewares/async-handler";

// Validate request body data
export const validate = (schema: ZodObject) => {
  return asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Parse and check body parameters
        const validatedData = await schema.parseAsync(req.body);
        req.body = validatedData;
        next();
      } catch (error) {
        if (error instanceof ZodError) {
          // Format errors into a simple list
          const formattedErrors = error.issues.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          }));

          throw new ValidationError("Validation failed", formattedErrors);
        }
        throw error;
      }
    },
  );
};

// Validate request query parameters
export const validateQuery = (schema: ZodObject) => {
  return asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Parse and check URL query parameters
        const validatedQuery = await schema.parseAsync(req.query);
        req.query = validatedQuery as any;
        next();
      } catch (error) {
        if (error instanceof ZodError) {
          // Format errors into a simple list
          const formattedErrors = error.issues.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          }));

          throw new ValidationError("Query validation failed", formattedErrors);
        }
        throw error;
      }
    },
  );
};

// Convert Zod validation errors to a simpler format
export const formatZodError = (error: ZodError) => {
  return error.issues.map((err) => ({
    field: err.path.join("."),
    message: err.message,
    code: err.code,
  }));
};
