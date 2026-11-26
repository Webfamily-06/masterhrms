"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@/lib/router-compat";
import { api, unwrapArray } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LifecycleDocumentField } from "@/components/hr/lifecycle-document-field";
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
  Calendar,
  ArrowUpDown,
  Eye,
  Edit,
  Trash2,
  Download,
  BarChart2,
  UserPlus,
  LayoutGrid,
  BookOpen,
  Loader2,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react";

type EnrollmentStatus = "assigned" | "in_progress" | "completed" | "failed";

interface EnrollmentItem {
  id: string;
  courseId: string;
  employeeId: string;
  status: EnrollmentStatus;
  assignedDate: string;
  completionDate: string;
  score: number | null;
  isPassed: boolean | null;
  result: string | null;
  feedback: string;
  notes: string;
  certificationUrl: string;
  certificationName: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    employeeCode?: string;
    avatarUrl?: string | null;
  } | null;
  course?: {
    id: string;
    title: string;
    name?: string;
    trainingTypeName?: string;
    category?: string;
  } | null;
}

interface ProgramOption {
  id: string;
  name: string;
  title?: string;
}

function getInitials(first?: string, last?: string) {
  return `${(first || "")[0] || ""}${(last || "")[0] || ""}`.toUpperCase() || "?";
}

function StatusBadge({ status }: { status: EnrollmentStatus }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
        Completed
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
        In Progress
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
      Assigned
    </span>
  );
}

const EMPTY_FORM = {
  employeeId: "",
  courseId: "",
  status: "assigned" as EnrollmentStatus,
  assignedDate: new Date().toISOString().split("T")[0],
  completionDate: "",
  certificationUrl: "",
  certificationName: "",
  score: "",
  isPassed: false,
  feedback: "",
  notes: "",
};

const EMPTY_BULK = {
  employeeIds: [] as string[],
  courseId: "",
  assignedDate: new Date().toISOString().split("T")[0],
  notes: "",
};

