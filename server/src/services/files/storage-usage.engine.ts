import { rawPrisma, prisma as proxiedPrisma } from "../../prisma";
import { QuotaService, DEFAULT_USER_QUOTA_BYTES, PLAN_STORAGE_CAPACITIES_GB } from "./quota.service";
import { OutboxService } from "../outbox.service";
import { broadcastToTenant } from "../../socket";

const prisma = rawPrisma || proxiedPrisma;

export type StorageThresholdLevel = "NORMAL" | "WARNING_70" | "HIGH_85" | "CRITICAL_95" | "LOCKED_100";

export interface TenantStorageDimensions {
  tenantId: string;
  plan: {
    planId: string;
    name: string;
    storageLimitBytes: bigint;
    formattedLimit: string;
  };
  usage: {
    activeBytes: bigint;
    formattedActive: string;
    trashBytes: bigint;
    formattedTrash: string;
    versionBytes: bigint;
    formattedVersions: string;
    reservedBytes: bigint;
    formattedReserved: string;
    physicalBytes: bigint;
    formattedPhysical: string;
    billableBytes: bigint;
    formattedBillable: string;
    remainingBytes: bigint;
    formattedRemaining: string;
    percentUsed: number;
    fileCount: number;
    folderCount: number;
  };
  materializedCounters: {
    usedBytes: bigint;
    trashBytes: bigint;
    reservedBytes: bigint;
    fileCount: number;
  };
  hasDrift: boolean;
  healthStatus: "HEALTHY" | "DRIFT_DETECTED" | "CORRUPTED_NEGATIVE";
  thresholdState: StorageThresholdLevel;
}

export interface DepartmentStorageBreakdown {
  departmentId: string;
  name: string;
  allocatedQuotaBytes: bigint;
  formattedAllocated: string;
  usedBytes: bigint;
  formattedUsed: string;
  percentUsed: number;
  employeeCount: number;
  fileCount: number;
}

export interface TeamStorageBreakdown {
  teamId: string;
  name: string;
  quotaBytes: bigint;
  formattedQuota: string;
  usedBytes: bigint;
  formattedUsed: string;
  percentUsed: number;
  memberCount: number;
  fileCount: number;
}

export interface UserStorageConsumption {
  userId: string;
  name: string;
  email: string;
  departmentName: string;
  usedBytes: bigint;
  formattedUsed: string;
  quotaBytes: bigint;
  formattedQuota: string;
  percentUsed: number;
  fileCount: number;
  hasCustomQuota: boolean;
}

