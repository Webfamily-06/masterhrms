/**
 * MASTERHRMS — Device Session Service
 *
 * Provides secure per-device session management:
 * - Session creation on login
 * - Refresh token hashing and rotation
 * - Individual device logout
 * - Logout from all devices
 * - Session listing for security UI
 */

import crypto from "crypto";
import { rawPrisma as prisma } from "../prisma";
import { parseUserAgent } from "./login-history.service";

const SESSION_EXPIRY_DAYS = 30;
const REFRESH_TOKEN_BYTES = 48;

export function generateSecureRefreshToken(): string {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export interface CreateSessionOptions {
  userId: string;
  tenantId?: string | null;
  ipAddress?: string;
  userAgent?: string;
}

export async function createDeviceSession(options: CreateSessionOptions): Promise<{
  sessionId: string;
  refreshToken: string;
}> {
  const { userId, tenantId, ipAddress, userAgent } = options;
  const { browser_name, os_name, device_type } = parseUserAgent(userAgent);

  const refreshToken = generateSecureRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

  const session = await prisma.deviceSession.create({
    data: {
      userId,
      tenantId: tenantId || null,
      deviceType: device_type,
      browser: browser_name,
      operatingSystem: os_name,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      refreshTokenHash,
      lastActiveAt: new Date(),
      expiresAt,
      revoked: false,
    },
  });

  return { sessionId: session.id, refreshToken };
}

export async function rotateRefreshToken(
  sessionId: string,
  currentTokenHash: string
): Promise<{ refreshToken: string } | null> {
  const session = await prisma.deviceSession.findUnique({ where: { id: sessionId } });

  if (!session || session.revoked || !session.refreshTokenHash) return null;
  if (session.expiresAt && session.expiresAt < new Date()) return null;

  // Reuse attack detection — hash mismatch means token was already rotated
  if (session.refreshTokenHash !== currentTokenHash) {
    // Revoke session to protect against token theft
    await prisma.deviceSession.update({
      where: { id: sessionId },
      data: { revoked: true, revokedAt: new Date() },
    });
    return null;
  }

  const newToken = generateSecureRefreshToken();
  const newHash = hashRefreshToken(newToken);

  await prisma.deviceSession.update({
    where: { id: sessionId },
    data: {
      refreshTokenHash: newHash,
      lastActiveAt: new Date(),
    },
  });

  return { refreshToken: newToken };
}

export async function revokeSession(sessionId: string, userId: string): Promise<boolean> {
  const session = await prisma.deviceSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) return false;

  await prisma.deviceSession.update({
    where: { id: sessionId },
    data: { revoked: true, revokedAt: new Date() },
  });
  return true;
}

export async function revokeAllSessions(userId: string, tenantId?: string): Promise<number> {
  const result = await prisma.deviceSession.updateMany({
    where: {
      userId,
      ...(tenantId ? { tenantId } : {}),
      revoked: false,
    },
    data: { revoked: true, revokedAt: new Date() },
  });
  return result.count;
}

export async function getActiveSessions(userId: string, tenantId?: string) {
  return prisma.deviceSession.findMany({
    where: {
      userId,
      ...(tenantId ? { tenantId } : {}),
      revoked: false,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { lastActiveAt: "desc" },
    select: {
      id: true,
      deviceType: true,
      browser: true,
      operatingSystem: true,
      ipAddress: true,
      country: true,
      city: true,
      createdAt: true,
      lastActiveAt: true,
      expiresAt: true,
      // Never expose refreshTokenHash
    },
  });
}

export async function touchSession(sessionId: string): Promise<void> {
  await prisma.deviceSession.updateMany({
    where: { id: sessionId, revoked: false },
    data: { lastActiveAt: new Date() },
  }).catch(() => {});
}
