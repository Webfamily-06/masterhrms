import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveTenantContext } from "../middleware/tenant-context.middleware";
import { requireEntitlement } from "../middleware/entitlements";
import { SmartReportsService } from "../services/smart-reports.service";

export const smartReportsRouter = Router();

// Guard all report routes with Authentication, Tenant Context & Add-on Entitlement
smartReportsRouter.use(requireAuth, resolveTenantContext, requireEntitlement("smart-reports"));

/**
 * Role-Based Access Control configuration for Smart Reports
 * Implements least privilege per report domain:
 * - Payroll: HR/Payroll Administrators only
 * - Finance (Sales & Purchases): Finance/Accounting roles only
 * - HR & Operations (Attendance & Leave): HR, Management, Operations
 * - Commercial & Logistics (Deals, Stock, Projects): Domain-appropriate roles
 */
export const REPORT_ROLES: Record<string, string[]> = {
  "attendance-summary": ["super_admin", "admin", "tenant_admin", "hr_admin", "hr_manager", "manager", "operations_manager"],
  "payroll-sheet": ["super_admin", "admin", "tenant_admin", "hr_admin", "payroll_admin", "hr_manager"],
  "leave-report": ["super_admin", "admin", "tenant_admin", "hr_admin", "hr_manager", "manager", "operations_manager"],
  "sales-invoice": ["super_admin", "admin", "tenant_admin", "accountant", "finance_manager", "finance_admin"],
  "purchase-invoice": ["super_admin", "admin", "tenant_admin", "accountant", "finance_manager", "finance_admin"],
  "deal-pipeline": ["super_admin", "admin", "tenant_admin", "sales_admin", "sales_manager", "crm_manager", "sales_rep", "manager"],
  "product-stock": ["super_admin", "admin", "tenant_admin", "inventory_manager", "warehouse_manager", "operations_manager", "manager"],
  "project-progress": ["super_admin", "admin", "tenant_admin", "project_manager", "operations_manager", "manager", "team_lead"],
};

export function getUserRoles(req: AuthRequest): string[] {
  if (req.user?.roles && Array.isArray(req.user.roles) && req.user.roles.length > 0) {
    return req.user.roles;
  }
  if ((req.user as any)?.role) {
    return [(req.user as any).role];
  }
  return ["employee"];
}

export function checkReportAuthorization(reportId: string, userRoles: string[]): boolean {
  if (reportId === "catalogue") return true;
  const allowed = REPORT_ROLES[reportId];
  if (!allowed) return false;
  return userRoles.some((r) => allowed.includes(r));
}

function requireReportRole(reportId: string) {
  return (req: AuthRequest, res: Response, next: () => void) => {
    const roles = getUserRoles(req);
    if (!checkReportAuthorization(reportId, roles)) {
      return res.status(403).json({
        error: `Forbidden: Insufficient permissions for '${reportId}'. Required roles: ${REPORT_ROLES[reportId]?.join(", ")}`,
      });
    }
    next();
  };
}

async function fetchReportData(reportId: string, tenantId: string, query: any) {
  switch (reportId) {
    case "attendance-summary":
      return SmartReportsService.getAttendanceSummary(tenantId, query);
    case "payroll-sheet":
      return SmartReportsService.getPayrollSheet(tenantId, query);
    case "leave-report":
      return SmartReportsService.getLeaveReport(tenantId, query);
    case "sales-invoice":
      return SmartReportsService.getSalesInvoiceReport(tenantId, query);
    case "purchase-invoice":
      return SmartReportsService.getPurchaseInvoiceReport(tenantId, query);
    case "deal-pipeline":
      return SmartReportsService.getDealPipelineReport(tenantId, query);
    case "product-stock":
      return SmartReportsService.getProductStockReport(tenantId, query);
    case "project-progress":
      return SmartReportsService.getProjectProgressReport(tenantId, query);
    case "catalogue":
      return SmartReportsService.getCatalogueOverview(tenantId);
    default:
      return null;
  }
}

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

// Dedicated report endpoints with granular role protection
smartReportsRouter.get("/attendance-summary", requireReportRole("attendance-summary"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const data = await SmartReportsService.getAttendanceSummary(tenantId, req.query);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch attendance summary" });
  }
});

smartReportsRouter.get("/payroll-sheet", requireReportRole("payroll-sheet"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const data = await SmartReportsService.getPayrollSheet(tenantId, req.query);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch payroll sheet" });
  }
});

