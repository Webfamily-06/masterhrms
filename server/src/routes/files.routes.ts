import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { requireAuth } from "../middleware/auth";
import { FilesService } from "../services/files/files.service";
import { UploadSessionService } from "../services/files/upload-session.service";
import { QuotaService } from "../services/files/quota.service";
import { StorageProviderFactory } from "../services/storage/storage-provider.factory";
import { LocalStorageProvider } from "../services/storage/local-storage.provider";
import { getUploadsRoot } from "../services/media/media.service";
import { verifyToken } from "../lib/jwt";
import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
const prisma = rawPrisma || proxiedPrisma;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

export const filesRouter = Router();

function getAuthContext(req: any) {
  const isSuper = req.user?.roles?.includes("super_admin") || false;
  let tenantId: string | null = null;
  if (isSuper) {
    tenantId = req.query.tenantId ? String(req.query.tenantId) : req.user?.tenantId || null;
  } else {
    tenantId = req.user?.tenantId || null;
  }
  const userId = req.user?.userId || req.user?.id;
  const userRoles: string[] = req.user?.roles || (req.user?.workspaceRole ? [req.user.workspaceRole] : []);
  const userPermissions: string[] = req.user?.permissions || [];
  return { isSuper, tenantId, userId, userRoles, userPermissions };
}

// ============================================================================
// 1. STORAGE USAGE & STATS ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/files/usage/me
 * Returns storage usage and allocation for the authenticated user.
 */
filesRouter.get("/usage/me", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId, userId } = getAuthContext(req);
    const quotaBytes = await QuotaService.getUserQuotaBytes(tenantId, userId);
    const usage = await QuotaService.getOrCreateUsage(prisma, tenantId, userId);

    const used = Number(usage.usedBytes);
    const reserved = Number(usage.reservedBytes);
    const quota = Number(quotaBytes);
    const percentUsed = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;

    return res.json({
      userId,
      tenantId,
      usedBytes: used,
      formattedUsed: FilesService.formatBytes(used),
      reservedBytes: reserved,
      formattedReserved: FilesService.formatBytes(reserved),
      quotaBytes: quota,
      formattedQuota: FilesService.formatBytes(quota),
      percentUsed,
      fileCount: usage.fileCount,
    });
  } catch (err: any) {
    console.error("[Files Usage Me Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to retrieve user storage usage." });
  }
});

/**
 * GET /api/v1/files/usage/tenant
 * Returns storage usage and plan limit for the tenant storage pool.
 */
filesRouter.get("/usage/tenant", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context is required for organization storage usage." });
    }

    const quotaBytes = await QuotaService.getTenantQuotaBytes(tenantId);
    const usage = await QuotaService.getOrCreateUsage(prisma, tenantId, "tenant_pool");

    const used = Number(usage.usedBytes);
    const trash = Number(usage.trashBytes);
    const reserved = Number(usage.reservedBytes);
    const quota = Number(quotaBytes);
    const percentUsed = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;

    return res.json({
      tenantId,
      usedBytes: used,
      formattedUsed: FilesService.formatBytes(used),
      trashBytes: trash,
      formattedTrash: FilesService.formatBytes(trash),
      reservedBytes: reserved,
      formattedReserved: FilesService.formatBytes(reserved),
      planLimitBytes: quota,
      formattedPlanLimit: FilesService.formatBytes(quota),
      percentUsed,
      fileCount: usage.fileCount,
    });
  } catch (err: any) {
    console.error("[Files Usage Tenant Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to retrieve tenant storage usage." });
  }
});

/**
 * GET /api/v1/files/stats
 * Storage usage statistics, totals, quota percentage, and category breakdown.
 */
filesRouter.get("/stats", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId } = getAuthContext(req);
    const stats = await FilesService.getStats(tenantId, isSuper);
    return res.json(stats);
  } catch (err: any) {
    console.error("[Files Stats Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to retrieve storage statistics." });
  }
});

// ============================================================================
// 2. FILE & FOLDER BROWSING (WINDOWS 11 STYLE)
// ============================================================================

