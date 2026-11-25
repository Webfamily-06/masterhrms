'use client';

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  UserPlus,
  CheckCircle2,
  CalendarCheck,
  Trash2,
  Calendar,
  FileText,
  ArrowUpDown,
  MessageSquareWarning,
  Tag,
  User,
  Clock,
  XCircle,
  LayoutGrid,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const COMPLAINT_TYPES = [
  "Policy Violation",
  "Harassment",
  "Management Issues",
  "Workplace Conditions",
  "Discrimination",
  "Safety Concern",
  "Ethics & Compliance",
  "Other",
];

const RESOLUTION_TYPES = [
  "Disciplinary Action",
  "Mediation",
  "Policy Update",
  "Training Required",
  "Warning Issued",
  "No Action Needed",
  "Dismissed",
  "Other",
];

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

function normalizeStatus(status?: string): "submitted" | "under_investigation" | "resolved" | "dismissed" {
  const s = (status || "submitted").toLowerCase();
  if (s === "under_investigation" || s === "investigating" || s === "under_review") return "under_investigation";
  if (s === "resolved" || s === "closed") return "resolved";
  if (s === "dismissed" || s === "rejected") return "dismissed";
  return "submitted";
}

function getStatusBadge(status?: string) {
  const s = normalizeStatus(status);
  if (s === "resolved") {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-medium">
        Resolved
      </Badge>
    );
  }
  if (s === "under_investigation") {
    return (
      <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-medium">
        Under Investigation
      </Badge>
    );
  }
  if (s === "dismissed") {
    return (
      <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 font-medium">
        Dismissed
      </Badge>
    );
  }
  return (
    <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 font-medium">
      Submitted
    </Badge>
  );
}

const emptyForm = {
  complainantId: "",
  accusedEmployeeId: "",
  category: "",
  subject: "",
  incidentDate: new Date().toISOString().split("T")[0],
  description: "",
  evidenceUrl: "",
  documentName: "",
  isAnonymous: false,
  status: "submitted",
  resolutionDeadline: "",
  resolutionNotes: "",
  actionTaken: "",
  resolvedAt: "",
  followUpAction: "",
  followUpDate: "",
};

