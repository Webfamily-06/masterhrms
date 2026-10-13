import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { requireEntitlement } from "../middleware/entitlements";
import { SmartDashboardService } from "../services/smart-dashboard.service";

export const smartDashboardRouter = Router();

// Guard with Authentication, Tenant Context & Add-on Entitlement
smartDashboardRouter.use(requireAuth, resolveTenantContext, requireEntitlement("smart-dashboard"));

// GET /api/smart-dashboard/capabilities
smartDashboardRouter.get("/capabilities", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const capabilities = await SmartDashboardService.resolveWorkspaceCapabilities(tenantId, req.user);
    return res.json({ success: true, capabilities });
  } catch (error: any) {
    console.error("SmartDashboard Capabilities Error:", error);
    return res.status(500).json({ error: error.message || "Failed to resolve workspace capabilities" });
  }
});

// GET /api/smart-dashboard/overview
smartDashboardRouter.get("/overview", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const capabilities = await SmartDashboardService.resolveWorkspaceCapabilities(tenantId, req.user);
    const data = await SmartDashboardService.getExecutiveOverview(tenantId, capabilities);
    return res.json({ success: true, capabilities, data });
  } catch (error: any) {
    console.error("SmartDashboard Overview Error:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch executive overview" });
  }
});

// GET /api/smart-dashboard/financial
smartDashboardRouter.get("/financial", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const capabilities = await SmartDashboardService.resolveWorkspaceCapabilities(tenantId, req.user);

    // Enforce capability authorization on backend
    if (!capabilities.financial && !capabilities.sales) {
      return res.status(403).json({
        error: "Product 'finance' is not included in this workspace's subscription.",
        code: "PRODUCT_NOT_SUBSCRIBED",
        key: "finance",
        requiresSubscription: true,
        status: "inactive",
      });
    }

    const data = await SmartDashboardService.getFinancialAnalytics(tenantId, capabilities);
    return res.json({ success: true, capabilities, data });
  } catch (error: any) {
    console.error("SmartDashboard Financial Error:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch financial analytics" });
  }
});

// GET /api/smart-dashboard/sales
smartDashboardRouter.get("/sales", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const capabilities = await SmartDashboardService.resolveWorkspaceCapabilities(tenantId, req.user);

    // Enforce capability authorization on backend
    if (!capabilities.sales && !capabilities.crm) {
      return res.status(403).json({
        error: "Product 'crm' is not included in this workspace's subscription.",
        code: "PRODUCT_NOT_SUBSCRIBED",
        key: "crm",
        requiresSubscription: true,
        status: "inactive",
      });
    }

    const data = await SmartDashboardService.getSalesCustomerAnalytics(tenantId, capabilities);
    return res.json({ success: true, capabilities, data });
  } catch (error: any) {
    console.error("SmartDashboard Sales Error:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch sales analytics" });
  }
});

// GET /api/smart-dashboard/operational
smartDashboardRouter.get("/operational", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const capabilities = await SmartDashboardService.resolveWorkspaceCapabilities(tenantId, req.user);

    // Enforce capability authorization on backend: must have at least one operational module
    if (!capabilities.inventory && !capabilities.pos && !capabilities.projects && !capabilities.purchases) {
      return res.status(403).json({
        error: "Operational modules (Inventory, POS, Projects, Procurement) are not included in this workspace's subscription.",
        code: "PRODUCT_NOT_SUBSCRIBED",
        key: "operational",
        requiresSubscription: true,
        status: "inactive",
      });
    }

    const data = await SmartDashboardService.getOperationalAnalytics(tenantId, capabilities);
    return res.json({ success: true, capabilities, data });
  } catch (error: any) {
    console.error("SmartDashboard Operational Error:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch operational analytics" });
  }
});

// GET /api/smart-dashboard/export
smartDashboardRouter.get("/export", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const capabilities = await SmartDashboardService.resolveWorkspaceCapabilities(tenantId, req.user);
    const section = (req.query.section as string) || "overview";

    if (section === "financial" && !capabilities.financial && !capabilities.sales) {
      return res.status(403).json({
        error: "Forbidden: Not authorized to export financial data.",
        code: "PRODUCT_NOT_SUBSCRIBED",
      });
    }

    if (section === "sales" && !capabilities.sales && !capabilities.crm) {
      return res.status(403).json({
        error: "Forbidden: Not authorized to export sales data.",
        code: "PRODUCT_NOT_SUBSCRIBED",
      });
    }

    if (
      section === "operational" &&
      !capabilities.inventory &&
      !capabilities.pos &&
      !capabilities.projects &&
      !capabilities.purchases
    ) {
      return res.status(403).json({
        error: "Forbidden: Not authorized to export operational data.",
        code: "PRODUCT_NOT_SUBSCRIBED",
      });
    }

    let exportData: any = {};
    if (section === "financial") {
      exportData = await SmartDashboardService.getFinancialAnalytics(tenantId, capabilities);
    } else if (section === "sales") {
      exportData = await SmartDashboardService.getSalesCustomerAnalytics(tenantId, capabilities);
    } else if (section === "operational") {
      exportData = await SmartDashboardService.getOperationalAnalytics(tenantId, capabilities);
    } else {
      exportData = await SmartDashboardService.getExecutiveOverview(tenantId, capabilities);
    }

    res.setHeader("Content-Disposition", `attachment; filename="smart-dashboard-${section}-${Date.now()}.json"`);
    res.setHeader("Content-Type", "application/json");
    return res.send(JSON.stringify(exportData, null, 2));
  } catch (error: any) {
    console.error("SmartDashboard Export Error:", error);
    return res.status(500).json({ error: error.message || "Failed to export data" });
  }
});
