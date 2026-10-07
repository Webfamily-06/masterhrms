import { describe, it, expect, vi, beforeEach } from "vitest";
import { AttendanceService } from "../services/attendance.service";
import { rawPrisma } from "../prisma";
import { OutboxService } from "../services/outbox.service";
import { AuditService } from "../services/audit.service";

vi.mock("../prisma", () => ({
  rawPrisma: {
    attendanceMonthLock: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
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
    createEvent: vi.fn().mockResolvedValue({ id: "outbox-lock-1" }),
    createOutboxEvent: vi.fn().mockResolvedValue({ id: "outbox-lock-1" }),
  },
}));

vi.mock("../services/audit.service", () => ({
  AuditService: {
    logAudit: vi.fn().mockResolvedValue({ id: "audit-lock-1" }),
  },
}));

describe("P3 Month Lock & Multi-Tenant Isolation", () => {
  const tenantA = "tenant-alpha";
  const tenantB = "tenant-beta";
  const actorId = "user-hr-admin";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Lock Month: Sets authoritative lock, logs audit, and emits outbox event", async () => {
    (rawPrisma.attendanceMonthLock.upsert as any).mockResolvedValue({
      id: "lock-1",
      tenantId: tenantA,
      year: 2026,
      month: 9,
      isLocked: true,
      lockedAt: new Date(),
      lockedBy: actorId,
      notes: "Finalized for September payroll",
    });

    const lock = await AttendanceService.setMonthLock(tenantA, 2026, 9, true, actorId, "Finalized for September payroll");

    expect(lock.isLocked).toBe(true);
    expect(AuditService.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "ATTENDANCE_MONTH_LOCKED",
        tenantId: tenantA,
        userId: actorId,
      }),
      expect.anything()
    );
    expect(OutboxService.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "attendance.month_locked",
        tenantId: tenantA,
      }),
      expect.anything()
    );
  });

  it("2. Unlock Month: Allows unlocking with audit logging", async () => {
    (rawPrisma.attendanceMonthLock.upsert as any).mockResolvedValue({
      id: "lock-1",
      tenantId: tenantA,
      year: 2026,
      month: 9,
      isLocked: false,
      notes: "HR correction granted",
    });

    const lock = await AttendanceService.setMonthLock(tenantA, 2026, 9, false, actorId, "HR correction granted");

    expect(lock.isLocked).toBe(false);
    expect(AuditService.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "ATTENDANCE_MONTH_UNLOCKED",
        tenantId: tenantA,
      }),
      expect.anything()
    );
  });

  it("3. Tenant Isolation: Lock on Tenant A does not lock Tenant B for the same month", async () => {
    // When queried for Tenant A: locked
    (rawPrisma.attendanceMonthLock.findUnique as any).mockImplementation((args: any) => {
      const q = args.where.tenantId_year_month;
      if (q.tenantId === tenantA && q.year === 2026 && q.month === 9) {
        return Promise.resolve({ isLocked: true });
      }
      return Promise.resolve(null); // Unlocked for other tenants
    });

    // Tenant A assertion fails with month lock
    await expect(
      AttendanceService.assertMonthUnlocked(tenantA, new Date("2026-09-15T00:00:00Z"))
    ).rejects.toThrow(/is locked/i);

    // Tenant B assertion succeeds without throwing
    await expect(
      AttendanceService.assertMonthUnlocked(tenantB, new Date("2026-09-15T00:00:00Z"))
    ).resolves.not.toThrow();
  });
});
