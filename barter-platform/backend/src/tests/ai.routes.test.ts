import "dotenv/config";
import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import express from "express";
import request from "supertest";

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

// Mock the AiService
const mockGenerateCaption = jest.fn() as any;
jest.mock("@modules/ai/services/ai.service", () => {
  return {
    AiService: jest.fn().mockImplementation(() => {
      return {
        generateCaption: mockGenerateCaption,
      };
    }),
  };
});

// Import express router and global error handler
import aiRoutes from "@modules/ai/routes/ai.routes";
import { errorHandler } from "@shared/middlewares/error-handler";

const app = express();
app.use(express.json());
app.use("/api/ai", aiRoutes);
app.use(errorHandler);

describe("AI Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/ai/generate-caption", () => {
    it("should return 200 with generated caption for valid input parameters", async () => {
      const generatedCaption = "Check out our skincare routine! ✨ #beauty";
      mockGenerateCaption.mockResolvedValue(generatedCaption);

      const res = await request(app)
        .post("/api/ai/generate-caption")
        .send({
          description: "New skincare routine tutorial",
          tone: "Friendly",
          length: "Short",
          platform: "Instagram",
          includeEmojis: true,
          includeHashtags: true,
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        data: { caption: generatedCaption },
      });
      expect(mockGenerateCaption).toHaveBeenCalledWith({
        description: "New skincare routine tutorial",
        tone: "Friendly",
        length: "Short",
        platform: "Instagram",
        includeEmojis: true,
        includeHashtags: true,
      });
    });

    it("should return 400 if description is missing in query body", async () => {
      const res = await request(app)
        .post("/api/ai/generate-caption")
        .send({
          tone: "Friendly",
          length: "Short",
          platform: "Instagram",
          includeEmojis: true,
          includeHashtags: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(mockGenerateCaption).not.toHaveBeenCalled();
    });

    it("should return 400 if invalid tone is provided", async () => {
      const res = await request(app)
        .post("/api/ai/generate-caption")
        .send({
          description: "Skincare",
          tone: "Angry", // Invalid tone, not in Zod enum
          length: "Short",
          platform: "Instagram",
          includeEmojis: true,
          includeHashtags: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
