import "dotenv/config";
import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import { ValidationError, NotFoundError } from "@shared/errors/app-error";

// 1. Mock Authentication and Role Middlewares BEFORE importing routes
jest.mock("@shared/middlewares/auth.middleware", () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { userId: "60c72b2f9b1d8a23c8f8b8a1" };
    next();
  },
  requireRole: (..._roles: string[]) => (req: any, res: any, next: any) => {
    next();
  },
}));

// Mock the InstagramService
const mockGetAuthUrl = jest.fn() as any;
const mockHandleOAuthCallback = jest.fn() as any;
const mockSyncProfile = jest.fn() as any;
const mockSyncMedia = jest.fn() as any;
const mockSyncInstagramData = jest.fn() as any;
const mockUpdatePortfolioSelection = jest.fn() as any;
const mockDisconnect = jest.fn() as any;

jest.mock("@modules/instagram/service/instagram.service", () => {
  return {
    InstagramService: jest.fn().mockImplementation(() => {
      return {
        getAuthUrl: mockGetAuthUrl,
        handleOAuthCallback: mockHandleOAuthCallback,
        syncProfile: mockSyncProfile,
        syncMedia: mockSyncMedia,
        syncInstagramData: mockSyncInstagramData,
        updatePortfolioSelection: mockUpdatePortfolioSelection,
        disconnect: mockDisconnect,
      };
    }),
  };
});

// Import express router and global error handler
import instagramRoutes from "@modules/instagram/routes/instagram.routes";
import { errorHandler } from "@shared/middlewares/error-handler";

const app = express();
app.use(express.json());
app.use("/api/instagram", instagramRoutes);
app.use(errorHandler);

