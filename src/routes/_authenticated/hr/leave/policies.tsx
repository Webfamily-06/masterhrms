import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, unwrapArray } from "@/lib/api";
import {
  useDebouncedValue,
  formatLeaveDays,
  extractLeaveErrorMessage,
  invalidateLeavePolicies,
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search,
  Filter,
  Plus,
  SquarePen,
  Trash2,
  Lock,
  Unlock,
  Eye,
  Calendar,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  Sparkles,
  ArrowUpDown,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/leave/policies")({
  component: HrLeavePoliciesPage,
});

interface PolicyFormState {
  name: string;
  code: string;
  description: string;
  leaveTypeId: string;
  minDays: number;
  maxConsecutiveDays: number;
  noticeDays: number;
  carryForwardEnabled: boolean;
  maxCarryForwardDays: number;
  requiresApproval: boolean;
  probationAllowed: boolean;
  halfDayAllowed: boolean;
  sandwichRule: boolean;
  isDefault: boolean;
  accrualFrequency: "yearly" | "quarterly" | "monthly";
  status: "active" | "inactive";
  effectiveFrom: string;
  effectiveTo: string;
}

const getInitialPolicyForm = (): PolicyFormState => ({
  name: "",
  code: "",
  description: "",
  leaveTypeId: "all",
  minDays: 1,
  maxConsecutiveDays: 14,
  noticeDays: 0,
  carryForwardEnabled: false,
  maxCarryForwardDays: 0,
  requiresApproval: true,
  probationAllowed: true,
  halfDayAllowed: true,
  sandwichRule: false,
  isDefault: false,
  accrualFrequency: "yearly",
  status: "active",
  effectiveFrom: new Date().toISOString().slice(0, 10),
  effectiveTo: "",
});

