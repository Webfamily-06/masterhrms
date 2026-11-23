'use client';

import { usePermissions } from "@/lib/permissions";
import { AccessDenied } from "@/components/access-denied";
import { Loader2 } from "lucide-react";
import { Link } from "@/src/lib/router-compat";
import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { initFlatpickr } from "@/lib/init-dashboard";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { toast } from "sonner";

const Chart = lazy(() => import("react-apexcharts"));

export default function SupportDashboardPage() {
  const { canAccessModule, loading } = usePermissions();
  const [isMounted, setIsMounted] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [ticketYear, setTicketYear] = useState("2026");
  const [ticketYearOpen, setTicketYearOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    initFlatpickr();
  }, []);

  const { data: supData, isLoading: supLoading } = useQuery({
    queryKey: ["dashboard-support"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/dashboard/support");
        return res?.data || res || {};
      } catch (err) {
        console.warn("Failed to fetch /dashboard/support:", err);
        return {};
      }
    },
    refetchInterval: 30000,
  });

  const openTickets = supData?.openTickets ?? 42;
  const totalTickets = supData?.totalTickets ?? 128;
  const resolutionRate = supData?.resolutionRate ?? 94.6;
  const kbArticles = supData?.kbArticles ?? 378;

  // 1. Ticket Volume Bar Chart
  const ticketVolumeOptions = useMemo<any>(() => ({
    chart: { type: "bar", height: 280, toolbar: { show: false }, fontFamily: "inherit" },
    series: [
      { name: "Tickets Created", data: [42, 54, 18, 50, 72, 32, 70, 81, 87, 75, 50, 42] },
      { name: "Tickets Resolved", data: [35, 48, 15, 45, 65, 28, 62, 75, 80, 70, 46, 38] },
    ],
    plotOptions: { bar: { columnWidth: "55%", borderRadius: 3 } },
    colors: ["#0F766E", "#059669"],
    xaxis: {
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      labels: { style: { colors: "#9096A1", fontSize: "10px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { colors: "#9096A1", fontSize: "11px" } } },
    grid: { borderColor: "var(--color-border-color, #E2E8F0)", strokeDashArray: 4 },
    dataLabels: { enabled: false },
    legend: { position: "top", horizontalAlign: "right", fontSize: "11px" },
    tooltip: { theme: "dark" },
  }), []);

  // 2. SLA Pie Chart
  const slaPieOptions = useMemo<any>(() => ({
    chart: { type: "pie", height: 240, width: 240, fontFamily: "inherit" },
    series: [70, 30],
    labels: ["SLA Compliant", "SLA Breached"],
    colors: ["#059669", "#E65100"],
    stroke: { width: 0 },
    legend: { show: false },
    dataLabels: {
      style: { fontSize: "12px", colors: ["#fff"], fontWeight: 600 },
      formatter: (val: number, opts: any) => `${opts.w.config.labels[opts.seriesIndex]}\n${opts.w.config.series[opts.seriesIndex]}%`,
    },
    tooltip: { enabled: true },
  }), []);

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

  const supSpark1 = useMemo(() => createSparkOptions("#E65100"), []);
  const supSpark2 = useMemo(() => createSparkOptions("#B91C1C"), []);
  const supSpark3 = useMemo(() => createSparkOptions("#059669"), []);
  const supSpark4 = useMemo(() => createSparkOptions("#6A1B9A"), []);

  // 3. Satisfaction Gauge Donut
  const satisfactionGaugeOptions = useMemo<any>(() => ({
    chart: { type: "donut", height: 220, fontFamily: "inherit" },
    series: [10, 25, 65],
    labels: ["Dissatisfied", "Neutral", "Satisfied"],
    colors: ["#B91C1C", "#0EA5E9", "#059669"],
    stroke: { width: 2, colors: ["#FFFFFF"] },
    legend: { show: false },
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          labels: {
            show: true,
            total: { show: true, label: "CSAT", fontSize: "11px", color: "#9096A1", formatter: () => "94%" },
          },
        },
      },
    },
    tooltip: { theme: "dark" },
  }), []);

  // 4. Response Rate Stacked Area Chart
  const responseRateOptions = useMemo<any>(() => ({
    chart: { type: "area", height: 180, stacked: true, toolbar: { show: false }, fontFamily: "inherit" },
    series: [
      { name: "Creation Time", data: [3.2, 3.5, 2.9, 3.8, 3.4, 2.7, 3.1, 3.6, 2.8, 3.3, 3.0, 2.9] },
      { name: "Response Time", data: [4.1, 4.3, 4.0, 4.5, 4.2, 3.9, 4.4, 4.6, 4.1, 4.5, 4.2, 4.0] },
    ],
    xaxis: {
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      labels: { style: { colors: "#9096A1", fontSize: "10px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { colors: "#9096A1", fontSize: "10px" } } },
    grid: { borderColor: "var(--color-border-color, #E2E8F0)", strokeDashArray: 4 },
    stroke: { curve: "smooth", width: 2 },
    colors: ["#0EA5E9", "#059669"],
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.1, stops: [0, 100] },
    },
    dataLabels: { enabled: false },
    tooltip: { theme: "dark" },
  }), []);

  const handleExport = (fmt: string) => {
    toast.success(`Exporting Support data as ${fmt.toUpperCase()}...`);
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

  if (!canAccessModule("support")) {
    return (
      <AccessDenied
        moduleName="Support Dashboard"
        requiredPermission="support.dashboard.view"
        message="You do not have permission to access the Support Dashboard."
      />
    );
  }

  return (
    <div className="w-full min-w-0 flex-1">
      <div className="p-3 lg:py-6 lg:px-0">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 lg:mb-6">
          <BreadcrumbNav />
          <h1 className="text-gray-900 text-xl font-bold mb-0">Support Dashboard</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/helpdesk"
              className="btn-sm bg-dark text-white border border-dark inline-flex items-center gap-2 hover:bg-primary-hover hover:border-primary-hover cursor-pointer transition-colors"
            >
              <i className="ph ph-plus"></i> Add Ticket
            </Link>
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
                  >
                    Export as PDF
                  </button>
                  <button
                    onClick={() => handleExport("excel")}
                    className="flex w-full items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light transition-colors text-left"
                  >
                    Export as Excel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 1: Ticket Volume Bar Chart */}
        <div className="bg-white border border-border-color rounded-md p-4 mb-3 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg max-lg:text-[17px] text-title mb-0">Ticket Volume</h2>
            <div className="relative inline-flex">
              <button
                type="button"
                onClick={() => setTicketYearOpen(!ticketYearOpen)}
                className="cursor-pointer btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-2 hover:bg-primary hover:border-primary hover:text-white transition-colors"
              >
                {ticketYear} <i className="icon-chevron-down"></i>
              </button>
              {ticketYearOpen && (
                <div className="absolute right-0 top-full mt-2 w-32 bg-white border border-border-color shadow-lg rounded-md p-1 z-50 space-y-1">
                  {["2026", "2025", "2024"].map((yr) => (
                    <button
                      key={yr}
                      onClick={() => { setTicketYear(yr); setTicketYearOpen(false); }}
                      className="flex w-full items-center px-2 py-1 rounded text-xs text-gray-900 hover:bg-light text-left"
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div id="sup-ticket-volume-chart" className="min-h-[280px]">
            {isMounted ? (
              <Suspense fallback={<div className="h-[280px] flex items-center justify-center text-xs text-muted-foreground animate-pulse">Loading Ticket Volume...</div>}>
                <Chart type="bar" height={280} options={ticketVolumeOptions} series={ticketVolumeOptions.series} />
              </Suspense>
            ) : (
              <div className="h-[280px] bg-slate-50 animate-pulse rounded" />
            )}
          </div>
        </div>

        {/* Row 2: SLA Breaches + 4 Sparklines */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 mb-3">
          <div className="bg-white border border-border-color rounded-md p-4 xl:col-span-4 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg max-lg:text-[17px] text-title mb-0">SLA Breaches</h2>
              <span className="text-xs text-muted-foreground border border-border-color px-2 py-0.5 rounded">Weekly</span>
            </div>
            <div id="sup-sla-pie" className="flex justify-center min-h-[240px]">
              {isMounted ? (
                <Suspense fallback={<div className="h-[240px] flex items-center justify-center text-xs text-muted-foreground animate-pulse">Loading SLA Chart...</div>}>
                  <Chart type="pie" height={240} width={240} options={slaPieOptions} series={slaPieOptions.series} />
                </Suspense>
              ) : (
                <div className="h-[240px] bg-slate-50 animate-pulse rounded" />
              )}
            </div>
            <div className="flex items-center justify-center gap-3 mt-3 text-[11px]">
              <div className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-success"></span>
                <span className="text-default">SLA Compliant</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-orange"></span>
                <span className="text-default">SLA Breached</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xl:col-span-8">
            <div className="bg-white border border-border-color rounded-md p-4 overflow-hidden shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs text-default mb-1">Open Tickets</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-xl font-bold text-gray-900 mb-0">{openTickets}</h3>
                    <span className="text-[11px] text-success font-medium inline-flex items-center">
                      <i className="ph ph-arrow-up text-[10px]"></i>Live
                    </span>
                  </div>
                </div>
                <div className="size-9 rounded-md bg-orange-transparent flex items-center justify-center shrink-0">
                  <i className="ph-duotone ph-folder-open text-orange"></i>
                </div>
              </div>
              <div id="sup-spark-1" className="-mx-4 -mb-4 h-[60px]">
                {isMounted && (
                  <Suspense fallback={null}>
                    <Chart type="area" height={60} options={supSpark1} series={[{ data: [12, 18, 14, 22, 16, 24, 20, 28, 22, 30, 24, 32] }]} />
                  </Suspense>
                )}
              </div>
            </div>

            <div className="bg-white border border-border-color rounded-md p-4 overflow-hidden shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs text-default mb-1">Total Tickets</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-xl font-bold text-gray-900 mb-0">{totalTickets}</h3>
                    <span className="text-[11px] text-success font-medium inline-flex items-center">
                      <i className="ph ph-arrow-up text-[10px]"></i>Live
                    </span>
                  </div>
                </div>
                <div className="size-9 rounded-md bg-danger-transparent flex items-center justify-center shrink-0">
                  <i className="ph-duotone ph-chart-line-up text-danger"></i>
                </div>
              </div>
              <div id="sup-spark-2" className="-mx-4 -mb-4 h-[60px]">
                {isMounted && (
                  <Suspense fallback={null}>
                    <Chart type="area" height={60} options={supSpark2} series={[{ data: [18, 14, 22, 16, 24, 20, 28, 22, 30, 24, 32, 26] }]} />
                  </Suspense>
                )}
              </div>
            </div>

            <div className="bg-white border border-border-color rounded-md p-4 overflow-hidden shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs text-default mb-1">Resolution Rate</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-xl font-bold text-gray-900 mb-0">{resolutionRate}%</h3>
                    <span className="text-[11px] text-success font-medium inline-flex items-center">
                      <i className="ph ph-arrow-up text-[10px]"></i>Live
                    </span>
                  </div>
                </div>
                <div className="size-9 rounded-md bg-success-transparent flex items-center justify-center shrink-0">
                  <i className="ph-duotone ph-package text-success"></i>
                </div>
              </div>
              <div id="sup-spark-3" className="-mx-4 -mb-4 h-[60px]">
                {isMounted && (
                  <Suspense fallback={null}>
                    <Chart type="area" height={60} options={supSpark3} series={[{ data: [10, 14, 12, 18, 14, 20, 16, 24, 18, 26, 20, 28] }]} />
                  </Suspense>
                )}
              </div>
            </div>

            <div className="bg-white border border-border-color rounded-md p-4 overflow-hidden shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs text-default mb-1">KB Articles</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-xl font-bold text-gray-900 mb-0">{kbArticles}</h3>
                    <span className="text-[11px] text-success font-medium inline-flex items-center">
                      <i className="ph ph-arrow-up text-[10px]"></i>8.34%
                    </span>
                  </div>
                </div>
                <div className="size-9 rounded-md bg-purple-transparent flex items-center justify-center shrink-0">
                  <i className="ph-duotone ph-book-open text-purple"></i>
                </div>
              </div>
              <div id="sup-spark-4" className="-mx-4 -mb-4 h-[60px]">
                {isMounted && (
                  <Suspense fallback={null}>
                    <Chart type="area" height={60} options={supSpark4} series={[{ data: [14, 18, 16, 22, 18, 26, 20, 28, 22, 30, 24, 32] }]} />
                  </Suspense>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Satisfaction Rate & Ticket Response Rate + Recent Tickets */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 mb-3">
          <div className="xl:col-span-4 space-y-3">
            <div className="bg-white border border-border-color rounded-md p-4 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg max-lg:text-[17px] text-title mb-0">Satisfaction Rate</h2>
                <span className="text-xs text-muted-foreground border border-border-color px-2 py-0.5 rounded">Weekly</span>
              </div>
              <div id="sup-satisfaction-gauge" className="flex justify-center min-h-[220px]">
                {isMounted ? (
                  <Suspense fallback={<div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground animate-pulse">Loading CSAT...</div>}>
                    <Chart type="donut" height={220} options={satisfactionGaugeOptions} series={satisfactionGaugeOptions.series} />
                  </Suspense>
                ) : (
                  <div className="h-[220px] bg-slate-50 animate-pulse rounded" />
                )}
              </div>
              <div className="flex items-center justify-center gap-3 mt-3 text-[11px]">
                <div className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-danger"></span><span className="text-default">Dissatisfied</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-info"></span><span className="text-default">Neutral</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-success"></span><span className="text-default">Satisfied</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-border-color rounded-md p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg max-lg:text-[17px] text-title mb-0">Ticket Response Rate</h2>
                <span className="text-xs text-muted-foreground border border-border-color px-2 py-0.5 rounded">Weekly</span>
              </div>
              <div id="sup-response-rate-chart" className="min-h-[180px]">
                {isMounted ? (
                  <Suspense fallback={<div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground animate-pulse">Loading Response Rate...</div>}>
                    <Chart type="area" height={180} options={responseRateOptions} series={responseRateOptions.series} />
                  </Suspense>
                ) : (
                  <div className="h-[180px] bg-slate-50 animate-pulse rounded" />
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-border-color rounded-md p-4 xl:col-span-8 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg max-lg:text-[17px] text-title mb-0">Recent Tickets</h2>
              <span className="text-xs text-muted-foreground border border-border-color px-2 py-0.5 rounded">Weekly</span>
            </div>
            <div className="space-y-3">
              {[
                { name: "Robert Cosper", code: "#CUS0020", count: 45, date: "05 Sep 2025", status: "Open", avatar: "/assets/img/avatar/avatar-03.jpg" },
                { name: "Helen Nelson", code: "#CUS0019", count: 41, date: "11 Sep 2025", status: "Pending", avatar: "/assets/img/avatar/avatar-04.jpg" },
                { name: "Thomas Neal", code: "#CUS0018", count: 36, date: "27 Aug 2025", status: "Resolved", avatar: "/assets/img/avatar/avatar-05.jpg" },
                { name: "Sarah Spivey", code: "#CUS0017", count: 32, date: "15 Aug 2025", status: "Closed", avatar: "/assets/img/avatar/avatar-06.jpg" },
                { name: "Jared Griffin", code: "#CUS0016", count: 29, date: "03 Aug 2025", status: "Open", avatar: "/assets/img/avatar/avatar-07.jpg" },
                { name: "Alexander Kenn", code: "#CUS0015", count: 25, date: "28 Jul 2025", status: "Pending", avatar: "/assets/img/avatar/avatar-08.jpg" },
              ].map((c, i) => (
                <div key={i} className="sm:grid sm:grid-cols-12 items-center flex justify-between gap-3 p-1.5 rounded hover:bg-light/40 transition-colors">
                  <div className="flex items-center gap-2 min-w-0 col-span-12 sm:col-span-4">
                    <img src={c.avatar} className="size-9 rounded-full border border-border-color shrink-0 object-cover" alt="user" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-title truncate mb-0">{c.name}</p>
                      <p className="text-[11px] text-default mb-0">{c.code}</p>
                    </div>
                  </div>
                  <div className="hidden sm:block sm:col-span-3">
                    <p className="text-[11px] text-default mb-0">Ticket Count</p>
                    <p className="text-xs font-semibold text-title mb-0">{c.count}</p>
                  </div>
                  <div className="hidden md:block sm:col-span-2">
                    <p className="text-[11px] text-default mb-0">Last Ticket</p>
                    <p className="text-xs font-semibold text-title mb-0">{c.date}</p>
                  </div>
                  <div className="sm:col-span-3 text-end">
                    <p className="text-[11px] text-default mb-0">Status</p>
                    <span className={`text-[11px] px-2 py-0.5 rounded capitalize ${
                      c.status === "Open" ? "bg-info-transparent text-info" :
                      c.status === "Pending" ? "bg-warning-transparent text-warning" :
                      c.status === "Resolved" ? "bg-success-transparent text-success" :
                      "bg-danger-transparent text-danger"
                    }`}>
                      {c.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 4: All Tickets table */}
        <div className="bg-white border border-border-color rounded-md p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg max-lg:text-[17px] text-title mb-0">All Support Tickets</h2>
            <Link to="/helpdesk" className="btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-1 hover:bg-primary hover:text-white hover:border-primary transition-colors">
              Helpdesk Inbox <i className="icon-chevron-right"></i>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-default border-b border-border-color">
                  <th className="text-left py-2 px-2 font-semibold text-gray-900">Ticket ID</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-900">Customer</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-900">Created On</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-900">Subject</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-900">Priority</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-900">Assigned To</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id: "#TKT0020", name: "Alexander Kenn", created: "11 Sep 2025", subject: "Login Issue", priority: "Low", agent: "Steven Schroer", status: "Open", avatar: "/assets/img/avatar/avatar-03.jpg" },
                  { id: "#TKT0019", name: "Gabriella White", created: "05 Sep 2025", subject: "Invoice Query", priority: "Medium", agent: "Regina Bryant", status: "Pending", avatar: "/assets/img/avatar/avatar-04.jpg" },
                  { id: "#TKT0018", name: "Christopher Rey", created: "27 Aug 2025", subject: "Password Reset", priority: "High", agent: "James Parker", status: "Resolved", avatar: "/assets/img/avatar/avatar-05.jpg" },
                  { id: "#TKT0017", name: "Penelope Ton", created: "16 Aug 2025", subject: "Purchase Order Issue", priority: "Low", agent: "Muriel Hood", status: "Closed", avatar: "/assets/img/avatar/avatar-06.jpg" },
                  { id: "#TKT0011", name: "Catherine Lan", created: "18 May 2025", subject: "Bug Report", priority: "Low", agent: "Tina Williams", status: "Pending", avatar: "/assets/img/avatar/avatar-07.jpg" },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-border-color last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-2 text-xs text-default font-mono">
                      <Link to="/helpdesk" className="text-primary hover:underline">{row.id}</Link>
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        <img src={row.avatar} className="size-7 rounded-full border border-border-color shrink-0 object-cover" alt="user" />
                        <span className="text-xs font-semibold text-title">{row.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-xs text-default">{row.created}</td>
                    <td className="py-2.5 px-2 text-xs font-medium text-title">{row.subject}</td>
                    <td className="py-2.5 px-2">
                      <span className={`text-[11px] px-2 py-0.5 rounded ${
                        row.priority === "High" ? "bg-danger-transparent text-danger" :
                        row.priority === "Medium" ? "bg-warning-transparent text-warning" :
                        "bg-info-transparent text-info"
                      }`}>
                        {row.priority}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-xs text-default">{row.agent}</td>
                    <td className="py-2.5 px-2">
                      <span className={`text-[11px] px-2 py-0.5 rounded capitalize ${
                        row.status === "Open" ? "bg-info-transparent text-info" :
                        row.status === "Pending" ? "bg-warning-transparent text-warning" :
                        row.status === "Resolved" ? "bg-success-transparent text-success" :
                        "bg-danger-transparent text-danger"
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
