import { rawPrisma, prisma as proxiedPrisma } from "../../prisma";
import { QuotaService, PLAN_STORAGE_CAPACITIES_GB } from "./quota.service";
import { StorageAdminService } from "./storage-admin.service";
import { StorageUsageEngine } from "./storage-usage.engine";

const prisma = rawPrisma || proxiedPrisma;

export type ForecastConfidence = "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT_DATA";
export type ForecastStatus = "NORMAL" | "APPROACHING_QUOTA" | "EXCEEDED" | "STABLE_OR_DECLINING" | "INSUFFICIENT_DATA";

export interface StorageForecastResult {
  tenantId: string | null;
  currentUsageBytes: number;
  formattedCurrentUsage: string;
  quotaBytes: number;
  formattedQuota: string;
  availableBytes: number;
  formattedAvailable: string;
  utilizationPercent: number;
  thresholdState: "NORMAL" | "WARNING" | "CRITICAL" | "LOCKED";
  averageDailyGrowthBytes: number;
  formattedDailyGrowth: string;
  projectedUsage30DaysBytes: number;
  formattedProjected30Days: string;
  projectedExhaustionDate: string | null;
  projectedDaysRemaining: number | null;
  lookbackDays: number;
  dataPoints: number;
  confidence: ForecastConfidence;
  forecastStatus: ForecastStatus;
  regressionSlope: number | null; // bytes per day linear trend
  isEstimate: boolean;
  lastSnapshotDate: string | null;
}

export interface GrowthDataPoint {
  date: string;
  usedBytes: number;
  formattedUsed: string;
  trashBytes: number;
  formattedTrash: string;
  versionBytes: number;
  formattedVersion: string;
  reservedBytes: number;
  formattedReserved: string;
  billableBytes: number;
  formattedBillable: string;
  quotaBytes: number;
  formattedQuota: string;
  fileCount: number;
  netGrowthBytes: number;
  isProjected: boolean;
}

export interface FleetGrowthHistoryResult {
  lookbackDays: number;
  totalTrackedDays: number;
  dataPoints: number;
  hasSufficientHistory: boolean;
  history: GrowthDataPoint[];
  projections: GrowthDataPoint[];
  summary: {
    netPeriodGrowthBytes: number;
    formattedNetPeriodGrowth: string;
    averageDailyGrowthBytes: number;
    formattedDailyGrowth: string;
    reclaimedPeriodBytes: number;
    formattedReclaimedPeriod: string;
  };
}

export interface TenantGrowthHistoryResult {
  tenantId: string;
  lookbackDays: number;
  dataPoints: number;
  hasSufficientHistory: boolean;
  history: GrowthDataPoint[];
  projections: GrowthDataPoint[];
  forecast: StorageForecastResult;
}

export interface TenantForecastWatchlistEntry {
  tenantId: string;
  name: string;
  slug: string;
  domainUrl: string;
  plan: string;
  currentUsageBytes: number;
  formattedCurrentUsage: string;
  quotaBytes: number;
  formattedQuota: string;
  utilizationPercent: number;
  thresholdState: "NORMAL" | "WARNING" | "CRITICAL" | "LOCKED";
  averageDailyGrowthBytes: number;
  formattedDailyGrowth: string;
  projectedDaysRemaining: number | null;
  projectedExhaustionDate: string | null;
  confidence: ForecastConfidence;
  forecastStatus: ForecastStatus;
}

export interface StorageAnomalyInsight {
  id: string;
  tenantId: string;
  tenantName: string;
  type: "SPIKE" | "TRASH_ACCUMULATION" | "VERSION_ACCUMULATION" | "RESERVED_STALL";
  severity: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  message: string;
  metricFormatted: string;
  detectedAt: string;
}

