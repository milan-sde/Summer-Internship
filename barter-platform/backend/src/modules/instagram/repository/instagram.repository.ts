import mongoose from "mongoose";
import {
  InstagramAccount,
  IInstagramAccount,
} from "../models/instagram-account.model";
import {
  MediaCatalogue,
  IMediaCatalogue,
} from "../models/media-catalogue.model";
import { UploadedMedia, IUploadedMedia } from "../models/uploaded-media.model";
import {
  InstagramAccountData,
  MediaCatalogueData,
  UploadedMediaData,
} from "../interfaces/instagram.interfaces";

export class InstagramRepository {
  async findAccountByUserId(userId: string): Promise<IInstagramAccount | null> {
    return InstagramAccount.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });
  }

  async upsertAccount(
    data: InstagramAccountData,
  ): Promise<IInstagramAccount | null> {
    const existingAccount = await InstagramAccount.findOne({
      userId: data.userId,
    });

    return InstagramAccount.findOneAndUpdate(
      { userId: data.userId },
      {
        $set: {
          instagramId: data.instagramId,
          username: data.username,
          followersCount: data.followersCount,
          mediaCount: data.mediaCount,
          profilePicture: data.profilePicture,
          accessToken: data.accessToken,
          tokenExpiresAt: data.tokenExpiresAt,
          connectedAt: existingAccount?.connectedAt || data.connectedAt,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      },
    );
  }

  async deleteAccountByUserId(userId: string): Promise<void> {
    await InstagramAccount.deleteOne({
      userId: new mongoose.Types.ObjectId(userId),
    });
  }

  async findMediaByUserId(userId: string): Promise<IMediaCatalogue[]> {
    return MediaCatalogue.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).sort({ createdAt: -1 });
  }

  async findMediaItem(
    userId: string,
    mediaId: string,
  ): Promise<IMediaCatalogue | null> {
    return MediaCatalogue.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      mediaId,
    });
  }

  async upsertMediaItem(
    data: MediaCatalogueData,
  ): Promise<IMediaCatalogue | null> {
    return MediaCatalogue.findOneAndUpdate(
      {
        userId: data.userId,
        mediaId: data.mediaId,
      },
      {
        $set: {
          mediaType: data.mediaType,
          mediaUrl: data.mediaUrl,
          thumbnailUrl: data.thumbnailUrl,
          caption: data.caption,
          permalink: data.permalink,
          selectedForPortfolio: data.selectedForPortfolio ?? false,
          source: data.source ?? "instagram",
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      },
    );
  }

  async updateMediaSelection(
    userId: string,
    mediaId: string,
    selectedForPortfolio: boolean,
  ): Promise<IMediaCatalogue | null> {
    return MediaCatalogue.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        mediaId,
      },
      {
        $set: {
          selectedForPortfolio,
        },
      },
      { new: true },
    );
  }

  async deleteMediaByUserId(userId: string): Promise<void> {
    await MediaCatalogue.deleteMany({
      userId: new mongoose.Types.ObjectId(userId),
    });
  }

  async createUploadedMedia(data: UploadedMediaData): Promise<IUploadedMedia> {
    const uploadedMedia = new UploadedMedia(data);
    return uploadedMedia.save();
  }

  async deleteAllUserData(userId: string): Promise<void> {
    await Promise.all([
      this.deleteAccountByUserId(userId),
      this.deleteMediaByUserId(userId),
    ]);
  }
}
