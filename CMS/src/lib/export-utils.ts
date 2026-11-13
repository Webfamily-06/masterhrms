import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface ExportColumn<T = any> {
  header: string;
  key: keyof T | string;
  width?: number; // Approximate char width for Excel
  format?: (value: any, row: T) => string;
}

export interface ExportOptions<T = any> {
  filename: string;
  title: string;
  subtitle?: string;
  sheetName?: string;
  columns: ExportColumn<T>[];
  data: T[];
  tenantName?: string;
}

function resolveValue(row: any, key: string): any {
  if (!row) return "";
  if (key.includes(".")) {
    const parts = key.split(".");
    let cur = row;
    for (const p of parts) {
      if (cur === null || cur === undefined) return "";
      cur = cur[p];
    }
    return cur ?? "";
  }
  return row[key] ?? "";
}

function formatCell(val: any, col: ExportColumn, row: any): string {
  if (col.format) {
    return col.format(val, row);
  }
  if (val === null || val === undefined) return "";
  if (typeof val === "boolean") return val ? "Active" : "Inactive";
  if (val instanceof Date) {
    return val.toISOString().split("T")[0];
  }
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
    return val.split("T")[0];
  }
  if (typeof val === "object") {
    return JSON.stringify(val);
  }
  return String(val);
}

/**
 * Export dataset to genuine binary Excel (.xlsx) file using ExcelJS.
 */
export async function exportToExcel<T = any>(options: ExportOptions<T>): Promise<void> {
  const { filename, title, sheetName = "Records", columns, data, tenantName } = options;
  const safeFilename = filename.toLowerCase().endsWith(".xlsx") ? filename : `${filename}.xlsx`;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MASTERHRMS Enterprise";
  workbook.created = new Date();
  workbook.properties.date1904 = false;

  const worksheet = workbook.addWorksheet(sheetName.slice(0, 31), {
    views: [{ showGridLines: true }]
  });

  // Metadata Header block
  worksheet.addRow([title.toUpperCase()]);
  worksheet.mergeCells(1, 1, 1, Math.max(columns.length, 3));
  const titleRow = worksheet.getRow(1);
  titleRow.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF0F172A" } };
  titleRow.alignment = { vertical: "middle" };
  titleRow.height = 24;

  const exportDate = new Date().toLocaleString();
  const sub = tenantName ? `Tenant: ${tenantName} | Exported: ${exportDate}` : `Exported: ${exportDate}`;
  worksheet.addRow([sub]);
  worksheet.mergeCells(2, 1, 2, Math.max(columns.length, 3));
  const subRow = worksheet.getRow(2);
  subRow.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF64748B" } };
  subRow.height = 18;

  worksheet.addRow([]); // Blank spacer

  // Table Columns Header
  const headerRowIdx = 4;
  const headers = columns.map((c) => c.header);
  worksheet.addRow(headers);
  const headerRow = worksheet.getRow(headerRowIdx);
  headerRow.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.height = 20;

  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" } // Slate-800
    };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "medium", color: { argb: "FF0F172A" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } }
    };
  });

  // Data Rows
  data.forEach((row, rIdx) => {
    const rowValues = columns.map((col) => {
      const raw = resolveValue(row, col.key as string);
      return formatCell(raw, col, row);
    });
    const dataRow = worksheet.addRow(rowValues);
    dataRow.height = 18;

    const isEven = rIdx % 2 === 0;
    dataRow.eachCell((cell) => {
      cell.font = { name: "Arial", size: 9, color: { argb: "FF334155" } };
      cell.alignment = { vertical: "middle", horizontal: "left" };
      if (!isEven) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" } // Slate-50
        };
      }
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } }
      };
    });
  });

  // Calculate Column Widths
  columns.forEach((col, idx) => {
    let maxLen = col.header.length;
    data.forEach((row) => {
      const raw = resolveValue(row, col.key as string);
      const str = formatCell(raw, col, row);
      if (str.length > maxLen) maxLen = str.length;
    });
    worksheet.getColumn(idx + 1).width = Math.max(col.width || 12, Math.min(maxLen + 4, 45));
  });

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  triggerDownload(blob, safeFilename);
}

