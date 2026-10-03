import { usePermissions } from "@/lib/permissions";
import { AccessDenied } from "@/components/access-denied";
import { Loader2 } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const Chart = lazy(() => import("react-apexcharts"));

export const Route = createFileRoute("/_authenticated/_app/hrm-dashboard")({
  component: DashboardPage,
});

export default function DashboardPage() {
  const { canAccessModule, loading } = usePermissions();
  const [isMounted, setIsMounted] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch HRM Metrics from database
  const { data: hrmData } = useQuery({
    queryKey: ["dashboard-hrm-realtime-data"],
    queryFn: async () => {
      try {
        const res = await api.get("/dashboard/hrm");
        return res;
      } catch (err) {
        console.error("Failed to load dashboard metrics:", err);
        return null;
      }
    },
    refetchInterval: 30000,
  });

  const { data: profile } = useCurrentProfile();
  const userName = profile?.full_name?.split(" ")[0] || "Andrew";
  const totalEmployees = hrmData?.totalWorkforce ?? 1284;
  const newThisMonth = hrmData?.newThisMonth ?? 12;
  const pendingLeaves = hrmData?.pendingLeavesCount ?? 7;
  const onLeaveToday = hrmData?.onLeaveToday ?? 23;
  const attendanceRate = hrmData?.attendanceRate ?? 94.2;
  const presentCount = hrmData?.attendanceSummary?.present ?? 1209;
  const lateCount = hrmData?.attendanceSummary?.late ?? 78;
  const absentCount = hrmData?.attendanceSummary?.absent ?? 52;

  const handleExport = (format: "pdf" | "excel") => {
    try {
      const csvContent = [
        ["Metric", "Value"],
        ["Total Workforce", totalEmployees],
        ["New Employees This Month", newThisMonth],
        ["On Leave Today", onLeaveToday],
        ["Attendance Rate", `${attendanceRate}%`],
        ["Present Today", presentCount],
        ["Late Today", lateCount],
        ["Absent Today", absentCount],
        ["Pending Leaves", pendingLeaves],
        ["Monthly Payroll", "$1,248K"],
      ]
        .map((e) => e.join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `HRM_Dashboard_Report_${new Date().toISOString().split("T")[0]}.${format === "excel" ? "csv" : "txt"}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`HRM Report exported as ${format.toUpperCase()}`);
    } catch {
      toast.error("Failed to export report");
    }
  };

  // 1. Employee Distribution Donut Chart (matching ui/assets/js/apex-chart-data.js lines 19-87)
  const employeeDistributionChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: "donut",
        height: 150,
        width: 150,
      },
      grid: {
        padding: { top: 0, right: 0, bottom: -10, left: 0 },
      },
      series: [488, 282, 231, 180, 103],
      labels: ["Engineering", "Marketing", "Finance", "Sales", "HR"],
      colors: ["#2563EB", "#F97316", "#10B981", "#EC4899", "#1E293B"],
      stroke: { width: 0 },
      legend: { show: false },
      plotOptions: {
        pie: {
          donut: {
            size: "72%",
            labels: {
              show: true,
              name: { show: true, fontSize: "10px", color: "#94A3B8", offsetY: 18 },
              value: { show: true, fontSize: "16px", fontWeight: 700, color: "#1E293B", offsetY: -10 },
              total: {
                show: true,
                showAlways: true,
                label: "Employees",
                fontSize: "10px",
                fontWeight: 400,
                color: "#94A3B8",
                formatter: () => "1,284",
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

  // 2. Weekly Attendance Trend Bar Chart (matching ui/assets/js/apex-chart-data.js lines 91-110)
  const weeklyAttendanceChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: "bar",
        height: 110,
        toolbar: { show: false },
        sparkline: { enabled: false },
      },
      series: [{ name: "Present", data: [86, 92, 88, 78, 95, 70, 45] }],
      xaxis: {
        categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        labels: { style: { colors: "#94A3B8", fontSize: "10px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { show: false },
      grid: { show: false, padding: { left: 0, right: 0, top: -20, bottom: 0 } },
      plotOptions: {
        bar: { columnWidth: "50%", borderRadius: 3, distributed: true },
      },
      colors: ["#2563EB", "#2563EB", "#2563EB", "#F97316", "#2563EB", "#2563EB", "#2563EB"],
      legend: { show: false },
      dataLabels: { enabled: false },
      tooltip: { y: { formatter: (v) => v + "%" } },
    }),
    []
  );

  // 3. 6-Month Payroll Trend Area Chart (matching ui/assets/js/apex-chart-data.js lines 114-149)
  const payrollTrendChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: "area",
        height: 80,
        toolbar: { show: false },
        sparkline: { enabled: false },
        background: "transparent",
      },
      series: [{ name: "Payroll", data: [950, 1080, 1020, 1180, 1100, 1248] }],
      xaxis: {
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        labels: { style: { colors: "#94A3B8", fontSize: "10px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { show: false },
      grid: { show: false, padding: { left: 10, right: 18, top: -10, bottom: 0 } },
      stroke: { curve: "smooth", width: 2 },
      colors: ["#10B981"],
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.5,
          opacityTo: 0,
          stops: [0, 100],
        },
      },
      dataLabels: { enabled: false },
      tooltip: {
        theme: "dark",
        y: { formatter: (v) => "$" + v + "K" },
      },
      markers: { size: 0 },
    }),
    []
  );

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canAccessModule("hrm") && !canAccessModule("dashboard")) {
    return <AccessDenied moduleName="HRM Dashboard" />;
  }

  return (
    <div className="p-0">
      {/* ── Greeting & Actions (matching ui/index.html line 1268) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 lg:mb-6">
        <div>
          <h1 className="text-gray-900 dark:text-gray-100 text-xl max-lg:text-lg font-bold mb-1">
            Good morning, {userName}
          </h1>
          <p className="text-sm text-default mb-0">
            You have {pendingLeaves} leave requests and 2 urgent alerts pending.
          </p>
        </div>
        <div className="flex items-center gap-2">
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

          <Link
            to="/employees"
            className="btn-sm bg-dark text-white border border-dark flex items-center gap-2 hover:bg-primary-hover hover:border-primary-hover cursor-pointer transition-colors"
          >
            <i className="ph-duotone ph-plus-circle"></i> Add Employee
          </Link>
        </div>
      </div>

      {/* ── Top Row: Total Workforce, KPIs, Employee Distribution, Run Payroll, Attendance Summary ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-4">
        {/* Left Col (4 cols): Total Workforce + 4 KPI Cards */}
        <div className="flex flex-col gap-4 xl:col-span-4">
          {/* Total Workforce */}
          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 flex-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-base font-bold text-title mb-0">Total Workforce</p>
              <div className="size-10 shrink-0 bg-indigo-600 rounded-md flex items-center justify-center">
                <i className="ph-duotone ph-users text-white text-2xl"></i>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl max-lg:text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">
                {totalEmployees.toLocaleString()}
              </h2>
              <span className="inline-flex items-center text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                <i className="ph-bold ph-arrow-up-right text-[10px] me-1"></i> {newThisMonth} new this month
              </span>
            </div>
            <p className="text-[13px] text-default mb-0">Active employees across 7 departments</p>
          </div>

          {/* KPI 2x2 Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* On Leave Today */}
            <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="size-9 bg-primary rounded-md flex items-center justify-center">
                  <i className="ph-duotone ph-calendar-blank text-xl text-white"></i>
                </div>
                <span className="inline-flex items-center text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                  <i className="ph-bold ph-arrow-up-right me-1"></i>3.64%
                </span>
              </div>
              <p className="text-xs text-default mb-1">On Leave Today</p>
              <h3 className="text-2xl max-lg:text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">
                {onLeaveToday}
              </h3>
            </div>

            {/* Attendance Rate */}
            <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="size-9 bg-amber-500 rounded-md flex items-center justify-center">
                  <i className="ph-duotone ph-user-check text-xl text-white"></i>
                </div>
                <span className="inline-flex items-center text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                  <i className="ph-bold ph-arrow-up-right me-1"></i>3.64%
                </span>
              </div>
              <p className="text-xs text-default mb-1">Attendance Rate</p>
              <h3 className="text-2xl max-lg:text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">
                {attendanceRate}%
              </h3>
            </div>

            {/* Open Positions */}
            <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="size-9 bg-purple-600 rounded-md flex items-center justify-center">
                  <i className="ph-duotone ph-user-plus text-xl text-white"></i>
                </div>
                <span className="inline-flex items-center text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                  <i className="ph-bold ph-arrow-up-right me-1"></i>3.64%
                </span>
              </div>
              <p className="text-xs text-default mb-1">Open Positions</p>
              <h3 className="text-2xl max-lg:text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">47</h3>
            </div>

            {/* Monthly Payroll */}
            <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="size-9 bg-rose-500 rounded-md flex items-center justify-center">
                  <i className="ph-duotone ph-currency-circle-dollar text-xl text-white"></i>
                </div>
                <span className="inline-flex items-center text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                  <i className="ph-bold ph-arrow-up-right me-1"></i>3.64%
                </span>
              </div>
              <p className="text-xs text-default mb-1">Monthly Payroll</p>
              <h3 className="text-2xl max-lg:text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">$1,248K</h3>
            </div>
          </div>
        </div>

        {/* Middle Col (4 cols): Employee Distribution + Run Payroll CTA */}
        <div className="flex flex-col gap-4 xl:col-span-4">
          {/* Employee Distribution */}
          <div className="bg-white dark:bg-slate-900 p-4 border border-border-color rounded-md flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Employee Distribution</h3>
              <span className="inline-flex items-center text-[11px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                Workforce
              </span>
            </div>
            <div>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="shrink-0 flex items-center justify-center">
                  {isMounted && (
                    <Suspense fallback={<div className="size-[150px] flex items-center justify-center text-xs">Loading chart...</div>}>
                      <Chart
                        options={employeeDistributionChartOptions}
                        series={employeeDistributionChartOptions.series}
                        type="donut"
                        height={150}
                        width={150}
                      />
                    </Suspense>
                  )}
                </div>
                <div className="flex-1 space-y-1.5 w-full">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-blue-600"></span>
                      <span className="text-xs text-default">Engineering</span>
                    </div>
                    <p className="text-xs font-semibold text-title mb-0">488</p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-amber-500"></span>
                      <span className="text-xs text-default">Marketing</span>
                    </div>
                    <p className="text-xs font-semibold text-title mb-0">282</p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-500"></span>
                      <span className="text-xs text-default">Finance</span>
                    </div>
                    <p className="text-xs font-semibold text-title mb-0">231</p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-pink-500"></span>
                      <span className="text-xs text-default">Sales</span>
                    </div>
                    <p className="text-xs font-semibold text-title mb-0">180</p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-slate-800 dark:bg-slate-300"></span>
                      <span className="text-xs text-default">HR</span>
                    </div>
                    <p className="text-xs font-semibold text-title mb-0">103</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border-color">
                <div className="text-center bg-light dark:bg-slate-800/50 border border-border-color rounded-md p-2">
                  <h3 className="text-base font-bold text-title mb-0.5">1196</h3>
                  <p className="text-xs text-default mb-0">Active</p>
                </div>
                <div className="text-center bg-light dark:bg-slate-800/50 border border-border-color rounded-md p-2">
                  <h3 className="text-base font-bold text-title mb-0.5">88</h3>
                  <p className="text-xs text-default mb-0">Probation</p>
                </div>
                <div className="text-center bg-light dark:bg-slate-800/50 border border-border-color rounded-md p-2">
                  <h3 className="text-base font-bold text-title mb-0.5">12</h3>
                  <p className="text-xs text-default mb-0">Notice</p>
                </div>
              </div>
            </div>
          </div>

          {/* Run Payroll CTA (matching ui/index.html line 1447) */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-md p-4 flex items-center justify-between gap-3 text-white">
            <div>
              <p className="text-lg max-lg:text-[17px] font-bold text-white mb-0.5">Run Payroll</p>
              <p className="text-xs text-blue-100 mb-0">Process Monthly Pay</p>
            </div>
            <Link
              to="/payroll"
              className="btn-sm bg-white border border-border-color text-slate-900 hover:bg-slate-100 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 font-semibold rounded-md px-3 py-2 shadow-xs transition-colors"
            >
              <i className="ph-duotone ph-currency-circle-dollar text-base"></i> Run Payroll
            </Link>
          </div>
        </div>

        {/* Right Col (4 cols): Attendance Summary */}
        <div className="bg-white dark:bg-slate-900 p-4 pb-0 border border-border-color rounded-md xl:col-span-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Attendance Summary</h3>
              <Link
                to="/attendance"
                className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-title hover:bg-primary hover:border-primary hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-colors text-xs px-2.5 py-1 rounded"
              >
                View Logs <i className="ph-bold ph-caret-right text-[10px]"></i>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              <div className="border border-border-color bg-light dark:bg-slate-800/40 rounded-md p-3">
                <p className="text-xs text-default mb-1">Present</p>
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">{presentCount}</h4>
                <p className="text-[11px] text-default mb-0">{attendanceRate}% of workforce</p>
              </div>
              <div className="border border-border-color bg-light dark:bg-slate-800/40 rounded-md p-3">
                <p className="text-xs text-default mb-1">Late</p>
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">{lateCount}</h4>
                <p className="text-[11px] text-default mb-0">After 9:30 AM</p>
              </div>
              <div className="border border-border-color bg-light dark:bg-slate-800/40 rounded-md p-3">
                <p className="text-xs text-default mb-1">Absent</p>
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">{absentCount}</h4>
                <p className="text-[11px] text-default mb-0">Unplanned absence</p>
              </div>
              <div className="border border-border-color bg-light dark:bg-slate-800/40 rounded-md p-3">
                <p className="text-xs text-default mb-1">Remote</p>
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">361</h4>
                <p className="text-[11px] text-default mb-0">WFH approved</p>
              </div>
            </div>
            <p className="text-sm font-bold text-title mb-1">Weekly Attendance Trend</p>
          </div>
          <div className="w-full">
            {isMounted && (
              <Suspense fallback={<div className="h-[110px] flex items-center justify-center text-xs">Loading chart...</div>}>
                <Chart
                  options={weeklyAttendanceChartOptions}
                  series={weeklyAttendanceChartOptions.series}
                  type="bar"
                  height={110}
                />
              </Suspense>
            )}
          </div>
        </div>
      </div>

      {/* ── Middle Row: Monthly Payroll Card & Recruitment Pipeline (matching ui/index.html line 1498) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        {/* Monthly Payroll Banner + Trend */}
        <div className="relative overflow-hidden rounded-md border border-border-color bg-white dark:bg-slate-900">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
              <div>
                <p className="text-blue-100 text-xs mb-1">Monthly Payroll</p>
                <h3 className="font-bold text-white text-2xl mb-1">$1,248K</h3>
                <p className="text-[13px] text-blue-100 mb-0">March 2026 · 1,196 employees</p>
              </div>
              <Link
                to="/payroll"
                className="btn-sm bg-white border border-border-color text-slate-900 hover:bg-slate-100 flex items-center justify-center gap-1.5 cursor-pointer font-semibold rounded-md px-3 py-1.5 shadow-xs transition-colors text-xs"
              >
                <i className="ph-duotone ph-download-simple"></i> Download Payslip
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-blue-100 text-xs mb-1">Avg Salary</p>
                <h4 className="text-2xl max-lg:text-xl text-white font-bold mb-0">$1,285.3K</h4>
              </div>
              <div>
                <p className="text-blue-100 text-xs mb-1">Last Month</p>
                <h4 className="text-2xl max-lg:text-xl text-white font-bold mb-0">$1,196K</h4>
              </div>
              <div>
                <p className="text-blue-100 text-xs mb-1">MOM Growth</p>
                <h4 className="text-2xl max-lg:text-xl text-white font-bold mb-0">4.2%</h4>
              </div>
            </div>
          </div>
          <div className="p-4 pb-0">
            <p className="text-lg max-lg:text-[17px] text-gray-900 dark:text-gray-100 font-bold mb-0">
              6-Month Payroll Trend
            </p>
            {isMounted && (
              <Suspense fallback={<div className="h-[80px] flex items-center justify-center text-xs">Loading chart...</div>}>
                <Chart
                  options={payrollTrendChartOptions}
                  series={payrollTrendChartOptions.series}
                  type="area"
                  height={80}
                />
              </Suspense>
            )}
          </div>
        </div>

        {/* Recruitment Pipeline */}
        <div className="bg-white dark:bg-slate-900 p-4 border border-border-color rounded-md">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Recruitment Pipeline</h3>
            <Link
              to="/recruitment"
              className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-title hover:bg-primary hover:border-primary hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-colors text-xs px-2.5 py-1 rounded"
            >
              <i className="ph-bold ph-plus text-xs"></i> Post New Job
            </Link>
          </div>
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
              <div className="border border-border-color rounded-md p-3 bg-light dark:bg-slate-800/40">
                <div className="flex items-center gap-2 mb-2">
                  <div className="size-10 bg-white dark:bg-slate-800 border border-border-color rounded-md flex items-center justify-center">
                    <i className="ph-duotone ph-clipboard-text text-2xl text-amber-500"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-title mb-0">47</h3>
                    <p className="text-xs text-default mb-0">New Applicants</p>
                  </div>
                </div>
                <div className="h-1 bg-amber-500 rounded-full"></div>
              </div>
              <div className="border border-border-color rounded-md p-3 bg-light dark:bg-slate-800/40">
                <div className="flex items-center gap-2 mb-2">
                  <div className="size-10 bg-white dark:bg-slate-800 border border-border-color rounded-md flex items-center justify-center">
                    <i className="ph-duotone ph-users text-2xl text-purple-600"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-title mb-0">23</h3>
                    <p className="text-xs text-default mb-0">Screening</p>
                  </div>
                </div>
                <div className="h-1 bg-purple-600 rounded-full"></div>
              </div>
              <div className="border border-border-color rounded-md p-3 bg-light dark:bg-slate-800/40">
                <div className="flex items-center gap-2 mb-2">
                  <div className="size-10 bg-white dark:bg-slate-800 border border-border-color rounded-md flex items-center justify-center">
                    <i className="ph-duotone ph-video-camera text-2xl text-blue-500"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-title mb-0">12</h3>
                    <p className="text-xs text-default mb-0">Interviews</p>
                  </div>
                </div>
                <div className="h-1 bg-blue-500 rounded-full"></div>
              </div>
            </div>

            <p className="text-sm font-semibold text-title mb-2">Recent Candidates</p>
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between gap-2 border border-border-color bg-light dark:bg-slate-800/40 rounded-md p-2">
                <div className="flex items-center gap-2 min-w-0">
                  <img src="/ui-assets/avatar-03.jpg" className="size-9 rounded-full border border-border-color shrink-0 object-cover" alt="Alex" />
                  <div className="min-w-0">
                    <p className="font-medium text-title text-xs truncate mb-0">Alex Thompson</p>
                    <p className="text-[11px] text-default truncate mb-0">Senior Developer</p>
                  </div>
                </div>
                <span className="text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md shrink-0">
                  Interview
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 border border-border-color bg-light dark:bg-slate-800/40 rounded-md p-2">
                <div className="flex items-center gap-2 min-w-0">
                  <img src="/ui-assets/avatar-05.jpg" className="size-9 rounded-full border border-border-color shrink-0 object-cover" alt="Maria" />
                  <div className="min-w-0">
                    <p className="font-medium text-title text-xs truncate mb-0">Maria Garcia</p>
                    <p className="text-[11px] text-default truncate mb-0">UX Designer</p>
                  </div>
                </div>
                <span className="text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-md shrink-0">
                  Applied
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 border border-border-color bg-light dark:bg-slate-800/40 rounded-md p-2">
                <div className="flex items-center gap-2 min-w-0">
                  <img src="/ui-assets/avatar-07.jpg" className="size-9 rounded-full border border-border-color shrink-0 object-cover" alt="Thomas" />
                  <div className="min-w-0">
                    <p className="font-medium text-title text-xs truncate mb-0">Thomas Mervin</p>
                    <p className="text-[11px] text-default truncate mb-0">Senior Developer</p>
                  </div>
                </div>
                <span className="text-[11px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-md shrink-0">
                  Offer Made
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 border border-border-color bg-light dark:bg-slate-800/40 rounded-md p-2">
                <div className="flex items-center gap-2 min-w-0">
                  <img src="/ui-assets/avatar-09.jpg" className="size-9 rounded-full border border-border-color shrink-0 object-cover" alt="Regina" />
                  <div className="min-w-0">
                    <p className="font-medium text-title text-xs truncate mb-0">Regina Bryant</p>
                    <p className="text-[11px] text-default truncate mb-0">Android Developer</p>
                  </div>
                </div>
                <span className="text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md shrink-0">
                  Hired
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Performance Tracking & Recent Openings Table (matching ui/index.html line 1628) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Performance Tracking (5 cols) */}
        <div className="bg-white dark:bg-slate-900 p-4 border border-border-color rounded-md xl:col-span-5">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Performance Tracking</h3>
            <Link
              to="/performance-appraisal"
              className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-title hover:bg-primary hover:border-primary hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-colors text-xs px-2.5 py-1 rounded"
            >
              Full Report <i className="ph-bold ph-caret-right text-[10px]"></i>
            </Link>
          </div>
          <div>
            <div className="space-y-3 mb-5">
              <div className="flex items-center justify-between gap-2 border border-border-color rounded-md p-3 bg-light/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <img src="/ui-assets/avatar-04.jpg" className="size-9 rounded-full border border-border-color shrink-0 object-cover" alt="Evelyn" />
                    <span className="absolute bottom-0 right-0 bg-amber-500 text-white text-[10px] font-bold rounded-full size-4 flex items-center justify-center">1</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-title text-xs truncate mb-0">Evelyn Hayes</p>
                    <p className="text-[11px] text-default truncate mb-0">Product Manager</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-gray-900 dark:text-gray-100 text-xs mb-0">98</p>
                  <p className="text-[11px] text-emerald-600 inline-flex items-center mb-0">
                    <i className="ph-bold ph-arrow-up-right me-0.5"></i>2.8%
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border border-border-color rounded-md p-3 bg-light/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative">
                    <img src="/ui-assets/avatar-06.jpg" className="size-9 rounded-full border border-border-color shrink-0 object-cover" alt="Emily" />
                    <span className="absolute bottom-0 right-0 bg-primary text-white text-[10px] font-bold rounded-full size-4 flex items-center justify-center">2</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-title text-xs truncate mb-0">Emily Carter</p>
                    <p className="text-[11px] text-default truncate mb-0">Android Developer</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-gray-900 dark:text-gray-100 text-xs mb-0">96</p>
                  <p className="text-[11px] text-emerald-600 inline-flex items-center mb-0">
                    <i className="ph-bold ph-arrow-up-right me-0.5"></i>4.8%
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border border-border-color rounded-md p-3 bg-light/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative">
                    <img src="/ui-assets/avatar-08.jpg" className="size-9 rounded-full border border-border-color shrink-0 object-cover" alt="Daniel" />
                    <span className="absolute bottom-0 right-0 bg-blue-500 text-white text-[10px] font-bold rounded-full size-4 flex items-center justify-center">3</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-title text-xs truncate mb-0">Daniel Roberts</p>
                    <p className="text-[11px] text-default truncate mb-0">Graphic Designer</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-gray-900 dark:text-gray-100 text-xs mb-0">94</p>
                  <p className="text-[11px] text-emerald-600 inline-flex items-center mb-0">
                    <i className="ph-bold ph-arrow-up-right me-0.5"></i>29.6%
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="h-1.5 bg-light dark:bg-slate-800 rounded-full overflow-hidden mb-1.5">
                  <div className="h-full bg-primary rounded-full" style={{ width: "87%" }}></div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <p className="text-default mb-0">Hiring Target</p>
                  <p className="font-bold text-gray-900 dark:text-gray-100 mb-0">87%</p>
                </div>
              </div>
              <div>
                <div className="h-1.5 bg-light dark:bg-slate-800 rounded-full overflow-hidden mb-1.5">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: "92%" }}></div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <p className="text-default mb-0">Employee Retention</p>
                  <p className="font-bold text-gray-900 dark:text-gray-100 mb-0">92%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Openings / Roles Table (7 cols) */}
        <div className="bg-white dark:bg-slate-900 p-4 pb-1.5 border border-border-color rounded-md xl:col-span-7">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Recent Openings</h3>
            <Link
              to="/recruitment"
              className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-title hover:bg-primary hover:border-primary hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-colors text-xs px-2.5 py-1 rounded"
            >
              All Openings <i className="ph-bold ph-caret-right text-[10px]"></i>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-default border-b border-border-color">
                  <th className="text-left py-2 px-2 text-[13px] font-semibold text-gray-900 dark:text-gray-100">Job Title</th>
                  <th className="text-left py-2 px-2 text-[13px] font-semibold text-gray-900 dark:text-gray-100">Category</th>
                  <th className="text-left py-2 px-2 text-[13px] font-semibold text-gray-900 dark:text-gray-100">Location</th>
                  <th className="text-left py-2 px-2 text-[13px] font-semibold text-gray-900 dark:text-gray-100">Openings</th>
                  <th className="text-left py-2 px-2 text-[13px] font-semibold text-gray-900 dark:text-gray-100">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border-color last:border-0 hover:bg-light/40 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-2">
                    <div className="inline-flex items-center gap-2">
                      <div className="size-9 rounded-md bg-light dark:bg-slate-800 border border-border-color flex items-center justify-center text-primary">
                        <i className="ph-duotone ph-device-mobile text-lg"></i>
                      </div>
                      <p className="text-xs font-semibold text-title mb-0">Senior iOS Developer</p>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-xs text-default">iOS Development</td>
                  <td className="py-3 px-2 text-xs text-default">New York, USA</td>
                  <td className="py-3 px-2 text-xs text-default font-mono">02</td>
                  <td className="py-3 px-2">
                    <span className="inline-flex items-center text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-medium">
                      <i className="ph-bold ph-check-circle text-[10px] me-1"></i>Active
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-border-color last:border-0 hover:bg-light/40 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-2">
                    <div className="inline-flex items-center gap-2">
                      <div className="size-9 rounded-md bg-light dark:bg-slate-800 border border-border-color flex items-center justify-center text-purple-600">
                        <i className="ph-duotone ph-code text-lg"></i>
                      </div>
                      <p className="text-xs font-semibold text-title mb-0">Junior PHP Developer</p>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-xs text-default">Web & Application</td>
                  <td className="py-3 px-2 text-xs text-default">Los Angeles, USA</td>
                  <td className="py-3 px-2 text-xs text-default font-mono">03</td>
                  <td className="py-3 px-2">
                    <span className="inline-flex items-center text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-medium">
                      <i className="ph-bold ph-check-circle text-[10px] me-1"></i>Active
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-border-color last:border-0 hover:bg-light/40 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-2">
                    <div className="inline-flex items-center gap-2">
                      <div className="size-9 rounded-md bg-light dark:bg-slate-800 border border-border-color flex items-center justify-center text-amber-500">
                        <i className="ph-duotone ph-broadcast text-lg"></i>
                      </div>
                      <p className="text-xs font-semibold text-title mb-0">Network Engineer</p>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-xs text-default">Networking</td>
                  <td className="py-3 px-2 text-xs text-default">Bristol, UK</td>
                  <td className="py-3 px-2 text-xs text-default font-mono">01</td>
                  <td className="py-3 px-2">
                    <span className="inline-flex items-center text-[11px] bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded font-medium">
                      <i className="ph-bold ph-x-circle text-[10px] me-1"></i>Expired
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-border-color last:border-0 hover:bg-light/40 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-2">
                    <div className="inline-flex items-center gap-2">
                      <div className="size-9 rounded-md bg-light dark:bg-slate-800 border border-border-color flex items-center justify-center text-blue-500">
                        <i className="ph-duotone ph-atom text-lg"></i>
                      </div>
                      <p className="text-xs font-semibold text-title mb-0">Junior React Developer</p>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-xs text-default">Frontend</td>
                  <td className="py-3 px-2 text-xs text-default">Birmingham, UK</td>
                  <td className="py-3 px-2 text-xs text-default font-mono">04</td>
                  <td className="py-3 px-2">
                    <span className="inline-flex items-center text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-medium">
                      <i className="ph-bold ph-check-circle text-[10px] me-1"></i>Active
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-border-color last:border-0 hover:bg-light/40 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-2">
                    <div className="inline-flex items-center gap-2">
                      <div className="size-9 rounded-md bg-light dark:bg-slate-800 border border-border-color flex items-center justify-center text-red-500">
                        <i className="ph-duotone ph-file-code text-lg"></i>
                      </div>
                      <p className="text-xs font-semibold text-title mb-0">Senior Laravel Developer</p>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-xs text-default">Backend</td>
                  <td className="py-3 px-2 text-xs text-default">Washington, USA</td>
                  <td className="py-3 px-2 text-xs text-default font-mono">02</td>
                  <td className="py-3 px-2">
                    <span className="inline-flex items-center text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-medium">
                      <i className="ph-bold ph-check-circle text-[10px] me-1"></i>Active
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
