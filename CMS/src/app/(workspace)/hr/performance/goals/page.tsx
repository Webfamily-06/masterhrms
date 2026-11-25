"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Calendar,
  ArrowUpDown,
  Eye,
  Edit,
  BarChart2,
  Trash2,
  Tag,
  Target,
  User,
  FileText,
  Crosshair,
  LayoutGrid,
  Circle,
  Clock,
  CheckCircle2,
  X,
} from "lucide-react";

type GoalStatus = "not_started" | "in_progress" | "completed";

interface GoalRecord {
  id: string;
  title: string;
  description: string;
  target: string;
  startDate: string;
  endDate: string;
  progress: number;
  status: GoalStatus;
  goalTypeId?: string | null;
  goalType?: { id: string; name: string } | null;
  category?: string;
  ownerId: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    avatarUrl?: string | null;
  } | null;
}

interface GoalTypeRecord {
  id: string;
  name: string;
  isActive?: boolean;
  status?: string;
}

function getInitials(first?: string, last?: string) {
  return `${(first || "")[0] || ""}${(last || "")[0] || ""}`.toUpperCase() || "?";
}

function calcDays(start?: string, end?: string): string {
  if (!start || !end) return "-";
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "-";
  const diff = Math.max(0, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
  return `${diff}d`;
}

function StatusBadge({ status }: { status: GoalStatus }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
        Completed
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
        In Progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border/80">
      Not Started
    </span>
  );
}

const EMPTY_FORM = {
  employeeId: "",
  goalTypeId: "",
  title: "",
  description: "",
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
  target: "",
  progress: "0",
  status: "not_started" as GoalStatus,
};

