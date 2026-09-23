import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { prisma } from "../prisma";
import {
  getShopifyStores,
  saveShopifyStore,
  deleteShopifyStore,
  testShopifyConnection,
  syncShopifyProducts,
  syncShopifyStock,
  syncShopifyOrders,
  syncShopifyCustomers,
  getShopifyLocations,
  getShopifyDashboardData,
  getShopifyLogs,
  clearShopifyLogs,
} from "../services/shopify-sync.service";

export const shopifyRouter = Router();

function getTenantId(req: AuthRequest, res: Response): string | null {
  const tenantId = req.user?.tenantId;
  if (!tenantId || tenantId === "default") {
    res.status(403).json({ ok: false, error: "Forbidden: Valid workspace context is required." });
    return null;
  }
  return tenantId;
}

// GET /api/shopify/dashboard
shopifyRouter.get("/dashboard", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;
    const data = await getShopifyDashboardData(tenantId);
    res.json({ ok: true, ...data });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message || "Failed to load dashboard data" });
  }
});

// GET /api/shopify/stores
shopifyRouter.get("/stores", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;
    const stores = await getShopifyStores(tenantId);
    const warehouses = await prisma.warehouse.findMany({ where: { tenantId } });
    res.json({ ok: true, stores, warehouses });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message || "Failed to load stores" });
  }
});

// POST /api/shopify/stores
shopifyRouter.post("/stores", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;
    const store = await saveShopifyStore(tenantId, req.body);
    res.json({ ok: true, store, message: "Shopify store saved successfully" });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message || "Failed to save store" });
  }
});

// DELETE /api/shopify/stores/:id
shopifyRouter.delete("/stores/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;
    await deleteShopifyStore(tenantId, req.params.id);
    res.json({ ok: true, message: "Store disconnected successfully" });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message || "Failed to delete store" });
  }
});

// POST /api/shopify/test-connection
shopifyRouter.post("/test-connection", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;
    const result = await testShopifyConnection(tenantId, req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message || "Connection test failed" });
  }
});

// POST /api/shopify/sync/products
shopifyRouter.post("/sync/products", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;
    const storeId = req.body?.store_id;
    const mode = req.body?.mode || "pull";
    const result = await syncShopifyProducts(tenantId, storeId, mode);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message || "Product sync failed" });
  }
});

// POST /api/shopify/sync/stock
shopifyRouter.post("/sync/stock", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;
    const storeId = req.body?.store_id;
    const result = await syncShopifyStock(tenantId, storeId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message || "Stock sync failed" });
  }
});

// POST /api/shopify/sync/orders
shopifyRouter.post("/sync/orders", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;
    const storeId = req.body?.store_id;
    const result = await syncShopifyOrders(tenantId, storeId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message || "Order sync failed" });
  }
});

// POST /api/shopify/sync/customers
shopifyRouter.post("/sync/customers", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;
    const storeId = req.body?.store_id;
    const result = await syncShopifyCustomers(tenantId, storeId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message || "Customer sync failed" });
  }
});

// GET /api/shopify/locations
shopifyRouter.get("/locations", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;
    const storeId = req.query.store_id as string;
    const result = await getShopifyLocations(tenantId, storeId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message || "Failed to load locations" });
  }
});

// GET /api/shopify/logs
shopifyRouter.get("/logs", requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const logs = getShopifyLogs();
    res.json({ ok: true, logs });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message || "Failed to load logs" });
  }
});

// POST /api/shopify/logs/clear
shopifyRouter.post("/logs/clear", requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    clearShopifyLogs();
    res.json({ ok: true, message: "Logs cleared" });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message || "Failed to clear logs" });
  }
});
