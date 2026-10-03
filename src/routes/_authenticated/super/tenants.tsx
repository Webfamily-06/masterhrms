import { WorkspacePolicyDialog } from "@/components/workspace-policy-dialog";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, setToken } from "@/lib/api";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  Plus,
  Search,
  Trash2,
  Edit,
  LogIn,
  ShieldCheck,
  MoreVertical,
  Building2,
  AlertCircle,
  RefreshCw,
  LayoutList,
  LayoutGrid,
  Calendar,
  Mail,
  Users,
  UserCheck,
  Globe,
  KeyRound,
  Copy,
  Check,
  Info,
  ExternalLink,
  Clock,
  Briefcase,
  Sliders,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/super/tenants")({
  component: CompaniesManagementPage,
  head: () => ({ meta: [{ title: "Companies List — Super Admin Console" }] }),
});

type TenantItem = {
  id: string;
  name: string;
  slug: string;
  email?: string;
  logo_url: string | null;
  created_at: string;
  expires_at: string | null;
  employee_count: number;
  user_count: number;
  account_url: string;
  plan_name: string;
  /** Authoritative display status: "active" | "suspended" | "expired" */
  status: string;
  /** Raw TenantSubscription.status (may be null if no subscription row) */
  subscription_status?: string | null;
  timezone?: string;
  policy?: any;
};

type TenantDetails = TenantItem & {
  custom_domain?: string | null;
  department_count?: number;
  location_count?: number;
  subscription?: any;
  domains?: Array<{ id: string; domain: string; isPrimary: boolean; status: string }>;
  warehouses?: Array<{ id: string; name: string; email?: string }>;
  branches?: Array<{ id: string; name: string }>;
  adminUser?: { id: string; email: string; roles: any[] } | null;
  profiles?: Array<{
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    userId?: string;
    roles: string[];
  }>;
};

type TenantStats = {
  total: number;
  active: number;
  inactive: number;
  locations: number;
  totalPhysicalLocations?: number;
  sparklines: {
    total: number[];
    active: number[];
    inactive: number[];
    locations: number[];
  };
};

type SubscriptionPlanItem = {
  id: string;
  name: string;
  priceMonthly?: string | number;
  priceAnnual?: string | number;
  maxEmployees?: number;
  maxUsers?: number;
};

function MiniSparkline({ points, color = "#FF6F28" }: { points: number[]; color?: string }) {
  if (!points || points.length === 0) return null;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const width = 64;
  const height = 26;
  const step = width / Math.max(points.length - 1, 1);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${i * step} ${height - ((p - min) / range) * (height - 6)}`)
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Company Initial Avatar component for clean fallback without mock imagery
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
    lg: "size-14 text-base",
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
      className={`${sizeClasses} rounded-lg bg-orange-500/10 text-[#FF6F28] dark:bg-orange-950/40 dark:text-orange-400 font-bold flex items-center justify-center shrink-0 border border-orange-200/60 dark:border-orange-900/60 select-none shadow-2xs`}
    >
      {getInitials(name)}
    </div>
  );
}

function CompaniesManagementPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  // View mode switcher: "list" | "grid"
  const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
    const saved = localStorage.getItem("hrms_super_tenants_view_mode");
    return saved === "grid" ? "grid" : "list";
  });

  const handleSetViewMode = (mode: "list" | "grid") => {
    setViewMode(mode);
    localStorage.setItem("hrms_super_tenants_view_mode", mode);
  };

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string>("All Plans");
  const [selectedStatus, setSelectedStatus] = useState<string>("All Status");
  const [dateRange, setDateRange] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 12;

  // Dialog & Drawer states
  const [policyTenant, setPolicyTenant] = useState<TenantItem | null>(null);
  const [detailTenantId, setDetailTenantId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetTenant, setTargetTenant] = useState<TenantItem | null>(null);

  // Reset Password Dialog state
  const [resetTenant, setResetTenant] = useState<TenantItem | null>(null);
  const [resetMode, setResetMode] = useState<"auto" | "manual">("auto");
  const [customPassword, setCustomPassword] = useState("");
  const [customPasswordConfirm, setCustomPasswordConfirm] = useState("");
  const [resetResult, setResetResult] = useState<{
    accountEmail: string;
    temporaryPassword?: string;
  } | null>(null);
  const [hasCopiedPassword, setHasCopiedPassword] = useState(false);

  // Form states (Add / Edit)
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formLogo, setFormLogo] = useState("");
  const [formPlanId, setFormPlanId] = useState("");
  const [formTimezone, setFormTimezone] = useState("Asia/Kolkata");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [loggingInTenantId, setLoggingInTenantId] = useState<string | null>(null);
  const [togglingTenantId, setTogglingTenantId] = useState<string | null>(null);

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Reset page when filters change
  const handlePlanChange = (plan: string) => {
    setSelectedPlan(plan);
    setCurrentPage(1);
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    setCurrentPage(1);
  };

  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    setCurrentPage(1);
  };

  // 1. Fetch Summary Statistics from real PostgreSQL DB
  const {
    data: statsData,
    isLoading: isStatsLoading,
    refetch: refetchStats,
  } = useQuery<TenantStats>({
    queryKey: ["super-tenants-stats"],
    queryFn: async () => {
      return await api.get("/super/tenants/stats");
    },
    refetchInterval: 30000,
  });

  // 2. Fetch Available Subscription Plans from real database
  const { data: availablePlans = [] } = useQuery<SubscriptionPlanItem[]>({
    queryKey: ["super-available-plans"],
    queryFn: async () => {
      const res = await api.get("/super/plans");
      return Array.isArray(res) ? res : [];
    },
  });

  // 3. Fetch Real Paginated Tenants from database
  const {
    data: tenantsResponse,
    isLoading: isTableLoading,
    isFetching: isTableFetching,
    error: tableError,
    refetch: refetchTenants,
  } = useQuery<{
    data: TenantItem[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
    stats?: TenantStats;
  }>({
    queryKey: [
      "super-tenants-list",
      currentPage,
      pageSize,
      debouncedSearch,
      selectedPlan,
      selectedStatus,
      dateRange,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
        paginated: "true",
      });
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (selectedPlan !== "All Plans") params.set("plan", selectedPlan);
      if (selectedStatus !== "All Status") params.set("status", selectedStatus);
      if (dateRange !== "all") params.set("dateRange", dateRange);

      const res = await api.get(`/super/tenants?${params.toString()}`);
      if (res && res.data && res.pagination) {
        return res;
      }
      const list = Array.isArray(res) ? res : res?.data || [];
      return {
        data: list,
        pagination: {
          total: list.length,
          page: 1,
          limit: pageSize,
          totalPages: Math.ceil(list.length / pageSize) || 1,
        },
      };
    },
  });

  // 4. Fetch Full Company Information Details for Selected Tenant
  const {
    data: detailTenant,
    isLoading: isDetailLoading,
    error: detailError,
    refetch: refetchDetail,
  } = useQuery<TenantDetails>({
    queryKey: ["super-tenant-detail", detailTenantId],
    queryFn: async () => {
      if (!detailTenantId) return null as any;
      return await api.get(`/super/tenants/${detailTenantId}`);
    },
    enabled: Boolean(detailTenantId),
  });

  const tenants = tenantsResponse?.data || [];
  const pagination = tenantsResponse?.pagination || {
    total: 0,
    page: 1,
    limit: pageSize,
    totalPages: 1,
  };

  // Sync refetch both
  const refetchAll = () => {
    refetchStats();
    refetchTenants();
  };

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

  // Add Company Workflow
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
        planId: formPlanId || undefined,
      });
      toast.success(`Company "${formName}" created successfully!`);
      setIsAddModalOpen(false);
      setFormName("");
      setFormSlug("");
      setFormLogo("");
      setFormPlanId("");
      refetchAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to create company");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Company Workflow
  const handleOpenEdit = (tenant: TenantItem) => {
    setTargetTenant(tenant);
    setFormName(tenant.name);
    setFormSlug(tenant.slug);
    setFormEmail(tenant.email || "");
    setFormLogo(tenant.logo_url || "");
    setFormTimezone(tenant.timezone || "Asia/Kolkata");
    setIsEditModalOpen(true);
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTenant) return;
    if (!formName.trim()) return toast.error("Company name cannot be blank");
    setIsSubmitting(true);
    try {
      await api.put(`/super/tenants/${targetTenant.id}`, {
        name: formName.trim(),
        email: formEmail.trim() || undefined,
        logoUrl: formLogo.trim() || null,
        timezone: formTimezone.trim() || undefined,
      });
      toast.success(`Company "${formName}" updated successfully!`);
      setIsEditModalOpen(false);
      refetchAll();
      if (detailTenantId === targetTenant.id) {
        qc.invalidateQueries({ queryKey: ["super-tenant-detail", detailTenantId] });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update company");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Status Workflow
  const handleToggleStatus = async (tenant: TenantItem) => {
    if (togglingTenantId) return;
    const isSuspended = tenant.status === "suspended" || tenant.policy?.status === "suspended";
    const newStatus = isSuspended ? "active" : "suspended";
    setTogglingTenantId(tenant.id);
    try {
      await api.put(`/super/tenants/${tenant.id}/status`, { status: newStatus });
      toast.success(`Company workspace marked as ${newStatus === "active" ? "Active" : "Suspended"}`);
      refetchAll();
      if (detailTenantId === tenant.id) {
        qc.invalidateQueries({ queryKey: ["super-tenant-detail", detailTenantId] });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to change company status");
    } finally {
      setTogglingTenantId(null);
    }
  };

  // Reset Password Workflow
  const handleOpenResetPassword = (tenant: TenantItem) => {
    setResetTenant(tenant);
    setResetMode("auto");
    setCustomPassword("");
    setCustomPasswordConfirm("");
    setResetResult(null);
    setHasCopiedPassword(false);
  };

  const handleExecuteResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTenant) return;
    if (resetMode === "manual") {
      if (customPassword.length < 8) {
        return toast.error("Password must be at least 8 characters long");
      }
      if (customPassword !== customPasswordConfirm) {
        return toast.error("Password confirmation does not match");
      }
    }

    setIsSubmitting(true);
    try {
      const payload: any = {};
      if (resetMode === "manual") {
        payload.password = customPassword;
        payload.password_confirmation = customPasswordConfirm;
      }
      const res = await api.post(`/super/tenants/${resetTenant.id}/reset-password`, payload);
      setResetResult({
        accountEmail: res.accountEmail || resetTenant.email || "admin@workspace.com",
        temporaryPassword: res.temporaryPassword,
      });
      toast.success(res.message || "Password has been successfully updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Company Workflow
  const handleDeleteCompany = async () => {
    if (!targetTenant) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/super/tenants/${targetTenant.id}`);
      toast.success(`Company "${targetTenant.name}" has been permanently removed`);
      setIsDeleteModalOpen(false);
      setTargetTenant(null);
      if (detailTenantId === targetTenant.id) {
        setDetailTenantId(null);
      }
      refetchAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete company");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export to CSV using real database records
  const handleExportCSV = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (selectedPlan !== "All Plans") params.set("plan", selectedPlan);
      if (selectedStatus !== "All Status") params.set("status", selectedStatus);
      if (dateRange !== "all") params.set("dateRange", dateRange);

      const res = await api.get(`/super/tenants?${params.toString()}`);
      const exportList: TenantItem[] = Array.isArray(res) ? res : res?.data || [];

      if (exportList.length === 0) {
        return toast.error("No companies found to export");
      }

      const headers = [
        "Company Name",
        "Company Email",
        "Subdomain Slug",
        "Account URL",
        "Assigned Plan",
        "Employees",
        "Users",
        "Expiry Date",
        "Created Date",
        "Status",
      ];

      const rows = exportList.map((t) => [
        `"${(t.name || "").replace(/"/g, '""')}"`,
        `"${(t.email || `${t.slug}@mastererp.cloud`).replace(/"/g, '""')}"`,
        `"${t.slug}"`,
        `"${t.account_url || `${t.slug}.mastererp.cloud`}"`,
        `"${t.plan_name || "Unassigned"}"`,
        `"${t.employee_count ?? 0}"`,
        `"${t.user_count ?? 0}"`,
        `"${formatExpiryDate(t.expires_at, "N/A")}"`,
        `"${formatDate(t.created_at)}"`,
        `"${t.status === "suspended" ? "Suspended" : t.status === "expired" ? "Expired" : "Active"}"`,
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `companies_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Exported ${exportList.length} companies to CSV successfully!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to export companies");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(tenants.map((t) => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Safe date formatter for creation timestamp
  function formatDate(dateStr: string) {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  }

  // Authoritative subscription expiry date formatter
  function formatExpiryDate(dateStr: string | null | undefined, emptyLabel: string = "No expiry date") {
    if (!dateStr) return emptyLabel;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return emptyLabel;
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return emptyLabel;
    }
  }

  const dateFilterLabels: Record<string, string> = {
    all: "All Time",
    today: "Today",
    week: "Last 7 Days",
    month: "Last 30 Days",
    year: "This Year",
  };

  return (
    <div className="space-y-6">
      {/* ─── Breadcrumb & Top Bar ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 page-breadcrumb">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-1">
            Companies
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1.5">
            Manage and monitor multi-tenant company instances, subscription allocations, and operational statuses across the platform.
          </p>
          <nav aria-label="breadcrumb">
            <ol className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <li>
                <Link to="/super" className="hover:text-primary transition-colors flex items-center">
                  <i className="ti ti-smart-home text-sm"></i>
                </Link>
              </li>
              <li>/</li>
              <li className="text-slate-600 dark:text-slate-400">Super Admin</li>
              <li>/</li>
              <li className="font-semibold text-slate-900 dark:text-slate-200">Companies List</li>
            </ol>
          </nav>
        </div>

        {/* Right Toolbar: Export, Add Company & Refresh */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={isExporting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {isExporting ? <Loader2 className="size-3.5 animate-spin" /> : <i className="ti ti-file-export text-sm"></i>}
                Export
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-xs">
              <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer gap-2 font-medium">
                <i className="ti ti-file-type-xls text-sm text-emerald-600"></i>
                Export Filtered as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            onClick={() => {
              setFormName("");
              setFormSlug("");
              setFormLogo("");
              setFormPlanId(availablePlans[0]?.id || "");
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md bg-[#FF6F28] hover:bg-[#e05917] text-white transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="size-3.5" />
            Add Company
          </button>

          <button
            type="button"
            onClick={refetchAll}
            className="size-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors shadow-2xs cursor-pointer"
            title="Refresh Data"
            aria-label="Refresh Data"
          >
            <RefreshCw className={`size-3.5 ${isStatsLoading || isTableLoading ? "animate-spin text-primary" : ""}`} />
          </button>
        </div>
      </div>

      {/* ─── 4 Top KPI Stat Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5 items-stretch">
        {/* Card 1: Total Companies */}
        <div className="lg:col-span-3 flex">
          <div className="card flex-1 h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <span className="size-12 rounded-lg bg-orange-500/10 text-[#FF6F28] flex items-center justify-center shrink-0 border border-orange-200/50 dark:border-orange-900/50">
                <i className="ti ti-building text-xl"></i>
              </span>
              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-0.5">Total Companies</p>
                {isStatsLoading ? (
                  <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 animate-pulse rounded my-1" />
                ) : (
                  <h4 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    {statsData?.total ?? 0}
                  </h4>
                )}
              </div>
            </div>
            <MiniSparkline
              points={statsData?.sparklines?.total || [0, 0, 0, 0, 0, 0, 0]}
              color="#FF6F28"
            />
          </div>
        </div>

        {/* Card 2: Active Companies */}
        <div className="lg:col-span-3 flex">
          <div className="card flex-1 h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <span className="size-12 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200/50 dark:border-emerald-900/50">
                <i className="ti ti-building text-xl"></i>
              </span>
              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-0.5">Active Companies</p>
                {isStatsLoading ? (
                  <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 animate-pulse rounded my-1" />
                ) : (
                  <h4 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    {statsData?.active ?? 0}
                  </h4>
                )}
              </div>
            </div>
            <MiniSparkline
              points={statsData?.sparklines?.active || [0, 0, 0, 0, 0, 0, 0]}
              color="#10B981"
            />
          </div>
        </div>

        {/* Card 3: Inactive Companies */}
        <div className="lg:col-span-3 flex">
          <div className="card flex-1 h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <span className="size-12 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200/50 dark:border-rose-900/50">
                <i className="ti ti-building text-xl"></i>
              </span>
              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-0.5">Inactive Companies</p>
                {isStatsLoading ? (
                  <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 animate-pulse rounded my-1" />
                ) : (
                  <h4 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    {statsData?.inactive ?? 0}
                  </h4>
                )}
              </div>
            </div>
            <MiniSparkline
              points={statsData?.sparklines?.inactive || [0, 0, 0, 0, 0, 0, 0]}
              color="#EF4444"
            />
          </div>
        </div>

        {/* Card 4: Company Location */}
        <div className="lg:col-span-3 flex">
          <div className="card flex-1 h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <span className="size-12 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0 border border-sky-200/50 dark:border-sky-900/50">
                <i className="ti ti-map-pin-check text-xl"></i>
              </span>
              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-0.5">Company Locations</p>
                {isStatsLoading ? (
                  <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 animate-pulse rounded my-1" />
                ) : (
                  <h4 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    {statsData?.locations ?? 0}
                  </h4>
                )}
              </div>
            </div>
            <MiniSparkline
              points={statsData?.sparklines?.locations || [0, 0, 0, 0, 0, 0, 0]}
              color="#0EA5E9"
            />
          </div>
        </div>
      </div>

      {/* ─── Status Tabs & Controls Bar ───────────────────────────────────── */}
      <div className="card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs overflow-hidden">
        {/* Top Controls Row */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          {/* Status Tabs with real database counts */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-lg border border-slate-200 dark:border-slate-700 w-fit">
            <button
              type="button"
              onClick={() => handleStatusChange("All Status")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                selectedStatus === "All Status"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-600"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              All Companies
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold">
                {statsData?.total ?? 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleStatusChange("Active")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                selectedStatus === "Active"
                  ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200 dark:border-slate-600"
                  : "text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400"
              }`}
            >
              <i className="ti ti-point-filled text-xs text-emerald-500"></i>
              Active
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300/40 dark:border-emerald-700/40">
                {statsData?.active ?? 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleStatusChange("Inactive")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                selectedStatus === "Inactive"
                  ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs border border-slate-200 dark:border-slate-600"
                  : "text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400"
              }`}
            >
              <i className="ti ti-point-filled text-xs text-rose-500"></i>
              Inactive
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold border border-rose-300/40 dark:border-rose-700/40">
                {statsData?.inactive ?? 0}
              </span>
            </button>
          </div>

          {/* Right Filters & View Mode Switcher */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none">
                <Search className="size-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search name, slug, domain..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md w-48 sm:w-56 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              {isTableFetching ? (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Loader2 className="size-3 animate-spin text-[#FF6F28]" />
                </span>
              ) : searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs cursor-pointer"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              ) : null}
            </div>

            {/* Date Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
                >
                  <Calendar className="size-3.5 text-slate-500 dark:text-slate-400" />
                  <span>{dateFilterLabels[dateRange] || "All Time"}</span>
                  <i className="ti ti-chevron-down text-[10px] ml-0.5 text-slate-500"></i>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 text-xs">
                {Object.entries(dateFilterLabels).map(([key, label]) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => handleDateRangeChange(key)}
                    className={`cursor-pointer ${dateRange === key ? "font-bold text-primary bg-primary/5" : ""}`}
                  >
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Plan Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
                >
                  <Sliders className="size-3.5 text-slate-500 dark:text-slate-400 mr-0.5" />
                  {selectedPlan}
                  <i className="ti ti-chevron-down text-[10px] ml-1 text-slate-500"></i>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 text-xs">
                <DropdownMenuItem
                  onClick={() => handlePlanChange("All Plans")}
                  className={`cursor-pointer ${selectedPlan === "All Plans" ? "font-bold text-primary" : ""}`}
                >
                  All Plans
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handlePlanChange("Unassigned")}
                  className={`cursor-pointer ${selectedPlan === "Unassigned" ? "font-bold text-primary" : ""}`}
                >
                  Unassigned
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {availablePlans.map((plan) => (
                  <DropdownMenuItem
                    key={plan.id}
                    onClick={() => handlePlanChange(plan.name)}
                    className={`cursor-pointer ${selectedPlan === plan.name ? "font-bold text-primary" : ""}`}
                  >
                    {plan.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* List / Grid View Switcher */}
            <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-300 dark:border-slate-700">
              <button
                type="button"
                onClick={() => handleSetViewMode("list")}
                className={`p-1.5 rounded transition-all cursor-pointer ${
                  viewMode === "list"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
                title="List View"
                aria-label="List View"
              >
                <LayoutList className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => handleSetViewMode("grid")}
                className={`p-1.5 rounded transition-all cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
                title="Grid View"
                aria-label="Grid View"
              >
                <LayoutGrid className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ─── LIST VIEW ────────────────────────────────────────────────────── */}
        {viewMode === "list" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={tenants.length > 0 && selectedIds.length === tenants.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-slate-300 text-primary focus:ring-primary cursor-pointer size-3.5"
                    />
                  </th>
                  <th className="py-3 px-4">Company Name & Email</th>
                  <th className="py-3 px-4">Account URL</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Employees / Users</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                {isTableLoading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={`loading-row-${i}`} className="animate-pulse">
                      <td className="py-3.5 px-4 w-10">
                        <Skeleton className="size-3.5 rounded" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="size-8 rounded-lg shrink-0" />
                          <div className="space-y-1.5 flex-1 max-w-[180px]">
                            <Skeleton className="h-3.5 w-28 rounded" />
                            <Skeleton className="h-2.5 w-36 rounded" />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Skeleton className="h-3.5 w-32 rounded" />
                      </td>
                      <td className="py-3.5 px-4">
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </td>
                      <td className="py-3.5 px-4">
                        <Skeleton className="h-3.5 w-24 rounded" />
                      </td>
                      <td className="py-3.5 px-4">
                        <Skeleton className="h-3.5 w-20 rounded" />
                      </td>
                      <td className="py-3.5 px-4">
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Skeleton className="h-7 w-12 rounded" />
                          <Skeleton className="size-7 rounded" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : tableError ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center text-rose-600">
                      <AlertCircle className="size-6 mx-auto mb-2" />
                      Failed to load companies: {(tableError as any)?.message || "Unknown error"}
                      <div className="mt-2">
                        <Button size="sm" variant="outline" onClick={() => refetchTenants()}>
                          Retry
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : tenants.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-600 dark:text-slate-400">
                      <Building2 className="size-10 mx-auto mb-2 text-slate-400 dark:text-slate-600" />
                      <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">No companies found</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                        {debouncedSearch || selectedPlan !== "All Plans" || selectedStatus !== "All Status" || dateRange !== "all"
                          ? "No organizations matched your active search query or filter constraints."
                          : "No tenant workspaces have been registered in the database yet."}
                      </p>
                      {(debouncedSearch || selectedPlan !== "All Plans" || selectedStatus !== "All Status" || dateRange !== "all") && (
                        <Button
                          size="sm"
                          variant="link"
                          onClick={() => {
                            setSearchTerm("");
                            setSelectedPlan("All Plans");
                            setSelectedStatus("All Status");
                            setDateRange("all");
                          }}
                          className="mt-2 text-xs text-primary font-semibold"
                        >
                          Reset all filters
                        </Button>
                      )}
                    </td>
                  </tr>
                ) : (
                  tenants.map((tenant) => {
                    const isSuspended = tenant.status === "suspended";
                    const isExpired = tenant.status === "expired";
                    const isInactive = isSuspended || isExpired;
                    const planDisplayName = tenant.plan_name || "Unassigned";
                    const companyEmail = tenant.email || `${tenant.slug}@mastererp.cloud`;

                    return (
                      <tr
                        key={tenant.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(tenant.id)}
                            onChange={() => handleToggleSelect(tenant.id)}
                            className="rounded border-slate-300 text-primary focus:ring-primary cursor-pointer size-3.5"
                          />
                        </td>

                        {/* Company Name & Email */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <CompanyAvatar name={tenant.name} logoUrl={tenant.logo_url} size="md" />
                            <div className="min-w-0">
                              <h6
                                onClick={() => setDetailTenantId(tenant.id)}
                                className="font-bold text-slate-900 dark:text-slate-100 hover:text-primary transition-colors cursor-pointer truncate max-w-[200px] sm:max-w-xs"
                                title="View Company Details"
                              >
                                {tenant.name}
                              </h6>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 truncate max-w-[200px] sm:max-w-xs">
                                <Mail className="size-3 text-slate-400 shrink-0" />
                                <span className="truncate">{companyEmail}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Account URL / Custom Domain */}
                        <td className="py-3 px-4">
                          <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded border border-slate-300/70 dark:border-slate-700/70 select-all inline-block truncate max-w-[180px]">
                            {tenant.account_url || `${tenant.slug}.mastererp.cloud`}
                          </span>
                        </td>

                        {/* Plan Tier */}
                        <td className="py-3 px-4">
                          <span
                            className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                              planDisplayName === "Unassigned"
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-500 italic border border-slate-200 dark:border-slate-700"
                                : "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                            }`}
                          >
                            {planDisplayName}
                          </span>
                        </td>

                        {/* Employees / Users */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {tenant.employee_count}
                          </span>{" "}
                          <span className="text-slate-500 text-[11px]">Emp</span>
                          <span className="mx-1 text-slate-300 dark:text-slate-600">•</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {tenant.user_count}
                          </span>{" "}
                          <span className="text-slate-500 text-[11px]">Users</span>
                        </td>

                        {/* Expiry Date */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {tenant.expires_at ? (
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {formatExpiryDate(tenant.expires_at)}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">
                              N/A
                            </span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                              isSuspended
                                ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                                : isExpired
                                  ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${
                                isSuspended
                                  ? "bg-rose-600 dark:bg-rose-400"
                                  : isExpired
                                    ? "bg-amber-600 dark:bg-amber-400"
                                    : "bg-emerald-600 dark:bg-emerald-400"
                              }`}
                            />
                            {isSuspended ? "Suspended" : isExpired ? "Expired" : "Active"}
                          </span>
                        </td>

                        {/* Action Menu */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 1-Click Login Impersonation */}
                            <button
                              type="button"
                              onClick={() => handleLoginAsTenant(tenant)}
                              disabled={loggingInTenantId === tenant.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-[#FF6F28]/10 hover:bg-[#FF6F28]/20 text-[#FF6F28] dark:bg-orange-950/50 dark:text-orange-300 border border-orange-200 dark:border-orange-900 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                              title="Enter Tenant Workspace as Super Admin"
                              aria-label={`Enter workspace for ${tenant.name}`}
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
                                  className="size-7 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors shadow-2xs cursor-pointer"
                                  aria-label={`Actions for ${tenant.name}`}
                                >
                                  <MoreVertical className="size-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52 text-xs">
                                <DropdownMenuItem
                                  onClick={() => handleLoginAsTenant(tenant)}
                                  className="cursor-pointer gap-2 font-medium"
                                >
                                  <LogIn className="size-3.5 text-purple-600" />
                                  Enter Workspace
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => setDetailTenantId(tenant.id)}
                                  className="cursor-pointer gap-2 font-medium"
                                >
                                  <Info className="size-3.5 text-blue-600" />
                                  Company Information
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => setPolicyTenant(tenant)}
                                  className="cursor-pointer gap-2 font-medium"
                                >
                                  <ShieldCheck className="size-3.5 text-primary" />
                                  Upgrade / Change Plan
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => handleOpenResetPassword(tenant)}
                                  className="cursor-pointer gap-2 font-medium"
                                >
                                  <KeyRound className="size-3.5 text-amber-600" />
                                  Reset Password
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => handleToggleStatus(tenant)}
                                  disabled={togglingTenantId === tenant.id}
                                  className="cursor-pointer gap-2 font-medium"
                                >
                                  {togglingTenantId === tenant.id ? (
                                    <Loader2 className="size-3.5 animate-spin text-amber-600" />
                                  ) : (
                                    <i className="ti ti-power text-amber-600"></i>
                                  )}
                                  {isSuspended ? "Reactivate Workspace" : "Suspend Workspace"}
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => handleOpenEdit(tenant)}
                                  className="cursor-pointer gap-2 font-medium"
                                >
                                  <Edit className="size-3.5 text-slate-600 dark:text-slate-400" />
                                  Edit Company
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  onClick={() => {
                                    setTargetTenant(tenant);
                                    setIsDeleteModalOpen(true);
                                  }}
                                  className="cursor-pointer text-destructive focus:text-destructive gap-2 font-medium"
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
        ) : (
          /* ─── GRID VIEW ────────────────────────────────────────────────────── */
          <div className="p-5">
            {isTableLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={`loading-grid-${i}`}
                    className="card p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3.5 animate-pulse"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <Skeleton className="size-10 rounded-lg shrink-0" />
                        <div className="space-y-1.5 flex-1">
                          <Skeleton className="h-4 w-28 rounded" />
                          <Skeleton className="h-3 w-36 rounded" />
                        </div>
                      </div>
                      <Skeleton className="size-7 rounded" />
                    </div>

                    <Skeleton className="h-3 w-40 rounded" />

                    <div className="flex items-center justify-between pt-1">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-md">
                      <div className="space-y-1">
                        <Skeleton className="h-2.5 w-12 rounded" />
                        <Skeleton className="h-4 w-8 rounded" />
                      </div>
                      <div className="space-y-1">
                        <Skeleton className="h-2.5 w-12 rounded" />
                        <Skeleton className="h-4 w-8 rounded" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <Skeleton className="h-3 w-24 rounded" />
                      <Skeleton className="h-3 w-16 rounded" />
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <Skeleton className="h-8 flex-1 rounded-md" />
                      <Skeleton className="h-8 w-16 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            ) : tableError ? (
              <div className="py-16 text-center text-rose-600">
                <AlertCircle className="size-6 mx-auto mb-2" />
                Failed to load companies: {(tableError as any)?.message || "Unknown error"}
                <div className="mt-2">
                  <Button size="sm" variant="outline" onClick={() => refetchTenants()}>
                    Retry
                  </Button>
                </div>
              </div>
            ) : tenants.length === 0 ? (
              <div className="py-20 text-center text-slate-600 dark:text-slate-400">
                <Building2 className="size-12 mx-auto mb-3 text-slate-400 dark:text-slate-600" />
                <p className="font-semibold text-slate-900 dark:text-slate-100 text-base">No companies found</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  {debouncedSearch || selectedPlan !== "All Plans" || selectedStatus !== "All Status" || dateRange !== "all"
                    ? "Try adjusting your search criteria or filter options."
                    : "No tenant workspaces have been registered in the database yet."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tenants.map((tenant) => {
                  const isSuspended = tenant.status === "suspended";
                  const isExpired = tenant.status === "expired";
                  const planDisplayName = tenant.plan_name || "Unassigned";
                  const companyEmail = tenant.email || `${tenant.slug}@mastererp.cloud`;

                  return (
                    <div
                      key={tenant.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col justify-between hover:border-primary/50 transition-all shadow-2xs hover:shadow-xs group"
                    >
                      {/* Top Header: Avatar, Name & Menu */}
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <CompanyAvatar name={tenant.name} logoUrl={tenant.logo_url} size="md" />
                            <div className="min-w-0">
                              <h5
                                onClick={() => setDetailTenantId(tenant.id)}
                                className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors cursor-pointer truncate text-sm"
                                title={tenant.name}
                              >
                                {tenant.name}
                              </h5>
                              <p className="font-mono text-[11px] text-slate-500 truncate mt-0.5">
                                {tenant.account_url || `${tenant.slug}.mastererp.cloud`}
                              </p>
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="size-7 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors shadow-2xs cursor-pointer shrink-0"
                                aria-label={`Options for ${tenant.name}`}
                              >
                                <MoreVertical className="size-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 text-xs">
                              <DropdownMenuItem
                                onClick={() => handleLoginAsTenant(tenant)}
                                className="cursor-pointer gap-2 font-medium"
                              >
                                <LogIn className="size-3.5 text-purple-600" />
                                Enter Workspace
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => setDetailTenantId(tenant.id)}
                                className="cursor-pointer gap-2 font-medium"
                              >
                                <Info className="size-3.5 text-blue-600" />
                                Company Information
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => setPolicyTenant(tenant)}
                                className="cursor-pointer gap-2 font-medium"
                              >
                                <ShieldCheck className="size-3.5 text-primary" />
                                Upgrade / Change Plan
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleOpenResetPassword(tenant)}
                                className="cursor-pointer gap-2 font-medium"
                              >
                                <KeyRound className="size-3.5 text-amber-600" />
                                Reset Password
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(tenant)}
                                disabled={togglingTenantId === tenant.id}
                                className="cursor-pointer gap-2 font-medium"
                              >
                                {togglingTenantId === tenant.id ? (
                                  <Loader2 className="size-3.5 animate-spin text-amber-600" />
                                ) : (
                                  <i className="ti ti-power text-amber-600"></i>
                                )}
                                {isSuspended ? "Reactivate Workspace" : "Suspend Workspace"}
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleOpenEdit(tenant)}
                                className="cursor-pointer gap-2 font-medium"
                              >
                                <Edit className="size-3.5 text-slate-600 dark:text-slate-400" />
                                Edit Company
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => {
                                  setTargetTenant(tenant);
                                  setIsDeleteModalOpen(true);
                                }}
                                className="cursor-pointer text-destructive focus:text-destructive gap-2 font-medium"
                              >
                                <Trash2 className="size-3.5" />
                                Delete Company
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Email Row */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 mb-3 truncate">
                          <Mail className="size-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{companyEmail}</span>
                        </div>

                        {/* Plan & Status Badges */}
                        <div className="flex items-center gap-2 mb-3.5 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isSuspended
                                ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                                : isExpired
                                  ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${
                                isSuspended
                                  ? "bg-rose-600 dark:bg-rose-400"
                                  : isExpired
                                    ? "bg-amber-600 dark:bg-amber-400"
                                    : "bg-emerald-600 dark:bg-emerald-400"
                              }`}
                            />
                            {isSuspended ? "Suspended" : isExpired ? "Expired" : "Active"}
                          </span>

                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                              planDisplayName === "Unassigned"
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-500 italic border-slate-200 dark:border-slate-700"
                                : "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                            }`}
                          >
                            {planDisplayName}
                          </span>
                        </div>

                        {/* Metric Highlights */}
                        <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-200/80 dark:border-slate-800 mb-2.5 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Users className="size-3" /> Employees
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                              {tenant.employee_count}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <UserCheck className="size-3" /> Users
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                              {tenant.user_count}
                            </span>
                          </div>
                        </div>

                        {/* Expiry Date Highlight in Card */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-3 px-1">
                          <span className="flex items-center gap-1.5 truncate">
                            <Clock className="size-3 text-slate-400 shrink-0" />
                            <span>Expires:</span>
                            <span className={`font-semibold truncate ${tenant.expires_at ? "text-slate-800 dark:text-slate-200" : "text-slate-400 dark:text-slate-500 italic"}`}>
                              {formatExpiryDate(tenant.expires_at, "N/A")}
                            </span>
                          </span>
                          <span className="text-slate-400 dark:text-slate-500 text-[10px] shrink-0 ml-1">
                            Reg: {formatDate(tenant.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleLoginAsTenant(tenant)}
                          disabled={loggingInTenantId === tenant.id}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-md bg-[#FF6F28] hover:bg-[#e05917] text-white transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {loggingInTenantId === tenant.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <LogIn className="size-3.5" />
                          )}
                          Enter
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailTenantId(tenant.id)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── Table / Grid Footer Pagination Controls ──────────────────────── */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          <p>
            Showing{" "}
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            of{" "}
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {pagination.total}
            </span>{" "}
            companies
          </p>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isTableLoading}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs font-medium"
            >
              Previous
            </button>

            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              let pageNum: number;
              if (pagination.totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= pagination.totalPages - 2) {
                pageNum = pagination.totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              const isActive = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`size-7 rounded text-xs font-bold flex items-center justify-center transition-colors shadow-2xs cursor-pointer ${
                    isActive
                      ? "border border-[#FF6F28] bg-[#FF6F28] text-white"
                      : "border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={currentPage >= pagination.totalPages || isTableLoading}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs font-medium"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ─── MODALS & DRAWERS ──────────────────────────────────────────────── */}

      {/* 1. Company Information Drawer (Sheet) */}
      <Sheet open={Boolean(detailTenantId)} onOpenChange={(open) => !open && setDetailTenantId(null)}>
        <SheetContent
          side="right"
          className="company-info-drawer sm:max-w-md w-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800"
        >
          {/* Header pinned cleanly at the top of the drawer right below the topbar */}
          <SheetHeader className="p-5 pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 sticky top-0 z-10">
            <div className="flex items-center gap-3 pr-8">
              <CompanyAvatar
                name={detailTenant?.name || "Company"}
                logoUrl={detailTenant?.logo_url || null}
                size="md"
              />
              <div className="min-w-0">
                <SheetTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                  {detailTenant?.name || "Company Details"}
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 font-mono truncate">
                  {detailTenant?.account_url || `${detailTenant?.slug}.mastererp.cloud`}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {isDetailLoading ? (
            <div className="flex-1 overflow-y-auto p-5 space-y-5 animate-pulse">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-2.5 w-16 rounded" />
                    <Skeleton className="h-4 w-28 rounded" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  <Skeleton className="h-3 w-32 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
              </div>

              <div className="space-y-2.5">
                <Skeleton className="h-3 w-28 rounded" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <Skeleton className="h-2.5 w-16 rounded" />
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <Skeleton className="h-2.5 w-16 rounded" />
                    <Skeleton className="h-3 w-20 rounded" />
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <Skeleton className="h-2.5 w-16 rounded" />
                    <Skeleton className="h-3 w-20 rounded" />
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <Skeleton className="h-2.5 w-20 rounded" />
                    <Skeleton className="h-3 w-20 rounded" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Skeleton className="h-3 w-24 rounded" />
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-3.5 w-32 rounded" />
                    <Skeleton className="h-2.5 w-24 rounded" />
                  </div>
                  <Skeleton className="h-4 w-12 rounded" />
                </div>
              </div>
            </div>
          ) : detailError ? (
            <div className="flex-1 py-16 px-6 text-center text-rose-600">
              <AlertCircle className="size-6 mx-auto mb-2" />
              <p className="text-xs font-semibold">Failed to load company details</p>
              <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={() => refetchDetail()}>
                Retry
              </Button>
            </div>
          ) : detailTenant ? (
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {/* Subscription Status & Expiry Date Banner */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-0.5">
                      Subscription Tier
                    </span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {detailTenant.plan_name || "Unassigned"}
                    </span>
                  </div>
                  <div>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${
                        detailTenant.status === "suspended"
                          ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                          : detailTenant.status === "expired"
                            ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          detailTenant.status === "suspended"
                            ? "bg-rose-600 dark:bg-rose-400"
                            : detailTenant.status === "expired"
                              ? "bg-amber-600 dark:bg-amber-400"
                              : "bg-emerald-600 dark:bg-emerald-400"
                        }`}
                      />
                      {detailTenant.status === "suspended"
                        ? "Suspended"
                        : detailTenant.status === "expired"
                          ? "Expired"
                          : "Active"}
                    </span>
                  </div>
                </div>

                {/* Expiry Date Row */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1.5">
                    <Clock className="size-3.5 text-primary" />
                    Subscription Expiry Date:
                  </span>
                  <span className={`font-bold ${detailTenant.expires_at ? "text-slate-900 dark:text-slate-100" : "text-slate-400 dark:text-slate-500 italic"}`}>
                    {formatExpiryDate(detailTenant.expires_at, "No expiry date")}
                  </span>
                </div>
              </div>

              {/* Organization Metadata with Created Date & Expiry Date */}
              <div className="space-y-2.5">
                <h6 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider">
                  Organization Details
                </h6>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 block text-[10px] mb-0.5">Authoritative Email</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 truncate block select-all">
                      {detailTenant.email || "—"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 block text-[10px] mb-0.5">Timezone</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {detailTenant.timezone || "Asia/Kolkata"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 block text-[10px] mb-0.5">Created Date</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                      <Calendar className="size-3 text-slate-400" />
                      {formatDate(detailTenant.created_at)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 block text-[10px] mb-0.5">Subscription Expiry</span>
                    <span className={`font-semibold flex items-center gap-1 ${detailTenant.expires_at ? "text-slate-900 dark:text-slate-100" : "text-slate-400 italic"}`}>
                      <Clock className="size-3 text-slate-400" />
                      {formatExpiryDate(detailTenant.expires_at, "No expiry date")}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 col-span-2">
                    <span className="text-slate-500 block text-[10px] mb-0.5">Subdomain Slug</span>
                    <span className="font-semibold font-mono text-slate-900 dark:text-slate-100">
                      {detailTenant.slug}
                    </span>
                  </div>
                </div>
              </div>

              {/* Database Utilization Metrics */}
              <div className="space-y-2.5">
                <h6 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider">
                  Live Resource Utilization
                </h6>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 text-[10px] block">Employees</span>
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {detailTenant.employee_count}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 text-[10px] block">User Accounts</span>
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {detailTenant.user_count}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 text-[10px] block">Locations</span>
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {detailTenant.location_count ??
                        (detailTenant.branches?.length || 0) + (detailTenant.warehouses?.length || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Primary Admin Account */}
              {detailTenant.profiles && detailTenant.profiles.length > 0 && (
                <div className="space-y-2">
                  <h6 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider">
                    Primary Workspace Administrator
                  </h6>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">
                        {detailTenant.profiles[0].fullName || "Workspace Admin"}
                      </p>
                      <p className="text-xs text-slate-500">{detailTenant.profiles[0].email}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                      {detailTenant.profiles[0].roles?.[0] || "admin"}
                    </span>
                  </div>
                </div>
              )}

              {/* Quick Actions inside Drawer */}
              <div className="pt-2 flex flex-col gap-2">
                <Button
                  onClick={() => handleLoginAsTenant(detailTenant)}
                  className="w-full bg-[#FF6F28] hover:bg-[#e05917] text-white font-bold"
                >
                  <LogIn className="size-4 mr-2" />
                  Enter Workspace as Super Admin
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPolicyTenant(detailTenant);
                      setDetailTenantId(null);
                    }}
                    className="font-semibold text-xs"
                  >
                    <ShieldCheck className="size-3.5 mr-1.5 text-primary" />
                    Change Plan
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleOpenResetPassword(detailTenant);
                    }}
                    className="font-semibold text-xs"
                  >
                    <KeyRound className="size-3.5 mr-1.5 text-amber-600" />
                    Reset Password
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* 2. Reset Password Modal */}
      <Dialog open={Boolean(resetTenant)} onOpenChange={(open) => !open && setResetTenant(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="size-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mb-1">
              <KeyRound className="size-5" />
            </div>
            <DialogTitle>Reset Workspace Account Password</DialogTitle>
            <DialogDescription className="text-xs">
              Directly reset credentials for <strong>{resetTenant?.name}</strong>'s primary workspace administrator account.
            </DialogDescription>
          </DialogHeader>

          {resetResult ? (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-200 text-xs">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  Password Reset Successfully!
                </p>
                <p className="mt-1">
                  The password has been updated in Supabase PostgreSQL for account: <strong>{resetResult.accountEmail}</strong>.
                </p>
              </div>

              {resetResult.temporaryPassword && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Generated Temporary Password:
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={resetResult.temporaryPassword}
                      className="font-mono text-sm font-bold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(resetResult.temporaryPassword || "");
                        setHasCopiedPassword(true);
                        toast.success("Password copied to clipboard!");
                        setTimeout(() => setHasCopiedPassword(false), 2000);
                      }}
                      className="shrink-0"
                    >
                      {hasCopiedPassword ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Copy and share this temporary password with the tenant administrator.
                  </p>
                </div>
              )}

              <DialogFooter className="mt-4">
                <Button type="button" onClick={() => setResetTenant(null)} className="w-full">
                  Close
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleExecuteResetPassword} className="space-y-4 py-2">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <span className="text-slate-500 font-medium">Target Account Email:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 block select-all">
                  {resetTenant?.email || `${resetTenant?.slug}.admin@mastererp.cloud`}
                </span>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Reset Mode</Label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setResetMode("auto")}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                      resetMode === "auto"
                        ? "border-[#FF6F28] bg-orange-500/5 text-slate-900 dark:text-slate-100 font-bold"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Generate Temporary Password
                    <span className="block text-[10px] text-muted-foreground font-normal mt-0.5">
                      Auto-generate a secure random temporary password
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetMode("manual")}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                      resetMode === "manual"
                        ? "border-[#FF6F28] bg-orange-500/5 text-slate-900 dark:text-slate-100 font-bold"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Set Custom Password
                    <span className="block text-[10px] text-muted-foreground font-normal mt-0.5">
                      Enter a specific password manually
                    </span>
                  </button>
                </div>
              </div>

              {resetMode === "manual" && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">New Password (min 8 chars) *</Label>
                    <Input
                      type="password"
                      placeholder="••••••••••••"
                      value={customPassword}
                      onChange={(e) => setCustomPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Confirm New Password *</Label>
                    <Input
                      type="password"
                      placeholder="••••••••••••"
                      value={customPasswordConfirm}
                      onChange={(e) => setCustomPasswordConfirm(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setResetTenant(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-[#FF6F28] hover:bg-[#e05917] text-white">
                  {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : <KeyRound className="size-4 mr-2" />}
                  Confirm Password Reset
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 3. Add Company Modal */}
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
                <span className="px-2.5 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-l-0 border-slate-300 dark:border-slate-700 rounded-r-md text-muted-foreground whitespace-nowrap">
                  .mastererp.cloud
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Initial Subscription Plan</Label>
              <select
                className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-background px-3 text-xs"
                value={formPlanId}
                onChange={(e) => setFormPlanId(e.target.value)}
              >
                <option value="">Unassigned (No Initial Plan)</option>
                {availablePlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} {plan.priceMonthly ? `(₹${plan.priceMonthly}/mo)` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Company Logo URL (Optional)</Label>
              <Input
                placeholder="https://example.com/logo.png"
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

      {/* 4. Edit Company Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Company Details</DialogTitle>
            <DialogDescription>
              Update organization profile, primary contact email, and parameters in database.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateCompany} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Company Name *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Company Name"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Company Email (Synced with Admin Account)</Label>
              <Input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="admin@company.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Subdomain Slug</Label>
              <Input
                value={formSlug}
                readOnly
                disabled
                className="font-mono text-xs opacity-70 cursor-not-allowed bg-slate-50 dark:bg-slate-800"
              />
              <p className="text-[10px] text-muted-foreground">
                Workspace subdomains cannot be changed directly to avoid breaking DNS routing.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Timezone</Label>
              <select
                className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-background px-3 text-xs"
                value={formTimezone}
                onChange={(e) => setFormTimezone(e.target.value)}
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Company Logo URL</Label>
              <Input
                value={formLogo}
                onChange={(e) => setFormLogo(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#FF6F28] hover:bg-[#e05917] text-white">
                {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader className="items-center">
            <div className="size-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mb-2">
              <Trash2 className="size-6" />
            </div>
            <DialogTitle className="text-lg">Delete Company?</DialogTitle>
            <DialogDescription className="text-xs text-balance">
              Are you sure you want to permanently delete <strong>{targetTenant?.name}</strong>? All associated
              employee records, workspace policies, and configurations will be removed.
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

      {/* 6. Plan Upgrade Policy Modal */}
      {policyTenant && (
        <WorkspacePolicyDialog
          tenant={policyTenant}
          onClose={() => {
            setPolicyTenant(null);
            refetchAll();
          }}
        />
      )}
    </div>
  );
}
