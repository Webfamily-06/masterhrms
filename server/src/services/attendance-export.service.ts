import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { rawPrisma } from "../prisma.js";
import { SandwichLeaveService } from "./sandwich-leave.service.js";

export type AttendanceCycle = "25_24" | "calendar";

export interface PeriodDateInfo {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  dayNum: number;
  weekdayShort: string; // Sat, Sun, Mon...
  weekdayFull: string; // Saturday, Sunday, Monday...
  displayHeader: string; // e.g. "Sat Jul 25 2026"
}

export interface EmployeeAttendanceRow {
  sNo: number;
  employeeId: string;
  employeeCode: string;
  name: string;
  doj: string; // formatted Date of Joining
  dojRaw: Date | null;
  department: string;
  branch: string;
  employmentType: string;
  days: {
    dateStr: string;
    dayNum: number;
    weekday: string;
    code: "P" | "A" | "HD" | "L" | "H" | "WE" | "F" | "NA";
    hours: number;
    notes?: string;
    checkIn?: string | null;
    checkOut?: string | null;
    statusCode?: string;
    isLeave?: boolean;
    leaveType?: string | null;
    isSandwich?: boolean;
    remarks?: string;
  }[];
  summary: {
    presentDays: number;
    absentDays: number;
    halfDays: number;
    leaveDays: number;
    holidayDays: number;
    weeklyOffDays: number;
    totalWorkingDays: number;
    lopDays: number;
    paidDays: number;
  };
}

