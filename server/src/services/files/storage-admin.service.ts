import { rawPrisma, prisma as proxiedPrisma } from "../../prisma";
import { QuotaService, PLAN_STORAGE_CAPACITIES_GB, DEFAULT_USER_QUOTA_BYTES } from "./quota.service";
import { FilesService } from "./files.service";
import { OutboxService } from "../outbox.service";
import { broadcastToTenant } from "../../socket";

const prisma = rawPrisma || proxiedPrisma;

export type ThresholdLevel = "NORMAL" | "WARNING_70" | "HIGH_85" | "CRITICAL_95" | "LOCKED_100";

export class StorageAdminService {
  /**
   * Helper to format bytes into readable strings
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
   * Determine threshold state from percentage
   */
  public static getThresholdLevel(percentUsed: number): ThresholdLevel {
    if (percentUsed >= 100) return "LOCKED_100";
    if (percentUsed >= 95) return "CRITICAL_95";
    if (percentUsed >= 85) return "HIGH_85";
    if (percentUsed >= 70) return "WARNING_70";
    return "NORMAL";
  }

  /**
   * Evaluates and updates storage alert state with strict deduplication
   */
  public static async checkAndDispatchAlerts(tenantId: string, percentUsed: number): Promise<{
    thresholdLevel: ThresholdLevel;
    alertDispatched: boolean;
    isRecovery: boolean;
  }> {
    const currentLevel = this.getThresholdLevel(percentUsed);

    let alertState = await prisma.storageAlertState.findUnique({
      where: { tenantId },
    });

    if (!alertState) {
      alertState = await prisma.storageAlertState.create({
        data: {
          tenantId,
          currentLevel,
          lastNotifiedLevel: "NORMAL",
          lastNotifiedAt: null,
        },
      });
    }

    const previousLevel = alertState.lastNotifiedLevel;
    let alertDispatched = false;
    let isRecovery = false;

    // Transition happened that warrants notification
    if (currentLevel !== previousLevel) {
      alertDispatched = true;
      const isEscalation = currentLevel !== "NORMAL";
      isRecovery = currentLevel === "NORMAL" && previousLevel !== "NORMAL";

      const eventType = isRecovery ? "storage.alert.recovered" : "storage.alert.triggered";
      const message = isRecovery
        ? `Storage utilization has returned to normal (${percentUsed}%).`
        : `Storage quota alert: ${currentLevel} reached (${percentUsed}% utilization).`;

      // 1. Transactional Outbox Event
      try {
        await OutboxService.createOutboxEvent({
          tenantId,
          eventType,
          entityType: "STORAGE_ALERT",
          entityId: tenantId,
          payload: {
            tenantId,
            currentLevel,
            previousLevel,
            percentUsed,
            message,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (err) {
        console.warn("[StorageAdminService] Failed to write outbox alert event:", err);
      }

      // 2. Real-time WebSocket notification
      try {
        broadcastToTenant(tenantId, "storage:alert", {
          tenantId,
          currentLevel,
          percentUsed,
          message,
          isRecovery,
        });
      } catch (err) {
        console.warn("[StorageAdminService] WebSocket alert broadcast error:", err);
      }

      // 3. Update alert state in DB
      await prisma.storageAlertState.update({
        where: { id: alertState.id },
        data: {
          currentLevel,
          lastNotifiedLevel: currentLevel,
          lastNotifiedAt: new Date(),
          resolvedAt: isRecovery ? new Date() : null,
        },
      });
    } else if (alertState.currentLevel !== currentLevel) {
      await prisma.storageAlertState.update({
        where: { id: alertState.id },
        data: { currentLevel },
      });
    }

    return { thresholdLevel: currentLevel, alertDispatched, isRecovery };
  }

  /**
   * Super Admin Fleet-wide Storage Overview
   */
  public static async getPlatformOverview(options: {
    search?: string;
    plan?: string;
    status?: string;
    utilization?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    // 1. Fetch all tenants with subscriptions and storage usages
    const tenants = await prisma.tenant.findMany({
      include: {
        subscription: {
          include: { plan: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const tenantIds = tenants.map((t) => t.id);

    // Fetch storage usages for all tenants in pool (canonical userId = null)
    const usages = await prisma.storageUsage.findMany({
      where: {
        tenantId: { in: tenantIds },
        userId: null,
      },
    });
    const usageMap = new Map<string, any>();
    usages.forEach((u) => usageMap.set(u.tenantId, u));

    // Fetch storage quotas overrides (canonical userId = null)
    const quotaOverrides = await prisma.storageQuota.findMany({
      where: {
        tenantId: { in: tenantIds },
        userId: null,
      },
    });
    const quotaMap = new Map<string, bigint>();
    quotaOverrides.forEach((q) => quotaMap.set(q.tenantId, q.quotaBytes));

    // Calculate aggregated platform totals
    let totalSubscribedStorageBytes = BigInt(0);
    let totalConsumedStorageBytes = BigInt(0);
    let totalTrashedStorageBytes = BigInt(0);
    let totalReservedStorageBytes = BigInt(0);
    let totalFilesAcrossFleet = 0;

    const planStats: Record<string, { count: number; allocatedBytes: bigint; usedBytes: bigint }> = {
      Starter: { count: 0, allocatedBytes: BigInt(0), usedBytes: BigInt(0) },
      Growth: { count: 0, allocatedBytes: BigInt(0), usedBytes: BigInt(0) },
      Sovereign: { count: 0, allocatedBytes: BigInt(0), usedBytes: BigInt(0) },
      Custom: { count: 0, allocatedBytes: BigInt(0), usedBytes: BigInt(0) },
    };

    const tenantRows = tenants.map((t) => {
      const sub = t.subscription;
      const planName = sub?.plan?.name || "Starter";
      const planKey = (sub?.planId || "starter").toLowerCase();

      // Resolve quota
      let quotaBytes = BigInt(10) * BigInt(1024 * 1024 * 1024); // default 10 GB
      let quotaSource = "DEFAULT";
      if (quotaMap.has(t.id) && quotaMap.get(t.id)! > BigInt(0)) {
        quotaBytes = quotaMap.get(t.id)!;
        quotaSource = "OVERRIDE";
      } else if (sub?.storageLimitGb) {
        quotaBytes = BigInt(sub.storageLimitGb) * BigInt(1024 * 1024 * 1024);
        quotaSource = "SUBSCRIPTION";
      } else if (sub?.plan?.storageLimitGb) {
        quotaBytes = BigInt(sub.plan.storageLimitGb) * BigInt(1024 * 1024 * 1024);
        quotaSource = "PLAN";
      } else if (PLAN_STORAGE_CAPACITIES_GB[planKey]) {
        quotaBytes = BigInt(PLAN_STORAGE_CAPACITIES_GB[planKey]) * BigInt(1024 * 1024 * 1024);
        quotaSource = "PLAN";
      }

      const usage = usageMap.get(t.id);
      const usedBytes = usage ? usage.usedBytes : BigInt(0);
      const trashBytes = usage ? usage.trashBytes : BigInt(0);
      const reservedBytes = usage ? usage.reservedBytes : BigInt(0);
      const fileCount = usage ? usage.fileCount : 0;

      totalSubscribedStorageBytes += quotaBytes;
      totalConsumedStorageBytes += usedBytes;
      totalTrashedStorageBytes += trashBytes;
      totalReservedStorageBytes += reservedBytes;
      totalFilesAcrossFleet += fileCount;

      // Plan aggregation
      const pGroup = planName.includes("Growth")
        ? "Growth"
        : planName.includes("Sovereign")
        ? "Sovereign"
        : planName.includes("Custom")
        ? "Custom"
        : "Starter";
      if (planStats[pGroup]) {
        planStats[pGroup].count += 1;
        planStats[pGroup].allocatedBytes += quotaBytes;
        planStats[pGroup].usedBytes += usedBytes;
      }

      const usedNum = Number(usedBytes);
      const quotaNum = Number(quotaBytes);
      const percentUsed = quotaNum > 0 ? Math.min(100, parseFloat(((usedNum / quotaNum) * 100).toFixed(1))) : 0;
      const thresholdState = this.getThresholdLevel(percentUsed);

      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        status: sub?.status || "Active",
        plan: planName,
        planKey,
        quotaBytes: quotaNum,
        formattedQuota: this.formatBytes(quotaBytes),
        quotaSource,
        usedBytes: usedNum,
        formattedUsed: this.formatBytes(usedBytes),
        trashBytes: Number(trashBytes),
        formattedTrash: this.formatBytes(trashBytes),
        reservedBytes: Number(reservedBytes),
        formattedReserved: this.formatBytes(reservedBytes),
        percentUsed,
        thresholdState,
        fileCount,
        createdAt: t.createdAt,
      };
    });

    // 2. Filter tenants based on query options
    let filteredTenants = tenantRows;

    if (options.search) {
      const q = options.search.toLowerCase();
      filteredTenants = filteredTenants.filter(
        (t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q)
      );
    }

    if (options.plan && options.plan !== "all") {
      filteredTenants = filteredTenants.filter(
        (t) => t.planKey === options.plan?.toLowerCase() || t.plan.toLowerCase().includes(options.plan?.toLowerCase() || "")
      );
    }

    if (options.status && options.status !== "all") {
      filteredTenants = filteredTenants.filter(
        (t) => t.status.toLowerCase() === options.status?.toLowerCase()
      );
    }

    if (options.utilization && options.utilization !== "all") {
      switch (options.utilization) {
        case "over_70":
          filteredTenants = filteredTenants.filter((t) => t.percentUsed >= 70);
          break;
        case "over_85":
          filteredTenants = filteredTenants.filter((t) => t.percentUsed >= 85);
          break;
        case "over_95":
          filteredTenants = filteredTenants.filter((t) => t.percentUsed >= 95);
          break;
        case "locked":
          filteredTenants = filteredTenants.filter((t) => t.percentUsed >= 100);
          break;
      }
    }

    // Sort descending by storage usage by default
    filteredTenants.sort((a, b) => b.usedBytes - a.usedBytes);

    const totalFiltered = filteredTenants.length;
    const paginatedTenants = filteredTenants.slice(skip, skip + limit);

    const atRiskTenants = tenantRows.filter((t) => t.percentUsed >= 70);

    const globalPct =
      Number(totalSubscribedStorageBytes) > 0
        ? parseFloat(((Number(totalConsumedStorageBytes) / Number(totalSubscribedStorageBytes)) * 100).toFixed(1))
        : 0;

    return {
      platform: {
        totalTenants: tenants.length,
        totalSubscribedStorageBytes: Number(totalSubscribedStorageBytes),
        formattedSubscribed: this.formatBytes(totalSubscribedStorageBytes),
        totalConsumedStorageBytes: Number(totalConsumedStorageBytes),
        formattedConsumed: this.formatBytes(totalConsumedStorageBytes),
        totalTrashedStorageBytes: Number(totalTrashedStorageBytes),
        formattedTrashed: this.formatBytes(totalTrashedStorageBytes),
        totalReservedStorageBytes: Number(totalReservedStorageBytes),
        formattedReserved: this.formatBytes(totalReservedStorageBytes),
        globalUtilizationPct: globalPct,
        totalFilesAcrossFleet,
        atRiskTenantsCount: atRiskTenants.length,
      },
      planDistribution: Object.entries(planStats).map(([name, data]) => ({
        name,
        count: data.count,
        allocatedBytes: Number(data.allocatedBytes),
        formattedAllocated: this.formatBytes(data.allocatedBytes),
        usedBytes: Number(data.usedBytes),
        formattedUsed: this.formatBytes(data.usedBytes),
      })),
      atRiskTenants: atRiskTenants.slice(0, 10),
      tenants: paginatedTenants,
      pagination: {
        page,
        limit,
        total: totalFiltered,
        totalPages: Math.ceil(totalFiltered / limit),
      },
    };
  }

  /**
   * Authoritative Tenant Storage Summary & Multi-Dimensional Breakdown
   */
  public static async getTenantStorageSummary(tenantId: string) {
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
    const quotaBytes = await QuotaService.getTenantQuotaBytes(tenantId);
    let quotaSource = "DEFAULT";
    const override = await prisma.storageQuota.findFirst({
      where: { tenantId, userId: null },
    });
    if (override && override.quotaBytes > BigInt(0)) {
      quotaSource = "OVERRIDE";
    } else if (tenant.subscription?.storageLimitGb) {
      quotaSource = "SUBSCRIPTION";
    } else if (tenant.subscription?.plan?.storageLimitGb) {
      quotaSource = "PLAN";
    }

    // 2. Materialized Usage Lookup (canonical userId = null)
    const usage = await QuotaService.getOrCreateUsage(prisma, tenantId, null);
    const activeBytes = Number(usage.usedBytes);
    const trashBytes = Number(usage.trashBytes);
    const reservedBytes = Number(usage.reservedBytes);
    const quotaNum = Number(quotaBytes);

    // 3. Historical Versions byte aggregation
    const versionAgg = await prisma.fileVersion.aggregate({
      where: {
        file: { tenantId },
        isCurrent: false,
      },
      _sum: { sizeBytes: true },
    });
    const versionBytes = Number(versionAgg._sum.sizeBytes || 0);

    const totalBillableBytes = activeBytes + trashBytes + versionBytes;
    const availableBytes = Math.max(0, quotaNum - (totalBillableBytes + reservedBytes));
    const percentUsed = quotaNum > 0 ? Math.min(100, parseFloat(((activeBytes / quotaNum) * 100).toFixed(1))) : 0;
    const thresholdState = this.getThresholdLevel(percentUsed);

    // 4. Folder Count
    const folderCount = await prisma.mediaFile.count({
      where: { tenantId, isFolder: true, status: "ACTIVE", deletedAt: null },
    });

    // 5. Category Breakdown
    const activeFiles = await prisma.mediaFile.findMany({
      where: { tenantId, isFolder: false, status: "ACTIVE", deletedAt: null },
      select: { category: true, fileSize: true },
    });

    const categoryMap: Record<string, { bytes: number; count: number }> = {
      Documents: { bytes: 0, count: 0 },
      Images: { bytes: 0, count: 0 },
      Videos: { bytes: 0, count: 0 },
      Audio: { bytes: 0, count: 0 },
      Archives: { bytes: 0, count: 0 },
      Code: { bytes: 0, count: 0 },
      Other: { bytes: 0, count: 0 },
    };

    activeFiles.forEach((f) => {
      const cat = f.category && categoryMap[f.category] ? f.category : "Documents";
      categoryMap[cat].bytes += f.fileSize || 0;
      categoryMap[cat].count += 1;
    });

    const categories = Object.entries(categoryMap).map(([category, d]) => ({
      category,
      bytes: d.bytes,
      formatted: this.formatBytes(d.bytes),
      count: d.count,
      percentage: activeBytes > 0 ? parseFloat(((d.bytes / activeBytes) * 100).toFixed(1)) : 0,
    }));

    // 6. User Storage Distribution (Top Users)
    const usersUsage = await prisma.storageUsage.findMany({
      where: {
        tenantId,
        userId: { not: null },
      },
      orderBy: { usedBytes: "desc" },
      take: 10,
    });

    const userIds = usersUsage.map((u) => u.userId).filter(Boolean) as string[];
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
    const userInfoMap = new Map<string, any>();
    users.forEach((u) => userInfoMap.set(u.id, u));

    // Custom quotas lookup matching StorageUsageEngine.calculateUserBreakdown
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

    const topUsers = usersUsage.map((u) => {
      const uInfo = userInfoMap.get(u.userId!);
      const name = uInfo?.profile?.fullName || uInfo?.email || "User";
      const department = uInfo?.employees?.[0]?.department?.name || "General";
      const uUsed = Number(u.usedBytes);
      const userQuotaBigInt = quotaMap.get(u.userId!) ?? DEFAULT_USER_QUOTA_BYTES;
      const uQuota = Number(userQuotaBigInt);
      return {
        userId: u.userId,
        name: name || u.userId,
        email: uInfo?.email || "",
        department,
        usedBytes: uUsed,
        formattedUsed: this.formatBytes(uUsed),
        quotaBytes: uQuota,
        formattedQuota: this.formatBytes(uQuota),
        percentUsed: uQuota > 0 ? Math.min(100, Math.round((uUsed / uQuota) * 100)) : 0,
        fileCount: u.fileCount,
      };
    });

    // 7. Team Folder Storage Distribution
    const teams = await prisma.fileTeam.findMany({
      where: { tenantId },
      include: {
        _count: { select: { members: true } },
      },
    });

    const teamSummaries = await Promise.all(
      teams.map(async (team) => {
        const teamFiles = await prisma.mediaFile.findMany({
          where: {
            tenantId,
            OR: [
              { ownerType: "TEAM", ownerId: team.id },
              ...(team.rootFolderId
                ? [{ materializedPath: { contains: `/${team.rootFolderId}/` } }]
                : []),
            ],
            status: "ACTIVE",
            deletedAt: null,
            isFolder: false,
          },
          select: { fileSize: true },
        });
        const teamUsedBytes = teamFiles.reduce((acc, f) => acc + (f.fileSize || 0), 0);
        const tQuota = Number(team.quotaBytes || BigInt(5) * BigInt(1024 * 1024 * 1024));
        return {
          id: team.id,
          name: team.name,
          memberCount: team._count.members,
          usedBytes: teamUsedBytes,
          formattedUsed: this.formatBytes(teamUsedBytes),
          quotaBytes: tQuota,
          formattedQuota: this.formatBytes(tQuota),
          percentUsed: Math.min(100, Math.round((teamUsedBytes / tQuota) * 100)),
          fileCount: teamFiles.length,
        };
      })
    );

    return {
      tenantId: tenant.id,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        planName: tenant.subscription?.plan?.name || "Starter",
        status: tenant.subscription?.status || "Active",
      },
      quota: {
        quotaBytes: quotaNum,
        formattedQuota: this.formatBytes(quotaBytes),
        quotaSource,
      },
      usage: {
        activeBytes,
        formattedActive: this.formatBytes(activeBytes),
        trashBytes,
        formattedTrash: this.formatBytes(trashBytes),
        versionBytes,
        formattedVersion: this.formatBytes(versionBytes),
        reservedBytes,
        formattedReserved: this.formatBytes(reservedBytes),
        totalBillableBytes,
        formattedTotalBillable: this.formatBytes(totalBillableBytes),
        availableBytes,
        formattedAvailable: this.formatBytes(availableBytes),
        percentUsed,
        thresholdState,
        fileCount: usage.fileCount,
        folderCount,
      },
      categories,
      topUsers,
      teams: teamSummaries,
    };
  }

  /**
   * Growth Analytics & Historical Runway Time-Series
   */
  public static async getStorageGrowthAnalytics(tenantId: string | null) {
    const tid = tenantId || "platform";
    // 1. Fetch real snapshots
    const snapshots = await prisma.storageSnapshot.findMany({
      where: { tenantId: tid },
      orderBy: { snapshotDate: "asc" },
      take: 90,
    });

    // 2. If no snapshot exists for today, take one right now from live data
    if (snapshots.length === 0 || snapshots[snapshots.length - 1].snapshotDate.toISOString().slice(0, 10) !== new Date().toISOString().slice(0, 10)) {
      const todaySnapshot = await this.takeDailySnapshot(tenantId);
      snapshots.push(todaySnapshot);
    }

    // 3. Fetch recent upload and deletion activity counts
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - 30);

    const activities = await prisma.fileActivity.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        createdAt: { gte: sinceDate },
        action: { in: ["create", "upload", "trash", "restore", "purge"] },
      },
      select: { action: true, createdAt: true },
    });

    const activityByDay: Record<string, { uploads: number; deletions: number }> = {};
    activities.forEach((a) => {
      const day = a.createdAt.toISOString().slice(0, 10);
      if (!activityByDay[day]) activityByDay[day] = { uploads: 0, deletions: 0 };
      if (a.action === "upload" || a.action === "create") activityByDay[day].uploads++;
      if (a.action === "trash" || a.action === "purge") activityByDay[day].deletions++;
    });

    return {
      isRealData: true,
      trackedDays: snapshots.length,
      snapshots: snapshots.map((s) => ({
        date: s.snapshotDate.toISOString().slice(0, 10),
        usedBytes: Number(s.usedBytes),
        formattedUsed: this.formatBytes(s.usedBytes),
        trashBytes: Number(s.trashBytes),
        versionBytes: Number(s.versionBytes),
        quotaBytes: Number(s.quotaBytes),
        fileCount: s.fileCount,
      })),
      activityVolume: Object.entries(activityByDay).map(([date, d]) => ({
        date,
        uploads: d.uploads,
        deletions: d.deletions,
      })),
    };
  }

  /**
   * Capacity Forecasting (Labeled explicitly as estimates)
   */
  public static async calculateCapacityForecast(tenantId: string | null) {
    const quotaBytes = tenantId
      ? await QuotaService.getTenantQuotaBytes(tenantId)
      : BigInt(1000) * BigInt(1024 * 1024 * 1024);

    const usage = await QuotaService.getOrCreateUsage(prisma, tenantId, null);
    const currentUsed = Number(usage.usedBytes);
    const quotaNum = Number(quotaBytes);
    const available = Math.max(0, quotaNum - currentUsed);

    // Calculate daily average growth from snapshots
    const tid = tenantId || "platform";
    const snapshots = await prisma.storageSnapshot.findMany({
      where: { tenantId: tid },
      orderBy: { snapshotDate: "asc" },
      take: 30,
    });

    let dailyGrowthBytes = 10 * 1024 * 1024; // 10 MB/day default baseline
    if (snapshots.length >= 2) {
      const first = Number(snapshots[0].usedBytes);
      const last = Number(snapshots[snapshots.length - 1].usedBytes);
      const days = Math.max(1, (snapshots[snapshots.length - 1].snapshotDate.getTime() - snapshots[0].snapshotDate.getTime()) / (1000 * 3600 * 24));
      const calculatedDaily = (last - first) / days;
      if (calculatedDaily > 0) {
        dailyGrowthBytes = Math.round(calculatedDaily);
      }
    }

    const estimatedDaysToExhaustion = dailyGrowthBytes > 0 ? Math.round(available / dailyGrowthBytes) : null;
    const projectedExhaustionDate = estimatedDaysToExhaustion !== null && estimatedDaysToExhaustion < 3650
      ? new Date(Date.now() + estimatedDaysToExhaustion * 24 * 3600 * 1000).toISOString().slice(0, 10)
      : null;

    return {
      isEstimate: true,
      currentUsedBytes: currentUsed,
      formattedUsed: this.formatBytes(currentUsed),
      availableBytes: available,
      formattedAvailable: this.formatBytes(available),
      quotaBytes: quotaNum,
      formattedQuota: this.formatBytes(quotaBytes),
      dailyGrowthBytes,
      formattedDailyGrowth: this.formatBytes(dailyGrowthBytes) + " / day",
      estimatedDaysToExhaustion,
      projectedExhaustionDate,
      forecastStatus:
        estimatedDaysToExhaustion === null
          ? "STABLE"
          : estimatedDaysToExhaustion < 15
          ? "CRITICAL"
          : estimatedDaysToExhaustion < 60
          ? "WARNING"
          : "HEALTHY",
    };
  }

  /**
   * Captures an authoritative daily storage snapshot
   */
  public static async takeDailySnapshot(tenantId: string | null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tid = tenantId || "platform";

    let quotaBytes = BigInt(1000) * BigInt(1024 * 1024 * 1024);
    let usedBytes = BigInt(0);
    let trashBytes = BigInt(0);
    let reservedBytes = BigInt(0);
    let fileCount = 0;

    if (tenantId) {
      quotaBytes = await QuotaService.getTenantQuotaBytes(tenantId);
      const usage = await QuotaService.getOrCreateUsage(prisma, tenantId, null);
      usedBytes = usage.usedBytes;
      trashBytes = usage.trashBytes;
      reservedBytes = usage.reservedBytes;
      fileCount = usage.fileCount;
    } else {
      // Platform fleet aggregate
      const overview = await this.getPlatformOverview({ limit: 1000 });
      quotaBytes = BigInt(overview.platform.totalSubscribedStorageBytes);
      usedBytes = BigInt(overview.platform.totalConsumedStorageBytes);
      trashBytes = BigInt(overview.platform.totalTrashedStorageBytes);
      reservedBytes = BigInt(overview.platform.totalReservedStorageBytes);
      fileCount = overview.platform.totalFilesAcrossFleet;
    }

    const folderCount = await prisma.mediaFile.count({
      where: {
        ...(tenantId ? { tenantId } : {}),
        isFolder: true,
        status: "ACTIVE",
        deletedAt: null,
      },
    });

    return await prisma.storageSnapshot.upsert({
      where: {
        tenantId_snapshotDate: {
          tenantId: tid,
          snapshotDate: today,
        },
      },
      update: {
        usedBytes,
        trashBytes,
        reservedBytes,
        fileCount,
        folderCount,
        quotaBytes,
      },
      create: {
        tenantId: tid,
        usedBytes,
        trashBytes,
        reservedBytes,
        fileCount,
        folderCount,
        quotaBytes,
        snapshotDate: today,
      },
    });
  }

  /**
   * Authoritative chronological audit trail of recent file and storage activities.
   */
  public static async getStorageActivity(tenantId: string, limit = 25) {
    const activities = await prisma.fileActivity.findMany({
      where: {
        file: { tenantId },
      },
      include: {
        file: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            folder: true,
            isFolder: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return activities.map((act) => ({
      id: act.id,
      fileId: act.fileId,
      fileName: act.file?.fileName || "File",
      fileSize: act.file?.fileSize || 0,
      formattedSize: this.formatBytes(act.file?.fileSize || 0),
      action: act.action,
      details: (act as any).details || (act as any).metaJson || null,
      actorId: act.actorId,
      createdAt: act.createdAt.toISOString(),
    }));
  }
}