/**
 * GET /api/v1/files/nodes
 * Core Explorer browsing endpoint supporting views: "my", "shared-with-me", "trash", "org".
 */
filesRouter.get("/nodes", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId, userRoles, userPermissions } = getAuthContext(req);

    let parentId: string | null | undefined = undefined;
    if (req.query.parentId !== undefined) {
      if (req.query.parentId === "root" || req.query.parentId === "" || req.query.parentId === "null") {
        parentId = null;
      } else {
        parentId = String(req.query.parentId);
      }
    }

    const view = (req.query.view as any) || "my";
    const starred = req.query.starred === "true" || req.query.starred === true;
    const trashed = req.query.trashed === "true" || req.query.trashed === true || view === "trash";
    const category = req.query.category ? String(req.query.category) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const folder = req.query.folder ? String(req.query.folder) : undefined;
    const sortBy = req.query.sortBy as any;
    const sortOrder = req.query.sortOrder as any;
    const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;

    const result = await FilesService.listFiles({
      tenantId,
      userId,
      isSuper,
      userRoles,
      userPermissions,
      view,
      parentId,
      folder,
      search,
      category,
      starred,
      trashed,
      sortBy,
      sortOrder,
      page,
      limit,
    });

    return res.json(result);
  } catch (err: any) {
    console.error("[Files Nodes Browse Error]:", err);
    return res.status(err.status || 500).json({ error: err.message || "Failed to list file nodes." });
  }
});

/**
 * GET /api/v1/files
 * Legacy alias for /api/v1/files/nodes
 */
filesRouter.get("/", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId, userRoles, userPermissions } = getAuthContext(req);

    let parentId: string | null | undefined = undefined;
    if (req.query.parentId !== undefined) {
      if (req.query.parentId === "root" || req.query.parentId === "" || req.query.parentId === "null") {
        parentId = null;
      } else {
        parentId = String(req.query.parentId);
      }
    }

    const view = (req.query.view as any) || "my";
    const starred = req.query.starred === "true" || req.query.starred === true;
    const trashed = req.query.trashed === "true" || req.query.trashed === true || view === "trash";
    const category = req.query.category ? String(req.query.category) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const folder = req.query.folder ? String(req.query.folder) : undefined;
    const sortBy = req.query.sortBy as any;
    const sortOrder = req.query.sortOrder as any;
    const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;

    const result = await FilesService.listFiles({
      tenantId,
      userId,
      isSuper,
      userRoles,
      userPermissions,
      view,
      parentId,
      folder,
      search,
      category,
      starred,
      trashed,
      sortBy,
      sortOrder,
      page,
      limit,
    });

    return res.json(result);
  } catch (err: any) {
    console.error("[Files List Error]:", err);
    return res.status(err.status || 500).json({ error: err.message || "Failed to list files." });
  }
});

/**
 * GET /api/v1/files/nodes/:id/path
 * Returns breadcrumb ancestry from root to node.
 */
filesRouter.get("/nodes/:id/path", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const { id } = req.params;

    const breadcrumbs = await FilesService.getBreadcrumbPath(id, tenantId);
    return res.json(breadcrumbs);
  } catch (err: any) {
    console.error("[Files Breadcrumbs Error]:", err);
    return res.status(err.status || 500).json({ error: err.message || "Failed to retrieve path." });
  }
});

/**
 * GET /api/v1/files/nodes/:id
 * Retrieve details for a single item with Privacy by Default (unauthorized = 404).
 */
filesRouter.get("/nodes/:id", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId, userRoles, userPermissions } = getAuthContext(req);
    const { id } = req.params;

    const item = await FilesService.getItem(id, tenantId, userId, isSuper, userRoles, userPermissions);
    return res.json(item);
  } catch (err: any) {
    console.error("[Files Get Node Error]:", err);
    return res.status(err.status || 500).json({ error: err.message || "Failed to retrieve item details." });
  }
});

/**
 * GET /api/v1/files/nodes/:id/download
 * Generates an authorized signed download URL via StorageProvider.
 */
