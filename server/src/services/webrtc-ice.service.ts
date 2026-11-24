import crypto from "crypto";

/**
 * MASTERHRMS — WebRTC ICE Service
 *
 * Supports:
 * 1. Default free public STUN servers for direct peer-to-peer WebRTC (1:1 calls & mesh meetings).
 * 2. Optional enterprise TURN/TURNS relay servers for symmetric NAT / corporate firewall traversal:
 *    - Configure `TURN_SERVER_URLS` (comma-separated, e.g. `turn:turn.example.com:3478,turns:turn.example.com:5349`)
 *    - Either `TURN_SHARED_SECRET` (RFC 5766 / coturn ephemeral HMAC-SHA1 time-limited credentials)
 *      OR static `TURN_USERNAME` + `TURN_CREDENTIAL`.
 */

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface IceDiagnostics {
  mode: "webrtc_mesh";
  configured: boolean;
  relay: "none" | "turn";
  stunOnly: boolean;
  iceServersCount: number;
}

const FREE_PUBLIC_STUN_SERVERS: IceServerConfig[] = [
  {
    urls: [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302",
      "stun:stun2.l.google.com:19302",
      "stun:stun3.l.google.com:19302",
      "stun:stun4.l.google.com:19302",
    ],
  },
];

function buildTurnIceServer(userId?: string, ttlSeconds = 3600): IceServerConfig | null {
  const rawUrls = (process.env.TURN_SERVER_URLS || "").trim();
  if (!rawUrls) return null;

  const urls = rawUrls
    .split(",")
    .map((u) => u.trim())
    .filter((u) => u.startsWith("turn:") || u.startsWith("turns:"));

  if (urls.length === 0) return null;

  const sharedSecret = process.env.TURN_SHARED_SECRET?.trim();
  if (sharedSecret) {
    const expiry = Math.floor(Date.now() / 1000) + Math.max(60, ttlSeconds);
    const username = `${expiry}:${userId || "anon"}`;
    const credential = crypto
      .createHmac("sha1", sharedSecret)
      .update(username)
      .digest("base64");
    return { urls, username, credential };
  }

  const staticUser = process.env.TURN_USERNAME?.trim();
  const staticCred = process.env.TURN_CREDENTIAL?.trim();
  if (staticUser && staticCred) {
    return { urls, username: staticUser, credential: staticCred };
  }

  return null;
}

export class WebRtcIceService {
  /**
   * Returns ICE servers for WebRTC 1:1 and mesh calls.
   * Always includes STUN servers; appends TURN/TURNS relay when configured via env vars.
   */
  public static getIceServers(userId?: string, ttlSeconds = 3600): IceServerConfig[] {
    const servers: IceServerConfig[] = FREE_PUBLIC_STUN_SERVERS.map((s) => ({
      urls: Array.isArray(s.urls) ? [...s.urls] : s.urls,
    }));

    const turnServer = buildTurnIceServer(userId, ttlSeconds);
    if (turnServer) {
      servers.push(turnServer);
    }

    return servers;
  }

  /**
   * WebRTC mesh ICE diagnostics (indicates STUN-only vs TURN-enabled relay readiness).
   */
  public static getDiagnostics(userId?: string): IceDiagnostics {
    const turnServer = buildTurnIceServer(userId);
    const hasTurn = Boolean(turnServer);
    return {
      mode: "webrtc_mesh",
      configured: true,
      relay: hasTurn ? "turn" : "none",
      stunOnly: !hasTurn,
      iceServersCount: this.getIceServers(userId).length,
    };
  }
}
