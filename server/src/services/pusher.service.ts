import Pusher from "pusher";
import zlib from "zlib";
import { prisma } from "../prisma";
import { trackBackgroundTask } from "../lib/background-tasks";

let pusherInstance: Pusher | null = null;
let pusherConfigInitialized = false;
let lastConfigFingerprint = "";
let cachedConfig: { value: PusherConfig; expiresAt: number } | null = null;
const CONFIG_CACHE_MS = 30_000;
// Pusher Channels rejects event payloads above 10KB. WebRTC SDP offers/answers (especially
// renegotiation offers when screen sharing) can approach that, so larger payloads are
// gzip-compressed and the client transparently inflates `__gz` envelopes.
const PUSHER_SAFE_PAYLOAD_BYTES = 9000;

export interface PusherConfig {
  appId: string;
  key: string;
  secret: string;
  cluster: string;
  useTLS: boolean;
  enabled: boolean;
}

function encodePayloadForPusher(payload: any): any {
  try {
    const json = JSON.stringify(payload);
    if (Buffer.byteLength(json, "utf8") <= PUSHER_SAFE_PAYLOAD_BYTES) return payload;
    const gz = zlib.gzipSync(Buffer.from(json, "utf8")).toString("base64");
    return {
      __gz: gz,
      callId: payload?.callId,
      tenantId: payload?.tenantId,
      timestamp: payload?.timestamp,
    };
  } catch {
    return payload;
  }
}

export class PusherService {
  /**
   * Resets the cached singleton instance to force re-instantiation on config changes.
   */
  public static resetInstance(): void {
    pusherInstance = null;
    pusherConfigInitialized = false;
    lastConfigFingerprint = "";
    cachedConfig = null;
  }

  /**
   * Resolves Pusher configuration (cached for 30s so realtime call signaling does not pay
   * two database round-trips per relayed SDP/ICE packet).
   */
  public static async getConfig(): Promise<PusherConfig> {
    if (cachedConfig && cachedConfig.expiresAt > Date.now()) {
      return cachedConfig.value;
    }
    const value = await this.loadConfig();
    cachedConfig = { value, expiresAt: Date.now() + CONFIG_CACHE_MS };
    return value;
  }

  /**
   * Resolves Pusher configuration from SettingsService, CMS Settings (system-platform-settings), or Environment.
   */
  private static async loadConfig(): Promise<PusherConfig> {
    let appId = process.env.PUSHER_APP_ID || process.env.VITE_PUSHER_APP_ID || "";
    let key = process.env.PUSHER_KEY || process.env.VITE_PUSHER_KEY || "";
    let secret = process.env.PUSHER_SECRET || process.env.VITE_PUSHER_SECRET || "";
    let cluster = process.env.PUSHER_CLUSTER || process.env.VITE_PUSHER_CLUSTER || "ap2";
    let enabled = process.env.VITE_PUSHER_ENABLED !== "false";

    try {
      // 1. Legacy CMS platform settings fallback ("system-platform-settings" / "global-super-settings")
      try {
        const page = await prisma.cmsPage.findFirst({
          where: { slug: { in: ["system-platform-settings", "global-super-settings"] } },
          orderBy: { updatedAt: "desc" },
        });
        if (page?.content) {
          const c = typeof page.content === "string" ? JSON.parse(page.content) : (page.content as any);
          if (c.pusherAppId) appId = c.pusherAppId;
          if (c.pusherKey) key = c.pusherKey;
          const secretCandidate = c.pusherSecret || c.pusherAppSecret;
          if (secretCandidate && secretCandidate !== "••••••••••••••••" && !secretCandidate.includes("••••")) {
            secret = secretCandidate;
          }
          if (c.pusherCluster) cluster = c.pusherCluster;
          if (typeof c.pusherEnabled === "boolean") enabled = c.pusherEnabled;
        }
      } catch {
        // Non-fatal fallback
      }

      // 2. Authoritative SettingsService (PLATFORM scope) — takes highest priority over .env and CMS
      try {
        const { SettingsService } = await import("./settings/settings.service");
        const pusherGroup = await SettingsService.getGroup("PLATFORM", null, "pusher", { decryptSecrets: true });
        if (pusherGroup?.values) {
          const pv = pusherGroup.values;
          const sources = pusherGroup.sources || {};
          if (pv["pusher.app_id"]) appId = pv["pusher.app_id"];
          if (pv["pusher.key"]) key = pv["pusher.key"];
          if (pv["pusher.secret"] && typeof pv["pusher.secret"] === "string" && !pv["pusher.secret"].includes("••••")) {
            secret = pv["pusher.secret"];
          }
          if (pv["pusher.cluster"]) cluster = pv["pusher.cluster"];
          if (sources["pusher.enabled"] === "PLATFORM" && typeof pv["pusher.enabled"] === "boolean") {
            enabled = pv["pusher.enabled"];
          }
        }
      } catch {
        // Fall back to CMS / env values already loaded above
      }
    } catch (err: any) {
      console.warn(`[PusherService] Error reading Pusher config: ${err.message}`);
    }

    return {
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
      enabled: Boolean(
        enabled &&
        appId &&
        key &&
        secret &&
        !key.startsWith("mock_") &&
        !key.includes("test") &&
        !key.includes("fake") &&
        !secret.includes("test") &&
        appId !== "123" &&
        !key.includes("demo") &&
        process.env.PUSHER_ENABLED !== "false"
      ),
    };
  }

