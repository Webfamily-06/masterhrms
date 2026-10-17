import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import http from "http";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { mediaRouter } from "../routes/media.routes";
import { documentsRouter } from "../routes/documents.routes";
import { platformFoundationRouter } from "../routes/platform-foundation.routes";
import { uploadsSecurityMiddleware } from "../middleware/uploads-security.middleware";
import { generateToken } from "../lib/jwt";
import { MediaService, getUploadsRoot } from "../services/media/media.service";
import { EmployeeService } from "../services/employee.service";
import { runWithTenantContext, TenantContext } from "../context/tenant-context";

const rawPrisma = new PrismaClient();

function executeAsTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
  const ctx: TenantContext = {
    tenantId,
    userId: "admin-actor-upload",
    roles: ["hr_admin"],
    status: "ACTIVE",
    tenancyStrategy: "SHARED_SCHEMA",
    db: rawPrisma,
  };
  return runWithTenantContext(ctx, fn);
}

describe("Media & Employee File Upload Backend Security & Persistence Suite", () => {
  let server: http.Server;
  let baseUrl: string;
  let tenantA: string;
  let tenantB: string;
  let tokenA: string;
  let tokenB: string;
  let userAId: string;
  let userBId: string;
  let employeeAId: string;

  // Setup isolated Express test app
  const app = express();
  app.use(express.json());
  app.use("/uploads", uploadsSecurityMiddleware, express.static(getUploadsRoot()));
  app.use("/api/v1/media", mediaRouter);
  app.use("/api/media", mediaRouter);
  app.use("/api/documents", documentsRouter);
  app.use("/api/v1", platformFoundationRouter);
  app.use("/api", platformFoundationRouter);

  // Valid 1x1 PNG Buffer
  const validPngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );

  // Valid minimal PDF Buffer
  const validPdfBuffer = Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000108 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n167\n%%EOF"
  );

  // Executable / malicious buffer (MZ header: 4D 5A in hex)
  const maliciousExeBuffer = Buffer.from("4D5A900003000000040000ffff0000b8000000", "hex");

  beforeAll(async () => {
    // 1. Create Tenant A
    const tA = await rawPrisma.tenant.create({
      data: {
        name: "Upload Test Tenant A",
        slug: `upload-a-${Date.now()}`,
      },
    });
    tenantA = tA.id;

    // 2. Create Tenant B
    const tB = await rawPrisma.tenant.create({
      data: {
        name: "Upload Test Tenant B",
        slug: `upload-b-${Date.now()}`,
      },
    });
    tenantB = tB.id;

    // 3. Create User in Tenant A with AppRole 'hr_admin'
    const uA = await rawPrisma.user.create({
      data: {
        email: `hr-admin-a-${Date.now()}@tenant-a.com`,
        passwordHash: "dummy-hash",
        profile: {
          create: {
            fullName: "HR Admin Tenant A",
            tenantId: tenantA,
          },
        },
        roles: {
          create: [{ role: "hr_admin", tenantId: tenantA }],
        },
      },
    });
    userAId = uA.id;
    tokenA = generateToken({
      userId: uA.id,
      email: uA.email,
      tenantId: tenantA,
      roles: ["hr_admin"],
    });

    // 4. Create User in Tenant B with AppRole 'hr_admin'
    const uB = await rawPrisma.user.create({
      data: {
        email: `hr-admin-b-${Date.now()}@tenant-b.com`,
        passwordHash: "dummy-hash",
        profile: {
          create: {
            fullName: "HR Admin Tenant B",
            tenantId: tenantB,
          },
        },
        roles: {
          create: [{ role: "hr_admin", tenantId: tenantB }],
        },
      },
    });
    userBId = uB.id;
    tokenB = generateToken({
      userId: uB.id,
      email: uB.email,
      tenantId: tenantB,
      roles: ["hr_admin"],
    });

    // 5. Create an employee in Tenant A
    const emp = await executeAsTenant(tenantA, async () => {
      return await EmployeeService.createEmployeeAtomic(
        tenantA,
        userAId,
        {
          firstName: "Samantha",
          lastName: "Vance",
          email: `samantha.vance.${Date.now()}@tenant-a.com`,
          employeeCode: `EMP-VA-${Math.floor(1000 + Math.random() * 9000)}`,
          phone: "+91 98400 11223",
          createLoginAccount: false,
        },
        {
          userId: userAId,
          roles: ["hr_admin"],
          status: "ACTIVE",
          tenancyStrategy: "SHARED_SCHEMA",
        }
      );
    });
    employeeAId = emp.id;

    // 6. Start isolated server on random port
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr: any = server.address();
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    try {
      await rawPrisma.companyDocument.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await rawPrisma.mediaFile.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await rawPrisma.employee.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await rawPrisma.userRole.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await rawPrisma.profile.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await rawPrisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
      await rawPrisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
    } catch (_err) {}
    await rawPrisma.$disconnect();
  });

  describe("1. Multipart Upload Contract & Error Reporting", () => {
    it("returns 400 No file uploaded in 'file' field when multipart body has no file", async () => {
      const formData = new FormData();
      formData.append("folder", "Employees/Profile");

      const res = await fetch(`${baseUrl}/api/v1/media/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
        body: formData,
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("NO_FILE_UPLOADED");
      expect(data.error).toContain("No file uploaded in 'file' field");
    });

    it("rejects unauthorized upload request without Bearer token", async () => {
      const formData = new FormData();
      formData.append("file", new Blob([validPngBuffer], { type: "image/png" }), "avatar.png");

      const res = await fetch(`${baseUrl}/api/v1/media/upload`, {
        method: "POST",
        body: formData,
      });

      expect(res.status).toBe(401);
    });

    it("successfully uploads a valid PNG file and persists MediaFile record", async () => {
      const formData = new FormData();
      formData.append("file", new Blob([validPngBuffer], { type: "image/png" }), "profile-photo.png");
      formData.append("folder", "Employees/EMP-1001/Profile");

      const res = await fetch(`${baseUrl}/api/v1/media/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
        body: formData,
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toHaveProperty("id");
      expect(data).toHaveProperty("url");
      expect(data.tenantId).toBe(tenantA);
      expect(data.mimeType).toBe("image/png");
      expect(data.fileName).toBe("profile-photo.png");

      // Verify record exists in database
      const dbMedia = await rawPrisma.mediaFile.findUnique({
        where: { id: data.id },
      });
      expect(dbMedia).toBeDefined();
      expect(dbMedia?.tenantId).toBe(tenantA);
      expect(dbMedia?.checksumSha).toBeDefined();
    });

    it("rejects unsupported malicious executable files disguised as images", async () => {
      const formData = new FormData();
      formData.append("file", new Blob([maliciousExeBuffer], { type: "image/png" }), "photo.png");
      formData.append("folder", "Employees/EMP-1001/Profile");

      const res = await fetch(`${baseUrl}/api/v1/media/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
        body: formData,
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Unsupported file type");
    });

    it("rejects oversized file uploads exceeding size limits", async () => {
      const oversizedBuffer = Buffer.alloc(11 * 1024 * 1024, 0x25); // 11 MB
      const formData = new FormData();
      formData.append("file", new Blob([oversizedBuffer], { type: "application/pdf" }), "oversized.pdf");

      const res = await fetch(`${baseUrl}/api/v1/media/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
        body: formData,
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("LIMIT_FILE_SIZE");
      expect(data.error).toContain("exceeds the permitted size limit");
    });
  });

  describe("2. Profile Photo Upload & Employee Persistence", () => {
    it("updates employee avatarUrl and profile without duplicating employee records", async () => {
      // 1. Upload headshot
      const formData = new FormData();
      formData.append("file", new Blob([validPngBuffer], { type: "image/png" }), "headshot.png");
      formData.append("folder", `Employees/${employeeAId}/Profile`);

      const uploadRes = await fetch(`${baseUrl}/api/v1/media/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
        body: formData,
      });

      expect(uploadRes.status).toBe(201);
      const uploadData = await uploadRes.json();
      const photoUrl = uploadData.url;

      // 2. Update employee with new avatarUrl
      const updateRes = await fetch(`${baseUrl}/api/hr/employees/${employeeAId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tokenA}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          avatarUrl: photoUrl,
        }),
      });

      expect(updateRes.status).toBe(200);

      // 3. Verify in 360 profile
      const get360Res = await fetch(`${baseUrl}/api/hr/employees/${employeeAId}`, {
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
      });

      expect(get360Res.status).toBe(200);
      const get360Data = await get360Res.json();
      const profile = get360Data.data || get360Data;
      expect(profile.avatarUrl).toBe(photoUrl);

      // 4. Verify no duplicate employees were created
      const count = await rawPrisma.employee.count({
        where: { tenantId: tenantA },
      });
      expect(count).toBe(1);
    }, 15000);

    it("supports profile photo removal cleanly", async () => {
      const updateRes = await fetch(`${baseUrl}/api/hr/employees/${employeeAId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tokenA}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          avatarUrl: null,
        }),
      });

      expect(updateRes.status).toBe(200);

      const get360Res = await fetch(`${baseUrl}/api/hr/employees/${employeeAId}`, {
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
      });

      const get360Data = await get360Res.json();
      const profile = get360Data.data || get360Data;
      expect(profile.avatarUrl).toBeNull();
    }, 15000);
  });

  describe("3. Employee Document Upload & Vault Persistence", () => {
    it("uploads a valid PDF document and creates CompanyDocument record linked to employee", async () => {
      // 1. Upload PDF file
      const formData = new FormData();
      formData.append("file", new Blob([validPdfBuffer], { type: "application/pdf" }), "employment_agreement.pdf");
      formData.append("folder", "documents/employee");

      const uploadRes = await fetch(`${baseUrl}/api/v1/media/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
        body: formData,
      });

      expect(uploadRes.status).toBe(201);
      const uploadData = await uploadRes.json();
      const fileUrl = uploadData.url;
      expect(fileUrl).toBeDefined();

      // 2. Create document metadata record
      const docRes = await fetch(`${baseUrl}/api/documents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: employeeAId,
          title: "Master Employment Agreement 2026",
          category: "Employment Contract",
          fileUrl,
          fileName: "employment_agreement.pdf",
          requiresSignature: false,
          expiryDate: "2030-12-31",
        }),
      });

      expect(docRes.status).toBe(201);
      const docData = await docRes.json();
      expect(docData).toHaveProperty("id");
      expect(docData.employeeId).toBe(employeeAId);
      expect(docData.tenantId).toBe(tenantA);
      expect(docData.fileUrl).toBe(fileUrl);
      expect(docData.category).toBe("Employment Contract");

      // 3. Verify in Employee 360 profile
      const get360Res = await fetch(`${baseUrl}/api/hr/employees/${employeeAId}`, {
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
      });

      expect(get360Res.status).toBe(200);
      const empData = await get360Res.json();
      const profile = empData.data || empData;
      const docs = profile.companyDocuments || [];
      expect(docs.some((d: any) => d.id === docData.id)).toBe(true);
    });

    it("prevents Tenant B from viewing or accessing Tenant A's private documents", async () => {
      // 1. Upload private document in Tenant A
      const formData = new FormData();
      formData.append("file", new Blob([validPdfBuffer], { type: "application/pdf" }), "sensitive_id_proof.pdf");
      formData.append("folder", "documents/employee");

      const uploadRes = await fetch(`${baseUrl}/api/v1/media/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
        body: formData,
      });

      expect(uploadRes.status).toBe(201);
      const uploadData = await uploadRes.json();
      const privateFilePath = uploadData.filePath;

      // 2. Access through uploads security endpoint as anonymous -> 401
      const anonRes = await fetch(`${baseUrl}/uploads/${privateFilePath}`);
      expect(anonRes.status).toBe(401);
      const anonData = await anonRes.json();
      expect(anonData.code).toBe("UPLOAD_AUTH_REQUIRED");

      // 3. Access through uploads security endpoint as Tenant B -> 403
      const crossTenantRes = await fetch(`${baseUrl}/uploads/${privateFilePath}`, {
        headers: {
          Authorization: `Bearer ${tokenB}`,
        },
      });

      expect(crossTenantRes.status).toBe(403);
      const crossData = await crossTenantRes.json();
      expect(crossData.code).toBe("FORBIDDEN_WORKSPACE_ASSET");

      // 4. Access as Tenant A owner -> 200
      const ownerRes = await fetch(`${baseUrl}/uploads/${privateFilePath}`, {
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
      });

      expect(ownerRes.status).toBe(200);
    });
  });
});
