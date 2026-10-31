
import { DocumentPreviewService } from "../services/files/document-preview.service";
import { DocumentAnnotationService } from "../services/files/document-annotation.service";
import { MalwareScannerService } from "../services/security/malware-scanner.service";
import { DlpEngineService } from "../services/security/dlp-engine.service";
import { ExternalConnectorsService } from "../services/storage/external-connectors.service";
import { StreamingArchivalService } from "../services/files/streaming-archival.service";
import { BatchOperationsService } from "../services/files/batch-operations.service";
import { WebdavService } from "../services/webdav/webdav.service";
import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { requireAuth } from "../middleware/auth";
import { FilesService } from "../services/files/files.service";
import { FileAclService } from "../services/files/file-acl.service";
import { FileTeamService } from "../services/files/file-team.service";
import { UploadSessionService } from "../services/files/upload-session.service";
import { FileInvariantsService } from "../services/files/file-invariants.service";
import { QuotaService } from "../services/files/quota.service";
import { StorageProviderFactory } from "../services/storage/storage-provider.factory";
import { LocalStorageProvider } from "../services/storage/local-storage.provider";
import { getUploadsRoot } from "../services/media/media.service";
import { verifyToken } from "../lib/jwt";
import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
const prisma = rawPrisma || proxiedPrisma;

import { SystemFolderService } from "../services/files/system-folder.service";
import { FileLinkService } from "../services/files/file-link.service";

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
    const usage = await QuotaService.getOrCreateUsage(prisma, tenantId, null);

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
filesRouter.get(["/nodes/:id/download", "/:id/signed-url", "/:id/download"], requireAuth, async (req: any, res: Response) => {
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
filesRouter.get(["/nodes/:id/preview", "/:id/preview"], requireAuth, async (req: any, res: Response) => {
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
    const { isSuper, tenantId, userId, userRoles } = getAuthContext(req);
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
    const { isSuper, tenantId, userId, userRoles } = getAuthContext(req);
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
    const { isSuper, tenantId, userId, userRoles } = getAuthContext(req);
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
    const { isSuper, tenantId, userId, userRoles } = getAuthContext(req);
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
    const { isSuper, tenantId, userId, userRoles } = getAuthContext(req);
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
    const { isSuper, tenantId, userId, userRoles } = getAuthContext(req);
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
    const { isSuper, tenantId, userId, userRoles } = getAuthContext(req);
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
    const { isSuper, tenantId, userId, userRoles } = getAuthContext(req);
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
    const { isSuper, tenantId, userId, userRoles } = getAuthContext(req);
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
    const { isSuper, tenantId, userId, userRoles } = getAuthContext(req);
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
    const { isSuper, tenantId, userId, userRoles } = getAuthContext(req);
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
    const { isSuper, tenantId, userId, userRoles } = getAuthContext(req);
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
/**
 * POST /api/v1/files/purge
 * Permanently purges specified items by ID or empties the entire trash.
 */
filesRouter.post("/purge", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId, userRoles } = getAuthContext(req);
    const ids: string[] = req.body.ids || (req.body.id ? [req.body.id] : []);
    const emptyTrash = Boolean(req.body.emptyTrash);

    const effectiveTenantId = tenantId || (req.body.tenantId ? String(req.body.tenantId) : null);
    let targetIds = ids;
    if (emptyTrash) {
      if (!effectiveTenantId) {
        return res.status(400).json({ error: "Tenant context is required to empty trash." });
      }

      const isAdmin =
        isSuper ||
        (userRoles || []).some((r: string) =>
          ["admin", "superadmin", "tenantadmin", "tenant_admin"].includes(r.toLowerCase())
        );

      const userScope = isAdmin
        ? {}
        : {
            OR: [
              { ownerId: userId },
              { uploadedBy: userId },
              { trashedBy: userId },
            ],
          };

      const trashed = await prisma.mediaFile.findMany({
        where: {
          tenantId: effectiveTenantId,
          AND: [
            {
              OR: [{ deletedAt: { not: null } }, { status: "TRASHED" }],
            },
            userScope,
          ],
        },
        select: { id: true },
      });
      targetIds = trashed.map((t) => t.id);
    }

    if (!targetIds || targetIds.length === 0) {
      return res.json({ success: true, count: 0, message: "No items to permanently delete." });
    }

    let purgedCount = 0;
    for (const id of targetIds) {
      try {
        await FilesService.deleteItemPermanently({ id, tenantId: effectiveTenantId, userId, isSuper });
        purgedCount++;
      } catch (e: any) {
        console.warn(`[Purge] Failed to permanently delete item ${id}:`, e?.message || e);
      }
    }

    return res.json({
      success: true,
      count: purgedCount,
      message: `Permanently deleted ${purgedCount} item(s).`,
    });
  } catch (err: any) {
    console.error("[Files Bulk Purge Error]:", err);
    return res.status(err.status || 400).json({ error: err.message || "Failed to permanently delete items." });
  }
});

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
      const ext = path.extname(downloadName || key).toLowerCase();
      const mimeMap: Record<string, string> = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".txt": "text/plain",
        ".csv": "text/csv",
      };
      res.setHeader("Content-Type", mimeMap[ext] || "application/octet-stream");
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
      const { isSuper, tenantId, userId, userRoles } = getAuthContext(req);
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

      let relativePaths: string[] = [];
      if (req.body.relativePaths) {
        relativePaths = Array.isArray(req.body.relativePaths)
          ? req.body.relativePaths
          : [req.body.relativePaths];
      }

      const folderCache = new Map<string, string>();
      const uploadedResults = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let targetParentId = parentId;

        const relPath = relativePaths[i];
        if (relPath && typeof relPath === "string") {
          const segments = relPath.split(/[/\\]+/).filter(Boolean);
          if (segments.length > 1) {
            const folderSegments = segments.slice(0, -1);
            let currentParent = parentId;
            let currentPathKey = parentId ? String(parentId) : "root";

            for (const segment of folderSegments) {
              const nextPathKey = `${currentPathKey}/${segment}`;
              let cachedFolderId = folderCache.get(nextPathKey);
              if (!cachedFolderId) {
                const segmentKey = FileInvariantsService.computeNameKey(segment);
                let existingFolder = await prisma.mediaFile.findFirst({
                  where: {
                    tenantId: isSuper ? undefined : tenantId,
                    parentId: currentParent || null,
                    nameKey: segmentKey,
                    isFolder: true,
                    deletedAt: null,
                    status: "ACTIVE",
                  },
                });
                if (!existingFolder) {
                  existingFolder = await FilesService.createFolder({
                    tenantId,
                    userId,
                    isSuper,
                    name: segment,
                    parentId: currentParent,
                  });
                }
                cachedFolderId = existingFolder.id;
                folderCache.set(nextPathKey, cachedFolderId);
              }
              currentParent = cachedFolderId;
              currentPathKey = nextPathKey;
            }
            targetParentId = currentParent;
          }
        }

        const item = await FilesService.uploadFile({
          buffer: file.buffer,
          originalFilename: file.originalname,
          tenantId,
          userId,
          isSuper,
          parentId: targetParentId,
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
    const { isSuper, tenantId, userId, userRoles } = getAuthContext(req);
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
 * GET /api/v1/files/teams
 * List all collaborative teams for the tenant.
 */
filesRouter.get("/teams", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId, userRoles } = getAuthContext(req);
    const isAdmin = isSuper || userRoles.includes("tenant_admin") || userRoles.includes("admin");

    const teams = await FileTeamService.listTeams({
      tenantId: tenantId!,
      userId,
      isSuper,
      isAdmin,
    });
    return res.json(teams);
  } catch (err: any) {
    console.error("[Files List Teams Error]:", err);
    return res.status(500).json({ error: "Failed to list teams." });
  }
});