export default function HrPerformanceGoalsPage() {
  const queryClient = useQueryClient();

  // Filter & table state
  const [search, setSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [selectedGoalType, setSelectedGoalType] = useState("all");
  const [activeTab, setActiveTab] = useState<"all" | GoalStatus>("all");
  const [sortBy, setSortBy] = useState<"title" | "duration">("duration");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalRecord | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [viewGoal, setViewGoal] = useState<GoalRecord | null>(null);
  const [progressGoal, setProgressGoal] = useState<GoalRecord | null>(null);
  const [progressValue, setProgressValue] = useState("0");
  const [deleteGoal, setDeleteGoal] = useState<GoalRecord | null>(null);

  const { data: goals = [], isLoading } = useQuery<GoalRecord[]>({
    queryKey: ["hr-performance-goals"],
    queryFn: async () => {
      const res = await api.get("/hr/performance/goals");
      return unwrapArray<GoalRecord>(res);
    },
  });

  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ["hr-employees-list-goals"],
    queryFn: async () => {
      const res = await api.get("/hr/employees?limit=300");
      return unwrapArray(res);
    },
  });

  const { data: goalTypes = [] } = useQuery<GoalTypeRecord[]>({
    queryKey: ["hr-performance-goal-types"],
    queryFn: async () => {
      const res = await api.get("/hr/performance/goal-types");
      return unwrapArray<GoalTypeRecord>(res);
    },
  });

  const activeGoalTypes = useMemo(
    () => goalTypes.filter((gt) => gt.isActive !== false && gt.status !== "inactive"),
    [goalTypes]
  );

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
        progress: Math.min(100, Math.max(0, Number(payload.progress || 0))),
      };
      if (editingGoal) {
        return api.put(`/hr/performance/goals/${editingGoal.id}`, body);
      }
      return api.post("/hr/performance/goals", body);
    },
    onSuccess: () => {
      toast.success(editingGoal ? "Employee goal updated" : "Employee goal created");
      queryClient.invalidateQueries({ queryKey: ["hr-performance-goals"] });
      setFormOpen(false);
      setEditingGoal(null);
      setFormData(EMPTY_FORM);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save goal"),
  });

  const progressMutation = useMutation({
    mutationFn: async ({ id, progress }: { id: string; progress: number }) =>
      api.patch(`/hr/performance/goals/${id}/progress`, { progress }),
    onSuccess: () => {
      toast.success("Goal progress updated");
      queryClient.invalidateQueries({ queryKey: ["hr-performance-goals"] });
      setProgressGoal(null);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update progress"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/performance/goals/${id}`),
    onSuccess: () => {
      toast.success("Employee goal deleted");
      queryClient.invalidateQueries({ queryKey: ["hr-performance-goals"] });
      setDeleteGoal(null);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete goal"),
  });

  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return goals.filter((g) => {
      if (selectedEmployee !== "all" && g.ownerId !== selectedEmployee) return false;
      if (selectedGoalType !== "all" && g.goalTypeId !== selectedGoalType) return false;
      if (q) {
        const emp = `${g.employee?.firstName || ""} ${g.employee?.lastName || ""} ${g.employee?.email || ""}`.toLowerCase();
        const typeName = (g.goalType?.name || g.category || "").toLowerCase();
        if (
          !g.title.toLowerCase().includes(q) &&
          !emp.includes(q) &&
          !typeName.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [goals, search, selectedEmployee, selectedGoalType]);

  const counts = useMemo(
    () => ({
      all: baseFiltered.length,
      not_started: baseFiltered.filter((g) => g.status === "not_started").length,
      in_progress: baseFiltered.filter((g) => g.status === "in_progress").length,
      completed: baseFiltered.filter((g) => g.status === "completed").length,
    }),
    [baseFiltered]
  );

  const filtered = useMemo(() => {
    const list =
      activeTab === "all"
        ? baseFiltered
        : baseFiltered.filter((g) => g.status === activeTab);
    return [...list].sort((a, b) => {
      if (sortBy === "title") {
        return sortAsc ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
      }
      const da = a.startDate || "";
      const db = b.startDate || "";
      return sortAsc ? da.localeCompare(db) : db.localeCompare(da);
    });
  }, [baseFiltered, activeTab, sortBy, sortAsc]);

  const totalResults = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const hasFilters = Boolean(
    search || selectedEmployee !== "all" || selectedGoalType !== "all"
  );

  const openAddModal = () => {
    setEditingGoal(null);
    setFormData(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEditModal = (goal: GoalRecord) => {
    setEditingGoal(goal);
    setFormData({
      employeeId: goal.ownerId || "",
      goalTypeId: goal.goalTypeId || "",
      title: goal.title || "",
      description: goal.description || "",
      startDate: goal.startDate || "",
      endDate: goal.endDate || "",
      target: goal.target || "",
      progress: String(goal.progress ?? 0),
      status: goal.status || "not_started",
    });
    setFormOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId) return toast.error("Please select an employee");
    if (!formData.goalTypeId && activeGoalTypes.length > 0) {
      return toast.error("Please select a goal type");
    }
    if (!formData.title.trim()) return toast.error("Please enter a goal title");
    if (!formData.startDate || !formData.endDate) {
      return toast.error("Please provide start and end dates");
    }
    saveMutation.mutate(formData);
  };

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      <PageHeader
        title="Employee Goals"
        description="Set and track performance goals for your employees."
        actions={
          <Button
            onClick={openAddModal}
            className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Goal
          </Button>
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
            value={selectedEmployee}
            onValueChange={(val) => {
              setSelectedEmployee(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px] h-9 bg-background">
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map((emp: any) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {`${emp.firstName || ""} ${emp.lastName || ""}`.trim()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedGoalType}
            onValueChange={(val) => {
              setSelectedGoalType(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px] h-9 bg-background">
              <SelectValue placeholder="All Goal Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Goal Types</SelectItem>
              {goalTypes.map((gt) => (
                <SelectItem key={gt.id} value={gt.id}>
                  {gt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center justify-end gap-2">
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setSelectedEmployee("all");
                  setSelectedGoalType("all");
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
            { key: "not_started" as const, label: "Not Started", count: counts.not_started, Icon: Circle },
            { key: "in_progress" as const, label: "In Progress", count: counts.in_progress, Icon: Clock },
            { key: "completed" as const, label: "Completed", count: counts.completed, Icon: CheckCircle2 },
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
                className={`py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    active ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Data Table Card */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/80 bg-muted/50">
                <th className="p-3.5 text-xs font-semibold text-muted-foreground w-12">#</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy("title");
                      setSortAsc((p) => !p);
                    }}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <span>Title</span>
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">Employee</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy("duration");
                      setSortAsc((p) => !p);
                    }}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <span>Duration</span>
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">Days</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">Progress</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground text-right pr-5">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-sm text-muted-foreground">
                    Loading employee goals...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-sm text-muted-foreground">
                    No employee goals found. Click &ldquo;+ Add Goal&rdquo; to create one.
                  </td>
                </tr>
              ) : (
                paginated.map((goal, idx) => {
                  const rowNum = (safePage - 1) * pageSize + idx + 1;
                  const empName = goal.employee
                    ? `${goal.employee.firstName || ""} ${goal.employee.lastName || ""}`.trim()
                    : "—";
                  const avatar = goal.employee?.avatarUrl || avatarMap.get(goal.ownerId) || null;
                  const goalTypeName = goal.goalType?.name || goal.category || "General";
                  const pct = Math.min(100, Math.max(0, Number(goal.progress || 0)));

                  return (
                    <tr key={goal.id} className="hover:bg-muted/35 transition-colors">
                      <td className="p-3.5 text-sm font-medium text-muted-foreground">{rowNum}</td>
                      <td className="p-3.5">
                        <div className="space-y-1.5 min-w-[200px]">
                          <div className="text-sm font-semibold text-foreground">{goal.title}</div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
                            <Tag className="h-3 w-3" />
                            {goalTypeName}
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-3 min-w-[180px]">
                          {avatar ? (
                            <img
                              src={avatar}
                              alt={empName}
                              className="h-9 w-9 rounded-full object-cover border border-border/80 shrink-0"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-semibold shrink-0">
                              {getInitials(goal.employee?.firstName, goal.employee?.lastName)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-foreground truncate">
                              {empName}
                            </div>
                            {goal.employee?.email && (
                              <div className="text-xs text-muted-foreground truncate">
                                {goal.employee.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{goal.startDate || "-"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{goal.endDate || "-"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
                          {calcDays(goal.startDate, goal.endDate)}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5 min-w-[125px]">
                          <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-foreground w-9 text-right">
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <StatusBadge status={goal.status} />
                      </td>
                      <td className="p-3.5 pr-5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            title="View Goal Details"
                            onClick={() => setViewGoal(goal)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-sky-600"
                            title="Edit Goal"
                            onClick={() => openEditModal(goal)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-emerald-600"
                            title="Update Goal Progress"
                            onClick={() => {
                              setProgressGoal(goal);
                              setProgressValue(String(goal.progress ?? 0));
                            }}
                          >
                            <BarChart2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                            title="Delete Goal"
                            onClick={() => setDeleteGoal(goal)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
                    className={`h-8 w-8 p-0 text-xs ${
                      pNum === safePage
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

      {/* View Goal Details Modal */}
      <Dialog open={Boolean(viewGoal)} onOpenChange={(o) => !o && setViewGoal(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <span className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Target className="h-4 w-4" />
              </span>
              <span>Employee Goal Details</span>
            </DialogTitle>
          </DialogHeader>
          {viewGoal && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Target className="h-3.5 w-3.5" />
                  <span>Goal Title</span>
                </div>
                <div className="text-sm font-semibold text-foreground mt-1">{viewGoal.title}</div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  <span>Employee</span>
                </div>
                <div className="text-sm font-semibold text-foreground mt-1">
                  {viewGoal.employee
                    ? `${viewGoal.employee.firstName} ${viewGoal.employee.lastName}`
                    : "—"}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Tag className="h-3.5 w-3.5" />
                  <span>Goal Type</span>
                </div>
                <div className="text-sm font-semibold text-foreground mt-1">
                  {viewGoal.goalType?.name || viewGoal.category || "General"}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Crosshair className="h-3.5 w-3.5" />
                  <span>Target</span>
                </div>
                <div className="text-sm font-semibold text-foreground mt-1">
                  {viewGoal.target || "—"}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Start Date</span>
                </div>
                <div className="text-sm font-semibold text-foreground mt-1">
                  {viewGoal.startDate || "—"}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>End Date</span>
                </div>
                <div className="text-sm font-semibold text-foreground mt-1">
                  {viewGoal.endDate || "—"}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Status</span>
                </div>
                <div className="mt-1.5">
                  <StatusBadge status={viewGoal.status} />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Target className="h-3.5 w-3.5" />
                  <span>Progress</span>
                </div>
                <div className="flex items-center gap-2.5 mt-2">
                  <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, viewGoal.progress || 0))}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    {viewGoal.progress || 0}%
                  </span>
                </div>
              </div>
              <div className="sm:col-span-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Description</span>
                </div>
                <p className="text-sm font-medium text-foreground mt-1 leading-relaxed">
                  {viewGoal.description || "No description provided."}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add / Edit Goal Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGoal ? "Edit Employee Goal" : "Add New Employee Goal"}</DialogTitle>
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
                Goal Type <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={formData.goalTypeId}
                onValueChange={(val) => setFormData((p) => ({ ...p, goalTypeId: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Goal Type" />
                </SelectTrigger>
                <SelectContent>
                  {activeGoalTypes.map((gt) => (
                    <SelectItem key={gt.id} value={gt.id}>
                      {gt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Goal Title <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Improve Customer Satisfaction"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="e.g. Achieve a customer satisfaction score of 90% or above..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Start Date <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData((p) => ({ ...p, startDate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  End Date <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData((p) => ({ ...p, endDate: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Target</Label>
              <Input
                value={formData.target}
                onChange={(e) => setFormData((p) => ({ ...p, target: e.target.value }))}
                placeholder="e.g. Complete 5 projects, Achieve 95% accuracy, etc."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Progress (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.progress}
                  onChange={(e) => setFormData((p) => ({ ...p, progress: e.target.value }))}
                  placeholder="e.g. 50"
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Status <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) =>
                    setFormData((p) => ({ ...p, status: val as GoalStatus }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

      {/* Update Goal Progress Modal */}
      <Dialog open={Boolean(progressGoal)} onOpenChange={(o) => !o && setProgressGoal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Goal Progress</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>
              Progress (%) <span className="text-rose-500">*</span>
            </Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={progressValue}
              onChange={(e) => setProgressValue(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProgressGoal(null)}>
              Cancel
            </Button>
            <Button
              disabled={progressMutation.isPending || !progressGoal}
              onClick={() =>
                progressGoal &&
                progressMutation.mutate({
                  id: progressGoal.id,
                  progress: Math.min(100, Math.max(0, Number(progressValue || 0))),
                })
              }
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {progressMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={Boolean(deleteGoal)} onOpenChange={(o) => !o && setDeleteGoal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Employee Goal</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">{deleteGoal?.title}</span>? This action
            cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteGoal(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending || !deleteGoal}
              onClick={() => deleteGoal && deleteMutation.mutate(deleteGoal.id)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
