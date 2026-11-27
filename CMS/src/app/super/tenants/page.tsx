'use client';

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@/src/lib/router-compat";
import { api, API_BASE, setToken } from "@/lib/api";
import { getPlatformBaseDomain } from "@/lib/platform-domain";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
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
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  KeyRound,
  Copy,
  Check,
  Info,
  ExternalLink,
  Clock,
  X,
  Puzzle,
  Sliders,
  CheckCircle2,
  HardDrive,
  History,
  Download,
  UserX,
  RotateCcw,
  AlertTriangle,
  Power,
  Ban,
} from "lucide-react";

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
  status: string;
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
  maxEmployees?: number | null;
  maxUsers?: number | null;
};

type OffboardingItem = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  status: "pending" | "cancelled" | "purged";
  reason: string;
  graceDays: number;
  initiatedAt: string;
  purgeEligibleAt: string;
  initiatedBy: string;
  daysRemaining: number;
  isPurgeEligible?: boolean;
};

type GovernanceTab = "policy" | "quota" | "addons" | "slug-history" | "offboarding";

function MiniSparkline({ points, color = "#0d6efd" }: { points: number[]; color?: string }) {
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
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
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
        className={`${sizeClasses} rounded-lg bg-muted flex items-center justify-center p-1 shrink-0 border border-border overflow-hidden shadow-2xs`}
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
      className={`${sizeClasses} rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 border border-primary/20 select-none shadow-2xs`}
    >
      {getInitials(name)}
    </div>
  );
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

function formatExpiryDate(dateStr: string | null | undefined, emptyLabel = "No expiry date") {
  if (!dateStr) return emptyLabel;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return emptyLabel;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return emptyLabel;
  }
}

function CompaniesManagementPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
    if (typeof window === "undefined") return "list";
    const saved = localStorage.getItem("hrms_super_tenants_view_mode");
    return saved === "grid" ? "grid" : "list";
  });

  const handleSetViewMode = (mode: "list" | "grid") => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("hrms_super_tenants_view_mode", mode);
    }
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
  const [governanceTenant, setGovernanceTenant] = useState<TenantItem | null>(null);
  const [governanceTab, setGovernanceTab] = useState<GovernanceTab>("policy");
  const [detailTenantId, setDetailTenantId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState("");
  const [targetTenant, setTargetTenant] = useState<TenantItem | null>(null);

  // Confirmations
  const [statusToggleTarget, setStatusToggleTarget] = useState<TenantItem | null>(null);
  const [bulkActionConfirm, setBulkActionConfirm] = useState<"suspend" | "reactivate" | null>(null);
  const [isBulkExecuting, setIsBulkExecuting] = useState(false);

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

  // Add / Edit form states
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

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

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

  // 1. Summary Statistics
  const { data: statsData, isLoading: isStatsLoading, refetch: refetchStats } = useQuery<TenantStats>({
    queryKey: ["super-tenants-stats"],
    queryFn: async () => {
      const res = await api.get("/super/tenants/stats");
      return res?.data || res || {};
    },
    refetchInterval: 30000,
  });

  // 2. Available Subscription Plans
  const { data: availablePlans = [] } = useQuery<SubscriptionPlanItem[]>({
    queryKey: ["super-available-plans"],
    queryFn: async () => {
      const res = await api.get("/super/plans");
      const unwrapped = res?.data || res;
      return Array.isArray(unwrapped) ? unwrapped : unwrapped?.plans || [];
    },
  });

  // 3. Pending Offboarding Queue
  const { data: offboardingQueue = [], refetch: refetchOffboarding } = useQuery<OffboardingItem[]>({
    queryKey: ["super-lifecycle-offboarding"],
    queryFn: async () => {
      try {
        const res = await api.get("/super/lifecycle/offboarding");
        const unwrapped = res?.data || res || {};
        return Array.isArray(unwrapped.items) ? unwrapped.items : [];
      } catch {
        return [];
      }
    },
  });

  const offboardingByTenantId = useMemo(() => {
    const map = new Map<string, OffboardingItem>();
    for (const item of offboardingQueue) {
      if (item.status === "pending") map.set(item.tenantId, item);
    }
    return map;
  }, [offboardingQueue]);

  // 4. Paginated Tenants List
  const {
    data: tenantsResponse,
    isLoading: isTableLoading,
    isFetching: isTableFetching,
    error: tableError,
    refetch: refetchTenants,
  } = useQuery<{
    data: TenantItem[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
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
      if (res && res.data && res.pagination) return res;
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

  // 5. Full Company Information Details
  const {
    data: detailTenant,
    isLoading: isDetailLoading,
    error: detailError,
    refetch: refetchDetail,
  } = useQuery<TenantDetails>({
    queryKey: ["super-tenant-detail", detailTenantId],
    queryFn: async () => {
      if (!detailTenantId) return null as any;
      const res = await api.get(`/super/tenants/${detailTenantId}`);
      return res?.data || res;
    },
    enabled: Boolean(detailTenantId),
  });

  const tenants = tenantsResponse?.data || [];
  const pagination = tenantsResponse?.pagination || { total: 0, page: 1, limit: pageSize, totalPages: 1 };

  const refetchAll = () => {
    refetchStats();
    refetchTenants();
    refetchOffboarding();
  };

  const openGovernance = (tenant: TenantItem, tab: GovernanceTab = "policy") => {
    setGovernanceTenant(tenant);
    setGovernanceTab(tab);
  };

  // Clean Impersonation (stores token without embedding token in URL)
  const handleLoginAsTenant = async (tenant: TenantItem) => {
    setLoggingInTenantId(tenant.id);
    try {
      const originalToken = localStorage.getItem("hrms_auth_token");
      const res = await api.post(`/super/impersonate/${tenant.id}`);
      const payload = res?.data || res || {};
      if (payload.token) {
        if (originalToken) {
          localStorage.setItem("hrms_super_admin_backup_token", originalToken);
        }
        localStorage.setItem("hrms_impersonation_active", "true");
        localStorage.setItem("hrms_impersonated_tenant_name", payload.tenant?.name || tenant.name);
        setToken(payload.token);
        qc.clear();
        toast.success(`Logged into ${tenant.name} workspace!`);
        navigate({ to: "/hrm-dashboard" });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to enter tenant workspace");
    } finally {
      setLoggingInTenantId(null);
    }
  };

  // Create Company
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
      toast.error(err?.message || "Failed to create company");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Company
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
      toast.error(err?.message || "Failed to update company");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Single Toggle Status (confirmed via ConfirmationDialog)
  const executeToggleStatus = async (tenant: TenantItem) => {
    const isSuspended = tenant.status === "suspended" || tenant.policy?.status === "suspended";
    const newStatus = isSuspended ? "active" : "suspended";
    setTogglingTenantId(tenant.id);
    try {
      if (newStatus === "suspended") {
        await api.post(`/super/tenants/${tenant.id}/suspend`, {
          reason: "Suspended by Super Admin from Companies Console",
        });
      } else {
        await api.post(`/super/tenants/${tenant.id}/reactivate`, {});
      }
      toast.success(`Company workspace marked as ${newStatus === "active" ? "Active" : "Suspended"}`);
      setStatusToggleTarget(null);
      refetchAll();
      if (detailTenantId === tenant.id) {
        qc.invalidateQueries({ queryKey: ["super-tenant-detail", detailTenantId] });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to change company status");
    } finally {
      setTogglingTenantId(null);
    }
  };

  // Bulk Suspend / Reactivate
  const executeBulkAction = async () => {
    if (!bulkActionConfirm || selectedIds.length === 0) return;
    setIsBulkExecuting(true);
    let succeeded = 0;
    let failed = 0;
    for (const id of selectedIds) {
      try {
        if (bulkActionConfirm === "suspend") {
          await api.post(`/super/tenants/${id}/suspend`, {
            reason: "Bulk suspended by Super Admin",
          });
        } else {
          await api.post(`/super/tenants/${id}/reactivate`, {});
        }
        succeeded += 1;
      } catch {
        failed += 1;
      }
    }
    setIsBulkExecuting(false);
    setBulkActionConfirm(null);
    setSelectedIds([]);
    refetchAll();
    const verb = bulkActionConfirm === "suspend" ? "Suspended" : "Reactivated";
    if (failed === 0) {
      toast.success(`${verb} ${succeeded} workspace(s) successfully.`);
    } else {
      toast.warning(`${verb} ${succeeded} workspace(s); ${failed} failed.`);
    }
  };

  // Reset Password
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
      if (customPassword.length < 8) return toast.error("Password must be at least 8 characters long");
      if (customPassword !== customPasswordConfirm) return toast.error("Password confirmation does not match");
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
      toast.error(err?.message || "Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Slug-confirmed Permanent Delete
  const handleDeleteCompany = async () => {
    if (!targetTenant) return;
    if (deleteConfirmSlug.trim().toLowerCase() !== targetTenant.slug.toLowerCase()) {
      toast.error(`Please type "${targetTenant.slug}" to confirm permanent deletion.`);
      return;
    }
    setIsSubmitting(true);
    try {
      await api.delete(`/super/tenants/${targetTenant.id}`, {
        data: { confirm: deleteConfirmSlug.trim() },
      });
      toast.success(`Company "${targetTenant.name}" has been permanently removed`);
      setIsDeleteModalOpen(false);
      setDeleteConfirmSlug("");
      setTargetTenant(null);
      if (detailTenantId === targetTenant.id) setDetailTenantId(null);
      refetchAll();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete company");
    } finally {
      setIsSubmitting(false);
    }
  };

  // CSV Export helper (supports filtered all or selected subset)
  const downloadTenantsCsv = (exportList: TenantItem[], prefix: string) => {
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
      `"${(t.email || `${t.slug}@${getPlatformBaseDomain()}`).replace(/"/g, '""')}"`,
      `"${t.slug}"`,
      `"${t.account_url || `${t.slug}.${getPlatformBaseDomain()}`}"`,
      `"${t.plan_name || "Unassigned"}"`,
      `"${t.employee_count ?? 0}"`,
      `"${t.user_count ?? 0}"`,
      `"${formatExpiryDate(t.expires_at, "N/A")}"`,
      `"${formatDate(t.created_at)}"`,
      `"${t.status === "suspended" ? "Inactive" : t.status === "expired" ? "Expired" : "Active"}"`,
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${prefix}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${exportList.length} companies to CSV.`);
  };

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
      downloadTenantsCsv(exportList, "companies_export");
    } catch (err: any) {
      toast.error(err?.message || "Failed to export companies");
    } finally {
      setIsExporting(false);
    }
  };

  const handleBulkExportCSV = () => {
    const selected = tenants.filter((t) => selectedIds.includes(t.id));
    downloadTenantsCsv(selected, "selected_companies");
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? tenants.map((t) => t.id) : []);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const dateFilterLabels: Record<string, string> = {
    all: "All Time",
    today: "Today",
    week: "Last 7 Days",
    month: "Last 30 Days",
    year: "This Year",
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Companies & Tenant Governance"
        description="Provision workspaces, manage subscription policies, storage quotas, add-on entitlements, slug history, and GDPR offboarding lifecycles."
        icon={Building2}
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExporting} className="gap-1.5 text-xs">
                  {isExporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 text-xs">
                <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer gap-2 font-medium">
                  <Download className="size-3.5 text-emerald-600" />
                  Export Filtered as CSV
                </DropdownMenuItem>
                {selectedIds.length > 0 && (
                  <DropdownMenuItem onClick={handleBulkExportCSV} className="cursor-pointer gap-2 font-medium">
                    <CheckCircle2 className="size-3.5 text-primary" />
                    Export Selected ({selectedIds.length}) CSV
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="sm"
              onClick={() => {
                setFormName("");
                setFormSlug("");
                setFormLogo("");
                setFormPlanId(availablePlans[0]?.id || "");
                setIsAddModalOpen(true);
              }}
              className="gap-1.5 text-xs"
            >
              <Plus className="size-3.5" />
              Add Company
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={refetchAll}
              title="Refresh Data"
              aria-label="Refresh Data"
            >
              <RefreshCw className={`size-3.5 ${isStatsLoading || isTableLoading ? "animate-spin text-primary" : ""}`} />
            </Button>
          </>
        }
      />

      {/* Pending Offboarding Banner */}
      {offboardingQueue.length > 0 && (
        <Alert variant="warning">
          <UserX className="size-4" />
          <AlertTitle className="text-xs font-bold">
            {offboardingQueue.length} Workspace{offboardingQueue.length === 1 ? "" : "s"} Scheduled for Offboarding
          </AlertTitle>
          <AlertDescription className="text-xs flex flex-wrap items-center gap-2 mt-1">
            {offboardingQueue.slice(0, 4).map((item) => (
              <Badge
                key={item.tenantId}
                variant="outline"
                className="text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 cursor-pointer"
                onClick={() => {
                  const found = tenants.find((t) => t.id === item.tenantId);
                  if (found) {
                    openGovernance(found, "offboarding");
                  } else {
                    openGovernance(
                      {
                        id: item.tenantId,
                        name: item.tenantName,
                        slug: item.tenantSlug,
                        logo_url: null,
                        created_at: item.initiatedAt,
                        expires_at: null,
                        employee_count: 0,
                        user_count: 0,
                        account_url: `${item.tenantSlug}.${getPlatformBaseDomain()}`,
                        plan_name: "Suspended",
                        status: "suspended",
                      },
                      "offboarding"
                    );
                  }
                }}
              >
                {item.tenantName} ({item.daysRemaining}d left)
              </Badge>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* 4 Top KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-border/80 rounded-xl bg-card shadow-xs p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="size-11 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <Building2 className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Total Companies</p>
              {isStatsLoading ? (
                <Skeleton className="h-7 w-14 mt-1" />
              ) : (
                <h4 className="text-2xl font-bold tracking-tight text-foreground">{statsData?.total ?? 0}</h4>
              )}
            </div>
          </div>
          <MiniSparkline points={statsData?.sparklines?.total || [0, 0, 0, 0, 0, 0, 0]} color="#0d6efd" />
        </div>

        <div className="border border-border/80 rounded-xl bg-card shadow-xs p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="size-11 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Active Companies</p>
              {isStatsLoading ? (
                <Skeleton className="h-7 w-14 mt-1" />
              ) : (
                <h4 className="text-2xl font-bold tracking-tight text-foreground">{statsData?.active ?? 0}</h4>
              )}
            </div>
          </div>
          <MiniSparkline points={statsData?.sparklines?.active || [0, 0, 0, 0, 0, 0, 0]} color="#16a34a" />
        </div>

        <div className="border border-border/80 rounded-xl bg-card shadow-xs p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="size-11 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20 flex items-center justify-center shrink-0">
              <Ban className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Inactive / Suspended</p>
              {isStatsLoading ? (
                <Skeleton className="h-7 w-14 mt-1" />
              ) : (
                <h4 className="text-2xl font-bold tracking-tight text-foreground">{statsData?.inactive ?? 0}</h4>
              )}
            </div>
          </div>
          <MiniSparkline points={statsData?.sparklines?.inactive || [0, 0, 0, 0, 0, 0, 0]} color="#e11d48" />
        </div>

        <div className="border border-border/80 rounded-xl bg-card shadow-xs p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="size-11 rounded-xl bg-sky-500/10 text-sky-600 border border-sky-500/20 flex items-center justify-center shrink-0">
              <i className="ph ph-map-pin text-xl" />
            </span>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Company Locations</p>
              {isStatsLoading ? (
                <Skeleton className="h-7 w-14 mt-1" />
              ) : (
                <h4 className="text-2xl font-bold tracking-tight text-foreground">{statsData?.locations ?? 0}</h4>
              )}
            </div>
          </div>
          <MiniSparkline points={statsData?.sparklines?.locations || [0, 0, 0, 0, 0, 0, 0]} color="#0284c7" />
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <Badge className="bg-primary text-primary-foreground font-mono">{selectedIds.length}</Badge>
            <span className="font-semibold text-foreground">
              compan{selectedIds.length === 1 ? "y" : "ies"} selected
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBulkActionConfirm("suspend")}
              className="h-8 text-xs gap-1.5 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
            >
              <Power className="size-3.5" />
              Bulk Suspend
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBulkActionConfirm("reactivate")}
              className="h-8 text-xs gap-1.5 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
            >
              <CheckCircle2 className="size-3.5" />
              Bulk Reactivate
            </Button>
            <Button size="sm" variant="outline" onClick={handleBulkExportCSV} className="h-8 text-xs gap-1.5">
              <Download className="size-3.5" />
              Export CSV
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
              className="h-8 text-xs text-muted-foreground"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Main Directory Card */}
      <div className="border border-border/80 rounded-xl bg-card shadow-xs overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-border/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg border border-border w-fit flex-wrap">
            {[
              { key: "All Status", label: "All Companies", count: statsData?.total ?? 0 },
              { key: "Active", label: "Active", count: statsData?.active ?? 0 },
              { key: "Inactive", label: "Inactive", count: statsData?.inactive ?? 0 },
              { key: "Expired", label: "Expired", count: undefined },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleStatusChange(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  selectedStatus === tab.key
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-muted text-muted-foreground font-mono font-bold">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search name, slug, domain..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-7 py-1.5 text-xs bg-background border border-border text-foreground rounded-md w-48 sm:w-56 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {isTableFetching ? (
                <Loader2 className="size-3 animate-spin text-primary absolute right-2.5 top-1/2 -translate-y-1/2" />
              ) : searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              ) : null}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  {dateFilterLabels[dateRange] || "All Time"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 text-xs">
                {Object.entries(dateFilterLabels).map(([key, label]) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => handleDateRangeChange(key)}
                    className={`cursor-pointer ${dateRange === key ? "font-bold text-primary" : ""}`}
                  >
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <Sliders className="size-3.5 text-muted-foreground" />
                  {selectedPlan}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 text-xs">
                <DropdownMenuItem onClick={() => handlePlanChange("All Plans")} className="cursor-pointer">
                  All Plans
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePlanChange("Unassigned")} className="cursor-pointer">
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

            <div className="flex items-center p-0.5 bg-muted/60 rounded-md border border-border">
              <button
                type="button"
                onClick={() => handleSetViewMode("list")}
                className={`p-1.5 rounded cursor-pointer ${
                  viewMode === "list" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                }`}
                title="List View"
              >
                <LayoutList className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleSetViewMode("grid")}
                className={`p-1.5 rounded cursor-pointer ${
                  viewMode === "grid" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* LIST VIEW */}
        {viewMode === "list" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/80">
                  <th className="bg-muted/50 p-3 w-10">
                    <input
                      type="checkbox"
                      checked={tenants.length > 0 && selectedIds.length === tenants.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-border text-primary cursor-pointer size-3.5"
                    />
                  </th>
                  <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">
                    Company Name & Email
                  </th>
                  <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">
                    Account URL
                  </th>
                  <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">
                    Plan
                  </th>
                  <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">
                    Employees / Users
                  </th>
                  <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">
                    Expiry Date
                  </th>
                  <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">
                    Status
                  </th>
                  <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isTableLoading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={`skel-${i}`}>
                      <td colSpan={8} className="p-3">
                        <Skeleton className="h-8 w-full rounded" />
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
                    <td colSpan={8} className="py-16 text-center text-muted-foreground">
                      <Building2 className="size-10 mx-auto mb-2 opacity-40" />
                      <p className="font-semibold text-foreground text-sm">No companies found</p>
                      <p className="text-xs mt-1">Adjust search filters or register a new company workspace.</p>
                    </td>
                  </tr>
                ) : (
                  tenants.map((tenant) => {
                    const isSuspended = tenant.status === "suspended";
                    const isExpired = tenant.status === "expired";
                    const planDisplayName = tenant.plan_name || "Unassigned";
                    const companyEmail = tenant.email || `${tenant.slug}@${getPlatformBaseDomain()}`;
                    const pendingOffboard = offboardingByTenantId.get(tenant.id);

                    return (
                      <tr key={tenant.id} className="hover:bg-muted/40 transition-colors">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(tenant.id)}
                            onChange={() => handleToggleSelect(tenant.id)}
                            className="rounded border-border text-primary cursor-pointer size-3.5"
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <CompanyAvatar name={tenant.name} logoUrl={tenant.logo_url} size="md" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setDetailTenantId(tenant.id)}
                                  className="font-bold text-foreground hover:text-primary transition-colors cursor-pointer truncate max-w-[200px]"
                                >
                                  {tenant.name}
                                </button>
                                {pendingOffboard && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30"
                                  >
                                    Offboarding ({pendingOffboard.daysRemaining}d)
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5 truncate max-w-[220px]">
                                <Mail className="size-3 shrink-0" />
                                <span className="truncate">{companyEmail}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="font-mono text-[11px] bg-muted px-2 py-0.5 rounded border border-border text-foreground inline-block max-w-[180px] truncate">
                            {tenant.account_url || `${tenant.slug}.${getPlatformBaseDomain()}`}
                          </span>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={`text-[11px] ${
                              planDisplayName === "Unassigned"
                                ? "text-muted-foreground italic"
                                : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                            }`}
                          >
                            {planDisplayName}
                          </Badge>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="font-semibold text-foreground">{tenant.employee_count}</span>{" "}
                          <span className="text-muted-foreground text-[11px]">Emp</span>
                          <span className="mx-1 text-border">&bull;</span>
                          <span className="font-semibold text-foreground">{tenant.user_count}</span>{" "}
                          <span className="text-muted-foreground text-[11px]">Users</span>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {tenant.expires_at ? (
                            <span className="font-semibold text-foreground">{formatExpiryDate(tenant.expires_at)}</span>
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">N/A</span>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={`text-[11px] font-bold ${
                              isSuspended
                                ? "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20"
                                : isExpired
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            }`}
                          >
                            {isSuspended ? "Suspended" : isExpired ? "Expired" : "Active"}
                          </Badge>
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => openGovernance(tenant, "policy")}
                              className="gap-1 text-xs"
                              title="Open Tenant Governance Drawer"
                            >
                              <ShieldCheck className="size-3 text-primary" />
                              Governance
                            </Button>

                            <Button
                              size="xs"
                              variant="soft"
                              onClick={() => handleLoginAsTenant(tenant)}
                              disabled={loggingInTenantId === tenant.id}
                              className="gap-1 text-xs"
                            >
                              {loggingInTenantId === tenant.id ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <LogIn className="size-3" />
                              )}
                              Enter
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="size-7 rounded-md border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                                  aria-label={`Actions for ${tenant.name}`}
                                >
                                  <MoreVertical className="size-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56 text-xs">
                                <DropdownMenuItem onClick={() => openGovernance(tenant, "policy")} className="cursor-pointer gap-2">
                                  <ShieldCheck className="size-3.5 text-primary" />
                                  Subscription & Policy
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openGovernance(tenant, "quota")} className="cursor-pointer gap-2">
                                  <HardDrive className="size-3.5 text-sky-600" />
                                  Storage Quota
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openGovernance(tenant, "addons")} className="cursor-pointer gap-2">
                                  <Puzzle className="size-3.5 text-indigo-600" />
                                  Manage Add-ons
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openGovernance(tenant, "slug-history")} className="cursor-pointer gap-2">
                                  <History className="size-3.5 text-muted-foreground" />
                                  Slug History
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openGovernance(tenant, "offboarding")} className="cursor-pointer gap-2">
                                  <UserX className="size-3.5 text-amber-600" />
                                  Offboarding & GDPR Export
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setDetailTenantId(tenant.id)} className="cursor-pointer gap-2">
                                  <Info className="size-3.5 text-blue-600" />
                                  Company Information
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenResetPassword(tenant)} className="cursor-pointer gap-2">
                                  <KeyRound className="size-3.5 text-amber-600" />
                                  Reset Password
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setStatusToggleTarget(tenant)}
                                  disabled={togglingTenantId === tenant.id}
                                  className="cursor-pointer gap-2"
                                >
                                  <Power className="size-3.5 text-amber-600" />
                                  {isSuspended ? "Reactivate Workspace" : "Suspend Workspace"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenEdit(tenant)} className="cursor-pointer gap-2">
                                  <Edit className="size-3.5" />
                                  Edit Company
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setTargetTenant(tenant);
                                    setDeleteConfirmSlug("");
                                    setIsDeleteModalOpen(true);
                                  }}
                                  className="cursor-pointer text-destructive focus:text-destructive gap-2 font-medium"
                                >
                                  <Trash2 className="size-3.5" />
                                  Delete Company Permanently
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
          /* GRID VIEW */
          <div className="p-5">
            {isTableLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-56 rounded-xl" />
                ))}
              </div>
            ) : tenants.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <Building2 className="size-10 mx-auto mb-2 opacity-40" />
                <p className="font-semibold text-foreground">No companies found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tenants.map((tenant) => {
                  const isSuspended = tenant.status === "suspended";
                  const pendingOffboard = offboardingByTenantId.get(tenant.id);
                  return (
                    <div
                      key={tenant.id}
                      className="border border-border/80 rounded-xl bg-card p-4 flex flex-col justify-between shadow-xs hover:border-primary/50 transition-all"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CompanyAvatar name={tenant.name} logoUrl={tenant.logo_url} size="md" />
                            <div className="min-w-0">
                              <h5
                                onClick={() => setDetailTenantId(tenant.id)}
                                className="font-bold text-foreground hover:text-primary cursor-pointer truncate text-sm"
                              >
                                {tenant.name}
                              </h5>
                              <p className="font-mono text-[11px] text-muted-foreground truncate">
                                @{tenant.slug}
                              </p>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(tenant.id)}
                            onChange={() => handleToggleSelect(tenant.id)}
                            className="rounded border-border text-primary cursor-pointer size-3.5 mt-1"
                          />
                        </div>

                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              isSuspended
                                ? "bg-slate-500/10 text-slate-600 border-slate-500/20"
                                : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            }`}
                          >
                            {isSuspended ? "Suspended" : "Active"}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {tenant.plan_name || "Unassigned"}
                          </Badge>
                        </div>

                        {pendingOffboard && (
                          <div className="text-[11px] text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-md px-2 py-1 font-medium">
                            Offboarding: {pendingOffboard.daysRemaining} days left
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 p-2.5 bg-muted/40 rounded-lg border border-border/60 text-xs">
                          <div>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Users className="size-3" /> Employees
                            </span>
                            <span className="font-bold text-foreground text-sm">{tenant.employee_count}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <UserCheck className="size-3" /> Users
                            </span>
                            <span className="font-bold text-foreground text-sm">{tenant.user_count}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-3 mt-3 border-t border-border/60">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => openGovernance(tenant, "policy")}
                          className="flex-1 gap-1"
                        >
                          <ShieldCheck className="size-3 text-primary" />
                          Govern
                        </Button>
                        <Button
                          size="xs"
                          onClick={() => handleLoginAsTenant(tenant)}
                          disabled={loggingInTenantId === tenant.id}
                          className="flex-1 gap-1"
                        >
                          <LogIn className="size-3" />
                          Enter
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        <div className="p-4 border-t border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>
            Showing{" "}
            <span className="font-bold text-foreground">
              {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold text-foreground">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            of <span className="font-bold text-foreground">{pagination.total}</span> companies
          </p>

          <div className="flex items-center gap-1.5">
            <Button
              size="xs"
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isTableLoading}
            >
              Previous
            </Button>
            <span className="px-2 font-mono text-foreground">
              {pagination.page} / {Math.max(1, pagination.totalPages)}
            </span>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={currentPage >= pagination.totalPages || isTableLoading}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* ─── 5-TAB TENANT GOVERNANCE DRAWER / DIALOG ─── */}
      {governanceTenant && (
        <TenantGovernanceDialog
          tenant={governanceTenant}
          activeTab={governanceTab}
          onTabChange={setGovernanceTab}
          availablePlans={availablePlans}
          pendingOffboarding={offboardingByTenantId.get(governanceTenant.id) || null}
          onClose={() => setGovernanceTenant(null)}
          onChanged={refetchAll}
        />
      )}

      {/* ─── COMPANY INFORMATION SHEET ─── */}
      <Sheet open={Boolean(detailTenantId)} onOpenChange={(open) => !open && setDetailTenantId(null)}>
        <SheetContent side="right" className="sm:max-w-md w-full overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-border">
            <div className="flex items-center gap-3 pr-6">
              <CompanyAvatar name={detailTenant?.name || "Company"} logoUrl={detailTenant?.logo_url || null} size="md" />
              <div className="min-w-0">
                <SheetTitle className="text-base font-bold truncate">{detailTenant?.name || "Company Details"}</SheetTitle>
                <SheetDescription className="text-xs font-mono truncate">
                  {detailTenant?.account_url || `${detailTenant?.slug}.${getPlatformBaseDomain()}`}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {isDetailLoading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : detailError ? (
            <div className="py-10 text-center text-rose-600 text-xs space-y-2">
              <p>Failed to load company details.</p>
              <Button size="sm" variant="outline" onClick={() => refetchDetail()}>
                Retry
              </Button>
            </div>
          ) : detailTenant ? (
            <div className="py-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-lg bg-muted/40 border border-border flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground block">Plan</span>
                  <span className="font-bold text-sm text-foreground">{detailTenant.plan_name || "Unassigned"}</span>
                </div>
                <Badge variant="outline">{detailTenant.status}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
                  <span className="text-[10px] text-muted-foreground block">Email</span>
                  <span className="font-semibold truncate block">{detailTenant.email || "—"}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
                  <span className="text-[10px] text-muted-foreground block">Slug</span>
                  <span className="font-mono font-semibold">{detailTenant.slug}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
                  <span className="text-[10px] text-muted-foreground block">Created</span>
                  <span className="font-semibold">{formatDate(detailTenant.created_at)}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
                  <span className="text-[10px] text-muted-foreground block">Expiry</span>
                  <span className="font-semibold">{formatExpiryDate(detailTenant.expires_at)}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Button onClick={() => handleLoginAsTenant(detailTenant)} className="w-full gap-1.5 text-xs">
                  <LogIn className="size-3.5" />
                  Enter Workspace as Super Admin
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const target = detailTenant;
                      setDetailTenantId(null);
                      openGovernance(target, "policy");
                    }}
                    className="text-xs gap-1.5"
                  >
                    <ShieldCheck className="size-3.5 text-primary" />
                    Governance
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenResetPassword(detailTenant)}
                    className="text-xs gap-1.5"
                  >
                    <KeyRound className="size-3.5 text-amber-600" />
                    Reset Password
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* ─── RESET PASSWORD MODAL ─── */}
      <Dialog open={Boolean(resetTenant)} onOpenChange={(open) => !open && setResetTenant(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-4 text-amber-600" />
              Reset Workspace Account Password
            </DialogTitle>
            <DialogDescription className="text-xs">
              Reset credentials for <strong>{resetTenant?.name}</strong>&apos;s primary administrator account.
            </DialogDescription>
          </DialogHeader>

          {resetResult ? (
            <div className="space-y-4 py-2 text-xs">
              <Alert variant="success">
                <CheckCircle2 className="size-4" />
                <AlertTitle>Password Reset Successful</AlertTitle>
                <AlertDescription>Updated account: <strong>{resetResult.accountEmail}</strong></AlertDescription>
              </Alert>
              {resetResult.temporaryPassword && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Generated Temporary Password</Label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={resetResult.temporaryPassword} className="font-mono text-xs font-bold" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(resetResult.temporaryPassword || "");
                        setHasCopiedPassword(true);
                        toast.success("Password copied!");
                        setTimeout(() => setHasCopiedPassword(false), 2000);
                      }}
                    >
                      {hasCopiedPassword ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button type="button" onClick={() => setResetTenant(null)} className="w-full">
                  Close
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleExecuteResetPassword} className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setResetMode("auto")}
                  className={`p-2.5 rounded-lg border text-left ${
                    resetMode === "auto" ? "border-primary bg-primary/5 font-semibold" : "border-border"
                  }`}
                >
                  Generate Temp Password
                </button>
                <button
                  type="button"
                  onClick={() => setResetMode("manual")}
                  className={`p-2.5 rounded-lg border text-left ${
                    resetMode === "manual" ? "border-primary bg-primary/5 font-semibold" : "border-border"
                  }`}
                >
                  Set Custom Password
                </button>
              </div>
              {resetMode === "manual" && (
                <div className="space-y-2.5">
                  <div>
                    <Label className="text-xs font-semibold">New Password (min 8 chars) *</Label>
                    <Input
                      type="password"
                      value={customPassword}
                      onChange={(e) => setCustomPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Confirm Password *</Label>
                    <Input
                      type="password"
                      value={customPasswordConfirm}
                      onChange={(e) => setCustomPasswordConfirm(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setResetTenant(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
                  Confirm Reset
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── ADD COMPANY MODAL ─── */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Company</DialogTitle>
            <DialogDescription className="text-xs">
              Provision a new multi-tenant workspace instance with optional initial subscription plan.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCompany} className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Company Name *</Label>
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
              <Label className="text-xs font-semibold">Account Subdomain Slug *</Label>
              <div className="flex items-center">
                <Input
                  placeholder="brightwave"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  className="font-mono text-xs rounded-r-none"
                  required
                />
                <span className="px-2.5 py-2 text-xs bg-muted border border-l-0 border-border rounded-r-md text-muted-foreground whitespace-nowrap">
                  .{getPlatformBaseDomain()}
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Initial Subscription Plan</Label>
              <select
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs"
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
              <Label className="text-xs font-semibold">Company Logo URL (Optional)</Label>
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
                Add Company
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── EDIT COMPANY MODAL ─── */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Company Details</DialogTitle>
            <DialogDescription className="text-xs">
              Update organization name, primary admin contact email, timezone, and logo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateCompany} className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Company Name *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Company Email</Label>
              <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Subdomain Slug</Label>
              <Input value={formSlug} readOnly disabled className="font-mono text-xs opacity-70" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Timezone</Label>
              <select
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs"
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
              <Label className="text-xs font-semibold">Company Logo URL</Label>
              <Input value={formLogo} onChange={(e) => setFormLogo(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── TYPED-SLUG PERMANENT DELETE MODAL ─── */}
      <Dialog
        open={isDeleteModalOpen}
        onOpenChange={(open) => {
          setIsDeleteModalOpen(open);
          if (!open) setDeleteConfirmSlug("");
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="size-5" />
              Permanently Delete Company?
            </DialogTitle>
            <DialogDescription className="text-xs">
              This will permanently erase <strong>{targetTenant?.name}</strong> and cascade-delete all employees,
              attendance logs, payroll runs, and documents. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {targetTenant && (
            <div className="space-y-3 py-2 text-xs">
              <Alert variant="danger">
                <AlertTriangle className="size-4" />
                <AlertDescription>
                  Consider downloading a GDPR JSON export from the Governance Drawer &rarr; Offboarding tab before
                  permanently deleting this workspace.
                </AlertDescription>
              </Alert>

              <div className="space-y-1.5">
                <Label htmlFor="delete-slug-confirm" className="text-xs font-semibold">
                  Type <code className="font-mono px-1.5 py-0.5 rounded bg-muted text-foreground">{targetTenant.slug}</code> to confirm:
                </Label>
                <Input
                  id="delete-slug-confirm"
                  placeholder={targetTenant.slug}
                  value={deleteConfirmSlug}
                  onChange={(e) => setDeleteConfirmSlug(e.target.value)}
                  className="font-mono text-xs"
                  autoComplete="off"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteCompany}
              disabled={
                isSubmitting ||
                !targetTenant ||
                deleteConfirmSlug.trim().toLowerCase() !== targetTenant.slug.toLowerCase()
              }
            >
              {isSubmitting && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── SINGLE STATUS TOGGLE CONFIRMATION ─── */}
      <ConfirmationDialog
        open={Boolean(statusToggleTarget)}
        onOpenChange={(open) => !open && setStatusToggleTarget(null)}
        title={
          statusToggleTarget?.status === "suspended"
            ? `Reactivate "${statusToggleTarget.name}"?`
            : `Suspend "${statusToggleTarget?.name}"?`
        }
        description={
          statusToggleTarget?.status === "suspended"
            ? "Users in this workspace will regain access immediately."
            : "Suspending will block tenant users from accessing their workspace and disconnect active sessions."
        }
        confirmLabel={statusToggleTarget?.status === "suspended" ? "Reactivate Workspace" : "Suspend Workspace"}
        variant={statusToggleTarget?.status === "suspended" ? "default" : "destructive"}
        isLoading={Boolean(togglingTenantId)}
        onConfirm={() => {
          if (statusToggleTarget) void executeToggleStatus(statusToggleTarget);
        }}
      />

      {/* ─── BULK SUSPEND / REACTIVATE CONFIRMATION ─── */}
      <ConfirmationDialog
        open={Boolean(bulkActionConfirm)}
        onOpenChange={(open) => !open && setBulkActionConfirm(null)}
        title={
          bulkActionConfirm === "suspend"
            ? `Suspend ${selectedIds.length} selected workspace(s)?`
            : `Reactivate ${selectedIds.length} selected workspace(s)?`
        }
        description={
          bulkActionConfirm === "suspend"
            ? "All selected workspaces will be suspended and their active sessions disconnected."
            : "All selected workspaces will be restored to active status."
        }
        confirmLabel={
          bulkActionConfirm === "suspend"
            ? `Suspend ${selectedIds.length} Workspace(s)`
            : `Reactivate ${selectedIds.length} Workspace(s)`
        }
        variant={bulkActionConfirm === "suspend" ? "destructive" : "default"}
        isLoading={isBulkExecuting}
        onConfirm={executeBulkAction}
      />
    </div>
  );
}

/* =========================================================================
   5-TAB TENANT GOVERNANCE DIALOG
   1. Subscription & Policy (PUT /super/tenants/:id/policy)
   2. Storage Quota (GET/PUT /super/tenants/:id/quota)
   3. Add-ons (GET /super/tenants/:id/addons, POST .../assign, POST .../revoke)
   4. Slug History (GET /super/tenants/:id/slug-history)
   5. Offboarding & Export (GET .../export, POST .../offboard, POST .../offboard/cancel)
   ========================================================================= */
function TenantGovernanceDialog({
  tenant,
  activeTab,
  onTabChange,
  availablePlans,
  pendingOffboarding,
  onClose,
  onChanged,
}: {
  tenant: TenantItem;
  activeTab: GovernanceTab;
  onTabChange: (tab: GovernanceTab) => void;
  availablePlans: SubscriptionPlanItem[];
  pendingOffboarding: OffboardingItem | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const qc = useQueryClient();

  // Tab 1: Policy state
  const [planId, setPlanId] = useState<string>(tenant.policy?.planId || "");
  const [policyStatus, setPolicyStatus] = useState<"active" | "suspended">(
    tenant.status === "suspended" ? "suspended" : "active"
  );
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    tenant.policy?.billingCycle === "annual" ? "annual" : "monthly"
  );
  const [maxEmployees, setMaxEmployees] = useState<string>(
    tenant.policy?.maxEmployees !== null && tenant.policy?.maxEmployees !== undefined
      ? String(tenant.policy.maxEmployees)
      : ""
  );
  const [maxUsers, setMaxUsers] = useState<string>(
    tenant.policy?.maxUsers !== null && tenant.policy?.maxUsers !== undefined
      ? String(tenant.policy.maxUsers)
      : ""
  );
  const [expiresAtDate, setExpiresAtDate] = useState<string>(
    tenant.expires_at ? new Date(tenant.expires_at).toISOString().slice(0, 10) : ""
  );

  // Tab 2: Storage Quota state
  const [quotaGbInput, setQuotaGbInput] = useState<string>("");
  const [quotaMaxUsers, setQuotaMaxUsers] = useState<string>("");
  const [quotaMaxEmployees, setQuotaMaxEmployees] = useState<string>("");
  const [quotaReason, setQuotaReason] = useState<string>("");

  // Tab 3: Add-ons state
  const [addonSearch, setAddonSearch] = useState("");
  const [addonError, setAddonError] = useState<string | null>(null);
  const [addonGrantReason, setAddonGrantReason] = useState("Super Admin Governance Assignment");

  // Tab 5: Offboarding & Export state
  const [graceDays, setGraceDays] = useState<string>("30");
  const [offboardReason, setOffboardReason] = useState<string>("");
  const [confirmOffboardOpen, setConfirmOffboardOpen] = useState(false);
  const [confirmCancelOffboardOpen, setConfirmCancelOffboardOpen] = useState(false);
  const [isDownloadingExport, setIsDownloadingExport] = useState(false);

  // Load Tenant Detail to hydrate latest Policy fields
  const { data: freshTenant } = useQuery({
    queryKey: ["gov-tenant-detail", tenant.id],
    queryFn: async () => {
      const res = await api.get(`/super/tenants/${tenant.id}`);
      return res?.data || res || {};
    },
  });

  useEffect(() => {
    const sub = freshTenant?.subscription;
    if (sub) {
      setPlanId(sub.planId || "");
      setPolicyStatus(sub.status === "suspended" ? "suspended" : "active");
      setBillingCycle(sub.billingCycle === "annual" ? "annual" : "monthly");
      setMaxEmployees(sub.maxEmployees !== null && sub.maxEmployees !== undefined ? String(sub.maxEmployees) : "");
      setMaxUsers(sub.maxUsers !== null && sub.maxUsers !== undefined ? String(sub.maxUsers) : "");
      setExpiresAtDate(sub.expiresAt ? new Date(sub.expiresAt).toISOString().slice(0, 10) : "");
    }
  }, [freshTenant]);

  // Tab 2 Query: Storage Quota
  const {
    data: quotaData,
    isLoading: isLoadingQuota,
    refetch: refetchQuota,
  } = useQuery({
    queryKey: ["gov-tenant-quota", tenant.id],
    queryFn: async () => {
      const res = await api.get(`/super/tenants/${tenant.id}/quota`);
      return res?.data || res || {};
    },
    enabled: activeTab === "quota",
  });

  useEffect(() => {
    if (quotaData?.subscription) {
      if (quotaData.subscription.storageLimitGb !== null && quotaData.subscription.storageLimitGb !== undefined) {
        setQuotaGbInput(String(quotaData.subscription.storageLimitGb));
      }
      if (quotaData.subscription.maxUsers !== null && quotaData.subscription.maxUsers !== undefined) {
        setQuotaMaxUsers(String(quotaData.subscription.maxUsers));
      }
      if (quotaData.subscription.maxEmployees !== null && quotaData.subscription.maxEmployees !== undefined) {
        setQuotaMaxEmployees(String(quotaData.subscription.maxEmployees));
      }
    }
  }, [quotaData]);

  // Tab 3 Query: Tenant Add-ons
  const {
    data: addonsData,
    isLoading: isLoadingAddons,
    refetch: refetchAddons,
  } = useQuery({
    queryKey: ["gov-tenant-addons", tenant.id],
    queryFn: async () => {
      const res = await api.get(`/super/tenants/${tenant.id}/addons`);
      return res?.data || res || {};
    },
    enabled: activeTab === "addons",
  });

  // Tab 4 Query: Slug History
  const { data: slugHistoryData, isLoading: isLoadingSlugs } = useQuery({
    queryKey: ["gov-tenant-slug-history", tenant.id],
    queryFn: async () => {
      const res = await api.get(`/super/tenants/${tenant.id}/slug-history`);
      return res?.data || res || {};
    },
    enabled: activeTab === "slug-history",
  });

  // Mutation: Update Policy
  const updatePolicyMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        planId: planId || null,
        status: policyStatus,
        maxEmployees: maxEmployees.trim() === "" ? null : Number(maxEmployees),
        maxUsers: maxUsers.trim() === "" ? null : Number(maxUsers),
        expiresAt: expiresAtDate ? new Date(`${expiresAtDate}T23:59:59.000Z`).toISOString() : null,
        billingCycle,
      };
      return await api.put(`/super/tenants/${tenant.id}/policy`, payload);
    },
    onSuccess: () => {
      toast.success(`Subscription policy updated for "${tenant.name}".`);
      qc.invalidateQueries({ queryKey: ["gov-tenant-detail", tenant.id] });
      onChanged();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update policy."),
  });

  // Mutation: Update Quota
  const updateQuotaMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {
        reason: quotaReason.trim() || "Super Admin quota allocation",
      };
      if (quotaGbInput.trim() !== "") payload.storageQuotaGb = Number(quotaGbInput);
      if (quotaMaxUsers.trim() !== "") payload.maxUsers = Number(quotaMaxUsers);
      if (quotaMaxEmployees.trim() !== "") payload.maxEmployees = Number(quotaMaxEmployees);
      return await api.put(`/super/tenants/${tenant.id}/quota`, payload);
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || "Storage quota updated.");
      setQuotaReason("");
      refetchQuota();
      onChanged();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update storage quota."),
  });

  // Mutations: Assign & Revoke Add-on
  const assignAddonMutation = useMutation({
    mutationFn: async (addonSlug: string) =>
      api.post(`/super/tenants/${tenant.id}/addons/${encodeURIComponent(addonSlug)}/assign`, {
        reason: addonGrantReason.trim() || "Administrative grant",
      }),
    onSuccess: (res: any) => {
      setAddonError(null);
      toast.success(res?.message || "Add-on assigned.");
      refetchAddons();
    },
    onError: (err: any) => {
      const msg = err?.message || "Failed to assign add-on.";
      setAddonError(msg);
      toast.error(msg);
    },
  });

  const revokeAddonMutation = useMutation({
    mutationFn: async (addonSlug: string) =>
      api.post(`/super/tenants/${tenant.id}/addons/${encodeURIComponent(addonSlug)}/revoke`, {
        reason: "Revoked via Super Admin Governance Drawer",
      }),
    onSuccess: (res: any) => {
      setAddonError(null);
      toast.success(res?.message || "Add-on revoked.");
      refetchAddons();
    },
    onError: (err: any) => {
      const msg = err?.message || "Failed to revoke add-on.";
      setAddonError(msg);
      toast.error(msg);
    },
  });

  // Mutations: Offboard & Cancel Offboard
  const offboardMutation = useMutation({
    mutationFn: async () =>
      api.post(`/super/lifecycle/tenants/${tenant.id}/offboard`, {
        graceDays: Number(graceDays) || 30,
        reason: offboardReason.trim() || undefined,
      }),
    onSuccess: (res: any) => {
      setConfirmOffboardOpen(false);
      toast.success(res?.message || "Tenant offboarding scheduled.");
      onChanged();
    },
    onError: (err: any) => {
      setConfirmOffboardOpen(false);
      toast.error(err?.message || "Failed to initiate offboarding.");
    },
  });

  const cancelOffboardMutation = useMutation({
    mutationFn: async () => api.post(`/super/lifecycle/tenants/${tenant.id}/offboard/cancel`, {}),
    onSuccess: (res: any) => {
      setConfirmCancelOffboardOpen(false);
      toast.success(res?.message || "Offboarding cancelled and workspace reactivated.");
      onChanged();
    },
    onError: (err: any) => {
      setConfirmCancelOffboardOpen(false);
      toast.error(err?.message || "Failed to cancel offboarding.");
    },
  });

  const handleDownloadGdprExport = async () => {
    setIsDownloadingExport(true);
    try {
      await api.download(
        `${API_BASE}/super/lifecycle/tenants/${tenant.id}/export`,
        `tenant-export-${tenant.slug}-${new Date().toISOString().slice(0, 10)}.json`
      );
      toast.success(`GDPR JSON export downloaded for "${tenant.name}".`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to download tenant export.");
    } finally {
      setIsDownloadingExport(false);
    }
  };

  const assignments: any[] = Array.isArray(addonsData?.assignments) ? addonsData.assignments : [];
  const catalogAddons: any[] = Array.isArray(addonsData?.catalogAddons) ? addonsData.catalogAddons : [];
  const activeAssignedSlugs = new Set(assignments.filter((a) => a.status === "active").map((a) => a.addonSlug));
  const filteredCatalogAddons = catalogAddons.filter((c) => {
    if (activeAssignedSlugs.has(c.slug)) return false;
    if (!addonSearch.trim()) return true;
    const q = addonSearch.toLowerCase();
    return (
      String(c.name || "").toLowerCase().includes(q) ||
      String(c.slug || "").toLowerCase().includes(q) ||
      String(c.category || "").toLowerCase().includes(q)
    );
  });

  const slugHistory: any[] = Array.isArray(slugHistoryData?.history) ? slugHistoryData.history : [];

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 pr-6">
              <CompanyAvatar name={tenant.name} logoUrl={tenant.logo_url} size="sm" />
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold truncate">
                  Tenant Governance — {tenant.name}
                </DialogTitle>
                <DialogDescription className="text-xs font-mono">
                  @{tenant.slug} &bull; ID: {tenant.id}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as GovernanceTab)} className="space-y-4">
            <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full h-auto gap-1 p-1 bg-muted/70 rounded-xl">
              <TabsTrigger value="policy" className="text-[11px] gap-1 py-1.5">
                <ShieldCheck className="size-3.5" />
                Policy
              </TabsTrigger>
              <TabsTrigger value="quota" className="text-[11px] gap-1 py-1.5">
                <HardDrive className="size-3.5" />
                Quota
              </TabsTrigger>
              <TabsTrigger value="addons" className="text-[11px] gap-1 py-1.5">
                <Puzzle className="size-3.5" />
                Add-ons
              </TabsTrigger>
              <TabsTrigger value="slug-history" className="text-[11px] gap-1 py-1.5">
                <History className="size-3.5" />
                Slugs
              </TabsTrigger>
              <TabsTrigger value="offboarding" className="text-[11px] gap-1 py-1.5">
                <UserX className="size-3.5" />
                Offboarding
              </TabsTrigger>
            </TabsList>

            {/* ── TAB 1: SUBSCRIPTION & POLICY ── */}
            <TabsContent value="policy" className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Subscription Plan</Label>
                  <select
                    value={planId}
                    onChange={(e) => setPlanId(e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs"
                  >
                    <option value="">Unassigned (No Plan)</option>
                    {availablePlans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Workspace Status</Label>
                  <select
                    value={policyStatus}
                    onChange={(e) => setPolicyStatus(e.target.value as "active" | "suspended")}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended (Disconnects Sessions)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Billing Cycle</Label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as "monthly" | "annual")}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Expiry / Trial End Date</Label>
                  <Input
                    type="date"
                    value={expiresAtDate}
                    onChange={(e) => setExpiresAtDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Max Employees (blank = unlimited)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={maxEmployees}
                    onChange={(e) => setMaxEmployees(e.target.value)}
                    placeholder="Unlimited"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Max Users (blank = unlimited)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={maxUsers}
                    onChange={(e) => setMaxUsers(e.target.value)}
                    placeholder="Unlimited"
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t">
                <Button
                  size="sm"
                  disabled={updatePolicyMutation.isPending}
                  onClick={() => updatePolicyMutation.mutate()}
                  className="gap-1.5 text-xs"
                >
                  {updatePolicyMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                  Save Subscription Policy
                </Button>
              </div>
            </TabsContent>

            {/* ── TAB 2: STORAGE QUOTA ── */}
            <TabsContent value="quota" className="space-y-4 text-xs">
              {isLoadingQuota ? (
                <div className="py-10 flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="size-5 animate-spin text-primary" />
                  Loading quota governance summary...
                </div>
              ) : (
                <>
                  {quotaData?.summary && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg border border-border bg-muted/30">
                        <span className="text-[10px] text-muted-foreground block">Lifecycle State</span>
                        <Badge
                          variant="outline"
                          className={`mt-1 text-[10px] font-bold ${
                            quotaData.summary.lifecycleState === "LOCKED" ||
                            quotaData.summary.lifecycleState === "CRITICAL"
                              ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                              : quotaData.summary.lifecycleState === "WARNING"
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                          }`}
                        >
                          {quotaData.summary.lifecycleState || "NORMAL"}
                        </Badge>
                      </div>
                      <div className="p-3 rounded-lg border border-border bg-muted/30">
                        <span className="text-[10px] text-muted-foreground block">Storage Used</span>
                        <span className="font-mono font-bold text-sm text-foreground">
                          {quotaData.summary.tenant?.formattedUsed || "0 B"}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg border border-border bg-muted/30">
                        <span className="text-[10px] text-muted-foreground block">Effective Quota</span>
                        <span className="font-mono font-bold text-sm text-foreground">
                          {quotaData.summary.tenant?.formattedQuota || "—"}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg border border-border bg-muted/30">
                        <span className="text-[10px] text-muted-foreground block">Utilization</span>
                        <span className="font-mono font-bold text-sm text-primary">
                          {Number(quotaData.summary.effectiveUtilizationPct || 0).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Storage Quota Override (GB)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={quotaGbInput}
                        onChange={(e) => setQuotaGbInput(e.target.value)}
                        placeholder="e.g. 50"
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Max Users</Label>
                      <Input
                        type="number"
                        min={0}
                        value={quotaMaxUsers}
                        onChange={(e) => setQuotaMaxUsers(e.target.value)}
                        placeholder="Optional"
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Max Employees</Label>
                      <Input
                        type="number"
                        min={0}
                        value={quotaMaxEmployees}
                        onChange={(e) => setQuotaMaxEmployees(e.target.value)}
                        placeholder="Optional"
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Override Reason (Audit Log)</Label>
                    <Input
                      value={quotaReason}
                      onChange={(e) => setQuotaReason(e.target.value)}
                      placeholder="e.g. Enterprise storage expansion request"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="flex justify-end pt-2 border-t">
                    <Button
                      size="sm"
                      disabled={updateQuotaMutation.isPending}
                      onClick={() => updateQuotaMutation.mutate()}
                      className="gap-1.5 text-xs"
                    >
                      {updateQuotaMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                      Apply Quota Allocation
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            {/* ── TAB 3: ADD-ONS ── */}
            <TabsContent value="addons" className="space-y-4 text-xs">
              {addonError && (
                <Alert variant="danger">
                  <AlertTriangle className="size-4" />
                  <AlertTitle>Entitlement Protection / Error</AlertTitle>
                  <AlertDescription>{addonError}</AlertDescription>
                </Alert>
              )}

              {isLoadingAddons ? (
                <div className="py-10 flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="size-5 animate-spin text-primary" />
                  Loading tenant add-on entitlements...
                </div>
              ) : (
                <>
                  {/* Active & Historical Assignments */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">
                      Current Entitlements ({assignments.filter((a) => a.status === "active").length} active)
                    </h4>
                    {assignments.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground border border-dashed rounded-lg">
                        No add-ons assigned to this tenant yet.
                      </div>
                    ) : (
                      <div className="border border-border rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
                        {assignments.map((a) => {
                          const isProtected = a.source === "PURCHASED" || a.source === "PLAN_INCLUDED";
                          return (
                            <div key={a.id} className="p-2.5 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-foreground">{a.name}</span>
                                  <Badge variant="outline" className="text-[10px] font-mono">
                                    {a.source}
                                  </Badge>
                                  <Badge
                                    variant="secondary"
                                    className={`text-[10px] ${
                                      a.status === "active"
                                        ? "bg-emerald-500/10 text-emerald-600"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {a.status}
                                  </Badge>
                                </div>
                                {isProtected && a.status === "active" && (
                                  <p className="text-[10px] text-amber-600 mt-0.5">
                                    Protected ({a.source === "PURCHASED" ? "commercially purchased" : "plan-included"}) — cannot be manually revoked.
                                  </p>
                                )}
                              </div>
                              {a.status === "active" && (
                                <Button
                                  size="xs"
                                  variant={isProtected ? "outline" : "destructive"}
                                  disabled={revokeAddonMutation.isPending}
                                  onClick={() => revokeAddonMutation.mutate(a.addonSlug)}
                                  className="shrink-0"
                                >
                                  Revoke
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Assign from Catalog */}
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h4 className="font-semibold text-foreground">Assign Add-on from Catalog</h4>
                      <Input
                        placeholder="Filter catalog add-ons..."
                        value={addonSearch}
                        onChange={(e) => setAddonSearch(e.target.value)}
                        className="h-8 text-xs sm:w-56"
                      />
                    </div>
                    <Input
                      value={addonGrantReason}
                      onChange={(e) => setAddonGrantReason(e.target.value)}
                      placeholder="Assignment audit reason..."
                      className="h-8 text-xs"
                    />
                    <div className="border border-border rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
                      {filteredCatalogAddons.slice(0, 30).map((item) => (
                        <div key={item.id} className="p-2.5 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-semibold text-foreground block truncate">{item.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              /{item.slug} &bull; {item.category}
                            </span>
                          </div>
                          <Button
                            size="xs"
                            variant="outline"
                            disabled={assignAddonMutation.isPending}
                            onClick={() => assignAddonMutation.mutate(item.slug)}
                            className="shrink-0"
                          >
                            Assign
                          </Button>
                        </div>
                      ))}
                      {filteredCatalogAddons.length === 0 && (
                        <div className="p-6 text-center text-muted-foreground">
                          No matching unassigned add-ons found.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* ── TAB 4: SLUG HISTORY ── */}
            <TabsContent value="slug-history" className="space-y-3 text-xs">
              {isLoadingSlugs ? (
                <div className="py-10 flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="size-5 animate-spin text-primary" />
                  Loading workspace slug history...
                </div>
              ) : slugHistory.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground border border-dashed rounded-xl">
                  <History className="size-8 mx-auto mb-2 opacity-40" />
                  <p className="font-semibold text-foreground">No Slug Renames Recorded</p>
                  <p className="text-[11px] mt-1">
                    Current workspace subdomain <code className="font-mono">@{tenant.slug}</code> has never been renamed.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-border rounded-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="bg-muted/50 p-2.5 text-[10px] uppercase text-muted-foreground">Previous Slug</th>
                        <th className="bg-muted/50 p-2.5 text-[10px] uppercase text-muted-foreground">New Slug</th>
                        <th className="bg-muted/50 p-2.5 text-[10px] uppercase text-muted-foreground">Changed At</th>
                        <th className="bg-muted/50 p-2.5 text-[10px] uppercase text-muted-foreground">Redirect Release</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {slugHistory.map((h) => (
                        <tr key={h.id}>
                          <td className="p-2.5 font-mono text-muted-foreground">{h.oldSlug}</td>
                          <td className="p-2.5 font-mono font-semibold text-foreground">{h.newSlug}</td>
                          <td className="p-2.5">{formatDate(h.changedAt)}</td>
                          <td className="p-2.5">{formatDate(h.releaseAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* ── TAB 5: OFFBOARDING & GDPR EXPORT ── */}
            <TabsContent value="offboarding" className="space-y-4 text-xs">
              {/* GDPR Export Card */}
              <div className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                    <Download className="size-4 text-primary" />
                    GDPR & Offboarding Data Export (JSON)
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Exports tenant record, subscription, org structure, employees (password hashes excluded; bank accounts masked to last 4), attendance counts, leaves, payroll summary, document metadata, and add-ons.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isDownloadingExport}
                  onClick={handleDownloadGdprExport}
                  className="shrink-0 gap-1.5 text-xs"
                >
                  {isDownloadingExport ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                  Download JSON
                </Button>
              </div>

              {/* Offboarding Schedule Section */}
              {pendingOffboarding ? (
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4 className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="size-4" />
                      Offboarding Currently Scheduled
                    </h4>
                    <Badge className="bg-amber-500 text-white font-mono text-[11px]">
                      {pendingOffboarding.daysRemaining} days remaining
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-muted-foreground block">Initiated At</span>
                      <span className="font-semibold text-foreground">{formatDate(pendingOffboarding.initiatedAt)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Purge Eligible Date</span>
                      <span className="font-semibold text-foreground">{formatDate(pendingOffboarding.purgeEligibleAt)}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground block">Reason</span>
                      <span className="font-medium text-foreground">{pendingOffboarding.reason}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-amber-500/20 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmCancelOffboardOpen(true)}
                      className="gap-1.5 text-xs border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10"
                    >
                      <RotateCcw className="size-3.5" />
                      Cancel Offboarding & Reactivate
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-3">
                  <div>
                    <h4 className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                      <UserX className="size-4" />
                      Schedule Graceful Offboarding
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Immediately suspends the workspace subscription, disconnects all live Socket.IO sessions, and starts a retention grace period (7–90 days) before permanent deletion.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Grace Period (7–90 days)</Label>
                      <Input
                        type="number"
                        min={7}
                        max={90}
                        value={graceDays}
                        onChange={(e) => setGraceDays(e.target.value)}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs font-semibold">Offboarding Reason</Label>
                      <Input
                        value={offboardReason}
                        onChange={(e) => setOffboardReason(e.target.value)}
                        placeholder="e.g. Customer contract ended / GDPR deletion request"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setConfirmOffboardOpen(true)}
                      className="gap-1.5 text-xs"
                    >
                      <UserX className="size-3.5" />
                      Initiate Offboarding
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={confirmOffboardOpen}
        onOpenChange={setConfirmOffboardOpen}
        title={`Initiate Offboarding for "${tenant.name}"?`}
        description={`This will immediately suspend the tenant subscription, disconnect all active user sessions, and schedule a ${Math.min(90, Math.max(7, Number(graceDays) || 30))}-day retention grace period.`}
        confirmLabel="Confirm Offboarding"
        variant="destructive"
        isLoading={offboardMutation.isPending}
        onConfirm={() => offboardMutation.mutate()}
      />

      <ConfirmationDialog
        open={confirmCancelOffboardOpen}
        onOpenChange={setConfirmCancelOffboardOpen}
        title={`Cancel Offboarding for "${tenant.name}"?`}
        description="This will mark the offboarding request as cancelled and immediately reactivate the tenant workspace subscription."
        confirmLabel="Cancel Offboarding & Reactivate"
        variant="default"
        icon={<RotateCcw className="size-5 text-emerald-600" />}
        isLoading={cancelOffboardMutation.isPending}
        onConfirm={() => cancelOffboardMutation.mutate()}
      />
    </>
  );
}

export default CompaniesManagementPage;
