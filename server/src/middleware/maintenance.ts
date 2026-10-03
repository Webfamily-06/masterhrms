import { Request, Response, NextFunction } from "express";
import { prisma, rawPrisma } from "../prisma";
import { verifyToken } from "../lib/jwt";
import { getBaseDomain } from "../lib/workspace-host";

export interface MaintenanceConfig {
  maintenanceMode: boolean;
  maintenanceScheduled: boolean;
  maintenanceNoticeMessage?: string;
  maintenanceStartTime?: string;
  maintenanceEndTime?: string;
  defaultTimezone?: string;
  supportEmail?: string;
}

let cachedConfig: (MaintenanceConfig & { cachedAt: number }) | null = null;
const CACHE_TTL_MS = 5000; // 5-second in-memory cache for high throughput

export async function getPlatformMaintenanceConfig(): Promise<MaintenanceConfig> {
  const now = Date.now();
  if (cachedConfig && now - cachedConfig.cachedAt < CACHE_TTL_MS) {
    return cachedConfig;
  }

  try {
    const page = await (rawPrisma || prisma).cmsPage.findUnique({
      where: { slug: "system-platform-settings" },
    });
    const content = (page?.content as any) || {};
    cachedConfig = {
      maintenanceMode: Boolean(content.maintenanceMode),
      maintenanceScheduled: Boolean(content.maintenanceScheduled),
      maintenanceNoticeMessage: content.maintenanceNoticeMessage || undefined,
      maintenanceStartTime: content.maintenanceStartTime || undefined,
      maintenanceEndTime: content.maintenanceEndTime || undefined,
      defaultTimezone: content.defaultTimezone || "Asia/Kolkata",
      supportEmail: content.supportEmail || `support@${getBaseDomain()}`,
      cachedAt: now,
    };
  } catch (err) {
    if (cachedConfig) return cachedConfig;
    return {
      maintenanceMode: false,
      maintenanceScheduled: false,
      defaultTimezone: "Asia/Kolkata",
      supportEmail: `support@${getBaseDomain()}`,
    };
  }
  return cachedConfig;
}

export function invalidateMaintenanceCache(): void {
  cachedConfig = null;
}

export function evaluateMaintenanceStatus(config: MaintenanceConfig): {
  isActive: boolean;
  isScheduled: boolean;
  status: "active" | "scheduled" | "completed" | "operational";
  retryAfterSeconds: number | null;
} {
  const now = Date.now();
  let startTimeMs: number | null = null;
  let endTimeMs: number | null = null;

  if (config.maintenanceStartTime) {
    const parsed = Date.parse(config.maintenanceStartTime);
    if (!isNaN(parsed)) startTimeMs = parsed;
  }
  if (config.maintenanceEndTime) {
    const parsed = Date.parse(config.maintenanceEndTime);
    if (!isNaN(parsed)) endTimeMs = parsed;
  }

  // 1. Explicit emergency / instant toggle enabled by Super Admin
  if (config.maintenanceMode) {
    let retryAfterSeconds: number | null = null;
    if (endTimeMs && endTimeMs > now) {
      retryAfterSeconds = Math.ceil((endTimeMs - now) / 1000);
    }
    return {
      isActive: true,
      isScheduled: Boolean(config.maintenanceScheduled),
      status: "active",
      retryAfterSeconds,
    };
  }

  // 2. Scheduled maintenance window check
  if (config.maintenanceScheduled && startTimeMs && endTimeMs) {
    if (now >= startTimeMs && now < endTimeMs) {
      const retryAfterSeconds = Math.ceil((endTimeMs - now) / 1000);
      return {
        isActive: true,
        isScheduled: true,
        status: "active",
        retryAfterSeconds,
      };
    } else if (now < startTimeMs) {
      return {
        isActive: false,
        isScheduled: true,
        status: "scheduled",
        retryAfterSeconds: null,
      };
    } else if (now >= endTimeMs) {
      return {
        isActive: false,
        isScheduled: false,
        status: "completed",
        retryAfterSeconds: null,
      };
    }
  }

  return {
    isActive: false,
    isScheduled: false,
    status: "operational",
    retryAfterSeconds: null,
  };
}

export async function maintenanceMiddleware(req: Request, res: Response, next: NextFunction) {
  const isPreflight = req.method === "OPTIONS" || req.method === "HEAD";
  if (isPreflight) return next();

  const url = req.originalUrl || req.url;

  // 1. Whitelisted Public Endpoints
  const isWhitelisted =
    url.startsWith("/api/health") ||
    url.startsWith("/api/system/maintenance-status") ||
    url.startsWith("/api/cms/pages/system-platform-settings") ||
    url.startsWith("/api/cms/pages/footer") ||
    url.startsWith("/api/auth/login") ||
    url.startsWith("/api/auth/verify-2fa") ||
    url.startsWith("/api/auth/logout") ||
    url.startsWith("/api/auth/me") ||
    url.startsWith("/api/auth/oauth") ||
    url.startsWith("/api/auth/check-domain") ||
    url.startsWith("/api/webhooks") ||
    url.startsWith("/ui-assets") ||
    url.startsWith("/assets") ||
    url.startsWith("/favicon") ||
    url.startsWith("/logo");

  if (isWhitelisted) {
    return next();
  }

  const config = await getPlatformMaintenanceConfig();
  const evaluation = evaluateMaintenanceStatus(config);

  if (!evaluation.isActive) {
    return next();
  }

  // 2. Privileged Access Check: Authorized Super Admin Bypass
  // Only granted if caller presents a valid Bearer token belonging to an authentic Super Admin user
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded: any = verifyToken(token);
      const userId = decoded.userId || decoded.id;
      if (userId) {
        const user = await (rawPrisma || prisma).user.findUnique({
          where: { id: userId },
          include: { roles: true },
        });
        const isSuperAdmin = user?.roles?.some((r: any) => r.role === "super_admin");
        if (isSuperAdmin) {
          // Authorized Super Admin can manage maintenance mode, view logs, and access Super routes
          return next();
        }
      }
    } catch {
      // Invalid/expired token during maintenance -> proceed to 503 response
    }
  }

  // 3. Block Non-Super Admin requests with HTTP 503 Service Unavailable
  if (evaluation.retryAfterSeconds && evaluation.retryAfterSeconds > 0) {
    res.setHeader("Retry-After", String(evaluation.retryAfterSeconds));
  }

  return res.status(503).json({
    error:
      config.maintenanceNoticeMessage ||
      "System is currently undergoing scheduled maintenance. We are performing essential platform and database upgrades.",
    code: "SYSTEM_MAINTENANCE",
    maintenance: {
      status: "active",
      startTime: config.maintenanceStartTime || null,
      endTime: config.maintenanceEndTime || null,
      message: config.maintenanceNoticeMessage || null,
      timezone: config.defaultTimezone || "Asia/Kolkata",
      supportEmail: config.supportEmail || `support@${getBaseDomain()}`,
    },
  });
}
