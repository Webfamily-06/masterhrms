import crypto from "crypto";
import bcrypt from "bcryptjs";
import { rawPrisma, prisma as proxiedPrisma } from "../../prisma";
import { OutboxService } from "../outbox.service";
import { NotificationService } from "../notification.service";
import { broadcastToTenant, broadcastToUser } from "../../socket";

const prisma = rawPrisma || proxiedPrisma;

export type AclPermission = "VIEWER" | "EDITOR" | "MANAGER" | "OWNER";
export type PrincipalType = "USER" | "TEAM" | "DEPARTMENT" | "ROLE" | "LINK";
export type FileAction =
  | "view"
  | "download"
  | "preview"
  | "upload"
  | "rename"
  | "move"
  | "trash"
  | "restore"
  | "delete"
  | "purge"
  | "share"
  | "manage_access"
  | "public_link";

const PERMISSION_HIERARCHY: Record<AclPermission, number> = {
  VIEWER: 1,
  EDITOR: 2,
  MANAGER: 3,
  OWNER: 4,
};

const ACTION_REQUIRED_PERMISSION: Record<FileAction, AclPermission> = {
  view: "VIEWER",
  download: "VIEWER",
  preview: "VIEWER",
  upload: "EDITOR",
  rename: "EDITOR",
  move: "EDITOR",
  trash: "EDITOR",
  restore: "EDITOR",
  delete: "MANAGER",
  purge: "MANAGER",
  share: "MANAGER",
  manage_access: "MANAGER",
  public_link: "MANAGER",
};

export class FileAclService {
  /**
   * Resolves the highest permission level a user has on a file or folder.
   * Walks upward through the folder hierarchy if inheritance is enabled.
   */
  public static async resolvePermission(options: {
    fileId: string;
    tenantId: string | null;
    userId: string;
    isSuper?: boolean;
    userRoles?: string[];
    userPermissions?: string[];
  }): Promise<{ permission: AclPermission; inheritedFromFolderId?: string; file: any }> {
    const { fileId, tenantId, userId, isSuper = false, userRoles = [], userPermissions = [] } = options;

    const file = await prisma.mediaFile.findUnique({
      where: { id: fileId },
      include: {
        acls: true,
      },
    });

    if (!file) {
      const err: any = new Error("Item not found.");
      err.status = 404;
      throw err;
    }

    // Tenant check
    if (!isSuper && file.tenantId && file.tenantId !== tenantId) {
      const err: any = new Error("Item not found.");
      err.status = 404;
      throw err;
    }

    // 1. Super Admin or Tenant Admin has full OWNER permissions
    const isTenantAdmin =
      isSuper || userRoles.includes("tenant_admin") || userRoles.includes("admin");
    const hasAdminViewAll = userPermissions.includes("files.admin.view_all");
    if (isTenantAdmin || hasAdminViewAll) {
      return { permission: "OWNER", file };
    }

    // 2. Direct File Ownership
    if (file.ownerId === userId || file.uploadedBy === userId || !file.tenantId) {
      return { permission: "OWNER", file };
    }

    // Fetch user's team IDs and department ID
    const [teamMemberships, employee] = await Promise.all([
      prisma.fileTeamMember.findMany({
        where: { userId },
        select: { teamId: true, role: true },
      }),
      prisma.employee.findFirst({
        where: { userId, tenantId: tenantId || undefined },
        select: { departmentId: true },
      }),
    ]);

    const userTeamIds = teamMemberships.map((tm) => tm.teamId);
    const departmentId = employee?.departmentId;

    // Helper to evaluate permission against a set of ACLs
    const evaluateAcls = (acls: any[]): AclPermission | null => {
      let maxLevel = 0;
      let maxPermission: AclPermission | null = null;
      const now = new Date();

      for (const acl of acls) {
        if (acl.expiresAt && new Date(acl.expiresAt) <= now) continue;

        let matched = false;
        if (acl.principalType === "USER" && acl.principalId === userId) {
          matched = true;
        } else if (acl.principalType === "TEAM" && acl.principalId && userTeamIds.includes(acl.principalId)) {
          matched = true;
        } else if (acl.principalType === "DEPARTMENT" && acl.principalId && acl.principalId === departmentId) {
          matched = true;
        } else if (acl.principalType === "ROLE" && acl.principalId && userRoles.includes(acl.principalId)) {
          matched = true;
        }

        if (matched) {
          const perm = acl.permission as AclPermission;
          const level = PERMISSION_HIERARCHY[perm] || 0;
          if (level > maxLevel) {
            maxLevel = level;
            maxPermission = perm;
          }
        }
      }

      return maxPermission;
    };

    // 3. Direct ACL on the file
    const directPerm = evaluateAcls(file.acls);
    if (directPerm) {
      return { permission: directPerm, file };
    }

    // 4. Ancestor Folder Inheritance
    if (file.parentId) {
      let currentParentId: string | null = file.parentId;
      while (currentParentId) {
        const parentFolder = await prisma.mediaFile.findUnique({
          where: { id: currentParentId },
          include: { acls: true },
        });

        if (!parentFolder) break;

        // Check if parent has matching ACL with inherit === true
        const inheritableAcls = parentFolder.acls.filter((a) => a.inherit);
        const inheritedPerm = evaluateAcls(inheritableAcls);

        if (inheritedPerm) {
          return {
            permission: inheritedPerm,
            inheritedFromFolderId: parentFolder.id,
            file,
          };
        }

        // Move up parent hierarchy
        currentParentId = parentFolder.parentId;
      }
    }

    // 5. No permission resolved -> Privacy by default
    const err: any = new Error("Item not found.");
    err.status = 404;
    throw err;
  }

