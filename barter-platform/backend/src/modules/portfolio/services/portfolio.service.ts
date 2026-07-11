import { PortfolioMedia, IPortfolioMedia } from "../models/portfolio-media.model";
import { ValidationError, NotFoundError, ForbiddenError } from "@shared/errors/app-error";
import { cloudinaryService } from "@shared/services/cloudinary.service";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";

export class PortfolioService {
  async addPortfolioMedia(
    userId: string,
    mediaUrl: string,
    mediaPublicId: string,
    file: Express.Multer.File,
    title?: string,
    description?: string
  ): Promise<IPortfolioMedia> {
    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");

    if (!isImage && !isVideo) {
      throw new ValidationError("Only image or video files are allowed");
    }

    const mediaType = isImage ? "image" : "video";

    const portfolioItem = new PortfolioMedia({
      userId: new mongoose.Types.ObjectId(userId),
      title: title || undefined,
      description: description || undefined,
      mediaUrl,
      mediaPublicId,
      mediaType,
      mimeType: file.mimetype,
      fileSize: file.size,
    });

    return await portfolioItem.save();
  }

  async getPortfolioByUserId(userId: string): Promise<IPortfolioMedia[]> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ValidationError("Invalid user ID format");
    }

    return await PortfolioMedia.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).sort({ createdAt: -1 });
  }

  async deletePortfolioMedia(userId: string, portfolioId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(portfolioId)) {
      throw new ValidationError("Invalid portfolio media ID format");
    }

    const mediaItem = await PortfolioMedia.findById(portfolioId);
    if (!mediaItem) {
      throw new NotFoundError("PortfolioMedia", portfolioId);
    }

    if (mediaItem.userId.toString() !== userId) {
      throw new ForbiddenError("You are not authorized to delete this portfolio item");
    }

    if (mediaItem.mediaPublicId) {
      try {
        await cloudinaryService.deleteFile(mediaItem.mediaPublicId);
      } catch (error) {
        console.error(`Failed to delete Cloudinary file:`, error);
      }
    } else if (mediaItem.mediaUrl.startsWith("/static/")) {
      const filename = mediaItem.mediaUrl.replace("/static/", "");
      const absoluteFilePath = path.join(__dirname, "../../../static", filename);
      try {
        if (fs.existsSync(absoluteFilePath)) {
          await fs.promises.unlink(absoluteFilePath);
        }
      } catch (error) {
        console.error(`Failed to delete local file:`, error);
      }
    }

    await PortfolioMedia.deleteOne({ _id: mediaItem._id });
  }
}
