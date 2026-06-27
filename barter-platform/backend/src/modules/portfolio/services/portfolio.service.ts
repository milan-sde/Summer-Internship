import { PortfolioMedia, IPortfolioMedia } from "../models/portfolio-media.model";
import { ValidationError, NotFoundError, ForbiddenError } from "@shared/errors/app-error";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import multer from "multer";

export class PortfolioService {
  /**
   * Adds a new media item (image/video) to the influencer's portfolio.
   * 
   * @param userId ID of the influencer uploading the file
   * @param file The Multer file object containing filename, mimetype, and size
   * @param title Optional title of the portfolio item
   * @param description Optional description of the portfolio item
   */
  async addPortfolioMedia(
    userId: string,
    file: Express.Multer.File,
    title?: string,
    description?: string
  ): Promise<IPortfolioMedia> {
    if (!file) {
      throw new ValidationError("File is required");
    }

    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");

    if (!isImage && !isVideo) {
      throw new ValidationError("Only image or video files are allowed");
    }

    const mediaType = isImage ? "image" : "video";
    
    // We store the relative file path path that matches the express static server configuration
    const mediaUrl = `/static/portfolio/${file.filename}`;

    const portfolioItem = new PortfolioMedia({
      userId: new mongoose.Types.ObjectId(userId),
      title: title || undefined,
      description: description || undefined,
      mediaUrl,
      mediaType,
      mimeType: file.mimetype,
      fileSize: file.size,
    });

    return await portfolioItem.save();
  }

  /**
   * Retrieves all portfolio media items for a specific influencer.
   * 
   * @param userId The user ID of the influencer
   */
  async getPortfolioByUserId(userId: string): Promise<IPortfolioMedia[]> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ValidationError("Invalid user ID format");
    }

    return await PortfolioMedia.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).sort({ createdAt: -1 }); // Sort newest first
  }

  /**
   * Deletes a portfolio media item from both the database and the physical disk.
   * 
   * @param userId The user ID of the requesting user (for ownership verification)
   * @param portfolioId The ID of the portfolio media item to delete
   */
  async deletePortfolioMedia(userId: string, portfolioId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(portfolioId)) {
      throw new ValidationError("Invalid portfolio media ID format");
    }

    const mediaItem = await PortfolioMedia.findById(portfolioId);
    if (!mediaItem) {
      throw new NotFoundError("PortfolioMedia", portfolioId);
    }

    // Security: Only allow the owner of the portfolio media to delete it
    if (mediaItem.userId.toString() !== userId) {
      throw new ForbiddenError("You are not authorized to delete this portfolio item");
    }

    // 1. Resolve absolute file path and remove physical file from disk
    const filename = mediaItem.mediaUrl.replace("/static/", "");
    const absoluteFilePath = path.join(__dirname, "../../../static", filename);

    try {
      if (fs.existsSync(absoluteFilePath)) {
        await fs.promises.unlink(absoluteFilePath);
        console.log(`🗑️ Successfully deleted physical file: ${absoluteFilePath}`);
      } else {
        console.warn(`⚠️ Physical file not found at path: ${absoluteFilePath}`);
      }
    } catch (error) {
      // Log the error but proceed with database deletion so we don't end up with a stuck record
      console.error(`❌ Failed to delete physical file at ${absoluteFilePath}:`, error);
    }

    // 2. Remove database record
    await PortfolioMedia.deleteOne({ _id: mediaItem._id });
    console.log(`✅ Successfully deleted PortfolioMedia record: ${portfolioId}`);
  }
}
