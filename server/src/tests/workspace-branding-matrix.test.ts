import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resolveBrandingContext } from "../services/branding/branding-resolver.service";
import express from "express";
import http from "http";
import { appConfigRouter } from "../routes/app-config.routes";
import { workspaceHostMiddleware } from "../middleware/workspace-host.middleware";
import { rawPrisma, prisma } from "../prisma";

describe("WORKSPACE BRANDING MATRIX: FINAL AUTHORITY", () => {
  const db = rawPrisma || prisma;
  let testApp: express.Application;
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    testApp = express();
    testApp.use(express.json());
    testApp.use(workspaceHostMiddleware as any);
    testApp.use("/api/v1/public", appConfigRouter);
    testApp.use("/api/public", appConfigRouter);
    testApp.use("/api", appConfigRouter);

    await new Promise<void>((resolve) => {
      server = testApp.listen(0, "127.0.0.1", () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe("Unit: resolveBrandingContext Pure Resolution", () => {
    it("Resolves PLATFORM for localhost:5173 /login", () => {
      const res = resolveBrandingContext({
        host: "localhost:5173",
        pathname: "/login",
      });
      expect(res.scope).toBe("PLATFORM");
      expect(res.context).toBe("PLATFORM");
      expect(res.tenantId).toBeNull();
    });

    it("Resolves PLATFORM for localhost:5173 /super", () => {
      const res = resolveBrandingContext({
        host: "localhost:5173",
        pathname: "/super",
      });
      expect(res.scope).toBe("PLATFORM");
      expect(res.context).toBe("PLATFORM");
      expect(res.tenantId).toBeNull();
    });

    it("Resolves PLATFORM for localhost:5173 platform pages", () => {
      const res = resolveBrandingContext({
        host: "localhost:5173",
        pathname: "/pricing",
      });
      expect(res.scope).toBe("PLATFORM");
      expect(res.context).toBe("PLATFORM");
    });

    it("Resolves TENANT for master.localhost:5173 /login", () => {
      const res = resolveBrandingContext({
        host: "master.localhost:5173",
        pathname: "/login",
        tenantId: "tenant-default-001",
        isTenantHost: true,
      });
      expect(res.scope).toBe("TENANT");
      expect(res.context).toBe("TENANT_LOGIN");
      expect(res.tenantId).toBe("tenant-default-001");
    });

    it("Resolves PLATFORM for master.localhost:5173 /cms/*", () => {
      const res1 = resolveBrandingContext({
        host: "master.localhost:5173",
        pathname: "/cms",
        tenantId: "tenant-default-001",
        isTenantHost: true,
      });
      expect(res1.scope).toBe("PLATFORM");
      expect(res1.context).toBe("CMS");
      expect(res1.tenantId).toBe("tenant-default-001");

      const res2 = resolveBrandingContext({
        host: "master.localhost:5173",
        pathname: "/cms/pages/about",
        tenantId: "tenant-default-001",
        isTenantHost: true,
      });
      expect(res2.scope).toBe("PLATFORM");
      expect(res2.context).toBe("CMS");
    });

    it("Resolves TENANT for master.localhost:5173 /dashboard", () => {
      const res = resolveBrandingContext({
        host: "master.localhost:5173",
        pathname: "/dashboard",
        tenantId: "tenant-default-001",
        isTenantHost: true,
      });
      expect(res.scope).toBe("TENANT");
      expect(res.context).toBe("TENANT_APP");
      expect(res.tenantId).toBe("tenant-default-001");
    });

    it("Resolves TENANT for master.localhost:5173 /employees", () => {
      const res = resolveBrandingContext({
        host: "master.localhost:5173",
        pathname: "/employees",
        tenantId: "tenant-default-001",
        isTenantHost: true,
      });
      expect(res.scope).toBe("TENANT");
      expect(res.context).toBe("TENANT_APP");
    });

    it("Resolves TENANT for master.localhost:5173 /attendance", () => {
      const res = resolveBrandingContext({
        host: "master.localhost:5173",
        pathname: "/attendance",
        tenantId: "tenant-default-001",
        isTenantHost: true,
      });
      expect(res.scope).toBe("TENANT");
      expect(res.context).toBe("TENANT_APP");
    });

    it("Resolves TENANT for master.localhost:5173 /payroll", () => {
      const res = resolveBrandingContext({
        host: "master.localhost:5173",
        pathname: "/payroll",
        tenantId: "tenant-default-001",
        isTenantHost: true,
      });
      expect(res.scope).toBe("TENANT");
      expect(res.context).toBe("TENANT_APP");
    });
  });

  describe("Integration: /api/v1/public/app-config HTTP API", () => {
    it("1. http://localhost:5173/login -> PLATFORM branding", async () => {
      const resp = await fetch(`${baseUrl}/api/v1/public/app-config?pathname=/login`, {
        headers: { Host: "localhost:5173" },
      });
      expect(resp.status).toBe(200);
      const data = await resp.json();
      expect(data.scope).toBe("PLATFORM");
      expect(data.context).toBe("PLATFORM");
      expect(data.isWhiteLabeled).toBe(false);
      expect(data.tenantId).toBeNull();
    });

    it("2. http://localhost:5173/super -> PLATFORM branding", async () => {
      const resp = await fetch(`${baseUrl}/api/v1/public/app-config?pathname=/super`, {
        headers: { Host: "localhost:5173" },
      });
      expect(resp.status).toBe(200);
      const data = await resp.json();
      expect(data.scope).toBe("PLATFORM");
      expect(data.context).toBe("PLATFORM");
      expect(data.isWhiteLabeled).toBe(false);
    });

    it("3. http://master.localhost:5173/login -> TENANT branding", async () => {
      const resp = await fetch(`${baseUrl}/api/v1/public/app-config?pathname=/login`, {
        headers: {
          Host: "master.localhost:5173",
          "x-forwarded-host": "master.localhost:5173",
        },
      });
      expect(resp.status).toBe(200);
      const data = await resp.json();
      expect(data.scope).toBe("TENANT");
      expect(data.context).toBe("TENANT_LOGIN");
      expect(data.tenantId).toBeDefined();
      expect(data.isWhiteLabeled).toBe(true);
    });

    it("4. http://master.localhost:5173/cms/... -> PLATFORM branding", async () => {
      const resp = await fetch(`${baseUrl}/api/v1/public/app-config?pathname=/cms/overview`, {
        headers: {
          Host: "master.localhost:5173",
          "x-forwarded-host": "master.localhost:5173",
        },
      });
      expect(resp.status).toBe(200);
      const data = await resp.json();
      expect(data.scope).toBe("PLATFORM");
      expect(data.context).toBe("CMS");
      expect(data.isWhiteLabeled).toBe(false);
      // Retains tenant context awareness for content tenancy while branding scope is PLATFORM
      expect(data.tenantId).toBeDefined();
    });

    it("5. http://master.localhost:5173/dashboard -> TENANT branding", async () => {
      const resp = await fetch(`${baseUrl}/api/v1/public/app-config?pathname=/dashboard`, {
        headers: {
          Host: "master.localhost:5173",
          "x-forwarded-host": "master.localhost:5173",
        },
      });
      expect(resp.status).toBe(200);
      const data = await resp.json();
      expect(data.scope).toBe("TENANT");
      expect(data.context).toBe("TENANT_APP");
      expect(data.isWhiteLabeled).toBe(true);
    });

    it("6. http://master.localhost:5173/employees -> TENANT branding", async () => {
      const resp = await fetch(`${baseUrl}/api/v1/public/app-config?pathname=/employees`, {
        headers: {
          Host: "master.localhost:5173",
          "x-forwarded-host": "master.localhost:5173",
        },
      });
      expect(resp.status).toBe(200);
      const data = await resp.json();
      expect(data.scope).toBe("TENANT");
      expect(data.context).toBe("TENANT_APP");
    });

    it("7. http://master.localhost:5173/attendance -> TENANT branding", async () => {
      const resp = await fetch(`${baseUrl}/api/v1/public/app-config?pathname=/attendance`, {
        headers: {
          Host: "master.localhost:5173",
          "x-forwarded-host": "master.localhost:5173",
        },
      });
      expect(resp.status).toBe(200);
      const data = await resp.json();
      expect(data.scope).toBe("TENANT");
      expect(data.context).toBe("TENANT_APP");
    });

    it("8. http://master.localhost:5173/payroll -> TENANT branding", async () => {
      const resp = await fetch(`${baseUrl}/api/v1/public/app-config?pathname=/payroll`, {
        headers: {
          Host: "master.localhost:5173",
          "x-forwarded-host": "master.localhost:5173",
        },
      });
      expect(resp.status).toBe(200);
      const data = await resp.json();
      expect(data.scope).toBe("TENANT");
      expect(data.context).toBe("TENANT_APP");
    });
  });
});
