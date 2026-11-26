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
  ClipboardList,
  RefreshCw,
  Trash2,
  LayoutGrid,
  CalendarClock,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react";

type ReviewStatus = "scheduled" | "in_progress" | "completed";

interface PersonSummary {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  employeeCode?: string;
  avatarUrl?: string | null;
}

interface ReviewRecord {
  id: string;
  cycleId: string;
  employeeId: string;
  reviewerId: string;
  reviewDate: string;
  ratingScore: number | null;
  overallComments?: string;
  status: ReviewStatus;
  cycle?: { id: string; name: string; title?: string } | null;
  employee?: PersonSummary | null;
  reviewer?: PersonSummary | null;
}

interface CycleRecord {
  id: string;
  name: string;
  title?: string;
  status?: string;
}

function getInitials(first?: string, last?: string) {
  return `${(first || "")[0] || ""}${(last || "")[0] || ""}`.toUpperCase() || "?";
}

function formatDateYmd(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toISOString().split("T")[0];
}

function StatusBadge({ status }: { status: ReviewStatus }) {
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
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
      Scheduled
    </span>
  );
}

function PersonCell({
  person,
  fallbackAvatar,
}: {
  person?: PersonSummary | null;
  fallbackAvatar?: string | null;
}) {
  const fullName = person ? `${person.firstName || ""} ${person.lastName || ""}`.trim() : "—";
  const avatar = person?.avatarUrl || fallbackAvatar || null;
  return (
    <div className="flex items-center gap-3 min-w-[180px]">
      {avatar ? (
        <img
          src={avatar}
          alt={fullName}
          className="h-9 w-9 rounded-full object-cover border border-border/80 shrink-0"
        />
      ) : (
        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-semibold shrink-0">
          {getInitials(person?.firstName, person?.lastName)}
        </div>
      )}
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground truncate">{fullName}</div>
        {person?.email && (
          <div className="text-xs text-muted-foreground truncate">{person.email}</div>
        )}
      </div>
    </div>
  );
}

