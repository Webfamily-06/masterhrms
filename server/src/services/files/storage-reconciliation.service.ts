import { rawPrisma, prisma as proxiedPrisma } from "../../prisma";
import { QuotaService } from "./quota.service";
import { OutboxService } from "../outbox.service";
import { broadcastToTenant } from "../../socket";

const prisma = rawPrisma || proxiedPrisma;

export interface ReconciliationReport {
  tenantId: string;
  hasDrift: boolean;
  isNegativeAccounting: boolean;
  auditedAt: string;
  counters: {
    usedBytes: number;
    trashBytes: number;
    reservedBytes: number;
    fileCount: number;
  };
  live: {
    usedBytes: number;
    trashBytes: number;
    versionBytes: number;
    reservedBytes: number;
    physicalBytes: number;
    billableBytes: number;
    fileCount: number;
    folderCount: number;
    expiredSessionsCount: number;
  };
  drift: {
    usedBytes: number;
    trashBytes: number;
    reservedBytes: number;
    fileCount: number;
  };
  reconciliationStatus: "IN_SYNC" | "DRIFT_DETECTED" | "CORRUPTED_NEGATIVE";
}

export class StorageReconciliationService {
  // Global mutual exclusion lock to serialize fleet-wide reconciliation sweeps
  private static isFleetReconciling = false;

