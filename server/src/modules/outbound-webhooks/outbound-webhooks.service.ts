import crypto from "crypto";
import { rawPrisma, prisma as proxiedPrisma } from "../../prisma";
import { encryptSecret, decryptSecret } from "../../services/settings/settings.service";
import { AuditService } from "../../services/audit.service";
import { OutboxService } from "../../services/outbox.service";
const db = rawPrisma || proxiedPrisma;

export interface WebhookEndpoint {
  id: string;
  url: string;
  secret: string; // Stored encrypted or masked
  events: string[];
  status: "active" | "disabled";
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDeliveryLog {
  id: string;
  endpointId: string;
  tenantId: string;
  event: string;
  statusCode?: number | null;
  durationMs: number;
  attempt: number;
  maxAttempts: number;
  status: "success" | "failed";
  error?: string | null;
  timestamp: string;
}

// SSRF IP Validation Helpers
import dns from "dns";
import net from "net";
import http from "http";
import https from "https";

export function isProhibitedIp(ip: string, allowLocalhostForTest = false): boolean {
  // Normalize IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
  let normalized = ip.toLowerCase().trim().replace(/^\[|\]$/g, "");
  if (normalized.includes("ffff:")) {
    const idx = normalized.indexOf("ffff:");
    const rest = normalized.slice(idx + 5);
    if (rest.includes(".")) {
      normalized = rest;
    } else if (rest.includes(":")) {
      const hexParts = rest.split(":");
      if (hexParts.length === 2) {
        const h1 = parseInt(hexParts[0], 16) || 0;
        const h2 = parseInt(hexParts[1], 16) || 0;
        normalized = `${(h1 >> 8) & 0xff}.${h1 & 0xff}.${(h2 >> 8) & 0xff}.${h2 & 0xff}`;
      }
    }
  }

  // IPv4 Checks
  if (normalized.includes(".")) {
    const rawParts = normalized.split(".");
    if (rawParts.some((p) => !/^\d+$/.test(p))) {
      return false; // Domain name, not an IP address
    }
    const parts = rawParts.map(Number);
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true; // malformed IP is unsafe
    }

    // 0.0.0.0/8 (Current network)
    if (parts[0] === 0) return true;

    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) {
      return !allowLocalhostForTest;
    }

    // 10.0.0.0/8 (Private RFC 1918)
    if (parts[0] === 10) return true;

    // 100.64.0.0/10 (Shared / Carrier Grade NAT: 100.64.0.0 - 100.127.255.255)
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;

    // 172.16.0.0/12 (Private RFC 1918: 172.16.0.0 - 172.31.255.255)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

    // 192.0.0.0/24 (IETF protocol assignments)
    if (parts[0] === 192 && parts[1] === 0 && parts[2] === 0) return true;

    // 192.0.2.0/24 (TEST-NET-1)
    if (parts[0] === 192 && parts[1] === 0 && parts[2] === 2) return true;

    // 192.168.0.0/16 (Private RFC 1918)
    if (parts[0] === 192 && parts[1] === 168) return true;

    // 169.254.0.0/16 (Link-local / Cloud metadata: 169.254.169.254)
    if (parts[0] === 169 && parts[1] === 254) return true;

    // 198.18.0.0/15 (Network benchmark tests: 198.18.0.0 - 198.19.255.255)
    if (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) return true;

    // 198.51.100.0/24 (TEST-NET-2)
    if (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) return true;

    // 203.0.113.0/24 (TEST-NET-3)
    if (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) return true;

    // 224.0.0.0/4 (Multicast: 224 - 239)
    if (parts[0] >= 224 && parts[0] <= 239) return true;

    // 240.0.0.0/4 (Reserved / Future use)
    if (parts[0] >= 240) return true;