export class StorageForecastService {
  /**
   * Safe bytes formatting consistent across system
   */
  public static formatBytes(bytes: number | bigint): string {
    const b = Number(bytes);
    if (!b || b === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(Math.max(b, 1)) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  /**
   * Safe BigInt conversion
   */
  public static toSafeNumber(val: any): number {
    if (typeof val === "bigint") {
      return Number(val);
    }
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }

  /**
   * 1. Calculate Tenant Storage Capacity Forecast
   */
  public static async calculateTenantForecast(
    tenantId: string,
    options: { lookbackDays?: number } = {}
  ): Promise<StorageForecastResult> {
    const lookbackDays = options.lookbackDays && [7, 30, 90].includes(options.lookbackDays)
      ? options.lookbackDays
      : 30;

    // A. Fetch current usage and effective quota
    const quotaBytesBig = await QuotaService.getTenantQuotaBytes(tenantId);
    const usage = await QuotaService.getOrCreateUsage(prisma, tenantId, null);

    const currentUsageBytes = this.toSafeNumber(usage.usedBytes);
    const quotaBytes = this.toSafeNumber(quotaBytesBig);
    const availableBytes = Math.max(0, quotaBytes - currentUsageBytes);
    const utilizationPercent = quotaBytes > 0
      ? Math.min(100, parseFloat(((currentUsageBytes / quotaBytes) * 100).toFixed(1)))
      : 0;

    const thresholdState =
      utilizationPercent >= 100
        ? "LOCKED"
        : utilizationPercent >= 90
        ? "CRITICAL"
        : utilizationPercent >= 80
        ? "WARNING"
        : "NORMAL";

    // B. Fetch historical snapshots within lookback window
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - lookbackDays);
    sinceDate.setHours(0, 0, 0, 0);

    const snapshots = await prisma.storageSnapshot.findMany({
      where: {
        tenantId,
        snapshotDate: { gte: sinceDate },
      },
      orderBy: { snapshotDate: "asc" },
    });

    // Deduplicate snapshots by date string (latest wins)
    const snapshotMap = new Map<string, any>();
    snapshots.forEach((s) => {
      const dStr = s.snapshotDate.toISOString().slice(0, 10);
      snapshotMap.set(dStr, s);
    });
    const dedupedSnapshots = Array.from(snapshotMap.values()).sort(
      (a, b) => a.snapshotDate.getTime() - b.snapshotDate.getTime()
    );

    const lastSnapshot = dedupedSnapshots.length > 0
      ? dedupedSnapshots[dedupedSnapshots.length - 1]
      : null;
    const lastSnapshotDate = lastSnapshot
      ? lastSnapshot.snapshotDate.toISOString().slice(0, 10)
      : null;

    // C. Handle Insufficient History (< 2 snapshots)
    if (dedupedSnapshots.length < 2) {
      return {
        tenantId,
        currentUsageBytes,
        formattedCurrentUsage: this.formatBytes(currentUsageBytes),
        quotaBytes,
        formattedQuota: this.formatBytes(quotaBytes),
        availableBytes,
        formattedAvailable: this.formatBytes(availableBytes),
        utilizationPercent,
        thresholdState,
        averageDailyGrowthBytes: 0,
        formattedDailyGrowth: "0 B / day",
        projectedUsage30DaysBytes: currentUsageBytes,
        formattedProjected30Days: this.formatBytes(currentUsageBytes),
        projectedExhaustionDate: null,
        projectedDaysRemaining: null,
        lookbackDays,
        dataPoints: dedupedSnapshots.length,
        confidence: "INSUFFICIENT_DATA",
        forecastStatus: utilizationPercent >= 100 ? "EXCEEDED" : "INSUFFICIENT_DATA",
        regressionSlope: null,
        isEstimate: true,
        lastSnapshotDate,
      };
    }

    // D. Calculate Average Daily Growth
    const first = dedupedSnapshots[0];
    const last = dedupedSnapshots[dedupedSnapshots.length - 1];
    const firstUsed = this.toSafeNumber(first.usedBytes);
    const lastUsed = this.toSafeNumber(last.usedBytes);
    const elapsedDays = Math.max(
      1,
      Math.round((last.snapshotDate.getTime() - first.snapshotDate.getTime()) / (1000 * 3600 * 24))
    );

    const netGrowthBytes = lastUsed - firstUsed;
    const averageDailyGrowthBytes = Math.round(netGrowthBytes / elapsedDays);

    // E. Least-Squares Linear Regression (if data points >= 3)
    let regressionSlope: number | null = null;
    if (dedupedSnapshots.length >= 3) {
      const n = dedupedSnapshots.length;
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumXX = 0;
      const baseTime = dedupedSnapshots[0].snapshotDate.getTime();

      dedupedSnapshots.forEach((s) => {
        const x = Math.round((s.snapshotDate.getTime() - baseTime) / (1000 * 3600 * 24));
        const y = this.toSafeNumber(s.usedBytes);
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
      });

      const denominator = n * sumXX - sumX * sumX;
      if (denominator !== 0) {
        regressionSlope = Math.round((n * sumXY - sumX * sumY) / denominator);
      }
    }

    // F. Determine Capacity Exhaustion & Forecast Status
    let projectedDaysRemaining: number | null = null;
    let projectedExhaustionDate: string | null = null;
    let forecastStatus: ForecastStatus = "NORMAL";

    if (utilizationPercent >= 100) {
      projectedDaysRemaining = 0;
      projectedExhaustionDate = new Date().toISOString().slice(0, 10);
      forecastStatus = "EXCEEDED";
    } else if (averageDailyGrowthBytes <= 0) {
      projectedDaysRemaining = null;
      projectedExhaustionDate = null;
      forecastStatus = "STABLE_OR_DECLINING";
    } else {
      projectedDaysRemaining = Math.max(1, Math.floor(availableBytes / averageDailyGrowthBytes));
      if (projectedDaysRemaining < 3650) {
        const exhaustionTime = Date.now() + projectedDaysRemaining * 24 * 3600 * 1000;
        projectedExhaustionDate = new Date(exhaustionTime).toISOString().slice(0, 10);
      } else {
        projectedDaysRemaining = null; // Beyond 10-year runway
        projectedExhaustionDate = null;
      }

      if (projectedDaysRemaining !== null && projectedDaysRemaining <= 14) {
        forecastStatus = "APPROACHING_QUOTA";
      } else if (utilizationPercent >= 80) {
        forecastStatus = "APPROACHING_QUOTA";
      } else {
        forecastStatus = "NORMAL";
      }
    }

    // G. Confidence Score
    const count = dedupedSnapshots.length;
    let confidence: ForecastConfidence = "LOW";
    if (count >= 14) {
      confidence = "HIGH";
    } else if (count >= 7) {
      confidence = "MEDIUM";
    }

    const projectedUsage30DaysBytes = Math.max(0, currentUsageBytes + averageDailyGrowthBytes * 30);

    return {
      tenantId,
      currentUsageBytes,
      formattedCurrentUsage: this.formatBytes(currentUsageBytes),
      quotaBytes,
      formattedQuota: this.formatBytes(quotaBytes),
      availableBytes,
      formattedAvailable: this.formatBytes(availableBytes),
      utilizationPercent,
      thresholdState,
      averageDailyGrowthBytes,
      formattedDailyGrowth: this.formatBytes(averageDailyGrowthBytes) + " / day",
      projectedUsage30DaysBytes,
      formattedProjected30Days: this.formatBytes(projectedUsage30DaysBytes),
      projectedExhaustionDate,
      projectedDaysRemaining,
      lookbackDays,
      dataPoints: dedupedSnapshots.length,
      confidence,
      forecastStatus,
      regressionSlope,
      isEstimate: true,
      lastSnapshotDate,
    };
  }

  /**
   * 2. Calculate Fleet Platform Storage Forecast
   */
  public static async calculateFleetForecast(
    options: { lookbackDays?: number } = {}
  ): Promise<StorageForecastResult> {
    const lookbackDays = options.lookbackDays && [7, 30, 90].includes(options.lookbackDays)
      ? options.lookbackDays
      : 30;

    // Aggregate fleet usage and allocated storage
    const overview = await StorageAdminService.getPlatformOverview({ limit: 1000 });
    const currentUsageBytes = overview.platform.totalConsumedStorageBytes;
    const quotaBytes = overview.platform.totalSubscribedStorageBytes;
    const availableBytes = Math.max(0, quotaBytes - currentUsageBytes);
    const utilizationPercent = overview.platform.globalUtilizationPct;

    const thresholdState =
      utilizationPercent >= 100
        ? "LOCKED"
        : utilizationPercent >= 90
        ? "CRITICAL"
        : utilizationPercent >= 80
        ? "WARNING"
        : "NORMAL";

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - lookbackDays);
    sinceDate.setHours(0, 0, 0, 0);

    // Fetch platform aggregate snapshots (tenantId = 'platform' or null)
    const snapshots = await prisma.storageSnapshot.findMany({
      where: {
        OR: [{ tenantId: "platform" }, { tenantId: null }],
        snapshotDate: { gte: sinceDate },
      },
      orderBy: { snapshotDate: "asc" },
    });

    const snapshotMap = new Map<string, any>();
    snapshots.forEach((s) => {
      const dStr = s.snapshotDate.toISOString().slice(0, 10);
      snapshotMap.set(dStr, s);
    });
    const dedupedSnapshots = Array.from(snapshotMap.values()).sort(
      (a, b) => a.snapshotDate.getTime() - b.snapshotDate.getTime()
    );

    const lastSnapshot = dedupedSnapshots.length > 0
      ? dedupedSnapshots[dedupedSnapshots.length - 1]
      : null;
    const lastSnapshotDate = lastSnapshot
      ? lastSnapshot.snapshotDate.toISOString().slice(0, 10)
      : null;

    if (dedupedSnapshots.length < 2) {
      return {
        tenantId: null,
        currentUsageBytes,
        formattedCurrentUsage: this.formatBytes(currentUsageBytes),
        quotaBytes,
        formattedQuota: this.formatBytes(quotaBytes),
        availableBytes,
        formattedAvailable: this.formatBytes(availableBytes),
        utilizationPercent,
        thresholdState,
        averageDailyGrowthBytes: 0,
        formattedDailyGrowth: "0 B / day",
        projectedUsage30DaysBytes: currentUsageBytes,
        formattedProjected30Days: this.formatBytes(currentUsageBytes),
        projectedExhaustionDate: null,
        projectedDaysRemaining: null,
        lookbackDays,
        dataPoints: dedupedSnapshots.length,
        confidence: "INSUFFICIENT_DATA",
        forecastStatus: utilizationPercent >= 100 ? "EXCEEDED" : "INSUFFICIENT_DATA",
        regressionSlope: null,
        isEstimate: true,
        lastSnapshotDate,
      };
    }

    const first = dedupedSnapshots[0];
    const last = dedupedSnapshots[dedupedSnapshots.length - 1];
    const firstUsed = this.toSafeNumber(first.usedBytes);
    const lastUsed = this.toSafeNumber(last.usedBytes);
    const elapsedDays = Math.max(
      1,
      Math.round((last.snapshotDate.getTime() - first.snapshotDate.getTime()) / (1000 * 3600 * 24))
    );

    const netGrowthBytes = lastUsed - firstUsed;
    const averageDailyGrowthBytes = Math.round(netGrowthBytes / elapsedDays);

    let regressionSlope: number | null = null;
    if (dedupedSnapshots.length >= 3) {
      const n = dedupedSnapshots.length;
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumXX = 0;
      const baseTime = dedupedSnapshots[0].snapshotDate.getTime();

      dedupedSnapshots.forEach((s) => {
        const x = Math.round((s.snapshotDate.getTime() - baseTime) / (1000 * 3600 * 24));
        const y = this.toSafeNumber(s.usedBytes);
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
      });

      const denominator = n * sumXX - sumX * sumX;
      if (denominator !== 0) {
        regressionSlope = Math.round((n * sumXY - sumX * sumY) / denominator);
      }
    }

    let projectedDaysRemaining: number | null = null;
    let projectedExhaustionDate: string | null = null;
    let forecastStatus: ForecastStatus = "NORMAL";

    if (utilizationPercent >= 100) {
      projectedDaysRemaining = 0;
      projectedExhaustionDate = new Date().toISOString().slice(0, 10);
      forecastStatus = "EXCEEDED";
    } else if (averageDailyGrowthBytes <= 0) {
      projectedDaysRemaining = null;
      projectedExhaustionDate = null;
      forecastStatus = "STABLE_OR_DECLINING";
    } else {
      projectedDaysRemaining = Math.max(1, Math.floor(availableBytes / averageDailyGrowthBytes));
      if (projectedDaysRemaining < 3650) {
        const exhaustionTime = Date.now() + projectedDaysRemaining * 24 * 3600 * 1000;
        projectedExhaustionDate = new Date(exhaustionTime).toISOString().slice(0, 10);
      } else {
        projectedDaysRemaining = null;
        projectedExhaustionDate = null;
      }
      forecastStatus = projectedDaysRemaining !== null && projectedDaysRemaining <= 30
        ? "APPROACHING_QUOTA"
        : "NORMAL";
    }

    const count = dedupedSnapshots.length;
    const confidence: ForecastConfidence = count >= 14 ? "HIGH" : count >= 7 ? "MEDIUM" : "LOW";
    const projectedUsage30DaysBytes = Math.max(0, currentUsageBytes + averageDailyGrowthBytes * 30);

    return {
      tenantId: null,
      currentUsageBytes,
      formattedCurrentUsage: this.formatBytes(currentUsageBytes),
      quotaBytes,
      formattedQuota: this.formatBytes(quotaBytes),
      availableBytes,
      formattedAvailable: this.formatBytes(availableBytes),
      utilizationPercent,
      thresholdState,
      averageDailyGrowthBytes,
      formattedDailyGrowth: this.formatBytes(averageDailyGrowthBytes) + " / day",
      projectedUsage30DaysBytes,
      formattedProjected30Days: this.formatBytes(projectedUsage30DaysBytes),
      projectedExhaustionDate,
      projectedDaysRemaining,
      lookbackDays,
      dataPoints: dedupedSnapshots.length,
      confidence,
      forecastStatus,
      regressionSlope,
      isEstimate: true,
      lastSnapshotDate,
    };
  }

