'use client';

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@/lib/router-compat";
import { format } from "date-fns";
import { api, unwrapArray } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StandardPagination } from "@/components/ui/standard-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  LifecycleDocumentField,
  DocumentPreviewBlock,
} from "@/components/hr/lifecycle-document-field";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  RefreshCw,
  TrendingUp,
  Trash2,
  Calendar,
  FileText,
  ArrowUpDown,
  AlertTriangle,
  Tag,
  User,
  Clock,
  CheckCircle2,
  FileEdit,
  LayoutGrid,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const WARNING_TYPES = ["Attendance", "Performance", "Conduct", "Safety", "Policy Violation", "Other"];
const SEVERITIES = ["Verbal", "Written", "Final"];

function formatDateSafe(val?: string | null) {
  if (!val) return "—";
  try {
    return format(new Date(val), "yyyy-MM-dd");
  } catch {
    return String(val).slice(0, 10);
  }
}

function toInputDate(val?: string | null) {
  if (!val) return "";
  try {
    return new Date(val).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

function getSeverityBadge(severity?: string) {
  const s = (severity || "Written").toLowerCase();
  if (s === "final" || s === "critical") {
    return (
      <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 font-medium capitalize">
        {severity || "Final"}
      </Badge>
    );
  }
  if (s === "verbal" || s === "minor") {
    return (
      <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 font-medium capitalize">
        {severity || "Verbal"}
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-medium capitalize">
      {severity || "Written"}
    </Badge>
  );
}

function getStatusBadge(status?: string) {
  const s = (status || "issued").toLowerCase();
  if (s === "acknowledged") {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-medium">
        Acknowledged
      </Badge>
    );
  }
  if (s === "expired") {
    return (
      <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 font-medium">
        Expired
      </Badge>
    );
  }
  if (s === "draft") {
    return (
      <Badge className="bg-muted text-muted-foreground border border-border font-medium">
        Draft
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-medium">
      Issued
    </Badge>
  );
}

const emptyForm = {
  employeeId: "",
  warningBy: "",
  warningTypeName: "",
  subject: "",
  severity: "Written",
  warningDate: new Date().toISOString().split("T")[0],
  expiryDate: "",
  description: "",
  letterUrl: "",
  documentName: "",
  hasImprovementPlan: false,
  improvementPlanGoals: "",
  improvementPlanStartDate: "",
  improvementPlanEndDate: "",
  status: "issued",
  acknowledgedAt: "",
  employeeResponse: "",
  improvementPlanProgress: "",
};

export default function HrWarningsPage() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isEmployeePortal = currentPath.startsWith("/me");
  const queryClient = useQueryClient();

  // Filter & Sort State
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusTab, setStatusTab] = useState<"all" | "draft" | "issued" | "acknowledged" | "expired">("all");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const [viewItem, setViewItem] = useState<any | null>(null);
  const [statusModalItem, setStatusModalItem] = useState<any | null>(null);
  const [statusForm, setStatusForm] = useState({
    status: "issued",
    acknowledgedAt: "",
    employeeResponse: "",
  });

  const [pipModalItem, setPipModalItem] = useState<any | null>(null);
  const [pipForm, setPipForm] = useState({
    hasImprovementPlan: false,
    improvementPlanGoals: "",
    improvementPlanStartDate: "",
    improvementPlanEndDate: "",
    improvementPlanProgress: "",
  });

  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  // Queries
  const { data: warnings = [], isLoading } = useQuery({
    queryKey: ["hr-lifecycle-warnings"],
    queryFn: async () => {
      const res = await api.get("/hr/lifecycle/warnings");
      return unwrapArray(res);
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-list-quick"],
    queryFn: async () => {
      const res = await api.get("/hr/employees?limit=300");
      return unwrapArray(res);
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => api.post("/hr/lifecycle/warnings", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-warnings"] });
      toast.success("Warning issued successfully.");
      setIsFormOpen(false);
      setFormData(emptyForm);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to create warning.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) =>
      api.put(`/hr/lifecycle/warnings/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-warnings"] });
      toast.success("Warning updated successfully.");
      setIsFormOpen(false);
      setEditingItem(null);
      setFormData(emptyForm);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update warning.");
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) =>
      api.patch(`/hr/lifecycle/warnings/${id}/status`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-warnings"] });
      toast.success("Warning status updated.");
      setStatusModalItem(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update status.");
    },
  });

  const pipMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) =>
      api.patch(`/hr/lifecycle/warnings/${id}/improvement-plan`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-warnings"] });
      toast.success("Improvement plan updated.");
      setPipModalItem(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update improvement plan.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/lifecycle/warnings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-warnings"] });
      toast.success("Warning deleted.");
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to delete warning.");
    },
  });

  // Status counts
  const counts = useMemo(() => {
    const c = { all: warnings.length, draft: 0, issued: 0, acknowledged: 0, expired: 0 };
    warnings.forEach((w: any) => {
      const s = (w.status || "issued").toLowerCase();
      if (s === "draft") c.draft += 1;
      else if (s === "acknowledged") c.acknowledged += 1;
      else if (s === "expired") c.expired += 1;
      else c.issued += 1;
    });
    return c;
  }, [warnings]);

  // Filtering + Sorting
  const filteredWarnings = useMemo(() => {
    const q = search.toLowerCase().trim();
    return [...warnings]
      .filter((w: any) => {
        const s = (w.status || "issued").toLowerCase();
        if (statusTab !== "all" && s !== statusTab) return false;

        const name = `${w.employee?.firstName || ""} ${w.employee?.lastName || ""}`.toLowerCase();
        const email = (w.employee?.email || "").toLowerCase();
        const code = (w.employee?.employeeCode || "").toLowerCase();
        const subject = (w.subject || "").toLowerCase();
        const wType = (w.warningTypeName || w.warningType?.name || "").toLowerCase();
        if (q && !name.includes(q) && !email.includes(q) && !code.includes(q) && !subject.includes(q) && !wType.includes(q)) {
          return false;
        }

        if (typeFilter !== "all" && wType !== typeFilter.toLowerCase()) return false;
        if (severityFilter !== "all" && (w.severity || "").toLowerCase() !== severityFilter.toLowerCase()) {
          return false;
        }
        return true;
      })
      .sort((a: any, b: any) => {
        const aVal = new Date(a.warningDate || 0).getTime();
        const bVal = new Date(b.warningDate || 0).getTime();
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      });
  }, [warnings, statusTab, search, typeFilter, severityFilter, sortDir]);

  const paginatedWarnings = filteredWarnings.slice((page - 1) * pageSize, page * pageSize);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (w: any) => {
    setEditingItem(w);
    setFormData({
      employeeId: w.employeeId || "",
      warningBy: w.warningBy || "",
      warningTypeName: w.warningTypeName || w.warningType?.name || "",
      subject: w.subject || "",
      severity: w.severity || "Written",
      warningDate: toInputDate(w.warningDate),
      expiryDate: toInputDate(w.expiryDate),
      description: w.description || "",
      letterUrl: w.letterUrl || "",
      documentName: w.documentName || "",
      hasImprovementPlan: Boolean(w.hasImprovementPlan),
      improvementPlanGoals: w.improvementPlanGoals || "",
      improvementPlanStartDate: toInputDate(w.improvementPlanStartDate),
      improvementPlanEndDate: toInputDate(w.improvementPlanEndDate),
      status: (w.status || "issued").toLowerCase(),
      acknowledgedAt: toInputDate(w.acknowledgedAt),
      employeeResponse: w.employeeResponse || "",
      improvementPlanProgress: w.improvementPlanProgress || "",
    });
    setIsFormOpen(true);
  };

  const handleOpenStatusModal = (w: any) => {
    setStatusModalItem(w);
    setStatusForm({
      status: (w.status || "issued").toLowerCase(),
      acknowledgedAt: toInputDate(w.acknowledgedAt),
      employeeResponse: w.employeeResponse || "",
    });
  };

  const handleOpenPipModal = (w: any) => {
    setPipModalItem(w);
    setPipForm({
      hasImprovementPlan: Boolean(w.hasImprovementPlan),
      improvementPlanGoals: w.improvementPlanGoals || "",
      improvementPlanStartDate: toInputDate(w.improvementPlanStartDate),
      improvementPlanEndDate: toInputDate(w.improvementPlanEndDate),
      improvementPlanProgress: w.improvementPlanProgress || "",
    });
  };

  const handleSaveForm = () => {
    if (!formData.employeeId) {
      toast.error("Please select an employee.");
      return;
    }
    if (!formData.subject.trim()) {
      toast.error("Subject is required.");
      return;
    }
    if (!formData.warningDate) {
      toast.error("Warning Date is required.");
      return;
    }

    const payload = {
      ...formData,
      expiryDate: formData.expiryDate || null,
      acknowledgedAt: formData.acknowledgedAt || null,
      improvementPlanStartDate: formData.improvementPlanStartDate || null,
      improvementPlanEndDate: formData.improvementPlanEndDate || null,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleSaveStatus = () => {
    if (!statusModalItem) return;
    if (statusForm.status === "acknowledged" && !statusForm.employeeResponse.trim()) {
      toast.error("Please provide the employee response.");
      return;
    }
    statusMutation.mutate({
      id: statusModalItem.id,
      payload: {
        status: statusForm.status,
        acknowledgedAt: statusForm.acknowledgedAt || null,
        employeeResponse: statusForm.employeeResponse || null,
      },
    });
  };

  const handleSavePip = () => {
    if (!pipModalItem) return;
    if (pipForm.hasImprovementPlan && !pipForm.improvementPlanGoals.trim()) {
      toast.error("Improvement Plan Goals are required.");
      return;
    }
    pipMutation.mutate({
      id: pipModalItem.id,
      payload: {
        hasImprovementPlan: pipForm.hasImprovementPlan,
        improvementPlanGoals: pipForm.improvementPlanGoals || null,
        improvementPlanStartDate: pipForm.improvementPlanStartDate || null,
        improvementPlanEndDate: pipForm.improvementPlanEndDate || null,
        improvementPlanProgress: pipForm.improvementPlanProgress || null,
      },
    });
  };

  const hasActiveFilters = Boolean(search || typeFilter !== "all" || severityFilter !== "all");
  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setSeverityFilter("all");
    setPage(1);
  };

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      <PageHeader
        title="Warnings"
        description="Manage formal warnings issued to employees."
        breadcrumbs={[
          { label: "Dashboard", href: isEmployeePortal ? "/me/dashboard" : "/hr/dashboard" },
          { label: "Employee Lifecycle", href: isEmployeePortal ? "/me/awards" : "/hr/lifecycle" },
          { label: "Warnings" },
        ]}
        actions={
          !isEmployeePortal ? (
            <Button
              onClick={handleOpenCreate}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 h-9"
            >
              <Plus className="h-4 w-4" />
              Add Warning
            </Button>
          ) : undefined
        }
      />

      {/* Filter Card + Status Tabs */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs">
        <div className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:flex-1 sm:min-w-[200px] max-w-xs">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9"
            />
          </div>

          <Select
            value={typeFilter}
            onValueChange={(val) => {
              setTypeFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[160px] h-9">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {WARNING_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={severityFilter}
            onValueChange={(val) => {
              setSeverityFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[160px] h-9">
              <SelectValue placeholder="All Severities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              {SEVERITIES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center justify-end gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1 text-muted-foreground">
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={clearFilters}>
              <Filter className="h-3.5 w-3.5" />
              Filters
            </Button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="px-4 border-t border-border/60 flex items-center gap-6 overflow-x-auto">
          {[
            { key: "all", label: "All", count: counts.all, icon: LayoutGrid },
            { key: "draft", label: "Draft", count: counts.draft, icon: FileEdit },
            { key: "issued", label: "Issued", count: counts.issued, icon: Clock },
            { key: "acknowledged", label: "Acknowledged", count: counts.acknowledged, icon: CheckCircle2 },
            { key: "expired", label: "Expired", count: counts.expired, icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = statusTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStatusTab(tab.key as any);
                  setPage(1);
                }}
                className={cn(
                  "flex items-center gap-2 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap",
                  active
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded-full text-[11px] font-semibold",
                    active ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-12 text-[11px] uppercase tracking-wider text-muted-foreground">#</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Employee</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Subject</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Type</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Severity</TableHead>
                <TableHead
                  className="text-[11px] uppercase tracking-wider text-muted-foreground cursor-pointer select-none"
                  onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                >
                  <span className="inline-flex items-center gap-1">
                    Date <ArrowUpDown className="h-3 w-3" />
                  </span>
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Improvement Plan</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground text-center">Documents</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                    Loading warnings...
                  </TableCell>
                </TableRow>
              ) : paginatedWarnings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                    No warnings found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedWarnings.map((w: any, idx: number) => {
                  const fullName = `${w.employee?.firstName || ""} ${w.employee?.lastName || ""}`.trim() || "Unknown";
                  const initials = fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const avatarUrl = w.employee?.user?.profile?.avatarUrl || w.employee?.avatarUrl;

                  return (
                    <TableRow key={w.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-medium text-muted-foreground">
                        {(page - 1) * pageSize + idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-border/60">
                            {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
                            <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">{fullName}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {w.employee?.email || w.employee?.employeeCode || "—"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-sm text-foreground max-w-[180px] truncate">
                        {w.subject}
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {w.warningTypeName || w.warningType?.name || "General"}
                      </TableCell>
                      <TableCell>{getSeverityBadge(w.severity)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDateSafe(w.warningDate)}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(w.status)}</TableCell>
                      <TableCell>
                        {w.hasImprovementPlan ? (
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                            Yes
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground font-medium">
                            No
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {w.letterUrl ? (
                          <a
                            href={w.letterUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                            title={w.documentName || "View Document"}
                          >
                            <FileText className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="View Warning Details"
                            onClick={() => setViewItem(w)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!isEmployeePortal && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                title="Edit Warning"
                                onClick={() => handleOpenEdit(w)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-amber-600"
                                title="Change Warning Status"
                                onClick={() => handleOpenStatusModal(w)}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-emerald-600"
                                title="Update Improvement Plan"
                                onClick={() => handleOpenPipModal(w)}
                              >
                                <TrendingUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                title="Delete Warning"
                                onClick={() => setDeleteTarget(w)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <StandardPagination
          page={page}
          pageSize={pageSize}
          total={filteredWarnings.length}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      </div>

      {/* Add / Edit Warning Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Warning" : "Add New Warning"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>
                Employee <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.employeeId}
                onValueChange={(val) => setFormData({ ...formData, employeeId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Warning By <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.warningBy}
                onValueChange={(val) => setFormData({ ...formData, warningBy: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select issuer" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {employees.map((emp: any) => {
                    const name = `${emp.firstName} ${emp.lastName}`.trim();
                    return (
                      <SelectItem key={emp.id} value={name}>
                        {name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Warning Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.warningTypeName}
                onValueChange={(val) => setFormData({ ...formData, warningTypeName: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Warning Type" />
                </SelectTrigger>
                <SelectContent>
                  {WARNING_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Subject <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g. Excessive Absenteeism"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Severity <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.severity}
                onValueChange={(val) => setFormData({ ...formData, severity: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>
                  Warning Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  value={formData.warningDate}
                  onChange={(e) => setFormData({ ...formData, warningDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={3}
                placeholder="Describe the incident or policy violation..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <LifecycleDocumentField
              label="Documents"
              folder="tenant/warnings"
              documentUrl={formData.letterUrl}
              documentName={formData.documentName}
              onChange={(url, name) => setFormData({ ...formData, letterUrl: url, documentName: name })}
            />

            {/* Improvement Plan Section */}
            <div className="pt-2 border-t border-border/60 space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="has-improvement-plan"
                  checked={formData.hasImprovementPlan}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, hasImprovementPlan: Boolean(checked) })
                  }
                />
                <Label htmlFor="has-improvement-plan" className="cursor-pointer font-semibold">
                  Has Improvement Plan
                </Label>
              </div>

              <div className="space-y-1.5">
                <Label>Improvement Plan Goals</Label>
                <Textarea
                  rows={2}
                  placeholder="e.g. Improve attendance, Meet performance targets..."
                  value={formData.improvementPlanGoals}
                  onChange={(e) =>
                    setFormData({ ...formData, improvementPlanGoals: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Improvement Plan Start Date</Label>
                  <Input
                    type="date"
                    value={formData.improvementPlanStartDate}
                    onChange={(e) =>
                      setFormData({ ...formData, improvementPlanStartDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Improvement Plan End Date</Label>
                  <Input
                    type="date"
                    value={formData.improvementPlanEndDate}
                    onChange={(e) =>
                      setFormData({ ...formData, improvementPlanEndDate: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                Status <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData({ ...formData, status: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Acknowledgment Date</Label>
              <Input
                type="date"
                value={formData.acknowledgedAt}
                onChange={(e) => setFormData({ ...formData, acknowledgedAt: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Employee Response</Label>
              <Textarea
                rows={2}
                placeholder="e.g. Employee comments or response to the warning..."
                value={formData.employeeResponse}
                onChange={(e) => setFormData({ ...formData, employeeResponse: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Improvement Plan Progress</Label>
              <Textarea
                rows={2}
                placeholder="e.g. Progress made towards improvement goals..."
                value={formData.improvementPlanProgress}
                onChange={(e) =>
                  setFormData({ ...formData, improvementPlanProgress: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveForm}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warning Details Modal */}
      <Dialog open={!!viewItem} onOpenChange={(open) => !open && setViewItem(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <span className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4" />
              </span>
              Warning Details
            </DialogTitle>
          </DialogHeader>

          {viewItem && (
            <div className="space-y-5 py-2">
              {/* Employee Summary */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border/60">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {(viewItem.employee?.user?.profile?.avatarUrl || viewItem.employee?.avatarUrl) && (
                      <AvatarImage
                        src={viewItem.employee?.user?.profile?.avatarUrl || viewItem.employee?.avatarUrl}
                      />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                      {`${viewItem.employee?.firstName?.[0] || ""}${viewItem.employee?.lastName?.[0] || ""}`.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Employee</p>
                    <p className="font-semibold text-sm text-foreground">
                      {viewItem.employee?.firstName} {viewItem.employee?.lastName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getSeverityBadge(viewItem.severity)}
                  {getStatusBadge(viewItem.status)}
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Subject</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{viewItem.subject}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Tag className="h-3.5 w-3.5" />
                    <span>Warning Type</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {viewItem.warningTypeName || viewItem.warningType?.name || "General"}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span>Warning By</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{viewItem.warningBy || "—"}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Warning Date</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {formatDateSafe(viewItem.warningDate)}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Expiry Date</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {formatDateSafe(viewItem.expiryDate)}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Improvement Plan</span>
                  </div>
                  <div>
                    {viewItem.hasImprovementPlan ? (
                      <Badge className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                        Yes
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        No
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Documents */}
              <DocumentPreviewBlock
                url={viewItem.letterUrl}
                name={viewItem.documentName}
                label="Documents"
              />

              {/* Description */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Description</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {viewItem.description || "—"}
                </p>
              </div>

              {/* Improvement Plan Details if active */}
              {viewItem.hasImprovementPlan && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-2">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    Improvement Plan ({formatDateSafe(viewItem.improvementPlanStartDate)} →{" "}
                    {formatDateSafe(viewItem.improvementPlanEndDate)})
                  </p>
                  {viewItem.improvementPlanGoals && (
                    <p className="text-xs text-foreground">
                      <strong>Goals:</strong> {viewItem.improvementPlanGoals}
                    </p>
                  )}
                  {viewItem.improvementPlanProgress && (
                    <p className="text-xs text-muted-foreground">
                      <strong>Progress:</strong> {viewItem.improvementPlanProgress}
                    </p>
                  )}
                </div>
              )}

              {/* Employee Response if present */}
              {viewItem.employeeResponse && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Employee Response{" "}
                    {viewItem.acknowledgedAt ? `(${formatDateSafe(viewItem.acknowledgedAt)})` : ""}
                  </p>
                  <p className="text-sm text-foreground bg-muted/40 p-3 rounded-lg">
                    {viewItem.employeeResponse}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Warning Status Modal */}
      <Dialog open={!!statusModalItem} onOpenChange={(open) => !open && setStatusModalItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Warning Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>
                Status <span className="text-destructive">*</span>
              </Label>
              <Select
                value={statusForm.status}
                onValueChange={(val) => setStatusForm({ ...statusForm, status: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Acknowledgment Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={statusForm.acknowledgedAt}
                onChange={(e) => setStatusForm({ ...statusForm, acknowledgedAt: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Employee Response <span className="text-destructive">*</span>
              </Label>
              <Textarea
                rows={3}
                placeholder="e.g. Employee comments or response to the warning..."
                value={statusForm.employeeResponse}
                onChange={(e) => setStatusForm({ ...statusForm, employeeResponse: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setStatusModalItem(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveStatus}
              disabled={statusMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {statusMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Improvement Plan Modal */}
      <Dialog open={!!pipModalItem} onOpenChange={(open) => !open && setPipModalItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Improvement Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="pip-modal-toggle"
                checked={pipForm.hasImprovementPlan}
                onCheckedChange={(checked) =>
                  setPipForm({ ...pipForm, hasImprovementPlan: Boolean(checked) })
                }
              />
              <Label htmlFor="pip-modal-toggle" className="cursor-pointer font-semibold">
                Has Improvement Plan
              </Label>
            </div>

            <div className="space-y-1.5">
              <Label>
                Improvement Plan Goals <span className="text-destructive">*</span>
              </Label>
              <Textarea
                rows={3}
                placeholder="e.g. Improve attendance, Meet performance targets..."
                value={pipForm.improvementPlanGoals}
                onChange={(e) => setPipForm({ ...pipForm, improvementPlanGoals: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Improvement Plan Start Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={pipForm.improvementPlanStartDate}
                onChange={(e) =>
                  setPipForm({ ...pipForm, improvementPlanStartDate: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Improvement Plan End Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={pipForm.improvementPlanEndDate}
                onChange={(e) =>
                  setPipForm({ ...pipForm, improvementPlanEndDate: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>Improvement Plan Progress</Label>
              <Textarea
                rows={3}
                placeholder="e.g. Progress made towards improvement goals..."
                value={pipForm.improvementPlanProgress}
                onChange={(e) =>
                  setPipForm({ ...pipForm, improvementPlanProgress: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPipModalItem(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSavePip}
              disabled={pipMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {pipMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Warning Record"
        description="Are you sure you want to delete this disciplinary warning? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}
