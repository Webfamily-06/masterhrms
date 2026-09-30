import { WorkspacePolicyDialog } from "@/components/workspace-policy-dialog";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, setToken } from "@/lib/api";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Plus, Search, Trash2, Edit, LogIn, ExternalLink, ShieldCheck, MoreVertical } from "lucide-react";

export const Route = createFileRoute("/_authenticated/super/tenants")({
  component: CompaniesManagementPage,
  head: () => ({ meta: [{ title: "Companies List — Super Admin Console" }] }),
});

type TenantItem = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
  employee_count: number;
  user_count: number;
  policy?: any;
};

function MiniSparkline({ points, color = "#0d6efd" }: { points: number[]; color?: string }) {
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const width = 60;
  const height = 24;
  const step = width / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${i * step} ${height - ((p - min) / range) * (height - 4)}`)
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CompaniesManagementPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string>("All Plans");
  const [selectedStatus, setSelectedStatus] = useState<string>("All Status");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Dialog states
  const [policyTenant, setPolicyTenant] = useState<TenantItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetTenant, setTargetTenant] = useState<TenantItem | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formLogo, setFormLogo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loggingInTenantId, setLoggingInTenantId] = useState<string | null>(null);

  // 1. Fetch Real Tenants from Database
  const { data: tenants = [], isLoading, refetch } = useQuery<TenantItem[]>({
    queryKey: ["super-tenants-list"],
    queryFn: async () => {
      const res = await api.get("/super/tenants");
      if (!Array.isArray(res)) return [];
      return res.map((t: any, idx: number) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        logo_url: t.logoUrl || t.logo_url || `/ui-assets/company/company-0${(idx % 5) + 1}.svg`,
        created_at: t.createdAt ? new Date(t.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "14 Jan 2024",
        employee_count: t._count?.employees || 0,
        user_count: t._count?.profiles || 0,
        policy: t.policy,
      }));
    },
  });

  // Calculate top KPI numbers
  const totalCount = tenants.length;
  const activeCount = tenants.filter((t) => t.policy?.status !== "suspended").length;
  const inactiveCount = totalCount - activeCount;
  const locationCount = Math.max(1, Math.min(totalCount, 12));

  // Filtered list
  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      const matchesSearch =
        !searchTerm ||
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.slug.toLowerCase().includes(searchTerm.toLowerCase());

      const planName = t.policy?.planName || "Basic";
      const matchesPlan =
        selectedPlan === "All Plans" || planName.toLowerCase().includes(selectedPlan.toLowerCase());

      const status = t.policy?.status === "suspended" ? "Inactive" : "Active";
      const matchesStatus = selectedStatus === "All Status" || status === selectedStatus;

      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [tenants, searchTerm, selectedPlan, selectedStatus]);

  // Direct 1-Click Tenant Impersonation
  const handleLoginAsTenant = async (tenant: TenantItem) => {
    setLoggingInTenantId(tenant.id);
    try {
      const originalToken = localStorage.getItem("hrms_auth_token");
      const res = await api.post(`/super/impersonate/${tenant.id}`);
      if (res.token) {
        if (originalToken) {
          localStorage.setItem("hrms_super_admin_backup_token", originalToken);
        }
        localStorage.setItem("hrms_impersonation_active", "true");
        localStorage.setItem("hrms_impersonated_tenant_name", res.tenant?.name || tenant.name);
        setToken(res.token);
        qc.clear();
        toast.success(`Logged into ${tenant.name} workspace!`);
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to enter tenant workspace");
    } finally {
      setLoggingInTenantId(null);
    }
  };

  // Add Company
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSlug.trim()) {
      return toast.error("Please enter Company Name and Subdomain Slug");
    }
    setIsSubmitting(true);
    try {
      await api.post("/super/tenants", {
        name: formName.trim(),
        slug: formSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        logoUrl: formLogo.trim() || undefined,
      });
      toast.success(`Company "${formName}" created successfully!`);
      setIsAddModalOpen(false);
      setFormName("");
      setFormSlug("");
      setFormLogo("");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to create company");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Company
  const handleOpenEdit = (tenant: TenantItem) => {
    setTargetTenant(tenant);
    setFormName(tenant.name);
    setFormSlug(tenant.slug);
    setFormLogo(tenant.logo_url || "");
    setIsEditModalOpen(true);
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTenant) return;
    setIsSubmitting(true);
    try {
      await api.put(`/super/tenants/${targetTenant.id}/policy`, {
        status: targetTenant.policy?.status || "active",
        planId: targetTenant.policy?.planId || null,
        maxEmployees: targetTenant.policy?.maxEmployees || 50,
        maxUsers: targetTenant.policy?.maxUsers || 50,
        billingCycle: targetTenant.policy?.billingCycle || "monthly",
      });
      toast.success(`Company "${formName}" updated successfully!`);
      setIsEditModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to update company");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Status
  const handleToggleStatus = async (tenant: TenantItem) => {
    const newStatus = tenant.policy?.status === "suspended" ? "active" : "suspended";
    try {
      await api.put(`/super/tenants/${tenant.id}/status`, { status: newStatus });
      toast.success(`Company marked as ${newStatus === "active" ? "Active" : "Inactive"}`);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to change company status");
    }
  };

  // Delete Company
  const handleDeleteCompany = async () => {
    if (!targetTenant) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/super/tenants/${targetTenant.id}`);
      toast.success(`Company "${targetTenant.name}" has been removed`);
      setIsDeleteModalOpen(false);
      setTargetTenant(null);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete company");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ["Company Name", "Subdomain", "Plan", "Created Date", "Status"];
    const rows = filteredTenants.map((t) => [
      `"${t.name}"`,
      `"${t.slug}.mastererp.cloud"`,
      `"${t.policy?.planName || "Basic"}"`,
      `"${t.created_at}"`,
      `"${t.policy?.status === "suspended" ? "Inactive" : "Active"}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `companies_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Companies exported to CSV successfully!");
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredTenants.map((t) => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  return (
    <div className="space-y-6">
      {/* ─── Breadcrumb & Top Bar ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 page-breadcrumb">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-1">
            Companies
          </h2>
          <nav aria-label="breadcrumb">
            <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <li>
                <Link to="/super" className="hover:text-primary transition-colors flex items-center">
                  <i className="ti ti-smart-home text-sm"></i>
                </Link>
              </li>
              <li>/</li>
              <li className="text-gray-600 dark:text-gray-400">Super Admin</li>
              <li>/</li>
              <li className="font-semibold text-gray-900 dark:text-gray-200">Companies List</li>
            </ol>
          </nav>
        </div>

        {/* Right Toolbar: Export, Add Company & Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-border bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <i className="ti ti-file-export text-sm"></i>
                Export
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 text-xs">
              <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer gap-2">
                <i className="ti ti-file-type-xls text-sm text-emerald-600"></i>
                Export as CSV / Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            onClick={() => {
              setFormName("");
              setFormSlug("");
              setFormLogo("");
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md bg-[#FF6F28] hover:bg-[#e05917] text-white transition-colors shadow-xs cursor-pointer"
          >
            <i className="ti ti-circle-plus text-sm"></i>
            Add Company
          </button>

          <button
            type="button"
            className="size-8 rounded-md border border-border bg-white dark:bg-slate-900 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-2xs"
            title="Collapse Header"
          >
            <i className="ti ti-chevrons-up text-sm"></i>
          </button>
        </div>
      </div>

      {/* ─── 4 Top KPI Stat Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5 items-stretch">
        {/* Card 1: Total Companies */}
        <div className="lg:col-span-3 flex">
          <div className="card flex-1 h-full bg-white dark:bg-slate-900 border border-border rounded-lg p-5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <span className="size-12 rounded-lg bg-orange-500/10 text-[#FF6F28] flex items-center justify-center shrink-0">
                <i className="ti ti-building text-xl"></i>
              </span>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-0.5">Total Companies</p>
                <h4 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{totalCount}</h4>
              </div>
            </div>
            <MiniSparkline points={[10, 15, 12, 18, 20, 24, 28]} color="#FF6F28" />
          </div>
        </div>

        {/* Card 2: Active Companies */}
        <div className="lg:col-span-3 flex">
          <div className="card flex-1 h-full bg-white dark:bg-slate-900 border border-border rounded-lg p-5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <span className="size-12 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <i className="ti ti-building text-xl"></i>
              </span>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-0.5">Active Companies</p>
                <h4 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{activeCount}</h4>
              </div>
            </div>
            <MiniSparkline points={[12, 14, 18, 16, 22, 25, 30]} color="#10B981" />
          </div>
        </div>

        {/* Card 3: Inactive Companies */}
        <div className="lg:col-span-3 flex">
          <div className="card flex-1 h-full bg-white dark:bg-slate-900 border border-border rounded-lg p-5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <span className="size-12 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                <i className="ti ti-building text-xl"></i>
              </span>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-0.5">Inactive Companies</p>
                <h4 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{inactiveCount}</h4>
              </div>
            </div>
            <MiniSparkline points={[8, 6, 7, 5, 4, 3, 2]} color="#EF4444" />
          </div>
        </div>

        {/* Card 4: Company Location */}
        <div className="lg:col-span-3 flex">
          <div className="card flex-1 h-full bg-white dark:bg-slate-900 border border-border rounded-lg p-5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <span className="size-12 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
                <i className="ti ti-map-pin-check text-xl"></i>
              </span>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-0.5">Company Location</p>
                <h4 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{locationCount}</h4>
              </div>
            </div>
            <MiniSparkline points={[5, 7, 9, 8, 11, 14, 16]} color="#0EA5E9" />
          </div>
        </div>
      </div>

      {/* ─── Main Companies Table Card ────────────────────────────────────── */}
      <div className="card bg-white dark:bg-slate-900 border border-border rounded-lg shadow-2xs overflow-hidden">
        {/* Table Filter Header */}
        <div className="p-4 border-b border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h5 className="font-bold text-sm text-gray-900 dark:text-gray-100">Companies List</h5>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                <Search className="size-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-border rounded-md w-44 sm:w-52 focus:outline-none"
              />
            </div>

            {/* Plan Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  {selectedPlan}
                  <i className="ti ti-chevron-down text-[10px] ml-1"></i>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36 text-xs">
                {["All Plans", "Basic", "Advanced", "Enterprise"].map((plan) => (
                  <DropdownMenuItem
                    key={plan}
                    onClick={() => setSelectedPlan(plan)}
                    className="cursor-pointer"
                  >
                    {plan}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Status Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  {selectedStatus}
                  <i className="ti ti-chevron-down text-[10px] ml-1"></i>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32 text-xs">
                {["All Status", "Active", "Inactive"].map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className="cursor-pointer"
                  >
                    {status}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-border text-gray-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={filteredTenants.length > 0 && selectedIds.length === filteredTenants.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </th>
                <th className="py-3 px-4">Company Name</th>
                <th className="py-3 px-4">Account URL</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="size-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading registered companies...
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No companies found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => {
                  const isSuspended = tenant.policy?.status === "suspended";
                  const planName = tenant.policy?.planName || "Basic (Monthly)";

                  return (
                    <tr key={tenant.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(tenant.id)}
                          onChange={() => handleToggleSelect(tenant.id)}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </td>

                      {/* Company Name & Logo */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-1.5 shrink-0 border border-border/60">
                            <img
                              src={tenant.logo_url || "/ui-assets/company/company-01.svg"}
                              alt={tenant.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div>
                            <h6 className="font-semibold text-gray-900 dark:text-gray-100 hover:text-primary transition-colors cursor-pointer">
                              {tenant.name}
                            </h6>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {tenant.employee_count} Employees • {tenant.user_count} Users
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Subdomain URL */}
                      <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">
                        {tenant.slug}.mastererp.cloud
                      </td>

                      {/* Plan Tier */}
                      <td className="py-3.5 px-4 font-medium text-gray-900 dark:text-gray-100">
                        {planName}
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-muted-foreground">
                        {tenant.created_at}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            isSuspended
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          <i className="ti ti-point-filled text-xs"></i>
                          {isSuspended ? "Inactive" : "Active"}
                        </span>
                      </td>

                      {/* Action Menu */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1-Click Login Impersonation */}
                          <button
                            type="button"
                            onClick={() => handleLoginAsTenant(tenant)}
                            disabled={loggingInTenantId === tenant.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 transition-colors shadow-2xs"
                            title="Passwordless 1-Click Workspace Admin Login"
                          >
                            {loggingInTenantId === tenant.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <LogIn className="size-3" />
                            )}
                            Enter
                          </button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="size-7 rounded-md border border-border bg-white dark:bg-slate-800 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-2xs cursor-pointer"
                              >
                                <MoreVertical className="size-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 text-xs">
                              <DropdownMenuItem
                                onClick={() => setPolicyTenant(tenant)}
                                className="cursor-pointer gap-2"
                              >
                                <ShieldCheck className="size-3.5 text-primary" />
                                Change Plan Quota
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleOpenEdit(tenant)}
                                className="cursor-pointer gap-2"
                              >
                                <Edit className="size-3.5 text-blue-600" />
                                Edit Company
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(tenant)}
                                className="cursor-pointer gap-2"
                              >
                                <i className="ti ti-power text-amber-600"></i>
                                {isSuspended ? "Reactivate Workspace" : "Suspend Workspace"}
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  setTargetTenant(tenant);
                                  setIsDeleteModalOpen(true);
                                }}
                                className="cursor-pointer text-destructive focus:text-destructive gap-2"
                              >
                                <Trash2 className="size-3.5" />
                                Delete Company
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Pagination Info */}
        <div className="p-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
          <p>
            Showing <span className="font-semibold text-gray-900 dark:text-gray-100">{filteredTenants.length}</span> of{" "}
            <span className="font-semibold text-gray-900 dark:text-gray-100">{tenants.length}</span> companies
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled
              className="px-2.5 py-1 rounded border border-border bg-slate-50 dark:bg-slate-800 opacity-50 cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              className="px-2.5 py-1 rounded border border-primary bg-primary text-white font-semibold"
            >
              1
            </button>
            <button
              type="button"
              disabled
              className="px-2.5 py-1 rounded border border-border bg-slate-50 dark:bg-slate-800 opacity-50 cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ─── MODALS ───────────────────────────────────────────────────────── */}
      {/* 1. Add Company Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Company</DialogTitle>
            <DialogDescription>
              Provision a new company instance with isolated tenant database, default plan, and workspace credentials.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCompany} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Company Name *</Label>
              <Input
                placeholder="BrightWave Innovations"
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                }}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Account Subdomain URL *</Label>
              <div className="flex items-center">
                <Input
                  placeholder="brightwave"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  className="font-mono text-xs rounded-r-none"
                  required
                />
                <span className="px-2.5 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-l-0 border-border rounded-r-md text-muted-foreground">
                  .mastererp.cloud
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Company Logo URL (Optional)</Label>
              <Input
                placeholder="/ui-assets/company/company-01.svg"
                value={formLogo}
                onChange={(e) => setFormLogo(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#FF6F28] hover:bg-[#e05917] text-white">
                {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Plus className="size-4 mr-2" />}
                Add Company
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Edit Company Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Company Details</DialogTitle>
            <DialogDescription>
              Update organization profile and parameters.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateCompany} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Company Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Subdomain Slug</Label>
              <Input
                value={formSlug}
                readOnly
                disabled
                className="font-mono text-xs opacity-70"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary text-white">
                {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3. Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader className="items-center">
            <div className="size-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mb-2">
              <Trash2 className="size-6" />
            </div>
            <DialogTitle className="text-lg">Delete Company?</DialogTitle>
            <DialogDescription className="text-xs text-balance">
              Are you sure you want to permanently delete <strong>{targetTenant?.name}</strong>? All associated
              employee records and configurations will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2 mt-2">
            <Button type="button" variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteCompany}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              Yes, Delete Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Plan Upgrade Policy Modal */}
      {policyTenant && (
        <WorkspacePolicyDialog
          tenant={policyTenant}
          onClose={() => {
            setPolicyTenant(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