/**
 * Export dataset to genuine multi-page PDF document using jsPDF and AutoTable.
 */
export async function exportToPdf<T = any>(options: ExportOptions<T>): Promise<void> {
  const { filename, title, subtitle, columns, data, tenantName } = options;
  const safeFilename = filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;

  // Choose landscape orientation if there are more than 6 columns
  const orientation = columns.length > 6 ? "landscape" : "portrait";
  const doc = new jsPDF({
    orientation,
    unit: "pt",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const exportDate = new Date().toLocaleString();

  // Document Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(title, 36, 40);

  // Subtitle / Tenant metadata
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate-500
  const metaText = subtitle || (tenantName ? `Tenant: ${tenantName}  |  Exported: ${exportDate}  |  Total: ${data.length} records` : `Exported: ${exportDate}  |  Total: ${data.length} records`);
  doc.text(metaText, 36, 54);

  // AutoTable
  const head = [columns.map((c) => c.header)];
  const body = data.map((row) =>
    columns.map((col) => {
      const raw = resolveValue(row, col.key as string);
      return formatCell(raw, col, row);
    })
  );

  autoTable(doc, {
    head,
    body,
    startY: 65,
    margin: { left: 36, right: 36, bottom: 40 },
    theme: "striped",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 4,
      textColor: [51, 65, 85], // Slate-700
      overflow: "linebreak"
    },
    headStyles: {
      fillColor: [30, 41, 59], // Slate-800
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // Slate-50
    },
    didDrawPage: (dataInfo) => {
      // Running Footer: Page X of Y + Timestamp
      const pageNum = doc.getNumberOfPages();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // Slate-400
      const footerText = `Page ${pageNum}`;
      doc.text(footerText, pageWidth - 36, pageHeight - 20, { align: "right" });
      doc.text("MASTERHRMS Automated Export", 36, pageHeight - 20);
    }
  });

  const blob = doc.output("blob");
  triggerDownload(blob, safeFilename);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface AnnouncementAnalyticsExportOptions {
  filename?: string;
  tenantName?: string;
  announcement: {
    id: string;
    title: string;
    category?: string;
    targetType?: string;
    targetDepartment?: { name: string } | null;
    targetBranch?: { name: string } | null;
    publishDate?: string | null;
    acknowledgementRequired?: boolean;
  };
  metrics: {
    totalEligibleEmployees: number;
    uniqueViewsCount: number;
    viewRate: number;
    acknowledgementCount: number;
    acknowledgementRate: number;
    pendingAcknowledgements: number;
  };
  roster: Array<{
    employeeCode: string;
    fullName: string;
    email?: string;
    department: string;
    branch: string;
    hasViewed: boolean;
    viewCount?: number;
    viewedAt?: string | null;
    hasAcknowledged: boolean;
    acknowledgedAt?: string | null;
    comments?: string | null;
  }>;
  departmentBreakdown?: Array<{
    departmentName: string;
    eligible: number;
    viewed: number;
    acked: number;
    viewRate: number;
    ackRate: number;
  }>;
  branchBreakdown?: Array<{
    branchName: string;
    eligible: number;
    viewed: number;
    acked: number;
    viewRate: number;
    ackRate: number;
  }>;
}

/**
 * Generate genuine Excel (.xlsx) file for Announcement Analytics & Compliance Audit
 */
export async function exportAnnouncementAnalyticsExcel(options: AnnouncementAnalyticsExportOptions): Promise<void> {
  const { filename, announcement, metrics, roster, departmentBreakdown, branchBreakdown, tenantName } = options;
  const safeFilename = filename
    ? (filename.toLowerCase().endsWith(".xlsx") ? filename : `${filename}.xlsx`)
    : `announcement_compliance_audit_${announcement.id}.xlsx`;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MASTERHRMS Enterprise";
  workbook.created = new Date();

  // Sheet 1: Audit Roster
  const wsRoster = workbook.addWorksheet("Audit Roster", { views: [{ showGridLines: true }] });

  // Title Row
  wsRoster.addRow(["MASTERHRMS ENTERPRISE - ANNOUNCEMENT COMPLIANCE AUDIT"]);
  wsRoster.mergeCells(1, 1, 1, 11);
  const titleRow = wsRoster.getRow(1);
  titleRow.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  titleRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
  titleRow.height = 28;
  titleRow.alignment = { vertical: "middle", horizontal: "left" };

  const exportDate = new Date().toLocaleString();
  const targetScopeDesc = announcement.targetType === "department"
    ? `Department: ${announcement.targetDepartment?.name || "Specified Department"}`
    : announcement.targetType === "branch"
    ? `Branch: ${announcement.targetBranch?.name || "Specified Branch"}`
    : "All Company";

  wsRoster.addRow([`Announcement: ${announcement.title}`]);
  wsRoster.addRow([`Audience: ${targetScopeDesc}  |  Category: ${announcement.category || "General"}  |  Exported: ${exportDate} ${tenantName ? `| Tenant: ${tenantName}` : ""}`]);
  wsRoster.getRow(2).font = { name: "Arial", size: 10, bold: true, color: { argb: "FF334155" } };
  wsRoster.getRow(3).font = { name: "Arial", size: 9, italic: true, color: { argb: "FF64748B" } };

  wsRoster.addRow([]); // Blank

  // Summary Metrics Table
  wsRoster.addRow(["Target Audience", "Unique Views", "View Rate", "Signed Agreements", "Pending Signatures", "Compliance Rate"]);
  const kpiHeaderRow = wsRoster.getRow(5);
  kpiHeaderRow.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
  kpiHeaderRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  wsRoster.addRow([
    metrics.totalEligibleEmployees,
    metrics.uniqueViewsCount,
    `${metrics.viewRate}%`,
    metrics.acknowledgementCount,
    metrics.pendingAcknowledgements,
    `${metrics.acknowledgementRate}%`
  ]);
  const kpiValRow = wsRoster.getRow(6);
  kpiValRow.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF0F172A" } };
  kpiValRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  wsRoster.addRow([]); // Blank

  // Employee Roster Table
  const tableHeaders = [
    "Employee Code",
    "Employee Name",
    "Email Address",
    "Department",
    "Branch Location",
    "Read Status",
    "View Count",
    "Viewed Timestamp",
    "Compliance Signature",
    "Signed Timestamp",
    "Comments / Notes"
  ];
  wsRoster.addRow(tableHeaders);
  const rosterHeaderRow = wsRoster.getRow(8);
  rosterHeaderRow.font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
  rosterHeaderRow.height = 22;
  rosterHeaderRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "medium", color: { argb: "FF0F172A" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } }
    };
  });

  roster.forEach((emp, rIdx) => {
    const rowValues = [
      emp.employeeCode,
      emp.fullName,
      emp.email || "",
      emp.department || "General",
      emp.branch || "Main HQ",
      emp.hasViewed ? "Viewed" : "Unread",
      emp.viewCount ?? (emp.hasViewed ? 1 : 0),
      emp.viewedAt ? emp.viewedAt.slice(0, 19).replace("T", " ") : "",
      emp.hasAcknowledged ? "Signed" : (announcement.acknowledgementRequired ? "Pending" : "N/A"),
      emp.acknowledgedAt ? emp.acknowledgedAt.slice(0, 19).replace("T", " ") : "",
      emp.comments || ""
    ];
    const dataRow = wsRoster.addRow(rowValues);
    dataRow.height = 19;
    const isEven = rIdx % 2 === 0;
    dataRow.eachCell((cell, colNum) => {
      cell.font = { name: "Arial", size: 9, color: { argb: "FF334155" } };
      cell.alignment = { vertical: "middle", horizontal: colNum === 6 || colNum === 7 || colNum === 9 ? "center" : "left" };
      if (!isEven) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      }
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } }
      };
    });
  });

  // Calculate Column Widths
  tableHeaders.forEach((head, idx) => {
    let maxLen = head.length;
    roster.forEach((r) => {
      const vals = [r.employeeCode, r.fullName, r.email, r.department, r.branch];
      vals.forEach((v) => { if (v && v.length > maxLen) maxLen = v.length; });
    });
    wsRoster.getColumn(idx + 1).width = Math.max(14, Math.min(maxLen + 4, 38));
  });

  // Sheet 2: Department Breakdown (if present)
  if (departmentBreakdown && departmentBreakdown.length > 0) {
    const wsDept = workbook.addWorksheet("Department Breakdown", { views: [{ showGridLines: true }] });
    wsDept.addRow(["DEPARTMENT COMPLIANCE BREAKDOWN"]);
    wsDept.mergeCells(1, 1, 1, 6);
    wsDept.getRow(1).font = { name: "Arial", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
    wsDept.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    wsDept.getRow(1).height = 24;

    wsDept.addRow(["Department", "Eligible Employees", "Viewed", "Signed", "View Rate", "Compliance Rate"]);
    wsDept.getRow(2).font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
    wsDept.getRow(2).eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
    });

    departmentBreakdown.forEach((dept) => {
      wsDept.addRow([
        dept.departmentName,
        dept.eligible,
        dept.viewed,
        dept.acked,
        `${dept.viewRate}%`,
        `${dept.ackRate}%`
      ]);
    });
    [24, 18, 14, 14, 14, 16].forEach((w, i) => { wsDept.getColumn(i + 1).width = w; });
  }

  // Sheet 3: Branch Breakdown (if present)
  if (branchBreakdown && branchBreakdown.length > 0) {
    const wsBranch = workbook.addWorksheet("Branch Breakdown", { views: [{ showGridLines: true }] });
    wsBranch.addRow(["BRANCH COMPLIANCE BREAKDOWN"]);
    wsBranch.mergeCells(1, 1, 1, 6);
    wsBranch.getRow(1).font = { name: "Arial", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
    wsBranch.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    wsBranch.getRow(1).height = 24;

    wsBranch.addRow(["Branch Location", "Eligible Employees", "Viewed", "Signed", "View Rate", "Compliance Rate"]);
    wsBranch.getRow(2).font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
    wsBranch.getRow(2).eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
    });

    branchBreakdown.forEach((br) => {
      wsBranch.addRow([
        br.branchName,
        br.eligible,
        br.viewed,
        br.acked,
        `${br.viewRate}%`,
        `${br.ackRate}%`
      ]);
    });
    [24, 18, 14, 14, 14, 16].forEach((w, i) => { wsBranch.getColumn(i + 1).width = w; });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerDownload(blob, safeFilename);
}