filesRouter.get("/nodes/:id/download", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId, userRoles, userPermissions } = getAuthContext(req);
    const { id } = req.params;
    const expiresIn = req.query.expiresIn ? parseInt(String(req.query.expiresIn), 10) : 300;

    const result = await FilesService.getDownloadUrl({
      fileId: id,
      tenantId,
      userId,
      isSuper,
      userRoles,
      userPermissions,
      expiresInSeconds: expiresIn,
    });

    return res.json(result);
  } catch (err: any) {
    console.error("[Files Download URL Error]:", err);
    return res.status(err.status || 500).json({ error: err.message || "Failed to generate download URL." });
  }
});

/**
 * GET /api/v1/files/nodes/:id/preview
 * Generates an authorized signed preview URL via StorageProvider.
 */
filesRouter.get("/nodes/:id/preview", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId, userRoles, userPermissions } = getAuthContext(req);
    const { id } = req.params;
    const expiresIn = req.query.expiresIn ? parseInt(String(req.query.expiresIn), 10) : 300;

    const result = await FilesService.getPreviewUrl({
      fileId: id,
      tenantId,
      userId,
      isSuper,
      userRoles,
      userPermissions,
      expiresInSeconds: expiresIn,
    });

    return res.json(result);
  } catch (err: any) {
    console.error("[Files Preview URL Error]:", err);
    return res.status(err.status || 500).json({ error: err.message || "Failed to generate preview URL." });
  }
});

// ============================================================================
// 3. DIRECT-TO-STORAGE UPLOAD PROTOCOL (VERCEL-COMPATIBLE)
// ============================================================================

/**
 * POST /api/v1/files/uploads
 * Initiates a direct browser-to-storage upload session.
 */
filesRouter.post("/uploads", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId, userId } = getAuthContext(req);
    const { fileName, sizeBytes, mimeType, folderId } = req.body;

    if (!fileName || typeof fileName !== "string") {
      return res.status(400).json({ error: "fileName is required." });
    }

    if (!sizeBytes || typeof sizeBytes !== "number" || sizeBytes <= 0) {
      return res.status(400).json({ error: "A valid positive sizeBytes number is required." });
    }

    const session = await UploadSessionService.initiateSession({
      tenantId,
      userId,
      folderId: folderId && folderId !== "root" && folderId !== "null" ? folderId : null,
      fileName: fileName.trim(),
      mimeType: mimeType || "application/octet-stream",
      sizeBytes,
    });

    return res.status(201).json(session);
  } catch (err: any) {
    console.error("[Files Upload Initiation Error]:", err);
    return res.status(err.status || 400).json({
      error: err.message || "Failed to initiate upload session.",
      code: err.code,
    });
  }
});

/**
 * POST /api/v1/files/uploads/:id/complete
 * Verifies and finalizes a completed direct upload.
 */
filesRouter.post("/uploads/:id/complete", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId, userId } = getAuthContext(req);
    const { id } = req.params;

    const file = await UploadSessionService.completeSession(id, userId, tenantId);
    return res.status(200).json(file);
  } catch (err: any) {
    console.error("[Files Upload Complete Error]:", err);
    return res.status(err.status || 400).json({ error: err.message || "Failed to complete upload session." });
  }
});

/**
 * POST /api/v1/files/uploads/:id/abort
 * Aborts an upload session and releases reserved quota bytes.
 */
filesRouter.post("/uploads/:id/abort", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId, userId } = getAuthContext(req);
    const { id } = req.params;

    const result = await UploadSessionService.abortSession(id, userId, tenantId);
    return res.json(result);
  } catch (err: any) {
    console.error("[Files Upload Abort Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to abort upload session." });
  }
});

/**
 * PUT /api/v1/files/uploads/:id/binary
 * Local development fallback binary upload endpoint.
 */
