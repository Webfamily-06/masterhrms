import { describe, it, expect } from "vitest";
import {
  buildDataScopeFilter,
  canAccessRecord,
  UserSecurityContext,
} from "../lib/data-scope";
import {
  maskAadhaar,
  maskPan,
  maskBankAccount,
  sanitizeSensitiveFields,
} from "../lib/field-security";
import { computeAllowedActions } from "../lib/allowed-actions";

describe("P1 Security & Data-Scope Engine", () => {
  const employeeContext: UserSecurityContext = {
    userId: "user-alice",
    tenantId: "tenant-acme",
    roles: ["employee"],
    employeeId: "emp-alice",
    employeeCode: "EMP001",
    departmentId: "dept-eng",
    branchId: "branch-blr",
    managerId: null,
    directReportEmployeeIds: ["emp-bob", "emp-carol"],
    allSubordinateEmployeeIds: ["emp-bob", "emp-carol", "emp-dave"],
    isSuperAdmin: false,
    isTenantAdmin: false,
  };

  const adminContext: UserSecurityContext = {
    userId: "user-admin",
    tenantId: "tenant-acme",
    roles: ["admin"],
    employeeId: null,
    employeeCode: null,
    departmentId: null,
    branchId: null,
    managerId: null,
    directReportEmployeeIds: [],
    allSubordinateEmployeeIds: [],
    isSuperAdmin: false,
    isTenantAdmin: true,
  };

  describe("Data Scope Filters", () => {
    it("generates SELF scope filter", () => {
      const filter = buildDataScopeFilter("SELF", employeeContext, "employee_dependent");
      expect(filter).toEqual({ employeeId: "emp-alice" });

      const empFilter = buildDataScopeFilter("SELF", employeeContext, "employee");
      expect(empFilter).toEqual({ id: "emp-alice" });
    });

    it("generates TEAM_DIRECT scope filter including self and direct reports", () => {
      const filter = buildDataScopeFilter("TEAM_DIRECT", employeeContext, "employee_dependent");
      expect(filter).toEqual({
        employeeId: { in: ["emp-alice", "emp-bob", "emp-carol"] },
      });
    });

    it("generates TEAM_ALL scope filter including self and recursive team", () => {
      const filter = buildDataScopeFilter("TEAM_ALL", employeeContext, "employee_dependent");
      expect(filter).toEqual({
        employeeId: { in: ["emp-alice", "emp-bob", "emp-carol", "emp-dave"] },
      });
    });

    it("generates DEPARTMENT scope filter", () => {
      const filter = buildDataScopeFilter("DEPARTMENT", employeeContext, "employee_dependent");
      expect(filter).toEqual({ employee: { departmentId: "dept-eng" } });
    });

    it("generates BRANCH scope filter", () => {
      const filter = buildDataScopeFilter("BRANCH", employeeContext, "employee_dependent");
      expect(filter).toEqual({ employee: { branchId: "branch-blr" } });
    });

    it("allows ALL for admins without restriction", () => {
      const filter = buildDataScopeFilter("ALL", adminContext, "employee_dependent");
      expect(filter).toEqual({});
    });

    it("evaluates canAccessRecord correctly", () => {
      // Alice can access her own record
      expect(canAccessRecord({ employeeId: "emp-alice" }, "SELF", employeeContext)).toBe(true);

      // Alice cannot access Bob under SELF
      expect(canAccessRecord({ employeeId: "emp-bob" }, "SELF", employeeContext)).toBe(false);

      // Alice CAN access Bob under TEAM_DIRECT
      expect(canAccessRecord({ employeeId: "emp-bob" }, "TEAM_DIRECT", employeeContext)).toBe(true);

      // Alice CAN access Dave (indirect report) under TEAM_ALL, but NOT TEAM_DIRECT
      expect(canAccessRecord({ employeeId: "emp-dave" }, "TEAM_DIRECT", employeeContext)).toBe(false);
      expect(canAccessRecord({ employeeId: "emp-dave" }, "TEAM_ALL", employeeContext)).toBe(true);

      // Admin can access anyone under ALL
      expect(canAccessRecord({ employeeId: "emp-other" }, "ALL", adminContext)).toBe(true);
    });
  });

  describe("Field-Level Security Masking", () => {
    it("masks statutory identifiers correctly", () => {
      expect(maskAadhaar("1234 5678 9012")).toBe("•••• •••• 9012");
      expect(maskPan("ABCDE1234F")).toBe("••••••1234F".slice(0, 6) + "234F"); // last 4 digits
      expect(maskBankAccount("987654321098")).toBe("••••••••1098");
    });

    it("redacts sensitive and compensation fields for unauthorized users", () => {
      const rawData = {
        id: "emp-bob",
        firstName: "Bob",
        panNumber: "ABCDE1234F",
        aadhaarNumber: "123456789012",
        bankAccountNumber: "987654321098",
        baseSalary: 1200000,
        ctc: 1500000,
      };

      const sanitized = sanitizeSensitiveFields(rawData, {
        canViewSensitive: false,
        canViewCompensation: false,
        isSelf: false,
      });

      expect(sanitized.firstName).toBe("Bob");
      expect(sanitized.panNumber).toBe("••••••234F");
      expect(sanitized.aadhaarNumber).toBe("•••• •••• 9012");
      expect(sanitized.bankAccountNumber).toBe("••••••••1098");
      expect(sanitized.baseSalary).toBeNull();
      expect(sanitized.ctc).toBeNull();
    });

    it("preserves unmasked data when user has required permissions", () => {
      const rawData = {
        panNumber: "ABCDE1234F",
        baseSalary: 1200000,
      };

      const sanitized = sanitizeSensitiveFields(rawData, {
        canViewSensitive: true,
        canViewCompensation: true,
        isSelf: false,
      });

      expect(sanitized.panNumber).toBe("ABCDE1234F");
      expect(sanitized.baseSalary).toBe(1200000);
    });
  });

  describe("Server-Computed allowedActions[]", () => {
    it("computes actions for LeaveRequest based on status and ownership", () => {
      const pendingLeave = {
        id: "leave-1",
        employeeId: "emp-alice",
        status: "PENDING",
        currentApproverId: "emp-manager",
      };

      // Owner seeing pending leave
      const ownerActions = computeAllowedActions(
        "LeaveRequest",
        pendingLeave,
        employeeContext
      );
      expect(ownerActions).toContain("VIEW");
      expect(ownerActions).toContain("WITHDRAW");
      expect(ownerActions).not.toContain("APPROVE");

      // Approver/Admin seeing pending leave
      const adminActions = computeAllowedActions(
        "LeaveRequest",
        pendingLeave,
        adminContext
      );
      expect(adminActions).toContain("VIEW");
      expect(adminActions).toContain("APPROVE");
      expect(adminActions).toContain("REJECT");
    });
  });
});
