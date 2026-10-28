import Pusher from "pusher";
import { prisma } from "../prisma";

let pusherInstance: Pusher | null = null;
let pusherConfigInitialized = false;
let lastConfigFingerprint = "";

export interface PusherConfig {
  appId: string;
  key: string;
  secret: string;
  cluster: string;
  useTLS: boolean;
  enabled: boolean;
}

export class PusherService {
  /**
   * Resets the cached singleton instance to force re-instantiation on config changes.
   */
  public static resetInstance(): void {
    pusherInstance = null;
    pusherConfigInitialized = false;
    lastConfigFingerprint = "";
  }

  /**
   * Resolves Pusher configuration from SettingsService, CMS Settings (system-platform-settings), or Environment.
   */
  public static async getConfig(): Promise<PusherConfig> {
    let appId = process.env.PUSHER_APP_ID || process.env.VITE_PUSHER_APP_ID || "";
    let key = process.env.PUSHER_KEY || process.env.VITE_PUSHER_KEY || "";
    let secret = process.env.PUSHER_SECRET || process.env.VITE_PUSHER_SECRET || "";
    let cluster = process.env.PUSHER_CLUSTER || process.env.VITE_PUSHER_CLUSTER || "ap2";
    let enabled = process.env.VITE_PUSHER_ENABLED !== "false";

    try {
      // 1. Authoritative SettingsService check (PLATFORM scope)
      try {
        const { SettingsService } = await import("./settings/settings.service");
        const pusherGroup = await SettingsService.getGroup("pusher", "PLATFORM", null, { decryptSecrets: true });
        if (pusherGroup?.values) {
          const pv = pusherGroup.values;
          if (pv["pusher.app_id"]) appId = pv["pusher.app_id"];
          if (pv["pusher.key"]) key = pv["pusher.key"];
          if (pv["pusher.secret"] && !pv["pusher.secret"].includes("••••")) secret = pv["pusher.secret"];
          if (pv["pusher.cluster"]) cluster = pv["pusher.cluster"];
          if (typeof pv["pusher.enabled"] === "boolean") enabled = pv["pusher.enabled"];
        }
      } catch {
        // Fall through to cmsPage check
      }

      // 2. Canonical CMS platform settings page ("system-platform-settings", fallback "global-super-settings")
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
    } catch (err: any) {
      console.warn(`[PusherService] Error reading CMS Pusher config: ${err.message}`);
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
  public static async triggerUserEvent(
    tenantId: string,
    userId: string,
    eventName: string,
    data: any
  ): Promise<{ success: boolean; delivered: boolean; error?: string }> {
    const channel = `private-user-${userId}`;
    const payload = {
      ...data,
      tenantId,
      timestamp: new Date().toISOString(),
    };

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
  public static async triggerTenantEvent(
    tenantId: string,
    eventName: string,
    data: any
  ): Promise<{ success: boolean; delivered: boolean; error?: string }> {
    const channel = `private-tenant-${tenantId}`;
    const payload = {
      ...data,
      tenantId,
      timestamp: new Date().toISOString(),
    };

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
