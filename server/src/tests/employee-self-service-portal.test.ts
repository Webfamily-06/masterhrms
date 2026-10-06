import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import http from "http";
import jwt from "jsonwebtoken";
import { employeeSelfServiceRouter } from "../routes/employee-self-service.routes";
import { rawPrisma, prisma } from "../prisma";

describe("EMPLOYEE SELF-SERVICE & MANAGER PORTAL (PHASES E1-E6)", () => {
  const db = rawPrisma || prisma;
  let testApp: express.Application;
  let server: http.Server;
  let baseUrl: string;
  let authToken: string;

  const testTenantId = "tenant-default-001";
  const testUserId = "user-admin-001";
  const testEmployeeId = "emp-demo-001";

  beforeAll(async () => {
    // Generate valid test JWT
    const secret = process.env.JWT_SECRET || "masterhrms-super-secret-jwt-key-change-in-production";
    authToken = jwt.sign(
      {
        id: testUserId,
        userId: testUserId,
        email: "admin@masterhrms.com",
        tenantId: testTenantId,
        roles: ["super_admin", "hr_admin", "manager"],
      },
      secret,
      { expiresIn: "1h" }
    );

    testApp = express();
    testApp.use(express.json());
    testApp.use("/api/v1/me", employeeSelfServiceRouter);

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

  describe("Phase E1: Profile & Sensitive Identity Masking", () => {
    it("GET /api/v1/me/profile returns masked statutory data and employee info", async () => {
      const res = await fetch(`${baseUrl}/api/v1/me/profile`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(testEmployeeId);
      expect(json.data.statutory).toBeDefined();
    });

    it("PUT /api/v1/me/profile updates non-sensitive phone field immediately", async () => {
      const res = await fetch(`${baseUrl}/api/v1/me/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: "+1-555-0199" }),
      });
      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.phone).toBe("+1-555-0199");
    });
  });

  describe("Phase E2: Attendance Punch & Leave Ledger", () => {
    it("POST /api/v1/me/attendance/check-in records authoritative check-in punch", async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await db.attendance.deleteMany({
        where: { employeeId: testEmployeeId, date: today },
      });

      const res = await fetch(`${baseUrl}/api/v1/me/attendance/check-in`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.checkIn).toBeDefined();
    });

    it("POST /api/v1/me/attendance/check-out records check-out and calculates hours", async () => {
      const res = await fetch(`${baseUrl}/api/v1/me/attendance/check-out`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.checkOut).toBeDefined();
    });

    it("GET /api/v1/me/leave-balance returns real-time accrual and balance numbers", async () => {
      const res = await fetch(`${baseUrl}/api/v1/me/leave-balance`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
      expect(json.data[0].availableDays).toBeDefined();
    });

    it("POST /api/v1/me/leaves/validate performs dry-run date and overlap verification", async () => {
      const res = await fetch(`${baseUrl}/api/v1/me/leaves/validate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leaveTypeId: "d860cdcc-d769-403d-bd75-07a42d84222f",
          startDate: "2026-11-01",
          endDate: "2026-11-03",
        }),
      });
      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.calculatedDays).toBe(3);
    });

    it("POST /api/v1/me/regularizations submits request and allows withdrawal", async () => {
      const createRes = await fetch(`${baseUrl}/api/v1/me/regularizations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          attendanceDate: "2026-10-01",
          proposedIn: "2026-10-01T09:00:00.000Z",
          proposedOut: "2026-10-01T18:00:00.000Z",
          reason: "Biometric offline test",
        }),
      });
      expect(createRes.status).toBe(201);
      const created: any = await createRes.json();
      expect(created.data.status).toBe("PENDING");

      // Withdraw request
      const withdrawRes = await fetch(`${baseUrl}/api/v1/me/regularizations/${created.data.id}/withdraw`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(withdrawRes.status).toBe(200);
      const withdrawn: any = await withdrawRes.json();
      expect(withdrawn.data.status).toBe("WITHDRAWN");
    });
  });

  describe("Phase E3: Payroll & Statutory Self-Service", () => {
    it("GET /api/v1/me/payslips returns list of employee payslips", async () => {
      const res = await fetch(`${baseUrl}/api/v1/me/payslips`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
    });

    it("GET & PUT /api/v1/me/tax-declaration manages regime and investment deductions", async () => {
      const putRes = await fetch(`${baseUrl}/api/v1/me/tax-declaration`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taxRegime: "new",
          section80C: 100000,
          section80D: 25000,
        }),
      });
      expect(putRes.status).toBe(200);
      const putJson: any = await putRes.json();
      expect(putJson.success).toBe(true);
      expect(putJson.data.taxRegime).toBe("new");

      const getRes = await fetch(`${baseUrl}/api/v1/me/tax-declaration`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(getRes.status).toBe(200);
      const getJson: any = await getRes.json();
      expect(getJson.data.status).toBe("submitted");
    });
  });

  describe("Phase E4: Growth, Recognition & Documents", () => {
    it("GET /api/v1/me/okrs returns OKRs", async () => {
      const res = await fetch(`${baseUrl}/api/v1/me/okrs`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
    });

    it("POST /api/v1/me/documents/request creates official letter request", async () => {
      const res = await fetch(`${baseUrl}/api/v1/me/documents/request`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          letterType: "BONAFIDE",
          purpose: "Visa Application",
        }),
      });
      expect(res.status).toBe(201);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("PENDING");
    });
  });

  describe("Phase E5: Assets, Resignation & Helpdesk", () => {
    it("POST /api/v1/me/assets/request creates hardware request", async () => {
      const res = await fetch(`${baseUrl}/api/v1/me/assets/request`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryName: "Hardware",
          itemName: "Mechanical Keyboard",
          purpose: "Ergonomics",
        }),
      });
      expect(res.status).toBe(201);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("pending");
    });

    it("POST /api/v1/me/tickets creates helpdesk grievance ticket", async () => {
      const res = await fetch(`${baseUrl}/api/v1/me/tickets`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: "Workstation Monitor Cable",
          category: "IT & Hardware",
          priority: "medium",
          description: "HDMI adapter is loose",
        }),
      });
      expect(res.status).toBe(201);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("open");
    });
  });

  describe("Phase E6: Manager Self-Service (MSS)", () => {
    it("GET /api/v1/me/team returns direct reports array", async () => {
      const res = await fetch(`${baseUrl}/api/v1/me/team`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
    });

    it("GET /api/v1/me/team/approvals returns grouped pending requests", async () => {
      const res = await fetch(`${baseUrl}/api/v1/me/team/approvals`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.leaves).toBeDefined();
      expect(json.data.regularizations).toBeDefined();
      expect(json.data.changeRequests).toBeDefined();
    });
  });
});
