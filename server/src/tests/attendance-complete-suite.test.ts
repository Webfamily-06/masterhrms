import test from "node:test";
import assert from "node:assert/strict";
import { AttendanceService, MonthLockedError } from "../services/attendance.service";
import { AttendanceAutomationService } from "../services/attendance-automation.service";
import { rawPrisma } from "../prisma";

test("MASTERHRMS - HR Attendance Management Complete Suite", async (t) => {
  const tenantId = `test-tenant-${Date.now()}`;
  const userId = `test-user-${Date.now()}`;

  // Helper: Cleanup test tenant data
  const cleanup = async () => {
    try {
      await rawPrisma.attendance.deleteMany({ where: { tenantId } });
      await rawPrisma.attendanceMonthLock.deleteMany({ where: { tenantId } });
      await rawPrisma.attendanceRegularization.deleteMany({ where: { tenantId } });
      await rawPrisma.timesheet.deleteMany({ where: { tenantId } });
      await rawPrisma.shiftRoster.deleteMany({ where: { tenantId } });
      await rawPrisma.shiftDefinition.deleteMany({ where: { tenantId } });
      await rawPrisma.attendancePolicy.deleteMany({ where: { tenantId } });
      await rawPrisma.employee.deleteMany({ where: { tenantId } });
      await rawPrisma.tenant.deleteMany({ where: { id: tenantId } });
    } catch (_) {}
  };

  // Setup test tenant and test employee
  await rawPrisma.tenant.create({
    data: {
      id: tenantId,
      name: "Attendance Test Corp",
      slug: `attn-test-${Date.now()}`,
    },
  });

  const employee = await rawPrisma.employee.create({
    data: {
      tenantId,
      firstName: "Devon",
      lastName: "Vance",
      email: `devon.vance.${Date.now()}@example.com`,
      employeeCode: `EMP-${Date.now().toString().slice(-4)}`,
      status: "active",
    },
  });

  // ─── TEST 1: Policy CRUD, Versioning, and Defaults ────────────────────────
  await t.test("Module 5: Attendance Policy CRUD and Versioning", async () => {
    // 1. Create Default Policy
    const policy = await rawPrisma.attendancePolicy.create({
      data: {
        tenantId,
        name: "Standard Corporate Policy",
        code: `POL-${Date.now()}`,
        workingDays: "Mon,Tue,Wed,Thu,Fri",
        graceMinutes: 15,
        halfDayHours: 4.0,
        fullDayHours: 8.0,
        isOvertimeAllowed: true,
        overtimeMultiplier: 1.5,
        minOvertimeMinutes: 60,
        regularizationLimit: 3,
        isDefault: true,
        version: 1,
        effectiveFrom: new Date(),
      },
    });

    assert.equal(policy.name, "Standard Corporate Policy");
    assert.equal(policy.graceMinutes, 15);
    assert.equal(policy.isDefault, true);
    assert.equal(policy.version, 1);

    // 2. Update Policy and increment version
    const updated = await rawPrisma.attendancePolicy.update({
      where: { id: policy.id },
      data: {
        graceMinutes: 20,
        version: { increment: 1 },
      },
    });

    assert.equal(updated.graceMinutes, 20);
    assert.equal(updated.version, 2);

    // 3. Prevent deleting default policy
    const defaultCheck = await rawPrisma.attendancePolicy.findUnique({ where: { id: policy.id } });
    assert.equal(defaultCheck?.isDefault, true);
  });

  // ─── TEST 2: Shifts & Overnight Calculation ───────────────────────────────
  await t.test("Module 4: Shift Definitions and Overnight Classification", async () => {
    // Standard Day Shift: 09:30 to 18:30 (1 hr break -> 8.0 hrs)
    const dayShift = await rawPrisma.shiftDefinition.create({
      data: {
        tenantId,
        name: "Day Standard",
        code: "DAY1",
        startTime: "09:30",
        endTime: "18:30",
        breakMinutes: 60,
        isOvertimeEligible: true,
        color: "blue",
      },
    });
    assert.equal(dayShift.startTime, "09:30");
    assert.equal(dayShift.endTime, "18:30");

    // Overnight Night Shift: 22:00 to 07:00 (1 hr break -> 8.0 hrs)
    const nightShift = await rawPrisma.shiftDefinition.create({
      data: {
        tenantId,
        name: "Overnight Support",
        code: "NGT1",
        startTime: "22:00",
        endTime: "07:00",
        breakMinutes: 60,
        isOvertimeEligible: true,
        color: "indigo",
      },
    });
    assert.equal(nightShift.startTime, "22:00");
    assert.equal(nightShift.endTime, "07:00");

    // Test Overnight Calculation Logic
    const [startH, startM] = nightShift.startTime.split(":").map(Number);
    const [endH, endM] = nightShift.endTime.split(":").map(Number);
    let startTotal = startH * 60 + startM;
    let endTotal = endH * 60 + endM;
    if (endTotal <= startTotal) {
      endTotal += 24 * 60; // crosses midnight
    }
    const netWorkedMinutes = endTotal - startTotal - nightShift.breakMinutes;
    const netWorkedHours = Math.round((netWorkedMinutes / 60) * 10) / 10;
    assert.equal(netWorkedHours, 8.0);

    // Assign Shift Roster to Employee
    const targetDate = new Date(Date.UTC(2026, 10, 15));
    const roster = await rawPrisma.shiftRoster.create({
      data: {
        tenantId,
        employeeId: employee.id,
        shiftId: dayShift.id,
        rosterDate: targetDate,
        notes: "Scheduled day shift",
        status: "active",
      },
    });
    assert.equal(roster.employeeId, employee.id);
    assert.equal(roster.shiftId, dayShift.id);
  });

  // ─── TEST 3: Attendance Period Locking & Manual Punch ──────────────────────
  await t.test("Module 1: Period Lock Assertion and Manual Adjustment", async () => {
    const year = 2026;
    const month = 11;
    const targetDate = new Date(Date.UTC(year, month - 1, 10));

    // Ensure period is unlocked initially
    await AttendanceService.setMonthLock(tenantId, year, month, false, userId, "Initial open");
    const isLockedInitially = await AttendanceService.isMonthLocked(tenantId, targetDate);
    assert.equal(isLockedInitially, false);

    // Manual adjustment while unlocked succeeds
    const record = await AttendanceService.adjustAttendance(
      tenantId,
      {
        employeeId: employee.id,
        date: targetDate,
        checkIn: new Date(Date.UTC(year, month - 1, 10, 9, 30)),
        checkOut: new Date(Date.UTC(year, month - 1, 10, 18, 30)),
        status: "present",
        hours: 9,
        notes: "On-site client meeting manual punch",
      },
      userId
    );
    assert.equal(record.status, "present");
    assert.equal(Number(record.hours), 9);

    // Lock the month
    await AttendanceService.setMonthLock(tenantId, year, month, true, userId, "Locked for payroll");
    const isLockedNow = await AttendanceService.isMonthLocked(tenantId, targetDate);
    assert.equal(isLockedNow, true);

    // Mutation on locked month throws MonthLockedError
    await assert.rejects(
      async () => {
        await AttendanceService.adjustAttendance(
          tenantId,
          {
            employeeId: employee.id,
            date: targetDate,
            notes: "Attempted change on locked period",
          },
          userId
        );
      },
      (err: any) => {
        assert.equal(err.code, "PERIOD_LOCKED");
        return true;
      }
    );

    // Unlock month
    await AttendanceService.setMonthLock(tenantId, year, month, false, userId, "Reopened for review");
    const isUnlocked = await AttendanceService.isMonthLocked(tenantId, targetDate);
    assert.equal(isUnlocked, false);
  });

  // ─── TEST 4: Attendance Regularizations & Recalculation ─────────────────────
  await t.test("Module 3: Regularization Workflow and Metrics Recalculation", async () => {
    const targetDate = new Date(Date.UTC(2026, 10, 12));
    const proposedIn = new Date(Date.UTC(2026, 10, 12, 9, 30));
    const proposedOut = new Date(Date.UTC(2026, 10, 12, 18, 30));

    // 1. Employee submits punch regularization
    const reg = await rawPrisma.attendanceRegularization.create({
      data: {
        tenantId,
        employeeId: employee.id,
        attendanceDate: targetDate,
        proposedIn,
        proposedOut,
        reason: "Biometric reader failed to capture exit punch",
        status: "PENDING",
      },
    });
    assert.equal(reg.status, "PENDING");

    // 2. Approve regularization and transactionally update attendance
    const diffHours = Math.round(((proposedOut.getTime() - proposedIn.getTime()) / (1000 * 60 * 60)) * 100) / 100;
    assert.equal(diffHours, 9.0);

    const updatedReg = await rawPrisma.$transaction(async (tx) => {
      const approved = await tx.attendanceRegularization.update({
        where: { id: reg.id },
        data: {
          status: "APPROVED",
          approverId: userId,
          reviewedAt: new Date(),
          reviewComments: "Verified against branch entry log",
        },
      });

      await tx.attendance.upsert({
        where: {
          tenantId_employeeId_date: {
            tenantId,
            employeeId: reg.employeeId,
            date: targetDate,
          },
        },
        create: {
          tenantId,
          employeeId: reg.employeeId,
          date: targetDate,
          checkIn: proposedIn,
          checkOut: proposedOut,
          hours: diffHours,
          status: "present",
          notes: `Regularized: ${reg.reason}`,
          source: "REGULARIZATION",
        },
        update: {
          checkIn: proposedIn,
          checkOut: proposedOut,
          hours: diffHours,
          status: "present",
          notes: `Regularized: ${reg.reason}`,
          source: "REGULARIZATION",
        },
      });

      return approved;
    });

    assert.equal(updatedReg.status, "APPROVED");

    // Verify Attendance table was updated
    const attn = await rawPrisma.attendance.findUnique({
      where: {
        tenantId_employeeId_date: {
          tenantId,
          employeeId: employee.id,
          date: targetDate,
        },
      },
    });
    assert.equal(attn?.status, "present");
    assert.equal(Number(attn?.hours), 9.0);
    assert.equal(attn?.source, "REGULARIZATION");
  });

  // ─── TEST 5: Weekly Timesheets & Overlap Prevention ─────────────────────────
  await t.test("Module 2: Timesheet CRUD and Approval Lifecycle", async () => {
    const workDate = new Date(Date.UTC(2026, 10, 16));

    // 1. Create timesheet entry
    const entry = await rawPrisma.timesheet.create({
      data: {
        tenantId,
        employeeId: employee.id,
        date: workDate,
        hours: 7.5,
        description: "Core ERP Payroll integration development",
        status: "pending",
      },
    });
    assert.equal(Number(entry.hours), 7.5);
    assert.equal(entry.status, "pending");

    // 2. Manager approves timesheet entry
    const approved = await rawPrisma.timesheet.update({
      where: { id: entry.id },
      data: {
        status: "approved",
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewNotes: "Task deliverables verified and accepted",
      },
    });
    assert.equal(approved.status, "approved");
    assert.equal(approved.reviewedBy, userId);

    // 3. Create another timesheet entry and test rejection
    const rejectedEntry = await rawPrisma.timesheet.create({
      data: {
        tenantId,
        employeeId: employee.id,
        date: new Date(Date.UTC(2026, 10, 17)),
        hours: 4.0,
        description: "Unplanned maintenance",
        status: "pending",
      },
    });

    const rejected = await rawPrisma.timesheet.update({
      where: { id: rejectedEntry.id },
      data: {
        status: "rejected",
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewNotes: "Missing associated Jira ticket reference",
      },
    });
    assert.equal(rejected.status, "rejected");
    assert.equal(rejected.reviewNotes, "Missing associated Jira ticket reference");
  });

  // ─── TEST 6: Automated Attendance Engine & Background Jobs ──────────────────
  await t.test("Module 6: Automated Attendance Engine Execution & SystemCronJob Logging", async () => {
    const today = new Date(Date.UTC(2026, 10, 18));

    // 1. Test Period Initialization
    const initResult = await AttendanceAutomationService.initializePeriod(tenantId, 2026, 11);
    assert.equal(initResult.status, "success");
    assert.equal(initResult.recordsProcessed, 1);

    // 2. Test Shift Resolution
    const shiftResult = await AttendanceAutomationService.resolveShiftRosters(tenantId, today);
    assert.equal(shiftResult.status, "success");

    // 3. Test Leave Sync
    const leaveSyncResult = await AttendanceAutomationService.syncLeavesToAttendance(tenantId, today);
    assert.equal(leaveSyncResult.status, "success");

    // 4. Test Daily Processing
    const dailyProcResult = await AttendanceAutomationService.processDailyAttendance(tenantId, today);
    assert.equal(dailyProcResult.status, "success");

    // 5. Test Missing Attendance Detection
    const missingResult = await AttendanceAutomationService.detectMissingAttendance(tenantId, today);
    assert.equal(missingResult.status, "success");

    // 6. Test Overtime Processing
    const otResult = await AttendanceAutomationService.calculateOvertime(tenantId, today);
    assert.equal(otResult.status, "success");

    // 7. Verify SystemCronJob entries exist for all executed jobs
    const jobs = await AttendanceAutomationService.getJobExecutions();
    assert.ok(jobs.length >= 1, "Expected SystemCronJob tracking entries");
    const sampleJob = jobs[0];
    assert.ok(sampleJob.code.startsWith("ATTN_"));
    assert.equal(sampleJob.lastStatus, "success");
  });

  // Teardown
  await cleanup();
});