  /**
   * Verifies that the user has at least the required permission for the requested action.
   */
  public static async verifyPermission(options: {
    fileId: string;
    tenantId: string | null;
    userId: string;
    action: FileAction;
    isSuper?: boolean;
    userRoles?: string[];
    userPermissions?: string[];
  }): Promise<{ allowed: boolean; permission: AclPermission; file: any }> {
    const requiredPermission = ACTION_REQUIRED_PERMISSION[options.action] || "VIEWER";
    const requiredLevel = PERMISSION_HIERARCHY[requiredPermission];

    const { permission, file } = await this.resolvePermission(options);
    const userLevel = PERMISSION_HIERARCHY[permission] || 0;

    if (userLevel < requiredLevel) {
      const err: any = new Error(`You do not have permission to ${options.action} this item.`);
      err.status = 403;
      throw err;
    }

    return { allowed: true, permission, file };
  }

  /**
   * Grants or updates an internal ACL on a file or folder.
   */
  public static async grantAcl(options: {
    fileId: string;
    tenantId: string;
    actorId: string;
    principalType: PrincipalType;
    principalId: string;
    permission: AclPermission;
    inherit?: boolean;
    expiresAt?: Date | null;
    message?: string;
    isSuper?: boolean;
    userRoles?: string[];
    userPermissions?: string[];
  }) {
    // 1. Verify actor has MANAGER or OWNER
    await this.verifyPermission({
      fileId: options.fileId,
      tenantId: options.tenantId,
      userId: options.actorId,
      action: "manage_access",
      isSuper: options.isSuper,
      userRoles: options.userRoles,
      userPermissions: options.userPermissions,
    });

    // 2. Validate principal exists in the current tenant (Prevent Cross-Tenant Grants)
    if (options.principalType === "USER") {
      const user = await prisma.user.findFirst({
        where: {
          id: options.principalId,
          profile: { tenantId: options.tenantId },
        },
      });
      if (!user) {
        const err: any = new Error("User does not exist in this organization.");
        err.status = 400;
        throw err;
      }
    } else if (options.principalType === "TEAM") {
      const team = await prisma.fileTeam.findFirst({
        where: { id: options.principalId, tenantId: options.tenantId },
      });
      if (!team) {
        const err: any = new Error("Team does not exist in this organization.");
        err.status = 400;
        throw err;
      }
    } else if (options.principalType === "DEPARTMENT") {
      const dept = await prisma.department.findFirst({
        where: { id: options.principalId, tenantId: options.tenantId },
      });
      if (!dept) {
        const err: any = new Error("Department does not exist in this organization.");
        err.status = 400;
        throw err;
      }
    }

    // 3. Upsert ACL
    const existingAcl = await prisma.fileAcl.findFirst({
      where: {
        fileId: options.fileId,
        principalType: options.principalType,
        principalId: options.principalId,
      },
    });

    let aclRecord: any;
    if (existingAcl) {
      aclRecord = await prisma.fileAcl.update({
        where: { id: existingAcl.id },
        data: {
          permission: options.permission,
          inherit: options.inherit !== undefined ? options.inherit : true,
          expiresAt: options.expiresAt || null,
        },
      });
    } else {
      aclRecord = await prisma.fileAcl.create({
        data: {
          fileId: options.fileId,
          principalType: options.principalType,
          principalId: options.principalId,
          permission: options.permission,
          inherit: options.inherit !== undefined ? options.inherit : true,
          expiresAt: options.expiresAt || null,
          createdBy: options.actorId,
        },
      });
    }

    // 4. Audit & Outbox
    await Promise.all([
      prisma.fileActivity.create({
        data: {
          fileId: options.fileId,
          tenantId: options.tenantId,
          actorId: options.actorId,
          action: "FILE_ACL_GRANTED",
          metaJson: {
            principalType: options.principalType,
            principalId: options.principalId,
            permission: options.permission,
          },
        },
      }),
      OutboxService.createOutboxEvent({
        tenantId: options.tenantId,
        eventType: "file:acl:created",
        entityType: "FILE_ACL",
        entityId: aclRecord.id,
        actorId: options.actorId,
        payload: {
          fileId: options.fileId,
          aclId: aclRecord.id,
          principalType: options.principalType,
          principalId: options.principalId,
          permission: options.permission,
        },
      }),
    ]);

    // 5. In-App Notification (for internal user sharing)
    if (options.principalType === "USER" && options.principalId !== options.actorId) {
      try {
        const file = await prisma.mediaFile.findUnique({
          where: { id: options.fileId },
          select: { fileName: true, isFolder: true },
        });
        await NotificationService.createNotification({
          tenantId: options.tenantId,
          userId: options.principalId,
          title: "File shared with you",
          message: `A ${file?.isFolder ? "folder" : "file"} "${file?.fileName}" was shared with you as ${options.permission}.`,
          type: "FILE_SHARED",
          actionUrl: `/apps/file-manager/list-view`,
        });
      } catch (e) {
        console.warn("[FileAcl] Notification dispatch failed:", e);
      }
    }

    // 6. Broadcast Realtime
    broadcastToTenant(options.tenantId, "file:acl:updated", {
      fileId: options.fileId,
      aclId: aclRecord.id,
    });

    return aclRecord;
  }

