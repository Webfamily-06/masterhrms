import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';
import { CompanyProfileService } from './company-profile/company-profile.service';

export interface ColumnDefinition {
  key: string;
  header: string;
  width?: number;
  format?: 'text' | 'number' | 'currency' | 'date';
  formula?: string; // e.g. '=SUM({col}3:{col}{lastRow})'
}

export interface ColumnGroupDefinition {
  groupName: string;
  fillColor: string; // Hex color e.g. '#E3F2FD'
  textColor?: string;
  columns: ColumnDefinition[];
}

export interface ExportTemplateStructure {
  templateCode: string;
  name: string;
  orientation: 'landscape' | 'portrait';
  groups: ColumnGroupDefinition[];
}

export const PHASE1_DEFAULT_EXPORT_TEMPLATE: ExportTemplateStructure = {
  templateCode: 'ENABL_AUG_2026_MASTER',
  name: 'Standard Staffing & Corporate Paysheet (7-Group IR)',
  orientation: 'landscape',
  groups: [
    {
      groupName: '1. EMPLOYEE MASTER DETAILS',
      fillColor: 'E8EAF6', // Soft Indigo
      textColor: '1A237E',
      columns: [
        { key: 'sno', header: 'S.No', width: 6, format: 'number' },
        { key: 'empCode', header: 'Emp ID', width: 12, format: 'text' },
        { key: 'empName', header: 'Employee Name', width: 22, format: 'text' },
        { key: 'designation', header: 'Designation', width: 18, format: 'text' },
        { key: 'department', header: 'Department', width: 16, format: 'text' },
        { key: 'doj', header: 'DOJ', width: 12, format: 'text' },
        { key: 'bankName', header: 'Bank Name', width: 16, format: 'text' },
        { key: 'bankAccount', header: 'Account No', width: 18, format: 'text' },
        { key: 'bankIfsc', header: 'IFSC', width: 14, format: 'text' },
        { key: 'pan', header: 'PAN', width: 12, format: 'text' },
        { key: 'uan', header: 'UAN', width: 14, format: 'text' },
        { key: 'esiNumber', header: 'ESIC No', width: 14, format: 'text' },
      ],
    },
    {
      groupName: '2. ATTENDANCE & LOSS OF PAY',
      fillColor: 'E0F2F1', // Soft Teal
      textColor: '004D40',
      columns: [
        { key: 'monthDays', header: 'Month Days', width: 12, format: 'number' },
        { key: 'workedDays', header: 'Worked Days', width: 12, format: 'number' },
        { key: 'paidLeaveDays', header: 'Paid Leaves', width: 12, format: 'number' },
        { key: 'lopDays', header: 'LOP Days', width: 10, format: 'number' },
        { key: 'payableDays', header: 'Payable Days', width: 12, format: 'number' },
      ],
    },
    {
      groupName: '3. FIXED SALARY STRUCTURE (CTC)',
      fillColor: 'FFF8E1', // Soft Amber
      textColor: 'F57F17',
      columns: [
        { key: 'fixBasic', header: 'Basic (Fix)', width: 14, format: 'currency' },
        { key: 'fixHra', header: 'HRA (Fix)', width: 14, format: 'currency' },
        { key: 'fixConveyance', header: 'Conveyance (Fix)', width: 16, format: 'currency' },
        { key: 'fixMedical', header: 'Medical (Fix)', width: 14, format: 'currency' },
        { key: 'fixSpecial', header: 'Special (Fix)', width: 14, format: 'currency' },
        { key: 'fixGross', header: 'Gross (Fix)', width: 16, format: 'currency' },
      ],
    },
    {
      groupName: '4. EARNED SALARY (PAYROLL)',
      fillColor: 'E8F5E9', // Soft Green
      textColor: '1B5E20',
      columns: [
        { key: 'earnBasic', header: 'Basic Earned', width: 14, format: 'currency' },
        { key: 'earnHra', header: 'HRA Earned', width: 14, format: 'currency' },
        { key: 'earnConveyance', header: 'Conveyance', width: 14, format: 'currency' },
        { key: 'earnMedical', header: 'Medical', width: 14, format: 'currency' },
        { key: 'earnSpecial', header: 'Special Allow', width: 14, format: 'currency' },
        { key: 'earnOther', header: 'Other Allow', width: 14, format: 'currency' },
        { key: 'grossEarned', header: 'Gross Earned', width: 16, format: 'currency' },
      ],
    },
    {
      groupName: '5. EMPLOYEE DEDUCTIONS & NET PAY',
      fillColor: 'FFEBEE', // Soft Red
      textColor: 'B71C1C',
      columns: [
        { key: 'dedEpf', header: 'EPF (12%)', width: 14, format: 'currency' },
        { key: 'dedEsic', header: 'ESIC (0.75%)', width: 14, format: 'currency' },
        { key: 'dedPt', header: 'Prof Tax', width: 12, format: 'currency' },
        { key: 'dedLwf', header: 'LWF (EE)', width: 12, format: 'currency' },
        { key: 'dedTds', header: 'TDS (IT)', width: 12, format: 'currency' },
        { key: 'dedOther', header: 'Other Ded', width: 12, format: 'currency' },
        { key: 'totalDeductions', header: 'Total Deductions', width: 16, format: 'currency' },
        { key: 'netPay', header: 'Net Salary', width: 16, format: 'currency' },
      ],
    },
    {
      groupName: '6. EMPLOYER CONTRIBUTIONS',
      fillColor: 'EDE7F6', // Soft Deep Purple
      textColor: '311B92',
      columns: [
        { key: 'erEpf', header: 'EPF (3.67%)', width: 14, format: 'currency' },
        { key: 'erEps', header: 'EPS (8.33%)', width: 14, format: 'currency' },
        { key: 'erEdli', header: 'EDLI (0.50%)', width: 14, format: 'currency' },
        { key: 'erPfAdmin', header: 'PF Admin (0.5%)', width: 14, format: 'currency' },
        { key: 'erEsic', header: 'ESIC (3.25%)', width: 14, format: 'currency' },
        { key: 'erLwf', header: 'LWF (ER)', width: 12, format: 'currency' },
        { key: 'totalErStatutory', header: 'Total Employer', width: 16, format: 'currency' },
      ],
    },
    {
      groupName: '7. CLIENT BILLING & INVOICE',
      fillColor: 'FFF3E0', // Soft Orange
      textColor: 'E65100',
      columns: [
        { key: 'billGross', header: 'Earned Wages', width: 14, format: 'currency' },
        { key: 'billEmployerStatutory', header: 'Statutory Reimb', width: 16, format: 'currency' },
        { key: 'serviceCharge', header: 'Service Charge', width: 14, format: 'currency' },
        { key: 'billingBase', header: 'Billing Base', width: 16, format: 'currency' },
        { key: 'gst', header: 'GST (18%)', width: 14, format: 'currency' },
        { key: 'totalInvoice', header: 'Total Billing', width: 16, format: 'currency' },
      ],
    },
  ],
};