  /**
   * Initializes or gets the singleton Pusher instance, re-creating if configuration has changed.
   */
  public static async getInstance(): Promise<Pusher | null> {
    const config = await this.getConfig();
    if (!config.enabled) {
      pusherInstance = null;
      return null;
    }

    const currentFingerprint = `${config.appId}:${config.key}:${config.secret}:${config.cluster}:${config.enabled}`;
    if (!pusherInstance || !pusherConfigInitialized || currentFingerprint !== lastConfigFingerprint) {
      try {
        pusherInstance = new Pusher({
          appId: config.appId,
          key: config.key,
          secret: config.secret,
          cluster: config.cluster,
          useTLS: config.useTLS,
        });
        pusherConfigInitialized = true;
        lastConfigFingerprint = currentFingerprint;
      } catch (err: any) {
        console.warn(`[PusherService] Initialization failed: ${err.message}`);
        pusherInstance = null;
        return null;
      }
    }
    return pusherInstance;
  }

  /**
   * Authorizes a private channel subscription.
   * Format:
   *   private-user-{userId}
   *   private-tenant-{tenantId}
   */
  public static async authorizeChannel(
    socketId: string,
    channelName: string,
    user: { userId: string; tenantId: string }
  ): Promise<{ authorized: boolean; authResponse?: any; error?: string }> {
    if (!socketId || !channelName) {
      return { authorized: false, error: "Missing socket_id or channel_name" };
    }

    // 1. Channel authorization rules
    if (channelName.startsWith("private-user-")) {
      const targetUserId = channelName.replace("private-user-", "");
      if (targetUserId !== user.userId) {
        return { authorized: false, error: "UNAUTHORIZED_CHANNEL_SUBSCRIPTION: User ID mismatch" };
      }
    } else if (channelName.startsWith("private-tenant-")) {
      const targetTenantId = channelName.replace("private-tenant-", "");
      if (targetTenantId !== user.tenantId) {
        return { authorized: false, error: "UNAUTHORIZED_CHANNEL_SUBSCRIPTION: Tenant ID mismatch" };
      }
    } else {
      return { authorized: false, error: "UNAUTHORIZED_CHANNEL_SUBSCRIPTION: Channel format not permitted" };
    }

    // 2. Compute signature
    const pusher = await this.getInstance();
    if (!pusher) {
      // Mock authorization for local test environments without live internet Pusher credentials
      const crypto = await import("crypto");
      const config = await this.getConfig();
      const stringToSign = `${socketId}:${channelName}`;
      const secret = config.secret || "mock_pusher_secret_key_hrms";
      const signature = crypto.createHmac("sha256", secret).update(stringToSign).digest("hex");
      const key = config.key || "mock_pusher_key";
      return {
        authorized: true,
        authResponse: {
          auth: `${key}:${signature}`,
        },
      };
    }

    try {
      const authResponse = pusher.authorizeChannel(socketId, channelName);
      return { authorized: true, authResponse };
    } catch (err: any) {
      return { authorized: false, error: err.message };
    }
  }

  /**
   * Triggers an in-app event on a user's private channel (private-user-{userId}).
   */
  public static triggerUserEvent(
    tenantId: string,
    userId: string,
    eventName: string,
    data: any
  ): Promise<{ success: boolean; delivered: boolean; error?: string }> {
    return trackBackgroundTask(this.triggerUserEventNow(tenantId, userId, eventName, data));
  }

  private static async triggerUserEventNow(
    tenantId: string,
    userId: string,
    eventName: string,
    data: any
  ): Promise<{ success: boolean; delivered: boolean; error?: string }> {
    const channel = `private-user-${userId}`;
    const payload = encodePayloadForPusher({
      ...data,
      tenantId,
      timestamp: new Date().toISOString(),
    });

    const pusher = await this.getInstance();
    if (!pusher) {
      // Log delivery attempt safely in development
      console.log(`[PusherService (Dev/Mock)] Event "${eventName}" dispatched to channel "${channel}":`, {
        title: data?.title,
        eventId: data?.eventId,
      });
      return { success: true, delivered: false };
    }

    try {
      await pusher.trigger(channel, eventName, payload);
      return { success: true, delivered: true };
    } catch (err: any) {
      console.warn(`[PusherService] Delivery error to ${channel}: ${err.message}`);
      return { success: false, delivered: false, error: err.message };
    }
  }

  /**
   * Triggers an in-app event on a tenant's private channel (private-tenant-{tenantId}).
   */
  public static triggerTenantEvent(
    tenantId: string,
    eventName: string,
    data: any
  ): Promise<{ success: boolean; delivered: boolean; error?: string }> {
    return trackBackgroundTask(this.triggerTenantEventNow(tenantId, eventName, data));
  }

  private static async triggerTenantEventNow(
    tenantId: string,
    eventName: string,
    data: any
  ): Promise<{ success: boolean; delivered: boolean; error?: string }> {
    const channel = `private-tenant-${tenantId}`;
    const payload = encodePayloadForPusher({
      ...data,
      tenantId,
      timestamp: new Date().toISOString(),
    });

    const pusher = await this.getInstance();
    if (!pusher) {
      console.log(`[PusherService (Dev/Mock)] Event "${eventName}" dispatched to tenant channel "${channel}"`);
      return { success: true, delivered: false };
    }

    try {
      await pusher.trigger(channel, eventName, payload);
      return { success: true, delivered: true };
    } catch (err: any) {
      console.warn(`[PusherService] Delivery error to ${channel}: ${err.message}`);
      return { success: false, delivered: false, error: err.message };
    }
  }
}