filesRouter.put(
  "/uploads/:id/binary",
  express.raw({ type: "*/*", limit: "100mb" }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const key = req.query.key ? String(req.query.key) : "";
      const exp = req.query.exp ? parseInt(String(req.query.exp), 10) : 0;
      const token = req.query.token ? String(req.query.token) : "";

      if (!key) {
        return res.status(400).json({ error: "Storage key parameter is required." });
      }

      const storageProvider = StorageProviderFactory.getProvider();
      if (storageProvider.providerName === "local" && storageProvider.uploadBuffer) {
        await storageProvider.uploadBuffer(key, req.body as Buffer, req.headers["content-type"] || "application/octet-stream");
        return res.status(200).json({ success: true, storageKey: key });
      }

      return res.status(400).json({ error: "Direct binary endpoint only available on local storage provider." });
    } catch (err: any) {
      console.error("[Files Binary Upload Error]:", err);
      return res.status(500).json({ error: err.message || "Failed to write local binary object." });
    }
  }
);

// ============================================================================
// 4. FOLDER & NODE MANIPULATION
// ============================================================================

/**
 * POST /api/v1/files/folders
 * Create a new folder with Windows Explorer naming rules & sibling uniqueness.
 */
filesRouter.post("/folders", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId } = getAuthContext(req);
    const { name, parentId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Folder name is required." });
    }

    const folderRecord = await FilesService.createFolder({
      tenantId,
      userId,
      isSuper,
      name: name.trim(),
      parentId: parentId && parentId !== "root" && parentId !== "null" ? parentId : null,
    });

    return res.status(201).json(folderRecord);
  } catch (err: any) {
    console.error("[Files Create Folder Error]:", err);
    return res.status(err.status || 400).json({
      error: err.message || "Failed to create folder.",
      code: err.code,
    });
  }
});

/**
 * POST /api/v1/files/folder (Legacy alias)
 */
filesRouter.post("/folder", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId } = getAuthContext(req);
    const { name, parentId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Folder name is required." });
    }

    const folderRecord = await FilesService.createFolder({
      tenantId,
      userId,
      isSuper,
      name: name.trim(),
      parentId: parentId && parentId !== "root" && parentId !== "null" ? parentId : null,
    });

    return res.status(201).json(folderRecord);
  } catch (err: any) {
    console.error("[Files Legacy Create Folder Error]:", err);
    return res.status(err.status || 400).json({
      error: err.message || "Failed to create folder.",
      code: err.code,
    });
  }
});

/**
 * PATCH /api/v1/files/nodes/:id
 * Unified update endpoint: supports rename, move, and property changes.
 */
filesRouter.patch("/nodes/:id", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId } = getAuthContext(req);
    const { id } = req.params;
    const { name, newName, targetParentId } = req.body;

    let updated: any = null;

    // 1. Rename if name specified
    const targetName = newName || name;
    if (targetName && typeof targetName === "string") {
      updated = await FilesService.renameItem({
        id,
        tenantId,
        userId,
        isSuper,
        newName: targetName.trim(),
      });
    }

    // 2. Move if targetParentId specified
    if (targetParentId !== undefined) {
      let resolvedParentId = targetParentId;
      if (resolvedParentId === "root" || resolvedParentId === "" || resolvedParentId === "null") {
        resolvedParentId = null;
      }
      updated = await FilesService.moveItem({
        id,
        tenantId,
        userId,
        isSuper,
        targetParentId: resolvedParentId,
      });
    }

    if (!updated) {
      return res.status(400).json({ error: "No modification parameters provided (name, newName, targetParentId)." });
    }

    return res.json(updated);
  } catch (err: any) {
    console.error("[Files Patch Node Error]:", err);
    return res.status(err.status || 400).json({
      error: err.message || "Failed to update file node.",
      code: err.code,
    });
  }
});

/**
 * PATCH /api/v1/files/:id/rename (Legacy alias)
 */
