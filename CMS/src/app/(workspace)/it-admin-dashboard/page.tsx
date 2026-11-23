'use client';

import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Link } from "@/src/lib/router-compat";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Chart = lazy(() => import("react-apexcharts"));

export default function ITAdminDashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeEnv, setActiveEnv] = useState<"production" | "staging" | "dev">("production");
  const [storageDay, setStorageDay] = useState<"1D" | "7D" | "1M" | "1Y">("1Y");
  const [usageRange, setUsageRange] = useState<"1H" | "1D" | "1W" | "1M">("1W");

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
    }),
    []
  );

  const apiSparkline: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "bar", height: 40, width: 80, sparkline: { enabled: true } },
      series: [{ data: [12, 14, 18, 15, 16, 14] }],
      colors: ["#0d6efd"],
      plotOptions: { bar: { columnWidth: "50%", borderRadius: 2 } },
    }),
    []
  );

  const ticketsSparkline: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "line", height: 40, width: 80, sparkline: { enabled: true } },
      series: [{ data: [24, 20, 22, 19, 21, 18] }],
      colors: ["#f59e0b"],
      stroke: { curve: "smooth", width: 2 },
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

  // MFA Radial / Donut Chart
  const mfaChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "donut", height: 160 },
      series: [2168, 268],
      labels: ["MFA Enforced", "Standard Login"],
      colors: ["#10b981", "#e2e8f0"],
      stroke: { width: 0 },
      dataLabels: { enabled: false },
      legend: { show: false },
      plotOptions: {
        pie: {
          donut: {
            size: "75%",
            labels: {
              show: true,
              total: { show: true, label: "MFA Active", fontSize: "11px", color: "#64748B", formatter: () => "89%" },
            },
          },
        },
      },
    }),
    []
  );

  // Login Activity Area Chart
  const loginActivityOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "area", height: 180, toolbar: { show: false } },
      series: [{ name: "Active Logins", data: [450, 720, 1150, 1850, 2140, 1680, 1420, 890, 520, 310] }],
      xaxis: {
        categories: ["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM"],
        labels: { style: { colors: "#94A3B8", fontSize: "10px" } },
      },
      yaxis: { labels: { style: { colors: "#94A3B8", fontSize: "10px" } } },
      colors: ["#0d6efd"],
      stroke: { curve: "smooth", width: 2 },
      fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05 } },
      grid: { borderColor: "#E2E8F0", strokeDashArray: 3 },
      dataLabels: { enabled: false },
    }),
    []
  );

  // HRMS Usage Trend
  const usageTrendOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "line", height: 160, toolbar: { show: false } },
      series: [
        { name: "Web App Traffic", data: [65, 82, 95, 88, 92, 104, 98] },
        { name: "Mobile App Traffic", data: [42, 50, 68, 62, 70, 75, 71] },
      ],
      xaxis: {
        categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        labels: { style: { colors: "#94A3B8", fontSize: "10px" } },
      },
      yaxis: { labels: { style: { colors: "#94A3B8", fontSize: "10px" } } },
      colors: ["#0d6efd", "#10b981"],
      stroke: { curve: "smooth", width: 2 },
      grid: { borderColor: "#E2E8F0", strokeDashArray: 3 },
      dataLabels: { enabled: false },
      legend: { position: "top", horizontalAlign: "right" },
    }),
    []
  );

  // Integration Errors Bar Chart
  const integrationErrorOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "bar", height: 160, toolbar: { show: false } },
      series: [{ name: "API Sync Errors", data: [2, 0, 1, 0, 3, 1, 0] }],
      xaxis: {
        categories: ["Biometrics", "Slack Webhook", "Stripe API", "AWS S3", "SendGrid", "Okta SSO", "Google WS"],
        labels: { style: { colors: "#94A3B8", fontSize: "9px" } },
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
    <div className="w-full min-w-0 space-y-6">
      {/* ── Page Header ── */}
      <PageHeader
        title="IT Admin Dashboard"
        description="Comprehensive real-time infrastructure telemetry, security compliance, user sessions, and service operations."
        actions={
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 p-1.5 border border-border rounded-lg bg-card text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
                <span className="size-2 rounded-full bg-emerald-600 animate-pulse"></span> 248 Active Users
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="flex items-center gap-1.5 font-semibold text-rose-600">
                <i className="ph-bold ph-shield-warning"></i> 3 Security Alerts
              </span>
            </div>

            <div className="flex items-center bg-muted rounded-lg p-0.5 border border-border">
              {(["production", "staging", "dev"] as const).map((env) => (
                <button
                  key={env}
                  type="button"
                  onClick={() => {
                    setActiveEnv(env);
                    toast.info(`Switched environment view to ${env.toUpperCase()}`);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors ${
                    activeEnv === env ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {env}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* ── Row 1: 4 System Health Metrics with Sparklines ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* System Uptime */}
        <Card className="p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs text-muted-foreground mb-1">HRMS System Uptime</p>
            <h3 className="text-2xl font-bold text-foreground">99.9%</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Last 30 days rolling</p>
          </div>
          <div>
            {isMounted && (
              <Suspense fallback={<div className="h-10 w-20"></div>}>
                <Chart options={uptimeSparkline} series={uptimeSparkline.series} type="area" height={40} width={80} />
              </Suspense>
            )}
          </div>
        </Card>

        {/* API Status */}
        <Card className="p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs text-muted-foreground mb-1">API Cluster Status</p>
            <h3 className="text-2xl font-bold text-emerald-600">Healthy</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">All 14 endpoints live</p>
          </div>
          <div>
            {isMounted && (
              <Suspense fallback={<div className="h-10 w-20"></div>}>
                <Chart options={apiSparkline} series={apiSparkline.series} type="bar" height={40} width={80} />
              </Suspense>
            )}
          </div>
        </Card>

        {/* Open IT Tickets */}
        <Card className="p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Open IT Tickets</p>
            <h3 className="text-2xl font-bold text-foreground">18</h3>
            <p className="text-[11px] text-rose-600 font-semibold mt-0.5">5 high priority</p>
          </div>
          <div>
            {isMounted && (
              <Suspense fallback={<div className="h-10 w-20"></div>}>
                <Chart options={ticketsSparkline} series={ticketsSparkline.series} type="line" height={40} width={80} />
              </Suspense>
            )}
          </div>
        </Card>

        {/* Background Jobs */}
        <Card className="p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Background Jobs</p>
            <h3 className="text-2xl font-bold text-purple-600">Running</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">12/12 workers active</p>
          </div>
          <div>
            {isMounted && (
              <Suspense fallback={<div className="h-10 w-20"></div>}>
                <Chart options={jobsSparkline} series={jobsSparkline.series} type="area" height={40} width={80} />
              </Suspense>
            )}
          </div>
        </Card>
      </div>

      {/* ── Row 2: Storage Usage by Module (8 cols) & MFA + Quick Actions (4 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Storage Usage by Module */}
        <Card className="p-5 lg:col-span-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="border-l-2 border-primary pl-2.5">
                <h3 className="text-base font-bold text-foreground">Storage Usage by Module (GB)</h3>
                <p className="text-xs text-muted-foreground">Database tables, uploaded media attachments, and biometric logs</p>
              </div>
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
                {(["1D", "7D", "1M", "1Y"] as const).map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setStorageDay(range)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                      storageDay === range ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-border/50 mt-4">
              {[
                { name: "Core HR", uptime: "99.9%", ok: true },
                { name: "Payroll Engine", uptime: "96.9%", ok: true },
                { name: "Attendance Sync", uptime: "99.9%", ok: true },
                { name: "Recruitment Module", uptime: "19.9% Downtime", ok: false },
                { name: "Leave Management", uptime: "91.9%", ok: true },
                { name: "Document Storage", uptime: "95.9%", ok: true },
              ].map((m, idx) => (
                <div key={idx} className="p-2.5 rounded-lg border border-border/50 bg-muted/20 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-muted-foreground">{m.name}</p>
                    <p className="text-xs font-bold text-foreground">{m.uptime}</p>
                  </div>
                  <i className={`ph-fill ${m.ok ? "ph-check-circle text-emerald-600" : "ph-warning text-rose-600"} text-base`}></i>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* MFA Enabled Users & Quick IT Actions (4 cols) */}
        <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
          {/* MFA Card */}
          <Card className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="border-l-2 border-primary pl-2.5">
                <h3 className="text-sm font-bold text-foreground">MFA Enabled Users</h3>
                <p className="text-xs text-muted-foreground">Security authentication posture</p>
              </div>
              <Badge variant="soft" className="bg-emerald-500/10 text-emerald-600">89%</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2">2,168 out of 2,436 active accounts enforced</p>
            <div className="py-1">
              {isMounted && (
                <Suspense fallback={<div className="h-36"></div>}>
                  <Chart options={mfaChartOptions} series={mfaChartOptions.series} type="donut" height={160} />
                </Suspense>
              )}
            </div>
          </Card>

          {/* Quick IT Actions */}
          <Card className="p-4">
            <div className="border-l-2 border-primary pl-2.5 mb-3">
              <h3 className="text-sm font-bold text-foreground">Quick IT Actions</h3>
              <p className="text-xs text-muted-foreground">One-click operational triggers</p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { title: "Restart Services", icon: "ph-arrow-clockwise", action: () => toast.success("Restarting HRMS container services...") },
                { title: "Sync Biometric", icon: "ph-fingerprint", action: () => toast.success("Biometric hardware sync triggered!") },
                { title: "Clear Cache", icon: "ph-trash", action: () => toast.success("Redis & application cache purged!") },
                { title: "Maintenance", icon: "ph-wrench", action: () => toast.info("Opening maintenance window scheduler...") },
                { title: "Stop Jobs", icon: "ph-stop-circle", action: () => toast.error("Background workers paused.") },
                { title: "Re-run Payroll", icon: "ph-play", action: () => toast.success("Dispatched payroll batch job retry.") },
              ].map((act, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={act.action}
                  className="p-2.5 rounded-lg bg-muted/40 hover:bg-muted border border-border/50 text-foreground transition-colors flex flex-col items-center justify-center gap-1 cursor-pointer"
                >
                  <div className="size-8 rounded-full bg-card border border-border flex items-center justify-center text-primary text-base">
                    <i className={`ph ${act.icon}`}></i>
                  </div>
                  <span className="text-[10px] font-semibold leading-tight">{act.title}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Row 3: User Access & Peak Hours ── */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="border-l-2 border-primary pl-2.5">
            <h3 className="text-base font-bold text-foreground">User Access & Peak Hourly Load</h3>
            <p className="text-xs text-muted-foreground">Real-time concurrency utilization throughout the day</p>
          </div>
          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-primary"></span> Low (0-50%)</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-600"></span> Medium (50-70%)</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-amber-500"></span> High (70-90%)</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-rose-600"></span> Peak (90-100%)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 mb-4">
          {[
            { hour: "9 AM", load: 85, color: "bg-amber-500" },
            { hour: "10 AM", load: 92, color: "bg-rose-600" },
            { hour: "11 AM", load: 78, color: "bg-amber-500" },
            { hour: "12 PM", load: 45, color: "bg-primary" },
            { hour: "1 PM", load: 38, color: "bg-primary" },
            { hour: "2 PM", load: 68, color: "bg-emerald-600" },
            { hour: "3 PM", load: 82, color: "bg-amber-500" },
            { hour: "4 PM", load: 85, color: "bg-amber-500" },
            { hour: "5 PM", load: 88, color: "bg-amber-500" },
            { hour: "6 PM", load: 52, color: "bg-emerald-600" },
          ].map((item, idx) => (
            <div key={idx} className="p-2.5 bg-muted/40 rounded-lg border border-border/50 text-center">
              <p className="text-[11px] text-muted-foreground mb-1">{item.hour}</p>
              <h5 className="text-sm font-bold text-foreground mb-1">{item.load}%</h5>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.load}%` }}></div>
              </div>
            </div>
          ))}
        </div>

        <div>
          <h4 className="text-xs font-bold text-foreground mb-2">Hourly Login Count Analysis</h4>
          {isMounted && (
            <Suspense fallback={<div className="h-44 flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
              <Chart options={loginActivityOptions} series={loginActivityOptions.series} type="area" height={180} />
            </Suspense>
          )}
        </div>
      </Card>

      {/* ── Row 4: Usage Trend, Security & Compliance, User Roles, Integration Errors ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        {/* HRMS Usage Trend & Security (5 cols) */}
        <Card className="p-5 lg:col-span-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="border-l-2 border-primary pl-2.5 mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">HRMS Usage Trend</h3>
                <p className="text-xs text-muted-foreground">Web Portal vs Mobile App traffic</p>
              </div>
              <span className="text-[11px] text-muted-foreground">Rolling 7 Days</span>
            </div>
            {isMounted && (
              <Suspense fallback={<div className="h-36"></div>}>
                <Chart options={usageTrendOptions} series={usageTrendOptions.series} type="line" height={160} />
              </Suspense>
            )}
          </div>

          <div className="pt-3 border-t border-border/50 space-y-2">
            <h4 className="text-xs font-bold text-foreground">Security & Compliance Log (24h)</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-muted/40 rounded-lg border border-border/50">
                <h5 className="text-lg font-bold text-foreground">47</h5>
                <p className="text-[10px] text-muted-foreground">Failed Logins</p>
              </div>
              <div className="p-2 bg-muted/40 rounded-lg border border-border/50">
                <h5 className="text-lg font-bold text-amber-500">12</h5>
                <p className="text-[10px] text-muted-foreground">Suspicious Alerts</p>
              </div>
              <div className="p-2 bg-muted/40 rounded-lg border border-border/50">
                <h5 className="text-lg font-bold text-rose-600">27</h5>
                <p className="text-[10px] text-muted-foreground">Blocked IPs</p>
              </div>
            </div>
          </div>
        </Card>

        {/* User Roles & Integration Errors (7 cols) */}
        <Card className="p-5 lg:col-span-7 flex flex-col justify-between space-y-4">
          <div>
            <div className="border-l-2 border-primary pl-2.5 mb-3">
              <h3 className="text-sm font-bold text-foreground">User Roles Distribution</h3>
              <p className="text-xs text-muted-foreground">Access tier assignments across workforce</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { role: "Employees", count: 2145, pct: "88%", color: "bg-blue-600" },
                { role: "Managers", count: 234, pct: "9.6%", color: "bg-indigo-600" },
                { role: "HR Operations", count: 45, pct: "1.8%", color: "bg-slate-700" },
                { role: "Admins", count: 12, pct: "0.5%", color: "bg-amber-500" },
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-muted/40 rounded-lg border border-border/50">
                  <p className="text-[11px] text-muted-foreground">{item.role}</p>
                  <h4 className="text-xl font-bold text-foreground my-1">{item.count}</h4>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: item.pct }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-border/50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-foreground">Integration Error Counts (24h)</h4>
              <Badge variant="soft" className="bg-emerald-500/10 text-emerald-600 text-[10px]">Healthy SLA</Badge>
            </div>
            {isMounted && (
              <Suspense fallback={<div className="h-36"></div>}>
                <Chart options={integrationErrorOptions} series={integrationErrorOptions.series} type="bar" height={160} />
              </Suspense>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