describe("Instagram Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/instagram/auth-url", () => {
    it("should return 200 with the auth url for valid query", async () => {
      mockGetAuthUrl.mockReturnValue("https://facebook.com/auth-url");

      const res = await request(app).get("/api/instagram/auth-url?origin=settings");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        data: { authUrl: "https://facebook.com/auth-url" },
      });
      expect(mockGetAuthUrl).toHaveBeenCalledWith("60c72b2f9b1d8a23c8f8b8a1", "settings");
    });

    it("should default origin to settings if query parameter is empty", async () => {
      mockGetAuthUrl.mockReturnValue("https://facebook.com/auth-url");
      const res = await request(app).get("/api/instagram/auth-url");
      expect(res.status).toBe(200);
      expect(mockGetAuthUrl).toHaveBeenCalledWith("60c72b2f9b1d8a23c8f8b8a1", "settings");
    });

    it("should return 400 if validation fails due to invalid origin", async () => {
      const res = await request(app).get("/api/instagram/auth-url?origin=invalid");
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/instagram/auth", () => {
    it("should redirect to the generated Meta OAuth page", async () => {
      mockGetAuthUrl.mockReturnValue("https://facebook.com/redirect-to-meta");

      const res = await request(app).get("/api/instagram/auth?origin=onboarding");
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("https://facebook.com/redirect-to-meta");
      expect(mockGetAuthUrl).toHaveBeenCalledWith("60c72b2f9b1d8a23c8f8b8a1", "onboarding");
    });
  });

  describe("GET /api/instagram/callback", () => {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8100";

    it("should redirect to frontend settings on successful connection callback", async () => {
      mockHandleOAuthCallback.mockResolvedValue({ origin: "settings", userId: "user1" });

      const res = await request(app).get("/api/instagram/callback?code=oauth_code&state=encrypted_state");
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(`${frontendUrl}/profile/settings?instagram=connected`);
      expect(mockHandleOAuthCallback).toHaveBeenCalledWith("oauth_code", "encrypted_state");
    });

    it("should redirect to frontend onboarding dashboard on onboarding connection callback", async () => {
      mockHandleOAuthCallback.mockResolvedValue({ origin: "onboarding", userId: "user1" });

      const res = await request(app).get("/api/instagram/callback?code=oauth_code&state=encrypted_state");
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(`${frontendUrl}/dashboard?instagram=connected`);
    });

    it("should redirect with error description if Meta API error is returned in URL parameters", async () => {
      const res = await request(app).get("/api/instagram/callback?error=access_denied&error_description=User+declined");
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(`${frontendUrl}/profile/settings?instagram=error&message=User%20declined`);
      expect(mockHandleOAuthCallback).not.toHaveBeenCalled();
    });

    it("should redirect with error if authorization code or state is missing", async () => {
      const res = await request(app).get("/api/instagram/callback?code=only_code");
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(`${frontendUrl}/profile/settings?instagram=error&message=Authorization%20code%20or%20state%20is%20missing`);
    });

    it("should redirect to settings error page if callback handler throws ValidationError", async () => {
      mockHandleOAuthCallback.mockRejectedValue(new ValidationError("State expired"));

      const res = await request(app).get("/api/instagram/callback?code=code&state=state");
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(`${frontendUrl}/profile/settings?instagram=error&message=State%20expired`);
    });
  });

  describe("POST /api/instagram/sync-profile", () => {
    it("should return 200 with synced profile details on success", async () => {
      const mockAccount = { username: "synced_user", followersCount: 150 };
      mockSyncProfile.mockResolvedValue(mockAccount);

      const res = await request(app).post("/api/instagram/sync-profile");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        message: "Instagram profile synced successfully",
        data: { account: mockAccount },
      });
      expect(mockSyncProfile).toHaveBeenCalledWith("60c72b2f9b1d8a23c8f8b8a1");
    });
  });

  describe("POST /api/instagram/sync-media", () => {
    it("should return 200 with list of synced media on success", async () => {
      const mockMedia = [{ mediaId: "m1", mediaUrl: "http://url.com" }];
      mockSyncMedia.mockResolvedValue(mockMedia);

      const res = await request(app).post("/api/instagram/sync-media");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        message: "Instagram media synced successfully",
        data: { media: mockMedia },
      });
      expect(mockSyncMedia).toHaveBeenCalledWith("60c72b2f9b1d8a23c8f8b8a1");
    });
  });

  describe("POST /api/instagram/sync", () => {
    it("should return 200 after successfully synchronizing both profile and media", async () => {
      mockSyncInstagramData.mockResolvedValue(undefined);

      const res = await request(app).post("/api/instagram/sync");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        message: "Instagram profile and media synced successfully",
      });
      expect(mockSyncInstagramData).toHaveBeenCalledWith("60c72b2f9b1d8a23c8f8b8a1");
    });
  });

  describe("PATCH /api/instagram/portfolio", () => {
    it("should return 200 on successful portfolio selection update", async () => {
      const mockItem = { mediaId: "media_1", selectedForPortfolio: true };
      mockUpdatePortfolioSelection.mockResolvedValue(mockItem);

      const res = await request(app)
        .patch("/api/instagram/portfolio")
        .send({ mediaId: "media_1", selectedForPortfolio: true });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        message: "Instagram portfolio selection updated successfully",
        data: { media: mockItem },
      });
      expect(mockUpdatePortfolioSelection).toHaveBeenCalledWith(
        "60c72b2f9b1d8a23c8f8b8a1",
        "media_1",
        true
      );
    });

    it("should return 400 if payload is missing mediaId", async () => {
      const res = await request(app)
        .patch("/api/instagram/portfolio")
        .send({ selectedForPortfolio: true });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 if media item does not exist", async () => {
      mockUpdatePortfolioSelection.mockRejectedValue(new NotFoundError("Instagram media", "m_missing"));

      const res = await request(app)
        .patch("/api/instagram/portfolio")
        .send({ mediaId: "m_missing", selectedForPortfolio: false });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("DELETE /api/instagram/disconnect", () => {
    it("should return 200 on successful disconnect", async () => {
      mockDisconnect.mockResolvedValue(undefined);

      const res = await request(app).delete("/api/instagram/disconnect");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        message: "Instagram account disconnected successfully",
      });
      expect(mockDisconnect).toHaveBeenCalledWith("60c72b2f9b1d8a23c8f8b8a1");
    });
  });
});
