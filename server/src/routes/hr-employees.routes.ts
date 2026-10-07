import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { getTenantDb } from "../context/tenant-context";
import { EmployeeService } from "../services/employee.service";
import { resolveUserSecurityContext } from "../lib/data-scope";

export const hrEmployeesRouter = Router();

// =========================================================================
// 1. LIST EMPLOYEES (GET /api/v1/hr/employees)
// Enforces Data Scope (SELF, TEAM, DEPT, BRANCH, ALL) & Field-Level Security
// =========================================================================
hrEmployeesRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const db = getTenantDb();
    const userContext = await resolveUserSecurityContext(
      req.user?.userId!,
      tenantId,
      req.user?.roles || [],
      db
    );

    const result = await EmployeeService.listEmployees(
      tenantId,
      userContext,
      req.user?.permissions || [],
      req.query as any
    );

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 2. ATOMIC EMPLOYEE CREATION (POST /api/v1/hr/employees)
// 8-Step Wizard Target: Atomic Employee + User + Outbox + Audit
// =========================================================================
hrEmployeesRouter.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const actorId = req.user?.userId;
    if (!tenantId || !actorId) {
      return res.status(403).json({ error: "Authenticated tenant and actor required" });
    }

    const employee = await EmployeeService.createEmployeeAtomic(
      tenantId,
      actorId,
      req.body
    );

    return res.status(201).json({
      success: true,
      message: "Employee created and access provisioned successfully.",
      data: employee,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// =========================================================================
// 3. EMPLOYEE IMPORT: DRY RUN (POST /api/v1/hr/employees/import/dry-run)
// =========================================================================
hrEmployeesRouter.post("/import/dry-run", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const records = req.body?.records;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: "Array of records required for import dry run" });
    }

    const report = await EmployeeService.validateImportDryRun(tenantId, records);
    return res.json(report);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 4. EMPLOYEE IMPORT: COMMIT (POST /api/v1/hr/employees/import/commit)
// =========================================================================
hrEmployeesRouter.post("/import/commit", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const actorId = req.user?.userId;
    if (!tenantId || !actorId) return res.status(403).json({ error: "Tenant context required" });

    const validatedRows = req.body?.validatedRows;
    if (!Array.isArray(validatedRows) || validatedRows.length === 0) {
      return res.status(400).json({ error: "No validated rows provided for commit" });
    }

    const result = await EmployeeService.commitImport(tenantId, actorId, validatedRows);
    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// =========================================================================
// 5. EMPLOYEE 360 (GET /api/v1/hr/employees/:id)
// Consolidated authorized 360 profile with FLS & allowedActions
// =========================================================================
hrEmployeesRouter.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const db = getTenantDb();
    const userContext = await resolveUserSecurityContext(
      req.user?.userId!,
      tenantId,
      req.user?.roles || [],
      db
    );

    const employee360 = await EmployeeService.getEmployee360(
      tenantId,
      req.params.id,
      userContext,
      req.user?.permissions || []
    );

    return res.json({
      success: true,
      data: employee360,
    });
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
});
