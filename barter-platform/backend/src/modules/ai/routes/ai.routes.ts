import { Router } from "express";
import { authenticate } from "@shared/middlewares/auth.middleware";
import { generateCaption } from "../controllers/ai.controller";
import { validate } from "@modules/auth/validators/auth.validator";
import { GenerateCaptionDtoSchema } from "../dto/ai.dto";

const router = Router();

// All AI endpoints require authentication
router.use(authenticate);

router.post("/generate-caption", validate(GenerateCaptionDtoSchema), generateCaption);

export default router;
