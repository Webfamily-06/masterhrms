import crypto from "crypto";
import { prisma } from "../prisma";

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Generate cryptographically secure 6-digit numeric OTP
 */
export function generateSecureOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hash OTP using SHA-256 for secure database storage
 */
export function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp.trim()).digest("hex");
}

/**
 * Mask email address for secure public display: e.g. john.doe@company.com -> j••••e@company.com
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "••••@••••";
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return local.charAt(0) + "•••@" + domain;
  }
  const first = local.charAt(0);
  const last = local.charAt(local.length - 1);
  return first + "•".repeat(Math.max(local.length - 2, 4)) + last + "@" + domain;
}

/**
 * Check if user is eligible to resend OTP based on 30s cooldown
 */
export async function checkResendEligibility(userId: string): Promise<{
  allowed: boolean;
  secondsRemaining: number;
}> {
  const latestOtp = await prisma.twoFactorOtp.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (!latestOtp) {
    return { allowed: true, secondsRemaining: 0 };
  }

  const elapsedMs = Date.now() - latestOtp.createdAt.getTime();
  const cooldownMs = RESEND_COOLDOWN_SECONDS * 1000;

  if (elapsedMs < cooldownMs) {
    const remainingSec = Math.ceil((cooldownMs - elapsedMs) / 1000);
    return { allowed: false, secondsRemaining: remainingSec };
  }

  return { allowed: true, secondsRemaining: 0 };
}

/**
 * Invalidate existing OTPs and generate a fresh 6-digit OTP
 */
export async function createOrReplaceOtp(userId: string): Promise<{
  otp: string;
  expiresAt: Date;
}> {
  // Invalidate any existing unused OTPs
  await prisma.twoFactorOtp.updateMany({
    where: {
      userId,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });

  const otp = generateSecureOtp();
  const codeHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.twoFactorOtp.create({
    data: {
      userId,
      codeHash,
      expiresAt,
      attemptCount: 0,
    },
  });

  return { otp, expiresAt };
}

/**
 * Verify submitted OTP against database hash
 */
export async function verifyOtpCode(
  userId: string,
  rawCode: string
): Promise<{ valid: boolean; error?: string }> {
  const cleanCode = String(rawCode || "").trim().replace(/\s+/g, "");

  if (!/^\d{6}$/.test(cleanCode)) {
    return { valid: false, error: "Please enter a valid 6-digit verification code." };
  }

  const latestOtp = await prisma.twoFactorOtp.findFirst({
    where: {
      userId,
      usedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!latestOtp) {
    return {
      valid: false,
      error: "This verification code has expired or was not requested. Please request a new code.",
    };
  }

  // Check Expiration
  if (latestOtp.expiresAt.getTime() < Date.now()) {
    await prisma.twoFactorOtp.update({
      where: { id: latestOtp.id },
      data: { usedAt: new Date() },
    });
    return {
      valid: false,
      error: "This verification code has expired. Please request a new code.",
    };
  }

  // Check Attempt Limit
  if (latestOtp.attemptCount >= MAX_ATTEMPTS) {
    await prisma.twoFactorOtp.update({
      where: { id: latestOtp.id },
      data: { usedAt: new Date() },
    });
    return {
      valid: false,
      error: "Too many incorrect attempts. This code has been invalidated. Please request a new code.",
    };
  }

  const inputHash = hashOtp(cleanCode);

  if (inputHash !== latestOtp.codeHash) {
    const newCount = latestOtp.attemptCount + 1;
    await prisma.twoFactorOtp.update({
      where: { id: latestOtp.id },
      data: { attemptCount: newCount },
    });

    const remaining = MAX_ATTEMPTS - newCount;
    if (remaining <= 0) {
      return {
        valid: false,
        error: "Too many incorrect attempts. This code has been invalidated. Please request a new code.",
      };
    }

    return {
      valid: false,
      error: "Invalid verification code. " + remaining + " attempt" + (remaining === 1 ? "" : "s") + " remaining.",
    };
  }

  // OTP Matches! Mark as verified and used
  await prisma.twoFactorOtp.update({
    where: { id: latestOtp.id },
    data: {
      verifiedAt: new Date(),
      usedAt: new Date(),
    },
  });

  return { valid: true };
}
