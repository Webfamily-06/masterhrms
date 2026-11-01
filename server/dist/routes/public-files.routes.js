"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicFilesRouter = void 0;
const express_1 = require("express");
const file_acl_service_1 = require("../services/files/file-acl.service");
const storage_provider_factory_1 = require("../services/storage/storage-provider.factory");
const prisma_1 = require("../prisma");
const prisma = prisma_1.rawPrisma || prisma_1.prisma;
exports.publicFilesRouter = (0, express_1.Router)();
/**
 * GET /api/v1/public/files/link/:token
 * Public endpoint to fetch file info for an unguessable token.
 * Safe from leaking private file existence; returns 404 on invalid or expired tokens.
 */
exports.publicFilesRouter.get("/link/:token", async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.query;
        const result = await file_acl_service_1.FileAclService.verifyPublicLink({
            token,
            password: password ? String(password) : undefined,
        });
        res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
        return res.json({
            file: result.file || null,
            allowDownload: result.allowDownload,
            requiresPassword: result.requiresPassword,
            isPasswordValid: result.isPasswordValid,
        });
    }
    catch (err) {
        res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
        return res.status(err.status || 404).json({ error: err.message || "Link not found or expired." });
    }
});
/**
 * POST /api/v1/public/files/link/:token/verify
 * Public endpoint to verify a password-protected link.
 */
exports.publicFilesRouter.post("/link/:token/verify", async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;
        if (!password || typeof password !== "string" || !password.trim()) {
            res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
            return res.status(400).json({ error: "Password is required." });
        }
        const result = await file_acl_service_1.FileAclService.verifyPublicLink({
            token,
            password,
        });
        if (result.requiresPassword && !result.isPasswordValid) {
            res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
            return res.status(401).json({ error: "Invalid password." });
        }
        res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
        return res.json({
            success: true,
            file: result.file,
            allowDownload: result.allowDownload,
        });
    }
    catch (err) {
        res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
        return res.status(err.status || 401).json({ error: err.message || "Invalid password." });
    }
});
/**
 * POST /api/v1/public/files/link/:token/download
 * Generates an authorized, short-lived signed download URL for public visitors.
 */
exports.publicFilesRouter.post("/link/:token/download", async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;
        const result = await file_acl_service_1.FileAclService.verifyPublicLink({
            token,
            password,
        });
        if (result.requiresPassword && !result.isPasswordValid) {
            return res.status(401).json({ error: "Password required to download this file." });
        }
        if (!result.file) {
            return res.status(404).json({ error: "File not found or access denied." });
        }
        if (!result.allowDownload) {
            return res.status(403).json({ error: "Download is not permitted for this link." });
        }
        // Fetch storage key
        const file = await prisma.mediaFile.findUnique({
            where: { id: result.file.id },
            include: { versions: { orderBy: { versionNo: "desc" }, take: 1 } },
        });
        if (!file) {
            return res.status(404).json({ error: "File not found." });
        }
        const latestVersion = file.versions?.[0];
        const storageKey = latestVersion?.storageKey || file.filePath;
        const storageProvider = storage_provider_factory_1.StorageProviderFactory.getProvider();
        // Short-lived 60-second signed URL for public link download
        const signedUrl = await storageProvider.getSignedDownloadUrl(storageKey, file.fileName, 60);
        // Audit public link download
        if (file.tenantId) {
            await prisma.fileActivity.create({
                data: {
                    fileId: file.id,
                    tenantId: file.tenantId,
                    actorId: "anonymous_public",
                    action: "PUBLIC_LINK_DOWNLOAD",
                    metaJson: { fileName: file.fileName, ip: req.ip },
                },
            });
        }
        res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
        return res.json({
            downloadUrl: signedUrl,
            fileName: file.fileName,
            expiresInSeconds: 60,
        });
    }
    catch (err) {
        res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
        return res.status(err.status || 404).json({ error: err.message || "Download failed." });
    }
});
/**
 * GET /api/v1/public/files/assets/:id
 * Direct CDN-safe endpoint to serve publicly flagged assets (logos, branding, job assets).
 * Strictly forbids access to private files (contracts, resumes, payroll, KYC).
 */
exports.publicFilesRouter.get("/assets/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const file = await prisma.mediaFile.findUnique({
            where: { id },
            include: { versions: { orderBy: { versionNo: "desc" }, take: 1 } },
        });
        if (!file || file.deletedAt || file.status === "TRASHED") {
            return res.status(404).json({ error: "Asset not found." });
        }
        // Security check: Must be marked isPublic OR be in a designated public folder
        const isBranding = file.folder?.includes("branding") || file.tags?.includes("branding");
        if (!file.isPublic && !isBranding) {
            return res.status(403).json({
                error: "Forbidden: This asset is private and requires an authenticated session.",
            });
        }
        const latestVersion = file.versions?.[0];
        const storageKey = latestVersion?.storageKey || file.filePath;
        const storageProvider = storage_provider_factory_1.StorageProviderFactory.getProvider();
        const signedUrl = await storageProvider.getSignedPreviewUrl(storageKey, file.mimeType, 3600);
        // Cache header for public CDN
        res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
        return res.json({
            id: file.id,
            fileName: file.fileName,
            mimeType: file.mimeType,
            isPublic: true,
            url: signedUrl,
        });
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Failed to serve asset." });
    }
});
