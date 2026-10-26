"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.complianceControlRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const statutory_rule_registry_service_1 = require("../services/statutory-rule-registry.service");
const payroll_engine_service_1 = require("../services/payroll-engine.service");
exports.complianceControlRouter = (0, express_1.Router)();
// Middleware: all compliance control routes require Super Admin authorization
exports.complianceControlRouter.use(auth_1.requireAuth, auth_1.requireSuperAdmin);
const registryService = new statutory_rule_registry_service_1.StatutoryRuleRegistryService(prisma_1.rawPrisma);
/**
 * GET /api/super/compliance/rules
 * Searchable, filterable statutory rule registry with audit details
 */
exports.complianceControlRouter.get("/rules", async (req, res) => {
    try {
        const { category, ruleType, stateCode, jurisdictionLevel, publicationStatus, financialYear, search, limit = "50", offset = "0", } = req.query;
        const where = {};
        if (category)
            where.category = String(category);
        if (ruleType)
            where.ruleType = String(ruleType).toUpperCase();
        if (stateCode)
            where.stateCode = String(stateCode).toUpperCase();
        if (jurisdictionLevel)
            where.jurisdictionLevel = String(jurisdictionLevel).toUpperCase();
        if (publicationStatus)
            where.publicationStatus = String(publicationStatus).toLowerCase();
        if (financialYear)
            where.financialYear = String(financialYear);
        if (search) {
            where.OR = [
                { ruleIdentifier: { contains: String(search), mode: "insensitive" } },
                { ruleType: { contains: String(search), mode: "insensitive" } },
                { stateCode: { contains: String(search), mode: "insensitive" } },
                { sourceAuthority: { contains: String(search), mode: "insensitive" } },
            ];
        }
        const take = Math.min(parseInt(String(limit), 10) || 50, 100);
        const skip = parseInt(String(offset), 10) || 0;
        const [rules, totalCount] = await Promise.all([
            prisma_1.rawPrisma.statutoryRule.findMany({
                where,
                orderBy: [{ ruleType: "asc" }, { stateCode: "asc" }, { version: "desc" }, { effectiveFrom: "desc" }],
                take,
                skip,
                include: {
                    auditLogs: {
                        orderBy: { createdAt: "desc" },
                        take: 5,
                    },
                },
            }),
            prisma_1.rawPrisma.statutoryRule.count({ where }),
        ]);
        return res.json({
            success: true,
            count: rules.length,
            totalCount,
            rules,
        });
    }
    catch (err) {
        console.error("[GET /api/super/compliance/rules] error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch statutory rule registry." });
    }
});
/**
 * GET /api/super/compliance/rules/:id
 * Retrieve a single rule with audit log history and linked previous versions
 */
exports.complianceControlRouter.get("/rules/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const rule = await prisma_1.rawPrisma.statutoryRule.findUnique({
            where: { id },
            include: {
                auditLogs: {
                    orderBy: { createdAt: "desc" },
                },
            },
        });
        if (!rule) {
            return res.status(404).json({ error: "Statutory rule not found." });
        }
        let previousVersion = null;
        if (rule.previousVersionId) {
            previousVersion = await prisma_1.rawPrisma.statutoryRule.findUnique({
                where: { id: rule.previousVersionId },
            });
        }
        return res.json({
            success: true,
            rule,
            previousVersion,
            auditLogs: rule.auditLogs,
        });
    }
    catch (err) {
        console.error(`[GET /api/super/compliance/rules/${req.params.id}] error:`, err);
        return res.status(500).json({ error: err.message || "Failed to fetch rule details." });
    }
});
/**
 * POST /api/super/compliance/rules/draft
 * Create a new statutory rule draft with effective-date scheduling and source metadata
 */
exports.complianceControlRouter.post("/rules/draft", async (req, res) => {
    try {
        const { ruleIdentifier, ruleType, category = "CENTRAL_STATUTORY", jurisdictionLevel = "CENTRAL", stateCode = "ALL", applicableCategory = "ALL", financialYear = "2026-2027", configJson, version, effectiveFrom, effectiveTo, sourceAuthority, notificationRef, sourceUrl, changeLog, isGlobal = true, tenantId, } = req.body;
        if (!ruleIdentifier || !ruleType || !configJson || !effectiveFrom) {
            return res.status(400).json({
                error: "Missing required fields: ruleIdentifier, ruleType, configJson, and effectiveFrom are mandatory.",
            });
        }
        const actorEmail = req.user?.email || "superadmin@masterhrms.com";
        const draft = await registryService.createDraft({
            tenantId: isGlobal ? null : (tenantId || null),
            ruleIdentifier,
            ruleType: String(ruleType).toUpperCase(),
            category: category,
            jurisdictionLevel: jurisdictionLevel,
            stateCode: stateCode ? String(stateCode).toUpperCase() : "ALL",
            applicableCategory,
            configJson,
            version: version ? Number(version) : undefined,
            effectiveFrom,
            effectiveTo: effectiveTo || null,
            financialYear,
            sourceAuthority,
            notificationRef,
            sourceUrl,
            changeLog,
            isGlobal: Boolean(isGlobal),
            actorEmail,
            actorRole: "SUPER_ADMIN",
        });
        return res.status(201).json({
            success: true,
            message: `Draft statutory rule ${ruleIdentifier} v${draft.version} created successfully.`,
            rule: draft,
        });
    }
    catch (err) {
        console.error("[POST /api/super/compliance/rules/draft] error:", err);
        return res.status(400).json({ error: err.message || "Failed to create draft statutory rule." });
    }
});
/**
 * PUT /api/super/compliance/rules/:id
 * Update an existing draft statutory rule
 */
