"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAddon = exports.requireProduct = void 0;
exports.checkTenantEntitlement = checkTenantEntitlement;
exports.requireEntitlement = requireEntitlement;
const prisma_1 = require("../prisma");
const PRODUCT_KEYS = new Set([
    "product_crm", "crm",
    "product_pos", "pos",
    "product_inventory", "inventory",
    "product_finance", "finance", "product_accounting", "accounting",
    "product_hrms", "hrms",
    "product_projects", "projects", "project",
    "product_purchases", "purchases",
    "product_sales", "sales", "invoicing",
]);
function normalizeKey(key) {
    const lower = (key || "").trim().toLowerCase();
    const isProduct = lower.startsWith("product_") || PRODUCT_KEYS.has(lower);
    const normalized = lower.replace(/^product_/, "");
    return { normalized, isProduct };
}
function getCandidateModuleKeys(normalized, key) {
    const keys = new Set([normalized, key, `product_${normalized}`]);
    if (normalized === "finance" || normalized === "accounting") {
        keys.add("finance");
        keys.add("accounting");
        keys.add("product_finance");
        keys.add("product_accounting");
    }
    if (normalized === "pos") {
        keys.add("pos");
        keys.add("product_pos");
    }
    if (normalized === "inventory") {
        keys.add("inventory");
        keys.add("product_inventory");
    }
    if (normalized === "crm") {
        keys.add("crm");
        keys.add("product_crm");
    }
    if (normalized === "projects" || normalized === "project") {
        keys.add("projects");
        keys.add("project");
        keys.add("product_projects");
        keys.add("project-management");
    }
    if (normalized === "purchases" || normalized === "procurement" || normalized === "purchase") {
        keys.add("purchases");
        keys.add("procurement");
        keys.add("purchase");
        keys.add("purchase-orders");
        keys.add("product_purchases");
    }
    if (normalized === "sales" || normalized === "invoicing") {
        keys.add("sales");
        keys.add("invoicing");
        keys.add("product_sales");
    }
    return Array.from(keys);
}
/**
 * Checks whether a tenant workspace possesses active entitlement
 * to a specific product (CRM, POS, Finance, HRMS) or add-on (Biometrics, Assets, Google Workspace, etc.)
 */
