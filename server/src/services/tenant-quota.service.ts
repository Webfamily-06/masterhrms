import { rawPrisma } from "../prisma";
import { QuotaGovernanceService } from "./files/quota-governance.service";

export interface QuotaCheckResult {
  allowed: boolean;
  resource: "employees" | "users" | "storage";
  currentUsage: number;
  maxLimit: number | null;
  remaining: number | null;
  utilizationPct: number | null;
  message?: string;
}

export class TenantQuotaExceededError extends Error {
  public readonly status = 403;
  public readonly code = "TENANT_QUOTA_EXCEEDED";
  public readonly quota: QuotaCheckResult;

  constructor(quota: QuotaCheckResult) {
    super(quota.message || `Workspace quota exceeded for ${quota.resource}.`);
    this.name = "TenantQuotaExceededError";
    this.quota = quota;
  }
}

async function resolveSubscriptionLimits(tenantId: string) {
  const sub = await rawPrisma.tenantSubscription.findUnique({
    where: { tenantId },
    include: { plan: true },
  });
  return {
    maxEmployees: sub?.maxEmployees ?? sub?.plan?.maxEmployees ?? null,
    maxUsers: sub?.maxUsers ?? sub?.plan?.maxUsers ?? null,
    storageLimitGb: sub?.storageLimitGb ?? sub?.plan?.storageLimitGb ?? null,
  };
}

/**
 * Checks whether adding `incrementBy` employees stays within the tenant's plan/override seat quota.
 */
export async function checkEmployeeQuota(
  tenantId: string,
  incrementBy = 1
): Promise<QuotaCheckResult> {
  const [limits, currentUsage] = await Promise.all([
    resolveSubscriptionLimits(tenantId),
    rawPrisma.employee.count({ where: { tenantId, status: { not: "terminated" } } }),
  ]);

  const maxLimit = limits.maxEmployees && limits.maxEmployees > 0 ? limits.maxEmployees : null;
  if (maxLimit === null) {
    return {
      allowed: true,
      resource: "employees",
      currentUsage,
      maxLimit: null,
      remaining: null,
      utilizationPct: null,
    };
  }

  const remaining = Math.max(0, maxLimit - currentUsage);
  const allowed = currentUsage + incrementBy <= maxLimit;
  return {
    allowed,
    resource: "employees",
    currentUsage,
    maxLimit,
    remaining,
    utilizationPct: Number(((currentUsage / maxLimit) * 100).toFixed(1)),
    message: allowed
      ? undefined
      : `Employee limit reached (${currentUsage}/${maxLimit}). Upgrade your plan or contact Super Admin to raise the seat quota.`,
  };
}

/**
 * Checks whether adding `incrementBy` user profiles stays within the tenant's user quota.
 */
export async function checkUserQuota(
  tenantId: string,
  incrementBy = 1
): Promise<QuotaCheckResult> {
  const [limits, currentUsage] = await Promise.all([
    resolveSubscriptionLimits(tenantId),
    rawPrisma.profile.count({ where: { tenantId } }),
  ]);

  const maxLimit = limits.maxUsers && limits.maxUsers > 0 ? limits.maxUsers : null;
  if (maxLimit === null) {
    return {
      allowed: true,
      resource: "users",
      currentUsage,
      maxLimit: null,
      remaining: null,
      utilizationPct: null,
    };
  }

  const remaining = Math.max(0, maxLimit - currentUsage);
  const allowed = currentUsage + incrementBy <= maxLimit;
  return {
    allowed,
    resource: "users",
    currentUsage,
    maxLimit,
    remaining,
    utilizationPct: Number(((currentUsage / maxLimit) * 100).toFixed(1)),
    message: allowed
      ? undefined
      : `Workspace user limit reached (${currentUsage}/${maxLimit}). Upgrade your plan or request a quota increase.`,
  };
}

/**
 * Checks whether adding `additionalBytes` fits inside the tenant's storage quota.
 */
export async function checkStorageQuota(
  tenantId: string,
  additionalBytes = 0
): Promise<QuotaCheckResult> {
  const [quotaBig, mediaAgg] = await Promise.all([
    QuotaGovernanceService.getTenantQuotaBytes(tenantId),
    rawPrisma.mediaFile.aggregate({
      where: { tenantId, deletedAt: null },
      _sum: { fileSize: true },
    }),
  ]);
  const currentUsage = Number(mediaAgg._sum.fileSize || 0);
  const maxLimit = Number(quotaBig || 0) > 0 ? Number(quotaBig) : null;

  if (maxLimit === null) {
    return {
      allowed: true,
      resource: "storage",
      currentUsage,
      maxLimit: null,
      remaining: null,
      utilizationPct: null,
    };
  }

  const remaining = Math.max(0, maxLimit - currentUsage);
  const allowed = currentUsage + additionalBytes <= maxLimit;
  return {
    allowed,
    resource: "storage",
    currentUsage,
    maxLimit,
    remaining,
    utilizationPct: Number(((currentUsage / maxLimit) * 100).toFixed(1)),
    message: allowed
      ? undefined
      : `Storage quota exceeded (${Math.round(currentUsage / (1024 * 1024))} MB / ${Math.round(maxLimit / (1024 * 1024))} MB).`,
  };
}

/**
 * Enforces a resource quota and throws a 403 TenantQuotaExceededError when blocked.
 */
export async function assertTenantQuota(
  tenantId: string,
  resource: "employees" | "users" | "storage",
  incrementBy = 1
): Promise<QuotaCheckResult> {
  const result =
    resource === "employees"
      ? await checkEmployeeQuota(tenantId, incrementBy)
      : resource === "users"
        ? await checkUserQuota(tenantId, incrementBy)
        : await checkStorageQuota(tenantId, incrementBy);

  if (!result.allowed) {
    throw new TenantQuotaExceededError(result);
  }
  return result;
}
