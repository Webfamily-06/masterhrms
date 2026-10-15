import { describe, it, expect, vi, beforeEach } from "vitest";
import { UnifiedCatalogService, CANONICAL_CATALOG_REGISTRY } from "../../server/src/services/unified-catalog.service";
import { buildCommercePricingConfig } from "../../server/src/config/commerce-pricing.config";
import { ADDON_ALIASES, ROUTE_ENTITLEMENT_MAP } from "../lib/navigation-resolver";
import { ROUTE_BREADCRUMBS } from "../lib/breadcrumb-registry";
import { SmartDashboardService } from "../../server/src/services/smart-dashboard.service";
import { SmartReportsService } from "../../server/src/services/smart-reports.service";
import { AiBusinessAdvisorService } from "../../server/src/services/ai-business-advisor.service";

// Mock prisma for isolated service unit tests
vi.mock("../../server/src/prisma", () => {
  const mockPrisma = {
    sale: {
      findMany: vi.fn().mockResolvedValue([
        { id: "sale-1", total: 1500, paidAmount: 1500, date: new Date(), type: "pos", paymentStatus: "paid", customerName: "Acme Corp" },
        { id: "sale-2", total: 3500, paidAmount: 2000, date: new Date(), type: "invoice", paymentStatus: "partial", customerName: "Globex" },
      ]),
      count: vi.fn().mockResolvedValue(2),
      aggregate: vi.fn().mockResolvedValue({ _sum: { total: 5000, paidAmount: 3500 }, _count: 2 }),
      groupBy: vi.fn().mockResolvedValue([{ paymentStatus: "paid", _count: 1, _sum: { total: 1500 } }]),
    },
    purchase: {
      findMany: vi.fn().mockResolvedValue([
        { id: "pur-1", total: 1200, paidAmount: 1200, date: new Date(), paymentStatus: "paid", supplier: { name: "Supplier A" } },
      ]),
      count: vi.fn().mockResolvedValue(1),
      aggregate: vi.fn().mockResolvedValue({ _sum: { total: 1200, paidAmount: 1200 }, _count: 1 }),
      groupBy: vi.fn().mockResolvedValue([{ paymentStatus: "paid", _count: 1, _sum: { total: 1200 } }]),
    },
    payslip: {
      findMany: vi.fn().mockResolvedValue([
        { id: "pay-1", grossSalary: 2500, deductions: 200, netSalary: 2300, periodMonth: 10, periodYear: 2026, status: "published", employee: { id: "e1", firstName: "Jane", lastName: "Doe", employeeCode: "EMP01", department: { name: "Engineering" } } },
      ]),
      count: vi.fn().mockResolvedValue(1),
      aggregate: vi.fn().mockResolvedValue({ _sum: { grossSalary: 2500, deductions: 200, netSalary: 2300 }, _count: 1 }),
    },
    employee: {
      count: vi.fn().mockImplementation(({ where }) => Promise.resolve(where?.status === "active" ? 15 : 2)),
      findMany: vi.fn().mockResolvedValue([
        { id: "e1", firstName: "Jane", lastName: "Doe", designation: "Lead Engineer", status: "active" },
      ]),
    },
    department: {
      count: vi.fn().mockResolvedValue(3),
    },
    project: {
      count: vi.fn().mockResolvedValue(4),
      findMany: vi.fn().mockResolvedValue([
        { id: "prj-1", name: "ERP Upgrade", budget: 20000, progress: 75, status: "active", tasks: [{ id: "t1", status: "completed" }, { id: "t2", status: "pending" }], milestones: [{ id: "m1", cost: 5000 }] },
      ]),
      aggregate: vi.fn().mockResolvedValue({ _sum: { budget: 20000 }, _count: 4, _avg: { progress: 75 } }),
      groupBy: vi.fn().mockResolvedValue([{ status: "active", _count: 4 }]),
    },
    crmDeal: {
      count: vi.fn().mockResolvedValue(5),
      findMany: vi.fn().mockResolvedValue([
        { id: "d1", name: "SaaS Enterprise", value: 12000, stage: "won", closeDate: new Date(), createdAt: new Date() },
        { id: "d2", name: "Consulting", value: 4000, stage: "proposal", closeDate: new Date(), createdAt: new Date() },
      ]),
      aggregate: vi.fn().mockResolvedValue({ _sum: { value: 16000 }, _count: 2, _avg: { probability: 70 } }),
      groupBy: vi.fn().mockResolvedValue([{ stage: "won", _count: 1, _sum: { value: 12000 } }]),
    },
    crmLead: {
      count: vi.fn().mockResolvedValue(8),
      findMany: vi.fn().mockResolvedValue([
        { id: "l1", stage: "converted", source: "Website" },
        { id: "l2", stage: "new", source: "Referral" },
      ]),
    },
    crmProposal: {
      findMany: vi.fn().mockResolvedValue([{ id: "p1", status: "accepted" }]),
    },
    customer: {
      findMany: vi.fn().mockResolvedValue([{ id: "c1", name: "Acme Corp" }]),
    },
    supplier: {
      findMany: vi.fn().mockResolvedValue([{ id: "s1", name: "Supplier A" }]),
    },
    product: {
      count: vi.fn().mockResolvedValue(45),
      findMany: vi.fn().mockResolvedValue([
        { id: "prd-1", name: "Thermal Printer", sku: "PRN-01", purchasePrice: 120, salePrice: 199, lowStockThreshold: 2, category: { name: "Hardware" } },
      ]),
    },
    productWarehouse: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { quantity: 50 }, _count: 5 }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    attendance: {
      count: vi.fn().mockResolvedValue(350),
      findMany: vi.fn().mockResolvedValue([
        { id: "att-1", date: new Date(), status: "present", checkIn: new Date(), checkOut: new Date(), hours: 8, employee: { id: "e1", firstName: "Jane", lastName: "Doe", employeeCode: "EMP01", department: { name: "Engineering" } } },
      ]),
      groupBy: vi.fn().mockResolvedValue([{ status: "present", _count: 300 }]),
      aggregate: vi.fn().mockResolvedValue({ _sum: { hours: 2400, overtimeMinutes: 120 } }),
    },
    leaveRequest: {
      count: vi.fn().mockResolvedValue(12),
      findMany: vi.fn().mockResolvedValue([
        { id: "lr-1", status: "approved", startDate: new Date(), endDate: new Date(), days: 2, reason: "Vacation", employee: { id: "e1", firstName: "Jane", lastName: "Doe", employeeCode: "EMP01", department: { name: "Engineering" } }, leaveType: { name: "Paid Leave" } },
      ]),
      groupBy: vi.fn().mockResolvedValue([{ status: "approved", _count: 10 }, { status: "pending", _count: 2 }]),
      aggregate: vi.fn().mockResolvedValue({ _sum: { days: 20 } }),
    },
    journalEntry: {
      findMany: vi.fn().mockResolvedValue([
        { id: "j-1", entryNumber: "JE-001", entryDate: new Date(), reference: "INV-001", description: "Sales Posting", status: "posted", items: [{ debit: 1000, credit: 0 }, { debit: 0, credit: 1000 }] },
      ]),
    },
    setting: {
      findFirst: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockImplementation(({ create }) => Promise.resolve({ id: "set-1", ...create })),
      update: vi.fn().mockResolvedValue({ id: "set-1" }),
    },
    tenantSubscription: {
      findFirst: vi.fn().mockResolvedValue({ id: "sub-1", status: "active", plan: { id: "sovereign", name: "Enterprise Sovereign" } }),
    },
    tenantModule: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    tenantAddon: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  };
  return { rawPrisma: mockPrisma, prisma: mockPrisma };
});

