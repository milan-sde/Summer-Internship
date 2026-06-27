import { Router } from "express";
import { authenticate } from "@shared/middlewares/auth.middleware";
import { getInfluencerProfile } from "../controllers/profile.controller";

const router = Router();

// All influencer queries require login (e.g. for brands browsing profiles)
router.use(authenticate);

// GET /api/influencers/:id - Retrieve the unified influencer profile payload
router.get("/:id", getInfluencerProfile);

export default router;
