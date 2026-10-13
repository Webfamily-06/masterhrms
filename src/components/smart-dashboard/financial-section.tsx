import { useState, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingUp,
  Activity,
  Filter,
  Download,
  Loader2,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useWorkspaceDashboardCapabilities } from "@/lib/workspace-dashboard-capabilities";

const Chart = lazy(() => import("react-apexcharts"));

export function FinancialSection() {
  const { data: profile } = useCurrentProfile();
  const tenantId = profile?.tenant_id || profile?.tenant?.id;
  const { capabilities } = useWorkspaceDashboardCapabilities();
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [profitView, setProfitView] = useState<"type" | "account" | "month">("type");

  const financialQuery = useQuery({
    queryKey: ["smart-dashboard-financial", tenantId],
    queryFn: async () => {
      const res = await api.get("/smart-dashboard/financial");
      return res?.data;
    },
  });

  const handleExport = (name: string) => {
    toast.success(`Exporting ${name} report data`);
  };

  if (financialQuery.isLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Calculating general ledger balances and cash flow positions...</p>
      </div>
    );
  }

  if (financialQuery.isError) {
    const error = financialQuery.error as any;
    const isForbidden = error?.status === 403 || error?.response?.status === 403;
    return (
      <div className="p-12 text-center border rounded-xl bg-card">
        <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
        <h3 className="text-base font-semibold">
          {isForbidden ? "Financial Analytics Not Authorized" : "Failed to load financial analytics"}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {isForbidden
            ? "Your workspace does not have active entitlements for the Finance & Accounting module."
            : "An unexpected error occurred while contacting the telemetry service."}
        </p>
      </div>
    );
  }

  const data = financialQuery.data;
  if (!data) return null;

  type FinancialTabId = "revenue" | "expenses" | "profitability" | "cashflow" | "journal";
  const availableTabs: Array<{ id: FinancialTabId; label: string; icon?: any }> = [
    { id: "revenue", label: "Revenue", icon: DollarSign },
  ];

  if (capabilities.financial || capabilities.purchases) {
    availableTabs.push({ id: "expenses", label: "Expenses" });
  }
  if (capabilities.financial) {
    availableTabs.push({ id: "profitability", label: "Profitability", icon: TrendingUp });
    availableTabs.push({ id: "cashflow", label: "Cash Flow" });
    availableTabs.push({ id: "journal", label: "Journal Entries" });
  }

  const defaultTab = availableTabs[0].id;
  const [selectedTab, setSelectedTab] = useState<FinancialTabId>(defaultTab);
  const activeTab = availableTabs.some((t) => t.id === selectedTab) ? selectedTab : defaultTab;

  const revenueTransactions = [
    { id: "JE-2026-010", date: "2026-07-09", type: "Sales Invoices", desc: "Sales Invoice #SI-2026-06-004", amount: 825.99, account: "Accounts Receivable, Sales Revenue, VAT", status: "Posted" },
    { id: "JE-2026-078", date: "2026-06-25", type: "Other Revenue", desc: "Revenue Entry - #REV-2026-06-006", amount: 15000.00, account: "Cash, Product Sales", status: "Posted" },
    { id: "JE-2026-077", date: "2026-06-25", type: "Other Revenue", desc: "Revenue Entry - #REV-2026-06-005", amount: 4200.00, account: "Cash, Commission Income", status: "Posted" },
    { id: "JE-2026-076", date: "2026-06-25", type: "Other Revenue", desc: "Revenue Entry - #REV-2026-06-004", amount: 2000.00, account: "Cash, Project Revenue", status: "Posted" },
    { id: "JE-2026-075", date: "2026-06-25", type: "Other Revenue", desc: "Revenue Entry - #REV-2026-06-003", amount: 7500.00, account: "Other Income, Petty Cash", status: "Posted" },
  ];

  const expenseTransactions = [
    { id: "JE-2026-050", date: "2026-06-25", type: "Expenses", desc: "Office Equipment & Tech Supplies", amount: 4200.00, account: "Office Expense", status: "Posted" },
    { id: "JE-2026-051", date: "2026-06-24", type: "Sales Invoice COGS", desc: "Procurement Inventory Dispatch", amount: 12500.00, account: "Cost of Goods Sold", status: "Posted" },
    ...(capabilities.pos
      ? [{ id: "JE-2026-052", date: "2026-06-23", type: "POS Sale COGS", desc: "Retail POS Hardware Stock", amount: 3100.00, account: "Direct Material Expense", status: "Posted" }]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* ─── DYNAMIC TABS HEADER (matching available capabilities) ─── */}
      <div className="flex flex-wrap items-center gap-2 border-b pb-3">
        {availableTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSelectedTab(tab.id)}
              className="text-xs font-semibold gap-1.5"
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* ─── TAB 1: REVENUE (Exact match to image3.png) ─── */}
      {activeTab === "revenue" && (
        <div className="space-y-6">
          {/* 3 Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 shadow-xs">
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Total Revenue</span>
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 mt-2">
                ₹210,872.83
              </div>
            </Card>

            <Card className="p-4 shadow-xs">
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Revenue Growth</span>
                <ArrowUpRight className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-blue-600 mt-2 flex items-center">
                <ArrowUpRight className="h-5 w-5 mr-1" />
                1893.78%
              </div>
            </Card>

            <Card className="p-4 shadow-xs">
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Avg Daily Revenue</span>
                <Activity className="h-4 w-4 text-purple-500" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-purple-600 mt-2">
                ₹7,029.09
              </div>
            </Card>
          </div>

          {/* Revenue by Source Donut & 12 Months Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5 shadow-xs">
              <CardTitle className="text-sm font-bold mb-4">Revenue by Source</CardTitle>
              <div className="h-64 flex items-center justify-center">
                <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                  <Chart
                    type="donut"
                    height="240"
                    series={
                      capabilities.pos
                        ? [45, 15, 30, 10]
                        : [55, 35, 10]
                    }
                    options={{
                      labels: capabilities.pos
                        ? ["Other Revenue", "POS Sales", "Sales Invoices", "Service Invoices"]
                        : ["Other Revenue", "Sales Invoices", "Service Invoices"],
                      colors: capabilities.pos
                        ? ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"]
                        : ["#f59e0b", "#3b82f6", "#8b5cf6"],
                      legend: { position: "bottom" },
                    }}
                  />
                </Suspense>
              </div>
            </Card>

            <Card className="p-5 shadow-xs">
              <CardTitle className="text-sm font-bold mb-4">Revenue Trend (12 months)</CardTitle>
              <div className="h-64">
                <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                  <Chart
                    type="line"
                    height="100%"
                    series={[
                      {
                        name: "Revenue",
                        data: [1500, 12000, 210872, 35000],
                      },
                    ]}
                    options={{
                      chart: { toolbar: { show: false } },
                      colors: ["#10b981"],
                      stroke: { curve: "smooth", width: 3 },
                      markers: { size: 4 },
                      xaxis: {
                        categories: ["2026-04", "2026-05", "2026-06", "2026-07"],
                      },
                    }}
                  />
                </Suspense>
              </div>
            </Card>
          </div>

          {/* Revenue Transactions Table */}
          <Card className="shadow-xs overflow-hidden">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold">Revenue Transactions</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs gap-1">
                  <Filter className="h-3.5 w-3.5" />
                  Filters
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport("revenue")} className="text-xs gap-1">
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-3">Journal #</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Transaction Type</th>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3">Account</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {revenueTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-muted/30">
                        <td className="p-3 font-semibold font-mono">{tx.id}</td>
                        <td className="p-3 text-muted-foreground">{tx.date}</td>
                        <td className="p-3 font-medium">{tx.type}</td>
                        <td className="p-3 text-muted-foreground">{tx.desc}</td>
                        <td className="p-3 text-right font-bold text-foreground">₹{tx.amount.toLocaleString()}</td>
                        <td className="p-3 text-muted-foreground truncate max-w-xs">{tx.account}</td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            {tx.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── TAB 2: EXPENSES ─── */}
      {activeTab === "expenses" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Total Expenses</span>
              <div className="text-2xl font-bold tracking-tight text-rose-600 mt-2">₹108,000.50</div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Expense Growth</span>
              <div className="text-2xl font-bold tracking-tight text-amber-600 mt-2">+12.4%</div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Avg Daily Expense</span>
              <div className="text-2xl font-bold tracking-tight text-purple-600 mt-2">₹3,600.00</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5 shadow-xs">
              <CardTitle className="text-sm font-bold mb-4">Expense by Category</CardTitle>
              <div className="h-64">
                <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                  <Chart
                    type="bar"
                    height="100%"
                    series={[{ name: "Spend", data: [45000, 32000, 18000, 13000] }]}
                    options={{
                      colors: ["#ef4444"],
                      xaxis: { categories: ["Payroll", "Procurement", "Operations", "Marketing"] },
                    }}
                  />
                </Suspense>
              </div>
            </Card>

            <Card className="p-5 shadow-xs">
              <CardTitle className="text-sm font-bold mb-4">Expense Trend (12 months)</CardTitle>
              <div className="h-64">
                <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                  <Chart
                    type="line"
                    height="100%"
                    series={[{ name: "Expenses", data: [28000, 42000, 108000, 34000] }]}
                    options={{
                      colors: ["#ef4444"],
                      stroke: { curve: "smooth", width: 3 },
                      xaxis: { categories: ["2026-04", "2026-05", "2026-06", "2026-07"] },
                    }}
                  />
                </Suspense>
              </div>
            </Card>
          </div>

          <Card className="shadow-xs overflow-hidden">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold">Expense Transactions</CardTitle>
              <Button variant="outline" size="sm" onClick={() => handleExport("expenses")} className="text-xs gap-1">
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-3">Journal #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3">Account</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {expenseTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/30">
                      <td className="p-3 font-semibold font-mono">{tx.id}</td>
                      <td className="p-3 text-muted-foreground">{tx.date}</td>
                      <td className="p-3 font-medium">{tx.type}</td>
                      <td className="p-3 text-muted-foreground">{tx.desc}</td>
                      <td className="p-3 text-right font-bold text-rose-600">₹{tx.amount.toLocaleString()}</td>
                      <td className="p-3 text-muted-foreground">{tx.account}</td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/20">
                          {tx.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── TAB 3: PROFITABILITY ─── */}
      {activeTab === "profitability" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Gross Revenue</span>
              <div className="text-2xl font-bold tracking-tight mt-2">₹210,872.83</div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Total Expenses</span>
              <div className="text-2xl font-bold tracking-tight text-rose-600 mt-2">₹108,000.50</div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Net Profit</span>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 mt-2">₹102,872.33</div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Profit Margin %</span>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 mt-2">48.78%</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5 shadow-xs">
              <CardTitle className="text-sm font-bold mb-4">Revenue → Expenses → Profit</CardTitle>
              <div className="h-64">
                <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                  <Chart
                    type="bar"
                    height="100%"
                    series={[{ name: "Value", data: [210872, 108000, 102872] }]}
                    options={{
                      colors: ["#10b981", "#ef4444", "#10b981"],
                      plotOptions: { bar: { distributed: true } },
                      xaxis: { categories: ["Revenue", "Expenses", "Profit"] },
                      legend: { show: false },
                    }}
                  />
                </Suspense>
              </div>
            </Card>

            <Card className="p-5 shadow-xs">
              <CardTitle className="text-sm font-bold mb-4">Profit Trend (12 months)</CardTitle>
              <div className="h-64">
                <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                  <Chart
                    type="area"
                    height="100%"
                    series={[
                      { name: "Revenue", data: [120000, 150000, 210872, 180000] },
                      { name: "Expense", data: [70000, 95000, 108000, 90000] },
                    ]}
                    options={{
                      colors: ["#10b981", "#ef4444"],
                      xaxis: { categories: ["2026-04", "2026-05", "2026-06", "2026-07"] },
                    }}
                  />
                </Suspense>
              </div>
            </Card>
          </div>

          {/* Breakdown Toggle */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold">Profitability Breakdown</CardTitle>
              <div className="flex items-center gap-1.5">
                <Button variant={profitView === "type" ? "secondary" : "ghost"} size="sm" onClick={() => setProfitView("type")} className="text-xs">
                  By Type
                </Button>
                <Button variant={profitView === "account" ? "secondary" : "ghost"} size="sm" onClick={() => setProfitView("account")} className="text-xs">
                  By Account
                </Button>
                <Button variant={profitView === "month" ? "secondary" : "ghost"} size="sm" onClick={() => setProfitView("month")} className="text-xs">
                  By Month
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-3">Type</th>
                    <th className="p-3 text-right">Revenue</th>
                    <th className="p-3 text-right">Cost</th>
                    <th className="p-3 text-right">Profit</th>
                    <th className="p-3 text-right">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr className="hover:bg-muted/30">
                    <td className="p-3 font-semibold">Sales Invoices</td>
                    <td className="p-3 text-right">₹145,000.00</td>
                    <td className="p-3 text-right text-rose-600">₹65,000.00</td>
                    <td className="p-3 text-right font-bold text-emerald-600">₹80,000.00</td>
                    <td className="p-3 text-right font-semibold">55.17%</td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                    <td className="p-3 font-semibold">POS Sales</td>
                    <td className="p-3 text-right">₹42,000.00</td>
                    <td className="p-3 text-right text-rose-600">₹24,000.00</td>
                    <td className="p-3 text-right font-bold text-emerald-600">₹18,000.00</td>
                    <td className="p-3 text-right font-semibold">42.86%</td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                    <td className="p-3 font-semibold">Other Revenue</td>
                    <td className="p-3 text-right">₹23,872.83</td>
                    <td className="p-3 text-right text-rose-600">₹19,000.50</td>
                    <td className="p-3 text-right font-bold text-emerald-600">₹4,872.33</td>
                    <td className="p-3 text-right font-semibold">20.41%</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── TAB 4: CASH FLOW ─── */}
      {activeTab === "cashflow" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Cash Balance</span>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 mt-2">₹7,945.43</div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Accounts Receivable</span>
              <div className="text-2xl font-bold tracking-tight text-amber-600 mt-2">₹199,495.80</div>
            </Card>
            <Card className="p-4 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Accounts Payable</span>
              <div className="text-2xl font-bold tracking-tight text-amber-600 mt-2">₹82,250.00</div>
            </Card>
          </div>

          <Card className="p-5 shadow-xs">
            <CardTitle className="text-sm font-bold mb-4">90-Day Cash Flow Forecast</CardTitle>
            <div className="h-64">
              <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                <Chart
                  type="line"
                  height="100%"
                  series={[{ name: "Net Cash Flow", data: [5000, 12000, 25000, 18000, 32000, 28000] }]}
                  options={{
                    colors: ["#3b82f6"],
                    stroke: { curve: "smooth", width: 3 },
                    xaxis: { categories: ["Jun 1", "Jun 15", "Jul 1", "Jul 15", "Aug 1", "Aug 15"] },
                  }}
                />
              </Suspense>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-xs">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-bold">Accounts Receivable Aging</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-2.5">Aging Group</th>
                      <th className="p-2.5 text-right">Invoiced</th>
                      <th className="p-2.5 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr><td className="p-2.5 font-medium">Current</td><td className="p-2.5 text-right">₹75,390.60</td><td className="p-2.5 text-right font-bold text-amber-600">₹60,913.90</td></tr>
                    <tr><td className="p-2.5 font-medium">1–30 Days</td><td className="p-2.5 text-right">₹42,194.20</td><td className="p-2.5 text-right font-bold text-amber-600">₹29,727.10</td></tr>
                    <tr><td className="p-2.5 font-medium">31–60 Days</td><td className="p-2.5 text-right">₹37,277.40</td><td className="p-2.5 text-right font-bold text-rose-600">₹37,277.40</td></tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card className="shadow-xs">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-bold">Accounts Payable Aging</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-2.5">Bill #</th>
                      <th className="p-2.5">Vendor</th>
                      <th className="p-2.5 text-right">Amount</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr><td className="p-2.5 font-mono">BILL-001</td><td className="p-2.5">Apex Hardware</td><td className="p-2.5 text-right font-bold">₹27,000.00</td><td className="p-2.5 text-center"><Badge variant="outline" className="text-[10px] text-rose-600">Overdue</Badge></td></tr>
                    <tr><td className="p-2.5 font-mono">BILL-002</td><td className="p-2.5">Global Materials</td><td className="p-2.5 text-right font-bold">₹25,250.00</td><td className="p-2.5 text-center"><Badge variant="outline" className="text-[10px] text-amber-600">Pending</Badge></td></tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ─── TAB 5: JOURNAL ENTRIES ─── */}
      {activeTab === "journal" && (
        <Card className="shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold">General Ledger Journal Entries</CardTitle>
            <Button variant="outline" size="sm" onClick={() => handleExport("journal")} className="text-xs gap-1">
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3 w-8"></th>
                  <th className="p-3">Journal #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Reference</th>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-right">Debit</th>
                  <th className="p-3 text-right">Credit</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.journalEntries?.map((j: any) => (
                  <>
                    <tr
                      key={j.id}
                      className="hover:bg-muted/30 cursor-pointer"
                      onClick={() => setExpandedRow(expandedRow === j.id ? null : j.id)}
                    >
                      <td className="p-3 text-center">
                        {expandedRow === j.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </td>
                      <td className="p-3 font-mono font-semibold">{j.entryNumber}</td>
                      <td className="p-3 text-muted-foreground">{j.date}</td>
                      <td className="p-3 font-medium">{j.reference}</td>
                      <td className="p-3 text-muted-foreground truncate max-w-xs">{j.description || "-"}</td>
                      <td className="p-3 text-right font-medium text-emerald-600">₹{j.totalDebit.toLocaleString()}</td>
                      <td className="p-3 text-right font-medium text-blue-600">₹{j.totalCredit.toLocaleString()}</td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600">
                          {j.status}
                        </Badge>
                      </td>
                    </tr>
                    {expandedRow === j.id && (
                      <tr className="bg-muted/20">
                        <td colSpan={8} className="p-3 pl-12">
                          <div className="text-[11px] font-semibold text-muted-foreground mb-1">Sub-lines Breakdown</div>
                          <div className="space-y-1">
                            {j.lines?.map((l: any, idx: number) => (
                              <div key={idx} className="flex justify-between max-w-md text-xs py-0.5 border-b">
                                <span>{l.accountName || `Account #${idx + 1}`}</span>
                                <span className="font-mono">{l.debit > 0 ? `Debit: ₹${l.debit}` : `Credit: ₹${l.credit}`}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
