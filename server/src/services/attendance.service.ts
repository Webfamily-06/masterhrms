import { AttendanceStatus } from "@prisma/client";
import { rawPrisma, prisma } from "../prisma";
import { AuditService } from "./audit.service";
import { OutboxService } from "./outbox.service";
import { NotificationService } from "./notification.service";
import { broadcastToTenant } from "../socket";
import { buildDataScopeFilter, DataScope, UserContext } from "../lib/data-scope";

export class MonthLockedError extends Error {
  code = "PERIOD_LOCKED";
  status = 423;
  constructor(message = "This attendance period is locked and cannot be modified.") {
    super(message);
    this.name = "MonthLockedError";
  }
}

export interface PunchOptions {
  type: "check_in" | "check_out";
  timestamp?: Date | string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  source?: string;
  ipAddress?: string;
  deviceId?: string;
}

export class AttendanceService {
  /**
   * Check if a given month is locked for attendance mutations.
   */
  static async isMonthLocked(tenantId: string, date: Date): Promise<boolean> {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;

    const lock = await rawPrisma.attendanceMonthLock.findUnique({
      where: {
        tenantId_year_month: {
          tenantId,
          year,
          month,
        },
      },
    });

    return !!lock?.isLocked;
  }

  /**
   * Throw MonthLockedError if date falls in a locked month.
   */
  static async assertMonthUnlocked(tenantId: string, date: Date): Promise<void> {
    const locked = await this.isMonthLocked(tenantId, date);
    if (locked) {
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth() + 1;
      throw new MonthLockedError(`Attendance for ${month}/${year} is locked. Modifications are prohibited.`);
    }
  }

  /**
   * Lock or unlock an attendance month.
   */
  static async setMonthLock(
    tenantId: string,
    year: number,
    month: number,
    isLocked: boolean,
    userId: string,
    notes?: string
  ) {
    const now = new Date();
    const result = await rawPrisma.$transaction(async (tx) => {
      const lock = await tx.attendanceMonthLock.upsert({
        where: {
          tenantId_year_month: {
            tenantId,
            year,
            month,
          },
        },
        create: {
          tenantId,
          year,
          month,
          isLocked,
          lockedAt: isLocked ? now : now,
          lockedById: userId,
          unlockedAt: isLocked ? null : now,
          unlockedById: isLocked ? null : userId,
          notes,
        },
        update: {
          isLocked,
          lockedAt: isLocked ? now : undefined,
          lockedById: isLocked ? userId : undefined,
          unlockedAt: isLocked ? null : now,
          unlockedById: isLocked ? null : userId,
          notes,
        },
      });

      await AuditService.logAudit(
        {
          tenantId,
          userId,
          action: isLocked ? "ATTENDANCE_MONTH_LOCKED" : "ATTENDANCE_MONTH_UNLOCKED",
          entityType: "AttendanceMonthLock",
          entityId: lock.id,
          afterState: { year, month, isLocked, notes },
        },
        tx
      );

      await OutboxService.createEvent(
        {
          tenantId,
          eventType: isLocked ? "attendance.month_locked" : "attendance.month_unlocked",
          entityType: "AttendanceMonthLock",
          entityId: lock.id,
          actorId: userId,
          payload: { year, month, isLocked, notes },
        },
        tx
      );

      return lock;
    });

    broadcastToTenant(tenantId, isLocked ? "attendance.month_locked" : "attendance.month_unlocked", {
      year,
      month,
      isLocked,
    });

    return result;
  }

