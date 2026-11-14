/**
 * MASTERHRMS — WebRTC ICE Service (100% free, zero third-party relay)
 *
 * Pure peer-to-peer WebRTC (1:1 calls & mesh group meetings) using only free public
 * Google STUN servers. No TURN relay, no paid provider, no credentials, no env configuration.
 *
 * STUN lets each browser discover its public address so peers can connect directly. This works
 * on the same Wi-Fi and on most home/office/mobile networks. Networks with strict symmetric NAT
 * or enterprise firewalls that block peer-to-peer UDP cannot be traversed without a relay.
 */

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface IceDiagnostics {
  mode: "webrtc_mesh";
  configured: boolean;
  relay: "none";
  stunOnly: true;
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

export class WebRtcIceService {
  /**
   * Free public STUN servers for WebRTC 1:1 and mesh calls.
   * (`userId` / `ttlSeconds` are accepted for call-site compatibility and intentionally unused.)
   */
  public static getIceServers(_userId?: string, _ttlSeconds?: number): IceServerConfig[] {
    return FREE_PUBLIC_STUN_SERVERS.map((s) => ({ urls: Array.isArray(s.urls) ? [...s.urls] : s.urls }));
  }

  /**
   * Pure WebRTC mesh diagnostics (always ready, STUN-only, no relay).
   */
  public static getDiagnostics(_userId?: string): IceDiagnostics {
    return {
      mode: "webrtc_mesh",
      configured: true,
      relay: "none",
      stunOnly: true,
      iceServersCount: this.getIceServers().length,
    };
  }
}
