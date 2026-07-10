import mongoose from "mongoose";
import { Profile } from "@modules/profile/models/profile.model";
import { encrypt, decrypt } from "@shared/utils/encryption";
import { ValidationError, NotFoundError } from "@shared/errors/app-error";
import { InstagramRepository } from "../repository/instagram.repository";
import {
  InstagramConnectionOrigin,
  InstagramOAuthState,
  InstagramMediaType,
} from "../interfaces/instagram.interfaces";

type MetaTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: { message?: string };
};

type MetaPageResponse = {
  data?: Array<{
    instagram_business_account?: {
      id?: string;
      username?: string;
      profile_picture_url?: string;
    };
  }>;
  error?: { message?: string };
};

type MetaProfileResponse = {
  username?: string;
  followers_count?: number;
  media_count?: number;
  profile_picture_url?: string;
  error?: { message?: string };
};

type MetaMediaResponse = {
  data?: Array<{
    id: string;
    caption?: string;
    media_type: InstagramMediaType;
    media_url?: string;
    permalink?: string;
    thumbnail_url?: string;
    timestamp?: string;
  }>;
  error?: { message?: string };
};

const getApiVersion = (): string => process.env.META_GRAPH_API_VERSION || "v18.0";

export class InstagramService {
  private repository: InstagramRepository;

  constructor() {
    this.repository = new InstagramRepository();
  }

  getAuthUrl(userId: string, origin: InstagramConnectionOrigin): string {
    const appId = process.env.INSTAGRAM_APP_ID;
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

    if (!appId || !redirectUri) {
      throw new ValidationError(
        "Instagram App ID or Redirect URI is not configured",
      );
    }

    const stateObj: InstagramOAuthState = {
      userId,
      origin,
      timestamp: Date.now(),
    };

    const encryptedState = encrypt(JSON.stringify(stateObj));
    const scope = "instagram_business_basic,instagram_business_content_publish";

    return `https://api.instagram.com/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&scope=${scope}&response_type=code&state=${encodeURIComponent(encryptedState)}`;
  }

