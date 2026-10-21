import { useState, useMemo, lazy, Suspense } from "react";
import { Link } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { api, unwrapData, getAuthToken, API_BASE } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { useNavigationResolver } from "@/lib/navigation-resolver";
import { AddonNotInstalled } from "@/components/addon-not-installed";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  CalendarCheck,
  Wallet,
  Clock,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Package,
  Briefcase,
  Download,
  ArrowLeft,
  Search,
  Loader2,
  Table as TableIcon,
  BarChart3,
  Calendar,
  Layers,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  ShieldAlert,
  Lock,
  RefreshCw,
  FilterX,
  PieChart,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const Chart = lazy(() => import("react-apexcharts"));

export interface ReportMeta {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: any;
  defaultView: "calendar" | "grouped" | "chart" | "analytics" | "table";
}

export const REPORT_ROLES: Record<string, string[]> = {
  "attendance-summary": ["super_admin", "admin", "tenant_admin", "hr_admin", "hr_manager", "manager", "operations_manager"],
  "payroll-sheet": ["super_admin", "admin", "tenant_admin", "hr_admin", "payroll_admin", "hr_manager"],
  "leave-report": ["super_admin", "admin", "tenant_admin", "hr_admin", "hr_manager", "manager", "operations_manager"],
  "sales-invoice": ["super_admin", "admin", "tenant_admin", "accountant", "finance_manager", "finance_admin"],
  "purchase-invoice": ["super_admin", "admin", "tenant_admin", "accountant", "finance_manager", "finance_admin"],
  "deal-pipeline": ["super_admin", "admin", "tenant_admin", "sales_admin", "sales_manager", "crm_manager", "sales_rep", "manager"],
  "product-stock": ["super_admin", "admin", "tenant_admin", "inventory_manager", "warehouse_manager", "operations_manager", "manager"],
  "project-progress": ["super_admin", "admin", "tenant_admin", "project_manager", "operations_manager", "manager", "team_lead"],
};

export function isUserAuthorizedForReport(reportId: string, userRoles: string[]): boolean {
  if (reportId === "catalogue") return true;
  const allowed = REPORT_ROLES[reportId];
  if (!allowed) return false;
  return userRoles.some((r) => allowed.includes(r));
}

export const REPORT_DICTIONARY: Record<string, ReportMeta> = {
  "attendance-summary": {
    id: "attendance-summary",
    title: "Attendance Summary Report",
    description: "Employee work hours, present days, tardiness, and overtime logs.",
    category: "HRM & Workforce",
    icon: CalendarCheck,
    defaultView: "calendar",
  },
  "payroll-sheet": {
    id: "payroll-sheet",
    title: "Payroll Sheet Report",
    description: "Gross earnings, statutory deductions, and net salary disbursements.",
    category: "HRM & Payroll",
    icon: Wallet,
    defaultView: "chart",
  },
  "leave-report": {
    id: "leave-report",
    title: "Leave Utilization Report",
    description: "Annual leave quotas, taken days, pending requests, and balance allocations.",
    category: "HRM & Workforce",
    icon: Clock,
    defaultView: "table",
  },
  "sales-invoice": {
    id: "sales-invoice",
    title: "Sales Invoice Summary Report",
    description: "B2B client invoices, tax totals, paid amounts, and aging accounts receivable.",
    category: "Finance & Sales",
    icon: Receipt,
    defaultView: "grouped",
  },
  "purchase-invoice": {
    id: "purchase-invoice",
    title: "Purchase Invoice Summary Report",
    description: "Vendor bills, procurement costs, payment status, and pending accounts payable.",
    category: "Finance & Purchases",
    icon: ShoppingBag,
    defaultView: "grouped",
  },
  "deal-pipeline": {
    id: "deal-pipeline",
    title: "Deal Pipeline Report",
    description: "CRM opportunities, stage probabilities, expected close dates, and values.",
    category: "Sales & CRM",
    icon: TrendingUp,
    defaultView: "analytics",
  },
  "product-stock": {
    id: "product-stock",
    title: "Product Stock Inventory Report",
    description: "Warehouse on-hand quantities, cost valuation, and low stock warnings.",
    category: "Operations & Inventory",
    icon: Package,
    defaultView: "analytics",
  },
  "project-progress": {
    id: "project-progress",
    title: "Project Progress Report",
    description: "Client deliverables, task completion percentages, and milestone statuses.",
    category: "Operations & Delivery",
    icon: Briefcase,
    defaultView: "analytics",
  },
};

interface FilterState {
  startDate?: string;
  endDate?: string;
  status?: string;
  paymentStatus?: string;
  stage?: string;
  periodMonth?: string;
  periodYear?: string;
  categoryId?: string;
}

interface SmartReportDetailViewProps {
  reportId: string;
}

