"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hrEmployeesRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tenant_context_1 = require("../context/tenant-context");
const employee_service_1 = require("../services/employee.service");
const data_scope_1 = require("../lib/data-scope");
exports.hrEmployeesRouter = (0, express_1.Router)();
// =========================================================================
// 1. LIST EMPLOYEES (GET /api/v1/hr/employees)
// Enforces Data Scope (SELF, TEAM, DEPT, BRANCH, ALL) & Field-Level Security
// =========================================================================
exports.hrEmployeesRouter.get("/", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const db = (0, tenant_context_1.getTenantDb)();
        const userContext = await (0, data_scope_1.resolveUserSecurityContext)(req.user?.userId, tenantId, req.user?.roles || [], db);
        const result = await employee_service_1.EmployeeService.listEmployees(tenantId, userContext, req.user?.permissions || [], req.query);
        return res.json(result);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// =========================================================================
// 2. ATOMIC EMPLOYEE CREATION (POST /api/v1/hr/employees)
// 8-Step Wizard Target: Atomic Employee + User + Outbox + Audit
// =========================================================================
exports.hrEmployeesRouter.post("/", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId;
        if (!tenantId || !actorId) {
            return res.status(403).json({ error: "Authenticated tenant and actor required" });
        }
        const employee = await employee_service_1.EmployeeService.createEmployeeAtomic(tenantId, actorId, req.body);
        return res.status(201).json({
            success: true,
            message: "Employee created and access provisioned successfully.",
            data: employee,
        });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// =========================================================================
// 3. EMPLOYEE IMPORT: DRY RUN (POST /api/v1/hr/employees/import/dry-run)
// =========================================================================
exports.hrEmployeesRouter.post("/import/dry-run", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const records = req.body?.records;
        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ error: "Array of records required for import dry run" });
        }
        const report = await employee_service_1.EmployeeService.validateImportDryRun(tenantId, records);
        return res.json(report);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// =========================================================================
