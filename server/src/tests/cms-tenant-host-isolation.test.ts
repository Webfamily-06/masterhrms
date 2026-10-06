import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import express from "express";
import { workspaceHostMiddleware } from "../middleware/workspace-host.middleware";
import { rawPrisma as prisma } from "../prisma";
import { setCachedCustomDomain, invalidateWorkspaceCache } from "../lib/workspace-host";

describe("CMS Tenant-Host Isolation Acceptance Test Suite", () => {
  let server: http.Server;
  let port: number;
  let baseUrl: string;

  const testSlug = "acme-cms-test";
  const testTenantId = "tenant-acme-cms-isolation";
  const customDomain = "verified-custom.corp";

  beforeAll(async () => {
    // Clean up
    await prisma.tenantDomain.deleteMany({ where: { domain: customDomain } });
    await prisma.tenant.deleteMany({ where: { id: testTenantId } });

    // Create test tenant
    await prisma.tenant.create({
      data: {
        id: testTenantId,
        name: "Acme CMS Isolation Tenant",
        slug: testSlug,
        timezone: "Asia/Kolkata",
      },
    });

    // Create verified custom domain
    await prisma.tenantDomain.create({
      data: {
        id: "domain-acme-cms-custom",
        tenantId: testTenantId,
        domain: customDomain,
        status: "approved",
        dnsStatus: "verified",
        sslStatus: "active",
      },
    });

    // Pre-cache custom domain for instant resolution
    setCachedCustomDomain(customDomain, {
      id: "domain-acme-cms-custom",
      domain: customDomain,
      tenantId: testTenantId,
      tenantSlug: testSlug,
      tenantName: "Acme CMS Isolation Tenant",
      status: "approved",
      dnsStatus: "verified",
      sslStatus: "active",
      isPrimary: true,
    });

    const app = express();
    app.use(express.json());
    app.use(workspaceHostMiddleware);

    // Mock CMS page and API routes
    app.get("/cms", (req, res) => {
      res.json({ page: "cms-index", host: req.headers.host });
    });
    app.get("/cms/*", (req, res) => {
      res.json({ page: "cms-wildcard", path: req.path, host: req.headers.host });
    });
    app.get("/api/cms/pages", (req, res) => {
      res.json({ pages: [{ slug: "overview", title: "Overview" }] });
    });
    app.get("/auth", (req, res) => {
      res.json({ page: "workspace-auth", host: req.headers.host });
    });

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        port = addr.port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await prisma.tenantDomain.deleteMany({ where: { domain: customDomain } });
    await prisma.tenant.deleteMany({ where: { id: testTenantId } });
    invalidateWorkspaceCache();
  });

  function rawRequest(
    path: string,
    hostHeader: string
  ): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path,
          method: "GET",
          headers: {
            Host: hostHeader,
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            let body = data;
            try {
              body = JSON.parse(data);
            } catch {}
            resolve({
              status: res.statusCode || 0,
              headers: res.headers,
              body,
            });
          });
        }
      );
      req.on("error", reject);
      req.end();
    });
  }

  // Acceptance Criterion 1: localhost/cms (root host) -> CMS page renders normally
  it("Criterion 1: localhost/cms (root host) renders CMS normally", async () => {
    const res = await rawRequest("/cms", "localhost");
    expect(res.status).toBe(200);
    expect(res.body.page).toBe("cms-index");
  });

  // Acceptance Criterion 2: acme.localhost/cms -> redirected to acme.localhost/auth
  it("Criterion 2: acme.localhost/cms is 301 redirected to workspace auth", async () => {
    const res = await rawRequest("/cms", `${testSlug}.localhost:${port}`);
    expect(res.status).toBe(301);
    expect(res.headers.location).toBeDefined();
    expect(res.headers.location).toContain(`${testSlug}.localhost`);
    expect(res.headers.location).toContain("/auth");
  });

  // Acceptance Criterion 3: acme.localhost/cms/pricing -> redirected to acme.localhost/auth
  it("Criterion 3: acme.localhost/cms/pricing is 301 redirected to workspace auth", async () => {
    const res = await rawRequest("/cms/pricing", `${testSlug}.localhost:${port}`);
    expect(res.status).toBe(301);
    expect(res.headers.location).toBeDefined();
    expect(res.headers.location).toContain(`${testSlug}.localhost`);
    expect(res.headers.location).toContain("/auth");
  });

  // Acceptance Criterion 4: Verified custom domain /cms -> redirected to that host's /auth
  it("Criterion 4: verified custom domain /cms is 301 redirected to custom domain /auth", async () => {
    const res = await rawRequest("/cms", `${customDomain}:${port}`);
    expect(res.status).toBe(301);
    expect(res.headers.location).toBeDefined();
    expect(res.headers.location).toContain(customDomain);
    expect(res.headers.location).toContain("/auth");
  });

  // Acceptance Criterion 5: GET {subdomain}/api/cms/pages -> 404 NOT_FOUND
  it("Criterion 5: GET {subdomain}/api/cms/pages returns 404 NOT_FOUND", async () => {
    const res = await rawRequest("/api/cms/pages", `${testSlug}.localhost:${port}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: "Not Found",
      code: "NOT_FOUND",
    });
  });

  // Acceptance Criterion 6: Root-domain Super Admin and super host /cms flow unchanged
  it("Criterion 6: super.localhost/cms and root host /api/cms/pages remain accessible", async () => {
    const resSuper = await rawRequest("/cms", "super.localhost");
    expect(resSuper.status).toBe(200);
    expect(resSuper.body.page).toBe("cms-index");

    const resApiRoot = await rawRequest("/api/cms/pages", "localhost");
    expect(resApiRoot.status).toBe(200);
    expect(resApiRoot.body.pages).toBeDefined();
  });
});
