import { Router, Response } from "express";
import { RestaurantMenuService } from "../services/restaurant-menu.service";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";

export const restaurantMenuRouter = Router();

// Public QR menu endpoint (no auth required for customer digital dining)
restaurantMenuRouter.get("/public/:tenantId", async (req, res) => {
  try {
    const { tenantId } = req.params;
    const menu = await RestaurantMenuService.getMenu(tenantId);
    return res.json({ menu });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to load public menu." });
  }
});

restaurantMenuRouter.use(requireAuth, resolveTenantContext as any);

/**
 * GET /api/restaurant-menu
 * Get menu catalog
 */
restaurantMenuRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const menu = await RestaurantMenuService.getMenu(tenantId);
    return res.json({ menu });
  } catch (err: any) {
    console.error("[restaurant-menu:get] error:", err);
    return res.status(500).json({ error: err.message || "Failed to load restaurant menu." });
  }
});

/**
 * POST /api/restaurant-menu/categories
 * Add category
 */
restaurantMenuRouter.post("/categories", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const category = await RestaurantMenuService.addCategory(tenantId, req.body);
    return res.status(201).json({ category });
  } catch (err: any) {
    console.error("[restaurant-menu:category:create] error:", err);
    return res.status(500).json({ error: err.message || "Failed to create category." });
  }
});

/**
 * POST /api/restaurant-menu/categories/:categoryId/items
 * Add item to category
 */
restaurantMenuRouter.post("/categories/:categoryId/items", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const item = await RestaurantMenuService.addItem(tenantId, req.params.categoryId, req.body);
    return res.status(201).json({ item });
  } catch (err: any) {
    console.error("[restaurant-menu:item:create] error:", err);
    return res.status(500).json({ error: err.message || "Failed to create menu item." });
  }
});

/**
 * POST /api/restaurant-menu/items/:itemId/availability
 * Toggle item availability
 */
restaurantMenuRouter.post("/items/:itemId/availability", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const item = await RestaurantMenuService.toggleAvailability(tenantId, req.params.itemId, Boolean(req.body.isAvailable));
    return res.json({ item });
  } catch (err: any) {
    console.error("[restaurant-menu:item:availability] error:", err);
    return res.status(500).json({ error: err.message || "Failed to toggle availability." });
  }
});

/**
 * POST /api/restaurant-menu/qr
 * Generate QR code digital payload
 */
restaurantMenuRouter.post("/qr", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const result = await RestaurantMenuService.generateQrPayload(tenantId, req.body.domain);
    return res.json(result);
  } catch (err: any) {
    console.error("[restaurant-menu:qr] error:", err);
    return res.status(500).json({ error: err.message || "Failed to generate QR payload." });
  }
});