export default function HrPerformanceReviewsPage() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isEmployeePortal = currentPath.startsWith("/me");
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filter & table state
  const [search, setSearch] = useState("");
  const [selectedCycle, setSelectedCycle] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | ReviewStatus>("all");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [statusModalReview, setStatusModalReview] = useState<ReviewRecord | null>(null);
  const [nextStatus, setNextStatus] = useState<ReviewStatus>("scheduled");
  const [deleteTarget, setDeleteTarget] = useState<ReviewRecord | null>(null);

  const [formData, setFormData] = useState({
    employeeId: "",
    reviewerId: "",
    cycleId: "",
    reviewDate: new Date().toISOString().split("T")[0],
    status: "scheduled" as ReviewStatus,
  });

  const { data: reviews = [], isLoading } = useQuery<ReviewRecord[]>({
    queryKey: ["hr-performance-reviews"],
    queryFn: async () => {
      const res = await api.get("/hr/performance/reviews");
      return unwrapArray<ReviewRecord>(res);
    },
  });

  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ["hr-employees-list-reviews"],
    queryFn: async () => {
      const res = await api.get("/hr/employees?limit=300");
      return unwrapArray(res);
    },
  });

  const { data: cycles = [] } = useQuery<CycleRecord[]>({
    queryKey: ["hr-performance-cycles"],
    queryFn: async () => {
      const res = await api.get("/hr/performance/cycles");
      return unwrapArray<CycleRecord>(res);
    },
  });

  const employeeAvatarMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const emp of employees) {
      const url = emp.avatarUrl || emp.user?.profile?.avatarUrl;
      if (emp.id && url) map.set(emp.id, url);
    }
    return map;
  }, [employees]);

  const scheduleMutation = useMutation({
    mutationFn: async (payload: typeof formData) =>
      api.post("/hr/performance/reviews", payload),
    onSuccess: () => {
      toast.success("Performance review scheduled");
      queryClient.invalidateQueries({ queryKey: ["hr-performance-reviews"] });
      setScheduleOpen(false);
      setFormData({
        employeeId: "",
        reviewerId: "",
        cycleId: "",
        reviewDate: new Date().toISOString().split("T")[0],
        status: "scheduled",
      });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to schedule review");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ReviewStatus }) =>
      api.patch(`/hr/performance/reviews/${id}/status`, { status }),
    onSuccess: () => {
      toast.success("Review status updated");
      queryClient.invalidateQueries({ queryKey: ["hr-performance-reviews"] });
      setStatusModalReview(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/performance/reviews/${id}`),
    onSuccess: () => {
      toast.success("Review deleted");
      queryClient.invalidateQueries({ queryKey: ["hr-performance-reviews"] });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete review");
    },
  });

  // Base filtered (before status tab) so tab counts stay accurate
  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reviews.filter((r) => {
      if (selectedCycle !== "all" && r.cycleId !== selectedCycle) return false;
      const rDate = formatDateYmd(r.reviewDate);
      if (dateFrom && rDate < dateFrom) return false;
      if (dateTo && rDate > dateTo) return false;
      if (q) {
        const empName = `${r.employee?.firstName || ""} ${r.employee?.lastName || ""} ${r.employee?.email || ""}`.toLowerCase();
        const revName = `${r.reviewer?.firstName || ""} ${r.reviewer?.lastName || ""} ${r.reviewer?.email || ""}`.toLowerCase();
        const cycleName = `${r.cycle?.name || r.cycle?.title || ""}`.toLowerCase();
        if (!empName.includes(q) && !revName.includes(q) && !cycleName.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [reviews, search, selectedCycle, dateFrom, dateTo]);

  const counts = useMemo(() => {
    return {
      all: baseFiltered.length,
      scheduled: baseFiltered.filter((r) => r.status === "scheduled").length,
      in_progress: baseFiltered.filter((r) => r.status === "in_progress").length,
      completed: baseFiltered.filter((r) => r.status === "completed").length,
    };
  }, [baseFiltered]);

  const filtered = useMemo(() => {
    const list =
      activeTab === "all"
        ? baseFiltered
        : baseFiltered.filter((r) => r.status === activeTab);
    return [...list].sort((a, b) => {
      const da = formatDateYmd(a.reviewDate);
      const db = formatDateYmd(b.reviewDate);
      return sortAsc ? da.localeCompare(db) : db.localeCompare(da);
    });
  }, [baseFiltered, activeTab, sortAsc]);

  const totalResults = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const hasFilters = Boolean(search || selectedCycle !== "all" || dateFrom || dateTo);

  const clearFilters = () => {
    setSearch("");
    setSelectedCycle("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId) {
      toast.error("Please select an employee");
      return;
    }
    if (!formData.reviewerId) {
      toast.error("Please select a reviewer");
      return;
    }
    if (!formData.cycleId) {
      toast.error("Please select a review cycle");
      return;
    }
    scheduleMutation.mutate(formData);
  };

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      <PageHeader
        title="Employee Reviews"
        description="Manage performance reviews for your employees."
        actions={
          !isEmployeePortal ? (
            <Button
              onClick={() => router.push("/hr/performance/reviews/schedule")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Schedule Review
            </Button>
          ) : undefined
        }
      />

      {/* Filter & Tabs Card */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden">
        {/* Filter Row */}
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
            value={selectedCycle}
            onValueChange={(val) => {
              setSelectedCycle(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[190px] h-9 bg-background">
              <SelectValue placeholder="All Review Cycle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Review Cycle</SelectItem>
              {cycles.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name || c.title}
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
            className="w-full sm:w-[165px] h-9 bg-background"
            aria-label="Start Date"
          />

          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-[165px] h-9 bg-background"
            aria-label="End Date"
          />

          <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center justify-end gap-2">
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs">
                <X className="h-3.5 w-3.5 mr-1" /> Reset
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={hasFilters ? clearFilters : undefined}
              className="h-9 gap-1.5"
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
            </Button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="px-4 border-t border-border/70 flex items-center gap-6 overflow-x-auto">
          {[
            { key: "all" as const, label: "All", count: counts.all, Icon: LayoutGrid },
            { key: "scheduled" as const, label: "Scheduled", count: counts.scheduled, Icon: CalendarClock },
            { key: "in_progress" as const, label: "In Progress", count: counts.in_progress, Icon: Loader2 },
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
                    active
                      ? "bg-emerald-500 text-white"
                      : "bg-muted text-muted-foreground"
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
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">Employee</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">Reviewer</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">Review Cycle</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => setSortAsc((prev) => !prev)}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    <span>Review Date</span>
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">Rating</th>
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
                    Loading employee reviews...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-sm text-muted-foreground">
                    No performance reviews found. Click &ldquo;+ Schedule Review&rdquo; to create one.
                  </td>
                </tr>
              ) : (
                paginated.map((review, index) => {
                  const rowNum = (safePage - 1) * pageSize + index + 1;
                  const isCompleted = review.status === "completed";
                  return (
                    <tr
                      key={review.id}
                      className="hover:bg-muted/35 transition-colors"
                    >
                      <td className="p-3.5 text-sm font-medium text-muted-foreground">
                        {rowNum}
                      </td>
                      <td className="p-3.5">
                        <PersonCell
                          person={review.employee}
                          fallbackAvatar={employeeAvatarMap.get(review.employeeId)}
                        />
                      </td>
                      <td className="p-3.5">
                        <PersonCell
                          person={review.reviewer}
                          fallbackAvatar={employeeAvatarMap.get(review.reviewerId)}
                        />
                      </td>
                      <td className="p-3.5 text-sm font-medium text-foreground">
                        {review.cycle?.name || review.cycle?.title || "—"}
                      </td>
                      <td className="p-3.5 text-sm text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {formatDateYmd(review.reviewDate)}
                        </span>
                      </td>
                      <td className="p-3.5 text-sm font-semibold text-foreground">
                        {review.ratingScore !== null && review.ratingScore !== undefined
                          ? Number(review.ratingScore).toFixed(1)
                          : "-"}
                      </td>
                      <td className="p-3.5">
                        <StatusBadge status={review.status} />
                      </td>
                      <td className="p-3.5 pr-5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            title="View Review Details"
                            onClick={() => router.push(`/hr/performance/reviews/${review.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {!isCompleted && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-emerald-600"
                              title="Conduct Performance Review"
                              onClick={() =>
                                router.push(`/hr/performance/reviews/${review.id}/conduct`)
                              }
                            >
                              <ClipboardList className="h-4 w-4" />
                            </Button>
                          )}

                          {!isEmployeePortal && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-sky-600"
                                title="Change Status"
                                onClick={() => {
                                  setStatusModalReview(review);
                                  setNextStatus(review.status);
                                }}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>

                              {!isCompleted && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                                  title="Delete Review"
                                  onClick={() => setDeleteTarget(review)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
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

      {/* Schedule Review Modal */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Review</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleScheduleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>
                Employee <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={formData.employeeId}
                onValueChange={(val) => setFormData((prev) => ({ ...prev, employeeId: val }))}
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
                Reviewer <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={formData.reviewerId}
                onValueChange={(val) => setFormData((prev) => ({ ...prev, reviewerId: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Reviewer" />
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
                Review Cycle <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={formData.cycleId}
                onValueChange={(val) => setFormData((prev) => ({ ...prev, cycleId: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Review Cycle" />
                </SelectTrigger>
                <SelectContent>
                  {cycles.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name || c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Review Date <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={formData.reviewDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, reviewDate: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>
                  Status <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, status: val as ReviewStatus }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setScheduleOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={scheduleMutation.isPending}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {scheduleMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Status Modal */}
      <Dialog
        open={Boolean(statusModalReview)}
        onOpenChange={(open) => !open && setStatusModalReview(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Review Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>
                Status <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={nextStatus}
                onValueChange={(val) => setNextStatus(val as ReviewStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusModalReview(null)}>
              Cancel
            </Button>
            <Button
              disabled={updateStatusMutation.isPending || !statusModalReview}
              onClick={() =>
                statusModalReview &&
                updateStatusMutation.mutate({ id: statusModalReview.id, status: nextStatus })
              }
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {updateStatusMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Performance Review</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete the performance review for{" "}
            <span className="font-semibold text-foreground">
              {deleteTarget?.employee
                ? `${deleteTarget.employee.firstName} ${deleteTarget.employee.lastName}`
                : "this employee"}
            </span>
            ? This action cannot be undone.
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
