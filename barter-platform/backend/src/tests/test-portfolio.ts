import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { connectDatabase, disconnectDatabase } from "@shared/database/connection";
import { UserRepository } from "@modules/users/repositories/user.repository";
import { UserRole } from "@modules/users/models/user.model";
import { Profile } from "@modules/profile/models/profile.model";
import { User } from "@modules/users/models/user.model";
import { PortfolioService } from "@modules/portfolio/services/portfolio.service";
import { PortfolioMedia } from "@modules/portfolio/models/portfolio-media.model";

dotenv.config();

const testPortfolioSystem = async () => {
  console.log("🧪 Starting Portfolio Integration Test...\n");

  const userRepo = new UserRepository();
  const portfolioService = new PortfolioService();
  
  // Define temporary files
  const staticDir = path.join(__dirname, "../static/portfolio");
  const dummyImageName = `test-portfolio-image-${Date.now()}.jpg`;
  const dummyVideoName = `test-portfolio-video-${Date.now()}.mp4`;
  
  const dummyImagePath = path.join(staticDir, dummyImageName);
  const dummyVideoPath = path.join(staticDir, dummyVideoName);

  let tempUser: any = null;
  let tempProfile: any = null;
  let uploadedImageItem: any = null;
  let uploadedVideoItem: any = null;

  try {
    // 0. Connect to MongoDB
    await connectDatabase();
    console.log("✅ Connected to MongoDB");

    // Ensure directory exists
    if (!fs.existsSync(staticDir)) {
      fs.mkdirSync(staticDir, { recursive: true });
    }

    // Create physical dummy files on disk to test deletion
    fs.writeFileSync(dummyImagePath, "fake image data content");
    fs.writeFileSync(dummyVideoPath, "fake video data content");
    console.log("📁 Created physical dummy files on disk for testing");

    // 1. Create a dummy Influencer User
    console.log("🤳 Creating dummy Influencer...");
    tempUser = await userRepo.create({
      email: `portfolio_test_${Date.now()}@example.com`,
      role: UserRole.INFLUENCER,
    });

    tempProfile = await Profile.create({
      userId: tempUser._id,
      fullName: "Test Influencer",
      bio: "Doing integration testing",
      role: UserRole.INFLUENCER,
      username: `usr_${Date.now().toString().slice(-10)}`,
      instagramHandle: `ig_${Date.now().toString().slice(-10)}`,
    });
    console.log(`✅ Dummy Influencer created (ID: ${tempUser._id.toString()})\n`);

    // 2. Test Upload Image
    console.log("📤 Test 2: Uploading portfolio image...");
    const mockImageFile = {
      filename: dummyImageName,
      mimetype: "image/jpeg",
      size: 1024,
    } as any;

    uploadedImageItem = await portfolioService.addPortfolioMedia(
      tempUser._id.toString(),
      "https://res.cloudinary.com/demo/image/upload/v1/test.jpg",
      "test/image-public-id",
      mockImageFile,
      "My Test Image",
      "This is a test description"
    );

    console.log("✅ Image uploaded and record created:");
    console.log(`   ID: ${uploadedImageItem._id}`);
    console.log(`   Type: ${uploadedImageItem.mediaType}`);
    console.log(`   Url: ${uploadedImageItem.mediaUrl}\n`);

    // 3. Test Upload Video
    console.log("📤 Test 3: Uploading portfolio video...");
    const mockVideoFile = {
      filename: dummyVideoName,
      mimetype: "video/mp4",
      size: 5120,
    } as any;

    uploadedVideoItem = await portfolioService.addPortfolioMedia(
      tempUser._id.toString(),
      "https://res.cloudinary.com/demo/video/upload/v1/test.mp4",
      "test/video-public-id",
      mockVideoFile,
      "My Test Video",
      "This is a test video description"
    );

    console.log("✅ Video uploaded and record created:");
    console.log(`   ID: ${uploadedVideoItem._id}`);
    console.log(`   Type: ${uploadedVideoItem.mediaType}`);
    console.log(`   Url: ${uploadedVideoItem.mediaUrl}\n`);

    // 4. Test Listing portfolio items
    console.log("🔍 Test 4: Listing user portfolio items...");
    const items = await portfolioService.getPortfolioByUserId(tempUser._id.toString());
    console.log(`   Retrieved ${items.length} items from MongoDB`);
    
    if (items.length !== 2) {
      throw new Error(`Expected 2 items, but retrieved ${items.length}`);
    }

    // Verify ordering (newest first)
    if (items[0]._id.toString() !== uploadedVideoItem._id.toString()) {
      throw new Error("Sorting ordering is incorrect, video should be first");
    }
    console.log("✅ Portfolio listing and sorting verified!\n");

    // 5. Test Deleting portfolio items
    console.log("🗑️ Test 5: Deleting portfolio image...");
    await portfolioService.deletePortfolioMedia(
      tempUser._id.toString(),
      uploadedImageItem._id.toString()
    );

    // Verify database deletion
    const checkImageDb = await PortfolioMedia.findById(uploadedImageItem._id);
    if (checkImageDb) {
      throw new Error("Image document still exists in MongoDB after deletion");
    }

    // Verify physical file deletion
    if (fs.existsSync(dummyImagePath)) {
      throw new Error("Physical image file still exists on disk after deletion");
    }
    console.log("✅ Image record and physical file successfully deleted!");

    console.log("🗑️ Deleting portfolio video...");
    await portfolioService.deletePortfolioMedia(
      tempUser._id.toString(),
      uploadedVideoItem._id.toString()
    );

    // Verify database deletion
    const checkVideoDb = await PortfolioMedia.findById(uploadedVideoItem._id);
    if (checkVideoDb) {
      throw new Error("Video document still exists in MongoDB after deletion");
    }

    // Verify physical file deletion
    if (fs.existsSync(dummyVideoPath)) {
      throw new Error("Physical video file still exists on disk after deletion");
    }
    console.log("✅ Video record and physical file successfully deleted!\n");

    console.log("🎉 ALL PORTFOLIO SYSTEM INTEGRATION TESTS PASSED!");
  } catch (error) {
    console.error("❌ Integration Test failed:", error);
    
    // Attempt local file cleanup in case of crash
    if (fs.existsSync(dummyImagePath)) fs.unlinkSync(dummyImagePath);
    if (fs.existsSync(dummyVideoPath)) fs.unlinkSync(dummyVideoPath);
  } finally {
    // Cleanup users/profiles
    console.log("\n🧹 Cleaning up test users and profiles...");
    if (tempProfile) {
      await Profile.deleteOne({ _id: tempProfile._id });
    }
    if (tempUser) {
      await User.deleteOne({ _id: tempUser._id });
    }
    
    await disconnectDatabase();
    console.log("📴 Database disconnected");
  }
};

testPortfolioSystem();
