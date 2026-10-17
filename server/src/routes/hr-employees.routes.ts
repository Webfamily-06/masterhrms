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

import { EmployeeSystemIdService } from "../services/employee-system-id.service";
import { SettingsService } from "../services/settings/settings.service";

// =========================================================================
// 4b. EMPLOYEE SYSTEM ID PREVIEW & CONFIGURATION
// =========================================================================
hrEmployeesRouter.get("/system-id/preview", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const branchId = req.query.branchId ? String(req.query.branchId) : undefined;
    const preview = await EmployeeSystemIdService.previewNextId(tenantId, branchId);
    return res.json(preview);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrEmployeesRouter.get("/system-id/config", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const config = await EmployeeSystemIdService.getConfig(tenantId);
    const preview = await EmployeeSystemIdService.previewNextId(tenantId);
    return res.json({ config, preview: preview.previewId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrEmployeesRouter.put("/system-id/config", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Tenant context required" });

    const userRoles = req.user?.roles || [];
    const isAuthorized =
      userRoles.includes("super_admin") ||
      userRoles.includes("admin") ||
      userRoles.includes("hr_admin") ||
      userRoles.includes("Workspace Admin") ||
      userRoles.includes("HR Manager");

    if (!isAuthorized) {
      return res.status(403).json({ error: "Forbidden: Only HR and Tenant Administrators can update System ID settings." });
    }

    const {
      autoGenerate,
      companyPrefix,
      locationPrefix,
      sequenceStart,
      sequenceDigits,
      separator,
    } = req.body || {};

    const actorId = req.user?.userId || "system";

    if (autoGenerate !== undefined) {
      await SettingsService.set("TENANT", tenantId, "hr.employee_id.auto_generate", Boolean(autoGenerate), actorId);
    }
    if (companyPrefix !== undefined) {
      await SettingsService.set("TENANT", tenantId, "hr.employee_id.company_prefix", String(companyPrefix).trim(), actorId);
    }
    if (locationPrefix !== undefined) {
      await SettingsService.set("TENANT", tenantId, "hr.employee_id.location_prefix", String(locationPrefix).trim(), actorId);
    }
    if (sequenceStart !== undefined) {
      await SettingsService.set("TENANT", tenantId, "hr.employee_id.sequence_start", Number(sequenceStart), actorId);
    }
    if (sequenceDigits !== undefined) {
      await SettingsService.set("TENANT", tenantId, "hr.employee_id.sequence_digits", Number(sequenceDigits), actorId);
    }
    if (separator !== undefined) {
      await SettingsService.set("TENANT", tenantId, "hr.employee_id.separator", String(separator).trim(), actorId);
    }

    const updatedConfig = await EmployeeSystemIdService.getConfig(tenantId);
    const updatedPreview = await EmployeeSystemIdService.previewNextId(tenantId);

    return res.json({
      success: true,
      message: "Employee System ID settings updated successfully. Existing employee IDs remain unchanged.",
      config: updatedConfig,
      preview: updatedPreview.previewId,
    });
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

// =========================================================================
// 6. UPDATE EMPLOYEE (PUT /api/v1/hr/employees/:id)
// Comprehensive update with step-by-step persistence, role authorization,
// and financial field permission enforcement.
// =========================================================================
hrEmployeesRouter.put("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const actorId = req.user?.userId;
    if (!tenantId || !actorId) {
      return res.status(403).json({ error: "Tenant context and authenticated actor required" });
    }

    const db = getTenantDb();
    const userContext = await resolveUserSecurityContext(
      actorId,
      tenantId,
      req.user?.roles || [],
      db
    );

    const updated = await EmployeeService.updateEmployee(
      tenantId,
      actorId,
      req.params.id,
      req.body,
      userContext,
      req.user?.permissions || []
    );

    return res.json({
      success: true,
      message: "Employee details updated successfully.",
      data: updated,
    });
  } catch (err: any) {
    const status =
      err.statusCode ||
      (err.message?.includes("not found") ? 404 : err.message?.includes("Forbidden") ? 403 : 400);
    return res.status(status).json({ error: err.message });
  }
});

// =========================================================================
// 6b. UPDATE EMPLOYEE STATUS (PATCH /api/v1/hr/employees/:id/status)
// Updates employee employment status (active, inactive, on_leave, terminated)
// =========================================================================
async function handleStatusUpdate(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const actorId = req.user?.userId;
    if (!tenantId || !actorId) {
      return res.status(403).json({ error: "Tenant context and authenticated actor required" });
    }

    const { status } = req.body || {};
    if (!status) {
      return res.status(400).json({ error: "Status field is required." });
    }

    const db = getTenantDb();
    const userContext = await resolveUserSecurityContext(
      actorId,
      tenantId,
      req.user?.roles || [],
      db
    );

    const updated = await EmployeeService.updateEmployeeStatus(
      tenantId,
      actorId,
      req.params.id,
      status,
      userContext
    );

    return res.json({
      success: true,
      message: `Employee status updated to ${status} successfully.`,
      data: updated,
    });
  } catch (err: any) {
    const code = err.statusCode || (err.message?.includes("not found") ? 404 : err.message?.includes("Forbidden") ? 403 : 400);
    return res.status(code).json({ error: err.message });
  }
}

hrEmployeesRouter.patch("/:id/status", requireAuth, handleStatusUpdate);
hrEmployeesRouter.put("/:id/status", requireAuth, handleStatusUpdate);

// =========================================================================
// 7. CHANGE EMPLOYEE PASSWORD (POST /api/v1/hr/employees/:id/password)
// Secure password update with bcrypt (10 rounds), tenant isolation, and audit logging.
// =========================================================================
async function handlePasswordChange(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const actorId = req.user?.userId;
    if (!tenantId || !actorId) {
      return res.status(403).json({ error: "Tenant context and authenticated actor required" });
    }

    const { newPassword, confirmPassword } = req.body || {};
    if (!newPassword || typeof newPassword !== "string") {
      return res.status(400).json({ error: "New password is required." });
    }
    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match." });
    }

    const db = getTenantDb();
    const userContext = await resolveUserSecurityContext(
      actorId,
      tenantId,
      req.user?.roles || [],
      db
    );

    const result = await EmployeeService.changeEmployeePassword(
      tenantId,
      actorId,
      req.params.id,
      newPassword,
      userContext
    );

    return res.json(result);
  } catch (err: any) {
    const status =
      err.statusCode ||
      (err.message?.includes("not found") ? 404 : err.message?.includes("Forbidden") ? 403 : 400);
    return res.status(status).json({ error: err.message });
  }
}

