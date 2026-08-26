import { Router, Response } from "express";
import { prisma } from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { broadcastToTenant } from "../socket";
import crypto from "crypto";

export const payrollRouter = Router();

// Standard default salary components
const DEFAULT_SALARY_COMPONENTS = [
  {
    id: "comp-basic",
    name: "Basic Salary",
    code: "BASIC",
    type: "earning",
    calculationType: "percentage_of_ctc",
    value: 50,
    isTaxable: true,
    isStatutory: false,
    description: "Core basic remuneration (Standard 50% of CTC)",
  },
  {
    id: "comp-hra",
    name: "House Rent Allowance",
    code: "HRA",
    type: "earning",
    calculationType: "percentage_of_ctc",
    value: 20,
    isTaxable: true,
    isStatutory: false,
    description: "Housing allowance (Standard 20% of CTC)",
  },
  {
    id: "comp-special",
    name: "Special Allowance",
    code: "SPECIAL",
    type: "earning",
    calculationType: "percentage_of_ctc",
    value: 15,
    isTaxable: true,
    isStatutory: false,
    description: "Flexible performance & organizational allowance",
  },
  {
    id: "comp-conveyance",
    name: "Conveyance / Transport Allowance",
    code: "CONVEYANCE",
    type: "earning",
    calculationType: "percentage_of_ctc",
    value: 5,
    isTaxable: false,
    isStatutory: false,
    description: "Commute & local travel reimbursement",
  },
  {
    id: "comp-medical",
    name: "Medical Allowance",
    code: "MEDICAL",
    type: "earning",
    calculationType: "percentage_of_ctc",
    value: 5,
    isTaxable: false,
    isStatutory: false,
    description: "Health & outpatient reimbursement allowance",
  },
  {
    id: "comp-other-allowance",
    name: "Other Supplementary Allowances",
    code: "OTHER_ALLOW",
    type: "earning",
    calculationType: "percentage_of_ctc",
    value: 5,
    isTaxable: true,
    isStatutory: false,
    description: "Discretionary perks & variable components",
  },
  // Deductions
  {
    id: "comp-pf",
    name: "Provident Fund (PF - Employee)",
    code: "PF",
    type: "deduction",
    calculationType: "percentage_of_basic",
    value: 12,
    isTaxable: false,
    isStatutory: true,
    description: "Statutory employee retirement contribution (12% of Basic)",
  },
  {
    id: "comp-esi",
    name: "Employee State Insurance (ESI)",
    code: "ESI",
    type: "deduction",
    calculationType: "statutory_esi",
    value: 0.75,
    isTaxable: false,
    isStatutory: true,
    description: "Statutory health coverage (0.75% of Gross if Gross <= ₹21,000)",
  },
  {
    id: "comp-pt",
    name: "Professional Tax (PT)",
    code: "PT",
    type: "deduction",
    calculationType: "fixed_amount",
    value: 200,
    isTaxable: false,
    isStatutory: true,
    description: "State government professional employment tax (₹200 / month)",
  },
  {
    id: "comp-tds",
    name: "Tax Deducted at Source (TDS / Income Tax)",
    code: "TDS",
    type: "deduction",
    calculationType: "percentage_of_gross",
    value: 5,
    isTaxable: false,
    isStatutory: true,
    description: "Withholding tax deducted on taxable compensation brackets",
  },
];

// Standard default salary structure templates
const DEFAULT_SALARY_STRUCTURES = [
  {
    id: "struct-corporate-std",
    name: "Standard Corporate Structure (50-20-15-5-5-5)",
    description: "Standard CTC breakdown for full-time executive and managerial personnel.",
    isDefault: true,
    components: [
      { code: "BASIC", percentage: 50 },
      { code: "HRA", percentage: 20 },
      { code: "SPECIAL", percentage: 15 },
      { code: "CONVEYANCE", percentage: 5 },
      { code: "MEDICAL", percentage: 5 },
      { code: "OTHER_ALLOW", percentage: 5 },
      { code: "PF", percentage: 12, on: "BASIC" },
      { code: "ESI", percentage: 0.75, on: "GROSS_ELIGIBLE" },
      { code: "PT", fixed: 200 },
    ],
  },
  {
    id: "struct-tech-engineering",
    name: "Tech & Engineering High-Gross Structure",
    description: "Optimized for software engineering & technical staff with higher special allowance.",
    isDefault: false,
    components: [
      { code: "BASIC", percentage: 40 },
      { code: "HRA", percentage: 25 },
      { code: "SPECIAL", percentage: 25 },
      { code: "CONVEYANCE", percentage: 5 },
      { code: "MEDICAL", percentage: 5 },
      { code: "PF", percentage: 12, on: "BASIC" },
      { code: "PT", fixed: 200 },
    ],
  },
  {
    id: "struct-sales-variable",
    name: "Sales & Field Executive Structure",
    description: "Designed for business development and sales teams with travel & incentive allowances.",
    isDefault: false,
    components: [
      { code: "BASIC", percentage: 45 },
      { code: "HRA", percentage: 20 },
      { code: "CONVEYANCE", percentage: 15 },
      { code: "SPECIAL", percentage: 10 },
      { code: "MEDICAL", percentage: 10 },
      { code: "PF", percentage: 12, on: "BASIC" },
      { code: "ESI", percentage: 0.75, on: "GROSS_ELIGIBLE" },
      { code: "PT", fixed: 200 },
    ],
  },
];

