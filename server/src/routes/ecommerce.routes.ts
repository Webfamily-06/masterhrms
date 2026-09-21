import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
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

export const ecommerceRouter = Router();

// GET /api/ecommerce/status - Fetch integration settings, status, & product counts
ecommerceRouter.get("/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    let tenantId = req.user?.tenantId;
    if (!tenantId || tenantId === "default") {
      const t = await prisma.tenant.findFirst();
      tenantId = t?.id || "tenant-default-001";
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
        wooCommerce: {
          ...config.wooCommerce,
          syncedProductsCount: wooCount,
        },
        shopify: {
          ...config.shopify,
          syncedProductsCount: shopifyCount,
        },
      },
      totalCatalogCount: totalCount,
      recentLogs: getSyncLogs().slice(0, 20),
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch eCommerce status: " + err.message });
  }
});

// POST /api/ecommerce/test/woocommerce - Test handshake against user-provided WooCommerce credentials
ecommerceRouter.post("/test/woocommerce", requireAuth, async (req: AuthRequest, res: Response) => {
  const { storeUrl, consumerKey, consumerSecret } = req.body;
  if (!storeUrl || !consumerKey || !consumerSecret) {
    return res.status(400).json({
      ok: false,
      message: "Please provide Store URL, Consumer Key, and Consumer Secret.",
    });
  }

  const result = await testWooCommerceConnection({ storeUrl, consumerKey, consumerSecret });
  return res.json(result);
});

// POST /api/ecommerce/test/shopify - Test handshake against user-provided Shopify credentials
ecommerceRouter.post("/test/shopify", requireAuth, async (req: AuthRequest, res: Response) => {
  const { storeDomain, accessToken, apiVersion } = req.body;
  if (!storeDomain || !accessToken) {
    return res.status(400).json({
      ok: false,
      message: "Please provide Shopify Store Domain and Admin API Access Token.",
    });
  }

  const result = await testShopifyConnection({ storeDomain, accessToken, apiVersion });
  return res.json(result);
});

// POST /api/ecommerce/save-config - Permanently persist credentials to DB
ecommerceRouter.post("/save-config", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    let tenantId = req.user?.tenantId;
    if (!tenantId || tenantId === "default") {
      const t = await prisma.tenant.findFirst();
      tenantId = t?.id || "tenant-default-001";
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
ecommerceRouter.post("/sync/woocommerce", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    let tenantId = req.user?.tenantId;
    if (!tenantId || tenantId === "default") {
      const t = await prisma.tenant.findFirst();
      tenantId = t?.id || "tenant-default-001";
    }

    const result = await syncWooCommerce(tenantId);
    res.json({
      success: true,
      message: `WooCommerce catalog synchronized! ${result.addedCount} added, ${result.updatedCount} updated.`,
      result,
    });
  } catch (err: any) {
    res.status(500).json({ error: "WooCommerce sync failed: " + err.message });
  }
});

// POST /api/ecommerce/sync/shopify - Trigger Shopify Catalog Sync
ecommerceRouter.post("/sync/shopify", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    let tenantId = req.user?.tenantId;
    if (!tenantId || tenantId === "default") {
      const t = await prisma.tenant.findFirst();
      tenantId = t?.id || "tenant-default-001";
    }

    const result = await syncShopify(tenantId);
    res.json({
      success: true,
      message: `Shopify catalog synchronized! ${result.addedCount} added, ${result.updatedCount} updated.`,
      result,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Shopify sync failed: " + err.message });
  }
});

// POST /api/ecommerce/sync/all - Trigger Omnichannel Sync
ecommerceRouter.post("/sync/all", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    let tenantId = req.user?.tenantId;
    if (!tenantId || tenantId === "default") {
      const t = await prisma.tenant.findFirst();
      tenantId = t?.id || "tenant-default-001";
    }

    const [woo, shop] = await Promise.all([
      syncWooCommerce(tenantId),
      syncShopify(tenantId),
    ]);

    res.json({
      success: true,
      message: "Omnichannel catalog synchronization completed for all connected stores!",
      results: { wooCommerce: woo, shopify: shop },
    });
  } catch (err: any) {
    res.status(500).json({ error: "Omnichannel sync failed: " + err.message });
  }
});
