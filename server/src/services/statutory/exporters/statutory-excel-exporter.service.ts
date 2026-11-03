import ExcelJS from "exceljs";
import { StatutoryFormRegistryService } from "../statutory-form-registry.service";
import { StatutoryBuilderInput } from "../builders/form-u-builder.service";
import {
  FormUModel,
  FormVModel,
  FormWModel,
  FormXModel,
  FormSModel,
} from "../../../types/statutory-form-models";

export class StatutoryExcelExporterService {
  /**
   * Export single statutory register to Excel buffer
   */
  static async exportSingleRegister(formType: string, input: StatutoryBuilderInput): Promise<Buffer> {
    const { model } = await StatutoryFormRegistryService.generateRegister(formType, input);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "MasterHRMS Statutory Engine";
    workbook.created = new Date();

    const normalized = formType.toUpperCase().replace(/-/g, "_");
    switch (normalized) {
      case "FORM_U":
        this.addFormUSheet(workbook, model as FormUModel);
        break;
      case "FORM_V":
        this.addFormVSheet(workbook, model as FormVModel);
        break;
      case "FORM_W":
        this.addFormWSheet(workbook, model as FormWModel);
        break;
      case "FORM_X":
        this.addFormXSheet(workbook, model as FormXModel);
        break;
      case "FORM_S":
        this.addFormSSheet(workbook, model as FormSModel);
        break;
      default:
        throw new Error(`Unsupported register format for Excel export: ${formType}`);
    }

    const uint8Array = await workbook.xlsx.writeBuffer();
    return Buffer.from(uint8Array);
  }

  /**
   * Export complete 5-register multi-tab statutory bundle matching reference workbook
   */
  static async exportBundle(input: StatutoryBuilderInput): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "MasterHRMS Compliance Architecture";
    workbook.created = new Date();

    const [resU, resV, resW, resX, resS] = await Promise.all([
      StatutoryFormRegistryService.generateRegister("FORM_U", input),
      StatutoryFormRegistryService.generateRegister("FORM_V", input),
      StatutoryFormRegistryService.generateRegister("FORM_W", input),
      StatutoryFormRegistryService.generateRegister("FORM_X", input),
      StatutoryFormRegistryService.generateRegister("FORM_S", input),
    ]);

    this.addFormUSheet(workbook, resU.model as FormUModel);
    this.addFormVSheet(workbook, resV.model as FormVModel);
    this.addFormWSheet(workbook, resW.model as FormWModel);
    this.addFormXSheet(workbook, resX.model as FormXModel);
    this.addFormSSheet(workbook, resS.model as FormSModel);