/**
 * POST /api/v1/files/teams
 * Create a new collaborative team and its root folder.
 */
filesRouter.post("/teams", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId, userId } = getAuthContext(req);
    const { name, description } = req.body;

    const team = await FileTeamService.createTeam({
      tenantId: tenantId!,
      name,
      description,
      createdBy: userId,
    });
    return res.status(201).json(team);
  } catch (err: any) {
    console.error("[Files Create Team Error]:", err);
    return res.status(err.status || 400).json({ error: err.message || "Failed to create team." });
  }
});

/**
 * GET /api/v1/files/teams/:teamId
 * Get team details and members.
 */
filesRouter.get("/teams/:teamId", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId, userRoles } = getAuthContext(req);
    const { teamId } = req.params;
    const isAdmin = isSuper || userRoles.includes("tenant_admin") || userRoles.includes("admin");

    const team = await FileTeamService.getTeam({
      teamId,
      tenantId: tenantId!,
      userId,
      isSuper,
      isAdmin,
    });
    return res.json(team);
  } catch (err: any) {
    console.error("[Files Get Team Error]:", err);
    return res.status(err.status || 500).json({ error: err.message || "Failed to get team." });
  }
});

/**
 * POST /api/v1/files/teams/:teamId/members
 * Add or update member in team.
 */
