"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTenantContext = resolveTenantContext;
const bannedIpCache = new Map();
const tenant_connection_manager_service_1 = require("../services/tenant-connection-manager.service");
const tenant_context_1 = require("../context/tenant-context");
const ip_firewall_1 = require("../lib/ip-firewall");
/**
 * Express middleware to resolve, authorize, and bind the Request-Scoped Tenant Context.
 * Placed immediately after requireAuth.
 */
async function resolveTenantContext(req, res, next) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: "Unauthorized: Missing authentication context." });
        }
        const tenantId = user.tenantId;
        if (!tenantId) {
            return res.status(403).json({ error: "Forbidden: Missing tenant context." });
        }
        // ── Host-Resolved Tenant Isolation Enforcement (Flow 1 & Flow 2) ───
        const hostContext = req.hostContext;
        const resolvedTenant = req.resolvedTenant;
        if ((hostContext?.type === "tenant" || hostContext?.type === "custom_domain") && resolvedTenant) {
            if (user.tenantId !== resolvedTenant.id) {
                return res.status(403).json({
                    error: "Cross-workspace access denied. Your session does not match this workspace host.",
                    code: "HOST_TENANT_MISMATCH",
                });
            }
        }
        // Resolve tenant client and tenancy strategy via Connection Manager
        const connectionManager = tenant_connection_manager_service_1.TenantConnectionManager.getInstance();
        const { client, strategy, status } = await connectionManager.getClientForTenant(tenantId);
        const context = {
            tenantId,
            userId: user.userId || user.id,
            roles: user.roles || [],
            status,
            tenancyStrategy: strategy,
            db: client,
        };
        // Active Banned IP Firewall Enforcement
        const rawIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
            req.socket.remoteAddress ||
            req.ip ||
            "";
        const clientIp = (0, ip_firewall_1.normalizeIp)(rawIp);
        if (clientIp) {
            try {
                let bannedRules = [];
                const cachedBanned = bannedIpCache.get(tenantId);
                if (cachedBanned && cachedBanned.expiresAt > Date.now()) {
                    bannedRules = cachedBanned.rules;
                }
                else {
                    bannedRules = await client.bannedIp.findMany({
                        where: { tenantId, isActive: true },
                        select: { ipAddress: true, reason: true },
                    });
                    bannedIpCache.set(tenantId, { rules: bannedRules, expiresAt: Date.now() + 60000 });
                }
                if (bannedRules.length > 0) {
                    const matched = bannedRules.find((rule) => (0, ip_firewall_1.matchIpOrCidr)(clientIp, rule.ipAddress));
                    if (matched) {
                        return res.status(403).json({
                            error: "Access Denied: Your IP address is blocked by workspace security firewall.",
                            code: "IP_BANNED",
                            clientIp,
                            reason: matched.reason || undefined,
                        });
                    }
                }
            }
            catch (firewallErr) {
                console.warn("[Firewall Check Warning]:", firewallErr);
            }
        }
        // Run remaining middleware and route handlers inside AsyncLocalStorage context scope
        console.log(`[PERF_CTX] resolveTenantContext done: ${Date.now() - req._tStart}ms`);
        tenant_context_1.tenantStorage.run(context, () => {
            next();
        });
    }
    catch (err) {
        const status = err.status || 500;
        const message = err.message || "Failed to resolve workspace context.";
        // Never expose raw database connection strings or passwords in API response
        const sanitizedMessage = message.replace(/mysql:\/\/.*?@/g, "mysql://[REDACTED]@");
        return res.status(status).json({
            error: sanitizedMessage,
            code: err.code || "TENANT_RESOLUTION_ERROR",
        });
    }
}
