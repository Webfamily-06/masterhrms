import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  verifyTurnstileToken,
  getTurnstileConfig,
  TurnstileService,
} from "../services/turnstile.service";
import { requireTurnstile } from "../middleware/turnstile.middleware";

describe("Cloudflare Turnstile Verification System", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    TurnstileService.clearCache();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    TurnstileService.clearCache();
  });

  describe("1. Configuration and Fallback Defaults", () => {
    it("provides safe development testing keys when unconfigured", () => {
      delete process.env.TURNSTILE_SECRET_KEY;
      delete process.env.TURNSTILE_SITE_KEY;
      delete process.env.TURNSTILE_ENABLED;
      delete process.env.TURNSTILE_ENFORCEMENT_MODE;

      const config = getTurnstileConfig();
      expect(config.siteKey).toBe("1x00000000000000000000AA");
      expect(config.secretKey).toBe("1x0000000000000000000000000000000AA");
      expect(config.enabled).toBe(false);
    });

    it("respects environment variables when explicitly configured", () => {
      process.env.TURNSTILE_SECRET_KEY = "0x4AAAAAAATestSecretKey123";
      process.env.TURNSTILE_SITE_KEY = "0x4AAAAAAATestSiteKey456";
      process.env.TURNSTILE_ENABLED = "true";

      const config = getTurnstileConfig();
      expect(config.secretKey).toBe("0x4AAAAAAATestSecretKey123");
      expect(config.siteKey).toBe("0x4AAAAAAATestSiteKey456");
      expect(config.enabled).toBe(true);
    });
  });

  describe("2. Server-side Token Verification (verifyTurnstileToken)", () => {
    it("automatically accepts Cloudflare canonical test always-pass dummy token", async () => {
      process.env.TURNSTILE_ENABLED = "true";
      process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";

      const result = await verifyTurnstileToken({
        token: "1x00000000000000000000AA",
        remoteIp: "127.0.0.1",
        expectedAction: "login",
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe("login");
    });

    it("rejects missing tokens when Turnstile is enabled", async () => {
      process.env.TURNSTILE_ENABLED = "true";
      process.env.TURNSTILE_SECRET_KEY = "0x4AAAAAAATestSecretKey";

      const result = await verifyTurnstileToken({
        token: "",
        remoteIp: "127.0.0.1",
      });

      expect(result.success).toBe(false);
      expect(result.errorCodes).toContain("missing-input-response");
    });

    it("bypasses verification when TURNSTILE_ENABLED=false", async () => {
      process.env.TURNSTILE_ENABLED = "false";

      const result = await verifyTurnstileToken({
        token: undefined,
      });

      expect(result.success).toBe(true);
    });

    it("validates successful response from Cloudflare siteverify endpoint", async () => {
      process.env.TURNSTILE_ENABLED = "true";
      process.env.TURNSTILE_SECRET_KEY = "0x4AAAAAAATestSecretKey";

      // Mock fetch
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          "error-codes": [],
          challenge_ts: new Date().toISOString(),
          hostname: "masterhrms.com",
          action: "job_apply",
          cdata: "candidate-app-1",
        }),
      });
      global.fetch = mockFetch;

      const result = await verifyTurnstileToken({
        token: "cf-token-real-valid",
        remoteIp: "192.168.1.50",
        expectedAction: "job_apply",
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe("job_apply");
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
      expect(init.method).toBe("POST");
    });

    it("flags mismatch when action does not match expectedAction", async () => {
      process.env.TURNSTILE_ENABLED = "true";
      process.env.TURNSTILE_SECRET_KEY = "0x4AAAAAAATestSecretKey";

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          action: "wrong_action",
        }),
      });

      const result = await verifyTurnstileToken({
        token: "cf-token-valid-wrong-action",
        expectedAction: "login",
      });

      expect(result.success).toBe(false);
      expect(result.errorCodes).toContain("action-mismatch");
    });

    it("handles Cloudflare siteverify HTTP error or network timeout gracefully", async () => {
      process.env.TURNSTILE_ENABLED = "true";
      process.env.TURNSTILE_SECRET_KEY = "0x4AAAAAAATestSecretKey";

      global.fetch = vi.fn().mockRejectedValue(new Error("Network timeout to Cloudflare"));

      const result = await verifyTurnstileToken({
        token: "cf-network-fail",
      });

      expect(result.success).toBe(false);
      expect(result.errorCodes).toContain("siteverify-error");
    });
  });

  describe("3. Express Middleware Integration (requireTurnstile)", () => {
    function createMockContext(overrides: {
      headers?: Record<string, string>;
      body?: Record<string, any>;
      ip?: string;
    } = {}) {
      const req: any = {
        headers: overrides.headers || {},
        body: overrides.body || {},
        ip: overrides.ip || "127.0.0.1",
        get(header: string) {
          return this.headers[header.toLowerCase()] || this.headers[header];
        },
      };

      const res: any = {
        statusCode: 200,
        status: vi.fn(function (this: any, code: number) {
          this.statusCode = code;
          return this;
        }),
        json: vi.fn().mockReturnThis(),
      };

      const next = vi.fn();

      return { req, res, next };
    }

    it("allows requests when TURNSTILE_ENABLED=false (fail-open for test suites / dev mode)", async () => {
      process.env.TURNSTILE_ENABLED = "false";
      const middleware = requireTurnstile("login");
      const { req, res, next } = createMockContext({ body: { email: "user@example.com" } });

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("blocks request with 403 when TURNSTILE_ENABLED=true and no token is sent", async () => {
      process.env.TURNSTILE_ENABLED = "true";
      process.env.TURNSTILE_SECRET_KEY = "0x4AAAAAAATestSecretKey";
      const middleware = requireTurnstile("login");
      const { req, res, next } = createMockContext({ body: { email: "user@example.com" } });

      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: expect.stringMatching(/TURNSTILE_TOKEN_MISSING|BOT_VERIFICATION_REQUIRED/),
        })
      );
    });

    it("accepts token provided in request header 'cf-turnstile-response'", async () => {
      process.env.TURNSTILE_ENABLED = "true";
      process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";
      const middleware = requireTurnstile("login");
      const { req, res, next } = createMockContext({
        headers: { "cf-turnstile-response": "1x00000000000000000000AA" },
        body: { email: "admin@example.com" },
      });

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("accepts token provided in request body 'turnstileToken'", async () => {
      process.env.TURNSTILE_ENABLED = "true";
      process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";
      const middleware = requireTurnstile("job_apply");
      const { req, res, next } = createMockContext({
        body: {
          fullName: "Jane Candidate",
          turnstileToken: "1x00000000000000000000AA",
        },
      });

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("rejects invalid token with 403 when challenge is rejected by provider", async () => {
      process.env.TURNSTILE_ENABLED = "true";
      process.env.TURNSTILE_SECRET_KEY = "0x4AAAAAAATestSecretKey";

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: false,
          "error-codes": ["invalid-input-response"],
        }),
      });

      const middleware = requireTurnstile("login");
      const { req, res, next } = createMockContext({
        body: {
          email: "attacker@botnet.org",
          turnstileToken: "fake-invalid-token",
        },
      });

      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: expect.stringMatching(/TURNSTILE_CHALLENGE_FAILED|BOT_VERIFICATION_FAILED/),
        })
      );
    });
  });
});
