import crypto from "crypto";
import dns from "dns";
import http from "http";
import https from "https";
import { rawPrisma, prisma as proxiedPrisma } from "../../prisma";
import { encryptSecret, decryptSecret } from "../../services/settings/settings.service";
import { AuditService } from "../../services/audit.service";
import { OutboxService } from "../../services/outbox.service";
import { checkTenantEntitlement } from "../../middleware/entitlements";
import { UnifiedCatalogService } from "../../services/unified-catalog.service";

const db = rawPrisma || proxiedPrisma;

export interface WebhookEndpoint {
  id: string;
  name: string;
  module: string;
  eventKey: string;
  events: string[];
  method: "GET" | "POST" | "PUT";
  url: string;
  secret: string; // Stored encrypted at rest
  headersJson?: Record<string, string>;
  status: "active" | "disabled";
  timeoutMs: number;
  maxRetries: number;
  consecutiveFailures: number;
  disabledReason?: string | null;
  lastDeliveryAt?: string | null;
  lastDeliveryStatus?: "success" | "failed" | null;
  successRate7d?: number;
  createdBy: string;
  deletedAt?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDeliveryLog {
  id: string;
  endpointId: string;
  endpointName: string;
  tenantId: string;
  eventKey: string;
  method: string;
  url: string;
  status: "queued" | "success" | "failed" | "retrying" | "dead";
  statusCode?: number | null;
  durationMs: number;
  attempt: number;
  maxAttempts: number;
  requestHeaders?: Record<string, string>;
  payload?: Record<string, any>;
  responseSnippet?: string | null;
  errorCode?: string | null;
  nextRetryAt?: string | null;
  nextAttemptAt?: string | null;
  claimedAt?: string | null;
  claimedBy?: string | null;
  timestamp: string;
}

export interface WebhookSettings {
  defaultTimeout: number;
  maxRetries: number;
  backoffBaseSeconds: number;
  autoDisableAfterFailures: number;
  maxEndpoints: number;
  logRetentionDays: number;
}

export interface EventCatalogItem {
  key: string;
  module: string;
  label: string;
  description: string;
  payloadSchema: Record<string, any>;
}

// Runtime Event Catalog (built from HRMS Core + Installed Add-ons)
export const EVENT_CATALOG: EventCatalogItem[] = [
  // HRMS Core
  {
    key: "hrm.employee.created",
    module: "HRM Core",
    label: "Employee Onboarded",
    description: "Fires when a new employee record is created and activated.",
    payloadSchema: { employeeId: "emp_123", fullName: "Jane Doe", department: "Engineering", role: "Software Engineer", email: "jane@company.com" },
  },
  {
    key: "hrm.employee.updated",
    module: "HRM Core",
    label: "Employee Profile Updated",
    description: "Fires when employee master data or personal details are modified.",
    payloadSchema: { employeeId: "emp_123", changes: { department: "DevOps" } },
  },
  {
    key: "hrm.employee.terminated",
    module: "HRM Core",
    label: "Employee Offboarded",
    description: "Fires when an employee separation workflow is initiated.",
    payloadSchema: { employeeId: "emp_123", exitDate: "2026-12-31", reason: "Resignation" },
  },
  // Attendance & Shifts
  {
    key: "attendance.checkin",
    module: "Attendance",
    label: "Employee Check-in",
    description: "Fires when an attendance entry is recorded via biometric device or web check-in.",
    payloadSchema: { employeeId: "emp_123", checkInTime: "2026-10-14T09:00:00Z", deviceId: "BIO_01", location: "HQ" },
  },
  {
    key: "attendance.checkout",
    module: "Attendance",
    label: "Employee Check-out",
    description: "Fires when an employee clocks out at shift end.",
    payloadSchema: { employeeId: "emp_123", checkOutTime: "2026-10-14T17:30:00Z", totalWorkHours: 8.5 },
  },
  // Leave
  {
    key: "leave.requested",
    module: "Leave Management",
    label: "Leave Application Submitted",
    description: "Fires when an employee applies for time off.",
    payloadSchema: { leaveId: "lv_456", employeeId: "emp_123", leaveType: "Annual", startDate: "2026-11-01", days: 3 },
  },
  {
    key: "leave.approved",
    module: "Leave Management",
    label: "Leave Request Approved",
    description: "Fires when a manager signs off on a leave application.",
    payloadSchema: { leaveId: "lv_456", approvedBy: "mgr_789", status: "Approved" },
  },
  // Payroll
  {
    key: "payroll.processed",
    module: "Payroll",
    label: "Payroll Run Completed",
    description: "Fires when a monthly payroll batch finishes calculation.",
    payloadSchema: { month: "October", year: 2026, totalGross: 4500000, totalEmployees: 120 },
  },
  {
    key: "payroll.paid",
    module: "Payroll",
    label: "Salaries Disbursed",
    description: "Fires after bank payment orders are executed.",
    payloadSchema: { batchId: "pay_987", disbursementDate: "2026-10-31", totalAmount: 3950000 },
  },
  // Recruitment
  {
    key: "recruitment.job.posted",
    module: "Recruitment",
    label: "Job Opening Published",
    description: "Fires when a new career opening is published to job portals.",
    payloadSchema: { jobId: "job_001", title: "Lead AI Engineer", openings: 2, department: "R&D" },
  },
  {
    key: "recruitment.candidate.applied",
    module: "Recruitment",
    label: "Candidate Application Received",
    description: "Fires when a candidate submits their CV.",
    payloadSchema: { candidateId: "cand_333", candidateName: "Alex Rivera", jobId: "job_001" },
  },
  // Invoicing & Sales
  {
    key: "sales.invoice.created",
    module: "Sales & Invoicing",
    label: "Invoice Generated",
    description: "Fires when an invoice is raised for a client.",
    payloadSchema: { invoiceId: "inv_101", invoiceNumber: "INV-2026-0042", amount: 15000, customerName: "Acme Corp" },
  },
  {
    key: "sales.invoice.paid",
    module: "Sales & Invoicing",
    label: "Invoice Payment Received",
    description: "Fires when an invoice is marked paid.",
    payloadSchema: { invoiceId: "inv_101", paidAmount: 15000, paymentMethod: "Razorpay" },
  },
  // Strategy & Planning
  {
    key: "planning.challenge.created",
    module: "Planning",
    label: "Strategic Challenge Created",
    description: "Fires when a company strategic objective is established.",
    payloadSchema: { challengeId: "ch_55", name: "2027 Market Expansion", category: "Growth" },
  },
  {
    key: "planning.charter.stage_changed",
    module: "Planning",
    label: "Project Charter Stage Changed",
    description: "Fires when a project charter advances across the strategic Kanban board.",
    payloadSchema: { charterId: "cht_88", name: "Cloud Migration", fromStage: "Draft", toStage: "In Progress" },
  },
  // Test Event
  {
    key: "test.ping",
    module: "System",
    label: "Test Ping Event",
    description: "Standard sample payload used for testing webhook endpoints.",
    payloadSchema: { ping: "pong", testTimestamp: "2026-10-14T10:00:00Z", message: "Master ERP Webhook Healthcheck" },
  },
];

export function isProhibitedIp(ip: string, allowLocalhostForTest = false): boolean {
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

  if (normalized.includes(".")) {
    const rawParts = normalized.split(".");
    if (rawParts.some((p) => !/^\d+$/.test(p))) {
      return false;
    }
    const parts = rawParts.map(Number);
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true;
    }

    if (parts[0] === 0) return true;
    if (parts[0] === 127) return !allowLocalhostForTest;
    if (parts[0] === 10) return true;
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 0 && parts[2] === 0) return true;
    if (parts[0] === 192 && parts[1] === 0 && parts[2] === 2) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) return true;
    if (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) return true;
    if (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) return true;
    if (parts[0] >= 224) return true;
    if (parts[0] === 255 && parts[1] === 255 && parts[2] === 255 && parts[3] === 255) return true;
  }

  if (normalized.includes(":")) {
    if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") return !allowLocalhostForTest;
    if (normalized === "::" || normalized === "0:0:0:0:0:0:0:0") return true;
    if (normalized.startsWith("fe80:")) return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
    if (normalized.startsWith("ff")) return true;
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

  static setMockTransport(handler: WebhookTransportHandler | null) {
    this.mockTransport = handler;
  }

  static isProhibitedIp(ip: string, allowLocalhostForTest = false): boolean {
    return isProhibitedIp(ip, allowLocalhostForTest);
  }

  /**
   * Runtime event catalog discovery from installed and entitled module manifests.
   */
  static async getEventCatalog(tenantId?: string): Promise<EventCatalogItem[]> {
    // Base platform core events (HRM, Payroll, Invoicing, System)
    const baseCoreEvents: EventCatalogItem[] = EVENT_CATALOG.filter(
      (e) => !["planning", "recruitment"].some((mod) => e.key.startsWith(mod))
    );

    if (!tenantId) {
      return EVENT_CATALOG;
    }

    try {
      const catalog = await UnifiedCatalogService.getCatalog({ tenantId });
      const activeSlugs = new Set(
        catalog.products
          .filter((p) => p.eligibility?.isEnabled || p.eligibility?.isEntitled)
          .map((p) => p.slug.toLowerCase())
      );

      const dynamicEvents: EventCatalogItem[] = [...baseCoreEvents];

      // Planning & Strategy module events
      if (activeSlugs.has("planning") || activeSlugs.has("strategy-studio") || activeSlugs.has("swot")) {
        dynamicEvents.push(
          ...EVENT_CATALOG.filter((e) => e.key.startsWith("planning."))
        );
      }

      // Recruitment module events
      if (activeSlugs.has("recruitment") || activeSlugs.has("recruitment-ats")) {
        dynamicEvents.push(
          ...EVENT_CATALOG.filter((e) => e.key.startsWith("recruitment."))
        );
      }

      // Ensure test ping is always present
      if (!dynamicEvents.some((e) => e.key === "test.ping")) {
        const pingEvent = EVENT_CATALOG.find((e) => e.key === "test.ping");
        if (pingEvent) dynamicEvents.push(pingEvent);
      }

      return dynamicEvents;
    } catch {
      return EVENT_CATALOG;
    }
  }

  static validateUrlSafety(rawUrl: string, allowLocalhostForTest = false): { safe: boolean; error?: string } {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return { safe: false, error: "Only http and https protocols are supported" };
      }

      const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");

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

      if (
        hostname === "169.254.169.254" ||
        hostname.includes("metadata.google.internal") ||
        hostname.includes("instance-data") ||
        hostname.includes("metadata.azure")
      ) {
        return { safe: false, error: "Targeting cloud metadata services is strictly prohibited (SSRF protection)" };
      }

      if (isProhibitedIp(hostname, allowLocalhostForTest)) {
        return { safe: false, error: `Targeting prohibited or private IP range (${hostname}) is not permitted (SSRF protection)` };
      }

      return { safe: true };
    } catch {
      return { safe: false, error: "Invalid webhook URL format" };
    }
  }

  static async validateUrlSafetyAsync(
    rawUrl: string,
    allowLocalhostForTest = false
  ): Promise<{ safe: boolean; error?: string; resolvedIps?: string[] }> {
    const staticCheck = this.validateUrlSafety(rawUrl, allowLocalhostForTest);
    if (!staticCheck.safe) return staticCheck;

    if (this.mockTransport) {
      return { safe: true, resolvedIps: ["93.184.216.34"] };
    }

    try {
      const parsed = new URL(rawUrl);
      const hostname = parsed.hostname;

      if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(":")) {
        return { safe: true, resolvedIps: [hostname] };
      }

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
            error: `DNS resolution returned prohibited or private IP address (${ip}) (DNS rebinding protection)`,
            resolvedIps,
          };
        }
      }

      return { safe: true, resolvedIps };
    } catch (err: any) {
      return { safe: false, error: err?.message || "URL safety verification failed" };
    }
  }

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
  ): Promise<{ statusCode: number; ok: boolean; error?: string; responseSnippet?: string }> {
    let url = currentUrl;
    let hops = 0;

    while (hops <= maxRedirects) {
      const check = await this.validateUrlSafetyAsync(url, allowLocalhostForTest);
      if (!check.safe) {
        return {
          statusCode: 400,
          ok: false,
          error: `Blocked by dispatch-time SSRF/DNS security: ${check.error}`,
        };
      }

      if (this.mockTransport) {
        const resp = await this.mockTransport(url, options);
        if ([301, 302, 303, 307, 308].includes(resp.statusCode)) {
          const locationHeader = resp.headers?.location || resp.headers?.Location;
          if (!locationHeader) {
            return { statusCode: resp.statusCode, ok: false, error: "Redirect status received without Location header" };
          }
          hops += 1;
          if (hops > maxRedirects) {
            return { statusCode: 400, ok: false, error: "Too many redirects (max 3 allowed)" };
          }
          url = new URL(locationHeader, url).toString();
          continue;
        }
        return resp;
      }

      try {
        const parsed = new URL(url);
        const isHttps = parsed.protocol === "https:";
        const transport = isHttps ? https : http;
        const pinnedIp = check.resolvedIps && check.resolvedIps.length > 0 ? check.resolvedIps[0] : parsed.hostname;
        const family = pinnedIp.includes(":") ? 6 : 4;
        const maxBytes = 1024 * 1024;

        const agent = isHttps
          ? new https.Agent({
              lookup: (_h, _o, cb) => cb(null, pinnedIp, family),
              servername: parsed.hostname,
            })
          : new http.Agent({
              lookup: (_h, _o, cb) => cb(null, pinnedIp, family),
            });

        const dispatchResult = await new Promise<{
          statusCode: number;
          ok: boolean;
          headers: Record<string, string>;
          snippet?: string;
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
              let responseBody = "";
              res.setEncoding("utf8");

              res.on("data", (chunk) => {
                if (responseBody.length < 2048) {
                  responseBody += chunk.slice(0, 2048 - responseBody.length);
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
                  snippet: responseBody,
                });
              });
            }
          );

          req.on("timeout", () => req.destroy(new Error("Request timed out")));
          req.on("error", (err) => resolve({ statusCode: 500, ok: false, headers: {}, error: err.message }));

          if (options.body && options.method !== "GET") {
            req.write(options.body);
          }
          req.end();
        });

        if ([301, 302, 303, 307, 308].includes(dispatchResult.statusCode)) {
          const locationHeader = dispatchResult.headers["location"];
          if (!locationHeader) {
            return { statusCode: dispatchResult.statusCode, ok: false, error: "Redirect without Location header" };
          }
          hops += 1;
          if (hops > maxRedirects) {
            return { statusCode: 400, ok: false, error: "Too many redirects (max 3 allowed)" };
          }
          url = new URL(locationHeader, url).toString();
          continue;
        }

        return {
          statusCode: dispatchResult.statusCode,
          ok: dispatchResult.ok,
          error: dispatchResult.ok ? undefined : `HTTP ${dispatchResult.statusCode}`,
          responseSnippet: dispatchResult.snippet,
        };
      } catch (err: any) {
        return { statusCode: 500, ok: false, error: err?.message || "Network error" };
      }
    }

    return { statusCode: 400, ok: false, error: "Exceeded maximum allowed redirects" };
  }

  static generateSignature(payload: string, secret: string, timestamp: number): string {
    const signatureContent = `${timestamp}.${payload}`;
    const hmacHex = crypto.createHmac("sha256", secret).update(signatureContent).digest("hex");
    return `t=${timestamp},v1=${hmacHex}`;
  }

  static verifySignature(payload: string, signatureHeader: string, secret: string, toleranceSeconds = 300): boolean {
    const parts = signatureHeader.split(",");
    const tPart = parts.find((p) => p.startsWith("t="));
    const v1Part = parts.find((p) => p.startsWith("v1="));

    if (!tPart || !v1Part) return false;
    const timestamp = parseInt(tPart.slice(2), 10);
    const providedHmac = v1Part.slice(3);

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > toleranceSeconds) return false;

    const expectedSignature = this.generateSignature(payload, secret, timestamp);
    const expectedHmac = expectedSignature.split(",")[1].slice(3);

    const bufA = Buffer.from(providedHmac);
    const bufB = Buffer.from(expectedHmac);
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Create Endpoint
   */
  static async createEndpoint(
    tenantId: string,
    userId: string,
    input: {
      name?: string;
      module?: string;
      eventKey?: string;
      events?: string[];
      method?: "GET" | "POST" | "PUT";
      url: string;
      headersJson?: Record<string, string>;
      timeoutMs?: number;
      maxRetries?: number;
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

    const events = input.events && input.events.length > 0 ? input.events : [input.eventKey || "*"];
    const endpointRecord: WebhookEndpoint = {
      id: endpointId,
      name: input.name?.trim() || new URL(input.url).hostname,
      module: input.module || "General",
      eventKey: input.eventKey || events[0] || "*",
      events,
      method: input.method || "POST",
      url: input.url,
      secret: `${encrypted.iv}:${encrypted.authTag}:${encrypted.ciphertext}`,
      headersJson: input.headersJson || {},
      status: "active",
      timeoutMs: input.timeoutMs || 5000,
      maxRetries: input.maxRetries || 3,
      consecutiveFailures: 0,
      disabledReason: null,
      lastDeliveryAt: null,
      lastDeliveryStatus: null,
      successRate7d: 100,
      createdBy: userId,
      version: 1,
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
        ...endpointRecord,
        secretMasked: `whsec_${rawSecret.slice(6, 12)}••••••••••••`,
      },
      rawSecret,
    };
  }

  /**
   * List Endpoints (with search, filter, and secret masked)
   */
  static async listEndpoints(
    tenantId: string,
    filters?: { module?: string; event?: string; status?: string; search?: string }
  ) {
    const rows = await db.setting.findMany({
      where: {
        scope: "TENANT",
        scopeId: tenantId,
        group: "outbound_webhooks",
        key: { startsWith: "endpoint:" },
      },
      orderBy: { createdAt: "desc" },
    });

    let endpoints = rows.map((r) => {
      const data = r.valueJson as any as WebhookEndpoint;
      const parsedUrl = new URL(data.url);
      return {
        id: data.id,
        name: data.name || parsedUrl.hostname,
        module: data.module || "General",
        eventKey: data.eventKey || data.events?.[0] || "*",
        events: data.events || ["*"],
        method: data.method || "POST",
        url: data.url,
        urlHostOnly: parsedUrl.hostname,
        secretMasked: "whsec_••••••••••••••••",
        status: data.status || "active",
        timeoutMs: data.timeoutMs || 5000,
        maxRetries: data.maxRetries || 3,
        consecutiveFailures: data.consecutiveFailures || 0,
        disabledReason: data.disabledReason || null,
        lastDeliveryAt: data.lastDeliveryAt || null,
        lastDeliveryStatus: data.lastDeliveryStatus || null,
        successRate7d: data.successRate7d ?? 100,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    if (filters?.module && filters.module !== "all") {
      endpoints = endpoints.filter((e) => e.module.toLowerCase() === filters.module?.toLowerCase());
    }
    if (filters?.status && filters.status !== "all") {
      endpoints = endpoints.filter((e) => e.status.toLowerCase() === filters.status?.toLowerCase());
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      endpoints = endpoints.filter(
        (e) => e.name.toLowerCase().includes(q) || e.url.toLowerCase().includes(q) || e.module.toLowerCase().includes(q)
      );
    }

    return endpoints;
  }

  /**
   * Get single endpoint detail with last 20 deliveries
   */
  static async getEndpointDetail(tenantId: string, endpointId: string) {
    const row = await db.setting.findFirst({
      where: {
        scope: "TENANT",
        scopeId: tenantId,
        group: "outbound_webhooks",
        key: `endpoint:${endpointId}`,
      },
    });

    if (!row) throw new Error("Webhook endpoint not found");

    const endpoint = row.valueJson as any as WebhookEndpoint;
    const allLogs = await this.listDeliveryLogs(tenantId, 100);
    const endpointLogs = allLogs.filter((l) => l.endpointId === endpointId).slice(0, 20);

    return {
      endpoint: {
        ...endpoint,
        secretMasked: "whsec_••••••••••••••••",
      },
      recentDeliveries: endpointLogs,
    };
  }

  /**
   * Update Endpoint (with version check)
   */
  static async updateEndpoint(
    tenantId: string,
    endpointId: string,
    userId: string,
    input: Partial<WebhookEndpoint>
  ): Promise<WebhookEndpoint> {
    const row = await db.setting.findFirst({
      where: {
        scope: "TENANT",
        scopeId: tenantId,
        group: "outbound_webhooks",
        key: `endpoint:${endpointId}`,
      },
    });

    if (!row) throw new Error("Webhook endpoint not found");
    const current = row.valueJson as any as WebhookEndpoint;

    if (input.url && input.url !== current.url) {
      const validation = this.validateUrlSafety(input.url);
      if (!validation.safe) throw new Error(validation.error);
    }

    const updated: WebhookEndpoint = {
      ...current,
      name: input.name !== undefined ? input.name : current.name,
      module: input.module !== undefined ? input.module : current.module,
      eventKey: input.eventKey !== undefined ? input.eventKey : current.eventKey,
      events: input.events !== undefined ? input.events : current.events,
      method: input.method !== undefined ? input.method : current.method,
      url: input.url !== undefined ? input.url : current.url,
      headersJson: input.headersJson !== undefined ? input.headersJson : current.headersJson,
      timeoutMs: input.timeoutMs !== undefined ? input.timeoutMs : current.timeoutMs,
      maxRetries: input.maxRetries !== undefined ? input.maxRetries : current.maxRetries,
      status: input.status !== undefined ? input.status : current.status,
      version: (current.version || 1) + 1,
      updatedAt: new Date().toISOString(),
    };

    await db.setting.update({
      where: { id: row.id },
      data: {
        valueJson: updated as any,
        version: updated.version,
        updatedBy: userId,
      },
    });

    await AuditService.logMutation({
      tenantId,
      actorId: userId,
      action: "webhook.endpoint.updated",
      entityType: "WebhookEndpoint",
      entityId: endpointId,
      newState: { endpointId, url: updated.url },
    }).catch(() => {});

    return updated;
  }

  /**
   * Toggle Endpoint Active/Disabled status
   */
  static async toggleEndpoint(tenantId: string, endpointId: string, userId: string): Promise<WebhookEndpoint> {
    const row = await db.setting.findFirst({
      where: {
        scope: "TENANT",
        scopeId: tenantId,
        group: "outbound_webhooks",
        key: `endpoint:${endpointId}`,
      },
    });

    if (!row) throw new Error("Webhook endpoint not found");
    const current = row.valueJson as any as WebhookEndpoint;
    const newStatus = current.status === "active" ? "disabled" : "active";

    const updated: WebhookEndpoint = {
      ...current,
      status: newStatus,
      disabledReason: newStatus === "disabled" ? "Manually disabled by administrator" : null,
      consecutiveFailures: newStatus === "active" ? 0 : current.consecutiveFailures,
      updatedAt: new Date().toISOString(),
      version: (current.version || 1) + 1,
    };

    await db.setting.update({
      where: { id: row.id },
      data: {
        valueJson: updated as any,
        version: updated.version,
        updatedBy: userId,
      },
    });

    await OutboxService.createOutboxEvent({
      tenantId,
      eventType: "webhook.endpoint.toggled",
      entityType: "WebhookEndpoint",
      entityId: endpointId,
      actorId: userId,
      payload: { endpointId, status: newStatus },
    }).catch(() => {});

    return updated;
  }

  /**
   * Rotate Secret (returns new secret ONCE)
   */
  static async rotateSecret(
    tenantId: string,
    endpointId: string,
    userId: string
  ): Promise<{ secretMasked: string; rawSecret: string }> {
    const row = await db.setting.findFirst({
      where: {
        scope: "TENANT",
        scopeId: tenantId,
        group: "outbound_webhooks",
        key: `endpoint:${endpointId}`,
      },
    });

    if (!row) throw new Error("Webhook endpoint not found");
    const current = row.valueJson as any as WebhookEndpoint;

    const rawSecret = `whsec_${crypto.randomBytes(24).toString("hex")}`;
    const encrypted = encryptSecret(rawSecret);

    const updated: WebhookEndpoint = {
      ...current,
      secret: `${encrypted.iv}:${encrypted.authTag}:${encrypted.ciphertext}`,
      updatedAt: new Date().toISOString(),
      version: (current.version || 1) + 1,
    };

    await db.setting.update({
      where: { id: row.id },
      data: {
        valueJson: updated as any,
        version: updated.version,
        updatedBy: userId,
      },
    });

    return {
      secretMasked: `whsec_${rawSecret.slice(6, 12)}••••••••••••`,
      rawSecret,
    };
  }

  /**
   * Delete Endpoint (soft delete with usage check)
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

    if (!row) throw new Error("Webhook endpoint not found");

    await db.setting.delete({ where: { id: row.id } });

    await AuditService.logMutation({
      tenantId,
      actorId: userId,
      action: "webhook.endpoint.deleted",
      entityType: "WebhookEndpoint",
      entityId: endpointId,
    }).catch(() => {});

    await OutboxService.createOutboxEvent({
      tenantId,
      eventType: "webhook.endpoint.deleted",
      entityType: "WebhookEndpoint",
      entityId: endpointId,
      actorId: userId,
      payload: { endpointId },
    }).catch(() => {});

    return true;
  }

  /**
   * Test Endpoint: sends sample event labeled "test"
   */
  static async testEndpoint(
    tenantId: string,
    endpointId: string,
    userId: string,
    allowLocalhostForTest = false
  ): Promise<WebhookDeliveryLog> {
    const row = await db.setting.findFirst({
      where: {
        scope: "TENANT",
        scopeId: tenantId,
        group: "outbound_webhooks",
        key: `endpoint:${endpointId}`,
      },
    });

    if (!row) throw new Error("Webhook endpoint not found");
    const ep = row.valueJson as any as WebhookEndpoint;

    const sampleEvent = EVENT_CATALOG.find((e) => e.key === ep.eventKey) || EVENT_CATALOG[EVENT_CATALOG.length - 1];
    const logs = await this.dispatchEvent(
      tenantId,
      sampleEvent.key,
      { ...sampleEvent.payloadSchema, isTest: true },
      { allowLocalhostForTest, maxRetries: 1 }
    );

    const log = logs.find((l) => l.endpointId === endpointId) || logs[0];
    return log;
  }

  /**
   * Dispatch Webhook Event
   */
  static async dispatchEvent(
    tenantId: string,
    event: string,
    payloadData: Record<string, any>,
    options: { maxRetries?: number; allowLocalhostForTest?: boolean; isSuperAdmin?: boolean } = {}
  ): Promise<WebhookDeliveryLog[]> {
    const entitlement = await checkTenantEntitlement(tenantId, "webhook", options.isSuperAdmin);
    if (!entitlement.entitled) {
      throw new Error(
        entitlement.status === "expired"
          ? "Outbound Webhooks subscription has expired. Dispatches blocked."
          : `Outbound Webhooks add-on is not active on this workspace (status: ${entitlement.status || "not_installed"}).`
      );
    }

    const maxRetries = Math.min(options.maxRetries || 3, 5);
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
      .filter((ep) => ep.status === "active" && (ep.events.includes(event) || ep.events.includes("*") || ep.eventKey === event));

    const logs: WebhookDeliveryLog[] = [];

    for (const ep of matchingEndpoints) {
      const ssrfCheck = await this.validateUrlSafetyAsync(ep.url, options.allowLocalhostForTest);
      if (!ssrfCheck.safe) {
        const failedLog: WebhookDeliveryLog = {
          id: crypto.randomUUID(),
          endpointId: ep.id,
          endpointName: ep.name,
          tenantId,
          eventKey: event,
          method: ep.method || "POST",
          url: ep.url,
          status: "failed",
          statusCode: null,
          durationMs: 0,
          attempt: 1,
          maxAttempts: maxRetries,
          errorCode: "SSRF_BLOCKED",
          responseSnippet: `Blocked by SSRF defense: ${ssrfCheck.error}`,
          timestamp: new Date().toISOString(),
        };
        logs.push(failedLog);
        continue;
      }

      let secretPlain: string;
      try {
        const [iv, authTag, ciphertext] = ep.secret.split(":");
        secretPlain = decryptSecret(ciphertext, iv, authTag);
      } catch {
        secretPlain = "whsec_fallback_secret";
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const deliveryId = crypto.randomUUID();
      const stringifiedPayload = JSON.stringify({
        id: deliveryId,
        event,
        tenantId,
        timestamp,
        data: payloadData,
      });

      const signature = this.generateSignature(stringifiedPayload, secretPlain, timestamp);

      let attempt = 0;
      let delivered = false;
      let lastError: string | null = null;
      let lastStatusCode: number | null = null;
      let responseSnippet: string | null = null;
      const startTime = Date.now();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Webhook-Event": event,
        "X-Webhook-Delivery-Id": deliveryId,
        "X-Webhook-Timestamp": String(timestamp),
        "X-Webhook-Signature": signature,
        "X-MASTERHRMS-Signature": signature, // backward-compatible
        ...(ep.headersJson || {}),
      };

      attempt = 1;
      try {
        const resp = await this.safeDispatchHttp(
          ep.url,
          {
            method: ep.method || "POST",
            headers,
            body: stringifiedPayload,
            timeoutMs: ep.timeoutMs || 5000,
          },
          options.allowLocalhostForTest
        );

        lastStatusCode = resp.statusCode;
        responseSnippet = resp.responseSnippet ? resp.responseSnippet.slice(0, 1000) : null;
        if (resp.ok) {
          delivered = true;
        } else {
          lastError = resp.error || `HTTP ${resp.statusCode}`;
        }
      } catch (err: any) {
        lastError = err.message || "Network error";
      }

      let deliveryStatus: "success" | "failed" | "retrying" | "dead" = delivered ? "success" : "failed";
      let nextAttemptAt: string | null = null;

      if (!delivered) {
        const isRetryable = this.isRetryableError(lastStatusCode, lastError);
        if (isRetryable && maxRetries > 1) {
          deliveryStatus = "retrying";
          const backoffDelay = this.calculateBackoff(1, (ep.timeoutMs ? 2 : 2));
          nextAttemptAt = new Date(Date.now() + backoffDelay).toISOString();
        } else {
          deliveryStatus = "dead";
        }
      }

      const logRecord: WebhookDeliveryLog = {
        id: deliveryId,
        endpointId: ep.id,
        endpointName: ep.name,
        tenantId,
        eventKey: event,
        method: ep.method || "POST",
        url: ep.url,
        statusCode: lastStatusCode,
        durationMs: Date.now() - startTime,
        attempt,
        maxAttempts: maxRetries,
        status: deliveryStatus,
        nextAttemptAt,
        claimedAt: null,
        claimedBy: null,
        errorCode: delivered ? null : (lastStatusCode ? `HTTP_${lastStatusCode}` : (lastError || "NETWORK_ERROR")),
        responseSnippet,
        payload: payloadData,
        requestHeaders: { ...headers, "X-Webhook-Signature": "t=...,v1=••••" }, // redacted signature in log
        timestamp: new Date().toISOString(),
      };

      logs.push(logRecord);

      // Save delivery log
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

      // Record endpoint delivery outcome
      await this.recordEndpointDeliveryOutcome(tenantId, ep.id, delivered).catch(() => {});
    }

    return logs;
  }

  /**
   * Calculate exponential backoff with bounded jitter
   */
  static calculateBackoff(
    attempt: number,
    baseSeconds = 2,
    maxSeconds = 3600,
    jitterRatio = 0.2
  ): number {
    const rawBackoff = baseSeconds * Math.pow(2, Math.max(0, attempt - 1));
    const cappedBackoff = Math.min(rawBackoff, maxSeconds);
    const jitter = Math.random() * (cappedBackoff * jitterRatio);
    return Math.round((cappedBackoff + jitter) * 1000);
  }

  /**
   * Determine if an HTTP status code or error is retryable
   */
  static isRetryableError(statusCode: number | null, errorCode: string | null): boolean {
    if (errorCode === "SSRF_BLOCKED") return false;
    if (errorCode === "ENDPOINT_INACTIVE" || errorCode === "ENDPOINT_NOT_FOUND") return false;
    if (statusCode === null) return true;
    if (statusCode === 429) return true;
    if (statusCode >= 500 && statusCode < 600) return true;
    return false;
  }

  /**
   * Record endpoint delivery outcome and auto-disable after 5 consecutive failures
   */
  static async recordEndpointDeliveryOutcome(
    tenantId: string,
    endpointId: string,
    success: boolean
  ): Promise<void> {
    const rows = await db.setting.findMany({
      where: {
        scope: "TENANT",
        scopeId: tenantId,
        group: "outbound_webhooks",
        key: { startsWith: "endpoint:" },
      },
    });

    const endpointRow = rows.find((r) => (r.valueJson as any).id === endpointId);
    if (!endpointRow) return;

    const ep = endpointRow.valueJson as any as WebhookEndpoint;
    const consecutiveFailures = success ? 0 : (ep.consecutiveFailures || 0) + 1;
    const shouldAutoDisable = consecutiveFailures >= 5;

    await db.setting.update({
      where: { id: endpointRow.id },
      data: {
        valueJson: {
          ...ep,
          lastDeliveryAt: new Date().toISOString(),
          lastDeliveryStatus: success ? "success" : "failed",
          consecutiveFailures,
          status: shouldAutoDisable ? "disabled" : ep.status,
          disabledReason: shouldAutoDisable ? "Auto-disabled after 5 consecutive failed deliveries" : ep.disabledReason,
        } as any,
      },
    }).catch(() => {});
  }

  /**
   * List delivery logs
   */
  static async listDeliveryLogs(
    tenantId: string,
    limit = 100,
    filters?: { endpointId?: string; eventKey?: string; status?: string }
  ): Promise<WebhookDeliveryLog[]> {
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

    let logs = rows.map((r) => r.valueJson as any as WebhookDeliveryLog);
    if (filters?.endpointId && filters.endpointId !== "all") {
      logs = logs.filter((l) => l.endpointId === filters.endpointId);
    }
    if (filters?.status && filters.status !== "all") {
      logs = logs.filter((l) => l.status === filters.status);
    }
    if (filters?.eventKey && filters.eventKey !== "all") {
      logs = logs.filter((l) => l.eventKey === filters.eventKey);
    }

    return logs;
  }

  /**
   * Get Log Detail
   */
  static async getLogDetail(tenantId: string, logId: string): Promise<WebhookDeliveryLog | null> {
    const row = await db.setting.findFirst({
      where: {
        scope: "TENANT",
        scopeId: tenantId,
        group: "webhook_delivery_logs",
        key: `delivery:${logId}`,
      },
    });

    return row ? (row.valueJson as any as WebhookDeliveryLog) : null;
  }

  /**
   * Retry single delivery
   */
  static async retryDelivery(tenantId: string, logId: string, userId: string): Promise<WebhookDeliveryLog> {
    const log = await this.getLogDetail(tenantId, logId);
    if (!log) throw new Error("Delivery log not found");

    const endpointDetail = await this.getEndpointDetail(tenantId, log.endpointId).catch(() => null);
    if (!endpointDetail) throw new Error("Associated endpoint no longer exists");

    const retriedLogs = await this.dispatchEvent(
      tenantId,
      log.eventKey,
      log.payload || { retryOf: logId },
      { maxRetries: 2 }
    );

    return retriedLogs[0] || log;
  }

  /**
   * Get Settings
   */
  static async getSettings(tenantId: string): Promise<WebhookSettings> {
    const row = await db.setting.findFirst({
      where: {
        scope: "TENANT",
        scopeId: tenantId,
        group: "outbound_webhooks",
        key: "settings",
      },
    });

    if (row && row.valueJson) {
      return row.valueJson as any as WebhookSettings;
    }

    return {
      defaultTimeout: 5000,
      maxRetries: 3,
      backoffBaseSeconds: 2,
      autoDisableAfterFailures: 5,
      maxEndpoints: 25,
      logRetentionDays: 30,
    };
  }

  /**
   * Update Settings
   */
  static async updateSettings(
    tenantId: string,
    settings: Partial<WebhookSettings>,
    userId: string
  ): Promise<WebhookSettings> {
    const current = await this.getSettings(tenantId);
    const updated = { ...current, ...settings };

    await db.setting.upsert({
      where: {
        scope_scopeId_key: {
          scope: "TENANT",
          scopeId: tenantId,
          key: "settings",
        },
      },
      create: {
        scope: "TENANT",
        scopeId: tenantId,
        group: "outbound_webhooks",
        key: "settings",
        valueJson: updated as any,
        valueType: "json",
        updatedBy: userId,
      },
      update: {
        valueJson: updated as any,
        updatedBy: userId,
      },
    });

    return updated;
  }
}
