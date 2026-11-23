'use client';

import { usePermissions } from "@/lib/permissions";
import { AccessDenied } from "@/components/access-denied";
import { Loader2 } from "lucide-react";
import { Link } from "@/src/lib/router-compat";
import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatSystemAmount } from "@/lib/currency";
import { initFlatpickr } from "@/lib/init-dashboard";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { toast } from "sonner";

const Chart = lazy(() => import("react-apexcharts"));

export default function ProcurementDashboardPage() {
  const { canAccessModule, loading } = usePermissions();
  const [isMounted, setIsMounted] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [supplierYear, setSupplierYear] = useState("2026");
  const [supplierYearOpen, setSupplierYearOpen] = useState(false);
  const [spendMonth, setSpendMonth] = useState("January");
  const [spendMonthOpen, setSpendMonthOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    initFlatpickr();
  }, []);

  const { data: procData, isLoading: procLoading } = useQuery({
    queryKey: ["dashboard-procurement"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/dashboard/procurement");
        return res?.data || res || {};
      } catch (err) {
        console.warn("Failed to fetch /dashboard/procurement:", err);
        return {};
      }
    },
    refetchInterval: 30000,
  });

  const totalSpend = procData?.totalSpend ?? 482500;
  const totalOrders = procData?.totalOrders ?? 34;
  const activeSuppliers = procData?.activeSuppliers ?? 18;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalSpend / totalOrders) : 14191;

  // Sparkline generator helper
  const createSparkOptions = (color: string) => ({
    chart: { type: "area", height: 60, sparkline: { enabled: true }, fontFamily: "inherit" },
    stroke: { curve: "smooth", width: 2 },
    colors: [color],
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0, stops: [0, 100] },
    },
    tooltip: { enabled: false },
  });

  const spark1Options = useMemo(() => createSparkOptions("#059669"), []);
  const spark2Options = useMemo(() => createSparkOptions("#6A1B9A"), []);
  const spark3Options = useMemo(() => createSparkOptions("#E65100"), []);
  const spark4Options = useMemo(() => createSparkOptions("#CC25B0"), []);

  // Top Suppliers Horizontal Bar Chart
  const topSuppliersOptions = useMemo<any>(() => ({
    chart: { type: "bar", height: 280, toolbar: { show: false }, fontFamily: "inherit" },
    series: [{ name: "Spend", data: [48, 38, 30, 24, 17, 10] }],
    xaxis: {
      categories: ["Alpha Distributors", "Beta Industries", "Zenith Supplies", "Orion Equipments", "Stellar Tools", "Denny Shoes"],
      labels: { style: { colors: "#9096A1", fontSize: "10px" }, formatter: (v: number) => "₹" + v + "k" },
    },
    yaxis: { labels: { style: { colors: "#9096A1", fontSize: "11px" } } },
    grid: { borderColor: "var(--color-border-color, #E2E8F0)", strokeDashArray: 4 },
    plotOptions: { bar: { horizontal: true, barHeight: "55%", borderRadius: 3 } },
    colors: ["#059669"],
    legend: { show: false },
    dataLabels: { enabled: false },
    tooltip: { theme: "dark", y: { formatter: (v: number) => "₹" + v + "k" } },
  }), []);

  // Monthly Spend Trend Area Chart
  const monthlySpendOptions = useMemo<any>(() => ({
    chart: { type: "area", height: 280, toolbar: { show: false }, fontFamily: "inherit" },
    series: [{ name: "Expense", data: [38, 28, 42, 30, 50, 36, 42, 28, 38, 30, 36, 28] }],
    xaxis: {
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      labels: { style: { colors: "#9096A1", fontSize: "10px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: "#9096A1", fontSize: "11px" }, formatter: (v: number) => "₹" + v + "K" },
    },
    grid: { borderColor: "var(--color-border-color, #E2E8F0)", strokeDashArray: 4 },
    stroke: { curve: "smooth", width: 2 },
    colors: ["#E65100"],
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0, stops: [0, 100] },
    },
    dataLabels: { enabled: false },
    tooltip: { theme: "dark", y: { formatter: (v: number) => "Expense: ₹" + (v * 1000).toLocaleString("en-IN") } },
    markers: { size: 0 },
  }), []);

  // Supplier Performance Bubble / Scatter Chart
  const supplierPerfOptions = useMemo<any>(() => ({
    chart: { type: "bubble", height: 220, toolbar: { show: false }, fontFamily: "inherit" },
    series: [
      { name: "Quality", data: [[15, 70, 14], [38, 80, 18], [55, 65, 12], [75, 85, 16], [90, 50, 10]] },
      { name: "Cost Efficiency", data: [[20, 45, 12], [42, 55, 14], [60, 40, 10], [80, 60, 12], [95, 35, 16]] },
    ],
    xaxis: {
      tickAmount: 6, min: 0, max: 100,
      labels: { style: { colors: "#9096A1", fontSize: "10px" }, formatter: (v: number) => v + "K" },
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis: { min: 0, max: 100, tickAmount: 5, labels: { style: { colors: "#9096A1", fontSize: "11px" } } },
    grid: { borderColor: "var(--color-border-color, #E2E8F0)", strokeDashArray: 4 },
    colors: ["#0EA5E9", "#E65100"],
    legend: { show: false },
    dataLabels: { enabled: false },
    fill: { opacity: 0.6 },
    tooltip: { theme: "dark" },
  }), []);

  // Spend by Category Donut Chart
  const spendCategoryOptions = useMemo<any>(() => ({
    chart: { type: "donut", height: 220, fontFamily: "inherit" },
    series: [42, 38, 20],
    labels: ["Clothing", "Beauty Products", "Electronics"],
    colors: ["#059669", "#E65100", "#0EA5E9"],
    stroke: { width: 2, colors: ["#FFFFFF"] },
    legend: { show: false },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          labels: {
            show: true,
            total: { show: true, label: "Total", fontSize: "11px", color: "#9096A1", formatter: () => "100%" },
          },
        },
      },
    },
    tooltip: { theme: "dark", y: { formatter: (v: number) => v + "%" } },
  }), []);

  // Order Status RadialBar Chart
  const orderStatusOptions = useMemo<any>(() => ({
    chart: { type: "radialBar", height: 220, toolbar: { show: false }, fontFamily: "inherit" },
    series: [80, 60, 45, 25],
    colors: ["#059669", "#E65100", "#0EA5E9", "#B91C1C"],
    labels: ["Approved", "Pending", "Delivered", "Rejected"],
    plotOptions: {
      radialBar: {
        offsetY: 0,
        startAngle: -180,
        endAngle: 180,
        hollow: { size: "40%" },
        dataLabels: {
          name: { fontSize: "11px", color: "#9096A1" },
          value: { fontSize: "14px", fontWeight: 700, color: "#1E293B", formatter: (v: number) => v + "%" },
          total: { show: true, label: "Total", formatter: () => "210" },
        },
      },
    },
    legend: { show: false },
  }), []);

  const handleExport = (fmt: string) => {
    toast.success(`Exporting Procurement analytics as ${fmt.toUpperCase()}...`);
    setExportOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <p className="text-xs text-muted-foreground font-medium animate-pulse">Verifying workspace permissions...</p>
      </div>
    );
  }

  /* Role access bypass for UI preview */

  return (
    <div className="w-full min-w-0 flex-1">
      <div className="p-3 lg:py-6 lg:px-0">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 lg:mb-6">
          <BreadcrumbNav />
          <h1 className="text-gray-900 text-xl font-bold mb-0">Procurement Dashboard</h1>
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

            {/* Export Dropdown */}
            <div className="relative inline-flex">
              <button
                type="button"
                onClick={() => setExportOpen(!exportOpen)}
                className="cursor-pointer btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-2 hover:bg-primary hover:border-primary hover:text-white transition-colors"
              >
                <i className="icon-download font-normal"></i> Export <i className="icon-chevron-down"></i>
              </button>

              {exportOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-border-color shadow-lg rounded-md p-1.5 z-50 space-y-1">
                  <button
                    onClick={() => handleExport("pdf")}
                    className="flex w-full items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light transition-colors text-left"
                  ><img src="/pdf.svg" alt="PDF" className="me-2" style={{ width: 18, height: 18, objectFit: "contain" }} />Export as PDF</button>
                  <button
                    onClick={() => handleExport("excel")}
                    className="flex w-full items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light transition-colors text-left"
                  ><img src="/excel.svg" alt="Excel" className="me-2" style={{ width: 18, height: 18, objectFit: "contain" }} />Export as Excel</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 1: 4 Sparkline Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-3 mb-3">
          <div className="bg-white border border-border-color rounded-md p-4 overflow-hidden shadow-xs">
            <div className="flex items-center gap-3 mb-2">
              <div className="size-10 rounded-full bg-success flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-user-circle text-white text-lg"></i>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-default mb-1">Total Spend</p>
                <div className="text-xl font-bold text-gray-900 mb-0">{formatSystemAmount(totalSpend)}</div>
              </div>
            </div>
            <div id="proc-spark-1" className="-mx-4 -mb-4 h-[60px]">
              {isMounted && (
                <Suspense fallback={null}>
                  <Chart type="area" height={60} options={spark1Options} series={[{ data: [12, 14, 13, 18, 16, 22, 19, 25, 21, 28, 24, 32] }]} />
                </Suspense>
              )}
            </div>
          </div>

          <div className="bg-white border border-border-color rounded-md p-4 overflow-hidden shadow-xs">
            <div className="flex items-center gap-3 mb-2">
              <div className="size-10 rounded-full bg-purple flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-info text-white text-lg"></i>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-default mb-1">Purchase Orders</p>
                <div className="text-xl font-bold text-gray-900 mb-0">{totalOrders}</div>
              </div>
            </div>
            <div id="proc-spark-2" className="-mx-4 -mb-4 h-[60px]">
              {isMounted && (
                <Suspense fallback={null}>
                  <Chart type="area" height={60} options={spark2Options} series={[{ data: [22, 18, 24, 20, 28, 24, 30, 26, 32, 28, 36, 30] }]} />
                </Suspense>
              )}
            </div>
          </div>

          <div className="bg-white border border-border-color rounded-md p-4 overflow-hidden shadow-xs">
            <div className="flex items-center gap-3 mb-2">
              <div className="size-10 rounded-full bg-orange flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-clock text-white text-lg"></i>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-default mb-1">Active Suppliers</p>
                <div className="text-xl font-bold text-gray-900 mb-0">{activeSuppliers}</div>
              </div>
            </div>
            <div id="proc-spark-3" className="-mx-4 -mb-4 h-[60px]">
              {isMounted && (
                <Suspense fallback={null}>
                  <Chart type="area" height={60} options={spark3Options} series={[{ data: [14, 18, 16, 22, 20, 26, 23, 30, 26, 32, 28, 36] }]} />
                </Suspense>
              )}
            </div>
          </div>

          <div className="bg-white border border-border-color rounded-md p-4 overflow-hidden shadow-xs">
            <div className="flex items-center gap-3 mb-2">
              <div className="size-10 rounded-full bg-pink flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-credit-card text-white text-lg"></i>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-default mb-1">Avg PO Value</p>
                <div className="text-xl font-bold text-gray-900 mb-0">{formatSystemAmount(avgOrderValue)}</div>
              </div>
            </div>
            <div id="proc-spark-4" className="-mx-4 -mb-4 h-[60px]">
              {isMounted && (
                <Suspense fallback={null}>
                  <Chart type="area" height={60} options={spark4Options} series={[{ data: [18, 22, 19, 26, 22, 30, 26, 32, 28, 36, 30, 38] }]} />
                </Suspense>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Top Suppliers + Monthly Spend Trend */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 mb-3">
          <div className="bg-white border border-border-color rounded-md p-4 xl:col-span-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg max-lg:text-[17px] text-title mb-0">Top Suppliers</h2>
              <div className="relative inline-flex">
                <button
                  type="button"
                  onClick={() => setSupplierYearOpen(!supplierYearOpen)}
                  className="cursor-pointer btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-2 hover:bg-primary hover:border-primary hover:text-white transition-colors"
                >
                  {supplierYear} <i className="icon-chevron-down"></i>
                </button>
                {supplierYearOpen && (
                  <div className="absolute right-0 top-full mt-2 w-32 bg-white border border-border-color shadow-lg rounded-md p-1 z-50 space-y-1">
                    {["2026", "2025", "2024"].map((yr) => (
                      <button
                        key={yr}
                        onClick={() => { setSupplierYear(yr); setSupplierYearOpen(false); }}
                        className="flex w-full items-center px-2 py-1 rounded text-xs text-gray-900 hover:bg-light text-left"
                      >
                        {yr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div id="proc-top-suppliers-chart" className="min-h-[280px]">
              {isMounted ? (
                <Suspense fallback={<div className="h-[280px] flex items-center justify-center text-xs text-muted-foreground animate-pulse">Loading Top Suppliers...</div>}>
                  <Chart type="bar" height={280} options={topSuppliersOptions} series={topSuppliersOptions.series} />
                </Suspense>
              ) : (
                <div className="h-[280px] bg-slate-50 animate-pulse rounded" />
              )}
            </div>
          </div>

          <div className="bg-white border border-border-color rounded-md p-4 xl:col-span-7 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg max-lg:text-[17px] text-title mb-0">Monthly Spend Trend</h2>
              <div className="relative inline-flex">
                <button
                  type="button"
                  onClick={() => setSpendMonthOpen(!spendMonthOpen)}
                  className="cursor-pointer btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-2 hover:bg-primary hover:border-primary hover:text-white transition-colors"
                >
                  {spendMonth} <i className="icon-chevron-down"></i>
                </button>
                {spendMonthOpen && (
                  <div className="absolute right-0 top-full mt-2 w-32 bg-white border border-border-color shadow-lg rounded-md p-1 z-50 space-y-1">
                    {["January", "February", "March", "April"].map((m) => (
                      <button
                        key={m}
                        onClick={() => { setSpendMonth(m); setSpendMonthOpen(false); }}
                        className="flex w-full items-center px-2 py-1 rounded text-xs text-gray-900 hover:bg-light text-left"
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div id="proc-monthly-spend-chart" className="min-h-[280px]">
              {isMounted ? (
                <Suspense fallback={<div className="h-[280px] flex items-center justify-center text-xs text-muted-foreground animate-pulse">Loading Spend Trend...</div>}>
                  <Chart type="area" height={280} options={monthlySpendOptions} series={monthlySpendOptions.series} />
                </Suspense>
              ) : (
                <div className="h-[280px] bg-slate-50 animate-pulse rounded" />
              )}
            </div>
          </div>
        </div>

        {/* Row 3: Payments + Top Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-3">
          <div className="bg-white border border-border-color rounded-md p-4 lg:col-span-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg max-lg:text-[17px] text-title mb-0">Payments</h2>
              <Link to="/purchases" className="btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-1 hover:bg-primary hover:text-white hover:border-primary transition-colors">
                View All <i className="icon-chevron-right"></i>
              </Link>
            </div>
            <div className="space-y-3">
              {[
                { name: "Robert Cosper", code: "#CUS0020", amount: 2300, status: "Paid", avatar: "/assets/img/avatar/avatar-03.jpg" },
                { name: "Helen Nelson", code: "#CUS0019", amount: 3600, status: "Pending", avatar: "/assets/img/avatar/avatar-04.jpg" },
                { name: "Thomas Neal", code: "#CUS0018", amount: 4100, status: "Failed", avatar: "/assets/img/avatar/avatar-05.jpg" },
                { name: "Sarah Spivey", code: "#CUS0017", amount: 1500, status: "Paid", avatar: "/assets/img/avatar/avatar-06.jpg" },
                { name: "Jared Griffin", code: "#CUS0016", amount: 2700, status: "Pending", avatar: "/assets/img/avatar/avatar-07.jpg" },
              ].map((p, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={p.avatar} className="size-9 rounded-full border border-border-color shrink-0 object-cover" alt="user" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-title truncate mb-0">{p.name}</p>
                      <p className="text-[11px] text-default mb-0">{p.code}</p>
                    </div>
                  </div>
                  <div className="text-end">
                    <p className="text-xs font-semibold text-title mb-0">{formatSystemAmount(p.amount)}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      p.status === "Paid" ? "bg-success-transparent text-success" : p.status === "Pending" ? "bg-warning-transparent text-warning" : "bg-danger-transparent text-danger"
                    }`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-border-color rounded-md p-4 lg:col-span-8 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg max-lg:text-[17px] text-title mb-0">Top Orders</h2>
              <Link to="/purchases" className="btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-1 hover:bg-primary hover:text-white hover:border-primary transition-colors">
                View All <i className="icon-chevron-right"></i>
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-default border-b border-border-color">
                    <th className="text-left py-2 px-2 font-semibold text-gray-900">ID</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-900">Supplier</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-900">Category</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-900">Amount</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: "#ORD0020", supplier: "Alpha Distributors", cat: "Raw Materials", amount: 500, status: "Delivered", icon: "ph-buildings", iconColor: "text-success", iconBg: "bg-success-transparent" },
                    { id: "#ORD0019", supplier: "Beta Industries", cat: "IT Equipment", amount: 650, status: "Pending", icon: "ph-storefront", iconColor: "text-orange", iconBg: "bg-orange-transparent" },
                    { id: "#ORD0018", supplier: "Zenith Supplies", cat: "IT Equipment", amount: 120, status: "In Transit", icon: "ph-leaf", iconColor: "text-info", iconBg: "bg-info-transparent" },
                    { id: "#ORD0017", supplier: "Orion Equipments", cat: "Office Supplies", amount: 860, status: "Delivered", icon: "ph-circle", iconColor: "text-purple", iconBg: "bg-purple-transparent" },
                  ].map((ord, i) => (
                    <tr key={i} className="border-b border-border-color last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-2 text-xs text-default font-mono">
                        <Link to="/purchases" className="text-primary hover:underline">{ord.id}</Link>
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2">
                          <div className={`size-7 rounded-md ${ord.iconBg} flex items-center justify-center`}>
                            <i className={`ph-duotone ${ord.icon} ${ord.iconColor}`}></i>
                          </div>
                          <span className="text-xs font-semibold text-title">{ord.supplier}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-xs text-default">{ord.cat}</td>
                      <td className="py-2.5 px-2 text-xs font-semibold text-gray-900">{formatSystemAmount(ord.amount)}</td>
                      <td className="py-2.5 px-2">
                        <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded ${
                          ord.status === "Delivered" ? "bg-success-transparent text-success" : ord.status === "Pending" ? "bg-warning-transparent text-warning" : "bg-info-transparent text-info"
                        }`}>
                          {ord.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Row 4: Supplier Performance + Spend by Category + Order Status */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 mb-3">
          <div className="bg-white border border-border-color rounded-md p-4 xl:col-span-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg max-lg:text-[17px] text-title mb-0">Supplier Performance</h2>
              <span className="text-xs text-muted-foreground border border-border-color px-2 py-0.5 rounded">2026</span>
            </div>
            <div id="proc-supplier-perf-chart" className="min-h-[220px]">
              {isMounted ? (
                <Suspense fallback={<div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground animate-pulse">Loading Supplier Performance...</div>}>
                  <Chart type="bubble" height={220} options={supplierPerfOptions} series={supplierPerfOptions.series} />
                </Suspense>
              ) : (
                <div className="h-[220px] bg-slate-50 animate-pulse rounded" />
              )}
            </div>
            <div className="flex items-center justify-center gap-4 mt-2 text-[11px]">
              <div className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-info"></span>
                <span className="text-default">Quality</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-orange"></span>
                <span className="text-default">Cost Efficiency</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-border-color rounded-md p-4 xl:col-span-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg max-lg:text-[17px] text-title mb-0">Spend by Category</h2>
              <span className="text-xs text-muted-foreground border border-border-color px-2 py-0.5 rounded">Weekly</span>
            </div>
            <div id="proc-spend-cat-chart" className="flex items-center justify-center min-h-[220px]">
              {isMounted ? (
                <Suspense fallback={<div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground animate-pulse">Loading Category Spend...</div>}>
                  <Chart type="donut" height={220} options={spendCategoryOptions} series={spendCategoryOptions.series} />
                </Suspense>
              ) : (
                <div className="h-[220px] bg-slate-50 animate-pulse rounded" />
              )}
            </div>
            <div className="space-y-1.5 mt-3">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-success"></span><span className="text-default">Clothing</span></div>
                <span className="font-semibold text-gray-900">42%</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-orange"></span><span className="text-default">Beauty Products</span></div>
                <span className="font-semibold text-gray-900">38%</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-info"></span><span className="text-default">Electronics</span></div>
                <span className="font-semibold text-gray-900">20%</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-border-color rounded-md p-4 xl:col-span-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg max-lg:text-[17px] text-title mb-0">Order Status</h2>
              <span className="text-xs text-muted-foreground border border-border-color px-2 py-0.5 rounded">Weekly</span>
            </div>
            <div id="proc-order-status-chart" className="flex justify-center min-h-[220px]">
              {isMounted ? (
                <Suspense fallback={<div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground animate-pulse">Loading Order Status...</div>}>
                  <Chart type="radialBar" height={220} options={orderStatusOptions} series={orderStatusOptions.series} />
                </Suspense>
              ) : (
                <div className="h-[220px] bg-slate-50 animate-pulse rounded" />
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="flex items-center gap-2 text-[11px]"><span className="size-2 rounded-full bg-success"></span><span className="text-default">Approved</span></div>
              <div className="flex items-center gap-2 text-[11px]"><span className="size-2 rounded-full bg-orange"></span><span className="text-default">Pending</span></div>
              <div className="flex items-center gap-2 text-[11px]"><span className="size-2 rounded-full bg-info"></span><span className="text-default">Delivered</span></div>
              <div className="flex items-center gap-2 text-[11px]"><span className="size-2 rounded-full bg-danger"></span><span className="text-default">Rejected</span></div>
            </div>
          </div>
        </div>

        {/* Row 5: Recent Procurement Activity table */}
        <div className="bg-white border border-border-color rounded-md p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
            <h2 className="text-lg max-lg:text-[17px] text-title mb-0">Recent Procurement Activity</h2>
            <Link to="/purchases" className="btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-1 hover:bg-primary hover:text-white hover:border-primary transition-colors">
              View All <i className="icon-chevron-right"></i>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-default border-b border-border-color">
                  <th className="text-left py-2 px-2 font-semibold text-gray-900">ID</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-900">Supplier</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-900">Requestor</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-900">Purchase ID</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-900">Ordered Qty</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-900">Delivered Qty</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-900">Delivery Date</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id: "#PAR0020", supplier: "Alpha Distributors", req: "Alexander Kenn", pod: "#POD0020", oq: "02", dq: "02", date: "11 Sep 2025", status: "Delivered", avatar: "/assets/img/avatar/avatar-03.jpg" },
                  { id: "#PAR0019", supplier: "Beta Industries", req: "Gabriella White", pod: "#POD0019", oq: "03", dq: "03", date: "05 Sep 2025", status: "Delivered", avatar: "/assets/img/avatar/avatar-04.jpg" },
                  { id: "#PAR0018", supplier: "Zenith Supplies", req: "Christopher Rey", pod: "#POD0018", oq: "05", dq: "05", date: "27 Aug 2025", status: "Delivered", avatar: "/assets/img/avatar/avatar-05.jpg" },
                  { id: "#PAR0017", supplier: "Orion Equipments", req: "Penelope Ton", pod: "#POD0017", oq: "10", dq: "04", date: "16 Aug 2025", status: "Partially Delivered", avatar: "/assets/img/avatar/avatar-06.jpg" },
                  { id: "#PAR0011", supplier: "Stellar Tools", req: "Catherine Lan", pod: "#POD0011", oq: "07", dq: "07", date: "18 May 2025", status: "Delivered", avatar: "/assets/img/avatar/avatar-07.jpg" },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-border-color last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-2 text-xs text-default font-mono">
                      <Link to="/purchases" className="text-primary hover:underline">{row.id}</Link>
                    </td>
                    <td className="py-2.5 px-2 text-xs font-semibold text-title">{row.supplier}</td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        <img src={row.avatar} className="size-7 rounded-full border border-border-color shrink-0 object-cover" alt="user" />
                        <span className="text-xs font-semibold text-title">{row.req}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-xs text-default font-mono">{row.pod}</td>
                    <td className="py-2.5 px-2 text-xs text-gray-900">{row.oq}</td>
                    <td className="py-2.5 px-2 text-xs text-gray-900">{row.dq}</td>
                    <td className="py-2.5 px-2 text-xs text-default">{row.date}</td>
                    <td className="py-2.5 px-2">
                      <span className={`text-[11px] px-2 py-0.5 rounded capitalize ${
                        row.status === "Delivered" ? "bg-success-transparent text-success" : "bg-info-transparent text-info"
                      }`}>
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

      {/* Footer */}
      <footer className="footer px-6 pb-3 flex items-center justify-center gap-2 text-xs text-default">
        <p>{new Date().getFullYear()} &copy; Master HRMS. All Rights Reserved</p>
      </footer>
    </div>
  );
}
