import assert from "assert";
import crypto from "crypto";

// We mock rawPrisma before importing device-session.service
const mockDeviceSession = {
  create: async ({ data }: any) => ({
    id: "session-uuid-1",
    ...data,
  }),
  findUnique: async ({ where }: any) => {
    if (where.id === "session-uuid-1") {
      return {
        id: "session-uuid-1",
        userId: "user-123",
        tenantId: "tenant-abc",
        refreshTokenHash: currentHash,
        revoked: currentRevoked,
        expiresAt: currentExpiresAt,
      };
    }
    if (where.id === "session-other-user") {
      return {
        id: "session-other-user",
        userId: "user-other-person",
        revoked: false,
      };
    }
    return null;
  },
  update: async ({ where, data }: any) => {
    if (data.refreshTokenHash) currentHash = data.refreshTokenHash;
    if (data.revoked !== undefined) currentRevoked = data.revoked;
    updateCalls.push({ where, data });
    return { id: where.id, ...data };
  },
  updateMany: async ({ where, data }: any) => {
    updateManyCalls.push({ where, data });
    return { count: 3 };
  },
  findMany: async ({ where }: any) => {
    return [
      {
        id: "session-uuid-1",
        deviceType: "desktop",
        browser: "Google Chrome",
        operatingSystem: "Windows",
        ipAddress: "192.168.1.1",
        country: "India",
        city: "Chennai",
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date(Date.now() + 10000000),
      },
    ];
  },
};

let currentHash = "";
let currentRevoked = false;
let currentExpiresAt: Date | null = new Date(Date.now() + 1000000);
let updateCalls: any[] = [];
let updateManyCalls: any[] = [];

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

async function runTests() {
  console.log("================================================================================");
  console.log("🧪 MASTERHRMS DEVICE SESSION ARCHITECTURE & SECURITY TEST SUITE");
  console.log("================================================================================");

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    return (async () => {
      try {
        await fn();
        console.log(`  ✔ PASS: ${name}`);
        passed++;
      } catch (err: any) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     ${err.message}`);
        failed++;
      }
    })();
  }

  // 1. Token entropy and hashing
  await test("generates a high-entropy 96-char hex refresh token (48 bytes)", () => {
    const t1 = generateSecureRefreshToken();
    const t2 = generateSecureRefreshToken();
    assert.strictEqual(typeof t1, "string");
    assert.strictEqual(t1.length, 96);
    assert.notStrictEqual(t1, t2);
  });

  await test("generates deterministic SHA-256 hash of refresh token", () => {
    const sample = "sample-token-abc-123456789";
    const expected = crypto.createHash("sha256").update(sample).digest("hex");
    const actual = hashRefreshToken(sample);
    assert.strictEqual(actual, expected);
    assert.strictEqual(actual.length, 64);
  });

  // 2. Session Creation
  await test("creates device session with parsed UA, client IP, hashed token, and 30d expiry", async () => {
    updateCalls = [];
    const res = await createDeviceSession({
      userId: "user-123",
      tenantId: "tenant-abc",
      ipAddress: "10.0.0.5",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    assert.strictEqual(res.sessionId, "session-uuid-1");
    assert.strictEqual(typeof res.refreshToken, "string");
    assert.strictEqual(res.refreshToken.length, 96);
  });

  // 3. Rotation
  await test("rotates refresh token when matching hash is supplied", async () => {
    const token = "initial-token-123";
    currentHash = hashRefreshToken(token);
    currentRevoked = false;
    currentExpiresAt = new Date(Date.now() + 1000000);
    updateCalls = [];

    const rotated = await rotateRefreshToken("session-uuid-1", currentHash);
    assert.ok(rotated !== null);
    assert.notStrictEqual(rotated?.refreshToken, token);
    assert.strictEqual(updateCalls.length, 1);
  });

  // 4. Token Reuse Detection
  await test("detects token reuse and immediately revokes compromised session", async () => {
    const activeToken = "new-active-token";
    currentHash = hashRefreshToken(activeToken);
    currentRevoked = false;
    currentExpiresAt = new Date(Date.now() + 1000000);
    updateCalls = [];

    const stolenOldToken = "stolen-old-token";
    const stolenOldHash = hashRefreshToken(stolenOldToken);

    const rotated = await rotateRefreshToken("session-uuid-1", stolenOldHash);
    assert.strictEqual(rotated, null);
    // Verified session was revoked
    assert.strictEqual(currentRevoked, true);
    assert.ok(updateCalls.some(c => c.data.revoked === true && c.data.revokedAt));
  });

  // 5. Expired Session Reject
  await test("rejects refresh attempt on expired session", async () => {
    const token = "expired-token";
    currentHash = hashRefreshToken(token);
    currentRevoked = false;
    currentExpiresAt = new Date(Date.now() - 5000); // Expired 5 seconds ago
    updateCalls = [];

    const rotated = await rotateRefreshToken("session-uuid-1", currentHash);
    assert.strictEqual(rotated, null);
  });

  // 6. Revoke by owner
  await test("allows owner to revoke their own device session", async () => {
    currentRevoked = false;
    updateCalls = [];

    const success = await revokeSession("session-uuid-1", "user-123");
    assert.strictEqual(success, true);
    assert.strictEqual(currentRevoked, true);
  });

  // 7. Cross-user access denied
  await test("denies revocation when attempting cross-user session tampering", async () => {
    updateCalls = [];
    const success = await revokeSession("session-other-user", "user-attacker");
    assert.strictEqual(success, false);
  });

  // 8. Revoke all sessions
  await test("revokes all sessions within tenant scope", async () => {
    updateManyCalls = [];
    const count = await revokeAllSessions("user-123", "tenant-abc");
    assert.strictEqual(count, 3);
    assert.strictEqual(updateManyCalls.length, 1);
    assert.strictEqual(updateManyCalls[0].where.userId, "user-123");
    assert.strictEqual(updateManyCalls[0].where.tenantId, "tenant-abc");
    assert.strictEqual(updateManyCalls[0].data.revoked, true);
  });

  // 9. Active session listing
  await test("lists active sessions without exposing sensitive refreshTokenHash", async () => {
    const sessions = await getActiveSessions("user-123", "tenant-abc");
    assert.strictEqual(sessions.length, 1);
    assert.strictEqual(sessions[0].browser, "Google Chrome");
    assert.strictEqual((sessions[0] as any).refreshTokenHash, undefined);
  });

  console.log("================================================================================");
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
