"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const media_service_1 = require("../services/media/media.service");
const chat_service_1 = require("../services/chat.service");
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB
});
exports.mediaRouter = (0, express_1.Router)();
/**
 * POST /api/v1/media/upload
 * Multipart upload to the Media Library (supports folder, tags)
 * Returns mediaId, url, dimensions, checksum
 */
exports.mediaRouter.post("/upload", auth_1.requireAuth, upload.single("file"), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: "No file uploaded in 'file' field" });
        }
        const folder = req.body.folder || "tenant/documents";
        const tags = req.body.tags ? (typeof req.body.tags === "string" ? req.body.tags.split(",") : req.body.tags) : ["document"];
        const isSuper = req.user?.roles?.includes("super_admin");
        // TASK-P1-04 (GAP-VAL-015, GAP-DB-API-011): Restrict system branding folder uploads to super_admin only
        if ((folder.startsWith("system/branding") || folder.startsWith("branding") || folder.startsWith("platform/branding")) && !isSuper) {
            return res.status(403).json({
                error: "Forbidden: Public branding directory uploads are restricted to Super Administrators.",
                code: "PUBLIC_FOLDER_UPLOAD_RESTRICTED",
            });
        }
        let tenantId = null;
        if (isSuper) {
            tenantId = req.body.tenantId ? String(req.body.tenantId) : null;
        }
        else {
            tenantId = req.user?.tenantId || null;
            if (!tenantId) {
                return res.status(403).json({ error: "Tenant context required for media upload" });
            }
        }
        const mediaFile = await media_service_1.MediaService.uploadMedia(file.buffer, file.originalname, {
            folder,
            tags,
            tenantId,
            uploadedBy: req.user?.userId || req.user?.id,
        });
        return res.status(201).json(mediaFile);
    }
    catch (err) {
        console.error("[Media Upload Error]:", err);
        return res.status(400).json({ error: err.message || "Failed to upload file" });
    }
});
/**
 * GET /api/v1/media
 * Retrieve media library assets with their usage relations.
 * Platform users get platform media by default (tenantId = null), or filtered tenant media if specified.
 * Tenant users strictly receive their own tenant media (query tenantId is ignored).
 */
exports.mediaRouter.get("/", auth_1.requireAuth, async (req, res) => {
    try {
        const isSuper = req.user?.roles?.includes("super_admin");
        let tenantId = null;
        if (isSuper) {
            tenantId = req.query.tenantId ? String(req.query.tenantId) : null;
        }
        else {
            tenantId = req.user?.tenantId || null;
            if (!tenantId) {
                return res.status(403).json({ error: "Tenant context required to list media" });
            }
        }
        const folder = req.query.folder ? String(req.query.folder) : undefined;
        const currentUserId = req.user?.userId || req.user?.id || "";
        const mediaList = await media_service_1.MediaService.listMedia({
            tenantId,
            folder,
        });
        // Never expose private chat attachments in generic workspace media listings unless uploaded by caller
        const filtered = mediaList.filter((file) => {
            const isChatFile = file.systemModule === "chat" ||
                String(file.folder || "").toLowerCase().includes("communication");
            if (!isChatFile)
                return true;
            return file.uploadedBy === currentUserId;
        });
        return res.json(filtered);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to list media" });
    }
});
/**
 * GET /api/v1/media/:id
 * Retrieve a single media file record with usages.
 * Enforces strict tenant authorization (Tenant A cannot access Tenant B or Platform media)
 * and thread participant / FileAcl authorization for chat attachments.
 */
exports.mediaRouter.get("/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const id = req.params.id;
        const isSuper = req.user?.roles?.includes("super_admin");
        const userTenantId = req.user?.tenantId || null;
        const currentUserId = req.user?.userId || req.user?.id || "";
        const file = await media_service_1.MediaService.getMedia(id);
        if (!file) {
            return res.status(404).json({ error: "Media file not found" });
        }
        if (!isSuper) {
            if (file.tenantId === null) {
                return res.status(403).json({ error: "Forbidden: Access denied to platform media" });
            }
            if (file.tenantId !== userTenantId) {
                return res.status(403).json({ error: "Forbidden: Access denied to media from another workspace" });
            }
        }
        const isChatFile = file.systemModule === "chat" ||
            String(file.folder || "").toLowerCase().includes("communication");
        if (isChatFile) {
            const chatAllowed = await chat_service_1.ChatService.authorizeChatMediaAccess({
                mediaFile: file,
                tenantId: file.tenantId || userTenantId || "",
                userId: currentUserId,
                roles: req.user?.roles || [],
            });
            if (!chatAllowed) {
                return res.status(403).json({
                    error: "Forbidden: You are not authorized to access this chat attachment.",
                    code: "UNAUTHORIZED_CHAT_MEDIA_ACCESS",
                });
            }
        }
        return res.json(file);
    }
    catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Failed to get media" });
    }
});
/**
 * DELETE /api/v1/media/:id
 * Delete media file. If used in settings/branding, blocks deletion with 409 Conflict
 * unless ?force=true is supplied.
 */
exports.mediaRouter.delete("/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const id = req.params.id;
        const force = req.query.force === "true" || req.query.force === "1";
        const isSuper = req.user?.roles?.includes("super_admin");
        const requestedByTenantId = isSuper ? null : req.user?.tenantId;
        const currentUserId = req.user?.userId || req.user?.id || "";
        const existingFile = await media_service_1.MediaService.getMedia(id);
        if (existingFile) {
            const isChatFile = existingFile.systemModule === "chat" ||
                String(existingFile.folder || "").toLowerCase().includes("communication");
            const isAdmin = req.user?.roles?.some((r) => ["super_admin", "tenant_admin", "hr_admin", "admin"].includes(r));
            if (isChatFile && !isAdmin && existingFile.uploadedBy !== currentUserId) {
                return res.status(403).json({
                    error: "Forbidden: Only the uploader or workspace administrator can delete this chat attachment.",
                    code: "UNAUTHORIZED_CHAT_MEDIA_DELETE",
                });
            }
        }
        const result = await media_service_1.MediaService.deleteMedia(id, {
            force,
            isSuper,
            requestedByTenantId,
        });
        return res.json(result);
    }
    catch (err) {
        if (err.code === "MEDIA_IN_USE" || err.status === 409) {
            return res.status(409).json({
                error: "MEDIA_IN_USE",
                message: err.message,
                usages: err.usages,
            });
        }
        return res.status(err.status || 400).json({ error: err.message || "Failed to delete media" });
    }
});
