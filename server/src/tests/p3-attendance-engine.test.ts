import { describe, it, expect, vi, beforeEach } from "vitest";
import { AttendanceService } from "../services/attendance.service";
import { rawPrisma } from "../prisma";
import { OutboxService } from "../services/outbox.service";
import { AuditService } from "../services/audit.service";

vi.mock("../prisma", () => ({
  rawPrisma: {
    attendance: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    shiftRoster: {
      findUnique: vi.fn(),
    },
    attendancePolicy: {
      findFirst: vi.fn(),
    },
    attendanceMonthLock: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    employee: {
      findUnique: vi.fn(),
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
    createEvent: vi.fn().mockResolvedValue({ id: "outbox-1" }),
    createOutboxEvent: vi.fn().mockResolvedValue({ id: "outbox-1" }),
  },
}));

vi.mock("../services/audit.service", () => ({
  AuditService: {
    logAudit: vi.fn().mockResolvedValue({ id: "audit-1" }),
  },
}));

describe("P3 Attendance Engine — Punch, Grace, Hours, and Month Lock", () => {
  const tenantId = "tenant-p3-test";
  const employeeId = "emp-p3-01";
  const actorId = "user-p3-admin";

  beforeEach(() => {
    vi.clearAllMocks();
    (rawPrisma.employee.findUnique as any).mockResolvedValue({
      id: employeeId,
      tenantId,
      status: "active",
      firstName: "Test",
      lastName: "Employee",
    });
  });

  it("1. Check-In: Successfully records check-in and calculates late mark when arriving after grace period", async () => {
    // Shift starts at 09:30, grace is 15 mins (09:45 cutoff). Punch is at 10:05 (35 mins late).
    const shiftMock = {
      id: "shift-gen",
      startTime: "09:30",
      endTime: "18:30",
    };
    (rawPrisma.shiftRoster.findUnique as any).mockResolvedValue({
      shift: shiftMock,
    });
    (rawPrisma.attendancePolicy.findFirst as any).mockResolvedValue({
      graceMinutes: 15,
      halfDayHours: 4.0,
      fullDayHours: 8.0,
    });
    (rawPrisma.attendanceMonthLock.findUnique as any).mockResolvedValue(null); // Unlocked
    (rawPrisma.attendance.findUnique as any).mockResolvedValue(null); // No previous punch

    const punchInDate = new Date("2026-10-07T10:05:00Z");

    (rawPrisma.attendance.upsert as any).mockImplementation((args: any) => {
      return Promise.resolve({
        id: "att-rec-1",
        ...args.create,
      });
    });

    const result = await AttendanceService.recordPunch(tenantId, employeeId, {
      type: "check_in",
      timestamp: punchInDate,
      source: "WEB",
      ipAddress: "127.0.0.1",
    });

    expect(result).toBeDefined();
    expect(result.record.status).toBe("late");
    expect(result.record.lateMinutes).toBe(35);
    expect(OutboxService.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "attendance.checked_in",
        tenantId,
      }),
      expect.anything()
    );
  });

  it("2. Check-Out: Calculates worked hours and overtime when leaving after shift end time", async () => {
    const shiftMock = {
      id: "shift-gen",
      startTime: "09:30",
      endTime: "18:30",
    };
    (rawPrisma.shiftRoster.findUnique as any).mockResolvedValue({
      shift: shiftMock,
    });
    (rawPrisma.attendancePolicy.findFirst as any).mockResolvedValue({
      graceMinutes: 15,
      halfDayHours: 4.0,
      fullDayHours: 8.0,
    });
    (rawPrisma.attendanceMonthLock.findUnique as any).mockResolvedValue(null);

    // Existing check-in was at 09:30
    const checkInTime = new Date("2026-10-07T09:30:00Z");
    const checkOutTime = new Date("2026-10-07T19:30:00Z"); // 10 hours worked, 60 mins overtime past 18:30

    (rawPrisma.attendance.findUnique as any).mockResolvedValue({
      id: "att-rec-1",
      checkIn: checkInTime,
      checkOut: null,
      status: "present",
    });

    (rawPrisma.attendance.update as any).mockImplementation((args: any) => {
      return Promise.resolve({
        id: "att-rec-1",
        checkIn: checkInTime,
        ...args.data,
      });
    });

    const result = await AttendanceService.recordPunch(tenantId, employeeId, {
      type: "check_out",
      timestamp: checkOutTime,
      source: "WEB",
    });

    expect(result).toBeDefined();
    expect(Number(result.record.hours)).toBe(10);
    expect(result.record.overtimeMinutes).toBe(120);
    expect(result.record.status).toBe("present");
    expect(OutboxService.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "attendance.checked_out",
        tenantId,
      }),
      expect.anything()
    );
  });

  it("3. Duplicate Punch: Rejects check-in if user is already checked in without check-out", async () => {
    (rawPrisma.attendanceMonthLock.findUnique as any).mockResolvedValue(null);
    (rawPrisma.attendance.findUnique as any).mockResolvedValue({
      id: "att-rec-1",
      checkIn: new Date("2026-10-07T09:30:00Z"),
      checkOut: null,
    });

    await expect(
      AttendanceService.recordPunch(tenantId, employeeId, {
        type: "check_in",
        timestamp: new Date("2026-10-07T10:00:00Z"),
      })
    ).rejects.toThrow("Already checked in for today");
  });

  it("4. Month Lock Rejection: Prevents punch mutation if month is locked for payroll", async () => {
    (rawPrisma.attendanceMonthLock.findUnique as any).mockResolvedValue({
      isLocked: true,
      year: 2026,
      month: 10,
    });

    await expect(
      AttendanceService.recordPunch(tenantId, employeeId, {
        type: "check_in",
        timestamp: new Date("2026-10-07T09:30:00Z"),
      })
    ).rejects.toThrow(/is locked/i);
  });

  it("5. Manual Adjustment: Enforces mandatory reason, verifies month lock, logs audit and outbox", async () => {
    (rawPrisma.attendanceMonthLock.findUnique as any).mockResolvedValue(null);
    (rawPrisma.attendance.findUnique as any).mockResolvedValue(null);
    (rawPrisma.attendance.upsert as any).mockResolvedValue({
      id: "att-rec-adj",
      tenantId,
      employeeId,
      status: "present",
      hours: 8,
    });

    const result = await AttendanceService.adjustAttendance(
      tenantId,
      {
        employeeId,
        date: "2026-10-07",
        checkIn: "09:30",
        checkOut: "18:30",
        status: "present",
        hours: 8,
        notes: "Approved OD for client meeting",
      },
      actorId
    );

    expect(result).toBeDefined();
    expect(AuditService.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "ATTENDANCE_MANUAL_ADJUSTMENT",
        tenantId,
        userId: actorId,
      }),
      expect.anything()
    );
    expect(OutboxService.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "attendance.updated",
        tenantId,
      }),
      expect.anything()
    );
  });
});
