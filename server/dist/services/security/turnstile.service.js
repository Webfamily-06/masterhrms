"use strict";
/**
 * MASTERHRMS — Cloudflare Turnstile Siteverify Service
 *
 * Implements server-side bot verification against Cloudflare Siteverify API.
 * Follows Cloudflare Turnstile security best practices:
 * - Secret key strictly isolated on the server.
 * - Action matching to prevent cross-form token reuse.
 * - Hostname allowlist matching to prevent cross-domain token reuse.
 * - Single-use token caching to prevent token replay attacks.
 * - Safe fail-closed handling on timeout or provider error when enforced.
 * - Configurable enforcement modes: "off" | "audit" | "enforce".
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TurnstileService = void 0;
exports.getTurnstileConfig = getTurnstileConfig;
exports.verifyTurnstileToken = verifyTurnstileToken;
class TurnstileService {
    static SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
    static DUMMY_TEST_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";
    // Replay protection cache (stores token hashes with timestamp)
    static consumedTokens = new Map();
    static TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
    // Interval cleanup
    static cleanupTimer = null;
    static ensureCleanupStarted() {
        if (!this.cleanupTimer) {
            this.cleanupTimer = setInterval(() => {
                const now = Date.now();
                for (const [t, ts] of this.consumedTokens.entries()) {
                    if (now - ts > this.TOKEN_TTL_MS) {
                        this.consumedTokens.delete(t);
                    }
                }
            }, 60000);
            if (this.cleanupTimer.unref) {
                this.cleanupTimer.unref();
            }
        }
    }
    /**
     * Get the active enforcement mode from environment.
     * In production, if unset, defaults to 'enforce' when TURNSTILE_SECRET_KEY is present, else 'off'.
     */
    static getEnforcementMode() {
        if (process.env.TURNSTILE_ENABLED === "true") {
            return "enforce";
        }
        if (process.env.TURNSTILE_ENABLED === "false") {
            return "off";
        }
        const raw = (process.env.TURNSTILE_ENFORCEMENT_MODE || "").toLowerCase().trim();
        if (raw === "enforce" || raw === "audit" || raw === "off") {
            return raw;
        }
        if (process.env.NODE_ENV === "production" && process.env.TURNSTILE_SECRET_KEY) {
            return "enforce";
        }
        return "off";
    }
    /**
     * Get configured expected hostnames.
     */
    static getExpectedHostnames() {
        const raw = process.env.TURNSTILE_HOSTNAMES || "localhost,127.0.0.1,masterhrms.com";
        return new Set(raw
            .split(",")
            .map((h) => h.trim().toLowerCase())
            .filter(Boolean));
    }
    /**
     * Verify Turnstile token with Cloudflare Siteverify API.
     */
    static async verify(options) {
        this.ensureCleanupStarted();
        const mode = this.getEnforcementMode();
        const { token, action, clientIp } = options;
        // 1. If mode is "off", verification is skipped
        if (mode === "off") {
            return {
                success: true,
                status: "skipped",
                reason: "Turnstile enforcement is disabled in configuration.",
                action,
            };
        }
        // 2. Canonical test dummy tokens accepted in test mode or test secret key configuration
        const isTestToken = token === this.DUMMY_TEST_TOKEN ||
            token === "1x00000000000000000000AA" ||
            token === "test-valid-token";
        if ((process.env.NODE_ENV === "test" && isTestToken) ||
            (process.env.TURNSTILE_SECRET_KEY === "1x0000000000000000000000000000000AA" && isTestToken)) {
            return {
                success: true,
                status: "bypassed",
                reason: "Valid test dummy token accepted in test environment.",
                action,
                hostname: "localhost",
            };
        }
        // 3. Reject missing or empty tokens
        if (!token || typeof token !== "string" || token.trim().length === 0) {
            if (mode === "audit") {
                console.warn(`[Turnstile AUDIT] Missing token for action '${action}' from IP '${clientIp || "unknown"}'`);
                return {
                    success: true,
                    status: "bypassed",
                    code: "AUDIT_MISSING_TOKEN",
                    reason: "Audit mode: allowed despite missing token.",
                    action,
                };
            }
            return {
                success: false,
                status: "rejected",
                code: "TURNSTILE_TOKEN_MISSING",
                reason: "Turnstile bot challenge token is required.",
                action,
            };
        }
        const cleanToken = token.trim();
        // 4. Validate token length (Cloudflare tokens are < 2048 chars)
        if (cleanToken.length > 2048) {
            return {
                success: false,
                status: "rejected",
                code: "TURNSTILE_TOKEN_INVALID",
                reason: "Supplied Turnstile token exceeds maximum length.",
                action,
            };
        }
        // 5. Replay Protection: reject token if already consumed
        if (this.consumedTokens.has(cleanToken)) {
            return {
                success: false,
                status: "rejected",
                code: "TURNSTILE_TOKEN_REPLAYED",
                reason: "Turnstile challenge token has already been consumed.",
                action,
            };
        }
        // 6. Secret key verification
        const secretKey = process.env.TURNSTILE_SECRET_KEY;
        if (!secretKey) {
            console.error("[Turnstile] TURNSTILE_SECRET_KEY is not configured on the server.");
            if (mode === "audit") {
                return {
                    success: true,
                    status: "bypassed",
                    code: "AUDIT_UNCONFIGURED_SECRET",
                    reason: "Audit mode: allowed despite unconfigured secret key.",
                    action,
                };
            }
            return {
                success: false,
                status: "error",
                code: "TURNSTILE_NOT_CONFIGURED",
                reason: "Bot verification service is temporarily unavailable.",
                action,
            };
        }
        // 7. Call Cloudflare Siteverify endpoint
        try {
            const formData = new URLSearchParams();
            formData.append("secret", secretKey);
            formData.append("response", cleanToken);
            if (clientIp) {
                formData.append("remoteip", clientIp);
            }
            const response = await fetch(this.SITEVERIFY_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: formData.toString(),
                signal: AbortSignal.timeout(10000), // 10-second timeout
            });
            if (!response.ok) {
                throw new Error(`Siteverify HTTP ${response.status}`);
            }
            const data = (await response.json());
            // Record consumed token upon verification attempt to prevent replay
            this.consumedTokens.set(cleanToken, Date.now());
            if (!data.success) {
                const errorCodes = data["error-codes"] || [];
                if (mode === "audit") {
                    console.warn(`[Turnstile AUDIT] Verification failed for action '${action}':`, errorCodes);
                    return {
                        success: true,
                        status: "bypassed",
                        code: "AUDIT_VERIFICATION_FAILED",
                        reason: "Audit mode: allowed despite challenge failure.",
                        action,
                        errorCodes,
                    };
                }
                return {
                    success: false,
                    status: "rejected",
                    code: "TURNSTILE_CHALLENGE_FAILED",
                    reason: "Bot verification challenge was rejected.",
                    action,
                    errorCodes,
                };
            }
            // 8. Validate Action matching
            if (data.action && data.action !== action) {
                return {
                    success: false,
                    status: "rejected",
                    code: "TURNSTILE_ACTION_MISMATCH",
                    reason: `Challenge action mismatch: expected '${action}', received '${data.action}'.`,
                    action: data.action,
                    hostname: data.hostname,
                };
            }
            // 9. Validate Hostname matching
            if (data.hostname) {
                const expectedHostnames = options.expectedHostnames
                    ? new Set(options.expectedHostnames.map((h) => h.toLowerCase()))
                    : this.getExpectedHostnames();
                const receivedHost = data.hostname.toLowerCase();
                // Allow wildcard subdomains if base domain matches
                const isMatched = expectedHostnames.has(receivedHost) ||
                    Array.from(expectedHostnames).some((expected) => receivedHost === expected || receivedHost.endsWith(`.${expected}`));
                if (!isMatched) {
                    return {
                        success: false,
                        status: "rejected",
                        code: "TURNSTILE_HOSTNAME_MISMATCH",
                        reason: `Challenge origin '${data.hostname}' is not authorized.`,
                        action: data.action,
                        hostname: data.hostname,
                    };
                }
            }
            return {
                success: true,
                status: "verified",
                action: data.action || action,
                hostname: data.hostname,
            };
        }
        catch (err) {
            console.error("[Turnstile] Siteverify network or parse error:", err.message);
            if (mode === "audit") {
                return {
                    success: true,
                    status: "bypassed",
                    code: "AUDIT_PROVIDER_ERROR",
                    reason: "Audit mode: allowed despite provider communication error.",
                    action,
                };
            }
            return {
                success: false,
                status: "error",
                code: "TURNSTILE_PROVIDER_ERROR",
                reason: "Bot verification service temporarily unreachable. Please retry.",
                action,
            };
        }
    }
    /**
     * Reset the consumed tokens cache (primarily for unit test isolation).
     */
    static clearCache() {
        this.consumedTokens.clear();
    }
}
exports.TurnstileService = TurnstileService;
function getTurnstileConfig() {
    const secretKey = process.env.TURNSTILE_SECRET_KEY || "1x0000000000000000000000000000000AA";
    const siteKey = process.env.TURNSTILE_SITE_KEY || "1x00000000000000000000AA";
    const mode = TurnstileService.getEnforcementMode();
    return {
        secretKey,
        siteKey,
        mode,
        enabled: mode === "enforce",
    };
}
async function verifyTurnstileToken(options) {
    const res = await TurnstileService.verify({
        token: options.token,
        action: options.expectedAction || options.action || "login",
        clientIp: options.remoteIp,
        expectedHostnames: options.expectedHostnames,
    });
    // If rejected because missing token, normalize errorCodes for compatibility
    if (!res.success && (!options.token || options.token.trim().length === 0)) {
        return {
            ...res,
            errorCodes: ["missing-input-response"],
        };
    }
    if (!res.success && res.code === "TURNSTILE_ACTION_MISMATCH") {
        return {
            ...res,
            errorCodes: ["action-mismatch"],
        };
    }
    if (!res.success && res.code === "TURNSTILE_PROVIDER_ERROR") {
        return {
            ...res,
            errorCodes: ["siteverify-error"],
        };
    }
    return res;
}