export interface ConsolidatedEmployeeSummary {
  sNo: number;
  employeeId: string;
  employeeCode: string;
  name: string;
  doj: string;
  dojRaw: Date | null;
  department: string;
  branch: string;
  employmentType: string;
  monthlyCredits: number[]; // 12 elements (Jan-Dec)
  totalCredit: number;
  monthlyUtilised: number[]; // 12 elements (Jan-Dec)
  totalUtilised: number;
  monthlyLop: number[]; // 12 elements (Jan-Dec)
  totalLop: number;
  cumulativeBalance: number;
  status: "No LOP" | string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const REFERENCE_MONTH_SHEETS = [
  "Jan", "Feb", "Mar", "April", "May", "June",
  "July", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export class AttendanceExportService {
  /**
   * Resolve exact dates in a period according to cycle
   */
  static resolvePeriodDates(year: number, month: number, cycle: AttendanceCycle = "25_24"): PeriodDateInfo[] {
    const dates: PeriodDateInfo[] = [];
    const weekdayFullNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const weekdayShortNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    let startDate: Date;
    let endDate: Date;

    if (cycle === "25_24") {
      // e.g. for August 2026 (month=8): July 25 to August 24
      if (month === 1) {
        startDate = new Date(Date.UTC(year - 1, 11, 25));
        endDate = new Date(Date.UTC(year, 0, 24));
      } else {
        startDate = new Date(Date.UTC(year, month - 2, 25));
        endDate = new Date(Date.UTC(year, month - 1, 24));
      }
    } else {
      // Calendar month: 1st to last day of month
      const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
      startDate = new Date(Date.UTC(year, month - 1, 1));
      endDate = new Date(Date.UTC(year, month - 1, daysInMonth));
    }

    const cur = new Date(startDate);
    while (cur <= endDate) {
      const curCopy = new Date(cur);
      const dayOfWeek = curCopy.getUTCDay();
      const dateStr = curCopy.toISOString().slice(0, 10);
      const dayNum = curCopy.getUTCDate();

      dates.push({
        date: curCopy,
        dateStr,
        dayNum,
        weekdayShort: weekdayShortNames[dayOfWeek],
        weekdayFull: weekdayFullNames[dayOfWeek],
        displayHeader: `${weekdayShortNames[dayOfWeek]} ${MONTH_SHORT[curCopy.getUTCMonth()]} ${dayNum} ${curCopy.getUTCFullYear()}`,
      });

      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    return dates;
  }

  /**
   * Fetch and calculate monthly attendance matrix data for all or filtered employees
   */
  static async getMonthlyAttendanceMatrix(
    tenantId: string,
    year: number,
    month: number,
    cycle: AttendanceCycle = "25_24",
    filters?: {
      branchId?: string;
      departmentId?: string;
      employeeId?: string;
      employeeIds?: string[];
      employmentType?: string;
      includeInactive?: boolean;
    }
  ): Promise<{
    periodDates: PeriodDateInfo[];
    monthLabel: string;
    sheetName: string;
    rows: EmployeeAttendanceRow[];
  }> {
    const periodDates = this.resolvePeriodDates(year, month, cycle);
    const startDate = periodDates[0].date;
    const endDate = periodDates[periodDates.length - 1].date;
    const endDateWithTime = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate(), 23, 59, 59, 999));

    // Employee query
    const empWhere: any = { tenantId };
    if (!filters?.includeInactive) {
      empWhere.status = "active";
    }
    if (filters?.employeeIds && Array.isArray(filters.employeeIds) && filters.employeeIds.length > 0) {
      empWhere.id = { in: filters.employeeIds };
    } else if (filters?.employeeId && filters.employeeId !== "all") {
      if (typeof filters.employeeId === "string" && filters.employeeId.includes(",")) {
        empWhere.id = { in: filters.employeeId.split(",").map((s: string) => s.trim()).filter(Boolean) };
      } else {
        empWhere.id = filters.employeeId;
      }
    }
    if (filters?.branchId && filters.branchId !== "all") {
      empWhere.branchId = filters.branchId;
    }
    if (filters?.departmentId && filters.departmentId !== "all") {
      empWhere.departmentId = filters.departmentId;
    }
    if (filters?.employmentType && filters.employmentType !== "all") {
      empWhere.employmentType = filters.employmentType;
    }

    const [employees, attendanceRecords, approvedLeaves, attendancePolicies, shiftRosters, holidays] = await Promise.all([
      rawPrisma.employee.findMany({
        where: empWhere,
        include: {
          department: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          designation: { select: { id: true, name: true } },
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      }),
      rawPrisma.attendance.findMany({
        where: {
          tenantId,
          date: { gte: startDate, lte: endDateWithTime },
        },
      }),
      rawPrisma.leaveRequest.findMany({
        where: {
          tenantId,
          status: "approved",
          startDate: { lte: endDateWithTime },
          endDate: { gte: startDate },
        },
        include: { leaveType: true },
      }),
      rawPrisma.attendancePolicy.findMany({ where: { tenantId } }),
      rawPrisma.shiftRoster.findMany({
        where: {
          tenantId,
          rosterDate: { gte: startDate, lte: endDateWithTime },
        },
      }),
      rawPrisma.holiday.findMany({
        where: {
          tenantId,
          status: "active",
          date: { gte: startDate, lte: endDateWithTime },
        },
      }),
    ]);

    // Check sandwich policy setting
    const sandwichSetting = await SandwichLeaveService.getSandwichPolicySetting(tenantId);

    // Lookups
    const attendanceMap = new Map<string, any>();
    for (const att of attendanceRecords) {
      const dStr = new Date(att.date).toISOString().slice(0, 10);
      attendanceMap.set(`${att.employeeId}_${dStr}`, att);
    }

    const leaveMap = new Map<string, any>();
    for (const l of approvedLeaves) {
      const curL = new Date(l.startDate);
      const endL = new Date(l.endDate);
      while (curL <= endL) {
        leaveMap.set(`${l.employeeId}_${curL.toISOString().slice(0, 10)}`, l);
        curL.setUTCDate(curL.getUTCDate() + 1);
      }
    }

    const rosterMap = new Map<string, any>();
    for (const sr of shiftRosters) {
      rosterMap.set(`${sr.employeeId}_${new Date(sr.rosterDate).toISOString().slice(0, 10)}`, sr);
    }

    const defaultPolicy = attendancePolicies.find((p) => p.isDefault) || attendancePolicies[0];
    const getEmployeePolicy = (emp: any) => {
      let policy = attendancePolicies.find((p) => p.branchId === emp.branchId && p.departmentId === emp.departmentId);
      if (!policy && emp.branchId) policy = attendancePolicies.find((p) => p.branchId === emp.branchId && !p.departmentId);
      if (!policy && emp.departmentId) policy = attendancePolicies.find((p) => !p.branchId && p.departmentId === emp.departmentId);
      return policy || defaultPolicy || { workingDays: "Mon,Tue,Wed,Thu,Fri" };
    };

    const now = new Date();
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const rows: EmployeeAttendanceRow[] = [];

    let sNo = 1;
    for (const emp of employees) {
      const policy = getEmployeePolicy(emp);
      const workingDaysConfig = (policy.workingDays || "Mon,Tue,Wed,Thu,Fri").toLowerCase();
      const doj = emp.joinedAt ? new Date(emp.joinedAt) : null;
      const dojStr = doj
        ? `${doj.getUTCDate().toString().padStart(2, "0")}-${MONTH_SHORT[doj.getUTCMonth()]}-${doj.getUTCFullYear()}`
        : "-";

      // Sandwich check for this employee if enabled
      let employeeSandwichDates = new Set<string>();
      if (sandwichSetting.sandwichRuleEnabled) {
        const sw = await SandwichLeaveService.evaluateEmployeeSandwichLeave(tenantId, emp.id, startDate, endDate);
        employeeSandwichDates = new Set(sw.sandwichDates);
      }

      let presentDays = 0;
      let absentDays = 0;
      let halfDays = 0;
      let leaveDays = 0;
      let holidayDays = 0;
      let weeklyOffDays = 0;
      let totalWorkingDays = 0;
      let lopDays = 0;

      const dayCells: EmployeeAttendanceRow["days"] = [];

      for (const pDate of periodDates) {
        const curDate = pDate.date;
        const curDateStr = pDate.dateStr;
        const isFuture = curDate > todayUtc;
        const isPriorToDoj = doj ? curDate < new Date(Date.UTC(doj.getUTCFullYear(), doj.getUTCMonth(), doj.getUTCDate())) : false;

        // Check holiday
        const holiday = holidays.find((h) => {
          const hdStr = new Date(h.date).toISOString().slice(0, 10);
          if (hdStr !== curDateStr) return false;
          if (!h.branchIds || h.branchIds.length === 0) return true;
          return emp.branchId ? h.branchIds.includes(emp.branchId) : true;
        });

        // Check working day
        const roster = rosterMap.get(`${emp.id}_${curDateStr}`);
        let isWorkingDay = false;
        if (roster) {
          isWorkingDay = roster.status !== "weekly_off";
        } else {
          isWorkingDay = workingDaysConfig.includes(pDate.weekdayShort.toLowerCase());
        }

        if (isWorkingDay && !holiday && !isPriorToDoj) {
          totalWorkingDays++;
        }

        const att = attendanceMap.get(`${emp.id}_${curDateStr}`);
        const leave = leaveMap.get(`${emp.id}_${curDateStr}`);
        const isSandwich = employeeSandwichDates.has(curDateStr);

        let code: EmployeeAttendanceRow["days"][0]["code"] = "A";
        let hours = att?.hours ? Number(att.hours) : 0;
        let notes = att?.notes || "";

        if (isPriorToDoj) {
          code = "NA";
        } else if (isFuture) {
          code = "F";
        } else if (att) {
          // Check punch status
          if (att.status === "present" || att.status === "late") {
            code = "P";
            presentDays++;
          } else if (att.status === "half_day") {
            code = "HD";
            halfDays++;
            presentDays += 0.5;
            absentDays += 0.5;
          } else if (att.status === "on_leave") {
            code = "L";
            leaveDays++;
            if (leave && !leave.leaveType?.isPaid) {
              lopDays++;
            }
          } else if (att.status === "absent") {
            code = "A";
            absentDays++;
            lopDays++;
          } else {
            code = "P";
            presentDays++;
          }
        } else if (leave) {
          code = "L";
          leaveDays++;
          notes = leave.leaveType?.name || "Leave";
          if (!leave.leaveType?.isPaid) {
            lopDays++;
          }
        } else if (isSandwich) {
          // Sandwich leave deducted as Leave / LOP
          code = "L";
          leaveDays++;
          lopDays++;
          notes = "Sandwich Leave";
        } else if (holiday) {
          code = "H";
          holidayDays++;
          notes = holiday.name;
        } else if (!isWorkingDay) {
          code = "WE";
          weeklyOffDays++;
        } else {
          // Elapsed scheduled working day without punch
          code = "A";
          absentDays++;
          lopDays++;
        }

        const checkInIso = att?.checkIn ? new Date(att.checkIn).toISOString() : null;
        const checkOutIso = att?.checkOut ? new Date(att.checkOut).toISOString() : null;
        const statusCode = att?.status
          ? att.status.toUpperCase()
          : leave
          ? "ON_LEAVE"
          : isSandwich
          ? "SANDWICH_LEAVE"
          : holiday
          ? "HOLIDAY"
          : !isWorkingDay
          ? "WEEKLY_OFF"
          : isPriorToDoj
          ? "NOT_JOINED"
          : isFuture
          ? "FUTURE"
          : "ABSENT";

        dayCells.push({
          dateStr: curDateStr,
          dayNum: pDate.dayNum,
          weekday: pDate.weekdayShort,
          code,
          hours,
          notes,
          checkIn: checkInIso,
          checkOut: checkOutIso,
          statusCode,
          isLeave: Boolean(leave || isSandwich),
          leaveType: leave?.leaveType?.name || (isSandwich ? "Sandwich Leave" : null),
          isSandwich,
          remarks: notes || att?.notes || leave?.reason || (holiday ? holiday.name : ""),
        });
      }

      const paidDays = Math.max(0, periodDates.length - lopDays);

      rows.push({
        sNo: sNo++,
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        name: `${emp.firstName} ${emp.lastName}`.trim(),
        doj: dojStr,
        dojRaw: doj,
        department: emp.department?.name || "General",
        branch: emp.branch?.name || "HQ",
        employmentType: emp.employmentType,
        days: dayCells,
        summary: {
          presentDays: Math.round(presentDays * 10) / 10,
          absentDays: Math.round(absentDays * 10) / 10,
          halfDays,
          leaveDays,
          holidayDays,
          weeklyOffDays,
          totalWorkingDays,
          lopDays: Math.round(lopDays * 10) / 10,
          paidDays: Math.round(paidDays * 10) / 10,
        },
      });
    }

    const monthName = MONTH_NAMES[month - 1];
    const yearShort = String(year).slice(-2);
    const sheetName = `${REFERENCE_MONTH_SHEETS[month - 1]} ${yearShort}`;

    return {
      periodDates,
      monthLabel: `${monthName} ${year}`,
      sheetName,
      rows,
    };
  }

  /**
   * Generates single-month Excel matching reference workbook layout
   */
  static async generateMonthlyExcelWorkbook(
    tenantId: string,
    year: number,
    month: number,
    cycle: AttendanceCycle = "25_24",
    filters?: any
  ): Promise<ExcelJS.Workbook> {
    const data = await this.getMonthlyAttendanceMatrix(tenantId, year, month, cycle, filters);
    const wb = new ExcelJS.Workbook();
    wb.creator = "MASTERHRMS Enterprise";
    wb.created = new Date();

    const ws = wb.addWorksheet(data.sheetName, {
      views: [{ state: "frozen", xSplit: 2, ySplit: 2, showGridLines: true }],
    });

    const numDays = data.periodDates.length;

    // Row 1: Weekday Names with EMP NAME and DOJ headers
    const row1Values: (string | number)[] = [
      "EMP NAME",
      "DOJ",
      ...data.periodDates.map((d) => d.weekdayFull),
      "ABSENT DAYS",
      "PRESENT DAYS",
    ];
    const headerRow1 = ws.addRow(row1Values);
    headerRow1.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF0F172A" } };
    headerRow1.height = 22;

    // Row 2: Formatted Dates
    const row2Values: (string | number)[] = [
      "EMP NAME",
      "DOJ",
      ...data.periodDates.map((d) => d.displayHeader),
      "ABSENT DAYS",
      "PRESENT DAYS",
    ];
    const headerRow2 = ws.addRow(row2Values);
    headerRow2.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF334155" } };
    headerRow2.height = 20;

    // Style header rows
    [headerRow1, headerRow2].forEach((row) => {
      row.eachCell((cell, colNum) => {
        cell.alignment = { vertical: "middle", horizontal: colNum <= 2 ? "left" : "center" };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: colNum > numDays + 2 ? "FFE2E8F0" : "FFF1F5F9" },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFCBD5E1" } },
          bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
          left: { style: "thin", color: { argb: "FFCBD5E1" } },
          right: { style: "thin", color: { argb: "FFCBD5E1" } },
        };
      });
    });

    // Data rows
    data.rows.forEach((empRow, rowIndex) => {
      const excelRowIndex = rowIndex + 3;
      const startColLetter = "C";
      const endColLetter = ws.getColumn(numDays + 2).letter;

      const rowValues: any[] = [
        empRow.name,
        empRow.doj,
        ...empRow.days.map((d) => d.code),
        { formula: `COUNTIF(${startColLetter}${excelRowIndex}:${endColLetter}${excelRowIndex},"A") + COUNTIF(${startColLetter}${excelRowIndex}:${endColLetter}${excelRowIndex},"L")` },
        { formula: `COUNTIF(${startColLetter}${excelRowIndex}:${endColLetter}${excelRowIndex},"P") + (COUNTIF(${startColLetter}${excelRowIndex}:${endColLetter}${excelRowIndex},"HD")*0.5)` },
      ];

      const row = ws.addRow(rowValues);
      row.height = 20;

      row.eachCell((cell, colNum) => {
        cell.alignment = { vertical: "middle", horizontal: colNum <= 2 ? "left" : "center" };
        cell.font = { name: "Calibri", size: 10 };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };

        if (colNum >= 3 && colNum <= numDays + 2) {
          const val = String(cell.value || "");
          if (val === "P") {
            cell.font = { bold: true, color: { argb: "FF15803D" } }; // Green
          } else if (val === "A") {
            cell.font = { bold: true, color: { argb: "FFDC2626" } }; // Red
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
          } else if (val === "HD") {
            cell.font = { bold: true, color: { argb: "FFD97706" } }; // Amber
          } else if (val === "L") {
            cell.font = { bold: true, color: { argb: "FF2563EB" } }; // Blue
          } else if (val === "H") {
            cell.font = { bold: true, color: { argb: "FF7C3AED" } }; // Purple
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3E8FF" } };
          } else if (val === "WE") {
            cell.font = { color: { argb: "FF64748B" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
          }
        }
      });
    });

    // Column widths
    ws.getColumn(1).width = 24; // Name
    ws.getColumn(2).width = 16; // DOJ
    for (let c = 3; c <= numDays + 2; c++) {
      ws.getColumn(c).width = 7.5;
    }
    ws.getColumn(numDays + 3).width = 15; // Absent days
    ws.getColumn(numDays + 4).width = 15; // Present days

    const formatExcelTime = (iso?: string | null): string => {
      if (!iso) return "-";
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "-";
      return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    };

    // ==========================================
    // Sheet 2: "Detailed Attendance Log"
    // Authoritative day-by-day punch and leave log matching Employee Dashboard
    // ==========================================
    const wsDetails = wb.addWorksheet("Detailed Attendance Log", {
      views: [{ state: "frozen", ySplit: 1, showGridLines: true }],
    });

    const detailHeaders = [
      "S.No",
      "Employee Code",
      "Employee Name",
      "Department",
      "Branch",
      "Attendance Date",
      "Weekday",
      "Status",
      "Check-In Time",
      "Check-Out Time",
      "Working Hours",
      "Approved Leave",
      "Leave Type",
      "Sandwich Leave",
      "Remarks",
    ];

    const detailHeaderRow = wsDetails.addRow(detailHeaders);
    detailHeaderRow.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    detailHeaderRow.height = 24;
    detailHeaderRow.eachCell((cell) => {
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E293B" }, // Slate-800
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FF334155" } },
        bottom: { style: "thin", color: { argb: "FF334155" } },
        left: { style: "thin", color: { argb: "FF334155" } },
        right: { style: "thin", color: { argb: "FF334155" } },
      };
    });

    let detailSNo = 1;
    data.rows.forEach((emp) => {
      emp.days.forEach((day) => {
        const row = wsDetails.addRow([
          detailSNo++,
          emp.employeeCode,
          emp.name,
          emp.department,
          emp.branch,
          day.dateStr,
          day.weekday,
          day.statusCode || day.code,
          formatExcelTime(day.checkIn),
          formatExcelTime(day.checkOut),
          day.hours || 0,
          day.isLeave ? "YES" : "NO",
          day.leaveType || "-",
          day.isSandwich ? "YES" : "NO",
          day.remarks || day.notes || "-",
        ]);

        row.height = 19;
        row.font = { name: "Calibri", size: 9.5 };
        row.eachCell((cell, colNum) => {
          cell.alignment = {
            vertical: "middle",
            horizontal: [1, 6, 7, 8, 9, 10, 11, 12, 14].includes(colNum) ? "center" : "left",
          };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
        });
      });
    });

    // Column widths
    wsDetails.getColumn(1).width = 7;
    wsDetails.getColumn(2).width = 16;
    wsDetails.getColumn(3).width = 24;
    wsDetails.getColumn(4).width = 18;
    wsDetails.getColumn(5).width = 16;
    wsDetails.getColumn(6).width = 15;
    wsDetails.getColumn(7).width = 12;
    wsDetails.getColumn(8).width = 15;
    wsDetails.getColumn(9).width = 14;
    wsDetails.getColumn(10).width = 14;
    wsDetails.getColumn(11).width = 14;
    wsDetails.getColumn(12).width = 14;
    wsDetails.getColumn(13).width = 18;
    wsDetails.getColumn(14).width = 14;
    wsDetails.getColumn(15).width = 28;

    return wb;
  }

