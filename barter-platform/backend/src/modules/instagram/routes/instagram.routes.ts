import { Router } from "express";
import { authenticate, requireRole } from "@shared/middlewares/auth.middleware";
import {
  validate,
  validateQuery,
} from "@modules/auth/validators/auth.validator";
import {
  getAuthUrl,
  redirectToAuth,
  oauthCallback,
  syncProfile,
  syncMedia,
  syncInstagram,
  updatePortfolioSelection,
  disconnectInstagram,
} from "../controller/instagram.controller";
import {
  InstagramAuthUrlQuerySchema,
  InstagramCallbackQuerySchema,
  InstagramPortfolioUpdateSchema,
} from "../validators/instagram.validator";

const router = Router();

router.get(
  "/auth-url",
  authenticate,
  validateQuery(InstagramAuthUrlQuerySchema),
  getAuthUrl,
);
router.get(
  "/auth",
  authenticate,
  validateQuery(InstagramAuthUrlQuerySchema),
  redirectToAuth,
);
router.get(
  "/callback",
  validateQuery(InstagramCallbackQuerySchema),
  oauthCallback,
);
router.post(
  "/sync-profile",
  authenticate,
  requireRole("INFLUENCER"),
  syncProfile,
);
router.post("/sync-media", authenticate, requireRole("INFLUENCER"), syncMedia);
router.post("/sync", authenticate, requireRole("INFLUENCER"), syncInstagram);
router.patch(
  "/portfolio",
  authenticate,
  requireRole("INFLUENCER"),
  validate(InstagramPortfolioUpdateSchema),
  updatePortfolioSelection,
);
router.delete(
  "/disconnect",
  authenticate,
  requireRole("INFLUENCER"),
  disconnectInstagram,
);

export default router;
