import assert from "assert";
import fs from "fs";
import path from "path";
import {
  GLOBAL_MODELS,
  DIRECT_TENANT_MODELS,
  CHILD_DEPENDENT_MODELS,
  SCOPED_TENANT_MODELS,
  validateTenantModelClassifications,
  getModelClassification,
} from "../config/tenant-models.config";
import { createTenantIsolationExtension, TenantIsolationError } from "../extensions/tenant-isolation.extension";
import { runWithTenantContext, requireTenantDb, TenantContext } from "../context/tenant-context";
import {
  generateRandomBackupCodes,
  hashBackupCode,
  createHashedBackupCodeEntries,
  TwoFactorService,
} from "../modules/two-factor-auth/two-factor.service";
import { requirePermission } from "../middleware/auth";
import { getTenantAttendanceDateUtc } from "../routes/biometric.routes";
import { WebRtcIceService } from "../services/webrtc-ice.service";

interface TestResult {
  suite: string;
  name: string;
  status: "PASS" | "FAIL";
  error?: string;
}

const results: TestResult[] = [];

async function runTest(suite: string, name: string, fn: () => void | Promise<void>) {
  try {
    const out = fn();
    if (out instanceof Promise) await out;
    results.push({ suite, name, status: "PASS" });
    console.log(`  ✓ [${suite}] ${name}`);
  } catch (err: any) {
    results.push({ suite, name, status: "FAIL", error: err?.message || String(err) });
    console.error(`  ✗ [${suite}] ${name}:`, err?.message || err);
  }
}

function createMockBasePrisma() {
  const baseClient: any = {
    $extends(ext: any) {
      const queryHandlers = ext.query.$allModels;
      const extended: any = {};

      const models = [
        "Employee",
        "Tenant",
        "User",
        "OkrKeyResult",
        "SalaryStructureItem",
        "Setting",
        "SettingSecret",
        "SettingAudit",
        "UnclassifiedFakeModel",
      ];

      for (const model of models) {
        const prop = model.charAt(0).toLowerCase() + model.slice(1);
        extended[prop] = {};
        for (const op of Object.keys(queryHandlers)) {
          extended[prop][op] = async (args: any = {}) => {
            const clonedArgs = JSON.parse(JSON.stringify(args || {}));
            return queryHandlers[op]({
              model,
              operation: op,
              args: clonedArgs,
              query: async (finalArgs: any) => finalArgs,
            });
          };
        }
      }
      return extended;
    },
  };
  return baseClient;
}

function makeTenantCtx(tenantId: string, userId = "user-1", db: any = {}): TenantContext {
  return {
    tenantId,
    userId,
    roles: ["tenant_admin"],
    status: "ACTIVE",
    tenancyStrategy: "SHARED_SCHEMA",
    db,
  };
}