  /**
   * Yearly Consolidated Attendance Workbook
   * Generates Sheet 1: Consolidated, Sheets 2-13: Jan..Dec, Sheet 14: Interns
   */
  static async generateYearlyConsolidatedWorkbook(
    tenantId: string,
    year: number,
    cycle: AttendanceCycle = "25_24",
    filters?: any
  ): Promise<ExcelJS.Workbook> {
    const wb = new ExcelJS.Workbook();
    wb.creator = "MASTERHRMS Enterprise";
    wb.created = new Date();

    // 1. Fetch monthly matrix for all 12 months
    const monthlyDataPromises = Array.from({ length: 12 }, (_, i) =>
      this.getMonthlyAttendanceMatrix(tenantId, year, i + 1, cycle, filters)
    );
    const allMonthsData = await Promise.all(monthlyDataPromises);

    // 2. Add Sheet 1: "Consolidated "
    const wsConsolidated = wb.addWorksheet("Consolidated ", {
      views: [{ state: "frozen", xSplit: 3, ySplit: 3, showGridLines: true }],
    });

    // Row 1: Merged title "GET ATTENDANCE"
    wsConsolidated.addRow(["GET ATTENDANCE"]);
    wsConsolidated.mergeCells(1, 1, 1, 43);
    const titleCell = wsConsolidated.getCell(1, 1);
    titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    wsConsolidated.getRow(1).height = 26;

    // Row 2: Category Headers
    const row2 = [
      "S.No",
      "NAME ",
      "DATE OF JOINING",
      ...Array(12).fill("Leave Credits"),
      "Total Leave credit",
      ...Array(12).fill("Utilised"),
      "Total Leave Utilised",
      ...Array(12).fill("LOP"),
      "Cumulative Leaves Balance",
      "Status",
    ];
    const r2 = wsConsolidated.addRow(row2);
    r2.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF1E293B" } };
    r2.height = 20;

    // Merge categories on Row 2
    wsConsolidated.mergeCells(2, 4, 2, 15); // Leave Credits (D2:O2)
    wsConsolidated.mergeCells(2, 17, 2, 28); // Utilised (Q2:AB2)
    wsConsolidated.mergeCells(2, 30, 2, 41); // LOP (AD2:AO2)

    // Row 3: Sub-headers (Month abbreviations Jan..Dec)
    const row3 = [
      "S.No",
      "NAME ",
      "DATE OF JOINING",
      ...MONTH_SHORT,
      "Total Leave credit",
      ...MONTH_SHORT,
      "Total Leave Utilised",
      ...MONTH_SHORT,
      "Cumulative Leaves Balance",
      "Status",
    ];
    const r3 = wsConsolidated.addRow(row3);
    r3.font = { name: "Calibri", size: 9, bold: true, color: { argb: "FF475569" } };
    r3.height = 20;

    // Header styling
    [r2, r3].forEach((row) => {
      row.eachCell((cell, colNum) => {
        cell.alignment = { vertical: "middle", horizontal: colNum <= 3 ? "left" : "center" };
        cell.border = {
          top: { style: "thin", color: { argb: "FFCBD5E1" } },
          bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
          left: { style: "thin", color: { argb: "FFCBD5E1" } },
          right: { style: "thin", color: { argb: "FFCBD5E1" } },
        };
        // Pastel tints for category separation
        if (colNum >= 4 && colNum <= 15) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0F2FE" } }; // Light blue for Credits
        } else if (colNum === 16) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFBAE6FD" } }; // Darker blue for Total Credit
        } else if (colNum >= 17 && colNum <= 28) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } }; // Amber for Utilised
        } else if (colNum === 29) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDE68A" } }; // Darker amber for Total Utilised
        } else if (colNum >= 30 && colNum <= 41) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } }; // Red for LOP
        } else if (colNum >= 42) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } }; // Green for Balance
        } else {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
        }
      });
    });

    // Get consolidated list of regular employees (non-interns)
    const regularEmployees = allMonthsData[0].rows.filter((r) => r.employmentType !== "intern");

    // Add Consolidated rows
    regularEmployees.forEach((emp, empIdx) => {
      const excelRow = empIdx + 4; // Data starts at Row 4
      const doj = emp.dojRaw;

      // 12 months leave credits: 1 credit per month worked (if joined prior to month end)
      const credits: (number | string)[] = [];
      const utilised: (number | string)[] = [];
      const lop: (number | string)[] = [];

      for (let m = 0; m < 12; m++) {
        const monthEnd = new Date(Date.UTC(year, m + 1, 0));
        const isEligible = !doj || doj <= monthEnd;
        credits.push(isEligible ? 1 : "");

        const monthEmpRow = allMonthsData[m].rows.find((r) => r.employeeId === emp.employeeId);
        const u = monthEmpRow ? monthEmpRow.summary.leaveDays : 0;
        const l = monthEmpRow ? monthEmpRow.summary.lopDays : 0;
        utilised.push(u > 0 ? u : "");
        lop.push(l > 0 ? l : "");
      }

      // Column addresses:
      // Leave Credits: D through O (cols 4-15)
      // Total Credit: P (col 16) = SUM(D4:O4)
      // Utilised: Q through AB (cols 17-28)
      // Total Utilised: AC (col 29) = SUM(Q4:AB4)
      // LOP: AD through AO (cols 30-41)
      // Cumulative Balance: AP (col 42) = P4 - AC4
      // Status: AQ (col 43) = IF(AP4>=0, "No LOP", "LOP")

      const rowValues: any[] = [
        emp.sNo,
        emp.name,
        emp.doj,
        ...credits,
        { formula: `SUM(D${excelRow}:O${excelRow})` },
        ...utilised,
        { formula: `SUM(Q${excelRow}:AB${excelRow})` },
        ...lop,
        { formula: `P${excelRow}-AC${excelRow}` },
        { formula: `IF(AP${excelRow}>=0,"No LOP","LOP")` },
      ];

      const r = wsConsolidated.addRow(rowValues);
      r.height = 19;
      r.eachCell((cell, colNum) => {
        cell.alignment = { vertical: "middle", horizontal: colNum <= 3 ? "left" : "center" };
        cell.font = { name: "Calibri", size: 10 };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
        if (colNum === 16 || colNum === 29 || colNum === 42) {
          cell.font = { bold: true };
        }
      });
    });

    // Column widths for Consolidated
    wsConsolidated.getColumn(1).width = 6;
    wsConsolidated.getColumn(2).width = 24;
    wsConsolidated.getColumn(3).width = 16;
    for (let c = 4; c <= 43; c++) {
      wsConsolidated.getColumn(c).width = c === 16 || c === 29 || c === 42 || c === 43 ? 12 : 5.5;
    }

    // 3. Add Interns Sheet if interns exist
    const internEmployees = allMonthsData[0].rows.filter((r) => r.employmentType === "intern");
    if (internEmployees.length > 0) {
      const wsInterns = wb.addWorksheet("Interns", { views: [{ showGridLines: true }] });
      wsInterns.addRow(["INTERNS ATTENDANCE"]);
      wsInterns.mergeCells(1, 1, 1, 35);
      const intTitle = wsInterns.getCell(1, 1);
      intTitle.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
      intTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };

      const augData = allMonthsData[7]; // August as default or active
      const intHeader1 = ["Name", "Joining Date", ...augData.periodDates.map((d) => d.weekdayFull)];
      wsInterns.addRow(intHeader1);
      const intHeader2 = ["Name", "Joining Date", ...augData.periodDates.map((d) => d.displayHeader)];
      wsInterns.addRow(intHeader2);

      internEmployees.forEach((emp) => {
        const row = [emp.name, emp.doj, ...emp.days.map((d) => d.code)];
        wsInterns.addRow(row);
      });
    }

    // 4. Add the 12 Monthly Worksheets (Jan 26 through Dec 26)
    for (let m = 0; m < 12; m++) {
      const monthData = allMonthsData[m];
      const wsMonth = wb.addWorksheet(monthData.sheetName, {
        views: [{ state: "frozen", xSplit: 2, ySplit: 2, showGridLines: true }],
      });

      const numDays = monthData.periodDates.length;

      // Row 1: Weekday Names
      wsMonth.addRow([
        "EMP NAME",
        "DOJ",
        ...monthData.periodDates.map((d) => d.weekdayFull),
        "ABSENT DAYS",
        "PRESENT DAYS",
      ]);
      // Row 2: Date Strings
      wsMonth.addRow([
        "EMP NAME",
        "DOJ",
        ...monthData.periodDates.map((d) => d.displayHeader),
        "ABSENT DAYS",
        "PRESENT DAYS",
      ]);

      // Style headers
      [wsMonth.getRow(1), wsMonth.getRow(2)].forEach((r) => {
        r.height = 20;
        r.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF1E293B" } };
        r.eachCell((cell, colNum) => {
          cell.alignment = { vertical: "middle", horizontal: colNum <= 2 ? "left" : "center" };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
          cell.border = {
            top: { style: "thin", color: { argb: "FFCBD5E1" } },
            bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
            left: { style: "thin", color: { argb: "FFCBD5E1" } },
            right: { style: "thin", color: { argb: "FFCBD5E1" } },
          };
        });
      });

      // Data Rows
      monthData.rows.forEach((empRow, rowIndex) => {
        const excelRowIndex = rowIndex + 3;
        const startColLetter = "C";
        const endColLetter = wsMonth.getColumn(numDays + 2).letter;

        const rowValues: any[] = [
          empRow.name,
          empRow.doj,
          ...empRow.days.map((d) => d.code),
          { formula: `COUNTIF(${startColLetter}${excelRowIndex}:${endColLetter}${excelRowIndex},"A") + COUNTIF(${startColLetter}${excelRowIndex}:${endColLetter}${excelRowIndex},"L")` },
          { formula: `COUNTIF(${startColLetter}${excelRowIndex}:${endColLetter}${excelRowIndex},"P") + (COUNTIF(${startColLetter}${excelRowIndex}:${endColLetter}${excelRowIndex},"HD")*0.5)` },
        ];

        const row = wsMonth.addRow(rowValues);
        row.height = 19;
        row.eachCell((cell, colNum) => {
          cell.alignment = { vertical: "middle", horizontal: colNum <= 2 ? "left" : "center" };
          cell.font = { name: "Calibri", size: 10 };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
        });
      });

      wsMonth.getColumn(1).width = 24;
      wsMonth.getColumn(2).width = 16;
      for (let c = 3; c <= numDays + 2; c++) {
        wsMonth.getColumn(c).width = 7.5;
      }
      wsMonth.getColumn(numDays + 3).width = 15;
      wsMonth.getColumn(numDays + 4).width = 15;
    }

    return wb;
  }

  /**
   * Generates Landscape PDF for Monthly Attendance Record
   */
  static async generateMonthlyPdf(
    tenantId: string,
    year: number,
    month: number,
    cycle: AttendanceCycle = "25_24",
    filters?: any
  ): Promise<Buffer> {
    const data = await this.getMonthlyAttendanceMatrix(tenantId, year, month, cycle, filters);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        layout: "landscape",
        size: "A4",
        margin: 20,
      });

      const buffers: Buffer[] = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      // Header
      doc.fontSize(16).font("Helvetica-Bold").text("MASTERHRMS - MONTHLY ATTENDANCE REPORT", { align: "center" });
      doc.moveDown(0.2);
      doc.fontSize(10).font("Helvetica").text(
        `Period: ${data.monthLabel} (${cycle === "25_24" ? "25th to 24th Cutoff" : "Calendar 1st to EOM"}) | Total Employees: ${data.rows.length} | Generated: ${new Date().toLocaleString()}`,
        { align: "center" }
      );
      doc.moveDown(0.8);

      // Compact landscape table
      const startX = 20;
      let startY = doc.y;
      const colWidthName = 110;
      const colWidthDoj = 60;
      const colWidthSummary = 45;
      const dayCount = data.periodDates.length;
      const availableWidth = 842 - 40 - colWidthName - colWidthDoj - colWidthSummary * 2;
      const dayColWidth = Math.max(12, Math.floor(availableWidth / dayCount));

      // Table Header Row 1
      doc.fontSize(7).font("Helvetica-Bold");
      doc.rect(startX, startY, 842 - 40, 16).fill("#F1F5F9");
      doc.fillColor("#0F172A");

      doc.text("Employee Name", startX + 4, startY + 4, { width: colWidthName });
      doc.text("DOJ", startX + colWidthName + 4, startY + 4, { width: colWidthDoj });

      data.periodDates.forEach((pd, i) => {
        const x = startX + colWidthName + colWidthDoj + i * dayColWidth;
        doc.text(String(pd.dayNum), x, startY + 4, { width: dayColWidth, align: "center" });
      });

      const absentX = startX + colWidthName + colWidthDoj + dayCount * dayColWidth;
      doc.text("Absent", absentX, startY + 4, { width: colWidthSummary, align: "center" });
      doc.text("Present", absentX + colWidthSummary, startY + 4, { width: colWidthSummary, align: "center" });

      startY += 16;

      // Table Data Rows
      doc.font("Helvetica").fontSize(7);
      data.rows.forEach((row, rowIndex) => {
        if (startY > 550) {
          doc.addPage({ layout: "landscape", size: "A4", margin: 20 });
          startY = 30;
        }

        if (rowIndex % 2 === 1) {
          doc.rect(startX, startY, 842 - 40, 14).fill("#F8FAFC");
        }
        doc.fillColor("#1E293B");

        doc.text(row.name, startX + 4, startY + 3, { width: colWidthName, ellipsis: true });
        doc.text(row.doj, startX + colWidthName + 4, startY + 3, { width: colWidthDoj });

        row.days.forEach((d, i) => {
          const x = startX + colWidthName + colWidthDoj + i * dayColWidth;
          if (d.code === "P") doc.fillColor("#16A34A");
          else if (d.code === "A") doc.fillColor("#DC2626");
          else if (d.code === "L") doc.fillColor("#2563EB");
          else if (d.code === "H") doc.fillColor("#7C3AED");
          else if (d.code === "HD") doc.fillColor("#D97706");
          else doc.fillColor("#94A3B8");

          doc.text(d.code, x, startY + 3, { width: dayColWidth, align: "center" });
        });

        doc.fillColor("#1E293B");
        doc.text(String(row.summary.absentDays), absentX, startY + 3, { width: colWidthSummary, align: "center" });
        doc.text(String(row.summary.presentDays), absentX + colWidthSummary, startY + 3, { width: colWidthSummary, align: "center" });

        startY += 14;
      });

      // If single employee export, append comprehensive daily punch log matching Employee Dashboard
      if (data.rows.length === 1) {
        const emp = data.rows[0];
        doc.addPage({ layout: "portrait", size: "A4", margin: 25 });
        let pY = 30;

        doc.fontSize(13).font("Helvetica-Bold").fillColor("#0F172A").text(`EMPLOYEE ATTENDANCE & PUNCH AUDIT LOG`, 25, pY, { align: "center" });
        pY += 18;
        doc.fontSize(8.5).font("Helvetica").fillColor("#475569").text(
          `Employee: ${emp.name} (${emp.employeeCode}) | Dept: ${emp.department} | Branch: ${emp.branch} | Period: ${data.monthLabel}`,
          25,
          pY,
          { align: "center" }
        );
        pY += 22;

        // Detail Table Header
        doc.rect(25, pY, 545, 18).fill("#1E293B");
        doc.fillColor("#FFFFFF").fontSize(7.5).font("Helvetica-Bold");
        doc.text("Date", 30, pY + 5, { width: 65 });
        doc.text("Day", 98, pY + 5, { width: 35 });
        doc.text("Status", 136, pY + 5, { width: 70 });
        doc.text("Check In", 208, pY + 5, { width: 55, align: "center" });
        doc.text("Check Out", 265, pY + 5, { width: 55, align: "center" });
        doc.text("Hours", 322, pY + 5, { width: 40, align: "center" });
        doc.text("Leave / Notes", 365, pY + 5, { width: 95 });
        doc.text("Remarks", 462, pY + 5, { width: 100 });
        pY += 18;

        const formatPdfTime = (iso?: string | null): string => {
          if (!iso) return "-";
          const d = new Date(iso);
          return isNaN(d.getTime()) ? "-" : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
        };

        doc.font("Helvetica").fontSize(7);
        emp.days.forEach((day, idx) => {
          if (pY > 780) {
            doc.addPage({ layout: "portrait", size: "A4", margin: 25 });
            pY = 30;
          }
          if (idx % 2 === 1) {
            doc.rect(25, pY, 545, 13).fill("#F8FAFC");
          }
          doc.fillColor("#1E293B");
          doc.text(day.dateStr, 30, pY + 3, { width: 65 });
          doc.text(day.weekday, 98, pY + 3, { width: 35 });

          if (day.code === "P") doc.fillColor("#16A34A");
          else if (day.code === "A") doc.fillColor("#DC2626");
          else if (day.code === "L") doc.fillColor("#2563EB");
          else if (day.code === "H") doc.fillColor("#7C3AED");
          else if (day.code === "HD") doc.fillColor("#D97706");
          else doc.fillColor("#64748B");
          doc.text(day.statusCode || day.code, 136, pY + 3, { width: 70 });

          doc.fillColor("#1E293B");
          doc.text(formatPdfTime(day.checkIn), 208, pY + 3, { width: 55, align: "center" });
          doc.text(formatPdfTime(day.checkOut), 265, pY + 3, { width: 55, align: "center" });
          doc.text(day.hours ? `${day.hours}h` : "-", 322, pY + 3, { width: 40, align: "center" });
          doc.text(day.leaveType || (day.isSandwich ? "Sandwich Leave" : "-"), 365, pY + 3, { width: 95, ellipsis: true });
          doc.text(day.remarks || day.notes || "-", 462, pY + 3, { width: 100, ellipsis: true });

          pY += 13;
        });
      }

      doc.end();
    });
  }

  /**
   * Generates Landscape PDF for Yearly Consolidated Record
   */
  static async generateYearlyConsolidatedPdf(
    tenantId: string,
    year: number,
    cycle: AttendanceCycle = "25_24",
    filters?: any
  ): Promise<Buffer> {
    const monthlyDataPromises = Array.from({ length: 12 }, (_, i) =>
      this.getMonthlyAttendanceMatrix(tenantId, year, i + 1, cycle, filters)
    );
    const allMonthsData = await Promise.all(monthlyDataPromises);
    const regularEmployees = allMonthsData[0].rows.filter((r) => r.employmentType !== "intern");

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        layout: "landscape",
        size: "A4",
        margin: 20,
      });

      const buffers: Buffer[] = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      // Header
      doc.fontSize(15).font("Helvetica-Bold").text(`MASTERHRMS - YEARLY CONSOLIDATED ATTENDANCE (${year})`, { align: "center" });
      doc.moveDown(0.2);
      doc.fontSize(9).font("Helvetica").text(
        `Attendance Cycle: ${cycle === "25_24" ? "25th-to-24th Cutoff" : "Calendar Month"} | Total Active Employees: ${regularEmployees.length} | Generated: ${new Date().toLocaleString()}`,
        { align: "center" }
      );
      doc.moveDown(0.6);

      let startY = doc.y;
      const startX = 20;

      // Table Header Row
      doc.rect(startX, startY, 842 - 40, 18).fill("#1E293B");
      doc.fillColor("#FFFFFF").fontSize(7).font("Helvetica-Bold");

      doc.text("S.No", startX + 4, startY + 5, { width: 25 });
      doc.text("Employee Name", startX + 30, startY + 5, { width: 140 });
      doc.text("DOJ", startX + 172, startY + 5, { width: 65 });
      doc.text("Total Credits", startX + 240, startY + 5, { width: 65, align: "center" });
      doc.text("Total Utilised", startX + 310, startY + 5, { width: 65, align: "center" });
      doc.text("Total LOP", startX + 380, startY + 5, { width: 60, align: "center" });
      doc.text("Cum. Balance", startX + 445, startY + 5, { width: 65, align: "center" });
      doc.text("Status", startX + 515, startY + 5, { width: 60, align: "center" });

      startY += 18;

      // Table Data
      doc.font("Helvetica").fontSize(8);
      regularEmployees.forEach((emp, idx) => {
        if (startY > 550) {
          doc.addPage({ layout: "landscape", size: "A4", margin: 20 });
          startY = 30;
        }

        if (idx % 2 === 1) {
          doc.rect(startX, startY, 842 - 40, 15).fill("#F8FAFC");
        }
        doc.fillColor("#1E293B");

        // Calculate year totals
        let totalCredits = 0;
        let totalUtilised = 0;
        let totalLop = 0;

        for (let m = 0; m < 12; m++) {
          const monthEnd = new Date(Date.UTC(year, m + 1, 0));
          if (!emp.dojRaw || emp.dojRaw <= monthEnd) totalCredits += 1;

          const monthEmp = allMonthsData[m].rows.find((r) => r.employeeId === emp.employeeId);
          if (monthEmp) {
            totalUtilised += monthEmp.summary.leaveDays;
            totalLop += monthEmp.summary.lopDays;
          }
        }

        const balance = totalCredits - totalUtilised;
        const status = balance >= 0 ? "No LOP" : `LOP: ${Math.abs(balance)}`;

        doc.text(String(emp.sNo), startX + 4, startY + 4, { width: 25 });
        doc.text(emp.name, startX + 30, startY + 4, { width: 140, ellipsis: true });
        doc.text(emp.doj, startX + 172, startY + 4, { width: 65 });
        doc.text(String(totalCredits), startX + 240, startY + 4, { width: 65, align: "center" });
        doc.text(String(totalUtilised), startX + 310, startY + 4, { width: 65, align: "center" });
        doc.text(String(totalLop), startX + 380, startY + 4, { width: 60, align: "center" });
        doc.text(String(balance), startX + 445, startY + 4, { width: 65, align: "center" });

        if (balance >= 0) doc.fillColor("#16A34A");
        else doc.fillColor("#DC2626");
        doc.text(status, startX + 515, startY + 4, { width: 60, align: "center" });

        startY += 15;
      });

      doc.end();
    });
  }

  /**
   * Retrieves Consolidated Summary JSON for API/UI preview
   */
  static async getConsolidatedData(
    tenantId: string,
    year: number,
    cycle: AttendanceCycle = "25_24",
    filters?: any
  ): Promise<{
    year: number;
    cycle: AttendanceCycle;
    months: string[];
    employees: ConsolidatedEmployeeSummary[];
    interns: any[];
  }> {
    const monthlyDataPromises = Array.from({ length: 12 }, (_, i) =>
      this.getMonthlyAttendanceMatrix(tenantId, year, i + 1, cycle, filters)
    );
    const allMonthsData = await Promise.all(monthlyDataPromises);

    const regularEmployees = allMonthsData[0].rows.filter((r) => r.employmentType !== "intern");
    const internEmployees = allMonthsData[0].rows.filter((r) => r.employmentType === "intern");

    const employees: ConsolidatedEmployeeSummary[] = regularEmployees.map((emp) => {
      const monthlyCredits: number[] = [];
      const monthlyUtilised: number[] = [];
      const monthlyLop: number[] = [];

      for (let m = 0; m < 12; m++) {
        const monthEnd = new Date(Date.UTC(year, m + 1, 0));
        const isEligible = !emp.dojRaw || emp.dojRaw <= monthEnd;
        monthlyCredits.push(isEligible ? 1 : 0);

        const monthEmp = allMonthsData[m].rows.find((r) => r.employeeId === emp.employeeId);
        monthlyUtilised.push(monthEmp ? monthEmp.summary.leaveDays : 0);
        monthlyLop.push(monthEmp ? monthEmp.summary.lopDays : 0);
      }

      const totalCredit = monthlyCredits.reduce((a, b) => a + b, 0);
      const totalUtilised = monthlyUtilised.reduce((a, b) => a + b, 0);
      const totalLop = monthlyLop.reduce((a, b) => a + b, 0);
      const cumulativeBalance = totalCredit - totalUtilised;
      const status = cumulativeBalance >= 0 ? "No LOP" : `LOP: ${Math.abs(cumulativeBalance)}`;

      return {
        sNo: emp.sNo,
        employeeId: emp.employeeId,
        employeeCode: emp.employeeCode,
        name: emp.name,
        doj: emp.doj,
        dojRaw: emp.dojRaw,
        department: emp.department,
        branch: emp.branch,
        employmentType: emp.employmentType,
        monthlyCredits,
        totalCredit,
        monthlyUtilised,
        totalUtilised,
        monthlyLop,
        totalLop,
        cumulativeBalance,
        status,
      };
    });

    return {
      year,
      cycle,
      months: MONTH_SHORT,
      employees,
      interns: internEmployees,
    };
  }
}
