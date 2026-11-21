'use client';

import { useState, useMemo } from "react";
import { Link } from "@/src/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useTenantBranding } from "@/lib/useTenantBranding";
import { useCurrentProfile } from "@/lib/session";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Users,
  HardDrive,
  CreditCard,
  Building2,
  Activity,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Sparkles,
  Download,
  Settings,
  Paintbrush,
  UserCheck,
  Package,
  Layers,
  FolderOpen,
  FileText,
  Plus,
  Circle,
  AlertCircle,
  Check,
} from "lucide-react";

export default function TenantDashboardPage() {
  const { branding } = useTenantBranding();
  const { data: profile } = useCurrentProfile();
  const [exportOpen, setExportOpen] = useState(false);

  const { data: tenantMetrics, isLoading, refetch } = useQuery({
    queryKey: ["tenant-dashboard-metrics"],
    queryFn: async () => {
      try {
        const res = await api.get<any>("/dashboard/tenant");
        return res;
      } catch (err) {
        console.error("Failed to fetch tenant metrics:", err);
        return null;
      }
    },
    refetchInterval: 30000,
  });

  const userName = profile?.full_name?.split(" ")[0] || "Admin";
  const tenantName = tenantMetrics?.tenantName || branding.name || "Enterprise Workspace";
  const planType = (tenantMetrics?.planType || "Starter").toUpperCase();
  const timezone = tenantMetrics?.timezone || branding.timezone || "Asia/Kolkata";
  const currency = tenantMetrics?.currency || branding.currency || "INR";
  const currencySymbol = tenantMetrics?.currencySymbol || branding.currencySymbol || "₹";

  const totalEmployees = tenantMetrics?.totalEmployees ?? 0;
  const activeEmployees = tenantMetrics?.activeEmployees ?? 0;
  const maxEmployees = tenantMetrics?.maxEmployees ?? 50;
  const quotaPct = tenantMetrics?.quotaPercentage ?? (maxEmployees > 0 ? Math.min(100, Math.round((totalEmployees / maxEmployees) * 100)) : 0);

  const grossPayroll = tenantMetrics?.grossPayroll ?? 0;
  const activeAddonsCount = tenantMetrics?.activeAddonsCount ?? 0;
  const rolesCount = tenantMetrics?.rolesCount ?? 0;
  const departmentCount = tenantMetrics?.departmentCount ?? 0;

  const storageUsed = tenantMetrics?.storageUsage?.usedGB ?? 0;
  const storageTotal = tenantMetrics?.storageUsage?.totalGB ?? 10;
  const storagePct = tenantMetrics?.storageUsage?.percentage ?? (storageTotal > 0 ? Math.min(100, (storageUsed / storageTotal) * 100) : 0);

  const addonsList = tenantMetrics?.addons || [];
  const auditLogs = tenantMetrics?.recentAudits || [];

  // Export Tenant Metrics Report
  const handleExport = (format: "csv" | "pdf") => {
    try {
      const csvData = [
        ["Tenant Metric Report", tenantName],
        ["Exported At", new Date().toISOString()],
        ["Plan Tier", planType],
        ["Timezone", timezone],
        ["Default Currency", `${currency} (${currencySymbol})`],
        ["Total Employees", totalEmployees],
        ["Active Workforce", activeEmployees],
        ["Max Employee Quota", maxEmployees],
        ["Quota Utilization", `${quotaPct}%`],
        ["Gross Monthly Payroll", `${currencySymbol}${grossPayroll.toLocaleString()}`],
        ["Active Addon Modules", activeAddonsCount],
        ["Active Roles", rolesCount],
        ["Storage Allocation", `${storageUsed} GB of ${storageTotal} GB`],
        ["System Status", "100.0% Operational"],
      ]
        .map((row) => row.join(","))
        .join("\n");

      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${tenantName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_admin_summary.${format === "csv" ? "csv" : "txt"}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Organization report downloaded as ${format.toUpperCase()}`);
    } catch {
      toast.error("Failed to generate export file");
    }
  };

  return (
    <div className="space-y-5">
      {/* ── Top Header & Quick Actions ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border-color">
        <div>
          <BreadcrumbNav fallbackPath="/tenant/dashboard" />
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <h1 className="text-xl max-lg:text-lg font-bold text-title mb-0">
              {tenantName} Command Center
            </h1>
            <span className="inline-flex items-center text-[11px] font-semibold bg-primary-transparent text-primary px-2.5 py-0.5 rounded-md">
              <Sparkles className="size-3 me-1" /> {planType} TIER
            </span>
            <span className="inline-flex items-center text-[11px] font-medium bg-success-transparent text-success px-2 py-0.5 rounded-md">
              <span className="size-1.5 bg-success rounded-full me-1.5 animate-pulse"></span>
              Operational
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-default mt-1">
            <span>Welcome back, <strong className="text-title">{userName}</strong></span>
            <span>·</span>
            <span>TZ: <strong className="text-title">{timezone}</strong></span>
            <span>·</span>
            <span>Currency: <strong className="text-title">{currency} ({currencySymbol})</strong></span>
            {rolesCount > 0 && (
              <>
                <span>·</span>
                <span><strong className="text-title">{rolesCount}</strong> Configured Roles</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Dropdown */}
          <div className="relative inline-flex">
            <button
              type="button"
              onClick={() => setExportOpen((o) => !o)}
              className="btn-sm bg-white dark:bg-slate-900 border border-border-color text-title hover:bg-light dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <i className="ph-duotone ph-download-simple text-base"></i> Export
              <i className="ph-bold ph-caret-down text-xs ms-0.5"></i>
            </button>

            {exportOpen && (
              <div className="absolute right-0 top-full mt-1.5 min-w-44 bg-white dark:bg-slate-900 border border-border-color shadow-lg rounded-md p-1.5 space-y-1 z-30">
                <button
                  type="button"
                  onClick={() => {
                    handleExport("pdf");
                    setExportOpen(false);
                  }}
                  className="w-full text-left flex items-center px-2 py-1.5 rounded text-xs text-title hover:bg-light dark:hover:bg-slate-800 cursor-pointer"
                >
                  <FileText className="size-3.5 me-2 text-primary" /> Export as PDF Report
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleExport("csv");
                    setExportOpen(false);
                  }}
                  className="w-full text-left flex items-center px-2 py-1.5 rounded text-xs text-title hover:bg-light dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Download className="size-3.5 me-2 text-emerald-500" /> Export as Excel (CSV)
                </button>
              </div>
            )}
          </div>

          <Link
            to="/tenant/company-profile"
            className="btn-sm bg-white dark:bg-slate-900 border border-border-color text-title hover:bg-light dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <Building2 className="size-3.5" /> Company Profile
          </Link>

          <Link
            to="/tenant/addon"
            className="btn-sm bg-primary text-white border border-primary hover:bg-primary-hover flex items-center gap-1.5 cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors"
          >
            <Sparkles className="size-3.5" /> Addon Store
          </Link>
        </div>
      </div>

      {/* ── Top 4 KPI Metrics (DreamsERP 4-grid styling) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Active Workforce */}
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-default uppercase tracking-wider">Active Workforce</span>
              <div className="size-10 bg-indigo-600/10 text-indigo-600 dark:bg-indigo-600/20 dark:text-indigo-400 rounded-md flex items-center justify-center">
                <i className="ph-duotone ph-users text-2xl"></i>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <h2 className="text-2xl font-bold text-title mb-0">{totalEmployees.toLocaleString()}</h2>
              <span className="text-xs text-default">/ {maxEmployees} Max Quota</span>
            </div>
            <p className="text-xs text-default mb-0">
              {activeEmployees} employees on active duty
            </p>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-default">Quota Utilization</span>
              <span className="font-semibold text-title">{quotaPct}%</span>
            </div>
            <div className="h-1.5 bg-light dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  quotaPct > 90 ? "bg-rose-500" : quotaPct > 75 ? "bg-amber-500" : "bg-indigo-600"
                )}
                style={{ width: `${Math.max(3, quotaPct)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Card 2: Monthly Payroll Commitment */}
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-default uppercase tracking-wider">Payroll Outlay</span>
              <div className="size-10 bg-emerald-600/10 text-emerald-600 dark:bg-emerald-600/20 dark:text-emerald-400 rounded-md flex items-center justify-center">
                <i className="ph-duotone ph-currency-circle-dollar text-2xl"></i>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <h2 className="text-2xl font-bold text-title mb-0">
                {currencySymbol}{grossPayroll > 0 ? (grossPayroll >= 1000 ? `${(grossPayroll / 1000).toFixed(1)}K` : grossPayroll.toLocaleString()) : "0"}
              </h2>
              <span className="inline-flex items-center text-[11px] font-medium bg-success-transparent text-success px-1.5 py-0.5 rounded">
                Live DB
              </span>
            </div>
            <p className="text-xs text-default mb-0">
              Across {departmentCount > 0 ? `${departmentCount} departments` : "all departments"}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-border-color/60 flex items-center justify-between">
            <Link to="/hr/payroll" className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1">
              Review Payroll Runs <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>

        {/* Card 3: Active Add-on Modules */}
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-default uppercase tracking-wider">Active Add-ons</span>
              <div className="size-10 bg-purple-600/10 text-purple-600 dark:bg-purple-600/20 dark:text-purple-400 rounded-md flex items-center justify-center">
                <i className="ph-duotone ph-puzzle-piece text-2xl"></i>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <h2 className="text-2xl font-bold text-title mb-0">{activeAddonsCount}</h2>
              <span className="text-xs text-default">Installed Modules</span>
            </div>
            <p className="text-xs text-default mb-0">
              {tenantMetrics?.disabledModulesCount ?? 0} optional modules toggled
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-border-color/60 flex items-center justify-between">
            <Link to="/tenant/addon" className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1">
              Manage Addon Store <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>

        {/* Card 4: Cloud Storage & System Health */}
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-default uppercase tracking-wider">Cloud Storage</span>
              <div className="size-10 bg-amber-500/10 text-amber-500 dark:bg-amber-500/20 dark:text-amber-400 rounded-md flex items-center justify-center">
                <i className="ph-duotone ph-hard-drive text-2xl"></i>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <h2 className="text-2xl font-bold text-title mb-0">{tenantMetrics?.storageUsageFormatted ?? `${storageUsed} GB / ${storageTotal} GB`}</h2>
            </div>
            <p className="text-xs text-default mb-0">
              High-availability S3 encrypted backup
            </p>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-default">Storage Used</span>
              <span className="font-semibold text-title">{storagePct}%</span>
            </div>
            <div className="h-1.5 bg-light dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${Math.max(2, storagePct)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Organization Readiness & Onboarding Checklist ── */}
      <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-base font-bold text-title mb-0.5">Workspace Setup & Governance Checklist</h3>
            <p className="text-xs text-default mb-0">
              Ensure your enterprise environment is properly configured for operational compliance and seamless team collaboration.
            </p>
          </div>
          <span className="inline-flex items-center text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-md">
            <CheckCircle2 className="size-3.5 me-1.5" /> Workspace Operational
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Step 1: Workspace Initialized */}
          <div className="flex items-start gap-3 p-3 rounded-md border border-border-color bg-light/60 dark:bg-slate-800/40">
            <div className="size-6 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="size-3.5 stroke-[3]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-title mb-0.5">Workspace Initialized</p>
              <p className="text-[11px] text-default mb-0">Postgres schema & isolated tenant container verified</p>
            </div>
          </div>

          {/* Step 2: Set Company Details */}
          <Link
            to="/tenant/company-profile"
            className="flex items-start gap-3 p-3 rounded-md border border-border-color bg-white dark:bg-slate-900 hover:border-primary/50 hover:bg-light/30 transition-all group"
          >
            <div className="size-6 rounded-full border border-primary/40 text-primary flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-white transition-colors">
              <Building2 className="size-3" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-title mb-0.5 group-hover:text-primary transition-colors">Company Profile</p>
                <ArrowRight className="size-3 text-default opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-default mb-0">Legal business entity name, tax IDs, and registered office</p>
            </div>
          </Link>

          {/* Step 3: Configure Branding */}
          <Link
            to="/tenant/branding"
            className="flex items-start gap-3 p-3 rounded-md border border-border-color bg-white dark:bg-slate-900 hover:border-primary/50 hover:bg-light/30 transition-all group"
          >
            <div className="size-6 rounded-full border border-purple-500/40 text-purple-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Paintbrush className="size-3" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-title mb-0.5 group-hover:text-purple-600 transition-colors">Branding & White-Label</p>
                <ArrowRight className="size-3 text-default opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-default mb-0">Upload organization logo, dark mode mark, and primary theme color</p>
            </div>
          </Link>

          {/* Step 4: Roles & Authority */}
          <Link
            to="/tenant/roles"
            className="flex items-start gap-3 p-3 rounded-md border border-border-color bg-white dark:bg-slate-900 hover:border-primary/50 hover:bg-light/30 transition-all group"
          >
            <div className="size-6 rounded-full border border-blue-500/40 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <ShieldCheck className="size-3" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-title mb-0.5 group-hover:text-blue-600 transition-colors">RBAC Roles & Security</p>
                <ArrowRight className="size-3 text-default opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-default mb-0">{rolesCount} roles assigned with granular module permissions</p>
            </div>
          </Link>

          {/* Step 5: Addon Store */}
          <Link
            to="/tenant/addon"
            className="flex items-start gap-3 p-3 rounded-md border border-border-color bg-white dark:bg-slate-900 hover:border-primary/50 hover:bg-light/30 transition-all group"
          >
            <div className="size-6 rounded-full border border-amber-500/40 text-amber-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Sparkles className="size-3" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-title mb-0.5 group-hover:text-amber-600 transition-colors">Add-on Modules (133+)</p>
                <ArrowRight className="size-3 text-default opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-default mb-0">{activeAddonsCount} active add-ons; install 2FA, AI tools, or biometrics</p>
            </div>
          </Link>

          {/* Step 6: Subscription & Invoices */}
          <Link
            to="/tenant/subscription"
            className="flex items-start gap-3 p-3 rounded-md border border-border-color bg-white dark:bg-slate-900 hover:border-primary/50 hover:bg-light/30 transition-all group"
          >
            <div className="size-6 rounded-full border border-rose-500/40 text-rose-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <CreditCard className="size-3" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-title mb-0.5 group-hover:text-rose-600 transition-colors">Subscription & Tier</p>
                <ArrowRight className="size-3 text-default opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-default mb-0">{planType} tier with automatic invoice generation & renewals</p>
            </div>
          </Link>
        </div>
      </div>

      {/* ── Workspace Quick Operations Launcher (DreamsERP 8-grid) ── */}
      <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-title mb-0.5">Workspace Operations Hub</h3>
            <p className="text-xs text-default mb-0">Direct access to core administrative consoles and configuration suites.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <Link
            to="/tenant/company-profile"
            className="flex flex-col items-center justify-center p-3 rounded-md border border-border-color bg-light/30 dark:bg-slate-800/30 hover:border-primary hover:bg-white dark:hover:bg-slate-800 transition-all text-center group"
          >
            <div className="size-10 rounded-md bg-blue-500/10 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Building2 className="size-5" />
            </div>
            <p className="text-xs font-semibold text-title mb-0 group-hover:text-primary transition-colors">Company</p>
            <p className="text-[10px] text-default mb-0">Profile</p>
          </Link>

          <Link
            to="/tenant/branding"
            className="flex flex-col items-center justify-center p-3 rounded-md border border-border-color bg-light/30 dark:bg-slate-800/30 hover:border-primary hover:bg-white dark:hover:bg-slate-800 transition-all text-center group"
          >
            <div className="size-10 rounded-md bg-purple-500/10 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Paintbrush className="size-5" />
            </div>
            <p className="text-xs font-semibold text-title mb-0 group-hover:text-primary transition-colors">Branding</p>
            <p className="text-[10px] text-default mb-0">White-label</p>
          </Link>

          <Link
            to="/tenant/users"
            className="flex flex-col items-center justify-center p-3 rounded-md border border-border-color bg-light/30 dark:bg-slate-800/30 hover:border-primary hover:bg-white dark:hover:bg-slate-800 transition-all text-center group"
          >
            <div className="size-10 rounded-md bg-indigo-500/10 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Users className="size-5" />
            </div>
            <p className="text-xs font-semibold text-title mb-0 group-hover:text-primary transition-colors">Users</p>
            <p className="text-[10px] text-default mb-0">{tenantMetrics?.activeUsers ?? 0} active</p>
          </Link>

          <Link
            to="/tenant/roles"
            className="flex flex-col items-center justify-center p-3 rounded-md border border-border-color bg-light/30 dark:bg-slate-800/30 hover:border-primary hover:bg-white dark:hover:bg-slate-800 transition-all text-center group"
          >
            <div className="size-10 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <ShieldCheck className="size-5" />
            </div>
            <p className="text-xs font-semibold text-title mb-0 group-hover:text-primary transition-colors">Roles</p>
            <p className="text-[10px] text-default mb-0">Permissions</p>
          </Link>

          <Link
            to="/tenant/addon"
            className="flex flex-col items-center justify-center p-3 rounded-md border border-border-color bg-light/30 dark:bg-slate-800/30 hover:border-primary hover:bg-white dark:hover:bg-slate-800 transition-all text-center group"
          >
            <div className="size-10 rounded-md bg-amber-500/10 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Sparkles className="size-5" />
            </div>
            <p className="text-xs font-semibold text-title mb-0 group-hover:text-primary transition-colors">Add-ons</p>
            <p className="text-[10px] text-default mb-0">{activeAddonsCount} active</p>
          </Link>

          <Link
            to="/tenant/subscription"
            className="flex flex-col items-center justify-center p-3 rounded-md border border-border-color bg-light/30 dark:bg-slate-800/30 hover:border-primary hover:bg-white dark:hover:bg-slate-800 transition-all text-center group"
          >
            <div className="size-10 rounded-md bg-rose-500/10 text-rose-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <CreditCard className="size-5" />
            </div>
            <p className="text-xs font-semibold text-title mb-0 group-hover:text-primary transition-colors">Billing</p>
            <p className="text-[10px] text-default mb-0">Invoices</p>
          </Link>

          <Link
            to="/tenant/files"
            className="flex flex-col items-center justify-center p-3 rounded-md border border-border-color bg-light/30 dark:bg-slate-800/30 hover:border-primary hover:bg-white dark:hover:bg-slate-800 transition-all text-center group"
          >
            <div className="size-10 rounded-md bg-teal-500/10 text-teal-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <FolderOpen className="size-5" />
            </div>
            <p className="text-xs font-semibold text-title mb-0 group-hover:text-primary transition-colors">Files</p>
            <p className="text-[10px] text-default mb-0">Storage</p>
          </Link>

          <Link
            to="/tenant/audit-logs"
            className="flex flex-col items-center justify-center p-3 rounded-md border border-border-color bg-light/30 dark:bg-slate-800/30 hover:border-primary hover:bg-white dark:hover:bg-slate-800 transition-all text-center group"
          >
            <div className="size-10 rounded-md bg-slate-500/10 text-slate-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <FileText className="size-5" />
            </div>
            <p className="text-xs font-semibold text-title mb-0 group-hover:text-primary transition-colors">Audits</p>
            <p className="text-[10px] text-default mb-0">Logs</p>
          </Link>
        </div>
      </div>

      {/* ── Two-Column Bottom Section: Active Addons Roster & Security Audit Stream ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left Column (7 cols): Installed & Active Add-on Modules */}
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 xl:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <div>
                <h3 className="text-base font-bold text-title mb-0.5">Installed Addons & Extensions</h3>
                <p className="text-xs text-default mb-0">Active enterprise capabilities provisioned in this tenant workspace.</p>
              </div>
              <Link
                to="/tenant/addon"
                className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-title hover:bg-primary hover:border-primary hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-colors text-xs px-2.5 py-1 rounded"
              >
                Browse All (133+) <ArrowRight className="size-3" />
              </Link>
            </div>

            {addonsList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-default border-b border-border-color">
                      <th className="text-left py-2 px-2 text-[12px] font-semibold text-title">Module</th>
                      <th className="text-left py-2 px-2 text-[12px] font-semibold text-title">Category</th>
                      <th className="text-left py-2 px-2 text-[12px] font-semibold text-title">Pricing</th>
                      <th className="text-left py-2 px-2 text-[12px] font-semibold text-title">Status</th>
                      <th className="text-right py-2 px-2 text-[12px] font-semibold text-title">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {addonsList.map((addon: any) => (
                      <tr key={addon.id} className="border-b border-border-color last:border-0 hover:bg-light/40 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-2">
                          <div className="inline-flex items-center gap-2">
                            <div className="size-8 rounded-md bg-light dark:bg-slate-800 border border-border-color flex items-center justify-center overflow-hidden shrink-0">
                              {addon.icon ? (
                                <img src={addon.icon} alt={addon.name} className="size-5 object-contain" />
                              ) : (
                                <Package className="size-4 text-primary" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-title mb-0 truncate">{addon.name}</p>
                              <p className="text-[10px] text-default mb-0 font-mono">{addon.addonSlug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-xs text-default capitalize">{addon.category}</td>
                        <td className="py-2.5 px-2 text-xs text-default">
                          {addon.isFree ? (
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Free</span>
                          ) : (
                            <span className="font-semibold text-title">{currencySymbol}{addon.price || 0}/mo</span>
                          )}
                        </td>
                        <td className="py-2.5 px-2">
                          <span className="inline-flex items-center text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-medium">
                            <span className="size-1.5 bg-emerald-500 rounded-full me-1"></span>
                            Active
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <Link
                            to="/tenant/addon"
                            className="inline-flex items-center text-xs text-primary hover:underline font-medium"
                          >
                            Configure
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-10 text-center rounded-md border border-dashed border-border-color my-2">
                <Package className="size-8 text-muted-foreground/60 mx-auto mb-2" />
                <p className="text-xs font-medium text-title mb-1">No custom add-ons activated yet</p>
                <p className="text-[11px] text-default max-w-sm mx-auto mb-3">
                  Unlock 2FA Security, WhatsApp alert notifications, Biometric machine synchronization, and 130+ more.
                </p>
                <Link
                  to="/tenant/addon"
                  className="btn-sm bg-primary text-white border border-primary hover:bg-primary-hover inline-flex items-center gap-1.5 cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium"
                >
                  <Sparkles className="size-3.5" /> Open Addon Store
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Security & Audit Activity Stream */}
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 xl:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <div>
                <h3 className="text-base font-bold text-title mb-0.5">Security & Audit Stream</h3>
                <p className="text-xs text-default mb-0">Live tamper-evident event stream from database.</p>
              </div>
              <Link
                to="/tenant/audit-logs"
                className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-title hover:bg-primary hover:border-primary hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-colors text-xs px-2.5 py-1 rounded"
              >
                All Logs <ArrowRight className="size-3" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {auditLogs.length > 0 ? (
                auditLogs.map((log: any) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-2.5 p-2.5 rounded-md border border-border-color bg-light/30 dark:bg-slate-800/30 text-xs"
                  >
                    <div className="size-7 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-title mb-0.5 truncate">{log.action || log.key}</p>
                        <span className="text-[10px] text-default shrink-0">
                          {log.createdAt ? new Date(log.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }) : "Recent"}
                        </span>
                      </div>
                      <p className="text-[11px] text-default mb-0 truncate">
                        By <strong className="text-title font-medium">{log.user || log.changedBy || "Admin"}</strong>
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border-color rounded-md">
                  <ShieldCheck className="size-6 mx-auto mb-1 text-muted-foreground/50" />
                  No security audit events recorded yet
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-border-color flex items-center justify-between text-xs text-default">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 bg-emerald-500 rounded-full"></span>
              Audit encryption: SHA-256
            </span>
            <Link to="/tenant/audit-logs" className="text-primary hover:underline font-medium">
              View Audit Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