    const uint8Array = await workbook.xlsx.writeBuffer();
    return Buffer.from(uint8Array);
  }

  // --- SHEET BUILDERS ---

  private static addFormUSheet(wb: ExcelJS.Workbook, data: FormUModel) {
    const ws = wb.addWorksheet("Form U");
    ws.properties.defaultRowHeight = 20;

    // Header Blocks
    ws.mergeCells("A1:AA1");
    ws.getCell("A1").value = "FORM–U";
    ws.getCell("A1").font = { bold: true, size: 14 };
    ws.getCell("A1").alignment = { horizontal: "center" };

    ws.mergeCells("A2:AA2");
    ws.getCell("A2").value = "EMPLOYEE REGISTER. [See sub-rule (1) of rule (16)]";
    ws.getCell("A2").font = { bold: true, size: 12 };
    ws.getCell("A2").alignment = { horizontal: "center" };

    ws.getCell("A3").value = "Name and Address of the Establishment:";
    ws.getCell("E3").value = `${data.establishment.name}, ${data.establishment.address}`;
    ws.getCell("A3").font = { bold: true };

    ws.getCell("A4").value = "Registration Certificate No:";
    ws.getCell("E4").value = data.establishment.registrationNumber;
    ws.getCell("A4").font = { bold: true };

    // Columns
    const headerRow = ws.addRow(data.columns);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0F2FE" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Data rows
    data.rows.forEach((r) => {
      ws.addRow([
        r.slNo,
        r.employeeName,
        r.employeeCode,
        r.gender,
        r.fatherOrSpouseName,
        r.dateOfBirth,
        r.dateOfJoining,
        r.designation,
        r.department,
        r.education,
        r.permanentAddress,
        r.presentAddress,
        r.mobileNumber,
        r.emailId,
        r.aadhaarNumber,
        r.panNumber,
        r.uanNumber,
        r.epfNumber,
        r.esiNumber,
        r.bankAccountNumber,
        r.bankNameAndBranch,
        r.ifscCode,
        r.completion480DaysDate,
        r.permanentEmploymentDate,
        r.dateOfExit,
        r.reasonForExit,
        r.specimenSignature,
      ]);
    });

    // Auto-fit column widths
    ws.columns.forEach((col) => {
      col.width = Math.max(14, 18);
    });
  }

  private static addFormVSheet(wb: ExcelJS.Workbook, data: FormVModel) {
    const ws = wb.addWorksheet("Form V");
    ws.properties.defaultRowHeight = 20;

    ws.mergeCells("A1:AT1");
    ws.getCell("A1").value = "FORM–V: REGISTER OF EMPLOYMENT. [See sub-rule (1) of rule (16)]";
    ws.getCell("A1").font = { bold: true, size: 14 };
    ws.getCell("A1").alignment = { horizontal: "center" };

    ws.getCell("A2").value = `For the period from: ${data.establishment.period}`;
    ws.getCell("A2").font = { bold: true };

    ws.getCell("A3").value = "Establishment:";
    ws.getCell("D3").value = `${data.establishment.name}, ${data.establishment.address}`;
    ws.getCell("A3").font = { bold: true };

    ws.getCell("A4").value = "Manager/Incharge:";
    ws.getCell("D4").value = data.establishment.managerName;
    ws.getCell("A4").font = { bold: true };

    // Columns
    const headerRow = ws.addRow(data.columns);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF0FDF4" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    data.rows.forEach((r) => {
      ws.addRow([
        r.slNo,
        r.employeeName,
        r.employeeCode,
        r.commencementTime,
        r.restInterval,
        r.workEndTime,
        ...r.dailyAttendance,
        r.totalDaysWorked,
        r.overtimeHoursWorked,
        r.totalRestIntervalsAvailed,
        r.workerClassification,
        r.weeklyHolidayGranted,
        r.compensatoryHolidaysDue,
        r.compensatoryHolidaysAvailed,
        r.noticeShiftChangeDate,
        r.employerSignature,
      ]);
    });

    ws.views = [{ state: "frozen", ySplit: 5 }];
    ws.columns.forEach((col) => {
      col.width = 12;
    });
    ws.getColumn(2).width = 24; // Name
  }

  private static addFormWSheet(wb: ExcelJS.Workbook, data: FormWModel) {
    const ws = wb.addWorksheet("FORM W ");
    ws.properties.defaultRowHeight = 20;

    ws.mergeCells("A1:AH1");
    ws.getCell("A1").value = "FORM–W: REGISTER OF WAGES [See sub-rule (1) of rule (16)]";
    ws.getCell("A1").font = { bold: true, size: 14 };
    ws.getCell("A1").alignment = { horizontal: "center" };

    ws.getCell("A2").value = `Wage period: ${data.establishment.period}`;
    ws.getCell("A2").font = { bold: true };

    ws.getCell("A3").value = "Establishment:";
    ws.getCell("D3").value = `${data.establishment.name}, ${data.establishment.address}`;
    ws.getCell("A3").font = { bold: true };

    ws.getCell("A4").value = "Registration No:";
    ws.getCell("D4").value = data.establishment.registrationNumber;
    ws.getCell("A4").font = { bold: true };

    const headerRow = ws.addRow(data.columns);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFEF3C7" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    data.rows.forEach((r) => {
      ws.addRow([
        r.slNo,
        r.employeeName,
        r.employeeCode,
        r.daysWorked,
        r.basicWageEarned,
        r.daEarned,
        r.hraEarned,
        r.specialAllowanceEarned,
        r.bonusEarned,
        r.overtimeWages,
        r.arrearsAmount,
        r.grossWagesEarned,
        r.minimumWageBenchmark,
        r.epfEmployeeDeduction,
        r.esiEmployeeDeduction,
        r.ptDeduction,
        r.lwfEmployeeDeduction,
        r.tdsDeduction,
        r.loanDeductions,
        r.damageLossDeductions,
        r.totalDeductions,
        r.netWagesPaid,
        r.dateOfPayment,
        r.paymentMode,
        r.bankUtrRef,
        "Primary Bank",
        "—",
        "—",
        "—",
        r.workerReceiptSignatures,
        r.workerReceiptSignatures,
        data.establishment.managerName || "HR Manager",
        `SEAL-${data.establishment.registrationNumber}`,
        "Automated Compliance Engine",
      ]);
    });

    // Summary Totals Row
    const totalsRow = ws.addRow([
      "TOTAL",
      "—",
      `Count: ${data.totals.totalEmployees}`,
      data.totals.totalDaysWorked,
      data.totals.totalBasic,
      0,
      0,
      0,
      0,
      0,
      0,
      data.totals.totalGrossWages,
      "—",
      data.totals.totalEpf,
      data.totals.totalEsi,
      data.totals.totalPt,
      data.totals.totalLwf,
      data.totals.totalTds,
      0,
      0,
      data.totals.totalDeductions,
      data.totals.totalNetWages,
      "—",
      "—",
      "—",
      "—",
      "—",
      "—",
      "—",
      "—",
      "—",
      "—",
      "—",
      "—",
    ]);
    totalsRow.font = { bold: true };

    ws.views = [{ state: "frozen", ySplit: 5 }];
    ws.columns.forEach((col) => {
      col.width = 14;
    });
    ws.getColumn(2).width = 24;
  }

  private static addFormXSheet(wb: ExcelJS.Workbook, data: FormXModel) {
    const ws = wb.addWorksheet("Form X");
    ws.properties.defaultRowHeight = 20;

    ws.mergeCells("A1:U1");
    ws.getCell("A1").value = "FORM–X: REGISTER OF LEAVE AND SOCIAL SECURITY BENEFITS [Rule 16(1)]";
    ws.getCell("A1").font = { bold: true, size: 14 };
    ws.getCell("A1").alignment = { horizontal: "center" };

    ws.getCell("A2").value = `Period: ${data.establishment.period}`;
    ws.getCell("A2").font = { bold: true };

    ws.getCell("A3").value = "Establishment:";
    ws.getCell("D3").value = `${data.establishment.name}, ${data.establishment.address}`;
    ws.getCell("A3").font = { bold: true };

    const headerRow = ws.addRow(data.columns);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF3E8FF" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    data.rows.forEach((r) => {
      ws.addRow([
        r.slNo,
        r.employeeName,
        r.employeeCode,
        r.earnedLeaveOpening,
        r.earnedLeaveEarned,
        r.earnedLeaveAvailed,
        r.earnedLeaveBalance,
        r.medicalLeaveOpening,
        r.medicalLeaveAvailed,
        r.medicalLeaveBalance,
        r.otherLeaveOpening,
        r.otherLeaveAvailed,
        r.otherLeaveBalance,
        r.maternityNoticeDate,
        r.maternityAdvanceAmount,
        r.maternitySubsequentAmount,
        r.medicalBonusAmount,
        r.maternityWagesLeave,
        r.gratuityNominationReceived,
        r.gratuityPaidOnExit,
        r.remarks,
      ]);
    });

    ws.columns.forEach((col) => {
      col.width = 16;
    });
    ws.getColumn(2).width = 24;
  }

  private static addFormSSheet(wb: ExcelJS.Workbook, data: FormSModel) {
    const ws = wb.addWorksheet("FORM S");
    ws.properties.defaultRowHeight = 20;

    ws.mergeCells("A1:AL1");
    ws.getCell("A1").value = "FORM – S: Notice of Daily Hours Of Work, Rest Interval, Weekly Holiday [Rule 18(4)]";
    ws.getCell("A1").font = { bold: true, size: 14 };
    ws.getCell("A1").alignment = { horizontal: "center" };

    ws.getCell("A2").value = "Establishment:";
    ws.getCell("D2").value = `${data.establishment.name}, ${data.establishment.address}`;
    ws.getCell("A2").font = { bold: true };

    ws.getCell("A3").value = "Date of payment of wages:";
    ws.getCell("D3").value = data.establishment.dateOfPaymentOfWages;
    ws.getCell("A3").font = { bold: true };

    const headerRow = ws.addRow(data.columns);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFCE7F3" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    data.rows.forEach((r) => {
      ws.addRow([
        r.slNo,
        r.employeeName,
        r.gender,
        r.fatherOrSpouseName,
        r.designation,
        r.employeeCode,
        r.dateOfJoining,
        r.workerClassification,
        r.shiftNumber,
        r.commencementTime,
        r.restIntervalStart,
        r.restIntervalDuration,
        r.workEndTime,
        r.weeklyHoliday,
        r.classOfWork,
        r.rateOfWagesMax,
        r.rateOfWagesMin,
        ...r.dailyShiftSchedule,
        r.employerSignature,
      ]);
    });

    ws.columns.forEach((col) => {
      col.width = 14;
    });
    ws.getColumn(2).width = 24;
  }
}

