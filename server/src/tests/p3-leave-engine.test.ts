import { describe, it, expect, vi, beforeEach } from "vitest";
import { LeaveService } from "../services/leave.service";
import { rawPrisma } from "../prisma";
import { OutboxService } from "../services/outbox.service";
import { AuditService } from "../services/audit.service";

vi.mock("../prisma", () => ({
  rawPrisma: {
    leaveLedgerEntry: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    leaveRequest: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    leaveType: {
      findUnique: vi.fn(),
    },
    leavePolicy: {
      findFirst: vi.fn(),
    },
    holiday: {
      findMany: vi.fn(),
    },
    attendanceMonthLock: {
      findUnique: vi.fn(),
    },
    attendance: {
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    outboxEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (cb: any) => {
      return cb(rawPrisma);
    }),
  },
}));

vi.mock("../services/outbox.service", () => ({
  OutboxService: {
    createEvent: vi.fn().mockResolvedValue({ id: "outbox-leave-1" }),
    createOutboxEvent: vi.fn().mockResolvedValue({ id: "outbox-leave-1" }),
  },
}));

vi.mock("../services/audit.service", () => ({
  AuditService: {
    logAudit: vi.fn().mockResolvedValue({ id: "audit-leave-1" }),
  },
}));

describe("P3 Leave Engine — Ledger Balances, Dry-Run, Approval & Non-Destructive Reversals", () => {
  const tenantId = "tenant-p3-leave";
  const employeeId = "emp-p3-02";
  const leaveTypeId = "lt-casual-leave";
  const reviewerId = "user-hr-reviewer";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Ledger Derivation: Accurately computes available balance from immutable entries", async () => {
    // 12 accrued, 2 used = 10 net balance. 1 pending request = 9 available.
    (rawPrisma.leaveLedgerEntry.findMany as any).mockResolvedValue([
      { entryType: "ACCRUAL", days: 12 },
      { entryType: "DEBIT", days: 2 },
    ]);
    (rawPrisma.leaveRequest.findMany as any).mockResolvedValue([
      { days: 1 },
    ]);

    const balance = await LeaveService.getEmployeeBalance(tenantId, employeeId, leaveTypeId);
    expect(balance).toBe(9);
  });

  it("2. Dry-Run Validation: Computes business days, excludes weekends, verifies balance quota", async () => {
    // Mon 2026-10-12 to Wed 2026-10-14 = 3 weekdays
    (rawPrisma.holiday.findMany as any).mockResolvedValue([]);
    (rawPrisma.leaveType.findUnique as any).mockResolvedValue({
      id: leaveTypeId,
      tenantId,
      name: "Casual Leave",
      daysPerYear: 12,
      sandwichRule: false,
    });
    (rawPrisma.leavePolicy.findFirst as any).mockResolvedValue(null);
    (rawPrisma.leaveRequest.findFirst as any).mockResolvedValue(null); // no overlapping request
    (rawPrisma.leaveRequest.findMany as any).mockResolvedValue([]);
    (rawPrisma.leaveLedgerEntry.findMany as any).mockResolvedValue([
      { entryType: "ACCRUAL", days: 12 },
    ]);

    const preview = await LeaveService.validateDryRun({
      tenantId,
      employeeId,
      leaveTypeId,
      startDate: "2026-10-12",
      endDate: "2026-10-14",
      halfDay: false,
      reason: "Family event",
    });

    expect(preview.totalDays).toBe(3);
    expect(preview.isValid).toBe(true);
    expect(preview.availableBalance).toBe(12);
  });

  it("3. Sandwich Rule: Adds weekend days when leave flanks weekend and policy enforces it", async () => {
    // Fri 2026-10-09 to Mon 2026-10-12 = 2 weekdays (Fri, Mon) + 2 weekend days (Sat, Sun)
    (rawPrisma.holiday.findMany as any).mockResolvedValue([]);
    (rawPrisma.leaveType.findUnique as any).mockResolvedValue({
      id: leaveTypeId,
      tenantId,
      name: "Earned Leave",
      daysPerYear: 18,
      sandwichRule: true,
    });
    (rawPrisma.leavePolicy.findFirst as any).mockResolvedValue({
      sandwichRule: true,
    });
    (rawPrisma.leaveRequest.findFirst as any).mockResolvedValue(null);
    (rawPrisma.leaveRequest.findMany as any).mockResolvedValue([]);
    (rawPrisma.leaveLedgerEntry.findMany as any).mockResolvedValue([
      { entryType: "ACCRUAL", days: 18 },
    ]);

    const preview = await LeaveService.validateDryRun({
      tenantId,
      employeeId,
      leaveTypeId,
      startDate: "2026-10-09",
      endDate: "2026-10-12",
      halfDay: false,
      reason: "Vacation",
    });

    expect(preview.totalDays).toBe(4); // 2 weekdays + 2 sandwich weekend days
    expect(preview.isValid).toBe(true);
  });

  it("4. Approval: Debits ledger, locks attendance to on_leave, emits leave.approved and leave.balance_changed", async () => {
    (rawPrisma.attendanceMonthLock.findUnique as any).mockResolvedValue(null); // Unlocked
    (rawPrisma.leaveRequest.findUnique as any).mockResolvedValue({
      id: "req-1",
      tenantId,
      employeeId,
      leaveTypeId,
      startDate: new Date("2026-10-12T00:00:00Z"),
      endDate: new Date("2026-10-13T00:00:00Z"),
      days: 2,
      status: "pending",
    });
    (rawPrisma.leaveLedgerEntry.findMany as any).mockResolvedValue([
      { entryType: "ACCRUAL", days: 10 },
    ]);
    (rawPrisma.leaveRequest.findMany as any).mockResolvedValue([]);
    (rawPrisma.leaveRequest.update as any).mockResolvedValue({
      id: "req-1",
      status: "approved",
    });

    const result = await LeaveService.decideApplication(tenantId, "req-1", "approve", reviewerId, "Approved by Manager");

    expect(result.status).toBe("approved");
    expect(rawPrisma.leaveLedgerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entryType: "DEBIT",
          days: 2,
          employeeId,
          leaveTypeId,
        }),
      })
    );
    expect(rawPrisma.attendance.upsert).toHaveBeenCalled();
    expect(OutboxService.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "leave.approved",
        tenantId,
      }),
      expect.anything()
    );
  });

  it("5. Reversal / Cancellation: Generates compensating CREDIT ledger entry without destructive mutation", async () => {
    (rawPrisma.attendanceMonthLock.findUnique as any).mockResolvedValue(null);
    (rawPrisma.leaveRequest.findUnique as any).mockResolvedValue({
      id: "req-1",
      tenantId,
      employeeId,
      leaveTypeId,
      startDate: new Date("2026-10-12T00:00:00Z"),
      endDate: new Date("2026-10-13T00:00:00Z"),
      days: 2,
      status: "approved",
    });
    (rawPrisma.leaveLedgerEntry.findMany as any).mockResolvedValue([
      { entryType: "ACCRUAL", days: 10 },
      { entryType: "DEBIT", days: 2 },
    ]);
    (rawPrisma.leaveRequest.findMany as any).mockResolvedValue([]);
    (rawPrisma.leaveRequest.update as any).mockResolvedValue({
      id: "req-1",
      status: "cancelled",
    });

    const result = await LeaveService.cancelApplication(tenantId, "req-1", reviewerId, "Personal plans cancelled");

    expect(result.status).toBe("cancelled");
    expect(rawPrisma.leaveLedgerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entryType: "CREDIT",
          days: 2,
          notes: expect.stringContaining("Compensating reversal"),
        }),
      })
    );
    expect(rawPrisma.attendance.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "on_leave",
        }),
        data: {
          status: "present",
          notes: expect.stringContaining("Leave cancelled"),
        },
      })
    );
    expect(OutboxService.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "leave.cancelled",
        tenantId,
      }),
      expect.anything()
    );
  });
});
