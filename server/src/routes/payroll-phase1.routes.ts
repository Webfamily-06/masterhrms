import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { resolveTenantContext } from '../middleware/tenant-context.middleware';
import { Parser, Evaluator } from '../services/formula-engine';
import { PayrollBatchService } from '../services/payroll-batch.service';
import { PayrollExportService } from '../services/payroll-export.service';

export const payrollPhase1Router = Router();

// Enforce authentication & tenant isolation
payrollPhase1Router.use(requireAuth, resolveTenantContext);

/**
 * 1. GET /api/payroll/states
 * Returns all 36 Indian States and Union Territories with TIN codes, capitals, and statutory flags
 */
payrollPhase1Router.get('/states', async (req: AuthRequest, res: Response) => {
  try {
    const states = await prisma.stateUTMaster.findMany({
      orderBy: { name: 'asc' },
    });
    return res.json({ states, count: states.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch State/UT master' });
  }
});

/**
 * 2. GET /api/payroll/rules
 * List versioned statutory rules with provenance metadata
 */
payrollPhase1Router.get('/rules', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const { stateCode, ruleType, status } = req.query;
    const where: any = { tenantId };

    if (stateCode) where.stateCode = String(stateCode);
    if (ruleType) where.ruleType = String(ruleType);
    if (status) where.status = String(status);

    const rules = await prisma.statutoryRule.findMany({
      where,
      orderBy: [{ ruleType: 'asc' }, { effectiveFrom: 'desc' }],
    });

    return res.json({ rules, count: rules.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch statutory rules' });
  }
});

/**
 * 3. POST /api/payroll/rules
 * Create or update a versioned statutory rule with strict audit & provenance
 */
payrollPhase1Router.post('/rules', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const {
      ruleType,
      stateCode,
      configJson,
      effectiveFrom,
      effectiveTo,
      version = 1,
      sourceAuthority,
      notificationRef,
      isVerified = false,
      status = 'active',
    } = req.body;

    if (!ruleType || !configJson || !effectiveFrom) {
      return res.status(400).json({ error: 'ruleType, configJson, and effectiveFrom are required' });
    }

    const rule = await prisma.statutoryRule.create({
      data: {
        tenantId,
        ruleType,
        stateCode: stateCode || null,
        configJson,
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        version: Number(version),
        sourceAuthority,
        notificationRef,
        isVerified: Boolean(isVerified),
        verifiedBy: isVerified ? req.user?.email || 'admin' : null,
        signoffDate: isVerified ? new Date() : null,
        status,
        isActive: status === 'active',
      },
    });

    return res.status(201).json({ rule });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create statutory rule' });
  }
});

/**
 * 4. GET /api/payroll/formulas
 * List Section 9A safe formulas with scope cascading
 */
payrollPhase1Router.get('/formulas', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const { scope, type } = req.query;
    const where: any = { tenantId, isActive: true };

    if (scope) where.scope = String(scope);
    if (type) where.type = String(type);

    const formulas = await prisma.payrollFormula.findMany({
      where,
      orderBy: [{ scope: 'asc' }, { componentCode: 'asc' }],
    });

    return res.json({ formulas, count: formulas.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch payroll formulas' });
  }
});

/**
 * 5. POST /api/payroll/formulas
 * Create or update a payroll formula with AST syntax verification
 */
payrollPhase1Router.post('/formulas', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const {
      componentCode,
      name,
      type = 'earning',
      expression,
      rounding = 'exact_2dec',
      scope = 'global',
      stateCode,
      clientId,
      structureId,
      notes,
    } = req.body;

    if (!componentCode || !name || !expression) {
      return res.status(400).json({ error: 'componentCode, name, and expression are required' });
    }

    // AST syntax validation: Ensure expression is 100% syntactically valid before saving
    let dependencies: string[] = [];
    try {
      const parsed = Parser.parse(expression);
      dependencies = parsed.dependencies;
    } catch (parseErr: any) {
      return res.status(400).json({
        error: `Formula syntax error: ${parseErr.message}`,
        expression,
      });
    }

    const formula = await prisma.payrollFormula.create({
      data: {
        tenantId,
        componentCode: componentCode.toUpperCase(),
        name,
        type,
        expression,
        rounding,
        scope,
        stateCode: stateCode || null,
        clientId: clientId || null,
        structureId: structureId || null,
        notes,
        author: req.user?.email || 'admin',
        isActive: true,
        version: 1,
      },
    });

    return res.status(201).json({ formula, dependencies });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create formula' });
  }
});

/**
 * 6. POST /api/payroll/formulas/test
 * Safe Formula Interactive Sandbox: Tests expression against variables without executing unsafe code
 */
payrollPhase1Router.post('/formulas/test', (req: AuthRequest, res: Response) => {
  try {
    const { expression, variables = {} } = req.body;
    if (!expression) {
      return res.status(400).json({ error: 'expression is required' });
    }

    // Safe parse
    const { ast, dependencies } = Parser.parse(expression);

    // Safe evaluate with Decimal.js
    const evaluator = new Evaluator(variables);
    const { result, steps } = evaluator.evaluate(ast);

    return res.json({
      valid: true,
      expression,
      dependencies,
      result: result.toNumber(),
      formatted: result.toFixed(2),
      steps,
    });
  } catch (err: any) {
    return res.status(400).json({
      valid: false,
      error: err.message || 'Formula evaluation error',
    });
  }
});

