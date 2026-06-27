import { Request, Response } from "express";
import { PortfolioService } from "../services/portfolio.service";
import { asyncHandler } from "@shared/middlewares/async-handler";

const portfolioService = new PortfolioService();

/**
 * Handles uploading a portfolio item (image or video) and saving its record to the database.
 */
export const uploadPortfolioMedia = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { title, description } = req.body;

    if (!req.file) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "No media file provided",
        },
      });
      return;
    }

    const portfolioItem = await portfolioService.addPortfolioMedia(
      userId,
      req.file,
      title,
      description
    );

    res.status(201).json({
      success: true,
      message: "Portfolio item uploaded and saved successfully",
      data: {
        portfolioItem,
      },
    });
  }
);

/**
 * Retrieves the currently logged-in influencer's own portfolio media items.
 */
export const getMyPortfolio = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const portfolio = await portfolioService.getPortfolioByUserId(userId);

    res.status(200).json({
      success: true,
      data: {
        portfolio,
      },
    });
  }
);

/**
 * Retrieves a specific influencer's public portfolio media items.
 */
export const getPortfolioByInfluencerId = asyncHandler(
  async (req: Request, res: Response) => {
    const influencerId = Array.isArray(req.params.influencerId)
      ? req.params.influencerId[0]
      : req.params.influencerId;

    const portfolio = await portfolioService.getPortfolioByUserId(influencerId);

    res.status(200).json({
      success: true,
      data: {
        portfolio,
      },
    });
  }
);

/**
 * Handles deleting a specific portfolio item.
 */
export const deletePortfolioItem = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const portfolioId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    await portfolioService.deletePortfolioMedia(userId, portfolioId);

    res.status(200).json({
      success: true,
      message: "Portfolio item and physical file deleted successfully",
    });
  }
);
