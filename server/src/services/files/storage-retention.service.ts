import { rawPrisma, prisma as proxiedPrisma } from "../../prisma";
import { StorageProviderFactory } from "../storage/storage-provider.factory";
import { QuotaService } from "./quota.service";
import { StorageUsageEngine } from "./storage-usage.engine";
import { StorageReconciliationService } from "./storage-reconciliation.service";
import { OutboxService } from "../outbox.service";
import { broadcastToTenant, broadcastToPlatform } from "../../socket";

const prisma = (rawPrisma || proxiedPrisma) as any;

export interface RetentionPolicyData {
  isEnabled?: boolean;
  isDryRun?: boolean;
  trashRetentionDays?: number;
  versionRetentionDays?: number | null;
  maxVersionsPerFile?: number | null;
  cleanExpiredLinks?: boolean;
  cleanAbandonedSessions?: boolean;
  requiresApproval?: boolean;
  excludedFolders?: string[];
}

export interface CandidateEvaluationResult {
  eligibleFiles: any[];
  eligibleVersions: any[];
  expiredLinks: any[];
  abandonedSessions: any[];
  skippedItems: {
    id: string;
    fileName: string;
    reason: string;
    details?: string;
  }[];
  totalEligibleBytes: bigint;
  totalEligibleCount: number;
  oldestCandidateDate: Date | null;
  newestCandidateDate: Date | null;
  heldCount: number;
  protectedCount: number;
  skippedBreakdown: Record<string, number>;
}

export interface DryRunPreviewResponse {
  tenantId: string;
  policy: any;
  eligibleCount: number;
  eligibleBytes: number;
  formattedEligibleBytes: string;
  oldestCandidateDate: Date | null;
  newestCandidateDate: Date | null;
  heldCount: number;
  protectedCount: number;
  skippedBreakdown: Record<string, number>;
  sampleCandidates: any[];
  proposedExecutionTime: Date;
  policyVersion: number;
}

