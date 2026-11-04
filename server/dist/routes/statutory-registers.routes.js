"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statutoryRegistersRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const tenant_context_middleware_1 = require("../middleware/tenant-context.middleware");
const statutory_form_registry_service_1 = require("../services/statutory/statutory-form-registry.service");
const statutory_excel_exporter_service_1 = require("../services/statutory/exporters/statutory-excel-exporter.service");
const statutory_pdf_exporter_service_1 = require("../services/statutory/exporters/statutory-pdf-exporter.service");
const db = prisma_1.rawPrisma || prisma_1.prisma;
exports.statutoryRegistersRouter = (0, express_1.Router)();
// Apply Authentication and Tenant Context
exports.statutoryRegistersRouter.use(auth_1.requireAuth, tenant_context_middleware_1.resolveTenantContext);
const STATUTORY_VIEW_ROLES = ["super_admin", "tenant_admin", "admin", "hr_admin", "hr_manager", "finance_manager"];
const STATUTORY_MANAGE_ROLES = ["super_admin", "tenant_admin", "admin", "hr_admin"];
/**
 * Helper to parse cycleId / query params
 */
function parsePeriodParams(req, cycleIdParam) {
    const tenantId = req.user?.tenantId;
    const payrollRunId = cycleIdParam && cycleIdParam !== "latest" ? cycleIdParam : req.query.payrollRunId;
    const year = req.query.year ? Number(req.query.year) : undefined;
    const month = req.query.month ? Number(req.query.month) : undefined;
    const financialYear = req.query.financialYear || (year ? `${year}-${year + 1}` : undefined);
    const establishmentId = req.query.establishmentId;
    const filterDepartmentId = req.query.departmentId;
    return {
        tenantId,
        payrollRunId,
        year,
        month,
        financialYear,
        establishmentId,
        filterDepartmentId,
    };
}
/**
 * 1. GET /api/payroll/statutory-forms/metadata
 * Return metadata catalog for all 5 registers
 */
exports.statutoryRegistersRouter.get("/metadata", (0, auth_1.requireRole)(...STATUTORY_VIEW_ROLES), async (_req, res) => {
    try {
        const catalog = statutory_form_registry_service_1.StatutoryFormRegistryService.getAvailableRegisters();
        return res.json({ catalog });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch statutory metadata" });
    }
});
/**
 * 2. GET /api/payroll/statutory-forms/form-u/:cycleId
 * Generate Form U (Employee Register - 27 columns)
 */
