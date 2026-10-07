import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmployeeService, CreateEmployeeInput } from "../services/employee.service";
import * as contextModule from "../context/tenant-context";

describe("P2 Employee Business Layer & Security", () => {
  const tenantId = "tenant-p2-emp-test";
  const actorId = "user-hr-admin";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Atomic Creation: Executes atomically and queues outbox event", async () => {
    const input: CreateEmployeeInput = {
      firstName: "Aarav",
      lastName: "Patel",
      email: "aarav.patel@company.com",
      employeeCode: "EMP-9001",
      position: "Lead Engineer",
      createLoginAccount: false, // test pure employee transaction first
    };

    const mockCreatedEmployee = {
      id: "emp-new-1",
      tenantId,
      ...input,
      status: "active",
      employmentType: "full_time",
      department: { name: "Engineering" },
      branch: { name: "Bangalore HQ" },
    };

    const mockDb: any = {
      employee: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(mockCreatedEmployee),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
      outboxEvent: { create: vi.fn().mockResolvedValue({}) },
      notification: { create: vi.fn().mockResolvedValue({}) },
      $transaction: async (cb: any) => cb(mockDb),
    };

    vi.spyOn(contextModule, "getTenantDb").mockReturnValue(mockDb);

    const result = await EmployeeService.createEmployeeAtomic(tenantId, actorId, input);

    expect(result.id).toBe("emp-new-1");
    expect(mockDb.employee.create).toHaveBeenCalled();
    expect(mockDb.outboxEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId,
        eventType: "employee.created",
        entityId: "emp-new-1",
      }),
    });
    expect(mockDb.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId,
        action: "EMPLOYEE_CREATE",
      }),
    });
  });

  it("2. Transactional Rollback: Aborts when duplicate employeeCode exists", async () => {
    const input: CreateEmployeeInput = {
      firstName: "Meera",
      lastName: "Nair",
      email: "meera.nair@company.com",
      employeeCode: "EMP-EXISTS",
    };

    const mockDb: any = {
      employee: {
        findFirst: vi.fn().mockResolvedValue({ id: "existing-id", employeeCode: "EMP-EXISTS" }),
        create: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    vi.spyOn(contextModule, "getTenantDb").mockReturnValue(mockDb);

    await expect(
      EmployeeService.createEmployeeAtomic(tenantId, actorId, input)
    ).rejects.toThrow("already exists in this workspace");

    expect(mockDb.$transaction).not.toHaveBeenCalled();
    expect(mockDb.employee.create).not.toHaveBeenCalled();
  });

  it("3. Directory & Field-Level Security: Masks statutory PII for unauthorized users", async () => {
    const rawEmployee = {
      id: "emp-101",
      firstName: "Kunal",
      lastName: "Verma",
      employeeCode: "EMP-101",
      email: "kunal@company.com",
      pan: "ABCDE1234F",
      aadhaar: "123456789012",
      bankAccount: "987654321000",
      salary: "1500000",
      status: "active",
      createdAt: new Date(),
    };

    const mockDb: any = {
      employee: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([rawEmployee]),
      },
    };

    vi.spyOn(contextModule, "getTenantDb").mockReturnValue(mockDb);

    const callerContext: any = {
      userId: "user-employee-1",
      tenantId,
      roles: ["employee"], // regular employee role without PII viewing rights
      dataScope: "ALL",
      employeeId: "emp-other",
    };

    const result = await EmployeeService.listEmployees(tenantId, callerContext, [], {});

    expect(result.data.length).toBe(1);
    const masked = result.data[0];
    // Under FLS, sensitive statutory numbers are masked
    expect(masked.pan).not.toBe("ABCDE1234F");
    expect(masked.aadhaar).not.toBe("123456789012");
    expect(masked.bankAccount).not.toBe("987654321000");
  });

  it("4. Employee Import: Dry-run validates required fields and duplicates", async () => {
    const mockDb: any = {
      employee: {
        findMany: vi.fn().mockResolvedValue([
          { employeeCode: "EMP-EXISTING", email: "existing@company.com" },
        ]),
      },
      branch: { findMany: vi.fn().mockResolvedValue([]) },
      department: { findMany: vi.fn().mockResolvedValue([]) },
      designation: { findMany: vi.fn().mockResolvedValue([]) },
    };

    vi.spyOn(contextModule, "getTenantDb").mockReturnValue(mockDb);

    const testRecords = [
      { firstName: "Valid", lastName: "User", email: "valid@company.com", employeeCode: "EMP-NEW" },
      { firstName: "", lastName: "MissingFirst", email: "bad@company.com", employeeCode: "EMP-2" },
      { firstName: "Dup", lastName: "Code", email: "dup@company.com", employeeCode: "EMP-EXISTING" },
    ];

    const report = await EmployeeService.validateImportDryRun(tenantId, testRecords);

    expect(report.totalRecords).toBe(3);
    expect(report.validCount).toBe(1);
    expect(report.errorCount).toBeGreaterThanOrEqual(2);
    expect(report.canCommit).toBe(false);
  });
});