hrEmployeesRouter.post("/:id/password", requireAuth, handlePasswordChange);
hrEmployeesRouter.post("/:id/set-password", requireAuth, handlePasswordChange);

// =========================================================================
// 8. TOGGLE EMPLOYEE ACCOUNT STATUS (POST /api/v1/hr/employees/:id/toggle-account-status)
// Enables or disables employee login account access while preserving employment,
// attendance, leave, and payroll records.
// =========================================================================
async function handleToggleAccountStatus(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const actorId = req.user?.userId;
    if (!tenantId || !actorId) {
      return res.status(403).json({ error: "Tenant context and authenticated actor required" });
    }

    const db = getTenantDb();
    const userContext = await resolveUserSecurityContext(
      actorId,
      tenantId,
      req.user?.roles || [],
      db
    );

    const result = await EmployeeService.toggleEmployeeAccountStatus(
      tenantId,
      actorId,
      req.params.id,
      userContext
    );

    return res.json(result);
  } catch (err: any) {
    const status =
      err.statusCode ||
      (err.message?.includes("not found") ? 404 : err.message?.includes("Forbidden") ? 403 : 400);
    return res.status(status).json({ error: err.message });
  }
}

hrEmployeesRouter.post("/:id/toggle-account-status", requireAuth, handleToggleAccountStatus);
hrEmployeesRouter.post("/:id/toggle-status", requireAuth, handleToggleAccountStatus);

