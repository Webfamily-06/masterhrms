import { rawPrisma, prisma as proxiedPrisma } from "../../prisma";
import {
  QuotaService,
  PLAN_STORAGE_CAPACITIES_GB,
  DEFAULT_USER_QUOTA_BYTES,
  MAX_FILE_SIZE_BYTES,
  QuotaExceededError,
} from "./quota.service";
import { OutboxService } from "../outbox.service";
import { broadcastToTenant } from "../../socket";

const prisma = rawPrisma || proxiedPrisma;

export type QuotaLifecycleState = "NORMAL" | "WARNING" | "CRITICAL" | "LOCKED";

export interface QuotaHierarchySummary {
  tenantId: string;
  lifecycleState: QuotaLifecycleState;
  effectiveUtilizationPct: number;
  platform: {
    ceilingBytes: bigint;
    formattedCeiling: string;
    maxFileSizeBytes: number;
    formattedMaxFileSize: string;
    defaultUserQuotaBytes: bigint;
    formattedDefaultUserQuota: string;
  };
  platformCeiling?: {
    quotaBytes: string;
    formattedLimit: string;
  };
  tenant: {
    tenantId?: string;
    planId: string;
    planName: string;
    quotaBytes: any;
    formattedQuota: string;
    source: string;
    usedBytes: any;
    formattedUsed: string;
    reservedBytes: any;
    formattedReserved: string;
    availableBytes: any;
    formattedAvailable: string;
    thresholdState?: QuotaLifecycleState;
  };
  departments?: any[];
  teams?: any[];
  departmentAllocationsTotal?: {
    totalBytes: string;
    formattedTotal: string;
    oversubscriptionPercent: number;
  };
  teamAllocationsTotal?: {
    totalBytes: string;
    formattedTotal: string;
    oversubscriptionPercent: number;
  };
  allocations: {
    departments: {
      allocatedTotalBytes: bigint;
      formattedAllocatedTotal: string;
      departmentCount: number;
      unallocatedTenantBytes: bigint;
    };
    teams: {
      allocatedTotalBytes: bigint;
      formattedAllocatedTotal: string;
      teamCount: number;
    };
    usersWithOverridesCount: number;
  };
}

export class QuotaGovernanceService {
  public static readonly PLATFORM_CEILING_BYTES = BigInt(1024) * BigInt(1024 * 1024 * 1024); // 1 TB default (1,099,511,627,776 bytes)
  public static readonly DEFAULT_DEPARTMENT_QUOTA_BYTES = BigInt(10) * BigInt(1024 * 1024 * 1024); // 10 GB nominal default
  public static readonly DEFAULT_TEAM_QUOTA_BYTES = BigInt(5) * BigInt(1024 * 1024 * 1024); // 5 GB default

  /**
   * Helper to format bytes into readable notation
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
   * Centralized canonical 4-state lifecycle calculator
   * NORMAL: < 80%
   * WARNING: 80% - 89.9%
   * CRITICAL: 90% - 99.9%
   * LOCKED: >= 100%
   */
  public static resolveThresholdLevel(percentUsed: number): QuotaLifecycleState {
    if (percentUsed >= 100) return "LOCKED";
    if (percentUsed >= 90) return "CRITICAL";
    if (percentUsed >= 80) return "WARNING";
    return "NORMAL";
  }

