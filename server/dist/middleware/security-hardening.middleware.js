"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sensitiveEndpointLimiter = exports.authRateLimiter = exports.authSessionRateLimiter = exports.authCredentialRateLimiter = exports.authCredentialIpBurstLimiter = exports.authCredentialAccountLimiter = void 0;
exports.securityHeadersMiddleware = securityHeadersMiddleware;
exports.createRateLimiter = createRateLimiter;
/**
 * Standard HTTP Security Headers Middleware (PENTEST-005 Hardened).
 * Hardens against MIME confusion, clickjacking, XSS, framing, and server info leakage.
 */
function securityHeadersMiddleware(req, res, next) {
    // 1. Prevent MIME-type sniffing
    res.setHeader("X-Content-Type-Options", "nosniff");
    // 2. Clickjacking protection (disallow framing except from same origin)
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    // 3. Strict Content-Security-Policy for API responses (PT-HDR-01)
    if (!res.getHeader("Content-Security-Policy")) {
        res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    }
    // 4. Cross-Site Scripting filter for legacy browsers
    res.setHeader("X-XSS-Protection", "1; mode=block");
    // 5. Strict Referrer Policy
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    // 6. Restrict sensitive browser features/permissions
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    // 7. Strict Transport Security (HSTS) when running over HTTPS or in production
    const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
    const isProd = process.env.NODE_ENV === "production";
    if (isHttps || isProd) {
        res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    }
    // 8. Remove identifying headers
    res.removeHeader("X-Powered-By");
    next();
}
const MAX_MEMORY_BUCKETS = 100_000;
// Optional distributed Redis client (lazily initialized when REDIS_URL is configured)
let redisRateLimitClient = null;
let redisInitAttempted = false;
async function getRedisClient() {
    if (!process.env.REDIS_URL)
        return null;
    if (redisRateLimitClient?.isReady)
        return redisRateLimitClient;
    if (redisInitAttempted)
        return null;
    redisInitAttempted = true;
    try {
        const redisPkgName = "redis";
        const { createClient } = await Promise.resolve(`${redisPkgName}`).then(s => __importStar(require(s)));
        const client = createClient({ url: process.env.REDIS_URL });
        client.on("error", (err) => {
            console.warn("[RateLimiter] Redis error (falling back to in-memory):", err?.message);
        });
        await client.connect();
        redisRateLimitClient = client;
        console.log("⚡ [RateLimiter] Connected to Redis for distributed rate limiting.");
        return redisRateLimitClient;
    }
    catch (err) {
        console.warn("[RateLimiter] REDIS_URL set but redis package/server unavailable; using in-memory fallback:", err?.message);
        return null;
    }
}
/**
 * Distributed-ready sliding window rate limiter.
 * Uses Redis atomic INCR + PEXPIRE when REDIS_URL is configured for multi-instance deployments,
 * with bounded in-memory Map fallback for single-instance / local environments.
 */
