"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@/lib/router-compat";
import { api, unwrapArray } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Eye,
  Edit,
  CheckCircle2,
  Trash2,
  FileText,
  Clock,
  AlertTriangle,
  ShieldOff,
  LayoutGrid,
  Calendar,
} from "lucide-react";

interface DocOption {
  id: string;
  title: string;
  fileUrl?: string | null;
}

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

interface AcknowledgmentItem {
  id: string;
  documentId: string;
  employeeId: string;
  status: "pending" | "acknowledged" | "overdue" | "exempted" | string;
  rawStatus?: string;
  dueDate?: string;
  daysOverdue?: number;
  acknowledgedAt?: string;
  assignedAt?: string;
  assignedByName?: string;
  assignedByEmail?: string;
  assignedByAvatar?: string | null;
  comments?: string;
  note?: string;
  document?: {
    id: string;
    title: string;
    fileUrl?: string;
  } | null;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    avatarUrl?: string | null;
  } | null;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatDateYmd(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toISOString().split("T")[0];
}

function AvatarCircle({
  name,
  avatarUrl,
  size = "md",
}: {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md";
}) {
  const dims = size === "sm" ? "h-8 w-8 text-[11px]" : "h-9 w-9 text-xs";
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${dims} rounded-full object-cover border border-border/60 shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${dims} rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center border border-primary/20 shrink-0`}
    >
      {getInitials(name)}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = String(status || "pending").toLowerCase();
  if (s === "acknowledged") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-medium">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Acknowledged
      </span>
    );
  }
  if (s === "overdue") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20 px-2.5 py-0.5 text-xs font-medium">
        <AlertTriangle className="h-3.5 w-3.5" />
        Overdue
      </span>
    );
  }
  if (s === "exempted") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 text-slate-600 border border-slate-500/20 px-2.5 py-0.5 text-xs font-medium">
        <ShieldOff className="h-3.5 w-3.5" />
        Exempted
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2.5 py-0.5 text-xs font-medium">
      <Clock className="h-3.5 w-3.5" />
      Pending
    </span>
  );
}

export default function HrDocumentAcknowledgementsPage() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isEmployeePortal = currentPath.startsWith("/me");
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedDoc, setSelectedDoc] = useState("all");
  const [selectedUser, setSelectedUser] = useState("all");
  const [activeTab, setActiveTab] = useState<
    "all" | "pending" | "acknowledged" | "overdue" | "exempted"
  >("all");
  const [sortBy, setSortBy] = useState<"acknowledgedAt" | "dueDate">("dueDate");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [assignOpen, setAssignOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AcknowledgmentItem | null>(null);
  const [viewTarget, setViewTarget] = useState<AcknowledgmentItem | null>(null);
  const [ackTarget, setAckTarget] = useState<AcknowledgmentItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AcknowledgmentItem | null>(null);

  // Form states
  const [formDocId, setFormDocId] = useState("");
  const [formEmpId, setFormEmpId] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formStatus, setFormStatus] = useState("pending");
  const [formNote, setFormNote] = useState("");
  const [ackNote, setAckNote] = useState("");

  const { data: acks = [], isLoading } = useQuery<AcknowledgmentItem[]>({
    queryKey: ["hr-document-acknowledgements"],
    queryFn: async () => {
      const res = await api.get("/hr/documents/acknowledgements");
      return unwrapArray<AcknowledgmentItem>(res);
    },
  });

  const { data: documents = [] } = useQuery<DocOption[]>({
    queryKey: ["hr-documents-list-for-ack"],
    queryFn: async () => {
      const res = await api.get("/hr/documents");
      return unwrapArray<DocOption>(res);
    },
  });

  const { data: employees = [] } = useQuery<EmployeeOption[]>({
    queryKey: ["hr-employees-list-for-ack"],
    queryFn: async () => {
      const res = await api.get("/hr/employees?limit=500");
      return unwrapArray<EmployeeOption>(res);
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (payload: {
      documentId: string;
      employeeId: string;
      dueDate?: string;
      note?: string;
    }) => {
      const res = await api.post("/hr/documents/acknowledgements", payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-document-acknowledgements"] });
      toast.success("Document assigned for acknowledgment.");
      setAssignOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to assign document.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        documentId: string;
        employeeId: string;
        dueDate?: string;
        status: string;
        note?: string;
      };
    }) => {
      const res = await api.put(`/hr/documents/acknowledgements/${id}`, payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-document-acknowledgements"] });
      toast.success("Acknowledgment updated.");
      setEditTarget(null);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update acknowledgment.");
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const res = await api.patch(`/hr/documents/acknowledgements/${id}/acknowledge`, {
        note,
        comments: note,
      });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-document-acknowledgements"] });
      toast.success("Document marked as acknowledged.");
      setAckTarget(null);
      setAckNote("");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to acknowledge document.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/hr/documents/acknowledgements/${id}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-document-acknowledgements"] });
      toast.success("Acknowledgment deleted.");
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to delete acknowledgment.");
    },
  });

  function resetForm() {
    setFormDocId("");
    setFormEmpId("");
    setFormDueDate("");
    setFormStatus("pending");
    setFormNote("");
  }

  function openAssign() {
    resetForm();
    setAssignOpen(true);
  }

  function openEdit(item: AcknowledgmentItem) {
    setFormDocId(item.documentId || item.document?.id || "");
    setFormEmpId(item.employeeId || item.employee?.id || "");
    setFormDueDate(item.dueDate || "");
    setFormStatus(item.status || "pending");
    setFormNote(item.note || item.comments || "");
    setEditTarget(item);
  }

  function handleResetFilters() {
    setSearch("");
    setSelectedDoc("all");
    setSelectedUser("all");
    setActiveTab("all");
    setPage(1);
  }

  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return acks.filter((a) => {
      if (selectedDoc !== "all" && a.documentId !== selectedDoc) return false;
      if (selectedUser !== "all" && a.employeeId !== selectedUser) return false;
      if (q) {
        const empName = a.employee
          ? `${a.employee.firstName} ${a.employee.lastName}`.toLowerCase()
          : "";
        const docTitle = (a.document?.title || "").toLowerCase();
        const assignedBy = (a.assignedByName || "").toLowerCase();
        const email = (a.employee?.email || "").toLowerCase();
        if (
          !empName.includes(q) &&
          !docTitle.includes(q) &&
          !assignedBy.includes(q) &&
          !email.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [acks, search, selectedDoc, selectedUser]);

  const counts = useMemo(() => {
    const c = { all: baseFiltered.length, pending: 0, acknowledged: 0, overdue: 0, exempted: 0 };
    for (const a of baseFiltered) {
      const s = String(a.status || "pending").toLowerCase();
      if (s === "pending") c.pending += 1;
      else if (s === "acknowledged") c.acknowledged += 1;
      else if (s === "overdue") c.overdue += 1;
      else if (s === "exempted") c.exempted += 1;
    }
    return c;
  }, [baseFiltered]);

  const filteredAndSorted = useMemo(() => {
    const list =
      activeTab === "all"
        ? baseFiltered
        : baseFiltered.filter((a) => String(a.status || "pending").toLowerCase() === activeTab);

    return [...list].sort((a, b) => {
      const valA = sortBy === "acknowledgedAt" ? a.acknowledgedAt || "" : a.dueDate || "";
      const valB = sortBy === "acknowledgedAt" ? b.acknowledgedAt || "" : b.dueDate || "";
      const cmp = valA.localeCompare(valB);
      return sortAsc ? cmp : -cmp;
    });
  }, [baseFiltered, activeTab, sortBy, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, safePage, pageSize]);

  function toggleSort(col: "acknowledgedAt" | "dueDate") {
    if (sortBy === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(col);
      setSortAsc(false);
    }
  }

  function handleAssignSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formDocId || !formEmpId) {
      toast.error("Please select both Document and User.");
      return;
    }
    assignMutation.mutate({
      documentId: formDocId,
      employeeId: formEmpId,
      dueDate: formDueDate || undefined,
      note: formNote.trim() || undefined,
    });
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget || !formDocId || !formEmpId) {
      toast.error("Please select both Document and User.");
      return;
    }
    updateMutation.mutate({
      id: editTarget.id,
      payload: {
        documentId: formDocId,
        employeeId: formEmpId,
        dueDate: formDueDate || undefined,
        status: formStatus,
        note: formNote.trim() || undefined,
      },
    });
  }

  const tabs: Array<{
    key: "all" | "pending" | "acknowledged" | "overdue" | "exempted";
    label: string;
    count: number;
    icon: React.ReactNode;
  }> = [
    { key: "all", label: "All", count: counts.all, icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { key: "pending", label: "Pending", count: counts.pending, icon: <Clock className="h-3.5 w-3.5" /> },
    {
      key: "acknowledged",
      label: "Acknowledged",
      count: counts.acknowledged,
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    {
      key: "overdue",
      label: "Overdue",
      count: counts.overdue,
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
    },
    {
      key: "exempted",
      label: "Exempted",
      count: counts.exempted,
      icon: <ShieldOff className="h-3.5 w-3.5" />,
    },
  ];

  const startIdx = filteredAndSorted.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIdx = Math.min(safePage * pageSize, filteredAndSorted.length);

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      <PageHeader
        title="Acknowledgments"
        description="Track employee acknowledgments for HR documents."
        actions={
          !isEmployeePortal ? (
            <Button
              onClick={openAssign}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Assign Document
            </Button>
          ) : undefined
        }
      />

      {/* Filter Card + Status Tabs */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-border/60">
          <div className="relative w-full sm:flex-1 sm:min-w-[200px] max-w-xs">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search..."
              className="pl-9 h-9"
            />
          </div>

          <Select
            value={selectedDoc}
            onValueChange={(v) => {
              setSelectedDoc(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[190px] h-9">
              <SelectValue placeholder="All Documents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Documents</SelectItem>
              {documents.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedUser}
            onValueChange={(v) => {
              setSelectedUser(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[190px] h-9">
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {`${emp.firstName} ${emp.lastName}`.trim()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 gap-1.5"
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
            </Button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="px-4 flex items-center gap-1 overflow-x-auto bg-card">
          {tabs.map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setActiveTab(t.key);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-2 px-3 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    active
                      ? "bg-emerald-600 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/80 bg-muted/50">
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3 w-12">
                  #
                </th>
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                  Employee
                </th>
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                  Status
                </th>
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                  <button
                    type="button"
                    onClick={() => toggleSort("acknowledgedAt")}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors uppercase"
                  >
                    Acknowledged
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                  <button
                    type="button"
                    onClick={() => toggleSort("dueDate")}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors uppercase"
                  >
                    Due Date
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                  Assigned By
                </th>
                <th className="text-center text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                  Document
                </th>
                <th className="text-right text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    Loading acknowledgments...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-muted-foreground">
                    No document acknowledgments found.
                  </td>
                </tr>
              ) : (
                paginated.map((item, idx) => {
                  const empName = item.employee
                    ? `${item.employee.firstName} ${item.employee.lastName}`.trim()
                    : "Unknown Employee";
                  const docTitle = item.document?.title || "Untitled Document";
                  const assignedBy = item.assignedByName || "HR Manager";
                  const rowNum = (safePage - 1) * pageSize + idx + 1;
                  const isOverdue = String(item.status).toLowerCase() === "overdue";
                  const isAcked = String(item.status).toLowerCase() === "acknowledged";

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      <td className="p-3 font-medium text-muted-foreground">{rowNum}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <AvatarCircle
                            name={empName}
                            avatarUrl={item.employee?.avatarUrl}
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate">
                              {empName}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                              <FileText className="h-3 w-3 shrink-0" />
                              <span className="truncate">{docTitle}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {item.acknowledgedAt ? (
                          <span className="inline-flex items-center gap-1.5 text-foreground">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            {formatDateYmd(item.acknowledgedAt)}
                          </span>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="inline-flex items-center gap-1.5 text-foreground">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            {formatDateYmd(item.dueDate)}
                          </span>
                          {isOverdue && (item.daysOverdue ?? 0) > 0 && (
                            <span className="text-[11px] font-medium text-rose-600 mt-0.5">
                              {item.daysOverdue} {item.daysOverdue === 1 ? "day" : "days"} overdue
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <AvatarCircle
                            name={assignedBy}
                            avatarUrl={item.assignedByAvatar}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-foreground text-xs truncate">
                              {assignedBy}
                            </div>
                            {item.assignedByEmail && (
                              <div className="text-[11px] text-muted-foreground truncate">
                                {item.assignedByEmail}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          title={item.document?.fileUrl ? "Open Document" : "No file attached"}
                          onClick={() => {
                            if (item.document?.fileUrl) {
                              window.open(item.document.fileUrl, "_blank", "noopener,noreferrer");
                            } else {
                              toast.info("No file URL attached to this document.");
                            }
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sky-600 hover:bg-sky-500/10 transition-colors"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title="View Details"
                            onClick={() => setViewTarget(item)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {!isEmployeePortal && (
                            <button
                              type="button"
                              title="Edit"
                              onClick={() => openEdit(item)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-amber-600 hover:bg-amber-500/10 transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {!isAcked && (
                            <button
                              type="button"
                              title="Acknowledge Document"
                              onClick={() => {
                                setAckNote("");
                                setAckTarget(item);
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                          {!isEmployeePortal && (
                            <button
                              type="button"
                              title="Delete"
                              onClick={() => setDeleteTarget(item)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-rose-600 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>
            Showing <span className="font-semibold text-foreground">{startIdx}</span> to{" "}
            <span className="font-semibold text-foreground">{endIdx}</span> of{" "}
            <span className="font-semibold text-foreground">{filteredAndSorted.length}</span>{" "}
            results
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[70px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="xs"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                « Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(Math.max(0, safePage - 3), Math.min(totalPages, safePage + 2))
                .map((pNum) => (
                  <Button
                    key={pNum}
                    variant={pNum === safePage ? "primary" : "outline"}
                    size="xs"
                    className={
                      pNum === safePage
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                        : ""
                    }
                    onClick={() => setPage(pNum)}
                  >
                    {pNum}
                  </Button>
                ))}
              <Button
                variant="outline"
                size="xs"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next »
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Assign Document Modal */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Document for Acknowledgment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssignSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Document <span className="text-rose-500">*</span>
              </Label>
              <Select value={formDocId} onValueChange={setFormDocId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Document" />
                </SelectTrigger>
                <SelectContent>
                  {documents.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                User <span className="text-rose-500">*</span>
              </Label>
              <Select value={formEmpId} onValueChange={setFormEmpId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select User" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {`${emp.firstName} ${emp.lastName}`.trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Note</Label>
              <Textarea
                rows={3}
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                placeholder="Enter optional note..."
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAssignOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={assignMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {assignMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Document Acknowledgment Modal */}
      <Dialog open={Boolean(editTarget)} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Document Acknowledgment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Document <span className="text-rose-500">*</span>
              </Label>
              <Select value={formDocId} onValueChange={setFormDocId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Document" />
                </SelectTrigger>
                <SelectContent>
                  {documents.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                User <span className="text-rose-500">*</span>
              </Label>
              <Select value={formEmpId} onValueChange={setFormEmpId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select User" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {`${emp.firstName} ${emp.lastName}`.trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Status <span className="text-rose-500">*</span>
              </Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="exempted">Exempted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Note</Label>
              <Textarea
                rows={3}
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                placeholder="Enter note..."
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Acknowledgment Details Modal */}
      <Dialog open={Boolean(viewTarget)} onOpenChange={(o) => !o && setViewTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Acknowledgment Details</DialogTitle>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Document</div>
                  <div className="font-semibold text-foreground">
                    {viewTarget.document?.title || "Untitled Document"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Employee</div>
                  <div className="font-semibold text-foreground">
                    {viewTarget.employee
                      ? `${viewTarget.employee.firstName} ${viewTarget.employee.lastName}`.trim()
                      : "Unknown"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Status</div>
                  <StatusBadge status={viewTarget.status} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Due Date</div>
                  <div className="font-medium text-foreground">
                    {formatDateYmd(viewTarget.dueDate)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Acknowledged At</div>
                  <div className="font-medium text-foreground">
                    {formatDateYmd(viewTarget.acknowledgedAt)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Assigned At</div>
                  <div className="font-medium text-foreground">
                    {formatDateYmd(viewTarget.assignedAt)}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground mb-1">Assigned By</div>
                  <div className="flex items-center gap-2">
                    <AvatarCircle
                      name={viewTarget.assignedByName || "HR Manager"}
                      avatarUrl={viewTarget.assignedByAvatar}
                      size="sm"
                    />
                    <div>
                      <div className="font-medium text-foreground">
                        {viewTarget.assignedByName || "HR Manager"}
                      </div>
                      {viewTarget.assignedByEmail && (
                        <div className="text-xs text-muted-foreground">
                          {viewTarget.assignedByEmail}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground mb-1">Acknowledgment Note</div>
                  <div className="rounded-lg border border-border/80 bg-muted/30 p-3 text-foreground whitespace-pre-wrap">
                    {viewTarget.note || viewTarget.comments || "No note provided."}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewTarget(null)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Acknowledge Document Modal */}
      <Dialog open={Boolean(ackTarget)} onOpenChange={(o) => !o && setAckTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Acknowledge Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Acknowledgment Note</Label>
              <Textarea
                rows={4}
                value={ackNote}
                onChange={(e) => setAckNote(e.target.value)}
                placeholder="Enter optional acknowledgment note..."
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAckTarget(null)}>
                Cancel
              </Button>
              <Button
                disabled={acknowledgeMutation.isPending}
                onClick={() => {
                  if (!ackTarget) return;
                  acknowledgeMutation.mutate({
                    id: ackTarget.id,
                    note: ackNote.trim() || undefined,
                  });
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {acknowledgeMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Acknowledgment</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this acknowledgment record for{" "}
            <span className="font-semibold text-foreground">
              {deleteTarget?.document?.title || "this document"}
            </span>
            ? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
