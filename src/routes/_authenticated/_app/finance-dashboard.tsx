import { usePermissions } from "@/lib/permissions";
import { AccessDenied } from "@/components/access-denied";
import { Loader2, DollarSign, ArrowUpRight, ArrowDownRight, FileText, Landmark, Wallet, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatSystemAmount } from "@/lib/currency";
import { initFlatpickr } from "@/lib/init-dashboard";
import { initFinanceCharts } from "@/lib/dashboard-charts";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/_app/finance-dashboard")({
  component: FinanceDashboardPage,
});

export default function FinanceDashboardPage() {
  const { canAccessModule, loading } = usePermissions();

  // 1. Fetch live Finance Dashboard metrics
  const { data: finData, isLoading: finLoading } = useQuery({
    queryKey: ["dashboard-finance-metrics"],
    queryFn: async () => {
      const res = await api.get<any>("/api/dashboard/finance");
      return res.data;
    },
  });

  // 2. Fetch recent invoices / payments
  const { data: invoicesRes, isLoading: invLoading } = useQuery({
    queryKey: ["dashboard-finance-invoices"],
    queryFn: async () => {
      const res = await api.get<any>("/api/invoices");
      if (Array.isArray(res.data)) return res.data;
      return res.data?.data || [];
    },
  });
  const invoices: any[] = Array.isArray(invoicesRes) ? invoicesRes : [];

  useEffect(() => {
    // 1. Bind interactive flatpickr to calendar input
    initFlatpickr();

    // 2. Initialize exact page charts
    const cleanup = initFinanceCharts();

    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <p className="text-xs text-muted-foreground font-medium animate-pulse">Verifying workspace permissions...</p>
      </div>
    );
  }

  if (!canAccessModule("finance")) {
    return (
      <AccessDenied
        moduleName="Finance Dashboard"
        requiredPermission="finance.dashboard.view"
        message="You do not have permission to access the Finance Dashboard."
      />
    );
  }

  const totalRevenue = finData?.totalRevenue ?? 0;
  const totalExpenses = finData?.totalExpenses ?? 0;
  const netProfit = finData?.netProfit ?? (totalRevenue - totalExpenses);
  const unpaidInvoices = finData?.unpaidInvoices ?? 0;
  const expenseCategories = finData?.expenseCategories || [];
  const recentInvoices = finData?.recentInvoices?.length > 0 ? finData.recentInvoices : invoices.slice(0, 5);

  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0.0";

  return (
    <div className="w-full min-w-0 flex-1">
      <div className="p-3 lg:py-6 lg:px-0">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 lg:mb-6">
          <div>
            <h1 className="text-gray-900 dark:text-gray-100 text-xl font-bold mb-0">Finance & Accounts Dashboard</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Realtime general ledger reconciliations, billing revenue, and expense outflows.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative rangepicker-input w-[174px] h-[28px] leading-none">
              <span className="absolute inset-y-0 left-0 flex items-center px-3 text-muted-foreground text-dark text-xs!">
                <i className="icon-calendar"></i>
              </span>
              <input
                type="text"
                className="form-input text-xs! h-[28px] inline-block w-full bg-light border-border-color rounded-lg focus:ring-0 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:border-border-color pl-8! ps-8!"
                data-provider="flatpickr"
                data-date-format="d M y"
                data-range-date="true"
                defaultValue="01 Jan 26 to 20 Jan 26"
                id="picker"
              />
            </div>
            <Link
              to="/accounting"
              className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 inline-flex items-center gap-1.5 hover:bg-light text-xs"
            >
              <Landmark className="w-3.5 h-3.5 text-primary" /> General Ledger
            </Link>
            <Link
              to="/invoices"
              className="btn-sm bg-dark text-white border border-dark inline-flex items-center gap-1.5 hover:bg-primary-hover text-xs"
            >
              <FileText className="w-3.5 h-3.5" /> Invoices & Billing
            </Link>
          </div>
        </div>

        {/* Section 1: Revenue vs Expense Chart & Live Invoices */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 mb-3">
          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 xxl:col-span-8 xl:col-span-7 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-0">Revenue vs Expense Inflow/Outflow</h2>
              <Badge variant="outline" className="text-xs">
                Fiscal Year 2026
              </Badge>
            </div>
            <div id="fin-rev-exp-chart"></div>
            <div className="flex items-center justify-center gap-6 mt-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-muted-foreground">Operating Revenue ({formatSystemAmount(totalRevenue)})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-orange-500"></span>
                <span className="text-muted-foreground">Operating Expense ({formatSystemAmount(totalExpenses)})</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 xxl:col-span-4 xl:col-span-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-0">Recent Billing Invoices</h2>
              <Link to="/invoices" className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 inline-flex items-center gap-1 hover:bg-light text-xs">
                View All <i className="icon-chevron-right"></i>
              </Link>
            </div>
            <div className="space-y-3">
              {recentInvoices.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">No recent invoices registered.</div>
              ) : (
                recentInvoices.slice(0, 5).map((inv: any) => {
                  const isPaid = inv.status === "paid" || inv.paymentStatus === "paid";
                  const client = inv.clientName || inv.client || "Client";
                  const amount = Number(inv.amount || inv.total || 0);

                  return (
                    <div key={inv.id} className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="size-8 rounded-md bg-light dark:bg-slate-800 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-mono text-muted-foreground mb-0">{inv.invoiceNo || inv.number}</p>
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate mb-0">{client}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-900 dark:text-gray-100 mb-0">{formatSystemAmount(amount)}</p>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded inline-block ${
                            isPaid
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                          }`}
                        >
                          {isPaid ? "Paid" : "Pending"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Financial Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 shadow-2xs">
            <div className="flex justify-between mb-2 items-center">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Operating Revenue</p>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">
                  {finLoading ? "..." : formatSystemAmount(totalRevenue)}
                </h3>
              </div>
              <div className="size-9 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] pt-2 border-t border-border-color text-emerald-600 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" /> Double-entry balanced
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 shadow-2xs">
            <div className="flex justify-between mb-2 items-center">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Operating Expenses</p>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">
                  {finLoading ? "..." : formatSystemAmount(totalExpenses)}
                </h3>
              </div>
              <div className="size-9 rounded-md bg-orange-500/10 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] pt-2 border-t border-border-color text-muted-foreground">
              <span>Claims & Payroll included</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 shadow-2xs">
            <div className="flex justify-between mb-2 items-center">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Unpaid / Due Invoices</p>
                <h3 className="text-xl font-bold text-amber-600 mb-0">
                  {finLoading ? "..." : formatSystemAmount(unpaidInvoices)}
                </h3>
              </div>
              <div className="size-9 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] pt-2 border-t border-border-color text-amber-600 font-medium">
              <span>Accounts Receivable</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 shadow-2xs">
            <div className="flex justify-between mb-2 items-center">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Net Operating Profit</p>
                <h3 className={`text-xl font-bold mb-0 ${netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {finLoading ? "..." : formatSystemAmount(netProfit)}
                </h3>
              </div>
              <div className="size-9 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Landmark className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] pt-2 border-t border-border-color text-emerald-600 font-medium">
              <span>Margin: {profitMargin}%</span>
            </div>
          </div>
        </div>

        {/* Section 3: Expense Category Breakdown & Profit Margins */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 mb-3">
          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 xl:col-span-6 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-0">Profit Margin vs Sales</h2>
              <Badge variant="outline" className="text-xs">FY 2026</Badge>
            </div>
            <div id="fin-profit-sales-chart"></div>
            <div className="flex items-center justify-center gap-6 mt-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-orange-500"></span>
                <span className="text-muted-foreground">Net Profit Margin ({profitMargin}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-muted-foreground">Net Sales Velocity</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 xl:col-span-6 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-0">Expense Cost Centers</h2>
              <Link to="/expenses" className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 inline-flex items-center gap-1 hover:bg-light text-xs">
                Manage Claims <i className="icon-chevron-right"></i>
              </Link>
            </div>
            <div id="fin-expense-donut" className="flex justify-center mb-3"></div>
            <div className="space-y-2">
              {expenseCategories.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground">No categorized expense claims yet.</div>
              ) : (
                expenseCategories.map((cat: any) => (
                  <div key={cat.id} className="flex items-center justify-between text-xs p-1.5 rounded-md hover:bg-muted/30">
                    <span className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
                      <span className="size-2 rounded-full bg-primary inline-block"></span>
                      {cat.name}
                    </span>
                    <span className="font-semibold text-muted-foreground">
                      {formatSystemAmount(Number(cat.amount || 0))}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Live Payment Transactions Table */}
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-0">Recent Invoices & Customer Receipts</h2>
            <Link to="/invoices" className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 inline-flex items-center gap-1 hover:bg-light text-xs">
              View All Invoices <i className="icon-chevron-right"></i>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border-color bg-light/50 dark:bg-slate-800/50">
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Invoice ID</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Client / Customer</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Date</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Tax Mode</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Total Amount</th>
                  <th className="text-center py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Payment Status</th>
                </tr>
              </thead>
              <tbody>
                {invLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground animate-pulse">
                      Loading financial records...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No invoices recorded yet.
                    </td>
                  </tr>
                ) : (
                  invoices.slice(0, 8).map((inv: any) => {
                    const isPaid = inv.status === "paid" || inv.paymentStatus === "paid";
                    return (
                      <tr key={inv.id} className="border-b border-border-color last:border-0 hover:bg-light/20 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-semibold text-primary">{inv.invoiceNo || inv.number}</td>
                        <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-gray-100">{inv.client || inv.customerName || "B2B Client"}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          {inv.date ? new Date(inv.date).toLocaleDateString("en-IN") : "—"}
                        </td>
                        <td className="py-2.5 px-3 uppercase text-muted-foreground">{inv.taxMode || "sgst_cgst"}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-900 dark:text-gray-100">
                          {formatSystemAmount(Number(inv.total || inv.amount || 0))}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded ${
                              isPaid
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                            }`}
                          >
                            {isPaid ? "Paid & Reconciled" : "Pending Payment"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <footer className="footer px-6 pb-3 mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground border-t border-border-color pt-4">
        <p>{new Date().getFullYear()} &copy; Master HRMS & Global SaaS ERP Enterprise</p>
      </footer>
    </div>
  );
}