    return false;
  }

  // IPv6 Checks
  if (normalized === "::" || normalized === "0:0:0:0:0:0:0:0") {
    return true; // Unspecified
  }

  if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") {
    return !allowLocalhostForTest; // Loopback
  }

  // Unique Local Address (fc00::/7 - private IPv6)
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }

  // Link-local IPv6 (fe80::/10)
  if (
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  ) {
    return true;
  }

  // Multicast IPv6 (ff00::/8)
  if (normalized.startsWith("ff")) {
    return true;
  }

  // Documentation / benchmark IPv6
  if (normalized.startsWith("2001:db8") || normalized.startsWith("100::")) {
    return true;
  }

  return false;
}

export type WebhookTransportHandler = (
  url: string,
  options: {
    method: string;
    headers: Record<string, string>;
    body: string;
    timeoutMs: number;
  }
) => Promise<{ statusCode: number; ok: boolean; error?: string; headers?: Record<string, string> }>;

export class OutboundWebhooksService {
  private static mockTransport: WebhookTransportHandler | null = null;

  /**
   * Inject mock transport for isolated sandbox/unit testing
   */
  static setMockTransport(handler: WebhookTransportHandler | null) {
    this.mockTransport = handler;
  }
  /**
   * Expose static isProhibitedIp helper
   */
  static isProhibitedIp(ip: string, allowLocalhostForTest = false): boolean {
    return isProhibitedIp(ip, allowLocalhostForTest);
  }

