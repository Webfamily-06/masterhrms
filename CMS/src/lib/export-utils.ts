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

