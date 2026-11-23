'use client';

import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Link } from "@/src/lib/router-compat";
import { SmartHRHeader } from "@/components/ui/smarthr-header";

const Chart = lazy(() => import("react-apexcharts"));

export default function HRDashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeTabTopEmp, setActiveTabTopEmp] = useState<"1D" | "7D" | "1M" | "1Y">("1D");

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
        return null;
      }
    },
    refetchInterval: 30000,
  });

  // 1. Employee Status & Type Donut Chart
  const empStatusOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "donut", height: 180 },
      labels: ["Permanent", "Contract", "Probation"],
      series: [1054, 568, 80],
      colors: ["#0d6efd", "#6366f1", "#f59e0b"],
      legend: { show: false },
      dataLabels: { enabled: false },
      plotOptions: { pie: { donut: { size: "70%" } } },
      tooltip: { theme: "dark" },
    }),
    []
  );

  // 2. Leave Type Distribution Donut Chart
  const leaveTypeOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "donut", height: 180 },
      labels: ["Casual", "Sick", "Annual", "Maternity", "Paternity"],
      series: [40, 20, 25, 10, 5],
      colors: ["#0d6efd", "#ec4899", "#10b981", "#8b5cf6", "#f59e0b"],
      legend: { show: false },
      dataLabels: { enabled: false },
      plotOptions: { pie: { donut: { size: "70%" } } },
      tooltip: { theme: "dark" },
    }),
    []
  );

  // 3. Attendance Trend Bar Chart
  const attendanceTrendOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "bar", height: 260, toolbar: { show: false } },
      series: [
        { name: "Present", data: [120, 140, 155, 170, 160, 180, 175, 190, 185, 200, 210, 220] },
        { name: "Late", data: [15, 12, 18, 10, 14, 11, 16, 12, 10, 14, 11, 13] },
        { name: "Absent", data: [8, 6, 10, 5, 8, 6, 9, 7, 5, 8, 6, 7] },
      ],
      colors: ["#0d6efd", "#f59e0b", "#f43f5e"],
      plotOptions: { bar: { columnWidth: "45%", borderRadius: 3 } },
      xaxis: {
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        labels: { style: { colors: "#94A3B8", fontSize: "11px" } },
      },
      yaxis: { labels: { style: { colors: "#94A3B8", fontSize: "11px" } } },
      grid: { borderColor: "#E2E8F0", strokeDashArray: 3 },
      legend: { position: "top", horizontalAlign: "right", fontSize: "11px" },
      dataLabels: { enabled: false },
    }),
    []
  );

  // 4. Top Employee Distribution Bar Chart
  const topEmpDistOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "bar", height: 260, toolbar: { show: false } },
      plotOptions: { bar: { horizontal: true, barHeight: "50%", borderRadius: 4, distributed: true } },
      series: [{ name: "Headcount", data: [85, 65, 92, 45, 78] }],
      xaxis: {
        categories: ["Sales", "Marketing", "Development", "HR", "Design"],
        labels: { style: { colors: "#94A3B8", fontSize: "11px" } },
      },
      yaxis: { labels: { style: { colors: "#94A3B8", fontSize: "11px" } } },
      colors: ["#0d6efd", "#10b981", "#6366f1", "#f59e0b", "#ec4899"],
      grid: { borderColor: "#E2E8F0", strokeDashArray: 3 },
      legend: { show: false },
      dataLabels: { enabled: false },
    }),
    []
  );

  // 5. Benefits Deductions Mini Chart
  const deductionChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "line", height: 50, width: 90, sparkline: { enabled: true } },
      series: [{ data: [45, 52, 38, 56, 49, 56] }],
      colors: ["#0d6efd"],
      stroke: { curve: "smooth", width: 2 },
      tooltip: { enabled: false },
    }),
    []
  );

  // 6. Total Payroll Mini Chart
  const payrollChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "area", height: 50, width: 90, sparkline: { enabled: true } },
      series: [{ data: [1.8, 1.9, 2.1, 2.2, 2.3, 2.4] }],
      colors: ["#10b981"],
      stroke: { curve: "smooth", width: 2 },
      fill: { opacity: 0.2 },
      tooltip: { enabled: false },
    }),
    []
  );

  // 7. Top Employees Ranking Chart
  const topEmployeesRankingOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "bar", height: 160, toolbar: { show: false } },
      series: [{ name: "Performance Score", data: [98, 95, 92, 89, 87, 85] }],
      colors: ["#0d6efd"],
      plotOptions: { bar: { columnWidth: "35%", borderRadius: 3 } },
      xaxis: {
        categories: ["Alex R.", "Stephan P.", "Anthony L.", "Brian V.", "Doglas M.", "Harvey S."],
        labels: { style: { colors: "#94A3B8", fontSize: "10px" } },
      },
      yaxis: { min: 60, max: 100, labels: { style: { colors: "#94A3B8", fontSize: "10px" } } },
      grid: { borderColor: "#E2E8F0", strokeDashArray: 3 },
      dataLabels: { enabled: false },
    }),
    []
  );

  return (
    <div className="w-full min-w-0 space-y-5">
      {/* ── Breadcrumb & Actions Header ── */}
      <SmartHRHeader title="HR Dashboard" dateValue="2026" />

      {/* ── ROW 1: Employee Status & Leave Distribution (5 cols) + Overview Stats (7 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: 2 Cards */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Card 1: Employee Status & Type */}
          <div className="bg-white dark:bg-card border border-border-color rounded-xl p-5 shadow-2xs">
            <div className="border rounded-lg border-l-4 border-l-primary flex items-center justify-between p-2.5 mb-4 bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Employee Status & Type
              </h2>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="w-1/2">
                {isMounted && (
                  <Suspense fallback={<div className="h-40"></div>}>
                    <Chart options={empStatusOptions} series={empStatusOptions.series} type="donut" height={160} />
                  </Suspense>
                )}
              </div>
              <div className="w-1/2 space-y-2">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-border-color flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-primary"></span>
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Permanent</span>
                  </div>
                  <strong className="text-xs font-bold text-slate-900 dark:text-white">1054</strong>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-border-color flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-indigo-500"></span>
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Contract</span>
                  </div>
                  <strong className="text-xs font-bold text-slate-900 dark:text-white">568</strong>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-border-color flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-amber-500"></span>
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Probation</span>
                  </div>
                  <strong className="text-xs font-bold text-slate-900 dark:text-white">80</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Leave Type Distribution */}
          <div className="bg-white dark:bg-card border border-border-color rounded-xl p-5 shadow-2xs">
            <div className="border rounded-lg border-l-4 border-l-primary flex items-center justify-between p-2.5 mb-4 bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Leave Type Distribution
              </h2>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="w-1/2">
                {isMounted && (
                  <Suspense fallback={<div className="h-40"></div>}>
                    <Chart options={leaveTypeOptions} series={leaveTypeOptions.series} type="donut" height={160} />
                  </Suspense>
                )}
              </div>
              <div className="w-1/2 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span className="size-2 rounded-full bg-primary"></span> Casual Leave
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">40%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span className="size-2 rounded-full bg-pink-500"></span> Sick Leave
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">20%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span className="size-2 rounded-full bg-emerald-500"></span> Annual Leave
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">25%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span className="size-2 rounded-full bg-purple-500"></span> Maternity
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">10%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span className="size-2 rounded-full bg-amber-500"></span> Paternity
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">5%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Overview Statistics (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-card border border-border-color rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="border rounded-lg border-l-4 border-l-primary flex items-center justify-between p-2.5 mb-4 bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Overview Statistics
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Total Employees */}
              <div className="p-4 rounded-xl border border-border-color bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Total Employees</p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">1,848</h3>
                  <span className="inline-flex items-center text-[11px] font-semibold text-emerald-600 gap-1">
                    <i className="ti ti-trending-up"></i> +12% from last month
                  </span>
                </div>
                <div className="size-11 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl">
                  <i className="ti ti-users"></i>
                </div>
              </div>

              {/* Active Today */}
              <div className="p-4 rounded-xl border border-border-color bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Active Today</p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">1,248</h3>
                  <span className="inline-flex items-center text-[11px] font-semibold text-emerald-600 gap-1">
                    <i className="ti ti-trending-up"></i> +8% from last month
                  </span>
                </div>
                <div className="size-11 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xl">
                  <i className="ti ti-user-check"></i>
                </div>
              </div>

              {/* On Leave */}
              <div className="p-4 rounded-xl border border-border-color bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">On Leave</p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">12</h3>
                  <span className="inline-flex items-center text-[11px] font-semibold text-rose-500 gap-1">
                    <i className="ti ti-trending-down"></i> -2% from last month
                  </span>
                </div>
                <div className="size-11 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center text-xl">
                  <i className="ti ti-calendar-off"></i>
                </div>
              </div>

              {/* Total Payroll */}
              <div className="p-4 rounded-xl border border-border-color bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Total Payroll</p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">$2.4M</h3>
                  <span className="inline-flex items-center text-[11px] font-semibold text-emerald-600 gap-1">
                    <i className="ti ti-trending-up"></i> +4.2% from last month
                  </span>
                </div>
                <div className="size-11 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center text-xl">
                  <i className="ti ti-wallet"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 2: Attendance Trend (8 cols) + Top Employee Distribution (4 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Attendance Trend */}
        <div className="lg:col-span-8 bg-white dark:bg-card border border-border-color rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="border rounded-lg border-l-4 border-l-primary flex items-center justify-between p-2.5 mb-4 bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Attendance Trend
              </h2>
            </div>

            {isMounted && (
              <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
                <Chart options={attendanceTrendOptions} series={attendanceTrendOptions.series} type="bar" height={260} />
              </Suspense>
            )}

            {/* 6 Bottom Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 pt-4 border-t border-border-color mt-4 text-center">
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-border-color">
                <p className="text-[11px] text-slate-400 mb-0.5">On-Time</p>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">82</h4>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-border-color">
                <p className="text-[11px] text-slate-400 mb-0.5">Late</p>
                <h4 className="text-sm font-bold text-amber-500">11</h4>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-border-color">
                <p className="text-[11px] text-slate-400 mb-0.5">Absent</p>
                <h4 className="text-sm font-bold text-rose-500">6</h4>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-border-color">
                <p className="text-[11px] text-slate-400 mb-0.5">Avg Hours</p>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">8.4 hrs</h4>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-border-color">
                <p className="text-[11px] text-slate-400 mb-0.5">Overtime</p>
                <h4 className="text-sm font-bold text-purple-600">12</h4>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-border-color">
                <p className="text-[11px] text-slate-400 mb-0.5">Attendance Rate</p>
                <h4 className="text-sm font-bold text-emerald-600">97.2%</h4>
              </div>
            </div>
          </div>
        </div>

        {/* Top Employee Distribution */}
        <div className="lg:col-span-4 bg-white dark:bg-card border border-border-color rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="border rounded-lg border-l-4 border-l-primary flex items-center justify-between p-2.5 mb-4 bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Top Employee Distribution
              </h2>
            </div>

            {isMounted && (
              <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
                <Chart options={topEmpDistOptions} series={topEmpDistOptions.series} type="bar" height={260} />
              </Suspense>
            )}
          </div>
        </div>
      </div>

      {/* ── ROW 3: Late Arrivals + Recruitment Statistics & Training + Upcoming Interview ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
        {/* Late Arrivals Today (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-card border border-border-color rounded-xl p-5 shadow-2xs">
          <div className="border rounded-lg border-l-4 border-l-primary flex items-center justify-between p-2.5 mb-4 bg-slate-50/50 dark:bg-slate-800/30">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Late Arrivals Today
            </h2>
            <span className="text-xs text-slate-500 font-medium">Today</span>
          </div>

          <div className="space-y-3">
            {[
              { name: "Jessica Brown", dept: "Customer Support", time: "10:15 AM", late: "+45 Min", avatar: "/assets/img/users/user-26.jpg" },
              { name: "Amanda Lewis", dept: "HR Admin", time: "10:25 AM", late: "+55 Min", avatar: "/assets/img/users/user-31.jpg" },
              { name: "James Clark", dept: "Sales", time: "10:00 AM", late: "+30 Min", avatar: "/assets/img/users/user-27.jpg" },
              { name: "Amanda Davis", dept: "Administration", time: "09:40 AM", late: "+20 Min", avatar: "/assets/img/users/user-56.jpg" },
              { name: "Lisa Anderson", dept: "Finance", time: "09:35 AM", late: "+05 Min", avatar: "/assets/img/users/user-29.jpg" },
            ].map((emp, idx) => (
              <div key={idx} className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-border-color flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                    <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">{emp.name}</h5>
                    <p className="text-[11px] text-slate-400 truncate">{emp.dept}</p>
                  </div>
                </div>
                <div className="text-end shrink-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-0.5">{emp.time}</p>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                    {emp.late}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recruitment Statistics + Training (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Recruitment Statistics */}
          <div className="bg-white dark:bg-card border border-border-color rounded-xl p-5 shadow-2xs flex-1">
            <div className="border rounded-lg border-l-4 border-l-primary flex items-center justify-between p-2.5 mb-4 bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Recruitment Statistics
              </h2>
              <span className="text-xs text-slate-500 font-medium">Weekly</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center mb-4">
              <div>
                <p className="text-[11px] text-slate-400 mb-0.5">Applicants</p>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">487</h3>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 mb-0.5">Hired</p>
                <h3 className="text-xl font-bold text-emerald-600">24</h3>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 mb-0.5">Avg Time</p>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">28 days</h3>
              </div>
            </div>

            {/* Stacked Progress Bar */}
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex mb-4">
              <div className="bg-primary h-full" style={{ width: "40%" }}></div>
              <div className="bg-indigo-500 h-full" style={{ width: "20%" }}></div>
              <div className="bg-pink-500 h-full" style={{ width: "23%" }}></div>
              <div className="bg-emerald-500 h-full" style={{ width: "17%" }}></div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 mb-0.5">
                  <span className="size-2 rounded-full bg-primary"></span> Applications
                </p>
                <p className="text-slate-400 text-[11px]">40% - 57 Candidates</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 mb-0.5">
                  <span className="size-2 rounded-full bg-indigo-500"></span> Screening
                </p>
                <p className="text-slate-400 text-[11px]">20% - 36 Candidates</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 mb-0.5">
                  <span className="size-2 rounded-full bg-pink-500"></span> Interview
                </p>
                <p className="text-slate-400 text-[11px]">23% - 64 Candidates</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 mb-0.5">
                  <span className="size-2 rounded-full bg-emerald-500"></span> Hired
                </p>
                <p className="text-slate-400 text-[11px]">17% - 18 Candidates</p>
              </div>
            </div>
          </div>

          {/* Employees in Training Card */}
          <div className="bg-indigo-900 text-white rounded-xl p-4 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs text-indigo-200 mb-1">Employees in Training</p>
              <h2 className="text-2xl font-bold text-white mb-0">80</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                <img src="/assets/img/users/user-39.jpg" className="size-8 rounded-full border-2 border-white object-cover" alt="User" />
                <img src="/assets/img/users/user-41.jpg" className="size-8 rounded-full border-2 border-white object-cover" alt="User" />
                <img src="/assets/img/users/user-44.jpg" className="size-8 rounded-full border-2 border-white object-cover" alt="User" />
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Interview (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-card border border-border-color rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="border rounded-lg border-l-4 border-l-primary flex items-center justify-between p-2.5 mb-4 bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Upcoming Interview
              </h2>
              <span className="text-xs text-slate-500 font-medium">Today</span>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl border border-border-color border-l-4 border-l-primary bg-slate-50/70 dark:bg-slate-800/40">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">UI/UX Design Interview</h5>
                  <div className="flex -space-x-1.5">
                    <img src="/assets/img/users/user-31.jpg" className="size-6 rounded-full border border-white" alt="Interviewer" />
                    <img src="/assets/img/users/user-32.jpg" className="size-6 rounded-full border border-white" alt="Interviewer" />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 flex items-center gap-1 mb-0">
                  <i className="ti ti-clock text-xs"></i> 12:00 PM - 01:50 PM
                </p>
              </div>

              <div className="p-3 rounded-xl border border-border-color border-l-4 border-l-indigo-500 bg-slate-50/70 dark:bg-slate-800/40">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">Frontend Dev Technical Round</h5>
                  <div className="flex -space-x-1.5">
                    <img src="/assets/img/users/user-29.jpg" className="size-6 rounded-full border border-white" alt="Interviewer" />
                    <img src="/assets/img/users/user-56.jpg" className="size-6 rounded-full border border-white" alt="Interviewer" />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 flex items-center gap-1 mb-0">
                  <i className="ti ti-clock text-xs"></i> 02:00 PM - 03:30 PM
                </p>
              </div>

              <div className="p-3 rounded-xl border border-border-color border-l-4 border-l-emerald-500 bg-slate-50/70 dark:bg-slate-800/40">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">Backend Lead System Design</h5>
                  <div className="flex -space-x-1.5">
                    <img src="/assets/img/users/user-26.jpg" className="size-6 rounded-full border border-white" alt="Interviewer" />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 flex items-center gap-1 mb-0">
                  <i className="ti ti-clock text-xs"></i> 04:00 PM - 05:00 PM
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 4: Deductions & Total Payroll (7 cols) + Pending Approvals (5 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (7 cols): 2 KPI Cards + Top Employees Ranking */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* 2 KPI Sub-cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Benefits Deductions */}
            <div className="bg-white dark:bg-card border border-border-color rounded-xl p-4 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">Benefits Deductions</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-0.5">$56K</h3>
                <p className="text-[11px] text-slate-400">Insurance + 401(k)</p>
              </div>
              <div>
                {isMounted && (
                  <Suspense fallback={<div className="h-10 w-20"></div>}>
                    <Chart options={deductionChartOptions} series={deductionChartOptions.series} type="line" height={50} width={90} />
                  </Suspense>
                )}
              </div>
            </div>

            {/* Total Payroll */}
            <div className="bg-white dark:bg-card border border-border-color rounded-xl p-4 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">Total Payroll</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-0.5">$2.4M</h3>
                <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  <i className="ti ti-arrow-wave-right-up"></i> +55% Increased
                </span>
              </div>
              <div>
                {isMounted && (
                  <Suspense fallback={<div className="h-10 w-20"></div>}>
                    <Chart options={payrollChartOptions} series={payrollChartOptions.series} type="area" height={50} width={90} />
                  </Suspense>
                )}
              </div>
            </div>
          </div>

          {/* Top Employees Ranking */}
          <div className="bg-white dark:bg-card border border-border-color rounded-xl p-5 shadow-2xs flex-1">
            <div className="border rounded-lg border-l-4 border-l-primary flex items-center justify-between p-2.5 mb-4 bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Top Employees
              </h2>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md border border-border-color text-xs">
                {(["1D", "7D", "1M", "1Y"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setActiveTabTopEmp(r)}
                    className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                      activeTabTopEmp === r ? "bg-white dark:bg-card text-primary shadow-2xs font-bold" : "text-slate-500"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {isMounted && (
              <Suspense fallback={<div className="h-36 flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
                <Chart options={topEmployeesRankingOptions} series={topEmployeesRankingOptions.series} type="bar" height={160} />
              </Suspense>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Pending Approvals */}
        <div className="lg:col-span-5 bg-white dark:bg-card border border-border-color rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="border rounded-lg border-l-4 border-l-primary flex items-center justify-between p-2.5 mb-4 bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Pending Approvals
              </h2>
              <Link to="/leaves-employee" className="text-xs text-primary hover:underline font-semibold">
                View All
              </Link>
            </div>

            <div className="space-y-3">
              {[
                { name: "Hendrita Merkel", dates: "Jan 10 - Jan 16", days: "4 days", reason: "Family trip", avatar: "/assets/img/users/user-29.jpg" },
                { name: "Michael Brown", dates: "Jan 3 - Jan 9", days: "2 days", reason: "Medical appointment", avatar: "/assets/img/users/user-27.jpg" },
                { name: "Daniel Martinez", dates: "Jan 17 - Jan 23", days: "2 days", reason: "Personal Work", avatar: "/assets/img/users/user-30.jpg" },
              ].map((req, idx) => (
                <div key={idx} className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-border-color">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <img src={req.avatar} alt={req.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white">{req.name}</h5>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span>{req.dates}</span>
                          <span>•</span>
                          <span>{req.days}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2.5">Reason: {req.reason}</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toast.success(`Approved request for ${req.name}`)}
                      className="px-3 py-1 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => toast.error(`Declined request for ${req.name}`)}
                      className="px-3 py-1 text-xs font-semibold border border-border-color text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
