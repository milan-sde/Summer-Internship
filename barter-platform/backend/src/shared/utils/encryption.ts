import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

// Resolve the secret key: it must be exactly 32 bytes (256 bits).
// We check process.env.ENCRYPTION_KEY, and fallback to hashing process.env.JWT_ACCESS_SECRET if needed.
const getSecretKey = (): Buffer => {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey && envKey.length === 32) {
    return Buffer.from(envKey);
  }
  
  // Hash the JWT secret to always get a stable 32-byte key
  const fallbackSecret = process.env.JWT_ACCESS_SECRET || "fallback-barter-secret-key-32-chars";
  return crypto.createHash("sha256").update(fallbackSecret).digest();
};

/**
 * Encrypts a plaintext string to hex output using AES-256-CBC.
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getSecretKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  // Format: iv_hex:ciphertext_hex
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts a previously encrypted string.
 */
export function decrypt(encryptedText: string): string {
  try {
    const textParts = encryptedText.split(":");
    if (textParts.length !== 2) {
      throw new Error("Invalid encrypted format");
    }
    
    const iv = Buffer.from(textParts[0], "hex");
    const encryptedData = Buffer.from(textParts[1], "hex");
    const key = getSecretKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt secure data");
  }
}
