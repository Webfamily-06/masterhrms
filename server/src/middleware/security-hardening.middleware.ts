import { Request, Response, NextFunction } from "express";

/**
 * Standard HTTP Security Headers Middleware.
 * Hardens against MIME confusion, clickjacking, legacy XSS, and info leakage.
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 1. Prevent MIME-type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // 2. Clickjacking protection (disallow framing except from same origin)
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  // 3. Cross-Site Scripting filter for legacy browsers
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // 4. Strict Referrer Policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // 5. Restrict sensitive browser features/permissions
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // 6. Strict Transport Security (HSTS) when running over HTTPS or in production
  const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
  const isProd = process.env.NODE_ENV === "production";
  if (isHttps || isProd) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  // 7. Remove identifying headers
  res.removeHeader("X-Powered-By");

  next();
}

export interface RateLimitOptions {
  windowMs: number; // e.g. 60000 (1 minute)
  max: number; // maximum requests per window
  keyGenerator?: (req: Request) => string;
  message?: string;
}

interface WindowBucket {
  count: number;
  resetAt: number;
}

/**
 * In-memory sliding window rate limiter.
 * Protects auth endpoints, webhooks, and high-frequency APIs from abuse.
 */
export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, max, keyGenerator, message } = options;
  const store = new Map<string, WindowBucket>();

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

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator
      ? keyGenerator(req)
      : (req.ip || req.socket.remoteAddress || "global_anonymous");

    const now = Date.now();
    let bucket = store.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = {
        count: 1,
        resetAt: now + windowMs,
      };
      store.set(key, bucket);
    } else {
      bucket.count += 1;
    }

    const remaining = Math.max(0, max - bucket.count);
    const resetSeconds = Math.ceil((bucket.resetAt - now) / 1000);

    res.setHeader("RateLimit-Limit", max.toString());
    res.setHeader("RateLimit-Remaining", remaining.toString());
    res.setHeader("RateLimit-Reset", resetSeconds.toString());

    if (bucket.count > max) {
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
 * Standard Auth Endpoint Rate Limiter:
 * Allows max 20 login/token attempts per IP per minute.
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: "Too many authentication attempts. Please wait 60 seconds before trying again.",
});

/**
 * Sensitive Public Endpoints Rate Limiter:
 * Allows max 60 requests per IP per minute.
 */
export const sensitiveEndpointLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: "Rate limit exceeded. Please throttle your requests.",
});
