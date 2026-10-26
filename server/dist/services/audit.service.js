"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const tenant_context_1 = require("../context/tenant-context");
const prisma_1 = require("../prisma");
class AuditService {
    /**
     * Records an immutable, append-only audit log entry.
     * Supports execution within an existing interactive Prisma transaction ($transaction)
     * or uses the ambient tenant database.
     */
    static async logMutation(params, tx) {
        let db = tx;
        if (!db) {
            try {
                db = (0, tenant_context_1.getTenantDb)();
            }
            catch {
                db = prisma_1.rawPrisma || prisma_1.prisma;
            }
        }
        try {
            return await db.auditLog.create({
                data: {
                    tenantId: params.tenantId,
                    actorId: params.actorId ?? null,
                    actorEmail: params.actorEmail ?? null,
                    action: params.action,
                    entityType: params.entityType,
                    entityId: params.entityId,
                    beforeJson: params.oldState ?? null,
                    afterJson: params.newState ?? params.metadata ?? null,
                    ipAddress: params.ipAddress ?? null,
                    userAgent: params.userAgent ?? null,
                },
            });
        }
        catch (err) {
            if (err.message?.includes("TENANT_CONTEXT_REQUIRED")) {
                try {
                    const fallbackDb = prisma_1.rawPrisma || prisma_1.prisma;
                    return await fallbackDb.auditLog.create({
                        data: {
                            tenantId: params.tenantId,
                            actorId: params.actorId ?? null,
                            actorEmail: params.actorEmail ?? null,
                            action: params.action,
                            entityType: params.entityType,
                            entityId: params.entityId,
                            beforeJson: params.oldState ?? null,
                            afterJson: params.newState ?? params.metadata ?? null,
                            ipAddress: params.ipAddress ?? null,
                            userAgent: params.userAgent ?? null,
                        },
                    });
                }
                catch (innerErr) {
                    console.error("[AuditService] Failed to create audit log entry with fallback:", innerErr.message);
                }
            }
            console.error("[AuditService] Failed to create audit log entry:", err.message);
            // Audit failure should not crash transaction unless strict audit mode is enforced
            return null;
        }
    }
    static async record(params) {
        return this.logMutation({
            tenantId: params.tenantId,
            actorId: params.actorId,
            action: params.action,
            entityType: params.entityType,
            entityId: params.entityId,
            oldState: params.oldValues,
            newState: params.newValues,
            metadata: params.details,
        });
    }
    static async log(params, tx) {
        return this.logMutation({
            tenantId: params.tenantId,
            actorId: params.actorId || params.userId,
            actorEmail: params.actorEmail,
            action: params.action,
            entityType: params.entityType || params.resourceType || params.entity || "SYSTEM",
            entityId: params.entityId || params.resourceId || "unknown",
            metadata: params.metadata || params.details || params.changes,
        }, tx);
    }
    static async logAudit(paramsOrTenantId, actorIdOrTx, action, entityType, entityId, details) {
        if (typeof paramsOrTenantId === "object") {
            const p = paramsOrTenantId;
            return this.log({
                tenantId: p.tenantId,
                actorId: p.actorId || p.userId,
                action: p.action,
                entityType: p.entityType || p.entity,
                entityId: p.entityId,
                details: p.details || p.afterState || p.metadata,
            }, actorIdOrTx);
        }
        return this.log({
            tenantId: paramsOrTenantId,
            actorId: actorIdOrTx,
            action: action,
            entityType: entityType,
            entityId: entityId,
            details,
        });
    }
    /**
     * Retrieves audit log trail for a specific entity.
     */
    static async getEntityAuditTrail(tenantId, entityType, entityId, limit = 50) {
        const db = (0, tenant_context_1.getTenantDb)();
        return await db.auditLog.findMany({
            where: {
                tenantId,
                entityType,
                entityId,
            },
            orderBy: { createdAt: "desc" },
            take: limit,
        });
    }
}
exports.AuditService = AuditService;
