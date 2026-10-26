"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaService = void 0;
exports.getUploadsRoot = getUploadsRoot;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../../prisma");
const prisma = prisma_1.rawPrisma || prisma_1.prisma;
const integrity_hasher_1 = require("../storage/integrity-hasher");
function getUploadsRoot() {
    const cwd = process.cwd();
    if (fs_1.default.existsSync(path_1.default.join(cwd, "src", "index.ts"))) {
        return path_1.default.resolve(cwd, "../uploads");
    }
    return path_1.default.resolve(cwd, "uploads");
}
class MediaService {
    /**
     * Validate image buffer headers for safety (PNG, JPEG, WEBP, GIF, ICO, SVG)
     */
    static validateImageBuffer(buffer, declaredMime) {
        if (!buffer || buffer.length === 0) {
            return { isValid: false, mimeType: "", extension: "", error: "File buffer is empty" };
        }
        if (buffer.length > 10 * 1024 * 1024) {
            return { isValid: false, mimeType: "", extension: "", error: "File size exceeds 10MB limit" };
        }
        // 1. PNG check: 89 50 4E 47 0D 0A 1A 0A
        if (buffer.length >= 8 &&
            buffer[0] === 0x89 &&
            buffer[1] === 0x50 &&
            buffer[2] === 0x4e &&
            buffer[3] === 0x47) {
            return { isValid: true, mimeType: "image/png", extension: ".png" };
        }
        // 2. JPEG check: FF D8 FF
        if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
            return { isValid: true, mimeType: "image/jpeg", extension: ".jpg" };
        }
        // 3. WebP check: "RIFF" .... "WEBP"
        if (buffer.length >= 12 &&
            buffer.toString("ascii", 0, 4) === "RIFF" &&
            buffer.toString("ascii", 8, 12) === "WEBP") {
            return { isValid: true, mimeType: "image/webp", extension: ".webp" };
        }
        // 4. GIF check: GIF87a or GIF89a
        if (buffer.length >= 6 && buffer.toString("ascii", 0, 3) === "GIF") {
            return { isValid: true, mimeType: "image/gif", extension: ".gif" };
        }
        // 5. ICO check: 00 00 01 00
        if (buffer.length >= 4 &&
            buffer[0] === 0x00 &&
            buffer[1] === 0x00 &&
            buffer[2] === 0x01 &&
            buffer[3] === 0x00) {
            return { isValid: true, mimeType: "image/x-icon", extension: ".ico" };
        }
        // 6. SVG check: look for <svg and reject malicious scripts
        const textSample = buffer.toString("utf8", 0, Math.min(buffer.length, 1024)).toLowerCase();
        if (textSample.includes("<svg")) {
            const fullText = buffer.toString("utf8").toLowerCase();
            if (fullText.includes("<script") ||
                fullText.includes("javascript:") ||
                fullText.includes("onload=") ||
                fullText.includes("onerror=")) {
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
        if (buffer.length >= 5 &&
            buffer[0] === 0x25 &&
            buffer[1] === 0x50 &&
            buffer[2] === 0x44 &&
            buffer[3] === 0x46 &&
            buffer[4] === 0x2d) {
            return { isValid: true, mimeType: "application/pdf", extension: ".pdf" };
        }
        return {
            isValid: false,
            mimeType: "",
            extension: "",
            error: "Unsupported file type. Please upload PNG, JPG, WebP, GIF, ICO, sanitized SVG, or PDF.",
        };
    }
    /**
     * Alias for backwards compatibility
     */
    static validateMediaBuffer(buffer, declaredMime) {
        return this.validateImageBuffer(buffer, declaredMime);
    }
    /**
     * Save an uploaded file to local disk and create MediaFile record.
     * Performs deduplication within the target tenant scope when checksum & filename match.
     */
    static async uploadMedia(buffer, originalName, options = {}) {
        const validation = this.validateImageBuffer(buffer, options.mimeType);
        if (!validation.isValid) {
            throw new Error(validation.error || "Invalid file");
        }
        const checksumSha = (0, integrity_hasher_1.computeSha256)(buffer);
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
        const targetDir = path_1.default.join(uploadsRoot, folder);
        if (!fs_1.default.existsSync(targetDir)) {
            fs_1.default.mkdirSync(targetDir, { recursive: true });
        }
        const uniqueFileName = `${Date.now()}-${crypto_1.default.randomBytes(4).toString("hex")}${validation.extension}`;
        const fullDiskPath = path_1.default.join(targetDir, uniqueFileName);
        const relativeFilePath = `${folder}/${uniqueFileName}`;
        const publicUrl = `/uploads/${folder}/${uniqueFileName}`;
        // Write file to disk
        await fs_1.default.promises.writeFile(fullDiskPath, buffer);
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
    static async getMedia(id) {
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
    static async listMedia(options = {}) {
        const where = {
            deletedAt: null,
        };
        if (options.tenantId !== undefined) {
            where.tenantId = options.tenantId;
        }
        if (options.folder) {
            where.folder = options.folder;
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
    static async deleteMedia(id, optionsOrTenantId = {}) {
        const options = typeof optionsOrTenantId === "string"
            ? { force: false, isSuper: false, requestedByTenantId: optionsOrTenantId }
            : optionsOrTenantId === null
                ? { force: false, isSuper: true, requestedByTenantId: null }
                : optionsOrTenantId || {};
        const file = await prisma.mediaFile.findUnique({
            where: { id },
            include: { usages: true },
        });
        if (!file) {
            const error = new Error("Media file not found");
            error.status = 404;
            throw error;
        }
        // Tenant isolation & access control check (when invoked in context of a user/tenant request)
        if (options.isSuper === false || options.requestedByTenantId !== undefined) {
            if (!options.isSuper) {
                if (file.tenantId === null) {
                    const error = new Error("Forbidden: Cannot delete platform media");
                    error.status = 403;
                    throw error;
                }
                if (file.tenantId !== options.requestedByTenantId) {
                    const error = new Error("Forbidden: Cannot delete media belonging to another workspace");
                    error.status = 403;
                    throw error;
                }
            }
        }
        if (file.usages.length > 0 && !options.force) {
            const error = new Error(`Cannot delete media: File is currently in use by ${file.usages.length} item(s).`);
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
exports.MediaService = MediaService;