  /**
   * Revokes an ACL grant.
   */
  public static async revokeAcl(options: {
    fileId: string;
    aclId: string;
    tenantId: string;
    actorId: string;
    isSuper?: boolean;
    userRoles?: string[];
    userPermissions?: string[];
  }) {
    await this.verifyPermission({
      fileId: options.fileId,
      tenantId: options.tenantId,
      userId: options.actorId,
      action: "manage_access",
      isSuper: options.isSuper,
      userRoles: options.userRoles,
      userPermissions: options.userPermissions,
    });

    const acl = await prisma.fileAcl.findUnique({
      where: { id: options.aclId },
    });

    if (!acl || acl.fileId !== options.fileId) {
      const err: any = new Error("ACL grant not found.");
      err.status = 404;
      throw err;
    }

    await prisma.fileAcl.delete({
      where: { id: options.aclId },
    });

    await Promise.all([
      prisma.fileActivity.create({
        data: {
          fileId: options.fileId,
          tenantId: options.tenantId,
          actorId: options.actorId,
          action: "FILE_ACL_REVOKED",
          metaJson: { aclId: options.aclId, principalType: acl.principalType, principalId: acl.principalId },
        },
      }),
      OutboxService.createOutboxEvent({
        tenantId: options.tenantId,
        eventType: "file:acl:revoked",
        entityType: "FILE_ACL",
        entityId: options.aclId,
        actorId: options.actorId,
        payload: { fileId: options.fileId, aclId: options.aclId },
      }),
    ]);

    broadcastToTenant(options.tenantId, "file:acl:updated", {
      fileId: options.fileId,
      aclId: options.aclId,
    });

    return { success: true, aclId: options.aclId };
  }

