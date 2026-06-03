// src/shared/middleware/async-handler.ts
import { Request, Response, NextFunction } from "express";

// Wrap async route handlers to catch errors automatically
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
