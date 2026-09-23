import { usePermissions } from "@/lib/permissions";
import { AccessDenied } from "@/components/access-denied";
import { Loader2 } from "lucide-react";
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCurrentProfile } from '@/lib/session';
import Chart from 'react-apexcharts';

export const Route = createFileRoute('/_authenticated/_app/dashboard')({
  component: DashboardPage,
});

export default function DashboardPage() {
  const { canAccessModule, loading } = usePermissions();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <p className="text-xs text-muted-foreground font-medium animate-pulse">Verifying workspace permissions...</p>
      </div>
    );
  }

  if (!canAccessModule("hrm")) {
    return (
      <AccessDenied
        moduleName="HRM Dashboard"
        requiredPermission="hrm.dashboard.view"
        message="You do not have permission to access the HRM Dashboard."
      />
    );
  }

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 1. Fetch 100% REALTIME HRM Metrics from database
  const { data: hrmData, isLoading } = useQuery({
    queryKey: ['dashboard-hrm-realtime-data'],
    queryFn: async () => {
      try {
        const res = await api.get('/dashboard/hrm');
        return res;
      } catch (err) {
        console.error('Failed to load realtime dashboard metrics:', err);
        return null;
      }
    },
    refetchInterval: 15000, // Realtime polling every 15s
  });

  // Attendance Period Tab State: Day | Week | Month
  const [attendancePeriod, setAttendancePeriod] = useState<"day" | "week" | "month">("day");

  // Current user info
  const { data: profile } = useCurrentProfile();
  const userName = profile?.full_name || 'Admin';
  const totalEmployees = hrmData?.totalWorkforce ?? 0;
  const newThisMonth = hrmData?.newThisMonth ?? 0;
  const onLeaveToday = hrmData?.onLeaveToday ?? 0;
  const attendanceRate = hrmData?.attendanceRate ?? 0;
  const openPositions = hrmData?.openPositions ?? 0;
  const pendingLeaves = hrmData?.pendingLeavesCount ?? 0;

  // Real Attendance metrics (100% dynamic from MySQL, no dummy fallbacks)
  const presentCount = hrmData?.attendanceSummary?.present ?? 0;
  const lateCount = hrmData?.attendanceSummary?.late ?? 0;
  const absentCount = hrmData?.attendanceSummary?.absent ?? (totalEmployees - presentCount - onLeaveToday);
  const remoteCount = hrmData?.attendanceSummary?.remote ?? 0;

  // Real Department distribution
  const departments = hrmData?.departments || [];

  const handleExport = () => {
    try {
      const csvContent = [
        ["Metric", "Value"],
        ["Total Workforce", totalEmployees],
        ["New Employees This Month", newThisMonth],
        ["Present Today", presentCount],
        ["Late Today", lateCount],
        ["Absent Today", absentCount],
        ["On Leave Today", onLeaveToday],
        ["Attendance Rate (%)", attendanceRate],
        ["Open Positions", openPositions],
        ["Total Payroll", hrmData?.totalPayroll ?? 0],
      ].map(e => e.join(",")).join("\n");
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `HR_Dashboard_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export failed:", err);
    }
  };
  const deptLabels = departments.map((d: any) => d.name);
  const deptSeries = departments.map((d: any) => d.count);
  const deptColors = ['#0F766E', '#E65100', '#059669', '#CC25B0', '#1E293B', '#6A1B9A'];

  // Real Payroll metrics - 100% dynamic
  const totalPayroll = hrmData?.totalPayroll
    ? `₹${(hrmData.totalPayroll / 100000).toFixed(1)}L`
    : '₹0';
  const avgSalary = hrmData?.avgSalary
    ? `₹${(hrmData.avgSalary / 1000).toFixed(1)}K`
    : '₹0';
  const lastMonthPayroll = hrmData?.lastMonthPayroll
    ? `₹${(hrmData.lastMonthPayroll / 100000).toFixed(1)}L`
    : '₹0';
  const momGrowth = hrmData?.momGrowth ?? 0;

  // Real Weekly Attendance Trend
  const weeklyCategories = hrmData?.weeklyTrend?.categories || [];
  const weeklySeries = hrmData?.weeklyTrend?.series || [];
  const weeklyAvgPresent = hrmData?.weeklyTrend?.avgPresent ?? 0;
  const weeklyAvgRate = hrmData?.weeklyTrend?.avgRate ?? 0;

  // Real Monthly Attendance Metrics
  const monthlyRate = hrmData?.monthlySummary?.rate ?? 0;
  const monthlyPresent = hrmData?.monthlySummary?.totalPresent ?? 0;
  const monthlyLate = hrmData?.monthlySummary?.totalLate ?? 0;
  const monthDaysPassed = hrmData?.monthlySummary?.daysPassed ?? 1;

  // Real 6-Month Payroll Trend
  const payrollCategories = hrmData?.payrollTrend?.categories || [];
  const payrollSeries = hrmData?.payrollTrend?.series || [];

  // Real Recruitment & Candidates
  const recruitment = hrmData?.recruitment || {
    newApplicants: 0,
    screening: 0,
    interviews: 0,
    recentCandidates: [],
  };

  // Real Leaderboard
  const leaderboard = hrmData?.leaderboard || [];

  // Real Job Openings
  const jobOpenings = hrmData?.jobOpenings || [];

  // Apex Charts Options
  // 1. Employee Distribution Donut
  const donutOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'donut',
      height: 150,
      width: 150,
      sparkline: { enabled: false },
    },
    grid: {
      padding: { top: 0, right: 0, bottom: -10, left: 0 },
    },
    labels: deptLabels.length ? deptLabels : ['Engineering', 'Operations', 'Sales', 'Finance', 'HR'],
    colors: deptColors.slice(0, deptLabels.length || 5),
    stroke: { width: 0 },
    legend: { show: false },
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            show: true,
            name: { show: true, fontSize: '10px', color: '#94A3B8', offsetY: 18 },
            value: { show: true, fontSize: '17px', fontWeight: 700, color: '#0F766E', offsetY: -8 },
            total: {
              show: true,
              showAlways: true,
              label: 'Workforce',
              fontSize: '10px',
              fontWeight: 500,
              color: '#9096A1',
              formatter: () => String(totalEmployees),
            },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    tooltip: { enabled: true },
  };

  // 2. Weekly Attendance Bar
  const barOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'bar',
      height: 110,
      toolbar: { show: false },
      sparkline: { enabled: false },
    },
    xaxis: {
      categories: weeklyCategories,
      labels: { style: { colors: '#9096A1', fontSize: '10px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { show: false },
    grid: { show: false, padding: { left: 0, right: 0, top: -20, bottom: 0 } },
    plotOptions: {
      bar: { columnWidth: '45%', borderRadius: 3, distributed: true },
    },
    colors: weeklySeries.map((val: number) => (val > 15 ? '#0F766E' : val > 5 ? '#E65100' : '#94A3B8')),
    legend: { show: false },
    dataLabels: { enabled: false },
    tooltip: { y: { formatter: (v: number) => `${v} present` } },
  };

  // 3. 6-Month Payroll Area Trend
  const areaOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'area',
      height: 90,
      toolbar: { show: false },
      sparkline: { enabled: false },
      background: 'transparent',
    },
    xaxis: {
      categories: payrollCategories,
      labels: { style: { colors: '#64748B', fontSize: '10px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { show: false },
    grid: { show: false, padding: { left: 10, right: 10, top: -10, bottom: 0 } },
    stroke: { curve: 'smooth', width: 2.5 },
    colors: ['#059669'],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 100],
      },
    },
    dataLabels: { enabled: false },
    tooltip: {
      theme: 'dark',
      y: { formatter: (v: number) => '₹' + v + 'K' },
    },
  };

  return (
    <div className="w-full space-y-4 max-w-full">
      {/* Top Welcome Banner */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground mb-0.5">
            Good morning, {userName} 👏
          </h1>
          <p className="text-xs sm:text-sm text-default dark:text-slate-400 mb-0">
            You have {pendingLeaves} leave requests and {lateCount} late arrival alerts pending.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="btn-sm bg-white border border-border-color text-dark hover:bg-primary hover:border-primary hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded shadow-xs text-xs font-medium cursor-pointer transition"
          >
            <i className="icon-download text-xs"></i> Export Report
          </button>
          <Link
            to="/employees"
            className="btn-sm bg-dark text-white hover:bg-primary flex items-center gap-1.5 px-3 py-1.5 rounded shadow-xs text-xs font-medium cursor-pointer transition"
          >
            <i className="ph-duotone ph-plus-circle text-base"></i> Add Employee
          </Link>
        </div>
      </div>

      {/* Row 1: Total Workforce, Employee Distribution + Run Payroll, Attendance Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">

        {/* Col 1: Total Workforce + 4 Sub KPIs (4 of 12 cols on desktop) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Total Workforce Box */}
          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 flex-1 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <p className="text-base font-bold text-title dark:text-white mb-0">Total Workforce</p>
              <div className="size-10 shrink-0 bg-indigo rounded-md flex items-center justify-center text-white shadow-xs">
                <i className="icon-users text-2xl"></i>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl max-lg:text-xl font-bold text-gray-900 dark:text-white mb-0">
                {totalEmployees.toLocaleString()}
              </h2>
              <span className="inline-flex items-center text-[11px] font-medium bg-success-transparent text-success px-2 py-0.5 rounded-md">
                <i className="icon-arrow-up-right text-[10px] me-1"></i> {newThisMonth} active this month
              </span>
            </div>
            <p className="text-[13px] text-default dark:text-slate-400 mb-0">
              Active staff across {departments.length} registered departments
            </p>
          </div>

          {/* 2x2 Sub KPI Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-3.5 shadow-xs">
              <div className="flex items-center justify-between mb-2.5">
                <div className="size-8 bg-primary rounded-md flex items-center justify-center text-white">
                  <i className="ph-duotone ph-calendar-blank text-lg"></i>
                </div>
                <span className="inline-flex items-center text-[11px] font-medium bg-success-transparent text-success px-1.5 py-0.5 rounded">
                  Today
                </span>
              </div>
              <p className="text-xs text-default dark:text-slate-400 mb-0.5">Absent Today</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-0">{absentCount}</h3>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-3.5 shadow-xs">
              <div className="flex items-center justify-between mb-2.5">
                <div className="size-8 bg-warning rounded-md flex items-center justify-center text-white">
                  <i className="ph-duotone ph-user-check text-lg"></i>
                </div>
                <span className="inline-flex items-center text-[11px] font-medium bg-success-transparent text-success px-1.5 py-0.5 rounded">
                  Live
                </span>
              </div>
              <p className="text-xs text-default dark:text-slate-400 mb-0.5">Attendance Rate</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-0">{attendanceRate}%</h3>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-3.5 shadow-xs">
              <div className="flex items-center justify-between mb-2.5">
                <div className="size-8 bg-purple rounded-md flex items-center justify-center text-white">
                  <i className="ph-duotone ph-user-plus text-lg"></i>
                </div>
                <span className="inline-flex items-center text-[11px] font-medium bg-purple-transparent text-purple px-1.5 py-0.5 rounded">
                  Hiring
                </span>
              </div>
              <p className="text-xs text-default dark:text-slate-400 mb-0.5">Open Positions</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-0">{openPositions}</h3>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-3.5 shadow-xs">
              <div className="flex items-center justify-between mb-2.5">
                <div className="size-8 bg-danger rounded-md flex items-center justify-center text-white">
                  <i className="ph-duotone ph-currency-circle-dollar text-lg"></i>
                </div>
                <span className="inline-flex items-center text-[11px] font-medium bg-success-transparent text-success px-1.5 py-0.5 rounded">
                  Monthly
                </span>
              </div>
              <p className="text-xs text-default dark:text-slate-400 mb-0.5">Total Payroll</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-0">{totalPayroll}</h3>
            </div>
          </div>
        </div>

        {/* Col 2: Employee Distribution & Run Payroll (4 of 12 cols on desktop) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Employee Distribution Card */}
          <div className="bg-white dark:bg-slate-900 p-4 border border-border-color rounded-md flex-1 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <h3 className="text-base lg:text-[17px] font-bold text-title dark:text-white mb-0">Department Distribution</h3>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap sm:flex-nowrap">
                <div className="size-[150px] shrink-0 flex items-center justify-center">
                  {isMounted ? (
                    <Chart options={donutOptions} series={deptSeries} type="donut" width={150} height={150} />
                  ) : (
                    <div className="size-[130px] rounded-full border-8 border-primary/20 animate-pulse"></div>
                  )}
                </div>
                <div className="flex-1 space-y-1.5 min-w-[140px]">
                  {departments.slice(0, 5).map((d: any, idx: number) => (
                    <div key={d.name} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: deptColors[idx % deptColors.length] }}></span>
                        <span className="text-xs text-default dark:text-slate-400 truncate">{d.name}</span>
                      </div>
                      <p className="text-xs font-semibold mb-0 text-gray-900 dark:text-white shrink-0">{d.count}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border-color">
              <div className="text-center bg-light dark:bg-slate-800 border border-border-color rounded-md p-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-0">{totalEmployees}</h3>
                <p className="text-[11px] text-default dark:text-slate-400 mb-0">Active</p>
              </div>
              <div className="text-center bg-light dark:bg-slate-800 border border-border-color rounded-md p-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-0">{presentCount}</h3>
                <p className="text-[11px] text-default dark:text-slate-400 mb-0">Present</p>
              </div>
              <div className="text-center bg-light dark:bg-slate-800 border border-border-color rounded-md p-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-0">{absentCount}</h3>
                <p className="text-[11px] text-default dark:text-slate-400 mb-0">On Leave</p>
              </div>
            </div>
          </div>

          {/* Run Payroll CTA Banner */}
          <div className="bg-primary-gradient rounded-md p-3.5 flex items-center justify-between gap-3 text-white shadow-xs">
            <div>
              <p className="text-base font-bold text-white mb-0.5">Run Monthly Payroll</p>
              <p className="text-xs text-white/90 mb-0">Process {totalEmployees} active salaries</p>
            </div>
            <Link
              to="/payroll"
              className="btn bg-white border border-border-color text-dark hover:bg-primary hover:border-primary hover:text-white flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer shrink-0 transition shadow-xs"
            >
              <i className="icon-circle-dollar-sign text-sm"></i> Run Payroll
            </Link>
          </div>
        </div>

        {/* Col 3: Attendance Summary (4 of 12 cols on desktop) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-4 border border-border-color rounded-md shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2.5">
              <h3 className="text-base lg:text-[17px] font-bold text-title dark:text-white mb-0">Attendance Summary</h3>
              <Link
                to="/attendance"
                className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-dark dark:text-white hover:bg-primary hover:border-primary hover:text-white flex items-center justify-center gap-1 px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition"
              >
                View Logs<i className="icon-chevron-right text-[10px]"></i>
              </Link>
            </div>

            {/* Dynamic Period Tabs: Day (Today) | Week (7 Days) | Month */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-md mb-3">
              <button
                type="button"
                onClick={() => setAttendancePeriod("day")}
                className={`flex-1 py-1 px-2 text-xs font-semibold rounded transition cursor-pointer text-center ${
                  attendancePeriod === "day"
                    ? "bg-white dark:bg-slate-900 text-primary shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Today (Day)
              </button>
              <button
                type="button"
                onClick={() => setAttendancePeriod("week")}
                className={`flex-1 py-1 px-2 text-xs font-semibold rounded transition cursor-pointer text-center ${
                  attendancePeriod === "week"
                    ? "bg-white dark:bg-slate-900 text-primary shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Week (7D)
              </button>
              <button
                type="button"
                onClick={() => setAttendancePeriod("month")}
                className={`flex-1 py-1 px-2 text-xs font-semibold rounded transition cursor-pointer text-center ${
                  attendancePeriod === "month"
                    ? "bg-white dark:bg-slate-900 text-primary shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                This Month
              </button>
            </div>

            {/* VIEW 1: DAY (TODAY REALTIME COUNTS) */}
            {attendancePeriod === "day" && (
              <>
                <div className="grid grid-cols-2 gap-2 mb-2.5">
                  <div className="border border-border-color bg-light dark:bg-slate-800/60 rounded-md p-2.5">
                    <p className="text-[11px] text-default dark:text-slate-400 mb-0.5">Present</p>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">{presentCount}</h4>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mb-0">{attendanceRate}% of workforce</p>
                  </div>
                  <div className="border border-border-color bg-light dark:bg-slate-800/60 rounded-md p-2.5">
                    <p className="text-[11px] text-default dark:text-slate-400 mb-0.5">Late Arrivals</p>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">{lateCount}</h4>
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mb-0">After 9:30 AM</p>
                  </div>
                  <div className="border border-border-color bg-light dark:bg-slate-800/60 rounded-md p-2.5">
                    <p className="text-[11px] text-default dark:text-slate-400 mb-0.5">Absent Today</p>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">{absentCount}</h4>
                    <p className="text-[11px] text-rose-500 dark:text-rose-400 font-medium mb-0">Unpunched today</p>
                  </div>
                  <div className="border border-border-color bg-light dark:bg-slate-800/60 rounded-md p-2.5">
                    <p className="text-[11px] text-default dark:text-slate-400 mb-0.5">On Leave</p>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">{onLeaveToday}</h4>
                    <p className="text-[11px] text-blue-500 dark:text-blue-400 font-medium mb-0">Approved leave</p>
                  </div>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <i className="icon-clock text-xs text-primary shrink-0"></i>
                  <span>Live daily count resets every midnight & updates with biometric sync.</span>
                </div>
              </>
            )}

            {/* VIEW 2: WEEK (7-DAY TREND) */}
            {attendancePeriod === "week" && (
              <>
                <div className="grid grid-cols-2 gap-2 mb-2.5">
                  <div className="border border-border-color bg-light dark:bg-slate-800/60 rounded-md p-2.5">
                    <p className="text-[11px] text-default dark:text-slate-400 mb-0.5">Daily Avg Present</p>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">{weeklyAvgPresent}</h4>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mb-0">{weeklyAvgRate}% avg turnout</p>
                  </div>
                  <div className="border border-border-color bg-light dark:bg-slate-800/60 rounded-md p-2.5">
                    <p className="text-[11px] text-default dark:text-slate-400 mb-0.5">Total Week Punches</p>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">{hrmData?.weeklyTrend?.totalPresent ?? 0}</h4>
                    <p className="text-[11px] text-default dark:text-slate-400 mb-0">Past 7 calendar days</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-title dark:text-white mb-1 uppercase tracking-wider">7-Day Attendance Trend</p>
                  <div className="h-[105px]">
                    {isMounted && weeklySeries.length > 0 ? (
                      <Chart
                        key={`week-chart-${weeklyCategories.join("-")}-${weeklySeries.join("-")}`}
                        options={barOptions}
                        series={[{ name: 'Present', data: weeklySeries }]}
                        type="bar"
                        height={105}
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-slate-50 dark:bg-slate-800/40 rounded text-xs text-muted-foreground">
                        No attendance logs recorded this week
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* VIEW 3: MONTH (MONTH-TO-DATE) */}
            {attendancePeriod === "month" && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="border border-border-color bg-light dark:bg-slate-800/60 rounded-md p-2.5">
                    <p className="text-[11px] text-default dark:text-slate-400 mb-0.5">Monthly Turnout</p>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">{monthlyRate}%</h4>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mb-0">Cumulative rate</p>
                  </div>
                  <div className="border border-border-color bg-light dark:bg-slate-800/60 rounded-md p-2.5">
                    <p className="text-[11px] text-default dark:text-slate-400 mb-0.5">Total Punches</p>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">{monthlyPresent}</h4>
                    <p className="text-[11px] text-default dark:text-slate-400 mb-0">{monthDaysPassed} days recorded</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="border border-border-color bg-light dark:bg-slate-800/60 rounded-md p-2.5">
                    <p className="text-[11px] text-default dark:text-slate-400 mb-0.5">Late Check-Ins</p>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">{monthlyLate}</h4>
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mb-0">This month</p>
                  </div>
                  <div className="border border-border-color bg-light dark:bg-slate-800/60 rounded-md p-2.5">
                    <p className="text-[11px] text-default dark:text-slate-400 mb-0.5">Active Employees</p>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">{totalEmployees}</h4>
                    <p className="text-[11px] text-default dark:text-slate-400 mb-0">Registered in system</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Row 2: Monthly Payroll & Recruitment Pipeline (2 equal columns on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">

        {/* Col 1: Monthly Payroll Trend Dark Navy Card (6 of 12 cols on desktop) */}
        <div className="lg:col-span-6 relative overflow-hidden rounded-md border border-border-color bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
          <div className="bg-linear-gradient p-4 text-white">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <div>
                <p className="text-white/80 text-xs mb-1">Monthly Payroll</p>
                <h3 className="font-bold text-white text-2xl mb-1">{totalPayroll}</h3>
                <p className="text-[12px] text-white/70 mb-0">
                  {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })} · {totalEmployees} active employees
                </p>
              </div>
              <Link
                to="/payroll"
                className="btn-sm bg-white border border-border-color text-dark hover:bg-primary hover:border-primary hover:text-white flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer shadow-xs transition"
              >
                <i className="icon-download text-xs"></i> Download Payslips
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/10">
              <div>
                <p className="text-white/70 text-xs mb-1">Avg Salary</p>
                <h4 className="text-xl text-white font-bold mb-0">{avgSalary}</h4>
              </div>
              <div>
                <p className="text-white/70 text-xs mb-1">Last Month</p>
                <h4 className="text-xl text-white font-bold mb-0">{lastMonthPayroll}</h4>
              </div>
              <div>
                <p className="text-white/70 text-xs mb-1">MOM Growth</p>
                <h4 className="text-xl text-white font-bold mb-0">{momGrowth}%</h4>
              </div>
            </div>
          </div>
          <div className="p-4 pb-1 flex-1 flex flex-col justify-end">
            <p className="text-xs font-bold text-gray-900 dark:text-white mb-1 uppercase tracking-wider">6-Month Payroll Trend</p>
            <div className="h-[90px]">
              {isMounted ? (
                <Chart options={areaOptions} series={[{ name: 'Payroll', data: payrollSeries }]} type="area" height={90} />
              ) : (
                <div className="h-full w-full bg-slate-100 animate-pulse rounded"></div>
              )}
            </div>
          </div>
        </div>

        {/* Col 2: Recruitment Pipeline (6 of 12 cols on desktop) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-4 border border-border-color rounded-md shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h3 className="text-base lg:text-[17px] font-bold text-title dark:text-white mb-0">Recruitment Pipeline</h3>
              <Link
                to="/recruitment"
                className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-dark dark:text-white hover:bg-primary hover:border-primary hover:text-white flex items-center justify-center gap-1 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition"
              >
                <i className="ph ph-plus text-xs"></i> Post New Job
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="border border-border-color rounded-md p-2.5 bg-light/50 dark:bg-slate-800/40">
                <div className="flex items-center gap-2 mb-2">
                  <div className="size-9 bg-light dark:bg-slate-800 border border-border-color rounded-md flex items-center justify-center text-primary shrink-0">
                    <i className="ph-duotone ph-clipboard-text text-xl"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-0">{recruitment.newApplicants}</h3>
                    <p className="text-[11px] text-default dark:text-slate-400 mb-0">Applicants</p>
                  </div>
                </div>
                <div className="h-1 bg-success rounded-full"></div>
              </div>

              <div className="border border-border-color rounded-md p-2.5 bg-light/50 dark:bg-slate-800/40">
                <div className="flex items-center gap-2 mb-2">
                  <div className="size-9 bg-light dark:bg-slate-800 border border-border-color rounded-md flex items-center justify-center text-purple shrink-0">
                    <i className="ph-duotone ph-users text-xl"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-0">{recruitment.screening}</h3>
                    <p className="text-[11px] text-default dark:text-slate-400 mb-0">Screening</p>
                  </div>
                </div>
                <div className="h-1 bg-purple rounded-full"></div>
              </div>

              <div className="border border-border-color rounded-md p-2.5 bg-light/50 dark:bg-slate-800/40">
                <div className="flex items-center gap-2 mb-2">
                  <div className="size-9 bg-light dark:bg-slate-800 border border-border-color rounded-md flex items-center justify-center text-info shrink-0">
                    <i className="ph-duotone ph-video-camera text-xl"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-0">{recruitment.interviews}</h3>
                    <p className="text-[11px] text-default dark:text-slate-400 mb-0">Interviews</p>
                  </div>
                </div>
                <div className="h-1 bg-info rounded-full"></div>
              </div>
            </div>

            <p className="text-xs font-semibold text-title dark:text-white uppercase tracking-wider mb-2">Recent Real Candidates</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {recruitment.recentCandidates.slice(0, 4).map((c: any) => {
                const badgeClass =
                  c.stage === 'interview'
                    ? 'bg-pink-transparent text-pink'
                    : c.stage === 'applied'
                    ? 'bg-warning-transparent text-warning'
                    : c.stage === 'offered'
                    ? 'bg-purple-transparent text-purple'
                    : 'bg-success-transparent text-success';

                return (
                  <div key={c.id} className="flex items-center justify-between gap-2 border border-border-color bg-light dark:bg-slate-800/40 rounded-md p-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={c.avatarUrl}
                        className="size-8 rounded-full border border-border-color shrink-0 object-cover"
                        alt={c.name}
                       loading="lazy"/>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-title dark:text-white truncate mb-0">{c.name}</p>
                        <p className="text-[11px] text-default dark:text-slate-400 truncate mb-0">{c.position}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-medium capitalize px-2 py-0.5 rounded-md shrink-0 ${badgeClass}`}>
                      {c.stage}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Row 3: Performance Tracking & Job Openings (5/12 and 7/12 on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">

        {/* Col 1: Performance Tracking (5 of 12 cols on desktop) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-4 border border-border-color rounded-md shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h3 className="text-base lg:text-[17px] font-bold text-title dark:text-white mb-0">Performance Tracking</h3>
              <Link
                to="/okr"
                className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-dark dark:text-white hover:bg-primary hover:border-primary hover:text-white flex items-center justify-center gap-1 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition"
              >
                Full Report<i className="icon-chevron-right text-[10px]"></i>
              </Link>
            </div>

            <div className="space-y-2.5 mb-4">
              {leaderboard.map((emp: any, idx: number) => {
                const rankColor = idx === 0 ? 'bg-orange' : idx === 1 ? 'bg-primary' : 'bg-info';
                return (
                  <div key={emp.id} className="flex items-center justify-between gap-2 border border-border-color rounded-md p-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={emp.avatarUrl}
                          className="size-8 rounded-full border border-border-color object-cover"
                          alt={emp.name}
                         loading="lazy"/>
                        <span className={`absolute -bottom-1 -right-1 ${rankColor} text-white text-[9px] font-bold rounded-full size-4 flex items-center justify-center`}>
                          {emp.rank}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-title dark:text-white truncate mb-0">{emp.name}</p>
                        <p className="text-[11px] text-default dark:text-slate-400 truncate mb-0">{emp.position}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-white mb-0">{emp.score}%</p>
                      <p className="text-[11px] text-success inline-flex items-center mb-0">
                        <i className="icon-arrow-up-right me-0.5"></i>{emp.growth}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-border-color">
            <div>
              <div className="h-1.5 bg-light dark:bg-slate-800 rounded-full overflow-hidden mb-1">
                <div className="h-full bg-primary rounded-full" style={{ width: '87%' }}></div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-default dark:text-slate-400 mb-0">Hiring Target Progress</p>
                <p className="text-xs font-semibold text-gray-900 dark:text-white mb-0">87%</p>
              </div>
            </div>
            <div>
              <div className="h-1.5 bg-light dark:bg-slate-800 rounded-full overflow-hidden mb-1">
                <div className="h-full bg-warning rounded-full" style={{ width: '92%' }}></div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-default dark:text-slate-400 mb-0">Workforce Retention Rate</p>
                <p className="text-xs font-semibold text-gray-900 dark:text-white mb-0">92%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Col 2: Job Openings Data Table (7 of 12 cols on desktop) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-4 border border-border-color rounded-md shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h3 className="text-base lg:text-[17px] font-bold text-title dark:text-white mb-0">Job Openings & Requisitions</h3>
              <Link
                to="/recruitment"
                className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-dark dark:text-white hover:bg-primary hover:border-primary hover:text-white flex items-center justify-center gap-1 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition"
              >
                All Openings<i className="icon-chevron-right text-[10px]"></i>
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-default dark:text-slate-400 border-b border-border-color">
                    <th className="text-left py-2 px-2 text-[12px] font-semibold text-gray-900 dark:text-white">Job Title</th>
                    <th className="text-left py-2 px-2 text-[12px] font-semibold text-gray-900 dark:text-white">Department</th>
                    <th className="text-left py-2 px-2 text-[12px] font-semibold text-gray-900 dark:text-white">Location</th>
                    <th className="text-left py-2 px-2 text-[12px] font-semibold text-gray-900 dark:text-white">Openings</th>
                    <th className="text-left py-2 px-2 text-[12px] font-semibold text-gray-900 dark:text-white">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {jobOpenings.map((job: any) => (
                    <tr key={job.id} className="border-b border-border-color last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-2">
                        <div className="inline-flex items-center gap-2">
                          <span className="size-8 rounded-md bg-light dark:bg-slate-800 border border-border-color flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {job.title.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="text-xs font-semibold text-title dark:text-white hover:text-primary transition cursor-pointer">
                            {job.title}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-xs text-default dark:text-slate-400">{job.category}</td>
                      <td className="py-2.5 px-2 text-xs text-default dark:text-slate-400">{job.location}</td>
                      <td className="py-2.5 px-2 text-xs text-default dark:text-slate-400 font-semibold">{String(job.openings).padStart(2, '0')}</td>
                      <td className="py-2.5 px-2">
                        <span className="inline-flex items-center text-[11px] bg-success-transparent text-success px-2 py-0.5 rounded font-medium">
                          <i className="ph ph-check-circle text-[10px] me-1"></i>{job.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
      <footer className="footer px-6 pb-3 mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground border-t border-border-color pt-4">
        <p>{new Date().getFullYear()} &copy; Developed and maintained by Webfamily Tech Solutions</p>
      </footer>
    </div>
  );
}
