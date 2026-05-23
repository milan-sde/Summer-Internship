import { ValidationError } from "@shared/errors/app-error";

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Email Service - Handles all email communications
 *
 * PRODUCTION NOTE: Integrate with:
 * - SendGrid
 * - AWS SES
 * - Resend.com
 * - Nodemailer with SMTP
 */
export class EmailService {
  /**
   * Send OTP email
   * In production, this would actually send an email
   */
  async sendOtpEmail(email: string, otp: string): Promise<void> {
    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError("Invalid email format");
    }

    // In development, just log
    if (process.env.NODE_ENV === "development") {
      console.log(`
📧 ========== EMAIL SIMULATION ==========
To: ${email}
Subject: Your Barter Platform Verification Code

Your verification code is: ${otp}

This code will expire in 10 minutes.

If you didn't request this, please ignore this email.
==========================================
      `);
      return;
    }

    // Production email sending would go here
    // Example with a service:
    // await sendGrid.send({
    //   to: email,
    //   from: 'noreply@barterplatform.com',
    //   subject: 'Your Barter Platform Verification Code',
    //   text: `Your verification code is: ${otp}`,
    //   html: `<strong>Your verification code is: ${otp}</strong>`
    // });
  }

  /**
   * Send welcome email after successful registration
   */
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

  /**
   * Send password set confirmation
   */
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
