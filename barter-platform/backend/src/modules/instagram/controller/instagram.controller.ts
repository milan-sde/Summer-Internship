import { Request, Response } from "express";
import { asyncHandler } from "@shared/middlewares/async-handler";
import { InstagramService } from "../service/instagram.service";

const instagramService = new InstagramService();

const getOrigin = (value: unknown) =>
  value === "onboarding" ? "onboarding" : "settings";

export const getAuthUrl = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const origin = getOrigin(req.query.origin);
  const authUrl = instagramService.getAuthUrl(userId, origin);

  res.status(200).json({
    success: true,
    data: { authUrl },
  });
});

export const redirectToAuth = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const origin = getOrigin(req.query.origin);
    const authUrl = instagramService.getAuthUrl(userId, origin);

    res.redirect(authUrl);
  },
);

export const oauthCallback = asyncHandler(
  async (req: Request, res: Response) => {
    const { code, state, error, error_description } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8100";

    let origin: "onboarding" | "settings" = "settings";

    const redirectUrlMap = {
      onboarding: `${frontendUrl}/dashboard?instagram=connected`,
      settings: `${frontendUrl}/profile/settings?instagram=connected`,
    };

    const errorUrlMap = (message: string) => {
      const encodedMessage = encodeURIComponent(message);
      return origin === "onboarding"
        ? `${frontendUrl}/dashboard?instagram=error&message=${encodedMessage}`
        : `${frontendUrl}/profile/settings?instagram=error&message=${encodedMessage}`;
    };

    if (error) {
      res.redirect(errorUrlMap(String(error_description || error)));
      return;
    }

    if (!code || !state) {
      res.redirect(errorUrlMap("Authorization code or state is missing"));
      return;
    }

    try {
      const result = await instagramService.handleOAuthCallback(
        code as string,
        state as string,
      );

      origin = result.origin;
      res.redirect(redirectUrlMap[result.origin]);
    } catch (err: any) {
      res.redirect(errorUrlMap(err.message || "Connection handshake failed"));
    }
  },
);

export const syncProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const account = await instagramService.syncProfile(userId);

  res.status(200).json({
    success: true,
    message: "Instagram profile synced successfully",
    data: { account },
  });
});

export const syncMedia = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const media = await instagramService.syncMedia(userId);

  res.status(200).json({
    success: true,
    message: "Instagram media synced successfully",
    data: { media },
  });
});

export const syncInstagram = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    await instagramService.syncInstagramData(userId);

    res.status(200).json({
      success: true,
      message: "Instagram profile and media synced successfully",
    });
  },
);

export const updatePortfolioSelection = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { mediaId, selectedForPortfolio } = req.body;
    const updatedMedia = await instagramService.updatePortfolioSelection(
      userId,
      mediaId,
      selectedForPortfolio,
    );

    res.status(200).json({
      success: true,
      message: "Instagram portfolio selection updated successfully",
      data: { media: updatedMedia },
    });
  },
);

export const disconnectInstagram = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    await instagramService.disconnect(userId);

    res.status(200).json({
      success: true,
      message: "Instagram account disconnected successfully",
    });
  },
);
// Ashish€2010