  /**
   * Helper to calculate distance in meters between two lat/lng points.
   */
  static calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Authoritative server punch (check-in / check-out).
   */
  static async recordPunch(tenantId: string, employeeId: string, options: PunchOptions) {
    const now = options.timestamp ? new Date(options.timestamp) : new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    // 1. Assert month is not locked
    await this.assertMonthUnlocked(tenantId, today);

    // 2. Fetch Employee with Branch & Department for policy resolution
    const employee = await rawPrisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        tenantId: true,
        firstName: true,
        lastName: true,
        employeeCode: true,
        branchId: true,
        departmentId: true,
        branch: { select: { id: true, name: true } },
      },
    });

    if (!employee || employee.tenantId !== tenantId) {
      throw new Error("Employee not found in tenant");
    }

    // 3. Resolve active shift roster or default shift
    const roster = await rawPrisma.shiftRoster.findUnique({
      where: {
        tenantId_employeeId_rosterDate: {
          tenantId,
          employeeId,
          rosterDate: today,
        },
      },
      include: { shift: true },
    });

    // 4. Resolve applicable attendance policy
    const policy = await rawPrisma.attendancePolicy.findFirst({
      where: {
        tenantId,
        OR: [
          { departmentId: employee.departmentId },
          { branchId: employee.branchId },
          { isDefault: true },
        ],
      },
      orderBy: { isDefault: "asc" }, // prefer departmental/branch specific over default
    });

    const graceMinutes = policy?.graceMinutes ?? 15;
    const halfDayHours = Number(policy?.halfDayHours ?? 4.0);
    const fullDayHours = Number(policy?.fullDayHours ?? 8.0);
    const isOvertimeAllowed = policy?.isOvertimeAllowed ?? true;
    const minOvertimeMinutes = policy?.minOvertimeMinutes ?? 60;

    // 5. Evaluate Geo-Fence if coordinates provided
    let geoFenceNote = "";
    let isGeoValid = true;
    if (options.latitude !== undefined && options.longitude !== undefined) {
      // Default corporate coordinates fallback (e.g., 19.0760, 72.8777)
      const officeLat = 19.0760;
      const officeLng = 72.8777;
      const allowedRadiusMeters = 500;
      const dist = this.calculateDistanceMeters(options.latitude, options.longitude, officeLat, officeLng);
      if (dist > allowedRadiusMeters) {
        isGeoValid = false;
        geoFenceNote = `[Geo-Warning: ${Math.round(dist)}m from perimeter]`;
      } else {
        geoFenceNote = `[Geo-Verified: ${Math.round(dist)}m]`;
      }
    }

    if (options.type === "check_out") {
      const existing = await rawPrisma.attendance.findUnique({
        where: {
          tenantId_employeeId_date: {
            tenantId,
            employeeId,
            date: today,
          },
        },
      });

      if (!existing || !existing.checkIn) {
        throw new Error("No check-in recorded for today to check out from.");
      }

      const diffMs = now.getTime() - existing.checkIn.getTime();
      const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

      let newStatus: AttendanceStatus = existing.status;
      if (totalHours < halfDayHours && existing.status !== "late") {
        newStatus = "half_day";
      }

      let overtimeMinutes = 0;
      if (isOvertimeAllowed && totalHours > fullDayHours) {
        const extraHours = totalHours - fullDayHours;
        const extraMinutes = Math.round(extraHours * 60);
        if (extraMinutes >= minOvertimeMinutes) {
          overtimeMinutes = extraMinutes;
        }
      }

      let earlyOutMinutes = 0;
      if (roster?.shift?.endTime) {
        const [endH, endM] = roster.shift.endTime.split(":").map(Number);
        const shiftEnd = new Date(today);
        shiftEnd.setUTCHours(endH, endM, 0, 0);
        if (now < shiftEnd) {
          earlyOutMinutes = Math.round((shiftEnd.getTime() - now.getTime()) / (60 * 1000));
        }
      }

      const combinedNotes = [existing.notes, geoFenceNote, options.notes].filter(Boolean).join(" | ");

      const updated = await rawPrisma.$transaction(async (tx) => {
        const record = await tx.attendance.update({
          where: { id: existing.id },
          data: {
            checkOut: now,
            hours: totalHours,
            status: newStatus,
            earlyOutMinutes: earlyOutMinutes || null,
            overtimeMinutes: overtimeMinutes || null,
            notes: combinedNotes || null,
            checkOutIp: options.ipAddress || null,
          },
        });

        await OutboxService.createEvent(
          {
            tenantId,
            eventType: "attendance.checked_out",
            entityType: "Attendance",
            entityId: record.id,
            actorId: employeeId,
            payload: {
              employeeId,
              date: today.toISOString(),
              checkOut: now.toISOString(),
              hours: totalHours,
              status: newStatus,
            },
          },
          tx
        );

        return record;
      });

      broadcastToTenant(tenantId, "attendance.checked_out", {
        employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
        hours: totalHours,
        status: newStatus,
        checkOut: now.toISOString(),
      });

      return { record: updated, action: "check_out", isGeoValid };
    }

    // CHECK-IN
    const existing = await rawPrisma.attendance.findUnique({
      where: {
        tenantId_employeeId_date: {
          tenantId,
          employeeId,
          date: today,
        },
      },
    });

    if (existing && existing.checkIn) {
      throw new Error("Already checked in for today.");
    }

    let status: AttendanceStatus = "present";
    let lateMinutes = 0;
    let lateNote = "";

    if (roster?.shift?.startTime && roster.shift.startTime !== "00:00") {
      const [shH, shM] = roster.shift.startTime.split(":").map(Number);
      const shiftStart = new Date(today);
      shiftStart.setUTCHours(shH, shM, 0, 0);
      const graceThreshold = new Date(shiftStart.getTime() + graceMinutes * 60 * 1000);

      if (now > graceThreshold) {
        status = "late";
        lateMinutes = Math.round((now.getTime() - shiftStart.getTime()) / (60 * 1000));
        lateNote = `Late by ${lateMinutes}m`;
      }
    }

    const combinedNotes = [lateNote, geoFenceNote, options.notes, options.deviceId ? `Device: ${options.deviceId}` : ""]
      .filter(Boolean)
      .join(" | ");

    const created = await rawPrisma.$transaction(async (tx) => {
      const record = await tx.attendance.upsert({
        where: {
          tenantId_employeeId_date: {
            tenantId,
            employeeId,
            date: today,
          },
        },
        create: {
          tenantId,
          employeeId,
          date: today,
          checkIn: now,
          status,
          lateMinutes: lateMinutes || null,
          shiftId: roster?.shiftId || null,
          policyId: policy?.id || null,
          source: options.source || "WEB",
          notes: combinedNotes || null,
          checkInIp: options.ipAddress || null,
        },
        update: {
          checkIn: now,
          status,
          lateMinutes: lateMinutes || null,
          shiftId: roster?.shiftId || undefined,
          policyId: policy?.id || undefined,
          source: options.source || undefined,
          notes: combinedNotes || undefined,
          checkInIp: options.ipAddress || undefined,
        },
      });

      await OutboxService.createEvent(
        {
          tenantId,
          eventType: "attendance.checked_in",
          entityType: "Attendance",
          entityId: record.id,
          actorId: employeeId,
          payload: {
            employeeId,
            date: today.toISOString(),
            checkIn: now.toISOString(),
            status,
            lateMinutes,
          },
        },
        tx
      );

      return record;
    });

    broadcastToTenant(tenantId, "attendance.checked_in", {
      employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
      status,
      checkIn: now.toISOString(),
    });

    return { record: created, action: "check_in", isGeoValid };
  }

  /**
   * Manual record creation / adjustment with required reason and MonthLock enforcement.
   */
  static async adjustAttendance(
    tenantId: string,
    data: {
      employeeId: string;
      date: string | Date;
      checkIn?: string | Date | null;
      checkOut?: string | Date | null;
      status?: AttendanceStatus;
      hours?: number;
      notes: string;
    },
    actorId: string
  ) {
    const targetDate = new Date(data.date);
    targetDate.setUTCHours(0, 0, 0, 0);

    await this.assertMonthUnlocked(tenantId, targetDate);

    const record = await rawPrisma.$transaction(async (tx) => {
      const existing = await tx.attendance.findUnique({
        where: {
          tenantId_employeeId_date: {
            tenantId,
            employeeId: data.employeeId,
            date: targetDate,
          },
        },
      });

      const updated = await tx.attendance.upsert({
        where: {
          tenantId_employeeId_date: {
            tenantId,
            employeeId: data.employeeId,
            date: targetDate,
          },
        },
        create: {
          tenantId,
          employeeId: data.employeeId,
          date: targetDate,
          checkIn: data.checkIn ? new Date(data.checkIn) : null,
          checkOut: data.checkOut ? new Date(data.checkOut) : null,
          status: data.status || "present",
          hours: data.hours ?? null,
          notes: data.notes,
          source: "MANUAL",
        },
        update: {
          checkIn: data.checkIn ? new Date(data.checkIn) : undefined,
          checkOut: data.checkOut ? new Date(data.checkOut) : undefined,
          status: data.status || undefined,
          hours: data.hours ?? undefined,
          notes: data.notes,
          source: "MANUAL",
        },
      });

      await AuditService.logAudit(
        {
          tenantId,
          userId: actorId,
          action: "ATTENDANCE_MANUAL_ADJUSTMENT",
          entityType: "Attendance",
          entityId: updated.id,
          beforeState: existing,
          afterState: updated,
        },
        tx
      );

      await OutboxService.createEvent(
        {
          tenantId,
          eventType: "attendance.updated",
          entityType: "Attendance",
          entityId: updated.id,
          actorId,
          payload: { employeeId: data.employeeId, date: targetDate.toISOString() },
        },
        tx
      );

      return updated;
    });

    broadcastToTenant(tenantId, "attendance.updated", {
      employeeId: data.employeeId,
      date: targetDate.toISOString(),
    });

    return record;
  }
}