filesRouter.post("/teams/:teamId/members", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId, userRoles } = getAuthContext(req);
    const { teamId } = req.params;
    const { userId: targetUserId, role } = req.body;
    const isAdmin = isSuper || userRoles.includes("tenant_admin") || userRoles.includes("admin");

    const member = await FileTeamService.addMember({
      teamId,
      tenantId: tenantId!,
      actorId: userId,
      userId: targetUserId,
      role: role || "VIEWER",
      isSuper,
      isAdmin,
    });
    return res.status(201).json(member);
  } catch (err: any) {
    console.error("[Files Add Team Member Error]:", err);
    return res.status(err.status || 400).json({ error: err.message || "Failed to add team member." });
  }
});

/**
 * DELETE /api/v1/files/teams/:teamId/members/:userId
 * Remove member from team.
 */
filesRouter.delete("/teams/:teamId/members/:targetUserId", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId, userRoles } = getAuthContext(req);
    const { teamId, targetUserId } = req.params;
    const isAdmin = isSuper || userRoles.includes("tenant_admin") || userRoles.includes("admin");

    const result = await FileTeamService.removeMember({
      teamId,
      tenantId: tenantId!,
      actorId: userId,
      userId: targetUserId,
      isSuper,
      isAdmin,
    });
    return res.json(result);
  } catch (err: any) {
    console.error("[Files Remove Team Member Error]:", err);
    return res.status(err.status || 400).json({ error: err.message || "Failed to remove team member." });
  }
});

/**
 * DELETE /api/v1/files/teams/:teamId
 * Delete a team safely without deleting files.
 */
filesRouter.delete("/teams/:teamId", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId, userRoles } = getAuthContext(req);
    const { teamId } = req.params;
    const isAdmin = isSuper || userRoles.includes("tenant_admin") || userRoles.includes("admin");

    const result = await FileTeamService.deleteTeam({
      teamId,
      tenantId: tenantId!,
      actorId: userId,
      isSuper,
      isAdmin,
    });
    return res.json(result);
  } catch (err: any) {
    console.error("[Files Delete Team Error]:", err);
    return res.status(err.status || 400).json({ error: err.message || "Failed to delete team." });
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


// ============================================================================
// 9. PHASE F3: COLLABORATION, ACLs, TEAMS & PUBLIC LINKS
// ============================================================================

/**
 * GET /api/v1/files/principals/search
 * Search tenant users, teams, and departments for the Share dialog.
 */
filesRouter.get("/principals/search", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const q = String(req.query.q || "").trim().toLowerCase();

    const [users, teams, departments] = await Promise.all([
      prisma.user.findMany({
        where: {
          profile: { tenantId },
          OR: q
            ? [
                { email: { contains: q, mode: "insensitive" } },
                { profile: { fullName: { contains: q, mode: "insensitive" } } },
              ]
            : undefined,
        },
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true, avatarUrl: true } },
        },
        take: 20,
      }),
      prisma.fileTeam.findMany({
        where: {
          tenantId: tenantId || undefined,
          name: q ? { contains: q, mode: "insensitive" } : undefined,
        },
        select: { id: true, name: true, description: true },
        take: 20,
      }),
      prisma.department.findMany({
        where: {
          tenantId: tenantId || undefined,
          name: q ? { contains: q, mode: "insensitive" } : undefined,
        },
        select: { id: true, name: true },
        take: 20,
      }),
    ]);

    const roles = [
      { id: "tenant_admin", name: "Tenant Administrator", type: "ROLE" },
      { id: "hr_admin", name: "HR Administrator", type: "ROLE" },
      { id: "department_head", name: "Department Head", type: "ROLE" },
      { id: "manager", name: "Manager", type: "ROLE" },
      { id: "employee", name: "Employee", type: "ROLE" },
    ].filter((r) => !q || r.name.toLowerCase().includes(q) || r.id.includes(q));

    return res.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.profile?.fullName || u.email,
        email: u.email,
        avatarUrl: u.profile?.avatarUrl,
        type: "USER",
      })),
      teams: teams.map((t) => ({ id: t.id, name: t.name, description: t.description, type: "TEAM" })),
      departments: departments.map((d) => ({ id: d.id, name: d.name, type: "DEPARTMENT" })),
      roles,
    });
  } catch (err: any) {
    console.error("[Principals Search Error]:", err);
    return res.status(500).json({ error: "Failed to search principals." });
  }
});

/**
 * GET /api/v1/files/:id/acls
 * List all direct and inherited ACL grants for a file or folder.
 */
filesRouter.get("/:id/acls", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId, userRoles, userPermissions } = getAuthContext(req);
    const { id } = req.params;

    const acls = await FileAclService.listAcls({
      fileId: id,
      tenantId: tenantId!,
      userId,
      isSuper,
      userRoles,
      userPermissions,
    });
    return res.json(acls);
  } catch (err: any) {
    console.error("[Files List Acls Error]:", err);
    return res.status(err.status || 500).json({ error: err.message || "Failed to list access list." });
  }
});