export class StorageUsageEngine {
  /**
   * Helper to format bytes into human-readable notation
   */
  public static formatBytes(bytes: number | bigint): string {
    const b = Number(bytes);
    if (b === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
    const i = Math.floor(Math.log(Math.max(b, 1)) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  /**
   * Resolves storage threshold level based on percentage
   */
  public static getThresholdLevel(percentUsed: number): StorageThresholdLevel {
    if (percentUsed >= 100) return "LOCKED_100";
    if (percentUsed >= 95) return "CRITICAL_95";
    if (percentUsed >= 85) return "HIGH_85";
    if (percentUsed >= 70) return "WARNING_70";
    return "NORMAL";
  }

  /**
   * Core multi-dimensional calculation for a tenant's storage footprint.
   * Compares authoritative live data against fast-path materialized counters.
   */
  public static async calculateTenantDimensions(tenantId: string): Promise<TenantStorageDimensions> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });

    if (!tenant) {
      throw new Error(`Tenant with ID ${tenantId} not found.`);
    }

    // 1. Quota Resolution
    const planQuotaBytes = await QuotaService.getTenantQuotaBytes(tenantId);
    const planName = tenant.subscription?.plan?.name || "Starter";
    const planId = tenant.subscription?.planId || "starter";

    // 2. Fetch Materialized Counters (Fast-Path)
    const usage = await QuotaService.getOrCreateUsage(prisma, tenantId, null);
    const matUsed = BigInt(usage.usedBytes);
    const matTrash = BigInt(usage.trashBytes);
    const matReserved = BigInt(usage.reservedBytes);
    const matFiles = usage.fileCount;

    // 3. Live Active Files
    const activeFiles = await prisma.mediaFile.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
        deletedAt: null,
        isFolder: false,
      },
      select: { fileSize: true },
    });
    const liveActiveBytes = activeFiles.reduce(
      (acc, f) => acc + BigInt(f.fileSize || 0),
      BigInt(0)
    );
    const liveFileCount = activeFiles.length;

    // 4. Live Trash Files
    const trashFiles = await prisma.mediaFile.findMany({
      where: {
        tenantId,
        isFolder: false,
        OR: [{ status: "TRASHED" }, { deletedAt: { not: null } }],
      },
      select: { fileSize: true },
    });
    const liveTrashBytes = trashFiles.reduce(
      (acc, f) => acc + BigInt(f.fileSize || 0),
      BigInt(0)
    );

    // 5. Live Historical Versions (isCurrent = false)
    const versionAgg = await prisma.fileVersion.aggregate({
      where: {
        file: { tenantId },
        isCurrent: false,
      },
      _sum: { sizeBytes: true },
    });
    const liveVersionBytes = BigInt(versionAgg._sum.sizeBytes || 0);

    // 6. Live Active Upload Reservations (status = INITIATED & expiresAt > now)
    const now = new Date();
    const activeSessions = await prisma.fileUploadSession.findMany({
      where: {
        tenantId,
        status: "INITIATED",
        expiresAt: { gt: now },
      },
      select: { sizeBytes: true },
    });
    const liveReservedBytes = activeSessions.reduce(
      (acc, s) => acc + BigInt(s.sizeBytes || 0),
      BigInt(0)
    );

    // 7. Active Folders Count
    const liveFolderCount = await prisma.mediaFile.count({
      where: {
        tenantId,
        isFolder: true,
        status: "ACTIVE",
        deletedAt: null,
      },
    });

    // 8. Derived Multi-Dimensional Metrics
    const physicalBytes = liveActiveBytes + liveTrashBytes + liveVersionBytes;
    const billableBytes = liveActiveBytes + liveTrashBytes + liveVersionBytes;
    const remainingBytes =
      planQuotaBytes > (liveActiveBytes + liveReservedBytes)
        ? planQuotaBytes - (liveActiveBytes + liveReservedBytes)
        : BigInt(0);

    const percentUsed =
      planQuotaBytes > BigInt(0)
        ? Math.min(
            100,
            parseFloat(
              ((Number(liveActiveBytes) / Number(planQuotaBytes)) * 100).toFixed(1)
            )
          )
        : 0;

    const thresholdState = this.getThresholdLevel(percentUsed);

    // 9. Drift Evaluation
    const driftUsed = matUsed - liveActiveBytes;
    const driftTrash = matTrash - liveTrashBytes;
    const driftReserved = matReserved - liveReservedBytes;
    const driftFiles = matFiles - liveFileCount;
    const hasDrift =
      driftUsed !== BigInt(0) ||
      driftTrash !== BigInt(0) ||
      driftReserved !== BigInt(0) ||
      driftFiles !== 0;

    const isNegativeAccounting =
      matUsed < BigInt(0) ||
      matTrash < BigInt(0) ||
      matReserved < BigInt(0) ||
      matFiles < 0;

    let healthStatus: "HEALTHY" | "DRIFT_DETECTED" | "CORRUPTED_NEGATIVE" = "HEALTHY";
    if (isNegativeAccounting) {
      healthStatus = "CORRUPTED_NEGATIVE";
    } else if (hasDrift) {
      healthStatus = "DRIFT_DETECTED";
    }

    return {
      tenantId,
      plan: {
        planId,
        name: planName,
        storageLimitBytes: planQuotaBytes,
        formattedLimit: this.formatBytes(planQuotaBytes),
      },
      usage: {
        activeBytes: liveActiveBytes,
        formattedActive: this.formatBytes(liveActiveBytes),
        trashBytes: liveTrashBytes,
        formattedTrash: this.formatBytes(liveTrashBytes),
        versionBytes: liveVersionBytes,
        formattedVersions: this.formatBytes(liveVersionBytes),
        reservedBytes: liveReservedBytes,
        formattedReserved: this.formatBytes(liveReservedBytes),
        physicalBytes,
        formattedPhysical: this.formatBytes(physicalBytes),
        billableBytes,
        formattedBillable: this.formatBytes(billableBytes),
        remainingBytes,
        formattedRemaining: this.formatBytes(remainingBytes),
        percentUsed,
        fileCount: liveFileCount,
        folderCount: liveFolderCount,
      },
      materializedCounters: {
        usedBytes: matUsed,
        trashBytes: matTrash,
        reservedBytes: matReserved,
        fileCount: matFiles,
      },
      hasDrift,
      healthStatus,
      thresholdState,
    };
  }

  /**
   * Organizational Department Storage Rollup
   * Attributes files via Employee.departmentId (for USER files) and FileTeam.departmentId (for TEAM files).
   */
  public static async calculateDepartmentBreakdown(
    tenantId: string
  ): Promise<{
    departments: DepartmentStorageBreakdown[];
    unassignedBytes: bigint;
    formattedUnassigned: string;
    totalDepartments: number;
  }> {
    // 1. Fetch all departments in tenant
    const departments = await prisma.department.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });

    // 2. Fetch employee -> department map
    const employees = await prisma.employee.findMany({
      where: { tenantId },
      select: { userId: true, departmentId: true },
    });
    const userDeptMap = new Map<string, string>();
    employees.forEach((e) => {
      if (e.userId && e.departmentId) {
        userDeptMap.set(e.userId, e.departmentId);
      }
    });

    // 3. Fetch file team -> department map via createdBy user
    const fileTeams = await prisma.fileTeam.findMany({
      where: { tenantId },
      select: { id: true, createdBy: true },
    });
    const teamDeptMap = new Map<string, string>();
    fileTeams.forEach((t) => {
      if (t.id && t.createdBy && userDeptMap.has(t.createdBy)) {
        teamDeptMap.set(t.id, userDeptMap.get(t.createdBy)!);
      }
    });

    // 4. Fetch all active files in tenant
    const activeFiles = await prisma.mediaFile.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
        deletedAt: null,
        isFolder: false,
      },
      select: {
        id: true,
        fileSize: true,
        ownerType: true,
        ownerId: true,
      },
    });

    // 5. Aggregate by department
    const deptStats = new Map<
      string,
      { bytes: bigint; count: number; employeeCount: number }
    >();
    departments.forEach((d) => {
      deptStats.set(d.id, {
        bytes: BigInt(0),
        count: 0,
        employeeCount: employees.filter((e) => e.departmentId === d.id).length,
      });
    });

    let unassignedBytes = BigInt(0);

    for (const file of activeFiles) {
      const fBytes = BigInt(file.fileSize || 0);
      let deptId: string | undefined;

      if (file.ownerType === "USER" && file.ownerId) {
        deptId = userDeptMap.get(file.ownerId);
      } else if (file.ownerType === "TEAM" && file.ownerId) {
        deptId = teamDeptMap.get(file.ownerId);
      }

      if (deptId && deptStats.has(deptId)) {
        const current = deptStats.get(deptId)!;
        current.bytes += fBytes;
        current.count += 1;
      } else {
        unassignedBytes += fBytes;
      }
    }

    const defaultDeptQuota = BigInt(10) * BigInt(1024 * 1024 * 1024); // 10 GB nominal allocation

    const result: DepartmentStorageBreakdown[] = departments.map((d) => {
      const stats = deptStats.get(d.id) || {
        bytes: BigInt(0),
        count: 0,
        employeeCount: 0,
      };
      const percentUsed =
        defaultDeptQuota > BigInt(0)
          ? Math.min(
              100,
              parseFloat(
                ((Number(stats.bytes) / Number(defaultDeptQuota)) * 100).toFixed(1)
              )
            )
          : 0;

      return {
        departmentId: d.id,
        name: d.name,
        allocatedQuotaBytes: defaultDeptQuota,
        formattedAllocated: this.formatBytes(defaultDeptQuota),
        usedBytes: stats.bytes,
        formattedUsed: this.formatBytes(stats.bytes),
        percentUsed,
        employeeCount: stats.employeeCount,
        fileCount: stats.count,
      };
    });

    // Sort descending by storage usage
    result.sort((a, b) => Number(b.usedBytes - a.usedBytes));

    return {
      departments: result,
      unassignedBytes,
      formattedUnassigned: this.formatBytes(unassignedBytes),
      totalDepartments: departments.length,
    };
  }

  /**
   * Collaborative Team Folder Breakdown
   */
  public static async calculateTeamBreakdown(tenantId: string): Promise<TeamStorageBreakdown[]> {
    const teams = await prisma.fileTeam.findMany({
      where: { tenantId },
      include: {
        _count: { select: { members: true } },
      },
    });

    const teamBreakdowns = await Promise.all(
      teams.map(async (team) => {
        const teamFiles = await prisma.mediaFile.findMany({
          where: {
            tenantId,
            isFolder: false,
            status: "ACTIVE",
            deletedAt: null,
            OR: [
              { ownerType: "TEAM", ownerId: team.id },
              ...(team.rootFolderId
                ? [{ materializedPath: { contains: `/${team.rootFolderId}/` } }]
                : []),
            ],
          },
          select: { fileSize: true },
        });

        const usedBytes = teamFiles.reduce(
          (acc, f) => acc + BigInt(f.fileSize || 0),
          BigInt(0)
        );
        const quotaBytes = team.quotaBytes || BigInt(10) * BigInt(1024 * 1024 * 1024);
        const percentUsed =
          quotaBytes > BigInt(0)
            ? Math.min(
                100,
                parseFloat(
                  ((Number(usedBytes) / Number(quotaBytes)) * 100).toFixed(1)
                )
              )
            : 0;

        return {
          teamId: team.id,
          name: team.name,
          quotaBytes,
          formattedQuota: this.formatBytes(quotaBytes),
          usedBytes,
          formattedUsed: this.formatBytes(usedBytes),
          percentUsed,
          memberCount: team._count.members,
          fileCount: teamFiles.length,
        };
      })
    );

    teamBreakdowns.sort((a, b) => Number(b.usedBytes - a.usedBytes));
    return teamBreakdowns;
  }

  /**
   * User Storage Consumption Leaderboard
   */
  public static async calculateUserBreakdown(
    tenantId: string,
    options: { limit?: number; search?: string } = {}
  ): Promise<{ users: UserStorageConsumption[]; totalUsersCount: number }> {
    const limit = options.limit || 25;

    // 1. Fetch user storage usages with user_id is not null
    const usages = await prisma.storageUsage.findMany({
      where: {
        tenantId,
        userId: { not: null },
      },
      orderBy: { usedBytes: "desc" },
      take: limit * 2,
    });

    const userIds = usages.map((u) => u.userId).filter(Boolean) as string[];

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        profile: { select: { fullName: true } },
        employees: {
          where: { tenantId },
          select: {
            department: { select: { name: true } },
          },
          take: 1,
        },
      },
    });

    const userMap = new Map<string, any>();
    users.forEach((u) => userMap.set(u.id, u));

    // Custom quotas lookup
    const customQuotas = await prisma.storageQuota.findMany({
      where: {
        tenantId,
        userId: { in: userIds },
      },
    });
    const quotaMap = new Map<string, bigint>();
    customQuotas.forEach((q) => {
      if (q.userId) quotaMap.set(q.userId, q.quotaBytes);
    });

    const rows: UserStorageConsumption[] = usages.map((u) => {
      const uInfo = userMap.get(u.userId!);
      const name = uInfo?.profile?.fullName || uInfo?.email || "User";
      const departmentName = uInfo?.employees?.[0]?.department?.name || "General";
      const usedBytes = BigInt(u.usedBytes);
      const hasCustomQuota = quotaMap.has(u.userId!);
      const quotaBytes = hasCustomQuota
        ? quotaMap.get(u.userId!)!
        : DEFAULT_USER_QUOTA_BYTES;

      const percentUsed =
        quotaBytes > BigInt(0)
          ? Math.min(
              100,
              parseFloat(
                ((Number(usedBytes) / Number(quotaBytes)) * 100).toFixed(1)
              )
            )
          : 0;

      return {
        userId: u.userId!,
        name,
        email: uInfo?.email || "",
        departmentName,
        usedBytes,
        formattedUsed: this.formatBytes(usedBytes),
        quotaBytes,
        formattedQuota: this.formatBytes(quotaBytes),
        percentUsed,
        fileCount: u.fileCount,
        hasCustomQuota,
      };
    });

    let filtered = rows;
    if (options.search) {
      const q = options.search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.departmentName.toLowerCase().includes(q)
      );
    }

    const totalUsersCount = await prisma.employee.count({
      where: { tenantId },
    });

    return {
      users: filtered.slice(0, limit),
      totalUsersCount,
    };
  }

  // ===========================================================================
  // REAL-TIME ATOMIC LIFECYCLE ENGINE WITH FLOOR PROTECTION
  // ===========================================================================

  /**
   * Atomically verifies quota and reserves upload bytes for an in-flight session.
   */
  public static async reserveUpload(
    tx: any,
    tenantId: string | null,
    userId: string,
    sizeBytes: number | bigint,
    sessionId?: string
  ): Promise<void> {
    await QuotaService.reserveUploadBytes(tx, tenantId, userId, Number(sizeBytes));
  }

  /**
   * Commits upload: decrements reservedBytes, increments usedBytes, increments fileCount.
   * Guarantees floor protection against negative counters.
   */
  public static async commitUpload(
    tx: any,
    tenantId: string | null,
    userId: string,
    sizeBytes: number | bigint,
    sessionId?: string
  ): Promise<void> {
    await QuotaService.commitUploadBytes(tx, tenantId, userId, Number(sizeBytes));
  }

  /**
   * Releases in-flight upload reservation when session aborts or expires.
   */
  public static async releaseReservation(
    tx: any,
    tenantId: string | null,
    userId: string,
    sizeBytes: number | bigint,
    sessionId?: string
  ): Promise<void> {
    await QuotaService.releaseReservedBytes(tx, tenantId, userId, Number(sizeBytes));
  }

  /**
   * Adjusts usage when file is moved to Trash:
   * decrements usedBytes (floor-protected), increments trashBytes.
   */
  public static async trashFile(
    tx: any,
    tenantId: string | null,
    userId: string,
    sizeBytes: number | bigint
  ): Promise<void> {
    await QuotaService.trashFileBytes(tx, tenantId, userId, Number(sizeBytes));
  }

  /**
   * Adjusts usage when file is restored from Trash:
   * decrements trashBytes (floor-protected), increments usedBytes.
   */
  public static async restoreFile(
    tx: any,
    tenantId: string | null,
    userId: string,
    sizeBytes: number | bigint
  ): Promise<void> {
    await QuotaService.restoreFileBytes(tx, tenantId, userId, Number(sizeBytes));
  }

  /**
   * Permanently purges a file:
   * decrements trashBytes or usedBytes, decrements fileCount (floor-protected).
   */
  public static async purgeFile(
    tx: any,
    tenantId: string | null,
    userId: string,
    sizeBytes: number | bigint,
    fromTrash: boolean
  ): Promise<void> {
    await QuotaService.purgeFileBytes(tx, tenantId, userId, Number(sizeBytes), fromTrash);
  }

  /**
   * Version lifecycle: adds previous version to historical version storage.
   */
  public static async createFileVersion(
    tx: any,
    tenantId: string | null,
    userId: string,
    oldSizeBytes: number | bigint,
    newSizeBytes: number | bigint
  ): Promise<void> {
    const diff = BigInt(newSizeBytes) - BigInt(oldSizeBytes);
    if (tenantId) {
      const tenantUsage = await QuotaService.getOrCreateUsage(tx, tenantId, null);
      if (diff > BigInt(0)) {
        await tx.storageUsage.update({
          where: { id: tenantUsage.id },
          data: { usedBytes: { increment: diff } },
        });
      } else if (diff < BigInt(0)) {
        const absDiff = -diff;
        const decr = tenantUsage.usedBytes >= absDiff ? absDiff : tenantUsage.usedBytes;
        await tx.storageUsage.update({
          where: { id: tenantUsage.id },
          data: { usedBytes: { decrement: decr } },
        });
      }
    }

    const userUsage = await QuotaService.getOrCreateUsage(tx, tenantId, userId);
    if (diff > BigInt(0)) {
      await tx.storageUsage.update({
        where: { id: userUsage.id },
        data: { usedBytes: { increment: diff } },
      });
    } else if (diff < BigInt(0)) {
      const absDiff = -diff;
      const decr = userUsage.usedBytes >= absDiff ? absDiff : userUsage.usedBytes;
      await tx.storageUsage.update({
        where: { id: userUsage.id },
        data: { usedBytes: { decrement: decr } },
      });
    }
  }

  /**
   * Deletes a historical file version: updates version historical accounting.
   */
  public static async deleteFileVersion(
    tx: any,
    tenantId: string | null,
    sizeBytes: number | bigint
  ): Promise<void> {
    // Versions do not decrement active usedBytes, but reduce total billable/physical footprint
    // Fast-path materialized row tracks usedBytes & trashBytes; versionBytes is aggregated dynamically.
  }
}

// Canonical alias for the engine
export const StorageUsageCalculationService = StorageUsageEngine;