  /**
   * Evaluates and updates tenant storage alert and lifecycle state in database.
   * Dispatches Outbox events and WebSocket alerts on state transitions.
   */
  public static async evaluateAndTransitionState(
    txOrPrisma: any,
    tenantId: string,
    currentPercentUsed: number
  ): Promise<{
    currentState: QuotaLifecycleState;
    previousState: QuotaLifecycleState;
    transitioned: boolean;
    isRecovery: boolean;
  }> {
    const currentState = this.resolveThresholdLevel(currentPercentUsed);

    let alertState = await txOrPrisma.storageAlertState.findUnique({
      where: { tenantId },
    });

    if (!alertState) {
      alertState = await txOrPrisma.storageAlertState.create({
        data: {
          tenantId,
          currentLevel: currentState,
          lastNotifiedLevel: "NORMAL",
          lastNotifiedAt: null,
        },
      });
    }

    const previousState = (alertState.currentLevel as QuotaLifecycleState) || "NORMAL";
    const transitioned = currentState !== previousState;
    const isRecovery =
      (previousState === "LOCKED" && currentState !== "LOCKED") ||
      (previousState === "CRITICAL" && (currentState === "WARNING" || currentState === "NORMAL")) ||
      (previousState === "WARNING" && currentState === "NORMAL");

    if (transitioned) {
      const eventType = isRecovery
        ? "quota.recovered"
        : currentState === "LOCKED"
        ? "quota.state.locked"
        : "quota.state.transitioned";

      // 1. Transactional Outbox Event
      try {
        await OutboxService.createOutboxEvent(
          {
            tenantId,
            eventType,
            entityType: "STORAGE_QUOTA",
            entityId: tenantId,
            payload: {
              tenantId,
              previousState,
              currentState,
              percentUsed: currentPercentUsed,
              isRecovery,
              timestamp: new Date().toISOString(),
            },
          },
          txOrPrisma
        );
      } catch (err) {
        console.warn("[QuotaGovernanceService] Failed to create outbox event:", err);
      }

      // 2. Realtime WebSocket Broadcast
      try {
        broadcastToTenant(tenantId, "storage:alert", {
          tenantId,
          currentState,
          previousState,
          percentUsed: currentPercentUsed,
          isRecovery,
        });
      } catch (err) {
        console.warn("[QuotaGovernanceService] WebSocket broadcast error:", err);
      }

      // 3. Update alert state row in DB
      await txOrPrisma.storageAlertState.update({
        where: { id: alertState.id },
        data: {
          currentLevel: currentState,
          lastNotifiedLevel: currentState,
          lastNotifiedAt: new Date(),
          resolvedAt: isRecovery ? new Date() : null,
        },
      });
    }

    return {
      currentState,
      previousState,
      transitioned,
      isRecovery,
    };
  }

  /**
   * Resolves Tier 0 Platform Quota Policy
   */
  public static getPlatformQuotaPolicy() {
    return {
      ceilingBytes: this.PLATFORM_CEILING_BYTES,
      formattedCeiling: this.formatBytes(this.PLATFORM_CEILING_BYTES),
      maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
      formattedMaxFileSize: `${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`,
      defaultUserQuotaBytes: DEFAULT_USER_QUOTA_BYTES,
      formattedDefaultUserQuota: this.formatBytes(DEFAULT_USER_QUOTA_BYTES),
    };
  }

  /**
   * Resolves Tier 1 Tenant Effective Quota
   */
  public static async getTenantQuotaBytes(tenantId: string | null): Promise<bigint> {
    return await QuotaService.getTenantQuotaBytes(tenantId);
  }

  /**
   * Resolves Tier 2 Department Quota Allocation
   */
  public static async getDepartmentQuotaBytes(
    tenantId: string,
    departmentId: string
  ): Promise<bigint> {
    const setting = await prisma.setting.findUnique({
      where: {
        scope_scopeId_key: {
          scope: "TENANT",
          scopeId: tenantId,
          key: `quota_dept_${departmentId}`,
        },
      },
    });

    if (setting && setting.valueJson) {
      const val = (setting.valueJson as any)?.quotaBytes;
      if (val) return BigInt(val);
    }

    // Default nominal department allocation
    return this.DEFAULT_DEPARTMENT_QUOTA_BYTES;
  }

  /**
   * Resolves Tier 3 Collaborative Team Folder Quota Allocation
   */
  public static async getTeamQuotaBytes(
    tenantId: string,
    teamId: string
  ): Promise<bigint> {
    const team = await prisma.fileTeam.findUnique({
      where: { id: teamId },
      select: { quotaBytes: true, tenantId: true },
    });

    if (team && team.tenantId === tenantId && team.quotaBytes) {
      return team.quotaBytes;
    }

    return this.DEFAULT_TEAM_QUOTA_BYTES;
  }

