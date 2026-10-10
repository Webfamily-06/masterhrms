import { Router, Response } from "express";
import { prisma, rawPrisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";

export const addonsRouter = Router();

// Enforce authentication and request-scoped tenant context for all tenant addon routes
addonsRouter.use(requireAuth, resolveTenantContext);

/**
 * GET /api/addons/entitlements
 * Returns all active addon entitlements for the current tenant.
 */
addonsRouter.get("/entitlements", async (req: AuthRequest, res: Response) => {
  try {
    const db = rawPrisma || prisma;
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required." });
    }

    const entitlements = await db.tenantAddon.findMany({
      where: { tenantId },
    });

    const entitlementMap: Record<string, any> = {};
    entitlements.forEach((e) => {
      let isExpired = false;
      if (e.status === "trial" && e.trialEndsAt && new Date() > new Date(e.trialEndsAt)) {
        isExpired = true;
      }

      entitlementMap[e.addonSlug] = {
        id: e.id,
        addonSlug: e.addonSlug,
        status: isExpired ? "expired" : e.status,
        plan: e.plan,
        trialEndsAt: e.trialEndsAt,
        renewsAt: e.renewsAt,
        features: e.features,
        isActive: !isExpired && (e.status === "active" || e.status === "trial"),
      };
    });

    // Check tenant active subscription for included add-ons
    const activeSub = await db.tenantSubscription.findFirst({
      where: {
        tenantId,
        status: { in: ["active", "trial"] },
      },
      include: { plan: true },
    });

    if (activeSub?.plan) {
      const planName = (activeSub.plan.name || "").toLowerCase();
      const planSlug = (activeSub.plan.slug || "").toLowerCase();
      const features = Array.isArray(activeSub.plan.features) ? activeSub.plan.features : [];
      const isSovereignOrGrowth =
        planName.includes("sovereign") ||
        planName.includes("growth") ||
        planSlug.includes("sovereign") ||
        planSlug.includes("growth") ||
        features.some(
          (f: any) =>
            typeof f === "string" &&
            (f.toLowerCase().includes("sovereign") ||
              f.toLowerCase().includes("integration") ||
              f.toLowerCase().includes("all add-on") ||
              f.toLowerCase().includes("all-addon"))
        );

      if (isSovereignOrGrowth) {
        const ALL_INTEGRATIONS = [
          "woocommerce-sync",
          "shopify-sync",
          "google-workspace-integration",
          "tally-importer",
          "whatsapp-alerts",
          "razorpay-gateway",
          "biometric-sync",
          "okr-performance",
          "asset-management",
        ];
        for (const slug of ALL_INTEGRATIONS) {
          if (!entitlementMap[slug]) {
            entitlementMap[slug] = {
              id: `plan-${slug}`,
              addonSlug: slug,
              status: "active",
              plan: activeSub.plan.name || "included",
              isActive: true,
            };
          }
        }
      }

      if (Array.isArray(activeSub.plan.includedAddonIds)) {
        for (const addonId of activeSub.plan.includedAddonIds) {
          const slug = String(addonId).toLowerCase();
          if (!entitlementMap[slug]) {
            entitlementMap[slug] = {
              id: `plan-${slug}`,
              addonSlug: slug,
              status: "active",
              plan: activeSub.plan.name || "included",
              isActive: true,
            };
          }
        }
      }
    }

    return res.json({ entitlements: entitlementMap });
  } catch (err: any) {
    console.error("[addons/entitlements] error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch entitlements." });
  }
});

/**
 * POST /api/addons/:addonSlug/trial
 * Starts a 14-day free trial for an add-on.
 */
addonsRouter.post("/:addonSlug/trial", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { addonSlug } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required." });
    }

    const existing = await prisma.tenantAddon.findUnique({
      where: { tenantId_addonSlug: { tenantId, addonSlug } },
    });

    if (existing && existing.status === "active") {
      return res.status(400).json({ error: "Addon is already actively subscribed." });
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14 days trial

    const entitlement = await prisma.tenantAddon.upsert({
      where: { tenantId_addonSlug: { tenantId, addonSlug } },
      create: {
        tenantId,
        addonSlug,
        status: "trial",
        plan: "pro_trial",
        trialEndsAt,
        features: ["full_access"],
      },
      update: {
        status: "trial",
        trialEndsAt,
        plan: "pro_trial",
      },
    });

    return res.json({
      message: `14-Day Free Trial activated for ${addonSlug}!`,
      entitlement,
    });
  } catch (err: any) {
    console.error("[addons/trial] error:", err);
    return res.status(500).json({ error: err.message || "Failed to activate trial." });
  }
});

/**
 * POST /api/addons/:addonSlug/subscribe
 * Activates full paid subscription for an add-on.
 */
addonsRouter.post("/:addonSlug/subscribe", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { addonSlug } = req.params;
    const { plan = "pro_annual" } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required." });
    }

    const renewsAt = new Date();
    renewsAt.setFullYear(renewsAt.getFullYear() + 1); // 1 year renewal

    const entitlement = await prisma.tenantAddon.upsert({
      where: { tenantId_addonSlug: { tenantId, addonSlug } },
      create: {
        tenantId,
        addonSlug,
        status: "active",
        plan,
        renewsAt,
        features: ["unlimited"],
      },
      update: {
        status: "active",
        plan,
        renewsAt,
      },
    });

    return res.json({
      message: `Successfully subscribed to ${addonSlug}!`,
      entitlement,
    });
  } catch (err: any) {
    console.error("[addons/subscribe] error:", err);
    return res.status(500).json({ error: err.message || "Failed to subscribe to add-on." });
  }
});

/**
 * POST /api/addons/:addonSlug/cancel
 * Cancels add-on subscription (preserves data, marks inactive).
 */
addonsRouter.post("/:addonSlug/cancel", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { addonSlug } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required." });
    }

    const entitlement = await prisma.tenantAddon.update({
      where: { tenantId_addonSlug: { tenantId, addonSlug } },
      data: {
        status: "cancelled",
      },
    });

    return res.json({
      message: `Subscription for ${addonSlug} cancelled. Historical records are preserved.`,
      entitlement,
    });
  } catch (err: any) {
    console.error("[addons/cancel] error:", err);
    return res.status(500).json({ error: err.message || "Failed to cancel subscription." });
  }
});