  /**
   * 3. Fetch Fleet Growth Time Series & Forward Projections
   */
  public static async getFleetGrowthHistory(
    options: { lookbackDays?: number } = {}
  ): Promise<FleetGrowthHistoryResult> {
    const lookbackDays = options.lookbackDays && [7, 30, 90].includes(options.lookbackDays)
      ? options.lookbackDays
      : 30;

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - lookbackDays);
    sinceDate.setHours(0, 0, 0, 0);

    const snapshots = await prisma.storageSnapshot.findMany({
      where: {
        OR: [{ tenantId: "platform" }, { tenantId: null }],
        snapshotDate: { gte: sinceDate },
      },
      orderBy: { snapshotDate: "asc" },
    });

    const snapshotMap = new Map<string, any>();
    snapshots.forEach((s) => {
      const dStr = s.snapshotDate.toISOString().slice(0, 10);
      snapshotMap.set(dStr, s);
    });
    const deduped = Array.from(snapshotMap.values()).sort(
      (a, b) => a.snapshotDate.getTime() - b.snapshotDate.getTime()
    );

    // Convert observed snapshots to GrowthDataPoint
    let prevBytes = 0;
    const history: GrowthDataPoint[] = deduped.map((s, idx) => {
      const used = this.toSafeNumber(s.usedBytes);
      const trash = this.toSafeNumber(s.trashBytes);
      const ver = this.toSafeNumber(s.versionBytes);
      const res = this.toSafeNumber(s.reservedBytes);
      const billable = used + trash + ver;
      const quota = this.toSafeNumber(s.quotaBytes);
      const delta = idx === 0 ? 0 : used - prevBytes;
      prevBytes = used;

      return {
        date: s.snapshotDate.toISOString().slice(0, 10),
        usedBytes: used,
        formattedUsed: this.formatBytes(used),
        trashBytes: trash,
        formattedTrash: this.formatBytes(trash),
        versionBytes: ver,
        formattedVersion: this.formatBytes(ver),
        reservedBytes: res,
        formattedReserved: this.formatBytes(res),
        billableBytes: billable,
        formattedBillable: this.formatBytes(billable),
        quotaBytes: quota,
        formattedQuota: this.formatBytes(quota),
        fileCount: s.fileCount,
        netGrowthBytes: delta,
        isProjected: false,
      };
    });

