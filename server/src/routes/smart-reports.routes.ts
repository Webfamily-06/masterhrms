import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { requireEntitlement } from "../middleware/entitlements";
import { SmartReportsService } from "../services/smart-reports.service";

export const smartReportsRouter = Router();

// Guard with Authentication, Tenant Context & Add-on Entitlement
smartReportsRouter.use(requireAuth, resolveTenantContext, requireEntitlement("smart-reports"));

// GET /api/smart-reports/catalogue
smartReportsRouter.get("/catalogue", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const data = await SmartReportsService.getCatalogueOverview(tenantId);
    return res.json({ success: true, data });
  } catch (error: any) {
    console.error("SmartReports Catalogue Error:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch catalogue" });
  }
});

// GET /api/smart-reports/attendance-summary
smartReportsRouter.get("/attendance-summary", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const data = await SmartReportsService.getAttendanceSummary(tenantId, req.query);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch attendance summary" });
  }
});

// GET /api/smart-reports/payroll-sheet
smartReportsRouter.get("/payroll-sheet", async (req: AuthRequest, res: Response) => {
  try {
    const userRoles = req.user?.roles || [(req.user as any)?.role || "employee"];
    const isAuthorized = userRoles.some((r: string) => ["super_admin", "hr_admin", "admin", "manager"].includes(r));
    if (!isAuthorized) {
      return res.status(403).json({ error: "Unauthorized: Payroll reports are restricted to HR and Administrators." });
    }

    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const data = await SmartReportsService.getPayrollSheet(tenantId, req.query);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch payroll sheet" });
  }
});

// GET /api/smart-reports/leave-report
smartReportsRouter.get("/leave-report", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const data = await SmartReportsService.getLeaveReport(tenantId, req.query);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch leave report" });
  }
});

// GET /api/smart-reports/sales-invoice
smartReportsRouter.get("/sales-invoice", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const data = await SmartReportsService.getSalesInvoiceReport(tenantId, req.query);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch sales invoice report" });
  }
});

// GET /api/smart-reports/purchase-invoice
smartReportsRouter.get("/purchase-invoice", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const data = await SmartReportsService.getPurchaseInvoiceReport(tenantId, req.query);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch purchase invoice report" });
  }
});

// GET /api/smart-reports/deal-pipeline
smartReportsRouter.get("/deal-pipeline", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const data = await SmartReportsService.getDealPipelineReport(tenantId, req.query);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch deal pipeline report" });
  }
});

// GET /api/smart-reports/product-stock
smartReportsRouter.get("/product-stock", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const data = await SmartReportsService.getProductStockReport(tenantId, req.query);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch product stock report" });
  }
});

// GET /api/smart-reports/project-progress
smartReportsRouter.get("/project-progress", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const data = await SmartReportsService.getProjectProgressReport(tenantId, req.query);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch project progress report" });
  }
});

// GET /api/smart-reports/export
smartReportsRouter.get("/export", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const report = (req.query.report as string) || "catalogue";
    let exportData: any = {};

    switch (report) {
      case "attendance-summary":
        exportData = await SmartReportsService.getAttendanceSummary(tenantId, req.query);
        break;
      case "payroll-sheet":
        exportData = await SmartReportsService.getPayrollSheet(tenantId, req.query);
        break;
      case "leave-report":
        exportData = await SmartReportsService.getLeaveReport(tenantId, req.query);
        break;
      case "sales-invoice":
        exportData = await SmartReportsService.getSalesInvoiceReport(tenantId, req.query);
        break;
      case "purchase-invoice":
        exportData = await SmartReportsService.getPurchaseInvoiceReport(tenantId, req.query);
        break;
      case "deal-pipeline":
        exportData = await SmartReportsService.getDealPipelineReport(tenantId, req.query);
        break;
      case "product-stock":
        exportData = await SmartReportsService.getProductStockReport(tenantId, req.query);
        break;
      case "project-progress":
        exportData = await SmartReportsService.getProjectProgressReport(tenantId, req.query);
        break;
      default:
        exportData = await SmartReportsService.getCatalogueOverview(tenantId);
    }

    res.setHeader("Content-Disposition", `attachment; filename="${report}-${Date.now()}.json"`);
    res.setHeader("Content-Type", "application/json");
    return res.send(JSON.stringify(exportData, null, 2));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to export report" });
  }
});

