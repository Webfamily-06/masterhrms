import type { Request } from "express";
import { prisma, rawPrisma } from "../prisma";

export interface TenantIpRule {
  id: string;
  ip: string;
  label?: string;
  createdAt?: string;
}

export interface TenantIpPolicy {
  enabled: boolean;
  allowedIps: TenantIpRule[];
}

const tenantIpPolicyCache = new Map<string, { policy: TenantIpPolicy; expiresAt: number }>();
const CACHE_TTL_MS = 15_000;

export function invalidateTenantIpCache(tenantId?: string) {
  if (!tenantId) {
    tenantIpPolicyCache.clear();
    return;
  }
  tenantIpPolicyCache.delete(tenantId);
}

/** Normalize IPv4-mapped IPv6 and loopback addresses for reliable comparison */
export function normalizeIp(raw?: string | null): string {
  if (!raw) return "";
  let ip = String(raw).trim();
  // Take first entry if comma-separated X-Forwarded-For list
  if (ip.includes(",")) {
    ip = ip.split(",")[0].trim();
  }
  // Strip port if present on IPv4 (e.g., 192.168.1.1:54321)
  if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) {
    ip = ip.split(":")[0];
  }
  // Strip IPv4-mapped IPv6 prefix ::ffff:
  if (ip.toLowerCase().startsWith("::ffff:")) {
    ip = ip.slice(7);
  }
  if (ip === "::1") {
    return "127.0.0.1";
  }
  return ip;
}

/** Extract the real client IP address from Express request headers/socket */
export function extractClientIp(req: Request): string {
  const cfIp = req.headers["cf-connecting-ip"];
  if (typeof cfIp === "string" && cfIp.trim()) return normalizeIp(cfIp);

  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) return normalizeIp(xff);
  if (Array.isArray(xff) && xff[0]) return normalizeIp(xff[0]);

  const xReal = req.headers["x-real-ip"];
  if (typeof xReal === "string" && xReal.trim()) return normalizeIp(xReal);

  return normalizeIp(req.ip || req.socket?.remoteAddress || "");
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let num = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n < 0 || n > 255) return null;
    num = (num << 8) | n;
  }
  return num >>> 0;
}

/** Validate an IPv4, IPv4 CIDR, IPv6, or IPv6 CIDR entry */
export function isValidIpOrCidr(entry: string): boolean {
  const trimmed = String(entry || "").trim();
  if (!trimmed) return false;

  if (trimmed.includes("/")) {
    const [base, prefixStr] = trimmed.split("/");
    if (!base || !prefixStr || !/^\d{1,3}$/.test(prefixStr)) return false;
    const prefix = Number(prefixStr);
    if (ipv4ToInt(base) !== null) {
      return prefix >= 0 && prefix <= 32;
    }
    // Basic IPv6 CIDR check
    if (base.includes(":") && /^[0-9a-fA-F:]+$/.test(base)) {
      return prefix >= 0 && prefix <= 128;
    }
    return false;
  }

  if (ipv4ToInt(trimmed) !== null) return true;
  if (trimmed.includes(":") && /^[0-9a-fA-F:]+$/.test(trimmed)) return true;
  return false;
}

/** Check whether a client IP matches a single allowed IP or CIDR rule */
function matchesRule(clientIp: string, ruleIp: string): boolean {
  const normClient = normalizeIp(clientIp);
  const normRule = normalizeIp(ruleIp);
  if (!normClient || !normRule) return false;

  if (normClient === normRule) return true;

  // IPv4 CIDR match
  if (normRule.includes("/")) {
    const [base, prefixStr] = normRule.split("/");
    const prefix = Number(prefixStr);
    const clientInt = ipv4ToInt(normClient);
    const baseInt = ipv4ToInt(normalizeIp(base));
    if (clientInt !== null && baseInt !== null && prefix >= 0 && prefix <= 32) {
      const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
      return (clientInt & mask) === (baseInt & mask);
    }
  }

  return false;
}

/** Load strictly tenant-scoped IP Restriction policy from PostgreSQL (15s TTL cache) */
export async function getTenantIpPolicy(tenantId: string): Promise<TenantIpPolicy> {
  const cached = tenantIpPolicyCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.policy;
  }

  const db = rawPrisma || prisma;
  const rows = await db.setting.findMany({
    where: {
      scope: "TENANT",
      scopeId: tenantId,
      group: "tenant_system_settings",
      key: { in: ["ip_restriction", "system"] },
    },
    select: { key: true, valueJson: true },
  });

  const ipRow = rows.find((r: any) => r.key === "ip_restriction")?.valueJson as Record<string, any> | undefined;
  const sysRow = rows.find((r: any) => r.key === "system")?.valueJson as Record<string, any> | undefined;

  const enabled = Boolean(ipRow?.enabled ?? sysRow?.ipRestrictionEnabled ?? false);
  const allowedIps: TenantIpRule[] = Array.isArray(ipRow?.allowedIps)
    ? ipRow.allowedIps.filter((item: any) => item && typeof item.ip === "string" && item.ip.trim())
    : [];

  const policy: TenantIpPolicy = { enabled, allowedIps };
  tenantIpPolicyCache.set(tenantId, { policy, expiresAt: Date.now() + CACHE_TTL_MS });
  return policy;
}

/**
 * Enforce IP Restriction strictly for a specific tenant.
 * - Super Admins are always bypassed (never locked out of platform or tenant rescue).
 * - Other tenants and public routes are completely unaffected.
 * - If enabled is false OR allowedIps is empty, access is permitted (prevents accidental lockout).
 */
export async function checkTenantIpAccess(
  tenantId: string | null | undefined,
  req: Request,
  isSuperAdmin: boolean
): Promise<{ allowed: boolean; clientIp: string; reason?: string }> {
  const clientIp = extractClientIp(req);
  if (isSuperAdmin || !tenantId) {
    return { allowed: true, clientIp };
  }

  try {
    const policy = await getTenantIpPolicy(tenantId);
    if (!policy.enabled || policy.allowedIps.length === 0) {
      return { allowed: true, clientIp };
    }

    const matched = policy.allowedIps.some((rule) => matchesRule(clientIp, rule.ip));
    if (matched) {
      return { allowed: true, clientIp };
    }

    return {
      allowed: false,
      clientIp,
      reason: `Access restricted by your organization's IP Restriction policy. Your current IP (${clientIp || "unknown"}) is not in the allowed list.`,
    };
  } catch (err) {
    // Fail-open on transient DB errors to avoid false-positive outages
    console.warn("[TenantIpRestriction] Policy lookup failed:", (err as any)?.message);
    return { allowed: true, clientIp };
  }
}
