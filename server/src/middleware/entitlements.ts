import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { prisma, rawPrisma } from "../prisma";

export type EntitlementType = "product" | "addon";

export interface EntitlementCheckResult {
  entitled: boolean;
  type: EntitlementType;
  key: string;
  source?: "plan" | "addon" | "module" | "super_admin_bypass" | "core_platform";
  status?: string;
  reason?: string;
}

const PRODUCT_KEYS = new Set([
  "product_crm", "crm",
  "product_pos", "pos",
  "product_inventory", "inventory",
  "product_finance", "finance", "product_accounting", "accounting",
  "product_hrms", "hrms",
]);

function normalizeKey(key: string): { normalized: string; isProduct: boolean } {
  const lower = (key || "").trim().toLowerCase();
  const isProduct = lower.startsWith("product_") || PRODUCT_KEYS.has(lower);
  const normalized = lower.replace(/^product_/, "");
  return { normalized, isProduct };
}

function getCandidateModuleKeys(normalized: string, key: string): string[] {
  const keys = new Set<string>([normalized, key, `product_${normalized}`]);
  if (normalized === "finance" || normalized === "accounting") {
    keys.add("finance");
    keys.add("accounting");
    keys.add("product_finance");
    keys.add("product_accounting");
  }
  if (normalized === "pos" || normalized === "inventory") {
    keys.add("pos");
    keys.add("inventory");
    keys.add("product_pos");
    keys.add("product_inventory");
  }
  if (normalized === "crm") {
    keys.add("crm");
    keys.add("product_crm");
  }
  return Array.from(keys);
}

/**
 * Checks whether a tenant workspace possesses active entitlement
 * to a specific product (CRM, POS, Finance, HRMS) or add-on (Biometrics, Assets, Google Workspace, etc.)
 */
export async function checkTenantEntitlement(
  tenantId: string,
  key: string,
  isSuperAdmin = false
): Promise<EntitlementCheckResult> {
  const { normalized, isProduct } = normalizeKey(key);
  const type: EntitlementType = isProduct ? "product" : "addon";

  // 1. Platform Super Admin bypass
  if (isSuperAdmin) {
    return {
      entitled: true,
      type,
      key,
      source: "super_admin_bypass",
      status: "active",
    };
  }

  const db = rawPrisma || prisma;

  // 2. Check explicitly provisioned TenantModule
  try {
    const candidateKeys = getCandidateModuleKeys(normalized, key);
    const tenantMod = await db.tenantModule.findFirst({
      where: {
        tenantId,
        moduleKey: { in: candidateKeys },
      },
    });

    if (tenantMod) {
      if (tenantMod.isEnabled) {
        return {
          entitled: true,
          type,
          key,
          source: "module",
          status: "active",
        };
      } else {
        return {
          entitled: false,
          type,
          key,
          source: "module",
          status: "disabled",
          reason: `Module '${normalized}' is explicitly disabled for this workspace`,
        };
      }
    }
  } catch (err: any) {
    // Non-fatal, continue to next checks
  }

  // 3. Check TenantAddon (active, trial, or expired)
  try {
    const addonRecord = await db.tenantAddon.findFirst({
      where: {
        tenantId,
        addonSlug: { in: [normalized, key] },
      },
    });

    if (addonRecord) {
      if (addonRecord.status === "active") {
        return {
          entitled: true,
          type: "addon",
          key,
          source: "addon",
          status: "active",
        };
      }

      if (addonRecord.status === "trial") {
        if (addonRecord.trialEndsAt && new Date() > new Date(addonRecord.trialEndsAt)) {
          return {
            entitled: false,
            type: "addon",
            key,
            source: "addon",
            status: "expired",
            reason: `Add-on '${key}' trial has expired`,
          };
        }
        return {
          entitled: true,
          type: "addon",
          key,
          source: "addon",
          status: "trial",
        };
      }

      if (["suspended", "cancelled", "expired"].includes(addonRecord.status)) {
        return {
          entitled: false,
          type: "addon",
          key,
          source: "addon",
          status: addonRecord.status,
          reason: `Add-on '${key}' is ${addonRecord.status}`,
        };
      }
    }
  } catch (err: any) {
    // Non-fatal
  }

  // 4. Check TenantSubscription and SubscriptionPlan
  try {
    const sub = await db.tenantSubscription.findFirst({
      where: {
        tenantId,
        status: { in: ["active", "trialing", "trial"] },
      },
      orderBy: { createdAt: "desc" },
      include: { plan: true },
    });

    if (sub && sub.plan) {
      const planName = (sub.plan.name || "").toLowerCase();
      const planId = (sub.plan.id || "").toLowerCase();
      const planType = (sub.plan.planType || "").toLowerCase();

      // Top-tier enterprise / sovereign / growth plans include all products and add-ons
      if (
        planId === "sovereign" ||
        planId === "growth" ||
        planName.includes("sovereign") ||
        planName.includes("growth enterprise")
      ) {
        return {
          entitled: true,
          type,
          key,
          source: "plan",
          status: "active",
        };
      }

      // Feature array verification
      const rawFeatures = Array.isArray(sub.plan.features) ? (sub.plan.features as any[]) : [];
      const features: string[] = rawFeatures.map((f) => String(f));
      const featureMatches = features.some((f: string) => {
        const lf = f.toLowerCase();
        if (normalized === "crm") return lf.includes("crm");
        if (normalized === "pos") return lf.includes("pos");
        if (normalized === "inventory") return lf.includes("inventory") || lf.includes("pos");
        if (normalized === "finance" || normalized === "accounting") return lf.includes("financial") || lf.includes("ledger") || lf.includes("accounting");
        if (normalized === "hrms") return lf.includes("hrm") || lf.includes("payroll") || lf.includes("attendance");
        if (normalized === "biometric-sync") return lf.includes("biometric");
        return lf.includes(normalized);
      });

      if (featureMatches) {
        return {
          entitled: true,
          type,
          key,
          source: "plan",
          status: "active",
        };
      }

      // Included add-ons check
      const rawAddons = Array.isArray(sub.plan.includedAddonIds) ? (sub.plan.includedAddonIds as any[]) : [];
      const includedAddonIds: string[] = rawAddons.map((a) => String(a));
      if (includedAddonIds.includes(normalized) || includedAddonIds.includes(key)) {
        return {
          entitled: true,
          type: "addon",
          key,
          source: "plan",
          status: "active",
        };
      }
    }
  } catch (err: any) {
    // Non-fatal
  }

  // 5. Default base HRMS allowance (Core platform features)
  if (normalized === "hrms" || key === "product_hrms") {
    return {
      entitled: true,
      type: "product",
      key,
      source: "core_platform",
      status: "active",
    };
  }

  // Otherwise not entitled
  return {
    entitled: false,
    type,
    key,
    status: "inactive",
    reason: isProduct
      ? `Product '${key}' is not included in workspace subscription`
      : `Add-on '${key}' is not active on this workspace`,
  };
}