function createRateLimiter(options) {
    const { windowMs, max, prefix = "default", keyGenerator, message } = options;
    const store = new Map();
    // Cleanup expired buckets every minute to prevent memory leak
    const cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, bucket] of store.entries()) {
            if (bucket.resetAt <= now) {
                store.delete(key);
            }
        }
    }, Math.max(windowMs, 60000));
    if (cleanupInterval.unref) {
        cleanupInterval.unref();
    }
    return async (req, res, next) => {
        const rawKey = keyGenerator
            ? keyGenerator(req)
            : (req.ip || req.socket.remoteAddress || "global_anonymous");
        let count = 0;
        let resetSeconds = Math.ceil(windowMs / 1000);
        // 1. Try distributed Redis counter if REDIS_URL is configured
        const redis = await getRedisClient();
        if (redis) {
            try {
                const redisKey = `rl:${prefix}:${rawKey}`;
                count = Number(await redis.incr(redisKey));
                if (count === 1) {
                    await redis.pExpire(redisKey, windowMs);
                }
                const ttlMs = Number(await redis.pTTL(redisKey));
                if (ttlMs > 0) {
                    resetSeconds = Math.ceil(ttlMs / 1000);
                }
            }
            catch {
                count = 0;
            }
        }
        // 2. Bounded in-memory fallback (single-instance or Redis unavailable)
        if (count === 0) {
            const now = Date.now();
            let bucket = store.get(rawKey);
            if (!bucket || bucket.resetAt <= now) {
                if (store.size >= MAX_MEMORY_BUCKETS) {
                    const firstKey = store.keys().next().value;
                    if (firstKey)
                        store.delete(firstKey);
                }
                bucket = { count: 1, resetAt: now + windowMs };
                store.set(rawKey, bucket);
            }
            else {
                bucket.count += 1;
            }
            count = bucket.count;
            resetSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
        }
        const remaining = Math.max(0, max - count);
        res.setHeader("RateLimit-Limit", max.toString());
        res.setHeader("RateLimit-Remaining", remaining.toString());
        res.setHeader("RateLimit-Reset", resetSeconds.toString());
        if (count > max) {
            res.setHeader("Retry-After", resetSeconds.toString());
            return res.status(429).json({
                error: message || "Too many requests. Please try again later.",
                code: "RATE_LIMIT_EXCEEDED",
                retryAfter: resetSeconds,
            });
        }
        next();
    };
}
/**
 * PERF-001 Tier 1 — Per-(IP + Email) Credential Brute-Force Limiter:
 * Blocks single-account credential stuffing (max 15 attempts/min per account+IP)
 * WITHOUT blocking 1,000 distinct employees signing in behind the same corporate office NAT IP!
 */
exports.authCredentialAccountLimiter = createRateLimiter({
    prefix: "auth_cred_acct",
    windowMs: 60 * 1000,
    max: Number(process.env.AUTH_CRED_PER_ACCOUNT_MAX || 15),
    keyGenerator: (req) => {
        const ip = req.ip || req.socket.remoteAddress || "anon";
        const email = String(req.body?.email || req.body?.mfaToken || "")
            .trim()
            .toLowerCase()
            .slice(0, 120);
        return email ? `${ip}:${email}` : `${ip}:no_email`;
    },
    message: "Too many login attempts for this account. Please wait 60 seconds before trying again.",
});
/**
 * PERF-001 Tier 2 — Corporate-NAT-Safe IP Burst Ceiling for Credential Endpoints:
 * Allows up to 2,000 distinct-account login attempts/min per corporate NAT IP (configurable via AUTH_IP_BURST_MAX),
 * while still protecting against raw unauthenticated HTTP floods.
 */
exports.authCredentialIpBurstLimiter = createRateLimiter({
    prefix: "auth_cred_ip_burst",
    windowMs: 60 * 1000,
    max: Number(process.env.AUTH_IP_BURST_MAX || 2000),
    message: "Authentication burst capacity exceeded from this network. Please retry shortly.",
});
/**
 * Combined Credential Rate Limiter middleware chain (Tier 1 + Tier 2).
 */
exports.authCredentialRateLimiter = [
    exports.authCredentialIpBurstLimiter,
    exports.authCredentialAccountLimiter,
];
/**
 * PERF-001 Tier 3 — General Auth Router Session Limiter (/auth/me, /refresh, /sessions, etc.):
 * High corporate-NAT-safe ceiling so 1,000 employees loading pages behind one office Wi-Fi IP never hit 429.
 */
exports.authSessionRateLimiter = createRateLimiter({
    prefix: "auth_session",
    windowMs: 60 * 1000,
    max: Number(process.env.AUTH_SESSION_IP_MAX || 5000),
    message: "Too many session requests from this network. Please retry shortly.",
});
// Backwards-compatible alias used in server/src/index.ts
exports.authRateLimiter = exports.authSessionRateLimiter;
/**
 * Sensitive Public Endpoints Rate Limiter:
 * Allows max 60 requests per IP per minute.
 */
exports.sensitiveEndpointLimiter = createRateLimiter({
    prefix: "sensitive",
    windowMs: 60 * 1000,
    max: 60,
    message: "Rate limit exceeded. Please throttle your requests.",
});
