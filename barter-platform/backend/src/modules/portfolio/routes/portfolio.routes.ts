import { Router } from "express";
import { authenticate, requireRole } from "@shared/middlewares/auth.middleware";
import { createUploader } from "@shared/middlewares/multer";
import {
  uploadPortfolioMedia,
  getMyPortfolio,
  getPortfolioByInfluencerId,
  deletePortfolioItem,
} from "../controllers/portfolio.controller";

const router = Router();

// Configure the uploader for portfolio:
// - Destination: src/static/portfolio
// - Filename prefix: portfolio
// - Max size: 50MB (to comfortably support short video clips)
// - Allowed types: images and videos
const portfolioUploader = createUploader(
  "portfolio",
  "portfolio",
  50 * 1024 * 1024,
  ["image", "video"]
);

// All portfolio routes require authentication
router.use(authenticate);

// GET /api/portfolio/me - Retrieve own portfolio items (logged-in influencer)
router.get("/me", getMyPortfolio);

// GET /api/portfolio/:influencerId - Retrieve public portfolio items of another influencer
router.get("/:influencerId", getPortfolioByInfluencerId);

// POST /api/portfolio - Upload a portfolio item (Influencers only)
router.post(
  "/",
  requireRole("INFLUENCER"),
  portfolioUploader.single("file"),
  uploadPortfolioMedia
);

// DELETE /api/portfolio/:id - Delete a portfolio item (Influencers only)
router.delete("/:id", requireRole("INFLUENCER"), deletePortfolioItem);

export default router;
