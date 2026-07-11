import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../../../.env") });

import { v2 as cloudinary } from "cloudinary";

import { Profile } from "../modules/profile/models/profile.model";
import { PortfolioMedia } from "../modules/portfolio/models/portfolio-media.model";
import { ContentSubmission } from "../modules/campaign/models/content-submission.model";
import { User } from "../modules/users/models/user.model";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error("Missing Cloudinary environment variables. Populate them in .env before migrating.");
  process.exit(1);
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

async function runMigration() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI is not defined in environment.");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB successfully!");

  const staticBaseDir = path.join(__dirname, "../../static");
  console.log(`Static base directory resolved to: ${staticBaseDir}`);

  // ================= 1. PROFILE AVATARS =================
  console.log("\n--- Migrating Profile Avatars ---");
  const profiles = await Profile.find({ avatarUrl: { $regex: /\/static\// } });
  console.log(`Found ${profiles.length} profiles with local avatar paths.`);

  let profileSuccess = 0;
  let profileMissing = 0;

  for (const profile of profiles) {
    let relativeUrl = profile.avatarUrl || "";

    if (relativeUrl.includes("http://localhost:3000")) {
      relativeUrl = relativeUrl.replace("http://localhost:3000", "");
    }

    const filename = relativeUrl.replace("/static/avatars/", "");
    const absolutePath = path.join(staticBaseDir, "avatars", filename);

    if (fs.existsSync(absolutePath)) {
      const folder = profile.role === "BRAND" ? "konnectnow/brands/logos" : "konnectnow/influencers/avatars";
      try {
        console.log(`Uploading avatar for ${profile.fullName} (${absolutePath})...`);
        const uploadResult = await cloudinary.uploader.upload(absolutePath, {
          folder,
          resource_type: "image",
        });

        profile.avatarUrl = uploadResult.secure_url;
        (profile as any).avatarPublicId = uploadResult.public_id;
        await profile.save();

        await User.updateOne({ _id: profile.userId }, { avatar: uploadResult.secure_url });

        console.log(`Success: ${profile.fullName} -> ${uploadResult.secure_url}`);
        profileSuccess++;
      } catch (err) {
        console.error(`Failed to upload avatar for profile ${profile._id}:`, err);
      }
    } else {
      console.warn(`Missing local file: No avatar found for ${profile.fullName} at ${absolutePath}`);
      profileMissing++;
    }
  }

  // ================= 2. PORTFOLIO SHOWCASE =================
  console.log("\n--- Migrating Portfolio Showcase Media ---");
  const portfolioItems = await PortfolioMedia.find({ mediaUrl: { $regex: /\/static\// } });
  console.log(`Found ${portfolioItems.length} portfolio items with local paths.`);

  let portfolioSuccess = 0;
  let portfolioMissing = 0;

  for (const item of portfolioItems) {
    const filename = item.mediaUrl.replace("/static/portfolio/", "");
    const absolutePath = path.join(staticBaseDir, "portfolio", filename);
    const resourceType = item.mediaType === "video" ? "video" : "image";

    if (fs.existsSync(absolutePath)) {
      try {
        console.log(`Uploading portfolio media (${absolutePath})...`);
        const uploadResult = await cloudinary.uploader.upload(absolutePath, {
          folder: "konnectnow/influencers/portfolio",
          resource_type: resourceType,
        });

        item.mediaUrl = uploadResult.secure_url;
        (item as any).mediaPublicId = uploadResult.public_id;
        await item.save();

        console.log(`Success: Item ${item.title || item._id} -> ${uploadResult.secure_url}`);
        portfolioSuccess++;
      } catch (err) {
        console.error(`Failed to upload portfolio item ${item._id}:`, err);
      }
    } else {
      console.warn(`Missing local file: No media found for portfolio item ${item._id} at ${absolutePath}`);
      portfolioMissing++;
    }
  }

  // ================= 3. CONTENT WORKSPACE DELIVERABLES =================
  console.log("\n--- Migrating Campaign Content Deliverables ---");
  const submissions = await ContentSubmission.find({ mediaUrl: { $regex: /\/static\// } });
  console.log(`Found ${submissions.length} content submissions with local paths.`);

  let submissionSuccess = 0;
  let submissionMissing = 0;

  for (const sub of submissions) {
    const filename = sub.mediaUrl.replace("/static/campaigns/", "");
    const absolutePath = path.join(staticBaseDir, "campaigns", filename);
    const resourceType = sub.mediaType === "VIDEO" ? "video" : "image";

    if (fs.existsSync(absolutePath)) {
      const folder = sub.mediaType === "VIDEO" ? "konnectnow/deliverables/reels" : "konnectnow/deliverables/images";
      try {
        console.log(`Uploading deliverable (${absolutePath})...`);
        const uploadResult = await cloudinary.uploader.upload(absolutePath, {
          folder,
          resource_type: resourceType,
        });

        sub.mediaUrl = uploadResult.secure_url;
        sub.mediaPublicId = uploadResult.public_id;
        await sub.save();

        console.log(`Success: Submission ${sub._id} -> ${uploadResult.secure_url}`);
        submissionSuccess++;
      } catch (err) {
        console.error(`Failed to upload content submission ${sub._id}:`, err);
      }
    } else {
      console.warn(`Missing local file: No media found for submission ${sub._id} at ${absolutePath}`);
      submissionMissing++;
    }
  }

  console.log("\n================ Migration Summary ================");
  console.log(`Profile Avatars:    Success: ${profileSuccess}, Missing/Failed: ${profileMissing}`);
  console.log(`Portfolio Items:    Success: ${portfolioSuccess}, Missing/Failed: ${portfolioMissing}`);
  console.log(`Submissions:        Success: ${submissionSuccess}, Missing/Failed: ${submissionMissing}`);
  console.log("===================================================\n");

  await mongoose.disconnect();
  console.log("Database disconnected. Migration process completed!");
}

runMigration().catch((err) => {
  console.error("Fatal migration error:", err);
  process.exit(1);
});
