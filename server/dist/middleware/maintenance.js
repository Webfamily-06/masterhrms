"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlatformMaintenanceConfig = getPlatformMaintenanceConfig;
exports.invalidateMaintenanceCache = invalidateMaintenanceCache;
exports.evaluateMaintenanceStatus = evaluateMaintenanceStatus;
exports.maintenanceMiddleware = maintenanceMiddleware;
const prisma_1 = require("../prisma");
const jwt_1 = require("../lib/jwt");
const workspace_host_1 = require("../lib/workspace-host");
const settings_service_1 = require("../services/settings/settings.service");
let cachedConfig = null;
const CACHE_TTL_MS = 5000; // 5-second in-memory cache for high throughput
async function getPlatformMaintenanceConfig() {
    const now = Date.now();
    if (cachedConfig && now - cachedConfig.cachedAt < CACHE_TTL_MS) {
        return cachedConfig;
    }
    try {
        const [page, modeVal, msgVal] = await Promise.all([
            (prisma_1.rawPrisma || prisma_1.prisma).cmsPage.findUnique({
                where: { slug: "system-platform-settings" },
            }).catch(() => null),
            settings_service_1.SettingsService.get("PLATFORM", null, "system.maintenance_mode").catch(() => null),
            settings_service_1.SettingsService.get("PLATFORM", null, "system.maintenance_message").catch(() => null),
        ]);
        const content = page?.content || {};
        const maintenanceMode = Boolean(content.maintenanceMode) || Boolean(modeVal);
        const maintenanceScheduled = Boolean(content.maintenanceScheduled);
        const maintenanceNoticeMessage = content.maintenanceNoticeMessage || (msgVal ? String(msgVal) : undefined);
        const maintenanceStartTime = content.maintenanceStartTime || undefined;
        const maintenanceEndTime = content.maintenanceEndTime || undefined;
        const defaultTimezone = content.defaultTimezone || "Asia/Kolkata";
        const supportEmail = content.supportEmail || `support@${(0, workspace_host_1.getBaseDomain)()}`;
        cachedConfig = {
            maintenanceMode,
            maintenanceScheduled,
            maintenanceNoticeMessage,
            maintenanceStartTime,
            maintenanceEndTime,
            defaultTimezone,
            supportEmail,
            cachedAt: now,
        };
        return cachedConfig;
    }
    catch (err) {
        if (cachedConfig)
            return cachedConfig;
        return {
            maintenanceMode: false,
            maintenanceScheduled: false,
            defaultTimezone: "Asia/Kolkata",
            supportEmail: `support@${(0, workspace_host_1.getBaseDomain)()}`,
        };
    }
}
function invalidateMaintenanceCache() {
    cachedConfig = null;
}
function evaluateMaintenanceStatus(config) {
    const now = Date.now();
    let startTimeMs = null;
    let endTimeMs = null;
    if (config.maintenanceStartTime) {
        const parsed = Date.parse(config.maintenanceStartTime);
        if (!isNaN(parsed))
            startTimeMs = parsed;
    }
    if (config.maintenanceEndTime) {
        const parsed = Date.parse(config.maintenanceEndTime);
        if (!isNaN(parsed))
            endTimeMs = parsed;
    }
    // 1. Explicit emergency / instant toggle enabled by Super Admin
    if (config.maintenanceMode) {
        let retryAfterSeconds = null;
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
    if (config.maintenanceScheduled && startTimeMs) {
        if (endTimeMs) {
            if (now >= startTimeMs && now < endTimeMs) {
                const retryAfterSeconds = Math.ceil((endTimeMs - now) / 1000);
                return {
                    isActive: true,
                    isScheduled: true,
                    status: "active",
                    retryAfterSeconds,
                };
            }
            else if (now < startTimeMs) {
                return {
                    isActive: false,
                    isScheduled: true,
                    status: "scheduled",
                    retryAfterSeconds: null,
                };
            }
            else if (now >= endTimeMs) {
                return {
                    isActive: false,
                    isScheduled: false,
                    status: "completed",
                    retryAfterSeconds: null,
                };
            }
        }
        else {
            // Scheduled maintenance started without configured or valid end time
            if (now >= startTimeMs) {
                return {
                    isActive: true,
                    isScheduled: true,
                    status: "active",
                    retryAfterSeconds: null,
                };
            }
            else {
                return {
                    isActive: false,
                    isScheduled: true,
                    status: "scheduled",
                    retryAfterSeconds: null,
                };
            }
        }
    }
    return {
        isActive: false,
        isScheduled: false,
        status: "operational",
        retryAfterSeconds: null,
    };
}
async function maintenanceMiddleware(req, res, next) {
    try {
        const isPreflight = req.method === "OPTIONS" || req.method === "HEAD";
        if (isPreflight)
            return next();
        const url = req.originalUrl || req.url;
        // 1. Whitelisted Public Endpoints (Least Privilege)
        const isWhitelisted = url.startsWith("/api/health") ||
            url.startsWith("/api/system/maintenance-status") ||
            url.startsWith("/api/v1/public/app-config") ||
            url.startsWith("/api/public/app-config") ||
            url.startsWith("/api/app-config") ||
            url.startsWith("/api/cms/pages/system-platform-settings") ||
            url.startsWith("/api/cms/pages/footer") ||
            url.startsWith("/api/auth/login") ||
            url.startsWith("/api/auth/verify-2fa") ||
            url.startsWith("/api/auth/logout") ||
            url.startsWith("/api/auth/me") ||
            url.startsWith("/api/auth/oauth") ||
            url.startsWith("/api/auth/check-domain") ||
            // Specific payment webhook endpoints with signature validation
            url.startsWith("/api/payments/razorpay/webhook") ||
            url.startsWith("/api/webhooks/razorpay") ||
            url.startsWith("/api/billing/webhook") ||
            url.startsWith("/api/commerce/webhook") ||
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
                const decoded = (0, jwt_1.verifyToken)(token);
                const userId = decoded.userId || decoded.id;
                if (userId) {
                    const user = await (prisma_1.rawPrisma || prisma_1.prisma).user.findUnique({
                        where: { id: userId },
                        include: { roles: true },
                    });
                    const isSuperAdmin = user?.roles?.some((r) => r.role === "super_admin");
                    if (isSuperAdmin) {
                        // Authorized Super Admin can manage maintenance mode, view logs, and access Super routes
                        return next();
                    }
                }
            }
            catch {
                // Invalid/expired token during maintenance -> proceed to 503 response
            }
        }
        // 3. Block Non-Super Admin requests with HTTP 503 Service Unavailable
        if (evaluation.retryAfterSeconds && evaluation.retryAfterSeconds > 0) {
            res.setHeader("Retry-After", String(evaluation.retryAfterSeconds));
        }
        return res.status(503).json({
            error: config.maintenanceNoticeMessage ||
                "System is currently undergoing scheduled maintenance. We are performing essential platform and database upgrades.",
            code: "SYSTEM_MAINTENANCE",
            maintenance: {
                status: "active",
                startTime: config.maintenanceStartTime || null,
                endTime: config.maintenanceEndTime || null,
                message: config.maintenanceNoticeMessage || null,
                timezone: config.defaultTimezone || "Asia/Kolkata",
                supportEmail: config.supportEmail || `support@${(0, workspace_host_1.getBaseDomain)()}`,
            },
        });
    }
    catch (err) {
        console.error("[maintenanceMiddleware Error]:", err);
        return next(err);
    }
}
