import { Request, Response, NextFunction } from 'express';
import { ZodObject, ZodError } from 'zod';
import { ValidationError } from '@shared/errors/app-error';
import { asyncHandler } from '@shared/middlewares/async-handler';

// Validation middleware supporting body, query, or params validation
export const validate = (
  schema: ZodObject,
  source: 'body' | 'query' | 'params' = 'body'
) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = await schema.parseAsync(req[source]);
      req[source] = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        throw new ValidationError(
          `${source} validation failed`,
          formattedErrors
        );
      }
      throw error;
    }
  });
};