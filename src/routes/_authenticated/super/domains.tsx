import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Globe,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Trash2,
  Calendar,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  ChevronsUp,
  X,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Check,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/super/domains")({
  component: SuperDomainsPage,
});

export type CustomDomainRecord = {
  id: string;
  domain: string;
  tenantId: string;
  tenantName: string;
  subdomain: string;
  targetCname: string;
  planName?: string;
  planType?: string;
  price?: string;
  status: "approved" | "pending" | "rejected";
  sslStatus?: "active" | "provisioning" | "failed";
  dnsStatus?: "verified" | "pending" | "failed";
  createdAt: string;
  expiryDate?: string;
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

export default function SuperDomainsPage() {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [detailDomain, setDetailDomain] = useState<CustomDomainRecord | null>(null);
  const [deleteDomain, setDeleteDomain] = useState<CustomDomainRecord | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New domain form
  const [newDomain, setNewDomain] = useState({
    tenantId: "",
    domain: "",
    subdomain: "",
    planName: "Advanced",
    planType: "Monthly",
    price: "200",
  });

  // Data queries
  const { data: domains = [], isLoading, refetch } = useQuery<CustomDomainRecord[]>({
    queryKey: ["super-custom-domains"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/super/domains");
        return Array.isArray(res) ? res : res?.data || [];
      } catch (err) {
        console.error("Failed to fetch domains", err);
        return [];
      }
    },
  });

  const { data: tenants = [] } = useQuery<any[]>({
    queryKey: ["super-tenants-list"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/super/tenants");
        return Array.isArray(res) ? res : res?.data || [];
      } catch {
        return [];
      }
    },
  });

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" | "pending" }) => {
      return api.put(`/api/super/domains/${id}/status`, { status });
    },
    onSuccess: (_, vars) => {
      toast.success(`Domain marked as ${vars.status}`);
      queryClient.invalidateQueries({ queryKey: ["super-custom-domains"] });
      if (detailDomain && detailDomain.id === vars.id) {
        setDetailDomain({ ...detailDomain, status: vars.status });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update domain status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/super/domains/${id}`);
    },
    onSuccess: () => {
      toast.success("Domain removed successfully");
      queryClient.invalidateQueries({ queryKey: ["super-custom-domains"] });
      setDeleteDomain(null);
      if (detailDomain && deleteDomain && detailDomain.id === deleteDomain.id) {
        setDetailDomain(null);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete domain");
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof newDomain) => {
      return api.post("/api/super/domains", payload);
    },
    onSuccess: () => {
      toast.success("New custom domain request created");
      queryClient.invalidateQueries({ queryKey: ["super-custom-domains"] });
      setIsAddModalOpen(false);
      setNewDomain({
        tenantId: "",
        domain: "",
        subdomain: "",
        planName: "Advanced",
        planType: "Monthly",
        price: "200",
      });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to register domain");
    },
  });

  // Filtered & sorted
  const filteredDomains = useMemo(() => {
    return domains.filter((d) => {
      const matchSearch =
        d.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.subdomain && d.subdomain.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchPlan =
        planFilter === "all"
          ? true
          : (d.planName?.toLowerCase().includes(planFilter.toLowerCase()) ||
             d.planType?.toLowerCase().includes(planFilter.toLowerCase()));

      const matchStatus =
        statusFilter === "all" ? true : d.status.toLowerCase() === statusFilter.toLowerCase();

      return matchSearch && matchPlan && matchStatus;
    }).sort((a, b) => {
      if (sortBy === "asc") return a.tenantName.localeCompare(b.tenantName);
      if (sortBy === "desc") return b.tenantName.localeCompare(a.tenantName);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [domains, searchTerm, planFilter, statusFilter, sortBy]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredDomains.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredDomains.map((d) => d.id));
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

  // Export CSV
  const exportCSV = () => {
    const headers = ["Company", "Domain URL", "Plan", "Price", "Created Date", "Status"];
    const rows = filteredDomains.map((d) => [
      `"${d.tenantName}"`,
      `"${d.domain}"`,
      `"${d.planName || "Advanced"} (${d.planType || "Monthly"})"`,
      `"$${d.price || "200"}"`,
      `"${d.createdAt}"`,
      `"${d.status}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `domain_list_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Domain list exported to CSV");
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Domain
          </h2>
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
            <span className="hover:text-primary cursor-pointer">Super Admin</span>
            <span>/</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">Domain List</span>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Dropdown */}
          <div className="relative group">
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors shadow-sm text-slate-700 dark:text-slate-200"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          </div>

          {/* Add Domain Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm shadow-primary/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Domain</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        {/* Card Header & Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base text-slate-800 dark:text-slate-100">Domain List</h3>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium">
              {filteredDomains.length} records
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search domain or company..."
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
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
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
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Sort by */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="recent">Sort By: Last 7 Days</option>
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
              <p className="text-xs">Loading domains from platform database...</p>
            </div>
          ) : filteredDomains.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Globe className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No domains found</p>
              <p className="text-xs text-slate-400">Try adjusting your search criteria or register a new domain.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredDomains.length && filteredDomains.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-primary focus:ring-primary/20 h-3.5 w-3.5 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Domain URL</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredDomains.map((d, idx) => {
                  const avatarSrc = getCompanyAvatar(idx);
                  return (
                    <tr
                      key={d.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(d.id)}
                          onChange={() => toggleSelect(d.id)}
                          className="rounded border-slate-300 text-primary focus:ring-primary/20 h-3.5 w-3.5 cursor-pointer"
                        />
                      </td>

                      {/* Name with Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-800 flex items-center justify-center shrink-0">
                            <img
                              src={avatarSrc}
                              alt={d.tenantName}
                              className="w-full h-full object-contain rounded-full"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          </div>
                          <div>
                            <span className="font-medium text-slate-800 dark:text-slate-100 hover:text-primary cursor-pointer">
                              {d.tenantName}
                            </span>
                            {d.subdomain && (
                              <p className="text-[10px] text-slate-400 font-mono">{d.subdomain}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Domain URL */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        <a
                          href={`https://${d.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:text-primary hover:underline"
                        >
                          {d.domain}
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </a>
                      </td>

                      {/* Plan */}
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {d.planName || "Advanced"} ({d.planType || "Monthly"})
                      </td>

                      {/* Created Date */}
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {d.createdAt}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {d.status === "approved" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                            <Check className="w-3 h-3" />
                            Approved
                          </span>
                        ) : d.status === "pending" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/40">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40">
                            <X className="w-3 h-3" />
                            Rejected
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            title="View Domain Details"
                            onClick={() => setDetailDomain(d)}
                            className="p-1 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Delete Domain"
                            onClick={() => setDeleteDomain(d)}
                            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Domain Details Modal (matches ui-2/domain.html) */}
      {detailDomain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-base text-slate-900 dark:text-white">Domain Detail</h4>
                {detailDomain.status === "approved" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Approved
                  </span>
                ) : detailDomain.status === "pending" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span> Pending
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Rejected
                  </span>
                )}
              </div>
              <button
                onClick={() => setDetailDomain(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Tenant Banner */}
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 flex items-center justify-center">
                    <img
                      src="/ui-assets/company/company-01.svg"
                      alt={detailDomain.tenantName}
                      className="w-full h-full object-contain rounded-full"
                    />
                  </div>
                  <div>
                    <h5 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                      {detailDomain.tenantName}
                    </h5>
                    <p className="text-xs text-slate-400 font-mono">{detailDomain.domain}</p>
                  </div>
                </div>

                {/* Quick Approve / Reject action buttons if pending or toggling */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateStatusMutation.mutate({ id: detailDomain.id, status: "approved" })}
                    disabled={updateStatusMutation.isPending || detailDomain.status === "approved"}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-colors disabled:opacity-40"
                  >
                    <Check className="w-3 h-3" />
                    Approve
                  </button>
                  <button
                    onClick={() => updateStatusMutation.mutate({ id: detailDomain.id, status: "rejected" })}
                    disabled={updateStatusMutation.isPending || detailDomain.status === "rejected"}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 transition-colors disabled:opacity-40"
                  >
                    <X className="w-3 h-3" />
                    Reject
                  </button>
                </div>
              </div>

              {/* Detail Grid */}
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Plan Name</span>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mt-0.5">
                    {detailDomain.planName || "Advanced"}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Plan Type</span>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mt-0.5">
                    {detailDomain.planType || "Monthly"}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Account URL</span>
                  <p className="text-xs font-mono text-slate-700 dark:text-slate-300 mt-0.5 truncate">
                    {detailDomain.domain}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Price</span>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mt-0.5">
                    ${detailDomain.price || "200"}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Register Date</span>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                    {detailDomain.createdAt}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Expiring On</span>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                    {detailDomain.expiryDate || "11 Oct 2026"}
                  </p>
                </div>
              </div>

              {/* DNS target help */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800 text-[11px] space-y-1">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Target CNAME:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">{detailDomain.targetCname}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>SSL Certificate:</span>
                  <span className="capitalize font-medium text-emerald-600">{detailDomain.sslStatus || "active"}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailDomain(null)}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteDomain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-sm w-full p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-base text-slate-900 dark:text-white">Delete Custom Domain?</h4>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to remove <strong className="text-slate-700 dark:text-slate-200">{deleteDomain.domain}</strong>? This will detach the custom domain from {deleteDomain.tenantName}.
            </p>
            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                onClick={() => setDeleteDomain(null)}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteDomain.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-rose-600/20"
              >
                {deleteMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Domain Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-semibold text-base text-slate-900 dark:text-white">Add Custom Domain</h4>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newDomain.tenantId || !newDomain.domain) {
                  toast.error("Please select a tenant and enter a domain");
                  return;
                }
                createMutation.mutate(newDomain);
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Tenant Organization *
                </label>
                <select
                  value={newDomain.tenantId}
                  onChange={(e) => {
                    const t = tenants.find((item) => item.id === e.target.value);
                    setNewDomain({
                      ...newDomain,
                      tenantId: e.target.value,
                      subdomain: t ? `${t.slug}.mastererp.cloud` : "",
                    });
                  }}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select Tenant Organization</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Custom Domain URL *
                </label>
                <input
                  type="text"
                  placeholder="e.g. portal.clientcorp.com"
                  value={newDomain.domain}
                  onChange={(e) => setNewDomain({ ...newDomain, domain: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Plan
                  </label>
                  <select
                    value={newDomain.planName}
                    onChange={(e) => setNewDomain({ ...newDomain, planName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="Basic">Basic</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Plan Billing
                  </label>
                  <select
                    value={newDomain.planType}
                    onChange={(e) => setNewDomain({ ...newDomain, planType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-primary/20"
                >
                  {createMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Register Domain
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
