import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { EmployeeService } from "../services/employee.service";
import { UserSecurityContext } from "../lib/data-scope";
import { runWithTenantContext, TenantContext } from "../context/tenant-context";

const rawPrisma = new PrismaClient();

function executeAsTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
  const ctx: TenantContext = {
    tenantId,
    userId: "admin-actor-integrity",
    roles: ["admin", "hr_admin"],
    status: "ACTIVE",
    tenancyStrategy: "SHARED_SCHEMA",
    db: rawPrisma,
  };
  return runWithTenantContext(ctx, fn);
}

describe("Employee 360 Certifications & Banking Data Integrity Suite", { timeout: 35000 }, () => {
  let tenantA: string;
  let tenantB: string;
  let employeeIdA: string;
  let employeeIdB: string;
  let adminContextA: UserSecurityContext;
  let unauthorizedContextA: UserSecurityContext;

  beforeAll(async () => {
    // 1. Setup Tenant A and Tenant B
    const tA = await rawPrisma.tenant.create({
      data: {
        name: "Integrity Tenant A",
        slug: `integ-a-${Date.now()}`,
      },
    });
    tenantA = tA.id;

    const tB = await rawPrisma.tenant.create({
      data: {
        name: "Integrity Tenant B",
        slug: `integ-b-${Date.now()}`,
      },
    });
    tenantB = tB.id;

    // 2. Setup Employee in Tenant A
    const empA = await rawPrisma.employee.create({
      data: {
        tenantId: tenantA,
        employeeCode: `EMP-INT-${Date.now()}`,
        firstName: "Rohan",
        lastName: "Sharma",
        email: `rohan-${Date.now()}@example.com`,
        status: "active",
        employmentType: "full_time",
        bankName: "State Bank of India",
        bankAccount: "300123456789",
        bankIfsc: "SBIN0001234",
        bankBranch: "MG Road Branch",
        pan: "ABCDE1234F",
        aadhaar: "123456789012",
        uan: "100123456789",
        esiNumber: "31001234560000001",
        pfNumber: "MH/BAN/0012345/000/0001234",
        taxRegime: "new",
        salary: 1500000.0,
      },
    });
    employeeIdA = empA.id;

    // 3. Setup Employee in Tenant B
    const empB = await rawPrisma.employee.create({
      data: {
        tenantId: tenantB,
        employeeCode: `EMP-TB-${Date.now()}`,
        firstName: "Vikram",
        lastName: "Patel",
        email: `vikram-${Date.now()}@example.com`,
        status: "active",
        employmentType: "full_time",
      },
    });
    employeeIdB = empB.id;

    // 4. Set custom metadata (accountHolderName, bicSwift)
    await executeAsTenant(tenantA, async () => {
      await EmployeeService.setEmployeeMetadata(tenantA, employeeIdA, {
        accountHolderName: "Rohan Sharma SBI",
        bicSwift: "SBININBB123",
      });
    });

    adminContextA = {
      userId: "admin-actor-integrity",
      roles: ["admin", "hr_admin"],
      isTenantAdmin: true,
      isSuperAdmin: false,
      directReportEmployeeIds: [],
      allSubordinateEmployeeIds: [],
    };

    unauthorizedContextA = {
      userId: "regular-staff-1",
      roles: ["employee"],
      isTenantAdmin: false,
      isSuperAdmin: false,
      directReportEmployeeIds: [],
      allSubordinateEmployeeIds: [],
    };
  });

  afterAll(async () => {
    await rawPrisma.award.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await rawPrisma.customFieldValue.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await rawPrisma.employee.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await rawPrisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
    await rawPrisma.$disconnect();
  });

  // ─── CERTIFICATIONS & AWARDS TESTS ──────────────────────────────────────────
  describe("Certifications & Awards Dynamic Retrieval", () => {
    it("1. Empty database results produce zero awards array and no demo awards", async () => {
      const profile = await executeAsTenant(tenantA, async () => {
        return EmployeeService.getEmployee360(tenantA, employeeIdA, adminContextA, ["hr:employee:read"]);
      });

      expect(profile.awards).toBeDefined();
      expect(Array.isArray(profile.awards)).toBe(true);
      expect(profile.awards).toHaveLength(0);
    });

    it("2. Actual persisted awards render with exact dynamic count and details", async () => {
      // Create an award type and award
      const awardType = await rawPrisma.awardType.create({
        data: {
          tenantId: tenantA,
          name: "Annual Innovator Trophy",
        },
      });

      await rawPrisma.award.create({
        data: {
          tenantId: tenantA,
          employeeId: employeeIdA,
          awardTypeId: awardType.id,
          awardDate: new Date("2026-03-15"),
          description: "Exceptional system design and engineering contribution",
          presentedBy: "CEO & VP Engineering",
          status: "awarded",
        },
      });

      const profile = await executeAsTenant(tenantA, async () => {
        return EmployeeService.getEmployee360(tenantA, employeeIdA, adminContextA, ["hr:employee:read"]);
      });

      expect(profile.awards).toHaveLength(1);
      expect(profile.awards[0].awardType?.name).toBe("Annual Innovator Trophy");
      expect(profile.awards[0].presentedBy).toBe("CEO & VP Engineering");
    });

    it("3. Tenant A cannot read Tenant B's awards (Tenant Isolation)", async () => {
      // Award in Tenant B
      const awardTypeB = await rawPrisma.awardType.create({
        data: {
          tenantId: tenantB,
          name: "Tenant B Star Award",
        },
      });

      await rawPrisma.award.create({
        data: {
          tenantId: tenantB,
          employeeId: employeeIdB,
          awardTypeId: awardTypeB.id,
          awardDate: new Date("2026-04-01"),
          description: "Tenant B proprietary recognition",
          status: "awarded",
        },
      });

      // Query from Tenant A
      const profileA = await executeAsTenant(tenantA, async () => {
        return EmployeeService.getEmployee360(tenantA, employeeIdA, adminContextA, ["hr:employee:read"]);
      });

      expect(profileA.awards).toHaveLength(1);
      expect(profileA.awards.some((a: any) => a.tenantId === tenantB)).toBe(false);
      expect(profileA.awards.some((a: any) => a.awardType?.name === "Tenant B Star Award")).toBe(false);
    });
  });

  // ─── BANKING & STATUTORY DATA INTEGRITY TESTS ─────────────────────────────
  describe("Banking & Statutory Persistence & Security", () => {
    it("4. Authorized user retrieves unmasked banking and statutory values", async () => {
      const profile = await executeAsTenant(tenantA, async () => {
        return EmployeeService.getEmployee360(tenantA, employeeIdA, adminContextA, [
          "hr:employee:read",
          "hr:employee:sensitive:read",
        ]);
      });

      expect(profile.bankName).toBe("State Bank of India");
      expect(profile.bankAccount).toBe("300123456789");
      expect(profile.bankIfsc).toBe("SBIN0001234");
      expect(profile.bankBranch).toBe("MG Road Branch");
      expect(profile.bicSwift).toBe("SBININBB123");
      expect(profile.accountHolderName).toBe("Rohan Sharma SBI");
      expect(profile.pan).toBe("ABCDE1234F");
      expect(profile.aadhaar).toBe("123456789012");
      expect(profile.uan).toBe("100123456789");
      expect(profile.esiNumber).toBe("31001234560000001");
      expect(profile.pfNumber).toBe("MH/BAN/0012345/000/0001234");
      expect(profile.taxRegime).toBe("new");
      expect(Number(profile.salary)).toBe(1500000.0);
    });

    it("5. Field-level security masks sensitive statutory and banking values for unauthorized roles", async () => {
      const maskedProfile = await executeAsTenant(tenantA, async () => {
        return EmployeeService.getEmployee360(tenantA, employeeIdA, unauthorizedContextA, ["hr:employee:read"]);
      });

      // PAN, Aadhaar, Bank Account, IFSC, UAN, ESI, PF, SWIFT masked
      expect(maskedProfile.bankAccount).toContain("••••");
      expect(maskedProfile.bankAccount).not.toBe("300123456789");
      expect(maskedProfile.pan).toContain("••••");
      expect(maskedProfile.pan).not.toBe("ABCDE1234F");
      expect(maskedProfile.aadhaar).toContain("••••");
      expect(maskedProfile.aadhaar).not.toBe("123456789012");
      expect(maskedProfile.uan).toContain("••••");
      expect(maskedProfile.salary).toBeNull();
    });

    it("6. Rejects sensitive modifications from unauthorized actor (server-side guard)", async () => {
      await expect(
        executeAsTenant(tenantA, async () => {
          return EmployeeService.updateEmployee(
            tenantA,
            "regular-staff-1",
            employeeIdA,
            {
              salary: 2500000,
              bankAccount: "999999999999",
            },
            unauthorizedContextA,
            ["hr:employee:read"]
          );
        })
      ).rejects.toThrow();
    });

    it("7. Updates all 13 banking and statutory fields atomically for authorized user", async () => {
      const updated = await executeAsTenant(tenantA, async () => {
        return EmployeeService.updateEmployee(
          tenantA,
          "admin-actor-integrity",
          employeeIdA,
          {
            bankName: "HDFC Bank Ltd",
            accountHolderName: "Rohan Sharma Salary A/C",
            bankAccount: "50100445566778",
            bankBranch: "Indiranagar 100ft Rd",
            bicSwift: "HDFCINBB001",
            bankIfsc: "HDFC0001899",
            pan: "BCDEF5678G",
            aadhaar: "987654321098",
            uan: "200987654321",
            esiNumber: "41009876540000002",
            pfNumber: "KA/BLR/0099887/000/0005678",
            taxRegime: "old",
            salary: 1950000.0,
          },
          adminContextA,
          ["hr:employees:write", "hr:employee:sensitive:write"]
        );
      });

      expect(updated.id).toBe(employeeIdA); // Employee ID is immutable
      expect(updated.bankName).toBe("HDFC Bank Ltd");
      expect(updated.accountHolderName).toBe("Rohan Sharma Salary A/C");
      expect(updated.bankAccount).toBe("50100445566778");
      expect(updated.bankBranch).toBe("Indiranagar 100ft Rd");
      expect(updated.bicSwift).toBe("HDFCINBB001");
      expect(updated.bankIfsc).toBe("HDFC0001899");
      expect(updated.pan).toBe("BCDEF5678G");
      expect(updated.aadhaar).toBe("987654321098");
      expect(updated.uan).toBe("200987654321");
      expect(updated.esiNumber).toBe("41009876540000002");
      expect(updated.pfNumber).toBe("KA/BLR/0099887/000/0005678");
      expect(updated.taxRegime).toBe("old");
      expect(Number(updated.salary)).toBe(1950000.0);
    });

    it("8. Preserves existing values during partial updates when fields are omitted", async () => {
      // Partial update only changing phone number
      const partialUpdate = await executeAsTenant(tenantA, async () => {
        return EmployeeService.updateEmployee(
          tenantA,
          "admin-actor-integrity",
          employeeIdA,
          {
            phone: "+91 98765 00000",
          },
          adminContextA,
          ["hr:employees:write", "hr:employee:sensitive:write"]
        );
      });

      // Verify all banking and statutory fields were completely preserved
      expect(partialUpdate.phone).toBe("+91 98765 00000");
      expect(partialUpdate.bankName).toBe("HDFC Bank Ltd");
      expect(partialUpdate.bankAccount).toBe("50100445566778");
      expect(partialUpdate.bankIfsc).toBe("HDFC0001899");
      expect(partialUpdate.bicSwift).toBe("HDFCINBB001");
      expect(partialUpdate.pan).toBe("BCDEF5678G");
      expect(partialUpdate.aadhaar).toBe("987654321098");
      expect(partialUpdate.uan).toBe("200987654321");
      expect(partialUpdate.esiNumber).toBe("41009876540000002");
      expect(partialUpdate.pfNumber).toBe("KA/BLR/0099887/000/0005678");
      expect(partialUpdate.taxRegime).toBe("old");
      expect(Number(partialUpdate.salary)).toBe(1950000.0);
    });

    it("9. Updating an employee does not create duplicate employee records", async () => {
      const count = await rawPrisma.employee.count({
        where: { tenantId: tenantA },
      });
      expect(count).toBe(1);
    });
  });
});
