"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuotaService = exports.QuotaExceededError = exports.PLAN_STORAGE_CAPACITIES_GB = exports.DEFAULT_USER_QUOTA_BYTES = exports.MAX_FILE_SIZE_BYTES = void 0;
const prisma_1 = require("../../prisma");
const outbox_service_1 = require("../outbox.service");
const quota_governance_service_1 = require("./quota-governance.service");
const prisma = prisma_1.rawPrisma || prisma_1.prisma;
exports.MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
exports.DEFAULT_USER_QUOTA_BYTES = BigInt(5) * BigInt(1024 * 1024 * 1024); // 5 GB
exports.PLAN_STORAGE_CAPACITIES_GB = {
    starter: 10,
    growth: 25,
    sovereign: 100,
    "custom-flex": 500,
    custom: 500,
};
class QuotaExceededError extends Error {
    code = "QUOTA_EXCEEDED";
    scope;
    requestedBytes;
    availableBytes;
    constructor(message, scope, requestedBytes, availableBytes) {
        super(message);
        this.name = "QuotaExceededError";
        this.scope = scope;
        this.requestedBytes = requestedBytes;
        this.availableBytes = availableBytes;
    }
}
exports.QuotaExceededError = QuotaExceededError;
class QuotaService {
    /**
     * Resolves the storage quota limit in bytes for a tenant based on its subscription plan.
     */
    static async getTenantQuotaBytes(tenantId) {
        if (!tenantId) {
            return BigInt(1000) * BigInt(1024 * 1024 * 1024); // 1 TB platform ceiling
        }
        const override = await prisma.storageQuota.findFirst({
            where: {
                tenantId,
                userId: null,
            },
        });
        if (override && override.quotaBytes > BigInt(0)) {
            return override.quotaBytes;
        }
        const subscription = await prisma.tenantSubscription.findUnique({
            where: { tenantId },
            include: { plan: true },
        });
        let limitGb = 10; // Starter default if undefined/null
        if (subscription?.storageLimitGb) {
            limitGb = subscription.storageLimitGb;
        }
        else if (subscription?.plan?.storageLimitGb) {
            limitGb = subscription.plan.storageLimitGb;
        }
        else if (subscription?.planId && exports.PLAN_STORAGE_CAPACITIES_GB[subscription.planId.toLowerCase()]) {
            limitGb = exports.PLAN_STORAGE_CAPACITIES_GB[subscription.planId.toLowerCase()];
        }
        return BigInt(limitGb) * BigInt(1024 * 1024 * 1024);
    }
    /**
     * Resolves the storage quota limit in bytes for a specific user within a tenant.
     */
    static async getUserQuotaBytes(tenantId, userId) {
        if (!tenantId) {
            return BigInt(100) * BigInt(1024 * 1024 * 1024); // 100 GB for platform admins
        }
        const quotaRecord = await prisma.storageQuota.findFirst({
            where: {
                tenantId,
                userId,
            },
        });
        if (quotaRecord) {
            return quotaRecord.quotaBytes;
        }
        return exports.DEFAULT_USER_QUOTA_BYTES;
    }
    /**
     * Retrieves or initializes the storage usage record for tenant pool or user.
     */
    static async getOrCreateUsage(tx, tenantId, userId) {
        const tid = tenantId || "platform";
        const isPool = userId === null || userId === "tenant_pool" || !userId;
        const canonicalUserId = isPool ? null : userId;
        let usage = await tx.storageUsage.findFirst({
            where: isPool
                ? {
                    tenantId: tid,
                    userId: null,
                }
                : {
                    tenantId: tid,
                    userId: canonicalUserId,
                },
        });
        if (!usage) {
            try {
                usage = await tx.storageUsage.create({
                    data: {
                        tenantId: tid,
                        userId: canonicalUserId,
                        usedBytes: BigInt(0),
                        trashBytes: BigInt(0),
                        reservedBytes: BigInt(0),
                        fileCount: 0,
                    },
                });
            }
            catch (err) {
                if (err.code === "P2002") {
                    usage = await tx.storageUsage.findFirst({
                        where: canonicalUserId === null
                            ? { tenantId: tid, userId: null }
                            : { tenantId: tid, userId: canonicalUserId },
                    });
                }
                else {
                    throw err;
                }
            }
        }
        return usage;
    }
    /**
     * Atomically verifies quota and reserves bytes for an in-flight upload session.
     * Supports 5-tier governance cascade: Platform, Tenant, Department, Team, User.
     */
    static async reserveUploadBytes(tx, tenantId, userId, sizeBytes, options) {
        if (sizeBytes > exports.MAX_FILE_SIZE_BYTES) {
            throw new QuotaExceededError(`File size (${(sizeBytes / (1024 * 1024)).toFixed(1)} MB) exceeds the 100 MB upload limit.`, "FILE_SIZE", sizeBytes, BigInt(exports.MAX_FILE_SIZE_BYTES));
        }
        const bigSizeBytes = BigInt(sizeBytes);
        // 1. Check Tenant Hard Quota
        if (tenantId) {
            const tenantQuotaBytes = await this.getTenantQuotaBytes(tenantId);
            const tenantUsage = await this.getOrCreateUsage(tx, tenantId, null);
            const projectedTenantBytes = tenantUsage.usedBytes + tenantUsage.reservedBytes + bigSizeBytes;
            if (projectedTenantBytes > tenantQuotaBytes) {
                const available = tenantQuotaBytes > (tenantUsage.usedBytes + tenantUsage.reservedBytes)
                    ? tenantQuotaBytes - (tenantUsage.usedBytes + tenantUsage.reservedBytes)
                    : BigInt(0);
                try {
                    await outbox_service_1.OutboxService.createOutboxEvent({
                        tenantId,
                        eventType: "quota.blocked",
                        entityType: "TENANT_QUOTA",
                        entityId: tenantId,
                        actorId: userId,
                        payload: {
                            tenantId,
                            userId,
                            scope: "TENANT",
                            requestedBytes: sizeBytes,
                            availableBytes: available.toString(),
                            timestamp: new Date().toISOString(),
                        },
                    }, tx);
                }
                catch (e) { }
                throw new QuotaExceededError(`Tenant storage quota exceeded. Plan limit reached.`, "TENANT", sizeBytes, available);
            }
        }
        // 2. Check Contextual Scope: Team, Department, or User
        if (tenantId && options?.teamId) {
            const teamQuotaBytes = await quota_governance_service_1.QuotaGovernanceService.getTeamQuotaBytes(tenantId, options.teamId);
            const team = await tx.fileTeam.findUnique({ where: { id: options.teamId } });
            const teamFiles = await tx.mediaFile.findMany({
                where: {
                    tenantId,
                    status: "ACTIVE",
                    deletedAt: null,
                    isFolder: false,
                    OR: [
                        { ownerType: "TEAM", ownerId: options.teamId },
                        ...(team?.rootFolderId ? [{ materializedPath: { contains: `/${team.rootFolderId}/` } }] : []),
                    ],
                },
                select: { fileSize: true },
            });
            const teamUsedBytes = teamFiles.reduce((acc, f) => acc + BigInt(f.fileSize || 0), BigInt(0));
            if (teamUsedBytes + bigSizeBytes > teamQuotaBytes) {
                const available = teamQuotaBytes > teamUsedBytes ? teamQuotaBytes - teamUsedBytes : BigInt(0);
                try {
                    await outbox_service_1.OutboxService.createOutboxEvent({
                        tenantId,
                        eventType: "quota.blocked",
                        entityType: "TEAM_QUOTA",
                        entityId: options.teamId,
                        actorId: userId,
                        payload: {
                            tenantId,
                            teamId: options.teamId,
                            userId,
                            scope: "TEAM",
                            requestedBytes: sizeBytes,
                            availableBytes: available.toString(),
                            timestamp: new Date().toISOString(),
                        },
                    }, tx);
                }
                catch (e) { }
                throw new QuotaExceededError(`Team folder storage allocation exceeded (${(Number(teamQuotaBytes) / (1024 * 1024 * 1024)).toFixed(1)} GB limit).`, "TEAM", sizeBytes, available);
            }
        }
        else if (tenantId && options?.departmentId) {
            const deptQuotaBytes = await quota_governance_service_1.QuotaGovernanceService.getDepartmentQuotaBytes(tenantId, options.departmentId);
            const deptEmployees = await tx.employee.findMany({
                where: { tenantId, departmentId: options.departmentId },
                select: { userId: true },
            });
            const userIds = deptEmployees.map((e) => e.userId).filter(Boolean);
            const deptFiles = await tx.mediaFile.findMany({
                where: {
                    tenantId,
                    status: "ACTIVE",
                    deletedAt: null,
                    isFolder: false,
                    ownerType: "USER",
                    ownerId: { in: userIds },
                },
                select: { fileSize: true },
            });
            const deptUsedBytes = deptFiles.reduce((acc, f) => acc + BigInt(f.fileSize || 0), BigInt(0));
            if (deptUsedBytes + bigSizeBytes > deptQuotaBytes) {
                const available = deptQuotaBytes > deptUsedBytes ? deptQuotaBytes - deptUsedBytes : BigInt(0);
                try {
                    await outbox_service_1.OutboxService.createOutboxEvent({
                        tenantId,
                        eventType: "quota.blocked",
                        entityType: "DEPARTMENT_QUOTA",
                        entityId: options.departmentId,
                        actorId: userId,
                        payload: {
                            tenantId,
                            departmentId: options.departmentId,
                            userId,
                            scope: "DEPARTMENT",
                            requestedBytes: sizeBytes,
                            availableBytes: available.toString(),
                            timestamp: new Date().toISOString(),
                        },
                    }, tx);
                }
                catch (e) { }
                throw new QuotaExceededError(`Department storage allocation exceeded (${(Number(deptQuotaBytes) / (1024 * 1024 * 1024)).toFixed(1)} GB limit).`, "DEPARTMENT", sizeBytes, available);
            }
        }
        else {
            // Personal User Quota check
            const userQuotaBytes = await this.getUserQuotaBytes(tenantId, userId);
            const userUsage = await this.getOrCreateUsage(tx, tenantId, userId);
            const projectedUserBytes = userUsage.usedBytes + userUsage.reservedBytes + bigSizeBytes;
            if (projectedUserBytes > userQuotaBytes) {
                const available = userQuotaBytes > (userUsage.usedBytes + userUsage.reservedBytes)
                    ? userQuotaBytes - (userUsage.usedBytes + userUsage.reservedBytes)
                    : BigInt(0);
                try {
                    if (tenantId) {
                        await outbox_service_1.OutboxService.createOutboxEvent({
                            tenantId,
                            eventType: "quota.blocked",
                            entityType: "USER_QUOTA",
                            entityId: userId,
                            actorId: userId,
                            payload: {
                                tenantId,
                                userId,
                                scope: "USER",
                                requestedBytes: sizeBytes,
                                availableBytes: available.toString(),
                                timestamp: new Date().toISOString(),
                            },
                        }, tx);
                    }
                }
                catch (e) { }
                throw new QuotaExceededError(`User storage allocation exceeded. Your 5 GB allocation is full.`, "USER", sizeBytes, available);
            }
        }
        // 3. Atomically increment reservations
        if (tenantId) {
            const tenantUsage = await this.getOrCreateUsage(tx, tenantId, null);
            await tx.storageUsage.update({
                where: { id: tenantUsage.id },
                data: { reservedBytes: { increment: bigSizeBytes } },
            });
        }
        const userUsageRecord = await this.getOrCreateUsage(tx, tenantId, userId);
        await tx.storageUsage.update({
            where: { id: userUsageRecord.id },
            data: { reservedBytes: { increment: bigSizeBytes } },
        });
    }
    /**
     * Commits reserved upload bytes into usedBytes upon successful upload completion.
     */
    static async commitUploadBytes(tx, tenantId, userId, sizeBytes) {
        const bigSizeBytes = BigInt(sizeBytes);
        // Tenant Pool update
        if (tenantId) {
            const tenantUsage = await this.getOrCreateUsage(tx, tenantId, null);
            const decr = tenantUsage.reservedBytes >= bigSizeBytes ? bigSizeBytes : tenantUsage.reservedBytes;
            const updatedTenantUsage = await tx.storageUsage.update({
                where: { id: tenantUsage.id },
                data: {
                    reservedBytes: { decrement: decr },
                    usedBytes: { increment: bigSizeBytes },
                    fileCount: { increment: 1 },
                },
            });
            const tenantQuotaBytes = await this.getTenantQuotaBytes(tenantId);
            const percentUsed = tenantQuotaBytes > BigInt(0)
                ? Math.min(100, parseFloat((((Number(updatedTenantUsage.usedBytes) + Number(updatedTenantUsage.reservedBytes)) /
                    Number(tenantQuotaBytes)) *
                    100).toFixed(1)))
                : 0;
            await quota_governance_service_1.QuotaGovernanceService.evaluateAndTransitionState(tx, tenantId, percentUsed);
        }
        // User update
        const userUsage = await this.getOrCreateUsage(tx, tenantId, userId);
        const userDecr = userUsage.reservedBytes >= bigSizeBytes ? bigSizeBytes : userUsage.reservedBytes;
        await tx.storageUsage.update({
            where: { id: userUsage.id },
            data: {
                reservedBytes: { decrement: userDecr },
                usedBytes: { increment: bigSizeBytes },
                fileCount: { increment: 1 },
            },
        });
    }
    /**
     * Releases in-flight reserved bytes if an upload is aborted or expired.
     */
    static async releaseReservedBytes(tx, tenantId, userId, sizeBytes) {
        const bigSizeBytes = BigInt(sizeBytes);
        if (tenantId) {
            const tenantUsage = await this.getOrCreateUsage(tx, tenantId, null);
            const decr = tenantUsage.reservedBytes >= bigSizeBytes ? bigSizeBytes : tenantUsage.reservedBytes;
            if (decr > BigInt(0)) {
                await tx.storageUsage.update({
                    where: { id: tenantUsage.id },
                    data: { reservedBytes: { decrement: decr } },
                });
            }
        }
        const userUsage = await this.getOrCreateUsage(tx, tenantId, userId);
        const userDecr = userUsage.reservedBytes >= bigSizeBytes ? bigSizeBytes : userUsage.reservedBytes;
        if (userDecr > BigInt(0)) {
            await tx.storageUsage.update({
                where: { id: userUsage.id },
                data: { reservedBytes: { decrement: userDecr } },
            });
        }
    }
    /**
     * Adjusts usage when a file is moved to Trash.
     */
    static async trashFileBytes(tx, tenantId, userId, sizeBytes) {
        const bigSizeBytes = BigInt(sizeBytes);
        if (tenantId) {
            const tenantUsage = await this.getOrCreateUsage(tx, tenantId, null);
            const decr = tenantUsage.usedBytes >= bigSizeBytes ? bigSizeBytes : tenantUsage.usedBytes;
            const updatedTenantUsage = await tx.storageUsage.update({
                where: { id: tenantUsage.id },
                data: {
                    usedBytes: { decrement: decr },
                    trashBytes: { increment: bigSizeBytes },
                },
            });
            const tenantQuotaBytes = await this.getTenantQuotaBytes(tenantId);
            const percentUsed = tenantQuotaBytes > BigInt(0)
                ? Math.min(100, parseFloat((((Number(updatedTenantUsage.usedBytes) + Number(updatedTenantUsage.reservedBytes)) /
                    Number(tenantQuotaBytes)) *
                    100).toFixed(1)))
                : 0;
            await quota_governance_service_1.QuotaGovernanceService.evaluateAndTransitionState(tx, tenantId, percentUsed);
        }
        const userUsage = await this.getOrCreateUsage(tx, tenantId, userId);
        const userDecr = userUsage.usedBytes >= bigSizeBytes ? bigSizeBytes : userUsage.usedBytes;
        await tx.storageUsage.update({
            where: { id: userUsage.id },
            data: {
                usedBytes: { decrement: userDecr },
                trashBytes: { increment: bigSizeBytes },
            },
        });
    }
    /**
     * Adjusts usage when a file is restored from Trash.
     */
    static async restoreFileBytes(tx, tenantId, userId, sizeBytes) {
        const bigSizeBytes = BigInt(sizeBytes);
        if (tenantId) {
            const tenantQuotaBytes = await this.getTenantQuotaBytes(tenantId);
            const tenantUsage = await this.getOrCreateUsage(tx, tenantId, null);
            const projectedBytes = tenantUsage.usedBytes + tenantUsage.reservedBytes + bigSizeBytes;
            if (projectedBytes > tenantQuotaBytes) {
                const available = tenantQuotaBytes > (tenantUsage.usedBytes + tenantUsage.reservedBytes)
                    ? tenantQuotaBytes - (tenantUsage.usedBytes + tenantUsage.reservedBytes)
                    : BigInt(0);
                throw new QuotaExceededError(`Cannot restore file: storage quota would be exceeded.`, "TENANT", sizeBytes, available);
            }
            const decr = tenantUsage.trashBytes >= bigSizeBytes ? bigSizeBytes : tenantUsage.trashBytes;
            const updatedTenantUsage = await tx.storageUsage.update({
                where: { id: tenantUsage.id },
                data: {
                    trashBytes: { decrement: decr },
                    usedBytes: { increment: bigSizeBytes },
                },
            });
            const percentUsed = tenantQuotaBytes > BigInt(0)
                ? Math.min(100, parseFloat((((Number(updatedTenantUsage.usedBytes) + Number(updatedTenantUsage.reservedBytes)) /
                    Number(tenantQuotaBytes)) *
                    100).toFixed(1)))
                : 0;
            await quota_governance_service_1.QuotaGovernanceService.evaluateAndTransitionState(tx, tenantId, percentUsed);
        }
        const userUsage = await this.getOrCreateUsage(tx, tenantId, userId);
        const userDecr = userUsage.trashBytes >= bigSizeBytes ? bigSizeBytes : userUsage.trashBytes;
        await tx.storageUsage.update({
            where: { id: userUsage.id },
            data: {
                trashBytes: { decrement: userDecr },
                usedBytes: { increment: bigSizeBytes },
            },
        });
    }
    /**
     * Adjusts usage when a file is permanently purged.
     */
    static async purgeFileBytes(tx, tenantId, userId, sizeBytes, fromTrash) {
        const bigSizeBytes = BigInt(sizeBytes);
        if (tenantId) {
            const tenantUsage = await this.getOrCreateUsage(tx, tenantId, null);
            let updatedTenantUsage;
            if (fromTrash) {
                const decr = tenantUsage.trashBytes >= bigSizeBytes ? bigSizeBytes : tenantUsage.trashBytes;
                updatedTenantUsage = await tx.storageUsage.update({
                    where: { id: tenantUsage.id },
                    data: {
                        trashBytes: { decrement: decr },
                        fileCount: { decrement: tenantUsage.fileCount > 0 ? 1 : 0 },
                    },
                });
            }
            else {
                const decr = tenantUsage.usedBytes >= bigSizeBytes ? bigSizeBytes : tenantUsage.usedBytes;
                updatedTenantUsage = await tx.storageUsage.update({
                    where: { id: tenantUsage.id },
                    data: {
                        usedBytes: { decrement: decr },
                        fileCount: { decrement: tenantUsage.fileCount > 0 ? 1 : 0 },
                    },
                });
            }
            const tenantQuotaBytes = await this.getTenantQuotaBytes(tenantId);
            const percentUsed = tenantQuotaBytes > BigInt(0)
                ? Math.min(100, parseFloat((((Number(updatedTenantUsage.usedBytes) + Number(updatedTenantUsage.reservedBytes)) /
                    Number(tenantQuotaBytes)) *
                    100).toFixed(1)))
                : 0;
            await quota_governance_service_1.QuotaGovernanceService.evaluateAndTransitionState(tx, tenantId, percentUsed);
        }
        const userUsage = await this.getOrCreateUsage(tx, tenantId, userId);
        if (fromTrash) {
            const decr = userUsage.trashBytes >= bigSizeBytes ? bigSizeBytes : userUsage.trashBytes;
            await tx.storageUsage.update({
                where: { id: userUsage.id },
                data: {
                    trashBytes: { decrement: decr },
                    fileCount: { decrement: userUsage.fileCount > 0 ? 1 : 0 },
                },
            });
        }
        else {
            const decr = userUsage.usedBytes >= bigSizeBytes ? bigSizeBytes : userUsage.usedBytes;
            await tx.storageUsage.update({
                where: { id: userUsage.id },
                data: {
                    usedBytes: { decrement: decr },
                    fileCount: { decrement: userUsage.fileCount > 0 ? 1 : 0 },
                },
            });
        }
    }
    /**
     * Reconciles database records against actual FileVersion/MediaFile tallies.
     */
    static async reconcileStorageUsage(tenantId) {
        const activeFiles = await prisma.mediaFile.findMany({
            where: { tenantId, status: "ACTIVE", deletedAt: null, isFolder: false },
            select: { fileSize: true },
        });
        const usedBytes = activeFiles.reduce((acc, f) => acc + BigInt(f.fileSize || 0), BigInt(0));
        const fileCount = activeFiles.length;
        const trashedFiles = await prisma.mediaFile.findMany({
            where: {
                tenantId,
                OR: [{ status: "TRASHED" }, { deletedAt: { not: null } }],
                isFolder: false,
            },
            select: { fileSize: true },
        });
        const trashBytes = trashedFiles.reduce((acc, f) => acc + BigInt(f.fileSize || 0), BigInt(0));
        const existing = await prisma.storageUsage.findFirst({
            where: { tenantId, userId: null },
        });
        if (existing) {
            await prisma.storageUsage.update({
                where: { id: existing.id },
                data: { usedBytes, trashBytes, fileCount },
            });
        }
        else {
            await prisma.storageUsage.create({
                data: {
                    tenantId,
                    userId: null,
                    usedBytes,
                    trashBytes,
                    reservedBytes: BigInt(0),
                    fileCount,
                },
            });
        }
        return { usedBytes, trashBytes, fileCount };
    }
}
exports.QuotaService = QuotaService;