export default function HrEmployeeTrainingsPage() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isEmployeePortal = currentPath.startsWith("/me");
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | EnrollmentStatus>("all");
  const [sortBy, setSortBy] = useState<"assignedDate" | "completionDate" | "score" | "status">(
    "assignedDate"
  );
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EnrollmentItem | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkData, setBulkData] = useState(EMPTY_BULK);
  const [deleteTarget, setDeleteTarget] = useState<EnrollmentItem | null>(null);

  const { data: enrollments = [], isLoading } = useQuery<EnrollmentItem[]>({
    queryKey: ["hr-employee-trainings"],
    queryFn: async () => {
      const res = await api.get("/hr/training/employee-trainings");
      return unwrapArray<EnrollmentItem>(res);
    },
  });

  const { data: programs = [] } = useQuery<ProgramOption[]>({
    queryKey: ["hr-training-programs"],
    queryFn: async () => {
      const res = await api.get("/hr/training/programs");
      return unwrapArray<ProgramOption>(res);
    },
  });

  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ["hr-employees-list-emp-trainings"],
    queryFn: async () => {
      const res = await api.get("/hr/employees?limit=300");
      return unwrapArray(res);
    },
  });

  const avatarMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const emp of employees) {
      const url = emp.avatarUrl || emp.user?.profile?.avatarUrl;
      if (emp.id && url) m.set(emp.id, url);
    }
    return m;
  }, [employees]);

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const body = {
        ...payload,
        score: payload.score !== "" ? Number(payload.score) : null,
      };
      if (editing) {
        return api.put(`/hr/training/employee-trainings/${editing.id}`, body);
      }
      return api.post("/hr/training/employee-trainings", body);
    },
    onSuccess: () => {
      toast.success(editing ? "Training assignment updated" : "Training assigned to employee");
      queryClient.invalidateQueries({ queryKey: ["hr-employee-trainings"] });
      setFormOpen(false);
      setEditing(null);
      setFormData(EMPTY_FORM);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save training assignment"),
  });

  const bulkMutation = useMutation({
    mutationFn: async (payload: typeof bulkData) =>
      api.post("/hr/training/employee-trainings/bulk", payload),
    onSuccess: (res: any) => {
      const created = res?.createdCount ?? 0;
      const skipped = res?.skippedCount ?? 0;
      toast.success(
        skipped > 0
          ? `Assigned to ${created} employee(s) (${skipped} already enrolled)`
          : `Assigned training to ${created} employee(s)`
      );
      queryClient.invalidateQueries({ queryKey: ["hr-employee-trainings"] });
      setBulkOpen(false);
      setBulkData(EMPTY_BULK);
    },
    onError: (err: any) => toast.error(err?.message || "Bulk assignment failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/training/employee-trainings/${id}`),
    onSuccess: () => {
      toast.success("Training assignment deleted");
      queryClient.invalidateQueries({ queryKey: ["hr-employee-trainings"] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete assignment"),
  });

  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enrollments.filter((item) => {
      if (selectedProgram !== "all" && item.courseId !== selectedProgram) return false;
      if (dateFrom && item.assignedDate < dateFrom) return false;
      if (dateTo && item.assignedDate > dateTo) return false;
      if (q) {
        const emp = `${item.employee?.firstName || ""} ${item.employee?.lastName || ""} ${item.employee?.employeeCode || ""
          }`.toLowerCase();
        const prog = `${item.course?.title || ""} ${item.course?.trainingTypeName || ""}`.toLowerCase();
        if (!emp.includes(q) && !prog.includes(q)) return false;
      }
      return true;
    });
  }, [enrollments, search, selectedProgram, dateFrom, dateTo]);

  const counts = useMemo(
    () => ({
      all: baseFiltered.length,
      assigned: baseFiltered.filter((e) => e.status === "assigned").length,
      in_progress: baseFiltered.filter((e) => e.status === "in_progress").length,
      completed: baseFiltered.filter((e) => e.status === "completed").length,
      failed: baseFiltered.filter((e) => e.status === "failed").length,
    }),
    [baseFiltered]
  );

  const filtered = useMemo(() => {
    const list =
      activeTab === "all"
        ? baseFiltered
        : baseFiltered.filter((e) => e.status === activeTab);
    return [...list].sort((a, b) => {
      if (sortBy === "score") {
        const sa = a.score ?? -1;
        const sb = b.score ?? -1;
        return sortAsc ? sa - sb : sb - sa;
      }
      const va =
        sortBy === "status"
          ? a.status
          : sortBy === "completionDate"
            ? a.completionDate || ""
            : a.assignedDate || "";
      const vb =
        sortBy === "status"
          ? b.status
          : sortBy === "completionDate"
            ? b.completionDate || ""
            : b.assignedDate || "";
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }, [baseFiltered, activeTab, sortBy, sortAsc]);

  const totalResults = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const hasFilters = Boolean(search || selectedProgram !== "all" || dateFrom || dateTo);

  const openAdd = () => {
    setEditing(null);
    setFormData(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (item: EnrollmentItem) => {
    setEditing(item);
    setFormData({
      employeeId: item.employeeId || "",
      courseId: item.courseId || "",
      status: item.status || "assigned",
      assignedDate: item.assignedDate || new Date().toISOString().split("T")[0],
      completionDate: item.completionDate || "",
      certificationUrl: item.certificationUrl || "",
      certificationName: item.certificationName || "",
      score: item.score !== null && item.score !== undefined ? String(item.score) : "",
      isPassed: Boolean(item.isPassed),
      feedback: item.feedback || "",
      notes: item.notes || "",
    });
    setFormOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId) return toast.error("Please select an Employee");
    if (!formData.courseId) return toast.error("Please select a Training Program");
    saveMutation.mutate(formData);
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkData.employeeIds.length === 0) return toast.error("Please select at least one employee");
    if (!bulkData.courseId) return toast.error("Please select a Training Program");
    bulkMutation.mutate(bulkData);
  };

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      <PageHeader
        title="Employee Trainings"
        description="View and manage training enrollments for your employees."
        actions={
          !isEmployeePortal ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => router.push("/hr/training/employee-trainings/dashboard")}
              >
                <BarChart2 className="h-4 w-4 mr-1.5" />
                Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setBulkData(EMPTY_BULK);
                  setBulkOpen(true);
                }}
              >
                <UserPlus className="h-4 w-4 mr-1.5" />
                Bulk Assign
              </Button>
              <Button
                onClick={openAdd}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Assign Training
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Filter & Tabs Card */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-[280px]">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search..."
              className="pl-9 h-9 bg-background"
            />
          </div>

          <Select
            value={selectedProgram}
            onValueChange={(val) => {
              setSelectedProgram(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px] h-9 bg-background">
              <SelectValue placeholder="All Programs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {programs.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name || p.title}
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
            className="w-full sm:w-[160px] h-9 bg-background"
            aria-label="Start Date"
          />

          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-[160px] h-9 bg-background"
            aria-label="End Date"
          />

          <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center justify-end gap-2">
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setSelectedProgram("all");
                  setDateFrom("");
                  setDateTo("");
                  setPage(1);
                }}
                className="h-9 text-xs"
              >
                <X className="h-3.5 w-3.5 mr-1" /> Reset
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              Filters
            </Button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="px-4 border-t border-border/70 flex items-center gap-6 overflow-x-auto">
          {[
            { key: "all" as const, label: "All", count: counts.all, Icon: LayoutGrid },
            { key: "assigned" as const, label: "Assigned", count: counts.assigned, Icon: BookOpen },
            { key: "in_progress" as const, label: "In Progress", count: counts.in_progress, Icon: Loader2 },
            { key: "completed" as const, label: "Completed", count: counts.completed, Icon: CheckCircle2 },
            { key: "failed" as const, label: "Failed", count: counts.failed, Icon: XCircle },
          ].map(({ key, label, count, Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveTab(key);
                  setPage(1);
                }}
                className={`py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${active
                  ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${active ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                    }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/80 bg-muted/50">
                <th className="p-3.5 text-xs font-semibold text-muted-foreground w-12">#</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">Employee</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">
                  Training Program
                </th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy("status");
                      setSortAsc((p) => !p);
                    }}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <span>Status</span>
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy("assignedDate");
                      setSortAsc((p) => !p);
                    }}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <span>Assigned Date</span>
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy("completionDate");
                      setSortAsc((p) => !p);
                    }}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <span>Completion Date</span>
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy("score");
                      setSortAsc((p) => !p);
                    }}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <span>Score</span>
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">Result</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground text-center">
                  Certificate
                </th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground text-right pr-5">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="p-10 text-center text-sm text-muted-foreground">
                    Loading employee trainings...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-10 text-center text-sm text-muted-foreground">
                    No employee trainings found. Click &ldquo;+ Assign Training&rdquo; to assign one.
                  </td>
                </tr>
              ) : (
                paginated.map((item, idx) => {
                  const rowNum = (safePage - 1) * pageSize + idx + 1;
                  const empName = item.employee
                    ? `${item.employee.firstName || ""} ${item.employee.lastName || ""}`.trim()
                    : "—";
                  const avatar = item.employee?.avatarUrl || avatarMap.get(item.employeeId) || null;
                  return (
                    <tr key={item.id} className="hover:bg-muted/35 transition-colors">
                      <td className="p-3.5 text-sm font-medium text-muted-foreground">{rowNum}</td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-3 min-w-[160px]">
                          {avatar ? (
                            <img
                              src={avatar}
                              alt={empName}
                              className="h-9 w-9 rounded-full object-cover border border-border/80 shrink-0"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
                              {getInitials(item.employee?.firstName, item.employee?.lastName)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-foreground truncate">
                              {empName}
                            </div>
                            {item.employee?.employeeCode && (
                              <div className="text-xs text-muted-foreground truncate">
                                {item.employee.employeeCode}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 min-w-[190px]">
                        <div className="text-sm font-semibold text-foreground">
                          {item.course?.title || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.course?.trainingTypeName || item.course?.category || "—"}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="p-3.5 text-sm text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {item.assignedDate || "-"}
                        </span>
                      </td>
                      <td className="p-3.5 text-sm text-muted-foreground whitespace-nowrap">
                        {item.completionDate ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {item.completionDate}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-3.5 text-sm font-semibold text-foreground whitespace-nowrap">
                        {item.score !== null && item.score !== undefined
                          ? `${Number(item.score).toFixed(2)}%`
                          : "-"}
                      </td>
                      <td className="p-3.5">
                        {item.result === "Passed" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                            Passed
                          </span>
                        ) : item.result === "Failed" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-rose-500/10 text-rose-700 border border-rose-500/20">
                            Failed
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        {item.certificationUrl ? (
                          <a
                            href={item.certificationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Download Certificate"
                            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-sky-600 hover:bg-sky-500/10"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3.5 pr-5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            title="View Training Details"
                            onClick={() =>
                              router.push(`/hr/training/employee-trainings/${item.id}`)
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!isEmployeePortal && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-sky-600"
                                title="Edit Assignment"
                                onClick={() => openEdit(item)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                                title="Delete Assignment"
                                onClick={() => setDeleteTarget(item)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
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
        <div className="px-4 py-3 border-t border-border/70 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <div>
            Showing{" "}
            <span className="font-medium text-foreground">
              {totalResults === 0 ? 0 : (safePage - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-foreground">
              {Math.min(safePage * pageSize, totalResults)}
            </span>{" "}
            of <span className="font-medium text-foreground">{totalResults}</span> results
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs">Rows per page:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[70px] h-8 bg-background text-xs">
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
                size="sm"
                className="h-8 px-2.5 text-xs"
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
                    variant={pNum === safePage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(pNum)}
                    className={`h-8 w-8 p-0 text-xs ${pNum === safePage
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500"
                      : ""
                      }`}
                  >
                    {pNum}
                  </Button>
                ))}
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next »
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Assign / Edit Training Assignment Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Training Assignment" : "Assign Training"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>
                Employee <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={formData.employeeId}
                onValueChange={(val) => setFormData((p) => ({ ...p, employeeId: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {`${emp.firstName || ""} ${emp.lastName || ""}`.trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Training Program <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={formData.courseId}
                onValueChange={(val) => setFormData((p) => ({ ...p, courseId: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Training Program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((prog) => (
                    <SelectItem key={prog.id} value={prog.id}>
                      {prog.name || prog.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Status <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={formData.status}
                onValueChange={(val) =>
                  setFormData((p) => ({ ...p, status: val as EnrollmentStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Assigned Date <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={formData.assignedDate}
                  onChange={(e) => setFormData((p) => ({ ...p, assignedDate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Completion Date</Label>
                <Input
                  type="date"
                  value={formData.completionDate}
                  onChange={(e) => setFormData((p) => ({ ...p, completionDate: e.target.value }))}
                />
              </div>
            </div>

            <LifecycleDocumentField
              label="Certification"
              folder="tenant/training-certifications"
              documentUrl={formData.certificationUrl}
              documentName={formData.certificationName}
              placeholder="Select certificate file..."
              onChange={(url, name) =>
                setFormData((p) => ({ ...p, certificationUrl: url, certificationName: name }))
              }
            />

            <div className="space-y-1.5">
              <Label>Score (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={formData.score}
                onChange={(e) => setFormData((p) => ({ ...p, score: e.target.value }))}
                placeholder="e.g. 85.00"
              />
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.isPassed}
                onChange={(e) => setFormData((p) => ({ ...p, isPassed: e.target.checked }))}
                className="h-4 w-4 rounded border-border accent-emerald-500"
              />
              <span className="text-sm font-semibold text-foreground">Passed</span>
            </label>

            <div className="space-y-1.5">
              <Label>Feedback</Label>
              <Textarea
                rows={3}
                value={formData.feedback}
                onChange={(e) => setFormData((p) => ({ ...p, feedback: e.target.value }))}
                placeholder="e.g. Employee showed great improvement throughout the training..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Training assigned for skill development and compliance requirements"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Training Modal */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Assign Training</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBulkSubmit} className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label>
                Employees <span className="text-rose-500">*</span>
              </Label>
              {bulkData.employeeIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {bulkData.employeeIds.map((id) => {
                    const emp = employees.find((e: any) => e.id === id);
                    const name = emp ? `${emp.firstName} ${emp.lastName}`.trim() : id;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-muted border border-border/80"
                      >
                        <span>{name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setBulkData((p) => ({
                              ...p,
                              employeeIds: p.employeeIds.filter((x) => x !== id),
                            }))
                          }
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <div className="max-h-44 overflow-y-auto border border-border/80 rounded-lg divide-y divide-border/50">
                {employees.map((emp: any) => {
                  const checked = bulkData.employeeIds.includes(emp.id);
                  const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
                  return (
                    <label
                      key={emp.id}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/40 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setBulkData((p) => ({
                            ...p,
                            employeeIds: checked
                              ? p.employeeIds.filter((x) => x !== emp.id)
                              : [...p.employeeIds, emp.id],
                          }))
                        }
                        className="h-4 w-4 rounded border-border accent-emerald-500"
                      />
                      <span>{fullName}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                Training Program <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={bulkData.courseId}
                onValueChange={(val) => setBulkData((p) => ({ ...p, courseId: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Training Program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((prog) => (
                    <SelectItem key={prog.id} value={prog.id}>
                      {prog.name || prog.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Assigned Date <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={bulkData.assignedDate}
                onChange={(e) => setBulkData((p) => ({ ...p, assignedDate: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={bulkData.notes}
                onChange={(e) => setBulkData((p) => ({ ...p, notes: e.target.value }))}
                placeholder="e.g. Additional notes about this bulk training assignment..."
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setBulkOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={bulkMutation.isPending}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {bulkMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Modal */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Training Assignment</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to remove{" "}
            <span className="font-semibold text-foreground">{deleteTarget?.course?.title}</span> for{" "}
            <span className="font-semibold text-foreground">
              {deleteTarget?.employee
                ? `${deleteTarget.employee.firstName} ${deleteTarget.employee.lastName}`
                : "this employee"}
            </span>
            ?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending || !deleteTarget}
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
