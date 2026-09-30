import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Activity,
  Search,
  Calendar,
  FileSpreadsheet,
  ChevronDown,
  Eye,
  RefreshCw,
  Ban,
  CheckCircle2,
  X,
  HardDrive,
  Users,
  Bell,
  Layers,
  Clock,
  Loader2,
  AlertTriangle
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
  logoUrl?: string;
  plan: string;
  billingCycle: string;
  activeUsers: number;
  maxUsers: number;
  userUsagePercentage: number;
  storageUsedGb: number;
  storageLimitGb: number;
  storagePercentage: number;
  mostModuleUsage: string[];
  status: "Active" | "Inactive";
  createdAt: string;
};

const COMPANY_AVATARS = [
  "/ui-assets/company/company-01.svg",
  "/ui-assets/company/company-02.svg",
  "/ui-assets/company/company-03.svg",
  "/ui-assets/company/company-04.svg",
  "/ui-assets/company/company-05.svg",
  "/ui-assets/company/company-06.svg",
  "/ui-assets/company/company-07.svg",
  "/ui-assets/company/company-08.svg",
  "/ui-assets/company/company-09.svg",
  "/ui-assets/company/company-10.svg",
];

export default function TenantUsageMetricsPage() {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [detailItem, setDetailItem] = useState<TenantUsageRecord | null>(null);
  const [banItem, setBanItem] = useState<TenantUsageRecord | null>(null);

  const { data: metrics = [], isLoading, refetch, isFetching } = useQuery<TenantUsageRecord[]>({
    queryKey: ["super-tenant-usage-metrics"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/super/tenant-usage-metrics");
        return Array.isArray(res) ? res : res?.data || [];
      } catch (err) {
        console.error("Failed to load tenant metrics", err);
        return [];
      }
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: "Active" | "Inactive" }) => {
      return api.put(`/api/super/tenants/${id}/status`, {
        status: newStatus === "Active" ? "active" : "suspended",
      });
    },
    onSuccess: (_, vars) => {
      toast.success(`Tenant marked as ${vars.newStatus}`);
      queryClient.invalidateQueries({ queryKey: ["super-tenant-usage-metrics"] });
      setBanItem(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update tenant status");
    },
  });

  const filteredMetrics = useMemo(() => {
    return metrics.filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.domainUrl.toLowerCase().includes(searchTerm.toLowerCase());

      const matchPlan =
        planFilter === "all" ? true : m.plan.toLowerCase().includes(planFilter.toLowerCase());

      const matchStatus =
        statusFilter === "all" ? true : m.status.toLowerCase() === statusFilter.toLowerCase();

      return matchSearch && matchPlan && matchStatus;
    }).sort((a, b) => {
      if (sortBy === "asc") return a.name.localeCompare(b.name);
      if (sortBy === "desc") return b.name.localeCompare(a.name);
      return b.activeUsers - a.activeUsers;
    });
  }, [metrics, searchTerm, planFilter, statusFilter, sortBy]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredMetrics.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMetrics.map((m) => m.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getCompanyAvatar = (idx: number) => {
    return COMPANY_AVATARS[idx % COMPANY_AVATARS.length];
  };

  const exportCSV = () => {
    const headers = ["Tenant", "Plan", "Active Users", "Modules", "Storage Used (GB)", "Status"];
    const rows = filteredMetrics.map((m) => [
      `"${m.name}"`,
      `"${m.plan}"`,
      m.activeUsers,
      `"${m.mostModuleUsage.join(", ")}"`,
      m.storageUsedGb,
      `"${m.status}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tenant_usage_metrics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Metrics exported to CSV");
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Tenant Usage Metrics
          </h2>
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
            <span className="hover:text-primary cursor-pointer">Super Admin</span>
            <span>/</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">Tenant Usage Metrics</span>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Dropdown */}
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors shadow-sm text-slate-700 dark:text-slate-200"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Quick Refresh */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-primary" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        {/* Card Header & Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base text-slate-800 dark:text-slate-100">
              Tenants Usage List
            </h3>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium">
              {filteredMetrics.length} workspaces
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search tenant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-slate-800 dark:text-slate-100 placeholder-slate-400"
              />
            </div>

            {/* Date Range dummy / styling matching UI */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-600 dark:text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>All Dates</span>
            </div>

            {/* Select Plan */}
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Select Plan</option>
              <option value="basic">Basic</option>
              <option value="advanced">Advanced</option>
              <option value="enterprise">Enterprise</option>
            </select>

            {/* Select Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Select Status</option>
              <option value="active">Active</option>
              <option value="inactive">InActive</option>
            </select>

            {/* Sort by */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="recent">Sort By: Highest Activity</option>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
              <p className="text-xs">Computing live storage and activity telemetry...</p>
            </div>
          ) : filteredMetrics.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <HardDrive className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No tenant records found</p>
              <p className="text-xs text-slate-400">Try adjusting your filters.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredMetrics.length && filteredMetrics.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-primary focus:ring-primary/20 h-3.5 w-3.5 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Tenants</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Active Users</th>
                  <th className="py-3 px-4">Most Module Usage</th>
                  <th className="py-3 px-4">Storage Usage</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredMetrics.map((m, idx) => {
                  const avatarSrc = getCompanyAvatar(idx);
                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(m.id)}
                          onChange={() => toggleSelect(m.id)}
                          className="rounded border-slate-300 text-primary focus:ring-primary/20 h-3.5 w-3.5 cursor-pointer"
                        />
                      </td>

                      {/* Tenants (Avatar + Name) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-800 flex items-center justify-center shrink-0">
                            <img
                              src={avatarSrc}
                              alt={m.name}
                              className="w-full h-full object-contain rounded-full"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          </div>
                          <div>
                            <span
                              onClick={() => setDetailItem(m)}
                              className="font-medium text-slate-800 dark:text-slate-100 hover:text-primary cursor-pointer"
                            >
                              {m.name}
                            </span>
                            <p className="text-[10px] text-slate-400 font-mono">{m.domainUrl}</p>
                          </div>
                        </div>
                      </td>

                      {/* Plan + Upgrade pill */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-700 dark:text-slate-300 font-medium">
                            {m.plan}
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40 cursor-pointer hover:bg-purple-100 transition-colors">
                            Upgrade
                          </span>
                        </div>
                      </td>

                      {/* Active Users */}
                      <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-200">
                        {m.activeUsers}
                      </td>

                      {/* Most Module Usage */}
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {m.mostModuleUsage.join(", ")}
                      </td>

                      {/* Storage Usage */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {m.storageUsedGb} GB
                          </span>
                          <span className="text-[10px] text-slate-400">
                            / {m.storageLimitGb} GB
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {m.status === "Active" ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            InActive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            title="View Tenant Usage Details"
                            onClick={() => setDetailItem(m)}
                            className="p-1 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Recalculate Metrics"
                            onClick={() => {
                              toast.info(`Recalculating quota for ${m.name}...`);
                              refetch();
                            }}
                            className="p-1 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title={m.status === "Active" ? "Suspend Workspace" : "Re-activate Workspace"}
                            onClick={() => setBanItem(m)}
                            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-colors"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Tenant Usage Detail Modal (matches ui-2/tenant-usage-metrics.html) */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h4 className="font-semibold text-base text-slate-900 dark:text-white">Tenant Usage Detail</h4>
              <button
                onClick={() => setDetailItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-6">
              {/* Tenant Top Bar */}
              <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 flex items-center justify-center">
                    <img
                      src="/ui-assets/company/company-01.svg"
                      alt={detailItem.name}
                      className="w-full h-full object-contain rounded-full"
                    />
                  </div>
                  <div>
                    <h5 className="font-semibold text-sm text-slate-800 dark:text-slate-100">{detailItem.name}</h5>
                    <p className="text-xs text-slate-400 font-mono">{detailItem.slug}@example.com</p>
                  </div>
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {detailItem.status}
                  </span>
                </div>
              </div>

              {/* Storage & Notification Info Rows */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Storage Usage Info */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-3">
                  <h5 className="font-semibold text-xs text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-primary" />
                    Storage Usage Info
                  </h5>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <span className="w-2 h-2 rounded-full bg-slate-600"></span> Database:
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {(detailItem.storageUsedGb * 0.4).toFixed(2)} GB
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <span className="w-2 h-2 rounded-full bg-sky-500"></span> Images:
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {(detailItem.storageUsedGb * 0.3).toFixed(2)} GB
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Videos:
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {(detailItem.storageUsedGb * 0.15).toFixed(2)} GB
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span> Documentation:
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {(detailItem.storageUsedGb * 0.1).toFixed(2)} GB
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <span className="w-2 h-2 rounded-full bg-primary"></span> Audio:
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {(detailItem.storageUsedGb * 0.05).toFixed(2)} GB
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notifications Info */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-3">
                  <h5 className="font-semibold text-xs text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-purple-600" />
                    Notifications Telemetry
                  </h5>
                  <div className="flex items-center justify-around py-3">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center mx-auto mb-1">
                        540
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">Push</span>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 font-bold text-sm flex items-center justify-center mx-auto mb-1">
                        920
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">Email</span>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full bg-sky-50 text-sky-600 font-bold text-sm flex items-center justify-center mx-auto mb-1">
                        310
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">SMS</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Basic Info & Module actions */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-4">
                <div>
                  <h6 className="font-semibold text-xs text-slate-800 dark:text-slate-200 mb-2">Basic Info</h6>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <p className="text-slate-400 text-[11px]">Active Users</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-100 mt-0.5">{detailItem.activeUsers}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[11px]">Total Logins</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-100 mt-0.5">{(detailItem.activeUsers * 220).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[11px]">Avg. Session Duration</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-100 mt-0.5">30 mins</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[11px]">Peak Usage Time</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-100 mt-0.5">10:00 AM – 12:00 PM</p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-700/60">
                  <h6 className="font-semibold text-xs text-slate-800 dark:text-slate-200 mb-2">Most Module Usage Info</h6>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <p className="text-slate-400 text-[11px]">HR Module</p>
                      <p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">2,430 actions</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[11px]">CRM Module</p>
                      <p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">1,890 actions</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[11px]">Payroll</p>
                      <p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">840 actions</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[11px]">Recruitment</p>
                      <p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">620 actions</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend / Ban Modal */}
      {banItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-sm w-full p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-base text-slate-900 dark:text-white">
              {banItem.status === "Active" ? "Suspend Workspace?" : "Re-activate Workspace?"}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to toggle status for <strong className="text-slate-700 dark:text-slate-200">{banItem.name}</strong>?
            </p>
            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                onClick={() => setBanItem(null)}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  toggleStatusMutation.mutate({
                    id: banItem.id,
                    newStatus: banItem.status === "Active" ? "Inactive" : "Active",
                  })
                }
                disabled={toggleStatusMutation.isPending}
                className="px-4 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-primary/20"
              >
                {toggleStatusMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