/**
 * POST /api/v1/files/:id/acls
 * Grant or update an ACL grant on a file or folder.
 */
filesRouter.post("/:id/acls", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId, userRoles, userPermissions } = getAuthContext(req);
    const { id } = req.params;
    const { principalType, principalId, permission, inherit, expiresAt, message } = req.body;

    if (!principalType || !principalId || !permission) {
      return res.status(400).json({ error: "principalType, principalId, and permission are required." });
    }

    const acl = await FileAclService.grantAcl({
      fileId: id,
      tenantId: tenantId!,
      actorId: userId,
      principalType,
      principalId,
      permission,
      inherit: inherit !== undefined ? Boolean(inherit) : true,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      message,
      isSuper,
      userRoles,
      userPermissions,
    });
    return res.status(201).json(acl);
  } catch (err: any) {
    console.error("[Files Grant Acl Error]:", err);
    return res.status(err.status || 400).json({ error: err.message || "Failed to grant access." });
  }
});

/**
 * DELETE /api/v1/files/:id/acls/:aclId
 * Revoke an ACL grant.
 */
filesRouter.delete("/:id/acls/:aclId", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId, userRoles, userPermissions } = getAuthContext(req);
    const { id, aclId } = req.params;

    const result = await FileAclService.revokeAcl({
      fileId: id,
      aclId,
      tenantId: tenantId!,
      actorId: userId,
      isSuper,
      userRoles,
      userPermissions,
    });
    return res.json(result);
  } catch (err: any) {
    console.error("[Files Revoke Acl Error]:", err);
    return res.status(err.status || 400).json({ error: err.message || "Failed to revoke access." });
  }
});

/**
 * POST /api/v1/files/:id/public-link
 * Create or replace public link for a file.
 */
filesRouter.post("/:id/public-link", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId, userRoles, userPermissions } = getAuthContext(req);
    const { id } = req.params;
    const { password, expiresAt, allowDownload } = req.body;

    const link = await FileAclService.createPublicLink({
      fileId: id,
      tenantId: tenantId!,
      actorId: userId,
      password,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      allowDownload,
      isSuper,
      userRoles,
      userPermissions,
    });
    return res.status(201).json(link);
  } catch (err: any) {
    console.error("[Files Create Public Link Error]:", err);
    return res.status(err.status || 400).json({ error: err.message || "Failed to create public link." });
  }
});

/**
 * DELETE /api/v1/files/:id/public-link
 * Revoke the active public link.
 */
filesRouter.delete("/:id/public-link", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId, userRoles, userPermissions } = getAuthContext(req);
    const { id } = req.params;

    const result = await FileAclService.revokePublicLink({
      fileId: id,
      tenantId: tenantId!,
      actorId: userId,
      isSuper,
      userRoles,
      userPermissions,
    });
    return res.json(result);
  } catch (err: any) {
    console.error("[Files Revoke Public Link Error]:", err);
    return res.status(err.status || 400).json({ error: err.message || "Failed to revoke public link." });
  }
});

// ============================================================================
// PHASE F5: SYSTEM FOLDERS & UNIVERSAL PICKER LINKING ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/files/system-folders/ensure
 * Automatically provisions canonical App Files / {Module} / {Page} hierarchy.
 */
filesRouter.post("/system-folders/ensure", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId } = getAuthContext(req);
    const targetTenantId = isSuper && req.body.tenantId ? String(req.body.tenantId) : tenantId;

    if (!targetTenantId) {
      return res.status(400).json({ error: "Tenant context is required." });
    }

    const { moduleKey, pageKey, moduleLabel, pageLabel } = req.body;
    if (!moduleKey || !pageKey) {
      return res.status(400).json({ error: "moduleKey and pageKey are required." });
    }

    const result = await SystemFolderService.ensureSystemFolder({
      tenantId: targetTenantId,
      moduleKey,
      pageKey,
      moduleLabel,
      pageLabel,
      actorId: userId,
    });

    return res.status(200).json({
      success: true,
      rootFolderId: result.rootFolder.id,
      moduleFolderId: result.moduleFolder.id,
      targetFolderId: result.targetFolder.id,
      targetFolderPath: result.targetFolder.filePath,
      targetFolder: result.targetFolder,
    });
  } catch (err: any) {
    console.error("[System Folder Ensure Error]:", err);
    return res.status(err.status || 500).json({ error: err.message || "Failed to ensure system folder." });
  }
});

/**
 * GET /api/v1/files/system-folders
 * Lists all system folders for the tenant.
 */
