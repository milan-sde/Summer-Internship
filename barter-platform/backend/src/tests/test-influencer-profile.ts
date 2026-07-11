import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "@shared/database/connection";
import { UserRepository } from "@modules/users/repositories/user.repository";
import { UserRole } from "@modules/users/models/user.model";
import { Profile } from "@modules/profile/models/profile.model";
import { User } from "@modules/users/models/user.model";
import { ProfileService } from "@modules/profile/services/profile.service";
import { PortfolioService } from "@modules/portfolio/services/portfolio.service";
import { InstagramMedia } from "@modules/instagram/models/instagram-media.model";
import { PortfolioMedia } from "@modules/portfolio/models/portfolio-media.model";

dotenv.config();

const runAggregatorTest = async () => {
  console.log("🧪 Starting Final Influencer Profile Aggregator Integration Test...\n");

  const userRepo = new UserRepository();
  const profileService = new ProfileService();
  const portfolioService = new PortfolioService();

  let tempUser: any = null;
  let tempProfile: any = null;
  let portfolioItem: any = null;
  let instagramItem: any = null;

  try {
    // 1. Connect to MongoDB
    await connectDatabase();
    console.log("✅ Connected to MongoDB");

    // 2. Create mock user
    console.log("🤳 Creating test influencer...");
    tempUser = await userRepo.create({
      email: `agg_test_${Date.now()}@example.com`,
      role: UserRole.INFLUENCER,
    });

    tempProfile = await Profile.create({
      userId: tempUser._id,
      fullName: "Aggregator Tester",
      bio: "Checking unified profile JSON",
      role: UserRole.INFLUENCER,
      username: `agg_user_${Date.now().toString().slice(-10)}`,
      instagramHandle: `agg_handle_${Date.now().toString().slice(-10)}`,
      instagram: {
        instagramId: "ig_agg_1784",
        username: "agg_tester_ig",
        accessToken: "encrypted_dummy",
        followersCount: 4500,
        connectedAt: new Date(),
      },
    });
    console.log(`✅ Test influencer profile created (ID: ${tempUser._id})`);

    // 3. Add mock Instagram media (one selected, one not)
    console.log("💾 Caching mock Instagram posts in database...");
    instagramItem = await InstagramMedia.create({
      userId: tempUser._id,
      mediaId: "ig_media_agg_111",
      caption: "Caching unified showcase post (selected)",
      mediaType: "IMAGE",
      mediaUrl: "https://mock-cdn.com/showcase.jpg",
      permalink: "https://www.instagram.com/p/showcase111/",
      selectedForPortfolio: true,
    });
    const unselectedInstagramItem = await InstagramMedia.create({
      userId: tempUser._id,
      mediaId: "ig_media_agg_222",
      caption: "Caching unified showcase post (unselected)",
      mediaType: "IMAGE",
      mediaUrl: "https://mock-cdn.com/unselected.jpg",
      permalink: "https://www.instagram.com/p/unselected222/",
      selectedForPortfolio: false,
    });
    console.log(`✅ Instagram Media created (Selected ID: ${instagramItem._id}, Unselected ID: ${unselectedInstagramItem._id})`);

    // 4. Add mock local portfolio media
    console.log("📤 Uploading mock local portfolio item...");
    const mockFile = {
      filename: "agg_portfolio_file.mp4",
      mimetype: "video/mp4",
      size: 9876,
    } as any;

    portfolioItem = await portfolioService.addPortfolioMedia(
      tempUser._id.toString(),
      "https://res.cloudinary.com/demo/video/upload/v1/test.mp4",
      "test/public-id",
      mockFile,
      "Aggregator Project",
      "Unified view demonstration clip"
    );
    console.log(`✅ Portfolio Media created (ID: ${portfolioItem._id})`);

    // 5. Query Unified Profile
    console.log("\n🔍 Test 5: Fetching unified Influencer Profile aggregation (Public View - showAll = false)...");
    const resultPublic = await profileService.getInfluencerFullProfile(tempUser._id.toString(), false);
    
    console.log("✅ Aggregation response received for public view:");
    
    // Assert Profile details
    console.log(`   Profile Name: ${resultPublic.profile.fullName}`);
    console.log(`   Instagram username: ${resultPublic.profile.instagram?.username}`);
    if (resultPublic.profile.fullName !== "Aggregator Tester") {
      throw new Error("Aggregated profile details incorrect");
    }

    // Assert Instagram media items
    console.log(`   Instagram posts count: ${resultPublic.instagramMedia.length}`);
    if (resultPublic.instagramMedia.length !== 1 || resultPublic.instagramMedia[0].mediaId !== "ig_media_agg_111") {
      throw new Error("Instagram media aggregation failed for public view");
    }

    // Assert Portfolio media items
    console.log(`   Portfolio items count: ${resultPublic.portfolioMedia.length}`);
    if (resultPublic.portfolioMedia.length !== 1 || resultPublic.portfolioMedia[0].mediaUrl !== "/static/portfolio/agg_portfolio_file.mp4") {
      throw new Error("Portfolio media aggregation failed");
    }

    console.log("\n🔍 Test 6: Fetching unified Influencer Profile aggregation (Owner View - showAll = true)...");
    const resultOwner = await profileService.getInfluencerFullProfile(tempUser._id.toString(), true);
    
    console.log("✅ Aggregation response received for owner view:");
    console.log(`   Instagram posts count: ${resultOwner.instagramMedia.length}`);
    if (resultOwner.instagramMedia.length !== 2) {
      throw new Error("Instagram media aggregation failed for owner view");
    }
    // Verify sorting order is newest first (ig_media_agg_222 created after ig_media_agg_111)
    if (resultOwner.instagramMedia[0].mediaId !== "ig_media_agg_222") {
      throw new Error("Sorting order in owner view is incorrect");
    }

    console.log("\n🎉 ALL AGGREGATOR SYSTEM INTEGRATION TESTS PASSED!");
  } catch (error) {
    console.error("❌ Integration Test failed:", error);
  } finally {
    // Cleanup database
    console.log("\nRule 🧹 Cleaning up test users, profiles, and media caches...");
    if (tempProfile) {
      await Profile.deleteOne({ _id: tempProfile._id });
    }
    if (tempUser) {
      await User.deleteOne({ _id: tempUser._id });
      await InstagramMedia.deleteMany({ userId: tempUser._id });
      await PortfolioMedia.deleteMany({ userId: tempUser._id });
    }
    
    await disconnectDatabase();
    console.log("📴 Database disconnected");
  }
};

runAggregatorTest();