/**
 * 7. GET /api/payroll/preflight
 * Run pre-flight diagnostic validation report for tenant employees
 */
payrollPhase1Router.get('/preflight', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const batchService = new PayrollBatchService(prisma);
    const report = await batchService.runPreflight(tenantId);

    return res.json(report);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Preflight check failed' });
  }
});

/**
 * 8. POST /api/payroll/batch/calculate
 * Execute full chunked batch calculation using Section 9A safe formula DAG engine
 */
payrollPhase1Router.post('/batch/calculate', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const now = new Date();
    const periodMonth = Number(req.body.periodMonth ?? now.getMonth() + 1);
    const periodYear = Number(req.body.periodYear ?? now.getFullYear());
    const cutoffStartDay = Number(req.body.cutoffStartDay ?? 1);
    const cutoffEndDay = Number(req.body.cutoffEndDay ?? 0);
    const lopOverrides = req.body.lopOverrides;
    const employeeIds = req.body.employeeIds;
    const clientId = req.body.clientId;

    const batchService = new PayrollBatchService(prisma);

    const result = await batchService.processBatch({
      tenantId,
      periodMonth,
      periodYear,
      cutoffStartDay,
      cutoffEndDay,
      lopOverrides,
      employeeIds,
      clientId,
    });

    return res.status(200).json({
      success: true,
      message: `Successfully calculated payroll for ${result.processedCount} employees.`,
      result,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Payroll calculation failed' });
  }
});

/**
 * 9. GET /api/payroll/runs/:id/traces
 * Cell-level explanation trace for the "Why is this calculated this way?" audit modal
 */
payrollPhase1Router.get('/runs/:id/traces', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const payrollRunId = req.params.id;
    const { employeeId, componentCode } = req.query;

    const where: any = { tenantId, payrollRunId };
    if (employeeId) where.employeeId = String(employeeId);
    if (componentCode) where.componentCode = String(componentCode).toUpperCase();

    const traces = await prisma.payrollExecutionTrace.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return res.json({ traces, count: traces.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch execution traces' });
  }
});

/**
 * 10. GET /api/payroll/runs/:id/export/excel
 * Streamed Excel workbook export matching Paysheet_ENABL_AUG_2026_-Final.xlsx (7-Group IR)
 */
payrollPhase1Router.get('/runs/:id/export/excel', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const payrollRunId = req.params.id;
    const exportService = new PayrollExportService(prisma);
    const buffer = await exportService.generateExcel(tenantId, payrollRunId);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Paysheet_Export_${payrollRunId}.xlsx"`
    );

    return res.send(buffer);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Excel export failed' });
  }
});

/**
 * 11. GET /api/payroll/runs/:id/export/pdf
 * Streamed Landscape Vector PDF paysheet register export
 */
payrollPhase1Router.get('/runs/:id/export/pdf', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const payrollRunId = req.params.id;
    const exportService = new PayrollExportService(prisma);
    const buffer = await exportService.generatePDF(tenantId, payrollRunId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Paysheet_Export_${payrollRunId}.pdf"`
    );

    return res.send(buffer);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'PDF export failed' });
  }
});

/**
 * 12. GET /api/payroll/templates
 * List dynamic export templates
 */
payrollPhase1Router.get('/templates', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const templates = await prisma.payrollExportTemplate.findMany({
      where: { tenantId },
    });

    return res.json({ templates, count: templates.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch templates' });
  }
});

/**
 * 13. POST /api/payroll/templates
 * Create or customize a dynamic export template
 */
payrollPhase1Router.post('/templates', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const { templateCode, name, description, isDefault = false, structureJson } = req.body;
    if (!templateCode || !name || !structureJson) {
      return res.status(400).json({ error: 'templateCode, name, and structureJson are required' });
    }

    if (isDefault) {
      await prisma.payrollExportTemplate.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const template = await prisma.payrollExportTemplate.upsert({
      where: {
        tenantId_templateCode: {
          tenantId,
          templateCode,
        },
      },
      update: {
        name,
        description,
        isDefault: Boolean(isDefault),
        structureJson,
      },
      create: {
        tenantId,
        templateCode,
        name,
        description,
        isDefault: Boolean(isDefault),
        structureJson,
      },
    });

    return res.status(201).json({ template });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to save export template' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ESTABLISHMENTS CRUD (TENANT ISOLATED)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 14. GET /api/payroll/establishments
 */
payrollPhase1Router.get('/establishments', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const establishments = await prisma.establishment.findMany({
      where: { tenantId },
      include: {
        _count: { select: { employees: true } },
      },
      orderBy: { name: 'asc' },
    });

    return res.json({ establishments, count: establishments.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch establishments' });
  }
});

/**
 * 15. POST /api/payroll/establishments
 */
payrollPhase1Router.post('/establishments', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const {
      name,
      code,
      stateCode,
      address,
      epfCode,
      esicCode,
      ptRegistrationNo,
      lwfRegistrationNo,
      clraLicenceNo,
      status = 'active',
    } = req.body;

    if (!name || !stateCode) {
      return res.status(400).json({ error: 'name and stateCode are required' });
    }

    const establishment = await prisma.establishment.create({
      data: {
        tenantId,
        name,
        code,
        stateCode,
        address,
        epfCode,
        esicCode,
        ptRegistrationNo,
        lwfRegistrationNo,
        clraLicenceNo,
        status,
      },
    });

    return res.status(201).json({ establishment });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create establishment' });
  }
});