describe("Three Add-ons End-to-End Implementation Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Catalog Definitions & Navigation Contracts", () => {
    it("should register Smart Dashboard Analytics with standalone_with_submenu and 4 sub-routes", () => {
      const allAddons = CANONICAL_CATALOG_REGISTRY;
      const smartDashboard = allAddons.find((a) => a.slug === "smart-dashboard");

      expect(smartDashboard).toBeDefined();
      expect(smartDashboard?.navigationMode).toBe("standalone_with_submenu");
      expect(smartDashboard?.navigationRoute).toBe("/smart-dashboard");
      expect(smartDashboard?.navigationChildren).toHaveLength(4);
      expect(smartDashboard?.navigationChildren?.map((c) => c.label)).toEqual([
        "Executive Overview",
        "Financial Analytics",
        "Sales & Customer",
        "Operational Analytics",
      ]);
    });

    it("should register Smart Reports with standalone mode", () => {
      const allAddons = CANONICAL_CATALOG_REGISTRY;
      const smartReports = allAddons.find((a) => a.slug === "smart-reports");

      expect(smartReports).toBeDefined();
      expect(smartReports?.navigationMode).toBe("standalone");
      expect(smartReports?.navigationRoute).toBe("/smart-reports");
    });

    it("should register AI Business Advisor with standalone mode in AI category", () => {
      const allAddons = CANONICAL_CATALOG_REGISTRY;
      const advisor = allAddons.find((a) => a.slug === "ai-business-advisor");

      expect(advisor).toBeDefined();
      expect(advisor?.navigationMode).toBe("standalone");
      expect(advisor?.navigationRoute).toBe("/ai-business-advisor");
      expect(advisor?.category).toBe("AI");
    });

    it("should correctly resolve aliases and route entitlement mappings for all 3 add-ons", () => {
      expect(ADDON_ALIASES["smart-dashboard"]).toContain("smart-dashboard");
      expect(ADDON_ALIASES["smart-reports"]).toContain("smart-reports");
      expect(ADDON_ALIASES["ai-business-advisor"]).toContain("ai-business-advisor");

      expect(ROUTE_ENTITLEMENT_MAP["/smart-dashboard"]).toBe("smart-dashboard");
      expect(ROUTE_ENTITLEMENT_MAP["/smart-reports"]).toBe("smart-reports");
      expect(ROUTE_ENTITLEMENT_MAP["/ai-business-advisor"]).toBe("ai-business-advisor");
    });

    it("should configure free tier pricing for all 3 add-ons in commerce config", () => {
      const config = buildCommercePricingConfig({ allowUnapprovedDefaults: true });
      expect(config.products["smart-dashboard"]).toEqual({ monthly: 0, annual: 0 });
      expect(config.products["smart-reports"]).toEqual({ monthly: 0, annual: 0 });
      expect(config.products["ai-business-advisor"]).toEqual({ monthly: 0, annual: 0 });
    });
  });

  describe("2. Breadcrumb Registry Verification", () => {
    it("should contain authoritative breadcrumb mappings for all 3 add-on routes", () => {
      expect(ROUTE_BREADCRUMBS["/smart-dashboard"]).toEqual([
        { label: "Dashboard", href: "/hrm-dashboard" },
        { label: "Smart Dashboard Analytics" },
      ]);

      expect(ROUTE_BREADCRUMBS["/smart-reports"]).toEqual([
        { label: "Dashboard", href: "/hrm-dashboard" },
        { label: "Smart Reports" },
      ]);

      expect(ROUTE_BREADCRUMBS["/ai-business-advisor"]).toEqual([
        { label: "Dashboard", href: "/hrm-dashboard" },
        { label: "AI Center", href: "/ai" },
        { label: "AI Business Advisor" },
      ]);
    });
  });

  describe("3. Smart Dashboard Service Aggregations", () => {
    it("should aggregate Executive Overview with summary cards and trend metrics", async () => {
      const overview = await SmartDashboardService.getExecutiveOverview("test-tenant");

      expect(overview.summaryCards.monthlyRevenue).toBeDefined();
      expect(overview.summaryCards.netSummary).toBeDefined();
      expect(overview.summaryCards.totalEmployees).toBeDefined();
      expect(overview.summaryCards.totalProjects).toBeDefined();
      expect(overview.quickInsights).toBeInstanceOf(Array);
      expect(overview.moduleSummaries).toBeDefined();
      expect(overview.moduleSummaries.hrm).toBeDefined();
      expect(overview.topCustomers).toBeInstanceOf(Array);
      expect(overview.recentTransactions).toBeInstanceOf(Array);
    });

    it("should calculate Financial Analytics with AR, AP, 90d cash flow and journal entries", async () => {
      const financial = await SmartDashboardService.getFinancialAnalytics("test-tenant");

      expect(financial.profitability.grossRevenue).toBe(5000);
      expect(financial.profitability.costOfGoods).toBe(1200);
      expect(financial.profitability.grossProfit).toBe(3800);
      expect(financial.cashFlow.accountsReceivable).toBe(1500); // 3500 - 2000
      expect(financial.cashFlow.cashInflow90d).toBe(3500); // 1500 + 2000
      expect(financial.journalEntries).toHaveLength(1);
      expect(financial.journalEntries[0].totalDebit).toBe(1000);
    });

    it("should calculate Sales & Customer Analytics including deals win rate", async () => {
      const sales = await SmartDashboardService.getSalesCustomerAnalytics("test-tenant");

      expect(sales.crm!.totalLeads).toBe(2);
      expect(sales.crm!.convertedLeads).toBe(1);
      expect(sales.crm!.conversionRate).toBe(50);
      expect(sales.deals!.totalDeals).toBe(2);
      expect(sales.deals!.wonDealsCount).toBe(1);
      expect(sales.deals!.winRate).toBe(50);
      expect(sales.comparison!.totalSales).toBe(5000);
      expect(sales.comparison!.totalPurchases).toBe(1200);
    });

    it("should calculate Operational Analytics with inventory, POS and project metrics", async () => {
      const ops = await SmartDashboardService.getOperationalAnalytics("test-tenant");

      expect(ops.inventory!.totalSKUs).toBe(1);
      expect(ops.inventory!.totalStockValue).toBe(120);
      expect(ops.pos!.totalOrders).toBe(2);
      expect(ops.projects!.total).toBe(1);
      expect(ops.projects!.completedTasks).toBe(1);
    });
  });

  describe("4. Smart Reports Catalogue & Report Types", () => {
    it("should return all 8 report catalogue definitions with live counts", async () => {
      const catalogue = await SmartReportsService.getCatalogueOverview("test-tenant");

      expect(catalogue).toHaveLength(8);
      const reportIds = catalogue.map((r) => r.id);
      expect(reportIds).toEqual([
        "attendance-summary",
        "payroll-sheet",
        "leave-report",
        "sales-invoice",
        "purchase-invoice",
        "deal-pipeline",
        "product-stock",
        "project-progress",
      ]);
    });

    it("should return Attendance Summary report with metrics and records", async () => {
      const res = await SmartReportsService.getAttendanceSummary("test-tenant");
      expect(res.metrics.totalEmployees).toBeDefined();
      expect(res.metrics.attendanceRate).toBeDefined();
      expect(res.records[0].employeeName).toBe("Jane Doe");
      expect(res.records[0].workHours).toBe(8);
    });

    it("should return Payroll Sheet report with gross, deductions, and net salary", async () => {
      const res = await SmartReportsService.getPayrollSheet("test-tenant");
      expect(res.metrics.grossPay).toBeDefined();
      expect(res.metrics.deductions).toBeDefined();
      expect(res.metrics.netPay).toBeDefined();
    });

    it("should return Leave Report with approved and pending counts", async () => {
      const res = await SmartReportsService.getLeaveReport("test-tenant");
      expect(res.metrics.totalApplications).toBeDefined();
      expect(res.metrics.approved).toBeDefined();
      expect(res.records[0].leaveType).toBe("Paid Leave");
    });
  });

  describe("5. AI Business Advisor Health Scoring & Lifecycle", () => {
    it("should calculate weighted health scores according to specification", async () => {
      const scores = await AiBusinessAdvisorService.calculateHealthScores("test-tenant");

      expect(scores.overall).toBeGreaterThanOrEqual(0);
      expect(scores.overall).toBeLessThanOrEqual(100);
      expect(scores.financial).toBeGreaterThan(0);
      expect(scores.sales).toBeGreaterThan(0);
      expect(scores.team).toBeGreaterThan(0);
      expect(scores.projects).toBeGreaterThan(0);
      expect(scores.operations).toBeGreaterThan(0);

      // Verify exact documented weights: 30% Fin, 25% Sales, 20% Team, 15% Prj, 10% Ops
      const expectedOverall = Math.round(
        scores.financial * 0.30 +
        scores.sales * 0.25 +
        scores.team * 0.20 +
        scores.projects * 0.15 +
        scores.operations * 0.10
      );
      expect(scores.overall).toBe(expectedOverall);
    });

    it("should generate daily analysis with 7-day score history and actionable findings", async () => {
      const analysis = await AiBusinessAdvisorService.getOrGenerateDailyAnalysis("test-tenant", "2026-10-13", true);

      expect(analysis.tenantId).toBe("test-tenant");
      expect(analysis.date).toBe("2026-10-13");
      expect(analysis.scoreHistory7Days).toHaveLength(7);
      expect(["improving", "stable", "declining"]).toContain(analysis.trend);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
      expect(analysis.insights.length).toBeGreaterThan(0);
    });
  });
});
