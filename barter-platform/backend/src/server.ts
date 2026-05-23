import "dotenv/config";
import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { requestLogger } from "@shared/middlewares/request-logger";
import { errorHandler } from "@shared/middlewares/error-handler";
import { connectDatabase } from "@shared/database/connection";
import authRoutes from "@modules/auth/routes/auth.routes";
import { authenticate, requireRole } from "@shared/middlewares/auth.middleware";

//load environment variables:
dotenv.config();

//create application (express):
const app: Application = express();
const PORT = process.env.PORT || 3000;

/**
 * MIDDLEWARE REGISTRATION
 * Order matters! Express executes in sequence:
 * 1. Security middleware (helmet, cors)
 * 2. Parsers (json, cookie)
 * 3. Logging
 * 4. Routes
 * 5. Error handling (last!)
 */

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:4200",
    credentials: true, // allow cookies
  }),
);

// body parser:
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

//cookie parser:
app.use(cookieParser());

//logging:
app.use(requestLogger);

//health checkpoint:
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timeStamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

app.use("/api/auth", authRoutes);
// Example protected route
app.get("/api/protected", authenticate, (req: Request, res: Response) => {
  res.json({
    message: "This is a protected route",
    user: req.user,
  });
});

// Example admin route
app.get(
  "/api/admin",
  authenticate,
  requireRole("ADMIN"),
  (req: Request, res: Response) => {
    res.json({
      message: "Welcome admin!",
      user: req.user,
    });
  },
);

//404 handler - routes not found:
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// Global error handler - MUST be last
app.use(errorHandler);

//start server:
const startServer = async () => {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on PORT : ${PORT}`);
      console.log(`Environment : ${process.env.NODE_ENV}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error("Failed to start error : ", error);
    process.exit(0);
  }
};

startServer();
