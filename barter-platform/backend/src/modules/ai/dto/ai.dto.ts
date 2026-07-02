import { z } from "zod";

export const GenerateCaptionDtoSchema = z.object({
  description: z.string().min(1, "Post description is required"),
  tone: z.enum(["Casual", "Professional", "Funny", "Friendly", "Motivational", "Luxury"]),
  length: z.enum(["Short", "Medium", "Long"]),
  platform: z.enum(["Instagram", "LinkedIn", "Facebook", "X"]),
  includeEmojis: z.boolean(),
  includeHashtags: z.boolean()
});

export type GenerateCaptionDto = z.infer<typeof GenerateCaptionDtoSchema>;