export function SmartReportDetailView({ reportId }: SmartReportDetailViewProps) {
  const { data: profile } = useCurrentProfile();
  const tenantId = profile?.tenant_id || profile?.tenant?.id;
  const userRoles = profile?.roles || [];
  const { isEntitled, isLoading: isNavLoading } = useNavigationResolver();
  const hasEntitlement = isEntitled("smart-reports");

  const reportMeta = REPORT_DICTIONARY[reportId];
  const isAuthorized = isUserAuthorizedForReport(reportId, userRoles);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeView, setActiveView] = useState<string>(
    reportMeta?.defaultView || "table"
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isExporting, setIsExporting] = useState<"csv" | "json" | null>(null);

  // Active filters state
  const [filters, setFilters] = useState<FilterState>({});

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some((val) => val !== undefined && val !== "" && val !== "all");
  }, [filters]);

  const resetFilters = () => {
    setFilters({});
    setSearchTerm("");
  };

  // Compile query parameters for backend request
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.status && filters.status !== "all") params.status = filters.status;
    if (filters.paymentStatus && filters.paymentStatus !== "all") params.paymentStatus = filters.paymentStatus;
    if (filters.stage && filters.stage !== "all") params.stage = filters.stage;
    if (filters.periodMonth && filters.periodMonth !== "all") params.periodMonth = filters.periodMonth;
    if (filters.periodYear && filters.periodYear !== "all") params.periodYear = filters.periodYear;
    if (filters.categoryId && filters.categoryId !== "all") params.categoryId = filters.categoryId;
    return params;
  }, [filters]);

  const reportQuery = useQuery({
    queryKey: ["smart-report-data", tenantId, reportId, queryParams],
    queryFn: async () => {
      try {
        const res = await api.get(`/smart-reports/${reportId}`, {
          params: queryParams,
        });
        return unwrapData(res);
      } catch (err: any) {
        if (err?.status === 403 || err?.response?.status === 403) {
          throw new Error(`Forbidden: Insufficient permissions for '${reportId}'. Required roles: ${REPORT_ROLES[reportId]?.join(", ")}`);
        }
        throw new Error(err?.message || "Failed to fetch report records from server");
      }
    },
    enabled: hasEntitlement && !!reportMeta && isAuthorized,
  });

  const handleExport = async (format: "csv" | "json") => {
    setIsExporting(format);
    try {
      const searchParams = new URLSearchParams();
      searchParams.append("format", format);
      Object.entries(queryParams).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          searchParams.append(k, String(v));
        }
      });

      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      if (typeof window !== "undefined" && window.location.host) {
        headers["X-App-Host"] = window.location.host;
      }

      const exportUrl = `${API_BASE}/smart-reports/export/${encodeURIComponent(reportId)}?${searchParams.toString()}`;
      const response = await fetch(exportUrl, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Export failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportId}-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(`Exported ${reportMeta?.title || reportId} as ${format.toUpperCase()}`);
    } catch (err: any) {
      toast.error(err.message || `Failed to export ${format.toUpperCase()}`);
    } finally {
      setIsExporting(null);
    }
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Days in view for Attendance calendar matrix computed dynamically from current or filtered date
  const calendarDays = useMemo(() => {
    const baseDate = filters.startDate ? new Date(filters.startDate) : new Date();
    const validDate = isNaN(baseDate.getTime()) ? new Date() : baseDate;
    const year = validDate.getFullYear();
    const month = validDate.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const todayDay = isCurrentMonth ? today.getDate() : -1;

    const days = Array.from({ length: totalDays }, (_, i) => {
      const day = i + 1;
      const d = new Date(year, month, day);
      const dow = d.toLocaleDateString("en-US", { weekday: "narrow" });
      return { day, dow };
    });

    const monthName = validDate.toLocaleString("en-US", { month: "long", year: "numeric" });
    return { days, todayDay, monthName };
  }, [filters.startDate]);

  // Product Stock category grouping computed from real records
  const productCategoryBreakdown = useMemo(() => {
    if (reportId !== "product-stock" || !reportQuery.data?.records) return [];
    const catMap = new Map<string, { category: string; totalItems: number; inStock: number; lowStock: number; units: number; valuation: number }>();
    reportQuery.data.records.forEach((p: any) => {
      const cat = p.category || "General";
      if (!catMap.has(cat)) {
        catMap.set(cat, { category: cat, totalItems: 0, inStock: 0, lowStock: 0, units: 0, valuation: 0 });
      }
      const entry = catMap.get(cat)!;
      entry.totalItems += 1;
      entry.units += Number(p.quantity || 0);
      entry.valuation += Number(p.valuation || 0);
      if (Number(p.quantity || 0) > 0) entry.inStock += 1;
      if (p.isLowStock) entry.lowStock += 1;
    });
    return Array.from(catMap.values());
  }, [reportId, reportQuery.data]);

  // Project Progress selected project
  const selectedProject = useMemo(() => {
    if (reportId !== "project-progress" || !reportQuery.data?.records?.length) return null;
    if (selectedProjectId) {
      const found = reportQuery.data.records.find((p: any) => p.id === selectedProjectId);
      if (found) return found;
    }
    return reportQuery.data.records[0];
  }, [reportId, reportQuery.data, selectedProjectId]);

  if (!isNavLoading && !hasEntitlement) {
    return (
      <div className="flex-1 p-4 md:p-8 pt-6 max-w-[1600px] mx-auto">
        <AddonNotInstalled
          addonName="Smart Reports"
          addonSlug="smart-reports"
          category="Finance"
          description="Custom report builder with automated scheduling, drill-down financial metrics, and executive PDF summaries."
        />
      </div>
    );
  }

  if (!reportMeta) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-[1600px] mx-auto">
        <BreadcrumbNav />
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="text-center py-12">
            <div className="size-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="size-6" />
            </div>
            <CardTitle className="text-xl">Report Not Found</CardTitle>
            <CardDescription className="max-w-md mx-auto mt-2">
              The requested report identifier <span className="font-mono text-foreground font-semibold">"{reportId}"</span> does not exist in the Smart Reports catalogue.
            </CardDescription>
            <div className="pt-6">
              <Button asChild>
                <Link to="/smart-reports" search={{ report: undefined }}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Return to Reports Catalogue
                </Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-[1600px] mx-auto">
        <BreadcrumbNav />
        <Card className="border-rose-500/20 bg-rose-500/5">
          <CardHeader className="text-center py-12">
            <div className="size-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="size-6" />
            </div>
            <CardTitle className="text-xl">Access Restricted</CardTitle>
            <CardDescription className="max-w-md mx-auto mt-2">
              Your role does not have authorization to access <span className="font-semibold text-foreground">{reportMeta.title}</span>.
              <br />
              <span className="text-xs text-muted-foreground mt-2 block">
                Required roles: {REPORT_ROLES[reportId]?.join(", ")}
              </span>
            </CardDescription>
            <div className="pt-6">
              <Button asChild variant="outline">
                <Link to="/smart-reports" search={{ report: undefined }}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Return to Reports Catalogue
                </Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const Icon = reportMeta.icon;
  const data = reportQuery.data;

  // View toggle options per report type
  const getViewButtons = () => {
    switch (reportId) {
      case "attendance-summary":
        return [
          { key: "calendar", label: "Calendar View", icon: Calendar },
          { key: "table", label: "Table View", icon: TableIcon },
        ];
      case "payroll-sheet":
        return [
          { key: "chart", label: "Comparison Chart", icon: BarChart3 },
          { key: "table", label: "Salary Records", icon: TableIcon },
        ];
      case "sales-invoice":
      case "purchase-invoice":
        return [
          { key: "grouped", label: reportId === "sales-invoice" ? "By Customer" : "By Supplier", icon: Layers },
          { key: "table", label: "All Records", icon: TableIcon },
        ];
      case "deal-pipeline":
      case "project-progress":
      case "product-stock":
        return [
          { key: "analytics", label: "Analytics & Breakdown", icon: BarChart3 },
          { key: "table", label: "Records Table", icon: TableIcon },
        ];
      default:
        return [
          { key: "table", label: "Table", icon: TableIcon },
          { key: "chart", label: "Chart", icon: BarChart3 },
        ];
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-[1600px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <BreadcrumbNav />
          <div className="flex items-center gap-3 mt-1">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
              <Link to="/smart-reports" search={{ report: undefined }} title="Back to Catalogue">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{reportMeta.title}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className="text-[10px]">{reportMeta.category}</Badge>
                  <span className="text-xs text-muted-foreground">{reportMeta.description}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Custom View Selector */}
          <div className="flex items-center rounded-lg border p-1 bg-muted/40">
            {getViewButtons().map((b) => {
              const BIcon = b.icon;
              return (
                <Button
                  key={b.key}
                  variant={activeView === b.key ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs font-medium"
                  onClick={() => setActiveView(b.key)}
                >
                  <BIcon className="h-3.5 w-3.5 mr-1" />
                  {b.label}
                </Button>
              );
            })}
          </div>

          <Button
            size="sm"
            variant="outline"
            disabled={isExporting !== null || reportQuery.isLoading || !data}
            onClick={() => handleExport("csv")}
          >
            {isExporting === "csv" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin text-primary" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            CSV
          </Button>

          <Button
            size="sm"
            disabled={isExporting !== null || reportQuery.isLoading || !data}
            onClick={() => handleExport("json")}
          >
            {isExporting === "json" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            JSON
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            title="Refresh Report Data"
            disabled={reportQuery.isFetching}
            onClick={() => reportQuery.refetch()}
          >
            <RefreshCw className={cn("h-4 w-4", reportQuery.isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* ─── DYNAMIC REPORT FILTER BAR ─── */}
      <Card className="p-3 bg-card border rounded-xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
            Filters:
          </div>

          {/* Date range filters for reports with date columns */}
          {(reportId === "attendance-summary" ||
            reportId === "leave-report" ||
            reportId === "sales-invoice" ||
            reportId === "purchase-invoice") && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">From:</span>
                <Input
                  type="date"
                  className="h-8 text-xs w-36"
                  value={filters.startDate || ""}
                  onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">To:</span>
                <Input
                  type="date"
                  className="h-8 text-xs w-36"
                  value={filters.endDate || ""}
                  onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </>
          )}

          {/* Attendance Status Filter */}
          {reportId === "attendance-summary" && (
            <div className="w-40">
              <Select
                value={filters.status || "all"}
                onValueChange={(val) => setFilters((prev) => ({ ...prev, status: val === "all" ? undefined : val }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="half_day">Half Day</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Payroll Month & Year Filters */}
          {reportId === "payroll-sheet" && (
            <>
              <div className="w-36">
                <Select
                  value={filters.periodMonth || "all"}
                  onValueChange={(val) => setFilters((prev) => ({ ...prev, periodMonth: val === "all" ? undefined : val }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All Months" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {[
                      "January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"
                    ].map((m, idx) => (
                      <SelectItem key={m} value={String(idx + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-32">
                <Select
                  value={filters.periodYear || "all"}
                  onValueChange={(val) => setFilters((prev) => ({ ...prev, periodYear: val === "all" ? undefined : val }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2027">2027</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Leave Status Filter */}
          {reportId === "leave-report" && (
            <div className="w-36">
              <Select
                value={filters.status || "all"}
                onValueChange={(val) => setFilters((prev) => ({ ...prev, status: val === "all" ? undefined : val }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Invoice Payment Status Filter */}
          {(reportId === "sales-invoice" || reportId === "purchase-invoice") && (
            <div className="w-40">
              <Select
                value={filters.paymentStatus || "all"}
                onValueChange={(val) => setFilters((prev) => ({ ...prev, paymentStatus: val === "all" ? undefined : val }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Payment Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Deal Stage Filter */}
          {reportId === "deal-pipeline" && (
            <div className="w-36">
              <Select
                value={filters.stage || "all"}
                onValueChange={(val) => setFilters((prev) => ({ ...prev, stage: val === "all" ? undefined : val }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Project Status Filter */}
          {reportId === "project-progress" && (
            <div className="w-40">
              <Select
                value={filters.status || "all"}
                onValueChange={(val) => setFilters((prev) => ({ ...prev, status: val === "all" ? undefined : val }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              <FilterX className="h-3.5 w-3.5 mr-1" />
              Reset Filters
            </Button>
          )}
        </div>
      </Card>

      {/* Loading & Error States */}
      {reportQuery.isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-3 space-y-2">
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-6 w-3/4" />
              </Card>
            ))}
          </div>
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center space-y-3 text-muted-foreground py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Fetching persisted report records from database...</p>
            </div>
          </Card>
        </div>
      ) : reportQuery.error ? (
        <Card className="border-rose-500/20 bg-rose-500/5">
          <CardHeader className="text-center py-10">
            <div className="size-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="size-6" />
            </div>
            <CardTitle className="text-lg font-semibold">Report Query Failed</CardTitle>
            <CardDescription className="max-w-md mx-auto mt-1 text-sm text-foreground/80">
              {(reportQuery.error as Error).message || "Unable to retrieve report records."}
            </CardDescription>
            <div className="pt-4 flex items-center justify-center gap-3">
              <Button size="sm" variant="outline" onClick={() => reportQuery.refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button size="sm" asChild variant="ghost">
                <Link to="/smart-reports" search={{ report: undefined }}>
                  Return to Catalogue
                </Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
      ) : data ? (
        <div className="space-y-6">
          {/* ─── SUMMARY KPI METRICS BAR ─── */}
          {data.metrics && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(data.metrics).map(([key, value]: [string, any]) => {
                const kLower = key.toLowerCase();
                const isCurrency =
                  typeof value === "number" &&
                  (kLower.includes("pay") ||
                    kLower.includes("cost") ||
                    kLower.includes("value") ||
                    kLower.includes("invoiced") ||
                    kLower.includes("budget") ||
                    kLower.includes("amount") ||
                    kLower.includes("due") ||
                    kLower.includes("valuation") ||
                    kLower.includes("receivables") ||
                    kLower.includes("payables") ||
                    kLower.includes("sales") ||
                    kLower.includes("purchases"));
                const isPercentage =
                  typeof value === "number" &&
                  (kLower.includes("rate") ||
                    kLower.includes("progress") ||
                    kLower.includes("pct") ||
                    kLower.includes("forecast") && kLower.includes("rate"));

                return (
                  <Card key={key} className="p-3 bg-card border rounded-xl">
                    <div className="text-[11px] font-medium text-muted-foreground capitalize">
                      {key.replace(/([A-Z])/g, " $1")}
                    </div>
                    <div className="text-lg font-bold mt-0.5">
                      {isCurrency
                        ? `$${Math.round(value).toLocaleString()}`
                        : isPercentage
                        ? `${value}%`
                        : typeof value === "number"
                        ? value.toLocaleString()
                        : value ?? 0}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SPECIALIZED VIEW 1: ATTENDANCE CALENDAR MATRIX
             ═══════════════════════════════════════════════════════════════ */}
          {reportId === "attendance-summary" && activeView === "calendar" && (
            <div className="space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-card p-3 rounded-xl border">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs px-2.5 py-1">
                    Month: {calendarDays.monthName}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Showing daily presence for {data.calendarRows?.length || 0} active employees
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">
                    <span className="size-2 rounded-full bg-emerald-500" /> P: Present
                  </span>
                  <span className="flex items-center gap-1 font-medium text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded">
                    <span className="size-2 rounded-full bg-rose-500" /> A: Absent
                  </span>
                  <span className="flex items-center gap-1 font-medium text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded">
                    <span className="size-2 rounded-full bg-amber-500" /> HD: Half Day
                  </span>
                  <span className="flex items-center gap-1 font-medium text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded">
                    <span className="size-2 rounded-full bg-purple-500" /> L: Leave
                  </span>
                  <span className="flex items-center gap-1 font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    <span className="size-2 rounded-full bg-muted-foreground" /> -: No Record
                  </span>
                </div>
              </div>

              {data.calendarRows && data.calendarRows.length > 0 ? (
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto max-h-[650px]">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-muted/70 sticky top-0 z-20 border-b">
                        <tr>
                          <th className="p-3 sticky left-0 z-30 bg-muted/90 min-w-[200px] border-r font-semibold">
                            Employee Details
                          </th>
                          {calendarDays.days.map((d) => (
                            <th
                              key={d.day}
                              className={cn(
                                "p-2 text-center min-w-[34px] border-r font-semibold text-[11px]",
                                d.day === calendarDays.todayDay && "bg-primary/20 text-primary border-primary/40"
                              )}
                            >
                              <div className="text-[9px] text-muted-foreground font-normal">{d.dow}</div>
                              <div>{d.day}</div>
                            </th>
                          ))}
                          <th className="p-2 text-center min-w-[60px] font-semibold bg-muted/80 border-r">Pres</th>
                          <th className="p-2 text-center min-w-[60px] font-semibold bg-muted/80 border-r">Half</th>
                          <th className="p-2 text-center min-w-[60px] font-semibold bg-muted/80 border-r">Abs</th>
                          <th className="p-2 text-center min-w-[60px] font-semibold bg-muted/80 border-r">Leave</th>
                          <th className="p-2 text-center min-w-[70px] font-semibold bg-muted/80">Hours</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.calendarRows.map((emp: any) => (
                          <tr key={emp.id} className="hover:bg-muted/30">
                            <td className="p-2.5 sticky left-0 z-10 bg-card border-r">
                              <div className="font-semibold text-foreground text-xs">{emp.name}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-muted-foreground font-mono">{emp.code}</span>
                                <span className="text-[9px] px-1 py-0.2 rounded bg-muted text-muted-foreground truncate max-w-[100px]">
                                  {emp.department}
                                </span>
                              </div>
                            </td>

                            {calendarDays.days.map((d) => {
                              const statusObj = emp.days?.[d.day];
                              const st = statusObj?.status;
                              return (
                                <td
                                  key={d.day}
                                  className={cn(
                                    "p-1 text-center border-r align-middle",
                                    d.day === calendarDays.todayDay && "bg-primary/5"
                                  )}
                                >
                                  {st === "present" ? (
                                    <span
                                      className={cn(
                                        "inline-block size-6 leading-6 rounded text-[10px] font-bold text-center",
                                        statusObj.overtime
                                          ? "bg-emerald-600 text-white"
                                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                      )}
                                      title={`Present - ${statusObj.hours || 8}h`}
                                    >
                                      P
                                    </span>
                                  ) : st === "absent" ? (
                                    <span
                                      className="inline-block size-6 leading-6 rounded text-[10px] font-bold text-center bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                      title="Absent"
                                    >
                                      A
                                    </span>
                                  ) : st === "half_day" ? (
                                    <span
                                      className="inline-block size-6 leading-6 rounded text-[10px] font-bold text-center bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                      title="Half Day"
                                    >
                                      HD
                                    </span>
                                  ) : st === "on_leave" ? (
                                    <span
                                      className="inline-block size-6 leading-6 rounded text-[10px] font-bold text-center bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                                      title="Leave"
                                    >
                                      L
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground/40 font-mono">-</span>
                                  )}
                                </td>
                              );
                            })}

                            <td className="p-2 text-center border-r font-semibold text-emerald-600">
                              {emp.presentDays}
                            </td>
                            <td className="p-2 text-center border-r font-semibold text-amber-600">
                              {emp.halfDays}
                            </td>
                            <td className="p-2 text-center border-r font-semibold text-rose-600">
                              {emp.absentDays}
                            </td>
                            <td className="p-2 text-center border-r font-semibold text-purple-600">
                              {emp.leaveDays}
                            </td>
                            <td className="p-2 text-center font-bold">
                              {emp.totalHours}h
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ) : (
                <Card className="border-dashed py-12 text-center">
                  <div className="size-12 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto mb-3">
                    <CalendarCheck className="size-6" />
                  </div>
                  <CardTitle className="text-base font-semibold">No Attendance Records Found</CardTitle>
                  <CardDescription className="max-w-md mx-auto mt-1">
                    No persisted employee attendance records match the selected month and filters.
                  </CardDescription>
                </Card>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SPECIALIZED VIEW 2: PAYROLL COMPARISON CHART
             ═══════════════════════════════════════════════════════════════ */}
          {reportId === "payroll-sheet" && activeView === "chart" && (
            <div className="space-y-6">
              {data.chartData && data.chartData.categories?.length > 0 ? (
                <Card className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                    <div>
                      <h3 className="text-base font-semibold">Salary Breakdown Across Employees</h3>
                      <p className="text-xs text-muted-foreground">
                        Comparing Gross Pay, Net Pay, and Deductions across workforce payslips
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-blue-500" /> Gross Pay</span>
                      <span className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-emerald-500" /> Net Pay</span>
                      <span className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-rose-500" /> Deductions</span>
                    </div>
                  </div>

                  <div className="h-96">
                    <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                      <Chart
                        type="line"
                        height="100%"
                        series={data.chartData.series}
                        options={{
                          chart: { toolbar: { show: false }, zoom: { enabled: false } },
                          colors: ["#3b82f6", "#10b981", "#ef4444"],
                          stroke: { curve: "smooth", width: [3, 3, 2] },
                          xaxis: {
                            categories: data.chartData.categories,
                            labels: { rotate: -25, style: { fontSize: "11px" } },
                          },
                          yaxis: {
                            labels: { formatter: (val: number) => `$${Math.round(val).toLocaleString()}` },
                          },
                          markers: { size: 4 },
                          grid: { borderColor: "#f1f5f9" },
                        }}
                      />
                    </Suspense>
                  </div>
                </Card>
              ) : (
                <Card className="border-dashed py-12 text-center">
                  <div className="size-12 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto mb-3">
                    <Wallet className="size-6" />
                  </div>
                  <CardTitle className="text-base font-semibold">No Payroll Data Found</CardTitle>
                  <CardDescription className="max-w-md mx-auto mt-1">
                    No payslip records exist matching the selected payroll period.
                  </CardDescription>
                </Card>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SPECIALIZED VIEW 3: SALES / PURCHASE GROUPED VIEW
             ═══════════════════════════════════════════════════════════════ */}
          {(reportId === "sales-invoice" || reportId === "purchase-invoice") && activeView === "grouped" && (
            <div className="space-y-4">
              {(() => {
                const groups: any[] = (reportId === "sales-invoice" ? data.customerGroups : data.supplierGroups) || [];
                const accountLabel = reportId === "sales-invoice" ? "Customer" : "Supplier";

                if (groups.length === 0) {
                  return (
                    <Card className="border-dashed py-12 text-center">
                      <div className="size-12 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto mb-3">
                        <Receipt className="size-6" />
                      </div>
                      <CardTitle className="text-base font-semibold">No Invoices Found</CardTitle>
                      <CardDescription className="max-w-md mx-auto mt-1">
                        No {accountLabel.toLowerCase()} invoice records match the selected date or payment status filters.
                      </CardDescription>
                    </Card>
                  );
                }

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-semibold">
                          Invoices Grouped By {accountLabel}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Payment settlement efficiency and balance aging across {accountLabel.toLowerCase()} accounts
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {groups.length} Accounts
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      {groups.map((group: any) => {
                        const name = group.customerName || group.supplierName || "Account";
                        const isExpanded = !!expandedGroups[name];
                        const total = Number(group.totalAmount || 0);
                        const paid = Number(group.paidAmount || 0);
                        const balance = Number(group.balanceDue || 0);
                        const count = group.totalInvoices ?? group.totalBills ?? 0;
                        const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
                        const items = group.invoices || group.bills || [];

                        return (
                          <Card key={name} className="overflow-hidden border">
                            <div
                              className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-muted/30 transition-colors"
                              onClick={() => toggleGroup(name)}
                            >
                              <div className="flex items-center gap-3">
                                <button className="text-muted-foreground hover:text-foreground">
                                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </button>
                                <div>
                                  <div className="font-bold text-sm text-foreground">{name}</div>
                                  <div className="text-xs text-muted-foreground mt-0.5">{group.email || "-"}</div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs md:text-right items-center">
                                <div>
                                  <span className="text-[10px] text-muted-foreground block">Transactions</span>
                                  <span className="font-semibold">{count}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-muted-foreground block">Total Amount</span>
                                  <span className="font-semibold">${Math.round(total).toLocaleString()}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-muted-foreground block">Paid Amount</span>
                                  <span className="font-semibold text-emerald-600">${Math.round(paid).toLocaleString()}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-muted-foreground block">Balance Due</span>
                                  <span className="font-semibold text-rose-600">${Math.round(balance).toLocaleString()}</span>
                                </div>
                              </div>

                              <div className="w-full md:w-36 space-y-1">
                                <div className="flex justify-between text-[10px] font-medium">
                                  <span>Settled</span>
                                  <span>{pct}%</span>
                                </div>
                                <Progress value={pct} className="h-1.5" />
                              </div>
                            </div>

                            {isExpanded && items.length > 0 && (
                              <div className="border-t bg-muted/20 p-4">
                                <table className="w-full text-xs text-left">
                                  <thead className="text-muted-foreground border-b text-[11px]">
                                    <tr>
                                      <th className="pb-2 font-medium">Ref #</th>
                                      <th className="pb-2 font-medium">Date</th>
                                      {reportId === "sales-invoice" && <th className="pb-2 font-medium">Due Date</th>}
                                      <th className="pb-2 font-medium">Total</th>
                                      <th className="pb-2 font-medium">Paid</th>
                                      <th className="pb-2 font-medium">Balance</th>
                                      <th className="pb-2 font-medium">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/40">
                                    {items.map((inv: any) => {
                                      const invTot = Number(inv.total || 0);
                                      const invPaid = Number(inv.paid ?? inv.paidAmount ?? 0);
                                      const invBal = Number(invTot - invPaid);
                                      return (
                                        <tr key={inv.id} className="hover:bg-muted/40">
                                          <td className="py-2 font-mono font-medium">{inv.invoiceNo || inv.purchaseNo}</td>
                                          <td className="py-2">{inv.date}</td>
                                          {reportId === "sales-invoice" && <td className="py-2">{inv.dueDate || "-"}</td>}
                                          <td className="py-2 font-semibold">${invTot.toLocaleString()}</td>
                                          <td className="py-2 text-emerald-600 font-medium">${invPaid.toLocaleString()}</td>
                                          <td className="py-2 text-rose-600 font-medium">${invBal.toLocaleString()}</td>
                                          <td className="py-2">
                                            <Badge variant="outline" className="text-[10px] capitalize">
                                              {inv.status}
                                            </Badge>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SPECIALIZED VIEW 4: DEAL PIPELINE SPLIT VIEW
             ═══════════════════════════════════════════════════════════════ */}
          {reportId === "deal-pipeline" && activeView === "analytics" && (
            <div className="space-y-6">
              {data.stageBreakdown && data.stageBreakdown.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Stage Distribution Chart */}
                  <Card className="lg:col-span-5 p-5 flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-semibold">Deal Pipeline Stages</h3>
                      <p className="text-xs text-muted-foreground">Distribution of deal valuation across active stages</p>
                    </div>
                    <div className="h-80 mt-4">
                      <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                        <Chart
                          type="bar"
                          height="100%"
                          series={[
                            {
                              name: "Pipeline Value ($)",
                              data: data.stageBreakdown.map((s: any) => s.value),
                            },
                          ]}
                          options={{
                            chart: { toolbar: { show: false } },
                            colors: ["#3b82f6"],
                            plotOptions: { bar: { horizontal: true, barHeight: "55%", borderRadius: 4 } },
                            xaxis: {
                              categories: data.stageBreakdown.map((s: any) => s.stage.toUpperCase()),
                              labels: { formatter: (val: number) => `$${Math.round(val).toLocaleString()}` },
                            },
                          }}
                        />
                      </Suspense>
                    </div>
                  </Card>

                  {/* Right Column: Stage Breakdown Table */}
                  <Card className="lg:col-span-7 overflow-hidden">
                    <CardHeader className="p-4 border-b">
                      <CardTitle className="text-sm font-semibold">Stage Performance Breakdown</CardTitle>
                    </CardHeader>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/50 border-b">
                          <tr>
                            <th className="p-3 font-semibold">Stage</th>
                            <th className="p-3 font-semibold text-center">Deals Count</th>
                            <th className="p-3 font-semibold text-right">Total Value</th>
                            <th className="p-3 font-semibold text-center">Pipeline Share</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {data.stageBreakdown.map((g: any) => {
                            const totPipe = Number(data.metrics?.totalPipeline || data.metrics?.pipelineValue || 1);
                            const share = totPipe > 0 ? Math.round((Number(g.value || 0) / totPipe) * 100) : 0;
                            return (
                              <tr key={g.stage} className="hover:bg-muted/30">
                                <td className="p-3 font-semibold uppercase">{g.stage}</td>
                                <td className="p-3 text-center">{g.count}</td>
                                <td className="p-3 text-right font-medium">${Math.round(g.value).toLocaleString()}</td>
                                <td className="p-3 text-center">
                                  <Badge variant="outline" className="text-[10px]">
                                    {share}%
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              ) : (
                <Card className="border-dashed py-12 text-center">
                  <div className="size-12 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="size-6" />
                  </div>
                  <CardTitle className="text-base font-semibold">No Deals in Pipeline</CardTitle>
                  <CardDescription className="max-w-md mx-auto mt-1">
                    No persisted CRM deals match the selected pipeline criteria.
                  </CardDescription>
                </Card>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SPECIALIZED VIEW 5: PROJECT PROGRESS SPLIT VIEW
             ═══════════════════════════════════════════════════════════════ */}
          {reportId === "project-progress" && activeView === "analytics" && (
            <div className="space-y-6">
              {data.records && data.records.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Projects Overview List */}
                  <div className="lg:col-span-6 space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Select Project ({data.records.length} Total)
                    </h3>
                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                      {data.records.map((proj: any) => (
                        <Card
                          key={proj.id}
                          onClick={() => setSelectedProjectId(proj.id)}
                          className={cn(
                            "p-4 cursor-pointer transition-all border",
                            (selectedProject?.id === proj.id)
                              ? "border-primary ring-1 ring-primary shadow-xs bg-primary/5"
                              : "hover:border-primary/40 bg-card"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-semibold text-sm">{proj.name}</div>
                            <Badge
                              variant="outline"
                              className={cn(
                                "capitalize text-[10px]",
                                proj.status === "completed"
                                  ? "text-emerald-600 border-emerald-500/30"
                                  : "text-blue-600 border-blue-500/30"
                              )}
                            >
                              {proj.status.replace("_", " ")}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Client: {proj.clientName} · Due: {proj.dueDate}
                          </div>
                          <div className="mt-3 space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>Progress</span>
                              <span className="font-bold">{proj.progress}%</span>
                            </div>
                            <Progress value={proj.progress} className="h-1.5" />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Selected Project Detail Card */}
                  <div className="lg:col-span-6">
                    {selectedProject ? (
                      <Card className="p-6 space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b">
                          <div>
                            <Badge variant="secondary" className="text-[10px] mb-1 capitalize">
                              {selectedProject.status.replace("_", " ")}
                            </Badge>
                            <h3 className="text-xl font-bold">{selectedProject.name}</h3>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Client: {selectedProject.clientName} · Timeline: {selectedProject.startDate} to {selectedProject.dueDate}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 text-primary capitalize">
                            Priority: {selectedProject.priority || "Normal"}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 rounded-lg border bg-muted/30">
                            <span className="text-[11px] text-muted-foreground">Tasks Completed</span>
                            <div className="text-xl font-bold mt-1 text-emerald-600">
                              {selectedProject.completedTasks} / {selectedProject.totalTasks}
                            </div>
                          </div>
                          <div className="p-3 rounded-lg border bg-muted/30">
                            <span className="text-[11px] text-muted-foreground">Pending Tasks</span>
                            <div className="text-xl font-bold mt-1 text-amber-600">
                              {Math.max(0, selectedProject.totalTasks - selectedProject.completedTasks)}
                            </div>
                          </div>
                          <div className="p-3 rounded-lg border bg-muted/30">
                            <span className="text-[11px] text-muted-foreground">Project Budget</span>
                            <div className="text-xl font-bold mt-1">
                              ${Number(selectedProject.budget || 0).toLocaleString()}
                            </div>
                          </div>
                          <div className="p-3 rounded-lg border bg-muted/30">
                            <span className="text-[11px] text-muted-foreground">Milestone Cost</span>
                            <div className="text-xl font-bold mt-1 text-primary">
                              ${Number(selectedProject.actualCost || 0).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-medium">
                            <span>Project Completion Status</span>
                            <span className="font-bold">{selectedProject.progress}%</span>
                          </div>
                          <Progress value={selectedProject.progress} className="h-2.5" />
                        </div>
                      </Card>
                    ) : null}
                  </div>
                </div>
              ) : (
                <Card className="border-dashed py-12 text-center">
                  <div className="size-12 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto mb-3">
                    <Briefcase className="size-6" />
                  </div>
                  <CardTitle className="text-base font-semibold">No Projects Found</CardTitle>
                  <CardDescription className="max-w-md mx-auto mt-1">
                    No persisted project records match the current status filters.
                  </CardDescription>
                </Card>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SPECIALIZED VIEW 6: PRODUCT STOCK CATEGORY SPLIT
             ═══════════════════════════════════════════════════════════════ */}
          {reportId === "product-stock" && activeView === "analytics" && (
            <div className="space-y-6">
              {productCategoryBreakdown.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <Card className="lg:col-span-5 p-5">
                    <h3 className="text-base font-semibold">Stock In-Hand by Category</h3>
                    <p className="text-xs text-muted-foreground mb-4">Quantity distribution across product categories</p>
                    <div className="h-72">
                      <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                        <Chart
                          type="bar"
                          height="100%"
                          series={[{ name: "In Stock Items", data: productCategoryBreakdown.map((c) => c.inStock) }]}
                          options={{
                            chart: { toolbar: { show: false } },
                            colors: ["#3b82f6"],
                            plotOptions: { bar: { borderRadius: 4, horizontal: true } },
                            xaxis: { categories: productCategoryBreakdown.map((c) => c.category) },
                          }}
                        />
                      </Suspense>
                    </div>
                  </Card>

                  <Card className="lg:col-span-7 overflow-hidden">
                    <CardHeader className="p-4 border-b">
                      <CardTitle className="text-sm font-semibold">Category Inventory Summary</CardTitle>
                    </CardHeader>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/50 border-b">
                          <tr>
                            <th className="p-3 font-semibold">Category</th>
                            <th className="p-3 font-semibold text-center">Total Products</th>
                            <th className="p-3 font-semibold text-center text-emerald-600">In Stock</th>
                            <th className="p-3 font-semibold text-center text-amber-600">Low Stock</th>
                            <th className="p-3 font-semibold text-right">Valuation ($)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {productCategoryBreakdown.map((cat) => (
                            <tr key={cat.category} className="hover:bg-muted/30">
                              <td className="p-3 font-medium">{cat.category}</td>
                              <td className="p-3 text-center">{cat.totalItems}</td>
                              <td className="p-3 text-center font-bold text-emerald-600">{cat.inStock}</td>
                              <td className="p-3 text-center font-bold text-amber-600">{cat.lowStock}</td>
                              <td className="p-3 text-right font-semibold">${Math.round(cat.valuation).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              ) : (
                <Card className="border-dashed py-12 text-center">
                  <div className="size-12 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto mb-3">
                    <Package className="size-6" />
                  </div>
                  <CardTitle className="text-base font-semibold">No Stock Records Found</CardTitle>
                  <CardDescription className="max-w-md mx-auto mt-1">
                    No active product inventory records exist in the database.
                  </CardDescription>
                </Card>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              STANDARD TABULAR VIEW
             ═══════════════════════════════════════════════════════════════ */}
          {(activeView === "table" || reportId === "leave-report") && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search report records..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 text-xs h-9"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Badge variant="outline" className="text-xs">
                    {data.records?.length || 0} Total Records
                  </Badge>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 border-y">
                        <tr>
                          {data.records?.length > 0 &&
                            Object.keys(data.records[0])
                              .filter((k) => k !== "id")
                              .map((col) => (
                                <th key={col} className="p-3 capitalize font-semibold whitespace-nowrap">
                                  {col.replace(/([A-Z])/g, " $1")}
                                </th>
                              ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.records?.length > 0 ? (
                          data.records
                            .filter((r: any) => {
                              if (!searchTerm) return true;
                              return JSON.stringify(r).toLowerCase().includes(searchTerm.toLowerCase());
                            })
                            .map((r: any, idx: number) => (
                              <tr key={r.id || idx} className="hover:bg-muted/30">
                                {Object.entries(r)
                                  .filter(([k]) => k !== "id")
                                  .map(([k, val]: [string, any], vIdx) => {
                                    const kLower = k.toLowerCase();
                                    const isCurrency =
                                      typeof val === "number" &&
                                      (kLower.includes("pay") ||
                                        kLower.includes("salary") ||
                                        kLower.includes("total") ||
                                        kLower.includes("balance") ||
                                        kLower.includes("cost") ||
                                        kLower.includes("price") ||
                                        kLower.includes("value") ||
                                        kLower.includes("deduction") ||
                                        kLower.includes("valuation"));

                                    return (
                                      <td key={vIdx} className="p-3 whitespace-nowrap">
                                        {typeof val === "boolean" ? (
                                          <Badge variant={val ? "default" : "secondary"}>
                                            {val ? "Yes" : "No"}
                                          </Badge>
                                        ) : k === "status" || k === "paymentStatus" ? (
                                          <Badge
                                            variant="outline"
                                            className={cn(
                                              "capitalize text-[10px]",
                                              val === "paid" || val === "approved" || val === "completed" || val === "won"
                                                ? "text-emerald-600 border-emerald-500/30"
                                                : val === "pending" || val === "partial" || val === "in_progress"
                                                ? "text-amber-600 border-amber-500/30"
                                                : val === "rejected" || val === "lost"
                                                ? "text-rose-600 border-rose-500/30"
                                                : ""
                                            )}
                                          >
                                            {String(val).replace("_", " ")}
                                          </Badge>
                                        ) : isCurrency ? (
                                          <span className="font-semibold">${Math.round(val).toLocaleString()}</span>
                                        ) : (
                                          String(val ?? "-")
                                        )}
                                      </td>
                                    );
                                  })}
                              </tr>
                            ))
                        ) : (
                          <tr>
                            <td colSpan={10} className="p-10 text-center text-muted-foreground">
                              No records found for this report with active filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
