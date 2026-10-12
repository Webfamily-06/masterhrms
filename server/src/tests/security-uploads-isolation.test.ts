import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { rawPrisma } from "../prisma";
import { generateToken } from "../lib/jwt";
import { getUploadsRoot } from "../services/media/media.service";
import { uploadsSecurityMiddleware } from "../middleware/uploads-security.middleware";

describe("Security Triage: /uploads Static File Isolation & Authorization Guard", { timeout: 20000 }, () => {
  let server: http.Server;
  let baseUrl: string;

  const timestamp = Date.now();
  const tenantAId = `sec-tenant-a-${timestamp}`;
  const tenantBId = `sec-tenant-b-${timestamp}`;

  let superUser: any;
  let tenantAUser: any;
  let tenantBUser: any;
  let superToken: string;
  let tenantAToken: string;
  let tenantBToken: string;

  const uploadsRoot = getUploadsRoot();
  const publicBrandingDir = path.join(uploadsRoot, "system", "branding");
  const privateDocDir = path.join(uploadsRoot, "documents");
  const testPublicFilename = `test-public-logo-${timestamp}.png`;
  const testPrivateFilename = `test-private-contract-${timestamp}.pdf`;

  beforeAll(async () => {
    // Create isolated express test app matching index.ts configuration
    const testApp = express();
    testApp.use(express.json());
    testApp.use(
      "/uploads",
      uploadsSecurityMiddleware,
      express.static(uploadsRoot, {
        maxAge: "7d",
        etag: true,
        lastModified: true,
        fallthrough: false,
      })
    );

    // Start ephemeral server
    server = http.createServer(testApp);
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    // Ensure test directories exist
    fs.mkdirSync(publicBrandingDir, { recursive: true });
    fs.mkdirSync(privateDocDir, { recursive: true });

    // Create physical dummy files
    fs.writeFileSync(path.join(publicBrandingDir, testPublicFilename), "PUBLIC_PNG_DATA");
    fs.writeFileSync(path.join(privateDocDir, testPrivateFilename), "%PDF-1.4 TEST CONTRACT");

    // 1. Create Test Tenants
    await rawPrisma.tenant.create({
      data: {
        id: tenantAId,
        name: `Sec Tenant A ${timestamp}`,
        slug: `sec-a-${timestamp}`,
      },
    });

    await rawPrisma.tenant.create({
      data: {
        id: tenantBId,
        name: `Sec Tenant B ${timestamp}`,
        slug: `sec-b-${timestamp}`,
      },
    });

    // 2. Create Super Admin User
    superUser = await rawPrisma.user.create({
      data: {
        email: `sec-super-${timestamp}@masterhrms.com`,
        passwordHash: "hash123",
        roles: { create: [{ role: "super_admin" }] },
      },
    });

    // 3. Create Tenant A User
    tenantAUser = await rawPrisma.user.create({
      data: {
        email: `sec-user-a-${timestamp}@corpa.com`,
        passwordHash: "hash123",
        roles: { create: [{ role: "hr_admin", tenantId: tenantAId }] },
        profile: {
          create: {
            tenantId: tenantAId,
            fullName: "Alice Sec Admin",
          },
        },
      },
    });

    // 4. Create Tenant B User
    tenantBUser = await rawPrisma.user.create({
      data: {
        email: `sec-user-b-${timestamp}@corpb.com`,
        passwordHash: "hash123",
        roles: { create: [{ role: "hr_admin", tenantId: tenantBId }] },
        profile: {
          create: {
            tenantId: tenantBId,
            fullName: "Bob Sec Admin",
          },
        },
      },
    });

    // 5. Register private document under Tenant A in MediaFile table
    await rawPrisma.mediaFile.create({
      data: {
        id: `media-sec-doc-${timestamp}`,
        tenantId: tenantAId,
        storageDisk: "LOCAL",
        filePath: `documents/${testPrivateFilename}`,
        url: `/uploads/documents/${testPrivateFilename}`,
        fileName: "confidential-contract.pdf",
        mimeType: "application/pdf",
        fileSize: 24,
        checksumSha: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        folder: "documents",
        tags: ["confidential"],
        uploadedBy: tenantAUser.id,
      },
    });

    // 6. Generate JWT tokens
    superToken = generateToken({
      userId: superUser.id,
      email: superUser.email,
      roles: ["super_admin"],
    });

    tenantAToken = generateToken({
      userId: tenantAUser.id,
      email: tenantAUser.email,
      tenantId: tenantAId,
      roles: ["hr_admin"],
    });

    tenantBToken = generateToken({
      userId: tenantBUser.id,
      email: tenantBUser.email,
      tenantId: tenantBId,
      roles: ["hr_admin"],
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }

    // Clean up dummy test files
    try {
      fs.unlinkSync(path.join(publicBrandingDir, testPublicFilename));
    } catch {}
    try {
      fs.unlinkSync(path.join(privateDocDir, testPrivateFilename));
    } catch {}

    // Clean up DB records
    try {
      await rawPrisma.mediaFile.deleteMany({
        where: { filePath: `documents/${testPrivateFilename}` },
      });
      await rawPrisma.user.deleteMany({
        where: { id: { in: [superUser?.id, tenantAUser?.id, tenantBUser?.id].filter(Boolean) } },
      });
      await rawPrisma.tenant.deleteMany({
        where: { id: { in: [tenantAId, tenantBId] } },
      });
    } catch {}
  });

  it("1. Public branding assets should be accessible without authentication", async () => {
    const res = await fetch(`${baseUrl}/uploads/system/branding/${testPublicFilename}`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe("PUBLIC_PNG_DATA");
  });

  it("2. Non-public / document uploads should be rejected with 401 when unauthenticated", async () => {
    const res = await fetch(`${baseUrl}/uploads/documents/${testPrivateFilename}`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/Authentication required/i);
    expect(body.code).toBe("UPLOAD_AUTH_REQUIRED");
  });

  it("3. Cross-tenant access: Tenant B cannot access Tenant A's private document (HTTP 403)", async () => {
    const res = await fetch(`${baseUrl}/uploads/documents/${testPrivateFilename}`, {
      headers: { Authorization: `Bearer ${tenantBToken}` },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("FORBIDDEN_WORKSPACE_ASSET");
  });

  it("4. Authorized tenant access: Tenant A can retrieve their own private document (HTTP 200)", async () => {
    const res = await fetch(`${baseUrl}/uploads/documents/${testPrivateFilename}`, {
      headers: { Authorization: `Bearer ${tenantAToken}` },
    });

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("%PDF-1.4 TEST CONTRACT");
  });

  it("5. Super Admin access: Super Admin can retrieve tenant documents (HTTP 200)", async () => {
    const res = await fetch(`${baseUrl}/uploads/documents/${testPrivateFilename}`, {
      headers: { Authorization: `Bearer ${superToken}` },
    });

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("%PDF-1.4 TEST CONTRACT");
  });

  it("6. Path traversal attempts should be rejected with HTTP 400 or blocked", async () => {
    const res = await fetch(`${baseUrl}/uploads/..%2Fpackage.json`);
    expect([400, 403, 404]).toContain(res.status);
  });
});
