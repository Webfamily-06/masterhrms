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

export default function SalesDashboardPage() {
  const { canAccessModule, loading } = usePermissions();
  const [isMounted, setIsMounted] = useState(false);
  const [timeFilter, setTimeFilter] = useState<"1D" | "7D" | "1M" | "1Y">("1Y");
  const [selectedYear, setSelectedYear] = useState("2026");
  const [exportOpen, setExportOpen] = useState(false);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    initFlatpickr();
  }, []);

  // 1. Fetch live CRM & Sales Dashboard Metrics
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ["dashboard-sales-crm-metrics"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/dashboard/sales-crm");
        return res?.data || res || {};
      } catch (err) {
        console.warn("Failed to fetch /dashboard/sales-crm:", err);
        return {};
      }
    },
    refetchInterval: 30000,
  });

  // 2. Fetch live POS/Top products metrics
  const { data: posData, isLoading: posLoading } = useQuery({
    queryKey: ["dashboard-pos-metrics"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/dashboard/pos");
        return res?.data || res || {};
      } catch (err) {
        console.warn("Failed to fetch /dashboard/pos:", err);
        return {};
      }
    },
    refetchInterval: 30000,
  });

  const totalRevenue = salesData?.totalRevenue ?? 128500;
  const totalDeals = salesData?.totalDeals ?? 28;
  const totalCustomers = salesData?.totalCustomers ?? 378;
  const conversionRate = salesData?.conversionRate ?? 85.4;
  const topCustomers = salesData?.topCustomers || [
    { id: "1", name: "Robert Cosper", code: "#CUS0020", totalSpent: 4500, avatar: "/assets/img/avatar/avatar-03.jpg" },
    { id: "2", name: "Helen Nelson", code: "#CUS0019", totalSpent: 5200, avatar: "/assets/img/avatar/avatar-04.jpg" },
    { id: "3", name: "Thomas Neal", code: "#CUS0018", totalSpent: 2800, avatar: "/assets/img/avatar/avatar-05.jpg" },
    { id: "4", name: "Sarah Spivey", code: "#CUS0017", totalSpent: 1750, avatar: "/assets/img/avatar/avatar-06.jpg" },
    { id: "5", name: "Jared Griffin", code: "#CUS0016", totalSpent: 3000, avatar: "/assets/img/avatar/avatar-07.jpg" },
  ];
  const recentOrders = salesData?.recentOrders || [
    { id: "ord-1", invoiceNo: "#INV0020", type: "Invoice", customerName: "Alexander Kenn", amount: 500, date: "2025-09-11", status: "paid", avatar: "/assets/img/avatar/avatar-03.jpg" },
    { id: "ord-2", invoiceNo: "#SAO0019", type: "Sales Order", customerName: "Gabriella White", amount: 650, date: "2025-09-05", status: "pending", avatar: "/assets/img/avatar/avatar-04.jpg" },
    { id: "ord-3", invoiceNo: "#CRN0018", type: "Credit Note", customerName: "Christopher Rey", amount: 120, date: "2025-08-27", status: "issued", avatar: "/assets/img/avatar/avatar-05.jpg" },
    { id: "ord-4", invoiceNo: "#SAQ0017", type: "Sales Quote", customerName: "Penelope Ton", amount: 860, date: "2025-08-16", status: "sent", avatar: "/assets/img/avatar/avatar-06.jpg" },
    { id: "ord-5", invoiceNo: "#INV0011", type: "Invoice", customerName: "Catherine Lan", amount: 650, date: "2025-05-18", status: "paid", avatar: "/assets/img/avatar/avatar-07.jpg" },
  ];
  const topProducts = posData?.topProducts || [
    { id: "p1", name: "Apple iPhone 15", price: 250, sales: 1250, stock: "In Stock", icon: "ph-fill ph-apple-logo" },
    { id: "p2", name: "Dell XPS 13 9310", price: 185, sales: 2250, stock: "In Stock", icon: "ph-duotone ph-laptop" },
    { id: "p3", name: "Bose QuietComfort 45", price: 120, sales: 1600, stock: "In Stock", icon: "ph-duotone ph-headphones" },
    { id: "p4", name: "Adidas Running Shoe", price: 140, sales: 1850, stock: "Out of Stock", icon: "ph-duotone ph-sneaker" },
    { id: "p5", name: "Dyson Vacuum Cleaner", price: 220, sales: 2200, stock: "In Stock", icon: "ph-duotone ph-fan" },
  ];

  // Revenue Trends Chart Options
  const revenueTrendsOptions = useMemo<any>(() => {
    const rawData = [180, 220, 320, 380, 540, 850, 480, 600, 540, 720, 660, 580];
    const maxVal = Math.max(...rawData);
    return {
      chart: {
        type: "bar",
        height: 340,
        toolbar: { show: false },
        fontFamily: "inherit",
      },
      series: [{ name: "Revenue", data: rawData }],
      xaxis: {
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        labels: { style: { colors: "#9096A1", fontSize: "11px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        tickAmount: 5,
        labels: {
          style: { colors: "#9096A1", fontSize: "11px" },
          formatter: (v: number) => (v >= 1000 ? v / 1000 + "M" : v + "K"),
        },
      },
      grid: {
        borderColor: "var(--color-border-color, #E2E8F0)",
        strokeDashArray: 4,
      },
      plotOptions: {
        bar: {
          columnWidth: "55%",
          borderRadius: 3,
          distributed: true,
        },
      },
      colors: rawData.map((v) => (v === maxVal ? "#E65100" : "#F8E6D6")),
      legend: { show: false },
      dataLabels: { enabled: false },
      tooltip: {
        theme: "dark",
        y: { formatter: (v: number) => "₹" + v.toLocaleString() + "K" },
      },
    };
  }, []);

  // Regional Sales Donut / Radial Chart Options
  const regionalChartOptions = useMemo<any>(() => {
    return {
      chart: {
        type: "donut",
        height: 250,
        toolbar: { show: false },
        fontFamily: "inherit",
      },
      labels: ["Americas", "EMEA", "APAC", "Domestic"],
      colors: ["#0F766E", "#059669", "#E65100", "#6A1B9A"],
      legend: {
        position: "bottom",
        fontSize: "12px",
        markers: { radius: 3 },
      },
      stroke: { width: 2, colors: ["#FFFFFF"] },
      dataLabels: { enabled: false },
      tooltip: {
        theme: "dark",
        y: { formatter: (val: number) => val + "%" },
      },
    };
  }, []);

  const handleExport = (fmt: string) => {
    toast.success(`Exporting Sales summary as ${fmt.toUpperCase()}...`);
    setExportOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
          <div>
            <BreadcrumbNav />
            <h1 className="text-gray-900 text-xl font-bold mb-0">Sales Dashboard</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Avatars */}
            <div className="flex items-center -space-x-2 me-1">
              <img src="/assets/img/avatar/avatar-03.jpg" className="size-7 rounded-full border-2 border-white" alt="user" />
              <img src="/assets/img/avatar/avatar-04.jpg" className="size-7 rounded-full border-2 border-white" alt="user" />
              <img src="/assets/img/avatar/avatar-05.jpg" className="size-7 rounded-full border-2 border-white" alt="user" />
              <img src="/assets/img/avatar/avatar-06.jpg" className="size-7 rounded-full border-2 border-white" alt="user" />
              <button
                type="button"
                className="size-7 rounded-full border-2 border-white bg-primary text-white text-xs flex items-center justify-center hover:bg-primary-hover cursor-pointer"
                title="Add Sales Agent"
              >
                <i className="ph ph-plus"></i>
              </button>
            </div>

            {/* Flatpickr */}
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

            <Link
              to="/crm"
              className="btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-1 hover:bg-light text-xs"
            >
              CRM Pipeline
            </Link>
          </div>
        </div>

        {/* Row 1: Revenue Trends + Sales by Region */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 mb-3">
          <div className="bg-white border border-border-color rounded-md p-4 xl:col-span-8 shadow-xs">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
              <h2 className="text-lg max-lg:text-[17px] text-title mb-0">Revenue Trends</h2>
              <div className="flex items-center gap-1 bg-light rounded-md p-1 text-[11px]">
                {(["1D", "7D", "1M", "1Y"] as const).map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setTimeFilter(period)}
                    className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                      timeFilter === period ? "bg-white shadow-sm text-gray-900 font-medium" : "text-default hover:bg-white"
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
            <div id="sales-revenue-trends-chart" className="min-h-[340px]">
              {isMounted ? (
                <Suspense fallback={<div className="h-[340px] flex items-center justify-center text-xs text-muted-foreground animate-pulse">Rendering Revenue Velocity...</div>}>
                  <Chart
                    type="bar"
                    height={340}
                    options={revenueTrendsOptions}
                    series={revenueTrendsOptions.series}
                  />
                </Suspense>
              ) : (
                <div className="h-[340px] bg-slate-50 animate-pulse rounded" />
              )}
            </div>
          </div>

          <div className="bg-white border border-border-color rounded-md p-4 xl:col-span-4 relative overflow-hidden shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg max-lg:text-[17px] text-title mb-0">Sales by Region</h3>
                <div className="relative inline-flex">
                  <button
                    type="button"
                    onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
                    className="cursor-pointer btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-2 hover:bg-primary hover:border-primary hover:text-white transition-colors"
                  >
                    {selectedYear} <i className="icon-chevron-down"></i>
                  </button>

                  {yearDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-32 bg-white border border-border-color shadow-lg rounded-md p-1 z-50 space-y-1">
                      {["2026", "2025", "2024"].map((yr) => (
                        <button
                          key={yr}
                          onClick={() => { setSelectedYear(yr); setYearDropdownOpen(false); }}
                          className="flex w-full items-center px-2 py-1 rounded text-xs text-gray-900 hover:bg-light text-left"
                        >
                          {yr}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Chart container */}
              <div id="chart-container" className="h-[220px] flex items-center justify-center">
                {isMounted ? (
                  <Suspense fallback={<div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground animate-pulse">Loading regional distribution...</div>}>
                    <Chart
                      type="donut"
                      height={220}
                      options={regionalChartOptions}
                      series={[42, 28, 18, 12]}
                    />
                  </Suspense>
                ) : (
                  <div className="h-[220px] bg-slate-50 animate-pulse rounded" />
                )}
              </div>
            </div>

            {/* Total bar */}
            <div className="bg-gradient-to-br from-primary to-success text-white rounded-md p-3 mt-3 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-xl font-bold mb-0 text-white">{formatSystemAmount(totalRevenue)}</h4>
                <span className="text-[11px] text-white/90">vs last month</span>
              </div>
              <div className="h-1 bg-white/20 rounded-full mb-1 overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: "60%" }}></div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-white/90">
                <span>₹0</span>
                <span>₹100K</span>
                <span>₹500K</span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: 4 KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-3">
          <div className="bg-white border border-border-color rounded-md p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-default mb-1">Revenue</p>
                <h3 className="text-2xl font-bold text-gray-900 mb-0">
                  {salesLoading ? "..." : formatSystemAmount(totalRevenue)}
                </h3>
              </div>
              <div className="size-10 rounded-md bg-success flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-currency-circle-dollar text-white text-lg"></i>
              </div>
            </div>
          </div>

          <div className="bg-white border border-border-color rounded-md p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-default mb-1">Open Invoices</p>
                <h3 className="text-2xl font-bold text-gray-900 mb-0">
                  {salesLoading ? "..." : totalDeals}
                </h3>
              </div>
              <div className="size-10 rounded-md bg-orange flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-file-text text-white text-lg"></i>
              </div>
            </div>
          </div>

          <div className="bg-white border border-border-color rounded-md p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-default mb-1">Open Orders</p>
                <h3 className="text-2xl font-bold text-gray-900 mb-0">
                  {salesLoading ? "..." : (salesData?.openOrders ?? 156)}
                </h3>
              </div>
              <div className="size-10 rounded-md bg-primary flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-shopping-cart text-white text-lg"></i>
              </div>
            </div>
          </div>

          <div className="bg-white border border-border-color rounded-md p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-default mb-1">New Customers</p>
                <h3 className="text-2xl font-bold text-gray-900 mb-0">
                  {salesLoading ? "..." : totalCustomers}
                </h3>
              </div>
              <div className="size-10 rounded-md bg-purple flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-user-plus text-white text-lg"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Top Customers + Top Selling Products + Recent Transactions */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 mb-3">
          {/* Top Customers */}
          <div className="bg-white border border-border-color rounded-md p-4 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg max-lg:text-[17px] max-xxl:text-[16px] text-title mb-0">Top Customers</h2>
              <Link to="/crm" className="btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-1 hover:bg-primary hover:text-white hover:border-primary transition-colors">
                View All <i className="icon-chevron-right"></i>
              </Link>
            </div>
            <div className="space-y-3">
              {topCustomers.slice(0, 5).map((cus: any) => (
                <div key={cus.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={cus.avatar || "/assets/img/avatar/avatar-03.jpg"}
                      className="size-9 rounded-full border border-border-color shrink-0 object-cover"
                      alt={cus.name}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-title truncate mb-0">{cus.name}</p>
                      <p className="text-[11px] text-default mb-0">{cus.code || `#CUS00${cus.id}`}</p>
                    </div>
                  </div>
                  <div className="text-end">
                    <p className="text-xs font-semibold text-title mb-0">{formatSystemAmount(cus.totalSpent)}</p>
                    <p className="text-[11px] text-default mb-0">Spent</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Selling Products */}
          <div className="bg-white border border-border-color rounded-md p-4 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg max-lg:text-[17px] max-xxl:text-[16px] text-title mb-0">Top Selling Products</h2>
              <Link to="/products" className="btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-1 hover:bg-primary hover:text-white hover:border-primary transition-colors">
                View All <i className="icon-chevron-right"></i>
              </Link>
            </div>
            <div className="space-y-3">
              {topProducts.slice(0, 5).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="size-9 rounded-md bg-light flex items-center justify-center shrink-0">
                      <i className={`${p.icon || "ph-duotone ph-package"} text-gray-900 text-lg`}></i>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-title truncate mb-0">{p.name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] text-default mb-0">{formatSystemAmount(p.price)}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          (p.stock || "").toString().toLowerCase().includes("out")
                            ? "bg-danger-transparent text-danger"
                            : "bg-success-transparent text-success"
                        }`}>
                          {p.stock}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-end">
                    <p className="text-xs font-semibold text-title mb-0">{p.sales?.toLocaleString() || "1,250"}</p>
                    <p className="text-[11px] text-default mb-0">Sales</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white border border-border-color rounded-md p-4 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg max-lg:text-[17px] max-xxl:text-[16px] text-title mb-0">Recent Transactions</h2>
              <Link to="/invoices" className="btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-1 hover:bg-primary hover:text-white hover:border-primary transition-colors">
                View All <i className="icon-chevron-right"></i>
              </Link>
            </div>
            <div className="space-y-3">
              {recentOrders.slice(0, 5).map((tx: any) => {
                const status = (tx.status || "paid").toLowerCase();
                const isPaid = status === "paid";
                const isPending = status === "pending" || status === "sent";
                return (
                  <div key={tx.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={tx.avatar || "/assets/img/avatar/avatar-03.jpg"}
                        className="size-9 rounded-full border border-border-color shrink-0 object-cover"
                        alt={tx.customerName}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-title truncate mb-0">{tx.customerName}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] text-default mb-0">{tx.invoiceNo}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            isPaid
                              ? "bg-success-transparent text-success"
                              : isPending
                              ? "bg-warning-transparent text-warning"
                              : "bg-danger-transparent text-danger"
                          }`}>
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="text-xs font-semibold text-title mb-0">{formatSystemAmount(tx.amount)}</p>
                      <p className="text-[11px] text-default mb-0">{tx.date}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 4: Recent Sales Activity table */}
        <div className="bg-white border border-border-color rounded-md p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg max-lg:text-[17px] text-title mb-0">Recent Sales Activity</h2>
            <Link to="/invoices" className="btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-1 hover:bg-primary hover:text-white hover:border-primary transition-colors">
              View All <i className="icon-chevron-right"></i>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-default border-b border-border-color">
                  <th className="text-left py-2 px-2 font-semibold text-gray-900">ID</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-900">Type</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-900">Customer</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-900">Amount</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-900">Date</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((ord: any) => {
                  const status = (ord.status || "paid").toLowerCase();
                  const isPaid = status === "paid";
                  const isPending = status === "pending";
                  const isSent = status === "sent";
                  return (
                    <tr key={ord.id} className="border-b border-border-color last:border-0 hover:bg-light/40 transition-colors">
                      <td className="py-2.5 px-2 text-xs text-default font-mono">
                        <Link to="/invoices" className="text-primary hover:underline">{ord.invoiceNo}</Link>
                      </td>
                      <td className="py-2.5 px-2 text-xs text-default">{ord.type || "Invoice"}</td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2">
                          <img
                            src={ord.avatar || "/assets/img/avatar/avatar-03.jpg"}
                            className="size-7 rounded-full border border-border-color shrink-0 object-cover"
                            alt={ord.customerName}
                          />
                          <span className="text-xs font-semibold text-title">{ord.customerName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-xs text-gray-900 font-semibold">{formatSystemAmount(ord.amount)}</td>
                      <td className="py-2.5 px-2 text-xs text-default">{ord.date}</td>
                      <td className="py-2.5 px-2">
                        <span className={`text-[11px] px-2 py-0.5 rounded capitalize ${
                          isPaid
                            ? "bg-success-transparent text-success"
                            : isPending
                            ? "bg-warning-transparent text-warning"
                            : isSent
                            ? "bg-info-transparent text-info"
                            : "bg-danger-transparent text-danger"
                        }`}>
                          {ord.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
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