filesRouter.patch("/:id/rename", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId } = getAuthContext(req);
    const { id } = req.params;
    const newName = req.body.newName || req.body.name;

    if (!newName || !newName.trim()) {
      return res.status(400).json({ error: "New name is required." });
    }

    const updated = await FilesService.renameItem({
      id,
      tenantId,
      userId,
      isSuper,
      newName: newName.trim(),
    });

    return res.json(updated);
  } catch (err: any) {
    console.error("[Files Rename Error]:", err);
    return res.status(err.status || 400).json({
      error: err.message || "Failed to rename item.",
      code: err.code,
    });
  }
});

/**
 * PATCH /api/v1/files/:id/move (Legacy alias)
 */
filesRouter.patch("/:id/move", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId } = getAuthContext(req);
    const { id } = req.params;
    let targetParentId = req.body.targetParentId;
    if (targetParentId === "root" || targetParentId === "" || targetParentId === "null") {
      targetParentId = null;
    }

    const updated = await FilesService.moveItem({
      id,
      tenantId,
      userId,
      isSuper,
      targetParentId,
    });

    return res.json(updated);
  } catch (err: any) {
    console.error("[Files Move Error]:", err);
    return res.status(err.status || 400).json({
      error: err.message || "Failed to move item.",
      code: err.code,
    });
  }
});

/**
 * POST /api/v1/files/nodes/:id/star
 * Toggle star status for the current user.
 */
filesRouter.post("/nodes/:id/star", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId } = getAuthContext(req);
    const { id } = req.params;

    const result = await FilesService.toggleStar({
      fileId: id,
      tenantId,
      userId,
      isSuper,
    });

    return res.json(result);
  } catch (err: any) {
    console.error("[Files Star Error]:", err);
    return res.status(err.status || 400).json({ error: err.message || "Failed to star item." });
  }
});

/**
 * POST /api/v1/files/:id/star (Legacy alias)
 */
filesRouter.post("/:id/star", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId } = getAuthContext(req);
    const { id } = req.params;

    const result = await FilesService.toggleStar({
      fileId: id,
      tenantId,
      userId,
      isSuper,
    });

    return res.json(result);
  } catch (err: any) {
    console.error("[Files Star Legacy Error]:", err);
    return res.status(err.status || 400).json({ error: err.message || "Failed to star item." });
  }
});

// ============================================================================
// 5. LIFECYCLE: TRASH, RESTORE, AND PERMANENT PURGE
// ============================================================================

/**
 * POST /api/v1/files/nodes/:id/trash
 * Soft deletes node to trash with cascading child updates and quota accounting.
 */
filesRouter.post("/nodes/:id/trash", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId } = getAuthContext(req);
    const { id } = req.params;
    const force = Boolean(req.body.force);

    const result = await FilesService.trashItems({
      ids: [id],
      tenantId,
      userId,
      isSuper,
      force,
    });

    return res.json(result);
  } catch (err: any) {
    console.error("[Files Trash Node Error]:", err);
    return res.status(err.status || 400).json({
      error: err.message || "Failed to trash item.",
      code: err.code,
      usages: err.usages,
    });
  }
});

/**
 * POST /api/v1/files/nodes/:id/restore
 * Restores node and its cascaded descendants from trash.
 */
filesRouter.post("/nodes/:id/restore", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId } = getAuthContext(req);
    const { id } = req.params;

    const result = await FilesService.restoreItems({
      ids: [id],
      tenantId,
      userId,
      isSuper,
    });

    return res.json(result);
  } catch (err: any) {
    console.error("[Files Restore Node Error]:", err);
    return res.status(err.status || 400).json({ error: err.message || "Failed to restore item." });
  }
});

/**
 * DELETE /api/v1/files/nodes/:id
 * Permanently purges a file or folder and all physical storage objects.
 */
filesRouter.delete("/nodes/:id", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId } = getAuthContext(req);
    const { id } = req.params;

    const result = await FilesService.deleteItemPermanently({
      id,
      tenantId,
      userId,
      isSuper,
    });

    return res.json(result);
  } catch (err: any) {
    console.error("[Files Delete Node Error]:", err);
    return res.status(err.status || 400).json({ error: err.message || "Failed to delete item permanently." });
  }
});

/**
 * POST /api/v1/files/trash (Legacy bulk alias)
 */