// GET /api/smart-reports/report/:reportId (alias compatibility)
smartReportsRouter.get("/report/:reportId", async (req: AuthRequest, res: Response) => {
  const { reportId } = req.params;
  const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
  try {
    switch (reportId) {
      case "attendance-summary":
        return res.json({ success: true, data: await SmartReportsService.getAttendanceSummary(tenantId, req.query) });
      case "payroll-sheet": {
        const userRoles = req.user?.roles || [(req.user as any)?.role || "employee"];
        const isAuthorized = userRoles.some((r: string) => ["super_admin", "hr_admin", "admin", "manager"].includes(r));
        if (!isAuthorized) {
          return res.status(403).json({ error: "Unauthorized: Payroll reports are restricted to HR and Administrators." });
        }
        return res.json({ success: true, data: await SmartReportsService.getPayrollSheet(tenantId, req.query) });
      }
      case "leave-report":
        return res.json({ success: true, data: await SmartReportsService.getLeaveReport(tenantId, req.query) });
      case "sales-invoice":
        return res.json({ success: true, data: await SmartReportsService.getSalesInvoiceReport(tenantId, req.query) });
      case "purchase-invoice":
        return res.json({ success: true, data: await SmartReportsService.getPurchaseInvoiceReport(tenantId, req.query) });
      case "deal-pipeline":
        return res.json({ success: true, data: await SmartReportsService.getDealPipelineReport(tenantId, req.query) });
      case "product-stock":
        return res.json({ success: true, data: await SmartReportsService.getProductStockReport(tenantId, req.query) });
      case "project-progress":
        return res.json({ success: true, data: await SmartReportsService.getProjectProgressReport(tenantId, req.query) });
      default:
        return res.status(404).json({ error: `Report '${reportId}' not found.` });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch report" });
  }
});

// GET /api/smart-reports/export/:reportId (alias compatibility)
smartReportsRouter.get("/export/:reportId", async (req: AuthRequest, res: Response) => {
  req.query.report = req.params.reportId;
  const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
  try {
    let exportData: any = {};
    switch (req.params.reportId) {
      case "attendance-summary":
        exportData = await SmartReportsService.getAttendanceSummary(tenantId, req.query);
        break;
      case "payroll-sheet":
        exportData = await SmartReportsService.getPayrollSheet(tenantId, req.query);
        break;
      case "leave-report":
        exportData = await SmartReportsService.getLeaveReport(tenantId, req.query);
        break;
      case "sales-invoice":
        exportData = await SmartReportsService.getSalesInvoiceReport(tenantId, req.query);
        break;
      case "purchase-invoice":
        exportData = await SmartReportsService.getPurchaseInvoiceReport(tenantId, req.query);
        break;
      case "deal-pipeline":
        exportData = await SmartReportsService.getDealPipelineReport(tenantId, req.query);
        break;
      case "product-stock":
        exportData = await SmartReportsService.getProductStockReport(tenantId, req.query);
        break;
      case "project-progress":
        exportData = await SmartReportsService.getProjectProgressReport(tenantId, req.query);
        break;
      default:
        exportData = await SmartReportsService.getCatalogueOverview(tenantId);
    }
    res.setHeader("Content-Disposition", `attachment; filename="${req.params.reportId}-${Date.now()}.json"`);
    res.setHeader("Content-Type", "application/json");
    return res.send(JSON.stringify(exportData, null, 2));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to export report" });
  }
});