export default function HrLeavePoliciesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"createdAt" | "name" | "maxCarryForwardDays">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalPolicy, setViewModalPolicy] = useState<any | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteBlockedCanDeactivate, setDeleteBlockedCanDeactivate] = useState(false);
  const [deleteBlockedReason, setDeleteBlockedReason] = useState<string | null>(null);

  const [form, setForm] = useState<PolicyFormState>(getInitialPolicyForm);

  const { data: policyPayload, isLoading, refetch } = useQuery({
    queryKey: [
      "hr-leave-policies",
      statusFilter,
      selectedTypeFilter,
      debouncedSearch,
      sortBy,
      sortOrder,
      currentPage,
      pageSize,
    ],
    queryFn: async () => {
      return await api.get("/api/v1/hr/leave/policies", {
        params: {
          includeCounts: "true",
          status: statusFilter,
          leaveTypeId: selectedTypeFilter,
          search: debouncedSearch,
          sortBy,
          sortOrder,
          page: currentPage,
          limit: pageSize,
        },
      });
    },
    staleTime: 30_000,
  });

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["hr-leave-types", "all-for-policies"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/leave/types", { params: { status: "all" } });
      return unwrapArray(res);
    },
    staleTime: 30_000,
  });

  const policies: any[] = Array.isArray(policyPayload?.data)
    ? policyPayload.data
    : unwrapArray(policyPayload);
  const counts = policyPayload?.counts || {
    all: policies.length,
    active: policies.filter((p) => p.status === "active").length,
    inactive: policies.filter((p) => p.status === "inactive").length,
  };
  const totalFilteredCount = Number(policyPayload?.meta?.total ?? policies.length);

  const handleSort = (column: "createdAt" | "name" | "maxCarryForwardDays") => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingPolicy?.id) {
        return await api.put(`/api/v1/hr/leave/policies/${editingPolicy.id}`, payload);
      }
      return await api.post("/api/v1/hr/leave/policies", payload);
    },
    onSuccess: async () => {
      toast.success(editingPolicy?.id ? "Leave policy updated successfully" : "Leave policy created successfully");
      await invalidateLeavePolicies(queryClient);
      setModalOpen(false);
      resetForm();
    },
    onError: (err: unknown) => {
      toast.error(extractLeaveErrorMessage(err, "Failed to save leave policy"));
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "inactive" }) => {
      return await api.patch(`/api/v1/hr/leave/policies/${id}/status`, { status });
    },
    onSuccess: async (_, vars) => {
      toast.success(vars.status === "inactive" ? "Leave policy deactivated" : "Leave policy activated");
      await invalidateLeavePolicies(queryClient);
      setDeleteTarget(null);
      setDeleteBlockedCanDeactivate(false);
      setDeleteBlockedReason(null);
    },
    onError: (err: unknown) => {
      toast.error(extractLeaveErrorMessage(err, "Failed to update policy status"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/api/v1/hr/leave/policies/${id}`);
    },
    onSuccess: async () => {
      toast.success("Leave policy deleted successfully");
      await invalidateLeavePolicies(queryClient);
      setDeleteTarget(null);
      setDeleteBlockedCanDeactivate(false);
      setDeleteBlockedReason(null);
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError && err.details?.canDeactivate) {
        setDeleteBlockedCanDeactivate(true);
        setDeleteBlockedReason(err.message);
        return;
      }
      toast.error(extractLeaveErrorMessage(err, "Failed to delete leave policy"));
      setDeleteTarget(null);
    },
  });

  const resetForm = () => {
    setForm(getInitialPolicyForm());
    setEditingPolicy(null);
  };

  const openCreate = () => {
    resetForm();
    const firstActive = leaveTypes.find((lt: any) => lt.status === "active");
    if (firstActive) {
      setForm((prev) => ({
        ...prev,
        leaveTypeId: firstActive.id,
        halfDayAllowed: Boolean(firstActive.halfDayAllowed ?? true),
        minDays: firstActive.halfDayAllowed === false ? 1 : 0.5,
      }));
    }
    setModalOpen(true);
  };

  const handleEdit = (policy: any) => {
    setEditingPolicy(policy);
    setForm({
      name: policy.name || "",
      code: policy.code || "",
      description: policy.description || "",
      leaveTypeId: policy.leaveTypeId || "all",
      minDays: Number(policy.minDays ?? 1),
      maxConsecutiveDays: Number(policy.maxConsecutiveDays ?? 14),
      noticeDays: Number(policy.noticeDays ?? 0),
      carryForwardEnabled: Boolean(policy.carryForwardEnabled),
      maxCarryForwardDays: Number(policy.carryForwardDays ?? policy.maxCarryForwardDays ?? 0),
      requiresApproval: policy.requiresApproval ?? true,
      probationAllowed: policy.probationAllowed ?? true,
      halfDayAllowed: policy.halfDayAllowed ?? true,
      sandwichRule: policy.sandwichRule ?? false,
      isDefault: policy.isDefault ?? false,
      accrualFrequency: (policy.accrualFrequency as any) || "yearly",
      status: policy.status === "inactive" ? "inactive" : "active",
      effectiveFrom: policy.effectiveFrom
        ? String(policy.effectiveFrom).slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      effectiveTo: policy.effectiveTo ? String(policy.effectiveTo).slice(0, 10) : "",
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Policy name is required");
      return;
    }
    if (Number(form.minDays) <= 0) {
      toast.error("Minimum days per application must be greater than 0");
      return;
    }
    if (Number(form.maxConsecutiveDays) < Number(form.minDays)) {
      toast.error("Maximum days per application must be greater than or equal to minimum days");
      return;
    }
    if (form.effectiveFrom && form.effectiveTo && form.effectiveTo < form.effectiveFrom) {
      toast.error("Effective To date cannot be earlier than Effective From date");
      return;
    }

    saveMutation.mutate({
      name: form.name.trim(),
      code:
        form.code.trim().toUpperCase() ||
        form.name
          .trim()
          .replace(/[^a-zA-Z0-9]/g, "_")
          .slice(0, 16)
          .toUpperCase(),
      description: form.description.trim() || null,
      leaveTypeId: form.leaveTypeId === "all" ? null : form.leaveTypeId,
      minDays: Number(form.minDays),
      maxConsecutiveDays: Number(form.maxConsecutiveDays),
      noticeDays: Number(form.noticeDays),
      carryForwardEnabled: Boolean(form.carryForwardEnabled && Number(form.maxCarryForwardDays) > 0),
      maxCarryForwardDays: form.carryForwardEnabled ? Number(form.maxCarryForwardDays) : 0,
      requiresApproval: Boolean(form.requiresApproval),
      probationAllowed: Boolean(form.probationAllowed),
      halfDayAllowed: Boolean(form.halfDayAllowed),
      sandwichRule: Boolean(form.sandwichRule),
      isDefault: Boolean(form.isDefault),
      accrualFrequency: form.accrualFrequency,
      status: form.status,
      effectiveFrom: form.effectiveFrom || null,
      effectiveTo: form.effectiveTo || null,
    });
  };

  return (
    <div className="space-y-4 pb-12 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Leave Policies</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure organization leave rules, eligibility, duration limits, notice periods, and carry-forward caps.
          </p>
        </div>

        <Button
          type="button"
          onClick={openCreate}
          className="bg-[#00a76f] hover:bg-[#008f5d] text-white font-medium rounded-lg px-4 h-9 text-xs shadow-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Leave Policy
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search policy name, code, or leave type..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 h-9 text-xs border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
              />
            </div>

            <Select
              value={selectedTypeFilter}
              onValueChange={(val) => {
                setSelectedTypeFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-52 h-9 text-xs border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium">
                <SelectValue placeholder="All Leave Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leave Types</SelectItem>
                {leaveTypes.map((lt: any) => (
                  <SelectItem key={lt.id} value={lt.id}>
                    {lt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            className="h-9 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-slate-800/60 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            Refresh
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs font-medium">
          {(
            [
              { key: "all", label: "All", count: counts.all, icon: LayoutGrid },
              { key: "active", label: "Active", count: counts.active, icon: CheckCircle2 },
              { key: "inactive", label: "Inactive", count: counts.inactive, icon: XCircle },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.key);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-1.5 pb-2 border-b-2 transition-colors cursor-pointer ${
                  active
                    ? "border-[#00a76f] text-[#00a76f] font-semibold"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.2 rounded-full ${
                    active ? "bg-[#00a76f] text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-white dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-900 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
                <TableHead className="py-3 px-3 text-xs font-semibold text-slate-700 dark:text-slate-300 w-10 text-center">
                  #
                </TableHead>
                <TableHead className="py-3 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 text-left">
                  <button
                    type="button"
                    onClick={() => handleSort("name")}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:text-slate-100 cursor-pointer"
                  >
                    Policy Name <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </TableHead>
                <TableHead className="py-3 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 text-left">
                  Leave Type
                </TableHead>
                <TableHead className="py-3 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 text-left">
                  Min / Max Days
                </TableHead>
                <TableHead className="py-3 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 text-left">
                  <button
                    type="button"
                    onClick={() => handleSort("maxCarryForwardDays")}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:text-slate-100 cursor-pointer"
                  >
                    Carry Forward <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </TableHead>
                <TableHead className="py-3 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 text-left">
                  Approval
                </TableHead>
                <TableHead className="py-3 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 text-left">
                  Status
                </TableHead>
                <TableHead className="py-3 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 text-left">
                  <button
                    type="button"
                    onClick={() => handleSort("createdAt")}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:text-slate-100 cursor-pointer"
                  >
                    Created At <ArrowUpDown className="w-3 h-3 text-slate-400" />
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
                  <TableCell colSpan={9} className="py-12 text-center text-xs text-slate-400">
                    Loading leave policies...
                  </TableCell>
                </TableRow>
              ) : policies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-xs text-slate-400">
                    No leave policies configured matching your filter criteria. Click "Add Leave Policy" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                policies.map((pol: any, idx: number) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <TableRow
                      key={pol.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800"
                    >
                      <TableCell className="py-3 px-3 text-center text-xs text-slate-500 font-mono">
                        {rowNumber}
                      </TableCell>

                      <TableCell className="py-3 px-4 text-xs font-semibold text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{pol.name}</span>
                          {pol.isDefault && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Default
                            </span>
                          )}
                        </div>
                        {pol.noticeDays > 0 && (
                          <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                            {pol.noticeDays}d advance notice
                          </p>
                        )}
                      </TableCell>

                      <TableCell className="py-3 px-4 text-xs text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: pol.color || "#3b82f6" }}
                          />
                          <span>{pol.leaveTypeName || pol.leaveType?.name || "All Leave Types"}</span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap font-medium">
                        {formatLeaveDays(pol.minDays ?? 1)} – {formatLeaveDays(pol.maxConsecutiveDays ?? 14)} days
                      </TableCell>

                      <TableCell className="py-3 px-4 text-xs font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {formatLeaveDays(pol.carryForwardDays ?? 0)} days
                      </TableCell>

                      <TableCell className="py-3 px-4 whitespace-nowrap">
                        {pol.requiresApproval ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#fef9ec] border border-[#fde68a] text-[#b45309]">
                            Required
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#e8f7f0] border border-[#a3e3c4] text-[#00a76f]">
                            Auto-Approve
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="py-3 px-4 whitespace-nowrap">
                        {pol.status === "active" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#e8f7f0] border border-[#a3e3c4] text-[#00a76f]">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                            Inactive
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{String(pol.createdAt || "").slice(0, 10) || "—"}</span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1 text-slate-400">
                          <button
                            type="button"
                            onClick={() => setViewModalPolicy(pol)}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 hover:text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                            title="View Policy Rules"
                            aria-label={`View ${pol.name}`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(pol)}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 hover:text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                            title="Edit Policy"
                            aria-label={`Edit ${pol.name}`}
                          >
                            <SquarePen className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              toggleStatusMutation.mutate({
                                id: pol.id,
                                status: pol.status === "active" ? "inactive" : "active",
                              })
                            }
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 hover:text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                            title={pol.status === "active" ? "Deactivate Policy" : "Activate Policy"}
                            aria-label={pol.status === "active" ? `Deactivate ${pol.name}` : `Activate ${pol.name}`}
                          >
                            {pol.status === "active" ? (
                              <Lock className="w-4 h-4" />
                            ) : (
                              <Unlock className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteTarget(pol);
                              setDeleteBlockedCanDeactivate(false);
                              setDeleteBlockedReason(null);
                            }}
                            className="p-2 rounded-lg hover:bg-rose-50 hover:text-red-600 transition-colors cursor-pointer"
                            title="Delete Policy"
                            aria-label={`Delete ${pol.name}`}
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

        <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing {totalFilteredCount === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(totalFilteredCount, currentPage * pageSize)} of {totalFilteredCount} results
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Rows per page:</span>
              <select
                aria-label="Policies per page"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value, 10));
                  setCurrentPage(1);
                }}
                className="h-8 text-xs border border-slate-200 dark:border-slate-700 rounded px-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 disabled:opacity-40 cursor-pointer"
              >
                « Previous
              </button>
              <span className="w-7 h-7 rounded-md bg-[#00a76f] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                {currentPage}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={currentPage * pageSize >= totalFilteredCount}
                className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 disabled:opacity-40 cursor-pointer"
              >
                Next »
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center text-xs text-slate-400">
            Loading leave policies...
          </div>
        ) : policies.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center text-xs text-slate-400">
            No leave policies match your criteria.
          </div>
        ) : (
          policies.map((pol: any) => (
            <div
              key={pol.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">{pol.name}</h3>
                    {pol.isDefault && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-600 dark:text-slate-400">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: pol.color || "#3b82f6" }}
                    />
                    <span>{pol.leaveTypeName || "All Leave Types"}</span>
                  </div>
                </div>
                {pol.status === "active" ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#e8f7f0] border border-[#a3e3c4] text-[#00a76f] shrink-0">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 shrink-0">
                    Inactive
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/60 rounded-lg p-2.5">
                <div>
                  <span className="text-slate-400 block text-[10px]">Duration Range</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatLeaveDays(pol.minDays ?? 1)} – {formatLeaveDays(pol.maxConsecutiveDays ?? 14)} days
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Carry Forward</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatLeaveDays(pol.carryForwardDays ?? 0)} days
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Notice Period</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{pol.noticeDays ?? 0} days</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Approval</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {pol.requiresApproval ? "Required" : "Auto-Approve"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setViewModalPolicy(pol)}
                  className="h-9 px-2.5 text-xs"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" /> View
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(pol)}
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
                      id: pol.id,
                      status: pol.status === "active" ? "inactive" : "active",
                    })
                  }
                  className="h-9 px-2.5 text-xs"
                >
                  {pol.status === "active" ? (
                    <Lock className="w-3.5 h-3.5" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDeleteTarget(pol);
                    setDeleteBlockedCanDeactivate(false);
                    setDeleteBlockedReason(null);
                  }}
                  className="h-9 px-2.5 text-xs text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="fixed bottom-6 right-6 z-30">
        <button
          type="button"
          onClick={openCreate}
          className="w-12 h-12 rounded-full bg-[#00a76f] hover:bg-[#008f5d] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all cursor-pointer"
          title="Create New Policy"
          aria-label="Create New Policy"
        >
          <Sparkles className="w-5 h-5 fill-current" />
        </button>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#00a76f]" />
              {editingPolicy ? "Edit Leave Policy" : "Add Leave Policy"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure quota rules, notice periods, carry-forward caps, and eligibility constraints.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold">Policy Name *</Label>
                <Input
                  placeholder="e.g. Standard Annual Leave Policy"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-9 text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Policy Code</Label>
                <Input
                  placeholder="POL_AL"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="h-9 text-xs font-mono uppercase"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                rows={2}
                placeholder="Describe eligibility, approval, and accrual rules..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="text-xs resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Leave Type *</Label>
                <Select
                  value={form.leaveTypeId}
                  onValueChange={(val) => setForm({ ...form, leaveTypeId: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select leave category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Leave Types (Global Policy)</SelectItem>
                    {leaveTypes.map((lt: any) => (
                      <SelectItem key={lt.id} value={lt.id}>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: lt.color || "#3b82f6" }}
                          />
                          <span>{lt.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            ({formatLeaveDays(lt.daysPerYear)}d/yr{lt.status === "inactive" ? " • inactive" : ""})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Accrual Frequency</Label>
                <Select
                  value={form.accrualFrequency}
                  onValueChange={(val: "yearly" | "quarterly" | "monthly") =>
                    setForm({ ...form, accrualFrequency: val })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Carry Forward</Label>
                <Input
                  type="number"
                  min={0}
                  max={365}
                  step="0.5"
                  value={form.maxCarryForwardDays}
                  onChange={(e) => {
                    const days = parseFloat(e.target.value);
                    const safeDays = Number.isNaN(days) ? 0 : days;
                    setForm({
                      ...form,
                      maxCarryForwardDays: safeDays,
                      carryForwardEnabled: safeDays > 0,
                    });
                  }}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Min Days / App *</Label>
                <Input
                  type="number"
                  min={0.5}
                  max={365}
                  step="0.5"
                  value={form.minDays}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setForm({ ...form, minDays: Number.isNaN(val) ? 0.5 : val });
                  }}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Max Days / App *</Label>
                <Input
                  type="number"
                  min={0.5}
                  max={365}
                  step="0.5"
                  value={form.maxConsecutiveDays}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setForm({ ...form, maxConsecutiveDays: Number.isNaN(val) ? 1 : val });
                  }}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Notice (Days)</Label>
                <Input
                  type="number"
                  min={0}
                  max={180}
                  value={form.noticeDays}
                  onChange={(e) =>
                    setForm({ ...form, noticeDays: Math.max(0, parseInt(e.target.value, 10) || 0) })
                  }
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Effective From</Label>
                <Input
                  type="date"
                  value={form.effectiveFrom}
                  onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Effective To (Optional)</Label>
                <Input
                  type="date"
                  value={form.effectiveTo}
                  onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status *</Label>
                <Select
                  value={form.status}
                  onValueChange={(val: "active" | "inactive") => setForm({ ...form, status: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
              <div className="flex items-center justify-between gap-2 rounded-lg border p-2.5">
                <div>
                  <Label className="text-xs font-medium block">Requires Approval</Label>
                  <p className="text-[10px] text-muted-foreground">Manager/HR sign-off required</p>
                </div>
                <Switch
                  checked={form.requiresApproval}
                  onCheckedChange={(checked) => setForm({ ...form, requiresApproval: checked })}
                  className="data-[state=checked]:bg-[#00a76f]"
                />
              </div>

              <div className="flex items-center justify-between gap-2 rounded-lg border p-2.5">
                <div>
                  <Label className="text-xs font-medium block">Allow During Probation</Label>
                  <p className="text-[10px] text-muted-foreground">Probationary staff can apply</p>
                </div>
                <Switch
                  checked={form.probationAllowed}
                  onCheckedChange={(checked) => setForm({ ...form, probationAllowed: checked })}
                  className="data-[state=checked]:bg-[#00a76f]"
                />
              </div>

              <div className="flex items-center justify-between gap-2 rounded-lg border p-2.5">
                <div>
                  <Label className="text-xs font-medium block">Half-Day Allowed</Label>
                  <p className="text-[10px] text-muted-foreground">Permit 0.5 day applications</p>
                </div>
                <Switch
                  checked={form.halfDayAllowed}
                  onCheckedChange={(checked) => setForm({ ...form, halfDayAllowed: checked })}
                  className="data-[state=checked]:bg-[#00a76f]"
                />
              </div>

              <div className="flex items-center justify-between gap-2 rounded-lg border p-2.5">
                <div>
                  <Label className="text-xs font-medium block">Sandwich Rule</Label>
                  <p className="text-[10px] text-muted-foreground">Count weekend/holiday bridges</p>
                </div>
                <Switch
                  checked={form.sandwichRule}
                  onCheckedChange={(checked) => setForm({ ...form, sandwichRule: checked })}
                  className="data-[state=checked]:bg-[#00a76f]"
                />
              </div>

              <div className="sm:col-span-2 flex items-center justify-between gap-2 rounded-lg border p-2.5 bg-slate-50/60 dark:bg-slate-800/50">
                <div>
                  <Label className="text-xs font-medium block">Default Organization Policy</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Fallback policy when a leave type has no dedicated rule
                  </p>
                </div>
                <Switch
                  checked={form.isDefault}
                  onCheckedChange={(checked) => setForm({ ...form, isDefault: checked })}
                  className="data-[state=checked]:bg-[#00a76f]"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saveMutation.isPending}
                className="bg-[#00a76f] hover:bg-[#008f5d] text-white"
              >
                {saveMutation.isPending ? "Saving..." : editingPolicy ? "Update Policy" : "Save Policy"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewModalPolicy)} onOpenChange={(open) => !open && setViewModalPolicy(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#00a76f]" />
              {viewModalPolicy?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {viewModalPolicy?.description || "Active leave governance rules enforced across HR & Employee Self-Service."}
            </DialogDescription>
          </DialogHeader>

          {viewModalPolicy && (
            <div className="space-y-3 pt-1 text-xs">
              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-lg border bg-slate-50/70 dark:bg-slate-800/60">
                <div>
                  <span className="text-slate-400 text-[11px] block">Leave Type</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {viewModalPolicy.leaveTypeName || "All Leave Types"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Status</span>
                  <span className="font-semibold uppercase text-[#00a76f]">{viewModalPolicy.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Min / Max Duration</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatLeaveDays(viewModalPolicy.minDays ?? 1)} –{" "}
                    {formatLeaveDays(viewModalPolicy.maxConsecutiveDays ?? 14)} days
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Advance Notice</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{viewModalPolicy.noticeDays ?? 0} days</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Carry Forward Cap</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatLeaveDays(viewModalPolicy.carryForwardDays ?? 0)} days
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Accrual Frequency</span>
                  <span className="font-semibold capitalize text-slate-900 dark:text-slate-100">
                    {viewModalPolicy.accrualFrequency || "yearly"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Approval Required</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {viewModalPolicy.requiresApproval ? "Yes (Manager / HR)" : "No (Auto-Approved)"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Probation Eligibility</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {viewModalPolicy.probationAllowed ? "Allowed" : "Not Allowed"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Half-Day Requests</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {viewModalPolicy.halfDayAllowed !== false ? "Allowed" : "Disabled"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Sandwich Rule</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {viewModalPolicy.sandwichRule ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 text-[11px] block">Effective Period</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {viewModalPolicy.effectiveFrom
                      ? String(viewModalPolicy.effectiveFrom).slice(0, 10)
                      : "Immediate"}{" "}
                    →{" "}
                    {viewModalPolicy.effectiveTo
                      ? String(viewModalPolicy.effectiveTo).slice(0, 10)
                      : "Ongoing"}
                  </span>
                </div>
              </div>

              <DialogFooter className="gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const p = viewModalPolicy;
                    setViewModalPolicy(null);
                    handleEdit(p);
                  }}
                >
                  <SquarePen className="w-3.5 h-3.5 mr-1.5" /> Edit Policy
                </Button>
                <Button type="button" size="sm" onClick={() => setViewModalPolicy(null)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteBlockedCanDeactivate(false);
            setDeleteBlockedReason(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              {deleteBlockedCanDeactivate ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Deactivate Policy Instead?
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 text-red-600" />
                  Delete Policy "{deleteTarget?.name}"?
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed pt-1">
              {deleteBlockedReason ||
                "Are you sure you want to delete this leave policy? If historical leave requests exist for its leave type, deactivation will be recommended to preserve audit history."}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteBlockedCanDeactivate(false);
                setDeleteBlockedReason(null);
              }}
            >
              Cancel
            </Button>

            {deleteBlockedCanDeactivate ? (
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
                {toggleStatusMutation.isPending ? "Deactivating..." : "Deactivate Policy Instead"}
              </Button>
            ) : (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={deleteMutation.isPending}
                onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete Policy"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