filesRouter.post("/trash", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId } = getAuthContext(req);
    const ids: string[] = req.body.ids || (req.body.id ? [req.body.id] : []);
    const force = Boolean(req.body.force);

    if (!ids || ids.length === 0) {
      return res.status(400).json({ error: "No item IDs provided to trash." });
    }

    const result = await FilesService.trashItems({
      ids,
      tenantId,
      userId,
      isSuper,
      force,
    });

    return res.json(result);
  } catch (err: any) {
    console.error("[Files Bulk Trash Error]:", err);
    return res.status(err.status || 400).json({
      error: err.message || "Failed to trash items.",
      code: err.code,
      usages: err.usages,
    });
  }
});

/**
 * POST /api/v1/files/restore (Legacy bulk alias)
 */
filesRouter.post("/restore", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId } = getAuthContext(req);
    const ids: string[] = req.body.ids || (req.body.id ? [req.body.id] : []);

    if (!ids || ids.length === 0) {
      return res.status(400).json({ error: "No item IDs provided to restore." });
    }

    const result = await FilesService.restoreItems({
      ids,
      tenantId,
      userId,
      isSuper,
    });

    return res.json(result);
  } catch (err: any) {
    console.error("[Files Bulk Restore Error]:", err);
    return res.status(err.status || 400).json({ error: err.message || "Failed to restore items." });
  }
});

// ============================================================================
// 6. STREAMING & LOCAL SIGNED ACCESS
// ============================================================================

/**
 * GET /api/v1/files/stream
 * Direct streaming for LocalStorageProvider with HMAC token verification.
 */
filesRouter.get("/stream", async (req: Request, res: Response) => {
  try {
    const key = req.query.key ? String(req.query.key) : "";
    const exp = req.query.exp ? parseInt(String(req.query.exp), 10) : 0;
    const sig = req.query.sig ? String(req.query.sig) : "";
    const isInline = req.query.inline === "true";
    const downloadName = req.query.download ? String(req.query.download) : "";

    if (!key || !exp || !sig) {
      return res.status(401).json({ error: "Missing required signed URL parameters." });
    }

    const storageProvider = StorageProviderFactory.getProvider();
    if (storageProvider instanceof LocalStorageProvider) {
      const type = isInline ? "preview" : "download";
      const isValid = storageProvider.verifySignature(type, key, exp, sig);
      if (!isValid) {
        return res.status(403).json({ error: "Invalid or expired signature." });
      }

      const filePath = storageProvider.getPhysicalPath(key);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Physical file asset not found." });
      }

      const stat = fs.statSync(filePath);
      const filename = encodeURIComponent(downloadName || path.basename(key));

      res.setHeader("Content-Length", stat.size);
      res.setHeader(
        "Content-Disposition",
        `${isInline ? "inline" : "attachment"}; filename="${filename}"; filename*=UTF-8''${filename}`
      );
      res.setHeader("Cache-Control", "private, max-age=3600");

      const readStream = fs.createReadStream(filePath);
      return readStream.pipe(res);
    }

    return res.status(400).json({ error: "Local streaming endpoint not supported for active provider." });
  } catch (err: any) {
    console.error("[Files Local Stream Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to stream file asset." });
  }
});

/**
 * GET /api/v1/files/:id/stream (Legacy stream route)
 */
filesRouter.get("/:id/stream", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await prisma.mediaFile.findUnique({ where: { id } });

    if (!item || item.deletedAt || item.status === "TRASHED") {
      return res.status(404).json({ error: "File asset not found or has been trashed." });
    }

    if (item.isFolder || item.type === "FOLDER") {
      return res.status(400).json({ error: "Cannot download directory stream." });
    }

    // Resolve physical file on disk
    const root = getUploadsRoot();
    const absolutePath = path.resolve(root, item.filePath);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: "Physical file asset not found on storage disk." });
    }

    const stat = fs.statSync(absolutePath);
    const mimeType = item.mimeType || "application/octet-stream";
    const isInline = req.query.inline === "true";
    const filename = encodeURIComponent(item.fileName);

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Length", stat.size);
    res.setHeader(
      "Content-Disposition",
      `${isInline ? "inline" : "attachment"}; filename="${filename}"; filename*=UTF-8''${filename}`
    );
    res.setHeader("Cache-Control", "private, max-age=3600");

    const readStream = fs.createReadStream(absolutePath);
    return readStream.pipe(res);
  } catch (err: any) {
    console.error("[Files Legacy Stream Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to stream file asset." });
  }
});

