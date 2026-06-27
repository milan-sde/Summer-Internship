import mongoose from "mongoose";

export type InstagramConnectionOrigin = "onboarding" | "settings";
export type InstagramMediaType = "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
export type InstagramMediaSource = "instagram" | "upload";

export interface InstagramOAuthState {
  userId: string;
  origin: InstagramConnectionOrigin;
  timestamp: number;
}

export interface InstagramAccountData {
  userId: mongoose.Types.ObjectId;
  instagramId: string;
  username: string;
  followersCount: number;
  mediaCount: number;
  profilePicture?: string;
  accessToken: string;
  connectedAt: Date;
  tokenExpiresAt?: Date;
}

export interface MediaCatalogueData {
  userId: mongoose.Types.ObjectId;
  mediaId: string;
  mediaType: InstagramMediaType;
  mediaUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  permalink?: string;
  selectedForPortfolio?: boolean;
  source?: InstagramMediaSource;
}

export interface UploadedMediaData {
  userId: mongoose.Types.ObjectId;
  fileUrl: string;
  type: string;
  title?: string;
}