/**
 * 16. PUT /api/payroll/establishments/:id
 */
payrollPhase1Router.put('/establishments/:id', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const { id } = req.params;
    const existing = await prisma.establishment.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: 'Establishment not found' });

    const establishment = await prisma.establishment.update({
      where: { id },
      data: req.body,
    });

    return res.json({ establishment });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update establishment' });
  }
});

/**
 * 17. DELETE /api/payroll/establishments/:id
 */
payrollPhase1Router.delete('/establishments/:id', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const { id } = req.params;
    const existing = await prisma.establishment.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: 'Establishment not found' });

    await prisma.establishment.delete({ where: { id } });
    return res.json({ success: true, message: 'Establishment deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to delete establishment' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STAFFING CLIENTS CRUD (TENANT ISOLATED)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 18. GET /api/payroll/clients
 */
payrollPhase1Router.get('/clients', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const clients = await prisma.staffingClient.findMany({
      where: { tenantId },
      include: {
        _count: { select: { employees: true } },
      },
      orderBy: { name: 'asc' },
    });

    return res.json({ clients, count: clients.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch staffing clients' });
  }
});

/**
 * 19. POST /api/payroll/clients
 */
payrollPhase1Router.post('/clients', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const {
      name,
      code,
      gstin,
      billingStateCode,
      address,
      serviceChargePct = 10.0,
      serviceChargeBase = 'earned_gross_plus_statutory',
      status = 'active',
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Client name is required' });

    const client = await prisma.staffingClient.create({
      data: {
        tenantId,
        name,
        code,
        gstin,
        billingStateCode,
        address,
        serviceChargePct: Number(serviceChargePct),
        serviceChargeBase,
        status,
      },
    });

    return res.status(201).json({ client });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create staffing client' });
  }
});

/**
 * 20. PUT /api/payroll/clients/:id
 */
payrollPhase1Router.put('/clients/:id', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const { id } = req.params;
    const existing = await prisma.staffingClient.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: 'Staffing client not found' });

    const client = await prisma.staffingClient.update({
      where: { id },
      data: req.body,
    });

    return res.json({ client });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update staffing client' });
  }
});

/**
 * 21. DELETE /api/payroll/clients/:id
 */
payrollPhase1Router.delete('/clients/:id', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const { id } = req.params;
    const existing = await prisma.staffingClient.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return res.status(404).json({ error: 'Staffing client not found' });

    await prisma.staffingClient.delete({ where: { id } });
    return res.json({ success: true, message: 'Staffing client deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to delete staffing client' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE & LOP INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 22. GET /api/payroll/attendance-summary
 * Get attendance & LOP summary for tenant active employees across a cutoff window
 */
payrollPhase1Router.get('/attendance-summary', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const now = new Date();
    const periodMonth = Number(req.query.periodMonth ?? now.getMonth() + 1);
    const periodYear = Number(req.query.periodYear ?? now.getFullYear());
    const cutoffStartDay = Number(req.query.cutoffStartDay ?? 1);
    const cutoffEndDay = Number(req.query.cutoffEndDay ?? 0);

    const { PayrollAttendanceService } = await import('../services/payroll-attendance.service');
    const attendanceService = new PayrollAttendanceService(prisma);

    const attendanceMap = await attendanceService.computeTenantAttendance(tenantId, {
      periodMonth,
      periodYear,
      cutoffStartDay,
      cutoffEndDay,
    });

    const summaries = Array.from(attendanceMap.values());
    return res.json({
      periodMonth,
      periodYear,
      cutoffStartDay,
      cutoffEndDay,
      summaries,
      count: summaries.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch attendance summary' });
  }
});

/**
 * 23. POST /api/payroll/rules/:id/verify
 * Official Signoff & provenance verification for a statutory rule pack
 */
payrollPhase1Router.post('/rules/:id/verify', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const { id } = req.params;
    const rule = await prisma.statutoryRule.findFirst({
      where: { id, tenantId },
    });
    if (!rule) return res.status(404).json({ error: 'Statutory rule not found' });

    const verified = await prisma.statutoryRule.update({
      where: { id },
      data: {
        isVerified: true,
        verifiedBy: req.user?.email || 'system',
        signoffDate: new Date(),
        status: 'active',
        isActive: true,
      },
    });

    return res.json({
      success: true,
      message: `Statutory rule ${verified.ruleType} verified and signed off.`,
      rule: verified,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to verify statutory rule' });
  }
});