exports.complianceControlRouter.put("/rules/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma_1.rawPrisma.statutoryRule.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: "Statutory rule not found." });
        }
        if (existing.publicationStatus !== "draft" && existing.publicationStatus !== "under_review") {
            return res.status(400).json({
                error: `Cannot modify rule in status '${existing.publicationStatus}'. Only draft or under_review rules can be edited.`,
            });
        }
        const { configJson, effectiveFrom, effectiveTo, sourceAuthority, notificationRef, sourceUrl, changeLog, } = req.body;
        const fromDate = effectiveFrom ? new Date(effectiveFrom) : existing.effectiveFrom;
        const toDate = effectiveTo !== undefined ? (effectiveTo ? new Date(effectiveTo) : null) : existing.effectiveTo;
        if (toDate && toDate <= fromDate) {
            return res.status(400).json({ error: "effectiveTo must be strictly after effectiveFrom." });
        }
        const updated = await prisma_1.rawPrisma.statutoryRule.update({
            where: { id },
            data: {
                ...(configJson ? { configJson } : {}),
                effectiveFrom: fromDate,
                effectiveTo: toDate,
                ...(sourceAuthority !== undefined ? { sourceAuthority } : {}),
                ...(notificationRef !== undefined ? { notificationRef } : {}),
                ...(sourceUrl !== undefined ? { sourceUrl } : {}),
                ...(changeLog ? { changeLog } : {}),
            },
        });
        const actorEmail = req.user?.email || "superadmin@masterhrms.com";
        await prisma_1.rawPrisma.statutoryRuleAuditLog.create({
            data: {
                ruleId: id,
                action: "DRAFT_UPDATED",
                actorEmail,
                actorRole: "SUPER_ADMIN",
                beforeState: existing,
                afterState: updated,
                notes: `Updated draft v${updated.version}`,
            },
        });
        return res.json({
            success: true,
            message: "Statutory rule draft updated successfully.",
            rule: updated,
        });
    }
    catch (err) {
        console.error(`[PUT /api/super/compliance/rules/${req.params.id}] error:`, err);
        return res.status(500).json({ error: err.message || "Failed to update draft rule." });
    }
});
/**
 * POST /api/super/compliance/rules/:id/submit
 * Submit a draft rule for compliance review (Maker-Checker Step 1)
 */
exports.complianceControlRouter.post("/rules/:id/submit", async (req, res) => {
    try {
        const { id } = req.params;
        const actorEmail = req.user?.email || "superadmin@masterhrms.com";
        const updated = await registryService.submitForReview(id, actorEmail, "SUPER_ADMIN");
        return res.json({
            success: true,
            message: "Rule successfully submitted for compliance review.",
            rule: updated,
        });
    }
    catch (err) {
        console.error(`[POST /api/super/compliance/rules/${req.params.id}/submit] error:`, err);
        return res.status(400).json({ error: err.message || "Failed to submit rule for review." });
    }
});
/**
 * POST /api/super/compliance/rules/:id/approve
 * Compliance review approval (Maker-Checker Step 2)
 */
exports.complianceControlRouter.post("/rules/:id/approve", async (req, res) => {
    try {
        const { id } = req.params;
        const actorEmail = req.user?.email || "compliance@masterhrms.com";
        const { enforceMakerChecker = true } = req.body;
        const updated = await registryService.approveRule(id, actorEmail, "COMPLIANCE_OFFICER", Boolean(enforceMakerChecker));
        return res.json({
            success: true,
            message: "Rule approved for publication.",
            rule: updated,
        });
    }
    catch (err) {
        console.error(`[POST /api/super/compliance/rules/${req.params.id}/approve] error:`, err);
        return res.status(400).json({ error: err.message || "Failed to approve rule." });
    }
});
/**
 * POST /api/super/compliance/rules/:id/publish
 * Publish & activate an approved statutory rule (Maker-Checker Step 3)
 * Automatically marks previous active version as superseded.
 */
