// src/test-db.ts
import dotenv from "dotenv";
import {
  connectDatabase,
  disconnectDatabase,
} from "@shared/database/connection";
import { UserRepository } from "@modules/users/repositories/user.repository";
import { UserRole } from "@modules/users/models/user.model";

dotenv.config();

const testDatabase = async () => {
  console.log("🧪 Starting database test...\n");

  try {
    // Connect to database
    await connectDatabase();
    console.log("✅ Connected to database\n");

    const userRepo = new UserRepository();

    // Test 1: Create a user
    console.log("📝 Test 1: Creating user...");
    const testEmail = `test_${Date.now()}@example.com`;
    const user = await userRepo.create({
      email: testEmail,
      role: UserRole.INFLUENCER,
    });
    console.log(`✅ User created with ID: ${user._id.toString()}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}\n`);

    // Test 2: Find user by email
    console.log("🔍 Test 2: Finding user by email...");
    const foundUser = await userRepo.findByEmail(testEmail);
    if (foundUser) {
      console.log(`✅ User found: ${foundUser.email}\n`);
    } else {
      console.log("❌ User not found\n");
    }

    // Test 3: Complete onboarding using repository helper
    console.log("📝 Test 3: Completing onboarding...");
    const updatedUser = await userRepo.completeOnboarding(user._id.toString());
    console.log(`✅ Onboarding completed: ${updatedUser.onBoardingCompleted}\n`);

    // Test 4: Count users by role
    console.log("📊 Test 4: Counting users by role...");
    const influencerCount = await userRepo.countByRole(UserRole.INFLUENCER);
    console.log(`✅ Influencers count: ${influencerCount}\n`);

    // Test 5: Delete user (cleanup)
    console.log("🗑️ Test 5: Cleaning up...");
    await userRepo.delete(user._id.toString());
    console.log("✅ User deleted\n");

    console.log("🎉 All tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await disconnectDatabase();
    console.log("\n📴 Database disconnected");
  }
};

// Run the test
testDatabase();
