import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth";
import { MediaService } from "../services/media/media.service";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

export const mediaRouter = Router();

/**
 * POST /api/v1/media/upload
 * Multipart upload to the Media Library (supports folder, tags)
 * Returns mediaId, url, dimensions, checksum
 */
mediaRouter.post(
  "/upload",
  requireAuth,
  upload.single("file"),
  async (req: any, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded in 'file' field" });
      }

      const folder = req.body.folder || "system/branding";
      const tags = req.body.tags ? (typeof req.body.tags === "string" ? req.body.tags.split(",") : req.body.tags) : ["branding"];
      const isSuper = req.user?.roles?.includes("super_admin");
      let tenantId: string | null = null;

      if (isSuper) {
        tenantId = req.body.tenantId ? String(req.body.tenantId) : null;
      } else {
        tenantId = req.user?.tenantId || null;
        if (!tenantId) {
          return res.status(403).json({ error: "Tenant context required for media upload" });
        }
      }

      const mediaFile = await MediaService.uploadMedia(file.buffer, file.originalname, {
        folder,
        tags,
        tenantId,
        uploadedBy: req.user?.userId || req.user?.id,
      });

      return res.status(201).json(mediaFile);
    } catch (err: any) {
      console.error("[Media Upload Error]:", err);
      return res.status(400).json({ error: err.message || "Failed to upload file" });
    }
  }
);

/**
 * GET /api/v1/media
 * Retrieve media library assets with their usage relations.
 * Platform users get platform media by default (tenantId = null), or filtered tenant media if specified.
 * Tenant users strictly receive their own tenant media (query tenantId is ignored).
 */
mediaRouter.get("/", requireAuth, async (req: any, res) => {
  try {
    const isSuper = req.user?.roles?.includes("super_admin");
    let tenantId: string | null = null;

    if (isSuper) {
      tenantId = req.query.tenantId ? String(req.query.tenantId) : null;
    } else {
      tenantId = req.user?.tenantId || null;
      if (!tenantId) {
        return res.status(403).json({ error: "Tenant context required to list media" });
      }
    }

    const folder = req.query.folder ? String(req.query.folder) : undefined;

    const mediaList = await MediaService.listMedia({
      tenantId,
      folder,
    });

    return res.json(mediaList);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list media" });
  }
});

/**
 * GET /api/v1/media/:id
 * Retrieve a single media file record with usages.
 * Enforces strict tenant authorization (Tenant A cannot access Tenant B or Platform media).
 */
mediaRouter.get("/:id", requireAuth, async (req: any, res) => {
  try {
    const id = req.params.id;
    const isSuper = req.user?.roles?.includes("super_admin");
    const userTenantId = req.user?.tenantId || null;

    const file = await MediaService.getMedia(id);
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

    return res.json(file);
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || "Failed to get media" });
  }
});

/**
 * DELETE /api/v1/media/:id
 * Delete media file. If used in settings/branding, blocks deletion with 409 Conflict
 * unless ?force=true is supplied.
 */
mediaRouter.delete("/:id", requireAuth, async (req: any, res) => {
  try {
    const id = req.params.id;
    const force = req.query.force === "true" || req.query.force === "1";
    const isSuper = req.user?.roles?.includes("super_admin");
    const requestedByTenantId = isSuper ? null : req.user?.tenantId;

    const result = await MediaService.deleteMedia(id, {
      force,
      isSuper,
      requestedByTenantId,
    });
    return res.json(result);
  } catch (err: any) {
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