smartReportsRouter.get("/leave-report", requireReportRole("leave-report"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const data = await SmartReportsService.getLeaveReport(tenantId, req.query);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch leave report" });
  }
});

smartReportsRouter.get("/sales-invoice", requireReportRole("sales-invoice"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const data = await SmartReportsService.getSalesInvoiceReport(tenantId, req.query);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch sales invoice report" });
  }
});

smartReportsRouter.get("/purchase-invoice", requireReportRole("purchase-invoice"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const data = await SmartReportsService.getPurchaseInvoiceReport(tenantId, req.query);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch purchase invoice report" });
  }
});

smartReportsRouter.get("/deal-pipeline", requireReportRole("deal-pipeline"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const data = await SmartReportsService.getDealPipelineReport(tenantId, req.query);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch deal pipeline report" });
  }
});

smartReportsRouter.get("/product-stock", requireReportRole("product-stock"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const data = await SmartReportsService.getProductStockReport(tenantId, req.query);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch product stock report" });
  }
});

smartReportsRouter.get("/project-progress", requireReportRole("project-progress"), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const data = await SmartReportsService.getProjectProgressReport(tenantId, req.query);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch project progress report" });
  }
});

// GET /api/smart-reports/export (query param: ?report=...&format=csv|json)
smartReportsRouter.get("/export", async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
    const report = (req.query.report as string) || "catalogue";
    const format = ((req.query.format as string) || "json").toLowerCase();

    // Enforce identical least-privilege authorization on exports
    const userRoles = getUserRoles(req);
    if (!checkReportAuthorization(report, userRoles)) {
      return res.status(403).json({
        error: `Forbidden: Insufficient permissions to export '${report}'. Required roles: ${REPORT_ROLES[report]?.join(", ")}`,
      });
    }

    const exportData = await fetchReportData(report, tenantId, req.query);
    if (!exportData) {
      return res.status(404).json({ error: `Report '${report}' not found.` });
    }

    if (format === "csv") {
      const csv = SmartReportsService.generateCsv(report, exportData);
      res.setHeader("Content-Disposition", `attachment; filename="${report}-${Date.now()}.csv"`);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      return res.send(csv);
    }

    res.setHeader("Content-Disposition", `attachment; filename="${report}-${Date.now()}.json"`);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
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
    if (!REPORT_ROLES[reportId] && reportId !== "catalogue") {
      return res.status(404).json({ error: `Report '${reportId}' not found.` });
    }
    const userRoles = getUserRoles(req);
    if (!checkReportAuthorization(reportId, userRoles)) {
      return res.status(403).json({
        error: `Forbidden: Insufficient permissions for '${reportId}'. Required roles: ${REPORT_ROLES[reportId]?.join(", ")}`,
      });
    }

    const data = await fetchReportData(reportId, tenantId, req.query);
    if (!data) {
      return res.status(404).json({ error: `Report '${reportId}' not found.` });
    }
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to fetch report" });
  }
});

// GET /api/smart-reports/export/:reportId (alias compatibility with ?format=csv|json)
smartReportsRouter.get("/export/:reportId", async (req: AuthRequest, res: Response) => {
  const { reportId } = req.params;
  const tenantId = req.user?.tenantId || (req as any).tenantId || "default";
  const format = ((req.query.format as string) || "json").toLowerCase();
  try {
    if (!REPORT_ROLES[reportId] && reportId !== "catalogue") {
      return res.status(404).json({ error: `Report '${reportId}' not found.` });
    }
    const userRoles = getUserRoles(req);
    if (!checkReportAuthorization(reportId, userRoles)) {
      return res.status(403).json({
        error: `Forbidden: Insufficient permissions to export '${reportId}'. Required roles: ${REPORT_ROLES[reportId]?.join(", ")}`,
      });
    }

    const exportData = await fetchReportData(reportId, tenantId, req.query);
    if (!exportData) {
      return res.status(404).json({ error: `Report '${reportId}' not found.` });
    }

    if (format === "csv") {
      const csv = SmartReportsService.generateCsv(reportId, exportData);
      res.setHeader("Content-Disposition", `attachment; filename="${reportId}-${Date.now()}.csv"`);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      return res.send(csv);
    }

    res.setHeader("Content-Disposition", `attachment; filename="${reportId}-${Date.now()}.json"`);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.send(JSON.stringify(exportData, null, 2));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to export report" });
  }
});

