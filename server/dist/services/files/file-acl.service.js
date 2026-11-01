"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileAclService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../../prisma");
const outbox_service_1 = require("../outbox.service");
const notification_service_1 = require("../notification.service");
const socket_1 = require("../../socket");
const prisma = prisma_1.rawPrisma || prisma_1.prisma;
const PERMISSION_HIERARCHY = {
    VIEWER: 1,
    EDITOR: 2,
    MANAGER: 3,
    OWNER: 4,
};
const ACTION_REQUIRED_PERMISSION = {
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
class FileAclService {
    /**
     * Resolves the highest permission level a user has on a file or folder.
     * Walks upward through the folder hierarchy if inheritance is enabled.
     */
    static async resolvePermission(options) {
        const { fileId, tenantId, userId, isSuper = false, userRoles = [], userPermissions = [] } = options;
        const file = await prisma.mediaFile.findUnique({
            where: { id: fileId },
            include: {
                acls: true,
            },
        });
        if (!file) {
            const err = new Error("Item not found.");
            err.status = 404;
            throw err;
        }
        // Tenant check
        if (!isSuper && file.tenantId && file.tenantId !== tenantId) {
            const err = new Error("Item not found.");
            err.status = 404;
            throw err;
        }
        // 1. Super Admin or Tenant Admin has full OWNER permissions
        const isTenantAdmin = isSuper || userRoles.includes("tenant_admin") || userRoles.includes("admin");
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
        const evaluateAcls = (acls) => {
            let maxLevel = 0;
            let maxPermission = null;
            const now = new Date();
            for (const acl of acls) {
                if (acl.expiresAt && new Date(acl.expiresAt) <= now)
                    continue;
                let matched = false;
                if (acl.principalType === "USER" && acl.principalId === userId) {
                    matched = true;
                }
                else if (acl.principalType === "TEAM" && acl.principalId && userTeamIds.includes(acl.principalId)) {
                    matched = true;
                }
                else if (acl.principalType === "DEPARTMENT" && acl.principalId && acl.principalId === departmentId) {
                    matched = true;
                }
                else if (acl.principalType === "ROLE" && acl.principalId && userRoles.includes(acl.principalId)) {
                    matched = true;
                }
                if (matched) {
                    const perm = acl.permission;
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
            let currentParentId = file.parentId;
            while (currentParentId) {
                const parentFolder = await prisma.mediaFile.findUnique({
                    where: { id: currentParentId },
                    include: { acls: true },
                });
                if (!parentFolder)
                    break;
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
        // 5. Module Permission Delegation via FileLink (Phase F5)
        try {
            const { FileLinkService } = await Promise.resolve().then(() => __importStar(require("./file-link.service")));
            const hasEntityAccess = await FileLinkService.canAccessViaEntity(userId, tenantId, fileId, userRoles);
            if (hasEntityAccess) {
                return { permission: "VIEWER", file };
            }
        }
        catch (delegationErr) {
            // Ignore delegation lookup errors and fall through
        }
        // 6. Public asset check (Phase F5)
        if (file.isPublic) {
            return { permission: "VIEWER", file };
        }
        // 7. No permission resolved -> Privacy by default
        const err = new Error("Item not found.");
        err.status = 404;
        throw err;
    }
    /**
     * Verifies that the user has at least the required permission for the requested action.
     */
    static async verifyPermission(options) {
        const requiredPermission = ACTION_REQUIRED_PERMISSION[options.action] || "VIEWER";
        const requiredLevel = PERMISSION_HIERARCHY[requiredPermission];
        const { permission, file } = await this.resolvePermission(options);
        const userLevel = PERMISSION_HIERARCHY[permission] || 0;
        if (userLevel < requiredLevel) {
            const err = new Error(`You do not have permission to ${options.action} this item.`);
            err.status = 403;
            throw err;
        }
        return { allowed: true, permission, file };
    }
    /**
     * Grants or updates an internal ACL on a file or folder.
     */
    static async grantAcl(options) {
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
                const err = new Error("User does not exist in this organization.");
                err.status = 400;
                throw err;
            }
        }
        else if (options.principalType === "TEAM") {
            const team = await prisma.fileTeam.findFirst({
                where: { id: options.principalId, tenantId: options.tenantId },
            });
            if (!team) {
                const err = new Error("Team does not exist in this organization.");
                err.status = 400;
                throw err;
            }
        }
        else if (options.principalType === "DEPARTMENT") {
            const dept = await prisma.department.findFirst({
                where: { id: options.principalId, tenantId: options.tenantId },
            });
            if (!dept) {
                const err = new Error("Department does not exist in this organization.");
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
        let aclRecord;
        if (existingAcl) {
            aclRecord = await prisma.fileAcl.update({
                where: { id: existingAcl.id },
                data: {
                    permission: options.permission,
                    inherit: options.inherit !== undefined ? options.inherit : true,
                    expiresAt: options.expiresAt || null,
                },
            });
        }
        else {
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
            outbox_service_1.OutboxService.createOutboxEvent({
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
                await notification_service_1.NotificationService.createNotification({
                    tenantId: options.tenantId,
                    userId: options.principalId,
                    title: "File shared with you",
                    message: `A ${file?.isFolder ? "folder" : "file"} "${file?.fileName}" was shared with you as ${options.permission}.`,
                    type: "FILE_SHARED",
                    actionUrl: `/me/files`,
                });
            }
            catch (e) {
                console.warn("[FileAcl] Notification dispatch failed:", e);
            }
        }
        // 6. Broadcast Realtime
        (0, socket_1.broadcastToTenant)(options.tenantId, "file:acl:updated", {
            fileId: options.fileId,
            aclId: aclRecord.id,
        });
        return aclRecord;
    }
    /**
     * Revokes an ACL grant.
     */
    static async revokeAcl(options) {
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
            const err = new Error("ACL grant not found.");
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
            outbox_service_1.OutboxService.createOutboxEvent({
                tenantId: options.tenantId,
                eventType: "file:acl:revoked",
                entityType: "FILE_ACL",
                entityId: options.aclId,
                actorId: options.actorId,
                payload: { fileId: options.fileId, aclId: options.aclId },
            }),
        ]);
        (0, socket_1.broadcastToTenant)(options.tenantId, "file:acl:updated", {
            fileId: options.fileId,
            aclId: options.aclId,
        });
        return { success: true, aclId: options.aclId };
    }
    /**
     * Lists all ACL grants on a file (both direct and inherited).
     */
    static async listAcls(options) {
        const { permission, file } = await this.resolvePermission(options);
        // Only MANAGER or OWNER can view the full access list
        const canManage = permission === "MANAGER" || permission === "OWNER";
        if (!canManage) {
            const err = new Error("You do not have permission to view the access list for this item.");
            err.status = 403;
            throw err;
        }
        // Direct ACLs
        const directAcls = await prisma.fileAcl.findMany({
            where: { fileId: options.fileId },
            orderBy: { createdAt: "asc" },
        });
        // Populate principal details
        const userIds = directAcls.filter((a) => a.principalType === "USER").map((a) => a.principalId);
        const teamIds = directAcls.filter((a) => a.principalType === "TEAM").map((a) => a.principalId);
        const deptIds = directAcls.filter((a) => a.principalType === "DEPARTMENT").map((a) => a.principalId);
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
            let principalEmail;
            let avatarUrl;
            if (acl.principalType === "USER") {
                const u = userMap.get(acl.principalId);
                principalName = u?.profile?.fullName || u?.email || "Unknown User";
                principalEmail = u?.email;
                avatarUrl = u?.profile?.avatarUrl || undefined;
            }
            else if (acl.principalType === "TEAM") {
                const t = teamMap.get(acl.principalId);
                principalName = t?.name || "Unknown Team";
            }
            else if (acl.principalType === "DEPARTMENT") {
                const d = deptMap.get(acl.principalId);
                principalName = d?.name || "Unknown Department";
            }
            else if (acl.principalType === "ROLE") {
                principalName = `Role: ${acl.principalId}`;
            }
            else if (acl.principalType === "LINK") {
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
        const inheritedAcls = [];
        if (file.parentId) {
            let parentId = file.parentId;
            while (parentId) {
                const parent = await prisma.mediaFile.findUnique({
                    where: { id: parentId },
                    include: { acls: { where: { inherit: true } } },
                });
                if (!parent)
                    break;
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
        let ownerDetails = null;
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
    static async createPublicLink(options) {
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
        const rawToken = crypto_1.default.randomBytes(32).toString("hex");
        const linkTokenHash = crypto_1.default.createHash("sha256").update(rawToken).digest("hex");
        let linkPasswordHash = null;
        if (options.password && options.password.trim()) {
            linkPasswordHash = await bcryptjs_1.default.hash(options.password.trim(), 10);
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
    static async revokePublicLink(options) {
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
    static async verifyPublicLink(options) {
        const { token, password } = options;
        if (!token || token.length < 32) {
            const err = new Error("Link not found or expired.");
            err.status = 404;
            throw err;
        }
        const tokenHash = crypto_1.default.createHash("sha256").update(token).digest("hex");
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
            const err = new Error("Link not found or expired.");
            err.status = 404;
            throw err;
        }
        // Check expiration
        if (acl.expiresAt && new Date(acl.expiresAt) <= new Date()) {
            const err = new Error("Link not found or expired.");
            err.status = 404;
            throw err;
        }
        // Check trashed or deleted file
        if (acl.file.deletedAt || acl.file.status === "TRASHED") {
            const err = new Error("Link not found or expired.");
            err.status = 404;
            throw err;
        }
        const requiresPassword = Boolean(acl.linkPasswordHash);
        let isPasswordValid = false;
        if (requiresPassword) {
            if (password) {
                isPasswordValid = await bcryptjs_1.default.compare(password, acl.linkPasswordHash);
                if (!isPasswordValid) {
                    const err = new Error("Incorrect password for this shared link.");
                    err.status = 401;
                    throw err;
                }
            }
            else {
                return {
                    requiresPassword: true,
                    allowDownload: false,
                    isPasswordValid: false,
                };
            }
        }
        else {
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
exports.FileAclService = FileAclService;
