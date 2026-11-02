import assert from "assert";
import crypto from "crypto";

// We mock rawPrisma before importing device-session.service
const sessionsDb = new Map<string, any>();

const mockDeviceSession = {
  create: async ({ data }: any) => {
    const id = data.id || `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const session = { id, ...data };
    sessionsDb.set(id, session);
    return session;
  },
  findUnique: async ({ where, include }: any) => {
    const s = sessionsDb.get(where.id);
    if (!s) return null;
    const res = { ...s };
    if (include?.user) {
      res.user = {
        id: s.userId,
        email: "user@example.com",
        profile: { tenantId: s.tenantId },
        roles: [{ name: "employee" }],
      };
    }
    return res;
  },
  update: async ({ where, data }: any) => {
    const s = sessionsDb.get(where.id);
    if (!s) throw new Error("Record not found");
    const updated = { ...s, ...data };
    sessionsDb.set(where.id, updated);
    return updated;
  },
  updateMany: async ({ where, data }: any) => {
    let count = 0;
    for (const [id, s] of sessionsDb.entries()) {
      let matches = true;
      if (where.id && s.id !== where.id) matches = false;
      if (where.userId && s.userId !== where.userId) matches = false;
      if (where.tenantId && s.tenantId !== where.tenantId) matches = false;
      if (where.refreshTokenHash && s.refreshTokenHash !== where.refreshTokenHash) matches = false;
      if (where.revoked !== undefined && s.revoked !== where.revoked) matches = false;

      if (matches) {
        sessionsDb.set(id, { ...s, ...data });
        count++;
      }
    }
    return { count };
  },
  findMany: async ({ where, select }: any) => {
    const results = [];
    for (const [, s] of sessionsDb.entries()) {
      let matches = true;
      if (where.userId && s.userId !== where.userId) matches = false;
      if (where.tenantId && s.tenantId !== where.tenantId) matches = false;
      if (where.revoked !== undefined && s.revoked !== where.revoked) matches = false;
      if (where.OR) {
        const matchesOr = where.OR.some((cond: any) => {
          if (cond.expiresAt === null) return s.expiresAt === null;
          if (cond.expiresAt?.gt) return s.expiresAt && s.expiresAt > cond.expiresAt.gt;
          return false;
        });
        if (!matchesOr) matches = false;
      }
      if (matches) {
        if (select) {
          const projected: any = {};
          for (const key of Object.keys(select)) {
            if (select[key]) projected[key] = s[key];
          }
          results.push(projected);
        } else {
          results.push(s);
        }
      }
    }
    return results;
  },
};

import { rawPrisma } from "../prisma";
(rawPrisma as any).deviceSession = mockDeviceSession;

import {
  createDeviceSession,
  rotateRefreshToken,
  revokeSession,
  revokeAllSessions,
  getActiveSessions,
  generateSecureRefreshToken,
  hashRefreshToken,
} from "../services/device-session.service";

import { TurnstileService } from "../services/security/turnstile.service";

async function runAcceptanceTests() {
  console.log("================================================================================");
  console.log("🔒 MASTERHRMS SECURITY ACCEPTANCE & CONCURRENCY TEST SUITE");
  console.log("================================================================================");

  let passed = 0;
  let failed = 0;

  function resetDb() {
    sessionsDb.clear();
  }

  async function test(name: string, fn: () => void | Promise<void>) {
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

  // ─── 1. TURNSTILE PRODUCTION HARDENING TESTS ────────────────────────────────

  await test("Turnstile: Production cannot accept dummy test tokens under any condition", async () => {
    const oldNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";

    const result = await TurnstileService.verify({
      token: "1x00000000000000000000AA",
      action: "login",
      clientIp: "127.0.0.1",
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.code, "TURNSTILE_DUMMY_TOKEN_IN_PRODUCTION");
    process.env.NODE_ENV = oldNodeEnv;
  });

  await test("Turnstile: Production cannot be silently disabled via TURNSTILE_ENABLED=false", () => {
    const oldNodeEnv = process.env.NODE_ENV;
    const oldEnabled = process.env.TURNSTILE_ENABLED;
    process.env.NODE_ENV = "production";
    process.env.TURNSTILE_ENABLED = "false";

    const mode = TurnstileService.getEnforcementMode();
    assert.strictEqual(mode, "enforce");

    process.env.NODE_ENV = oldNodeEnv;
    process.env.TURNSTILE_ENABLED = oldEnabled;
  });

  // ─── 2. DEVICE SESSIONS & MULTI-DEVICE ISOLATION ────────────────────────────

  await test("DeviceSession: First device login creates active session with hashed token", async () => {
    resetDb();
    const session1 = await createDeviceSession({
      userId: "user-100",
      tenantId: "tenant-A",
      ipAddress: "192.168.1.10",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    });

    assert.ok(session1.sessionId);
    assert.strictEqual(session1.refreshToken.length, 96);

    const stored = sessionsDb.get(session1.sessionId);
    assert.strictEqual(stored.userId, "user-100");
    assert.strictEqual(stored.browser, "Google Chrome");
    assert.strictEqual(stored.deviceType, "desktop");
    assert.strictEqual(stored.revoked, false);
    assert.strictEqual(stored.refreshTokenHash, hashRefreshToken(session1.refreshToken));
  });

  await test("DeviceSession: Second device login creates separate active session without invalidating first", async () => {
    const session2 = await createDeviceSession({
      userId: "user-100",
      tenantId: "tenant-A",
      ipAddress: "10.0.0.25",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
    });

    assert.ok(session2.sessionId);
    const active = await getActiveSessions("user-100", "tenant-A");
    assert.strictEqual(active.length, 2);
    assert.ok(active.some(s => s.deviceType === "desktop"));
    assert.ok(active.some(s => s.deviceType === "mobile"));
  });

  await test("DeviceSession: Logout from device 1 revokes ONLY device 1, keeping device 2 active", async () => {
    const activeBefore = await getActiveSessions("user-100", "tenant-A");
    const device1Id = activeBefore.find(s => s.deviceType === "desktop")!.id;
    const device2Id = activeBefore.find(s => s.deviceType === "mobile")!.id;

    const revoked = await revokeSession(device1Id, "user-100");
    assert.strictEqual(revoked, true);

    const activeAfter = await getActiveSessions("user-100", "tenant-A");
    assert.strictEqual(activeAfter.length, 1);
    assert.strictEqual(activeAfter[0].id, device2Id);
  });

  // ─── 3. REFRESH TOKEN ROTATION & ATOMIC CONCURRENCY ─────────────────────────

  await test("Refresh: Valid token exchange rotates token and updates hash", async () => {
    resetDb();
    const session = await createDeviceSession({
      userId: "user-200",
      tenantId: "tenant-B",
      ipAddress: "172.16.0.5",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0",
    });

    const currentHash = hashRefreshToken(session.refreshToken);
    const rotated = await rotateRefreshToken(session.sessionId, currentHash);

    assert.ok(rotated !== null);
    assert.notStrictEqual(rotated?.refreshToken, session.refreshToken);

    const stored = sessionsDb.get(session.sessionId);
    assert.strictEqual(stored.refreshTokenHash, hashRefreshToken(rotated!.refreshToken));
  });

  await test("Refresh: Concurrent race condition allows exactly ONE rotation, rejecting second", async () => {
    resetDb();
    const session = await createDeviceSession({
      userId: "user-300",
      tenantId: "tenant-C",
      ipAddress: "1.1.1.1",
      userAgent: "Mozilla/5.0 (X11; Linux x86_64) Firefox/120.0",
    });

    const currentHash = hashRefreshToken(session.refreshToken);

    // Simulate two concurrent HTTP requests arriving simultaneously with identical currentHash
    const [resA, resB] = await Promise.all([
      rotateRefreshToken(session.sessionId, currentHash),
      rotateRefreshToken(session.sessionId, currentHash),
    ]);

    // Exactly one must succeed, the other must be rejected
    const successCount = (resA !== null ? 1 : 0) + (resB !== null ? 1 : 0);
    assert.strictEqual(successCount, 1);
  });

  await test("Refresh: Reuse of old rotated token is detected and revokes the compromised session", async () => {
    resetDb();
    const session = await createDeviceSession({
      userId: "user-400",
      tenantId: "tenant-D",
      ipAddress: "2.2.2.2",
    });

    const initialToken = session.refreshToken;
    const initialHash = hashRefreshToken(initialToken);

    // Legitimate rotation occurs
    const rotated1 = await rotateRefreshToken(session.sessionId, initialHash);
    assert.ok(rotated1 !== null);

    // Attacker tries to use old initialToken
    const attackerAttempt = await rotateRefreshToken(session.sessionId, initialHash);
    assert.strictEqual(attackerAttempt, null);

    // Verify session is now revoked
    const stored = sessionsDb.get(session.sessionId);
    assert.strictEqual(stored.revoked, true);

    // Even legitimate user with new token is now protected from compromised session
    const legitimateWithNewToken = await rotateRefreshToken(session.sessionId, hashRefreshToken(rotated1!.refreshToken));
    assert.strictEqual(legitimateWithNewToken, null);
  });

  // ─── 4. OWNERSHIP & TENANT BOUNDARY TESTS ───────────────────────────────────

  await test("Ownership: User cannot revoke another user's session", async () => {
    resetDb();
    const victimSession = await createDeviceSession({
      userId: "user-victim",
      tenantId: "tenant-V",
    });

    const tamperResult = await revokeSession(victimSession.sessionId, "user-attacker");
    assert.strictEqual(tamperResult, false);

    const stored = sessionsDb.get(victimSession.sessionId);
    assert.strictEqual(stored.revoked, false);
  });

  await test("Tenant Isolation: Revoke all affects only sessions within tenant boundary", async () => {
    resetDb();
    await createDeviceSession({ userId: "user-multi", tenantId: "tenant-1" });
    await createDeviceSession({ userId: "user-multi", tenantId: "tenant-1" });
    const tenant2Session = await createDeviceSession({ userId: "user-multi", tenantId: "tenant-2" });

    const count = await revokeAllSessions("user-multi", "tenant-1");
    assert.strictEqual(count, 2);

    const storedT2 = sessionsDb.get(tenant2Session.sessionId);
    assert.strictEqual(storedT2.revoked, false);
  });

  await test("Security: Active session projection strictly omits refreshTokenHash", async () => {
    resetDb();
    await createDeviceSession({ userId: "user-check", tenantId: "tenant-X" });
    const active = await getActiveSessions("user-check", "tenant-X");
    assert.strictEqual(active.length, 1);
    assert.strictEqual((active[0] as any).refreshTokenHash, undefined);
  });

  console.log("================================================================================");
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("================================================================================");

  if (failed > 0) process.exit(1);
}

runAcceptanceTests().catch(err => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