filesRouter.get("/system-folders", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId } = getAuthContext(req);
    const targetTenantId = isSuper && req.query.tenantId ? String(req.query.tenantId) : tenantId;

    if (!targetTenantId) {
      return res.status(400).json({ error: "Tenant context is required." });
    }

    const folders = await SystemFolderService.listSystemFolders(targetTenantId);
    return res.json({ folders });
  } catch (err: any) {
    console.error("[List System Folders Error]:", err);
    return res.status(err.status || 500).json({ error: err.message || "Failed to list system folders." });
  }
});

/**
 * POST /api/v1/files/links
 * Links a file to a business entity without duplicating bytes.
 */
filesRouter.post("/links", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId, userRoles } = getAuthContext(req);
    const targetTenantId = isSuper && req.body.tenantId ? String(req.body.tenantId) : tenantId;

    const { fileId, module, pageKey, entityType, entityId, fieldKey } = req.body;
    if (!fileId || !module || !pageKey || !entityType || !entityId || !fieldKey) {
      return res.status(400).json({
        error: "Missing required fields: fileId, module, pageKey, entityType, entityId, fieldKey.",
      });
    }

    // Verify user can access the file before linking
    await FileAclService.verifyPermission({
      fileId,
      tenantId: targetTenantId,
      userId,
      action: "view",
      isSuper,
      userRoles,
    });

    const link = await FileLinkService.createLink({
      fileId,
      tenantId: targetTenantId!,
      module,
      pageKey,
      entityType,
      entityId,
      fieldKey,
      linkedBy: userId,
    });

    return res.status(201).json({ success: true, link });
  } catch (err: any) {
    console.error("[File Link Create Error]:", err);
    return res.status(err.status || 500).json({ error: err.message || "Failed to create file link." });
  }
});

/**
 * GET /api/v1/files/links
 * Retrieves file links for an entity (e.g. ?entityType=expense_claim&entityId=123).
 */
filesRouter.get("/links", requireAuth, async (req: any, res: Response) => {
  try {
    const { entityType, entityId } = req.query;
    if (!entityType || !entityId) {
      return res.status(400).json({ error: "entityType and entityId are required." });
    }

    const links = await FileLinkService.getLinksByEntity(String(entityType), String(entityId));
    return res.json({ links });
  } catch (err: any) {
    console.error("[Get File Links Error]:", err);
    return res.status(err.status || 500).json({ error: err.message || "Failed to fetch file links." });
  }
});

/**
 * DELETE /api/v1/files/links/:id
 * Removes a file link without deleting the underlying physical file.
 */
filesRouter.delete("/links/:id", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, userId } = getAuthContext(req);
    const { id } = req.params;

    const success = await FileLinkService.removeLink(id, userId, isSuper);
    return res.json({ success });
  } catch (err: any) {
    console.error("[Delete File Link Error]:", err);
    return res.status(err.status || 500).json({ error: err.message || "Failed to delete file link." });
  }
});

/**
 * GET /api/v1/files/picker/selectable
 * Selectable candidate files for the FilePicker modal dialog.
 */
filesRouter.get("/picker/selectable", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId, userRoles, userPermissions } = getAuthContext(req);
    const accept = req.query.accept ? String(req.query.accept) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const maxSize = req.query.maxSize ? Number(req.query.maxSize) : undefined;

    // Use FilesService to list accessible files
    const result = await FilesService.listFiles({
      isSuper,
      tenantId,
      userId,
      userRoles,
      userPermissions,
      view: "my",
      search,
      trashed: false,
      limit: 100,
    });

    let files = ((result as any).items || (result as any).nodes || []).filter((n: any) => !n.isFolder && n.type !== "FOLDER");

    // Filter by MIME type if accept is provided
    if (accept && accept !== "*/*") {
      const allowedPatterns = accept.split(",").map((s) => s.trim().toLowerCase());
      files = files.filter((f: any) => {
        const mime = (f.mimeType || "").toLowerCase();
        const ext = `.${(f.extension || "").toLowerCase()}`;
        return allowedPatterns.some((pattern) => {
          if (pattern.endsWith("/*")) {
            const prefix = pattern.slice(0, -2);
            return mime.startsWith(prefix);
          }
          if (pattern.startsWith(".")) {
            return ext === pattern || f.fileName.toLowerCase().endsWith(pattern);
          }
          return mime === pattern;
        });
      });
    }

    if (maxSize && maxSize > 0) {
      files = files.filter((f: any) => Number(f.fileSize || f.sizeBytes || 0) <= maxSize);
    }

    return res.json({ files });
  } catch (err: any) {
    console.error("[File Picker Selectable Error]:", err);
    return res.status(err.status || 500).json({ error: err.message || "Failed to list selectable files." });
  }
});