    // Reclaimed storage tracking via FileActivity
    const activities = await prisma.fileActivity.findMany({
      where: {
        createdAt: { gte: sinceDate },
        action: { in: ["DELETE", "PURGE", "TRASH_EMPTIED", "purge", "trash"] },
      },
      include: { file: { select: { fileSize: true } } },
    });
    const reclaimedBytes = activities.reduce((acc, a) => acc + (a.file?.fileSize || 0), 0);

    const netPeriodGrowthBytes = history.length >= 2
      ? history[history.length - 1].usedBytes - history[0].usedBytes
      : 0;
    const averageDailyGrowthBytes = history.length >= 2
      ? Math.round(netPeriodGrowthBytes / Math.max(1, history.length - 1))
      : 0;

    // Generate forward projections if sufficient history
    const projections: GrowthDataPoint[] = [];
    if (history.length >= 2 && averageDailyGrowthBytes !== 0) {
      const lastPoint = history[history.length - 1];
      const lastDate = new Date(lastPoint.date);
      let runningUsed = lastPoint.usedBytes;

      [7, 14, 21, 30].forEach((futureDay) => {
        const fDate = new Date(lastDate);
        fDate.setDate(fDate.getDate() + futureDay);
        const fUsed = Math.max(0, runningUsed + averageDailyGrowthBytes * futureDay);
        projections.push({
          date: fDate.toISOString().slice(0, 10),
          usedBytes: fUsed,
          formattedUsed: this.formatBytes(fUsed),
          trashBytes: lastPoint.trashBytes,
          formattedTrash: this.formatBytes(lastPoint.trashBytes),
          versionBytes: lastPoint.versionBytes,
          formattedVersion: this.formatBytes(lastPoint.versionBytes),
          reservedBytes: 0,
          formattedReserved: "0 B",
          billableBytes: fUsed + lastPoint.trashBytes + lastPoint.versionBytes,
          formattedBillable: this.formatBytes(fUsed + lastPoint.trashBytes + lastPoint.versionBytes),
          quotaBytes: lastPoint.quotaBytes,
          formattedQuota: lastPoint.formattedQuota,
          fileCount: lastPoint.fileCount,
          netGrowthBytes: averageDailyGrowthBytes * futureDay,
          isProjected: true,
        });
      });
    }

