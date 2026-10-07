import { PrismaClient } from "@prisma/client";
import { getTenantDb } from "../context/tenant-context";

export interface CreateAuditLogParams {
  tenantId: string;
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldState?: any;
  newState?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: any;
}

export class AuditService {
  /**
   * Records an immutable, append-only audit log entry.
   * Supports execution within an existing interactive Prisma transaction ($transaction)
   * or uses the ambient tenant database.
   */
  public static async logMutation(
    params: CreateAuditLogParams,
    tx?: PrismaClient | any
  ): Promise<any> {
    const db = tx || getTenantDb();

    try {
      return await db.auditLog.create({
        data: {
          tenantId: params.tenantId,
          actorId: params.actorId ?? null,
          actorEmail: params.actorEmail ?? null,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          oldState: params.oldState ?? null,
          newState: params.newState ?? null,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
          metadata: params.metadata ?? null,
        },
      });
    } catch (err: any) {
      console.error("[AuditService] Failed to create audit log entry:", err.message);
      // Audit failure should not crash transaction unless strict audit mode is enforced
      return null;
    }
  }

  public static async log(params: {
    tenantId: string;
    actorId?: string | null;
    actorEmail?: string | null;
    action: string;
    entity?: string;
    entityType?: string;
    resourceType?: string;
    entityId?: string;
    resourceId?: string;
    details?: any;
    metadata?: any;
  }, tx?: PrismaClient | any) {
    return this.logMutation({
      tenantId: params.tenantId,
      actorId: params.actorId,
      actorEmail: params.actorEmail,
      action: params.action,
      entityType: params.entityType || params.resourceType || params.entity || "SYSTEM",
      entityId: params.entityId || params.resourceId || "unknown",
      metadata: params.metadata || params.details,
    }, tx);
  }

  public static async logAudit(
    paramsOrTenantId: any,
    actorIdOrTx?: any,
    action?: string,
    entityType?: string,
    entityId?: string,
    details?: any
  ) {
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
      action: action!,
      entityType: entityType!,
      entityId: entityId!,
      details,
    });
  }

  /**
   * Retrieves audit log trail for a specific entity.
   */
  public static async getEntityAuditTrail(
    tenantId: string,
    entityType: string,
    entityId: string,
    limit = 50
  ): Promise<any[]> {
    const db = getTenantDb();
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
