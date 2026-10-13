import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { requireEntitlement, checkTenantEntitlement } from "../middleware/entitlements";
import {
  getTenantEcommerceConfig,
  saveTenantEcommerceConfig,
  testWooCommerceConnection,
  testShopifyConnection,
  syncWooCommerce,
  syncShopify,
  getSyncLogs,
} from "../services/ecommerce-sync.service";
import { prisma } from "../prisma";
import { resolveTenantId } from "../lib/tenant";

export const ecommerceRouter = Router();

// Enforce authentication and tenant context across all eCommerce endpoints
ecommerceRouter.use(requireAuth, resolveTenantContext);

// GET /api/ecommerce/status - Fetch integration settings, status, & product counts
ecommerceRouter.get("/status", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const isSuperAdmin = req.user?.roles?.includes("super_admin") || false;
    const [wooEnt, shopifyEnt] = await Promise.all([
      checkTenantEntitlement(tenantId, "woocommerce-sync", isSuperAdmin),
      checkTenantEntitlement(tenantId, "shopify-sync", isSuperAdmin),
    ]);

    if (!wooEnt.entitled && !shopifyEnt.entitled) {
      return res.status(403).json({
        error: "Access denied. An E-Commerce add-on (WooCommerce or Shopify Sync) must be installed and active for this workspace.",
        code: "ADDON_REQUIRED",
      });
    }

    const config = await getTenantEcommerceConfig(tenantId);

    // Query live synced products count from DB
    const [wooCount, shopifyCount, totalCount] = await Promise.all([
      prisma.product.count({
        where: {
          tenantId,
          sku: { startsWith: "WC-" },
        },
      }),
      prisma.product.count({
        where: {
          tenantId,
          sku: { startsWith: "SH-" },
        },
      }),
      prisma.product.count({
        where: { tenantId },
      }),
    ]);

    res.json({
      success: true,
      channels: {
        wooCommerce: wooEnt.entitled
          ? {
              ...config.wooCommerce,
              syncedProductsCount: wooCount,
              isEntitled: true,
            }
          : { enabled: false, isEntitled: false },
        shopify: shopifyEnt.entitled
          ? {
              ...config.shopify,
              syncedProductsCount: shopifyCount,
              isEntitled: true,
            }
          : { enabled: false, isEntitled: false },
      },
      totalCatalogCount: totalCount,
      recentLogs: getSyncLogs().slice(0, 20),
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch eCommerce status: " + err.message });
  }
});

// POST /api/ecommerce/test/woocommerce - Test handshake against user-provided WooCommerce credentials
ecommerceRouter.post(
  "/test/woocommerce",
  requireEntitlement("woocommerce-sync"),
  async (req: AuthRequest, res: Response) => {
    const { storeUrl, consumerKey, consumerSecret } = req.body;
    if (!storeUrl || !consumerKey || !consumerSecret) {
      return res.status(400).json({
        ok: false,
        message: "Please provide Store URL, Consumer Key, and Consumer Secret.",
      });
    }

    const result = await testWooCommerceConnection({ storeUrl, consumerKey, consumerSecret });
    return res.json(result);
  }
);

// POST /api/ecommerce/test/shopify - Test handshake against user-provided Shopify credentials
ecommerceRouter.post(
  "/test/shopify",
  requireEntitlement("shopify-sync"),
  async (req: AuthRequest, res: Response) => {
    const { storeDomain, accessToken, apiVersion } = req.body;
    if (!storeDomain || !accessToken) {
      return res.status(400).json({
        ok: false,
        message: "Please provide Shopify Store Domain and Admin API Access Token.",
      });
    }

    const result = await testShopifyConnection({ storeDomain, accessToken, apiVersion });
    return res.json(result);
  }
);

// POST /api/ecommerce/save-config - Permanently persist credentials to DB
ecommerceRouter.post("/save-config", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const isSuperAdmin = req.user?.roles?.includes("super_admin") || false;
    const body = req.body || {};

    // Validate entitlement per configured channel
    if (body.wooCommerce || body.storeUrl || body.consumerKey) {
      const wooEnt = await checkTenantEntitlement(tenantId, "woocommerce-sync", isSuperAdmin);
      if (!wooEnt.entitled) {
        return res.status(403).json({
          error: "Forbidden: WooCommerce Sync add-on is not installed or enabled for this workspace.",
          code: "ADDON_REQUIRED",
          requiredAddon: "woocommerce-sync",
        });
      }
    }

    if (body.shopify || body.storeDomain || body.accessToken) {
      const shopifyEnt = await checkTenantEntitlement(tenantId, "shopify-sync", isSuperAdmin);
      if (!shopifyEnt.entitled) {
        return res.status(403).json({
          error: "Forbidden: Shopify Sync add-on is not installed or enabled for this workspace.",
          code: "ADDON_REQUIRED",
          requiredAddon: "shopify-sync",
        });
      }
    }

    const updated = await saveTenantEcommerceConfig(tenantId, req.body);
    res.json({
      success: true,
      message: "eCommerce store credentials successfully saved to database.",
      config: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save configuration: " + err.message });
  }
});

// POST /api/ecommerce/sync/woocommerce - Trigger WooCommerce Catalog Sync
ecommerceRouter.post(
  "/sync/woocommerce",
  requireEntitlement("woocommerce-sync"),
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = resolveTenantId(req, res);
      if (!tenantId) return;

      const result = await syncWooCommerce(tenantId);
      res.json({
        success: true,
        message: `WooCommerce catalog synchronized! ${result.addedCount} added, ${result.updatedCount} updated.`,
        result,
      });
    } catch (err: any) {
      res.status(500).json({ error: "WooCommerce sync failed: " + err.message });
    }
  }
);

// POST /api/ecommerce/sync/shopify - Trigger Shopify Catalog Sync
ecommerceRouter.post(
  "/sync/shopify",
  requireEntitlement("shopify-sync"),
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = resolveTenantId(req, res);
      if (!tenantId) return;

      const result = await syncShopify(tenantId);
      res.json({
        success: true,
        message: `Shopify catalog synchronized! ${result.addedCount} added, ${result.updatedCount} updated.`,
        result,
      });
    } catch (err: any) {
      res.status(500).json({ error: "Shopify sync failed: " + err.message });
    }
  }
);

// POST /api/ecommerce/sync/all - Trigger Omnichannel Sync
ecommerceRouter.post("/sync/all", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) return;

    const isSuperAdmin = req.user?.roles?.includes("super_admin") || false;
    const [wooEnt, shopifyEnt] = await Promise.all([
      checkTenantEntitlement(tenantId, "woocommerce-sync", isSuperAdmin),
      checkTenantEntitlement(tenantId, "shopify-sync", isSuperAdmin),
    ]);

    if (!wooEnt.entitled && !shopifyEnt.entitled) {
      return res.status(403).json({
        error: "Access denied. An E-Commerce add-on must be installed and active.",
        code: "ADDON_REQUIRED",
      });
    }

    const tasks: Promise<any>[] = [];
    if (wooEnt.entitled) tasks.push(syncWooCommerce(tenantId));
    if (shopifyEnt.entitled) tasks.push(syncShopify(tenantId));

    const results = await Promise.all(tasks);

    res.json({
      success: true,
      message: "Omnichannel catalog synchronization completed for all active connected stores!",
      results,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Omnichannel sync failed: " + err.message });
  }
});