/**
 * Generate genuine RFC 4180 CSV file with UTF-8 BOM for Announcement Analytics
 */
export function exportAnnouncementAnalyticsCsv(options: AnnouncementAnalyticsExportOptions): void {
  const { filename, announcement, roster } = options;
  const safeFilename = filename
    ? (filename.toLowerCase().endsWith(".csv") ? filename : `${filename}.csv`)
    : `announcement_compliance_roster_${announcement.id}.csv`;

  const escapeCsv = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headers = [
    "Employee Code",
    "Employee Name",
    "Email",
    "Department",
    "Branch",
    "Read Status",
    "View Count",
    "Viewed At",
    "Compliance Signature",
    "Acknowledged At",
    "Comments",
  ];

  const rows = roster.map((r) => [
    escapeCsv(r.employeeCode),
    escapeCsv(r.fullName),
    escapeCsv(r.email || ""),
    escapeCsv(r.department || "General"),
    escapeCsv(r.branch || "Main HQ"),
    escapeCsv(r.hasViewed ? "Viewed" : "Unread"),
    escapeCsv(r.viewCount ?? (r.hasViewed ? 1 : 0)),
    escapeCsv(r.viewedAt ? r.viewedAt.slice(0, 19).replace("T", " ") : ""),
    escapeCsv(r.hasAcknowledged ? "Signed" : (announcement.acknowledgementRequired ? "Pending" : "N/A")),
    escapeCsv(r.acknowledgedAt ? r.acknowledgedAt.slice(0, 19).replace("T", " ") : ""),
    escapeCsv(r.comments || ""),
  ]);

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, safeFilename);
}

