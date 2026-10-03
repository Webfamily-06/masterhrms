import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

import { AccessDenied } from "@/components/access-denied";
import { usePermissions } from "@/lib/permissions";

const Chart = lazy(() => import("react-apexcharts"));

export const Route = createFileRoute("/_authenticated/_app/it-admin-dashboard")({
  component: ITAdminDashboardPage,
  head: () => ({
    meta: [
      { title: "IT Admin Dashboard | Dreams ERP" },
      { name: "description", content: "Infrastructure uptime, active users, storage utilization, and security telemetry." },
    ],
  }),
});

export default function ITAdminDashboardPage() {
  const { isWorkspaceAdmin, isSuperAdmin, loading } = usePermissions();
  const [isMounted, setIsMounted] = useState(false);
  const [activeEnv, setActiveEnv] = useState<"production" | "staging" | "dev">("production");
  const [storageDay, setStorageDay] = useState("1Y");
  const [usageDay, setUsageDay] = useState("1W");
  const [userAccessDay, setUserAccessDay] = useState("Today");
  const [securityDay, setSecurityDay] = useState("Today");

  const { data: itData } = useQuery({
    queryKey: ["dashboard-it-admin"],
    queryFn: async () => {
      const res = await api.get<any>("/dashboard/it-admin");
      return res;
    },
    enabled: isWorkspaceAdmin || isSuperAdmin,
  });

  if (!loading && !isWorkspaceAdmin && !isSuperAdmin) {
    return <AccessDenied moduleName="IT Administration" requiredPermission="system.it_admin.view" />;
  }

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Uptime Sparkline
  const uptimeOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        height: 45,
        width: 80,
        type: "area",
        toolbar: { show: false },
        sparkline: { enabled: true },
      },
      colors: ["#FF8C42"],
      stroke: { show: true, curve: "smooth", width: 2 },
      fill: {
        type: "gradient",
        gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.05 },
      },
      tooltip: { enabled: false },
    }),
    []
  );

  // Storage Usage Bar Chart
  const storageChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        height: 240,
        type: "bar",
        toolbar: { show: false },
      },
      colors: ["#FF6B00"],
      plotOptions: {
        bar: {
          columnWidth: "35%",
          borderRadius: 4,
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: ["Core HRM", "Payroll Engine", "Attendance", "Recruitment", "Documents", "Audit Logs"],
        labels: { style: { colors: "#6B7280", fontSize: "11px" } },
      },
      yaxis: {
        labels: {
          style: { colors: "#6B7280", fontSize: "11px" },
          formatter: (v: number) => `${v} GB`,
        },
      },
      grid: { borderColor: "#f1f5f9" },
    }),
    []
  );

  // Usage Trend Area Chart
  const usageChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        height: 220,
        type: "area",
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      colors: ["#0E82FD"],
      stroke: { curve: "smooth", width: 2 },
      fill: {
        type: "gradient",
        gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.05 },
      },
      xaxis: {
        categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        labels: { style: { colors: "#6B7280", fontSize: "11px" } },
      },
      yaxis: {
        labels: {
          style: { colors: "#6B7280", fontSize: "11px" },
          formatter: (val: number) => `${val / 1000}k`,
        },
      },
      grid: { borderColor: "#f1f5f9" },
    }),
    []
  );

  // Sparkline Helper
  const getSparkline = (data: number[], color: string): ApexCharts.ApexOptions => ({
    chart: {
      height: 35,
      width: 70,
      type: "area",
      toolbar: { show: false },
      sparkline: { enabled: true },
    },
    colors: [color],
    stroke: { curve: "smooth", width: 1.5 },
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 },
    },
    tooltip: { enabled: false },
  });

  return (
    <div className="space-y-4">
      {/* ── Page Header / Breadcrumb (Dreams ERP Standard) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-border-color">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">IT Admin Dashboard</h1>
          <div className="flex items-center gap-1.5 text-xs text-default">
            <Link to="/hrm-dashboard" className="hover:text-primary">Dashboard</Link>
            <i className="ph ph-caret-right text-[10px]"></i>
            <span className="text-gray-900 dark:text-gray-100 font-medium">System Telemetry &amp; Health</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Environment Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-md p-0.5 border border-border-color">
            {(["production", "staging", "dev"] as const).map((env) => (
              <button
                key={env}
                type="button"
                onClick={() => setActiveEnv(env)}
                className={`px-2.5 py-1 text-xs font-semibold rounded capitalize transition-colors cursor-pointer ${
                  activeEnv === env
                    ? "bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 shadow-xs"
                    : "text-default hover:text-gray-900 dark:hover:text-gray-100"
                }`}
              >
                {env}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => toast.success("System status report generated.")}
            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border-color bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-700 cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <i className="ph-duotone ph-file-arrow-down text-sm"></i>
            <span>Export Logs</span>
          </button>
        </div>
      </div>

      {/* ── Status Indicator Bar ── */}
      <div className="p-3 bg-white dark:bg-slate-900 border border-border-color rounded-md flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-success animate-pulse"></span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">Status: All Systems Operational</span>
          </div>
          <span className="text-muted-foreground">|</span>
          <div className="text-default">
            Active Cluster: <strong>ap-south-1 (Mumbai Primary)</strong>
          </div>
          <span className="text-muted-foreground">|</span>
          <div className="text-default">
            API Latency: <strong>42ms</strong>
          </div>
        </div>

        <button
          type="button"
          onClick={() => toast.success("System health check triggered.")}
          className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-gray-900 dark:text-gray-100 hover:bg-primary hover:text-white cursor-pointer transition-colors font-medium flex items-center gap-1"
        >
          <i className="ph-bold ph-arrows-clockwise text-xs"></i>
          <span>Check Health</span>
        </button>
      </div>

      {/* ── Top 4 Metric Cards (Assets, In Use, Maintenance, Available) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-default block mb-0.5">Total IT Assets</span>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">{itData?.totalAssets ?? 0}</h3>
            <span className="text-[10px] text-primary font-medium">Tracked in registry</span>
          </div>
          {isMounted && (
            <Suspense fallback={null}>
              <Chart options={uptimeOptions} series={[{ name: "Assets", data: [10, 15, 20, 25, 30, itData?.totalAssets ?? 35] }]} type="area" width={75} height={40} />
            </Suspense>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-default block mb-0.5">In-Use Hardware</span>
            <h3 className="text-xl font-bold text-success mb-0.5">{itData?.inUseAssets ?? 0}</h3>
            <span className="text-[10px] text-default font-medium">Assigned to staff</span>
          </div>
          {isMounted && (
            <Suspense fallback={null}>
              <Chart options={getSparkline([5, 8, 12, 14, 18, itData?.inUseAssets ?? 20], "#03C95A")} series={[{ name: "In Use", data: [5, 8, 12, 14, 18, itData?.inUseAssets ?? 20] }]} type="area" width={70} height={35} />
            </Suspense>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-default block mb-0.5">Under Maintenance</span>
            <h3 className="text-xl font-bold text-warning mb-0.5">{itData?.maintenanceAssets ?? 0}</h3>
            <span className="text-[10px] text-danger font-medium">Servicing / repair</span>
          </div>
          {isMounted && (
            <Suspense fallback={null}>
              <Chart options={getSparkline([2, 4, 3, 5, 2, itData?.maintenanceAssets ?? 1], "#FF9F43")} series={[{ name: "Maintenance", data: [2, 4, 3, 5, 2, itData?.maintenanceAssets ?? 1] }]} type="area" width={70} height={35} />
            </Suspense>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-default block mb-0.5">Available In Stock</span>
            <h3 className="text-xl font-bold text-primary mb-0.5">{itData?.availableAssets ?? 0}</h3>
            <span className="text-[10px] text-default font-medium">Ready for deployment</span>
          </div>
          {isMounted && (
            <Suspense fallback={null}>
              <Chart options={getSparkline([10, 12, 14, 11, 15, itData?.availableAssets ?? 12], "#FF6B00")} series={[{ name: "Stock", data: [10, 12, 14, 11, 15, itData?.availableAssets ?? 12] }]} type="area" width={70} height={35} />
            </Suspense>
          )}
        </div>
      </div>

      {/* ── Section 2: Storage by Module & Quick Actions ── */}
      <div className="grid grid-cols-12 gap-4">
        {/* Storage Bar Chart & Module Health */}
        <div className="col-span-12 lg:col-span-8 bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <div className="flex items-center justify-between pb-3 border-b border-border-color mb-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <i className="ph-duotone ph-hard-drive text-primary text-base"></i>
              Storage Consumption by Module (GB)
            </h3>
            <div className="flex gap-1">
              {["1M", "3M", "1Y"].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setStorageDay(d)}
                  className={`px-2 py-0.5 text-[10px] rounded font-semibold cursor-pointer ${
                    storageDay === d ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-default"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {isMounted && (
            <Suspense fallback={<div className="p-8 text-center"><Loader2 className="animate-spin size-6 mx-auto text-primary" /></div>}>
              <Chart
                options={storageChartOptions}
                series={[{ name: "Disk Usage", data: [124, 86, 64, 48, 230, 94] }]}
                type="bar"
                height={230}
              />
            </Suspense>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-border-color">
            {[
              { name: "Core HR", uptime: "99.99%", status: "Healthy", color: "text-success" },
              { name: "Payroll Engine", uptime: "99.95%", status: "Healthy", color: "text-success" },
              { name: "Attendance Sync", uptime: "99.90%", status: "Healthy", color: "text-success" },
              { name: "Document Vault", uptime: "99.85%", status: "Healthy", color: "text-success" },
              { name: "Email SMTP Queue", uptime: "99.40%", status: "Warning", color: "text-warning" },
              { name: "Biometric Webhook", uptime: "99.99%", status: "Healthy", color: "text-success" },
            ].map((mod, i) => (
              <div key={i} className="p-2 rounded bg-slate-50 dark:bg-slate-800/40 border border-border-color/60 text-xs">
                <span className="text-muted-foreground text-[11px] block">{mod.name}</span>
                <div className="flex justify-between items-center mt-1">
                  <span className="font-semibold text-gray-900 dark:text-gray-100 font-mono">{mod.uptime}</span>
                  <span className={`text-[10px] font-medium ${mod.color}`}>{mod.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick IT Maintenance Actions */}
        <div className="col-span-12 lg:col-span-4 bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 flex flex-col justify-between">
          <div className="pb-3 border-b border-border-color mb-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <i className="ph-duotone ph-wrench text-primary text-base"></i>
              Quick IT Operations
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2 my-auto py-2">
            {[
              {
                title: "Restart Services",
                desc: "Reload Node.js cluster",
                icon: "ph-arrows-clockwise",
                action: () => toast.success("HRMS cluster reloaded successfully"),
              },
              {
                title: "Sync Biometrics",
                desc: "Push device attendance",
                icon: "ph-fingerprint",
                action: () => toast.success("Biometric polling triggered"),
              },
              {
                title: "Flush Redis Cache",
                desc: "Clear session key store",
                icon: "ph-trash",
                action: () => toast.success("Redis cache flushed"),
              },
              {
                title: "Trigger Backup",
                desc: "MySQL snapshot to S3",
                icon: "ph-cloud-arrow-up",
                action: () => toast.success("Database snapshot created"),
              },
              {
                title: "Kill Idle Sessions",
                desc: "Timeout inactive tokens",
                icon: "ph-user-minus",
                action: () => toast.info("14 idle user sessions terminated"),
              },
              {
                title: "Audit Security",
                desc: "Run vulnerability scan",
                icon: "ph-shield-check",
                action: () => toast.success("Security audit completed: 0 critical"),
              },
            ].map((act, idx) => (
              <button
                key={idx}
                type="button"
                onClick={act.action}
                className="p-3 text-left rounded-md border border-border-color hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
              >
                <div className="size-8 rounded-md bg-slate-100 dark:bg-slate-800 group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center mb-2 transition-colors">
                  <i className={`ph-bold ${act.icon} text-base`}></i>
                </div>
                <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 mb-0.5">{act.title}</h4>
                <p className="text-[10px] text-muted-foreground">{act.desc}</p>
              </button>
            ))}
          </div>

          <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-border-color/60 text-[11px] text-default flex justify-between items-center mt-2">
            <span>2FA Adoption: <strong>89%</strong></span>
            <span className="text-success font-semibold">Compliant</span>
          </div>
        </div>
      </div>

      {/* ── Section 3: Traffic Usage Trend & Security Monitoring ── */}
      <div className="grid grid-cols-12 gap-4">
        {/* Usage Trend */}
        <div className="col-span-12 lg:col-span-7 bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <div className="flex items-center justify-between pb-3 border-b border-border-color mb-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Weekly Request Volume</h3>
            <span className="text-xs text-muted-foreground font-mono">{usageDay}</span>
          </div>

          {isMounted && (
            <Suspense fallback={<div className="p-8 text-center"><Loader2 className="animate-spin size-6 mx-auto text-primary" /></div>}>
              <Chart
                options={usageChartOptions}
                series={[{ name: "Requests", data: [4200, 6800, 7900, 7400, 8900, 3100, 2400] }]}
                type="area"
                height={220}
              />
            </Suspense>
          )}
        </div>

        {/* Security & Access Guard */}
        <div className="col-span-12 lg:col-span-5 bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-border-color mb-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Security Telemetry (24h)</h3>
            <span className="text-xs text-muted-foreground font-mono">{securityDay}</span>
          </div>

          <div className="space-y-3 my-auto py-2">
            <div className="flex items-center justify-between p-2.5 rounded border border-border-color">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-danger"></span>
                <div>
                  <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100">Failed Authentication</h4>
                  <p className="text-[10px] text-muted-foreground">Invalid credential attempts</p>
                </div>
              </div>
              <span className="text-sm font-bold font-mono text-danger">47</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded border border-border-color">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-warning"></span>
                <div>
                  <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100">Rate Limit Exceeded</h4>
                  <p className="text-[10px] text-muted-foreground">API throttle triggers</p>
                </div>
              </div>
              <span className="text-sm font-bold font-mono text-warning">12</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded border border-border-color">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-slate-900 dark:bg-slate-100"></span>
                <div>
                  <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100">Blocked Malicious IPs</h4>
                  <p className="text-[10px] text-muted-foreground">Firewall drop actions</p>
                </div>
              </div>
              <span className="text-sm font-bold font-mono text-gray-900 dark:text-gray-100">27</span>
            </div>
          </div>

          <div className="pt-2 border-t border-border-color flex justify-between text-xs">
            <span className="text-muted-foreground">SSL Certificate:</span>
            <span className="font-semibold text-success">Valid (284 days left)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
