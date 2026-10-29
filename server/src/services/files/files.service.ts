import fs from "fs";
import path from "path";
import crypto from "crypto";
import { rawPrisma, prisma as proxiedPrisma } from "../../prisma";
const prisma = rawPrisma || proxiedPrisma;
import { getUploadsRoot, MediaService } from "../media/media.service";
import { broadcastToTenant } from "../../socket";

const SIGNED_URL_SECRET = process.env.JWT_SECRET || "masterhrms-file-download-secret-signing-key";

export interface ListFilesOptions {
  tenantId: string | null;
  userId: string;
  isSuper?: boolean;
  parentId?: string | null;
  folder?: string;
  search?: string;
  category?: string;
  starred?: boolean;
  trashed?: boolean;
  sortBy?: "name" | "size" | "updatedAt" | "createdAt" | "type";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export class FilesService {
  /**
   * List files and folders with full tenant isolation, search, filters, pagination & per-user star attribution.
   */
  static async listFiles(options: ListFilesOptions) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const skip = (page - 1) * limit;

    const where: any = {};

    // 1. Tenant Scoping
    if (!options.isSuper) {
      if (!options.tenantId) {
        throw new Error("Tenant context is required to browse files.");
      }
      where.tenantId = options.tenantId;
    } else if (options.tenantId) {
      where.tenantId = options.tenantId;
    }

    // 2. Trash state: default to active (non-deleted) files
    if (options.trashed) {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
    }

    // 3. Parent Folder vs Category browsing
    // If browsing within a specific folder ID
    if (options.parentId !== undefined && !options.trashed && !options.starred && !options.search) {
      where.parentId = options.parentId;
    }

    // 4. Starred filter: filter to files where FileStar exists for this user
    if (options.starred) {
      where.stars = {
        some: {
          userId: options.userId,
        },
      };
    }

    // 5. Category filter
    if (options.category && options.category !== "All") {
      where.category = options.category;
    }

    // 6. Search query
    if (options.search && options.search.trim()) {
      const q = options.search.trim();
      where.OR = [
        { fileName: { contains: q, mode: "insensitive" } },
        { folder: { contains: q, mode: "insensitive" } },
        { tags: { has: q.toLowerCase() } },
      ];
    }

    // Sorting
    const orderBy: any = {};
    const orderDirection = options.sortOrder === "asc" ? "asc" : "desc";

    // Folders always precede files when sorting in directory view
    switch (options.sortBy) {
      case "name":
        orderBy.fileName = orderDirection;
        break;
      case "size":
        orderBy.fileSize = orderDirection;
        break;
      case "createdAt":
        orderBy.createdAt = orderDirection;
        break;
      case "type":
        orderBy.mimeType = orderDirection;
        break;
      case "updatedAt":
      default:
        orderBy.updatedAt = orderDirection;
        break;
    }

    const [total, rawItems] = await Promise.all([
      prisma.mediaFile.count({ where }),
      prisma.mediaFile.findMany({
        where,
        include: {
          usages: {
            select: {
              id: true,
              entityType: true,
              entityId: true,
              fieldKey: true,
            },
          },
          stars: {
            where: { userId: options.userId },
            select: { id: true },
          },
          _count: {
            select: {
              children: true,
              usages: true,
            },
          },
        },
        orderBy: [{ isFolder: "desc" }, orderBy],
        skip,
        take: limit,
      }),
    ]);

    const items = rawItems.map((item) => ({
      id: item.id,
      tenantId: item.tenantId,
      name: item.fileName,
      fileName: item.fileName,
      mimeType: item.mimeType,
      fileSize: item.fileSize,
      formattedSize: item.isFolder ? `${item._count.children} items` : FilesService.formatBytes(item.fileSize),
      url: item.url,
      filePath: item.filePath,
      folder: item.folder,
      isFolder: item.isFolder,
      parentId: item.parentId,
      category: item.category,
      isStarred: item.stars.length > 0,
      tags: item.tags,
      uploadedBy: item.uploadedBy,
      usageCount: item._count.usages,
      usages: item.usages,
      deletedAt: item.deletedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get storage usage statistics and category breakdown
   */
  static async getStats(tenantId: string | null, isSuper = false) {
    const where: any = { deletedAt: null };
    if (!isSuper) {
      where.tenantId = tenantId;
    } else if (tenantId) {
      where.tenantId = tenantId;
    }

    const [totalFiles, totalFolders, allFiles] = await Promise.all([
      prisma.mediaFile.count({ where: { ...where, isFolder: false } }),
      prisma.mediaFile.count({ where: { ...where, isFolder: true } }),
      prisma.mediaFile.findMany({
        where: { ...where, isFolder: false },
        select: { fileSize: true, category: true },
      }),
    ]);

    let totalSizeBytes = 0;
    const categorySizes: Record<string, number> = {
      Documents: 0,
      Images: 0,
      Videos: 0,
      Audio: 0,
      Archives: 0,
      Other: 0,
    };

    for (const f of allFiles) {
      totalSizeBytes += f.fileSize || 0;
      const cat = f.category && categorySizes[f.category] !== undefined ? f.category : "Documents";
      categorySizes[cat] = (categorySizes[cat] || 0) + (f.fileSize || 0);
    }

    // Default 10 GB quota per workspace
    const quotaBytes = 10 * 1024 * 1024 * 1024;
    const percentUsed = Math.min(100, Math.round((totalSizeBytes / quotaBytes) * 100));

    return {
      totalFiles,
      totalFolders,
      totalSizeBytes,
      formattedTotalSize: FilesService.formatBytes(totalSizeBytes),
      quotaBytes,
      formattedQuota: FilesService.formatBytes(quotaBytes),
      percentUsed,
      categoryBreakdown: categorySizes,
    };
  }

  /**
   * Create a new folder
   */
  static async createFolder(options: {
    tenantId: string | null;
    userId: string;
    isSuper?: boolean;
    name: string;
    parentId?: string | null;
  }) {
    const rawName = (options.name || "").trim();
    if (!rawName || rawName.length > 255) {
      throw new Error("Folder name must be between 1 and 255 characters.");
    }
    if (/[\\/:*?"<>|]/.test(rawName) || rawName.includes("..")) {
      throw new Error("Folder name contains invalid characters.");
    }

    if (!options.isSuper && !options.tenantId) {
      throw new Error("Tenant context is required to create a folder.");
    }

    // Check parent exists and belongs to same tenant
    let parentFolder = "general";
    if (options.parentId) {
      const parent = await prisma.mediaFile.findUnique({
        where: { id: options.parentId },
      });
      if (!parent || parent.deletedAt) {
        throw new Error("Parent folder does not exist.");
      }
      if (!options.isSuper && parent.tenantId !== options.tenantId) {
        throw new Error("Access denied: Parent folder belongs to another workspace.");
      }
      if (!parent.isFolder) {
        throw new Error("Target parent is a file, not a folder.");
      }
      parentFolder = `${parent.folder}/${parent.fileName}`;
    }

    // Duplicate check in same parent
    const existing = await prisma.mediaFile.findFirst({
      where: {
        tenantId: options.tenantId,
        parentId: options.parentId || null,
        fileName: rawName,
        isFolder: true,
        deletedAt: null,
      },
    });
    if (existing) {
      const err: any = new Error(`A folder named "${rawName}" already exists in this location.`);
      err.status = 409;
      throw err;
    }

    const folderRecord = await prisma.mediaFile.create({
      data: {
        tenantId: options.tenantId,
        storageDisk: "LOCAL",
        filePath: `${parentFolder}/${rawName}`,
        url: "",
        fileName: rawName,
        mimeType: "inode/directory",
        fileSize: 0,
        checksumSha: "",
        folder: parentFolder,
        tags: ["folder"],
        uploadedBy: options.userId,
        isFolder: true,
        parentId: options.parentId || null,
        category: "Folders",
      },
    });

    if (options.tenantId) {
      broadcastToTenant(options.tenantId, "file:created", {
        type: "folder",
        id: folderRecord.id,
        name: folderRecord.fileName,
        parentId: folderRecord.parentId,
      });
    }

    return folderRecord;
  }

  /**
   * Rename a file or folder
   */
  static async renameItem(options: {
    id: string;
    tenantId: string | null;
    userId: string;
    isSuper?: boolean;
    newName: string;
  }) {
    const rawName = (options.newName || "").trim();
    if (!rawName || rawName.length > 255) {
      throw new Error("Name must be between 1 and 255 characters.");
    }
    if (/[\\/:*?"<>|]/.test(rawName) || rawName.includes("..")) {
      throw new Error("Name contains invalid characters.");
    }

    const item = await prisma.mediaFile.findUnique({
      where: { id: options.id },
    });
    if (!item || item.deletedAt) {
      const err: any = new Error("File or folder not found.");
      err.status = 404;
      throw err;
    }

    if (!options.isSuper && item.tenantId !== options.tenantId) {
      const err: any = new Error("Forbidden: Access denied to asset in another workspace.");
      err.status = 403;
      throw err;
    }

    // Preserve extension if it is a file and user didn't specify extension
    let finalName = rawName;
    if (!item.isFolder) {
      const origExt = path.extname(item.fileName);
      if (origExt && !finalName.endsWith(origExt)) {
        finalName = `${finalName}${origExt}`;
      }
    }

    // Check duplicate in same parent
    const duplicate = await prisma.mediaFile.findFirst({
      where: {
        tenantId: item.tenantId,
        parentId: item.parentId,
        fileName: finalName,
        id: { not: item.id },
        deletedAt: null,
      },
    });
    if (duplicate) {
      const err: any = new Error(`An item named "${finalName}" already exists in this folder.`);
      err.status = 409;
      throw err;
    }

    const updated = await prisma.mediaFile.update({
      where: { id: item.id },
      data: {
        fileName: finalName,
        updatedAt: new Date(),
      },
    });

    if (item.tenantId) {
      broadcastToTenant(item.tenantId, "file:updated", {
        id: updated.id,
        name: updated.fileName,
        updatedAt: updated.updatedAt,
      });
    }

    return updated;
  }

  /**
   * Move file or folder to a new parent folder
   */
  static async moveItem(options: {
    id: string;
    tenantId: string | null;
    userId: string;
    isSuper?: boolean;
    targetParentId: string | null;
  }) {
    const item = await prisma.mediaFile.findUnique({
      where: { id: options.id },
    });
    if (!item || item.deletedAt) {
      const err: any = new Error("Item not found.");
      err.status = 404;
      throw err;
    }

    if (!options.isSuper && item.tenantId !== options.tenantId) {
      const err: any = new Error("Forbidden: Access denied to asset in another workspace.");
      err.status = 403;
      throw err;
    }

    // Target parent validation
    if (options.targetParentId) {
      if (options.targetParentId === item.id) {
        throw new Error("Cannot move a folder into itself.");
      }

      const target = await prisma.mediaFile.findUnique({
        where: { id: options.targetParentId },
      });
      if (!target || target.deletedAt) {
        throw new Error("Destination folder does not exist.");
      }
      if (!options.isSuper && target.tenantId !== options.tenantId) {
        throw new Error("Destination folder belongs to another workspace.");
      }
      if (!target.isFolder) {
        throw new Error("Destination target is not a folder.");
      }

      // Circular nesting check if moving a folder
      if (item.isFolder) {
        let currentParent: string | null = target.parentId;
        while (currentParent) {
          if (currentParent === item.id) {
            throw new Error("Cannot move a folder into one of its own subfolders.");
          }
          const pRecord: any = await prisma.mediaFile.findUnique({
            where: { id: currentParent },
            select: { parentId: true },
          });
          currentParent = pRecord?.parentId || null;
        }
      }
    }

    const updated = await prisma.mediaFile.update({
      where: { id: item.id },
      data: {
        parentId: options.targetParentId || null,
        updatedAt: new Date(),
      },
    });

    if (item.tenantId) {
      broadcastToTenant(item.tenantId, "file:moved", {
        id: updated.id,
        parentId: updated.parentId,
      });
    }

    return updated;
  }

  /**
   * Toggle star status for a specific user
   */
  static async toggleStar(options: {
    fileId: string;
    tenantId: string | null;
    userId: string;
    isSuper?: boolean;
  }) {
    const file = await prisma.mediaFile.findUnique({
      where: { id: options.fileId },
    });
    if (!file || file.deletedAt) {
      const err: any = new Error("File not found.");
      err.status = 404;
      throw err;
    }

    if (!options.isSuper && file.tenantId !== options.tenantId) {
      const err: any = new Error("Forbidden: Access denied.");
      err.status = 403;
      throw err;
    }

    const existingStar = await prisma.fileStar.findUnique({
      where: {
        fileId_userId: {
          fileId: options.fileId,
          userId: options.userId,
        },
      },
    });

    if (existingStar) {
      await prisma.fileStar.delete({
        where: { id: existingStar.id },
      });
      return { isStarred: false };
    } else {
      await prisma.fileStar.create({
        data: {
          fileId: options.fileId,
          userId: options.userId,
          tenantId: options.tenantId,
        },
      });
      return { isStarred: true };
    }
  }

  /**
   * Move items to trash (soft delete) with in-use safety check
   */
  static async trashItems(options: {
    ids: string[];
    tenantId: string | null;
    userId: string;
    isSuper?: boolean;
    force?: boolean;
  }) {
    const results = [];
    for (const id of options.ids) {
      const file = await prisma.mediaFile.findUnique({
        where: { id },
        include: { usages: true },
      });
      if (!file || file.deletedAt) continue;

      if (!options.isSuper && file.tenantId !== options.tenantId) {
        const err: any = new Error("Forbidden: Access denied to asset in another workspace.");
        err.status = 403;
        throw err;
      }

      // Check if file is in active use
      if (file.usages.length > 0 && !options.force) {
        const err: any = new Error(`Cannot delete "${file.fileName}": file is currently in use by ${file.usages.length} item(s).`);
        err.status = 409;
        err.code = "MEDIA_IN_USE";
        err.usages = file.usages;
        throw err;
      }

      await prisma.mediaFile.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          originalFolder: file.folder,
        },
      });
      results.push(id);
    }

    if (options.tenantId) {
      broadcastToTenant(options.tenantId, "file:trashed", { ids: results });
    }

    return { trashedCount: results.length, ids: results };
  }

  /**
   * Restore items from trash
   */
  static async restoreItems(options: {
    ids: string[];
    tenantId: string | null;
    userId: string;
    isSuper?: boolean;
  }) {
    const results = [];
    for (const id of options.ids) {
      const file = await prisma.mediaFile.findUnique({ where: { id } });
      if (!file || !file.deletedAt) continue;

      if (!options.isSuper && file.tenantId !== options.tenantId) {
        const err: any = new Error("Forbidden: Access denied.");
        err.status = 403;
        throw err;
      }

      await prisma.mediaFile.update({
        where: { id },
        data: {
          deletedAt: null,
          folder: file.originalFolder || file.folder,
        },
      });
      results.push(id);
    }

    if (options.tenantId) {
      broadcastToTenant(options.tenantId, "file:restored", { ids: results });
    }

    return { restoredCount: results.length, ids: results };
  }

  /**
   * Determine category from MIME type or file extension
   */
  static deriveCategory(mimeType: string, filename: string): string {
    const mime = (mimeType || "").toLowerCase();
    const ext = path.extname(filename || "").toLowerCase();
    if (mime.startsWith("image/") || [".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".svg"].includes(ext)) {
      return "Images";
    }
    if (mime.startsWith("video/") || [".mp4", ".webm", ".mkv", ".mov", ".avi"].includes(ext)) {
      return "Videos";
    }
    if (mime.startsWith("audio/") || [".mp3", ".wav", ".ogg", ".m4a", ".aac", ".weba"].includes(ext)) {
      return "Audio";
    }
    if (
      mime.includes("zip") ||
      mime.includes("tar") ||
      mime.includes("compressed") ||
      [".zip", ".tar", ".gz", ".7z", ".rar"].includes(ext)
    ) {
      return "Archives";
    }
    if (
      mime.includes("pdf") ||
      mime.includes("document") ||
      mime.includes("sheet") ||
      mime.includes("presentation") ||
      mime.includes("text/") ||
      mime.includes("csv") ||
      [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv"].includes(ext)
    ) {
      return "Documents";
    }
    return "Documents";
  }

  /**
   * Upload single or multiple files into File Manager
   */
  static async uploadFile(options: {
    buffer: Buffer;
    originalFilename: string;
    tenantId: string | null;
    userId: string;
    isSuper?: boolean;
    parentId?: string | null;
    folder?: string;
    tags?: string[];
    category?: string;
  }) {
    if (!options.isSuper && !options.tenantId) {
      throw new Error("Tenant context is required to upload files.");
    }

    let folderPath = options.folder || "uploads";
    if (options.parentId) {
      const parent = await prisma.mediaFile.findUnique({
        where: { id: options.parentId },
      });
      if (!parent || parent.deletedAt) {
        throw new Error("Target parent folder does not exist.");
      }
      if (!options.isSuper && parent.tenantId !== options.tenantId) {
        throw new Error("Access denied: Parent folder belongs to another workspace.");
      }
      if (!parent.isFolder) {
        throw new Error("Target parent is not a folder.");
      }
      folderPath = `${parent.folder}/${parent.fileName}`;
    }

    // Use MediaService to validate buffer and store file physically and create MediaFile record
    const mediaRecord = await MediaService.uploadMedia(options.buffer, options.originalFilename, {
      folder: folderPath,
      tags: options.tags || ["file-manager"],
      tenantId: options.tenantId,
      uploadedBy: options.userId,
    });

    const category = options.category || FilesService.deriveCategory(mediaRecord.mimeType, options.originalFilename);

    // Update parentId and category
    const updated = await prisma.mediaFile.update({
      where: { id: mediaRecord.id },
      data: {
        parentId: options.parentId || null,
        category,
      },
    });

    if (options.tenantId) {
      broadcastToTenant(options.tenantId, "file:created", {
        type: "file",
        id: updated.id,
        name: updated.fileName,
        parentId: updated.parentId,
        category: updated.category,
        url: updated.url,
      });
    }

    return {
      ...updated,
      formattedSize: FilesService.formatBytes(updated.fileSize),
      isStarred: false,
    };
  }

  /**
   * Get single file / folder metadata
   */
  static async getItem(id: string, tenantId: string | null, userId: string, isSuper = false) {
    const item = await prisma.mediaFile.findUnique({
      where: { id },
      include: {
        usages: true,
        stars: {
          where: { userId },
          select: { id: true },
        },
        shares: {
          where: { revokedAt: null },
        },
        _count: {
          select: { children: true, usages: true },
        },
      },
    });

    if (!item) {
      const err: any = new Error("Item not found.");
      err.status = 404;
      throw err;
    }

    if (!isSuper && item.tenantId && item.tenantId !== tenantId) {
      // Check if item is shared with this user or their role
      const isShared = item.shares.some((s) => s.sharedWith === userId);
      if (!isShared) {
        const err: any = new Error("Forbidden: Access denied to asset in another workspace.");
        err.status = 403;
        throw err;
      }
    }

    return {
      id: item.id,
      tenantId: item.tenantId,
      name: item.fileName,
      fileName: item.fileName,
      mimeType: item.mimeType,
      fileSize: item.fileSize,
      formattedSize: item.isFolder ? `${item._count.children} items` : FilesService.formatBytes(item.fileSize),
      url: item.url,
      filePath: item.filePath,
      folder: item.folder,
      isFolder: item.isFolder,
      parentId: item.parentId,
      category: item.category,
      isStarred: item.stars.length > 0,
      tags: item.tags,
      uploadedBy: item.uploadedBy,
      usageCount: item._count.usages,
      usages: item.usages,
      shares: item.shares,
      deletedAt: item.deletedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  /**
   * Create an ACL share for a file
   */
  static async shareItem(options: {
    fileId: string;
    tenantId: string | null;
    sharedBy: string;
    sharedWith?: string;
    sharedRole?: string;
    accessLevel?: string;
    expiresAt?: Date | null;
    isSuper?: boolean;
  }) {
    const file = await prisma.mediaFile.findUnique({
      where: { id: options.fileId },
    });
    if (!file || file.deletedAt) {
      const err: any = new Error("File not found.");
      err.status = 404;
      throw err;
    }

    if (!options.isSuper && file.tenantId !== options.tenantId) {
      const err: any = new Error("Forbidden: Access denied.");
      err.status = 403;
      throw err;
    }

    const share = await prisma.fileShare.create({
      data: {
        fileId: options.fileId,
        tenantId: options.tenantId,
        sharedWith: options.sharedWith || null,
        sharedRole: options.sharedRole || null,
        accessLevel: options.accessLevel || "view",
        sharedBy: options.sharedBy,
        expiresAt: options.expiresAt || null,
      },
    });

    if (options.tenantId) {
      broadcastToTenant(options.tenantId, "file:shared", {
        fileId: file.id,
        shareId: share.id,
        sharedWith: share.sharedWith,
      });
    }

    return share;
  }

  /**
   * List active shares for a file
   */
  static async listShares(fileId: string, tenantId: string | null, isSuper = false) {
    const file = await prisma.mediaFile.findUnique({ where: { id: fileId } });
    if (!file) throw new Error("File not found");
    if (!isSuper && file.tenantId !== tenantId) throw new Error("Forbidden");

    return prisma.fileShare.findMany({
      where: {
        fileId,
        revokedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Revoke an active share
   */
  static async revokeShare(shareId: string, tenantId: string | null, isSuper = false) {
    const share = await prisma.fileShare.findUnique({ where: { id: shareId } });
    if (!share) throw new Error("Share not found");
    if (!isSuper && share.tenantId !== tenantId) throw new Error("Forbidden");

    return prisma.fileShare.update({
      where: { id: shareId },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Generate an authorized short-lived download/preview token
   */
  static generateSignedDownloadUrl(options: {
    fileId: string;
    tenantId: string | null;
    userId: string;
    expiresInSeconds?: number;
  }): string {
    const exp = Math.floor(Date.now() / 1000) + (options.expiresInSeconds || 300); // 5 min default
    const payload = `${options.fileId}:${options.tenantId || "null"}:${options.userId}:${exp}`;
    const sig = crypto.createHmac("sha256", SIGNED_URL_SECRET).update(payload).digest("hex");
    return `/api/v1/files/${options.fileId}/stream?exp=${exp}&sig=${sig}&uid=${options.userId}`;
  }

  /**
   * Verify short-lived download token signature and expiry
   */
  static verifySignedToken(fileId: string, tenantId: string | null, userId: string, exp: number, sig: string): boolean {
    if (Math.floor(Date.now() / 1000) > exp) {
      return false; // Expired
    }
    const payload = `${fileId}:${tenantId || "null"}:${userId}:${exp}`;
    const expectedSig = crypto.createHmac("sha256", SIGNED_URL_SECRET).update(payload).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expectedSig, "hex"));
  }

  /**
   * Format byte sizes cleanly
   */
  static formatBytes(bytes: number, decimals = 1): string {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }
}
