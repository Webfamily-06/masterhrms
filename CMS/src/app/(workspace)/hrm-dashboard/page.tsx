'use client';
import { usePermissions } from "@/lib/permissions";
import { AccessDenied } from "@/components/access-denied";
import { Loader2 } from "lucide-react";
import {  createFileRoute, Link, redirect  } from "@/src/lib/router-compat";
import { extractRolesFromToken } from "@/lib/auth-navigation";
import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";

const Chart = lazy(() => import("react-apexcharts"));



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
        const res: any = await api.get("/dashboard/hrm");
        return res?.data || res || {};
      } catch (err) {
        console.error("Failed to load dashboard metrics:", err);
        return null;
      }
    },
    refetchInterval: 30000,
  });

  const { data: profile } = useCurrentProfile();
  const userName = profile?.full_name?.split(" ")[0] || "User";
  const totalEmployees = hrmData?.totalWorkforce ?? 0;
  const newThisMonth = hrmData?.newThisMonth ?? 0;
  const pendingLeaves = hrmData?.pendingLeavesCount ?? 0;
  const onLeaveToday = hrmData?.onLeaveToday ?? 0;
  const attendanceRate = hrmData?.attendanceRate ?? 0;
  const presentCount = hrmData?.attendanceSummary?.present ?? 0;
  const lateCount = hrmData?.attendanceSummary?.late ?? 0;
  const absentCount = hrmData?.attendanceSummary?.absent ?? 0;

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
        ["Monthly Payroll", hrmData?.totalPayroll ? `$${(hrmData.totalPayroll / 1000).toFixed(0)}K` : "$0"],
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

  const deptData = useMemo(() => {
    if (!hrmData?.departments || hrmData.departments.length === 0) {
      return { labels: ["No Departments"], series: [0] };
    }
    return {
      labels: hrmData.departments.map((d: any) => d.name),
      series: hrmData.departments.map((d: any) => d.count),
    };
  }, [hrmData?.departments]);

  // 1. Employee Distribution Donut Chart
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
      series: deptData.series.some((s: number) => s > 0) ? deptData.series : [0],
      labels: deptData.labels,
      colors: ["#2563EB", "#F97316", "#10B981", "#EC4899", "#1E293B", "#8B5CF6", "#14B8A6"],
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
                formatter: () => String(totalEmployees),
              },
            },
          },
        },
      },
      dataLabels: { enabled: false },
      tooltip: { enabled: false },
    }),
    [deptData, totalEmployees]
  );

  // 2. Weekly Attendance Trend Bar Chart
  const weeklyAttendanceChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: "bar",
        height: 110,
        toolbar: { show: false },
        sparkline: { enabled: false },
      },
      series: [{ name: "Present", data: hrmData?.weeklyTrend?.series || [0, 0, 0, 0, 0, 0, 0] }],
      xaxis: {
        categories: hrmData?.weeklyTrend?.categories || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
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
      tooltip: { y: { formatter: (v) => v + " present" } },
    }),
    [hrmData?.weeklyTrend]
  );

  // 3. 6-Month Payroll Trend Area Chart
  const payrollTrendChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: "area",
        height: 80,
        toolbar: { show: false },
        sparkline: { enabled: false },
        background: "transparent",
      },
      series: [{ name: "Payroll", data: hrmData?.payrollTrend?.series || [] }],
      xaxis: {
        categories: hrmData?.payrollTrend?.categories || [],
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
    [hrmData?.payrollTrend]
  );

  // 4. Extended SmartHR Leave Type Distribution Donut
  const leaveDistributionOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "donut", height: 160 },
      series: [45, 68, 12],
      labels: ["Sick Leave", "Casual Leave", "Unpaid"],
      colors: ["#2563EB", "#0284C7", "#94A3B8"],
      legend: { show: false },
      dataLabels: { enabled: false },
      stroke: { width: 0 },
      plotOptions: {
        pie: {
          donut: {
            size: "75%",
            labels: {
              show: true,
              total: { show: true, label: "Total Leaves", fontSize: "11px", color: "#64748B", formatter: () => "125" },
            },
          },
        },
      },
    }),
    []
  );

  // 5. Extended SmartHR Attendance Trend Stacked Columns
  const attendanceTrendOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "bar", height: 210, stacked: true, toolbar: { show: false } },
      plotOptions: { bar: { columnWidth: "35%", borderRadius: 4 } },
      series: [
        { name: "Present", data: [82, 85, 80, 84, 88, 72, 68] },
        { name: "Late", data: [11, 8, 14, 9, 7, 5, 4] },
        { name: "Absent", data: [6, 4, 5, 6, 4, 3, 2] },
      ],
      xaxis: {
        categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        labels: { style: { colors: "#94A3B8", fontSize: "11px" } },
      },
      yaxis: { labels: { style: { colors: "#94A3B8", fontSize: "11px" } } },
      colors: ["#2563EB", "#F59E0B", "#F43F5E"],
      grid: { borderColor: "#E2E8F0", strokeDashArray: 3 },
      legend: { show: false },
      dataLabels: { enabled: false },
    }),
    []
  );

  // 6. Extended SmartHR Benefits & Payroll Sparklines
  const benefitsSparkline: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "area", height: 50, sparkline: { enabled: true } },
      series: [{ name: "Deductions", data: [25, 32, 28, 42, 38, 52, 56] }],
      stroke: { curve: "smooth", width: 2 },
      colors: ["#3B82F6"],
      fill: { opacity: 0.2 },
      tooltip: { fixed: { enabled: false }, x: { show: false } },
    }),
    []
  );

  const payrollSparkline: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "bar", height: 50, sparkline: { enabled: true } },
      series: [{ name: "Payroll", data: [1.2, 1.4, 1.7, 1.9, 2.1, 2.4] }],
      colors: ["#10B981"],
      plotOptions: { bar: { columnWidth: "55%", borderRadius: 2 } },
      tooltip: { fixed: { enabled: false }, x: { show: false } },
    }),
    []
  );

  // 7. Extended Top Employees Bar Chart
  const topEmployeesChart: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "bar", height: 160, toolbar: { show: false } },
      plotOptions: { bar: { horizontal: true, barHeight: "50%", borderRadius: 4 } },
      series: [{ name: "Score", data: [98, 95, 92, 89, 87] }],
      xaxis: {
        categories: ["Jessica Brown", "Amanda Lewis", "James Clark", "Amanda Davis", "Lisa Anderson"],
        labels: { style: { colors: "#94A3B8", fontSize: "10px" } },
      },
      yaxis: { labels: { style: { colors: "#64748B", fontSize: "11px", fontWeight: 500 } } },
      colors: ["#2563EB"],
      grid: { borderColor: "#E2E8F0", strokeDashArray: 3 },
      dataLabels: { enabled: false },
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
          <BreadcrumbNav />
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
            to="/hr/employees"
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
              <h3 className="text-2xl max-lg:text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">
                {hrmData?.openPositions ?? 0}
              </h3>
            </div>

            {/* Monthly Payroll */}
            <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="size-9 bg-rose-500 rounded-md flex items-center justify-center">
                  <i className="ph-duotone ph-currency-circle-dollar text-xl text-white"></i>
                </div>
                <span className="inline-flex items-center text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md">
                  <i className="ph-bold ph-arrow-up-right me-1"></i>Live
                </span>
              </div>
              <p className="text-xs text-default mb-1">Monthly Payroll</p>
              <h3 className="text-2xl max-lg:text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">
                {hrmData?.totalPayroll ? `$${(hrmData.totalPayroll / 1000).toFixed(0)}K` : "$0"}
              </h3>
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
                  {hrmData?.departments && hrmData.departments.length > 0 ? (
                    hrmData.departments.slice(0, 5).map((dept: any, idx: number) => {
                      const colors = ["bg-blue-600", "bg-amber-500", "bg-emerald-500", "bg-pink-500", "bg-purple-600"];
                      return (
                        <div key={dept.id || idx} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={cn("size-2 rounded-full", colors[idx % colors.length])}></span>
                            <span className="text-xs text-default truncate max-w-[90px]">{dept.name}</span>
                          </div>
                          <p className="text-xs font-semibold text-title mb-0">{dept.count || 0}</p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-muted-foreground py-2 text-center">No department distributions</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border-color">
                <div className="text-center bg-light dark:bg-slate-800/50 border border-border-color rounded-md p-2">
                  <h3 className="text-base font-bold text-title mb-0.5">{hrmData?.activeEmployees ?? totalEmployees}</h3>
                  <p className="text-xs text-default mb-0">Active</p>
                </div>
                <div className="text-center bg-light dark:bg-slate-800/50 border border-border-color rounded-md p-2">
                  <h3 className="text-base font-bold text-title mb-0.5">{hrmData?.probationEmployees ?? 0}</h3>
                  <p className="text-xs text-default mb-0">Probation</p>
                </div>
                <div className="text-center bg-light dark:bg-slate-800/50 border border-border-color rounded-md p-2">
                  <h3 className="text-base font-bold text-title mb-0.5">{hrmData?.noticeEmployees ?? 0}</h3>
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
              to="/hr/payroll/runs"
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
                to="/hr/attendance"
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
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">
                  {hrmData?.attendanceSummary?.remote ?? 0}
                </h4>
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
                <h3 className="font-bold text-white text-2xl mb-1">
                  {hrmData?.totalPayroll ? `$${(hrmData.totalPayroll / 1000).toFixed(0)}K` : "$0"}
                </h3>
                <p className="text-[13px] text-blue-100 mb-0">{totalEmployees} active employees</p>
              </div>
              <Link
                to="/hr/payroll/runs"
                className="btn-sm bg-white border border-border-color text-slate-900 hover:bg-slate-100 flex items-center justify-center gap-1.5 cursor-pointer font-semibold rounded-md px-3 py-1.5 shadow-xs transition-colors text-xs"
              >
                <i className="ph-duotone ph-download-simple"></i> Download Payslip
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-blue-100 text-xs mb-1">Avg Salary</p>
                <h4 className="text-2xl max-lg:text-xl text-white font-bold mb-0">
                  {hrmData?.avgSalary ? `$${hrmData.avgSalary.toLocaleString()}` : "$0"}
                </h4>
              </div>
              <div>
                <p className="text-blue-100 text-xs mb-1">Last Month</p>
                <h4 className="text-2xl max-lg:text-xl text-white font-bold mb-0">
                  {hrmData?.lastMonthPayroll ? `$${(hrmData.lastMonthPayroll / 1000).toFixed(0)}K` : "$0"}
                </h4>
              </div>
              <div>
                <p className="text-blue-100 text-xs mb-1">MOM Growth</p>
                <h4 className="text-2xl max-lg:text-xl text-white font-bold mb-0">
                  {hrmData?.momGrowth ?? 0}%
                </h4>
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
              to="/hr/recruitment/job-postings"
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
                    <h3 className="text-lg font-bold text-title mb-0">
                      {hrmData?.recruitment?.newApplicants ?? 0}
                    </h3>
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
                    <h3 className="text-lg font-bold text-title mb-0">
                      {hrmData?.recruitment?.screening ?? 0}
                    </h3>
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
                    <h3 className="text-lg font-bold text-title mb-0">
                      {hrmData?.recruitment?.interviews ?? 0}
                    </h3>
                    <p className="text-xs text-default mb-0">Interviews</p>
                  </div>
                </div>
                <div className="h-1 bg-blue-500 rounded-full"></div>
              </div>
            </div>

            <p className="text-sm font-semibold text-title mb-2">Recent Candidates</p>
            <div className="flex flex-col space-y-2">
              {hrmData?.recruitment?.recentCandidates && hrmData.recruitment.recentCandidates.length > 0 ? (
                hrmData.recruitment.recentCandidates.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 border border-border-color bg-light dark:bg-slate-800/40 rounded-md p-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={c.avatarUrl || "/ui-assets/avatar-03.jpg"} className="size-9 rounded-full border border-border-color shrink-0 object-cover" alt={c.name} />
                      <div className="min-w-0">
                        <p className="font-medium text-title text-xs truncate mb-0">{c.name}</p>
                        <p className="text-[11px] text-default truncate mb-0">{c.position}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md shrink-0 capitalize">
                      {c.stage}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground py-6 text-center">
                  No recent applicants in pipeline
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Performance Tracking & Recent Openings Table ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Performance Tracking (5 cols) */}
        <div className="bg-white dark:bg-slate-900 p-4 border border-border-color rounded-md xl:col-span-5">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Performance Tracking</h3>
            <Link
              to="/hr/performance/reviews"
              className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-title hover:bg-primary hover:border-primary hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-colors text-xs px-2.5 py-1 rounded"
            >
              Full Report <i className="ph-bold ph-caret-right text-[10px]"></i>
            </Link>
          </div>
          <div>
            <div className="space-y-3 mb-5">
              {hrmData?.leaderboard && hrmData.leaderboard.length > 0 ? (
                hrmData.leaderboard.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 border border-border-color rounded-md p-3 bg-light/50 dark:bg-slate-800/30">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <img src={item.avatarUrl || "/ui-assets/avatar-04.jpg"} className="size-9 rounded-full border border-border-color shrink-0 object-cover" alt={item.name} />
                        <span className="absolute bottom-0 right-0 bg-amber-500 text-white text-[10px] font-bold rounded-full size-4 flex items-center justify-center">
                          {item.rank}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-title text-xs truncate mb-0">{item.name}</p>
                        <p className="text-[11px] text-default truncate mb-0">{item.position}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900 dark:text-gray-100 text-xs mb-0">{item.score}</p>
                      <p className="text-[11px] text-emerald-600 inline-flex items-center mb-0">
                        <i className="ph-bold ph-arrow-up-right me-0.5"></i>{item.growth}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground py-6 text-center">
                  No employee performance scores tracked yet
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <div className="h-1.5 bg-light dark:bg-slate-800 rounded-full overflow-hidden mb-1.5">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, attendanceRate)}%` }}></div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <p className="text-default mb-0">Attendance Compliance</p>
                  <p className="font-bold text-gray-900 dark:text-gray-100 mb-0">{attendanceRate}%</p>
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
              to="/hr/recruitment/job-postings"
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
                {hrmData?.jobOpenings && hrmData.jobOpenings.length > 0 ? (
                  hrmData.jobOpenings.map((job: any) => (
                    <tr key={job.id} className="border-b border-border-color last:border-0 hover:bg-light/40 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-2">
                        <div className="inline-flex items-center gap-2">
                          <div className="size-9 rounded-md bg-light dark:bg-slate-800 border border-border-color flex items-center justify-center text-primary">
                            <i className="ph-duotone ph-briefcase text-lg"></i>
                          </div>
                          <p className="text-xs font-semibold text-title mb-0">{job.title}</p>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-xs text-default">{job.category}</td>
                      <td className="py-3 px-2 text-xs text-default">{job.location || "Office"}</td>
                      <td className="py-3 px-2 text-xs text-default font-mono">{String(job.openings).padStart(2, "0")}</td>
                      <td className="py-3 px-2">
                        <span className="inline-flex items-center text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-medium">
                          <i className="ph-bold ph-check-circle text-[10px] me-1"></i>{job.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                      No active job openings published.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── Extended SmartHR Workforce Operations & Advanced HR Analytics ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="pt-4 border-t border-border/60 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Advanced Workforce Analytics & Operations</h2>
            <p className="text-xs text-muted-foreground">Comprehensive overview of attendance trends, training, recruitment pipelines, and approval workflows.</p>
          </div>
          <span className="text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-md flex items-center gap-1.5">
            <i className="ph-bold ph-chart-polar text-sm"></i> Extended HR Intelligence
          </span>
        </div>

        {/* ── Row 1: 4 Key Metric Cards from SmartHR ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg">
                <i className="ph ph-users-three"></i>
              </div>
              <p className="text-xs font-semibold text-muted-foreground">Total Employees</p>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-2xl font-bold text-foreground">1,848</h3>
                <p className="text-[11px] text-muted-foreground">Headcount Overview</p>
              </div>
              <span className="inline-flex items-center text-xs font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                +18% <i className="ph-bold ph-arrow-up-right ms-0.5"></i>
              </span>
            </div>
          </div>

          <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-10 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-lg">
                <i className="ph ph-user-plus"></i>
              </div>
              <p className="text-xs font-semibold text-muted-foreground">New Joinees</p>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-2xl font-bold text-foreground">1,248</h3>
                <p className="text-[11px] text-muted-foreground">All Departments</p>
              </div>
              <span className="inline-flex items-center text-xs font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                +22% <i className="ph-bold ph-arrow-up-right ms-0.5"></i>
              </span>
            </div>
          </div>

          <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center text-lg">
                <i className="ph ph-clock-countdown"></i>
              </div>
              <p className="text-xs font-semibold text-muted-foreground">Late Arrivals Today</p>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-2xl font-bold text-foreground">12</h3>
                <p className="text-[11px] text-muted-foreground">Delayed Logins</p>
              </div>
              <span className="inline-flex items-center text-xs font-semibold text-rose-600 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                -16% <i className="ph-bold ph-arrow-down-right ms-0.5"></i>
              </span>
            </div>
          </div>

          <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-10 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center text-lg">
                <i className="ph ph-currency-dollar"></i>
              </div>
              <p className="text-xs font-semibold text-muted-foreground">Total Payroll Cost</p>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-2xl font-bold text-foreground">$2.4M</h3>
                <p className="text-[11px] text-muted-foreground">Payroll Outflow</p>
              </div>
              <span className="inline-flex items-center text-xs font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                +16% <i className="ph-bold ph-arrow-up-right ms-0.5"></i>
              </span>
            </div>
          </div>
        </div>

        {/* ── Row 2: Attendance Trend (8 Cols) & Leave Type Distribution (4 Cols) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="bg-card border border-border/80 rounded-xl p-4 lg:col-span-8 shadow-xs">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="border-l-2 border-primary pl-2.5">
                <h3 className="text-sm font-bold text-foreground">Attendance Trend & Compliance</h3>
                <p className="text-xs text-muted-foreground">Weekly attendance breakdown by punctuality</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-blue-600"></span> Present (82)</span>
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-500"></span> Late (11)</span>
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-rose-500"></span> Absent (6)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-9">
                {isMounted && (
                  <Suspense fallback={<div className="h-48 flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
                    <Chart options={attendanceTrendOptions} series={attendanceTrendOptions.series} type="bar" height={210} />
                  </Suspense>
                )}
              </div>
              <div className="md:col-span-3 space-y-2.5">
                <div className="p-2.5 bg-muted/40 rounded-lg text-center border border-border/50">
                  <p className="text-[11px] text-muted-foreground">Max Working Hours</p>
                  <h4 className="text-base font-bold text-foreground">8.4 hrs</h4>
                </div>
                <div className="p-2.5 bg-muted/40 rounded-lg text-center border border-border/50">
                  <p className="text-[11px] text-muted-foreground">Missed Punches</p>
                  <h4 className="text-base font-bold text-foreground">12</h4>
                </div>
                <div className="p-2.5 bg-muted/40 rounded-lg text-center border border-border/50">
                  <p className="text-[11px] text-muted-foreground">Weekly Average</p>
                  <h4 className="text-base font-bold text-foreground">97.2%</h4>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/80 rounded-xl p-4 lg:col-span-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="border-l-2 border-primary pl-2.5 mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Leave Distribution</h3>
                  <p className="text-xs text-muted-foreground">Category breakdown this month</p>
                </div>
              </div>
              <div className="flex items-center justify-center py-2">
                {isMounted && (
                  <Suspense fallback={<div className="h-36 flex items-center justify-center text-xs text-muted-foreground">Loading...</div>}>
                    <Chart options={leaveDistributionOptions} series={leaveDistributionOptions.series} type="donut" height={160} />
                  </Suspense>
                )}
              </div>
            </div>
            <div className="space-y-2 pt-2 border-t border-border/50 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="size-2 rounded-full bg-blue-600"></span> Sick Leave
                </span>
                <span className="font-semibold px-2 py-0.5 bg-muted rounded-full">45</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="size-2 rounded-full bg-sky-500"></span> Casual Leave
                </span>
                <span className="font-semibold px-2 py-0.5 bg-muted rounded-full">68</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="size-2 rounded-full bg-slate-400"></span> Unpaid Leave
                </span>
                <span className="font-semibold px-2 py-0.5 bg-muted rounded-full">12</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 3: Late Arrivals Today (4 Cols), Recruitment Conversion (4 Cols), Training & Interviews (4 Cols) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Late Arrivals Today */}
          <div className="bg-card border border-border/80 rounded-xl p-4 lg:col-span-4 shadow-xs">
            <div className="border-l-2 border-primary pl-2.5 mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Late Arrivals Today</h3>
                <p className="text-xs text-muted-foreground">Real-time attendance anomalies</p>
              </div>
              <span className="text-[10px] font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20 px-2 py-0.5 rounded-full">5 Flags</span>
            </div>
            <div className="space-y-2.5">
              {[
                { name: "Jessica Brown", dept: "Customer Support", time: "10:15 AM", delay: "+45 Min", avatar: "/ui-assets/avatar-02.jpg" },
                { name: "Amanda Lewis", dept: "HR Admin", time: "10:25 AM", delay: "+55 Min", avatar: "/ui-assets/avatar-03.jpg" },
                { name: "James Clark", dept: "Sales", time: "10:00 AM", delay: "+30 Min", avatar: "/ui-assets/avatar-04.jpg" },
                { name: "Amanda Davis", dept: "Administration", time: "09:40 AM", delay: "+20 Min", avatar: "/ui-assets/avatar-05.jpg" },
                { name: "Lisa Anderson", dept: "Finance", time: "09:35 AM", delay: "+05 Min", avatar: "/ui-assets/avatar-06.jpg" },
              ].map((item, idx) => (
                <div key={idx} className="p-2.5 bg-muted/40 rounded-lg border border-border/40 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img src={item.avatar} alt={item.name} className="size-8 rounded-full object-cover border border-border shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{item.dept}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-mono font-medium text-foreground">{item.time}</p>
                    <span className="text-[10px] font-semibold text-rose-600 bg-rose-500/10 px-1.5 py-0.5 rounded">{item.delay}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recruitment Statistics */}
          <div className="bg-card border border-border/80 rounded-xl p-4 lg:col-span-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="border-l-2 border-primary pl-2.5 mb-3">
                <h3 className="text-sm font-bold text-foreground">Recruitment Statistics</h3>
                <p className="text-xs text-muted-foreground">Pipeline efficiency & funnel velocity</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center py-2 bg-muted/40 rounded-lg border border-border/50 mb-4">
                <div>
                  <p className="text-[11px] text-muted-foreground">Applicants</p>
                  <h4 className="text-lg font-bold text-foreground">487</h4>
                </div>
                <div className="border-x border-border/50">
                  <p className="text-[11px] text-muted-foreground">Hired</p>
                  <h4 className="text-lg font-bold text-emerald-600">24</h4>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Avg Time</p>
                  <h4 className="text-lg font-bold text-foreground">28 days</h4>
                </div>
              </div>

              {/* Progress Stack */}
              <div className="h-2 rounded-full overflow-hidden flex bg-muted mb-4">
                <div className="h-full bg-primary" style={{ width: "40%" }} title="Applications"></div>
                <div className="h-full bg-sky-500" style={{ width: "20%" }} title="Screening"></div>
                <div className="h-full bg-pink-500" style={{ width: "23%" }} title="Interview"></div>
                <div className="h-full bg-emerald-500" style={{ width: "17%" }} title="Hired"></div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 border border-border/50 rounded-lg">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-primary"></span> Applications
                  </p>
                  <p className="text-muted-foreground text-[11px]">40% - 57 Candidates</p>
                </div>
                <div className="p-2 border border-border/50 rounded-lg">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-sky-500"></span> Screening
                  </p>
                  <p className="text-muted-foreground text-[11px]">20% - 36 Candidates</p>
                </div>
                <div className="p-2 border border-border/50 rounded-lg">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-pink-500"></span> Interview
                  </p>
                  <p className="text-muted-foreground text-[11px]">23% - 64 Candidates</p>
                </div>
                <div className="p-2 border border-border/50 rounded-lg">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-500"></span> Hired
                  </p>
                  <p className="text-muted-foreground text-[11px]">17% - 18 Employees</p>
                </div>
              </div>
            </div>

            {/* Employees in Training Widget */}
            <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div>
                <p className="text-xs text-indigo-200">Employees in Training</p>
                <h4 className="text-xl font-bold">80 Trainees</h4>
              </div>
              <div className="flex -space-x-2">
                {["/ui-assets/avatar-01.jpg", "/ui-assets/avatar-02.jpg", "/ui-assets/avatar-03.jpg"].map((src, i) => (
                  <img key={i} src={src} className="size-8 rounded-full border-2 border-slate-900 object-cover" alt="trainee" />
                ))}
              </div>
            </div>
          </div>

          {/* Upcoming Interviews & Quick Actions */}
          <div className="bg-card border border-border/80 rounded-xl p-4 lg:col-span-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="border-l-2 border-primary pl-2.5 mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Upcoming Interviews</h3>
                  <p className="text-xs text-muted-foreground">Scheduled talent assessments</p>
                </div>
                <Link to="/hr/recruitment/interviews" className="text-xs text-primary font-medium hover:underline">
                  View All
                </Link>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-foreground">UI/UX Design Interview</p>
                      <p className="text-[11px] text-muted-foreground font-mono">12:00 PM - 01:50 PM</p>
                    </div>
                    <div className="flex -space-x-1.5">
                      {["/ui-assets/avatar-04.jpg", "/ui-assets/avatar-05.jpg"].map((src, i) => (
                        <img key={i} src={src} className="size-6 rounded-full border border-card object-cover" alt="interviewer" />
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button type="button" onClick={() => toast.info("Meeting added to calendar")} className="btn-sm text-[11px] py-1 border border-border/80 bg-card hover:bg-muted rounded text-foreground font-medium flex items-center justify-center gap-1">
                      <i className="ph ph-calendar-plus"></i> Calendar
                    </button>
                    <button type="button" onClick={() => toast.success("Launching virtual meeting room...")} className="btn-sm text-[11px] py-1 bg-primary text-white hover:bg-primary/90 rounded font-medium flex items-center justify-center gap-1">
                      <i className="ph ph-video-camera"></i> Join Now
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border/80 bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-foreground">Senior React Developer</p>
                      <p className="text-[11px] text-muted-foreground font-mono">03:00 PM - 04:00 PM</p>
                    </div>
                    <div className="flex -space-x-1.5">
                      {["/ui-assets/avatar-06.jpg", "/ui-assets/avatar-01.jpg"].map((src, i) => (
                        <img key={i} src={src} className="size-6 rounded-full border border-card object-cover" alt="interviewer" />
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button type="button" onClick={() => toast.info("Meeting added to calendar")} className="btn-sm text-[11px] py-1 border border-border/80 bg-card hover:bg-muted rounded text-foreground font-medium flex items-center justify-center gap-1">
                      <i className="ph ph-calendar-plus"></i> Calendar
                    </button>
                    <button type="button" onClick={() => toast.success("Launching virtual meeting room...")} className="btn-sm text-[11px] py-1 bg-primary text-white hover:bg-primary/90 rounded font-medium flex items-center justify-center gap-1">
                      <i className="ph ph-video-camera"></i> Join Now
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border/50">
              <Link to="/hr/recruitment/candidates" className="w-full py-1.5 text-xs text-center border border-border/80 hover:bg-muted rounded-md text-foreground font-medium block">
                Manage All Candidates <i className="ph ph-arrow-right text-xs ms-1"></i>
              </Link>
            </div>
          </div>
        </div>

        {/* ── Row 4: Financial Deductions & Payroll Trends (7 Cols) & Pending Approvals (5 Cols) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Benefits Deductions</p>
                    <h3 className="text-2xl font-bold text-foreground">$56K</h3>
                    <p className="text-[11px] text-muted-foreground">Insurance + 401(k)</p>
                  </div>
                  <div className="w-24">
                    {isMounted && (
                      <Suspense fallback={<div className="h-12"></div>}>
                        <Chart options={benefitsSparkline} series={benefitsSparkline.series} type="area" height={50} />
                      </Suspense>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Payroll Outflow</p>
                    <h3 className="text-2xl font-bold text-foreground">$2.4M</h3>
                    <p className="text-[11px] text-emerald-600 font-semibold inline-flex items-center">
                      <i className="ph-bold ph-trend-up me-1"></i> +55% Increased
                    </p>
                  </div>
                  <div className="w-24">
                    {isMounted && (
                      <Suspense fallback={<div className="h-12"></div>}>
                        <Chart options={payrollSparkline} series={payrollSparkline.series} type="bar" height={50} />
                      </Suspense>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Top Employees Performance Bar Chart */}
            <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="border-l-2 border-primary pl-2.5">
                  <h3 className="text-sm font-bold text-foreground">Top Employee Performance Rankings</h3>
                  <p className="text-xs text-muted-foreground">Evaluation metrics for key contributors</p>
                </div>
                <span className="text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded">Q4 Evaluated</span>
              </div>
              {isMounted && (
                <Suspense fallback={<div className="h-36 flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
                  <Chart options={topEmployeesChart} series={topEmployeesChart.series} type="bar" height={160} />
                </Suspense>
              )}
            </div>
          </div>

          {/* Pending Approvals List */}
          <div className="bg-card border border-border/80 rounded-xl p-4 lg:col-span-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="border-l-2 border-primary pl-2.5 mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Pending Approvals</h3>
                  <p className="text-xs text-muted-foreground">Leaves & requests awaiting manager review</p>
                </div>
                <Link to="/hr/leaves" className="text-xs text-primary font-medium hover:underline">
                  View All
                </Link>
              </div>

              <div className="space-y-3">
                {[
                  { name: "Hendrita Merkel", dates: "Jan 10 - Jan 16", duration: "4 days", reason: "Family trip", avatar: "/ui-assets/avatar-03.jpg" },
                  { name: "Michael Brown", dates: "Jan 03 - Jan 09", duration: "2 days", reason: "Medical appointment", avatar: "/ui-assets/avatar-04.jpg" },
                  { name: "Daniel Martinez", dates: "Jan 17 - Jan 23", duration: "2 days", reason: "Personal work", avatar: "/ui-assets/avatar-05.jpg" },
                ].map((item, idx) => (
                  <div key={idx} className="p-3 bg-muted/40 rounded-lg border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <img src={item.avatar} alt={item.name} className="size-7 rounded-full object-cover border border-border" />
                        <p className="text-xs font-bold text-foreground">{item.name}</p>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><i className="ph ph-calendar"></i> {item.dates}</span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1"><i className="ph ph-clock"></i> {item.duration}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Reason: <span className="text-foreground">{item.reason}</span></p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => toast.success(`Approved request for ${item.name}`)}
                        className="btn-sm text-[11px] py-1 px-2.5 bg-primary text-white hover:bg-primary/90 rounded font-medium transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => toast.error(`Declined request for ${item.name}`)}
                        className="btn-sm text-[11px] py-1 px-2.5 border border-border/80 bg-card hover:bg-muted text-foreground rounded font-medium transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-border/50 text-center">
              <p className="text-xs text-muted-foreground">Showing 3 of {pendingLeaves || 8} requests pending your authorization</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