  /**
   * Resolves Tier 4 User Personal Quota Allocation
   */
  public static async getUserQuotaBytes(
    tenantId: string | null,
    userId: string
  ): Promise<bigint> {
    return await QuotaService.getUserQuotaBytes(tenantId, userId);
  }

  /**
   * Configures a department quota with parent oversubscription validation.
   */
  public static async setDepartmentQuota(
    tenantId: string,
    departmentId: string,
    quotaBytes: bigint,
    updatedBy?: string
  ): Promise<{ departmentId: string; quotaBytes: bigint; formattedQuota: string }> {
    if (quotaBytes <= BigInt(0)) {
      throw new Error("Department quota must be greater than zero.");
    }

    // 1. Verify department exists and belongs to tenant
    const dept = await prisma.department.findUnique({
      where: { id: departmentId },
    });
    if (!dept || dept.tenantId !== tenantId) {
      throw new Error(`Department with ID ${departmentId} not found in this tenant.`);
    }

    // 2. Validate against total tenant capacity (Oversubscription Protection)
    const tenantCapacity = await this.getTenantQuotaBytes(tenantId);
    if (quotaBytes > tenantCapacity) {
      throw new Error(
        `Department quota (${this.formatBytes(quotaBytes)}) cannot exceed total tenant plan capacity (${this.formatBytes(tenantCapacity)}).`
      );
    }

    // 3. Persist in Setting model inside transaction
    await prisma.$transaction(async (tx: any) => {
      await tx.setting.upsert({
        where: {
          scope_scopeId_key: {
            scope: "TENANT",
            scopeId: tenantId,
            key: `quota_dept_${departmentId}`,
          },
        },
        create: {
          scope: "TENANT",
          scopeId: tenantId,
          group: "storage_quota",
          key: `quota_dept_${departmentId}`,
          valueJson: {
            departmentId,
            quotaBytes: quotaBytes.toString(),
            formatted: this.formatBytes(quotaBytes),
          },
          valueType: "JSON",
          updatedBy: updatedBy ?? null,
        },
        update: {
          valueJson: {
            departmentId,
            quotaBytes: quotaBytes.toString(),
            formatted: this.formatBytes(quotaBytes),
          },
          updatedBy: updatedBy ?? null,
        },
      });

      // Transactional Outbox Event
      await OutboxService.createOutboxEvent(
        {
          tenantId,
          eventType: "quota.allocation.department",
          entityType: "DEPARTMENT_QUOTA",
          entityId: departmentId,
          actorId: updatedBy ?? null,
          payload: {
            tenantId,
            departmentId,
            departmentName: dept.name,
            quotaBytes: quotaBytes.toString(),
            formattedQuota: this.formatBytes(quotaBytes),
            updatedBy,
          },
        },
        tx
      );
    });

    try {
      broadcastToTenant(tenantId, "storage:quota_updated", {
        type: "DEPARTMENT",
        departmentId,
        quotaBytes: Number(quotaBytes),
      });
    } catch (err) {
      console.warn("[QuotaGovernanceService] WebSocket emit error:", err);
    }

    return {
      departmentId,
      quotaBytes,
      formattedQuota: this.formatBytes(quotaBytes),
    };
  }

  /**
   * Configures a team folder quota with parent oversubscription validation.
   */
  public static async setTeamQuota(
    tenantId: string,
    teamId: string,
    quotaBytes: bigint,
    updatedBy?: string
  ): Promise<{ teamId: string; quotaBytes: bigint; formattedQuota: string }> {
    if (quotaBytes <= BigInt(0)) {
      throw new Error("Team quota must be greater than zero.");
    }

    const team = await prisma.fileTeam.findUnique({
      where: { id: teamId },
    });
    if (!team || team.tenantId !== tenantId) {
      throw new Error(`Team folder with ID ${teamId} not found in this tenant.`);
    }

    // Validate against total tenant capacity
    const tenantCapacity = await this.getTenantQuotaBytes(tenantId);
    if (quotaBytes > tenantCapacity) {
      throw new Error(
        `Team quota (${this.formatBytes(quotaBytes)}) cannot exceed total tenant plan capacity (${this.formatBytes(tenantCapacity)}).`
      );
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.fileTeam.update({
        where: { id: teamId },
        data: { quotaBytes },
      });

      await OutboxService.createOutboxEvent(
        {
          tenantId,
          eventType: "quota.allocation.team",
          entityType: "TEAM_QUOTA",
          entityId: teamId,
          actorId: updatedBy ?? null,
          payload: {
            tenantId,
            teamId,
            teamName: team.name,
            quotaBytes: quotaBytes.toString(),
            formattedQuota: this.formatBytes(quotaBytes),
            updatedBy,
          },
        },
        tx
      );
    });

