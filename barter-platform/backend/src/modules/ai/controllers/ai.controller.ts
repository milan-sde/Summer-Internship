import { Request, Response } from "express";
import { AiService } from "../services/ai.service";
import { asyncHandler } from "@shared/middlewares/async-handler";

const aiService = new AiService();

export const generateCaption = asyncHandler(
  async (req: Request, res: Response) => {
    const caption = await aiService.generateCaption(req.body);
    res.status(200).json({
      success: true,
      data: {
        caption,
      },
    });
  }
);
