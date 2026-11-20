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
   * Resolves the configured timezone for a tenant (fallback to Asia/Kolkata).
   */
  static async resolveTenantTimezone(tenantId: string): Promise<string> {
    try {
      const tenant = await rawPrisma.tenant.findUnique({
        where: { id: tenantId },
        select: { timezone: true },
      });
      if (tenant?.timezone && this.isValidTimezone(tenant.timezone)) {
        return tenant.timezone;
      }
    } catch {
      // Fallback on error
    }
    return "Asia/Kolkata";
  }

  /**
   * Validates if a timezone string is recognized by Intl.DateTimeFormat.
   */
  static isValidTimezone(tz: string): boolean {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Decomposes a Date into calendar parts in the given timezone.
   */
  static getZonedParts(date: Date, timeZone: string) {
    const safeTz = this.isValidTimezone(timeZone) ? timeZone : "Asia/Kolkata";
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: safeTz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || "0";
    const year = parseInt(getPart("year"), 10);
    const month = parseInt(getPart("month"), 10);
    const day = parseInt(getPart("day"), 10);
    let hour = parseInt(getPart("hour"), 10);
    if (hour === 24) hour = 0;
    const minute = parseInt(getPart("minute"), 10);
    const second = parseInt(getPart("second"), 10);
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { year, month, day, hour, minute, second, dateStr };
  }

  /**
   * Converts local calendar date and time in a specified timezone to a UTC Date.
   */
  static zonedTimeToUtc(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number = 0,
    timeZone: string
  ): Date {
    const safeTz = this.isValidTimezone(timeZone) ? timeZone : "Asia/Kolkata";
    const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: safeTz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(guess);

    const getP = (t: string) => parts.find((p) => p.type === t)?.value || "0";
    let zHour = parseInt(getP("hour"), 10);
    if (zHour === 24) zHour = 0;
    const zDate = new Date(
      Date.UTC(
        parseInt(getP("year"), 10),
        parseInt(getP("month"), 10) - 1,
        parseInt(getP("day"), 10),
        zHour,
        parseInt(getP("minute"), 10),
        parseInt(getP("second"), 10)
      )
    );

    const diff = guess.getTime() - zDate.getTime();
    return new Date(guess.getTime() + diff);
  }

  /**
   * Produces a normalized UTC Date representing the calendar date (@db.Date in Prisma).
   */
  static toPrismaDate(year: number, month: number, day: number): Date {
    return new Date(Date.UTC(year, month - 1, day));
  }

  /**
   * Helper to parse shift definition times and identify overnight status.
   */
  static parseShift(shift?: { id?: string; name?: string; startTime?: string; endTime?: string } | null) {
    const startTime = shift?.startTime || "09:30";
    const endTime = shift?.endTime || "18:30";
    const [shH, shM] = startTime.split(":").map((v) => parseInt(v, 10) || 0);
    const [endH, endM] = endTime.split(":").map((v) => parseInt(v, 10) || 0);
    const startMinutes = shH * 60 + shM;
    const endMinutes = endH * 60 + endM;
    const isOvernight = endMinutes <= startMinutes;

    return {
      id: shift?.id,
      name: shift?.name || "General Shift",
      startTime,
      endTime,
      startMinutes,
      endMinutes,
      isOvernight,
    };
  }

  /**
   * Authoritative server punch (check-in / check-out).
   */
  static async recordPunch(tenantId: string, employeeId: string, options: PunchOptions) {
    const now = options.timestamp ? new Date(options.timestamp) : new Date();

    // 1. Resolve Tenant Timezone and local calendar date
    const timeZone = await this.resolveTenantTimezone(tenantId);
    const zoned = this.getZonedParts(now, timeZone);
    const today = this.toPrismaDate(zoned.year, zoned.month, zoned.day);

    // 2. Assert month is not locked
    await this.assertMonthUnlocked(tenantId, today);

    // 3. Fetch Employee with Branch & Department for policy resolution
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
        branch: { select: { id: true, name: true, latitude: true, longitude: true, geofenceRadius: true } },
      },
    });

    if (!employee || employee.tenantId !== tenantId) {
      throw new Error("Employee not found in tenant");
    }

    // 4. Resolve applicable attendance policy
    const policyConditions: any[] = [{ isDefault: true }];
    if (employee.departmentId) policyConditions.push({ departmentId: employee.departmentId });
    if (employee.branchId) policyConditions.push({ branchId: employee.branchId });

    const policy = await rawPrisma.attendancePolicy.findFirst({
      where: {
        tenantId,
        OR: policyConditions,
      },
      orderBy: { isDefault: "asc" }, // prefer departmental/branch specific over default
    });

    const graceMinutes = policy?.graceMinutes ?? 15;
    const halfDayHours = Number(policy?.halfDayHours ?? 4.0);
    const fullDayHours = Number(policy?.fullDayHours ?? 8.0);
    const isOvertimeAllowed = policy?.isOvertimeAllowed ?? true;
    const minOvertimeMinutes = policy?.minOvertimeMinutes ?? 60;

    // 5. Evaluate Geo-Fence if coordinates provided (GAP-DB-API-003)
    let geoFenceNote = "";
    let isGeoValid = true;
    if (options.latitude !== undefined && options.longitude !== undefined) {
      // Dynamic branch geofencing: prefer assigned branch coordinates over static corporate defaults
      const officeLat = employee.branch?.latitude ?? 19.076;
      const officeLng = employee.branch?.longitude ?? 72.8777;
      const allowedRadiusMeters = employee.branch?.geofenceRadius ?? 500;
      const dist = this.calculateDistanceMeters(options.latitude, options.longitude, officeLat, officeLng);
      const branchLabel = employee.branch?.name ? ` (${employee.branch.name})` : "";
      if (dist > allowedRadiusMeters) {
        isGeoValid = false;
        geoFenceNote = `[Geo-Warning: ${Math.round(dist)}m from perimeter (${allowedRadiusMeters}m allowed)${branchLabel}]`;
      } else {
        geoFenceNote = `[Geo-Verified: ${Math.round(dist)}m${branchLabel}]`;
      }
    }

    if (options.type === "check_out") {
      let existing = await rawPrisma.attendance.findUnique({
        where: {
          tenantId_employeeId_date: {
            tenantId,
            employeeId,
            date: today,
          },
        },
      });

      // Midnight Rollover Support (TASK-P2-05): For overnight shifts crossing midnight,
      // if no check-in exists for today or today is already checked out, check yesterday for open check-in
      if (!existing || !existing.checkIn || existing.checkOut) {
        const yesterday = new Date(today.getTime() - 86400000);
        const openYesterday = await rawPrisma.attendance.findUnique({
          where: {
            tenantId_employeeId_date: {
              tenantId,
              employeeId,
              date: yesterday,
            },
          },
        });
        if (openYesterday && openYesterday.checkIn && !openYesterday.checkOut) {
          existing = openYesterday;
        }
      }

      if (!existing || !existing.checkIn) {
        throw new Error("No check-in recorded for today to check out from.");
      }

      // Resolve shift for the shift date
      const shiftDate = existing.date;
      const sYear = shiftDate.getUTCFullYear();
      const sMonth = shiftDate.getUTCMonth() + 1;
      const sDay = shiftDate.getUTCDate();

      const roster = await rawPrisma.shiftRoster.findUnique({
        where: {
          tenantId_employeeId_rosterDate: {
            tenantId,
            employeeId,
            rosterDate: shiftDate,
          },
        },
        include: { shift: true },
      });

      let shiftDef = roster?.shift;
      if (!shiftDef && existing.shiftId) {
        shiftDef = await rawPrisma.shiftDefinition.findUnique({
          where: { id: existing.shiftId },
        });
      }
      if (!shiftDef) {
        shiftDef = await rawPrisma.shiftDefinition.findFirst({
          where: { tenantId },
          orderBy: { createdAt: "asc" },
        });
      }

      const shiftInfo = this.parseShift(shiftDef);

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
      if (shiftInfo.endTime) {
        const [endH, endM] = shiftInfo.endTime.split(":").map(Number);
        let shiftEndUtc: Date;
        if (shiftInfo.isOvernight) {
          const nextDay = new Date(Date.UTC(sYear, sMonth - 1, sDay + 1));
          shiftEndUtc = this.zonedTimeToUtc(
            nextDay.getUTCFullYear(),
            nextDay.getUTCMonth() + 1,
            nextDay.getUTCDate(),
            endH,
            endM,
            0,
            timeZone
          );
        } else {
          shiftEndUtc = this.zonedTimeToUtc(sYear, sMonth, sDay, endH, endM, 0, timeZone);
        }

        if (now.getTime() < shiftEndUtc.getTime()) {
          earlyOutMinutes = Math.round((shiftEndUtc.getTime() - now.getTime()) / (60 * 1000));
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
              date: shiftDate.toISOString(),
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
    // Determine target shift date: support late arrivals on overnight shifts
    const yesterday = new Date(today.getTime() - 86400000);
    let targetDate = today;

    let roster = await rawPrisma.shiftRoster.findUnique({
      where: {
        tenantId_employeeId_rosterDate: {
          tenantId,
          employeeId,
          rosterDate: today,
        },
      },
      include: { shift: true },
    });

    // Overnight shift rollover detection for late clock-ins:
    // If the local hour is in early morning (e.g. before 12:00 PM),
    // and yesterday had an overnight shift assigned with NO check-in,
    // and today doesn't already have an assigned morning shift starting now,
    // this punch belongs to yesterday's overnight shift!
    if (zoned.hour < 12) {
      const yesterdayRoster = await rawPrisma.shiftRoster.findUnique({
        where: {
          tenantId_employeeId_rosterDate: {
            tenantId,
            employeeId,
            rosterDate: yesterday,
          },
        },
        include: { shift: true },
      });
      if (yesterdayRoster?.shift) {
        const yShift = this.parseShift(yesterdayRoster.shift);
        if (yShift.isOvernight) {
          const existingYesterday = await rawPrisma.attendance.findUnique({
            where: {
              tenantId_employeeId_date: {
                tenantId,
                employeeId,
                date: yesterday,
              },
            },
          });
          const existingToday = await rawPrisma.attendance.findUnique({
            where: {
              tenantId_employeeId_date: {
                tenantId,
                employeeId,
                date: today,
              },
            },
          });

          if ((!existingYesterday || !existingYesterday.checkIn) && (!existingToday || !existingToday.checkIn)) {
            const todayShift = roster?.shift ? this.parseShift(roster.shift) : null;
            if (!todayShift || todayShift.startMinutes > (zoned.hour * 60 + zoned.minute)) {
              targetDate = yesterday;
              roster = yesterdayRoster;
            }
          }
        }
      }
    }

    const existing = await rawPrisma.attendance.findUnique({
      where: {
        tenantId_employeeId_date: {
          tenantId,
          employeeId,
          date: targetDate,
        },
      },
    });

    if (existing && existing.checkIn) {
      throw new Error("Already checked in for today.");
    }

    // Resolve shift definition
    let shiftDef = roster?.shift;
    if (!shiftDef) {
      shiftDef = await rawPrisma.shiftDefinition.findFirst({
        where: { tenantId },
        orderBy: { createdAt: "asc" },
      });
    }

    const shiftInfo = this.parseShift(shiftDef);

    let status: AttendanceStatus = "present";
    let lateMinutes = 0;
    let lateNote = "";

    if (shiftInfo.startTime && shiftInfo.startTime !== "00:00") {
      const [shH, shM] = shiftInfo.startTime.split(":").map(Number);
      const tYear = targetDate.getUTCFullYear();
      const tMonth = targetDate.getUTCMonth() + 1;
      const tDay = targetDate.getUTCDate();

      const shiftStartUtc = this.zonedTimeToUtc(tYear, tMonth, tDay, shH, shM, 0, timeZone);
      const graceThresholdUtc = new Date(shiftStartUtc.getTime() + graceMinutes * 60 * 1000);

      if (now.getTime() > graceThresholdUtc.getTime()) {
        status = "late";
        lateMinutes = Math.max(0, Math.round((now.getTime() - shiftStartUtc.getTime()) / (60 * 1000)));
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
            date: targetDate,
          },
        },
        create: {
          tenantId,
          employeeId,
          date: targetDate,
          checkIn: now,
          status,
          lateMinutes: lateMinutes || null,
          shiftId: shiftInfo.id || null,
          policyId: policy?.id || null,
          source: options.source || "WEB",
          notes: combinedNotes || null,
          checkInIp: options.ipAddress || null,
        },
        update: {
          checkIn: now,
          status,
          lateMinutes: lateMinutes || null,
          shiftId: shiftInfo.id || undefined,
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
            date: targetDate.toISOString(),
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

  /**
   * Authoritative Attendance Regularization Decision with Month-Lock and Segregation of Duties.
   */
  static async decideRegularization(
    tenantId: string,
    requestId: string,
    action: "approve" | "reject",
    reviewerEmployeeId: string,
    reviewerUserId: string,
    reviewerRoles: string[] = [],
    comments?: string,
    options?: { tx?: any; suppressNotifications?: boolean }
  ) {
    const db = options?.tx || rawPrisma || prisma;

    const reg = await db.attendanceRegularization.findUnique({
      where: { id: requestId },
      include: { employee: true },
    });

    if (!reg || reg.tenantId !== tenantId) {
      throw new Error("Regularization request not found.");
    }

    if (reg.status !== "PENDING") {
      throw new Error(`Regularization request has already been ${reg.status.toLowerCase()}.`);
    }

    // Segregation of duties: Employee cannot approve their own regularization
    if (reg.employeeId === reviewerEmployeeId || (reg.employee?.userId && reg.employee.userId === reviewerUserId)) {
      throw new Error("Segregation of duties violation: You cannot approve your own regularization request.");
    }

    const isHrAdmin = Boolean(reviewerRoles.includes("hr_admin") || reviewerRoles.includes("super_admin"));
    const isReportingManager = Boolean(reviewerEmployeeId && reg.employee?.managerId === reviewerEmployeeId);

    // Check delegation
    let isDelegate = false;
    if (reg.employee?.managerId && reviewerEmployeeId) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const delegation = await db.approvalDelegation.findFirst({
        where: {
          tenantId,
          managerId: reg.employee.managerId,
          delegateId: reviewerEmployeeId,
          status: "ACTIVE",
          startDate: { lte: today },
          endDate: { gte: today },
        },
      });
      if (delegation) isDelegate = true;
    }

    if (!isReportingManager && !isHrAdmin && !isDelegate) {
      throw new Error("Forbidden: You are not authorized to approve this regularization request.");
    }

    if (action === "reject" && (!comments || !comments.trim())) {
      throw new Error("A clear rejection reason is required when rejecting a regularization request.");
    }

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

    // Enforce Month Lock Verification on manager regularization approvals
    if (newStatus === "APPROVED") {
      await this.assertMonthUnlocked(reg.tenantId, reg.attendanceDate);
    }

    const executeDecision = async (tx: any) => {
      // Concurrency claim
      const claimed = await tx.attendanceRegularization.updateMany({
        where: { id: requestId, tenantId, status: "PENDING" },
        data: {
          status: newStatus,
          approverId: reviewerEmployeeId,
          reviewedAt: new Date(),
          reviewComments: comments?.trim() || undefined,
        },
      });

      if (claimed.count === 0) {
        throw new Error("Regularization request was already processed by another reviewer.");
      }

      // If approved, update or insert into attendance table
      if (newStatus === "APPROVED" && (reg.proposedIn || reg.proposedOut)) {
        await tx.attendance.upsert({
          where: {
            tenantId_employeeId_date: {
              tenantId: reg.tenantId,
              employeeId: reg.employeeId,
              date: reg.attendanceDate,
            },
          },
          update: {
            checkIn: reg.proposedIn || undefined,
            checkOut: reg.proposedOut || undefined,
            status: "present",
          },
          create: {
            tenantId: reg.tenantId,
            employeeId: reg.employeeId,
            date: reg.attendanceDate,
            checkIn: reg.proposedIn,
            checkOut: reg.proposedOut,
            status: "present",
          },
        });
      }

      const updated = await tx.attendanceRegularization.findUnique({
        where: { id: requestId },
        include: { employee: true },
      });

      await AuditService.logMutation({
        tenantId,
        actorId: reviewerUserId,
        action: newStatus === "APPROVED" ? "REGULARIZATION_APPROVED" : "REGULARIZATION_REJECTED",
        entityType: "AttendanceRegularization",
        entityId: requestId,
        metadata: {
          employeeId: reg.employeeId,
          attendanceDate: reg.attendanceDate,
          comments,
        },
      });

      await OutboxService.createEvent(
        {
          tenantId,
          eventType: newStatus === "APPROVED" ? "attendance.regularized" : "attendance.regularization_rejected",
          entityType: "AttendanceRegularization",
          entityId: requestId,
          actorId: reviewerUserId,
          payload: { employeeId: reg.employeeId, status: newStatus },
        },
        tx
      );

      return updated!;
    };

    const updated = options?.tx
      ? await executeDecision(options.tx)
      : await rawPrisma.$transaction(executeDecision);

    if (!options?.suppressNotifications && reg.employee?.userId) {
      NotificationService.createNotification({
        tenantId,
        userId: reg.employee.userId,
        title: newStatus === "APPROVED" ? "Attendance Regularization Approved" : "Attendance Regularization Rejected",
        message: newStatus === "APPROVED"
          ? "Your attendance regularization request was approved."
          : `Your attendance regularization request was rejected: "${comments?.trim()}"`,
        type: "ATTENDANCE_REGULARIZATION",
        actionUrl: "/me/attendance",
      }).catch(() => {});
    }

    return updated;
  }
}
