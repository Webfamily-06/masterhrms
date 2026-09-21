import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import {
  getWooCommerceSettings,
  saveWooCommerceSettings,
  testWooCommerceConnection,
  syncWooCommerceProducts,
  autoLinkProductsBySku,
  syncWooCommerceStock,
  syncWooCommerceOrders,
  getWooLogs,
  clearWooLogs,
  SYNC_OPTIONS_META,
} from "../services/woocommerce-sync.service";
import { prisma } from "../prisma";

export const woocommerceRouter = Router();

// Helper to get active tenantId
async function getTenantId(req: AuthRequest): Promise<string> {
  let tenantId = req.user?.tenantId;
  if (!tenantId || tenantId === "default") {
    const t = await prisma.tenant.findFirst();
    tenantId = t?.id || "tenant-default-001";
  }
  return tenantId;
}

// GET /api/woocommerce/settings
woocommerceRouter.get("/settings", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const settings = await getWooCommerceSettings(tenantId);
    res.json({
      settings,
      sync_options: settings.sync_options || {},
      sync_options_meta: SYNC_OPTIONS_META,
      ok: true,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/woocommerce/settings
woocommerceRouter.post("/settings", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const updated = await saveWooCommerceSettings(tenantId, req.body);
    res.json({
      ok: true,
      message: "WooCommerce settings successfully updated",
      settings: updated,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/woocommerce/test-connection
woocommerceRouter.post("/test-connection", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const result = await testWooCommerceConnection(tenantId, req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/woocommerce/status
woocommerceRouter.get("/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const settings = await getWooCommerceSettings(tenantId);

    const [totalProducts, wooProducts, totalOrders] = await Promise.all([
      prisma.product.count({ where: { tenantId } }),
      prisma.product.count({
        where: { tenantId, sku: { startsWith: "WC-" } },
      }),
      prisma.sale.count({
        where: { tenantId, invoiceNo: { startsWith: "SO_WOO_" } },
      }),
    ]);

    const unsyncedCount = Math.max(0, totalProducts - wooProducts);

    res.json({
      ok: true,
      connectionOk: settings.last_connection_status === "connected",
      status: settings.last_connection_status,
      totalProducts,
      syncedProducts: wooProducts,
      unsyncedCount,
      totalOrders,
      lastSyncAt: settings.last_sync_at,
      settings: {
        store_url: settings.store_url,
        consumer_key: settings.consumer_key,
        wp_username: settings.wp_username,
      },
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/woocommerce/unsynced-count
woocommerceRouter.get("/unsynced-count", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const total = await prisma.product.count({ where: { tenantId } });
    const synced = await prisma.product.count({
      where: { tenantId, sku: { startsWith: "WC-" } },
    });
    res.json({ total, unsynced: Math.max(0, total - synced) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/woocommerce/sync/products
woocommerceRouter.post("/sync/products", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const mode = req.body?.mode || "pull";
    const result = await syncWooCommerceProducts(tenantId, mode);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/woocommerce/products/auto-link
woocommerceRouter.post("/products/auto-link", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const result = await autoLinkProductsBySku(tenantId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/woocommerce/sync/stock
woocommerceRouter.post("/sync/stock", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const result = await syncWooCommerceStock(tenantId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/woocommerce/stock-metrics
woocommerceRouter.get("/stock-metrics", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const settings = await getWooCommerceSettings(tenantId);

    const inStock = await prisma.productWarehouse.count({
      where: { product: { tenantId }, quantity: { gt: 0 } },
    });
    const outStock = await prisma.productWarehouse.count({
      where: { product: { tenantId }, quantity: { lte: 0 } },
    });

    res.json({
      in_stock: inStock,
      out_stock: outStock,
      last_sync: settings.last_sync_at,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/woocommerce/sync/orders
woocommerceRouter.post("/sync/orders", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const result = await syncWooCommerceOrders(tenantId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/woocommerce/orders
woocommerceRouter.get("/orders", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    const sales = await prisma.sale.findMany({
      where: { tenantId, invoiceNo: { startsWith: "SO_WOO_" } },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({
      ok: true,
      orders: sales.map((s) => ({
        id: s.id,
        number: s.invoiceNo.replace("SO_WOO_", ""),
        reference: s.invoiceNo,
        customer_name: s.customerName || s.customer?.name || "WooCommerce Client",
        total: s.total,
        status: s.paymentStatus || "PAID",
        date: s.createdAt,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/woocommerce/logs
woocommerceRouter.get("/logs", requireAuth, async (_req: AuthRequest, res: Response) => {
  res.json({ ok: true, logs: getWooLogs() });
});

// DELETE /api/woocommerce/logs
woocommerceRouter.delete("/logs", requireAuth, async (_req: AuthRequest, res: Response) => {
  clearWooLogs();
  res.json({ ok: true, message: "WooCommerce logs cleared" });
});

// POST /api/woocommerce/reset-sync
woocommerceRouter.post("/reset-sync", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = await getTenantId(req);
    await saveWooCommerceSettings(tenantId, {
      last_sync_at: null,
      last_connection_status: "unknown",
      last_connection_message: null,
    });
    res.json({ ok: true, message: "WooCommerce sync cache and status reset" });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});