// Helper: Get or initialize tenant payroll configuration store
async function getTenantPayrollConfig(tenantId: string) {
  const slug = `payroll-config-${tenantId}`;
  let page = await prisma.cmsPage.findUnique({ where: { slug } });
  if (!page) {
    page = await prisma.cmsPage.create({
      data: {
        slug,
        title: `Payroll Configuration for Tenant ${tenantId}`,
        content: {
          components: DEFAULT_SALARY_COMPONENTS,
          structures: DEFAULT_SALARY_STRUCTURES,
          currency: "INR",
          currencySymbol: "₹",
          ptFlatAmount: 200,
          pfEmployeeRate: 12,
          esiEmployeeRate: 0.75,
          esiGrossThreshold: 21000,
          tdsDefaultPercentage: 5,
        },
      },
    });
  }
  return page.content as any;
}

// Helper: Save tenant payroll configuration
async function saveTenantPayrollConfig(tenantId: string, content: any) {
  const slug = `payroll-config-${tenantId}`;
  return await prisma.cmsPage.upsert({
    where: { slug },
    create: {
      slug,
      title: `Payroll Configuration for Tenant ${tenantId}`,
      content,
    },
    update: {
      content,
      updatedAt: new Date(),
    },
  });
}

// ==========================================
// 1. SALARY COMPONENTS ENDPOINTS
// ==========================================

// GET /api/payroll/salary-components
payrollRouter.get("/salary-components", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const config = await getTenantPayrollConfig(tenantId);
    return res.json(config.components || DEFAULT_SALARY_COMPONENTS);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/payroll/salary-components
payrollRouter.post("/salary-components", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const { name, code, type, calculationType, value, isTaxable, isStatutory, description } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: "Name and type (earning/deduction) are required." });
    }

    const config = await getTenantPayrollConfig(tenantId);
    const components = Array.isArray(config.components) ? config.components : [...DEFAULT_SALARY_COMPONENTS];

    const newComp = {
      id: `comp-${crypto.randomUUID()}`,
      name: String(name).trim(),
      code: String(code || name.replace(/\s+/g, "_").toUpperCase()).trim(),
      type: type === "deduction" ? "deduction" : "earning",
      calculationType: calculationType || "percentage_of_ctc",
      value: Number(value || 0),
      isTaxable: Boolean(isTaxable),
      isStatutory: Boolean(isStatutory),
      description: description ? String(description).trim() : "",
    };

    components.push(newComp);
    config.components = components;
    await saveTenantPayrollConfig(tenantId, config);

    return res.status(201).json(newComp);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// PUT /api/payroll/salary-components/:id
