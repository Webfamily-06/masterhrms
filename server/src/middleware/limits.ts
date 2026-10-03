import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { prisma, rawPrisma } from "../prisma";

export type LimitKey = "seats" | "warehouses" | "storage";

export const counters: Record<LimitKey, (tenantId: string) => Promise<number>> = {
  seats: async (t: string) => {
    const db = rawPrisma || prisma;
    return db.employee.count({
      where: {
        tenantId: t,
        status: { not: "terminated" },
      },
    });
  },
  warehouses: async (t: string) => {
    const db = rawPrisma || prisma;
    return db.warehouse.count({
      where: { tenantId: t },
    });
  },
  storage: async (_t: string) => {
    // Storage counter placeholder — will read TenantUsage.storageMb once added
    return 0;
  },
};

export async function getActivePlan(tenantId: string) {
  const db = rawPrisma || prisma;
  const sub = await db.tenantSubscription.findFirst({
    where: { tenantId },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });

  const planFeatures = (sub?.plan?.features && typeof sub.plan.features === "object") ? (sub.plan.features as any) : {};

  return {
    maxEmployees: sub?.maxEmployees ?? sub?.plan?.maxEmployees ?? null,
    maxWarehouses: (sub as any)?.maxWarehouses ?? planFeatures?.maxWarehouses ?? null,
    storageMb: planFeatures?.storageMb ?? null,
  };
}

export function requireWithinLimit(key: LimitKey) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Super admin or impersonation bypass
      if (req.user?.roles?.includes("super_admin") || (req.user as any)?.isImpersonating) {
        return next();
      }

      const tenantId = req.user?.tenantId || (req as any).tenantId || (req as any).tenantContext?.tenantId;
      if (!tenantId) {
        return next();
      }

      const plan = await getActivePlan(tenantId);
      const limitMap: Record<LimitKey, number | null> = {
        seats: plan.maxEmployees,
        warehouses: plan.maxWarehouses,
        storage: plan.storageMb,
      };

      const max = limitMap[key];
      if (max == null || max < 0) {
        // Unlimited
        return next();
      }

      const counterFn = counters[key];
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
    } catch (err: any) {
      console.error(`[requireWithinLimit:${key}] error:`, err?.message || err);
      // In case of limit check failure, do not block unhandled; proceed or notify
      next();
    }
  };
}
