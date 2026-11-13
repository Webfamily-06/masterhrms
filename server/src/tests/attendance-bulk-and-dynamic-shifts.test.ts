import { test } from "node:test";
import assert from "node:assert/strict";
import { rawPrisma } from "../prisma";
import { AttendanceService } from "../services/attendance.service";

test("MASTERHRMS: Dynamic Shifts, Holidays, and Bulk Attendance Suite", async (t) => {
  const tenantId = "test-tenant-dyn-" + Date.now();
  let employee1Id: string;
  let employee2Id: string;
  let branchId: string;

  // Setup test tenant, branch, and employees
  await t.test("Setup test fixtures", async () => {
    const tenant = await rawPrisma.tenant.create({
      data: {
        id: tenantId,
        name: "Dynamic Test Tenant",
        slug: "dyn-tenant-" + Date.now(),
      },
    });

    const branch = await rawPrisma.branch.create({
      data: {
        tenantId,
        name: "Dynamic HQ",
        code: "DHQ",
      },
    });
    branchId = branch.id;

    const emp1 = await rawPrisma.employee.create({
      data: {
        tenantId,
        branchId,
        firstName: "Alice",
        lastName: "Dynamic",
        employeeCode: "DYN001",
        email: `alice.${Date.now()}@example.com`,
      },
    });
    employee1Id = emp1.id;

    const emp2 = await rawPrisma.employee.create({
      data: {
        tenantId,
        branchId,
        firstName: "Bob",
        lastName: "Dynamic",
        employeeCode: "DYN002",
        email: `bob.${Date.now()}@example.com`,
      },
    });
    employee2Id = emp2.id;

    // Create default policy (Mon-Fri)
    await rawPrisma.attendancePolicy.create({
      data: {
        tenantId,
        name: "Standard 5-Day Policy",
        code: "STD-5D",
        workingDays: "Mon,Tue,Wed,Thu,Fri",
        isDefault: true,
      },
    });
  });

  // Test 1: Bulk attendance entry
  await t.test("Bulk attendance entry creates records transactionally", async () => {
    const targetDate = new Date(Date.UTC(2026, 10, 10)); // Nov 10, 2026

    // Verify month is initially unlocked
    const isLocked = await AttendanceService.isMonthLocked(tenantId, targetDate);
    assert.equal(isLocked, false);

    // Perform bulk insertion for emp1 and emp2
    const checkIn = new Date(Date.UTC(2026, 10, 10, 9, 30));
    const checkOut = new Date(Date.UTC(2026, 10, 10, 18, 30));

    const records = await rawPrisma.$transaction(async (tx) => {
      const created = [];
      for (const empId of [employee1Id, employee2Id]) {
        const rec = await tx.attendance.upsert({
          where: {
            tenantId_employeeId_date: {
              tenantId,
              employeeId: empId,
              date: targetDate,
            },
          },
          create: {
            tenantId,
            employeeId: empId,
            date: targetDate,
            checkIn,
            checkOut,
            status: "present",
            hours: 8,
            notes: "Bulk entry test",
            source: "MANUAL",
          },
          update: {
            checkIn,
            checkOut,
            status: "present",
            hours: 8,
          },
        });
        created.push(rec);
      }
      return created;
    });

    assert.equal(records.length, 2);
    assert.equal(records[0].hours?.toString(), "8");
    assert.equal(records[1].hours?.toString(), "8");

    // Verify records exist in database
    const saved = await rawPrisma.attendance.findMany({
      where: {
        tenantId,
        date: targetDate,
      },
    });
    assert.equal(saved.length, 2);
  });

  // Test 2: Month Lock stops mutations
  await t.test("Month lock prevents bulk modifications", async () => {
    const targetDate = new Date(Date.UTC(2026, 10, 10));
    await AttendanceService.setMonthLock(tenantId, 2026, 11, true, "user-test", "Locking for audit");

    const isLocked = await AttendanceService.isMonthLocked(tenantId, targetDate);
    assert.equal(isLocked, true);

    await assert.rejects(
      async () => {
        await AttendanceService.assertMonthUnlocked(tenantId, targetDate);
      },
      (err: any) => {
        return err.name === "MonthLockedError" || err.message.includes("locked");
      }
    );

    // Unlock month for remaining tests
    await AttendanceService.setMonthLock(tenantId, 2026, 11, false, "user-test", "Unlocking");
    const isUnlocked = await AttendanceService.isMonthLocked(tenantId, targetDate);
    assert.equal(isUnlocked, false);
  });

  // Test 3: Holiday configuration
  await t.test("Holiday correctly links to branch", async () => {
    const holidayDate = new Date(Date.UTC(2026, 10, 15));
    const holiday = await rawPrisma.holiday.create({
      data: {
        tenantId,
        name: "Founders Day",
        date: holidayDate,
        year: 2026,
        branchIds: [branchId],
        status: "active",
      },
    });

    assert.ok(holiday.id);
    assert.equal(holiday.name, "Founders Day");
    assert.deepEqual(holiday.branchIds, [branchId]);
  });

  // Cleanup
  await t.test("Teardown test fixtures", async () => {
    await rawPrisma.attendance.deleteMany({ where: { tenantId } });
    await rawPrisma.holiday.deleteMany({ where: { tenantId } });
    await rawPrisma.attendancePolicy.deleteMany({ where: { tenantId } });
    await rawPrisma.attendanceMonthLock.deleteMany({ where: { tenantId } });
    await rawPrisma.employee.deleteMany({ where: { tenantId } });
    await rawPrisma.branch.deleteMany({ where: { tenantId } });
    await rawPrisma.tenant.deleteMany({ where: { id: tenantId } });
  });
});

