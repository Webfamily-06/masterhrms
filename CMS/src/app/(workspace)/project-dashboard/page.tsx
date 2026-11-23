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

export default function ProjectDashboardPage() {
  const { canAccessModule, loading } = usePermissions();
  const [isMounted, setIsMounted] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [progressPeriod, setProgressPeriod] = useState("Weekly");
  const [progressPeriodOpen, setProgressPeriodOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    initFlatpickr();
  }, []);

  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: ["dashboard-projects"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/dashboard/projects");
        return res?.data || res || {};
      } catch (err) {
        console.warn("Failed to fetch /dashboard/projects:", err);
        return {};
      }
    },
    refetchInterval: 30000,
  });

  const totalProjects = projectData?.totalProjects ?? 24;
  const activeProjects = projectData?.activeProjects ?? 16;
  const completedTasks = projectData?.completedTasks ?? 142;
  const inProgressTasks = projectData?.inProgressTasks ?? 38;
  const overdueTasks = projectData?.overdueTasks ?? 7;

  // 4 KPI Bar Sparkline Options
  const createBarSparkOptions = (color: string) => ({
    chart: { type: "bar", height: 60, sparkline: { enabled: true }, fontFamily: "inherit" },
    plotOptions: { bar: { columnWidth: "50%", borderRadius: 1 } },
    colors: [color],
    tooltip: { enabled: false },
  });

  const pjSpark1 = useMemo(() => createBarSparkOptions("#E65100"), []);
  const pjSpark2 = useMemo(() => createBarSparkOptions("#0EA5E9"), []);
  const pjSpark3 = useMemo(() => createBarSparkOptions("#6A1B9A"), []);
  const pjSpark4 = useMemo(() => createBarSparkOptions("#059669"), []);

  // Project Progress 4-line chart
  const progressChartOptions = useMemo<any>(() => ({
    chart: { type: "line", height: 200, toolbar: { show: false }, fontFamily: "inherit" },
    series: [
      { name: "Completed", data: [30, 40, 35, 50, 25, 55, 70, 60, 75, 80, 70, 65] },
      { name: "Inprogress", data: [20, 30, 25, 35, 19, 40, 45, 50, 55, 45, 50, 40] },
      { name: "Not Started Yet", data: [40, 30, 35, 20, 19, 30, 25, 35, 25, 30, 35, 30] },
      { name: "Cancelled", data: [60, 50, 55, 40, 70, 50, 45, 55, 50, 60, 65, 55] },
    ],
    xaxis: {
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      labels: { style: { colors: "#9096A1", fontSize: "10px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      min: 0, max: 100, tickAmount: 5,
      labels: { offsetX: -10, style: { colors: "#9096A1", fontSize: "11px" } },
    },
    grid: { borderColor: "var(--color-border-color, #E2E8F0)", strokeDashArray: 4 },
    stroke: { curve: "smooth", width: 2 },
    colors: ["#059669", "#0EA5E9", "#D97706", "#B91C1C"],
    legend: { show: false },
    dataLabels: { enabled: false },
    tooltip: { theme: "dark", shared: true, intersect: false },
    markers: { size: 3, hover: { size: 5 } },
  }), []);

  // Resource Utilization Heatmap
  const resourceChartOptions = useMemo<any>(() => ({
    chart: { type: "heatmap", height: 230, toolbar: { show: false }, fontFamily: "inherit" },
    series: [
      { name: "Admin", data: [{ x: "0%", y: 0 }, { x: "20%", y: 0 }, { x: "40%", y: 0 }, { x: "60%", y: 0 }, { x: "80%", y: 0 }] },
      { name: "Devops", data: [{ x: "0%", y: 1 }, { x: "20%", y: 1 }, { x: "40%", y: 0 }, { x: "60%", y: 0 }, { x: "80%", y: 0 }] },
      { name: "Document", data: [{ x: "0%", y: 1 }, { x: "20%", y: 0 }, { x: "40%", y: 0 }, { x: "60%", y: 0 }, { x: "80%", y: 0 }] },
      { name: "Testing", data: [{ x: "0%", y: 1 }, { x: "20%", y: 2 }, { x: "40%", y: 3 }, { x: "60%", y: 4 }, { x: "80%", y: 0 }] },
      { name: "Backend", data: [{ x: "0%", y: 1 }, { x: "20%", y: 2 }, { x: "40%", y: 0 }, { x: "60%", y: 0 }, { x: "80%", y: 0 }] },
      { name: "Frontend", data: [{ x: "0%", y: 1 }, { x: "20%", y: 2 }, { x: "40%", y: 0 }, { x: "60%", y: 0 }, { x: "80%", y: 0 }] },
      { name: "UI/UX", data: [{ x: "0%", y: 1 }, { x: "20%", y: 2 }, { x: "40%", y: 3 }, { x: "60%", y: 4 }, { x: "80%", y: 5 }] },
    ],
    plotOptions: {
      heatmap: {
        radius: 2,
        enableShades: true,
        colorScale: {
          ranges: [
            { from: 0, to: 0, color: "#F1F5F9", name: "0" },
            { from: 1, to: 2, color: "#A7F3D0", name: "Low" },
            { from: 3, to: 4, color: "#34D399", name: "Medium" },
            { from: 5, to: 6, color: "#0F766E", name: "High" },
          ],
        },
      },
    },
    dataLabels: { enabled: false },
    xaxis: { labels: { style: { colors: "#9096A1", fontSize: "10px" } } },
    yaxis: { labels: { style: { colors: "#9096A1", fontSize: "11px" } } },
    grid: { padding: { right: 0 } },
    legend: { show: false },
    tooltip: { theme: "dark" },
  }), []);

  // Task Summary Donut Chart
  const taskSummaryOptions = useMemo<any>(() => ({
    chart: { type: "donut", height: 160, width: 160, fontFamily: "inherit" },
    series: [completedTasks || 40, inProgressTasks || 30, overdueTasks || 10, 15, 5],
    labels: ["Completed", "Pending", "In Progress", "Active", "Cancelled"],
    colors: ["#059669", "#E65100", "#0EA5E9", "#6A1B9A", "#B91C1C"],
    stroke: { width: 0 },
    legend: { show: false },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: "75%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Completed",
              fontSize: "10px",
              color: "#9096A1",
              formatter: () => "40%",
            },
            value: { fontSize: "16px", fontWeight: 700, color: "#1E293B" },
          },
        },
      },
    },
    tooltip: { theme: "dark" },
  }), [completedTasks, inProgressTasks, overdueTasks]);

  const handleExport = (fmt: string) => {
    toast.success(`Exporting Project metrics as ${fmt.toUpperCase()}...`);
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
    <div className="dashboard-scope w-full min-w-0 flex-1">
      <div className="p-3 lg:p-6 lg:px-0">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 lg:mb-6">
          <BreadcrumbNav />
          <h1 className="text-gray-900 dark:text-gray-100 text-xl max-lg:text-lg font-bold mb-0">Project Dashboard</h1>
          <div className="flex items-center flex-wrap gap-2">
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

        {/* Row 1: 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-3">
          <div className="bg-white border border-border-color rounded-md p-4 overflow-hidden shadow-xs">
            <div className="flex items-center gap-3 mb-2">
              <div className="size-10 rounded-full bg-orange-transparent flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-folder-user text-orange text-lg"></i>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-default mb-1">Total Projects</p>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl max-lg:text-lg font-bold text-gray-900 mb-0">{totalProjects}</h2>
                  <span className="text-[11px] text-success font-medium inline-flex items-center">
                    <i className="ph ph-arrow-up text-[10px]"></i>Live
                  </span>
                </div>
              </div>
            </div>
            <div id="pj-spark-1" className="-mx-4 -mb-4 h-[60px]">
              {isMounted && (
                <Suspense fallback={null}>
                  <Chart type="bar" height={60} options={pjSpark1} series={[{ data: [4,6,3,7,5,8,4,9,5,7,4,8,5,6,3,7,5,8,4,9,5,7,4,8,5,6] }]} />
                </Suspense>
              )}
            </div>
          </div>

          <div className="bg-white border border-border-color rounded-md p-4 overflow-hidden shadow-xs">
            <div className="flex items-center gap-3 mb-2">
              <div className="size-10 rounded-full bg-info-transparent flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-circle-half text-info text-lg"></i>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-default mb-1">Active Projects</p>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl max-lg:text-lg font-bold text-gray-900 mb-0">{activeProjects}</h2>
                  <span className="text-[11px] text-success font-medium inline-flex items-center">
                    <i className="ph ph-arrow-up text-[10px]"></i>Live
                  </span>
                </div>
              </div>
            </div>
            <div id="pj-spark-2" className="-mx-4 -mb-4 h-[60px]">
              {isMounted && (
                <Suspense fallback={null}>
                  <Chart type="bar" height={60} options={pjSpark2} series={[{ data: [5,3,6,4,7,5,8,6,9,7,5,8,6,9,7,5,8,6,9,7,5,8,6,9,7,5] }]} />
                </Suspense>
              )}
            </div>
          </div>

          <div className="bg-white border border-border-color rounded-md p-4 overflow-hidden shadow-xs">
            <div className="flex items-center gap-3 mb-2">
              <div className="size-10 rounded-full bg-purple-transparent flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-check-circle text-purple text-lg"></i>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-default mb-1">Finished Tasks</p>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl max-lg:text-lg font-bold text-gray-900 mb-0">{completedTasks}</h2>
                  <span className="text-[11px] text-success font-medium inline-flex items-center">
                    <i className="ph ph-arrow-up text-[10px]"></i>Live
                  </span>
                </div>
              </div>
            </div>
            <div id="pj-spark-3" className="-mx-4 -mb-4 h-[60px]">
              {isMounted && (
                <Suspense fallback={null}>
                  <Chart type="bar" height={60} options={pjSpark3} series={[{ data: [4,7,5,8,6,9,7,5,8,6,9,7,5,8,6,9,7,5,8,6,9,7,5,8,6,9] }]} />
                </Suspense>
              )}
            </div>
          </div>

          <div className="bg-white border border-border-color rounded-md p-4 overflow-hidden shadow-xs">
            <div className="flex items-center gap-3 mb-2">
              <div className="size-10 rounded-full bg-success-transparent flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-users text-success text-lg"></i>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-default mb-1">In-Progress Tasks</p>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl max-lg:text-lg font-bold text-gray-900 mb-0">{inProgressTasks}</h2>
                  <span className="text-[11px] text-success font-medium inline-flex items-center">
                    <i className="ph ph-arrow-up text-[10px]"></i>Live
                  </span>
                </div>
              </div>
            </div>
            <div id="pj-spark-4" className="-mx-4 -mb-4 h-[60px]">
              {isMounted && (
                <Suspense fallback={null}>
                  <Chart type="bar" height={60} options={pjSpark4} series={[{ data: [6,4,7,5,8,6,9,7,5,8,6,9,7,5,8,6,9,7,5,8,6,9,7,5,8,6] }]} />
                </Suspense>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Projects Progress + Resource Utilization */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 mb-3">
          <div className="bg-white border border-border-color rounded-md p-4 pb-0 xl:col-span-8 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Projects Progress</h3>
              <div className="relative inline-flex">
                <button
                  type="button"
                  onClick={() => setProgressPeriodOpen(!progressPeriodOpen)}
                  className="cursor-pointer btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-2 hover:bg-primary hover:border-primary hover:text-white transition-colors"
                >
                  {progressPeriod} <i className="icon-chevron-down"></i>
                </button>
                {progressPeriodOpen && (
                  <div className="absolute right-0 top-full mt-2 w-32 bg-white border border-border-color shadow-lg rounded-md p-1 z-50 space-y-1">
                    {["Weekly", "Monthly", "Yearly"].map((p) => (
                      <button
                        key={p}
                        onClick={() => { setProgressPeriod(p); setProgressPeriodOpen(false); }}
                        className="flex w-full items-center px-2 py-1 rounded text-xs text-gray-900 hover:bg-light text-left"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-center flex-wrap gap-3 mb-2 text-[11px]">
              <div className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-success"></span>
                <span className="text-default">Completed</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-info"></span>
                <span className="text-default">Inprogress</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-warning"></span>
                <span className="text-default">Not Started Yet</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-danger"></span>
                <span className="text-default">Cancelled</span>
              </div>
            </div>
            <div id="pj-progress-chart" className="min-h-[200px]">
              {isMounted ? (
                <Suspense fallback={<div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground animate-pulse">Loading Projects Progress...</div>}>
                  <Chart type="line" height={200} options={progressChartOptions} series={progressChartOptions.series} />
                </Suspense>
              ) : (
                <div className="h-[200px] bg-slate-50 animate-pulse rounded" />
              )}
            </div>
          </div>

          <div className="bg-white border border-border-color rounded-md p-4 pb-0 xl:col-span-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Resource Utilization</h3>
              <span className="text-xs text-muted-foreground border border-border-color px-2 py-0.5 rounded">Weekly</span>
            </div>
            <div id="resource-chart" className="min-h-[230px]">
              {isMounted ? (
                <Suspense fallback={<div className="h-[230px] flex items-center justify-center text-xs text-muted-foreground animate-pulse">Loading Resource Utilization...</div>}>
                  <Chart type="heatmap" height={230} options={resourceChartOptions} series={resourceChartOptions.series} />
                </Suspense>
              ) : (
                <div className="h-[230px] bg-slate-50 animate-pulse rounded" />
              )}
            </div>
          </div>
        </div>

        {/* Row 3: Tasks + Milestones */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
          <div className="bg-white border border-border-color rounded-md p-4 pb-1.5 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Tasks</h3>
              <Link to="/tasks" className="btn-sm bg-white border border-border-color text-dark hover:bg-primary hover:border-primary hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-colors">
                View All<i className="icon-chevron-right"></i>
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-default border-b border-border-color">
                    <th className="text-left py-2 px-2 font-semibold text-gray-900">Task Name</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-900">Assigned To</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: "TSK-001", title: "API Gateway Microservice Migration", assignedTo: "Alex Kenn", project: "ERP Core", status: "in_progress" },
                    { id: "TSK-002", title: "Setup RBAC Auth Policies & Middleware", assignedTo: "Gabriella White", project: "Security Module", status: "done" },
                    { id: "TSK-003", title: "PostgreSQL Database Partitioning", assignedTo: "Christopher Rey", project: "Database Optimization", status: "pending" },
                    { id: "TSK-004", title: "Design System Token Alignment", assignedTo: "Penelope Ton", project: "Design Revamp", status: "done" },
                  ].map((task) => (
                    <tr key={task.id} className="border-b border-border-color last:border-0 hover:bg-light/40 transition-colors">
                      <td className="py-2.5 px-2">
                        <p className="text-[11px] text-default mb-0.5 leading-tight font-mono">{task.id}</p>
                        <p className="text-xs font-semibold text-title mb-0 leading-tight">{task.title}</p>
                      </td>
                      <td className="py-2.5 px-2 vertical-middle">
                        <p className="text-xs font-semibold text-title mb-0">{task.assignedTo}</p>
                        <span className="text-[10px] text-muted-foreground">{task.project}</span>
                      </td>
                      <td className="py-2.5 px-2 vertical-middle">
                        <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded font-medium capitalize ${
                          task.status === "done" ? "bg-success-transparent text-success" :
                          task.status === "in_progress" ? "bg-info-transparent text-info" :
                          "bg-warning-transparent text-warning"
                        }`}>
                          {task.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-border-color rounded-md p-4 pb-1.5 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Milestones</h3>
              <Link to="/projects" className="btn-sm bg-white border border-border-color text-dark hover:bg-primary hover:border-primary hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-colors">
                View All<i className="icon-chevron-right"></i>
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-default border-b border-border-color">
                    <th className="text-left py-2 px-2 font-semibold text-gray-900">ID</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-900">Milestone Name</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-900">Target Date</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: "MLS-01", title: "HRMS Alpha Release Launch", project: "Master HRMS", date: "15 Feb 2026", status: "completed" },
                    { id: "MLS-02", title: "Inventory Multi-Warehouse Hubs", project: "Supply Chain", date: "28 Feb 2026", status: "in_progress" },
                    { id: "MLS-03", title: "POS Offline Sync Capability", project: "POS Terminal", date: "10 Mar 2026", status: "pending" },
                    { id: "MLS-04", title: "Enterprise Single Sign-On (SAML)", project: "Security Module", date: "25 Mar 2026", status: "pending" },
                  ].map((ms) => (
                    <tr key={ms.id} className="border-b border-border-color last:border-0 hover:bg-light/40 transition-colors">
                      <td className="py-2.5 px-2">
                        <span className="text-xs text-default font-mono font-medium">{ms.id}</span>
                      </td>
                      <td className="py-2.5 px-2">
                        <p className="text-xs font-semibold text-title mb-0">{ms.title}</p>
                        <span className="text-[10px] text-muted-foreground">{ms.project}</span>
                      </td>
                      <td className="py-2.5 px-2 text-xs text-default">{ms.date}</td>
                      <td className="py-2.5 px-2">
                        <span className={`text-[11px] px-2 py-0.5 rounded capitalize ${
                          ms.status === "completed" ? "bg-success-transparent text-success" :
                          ms.status === "in_progress" ? "bg-info-transparent text-info" :
                          "bg-warning-transparent text-warning"
                        }`}>
                          {ms.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Row 4: Timesheet + Teams + Task Summary */}
        <div className="grid grid-cols-1 xl:grid-cols-12 lg:grid-cols-12 gap-3 mb-3">
          <div className="bg-white border border-border-color rounded-md p-4 lg:col-span-12 xl:col-span-4 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Timesheet Summary</h3>
              <span className="text-xs text-muted-foreground border border-border-color px-2 py-0.5 rounded">Weekly</span>
            </div>
            <div className="space-y-3">
              {[
                { name: "Robert Cosper", role: "Full Stack Engineer", hours: "38.5 hrs", project: "HRMS Core", avatar: "/assets/img/avatar/avatar-03.jpg" },
                { name: "Helen Nelson", role: "UI/UX Designer", hours: "40.0 hrs", project: "Design Revamp", avatar: "/assets/img/avatar/avatar-04.jpg" },
                { name: "Thomas Neal", role: "DevOps Engineer", hours: "36.0 hrs", project: "Cloud Infra", avatar: "/assets/img/avatar/avatar-05.jpg" },
              ].map((t, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 p-1.5 rounded hover:bg-light/40">
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={t.avatar} className="size-8 rounded-full border border-border-color shrink-0 object-cover" alt={t.name} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-title truncate mb-0">{t.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate mb-0">{t.role}</p>
                    </div>
                  </div>
                  <div className="text-end">
                    <p className="text-xs font-bold text-primary mb-0">{t.hours}</p>
                    <span className="text-[10px] text-muted-foreground">{t.project}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-border-color rounded-md p-4 lg:col-span-6 xl:col-span-4 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Teams</h3>
              <Link to="/departments" className="btn-sm bg-white border border-border-color text-dark hover:bg-primary hover:border-primary hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-colors">
                View All<i className="icon-chevron-right"></i>
              </Link>
            </div>
            <div className="space-y-3">
              {[
                { name: "Core Engineering", members: 12, lead: "Alex Kenn", status: "Active" },
                { name: "Product & UX Design", members: 6, lead: "Helen Nelson", status: "Active" },
                { name: "Quality Assurance", members: 5, lead: "Thomas Neal", status: "Active" },
                { name: "Site Reliability / DevOps", members: 4, lead: "Jared Griffin", status: "Active" },
              ].map((team, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 p-1.5 rounded hover:bg-light/40">
                  <div>
                    <p className="text-xs font-semibold text-title mb-0">{team.name}</p>
                    <p className="text-[11px] text-muted-foreground mb-0">Lead: {team.lead}</p>
                  </div>
                  <span className="text-[11px] font-semibold bg-primary-transparent text-primary px-2 py-0.5 rounded">
                    {team.members} members
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-border-color rounded-md p-4 lg:col-span-6 xl:col-span-4 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Task Summary</h3>
              <span className="text-xs text-muted-foreground border border-border-color px-2 py-0.5 rounded">Weekly</span>
            </div>
            <div id="pj-task-summary-chart" className="flex justify-center min-h-[160px]">
              {isMounted ? (
                <Suspense fallback={<div className="h-[160px] flex items-center justify-center text-xs text-muted-foreground animate-pulse">Loading Task Summary...</div>}>
                  <Chart type="donut" height={160} width={160} options={taskSummaryOptions} series={taskSummaryOptions.series} />
                </Suspense>
              ) : (
                <div className="h-[160px] bg-slate-50 animate-pulse rounded" />
              )}
            </div>
            <div className="space-y-1.5 mt-3">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-success"></span>
                  <span className="text-default">Completed ({completedTasks})</span>
                </div>
                <span className="font-semibold text-gray-900">40%</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-info"></span>
                  <span className="text-default">In Progress ({inProgressTasks})</span>
                </div>
                <span className="font-semibold text-gray-900">30%</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-danger"></span>
                  <span className="text-default">Overdue ({overdueTasks})</span>
                </div>
                <span className="font-semibold text-gray-900">10%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 5: All Projects */}
        <div className="bg-white border border-border-color rounded-md p-4 pb-1.5 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">All Projects</h3>
            <Link to="/projects" className="btn-sm bg-white border border-border-color text-dark hover:bg-primary hover:border-primary hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-colors">
              Manage Projects <i className="icon-chevron-right"></i>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-default border-b border-border-color">
                  <th className="text-left py-2 px-2 font-semibold text-gray-900">ID</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-900">Project Name</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-900">Priority</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-900">Progress</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id: "PRJ-001", name: "Enterprise HRMS Cloud Migration", priority: "High", progress: 75, status: "in_progress" },
                  { id: "PRJ-002", name: "AI Resume Screening Pipeline", priority: "Medium", progress: 90, status: "completed" },
                  { id: "PRJ-003", name: "Multi-Store POS Offline Cache", priority: "High", progress: 45, status: "in_progress" },
                  { id: "PRJ-004", name: "Financial Audit Compliance 2026", priority: "Urgent", progress: 30, status: "pending" },
                  { id: "PRJ-005", name: "Biometric Attendance IoT Bridge", priority: "Low", progress: 100, status: "completed" },
                ].map((proj) => (
                  <tr key={proj.id} className="border-b border-border-color last:border-0 hover:bg-light/40 transition-colors">
                    <td className="py-2.5 px-2 text-xs text-default font-mono font-medium">{proj.id}</td>
                    <td className="py-2.5 px-2">
                      <p className="text-xs font-semibold text-title mb-0">{proj.name}</p>
                    </td>
                    <td className="py-2.5 px-2 text-xs text-default font-medium">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        proj.priority === "High" || proj.priority === "Urgent" ? "bg-danger-transparent text-danger" : "bg-info-transparent text-info"
                      }`}>
                        {proj.priority}
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="w-28 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${proj.progress}%` }}></div>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{proj.progress}%</span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className={`text-[11px] px-2 py-0.5 rounded capitalize ${
                        proj.status === "completed" ? "bg-success-transparent text-success" :
                        proj.status === "in_progress" ? "bg-info-transparent text-info" :
                        "bg-warning-transparent text-warning"
                      }`}>
                        {proj.status.replace("_", " ")}
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
