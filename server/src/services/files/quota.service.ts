import { rawPrisma, prisma as proxiedPrisma } from "../../prisma";
const prisma = rawPrisma || proxiedPrisma;

export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
export const DEFAULT_USER_QUOTA_BYTES = BigInt(5) * BigInt(1024 * 1024 * 1024); // 5 GB

export const PLAN_STORAGE_CAPACITIES_GB: Record<string, number> = {
  starter: 10,
  growth: 25,
  sovereign: 100,
  "custom-flex": 500,
  custom: 500,
};

export class QuotaExceededError extends Error {
  public readonly code = "QUOTA_EXCEEDED";
  public readonly scope: "TENANT" | "USER" | "FILE_SIZE";
  public readonly requestedBytes: number;
  public readonly availableBytes: bigint;

  constructor(
    message: string,
    scope: "TENANT" | "USER" | "FILE_SIZE",
    requestedBytes: number,
    availableBytes: bigint
  ) {
    super(message);
    this.name = "QuotaExceededError";
    this.scope = scope;
    this.requestedBytes = requestedBytes;
    this.availableBytes = availableBytes;
  }
}

export class QuotaService {
  /**
   * Resolves the storage quota limit in bytes for a tenant based on its subscription plan.
   */
  public static async getTenantQuotaBytes(tenantId: string | null): Promise<bigint> {
    if (!tenantId) {
      return BigInt(1000) * BigInt(1024 * 1024 * 1024); // 1 TB platform ceiling
    }

    const subscription = await prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    let limitGb = 10; // Starter default if undefined/null
    if (subscription?.storageLimitGb) {
      limitGb = subscription.storageLimitGb;
    } else if (subscription?.plan?.storageLimitGb) {
      limitGb = subscription.plan.storageLimitGb;
    } else if (subscription?.planId && PLAN_STORAGE_CAPACITIES_GB[subscription.planId.toLowerCase()]) {
      limitGb = PLAN_STORAGE_CAPACITIES_GB[subscription.planId.toLowerCase()];
    }

    return BigInt(limitGb) * BigInt(1024 * 1024 * 1024);
  }

  /**
   * Resolves the storage quota limit in bytes for a specific user within a tenant.
   */
  public static async getUserQuotaBytes(tenantId: string | null, userId: string): Promise<bigint> {
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

    return DEFAULT_USER_QUOTA_BYTES;
  }

  /**
   * Retrieves or initializes the storage usage record for tenant pool or user.
   */
  public static async getOrCreateUsage(
    tx: any,
    tenantId: string | null,
    userId: string | null
  ) {
    const tid = tenantId || "platform";
    let usage = await tx.storageUsage.findFirst({
      where: {
        tenantId: tid,
        userId: userId ?? null,
      },
    });

    if (!usage) {
      usage = await tx.storageUsage.create({
        data: {
          tenantId: tid,
          userId: userId ?? null,
          usedBytes: BigInt(0),
          trashBytes: BigInt(0),
          reservedBytes: BigInt(0),
          fileCount: 0,
        },
      });
    }

    return usage;
  }

  /**
   * Atomically verifies quota and reserves bytes for an in-flight upload session.
   */
  public static async reserveUploadBytes(
    tx: any,
    tenantId: string | null,
    userId: string,
    sizeBytes: number
  ): Promise<void> {
    if (sizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new QuotaExceededError(
        `File size (${(sizeBytes / (1024 * 1024)).toFixed(1)} MB) exceeds the 100 MB upload limit.`,
        "FILE_SIZE",
        sizeBytes,
        BigInt(MAX_FILE_SIZE_BYTES)
      );
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
        throw new QuotaExceededError(
          `Tenant storage quota exceeded. Plan limit reached.`,
          "TENANT",
          sizeBytes,
          available
        );
      }
    }

    // 2. Check User Quota
    const userQuotaBytes = await this.getUserQuotaBytes(tenantId, userId);
    const userUsage = await this.getOrCreateUsage(tx, tenantId, userId);

