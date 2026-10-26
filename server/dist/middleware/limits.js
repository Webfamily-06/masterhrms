"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.counters = void 0;
exports.getActivePlan = getActivePlan;
exports.requireWithinLimit = requireWithinLimit;
const prisma_1 = require("../prisma");
exports.counters = {
    seats: async (t) => {
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        return db.employee.count({
            where: {
                tenantId: t,
                status: { not: "terminated" },
            },
        });
    },
    warehouses: async (t) => {
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        return db.warehouse.count({
            where: { tenantId: t },
        });
    },
    storage: async (_t) => {
        // Storage counter placeholder — will read TenantUsage.storageMb once added
        return 0;
    },
};
async function getActivePlan(tenantId) {
    const db = prisma_1.rawPrisma || prisma_1.prisma;
    const sub = await db.tenantSubscription.findFirst({
        where: { tenantId },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
    });
    const planFeatures = (sub?.plan?.features && typeof sub.plan.features === "object") ? sub.plan.features : {};
    return {
        maxEmployees: sub?.maxEmployees ?? sub?.plan?.maxEmployees ?? null,
        maxWarehouses: sub?.maxWarehouses ?? planFeatures?.maxWarehouses ?? null,
        storageMb: planFeatures?.storageMb ?? null,
    };
}
function requireWithinLimit(key) {
    return async (req, res, next) => {
        try {
            // Super admin or impersonation bypass
            if (req.user?.roles?.includes("super_admin") || req.user?.isImpersonating) {
                return next();
            }
            const tenantId = req.user?.tenantId || req.tenantId || req.tenantContext?.tenantId;
            if (!tenantId) {
                return next();
            }
            const plan = await getActivePlan(tenantId);
            const limitMap = {
                seats: plan.maxEmployees,
                warehouses: plan.maxWarehouses,
                storage: plan.storageMb,
            };
            const max = limitMap[key];
            if (max == null || max < 0) {
                // Unlimited
                return next();
            }
            const counterFn = exports.counters[key];
            const used = await counterFn(tenantId);
            if (used >= max) {
                return res.status(409).json({
                    error: `Your plan allows ${max} ${key}. Upgrade to add more.`,
                    code: "PLAN_LIMIT_REACHED",
                    limit: key,
                    used,
                    max,
                });
            }
            next();
        }
        catch (err) {
            console.error(`[requireWithinLimit:${key}] error:`, err?.message || err);
            // In case of limit check failure, do not block unhandled; proceed or notify
            next();
        }
    };
}
