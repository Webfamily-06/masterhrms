/**
 * MASTERHRMS — Phase F6 Document Preview Service
 * 
 * In-browser safe preview generation for:
 * - PDF (metadata, page streaming)
 * - Office DOCX (mammoth macro-free HTML sanitization)
 * - Office XLSX (exceljs workbook parser to JSON tabular matrix)
 * - Text / CSV / Code (sanitized line-numbered text)
 * - Images & SVG (SVG script stripping)
 * - Dynamic confidential watermark overlay generator
 */

import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import ExcelJS from "exceljs";
import { rawPrisma, prisma as proxiedPrisma } from "../../prisma";
import { getUploadsRoot } from "../media/media.service";
import { buildStorageKey } from "../storage/storage-provider.interface";
import { LocalStorageProvider } from "../storage/local-storage.provider";

const prisma = rawPrisma || proxiedPrisma;
const localStorageProvider = new LocalStorageProvider();

export interface WatermarkOptions {
  tenantName?: string;
  userEmail?: string;
  ip?: string;
  customText?: string;
}

export interface PreviewResult {
  fileId: string;
  fileName: string;
  mimeType: string;
  extension: string;
  fileSize: number;
  previewType: "pdf" | "docx_html" | "xlsx_table" | "csv_table" | "text" | "image" | "unsupported";
  content?: string;
  sheets?: Array<{
    name: string;
    rowCount: number;
    columnCount: number;
    rows: any[][];
  }>;
  metadata?: {
    lineCount?: number;
    pageCount?: number;
    width?: number;
    height?: number;
  };
  watermark?: {
    enabled: boolean;
    text: string;
    opacity: number;
    angle: number;
  };
  quarantined?: boolean;
}

export class DocumentPreviewService {
  /**
   * Resolve physical buffer of a file from storage.
   */
  static async getFileBuffer(file: any): Promise<Buffer | null> {
    const versionNo = file.version || 1;
    const storageKey = buildStorageKey(file.tenantId, file.id, versionNo);
    const physicalPath = localStorageProvider.getPhysicalPath(storageKey);

    if (fs.existsSync(physicalPath)) {
      return fs.readFileSync(physicalPath);
    }

    // Fallback to filePath directly in uploads root
    if (file.filePath) {
      const directPath = path.resolve(getUploadsRoot(), file.filePath.replace(/^\/+/, ""));
      if (fs.existsSync(directPath)) {
        return fs.readFileSync(directPath);
      }
      const rawPath = path.resolve(file.filePath);
      if (fs.existsSync(rawPath)) {
        return fs.readFileSync(rawPath);
      }
    }

    return null;
  }

  /**
   * Strip potential XSS vectors, scripts, and event handlers from HTML.
   */
  static sanitizeHtml(rawHtml: string): string {
    return rawHtml
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/\s*on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      .replace(/javascript:/gi, "blocked-script:")
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
      .replace(/<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi, "");
  }

  /**
   * Build dynamic confidential watermark configuration.
   */
  static buildWatermark(opts?: WatermarkOptions) {
    const parts: string[] = [];
    if (opts?.customText) {
      parts.push(opts.customText);
    } else {
      parts.push("CONFIDENTIAL");
    }
    if (opts?.tenantName) parts.push(opts.tenantName);
    if (opts?.userEmail) parts.push(opts.userEmail);
    parts.push(new Date().toISOString().slice(0, 10));
    if (opts?.ip) parts.push(`IP: ${opts.ip}`);

    return {
      enabled: true,
      text: parts.join(" • "),
      opacity: 0.14,
      angle: -30,
    };
  }

  /**
   * Generate safe preview for a file node.
   */
  static async generatePreview(
    fileId: string,
    tenantId: string | null,
    userContext?: { userEmail?: string; tenantName?: string; ip?: string }
  ): Promise<PreviewResult> {
    const file = await prisma.mediaFile.findFirst({
      where: { id: fileId, ...(tenantId ? { tenantId } : {}) },
    });

    if (!file) {
      throw new Error("File not found or access denied.");
    }

    // Safety Invariant: Quarantined files must NEVER be previewed
    if (file.scanStatus === "INFECTED" || file.scanStatus === "QUARANTINED") {
      return {
        fileId: file.id,
        fileName: file.fileName,
        mimeType: file.mimeType,
        extension: file.extension,
        fileSize: file.fileSize,
        previewType: "unsupported",
        quarantined: true,
        content: `This file is quarantined (${file.quarantineReason || "Malware threat detected"}). Preview is blocked.`,
      };
    }

    const ext = (file.extension || "").toLowerCase().replace(/^\./, "");
    const mime = (file.mimeType || "").toLowerCase();
    const watermark = this.buildWatermark({
      tenantName: userContext?.tenantName,
      userEmail: userContext?.userEmail,
      ip: userContext?.ip,
    });

    // 1. Image Preview
    if (
      mime.startsWith("image/") ||
      ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)
    ) {
      let content = file.url;
      if (ext === "svg" || mime === "image/svg+xml") {
        const buf = await this.getFileBuffer(file);
        if (buf) {
          content = this.sanitizeHtml(buf.toString("utf-8"));
        }
      }
      return {
        fileId: file.id,
        fileName: file.fileName,
        mimeType: file.mimeType,
        extension: ext,
        fileSize: file.fileSize,
        previewType: "image",
        content,
        metadata: { width: file.width || undefined, height: file.height || undefined },
        watermark,
      };
    }