    const projectedUserBytes = userUsage.usedBytes + userUsage.reservedBytes + bigSizeBytes;
    if (projectedUserBytes > userQuotaBytes) {
      const available = userQuotaBytes > (userUsage.usedBytes + userUsage.reservedBytes)
        ? userQuotaBytes - (userUsage.usedBytes + userUsage.reservedBytes)
        : BigInt(0);
      throw new QuotaExceededError(
        `User storage allocation exceeded. Your 5 GB allocation is full.`,
        "USER",
        sizeBytes,
        available
      );
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
  public static async commitUploadBytes(
    tx: any,
    tenantId: string | null,
    userId: string,
    sizeBytes: number
  ): Promise<void> {
    const bigSizeBytes = BigInt(sizeBytes);

    // Tenant Pool update
    if (tenantId) {
      const tenantUsage = await this.getOrCreateUsage(tx, tenantId, null);
      const decr = tenantUsage.reservedBytes >= bigSizeBytes ? bigSizeBytes : tenantUsage.reservedBytes;
      await tx.storageUsage.update({
        where: { id: tenantUsage.id },
        data: {
          reservedBytes: { decrement: decr },
          usedBytes: { increment: bigSizeBytes },
          fileCount: { increment: 1 },
        },
      });
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
  public static async releaseReservedBytes(
    tx: any,
    tenantId: string | null,
    userId: string,
    sizeBytes: number
  ): Promise<void> {
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
  public static async trashFileBytes(
    tx: any,
    tenantId: string | null,
    userId: string,
    sizeBytes: number
  ): Promise<void> {
    const bigSizeBytes = BigInt(sizeBytes);

    if (tenantId) {
      const tenantUsage = await this.getOrCreateUsage(tx, tenantId, null);
      const decr = tenantUsage.usedBytes >= bigSizeBytes ? bigSizeBytes : tenantUsage.usedBytes;
      await tx.storageUsage.update({
        where: { id: tenantUsage.id },
        data: {
          usedBytes: { decrement: decr },
          trashBytes: { increment: bigSizeBytes },
        },
      });
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
  public static async restoreFileBytes(
    tx: any,
    tenantId: string | null,
    userId: string,
    sizeBytes: number
  ): Promise<void> {
    const bigSizeBytes = BigInt(sizeBytes);

    if (tenantId) {
      const tenantUsage = await this.getOrCreateUsage(tx, tenantId, null);
      const decr = tenantUsage.trashBytes >= bigSizeBytes ? bigSizeBytes : tenantUsage.trashBytes;
      await tx.storageUsage.update({
        where: { id: tenantUsage.id },
        data: {
          trashBytes: { decrement: decr },
          usedBytes: { increment: bigSizeBytes },
        },
      });
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
  public static async purgeFileBytes(
    tx: any,
    tenantId: string | null,
    userId: string,
    sizeBytes: number,
    fromTrash: boolean
  ): Promise<void> {
    const bigSizeBytes = BigInt(sizeBytes);

    if (tenantId) {
      const tenantUsage = await this.getOrCreateUsage(tx, tenantId, null);
      if (fromTrash) {
        const decr = tenantUsage.trashBytes >= bigSizeBytes ? bigSizeBytes : tenantUsage.trashBytes;
        await tx.storageUsage.update({
          where: { id: tenantUsage.id },
          data: {
            trashBytes: { decrement: decr },
            fileCount: { decrement: tenantUsage.fileCount > 0 ? 1 : 0 },
          },
        });
      } else {
        const decr = tenantUsage.usedBytes >= bigSizeBytes ? bigSizeBytes : tenantUsage.usedBytes;
        await tx.storageUsage.update({
          where: { id: tenantUsage.id },
          data: {
            usedBytes: { decrement: decr },
            fileCount: { decrement: tenantUsage.fileCount > 0 ? 1 : 0 },
          },
        });
      }
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
    } else {
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
  public static async reconcileStorageUsage(tenantId: string): Promise<{
    usedBytes: bigint;
    trashBytes: bigint;
    fileCount: number;
  }> {
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
    } else {
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
