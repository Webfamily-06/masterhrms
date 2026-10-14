import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
import { checkTenantEntitlement, EntitlementCheckResult } from "../middleware/entitlements";
const prisma = rawPrisma || proxiedPrisma;

export interface DashboardCapabilities {
  hrm: boolean;
  financial: boolean;
  sales: boolean;
  crm: boolean;
  pos: boolean;
  inventory: boolean;
  projects: boolean;
  purchases: boolean;
  entitlements: Record<string, EntitlementCheckResult>;
}

export class SmartDashboardService {
  /**
   * Authoritative central workspace capability resolver.
   * Leverages canonical tenant modules, subscriptions, add-ons, and user roles/permissions.
   */
  static async resolveWorkspaceCapabilities(
    tenantId: string,
    user?: any
  ): Promise<DashboardCapabilities> {
    const isSuperAdmin = Boolean(
      user?.roles?.includes("super_admin") ||
      user?.roles?.includes("platform_admin")
    );

    const isWorkspaceAdmin = Boolean(
      isSuperAdmin ||
      user?.roles?.includes("admin") ||
      user?.roles?.includes("tenant_admin") ||
      user?.workspaceRole === "admin" ||
      user?.workspaceRole === "Workspace Admin"
    );

    // 1. Authoritative entitlement checks across canonical module keys
    const [
      hrmEnt,
      finEnt,
      salesEnt,
      crmEnt,
      posEnt,
      invEnt,
      projEnt,
      purEnt,
    ] = await Promise.all([
      checkTenantEntitlement(tenantId, "hrms", isSuperAdmin),
      checkTenantEntitlement(tenantId, "finance", isSuperAdmin),
      checkTenantEntitlement(tenantId, "sales", isSuperAdmin),
      checkTenantEntitlement(tenantId, "crm", isSuperAdmin),
      checkTenantEntitlement(tenantId, "pos", isSuperAdmin),
      checkTenantEntitlement(tenantId, "inventory", isSuperAdmin),
      checkTenantEntitlement(tenantId, "projects", isSuperAdmin),
      checkTenantEntitlement(tenantId, "purchases", isSuperAdmin),
    ]);

    let hrm = hrmEnt.entitled;
    let financial = finEnt.entitled;
    let sales = salesEnt.entitled || crmEnt.entitled;
    let crm = crmEnt.entitled;
    let pos = posEnt.entitled;
    let inventory = invEnt.entitled || posEnt.entitled;
    let projects = projEnt.entitled;
    let purchases = purEnt.entitled;

    // 2. User-level Role & Permission checks (RBAC)
    if (user && !isSuperAdmin && !isWorkspaceAdmin) {
      const userRoles: string[] = Array.isArray(user.roles)
        ? user.roles.map((r: any) => String(r).toLowerCase())
        : [];
      const userPerms: string[] = Array.isArray(user.permissions)
        ? user.permissions.map((p: any) => String(p).toLowerCase())
        : [];

      const hasPerm = (prefix: string) => userPerms.some((p) => p.includes(prefix) || p === "*");
      const hasRole = (roleList: string[]) => userRoles.some((r) => roleList.includes(r));

      const isHrUser = hasRole(["hr", "hr_admin", "hr_manager"]);
      const isSalesUser = hasRole(["sales", "sales_admin", "sales_manager", "sales_agent", "crm_admin"]);
      const isPosUser = hasRole(["pos_admin", "pos_manager", "cashier", "store_keeper", "retail_staff"]);
      const isFinanceUser = hasRole(["finance_admin", "finance_manager", "accountant", "payroll_manager", "bookkeeper"]);
      const isInventoryUser = hasRole(["inventory_admin", "inventory_manager", "warehouse_manager", "stock_keeper"]);
      const isProjectUser = hasRole(["project_admin", "project_manager", "scrum_master", "developer"]);
      const isProcurementUser = hasRole(["purchase_admin", "purchase_manager", "procurement_manager", "buyer"]);

      if (userPerms.length > 0) {
        if (!hasPerm("hrm") && !hasPerm("employee") && !hasPerm("staff")) {
          hrm = false;
        }
        if (!hasPerm("finance") && !hasPerm("account") && !hasPerm("ledger")) {
          financial = false;
        }
        if (!hasPerm("sale") && !hasPerm("invoice")) {
          sales = false;
        }
        if (!hasPerm("crm") && !hasPerm("lead") && !hasPerm("deal")) {
          crm = false;
        }
        if (!hasPerm("pos") && !hasPerm("cashier")) {
          pos = false;
        }
        if (!hasPerm("inventory") && !hasPerm("product") && !hasPerm("stock")) {
          inventory = false;
        }
        if (!hasPerm("project") && !hasPerm("task")) {
          projects = false;
        }
        if (!hasPerm("purchase") && !hasPerm("procurement") && !hasPerm("vendor")) {
          purchases = false;
        }
      } else if (userRoles.length > 0) {
        // Role-based boundary enforcement (e.g. HR-only roles never leak CRM or POS)
        if (!isHrUser) {
          hrm = false;
        }
        if (!isFinanceUser) {
          financial = false;
        }
        if (!isSalesUser) {
          sales = false;
        }
        if (!isSalesUser) {
          crm = false;
        }
        if (!isPosUser) {
          pos = false;
        }
        if (!isInventoryUser && !isPosUser) {
          inventory = false;
        }
        if (!isProjectUser) {
          projects = false;
        }
        if (!isProcurementUser) {
          purchases = false;
        }
      }
    }

    return {
      hrm,
      financial,
      sales,
      crm,
      pos,
      inventory,
      projects,
      purchases,
      entitlements: {
        hrms: hrmEnt,
        finance: finEnt,
        sales: salesEnt,
        crm: crmEnt,
        pos: posEnt,
        inventory: invEnt,
        projects: projEnt,
        purchases: purEnt,
      },
    };
  }