/**
 * Generate multi-page PDF document for Announcement Analytics & Compliance Audit
 */
export async function exportAnnouncementAnalyticsPdf(options: AnnouncementAnalyticsExportOptions): Promise<void> {
  const { filename, announcement, metrics, roster, tenantName } = options;
  const safeFilename = filename
    ? (filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`)
    : `announcement_compliance_audit_${announcement.id}.pdf`;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const exportDate = new Date().toLocaleString();

  // 1. Header Branding Top Bar
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(36, 28, pageWidth - 72, 4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text("MASTERHRMS ENTERPRISE", 36, 50);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text("Announcement Analytics & Compliance Audit", 36, 65);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${exportDate} ${tenantName ? ` | Tenant: ${tenantName}` : ""}`, pageWidth - 36, 50, { align: "right" });

  // 2. Announcement Metadata Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(36, 76, pageWidth - 72, 36, 4, 4, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  const targetScopeDesc = announcement.targetType === "department"
    ? `Department: ${announcement.targetDepartment?.name || "Specified Department"}`
    : announcement.targetType === "branch"
    ? `Branch: ${announcement.targetBranch?.name || "Specified Branch"}`
    : "All Company (Company-Wide)";

  doc.text(`Title: ${announcement.title.slice(0, 75)}`, 44, 90);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Audience: ${targetScopeDesc}  |  Category: ${announcement.category || "General"}  |  Signature Required: ${announcement.acknowledgementRequired ? "Yes" : "No"}`, 44, 103);

  // 3. Summary KPI Cards
  const kpiY = 120;
  const kpiGap = 5;
  const kpiCount = 6;
  const kpiWidth = (pageWidth - 72 - (kpiCount - 1) * kpiGap) / kpiCount;
  const kpis = [
    { label: "Target Audience", value: String(metrics.totalEligibleEmployees) },
    { label: "Unique Views", value: String(metrics.uniqueViewsCount) },
    { label: "View Rate", value: `${metrics.viewRate}%` },
    { label: "Signed Agree.", value: String(metrics.acknowledgementCount) },
    { label: "Pending Sign.", value: String(metrics.pendingAcknowledgements) },
    { label: "Compliance Rate", value: `${metrics.acknowledgementRate}%` },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 36 + idx * (kpiWidth + kpiGap);
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(x, kpiY, kpiWidth, 34, 3, 3, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + kpiWidth / 2, kpiY + 12, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.value, x + kpiWidth / 2, kpiY + 26, { align: "center" });
  });

  // 4. Employee Compliance Roster Table
  const head = [["Employee", "Code", "Department", "Branch", "Read Status", "Compliance Signature"]];
  const body = roster.map((r) => [
    r.fullName,
    r.employeeCode,
    r.department || "General",
    r.branch || "Main HQ",
    r.hasViewed ? (r.viewedAt ? `Viewed (${r.viewedAt.slice(0, 10)})` : "Viewed") : "Unread",
    r.hasAcknowledged ? (r.acknowledgedAt ? `Signed (${r.acknowledgedAt.slice(0, 10)})` : "Signed") : (announcement.acknowledgementRequired ? "Pending" : "N/A"),
  ]);

  autoTable(doc, {
    head,
    body,
    startY: 164,
    margin: { left: 36, right: 36, bottom: 40 },
    theme: "striped",
    showHead: "everyPage",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 4,
      textColor: [51, 65, 85],
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: () => {
      const pageNum = doc.getNumberOfPages();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text("MASTERHRMS Automated Compliance Export - Confidential", 36, pageHeight - 20);
      doc.text(`Page ${pageNum}`, pageWidth - 36, pageHeight - 20, { align: "right" });
    },
  });

  const blob = doc.output("blob");
  triggerDownload(blob, safeFilename);
}

