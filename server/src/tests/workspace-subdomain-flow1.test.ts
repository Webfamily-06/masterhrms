import dotenv from "dotenv";
import path from "path";
import http from "http";
import express from "express";
import bcrypt from "bcryptjs";
import { rawPrisma as prisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import {
  validateWorkspaceSlug,
  suggestWorkspaceSlug,
  resolveHostContext,
  getWorkspaceUrl,
  getSuperAdminUrl,
  getRootUrl,
  getBaseDomain,
  invalidateWorkspaceCache,
  SLUG_MIN_LENGTH,
  SLUG_MAX_LENGTH,
} from "../lib/workspace-host";
import { workspaceHostMiddleware } from "../middleware/workspace-host.middleware";
import { workspaceRoutingRouter } from "../routes/workspace-routing.routes";
import { authRouter } from "../routes/auth.routes";
import { superRouter } from "../routes/super.routes";
import { requireAuth, requireSuperAdmin } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

interface TestResult {
  id: number;
  category: string;
  name: string;
  passed: boolean;
  evidence: string;
  durationMs: number;
}

const results: TestResult[] = [];
// Host suffix comes from configuration — run with BASE_DOMAIN=localhost | example.com | example.in
const BD = getBaseDomain();

/**
 * Global fetch (undici) treats `Host` as a forbidden header and silently replaces it
 * with the URL host, which would make every request resolve as the ROOT host.
 * This helper uses node:http so the real Host header is sent on the wire —
 * exactly as a browser on acme.<base> / beta.<base> / super.<base> would send it.
 * It never follows redirects, so 301 responses are observable.
 */
function hostFetch(
  url: string,
  opts: { method?: string; headers?: Record<string, string>; body?: string; redirect?: string } = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; json: () => Promise<any> }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers: Record<string, string | number> = { ...(opts.headers || {}) };
    if (opts.body) headers["Content-Length"] = Buffer.byteLength(opts.body);
    const req = http.request(
      { hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: opts.method || "GET", headers },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () =>
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            json: async () => {
              try { return JSON.parse(raw); } catch { return { raw }; }
            },
          })
        );
      }
    );
    req.on("error", reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

function recordTest(
  id: number,
  category: string,
  name: string,
  passed: boolean,
  evidence: string,
  start: number
) {
  const durationMs = Date.now() - start;
  results.push({ id, category, name, passed, evidence, durationMs });
  const statusIcon = passed ? "✔ PASS" : "✖ FAIL";
  console.log(`[${statusIcon}] Test ${id.toString().padStart(2, "0")}: ${name} (${durationMs}ms)`);
  if (!passed) {
    console.error(`       Evidence: ${evidence}`);
  }
}

async function runFlow1AcceptanceSuite() {
  console.log("================================================================================");
  console.log("MASTERHRMS — WORKSPACE SUBDOMAIN FLOW 1 ACCEPTANCE TEST SUITE");
  console.log("Scope: Default Subdomain Routing, Host Isolation, Slug Validation (3-30 chars),");
  console.log("       30-Day Renames & Redirects, Dynamic Multi-Base-Domain Configuration");
  console.log("================================================================================\n");

  // ── 1. SETUP TEST FIXTURES IN SUPABASE POSTGRESQL ────────────────
  const testTenantAcmeId = "flow1-test-acme-tenant";
  const testTenantBetaId = "flow1-test-beta-tenant";
  const testSuperAdminId = "flow1-test-super-admin";
  const testAcmeUserId = "flow1-test-acme-user";
  const testBetaUserId = "flow1-test-beta-user";
  const passwordPlain = "SecurePass123!";
  const passwordHash = await bcrypt.hash(passwordPlain, 10);

  console.log("▶ Setting up test fixtures in database...");

  // Clean prior test fixtures if any
  try {
    const existingTenants = await prisma.tenant.findMany({
      where: {
        OR: [
          { id: { in: [testTenantAcmeId, testTenantBetaId, "tenant-acme-test", "tenant-beta-test"] } },
          { slug: { in: ["acme", "beta", "acme-renamed"] } },
        ],
      },
      select: { id: true },
    });
    const tenantIdsToClean = Array.from(new Set([...existingTenants.map((t) => t.id), testTenantAcmeId, testTenantBetaId]));

    await (prisma as any).workspaceSlugRedirect.deleteMany({
      where: { tenantId: { in: tenantIdsToClean } },
    });
    await (prisma as any).workspaceSlugHistory.deleteMany({
      where: { tenantId: { in: tenantIdsToClean } },
    });
    await prisma.userRole.deleteMany({
      where: {
        OR: [
          { userId: { in: [testSuperAdminId, testAcmeUserId, testBetaUserId] } },
          { tenantId: { in: tenantIdsToClean } },
        ],
      },
    });
    await prisma.profile.deleteMany({
      where: {
        OR: [
          { userId: { in: [testSuperAdminId, testAcmeUserId, testBetaUserId] } },
          { tenantId: { in: tenantIdsToClean } },
        ],
      },
    });
    await prisma.user.deleteMany({
      where: {
        OR: [
          { id: { in: [testSuperAdminId, testAcmeUserId, testBetaUserId] } },
          { email: { in: ["superadmin.flow1@testplatform.com", "admin@acme-flow1.test", "admin@beta-flow1.test"] } },
        ],
      },
    });
    await prisma.tenantSubscription.deleteMany({
      where: { tenantId: { in: tenantIdsToClean } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: tenantIdsToClean } },
    });
  } catch (cleanErr: any) {
    console.warn("Notice during cleanup:", cleanErr.message);
  }

  // Create Tenants: acme and beta
  const tenantAcme = await prisma.tenant.create({
    data: {
      id: testTenantAcmeId,
      name: "Acme Flow1 Corp",
      slug: "acme",
      timezone: "Asia/Kolkata",
    },
  });

  const tenantBeta = await prisma.tenant.create({
    data: {
      id: testTenantBetaId,
      name: "Beta Flow1 Corp",
      slug: "beta",
      timezone: "Asia/Kolkata",
    },
  });

  // Active subscriptions for both
  await prisma.tenantSubscription.createMany({
    data: [
      { id: `sub-${testTenantAcmeId}`, tenantId: testTenantAcmeId, status: "active" },
      { id: `sub-${testTenantBetaId}`, tenantId: testTenantBetaId, status: "active" },
    ],
  });

  // Create Users: Super Admin, Acme Admin, Beta Admin
  await prisma.user.create({
    data: {
      id: testSuperAdminId,
      email: "superadmin.flow1@testplatform.com",
      passwordHash,
      roles: {
        create: [{ role: "super_admin" }],
      },
      profile: {
        create: {
          fullName: "Platform Super Admin",
          tenantId: tenantAcme.id, // Profile pointer
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      id: testAcmeUserId,
      email: "admin@acme-flow1.test",
      passwordHash,
      roles: {
        create: [{ role: "hr_admin", tenantId: tenantAcme.id }],
      },
      profile: {
        create: {
          fullName: "Acme Administrator",
          tenantId: tenantAcme.id,
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      id: testBetaUserId,
      email: "admin@beta-flow1.test",
      passwordHash,
      roles: {
        create: [{ role: "hr_admin", tenantId: tenantBeta.id }],
      },
      profile: {
        create: {
          fullName: "Beta Administrator",
          tenantId: tenantBeta.id,
        },
      },
    },
  });

  console.log("✔ Test fixtures created successfully.\n");

  // ── 2. SPIN UP EPHEMERAL EXPRESS SERVER ──────────────────────────
  const app = express();
  app.use(express.json());

  // Mount workspaceHostMiddleware on ALL incoming requests
  app.use(workspaceHostMiddleware);

  // Mount public workspace routing
  app.use("/api/workspace", workspaceRoutingRouter);
  app.use("/api/public/workspace", workspaceRoutingRouter);

  // Mount auth routes
  app.use("/api/auth", authRouter);

  // Mount super admin routes
  app.use("/api/super", superRouter);

  // Protected tenant test endpoint verifying resolveTenantContext
  app.get(
    "/api/tenant-protected-data",
    requireAuth,
    resolveTenantContext,
    (req: any, res) => {
      res.json({
        success: true,
        tenantId: req.user.tenantId,
        userId: req.user.userId,
        hostContext: req.hostContext,
      });
    }
  );

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`✔ Ephemeral test server active on ${baseUrl}\n`);

  // ── GROUP 1: SLUG VALIDATION RULES (STRICT 3–30 CHARS) ───────────
  console.log("─── GROUP 1: SLUG VALIDATION RULES (3-30 CHARACTERS) ───");

  // Test 1: Valid 3-char slug
  {
    const t0 = Date.now();
    const res = validateWorkspaceSlug("hrm");
    recordTest(
      1,
      "Slug Validation",
      "Valid 3-character minimum slug ('hrm') accepted",
      res.valid === true,
      JSON.stringify(res),
      t0
    );
  }

  // Test 2: Valid 30-char slug (exact upper bound)
  {
    const t0 = Date.now();
    const thirtyCharSlug = "a123456789b123456789c123456789";
    const res = validateWorkspaceSlug(thirtyCharSlug);
    recordTest(
      2,
      "Slug Validation",
      "Valid 30-character maximum slug accepted",
      res.valid === true && thirtyCharSlug.length === 30,
      `Length: ${thirtyCharSlug.length}, Valid: ${res.valid}`,
      t0
    );
  }

  // Test 3: Slug < 3 chars rejected
  {
    const t0 = Date.now();
    const res1 = validateWorkspaceSlug("ab");
    const res2 = validateWorkspaceSlug("a");
    const passed =
      res1.valid === false &&
      (res1 as any).reason === "too_short" &&
      res2.valid === false &&
      (res2 as any).reason === "too_short";
    recordTest(
      3,
      "Slug Validation",
      "Slug < 3 characters rejected with 'too_short'",
      passed,
      `'ab' => ${JSON.stringify(res1)}, 'a' => ${JSON.stringify(res2)}`,
      t0
    );
  }

  // Test 4: Slug > 30 chars rejected
  {
    const t0 = Date.now();
    const thirtyOneCharSlug = "a123456789b123456789c123456789x";
    const res = validateWorkspaceSlug(thirtyOneCharSlug);
    const passed =
      thirtyOneCharSlug.length === 31 &&
      res.valid === false &&
      (res as any).reason === "too_long";
    recordTest(
      4,
      "Slug Validation",
      "Slug > 30 characters (31 chars) rejected with 'too_long'",
      passed,
      `Length: ${thirtyOneCharSlug.length}, Result: ${JSON.stringify(res)}`,
      t0
    );
  }

  // Test 5: Uppercase letters rejected
  {
    const t0 = Date.now();
    const res = validateWorkspaceSlug("AcmeCorp");
    recordTest(
      5,
      "Slug Validation",
      "Uppercase letters in slug rejected",
      res.valid === false,
      JSON.stringify(res),
      t0
    );
  }

  // Test 6: Slug starting or ending with hyphen rejected
  {
    const t0 = Date.now();
    const res1 = validateWorkspaceSlug("-acme");
    const res2 = validateWorkspaceSlug("acme-");
    const passed = res1.valid === false && res2.valid === false;
    recordTest(
      6,
      "Slug Validation",
      "Slug starting or ending with hyphen rejected",
      passed,
      `'-acme': ${JSON.stringify(res1)}, 'acme-': ${JSON.stringify(res2)}`,
      t0
    );
  }

  // Test 7: Consecutive hyphens rejected
  {
    const t0 = Date.now();
    const res = validateWorkspaceSlug("acme--corp");
    const passed = res.valid === false && (res as any).reason === "consecutive_hyphens";
    recordTest(
      7,
      "Slug Validation",
      "Slug with consecutive hyphens ('acme--corp') rejected",
      passed,
      JSON.stringify(res),
      t0
    );
  }

  // Test 8: Special characters, dots, spaces, underscores rejected
  {
    const t0 = Date.now();
    const testCases = ["acme corp", "acme.corp", "acme_corp", "acme@corp", "acme$"];
    const allRejected = testCases.every((slug) => validateWorkspaceSlug(slug).valid === false);
    recordTest(
      8,
      "Slug Validation",
      "Spaces, dots, underscores, and special characters rejected",
      allRejected,
      `Tested: ${testCases.join(", ")}`,
      t0
    );
  }

  // Test 9: Reserved names blocked
  {
    const t0 = Date.now();
    const reserved = ["admin", "super", "api", "app", "www", "login", "auth", "billing", "support", "docs"];
    const allBlocked = reserved.every(
      (slug) => validateWorkspaceSlug(slug).valid === false && (validateWorkspaceSlug(slug) as any).reason === "reserved"
    );
    recordTest(
      9,
      "Slug Validation",
      "Reserved workspace slugs blocked with reason 'reserved'",
      allBlocked,
      `Tested reserved slugs: ${reserved.join(", ")}`,
      t0
    );
  }

  // Test 10: suggestWorkspaceSlug handles company names, truncates to 30, avoids collisions
  {
    const t0 = Date.now();
    const s1 = suggestWorkspaceSlug("Acme Corporation International Worldwide 2026");
    const s2 = suggestWorkspaceSlug("Super"); // reserved word
    const s3 = suggestWorkspaceSlug("A");     // too short
    const passed =
      s1.length <= 30 &&
      validateWorkspaceSlug(s1).valid &&
      s2 !== "super" &&
      validateWorkspaceSlug(s2).valid &&
      s3.length >= 3 &&
      validateWorkspaceSlug(s3).valid;
    recordTest(
      10,
      "Slug Suggestion",
      "suggestWorkspaceSlug sanitizes, enforces 3-30 chars, and resolves reserved conflicts",
      passed,
      `'Acme...' => '${s1}' (${s1.length} chars), 'Super' => '${s2}', 'A' => '${s3}'`,
      t0
    );
  }

  // ── GROUP 2: DYNAMIC MULTI-BASE-DOMAIN RESOLUTION ────────────────
  console.log("\n─── GROUP 2: DYNAMIC MULTI-BASE-DOMAIN HOST RESOLUTION ───");

  // Test 11: Configuration 1: BASE_DOMAIN = example.com
  {
    const t0 = Date.now();
    const base = "example.com";
    const rRoot = resolveHostContext("example.com", base);
    const rWww = resolveHostContext("www.example.com", base);
    const rSuper = resolveHostContext("super.example.com", base);
    const rAcme = resolveHostContext("acme.example.com", base);
    const rBeta = resolveHostContext("beta.example.com", base);
    const rPort = resolveHostContext("acme.example.com:443", base);

    const passed =
      rRoot.type === "public" &&
      rWww.type === "public" &&
      rSuper.type === "super" &&
      rAcme.type === "tenant" &&
      (rAcme as any).slug === "acme" &&
      rBeta.type === "tenant" &&
      (rBeta as any).slug === "beta" &&
      rPort.type === "tenant" &&
      (rPort as any).slug === "acme";

    recordTest(
      11,
      "Host Resolution",
      "Base domain 'example.com': root, super, acme, beta resolved with port stripping",
      passed,
      `acme: ${rAcme.type}/${(rAcme as any).slug} | super: ${rSuper.type} | root: ${rRoot.type}`,
      t0
    );
  }

  // Test 12: Configuration 2: BASE_DOMAIN = example.in (zero code changes)
  {
    const t0 = Date.now();
    const base = "example.in";
    const rRoot = resolveHostContext("example.in", base);
    const rSuper = resolveHostContext("super.example.in", base);
    const rAcme = resolveHostContext("acme.example.in", base);
    const rBeta = resolveHostContext("beta.example.in", base);

    const passed =
      rRoot.type === "public" &&
      rSuper.type === "super" &&
      rAcme.type === "tenant" &&
      (rAcme as any).slug === "acme" &&
      rBeta.type === "tenant" &&
      (rBeta as any).slug === "beta";

    recordTest(
      12,
      "Host Resolution",
      "Base domain 'example.in': root, super, acme, beta resolved with same code",
      passed,
      `acme: ${rAcme.type}/${(rAcme as any).slug} | super: ${rSuper.type} | root: ${rRoot.type}`,
      t0
    );
  }

  // Test 13: Local Development: *.localhost resolution
  {
    const t0 = Date.now();
    const base = "localhost";
    const rRoot = resolveHostContext("localhost:5173", base);
    const rSuper = resolveHostContext("super.localhost:5173", base);
    const rAcme = resolveHostContext("acme.localhost:5173", base);
    const rBeta = resolveHostContext("beta.localhost:5173", base);

    const passed =
      rRoot.type === "public" &&
      rSuper.type === "super" &&
      rAcme.type === "tenant" &&
      (rAcme as any).slug === "acme" &&
      rBeta.type === "tenant" &&
      (rBeta as any).slug === "beta";

    recordTest(
      13,
      "Host Resolution",
      "Localhost subdomains: acme.localhost, super.localhost, localhost resolved correctly",
      passed,
      `acme: ${rAcme.type}/${(rAcme as any).slug} | super: ${rSuper.type} | root: ${rRoot.type}`,
      t0
    );
  }

  // Test 14: Dynamic URL generation without hardcoded strings
  {
    const t0 = Date.now();
    const urlCom = getWorkspaceUrl("acme", undefined, "myplatform.com");
    const urlIn = getWorkspaceUrl("beta", undefined, "myplatform.in");
    const superUrl = getSuperAdminUrl(undefined, "myplatform.com");
    const rootUrl = getRootUrl(undefined, "myplatform.com");

    const passed =
      urlCom.includes("acme.myplatform.com") &&
      !urlCom.includes("masterhrms.com") &&
      urlIn.includes("beta.myplatform.in") &&
      superUrl.includes("myplatform.com/super") &&
      rootUrl.includes("myplatform.com");

    recordTest(
      14,
      "URL Generation",
      "Dynamic URL builders derive from configuration and never hardcode domain",
      passed,
      `com: ${urlCom} | in: ${urlIn} | super: ${superUrl}`,
      t0
    );
  }

  // ── GROUP 3: LIVE AVAILABILITY API (GET /api/workspace/check-slug) ─
  console.log("\n─── GROUP 3: LIVE WORKSPACE AVAILABILITY CHECK API ───");

  // Test 15: Available slug returns { available: true }
  {
    const t0 = Date.now();
    const res = await hostFetch(`${baseUrl}/api/workspace/check-slug?slug=newuniquebrand`);
    const data = await res.json();
    recordTest(
      15,
      "Availability API",
      "Available unique slug returns { available: true }",
      res.status === 200 && data.available === true,
      `Status ${res.status}: ${JSON.stringify(data)}`,
      t0
    );
  }

  // Test 16: Slug < 3 chars returns { available: false, reason: 'too_short' }
  {
    const t0 = Date.now();
    const res = await hostFetch(`${baseUrl}/api/workspace/check-slug?slug=xy`);
    const data = await res.json();
    recordTest(
      16,
      "Availability API",
      "Slug < 3 characters returns available: false, reason: 'too_short'",
      res.status === 200 && data.available === false && data.reason === "too_short",
      JSON.stringify(data),
      t0
    );
  }

  // Test 17: Slug > 30 chars returns { available: false, reason: 'too_long' }
  {
    const t0 = Date.now();
    const res = await hostFetch(`${baseUrl}/api/workspace/check-slug?slug=${"a".repeat(31)}`);
    const data = await res.json();
    recordTest(
      17,
      "Availability API",
      "Slug > 30 characters returns available: false, reason: 'too_long'",
      res.status === 200 && data.available === false && data.reason === "too_long",
      JSON.stringify(data),
      t0
    );
  }

  // Test 18: Reserved word returns { available: false, reason: 'reserved' }
  {
    const t0 = Date.now();
    const res = await hostFetch(`${baseUrl}/api/workspace/check-slug?slug=billing`);
    const data = await res.json();
    recordTest(
      18,
      "Availability API",
      "Reserved word returns available: false, reason: 'reserved'",
      res.status === 200 && data.available === false && data.reason === "reserved",
      JSON.stringify(data),
      t0
    );
  }

  // Test 19: Existing active tenant slug returns { available: false, reason: 'taken' }
  {
    const t0 = Date.now();
    const res = await hostFetch(`${baseUrl}/api/workspace/check-slug?slug=acme`);
    const data = await res.json();
    recordTest(
      19,
      "Availability API",
      "Active tenant slug ('acme') returns available: false, reason: 'taken'",
      res.status === 200 && data.available === false && data.reason === "taken",
      JSON.stringify(data),
      t0
    );
  }

  // ── GROUP 4: HOST-SCOPED AUTHENTICATION & LOGIN SECURITY ──────────
  console.log("\n─── GROUP 4: HOST-SCOPED AUTHENTICATION & LOGIN SECURITY ───");

  // Test 20: ACME user logging in on ACME host -> PASS (200)
  {
    const t0 = Date.now();
    const res = await hostFetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Host: `acme.${BD}`,
      },
      body: JSON.stringify({
        email: "admin@acme-flow1.test",
        password: passwordPlain,
      }),
    });
    const data = await res.json();
    recordTest(
      20,
      "Authentication",
      "ACME user logging in on ACME host ('acme.localhost') succeeds",
      res.status === 200 && (data.token || data.requires2FA),
      `Status ${res.status}: token=${Boolean(data.token)} requires2FA=${Boolean(data.requires2FA)}`,
      t0
    );
  }

  // Test 21: BETA user logging in on BETA host -> PASS (200)
  {
    const t0 = Date.now();
    const res = await hostFetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Host: `beta.${BD}`,
      },
      body: JSON.stringify({
        email: "admin@beta-flow1.test",
        password: passwordPlain,
      }),
    });
    const data = await res.json();
    recordTest(
      21,
      "Authentication",
      "BETA user logging in on BETA host ('beta.localhost') succeeds",
      res.status === 200 && (data.token || data.requires2FA),
      `Status ${res.status}: token=${Boolean(data.token)}`,
      t0
    );
  }

  // Test 22: SECURITY MUST-FAIL: ACME user logging in on BETA host -> 403 TENANT_MISMATCH
  {
    const t0 = Date.now();
    const res = await hostFetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Host: `beta.${BD}`,
      },
      body: JSON.stringify({
        email: "admin@acme-flow1.test",
        password: passwordPlain,
      }),
    });
    const data = await res.json();
    recordTest(
      22,
      "Security Isolation",
      "SECURITY MUST-FAIL: ACME user -> beta.localhost is REJECTED with 403 TENANT_MISMATCH",
      res.status === 403 && data.code === "TENANT_MISMATCH",
      `HTTP ${res.status} | Code: ${data.code} | Error: ${data.error}`,
      t0
    );
  }

  // Test 23: SECURITY MUST-FAIL: BETA user logging in on ACME host -> 403 TENANT_MISMATCH
  {
    const t0 = Date.now();
    const res = await hostFetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Host: `acme.${BD}`,
      },
      body: JSON.stringify({
        email: "admin@beta-flow1.test",
        password: passwordPlain,
      }),
    });
    const data = await res.json();
    recordTest(
      23,
      "Security Isolation",
      "SECURITY MUST-FAIL: BETA user -> acme.localhost is REJECTED with 403 TENANT_MISMATCH",
      res.status === 403 && data.code === "TENANT_MISMATCH",
      `HTTP ${res.status} | Code: ${data.code} | Error: ${data.error}`,
      t0
    );
  }

  // Test 24: SECURITY MUST-FAIL: Tenant user logging in on Super Admin host -> 403 SUPER_ADMIN_ONLY
  {
    const t0 = Date.now();
    const res = await hostFetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Host: `super.${BD}`,
      },
      body: JSON.stringify({
        email: "admin@acme-flow1.test",
        password: passwordPlain,
      }),
    });
    const data = await res.json();
    recordTest(
      24,
      "Security Isolation",
      "SECURITY MUST-FAIL: Tenant user -> super.localhost is REJECTED with 403 SUPER_ADMIN_ONLY",
      res.status === 403 && data.code === "SUPER_ADMIN_ONLY",
      `HTTP ${res.status} | Code: ${data.code} | Error: ${data.error}`,
      t0
    );
  }

  // Test 25: Super Admin logging in on Super Admin host -> PASS
  {
    const t0 = Date.now();
    const res = await hostFetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Host: `super.${BD}`,
      },
      body: JSON.stringify({
        email: "superadmin.flow1@testplatform.com",
        password: passwordPlain,
      }),
    });
    const data = await res.json();
    recordTest(
      25,
      "Authentication",
      "Super Admin user -> super.localhost login succeeds",
      res.status === 200 && (data.token || data.requires2FA),
      `HTTP ${res.status}: token=${Boolean(data.token)}`,
      t0
    );
  }

  // Test 25b: Normal tenant credentials on BASE_DOMAIN/Super -> 403 SUPER_ADMIN_ONLY
  {
    const t0 = Date.now();
    const res = await hostFetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Host: BD,
        "X-Auth-Portal": "super",
      },
      body: JSON.stringify({
        email: "admin@acme-flow1.test",
        password: passwordPlain,
        portal: "super",
      }),
    });
    const data = await res.json();
    recordTest(
      251,
      "Super Portal Isolation",
      "Normal tenant credentials on BASE_DOMAIN/Super rejected with 403 SUPER_ADMIN_ONLY",
      res.status === 403 && data.code === "SUPER_ADMIN_ONLY",
      `HTTP ${res.status}: code=${data.code} error=${data.error}`,
      t0
    );
  }

  // Test 25c: Super Admin credentials on BASE_DOMAIN/Super -> PASS (200)
  {
    const t0 = Date.now();
    const res = await hostFetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Host: BD,
        "X-Auth-Portal": "super",
      },
      body: JSON.stringify({
        email: "superadmin.flow1@testplatform.com",
        password: passwordPlain,
        portal: "super",
      }),
    });
    const data = await res.json();
    recordTest(
      252,
      "Super Portal Authentication",
      "Super Admin credentials on BASE_DOMAIN/Super succeeds (200)",
      res.status === 200 && Boolean(data.token || data.requires2FA),
      `HTTP ${res.status}: token=${Boolean(data.token)}`,
      t0
    );
  }

  // Test 25d: Normal root login: BASE_DOMAIN/Auth -> authenticate -> resolves Tenant.slug -> returns workspaceUrl
  {
    const t0 = Date.now();
    const res = await hostFetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Host: BD,
      },
      body: JSON.stringify({
        email: "admin@acme-flow1.test",
        password: passwordPlain,
      }),
    });
    const data = await res.json();
    const hasWorkspaceUrl = Boolean(data.workspaceUrl && data.workspaceUrl.includes("acme"));
    recordTest(
      253,
      "Root Login Redirection",
      "Root login on BASE_DOMAIN/Auth resolves Tenant.slug and returns dynamic workspaceUrl",
      res.status === 200 && Boolean(data.token || data.requires2FA) && hasWorkspaceUrl,
      `HTTP ${res.status}: workspaceUrl=${data.workspaceUrl} tenantSlug=${data.tenantSlug}`,
      t0
    );
  }

  // ── CRITICAL SUPER ADMIN ROUTE ISOLATION ON TENANT HOSTS ──
  // Test 254: GET /Super on acme tenant host -> 404 Not Found
  {
    const t0 = Date.now();
    const res = await hostFetch(`${baseUrl}/Super`, {
      method: "GET",
      headers: {
        Host: `acme.${BD}`,
      },
    });
    const data = await res.json();
    recordTest(
      254,
      "Super Route Isolation",
      `CRITICAL: GET /Super on tenant host ('acme.${BD}') returns HTTP 404 Not Found (no redirect, no super UI)`,
      res.status === 404 && data.code === "NOT_FOUND",
      `HTTP ${res.status}: code=${data.code}`,
      t0
    );
  }

  // Test 255: GET /super (lowercase) on acme tenant host -> 404 Not Found
  {
    const t0 = Date.now();
    const res = await hostFetch(`${baseUrl}/super`, {
      method: "GET",
      headers: {
        Host: `acme.${BD}`,
      },
    });
    const data = await res.json();
    recordTest(
      255,
      "Super Route Isolation",
      `CRITICAL: GET /super on tenant host ('acme.${BD}') returns HTTP 404 Not Found`,
      res.status === 404 && data.code === "NOT_FOUND",
      `HTTP ${res.status}: code=${data.code}`,
      t0
    );
  }

  // Test 256: GET /Super on beta tenant host -> 404 Not Found
  {
    const t0 = Date.now();
    const res = await hostFetch(`${baseUrl}/Super`, {
      method: "GET",
      headers: {
        Host: `beta.${BD}`,
      },
    });
    const data = await res.json();
    recordTest(
      256,
      "Super Route Isolation",
      `CRITICAL: GET /Super on beta host ('beta.${BD}') returns HTTP 404 Not Found`,
      res.status === 404 && data.code === "NOT_FOUND",
      `HTTP ${res.status}: code=${data.code}`,
      t0
    );
  }

  // Test 257: GET /api/super/tenants on tenant host -> 404 Not Found
  {
    const t0 = Date.now();
    const res = await hostFetch(`${baseUrl}/api/super/tenants`, {
      method: "GET",
      headers: {
        Host: `acme.${BD}`,
      },
    });
    const data = await res.json();
    recordTest(
      257,
      "Super Route Isolation",
      `CRITICAL: GET /api/super/* on tenant host ('acme.${BD}') returns HTTP 404 Not Found`,
      res.status === 404 && data.code === "NOT_FOUND",
      `HTTP ${res.status}: code=${data.code}`,
      t0
    );
  }

  // Test 258: Super portal authentication attempt on tenant host -> 404 Not Found (NOT 403)
  {
    const t0 = Date.now();
    const res = await hostFetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Host: `acme.${BD}`,
        "X-Auth-Portal": "super",
      },
      body: JSON.stringify({
        email: "superadmin.flow1@testplatform.com",
        password: passwordPlain,
        portal: "super",
      }),
    });
    const data = await res.json();
    recordTest(
      258,
      "Super Route Isolation",
      `CRITICAL: Super portal authentication attempt on tenant host returns HTTP 404 Not Found (NOT 403)`,
      res.status === 404 && data.code === "NOT_FOUND",
      `HTTP ${res.status}: code=${data.code}`,
      t0
    );
  }

  // ── GROUP 5: SESSION & REQUEST-SCOPED ISOLATION ──────────────────
  console.log("\n─── GROUP 5: SESSION & REQUEST-SCOPED TENANT ISOLATION ───");

  // Tokens for ACME and BETA
  const acmeToken = generateToken({
    userId: testAcmeUserId,
    email: "admin@acme-flow1.test",
    tenantId: tenantAcme.id,
    roles: ["hr_admin"],
  });

  const betaToken = generateToken({
    userId: testBetaUserId,
    email: "admin@beta-flow1.test",
    tenantId: tenantBeta.id,
    roles: ["hr_admin"],
  });

  // Test 26: SECURITY MUST-FAIL: ACME session accessing BETA workspace host -> 403 HOST_TENANT_MISMATCH
  {
    const t0 = Date.now();
    const res = await hostFetch(`${baseUrl}/api/tenant-protected-data`, {
      headers: {
        Authorization: `Bearer ${acmeToken}`,
        Host: `beta.${BD}`,
      },
    });
    const data = await res.json();
    recordTest(
      26,
      "Session Isolation",
      "SECURITY MUST-FAIL: ACME session accessing BETA host rejected with 403 HOST_TENANT_MISMATCH",
      res.status === 403 && data.code === "HOST_TENANT_MISMATCH",
      `HTTP ${res.status} | Code: ${data.code} | Error: ${data.error}`,
      t0
    );
  }

  // Test 27: ACME session accessing ACME workspace host -> PASS (200)
  {
    const t0 = Date.now();
    const res = await hostFetch(`${baseUrl}/api/tenant-protected-data`, {
      headers: {
        Authorization: `Bearer ${acmeToken}`,
        Host: `acme.${BD}`,
      },
    });
    const data = await res.json();
    recordTest(
      27,
      "Session Isolation",
      "ACME session accessing ACME host succeeds with request-scoped context",
      res.status === 200 && data.tenantId === tenantAcme.id,
      `HTTP ${res.status} | TenantId: ${data.tenantId}`,
      t0
    );
  }

  // Test 28: Unknown workspace host returns 404 WORKSPACE_NOT_FOUND
  {
    const t0 = Date.now();
    const res = await hostFetch(`${baseUrl}/api/tenant-protected-data`, {
      headers: {
        Authorization: `Bearer ${acmeToken}`,
        Host: `nonexistent-co.${BD}`,
      },
    });
    const data = await res.json();
    recordTest(
      28,
      "Routing",
      "Unknown workspace host returns HTTP 404 WORKSPACE_NOT_FOUND",
      res.status === 404 && data.code === "WORKSPACE_NOT_FOUND",
      `HTTP ${res.status} | Code: ${data.code} | Host: ${data.host}`,
      t0
    );
  }

  // ── GROUP 6: SUPER ADMIN IMPERSONATION & TENANT HOST ROUTING ─────
  console.log("\n─── GROUP 6: SUPER ADMIN IMPERSONATION & WORKSPACE ROUTING ───");

  const superToken = generateToken({
    userId: testSuperAdminId,
    email: "superadmin.flow1@testplatform.com",
    roles: ["super_admin"],
  });

  let impersonationToken = "";

  // Test 29: Super Admin Impersonation of Tenant ACME -> MUST WORK
  {
    const t0 = Date.now();
    const res = await hostFetch(`${baseUrl}/api/super/impersonate/${tenantAcme.id}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${superToken}`,
        Host: `super.${BD}`,
      },
    });
    const data = await res.json();
    impersonationToken = data.token;
    const passed =
      res.status === 200 &&
      data.isImpersonating === true &&
      data.tenant.id === tenantAcme.id &&
      typeof data.workspaceUrl === "string" &&
      typeof data.redirectUrl === "string" &&
      data.redirectUrl.includes("impersonate?token=");

    recordTest(
      29,
      "Impersonation",
      "Super Admin impersonates Tenant ACME: returns scoped token and dynamic redirectUrl",
      passed,
      `HTTP ${res.status} | Url: ${data.workspaceUrl} | redirectUrl: ${data.redirectUrl?.substring(0, 50)}...`,
      t0
    );
  }

  // Test 30: Impersonated token accessing ACME host -> MUST WORK
  {
    const t0 = Date.now();
    const res = await hostFetch(`${baseUrl}/api/tenant-protected-data`, {
      headers: {
        Authorization: `Bearer ${impersonationToken}`,
        Host: `acme.${BD}`,
      },
    });
    const data = await res.json();
    recordTest(
      30,
      "Impersonation",
      "Impersonation token accesses ACME workspace host successfully",
      res.status === 200 && data.tenantId === tenantAcme.id,
      `HTTP ${res.status} | TenantId: ${data.tenantId}`,
      t0
    );
  }

  // Test 31: SECURITY MUST-FAIL: Impersonated ACME token accessing BETA host -> 403 HOST_TENANT_MISMATCH
  {
    const t0 = Date.now();
    const res = await hostFetch(`${baseUrl}/api/tenant-protected-data`, {
      headers: {
        Authorization: `Bearer ${impersonationToken}`,
        Host: `beta.${BD}`,
      },
    });
    const data = await res.json();
    recordTest(
      31,
      "Impersonation Security",
      "SECURITY MUST-FAIL: Impersonated ACME token accessing BETA host rejected with 403",
      res.status === 403 && data.code === "HOST_TENANT_MISMATCH",
      `HTTP ${res.status} | Code: ${data.code}`,
      t0
    );
  }

  // ── GROUP 7: WORKSPACE RENAME, 30-DAY THROTTLE & 30-DAY REDIRECT ──
  console.log("\n─── GROUP 7: WORKSPACE RENAME & 30-DAY REDIRECT PROTOCOL ───");

  const originalSlug = "acme";
  const renamedSlug = "acme-renamed";

  // Test 32: Workspace Rename Execution (POST /api/workspace/rename)
  {
    const t0 = Date.now();
    const res = await hostFetch(`${baseUrl}/api/workspace/rename`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${acmeToken}`,
        Host: `acme.${BD}`,
      },
      body: JSON.stringify({ newSlug: renamedSlug }),
    });
    const data = await res.json();

    // Verify DB state
    const updatedTenant = await prisma.tenant.findUnique({ where: { id: tenantAcme.id } });
    const historyEntry = await (prisma as any).workspaceSlugHistory.findFirst({
      where: { tenantId: tenantAcme.id, oldSlug: originalSlug, newSlug: renamedSlug },
    });
    const redirectEntry = await (prisma as any).workspaceSlugRedirect.findFirst({
      where: { oldSlug: originalSlug, newSlug: renamedSlug },
    });

    const passed =
      res.status === 200 &&
      data.success === true &&
      updatedTenant?.slug === renamedSlug &&
      historyEntry !== null &&
      redirectEntry !== null &&
      new Date(redirectEntry.redirectUntil) > new Date();

    recordTest(
      32,
      "Workspace Rename",
      "Workspace rename executes transaction: updates slug, writes history, creates 30-day redirect",
      passed,
      `HTTP ${res.status} | DB slug: ${updatedTenant?.slug} | Redirect until: ${redirectEntry?.redirectUntil}`,
      t0
    );
  }

  // Test 33: 30-Day Throttle: Immediate second rename attempt -> MUST FAIL (400 RENAME_THROTTLED)
  {
    const t0 = Date.now();
    // New token with updated slug for the tenant
    const updatedAcmeToken = generateToken({
      userId: testAcmeUserId,
      email: "admin@acme-flow1.test",
      tenantId: tenantAcme.id,
      roles: ["hr_admin"],
    });

    const res = await hostFetch(`${baseUrl}/api/workspace/rename`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${updatedAcmeToken}`,
        Host: `acme-renamed.${BD}`,
      },
      body: JSON.stringify({ newSlug: "acme-third-attempt" }),
    });
    const data = await res.json();

    recordTest(
      33,
      "Rename Throttle",
      "SECURITY RULE: Immediate second rename within 30 days is BLOCKED with 400 RENAME_THROTTLED",
      res.status === 400 && data.code === "RENAME_THROTTLED",
      `HTTP ${res.status} | Code: ${data.code} | NextAllowed: ${data.nextAllowedAt}`,
      t0
    );
  }

  // Test 34: 30-Day Old-Slug Redirect: Accessing old slug returns HTTP 301 Moved Permanently
  {
    const t0 = Date.now();
    // Node fetch by default follows redirects, so set redirect: 'manual' to verify 301
    const res = await hostFetch(`${baseUrl}/api/tenant-protected-data`, {
      headers: {
        Authorization: `Bearer ${acmeToken}`,
        Host: `acme.${BD}`,
      },
      redirect: "manual",
    });

    const data = await res.json();
    const passed =
      res.status === 301 &&
      data.code === "WORKSPACE_MOVED" &&
      data.newSlug === renamedSlug;

    recordTest(
      34,
      "Slug Redirect",
      "Accessing old slug host ('acme.localhost') returns HTTP 301 Moved to new slug",
      passed,
      `HTTP ${res.status} | Code: ${data.code} | NewSlug: ${data.newSlug} | NewUrl: ${data.newUrl}`,
      t0
    );
  }

  // Test 35: Old slug reserved: check-slug on old slug returns reserved_redirect
  {
    const t0 = Date.now();
    const res = await hostFetch(`${baseUrl}/api/workspace/check-slug?slug=${originalSlug}`);
    const data = await res.json();
    const passed =
      res.status === 200 &&
      data.available === false &&
      data.reason === "reserved_redirect";

    recordTest(
      35,
      "Slug Protection",
      "Old slug is protected during 30-day redirect and cannot be claimed by others",
      passed,
      `Available: ${data.available} | Reason: ${data.reason}`,
      t0
    );
  }

  // Test 36: Slug Rename History Query (GET /api/workspace/slug-history)
  {
    const t0 = Date.now();
    const updatedAcmeToken = generateToken({
      userId: testAcmeUserId,
      email: "admin@acme-flow1.test",
      tenantId: tenantAcme.id,
      roles: ["hr_admin"],
    });

    const res = await hostFetch(`${baseUrl}/api/workspace/slug-history`, {
      headers: {
        Authorization: `Bearer ${updatedAcmeToken}`,
        Host: `acme-renamed.${BD}`,
      },
    });
    const data = await res.json();
    const passed =
      res.status === 200 &&
      data.success === true &&
      Array.isArray(data.history) &&
      data.history.length > 0 &&
      data.history[0].oldSlug === originalSlug &&
      data.history[0].newSlug === renamedSlug;

    recordTest(
      36,
      "Audit Trail",
      "GET /api/workspace/slug-history returns persistent rename audit trail",
      passed,
      `History count: ${data.history?.length} | Old: ${data.history?.[0]?.oldSlug} -> New: ${data.history?.[0]?.newSlug}`,
      t0
    );
  }

  // ── CLEANUP TEST SERVER & DB FIXTURES ────────────────────────────
  server.close();
  try {
    await prisma.workspaceSlugRedirect.deleteMany({
      where: { tenantId: { in: [testTenantAcmeId, testTenantBetaId] } },
    });
    await prisma.workspaceSlugHistory.deleteMany({
      where: { tenantId: { in: [testTenantAcmeId, testTenantBetaId] } },
    });
    await prisma.userRole.deleteMany({
      where: { userId: { in: [testSuperAdminId, testAcmeUserId, testBetaUserId] } },
    });
    await prisma.profile.deleteMany({
      where: { userId: { in: [testSuperAdminId, testAcmeUserId, testBetaUserId] } },
    });
    await prisma.user.deleteMany({
      where: {
        OR: [
          { id: { in: [testSuperAdminId, testAcmeUserId, testBetaUserId] } },
          { email: { in: ["superadmin.flow1@testplatform.com", "admin@acme-flow1.test", "admin@beta-flow1.test"] } },
        ],
      },
    });
    await prisma.tenantSubscription.deleteMany({
      where: { tenantId: { in: [testTenantAcmeId, testTenantBetaId] } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: [testTenantAcmeId, testTenantBetaId] } },
    });
  } catch {}

  // ── SUMMARY REPORT ───────────────────────────────────────────────
  console.log("\n================================================================================");
  console.log("FLOW 1 ACCEPTANCE SUITE EXECUTION SUMMARY");
  console.log("================================================================================");
  const total = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = total - passedCount;

  console.log(`TOTAL TESTS  : ${total}`);
  console.log(`PASSED       : ${passedCount}`);
  console.log(`FAILED       : ${failedCount}`);
  console.log(`BLOCKED      : 0`);
  console.log(`SUCCESS RATE : ${Math.round((passedCount / total) * 100)}%\n`);

  if (failedCount > 0) {
    console.error("FAILURES DETECTED in the following test cases:");
    results.filter((r) => !r.passed).forEach((r) => {
      console.error(`- Test ${r.id}: ${r.name} | Evidence: ${r.evidence}`);
    });
    process.exit(1);
  } else {
    console.log("ALL 36 FLOW 1 ACCEPTANCE TESTS PASSED WITH 100% SUCCESS RATE.");
    process.exit(0);
  }
}

runFlow1AcceptanceSuite().catch((err) => {
  console.error("Fatal test runner crash:", err);
  process.exit(1);
});
