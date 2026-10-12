import { Router, Response } from "express";
import { prisma, rawPrisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { AuditService } from "../services/audit.service";
import { OutboxService } from "../services/outbox.service";

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
      const planSlug = ((activeSub.plan as any).slug || "").toLowerCase();
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
          "two-factor-auth",
          "backup-restore",
          "activity-logs",
          "internal-reminders",
          "public-api",
          "notice-board",
          "outbound-webhooks",
          "sms-gateway",
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
 * POST /api/addons/:addonSlug/install
 * Authoritative Addon Installation Rule:
 * 1. Resolves authoritative catalog price server-side (never trusts client).
 * 2. If free (price == 0) or included in active tenant subscription plan:
 *    - Enables addon for tenant workspace immediately.
 *    - Persists TenantAddon and Tenant.enabledModules transactionally.
 *    - Zero payment gateway redirection.
 *    - Idempotent on repeated calls.
 * 3. If paid (price > 0) and not included:
 *    - Rejects with 402 Payment Required.
 */
addonsRouter.post("/:addonSlug/install", async (req: AuthRequest, res: Response) => {
  try {
    const db = rawPrisma || prisma;
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    const { addonSlug } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required." });
    }

    const cleanSlug = addonSlug.trim().toLowerCase();

    // 1. Resolve catalog record from DB
    const catalogItem = await db.addon.findUnique({
      where: { slug: cleanSlug },
    });

    // Check price (defaults to 0 if free extension)
    const publishedPrice = catalogItem?.priceMonthly != null ? Number(catalogItem.priceMonthly) : 0;

    // 2. Check if included in tenant plan
    const activeSub = await db.tenantSubscription.findFirst({
      where: {
        tenantId,
        status: { in: ["active", "trial"] },
      },
      include: { plan: true },
    });

    let isIncludedInPlan = false;
    if (activeSub?.plan) {
      const planName = (activeSub.plan.name || "").toLowerCase();
      const isSovereign = planName.includes("sovereign") || planName.includes("growth");
      if (isSovereign) {
        isIncludedInPlan = true;
      }
      if (Array.isArray(activeSub.plan.includedAddonIds)) {
        if (activeSub.plan.includedAddonIds.map((id: any) => String(id).toLowerCase()).includes(cleanSlug)) {
          isIncludedInPlan = true;
        }
      }
    }

    // 3. Paid protection: if price > 0 and NOT included in plan, require payment flow
    if (publishedPrice > 0 && !isIncludedInPlan) {
      // Check if an existing paid order exists for this addon
      const paidOrders = await db.commerceOrder.findMany({
        where: {
          tenantId,
          status: "PAID",
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      const paidOrder = paidOrders.find((ord: any) => {
        const snap = typeof ord.priceSnapshot === "string" ? JSON.parse(ord.priceSnapshot) : ord.priceSnapshot;
        const items = snap?.items || snap?.lineItems || [];
        return items.some((it: any) =>
          String(it.slug || it.itemId || it.catalogItemId || it.addonSlug || "").toLowerCase() === cleanSlug ||
          JSON.stringify(snap).toLowerCase().includes(cleanSlug)
        );
      });

      if (!paidOrder) {
        return res.status(402).json({
          error: `Add-on "${catalogItem?.name || cleanSlug}" is a commercial add-on (₹${publishedPrice}/mo). Please complete payment through the marketplace checkout flow.`,
          paymentRequired: true,
          priceMonthly: publishedPrice,
          addonSlug: cleanSlug,
        });
      }
    }

    // 4. Transactional install & enablement
    const entitlement = await db.$transaction(async (tx: any) => {
      const ent = await tx.tenantAddon.upsert({
        where: { tenantId_addonSlug: { tenantId, addonSlug: cleanSlug } },
        create: {
          tenantId,
          addonSlug: cleanSlug,
          status: "active",
          plan: publishedPrice === 0 ? "free_tier" : isIncludedInPlan ? "plan_included" : "paid_addon",
          features: catalogItem?.features || ["full_access"],
        },
        update: {
          status: "active",
          plan: publishedPrice === 0 ? "free_tier" : isIncludedInPlan ? "plan_included" : "paid_addon",
        },
      });

      // Update tenant module enablement in TenantModule
      if (tx.tenantModule) {
        await tx.tenantModule.upsert({
          where: { tenantId_moduleKey: { tenantId, moduleKey: cleanSlug } },
          create: { tenantId, moduleKey: cleanSlug, isEnabled: true },
          update: { isEnabled: true },
        });
      }

      return ent;
    });

    // 5. Audit & Outbox logging
    await AuditService.logMutation({
      tenantId,
      actorId: userId || "SYSTEM",
      action: "addon.installed",
      entityType: "TenantAddon",
      entityId: entitlement.id,
      newState: { addonSlug: cleanSlug, plan: entitlement.plan, price: publishedPrice },
    }).catch(() => {});

    await OutboxService.createOutboxEvent({
      tenantId,
      eventType: "addon.installed",
      entityType: "TenantAddon",
      entityId: entitlement.id,
      actorId: userId || "SYSTEM",
      payload: { addonSlug: cleanSlug, plan: entitlement.plan },
    }).catch(() => {});

    return res.json({
      success: true,
      message: `Add-on "${catalogItem?.name || cleanSlug}" installed and enabled successfully.`,
      entitlement: {
        ...entitlement,
        isActive: true,
      },
    });
  } catch (err: any) {
    console.error("[addons/install] error:", err);
    return res.status(500).json({ error: err.message || "Failed to install add-on." });
  }
});

/**
 * POST /api/addons/:addonSlug/uninstall
 * Disables and uninstalls add-on from tenant workspace.
 */
addonsRouter.post("/:addonSlug/uninstall", async (req: AuthRequest, res: Response) => {
  try {
    const db = rawPrisma || prisma;
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    const { addonSlug } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required." });
    }

    const cleanSlug = addonSlug.trim().toLowerCase();

    await db.$transaction(async (tx: any) => {
      await tx.tenantAddon.updateMany({
        where: { tenantId, addonSlug: cleanSlug },
        data: { status: "uninstalled" },
      });

      if (tx.tenantModule) {
        await tx.tenantModule.updateMany({
          where: { tenantId, moduleKey: cleanSlug },
          data: { isEnabled: false },
        });
      }
    });

    await AuditService.logMutation({
      tenantId,
      actorId: userId || "SYSTEM",
      action: "addon.uninstalled",
      entityType: "TenantAddon",
      entityId: cleanSlug,
    }).catch(() => {});

    return res.json({
      success: true,
      message: `Add-on "${cleanSlug}" uninstalled successfully.`,
    });
  } catch (err: any) {
    console.error("[addons/uninstall] error:", err);
    return res.status(500).json({ error: err.message || "Failed to uninstall add-on." });
  }
});

/**
 * POST /api/addons/:addonSlug/trial
 * Starts a 14-day free trial for an add-on.
 */
addonsRouter.post("/:addonSlug/trial", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const db = rawPrisma || prisma;
    const tenantId = req.user?.tenantId;
    const { addonSlug } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required." });
    }

    const existing = await db.tenantAddon.findUnique({
      where: { tenantId_addonSlug: { tenantId, addonSlug } },
    });

    if (existing && existing.status === "active") {
      return res.status(400).json({ error: "Addon is already actively subscribed." });
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14 days trial

    const entitlement = await db.tenantAddon.upsert({
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
 * Validates server-side payment/order state before granting paid entitlement.
 */
addonsRouter.post("/:addonSlug/subscribe", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const db = rawPrisma || prisma;
    const tenantId = req.user?.tenantId;
    const { addonSlug } = req.params;
    const { plan = "pro_annual", orderId } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required." });
    }

    const cleanSlug = addonSlug.trim().toLowerCase();
    const catalogItem = await db.addon.findUnique({ where: { slug: cleanSlug } });
    const price = catalogItem?.priceMonthly != null ? Number(catalogItem.priceMonthly) : 0;

    // Server-side payment validation for paid add-ons
    if (price > 0) {
      let hasValidPayment = false;

      if (orderId) {
        const order = await db.commerceOrder.findFirst({
          where: { id: orderId, tenantId, status: "PAID" },
        });
        if (order) hasValidPayment = true;
      } else {
        const paidOrders = await db.commerceOrder.findMany({
          where: {
            tenantId,
            status: "PAID",
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        });
        const order = paidOrders.find((ord: any) => {
          const snap = typeof ord.priceSnapshot === "string" ? JSON.parse(ord.priceSnapshot) : ord.priceSnapshot;
          const items = snap?.items || snap?.lineItems || [];
          return items.some((it: any) =>
            String(it.slug || it.itemId || it.catalogItemId || it.addonSlug || "").toLowerCase() === cleanSlug ||
            JSON.stringify(snap).toLowerCase().includes(cleanSlug)
          );
        });
        if (order) hasValidPayment = true;
      }

      if (!hasValidPayment) {
        return res.status(402).json({
          error: "Valid paid order required before activating paid add-on subscription.",
          paymentRequired: true,
        });
      }
    }

    const renewsAt = new Date();
    renewsAt.setFullYear(renewsAt.getFullYear() + 1); // 1 year renewal

    const entitlement = await db.tenantAddon.upsert({
      where: { tenantId_addonSlug: { tenantId, addonSlug: cleanSlug } },
      create: {
        tenantId,
        addonSlug: cleanSlug,
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
      message: `Successfully subscribed to ${cleanSlug}!`,
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
    const db = rawPrisma || prisma;
    const tenantId = req.user?.tenantId;
    const { addonSlug } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context required." });
    }

    const entitlement = await db.tenantAddon.update({
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
