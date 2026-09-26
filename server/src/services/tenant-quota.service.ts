import { prisma } from "../prisma";

export interface QuotaCheckResult {
  allowed: boolean;
  currentUsage: number;
  maxLimit: number | null;
  remaining: number | null;
  message?: string;
}

/**
 * assertTenantQuota — Proactive limit enforcement for SaaS tenants
 * Validates employee, user, and module limits against TenantSubscription / SubscriptionPlan
 */
export async function assertTenantQuota(
  tenantId: string,
  resourceType: "employees" | "users" | "clients" | "projects"
): Promise<QuotaCheckResult> {
  if (!tenantId) {
    return { allowed: true, currentUsage: 0, maxLimit: null, remaining: null };
  }

  // 1. Fetch Tenant's active subscription and plan
  const sub = await prisma.tenantSubscription.findUnique({
    where: { tenantId },
    include: { plan: true },
  });

  if (!sub || sub.status === "suspended") {
    return {
      allowed: false,
      currentUsage: 0,
      maxLimit: 0,
      remaining: 0,
      message: "Organization subscription is suspended or expired. Please contact administrator.",
    };
  }

  // Determine max limit (prefer subscription override, fallback to plan limit)
  let maxLimit: number | null = null;
  let currentUsage = 0;

  if (resourceType === "employees") {
    maxLimit = sub.maxEmployees ?? sub.plan?.maxEmployees ?? null;
    currentUsage = await prisma.employee.count({
      where: { tenantId, status: { in: ["active", "on_leave"] } },
    });
  } else if (resourceType === "users") {
    maxLimit = sub.maxUsers ?? sub.plan?.maxUsers ?? null;
    currentUsage = await prisma.userRole.count({
      where: { tenantId },
    });
  } else if (resourceType === "clients") {
    currentUsage = await prisma.customer.count({
      where: { tenantId },
    });
  } else if (resourceType === "projects") {
    currentUsage = await prisma.project.count({
      where: { tenantId },
    });
  }

  // If no limit defined, allowed is true (unlimited)
  if (maxLimit === null || maxLimit === undefined || maxLimit === 0) {
    return {
      allowed: true,
      currentUsage,
      maxLimit: null,
      remaining: null,
    };
  }

  const remaining = Math.max(0, maxLimit - currentUsage);
  const allowed = currentUsage < maxLimit;

  return {
    allowed,
    currentUsage,
    maxLimit,
    remaining,
    message: allowed
      ? undefined
      : `Subscription limit reached (${currentUsage}/${maxLimit} ${resourceType}). Please upgrade your plan to add more.`,
  };
}
