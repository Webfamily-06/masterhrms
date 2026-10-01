import net from "net";
import { Request, Response, NextFunction } from "express";
import { prisma, rawPrisma } from "../prisma";
import { AuthRequest } from "../middleware/auth";

/**
 * Validates whether the given string is a valid IPv4, IPv6, or CIDR notation.
 */
export function isValidIpOrCidr(input: string): boolean {
  if (!input || typeof input !== "string") return false;
  const trimmed = input.trim();

  if (trimmed.includes("/")) {
    const parts = trimmed.split("/");
    if (parts.length !== 2) return false;
    const [ip, prefixStr] = parts;
    const prefix = parseInt(prefixStr, 10);
    if (isNaN(prefix)) return false;

    const ipVersion = net.isIP(ip);
    if (ipVersion === 4) {
      return prefix >= 0 && prefix <= 32;
    } else if (ipVersion === 6) {
      return prefix >= 0 && prefix <= 128;
    }
    return false;
  }

  return net.isIP(trimmed) !== 0;
}

/**
 * Normalizes client IP addresses (strips IPv4-mapped IPv6 prefix).
 */
export function normalizeIp(ip: string): string {
  if (!ip) return "";
  let clean = ip.trim();
  if (clean.startsWith("::ffff:")) {
    clean = clean.slice(7);
  }
  if (clean === "::1") {
    clean = "127.0.0.1";
  }
  return clean;
}

/**
 * Checks if clientIp matches a CIDR or exact IP rule.
 */
export function matchIpOrCidr(clientIp: string, rule: string): boolean {
  const normClient = normalizeIp(clientIp);
  const normRule = rule.trim();

  // Exact match
  if (normClient === normalizeIp(normRule)) {
    return true;
  }

  // CIDR check for IPv4
  if (normRule.includes("/") && net.isIP(normClient) === 4) {
    const [network, prefixStr] = normRule.split("/");
    if (net.isIP(network) === 4) {
      const prefix = parseInt(prefixStr, 10);
      if (prefix >= 0 && prefix <= 32) {
        const clientInt = ipToLong(normClient);
        const networkInt = ipToLong(network);
        const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
        return (clientInt & mask) === (networkInt & mask);
      }
    }
  }

  return false;
}

function ipToLong(ip: string): number {
  return (
    ip
      .split(".")
      .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
  );
}

/**
 * Express middleware to actively enforce banned IPs for the authenticated tenant.
 */
export async function enforceBannedIp(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return next();
    }

    const rawIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      req.ip ||
      "";
    const clientIp = normalizeIp(rawIp);
    if (!clientIp) {
      return next();
    }

    const db = rawPrisma || prisma;
    const bannedRules = await db.bannedIp.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      select: {
        ipAddress: true,
        reason: true,
      },
    });

    if (bannedRules.length > 0) {
      const matched = bannedRules.find((rule) => matchIpOrCidr(clientIp, rule.ipAddress));
      if (matched) {
        return res.status(403).json({
          error: "Access Denied: Your IP address is blocked by workspace security firewall.",
          code: "IP_BANNED",
          clientIp,
          reason: matched.reason || undefined,
        });
      }
    }

    next();
  } catch (err) {
    // Fail open or pass through on firewall internal check errors
    console.error("[enforceBannedIp] Check error:", err);
    next();
  }
}
