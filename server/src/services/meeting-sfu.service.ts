import jwt from "jsonwebtoken";

/**
 * MASTERHRMS — Meeting SFU & TURN Traversal Service
 *
 * Provides real multiparty media infrastructure integration using LiveKit SFU:
 * - Issues cryptographically signed, short-lived room tokens scoped to tenant, group, and user.
 * - Provides STUN/TURN server configurations for strict NAT and firewall traversal.
 * - Enforces zero-trust server-authoritative role and permission scopes.
 * - Surfaces clear diagnostics and setup guides when deployment credentials are absent.
 */

export class SfuConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SfuConfigurationError";
  }
}

export interface SfuConfig {
  provider: "livekit";
  configured: boolean;
  url: string | null;
  apiKey: string | null;
  apiSecret: string | null;
  turnUrl: string | null;
  turnUsername: string | null;
  turnCredential: string | null;
}

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface GenerateTokenParams {
  tenantId: string;
  groupId: string;
  callId: string;
  userId: string;
  name: string;
  avatarUrl?: string | null;
  isHost?: boolean;
  callType?: "audio" | "video";
  ttlSeconds?: number;
}

export class MeetingSfuService {
  /**
   * Resolves the server-authoritative SFU and TURN configuration from environment.
   */
  public static getConfig(): SfuConfig {
    const url = process.env.LIVEKIT_URL || process.env.LIVEKIT_HOST || null;
    const apiKey = process.env.LIVEKIT_API_KEY || null;
    const apiSecret = process.env.LIVEKIT_API_SECRET || null;
    const turnUrl = process.env.TURN_SERVER_URL || process.env.TURN_URL || null;
    const turnUsername = process.env.TURN_USERNAME || null;
    const turnCredential = process.env.TURN_CREDENTIAL || null;

    const configured = Boolean(
      url &&
      apiKey &&
      apiSecret &&
      apiKey.trim().length >= 4 &&
      apiSecret.trim().length >= 16
    );

    return {
      provider: "livekit",
      configured,
      url: url ? url.trim() : null,
      apiKey: apiKey ? apiKey.trim() : null,
      apiSecret: apiSecret ? apiSecret.trim() : null,
      turnUrl: turnUrl ? turnUrl.trim() : null,
      turnUsername: turnUsername ? turnUsername.trim() : null,
      turnCredential: turnCredential ? turnCredential.trim() : null,
    };
  }

  /**
   * Generates standard STUN/TURN ICE server configuration.
   */
  public static getIceServers(): IceServerConfig[] {
    const config = this.getConfig();
    const servers: IceServerConfig[] = [
      { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    ];

    if (config.turnUrl) {
      const turnConfig: IceServerConfig = {
        urls: config.turnUrl.includes(",") ? config.turnUrl.split(",").map((u) => u.trim()) : config.turnUrl,
      };
      if (config.turnUsername) turnConfig.username = config.turnUsername;
      if (config.turnCredential) turnConfig.credential = config.turnCredential;
      servers.push(turnConfig);
    }

    return servers;
  }

  /**
   * Canonical room name formatting ensuring strict tenant and group boundary isolation.
   */
  public static formatRoomName(tenantId: string, groupId: string, callId: string): string {
    return `meeting_${tenantId}_${groupId}_${callId}`;
  }

  /**
   * Issues a short-lived (15 minutes default) LiveKit-compliant JWT access token.
   */
  public static generateMeetingToken(params: GenerateTokenParams): {
    token: string;
    room: string;
    url: string;
    expiresAt: number;
    iceServers: IceServerConfig[];
  } {
    const config = this.getConfig();
    if (!config.configured || !config.apiKey || !config.apiSecret || !config.url) {
      throw new SfuConfigurationError(
        "LiveKit SFU is not configured on this server. LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET must be set."
      );
    }

    const { tenantId, groupId, callId, userId, name, avatarUrl, isHost, ttlSeconds = 900 } = params;
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + ttlSeconds;
    const room = this.formatRoomName(tenantId, groupId, callId);

    const payload = {
      sub: userId,
      name,
      iss: config.apiKey,
      nbf: now - 5,
      exp: expiresAt,
      video: {
        room,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        roomAdmin: Boolean(isHost),
        roomCreate: Boolean(isHost),
        hidden: false,
      },
      metadata: JSON.stringify({
        tenantId,
        groupId,
        userId,
        role: isHost ? "host" : "participant",
        avatarUrl: avatarUrl || null,
      }),
    };

    const token = jwt.sign(payload, config.apiSecret, { algorithm: "HS256" });

    return {
      token,
      room,
      url: config.url,
      expiresAt: expiresAt * 1000,
      iceServers: this.getIceServers(),
    };
  }

  /**
   * Diagnostic summary for administrators and client verification.
   */
  public static getDiagnosticInfo(): {
    configured: boolean;
    provider: string;
    url: string | null;
    hasTurn: boolean;
    missing: string[];
    setupGuide: string;
  } {
    const config = this.getConfig();
    const missing: string[] = [];
    if (!config.url) missing.push("LIVEKIT_URL");
    if (!config.apiKey) missing.push("LIVEKIT_API_KEY");
    if (!config.apiSecret) missing.push("LIVEKIT_API_SECRET");

    return {
      configured: config.configured,
      provider: "livekit",
      url: config.url,
      hasTurn: Boolean(config.turnUrl),
      missing,
      setupGuide:
        "To enable real multi-party meetings: 1) Deploy a LiveKit server or configure LiveKit Cloud. 2) Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in your environment variables. 3) For strict NAT environments, optionally set TURN_SERVER_URL, TURN_USERNAME, and TURN_CREDENTIAL.",
    };
  }
}

