import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapArray } from "@/lib/api";
import {
  useDebouncedValue,
  formatLeaveDays,
  extractLeaveErrorMessage,
  invalidateLeaveTypes,
} from "@/lib/leave-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search,
  SquarePen,
  Trash2,
  Lock,
  Unlock,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/leave/types")({
  component: HrLeaveTypesPage,
});

interface LeaveTypeFormState {
  name: string;
  code: string;
  description: string;
  daysPerYear: number;
  color: string;
  isPaid: boolean;
  halfDayAllowed: boolean;
  sandwichRule: boolean;
  status: "active" | "inactive";
}

const INITIAL_FORM: LeaveTypeFormState = {
  name: "",
  code: "",
  description: "",
  daysPerYear: 12,
  color: "#3B82F6",
  isPaid: true,
  halfDayAllowed: true,
  sandwichRule: false,
  status: "active",
};

export default function HrLeaveTypesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "daysPerYear" | "status">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [form, setForm] = useState<LeaveTypeFormState>(INITIAL_FORM);

  const { data: types = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["hr-leave-types", statusFilter, debouncedSearch, sortBy, sortOrder],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/leave/types", {
        params: {
          status: statusFilter,
          search: debouncedSearch,
          sortBy,
          sortOrder,
        },
      });
      return unwrapArray(res);
    },
    staleTime: 30_000,
  });

  const { data: dependencyInfo, isLoading: isCheckingDeps } = useQuery({
    queryKey: ["hr-leave-type-deps", deleteTarget?.id],
    queryFn: async () => {
      if (!deleteTarget?.id) return null;
      return await api.get(`/api/v1/hr/leave/types/${deleteTarget.id}/dependencies`);
    },
    enabled: Boolean(deleteTarget?.id),
  });

  const paginatedTypes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return types.slice(start, start + pageSize);
  }, [types, currentPage, pageSize]);

  const handleSort = (column: "name" | "daysPerYear" | "status") => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: LeaveTypeFormState) => {
      const normalizedCode =
        payload.code.trim().toUpperCase() ||
        payload.name
          .trim()
          .replace(/[^a-zA-Z0-9]/g, "")
          .slice(0, 4)
          .toUpperCase();
      const body = {
        ...payload,
        name: payload.name.trim(),
        code: normalizedCode || "LV",
        daysPerYear: Number(payload.daysPerYear),
      };
      if (editingId) {
        return await api.put(`/api/v1/hr/leave/types/${editingId}`, body);
      }
      return await api.post("/api/v1/hr/leave/types", body);
    },
    onSuccess: async () => {
      toast.success(editingId ? "Leave type updated successfully" : "Leave type created successfully");
      await invalidateLeaveTypes(queryClient);
      resetForm();
    },
    onError: (err: unknown) => {
      toast.error(extractLeaveErrorMessage(err, "Failed to save leave type"));
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "inactive" }) => {
      return await api.patch(`/api/v1/hr/leave/types/${id}/status`, { status });
    },
    onSuccess: async (_, vars) => {
      toast.success(
        vars.status === "inactive"
          ? "Leave type deactivated — hidden from new applications while preserving history"
          : "Leave type activated"
      );
      await invalidateLeaveTypes(queryClient);
      setDeleteTarget(null);
    },
    onError: (err: unknown) => {
      toast.error(extractLeaveErrorMessage(err, "Failed to update leave type status"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/api/v1/hr/leave/types/${id}`);
    },
    onSuccess: async () => {
      toast.success("Leave type deleted permanently");
      await invalidateLeaveTypes(queryClient);
      if (editingId && deleteTarget?.id === editingId) {
        resetForm();
      }
      setDeleteTarget(null);
    },
    onError: (err: unknown) => {
      toast.error(extractLeaveErrorMessage(err, "Failed to delete leave type"));
      queryClient.invalidateQueries({ queryKey: ["hr-leave-type-deps", deleteTarget?.id] });
    },
  });

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingId(null);
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setForm({
      name: item.name || "",
      code: item.code || "",
      description: item.description || "",
      daysPerYear: Number(item.daysPerYear ?? 0),
      color: item.color || "#3B82F6",
      isPaid: item.isPaid ?? true,
      halfDayAllowed: item.halfDayAllowed ?? true,
      sandwichRule: item.sandwichRule ?? false,
      status: item.status === "inactive" ? "inactive" : "active",
    });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Leave type name is required");
      return;
    }
    if (Number.isNaN(Number(form.daysPerYear)) || Number(form.daysPerYear) < 0 || Number(form.daysPerYear) > 365) {
      toast.error("Max Days / Year must be between 0 and 365");
      return;
    }
    saveMutation.mutate(form);
  };

  const hasDependencies = Boolean(dependencyInfo?.hasDependencies);
  const refs = dependencyInfo?.references || { requestCount: 0, ledgerCount: 0, policyCount: 0 };

  return (
    <div className="space-y-4 pb-12 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Leave Types</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage leave categories, annual entitlements, paid status, half-day rules, and lifecycle state.
          </p>
        </div>
        {isFetching && !isLoading && (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00a76f]" />
            Syncing...
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {editingId ? "Edit Leave Type" : "Add New Leave Type"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 mb-4">
              {editingId
                ? "Update entitlement and policy flags for this leave category"
                : "Fill in the details to create a new leave type"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="typeName" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Leave Type Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="typeName"
                  placeholder="e.g., Casual Leave, Sick Leave"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-9 text-xs border-slate-200 dark:border-slate-700 rounded-lg"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="typeDesc" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Description
                </Label>
                <Textarea
                  id="typeDesc"
                  rows={2}
                  placeholder="Brief description of the leave policies"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="text-xs border-slate-200 dark:border-slate-700 rounded-lg resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="typeQuota" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Max Days / Year <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="typeQuota"
                    type="number"
                    min={0}
                    max={365}
                    step="0.5"
                    placeholder="0"
                    value={form.daysPerYear}
                    onChange={(e) => {
                      const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                      setForm({ ...form, daysPerYear: Number.isNaN(val) ? 0 : val });
                    }}
                    className="h-9 text-xs border-slate-200 dark:border-slate-700 rounded-lg"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Color <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="relative shrink-0">
                      <input
                        type="color"
                        aria-label="Leave color picker"
                        value={/^#[0-9A-Fa-f]{6}$/.test(form.color) ? form.color : "#3B82F6"}
                        onChange={(e) => setForm({ ...form, color: e.target.value })}
                        className="opacity-0 absolute inset-0 w-9 h-9 cursor-pointer z-10"
                      />
                      <div
                        className="w-9 h-9 rounded-md border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer"
                        style={{ backgroundColor: form.color || "#3B82F6" }}
                      />
                    </div>
                    <Input
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      className="h-9 text-xs font-mono uppercase border-slate-200 dark:border-slate-700 rounded-lg min-w-0"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Paid Leave</Label>
                    <p className="text-[11px] text-slate-400">Employees will receive salary for these days</p>
                  </div>
                  <Switch
                    checked={form.isPaid}
                    onCheckedChange={(checked) => setForm({ ...form, isPaid: checked })}
                    className="data-[state=checked]:bg-[#00a76f]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Status <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.status}
                  onValueChange={(val: "active" | "inactive") => setForm({ ...form, status: val })}
                >
                  <SelectTrigger className="h-9 text-xs border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 pt-1">
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="w-full bg-[#00a76f] hover:bg-[#008f5d] text-white font-medium h-10 rounded-lg text-xs shadow-xs transition-colors"
                >
                  {saveMutation.isPending ? "Saving..." : editingId ? "Update Leave Type" : "Add Leave Type"}
                </Button>

                {editingId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="w-full text-xs text-slate-600 dark:text-slate-400 rounded-lg h-9"
                  >
                    Cancel Edit
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-7 xl:col-span-8 space-y-4 min-w-0">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search leave types..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 h-9 text-xs border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 w-full"
                />
              </div>
              <Button
                type="button"
                onClick={() => refetch()}
                className="bg-[#00a76f] hover:bg-[#008f5d] text-white px-5 h-9 rounded-lg text-xs font-medium shrink-0 transition-colors"
              >
                Search
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-52 h-9 text-xs border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <span className="text-xs text-slate-500">
                {types.length} leave {types.length === 1 ? "type" : "types"} configured
              </span>
            </div>
          </div>

          <div className="hidden sm:block bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-white dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-900 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
                    <TableHead className="py-3 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 text-left">
                      <button
                        type="button"
                        onClick={() => handleSort("name")}
                        className="inline-flex items-center gap-1 hover:text-slate-900 dark:text-slate-100 cursor-pointer"
                      >
                        Leave Type <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </button>
                    </TableHead>
                    <TableHead className="py-3 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 text-left">
                      <button
                        type="button"
                        onClick={() => handleSort("daysPerYear")}
                        className="inline-flex items-center gap-1 hover:text-slate-900 dark:text-slate-100 cursor-pointer"
                      >
                        Days/Year <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </button>
                    </TableHead>
                    <TableHead className="py-3 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 text-left">
                      Payment Type
                    </TableHead>
                    <TableHead className="py-3 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 text-left">
                      <button
                        type="button"
                        onClick={() => handleSort("status")}
                        className="inline-flex items-center gap-1 hover:text-slate-900 dark:text-slate-100 cursor-pointer"
                      >
                        Status <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </button>
                    </TableHead>
                    <TableHead className="py-3 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-xs text-slate-400">
                        Loading leave types...
                      </TableCell>
                    </TableRow>
                  ) : paginatedTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-xs text-slate-400">
                        No leave types found. Create one using the form.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTypes.map((item: any) => {
                      const isExpanded = expandedRowId === item.id;
                      const hasLongDesc = item.description && item.description.length > 60;

                      return (
                        <TableRow
                          key={item.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800"
                        >
                          <TableCell className="py-3.5 px-4 align-top">
                            <div className="flex items-start gap-3">
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                                style={{ backgroundColor: item.color || "#3B82F6" }}
                              >
                                <Calendar className="w-4 h-4" />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h3 className="font-semibold text-xs text-slate-900 dark:text-slate-100 leading-tight">
                                    {item.name}
                                  </h3>
                                  {item.code && (
                                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                      {item.code}
                                    </span>
                                  )}
                                </div>
                                <p
                                  className={`text-[11px] text-slate-500 mt-0.5 leading-relaxed ${
                                    isExpanded ? "" : "line-clamp-2"
                                  }`}
                                >
                                  {item.description || "Standard organizational leave entitlement"}
                                </p>
                                {hasLongDesc && (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedRowId(isExpanded ? null : item.id)}
                                    className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-200 font-medium mt-0.5 flex items-center gap-0.5 cursor-pointer"
                                  >
                                    {isExpanded ? (
                                      <>
                                        <ChevronUp className="w-3 h-3" /> Show less
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="w-3 h-3" /> Show more
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-3.5 px-4 align-middle text-xs font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {formatLeaveDays(item.daysPerYear)} Days
                          </TableCell>

                          <TableCell className="py-3.5 px-4 align-middle">
                            {item.isPaid ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#e8f7f0] border border-[#a3e3c4] text-[#00a76f]">
                                Paid
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#ffedd5] border border-[#fed7aa] text-[#ea580c]">
                                Unpaid
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="py-3.5 px-4 align-middle whitespace-nowrap">
                            {item.status === "active" ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#e8f7f0] border border-[#a3e3c4] text-[#00a76f]">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                                Inactive
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1 text-slate-400">
                              <button
                                type="button"
                                onClick={() => handleEdit(item)}
                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 hover:text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                                title="Edit Leave Type"
                                aria-label={`Edit ${item.name}`}
                              >
                                <SquarePen className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  toggleStatusMutation.mutate({
                                    id: item.id,
                                    status: item.status === "active" ? "inactive" : "active",
                                  })
                                }
                                disabled={toggleStatusMutation.isPending}
                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 hover:text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                                title={item.status === "active" ? "Deactivate Leave Type" : "Activate Leave Type"}
                                aria-label={item.status === "active" ? `Deactivate ${item.name}` : `Activate ${item.name}`}
                              >
                                {item.status === "active" ? (
                                  <Lock className="w-4 h-4" />
                                ) : (
                                  <Unlock className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(item)}
                                className="p-2 rounded-lg hover:bg-rose-50 hover:text-red-600 transition-colors cursor-pointer"
                                title="Delete or Deactivate Leave Type"
                                aria-label={`Delete ${item.name}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {types.length > 0 && (
              <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <div>
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(types.length, currentPage * pageSize)} of {types.length} leave types
                </div>
                <div className="flex items-center gap-3">
                  <select
                    aria-label="Rows per page"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(parseInt(e.target.value, 10));
                      setCurrentPage(1);
                    }}
                    className="h-8 text-xs border border-slate-200 dark:border-slate-700 rounded-md px-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                  >
                    <option value={10}>10 / page</option>
                    <option value={20}>20 / page</option>
                    <option value={50}>50 / page</option>
                  </select>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="h-8 px-2.5 text-xs"
                    >
                      Prev
                    </Button>
                    <span className="px-2.5 py-1 rounded-md bg-[#00a76f] text-white font-bold text-xs">
                      {currentPage}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={currentPage * pageSize >= types.length}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="h-8 px-2.5 text-xs"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="sm:hidden space-y-3">
            {isLoading ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center text-xs text-slate-400">
                Loading leave types...
              </div>
            ) : paginatedTypes.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center text-xs text-slate-400">
                No leave types found.
              </div>
            ) : (
              paginatedTypes.map((item: any) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: item.color || "#3B82F6" }}
                      >
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">{item.name}</h3>
                          {item.code && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {item.code}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {item.description || "Standard organizational leave entitlement"}
                        </p>
                      </div>
                    </div>

                    {item.status === "active" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#e8f7f0] border border-[#a3e3c4] text-[#00a76f] shrink-0">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 shrink-0">
                        Inactive
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {formatLeaveDays(item.daysPerYear)} Days/Yr
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className={item.isPaid ? "text-[#00a76f] font-medium" : "text-[#ea580c] font-medium"}>
                        {item.isPaid ? "Paid" : "Unpaid"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(item)}
                        className="h-9 px-2.5 text-xs"
                      >
                        <SquarePen className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          toggleStatusMutation.mutate({
                            id: item.id,
                            status: item.status === "active" ? "inactive" : "active",
                          })
                        }
                        className="h-9 px-2.5 text-xs"
                      >
                        {item.status === "active" ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteTarget(item)}
                        className="h-9 px-2.5 text-xs text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-6 right-6 z-30">
        <button
          type="button"
          onClick={() => {
            resetForm();
            if (typeof window !== "undefined") {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          className="w-12 h-12 rounded-full bg-[#00a76f] hover:bg-[#008f5d] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all cursor-pointer"
          title="Create New Leave Type"
          aria-label="Create New Leave Type"
        >
          <Sparkles className="w-5 h-5 fill-current" />
        </button>
      </div>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              {hasDependencies ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  Cannot Permanently Delete "{deleteTarget?.name}"
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 text-red-600 shrink-0" />
                  Delete Leave Type "{deleteTarget?.name}"?
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed pt-1">
              {isCheckingDeps
                ? "Checking linked leave policies, employee balances, and historical leave applications..."
                : hasDependencies
                ? "This leave type is actively referenced by historical or organizational records. Hard deletion is blocked to preserve audit and ledger integrity."
                : "This leave type has zero linked policies, ledger entries, or leave requests and can be safely deleted."}
            </DialogDescription>
          </DialogHeader>

          {!isCheckingDeps && hasDependencies && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 space-y-1.5">
              <p className="font-semibold">Linked Dependencies Found:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {refs.requestCount > 0 && (
                  <li>
                    <strong>{refs.requestCount}</strong> employee leave{" "}
                    {refs.requestCount === 1 ? "application" : "applications"}
                  </li>
                )}
                {refs.ledgerCount > 0 && (
                  <li>
                    <strong>{refs.ledgerCount}</strong> immutable balance ledger{" "}
                    {refs.ledgerCount === 1 ? "transaction" : "transactions"}
                  </li>
                )}
                {refs.policyCount > 0 && (
                  <li>
                    <strong>{refs.policyCount}</strong> leave{" "}
                    {refs.policyCount === 1 ? "policy" : "policies"}
                  </li>
                )}
              </ul>
              <p className="text-[11px] pt-1 text-amber-800">
                Recommended Action: <strong>Deactivate</strong> this leave type so employees can no longer select it for new requests while all historical records remain intact.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>

            {!isCheckingDeps && hasDependencies ? (
              deleteTarget?.status !== "inactive" ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={toggleStatusMutation.isPending}
                  onClick={() =>
                    deleteTarget &&
                    toggleStatusMutation.mutate({ id: deleteTarget.id, status: "inactive" })
                  }
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {toggleStatusMutation.isPending ? "Deactivating..." : "Deactivate Leave Type Instead"}
                </Button>
              ) : (
                <span className="text-xs font-medium text-slate-500 self-center">
                  Already inactive (history preserved)
                </span>
              )
            ) : (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isCheckingDeps || deleteMutation.isPending}
                onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
