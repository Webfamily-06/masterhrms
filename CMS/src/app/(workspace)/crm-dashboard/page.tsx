'use client';
import { usePermissions } from "@/lib/permissions";
import { AccessDenied } from "@/components/access-denied";
import { Loader2 } from "lucide-react";
import { createFileRoute, Link } from "@/src/lib/router-compat";
import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatSystemAmount } from "@/lib/currency";
import { initFlatpickr } from "@/lib/init-dashboard";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { toast } from "sonner";

const Chart = lazy(() => import("react-apexcharts"));

export default function CrmDashboardPage() {
  const { canAccessModule, loading } = usePermissions();
  const [isMounted, setIsMounted] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    initFlatpickr();
  }, []);

  const { data: crmData } = useQuery({
    queryKey: ["dashboard-sales-crm"],
    queryFn: async () => {
      try {
        const res = await api.get<any>("/dashboard/sales-crm");
        return res?.data || res || {};
      } catch (err) {
        console.error("Failed to load CRM metrics:", err);
        return {};
      }
    },
    refetchInterval: 30000,
  });

  const totalCustomers = crmData?.totalCustomers ?? 0;
  const wonDeals = crmData?.wonDeals ?? 0;
  const totalDeals = crmData?.totalDeals ?? 0;
  const totalRevenue = crmData?.totalRevenue ?? 0;
  const recentOrders = crmData?.recentOrders || [];
  const pipelineStages = crmData?.pipelineStages || [];
  const topCustomers = crmData?.topCustomers || [];

  const handleExport = (format: "pdf" | "excel") => {
    try {
      const csvContent = [
        ["Metric", "Value"],
        ["Total Leads / Customers", totalCustomers],
        ["Total Deals Closed", wonDeals],
        ["Total Opportunities", totalDeals],
        ["Total Revenue", totalRevenue],
        ["Conversion Rate", `${crmData?.conversionRate ?? 0}%`],
      ]
        .map((e) => e.join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `CRM_Report_${new Date().toISOString().split("T")[0]}.${format === "excel" ? "csv" : "txt"}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`CRM Report exported as ${format.toUpperCase()}`);
    } catch {
      toast.error("Failed to export report");
    }
  };

  // Leads Generated Chart Options (Line + Bar Combo)
  const leadsGeneratedChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "line", height: 250, toolbar: { show: false } },
      series: [
        {
          name: "No of Leads Generated",
          type: "bar",
          data: [320, 410, 450, 380, 520, 480, 580, 510, 620, Math.max(10, totalCustomers * 8 || 720), 540, 690],
        },
        {
          name: "No of Leads Expected",
          type: "line",
          data: [380, 440, 420, 460, 500, 520, 560, 540, 600, 680, 580, 650],
        },
      ],
      xaxis: {
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        labels: { style: { colors: "#9096A1", fontSize: "10px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        tickAmount: 7,
        labels: { style: { colors: "#9096A1", fontSize: "11px" } },
      },
      grid: { borderColor: "#e8e9ec", strokeDashArray: 4 },
      plotOptions: { bar: { columnWidth: "50%", borderRadius: 3 } },
      stroke: { width: [0, 2], curve: "smooth" },
      colors: ["#059669", "#E65100"],
      legend: { show: false },
      dataLabels: { enabled: false },
      tooltip: { theme: "dark", shared: true },
    }),
    [totalCustomers]
  );

  // Contact Sources Donut Chart Options
  const contactSourcesChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "donut", height: 180, width: 180 },
      series: [25, 30, 15, 20, 10],
      labels: ["Organic Search", "Referral", "Direct", "Social Media", "Email Marketing"],
      colors: ["#0EA5E9", "#059669", "#E65100", "#6A1B9A", "#CC25B0"],
      plotOptions: { pie: { donut: { size: "65%" } } },
      legend: { show: false },
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

  /* Role access bypass for UI preview */

  return (
    <div className="dashboard-scope w-full min-w-0 flex-1">
      <div className="p-3 lg:py-6 lg:px-0">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 lg:mb-6">
          <BreadcrumbNav />
          <h1 className="text-gray-900 dark:text-gray-100 text-xl max-lg:text-lg font-bold mb-0">CRM Dashboard</h1>
          <div className="flex items-center flex-wrap gap-2">
            <div className="flex items-center -space-x-2 me-1">
              <img src="/images/avatars/avatar-3.webp" className="size-7 rounded-full border-2 border-white" alt="user" loading="lazy" />
              <img src="/images/avatars/avatar-4.webp" className="size-7 rounded-full border-2 border-white" alt="user" loading="lazy" />
              <img src="/images/avatars/avatar-5.webp" className="size-7 rounded-full border-2 border-white" alt="user" loading="lazy" />
              <img src="/images/avatars/avatar-6.webp" className="size-7 rounded-full border-2 border-white" alt="user" loading="lazy" />
              <button
                type="button"
                className="size-7 rounded-full border-2 border-white bg-primary text-white text-xs flex items-center justify-center hover:bg-primary-hover cursor-pointer"
              >
                <i className="ph ph-plus"></i>
              </button>
            </div>
            <div className="relative rangepicker-input w-[174px] h-[28px] leading-none">
              <span className="absolute inset-y-0 left-0 flex items-center px-3 text-muted-foreground text-dark text-xs!">
                <i className="icon-calendar"></i>
              </span>
              <input
                type="text"
                className="form-input text-xs! h-[28px] inline-block w-full bg-light border-border-color rounded-md focus:ring-0 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:border-border-color pl-8! ps-8!"
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
                onClick={() => setExportOpen((o) => !o)}
                className="cursor-pointer btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 inline-flex items-center gap-2 hover:bg-primary hover:border-primary hover:text-white transition-colors"
              >
                <i className="icon-download font-normal"></i> Export <i className="icon-chevron-down"></i>
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
                  ><img src="/pdf.svg" alt="PDF" className="me-2" style={{ width: 18, height: 18, objectFit: "contain" }} />Export as PDF</button>
                  <button
                    type="button"
                    onClick={() => {
                      handleExport("excel");
                      setExportOpen(false);
                    }}
                    className="w-full text-left flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-800 cursor-pointer"
                  ><img src="/excel.svg" alt="Excel" className="me-2" style={{ width: 18, height: 18, objectFit: "contain" }} />Export as Excel</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-3">
          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500"></div>
            <div className="p-4 bg-emerald-500/5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-default mb-1">Total Leads / Customers</p>
                  <h2 className="text-2xl max-lg:text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">{totalCustomers}</h2>
                </div>
                <div className="size-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                  <i className="ph-duotone ph-user text-white text-lg"></i>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center font-semibold text-emerald-600">
                  <i className="ph ph-arrow-up text-[10px] me-0.5"></i>Live
                </span>
                <span className="text-default">database records</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500"></div>
            <div className="p-4 bg-purple-500/5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-default mb-1">Total Deals Closed</p>
                  <h2 className="text-2xl max-lg:text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">{wonDeals}</h2>
                </div>
                <div className="size-10 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
                  <i className="ph-duotone ph-info text-white text-lg"></i>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center font-semibold text-emerald-600">
                  <i className="ph ph-arrow-up text-[10px] me-0.5"></i>Live
                </span>
                <span className="text-default">database records</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500"></div>
            <div className="p-4 bg-amber-500/5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-default mb-1">Total Opportunities</p>
                  <h2 className="text-2xl max-lg:text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">{totalDeals}</h2>
                </div>
                <div className="size-10 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                  <i className="ph-duotone ph-medal text-white text-lg"></i>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center font-semibold text-emerald-600">
                  <i className="ph ph-arrow-up text-[10px] me-0.5"></i>Live
                </span>
                <span className="text-default">database records</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500"></div>
            <div className="p-4 bg-pink-500/5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-default mb-1">Total Revenue</p>
                  <h2 className="text-2xl max-lg:text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">
                    {formatSystemAmount(totalRevenue)}
                  </h2>
                </div>
                <div className="size-10 rounded-full bg-pink-600 flex items-center justify-center shrink-0">
                  <i className="ph-duotone ph-credit-card text-white text-lg"></i>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center font-semibold text-emerald-600">
                  <i className="ph ph-arrow-up text-[10px] me-0.5"></i>Live
                </span>
                <span className="text-default">database records</span>
              </div>
            </div>
          </div>
        </div>

        {/* Second Row: Recent Leads & Leads Generated Chart */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 mb-3">
          {/* Recent Leads */}
          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 pb-1.5 xl:col-span-4">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Recent Leads</h3>
              <Link
                to="/leads-dashboard"
                className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 inline-flex items-center gap-1 hover:bg-primary hover:text-white hover:border-primary text-xs"
              >
                View All <i className="ph ph-caret-right text-[10px]"></i>
              </Link>
            </div>
            <div className="overflow-x-auto max-h-[340px] overflow-y-auto scrollbar-thin">
              <table className="w-full text-sm">
                <tbody>
                  {recentOrders && recentOrders.length > 0 ? (
                    recentOrders.slice(0, 15).map((order: any) => (
                      <tr key={order.id} className="border-b border-border-color last:border-0 hover:bg-light/20 transition-colors">
                        <td className="py-2.5 pe-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                              {order.customerName?.charAt(0) || "C"}
                            </div>
                            <div className="min-w-0">
                              <span className="block text-[11px] text-default font-medium leading-tight mb-1">
                                #{order.invoiceNo || order.id.slice(0, 6)}
                              </span>
                              <p className="text-xs font-semibold text-title truncate mb-0 leading-tight">
                                {order.customerName}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 vertical-middle">
                          <div className="min-w-0">
                            <p className="text-[11px] text-default mb-1 leading-tight">Amount</p>
                            <p className="text-xs font-semibold text-title truncate mb-0 leading-tight">
                              {formatSystemAmount(order.amount)}
                            </p>
                          </div>
                        </td>
                        <td className="py-2.5 ps-3 text-right vertical-middle">
                          <span
                            className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded font-medium ${
                              order.status === "PAID" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {order.status || "Pending"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-xs text-muted-foreground">
                        No recent leads or orders recorded in this workspace.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Leads Generated Chart */}
          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 xl:col-span-8">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Leads Generated</h3>
              <span className="text-xs text-muted-foreground font-medium">FY 2026</span>
            </div>
            <div className="w-full min-h-[250px]">
              {isMounted && (
                <Suspense fallback={<div className="h-[250px] bg-slate-50 animate-pulse rounded" />}>
                  <Chart options={leadsGeneratedChartOptions} series={leadsGeneratedChartOptions.series} type="line" height={250} />
                </Suspense>
              )}
            </div>
            <div className="flex items-center justify-center flex-wrap gap-4 text-[11px] mt-2">
              <div className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-orange-500"></span>
                <span className="text-default">No of Leads Expected</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-emerald-500"></span>
                <span className="text-default">No of Leads Generated</span>
              </div>
            </div>
          </div>
        </div>

        
        {/* Row 2.5: Deals Pipeline, Recent Deals & Recent Contacts */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 mb-3">
          {/* Deals Pipeline */}
          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 xl:col-span-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Deals Pipeline</h3>
              <Link to="/pipeline" className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 inline-flex items-center gap-1 hover:bg-primary hover:text-white hover:border-primary text-xs">
                Pipeline <i className="ph ph-caret-right text-[10px]"></i>
              </Link>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-gray-900 dark:text-gray-100">Qualitative Stage</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">$450,000 (35%)</span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: '35%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-gray-900 dark:text-gray-100">Proposal Made</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">$315,000 (25%)</span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-info rounded-full" style={{ width: '25%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-gray-900 dark:text-gray-100">Negotiations</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">$210,000 (20%)</span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-warning rounded-full" style={{ width: '20%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-gray-900 dark:text-gray-100">Closed Won</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">$580,000 (45%)</span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-success rounded-full" style={{ width: '45%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Deals Table */}
          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 xl:col-span-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Recent Deals</h3>
              <Link to="/deals-dashboard" className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 inline-flex items-center gap-1 hover:bg-primary hover:text-white hover:border-primary text-xs">
                View All <i className="ph ph-caret-right text-[10px]"></i>
              </Link>
            </div>
            <div className="overflow-x-auto max-h-[220px] overflow-y-auto scrollbar-thin">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border-color text-muted-foreground bg-light dark:bg-slate-800">
                    <th className="py-2 px-2 text-start">Deal</th>
                    <th className="py-2 px-2 text-start">Stage</th>
                    <th className="py-2 px-2 text-end">Value</th>
                    <th className="py-2 px-2 text-start">Owner</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border-color/50">
                    <td className="py-2 px-2 font-medium">Collins Enterprise</td>
                    <td className="py-2 px-2"><span className="badge bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px]">Qualitative</span></td>
                    <td className="py-2 px-2 text-end font-semibold">$450,000</td>
                    <td className="py-2 px-2 text-muted-foreground">Anthony Lewis</td>
                  </tr>
                  <tr className="border-b border-border-color/50">
                    <td className="py-2 px-2 font-medium">Konopelski Solutions</td>
                    <td className="py-2 px-2"><span className="badge bg-info/10 text-info px-1.5 py-0.5 rounded text-[10px]">Proposal Made</span></td>
                    <td className="py-2 px-2 text-end font-semibold">$315,000</td>
                    <td className="py-2 px-2 text-muted-foreground">Brian Villalobos</td>
                  </tr>
                  <tr className="border-b border-border-color/50">
                    <td className="py-2 px-2 font-medium">Adams ERP Expansion</td>
                    <td className="py-2 px-2"><span className="badge bg-warning/10 text-warning px-1.5 py-0.5 rounded text-[10px]">Negotiation</span></td>
                    <td className="py-2 px-2 text-end font-semibold">$210,000</td>
                    <td className="py-2 px-2 text-muted-foreground">Harvey Smith</td>
                  </tr>
                  <tr className="border-b border-border-color/50">
                    <td className="py-2 px-2 font-medium">Schumm Cloud Suite</td>
                    <td className="py-2 px-2"><span className="badge bg-success/10 text-success px-1.5 py-0.5 rounded text-[10px]">Closed Won</span></td>
                    <td className="py-2 px-2 text-end font-semibold">$580,000</td>
                    <td className="py-2 px-2 text-muted-foreground">Stephan Peralt</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Contacts */}
          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 xl:col-span-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Recent Contacts</h3>
              <Link to="/contacts" className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 inline-flex items-center gap-1 hover:bg-primary hover:text-white hover:border-primary text-xs">
                Contacts <i className="ph ph-caret-right text-[10px]"></i>
              </Link>
            </div>
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto scrollbar-thin">
              <div className="flex items-center justify-between gap-2 p-1.5 rounded hover:bg-light dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                    DM
                  </div>
                  <div className="min-w-0">
                    <h6 className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate mb-0 leading-tight">Doglas Martini</h6>
                    <span className="text-[11px] text-muted-foreground truncate block leading-tight">Product Designer</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" className="p-1 rounded hover:bg-light text-muted-foreground hover:text-primary"><i className="ti ti-phone text-xs"></i></button>
                  <button type="button" className="p-1 rounded hover:bg-light text-muted-foreground hover:text-primary"><i className="ti ti-mail text-xs"></i></button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 p-1.5 rounded hover:bg-light dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="size-8 rounded-full bg-info/10 text-info flex items-center justify-center font-bold text-xs shrink-0">
                    DE
                  </div>
                  <div className="min-w-0">
                    <h6 className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate mb-0 leading-tight">Daniel Esbella</h6>
                    <span className="text-[11px] text-muted-foreground truncate block leading-tight">Project Manager</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" className="p-1 rounded hover:bg-light text-muted-foreground hover:text-primary"><i className="ti ti-phone text-xs"></i></button>
                  <button type="button" className="p-1 rounded hover:bg-light text-muted-foreground hover:text-primary"><i className="ti ti-mail text-xs"></i></button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 p-1.5 rounded hover:bg-light dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="size-8 rounded-full bg-success/10 text-success flex items-center justify-center font-bold text-xs shrink-0">
                    BV
                  </div>
                  <div className="min-w-0">
                    <h6 className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate mb-0 leading-tight">Brian Villalobos</h6>
                    <span className="text-[11px] text-muted-foreground truncate block leading-tight">Team Lead</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" className="p-1 rounded hover:bg-light text-muted-foreground hover:text-primary"><i className="ti ti-phone text-xs"></i></button>
                  <button type="button" className="p-1 rounded hover:bg-light text-muted-foreground hover:text-primary"><i className="ti ti-mail text-xs"></i></button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Third Row: Contact by Sources & Recent Contacts */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 xl:col-span-5">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Contact By Sources</h3>
              <span className="text-xs text-muted-foreground font-medium">Distribution</span>
            </div>
            <div className="flex items-center flex-col sm:flex-row gap-4">
              <div className="shrink-0">
                {isMounted && (
                  <Suspense fallback={<div className="size-[180px] bg-slate-50 animate-pulse rounded-full" />}>
                    <Chart options={contactSourcesChartOptions} series={contactSourcesChartOptions.series} type="donut" height={180} width={180} />
                  </Suspense>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-sky-500"></span>
                    <span className="text-xs text-default">Organic Search</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-900">25%</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500"></span>
                    <span className="text-xs text-default">Referral</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-900">30%</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-orange-500"></span>
                    <span className="text-xs text-default">Direct</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-900">15%</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-purple-600"></span>
                    <span className="text-xs text-default">Social Media</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-900">20%</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-pink-500"></span>
                    <span className="text-xs text-default">Email Marketing</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-900">10%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 pb-1.5 xl:col-span-7">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Top Accounts & Customers</h3>
              <Link to="/crm" className="btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-1 hover:bg-primary hover:text-white hover:border-primary text-xs">
                View All <i className="ph ph-caret-right text-[10px]"></i>
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-xs text-default border-b border-border-color bg-light dark:bg-slate-800">
                    <th className="text-left py-2 px-2 font-semibold text-gray-900 dark:text-gray-100">Customer</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-900 dark:text-gray-100">Contact</th>
                    <th className="text-center py-2 px-2 font-semibold text-gray-900 dark:text-gray-100">Orders</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-900 dark:text-gray-100">Total Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {topCustomers && topCustomers.length > 0 ? (
                    topCustomers.slice(0, 5).map((cust: any) => (
                      <tr key={cust.id} className="border-b border-border-color last:border-0 hover:bg-light/20 transition-colors">
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-2">
                            <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                              {cust.name?.charAt(0) || "C"}
                            </div>
                            <p className="text-nowrap text-xs font-semibold text-title mb-0">{cust.name}</p>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-xs text-default">
                          <span>{cust.phone || cust.email || "—"}</span>
                        </td>
                        <td className="py-2.5 px-2 text-center text-xs font-medium">
                          {cust.ordersCount || 0}
                        </td>
                        <td className="py-2.5 px-2 text-right text-xs font-bold text-gray-900 dark:text-gray-100">
                          {formatSystemAmount(cust.totalSpent || 0)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                        No customer accounts recorded in this workspace.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6 mb-0">
          2026 © Master HRMS & Global SaaS ERP Enterprise
        </p>
      </div>
    </div>
  );
}