payrollRouter.put("/salary-components/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const { id } = req.params;
    const { name, code, type, calculationType, value, isTaxable, isStatutory, description } = req.body;

    const config = await getTenantPayrollConfig(tenantId);
    let components = Array.isArray(config.components) ? config.components : [...DEFAULT_SALARY_COMPONENTS];

    const index = components.findIndex((c: any) => c.id === id || c.code === id);
    if (index === -1) {
      return res.status(404).json({ error: "Salary component not found." });
    }

    components[index] = {
      ...components[index],
      ...(name && { name: String(name).trim() }),
      ...(code && { code: String(code).trim() }),
      ...(type && { type }),
      ...(calculationType && { calculationType }),
      ...(value !== undefined && { value: Number(value) }),
      ...(isTaxable !== undefined && { isTaxable: Boolean(isTaxable) }),
      ...(isStatutory !== undefined && { isStatutory: Boolean(isStatutory) }),
      ...(description !== undefined && { description: String(description).trim() }),
    };

    config.components = components;
    await saveTenantPayrollConfig(tenantId, config);

    return res.json(components[index]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// DELETE /api/payroll/salary-components/:id
payrollRouter.delete("/salary-components/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const { id } = req.params;
    const config = await getTenantPayrollConfig(tenantId);
    let components = Array.isArray(config.components) ? config.components : [...DEFAULT_SALARY_COMPONENTS];

    components = components.filter((c: any) => c.id !== id && c.code !== id);
    config.components = components;
    await saveTenantPayrollConfig(tenantId, config);

    return res.json({ success: true, message: "Salary component removed." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// ==========================================
// 2. SALARY STRUCTURES ENDPOINTS
// ==========================================

// GET /api/payroll/salary-structures
payrollRouter.get("/salary-structures", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const config = await getTenantPayrollConfig(tenantId);
    return res.json(config.structures || DEFAULT_SALARY_STRUCTURES);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/payroll/salary-structures
payrollRouter.post("/salary-structures", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const { name, description, isDefault, components } = req.body;
    if (!name) return res.status(400).json({ error: "Structure template name is required." });

    const config = await getTenantPayrollConfig(tenantId);
    let structures = Array.isArray(config.structures) ? config.structures : [...DEFAULT_SALARY_STRUCTURES];

    if (isDefault) {
      structures = structures.map((s: any) => ({ ...s, isDefault: false }));
    }

    const newStruct = {
      id: `struct-${crypto.randomUUID()}`,
      name: String(name).trim(),
      description: description ? String(description).trim() : "",
      isDefault: Boolean(isDefault),
      components: components || [
        { code: "BASIC", percentage: 50 },
        { code: "HRA", percentage: 20 },
        { code: "SPECIAL", percentage: 15 },
        { code: "CONVEYANCE", percentage: 5 },
        { code: "MEDICAL", percentage: 5 },
        { code: "PF", percentage: 12, on: "BASIC" },
        { code: "PT", fixed: 200 },
      ],
    };

    structures.push(newStruct);
    config.structures = structures;
    await saveTenantPayrollConfig(tenantId, config);

    return res.status(201).json(newStruct);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// PUT /api/payroll/salary-structures/:id
payrollRouter.put("/salary-structures/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const { id } = req.params;
    const { name, description, isDefault, components } = req.body;

    const config = await getTenantPayrollConfig(tenantId);
    let structures = Array.isArray(config.structures) ? config.structures : [...DEFAULT_SALARY_STRUCTURES];

    const index = structures.findIndex((s: any) => s.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Salary structure not found." });
    }

    if (isDefault) {
      structures = structures.map((s: any) => ({ ...s, isDefault: false }));
    }

    structures[index] = {
      ...structures[index],
      ...(name && { name: String(name).trim() }),
      ...(description !== undefined && { description: String(description).trim() }),
      ...(isDefault !== undefined && { isDefault: Boolean(isDefault) }),
      ...(components !== undefined && { components }),
    };

    config.structures = structures;
    await saveTenantPayrollConfig(tenantId, config);

    return res.json(structures[index]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// DELETE /api/payroll/salary-structures/:id
payrollRouter.delete("/salary-structures/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const { id } = req.params;
    const config = await getTenantPayrollConfig(tenantId);
    let structures = Array.isArray(config.structures) ? config.structures : [...DEFAULT_SALARY_STRUCTURES];

    structures = structures.filter((s: any) => s.id !== id);
    config.structures = structures;
    await saveTenantPayrollConfig(tenantId, config);

    return res.json({ success: true, message: "Salary structure deleted." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// ==========================================
// 3. PAYROLL RUNS & ADVANCED RUN ENGINE
// ==========================================

// GET /api/payroll/runs
payrollRouter.get("/runs", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const runs = await prisma.payrollRun.findMany({
      where: { tenantId },
      include: {
        _count: { select: { payslips: true } },
      },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    });

    return res.json(runs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// PATCH /api/payroll/runs/:id/status
payrollRouter.patch("/runs/:id/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const { id } = req.params;
    const { status } = req.body;

    const run = await prisma.payrollRun.update({
      where: { id },
      data: { status },
      include: { _count: { select: { payslips: true } } },
    });

    broadcastToTenant(tenantId, "payroll:updated", run);
    return res.json(run);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/payroll/generate (Advanced Attendance-Integrated Payroll Engine)
payrollRouter.post("/generate", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const now = new Date();
    const periodMonth = Number(req.body.periodMonth ?? now.getMonth() + 1);
    const periodYear = Number(req.body.periodYear ?? now.getFullYear());
    const includeAttendance = req.body.includeAttendance !== false; // Default true

    // 1. Fetch active employees
    const activeEmployees = await prisma.employee.findMany({
      where: { tenantId, status: "active" },
      include: {
        department: { select: { name: true } },
      },
    });

    if (activeEmployees.length === 0) {
      return res.status(400).json({ error: "No active employees found to process payroll." });
    }

    // 2. Fetch tenant payroll config
    const config = await getTenantPayrollConfig(tenantId);
    const ptAmount = Number(config.ptFlatAmount || 200);
    const pfRate = Number(config.pfEmployeeRate || 12);
    const esiRate = Number(config.esiEmployeeRate || 0.75);
    const esiThreshold = Number(config.esiGrossThreshold || 21000);

    // 3. Compute Month Working Days (Excluding Sundays)
    const daysInMonth = new Date(periodYear, periodMonth, 0).getDate();
    let totalWorkingDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(periodYear, periodMonth - 1, day);
      if (d.getDay() !== 0) totalWorkingDays++; // Exclude Sunday
    }
    if (totalWorkingDays === 0) totalWorkingDays = 26;

    // Date range for attendance queries (UTC Midnight normalization)
    const startDate = new Date(Date.UTC(periodYear, periodMonth - 1, 1));
    const endDate = new Date(Date.UTC(periodYear, periodMonth, 0, 23, 59, 59));

    // Fetch month attendance records if enabled
    const allAttendance = includeAttendance
      ? await prisma.attendance.findMany({
          where: {
            tenantId,
            date: { gte: startDate, lte: endDate },
          },
        })
      : [];

    // Fetch approved leave requests in this month
    const allLeaves = includeAttendance
      ? await prisma.leaveRequest.findMany({
          where: {
            tenantId,
            status: "approved",
            OR: [
              { startDate: { lte: endDate }, endDate: { gte: startDate } },
            ],
          },
          include: { leaveType: true },
        })
      : [];

    // 4. Find or Create Payroll Run
    let payrollRun = await prisma.payrollRun.findFirst({
      where: { tenantId, periodMonth, periodYear },
    });

    if (payrollRun) {
      // Clear old payslips for re-generation
      await prisma.payslip.deleteMany({ where: { payrollRunId: payrollRun.id } });
      await prisma.payrollRun.update({
        where: { id: payrollRun.id },
        data: { status: "processing" },
      });
    } else {
      payrollRun = await prisma.payrollRun.create({
        data: {
          tenantId,
          periodMonth,
          periodYear,
          status: "processing",
        },
      });
    }

    let totalPayrollAmount = 0;
    let totalNetDisbursed = 0;
    const generatedPayslips = [];

    // 5. Generate Individual Granular Payslips
    for (const emp of activeEmployees) {
      const baseMonthlySalary = Number(emp.salary) || 35000;

      // Attendance Metrics Calculation
      let presentDays = totalWorkingDays;
      let halfDays = 0;
      let approvedLeaveDays = 0;
      let lateCount = 0;

      if (includeAttendance) {
        const empAttendance = allAttendance.filter((a) => a.employeeId === emp.id);
        const presentPunches = empAttendance.filter((a) => a.status === "present" || a.status === "late");
        const halfDayPunches = empAttendance.filter((a) => a.status === "half_day");
        lateCount = empAttendance.filter((a) => a.status === "late").length;

        const empLeaves = allLeaves.filter((l) => l.employeeId === emp.id);
        approvedLeaveDays = empLeaves.reduce((acc, l) => acc + (l.days || 0), 0);

        presentDays = presentPunches.length;
        halfDays = halfDayPunches.length;
      }

      const payableDays = Math.min(
        totalWorkingDays,
        Math.round((presentDays + halfDays * 0.5 + approvedLeaveDays) * 10) / 10
      );
      const lopDays = Math.max(0, Math.round((totalWorkingDays - payableDays) * 10) / 10);
      const prorationFactor = totalWorkingDays > 0 ? payableDays / totalWorkingDays : 1;

      // Base Earnings Calculation (50-20-15-5-5-5 Formula)
      const earnedGross = Math.round(baseMonthlySalary * prorationFactor * 100) / 100;
      const basicSalary = Math.round(earnedGross * 0.5 * 100) / 100;
      const hra = Math.round(earnedGross * 0.2 * 100) / 100;
      const specialAllowance = Math.round(earnedGross * 0.15 * 100) / 100;
      const conveyance = Math.round(earnedGross * 0.05 * 100) / 100;
      const medical = Math.round(earnedGross * 0.05 * 100) / 100;
      const otherAllowance = Math.round((earnedGross - (basicSalary + hra + specialAllowance + conveyance + medical)) * 100) / 100;

      // Statutory & Tax Deductions
      const providentFund = Math.round(basicSalary * (pfRate / 100) * 100) / 100;
      const esi = earnedGross <= esiThreshold ? Math.round(earnedGross * (esiRate / 100) * 100) / 100 : 0;
      const professionalTax = payableDays > 0 ? ptAmount : 0;

      // TDS withholding: progressive estimation if annual > 5 Lakhs
      const projectedAnnual = earnedGross * 12;
      const tds = projectedAnnual > 500000 ? Math.round(earnedGross * 0.05 * 100) / 100 : 0;

      const totalDeductions = Math.round((providentFund + esi + professionalTax + tds) * 100) / 100;
      const netSalary = Math.max(0, Math.round((earnedGross - totalDeductions) * 100) / 100);

      totalPayrollAmount += earnedGross;
      totalNetDisbursed += netSalary;

      const breakdown = {
        baseMonthlyCtc: baseMonthlySalary,
        totalWorkingDays,
        payableDays,
        presentDays,
        halfDays,
        approvedLeaveDays,
        lossOfPayDays: lopDays,
        prorationFactor: Math.round(prorationFactor * 100) / 100,
        earnings: {
          basicSalary,
          hra,
          specialAllowance,
          conveyance,
          medical,
          otherAllowance: Math.max(0, otherAllowance),
          totalGross: earnedGross,
        },
        deductions: {
          providentFund,
          esi,
          professionalTax,
          tds,
          totalDeductions,
        },
        netPay: netSalary,
        currency: config.currency || "INR",
        currencySymbol: config.currencySymbol || "₹",
      };

      const slip = await prisma.payslip.create({
        data: {
          tenantId,
          payrollRunId: payrollRun.id,
          employeeId: emp.id,
          periodMonth,
          periodYear,
          grossSalary: earnedGross,
          deductions: totalDeductions,
          netSalary,
          breakdown,
        },
      });

      generatedPayslips.push(slip);
    }

    // 6. Complete and Lock Payroll Run
    const completedRun = await prisma.payrollRun.update({
      where: { id: payrollRun.id },
      data: {
        totalAmount: totalPayrollAmount,
        status: "completed",
        processedAt: new Date(),
      },
      include: {
        _count: { select: { payslips: true } },
      },
    });

    broadcastToTenant(tenantId, "payroll:updated", completedRun);
    broadcastToTenant(tenantId, "notification:new", {
      title: `Payroll Run Generated (${periodMonth}/${periodYear})`,
      description: `Payroll processed for ${activeEmployees.length} employees. Total Net Payout: ₹${totalNetDisbursed.toLocaleString("en-IN")}`,
      type: "payroll",
      timestamp: new Date().toISOString(),
    });

    return res.status(201).json({
      run: completedRun,
      employeeCount: activeEmployees.length,
      totalGross: totalPayrollAmount,
      totalNet: totalNetDisbursed,
    });
  } catch (err: any) {
    console.error("[POST /api/payroll/generate] error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// GET /api/payroll/payslips
payrollRouter.get("/payslips", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const { employeeId, runId, month, year } = req.query;
    const where: any = { tenantId };

    if (employeeId) where.employeeId = String(employeeId);
    if (runId) where.payrollRunId = String(runId);
    if (month) where.periodMonth = Number(month);
    if (year) where.periodYear = Number(year);

    const payslips = await prisma.payslip.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            position: true,
            salary: true,
            department: { select: { name: true } },
          },
        },
        payrollRun: true,
      },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    });

    return res.json(payslips);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// GET /api/payroll/payslips/:id
payrollRouter.get("/payslips/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });

    const { id } = req.params;
    const payslip = await prisma.payslip.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            position: true,
            salary: true,
            department: { select: { name: true } },
          },
        },
        payrollRun: true,
        tenant: {
          select: {
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!payslip || payslip.tenantId !== tenantId) {
      return res.status(404).json({ error: "Payslip not found." });
    }

    return res.json(payslip);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});
