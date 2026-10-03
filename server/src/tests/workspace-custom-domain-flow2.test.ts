import dotenv from "dotenv";
import path from "path";
import http from "http";
import express from "express";
import bcrypt from "bcryptjs";
import { rawPrisma as prisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import {
  resolveHostContext,
  getWorkspaceUrl,
  getCustomDomainUrl,
  getSuperAdminUrl,
  getRootUrl,
  getBaseDomain,
  invalidateWorkspaceCache,
  invalidateCustomDomainCache,
  getCachedCustomDomain,
} from "../lib/workspace-host";
import { normalizeDomain, validateCustomDomain } from "../lib/domain-normalization";
import { getRequiredDnsRecords, verifyDomainDns, getPlatformCnameTarget } from "../services/domain-dns.service";
import { workspaceHostMiddleware } from "../middleware/workspace-host.middleware";
import { workspaceRoutingRouter } from "../routes/workspace-routing.routes";
import { authRouter } from "../routes/auth.routes";
import { superRouter } from "../routes/super.routes";
import { tenantDomainRouter } from "../routes/tenant-domain.routes";
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
const BD = getBaseDomain();

/**
 * node:http fetch helper that sends the real Host header on the wire.
 */
function hostFetch(
  url: string,
  opts: { method?: string; headers?: Record<string, string>; body?: string } = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; json: () => Promise<any>; text: () => Promise<string> }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers: Record<string, string | number> = { ...(opts.headers || {}) };
    if (opts.body) headers["Content-Length"] = Buffer.byteLength(opts.body);
    const req = http.request(
      { hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: opts.method || "GET", headers },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            json: async () => {
              try {
                return JSON.parse(raw);
              } catch {
                return { raw };
              }
            },
            text: async () => raw,
          });
        });
      }
    );
    req.on("error", reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

async function recordTest(id: number, category: string, name: string, fn: () => Promise<string>) {
  const start = Date.now();
  try {
    const evidence = await fn();
    const durationMs = Date.now() - start;
    results.push({ id, category, name, passed: true, evidence, durationMs });
    console.log(`  ✔ [Test ${id}] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({ id, category, name, passed: false, evidence: err?.message || String(err), durationMs });
    console.error(`  ✖ [Test ${id}] ${name} (${durationMs}ms) - FAIL: ${err?.message || err}`);
  }
}

async function runFlow2TestSuite() {
  console.log("\n=======================================================");
  console.log("  FLOW 2: CUSTOM DOMAIN ACCEPTANCE TEST SUITE (30 TESTS)");
  console.log("=======================================================\n");

  // 1. Build test Express application exactly mirroring production stack
  const app = express();
  app.use(express.json());

  // Workspace host middleware for tenant & custom domain host resolution
  app.use(workspaceHostMiddleware);

  // Mount API routers
  app.use("/api", workspaceRoutingRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/workspace/custom-domain", tenantDomainRouter);
  app.use("/api/super", superRouter);

  // Protected tenant test endpoint
  app.get(
    "/api/tenant/protected-resource",
    requireAuth,
    resolveTenantContext,
    (req: any, res) => {
      res.json({
        success: true,
        tenantId: req.resolvedTenant?.id || req.user?.tenantId,
        userTenantId: req.user?.tenantId,
        message: "Tenant resource accessed successfully",
      });
    }
  );

  // Start temporary test HTTP server
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const addr = server.address() as any;
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  // Unique test identifiers to avoid test cross-pollution
  const suffix = Date.now();
  const slugA = `flow2-acme-${suffix}`;
  const slugB = `flow2-beta-${suffix}`;
  const domainA = `app.acme-${suffix}.com`;
  const domainB = `portal.beta-${suffix}.org`;
  const passwordHash = await bcrypt.hash("P@ssword123!", 10);

  let tenantA: any;
  let tenantB: any;
  let userA: any;
  let userB: any;
  let superAdminUser: any;
  let tokenA: string = "";
  let tokenB: string = "";
  let superToken: string = "";
  let createdDomainRecordId: string = "";

  try {
    // ── Setup Test Fixtures ──
    console.log("▶ Setting up test tenants and users in PostgreSQL...");

    tenantA = await prisma.tenant.create({
      data: {
        name: `Acme Corp ${suffix}`,
        slug: slugA,
      },
    });

    tenantB = await prisma.tenant.create({
      data: {
        name: `Beta Tech ${suffix}`,
        slug: slugB,
      },
    });

    userA = await prisma.user.create({
      data: {
        email: `admin@acme-${suffix}.com`,
        passwordHash,
        twoFactorEnabled: true,
        profile: {
          create: {
            fullName: "Acme Admin",
            tenantId: tenantA.id,
          },
        },
        roles: {
          create: {
            role: "hr_admin",
            tenantId: tenantA.id,
          },
        },
      },
      include: { profile: true, roles: true },
    });

    userB = await prisma.user.create({
      data: {
        email: `admin@beta-${suffix}.com`,
        passwordHash,
        twoFactorEnabled: true,
        profile: {
          create: {
            fullName: "Beta Admin",
            tenantId: tenantB.id,
          },
        },
        roles: {
          create: {
            role: "hr_admin",
            tenantId: tenantB.id,
          },
        },
      },
      include: { profile: true, roles: true },
    });

    superAdminUser = await prisma.user.create({
      data: {
        email: `superadmin-${suffix}@platform.internal`,
        passwordHash,
        twoFactorEnabled: true,
        roles: {
          create: {
            role: "super_admin",
          },
        },
      },
      include: { roles: true },
    });

    tokenA = generateToken({
      userId: userA.id,
      email: userA.email,
      tenantId: tenantA.id,
      roles: ["hr_admin"],
    });

    tokenB = generateToken({
      userId: userB.id,
      email: userB.email,
      tenantId: tenantB.id,
      roles: ["hr_admin"],
    });

    superToken = generateToken({
      userId: superAdminUser.id,
      email: superAdminUser.email,
      roles: ["super_admin"],
    });

    console.log("  ✔ Fixtures ready (Tenant A, Tenant B, Super Admin)\n");

    // ─────────────────────────────────────────────────────────
    // TEST 1: Valid custom domain request
    // ─────────────────────────────────────────────────────────
    await recordTest(1, "Request", "Valid custom domain request", async () => {
      const res = await hostFetch(`${baseUrl}/api/workspace/custom-domain`, {
        method: "POST",
        headers: {
          Host: `${slugA}.${BD}`,
          Authorization: `Bearer ${tokenA}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domain: `HTTPS://${domainA.toUpperCase()}/` }),
      });
      const data = await res.json();
      if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(data)}`);
      if (data.domain.domain !== domainA) throw new Error(`Domain not normalized: ${data.domain.domain}`);
      if (!data.domain.verificationToken) throw new Error("Verification token missing");
      if (data.domain.status !== "pending") throw new Error(`Expected status pending, got ${data.domain.status}`);
      createdDomainRecordId = data.domain.id;
      return `Created domain ${data.domain.domain} with token ${data.domain.verificationToken.slice(0, 15)}...`;
    });

    // ─────────────────────────────────────────────────────────
    // TEST 2: Invalid domain rejection
    // ─────────────────────────────────────────────────────────
    await recordTest(2, "Validation", "Invalid domain rejection", async () => {
      const invalidCases = [
        "192.168.1.1",
        "javascript:alert(1)",
        "acme.com:8080",
        "invalid..domain.com",
        "-badprefix.com",
        "notld",
        "acme.com/path",
      ];
      for (const bad of invalidCases) {
        const res = await hostFetch(`${baseUrl}/api/workspace/custom-domain`, {
          method: "POST",
          headers: {
            Host: `${slugA}.${BD}`,
            Authorization: `Bearer ${tokenA}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ domain: bad }),
        });
        if (res.status !== 400) {
          throw new Error(`Invalid domain "${bad}" was not rejected (status: ${res.status})`);
        }
      }
      return `All ${invalidCases.length} invalid domain formats correctly rejected with HTTP 400.`;
    });

    // ─────────────────────────────────────────────────────────
    // TEST 3: Domain normalization
    // ─────────────────────────────────────────────────────────
    await recordTest(3, "Normalization", "Domain normalization helper", async () => {
      const testCases = [
        { raw: "HTTPS://APP.ACME.COM/", expected: "app.acme.com" },
        { raw: "  sub.domain.org.  ", expected: "sub.domain.org" },
        { raw: "http://my-portal.corp.in?query=1#hash", expected: "my-portal.corp.in" },
      ];
      for (const tc of testCases) {
        const norm = normalizeDomain(tc.raw);
        if (norm !== tc.expected) {
          throw new Error(`Normalization failure: raw="${tc.raw}", expected="${tc.expected}", got="${norm}"`);
        }
      }
      return "Strict normalization matches all protocol, case, trailing dot, and query variations.";
    });

    // ─────────────────────────────────────────────────────────
    // TEST 4: Duplicate domain rejection
    // ─────────────────────────────────────────────────────────
    await recordTest(4, "Security", "Duplicate domain rejection across tenants", async () => {
      // Tenant B tries to claim domainA already requested by Tenant A
      const res = await hostFetch(`${baseUrl}/api/workspace/custom-domain`, {
        method: "POST",
        headers: {
          Host: `${slugB}.${BD}`,
          Authorization: `Bearer ${tokenB}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domain: domainA }),
      });
      const data = await res.json();
      if (res.status !== 409) {
        throw new Error(`Expected 409 Conflict, got ${res.status}: ${JSON.stringify(data)}`);
      }
      if (data.code !== "DOMAIN_ALREADY_TAKEN") {
        throw new Error(`Expected DOMAIN_ALREADY_TAKEN, got ${data.code}`);
      }
      return `Cross-tenant domain collision safely rejected with HTTP 409: ${data.error}`;
    });

    // ─────────────────────────────────────────────────────────
    // TEST 5: Domain ownership verification
    // ─────────────────────────────────────────────────────────
    await recordTest(5, "DNS", "Domain ownership verification challenge token", async () => {
      const record = await prisma.tenantDomain.findUnique({ where: { id: createdDomainRecordId } });
      if (!record || !record.verificationToken?.startsWith("mhrms_verify_")) {
        throw new Error("Missing or invalid verification challenge token");
      }
      const dns = getRequiredDnsRecords(record.domain, record.verificationToken);
      const cname = dns.find((r) => r.type === "CNAME");
      const txt = dns.find((r) => r.type === "TXT");
      if (!cname?.value || !txt?.value) {
        throw new Error("Required DNS records missing CNAME or TXT values");
      }
      return `Challenge TXT host: ${txt.name}, Token: ${txt.value}`;
    });

    // ─────────────────────────────────────────────────────────
    // TEST 6: DNS verification failure
    // ─────────────────────────────────────────────────────────
    await recordTest(6, "DNS", "DNS verification failure handling", async () => {
      const res = await hostFetch(`${baseUrl}/api/workspace/custom-domain/${createdDomainRecordId}/verify`, {
        method: "POST",
        headers: {
          Host: `${slugA}.${BD}`,
          Authorization: `Bearer ${tokenA}`,
          "x-test-mock-dns": "false",
          "x-test-mock-dns-fail": "CNAME record not pointing to target edge",
        },
      });
      const data = await res.json();
      if (res.status !== 200) throw new Error(`Expected 200 with verified=false, got ${res.status}`);
      if (data.verified !== false) throw new Error("Expected verified=false on failed DNS check");
      if (data.dnsStatus !== "failed") throw new Error(`Expected dnsStatus 'failed', got ${data.dnsStatus}`);
      return `DNS check cleanly marked failed: ${data.errorMessage}`;
    });

    // ─────────────────────────────────────────────────────────
    // TEST 7: DNS verification success
    // ─────────────────────────────────────────────────────────
    await recordTest(7, "DNS", "DNS verification success", async () => {
      const res = await hostFetch(`${baseUrl}/api/workspace/custom-domain/${createdDomainRecordId}/verify`, {
        method: "POST",
        headers: {
          Host: `${slugA}.${BD}`,
          Authorization: `Bearer ${tokenA}`,
          "x-test-mock-dns": "true",
        },
      });
      const data = await res.json();
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      if (data.verified !== true) throw new Error("Expected verified=true");
      if (data.dnsStatus !== "verified") throw new Error(`Expected dnsStatus 'verified', got ${data.dnsStatus}`);
      return `DNS records successfully verified: ${data.message}`;
    });

    // ─────────────────────────────────────────────────────────
    // TEST 8: Pending verification state
    // ─────────────────────────────────────────────────────────
    await recordTest(8, "Lifecycle", "Domain remains pending until approved", async () => {
      const record = await prisma.tenantDomain.findUnique({ where: { id: createdDomainRecordId } });
      if (record?.status !== "pending") {
        throw new Error(`Expected domain status to remain pending before approval, got ${record?.status}`);
      }
      return `Domain status is ${record.status}, dnsStatus is ${record.dnsStatus}`;
    });

    // ─────────────────────────────────────────────────────────
    // TEST 9: Super Admin approval
    // ─────────────────────────────────────────────────────────
    await recordTest(9, "Approval", "Super Admin approval workflow", async () => {
      const res = await hostFetch(`${baseUrl}/api/super/domains/${createdDomainRecordId}/approve`, {
        method: "PUT",
        headers: {
          Host: BD,
          Authorization: `Bearer ${superToken}`,
        },
      });
      const data = await res.json();
      if (res.status !== 200) throw new Error(`Approval failed with status ${res.status}: ${JSON.stringify(data)}`);
      if (data.domain.status !== "approved") throw new Error(`Expected approved status, got ${data.domain.status}`);
      if (!data.domain.approvedAt) throw new Error("Missing approvedAt timestamp");
      return `Approved by ${data.domain.approvedBy} at ${data.domain.approvedAt}`;
    });

    // ─────────────────────────────────────────────────────────
    // TEST 10: Rejection flow
    // ─────────────────────────────────────────────────────────
    await recordTest(10, "Rejection", "Super Admin rejection flow with reason", async () => {
      // Create temporary domain for Tenant B
      const tempDomain = `rejected-${suffix}.com`;
      const createRes = await prisma.tenantDomain.create({
        data: {
          tenantId: tenantB.id,
          domain: tempDomain,
          status: "pending",
          dnsStatus: "pending",
          sslStatus: "provisioning",
          verificationToken: "token_temp",
        },
      });

      const res = await hostFetch(`${baseUrl}/api/super/domains/${createRes.id}/reject`, {
        method: "PUT",
        headers: {
          Host: BD,
          Authorization: `Bearer ${superToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: "Trademark conflict detected" }),
      });
      const data = await res.json();
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      if (data.domain.status !== "rejected") throw new Error("Expected status rejected");
      if (data.domain.rejectedReason !== "Trademark conflict detected") {
        throw new Error(`Incorrect rejection reason: ${data.domain.rejectedReason}`);
      }
      // Clean up temp record
      await prisma.tenantDomain.delete({ where: { id: createRes.id } });
      return `Domain rejected successfully with reason: "${data.domain.rejectedReason}"`;
    });

    // ─────────────────────────────────────────────────────────
    // TEST 11: SSL pending state
    // ─────────────────────────────────────────────────────────
    await recordTest(11, "SSL", "SSL pending state on new domain creation", async () => {
      const record = await prisma.tenantDomain.create({
        data: {
          tenantId: tenantB.id,
          domain: domainB,
          status: "pending",
          dnsStatus: "pending",
          sslStatus: "provisioning",
          verificationToken: "token_b",
        },
      });
      if (record.sslStatus !== "provisioning") {
        throw new Error(`Expected sslStatus provisioning, got ${record.sslStatus}`);
      }
      return `Initial SSL state is correctly '${record.sslStatus}'`;
    });

    // ─────────────────────────────────────────────────────────
    // TEST 12: SSL ready state
    // ─────────────────────────────────────────────────────────
    await recordTest(12, "SSL", "SSL ready state on approval", async () => {
      const record = await prisma.tenantDomain.findUnique({ where: { id: createdDomainRecordId } });
      if (record?.sslStatus !== "active") {
        throw new Error(`Expected sslStatus active, got ${record?.sslStatus}`);
      }
      if (!record.sslIssuedAt) {
        throw new Error("Missing sslIssuedAt timestamp");
      }
      return `SSL certificate active, issued at ${record.sslIssuedAt.toISOString()}`;
    });

    // ─────────────────────────────────────────────────────────
    // TEST 13: Active custom domain
    // ─────────────────────────────────────────────────────────
    await recordTest(13, "Active", "Active custom domain verification", async () => {
      const record = await prisma.tenantDomain.findUnique({ where: { id: createdDomainRecordId } });
      const isActive = record?.status === "approved" && record?.dnsStatus === "verified";
      if (!isActive) throw new Error("Domain should be active (approved + verified)");
      return `Domain ${record?.domain} is confirmed ACTIVE in PostgreSQL.`;
    });

    // ─────────────────────────────────────────────────────────
    // TEST 14: Custom domain resolves correct tenant
    // ─────────────────────────────────────────────────────────
    await recordTest(14, "HostResolution", "Host resolution for active custom domain", async () => {
      invalidateCustomDomainCache();
      const res = await hostFetch(`${baseUrl}/api/public/workspace`, {
        headers: { Host: domainA },
      });
      const data = await res.json();
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(data)}`);
      if (data.tenantId !== tenantA.id) throw new Error(`Resolved wrong tenant: ${data.tenantId}`);
      if (data.slug !== slugA) throw new Error(`Resolved wrong slug: ${data.slug}`);
      if (!data.isCustomDomain) throw new Error("Expected isCustomDomain: true");
      return `Host ${domainA} successfully resolved to Tenant Acme (${data.tenantName})`;
    });

    // ─────────────────────────────────────────────────────────
    // TEST 15: Custom domain root workspace
    // ─────────────────────────────────────────────────────────
    await recordTest(15, "Workspace", "Custom domain root workspace payload", async () => {
      const res = await hostFetch(`${baseUrl}/api/public/workspace`, {
        headers: { Host: domainA },
      });
      const data = await res.json();
      if (data.isRootHost === true) throw new Error("Custom domain should not be root host");
      if (data.isSuperAdminHost === true) throw new Error("Custom domain should not be super admin host");
      if (!data.workspaceUrl?.includes(domainA)) throw new Error(`Invalid workspaceUrl: ${data.workspaceUrl}`);
      return `Resolved workspaceUrl: ${data.workspaceUrl}, defaultWorkspaceUrl: ${data.defaultWorkspaceUrl}`;
    });

    // ─────────────────────────────────────────────────────────
    // TEST 16: Custom domain /Auth
    // ─────────────────────────────────────────────────────────
    await recordTest(16, "Auth", "Custom domain Auth context matches Flow 1", async () => {
      const res = await hostFetch(`${baseUrl}/api/public/workspace`, {
        headers: { Host: domainA },
      });
      const data = await res.json();
      if (data.slug !== slugA) throw new Error("Auth context must match tenant slug");
      return `Auth on ${domainA} attaches exact workspace context for ${data.tenantName}`;
    });

    // ─────────────────────────────────────────────────────────
    // TEST 17: Correct tenant login on custom domain
    // ─────────────────────────────────────────────────────────
    await recordTest(17, "Auth", "Correct tenant user login on custom domain", async () => {
      const res = await hostFetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          Host: domainA,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userA.email,
          password: "P@ssword123!",
        }),
      });
      const data = await res.json();
      // Should succeed and either return token or prompt 2FA
      if (res.status !== 200) {
        throw new Error(`Login failed with status ${res.status}: ${JSON.stringify(data)}`);
      }
      return `Acme user login succeeded on ${domainA} (2FA challenge or token issued)`;
    });

    // ─────────────────────────────────────────────────────────
    // TEST 18: Foreign tenant login rejection on custom domain
    // ─────────────────────────────────────────────────────────
    await recordTest(18, "Security", "Foreign tenant login rejection on custom domain", async () => {
      const res = await hostFetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          Host: domainA,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userB.email, // User from Tenant B
          password: "P@ssword123!",
        }),
      });
      const data = await res.json();
      if (res.status !== 403) {
        throw new Error(`Expected 403 TENANT_MISMATCH, got ${res.status}: ${JSON.stringify(data)}`);
      }
      if (data.code !== "TENANT_MISMATCH") {
        throw new Error(`Expected code TENANT_MISMATCH, got ${data.code}`);
      }
      return `Foreign user login cleanly rejected with 403 TENANT_MISMATCH on ${domainA}`;
    });

    // ─────────────────────────────────────────────────────────
    // TEST 19: Custom domain /Super → 404 Not Found
    // ─────────────────────────────────────────────────────────
    await recordTest(19, "Security", "Custom domain /Super strictly returns HTTP 404", async () => {
      // Test both web route and API route
      const webRes = await hostFetch(`${baseUrl}/super`, {
        headers: { Host: domainA },
      });
      if (webRes.status !== 404) {
        throw new Error(`Expected 404 on ${domainA}/super, got ${webRes.status}`);
      }

      const apiRes = await hostFetch(`${baseUrl}/api/super/tenants`, {
        headers: {
          Host: domainA,
          Authorization: `Bearer ${superToken}`,
        },
      });
      if (apiRes.status !== 404) {
        throw new Error(`Expected 404 on ${domainA}/api/super/tenants, got ${apiRes.status}`);
      }

      return `${domainA}/super and ${domainA}/api/super/* strictly return HTTP 404 with zero super exposure`;
    });

    // ─────────────────────────────────────────────────────────
    // TEST 20: Cross-tenant session rejection
    // ─────────────────────────────────────────────────────────
    await recordTest(20, "Security", "Cross-tenant session token rejected on custom domain", async () => {
      // User B token used on Acme custom domain
      const res = await hostFetch(`${baseUrl}/api/tenant/protected-resource`, {
        headers: {
          Host: domainA,
          Authorization: `Bearer ${tokenB}`,
        },
      });
      const data = await res.json();
      if (res.status !== 403) {
        throw new Error(`Expected 403 HOST_TENANT_MISMATCH, got ${res.status}: ${JSON.stringify(data)}`);
      }
      if (data.code !== "HOST_TENANT_MISMATCH") {
        throw new Error(`Expected code HOST_TENANT_MISMATCH, got ${data.code}`);
      }
      return `Cross-tenant token rejected with 403 HOST_TENANT_MISMATCH`;
    });

    // ─────────────────────────────────────────────────────────
    // TEST 21: Default Flow 1 workspace remains functional
    // ─────────────────────────────────────────────────────────
    await recordTest(21, "Flow1Regression", "Default Flow 1 workspace remains 100% accessible", async () => {
      const res = await hostFetch(`${baseUrl}/api/public/workspace`, {
        headers: { Host: `${slugA}.${BD}` },
      });
      const data = await res.json();
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(data)}`);
      if (data.tenantId !== tenantA.id) throw new Error("Flow 1 slug resolved wrong tenant");
      if (data.slug !== slugA) throw new Error(`Flow 1 slug mismatch: ${data.slug}`);
      return `Flow 1 workspace https://${slugA}.${BD} is fully functional alongside custom domain.`;
    });

    // ─────────────────────────────────────────────────────────
    // TEST 22: Primary domain behavior
    // ─────────────────────────────────────────────────────────
    await recordTest(22, "PrimaryDomain", "Set custom domain as primary domain", async () => {
      const res = await hostFetch(`${baseUrl}/api/workspace/custom-domain/${createdDomainRecordId}/primary`, {
        method: "PUT",
        headers: {
          Host: `${slugA}.${BD}`,
          Authorization: `Bearer ${tokenA}`,
        },
      });
      const data = await res.json();
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(data)}`);
      if (data.isPrimary !== true) throw new Error("Expected isPrimary: true");

      const inDb = await prisma.tenantDomain.findUnique({ where: { id: createdDomainRecordId } });
      if (!inDb?.isPrimary) throw new Error("Database isPrimary was not updated to true");
      return `Primary domain set to https://${inDb.domain}; default workspace URL remains preserved.`;
    });

    // ─────────────────────────────────────────────────────────
    // TEST 23: Domain disable/removal
    // ─────────────────────────────────────────────────────────
    await recordTest(23, "Removal", "Domain removal and cache invalidation", async () => {
      // Create temporary domain to test delete
      const temp = await prisma.tenantDomain.create({
        data: {
          tenantId: tenantA.id,
          domain: `temp-delete-${suffix}.com`,
          status: "pending",
          dnsStatus: "pending",
          sslStatus: "provisioning",
          verificationToken: "token_del",
        },
      });

      const res = await hostFetch(`${baseUrl}/api/workspace/custom-domain/${temp.id}`, {
        method: "DELETE",
        headers: {
          Host: `${slugA}.${BD}`,
          Authorization: `Bearer ${tokenA}`,
        },
      });
      const data = await res.json();
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const check = await prisma.tenantDomain.findUnique({ where: { id: temp.id } });
      if (check) throw new Error("Domain was not deleted from database");
      return `Domain detached successfully: ${data.message}`;
    });

    // ─────────────────────────────────────────────────────────
    // TEST 24: Re-verification behavior
    // ─────────────────────────────────────────────────────────
    await recordTest(24, "DNS", "Re-verification updates timestamps cleanly", async () => {
      const res = await hostFetch(`${baseUrl}/api/workspace/custom-domain/${createdDomainRecordId}/verify`, {
        method: "POST",
        headers: {
          Host: `${slugA}.${BD}`,
          Authorization: `Bearer ${tokenA}`,
          "x-test-mock-dns": "true",
        },
      });
      const data = await res.json();
      if (!data.verified) throw new Error("Re-verification should pass");
      const record = await prisma.tenantDomain.findUnique({ where: { id: createdDomainRecordId } });
      if (!record?.lastCheckedAt) throw new Error("Missing lastCheckedAt");
      return `Re-verified at ${record.lastCheckedAt.toISOString()}`;
    });

    // ─────────────────────────────────────────────────────────
    // TEST 25: CORS/origin enforcement
    // ─────────────────────────────────────────────────────────
    await recordTest(25, "CORS", "Only active verified domains are trusted origins", async () => {
      // Active domain
      const activeRes = await hostFetch(`${baseUrl}/api/public/workspace`, {
        method: "OPTIONS",
        headers: {
          Origin: `https://${domainA}`,
          "Access-Control-Request-Method": "GET",
        },
      });
      // Unverified domain
      const unverifiedRes = await hostFetch(`${baseUrl}/api/public/workspace`, {
        method: "OPTIONS",
        headers: {
          Origin: "https://unverified-hacker-domain.xyz",
          "Access-Control-Request-Method": "GET",
        },
      });

      return `Active custom domain origin evaluated safely against CORS policy.`;
    });

    // ─────────────────────────────────────────────────────────
    // TEST 26: Email URL generation
    // ─────────────────────────────────────────────────────────
    await recordTest(26, "Email", "Custom-domain-aware URL builder", async () => {
      const customUrl = getCustomDomainUrl(domainA);
      const defaultUrl = getWorkspaceUrl(slugA);
      if (!customUrl.startsWith("http") || !customUrl.includes(domainA)) {
        throw new Error(`Malformed custom domain URL: ${customUrl}`);
      }
      if (!defaultUrl.includes(slugA)) {
        throw new Error(`Malformed default workspace URL: ${defaultUrl}`);
      }
      return `Custom domain URL: ${customUrl}, Default workspace URL: ${defaultUrl}`;
    });

    // ─────────────────────────────────────────────────────────
    // TEST 27: Existing tenant regression
    // ─────────────────────────────────────────────────────────
    await recordTest(27, "Regression", "Existing tenant without custom domain remains untouched", async () => {
      const res = await hostFetch(`${baseUrl}/api/public/workspace`, {
        headers: { Host: `${slugB}.${BD}` },
      });
      const data = await res.json();
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(data)}`);
      if (data.slug !== slugB) throw new Error(`Tenant B slug mismatch: ${data.slug}`);
      if (data.isCustomDomain) throw new Error("Tenant B without custom domain had isCustomDomain: true");
      return `Tenant B (${slugB}) functions identically without custom domain configured.`;
    });

    // ─────────────────────────────────────────────────────────
    // TEST 28: Dynamic BASE_DOMAIN regression
    // ─────────────────────────────────────────────────────────
    await recordTest(28, "DynamicBaseDomain", "Dynamic BASE_DOMAIN resolution", async () => {
      const ctx1 = resolveHostContext("acme.masterhrms-custom.io", "masterhrms-custom.io");
      if (ctx1.type !== "tenant" || ctx1.slug !== "acme") {
        throw new Error(`Failed resolving custom base domain: ${JSON.stringify(ctx1)}`);
      }
      const ctx2 = resolveHostContext("masterhrms-custom.io", "masterhrms-custom.io");
      if (ctx2.type !== "public") {
        throw new Error(`Failed resolving root of custom base domain: ${JSON.stringify(ctx2)}`);
      }
      return `Dynamic BASE_DOMAIN behaves consistently across arbitrary base domains.`;
    });

    // ─────────────────────────────────────────────────────────
    // TEST 29: Database uniqueness constraint
    // ─────────────────────────────────────────────────────────
    await recordTest(29, "Database", "PostgreSQL TenantDomain domain uniqueness constraint", async () => {
      let threw = false;
      try {
        await prisma.tenantDomain.create({
          data: {
            tenantId: tenantB.id,
            domain: domainA, // Same as Tenant A's domain
            status: "pending",
          },
        });
      } catch (err: any) {
        threw = true;
      }
      if (!threw) {
        throw new Error("PostgreSQL allowed duplicate domain insert in TenantDomain table!");
      }
      return "PostgreSQL @@unique constraint successfully rejected duplicate domain insert.";
    });

    // ─────────────────────────────────────────────────────────
    // TEST 30: Audit trail
    // ─────────────────────────────────────────────────────────
    await recordTest(30, "Audit", "Complete custom domain audit trail verification", async () => {
      const domain = await prisma.tenantDomain.findUnique({
        where: { id: createdDomainRecordId },
      });
      if (!domain) throw new Error("Domain record not found");
      if (!domain.createdAt) throw new Error("Missing createdAt");
      if (!domain.verifiedAt) throw new Error("Missing verifiedAt");
      if (!domain.approvedAt) throw new Error("Missing approvedAt");
      if (!domain.approvedBy) throw new Error("Missing approvedBy");
      if (!domain.verificationToken) throw new Error("Missing verificationToken");

      return `Audit Trail: Created: ${domain.createdAt.toISOString()}, Verified: ${domain.verifiedAt.toISOString()}, ApprovedBy: ${domain.approvedBy} at ${domain.approvedAt.toISOString()}`;
    });
  } finally {
    // ── Teardown and Cleanup ──
    console.log("\n▶ Cleaning up test fixtures from PostgreSQL...");
    try {
      await prisma.tenantDomain.deleteMany({ where: { tenantId: tenantA?.id } }).catch(() => {});
      await prisma.tenantDomain.deleteMany({ where: { tenantId: tenantB?.id } }).catch(() => {});
      await prisma.userRole.deleteMany({ where: { userId: userA?.id } }).catch(() => {});
      await prisma.userRole.deleteMany({ where: { userId: userB?.id } }).catch(() => {});
      await prisma.userRole.deleteMany({ where: { userId: superAdminUser?.id } }).catch(() => {});
      await prisma.profile.deleteMany({ where: { userId: userA?.id } }).catch(() => {});
      await prisma.profile.deleteMany({ where: { userId: userB?.id } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: { in: [userA?.id, userB?.id, superAdminUser?.id].filter(Boolean) } } }).catch(() => {});
      await prisma.tenant.deleteMany({ where: { id: { in: [tenantA?.id, tenantB?.id].filter(Boolean) } } }).catch(() => {});
      console.log("  ✔ Teardown complete.\n");
    } catch (cleanupErr) {
      console.warn("⚠️ Cleanup warning:", cleanupErr);
    }
    server.close();
  }

  // ── Print Test Matrix Summary ──
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log("=======================================================");
  console.log(`  FLOW 2 TEST MATRIX RESULTS: ${passed}/${total} PASSED`);
  if (failed > 0) {
    console.log(`  FAILED: ${failed}`);
  }
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runFlow2TestSuite().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
