import { describe, it, expect, beforeEach } from "vitest";
import { isPublicUploadPath, uploadsSecurityMiddleware } from "../middleware/uploads-security.middleware.js";
import {
  checkAccountLockout,
  recordFailedLogin,
  clearFailedLogins,
  resetAllAccountLockoutsForTest,
} from "../lib/login-protection.js";
import {
  verifyPasswordQueued,
  hashPasswordQueued,
  getLoginQueueStats,
  DUMMY_BCRYPT_HASH,
} from "../lib/password-worker-pool.js";
import { securityHeadersMiddleware } from "../middleware/security-hardening.middleware.js";

function makeMockRes() {
  const headers: Record<string, string> = {};
  const res: any = {
    statusCode: 200,
    body: null,
    headers,
    setHeader(k: string, v: string) {
      headers[k.toLowerCase()] = String(v);
    },
    getHeader(k: string) {
      return headers[k.toLowerCase()];
    },
    removeHeader(k: string) {
      delete headers[k.toLowerCase()];
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe("PENTEST-004: Upload Path Traversal & Public Prefix Isolation", () => {
  it("allows strictly anchored public branding & avatar prefixes", () => {
    expect(isPublicUploadPath("branding/logo.png")).toBe(true);
    expect(isPublicUploadPath("avatars/u1.jpg")).toBe(true);
    expect(isPublicUploadPath("tenant-123/branding/logo.png")).toBe(true);
    expect(isPublicUploadPath("tenant-123/Certificates/Branding/seal.png")).toBe(true);
  });

  it("blocks private paths embedding /branding/ or /award-types/ inside confidential folders", () => {
    expect(isPublicUploadPath("employees/emp123/branding/payslip.pdf")).toBe(false);
    expect(isPublicUploadPath("documents/contracts/branding/offer.pdf")).toBe(false);
    expect(isPublicUploadPath("chat/room1/award-types/secret.png")).toBe(false);
    expect(isPublicUploadPath("payslips/2026/branding/salary.pdf")).toBe(false);
  });

  it("blocks encoded path traversal (%2e%2e, %5c, null bytes) with HTTP 400", async () => {
    const attacks = [
      "/%2e%2e/%2e%2e/server/.env",
      "/%252e%252e/secret.txt",
      "/employees/../../etc/passwd",
      "/branding/logo.png%00.pdf",
    ];
    for (const raw of attacks) {
      const req: any = { originalUrl: `/uploads${raw}`, url: raw, path: raw, headers: {}, query: {} };
      const res = makeMockRes();
      let nextCalled = false;
      await uploadsSecurityMiddleware(req, res, () => {
        nextCalled = true;
      });
      expect(nextCalled, `Attack ${raw} must not reach static handler`).toBe(false);
      expect(res.statusCode).toBe(400);
      expect(res.body?.code).toBe("PATH_TRAVERSAL_BLOCKED");
    }
  });
});

describe("PENTEST-005: Security Headers & Per-Account Brute-Force Lockout", () => {
  beforeEach(() => {
    resetAllAccountLockoutsForTest();
  });

  it("sets strict CSP, nosniff, X-Frame-Options, and strips X-Powered-By", () => {
    const req: any = { secure: true, headers: {} };
    const res = makeMockRes();
    res.setHeader("X-Powered-By", "Express");
    let nextCalled = false;
    securityHeadersMiddleware(req, res, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
    expect(res.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("locks targeted account after 5 failures without affecting other accounts on same network", () => {
    for (let i = 1; i <= 4; i++) {
      const state = recordFailedLogin("victim@company.com");
      expect(state.locked).toBe(false);
    }
    const fifth = recordFailedLogin("victim@company.com");
    expect(fifth.locked).toBe(true);
    expect(fifth.retryAfterSeconds).toBeGreaterThan(0);

    // Other employees behind the same office NAT IP remain completely unaffected
    expect(checkAccountLockout("colleague@company.com").locked).toBe(false);

    // Clearing after legitimate auth unlocks cleanly
    clearFailedLogins("victim@company.com");
    expect(checkAccountLockout("victim@company.com").locked).toBe(false);
  });
});

describe("PERF-002: Worker-Thread Password Pool & Queue Concurrency", () => {
  it("hashes and verifies passwords accurately via worker pool and rejects against DUMMY_BCRYPT_HASH", async () => {
    const hash = await hashPasswordQueued("StrongPass!2026", 8);
    expect(hash.startsWith("$2")).toBe(true);
    expect(await verifyPasswordQueued("StrongPass!2026", hash)).toBe(true);
    expect(await verifyPasswordQueued("WrongPass", hash)).toBe(false);
    expect(await verifyPasswordQueued("Anything", DUMMY_BCRYPT_HASH)).toBe(false);
    const stats = getLoginQueueStats();
    expect(stats.completed).toBeGreaterThanOrEqual(4);
    expect(stats.queued).toBe(0);
  });
});