async function main() {
  console.log("================================================================================");
  console.log("MASTERHRMS — Security Audit Remediation Verification Suite (P0 & P1)");
  console.log("================================================================================");

  // SEC-001
  await runTest("SEC-001", "Zero hardcoded password fallbacks in auth.routes.ts", () => {
    const authSrc = fs.readFileSync(path.resolve(__dirname, "../routes/auth.routes.ts"), "utf8");
    assert(!authSrc.includes('password === "admin123"'), "Found admin123 bypass");
    assert(!authSrc.includes('password === "Admin@123456"'), "Found Admin@123456 bypass");
    assert(!authSrc.includes('password === "Password123!"'), "Found Password123! bypass");
    assert(!authSrc.includes('password === "TenantAdmin@123"'), "Found TenantAdmin@123 bypass");
    assert(!authSrc.includes("Math.random()"), "Found insecure Math.random()");
  });

  // SEC-003
  await runTest("SEC-003", "Client-controlled autoVerify bypass removed from registration", () => {
    const authSrc = fs.readFileSync(path.resolve(__dirname, "../routes/auth.routes.ts"), "utf8");
    assert(!authSrc.includes("autoVerify === true"), "Found client-controlled autoVerify");
    assert(!/autoVerify:\s*z\.boolean/.test(authSrc), "autoVerify still present in registerSchema");
  });

  // SEC-004
  await runTest("SEC-004", "Public tenant credentials endpoint exposes zero personal emails", () => {
    const authSrc = fs.readFileSync(path.resolve(__dirname, "../routes/auth.routes.ts"), "utf8");
    const startIdx = authSrc.indexOf('"/public/tenant/credentials"');
    const endIdx = authSrc.indexOf("// POST /api/auth/register");
    assert(startIdx > -1 && endIdx > startIdx, "Endpoint block not found");
    const snippet = authSrc.slice(startIdx, endIdx);
    assert(snippet.includes("sensitiveEndpointLimiter"), "Missing rate limiter");
    assert(snippet.includes("tenantAdmin: null"), "tenantAdmin must be null");
    assert(snippet.includes("hrAdmin: null"), "hrAdmin must be null");
    assert(snippet.includes("employee: null"), "employee must be null");
    assert(!snippet.includes("userRoleAssignment.findFirst"), "Must not query admin credentials");
  });

  // SEC-005
  await runTest("SEC-005", "Cryptographically secure backup codes with SHA-256 hashing & expiry", () => {
    const codes = generateRandomBackupCodes(8);
    assert.strictEqual(codes.length, 8);
    assert.strictEqual(new Set(codes).size, 8, "Codes must be unique");
    for (const c of codes) {
      assert(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(c), `Unexpected code format: ${c}`);
    }
    const entries = createHashedBackupCodeEntries(codes, 30);
    assert.strictEqual(entries.length, 8);
    for (let i = 0; i < codes.length; i++) {
      assert.strictEqual(entries[i].hash, hashBackupCode(codes[i]));
      assert.strictEqual(entries[i].hash.length, 64);
      assert(new Date(entries[i].expiresAt).getTime() > Date.now());
    }
  });

  await runTest("SEC-005", "Brute-force lockout activates after 5 failed 2FA/backup attempts", () => {
    const uid = `lockout-test-${Date.now()}`;
    TwoFactorService.clearFailures(uid);
    for (let i = 0; i < 4; i++) {
      assert.strictEqual(TwoFactorService.recordFailure(uid).locked, false);
    }
    assert.strictEqual(TwoFactorService.recordFailure(uid).locked, true);
    assert.strictEqual(TwoFactorService.isLockedOut(uid).locked, true);
    TwoFactorService.clearFailures(uid);
  });

  // SEC-006
  await runTest("SEC-006", "Zero tenant model classification conflicts and Setting/SettingSecret/SettingAudit removed from GLOBAL_MODELS", () => {
    const res = validateTenantModelClassifications();
    assert.strictEqual(res.valid, true, `Conflicts: ${res.conflicts.join(", ")}`);
    assert.strictEqual(GLOBAL_MODELS.has("Setting"), false);
    assert.strictEqual(GLOBAL_MODELS.has("SettingSecret"), false);
    assert.strictEqual(GLOBAL_MODELS.has("SettingAudit"), false);
    assert.strictEqual(getModelClassification("Setting"), "SCOPED_TENANT");
    assert.strictEqual(getModelClassification("SettingAudit"), "SCOPED_TENANT");
    assert.strictEqual(getModelClassification("SettingSecret"), "CHILD_DEPENDENT");
    assert.strictEqual(DIRECT_TENANT_MODELS.has("Employee"), true);
    assert.strictEqual(CHILD_DEPENDENT_MODELS.has("OkrKeyResult"), true);
    assert.strictEqual(SCOPED_TENANT_MODELS.has("Setting"), true);
  });

  // SEC-002 & SEC-007
  await runTest("SEC-002", "Fails closed when tenant context is missing on any tenant-scoped or unclassified model", async () => {
    const isolated = createTenantIsolationExtension(createMockBasePrisma()) as any;

    await assert.rejects(() => isolated.employee.findMany({}), TenantIsolationError);
    await assert.rejects(() => isolated.okrKeyResult.findMany({}), TenantIsolationError);
    await assert.rejects(() => isolated.setting.findMany({}), TenantIsolationError);
    await assert.rejects(() => isolated.unclassifiedFakeModel.findMany({}), TenantIsolationError);
    assert.throws(() => requireTenantDb(), /TENANT_CONTEXT_REQUIRED/);

    // Global model still works without tenant context
    const userRes = await isolated.user.findMany({ where: { email: "a@b.com" } });
    assert.deepStrictEqual(userRes.where, { email: "a@b.com" });
  });

  await runTest("SEC-002", "Enforces tenantId on Tenant A across findMany, findUnique, aggregate, groupBy (blocks Tenant B spoofing)", async () => {
    const isolated = createTenantIsolationExtension(createMockBasePrisma()) as any;
    await runWithTenantContext(makeTenantCtx("tenant-A", "user-A", isolated), async () => {
      const fm = await isolated.employee.findMany({ where: { tenantId: "tenant-B", status: "active" } });
      assert.strictEqual(fm.where.tenantId, "tenant-A");

      const fu = await isolated.employee.findUnique({ where: { id: "emp-B-1" } });
      assert.strictEqual(fu.where.tenantId, "tenant-A");

      const agg = await isolated.employee.aggregate({ where: { tenantId: "tenant-B" }, _count: true });
      assert.strictEqual(agg.where.tenantId, "tenant-A");

      const gb = await isolated.employee.groupBy({ by: ["status"], where: { tenantId: "tenant-B" } });
      assert.strictEqual(gb.where.tenantId, "tenant-A");
    });
  });

  await runTest("SEC-002", "Enforces parent-relation tenant scoping on child-dependent models for findUnique, update, deleteMany", async () => {
    const isolated = createTenantIsolationExtension(createMockBasePrisma()) as any;
    await runWithTenantContext(makeTenantCtx("tenant-A", "user-A", isolated), async () => {
      const r = await isolated.okrKeyResult.findUnique({ where: { id: "kr-B-1" } });
      assert.strictEqual(r.where.objective.tenantId, "tenant-A");

      const u = await isolated.okrKeyResult.update({ where: { id: "kr-B-1" }, data: { title: "X" } });
      assert.strictEqual(u.where.objective.tenantId, "tenant-A");

      const d = await isolated.okrKeyResult.deleteMany({ where: { id: "kr-B-1" } });
      assert.strictEqual(d.where.objective.tenantId, "tenant-A");
    });
  });

  await runTest("SEC-002", "Sanitizes root/nested writes and blocks PLATFORM Setting mutation from tenant context", async () => {
    const isolated = createTenantIsolationExtension(createMockBasePrisma()) as any;
    await runWithTenantContext(makeTenantCtx("tenant-A", "user-A", isolated), async () => {
      const created = await isolated.employee.create({
        data: {
          firstName: "Alice",
          tenantId: "tenant-B",
          department: { connect: { id: "dept-1", tenantId: "tenant-B" } },
        },
      });
      assert.strictEqual(created.data.tenantId, "tenant-A");
      assert.strictEqual(created.data.department.connect.tenantId, "tenant-A");

      await assert.rejects(
        () => isolated.setting.create({ data: { scope: "PLATFORM", scopeId: "global", key: "smtp.host", valueJson: "evil" } }),
        /CROSS_TENANT_FORBIDDEN/
      );

      const tenantSetting = await isolated.setting.create({
        data: { scope: "TENANT", scopeId: "tenant-B", key: "branding.color", valueJson: "#000" },
      });
      assert.strictEqual(tenantSetting.data.scope, "TENANT");
      assert.strictEqual(tenantSetting.data.scopeId, "tenant-A");
    });
  });

  // SEC-008
  await runTest("SEC-008", "Wildcard *.vercel.app CORS origin trust removed", () => {
    const indexSrc = fs.readFileSync(path.resolve(__dirname, "../index.ts"), "utf8");
    assert(!indexSrc.includes('host.endsWith(".vercel.app")'), "Wildcard .vercel.app trust still exists");
  });

  // SEC-009
  await runTest("SEC-009", "RBAC requirePermission enforces deny-by-default with zero admin/hr_admin fallback bypass", async () => {
    const authMwSrc = fs.readFileSync(path.resolve(__dirname, "../middleware/auth.ts"), "utf8");
    assert(
      !authMwSrc.includes('if (req.user.roles?.includes("admin") || req.user.roles?.includes("hr_admin") || req.user.roles?.includes("Workspace Admin"))'),
      "RBAC fallback bypass still exists"
    );

    const mw = requirePermission("finance.invoices.view");
    let statusCode = 200;
    let nextCalled = false;
    const res: any = {
      status(c: number) { statusCode = c; return this; },
      json() { return this; },
    };
    await mw({ user: { userId: "u1", tenantId: null, roles: ["admin"] } } as any, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(statusCode, 403);
  });

  // Biometric Timezone
  await runTest("BIOMETRIC", "Attendance date uses explicit tenant timezone instead of server local time", () => {
    const punch = new Date("2026-05-01T20:00:00.000Z");
    assert.strictEqual(getTenantAttendanceDateUtc(punch, "Asia/Kolkata").toISOString(), "2026-05-02T00:00:00.000Z");
    assert.strictEqual(getTenantAttendanceDateUtc(punch, "America/New_York").toISOString(), "2026-05-01T00:00:00.000Z");
    assert.strictEqual(getTenantAttendanceDateUtc(punch, "Invalid/TZ").toISOString(), "2026-05-01T00:00:00.000Z");
  });

  // WebRTC ICE
  await runTest("REALTIME", "WebRtcIceService defaults to STUN-only and supports RFC-5766 HMAC TURN relay", () => {
    const origUrls = process.env.TURN_SERVER_URLS;
    const origSecret = process.env.TURN_SHARED_SECRET;
    try {
      delete process.env.TURN_SERVER_URLS;
      delete process.env.TURN_SHARED_SECRET;
      assert.strictEqual(WebRtcIceService.getDiagnostics("u1").relay, "none");

      process.env.TURN_SERVER_URLS = "turn:turn.masterhrms.com:3478,turns:turn.masterhrms.com:5349";
      process.env.TURN_SHARED_SECRET = "super-secret-turn-hmac-key";
      const diag = WebRtcIceService.getDiagnostics("u1");
      assert.strictEqual(diag.relay, "turn");
      assert.strictEqual(diag.stunOnly, false);
      const servers = WebRtcIceService.getIceServers("u1", 600);
      assert.strictEqual(servers.length, 2);
      assert(/^\d+:u1$/.test(servers[1].username || ""));
      assert(Boolean(servers[1].credential));
    } finally {
      if (origUrls !== undefined) process.env.TURN_SERVER_URLS = origUrls; else delete process.env.TURN_SERVER_URLS;
      if (origSecret !== undefined) process.env.TURN_SHARED_SECRET = origSecret; else delete process.env.TURN_SHARED_SECRET;
    }
  });

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log("================================================================================");
  console.log(`SECURITY AUDIT SUITE SUMMARY: ${passed}/${results.length} PASSED (${failed} FAILED)`);
  console.log("================================================================================");
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
