import { z } from "zod";

export const InstagramAuthUrlQuerySchema = z.object({
  origin: z.enum(["onboarding", "settings"]).optional(),
});

export const InstagramCallbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export const InstagramPortfolioUpdateSchema = z.object({
  mediaId: z.string().min(1, "Media ID is required"),
  selectedForPortfolio: z.boolean(),
});

export type InstagramPortfolioUpdateDto = z.infer<
  typeof InstagramPortfolioUpdateSchema
>;
