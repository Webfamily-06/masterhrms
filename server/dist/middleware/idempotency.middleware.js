"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceIdempotency = enforceIdempotency;
const idempotency_service_1 = require("../services/idempotency.service");
/**
 * Express middleware to enforce atomic, tenant-scoped idempotency for mutating requests.
 * Evaluates `X-Idempotency-Key` header:
 * - If absent, passes through transparently.
 * - If present:
 *   1. Rejects concurrent requests with the same key (HTTP 409 CONCURRENT_REQUEST_IN_PROGRESS).
 *   2. Rejects payload mismatch under the same key (HTTP 409 IDEMPOTENCY_KEY_PAYLOAD_MISMATCH).
 *   3. Replays previously committed response (HTTP 2xx with X-Idempotent-Replay: true).
 *   4. Intercepts successful responses and atomically commits the outcome to tenant storage.
 */
async function enforceIdempotency(req, res, next) {
    const idempotencyKey = req.headers["x-idempotency-key"] ||
        req.headers["idempotency-key"] ||
        (req.body && typeof req.body._idempotencyKey === "string" ? req.body._idempotencyKey : undefined);
    if (!idempotencyKey || !idempotencyKey.trim()) {
        return next();
    }
    const tenantId = req.user?.tenantId || req.tenantId || "default";
    const trimmedKey = idempotencyKey.trim();
    try {
        const result = await idempotency_service_1.IdempotencyService.checkAndLock(tenantId, trimmedKey, req.body);
        if (result.action === "CONFLICT_IN_PROGRESS") {
            return res.status(409).json({
                error: result.errorMessage,
                code: result.errorCode,
            });
        }
        if (result.action === "CONFLICT_PAYLOAD_MISMATCH") {
            return res.status(409).json({
                error: result.errorMessage,
                code: result.errorCode,
            });
        }
        if (result.action === "REPLAY" && result.cachedResponse) {
            if (result.cachedResponse.headers) {
                for (const [k, v] of Object.entries(result.cachedResponse.headers)) {
                    res.setHeader(k, v);
                }
            }
            return res.status(result.cachedResponse.statusCode).json(result.cachedResponse.responseBody);
        }
        // Intercept res.json and res.send to capture committed response
        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);
        let committed = false;
        res.json = function (body) {
            if (!committed) {
                committed = true;
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    idempotency_service_1.IdempotencyService.commit(tenantId, trimmedKey, req.body, res.statusCode, body).catch((err) => console.error("[IdempotencyMiddleware] Async commit error:", err.message));
                }
                else {
                    idempotency_service_1.IdempotencyService.unlock(tenantId, trimmedKey);
                }
            }
            return originalJson(body);
        };
        res.send = function (body) {
            if (!committed) {
                committed = true;
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    let parsed = body;
                    try {
                        if (typeof body === "string")
                            parsed = JSON.parse(body);
                    }
                    catch { }
                    idempotency_service_1.IdempotencyService.commit(tenantId, trimmedKey, req.body, res.statusCode, parsed).catch((err) => console.error("[IdempotencyMiddleware] Async commit error:", err.message));
                }
                else {
                    idempotency_service_1.IdempotencyService.unlock(tenantId, trimmedKey);
                }
            }
            return originalSend(body);
        };
        next();
    }
    catch (err) {
        idempotency_service_1.IdempotencyService.unlock(tenantId, trimmedKey);
        console.error("[IdempotencyMiddleware] Error in idempotency check:", err);
        next(err);
    }
}
