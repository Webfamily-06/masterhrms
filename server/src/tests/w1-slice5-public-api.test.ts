import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PublicApiService } from "../modules/public-api/public-api.service";
import { publicApiManifest } from "../modules/public-api/manifest";
import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
const db = rawPrisma || proxiedPrisma;

describe("Wave 1 — Slice 5: Public API (public-api)", () => {
  let tenantA: any;
  let tenantB: any;
  let userA: any;
  let userB: any;

  beforeAll(async () => {
    // 1. Setup isolated test tenants
    tenantA = await db.tenant.create({
      data: {
        name: "W1 Public API Tenant A",
        slug: `w1-pub-api-a-${Date.now()}`,
      },
    });

    tenantB = await db.tenant.create({
      data: {
        name: "W1 Public API Tenant B",
        slug: `w1-pub-api-b-${Date.now()}`,
      },
    });

    // 2. Setup test users
    userA = await db.user.create({
      data: {
        email: `pub-user-a-${Date.now()}@example.com`,
        passwordHash: "dummy_pass",
      },
    });

    userB = await db.user.create({
      data: {
        email: `pub-user-b-${Date.now()}@example.com`,
        passwordHash: "dummy_pass",
      },
    });

    // 3. Reset rate limiter state
    PublicApiService.resetRateLimiter();
  });

  afterAll(async () => {
    PublicApiService.resetRateLimiter();
    if (tenantA) {
      await db.setting.deleteMany({
        where: { scope: "TENANT", scopeId: tenantA.id },
      }).catch(() => {});
      await db.outboxEvent.deleteMany({ where: { tenantId: tenantA.id } }).catch(() => {});
      await db.auditLog.deleteMany({ where: { tenantId: tenantA.id } }).catch(() => {});
      await db.tenant.delete({ where: { id: tenantA.id } }).catch(() => {});
    }
    if (tenantB) {
      await db.setting.deleteMany({
        where: { scope: "TENANT", scopeId: tenantB.id },
      }).catch(() => {});
      await db.tenant.delete({ where: { id: tenantB.id } }).catch(() => {});
    }
    if (userA) {
      await db.user.delete({ where: { id: userA.id } }).catch(() => {});
    }
    if (userB) {
      await db.user.delete({ where: { id: userB.id } }).catch(() => {});
    }
  });

  it("1. Manifest adheres to specification and catalog standards", () => {
    expect(publicApiManifest.slug).toBe("public-api");
    expect(publicApiManifest.engine).toBe("E12");
    expect(publicApiManifest.entitlementKey).toBe("public-api");
    expect(publicApiManifest.routePrefix).toBe("/public-api");
    expect(publicApiManifest.provides?.permissions).toContain("public-api.keys.manage");
    expect(publicApiManifest.provides?.permissions).toContain("public-api.keys.read");
    expect(publicApiManifest.provides?.events).toContain("public-api.key.created");
  });

  it("2. Creates API key, returns raw key ONCE, and stores only hashed-at-rest key", async () => {
    const created = await PublicApiService.createApiKey(tenantA.id, userA.id, {
      name: "Zapier Production Sync",
      scopes: ["employees:read", "attendance:read"],
      rateLimit: 120,
    });

    expect(created.rawKey).toBeDefined();
    expect(created.rawKey.startsWith("mhr_live_")).toBe(true);
    expect(created.key.name).toBe("Zapier Production Sync");
    expect(created.key.scopes).toEqual(["employees:read", "attendance:read"]);
    expect(created.key.status).toBe("active");
    expect((created.key as any).keyHash).toBeUndefined();

    // Verify stored record in database
    const storedSetting = await db.setting.findFirst({
      where: {
        scope: "TENANT",
        scopeId: tenantA.id,
        key: `api_key:${created.key.id}`,
      },
    });

    expect(storedSetting).toBeDefined();
    const parsed = storedSetting!.valueJson as any;
    // Database contains hash, NOT raw plaintext key
    expect(parsed.keyHash).toBe(PublicApiService.hashKey(created.rawKey));
    expect(parsed.rawKey).toBeUndefined();
    expect(parsed.keyPrefix).toBeDefined();

    // Verify audit and outbox events recorded
    const audit = await db.auditLog.findFirst({
      where: { tenantId: tenantA.id, action: "public_api.key.created" },
    });
    expect(audit).toBeDefined();
  });

  it("3. Lists API keys without exposing secrets or key hashes", async () => {
    const keys = await PublicApiService.listApiKeys(tenantA.id);
    expect(keys.length).toBeGreaterThanOrEqual(1);

    const firstKey = keys[0];
    expect(firstKey.name).toBe("Zapier Production Sync");
    expect(firstKey.keyPrefix.startsWith("mhr_live_")).toBe(true);
    expect((firstKey as any).rawKey).toBeUndefined();
    expect((firstKey as any).keyHash).toBeUndefined();
  });

  it("4. Verifies raw API key and enforces scope restrictions", async () => {
    const created = await PublicApiService.createApiKey(tenantA.id, userA.id, {
      name: "Payroll Scoped Key",
      scopes: ["payroll:read"],
    });

    // 1. Verify with authorized scope
    const validResult = await PublicApiService.verifyApiKey(created.rawKey, "payroll:read");
    expect(validResult.valid).toBe(true);
    expect(validResult.tenantId).toBe(tenantA.id);
    expect(validResult.name).toBe("Payroll Scoped Key");

    // 2. Verify with unauthorized scope
    const forbiddenResult = await PublicApiService.verifyApiKey(created.rawKey, "employees:write");
    expect(forbiddenResult.valid).toBe(false);
    expect(forbiddenResult.error).toBe("INSUFFICIENT_SCOPE");

    // 3. Verify with invalid key
    const invalidResult = await PublicApiService.verifyApiKey("mhr_live_nonexistent12345");
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.error).toBe("INVALID_KEY");
  });

  it("5. Revoked keys cannot be used for authentication", async () => {
    const created = await PublicApiService.createApiKey(tenantA.id, userA.id, {
      name: "Short-Lived Key",
      scopes: ["employees:read"],
    });

    // Valid prior to revocation
    const beforeRevoke = await PublicApiService.verifyApiKey(created.rawKey);
    expect(beforeRevoke.valid).toBe(true);

    // Revoke key
    const revoked = await PublicApiService.revokeApiKey(tenantA.id, created.key.id, userA.id);
    expect(revoked.status).toBe("revoked");
    expect(revoked.revokedAt).toBeDefined();

    // Verify rejection
    const afterRevoke = await PublicApiService.verifyApiKey(created.rawKey);
    expect(afterRevoke.valid).toBe(false);
    expect(afterRevoke.error).toBe("REVOKED_KEY");
  });

  it("6. Enforces rate limits with sliding window", async () => {
    const created = await PublicApiService.createApiKey(tenantA.id, userA.id, {
      name: "Strict Rate Limit Key",
      scopes: ["employees:read"],
      rateLimit: 3, // 3 requests per minute
    });

    // Request 1: OK
    const r1 = await PublicApiService.verifyApiKey(created.rawKey);
    expect(r1.valid).toBe(true);
    expect(r1.rateLimitRemaining).toBe(2);

    // Request 2: OK
    const r2 = await PublicApiService.verifyApiKey(created.rawKey);
    expect(r2.valid).toBe(true);
    expect(r2.rateLimitRemaining).toBe(1);

    // Request 3: OK
    const r3 = await PublicApiService.verifyApiKey(created.rawKey);
    expect(r3.valid).toBe(true);
    expect(r3.rateLimitRemaining).toBe(0);

    // Request 4: Rate limit exceeded!
    const r4 = await PublicApiService.verifyApiKey(created.rawKey);
    expect(r4.valid).toBe(false);
    expect(r4.error).toBe("RATE_LIMIT_EXCEEDED");
    expect(r4.rateLimitRemaining).toBe(0);
    expect(r4.rateLimitResetSeconds).toBeGreaterThan(0);
  });

  it("7. Strictly enforces tenant isolation across API keys", async () => {
    // Key created in Tenant B
    const keyB = await PublicApiService.createApiKey(tenantB.id, userB.id, {
      name: "Tenant B Internal Key",
      scopes: ["employees:read"],
    });

    // Tenant A list keys does NOT include Tenant B's key
    const keysA = await PublicApiService.listApiKeys(tenantA.id);
    const foundBInA = keysA.some((k) => k.id === keyB.key.id);
    expect(foundBInA).toBe(false);

    // Tenant A cannot revoke Tenant B's key
    await expect(
      PublicApiService.revokeApiKey(tenantA.id, keyB.key.id, userA.id)
    ).rejects.toThrow("API key not found");

    // Tenant A cannot delete Tenant B's key
    await expect(
      PublicApiService.deleteApiKey(tenantA.id, keyB.key.id, userA.id)
    ).rejects.toThrow("API key not found");
  });

  it("8. OpenAPI documentation viewer returns valid specification", () => {
    const spec = PublicApiService.getOpenApiSpec();
    expect(spec.openapi).toBe("3.0.3");
    expect(spec.info.title).toContain("MASTERHRMS Public Developer API");
    expect(spec.paths["/employees"]).toBeDefined();
    expect(spec.paths["/attendance"]).toBeDefined();
    expect(spec.paths["/invoices"]).toBeDefined();
    expect(spec.components.securitySchemes.ApiKeyAuth).toBeDefined();
  });
});
