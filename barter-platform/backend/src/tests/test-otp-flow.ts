import dotenv from "dotenv";
dotenv.config();

import { connectDatabase, disconnectDatabase } from "@shared/database/connection";
import { AuthService } from "@modules/auth/services/auth.service";
import { OtpService } from "@modules/auth/services/otp.service";
import { EmailService } from "@modules/auth/services/email.service";
import { UserRepository } from "@modules/users/repositories/user.repository";
import { ValidationError } from "@shared/errors/app-error";

async function runOtpTests() {
  console.log("🧪 Starting OTP Integration & Security Tests...\n");
  
  await connectDatabase();
  const authService = new AuthService();
  const userRepo = new UserRepository();
  const otpService = new OtpService();
  const emailService = new EmailService();

  const testEmail = `otp_test_${Date.now()}@example.com`;

  try {
    // ----------------------------------------------------
    // TEST 1: Cryptographically Secure & Pad Leading Zeros
    // ----------------------------------------------------
    console.log("   TEST 1: Secure OTP Generation & Format...");
    const otp1 = otpService.generateAndStoreOtp(testEmail);
    if (otp1.length !== 6 || isNaN(Number(otp1))) {
      throw new Error(`OTP is not 6 numeric digits: ${otp1}`);
    }
    console.log(`   ✅ OTP generated successfully: ${otp1} (Length: ${otp1.length})`);

    // Verify store size
    const storeSizeBefore = otpService.getStoreSize();
    if (storeSizeBefore !== 1) {
      throw new Error(`Store size should be 1, but got ${storeSizeBefore}`);
    }
    
    // ----------------------------------------------------
    // TEST 2: Verification with Wrong OTP
    // ----------------------------------------------------
    console.log("\n   TEST 2: Verification with Wrong OTP...");
    try {
      otpService.verifyOtp(testEmail, "999999");
      throw new Error("Wrong OTP should have thrown ValidationError");
    } catch (error: any) {
      if (!(error instanceof ValidationError) || !error.message.includes("Invalid OTP")) {
        throw new Error(`Expected ValidationError with 'Invalid OTP', got: ${error.message}`);
      }
      console.log(`   ✅ Wrong OTP rejected as expected: ${error.message}`);
    }

    // ----------------------------------------------------
    // TEST 3: Resend Cooldown
    // ----------------------------------------------------
    console.log("\n   TEST 3: Resend Cooldown Enforcement...");
    try {
      otpService.resendOtp(testEmail);
      throw new Error("Resending OTP immediately should have failed cooldown check");
    } catch (error: any) {
      if (!(error instanceof ValidationError) || !error.message.includes("wait")) {
        throw new Error(`Expected cooldown error, got: ${error.message}`);
      }
      console.log(`   ✅ Resend cooldown enforced: ${error.message}`);
    }

    // Bypass cooldown for testing subsequent steps
    otpService.deleteOtp(testEmail);
    const otp2 = otpService.generateAndStoreOtp(testEmail);
    console.log(`   ✅ OTP generated after bypassing cooldown: ${otp2}`);

    // ----------------------------------------------------
    // TEST 4: Expired OTP
    // ----------------------------------------------------
    console.log("\n   TEST 4: Expired OTP Validation...");
    const stored = (otpService as any).otpStore.get(testEmail);
    if (stored) {
      stored.expiresAt = new Date(Date.now() - 1000); // 1 second in the past
      (otpService as any).otpStore.set(testEmail, stored);
    }
    
    try {
      otpService.verifyOtp(testEmail, otp2);
      throw new Error("Expired OTP should have thrown ValidationError");
    } catch (error: any) {
      if (!(error instanceof ValidationError) || !error.message.includes("expired")) {
        throw new Error(`Expected expiration error, got: ${error.message}`);
      }
      console.log(`   ✅ Expired OTP rejected as expected: ${error.message}`);
    }

    // ----------------------------------------------------
    // TEST 5: Verification & Reuse Prevention
    // ----------------------------------------------------
    console.log("\n   TEST 5: OTP Verification & Reuse Prevention...");
    otpService.deleteOtp(testEmail);
    const otp3 = otpService.generateAndStoreOtp(testEmail);
    
    const isValid = otpService.verifyOtp(testEmail, otp3);
    if (!isValid) {
      throw new Error("OTP verification failed for valid OTP");
    }
    console.log("   ✅ OTP verified successfully");

    try {
      otpService.verifyOtp(testEmail, otp3);
      throw new Error("Reusing OTP should have failed");
    } catch (error: any) {
      if (!(error instanceof ValidationError) || !error.message.includes("not found")) {
        throw new Error(`Expected not found error on reuse, got: ${error.message}`);
      }
      console.log(`   ✅ OTP reuse prevented successfully: ${error.message}`);
    }

    // ----------------------------------------------------
    // TEST 6: SMTP Failure DB/Store Consistency
    // ----------------------------------------------------
    console.log("\n   TEST 6: SMTP Failure Handling...");
    const originalSendEmail = emailService.sendOtpEmail;
    emailService.sendOtpEmail = async () => {
      throw new Error("SMTP server connection timeout");
    };

    (authService as any).emailService = emailService;
    const testRegistrationEmail = `smtp_fail_${Date.now()}@example.com`;
    
    try {
      await authService.register({
        email: testRegistrationEmail,
        role: "INFLUENCER" as any,
      });
      throw new Error("Registration should have failed due to SMTP error");
    } catch (error: any) {
      if (!(error instanceof ValidationError) || !error.message.includes("Unable to send verification email")) {
        throw new Error(`Expected SMTP failure error, got: ${error.message}`);
      }
      console.log(`   ✅ SMTP failure caught safely, returned user-friendly message: ${error.message}`);
      
      const hasOtp = (authService as any).otpService.hasValidOtp(testRegistrationEmail);
      if (hasOtp) {
        throw new Error("OTP was not cleaned up after SMTP failure!");
      }
      console.log("   ✅ OTP state cleaned up successfully from the store");
    } finally {
      emailService.sendOtpEmail = originalSendEmail;
      const failedUser = await userRepo.findByEmail(testRegistrationEmail);
      if (failedUser) {
        await userRepo.delete(failedUser._id.toString());
      }
    }

    // ----------------------------------------------------
    // TEST 7: End-to-End Success Path
    // ----------------------------------------------------
    console.log("\n   TEST 7: End-to-End Registration & Verification Flow...");
    const successEmail = `e2e_success_${Date.now()}@example.com`;
    
    let capturedOtp = "";
    const originalSendOtp = (authService as any).emailService.sendOtpEmail;
    (authService as any).emailService.sendOtpEmail = async (email: string, otp: string) => {
      capturedOtp = otp;
      console.log(`   [Mock Interceptor] Captured OTP sent to ${email}: ${otp}`);
    };

    await authService.register({
      email: successEmail,
      role: "INFLUENCER" as any,
    });

    if (!capturedOtp) {
      throw new Error("OTP was not captured during registration");
    }

    const dbUser = await userRepo.findByEmail(successEmail);
    if (!dbUser || dbUser.isEmailVerified) {
      throw new Error("User should exist in database and be unverified");
    }
    console.log(`   ✅ User created in database and is unverified (isEmailVerified: ${dbUser.isEmailVerified})`);

    await authService.verifyOtp({
      email: successEmail,
      otp: capturedOtp,
    });

    const dbUserAfter = await userRepo.findByEmail(successEmail);
    if (!dbUserAfter || !dbUserAfter.isEmailVerified) {
      throw new Error("User should now be verified in database");
    }
    console.log(`   ✅ User successfully verified (isEmailVerified: ${dbUserAfter.isEmailVerified})`);

    // Clean up
    await userRepo.delete(dbUserAfter._id.toString());
    (authService as any).emailService.sendOtpEmail = originalSendOtp;

    console.log("\n🎉 ALL OTP AND SECURITY INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉");

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  } finally {
    const testUser = await userRepo.findByEmail(testEmail);
    if (testUser) {
      await userRepo.delete(testUser._id.toString());
    }
    await disconnectDatabase();
    console.log("\n📴 Database disconnected");
  }
}

runOtpTests();
