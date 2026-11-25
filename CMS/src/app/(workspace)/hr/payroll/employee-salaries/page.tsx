"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

interface SalaryComponentOption {
  id: string;
  name: string;
  type: string;
  calculationType: string;
  defaultValue: number;
  isActive: boolean;
}

interface SalaryBreakdownItem {
  id: string;
  componentId: string;
  name: string;
  type: string;
  calculationType: string;
  defaultValue: number;
  monthlyAmount: number;
  annualAmount: number;
}

interface EmployeeSalaryRecord {
  id: string;
  employeeId: string;
  basicSalary: number;
  ctcMonthly: number;
  ctcAnnual: number;
  isCurrent: boolean;
  status: string;
  effectiveFrom: string;
  createdAt: string;
  remarks?: string | null;
  employee?: EmployeeOption | null;
  items?: Array<{ id: string; componentId: string; monthlyAmount: number; component?: SalaryComponentOption }>;
  breakdown?: {
    basicSalary: number;
    additionalEarnings: number;
    totalDeductions: number;
    grossSalary: number;
    netSalary: number;
    components: SalaryBreakdownItem[];
  };
}

interface SalariesListResponse {
  assignments: EmployeeSalaryRecord[];
  counts: {
    all: number;
    active: number;
    inactive: number;
  };
}

const formatINR = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(val) || 0);

const formatDateISO = (raw?: string | null) => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  employeeId: "",
  basicSalary: "",
  status: "active",
  effectiveFrom: todayISO(),
  componentIds: [] as string[],
  remarks: "",
};