    return {
      lookbackDays,
      totalTrackedDays: history.length,
      dataPoints: history.length,
      hasSufficientHistory: history.length >= 2,
      history,
      projections,
      summary: {
        netPeriodGrowthBytes,
        formattedNetPeriodGrowth: this.formatBytes(netPeriodGrowthBytes),
        averageDailyGrowthBytes,
        formattedDailyGrowth: this.formatBytes(averageDailyGrowthBytes) + " / day",
        reclaimedPeriodBytes: reclaimedBytes,
        formattedReclaimedPeriod: this.formatBytes(reclaimedBytes),
      },
    };
  }

  /**
   * 4. Fetch Tenant Growth Time Series & Forward Projections
   */
  public static async getTenantGrowthHistory(
    tenantId: string,
    options: { lookbackDays?: number } = {}
  ): Promise<TenantGrowthHistoryResult> {
    const lookbackDays = options.lookbackDays && [7, 30, 90].includes(options.lookbackDays)
      ? options.lookbackDays
      : 30;

    const forecast = await this.calculateTenantForecast(tenantId, { lookbackDays });

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - lookbackDays);
    sinceDate.setHours(0, 0, 0, 0);

    const snapshots = await prisma.storageSnapshot.findMany({
      where: {
        tenantId,
        snapshotDate: { gte: sinceDate },
      },
      orderBy: { snapshotDate: "asc" },
    });

    const snapshotMap = new Map<string, any>();
    snapshots.forEach((s) => {
      const dStr = s.snapshotDate.toISOString().slice(0, 10);
      snapshotMap.set(dStr, s);
    });
    const deduped = Array.from(snapshotMap.values()).sort(
      (a, b) => a.snapshotDate.getTime() - b.snapshotDate.getTime()
    );

    let prevBytes = 0;
    const history: GrowthDataPoint[] = deduped.map((s, idx) => {
      const used = this.toSafeNumber(s.usedBytes);
      const trash = this.toSafeNumber(s.trashBytes);
      const ver = this.toSafeNumber(s.versionBytes);
      const res = this.toSafeNumber(s.reservedBytes);
      const billable = used + trash + ver;
      const quota = this.toSafeNumber(s.quotaBytes);
      const delta = idx === 0 ? 0 : used - prevBytes;
      prevBytes = used;

      return {
        date: s.snapshotDate.toISOString().slice(0, 10),
        usedBytes: used,
        formattedUsed: this.formatBytes(used),
        trashBytes: trash,
        formattedTrash: this.formatBytes(trash),
        versionBytes: ver,
        formattedVersion: this.formatBytes(ver),
        reservedBytes: res,
        formattedReserved: this.formatBytes(res),
        billableBytes: billable,
        formattedBillable: this.formatBytes(billable),
        quotaBytes: quota,
        formattedQuota: this.formatBytes(quota),
        fileCount: s.fileCount,
        netGrowthBytes: delta,
        isProjected: false,
      };
    });

    const projections: GrowthDataPoint[] = [];
    if (history.length >= 2 && forecast.averageDailyGrowthBytes > 0) {
      const lastPoint = history[history.length - 1];
      const lastDate = new Date(lastPoint.date);

      [7, 14, 21, 30].forEach((futureDay) => {
        const fDate = new Date(lastDate);
        fDate.setDate(fDate.getDate() + futureDay);
        const fUsed = Math.max(0, lastPoint.usedBytes + forecast.averageDailyGrowthBytes * futureDay);
        projections.push({
          date: fDate.toISOString().slice(0, 10),
          usedBytes: fUsed,
          formattedUsed: this.formatBytes(fUsed),
          trashBytes: lastPoint.trashBytes,
          formattedTrash: this.formatBytes(lastPoint.trashBytes),
          versionBytes: lastPoint.versionBytes,
          formattedVersion: this.formatBytes(lastPoint.versionBytes),
          reservedBytes: 0,
          formattedReserved: "0 B",
          billableBytes: fUsed + lastPoint.trashBytes + lastPoint.versionBytes,
          formattedBillable: this.formatBytes(fUsed + lastPoint.trashBytes + lastPoint.versionBytes),
          quotaBytes: lastPoint.quotaBytes,
          formattedQuota: lastPoint.formattedQuota,
          fileCount: lastPoint.fileCount,
          netGrowthBytes: forecast.averageDailyGrowthBytes * futureDay,
          isProjected: true,
        });
      });
    }

    return {
      tenantId,
      lookbackDays,
      dataPoints: history.length,
      hasSufficientHistory: history.length >= 2,
      history,
      projections,
      forecast,
    };
  }

  /**
   * 5. Get Quota Exhaustion Watchlist (Tenants closest to running out of storage)
   */
  public static async getExhaustionWatchlist(limit = 15): Promise<TenantForecastWatchlistEntry[]> {
    const tenants = await prisma.tenant.findMany({
      include: {
        subscription: { include: { plan: true } },
      },
      take: 50,
    });

    const watchlist: TenantForecastWatchlistEntry[] = [];
    const CHUNK_SIZE = 15;

    for (let i = 0; i < tenants.length; i += CHUNK_SIZE) {
      const chunk = tenants.slice(i, i + CHUNK_SIZE);
      const results = await Promise.all(
        chunk.map(async (t) => {
          try {
            const forecast = await this.calculateTenantForecast(t.id, { lookbackDays: 30 });
            return { t, forecast };
          } catch {
            return null;
          }
        })
      );

      for (const res of results) {
        if (!res) continue;
        const { t, forecast } = res;
        // Include tenants that are locked, approaching quota, or have days remaining <= 90
        if (
          forecast.thresholdState === "LOCKED" ||
          forecast.thresholdState === "CRITICAL" ||
          forecast.thresholdState === "WARNING" ||
          (forecast.projectedDaysRemaining !== null && forecast.projectedDaysRemaining <= 90)
        ) {
          watchlist.push({
            tenantId: t.id,
            name: t.name,
            slug: t.slug,
            domainUrl: `${t.slug}.masterhrms.com`,
            plan: t.subscription?.plan?.name || "Starter Cloud",
            currentUsageBytes: forecast.currentUsageBytes,
            formattedCurrentUsage: forecast.formattedCurrentUsage,
            quotaBytes: forecast.quotaBytes,
            formattedQuota: forecast.formattedQuota,
            utilizationPercent: forecast.utilizationPercent,
            thresholdState: forecast.thresholdState,
            averageDailyGrowthBytes: forecast.averageDailyGrowthBytes,
            formattedDailyGrowth: forecast.formattedDailyGrowth,
            projectedDaysRemaining: forecast.projectedDaysRemaining,
            projectedExhaustionDate: forecast.projectedExhaustionDate,
            confidence: forecast.confidence,
            forecastStatus: forecast.forecastStatus,
          });
        }
      }
    }

    // Sort: 0 days (Locked) first, then shortest days remaining, then highest utilization
    watchlist.sort((a, b) => {
      const aDays = a.projectedDaysRemaining ?? 9999;
      const bDays = b.projectedDaysRemaining ?? 9999;
      if (aDays !== bDays) return aDays - bDays;
      return b.utilizationPercent - a.utilizationPercent;
    });

    return watchlist.slice(0, limit);
  }

  /**
   * 6. Scan for Storage Anomaly Insights
   */
  public static async getStorageAnomalies(limit = 10): Promise<StorageAnomalyInsight[]> {
    const anomalies: StorageAnomalyInsight[] = [];
    const tenants = await prisma.tenant.findMany({
      include: { subscription: true },
      take: 100,
    });

    const tenantIds = tenants.map((t) => t.id);
    const usages = await prisma.storageUsage.findMany({
      where: { tenantId: { in: tenantIds }, userId: null },
    });
    const usageMap = new Map(usages.map((u) => [u.tenantId, u]));

    for (const t of tenants) {
      const u = usageMap.get(t.id);
      if (!u) continue;

      const used = this.toSafeNumber(u.usedBytes);
      const trash = this.toSafeNumber(u.trashBytes);
      const reserved = this.toSafeNumber(u.reservedBytes);

      // 1. Trash Accumulation Anomaly (> 25% of active storage and > 50 MB)
      if (used > 0 && trash > 50 * 1024 * 1024 && trash / used > 0.25) {
        anomalies.push({
          id: `anomaly-trash-${t.id}`,
          tenantId: t.id,
          tenantName: t.name,
          type: "TRASH_ACCUMULATION",
          severity: "WARNING",
          title: "High Recycle Bin Accumulation",
          message: `Recycle Bin contains ${this.formatBytes(trash)} (${Math.round((trash / used) * 100)}% of active storage). Emptying trash will reclaim quota.`,
          metricFormatted: this.formatBytes(trash),
          detectedAt: new Date().toISOString(),
        });
      }

      // 2. Reserved In-Flight Upload Stall (> 100 MB pending)
      if (reserved > 100 * 1024 * 1024) {
        anomalies.push({
          id: `anomaly-reserved-${t.id}`,
          tenantId: t.id,
          tenantName: t.name,
          type: "RESERVED_STALL",
          severity: "WARNING",
          title: "High Uncommitted Upload Reservations",
          message: `${this.formatBytes(reserved)} in uncommitted upload reservations holding quota capacity.`,
          metricFormatted: this.formatBytes(reserved),
          detectedAt: new Date().toISOString(),
        });
      }
    }

    return anomalies.slice(0, limit);
  }

  /**
   * 7. Automated Daily Snapshots Capture (Idempotent)
   */
  public static async captureDailySnapshots(): Promise<{
    tenantSnapshots: number;
    fleetSnapshot: boolean;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tenants = await prisma.tenant.findMany({
      select: { id: true },
    });

    let tenantCount = 0;
    const CHUNK_SIZE = 25;
    for (let i = 0; i < tenants.length; i += CHUNK_SIZE) {
      const chunk = tenants.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (t) => {
          try {
            await StorageAdminService.takeDailySnapshot(t.id);
            tenantCount++;
          } catch (err) {
            console.warn(`[Snapshot Scheduler] Failed snapshot for tenant ${t.id}:`, err);
          }
        })
      );
    }

    // Platform fleet aggregate snapshot
    let fleetSuccess = false;
    try {
      await StorageAdminService.takeDailySnapshot(null);
      fleetSuccess = true;
    } catch (err) {
      console.warn("[Snapshot Scheduler] Failed fleet aggregate snapshot:", err);
    }

    return {
      tenantSnapshots: tenantCount,
      fleetSnapshot: fleetSuccess,
    };
  }
}