    try {
      broadcastToTenant(tenantId, "storage:quota_updated", {
        type: "TEAM",
        teamId,
        quotaBytes: Number(quotaBytes),
      });
    } catch (err) {
      console.warn("[QuotaGovernanceService] WebSocket emit error:", err);
    }

    return {
      teamId,
      quotaBytes,
      formattedQuota: this.formatBytes(quotaBytes),
    };
  }

  /**
   * Configures a user personal quota override with parent ceiling validation.
   */
  public static async setUserQuota(
    tenantId: string,
    userId: string,
    quotaBytes: bigint,
    updatedBy?: string,
    reason?: string
  ): Promise<{ userId: string; quotaBytes: bigint; formattedQuota: string; source: string }> {
    if (quotaBytes <= BigInt(0)) {
      throw new Error("User quota must be greater than zero.");
    }

    const tenantCapacity = await this.getTenantQuotaBytes(tenantId);
    if (quotaBytes > tenantCapacity) {
      throw new Error(
        `User personal quota (${this.formatBytes(quotaBytes)}) cannot exceed total tenant plan capacity (${this.formatBytes(tenantCapacity)}).`
      );
    }

    const existing = await prisma.storageQuota.findFirst({
      where: { tenantId, userId },
    });

    let updated: any;
    await prisma.$transaction(async (tx: any) => {
      if (existing) {
        updated = await tx.storageQuota.update({
          where: { id: existing.id },
          data: {
            quotaBytes,
            source: "OVERRIDE",
            updatedBy: updatedBy ?? null,
          },
        });
      } else {
        updated = await tx.storageQuota.create({
          data: {
            tenantId,
            userId,
            quotaBytes,
            source: "OVERRIDE",
            updatedBy: updatedBy ?? null,
          },
        });
      }

      await OutboxService.createOutboxEvent(
        {
          tenantId,
          eventType: "quota.allocation.user",
          entityType: "USER_QUOTA",
          entityId: userId,
          actorId: updatedBy ?? null,
          payload: {
            tenantId,
            userId,
            quotaBytes: quotaBytes.toString(),
            formattedQuota: this.formatBytes(quotaBytes),
            reason,
            updatedBy,
          },
        },
        tx
      );
    });

    try {
      broadcastToTenant(tenantId, "storage:quota_updated", {
        type: "USER",
        userId,
        quotaBytes: Number(quotaBytes),
      });
    } catch (err) {
      console.warn("[QuotaGovernanceService] WebSocket emit error:", err);
    }

    return {
      userId,
      quotaBytes,
      formattedQuota: this.formatBytes(quotaBytes),
      source: updated.source,
    };
  }

  /**
   * Super-admin authorized tenant quota override
   */
  public static async setTenantQuotaOverride(
    tenantId: string,
    quotaBytes: bigint,
    updatedBy?: string,
    reason?: string
  ): Promise<{ tenantId: string; quotaBytes: bigint; formattedQuota: string; source: string }> {
    if (quotaBytes <= BigInt(0)) {
      throw new Error("Tenant quota override must be greater than zero.");
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new Error(`Tenant with ID ${tenantId} not found.`);
    }

    const existing = await prisma.storageQuota.findFirst({
      where: { tenantId, userId: null },
    });

    let updated: any;
    await prisma.$transaction(async (tx: any) => {
      if (existing) {
        updated = await tx.storageQuota.update({
          where: { id: existing.id },
          data: {
            quotaBytes,
            source: "OVERRIDE",
            updatedBy: updatedBy ?? null,
          },
        });
      } else {
        updated = await tx.storageQuota.create({
          data: {
            tenantId,
            userId: null,
            quotaBytes,
            source: "OVERRIDE",
            updatedBy: updatedBy ?? null,
          },
        });
      }

      await OutboxService.createOutboxEvent(
        {
          tenantId,
          eventType: "quota.override.tenant",
          entityType: "TENANT_QUOTA",
          entityId: tenantId,
          actorId: updatedBy ?? null,
          payload: {
            tenantId,
            tenantName: tenant.name,
            quotaBytes: quotaBytes.toString(),
            formattedQuota: this.formatBytes(quotaBytes),
            reason,
            updatedBy,
          },
        },
        tx
      );
    });

    try {
      broadcastToTenant(tenantId, "storage:quota_updated", {
        type: "TENANT_OVERRIDE",
        tenantId,
        quotaBytes: Number(quotaBytes),
      });
    } catch (err) {
      console.warn("[QuotaGovernanceService] WebSocket emit error:", err);
    }

    return {
      tenantId,
      quotaBytes,
      formattedQuota: this.formatBytes(quotaBytes),
      source: updated.source,
    };
  }

  /**
   * Returns comprehensive 5-level quota governance summary for a tenant
   */
  public static async getTenantQuotaGovernanceSummary(
    tenantId: string
  ): Promise<QuotaHierarchySummary> {
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
    const planQuotaBytes = await this.getTenantQuotaBytes(tenantId);
    const planName = tenant.subscription?.plan?.name || "Starter";
    const planId = tenant.subscription?.planId || "starter";

    let quotaSource = "PLAN";
    const override = await prisma.storageQuota.findFirst({
      where: { tenantId, userId: null },
    });
    if (override && override.source === "OVERRIDE") {
      quotaSource = "OVERRIDE";
    }

    // 2. Materialized usage
    const usage = await QuotaService.getOrCreateUsage(prisma, tenantId, null);
    const usedBytes = BigInt(usage.usedBytes);
    const reservedBytes = BigInt(usage.reservedBytes);
    const availableBytes =
      planQuotaBytes > (usedBytes + reservedBytes)
        ? planQuotaBytes - (usedBytes + reservedBytes)
        : BigInt(0);

    const percentUsed =
      planQuotaBytes > BigInt(0)
        ? Math.min(
            100,
            parseFloat(
              (((Number(usedBytes) + Number(reservedBytes)) / Number(planQuotaBytes)) * 100).toFixed(1)
            )
          )
        : 0;

    const lifecycleState = this.resolveThresholdLevel(percentUsed);

    // 3. Department Allocations
    const departments = await prisma.department.findMany({
      where: { tenantId },
      include: {
        employees: { select: { userId: true } },
      },
    });

    const deptList: any[] = [];
    let allocatedDeptBytes = BigInt(0);

    for (const dept of departments) {
      const deptQuota = await this.getDepartmentQuotaBytes(tenantId, dept.id);
      allocatedDeptBytes += deptQuota;
      const userIds = dept.employees.map((e: any) => e.userId).filter(Boolean);
      let deptUsed = BigInt(0);
      if (userIds.length > 0) {
        const files = await prisma.mediaFile.findMany({
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
        deptUsed = files.reduce((acc: bigint, f: any) => acc + BigInt(f.fileSize || 0), BigInt(0));
      }
      const deptPercent = deptQuota > BigInt(0)
        ? Math.min(100, parseFloat(((Number(deptUsed) / Number(deptQuota)) * 100).toFixed(1)))
        : 0;

      deptList.push({
        id: dept.id,
        name: dept.name,
        code: (dept as any).code || null,
        employeeCount: dept.employees.length,
        quotaBytes: Number(deptQuota),
        formattedQuota: this.formatBytes(deptQuota),
        usedBytes: Number(deptUsed),
        formattedUsed: this.formatBytes(deptUsed),
        percentUsed: deptPercent,
      });
    }

    // 4. Team Allocations
    const teams = await prisma.fileTeam.findMany({
      where: { tenantId },
      include: {
        members: { select: { userId: true } },
      },
    });

    const teamList: any[] = [];
    let allocatedTeamBytes = BigInt(0);

    for (const tm of teams) {
      const tmQuota = tm.quotaBytes || this.DEFAULT_TEAM_QUOTA_BYTES;
      allocatedTeamBytes += tmQuota;
      const teamFiles = await prisma.mediaFile.findMany({
        where: {
          tenantId,
          status: "ACTIVE",
          deletedAt: null,
          isFolder: false,
          OR: [
            { ownerType: "TEAM", ownerId: tm.id },
            ...(tm.rootFolderId ? [{ materializedPath: { contains: `/${tm.rootFolderId}/` } }] : []),
          ],
        },
        select: { fileSize: true },
      });
      const tmUsed = teamFiles.reduce((acc: bigint, f: any) => acc + BigInt(f.fileSize || 0), BigInt(0));
      const tmPercent = tmQuota > BigInt(0)
        ? Math.min(100, parseFloat(((Number(tmUsed) / Number(tmQuota)) * 100).toFixed(1)))
        : 0;

      teamList.push({
        id: tm.id,
        name: tm.name,
        memberCount: tm.members.length,
        quotaBytes: Number(tmQuota),
        formattedQuota: this.formatBytes(tmQuota),
        usedBytes: Number(tmUsed),
        formattedUsed: this.formatBytes(tmUsed),
        percentUsed: tmPercent,
      });
    }

    // 5. User Overrides Count
    const userOverridesCount = await prisma.storageQuota.count({
      where: {
        tenantId,
        userId: { not: null },
        source: "OVERRIDE",
      },
    });

    const unallocatedTenantBytes =
      planQuotaBytes > allocatedDeptBytes ? planQuotaBytes - allocatedDeptBytes : BigInt(0);

    const deptOversubPercent = planQuotaBytes > BigInt(0)
      ? Math.min(100, Math.round((Number(allocatedDeptBytes) / Number(planQuotaBytes)) * 100))
      : 0;
    const teamOversubPercent = planQuotaBytes > BigInt(0)
      ? Math.min(100, Math.round((Number(allocatedTeamBytes) / Number(planQuotaBytes)) * 100))
      : 0;

    return {
      tenantId,
      lifecycleState,
      effectiveUtilizationPct: percentUsed,
      platform: this.getPlatformQuotaPolicy(),
      platformCeiling: {
        quotaBytes: this.PLATFORM_CEILING_BYTES.toString(),
        formattedLimit: this.formatBytes(this.PLATFORM_CEILING_BYTES),
      },
      tenant: {
        tenantId,
        planId,
        planName,
        quotaBytes: planQuotaBytes.toString(),
        formattedQuota: this.formatBytes(planQuotaBytes),
        source: quotaSource,
        usedBytes: usedBytes.toString(),
        formattedUsed: this.formatBytes(usedBytes),
        reservedBytes: reservedBytes.toString(),
        formattedReserved: this.formatBytes(reservedBytes),
        availableBytes: availableBytes.toString(),
        formattedAvailable: this.formatBytes(availableBytes),
        thresholdState: lifecycleState,
      },
      departments: deptList,
      teams: teamList,
      departmentAllocationsTotal: {
        totalBytes: allocatedDeptBytes.toString(),
        formattedTotal: this.formatBytes(allocatedDeptBytes),
        oversubscriptionPercent: deptOversubPercent,
      },
      teamAllocationsTotal: {
        totalBytes: allocatedTeamBytes.toString(),
        formattedTotal: this.formatBytes(allocatedTeamBytes),
        oversubscriptionPercent: teamOversubPercent,
      },
      allocations: {
        departments: {
          allocatedTotalBytes: allocatedDeptBytes,
          formattedAllocatedTotal: this.formatBytes(allocatedDeptBytes),
          departmentCount: departments.length,
          unallocatedTenantBytes,
        },
        teams: {
          allocatedTotalBytes: allocatedTeamBytes,
          formattedAllocatedTotal: this.formatBytes(allocatedTeamBytes),
          teamCount: teams.length,
        },
        usersWithOverridesCount: userOverridesCount,
      },
    };
  }
}
