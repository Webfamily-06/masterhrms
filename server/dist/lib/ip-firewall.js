"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidIpOrCidr = isValidIpOrCidr;
exports.normalizeIp = normalizeIp;
exports.matchIpOrCidr = matchIpOrCidr;
exports.enforceBannedIp = enforceBannedIp;
const net_1 = __importDefault(require("net"));
const prisma_1 = require("../prisma");
/**
 * Validates whether the given string is a valid IPv4, IPv6, or CIDR notation.
 */
function isValidIpOrCidr(input) {
    if (!input || typeof input !== "string")
        return false;
    const trimmed = input.trim();
    if (trimmed.includes("/")) {
        const parts = trimmed.split("/");
        if (parts.length !== 2)
            return false;
        const [ip, prefixStr] = parts;
        const prefix = parseInt(prefixStr, 10);
        if (isNaN(prefix))
            return false;
        const ipVersion = net_1.default.isIP(ip);
        if (ipVersion === 4) {
            return prefix >= 0 && prefix <= 32;
        }
        else if (ipVersion === 6) {
            return prefix >= 0 && prefix <= 128;
        }
        return false;
    }
    return net_1.default.isIP(trimmed) !== 0;
}
/**
 * Normalizes client IP addresses (strips IPv4-mapped IPv6 prefix).
 */
function normalizeIp(ip) {
    if (!ip)
        return "";
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
function matchIpOrCidr(clientIp, rule) {
    const normClient = normalizeIp(clientIp);
    const normRule = rule.trim();
    // Exact match
    if (normClient === normalizeIp(normRule)) {
        return true;
    }
    // CIDR check for IPv4
    if (normRule.includes("/") && net_1.default.isIP(normClient) === 4) {
        const [network, prefixStr] = normRule.split("/");
        if (net_1.default.isIP(network) === 4) {
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
function ipToLong(ip) {
    return (ip
        .split(".")
        .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0);
}
/**
 * Express middleware to actively enforce banned IPs for the authenticated tenant.
 */
async function enforceBannedIp(req, res, next) {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return next();
        }
        const rawIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
            req.socket.remoteAddress ||
            req.ip ||
            "";
        const clientIp = normalizeIp(rawIp);
        if (!clientIp) {
            return next();
        }
        const db = prisma_1.rawPrisma || prisma_1.prisma;
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
    }
    catch (err) {
        // Fail open or pass through on firewall internal check errors
        console.error("[enforceBannedIp] Check error:", err);
        next();
    }
}
