import { v2 as cloudinary } from "cloudinary";
import path from "path";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

const FOLDER_MAP: Record<string, string> = {
  avatars: "konnectnow/influencers/avatars",
  brands: "konnectnow/brands/logos",
  portfolio: "konnectnow/influencers/portfolio",
  campaigns: "konnectnow/deliverables/images",
  reels: "konnectnow/deliverables/reels",
};

function getResourceType(mimeType: string): "image" | "video" | "raw" {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("image/")) return "image";
  return "raw";
}

export const cloudinaryService = {
  async uploadFile(
    localFilePath: string,
    folderKey: string,
    mimeType?: string
  ): Promise<CloudinaryUploadResult> {
    const folder = FOLDER_MAP[folderKey] || `konnectnow/${folderKey}`;
    const resourceType = mimeType ? getResourceType(mimeType) : "image";

    const result = await cloudinary.uploader.upload(localFilePath, {
      folder,
      resource_type: resourceType,
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  },

  async uploadAndCleanup(
    localFilePath: string,
    folderKey: string,
    mimeType?: string,
    fallbackUrl?: string
  ): Promise<CloudinaryUploadResult> {
    try {
      const result = await this.uploadFile(localFilePath, folderKey, mimeType);
      try {
        if (fs.existsSync(localFilePath)) {
          await fs.promises.unlink(localFilePath);
        }
      } catch (err) {
        console.warn(`Failed to clean up local file ${localFilePath}:`, err);
      }
      return result;
    } catch (err) {
      console.warn(`Cloudinary upload failed, falling back to local storage:`, (err as Error).message);
      return {
        url: fallbackUrl || localFilePath,
        publicId: "",
      };
    }
  },

  async deleteFile(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  },

  async deleteByUrl(url: string): Promise<void> {
    if (!url || !url.includes("cloudinary")) return;
    const parts = url.split("/");
    const versionIndex = parts.findIndex((p) => p.match(/^v\d+$/));
    if (versionIndex === -1) return;
    const publicIdWithExt = parts.slice(versionIndex + 1).join("/");
    const publicId = publicIdWithExt.replace(/\.[^.]+$/, "");
    if (publicId) {
      await this.deleteFile(publicId);
    }
  },

  extractPublicId(url: string): string | null {
    if (!url || !url.includes("cloudinary")) return null;
    const parts = url.split("/");
    const versionIndex = parts.findIndex((p) => p.match(/^v\d+$/));
    if (versionIndex === -1) return null;
    const publicIdWithExt = parts.slice(versionIndex + 1).join("/");
    return publicIdWithExt.replace(/\.[^.]+$/, "");
  },
};