export default function HrEmployeeSalariesPage() {
  const queryClient = useQueryClient();

  // Filters & Tabs
  const [searchInput, setSearchInput] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "inactive">("all");
  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    employeeId: "all",
  });

  // Sort & Pagination
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EmployeeSalaryRecord | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [viewTarget, setViewTarget] = useState<EmployeeSalaryRecord | null>(null);
  const [breakdownTarget, setBreakdownTarget] = useState<EmployeeSalaryRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeSalaryRecord | null>(null);

  // Queries
  const { data: employees = [] } = useQuery<EmployeeOption[]>({
    queryKey: ["hr-employees-dropdown"],
    queryFn: async () => {
      const res = await api.get("/employees", { params: { limit: 200 } });
      const raw = res?.employees ?? res?.data?.employees ?? res?.data ?? res;
      return Array.isArray(raw) ? raw : [];
    },
  });

  const { data: components = [] } = useQuery<SalaryComponentOption[]>({
    queryKey: ["hr-payroll-components-active"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/payroll/components", {
        params: { status: "active" },
      });
      const payload = res?.data ?? res ?? {};
      return Array.isArray(payload.components) ? payload.components : [];
    },
  });

  const { data: salariesRes, isLoading } = useQuery<SalariesListResponse>({
    queryKey: ["hr-employee-salaries", activeTab, appliedFilters],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/payroll/employee-salaries", {
        params: {
          ...(activeTab !== "all" ? { status: activeTab } : {}),
          ...(appliedFilters.employeeId !== "all" ? { employeeId: appliedFilters.employeeId } : {}),
          ...(appliedFilters.search ? { search: appliedFilters.search } : {}),
        },
      });
      const payload = res?.data ?? res ?? {};
      const list = Array.isArray(payload.assignments)
        ? payload.assignments
        : Array.isArray(payload)
        ? payload
        : [];
      return {
        assignments: list,
        counts: payload.counts ?? {
          all: list.length,
          active: list.filter((a: EmployeeSalaryRecord) => a.isCurrent).length,
          inactive: list.filter((a: EmployeeSalaryRecord) => !a.isCurrent).length,
        },
      };
    },
  });

  const sortedRows = useMemo(() => {
    const list = [...(salariesRes?.assignments ?? [])];
    list.sort((a, b) => {
      const tA = new Date(a.createdAt || a.effectiveFrom || 0).getTime();
      const tB = new Date(b.createdAt || b.effectiveFrom || 0).getTime();
      return sortAsc ? tA - tB : tB - tA;
    });
    return list;
  }, [salariesRes?.assignments, sortAsc]);

  const totalResults = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = sortedRows.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["hr-employee-salaries"] });
  };

  // Mutations
  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        employeeId: form.employeeId,
        basicSalary: Number(form.basicSalary) || 0,
        status: form.status,
        effectiveFrom: form.effectiveFrom || todayISO(),
        componentIds: form.componentIds,
        remarks: form.remarks.trim(),
      };
      if (editingRecord) {
        return api.put(`/api/v1/hr/payroll/employee-salaries/${editingRecord.id}`, payload);
      }
      return api.post("/api/v1/hr/payroll/employee-salaries", payload);
    },
    onSuccess: () => {
      toast.success(
        editingRecord
          ? "Employee salary updated successfully"
          : "Employee salary created successfully"
      );
      invalidate();
      setIsFormOpen(false);
      setEditingRecord(null);
      setForm(emptyForm);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save employee salary"),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (row: EmployeeSalaryRecord) =>
      api.patch(`/api/v1/hr/payroll/employee-salaries/${row.id}`, {
        status: row.isCurrent ? "inactive" : "active",
      }),
    onSuccess: (_, row) => {
      toast.success(
        `Salary marked as ${row.isCurrent ? "Inactive" : "Active"}`
      );
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/hr/payroll/employee-salaries/${id}`),
    onSuccess: () => {
      toast.success("Employee salary deleted successfully");
      invalidate();
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete employee salary"),
  });

  // Handlers
  const openAddModal = () => {
    setEditingRecord(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEditModal = (row: EmployeeSalaryRecord) => {
    setEditingRecord(row);
    const attachedIds = (row.items ?? []).map((it) => it.componentId);
    setForm({
      employeeId: row.employeeId || row.employee?.id || "",
      basicSalary: String(row.basicSalary ?? row.ctcMonthly ?? ""),
      status: row.isCurrent ? "active" : "inactive",
      effectiveFrom: formatDateISO(row.effectiveFrom) === "—" ? todayISO() : formatDateISO(row.effectiveFrom),
      componentIds: attachedIds,
      remarks: row.remarks || "",
    });
    setIsFormOpen(true);
  };

  const toggleComponentId = (id: string) => {
    setForm((prev) => ({
      ...prev,
      componentIds: prev.componentIds.includes(id)
        ? prev.componentIds.filter((c) => c !== id)
        : [...prev.componentIds, id],
    }));
  };

  const handleApplyFilters = () => {
    setPage(1);
    setAppliedFilters({
      search: searchInput.trim(),
      employeeId: employeeFilter,
    });
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setEmployeeFilter("all");
    setPage(1);
    setAppliedFilters({ search: "", employeeId: "all" });
  };

  const counts = salariesRes?.counts ?? { all: 0, active: 0, inactive: 0 };
  const hasActiveFilter = Boolean(appliedFilters.search) || appliedFilters.employeeId !== "all";

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Employee Salaries</h1>
          <p className="text-sm text-muted-foreground">
            Manage salary structures and components for employees.
          </p>
        </div>

        <Button
          size="sm"
          onClick={openAddModal}
          className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white self-start sm:self-auto"
        >
          <i className="ph ph-plus text-base" />
          <span>Add Employee Salary</span>
        </Button>
      </div>

      {/* Filter & Status Tabs Card */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="p-3 sm:p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-border/70">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
            <div className="relative w-full sm:w-64">
              <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
              <Input
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  if (e.target.value === "") {
                    setAppliedFilters((p) => ({ ...p, search: "" }));
                  }
                }}
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                placeholder="Search..."
                className="pl-9 h-9 w-full"
              />
            </div>

            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="h-9 w-full sm:w-52 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              aria-label="Filter by employee"
            >
              <option value="all">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {`${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.email}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 flex-1 sm:flex-none"
              onClick={handleApplyFilters}
            >
              <i className="ph ph-funnel text-base" />
              <span>Filters</span>
            </Button>
            {hasActiveFilter && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 text-muted-foreground"
                onClick={handleResetFilters}
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Status Tabs */}
        <div className="px-3 sm:px-4 flex items-center gap-1 overflow-x-auto">
          {[
            { key: "all", label: "All", count: counts.all, icon: "ph-squares-four" },
            { key: "active", label: "Active", count: counts.active, icon: "ph-check-circle" },
            { key: "inactive", label: "Inactive", count: counts.inactive, icon: "ph-x-circle" },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key as any);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-2 px-3 py-3 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <i className={`ph ${tab.icon} text-base`} />
                <span>{tab.label}</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold ${
                    isActive
                      ? "bg-emerald-600 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Salaries Table Card */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-muted/50 border-b border-border/80 text-xs font-semibold text-muted-foreground">
                <th className="py-3.5 px-4 w-12">#</th>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Basic Salary</th>
                <th className="py-3.5 px-4 w-32">Status</th>
                <th className="py-3.5 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => setSortAsc((v) => !v)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <span>Created At</span>
                    <i className="ph ph-caret-up-down text-xs" />
                  </button>
                </th>
                <th className="py-3.5 px-4 text-right w-48">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <i className="ph ph-spinner-gap animate-spin text-xl mr-2 align-middle" />
                    Loading employee salaries...
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <i className="ph ph-currency-inr text-3xl block mx-auto mb-2 opacity-50" />
                    No employee salary records found. Click &quot;Add Employee Salary&quot; to create one.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, idx) => {
                  const rowNum = (safePage - 1) * rowsPerPage + idx + 1;
                  const emp = row.employee;
                  const empName = emp
                    ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim()
                    : "Employee";
                  const initials = emp
                    ? `${emp.firstName?.[0] || ""}${emp.lastName?.[0] || ""}`.toUpperCase()
                    : "E";

                  return (
                    <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4 text-muted-foreground font-medium">{rowNum}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-semibold overflow-hidden">
                            {emp?.avatarUrl ? (
                              <img
                                src={emp.avatarUrl}
                                alt={empName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              initials
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate">{empName}</div>
                            {emp?.employeeCode && (
                              <div className="text-xs text-muted-foreground truncate">
                                {emp.employeeCode}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-emerald-600">
                        {formatINR(row.basicSalary ?? row.ctcMonthly)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            row.isCurrent
                              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {row.isCurrent ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <i className="ph ph-calendar-blank text-sm" />
                          <span>{formatDateISO(row.createdAt || row.effectiveFrom)}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center justify-end gap-0.5">
                          <button
                            type="button"
                            title="View Salary Details"
                            onClick={() => setViewTarget(row)}
                            className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            <i className="ph ph-eye text-base" />
                          </button>
                          <button
                            type="button"
                            title="Edit Salary"
                            onClick={() => openEditModal(row)}
                            className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            <i className="ph ph-note-pencil text-base" />
                          </button>
                          <button
                            type="button"
                            title={row.isCurrent ? "Deactivate Salary" : "Activate Salary"}
                            onClick={() => toggleStatusMutation.mutate(row)}
                            className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10 transition-colors"
                          >
                            <i
                              className={`ph ${
                                row.isCurrent ? "ph-lock-simple" : "ph-lock-simple-open"
                              } text-base`}
                            />
                          </button>
                          <button
                            type="button"
                            title="Salary Breakdown"
                            onClick={() => setBreakdownTarget(row)}
                            className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                          >
                            <i className="ph ph-chart-bar text-base" />
                          </button>
                          <button
                            type="button"
                            title="Delete Salary"
                            onClick={() => setDeleteTarget(row)}
                            className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                          >
                            <i className="ph ph-trash text-base" />
                          </button>
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
        <div className="px-4 py-3 border-t border-border/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-foreground">
          <div>
            Showing {totalResults === 0 ? 0 : (safePage - 1) * rowsPerPage + 1} to{" "}
            {Math.min(safePage * rowsPerPage, totalResults)} of {totalResults} results
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
              >
                {[10, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(Math.max(0, safePage - 3), Math.min(totalPages, safePage + 2))
                .map((pNum) => (
                  <Button
                    key={pNum}
                    variant={pNum === safePage ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setPage(pNum)}
                    className={`h-8 w-8 p-0 text-xs ${
                      pNum === safePage
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
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
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 1. VIEW EMPLOYEE SALARY DETAILS MODAL (Screenshot 3) */}
      <Dialog open={Boolean(viewTarget)} onOpenChange={(o) => !o && setViewTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="pb-3 border-b border-border/70">
            <DialogTitle className="flex items-center gap-2.5 text-base">
              <span className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 inline-flex items-center justify-center">
                <i className="ph ph-currency-inr text-lg" />
              </span>
              <span>Employee Salary Details</span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Detailed summary of the employee salary structure
            </DialogDescription>
          </DialogHeader>

          {viewTarget && (
            <div className="py-2 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <i className="ph ph-user text-sm" />
                    <span>Employee</span>
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {viewTarget.employee
                      ? `${viewTarget.employee.firstName} ${viewTarget.employee.lastName}`
                      : "Employee"}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <i className="ph ph-currency-inr text-sm" />
                    <span>Basic Salary</span>
                  </div>
                  <div className="text-sm font-bold text-foreground">
                    {formatINR(viewTarget.basicSalary ?? viewTarget.ctcMonthly)}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <i className="ph ph-lock-simple text-sm" />
                    <span>Status</span>
                  </div>
                  <div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        viewTarget.isCurrent
                          ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {viewTarget.isCurrent ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <i className="ph ph-calendar-blank text-sm" />
                    <span>Created At</span>
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {formatDateISO(viewTarget.createdAt || viewTarget.effectiveFrom)}
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/70">
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <i className="ph ph-stack text-sm" />
                  <span>Salary Components</span>
                </div>
                {viewTarget.breakdown?.components && viewTarget.breakdown.components.length > 0 ? (
                  <div className="space-y-1.5">
                    {viewTarget.breakdown.components.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between text-xs px-3 py-2 rounded-lg border border-border/70 bg-muted/20"
                      >
                        <span className="font-medium text-foreground">
                          {c.name}{" "}
                          <span className="text-muted-foreground">
                            ({c.type === "deduction" ? "Deduction" : "Earning"})
                          </span>
                        </span>
                        <span
                          className={`font-semibold ${
                            c.type === "deduction" ? "text-rose-600" : "text-emerald-600"
                          }`}
                        >
                          {c.type === "deduction" ? "-" : "+"}
                          {formatINR(c.monthlyAmount)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm font-semibold text-foreground">Basic only</div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 2. ADD / EDIT EMPLOYEE SALARY MODAL */}
      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingRecord(null);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border/80">
            <DialogTitle>
              {editingRecord ? "Edit Employee Salary" : "Add Employee Salary"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Configure employee basic salary and assigned salary components
            </DialogDescription>
          </DialogHeader>

          <form
            id="emp-salary-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.employeeId) {
                toast.error("Please select an employee");
                return;
              }
              if (!form.basicSalary || Number(form.basicSalary) <= 0) {
                toast.error("Basic salary must be greater than 0");
                return;
              }
              saveMutation.mutate();
            }}
            className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
          >
            <div className="space-y-1.5">
              <Label>
                Employee <span className="text-rose-500">*</span>
              </Label>
              <select
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                required
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="">Select Employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {`${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>
                  Basic Salary (INR) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  value={form.basicSalary}
                  onChange={(e) => setForm({ ...form, basicSalary: e.target.value })}
                  placeholder="e.g. 50000.00"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>
                  Status <span className="text-rose-500">*</span>
                </Label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Effective Date</Label>
              <Input
                type="date"
                value={form.effectiveFrom}
                onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Salary Components (Optional)</Label>
              {components.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No active salary components configured yet. Salary will be Basic only.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {components.map((comp) => {
                    const checked = form.componentIds.includes(comp.id);
                    const isDed = comp.type?.toLowerCase() === "deduction";
                    const isPct = comp.calculationType?.toLowerCase().includes("percent");
                    return (
                      <label
                        key={comp.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          checked
                            ? "border-emerald-600 bg-emerald-500/5"
                            : "border-border/80 hover:bg-muted/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleComponentId(comp.id)}
                          className="mt-0.5 accent-emerald-600"
                        />
                        <div className="min-w-0 text-xs">
                          <div className="font-semibold text-foreground truncate">{comp.name}</div>
                          <div className="text-muted-foreground">
                            {isDed ? "Deduction" : "Earning"} •{" "}
                            {isPct
                              ? `${Number(comp.defaultValue).toFixed(1)}% of Basic`
                              : formatINR(comp.defaultValue)}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Notes / Remarks</Label>
              <Textarea
                rows={2}
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                placeholder="Optional notes for this salary structure..."
              />
            </div>
          </form>

          <DialogFooter className="px-6 py-3.5 border-t border-border/80 gap-2">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="emp-salary-form"
              disabled={saveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. SALARY BREAKDOWN ANALYTICS MODAL */}
      <Dialog open={Boolean(breakdownTarget)} onOpenChange={(o) => !o && setBreakdownTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <i className="ph ph-chart-bar text-emerald-600 text-xl" />
              <span>Monthly Salary Breakdown</span>
            </DialogTitle>
            <DialogDescription>
              {breakdownTarget?.employee
                ? `${breakdownTarget.employee.firstName} ${breakdownTarget.employee.lastName}`
                : "Employee"}{" "}
              compensation summary.
            </DialogDescription>
          </DialogHeader>

          {breakdownTarget?.breakdown && (
            <div className="space-y-4 py-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">Basic Salary</div>
                  <div className="text-base font-bold text-foreground mt-1">
                    {formatINR(breakdownTarget.breakdown.basicSalary)}
                  </div>
                </div>
                <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">Gross Salary</div>
                  <div className="text-base font-bold text-emerald-600 mt-1">
                    {formatINR(breakdownTarget.breakdown.grossSalary)}
                  </div>
                </div>
                <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">Total Deductions</div>
                  <div className="text-base font-bold text-rose-600 mt-1">
                    {formatINR(breakdownTarget.breakdown.totalDeductions)}
                  </div>
                </div>
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                  <div className="text-xs text-emerald-700">Estimated Net Pay</div>
                  <div className="text-base font-bold text-emerald-700 mt-1">
                    {formatINR(breakdownTarget.breakdown.netSalary)}
                  </div>
                </div>
              </div>

              {breakdownTarget.breakdown.components.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-muted-foreground">
                    Applied Components
                  </div>
                  {breakdownTarget.breakdown.components.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between text-xs py-1.5 border-b border-border/60 last:border-0"
                    >
                      <span className="text-foreground font-medium">{c.name}</span>
                      <span
                        className={`font-semibold ${
                          c.type === "deduction" ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {c.type === "deduction" ? "-" : "+"}
                        {formatINR(c.monthlyAmount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 4. DELETE CONFIRMATION MODAL */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Employee Salary</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the salary record for{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.employee
                  ? `${deleteTarget.employee.firstName} ${deleteTarget.employee.lastName}`
                  : "this employee"}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
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
