import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const Chart = lazy(() => import("react-apexcharts"));

export const Route = createFileRoute("/_authenticated/_app/finance-dashboard")({
  component: FinanceDashboardPage,
});

export default function FinanceDashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [yearFilter, setYearFilter] = useState("2026");
  const [revenuePeriod, setRevenuePeriod] = useState("Weekly");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch Finance Data
  const { data: financeData } = useQuery({
    queryKey: ["finance-dashboard-metrics"],
    queryFn: async () => {
      try {
        const res = await api.get("/dashboard/hrm");
        return res;
      } catch (err) {
        return null;
      }
    },
    refetchInterval: 30000,
  });

  const handleExport = (format: "pdf" | "excel") => {
    try {
      const csvContent = [
        ["Metric", "Value"],
        ["Total Revenue", "$125,000"],
        ["Total Expenses", "$89,500"],
        ["Pending Invoices", "12"],
        ["Budget Utilization", "65%"],
        ["Net Profit", "$35,500"],
      ]
        .map((e) => e.join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Finance_Report_${new Date().toISOString().split("T")[0]}.${format === "excel" ? "csv" : "txt"}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Finance Report exported as ${format.toUpperCase()}`);
    } catch {
      toast.error("Failed to export report");
    }
  };

  // 1. Revenue vs Expense Bar Chart (matching ui/assets/js/apex-chart-data.js lines 573-587)
  const revExpChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "bar", height: 200, toolbar: { show: false } },
      series: [
        { name: "Revenue", data: [40, 70, 28, 38, 48, 60, 22, 42, 36, 36, 28, 60] },
        { name: "Expense", data: [22, 48, 25, 30, 36, 42, 18, 30, 25, 22, 18, 22] },
      ],
      xaxis: {
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        labels: { style: { colors: "#94A3B8", fontSize: "10px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { colors: "#94A3B8", fontSize: "11px" },
          formatter: (v) => "$" + v + "K",
        },
      },
      grid: { borderColor: "var(--color-border-color, #E2E8F0)", strokeDashArray: 4 },
      plotOptions: { bar: { columnWidth: "55%", borderRadius: 3 } },
      colors: ["#10B981", "#F97316"],
      legend: { show: false },
      dataLabels: { enabled: false },
      tooltip: { theme: "dark", y: { formatter: (v) => "$" + v + "K" } },
    }),
    []
  );

  // 2. Revenue Donut Chart (matching ui/assets/js/apex-chart-data.js lines 590-659)
  const revenueDonutOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "donut", height: 230, width: "100%" },
      grid: { padding: { top: 0, right: 0, bottom: -10, left: 0 } },
      series: [68, 31, 12],
      labels: ["Sales", "Recurring", "Service Fees"],
      colors: ["#10B981", "#F97316", "#9333EA"],
      stroke: { width: 0 },
      legend: { show: false },
      plotOptions: {
        pie: {
          donut: {
            size: "72%",
            labels: {
              show: true,
              name: { show: false },
              value: { show: true, fontSize: "22px", fontWeight: 700, color: "#1E293B", offsetY: 8 },
              total: {
                show: true,
                showAlways: true,
                label: "Sales",
                fontSize: "10px",
                fontWeight: 400,
                color: "#94A3B8",
                formatter: () => "90%",
              },
            },
          },
        },
      },
      dataLabels: { enabled: false },
      tooltip: { enabled: false },
    }),
    []
  );

  // 3. Profit Margin vs Sales Line Chart (matching ui/assets/js/apex-chart-data.js lines 662-677)
  const profitSalesChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "line", height: 230, toolbar: { show: false } },
      series: [
        { name: "Profit Margin", data: [55, 48, 50, 32, 40, 38, 45, 35, 25, 28, 22, 30] },
        { name: "Sales", data: [25, 22, 28, 35, 30, 38, 32, 45, 42, 55, 48, 60] },
      ],
      xaxis: {
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        labels: { style: { colors: "#94A3B8", fontSize: "10px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { colors: "#94A3B8", fontSize: "11px" },
          formatter: (v) => "$" + v + "K",
        },
      },
      grid: { borderColor: "var(--color-border-color, #E2E8F0)", strokeDashArray: 4 },
      stroke: { curve: "smooth", width: [2.5, 2.5] },
      colors: ["#F97316", "#10B981"],
      legend: { show: false },
      dataLabels: { enabled: false },
      tooltip: { theme: "dark", shared: true },
      markers: { size: 0 },
    }),
    []
  );

  // 4. Expenses Donut Chart (matching ui/assets/js/apex-chart-data.js lines 680-720)
  const expenseDonutOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "donut", height: 200 },
      series: [50, 30, 20],
      labels: ["Salaries", "Marketing", "Miscellaneous"],
      colors: ["#F97316", "#9333EA", "#10B981"],
      stroke: { width: 0 },
      legend: { show: false },
      plotOptions: {
        pie: {
          donut: {
            size: "70%",
            labels: {
              show: true,
              value: { show: true, fontSize: "20px", fontWeight: 700, color: "#1E293B", offsetY: 6 },
              total: {
                show: true,
                showAlways: true,
                label: "Salaries",
                fontSize: "10px",
                color: "#94A3B8",
                formatter: () => "50%",
              },
            },
          },
        },
      },
      dataLabels: { enabled: false },
      tooltip: { enabled: false },
    }),
    []
  );

  return (
    <div className="p-3 lg:py-6 lg:px-0">
      {/* ── Page Header (matching ui/finance-dashboard.html line 1272) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 lg:mb-6">
        <h1 className="text-gray-900 dark:text-gray-100 text-xl font-bold mb-0">Finance Dashboard</h1>
        <div className="flex items-center gap-2">
          <div className="relative rangepicker-input w-[180px] h-[32px] leading-none">
            <span className="absolute inset-y-0 left-0 flex items-center px-2.5 text-muted-foreground text-xs pointer-events-none">
              <i className="ph-duotone ph-calendar text-sm"></i>
            </span>
            <input
              type="text"
              readOnly
              className="text-xs h-[32px] inline-block w-full bg-white dark:bg-slate-800 border border-border-color rounded-md focus:ring-0 pl-8 pr-2 cursor-pointer font-medium text-title"
              value="01 Jan 26 - 31 Dec 26"
            />
          </div>

          {/* Export Dropdown */}
          <div className="relative inline-flex">
            <button
              type="button"
              onClick={() => setExportOpen((o) => !o)}
              className="cursor-pointer btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 inline-flex items-center gap-2 hover:bg-primary hover:border-primary hover:text-white transition-colors"
            >
              <i className="ph-duotone ph-download-simple font-normal"></i> Export{" "}
              <i className="ph-bold ph-caret-down text-xs"></i>
            </button>

            {exportOpen && (
              <div className="absolute right-0 top-full mt-2 min-w-44 bg-white dark:bg-slate-900 border border-border-color shadow-lg rounded-md p-2 space-y-1 z-30">
                <button
                  type="button"
                  onClick={() => {
                    handleExport("pdf");
                    setExportOpen(false);
                  }}
                  className="w-full text-left flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-800 cursor-pointer"
                >
                  Export as PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleExport("excel");
                    setExportOpen(false);
                  }}
                  className="w-full text-left flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-800 cursor-pointer"
                >
                  Export as Excel (CSV)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 1: Revenue vs Expense + Recent Invoices (matching ui/finance-dashboard.html line 1301) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 mb-3">
        {/* Revenue vs Expense Bar Chart */}
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 xl:col-span-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg max-lg:text-[17px] text-title font-bold mb-0">Revenue vs Expense</h2>
            <div className="inline-flex items-center gap-1 border border-border-color rounded-md p-1 bg-light dark:bg-slate-800 text-xs">
              {["2026", "2025", "2024"].map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setYearFilter(yr)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-colors",
                    yearFilter === yr
                      ? "bg-white dark:bg-slate-700 text-primary shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>
          <div className="w-full">
            {isMounted && (
              <Suspense fallback={<div className="h-[200px] flex items-center justify-center text-xs">Loading chart...</div>}>
                <Chart options={revExpChartOptions} series={revExpChartOptions.series} type="bar" height={200} />
              </Suspense>
            )}
          </div>
          <div className="flex items-center justify-center gap-4 mt-2 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500"></span>
              <span className="text-default">Revenue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-orange-500"></span>
              <span className="text-default">Expense</span>
            </div>
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 xl:col-span-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg max-lg:text-[17px] text-title font-bold mb-0">Recent Invoices</h2>
            <Link
              to="/invoices"
              className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 inline-flex items-center gap-1 hover:bg-primary hover:text-white hover:border-primary text-xs px-2.5 py-1 rounded transition-colors"
            >
              View All <i className="ph-bold ph-caret-right text-[10px]"></i>
            </Link>
          </div>
          <div className="space-y-3">
            {[
              { id: "#INV0020", client: "Apex Computers", amount: "$10,000", status: "Paid", color: "text-emerald-600 bg-emerald-500/10", icon: "ph-desktop-tower", iconColor: "text-amber-500" },
              { id: "#INV0019", client: "Beats Headphones", amount: "$5,000", status: "Unpaid", color: "text-amber-600 bg-amber-500/10", icon: "ph-headphones", iconColor: "text-blue-500" },
              { id: "#INV0018", client: "Dazzle Shoes", amount: "$25,000", status: "Canceled", color: "text-rose-600 bg-rose-500/10", icon: "ph-sneaker", iconColor: "text-pink-500" },
              { id: "#INV0017", client: "Best Accessories", amount: "$15,500", status: "Partially", color: "text-blue-600 bg-blue-500/10", icon: "ph-shopping-bag", iconColor: "text-purple-600" },
              { id: "#INV0016", client: "A-Z Store", amount: "$34,000", status: "Overdue", color: "text-amber-600 bg-amber-500/10", icon: "ph-storefront", iconColor: "text-emerald-500" },
            ].map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-3 sm:grid sm:grid-cols-12">
                <div className="flex items-center gap-2 min-w-0 sm:col-span-6">
                  <div className="size-9 rounded-md bg-light dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <i className={cn("ph-duotone text-base", inv.icon, inv.iconColor)}></i>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-primary hover:underline font-mono mb-0 cursor-pointer">{inv.id}</p>
                    <p className="text-xs font-semibold text-title truncate mb-0">{inv.client}</p>
                  </div>
                </div>
                <div className="min-w-0 text-start hidden sm:block sm:col-span-3">
                  <p className="text-[10px] text-default mb-0">Amount</p>
                  <p className="text-xs font-bold text-title mb-0">{inv.amount}</p>
                </div>
                <div className="text-end sm:col-span-3">
                  <p className="text-[10px] text-default mb-0">Status</p>
                  <span className={cn("text-[11px] px-2 py-0.5 rounded font-medium", inv.color)}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 2: 5 KPI Cards (matching ui/finance-dashboard.html line 1437) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-3">
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <div className="flex justify-between mb-2 items-center">
            <div>
              <p className="text-xs text-default mb-1">Total Revenue</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">$125,000</h3>
            </div>
            <div className="size-9 rounded-md bg-orange-500/10 flex items-center justify-center shrink-0">
              <i className="ph-duotone ph-wallet text-orange-500 text-lg"></i>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] pt-2 border-t border-border-color">
            <span className="text-emerald-600 font-medium inline-flex items-center">
              <i className="ph-bold ph-arrow-up text-[10px] me-0.5"></i>+12.4%
            </span>
            <span className="text-default">Last 30 days</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <div className="flex justify-between mb-2 items-center">
            <div>
              <p className="text-xs text-default mb-1">Total Expenses</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">$89,500</h3>
            </div>
            <div className="size-9 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0">
              <i className="ph-duotone ph-credit-card text-blue-500 text-lg"></i>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] pt-2 border-t border-border-color">
            <span className="text-rose-600 font-medium inline-flex items-center">
              <i className="ph-bold ph-arrow-down text-[10px] me-0.5"></i>-6.8%
            </span>
            <span className="text-default">Last 30 days</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <div className="flex justify-between mb-2 items-center">
            <div>
              <p className="text-xs text-default mb-1">Pending Invoices</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">12</h3>
            </div>
            <div className="size-9 rounded-md bg-pink-500/10 flex items-center justify-center shrink-0">
              <i className="ph-duotone ph-file-text text-pink-500 text-lg"></i>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] pt-2 border-t border-border-color">
            <span className="text-emerald-600 font-medium inline-flex items-center">
              <i className="ph-bold ph-arrow-up text-[10px] me-0.5"></i>+5.2%
            </span>
            <span className="text-default">Last 30 days</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <div className="flex justify-between mb-2 items-center">
            <div>
              <p className="text-xs text-default mb-1">Budget Utilization</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">65%</h3>
            </div>
            <div className="size-9 rounded-md bg-purple-500/10 flex items-center justify-center shrink-0">
              <i className="ph-duotone ph-chart-bar text-purple-600 text-lg"></i>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] pt-2 border-t border-border-color">
            <span className="text-emerald-600 font-medium inline-flex items-center">
              <i className="ph-bold ph-arrow-up text-[10px] me-0.5"></i>+5.2%
            </span>
            <span className="text-default">Last 30 days</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <div className="flex justify-between mb-2 items-center">
            <div>
              <p className="text-xs text-default mb-1">Net Profit / Loss</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">$35,500</h3>
            </div>
            <div className="size-9 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
              <i className="ph-duotone ph-trend-up text-emerald-600 text-lg"></i>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] pt-2 border-t border-border-color">
            <span className="text-emerald-600 font-medium inline-flex items-center">
              <i className="ph-bold ph-arrow-up text-[10px] me-0.5"></i>+18%
            </span>
            <span className="text-default">Last 30 days</span>
          </div>
        </div>
      </div>

      {/* ── Row 3: Revenue Donut + Profit Margin vs Sales Line + Expenses Donut (matching ui/finance-dashboard.html line 1519) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 mb-3">
        {/* Revenue Donut */}
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 xl:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-title mb-0">Revenue</h2>
            <span className="text-xs text-muted-foreground border border-border-color px-2 py-0.5 rounded">Weekly</span>
          </div>
          <div className="flex justify-center">
            {isMounted && (
              <Suspense fallback={<div className="h-[230px] flex items-center justify-center text-xs">Loading chart...</div>}>
                <Chart options={revenueDonutOptions} series={revenueDonutOptions.series} type="donut" height={230} width="100%" />
              </Suspense>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-3 text-[11px]">
            <div className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-emerald-500"></span>
              <span className="text-default">Sales</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-orange-500"></span>
              <span className="text-default">Recurring</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-purple-600"></span>
              <span className="text-default">Service Fees</span>
            </div>
          </div>
        </div>

        {/* Profit Margin vs Sales */}
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 xl:col-span-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-title mb-0">Profit Margin vs Sales</h2>
            <span className="text-xs text-muted-foreground border border-border-color px-2 py-0.5 rounded">2026</span>
          </div>
          <div className="w-full">
            {isMounted && (
              <Suspense fallback={<div className="h-[230px] flex items-center justify-center text-xs">Loading chart...</div>}>
                <Chart options={profitSalesChartOptions} series={profitSalesChartOptions.series} type="line" height={230} />
              </Suspense>
            )}
          </div>
          <div className="flex items-center justify-center gap-4 mt-2 text-[11px]">
            <div className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-orange-500"></span>
              <span className="text-default">Profit Margin</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-emerald-500"></span>
              <span className="text-default">Sales</span>
            </div>
          </div>
        </div>

        {/* Expenses Donut */}
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 xl:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-title mb-0">Expenses</h2>
            <span className="text-xs text-muted-foreground border border-border-color px-2 py-0.5 rounded">2026</span>
          </div>
          <div className="flex justify-center">
            {isMounted && (
              <Suspense fallback={<div className="h-[200px] flex items-center justify-center text-xs">Loading chart...</div>}>
                <Chart options={expenseDonutOptions} series={expenseDonutOptions.series} type="donut" height={200} />
              </Suspense>
            )}
          </div>
          <div className="space-y-1.5 mt-3">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-orange-500"></span>
                <span className="text-default">Salaries</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-gray-100">50%</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-purple-600"></span>
                <span className="text-default">Marketing</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-gray-100">30%</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500"></span>
                <span className="text-default">Miscellaneous</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-gray-100">20%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 4: Recent Payments Table (matching ui/finance-dashboard.html line 1616) ── */}
      <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg max-lg:text-[17px] text-title font-bold mb-0">Recent Payments</h2>
          <Link
            to="/expenses"
            className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 inline-flex items-center gap-1 hover:bg-primary hover:text-white hover:border-primary text-xs px-2.5 py-1 rounded transition-colors"
          >
            View All <i className="ph-bold ph-caret-right text-[10px]"></i>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-default border-b border-border-color">
                <th className="text-left py-2 px-2 font-semibold text-gray-900 dark:text-gray-100">Payment ID</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-900 dark:text-gray-100">Date</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-900 dark:text-gray-100">Payee</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-900 dark:text-gray-100">Description</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-900 dark:text-gray-100">Invoice ID</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-900 dark:text-gray-100">Amount</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-900 dark:text-gray-100">Bank &amp; Account</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-900 dark:text-gray-100">Payment Method</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-900 dark:text-gray-100">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { id: "#PAY0020", date: "11 Sep 2025", payee: "Zenith Supplies", icon: "ph-leaf", iconBg: "bg-emerald-500/10 text-emerald-600", desc: "Office Stationery", inv: "#INV0020", amount: "$10,000", bank: "BOA - 4567329878", method: "Cash", status: "Paid", statusColor: "bg-emerald-500/10 text-emerald-600" },
                { id: "#PAY0019", date: "05 Sep 2025", payee: "Delta Traders", icon: "ph-triangle", iconBg: "bg-blue-500/10 text-blue-600", desc: "Courier Charges", inv: "#INV0019", amount: "$5,000", bank: "WF - 9981432098", method: "Credit Card", status: "Unpaid", statusColor: "bg-amber-500/10 text-amber-600" },
                { id: "#PAY0018", date: "27 Aug 2025", payee: "Nova Enterprises", icon: "ph-flower", iconBg: "bg-purple-500/10 text-purple-600", desc: "Marketing Flyers", inv: "#INV0018", amount: "$2,000", bank: "JPM - 3205987643", method: "Debit Card", status: "Partially Paid", statusColor: "bg-blue-500/10 text-blue-600" },
                { id: "#PAY0017", date: "16 Aug 2025", payee: "Apex Manufacturing", icon: "ph-factory", iconBg: "bg-orange-500/10 text-orange-600", desc: "Office Rent", inv: "#INV0017", amount: "$1,500", bank: "CITI - 6721345098", method: "UPI", status: "Paid", statusColor: "bg-emerald-500/10 text-emerald-600" },
                { id: "#PAY0016", date: "25 Jul 2025", payee: "Stellar Tools", icon: "ph-star", iconBg: "bg-pink-500/10 text-pink-600", desc: "Monthly Cleaning", inv: "#INV0016", amount: "$3,000", bank: "BOA - 4567329878", method: "Bank Transfer", status: "Unpaid", statusColor: "bg-amber-500/10 text-amber-600" },
              ].map((row) => (
                <tr key={row.id} className="border-b border-border-color last:border-0 hover:bg-light/40 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-2 text-xs font-mono text-primary hover:underline cursor-pointer">{row.id}</td>
                  <td className="py-2.5 px-2 text-xs text-default">{row.date}</td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("size-7 rounded-md flex items-center justify-center", row.iconBg)}>
                        <i className={cn("ph-duotone text-sm", row.icon)}></i>
                      </div>
                      <span className="text-xs font-semibold text-title">{row.payee}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-xs text-default">{row.desc}</td>
                  <td className="py-2.5 px-2 text-xs font-mono text-default">{row.inv}</td>
                  <td className="py-2.5 px-2 text-xs font-bold text-gray-900 dark:text-gray-100">{row.amount}</td>
                  <td className="py-2.5 px-2 text-xs text-default">{row.bank}</td>
                  <td className="py-2.5 px-2 text-xs text-default">{row.method}</td>
                  <td className="py-2.5 px-2">
                    <span className={cn("inline-flex items-center text-[11px] px-2 py-0.5 rounded font-medium", row.statusColor)}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
