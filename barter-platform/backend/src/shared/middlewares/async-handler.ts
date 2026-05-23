// src/shared/middleware/async-handler.ts
import { Request, Response, NextFunction } from "express";

/**
 * Wraps async route handlers to avoid try-catch repetition
 *
 * WITHOUT this wrapper:
 * app.get('/users', async (req, res) => {
 *   try {
 *     const users = await userService.getAll();
 *     res.json(users);
 *   } catch (error) {
 *     next(error);
 *   }
 * });
 *
 * WITH this wrapper:
 * app.get('/users', asyncHandler(async (req, res) => {
 *   const users = await userService.getAll();
 *   res.json(users);
 * }));
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