  /**
   * Synchronous static syntax & hostname sanity check
   */
  static validateUrlSafety(rawUrl: string, allowLocalhostForTest = false): { safe: boolean; error?: string } {
    try {
      const parsed = new URL(rawUrl);

      // 1. Enforce HTTP/HTTPS only
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return { safe: false, error: "Only http and https protocols are supported" };
      }

      const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");

      // 2. Localhost & Loopback hostname rejection
      if (!allowLocalhostForTest) {
        if (
          hostname === "localhost" ||
          hostname === "127.0.0.1" ||
          hostname === "::1" ||
          hostname === "[::1]" ||
          hostname.endsWith(".localhost") ||
          hostname.endsWith(".local")
        ) {
          return { safe: false, error: "Targeting localhost or loopback addresses is prohibited (SSRF protection)" };
        }
      }

      // 3. Cloud metadata endpoints rejection
      if (
        hostname === "169.254.169.254" ||
        hostname.includes("metadata.google.internal") ||
        hostname.includes("instance-data") ||
        hostname.includes("metadata.azure")
      ) {
        return { safe: false, error: "Targeting cloud metadata services is strictly prohibited (SSRF protection)" };
      }

      // 4. Literal IP check
      if (isProhibitedIp(hostname, allowLocalhostForTest)) {
        return { safe: false, error: `Targeting prohibited or private IP range (${hostname}) is not permitted (SSRF protection)` };
      }

      return { safe: true };
    } catch {
      return { safe: false, error: "Invalid webhook URL format" };
    }
  }

  /**
   * W1-WH-01: Deep DNS Resolution & Rebinding Check at Dispatch Time
   * Resolves all DNS records for destination hostname and verifies no prohibited IPs are returned.
   */
  static async validateUrlSafetyAsync(
    rawUrl: string,
    allowLocalhostForTest = false
  ): Promise<{ safe: boolean; error?: string; resolvedIps?: string[] }> {
    const staticCheck = this.validateUrlSafety(rawUrl, allowLocalhostForTest);
    if (!staticCheck.safe) {
      return staticCheck;
    }

    if (this.mockTransport) {
      return { safe: true, resolvedIps: ["93.184.216.34"] };
    }

    try {
      const parsed = new URL(rawUrl);
      const hostname = parsed.hostname;

      // If already a literal IP (checked above)
      if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(":")) {
        return { safe: true, resolvedIps: [hostname] };
      }

      // Resolve DNS addresses asynchronously
      let addresses: Array<{ address: string; family: number }>;
      try {
        addresses = await dns.promises.lookup(hostname, { all: true, verbatim: true });
      } catch (dnsErr: any) {
        return { safe: false, error: `DNS resolution failed for hostname ${hostname}: ${dnsErr?.message || "NXDOMAIN"}` };
      }

      if (!addresses || addresses.length === 0) {
        return { safe: false, error: `No DNS records resolved for hostname ${hostname}` };
      }

      const resolvedIps = addresses.map((a) => a.address);

      for (const ip of resolvedIps) {
        if (isProhibitedIp(ip, allowLocalhostForTest)) {
          return {
            safe: false,
            error: `DNS resolution returned prohibited or private IP address (${ip}) (DNS rebinding protection W1-WH-01)`,
            resolvedIps,
          };
        }
      }

      return { safe: true, resolvedIps };
    } catch (err: any) {
      return { safe: false, error: err?.message || "URL safety verification failed" };
    }
  }

  /**
   * W1-WH-02: Safe HTTP Dispatch with Redirect Inspection
   * Ensures redirects do not bypass SSRF or DNS checks.
   */
  static async safeDispatchHttp(
    currentUrl: string,
    options: {
      method: string;
      headers: Record<string, string>;
      body: string;
      timeoutMs: number;
    },
    allowLocalhostForTest = false,
    maxRedirects = 3
  ): Promise<{ statusCode: number; ok: boolean; error?: string }> {
    let url = currentUrl;
    let hops = 0;

    while (hops <= maxRedirects) {
      // Step 1: Pre-dispatch DNS & SSRF Validation (W1-WH-01)
      const check = await this.validateUrlSafetyAsync(url, allowLocalhostForTest);
      if (!check.safe) {
        return {
          statusCode: 400,
          ok: false,
          error: `Blocked by dispatch-time SSRF/DNS security: ${check.error}`,
        };
      }

      // Step 2: Use mock transport if registered in test environment
      if (this.mockTransport) {
        const resp = await this.mockTransport(url, options);

        // Check if mock response indicates a redirect
        if ([301, 302, 303, 307, 308].includes(resp.statusCode)) {
          const locationHeader = resp.headers?.location || resp.headers?.Location;
          if (!locationHeader) {
            return { statusCode: resp.statusCode, ok: false, error: "Redirect status received without Location header" };
          }

          hops += 1;
          if (hops > maxRedirects) {
            return { statusCode: 400, ok: false, error: "Too many redirects (max 3 allowed)" };
          }

          // Compute absolute target URL and re-validate
          try {
            url = new URL(locationHeader, url).toString();
          } catch {
            return { statusCode: 400, ok: false, error: `Invalid redirect Location URL: ${locationHeader}` };
          }

          continue; // Loop and re-validate the new redirect destination safely
        }

        return resp;
      }

      // Step 3: Production dispatch with socket pinned to validated IP address (W1-WH-01 & Anti-Rebinding)
      try {
        const parsed = new URL(url);
        const isHttps = parsed.protocol === "https:";
        const transport = isHttps ? https : http;
        const pinnedIp = check.resolvedIps && check.resolvedIps.length > 0 ? check.resolvedIps[0] : parsed.hostname;
        const family = pinnedIp.includes(":") ? 6 : 4;
        const maxBytes = 1024 * 1024; // 1 MB response bound

        // Create isolated agent with pinned DNS lookup to prevent DNS rebinding bypass
        const agent = isHttps
          ? new https.Agent({
              lookup: (_hostname, _opts, callback) => {
                callback(null, pinnedIp, family);
              },
              servername: parsed.hostname, // Preserves TLS SNI matching the domain
            })
          : new http.Agent({
              lookup: (_hostname, _opts, callback) => {
                callback(null, pinnedIp, family);
              },
            });

        const dispatchResult = await new Promise<{
          statusCode: number;
          ok: boolean;
          headers: Record<string, string>;
          error?: string;
        }>((resolve) => {
          const req = transport.request(
            url,
            {
              method: options.method,
              headers: {
                ...options.headers,
                host: parsed.host,
              },
              agent,
              timeout: options.timeoutMs || 5000,
            },
            (res) => {
              let bytesRead = 0;

              res.on("data", (chunk) => {
                bytesRead += chunk.length;
                if (bytesRead > maxBytes) {
                  req.destroy(new Error(`Response size exceeded limit (${maxBytes} bytes)`));
                }
              });

              res.on("end", () => {
                const headers: Record<string, string> = {};
                for (const [k, v] of Object.entries(res.headers)) {
                  if (typeof v === "string") headers[k.toLowerCase()] = v;
                  else if (Array.isArray(v)) headers[k.toLowerCase()] = v.join(", ");
                }

                resolve({
                  statusCode: res.statusCode || 500,
                  ok: (res.statusCode || 500) >= 200 && (res.statusCode || 500) < 300,
                  headers,
                });
              });
            }
          );

          req.on("timeout", () => {
            req.destroy(new Error("Request timed out"));
          });

          req.on("error", (err) => {
            resolve({
              statusCode: 500,
              ok: false,
              headers: {},
              error: err.message,
            });
          });

          if (options.body) {
            req.write(options.body);
          }
          req.end();
        });

        // Check for HTTP redirect status codes (W1-WH-02)
        if ([301, 302, 303, 307, 308].includes(dispatchResult.statusCode)) {
          const locationHeader = dispatchResult.headers["location"];
          if (!locationHeader) {
            return { statusCode: dispatchResult.statusCode, ok: false, error: "Redirect status received without Location header" };
          }

          hops += 1;
          if (hops > maxRedirects) {
            return { statusCode: 400, ok: false, error: "Too many redirects (max 3 allowed)" };
          }

          try {
            url = new URL(locationHeader, url).toString();
          } catch {
            return { statusCode: 400, ok: false, error: `Invalid redirect Location URL: ${locationHeader}` };
          }

          continue; // Re-validate the redirect target URL in the next hop!
        }

        return {
          statusCode: dispatchResult.statusCode,
          ok: dispatchResult.ok,
          error: dispatchResult.ok ? undefined : `HTTP ${dispatchResult.statusCode}`,
        };
      } catch (err: any) {
        return {
          statusCode: 500,
          ok: false,
          error: err?.message || "Network error",
        };
      }
    }

    return { statusCode: 400, ok: false, error: "Exceeded maximum allowed redirects" };
  }


  /**
   * Generate HMAC-SHA256 signature for webhook payload
   */
  static generateSignature(payload: string, secret: string, timestamp: number): string {
    const signatureContent = `${timestamp}.${payload}`;
    const hmacHex = crypto.createHmac("sha256", secret).update(signatureContent).digest("hex");
    return `t=${timestamp},v1=${hmacHex}`;
  }

  /**
   * Verify HMAC-SHA256 signature
   */
  static verifySignature(payload: string, signatureHeader: string, secret: string, toleranceSeconds = 300): boolean {
    const parts = signatureHeader.split(",");
    const tPart = parts.find((p) => p.startsWith("t="));
    const v1Part = parts.find((p) => p.startsWith("v1="));

    if (!tPart || !v1Part) return false;

    const timestamp = parseInt(tPart.slice(2), 10);
    const providedHmac = v1Part.slice(3);

    // Check clock drift / replay window
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > toleranceSeconds) {
      return false;
    }

    const expectedSignature = this.generateSignature(payload, secret, timestamp);
    const expectedHmac = expectedSignature.split(",")[1].slice(3);

    const bufA = Buffer.from(providedHmac);
    const bufB = Buffer.from(expectedHmac);

    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Create a new webhook endpoint for a tenant.
   * Generates a raw secret returned ONCE, and stores it encrypted at rest.
   */
  static async createEndpoint(
    tenantId: string,
    userId: string,
    input: {
      url: string;
      events?: string[];
      allowLocalhostForTest?: boolean;
    }
  ): Promise<{ endpoint: Omit<WebhookEndpoint, "secret"> & { secretMasked: string }; rawSecret: string }> {
    const validation = this.validateUrlSafety(input.url, input.allowLocalhostForTest);
    if (!validation.safe) {
      throw new Error(validation.error || "Invalid webhook destination URL");
    }

    const endpointId = crypto.randomUUID();
    const rawSecret = `whsec_${crypto.randomBytes(24).toString("hex")}`;
    const encrypted = encryptSecret(rawSecret);

    const endpointRecord: WebhookEndpoint = {
      id: endpointId,
      url: input.url,
      secret: `${encrypted.iv}:${encrypted.authTag}:${encrypted.ciphertext}`,
      events: input.events && input.events.length > 0 ? input.events : ["*"],
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.setting.create({
      data: {
        scope: "TENANT",
        scopeId: tenantId,
        group: "outbound_webhooks",
        key: `endpoint:${endpointId}`,
        valueJson: endpointRecord as any,
        valueType: "json",
        isSecret: true,
        version: 1,
        updatedBy: userId,
      },
    });

    await AuditService.logMutation({
      tenantId,
      actorId: userId,
      action: "webhook.endpoint.created",
      entityType: "WebhookEndpoint",
      entityId: endpointId,
      newState: { endpointId, url: input.url, events: endpointRecord.events },
    }).catch(() => {});

    await OutboxService.createOutboxEvent({
      tenantId,
      eventType: "webhook.endpoint.created",
      entityType: "WebhookEndpoint",
      entityId: endpointId,
      actorId: userId,
      payload: { endpointId, url: input.url },
    }).catch(() => {});

    return {
      endpoint: {
        id: endpointId,
        url: endpointRecord.url,
        secretMasked: `whsec_${rawSecret.slice(6, 12)}...`,
        events: endpointRecord.events,
        status: endpointRecord.status,
        createdAt: endpointRecord.createdAt,
        updatedAt: endpointRecord.updatedAt,
      },
      rawSecret,
    };
  }

  /**
   * List webhook endpoints for a tenant (secrets are masked).
   */
  static async listEndpoints(tenantId: string) {
    const rows = await db.setting.findMany({
      where: {
        scope: "TENANT",
        scopeId: tenantId,
        group: "outbound_webhooks",
        key: { startsWith: "endpoint:" },
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((r) => {
      const data = r.valueJson as any as WebhookEndpoint;
      return {
        id: data.id,
        url: data.url,
        secretMasked: "whsec_••••••••••••••••",
        events: data.events,
        status: data.status,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });
  }

  /**
   * Delete a webhook endpoint
   */
  static async deleteEndpoint(tenantId: string, endpointId: string, userId: string): Promise<boolean> {
    const row = await db.setting.findFirst({
      where: {
        scope: "TENANT",
        scopeId: tenantId,
        group: "outbound_webhooks",
        key: `endpoint:${endpointId}`,
      },
    });

    if (!row) {
      throw new Error("Webhook endpoint not found");
    }

    await db.setting.delete({ where: { id: row.id } });

    await AuditService.logMutation({
      tenantId,
      actorId: userId,
      action: "webhook.endpoint.deleted",
      entityType: "WebhookEndpoint",
      entityId: endpointId,
    }).catch(() => {});

    return true;
  }

  /**
   * Dispatch a webhook event to a tenant's registered endpoints with bounded retries.
   */
  static async dispatchEvent(
    tenantId: string,
    event: string,
    payloadData: Record<string, any>,
    options: { maxRetries?: number; allowLocalhostForTest?: boolean } = {}
  ): Promise<WebhookDeliveryLog[]> {
    const maxRetries = Math.min(options.maxRetries || 3, 5); // Bounded to max 5, default 3
    const rows = await db.setting.findMany({
      where: {
        scope: "TENANT",
        scopeId: tenantId,
        group: "outbound_webhooks",
        key: { startsWith: "endpoint:" },
      },
    });

    const matchingEndpoints = rows
      .map((r) => r.valueJson as any as WebhookEndpoint)
      .filter((ep) => ep.status === "active" && (ep.events.includes(event) || ep.events.includes("*")));

    const logs: WebhookDeliveryLog[] = [];

    for (const ep of matchingEndpoints) {
      // 1. SSRF & DNS rebinding re-check at dispatch time (W1-WH-01)
      const ssrfCheck = await this.validateUrlSafetyAsync(ep.url, options.allowLocalhostForTest);
      if (!ssrfCheck.safe) {
        const failedLog: WebhookDeliveryLog = {
          id: crypto.randomUUID(),
          endpointId: ep.id,
          tenantId,
          event,
          statusCode: null,
          durationMs: 0,
          attempt: 1,
          maxAttempts: maxRetries,
          status: "failed",
          error: `Blocked by SSRF/DNS defense: ${ssrfCheck.error}`,
          timestamp: new Date().toISOString(),
        };
        logs.push(failedLog);
        continue;
      }

      // 2. Decrypt secret for HMAC signing
      let secretPlain: string;
      try {
        const [iv, authTag, ciphertext] = ep.secret.split(":");
        secretPlain = decryptSecret(ciphertext, iv, authTag);
      } catch {
        secretPlain = "whsec_fallback_secret";
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const stringifiedPayload = JSON.stringify({
        id: crypto.randomUUID(),
        event,
        tenantId,
        timestamp,
        data: payloadData,
      });

      const signature = this.generateSignature(stringifiedPayload, secretPlain, timestamp);

      // 3. Execute delivery with bounded retries and safe redirect handling (W1-WH-02)
      let attempt = 0;
      let delivered = false;
      let lastError: string | null = null;
      let lastStatusCode: number | null = null;
      const startTime = Date.now();

      while (attempt < maxRetries && !delivered) {
        attempt += 1;
        try {
          const resp = await this.safeDispatchHttp(
            ep.url,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-MASTERHRMS-Signature": signature,
                "X-MASTERHRMS-Timestamp": String(timestamp),
                "X-MASTERHRMS-Event": event,
              },
              body: stringifiedPayload,
              timeoutMs: 5000,
            },
            options.allowLocalhostForTest
          );

          lastStatusCode = resp.statusCode;
          if (resp.ok) {
            delivered = true;
          } else {
            lastError = resp.error || `HTTP ${resp.statusCode}`;
          }
        } catch (err: any) {
          lastError = err.message || "Network error";
        }
      }

      const logRecord: WebhookDeliveryLog = {
        id: crypto.randomUUID(),
        endpointId: ep.id,
        tenantId,
        event,
        statusCode: lastStatusCode,
        durationMs: Date.now() - startTime,
        attempt,
        maxAttempts: maxRetries,
        status: delivered ? "success" : "failed",
        error: delivered ? null : lastError,
        timestamp: new Date().toISOString(),
      };

      logs.push(logRecord);

      // Record delivery log in DB settings group
      await db.setting.create({
        data: {
          scope: "TENANT",
          scopeId: tenantId,
          group: "webhook_delivery_logs",
          key: `delivery:${logRecord.id}`,
          valueJson: logRecord as any,
          valueType: "json",
          isSecret: false,
          version: 1,
        },
      }).catch(() => {});
    }

    return logs;
  }

  /**
   * Query delivery logs for a tenant
   */
  static async listDeliveryLogs(tenantId: string, limit = 50): Promise<WebhookDeliveryLog[]> {
    const rows = await db.setting.findMany({
      where: {
        scope: "TENANT",
        scopeId: tenantId,
        group: "webhook_delivery_logs",
        key: { startsWith: "delivery:" },
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    return rows.map((r) => r.valueJson as any as WebhookDeliveryLog);
  }
}
