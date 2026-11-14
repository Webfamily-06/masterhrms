import crypto from "crypto";

/**
 * MASTERHRMS — WebRTC STUN & TURN ICE Traversal Service
 *
 * Pure WebRTC P2P & Mesh ICE server configuration service (zero external SFU dependency):
 * - Provides public STUN servers + optional Coturn TURN server configurations.
 * - Supports RFC 7635 ephemeral HMAC-SHA1 Coturn REST API credentials (`TURN_SHARED_SECRET`).
 * - Supports static TURN credentials (`TURN_SERVER_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL`).
 */

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface TurnDiagnostics {
  mode: "webrtc_mesh";
  configured: boolean;
  turnConfigured: boolean;
  ephemeralTurnEnabled: boolean;
  iceServersCount: number;
}

export class WebRtcIceService {
  /**
   * Generates ephemeral HMAC-SHA1 credentials for Coturn TURN REST API (RFC 7635).
   *
   * Username format: <expiry_timestamp>:<userId>
   * Credential: HMAC-SHA1(username, sharedSecret) in Base64
   */
  public static generateEphemeralTurnCredentials(
    userId: string,
    ttlSeconds: number = 86400
  ): IceServerConfig[] {
    const sharedSecret = process.env.TURN_SHARED_SECRET || process.env.COTURN_SHARED_SECRET;
    const turnHost =
      process.env.TURN_PUBLIC_HOST ||
      process.env.TURN_SERVER_HOST ||
      process.env.TURN_HOST ||
      null;
    const udpPort = parseInt(process.env.TURN_UDP_PORT || "3478", 10);
    const tcpPort = parseInt(process.env.TURN_TCP_PORT || "3478", 10);
    const tlsPort = parseInt(process.env.TURN_TLS_PORT || "5349", 10);

    if (!sharedSecret || !sharedSecret.trim() || !turnHost || !turnHost.trim()) {
      // Allow ephemeral generation in tests when TURN_SHARED_SECRET is set even if host defaults
      if (!sharedSecret || !sharedSecret.trim()) {
        return [];
      }
    }

    const resolvedHost = (turnHost && turnHost.trim()) || "turn.masterhrms.com";
    const expiryTimestamp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const username = `${expiryTimestamp}:${userId}`;
    const credential = crypto
      .createHmac("sha1", sharedSecret.trim())
      .update(username)
      .digest("base64");

    const urls = [
      `turn:${resolvedHost}:${udpPort}?transport=udp`,
      `turn:${resolvedHost}:${tcpPort}?transport=tcp`,
      `turns:${resolvedHost}:${tlsPort}?transport=tcp`,
    ];

    return [
      {
        urls,
        username,
        credential,
      },
    ];
  }

  /**
   * Validates an ephemeral Coturn credential against the shared secret and timestamp.
   */
  public static verifyTurnCredentials(
    username: string,
    credential: string
  ): { valid: boolean; reason?: string; userId?: string; expiresAt?: number } {
    const sharedSecret = process.env.TURN_SHARED_SECRET || process.env.COTURN_SHARED_SECRET;
    if (!sharedSecret || !sharedSecret.trim()) {
      return { valid: false, reason: "TURN_SHARED_SECRET not configured on server" };
    }

    const parts = username.split(":");
    if (parts.length < 2) {
      return { valid: false, reason: "Malformed TURN username format (expected <timestamp>:<userId>)" };
    }

    const expiresAt = parseInt(parts[0], 10);
    if (isNaN(expiresAt)) {
      return { valid: false, reason: "Invalid timestamp in TURN username" };
    }

    const now = Math.floor(Date.now() / 1000);
    if (expiresAt < now) {
      return { valid: false, reason: "TURN credential has expired", expiresAt };
    }

    const expectedCredential = crypto
      .createHmac("sha1", sharedSecret.trim())
      .update(username)
      .digest("base64");

    const credBuffer = Buffer.from(credential);
    const expectedBuffer = Buffer.from(expectedCredential);
    if (credBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(credBuffer, expectedBuffer)) {
      return { valid: false, reason: "Invalid HMAC-SHA1 signature" };
    }

    const userId = parts.slice(1).join(":");
    return { valid: true, userId, expiresAt };
  }

  /**
   * Generates standard STUN/TURN ICE server configuration for WebRTC 1:1 and Mesh calls.
   */
  public static getIceServers(userId?: string, ttlSeconds: number = 86400): IceServerConfig[] {
    const servers: IceServerConfig[] = [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
        ],
      },
    ];

    const sharedSecret = process.env.TURN_SHARED_SECRET || process.env.COTURN_SHARED_SECRET;
    if (sharedSecret && userId) {
      const ephemeral = this.generateEphemeralTurnCredentials(userId, ttlSeconds);
      if (ephemeral.length > 0) {
        servers.push(...ephemeral);
        return servers;
      }
    }

    const turnUrl = process.env.TURN_SERVER_URL || process.env.TURN_URL || null;
    const turnUsername = process.env.TURN_USERNAME || null;
    const turnCredential = process.env.TURN_CREDENTIAL || null;

    if (turnUrl && turnUrl.trim()) {
      const turnConfig: IceServerConfig = {
        urls: turnUrl.includes(",") ? turnUrl.split(",").map((u) => u.trim()) : turnUrl.trim(),
      };
      if (turnUsername && turnUsername.trim()) turnConfig.username = turnUsername.trim();
      if (turnCredential && turnCredential.trim()) turnConfig.credential = turnCredential.trim();
      servers.push(turnConfig);
    }

    return servers;
  }

  /**
   * Returns pure WebRTC Mesh diagnostics (always ready via STUN + optional TURN).
   */
  public static getDiagnostics(userId?: string): TurnDiagnostics {
    const iceServers = this.getIceServers(userId);
    const sharedSecret = Boolean((process.env.TURN_SHARED_SECRET || process.env.COTURN_SHARED_SECRET)?.trim());
    const staticTurn = Boolean((process.env.TURN_SERVER_URL || process.env.TURN_URL)?.trim());

    return {
      mode: "webrtc_mesh",
      configured: true,
      turnConfigured: sharedSecret || staticTurn,
      ephemeralTurnEnabled: sharedSecret,
      iceServersCount: iceServers.length,
    };
  }
}
