"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantQuotaExceededError = void 0;
exports.checkEmployeeQuota = checkEmployeeQuota;
exports.checkUserQuota = checkUserQuota;
exports.checkStorageQuota = checkStorageQuota;
exports.assertTenantQuota = assertTenantQuota;
const prisma_1 = require("../prisma");
const quota_governance_service_1 = require("./files/quota-governance.service");
class TenantQuotaExceededError extends Error {
    status = 403;
    code = "TENANT_QUOTA_EXCEEDED";
    quota;
    constructor(quota) {
        super(quota.message || `Workspace quota exceeded for ${quota.resource}.`);
        this.name = "TenantQuotaExceededError";
        this.quota = quota;
    }
}
exports.TenantQuotaExceededError = TenantQuotaExceededError;
async function resolveSubscriptionLimits(tenantId) {
    const sub = await prisma_1.rawPrisma.tenantSubscription.findUnique({
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
async function checkEmployeeQuota(tenantId, incrementBy = 1) {
    const [limits, currentUsage] = await Promise.all([
        resolveSubscriptionLimits(tenantId),
        prisma_1.rawPrisma.employee.count({ where: { tenantId, status: { not: "terminated" } } }),
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
async function checkUserQuota(tenantId, incrementBy = 1) {
    const [limits, currentUsage] = await Promise.all([
        resolveSubscriptionLimits(tenantId),
        prisma_1.rawPrisma.profile.count({ where: { tenantId } }),
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
async function checkStorageQuota(tenantId, additionalBytes = 0) {
    const [quotaBig, mediaAgg] = await Promise.all([
        quota_governance_service_1.QuotaGovernanceService.getTenantQuotaBytes(tenantId),
        prisma_1.rawPrisma.mediaFile.aggregate({
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
async function assertTenantQuota(tenantId, resource, incrementBy = 1) {
    const result = resource === "employees"
        ? await checkEmployeeQuota(tenantId, incrementBy)
        : resource === "users"
            ? await checkUserQuota(tenantId, incrementBy)
            : await checkStorageQuota(tenantId, incrementBy);
    if (!result.allowed) {
        throw new TenantQuotaExceededError(result);
    }
    return result;
}
