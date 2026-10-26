"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.complianceRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const compliance_rules_service_1 = require("../services/compliance-rules.service");
const financial_year_1 = require("../utils/financial-year");
exports.complianceRouter = (0, express_1.Router)();
/**
 * GET /api/compliance/rules-config
 * Returns active versioned statutory rules configuration constants.
 */
exports.complianceRouter.get("/rules-config", auth_1.requireAuth, async (req, res) => {
    try {
        return res.json({
            success: true,
            config: compliance_rules_service_1.STATUTORY_RULES_CONFIG,
            version: compliance_rules_service_1.STATUTORY_RULES_CONFIG.VERSION,
        });
    }
    catch (err) {
        console.error("[GET /api/compliance/rules-config] error:", err);
        return res.status(500).json({ error: err.message || "Failed to retrieve statutory rules config." });
    }
});
/**
 * GET /api/compliance/forms/eligibility
 * Evaluates compliance and applicability rules across all or specific statutory forms for an employee/tenant.
 */
exports.complianceRouter.get("/forms/eligibility", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: "Tenant context is required." });
        }
        const { employeeId, formCode, financialYear: rawFinancialYear, quarter = "Q1", } = req.query;
        const financialYear = (0, financial_year_1.normalizeFinancialYear)(rawFinancialYear);
        const results = await (0, compliance_rules_service_1.evaluateComplianceRules)({
            tenantId,
            employeeId: employeeId ? String(employeeId) : undefined,
            formCode: formCode ? String(formCode) : undefined,
            financialYear,
            quarter: String(quarter),
        });
        return res.json({
            success: true,
            count: results.length,
            financialYear: String(financialYear),
            quarter: String(quarter),
            rulesVersion: compliance_rules_service_1.STATUTORY_RULES_CONFIG.VERSION,
            results,
        });
    }
    catch (err) {
        console.error("[GET /api/compliance/forms/eligibility] error:", err);
        return res.status(500).json({ error: err.message || "Failed to evaluate form compliance." });
    }
});
/**
 * GET /api/compliance/forms/:formCode/eligibility
 * Evaluates a single form's statutory eligibility.
 */
exports.complianceRouter.get("/forms/:formCode/eligibility", auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(400).json({ error: "Tenant context is required." });
        }
        const { formCode } = req.params;
        const { employeeId, financialYear: rawFinancialYear, quarter = "Q1", } = req.query;
        const financialYear = (0, financial_year_1.normalizeFinancialYear)(rawFinancialYear);
        const results = await (0, compliance_rules_service_1.evaluateComplianceRules)({
            tenantId,
            employeeId: employeeId ? String(employeeId) : undefined,
            formCode,
            financialYear,
            quarter: String(quarter),
        });
        if (!results.length) {
            return res.status(404).json({ error: `Compliance rule for form ${formCode} not found.` });
        }
        return res.json({
            success: true,
            evaluation: results[0],
        });
    }
    catch (err) {
        console.error(`[GET /api/compliance/forms/${req.params.formCode}/eligibility] error:`, err);
        return res.status(500).json({ error: err.message || "Failed to evaluate form compliance." });
    }
});
