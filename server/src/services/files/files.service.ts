import { FileAclService } from "./file-acl.service";
import path from "path";
import crypto from "crypto";
import { rawPrisma, prisma as proxiedPrisma } from "../../prisma";
const prisma = rawPrisma || proxiedPrisma;
import { getUploadsRoot, MediaService } from "../media/media.service";
import { broadcastToTenant } from "../../socket";
import { FileInvariantsService } from "./file-invariants.service";
import { QuotaService } from "./quota.service";
import { QuotaGovernanceService } from "./quota-governance.service";
import { StorageProviderFactory } from "../storage/storage-provider.factory";
import { OutboxService } from "../outbox.service";

const SIGNED_URL_SECRET = process.env.JWT_SECRET || "masterhrms-file-download-secret-signing-key";

export interface ListFilesOptions {
  tenantId: string | null;
  userId: string;
  isSuper?: boolean;
  userRoles?: string[];
  userPermissions?: string[];
  view?: "my" | "shared-with-me" | "trash" | "org";
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
   * List files and folders with full tenant isolation, view filtering,
   * search, pagination, and Windows Explorer sorting (folders first).
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
    } else {
      // Super Admin viewing platform media repository (Strict Isolation: tenantId = NULL)
      where.tenantId = null;
    }

    const view = options.view || "my";

    // 2. View-specific scoping & Privacy by Default
    if (view === "trash" || options.trashed) {
      where.OR = [{ status: "TRASHED" }, { deletedAt: { not: null } }];
    } else {
      where.status = { not: "TRASHED" };
      where.deletedAt = null;

      if (view === "my") {
        where.OR = [
          { ownerId: options.userId },
          { uploadedBy: options.userId },
          { isFolder: true, parentId: options.parentId || null },
        ];
      } else if (view === "shared-with-me" || options.category === "Shared") {
        const [teamMembers, employee] = await Promise.all([
          prisma.fileTeamMember.findMany({
            where: { userId: options.userId },
            select: { teamId: true },
          }),
          prisma.employee.findFirst({
            where: { userId: options.userId, tenantId: options.tenantId || undefined },
            select: { departmentId: true },
          }),
        ]);
        const teamIds = teamMembers.map((m: any) => m.teamId);
        const deptId = employee?.departmentId;

        where.OR = [
          {
            shares: {
              some: {
                sharedWith: options.userId,
                revokedAt: null,
              },
            },
          },
          {
            acls: {
              some: {
                AND: [
                  {
                    OR: [
                      { principalType: "USER", principalId: options.userId },
                      ...(teamIds.length > 0 ? [{ principalType: "TEAM", principalId: { in: teamIds } }] : []),
                      ...(deptId ? [{ principalType: "DEPARTMENT", principalId: deptId }] : []),
                      ...(options.userRoles?.length ? [{ principalType: "ROLE", principalId: { in: options.userRoles } }] : []),
                    ],
                  },
                  {
                    OR: [
                      { expiresAt: null },
                      { expiresAt: { gt: new Date() } },
                    ],
                  },
                ],
              },
            },
          },
        ];
      } else if (options.category === "Team" || options.category === "Teams") {
        const teamMembers = await prisma.fileTeamMember.findMany({
          where: { userId: options.userId },
          select: { teamId: true },
        });
        const teamIds = teamMembers.map((m: any) => m.teamId);

        where.OR = [
          { category: "Team" },
          { ownerType: "TEAM" },
          ...(teamIds.length > 0 ? [{ ownerId: { in: teamIds } }] : []),
        ];
      } else if (view === "org") {
        // Tenant Admin or explicit files.admin.view_all permission required
        const isTenantAdmin =
          options.userRoles?.includes("tenant_admin") ||
          options.userRoles?.includes("admin") ||
          options.isSuper;
        const hasAdminPermission =
          isTenantAdmin || options.userPermissions?.includes("files.admin.view_all");

        if (!hasAdminPermission) {
          const err: any = new Error(
            "Access denied: Organization-wide file view requires Tenant Administrator or files.admin.view_all privileges."
          );
          err.status = 403;
          throw err;
        }

        // Privacy by Default: Exclude private direct-message attachments from general organization browsing
        where.NOT = [
          {
            AND: [
              { folder: { contains: "Direct Conversations", mode: "insensitive" } },
              { ownerId: { not: options.userId } },
              { uploadedBy: { not: options.userId } }
            ]
          }
        ];

        // Audited access
        if (options.tenantId) {
          await prisma.fileActivity.create({
            data: {
              fileId: options.parentId || "root",
              tenantId: options.tenantId,
              actorId: options.userId,
              action: "ORG_VIEW_ACCESSED",
              metaJson: {
                timestamp: new Date().toISOString(),
                parentId: options.parentId || "root",
              },
            },
          });
        }
      }
    }

    // 3. Parent Folder browsing & Folder/Chat filtering
    if (options.category === "Chat") {
      where.folder = { contains: "Organization Chat", mode: "insensitive" };
      where.isFolder = false;
    } else if (options.folder) {
      where.folder = { contains: options.folder, mode: "insensitive" };
    } else if (options.parentId !== undefined && !options.trashed && view !== "trash" && view !== "shared-with-me" && options.category !== "Shared" && !options.search) {
      where.parentId = options.parentId;
    }

    // 4. Starred filter
    if (options.starred) {
      where.stars = {
        some: {
          userId: options.userId,
        },
      };
    }

    // 5. Category filter
    if (options.category && options.category !== "All" && options.category !== "Shared" && options.category !== "Teams" && options.category !== "Team" && options.category !== "Chat") {
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

    // 7. Sorting
    const orderBy: any = {};
    const orderDirection = options.sortOrder === "asc" ? "asc" : "desc";

    switch (options.sortBy) {
      case "name":
        orderBy.nameKey = orderDirection;
        break;
      case "size":
        orderBy.fileSize = orderDirection;
        break;
      case "createdAt":
        orderBy.createdAt = orderDirection;
        break;
      case "type":
        orderBy.type = orderDirection;
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
          versions: {
            orderBy: { versionNo: "desc" },
            take: 1,
          },
          fileLinks: true,
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
              fileLinks: true,
              versions: true,
            },
          },
        },
        orderBy: [{ isFolder: "desc" }, orderBy],
        skip,
        take: limit,
      }),
    ]);

    const items = rawItems.map((item: any) => {
      const isFolder = item.isFolder || item.type === "FOLDER";
      return {
        id: item.id,
        tenantId: item.tenantId,
        name: item.fileName,
        fileName: item.fileName,
        extension: item.extension,
        type: item.type || (isFolder ? "FOLDER" : "FILE"),
        ownerType: item.ownerType,
        ownerId: item.ownerId,
        mimeType: item.mimeType,
        fileSize: item.fileSize,
        formattedSize: isFolder ? `${item._count.children} items` : FilesService.formatBytes(item.fileSize),
        url: item.url,
        filePath: item.filePath,
        folder: item.folder,
        isFolder,
        parentId: item.parentId,
        materializedPath: item.materializedPath,
        depth: item.depth,
        category: item.category,
        isStarred: item.stars.length > 0,
        tags: item.tags,
        status: item.status,
        version: item.version,
        currentVersionId: item.currentVersionId,
        uploadedBy: item.uploadedBy,
        usageCount: item._count.usages + item._count.fileLinks,
        usages: item.usages,
        links: item.fileLinks,
        userPermission: item.ownerId === options.userId || !item.tenantId ? "OWNER" : (options.isSuper ? "OWNER" : "VIEWER"),
        trashedAt: item.trashedAt || item.deletedAt,
        deletedAt: item.deletedAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });

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
   * Retrieves breadcrumb ancestry from root to the given node.
   */
  static async getBreadcrumbPath(nodeId: string, tenantId: string | null) {
    const node = await prisma.mediaFile.findUnique({
      where: { id: nodeId },
    });

    if (!node) {
      const err: any = new Error("Item not found.");
      err.status = 404;
      throw err;
    }

    if (tenantId && node.tenantId && node.tenantId !== tenantId) {
      const err: any = new Error("Item not found.");
      err.status = 404;
      throw err;
    }

    const pathParts = (node.materializedPath || `/${node.id}`).split("/").filter(Boolean);
    const ancestors = await prisma.mediaFile.findMany({
      where: { id: { in: pathParts } },
      select: { id: true, fileName: true, type: true, isFolder: true, parentId: true },
    });

    const ancestorMap = new Map(ancestors.map((a) => [a.id, a]));
    const crumbs = pathParts
      .map((id) => ancestorMap.get(id))
      .filter(Boolean)
      .map((item) => ({
        id: item!.id,
        name: item!.fileName,
        type: item!.type || (item!.isFolder ? "FOLDER" : "FILE"),
        parentId: item!.parentId,
      }));

    return crumbs;
  }

  /**
   * Get storage usage statistics and category breakdown
   */
  static async getStats(tenantId: string | null, isSuper = false) {
    const where: any = { deletedAt: null, status: "ACTIVE" };
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
      const size = Number(f.fileSize || 0);
      totalSizeBytes += size;
      const cat = f.category && categorySizes[f.category] !== undefined ? f.category : "Documents";
      categorySizes[cat] = (categorySizes[cat] || 0) + size;
    }

    const quotaBytes = Number(await QuotaService.getTenantQuotaBytes(tenantId));
    const percentUsed = quotaBytes > 0
      ? Math.min(100, parseFloat(((totalSizeBytes / quotaBytes) * 100).toFixed(1)))
      : 0;
    const lifecycleState = QuotaGovernanceService.resolveThresholdLevel(percentUsed);

    return {
      totalFiles,
      totalFolders,
      totalSizeBytes,
      formattedTotalSize: FilesService.formatBytes(totalSizeBytes),
      quotaBytes,
      formattedQuota: FilesService.formatBytes(quotaBytes),
      percentUsed,
      lifecycleState,
      thresholdState: lifecycleState,
      categoryBreakdown: categorySizes,
    };
  }

  /**
   * Create a new folder with Windows Explorer naming rules and sibling uniqueness.
   */
  static async createFolder(options: {
    tenantId: string | null;
    userId: string;
    isSuper?: boolean;
    name: string;
    parentId?: string | null;
  }) {
    // 1. Validate Windows folder name
    const validation = FileInvariantsService.validateFileName(options.name);
    if (!validation.isValid) {
      const err: any = new Error(validation.error);
      err.code = validation.code;
      err.status = 400;
      throw err;
    }

    const rawName = options.name.trim();
    const nameKey = FileInvariantsService.computeNameKey(rawName);

    if (!options.isSuper && !options.tenantId) {
      throw new Error("Tenant context is required to create a folder.");
    }

    // 2. Validate Parent Folder
    let parentFolder = "general";
    let materializedPath = "";
    let depth = 0;

    if (options.parentId) {
      const parent = await prisma.mediaFile.findUnique({
        where: { id: options.parentId },
      });
      if (!parent || parent.deletedAt || parent.status === "TRASHED") {
        throw new Error("Parent folder does not exist or has been trashed.");
      }
      if (!options.isSuper && parent.tenantId !== options.tenantId) {
        throw new Error("Access denied: Parent folder belongs to another workspace.");
      }
      if (!parent.isFolder && parent.type !== "FOLDER") {
        throw new Error("Target parent is a file, not a folder.");
      }
      parentFolder = `${parent.folder}/${parent.fileName}`;
      materializedPath = parent.materializedPath || `/${parent.id}`;
      depth = (parent.depth || 0) + 1;
    }

    const folderId = crypto.randomUUID();
    const finalMaterializedPath = materializedPath ? `${materializedPath}/${folderId}` : `/${folderId}`;

    // 3. Atomically check sibling uniqueness & create folder
    const folderRecord = await prisma.$transaction(async (tx) => {
      await FileInvariantsService.assertSiblingUniqueness(
        tx,
        options.tenantId,
        options.parentId || null,
        nameKey
      );

      const created = await tx.mediaFile.create({
        data: {
          id: folderId,
          tenantId: options.tenantId,
          nameKey,
          fileName: rawName,
          mimeType: "inode/directory",
          fileSize: 0,
          filePath: `${parentFolder}/${rawName}`,
          url: "",
          checksumSha: "",
          folder: parentFolder,
          tags: ["folder"],
          uploadedBy: options.userId,
          ownerType: options.tenantId ? "USER" : "SYSTEM",
          ownerId: options.userId,
          type: "FOLDER",
          status: "ACTIVE",
          isFolder: true,
          parentId: options.parentId || null,
          materializedPath: finalMaterializedPath,
          depth,
          category: "Folders",
        },
      });

      if (options.tenantId) {
        await OutboxService.createOutboxEvent(
          {
            tenantId: options.tenantId,
            eventType: "file.created",
            entityType: "MediaFile",
            entityId: created.id,
            actorId: options.userId,
            payload: {
              id: created.id,
              name: created.fileName,
              type: "FOLDER",
              parentId: created.parentId,
            },
          },
          tx
        );
      }

      return created;
    });

    if (options.tenantId) {
      try {
        broadcastToTenant(options.tenantId, "file:created", {
          type: "folder",
          id: folderRecord.id,
          name: folderRecord.fileName,
          parentId: folderRecord.parentId,
        });
      } catch {}
    }

    return folderRecord;
  }

  /**
   * Rename a file or folder with Windows Explorer naming rules and system folder protection.
   */
  static async renameItem(options: {
    id: string;
    tenantId: string | null;
    userId: string;
    isSuper?: boolean;
    newName: string;
  }) {
    // 1. Validate Windows filename
    const validation = FileInvariantsService.validateFileName(options.newName);
    if (!validation.isValid) {
      const err: any = new Error(validation.error);
      err.code = validation.code;
      err.status = 400;
      throw err;
    }

    const rawName = options.newName.trim();
    const nameKey = FileInvariantsService.computeNameKey(rawName);

    const item = await prisma.mediaFile.findUnique({
      where: { id: options.id },
    });
    if (!item || item.deletedAt || item.status === "TRASHED") {
      const err: any = new Error("File or folder not found.");
      err.status = 404;
      throw err;
    }

    if (!options.isSuper && item.tenantId !== options.tenantId) {
      const err: any = new Error("Forbidden: Access denied to asset in another workspace.");
      err.status = 403;
      throw err;
    }

    if (item.systemModule || item.systemPage) {
      const err: any = new Error("System folders and files cannot be renamed.");
      err.status = 403;
      throw err;
    }

    // Preserve extension if file and user omitted it
    let finalName = rawName;
    if (!item.isFolder && item.type !== "FOLDER") {
      const origExt = path.extname(item.fileName);
      if (origExt && !finalName.toLowerCase().endsWith(origExt.toLowerCase())) {
        finalName = `${finalName}${origExt}`;
      }
    }
    const finalNameKey = FileInvariantsService.computeNameKey(finalName);
    const newExt = path.extname(finalName).replace(".", "").toLowerCase();

    const updated = await prisma.$transaction(async (tx) => {
      // Sibling uniqueness check
      await FileInvariantsService.assertSiblingUniqueness(
        tx,
        item.tenantId,
        item.parentId,
        finalNameKey,
        item.id
      );

      const res = await tx.mediaFile.update({
        where: { id: item.id },
        data: {
          fileName: finalName,
          nameKey: finalNameKey,
          extension: newExt,
          updatedAt: new Date(),
        },
      });

      if (item.tenantId) {
        await OutboxService.createOutboxEvent(
          {
            tenantId: item.tenantId,
            eventType: "file.updated",
            entityType: "MediaFile",
            entityId: item.id,
            actorId: options.userId,
            payload: {
              id: item.id,
              fileName: finalName,
              action: "rename",
            },
          },
          tx
        );
      }

      return res;
    });

    if (item.tenantId) {
      try {
        broadcastToTenant(item.tenantId, "file:updated", {
          id: updated.id,
          name: updated.fileName,
          updatedAt: updated.updatedAt,
        });
      } catch {}
    }

    return updated;
  }

  /**
   * Move file or folder to a new parent folder with cycle prevention and depth checking.
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
    if (!item || item.deletedAt || item.status === "TRASHED") {
      const err: any = new Error("Item not found.");
      err.status = 404;
      throw err;
    }

    if (!options.isSuper && item.tenantId !== options.tenantId) {
      const err: any = new Error("Forbidden: Access denied to asset in another workspace.");
      err.status = 403;
      throw err;
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Hierarchy move invariants & cycle prevention
      const { newMaterializedPath, newDepth } = await FileInvariantsService.assertValidMove(
        tx,
        item.id,
        options.targetParentId
      );

      // 2. Sibling uniqueness check in destination
      await FileInvariantsService.assertSiblingUniqueness(
        tx,
        item.tenantId,
        options.targetParentId,
        item.nameKey || FileInvariantsService.computeNameKey(item.fileName),
        item.id
      );

      const oldPath = item.materializedPath || `/${item.id}`;
      const depthDiff = newDepth - (item.depth || 0);

      // 3. Update node
      const movedNode = await tx.mediaFile.update({
        where: { id: item.id },
        data: {
          parentId: options.targetParentId || null,
          materializedPath: newMaterializedPath,
          depth: newDepth,
          updatedAt: new Date(),
        },
      });

      // 4. If folder, update all descendant materializedPaths recursively
      if (item.isFolder || item.type === "FOLDER") {
        await FileInvariantsService.updateDescendantPaths(
          tx,
          item.id,
          oldPath,
          newMaterializedPath,
          depthDiff
        );
      }

      // 5. Outbox Event
      if (item.tenantId) {
        await OutboxService.createOutboxEvent(
          {
            tenantId: item.tenantId,
            eventType: "file.moved",
            entityType: "MediaFile",
            entityId: item.id,
            actorId: options.userId,
            payload: {
              id: item.id,
              targetParentId: options.targetParentId,
              materializedPath: newMaterializedPath,
            },
          },
          tx
        );
      }

      return movedNode;
    });

    if (item.tenantId) {
      try {
        broadcastToTenant(item.tenantId, "file:moved", {
          id: updated.id,
          parentId: updated.parentId,
        });
      } catch {}
    }

    return updated;
  }

  /**
   * Toggle star status for a specific user.
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
    if (!file || file.deletedAt || file.status === "TRASHED") {
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

      // Update FileRecent
      if (options.tenantId) {
        await prisma.fileRecent.upsert({
          where: {
            userId_fileId: {
              userId: options.userId,
              fileId: options.fileId,
            },
          },
          create: {
            fileId: options.fileId,
            userId: options.userId,
            tenantId: options.tenantId,
            accessedAt: new Date(),
          },
          update: {
            accessedAt: new Date(),
          },
        });
      }

      return { isStarred: true };
    }
  }

  /**
   * Soft delete items to Trash with cascading child updates and quota accounting.
   */
  static async trashItems(options: {
    ids: string[];
    tenantId: string | null;
    userId: string;
    isSuper?: boolean;
    force?: boolean;
  }) {
    const results: string[] = [];

    for (const id of options.ids) {
      const file = await prisma.mediaFile.findUnique({
        where: { id },
        include: { usages: true, fileLinks: true },
      });
      if (!file || file.deletedAt || file.status === "TRASHED") continue;

      if (!options.isSuper && file.tenantId !== options.tenantId) {
        const err: any = new Error("Forbidden: Access denied to asset in another workspace.");
        err.status = 403;
        throw err;
      }

      if (file.systemModule || file.systemPage) {
        const err: any = new Error("System folders and files cannot be moved to trash.");
        err.status = 403;
        throw err;
      }

      // Check if file is in active use
      const totalLinks = file.usages.length + file.fileLinks.length;
      if (totalLinks > 0 && !options.force) {
        const err: any = new Error(
          `Cannot delete "${file.fileName}": file is currently in use by ${totalLinks} item(s).`
        );
        err.status = 409;
        err.code = "MEDIA_IN_USE";
        err.usages = file.usages;
        err.fileLinks = file.fileLinks;
        throw err;
      }

      await prisma.$transaction(async (tx) => {
        // Soft delete target
        await tx.mediaFile.update({
          where: { id },
          data: {
            status: "TRASHED",
            deletedAt: new Date(),
            trashedAt: new Date(),
            trashedBy: options.userId,
            originalFolder: file.folder,
            originalParentId: file.parentId,
          },
        });

        // Quota adjustment
        if (!file.isFolder && file.type !== "FOLDER") {
          await QuotaService.trashFileBytes(
            tx,
            file.tenantId,
            file.ownerId || options.userId,
            file.fileSize || 0
          );
        }

        // If folder, cascade to descendants
        if (file.isFolder || file.type === "FOLDER") {
          const folderPath = file.materializedPath || `/${file.id}`;
          const descendants = await tx.mediaFile.findMany({
            where: {
              materializedPath: { startsWith: `${folderPath}/` },
              status: "ACTIVE",
            },
          });

          for (const desc of descendants) {
            await tx.mediaFile.update({
              where: { id: desc.id },
              data: {
                status: "TRASHED",
                deletedAt: new Date(),
                trashedAt: new Date(),
                trashedBy: options.userId,
                trashedByCascade: true,
              },
            });

            if (!desc.isFolder && desc.type !== "FOLDER") {
              await QuotaService.trashFileBytes(
                tx,
                desc.tenantId,
                desc.ownerId || options.userId,
                desc.fileSize || 0
              );
            }
          }
        }

        // Outbox event
        if (file.tenantId) {
          await OutboxService.createOutboxEvent(
            {
              tenantId: file.tenantId,
              eventType: "file.trashed",
              entityType: "MediaFile",
              entityId: file.id,
              actorId: options.userId,
              payload: { id: file.id, fileName: file.fileName },
            },
            tx
          );
        }
      });

      results.push(id);
    }

    if (options.tenantId) {
      try {
        broadcastToTenant(options.tenantId, "file:trashed", { ids: results });
      } catch {}
    }

    return { trashedCount: results.length, ids: results };
  }

  /**
   * Restore items from Trash with cascaded descendant restoration.
   */
  static async restoreItems(options: {
    ids: string[];
    tenantId: string | null;
    userId: string;
    isSuper?: boolean;
  }) {
    const results: string[] = [];

    for (const id of options.ids) {
      const file = await prisma.mediaFile.findUnique({ where: { id } });
      if (!file || (file.status !== "TRASHED" && !file.deletedAt)) continue;

      if (!options.isSuper && file.tenantId !== options.tenantId) {
        const err: any = new Error("Forbidden: Access denied.");
        err.status = 403;
        throw err;
      }

      await prisma.$transaction(async (tx) => {
        await tx.mediaFile.update({
          where: { id },
          data: {
            status: "ACTIVE",
            deletedAt: null,
            trashedAt: null,
            trashedBy: null,
            trashedByCascade: false,
            parentId: file.originalParentId || file.parentId,
            folder: file.originalFolder || file.folder,
          },
        });

        // Quota adjustment
        if (!file.isFolder && file.type !== "FOLDER") {
          await QuotaService.restoreFileBytes(
            tx,
            file.tenantId,
            file.ownerId || options.userId,
            file.fileSize || 0
          );
        }

        // If folder, restore cascaded descendants
        if (file.isFolder || file.type === "FOLDER") {
          const folderPath = file.materializedPath || `/${file.id}`;
          const descendants = await tx.mediaFile.findMany({
            where: {
              materializedPath: { startsWith: `${folderPath}/` },
              trashedByCascade: true,
            },
          });

          for (const desc of descendants) {
            await tx.mediaFile.update({
              where: { id: desc.id },
              data: {
                status: "ACTIVE",
                deletedAt: null,
                trashedAt: null,
                trashedBy: null,
                trashedByCascade: false,
              },
            });

            if (!desc.isFolder && desc.type !== "FOLDER") {
              await QuotaService.restoreFileBytes(
                tx,
                desc.tenantId,
                desc.ownerId || options.userId,
                desc.fileSize || 0
              );
            }
          }
        }

        // Outbox event
        if (file.tenantId) {
          await OutboxService.createOutboxEvent(
            {
              tenantId: file.tenantId,
              eventType: "file.restored",
              entityType: "MediaFile",
              entityId: file.id,
              actorId: options.userId,
              payload: { id: file.id, fileName: file.fileName },
            },
            tx
          );
        }
      });

      results.push(id);
    }

    if (options.tenantId) {
      try {
        broadcastToTenant(options.tenantId, "file:restored", { ids: results });
      } catch {}
    }

    return { restoredCount: results.length, ids: results };
  }

  /**
   * Permanently purge a file or folder and its physical versions from object storage.
   */
  static async deleteItemPermanently(options: {
    id: string;
    tenantId: string | null;
    userId: string;
    isSuper?: boolean;
  }) {
    const file = await prisma.mediaFile.findUnique({
      where: { id: options.id },
      include: { versions: true, fileLinks: true, usages: true },
    });

    if (!file) {
      const err: any = new Error("File or folder not found.");
      err.status = 404;
      throw err;
    }

    if (!options.isSuper && file.tenantId !== options.tenantId) {
      const err: any = new Error("File not found.");
      err.status = 404;
      throw err;
    }

    // Protection Guard: Block deletion if file is under active legal hold
    const activeHold = await (prisma as any).storageLegalHold?.findFirst({
      where: { fileId: file.id, releasedAt: null },
    });
    if (activeHold) {
      const err: any = new Error(
        `Cannot delete "${file.fileName}": file is protected by active Legal Hold "${activeHold.reason}".`
      );
      err.status = 403;
      err.code = "LEGAL_HOLD_ACTIVE";
      throw err;
    }

    const storageProvider = StorageProviderFactory.getProvider();
    const isFromTrash = file.status === "TRASHED" || !!file.deletedAt;

    await prisma.$transaction(async (tx) => {
      // 1. Delete versions from object storage
      for (const version of file.versions) {
        if (version.storageKey) {
          try {
            await storageProvider.deleteObject(version.storageKey);
          } catch (e) {
            console.warn(`[DeletePermanent] Failed to purge storage key: ${version.storageKey}`, e);
          }
        }
      }

      // 2. Adjust quota bytes
      if (!file.isFolder && file.type !== "FOLDER") {
        await QuotaService.purgeFileBytes(
          tx,
          file.tenantId,
          file.ownerId || options.userId,
          file.fileSize || 0,
          isFromTrash
        );
      }

      // 3. Delete DB records
      await tx.fileLink.deleteMany({ where: { fileId: file.id } });
      await tx.mediaUsage.deleteMany({ where: { mediaId: file.id } });
      await tx.fileStar.deleteMany({ where: { fileId: file.id } });
      await tx.fileAcl.deleteMany({ where: { fileId: file.id } });
      await tx.fileShare.deleteMany({ where: { fileId: file.id } });
      await tx.fileRecent.deleteMany({ where: { fileId: file.id } });
      await tx.fileActivity.deleteMany({ where: { fileId: file.id } });
      await tx.fileVersion.deleteMany({ where: { fileId: file.id } });
      await tx.mediaFile.delete({ where: { id: file.id } });

      // 4. Outbox event
      if (file.tenantId) {
        await OutboxService.createOutboxEvent(
          {
            tenantId: file.tenantId,
            eventType: "file.deleted",
            entityType: "MediaFile",
            entityId: file.id,
            actorId: options.userId,
            payload: { id: file.id, fileName: file.fileName },
          },
          tx
        );
      }
    });

    if (file.tenantId) {
      try {
        broadcastToTenant(file.tenantId, "file:deleted", { id: file.id });
      } catch {}
    }

    return { success: true, id: file.id, message: "Item permanently deleted." };
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
   * Fallback multipart upload for small files or legacy callers.
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

    // Windows filename check
    const validation = FileInvariantsService.validateFileName(options.originalFilename);
    if (!validation.isValid) {
      const err: any = new Error(validation.error);
      err.code = validation.code;
      err.status = 400;
      throw err;
    }

    let folderPath = options.folder || "uploads";
    let materializedPath = "";
    let depth = 0;

    if (options.parentId) {
      const parent = await prisma.mediaFile.findUnique({
        where: { id: options.parentId },
      });
      if (!parent || parent.deletedAt || parent.status === "TRASHED") {
        throw new Error("Target parent folder does not exist.");
      }
      if (!options.isSuper && parent.tenantId !== options.tenantId) {
        throw new Error("Access denied: Parent folder belongs to another workspace.");
      }
      if (!parent.isFolder && parent.type !== "FOLDER") {
        throw new Error("Target parent is not a folder.");
      }
      folderPath = `${parent.folder}/${parent.fileName}`;
      materializedPath = parent.materializedPath || `/${parent.id}`;
      depth = (parent.depth || 0) + 1;
    }

    const nameKey = FileInvariantsService.computeNameKey(options.originalFilename);
    const ext = path.extname(options.originalFilename).replace(".", "").toLowerCase();

    // Check quota reservation
    await prisma.$transaction(async (tx) => {
      await FileInvariantsService.assertSiblingUniqueness(
        tx,
        options.tenantId,
        options.parentId || null,
        nameKey
      );
      await QuotaService.reserveUploadBytes(tx, options.tenantId, options.userId, options.buffer.length);
    });

    try {
      // Store file physically
      const mediaRecord = await MediaService.uploadMedia(options.buffer, options.originalFilename, {
        folder: folderPath,
        tags: options.tags || ["file-manager"],
        tenantId: options.tenantId,
        uploadedBy: options.userId,
      });

      const category =
        options.category || FilesService.deriveCategory(mediaRecord.mimeType, options.originalFilename);
      const finalMaterializedPath = materializedPath
        ? `${materializedPath}/${mediaRecord.id}`
        : `/${mediaRecord.id}`;

      // In transaction: commit quota and update record
      const finalFile = await prisma.$transaction(async (tx) => {
        // Create initial FileVersion
        const version = await tx.fileVersion.create({
          data: {
            fileId: mediaRecord.id,
            versionNo: 1,
            storageKey: mediaRecord.filePath,
            sizeBytes: BigInt(mediaRecord.fileSize),
            checksum: mediaRecord.checksumSha || null,
            createdBy: options.userId,
            isCurrent: true,
          },
        });

        // Update MediaFile with F1 fields
        const updated = await tx.mediaFile.update({
          where: { id: mediaRecord.id },
          data: {
            nameKey,
            extension: ext,
            type: "FILE",
            ownerType: options.tenantId ? "USER" : "SYSTEM",
            ownerId: options.userId,
            status: "ACTIVE",
            parentId: options.parentId || null,
            materializedPath: finalMaterializedPath,
            depth,
            category,
            currentVersionId: version.id,
            version: 1,
          },
        });

        // Commit quota bytes
        await QuotaService.commitUploadBytes(
          tx,
          options.tenantId,
          options.userId,
          mediaRecord.fileSize
        );

        if (options.tenantId) {
          await OutboxService.createOutboxEvent(
            {
              tenantId: options.tenantId,
              eventType: "file.created",
              entityType: "MediaFile",
              entityId: updated.id,
              actorId: options.userId,
              payload: {
                id: updated.id,
                fileName: updated.fileName,
                sizeBytes: updated.fileSize,
              },
            },
            tx
          );
        }

        return updated;
      });

      if (options.tenantId) {
        try {
          broadcastToTenant(options.tenantId, "file:created", {
            type: "file",
            id: finalFile.id,
            name: finalFile.fileName,
            parentId: finalFile.parentId,
            category: finalFile.category,
            url: finalFile.url,
          });
        } catch {}
      }

      return {
        ...finalFile,
        formattedSize: FilesService.formatBytes(finalFile.fileSize),
        isStarred: false,
      };
    } catch (err) {
      // Release reservation on failure
      await prisma.$transaction(async (tx) => {
        await QuotaService.releaseReservedBytes(
          tx,
          options.tenantId,
          options.userId,
          options.buffer.length
        );
      });
      throw err;
    }
  }

  /**
   * Get single file / folder metadata with Privacy By Default:
   * Unauthorized lookups return 404 (not 403) to prevent existence leakage.
   */
  static async getItem(
    id: string,
    tenantId: string | null,
    userId: string,
    isSuper = false,
    userRoles: string[] = [],
    userPermissions: string[] = []
  ) {
    const item = await prisma.mediaFile.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { versionNo: "desc" },
        },
        fileLinks: true,
        usages: true,
        stars: {
          where: { userId },
          select: { id: true },
        },
        acls: true,
        shares: {
          where: { revokedAt: null },
        },
        _count: {
          select: { children: true, usages: true, fileLinks: true, versions: true },
        },
      },
    });

    if (!item) {
      const err: any = new Error("Item not found.");
      err.status = 404;
      throw err;
    }

    // Tenant check
    if (!isSuper && item.tenantId && item.tenantId !== tenantId) {
      const err: any = new Error("Item not found.");
      err.status = 404;
      throw err;
    }

    // Server-enforced ACL & Permission check with upward inheritance
    const { permission } = await FileAclService.resolvePermission({
      fileId: id,
      tenantId,
      userId,
      isSuper,
      userRoles,
      userPermissions,
    });
    const isOwner = permission === "OWNER";
    const hasOrgPermission = isSuper || userRoles.includes("tenant_admin") || userRoles.includes("admin");

    // Audit log if Tenant Admin views non-owned file
    if (!isOwner && hasOrgPermission && tenantId) {
      await prisma.fileActivity.create({
        data: {
          fileId: item.id,
          tenantId,
          actorId: userId,
          action: "ADMIN_VIEW_ACCESSED",
          metaJson: { fileName: item.fileName, ownerId: item.ownerId },
        },
      });
    }

    const isFolder = item.isFolder || item.type === "FOLDER";
    return {
      id: item.id,
      userPermission: permission,
      tenantId: item.tenantId,
      name: item.fileName,
      fileName: item.fileName,
      extension: item.extension,
      type: item.type || (isFolder ? "FOLDER" : "FILE"),
      ownerType: item.ownerType,
      ownerId: item.ownerId,
      mimeType: item.mimeType,
      fileSize: item.fileSize,
      formattedSize: isFolder ? `${item._count.children} items` : FilesService.formatBytes(item.fileSize),
      url: item.url,
      filePath: item.filePath,
      folder: item.folder,
      isFolder,
      parentId: item.parentId,
      materializedPath: item.materializedPath,
      depth: item.depth,
      category: item.category,
      isStarred: item.stars.length > 0,
      tags: item.tags,
      status: item.status,
      version: item.version,
      currentVersionId: item.currentVersionId,
      versions: item.versions,
      uploadedBy: item.uploadedBy,
      usageCount: item._count.usages + item._count.fileLinks,
      usages: item.usages,
      links: item.fileLinks,
      shares: item.shares,
      acls: item.acls,
      trashedAt: item.trashedAt || item.deletedAt,
      deletedAt: item.deletedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  /**
   * Generates an authorized time-limited download URL via the StorageProvider.
   */
  static async getDownloadUrl(options: {
    fileId: string;
    tenantId: string | null;
    userId: string;
    isSuper?: boolean;
    userRoles?: string[];
    userPermissions?: string[];
    expiresInSeconds?: number;
  }) {
    const item = await this.getItem(
      options.fileId,
      options.tenantId,
      options.userId,
      options.isSuper,
      options.userRoles,
      options.userPermissions
    );

    if (item.type === "FOLDER" || item.isFolder) {
      const err: any = new Error("Cannot download a folder directly.");
      err.status = 400;
      throw err;
    }

    const latestVersion = item.versions?.[0];
    const storageKey = latestVersion?.storageKey || item.filePath;
    const storageProvider = StorageProviderFactory.getProvider();
    const expiresIn = options.expiresInSeconds || 300;

    const signedUrl = await storageProvider.getSignedDownloadUrl(
      storageKey,
      item.fileName,
      expiresIn
    );

    if (options.tenantId) {
      await prisma.fileActivity.create({
        data: {
          fileId: item.id,
          tenantId: options.tenantId,
          actorId: options.userId,
          action: "FILE_DOWNLOAD",
          metaJson: { fileName: item.fileName, storageKey },
        },
      });
    }

    return { signedUrl, expiresInSeconds: expiresIn, fileName: item.fileName };
  }

  /**
   * Generates an authorized time-limited preview URL via the StorageProvider.
   */
  static async getPreviewUrl(options: {
    fileId: string;
    tenantId: string | null;
    userId: string;
    isSuper?: boolean;
    userRoles?: string[];
    userPermissions?: string[];
    expiresInSeconds?: number;
  }) {
    const item = await this.getItem(
      options.fileId,
      options.tenantId,
      options.userId,
      options.isSuper,
      options.userRoles,
      options.userPermissions
    );

    if (item.type === "FOLDER" || item.isFolder) {
      const err: any = new Error("Cannot preview a folder.");
      err.status = 400;
      throw err;
    }

    const latestVersion = item.versions?.[0];
    const storageKey = latestVersion?.storageKey || item.filePath;
    const storageProvider = StorageProviderFactory.getProvider();
    const expiresIn = options.expiresInSeconds || 300;

    const signedUrl = await storageProvider.getSignedPreviewUrl(
      storageKey,
      item.mimeType,
      expiresIn
    );

    if (options.tenantId) {
      await prisma.fileActivity.create({
        data: {
          fileId: item.id,
          tenantId: options.tenantId,
          actorId: options.userId,
          action: "FILE_PREVIEW",
          metaJson: { fileName: item.fileName, mimeType: item.mimeType },
        },
      });
    }

    return { signedUrl, expiresInSeconds: expiresIn, mimeType: item.mimeType };
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
    if (!file || file.deletedAt || file.status === "TRASHED") {
      const err: any = new Error("File not found.");
      err.status = 404;
      throw err;
    }

    if (!options.isSuper && file.tenantId !== options.tenantId) {
      const err: any = new Error("File not found.");
      err.status = 404;
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
      try {
        broadcastToTenant(options.tenantId, "file:shared", {
          fileId: file.id,
          shareId: share.id,
          sharedWith: share.sharedWith,
        });
      } catch {}
    }

    return share;
  }

  /**
   * List active shares for a file
   */
  static async listShares(fileId: string, tenantId: string | null, isSuper = false) {
    const file = await prisma.mediaFile.findUnique({ where: { id: fileId } });
    if (!file) throw new Error("File not found");
    if (!isSuper && file.tenantId !== tenantId) throw new Error("File not found");

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
