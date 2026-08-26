import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const addonsRouter = Router();

/**
 * GET /api/addons/entitlements
 * Returns all active addon entitlements for the current tenant.
 */
addonsRouter.get("/entitlements", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required." });
    }

    const entitlements = await prisma.tenantAddon.findMany({
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
