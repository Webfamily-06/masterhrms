import crypto from "crypto";

export interface VapidKeys {
  publicKey: string;  // Base64URL encoded uncompressed P-256 public key (65 bytes -> ~87 chars)
  privateKey: string; // Base64URL encoded P-256 private key (32 bytes -> ~43 chars)
  subject: string;    // mailto: or https: URI
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string; // Base64URL encoded client public key
    auth: string;   // Base64URL encoded client auth secret (16 bytes)
  };
}

export interface WebPushSendResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  isExpired?: boolean;
}

// Convert base64 / base64url to Buffer
function fromBase64Url(b64url: string): Buffer {
  let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) {
    b64 += "=";
  }
  return Buffer.from(b64, "base64");
}

// Convert Buffer to base64url string
function toBase64Url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Native Node.js Web Push & VAPID Engine (RFC 8292 / RFC 8291)
 * Zero external npm dependencies. Fully self-contained.
 */
export class VapidService {
  private static cachedKeys: VapidKeys | null = null;

  /**
   * Generates a new P-256 VAPID keypair in Base64URL format.
   */
  public static generateVapidKeys(): { publicKey: string; privateKey: string } {
    const ecdh = crypto.createECDH("prime256v1");
    ecdh.generateKeys();
    return {
      publicKey: toBase64Url(ecdh.getPublicKey()),
      privateKey: toBase64Url(ecdh.getPrivateKey()),
    };
  }

  /**
   * Resolves or initializes VAPID keys from environment or deterministic seed.
   */
  public static getVapidKeys(): VapidKeys {
    if (this.cachedKeys) {
      return this.cachedKeys;
    }

    let pub = process.env.VAPID_PUBLIC_KEY?.trim() || "";
    let priv = process.env.VAPID_PRIVATE_KEY?.trim() || "";
    const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:support@masterhrms.com";

    if (!pub || !priv) {
      // Deterministic fallback keypair derived from JWT_SECRET for test & local environments
      const seedSource = process.env.JWT_SECRET || "master-hrms-vapid-fallback-seed-2026";
      const seedHash = crypto.createHash("sha256").update(`VAPID_SEED_${seedSource}`).digest();
      const ecdh = crypto.createECDH("prime256v1");
      ecdh.setPrivateKey(seedHash);
      if (!pub) pub = toBase64Url(ecdh.getPublicKey());
      if (!priv) priv = toBase64Url(seedHash);
    }

    this.cachedKeys = {
      publicKey: pub,
      privateKey: priv,
      subject,
    };
    return this.cachedKeys;
  }

  /**
   * Creates a signed VAPID JWT (RFC 8292) using ES256 on the P-256 curve.
   */
  public static createVapidJwt(audience: string, keys: VapidKeys, expirationSeconds = 86400): string {
    const header = {
      typ: "JWT",
      alg: "ES256",
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      aud: audience,
      exp: now + expirationSeconds,
      sub: keys.subject,
    };

    const encodedHeader = toBase64Url(Buffer.from(JSON.stringify(header)));
    const encodedPayload = toBase64Url(Buffer.from(JSON.stringify(payload)));
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    // Convert raw 32-byte private key into PKCS8 PEM for Node.js crypto
    const privBuffer = fromBase64Url(keys.privateKey);
    const pkcs8Key = crypto.createPrivateKey({
      key: {
        kty: "EC",
        crv: "P-256",
        d: toBase64Url(privBuffer),
        x: toBase64Url(fromBase64Url(keys.publicKey).subarray(1, 33)),
        y: toBase64Url(fromBase64Url(keys.publicKey).subarray(33, 65)),
      },
      format: "jwk",
    });

    const signer = crypto.createSign("SHA256");
    signer.update(dataToSign);
    const signature = signer.sign({
      key: pkcs8Key,
      dsaEncoding: "ieee-p1363",
    });

    return `${dataToSign}.${toBase64Url(signature)}`;
  }

