import { Request, Response, NextFunction } from "express";
import { ZodObject, ZodError } from "zod";
import { ValidationError } from "@shared/errors/app-error";
import { asyncHandler } from "@shared/middlewares/async-handler";

/**
 * Validation middleware factory
 * Creates middleware that validates request body against a Zod schema
 *
 * Usage:
 * router.post('/register', validate(RegisterDtoSchema), controller.register);
 */
export const validate = (schema: ZodObject) => {
  return asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Parse and validate request body
        const validatedData = await schema.parseAsync(req.body);
        // Replace request body with validated (and potentially transformed) data
        req.body = validatedData;
        next();
      } catch (error) {
        if (error instanceof ZodError) {
          // Format Zod errors into a more readable format
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

/**
 * Validation error formatter
 * Converts Zod errors to user-friendly format
 */
export const formatZodError = (error: ZodError) => {
  return error.issues.map((err) => ({
    field: err.path.join("."),
    message: err.message,
    code: err.code,
  }));
};
