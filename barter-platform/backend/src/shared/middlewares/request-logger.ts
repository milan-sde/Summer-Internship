import { Request, Response, NextFunction } from "express";

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const startTime = Date.now();

  //logs when request completes
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const logMessage = `${req.method} ${req.path} ${res.statusCode} - ${duration}ms`;

    if (res.statusCode >= 400) {
      console.error(`${logMessage}`);
    } else {
      console.log(`${logMessage}`);
    }
  });

  next();
};