export default function HrComplaintsPage() {
  const queryClient = useQueryClient();

  // Filters & Sort
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | "submitted" | "under_investigation" | "resolved" | "dismissed">("all");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const [viewItem, setViewItem] = useState<any | null>(null);

  const [statusModalItem, setStatusModalItem] = useState<any | null>(null);
  const [statusValue, setStatusValue] = useState("submitted");

  const [assignModalItem, setAssignModalItem] = useState<any | null>(null);
  const [assignForm, setAssignForm] = useState({ assignedInvestigatorId: "", resolutionDeadline: "" });

  const [resolveModalItem, setResolveModalItem] = useState<any | null>(null);
  const [resolveForm, setResolveForm] = useState({
    resolutionType: "",
    resolutionNotes: "",
    actionTaken: "",
    resolvedAt: new Date().toISOString().split("T")[0],
    followUpAction: "",
    followUpDate: "",
  });

  const [followUpModalItem, setFollowUpModalItem] = useState<any | null>(null);
  const [followUpForm, setFollowUpForm] = useState({
    followUpAction: "",
    followUpDate: "",
    feedback: "",
  });

  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  // Queries
  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ["hr-lifecycle-complaints"],
    queryFn: async () => {
      const res = await api.get("/hr/lifecycle/complaints");
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
    mutationFn: async (payload: any) => api.post("/hr/lifecycle/complaints", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-complaints"] });
      toast.success("Complaint recorded successfully.");
      setIsFormOpen(false);
      setFormData(emptyForm);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to create complaint.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) =>
      api.put(`/hr/lifecycle/complaints/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-complaints"] });
      toast.success("Complaint updated successfully.");
      setIsFormOpen(false);
      setEditingItem(null);
      setFormData(emptyForm);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update complaint.");
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      api.patch(`/hr/lifecycle/complaints/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-complaints"] });
      toast.success("Complaint status updated.");
      setStatusModalItem(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to change status.");
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) =>
      api.patch(`/hr/lifecycle/complaints/${id}/assign`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-complaints"] });
      toast.success("Complaint assigned.");
      setAssignModalItem(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to assign complaint.");
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) =>
      api.put(`/hr/lifecycle/complaints/${id}/resolve`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-complaints"] });
      toast.success("Complaint resolved.");
      setResolveModalItem(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to resolve complaint.");
    },
  });

  const followUpMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) =>
      api.patch(`/hr/lifecycle/complaints/${id}/follow-up`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-complaints"] });
      toast.success("Follow-up information updated.");
      setFollowUpModalItem(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update follow-up.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/lifecycle/complaints/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-complaints"] });
      toast.success("Complaint deleted.");
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to delete complaint.");
    },
  });

  // Status counts
  const counts = useMemo(() => {
    const c = { all: complaints.length, submitted: 0, under_investigation: 0, resolved: 0, dismissed: 0 };
    complaints.forEach((item: any) => {
      c[normalizeStatus(item.status)] += 1;
    });
    return c;
  }, [complaints]);

  // Filtering & Sorting
  const filteredComplaints = useMemo(() => {
    const q = search.toLowerCase().trim();
    return [...complaints]
      .filter((c: any) => {
        if (statusTab !== "all" && normalizeStatus(c.status) !== statusTab) return false;

        const compName = c.isAnonymous
          ? "anonymous"
          : `${c.complainantEmployee?.firstName || ""} ${c.complainantEmployee?.lastName || ""}`.toLowerCase();
        const againstName = `${c.againstEmployee?.firstName || ""} ${c.againstEmployee?.lastName || ""}`.toLowerCase();
        const cat = (c.category || "").toLowerCase();
        const subj = (c.subject || "").toLowerCase();
        if (q && !compName.includes(q) && !againstName.includes(q) && !cat.includes(q) && !subj.includes(q)) {
          return false;
        }

        if (typeFilter !== "all" && cat !== typeFilter.toLowerCase()) return false;

        const d = new Date(c.incidentDate || c.createdAt || 0);
        if (dateFrom && d < new Date(dateFrom)) return false;
        if (dateTo) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          if (d > end) return false;
        }
        return true;
      })
      .sort((a: any, b: any) => {
        const aVal = new Date(a.incidentDate || a.createdAt || 0).getTime();
        const bVal = new Date(b.incidentDate || b.createdAt || 0).getTime();
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      });
  }, [complaints, statusTab, search, typeFilter, dateFrom, dateTo, sortDir]);

  const paginatedComplaints = filteredComplaints.slice((page - 1) * pageSize, page * pageSize);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (c: any) => {
    setEditingItem(c);
    setFormData({
      complainantId: c.complainantId || "",
      accusedEmployeeId: c.accusedEmployeeId || "",
      category: c.category || "",
      subject: c.subject || "",
      incidentDate: toInputDate(c.incidentDate || c.createdAt),
      description: c.description || "",
      evidenceUrl: c.evidenceUrl || "",
      documentName: c.documentName || "",
      isAnonymous: Boolean(c.isAnonymous),
      status: normalizeStatus(c.status),
      resolutionDeadline: toInputDate(c.resolutionDeadline),
      resolutionNotes: c.resolutionNotes || "",
      actionTaken: c.actionTaken || "",
      resolvedAt: toInputDate(c.resolvedAt),
      followUpAction: c.followUpAction || "",
      followUpDate: toInputDate(c.followUpDate),
    });
    setIsFormOpen(true);
  };

  const handleSaveForm = () => {
    if (!formData.category) {
      toast.error("Please select a complaint type.");
      return;
    }
    if (!formData.subject.trim() || !formData.description.trim()) {
      toast.error("Subject and description are required.");
      return;
    }
    if (!formData.incidentDate) {
      toast.error("Complaint date is required.");
      return;
    }

    const payload = {
      ...formData,
      complainantId: formData.complainantId || null,
      accusedEmployeeId: formData.accusedEmployeeId === "none" ? null : formData.accusedEmployeeId || null,
      resolutionDeadline: formData.resolutionDeadline || null,
      resolvedAt: formData.resolvedAt || null,
      followUpDate: formData.followUpDate || null,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const hasActiveFilters = Boolean(search || typeFilter !== "all" || dateFrom || dateTo);
  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      <PageHeader
        title="Complaints"
        description="View and manage employee complaints and grievances."
        breadcrumbs={[
          { label: "Dashboard", href: "/hr/dashboard" },
          { label: "Employee Lifecycle", href: "/hr/lifecycle" },
          { label: "Complaints" },
        ]}
        actions={
          <Button
            onClick={handleOpenCreate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-9"
          >
            <Plus className="h-4 w-4" />
            Add Complaint
          </Button>
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
            <SelectTrigger className="w-full sm:w-[175px] h-9">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {COMPLAINT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-[155px] h-9"
            aria-label="Date From"
          />

          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-[155px] h-9"
            aria-label="Date To"
          />

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
            { key: "submitted", label: "Submitted", count: counts.submitted, icon: FileText },
            { key: "under_investigation", label: "Under Investigation", count: counts.under_investigation, icon: Clock },
            { key: "resolved", label: "Resolved", count: counts.resolved, icon: CheckCircle2 },
            { key: "dismissed", label: "Dismissed", count: counts.dismissed, icon: XCircle },
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
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Complainant</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Against</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Type</TableHead>
                <TableHead
                  className="text-[11px] uppercase tracking-wider text-muted-foreground cursor-pointer select-none"
                  onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                >
                  <span className="inline-flex items-center gap-1">
                    Date <ArrowUpDown className="h-3 w-3" />
                  </span>
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground text-center">Documents</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    Loading complaints...
                  </TableCell>
                </TableRow>
              ) : paginatedComplaints.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No complaints found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedComplaints.map((c: any, idx: number) => {
                  const compEmp = c.complainantEmployee;
                  const compName = compEmp ? `${compEmp.firstName || ""} ${compEmp.lastName || ""}`.trim() : "";
                  const compAvatar = compEmp?.user?.profile?.avatarUrl || compEmp?.avatarUrl;

                  const againstEmp = c.againstEmployee;
                  const againstName = againstEmp ? `${againstEmp.firstName || ""} ${againstEmp.lastName || ""}`.trim() : "";
                  const againstAvatar = againstEmp?.user?.profile?.avatarUrl || againstEmp?.avatarUrl;

                  return (
                    <TableRow key={c.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-medium text-muted-foreground">
                        {(page - 1) * pageSize + idx + 1}
                      </TableCell>
                      <TableCell>
                        {c.isAnonymous || !compEmp ? (
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-border/60">
                              <AvatarFallback className="text-xs font-semibold bg-muted text-muted-foreground">
                                AN
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-sm text-foreground">Anonymous</p>
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 mt-0.5 text-muted-foreground">
                                Anonymous
                              </Badge>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-border/60">
                              {compAvatar && <AvatarImage src={compAvatar} alt={compName} />}
                              <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                                {`${compEmp.firstName?.[0] || ""}${compEmp.lastName?.[0] || ""}`.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-foreground truncate">{compName}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {compEmp.email || compEmp.employeeCode || "—"}
                              </p>
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {againstEmp ? (
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-border/60">
                              {againstAvatar && <AvatarImage src={againstAvatar} alt={againstName} />}
                              <AvatarFallback className="text-xs font-semibold bg-rose-500/10 text-rose-600">
                                {`${againstEmp.firstName?.[0] || ""}${againstEmp.lastName?.[0] || ""}`.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-foreground truncate">{againstName}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {againstEmp.email || againstEmp.employeeCode || "—"}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-sm text-foreground">
                        {c.category}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDateSafe(c.incidentDate || c.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {c.evidenceUrl ? (
                          <a
                            href={c.evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                            title={c.documentName || "View Document"}
                          >
                            <FileText className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="View Complaint Details"
                            onClick={() => setViewItem(c)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            title="Edit Complaint"
                            onClick={() => handleOpenEdit(c)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                            title="Change Complaint Status"
                            onClick={() => {
                              setStatusModalItem(c);
                              setStatusValue(normalizeStatus(c.status));
                            }}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-purple-600"
                            title="Assign Complaint"
                            onClick={() => {
                              setAssignModalItem(c);
                              setAssignForm({
                                assignedInvestigatorId: c.assignedInvestigatorId || "",
                                resolutionDeadline: toInputDate(c.resolutionDeadline),
                              });
                            }}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-emerald-600"
                            title="Resolve Complaint"
                            onClick={() => {
                              setResolveModalItem(c);
                              setResolveForm({
                                resolutionType: c.resolutionType || "",
                                resolutionNotes: c.resolutionNotes || "",
                                actionTaken: c.actionTaken || "",
                                resolvedAt: toInputDate(c.resolvedAt) || new Date().toISOString().split("T")[0],
                                followUpAction: c.followUpAction || "",
                                followUpDate: toInputDate(c.followUpDate),
                              });
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-amber-600"
                            title="Update Follow-up Information"
                            onClick={() => {
                              setFollowUpModalItem(c);
                              setFollowUpForm({
                                followUpAction: c.followUpAction || "",
                                followUpDate: toInputDate(c.followUpDate),
                                feedback: c.feedback || "",
                              });
                            }}
                          >
                            <CalendarCheck className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title="Delete Complaint"
                            onClick={() => setDeleteTarget(c)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
          total={filteredComplaints.length}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      </div>

      {/* Add / Edit Complaint Modal (Screenshots 6, 8, 9) */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Complaint" : "Add New Complaint"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>
                Complainant <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.complainantId}
                onValueChange={(val) => setFormData({ ...formData, complainantId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Complainant" />
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
              <Label>Against</Label>
              <Select
                value={formData.accusedEmployeeId || "none"}
                onValueChange={(val) =>
                  setFormData({ ...formData, accusedEmployeeId: val === "none" ? "" : val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="none">None / General</SelectItem>
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
                Complaint Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(val) => setFormData({ ...formData, category: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Complaint Type" />
                </SelectTrigger>
                <SelectContent>
                  {COMPLAINT_TYPES.map((t) => (
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
                placeholder="e.g. Workplace Harassment Incident"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Complaint Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={formData.incidentDate}
                onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                rows={3}
                placeholder="e.g. Detailed description of the complaint..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <LifecycleDocumentField
              label="Documents"
              folder="tenant/complaints"
              documentUrl={formData.evidenceUrl}
              documentName={formData.documentName}
              onChange={(url, name) => setFormData({ ...formData, evidenceUrl: url, documentName: name })}
            />

            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="submit-anonymously"
                checked={formData.isAnonymous}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isAnonymous: Boolean(checked) })
                }
              />
              <Label htmlFor="submit-anonymously" className="cursor-pointer font-medium">
                Submit Anonymously
              </Label>
            </div>

            {/* Extended Edit Fields (Screenshot 9) */}
            {editingItem && (
              <div className="pt-3 border-t border-border/60 space-y-4">
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
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="under_investigation">Under Investigation</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="dismissed">Dismissed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Resolution Deadline</Label>
                  <Input
                    type="date"
                    value={formData.resolutionDeadline}
                    onChange={(e) => setFormData({ ...formData, resolutionDeadline: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Investigation Notes</Label>
                  <Textarea
                    rows={2}
                    placeholder="e.g. Notes from the investigation process..."
                    value={formData.resolutionNotes}
                    onChange={(e) => setFormData({ ...formData, resolutionNotes: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Resolution Action</Label>
                  <Textarea
                    rows={2}
                    placeholder="e.g. Actions taken to resolve the complaint..."
                    value={formData.actionTaken}
                    onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Resolution Date</Label>
                  <Input
                    type="date"
                    value={formData.resolvedAt}
                    onChange={(e) => setFormData({ ...formData, resolvedAt: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Follow-up Action</Label>
                  <Textarea
                    rows={2}
                    placeholder="e.g. Follow-up steps after resolution..."
                    value={formData.followUpAction}
                    onChange={(e) => setFormData({ ...formData, followUpAction: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Follow-up Date</Label>
                  <Input
                    type="date"
                    value={formData.followUpDate}
                    onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                  />
                </div>
              </div>
            )}
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

      {/* Complaint Details Modal (Screenshot 7) */}
      <Dialog open={!!viewItem} onOpenChange={(open) => !open && setViewItem(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <span className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <MessageSquareWarning className="h-4 w-4" />
              </span>
              Complaint Details
            </DialogTitle>
          </DialogHeader>

          {viewItem && (
            <div className="space-y-5 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span>Complainant</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {viewItem.isAnonymous || !viewItem.complainantEmployee
                      ? "Anonymous"
                      : `${viewItem.complainantEmployee.firstName} ${viewItem.complainantEmployee.lastName}`}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span>Against</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {viewItem.againstEmployee
                      ? `${viewItem.againstEmployee.firstName} ${viewItem.againstEmployee.lastName}`
                      : "-"}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Tag className="h-3.5 w-3.5" />
                    <span>Complaint Type</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{viewItem.category}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Complaint Date</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {formatDateSafe(viewItem.incidentDate || viewItem.createdAt)}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Status</span>
                  </div>
                  <div>{getStatusBadge(viewItem.status)}</div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Assigned To</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {viewItem.assignedToEmployee
                      ? `${viewItem.assignedToEmployee.firstName} ${viewItem.assignedToEmployee.lastName}`
                      : "-"}
                  </p>
                </div>
              </div>

              <DocumentPreviewBlock
                url={viewItem.evidenceUrl}
                name={viewItem.documentName}
                label="Documents"
              />

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Subject</span>
                </div>
                <p className="text-sm font-semibold text-foreground">{viewItem.subject}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Description</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{viewItem.description}</p>
              </div>

              {(viewItem.resolutionNotes || viewItem.actionTaken) && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-1.5 text-xs">
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                    Resolution {viewItem.resolutionType ? `(${viewItem.resolutionType})` : ""}
                  </p>
                  {viewItem.resolutionNotes && (
                    <p>
                      <strong>Investigation Notes:</strong> {viewItem.resolutionNotes}
                    </p>
                  )}
                  {viewItem.actionTaken && (
                    <p>
                      <strong>Resolution Action:</strong> {viewItem.actionTaken}
                    </p>
                  )}
                </div>
              )}

              {(viewItem.followUpAction || viewItem.feedback) && (
                <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 space-y-1.5 text-xs">
                  <p className="font-semibold text-foreground">
                    Follow-up {viewItem.followUpDate ? `(${formatDateSafe(viewItem.followUpDate)})` : ""}
                  </p>
                  {viewItem.followUpAction && <p>{viewItem.followUpAction}</p>}
                  {viewItem.feedback && (
                    <p className="text-muted-foreground">
                      <strong>Feedback:</strong> {viewItem.feedback}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Complaint Status Modal (Screenshot 10) */}
      <Dialog open={!!statusModalItem} onOpenChange={(open) => !open && setStatusModalItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Complaint Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>
                Status <span className="text-destructive">*</span>
              </Label>
              <Select value={statusValue} onValueChange={setStatusValue}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="under_investigation">Under Investigation</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setStatusModalItem(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                statusModalItem &&
                statusMutation.mutate({ id: statusModalItem.id, status: statusValue })
              }
              disabled={statusMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {statusMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Complaint Modal (Screenshot 11) */}
      <Dialog open={!!assignModalItem} onOpenChange={(open) => !open && setAssignModalItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Complaint</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>
                Assign To <span className="text-destructive">*</span>
              </Label>
              <Select
                value={assignForm.assignedInvestigatorId}
                onValueChange={(val) => setAssignForm({ ...assignForm, assignedInvestigatorId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select HR Personnel" />
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
              <Label>Resolution Deadline</Label>
              <Input
                type="date"
                value={assignForm.resolutionDeadline}
                onChange={(e) => setAssignForm({ ...assignForm, resolutionDeadline: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAssignModalItem(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!assignForm.assignedInvestigatorId) {
                  toast.error("Please select HR personnel to assign.");
                  return;
                }
                if (assignModalItem) {
                  assignMutation.mutate({
                    id: assignModalItem.id,
                    payload: {
                      assignedInvestigatorId: assignForm.assignedInvestigatorId,
                      resolutionDeadline: assignForm.resolutionDeadline || null,
                    },
                  });
                }
              }}
              disabled={assignMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {assignMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Complaint Modal (Screenshot 12) */}
      <Dialog open={!!resolveModalItem} onOpenChange={(open) => !open && setResolveModalItem(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resolve Complaint</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>
                Resolution Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={resolveForm.resolutionType}
                onValueChange={(val) => setResolveForm({ ...resolveForm, resolutionType: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Resolution Type" />
                </SelectTrigger>
                <SelectContent>
                  {RESOLUTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Investigation Notes <span className="text-destructive">*</span>
              </Label>
              <Textarea
                rows={3}
                placeholder="e.g. Notes from the investigation process..."
                value={resolveForm.resolutionNotes}
                onChange={(e) => setResolveForm({ ...resolveForm, resolutionNotes: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Resolution Action <span className="text-destructive">*</span>
              </Label>
              <Textarea
                rows={3}
                placeholder="e.g. Actions taken to resolve the complaint..."
                value={resolveForm.actionTaken}
                onChange={(e) => setResolveForm({ ...resolveForm, actionTaken: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Resolution Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={resolveForm.resolvedAt}
                onChange={(e) => setResolveForm({ ...resolveForm, resolvedAt: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Follow-up Action</Label>
              <Textarea
                rows={2}
                placeholder="e.g. Follow-up steps after resolution..."
                value={resolveForm.followUpAction}
                onChange={(e) => setResolveForm({ ...resolveForm, followUpAction: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Follow-up Date</Label>
              <Input
                type="date"
                value={resolveForm.followUpDate}
                onChange={(e) => setResolveForm({ ...resolveForm, followUpDate: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setResolveModalItem(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!resolveForm.resolutionType || !resolveForm.resolutionNotes.trim() || !resolveForm.actionTaken.trim()) {
                  toast.error("Resolution type, investigation notes, and resolution action are required.");
                  return;
                }
                if (resolveModalItem) {
                  resolveMutation.mutate({
                    id: resolveModalItem.id,
                    payload: {
                      ...resolveForm,
                      followUpDate: resolveForm.followUpDate || null,
                    },
                  });
                }
              }}
              disabled={resolveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {resolveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Follow-up Information Modal (Screenshot 13) */}
      <Dialog open={!!followUpModalItem} onOpenChange={(open) => !open && setFollowUpModalItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Follow-up Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>
                Follow-up Action <span className="text-destructive">*</span>
              </Label>
              <Textarea
                rows={3}
                placeholder="e.g. Follow-up steps after resolution..."
                value={followUpForm.followUpAction}
                onChange={(e) => setFollowUpForm({ ...followUpForm, followUpAction: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Follow-up Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={followUpForm.followUpDate}
                onChange={(e) => setFollowUpForm({ ...followUpForm, followUpDate: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Feedback</Label>
              <Textarea
                rows={3}
                placeholder="e.g. Feedback from the complainant..."
                value={followUpForm.feedback}
                onChange={(e) => setFollowUpForm({ ...followUpForm, feedback: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFollowUpModalItem(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!followUpForm.followUpAction.trim() || !followUpForm.followUpDate) {
                  toast.error("Follow-up action and date are required.");
                  return;
                }
                if (followUpModalItem) {
                  followUpMutation.mutate({
                    id: followUpModalItem.id,
                    payload: followUpForm,
                  });
                }
              }}
              disabled={followUpMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {followUpMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Complaint"
        description="Are you sure you want to delete this complaint record? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
