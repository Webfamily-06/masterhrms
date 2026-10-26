"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTenantId = resolveTenantId;
/**
 * Strict Multi-Tenant Context Resolver (Constitutional Standard)
 * Ensures queries NEVER execute without an authentic, isolated tenant_id.
 * Rejects unauthenticated or ambiguous requests with 403 Forbidden.
 */
function resolveTenantId(req, res) {
    const tenantId = req.user?.tenantId;
    if (!tenantId || tenantId === "default") {
        res.status(403).json({ error: "Forbidden: Valid workspace context is required." });
        return null;
    }
    return tenantId;
}