export class StorageRetentionService {
  /**
   * Format bytes into human-readable string
   */
  public static formatBytes(bytes: number | bigint): string {
    const b = Number(bytes);
    if (b === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(Math.max(b, 1)) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  /**
   * Get default canonical retention policy
   */
  public static getDefaultPolicy(tenantId: string | null = null): any {
    return {
      id: "default-policy",
      tenantId,
      isEnabled: false, // SAFE-BY-DEFAULT: always false until explicit admin activation
      isDryRun: true, // SAFE-BY-DEFAULT: preview only
      trashRetentionDays: 30, // Preserve F0 canonical 30-day decision
      versionRetentionDays: null, // Disabled by default
      maxVersionsPerFile: null, // Disabled by default
      cleanExpiredLinks: false,
      cleanAbandonedSessions: true,
      requiresApproval: false,
      excludedFolders: [],
      policyVersion: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Get effective retention policy for a tenant
   */
  public static async getTenantPolicy(tenantId: string | null): Promise<any> {
    if (!tenantId) {
      // Platform-wide default policy
      const platformPolicy = await prisma.storageRetentionPolicy.findFirst({
        where: { tenantId: null },
      });
      return platformPolicy || this.getDefaultPolicy(null);
    }

    // Tenant-specific policy
    const tenantPolicy = await prisma.storageRetentionPolicy.findUnique({
      where: { tenantId },
    });

    if (tenantPolicy) return tenantPolicy;

    // Fall back to platform policy or default
    const platformPolicy = await prisma.storageRetentionPolicy.findFirst({
      where: { tenantId: null },
    });
    return platformPolicy || this.getDefaultPolicy(tenantId);
  }

  /**
   * Upsert tenant retention policy with safety validation
   */
  public static async upsertTenantPolicy(
    tenantId: string | null,
    data: RetentionPolicyData,
    actorId?: string
  ): Promise<any> {
    // Parameter validation
    if (data.trashRetentionDays !== undefined && (data.trashRetentionDays < 1 || data.trashRetentionDays > 3650)) {
      throw new Error("Trash retention days must be between 1 and 3650 days.");
    }
    if (data.versionRetentionDays !== undefined && data.versionRetentionDays !== null && data.versionRetentionDays < 1) {
      throw new Error("Version retention days must be at least 1 day when specified.");
    }
    if (data.maxVersionsPerFile !== undefined && data.maxVersionsPerFile !== null && data.maxVersionsPerFile < 1) {
      throw new Error("Max versions per file must be at least 1 when specified.");
    }

    const existing = tenantId
      ? await prisma.storageRetentionPolicy.findUnique({ where: { tenantId } })
      : await prisma.storageRetentionPolicy.findFirst({ where: { tenantId: null } });

    const newVersion = existing ? existing.policyVersion + 1 : 1;

    let policy;
    if (existing) {
      policy = await prisma.storageRetentionPolicy.update({
        where: { id: existing.id },
        data: {
          isEnabled: data.isEnabled !== undefined ? data.isEnabled : existing.isEnabled,
          isDryRun: data.isDryRun !== undefined ? data.isDryRun : existing.isDryRun,
          trashRetentionDays: data.trashRetentionDays ?? existing.trashRetentionDays,
          versionRetentionDays:
            data.versionRetentionDays !== undefined ? data.versionRetentionDays : existing.versionRetentionDays,
          maxVersionsPerFile:
            data.maxVersionsPerFile !== undefined ? data.maxVersionsPerFile : existing.maxVersionsPerFile,
          cleanExpiredLinks: data.cleanExpiredLinks ?? existing.cleanExpiredLinks,
          cleanAbandonedSessions: data.cleanAbandonedSessions ?? existing.cleanAbandonedSessions,
          requiresApproval: data.requiresApproval ?? existing.requiresApproval,
          excludedFolders: data.excludedFolders ?? existing.excludedFolders,
          policyVersion: newVersion,
          updatedBy: actorId || null,
        },
      });
    } else {
      policy = await prisma.storageRetentionPolicy.create({
        data: {
          tenantId,
          isEnabled: data.isEnabled ?? false, // Safe default
          isDryRun: data.isDryRun ?? true, // Safe default
          trashRetentionDays: data.trashRetentionDays ?? 30,
          versionRetentionDays: data.versionRetentionDays ?? null,
          maxVersionsPerFile: data.maxVersionsPerFile ?? null,
          cleanExpiredLinks: data.cleanExpiredLinks ?? false,
          cleanAbandonedSessions: data.cleanAbandonedSessions ?? true,
          requiresApproval: data.requiresApproval ?? false,
          excludedFolders: data.excludedFolders ?? [],
          policyVersion: 1,
          updatedBy: actorId || null,
        },
      });
    }

    // Outbox & Realtime Notification
    if (tenantId) {
      await OutboxService.createOutboxEvent({
        tenantId,
        eventType: "storage.retention.policy_updated",
        entityType: "StorageRetentionPolicy",
        entityId: policy.id,
        actorId: actorId || null,
        payload: { policyId: policy.id, isEnabled: policy.isEnabled, isDryRun: policy.isDryRun, policyVersion: policy.policyVersion },
      });
      broadcastToTenant(tenantId, "retention:policy:updated", {
        policyId: policy.id,
        isEnabled: policy.isEnabled,
        isDryRun: policy.isDryRun,
        policyVersion: policy.policyVersion,
      });
    } else {
      broadcastToPlatform("retention:policy:platform_updated", {
        policyId: policy.id,
        policyVersion: policy.policyVersion,
      });
    }

    return policy;
  }

  /**
   * Toggle policy active state with safety checks
   */
  public static async togglePolicy(tenantId: string | null, isEnabled: boolean, actorId?: string): Promise<any> {
    return this.upsertTenantPolicy(tenantId, { isEnabled }, actorId);
  }

  // =========================================================================
  // LEGAL HOLD LIFECYCLE MANAGEMENT
  // =========================================================================

  /**
   * Place an active legal hold on a file or specific version
   */
  public static async createLegalHold(options: {
    tenantId: string;
    fileId: string;
    fileVersionId?: string;
    reason: string;
    holdScope?: "FILE" | "VERSION";
    actorId: string;
  }): Promise<any> {
    if (!options.reason || options.reason.trim().length < 3) {
      throw new Error("A valid, descriptive reason is required to place a legal hold.");
    }

    // Verify file exists and belongs to tenant
    const file = await prisma.mediaFile.findUnique({
      where: { id: options.fileId },
      include: { versions: true },
    });

    if (!file) {
      const err: any = new Error("Target file not found.");
      err.status = 404;
      throw err;
    }

    if (file.tenantId !== options.tenantId) {
      const err: any = new Error("Forbidden: Access denied to asset in another tenant.");
      err.status = 403;
      throw err;
    }

    if (options.fileVersionId) {
      const versionExists = file.versions.some((v: any) => v.id === options.fileVersionId);
      if (!versionExists) {
        throw new Error("Specified file version not found on target file.");
      }
    }

    // Check if an identical active hold already exists
    const existing = await prisma.storageLegalHold.findFirst({
      where: {
        tenantId: options.tenantId,
        fileId: options.fileId,
        fileVersionId: options.fileVersionId || null,
        releasedAt: null,
      },
    });

    if (existing) {
      return existing; // Idempotent
    }

    const hold = await prisma.storageLegalHold.create({
      data: {
        tenantId: options.tenantId,
        fileId: options.fileId,
        fileVersionId: options.fileVersionId || null,
        reason: options.reason.trim(),
        holdScope: options.holdScope || (options.fileVersionId ? "VERSION" : "FILE"),
        createdBy: options.actorId,
      },
    });

    // Record audit event in FileActivity
    await prisma.fileActivity.create({
      data: {
        fileId: options.fileId,
        tenantId: options.tenantId,
        actorId: options.actorId,
        action: "legal_hold_created",
        metaJson: {
          holdId: hold.id,
          reason: hold.reason,
          holdScope: hold.holdScope,
          fileVersionId: hold.fileVersionId,
        },
      },
    });

    // Outbox & Realtime event
    await OutboxService.createOutboxEvent({
      tenantId: options.tenantId,
      eventType: "storage.legal_hold.created",
      entityType: "StorageLegalHold",
      entityId: hold.id,
      actorId: options.actorId,
      payload: { holdId: hold.id, fileId: file.id, fileName: file.fileName, reason: hold.reason },
    });

    broadcastToTenant(options.tenantId, "retention:hold:created", {
      holdId: hold.id,
      fileId: file.id,
      fileName: file.fileName,
      reason: hold.reason,
    });

    return hold;
  }

  /**
   * Release an active legal hold
   */
  public static async releaseLegalHold(options: {
    tenantId: string;
    holdId: string;
    releaseReason: string;
    actorId: string;
  }): Promise<any> {
    if (!options.releaseReason || options.releaseReason.trim().length < 3) {
      throw new Error("A valid release reason is required to release a legal hold.");
    }

    const hold = await prisma.storageLegalHold.findUnique({
      where: { id: options.holdId },
      include: { file: true },
    });

    if (!hold) {
      const err: any = new Error("Legal hold record not found.");
      err.status = 404;
      throw err;
    }

    if (hold.tenantId !== options.tenantId) {
      const err: any = new Error("Forbidden: Access denied to legal hold in another tenant.");
      err.status = 403;
      throw err;
    }

    if (hold.releasedAt) {
      return hold; // Already released (idempotent)
    }

    const updated = await prisma.storageLegalHold.update({
      where: { id: hold.id },
      data: {
        releasedAt: new Date(),
        releaseReason: options.releaseReason.trim(),
        releasedBy: options.actorId,
      },
    });

    // Audit log
    await prisma.fileActivity.create({
      data: {
        fileId: hold.fileId,
        tenantId: options.tenantId,
        actorId: options.actorId,
        action: "legal_hold_released",
        metaJson: {
          holdId: hold.id,
          releaseReason: updated.releaseReason,
        },
      },
    });

    // Outbox & Realtime
    await OutboxService.createOutboxEvent({
      tenantId: options.tenantId,
      eventType: "storage.legal_hold.released",
      entityType: "StorageLegalHold",
      entityId: hold.id,
      actorId: options.actorId,
      payload: { holdId: hold.id, fileId: hold.fileId, releaseReason: updated.releaseReason },
    });

    broadcastToTenant(options.tenantId, "retention:hold:released", {
      holdId: hold.id,
      fileId: hold.fileId,
      releaseReason: updated.releaseReason,
    });

    return updated;
  }

  /**
   * List legal holds for a tenant
   */
  public static async listLegalHolds(
    tenantId: string,
    options: { fileId?: string; activeOnly?: boolean; page?: number; limit?: number } = {}
  ): Promise<any> {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (options.fileId) where.fileId = options.fileId;
    if (options.activeOnly) where.releasedAt = null;

    const [holds, total] = await Promise.all([
      prisma.storageLegalHold.findMany({
        where,
        include: {
          file: {
            select: { id: true, fileName: true, fileSize: true, mimeType: true, folder: true, status: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.storageLegalHold.count({ where }),
    ]);

    return {
      holds,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Fast check: returns true if file or specific version is under active legal hold
   */
  public static async isUnderLegalHold(fileId: string, fileVersionId?: string): Promise<boolean> {
    const where: any = {
      fileId,
      releasedAt: null,
    };

    if (fileVersionId) {
      where.OR = [{ fileVersionId }, { fileVersionId: null }];
    }

    const hold = await prisma.storageLegalHold.findFirst({ where });
    return !!hold;
  }

  // =========================================================================
  // CANDIDATE EVALUATION & SAFETY FILTER PIPELINE
  // =========================================================================

  /**
   * Evaluates all items in trash and historical records against safety guards
   */
  public static async evaluateCandidates(
    tenantId: string,
    overridePolicy?: any
  ): Promise<CandidateEvaluationResult> {
    const policy = overridePolicy || (await this.getTenantPolicy(tenantId));
    const trashRetentionDays = policy.trashRetentionDays ?? 30;
    const cutoffDate = new Date(Date.now() - trashRetentionDays * 24 * 60 * 60 * 1000);

    // 1. Fetch all items in trash for this tenant
    const trashedFiles = await prisma.mediaFile.findMany({
      where: {
        tenantId,
        OR: [{ status: "TRASHED" }, { deletedAt: { not: null } }],
      },
      include: {
        versions: true,
        usages: true,
        fileLinks: true,
        legalHolds: {
          where: { releasedAt: null },
        },
      },
    });

    const eligibleFiles: any[] = [];
    const skippedItems: any[] = [];
    const skippedBreakdown: Record<string, number> = {
      LEGAL_HOLD_PROTECTED: 0,
      BUSINESS_REFERENCE_PROTECTED: 0,
      SYSTEM_PROTECTED: 0,
      RETENTION_PERIOD_NOT_ELAPSED: 0,
      EXCLUDED_FOLDER: 0,
      ACTIVE_FILE_GUARD: 0,
      DESCENDANTS_REMAINING: 0,
    };

    let totalEligibleBytes = BigInt(0);
    let oldestCandidateDate: Date | null = null;
    let newestCandidateDate: Date | null = null;
    let heldCount = 0;
    let protectedCount = 0;

    for (const file of trashedFiles) {
      // Safety Invariant 1: Active files are never deleted by age alone
      if (file.status === "ACTIVE" && !file.deletedAt && !file.trashedAt) {
        skippedItems.push({
          id: file.id,
          fileName: file.fileName,
          reason: "ACTIVE_FILE_GUARD",
          details: "Active business files are strictly protected from age-based retention deletion.",
        });
        skippedBreakdown.ACTIVE_FILE_GUARD++;
        continue;
      }

      // Safety Invariant 2: Legal Hold Exclusion
      if (file.legalHolds && file.legalHolds.length > 0) {
        heldCount++;
        skippedBreakdown.LEGAL_HOLD_PROTECTED++;
        skippedItems.push({
          id: file.id,
          fileName: file.fileName,
          reason: "LEGAL_HOLD_PROTECTED",
          details: `Protected by active Legal Hold "${file.legalHolds[0].reason}".`,
        });
        continue;
      }

      // Safety Invariant 3: Business Reference Protection (MediaUsage or FileLink)
      const activeUsages = file.usages ? file.usages.length : 0;
      const activeLinks = file.fileLinks ? file.fileLinks.length : 0;
      if (activeUsages > 0 || activeLinks > 0) {
        protectedCount++;
        skippedBreakdown.BUSINESS_REFERENCE_PROTECTED++;
        skippedItems.push({
          id: file.id,
          fileName: file.fileName,
          reason: "BUSINESS_REFERENCE_PROTECTED",
          details: `Referenced by ${activeUsages} business entity and ${activeLinks} internal document link(s).`,
        });
        continue;
      }

      // Safety Invariant 4: System Folder / Module Protection
      if (file.systemModule || file.systemPage) {
        protectedCount++;
        skippedBreakdown.SYSTEM_PROTECTED++;
        skippedItems.push({
          id: file.id,
          fileName: file.fileName,
          reason: "SYSTEM_PROTECTED",
          details: "System directory or application core module cannot be purged.",
        });
        continue;
      }

      // Safety Invariant 5: Excluded Folder Configuration
      if (
        policy.excludedFolders &&
        Array.isArray(policy.excludedFolders) &&
        policy.excludedFolders.includes(file.folder)
      ) {
        skippedBreakdown.EXCLUDED_FOLDER++;
        skippedItems.push({
          id: file.id,
          fileName: file.fileName,
          reason: "EXCLUDED_FOLDER",
          details: `Folder "${file.folder}" is explicitly excluded from retention policy.`,
        });
        continue;
      }

      // Safety Invariant 6: Retention Period Cutoff
      const trashedDate = file.trashedAt || file.deletedAt || file.updatedAt;
      if (trashedDate > cutoffDate) {
        skippedBreakdown.RETENTION_PERIOD_NOT_ELAPSED++;
        skippedItems.push({
          id: file.id,
          fileName: file.fileName,
          reason: "RETENTION_PERIOD_NOT_ELAPSED",
          details: `Item has been in trash since ${trashedDate.toISOString()}, less than the required ${trashRetentionDays} days.`,
        });
        continue;
      }

      // Safety Invariant 7: Trashed Folder Descendant Check
      if (file.isFolder || file.type === "FOLDER") {
        const folderPath = file.materializedPath || `/${file.id}`;
        const remainingDescendants = await prisma.mediaFile.count({
          where: {
            materializedPath: { startsWith: `${folderPath}/` },
          },
        });
        if (remainingDescendants > 0) {
          skippedBreakdown.DESCENDANTS_REMAINING = (skippedBreakdown.DESCENDANTS_REMAINING || 0) + 1;
          skippedItems.push({
            id: file.id,
            fileName: file.fileName,
            reason: "DESCENDANTS_REMAINING",
            details: `Folder contains ${remainingDescendants} descendant item(s) that must be purged first.`,
          });
          continue;
        }
      }

      // File is eligible for permanent purge!
      eligibleFiles.push(file);
      const size = BigInt(file.fileSize || 0);
      totalEligibleBytes += size;

      if (!oldestCandidateDate || trashedDate < oldestCandidateDate) {
        oldestCandidateDate = trashedDate;
      }
      if (!newestCandidateDate || trashedDate > newestCandidateDate) {
        newestCandidateDate = trashedDate;
      }
    }

    // 2. Historical Version Retention Evaluation (if configured)
    const eligibleVersions: any[] = [];
    if (policy.versionRetentionDays || policy.maxVersionsPerFile) {
      const activeFilesWithVersions = await prisma.mediaFile.findMany({
        where: {
          tenantId,
          status: "ACTIVE",
          deletedAt: null,
        },
        include: {
          versions: {
            where: { isCurrent: false },
            orderBy: { versionNo: "desc" },
          },
          legalHolds: {
            where: { releasedAt: null },
          },
        },
      });

      for (const file of activeFilesWithVersions) {
        // If file is under legal hold, all its versions are protected
        if (file.legalHolds && file.legalHolds.length > 0) continue;

        const versions = file.versions;
        if (!versions || versions.length === 0) continue;

        // Version count pruning
        if (policy.maxVersionsPerFile && versions.length > policy.maxVersionsPerFile) {
          const excess = versions.slice(policy.maxVersionsPerFile);
          for (const ver of excess) {
            eligibleVersions.push({ ...ver, fileId: file.id, tenantId });
            totalEligibleBytes += BigInt(ver.sizeBytes || 0);
          }
        }

        // Version age pruning
        if (policy.versionRetentionDays) {
          const verCutoff = new Date(Date.now() - policy.versionRetentionDays * 24 * 60 * 60 * 1000);
          for (const ver of versions) {
            if (ver.createdAt < verCutoff && !eligibleVersions.some((v) => v.id === ver.id)) {
              eligibleVersions.push({ ...ver, fileId: file.id, tenantId });
              totalEligibleBytes += BigInt(ver.sizeBytes || 0);
            }
          }
        }
      }
    }

    // 3. Expired Public Links Evaluation
    let expiredLinks: any[] = [];
    if (policy.cleanExpiredLinks) {
      expiredLinks = await prisma.fileAcl.findMany({
        where: {
          file: { tenantId },
          principalType: "LINK",
          expiresAt: { lt: new Date() },
        },
      });
    }

    // 4. Abandoned Upload Sessions Evaluation (older than 24h)
    let abandonedSessions: any[] = [];
    if (policy.cleanAbandonedSessions) {
      const sessionCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      abandonedSessions = await prisma.fileUploadSession.findMany({
        where: {
          tenantId,
          status: { in: ["INITIATED", "UPLOADING", "ABORTED"] },
          expiresAt: { lt: sessionCutoff },
        },
      });
    }

    return {
      eligibleFiles,
      eligibleVersions,
      expiredLinks,
      abandonedSessions,
      skippedItems,
      totalEligibleBytes,
      totalEligibleCount: eligibleFiles.length + eligibleVersions.length,
      oldestCandidateDate,
      newestCandidateDate,
      heldCount,
      protectedCount,
      skippedBreakdown,
    };
  }

  // =========================================================================
  // DRY-RUN PREVIEW
  // =========================================================================

  /**
   * Generates a non-destructive dry-run preview for tenant administration
   */
  public static async createDryRunPreview(
    tenantId: string,
    actorId?: string
  ): Promise<DryRunPreviewResponse> {
    const policy = await this.getTenantPolicy(tenantId);
    const evaluation = await this.evaluateCandidates(tenantId, policy);

    const sampleCandidates = evaluation.eligibleFiles.slice(0, 20).map((f: any) => ({
      id: f.id,
      fileName: f.fileName,
      fileSize: f.fileSize,
      formattedSize: this.formatBytes(f.fileSize),
      folder: f.folder,
      trashedAt: f.trashedAt || f.deletedAt,
      versionCount: f.versions ? f.versions.length : 1,
    }));

    // Record dry-run preview job for historical audit trail
    if (actorId) {
      await prisma.storageRetentionJob.create({
        data: {
          tenantId,
          policyId: policy.id !== "default-policy" ? policy.id : null,
          status: "COMPLETED",
          isDryRun: true,
          triggerType: "MANUAL",
          eligibleCount: evaluation.totalEligibleCount,
          eligibleBytes: evaluation.totalEligibleBytes,
          deletedCount: 0,
          deletedBytes: BigInt(0),
          skippedCount: evaluation.skippedItems.length,
          failedCount: 0,
          detailsJson: {
            skippedBreakdown: evaluation.skippedBreakdown,
            sampleCandidateCount: sampleCandidates.length,
            heldCount: evaluation.heldCount,
            protectedCount: evaluation.protectedCount,
          },
          requestedBy: actorId,
          completedAt: new Date(),
        },
      });
    }

    // Outbox & Realtime Event
    await OutboxService.createOutboxEvent({
      tenantId,
      eventType: "storage.retention.preview_generated",
      entityType: "StorageRetentionPolicy",
      entityId: policy.id || "default",
      actorId: actorId || null,
      payload: {
        eligibleCount: evaluation.totalEligibleCount,
        eligibleBytes: Number(evaluation.totalEligibleBytes),
        heldCount: evaluation.heldCount,
        protectedCount: evaluation.protectedCount,
      },
    });

    broadcastToTenant(tenantId, "retention:preview:created", {
      eligibleCount: evaluation.totalEligibleCount,
      eligibleBytes: Number(evaluation.totalEligibleBytes),
      formattedEligibleBytes: this.formatBytes(evaluation.totalEligibleBytes),
      heldCount: evaluation.heldCount,
      protectedCount: evaluation.protectedCount,
    });

    return {
      tenantId,
      policy,
      eligibleCount: evaluation.totalEligibleCount,
      eligibleBytes: Number(evaluation.totalEligibleBytes),
      formattedEligibleBytes: this.formatBytes(evaluation.totalEligibleBytes),
      oldestCandidateDate: evaluation.oldestCandidateDate,
      newestCandidateDate: evaluation.newestCandidateDate,
      heldCount: evaluation.heldCount,
      protectedCount: evaluation.protectedCount,
      skippedBreakdown: evaluation.skippedBreakdown,
      sampleCandidates,
      proposedExecutionTime: new Date(),
      policyVersion: policy.policyVersion,
    };
  }

  // =========================================================================
  // APPROVAL WORKFLOW
  // =========================================================================

  /**
   * Request approval for a retention job when policy requires it
   */
  public static async requestJobApproval(tenantId: string, actorId: string): Promise<any> {
    const policy = await this.getTenantPolicy(tenantId);
    const evaluation = await this.evaluateCandidates(tenantId, policy);

    const job = await prisma.storageRetentionJob.create({
      data: {
        tenantId,
        policyId: policy.id !== "default-policy" ? policy.id : null,
        status: "PENDING_APPROVAL",
        isDryRun: false,
        triggerType: "MANUAL",
        eligibleCount: evaluation.totalEligibleCount,
        eligibleBytes: evaluation.totalEligibleBytes,
        deletedCount: 0,
        deletedBytes: BigInt(0),
        skippedCount: evaluation.skippedItems.length,
        failedCount: 0,
        detailsJson: {
          candidateIds: evaluation.eligibleFiles.map((f) => f.id),
          versionIds: evaluation.eligibleVersions.map((v) => v.id),
          skippedBreakdown: evaluation.skippedBreakdown,
          heldCount: evaluation.heldCount,
        },
        requestedBy: actorId,
      },
    });

    // Outbox & Realtime Event
    await OutboxService.createOutboxEvent({
      tenantId,
      eventType: "storage.retention.approval_requested",
      entityType: "StorageRetentionJob",
      entityId: job.id,
      actorId,
      payload: { jobId: job.id, eligibleCount: job.eligibleCount, eligibleBytes: Number(job.eligibleBytes) },
    });

    broadcastToTenant(tenantId, "retention:approval:requested", {
      jobId: job.id,
      eligibleCount: job.eligibleCount,
      eligibleBytes: Number(job.eligibleBytes),
      requestedBy: actorId,
    });

    return job;
  }

  /**
   * Approve a pending retention job
   */
  public static async approveJob(tenantId: string, jobId: string, actorId: string): Promise<any> {
    const job = await prisma.storageRetentionJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      const err: any = new Error("Retention job not found.");
      err.status = 404;
      throw err;
    }

    if (job.tenantId !== tenantId) {
      const err: any = new Error("Forbidden: Access denied to job in another tenant.");
      err.status = 403;
      throw err;
    }

    if (job.status !== "PENDING_APPROVAL") {
      throw new Error(`Job cannot be approved from status "${job.status}". Must be PENDING_APPROVAL.`);
    }

    if (job.requestedBy && job.requestedBy === actorId) {
      const err: any = new Error("Separation of duties violation: The requester cannot approve their own retention job.");
      err.status = 403;
      throw err;
    }

    const updated = await prisma.storageRetentionJob.update({
      where: { id: job.id },
      data: {
        status: "APPROVED",
        approvedBy: actorId,
        approvedAt: new Date(),
      },
    });

    broadcastToTenant(tenantId, "retention:approval:approved", {
      jobId: job.id,
      approvedBy: actorId,
    });

    return updated;
  }

  /**
   * Reject a pending retention job
   */
  public static async rejectJob(
    tenantId: string,
    jobId: string,
    reason: string,
    actorId: string
  ): Promise<any> {
    const job = await prisma.storageRetentionJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      const err: any = new Error("Retention job not found.");
      err.status = 404;
      throw err;
    }

    if (job.tenantId !== tenantId) {
      const err: any = new Error("Forbidden: Access denied to job in another tenant.");
      err.status = 403;
      throw err;
    }

    const updated = await prisma.storageRetentionJob.update({
      where: { id: job.id },
      data: {
        status: "REJECTED",
        rejectedReason: reason || "Rejected by administrator.",
      },
    });

    broadcastToTenant(tenantId, "retention:approval:rejected", {
      jobId: job.id,
      rejectedBy: actorId,
      reason,
    });

    return updated;
  }

  // =========================================================================
  // RETENTION EXECUTION ENGINE (BOUNDED & TRANSACTIONAL)
  // =========================================================================

  /**
   * Execute permanent retention cleanup with bounded batches and physical confirmation
   */
  public static async executeRetentionJob(options: {
    tenantId: string;
    jobId?: string;
    actorId?: string;
    isDryRun?: boolean;
    force?: boolean;
  }): Promise<any> {
    const { tenantId, actorId, force } = options;
    const policy = await this.getTenantPolicy(tenantId);

    // Safety Invariant: Check if policy is enabled
    if (!policy.isEnabled) {
      throw new Error(
        "Retention policy is currently disabled. Enable policy before executing destructive permanent deletion."
      );
    }

    // Safety Invariant: Dry-Run Redirect
    const shouldDryRun = policy.isDryRun || options.isDryRun === true;
    if (shouldDryRun) {
      return this.createDryRunPreview(tenantId, actorId);
    }

    // Safety Invariant: Approval Check
    let approvedJob: any = null;
    if (policy.requiresApproval) {
      if (!options.jobId) {
        throw new Error("Approval is required by policy. Submit approval request before live execution.");
      }
      approvedJob = await prisma.storageRetentionJob.findUnique({
        where: { id: options.jobId },
      });
      if (!approvedJob || approvedJob.status !== "APPROVED") {
        throw new Error("Job has not been approved for execution.");
      }
      if (approvedJob.tenantId !== tenantId) {
        const err: any = new Error("Forbidden: Access denied to approved job belonging to another tenant.");
        err.status = 403;
        throw err;
      }
    }

    // Safety Invariant: Concurrency guard - prevent overlapping retention jobs for this tenant
    const activeRunningJob = await prisma.storageRetentionJob.findFirst({
      where: {
        tenantId,
        status: "RUNNING",
        id: approvedJob ? { not: approvedJob.id } : undefined,
        startedAt: { gt: new Date(Date.now() - 30 * 60 * 1000) },
      },
    });
    if (activeRunningJob) {
      throw new Error(
        `A retention job (${activeRunningJob.id}) is currently in progress for this tenant. Please wait for completion.`
      );
    }

    // Initialize or update Job state to RUNNING
    const job = approvedJob
      ? await prisma.storageRetentionJob.update({
          where: { id: approvedJob.id },
          data: { status: "RUNNING", startedAt: new Date() },
        })
      : await prisma.storageRetentionJob.create({
          data: {
            tenantId,
            policyId: policy.id !== "default-policy" ? policy.id : null,
            status: "RUNNING",
            isDryRun: false,
            triggerType: "MANUAL",
            requestedBy: actorId,
            startedAt: new Date(),
          },
        });

    broadcastToTenant(tenantId, "retention:job:started", { jobId: job.id });

    const storageProvider = StorageProviderFactory.getProvider();
    let deletedCount = 0;
    let deletedBytes = BigInt(0);
    let skippedCount = 0;
    let failedCount = 0;
    const executionDetails: any = {
      deletedFiles: [],
      deletedVersions: [],
      failedFiles: [],
      skippedReasons: {},
    };

    try {
      // Re-evaluate candidates in real-time immediately before execution!
      const evaluation = await this.evaluateCandidates(tenantId, policy);

      let candidates = evaluation.eligibleFiles;
      let eligibleVersions = evaluation.eligibleVersions;

      if (approvedJob?.detailsJson) {
        const details =
          typeof approvedJob.detailsJson === "string"
            ? JSON.parse(approvedJob.detailsJson)
            : approvedJob.detailsJson;
        if (Array.isArray(details.candidateIds)) {
          const approvedSet = new Set(details.candidateIds);
          candidates = candidates.filter((c: any) => approvedSet.has(c.id));
        }
        if (Array.isArray(details.versionIds)) {
          const approvedVerSet = new Set(details.versionIds);
          eligibleVersions = eligibleVersions.filter((v: any) => approvedVerSet.has(v.id));
        }
      }

      // Execute in bounded chunks (CHUNK_SIZE = 25)
      const CHUNK_SIZE = 25;

      for (let i = 0; i < candidates.length; i += CHUNK_SIZE) {
        const chunk = candidates.slice(i, i + CHUNK_SIZE);

        for (const candidate of chunk) {
          // Re-validate single file state inside bounded loop
          const freshFile = await prisma.mediaFile.findUnique({
            where: { id: candidate.id },
            include: {
              versions: true,
              usages: true,
              fileLinks: true,
              legalHolds: { where: { releasedAt: null } },
            },
          });

          // Concurrent mutation / restore check
          if (!freshFile || freshFile.status === "ACTIVE" || (!freshFile.deletedAt && !freshFile.trashedAt)) {
            skippedCount++;
            continue;
          }

          // Concurrent legal hold check
          if (freshFile.legalHolds && freshFile.legalHolds.length > 0) {
            skippedCount++;
            continue;
          }

          // Concurrent business reference check
          if (
            (freshFile.usages && freshFile.usages.length > 0) ||
            (freshFile.fileLinks && freshFile.fileLinks.length > 0)
          ) {
            skippedCount++;
            continue;
          }

          // STEP 1: PHYSICAL OBJECT STORAGE PURGE (WITH BOUNDED RETRY)
          let physicalDeleteFailed = false;
          for (const version of freshFile.versions) {
            if (version.storageKey) {
              let deleted = false;
              let attempts = 0;
              while (attempts < 2 && !deleted) {
                attempts++;
                try {
                  const res = await storageProvider.deleteObject(version.storageKey);
                  if (res !== false) {
                    deleted = true;
                  }
                } catch (delErr: any) {
                  console.error(`[RetentionPurge] Physical delete attempt ${attempts} failed for ${version.storageKey}:`, delErr);
                }
              }

              if (!deleted) {
                console.error(`[RetentionPurge] Physical delete permanently failed for ${version.storageKey} after ${attempts} attempts`);
                physicalDeleteFailed = true;
                break;
              }
            }
          }

          if (physicalDeleteFailed) {
            failedCount++;
            executionDetails.failedFiles.push({
              id: freshFile.id,
              fileName: freshFile.fileName,
              error: "Object storage provider deletion failed",
            });
            continue; // Do NOT proceed to database deletion or quota reclaim if physical delete fails!
          }

          // STEP 2: PRISMA TRANSACTION FOR METADATA PURGE & SUCE RECLAIM
          const fileSizeNum = freshFile.fileSize || 0;
          try {
            await prisma.$transaction(
              async (tx: any) => {
                // A. Decrement SUCE quota counters (floor-protected)
                if (!freshFile.isFolder && freshFile.type !== "FOLDER") {
                  await QuotaService.purgeFileBytes(
                    tx,
                    tenantId,
                    freshFile.ownerId || actorId || "system",
                    fileSizeNum,
                    true // Purging from trash!
                  );
                }

                // B. Delete released legal holds before mediaFile deletion
                await tx.storageLegalHold.deleteMany({
                  where: { fileId: freshFile.id, releasedAt: { not: null } },
                });

                // C. Clean related records
                await tx.fileLink.deleteMany({ where: { fileId: freshFile.id } });
                await tx.mediaUsage.deleteMany({ where: { mediaId: freshFile.id } });
                await tx.fileStar.deleteMany({ where: { fileId: freshFile.id } });
                await tx.fileAcl.deleteMany({ where: { fileId: freshFile.id } });
                await tx.fileShare.deleteMany({ where: { fileId: freshFile.id } });
                await tx.fileRecent.deleteMany({ where: { fileId: freshFile.id } });
                await tx.fileActivity.deleteMany({ where: { fileId: freshFile.id } });
                await tx.fileVersion.deleteMany({ where: { fileId: freshFile.id } });
                await tx.mediaFile.delete({ where: { id: freshFile.id } });

                // D. Audit event in Outbox
                await OutboxService.createOutboxEvent(
                  {
                    tenantId,
                    eventType: "storage.retention.file_purged",
                    entityType: "MediaFile",
                    entityId: freshFile.id,
                    actorId: actorId || null,
                    payload: {
                      id: freshFile.id,
                      fileName: freshFile.fileName,
                      fileSize: fileSizeNum,
                      jobId: job.id,
                    },
                  },
                  tx
                );
              },
              { maxWait: 15000, timeout: 30000 }
            );

            deletedCount++;
            deletedBytes += BigInt(fileSizeNum);
            executionDetails.deletedFiles.push({ id: freshFile.id, fileName: freshFile.fileName });
          } catch (fileErr: any) {
            console.error(`[RetentionPurge] Failed to purge file ${freshFile.id}:`, fileErr);
            failedCount++;
            executionDetails.failedFiles.push({
              id: freshFile.id,
              fileName: freshFile.fileName,
              error: fileErr.message,
            });
          }
        }
      }

      // STEP 3: PRUNE HISTORICAL FILE VERSIONS (IF CONFIGURED, WITH RETRY)
      for (const ver of eligibleVersions) {
        try {
          if (ver.storageKey) {
            let verDeleted = false;
            let attempts = 0;
            while (attempts < 2 && !verDeleted) {
              attempts++;
              try {
                const res = await storageProvider.deleteObject(ver.storageKey);
                if (res !== false) verDeleted = true;
              } catch (e) {
                console.error(`[RetentionPurge] Version delete attempt ${attempts} failed for ${ver.storageKey}:`, e);
              }
            }
            if (!verDeleted) {
              throw new Error(`Provider failed to delete object for version ${ver.storageKey}`);
            }
          }
          await prisma.$transaction(async (tx: any) => {
            await StorageUsageEngine.deleteFileVersion(tx, tenantId, ver.sizeBytes);
            await tx.fileVersion.delete({ where: { id: ver.id } });
          });
          deletedCount++;
          deletedBytes += BigInt(ver.sizeBytes || 0);
          executionDetails.deletedVersions.push({ id: ver.id, versionNo: ver.versionNo });
        } catch (verErr: any) {
          failedCount++;
          executionDetails.failedFiles.push({ id: ver.id, versionNo: ver.versionNo, error: verErr.message });
        }
      }

      // STEP 4: CLEAN EXPIRED PUBLIC SHARE LINKS
      if (policy.cleanExpiredLinks && evaluation.expiredLinks.length > 0) {
        const linkIds = evaluation.expiredLinks.map((l) => l.id);
        await prisma.fileAcl.deleteMany({ where: { id: { in: linkIds } } });
      }

      // STEP 5: CLEAN ABANDONED UPLOAD SESSIONS
      if (policy.cleanAbandonedSessions && evaluation.abandonedSessions.length > 0) {
        for (const session of evaluation.abandonedSessions) {
          await prisma.$transaction(async (tx: any) => {
            await StorageUsageEngine.releaseReservation(
              tx,
              session.tenantId,
              session.userId,
              session.sizeBytes
            );
            await tx.fileUploadSession.delete({ where: { id: session.id } });
          });
        }
      }

      // STEP 6: SUCE RECONCILIATION TO ENSURE ZERO DRIFT
      await StorageReconciliationService.repairTenantStorage(tenantId, {
        dryRun: false,
        actorId: actorId || "retention-worker",
      });

      // Update Job status to COMPLETED
      const completedJob = await prisma.storageRetentionJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          eligibleCount: evaluation.totalEligibleCount,
          eligibleBytes: evaluation.totalEligibleBytes,
          deletedCount,
          deletedBytes,
          skippedCount,
          failedCount,
          detailsJson: executionDetails,
          completedAt: new Date(),
        },
      });

      // Outbox and Real-time event
      await OutboxService.createOutboxEvent({
        tenantId,
        eventType: "storage.retention.job_completed",
        entityType: "StorageRetentionJob",
        entityId: job.id,
        actorId: actorId || null,
        payload: {
          jobId: job.id,
          deletedCount,
          deletedBytes: Number(deletedBytes),
          formattedReclaimed: this.formatBytes(deletedBytes),
          failedCount,
        },
      });

      broadcastToTenant(tenantId, "retention:job:completed", {
        jobId: job.id,
        deletedCount,
        deletedBytes: Number(deletedBytes),
        formattedReclaimed: this.formatBytes(deletedBytes),
        failedCount,
      });

      return {
        success: true,
        jobId: job.id,
        deletedCount,
        deletedBytes: Number(deletedBytes),
        formattedReclaimed: this.formatBytes(deletedBytes),
        skippedCount,
        failedCount,
        completedAt: completedJob.completedAt,
      };
    } catch (execErr: any) {
      console.error("[RetentionJob Execution Error]:", execErr);
      await prisma.storageRetentionJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          failedCount: failedCount + 1,
          rejectedReason: execErr.message || "Execution encountered an error.",
          completedAt: new Date(),
        },
      });

      broadcastToTenant(tenantId, "retention:job:failed", {
        jobId: job.id,
        error: execErr.message,
      });

      throw execErr;
    }
  }

  // =========================================================================
  // FLEET & AUDIT REPORTING (SUPER ADMIN)
  // =========================================================================

  /**
   * Super Admin Fleet-Wide Retention Summary
   */
  public static async getFleetRetentionSummary(): Promise<any> {
    const [
      totalTenants,
      totalPolicies,
      activePolicies,
      dryRunPolicies,
      recentJobs,
      activeHoldsCount,
      jobsSum,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.storageRetentionPolicy.count(),
      prisma.storageRetentionPolicy.count({ where: { isEnabled: true } }),
      prisma.storageRetentionPolicy.count({ where: { isDryRun: true } }),
      prisma.storageRetentionJob.findMany({
        take: 15,
        orderBy: { createdAt: "desc" },
      }),
      prisma.storageLegalHold.count({ where: { releasedAt: null } }),
      prisma.storageRetentionJob.aggregate({
        _sum: {
          deletedBytes: true,
          deletedCount: true,
        },
      }),
    ]);

    const totalReclaimedBytes = jobsSum._sum.deletedBytes ? BigInt(jobsSum._sum.deletedBytes) : BigInt(0);
    const totalReclaimedFiles = jobsSum._sum.deletedCount || 0;

    return {
      totalTenants,
      totalPolicies,
      activePolicies,
      dryRunPolicies,
      disabledPolicies: totalPolicies - activePolicies,
      totalReclaimedBytes: Number(totalReclaimedBytes),
      formattedTotalReclaimed: this.formatBytes(totalReclaimedBytes),
      totalReclaimedFiles,
      activeHoldsCount,
      recentJobs: recentJobs.map((j: any) => ({
        ...j,
        eligibleBytes: Number(j.eligibleBytes),
        deletedBytes: Number(j.deletedBytes),
        formattedDeletedBytes: this.formatBytes(j.deletedBytes),
      })),
    };
  }

  /**
   * List jobs history with pagination
   */
  public static async listJobs(options: { tenantId?: string; limit?: number; page?: number } = {}): Promise<any> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.tenantId) where.tenantId = options.tenantId;

    const [jobs, total] = await Promise.all([
      prisma.storageRetentionJob.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.storageRetentionJob.count({ where }),
    ]);

    return {
      jobs: jobs.map((j: any) => ({
        ...j,
        eligibleBytes: Number(j.eligibleBytes),
        deletedBytes: Number(j.deletedBytes),
        formattedDeletedBytes: this.formatBytes(j.deletedBytes),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Fleet-wide automated retention sweep for background schedulers (pg_cron / worker).
   * Evaluates all tenants with active retention policies with error boundary per tenant.
   */
  public static async runScheduledRetentionSweep(): Promise<{
    tenantsProcessed: number;
    jobsExecuted: number;
    previewsGenerated: number;
    approvalsRequested: number;
    skippedTenants: number;
    errors: Array<{ tenantId: string; error: string }>;
  }> {
    const activePolicies = await prisma.storageRetentionPolicy.findMany({
      where: {
        isEnabled: true,
        tenantId: { not: null },
      },
    });

    let jobsExecuted = 0;
    let previewsGenerated = 0;
    let approvalsRequested = 0;
    let skippedTenants = 0;
    const errors: Array<{ tenantId: string; error: string }> = [];

    for (const policy of activePolicies) {
      if (!policy.tenantId) continue;
      const tenantId = policy.tenantId;

      try {
        if (policy.isDryRun) {
          await this.createDryRunPreview(tenantId, "system-scheduler");
          previewsGenerated++;
        } else if (policy.requiresApproval) {
          const pendingJob = await prisma.storageRetentionJob.findFirst({
            where: { tenantId, status: "PENDING_APPROVAL" },
          });
          if (!pendingJob) {
            await this.requestJobApproval(tenantId, "system-scheduler");
            approvalsRequested++;
          } else {
            skippedTenants++;
          }
        } else {
          await this.executeRetentionJob({
            tenantId,
            actorId: "system-scheduler",
          });
          jobsExecuted++;
        }
      } catch (err: any) {
        console.error(`[RetentionSweep] Error processing tenant ${tenantId}:`, err);
        errors.push({ tenantId, error: err.message || "Unknown execution error" });
      }
    }

    return {
      tenantsProcessed: activePolicies.length,
      jobsExecuted,
      previewsGenerated,
      approvalsRequested,
      skippedTenants,
      errors,
    };
  }
}