// ============================================================================
// PHASE F6 ENTERPRISE CAPABILITY ENDPOINTS (TRACKS A, B, C, D)
// ============================================================================

// ----------------------------------------------------------------------------
// TRACK A: IN-BROWSER RICH PREVIEWS & VERSION-AWARE ANNOTATIONS
// ----------------------------------------------------------------------------

/**
 * GET /api/v1/files/nodes/:id/rich-preview
 * Returns safe in-browser preview data (PDF, DOCX HTML, XLSX tabular, CSV, text, images)
 * with dynamic confidential watermark tokens.
 */
filesRouter.get("/nodes/:id/rich-preview", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const { id } = req.params;
    const userEmail = req.user?.email || "user@masterhrms.local";
    const ip = req.ip || req.connection?.remoteAddress || "127.0.0.1";

    const preview = await DocumentPreviewService.generatePreview(id, tenantId, {
      userEmail,
      tenantName: (req.user as any)?.tenantName || "Enterprise Workspace",
      ip: String(ip),
    });

    return res.json(preview);
  } catch (err: any) {
    console.error("[Rich Preview Error]:", err);
    return res.status(err.status || 500).json({ error: err.message || "Failed to generate rich preview." });
  }
});

/**
 * GET /api/v1/files/nodes/:id/annotations
 * List version-aware document annotations and replies.
 */
filesRouter.get("/nodes/:id/annotations", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const { id } = req.params;
    const version = req.query.version ? parseInt(String(req.query.version), 10) : undefined;

    const annotations = await DocumentAnnotationService.getAnnotations(tenantId, id, version);
    return res.json({ annotations });
  } catch (err: any) {
    console.error("[Get Annotations Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to load annotations." });
  }
});

/**
 * POST /api/v1/files/nodes/:id/annotations
 * Add an annotation to a document page with coordinates.
 */
filesRouter.post("/nodes/:id/annotations", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId, userId } = getAuthContext(req);
    const { id } = req.params;
    const { pageNumber, coordinates, content, color, fileVersion } = req.body;

    const annotation = await DocumentAnnotationService.createAnnotation(tenantId!, userId!, {
      fileId: id,
      fileVersion,
      pageNumber,
      coordinates,
      content,
      color,
    });

    return res.status(201).json({ annotation });
  } catch (err: any) {
    console.error("[Create Annotation Error]:", err);
    return res.status(400).json({ error: err.message || "Failed to create annotation." });
  }
});

/**
 * PATCH /api/v1/files/annotations/:annotationId
 * Update annotation text, color, or status (resolve).
 */
filesRouter.patch("/annotations/:annotationId", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId, userId, isSuper } = getAuthContext(req);
    const { annotationId } = req.params;

    const updated = await DocumentAnnotationService.updateAnnotation(
      tenantId!,
      annotationId,
      userId!,
      req.body,
      isSuper
    );

    return res.json({ annotation: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to update annotation." });
  }
});

/**
 * DELETE /api/v1/files/annotations/:annotationId
 * Delete an annotation.
 */
filesRouter.delete("/annotations/:annotationId", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId, userId, isSuper } = getAuthContext(req);
    const { annotationId } = req.params;

    const result = await DocumentAnnotationService.deleteAnnotation(tenantId!, annotationId, userId!, isSuper);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to delete annotation." });
  }
});

/**
 * POST /api/v1/files/annotations/:annotationId/replies
 * Add a reply to an annotation thread.
 */
filesRouter.post("/annotations/:annotationId/replies", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId, userId } = getAuthContext(req);
    const { annotationId } = req.params;
    const { content } = req.body;

    const reply = await DocumentAnnotationService.addReply(tenantId!, annotationId, userId!, content);
    return res.status(201).json({ reply });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to add reply." });
  }
});

/**
 * DELETE /api/v1/files/annotations/replies/:replyId
 * Remove a reply.
 */
filesRouter.delete("/annotations/replies/:replyId", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId, userId, isSuper } = getAuthContext(req);
    const { replyId } = req.params;

    const result = await DocumentAnnotationService.deleteReply(tenantId!, replyId, userId!, isSuper);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to delete reply." });
  }
});

// ----------------------------------------------------------------------------
// TRACK B: MALWARE SCANNING, QUARANTINE LIFECYCLE & DLP ENGINE
// ----------------------------------------------------------------------------

/**
 * POST /api/v1/files/nodes/:id/scan
 * Trigger on-demand malware scan on a file.
 */
