import { ValidationError } from "@shared/errors/app-error";
import { Resend } from "resend";

// Email Service to send/simulate emails using Resend SDK
export class EmailService {
  private resend: Resend | null = null;
  private useMock = false;

  constructor() {
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      if (process.env.NODE_ENV === "development") {
        console.warn("⚠️ RESEND_API_KEY not configured. Email service will run in mock mode.");
        this.useMock = true;
      } else {
        console.error("❌ RESEND_API_KEY missing in production! Email service will fail to send emails.");
      }
      return;
    }

    try {
      this.resend = new Resend(resendApiKey);
      console.log("📧 Resend Email Service initialized successfully");
    } catch (error: any) {
      console.error("❌ Resend Email Service initialization failed:", error.message);
    }
  }

  // Send email containing the verification OTP code
  async sendOtpEmail(email: string, otp: string): Promise<void> {
    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError("Invalid email format");
    }

    const expiresInMinutes = process.env.OTP_EXPIRY_MINUTES || "10";

    // In development, if Resend is not configured, log email to console
    if (this.useMock || !this.resend) {
      if (process.env.NODE_ENV !== "development") {
        throw new Error("Resend transporter is not configured in production");
      }
      console.log(`
📧 ========== EMAIL SIMULATION ==========
To: ${email}
Subject: Verify your KonnectNow account

Your verification code is: ${otp}

This code will expire in ${expiresInMinutes} minutes.

If you didn't request this, please ignore this email.
==========================================
      `);
      return;
    }

    try {
      const fromName = process.env.EMAIL_FROM_NAME || "KonnectNow";
      const fromAddress = process.env.EMAIL_FROM_ADDRESS || "onboarding@resend.dev";
      const otpSpaced = otp.split("").join(" ");

      const response = await this.resend.emails.send({
        from: `${fromName} <${fromAddress}>`,
        to: email,
        subject: "Verify your KonnectNow account",
        text: `KonnectNow\n\nVerify your email address\n\nUse the verification code below to complete your registration:\n\n${otpSpaced}\n\nThis code expires in ${expiresInMinutes} minutes.\n\nIf you did not request this code, you can ignore this email.\n\nKonnectNow Team`,
        html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your KonnectNow account</title>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6f8; padding: 20px 0;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td align="center" style="background-color: #4f46e5; padding: 30px 20px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">KonnectNow</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px; color: #1f2937;">
              <h2 style="margin-top: 0; margin-bottom: 20px; font-size: 20px; font-weight: 600; color: #111827;">Verify your email address</h2>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #4b5563;">
                Use the verification code below to complete your registration:
              </p>
              
              <!-- OTP Box -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: #f3f4f6; border-radius: 6px; padding: 15px 30px; letter-spacing: 6px; font-family: monospace; font-size: 32px; font-weight: bold; color: #4f46e5; border: 1px solid #e5e7eb;">
                      ${otpSpaced}
                    </div>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.5; color: #6b7280;">
                This code expires in <strong>${expiresInMinutes} minutes</strong>.
              </p>
              <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #9ca3af;">
                If you did not request this code, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #f9fafb; padding: 20px; border-top: 1px solid #f3f4f6;">
              <p style="margin: 0; font-size: 14px; color: #6b7280; font-weight: 500;">
                KonnectNow Team
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
      });

      if (response.error) {
        throw response.error;
      }
    } catch (error: any) {
      console.error(`❌ Error sending email to ${email}:`, error.message || error);
      throw new Error("Email delivery failed");
    }
  }

  // Send welcome email after registration completes
  async sendWelcomeEmail(email: string, name?: string): Promise<void> {
    if (process.env.NODE_ENV === "development") {
      console.log(`
📧 ========== WELCOME EMAIL ==========
To: ${email}
Subject: Welcome to Barter Platform!

Welcome${name ? ` ${name}` : ""}! 

Your account has been successfully created.

Get started by completing your profile and exploring collaboration opportunities.

Best regards,
Barter Platform Team
========================================
      `);
    }
  }

  // Send password creation confirmation email
  async sendPasswordSetConfirmation(email: string): Promise<void> {
    if (process.env.NODE_ENV === "development") {
      console.log(`
📧 ========== PASSWORD SET ==========
To: ${email}
Subject: Password Successfully Set

Your password has been successfully set.

You can now login to your account at any time.

If you didn't do this, please contact support immediately.
====================================
      `);
    }
  }
}