  async handleOAuthCallback(
    code: string,
    encryptedState: string,
  ): Promise<{ origin: InstagramConnectionOrigin; userId: string }> {
    if (!code || !encryptedState) {
      throw new ValidationError("Authorization code and state are required");
    }

    let stateObj: InstagramOAuthState;
    try {
      stateObj = JSON.parse(decrypt(encryptedState)) as InstagramOAuthState;
    } catch (_error) {
      throw new ValidationError("Invalid or tampered OAuth state parameter");
    }

    const appId = process.env.INSTAGRAM_APP_ID;
    const appSecret = process.env.INSTAGRAM_APP_SECRET;
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

    if (!appId || !appSecret || !redirectUri) {
      throw new ValidationError(
        "Instagram App credentials are not fully configured in backend environment",
      );
    }

    const { shortLivedToken, instagramId } = await this.exchangeCodeForShortToken(
      code,
      appId,
      appSecret,
      redirectUri,
    );

    const longLivedTokenResponse = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortLivedToken}`,
    );
    const longLivedTokenData =
      (await longLivedTokenResponse.json()) as MetaTokenResponse;

    if (
      !longLivedTokenResponse.ok ||
      longLivedTokenData.error ||
      !longLivedTokenData.access_token
    ) {
      throw new ValidationError(
        longLivedTokenData.error?.message ||
          "Failed to upgrade to long-lived access token",
      );
    }

    const longLivedToken = longLivedTokenData.access_token;
    const expiresSeconds = longLivedTokenData.expires_in || 60 * 24 * 60 * 60;
    const tokenExpiresAt = new Date(Date.now() + expiresSeconds * 1000);

    const profileResponse = await fetch(
      `https://graph.instagram.com/me?fields=id,username,media_count,followers_count&access_token=${longLivedToken}`,
    );
    const profileData = (await profileResponse.json()) as any;

    if (!profileResponse.ok || profileData.error) {
      throw new ValidationError(
        profileData.error?.message || "Failed to retrieve Instagram profile details",
      );
    }

    const username = profileData.username || "";
    const mediaCount = profileData.media_count || 0;
    const followersCount = profileData.followers_count || 0;
    const profilePicture = "";

    const encryptedToken = encrypt(longLivedToken);

    const account = await this.repository.upsertAccount({
      userId: new mongoose.Types.ObjectId(stateObj.userId),
      instagramId,
      username,
      followersCount,
      mediaCount,
      profilePicture,
      accessToken: encryptedToken,
      tokenExpiresAt,
      connectedAt: new Date(),
    });

    await this.syncProfileDocument(stateObj.userId, account || undefined);
    await this.syncMedia(stateObj.userId);

    return {
      origin: stateObj.origin,
      userId: stateObj.userId,
    };
  }

  async syncInstagramData(userId: string): Promise<void> {
    await this.syncProfile(userId);
    await this.syncMedia(userId);
  }

  async syncProfile(userId: string) {
    const account = await this.repository.findAccountByUserId(userId);
    if (!account) {
      throw new ValidationError("Instagram is not connected for this profile");
    }

    const token = decrypt(account.accessToken);
    const profileResponse = await fetch(
      `https://graph.instagram.com/me?fields=id,username,media_count,followers_count&access_token=${token}`,
    );
    const profileData = (await profileResponse.json()) as any;

    if (!profileResponse.ok || profileData.error) {
      throw new ValidationError(
        profileData.error?.message ||
          "Failed to fetch Instagram profile details",
      );
    }

    const followersCount = profileData.followers_count !== undefined ? profileData.followers_count : (account.followersCount || 0);
    const mediaCount = profileData.media_count || account.mediaCount || 0;
    const username = profileData.username || account.username;
    const profilePicture = account.profilePicture || "";

    const updatedAccount = await this.repository.upsertAccount({
      userId: new mongoose.Types.ObjectId(userId),
      instagramId: account.instagramId,
      username,
      followersCount,
      mediaCount,
      profilePicture,
      accessToken: account.accessToken,
      tokenExpiresAt: account.tokenExpiresAt,
      connectedAt: account.connectedAt,
    });

    await this.syncProfileDocument(userId, updatedAccount || undefined);

    return updatedAccount;
  }

  async syncMedia(userId: string) {
    const account = await this.repository.findAccountByUserId(userId);
    if (!account) {
      throw new ValidationError("Instagram is not connected for this profile");
    }

    const token = decrypt(account.accessToken);
    const existingItems = await this.repository.findMediaByUserId(userId);
    const selectedMap = new Map(
      existingItems.map((item) => [item.mediaId, item.selectedForPortfolio]),
    );

    const mediaResponse = await fetch(
      `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&limit=25&access_token=${token}`,
    );
    const mediaData = (await mediaResponse.json()) as MetaMediaResponse;

    if (!mediaResponse.ok || mediaData.error) {
      throw new ValidationError(
        mediaData.error?.message || "Failed to fetch Instagram media feed",
      );
    }

    const savedMedia: any[] = [];
    for (const item of mediaData.data || []) {
      const savedItem = await this.repository.upsertMediaItem({
        userId: new mongoose.Types.ObjectId(userId),
        mediaId: item.id,
        mediaType: item.media_type,
        mediaUrl: item.media_url || "",
        thumbnailUrl: item.thumbnail_url,
        caption: item.caption || "",
        permalink: item.permalink || "",
        selectedForPortfolio: selectedMap.get(item.id) || false,
        source: "instagram",
      });
      if (savedItem) {
        savedMedia.push(savedItem);
      }
    }

    await this.repository.upsertAccount({
      userId: new mongoose.Types.ObjectId(userId),
      instagramId: account.instagramId,
      username: account.username,
      followersCount: account.followersCount,
      mediaCount: mediaData.data?.length || account.mediaCount,
      profilePicture: account.profilePicture,
      accessToken: account.accessToken,
      tokenExpiresAt: account.tokenExpiresAt,
      connectedAt: account.connectedAt,
    });

    await this.syncProfileDocument(userId);

    return savedMedia;
  }

  async updatePortfolioSelection(
    userId: string,
    mediaId: string,
    selectedForPortfolio: boolean,
  ) {
    const updatedMedia = await this.repository.updateMediaSelection(
      userId,
      mediaId,
      selectedForPortfolio,
    );
    if (!updatedMedia) {
      throw new NotFoundError("Instagram media", mediaId);
    }

    return updatedMedia;
  }

  async disconnect(userId: string): Promise<void> {
    await this.repository.deleteAllUserData(userId);
    await this.clearProfileInstagram(userId);
  }

  async getDecryptedToken(userId: string): Promise<string> {
    const account = await this.repository.findAccountByUserId(userId);
    if (!account || !account.accessToken) {
      throw new ValidationError("Instagram is not connected for this profile");
    }

    return decrypt(account.accessToken);
  }

  /**
   * Publishes approved content to the official Instagram Graph API.
   * Handles both IMAGE posts and VIDEO (Reels) posts.
   * Swaps local development URLs for a public placeholder asset during testing to satisfy Meta Graph API requirements.
   */
  async publishContent(
    userId: string,
    mediaUrl: string,
    caption: string,
    mediaType: "IMAGE" | "VIDEO"
  ): Promise<{ instagramMediaId: string; instagramPermalink: string }> {
    const account = await this.repository.findAccountByUserId(userId);
    if (!account) {
      throw new ValidationError("Instagram account is not connected for this profile");
    }

    const token = decrypt(account.accessToken);
    const instagramId = account.instagramId;
    const apiVersion = getApiVersion();

    // 1. Swapping local server URLs for a public fallback when running locally
    let publicMediaUrl = mediaUrl;
    if (mediaUrl.includes("localhost") || mediaUrl.includes("127.0.0.1") || !mediaUrl.startsWith("http")) {
      const hostUrl = process.env.BACKEND_URL || "http://localhost:3000";
      const fullUrl = mediaUrl.startsWith("/") ? `${hostUrl}${mediaUrl}` : mediaUrl;
      
      if (fullUrl.includes("localhost") || fullUrl.includes("127.0.0.1")) {
        if (mediaType === "VIDEO") {
          publicMediaUrl = "https://www.w3schools.com/html/mov_bbb.mp4"; // Sample public MP4 video
        } else {
          publicMediaUrl = "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800"; // Sample Instagram image
        }
        console.log(`[Instagram Service] Replacing local URL '${fullUrl}' with public fallback: '${publicMediaUrl}'`);
      } else {
        publicMediaUrl = fullUrl;
      }
    }

    // 2. Step 1: Create media container
    console.log(`[Instagram Service] Creating media container for ${mediaType}...`);
    let containerUrl = `https://graph.instagram.com/${apiVersion}/${instagramId}/media?caption=${encodeURIComponent(
      caption
    )}&access_token=${token}`;

    if (mediaType === "VIDEO") {
      containerUrl += `&media_type=REELS&video_url=${encodeURIComponent(publicMediaUrl)}`;
    } else {
      containerUrl += `&image_url=${encodeURIComponent(publicMediaUrl)}`;
    }

    const containerResponse = await fetch(containerUrl, { method: "POST" });
    const containerData = (await containerResponse.json()) as any;

    if (!containerResponse.ok || containerData.error || !containerData.id) {
      throw new ValidationError(
        containerData.error?.message || "Failed to create Instagram media container"
      );
    }

    const containerId = containerData.id;
    console.log(`[Instagram Service] Media container created successfully. ID: ${containerId}`);

    // 3. Step 2: Poll container status until FINISHED
    console.log(`[Instagram Service] Polling status for media container: ${containerId}...`);
    let isFinished = false;
    let retries = 0;
    const maxRetries = 30; // 30 retries * 5000ms = 150 seconds

    while (!isFinished && retries < maxRetries) {
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
      retries++;

      const statusResponse = await fetch(
        `https://graph.instagram.com/${apiVersion}/${containerId}?fields=status_code,status&access_token=${token}`
      );
      const statusData = (await statusResponse.json()) as any;

      if (!statusResponse.ok || statusData.error) {
        throw new ValidationError(
          statusData.error?.message || "Failed to check media container processing status"
        );
      }

      const statusCode = statusData.status_code;
      console.log(`[Instagram Service] Media container status (Attempt ${retries}/${maxRetries}): ${statusCode}`);

      if (statusCode === "FINISHED") {
        isFinished = true;
      } else if (statusCode === "ERROR" || statusCode === "EXPIRED") {
        throw new ValidationError(
          statusData.error?.message || `Media processing failed with state: ${statusCode}`
        );
      }
    }

    if (!isFinished) {
      throw new ValidationError("Media processing timed out on Instagram servers. Please try again.");
    }

    // 4. Step 3: Publish the media container
    console.log(`[Instagram Service] Publishing media container: ${containerId}...`);
    const publishUrl = `https://graph.instagram.com/${apiVersion}/${instagramId}/media_publish?creation_id=${containerId}&access_token=${token}`;
    const publishResponse = await fetch(publishUrl, { method: "POST" });
    const publishData = (await publishResponse.json()) as any;

    if (!publishResponse.ok || publishData.error || !publishData.id) {
      throw new ValidationError(
        publishData.error?.message || "Failed to publish media container to Instagram"
      );
    }

    const mediaId = publishData.id;
    console.log(`[Instagram Service] Media published successfully. Media ID: ${mediaId}`);

    // 5. Step 4: Fetch permalink and timestamp
    console.log(`[Instagram Service] Fetching permalink for media ID: ${mediaId}...`);
    const mediaDetailResponse = await fetch(
      `https://graph.instagram.com/${apiVersion}/${mediaId}?fields=permalink,timestamp&access_token=${token}`
    );
    const mediaDetailData = (await mediaDetailResponse.json()) as any;

    const permalink = mediaDetailData.permalink || `https://www.instagram.com/p/${mediaId}/`;
    
    return {
      instagramMediaId: mediaId,
      instagramPermalink: permalink,
    };
  }

  private async exchangeCodeForShortToken(
    code: string,
    appId: string,
    appSecret: string,
    redirectUri: string,
  ): Promise<{ shortLivedToken: string; instagramId: string }> {
    const formData = new URLSearchParams();
    formData.append("client_id", appId);
    formData.append("client_secret", appSecret);
    formData.append("grant_type", "authorization_code");
    formData.append("redirect_uri", redirectUri);
    formData.append("code", code);

    const tokenResponse = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const tokenData = (await tokenResponse.json()) as any;

    if (!tokenResponse.ok || tokenData.error || !tokenData.access_token) {
      throw new ValidationError(
        tokenData.error_message || tokenData.error?.message || "Failed to exchange authorization code",
      );
    }

    return {
      shortLivedToken: tokenData.access_token,
      instagramId: String(tokenData.user_id),
    };
  }

  private async syncProfileDocument(
    userId: string,
    account?: any,
  ): Promise<void> {
    const profile = await Profile.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (!profile) {
      throw new NotFoundError("Profile");
    }

    const currentAccount =
      account || (await this.repository.findAccountByUserId(userId));
    if (!currentAccount) {
      return;
    }

    profile.instagram = {
      instagramId: currentAccount.instagramId,
      username: currentAccount.username,
      accessToken: currentAccount.accessToken,
      tokenExpiresAt: currentAccount.tokenExpiresAt,
      followersCount: currentAccount.followersCount,
      mediaCount: currentAccount.mediaCount,
      profilePicture: currentAccount.profilePicture,
      connectedAt: currentAccount.connectedAt,
    };

    profile.platforms = profile.platforms || {};
    profile.platforms.instagram = {
      username: currentAccount.username,
      followers: currentAccount.followersCount,
    };

    const maxFollowers = Math.max(
      currentAccount.followersCount,
      profile.platforms.youtube?.followers || 0,
      profile.platforms.twitter?.followers || 0,
    );

    profile.stats = profile.stats || {};
    profile.stats.followers = maxFollowers;

    await profile.save();
  }

  private async clearProfileInstagram(userId: string): Promise<void> {
    const profile = await Profile.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (!profile) {
      return;
    }

    profile.set("instagram", undefined);
    if (profile.platforms) {
      profile.platforms.instagram = undefined;
    }

    const remainingFollowers = Math.max(
      profile.platforms?.youtube?.followers || 0,
      profile.platforms?.twitter?.followers || 0,
    );

    profile.stats = profile.stats || {};
    profile.stats.followers = remainingFollowers;

    await profile.save();
  }
}