// ============================================================================
// 7. LEGACY MULTIPART UPLOAD FALLBACK
// ============================================================================

filesRouter.post(
  "/upload",
  requireAuth,
  upload.array("files", 20),
  async (req: any, res: Response) => {
    try {
      const { isSuper, tenantId, userId } = getAuthContext(req);
      const files: Express.Multer.File[] = (req.files as Express.Multer.File[]) || (req.file ? [req.file] : []);

      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files provided for upload." });
      }

      let parentId: string | null | undefined = undefined;
      if (req.body.parentId && req.body.parentId !== "root" && req.body.parentId !== "null") {
        parentId = String(req.body.parentId);
      }

      const folder = req.body.folder || undefined;
      const category = req.body.category || undefined;
      const tags = req.body.tags
        ? typeof req.body.tags === "string"
          ? req.body.tags.split(",").map((t: string) => t.trim())
          : req.body.tags
        : ["file-manager"];

      const uploadedResults = [];
      for (const file of files) {
        const item = await FilesService.uploadFile({
          buffer: file.buffer,
          originalFilename: file.originalname,
          tenantId,
          userId,
          isSuper,
          parentId,
          folder,
          tags,
          category,
        });
        uploadedResults.push(item);
      }

      return res.status(201).json({
        success: true,
        count: uploadedResults.length,
        items: uploadedResults,
      });
    } catch (err: any) {
      console.error("[Files Upload Error]:", err);
      return res.status(err.status || 400).json({ error: err.message || "Failed to upload file(s)." });
    }
  }
);

// ============================================================================
// 8. SHARING & PERMISSIONS
// ============================================================================

filesRouter.post("/:id/share", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId } = getAuthContext(req);
    const { id } = req.params;
    const { sharedWith, sharedRole, accessLevel, expiresAt } = req.body;

    const share = await FilesService.shareItem({
      fileId: id,
      tenantId,
      sharedBy: userId,
      sharedWith,
      sharedRole,
      accessLevel,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isSuper,
    });

    return res.status(201).json(share);
  } catch (err: any) {
    console.error("[Files Share Error]:", err);
    return res.status(err.status || 400).json({ error: err.message || "Failed to create share." });
  }
});

filesRouter.get("/:id/shares", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId } = getAuthContext(req);
    const { id } = req.params;

    const shares = await FilesService.listShares(id, tenantId, isSuper);
    return res.json(shares);
  } catch (err: any) {
    console.error("[Files List Shares Error]:", err);
    return res.status(err.status || 500).json({ error: err.message || "Failed to list shares." });
  }
});

filesRouter.delete("/:id/share/:shareId", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId } = getAuthContext(req);
    const { shareId } = req.params;

    const revoked = await FilesService.revokeShare(shareId, tenantId, isSuper);
    return res.json({ success: true, share: revoked });
  } catch (err: any) {
    console.error("[Files Revoke Share Error]:", err);
    return res.status(err.status || 400).json({ error: err.message || "Failed to revoke share." });
  }
});

/**
 * GET /api/v1/files/:id (Legacy single node endpoint)
 */
filesRouter.get("/:id", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId, userRoles, userPermissions } = getAuthContext(req);
    const { id } = req.params;

    const item = await FilesService.getItem(id, tenantId, userId, isSuper, userRoles, userPermissions);
    return res.json(item);
  } catch (err: any) {
    console.error("[Files Get Item Legacy Error]:", err);
    return res.status(err.status || 500).json({ error: err.message || "Failed to retrieve item details." });
  }
});