filesRouter.post("/nodes/:id/scan", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const { id } = req.params;
    const { engine } = req.body;

    const result = await MalwareScannerService.scanFile(id, tenantId, engine);
    return res.json({ result });
  } catch (err: any) {
    console.error("[Malware Scan Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to execute malware scan." });
  }
});

/**
 * GET /api/v1/files/security/quarantine
 * List quarantined files in the tenant.
 */
filesRouter.get("/security/quarantine", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const files = await MalwareScannerService.listQuarantinedFiles(tenantId);
    return res.json({ files });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list quarantined files." });
  }
});

/**
 * POST /api/v1/files/security/quarantine/:id/release
 * SecOps admin release of quarantined file.
 */
filesRouter.post("/security/quarantine/:id/release", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId, userId } = getAuthContext(req);
    const { id } = req.params;
    const { reason } = req.body;

    const released = await MalwareScannerService.releaseQuarantine(tenantId!, id, userId!, reason);
    return res.json({ file: released, message: "File released from quarantine." });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to release file from quarantine." });
  }
});

/**
 * DELETE /api/v1/files/security/quarantine/:id/purge
 * Permanently delete malicious infected file.
 */
filesRouter.delete("/security/quarantine/:id/purge", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId, userId } = getAuthContext(req);
    const { id } = req.params;

    const result = await MalwareScannerService.purgeQuarantinedFile(tenantId!, id, userId!);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to purge quarantined file." });
  }
});

/**
 * GET /api/v1/files/security/dlp/policies
 * List tenant DLP policies.
 */
filesRouter.get("/security/dlp/policies", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const policies = await DlpEngineService.listPolicies(tenantId!);
    return res.json({ policies });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list DLP policies." });
  }
});

/**
 * POST /api/v1/files/security/dlp/policies
 * Create a new DLP policy.
 */
filesRouter.post("/security/dlp/policies", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId, userId } = getAuthContext(req);
    const policy = await DlpEngineService.createPolicy(tenantId!, userId!, req.body);
    return res.status(201).json({ policy });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to create DLP policy." });
  }
});

/**
 * PATCH /api/v1/files/security/dlp/policies/:policyId
 * Update DLP policy.
 */
filesRouter.patch("/security/dlp/policies/:policyId", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const { policyId } = req.params;
    const policy = await DlpEngineService.updatePolicy(tenantId!, policyId, req.body);
    return res.json({ policy });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to update DLP policy." });
  }
});

/**
 * DELETE /api/v1/files/security/dlp/policies/:policyId
 * Delete DLP policy.
 */
filesRouter.delete("/security/dlp/policies/:policyId", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const { policyId } = req.params;
    await DlpEngineService.deletePolicy(tenantId!, policyId);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to delete DLP policy." });
  }
});

/**
 * GET /api/v1/files/security/dlp/findings
 * List DLP violations and findings.
 */
filesRouter.get("/security/dlp/findings", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const status = req.query.status ? String(req.query.status) : undefined;
    const findings = await DlpEngineService.listFindings(tenantId!, status);
    return res.json({ findings });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list DLP findings." });
  }
});

/**
 * POST /api/v1/files/security/dlp/findings/:findingId/review
 * Review and resolve a DLP finding.
 */
filesRouter.post("/security/dlp/findings/:findingId/review", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId, userId } = getAuthContext(req);
    const { findingId } = req.params;
    const updated = await DlpEngineService.reviewFinding(tenantId!, findingId, userId!, req.body);
    return res.json({ finding: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to review DLP finding." });
  }
});

/**
 * POST /api/v1/files/nodes/:id/dlp-scan
 * Run DLP check on file.
 */
filesRouter.post("/nodes/:id/dlp-scan", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const { id } = req.params;
    const result = await DlpEngineService.scanFile(tenantId!, id);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to run DLP scan." });
  }
});

// ----------------------------------------------------------------------------
// TRACK C: EXTERNAL CLOUD STORAGE CONNECTORS & SYNC
// ----------------------------------------------------------------------------

/**
 * GET /api/v1/files/connectors
 * List cloud storage connectors for tenant.
 */
filesRouter.get("/connectors", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const connections = await ExternalConnectorsService.listConnections(tenantId!);
    return res.json({ connections });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list connectors." });
  }
});

/**
 * POST /api/v1/files/connectors
 * Register or connect cloud storage account (Google Drive, OneDrive, Dropbox).
 */
filesRouter.post("/connectors", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId, userId } = getAuthContext(req);
    const connection = await ExternalConnectorsService.createConnection(tenantId!, userId!, req.body);
    return res.status(201).json({ connection });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to connect external storage." });
  }
});

/**
 * POST /api/v1/files/connectors/:id/test
 * Test external connector health and token validity.
 */
