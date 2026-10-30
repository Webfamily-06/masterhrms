'use client';
import { createFileRoute } from "@/src/lib/router-compat";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getSocketClient } from "@/lib/socket";
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
  Trash2,
  AlertTriangle,
  ShieldAlert,
  Folder,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";

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
  activeBytes?: number;
  formattedActive?: string;
  trashBytes?: number;
  formattedTrash?: string;
  versionBytes?: number;
  formattedVersion?: string;
  reservedBytes?: number;
  formattedReserved?: string;
  physicalBytes?: number;
  formattedPhysical?: string;
  billableBytes?: number;
  formattedBillable?: string;
  quotaBytes?: number;
  formattedQuota?: string;
  quotaSource?: string;
  thresholdState?: "NORMAL" | "WARNING" | "CRITICAL" | "LOCKED";
  fileCount?: number;
  mostModuleUsage: string[];
  totalActivityScore: number;
  status: "Active" | "Suspended" | "Expired";
  lastLoginAt: string | null;
  lastActivityAt: string;
  createdAt: string;
  updatedAt?: string;
};

export type FleetSummary = {
  totalTenants: number;
  activeTenants: number;
  totalAllocatedStorage: number;
  formattedAllocatedStorage: string;
  totalActiveStorage: number;
  formattedActiveStorage: string;
  totalTrashStorage: number;
  formattedTrashStorage: string;
  totalVersionStorage: number;
  formattedVersionStorage: string;
  totalReservedStorage: number;
  formattedReservedStorage: string;
  totalPhysicalStorage: number;
  formattedPhysicalStorage: string;
  totalBillableStorage: number;
  formattedBillableStorage: string;
  tenantsApproachingQuota: number;
  tenantsLocked: number;
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
    activeBytes?: number;
    formattedActive?: string;
    trashBytes?: number;
    formattedTrash?: string;
    versionBytes?: number;
    formattedVersion?: string;
    reservedBytes?: number;
    formattedReserved?: string;
    physicalBytes?: number;
    formattedPhysical?: string;
    totalBillableBytes?: number;
    formattedTotalBillable?: string;
    thresholdState?: string;
    quotaSource?: string;
    categories: {
      database: { bytes: number; formatted: string };
      images: { bytes: number; formatted: string };
      documents: { bytes: number; formatted: string };
      videos: { bytes: number; formatted: string };
      audio: { bytes: number; formatted: string };
      other: { bytes: number; formatted: string };
    };
    departmentBreakdown?: {
      departments: Array<{
        departmentId: string;
        name: string;
        allocatedQuotaBytes: number;
        formattedAllocated: string;
        usedBytes: number;
        formattedUsed: string;
        percentUsed: number;
        employeeCount: number;
        fileCount: number;
      }>;
      unassignedBytes: number;
      formattedUnassigned: string;
      totalDepartments: number;
    };
    topUsers?: Array<{
      userId: string;
      name: string;
      email: string;
      role: string;
      usedBytes: number;
      formattedUsed: string;
      quotaBytes: number;
      formattedQuota: string;
      percentUsed: number;
      fileCount: number;
    }>;
    teams?: Array<{
      id: string;
      name: string;
      slug: string;
      color?: string;
      icon?: string;
      usedBytes: number;
      formattedUsed: string;
      quotaBytes: number;
      formattedQuota: string;
      percentUsed: number;
      memberCount: number;
      fileCount: number;
    }>;
    recentActivities?: Array<{
      id: string;
      fileId: string;
      fileName: string;
      fileSize: number;
      formattedSize: string;
      action: string;
      actorId: string;
      createdAt: string;
    }>;
    lastReconciledAt?: string | null;
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
  const [modalTab, setModalTab] = useState<"storage" | "departments" | "teams" | "users" | "activity" | "telemetry">("storage");
  const [copiedId, setCopiedId] = useState(false);

  // Real-time Socket.IO State
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());

  // Real-time listener for Super Admin (platform:admin room)
  useEffect(() => {
    let socket: any;
    try {
      socket = getSocketClient();
      if (socket.connected) {
        setSocketConnected(true);
      }
      const onConnect = () => setSocketConnected(true);
      const onDisconnect = () => setSocketConnected(false);

      const handleStorageUpdate = (event: any) => {
        setLastSyncedAt(new Date());
        queryClient.invalidateQueries({ queryKey: ["super-tenant-usage-metrics"] });
        if (selectedTenantId) {
          queryClient.invalidateQueries({ queryKey: ["super-tenant-usage-detail", selectedTenantId] });
        }
      };

      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      socket.on("storage:platform:update", handleStorageUpdate);
      socket.on("storage:tenant:update", handleStorageUpdate);
      socket.on("file:uploaded", handleStorageUpdate);
      socket.on("file:trashed", handleStorageUpdate);
      socket.on("file:restored", handleStorageUpdate);
      socket.on("file:deleted", handleStorageUpdate);
      socket.on("quota:warning", handleStorageUpdate);
      socket.on("quota:critical", handleStorageUpdate);
      socket.on("quota:locked", handleStorageUpdate);

      return () => {
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
        socket.off("storage:platform:update", handleStorageUpdate);
        socket.off("storage:tenant:update", handleStorageUpdate);
        socket.off("file:uploaded", handleStorageUpdate);
        socket.off("file:trashed", handleStorageUpdate);
        socket.off("file:restored", handleStorageUpdate);
        socket.off("file:deleted", handleStorageUpdate);
        socket.off("quota:warning", handleStorageUpdate);
        socket.off("quota:critical", handleStorageUpdate);
        socket.off("quota:locked", handleStorageUpdate);
      };
    } catch (e) {
      console.warn("[SuperTenantUsage] Socket initialization error:", e);
    }
  }, [queryClient, selectedTenantId]);

  // Fetch list metrics from API
  const {
    data: apiResult,
    isLoading,
    refetch,
    isFetching,
    isError,
    error,
  } = useQuery<{ fleetSummary?: FleetSummary; data: TenantUsageRecord[] }>({
    queryKey: ["super-tenant-usage-metrics", period, planFilter, statusFilter, sortBy, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (period) params.append("period", period);
      if (searchTerm.trim()) params.append("search", searchTerm.trim());
      if (planFilter && planFilter !== "all") params.append("plan", planFilter);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      if (sortBy) params.append("sortBy", sortBy);

      const res = await api.get(`/api/super/tenant-usage-metrics?${params.toString()}`);
      if (Array.isArray(res)) {
        return { data: res };
      }
      return {
        fleetSummary: res?.fleetSummary,
        data: res?.data || [],
      };
    },
  });

  const fleetSummary = apiResult?.fleetSummary;
  const metrics = apiResult?.data || [];

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
      "Quota Limit",
      "Active Storage",
      "Trash Storage",
      "Version Storage",
      "Reserved Storage",
      "Physical / Billable",
      "Storage Utilization %",
      "Threshold State",
      "Active Users",
      "Total Users",
      "Total Employees",
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
      `"${m.formattedQuota || m.storageLimitFormatted}"`,
      `"${m.formattedActive || m.storageUsedFormatted}"`,
      `"${m.formattedTrash || '0 B'}"`,
      `"${m.formattedVersion || '0 B'}"`,
      `"${m.formattedReserved || '0 B'}"`,
      `"${m.formattedPhysical || m.formattedBillable || m.storageUsedFormatted}"`,
      m.storagePercentage !== null ? `"${m.storagePercentage}%"` : '"Not configured"',
      `"${m.thresholdState || 'NORMAL'}"`,
      m.activeUsers,
      m.totalUsers,
      m.totalEmployees,
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
      `tenant_storage_fleet_metrics_${period}_${new Date().toISOString().slice(0, 10)}.csv`
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
            <span className="font-medium text-slate-900 dark:text-slate-200">Fleet Storage & Resource Metrics</span>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Real-time Socket Indicator */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className={`w-2 h-2 rounded-full ${socketConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            <span className="text-slate-700 dark:text-slate-300">
              {socketConnected ? "Live Fleet Sync" : "Reconnecting..."}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

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

      {/* ── FLEET STORAGE SUMMARY KPI CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Allocated Storage */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-semibold">
            <span>Fleet Quota</span>
            <Database className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono">
            {fleetSummary?.formattedAllocatedStorage || "0 B"}
          </div>
          <div className="text-[10px] text-slate-400">
            {fleetSummary?.totalTenants || metrics.length} tenants fleet
          </div>
        </div>

        {/* Active Logical */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-semibold">
            <span>Active Files</span>
            <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono">
            {fleetSummary?.formattedActiveStorage || "0 B"}
          </div>
          <div className="text-[10px] text-slate-400">
            Live un-trashed files
          </div>
        </div>

        {/* Trash */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-semibold">
            <span>Recycle Bin</span>
            <Trash2 className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono">
            {fleetSummary?.formattedTrashStorage || "0 B"}
          </div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
            Reclaimable capacity
          </div>
        </div>

        {/* Versions */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-semibold">
            <span>Versions</span>
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono">
            {fleetSummary?.formattedVersionStorage || "0 B"}
          </div>
          <div className="text-[10px] text-slate-400">
            Historical versions
          </div>
        </div>

        {/* Reserved */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-semibold">
            <span>In-Flight</span>
            <Clock className="w-3.5 h-3.5 text-sky-500" />
          </div>
          <div className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono">
            {fleetSummary?.formattedReservedStorage || "0 B"}
          </div>
          <div className="text-[10px] text-slate-400">
            Reserved buffer
          </div>
        </div>

        {/* Physical / Billable */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-semibold">
            <span>Physical Disk</span>
            <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono">
            {fleetSummary?.formattedBillableStorage || "0 B"}
          </div>
          <div className="text-[10px] text-purple-600 dark:text-purple-400">
            Billable footprint
          </div>
        </div>

        {/* Approaching Quota (>=80%) */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-semibold">
            <span>At-Risk (&ge;80%)</span>
            <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <div className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono">
            {fleetSummary?.tenantsApproachingQuota ?? 0}
          </div>
          <div className="text-[10px] text-orange-600 dark:text-orange-400">
            Warning / Critical
          </div>
        </div>

        {/* Locked (100%) */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-semibold">
            <span>Locked (100%)</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono">
            {fleetSummary?.tenantsLocked ?? 0}
          </div>
          <div className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
            Frozen writes
          </div>
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
                  Tenant Storage Fleet
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
                  className="w-full h-9 pl-8 pr-6 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-slate-100 appearance-none shadow-2xs cursor-pointer truncate"
                  title="Filter by reporting period"
                >
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="1y">Last 1 Year</option>
                  <option value="all">All Time</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Plan Filter */}
              <div className="relative col-span-1 sm:w-auto shrink-0 min-w-0 sm:min-w-[120px]">
                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="w-full h-9 px-2.5 pr-6 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-slate-100 appearance-none shadow-2xs cursor-pointer truncate"
                  title="Filter by Subscription Plan"
                >
                  <option value="all">All Plans</option>
                  {availablePlans.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Status Filter */}
              <div className="relative col-span-1 sm:w-auto shrink-0 min-w-0 sm:min-w-[100px]">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-9 px-2.5 pr-6 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-slate-100 appearance-none shadow-2xs cursor-pointer truncate"
                  title="Filter by Workspace Status"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="expired">Expired</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Sort By Dropdown */}
              <div className="relative col-span-1 sm:w-auto shrink-0 min-w-0 sm:min-w-[130px]">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full h-9 px-2.5 pr-6 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-slate-100 appearance-none shadow-2xs cursor-pointer truncate"
                  title="Sort workspaces by metric"
                >
                  <option value="storage_desc">Storage: High to Low</option>
                  <option value="storage_asc">Storage: Low to High</option>
                  <option value="activity_desc">Activity: High to Low</option>
                  <option value="activity_asc">Activity: Low to High</option>
                  <option value="users_desc">Users: Most to Least</option>
                  <option value="users_asc">Users: Least to Most</option>
                  <option value="name_asc">Name: A to Z</option>
                  <option value="name_desc">Name: Z to A</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* View Mode Toggle (Desktop) */}
              <div className="hidden sm:flex items-center p-0.5 bg-slate-200/80 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 h-9 shrink-0">
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

        {/* Loading / Error States */}
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-xs font-medium">Aggregating real-time storage metrics from database...</p>
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-rose-500">
            <p className="font-semibold text-sm">Failed to load tenant storage metrics</p>
            <p className="text-xs text-slate-500 mt-1">{(error as any)?.message || "Internal server error"}</p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-3 py-1.5 bg-primary text-white text-xs rounded-lg font-semibold cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : metrics.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <Layers className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="font-medium text-slate-700 dark:text-slate-300 text-sm">No tenants match the filter criteria.</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting search filters or selecting All Plans.</p>
          </div>
        ) : viewMode === "list" ? (
          /* ── CANONICAL MULTI-DIMENSIONAL STORAGE TABLE ── */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/75 text-slate-600 dark:text-slate-400 font-semibold">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={metrics.length > 0 && selectedIds.length === metrics.length}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-primary focus:ring-primary/20 h-4 w-4 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4 min-w-[200px]">Tenant Workspace</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Quota Limit</th>
                  <th className="py-3 px-4">Active Files</th>
                  <th className="py-3 px-4">Recycle Bin</th>
                  <th className="py-3 px-4">Versions</th>
                  <th className="py-3 px-4">Reserved</th>
                  <th className="py-3 px-4">Physical Disk</th>
                  <th className="py-3 px-4 min-w-[150px]">Quota Utilization</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Activity</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80 text-xs">
                {metrics.map((m) => {
                  const state = m.thresholdState || "NORMAL";
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
                                setModalTab("storage");
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
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                            {m.plan}
                          </span>
                          <span className="block text-[10px] text-slate-400 capitalize">
                            {m.billingCycle}
                          </span>
                        </div>
                      </td>

                      {/* Quota Limit */}
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {m.formattedQuota || m.storageLimitFormatted}
                        {m.quotaSource && (
                          <span className="block text-[9px] text-slate-400 uppercase font-sans">
                            {m.quotaSource}
                          </span>
                        )}
                      </td>

                      {/* Active Files */}
                      <td className="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        {m.formattedActive || m.storageUsedFormatted}
                      </td>

                      {/* Recycle Bin */}
                      <td className="py-3 px-4 font-mono text-amber-600 dark:text-amber-400">
                        {m.formattedTrash || "0 B"}
                      </td>

                      {/* Versions */}
                      <td className="py-3 px-4 font-mono text-indigo-600 dark:text-indigo-400">
                        {m.formattedVersion || "0 B"}
                      </td>

                      {/* Reserved In-Flight */}
                      <td className="py-3 px-4 font-mono text-sky-600 dark:text-sky-400">
                        {m.formattedReserved || "0 B"}
                      </td>

                      {/* Physical Disk / Billable */}
                      <td className="py-3 px-4 font-mono font-bold text-purple-600 dark:text-purple-400">
                        {m.formattedPhysical || m.formattedBillable || m.storageUsedFormatted}
                      </td>

                      {/* Quota Utilization & Threshold State Badge */}
                      <td className="py-3 px-4">
                        <div className="space-y-1.5 min-w-[130px]">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                              {m.storagePercentage !== null ? `${m.storagePercentage}%` : "—"}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                state === "LOCKED"
                                  ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                                  : state === "CRITICAL"
                                  ? "bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-800"
                                  : state === "WARNING"
                                  ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                                  : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                              }`}
                            >
                              {state}
                            </span>
                          </div>
                          {m.storagePercentage !== null ? (
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  m.storagePercentage >= 100
                                    ? "bg-rose-500"
                                    : m.storagePercentage >= 90
                                    ? "bg-orange-500"
                                    : m.storagePercentage >= 80
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.max(2, Math.min(100, m.storagePercentage))}%` }}
                              />
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">Not configured</span>
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
                            title="Deep Inspection Drawer"
                            onClick={() => {
                              setSelectedTenantId(m.id);
                              setDetailPeriod(period);
                              setModalTab("storage");
                            }}
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            title="Refresh Tenant Metrics"
                            onClick={() => {
                              refetch();
                              toast.info(`Refreshed storage telemetry for ${m.name}`);
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
          /* ── GRID VIEW ── */
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((m) => {
              const state = m.thresholdState || "NORMAL";
              return (
                <div
                  key={m.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-primary/40 dark:hover:border-primary/40 transition-all space-y-3.5 shadow-2xs"
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <CompanyAvatar name={m.name} logoUrl={m.logoUrl} size="md" />
                        <div>
                          <h4
                            onClick={() => {
                              setSelectedTenantId(m.id);
                              setDetailPeriod(period);
                              setModalTab("storage");
                            }}
                            className="font-bold text-sm text-slate-900 dark:text-slate-100 hover:text-primary cursor-pointer transition-colors"
                          >
                            {m.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            {m.domainUrl}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          state === "LOCKED"
                            ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                            : state === "CRITICAL"
                            ? "bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-800"
                            : state === "WARNING"
                            ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                            : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                        }`}
                      >
                        {state}
                      </span>
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

                  {/* Card Body: Multi-dimensional Storage Metrics */}
                  <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                    {/* Active & Physical Storage */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div className="p-2 bg-slate-50 dark:bg-slate-800/80 rounded border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-500 text-[10px] block font-sans">Active Files</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {m.formattedActive || m.storageUsedFormatted}
                        </span>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-800/80 rounded border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-500 text-[10px] block font-sans">Physical Disk</span>
                        <span className="font-bold text-purple-600 dark:text-purple-400">
                          {m.formattedPhysical || m.formattedBillable || m.storageUsedFormatted}
                        </span>
                      </div>
                    </div>

                    {/* Storage Progress */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                          <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                          Quota Allocation
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                          {m.formattedQuota || m.storageLimitFormatted}
                        </span>
                      </div>
                      {m.storagePercentage !== null ? (
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              m.storagePercentage >= 100
                                ? "bg-rose-500"
                                : m.storagePercentage >= 90
                                ? "bg-orange-500"
                                : m.storagePercentage >= 80
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.max(2, Math.min(100, m.storagePercentage))}%` }}
                          />
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400">Quota not configured</p>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Actions */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedTenantId(m.id);
                        setDetailPeriod(period);
                        setModalTab("storage");
                      }}
                      className="flex-1 py-1.5 px-3 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Deep Inspection</span>
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

      {/* ─── UPGRADED TENANT INSPECTION MODAL / DRAWER (With Departments, Teams, Activity) ─── */}
      {selectedTenantId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-3">
                <h4 className="font-bold text-lg text-slate-900 dark:text-slate-100">Tenant Deep Inspection</h4>
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

                {/* Sub-Navigation Tabs Inside Modal */}
                <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold overflow-x-auto pb-px">
                  <button
                    onClick={() => setModalTab("storage")}
                    className={`py-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      modalTab === "storage"
                        ? "border-primary text-primary"
                        : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    Storage Dimensions
                  </button>
                  <button
                    onClick={() => setModalTab("departments")}
                    className={`py-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      modalTab === "departments"
                        ? "border-primary text-primary"
                        : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Departments ({detailData.storage.departmentBreakdown?.departments?.length || 0})
                  </button>
                  <button
                    onClick={() => setModalTab("teams")}
                    className={`py-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      modalTab === "teams"
                        ? "border-primary text-primary"
                        : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <Folder className="w-3.5 h-3.5" />
                    Team Folders ({detailData.storage.teams?.length || 0})
                  </button>
                  <button
                    onClick={() => setModalTab("users")}
                    className={`py-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      modalTab === "users"
                        ? "border-primary text-primary"
                        : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    Top Users ({detailData.storage.topUsers?.length || 0})
                  </button>
                  <button
                    onClick={() => setModalTab("activity")}
                    className={`py-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      modalTab === "activity"
                        ? "border-primary text-primary"
                        : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Storage Activity ({detailData.storage.recentActivities?.length || 0})
                  </button>
                  <button
                    onClick={() => setModalTab("telemetry")}
                    className={`py-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      modalTab === "telemetry"
                        ? "border-primary text-primary"
                        : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    Business Telemetry
                  </button>
                </div>

                {/* MODAL TAB 1: Storage Dimensions & Categories */}
                {modalTab === "storage" && (
                  <div className="space-y-5">
                    {/* Multi-Dimensional Storage Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80">
                        <span className="text-slate-500 text-[11px] block font-sans">Active Logical</span>
                        <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                          {detailData.storage.formattedActive || detailData.storage.totalUsedFormatted}
                        </span>
                        <span className="text-[10px] text-slate-400 font-sans">Un-trashed live files</span>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80">
                        <span className="text-slate-500 text-[11px] block font-sans">Recycle Bin</span>
                        <span className="text-base font-bold text-amber-600 dark:text-amber-400 mt-1 block">
                          {detailData.storage.formattedTrash || "0 B"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-sans">Reclaimable capacity</span>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80">
                        <span className="text-slate-500 text-[11px] block font-sans">Versions History</span>
                        <span className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-1 block">
                          {detailData.storage.formattedVersion || "0 B"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-sans">Non-current blobs</span>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80">
                        <span className="text-slate-500 text-[11px] block font-sans">Physical / Billable</span>
                        <span className="text-base font-bold text-purple-600 dark:text-purple-400 mt-1 block">
                          {detailData.storage.formattedTotalBillable || detailData.storage.formattedPhysical || detailData.storage.totalUsedFormatted}
                        </span>
                        <span className="text-[10px] text-slate-400 font-sans">Total storage footprint</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Storage Usage Info Card */}
                      <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-4 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                            <HardDrive className="w-4 h-4 text-primary" />
                            Storage Quota Status
                          </h5>
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                            {detailData.storage.totalUsedFormatted} / {detailData.storage.totalLimitFormatted}
                          </span>
                        </div>

                        {/* Overall Progress Bar */}
                        {detailData.storage.storagePercentage !== null ? (
                          <div className="space-y-1">
                            <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  detailData.storage.storagePercentage >= 100
                                    ? "bg-rose-500"
                                    : detailData.storage.storagePercentage >= 90
                                    ? "bg-orange-500"
                                    : detailData.storage.storagePercentage >= 80
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }`}
                                style={{
                                  width: `${Math.max(2, Math.min(100, detailData.storage.storagePercentage))}%`,
                                }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                              <span>{detailData.storage.storagePercentage}% utilized</span>
                              <span>Remaining Runway: {detailData.storage.remainingFormatted}</span>
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
                            <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                              {detailData.storage.categories.database.formatted}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                              <ImageIcon className="w-3.5 h-3.5 text-sky-500" />
                              Images:
                            </span>
                            <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                              {detailData.storage.categories.images.formatted}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                              <Video className="w-3.5 h-3.5 text-indigo-500" />
                              Videos:
                            </span>
                            <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                              {detailData.storage.categories.videos.formatted}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                              <FileText className="w-3.5 h-3.5 text-amber-500" />
                              Documentation:
                            </span>
                            <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                              {detailData.storage.categories.documents.formatted}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                              <Music className="w-3.5 h-3.5 text-purple-500" />
                              Audio:
                            </span>
                            <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                              {detailData.storage.categories.audio.formatted}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                              <FileCode className="w-3.5 h-3.5 text-slate-500" />
                              Other Files:
                            </span>
                            <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
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
                          Actual notification logs and lifecycle events in tenant database.
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
                          <strong>Audit Note:</strong> Storage counters reflect canonical SUCE values with zero un-reconciled counter drift.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODAL TAB 2: Department Breakdown Table */}
                {modalTab === "departments" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500">
                        Department allocations govern storage ceilings across organization divisions.
                      </p>
                      {detailData.storage.departmentBreakdown?.formattedUnassigned && (
                        <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                          Unassigned Pool: {detailData.storage.departmentBreakdown.formattedUnassigned}
                        </span>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/75 text-slate-600 dark:text-slate-400 font-semibold">
                            <th className="py-2.5 px-4">Department</th>
                            <th className="py-2.5 px-4">Allocated Quota</th>
                            <th className="py-2.5 px-4">Used Storage</th>
                            <th className="py-2.5 px-4 w-32">Utilization</th>
                            <th className="py-2.5 px-4">Employees</th>
                            <th className="py-2.5 px-4">Files</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                          {!detailData.storage.departmentBreakdown?.departments || detailData.storage.departmentBreakdown.departments.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-500">
                                No department storage breakdown records found.
                              </td>
                            </tr>
                          ) : (
                            detailData.storage.departmentBreakdown.departments.map((dept) => (
                              <tr key={dept.departmentId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                                  {dept.name}
                                </td>
                                <td className="py-2.5 px-4 font-mono">{dept.formattedAllocated}</td>
                                <td className="py-2.5 px-4 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                  {dept.formattedUsed}
                                </td>
                                <td className="py-2.5 px-4">
                                  <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                                    <span>{dept.percentUsed}%</span>
                                  </div>
                                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                    <div
                                      className="h-full bg-primary"
                                      style={{ width: `${Math.min(100, dept.percentUsed)}%` }}
                                    />
                                  </div>
                                </td>
                                <td className="py-2.5 px-4 text-slate-500">{dept.employeeCount}</td>
                                <td className="py-2.5 px-4 text-slate-500 font-mono">{dept.fileCount}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* MODAL TAB 3: Team Folders Table */}
                {modalTab === "teams" && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500">
                      Collaborative shared team workspaces consuming from the organization storage pool.
                    </p>

                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/75 text-slate-600 dark:text-slate-400 font-semibold">
                            <th className="py-2.5 px-4">Team Shared Workspace</th>
                            <th className="py-2.5 px-4">Members</th>
                            <th className="py-2.5 px-4">Storage Consumed</th>
                            <th className="py-2.5 px-4">Team Quota Limit</th>
                            <th className="py-2.5 px-4 w-32">Utilization</th>
                            <th className="py-2.5 px-4">Files</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                          {!detailData.storage.teams || detailData.storage.teams.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-500">
                                No collaborative team folders configured for this tenant.
                              </td>
                            </tr>
                          ) : (
                            detailData.storage.teams.map((tm) => (
                              <tr key={tm.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                  <Folder className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                                  {tm.name}
                                </td>
                                <td className="py-2.5 px-4 text-slate-500">{tm.memberCount} members</td>
                                <td className="py-2.5 px-4 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                  {tm.formattedUsed}
                                </td>
                                <td className="py-2.5 px-4 font-mono text-slate-500">{tm.formattedQuota}</td>
                                <td className="py-2.5 px-4">
                                  <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                                    <span>{tm.percentUsed}%</span>
                                  </div>
                                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                    <div
                                      className="h-full bg-amber-500"
                                      style={{ width: `${Math.min(100, tm.percentUsed)}%` }}
                                    />
                                  </div>
                                </td>
                                <td className="py-2.5 px-4 font-mono text-slate-500">{tm.fileCount}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* MODAL TAB 4: Top Users Leaderboard */}
                {modalTab === "users" && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500">
                      Top individual storage consumers in this tenant workspace.
                    </p>

                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/75 text-slate-600 dark:text-slate-400 font-semibold">
                            <th className="py-2.5 px-4">User</th>
                            <th className="py-2.5 px-4">Role</th>
                            <th className="py-2.5 px-4">Storage Used</th>
                            <th className="py-2.5 px-4">Allocated Quota</th>
                            <th className="py-2.5 px-4 w-32">Utilization</th>
                            <th className="py-2.5 px-4">Files</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                          {!detailData.storage.topUsers || detailData.storage.topUsers.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-500">
                                No individual user consumption records found.
                              </td>
                            </tr>
                          ) : (
                            detailData.storage.topUsers.map((usr) => (
                              <tr key={usr.userId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                <td className="py-2.5 px-4">
                                  <div className="font-semibold text-slate-900 dark:text-slate-100">{usr.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{usr.email}</div>
                                </td>
                                <td className="py-2.5 px-4 text-slate-500 capitalize">{usr.role}</td>
                                <td className="py-2.5 px-4 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                  {usr.formattedUsed}
                                </td>
                                <td className="py-2.5 px-4 font-mono text-slate-500">{usr.formattedQuota}</td>
                                <td className="py-2.5 px-4">
                                  <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                                    <span>{usr.percentUsed}%</span>
                                  </div>
                                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                    <div
                                      className="h-full bg-primary"
                                      style={{ width: `${Math.min(100, usr.percentUsed)}%` }}
                                    />
                                  </div>
                                </td>
                                <td className="py-2.5 px-4 font-mono text-slate-500">{usr.fileCount}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* MODAL TAB 5: Recent Storage Activity Timeline */}
                {modalTab === "activity" && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500">
                      Chronological immutable audit log of file uploads, soft-deletions, restorations, and link modifications.
                    </p>

                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/75 text-slate-600 dark:text-slate-400 font-semibold">
                            <th className="py-2.5 px-4">Action</th>
                            <th className="py-2.5 px-4">File / Asset</th>
                            <th className="py-2.5 px-4">Size</th>
                            <th className="py-2.5 px-4">Actor</th>
                            <th className="py-2.5 px-4">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                          {!detailData.storage.recentActivities || detailData.storage.recentActivities.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-500">
                                No recent file activities recorded for this tenant.
                              </td>
                            </tr>
                          ) : (
                            detailData.storage.recentActivities.map((act) => (
                              <tr key={act.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                <td className="py-2.5 px-4">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                                    {act.action}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-slate-100">
                                  {act.fileName || act.fileId}
                                </td>
                                <td className="py-2.5 px-4 font-mono text-slate-500">
                                  {act.formattedSize || "—"}
                                </td>
                                <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                                  {act.actorId ? act.actorId.slice(0, 8) + "..." : "System"}
                                </td>
                                <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                                  {formatDate(act.createdAt)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* MODAL TAB 6: Business & Module Telemetry */}
                {modalTab === "telemetry" && (
                  <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-5">
                    {/* User and Login Activity */}
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
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
