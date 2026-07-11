import "dotenv/config";
import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import { requestLogger } from "@shared/middlewares/request-logger";
import { errorHandler } from "@shared/middlewares/error-handler";
import { connectDatabase } from "@shared/database/connection";
import { authenticate, requireRole } from "@shared/middlewares/auth.middleware";
import authRoutes from "@modules/auth/routes/auth.routes";
import profileRoutes from "@modules/profile/routes/profile.routes";
import campaignRoutes from "@modules/campaign/routes/campaign.routes";
import portfolioRoutes from "@modules/portfolio/routes/portfolio.routes";
import instagramRoutes from "@modules/instagram/routes/instagram.routes";
import influencerRoutes from "@modules/profile/routes/influencer.routes";
import aiRoutes from "@modules/ai/routes/ai.routes";
import { requireOnboarding } from "@shared/middlewares/onboarding.guard";
import notificationRoutes from "@modules/notification/routes/notification.routes";
import analyticsRoutes from "@modules/analytics/routes/analytics.routes";

//load environment variables:
dotenv.config();

//create application (express):
const app: Application = express();
const PORT = process.env.PORT || 3000;

// Register middleware in order: security, parsers, logs, routes, then error handling

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:8100",
    credentials: true, // allow cookies
  }),
);

// body parser:
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// serve static files from the static uploads directory
app.use("/static", express.static(path.join(__dirname, "..", "static")));

//cookie parser:
app.use(cookieParser());

//logging:
app.use(requestLogger);

//health checkpoint:
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timeStamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

//Auth routes:
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

//profile routes:
app.use("/api/profile", profileRoutes);

//campaign routes:
app.use("/api/campaigns", campaignRoutes);

//portfolio routes:
app.use("/api/portfolio", portfolioRoutes);

//instagram routes:
app.use("/api/instagram", instagramRoutes);

//influencer profile routes:
app.use("/api/influencers", influencerRoutes);

// AI routes:
app.use("/api/ai", aiRoutes);

// Notification routes:
app.use("/api/notifications", notificationRoutes);

// Analytics routes:
app.use("/api/analytics", analyticsRoutes);

app.get(
  "/api/dashboard",
  authenticate,
  requireOnboarding,
  (req: Request, res: Response) => {
    res.json({
      success: true,
      message: "Welcome to dashboard",
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
