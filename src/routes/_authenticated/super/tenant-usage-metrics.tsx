import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Search,
  Calendar,
  FileSpreadsheet,
  ChevronDown,
  Eye,
  RefreshCw,
  X,
  HardDrive,
  Users,
  Bell,
  Layers,
  Clock,
  Loader2,
  LayoutList,
  LayoutGrid,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Database,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  FileCode,
  CalendarDays,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/super/tenant-usage-metrics")({
  component: TenantUsageMetricsPage,
});

export type TenantUsageRecord = {
  id: string;
  name: string;
  slug: string;
  domainUrl: string;
  logoUrl: string | null;
  plan: string;
  billingCycle: string;
  activeUsers: number;
  totalUsers: number;
  totalEmployees: number;
  maxUsers: number | null;
  userUsagePercentage: number | null;
  storageUsedBytes: number;
  storageLimitBytes: number | null;
  storageUsedFormatted: string;
  storageLimitFormatted: string;
  storageLimitGb: number | null;
  storagePercentage: number | null;
  mostModuleUsage: string[];
  totalActivityScore: number;
  status: "Active" | "Suspended" | "Expired";
  lastLoginAt: string | null;
  lastActivityAt: string;
  createdAt: string;
};

export type TenantUsageDetailResponse = {
  profile: {
    id: string;
    name: string;
    slug: string;
    domainUrl: string;
    logoUrl: string | null;
    plan: string;
    billingCycle: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  storage: {
    totalUsedBytes: number;
    totalUsedFormatted: string;
    totalLimitBytes: number | null;
    totalLimitFormatted: string;
    remainingBytes: number | null;
    remainingFormatted: string;
    storagePercentage: number | null;
    categories: {
      database: { bytes: number; formatted: string };
      images: { bytes: number; formatted: string };
      documents: { bytes: number; formatted: string };
      videos: { bytes: number; formatted: string };
      audio: { bytes: number; formatted: string };
      other: { bytes: number; formatted: string };
    };
  };
  userActivity: {
    activeUsers: number;
    totalUsers: number;
    activeEmployees: number;
    totalEmployees: number;
    totalLogins: number;
    lastLoginAt: string | null;
    averageSessionDuration: string | null;
    peakUsageTime: string | null;
    reportingPeriod: string;
  };
  moduleUsage: {
    reportingPeriod: string;
    records: Array<{ name: string; key: string; actionCount: number }>;
  };
  notifications: {
    emailsSent: number;
    emailsFailed: number;
    push: number | null;
    sms: number | null;
  };
};

function CompanyAvatar({
  name,
  logoUrl,
  size = "md",
}: {
  name: string;
  logoUrl: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const [imageError, setImageError] = useState(false);

  const getInitials = (str: string) => {
    if (!str) return "CO";
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  const sizeClasses = {
    sm: "size-8 text-xs",
    md: "size-10 text-xs",
    lg: "size-12 text-sm",
  }[size];

  if (logoUrl && !imageError) {
    return (
      <div
        className={`${sizeClasses} rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-1 shrink-0 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xs`}
      >
        <img
          src={logoUrl}
          alt={name}
          className="w-full h-full object-contain"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses} rounded-lg bg-gradient-to-br from-primary/10 via-primary/5 to-slate-100 dark:from-primary/20 dark:via-slate-800 dark:to-slate-800 text-primary font-bold flex items-center justify-center shrink-0 border border-primary/20 dark:border-primary/30 shadow-2xs select-none`}
    >
      {getInitials(name)}
    </div>
  );
}

function formatDate(isoString?: string | null): string {
  if (!isoString) return "Never";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "Never";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Never";
  }
}

export default function TenantUsageMetricsPage() {
  const queryClient = useQueryClient();

  // View mode with localStorage persistence
  const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
    try {
      const saved = localStorage.getItem("super-tenant-usage-view-mode");
      return saved === "grid" ? "grid" : "list";
    } catch {
      return "list";
    }
  });

  const handleSetViewMode = (mode: "list" | "grid") => {
    setViewMode(mode);
    try {
      localStorage.setItem("super-tenant-usage-view-mode", mode);
    } catch {
      // Ignore localStorage errors
    }
  };

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [period, setPeriod] = useState<"30d" | "7d" | "90d" | "1y" | "all">("30d");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("activity_desc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Detail Modal State
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [detailPeriod, setDetailPeriod] = useState<"30d" | "7d" | "90d" | "1y" | "all">("30d");
  const [copiedId, setCopiedId] = useState(false);

  // Fetch list metrics from API
  const {
    data: metrics = [],
    isLoading,
    refetch,
    isFetching,
    isError,
    error,
  } = useQuery<TenantUsageRecord[]>({
    queryKey: ["super-tenant-usage-metrics", period, planFilter, statusFilter, sortBy, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (period) params.append("period", period);
      if (searchTerm.trim()) params.append("search", searchTerm.trim());
      if (planFilter && planFilter !== "all") params.append("plan", planFilter);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      if (sortBy) params.append("sortBy", sortBy);

      const res = await api.get(`/api/super/tenant-usage-metrics?${params.toString()}`);
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  // Fetch deep tenant details when modal opens
  const {
    data: detailData,
    isLoading: isDetailLoading,
    refetch: refetchDetail,
  } = useQuery<TenantUsageDetailResponse>({
    queryKey: ["super-tenant-usage-detail", selectedTenantId, detailPeriod],
    queryFn: async () => {
      if (!selectedTenantId) return null;
      const res = await api.get(`/api/super/tenant-usage-metrics/${selectedTenantId}?period=${detailPeriod}`);
      return res;
    },
    enabled: !!selectedTenantId,
  });

  // Available plans for filter dropdown
  const availablePlans = useMemo(() => {
    const plans = new Set<string>();
    metrics.forEach((m) => {
      if (m.plan) plans.add(m.plan);
    });
    return Array.from(plans);
  }, [metrics]);

  const toggleSelectAll = () => {
    if (selectedIds.length === metrics.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(metrics.map((m) => m.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const copyTenantId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    toast.success("Tenant ID copied to clipboard");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const exportCSV = () => {
    if (metrics.length === 0) {
      toast.info("No tenant usage records to export.");
      return;
    }

    const headers = [
      "Tenant Name",
      "Domain",
      "Plan",
      "Billing Cycle",
      "Status",
      "Active Users",
      "Total Users",
      "Total Employees",
      "Storage Used",
      "Storage Limit",
      "Storage Utilization %",
      "Most Used Modules",
      "Last Activity",
      "Created At",
    ];

    const rows = metrics.map((m) => [
      `"${m.name.replace(/"/g, '""')}"`,
      `"${m.domainUrl}"`,
      `"${m.plan}"`,
      `"${m.billingCycle}"`,
      `"${m.status}"`,
      m.activeUsers,
      m.totalUsers,
      m.totalEmployees,
      `"${m.storageUsedFormatted}"`,
      `"${m.storageLimitFormatted}"`,
      m.storagePercentage !== null ? `"${m.storagePercentage}%"` : '"Not configured"',
      `"${(m.mostModuleUsage || []).join(", ")}"`,
      `"${formatDate(m.lastActivityAt)}"`,
      `"${formatDate(m.createdAt)}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `tenant_usage_metrics_${period}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${metrics.length} tenant usage records to CSV`);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Tenant Usage Metrics
          </h2>
          <nav className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 mt-1">
            <span className="hover:text-primary transition-colors cursor-pointer">Super Admin</span>
            <span>/</span>
            <span className="font-medium text-slate-900 dark:text-slate-200">Tenant Usage Metrics</span>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Button */}
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs text-slate-800 dark:text-slate-100 cursor-pointer"
            title="Export filtered records as CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Export CSV</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
            title="Refresh Metrics from Database"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-primary" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        {/* Filter Toolbar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Left: Section Title & Workspace Count */}
            <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 whitespace-nowrap">
                  Tenant Usage
                </h3>
                <span className="text-xs bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-300 px-2.5 py-0.5 rounded-full font-semibold border border-slate-300/50 dark:border-slate-700 whitespace-nowrap">
                  {metrics.length} {metrics.length === 1 ? "workspace" : "workspaces"}
                </span>
              </div>

              {/* View Mode Toggle (Mobile) */}
              <div className="flex sm:hidden items-center p-0.5 bg-slate-200/80 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 h-9">
                <button
                  type="button"
                  onClick={() => handleSetViewMode("list")}
                  className={`h-7.5 px-2 rounded-md transition-all cursor-pointer flex items-center justify-center ${
                    viewMode === "list"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                  title="List View"
                  aria-label="List View"
                >
                  <LayoutList className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSetViewMode("grid")}
                  className={`h-7.5 px-2 rounded-md transition-all cursor-pointer flex items-center justify-center ${
                    viewMode === "grid"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                  title="Grid View"
                  aria-label="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right: Search, Filter Dropdowns, and Desktop View Mode Toggle */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 flex-1 justify-start sm:justify-end min-w-0">
              {/* Search Input */}
              <div className="relative col-span-2 sm:w-36 md:w-40 lg:w-44 shrink-0">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search tenant..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-9 pl-8 pr-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 shadow-2xs transition-colors"
                />
              </div>

              {/* Date Range / Reporting Period */}
              <div className="relative col-span-1 sm:w-auto shrink-0 min-w-0 sm:min-w-[130px]">
                <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as any)}
                  className="w-full sm:w-auto h-9 pl-8 pr-7 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs cursor-pointer transition-colors truncate"
                  title="Telemetry Reporting Period"
                >
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="1y">Last 1 Year</option>
                  <option value="all">All Time</option>
                </select>
              </div>

              {/* Plan Filter */}
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="col-span-1 sm:w-auto h-9 px-2.5 pr-7 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs cursor-pointer transition-colors shrink-0 truncate"
              >
                <option value="all">All Plans</option>
                {availablePlans.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="col-span-1 sm:w-auto h-9 px-2.5 pr-7 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs cursor-pointer transition-colors shrink-0 truncate"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="expired">Expired</option>
              </select>

              {/* Sort By Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="col-span-1 sm:w-auto h-9 px-2.5 pr-7 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs cursor-pointer transition-colors shrink-0 truncate"
              >
                <option value="activity_desc">Sort: Highest Activity</option>
                <option value="activity_asc">Sort: Lowest Activity</option>
                <option value="storage_desc">Sort: Highest Storage Usage</option>
                <option value="storage_asc">Sort: Lowest Storage Usage</option>
                <option value="users_desc">Sort: Active User Count</option>
                <option value="name_asc">Sort: Company Name (A-Z)</option>
                <option value="name_desc">Sort: Company Name (Z-A)</option>
              </select>

              {/* Desktop View Mode Toggle */}
              <div className="hidden sm:flex items-center p-0.5 bg-slate-200/80 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 shrink-0 h-9">
                <button
                  type="button"
                  onClick={() => handleSetViewMode("list")}
                  className={`h-7.5 px-2 rounded-md transition-all cursor-pointer flex items-center justify-center ${
                    viewMode === "list"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                  title="List View"
                  aria-label="List View"
                >
                  <LayoutList className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSetViewMode("grid")}
                  className={`h-7.5 px-2 rounded-md transition-all cursor-pointer flex items-center justify-center ${
                    viewMode === "grid"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                  title="Grid View"
                  aria-label="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 text-slate-500 dark:text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-xs font-medium">Aggregating live storage telemetry and usage activity...</p>
          </div>
        ) : isError ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <HardDrive className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Failed to load tenant metrics
            </p>
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 max-w-md mx-auto">
              {(error as any)?.message || "Database connection error"}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-3.5 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-2xs"
            >
              Retry
            </button>
          </div>
        ) : metrics.length === 0 ? (
          <div className="text-center py-16 px-4">
            <HardDrive className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No tenant usage records found
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Try adjusting your search query, plan filter, or reporting date range.
            </p>
          </div>
        ) : viewMode === "list" ? (
          /* ─── LIST VIEW ─── */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/75 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === metrics.length && metrics.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-primary focus:ring-primary/20 h-4 w-4 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Tenants</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Active Users</th>
                  <th className="py-3 px-4">Most Module Usage</th>
                  <th className="py-3 px-4">Storage Usage</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Activity</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80 text-xs">
                {metrics.map((m) => {
                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(m.id)}
                          onChange={() => toggleSelect(m.id)}
                          className="rounded border-slate-300 text-primary focus:ring-primary/20 h-4 w-4 cursor-pointer"
                        />
                      </td>

                      {/* Tenants (Avatar + Name + Domain) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <CompanyAvatar name={m.name} logoUrl={m.logoUrl} size="md" />
                          <div>
                            <span
                              onClick={() => {
                                setSelectedTenantId(m.id);
                                setDetailPeriod(period);
                              }}
                              className="font-bold text-slate-900 dark:text-slate-100 hover:text-primary cursor-pointer transition-colors"
                            >
                              {m.name}
                            </span>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              {m.domainUrl}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          {m.plan}
                        </span>
                      </td>

                      {/* Active Users */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {m.activeUsers}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            ({m.totalUsers} reg.)
                          </span>
                        </div>
                      </td>

                      {/* Most Module Usage */}
                      <td className="py-3 px-4">
                        {m.mostModuleUsage && m.mostModuleUsage.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {m.mostModuleUsage.map((mod) => (
                              <span
                                key={mod}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 dark:bg-primary/20 dark:text-primary-foreground"
                              >
                                {mod}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                            No recorded activity
                          </span>
                        )}
                      </td>

                      {/* Storage Usage */}
                      <td className="py-3 px-4">
                        <div className="space-y-1 min-w-[130px]">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {m.storageUsedFormatted}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 text-[10px]">
                              / {m.storageLimitFormatted}
                            </span>
                          </div>
                          {m.storagePercentage !== null ? (
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  m.storagePercentage > 90
                                    ? "bg-rose-500"
                                    : m.storagePercentage > 75
                                    ? "bg-amber-500"
                                    : "bg-primary"
                                }`}
                                style={{ width: `${Math.max(2, Math.min(100, m.storagePercentage))}%` }}
                              />
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              Quota not configured
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {m.status === "Active" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Active
                          </span>
                        ) : m.status === "Suspended" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Expired
                          </span>
                        )}
                      </td>

                      {/* Last Activity */}
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(m.lastActivityAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            title="View Tenant Usage Details"
                            onClick={() => {
                              setSelectedTenantId(m.id);
                              setDetailPeriod(period);
                            }}
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            title="Refresh Metrics"
                            onClick={() => {
                              refetch();
                              toast.info(`Refreshed metrics for ${m.name}`);
                            }}
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ─── GRID VIEW ─── */
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {metrics.map((m) => {
              return (
                <div
                  key={m.id}
                  className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <CompanyAvatar name={m.name} logoUrl={m.logoUrl} size="md" />
                        <div className="min-w-0">
                          <h4
                            onClick={() => {
                              setSelectedTenantId(m.id);
                              setDetailPeriod(period);
                            }}
                            className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate hover:text-primary cursor-pointer transition-colors"
                          >
                            {m.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                            {m.domainUrl}
                          </p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      {m.status === "Active" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Active
                        </span>
                      ) : m.status === "Suspended" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          Expired
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3 text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                        {m.plan}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatDate(m.lastActivityAt)}
                      </span>
                    </div>
                  </div>

                  {/* Card Body: Metrics */}
                  <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                    {/* Active Users */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        Active Users
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {m.activeUsers} <span className="text-slate-400 font-normal">/ {m.totalUsers} reg.</span>
                      </span>
                    </div>

                    {/* Storage Progress */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                          <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                          Storage Usage
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {m.storageUsedFormatted}{" "}
                          <span className="text-slate-400 font-normal">
                            / {m.storageLimitFormatted}
                          </span>
                        </span>
                      </div>
                      {m.storagePercentage !== null ? (
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              m.storagePercentage > 90
                                ? "bg-rose-500"
                                : m.storagePercentage > 75
                                ? "bg-amber-500"
                                : "bg-primary"
                            }`}
                            style={{ width: `${Math.max(2, Math.min(100, m.storagePercentage))}%` }}
                          />
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400">Quota not configured</p>
                      )}
                    </div>

                    {/* Most Used Modules */}
                    <div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                        Most Used Modules
                      </span>
                      {m.mostModuleUsage && m.mostModuleUsage.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {m.mostModuleUsage.map((mod) => (
                            <span
                              key={mod}
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 dark:bg-primary/20 dark:text-primary-foreground"
                            >
                              {mod}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No recorded activity</span>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Actions */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedTenantId(m.id);
                        setDetailPeriod(period);
                      }}
                      className="flex-1 py-1.5 px-3 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Details</span>
                    </button>
                    <button
                      onClick={() => {
                        refetch();
                        toast.info(`Refreshed metrics for ${m.name}`);
                      }}
                      className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                      title="Quick Refresh"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── TENANT USAGE DETAIL MODAL / DRAWER (Reference UI Match) ─── */}
      {selectedTenantId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-3">
                <h4 className="font-bold text-lg text-slate-900 dark:text-slate-100">Tenant Usage Detail</h4>
                {/* Period Selector inside drawer */}
                <select
                  value={detailPeriod}
                  onChange={(e) => setDetailPeriod(e.target.value as any)}
                  className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  title="Change Reporting Period"
                >
                  <option value="7d">Period: 7 Days</option>
                  <option value="30d">Period: 30 Days</option>
                  <option value="90d">Period: 90 Days</option>
                  <option value="1y">Period: 1 Year</option>
                  <option value="all">Period: All Time</option>
                </select>
              </div>

              <button
                onClick={() => setSelectedTenantId(null)}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            {isDetailLoading || !detailData ? (
              <div className="flex flex-col items-center justify-center p-16 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                <p className="text-xs font-medium">Fetching real telemetry and storage breakdown from database...</p>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {/* SECTION A: Tenant Profile Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 gap-4">
                  <div className="flex items-center gap-3.5">
                    <CompanyAvatar
                      name={detailData.profile.name}
                      logoUrl={detailData.profile.logoUrl}
                      size="lg"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-bold text-base text-slate-900 dark:text-slate-100">
                          {detailData.profile.name}
                        </h5>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          {detailData.profile.plan} ({detailData.profile.billingCycle})
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                        <a
                          href={`https://${detailData.profile.domainUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-primary transition-colors flex items-center gap-1"
                        >
                          {detailData.profile.domainUrl}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <span>ID: {detailData.profile.id.slice(0, 8)}...</span>
                          <button
                            onClick={() => copyTenantId(detailData.profile.id)}
                            className="hover:text-primary p-0.5 cursor-pointer"
                            title="Copy full Tenant ID"
                          >
                            {copiedId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    {detailData.profile.status === "Active" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Active
                      </span>
                    ) : detailData.profile.status === "Suspended" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        Suspended
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        Expired
                      </span>
                    )}
                  </div>
                </div>

                {/* SECTION B & E: Storage Breakdown + Notifications Telemetry */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Storage Usage Info Card */}
                  <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-primary" />
                        Storage Usage Info
                      </h5>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {detailData.storage.totalUsedFormatted} / {detailData.storage.totalLimitFormatted}
                      </span>
                    </div>

                    {/* Overall Progress Bar */}
                    {detailData.storage.storagePercentage !== null ? (
                      <div className="space-y-1">
                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              detailData.storage.storagePercentage > 90
                                ? "bg-rose-500"
                                : detailData.storage.storagePercentage > 75
                                ? "bg-amber-500"
                                : "bg-primary"
                            }`}
                            style={{
                              width: `${Math.max(2, Math.min(100, detailData.storage.storagePercentage))}%`,
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                          <span>{detailData.storage.storagePercentage}% utilized</span>
                          <span>Remaining: {detailData.storage.remainingFormatted}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No storage quota configured</p>
                    )}

                    {/* Breakdown by Category */}
                    <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <Database className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                          Database:
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {detailData.storage.categories.database.formatted}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <ImageIcon className="w-3.5 h-3.5 text-sky-500" />
                          Images:
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {detailData.storage.categories.images.formatted}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <Video className="w-3.5 h-3.5 text-indigo-500" />
                          Videos:
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {detailData.storage.categories.videos.formatted}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <FileText className="w-3.5 h-3.5 text-amber-500" />
                          Documentation:
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {detailData.storage.categories.documents.formatted}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <Music className="w-3.5 h-3.5 text-purple-500" />
                          Audio:
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {detailData.storage.categories.audio.formatted}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <FileCode className="w-3.5 h-3.5 text-slate-500" />
                          Other Files:
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {detailData.storage.categories.other.formatted}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notifications Telemetry Card */}
                  <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-4 shadow-2xs">
                    <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <Bell className="w-4 h-4 text-purple-600" />
                      Notifications Telemetry
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Actual notifications and lifecycle reminders logged in database.
                    </p>

                    <div className="grid grid-cols-3 gap-3 py-2">
                      {/* Push */}
                      <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                        <div className="w-10 h-10 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-500 font-bold text-xs flex items-center justify-center mx-auto mb-1.5">
                          N/C
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 block">
                          Push
                        </span>
                        <span className="text-[9px] text-slate-400">Not configured</span>
                      </div>

                      {/* Email */}
                      <div className="text-center p-3 rounded-lg bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60">
                        <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-sm flex items-center justify-center mx-auto mb-1.5">
                          {detailData.notifications.emailsSent}
                        </div>
                        <span className="text-[11px] font-bold text-purple-900 dark:text-purple-200 block">
                          Email Sent
                        </span>
                        <span className="text-[9px] text-purple-600 dark:text-purple-400">
                          {detailData.notifications.emailsFailed} failed
                        </span>
                      </div>

                      {/* SMS */}
                      <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                        <div className="w-10 h-10 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-500 font-bold text-xs flex items-center justify-center mx-auto mb-1.5">
                          N/C
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 block">
                          SMS
                        </span>
                        <span className="text-[9px] text-slate-400">Not configured</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/80">
                      <strong>Audit Note:</strong> Push and SMS outbound gateways are currently not configured on this workspace. Email counts reflect actual verified delivery records.
                    </div>
                  </div>
                </div>

                {/* SECTION C & D: Basic Info & Most Module Usage */}
                <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-5">
                  {/* Basic Info */}
                  <div>
                    <h6 className="font-bold text-xs text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-primary" />
                      User & Login Telemetry
                    </h6>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">Active Users</p>
                        <p className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-0.5">
                          {detailData.userActivity.activeUsers}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {detailData.userActivity.totalUsers} registered
                        </p>
                      </div>

                      <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">Total Logins</p>
                        <p className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-0.5">
                          {detailData.userActivity.totalLogins.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-slate-400">in selected period</p>
                      </div>

                      <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">Avg. Session Duration</p>
                        <p className="font-semibold text-xs text-slate-600 dark:text-slate-300 mt-1">
                          {detailData.userActivity.averageSessionDuration || "Not available"}
                        </p>
                        <p className="text-[10px] text-slate-400">telemetry not enabled</p>
                      </div>

                      <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">Peak Usage Window</p>
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-200 mt-1">
                          {detailData.userActivity.peakUsageTime || "Not available"}
                        </p>
                        <p className="text-[10px] text-slate-400">based on login timestamps</p>
                      </div>
                    </div>
                  </div>

                  {/* Most Module Usage Info */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <h6 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-primary" />
                        Most Module Usage Info
                      </h6>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Aggregated actions in current period
                      </span>
                    </div>

                    {detailData.moduleUsage.records && detailData.moduleUsage.records.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        {detailData.moduleUsage.records.map((rec) => (
                          <div
                            key={rec.key}
                            className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                          >
                            <p className="text-slate-500 dark:text-slate-400 text-[11px] font-medium truncate">
                              {rec.name}
                            </p>
                            <p className="font-bold text-slate-900 dark:text-slate-100 mt-1 text-sm">
                              {rec.actionCount.toLocaleString()}{" "}
                              <span className="text-[10px] font-normal text-slate-500">actions</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                        <Layers className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                        <p className="font-medium text-slate-700 dark:text-slate-300">
                          No module activity recorded for this period.
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Try switching the reporting period to 90 Days or All Time.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between sticky bottom-0">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Created on: {detailData ? formatDate(detailData.profile.createdAt) : "—"}
              </span>
              <button
                type="button"
                onClick={() => setSelectedTenantId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
