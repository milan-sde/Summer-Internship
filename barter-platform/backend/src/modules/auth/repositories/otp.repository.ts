import { Otp, IOtp } from "../models/otp.model";

type OtpPurpose = "email_verification" | "password_reset";

export class OtpRepository {
  async create(data: Partial<IOtp>): Promise<IOtp> {
    const otp = new Otp(data);
    return otp.save();
  }

  async findValid(email: string, purpose: OtpPurpose): Promise<IOtp | null> {
    return Otp.findOne({
      email: email.toLowerCase(),
      purpose,
      verifiedAt: null,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });
  }

  async incrementAttempts(id: string): Promise<void> {
    await Otp.findByIdAndUpdate(id, { $inc: { attempts: 1 } });
  }

  async markVerified(id: string): Promise<void> {
    await Otp.findByIdAndUpdate(id, { verifiedAt: new Date() });
  }

  async deleteForEmail(email: string, purpose: OtpPurpose): Promise<void> {
    await Otp.deleteMany({ email: email.toLowerCase(), purpose });
  }
}
