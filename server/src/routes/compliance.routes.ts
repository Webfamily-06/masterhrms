import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import {
  evaluateComplianceRules,
  STATUTORY_RULES_CONFIG,
} from "../services/compliance-rules.service";

export const complianceRouter = Router();

/**
 * GET /api/compliance/rules-config
 * Returns active versioned statutory rules configuration constants.
 */
complianceRouter.get("/rules-config", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    return res.json({
      success: true,
      config: STATUTORY_RULES_CONFIG,
      version: STATUTORY_RULES_CONFIG.VERSION,
    });
  } catch (err: any) {
    console.error("[GET /api/compliance/rules-config] error:", err);
    return res.status(500).json({ error: err.message || "Failed to retrieve statutory rules config." });
  }
});

/**
 * GET /api/compliance/forms/eligibility
 * Evaluates compliance and applicability rules across all or specific statutory forms for an employee/tenant.
 */
complianceRouter.get("/forms/eligibility", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context is required." });
    }

    const {
      employeeId,
      formCode,
      financialYear = "2026-2027",
      quarter = "Q1",
    } = req.query;

    const results = await evaluateComplianceRules({
      tenantId,
      employeeId: employeeId ? String(employeeId) : undefined,
      formCode: formCode ? String(formCode) : undefined,
      financialYear: String(financialYear),
      quarter: String(quarter),
    });

    return res.json({
      success: true,
      count: results.length,
      financialYear: String(financialYear),
      quarter: String(quarter),
      rulesVersion: STATUTORY_RULES_CONFIG.VERSION,
      results,
    });
  } catch (err: any) {
    console.error("[GET /api/compliance/forms/eligibility] error:", err);
    return res.status(500).json({ error: err.message || "Failed to evaluate form compliance." });
  }
});

/**
 * GET /api/compliance/forms/:formCode/eligibility
 * Evaluates a single form's statutory eligibility.
 */
complianceRouter.get("/forms/:formCode/eligibility", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context is required." });
    }

    const { formCode } = req.params;
    const {
      employeeId,
      financialYear = "2026-2027",
      quarter = "Q1",
    } = req.query;

    const results = await evaluateComplianceRules({
      tenantId,
      employeeId: employeeId ? String(employeeId) : undefined,
      formCode,
      financialYear: String(financialYear),
      quarter: String(quarter),
    });

    if (!results.length) {
      return res.status(404).json({ error: `Compliance rule for form ${formCode} not found.` });
    }

    return res.json({
      success: true,
      evaluation: results[0],
    });
  } catch (err: any) {
    console.error(`[GET /api/compliance/forms/${req.params.formCode}/eligibility] error:`, err);
    return res.status(500).json({ error: err.message || "Failed to evaluate form compliance." });
  }
});