exports.complianceControlRouter.post("/rules/:id/publish", async (req, res) => {
    try {
        const { id } = req.params;
        const actorEmail = req.user?.email || "superadmin@masterhrms.com";
        const published = await registryService.publishRule(id, actorEmail, "SUPER_ADMIN");
        return res.json({
            success: true,
            message: `Rule ${published.ruleIdentifier} v${published.version} successfully published and activated.`,
            rule: published,
        });
    }
    catch (err) {
        console.error(`[POST /api/super/compliance/rules/${req.params.id}/publish] error:`, err);
        return res.status(400).json({ error: err.message || "Failed to publish rule." });
    }
});
/**
 * POST /api/super/compliance/rules/:id/rollback
 * Rollback active rule to previous approved version
 */
exports.complianceControlRouter.post("/rules/:id/rollback", async (req, res) => {
    try {
        const { id } = req.params;
        const { targetVersionId } = req.body;
        if (!targetVersionId) {
            return res.status(400).json({ error: "targetVersionId is required for rollback." });
        }
        const actorEmail = req.user?.email || "superadmin@masterhrms.com";
        const restored = await registryService.rollbackRule(id, targetVersionId, actorEmail, "SUPER_ADMIN");
        return res.json({
            success: true,
            message: `Successfully rolled back to v${restored.version}.`,
            rule: restored,
        });
    }
    catch (err) {
        console.error(`[POST /api/super/compliance/rules/${req.params.id}/rollback] error:`, err);
        return res.status(400).json({ error: err.message || "Failed to rollback rule." });
    }
});
/**
 * POST /api/super/compliance/simulate
 * Impact simulation for representative employee scenarios
 * Compares current active rule configuration vs proposed candidate rule configuration
 */
exports.complianceControlRouter.post("/simulate", async (req, res) => {
    try {
        const { candidateRule, state = "TN", regime = "new", scenarios = [
            { label: "Junior Staff (₹15,000)", monthlyGross: 15000, basic: 7500 },
            { label: "Mid-level Associate (₹25,000)", monthlyGross: 25000, basic: 12500 },
            { label: "Senior Engineer (₹65,000)", monthlyGross: 65000, basic: 32500 },
            { label: "Lead Manager (₹1,25,000)", monthlyGross: 125000, basic: 62500 },
            { label: "Executive (₹2,50,000)", monthlyGross: 250000, basic: 125000 },
        ], } = req.body;
        if (!candidateRule || !candidateRule.configJson) {
            return res.status(400).json({ error: "candidateRule with configJson is required for simulation." });
        }
        // Resolve currently active rules
        const activeRules = await prisma_1.rawPrisma.statutoryRule.findMany({
            where: {
                publicationStatus: "published",
                isActive: true,
                OR: [
                    { stateCode: "ALL" },
                    { stateCode: state.toUpperCase() },
                ],
            },
        });
        // Create synthetic candidate rule with HIGH precedence for candidate run
        const candidateSynthetic = {
            ...candidateRule,
            id: "candidate-sim-id",
            version: 9999,
            publicationStatus: "published",
            isActive: true,
            effectiveFrom: new Date("2026-04-01"),
            effectiveTo: null,
        };
        // Filter out existing rule of same ruleType/stateCode and inject candidate
        const candidateRules = [
            ...activeRules.filter((r) => !(r.ruleType === candidateRule.ruleType && r.stateCode === (candidateRule.stateCode || "ALL"))),
            candidateSynthetic,
        ];
        const results = scenarios.map((sc) => {
            const basic = sc.basic || sc.monthlyGross * 0.5;
            const hra = sc.monthlyGross * 0.2;
            const allowance = sc.monthlyGross - basic - hra;
            const employeeMock = {
                id: "sim-emp-1",
                employeeCode: "SIM001",
                firstName: "Simulation",
                lastName: "Scenario",
                email: "sim@masterhrms.internal",
                baseMonthlyCtc: sc.monthlyGross,
                taxRegime: regime,
                state,
                pfEligible: true,
                esiEligible: true,
                ptEligible: true,
                tdsEligible: true,
            };
            const attendanceMock = {
                totalWorkingDays: 30,
                payableDays: 30,
                lossOfPayDays: 0,
                presentDays: 30,
                halfDays: 0,
                approvedLeaveDays: 0,
                prorationFactor: 1.0,
            };
            // 1. Current Active Baseline Run
            const baseline = (0, payroll_engine_service_1.computeEmployeePayrollBreakdown)(employeeMock, attendanceMock, {
                periodMonth: 4,
                periodYear: 2026,
                statutoryRules: activeRules,
            });
            // 2. Candidate Run
            const proposed = (0, payroll_engine_service_1.computeEmployeePayrollBreakdown)(employeeMock, attendanceMock, {
                periodMonth: 4,
                periodYear: 2026,
                statutoryRules: candidateRules,
            });
            const epfDiff = proposed.deductions.providentFund - baseline.deductions.providentFund;
            const esiDiff = proposed.deductions.esi - baseline.deductions.esi;
            const ptDiff = proposed.deductions.professionalTax - baseline.deductions.professionalTax;
            const lwfDiff = proposed.deductions.lwf - baseline.deductions.lwf;
            const tdsDiff = proposed.deductions.tds - baseline.deductions.tds;
            const netPayDiff = proposed.netPay - baseline.netPay;
            const employerCostDiff = proposed.employerContributions.totalEmployerCost - baseline.employerContributions.totalEmployerCost;
            return {
                scenario: sc.label,
                monthlyGross: sc.monthlyGross,
                baseline: {
                    epfEmployee: baseline.deductions.providentFund,
                    esiEmployee: baseline.deductions.esi,
                    pt: baseline.deductions.professionalTax,
                    lwfEmployee: baseline.deductions.lwf,
                    tds: baseline.deductions.tds,
                    netPay: baseline.netPay,
                    epfEmployer: baseline.employerContributions.epf,
                    esiEmployer: baseline.employerContributions.esiEmployer,
                    gratuityAccrual: baseline.employerContributions.gratuityAccrual,
                    totalEmployerCost: baseline.employerContributions.totalEmployerCost,
                },
                proposed: {
                    epfEmployee: proposed.deductions.providentFund,
                    esiEmployee: proposed.deductions.esi,
                    pt: proposed.deductions.professionalTax,
                    lwfEmployee: proposed.deductions.lwf,
                    tds: proposed.deductions.tds,
                    netPay: proposed.netPay,
                    epfEmployer: proposed.employerContributions.epf,
                    esiEmployer: proposed.employerContributions.esiEmployer,
                    gratuityAccrual: proposed.employerContributions.gratuityAccrual,
                    totalEmployerCost: proposed.employerContributions.totalEmployerCost,
                },
                variance: {
                    epfEmployee: Math.round(epfDiff * 100) / 100,
                    esiEmployee: Math.round(esiDiff * 100) / 100,
                    pt: Math.round(ptDiff * 100) / 100,
                    lwfEmployee: Math.round(lwfDiff * 100) / 100,
                    tds: Math.round(tdsDiff * 100) / 100,
                    netPay: Math.round(netPayDiff * 100) / 100,
                    employerTotalCostVariance: Math.round(employerCostDiff * 100) / 100,
                },
            };
        });
        return res.json({
            success: true,
            ruleType: candidateRule.ruleType,
            state,
            regime,
            scenariosEvaluated: scenarios.length,
            results,
        });
    }
    catch (err) {
        console.error("[POST /api/super/compliance/simulate] error:", err);
        return res.status(500).json({ error: err.message || "Failed to run compliance impact simulation." });
    }
});
/**
 * GET /api/super/compliance/audit-trail
 * Fetch immutable audit logs for statutory rule changes
 */