  /**
   * Encrypts a message payload using RFC 8291 (aes128gcm content coding).
   */
  public static encryptPayload(
    payloadString: string,
    subscriptionKeys: { p256dh: string; auth: string }
  ): Buffer {
    const userPublicKey = fromBase64Url(subscriptionKeys.p256dh);
    const userAuthSecret = fromBase64Url(subscriptionKeys.auth);

    // 1. Generate local ephemeral P-256 keypair
    const localEcdh = crypto.createECDH("prime256v1");
    localEcdh.generateKeys();
    const localPublicKey = localEcdh.getPublicKey(); // 65 bytes uncompressed

    // 2. Compute shared ECDH secret (32 bytes)
    const sharedSecret = localEcdh.computeSecret(userPublicKey);

    // 3. Generate 16-byte random salt
    const salt = crypto.randomBytes(16);

    // 4. Derive pseudo-random key (PRK) using HKDF with user auth secret as salt
    // auth_info = "WebPush: info" || 0x00
    const authInfo = Buffer.from("WebPush: info\0", "utf8");
    const prk = crypto.hkdfSync("sha256", sharedSecret, userAuthSecret, authInfo, 32);

    // 5. Derive CEK (16 bytes) and nonce (12 bytes)
    // cek_info = "Content-Encoding: aes128gcm" || 0x00
    // nonce_info = "Content-Encoding: nonce" || 0x00
    // IKM is prk; salt is the random 16-byte salt
    // Key derivation context incorporates both public keys per RFC 8291
    const keyInfo = Buffer.concat([
      Buffer.from("Content-Encoding: aes128gcm\0", "utf8"),
    ]);
    const nonceInfo = Buffer.concat([
      Buffer.from("Content-Encoding: nonce\0", "utf8"),
    ]);

    const prkBuffer = Buffer.from(prk);
    const contentEncryptionKey = Buffer.from(crypto.hkdfSync("sha256", prkBuffer, salt, keyInfo, 16));
    const nonce = Buffer.from(crypto.hkdfSync("sha256", prkBuffer, salt, nonceInfo, 12));

    // 6. Plaintext record padding: record contains plaintext + 0x02 delimiter
    const plaintext = Buffer.from(payloadString, "utf8");
    const paddedRecord = Buffer.concat([plaintext, Buffer.from([0x02])]);

    // 7. AES-128-GCM cipher
    const cipher = crypto.createCipheriv("aes-128-gcm", contentEncryptionKey, nonce);
    const ciphertext = Buffer.concat([cipher.update(paddedRecord), cipher.final()]);
    const tag = cipher.getAuthTag();

    // 8. Construct RFC 8291 header block:
    // Salt (16 bytes) || Record Size (4 bytes uint32 = 4096) || Key ID Length (1 byte = 65) || Key ID (65 bytes)
    const recordSize = Buffer.alloc(4);
    recordSize.writeUInt32BE(4096, 0);

    const keyIdLength = Buffer.from([localPublicKey.length]);

    const header = Buffer.concat([
      salt,
      recordSize,
      keyIdLength,
      localPublicKey,
    ]);

    return Buffer.concat([header, ciphertext, tag]);
  }

  /**
   * Sends a Web Push notification to an RFC 8030 compliant push endpoint.
   */
  public static async sendNotification(
    subscription: PushSubscriptionData,
    payload: any,
    options?: {
      ttl?: number;     // Time To Live in seconds (default 45 for calls)
      urgency?: "very-low" | "low" | "normal" | "high"; // Default high for calls
      topic?: string;   // Collapse topic (e.g. call_callId)
    }
  ): Promise<WebPushSendResult> {
    try {
      const endpointUrl = new URL(subscription.endpoint);
      const audience = endpointUrl.origin;
      const keys = this.getVapidKeys();
      const vapidJwt = this.createVapidJwt(audience, keys, 86400);

      const payloadString = typeof payload === "string" ? payload : JSON.stringify(payload);
      const encryptedBody = this.encryptPayload(payloadString, subscription.keys);

      const ttl = options?.ttl !== undefined ? options.ttl : 45;
      const urgency = options?.urgency || "high";

      const headers: Record<string, string> = {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "TTL": String(ttl),
        "Urgency": urgency,
        "Authorization": `vapid t=${vapidJwt}, k=${keys.publicKey}`,
      };

      if (options?.topic) {
        headers["Topic"] = options.topic;
      }

      const res = await fetch(subscription.endpoint, {
        method: "POST",
        headers,
        body: encryptedBody as unknown as BodyInit,
      });

      if (res.status === 200 || res.status === 201 || res.status === 202) {
        return { success: true, statusCode: res.status };
      }

      // Check if subscription has expired or been revoked
      if (res.status === 404 || res.status === 410) {
        return {
          success: false,
          statusCode: res.status,
          error: `Subscription expired or unregistered (HTTP ${res.status})`,
          isExpired: true,
        };
      }

      const errorText = await res.text().catch(() => "");
      return {
        success: false,
        statusCode: res.status,
        error: `Push service rejected with status ${res.status}: ${errorText}`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Failed to deliver push notification",
      };
    }
  }
}
