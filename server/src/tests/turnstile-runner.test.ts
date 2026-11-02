import assert from "assert";
import {
  verifyTurnstileToken,
  getTurnstileConfig,
  TurnstileService,
} from "../services/turnstile.service";
import { requireTurnstile } from "../middleware/turnstile.middleware";

async function runTurnstileTests() {
  console.log("================================================================================");
  console.log("🧪 MASTERHRMS CLOUDFLARE TURNSTILE VERIFICATION TEST SUITE");
  console.log("================================================================================");

  let passed = 0;
  let failed = 0;
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  function resetState() {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    TurnstileService.clearCache();
  }

  async function test(name: string, fn: () => void | Promise<void>) {
    resetState();
    try {
      await fn();
      console.log(`  ✔ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     ${err.message}`);
      failed++;
    }
  }

  // 1. Config tests
  await test("provides safe development testing keys when unconfigured", () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    delete process.env.TURNSTILE_SITE_KEY;
    delete process.env.TURNSTILE_ENABLED;
    delete process.env.TURNSTILE_ENFORCEMENT_MODE;

    const config = getTurnstileConfig();
    assert.strictEqual(config.siteKey, "1x00000000000000000000AA");
    assert.strictEqual(config.secretKey, "1x0000000000000000000000000000000AA");
    assert.strictEqual(config.enabled, false);
  });

  await test("respects environment variables when explicitly configured", () => {
    process.env.TURNSTILE_SECRET_KEY = "0x4AAAAAAATestSecretKey123";
    process.env.TURNSTILE_SITE_KEY = "0x4AAAAAAATestSiteKey456";
    process.env.TURNSTILE_ENABLED = "true";

    const config = getTurnstileConfig();
    assert.strictEqual(config.secretKey, "0x4AAAAAAATestSecretKey123");
    assert.strictEqual(config.siteKey, "0x4AAAAAAATestSiteKey456");
    assert.strictEqual(config.enabled, true);
  });

  // 2. Server-side token verification
  await test("automatically accepts Cloudflare canonical test always-pass dummy token", async () => {
    process.env.TURNSTILE_ENABLED = "true";
    process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";

    const result = await verifyTurnstileToken({
      token: "1x00000000000000000000AA",
      remoteIp: "127.0.0.1",
      expectedAction: "login",
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.action, "login");
  });

  await test("rejects missing tokens when Turnstile is enabled", async () => {
    process.env.TURNSTILE_ENABLED = "true";
    process.env.TURNSTILE_SECRET_KEY = "0x4AAAAAAATestSecretKey";

    const result = await verifyTurnstileToken({
      token: "",
      remoteIp: "127.0.0.1",
    });

    assert.strictEqual(result.success, false);
    assert.ok(result.errorCodes?.includes("missing-input-response"));
  });

  await test("bypasses verification when TURNSTILE_ENABLED=false", async () => {
    process.env.TURNSTILE_ENABLED = "false";

    const result = await verifyTurnstileToken({
      token: undefined,
    });

    assert.strictEqual(result.success, true);
  });

  await test("validates successful response from Cloudflare siteverify endpoint", async () => {
    process.env.TURNSTILE_ENABLED = "true";
    process.env.TURNSTILE_SECRET_KEY = "0x4AAAAAAATestSecretKey";

    let fetchCalled = 0;
    global.fetch = (async (url: any, init: any) => {
      fetchCalled++;
      assert.strictEqual(url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
      assert.strictEqual(init.method, "POST");
      return {
        ok: true,
        json: async () => ({
          success: true,
          "error-codes": [],
          challenge_ts: new Date().toISOString(),
          hostname: "masterhrms.com",
          action: "job_apply",
          cdata: "candidate-app-1",
        }),
      } as any;
    }) as any;

    const result = await verifyTurnstileToken({
      token: "cf-token-real-valid",
      remoteIp: "192.168.1.50",
      expectedAction: "job_apply",
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.action, "job_apply");
    assert.strictEqual(fetchCalled, 1);
  });

  await test("flags mismatch when action does not match expectedAction", async () => {
    process.env.TURNSTILE_ENABLED = "true";
    process.env.TURNSTILE_SECRET_KEY = "0x4AAAAAAATestSecretKey";

    global.fetch = (async () => ({
      ok: true,
      json: async () => ({
        success: true,
        action: "wrong_action",
      }),
    })) as any;

    const result = await verifyTurnstileToken({
      token: "cf-token-valid-wrong-action",
      expectedAction: "login",
    });

    assert.strictEqual(result.success, false);
    assert.ok(result.errorCodes?.includes("action-mismatch"));
  });

  await test("handles Cloudflare siteverify HTTP error or network timeout gracefully", async () => {
    process.env.TURNSTILE_ENABLED = "true";
    process.env.TURNSTILE_SECRET_KEY = "0x4AAAAAAATestSecretKey";

    global.fetch = (async () => {
      throw new Error("Network timeout to Cloudflare");
    }) as any;

    const result = await verifyTurnstileToken({
      token: "cf-network-fail",
    });

    assert.strictEqual(result.success, false);
    assert.ok(result.errorCodes?.includes("siteverify-error"));
  });

  // 3. Express Middleware Integration
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

    let statusCode = 200;
    let jsonBody: any = null;
    let nextCalled = false;

    const res: any = {
      get statusCode() { return statusCode; },
      set statusCode(val: number) { statusCode = val; },
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(body: any) {
        jsonBody = body;
        return this;
      },
      getJsonBody() { return jsonBody; },
    };

    const next = () => { nextCalled = true; };
    const wasNextCalled = () => nextCalled;

    return { req, res, next, wasNextCalled };
  }

  await test("allows requests when TURNSTILE_ENABLED=false (fail-open for test / dev)", async () => {
    process.env.TURNSTILE_ENABLED = "false";
    const middleware = requireTurnstile("login");
    const { req, res, next, wasNextCalled } = createMockContext({ body: { email: "user@example.com" } });

    await middleware(req, res, next);
    assert.strictEqual(wasNextCalled(), true);
  });

  await test("blocks request with 403 when TURNSTILE_ENABLED=true and no token is sent", async () => {
    process.env.TURNSTILE_ENABLED = "true";
    process.env.TURNSTILE_SECRET_KEY = "0x4AAAAAAATestSecretKey";
    const middleware = requireTurnstile("login");
    const { req, res, next, wasNextCalled } = createMockContext({ body: { email: "user@example.com" } });

    await middleware(req, res, next);
    assert.strictEqual(wasNextCalled(), false);
    assert.strictEqual(res.statusCode, 403);
    assert.ok(res.getJsonBody()?.code?.includes("TURNSTILE"));
  });

  await test("accepts token provided in request header 'cf-turnstile-response'", async () => {
    process.env.TURNSTILE_ENABLED = "true";
    process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";
    const middleware = requireTurnstile("login");
    const { req, res, next, wasNextCalled } = createMockContext({
      headers: { "cf-turnstile-response": "1x00000000000000000000AA" },
      body: { email: "admin@example.com" },
    });

    await middleware(req, res, next);
    assert.strictEqual(wasNextCalled(), true);
  });

  await test("accepts token provided in request body 'turnstileToken'", async () => {
    process.env.TURNSTILE_ENABLED = "true";
    process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";
    const middleware = requireTurnstile("job_apply");
    const { req, res, next, wasNextCalled } = createMockContext({
      body: {
        fullName: "Jane Candidate",
        turnstileToken: "1x00000000000000000000AA",
      },
    });

    await middleware(req, res, next);
    assert.strictEqual(wasNextCalled(), true);
  });

  await test("rejects invalid token with 403 when challenge is rejected by provider", async () => {
    process.env.TURNSTILE_ENABLED = "true";
    process.env.TURNSTILE_SECRET_KEY = "0x4AAAAAAATestSecretKey";

    global.fetch = (async () => ({
      ok: true,
      json: async () => ({
        success: false,
        "error-codes": ["invalid-input-response"],
      }),
    })) as any;

    const middleware = requireTurnstile("login");
    const { req, res, next, wasNextCalled } = createMockContext({
      body: {
        email: "attacker@botnet.org",
        turnstileToken: "fake-invalid-token",
      },
    });

    await middleware(req, res, next);
    assert.strictEqual(wasNextCalled(), false);
    assert.strictEqual(res.statusCode, 403);
    assert.ok(res.getJsonBody()?.code?.includes("TURNSTILE"));
  });

  resetState();

  console.log("================================================================================");
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTurnstileTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
