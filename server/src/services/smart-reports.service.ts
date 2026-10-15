import { rawPrisma, prisma as proxiedPrisma } from "../prisma";
const prisma = rawPrisma || proxiedPrisma;

/**
 * Sanitizes a cell value to prevent CSV / Spreadsheet formula injection in Excel, Calc, etc.
 * Prepends a single quote if the string begins with =, +, -, @, tab, or carriage return.
 */
export function sanitizeCsvValue(val: any): string {
  if (val === null || val === undefined) return "";
  let str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export class SmartReportsService {
  static sanitizeCsvValue = sanitizeCsvValue;

  /**
   * Catalogue Overview: Live counts & aggregates for the 8 documented report modules
   */
  static async getCatalogueOverview(tenantId: string) {
    const [
      attendanceCount,
      payrollCount,
      leaveCount,
      salesCount,
      purchasesCount,
      dealsCount,
      productsCount,
      projectsCount,
    ] = await Promise.all([
      prisma.attendance.count({ where: { tenantId } }),
      prisma.payslip.count({ where: { tenantId } }),
      prisma.leaveRequest.count({ where: { tenantId } }),
      prisma.sale.count({ where: { tenantId } }),
      prisma.purchase.count({ where: { tenantId } }),
      prisma.crmDeal.count({ where: { tenantId } }),
      prisma.product.count({ where: { tenantId, isActive: true } }),
      prisma.project.count({ where: { tenantId } }),
    ]);

    const [
      activeEmployees,
      approvedLeaves,
      payslipAgg,
      projectsAgg,
      dealsWon,
      dealsLost,
    ] = await Promise.all([
      prisma.employee.count({ where: { tenantId, status: "active" } }),
      prisma.leaveRequest.count({ where: { tenantId, status: "approved" } }),
      prisma.payslip.aggregate({
        where: { tenantId },
        _sum: { grossSalary: true, netSalary: true },
      }),
      prisma.project.aggregate({
        where: { tenantId },
        _sum: { budget: true },
      }),
      prisma.crmDeal.count({ where: { tenantId, stage: "won" } }),
      prisma.crmDeal.count({ where: { tenantId, stage: "lost" } }),
    ]);

    const totalGross = Number(payslipAgg._sum.grossSalary || 0);
    const totalNet = Number(payslipAgg._sum.netSalary || 0);
    const totalBudget = Number(projectsAgg._sum.budget || 0);

    return [
      {
        id: "attendance-summary",
        title: "Attendance Summary",
        category: "HRM & Workforce",
        badge: "This month",
        description: "Track employee attendance, late arrivals, and overtime",
        count: attendanceCount,
        stats: `${activeEmployees} Active Employees · ${attendanceCount} Attendance Records`,
        route: "/smart-reports/attendance-summary",
        icon: "calendar-check",
      },
      {
        id: "payroll-sheet",
        title: "Payroll Sheet",
        category: "HRM & Payroll",
        badge: "Last month",
        description: "Employee salary breakdown with allowances and deductions",
        count: payrollCount,
        stats: `${payrollCount} Payslips · Gross: ${Math.round(totalGross).toLocaleString()} · Net: ${Math.round(totalNet).toLocaleString()}`,
        route: "/smart-reports/payroll-sheet",
        icon: "wallet",
      },
      {
        id: "leave-report",
        title: "Leave Report",
        category: "HRM & Time Off",
        badge: "This month",
        description: "Track employee leave applications and leave balances",
        count: leaveCount,
        stats: `${leaveCount} Applications · ${approvedLeaves} Approved`,
        route: "/smart-reports/leave-report",
        icon: "clock",
      },
      {
        id: "sales-invoice",
        title: "Sales Invoices",
        category: "Finance & Sales",
        badge: "This month",
        description: "B2B client invoices, paid status and balance due breakdown",
        count: salesCount,
        stats: `${salesCount} Invoices Total`,
        route: "/smart-reports/sales-invoice",
        icon: "receipt",
      },
      {
        id: "purchase-invoice",
        title: "Purchase Invoices",
        category: "Finance & Purchases",
        badge: "This month",
        description: "Vendor bills, accounts payable and procurement costs",
        count: purchasesCount,
        stats: `${purchasesCount} Purchase Bills`,
        route: "/smart-reports/purchase-invoice",
        icon: "shopping-bag",
      },
      {
        id: "deal-pipeline",
        title: "Deal Pipeline Report",
        category: "CRM & Growth",
        badge: "This month",
        description: "Sales pipeline analysis with deal stages, win/loss rates and deal values",
        count: dealsCount,
        stats: `${dealsCount} Deals · ${dealsWon} Won · ${dealsLost} Lost`,
        route: "/smart-reports/deal-pipeline",
        icon: "trending-up",
      },
      {
        id: "product-stock",
        title: "Product Stock Report",
        category: "Operations & Inventory",
        badge: "This month",
        description: "Inventory overview with stock quantities, values and warehouse-wise breakdown",
        count: productsCount,
        stats: `${productsCount} Catalog Products`,
        route: "/smart-reports/product-stock",
        icon: "package",
      },
      {
        id: "project-progress",
        title: "Project Progress Report",
        category: "Operations & Delivery",
        badge: "This month",
        description: "Project tracking with task completion, milestones and budget status",
        count: projectsCount,
        stats: `${projectsCount} Projects · Budget: ${Math.round(totalBudget).toLocaleString()}`,
        route: "/smart-reports/project-progress",
        icon: "briefcase",
      },
    ];
  }

  /**
   * 1. Attendance Summary: Real database aggregation
   */
  static async getAttendanceSummary(tenantId: string, filters: any = {}) {
    const where: any = { tenantId };
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        const d = new Date(filters.startDate);
        if (!isNaN(d.getTime())) where.date.gte = d;
      }
      if (filters.endDate) {
        const d = new Date(filters.endDate);
        if (!isNaN(d.getTime())) where.date.lte = d;
      }
    }

    const [totalRecords, statusGroups, hoursAgg, records, targetEmployees] = await Promise.all([
      prisma.attendance.count({ where }),
      prisma.attendance.groupBy({
        by: ["status"],
        where,
        _count: true,
      }),
      prisma.attendance.aggregate({
        where,
        _sum: { hours: true, overtimeMinutes: true },
      }),
      prisma.attendance.findMany({
        where,
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } },
          },
        },
        orderBy: { date: "asc" },
        take: 500,
      }),
      prisma.employee.findMany({
        where: { tenantId, ...(filters.employeeId ? { id: filters.employeeId } : {}) },
        select: { id: true, firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } },
        take: 50,
      }),
    ]);

    const presentCount = statusGroups.find((g) => g.status === "present")?._count || 0;
    const lateCount = statusGroups.find((g) => g.status === "late")?._count || 0;
    const halfDayCount = statusGroups.find((g) => g.status === "half_day")?._count || 0;
    const absentCount = statusGroups.find((g) => g.status === "absent")?._count || 0;
    const onLeaveCount = statusGroups.find((g) => g.status === "on_leave")?._count || 0;

    const workingHours = Number(hoursAgg._sum.hours || 0);
    const overtimeHours = Number(((hoursAgg._sum.overtimeMinutes || 0) / 60).toFixed(1));
    const attendanceRate = totalRecords > 0
      ? Number((((presentCount + lateCount) / totalRecords) * 100).toFixed(2))
      : 0;

    // Build actual calendar rows per employee from queried database records
    const attendanceByEmployee: Record<string, typeof records> = {};
    records.forEach((r) => {
      if (!attendanceByEmployee[r.employeeId]) {
        attendanceByEmployee[r.employeeId] = [];
      }
      attendanceByEmployee[r.employeeId].push(r);
    });

    const calendarRows = targetEmployees.map((emp) => {
      const empRecords = attendanceByEmployee[emp.id] || [];
      const dayStatuses: Record<number, { status: string; hours?: number; overtime?: boolean }> = {};

      empRecords.forEach((r) => {
        const day = new Date(r.date).getDate();
        dayStatuses[day] = {
          status: r.status,
          hours: r.hours ? Number(r.hours) : undefined,
          overtime: (r.overtimeMinutes || 0) > 0,
        };
      });

      const empPresent = empRecords.filter((r) => r.status === "present").length;
      const empHalf = empRecords.filter((r) => r.status === "half_day").length;
      const empAbsent = empRecords.filter((r) => r.status === "absent").length;
      const empLeave = empRecords.filter((r) => r.status === "on_leave").length;
      const empHours = empRecords.reduce((s, r) => s + Number(r.hours || 0), 0);

      return {
        id: emp.id,
        name: `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Employee",
        code: emp.employeeCode || "N/A",
        department: emp.department?.name || "General",
        days: dayStatuses,
        presentDays: empPresent,
        halfDays: empHalf,
        absentDays: empAbsent,
        leaveDays: empLeave,
        totalHours: Number(empHours.toFixed(1)),
      };
    });

    return {
      metrics: {
        totalEmployees: targetEmployees.length,
        attendanceRate,
        workingHours,
        overtimeHours,
      },
      calendarRows,
      records: records.map((r) => ({
        id: r.id,
        employeeName: `${r.employee?.firstName || ""} ${r.employee?.lastName || ""}`.trim() || "Employee",
        employeeCode: r.employee?.employeeCode || "N/A",
        department: r.employee?.department?.name || "General",
        date: r.date.toISOString().slice(0, 10),
        status: r.status,
        checkIn: r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-",
        checkOut: r.checkOut ? new Date(r.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-",
        workHours: r.hours ? Number(r.hours) : 0,
      })),
    };
  }

  /**
   * 2. Payroll Sheet: Live database aggregation from Payslip records
   */
  static async getPayrollSheet(tenantId: string, filters: any = {}) {
    const where: any = { tenantId };
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.payrollRunId) where.payrollRunId = filters.payrollRunId;
    if (filters.periodMonth) {
      const m = Number(filters.periodMonth);
      if (!isNaN(m) && m > 0) where.periodMonth = m;
    }
    if (filters.periodYear) {
      const y = Number(filters.periodYear);
      if (!isNaN(y) && y > 0) where.periodYear = y;
    }

    const [agg, payslips] = await Promise.all([
      prisma.payslip.aggregate({
        where,
        _sum: { grossSalary: true, deductions: true, netSalary: true },
        _count: true,
      }),
      prisma.payslip.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              designation: true,
              department: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ]);

    const totalGrossPay = Number(agg._sum.grossSalary || 0);
    const totalDeductions = Number(agg._sum.deductions || 0);
    const totalNetPay = Number(agg._sum.netSalary || 0);
    const employeeCount = agg._count || 0;

    const chartCategories = payslips.slice(0, 10).map(
      (p) => `${p.employee?.firstName || ""} ${p.employee?.lastName || ""}`.trim() || p.employee?.employeeCode || "Emp"
    );
    const grossSeries = payslips.slice(0, 10).map((p) => Number(p.grossSalary || 0));
    const netSeries = payslips.slice(0, 10).map((p) => Number(p.netSalary || 0));
    const dedSeries = payslips.slice(0, 10).map((p) => Number(p.deductions || 0));

    return {
      metrics: {
        employees: employeeCount,
        grossPay: totalGrossPay,
        deductions: totalDeductions,
        totalDeductions,
        netPay: totalNetPay,
      },
      chartData: {
        categories: chartCategories,
        series: [
          { name: "Gross Pay", data: grossSeries },
          { name: "Net Pay", data: netSeries },
          { name: "Deductions", data: dedSeries },
        ],
      },
      records: payslips.map((p) => ({
        id: p.id,
        employeeName: `${p.employee?.firstName || ""} ${p.employee?.lastName || ""}`.trim() || "Employee",
        employeeCode: p.employee?.employeeCode || "N/A",
        designation: p.employee?.designation || "-",
        department: p.employee?.department?.name || "General",
        basicSalary: Number(p.grossSalary || 0) - Number(p.deductions || 0),
        grossSalary: Number(p.grossSalary || 0),
        grossPay: Number(p.grossSalary || 0),
        deductions: Number(p.deductions || 0),
        netPay: Number(p.netSalary || 0),
        period: `${p.periodMonth}/${p.periodYear}`,
        status: p.status,
      })),
    };
  }

  /**
   * 3. Leave Report: Live database aggregation
   */
  static async getLeaveReport(tenantId: string, filters: any = {}) {
    const where: any = { tenantId };
    if (filters.status) where.status = filters.status;
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.leaveTypeId) where.leaveTypeId = filters.leaveTypeId;
    if (filters.startDate || filters.endDate) {
      where.startDate = {};
      if (filters.startDate) {
        const d = new Date(filters.startDate);
        if (!isNaN(d.getTime())) where.startDate.gte = d;
      }
      if (filters.endDate) {
        const d = new Date(filters.endDate);
        if (!isNaN(d.getTime())) where.startDate.lte = d;
      }
    }

    const [statusGroups, daysAgg, leaves] = await Promise.all([
      prisma.leaveRequest.groupBy({
        by: ["status"],
        where,
        _count: true,
      }),
      prisma.leaveRequest.aggregate({
        where,
        _sum: { days: true },
        _count: true,
      }),
      prisma.leaveRequest.findMany({
        where,
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } },
          },
          leaveType: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ]);

    const totalApplications = daysAgg._count || 0;
    const totalDays = Number(daysAgg._sum.days || 0);
    const pendingCount = statusGroups.find((g) => g.status === "pending")?._count || 0;
    const approvedCount = statusGroups.find((g) => g.status === "approved")?._count || 0;
    const rejectedCount = statusGroups.find((g) => g.status === "rejected")?._count || 0;
    const approvedDays = leaves.filter((l) => l.status === "approved").reduce((s, l) => s + (l.days || 0), 0);

    return {
      metrics: {
        totalApplications,
        totalDays,
        pending: pendingCount,
        pendingRequests: pendingCount,
        approved: approvedCount,
        approvedDays,
        rejected: rejectedCount,
      },
      records: leaves.map((l) => ({
        id: l.id,
        employeeName: `${l.employee?.firstName || ""} ${l.employee?.lastName || ""}`.trim() || "Employee",
        employeeCode: l.employee?.employeeCode || "N/A",
        department: l.employee?.department?.name || "General",
        leaveType: l.leaveType?.name || "Standard Leave",
        startDate: l.startDate.toISOString().slice(0, 10),
        endDate: l.endDate.toISOString().slice(0, 10),
        days: Number(l.days || 1),
        reason: l.reason || "-",
        status: l.status,
      })),
    };
  }

  /**
   * 4. Sales Invoice Report: Live database aggregation
   */
  static async getSalesInvoiceReport(tenantId: string, filters: any = {}) {
    const where: any = { tenantId };
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.warehouseId) where.warehouseId = filters.warehouseId;
    if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;
    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = new Date(filters.startDate);
      if (filters.endDate) where.date.lte = new Date(filters.endDate);
    }

    const [agg, sales] = await Promise.all([
      prisma.sale.aggregate({
        where,
        _sum: { total: true, paidAmount: true, totalTax: true },
        _count: true,
      }),
      prisma.sale.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true } },
          warehouse: { select: { id: true, name: true } },
        },
        orderBy: { date: "desc" },
        take: 200,
      }),
    ]);

    const totalInvoices = agg._count || 0;
    const totalAmount = Number(agg._sum.total || 0);
    const paidAmount = Number(agg._sum.paidAmount || 0);
    const balanceDue = Number((totalAmount - paidAmount).toFixed(2));

    // Grouping by Customer from real database records
    const customerMap = new Map<string, any>();
    sales.forEach((s) => {
      const cName = s.customerName || s.customer?.name || "Walk-in Customer";
      const email = s.customer?.email || "-";
      if (!customerMap.has(cName)) {
        customerMap.set(cName, {
          customerName: cName,
          email,
          totalInvoices: 0,
          totalAmount: 0,
          paidAmount: 0,
          balanceDue: 0,
          invoices: [],
        });
      }
      const c = customerMap.get(cName);
      const tot = Number(s.total || 0);
      const paid = Number(s.paidAmount || 0);
      c.totalInvoices += 1;
      c.totalAmount = Number((c.totalAmount + tot).toFixed(2));
      c.paidAmount = Number((c.paidAmount + paid).toFixed(2));
      c.balanceDue = Number((c.balanceDue + (tot - paid)).toFixed(2));
      c.invoices.push({
        id: s.id,
        invoiceNo: s.invoiceNo,
        date: s.date.toISOString().slice(0, 10),
        dueDate: s.dueDate ? s.dueDate.toISOString().slice(0, 10) : "-",
        total: tot,
        paid: paid,
        status: s.paymentStatus,
      });
    });

    return {
      metrics: {
        totalInvoices,
        totalAmount,
        totalSales: totalAmount,
        paidAmount,
        balanceDue,
        totalReceivables: balanceDue,
      },
      customerGroups: Array.from(customerMap.values()),
      records: sales.map((s) => ({
        id: s.id,
        invoiceNo: s.invoiceNo,
        customerName: s.customerName || s.customer?.name || "Walk-in Customer",
        warehouseName: s.warehouse?.name || "-",
        date: s.date.toISOString().slice(0, 10),
        dueDate: s.dueDate ? s.dueDate.toISOString().slice(0, 10) : "-",
        total: Number(s.total || 0),
        paidAmount: Number(s.paidAmount || 0),
        balanceDue: Number(s.total || 0) - Number(s.paidAmount || 0),
        paymentStatus: s.paymentStatus,
      })),
    };
  }

  /**
   * 5. Purchase Invoice Report: Live database aggregation
   */
  static async getPurchaseInvoiceReport(tenantId: string, filters: any = {}) {
    const where: any = { tenantId };
    if (filters.supplierId) where.supplierId = filters.supplierId;
    if (filters.warehouseId) where.warehouseId = filters.warehouseId;
    if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;
    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = new Date(filters.startDate);
      if (filters.endDate) where.date.lte = new Date(filters.endDate);
    }

    const [agg, purchases] = await Promise.all([
      prisma.purchase.aggregate({
        where,
        _sum: { total: true, paidAmount: true },
        _count: true,
      }),
      prisma.purchase.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true, email: true } },
          warehouse: { select: { id: true, name: true } },
        },
        orderBy: { date: "desc" },
        take: 200,
      }),
    ]);

    const totalBills = agg._count || 0;
    const totalAmount = Number(agg._sum.total || 0);
    const paidAmount = Number(agg._sum.paidAmount || 0);
    const balanceDue = Number((totalAmount - paidAmount).toFixed(2));

    // Grouping by Supplier from real database records
    const supplierMap = new Map<string, any>();
    purchases.forEach((p) => {
      const sName = p.supplier?.name || "General Supplier";
      const email = p.supplier?.email || "-";
      if (!supplierMap.has(sName)) {
        supplierMap.set(sName, {
          supplierName: sName,
          email,
          totalBills: 0,
          totalAmount: 0,
          paidAmount: 0,
          balanceDue: 0,
          bills: [],
        });
      }
      const s = supplierMap.get(sName);
      const tot = Number(p.total || 0);
      const paid = Number(p.paidAmount || 0);
      s.totalBills += 1;
      s.totalAmount = Number((s.totalAmount + tot).toFixed(2));
      s.paidAmount = Number((s.paidAmount + paid).toFixed(2));
      s.balanceDue = Number((s.balanceDue + (tot - paid)).toFixed(2));
      s.bills.push({
        id: p.id,
        purchaseNo: p.purchaseNo,
        date: p.date.toISOString().slice(0, 10),
        total: tot,
        paid: paid,
        status: p.paymentStatus,
      });
    });

    return {
      metrics: {
        totalBills,
        totalAmount,
        totalPurchases: totalAmount,
        paidAmount,
        balanceDue,
        totalPayables: balanceDue,
      },
      supplierGroups: Array.from(supplierMap.values()),
      records: purchases.map((p) => ({
        id: p.id,
        purchaseNo: p.purchaseNo,
        supplierName: p.supplier?.name || "General Supplier",
        warehouseName: p.warehouse?.name || "-",
        date: p.date.toISOString().slice(0, 10),
        total: Number(p.total || 0),
        paidAmount: Number(p.paidAmount || 0),
        balanceDue: Number(p.total || 0) - Number(p.paidAmount || 0),
        paymentStatus: p.paymentStatus,
      })),
    };
  }

  /**
   * 6. Deal Pipeline Report: Live database aggregation
   */
  static async getDealPipelineReport(tenantId: string, filters: any = {}) {
    const where: any = { tenantId };
    if (filters.stage) where.stage = filters.stage;
    if (filters.pipelineId) where.pipelineId = filters.pipelineId;

    const [agg, stageGroups, deals] = await Promise.all([
      prisma.crmDeal.aggregate({
        where,
        _sum: { value: true },
        _count: true,
      }),
      prisma.crmDeal.groupBy({
        by: ["stage"],
        where,
        _count: true,
        _sum: { value: true },
      }),
      prisma.crmDeal.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ]);

    const totalDeals = agg._count || 0;
    const pipelineValue = Number(agg._sum.value || 0);

    const weightedForecast = deals.reduce((sum, d) => {
      const val = Number(d.value || 0);
      const prob = Number(d.probability || 0) / 100;
      return sum + val * prob;
    }, 0);

    const wonCount = stageGroups.find((g) => g.stage === "won")?._count || 0;
    const lostCount = stageGroups.find((g) => g.stage === "lost")?._count || 0;
    const closedCount = wonCount + lostCount;
    const winRate = closedCount > 0 ? Number(((wonCount / closedCount) * 100).toFixed(1)) : 0;

    return {
      metrics: {
        totalDeals,
        pipelineValue,
        totalPipeline: pipelineValue,
        weightedForecast: Number(weightedForecast.toFixed(2)),
        winRate,
      },
      stageBreakdown: stageGroups.map((g) => ({
        stage: g.stage,
        count: g._count,
        value: Number(g._sum.value || 0),
      })),
      records: deals.map((d) => ({
        id: d.id,
        name: d.name,
        customer: d.customer,
        stage: d.stage,
        value: Number(d.value || 0),
        probability: Number(d.probability || 0),
        closeDate: d.closeDate ? d.closeDate.toISOString().slice(0, 10) : "-",
        status: d.status,
      })),
    };
  }

  /**
   * 7. Product Stock Report: Live database aggregation
   */
  static async getProductStockReport(tenantId: string, filters: any = {}) {
    const where: any = { tenantId, isActive: true };
    if (filters.categoryId) where.categoryId = filters.categoryId;

    const products = await prisma.product.findMany({
      where,
      include: {
        warehouseStocks: { select: { quantity: true, warehouse: { select: { name: true } } } },
        category: { select: { name: true } },
        brand: { select: { name: true } },
      },
      orderBy: { name: "asc" },
      take: 200,
    });

    let totalValuation = 0;
    let inStockCount = 0;
    let lowStockCount = 0;
    let totalStockUnits = 0;

    const records = products.map((p) => {
      const totalQty = p.warehouseStocks.reduce((sum, ws) => sum + Number(ws.quantity || 0), 0);
      const unitPrice = Number(p.purchasePrice || 0);
      const val = totalQty * unitPrice;
      const isLow = totalQty <= Number(p.lowStockThreshold || 0);

      totalValuation += val;
      totalStockUnits += totalQty;
      if (totalQty > 0) inStockCount += 1;
      if (isLow) lowStockCount += 1;

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category?.name || "General",
        brand: p.brand?.name || "-",
        purchasePrice: unitPrice,
        salePrice: Number(p.salePrice || 0),
        quantity: totalQty,
        valuation: Number(val.toFixed(2)),
        lowStockThreshold: p.lowStockThreshold,
        isLowStock: isLow,
      };
    });

    return {
      metrics: {
        totalProducts: products.length,
        inventoryValuation: Number(totalValuation.toFixed(2)),
        totalStockValue: Number(totalValuation.toFixed(2)),
        totalStockUnits,
        inStockCount,
        lowStockCount,
      },
      records,
    };
  }

  /**
   * 8. Project Progress Report: Live database aggregation
   */
  static async getProjectProgressReport(tenantId: string, filters: any = {}) {
    const where: any = { tenantId };
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;

    const [agg, statusGroups, projects] = await Promise.all([
      prisma.project.aggregate({
        where,
        _sum: { budget: true },
        _avg: { progress: true },
        _count: true,
      }),
      prisma.project.groupBy({
        by: ["status"],
        where,
        _count: true,
      }),
      prisma.project.findMany({
        where,
        include: {
          tasks: { select: { id: true, status: true } },
          milestones: { select: { id: true, cost: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    const totalProjects = agg._count || 0;
    const totalBudget = Number(agg._sum.budget || 0);
    const avgProgress = Number((agg._avg.progress || 0).toFixed(1));
    const completedCount = statusGroups.find((g) => g.status?.toLowerCase() === "completed" || g.status?.toLowerCase() === "finished")?._count || 0;

    return {
      metrics: {
        totalProjects,
        totalBudget,
        avgProgress,
        completedCount,
      },
      statusBreakdown: statusGroups.map((g) => ({
        status: g.status,
        count: g._count,
      })),
      records: projects.map((p) => {
        const totalTasks = p.tasks.length;
        const completedTasks = p.tasks.filter((t) => t.status?.toLowerCase() === "completed").length;
        const actualCost = p.milestones.reduce((sum, m) => sum + Number(m.cost || 0), 0);

        return {
          id: p.id,
          name: p.name,
          clientName: p.clientName || "-",
          status: p.status,
          priority: p.priority,
          progress: p.progress || 0,
          budget: Number(p.budget || 0),
          actualCost: Number(actualCost.toFixed(2)),
          totalTasks,
          completedTasks,
          startDate: p.startDate ? p.startDate.toISOString().slice(0, 10) : "-",
          dueDate: p.dueDate ? p.dueDate.toISOString().slice(0, 10) : "-",
        };
      }),
    };
  }

  /**
   * Export Helper: Converts report datasets to sanitized, RFC 4180 compliant CSV string
   */
  static generateCsv(reportId: string, data: any): string {
    const records: any[] = data?.records || [];
    if (records.length === 0) {
      return "No records found matching report criteria.\n";
    }

    const headers = Object.keys(records[0]);
    const headerRow = headers.map(sanitizeCsvValue).join(",");
    const rows = records.map((r) =>
      headers.map((h) => sanitizeCsvValue(r[h])).join(",")
    );

    return [headerRow, ...rows].join("\n");
  }
}
