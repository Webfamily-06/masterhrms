"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspacePolicyError = void 0;
exports.resolveWorkspacePolicy = resolveWorkspacePolicy;
exports.assertWorkspaceActive = assertWorkspaceActive;
exports.getWorkspacePolicy = getWorkspacePolicy;
exports.getWorkspacePoliciesBatch = getWorkspacePoliciesBatch;
exports.syncSubscriptionPlans = syncSubscriptionPlans;
exports.lockWorkspaceCapacity = lockWorkspaceCapacity;
const prisma_1 = require("../prisma");
class WorkspacePolicyError extends Error {
    status;
    code;
    constructor(message, status = 403, code = "POLICY_VIOLATION") {
        super(message);
        this.status = status;
        this.name = "WorkspacePolicyError";
        this.code = code;
    }
}
exports.WorkspacePolicyError = WorkspacePolicyError;
function resolveWorkspacePolicy(subscription = {}, plans = []) {
    const plan = plans.find((p) => p.id === subscription.planId);
    const limit = (value) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
    const planLimit = (camelCase, snakeCase) => plan?.[camelCase] ?? plan?.[snakeCase];
    const planPrice = (camelCase, snakeCase) => Number(plan?.[camelCase] ?? plan?.[snakeCase]) || 0;
    const isExpired = Boolean(subscription.status === "expired" ||
        (subscription.expiresAt && new Date(subscription.expiresAt).getTime() <= Date.now()));
    let maxEmployees = limit(subscription.maxEmployees !== undefined ? subscription.maxEmployees : planLimit("maxEmployees", "max_employees"));
    // Sovereign tier hard capacity limit is 100 employees per Product Owner policy CP-02
    if (maxEmployees === null) {
        const planSlug = String(subscription.planId || plan?.slug || plan?.name || "").toLowerCase().trim();
        if (planSlug === "sovereign" || planSlug.includes("sovereign")) {
            maxEmployees = 100;
        }
        else if (planSlug === "growth" || planSlug.includes("growth")) {
            maxEmployees = 100;
        }
        else if (planSlug === "starter" || planSlug.includes("starter")) {
            maxEmployees = 25;
        }
    }
    return {
        planId: plan?.id ?? null,
        planName: plan?.name ?? "Unassigned",
        status: subscription.status === "suspended" ? "suspended" : (isExpired ? "expired" : (subscription.status || "active")),
        isExpired,
        expiresAt: subscription.expiresAt || null,
        maxEmployees,
        maxUsers: limit(subscription.maxUsers !== undefined ? subscription.maxUsers : planLimit("maxUsers", "max_users")),
        billingCycle: subscription.billingCycle === "annual" ? "annual" : "monthly",
        monthlyRevenue: plan ? (subscription.billingCycle === "annual" ? planPrice("priceAnnual", "price_annual") / 12 : planPrice("priceMonthly", "price_monthly")) : 0,
    };
}
function assertWorkspaceActive(policy) {
    if (policy.status === "suspended")
        throw new WorkspacePolicyError("This workspace is suspended. Contact platform support.");
    if (policy.expiresAt && new Date(policy.expiresAt).getTime() <= Date.now()) {
        throw new WorkspacePolicyError("This workspace subscription has expired. Contact platform support.");
    }
}
async function getWorkspacePolicy(tenantId, db = prisma_1.rawPrisma) {
    // Prefer the relational source of truth. The optional access keeps the
    // transition backward-compatible with test fixtures and pre-migration DBs.
    if (db.tenantSubscription?.findUnique) {
        try {
            const subscription = await db.tenantSubscription.findUnique({
                where: { tenantId },
                include: { plan: true },
            });
            if (subscription) {
                return resolveWorkspacePolicy(subscription, subscription.plan ? [subscription.plan] : []);
            }
        }
        catch (error) {
            // A deployment can temporarily run code before db push. Fall back to
            // legacy data instead of changing a workspace's access unexpectedly.
            if (error?.code !== "P2021")
                throw error;
        }
    }
    let subscription = null;
    let catalog = null;
    try {
        subscription = await db.cmsPage.findUnique({ where: { slug: `tenant-${tenantId}-subscription` } });
    }
    catch {
        subscription = null;
    }
    try {
        catalog = await db.cmsPage.findUnique({ where: { slug: "system-monetization-plans" } });
    }
    catch {
        catalog = null;
    }
    return resolveWorkspacePolicy(subscription?.content || {}, Array.isArray(catalog?.content?.plans) ? catalog.content.plans : []);
}
async function getWorkspacePoliciesBatch(tenantIds, db = prisma_1.rawPrisma) {
    if (!tenantIds.length)
        return {};
    const uniqueIds = Array.from(new Set(tenantIds));
    const resultMap = {};
    if (db.tenantSubscription?.findMany) {
        try {
            const subscriptions = await db.tenantSubscription.findMany({
                where: { tenantId: { in: uniqueIds } },
                include: { plan: true },
            });
            const subMap = new Map(subscriptions.map((s) => [s.tenantId, s]));
            for (const id of uniqueIds) {
                const sub = subMap.get(id);
                if (sub) {
                    resultMap[id] = resolveWorkspacePolicy(sub, sub.plan ? [sub.plan] : []);
                }
            }
            // If all tenant IDs were found in tenantSubscription table, return immediately
            if (Object.keys(resultMap).length === uniqueIds.length) {
                return resultMap;
            }
        }
        catch (error) {
            if (error?.code !== "P2021")
                throw error;
        }
    }
    // Fallback: batch fetch CMS subscription pages for any missing tenant IDs
    const missingIds = uniqueIds.filter((id) => !resultMap[id]);
    if (missingIds.length) {
        const slugMap = new Map(missingIds.map((id) => [`tenant-${id}-subscription`, id]));
        const [cmsPages, catalog] = await Promise.all([
            db.cmsPage.findMany({ where: { slug: { in: Array.from(slugMap.keys()) } } }),
            db.cmsPage.findUnique({ where: { slug: "system-monetization-plans" } }),
        ]);
        const cmsMap = new Map((cmsPages || []).map((p) => [p.slug, p.content]));
        const plans = Array.isArray(catalog?.content?.plans) ? catalog.content.plans : [];
        for (const id of missingIds) {
            const content = cmsMap.get(`tenant-${id}-subscription`);
            resultMap[id] = resolveWorkspacePolicy(content || {}, plans);
        }
    }
    return resultMap;
}
async function syncSubscriptionPlans(plans, db = prisma_1.rawPrisma) {
    if (!db.subscriptionPlan?.upsert)
        return;
    await Promise.all(plans.map((plan) => db.subscriptionPlan.upsert({
        where: { id: plan.id },
        create: {
            id: plan.id,
            name: plan.name,
            description: plan.description || null,
            status: plan.status === "inactive" ? "inactive" : "active",
            priceMonthly: Number(plan.price_monthly) || 0,
            priceAnnual: Number(plan.price_annual) || 0,
            maxEmployees: Number.isSafeInteger(plan.max_employees) ? plan.max_employees : null,
            maxUsers: Number.isSafeInteger(plan.max_users) ? plan.max_users : null,
            features: Array.isArray(plan.features) ? plan.features : undefined,
            includedAddonIds: Array.isArray(plan.included_addon_ids) ? plan.included_addon_ids : undefined,
            isPopular: Boolean(plan.popular),
        },
        update: {
            name: plan.name,
            description: plan.description || null,
            status: plan.status === "inactive" ? "inactive" : "active",
            priceMonthly: Number(plan.price_monthly) || 0,
            priceAnnual: Number(plan.price_annual) || 0,
            maxEmployees: Number.isSafeInteger(plan.max_employees) ? plan.max_employees : null,
            maxUsers: Number.isSafeInteger(plan.max_users) ? plan.max_users : null,
            features: Array.isArray(plan.features) ? plan.features : undefined,
            includedAddonIds: Array.isArray(plan.included_addon_ids) ? plan.included_addon_ids : undefined,
            isPopular: Boolean(plan.popular),
        },
    })));
}
// Serialize capacity checks and writes on the tenant row, including imports and ATS conversions.
// Call inside the SAME transaction that creates the employee/account.
async function lockWorkspaceCapacity(db, tenantId, resource, additional = 1) {
    if (!tenantId)
        throw new WorkspacePolicyError("Workspace context is required.");
    const rows = await db.$queryRaw `SELECT id FROM tenants WHERE id = ${tenantId} FOR UPDATE`;
    if (!rows.length)
        throw new WorkspacePolicyError("Workspace not found.", 404);
    const policy = await getWorkspacePolicy(tenantId, db);
    assertWorkspaceActive(policy);
    const maximum = resource === "employees" ? policy.maxEmployees : policy.maxUsers;
    const used = resource === "employees"
        ? await db.employee.count({ where: { tenantId, status: { in: ["active", "on_leave"] } } })
        : await db.profile.count({ where: { tenantId, user: { roles: { none: { role: "super_admin" } } } } });
    if (maximum !== null && used + additional > maximum) {
        throw new WorkspacePolicyError(`Workspace ${resource} limit reached (${used}/${maximum}). Adding ${additional} would exceed plan capacity.`, 409, "QUOTA_EXCEEDED");
    }
}
