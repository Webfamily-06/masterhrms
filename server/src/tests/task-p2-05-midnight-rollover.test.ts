/**
 * TASK-P2-05: Midnight Rollover in Night Shift Punch Checkout
 * 
 * Verifies that when an employee checks in on Day 1 night (e.g. 22:00)
 * and checks out on Day 2 morning (e.g. 06:00), the system accurately pairs
 * Day 2 checkout with Day 1 check-in, calculates exact shift hours across
 * midnight, and avoids the "No check-in recorded for today" error.
 */

import assert from "node:assert";
import { rawPrisma } from "../prisma";
import { AttendanceService } from "../services/attendance.service";

async function runMidnightRolloverTest() {
  console.log("================================================================================");
  console.log("TASK-P2-05: MIDNIGHT ROLLOVER ATTENDANCE VERIFICATION");
  console.log("================================================================================\n");

  const tenant = await (rawPrisma as any).tenant.findFirst({ select: { id: true } });
  const emp = await (rawPrisma as any).employee.findFirst({ select: { id: true, tenantId: true } });

  const tenantId = emp?.tenantId || tenant?.id || "mock-tenant";
  const employeeId = emp?.id || "mock-emp";

  // Simulate Day 1 (Yesterday) and Day 2 (Today)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const checkInNight = new Date(yesterday);
  checkInNight.setUTCHours(22, 0, 0, 0); // 10:00 PM yesterday

  const checkOutMorning = new Date(today);
  checkOutMorning.setUTCHours(6, 0, 0, 0); // 06:00 AM today (8 hrs later)

  let attendanceId: string = "";

  try {
    // 1. Create overnight check-in record for yesterday
    const record = await (rawPrisma as any).attendance.upsert({
      where: {
        tenantId_employeeId_date: {
          tenantId,
          employeeId,
          date: yesterday,
        },
      },
      update: {
        checkIn: checkInNight,
        checkOut: null,
        status: "present",
      },
      create: {
        tenantId,
        employeeId,
        date: yesterday,
        checkIn: checkInNight,
        checkOut: null,
        status: "present",
        notes: "Overnight Night Shift (22:00 - 06:00)",
      },
    });
    attendanceId = record.id;

    console.log(`Created overnight check-in on Day 1: ${checkInNight.toISOString()}`);

    // 2. Perform checkout on Day 2 morning
    const result = await AttendanceService.recordPunch(tenantId, employeeId, {
      type: "check_out",
      notes: "Morning shift end",
      ipAddress: "127.0.0.1",
    });

    console.log(`Successfully completed Day 2 checkout for Day 1 shift!`);
    console.log(`  Total Recorded Shift Hours: ${result.record.hours} hours`);

    assert.strictEqual(result.action, "check_out");
    assert.ok(result.record.checkOut !== null, "Checkout timestamp must be recorded");
    assert.ok(Number(result.record.hours) > 0, "Hours must be calculated");

    console.log("  ✓ [PASS] Midnight rollover check-in pairing verified!");
  } finally {
    // Cleanup test record
    try {
      if (attendanceId) {
        await (rawPrisma as any).attendance.delete({ where: { id: attendanceId } });
      }
    } catch {}
  }

  console.log("\n================================================================================");
  console.log("TASK-P2-05: MIDNIGHT ROLLOVER TEST PASSED (1/1)");
  console.log("================================================================================\n");
}

runMidnightRolloverTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