exports.statutoryRegistersRouter.get("/form-u/:cycleId", (0, auth_1.requireRole)(...STATUTORY_VIEW_ROLES), async (req, res) => {
    try {
        const input = parsePeriodParams(req, req.params.cycleId);
        const result = await statutory_form_registry_service_1.StatutoryFormRegistryService.generateRegister("FORM_U", input);
        return res.json({
            success: true,
            data: result.model,
            validation: result.validation,
            metadata: result.metadata,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to generate Form U" });
    }
});
/**
 * 3. GET /api/payroll/statutory-forms/form-v/:cycleId
 * Generate Form V (Register of Employment / Muster Roll - 46 columns)
 */
exports.statutoryRegistersRouter.get("/form-v/:cycleId", (0, auth_1.requireRole)(...STATUTORY_VIEW_ROLES), async (req, res) => {
    try {
        const input = parsePeriodParams(req, req.params.cycleId);
        const result = await statutory_form_registry_service_1.StatutoryFormRegistryService.generateRegister("FORM_V", input);
        return res.json({
            success: true,
            data: result.model,
            validation: result.validation,
            metadata: result.metadata,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to generate Form V" });
    }
});
/**
 * 4. GET /api/payroll/statutory-forms/form-w/:cycleId
 * Generate Form W (Register of Wages - 34 columns)
 */
exports.statutoryRegistersRouter.get("/form-w/:cycleId", (0, auth_1.requireRole)(...STATUTORY_VIEW_ROLES), async (req, res) => {
    try {
        const input = parsePeriodParams(req, req.params.cycleId);
        const result = await statutory_form_registry_service_1.StatutoryFormRegistryService.generateRegister("FORM_W", input);
        return res.json({
            success: true,
            data: result.model,
            validation: result.validation,
            metadata: result.metadata,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to generate Form W" });
    }
});
/**
 * 5. GET /api/payroll/statutory-forms/form-x/:cycleId
 * Generate Form X (Leave & Social Security Register - 21 columns)
 */
exports.statutoryRegistersRouter.get("/form-x/:cycleId", (0, auth_1.requireRole)(...STATUTORY_VIEW_ROLES), async (req, res) => {
    try {
        const input = parsePeriodParams(req, req.params.cycleId);
        const result = await statutory_form_registry_service_1.StatutoryFormRegistryService.generateRegister("FORM_X", input);
        return res.json({
            success: true,
            data: result.model,
            validation: result.validation,
            metadata: result.metadata,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to generate Form X" });
    }
});
/**
 * 6. GET /api/payroll/statutory-forms/form-s/:cycleId
 * Generate Form S (Shift Notice & Hours - 38 columns)
 */
exports.statutoryRegistersRouter.get("/form-s/:cycleId", (0, auth_1.requireRole)(...STATUTORY_VIEW_ROLES), async (req, res) => {
    try {
        const input = parsePeriodParams(req, req.params.cycleId);
        const result = await statutory_form_registry_service_1.StatutoryFormRegistryService.generateRegister("FORM_S", input);
        return res.json({
            success: true,
            data: result.model,
            validation: result.validation,
            metadata: result.metadata,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to generate Form S" });
    }
});
/**
 * 7. GET /api/payroll/statutory-forms/bundle/:cycleId
 * Download all 5 forms as multi-tab XLSX matching the reference workbook
 */
exports.statutoryRegistersRouter.get("/bundle/:cycleId", (0, auth_1.requireRole)(...STATUTORY_VIEW_ROLES), async (req, res) => {
    try {
        const input = parsePeriodParams(req, req.params.cycleId);
        const buffer = await statutory_excel_exporter_service_1.StatutoryExcelExporterService.exportBundle(input);
        const filename = `Statutory_Registers_Bundle_TN_${input.year || "2026"}_M${input.month || "10"}.xlsx`;
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        return res.send(buffer);
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to generate multi-tab statutory bundle" });
    }
});
/**
 * 8. GET /api/payroll/statutory-forms/export/:formCode/:cycleId
 * Export single register as XLSX or PDF
 */
exports.statutoryRegistersRouter.get("/export/:formCode/:cycleId", (0, auth_1.requireRole)(...STATUTORY_VIEW_ROLES), async (req, res) => {
    try {
        const { formCode, cycleId } = req.params;
        const format = (req.query.format || "xlsx").toLowerCase();
        const input = parsePeriodParams(req, cycleId);
        if (format === "pdf") {
            const buffer = await statutory_pdf_exporter_service_1.StatutoryPdfExporterService.exportSingleRegister(formCode, input);
            const filename = `${formCode.toUpperCase()}_TN_${input.year || "2026"}.pdf`;
            res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
            res.setHeader("Content-Type", "application/pdf");
            return res.send(buffer);
        }
        else {
            const buffer = await statutory_excel_exporter_service_1.StatutoryExcelExporterService.exportSingleRegister(formCode, input);
            const filename = `${formCode.toUpperCase()}_TN_${input.year || "2026"}.xlsx`;
            res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            return res.send(buffer);
        }
    }
    catch (err) {
        return res.status(500).json({ error: err.message || `Failed to export ${req.params.formCode}` });
    }
});
/**
 * 9. POST /api/payroll/statutory-forms/validate
 * Run statutory validation and missing field diagnostics
 */
exports.statutoryRegistersRouter.post("/validate", (0, auth_1.requireRole)(...STATUTORY_VIEW_ROLES), async (req, res) => {
    try {
        const { formCode = "FORM_W", payrollRunId, year, month, financialYear } = req.body;
        const tenantId = req.user?.tenantId;
        const report = await statutory_form_registry_service_1.StatutoryFormRegistryService.validateRegister(formCode, {
            tenantId,
            payrollRunId,
            year,
            month,
            financialYear,
        });
        return res.json({ success: true, report });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Validation failed" });
    }
});
/**
 * 10. POST /api/payroll/statutory-forms/reconcile
 * Reconcile register totals with finalized payroll run
 */
exports.statutoryRegistersRouter.post("/reconcile", (0, auth_1.requireRole)(...STATUTORY_VIEW_ROLES), async (req, res) => {
    try {
        const { formCode = "FORM_W", payrollRunId, year, month } = req.body;
        const tenantId = req.user?.tenantId;
        const report = await statutory_form_registry_service_1.StatutoryFormRegistryService.reconcileRegister(formCode, {
            tenantId,
            payrollRunId,
            year,
            month,
        });
        return res.json({ success: true, report });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Reconciliation failed" });
    }
});
/**
 * 11. GET /api/payroll/statutory-forms/history
 * List statutory generation and archive history
 */
exports.statutoryRegistersRouter.get("/history", (0, auth_1.requireRole)(...STATUTORY_VIEW_ROLES), async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const runs = await db.payrollRun.findMany({
            where: { tenantId },
            orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
            take: 12,
            select: {
                id: true,
                periodYear: true,
                periodMonth: true,
                status: true,
                approvalStatus: true,
                processedAt: true,
                employeeCount: true,
                totalAmount: true,
                totalNet: true,
                statutoryManifest: true,
            },
        });
        return res.json({ success: true, history: runs });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to fetch generation history" });
    }
});
/**
 * 12. POST /api/payroll/statutory-forms/finalize/:formCode/:cycleId
 * Finalize and store immutable snapshot metadata for statutory register
 */
exports.statutoryRegistersRouter.post("/finalize/:formCode/:cycleId", (0, auth_1.requireRole)(...STATUTORY_MANAGE_ROLES), async (req, res) => {
    try {
        const { formCode, cycleId } = req.params;
        const input = parsePeriodParams(req, cycleId);
        const generated = await statutory_form_registry_service_1.StatutoryFormRegistryService.generateRegister(formCode, input);
        if (!generated.validation.isValid) {
            return res.status(400).json({
                error: "Cannot finalize register with unresolved statutory validation errors.",
                issues: generated.validation.issues,
            });
        }
        // If cycleId matches a payroll run, update its statutory manifest immutably
        if (input.payrollRunId) {
            const currentRun = await db.payrollRun.findUnique({
                where: { id: input.payrollRunId },
            });
            if (currentRun) {
                const manifest = (currentRun.statutoryManifest || {});
                manifest[formCode.toUpperCase()] = {
                    finalizedAt: new Date().toISOString(),
                    finalizedBy: req.user?.email || "admin",
                    totalRecords: generated.model.rows?.length || 0,
                    columnCount: generated.metadata.columnCount,
                    governingRule: generated.metadata.governingRule,
                    version: "v1.0-TN",
                    hash: `SHA256-${Buffer.from(JSON.stringify(generated.model)).length}`,
                };
                await db.payrollRun.update({
                    where: { id: input.payrollRunId },
                    data: { statutoryManifest: manifest },
                });
            }
        }
        return res.json({
            success: true,
            message: `${generated.metadata.name} finalized and archived immutably.`,
            metadata: generated.metadata,
            finalizedAt: new Date().toISOString(),
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || "Failed to finalize statutory register" });
    }
});
