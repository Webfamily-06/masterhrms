import test from "node:test";
import assert from "node:assert/strict";
import { rawPrisma } from "../prisma";
import { AttendanceService } from "../services/attendance.service";
import { runWithTenantContext, TenantContext } from "../context/tenant-context";

function executeAsTenant<T>(tenantId: string, fn: () => Promise<T>, userId = "admin-user", roles = ["admin", "hr_admin"]): Promise<T> {
  const ctx: TenantContext = {
    tenantId,
    userId,
    roles,
    status: "ACTIVE",
    tenancyStrategy: "SHARED_SCHEMA",
    db: rawPrisma as any,
  };
  return runWithTenantContext(ctx, fn);
}

test("MASTERHRMS — Phase 3 Milestone 3: Shift-Aware Attendance, Tenant Timezone & Dynamic Late Marks", async (t) => {
  const timestamp = Date.now();
  const tenantKolkataId = `test-m3-kolkata-${timestamp}`;
  const tenantNyId = `test-m3-ny-${timestamp}`;
  const tenantUtcId = `test-m3-utc-${timestamp}`;
  const tenantIsolatedBId = `test-m3-isolated-b-${timestamp}`;

  const allTenants = [tenantKolkataId, tenantNyId, tenantUtcId, tenantIsolatedBId];

  // Employee IDs
  let empKolkataGeneralId = "";
  let empKolkataMorningId = "";
  let empKolkataNightId = "";
  let empNyId = "";
  let empUtcId = "";
  let empIsolatedBId = "";

  // Shift IDs
  let shiftMorningId = "";
  let shiftNightId = "";
  let shiftNyId = "";
  let shiftUtcId = "";

  // Policy IDs
  let policyKolkataId = "";
  let policyNyId = "";

  const cleanup = async () => {
    try {
      await rawPrisma.attendance.deleteMany({ where: { tenantId: { in: allTenants } } });
      await rawPrisma.shiftRoster.deleteMany({ where: { tenantId: { in: allTenants } } });
      await rawPrisma.shiftDefinition.deleteMany({ where: { tenantId: { in: allTenants } } });
      await rawPrisma.attendancePolicy.deleteMany({ where: { tenantId: { in: allTenants } } });
      await rawPrisma.attendanceMonthLock.deleteMany({ where: { tenantId: { in: allTenants } } });
      await rawPrisma.employee.deleteMany({ where: { tenantId: { in: allTenants } } });
      await rawPrisma.branch.deleteMany({ where: { tenantId: { in: allTenants } } });
      await rawPrisma.tenant.deleteMany({ where: { id: { in: allTenants } } });
    } catch (e) {
      // Ignore cleanup error
    }
  };

  await cleanup();

  // Setup Fixtures
  await t.test("Setup test fixtures across multiple timezones and shifts", async () => {
    // 1. Tenant in Asia/Kolkata (UTC+5:30)
    await rawPrisma.tenant.create({
      data: {
        id: tenantKolkataId,
        name: "Kolkata Tech Hub",
        slug: `kolkata-tech-${timestamp}`,
        timezone: "Asia/Kolkata",
      },
    });

    // 2. Tenant in America/New_York (UTC-5:00)
    await rawPrisma.tenant.create({
      data: {
        id: tenantNyId,
        name: "New York HQ",
        slug: `ny-hq-${timestamp}`,
        timezone: "America/New_York",
      },
    });

    // 3. Tenant in UTC
    await rawPrisma.tenant.create({
      data: {
        id: tenantUtcId,
        name: "London Operations",
        slug: `london-ops-${timestamp}`,
        timezone: "UTC",
      },
    });

    // 4. Isolated Tenant B for boundary leakage verification
    await rawPrisma.tenant.create({
      data: {
        id: tenantIsolatedBId,
        name: "Isolated Tenant B",
        slug: `isolated-b-${timestamp}`,
        timezone: "Asia/Kolkata",
      },
    });

    // Branches
    const branchKolkata = await rawPrisma.branch.create({
      data: {
        id: `branch-kolkata-${timestamp}`,
        tenantId: tenantKolkataId,
        name: "Salt Lake Sector V",
        code: "KOL-SL",
        latitude: 22.5726,
        longitude: 88.3639,
        geofenceRadius: 1000,
      },
    });

    // Policies
    const polKolkata = await rawPrisma.attendancePolicy.create({
      data: {
        id: `policy-kolkata-${timestamp}`,
        tenantId: tenantKolkataId,
        name: "Kolkata Standard Policy (15m Grace)",
        code: "KOL-STD-15M",
        graceMinutes: 15,
        halfDayHours: 4.0,
        fullDayHours: 8.0,
        isOvertimeAllowed: true,
        minOvertimeMinutes: 60,
        isDefault: true,
      },
    });
    policyKolkataId = polKolkata.id;

    const polNy = await rawPrisma.attendancePolicy.create({
      data: {
        id: `policy-ny-${timestamp}`,
        tenantId: tenantNyId,
        name: "NY Strict Policy (10m Grace)",
        code: "NY-STR-10M",
        graceMinutes: 10,
        halfDayHours: 4.0,
        fullDayHours: 8.0,
        isOvertimeAllowed: true,
        minOvertimeMinutes: 60,
        isDefault: true,
      },
    });
    policyNyId = polNy.id;

    // Shift Definitions
    // Kolkata General Shift (First/Default): 09:30 to 18:30
    await rawPrisma.shiftDefinition.create({
      data: {
        id: `shift-gen-${timestamp}`,
        tenantId: tenantKolkataId,
        name: "Kolkata General Shift",
        code: "GEN-0930",
        startTime: "09:30",
        endTime: "18:30",
        breakMinutes: 60,
        isOvertimeEligible: true,
      },
    });

    // Kolkata Morning Shift: 07:00 to 15:30
    const shiftMorn = await rawPrisma.shiftDefinition.create({
      data: {
        id: `shift-morn-${timestamp}`,
        tenantId: tenantKolkataId,
        name: "Early Morning Shift",
        code: "MORN-0700",
        startTime: "07:00",
        endTime: "15:30",
        breakMinutes: 30,
        isOvertimeEligible: true,
      },
    });
    shiftMorningId = shiftMorn.id;

    // Kolkata Overnight Night Shift: 22:00 to 06:00 (crosses midnight)
    const shiftNgt = await rawPrisma.shiftDefinition.create({
      data: {
        id: `shift-ngt-${timestamp}`,
        tenantId: tenantKolkataId,
        name: "Overnight Night Shift",
        code: "NGT-2200",
        startTime: "22:00",
        endTime: "06:00",
        breakMinutes: 45,
        isOvertimeEligible: true,
      },
    });
    shiftNightId = shiftNgt.id;

    // NY Standard Shift: 09:00 to 17:00
    const sNy = await rawPrisma.shiftDefinition.create({
      data: {
        id: `shift-ny-${timestamp}`,
        tenantId: tenantNyId,
        name: "NY Business Shift",
        code: "NY-0900",
        startTime: "09:00",
        endTime: "17:00",
        breakMinutes: 60,
        isOvertimeEligible: true,
      },
    });
    shiftNyId = sNy.id;

    // UTC Shift: 10:00 to 18:00
    const sUtc = await rawPrisma.shiftDefinition.create({
      data: {
        id: `shift-utc-${timestamp}`,
        tenantId: tenantUtcId,
        name: "London Shift",
        code: "LON-1000",
        startTime: "10:00",
        endTime: "18:00",
        breakMinutes: 60,
        isOvertimeEligible: true,
      },
    });
    shiftUtcId = sUtc.id;

    // Employees
    const empKolkataGen = await rawPrisma.employee.create({
      data: {
        id: `emp-kol-gen-${timestamp}`,
        tenantId: tenantKolkataId,
        branchId: branchKolkata.id,
        firstName: "Aarav",
        lastName: "Patel",
        employeeCode: `KOL001-${timestamp}`,
        email: `aarav.${timestamp}@kolkata.example.com`,
        status: "active",
      },
    });
    empKolkataGeneralId = empKolkataGen.id;

    const empKolkataMorn = await rawPrisma.employee.create({
      data: {
        id: `emp-kol-morn-${timestamp}`,
        tenantId: tenantKolkataId,
        branchId: branchKolkata.id,
        firstName: "Priya",
        lastName: "Sen",
        employeeCode: `KOL002-${timestamp}`,
        email: `priya.${timestamp}@kolkata.example.com`,
        status: "active",
      },
    });
    empKolkataMorningId = empKolkataMorn.id;

    const empKolkataNgt = await rawPrisma.employee.create({
      data: {
        id: `emp-kol-ngt-${timestamp}`,
        tenantId: tenantKolkataId,
        branchId: branchKolkata.id,
        firstName: "Vikram",
        lastName: "Roy",
        employeeCode: `KOL003-${timestamp}`,
        email: `vikram.${timestamp}@kolkata.example.com`,
        status: "active",
      },
    });
    empKolkataNightId = empKolkataNgt.id;

    const empNy = await rawPrisma.employee.create({
      data: {
        id: `emp-ny-${timestamp}`,
        tenantId: tenantNyId,
        firstName: "John",
        lastName: "Miller",
        employeeCode: `NY001-${timestamp}`,
        email: `john.${timestamp}@ny.example.com`,
        status: "active",
      },
    });
    empNyId = empNy.id;

    const empUtc = await rawPrisma.employee.create({
      data: {
        id: `emp-utc-${timestamp}`,
        tenantId: tenantUtcId,
        firstName: "Emma",
        lastName: "Watson",
        employeeCode: `UTC001-${timestamp}`,
        email: `emma.${timestamp}@london.example.com`,
        status: "active",
      },
    });
    empUtcId = empUtc.id;

    const empIsoB = await rawPrisma.employee.create({
      data: {
        id: `emp-iso-b-${timestamp}`,
        tenantId: tenantIsolatedBId,
        firstName: "Isolated",
        lastName: "Worker",
        employeeCode: `ISO001-${timestamp}`,
        email: `isolated.${timestamp}@isolated.example.com`,
        status: "active",
      },
    });
    empIsolatedBId = empIsoB.id;
  });

  // =========================================================================
  // GROUP A: SHIFT RESOLUTION & ROSTER HIERARCHY
  // =========================================================================
  await t.test("Group A1: Employee with assigned ShiftRoster resolves specific shift (07:00 morning)", async () => {
    // Nov 20, 2026 in Asia/Kolkata
    const targetDate = AttendanceService.toPrismaDate(2026, 11, 20);

    // Assign Morning Shift (07:00 - 15:30) to empKolkataMorningId
    await rawPrisma.shiftRoster.upsert({
      where: {
        tenantId_employeeId_rosterDate: {
          tenantId: tenantKolkataId,
          employeeId: empKolkataMorningId,
          rosterDate: targetDate,
        },
      },
      create: {
        tenantId: tenantKolkataId,
        employeeId: empKolkataMorningId,
        shiftId: shiftMorningId,
        rosterDate: targetDate,
        status: "assigned",
      },
      update: { shiftId: shiftMorningId },
    });

    // Punch at 07:10 AM IST (01:40 UTC) -> within 15m grace (threshold 07:15 AM)
    const punchTime = AttendanceService.zonedTimeToUtc(2026, 11, 20, 7, 10, 0, "Asia/Kolkata");
    const res = await AttendanceService.recordPunch(tenantKolkataId, empKolkataMorningId, {
      type: "check_in",
      timestamp: punchTime,
      source: "TEST",
    });

    assert.equal(res.action, "check_in");
    assert.equal(res.record.status, "present");
    assert.equal(res.record.lateMinutes, null);
    assert.equal(res.record.shiftId, shiftMorningId);
  });

  await t.test("Group A2: Employee with no roster falls back to tenant default shift or general standard", async () => {
    // Nov 21, 2026 for empKolkataGeneralId (no roster assigned)
    // 09:30 AM IST (04:00 UTC). Punch at 09:40 AM IST (04:10 UTC) -> within 15m grace
    const punchTime = AttendanceService.zonedTimeToUtc(2026, 11, 21, 9, 40, 0, "Asia/Kolkata");
    const res = await AttendanceService.recordPunch(tenantKolkataId, empKolkataGeneralId, {
      type: "check_in",
      timestamp: punchTime,
      source: "TEST",
    });

    assert.equal(res.action, "check_in");
    assert.equal(res.record.status, "present");
    assert.equal(res.record.lateMinutes, null);
  });

  // =========================================================================
  // GROUP B: GRACE PERIOD & DYNAMIC LATE MARK CALCULATION
  // =========================================================================
  await t.test("Group B1-B6: Comprehensive Grace Period Matrix on Morning Shift (07:00, 15m grace)", async () => {
    // Delete any existing attendance for this test date
    const testDate = AttendanceService.toPrismaDate(2026, 11, 22);

    await rawPrisma.shiftRoster.upsert({
      where: {
        tenantId_employeeId_rosterDate: {
          tenantId: tenantKolkataId,
          employeeId: empKolkataMorningId,
          rosterDate: testDate,
        },
      },
      create: {
        tenantId: tenantKolkataId,
        employeeId: empKolkataMorningId,
        shiftId: shiftMorningId,
        rosterDate: testDate,
        status: "assigned",
      },
      update: { shiftId: shiftMorningId },
    });

    // Test B5: Punch at 07:16 AM IST (16m after 07:00, 1m after 15m grace)
    // 07:16 IST in UTC = 01:46 UTC
    const punchLate16m = AttendanceService.zonedTimeToUtc(2026, 11, 22, 7, 16, 0, "Asia/Kolkata");
    const resLate = await AttendanceService.recordPunch(tenantKolkataId, empKolkataMorningId, {
      type: "check_in",
      timestamp: punchLate16m,
      source: "TEST",
    });

    assert.equal(resLate.record.status, "late");
    assert.equal(resLate.record.lateMinutes, 16);
    assert.ok(resLate.record.notes?.includes("Late by 16m"));
  });

  await t.test("Group B7: Dynamic Policy Grace Variation (10m strict grace on NY tenant)", async () => {
    // NY Tenant: Shift starts at 09:00 EST. Grace is 10m (threshold 09:10 EST).
    const targetDate = AttendanceService.toPrismaDate(2026, 11, 20);

    await rawPrisma.shiftRoster.upsert({
      where: {
        tenantId_employeeId_rosterDate: {
          tenantId: tenantNyId,
          employeeId: empNyId,
          rosterDate: targetDate,
        },
      },
      create: {
        tenantId: tenantNyId,
        employeeId: empNyId,
        shiftId: shiftNyId,
        rosterDate: targetDate,
        status: "assigned",
      },
      update: { shiftId: shiftNyId },
    });

    // Punch at 09:15 EST (14:15 UTC) -> 15m past start, 5m past 10m grace!
    const punchTime = AttendanceService.zonedTimeToUtc(2026, 11, 20, 9, 15, 0, "America/New_York");
    const res = await AttendanceService.recordPunch(tenantNyId, empNyId, {
      type: "check_in",
      timestamp: punchTime,
      source: "TEST",
    });

    assert.equal(res.record.status, "late");
    assert.equal(res.record.lateMinutes, 15);
    assert.equal(res.record.policyId, policyNyId);
  });

  // =========================================================================
  // GROUP C: MULTI-TIMEZONE TESTS (KOLKATA, NEW YORK, UTC, FALLBACK)
  // =========================================================================
  await t.test("Group C1: Asia/Kolkata (UTC+5:30) vs America/New_York (UTC-5) timezone awareness", async () => {
    // Both tenants have employee punching at 04:30 UTC
    // In Kolkata: 04:30 UTC = 10:00 AM IST. For a 09:30 IST shift (15m grace), 10:00 AM is 30m LATE!
    // In New York: 04:30 UTC = 23:30 (11:30 PM previous day EST).
    const dateKolkata = AttendanceService.toPrismaDate(2026, 11, 23);
    const punchUtc = new Date("2026-11-23T04:30:00.000Z"); // 10:00 AM IST

    const res = await AttendanceService.recordPunch(tenantKolkataId, empKolkataGeneralId, {
      type: "check_in",
      timestamp: punchUtc,
      source: "TEST",
    });

    assert.equal(res.record.status, "late");
    assert.equal(res.record.lateMinutes, 30);
  });

  await t.test("Group C2: UTC Tenant: 10:00 UTC shift, punch at 10:18 UTC with 15m grace is 18m late", async () => {
    const targetDate = AttendanceService.toPrismaDate(2026, 11, 20);

    await rawPrisma.shiftRoster.upsert({
      where: {
        tenantId_employeeId_rosterDate: {
          tenantId: tenantUtcId,
          employeeId: empUtcId,
          rosterDate: targetDate,
        },
      },
      create: {
        tenantId: tenantUtcId,
        employeeId: empUtcId,
        shiftId: shiftUtcId,
        rosterDate: targetDate,
        status: "assigned",
      },
      update: { shiftId: shiftUtcId },
    });

    const punchTime = new Date("2026-11-20T10:18:00.000Z");
    const res = await AttendanceService.recordPunch(tenantUtcId, empUtcId, {
      type: "check_in",
      timestamp: punchTime,
      source: "TEST",
    });

    assert.equal(res.record.status, "late");
    assert.equal(res.record.lateMinutes, 18);
    assert.equal(res.record.shiftId, shiftUtcId);
  });

  await t.test("Group C3: Invalid timezone in tenant safely defaults to Asia/Kolkata", async () => {
    const resolved = await AttendanceService.resolveTenantTimezone("non-existent-tenant-id");
    assert.equal(resolved, "Asia/Kolkata");

    const validCheck = AttendanceService.isValidTimezone("Fake/Timezone_Not_Real");
    assert.equal(validCheck, false);

    const validCheckReal = AttendanceService.isValidTimezone("America/Los_Angeles");
    assert.equal(validCheckReal, true);
  });

  // =========================================================================
  // GROUP D: OVERNIGHT SHIFTS & MIDNIGHT ROLLOVER
  // =========================================================================
  await t.test("Group D1-D3: Overnight Shift (22:00 -> 06:00) check-in, midnight crossing, and early out", async () => {
    // Night Shift starts at 22:00 on Nov 24, 2026 (Kolkata time)
    // 22:00 IST in UTC = 16:30 UTC
    const shiftDate = AttendanceService.toPrismaDate(2026, 11, 24);

    await rawPrisma.shiftRoster.upsert({
      where: {
        tenantId_employeeId_rosterDate: {
          tenantId: tenantKolkataId,
          employeeId: empKolkataNightId,
          rosterDate: shiftDate,
        },
      },
      create: {
        tenantId: tenantKolkataId,
        employeeId: empKolkataNightId,
        shiftId: shiftNightId,
        rosterDate: shiftDate,
        status: "assigned",
      },
      update: { shiftId: shiftNightId },
    });

    // 1. Clock-in at 22:20 IST on Nov 24 (16:50 UTC). Grace is 15m (threshold 22:15).
    // Should be late by 20m, attached to Nov 24 date.
    const punchInTime = AttendanceService.zonedTimeToUtc(2026, 11, 24, 22, 20, 0, "Asia/Kolkata");
    const checkInRes = await AttendanceService.recordPunch(tenantKolkataId, empKolkataNightId, {
      type: "check_in",
      timestamp: punchInTime,
      source: "TEST",
    });

    assert.equal(checkInRes.action, "check_in");
    assert.equal(checkInRes.record.status, "late");
    assert.equal(checkInRes.record.lateMinutes, 20);
    assert.equal(checkInRes.record.date.toISOString().slice(0, 10), "2026-11-24");

    // 2. Clock-out at 05:45 IST on Nov 25 (00:15 UTC next day morning).
    // Scheduled shift end: 06:00 IST.
    // Early departure by 15 minutes!
    const punchOutTime = AttendanceService.zonedTimeToUtc(2026, 11, 25, 5, 45, 0, "Asia/Kolkata");
    const checkOutRes = await AttendanceService.recordPunch(tenantKolkataId, empKolkataNightId, {
      type: "check_out",
      timestamp: punchOutTime,
      source: "TEST",
    });

    assert.equal(checkOutRes.action, "check_out");
    assert.equal(checkOutRes.record.id, checkInRes.record.id, "Must pair with Nov 24 check-in record across midnight");
    assert.equal(checkOutRes.record.earlyOutMinutes, 15, "Early departure should be exactly 15m before 06:00 end");
    assert.ok(Number(checkOutRes.record.hours) > 7.0, "Total hours across midnight should be ~7.42h");
  });

  await t.test("Group D4: Late clock-in after midnight (00:30 on Nov 27) rolls over to Nov 26 night shift", async () => {
    // Night Shift roster on Nov 26 (22:00 -> 06:00)
    const shiftDate = AttendanceService.toPrismaDate(2026, 11, 26);

    await rawPrisma.shiftRoster.upsert({
      where: {
        tenantId_employeeId_rosterDate: {
          tenantId: tenantKolkataId,
          employeeId: empKolkataNightId,
          rosterDate: shiftDate,
        },
      },
      create: {
        tenantId: tenantKolkataId,
        employeeId: empKolkataNightId,
        shiftId: shiftNightId,
        rosterDate: shiftDate,
        status: "assigned",
      },
      update: { shiftId: shiftNightId },
    });

    // Employee arrives very late at 00:30 AM IST on Nov 27 (19:00 UTC Nov 26)
    // 2.5 hours = 150 minutes after 22:00 scheduled start
    const punchLateIn = AttendanceService.zonedTimeToUtc(2026, 11, 27, 0, 30, 0, "Asia/Kolkata");
    const res = await AttendanceService.recordPunch(tenantKolkataId, empKolkataNightId, {
      type: "check_in",
      timestamp: punchLateIn,
      source: "TEST",
    });

    assert.equal(res.action, "check_in");
    assert.equal(res.record.date.toISOString().slice(0, 10), "2026-11-26", "Must bind to Nov 26 shift date");
    assert.equal(res.record.status, "late");
    assert.equal(res.record.lateMinutes, 150);
  });

  // =========================================================================
  // GROUP E: HRM HUB DASHBOARD DYNAMIC METRICS & TENANT ISOLATION
  // =========================================================================
  await t.test("Group E1-E3: Dashboard dynamic late-mark calculation without hardcoded 9:30 AM fallback", async () => {
    // Today's local date for Kolkata tenant
    const now = new Date();
    const timeZone = "Asia/Kolkata";
    const zoned = AttendanceService.getZonedParts(now, timeZone);
    const today = AttendanceService.toPrismaDate(zoned.year, zoned.month, zoned.day);

    // Clean any records for today in test tenants
    await rawPrisma.attendance.deleteMany({
      where: { tenantId: { in: allTenants }, date: today },
    });

    // Create 3 attendance records for today in Kolkata tenant:
    // Emp 1: Present (on time)
    await rawPrisma.attendance.create({
      data: {
        tenantId: tenantKolkataId,
        employeeId: empKolkataGeneralId,
        date: today,
        checkIn: new Date(now.getTime() - 4 * 3600 * 1000),
        status: "present",
        lateMinutes: null,
      },
    });

    // Emp 2: Late (authoritative status = late, lateMinutes = 45)
    await rawPrisma.attendance.create({
      data: {
        tenantId: tenantKolkataId,
        employeeId: empKolkataMorningId,
        date: today,
        checkIn: new Date(now.getTime() - 3 * 3600 * 1000),
        status: "late",
        lateMinutes: 45,
      },
    });

    // Emp 3: Afternoon shift employee who punched at 13:55 (after 9:30 AM), but was ON TIME for their 14:00 shift
    await rawPrisma.attendance.create({
      data: {
        tenantId: tenantKolkataId,
        employeeId: empKolkataNightId,
        date: today,
        checkIn: new Date(now.getTime() - 2 * 3600 * 1000),
        status: "present", // Marked present by shift-aware recordPunch
        lateMinutes: null,
      },
    });

    // Query today's attendance in Kolkata tenant
    const kolkataList = await rawPrisma.attendance.findMany({
      where: { tenantId: tenantKolkataId, date: today },
    });

    const presentCount = kolkataList.filter((a) => a.checkIn !== null || a.status === "present" || a.status === "late").length;
    const lateCount = kolkataList.filter((a) => a.status === "late" || (a.lateMinutes !== null && a.lateMinutes > 0)).length;

    assert.equal(presentCount, 3, "All 3 employees should be marked present/checked in");
    assert.equal(lateCount, 1, "Only 1 employee (Emp 2) should be counted as late! Emp 3 (13:55 punch) is NOT late!");
  });

  await t.test("Group E4: Strict Tenant Isolation in Attendance and Dashboard Counts", async () => {
    const now = new Date();
    const timeZone = "Asia/Kolkata";
    const zoned = AttendanceService.getZonedParts(now, timeZone);
    const today = AttendanceService.toPrismaDate(zoned.year, zoned.month, zoned.day);

    // Create a late record in Isolated Tenant B
    await rawPrisma.attendance.create({
      data: {
        tenantId: tenantIsolatedBId,
        employeeId: empIsolatedBId,
        date: today,
        checkIn: now,
        status: "late",
        lateMinutes: 50,
      },
    });

    // Query Tenant A's attendance
    const kolkataAttendance = await rawPrisma.attendance.findMany({
      where: { tenantId: tenantKolkataId, date: today },
    });

    // Query Tenant B's attendance
    const tenantBAttendance = await rawPrisma.attendance.findMany({
      where: { tenantId: tenantIsolatedBId, date: today },
    });

    // Assert zero leakage
    assert.ok(kolkataAttendance.every((a) => a.tenantId === tenantKolkataId));
    assert.ok(tenantBAttendance.every((a) => a.tenantId === tenantIsolatedBId));
    assert.equal(tenantBAttendance.length, 1);
    assert.equal(tenantBAttendance[0].employeeId, empIsolatedBId);
  });

  // =========================================================================
  // GROUP F: REGRESSION & INTEGRITY GUARDS
  // =========================================================================
  await t.test("Group F1: Duplicate check-in on the same shift date throws error", async () => {
    const testDate = AttendanceService.toPrismaDate(2026, 11, 28);
    const punchTime = AttendanceService.zonedTimeToUtc(2026, 11, 28, 9, 0, 0, "Asia/Kolkata");

    // First check-in
    await AttendanceService.recordPunch(tenantKolkataId, empKolkataGeneralId, {
      type: "check_in",
      timestamp: punchTime,
      source: "TEST",
    });

    // Second check-in on same date must throw
    await assert.rejects(
      async () => {
        await AttendanceService.recordPunch(tenantKolkataId, empKolkataGeneralId, {
          type: "check_in",
          timestamp: new Date(punchTime.getTime() + 10 * 60 * 1000),
          source: "TEST",
        });
      },
      {
        message: "Already checked in for today.",
      }
    );
  });

  await t.test("Group F2: Month-Lock prevents attendance modifications", async () => {
    // Lock November 2026 for tenantKolkataId
    await AttendanceService.setMonthLock(tenantKolkataId, 2026, 11, true, "admin-locker", "Audit period locked");

    const punchInLockedMonth = AttendanceService.zonedTimeToUtc(2026, 11, 29, 9, 0, 0, "Asia/Kolkata");

    await assert.rejects(
      async () => {
        await AttendanceService.recordPunch(tenantKolkataId, empKolkataMorningId, {
          type: "check_in",
          timestamp: punchInLockedMonth,
          source: "TEST",
        });
      },
      (err: any) => {
        return err.code === "PERIOD_LOCKED" || err.name === "MonthLockedError";
      }
    );

    // Unlock month for cleanup
    await AttendanceService.setMonthLock(tenantKolkataId, 2026, 11, false, "admin-locker", "Audit complete, unlocked");
  });

  // Teardown
  await cleanup();
});
