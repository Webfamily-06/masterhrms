import test from "node:test";
import assert from "node:assert/strict";
import { rawPrisma } from "../prisma";
import { AttendanceExportService } from "../services/attendance-export.service.js";
import { SandwichLeaveService } from "../services/sandwich-leave.service.js";

test("MASTERHRMS - Advanced Attendance Export, Holiday Sync & Sandwich Leave Policy Suite", async (t) => {
  const tenantId = `test-export-${Date.now()}`;
  const userId = `test-user-${Date.now()}`;

  // Helper: Cleanup test tenant data
  const cleanup = async () => {
    try {
      await rawPrisma.attendance.deleteMany({ where: { tenantId } });
      await rawPrisma.leaveRequest.deleteMany({ where: { tenantId } });
      await rawPrisma.leaveType.deleteMany({ where: { tenantId } });
      await rawPrisma.leavePolicy.deleteMany({ where: { tenantId } });
      await rawPrisma.holiday.deleteMany({ where: { tenantId } });
      await rawPrisma.shiftRoster.deleteMany({ where: { tenantId } });
      await rawPrisma.attendancePolicy.deleteMany({ where: { tenantId } });
      await rawPrisma.employee.deleteMany({ where: { tenantId } });
      await rawPrisma.tenant.deleteMany({ where: { id: tenantId } });
    } catch (_) {}
  };

  await cleanup();

  // 1. Setup tenant & branch
  await rawPrisma.tenant.create({
    data: {
      id: tenantId,
      name: "Global Export Tech (GET)",
      slug: `get-corp-${Date.now()}`,
    },
  });

  const branch = await rawPrisma.branch.create({
    data: {
      tenantId,
      name: "GET Headquarters",
      code: `HQ-${Date.now().toString().slice(-4)}`,
    },
  });

  // 2. Setup standard attendance policy (Mon-Fri)
  await rawPrisma.attendancePolicy.create({
    data: {
      tenantId,
      name: "GET General Policy",
      code: `POL-${Date.now()}`,
      workingDays: "Mon,Tue,Wed,Thu,Fri",
      graceMinutes: 15,
      halfDayHours: 4.0,
      fullDayHours: 8.0,
      isDefault: true,
    },
  });

  // 3. Setup employees: Regular and Intern
  const regularEmp = await rawPrisma.employee.create({
    data: {
      tenantId,
      branchId: branch.id,
      firstName: "Esther",
      lastName: "Nirmala",
      email: `esther.${Date.now()}@example.com`,
      employeeCode: "GET-001",
      employmentType: "full_time",
      status: "active",
      joinedAt: new Date(Date.UTC(2025, 9, 6)), // 06-Oct-2025
    },
  });

  const internEmp = await rawPrisma.employee.create({
    data: {
      tenantId,
      branchId: branch.id,
      firstName: "Anukarthika",
      lastName: "Murugan",
      email: `anukarthika.${Date.now()}@example.com`,
      employeeCode: "INT-001",
      employmentType: "intern",
      status: "active",
      joinedAt: new Date(Date.UTC(2026, 0, 10)), // 10-Jan-2026
    },
  });

  // 4. Setup Leave Types & Policy
  const casualLeaveType = await rawPrisma.leaveType.create({
    data: {
      tenantId,
      name: "Casual Leave",
      code: "CL",
      daysPerYear: 12,
      isPaid: true,
      sandwichRule: true,
    },
  });

  // ─── TEST 1: Sandwich Leave Policy Engine ────────────────────────────────
  await t.test("1. Sandwich Leave Policy Engine - Detection, Toggling & Boundaries", async () => {
    // A. Disable sandwich rule initially
    await SandwichLeaveService.setSandwichPolicySetting(tenantId, false);
    const settingOff = await SandwichLeaveService.getSandwichPolicySetting(tenantId);
    assert.equal(settingOff.sandwichRuleEnabled, false, "Sandwich rule should be disabled");

    // Apply leave on Friday (2026-08-07) and Monday (2026-08-10)
    // Saturday 2026-08-08 and Sunday 2026-08-09 are weekly off
    const friLeave = await rawPrisma.leaveRequest.create({
      data: {
        tenantId,
        employeeId: regularEmp.id,
        leaveTypeId: casualLeaveType.id,
        startDate: new Date(Date.UTC(2026, 7, 7)),
        endDate: new Date(Date.UTC(2026, 7, 7)),
        days: 1.0,
        status: "approved",
        reason: "Friday personal work",
      },
    });

    const monLeave = await rawPrisma.leaveRequest.create({
      data: {
        tenantId,
        employeeId: regularEmp.id,
        leaveTypeId: casualLeaveType.id,
        startDate: new Date(Date.UTC(2026, 7, 10)),
        endDate: new Date(Date.UTC(2026, 7, 10)),
        days: 1.0,
        status: "approved",
        reason: "Monday family event",
      },
    });

    // Evaluate with sandwich rule disabled
    const evalDisabled = await SandwichLeaveService.evaluateEmployeeSandwichLeave(
      tenantId,
      regularEmp.id,
      new Date(Date.UTC(2026, 7, 1)),
      new Date(Date.UTC(2026, 7, 24))
    );
    assert.equal(evalDisabled.hasSandwichLeave, false, "When disabled, should NOT detect sandwich leave");
    assert.equal(evalDisabled.sandwichDaysCount, 0, "No sandwich days deducted when policy is disabled");

    // B. Enable sandwich rule
    await SandwichLeaveService.setSandwichPolicySetting(tenantId, true);
    const settingOn = await SandwichLeaveService.getSandwichPolicySetting(tenantId);
    assert.equal(settingOn.sandwichRuleEnabled, true, "Sandwich rule should now be enabled");

    // Evaluate with sandwich rule enabled
    const evalEnabled = await SandwichLeaveService.evaluateEmployeeSandwichLeave(
      tenantId,
      regularEmp.id,
      new Date(Date.UTC(2026, 7, 1)),
      new Date(Date.UTC(2026, 7, 24))
    );
    assert.equal(evalEnabled.hasSandwichLeave, true, "When enabled, should detect sandwich leave");
    assert.equal(evalEnabled.sandwichDaysCount, 2, "Should detect 2 sandwich weekend days (Sat Aug 8 & Sun Aug 9)");
    assert.ok(evalEnabled.sandwichDates.includes("2026-08-08"), "Sat Aug 8 must be flagged as sandwich date");
    assert.ok(evalEnabled.sandwichDates.includes("2026-08-09"), "Sun Aug 9 must be flagged as sandwich date");

    // Clean up test leave requests
    await rawPrisma.leaveRequest.deleteMany({ where: { id: { in: [friLeave.id, monLeave.id] } } });
  });

  // ─── TEST 2: Holiday Calendar Synchronization ─────────────────────────────
  await t.test("2. Holiday Calendar Synchronization & Worked Holiday Preservation", async () => {
    // Create an Independence Day Holiday on 2026-08-15
    const holiday = await rawPrisma.holiday.create({
      data: {
        tenantId,
        name: "Independence Day",
        date: new Date(Date.UTC(2026, 7, 15)),
        type: "public",
        year: 2026,
        branchIds: [branch.id],
        status: "active",
      },
    });

    // Employee punches present on holiday (e.g. essential operations)
    await rawPrisma.attendance.create({
      data: {
        tenantId,
        employeeId: regularEmp.id,
        date: new Date(Date.UTC(2026, 7, 15)),
        checkIn: new Date(Date.UTC(2026, 7, 15, 9, 0)),
        checkOut: new Date(Date.UTC(2026, 7, 15, 17, 0)),
        status: "present",
        hours: 8.0,
        notes: "Worked on Holiday - Comp-off eligible",
      },
    });

    // Generate monthly matrix for August 2026 (cycle 25_24: July 25 - Aug 24)
    const matrixData = await AttendanceExportService.getMonthlyAttendanceMatrix(
      tenantId,
      2026,
      8,
      "25_24"
    );

    const empRow = matrixData.rows.find((r) => r.employeeId === regularEmp.id);
    assert.ok(empRow, "Employee row must exist");

    const holidayDay = empRow.days.find((d) => d.dateStr === "2026-08-15");
    assert.ok(holidayDay, "Holiday date must exist in period");
    assert.equal(holidayDay.code, "P", "Employee who worked on holiday must retain Present 'P' status");
    assert.equal(holidayDay.hours, 8.0, "Worked hours on holiday must be preserved");

    // Clean up
    await rawPrisma.attendance.deleteMany({ where: { tenantId, employeeId: regularEmp.id } });
    await rawPrisma.holiday.delete({ where: { id: holiday.id } });
  });

  // ─── TEST 3: Monthly Attendance Excel Export Layout ────────────────────────
  await t.test("3. Monthly Attendance Excel Export - Matching Reference Workbook", async () => {
    const wb = await AttendanceExportService.generateMonthlyExcelWorkbook(
      tenantId,
      2026,
      8,
      "25_24"
    );

    assert.ok(wb.worksheets.length >= 1, "Workbook must contain at least 1 worksheet");
    const ws = wb.worksheets[0];
    assert.equal(ws.name, "Aug 26", "Worksheet name must match 'Aug 26'");

    // Validate headers
    const row1 = ws.getRow(1);
    const row2 = ws.getRow(2);
    assert.equal(row1.getCell(1).value, "EMP NAME", "Col 1 Row 1 must be EMP NAME");
    assert.equal(row1.getCell(2).value, "DOJ", "Col 2 Row 1 must be DOJ");
    assert.equal(row2.getCell(1).value, "EMP NAME", "Col 1 Row 2 must be EMP NAME");
    assert.equal(row2.getCell(2).value, "DOJ", "Col 2 Row 2 must be DOJ");

    // Check summary headers
    const colCount = ws.columnCount;
    assert.equal(row1.getCell(colCount - 1).value, "ABSENT DAYS", "Second to last col must be ABSENT DAYS");
    assert.equal(row1.getCell(colCount).value, "PRESENT DAYS", "Last col must be PRESENT DAYS");

    // Check data rows
    const row3 = ws.getRow(3);
    const row4 = ws.getRow(4);
    assert.ok(
      ["Anukarthika Murugan", "Esther Nirmala"].includes(String(row3.getCell(1).value)),
      "Row 3 Col 1 must be an active employee name"
    );
    assert.ok(
      ["Anukarthika Murugan", "Esther Nirmala"].includes(String(row4.getCell(1).value)),
      "Row 4 Col 1 must be an active employee name"
    );
    // Both 2025 and 2026 joining dates must be represented
    const dojs = [String(row3.getCell(2).value), String(row4.getCell(2).value)];
    assert.ok(dojs.some((d) => d.includes("2025")), "One employee must contain joining year 2025");
    assert.ok(dojs.some((d) => d.includes("2026")), "One employee must contain joining year 2026");
  });

  // ─── TEST 4: Yearly Consolidated Attendance Excel Export ───────────────────
  await t.test("4. Yearly Consolidated Excel Export - 14 Worksheets & Reference Reproduction", async () => {
    const wb = await AttendanceExportService.generateYearlyConsolidatedWorkbook(
      tenantId,
      2026,
      "25_24"
    );

    // Validate worksheets count: Consolidated + Interns + 12 Monthly sheets = 14
    assert.equal(wb.worksheets.length, 14, "Workbook must have exactly 14 worksheets (Consolidated, Interns, 12 months)");

    const consSheet = wb.getWorksheet("Consolidated ");
    assert.ok(consSheet, "Consolidated worksheet must exist");

    // Row 1: Merged Title "GET ATTENDANCE"
    assert.equal(consSheet.getRow(1).getCell(1).value, "GET ATTENDANCE", "Title must be GET ATTENDANCE");

    // Row 2: Category Headers
    const r2 = consSheet.getRow(2);
    assert.equal(r2.getCell(1).value, "S.No", "Col 1 must be S.No");
    assert.equal(r2.getCell(2).value, "NAME ", "Col 2 must be NAME ");
    assert.equal(r2.getCell(3).value, "DATE OF JOINING", "Col 3 must be DATE OF JOINING");
    assert.equal(r2.getCell(4).value, "Leave Credits", "Col 4 must start Leave Credits");
    assert.equal(r2.getCell(16).value, "Total Leave credit", "Col 16 must be Total Leave credit");
    assert.equal(r2.getCell(17).value, "Utilised", "Col 17 must start Utilised");
    assert.equal(r2.getCell(29).value, "Total Leave Utilised", "Col 29 must be Total Leave Utilised");
    assert.equal(r2.getCell(30).value, "LOP", "Col 30 must start LOP");
    assert.equal(r2.getCell(42).value, "Cumulative Leaves Balance", "Col 42 must be Cumulative Leaves Balance");
    assert.equal(r2.getCell(43).value, "Status", "Col 43 must be Status");

    // Check Interns Sheet
    const internsSheet = wb.getWorksheet("Interns");
    assert.ok(internsSheet, "Interns worksheet must exist");
    const intRow4 = internsSheet.getRow(4);
    assert.equal(intRow4.getCell(1).value, "Anukarthika Murugan", "Intern employee must be present on Interns sheet");

    // Check month sheets
    assert.ok(wb.getWorksheet("Jan 26"), "Jan 26 sheet must exist");
    assert.ok(wb.getWorksheet("Aug 26"), "Aug 26 sheet must exist");
    assert.ok(wb.getWorksheet("Dec 26"), "Dec 26 sheet must exist");
  });

  // ─── TEST 5: Monthly and Yearly PDF Exports ────────────────────────────────
  await t.test("5. Monthly and Yearly PDF Export Buffers", async () => {
    const monthlyPdf = await AttendanceExportService.generateMonthlyPdf(
      tenantId,
      2026,
      8,
      "25_24"
    );
    assert.ok(Buffer.isBuffer(monthlyPdf), "Monthly PDF export must return a Buffer");
    assert.ok(monthlyPdf.length > 500, "Monthly PDF buffer must contain content");
    assert.equal(monthlyPdf.slice(0, 4).toString(), "%PDF", "Buffer must begin with PDF magic header");

    const yearlyPdf = await AttendanceExportService.generateYearlyConsolidatedPdf(
      tenantId,
      2026,
      "25_24"
    );
    assert.ok(Buffer.isBuffer(yearlyPdf), "Yearly PDF export must return a Buffer");
    assert.ok(yearlyPdf.length > 500, "Yearly PDF buffer must contain content");
    assert.equal(yearlyPdf.slice(0, 4).toString(), "%PDF", "Buffer must begin with PDF magic header");
  });

  // ─── TEST 6: Consolidated Data API ─────────────────────────────────────────
  await t.test("6. Consolidated Data API for UI Preview", async () => {
    const data = await AttendanceExportService.getConsolidatedData(tenantId, 2026, "25_24");
    assert.equal(data.year, 2026);
    assert.equal(data.cycle, "25_24");
    assert.equal(data.months.length, 12);
    assert.ok(data.employees.length >= 1, "Must return regular employees");
    const esther = data.employees.find((e) => e.employeeCode === "GET-001");
    assert.ok(esther, "Esther Nirmala must be in consolidated data");
    assert.equal(esther.monthlyCredits.length, 12, "Must contain 12 months credit list");
    assert.equal(esther.totalCredit, 12, "Esther joined in 2025 so she gets 12 credits in 2026");
    assert.equal(esther.status, "No LOP", "Without absences/unpaid leave status must be No LOP");
  });

  await cleanup();
});