export class PayrollExportService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Seed the default 7-group export template
   */
  async seedDefaultTemplate(tenantId: string): Promise<void> {
    await this.prisma.payrollExportTemplate.upsert({
      where: {
        tenantId_templateCode: {
          tenantId,
          templateCode: PHASE1_DEFAULT_EXPORT_TEMPLATE.templateCode,
        },
      },
      update: {
        name: PHASE1_DEFAULT_EXPORT_TEMPLATE.name,
        isDefault: true,
        structureJson: PHASE1_DEFAULT_EXPORT_TEMPLATE as any,
      },
      create: {
        tenantId,
        templateCode: PHASE1_DEFAULT_EXPORT_TEMPLATE.templateCode,
        name: PHASE1_DEFAULT_EXPORT_TEMPLATE.name,
        isDefault: true,
        structureJson: PHASE1_DEFAULT_EXPORT_TEMPLATE as any,
      },
    });
  }

  /**
   * Generate Canonical IR rows from a calculated PayrollRun
   */
  async buildCanonicalRows(tenantId: string, payrollRunId: string): Promise<{
    companyName: string;
    periodLabel: string;
    rows: Record<string, any>[];
  }> {
    const payrollRun = await this.prisma.payrollRun.findUnique({
      where: { id: payrollRunId },
      include: {
        tenant: true,
        payslips: {
          include: {
            employee: {
              include: {
                department: true,
                salaryAssignments: {
                  where: { isCurrent: true },
                  include: { structure: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!payrollRun) throw new Error(`PayrollRun ${payrollRunId} not found`);

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const periodLabel = `${monthNames[payrollRun.periodMonth - 1]} ${payrollRun.periodYear}`;

    let sno = 1;
    const rows: Record<string, any>[] = [];

    for (const slip of payrollRun.payslips) {
      const emp = slip.employee;
      const breakdown = (slip.breakdown as any) || {};
      const calculated = breakdown.calculatedValues || {};
      const attendance = breakdown.attendance || {};

      const assignment = emp.salaryAssignments[0];
      const monthlyCtc = assignment?.ctcMonthly ? Number(assignment.ctcMonthly) : Number(emp.salary || 35000);

      // Extract fixed rates or defaults
      const fixBasic = monthlyCtc * 0.5;
      const fixHra = monthlyCtc * 0.2;
      const fixConveyance = 1600;
      const fixMedical = 1250;
      const fixSpecial = Math.max(0, monthlyCtc - (fixBasic + fixHra + fixConveyance + fixMedical));

      const row: Record<string, any> = {
        sno: sno++,
        empCode: emp.employeeCode,
        empName: `${emp.firstName} ${emp.lastName || ''}`.trim(),
        designation: emp.position || 'Staff',
        department: emp.department?.name || 'Operations',
        doj: emp.joinedAt ? new Date(emp.joinedAt).toLocaleDateString('en-IN') : 'N/A',
        bankName: emp.bankName || 'N/A',
        bankAccount: emp.bankAccount || 'N/A',
        bankIfsc: emp.bankIfsc || 'N/A',
        pan: emp.pan || 'N/A',
        uan: emp.uan || 'N/A',
        esiNumber: emp.esiNumber || 'N/A',

        // Attendance
        monthDays: attendance.totalMonthDays || new Date(payrollRun.periodYear, payrollRun.periodMonth, 0).getDate(),
        workedDays: attendance.presentDays || attendance.totalMonthDays || 0,
        paidLeaveDays: attendance.approvedPaidLeaveDays || 0,
        lopDays: attendance.finalLopDays || 0,
        payableDays: attendance.payableDays || attendance.totalMonthDays || 0,

        // Fixed Structure
        fixBasic,
        fixHra,
        fixConveyance,
        fixMedical,
        fixSpecial,
        fixGross: monthlyCtc,

        // Earned
        earnBasic: Number(calculated['BASIC_EARNED'] || 0),
        earnHra: Number(calculated['HRA_EARNED'] || 0),
        earnConveyance: Number(calculated['CONVEYANCE_EARNED'] || 0),
        earnMedical: Number(calculated['MEDICAL_EARNED'] || 0),
        earnSpecial: Number(calculated['SPECIAL_EARNED'] || 0),
        earnOther: Number(calculated['OTHER_EARNED'] || 0),
        grossEarned: Number(slip.grossSalary),

        // Deductions
        dedEpf: Number(calculated['EPF_EE'] || 0),
        dedEsic: Number(calculated['ESIC_EE'] || 0),
        dedPt: Number(calculated['PT'] || 0),
        dedLwf: Number(calculated['LWF_EE'] || 0),
        dedTds: Number(calculated['TDS'] || 0),
        dedOther: Number(calculated['OTHER_DEDUCTIONS'] || 0),
        totalDeductions: Number(slip.deductions),
        netPay: Number(slip.netSalary),

        // Employer Contributions
        erEpf: Number(calculated['EPF_ER'] || 0),
        erEps: Number(calculated['EPS_ER'] || 0),
        erEdli: Number(calculated['EDLI'] || 0),
        erPfAdmin: Number(calculated['PF_ADMIN'] || 0),
        erEsic: Number(calculated['ESIC_ER'] || 0),
        erLwf: Number(calculated['LWF_ER'] || 0),
        totalErStatutory:
          Number(calculated['EPF_ER'] || 0) +
          Number(calculated['EPS_ER'] || 0) +
          Number(calculated['EDLI'] || 0) +
          Number(calculated['PF_ADMIN'] || 0) +
          Number(calculated['ESIC_ER'] || 0) +
          Number(calculated['LWF_ER'] || 0),

        // Client Billing
        billGross: Number(slip.grossSalary),
        billEmployerStatutory:
          Number(calculated['EPF_ER'] || 0) +
          Number(calculated['EPS_ER'] || 0) +
          Number(calculated['EDLI'] || 0) +
          Number(calculated['PF_ADMIN'] || 0) +
          Number(calculated['ESIC_ER'] || 0) +
          Number(calculated['LWF_ER'] || 0),
        serviceCharge: Number(calculated['SERVICE_CHARGE'] || 0),
        billingBase: Number(calculated['BILLING_BASE'] || 0),
        gst: Number(calculated['GST'] || 0),
        totalInvoice: Number(calculated['TOTAL_BILLING'] || 0),
      };

      rows.push(row);
    }

    let authoritativeName = payrollRun.tenant.name;
    try {
      const identity = await CompanyProfileService.resolveTenantCompanyIdentity(tenantId);
      if (identity?.legalName) {
        authoritativeName = identity.legalName;
      }
    } catch {
      // safe fallback
    }

    return {
      companyName: authoritativeName,
      periodLabel,
      rows,
    };
  }

  /**
   * Generate formatted Excel workbook matching Paysheet_ENABL_AUG_2026_-Final.xlsx
   */
  async generateExcel(tenantId: string, payrollRunId: string): Promise<Buffer> {
    const { companyName, periodLabel, rows } = await this.buildCanonicalRows(tenantId, payrollRunId);
    const template = PHASE1_DEFAULT_EXPORT_TEMPLATE;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Master ERP Advanced Payroll';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(`Paysheet ${periodLabel}`, {
      views: [{ state: 'frozen', xSplit: 3, ySplit: 2 }], // Freeze pane at row 2 and after Employee Name
    });

    // Row 1: Group Headers
    const groupRow = sheet.getRow(1);
    groupRow.height = 24;

    // Row 2: Column Headers
    const colHeaderRow = sheet.getRow(2);
    colHeaderRow.height = 22;

    let currentColIndex = 1;
    const colIndexToKeyMap = new Map<number, ColumnDefinition>();

    for (const group of template.groups) {
      const startCol = currentColIndex;
      const endCol = currentColIndex + group.columns.length - 1;

      // Merge group cells in Row 1
      sheet.mergeCells(1, startCol, 1, endCol);
      const groupCell = sheet.getCell(1, startCol);
      groupCell.value = group.groupName;
      groupCell.alignment = { horizontal: 'center', vertical: 'middle' };
      groupCell.font = { bold: true, size: 10, color: { argb: `FF${group.textColor || '000000'}` } };
      groupCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: `FF${group.fillColor}` },
      };

      // Set Column Headers in Row 2
      for (const col of group.columns) {
        const cell = sheet.getCell(2, currentColIndex);
        cell.value = col.header;
        cell.alignment = { horizontal: col.format === 'currency' || col.format === 'number' ? 'right' : 'left', vertical: 'middle' };
        cell.font = { bold: true, size: 9 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: `FF${group.fillColor}` },
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'medium', color: { argb: 'FF999999' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        };

        sheet.getColumn(currentColIndex).width = col.width || 14;
        colIndexToKeyMap.set(currentColIndex, col);
        currentColIndex++;
      }
    }

    // Populate Data Rows starting at Row 3
    let currentRowNum = 3;
    for (const dataRow of rows) {
      const row = sheet.getRow(currentRowNum);
      row.height = 20;

      for (let c = 1; c < currentColIndex; c++) {
        const colDef = colIndexToKeyMap.get(c);
        if (!colDef) continue;

        const cell = row.getCell(c);
        const val = dataRow[colDef.key];

        cell.value = val !== undefined ? val : '';
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        };

        if (colDef.format === 'currency') {
          cell.numFmt = '#,##,##0.00';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else if (colDef.format === 'number') {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      }
      currentRowNum++;
    }

    // Add Totals Row with Excel formulas
    const totalsRow = sheet.getRow(currentRowNum);
    totalsRow.height = 24;
    sheet.getCell(currentRowNum, 1).value = '';
    sheet.getCell(currentRowNum, 2).value = '';
    sheet.getCell(currentRowNum, 3).value = 'TOTALS';
    sheet.getCell(currentRowNum, 3).font = { bold: true, size: 10 };

    for (let c = 4; c < currentColIndex; c++) {
      const colDef = colIndexToKeyMap.get(c);
      if (!colDef) continue;
      const cell = totalsRow.getCell(c);

      if (colDef.format === 'currency' || (colDef.format === 'number' && colDef.key.includes('Days'))) {
        const colLetter = sheet.getColumn(c).letter;
        cell.value = {
          formula: `SUM(${colLetter}3:${colLetter}${currentRowNum - 1})`,
        };
        cell.numFmt = colDef.format === 'currency' ? '#,##,##0.00' : '0.00';
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }

      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'double', color: { argb: 'FF000000' } },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF5F5F5' },
      };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Generate Landscape Vector PDF Paysheet via PDFKit
   */
  async generatePDF(tenantId: string, payrollRunId: string): Promise<Buffer> {
    const { companyName, periodLabel, rows } = await this.buildCanonicalRows(tenantId, payrollRunId);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A3', // Large size to fit multi-column staffing paysheet cleanly in landscape
        layout: 'landscape',
        margin: 30,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Title & Header
      doc.fontSize(16).font('Helvetica-Bold').text(companyName, { align: 'center' });
      doc.fontSize(11).font('Helvetica').text(`Monthly Payroll & Client Billing Register — ${periodLabel}`, { align: 'center' });
      doc.moveDown(0.8);

      // Summary Stats
      const totalGross = rows.reduce((acc, r) => acc + (r.grossEarned || 0), 0);
      const totalNet = rows.reduce((acc, r) => acc + (r.netPay || 0), 0);
      const totalDeductions = rows.reduce((acc, r) => acc + (r.totalDeductions || 0), 0);
      const totalInvoice = rows.reduce((acc, r) => acc + (r.totalInvoice || 0), 0);

      doc.fontSize(9).font('Helvetica-Bold').text(
        `Total Employees: ${rows.length}  |  Gross Wages: Rs ${totalGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}  |  Net Pay: Rs ${totalNet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}  |  Deductions: Rs ${totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}  |  Client Invoice: Rs ${totalInvoice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        { align: 'center' }
      );
      doc.moveDown(1);

      // Render simplified high-level tabular summary
      const columns = [
        { label: 'S.No', width: 35 },
        { label: 'Emp ID', width: 65 },
        { label: 'Employee Name', width: 130 },
        { label: 'Designation', width: 100 },
        { label: 'Payable', width: 50 },
        { label: 'Gross Earned', width: 85 },
        { label: 'EPF (12%)', width: 65 },
        { label: 'ESIC', width: 55 },
        { label: 'Prof Tax', width: 55 },
        { label: 'Total Ded', width: 75 },
        { label: 'Net Salary', width: 85 },
        { label: 'Employer PF', width: 80 },
        { label: 'Service Chg', width: 75 },
        { label: 'Total Invoice', width: 90 },
      ];

      let y = doc.y;

      // Table Header Row
      doc.rect(30, y, 1050, 20).fill('#263238');
      let x = 35;
      for (const col of columns) {
        doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold').text(col.label, x, y + 5, { width: col.width });
        x += col.width;
      }
      y += 20;

      // Table Data Rows
      doc.font('Helvetica').fontSize(8);
      let isAlt = false;

      for (const r of rows) {
        if (y > 750) {
          doc.addPage({ size: 'A3', layout: 'landscape', margin: 30 });
          y = 30;
        }

        const bg = isAlt ? '#F5F5F5' : '#FFFFFF';
        doc.rect(30, y, 1050, 18).fill(bg);
        doc.fillColor('#212121');

        x = 35;
        doc.text(String(r.sno), x, y + 4, { width: columns[0].width });
        x += columns[0].width;

        doc.text(r.empCode, x, y + 4, { width: columns[1].width });
        x += columns[1].width;

        doc.text(r.empName, x, y + 4, { width: columns[2].width });
        x += columns[2].width;

        doc.text(r.designation, x, y + 4, { width: columns[3].width });
        x += columns[3].width;

        doc.text(String(r.payableDays), x, y + 4, { width: columns[4].width });
        x += columns[4].width;

        doc.text(r.grossEarned.toLocaleString('en-IN', { minimumFractionDigits: 2 }), x, y + 4, { width: columns[5].width });
        x += columns[5].width;

        doc.text(r.dedEpf.toLocaleString('en-IN', { minimumFractionDigits: 2 }), x, y + 4, { width: columns[6].width });
        x += columns[6].width;

        doc.text(r.dedEsic.toLocaleString('en-IN', { minimumFractionDigits: 2 }), x, y + 4, { width: columns[7].width });
        x += columns[7].width;

        doc.text(r.dedPt.toLocaleString('en-IN', { minimumFractionDigits: 2 }), x, y + 4, { width: columns[8].width });
        x += columns[8].width;

        doc.text(r.totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 }), x, y + 4, { width: columns[9].width });
        x += columns[9].width;

        doc.font('Helvetica-Bold').text(r.netPay.toLocaleString('en-IN', { minimumFractionDigits: 2 }), x, y + 4, { width: columns[10].width });
        doc.font('Helvetica');
        x += columns[10].width;

        doc.text((r.erEpf + r.erEps).toLocaleString('en-IN', { minimumFractionDigits: 2 }), x, y + 4, { width: columns[11].width });
        x += columns[11].width;

        doc.text(r.serviceCharge.toLocaleString('en-IN', { minimumFractionDigits: 2 }), x, y + 4, { width: columns[12].width });
        x += columns[12].width;

        doc.font('Helvetica-Bold').text(r.totalInvoice.toLocaleString('en-IN', { minimumFractionDigits: 2 }), x, y + 4, { width: columns[13].width });
        doc.font('Helvetica');

        y += 18;
        isAlt = !isAlt;
      }

      // Footer
      doc.moveDown(2);
      doc.fontSize(7).fillColor('#757575').text(
        `Generated by Master ERP HRMS — Confidential Document — System Timestamp: ${new Date().toISOString()}`,
        { align: 'center' }
      );

      doc.end();
    });
  }
}
