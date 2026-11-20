"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireTurnstile = requireTurnstile;
const turnstile_service_1 = require("../services/security/turnstile.service");
/**
 * Express middleware that enforces Cloudflare Turnstile bot verification
 * on public submission endpoints (login, registration, super-login, career apply).
 *
 * @param actionOrResolver Expected action name (e.g. 'login', 'super_login', 'signup', 'job_apply')
 *                         or a resolver function (req) => string.
 */
function requireTurnstile(actionOrResolver) {
    return async (req, res, next) => {
        const expectedAction = typeof actionOrResolver === "function" ? actionOrResolver(req) : actionOrResolver;
        // Native mobile app clients do not run web Cloudflare Turnstile widgets
        const userAgent = req.headers["user-agent"] || "";
        const isMobileClient = req.headers["x-client-platform"] === "mobile" ||
            req.headers["x-mobile-app"] === "true" ||
            userAgent.includes("MasterHRMS-Mobile") ||
            userAgent.includes("Expo");
        if (isMobileClient) {
            req.turnstile = {
                success: true,
                status: "bypassed",
                reason: "Native mobile client bypasses web Turnstile challenge.",
                action: expectedAction,
            };
            return next();
        }
        // Extract token from standard Cloudflare form field or API JSON payload or header
        const token = req.body?.["cf-turnstile-response"] ||
            req.body?.turnstileToken ||
            req.headers["cf-turnstile-response"] ||
            req.headers["x-turnstile-token"];
        const clientIp = req.headers["cf-connecting-ip"] ||
            req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
            req.ip ||
            req.socket.remoteAddress;
        const result = await turnstile_service_1.TurnstileService.verify({
            token: typeof token === "string" ? token : undefined,
            action: expectedAction,
            clientIp,
        });
        if (!result.success) {
            const statusCode = result.status === "error" ? 503 : 403;
            return res.status(statusCode).json({
                error: result.reason || "Bot verification challenge required.",
                code: result.code || "TURNSTILE_VERIFICATION_FAILED",
                status: result.status,
            });
        }
        // Attach verification outcome to request for auditing/analytics
        req.turnstile = result;
        next();
    };
}