/**
 * Express middleware to enforce unified product and add-on entitlements.
 */
export function requireEntitlement(entitlementKey: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const isSuper = req.user?.roles?.includes("super_admin") || false;
      if (isSuper) {
        const { isProduct } = normalizeKey(entitlementKey);
        (req as any).entitlement = {
          entitled: true,
          type: isProduct ? "product" : "addon",
          key: entitlementKey,
          source: "super_admin_bypass",
          status: "active",
        };
        (req as any).addonEntitlement = (req as any).entitlement;
        return next();
      }

      const tenantId = req.user?.tenantId || (req as any).tenantId;
      if (!tenantId) {
        return res.status(400).json({
          error: "Tenant context required for entitlement verification.",
          code: "TENANT_REQUIRED",
        });
      }

      const result = await checkTenantEntitlement(tenantId, entitlementKey, isSuper);

      if (result.entitled) {
        (req as any).entitlement = result;
        (req as any).addonEntitlement = result; // backward compatibility
        return next();
      }

      if (result.status === "expired") {
        return res.status(403).json({
          error: `Your subscription/trial for '${entitlementKey}' has expired. Please upgrade or renew to continue.`,
          code: result.type === "product" ? "PRODUCT_EXPIRED" : "ADDON_EXPIRED",
          key: entitlementKey,
          addonSlug: entitlementKey,
          requiresSubscription: true,
          status: "expired",
        });
      }

      const isProduct = result.type === "product";
      return res.status(403).json({
        error: isProduct
          ? `Product '${entitlementKey}' is not included in this workspace's subscription.`
          : `Add-on '${entitlementKey}' is not active on this workspace.`,
        code: isProduct ? "PRODUCT_NOT_SUBSCRIBED" : "ADDON_REQUIRED",
        key: entitlementKey,
        addonSlug: entitlementKey,
        requiresSubscription: true,
        status: result.status || "inactive",
      });
    } catch (err: any) {
      console.error(`[requireEntitlement:${entitlementKey}] error:`, err);
      return res.status(500).json({ error: "Failed to verify workspace entitlement." });
    }
  };
}

export const requireProduct = (productKey: string) => requireEntitlement(productKey);
export const requireAddon = (addonSlug: string) => requireEntitlement(addonSlug);
