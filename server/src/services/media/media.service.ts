import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { rawPrisma, prisma as proxiedPrisma } from "../../prisma";
const prisma = rawPrisma || proxiedPrisma;
import { computeSha256 } from "../storage/integrity-hasher";

export function getUploadsRoot(): string {
  if (process.env.VERCEL) {
    const tmpUploads = path.join(os.tmpdir(), "uploads");
    try {
      if (!fs.existsSync(tmpUploads)) {
        fs.mkdirSync(tmpUploads, { recursive: true });
      }
    } catch {}
    return tmpUploads;
  }
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, "src", "index.ts"))) {
    return path.resolve(cwd, "../uploads");
  }
  return path.resolve(cwd, "uploads");
}

export class MediaService {
  /**
   * Validate buffer headers for safety (Images, PDFs, Office Documents, Plain Text, CSV, Audio)
   */
  static validateImageBuffer(buffer: Buffer, declaredMime?: string, originalName?: string): {
    isValid: boolean;
    mimeType: string;
    extension: string;
    error?: string;
  } {
    if (!buffer || buffer.length === 0) {
      return { isValid: false, mimeType: "", extension: "", error: "File buffer is empty" };
    }

    // 25 MB max limit
    if (buffer.length > 25 * 1024 * 1024) {
      return { isValid: false, mimeType: "", extension: "", error: "File size exceeds 25MB limit" };
    }

    const name = (originalName || "").toLowerCase();
    const lastDot = name.lastIndexOf(".");
    const ext = lastDot !== -1 ? name.slice(lastDot) : "";

    // Prohibited extensions
    const RESTRICTED = [
      ".exe", ".bat", ".cmd", ".sh", ".bin", ".msi", ".apk", ".com", ".vbs", ".ps1",
      ".env", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".php", ".py", ".pyc", ".rb",
      ".jar", ".html", ".htm", ".vbe", ".jse", ".wsf", ".wsh"
    ];
    if (RESTRICTED.includes(ext) || name.startsWith(".env")) {
      return { isValid: false, mimeType: "", extension: "", error: `Files with extension '${ext}' are strictly restricted for security.` };
    }

    // 1. PNG check: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return { isValid: true, mimeType: "image/png", extension: ".png" };
    }

