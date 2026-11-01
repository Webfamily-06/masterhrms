import crypto from "crypto";
import { prisma, rawPrisma } from "../prisma";
import { PushSubscriptionData } from "./vapid.service";

export interface StoredPushSubscription {
  id: string;
  tenantId: string;
  userId: string;
  deviceId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
  platform?: string;
  sessionTokenId?: string;
  createdAt: string;
  lastSeenAt: string;
  lastUsedAt?: string;
  revokedAt?: string | null;
  status: "active" | "inactive" | "expired" | "revoked";
}

// In-memory cache & fallback directory for instant lookup and hermetic offline testing
const inMemorySubscriptions = new Map<string, StoredPushSubscription[]>();

function getEndpointHash(endpoint: string): string {
  return crypto.createHash("sha256").update(endpoint).digest("hex").slice(0, 32);
}

export class PushSubscriptionStore {
  /**
   * Saves or updates a device-level Web Push subscription for a user within a verified tenant.
   * Explicitly associates deviceId, platform, and session ownership.
   */
  public static async saveSubscription(params: {
    tenantId: string;
    userId: string;
    subscription: PushSubscriptionData;
    userAgent?: string;
    deviceId?: string;
    platform?: string;
    sessionTokenId?: string;
  }): Promise<StoredPushSubscription> {
    const { tenantId, userId, subscription, userAgent, deviceId, platform, sessionTokenId } = params;
    const endpointHash = getEndpointHash(subscription.endpoint);
    const resolvedDeviceId = deviceId || `dev_${endpointHash.slice(0, 16)}`;
    const subId = `sub_${endpointHash}`;

    const record: StoredPushSubscription = {
      id: subId,
      tenantId,
      userId,
      deviceId: resolvedDeviceId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: userAgent || "Unknown Browser",
      platform: platform || "web",
      sessionTokenId,
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      revokedAt: null,
      status: "active",
    };

    // 1. Update in-memory map: match by endpoint or (userId + deviceId)
    const userSubs = inMemorySubscriptions.get(userId) || [];
    const filtered = userSubs.filter(
      (s) => s.endpoint !== subscription.endpoint && s.deviceId !== resolvedDeviceId
    );
    filtered.push(record);
    inMemorySubscriptions.set(userId, filtered);

    // 2. Persist to Setting table (USER scope) if database is accessible
    try {
      const db = rawPrisma || prisma;
      const key = `push_sub_${endpointHash}`;

      await db.setting.upsert({
        where: {
          scope_scopeId_key: {
            scope: "USER",
            scopeId: userId,
            key,
          },
        },
        create: {
          scope: "USER",
          scopeId: userId,
          group: "web_push",
          key,
          valueJson: record as any,
          valueType: "JSON",
          isSecret: false,
        },
        update: {
          valueJson: record as any,
          updatedAt: new Date(),
        },
      });
    } catch (err: any) {
      console.warn(`[PushSubscriptionStore] DB persistence skipped (${err.message}). Cached in-memory.`);
    }

    return record;
  }

  /**
   * Retrieves all currently active and non-revoked subscriptions for a user, verifying tenant isolation.
   */
  public static async getActiveSubscriptions(tenantId: string, userId: string): Promise<StoredPushSubscription[]> {
    // 1. Check in-memory store first
    let userSubs = inMemorySubscriptions.get(userId);

    // 2. Fall back to database query if cache is empty
    if (!userSubs || userSubs.length === 0) {
      try {
        const db = rawPrisma || prisma;
        const rows = await db.setting.findMany({
          where: {
            scope: "USER",
            scopeId: userId,
            group: "web_push",
          },
        });

        const loaded: StoredPushSubscription[] = [];
        for (const row of rows) {
          if (row.valueJson && typeof row.valueJson === "object") {
            const item = row.valueJson as any;
            if (item.tenantId === tenantId && item.status === "active") {
              loaded.push(item);
            }
          }
        }
        userSubs = loaded;
        inMemorySubscriptions.set(userId, loaded);
      } catch (err: any) {
        userSubs = inMemorySubscriptions.get(userId) || [];
      }
    }

    // 3. Strict tenant matching & status filter: only 'active' devices eligible for push
    return (userSubs || []).filter(
      (s) => s.tenantId === tenantId && s.status === "active" && !s.revokedAt
    );
  }

  /**
   * Device-Specific Revocation (Called on device logout).
   * Revokes ONLY the specified device/endpoint for this user.
   * Other active devices of the user remain authenticated and eligible for incoming calls.
   */
  public static async revokeDeviceSubscription(
    tenantId: string,
    userId: string,
    deviceIdOrEndpoint: string
  ): Promise<boolean> {
    const userSubs = inMemorySubscriptions.get(userId) || [];
    let modified = false;

    const updated = userSubs.map((s) => {
      if (
        s.tenantId === tenantId &&
        (s.endpoint === deviceIdOrEndpoint || s.deviceId === deviceIdOrEndpoint)
      ) {
        modified = true;
        return {
          ...s,
          status: "revoked" as const,
          revokedAt: new Date().toISOString(),
        };
      }
      return s;
    });

    inMemorySubscriptions.set(userId, updated);

    try {
      const db = rawPrisma || prisma;
      const endpointHash = getEndpointHash(deviceIdOrEndpoint);
      const key = `push_sub_${endpointHash}`;

      // Update in DB setting or delete record
      await db.setting.deleteMany({
        where: {
          scope: "USER",
          scopeId: userId,
          key,
        },
      });
    } catch {}

    return modified;
  }

  /**
   * Marks a subscription as expired after gateway HTTP 404/410.
   */
  public static async markExpired(userId: string, endpoint: string): Promise<void> {
    const userSubs = inMemorySubscriptions.get(userId) || [];
    const updated = userSubs.map((s) =>
      s.endpoint === endpoint
        ? { ...s, status: "expired" as const, revokedAt: new Date().toISOString() }
        : s
    );
    inMemorySubscriptions.set(userId, updated);

    try {
      const db = rawPrisma || prisma;
      const endpointHash = getEndpointHash(endpoint);
      const key = `push_sub_${endpointHash}`;

      await db.setting.deleteMany({
        where: {
          scope: "USER",
          scopeId: userId,
          key,
        },
      });
    } catch {}
  }

  /**
   * Removes all subscriptions for a specific user and endpoint.
   */
  public static async removeSubscription(tenantId: string, userId: string, endpoint: string): Promise<boolean> {
    return this.revokeDeviceSubscription(tenantId, userId, endpoint);
  }

  public static async unsubscribe(userId: string, endpoint: string): Promise<boolean> {
    const userSubs = inMemorySubscriptions.get(userId) || [];
    const remaining = userSubs.filter((s) => s.endpoint !== endpoint);
    inMemorySubscriptions.set(userId, remaining);

    try {
      const db = rawPrisma || prisma;
      const endpointHash = getEndpointHash(endpoint);
      const key = `push_sub_${endpointHash}`;

      await db.setting.deleteMany({
        where: {
          scope: "USER",
          scopeId: userId,
          key,
        },
      });
      return true;
    } catch {
      return true;
    }
  }
}