  /**
   * Lists all ACL grants on a file (both direct and inherited).
   */
  public static async listAcls(options: {
    fileId: string;
    tenantId: string;
    userId: string;
    isSuper?: boolean;
    userRoles?: string[];
    userPermissions?: string[];
  }) {
    const { permission, file } = await this.resolvePermission(options);

    // Only MANAGER or OWNER can view the full access list
    const canManage = permission === "MANAGER" || permission === "OWNER";
    if (!canManage) {
      const err: any = new Error("You do not have permission to view the access list for this item.");
      err.status = 403;
      throw err;
    }

    // Direct ACLs
    const directAcls = await prisma.fileAcl.findMany({
      where: { fileId: options.fileId },
      orderBy: { createdAt: "asc" },
    });

    // Populate principal details
    const userIds = directAcls.filter((a) => a.principalType === "USER").map((a) => a.principalId!);
    const teamIds = directAcls.filter((a) => a.principalType === "TEAM").map((a) => a.principalId!);
    const deptIds = directAcls.filter((a) => a.principalType === "DEPARTMENT").map((a) => a.principalId!);

    const [users, teams, departments] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, profile: { select: { fullName: true, avatarUrl: true } } },
      }),
      prisma.fileTeam.findMany({
        where: { id: { in: teamIds } },
        select: { id: true, name: true },
      }),
      prisma.department.findMany({
        where: { id: { in: deptIds } },
        select: { id: true, name: true },
      }),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const teamMap = new Map(teams.map((t) => [t.id, t]));
    const deptMap = new Map(departments.map((d) => [d.id, d]));

    const formattedAcls = directAcls.map((acl) => {
      let principalName = acl.principalId || "Unknown";
      let principalEmail: string | undefined;
      let avatarUrl: string | undefined;

      if (acl.principalType === "USER") {
        const u = userMap.get(acl.principalId!);
        principalName = u?.profile?.fullName || u?.email || "Unknown User";
        principalEmail = u?.email;
        avatarUrl = u?.profile?.avatarUrl || undefined;
      } else if (acl.principalType === "TEAM") {
        const t = teamMap.get(acl.principalId!);
        principalName = t?.name || "Unknown Team";
      } else if (acl.principalType === "DEPARTMENT") {
        const d = deptMap.get(acl.principalId!);
        principalName = d?.name || "Unknown Department";
      } else if (acl.principalType === "ROLE") {
        principalName = `Role: ${acl.principalId}`;
      } else if (acl.principalType === "LINK") {
        principalName = "Public Link";
      }

      return {
        id: acl.id,
        fileId: acl.fileId,
        principalType: acl.principalType,
        principalId: acl.principalId,
        principalName,
        principalEmail,
        avatarUrl,
        permission: acl.permission,
        inherit: acl.inherit,
        expiresAt: acl.expiresAt,
        isPublicLink: acl.principalType === "LINK",
        createdAt: acl.createdAt,
      };
    });

    // Check for inherited ACLs from ancestor folders
    const inheritedAcls: any[] = [];
    if (file.parentId) {
      let parentId: string | null = file.parentId;
      while (parentId) {
        const parent = await prisma.mediaFile.findUnique({
          where: { id: parentId },
          include: { acls: { where: { inherit: true } } },
        });
        if (!parent) break;

        for (const iAcl of parent.acls) {
          inheritedAcls.push({
            id: iAcl.id,
            fileId: options.fileId,
            inheritedFromFolderId: parent.id,
            inheritedFromFolderName: parent.fileName,
            principalType: iAcl.principalType,
            principalId: iAcl.principalId,
            permission: iAcl.permission,
            inherit: true,
          });
        }
        parentId = parent.parentId;
      }
    }

    // Owner details
    let ownerDetails: any = null;
    if (file.ownerId) {
      const ownerUser = await prisma.user.findUnique({
        where: { id: file.ownerId },
        select: { id: true, email: true, profile: { select: { fullName: true, avatarUrl: true } } },
      });
      if (ownerUser) {
        ownerDetails = {
          id: ownerUser.id,
          name: ownerUser.profile?.fullName || ownerUser.email,
          email: ownerUser.email,
          avatarUrl: ownerUser.profile?.avatarUrl,
        };
      }
    }

    return {
      directAcls: formattedAcls,
      inheritedAcls,
      owner: ownerDetails,
      userPermission: permission,
    };
  }

  /**
   * Creates or updates a cryptographically secure public link for a file.
   * Stores SHA-256 hash of token, never the plaintext token.
   */
  public static async createPublicLink(options: {
    fileId: string;
    tenantId: string;
    actorId: string;
    password?: string;
    expiresAt?: Date | null;
    allowDownload?: boolean;
    isSuper?: boolean;
    userRoles?: string[];
    userPermissions?: string[];
  }): Promise<{
    token: string;
    publicUrl: string;
    expiresAt?: Date | null;
    allowDownload: boolean;
    isPasswordProtected: boolean;
  }> {
    await this.verifyPermission({
      fileId: options.fileId,
      tenantId: options.tenantId,
      userId: options.actorId,
      action: "public_link",
      isSuper: options.isSuper,
      userRoles: options.userRoles,
      userPermissions: options.userPermissions,
    });

    // Remove any existing public link for this file
    await prisma.fileAcl.deleteMany({
      where: {
        fileId: options.fileId,
        principalType: "LINK",
      },
    });

    // Generate 64-char hex cryptographically unguessable token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const linkTokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    let linkPasswordHash: string | null = null;
    if (options.password && options.password.trim()) {
      linkPasswordHash = await bcrypt.hash(options.password.trim(), 10);
    }

    const allowDownload = options.allowDownload !== false;
    const linkScope = allowDownload ? "EXTERNAL" : "EXTERNAL_PREVIEW";

    await prisma.fileAcl.create({
      data: {
        fileId: options.fileId,
        principalType: "LINK",
        principalId: null,
        permission: allowDownload ? "VIEWER" : "VIEWER",
        inherit: false,
        expiresAt: options.expiresAt || null,
        linkTokenHash,
        linkPasswordHash,
        linkScope,
        createdBy: options.actorId,
      },
    });

    await prisma.fileActivity.create({
      data: {
        fileId: options.fileId,
        tenantId: options.tenantId,
        actorId: options.actorId,
        action: "PUBLIC_LINK_CREATED",
        metaJson: {
          hasPassword: Boolean(options.password),
          expiresAt: options.expiresAt,
          allowDownload,
        },
      },
    });

    return {
      token: rawToken,
      publicUrl: `/share/${rawToken}`,
      expiresAt: options.expiresAt,
      allowDownload,
      isPasswordProtected: Boolean(options.password),
    };
  }

  /**
   * Revokes the active public link on a file.
   */
  public static async revokePublicLink(options: {
    fileId: string;
    tenantId: string;
    actorId: string;
    isSuper?: boolean;
    userRoles?: string[];
    userPermissions?: string[];
  }) {
    await this.verifyPermission({
      fileId: options.fileId,
      tenantId: options.tenantId,
      userId: options.actorId,
      action: "public_link",
      isSuper: options.isSuper,
      userRoles: options.userRoles,
      userPermissions: options.userPermissions,
    });

    const deleted = await prisma.fileAcl.deleteMany({
      where: {
        fileId: options.fileId,
        principalType: "LINK",
      },
    });

    await prisma.fileActivity.create({
      data: {
        fileId: options.fileId,
        tenantId: options.tenantId,
        actorId: options.actorId,
        action: "PUBLIC_LINK_REVOKED",
      },
    });

    return { success: true, count: deleted.count };
  }

  /**
   * Verifies an external public link token and returns sanitized metadata.
   */
  public static async verifyPublicLink(options: {
    token: string;
    password?: string;
  }): Promise<{
    file: any;
    allowDownload: boolean;
    requiresPassword: boolean;
    isPasswordValid?: boolean;
  }> {
    const { token, password } = options;
    if (!token || token.length < 32) {
      const err: any = new Error("Link not found or expired.");
      err.status = 404;
      throw err;
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const acl = await prisma.fileAcl.findFirst({
      where: {
        linkTokenHash: tokenHash,
        principalType: "LINK",
      },
      include: {
        file: {
          include: {
            versions: { orderBy: { versionNo: "desc" }, take: 1 },
          },
        },
      },
    });

    if (!acl || !acl.file) {
      const err: any = new Error("Link not found or expired.");
      err.status = 404;
      throw err;
    }

    // Check expiration
    if (acl.expiresAt && new Date(acl.expiresAt) <= new Date()) {
      const err: any = new Error("Link not found or expired.");
      err.status = 404;
      throw err;
    }

    // Check trashed or deleted file
    if (acl.file.deletedAt || acl.file.status === "TRASHED") {
      const err: any = new Error("Link not found or expired.");
      err.status = 404;
      throw err;
    }

    const requiresPassword = Boolean(acl.linkPasswordHash);
    let isPasswordValid = false;

    if (requiresPassword) {
      if (password) {
        isPasswordValid = await bcrypt.compare(password, acl.linkPasswordHash!);
        if (!isPasswordValid) {
          const err: any = new Error("Incorrect password for this shared link.");
          err.status = 401;
          throw err;
        }
      }
    } else {
      isPasswordValid = true;
    }

    const allowDownload = acl.linkScope !== "EXTERNAL_PREVIEW";

    // Sanitized file metadata
    const sanitizedFile = {
      id: acl.file.id,
      fileName: acl.file.fileName,
      mimeType: acl.file.mimeType,
      fileSize: acl.file.fileSize,
      formattedSize: acl.file.fileSize ? `${(acl.file.fileSize / 1024 / 1024).toFixed(2)} MB` : "0 B",
      category: acl.file.category,
      updatedAt: acl.file.updatedAt,
    };

    return {
      file: sanitizedFile,
      allowDownload,
      requiresPassword,
      isPasswordValid,
    };
  }
}

