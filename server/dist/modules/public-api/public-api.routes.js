"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateApiKey = exports.publicApiRouter = void 0;
const express_1 = require("express");
const public_api_service_1 = require("./public-api.service");
const auth_1 = require("../../middleware/auth");
exports.publicApiRouter = (0, express_1.Router)();
// Express middleware for authenticating API requests via API Key
const authenticateApiKey = (requiredScope) => {
    return async (req, res, next) => {
        let rawKey = req.headers["x-api-key"];
        if (!rawKey && req.headers.authorization?.startsWith("Bearer ")) {
            const token = req.headers.authorization.slice(7).trim();
            if (token.startsWith("mhr_live_")) {
                rawKey = token;
            }
        }
        if (!rawKey) {
            return res.status(401).json({
                error: "Missing API Key. Provide via X-API-Key header or Bearer mhr_live_...",
            });
        }
        const verification = await public_api_service_1.PublicApiService.verifyApiKey(rawKey, requiredScope);
        if (!verification.valid) {
            if (verification.error === "REVOKED_KEY") {
                return res.status(401).json({ error: "API key has been revoked" });
            }
            if (verification.error === "RATE_LIMIT_EXCEEDED") {
                res.setHeader("Retry-After", String(verification.rateLimitResetSeconds || 60));
                return res.status(429).json({
                    error: "Rate limit exceeded",
                    retryAfterSeconds: verification.rateLimitResetSeconds,
                });
            }
            if (verification.error === "INSUFFICIENT_SCOPE") {
                return res.status(403).json({
                    error: `Insufficient scope. Key requires '${requiredScope}' permission.`,
                });
            }
            return res.status(401).json({ error: "Invalid API key" });
        }
        // Set rate limit headers
        if (verification.rateLimitRemaining !== undefined) {
            res.setHeader("X-RateLimit-Remaining", String(verification.rateLimitRemaining));
        }
        req.apiKeyTenantId = verification.tenantId;
        req.apiKeyId = verification.keyId;
        req.apiKeyScopes = verification.scopes;
        next();
    };
};
exports.authenticateApiKey = authenticateApiKey;
// 1. OpenAPI Specification / Documentation Viewer (Publicly accessible with session or key)
exports.publicApiRouter.get("/docs", (_req, res) => {
    res.json(public_api_service_1.PublicApiService.getOpenApiSpec());
});
exports.publicApiRouter.get("/openapi.json", (_req, res) => {
    res.json(public_api_service_1.PublicApiService.getOpenApiSpec());
});
// 2. Test / Verify Endpoint using API Key
exports.publicApiRouter.post("/verify", async (req, res) => {
    const { rawKey, requiredScope } = req.body;
    if (!rawKey) {
        return res.status(400).json({ error: "rawKey is required" });
    }
    const result = await public_api_service_1.PublicApiService.verifyApiKey(rawKey, requiredScope);
    return res.json(result);
});
// --- Management Endpoints (Require User Authentication) ---
exports.publicApiRouter.use(auth_1.requireAuth);
// 3. List tenant API keys
exports.publicApiRouter.get("/keys", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: "Tenant context required" });
        }
        const keys = await public_api_service_1.PublicApiService.listApiKeys(tenantId);
        res.json({ keys });
    }
    catch (err) {
        res.status(500).json({ error: err.message || "Failed to list API keys" });
    }
});
// 4. Create a new API key (Shows rawKey ONCE)
exports.publicApiRouter.post("/keys", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const userId = req.user?.userId;
        if (!tenantId || !userId) {
            return res.status(400).json({ error: "Tenant and user context required" });
        }
        const { name, scopes, rateLimit } = req.body;
        const result = await public_api_service_1.PublicApiService.createApiKey(tenantId, userId, {
            name,
            scopes,
            rateLimit: rateLimit ? Number(rateLimit) : undefined,
        });
        res.status(201).json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message || "Failed to create API key" });
    }
});
// 5. Revoke an API key
exports.publicApiRouter.post("/keys/:id/revoke", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const userId = req.user?.userId;
        const { id } = req.params;
        if (!tenantId || !userId) {
            return res.status(400).json({ error: "Tenant and user context required" });
        }
        const revoked = await public_api_service_1.PublicApiService.revokeApiKey(tenantId, id, userId);
        res.json({ key: revoked });
    }
    catch (err) {
        res.status(400).json({ error: err.message || "Failed to revoke API key" });
    }
});
// 6. Delete an API key
exports.publicApiRouter.delete("/keys/:id", async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const userId = req.user?.userId;
        const { id } = req.params;
        if (!tenantId || !userId) {
            return res.status(400).json({ error: "Tenant and user context required" });
        }
        await public_api_service_1.PublicApiService.deleteApiKey(tenantId, id, userId);
        res.json({ success: true, message: "API key deleted successfully" });
    }
    catch (err) {
        res.status(400).json({ error: err.message || "Failed to delete API key" });
    }
});
