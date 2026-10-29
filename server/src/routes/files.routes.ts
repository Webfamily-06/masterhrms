import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth } from "../middleware/auth";
import { FilesService } from "../services/files/files.service";
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
  return { isSuper, tenantId, userId };
}

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

/**
 * GET /api/v1/files
 * List files and folders with hierarchy, filtering, pagination, search, and per-user star state.
 */
filesRouter.get("/", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId } = getAuthContext(req);

    let parentId: string | null | undefined = undefined;
    if (req.query.parentId !== undefined) {
      if (req.query.parentId === "root" || req.query.parentId === "" || req.query.parentId === "null") {
        parentId = null;
      } else {
        parentId = String(req.query.parentId);
      }
    }

    const starred = req.query.starred === "true" || req.query.starred === true;
    const trashed = req.query.trashed === "true" || req.query.trashed === true;
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
    return res.status(500).json({ error: err.message || "Failed to list files." });
  }
});

/**
 * POST /api/v1/files/upload
 * Upload one or multiple files into a directory/category
 */
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

/**
 * POST /api/v1/files/folder
 * Create a new folder
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
    console.error("[Files Create Folder Error]:", err);
    return res.status(err.status || 400).json({ error: err.message || "Failed to create folder." });
  }
});

/**
 * PATCH /api/v1/files/:id/rename
 * Rename a file or folder
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
    return res.status(err.status || 400).json({ error: err.message || "Failed to rename item." });
  }
});

/**
 * PATCH /api/v1/files/:id/move
 * Move a file or folder to a different parent folder
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
    return res.status(err.status || 400).json({ error: err.message || "Failed to move item." });
  }
});

/**
 * POST /api/v1/files/:id/star
 * Toggle starred status for current user
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
    console.error("[Files Star Error]:", err);
    return res.status(err.status || 400).json({ error: err.message || "Failed to star item." });
  }
});

/**
 * POST /api/v1/files/trash
 * Soft delete items into trash
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
    console.error("[Files Trash Error]:", err);
    return res.status(err.status || 400).json({
      error: err.message || "Failed to trash items.",
      code: err.code,
      usages: err.usages,
    });
  }
});

/**
 * POST /api/v1/files/restore
 * Restore items from trash
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
    console.error("[Files Restore Error]:", err);
    return res.status(err.status || 400).json({ error: err.message || "Failed to restore items." });
  }
});

/**
 * GET /api/v1/files/:id/signed-url
 * Generate an authorized time-limited download URL
 */
filesRouter.get("/:id/signed-url", requireAuth, async (req: any, res: Response) => {
  try {
    const { tenantId, userId } = getAuthContext(req);
    const { id } = req.params;
    const expiresIn = req.query.expiresIn ? parseInt(String(req.query.expiresIn), 10) : 300;

    const signedUrl = FilesService.generateSignedDownloadUrl({
      fileId: id,
      tenantId,
      userId,
      expiresInSeconds: expiresIn,
    });

    return res.json({
      signedUrl,
      expiresInSeconds: expiresIn,
    });
  } catch (err: any) {
    console.error("[Files Signed URL Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to generate signed URL." });
  }
});

/**
 * GET /api/v1/files/:id/stream
 * Authorized file streaming: supports both standard bearer auth and signed token query parameters.
 */
filesRouter.get("/:id/stream", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await prisma.mediaFile.findUnique({
      where: { id },
    });

    if (!item || item.deletedAt) {
      return res.status(404).json({ error: "File asset not found or has been trashed." });
    }

    if (item.isFolder) {
      return res.status(400).json({ error: "Cannot download directory stream." });
    }

    // 1. Check if authenticated via signed URL query params
    const { exp, sig, uid } = req.query as { exp?: string; sig?: string; uid?: string };
    let isAuthorized = false;

    if (exp && sig && uid) {
      isAuthorized = FilesService.verifySignedToken(item.id, item.tenantId, uid, parseInt(exp, 10), sig);
      if (!isAuthorized) {
        return res.status(403).json({ error: "Invalid or expired download signature." });
      }
    } else {
      // 2. Check if authenticated via header / cookies
      let token: string | undefined;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      } else if ((req as any).cookies?.hrms_auth_token) {
        token = (req as any).cookies.hrms_auth_token;
      } else if ((req as any).cookies?.auth_token) {
        token = (req as any).cookies.auth_token;
      }

      if (!token) {
        return res.status(401).json({ error: "Authentication or valid signed URL signature required." });
      }

      const decoded = verifyToken(token);
      const userId = decoded.userId || (decoded as any).id;
      const isSuper = (decoded as any).roles?.includes("super_admin") || false;
      const userTenantId = (decoded as any).tenantId || null;

      if (!isSuper && item.tenantId && item.tenantId !== userTenantId) {
        // Check share records
        const share = await prisma.fileShare.findFirst({
          where: {
            fileId: item.id,
            sharedWith: userId,
            revokedAt: null,
          },
        });
        if (!share) {
          return res.status(403).json({ error: "Access denied to asset in another workspace." });
        }
      }
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
    readStream.pipe(res);
  } catch (err: any) {
    console.error("[Files Stream Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to stream file asset." });
  }
});

/**
 * GET /api/v1/files/:id
 * Retrieve details for a single item
 */
filesRouter.get("/:id", requireAuth, async (req: any, res: Response) => {
  try {
    const { isSuper, tenantId, userId } = getAuthContext(req);
    const { id } = req.params;

    const item = await FilesService.getItem(id, tenantId, userId, isSuper);
    return res.json(item);
  } catch (err: any) {
    console.error("[Files Get Item Error]:", err);
    return res.status(err.status || 500).json({ error: err.message || "Failed to retrieve item details." });
  }
});

/**
 * POST /api/v1/files/:id/share
 * Share a file with a user or role
 */
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

/**
 * GET /api/v1/files/:id/shares
 * List active shares for a file
 */
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

/**
 * DELETE /api/v1/files/:id/share/:shareId
 * Revoke a file share
 */
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

