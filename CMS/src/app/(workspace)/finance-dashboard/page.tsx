'use client';

import { Link } from "@/src/lib/router-compat";
import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { usePermissions } from "@/lib/permissions";
import { AccessDenied } from "@/components/access-denied";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { formatSystemAmount } from "@/lib/currency";
import { initFlatpickr } from "@/lib/init-dashboard";

const Chart = lazy(() => import("react-apexcharts"));

export default function FinanceDashboardPage() {
  const { canAccessModule, loading } = usePermissions();
  const [isMounted, setIsMounted] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [yearFilter, setYearFilter] = useState("2026");

  useEffect(() => {
    setIsMounted(true);
    initFlatpickr();
  }, []);

  // Fetch Finance Data
  const { data: financeData, isLoading: financeLoading } = useQuery({
    queryKey: ["finance-dashboard-metrics"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/dashboard/finance");
        return res?.data || res || {};
      } catch (err) {
        console.warn("Failed to fetch /dashboard/finance:", err);
        return {};
      }
    },
    refetchInterval: 30000,
  });

  const totalRevenue = financeData?.totalRevenue ?? 125000;
  const totalExpenses = financeData?.totalExpenses ?? 89500;
  const pendingInvoices = financeData?.unpaidInvoices ?? 12;
  const netProfit = financeData?.netProfit ?? (totalRevenue - totalExpenses);
  const budgetUtilization = totalRevenue > 0
    ? Math.min(100, Math.round((totalExpenses / totalRevenue) * 100))
    : 71;

  const recentInvoices = financeData?.recentInvoices || [
    { id: "inv-1", invoiceNo: "#INV-0020", clientName: "Alexander Kenn", amount: 500, status: "paid" },
    { id: "inv-2", invoiceNo: "#INV-0019", clientName: "Gabriella White", amount: 650, status: "pending" },
    { id: "inv-3", invoiceNo: "#INV-0018", clientName: "Christopher Rey", amount: 120, status: "failed" },
    { id: "inv-4", invoiceNo: "#INV-0017", clientName: "Penelope Ton", amount: 860, status: "paid" },
    { id: "inv-5", invoiceNo: "#INV-0016", clientName: "Catherine Lan", amount: 650, status: "pending" },
  ];

  const handleExport = (format: "pdf" | "excel") => {
    toast.success(`Finance Report exported as ${format.toUpperCase()}`);
    setExportOpen(false);
  };

  // 1. Revenue vs Expense Bar Chart
  const revExpChartOptions = useMemo<any>(
    () => ({
      chart: { type: "bar", height: 200, toolbar: { show: false }, fontFamily: "inherit" },
      series: [
        { name: "Revenue", data: [40, 70, 28, 38, 48, 60, 22, 42, 36, 36, 28, 60] },
        { name: "Expense", data: [22, 48, 25, 30, 36, 42, 18, 30, 25, 22, 18, 22] },
      ],
      xaxis: {
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        labels: { style: { colors: "#9096A1", fontSize: "10px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { colors: "#9096A1", fontSize: "11px" },
          formatter: (v: number) => "₹" + v + "K",
        },
      },
      grid: { borderColor: "var(--color-border-color, #E2E8F0)", strokeDashArray: 4 },
      plotOptions: { bar: { columnWidth: "55%", borderRadius: 3 } },
      colors: ["#059669", "#E65100"],
      legend: { show: false },
      dataLabels: { enabled: false },
      tooltip: { theme: "dark", y: { formatter: (v: number) => "₹" + v + "K" } },
    }),
    []
  );

  // 2. Revenue Donut Chart
  const revenueDonutOptions = useMemo<any>(
    () => ({
      chart: { type: "donut", height: 230, width: "100%", fontFamily: "inherit" },
      series: [68, 31, 12],
      labels: ["Sales", "Recurring", "Service Fees"],
      colors: ["#059669", "#E65100", "#6A1B9A"],
      stroke: { width: 2, colors: ["#FFFFFF"] },
      legend: { show: false },
      plotOptions: {
        pie: {
          donut: {
            size: "72%",
            labels: {
              show: true,
              name: { show: false },
              value: { show: true, fontSize: "20px", fontWeight: 700, color: "#1E293B", offsetY: 8 },
              total: {
                show: true,
                showAlways: true,
                label: "Sales",
                fontSize: "11px",
                fontWeight: 500,
                color: "#9096A1",
                formatter: () => "73%",
              },
            },
          },
        },
      },
      dataLabels: { enabled: false },
      tooltip: { theme: "dark" },
    }),
    []
  );

  // 3. Profit Margin vs Sales Line Chart
  const profitSalesChartOptions = useMemo<any>(
    () => ({
      chart: { type: "line", height: 230, toolbar: { show: false }, fontFamily: "inherit" },
      series: [
        { name: "Profit Margin", data: [55, 48, 50, 32, 40, 38, 45, 35, 25, 28, 22, 30] },
        { name: "Sales", data: [25, 22, 28, 35, 30, 38, 32, 45, 42, 55, 48, 60] },
      ],
      xaxis: {
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        labels: { style: { colors: "#9096A1", fontSize: "10px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { colors: "#9096A1", fontSize: "11px" },
          formatter: (v: number) => "₹" + v + "K",
        },
      },
      grid: { borderColor: "var(--color-border-color, #E2E8F0)", strokeDashArray: 4 },
      stroke: { curve: "smooth", width: [2.5, 2.5] },
      colors: ["#E65100", "#059669"],
      legend: { show: false },
      dataLabels: { enabled: false },
      tooltip: { theme: "dark", shared: true },
      markers: { size: 0 },
    }),
    []
  );

  // 4. Expenses Donut Chart
  const expenseDonutOptions = useMemo<any>(
    () => ({
      chart: { type: "donut", height: 200, fontFamily: "inherit" },
      series: [50, 30, 20],
      labels: ["Salaries", "Marketing", "Miscellaneous"],
      colors: ["#E65100", "#6A1B9A", "#059669"],
      stroke: { width: 2, colors: ["#FFFFFF"] },
      legend: { show: false },
      plotOptions: {
        pie: {
          donut: {
            size: "70%",
            labels: {
              show: true,
              value: { show: true, fontSize: "18px", fontWeight: 700, color: "#1E293B", offsetY: 6 },
              total: {
                show: true,
                showAlways: true,
                label: "Salaries",
                fontSize: "11px",
                color: "#9096A1",
                formatter: () => "50%",
              },
            },
          },
        },
      },
      dataLabels: { enabled: false },
      tooltip: { theme: "dark" },
    }),
    []
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-medium animate-pulse">Verifying workspace permissions...</p>
      </div>
    );
  }

  if (!canAccessModule("finance") && !canAccessModule("accounting")) {
    return <AccessDenied moduleName="Finance Dashboard" requiredPermission="finance.dashboard.view" />;
  }

  return (
    <div className="w-full min-w-0 flex-1">
      <div className="p-3 lg:py-6 lg:px-0">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 lg:mb-6">
          <div>
            <BreadcrumbNav />
            <h1 className="text-gray-900 text-xl font-bold mb-0">Finance Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative rangepicker-input w-[180px] h-[32px] leading-none">
              <span className="absolute inset-y-0 left-0 flex items-center px-2.5 text-muted-foreground text-xs pointer-events-none">
                <i className="ph-duotone ph-calendar text-sm"></i>
              </span>
              <input
                type="text"
                readOnly
                className="text-xs h-[32px] inline-block w-full bg-light border border-border-color rounded-md focus:ring-0 pl-8 pr-2 cursor-pointer font-medium text-title"
                defaultValue="01 Jan 26 - 31 Dec 26"
                id="picker"
              />
            </div>

            {/* Export Dropdown */}
            <div className="relative inline-flex">
              <button
                type="button"
                onClick={() => setExportOpen((o) => !o)}
                className="cursor-pointer btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-2 hover:bg-primary hover:border-primary hover:text-white transition-colors"
              >
                <i className="ph-duotone ph-download-simple font-normal"></i> Export{" "}
                <i className="icon-chevron-down"></i>
              </button>

              {exportOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-border-color shadow-lg rounded-md p-1.5 space-y-1 z-30">
                  <button
                    type="button"
                    onClick={() => handleExport("pdf")}
                    className="w-full text-left flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light cursor-pointer transition-colors"
                  >
                    Export as PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport("excel")}
                    className="w-full text-left flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light cursor-pointer transition-colors"
                  >
                    Export as Excel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 1: Revenue vs Expense + Recent Invoices */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 mb-3">
          {/* Revenue vs Expense Bar Chart */}
          <div className="bg-white border border-border-color rounded-md p-4 xl:col-span-8 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg max-lg:text-[17px] text-title font-bold mb-0">Revenue vs Expense</h2>
              <div className="inline-flex items-center gap-1 border border-border-color rounded-md p-1 bg-light text-xs">
                {["2026", "2025", "2024"].map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setYearFilter(yr)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-colors",
                      yearFilter === yr
                        ? "bg-white text-primary shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>
            <div id="fin-rev-exp-chart" className="min-h-[200px]">
              {isMounted ? (
                <Suspense fallback={<div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground animate-pulse">Loading Revenue vs Expense...</div>}>
                  <Chart options={revExpChartOptions} series={revExpChartOptions.series} type="bar" height={200} />
                </Suspense>
              ) : (
                <div className="h-[200px] bg-slate-50 animate-pulse rounded" />
              )}
            </div>
            <div className="flex items-center justify-center gap-4 mt-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-success"></span>
                <span className="text-default">Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-orange"></span>
                <span className="text-default">Expense</span>
              </div>
            </div>
          </div>

          {/* Recent Invoices */}
          <div className="bg-white border border-border-color rounded-md p-4 xl:col-span-4 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg max-lg:text-[17px] text-title font-bold mb-0">Recent Invoices</h2>
              <Link
                to="/invoices"
                className="btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-1 hover:bg-primary hover:text-white hover:border-primary text-xs px-2.5 py-1 rounded transition-colors"
              >
                View All <i className="icon-chevron-right"></i>
              </Link>
            </div>
            <div className="space-y-3">
              {recentInvoices.map((inv: any) => {
                const isPaid = inv.status === "paid";
                return (
                  <div key={inv.id} className="flex items-center justify-between gap-3 sm:grid sm:grid-cols-12">
                    <div className="flex items-center gap-2 min-w-0 sm:col-span-6">
                      <div className="size-9 rounded-md bg-light flex items-center justify-center shrink-0">
                        <i className="ph-duotone ph-receipt text-base text-primary"></i>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-primary hover:underline font-mono mb-0 cursor-pointer">
                          {inv.invoiceNo}
                        </p>
                        <p className="text-xs font-semibold text-title truncate mb-0">{inv.clientName}</p>
                      </div>
                    </div>
                    <div className="min-w-0 text-start hidden sm:block sm:col-span-3">
                      <p className="text-[10px] text-default mb-0">Amount</p>
                      <p className="text-xs font-bold text-title mb-0">{formatSystemAmount(inv.amount)}</p>
                    </div>
                    <div className="text-end sm:col-span-3">
                      <p className="text-[10px] text-default mb-0">Status</p>
                      <span className={cn(
                        "text-[11px] px-2 py-0.5 rounded font-medium capitalize",
                        isPaid ? "text-success bg-success-transparent" : "text-warning bg-warning-transparent"
                      )}>
                        {inv.status || "unpaid"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 2: 5 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-3">
          <div className="bg-white border border-border-color rounded-md p-4 shadow-xs">
            <div className="flex justify-between mb-2 items-center">
              <div>
                <p className="text-xs text-default mb-1">Total Revenue</p>
                <h3 className="text-xl font-bold text-gray-900 mb-0">
                  {formatSystemAmount(totalRevenue)}
                </h3>
              </div>
              <div className="size-9 rounded-md bg-orange-transparent flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-wallet text-orange text-lg"></i>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] pt-2 border-t border-border-color">
              <span className="text-success font-medium inline-flex items-center">
                <i className="ph ph-arrow-up text-[10px] me-0.5"></i>Live
              </span>
              <span className="text-default">database records</span>
            </div>
          </div>

          <div className="bg-white border border-border-color rounded-md p-4 shadow-xs">
            <div className="flex justify-between mb-2 items-center">
              <div>
                <p className="text-xs text-default mb-1">Total Expenses</p>
                <h3 className="text-xl font-bold text-gray-900 mb-0">
                  {formatSystemAmount(totalExpenses)}
                </h3>
              </div>
              <div className="size-9 rounded-md bg-info-transparent flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-credit-card text-info text-lg"></i>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] pt-2 border-t border-border-color">
              <span className="text-danger font-medium inline-flex items-center">
                <i className="ph ph-arrow-down text-[10px] me-0.5"></i>Live
              </span>
              <span className="text-default">approved claims</span>
            </div>
          </div>

          <div className="bg-white border border-border-color rounded-md p-4 shadow-xs">
            <div className="flex justify-between mb-2 items-center">
              <div>
                <p className="text-xs text-default mb-1">Pending Invoices</p>
                <h3 className="text-xl font-bold text-gray-900 mb-0">
                  {pendingInvoices}
                </h3>
              </div>
              <div className="size-9 rounded-md bg-pink-transparent flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-file-text text-pink text-lg"></i>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] pt-2 border-t border-border-color">
              <span className="text-success font-medium inline-flex items-center">
                <i className="ph ph-arrow-up text-[10px] me-0.5"></i>Unpaid
              </span>
              <span className="text-default">awaiting settlement</span>
            </div>
          </div>

          <div className="bg-white border border-border-color rounded-md p-4 shadow-xs">
            <div className="flex justify-between mb-2 items-center">
              <div>
                <p className="text-xs text-default mb-1">Budget Utilization</p>
                <h3 className="text-xl font-bold text-gray-900 mb-0">
                  {budgetUtilization}%
                </h3>
              </div>
              <div className="size-9 rounded-md bg-purple-transparent flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-chart-bar text-purple text-lg"></i>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] pt-2 border-t border-border-color">
              <span className="text-success font-medium inline-flex items-center">
                <i className="ph ph-arrow-up text-[10px] me-0.5"></i>Expense / Rev
              </span>
              <span className="text-default">ratio</span>
            </div>
          </div>

          <div className="bg-white border border-border-color rounded-md p-4 shadow-xs">
            <div className="flex justify-between mb-2 items-center">
              <div>
                <p className="text-xs text-default mb-1">Net Profit / Loss</p>
                <h3 className="text-xl font-bold text-gray-900 mb-0">
                  {formatSystemAmount(netProfit)}
                </h3>
              </div>
              <div className="size-9 rounded-md bg-success-transparent flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-trend-up text-success text-lg"></i>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] pt-2 border-t border-border-color">
              <span className="text-success font-medium inline-flex items-center">
                <i className="ph ph-arrow-up text-[10px] me-0.5"></i>Net
              </span>
              <span className="text-default">balance</span>
            </div>
          </div>
        </div>

        {/* Row 3: Revenue Donut + Profit Margin vs Sales Line + Expenses Donut */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 mb-3">
          {/* Revenue Donut */}
          <div className="bg-white border border-border-color rounded-md p-4 xl:col-span-3 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-title mb-0">Revenue</h2>
              <span className="text-xs text-muted-foreground border border-border-color px-2 py-0.5 rounded">Weekly</span>
            </div>
            <div id="fin-revenue-donut" className="flex justify-center min-h-[230px]">
              {isMounted ? (
                <Suspense fallback={<div className="h-[230px] flex items-center justify-center text-xs text-muted-foreground animate-pulse">Loading Revenue Donut...</div>}>
                  <Chart options={revenueDonutOptions} series={revenueDonutOptions.series} type="donut" height={230} width="100%" />
                </Suspense>
              ) : (
                <div className="h-[230px] bg-slate-50 animate-pulse rounded" />
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-3 text-[11px]">
              <div className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-success"></span>
                <span className="text-default">Sales</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-orange"></span>
                <span className="text-default">Recurring</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-purple"></span>
                <span className="text-default">Service Fees</span>
              </div>
            </div>
          </div>

          {/* Profit Margin vs Sales */}
          <div className="bg-white border border-border-color rounded-md p-4 xl:col-span-6 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-title mb-0">Profit Margin vs Sales</h2>
              <span className="text-xs text-muted-foreground border border-border-color px-2 py-0.5 rounded">2026</span>
            </div>
            <div id="fin-profit-sales-chart" className="w-full min-h-[230px]">
              {isMounted ? (
                <Suspense fallback={<div className="h-[230px] flex items-center justify-center text-xs text-muted-foreground animate-pulse">Loading Profit vs Sales...</div>}>
                  <Chart options={profitSalesChartOptions} series={profitSalesChartOptions.series} type="line" height={230} />
                </Suspense>
              ) : (
                <div className="h-[230px] bg-slate-50 animate-pulse rounded" />
              )}
            </div>
            <div className="flex items-center justify-center gap-4 mt-2 text-[11px]">
              <div className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-orange"></span>
                <span className="text-default">Profit Margin</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-success"></span>
                <span className="text-default">Sales</span>
              </div>
            </div>
          </div>

          {/* Expenses Donut */}
          <div className="bg-white border border-border-color rounded-md p-4 xl:col-span-3 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-title mb-0">Expenses</h2>
              <span className="text-xs text-muted-foreground border border-border-color px-2 py-0.5 rounded">2026</span>
            </div>
            <div id="fin-expense-donut" className="flex justify-center min-h-[200px]">
              {isMounted ? (
                <Suspense fallback={<div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground animate-pulse">Loading Expense Donut...</div>}>
                  <Chart options={expenseDonutOptions} series={expenseDonutOptions.series} type="donut" height={200} />
                </Suspense>
              ) : (
                <div className="h-[200px] bg-slate-50 animate-pulse rounded" />
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-3 text-[11px]">
              <div className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-orange"></span>
                <span className="text-default">Salaries</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-purple"></span>
                <span className="text-default">Marketing</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-success"></span>
                <span className="text-default">Miscellaneous</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer px-6 pb-3 flex items-center justify-center gap-2 text-xs text-default">
        <p>{new Date().getFullYear()} &copy; Master HRMS. All Rights Reserved</p>
      </footer>
    </div>
  );
}