// 4. EMPLOYEE IMPORT: COMMIT (POST /api/v1/hr/employees/import/commit)
// =========================================================================
exports.hrEmployeesRouter.post("/import/commit", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId;
        if (!tenantId || !actorId)
            return res.status(403).json({ error: "Tenant context required" });
        const validatedRows = req.body?.validatedRows;
        if (!Array.isArray(validatedRows) || validatedRows.length === 0) {
            return res.status(400).json({ error: "No validated rows provided for commit" });
        }
        const result = await employee_service_1.EmployeeService.commitImport(tenantId, actorId, validatedRows);
        return res.status(201).json(result);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
const employee_system_id_service_1 = require("../services/employee-system-id.service");
const settings_service_1 = require("../services/settings/settings.service");
// =========================================================================
// 4b. EMPLOYEE SYSTEM ID PREVIEW & CONFIGURATION
// =========================================================================
exports.hrEmployeesRouter.get("/system-id/preview", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const branchId = req.query.branchId ? String(req.query.branchId) : undefined;
        const preview = await employee_system_id_service_1.EmployeeSystemIdService.previewNextId(tenantId, branchId);
        return res.json(preview);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.hrEmployeesRouter.get("/system-id/config", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const config = await employee_system_id_service_1.EmployeeSystemIdService.getConfig(tenantId);
        const preview = await employee_system_id_service_1.EmployeeSystemIdService.previewNextId(tenantId);
        return res.json({ config, preview: preview.previewId });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.hrEmployeesRouter.put("/system-id/config", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const userRoles = req.user?.roles || [];
        const isAuthorized = userRoles.includes("super_admin") ||
            userRoles.includes("admin") ||
            userRoles.includes("hr_admin") ||
            userRoles.includes("Workspace Admin") ||
            userRoles.includes("HR Manager");
        if (!isAuthorized) {
            return res.status(403).json({ error: "Forbidden: Only HR and Tenant Administrators can update System ID settings." });
        }
        const { autoGenerate, companyPrefix, locationPrefix, sequenceStart, sequenceDigits, separator, } = req.body || {};
        const actorId = req.user?.userId || "system";
        if (autoGenerate !== undefined) {
            await settings_service_1.SettingsService.set("TENANT", tenantId, "hr.employee_id.auto_generate", Boolean(autoGenerate), actorId);
        }
        if (companyPrefix !== undefined) {
            await settings_service_1.SettingsService.set("TENANT", tenantId, "hr.employee_id.company_prefix", String(companyPrefix).trim(), actorId);
        }
        if (locationPrefix !== undefined) {
            await settings_service_1.SettingsService.set("TENANT", tenantId, "hr.employee_id.location_prefix", String(locationPrefix).trim(), actorId);
        }
        if (sequenceStart !== undefined) {
            await settings_service_1.SettingsService.set("TENANT", tenantId, "hr.employee_id.sequence_start", Number(sequenceStart), actorId);
        }
        if (sequenceDigits !== undefined) {
            await settings_service_1.SettingsService.set("TENANT", tenantId, "hr.employee_id.sequence_digits", Number(sequenceDigits), actorId);
        }
        if (separator !== undefined) {
            await settings_service_1.SettingsService.set("TENANT", tenantId, "hr.employee_id.separator", String(separator).trim(), actorId);
        }
        const updatedConfig = await employee_system_id_service_1.EmployeeSystemIdService.getConfig(tenantId);
        const updatedPreview = await employee_system_id_service_1.EmployeeSystemIdService.previewNextId(tenantId);
        return res.json({
            success: true,
            message: "Employee System ID settings updated successfully. Existing employee IDs remain unchanged.",
            config: updatedConfig,
            preview: updatedPreview.previewId,
        });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
// =========================================================================
// 5. EMPLOYEE 360 (GET /api/v1/hr/employees/:id)
// Consolidated authorized 360 profile with FLS & allowedActions
// =========================================================================
exports.hrEmployeesRouter.get("/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ error: "Tenant context required" });
        const db = (0, tenant_context_1.getTenantDb)();
        const userContext = await (0, data_scope_1.resolveUserSecurityContext)(req.user?.userId, tenantId, req.user?.roles || [], db);
        const employee360 = await employee_service_1.EmployeeService.getEmployee360(tenantId, req.params.id, userContext, req.user?.permissions || []);
        return res.json({
            success: true,
            data: employee360,
        });
    }
    catch (err) {
        return res.status(404).json({ error: err.message });
    }
});
// =========================================================================
// 6. UPDATE EMPLOYEE (PUT /api/v1/hr/employees/:id)
// Comprehensive update with step-by-step persistence, role authorization,
// and financial field permission enforcement.
// =========================================================================
exports.hrEmployeesRouter.put("/:id", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId;
        if (!tenantId || !actorId) {
            return res.status(403).json({ error: "Tenant context and authenticated actor required" });
        }
        const db = (0, tenant_context_1.getTenantDb)();
        const userContext = await (0, data_scope_1.resolveUserSecurityContext)(actorId, tenantId, req.user?.roles || [], db);
        const updated = await employee_service_1.EmployeeService.updateEmployee(tenantId, actorId, req.params.id, req.body, userContext, req.user?.permissions || []);
        return res.json({
            success: true,
            message: "Employee details updated successfully.",
            data: updated,
        });
    }
    catch (err) {
        const status = err.statusCode ||
            (err.message?.includes("not found") ? 404 : err.message?.includes("Forbidden") ? 403 : 400);
        return res.status(status).json({ error: err.message });
    }
});
// =========================================================================
// 7. CHANGE EMPLOYEE PASSWORD (POST /api/v1/hr/employees/:id/password)
// Secure password update with bcrypt (10 rounds), tenant isolation, and audit logging.
// =========================================================================
async function handlePasswordChange(req, res) {
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
        const db = (0, tenant_context_1.getTenantDb)();
        const userContext = await (0, data_scope_1.resolveUserSecurityContext)(actorId, tenantId, req.user?.roles || [], db);
        const result = await employee_service_1.EmployeeService.changeEmployeePassword(tenantId, actorId, req.params.id, newPassword, userContext);
        return res.json(result);
    }
    catch (err) {
        const status = err.statusCode ||
            (err.message?.includes("not found") ? 404 : err.message?.includes("Forbidden") ? 403 : 400);
        return res.status(status).json({ error: err.message });
    }
}
exports.hrEmployeesRouter.post("/:id/password", auth_1.requireAuth, handlePasswordChange);
exports.hrEmployeesRouter.post("/:id/set-password", auth_1.requireAuth, handlePasswordChange);
// =========================================================================
// 8. TOGGLE EMPLOYEE ACCOUNT STATUS (POST /api/v1/hr/employees/:id/toggle-account-status)
// Enables or disables employee login account access while preserving employment,
// attendance, leave, and payroll records.
// =========================================================================
async function handleToggleAccountStatus(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const actorId = req.user?.userId;
        if (!tenantId || !actorId) {
            return res.status(403).json({ error: "Tenant context and authenticated actor required" });
        }
        const db = (0, tenant_context_1.getTenantDb)();
        const userContext = await (0, data_scope_1.resolveUserSecurityContext)(actorId, tenantId, req.user?.roles || [], db);
        const result = await employee_service_1.EmployeeService.toggleEmployeeAccountStatus(tenantId, actorId, req.params.id, userContext);
        return res.json(result);
    }
    catch (err) {
        const status = err.statusCode ||
            (err.message?.includes("not found") ? 404 : err.message?.includes("Forbidden") ? 403 : 400);
        return res.status(status).json({ error: err.message });
    }
}
exports.hrEmployeesRouter.post("/:id/toggle-account-status", auth_1.requireAuth, handleToggleAccountStatus);
exports.hrEmployeesRouter.post("/:id/toggle-status", auth_1.requireAuth, handleToggleAccountStatus);