exports.complianceControlRouter.get("/audit-trail", async (req, res) => {
    try {
        const { ruleId, limit = "100" } = req.query;
        const where = {};
        if (ruleId)
            where.ruleId = String(ruleId);
        const take = Math.min(parseInt(String(limit), 10) || 100, 200);
        const logs = await prisma_1.rawPrisma.statutoryRuleAuditLog.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take,
            include: {
                rule: {
                    select: {
                        ruleIdentifier: true,
                        ruleType: true,
                        version: true,
                        stateCode: true,
                    },
                },
            },
        });
        return res.json({
            success: true,
            count: logs.length,
            logs,
        });
    }
    catch (err) {
        console.error("[GET /api/super/compliance/audit-trail] error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch statutory audit logs." });
    }
});
/**
 * GET /api/super/compliance/affected-tenants
 * Identifies tenants affected by a statutory rule amendment
 */
exports.complianceControlRouter.get("/affected-tenants", async (req, res) => {
    try {
        const { jurisdiction = "CENTRAL", stateCode = "ALL" } = req.query;
        const tenants = await prisma_1.rawPrisma.tenant.findMany({
            select: {
                id: true,
                name: true,
                slug: true,
                _count: {
                    select: { employees: true },
                },
            },
        });
        return res.json({
            success: true,
            jurisdiction: String(jurisdiction).toUpperCase(),
            stateCode: String(stateCode).toUpperCase(),
            affectedTenantsCount: tenants.length,
            tenants: tenants.map((t) => ({
                id: t.id,
                name: t.name,
                slug: t.slug,
                employeeCount: t._count.employees,
            })),
        });
    }
    catch (err) {
        console.error("[GET /api/super/compliance/affected-tenants] error:", err);
        return res.status(500).json({ error: err.message || "Failed to identify affected tenants." });
    }
});