    // 2. JPEG check: FF D8 FF
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { isValid: true, mimeType: "image/jpeg", extension: ".jpg" };
    }

    // 3. WebP check: "RIFF" .... "WEBP"
    if (
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    ) {
      return { isValid: true, mimeType: "image/webp", extension: ".webp" };
    }

    // 4. GIF check: GIF87a or GIF89a
    if (buffer.length >= 6 && buffer.toString("ascii", 0, 3) === "GIF") {
      return { isValid: true, mimeType: "image/gif", extension: ".gif" };
    }

    // 5. ICO check: 00 00 01 00
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x00 &&
      buffer[1] === 0x00 &&
      buffer[2] === 0x01 &&
      buffer[3] === 0x00
    ) {
      return { isValid: true, mimeType: "image/x-icon", extension: ".ico" };
    }

    // 6. SVG check: look for <svg and reject malicious scripts
    const textSample = buffer.toString("utf8", 0, Math.min(buffer.length, 2048)).toLowerCase();
    if (textSample.includes("<svg") || ext === ".svg") {
      const fullText = buffer.toString("utf8").toLowerCase();
      if (
        fullText.includes("<script") ||
        fullText.includes("javascript:") ||
        fullText.includes("onload=") ||
        fullText.includes("onerror=") ||
        fullText.includes("xlink:href=\"data:text/html")
      ) {
        return {
          isValid: false,
          mimeType: "",
          extension: "",
          error: "Malicious script tags detected in SVG file",
        };
      }
      return { isValid: true, mimeType: "image/svg+xml", extension: ".svg" };
    }

    // 7. PDF check: %PDF- (25 50 44 46 2D)
    if (
      buffer.length >= 5 &&
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46 &&
      buffer[4] === 0x2d
    ) {
      return { isValid: true, mimeType: "application/pdf", extension: ".pdf" };
    }

    // 8. ZIP-based Office OpenXML (.docx, .xlsx, .pptx)
    // Magic: 50 4B 03 04 or 50 4B 05 06 or 50 4B 07 08
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07)
    ) {
      if (ext === ".docx" || declaredMime?.includes("wordprocessingml")) {
        return {
          isValid: true,
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          extension: ".docx",
        };
      }
      if (ext === ".xlsx" || declaredMime?.includes("spreadsheetml")) {
        return {
          isValid: true,
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          extension: ".xlsx",
        };
      }
      if (ext === ".pptx" || declaredMime?.includes("presentationml")) {
        return {
          isValid: true,
          mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          extension: ".pptx",
        };
      }
      return { isValid: true, mimeType: "application/zip", extension: ".zip" };
    }

    // 9. Legacy Office Compound File Binary (DOC, XLS, PPT)
    // Magic: D0 CF 11 E0 A1 B1 1A E1
    if (
      buffer.length >= 8 &&
      buffer[0] === 0xd0 &&
      buffer[1] === 0xcf &&
      buffer[2] === 0x11 &&
      buffer[3] === 0xe0 &&
      buffer[4] === 0xa1 &&
      buffer[5] === 0xb1 &&
      buffer[6] === 0x1a &&
      buffer[7] === 0xe1
    ) {
      if (ext === ".xls" || declaredMime?.includes("excel") || declaredMime?.includes("ms-excel")) {
        return { isValid: true, mimeType: "application/vnd.ms-excel", extension: ".xls" };
      }
      if (ext === ".ppt" || declaredMime?.includes("powerpoint")) {
        return { isValid: true, mimeType: "application/vnd.ms-powerpoint", extension: ".ppt" };
      }
      return { isValid: true, mimeType: "application/msword", extension: ".doc" };
    }

    // 10. WebM / Matroska (Audio or Video): 1A 45 DF A3
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3
    ) {
      if (ext === ".weba" || declaredMime?.startsWith("audio/")) {
        return { isValid: true, mimeType: "audio/webm", extension: ".webm" };
      }
      return { isValid: true, mimeType: "video/webm", extension: ".webm" };
    }

    // 11. OGG Audio: OggS
    if (buffer.length >= 4 && buffer.toString("ascii", 0, 4) === "OggS") {
      return { isValid: true, mimeType: "audio/ogg", extension: ".ogg" };
    }

    // 12. MP3 Audio: ID3 or sync frame FF FB / FF F3
    if (
      (buffer.length >= 3 && buffer.toString("ascii", 0, 3) === "ID3") ||
      (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
    ) {
      return { isValid: true, mimeType: "audio/mpeg", extension: ".mp3" };
    }

    // 13. WAV Audio: RIFF .... WAVE
    if (
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WAVE"
    ) {
      return { isValid: true, mimeType: "audio/wav", extension: ".wav" };
    }

    // 14. Text & CSV Files (Ensure valid utf8 without null bytes)
    if (ext === ".txt" || ext === ".csv" || declaredMime === "text/csv" || declaredMime === "text/plain") {
      let isBinary = false;
      const checkLen = Math.min(buffer.length, 4096);
      for (let i = 0; i < checkLen; i++) {
        if (buffer[i] === 0x00) {
          isBinary = true;
          break;
        }
      }
      if (!isBinary) {
        if (ext === ".csv" || declaredMime === "text/csv") {
          return { isValid: true, mimeType: "text/csv", extension: ".csv" };
        }
        return { isValid: true, mimeType: "text/plain", extension: ".txt" };
      }
    }

    return {
      isValid: false,
      mimeType: "",
      extension: "",
      error: "Unsupported file format. Supported: PNG, JPG, WebP, GIF, ICO, SVG, PDF, DOCX, XLSX, PPTX, DOC, XLS, PPT, TXT, CSV, WebM, OGG, MP3, WAV.",
    };
  }

  /**
   * Alias for backwards compatibility
   */
  static validateMediaBuffer(buffer: Buffer, declaredMime?: string, originalName?: string) {
    return this.validateImageBuffer(buffer, declaredMime, originalName);
  }

  /**
   * Save an uploaded file to local disk and create MediaFile record.
   * Performs deduplication within the target tenant scope when checksum & filename match.
   */
  static async uploadMedia(
    buffer: Buffer,
    originalName: string,
    options: {
      folder?: string;
      tenantId?: string | null;
      uploadedBy?: string;
      tags?: string[];
      mimeType?: string;
    } = {}
  ) {
    const validation = this.validateImageBuffer(buffer, options.mimeType, originalName);
    if (!validation.isValid) {
      throw new Error(validation.error || "Invalid file");
    }

    const checksumSha = computeSha256(buffer);

    // Deduplication check within the same scope
    const existing = await prisma.mediaFile.findFirst({
      where: {
        tenantId: options.tenantId || null,
        checksumSha,
        fileName: originalName,
        deletedAt: null,
      },
      include: {
        usages: true,
      },
    });
    if (existing) {
      return existing;
    }

    const folder = (options.folder || "system/branding")
      .replace(/[^a-zA-Z0-9_\-\/]/g, "")
      .replace(/\.\./g, "");
    const uploadsRoot = getUploadsRoot();
    const targetDir = path.join(uploadsRoot, folder);
    const uniqueFileName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${validation.extension}`;
    const relativeFilePath = `${folder}/${uniqueFileName}`;
    const publicUrl = `/uploads/${folder}/${uniqueFileName}`;

    try {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const fullDiskPath = path.join(targetDir, uniqueFileName);
      // Write file to disk
      await fs.promises.writeFile(fullDiskPath, buffer);
    } catch (fsErr: any) {
      console.warn("⚠️ [MediaService] Disk write warning (read-only filesystem or tmp limitation):", fsErr?.message);
    }

    // Save record to DB
    const mediaFile = await prisma.mediaFile.create({
      data: {
        tenantId: options.tenantId || null,
        storageDisk: "LOCAL",
        filePath: relativeFilePath,
        url: publicUrl,
        fileName: originalName,
        mimeType: validation.mimeType,
        fileSize: buffer.length,
        checksumSha,
        folder,
        tags: options.tags || ["branding"],
        uploadedBy: options.uploadedBy || "system",
      },
      include: {
        usages: true,
      },
    });

    return mediaFile;
  }

  /**
   * Get a single media file by ID with usages
   */
  static async getMedia(id: string) {
    return await prisma.mediaFile.findFirst({
      where: { id, deletedAt: null },
      include: {
        usages: true,
      },
    });
  }

  /**
   * List media library files with usages
   */
  static async listMedia(options: {
    tenantId?: string | null;
    folder?: string;
  } = {}) {
    const where: any = {
      deletedAt: null,
    };
    if (options.tenantId !== undefined) {
      where.tenantId = options.tenantId;
    }
    if (options.folder && options.folder !== "All") {
      if (options.folder.endsWith("/*")) {
        where.folder = { startsWith: options.folder.slice(0, -2) };
      } else {
        where.folder = options.folder;
      }
    }

    const files = await prisma.mediaFile.findMany({
      where,
      include: {
        usages: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return files;
  }

  /**
   * Delete media with usage check (returns 409 Conflict if in use, unless force=true).
   * Enforces cross-tenant and platform media deletion protection.
   */
  static async deleteMedia(
    id: string,
    optionsOrTenantId:
      | {
          force?: boolean;
          isSuper?: boolean;
          requestedByTenantId?: string | null;
        }
      | string
      | null = {}
  ) {
    const options: {
      force?: boolean;
      isSuper?: boolean;
      requestedByTenantId?: string | null;
    } =
      typeof optionsOrTenantId === "string"
        ? { force: false, isSuper: false, requestedByTenantId: optionsOrTenantId }
        : optionsOrTenantId === null
        ? { force: false, isSuper: true, requestedByTenantId: null }
        : optionsOrTenantId || {};

    const file = await prisma.mediaFile.findUnique({
      where: { id },
      include: { usages: true },
    });

    if (!file) {
      const error: any = new Error("Media file not found");
      error.status = 404;
      throw error;
    }

    // Tenant isolation & access control check (when invoked in context of a user/tenant request)
    if (options.isSuper === false || options.requestedByTenantId !== undefined) {
      if (!options.isSuper) {
        if (file.tenantId === null) {
          const error: any = new Error("Forbidden: Cannot delete platform media");
          error.status = 403;
          throw error;
        }
        if (file.tenantId !== options.requestedByTenantId) {
          const error: any = new Error("Forbidden: Cannot delete media belonging to another workspace");
          error.status = 403;
          throw error;
        }
      }
    }

    if (file.usages.length > 0 && !options.force) {
      const error: any = new Error(
        `Cannot delete media: File is currently in use by ${file.usages.length} item(s).`
      );
      error.code = "MEDIA_IN_USE";
      error.status = 409;
      error.usages = file.usages;
      throw error;
    }

    // Soft delete
    await prisma.mediaFile.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    if (options.force) {
      await prisma.mediaUsage.deleteMany({
        where: { mediaId: id },
      });
    }

    return { success: true, id };
  }
}
