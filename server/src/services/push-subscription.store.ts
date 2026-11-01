import crypto from "crypto";
import { prisma, rawPrisma } from "../prisma";
import { PushSubscriptionData } from "./vapid.service";

export interface StoredPushSubscription {
  id: string;
  tenantId: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
  createdAt: string;
  lastUsedAt?: string;
  status: "active" | "inactive" | "expired";
}

// In-memory cache & fallback directory for instant lookup and hermetic offline testing
const inMemorySubscriptions = new Map<string, StoredPushSubscription[]>();

function getEndpointHash(endpoint: string): string {
  return crypto.createHash("sha256").update(endpoint).digest("hex").slice(0, 32);
}

export class PushSubscriptionStore {
  /**
   * Saves or updates a Web Push subscription for a user within a verified tenant.
   */
  public static async saveSubscription(params: {
    tenantId: string;
    userId: string;
    subscription: PushSubscriptionData;
    userAgent?: string;
  }): Promise<StoredPushSubscription> {
    const { tenantId, userId, subscription, userAgent } = params;
    const endpointHash = getEndpointHash(subscription.endpoint);
    const subId = `sub_${endpointHash}`;

    const record: StoredPushSubscription = {
      id: subId,
      tenantId,
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: userAgent || "Unknown Browser",
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      status: "active",
    };

    // 1. Update in-memory map
    const userSubs = inMemorySubscriptions.get(userId) || [];
    const filtered = userSubs.filter((s) => s.endpoint !== subscription.endpoint);
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
      // Non-fatal: in-memory record ensures delivery even during database connection outages
      console.warn(`[PushSubscriptionStore] DB persistence skipped (${err.message}). Cached in-memory.`);
    }

    return record;
  }

  /**
   * Retrieves all active subscriptions for a user, verifying tenant isolation.
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

    // 3. Strict tenant matching
    return (userSubs || []).filter((s) => s.tenantId === tenantId && s.status === "active");
  }

  /**
   * Marks a subscription as expired or removes it.
   */
  public static async markExpired(userId: string, endpoint: string): Promise<void> {
    const userSubs = inMemorySubscriptions.get(userId) || [];
    const updated = userSubs.map((s) => (s.endpoint === endpoint ? { ...s, status: "expired" as const } : s));
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
    } catch (err: any) {
      // In-memory update took effect
    }
  }

  /**
   * Removes all subscriptions for a specific user and endpoint.
   */
  public static async removeSubscription(tenantId: string, userId: string, endpoint: string): Promise<boolean> {
    return this.unsubscribe(userId, endpoint);
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