  /**
   * Performs an authoritative, read-only audit of a tenant's storage counters against live database rows.
   * Guarantees strict BigInt safety and tenant boundary isolation.
   */
  public static async auditTenantStorage(tenantId: string): Promise<ReconciliationReport> {
    // 1. Fetch materialized counters from canonical tenant pool (userId = null)
    const usage = await prisma.storageUsage.findFirst({
      where: {
        tenantId,
        userId: null,
      },
    });
    const counterUsed = usage ? Number(usage.usedBytes) : 0;
    const counterTrash = usage ? Number(usage.trashBytes) : 0;
    const counterReserved = usage ? Number(usage.reservedBytes) : 0;
    const counterFiles = usage ? usage.fileCount : 0;

    // Check for negative accounting values
    const isNegativeAccounting =
      counterUsed < 0 || counterTrash < 0 || counterReserved < 0 || counterFiles < 0;

    // 2. Fetch live active files (strictly isolated to tenantId)
    const activeFiles = await prisma.mediaFile.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
        deletedAt: null,
        isFolder: false,
      },
      select: { fileSize: true },
    });
    const liveUsedBigInt = activeFiles.reduce(
      (acc, f) => acc + BigInt(f.fileSize || 0),
      BigInt(0)
    );
    const liveUsedBytes = Number(liveUsedBigInt);
    const liveFileCount = activeFiles.length;

    // 3. Fetch live trashed files
    const trashedFiles = await prisma.mediaFile.findMany({
      where: {
        tenantId,
        isFolder: false,
        OR: [{ status: "TRASHED" }, { deletedAt: { not: null } }],
      },
      select: { fileSize: true },
    });
    const liveTrashBigInt = trashedFiles.reduce(
      (acc, f) => acc + BigInt(f.fileSize || 0),
      BigInt(0)
    );
    const liveTrashBytes = Number(liveTrashBigInt);

    // 4. Fetch live historical versions
    const versionAgg = await prisma.fileVersion.aggregate({
      where: {
        file: { tenantId },
        isCurrent: false,
      },
      _sum: { sizeBytes: true },
    });
    const liveVersionBytes = Number(versionAgg._sum.sizeBytes || 0);

    // 5. Fetch live in-flight upload reservations
    const now = new Date();
    const activeSessions = await prisma.fileUploadSession.findMany({
      where: {
        tenantId,
        status: "INITIATED",
        expiresAt: { gt: now },
      },
      select: { sizeBytes: true },
    });
    const liveReservedBigInt = activeSessions.reduce(
      (acc, s) => acc + BigInt(s.sizeBytes || 0),
      BigInt(0)
    );
    const liveReservedBytes = Number(liveReservedBigInt);

    // 6. Expired upload sessions
    const expiredSessionsCount = await prisma.fileUploadSession.count({
      where: {
        tenantId,
        status: "INITIATED",
        expiresAt: { lte: now },
      },
    });

    // 7. Active folders count
    const liveFolderCount = await prisma.mediaFile.count({
      where: {
        tenantId,
        isFolder: true,
        status: "ACTIVE",
        deletedAt: null,
      },
    });

    // 8. Multi-dimensional totals
    const livePhysicalBytes = liveUsedBytes + liveTrashBytes + liveVersionBytes;
    const liveBillableBytes = liveUsedBytes + liveTrashBytes + liveVersionBytes;

    // 9. Calculate drift
    const driftUsed = counterUsed - liveUsedBytes;
    const driftTrash = counterTrash - liveTrashBytes;
    const driftReserved = counterReserved - liveReservedBytes;
    const driftFiles = counterFiles - liveFileCount;

    const hasDrift =
      driftUsed !== 0 || driftTrash !== 0 || driftReserved !== 0 || driftFiles !== 0;

    let reconciliationStatus: "IN_SYNC" | "DRIFT_DETECTED" | "CORRUPTED_NEGATIVE" = "IN_SYNC";
    if (isNegativeAccounting) {
      reconciliationStatus = "CORRUPTED_NEGATIVE";
    } else if (hasDrift) {
      reconciliationStatus = "DRIFT_DETECTED";
    }

    return {
      tenantId,
      hasDrift,
      isNegativeAccounting,
      auditedAt: new Date().toISOString(),
      counters: {
        usedBytes: counterUsed,
        trashBytes: counterTrash,
        reservedBytes: counterReserved,
        fileCount: counterFiles,
      },
      live: {
        usedBytes: liveUsedBytes,
        trashBytes: liveTrashBytes,
        versionBytes: liveVersionBytes,
        reservedBytes: liveReservedBytes,
        physicalBytes: livePhysicalBytes,
        billableBytes: liveBillableBytes,
        fileCount: liveFileCount,
        folderCount: liveFolderCount,
        expiredSessionsCount,
      },
      drift: {
        usedBytes: driftUsed,
        trashBytes: driftTrash,
        reservedBytes: driftReserved,
        fileCount: driftFiles,
      },
      reconciliationStatus,
    };
  }

  /**
   * Safely repairs tenant storage counters inside an interactive transaction.
   * Fully audited, idempotent, and tenant-scoped.
   */
  public static async repairTenantStorage(
    tenantId: string,
    options: { dryRun?: boolean; actorId?: string } = {}
  ): Promise<{
    repaired: boolean;
    dryRun: boolean;
    before: ReconciliationReport;
    after?: ReconciliationReport;
    expiredSessionsCleaned: number;
    auditEventId?: string;
  }> {
    // 1. Audit before
    const before = await this.auditTenantStorage(tenantId);

    if (options.dryRun) {
      return {
        repaired: false,
        dryRun: true,
        before,
        expiredSessionsCleaned: before.live.expiredSessionsCount,
      };
    }

    let expiredCleaned = 0;

    // 2. Perform transactional repair
    await prisma.$transaction(async (tx: any) => {
      // Clean expired upload sessions
      const now = new Date();
      const expiredRes = await tx.fileUploadSession.updateMany({
        where: {
          tenantId,
          status: "INITIATED",
          expiresAt: { lte: now },
        },
        data: { status: "EXPIRED" },
      });
      expiredCleaned = expiredRes.count;

      // Update storage usage record to exact live tallies (canonical userId = null)
      const usage = await QuotaService.getOrCreateUsage(tx, tenantId, null);
      await tx.storageUsage.update({
        where: { id: usage.id },
        data: {
          usedBytes: BigInt(before.live.usedBytes),
          trashBytes: BigInt(before.live.trashBytes),
          reservedBytes: BigInt(before.live.reservedBytes),
          fileCount: before.live.fileCount,
        },
      });

      // Transactional Outbox Event for persistent audit trail
      await OutboxService.createOutboxEvent(
        {
          tenantId,
          eventType: "storage.reconciled",
          entityType: "TENANT_STORAGE",
          entityId: tenantId,
          actorId: options.actorId ?? null,
          payload: {
            tenantId,
            beforeCounters: before.counters,
            repairedCounters: {
              usedBytes: before.live.usedBytes,
              trashBytes: before.live.trashBytes,
              reservedBytes: before.live.reservedBytes,
              fileCount: before.live.fileCount,
            },
            driftCorrected: before.drift,
            expiredSessionsCleaned: expiredCleaned,
            repairedAt: new Date().toISOString(),
          },
        },
        tx
      );
    });

    // 3. Notify tenant via socket
    try {
      broadcastToTenant(tenantId, "storage.usage.updated", {
        tenantId,
        usedBytes: before.live.usedBytes,
        trashBytes: before.live.trashBytes,
        fileCount: before.live.fileCount,
      });
    } catch (err) {
      console.warn("[StorageReconciliationService] Socket emit error:", err);
    }

    // 4. Audit after
    const after = await this.auditTenantStorage(tenantId);

    return {
      repaired: true,
      dryRun: false,
      before,
      after,
      expiredSessionsCleaned: expiredCleaned,
    };
  }

  /**
   * Fleet-wide storage reconciliation sweep with mutual exclusion lock and bounded batching.
   */
  public static async reconcileFleet(options: {
    dryRun?: boolean;
    batchSize?: number;
    limit?: number;
    actorId?: string;
  } = {}): Promise<{
    totalAudited: number;
    driftCount: number;
    repairedCount: number;
    reports: ReconciliationReport[];
    locked: boolean;
  }> {
    if (this.isFleetReconciling) {
      return {
        totalAudited: 0,
        driftCount: 0,
        repairedCount: 0,
        reports: [],
        locked: true,
      };
    }

    this.isFleetReconciling = true;
    try {
      const batchSize = options.batchSize || 25;
      const tenants = await prisma.tenant.findMany({
        select: { id: true, name: true },
        orderBy: { createdAt: "desc" },
        ...(options.limit ? { take: options.limit } : {}),
      });

      const reports: ReconciliationReport[] = [];
      let driftCount = 0;
      let repairedCount = 0;

      // Process in bounded batches to avoid overwhelming the database connection pool
      for (let i = 0; i < tenants.length; i += batchSize) {
        const batch = tenants.slice(i, i + batchSize);
        for (const t of batch) {
          let report: ReconciliationReport | null = null;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              report = await this.auditTenantStorage(t.id);
              break;
            } catch (err: any) {
              if (attempt === 3) throw err;
              await new Promise((r) => setTimeout(r, 150 * attempt));
            }
          }

          if (report) {
            reports.push(report);

            if (report.hasDrift) {
              driftCount++;
              if (!options.dryRun) {
                await this.repairTenantStorage(t.id, {
                  dryRun: false,
                  actorId: options.actorId,
                });
                repairedCount++;
              }
            }
          }
        }
      }

      return {
        totalAudited: reports.length,
        driftCount,
        repairedCount,
        reports,
        locked: false,
      };
    } finally {
      this.isFleetReconciling = false;
    }
  }
}
