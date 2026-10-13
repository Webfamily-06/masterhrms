import { describe, it, expect, vi, beforeEach } from "vitest";
import { SmartDashboardService, DashboardCapabilities } from "../../server/src/services/smart-dashboard.service";
import * as entitlements from "../../server/src/middleware/entitlements";

// Mock prisma for isolated service unit tests
const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    sale: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    purchase: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    payslip: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    employee: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
    },
    department: {
      count: vi.fn().mockResolvedValue(0),
    },
    project: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
    },
    crmDeal: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
    },
    crmLead: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
    },
    crmProposal: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    customer: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    supplier: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    product: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
    },
    attendance: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
    },
    journalEntry: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    tenantModule: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    tenantAddon: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    tenantSubscription: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  };
  return { mockPrisma };
});

vi.mock("../../server/src/prisma", () => {
  return {
    rawPrisma: mockPrisma,
    prisma: mockPrisma,
  };
});

describe("MASTERHRMS — Workspace-Aware Smart Dashboard & Entitlement Matrix", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    mockPrisma.sale.findMany.mockResolvedValue([]);
    mockPrisma.purchase.findMany.mockResolvedValue([]);
    mockPrisma.payslip.findMany.mockResolvedValue([]);
    mockPrisma.employee.findMany.mockResolvedValue([]);
    mockPrisma.employee.count.mockResolvedValue(0);
    mockPrisma.project.findMany.mockResolvedValue([]);
    mockPrisma.project.count.mockResolvedValue(0);
    mockPrisma.crmDeal.findMany.mockResolvedValue([]);
    mockPrisma.crmLead.findMany.mockResolvedValue([]);
    mockPrisma.customer.findMany.mockResolvedValue([]);
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);
    mockPrisma.attendance.count.mockResolvedValue(0);
    mockPrisma.journalEntry.findMany.mockResolvedValue([]);
  });

  describe("1. Authoritative Workspace Capability Resolver", () => {
    it("Scenario 1: Workspace with no optional add-ons (Core HRMS only)", async () => {
      vi.spyOn(entitlements, "checkTenantEntitlement").mockImplementation(async (tenantId, key) => {
        if (key === "hrms") {
          return { entitled: true, type: "product", key: "hrms", source: "core_platform", status: "active" };
        }
        return { entitled: false, type: "product", key, status: "inactive" };
      });

      const capabilities = await SmartDashboardService.resolveWorkspaceCapabilities("tenant-hrm-only");

      expect(capabilities.hrm).toBe(true);
      expect(capabilities.financial).toBe(false);
      expect(capabilities.sales).toBe(false);
      expect(capabilities.crm).toBe(false);
      expect(capabilities.pos).toBe(false);
      expect(capabilities.inventory).toBe(false);
      expect(capabilities.projects).toBe(false);
      expect(capabilities.purchases).toBe(false);
    });

    it("Scenario 2: Workspace with only one optional add-on active (POS only)", async () => {
      vi.spyOn(entitlements, "checkTenantEntitlement").mockImplementation(async (tenantId, key) => {
        if (key === "hrms") return { entitled: true, type: "product", key, status: "active" };
        if (key === "pos") return { entitled: true, type: "product", key, status: "active", source: "module" };
        return { entitled: false, type: "product", key, status: "inactive" };
      });

      const capabilities = await SmartDashboardService.resolveWorkspaceCapabilities("tenant-pos-only");

      expect(capabilities.hrm).toBe(true);
      expect(capabilities.pos).toBe(true);
      expect(capabilities.inventory).toBe(true); // POS implicitly activates inventory valuation
      expect(capabilities.financial).toBe(false);
      expect(capabilities.crm).toBe(false);
      expect(capabilities.projects).toBe(false);
      expect(capabilities.purchases).toBe(false);
    });

    it("Scenario 3: Workspace with several active add-ons (HRMS + POS + CRM)", async () => {
      vi.spyOn(entitlements, "checkTenantEntitlement").mockImplementation(async (tenantId, key) => {
        if (["hrms", "pos", "crm"].includes(key)) {
          return { entitled: true, type: "product", key, status: "active", source: "module" };
        }
        return { entitled: false, type: "product", key, status: "inactive" };
      });

      const capabilities = await SmartDashboardService.resolveWorkspaceCapabilities("tenant-multi");

      expect(capabilities.hrm).toBe(true);
      expect(capabilities.pos).toBe(true);
      expect(capabilities.crm).toBe(true);
      expect(capabilities.sales).toBe(true); // CRM activates sales pipeline
      expect(capabilities.projects).toBe(false);
      expect(capabilities.financial).toBe(false);
      expect(capabilities.purchases).toBe(false);
    });

    it("Scenario 4: Workspace with an add-on installed but disabled (isEnabled = false)", async () => {
      vi.spyOn(entitlements, "checkTenantEntitlement").mockImplementation(async (tenantId, key) => {
        if (key === "hrms") return { entitled: true, type: "product", key, status: "active" };
        if (key === "projects") {
          return { entitled: false, type: "product", key, source: "module", status: "disabled", reason: "Module disabled" };
        }
        return { entitled: false, type: "product", key, status: "inactive" };
      });

      const capabilities = await SmartDashboardService.resolveWorkspaceCapabilities("tenant-disabled-proj");

      expect(capabilities.projects).toBe(false);
      expect(capabilities.hrm).toBe(true);
    });

    it("Scenario 5: Workspace with an expired or revoked entitlement (status = 'expired')", async () => {
      vi.spyOn(entitlements, "checkTenantEntitlement").mockImplementation(async (tenantId, key) => {
        if (key === "hrms") return { entitled: true, type: "product", key, status: "active" };
        if (key === "finance") {
          return { entitled: false, type: "product", key, source: "addon", status: "expired", reason: "Subscription expired" };
        }
        return { entitled: false, type: "product", key, status: "inactive" };
      });

      const capabilities = await SmartDashboardService.resolveWorkspaceCapabilities("tenant-expired-fin");

      expect(capabilities.financial).toBe(false);
      expect(capabilities.hrm).toBe(true);
    });

    it("Scenario 6 & 7: Workspace with valid paid or free add-on successfully installed", async () => {
      vi.spyOn(entitlements, "checkTenantEntitlement").mockImplementation(async (tenantId, key) => {
        if (key === "hrms") return { entitled: true, type: "product", key, status: "active" };
        if (key === "projects") return { entitled: true, type: "product", key, source: "module", status: "active" };
        if (key === "purchases") return { entitled: true, type: "addon", key, source: "addon", status: "active" };
        return { entitled: false, type: "product", key, status: "inactive" };
      });

      const capabilities = await SmartDashboardService.resolveWorkspaceCapabilities("tenant-paid-free");

      expect(capabilities.projects).toBe(true);
      expect(capabilities.purchases).toBe(true);
      expect(capabilities.pos).toBe(false);
    });

    it("Scenario 8: Workspace with plan-included sovereign capabilities", async () => {
      vi.spyOn(entitlements, "checkTenantEntitlement").mockImplementation(async (tenantId, key) => {
        return { entitled: true, type: "product", key, source: "plan", status: "active" };
      });

      const capabilities = await SmartDashboardService.resolveWorkspaceCapabilities("tenant-sovereign");

      expect(capabilities.hrm).toBe(true);
      expect(capabilities.financial).toBe(true);
      expect(capabilities.pos).toBe(true);
      expect(capabilities.crm).toBe(true);
      expect(capabilities.projects).toBe(true);
      expect(capabilities.inventory).toBe(true);
    });

    it("Scenario 9: User whose role lacks access to a particular module (RBAC restriction)", async () => {
      vi.spyOn(entitlements, "checkTenantEntitlement").mockImplementation(async () => {
        return { entitled: true, type: "product", key: "all", status: "active" };
      });

      const restrictedUser = {
        roles: ["employee"],
        permissions: ["hrm.view", "project.view"],
        workspaceRole: "Staff",
      };

      const capabilities = await SmartDashboardService.resolveWorkspaceCapabilities("tenant-rbac", restrictedUser);

      expect(capabilities.hrm).toBe(true);
      expect(capabilities.projects).toBe(true);
      expect(capabilities.financial).toBe(false); // Revoked by RBAC
      expect(capabilities.pos).toBe(false);       // Revoked by RBAC
      expect(capabilities.crm).toBe(false);       // Revoked by RBAC
    });

    it("Scenario 10: Two tenants with different add-on configurations (Tenant isolation)", async () => {
      const spy = vi.spyOn(entitlements, "checkTenantEntitlement").mockImplementation(async (tenantId, key) => {
        if (tenantId === "tenant-A") {
          return { entitled: key === "hrms" || key === "pos", type: "product", key, status: "active" };
        } else {
          return { entitled: key === "hrms" || key === "projects", type: "product", key, status: "active" };
        }
      });

      const capA = await SmartDashboardService.resolveWorkspaceCapabilities("tenant-A");
      const capB = await SmartDashboardService.resolveWorkspaceCapabilities("tenant-B");

      expect(capA.pos).toBe(true);
      expect(capA.projects).toBe(false);

      expect(capB.pos).toBe(false);
      expect(capB.projects).toBe(true);
    });
  });

  describe("2. Smart Dashboard Data & Section Filtering", () => {
    it("Scenario 11: Disabling POS removes POS metrics from Overview without breaking HRMS", async () => {
      const { rawPrisma } = await import("../../server/src/prisma");
      (rawPrisma.sale.findMany as any).mockResolvedValue([
        { total: 1000, type: "invoice" },
        { total: 500, type: "pos" },
      ]);
      (rawPrisma.employee.count as any).mockResolvedValue(15);
      (rawPrisma.employee.findMany as any).mockResolvedValue([
        { id: "e1", employeeCode: "EMP-01", firstName: "Alice", lastName: "Smith" },
      ]);

      const capabilitiesWithoutPOS: DashboardCapabilities = {
        hrm: true,
        financial: false,
        sales: true,
        crm: false,
        pos: false,
        inventory: false,
        projects: false,
        purchases: false,
        entitlements: {},
      };

      const overview = await SmartDashboardService.getExecutiveOverview("tenant-1", capabilitiesWithoutPOS);

      // Core HRMS remains functional
      expect(overview.summaryCards.totalEmployees).toBeDefined();
      expect(overview.summaryCards.totalEmployees.count).toBe(15);
      expect(overview.moduleSummaries.hrm).toBeDefined();

      // Unauthorized modules omitted
      expect(overview.summaryCards.totalProjects).toBeUndefined();
      expect(overview.moduleSummaries.pos).toBeUndefined();
      expect(overview.moduleSummaries.projects).toBeUndefined();
      expect(overview.moduleSummaries.crm).toBeUndefined();

      // Monthly revenue excludes POS total (1000 instead of 1500)
      expect(overview.summaryCards.monthlyRevenue.value).toBe(1000);
    });

    it("Scenario 12: Enabling one add-on does not expose data from unrelated add-ons", async () => {
      const { rawPrisma } = await import("../../server/src/prisma");
      (rawPrisma.project.count as any).mockResolvedValue(8);
      (rawPrisma.employee.count as any).mockResolvedValue(10);
      (rawPrisma.crmDeal.findMany as any).mockResolvedValue([{ value: 50000 }]);

      const capabilitiesProjectsOnly: DashboardCapabilities = {
        hrm: true,
        financial: false,
        sales: false,
        crm: false,
        pos: false,
        inventory: false,
        projects: true,
        purchases: false,
        entitlements: {},
      };

      const overview = await SmartDashboardService.getExecutiveOverview("tenant-proj", capabilitiesProjectsOnly);

      expect(overview.summaryCards.totalProjects).toBeDefined();
      expect(overview.summaryCards.totalProjects.count).toBe(8);
      expect(overview.summaryCards.salesPipeline).toBeUndefined(); // CRM hidden
      expect(overview.summaryCards.monthlyRevenue).toBeUndefined(); // Financial/Sales hidden
      expect(overview.moduleSummaries.crm).toBeUndefined();
    });

    it("Scenario 14: Authorized modules with empty datasets return truthful 0 and empty collections", async () => {
      const { rawPrisma } = await import("../../server/src/prisma");
      (rawPrisma.sale.findMany as any).mockResolvedValue([]);
      (rawPrisma.employee.count as any).mockResolvedValue(0);
      (rawPrisma.employee.findMany as any).mockResolvedValue([]);
      (rawPrisma.project.count as any).mockResolvedValue(0);
      (rawPrisma.crmDeal.findMany as any).mockResolvedValue([]);
      (rawPrisma.crmLead.findMany as any).mockResolvedValue([]);
      (rawPrisma.customer.findMany as any).mockResolvedValue([]);

      const fullCapabilities: DashboardCapabilities = {
        hrm: true,
        financial: true,
        sales: true,
        crm: true,
        pos: true,
        inventory: true,
        projects: true,
        purchases: true,
        entitlements: {},
      };

      const overview = await SmartDashboardService.getExecutiveOverview("tenant-empty", fullCapabilities);

      expect(overview.summaryCards.monthlyRevenue.value).toBe(0);
      expect(overview.summaryCards.netSummary.value).toBe(0);
      expect(overview.summaryCards.totalEmployees.count).toBe(0);
      expect(overview.summaryCards.totalProjects.count).toBe(0);
      expect(overview.summaryCards.salesPipeline.value).toBe(0);
      expect(overview.topEmployees).toEqual([]);
      expect(overview.topCustomers).toEqual([]);
      expect(overview.recentTransactions).toEqual([]);
    });

    it("Scenario 15: Operational Analytics filters subtab sections strictly by capability", async () => {
      const { rawPrisma } = await import("../../server/src/prisma");
      (rawPrisma.product.findMany as any).mockResolvedValue([{ id: "p1", purchasePrice: 50, lowStockThreshold: 5 }]);
      (rawPrisma.sale.findMany as any).mockResolvedValue([{ total: 120, date: new Date() }]);
      (rawPrisma.project.findMany as any).mockResolvedValue([{ id: "prj1", status: "active", budget: 1000, tasks: [], milestones: [] }]);

      const posAndInventoryCaps: DashboardCapabilities = {
        hrm: true,
        financial: false,
        sales: false,
        crm: false,
        pos: true,
        inventory: true,
        projects: false,
        purchases: false,
        entitlements: {},
      };

      const operational = await SmartDashboardService.getOperationalAnalytics("tenant-pos-inv", posAndInventoryCaps);

      expect(operational.inventory).toBeDefined();
      expect(operational.inventory.totalSKUs).toBe(1);
      expect(operational.pos).toBeDefined();
      expect(operational.pos.totalOrders).toBe(1);
      expect(operational.projects).toBeNull();   // Projects module disabled
      expect(operational.vendorSpend).toBeNull(); // Purchases module disabled
    });
    it("Scenario 16: Alias isolation - Inventory in TenantModule does not entitle POS", async () => {
      // Test real checkTenantEntitlement logic without mocking checkTenantEntitlement
      const { rawPrisma } = await import("../../server/src/prisma");
      (rawPrisma.tenantModule.findFirst as any).mockImplementation(async ({ where }: any) => {
        // Workspace only has inventory enabled
        if (where.moduleKey?.in?.includes("inventory")) {
          return { moduleKey: "inventory", isEnabled: true };
        }
        return null;
      });

      const invResult = await entitlements.checkTenantEntitlement("tenant-inv-only", "inventory");
      expect(invResult.entitled).toBe(true);
      expect(invResult.source).toBe("module");

      const posResult = await entitlements.checkTenantEntitlement("tenant-inv-only", "pos");
      expect(posResult.entitled).toBe(false);
    });

    it("Scenario 17: Plan feature matching precision - Plan with only CRM does not entitle Sales", async () => {
      const { rawPrisma } = await import("../../server/src/prisma");
      (rawPrisma.tenantModule.findFirst as any).mockResolvedValue(null);
      (rawPrisma.tenantAddon.findFirst as any).mockResolvedValue(null);
      (rawPrisma.tenantSubscription.findFirst as any).mockResolvedValue({
        status: "active",
        plan: {
          id: "starter",
          name: "CRM Starter Plan",
          features: ["Basic CRM pipeline management", "Lead scoring"],
        },
      });

      const crmResult = await entitlements.checkTenantEntitlement("tenant-crm-starter", "crm");
      expect(crmResult.entitled).toBe(true);

      const salesResult = await entitlements.checkTenantEntitlement("tenant-crm-starter", "sales");
      expect(salesResult.entitled).toBe(false);
    });

    it("Scenario 18: POS transactions are omitted from recent transactions and last month comparisons when POS is unentitled", async () => {
      const { rawPrisma } = await import("../../server/src/prisma");
      (rawPrisma.sale.findMany as any).mockImplementation(async ({ where }: any) => {
        return [
          { id: "sale-inv-1", date: new Date(), total: 500, type: "invoice", paymentStatus: "paid" },
          { id: "sale-pos-1", date: new Date(), total: 300, type: "pos", paymentStatus: "paid" },
        ];
      });

      const noPosCaps: DashboardCapabilities = {
        hrm: true,
        financial: true,
        sales: true,
        crm: false,
        pos: false,
        inventory: false,
        projects: false,
        purchases: false,
        entitlements: {},
      };

      const overview = await SmartDashboardService.getExecutiveOverview("tenant-no-pos", noPosCaps);

      // total revenue should only include invoice (500), omitting POS (300)
      expect(overview.summaryCards.monthlyRevenue.value).toBe(500);

      // recent transactions must NOT contain POS transactions
      expect(overview.recentTransactions.some((tx: any) => tx.type === "POS Sale" || tx.module === "POS")).toBe(false);
      expect(overview.recentTransactions.length).toBe(1);
      expect(overview.recentTransactions[0].id).toBe("sale-inv-1");
    });
  });
});

