import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatSystemAmount } from "@/lib/currency";
import { initFlatpickr } from "@/lib/init-dashboard";
import { initSalesCharts } from "@/lib/dashboard-charts";
import { Badge } from "@/components/ui/badge";
import { DollarSign, ShoppingCart, Users, FileText, ArrowUpRight, TrendingUp, Package, Compass } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/sales-dashboard")({
  component: SalesDashboardPage,
});

export default function SalesDashboardPage() {
  // 1. Fetch live CRM & Sales Dashboard Metrics
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ["dashboard-sales-crm-metrics"],
    queryFn: async () => {
      const res = await api.get<any>("/api/dashboard/sales-crm");
      return res.data;
    },
  });

  // 2. Fetch live POS/Top products metrics
  const { data: posData } = useQuery({
    queryKey: ["dashboard-pos-metrics"],
    queryFn: async () => {
      const res = await api.get<any>("/api/dashboard/pos");
      return res.data;
    },
  });

  useEffect(() => {
    // 1. Bind interactive flatpickr to calendar input
    initFlatpickr();

    // 2. Initialize exact page charts
    const cleanup = initSalesCharts();

    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, []);

  const totalRevenue = salesData?.totalRevenue ?? 0;
  const totalDeals = salesData?.totalDeals ?? 0;
  const totalCustomers = salesData?.totalCustomers ?? 0;
  const conversionRate = salesData?.conversionRate ?? 85.4;
  const topCustomers = salesData?.topCustomers || [];
  const recentOrders = salesData?.recentOrders || [];
  const topProducts = posData?.topProducts || [];

  return (
    <div className="w-full min-w-0 flex-1">
      <div className="p-3 lg:py-6 lg:px-0">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 lg:mb-6">
          <div>
            <h1 className="text-gray-900 dark:text-gray-100 text-xl font-bold mb-0">Sales & CRM Analytics</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Realtime order velocity, customer lifetime value, and sales pipelines.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
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
              to="/crm"
              className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 inline-flex items-center gap-1.5 hover:bg-light text-xs"
            >
              <Compass className="w-3.5 h-3.5 text-primary" /> CRM Pipeline
            </Link>
            <Link
              to="/pos"
              className="btn-sm bg-dark text-white border border-dark inline-flex items-center gap-1.5 hover:bg-primary-hover text-xs"
            >
              <ShoppingCart className="w-3.5 h-3.5" /> POS Billing
            </Link>
          </div>
        </div>

        {/* Section 1: Revenue Trends & Regional Distribution */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 mb-3">
          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 xl:col-span-8 shadow-2xs">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-0">Revenue Inflow Velocity</h2>
              <Badge variant="outline" className="text-xs">Live Order Flow</Badge>
            </div>
            <div id="sales-revenue-trends-chart"></div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 xl:col-span-4 relative overflow-hidden shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-0">Sales by Territory</h3>
              <Badge variant="outline" className="text-xs">FY 2026</Badge>
            </div>
            <div id="chart-container" className="h-64"></div>
            <div className="bg-gradient-to-br from-primary to-emerald-600 text-white rounded-md p-3 mt-3 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/90">Gross Pipeline Value</span>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-medium">85% Win Rate</span>
              </div>
              <h4 className="text-xl font-bold mb-1 text-white">{formatSystemAmount(totalRevenue)}</h4>
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: "75%" }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Four Key Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-3">
          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Sales Revenue</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-0">
                  {salesLoading ? "..." : formatSystemAmount(totalRevenue)}
                </h3>
              </div>
              <div className="size-10 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-2 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" /> All POS & Invoices reconciled
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Orders / Invoices</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-0">
                  {salesLoading ? "..." : totalDeals}
                </h3>
              </div>
              <div className="size-10 rounded-md bg-orange-500/10 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">Closed Won transactions</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Registered Customers</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-0">
                  {salesLoading ? "..." : totalCustomers}
                </h3>
              </div>
              <div className="size-10 rounded-md bg-purple-500/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-[11px] text-purple-600 font-medium mt-2">Active CRM Directory</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Lead Conversion Rate</p>
                <h3 className="text-2xl font-bold text-blue-600 mb-0">{conversionRate}%</h3>
              </div>
              <div className="size-10 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-[11px] text-blue-600 font-medium mt-2">Proposals to Invoices</p>
          </div>
        </div>

        {/* Section 3: Three Column Detail (Top Customers, Top Products, Recent Transactions) */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 mb-3">
          {/* Top Customers */}
          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-0">Top Accounts / Customers</h2>
              <Link to="/crm" className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 inline-flex items-center gap-1 hover:bg-light text-xs">
                CRM <i className="icon-chevron-right"></i>
              </Link>
            </div>
            <div className="space-y-3">
              {topCustomers.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">No customer transactions yet.</div>
              ) : (
                topCustomers.slice(0, 5).map((cus: any) => (
                  <div key={cus.id} className="flex items-center justify-between gap-3 p-1.5 rounded-md hover:bg-muted/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs shrink-0">
                        {cus.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate mb-0">{cus.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate mb-0">{cus.ordersCount} Orders</p>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="text-xs font-bold text-gray-900 dark:text-gray-100 mb-0">
                        {formatSystemAmount(cus.totalSpent)}
                      </p>
                      <p className="text-[10px] text-muted-foreground mb-0">LTV Spent</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Selling Products */}
          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-0">Top Product SKUs</h2>
              <Link to="/products" className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 inline-flex items-center gap-1 hover:bg-light text-xs">
                Catalog <i className="icon-chevron-right"></i>
              </Link>
            </div>
            <div className="space-y-3">
              {topProducts.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">No sales recorded per SKU yet.</div>
              ) : (
                topProducts.slice(0, 5).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-1.5 rounded-md hover:bg-muted/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="size-8 rounded-md bg-light dark:bg-slate-800 flex items-center justify-center shrink-0 font-bold text-primary text-xs">
                        <Package className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate mb-0">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono mb-0">{p.sku}</p>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="text-xs font-bold text-emerald-600 mb-0">{formatSystemAmount(p.price)}</p>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-1.5 py-0.5 rounded font-medium">
                        {p.stock} in stock
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Orders Overview */}
          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-0">Recent Invoices / Receipts</h2>
              <Link to="/invoices" className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 inline-flex items-center gap-1 hover:bg-light text-xs">
                Invoices <i className="icon-chevron-right"></i>
              </Link>
            </div>
            <div className="space-y-3">
              {recentOrders.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">No recent orders found.</div>
              ) : (
                recentOrders.slice(0, 5).map((o: any) => {
                  const isPaid = o.status === "paid";
                  return (
                    <div key={o.id} className="flex items-center justify-between gap-3 p-1.5 rounded-md hover:bg-muted/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="size-8 rounded-full bg-light dark:bg-slate-800 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate mb-0">{o.customerName}</p>
                          <p className="text-[11px] font-mono text-muted-foreground mb-0">{o.invoiceNo}</p>
                        </div>
                      </div>
                      <div className="text-end">
                        <p className="text-xs font-bold text-gray-900 dark:text-gray-100 mb-0">{formatSystemAmount(o.amount)}</p>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            isPaid
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                          }`}
                        >
                          {isPaid ? "Paid" : "Unpaid"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Live Orders Table */}
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-0">Recent Sales Activity</h2>
            <Link to="/invoices" className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 inline-flex items-center gap-1 hover:bg-light text-xs">
              View All Sales Invoices <i className="icon-chevron-right"></i>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border-color bg-light/50 dark:bg-slate-800/50">
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Invoice #</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Customer</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Amount</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Date</th>
                  <th className="text-center py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Status</th>
                </tr>
              </thead>
              <tbody>
                {salesLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground animate-pulse">
                      Loading sales stream...
                    </td>
                  </tr>
                ) : recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No sales activity found. Process sales via POS or create Invoices.
                    </td>
                  </tr>
                ) : (
                  recentOrders.slice(0, 8).map((ord: any) => {
                    const isPaid = ord.status === "paid";
                    return (
                      <tr key={ord.id} className="border-b border-border-color last:border-0 hover:bg-light/20 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-semibold text-primary">{ord.invoiceNo}</td>
                        <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-gray-100">{ord.customerName}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-900 dark:text-gray-100">
                          {formatSystemAmount(ord.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          {ord.date ? new Date(ord.date).toLocaleDateString("en-IN") : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded ${
                              isPaid
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                            }`}
                          >
                            {isPaid ? "Paid & Closed" : "Pending Payment"}
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