filesRouter.post("/connectors/:id/test", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const { id } = req.params;
    const result = await ExternalConnectorsService.testConnection(tenantId!, id);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to test connector." });
  }
});

/**
 * DELETE /api/v1/files/connectors/:id
 * Disconnect and remove external storage connector.
 */
filesRouter.delete("/connectors/:id", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const { id } = req.params;
    const result = await ExternalConnectorsService.deleteConnection(tenantId!, id);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to delete connector." });
  }
});

/**
 * GET /api/v1/files/connectors/:id/remote-files
 * List files available in the remote cloud folder.
 */
filesRouter.get("/connectors/:id/remote-files", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const { id } = req.params;
    const folderId = req.query.folderId ? String(req.query.folderId) : undefined;
    const files = await ExternalConnectorsService.listRemoteFiles(tenantId!, id, folderId);
    return res.json({ files });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list remote files." });
  }
});

/**
 * POST /api/v1/files/connectors/:id/import
 * Ingest file from remote cloud drive into MASTERHRMS file system.
 */
filesRouter.post("/connectors/:id/import", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId, userId } = getAuthContext(req);
    const { id } = req.params;
    const { remoteItem } = req.body;

    const imported = await ExternalConnectorsService.importRemoteFile(tenantId!, userId!, id, remoteItem);
    return res.status(201).json({ file: imported });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to import remote file." });
  }
});

/**
 * POST /api/v1/files/connectors/:id/sync
 * Trigger sync and return detected conflicts.
 */
filesRouter.post("/connectors/:id/sync", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId, userId } = getAuthContext(req);
    const { id } = req.params;
    const result = await ExternalConnectorsService.syncConnection(tenantId!, id, userId!);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Sync execution failed." });
  }
});

/**
 * POST /api/v1/files/connectors/conflicts/:conflictId/resolve
 * Resolve synchronization conflict.
 */
filesRouter.post("/connectors/conflicts/:conflictId/resolve", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId, userId } = getAuthContext(req);
    const { conflictId } = req.params;
    const { resolution } = req.body;

    const resolved = await ExternalConnectorsService.resolveConflict(tenantId!, conflictId, userId!, resolution);
    return res.json({ conflict: resolved });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to resolve sync conflict." });
  }
});

// ----------------------------------------------------------------------------
// TRACK D: STREAMING ARCHIVAL, BATCH OPERATIONS & WEBDAV TOKENS
// ----------------------------------------------------------------------------

/**
 * POST /api/v1/files/batch/archive
 * Direct streaming ZIP archive generation (zero-memory buffering).
 */
filesRouter.post("/batch/archive", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId, userId } = getAuthContext(req);
    const { fileIds, archiveName } = req.body;

    await StreamingArchivalService.streamZipArchive(tenantId, userId!, fileIds, res, archiveName);
  } catch (err: any) {
    console.error("[Streaming Archival Error]:", err);
    if (!res.headersSent) {
      return res.status(400).json({ error: err.message || "Failed to generate streaming archive." });
    }
  }
});

/**
 * POST /api/v1/files/batch/actions
 * Atomic multi-file batch execution (move, trash, restore, star, tag, scan)
 * with itemized partial-failure report.
 */
filesRouter.post("/batch/actions", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId, userId } = getAuthContext(req);
    const result = await BatchOperationsService.executeBatchAction(tenantId, userId!, req.body);
    return res.json(result);
  } catch (err: any) {
    console.error("[Batch Actions Error]:", err);
    return res.status(400).json({ error: err.message || "Failed to execute batch action." });
  }
});

/**
 * GET /api/v1/files/webdav/tokens
 * List active WebDAV access tokens for user.
 */
filesRouter.get("/webdav/tokens", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId, userId } = getAuthContext(req);
    const tokens = await WebdavService.listTokens(tenantId!, userId!);
    return res.json({ tokens });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list WebDAV tokens." });
  }
});

/**
 * POST /api/v1/files/webdav/tokens
 * Create new WebDAV access token.
 */
filesRouter.post("/webdav/tokens", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId, userId } = getAuthContext(req);
    const { tokenName } = req.body;
    const token = await WebdavService.createToken(tenantId!, userId!, tokenName);
    return res.status(201).json(token);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to create WebDAV token." });
  }
});

/**
 * DELETE /api/v1/files/webdav/tokens/:id
 * Revoke WebDAV token.
 */
filesRouter.delete("/webdav/tokens/:id", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId, userId } = getAuthContext(req);
    const { id } = req.params;
    await WebdavService.revokeToken(tenantId!, id, userId!);
    return res.json({ success: true, message: "Token revoked." });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "Failed to revoke token." });
  }
});
