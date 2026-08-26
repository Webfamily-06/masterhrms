import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { prisma } from "../prisma";

/**
 * Middleware to enforce Tenant Add-on Subscription / Entitlement.
 * Validates that the tenant has an active subscription or trial for the given addon.
 */
export function requireAddon(addonSlug: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required for add-on access." });
      }

      // Check if super_admin bypass is allowed
      if (req.user?.roles?.includes("super_admin")) {
        return next();
      }

      const tenantAddon = await prisma.tenantAddon.findUnique({
        where: {
          tenantId_addonSlug: {
            tenantId,
            addonSlug,
          },
        },
      });

      // Default active for development/trial or check active/trial status
      if (
        !tenantAddon ||
        (tenantAddon.status !== "active" && tenantAddon.status !== "trial")
      ) {
        return res.status(403).json({
          error: `Add-on '${addonSlug}' is not active on this workspace.`,
          addonSlug,
          requiresSubscription: true,
          status: tenantAddon?.status || "inactive",
        });
      }

      // Check if trial has expired
      if (tenantAddon.status === "trial" && tenantAddon.trialEndsAt) {
        if (new Date() > new Date(tenantAddon.trialEndsAt)) {
          return res.status(403).json({
            error: `Your free trial for '${addonSlug}' has expired. Please upgrade to continue.`,
            addonSlug,
            requiresSubscription: true,
            status: "expired",
          });
        }
      }

      (req as any).addonEntitlement = tenantAddon;
      next();
    } catch (err: any) {
      console.error(`[requireAddon:${addonSlug}] error:`, err);
      return res.status(500).json({ error: "Failed to verify add-on entitlement." });
    }
  };
}
