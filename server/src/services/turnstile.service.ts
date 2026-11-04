import { getBaseDomain } from "../lib/workspace-host";
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
 * - Production hardening: dummy tokens and silent disabling strictly prohibited in production.
 */

export type TurnstileEnforcementMode = "off" | "audit" | "enforce";

export interface VerifyTurnstileOptions {
  token?: string | null;
  action: string;
  clientIp?: string;
  expectedHostnames?: string[];
}

export interface TurnstileVerificationResult {
  success: boolean;
  status: "verified" | "bypassed" | "skipped" | "rejected" | "error";
  code?: string;
  reason?: string;
  action?: string;
  hostname?: string;
  errorCodes?: string[];
}

export class TurnstileService {
  private static readonly SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
  private static readonly DUMMY_TEST_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";

  // Replay protection cache (stores token hashes with timestamp)
  private static readonly consumedTokens = new Map<string, number>();
  private static readonly TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

  // Interval cleanup
  private static cleanupTimer: NodeJS.Timeout | null = null;

  private static ensureCleanupStarted() {
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
   * In production, Turnstile CANNOT be disabled via TURNSTILE_ENABLED=false.
   */
  public static getEnforcementMode(): TurnstileEnforcementMode {
    const isProduction = process.env.NODE_ENV === "production";

    // 1. In production, Turnstile CANNOT be silently disabled via TURNSTILE_ENABLED=false
    if (isProduction) {
      if (process.env.TURNSTILE_ENABLED === "false") {
        console.warn("⚠️ [SECURITY] Attempted to disable Turnstile in production via TURNSTILE_ENABLED=false. Ignoring override; enforcement remains mandatory.");
      }
      return "enforce";
    }

    if (process.env.TURNSTILE_ENABLED === "true") {
      return "enforce";
    }
    if (process.env.TURNSTILE_ENABLED === "false") {
      return "off";
    }
    const raw = (process.env.TURNSTILE_ENFORCEMENT_MODE || "").toLowerCase().trim();
    if (raw === "enforce" || raw === "audit" || raw === "off") {
      return raw as TurnstileEnforcementMode;
    }
    return "off";
  }

  /**
   * Get configured expected hostnames.
   */
  public static getExpectedHostnames(): Set<string> {
    if (process.env.TURNSTILE_HOSTNAMES && process.env.TURNSTILE_HOSTNAMES.trim().length > 0) {
      return new Set(
        process.env.TURNSTILE_HOSTNAMES
          .split(",")
          .map((h) => h.trim().toLowerCase())
          .filter(Boolean)
      );
    }

    const hostnames = new Set<string>();
    const baseDomain = getBaseDomain().toLowerCase();
    if (baseDomain) {
      hostnames.add(baseDomain);
    }
    hostnames.add("masterhrms.com");

    const fallbackDomain = (process.env.PRODUCTION_FALLBACK_DOMAIN || "").trim().toLowerCase();
    if (fallbackDomain) {
      hostnames.add(fallbackDomain);
    }

    if (process.env.NODE_ENV !== "production") {
      hostnames.add("localhost");
      hostnames.add("127.0.0.1");
    }

    return hostnames;
  }

  /**
   * Verify Turnstile token with Cloudflare Siteverify API.
   */
  public static async verify(options: VerifyTurnstileOptions): Promise<TurnstileVerificationResult> {
    this.ensureCleanupStarted();
    const mode = this.getEnforcementMode();
    const { token, action, clientIp } = options;

    // 1. If mode is "off", verification is skipped (strictly non-production)
    if (mode === "off") {
      return {
        success: true,
        status: "skipped",
        reason: "Turnstile enforcement is disabled in configuration.",
        action,
      };
    }

    // 2. Canonical test dummy tokens accepted ONLY in non-production environments
    const isTestToken =
      token === this.DUMMY_TEST_TOKEN ||
      token === "1x00000000000000000000AA" ||
      token === "test-valid-token";

    if (process.env.NODE_ENV !== "production") {
      if (
        (process.env.NODE_ENV === "test" && isTestToken) ||
        ((process.env.TURNSTILE_SECRET_KEY === "1x0000000000000000000000000000000AA" ||
          process.env.TURNSTILE_SECRET === "1x0000000000000000000000000000000AA") &&
          isTestToken)
      ) {
        return {
          success: true,
          status: "bypassed",
          reason: "Valid test dummy token accepted in test environment.",
          action,
          hostname: "localhost",
        };
      }
    } else {
      // In production, reject any dummy token explicitly
      if (isTestToken) {
        return {
          success: false,
          status: "rejected",
          code: "TURNSTILE_DUMMY_TOKEN_IN_PRODUCTION",
          reason: "Test verification tokens are strictly rejected in production.",
          action,
        };
      }
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
    const secretKey = process.env.TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET;
    if (!secretKey) {
      console.error("[Turnstile] TURNSTILE_SECRET_KEY (or TURNSTILE_SECRET) is not configured on the server.");
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

      const data = (await response.json()) as {
        success: boolean;
        "error-codes"?: string[];
        challenge_ts?: string;
        hostname?: string;
        action?: string;
        cdata?: string;
      };

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
        const isMatched =
          expectedHostnames.has(receivedHost) ||
          Array.from(expectedHostnames).some(
            (expected) => receivedHost === expected || receivedHost.endsWith(`.${expected}`)
          );

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
    } catch (err: any) {
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
  public static clearCache(): void {
    this.consumedTokens.clear();
  }
}

export function getTurnstileConfig() {
  const isProduction = process.env.NODE_ENV === "production";
  const secretKey =
    process.env.TURNSTILE_SECRET_KEY ||
    process.env.TURNSTILE_SECRET ||
    (isProduction ? undefined : "1x0000000000000000000000000000000AA");
  const siteKey =
    process.env.TURNSTILE_SITE_KEY ||
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
    process.env.VITE_TURNSTILE_SITE_KEY ||
    (isProduction ? undefined : "1x00000000000000000000AA");
  const mode = TurnstileService.getEnforcementMode();
  return {
    secretKey,
    siteKey,
    mode,
    enabled: mode === "enforce",
  };
}

export async function verifyTurnstileToken(options: {
  token?: string | null;
  remoteIp?: string;
  expectedAction?: string;
  action?: string;
  expectedHostnames?: string[];
}): Promise<TurnstileVerificationResult> {
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
