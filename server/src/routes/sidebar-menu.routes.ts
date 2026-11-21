import { Router, Response } from "express";
import { SidebarMenuService } from "../services/sidebar-menu.service";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";

export const sidebarMenuRouter = Router();

sidebarMenuRouter.use(requireAuth, resolveTenantContext as any);

/**
 * GET /api/sidebar-menu
 * Get customized navigation menu tree
 */
sidebarMenuRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const userRole = (req.query.role as string) || req.user?.workspaceRole || "admin";

    const navigation = await SidebarMenuService.getNavigation(tenantId, userRole);
    return res.json({ navigation });
  } catch (err: any) {
    console.error("[sidebar-menu:get] error:", err);
    return res.status(500).json({ error: err.message || "Failed to load sidebar navigation." });
  }
});

/**
 * POST /api/sidebar-menu/items
 * Add custom sidebar navigation item
 */
sidebarMenuRouter.post("/items", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { title, path, icon, roles, sortOrder } = req.body;

    if (!title || !path) {
      return res.status(400).json({ error: "Title and path are required." });
    }

    const item = await SidebarMenuService.addCustomMenuItem(tenantId, {
      title,
      path,
      icon,
      roles,
      sortOrder: sortOrder ? Number(sortOrder) : undefined,
    });

    return res.status(201).json({ item });
  } catch (err: any) {
    console.error("[sidebar-menu:item:create] error:", err);
    return res.status(500).json({ error: err.message || "Failed to create menu item." });
  }
});

/**
 * PUT /api/sidebar-menu/items/:itemId/toggle
 * Toggle menu item visibility
 */
sidebarMenuRouter.put("/items/:itemId/toggle", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { isEnabled } = req.body;

    const item = await SidebarMenuService.toggleMenuItem(tenantId, req.params.itemId, Boolean(isEnabled));
    return res.json({ item });
  } catch (err: any) {
    console.error("[sidebar-menu:item:toggle] error:", err);
    return res.status(500).json({ error: err.message || "Failed to toggle menu item." });
  }
});

/**
 * PUT /api/sidebar-menu/reorder
 * Reorder menu items
 */
sidebarMenuRouter.put("/reorder", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: "orderedIds array is required." });
    }

    const items = await SidebarMenuService.reorderMenuItems(tenantId, orderedIds);
    return res.json({ items });
  } catch (err: any) {
    console.error("[sidebar-menu:reorder] error:", err);
    return res.status(500).json({ error: err.message || "Failed to reorder menu items." });
  }
});