async function checkTenantEntitlement(tenantId, key, isSuperAdmin = false) {
    const { normalized, isProduct } = normalizeKey(key);
    const type = isProduct ? "product" : "addon";
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
    const db = prisma_1.rawPrisma || prisma_1.prisma;
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
            }
            else {
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
    }
    catch (err) {
        // Non-fatal, continue to next checks
    }
    // 3. Check TenantAddon (active, trial, or expired)
    const candidateAddonSlugs = new Set([normalized, key]);
    if (normalized.includes("google-workspace")) {
        candidateAddonSlugs.add("google-workspace");
        candidateAddonSlugs.add("google-workspace-integration");
    }
    if (normalized.includes("woocommerce")) {
        candidateAddonSlugs.add("woocommerce");
        candidateAddonSlugs.add("woocommerce-sync");
        candidateAddonSlugs.add("woocommerce-hub");
    }
    if (normalized.includes("shopify")) {
        candidateAddonSlugs.add("shopify");
        candidateAddonSlugs.add("shopify-sync");
    }
    if (normalized.includes("razorpay")) {
        candidateAddonSlugs.add("razorpay");
        candidateAddonSlugs.add("razorpay-gateway");
    }
    if (normalized.includes("whatsapp")) {
        candidateAddonSlugs.add("whatsapp");
        candidateAddonSlugs.add("whatsapp-alerts");
    }
    if (normalized.includes("tally")) {
        candidateAddonSlugs.add("tally");
        candidateAddonSlugs.add("tally-importer");
    }
    if (normalized.includes("biometric")) {
        candidateAddonSlugs.add("biometric");
        candidateAddonSlugs.add("biometric-sync");
    }
    if (normalized.includes("okr")) {
        candidateAddonSlugs.add("okr");
        candidateAddonSlugs.add("okr-performance");
    }
    if (normalized.includes("asset")) {
        candidateAddonSlugs.add("assets");
        candidateAddonSlugs.add("asset-management");
    }
    if (normalized.includes("smart-dashboard") || normalized.includes("smart_dashboard")) {
        candidateAddonSlugs.add("smart-dashboard");
        candidateAddonSlugs.add("smart-dashboard-analytics");
        candidateAddonSlugs.add("addon_smart_dashboard");
        candidateAddonSlugs.add("module-smart-dashboard");
    }
    if (normalized.includes("smart-reports") || normalized.includes("smart_reports")) {
        candidateAddonSlugs.add("smart-reports");
        candidateAddonSlugs.add("smart-reports-addon");
        candidateAddonSlugs.add("addon_smart_reports");
        candidateAddonSlugs.add("module-smart-reports");
    }
    if (normalized.includes("ai-business-advisor") || normalized.includes("business-advisor") || normalized.includes("ai_business_advisor")) {
        candidateAddonSlugs.add("ai-business-advisor");
        candidateAddonSlugs.add("business-advisor");
        candidateAddonSlugs.add("addon_ai_business_advisor");
        candidateAddonSlugs.add("module-ai-business-advisor");
    }
    if (normalized.includes("webhook") || normalized.includes("outbound")) {
        candidateAddonSlugs.add("webhook");
        candidateAddonSlugs.add("outbound-webhooks");
        candidateAddonSlugs.add("outbound_webhooks");
        candidateAddonSlugs.add("addon_outbound_webhooks");
    }
    if (normalized.includes("ai-assistant") || normalized.includes("ai_assistant")) {
        candidateAddonSlugs.add("ai-assistant");
        candidateAddonSlugs.add("ai_assistant");
        candidateAddonSlugs.add("universal-ai-assistant");
        candidateAddonSlugs.add("addon_ai_assistant");
    }
    if (normalized.includes("ai-document") || normalized.includes("ai_document")) {
        candidateAddonSlugs.add("ai-document");
        candidateAddonSlugs.add("ai_document");
        candidateAddonSlugs.add("ai-document-templates");
        candidateAddonSlugs.add("addon_ai_document");
    }
    if (normalized.includes("planning") || normalized.includes("strategic")) {
        candidateAddonSlugs.add("planning");
        candidateAddonSlugs.add("planning-strategy");
        candidateAddonSlugs.add("strategic-planning");
        candidateAddonSlugs.add("addon_planning");
    }
    try {
        const addonRecord = await db.tenantAddon.findFirst({
            where: {
                tenantId,
                addonSlug: { in: Array.from(candidateAddonSlugs) },
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
            if (["suspended", "cancelled", "expired", "disabled"].includes(addonRecord.status)) {
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
    }
    catch (err) {
        // Non-fatal
    }
    // If this is an optional add-on and no active TenantAddon row exists, it is not installed
    if (type === "addon") {
        return {
            entitled: false,
            type: "addon",
            key,
            status: "not_installed",
            reason: `Add-on '${key}' is not installed for this workspace`,
        };
    }
    // 4. For standalone products (POS, CRM, Finance, Projects, Procurement): Check TenantSubscription and SubscriptionPlan
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
            // Top-tier enterprise / sovereign / growth plans include standalone ERP suites
            if (planId === "sovereign" ||
                planId === "growth" ||
                planName.includes("sovereign") ||
                planName.includes("growth enterprise")) {
                return {
                    entitled: true,
                    type: "product",
                    key,
                    source: "plan",
                    status: "active",
                };
            }
            // Feature array verification for standalone products
            const rawFeatures = Array.isArray(sub.plan.features) ? sub.plan.features : [];
            const features = rawFeatures.map((f) => String(f));
            const featureMatches = features.some((f) => {
                const lf = f.toLowerCase();
                if (normalized === "crm")
                    return lf.includes("crm");
                if (normalized === "pos")
                    return lf.includes("pos") || lf.includes("point of sale");
                if (normalized === "inventory")
                    return lf.includes("inventory") || lf.includes("stock") || lf.includes("warehouse");
                if (normalized === "finance" || normalized === "accounting")
                    return lf.includes("financial") || lf.includes("ledger") || lf.includes("accounting") || lf.includes("finance");
                if (normalized === "hrms" || normalized === "hrm")
                    return lf.includes("hrm") || lf.includes("payroll") || lf.includes("attendance");
                if (normalized === "projects" || normalized === "project")
                    return lf.includes("project");
                if (normalized === "purchases" || normalized === "procurement" || normalized === "purchase")
                    return lf.includes("purchase") || lf.includes("procurement") || lf.includes("vendor");
                if (normalized === "sales" || normalized === "invoicing")
                    return lf.includes("sale") || lf.includes("invoice");
                return false;
            });
            if (featureMatches) {
                return {
                    entitled: true,
                    type: "product",
                    key,
                    source: "plan",
                    status: "active",
                };
            }
        }
    }
    catch (err) {
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
function requireEntitlement(entitlementKey) {
    return async (req, res, next) => {
        try {
            const isSuper = req.user?.roles?.includes("super_admin") || false;
            if (isSuper) {
                const { isProduct } = normalizeKey(entitlementKey);
                req.entitlement = {
                    entitled: true,
                    type: isProduct ? "product" : "addon",
                    key: entitlementKey,
                    source: "super_admin_bypass",
                    status: "active",
                };
                req.addonEntitlement = req.entitlement;
                return next();
            }
            const tenantId = req.user?.tenantId || req.tenantId;
            if (!tenantId) {
                return res.status(400).json({
                    error: "Tenant context required for entitlement verification.",
                    code: "TENANT_REQUIRED",
                });
            }
            const result = await checkTenantEntitlement(tenantId, entitlementKey, isSuper);
            if (result.entitled) {
                req.entitlement = result;
                req.addonEntitlement = result; // backward compatibility
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
                success: false,
                error: isProduct
                    ? `Product '${entitlementKey}' is not included in this workspace's subscription.`
                    : `Add-on '${entitlementKey}' is not active on this workspace.`,
                code: isProduct ? "PRODUCT_NOT_SUBSCRIBED" : "ADDON_REQUIRED",
                key: entitlementKey,
                addonSlug: entitlementKey,
                requiresSubscription: true,
                status: result.status || "inactive",
            });
        }
        catch (err) {
            console.error(`[requireEntitlement:${entitlementKey}] error:`, err);
            return res.status(500).json({ error: "Failed to verify workspace entitlement." });
        }
    };
}
const requireProduct = (productKey) => requireEntitlement(productKey);
exports.requireProduct = requireProduct;
const requireAddon = (addonSlug) => requireEntitlement(addonSlug);
exports.requireAddon = requireAddon;