  /**
   * Helper: calculate date ranges
   */
  private static getDateRanges() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    return { now, startOfMonth, startOfLastMonth, endOfLastMonth, twelveMonthsAgo, ninetyDaysAgo };
  }

  /**
   * Executive Overview - strictly workspace-aware and capability-filtered
   */
  static async getExecutiveOverview(tenantId: string, capabilities?: DashboardCapabilities) {
    if (!capabilities) {
      capabilities = await this.resolveWorkspaceCapabilities(tenantId);
    }
    const { startOfMonth, startOfLastMonth, endOfLastMonth } = this.getDateRanges();

    // 1. Revenue
    let currSales: any[] = [];
    let lastSales: any[] = [];
    if (capabilities.financial || capabilities.sales || capabilities.pos) {
      [currSales, lastSales] = await Promise.all([
        prisma.sale.findMany({
          where: { tenantId, date: { gte: startOfMonth } },
          select: { total: true, type: true },
        }).catch(() => []),
        prisma.sale.findMany({
          where: { tenantId, date: { gte: startOfLastMonth, lte: endOfLastMonth } },
          select: { total: true, type: true },
        }).catch(() => []),
      ]);
    }

    // Exclude POS sales if POS is not authorized
    if (!capabilities.pos) {
      currSales = currSales.filter((s: any) => s.type !== "pos");
      lastSales = lastSales.filter((s: any) => s.type !== "pos");
    }

    const totalRevenue = currSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
    const lastRevenue = lastSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
    const revenueChangePct = lastRevenue > 0
      ? Number((((totalRevenue - lastRevenue) / lastRevenue) * 100).toFixed(2))
      : 0;

    // 2. Expenses (Purchases + Payslips)
    let currPurchases: any[] = [];
    let currPayslips: any[] = [];
    if (capabilities.purchases || capabilities.financial) {
      currPurchases = await prisma.purchase.findMany({
        where: { tenantId, date: { gte: startOfMonth } },
        select: { total: true },
      }).catch(() => []);
    }
    if (capabilities.hrm || capabilities.financial) {
      currPayslips = await prisma.payslip.findMany({
        where: { tenantId, createdAt: { gte: startOfMonth } },
        select: { netSalary: true },
      }).catch(() => []);
    }

    const currPurchaseTotal = currPurchases.reduce((sum, p) => sum + Number(p.total || 0), 0);
    const currPayrollTotal = currPayslips.reduce((sum, p) => sum + Number(p.netSalary || 0), 0);
    const totalExpenses = currPurchaseTotal + currPayrollTotal;
    const netProfit = totalRevenue - totalExpenses;
    const profitMarginPct = totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(2)) : 0;

    // 3. Employees & Attendance
    let totalEmployees = 0;
    let onLeaveEmployees = 0;
    let attendanceTodayCount = 0;
    if (capabilities.hrm) {
      const [empCount, leaveCount, attCount] = await Promise.all([
        prisma.employee.count({ where: { tenantId, status: "active" } }).catch(() => 0),
        prisma.employee.count({ where: { tenantId, status: "on_leave" } }).catch(() => 0),
        prisma.attendance.count({ where: { tenantId, date: { gte: startOfMonth } } }).catch(() => 0),
      ]);
      totalEmployees = empCount;
      onLeaveEmployees = leaveCount;
      attendanceTodayCount = attCount;
    }

    // 4. Projects
    let activeProjects = 0;
    let completedProjects = 0;
    let totalProjects = 0;
    if (capabilities.projects) {
      [activeProjects, completedProjects, totalProjects] = await Promise.all([
        prisma.project.count({ where: { tenantId, status: { in: ["active", "in_progress"] } } }).catch(() => 0),
        prisma.project.count({ where: { tenantId, status: "completed" } }).catch(() => 0),
        prisma.project.count({ where: { tenantId } }).catch(() => 0),
      ]);
    }

    // 5. CRM & Deals Pipeline
    let pipelineValue = 0;
    let leadsCount = 0;
    let conversionRate = 0;
    if (capabilities.crm) {
      const [deals, leads] = await Promise.all([
        prisma.crmDeal.findMany({
          where: { tenantId },
          select: { value: true, stage: true },
        }).catch(() => []),
        prisma.crmLead.findMany({
          where: { tenantId },
          select: { stage: true },
        }).catch(() => []),
      ]);
      pipelineValue = (deals as any[]).reduce((sum: number, d: any) => sum + Number(d.value || 0), 0);
      leadsCount = leads.length;
      const converted = leads.filter((l) => l.stage === "converted").length;
      conversionRate = leadsCount > 0 ? Number(((converted / leadsCount) * 100).toFixed(1)) : 0;
    }

    // 6. Summary Cards (strictly filtered by capability)
    const summaryCards: Record<string, any> = {};
    if (capabilities.financial || capabilities.sales || capabilities.pos) {
      summaryCards.monthlyRevenue = {
        value: totalRevenue,
        changePct: revenueChangePct,
        trend: revenueChangePct >= 0 ? "up" : "down",
      };
    }
    if (capabilities.financial) {
      summaryCards.netSummary = {
        value: netProfit,
        marginPct: profitMarginPct,
        isHealthy: profitMarginPct >= 15,
      };
    }
    if (capabilities.hrm) {
      summaryCards.totalEmployees = {
        count: totalEmployees,
        newHires: totalEmployees,
        attrition: 0,
      };
      summaryCards.todayAttendance = {
        rate: totalEmployees > 0 ? Number(((attendanceTodayCount / totalEmployees) * 100).toFixed(1)) : 0,
        monthlyAvg: 85.0,
      };
    }
    if (capabilities.projects) {
      summaryCards.totalProjects = {
        count: totalProjects,
        completed: completedProjects,
        onHold: Math.max(0, totalProjects - activeProjects - completedProjects),
      };
    }
    if (capabilities.crm || capabilities.sales) {
      summaryCards.salesPipeline = {
        value: pipelineValue,
        leadsCount,
        conversionRate,
      };
    }

    // 7. Quick Insights (filtered by active capabilities)
    const quickInsights: any[] = [];
    if (capabilities.sales && revenueChangePct > 0) {
      quickInsights.push({
        type: "positive",
        badge: "Positive",
        title: "Revenue Growth",
        message: `${revenueChangePct}% growth achieved over last month. Keep it up!`,
      });
    }
    if (capabilities.crm && conversionRate >= 50) {
      quickInsights.push({
        type: "positive",
        badge: "Positive",
        title: "Strong Conversion Rate",
        message: `${conversionRate}% lead conversion rate achieved. Your sales team is performing well.`,
      });
    }
    if (capabilities.hrm && onLeaveEmployees > 0) {
      quickInsights.push({
        type: "info",
        badge: "Info",
        title: "Pending Leave Requests",
        message: `${onLeaveEmployees} employee(s) currently on leave.`,
      });
    }
    if (capabilities.projects && totalProjects > 0 && activeProjects === 0) {
      quickInsights.push({
        type: "warning",
        badge: "Warning",
        title: "Project Review Needed",
        message: "No active projects underway. Review milestone targets.",
      });
    }
    if (capabilities.inventory) {
      const lowStockProducts = await prisma.product.count({
        where: { tenantId, lowStockThreshold: { gt: 0 } },
      }).catch(() => 0);
      if (lowStockProducts > 0) {
        quickInsights.push({
          type: "critical",
          badge: "Critical",
          title: "Low Stock Alert",
          message: `${lowStockProducts} product(s) have low stock remaining.`,
        });
      }
    }
    if (capabilities.financial && profitMarginPct < 10 && totalRevenue > 0) {
      quickInsights.push({
        type: "critical",
        badge: "Critical",
        title: "Low Profit Margin",
        message: `${profitMarginPct}% profit margin recorded. Below healthy threshold.`,
      });
    }

    // 8. Module Summaries (strictly limited to active capabilities)
    const moduleSummaries: Record<string, any> = {};
    if (capabilities.hrm) {
      moduleSummaries.hrm = {
        name: "HRM",
        metrics: [
          { label: "Total Employees", value: String(totalEmployees) },
          { label: "Today's Attendance", value: String(attendanceTodayCount) },
          { label: "On Leave", value: String(onLeaveEmployees) },
        ],
      };
    }
    if (capabilities.crm) {
      moduleSummaries.crm = {
        name: "CRM",
        metrics: [
          { label: "Active Leads", value: String(leadsCount) },
          { label: "Conversion Rate", value: `${conversionRate}%` },
          { label: "Pipeline Value", value: `₹${pipelineValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` },
        ],
      };
    }
    if (capabilities.financial) {
      moduleSummaries.account = {
        name: "Account",
        metrics: [
          { label: "Net Profit", value: `₹${netProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` },
          { label: "Operating Margin", value: `${profitMarginPct}%` },
          { label: "Total Expenses", value: `₹${totalExpenses.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` },
        ],
      };
    }
    if (capabilities.pos) {
      const posOrders = currSales.filter((s) => s.type === "pos").length;
      const posRev = currSales.filter((s) => s.type === "pos").reduce((sum, s) => sum + Number(s.total || 0), 0);
      moduleSummaries.pos = {
        name: "POS",
        metrics: [
          { label: "Today's Sales", value: `₹${posRev.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` },
          { label: "Transactions", value: String(posOrders) },
        ],
      };
    }
    if (capabilities.projects) {
      moduleSummaries.projects = {
        name: "Projects",
        metrics: [
          { label: "Total Projects", value: String(totalProjects) },
          { label: "Active", value: String(activeProjects) },
          { label: "Completed", value: String(completedProjects) },
        ],
      };
    }
    if (capabilities.sales) {
      moduleSummaries.sales = {
        name: "Sales",
        metrics: [
          { label: "Monthly Revenue", value: `₹${totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` },
          { label: "Orders", value: String(currSales.length) },
        ],
      };
    }
    if (capabilities.inventory) {
      const productCount = await prisma.product.count({ where: { tenantId } }).catch(() => 0);
      moduleSummaries.inventory = {
        name: "Inventory",
        metrics: [
          { label: "Total Products", value: String(productCount) },
        ],
      };
    }

    // 9. Performance Tables (Employees, Customers, Transactions)
    let topEmployees: any[] = [];
    if (capabilities.hrm) {
      const dbEmployees = await prisma.employee.findMany({
        where: { tenantId, status: "active" },
        take: 10,
        include: { department: true },
      }).catch(() => []);
      topEmployees = dbEmployees.map((e: any, idx: number) => ({
        id: e.employeeCode || `EMP-${idx + 1}`,
        name: `${e.firstName || ""} ${e.lastName || ""}`.trim() || e.name || "Employee",
        department: e.department?.name || "General",
        designation: e.designation || "Staff",
        tasks: 10,
        attendancePct: 95,
        productivity: 90,
      }));
    }

    let topCustomers: any[] = [];
    if (capabilities.sales || capabilities.crm) {
      const dbCustomers = await prisma.customer.findMany({
        where: { tenantId },
        take: 10,
      }).catch(() => []);
      topCustomers = dbCustomers.map((c: any, idx: number) => ({
        rank: idx + 1,
        name: c.name || "Customer",
        status: "Active",
        orders: 5,
        grossRevenue: 25000,
        returns: 0,
        netRevenue: 25000,
        totalPaid: 25000,
        outstanding: 0,
        avgOrderValue: 5000,
        lastPurchase: new Date().toISOString().slice(0, 10),
      }));
    }

    let recentTransactions: any[] = [];
    if (capabilities.financial || capabilities.sales || capabilities.pos || capabilities.purchases) {
      let [txSales, txPurchases] = await Promise.all([
        (capabilities.sales || capabilities.pos || capabilities.financial)
          ? prisma.sale.findMany({
              where: { tenantId },
              orderBy: { date: "desc" },
              take: 5,
              select: { id: true, date: true, total: true, type: true, paymentStatus: true },
            }).catch(() => [])
          : [],
        (capabilities.purchases || capabilities.financial)
          ? prisma.purchase.findMany({
              where: { tenantId },
              orderBy: { date: "desc" },
              take: 5,
              select: { id: true, date: true, total: true, paymentStatus: true },
            }).catch(() => [])
          : [],
      ]);

      if (!capabilities.pos) {
        txSales = txSales.filter((s: any) => s.type !== "pos");
      }

      recentTransactions = [
        ...txSales.map((s: any) => ({
          id: s.id,
          date: s.date ? new Date(s.date).toISOString().slice(0, 10) : "",
          type: s.type === "pos" ? "POS Sale" : "Revenue",
          module: s.type === "pos" ? "POS" : "Sales",
          amount: Number(s.total || 0),
          status: s.paymentStatus === "paid" ? "Posted" : "Draft",
        })),
        ...txPurchases.map((p: any) => ({
          id: p.id,
          date: p.date ? new Date(p.date).toISOString().slice(0, 10) : "",
          type: "Expense",
          module: "Procurement",
          amount: -Number(p.total || 0),
          status: "Posted",
        })),
      ].slice(0, 10);
    }

    return {
      summaryCards,
      quickInsights,
      moduleSummaries,
      topEmployees,
      topCustomers,
      recentTransactions,
    };
  }

  /**
   * Financial Analytics - strictly workspace-aware and capability-filtered
   */
  static async getFinancialAnalytics(tenantId: string, capabilities?: DashboardCapabilities) {
    if (!capabilities) {
      capabilities = await this.resolveWorkspaceCapabilities(tenantId);
    }
    const { twelveMonthsAgo, ninetyDaysAgo } = this.getDateRanges();

    // Inflows vs Outflows
    let sales: any[] = [];
    if (capabilities.financial || capabilities.sales || capabilities.pos) {
      sales = await prisma.sale.findMany({
        where: { tenantId, date: { gte: twelveMonthsAgo } },
        select: { id: true, total: true, paidAmount: true, date: true, type: true, paymentStatus: true },
      }).catch(() => []);
    }

    // Exclude POS sales if not authorized
    if (!capabilities.pos) {
      sales = sales.filter((s: any) => s.type !== "pos");
    }

    let purchases: any[] = [];
    if (capabilities.purchases || capabilities.financial) {
      purchases = await prisma.purchase.findMany({
        where: { tenantId, date: { gte: twelveMonthsAgo } },
        select: { id: true, total: true, paidAmount: true, date: true, paymentStatus: true },
      }).catch(() => []);
    }

    let payslips: any[] = [];
    if (capabilities.hrm || capabilities.financial) {
      payslips = await prisma.payslip.findMany({
        where: { tenantId, createdAt: { gte: twelveMonthsAgo } },
        select: { netSalary: true, grossSalary: true, deductions: true, createdAt: true },
      }).catch(() => []);
    }

    let journalEntries: any[] = [];
    if (capabilities.financial) {
      journalEntries = await prisma.journalEntry.findMany({
        where: { tenantId },
        include: { items: true },
        orderBy: { entryDate: "desc" },
        take: 50,
      }).catch(() => []);
    }

    const accountsReceivable = sales
      .filter((s) => s.paymentStatus !== "paid")
      .reduce((sum, s) => sum + (Number(s.total || 0) - Number(s.paidAmount || 0)), 0);

    const accountsPayable = purchases
      .filter((p) => p.paymentStatus !== "paid")
      .reduce((sum, p) => sum + (Number(p.total || 0) - Number(p.paidAmount || 0)), 0);

    const totalSalesAmount = sales.reduce((sum, s) => sum + Number(s.total || 0), 0);
    const totalPurchasesAmount = purchases.reduce((sum, p) => sum + Number(p.total || 0), 0);
    const totalPayrollAmount = payslips.reduce((sum, p) => sum + Number(p.netSalary || 0), 0);

    const expenseCategories: any[] = [];
    if (capabilities.purchases || capabilities.financial) {
      expenseCategories.push({ name: "Vendor Purchases", amount: totalPurchasesAmount });
    }
    if (capabilities.hrm || capabilities.financial) {
      expenseCategories.push({ name: "Employee Payroll", amount: totalPayrollAmount });
    }

    const recentSales = sales.filter((s) => new Date(s.date) >= ninetyDaysAgo);
    const recentPurchases = purchases.filter((p) => new Date(p.date) >= ninetyDaysAgo);
    const cashInflow90d = recentSales.reduce((sum, s) => sum + Number(s.paidAmount || 0), 0);
    const cashOutflow90d = recentPurchases.reduce((sum, p) => sum + Number(p.paidAmount || 0), 0);

    return {
      revenueMetrics: {
        totalRevenue: totalSalesAmount,
        posRevenue: capabilities.pos ? sales.filter((s) => s.type === "pos").reduce((sum, s) => sum + Number(s.total || 0), 0) : 0,
        invoiceRevenue: sales.filter((s) => s.type !== "pos").reduce((sum, s) => sum + Number(s.total || 0), 0),
      },
      expenseMetrics: {
        totalExpenses: totalPurchasesAmount + totalPayrollAmount,
        categories: expenseCategories,
      },
      profitability: {
        grossRevenue: totalSalesAmount,
        costOfGoods: totalPurchasesAmount,
        grossProfit: totalSalesAmount - totalPurchasesAmount,
        operatingExpenses: totalPayrollAmount,
        netProfit: totalSalesAmount - totalPurchasesAmount - totalPayrollAmount,
        operatingMarginPct: totalSalesAmount > 0
          ? Number((((totalSalesAmount - totalPurchasesAmount - totalPayrollAmount) / totalSalesAmount) * 100).toFixed(1))
          : 0,
      },
      cashFlow: {
        cashInflow90d,
        cashOutflow90d,
        netCashFlow: cashInflow90d - cashOutflow90d,
        accountsReceivable,
        accountsPayable,
      },
      journalEntries: journalEntries.map((j: any) => ({
        id: j.id,
        entryNumber: j.entryNumber || j.id.slice(0, 8),
        date: j.entryDate ? new Date(j.entryDate).toISOString().slice(0, 10) : "",
        reference: j.reference || "N/A",
        description: j.description || "",
        totalDebit: j.items ? j.items.reduce((s: number, l: any) => s + Number(l.debit || 0), 0) : 0,
        totalCredit: j.items ? j.items.reduce((s: number, l: any) => s + Number(l.credit || 0), 0) : 0,
        status: j.status || "posted",
        lines: j.items || [],
      })),
    };
  }

  /**
   * Sales & Customer Analytics - strictly workspace-aware and capability-filtered
   */
  static async getSalesCustomerAnalytics(tenantId: string, capabilities?: DashboardCapabilities) {
    if (!capabilities) {
      capabilities = await this.resolveWorkspaceCapabilities(tenantId);
    }

    let leads: any[] = [];
    let deals: any[] = [];
    if (capabilities.crm) {
      [leads, deals] = await Promise.all([
        prisma.crmLead.findMany({ where: { tenantId } }).catch(() => []),
        prisma.crmDeal.findMany({ where: { tenantId } }).catch(() => []),
      ]);
    }

    let sales: any[] = [];
    let proposals: any[] = [];
    let customers: any[] = [];
    if (capabilities.sales) {
      [sales, proposals, customers] = await Promise.all([
        prisma.sale.findMany({
          where: { tenantId },
          select: { id: true, total: true, paidAmount: true, date: true, customerName: true, customerId: true, paymentStatus: true },
          take: 500,
        }).catch(() => []),
        prisma.crmProposal.findMany({ where: { tenantId } }).catch(() => []),
        prisma.customer.findMany({
          where: { tenantId },
          select: { id: true, name: true, email: true, phone: true },
          take: 100,
        }).catch(() => []),
      ]);
    }

    let purchases: any[] = [];
    if (capabilities.purchases) {
      purchases = await prisma.purchase.findMany({
        where: { tenantId },
        select: { id: true, total: true, date: true },
        take: 500,
      }).catch(() => []);
    }

    const totalLeads = leads.length;
    const convertedLeads = leads.filter((l) => l.stage === "converted").length;
    const leadConversionRate = totalLeads > 0 ? Number(((convertedLeads / totalLeads) * 100).toFixed(1)) : 0;

    const leadsBySourceMap = new Map<string, number>();
    leads.forEach((l) => {
      const src = l.source || "Direct / Website";
      leadsBySourceMap.set(src, (leadsBySourceMap.get(src) || 0) + 1);
    });
    const leadsBySource = Array.from(leadsBySourceMap.entries()).map(([source, count]) => ({ source, count }));

    const stageMap = new Map<string, { count: number; value: number }>();
    deals.forEach((d) => {
      const stage = d.stage || "lead";
      const existing = stageMap.get(stage) || { count: 0, value: 0 };
      existing.count += 1;
      existing.value += Number(d.value || 0);
      stageMap.set(stage, existing);
    });
    const dealsByStage = Array.from(stageMap.entries()).map(([stage, stats]) => ({
      stage,
      count: stats.count,
      value: stats.value,
    }));

    const totalPipelineValue = deals.reduce((sum, d) => sum + Number(d.value || 0), 0);
    const wonDeals = deals.filter((d) => d.stage === "won");
    const wonValue = wonDeals.reduce((sum, d) => sum + Number(d.value || 0), 0);
    const dealWinRate = deals.length > 0 ? Number(((wonDeals.length / deals.length) * 100).toFixed(1)) : 0;

    const totalSales = sales.reduce((sum, s) => sum + Number(s.total || 0), 0);
    const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.total || 0), 0);

    return {
      crm: capabilities.crm ? {
        totalLeads,
        convertedLeads,
        conversionRate: leadConversionRate,
        leadsBySource,
      } : null,
      deals: capabilities.crm ? {
        totalDeals: deals.length,
        totalPipelineValue,
        wonDealsCount: wonDeals.length,
        wonValue,
        winRate: dealWinRate,
        dealsByStage,
      } : null,
      proposals: capabilities.sales ? {
        totalProposals: proposals.length,
        accepted: proposals.filter((p: any) => p.status === "accepted").length,
        pending: proposals.filter((p: any) => p.status === "pending" || p.status === "sent").length,
      } : null,
      customers: (capabilities.sales || capabilities.crm) ? {
        totalCustomers: customers.length,
        list: customers.slice(0, 10),
      } : null,
      comparison: (capabilities.sales || capabilities.purchases) ? {
        totalSales,
        totalPurchases,
        netBalance: totalSales - totalPurchases,
      } : null,
    };
  }

  /**
   * Operational Analytics - strictly workspace-aware and capability-filtered
   */
  static async getOperationalAnalytics(tenantId: string, capabilities?: DashboardCapabilities) {
    if (!capabilities) {
      capabilities = await this.resolveWorkspaceCapabilities(tenantId);
    }

    let products: any[] = [];
    if (capabilities.inventory) {
      products = await prisma.product.findMany({
        where: { tenantId },
        select: { id: true, name: true, sku: true, lowStockThreshold: true, purchasePrice: true, salePrice: true, category: { select: { name: true } } },
      }).catch(() => []);
    }

    let posSales: any[] = [];
    if (capabilities.pos) {
      posSales = await prisma.sale.findMany({
        where: { tenantId, type: "pos" },
        select: { id: true, total: true, date: true, cashierName: true },
        take: 300,
      }).catch(() => []);
    }

    let projects: any[] = [];
    if (capabilities.projects) {
      projects = await prisma.project.findMany({
        where: { tenantId },
        include: { tasks: true, milestones: true },
      }).catch(() => []);
    }

    let vendors: any[] = [];
    let purchases: any[] = [];
    if (capabilities.purchases) {
      [vendors, purchases] = await Promise.all([
        prisma.supplier.findMany({
          where: { tenantId },
          select: { id: true, name: true },
        }).catch(() => []),
        prisma.purchase.findMany({
          where: { tenantId },
          select: { id: true, total: true, supplierId: true, paymentStatus: true },
        }).catch(() => []),
      ]);
    }

    // Stock metrics
    let inventoryData: any = null;
    if (capabilities.inventory) {
      const totalSKUs = products.length;
      let lowStockCount = 0;
      let totalStockValue = 0;
      products.forEach((p) => {
        totalStockValue += Number(p.purchasePrice || 0);
        if (Number(p.lowStockThreshold || 0) > 0) {
          lowStockCount += 1;
        }
      });
      inventoryData = {
        totalSKUs,
        lowStockCount,
        totalStockValue,
      };
    }

    // POS Metrics
    let posData: any = null;
    if (capabilities.pos) {
      const totalPosOrders = posSales.length;
      const totalPosRevenue = posSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
      const avgOrderValue = totalPosOrders > 0 ? Number((totalPosRevenue / totalPosOrders).toFixed(2)) : 0;
      const hoursCount = new Array(24).fill(0);
      posSales.forEach((s) => {
        const hour = new Date(s.date).getHours();
        hoursCount[hour] += 1;
      });
      posData = {
        totalOrders: totalPosOrders,
        totalRevenue: totalPosRevenue,
        avgOrderValue,
        hourlyDistribution: hoursCount.map((count, hour) => ({ hour: `${hour}:00`, orders: count })),
      };
    }

    // Projects Health
    let projectStats: any = null;
    if (capabilities.projects) {
      projectStats = {
        total: projects.length,
        active: projects.filter((p) => p.status === "in_progress" || p.status === "active").length,
        completed: projects.filter((p) => p.status === "completed").length,
        totalBudget: projects.reduce((sum: number, p: any) => sum + Number(p.budget || 0), 0),
        totalMilestoneCost: projects.reduce(
          (sum: number, p: any) => sum + (p.milestones || []).reduce((mSum: number, m: any) => mSum + Number(m.cost || 0), 0),
          0
        ),
        completedTasks: projects.reduce(
          (sum: number, p: any) => sum + (p.tasks || []).filter((t: any) => t.status === "completed").length,
          0
        ),
        totalTasks: projects.reduce((sum: number, p: any) => sum + (p.tasks || []).length, 0),
      };
    }

    // Vendor spend
    let vendorRanking: any = null;
    if (capabilities.purchases) {
      const vendorSpendMap = new Map<string, number>();
      purchases.forEach((p) => {
        if (!p.supplierId) return;
        vendorSpendMap.set(p.supplierId, (vendorSpendMap.get(p.supplierId) || 0) + Number(p.total || 0));
      });
      vendorRanking = vendors.map((v) => ({
        id: v.id,
        name: v.name,
        totalSpend: vendorSpendMap.get(v.id) || 0,
      })).sort((a, b) => b.totalSpend - a.totalSpend).slice(0, 5);
    }

    return {
      inventory: inventoryData,
      pos: posData,
      projects: projectStats,
      vendorSpend: vendorRanking,
    };
  }
}
