'use client';

import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Link } from "@/src/lib/router-compat";
import { SmartHRHeader } from "@/components/ui/smarthr-header";
import { Badge } from "@/components/ui/badge";

const Chart = lazy(() => import("react-apexcharts"));

export default function ITAdminDashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeEnv, setActiveEnv] = useState<"production" | "staging" | "dev">("production");
  const [storageDay, setStorageDay] = useState<"1D" | "7D" | "1M" | "1Y">("1Y");
  const [usageRange, setUsageRange] = useState<"1H" | "1D" | "1W" | "1M">("1W");
  const [accessRange, setAccessRange] = useState<"Today" | "Weekly" | "Monthly">("Today");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: itData } = useQuery({
    queryKey: ["dashboard-it-admin-realtime"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/dashboard/it-admin");
        return res?.data || res || {};
      } catch {
        return null;
      }
    },
  });

  // 4 Top Sparklines
  const uptimeSparkline: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "area", height: 40, width: 80, sparkline: { enabled: true } },
      series: [{ data: [99.5, 99.8, 99.9, 99.7, 99.9, 99.9] }],
      colors: ["#10b981"],
      stroke: { curve: "smooth", width: 2 },
      fill: { opacity: 0.2 },
      tooltip: { enabled: false },
    }),
    []
  );

  const apiSparkline: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "bar", height: 40, width: 80, sparkline: { enabled: true } },
      series: [{ data: [12, 14, 18, 15, 16, 14] }],
      colors: ["#0d6efd"],
      plotOptions: { bar: { columnWidth: "50%", borderRadius: 2 } },
      tooltip: { enabled: false },
    }),
    []
  );

  const ticketsSparkline: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "line", height: 40, width: 80, sparkline: { enabled: true } },
      series: [{ data: [24, 20, 22, 19, 21, 18] }],
      colors: ["#f59e0b"],
      stroke: { curve: "smooth", width: 2 },
      tooltip: { enabled: false },
    }),
    []
  );

  const jobsSparkline: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "area", height: 40, width: 80, sparkline: { enabled: true } },
      series: [{ data: [10, 11, 12, 12, 12, 12] }],
      colors: ["#8b5cf6"],
      stroke: { curve: "smooth", width: 2 },
      fill: { opacity: 0.2 },
      tooltip: { enabled: false },
    }),
    []
  );

  // Storage Usage by Module Bar Chart
  const storageChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "bar", height: 230, toolbar: { show: false } },
      plotOptions: { bar: { columnWidth: "40%", borderRadius: 4, distributed: true } },
      series: [{ name: "Storage (GB)", data: [145, 98, 220, 180, 75, 310] }],
      xaxis: {
        categories: ["Core HR", "Payroll Engine", "Biometric Logs", "Recruitment Files", "Leave Records", "Doc Vault"],
        labels: { style: { colors: "#94A3B8", fontSize: "11px" } },
      },
      yaxis: { labels: { style: { colors: "#94A3B8", fontSize: "11px" }, formatter: (v) => `${v} GB` } },
      colors: ["#0d6efd", "#4f46e5", "#06b6d4", "#f59e0b", "#ec4899", "#10b981"],
      grid: { borderColor: "#E2E8F0", strokeDashArray: 3 },
      legend: { show: false },
      dataLabels: { enabled: false },
    }),
    []
  );

  // MFA Radial Bar
  const mfaChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "donut", height: 160 },
      labels: ["MFA Enforced", "Standard Login"],
      series: [89, 11],
      colors: ["#10b981", "#E2E8F0"],
      legend: { position: "bottom", fontSize: "11px" },
      dataLabels: { enabled: false },
      plotOptions: { pie: { donut: { size: "75%" } } },
    }),
    []
  );

  // Login Activity Area Chart
  const loginActivityOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "area", height: 180, toolbar: { show: false } },
      series: [
        { name: "Successful Logins", data: [450, 720, 1150, 980, 890, 640, 1280, 1420, 980, 420] },
        { name: "Failed Attempts", data: [12, 18, 47, 24, 15, 8, 22, 35, 19, 7] },
      ],
      colors: ["#0d6efd", "#f43f5e"],
      stroke: { curve: "smooth", width: 2 },
      fill: { opacity: 0.15 },
      xaxis: {
        categories: ["9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM"],
        labels: { style: { colors: "#94A3B8", fontSize: "10px" } },
      },
      yaxis: { labels: { style: { colors: "#94A3B8", fontSize: "10px" } } },
      grid: { borderColor: "#E2E8F0", strokeDashArray: 3 },
      legend: { position: "top", horizontalAlign: "right", fontSize: "11px" },
      dataLabels: { enabled: false },
    }),
    []
  );

  // HRMS Usage Trend Line Chart
  const usageTrendOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "line", height: 160, toolbar: { show: false } },
      series: [
        { name: "Web App", data: [420, 680, 850, 920, 880, 520, 310] },
        { name: "Mobile App", data: [310, 480, 620, 750, 690, 480, 260] },
      ],
      colors: ["#0d6efd", "#10b981"],
      stroke: { curve: "smooth", width: 2 },
      xaxis: {
        categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        labels: { style: { colors: "#94A3B8", fontSize: "10px" } },
      },
      yaxis: { labels: { style: { colors: "#94A3B8", fontSize: "10px" } } },
      grid: { borderColor: "#E2E8F0", strokeDashArray: 3 },
      legend: { position: "top", horizontalAlign: "right", fontSize: "11px" },
      dataLabels: { enabled: false },
    }),
    []
  );

  // Security mini charts
  const failedSparkline: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "bar", height: 35, width: 70, sparkline: { enabled: true } },
      series: [{ data: [15, 22, 38, 47] }],
      colors: ["#0d6efd"],
      plotOptions: { bar: { columnWidth: "50%", borderRadius: 2 } },
    }),
    []
  );

  const alertsSparkline: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "bar", height: 35, width: 70, sparkline: { enabled: true } },
      series: [{ data: [5, 8, 10, 12] }],
      colors: ["#6366f1"],
      plotOptions: { bar: { columnWidth: "50%", borderRadius: 2 } },
    }),
    []
  );

  const blockedSparkline: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "bar", height: 35, width: 70, sparkline: { enabled: true } },
      series: [{ data: [12, 19, 21, 27] }],
      colors: ["#f59e0b"],
      plotOptions: { bar: { columnWidth: "50%", borderRadius: 2 } },
    }),
    []
  );

  // Integration Error Counts Bar Chart
  const integrationErrorOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "bar", height: 160, toolbar: { show: false } },
      series: [{ name: "Errors", data: [4, 1, 8, 0, 2, 5] }],
      xaxis: {
        categories: ["Slack Bot", "Zoom Meet", "Stripe API", "Google Auth", "Biometric ZK", "Email SMTP"],
        labels: { style: { colors: "#94A3B8", fontSize: "10px" } },
      },
      yaxis: { labels: { style: { colors: "#94A3B8", fontSize: "10px" } } },
      colors: ["#f43f5e"],
      plotOptions: { bar: { columnWidth: "35%", borderRadius: 3 } },
      grid: { borderColor: "#E2E8F0", strokeDashArray: 3 },
      dataLabels: { enabled: false },
    }),
    []
  );

  return (
    <div className="w-full min-w-0 space-y-5">
      {/* ── Breadcrumb & Actions Header ── */}
      <SmartHRHeader
        title="IT Admin Dashboard"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-card border border-border-color rounded-lg text-xs shadow-2xs">
              <span className="size-6 rounded bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <i className="ti ti-server text-sm"></i>
              </span>
              <span className="text-slate-500">
                Active Users{" "}
                <strong className="text-slate-900 dark:text-white font-bold ml-1">
                  248
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-card border border-border-color rounded-lg text-xs shadow-2xs">
              <span className="size-6 rounded bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
                <i className="ti ti-info-octagon text-sm"></i>
              </span>
              <span className="text-slate-500">
                Security Alerts{" "}
                <strong className="text-slate-900 dark:text-white font-bold ml-1">
                  3
                </strong>
              </span>
            </div>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-border-color">
              {(["production", "staging", "dev"] as const).map((env) => (
                <button
                  key={env}
                  type="button"
                  onClick={() => {
                    setActiveEnv(env);
                    toast.info(`Switched environment view to ${env.toUpperCase()}`);
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition-colors ${
                    activeEnv === env
                      ? "bg-white dark:bg-card text-primary shadow-2xs font-bold"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
                >
                  {env}
                </button>
              ))}
            </div>
          </div>
        }
        showExport={false}
        showDatePicker={false}
      />

      {/* ── Row 1: 4 System Health Metrics with Sparklines ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* System Uptime */}
        <div className="bg-white dark:bg-card border border-border-color rounded-xl p-4 flex items-center justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-xs text-slate-500 font-medium">HRMS System Uptime</p>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-0.5">99.9%</h3>
            <p className="text-[11px] text-slate-400">Last 30 days</p>
          </div>
          <div className="text-end">
            <div className="size-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 mb-1 ml-auto">
              <i className="ti ti-clock-share text-base"></i>
            </div>
            {isMounted && (
              <Suspense fallback={<div className="h-10 w-20"></div>}>
                <Chart options={uptimeSparkline} series={uptimeSparkline.series} type="area" height={40} width={80} />
              </Suspense>
            )}
          </div>
        </div>

        {/* API Status */}
        <div className="bg-white dark:bg-card border border-border-color rounded-xl p-4 flex items-center justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-xs text-slate-500 font-medium">API Status</p>
            </div>
            <h3 className="text-2xl font-bold text-emerald-600 mb-0.5">Healthy</h3>
            <p className="text-[11px] text-slate-400">All operational</p>
          </div>
          <div className="text-end">
            <div className="size-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 mb-1 ml-auto">
              <i className="ti ti-api-app text-base"></i>
            </div>
            {isMounted && (
              <Suspense fallback={<div className="h-10 w-20"></div>}>
                <Chart options={apiSparkline} series={apiSparkline.series} type="bar" height={40} width={80} />
              </Suspense>
            )}
          </div>
        </div>

        {/* Open IT Tickets */}
        <div className="bg-white dark:bg-card border border-border-color rounded-xl p-4 flex items-center justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-xs text-slate-500 font-medium">Open IT Tickets</p>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-0.5">18</h3>
            <p className="text-[11px] text-rose-500 font-semibold">5 high priority</p>
          </div>
          <div className="text-end">
            <div className="size-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 mb-1 ml-auto">
              <i className="ti ti-badge text-base"></i>
            </div>
            {isMounted && (
              <Suspense fallback={<div className="h-10 w-20"></div>}>
                <Chart options={ticketsSparkline} series={ticketsSparkline.series} type="line" height={40} width={80} />
              </Suspense>
            )}
          </div>
        </div>

        {/* Background Jobs */}
        <div className="bg-white dark:bg-card border border-border-color rounded-xl p-4 flex items-center justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-xs text-slate-500 font-medium">Background Jobs</p>
            </div>
            <h3 className="text-2xl font-bold text-purple-600 mb-0.5">Running</h3>
            <p className="text-[11px] text-slate-400">12/12 jobs healthy</p>
          </div>
          <div className="text-end">
            <div className="size-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 mb-1 ml-auto">
              <i className="ti ti-briefcase-2 text-base"></i>
            </div>
            {isMounted && (
              <Suspense fallback={<div className="h-10 w-20"></div>}>
                <Chart options={jobsSparkline} series={jobsSparkline.series} type="area" height={40} width={80} />
              </Suspense>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 2: Storage Usage by Module (8 cols) & MFA + Quick Actions (4 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Storage Usage by Module */}
        <div className="lg:col-span-8 bg-white dark:bg-card border border-border-color rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <i className="ti ti-server text-primary text-base"></i>
                Storage Usage by Module (GB)
              </h2>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-border-color">
                {(["1D", "7D", "1M", "1Y"] as const).map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setStorageDay(range)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                      storageDay === range
                        ? "bg-white dark:bg-card text-primary shadow-2xs font-bold"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {isMounted && (
              <Suspense fallback={<div className="h-60 flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
                <Chart options={storageChartOptions} series={storageChartOptions.series} type="bar" height={230} />
              </Suspense>
            )}

            {/* 6 Module Uptime Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-border-color mt-4">
              {[
                { name: "Hr", uptime: "Uptime: 99.9%", ok: true },
                { name: "Payroll Engine", uptime: "Uptime: 96.9%", ok: true },
                { name: "Attendance Sync", uptime: "Uptime: 99.9%", ok: true },
                { name: "Recruitment Module", uptime: "Downtime: 19.9%", ok: false },
                { name: "Leave Management", uptime: "Uptime: 91.9%", ok: true },
                { name: "Document Storage", uptime: "Uptime: 95.9%", ok: true },
              ].map((m, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-border-color bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-slate-500 mb-0.5">{m.name}</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{m.uptime}</p>
                  </div>
                  <i className={`ti ${m.ok ? "ti-shield-check-filled text-emerald-500" : "ti-settings-filled text-rose-500"} text-lg`}></i>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MFA Enabled Users & Quick IT Actions (4 cols) */}
        <div className="lg:col-span-4 space-y-5 flex flex-col justify-between">
          {/* MFA Card */}
          <div className="bg-white dark:bg-card border border-border-color rounded-xl p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <i className="ti ti-shield text-primary text-base"></i>
                MFA Enabled Users
              </h2>
            </div>
            <p className="text-xs text-slate-500 mb-2 flex items-center justify-between">
              <span>2,168 out of 2,436 users</span>
              <strong className="text-slate-900 dark:text-white font-bold">89%</strong>
            </p>
            <div className="py-1">
              {isMounted && (
                <Suspense fallback={<div className="h-36"></div>}>
                  <Chart options={mfaChartOptions} series={mfaChartOptions.series} type="donut" height={160} />
                </Suspense>
              )}
            </div>
          </div>

          {/* Quick IT Actions */}
          <div className="bg-white dark:bg-card border border-border-color rounded-xl p-5 shadow-2xs">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <i className="ti ti-settings-2 text-primary text-base"></i>
              Quick IT Actions
            </h2>

            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { title: "Restart Services", icon: "ti-refresh", action: () => toast.success("Restarting HRMS container services...") },
                { title: "Sync Biometric", icon: "ti-fingerprint", action: () => toast.success("Biometric hardware sync triggered!") },
                { title: "Clear Cache", icon: "ti-trash", action: () => toast.success("Redis & application cache purged!") },
                { title: "Schedule Maint", icon: "ti-calendar-event", action: () => toast.info("Opening maintenance window scheduler...") },
                { title: "Stop Jobs", icon: "ti-player-stop", action: () => toast.error("Background workers paused.") },
                { title: "Re-run Payroll", icon: "ti-player-play", action: () => toast.success("Dispatched payroll batch job retry.") },
              ].map((act, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={act.action}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-border-color text-slate-700 dark:text-slate-200 transition-colors flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                >
                  <div className="size-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm">
                    <i className={`ti ${act.icon}`}></i>
                  </div>
                  <span className="text-[11px] font-semibold leading-tight">{act.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: User Access & Peak Hours ── */}
      <div className="bg-white dark:bg-card border border-border-color rounded-xl p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            User Access & Role Management
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Peak Hours (Today)</span>
            <div className="flex items-center gap-2.5 text-xs">
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                <i className="ti ti-square-rounded-filled text-primary text-xs"></i> Low (0-50%)
              </span>
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                <i className="ti ti-square-rounded-filled text-emerald-500 text-xs"></i> Medium (50-70%)
              </span>
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                <i className="ti ti-square-rounded-filled text-amber-500 text-xs"></i> High (70-90%)
              </span>
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                <i className="ti ti-square-rounded-filled text-rose-500 text-xs"></i> Peak (90-100%)
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2.5 mb-5">
          {[
            { hour: "9 AM", load: 85, color: "bg-primary" },
            { hour: "10 AM", load: 92, color: "bg-rose-500" },
            { hour: "11 AM", load: 78, color: "bg-primary" },
            { hour: "12 AM", load: 45, color: "bg-emerald-500" },
            { hour: "1 AM", load: 38, color: "bg-emerald-500" },
            { hour: "2 AM", load: 68, color: "bg-amber-500" },
            { hour: "3 AM", load: 82, color: "bg-primary" },
            { hour: "4 AM", load: 85, color: "bg-rose-500" },
            { hour: "5 AM", load: 88, color: "bg-primary" },
            { hour: "6 AM", load: 52, color: "bg-amber-500" },
          ].map((item, idx) => (
            <div key={idx} className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-border-color text-center">
              <p className="text-[11px] text-slate-500 mb-1 flex items-center justify-between">
                <span>{item.hour}</span>
                <i className={`ti ti-circle-filled text-[7px] ${item.load > 90 ? "text-rose-500" : item.load > 70 ? "text-primary" : "text-emerald-500"}`}></i>
              </p>
              <h5 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">{item.load}%</h5>
              <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.load}%` }}></div>
              </div>
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">Login Count Analysis</h2>
          {isMounted && (
            <Suspense fallback={<div className="h-44 flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={loginActivityOptions} series={loginActivityOptions.series} type="area" height={180} />
            </Suspense>
          )}
        </div>
      </div>

      {/* ── Row 4: Usage Trend, Security & Compliance, User Roles, Integration Errors ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
        {/* HRMS Usage Trend & Security (5 cols) */}
        <div className="bg-white dark:bg-card border border-border-color rounded-xl p-5 shadow-2xs lg:col-span-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <i className="ti ti-script text-primary text-base"></i>
                HRMS Usage Trend
              </h2>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md border border-border-color text-[11px]">
                {(["1H", "1D", "1W", "1M"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setUsageRange(r)}
                    className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                      usageRange === r ? "bg-white dark:bg-card text-primary shadow-2xs font-bold" : "text-slate-500"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            {isMounted && (
              <Suspense fallback={<div className="h-36"></div>}>
                <Chart options={usageTrendOptions} series={usageTrendOptions.series} type="line" height={160} />
              </Suspense>
            )}
          </div>

          <div className="pt-4 border-t border-border-color space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Security & Compliance</h4>
            <div className="space-y-3">
              {/* Failed Logins */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-border-color">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-0">47</h3>
                  <div className="border-l border-border-color pl-3">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-0">Failed Logins</p>
                    <p className="text-[10px] text-slate-400 mb-0">Last 24h</p>
                  </div>
                </div>
                {isMounted && (
                  <Suspense fallback={<div className="h-8 w-16"></div>}>
                    <Chart options={failedSparkline} series={failedSparkline.series} type="bar" height={35} width={70} />
                  </Suspense>
                )}
              </div>

              {/* Suspicious Alerts */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-border-color">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-0">12</h3>
                  <div className="border-l border-border-color pl-3">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-0">Suspicious Alerts</p>
                    <p className="text-[10px] text-slate-400 mb-0">Active</p>
                  </div>
                </div>
                {isMounted && (
                  <Suspense fallback={<div className="h-8 w-16"></div>}>
                    <Chart options={alertsSparkline} series={alertsSparkline.series} type="bar" height={35} width={70} />
                  </Suspense>
                )}
              </div>

              {/* Blocked IPs */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-border-color">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-0">27</h3>
                  <div className="border-l border-border-color pl-3">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-0">Blocked IPs</p>
                    <p className="text-[10px] text-slate-400 mb-0">Currently blocked</p>
                  </div>
                </div>
                {isMounted && (
                  <Suspense fallback={<div className="h-8 w-16"></div>}>
                    <Chart options={blockedSparkline} series={blockedSparkline.series} type="bar" height={35} width={70} />
                  </Suspense>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* User Roles & Integration Errors (7 cols) */}
        <div className="bg-white dark:bg-card border border-border-color rounded-xl p-5 shadow-2xs lg:col-span-7 flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
              <i className="ti ti-script text-primary text-base"></i>
              User Roles Distribution
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { role: "Employees", count: 2145, pct: "88%", color: "bg-blue-600" },
                { role: "Managers", count: 234, pct: "9.6%", color: "bg-indigo-600" },
                { role: "HR Operations", count: 45, pct: "1.8%", color: "bg-slate-700" },
                { role: "Admins", count: 12, pct: "0.5%", color: "bg-amber-500" },
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-border-color">
                  <p className="text-[11px] text-slate-500 mb-0.5">{item.role}</p>
                  <div className="h-2 rounded my-1.5 bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div className={`h-full ${item.color} rounded`} style={{ width: item.pct }}></div>
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-1 mb-0">{item.count}</h4>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-border-color">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <i className="ti ti-sparkles text-primary text-base"></i>
                Integration Error Counts (24h)
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">
                Healthy SLA
              </span>
            </div>
            {isMounted && (
              <Suspense fallback={<div className="h-36"></div>}>
                <Chart options={integrationErrorOptions} series={integrationErrorOptions.series} type="bar" height={160} />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
