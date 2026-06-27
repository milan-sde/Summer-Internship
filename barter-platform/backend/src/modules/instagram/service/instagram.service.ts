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
    const appId = process.env.FACEBOOK_APP_ID;
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
    const apiVersion = getApiVersion();

    if (!appId || !redirectUri) {
      throw new ValidationError(
        "Facebook App ID or Redirect URI is not configured",
      );
    }

    const stateObj: InstagramOAuthState = {
      userId,
      origin,
      timestamp: Date.now(),
    };

    const encryptedState = encrypt(JSON.stringify(stateObj));
    const scope =
      "instagram_basic,pages_show_list,pages_read_engagement,public_profile";

    return `https://www.facebook.com/${apiVersion}/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&scope=${scope}&state=${encodeURIComponent(encryptedState)}`;
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

    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
    const apiVersion = getApiVersion();

    if (!appId || !appSecret || !redirectUri) {
      throw new ValidationError(
        "Meta App credentials are not fully configured in backend environment",
      );
    }

    const shortLivedToken = await this.exchangeCodeForToken(
      code,
      appId,
      appSecret,
      redirectUri,
    );
    const longLivedTokenResponse = await fetch(
      `https://graph.facebook.com/${apiVersion}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`,
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

    const connectedAccount = await this.findInstagramAccount(longLivedToken);
    const encryptedToken = encrypt(longLivedToken);

    const account = await this.repository.upsertAccount({
      userId: new mongoose.Types.ObjectId(stateObj.userId),
      instagramId: connectedAccount.instagramId,
      username: connectedAccount.username,
      followersCount: connectedAccount.followersCount,
      mediaCount: connectedAccount.mediaCount,
      profilePicture: connectedAccount.profilePicture,
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
    const apiVersion = getApiVersion();
    const profileResponse = await fetch(
      `https://graph.facebook.com/${apiVersion}/${account.instagramId}?fields=username,profile_picture_url,followers_count,media_count&access_token=${token}`,
    );
    const profileData = (await profileResponse.json()) as MetaProfileResponse;

    if (!profileResponse.ok || profileData.error) {
      throw new ValidationError(
        profileData.error?.message ||
          "Failed to fetch Instagram profile details",
      );
    }

    const followersCount = profileData.followers_count || 0;
    const mediaCount = profileData.media_count || account.mediaCount || 0;
    const username = profileData.username || account.username;
    const profilePicture =
      profileData.profile_picture_url || account.profilePicture;

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

    const apiVersion = getApiVersion();
    const mediaResponse = await fetch(
      `https://graph.facebook.com/${apiVersion}/${account.instagramId}/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&limit=25&access_token=${token}`,
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

  private async exchangeCodeForToken(
    code: string,
    appId: string,
    appSecret: string,
    redirectUri: string,
  ): Promise<string> {
    const apiVersion = getApiVersion();
    const tokenResponse = await fetch(
      `https://graph.facebook.com/${apiVersion}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(
        redirectUri,
      )}&client_secret=${appSecret}&code=${code}`,
    );
    const tokenData = (await tokenResponse.json()) as MetaTokenResponse;

    if (!tokenResponse.ok || tokenData.error || !tokenData.access_token) {
      throw new ValidationError(
        tokenData.error?.message || "Failed to exchange authorization code",
      );
    }

    return tokenData.access_token;
  }

  private async findInstagramAccount(accessToken: string) {
    const apiVersion = getApiVersion();
    const pagesResponse = await fetch(
      `https://graph.facebook.com/${apiVersion}/me/accounts?fields=instagram_business_account{id,username,profile_picture_url},name&access_token=${accessToken}`,
    );
    const pagesData = (await pagesResponse.json()) as MetaPageResponse;

    if (!pagesResponse.ok || pagesData.error) {
      throw new ValidationError(
        pagesData.error?.message || "Failed to retrieve Facebook pages list",
      );
    }

    for (const page of pagesData.data || []) {
      const instagramAccount = page.instagram_business_account;
      if (instagramAccount?.id) {
        const profileResponse = await fetch(
          `https://graph.facebook.com/${apiVersion}/${instagramAccount.id}?fields=username,profile_picture_url,followers_count,media_count&access_token=${accessToken}`,
        );
        const profileData =
          (await profileResponse.json()) as MetaProfileResponse;

        if (!profileResponse.ok || profileData.error) {
          throw new ValidationError(
            profileData.error?.message ||
              "Failed to retrieve Instagram profile data",
          );
        }

        return {
          instagramId: instagramAccount.id,
          username: profileData.username || instagramAccount.username || "",
          followersCount: profileData.followers_count || 0,
          mediaCount: profileData.media_count || 0,
          profilePicture:
            profileData.profile_picture_url ||
            instagramAccount.profile_picture_url ||
            "",
        };
      }
    }

    throw new ValidationError(
      "No connected Instagram Creator or Business account found on your Facebook Pages. Please link a professional Instagram account to a Facebook Page.",
    );
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