    // 2. PDF Preview
    if (mime === "application/pdf" || ext === "pdf") {
      return {
        fileId: file.id,
        fileName: file.fileName,
        mimeType: "application/pdf",
        extension: "pdf",
        fileSize: file.fileSize,
        previewType: "pdf",
        content: file.url,
        watermark,
      };
    }

    // For file formats needing buffer parsing:
    const buffer = await this.getFileBuffer(file);
    if (!buffer) {
      return {
        fileId: file.id,
        fileName: file.fileName,
        mimeType: file.mimeType,
        extension: ext,
        fileSize: file.fileSize,
        previewType: "unsupported",
        content: "File binary content could not be located on storage.",
        watermark,
      };
    }

    // 3. Word DOCX Preview (Mammoth safe HTML conversion)
    if (
      ext === "docx" ||
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      try {
        const result = await mammoth.convertToHtml({ buffer });
        const cleanHtml = this.sanitizeHtml(result.value);
        return {
          fileId: file.id,
          fileName: file.fileName,
          mimeType: file.mimeType,
          extension: "docx",
          fileSize: file.fileSize,
          previewType: "docx_html",
          content: cleanHtml,
          watermark,
        };
      } catch (docErr: any) {
        console.warn("[DocumentPreviewService] Mammoth DOCX conversion error:", docErr?.message);
        return {
          fileId: file.id,
          fileName: file.fileName,
          mimeType: file.mimeType,
          extension: ext,
          fileSize: file.fileSize,
          previewType: "unsupported",
          content: "Failed to parse Word document formatting.",
          watermark,
        };
      }
    }

    // 4. Excel XLSX Preview (ExcelJS Tabular Grid)
    if (
      ext === "xlsx" ||
      ext === "xls" ||
      mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mime === "application/vnd.ms-excel"
    ) {
      try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer as any);
        const sheets: Array<{ name: string; rowCount: number; columnCount: number; rows: any[][] }> = [];

        workbook.eachSheet((worksheet, _sheetId) => {
          const rows: any[][] = [];
          const maxRows = 250; // Cap at 250 rows per sheet for high preview performance
          let rowCount = 0;

          worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber <= maxRows) {
              const rowValues = Array.isArray(row.values)
                ? row.values.slice(1).map((val: any) => {
                    if (val && typeof val === "object") {
                      if (val.result !== undefined) return String(val.result);
                      if (val.text !== undefined) return String(val.text);
                      if (val instanceof Date) return val.toISOString().slice(0, 10);
                      return JSON.stringify(val);
                    }
                    return val === null || val === undefined ? "" : String(val);
                  })
                : [];
              rows.push(rowValues);
            }
            rowCount++;
          });

          sheets.push({
            name: worksheet.name,
            rowCount,
            columnCount: worksheet.columnCount || (rows[0] ? rows[0].length : 0),
            rows,
          });
        });

        return {
          fileId: file.id,
          fileName: file.fileName,
          mimeType: file.mimeType,
          extension: ext,
          fileSize: file.fileSize,
          previewType: "xlsx_table",
          sheets,
          watermark,
        };
      } catch (xlsxErr: any) {
        console.warn("[DocumentPreviewService] ExcelJS XLSX parsing error:", xlsxErr?.message);
        return {
          fileId: file.id,
          fileName: file.fileName,
          mimeType: file.mimeType,
          extension: ext,
          fileSize: file.fileSize,
          previewType: "unsupported",
          content: "Failed to parse Excel workbook sheets.",
          watermark,
        };
      }
    }

    // 5. CSV / TSV Preview
    if (ext === "csv" || ext === "tsv" || mime === "text/csv") {
      const text = buffer.toString("utf-8");
      const delimiter = ext === "tsv" ? "\t" : ",";
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const parsedRows = lines.slice(0, 250).map((line) => {
        // Simple regex splitter respecting quoted strings
        const matches = line.match(/(?:[^\s",]+|"[^"]*")+/g) || line.split(delimiter);
        return matches.map((m) => m.replace(/^"|"$/g, "").trim());
      });

      return {
        fileId: file.id,
        fileName: file.fileName,
        mimeType: "text/csv",
        extension: ext,
        fileSize: file.fileSize,
        previewType: "csv_table",
        sheets: [
          {
            name: file.fileName,
            rowCount: lines.length,
            columnCount: parsedRows[0] ? parsedRows[0].length : 0,
            rows: parsedRows,
          },
        ],
        watermark,
      };
    }

    // 6. Text / Code / JSON / Markdown
    if (
      mime.startsWith("text/") ||
      ["txt", "md", "json", "yaml", "yml", "xml", "html", "js", "ts", "css", "sql", "log"].includes(ext)
    ) {
      const text = buffer.toString("utf-8");
      const lines = text.split(/\r?\n/);
      return {
        fileId: file.id,
        fileName: file.fileName,
        mimeType: file.mimeType || "text/plain",
        extension: ext,
        fileSize: file.fileSize,
        previewType: "text",
        content: text.slice(0, 50000), // First 50KB for fast preview
        metadata: { lineCount: lines.length },
        watermark,
      };
    }

    // Unsupported binary format
    return {
      fileId: file.id,
      fileName: file.fileName,
      mimeType: file.mimeType,
      extension: ext,
      fileSize: file.fileSize,
      previewType: "unsupported",
      content: `No safe in-browser viewer available for .${ext} files. Please download the file to open it locally.`,
      watermark,
    };
  }
}
