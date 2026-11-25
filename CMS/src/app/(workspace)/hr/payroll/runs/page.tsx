"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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

interface PayrollRunRow {
  id: string;
  title: string;
  frequency: string;
  periodMonth: number;
  periodYear: number;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  notes?: string;
  employeeCount: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  displayStatus: "draft" | "processing" | "completed" | "cancelled" | string;
}

interface RunsListResponse {
  runs: PayrollRunRow[];
  counts: {
    all: number;
    draft: number;
    processing: number;
    completed: number;
    cancelled: number;
  };
  activeMonths: number[];
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const formatINR = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(val) || 0);

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-muted text-muted-foreground border-border" },
  processing: { label: "Processing", cls: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
  completed: { label: "Completed", cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  cancelled: { label: "Cancelled", cls: "bg-rose-500/10 text-rose-700 border-rose-500/20" },
};

function buildDefaultForm(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const payDate = new Date(year, month, 5).toISOString().slice(0, 10);
  return {
    title: `${FULL_MONTHS[month - 1]} ${year} Payroll`,
    frequency: "Monthly",
    payPeriodStart: start,
    payPeriodEnd: end,
    payDate,
    notes: "",
  };
}

export default function HrPayrollRunsPage() {
  const queryClient = useQueryClient();
  const now = new Date();

  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [searchInput, setSearchInput] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [sortKey, setSortKey] = useState<"title" | "payDate">("payDate");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRun, setEditingRun] = useState<PayrollRunRow | null>(null);
  const [form, setForm] = useState(() => buildDefaultForm(now.getFullYear(), now.getMonth() + 1));
  const [deleteTarget, setDeleteTarget] = useState<PayrollRunRow | null>(null);

  const { data: runsRes, isLoading } = useQuery<RunsListResponse>({
    queryKey: ["hr-payroll-runs", selectedYear, selectedMonth, activeTab, searchInput],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/payroll/runs", {
        params: {
          year: selectedYear,
          month: selectedMonth,
          ...(activeTab !== "all" ? { status: activeTab } : {}),
          ...(searchInput.trim() ? { search: searchInput.trim() } : {}),
        },
      });
      const payload = res?.data ?? res ?? {};
      return {
        runs: Array.isArray(payload.runs) ? payload.runs : [],
        counts: payload.counts ?? { all: 0, draft: 0, processing: 0, completed: 0, cancelled: 0 },
        activeMonths: Array.isArray(payload.activeMonths) ? payload.activeMonths : [],
      };
    },
  });

  const sortedRuns = useMemo(() => {
    const list = [...(runsRes?.runs ?? [])];
    list.sort((a, b) => {
      const cmp =
        sortKey === "title"
          ? (a.title || "").localeCompare(b.title || "")
          : (a.payDate || "").localeCompare(b.payDate || "");
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [runsRes?.runs, sortKey, sortAsc]);

  const totalResults = sortedRuns.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginatedRuns = sortedRuns.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["hr-payroll-runs"] });
    queryClient.invalidateQueries({ queryKey: ["hr-payroll-payslips"] });
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      if (editingRun) {
        return api.put(`/api/v1/hr/payroll/runs/${editingRun.id}`, form);
      }
      return api.post("/api/v1/hr/payroll/runs", form);
    },
    onSuccess: () => {
      toast.success(editingRun ? "Payroll run updated" : "Payroll run created");
      invalidate();
      setIsModalOpen(false);
      setEditingRun(null);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save payroll run"),
  });

  const generatePayslipsMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/hr/payroll/runs/${id}/generate-payslips`, {}),
    onSuccess: (res: any) => {
      toast.success(res?.message || "Payslips generated successfully");
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to generate payslips"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/hr/payroll/runs/${id}`),
    onSuccess: () => {
      toast.success("Payroll run deleted");
      invalidate();
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete payroll run"),
  });

  const shiftMonth = (delta: number) => {
    const d = new Date(selectedYear, selectedMonth - 1 + delta, 1);
    setSelectedYear(d.getFullYear());
    setSelectedMonth(d.getMonth() + 1);
    setPage(1);
  };

  const openAddModal = () => {
    setEditingRun(null);
    setForm(buildDefaultForm(selectedYear, selectedMonth));
    setIsModalOpen(true);
  };

  const openEditModal = (run: PayrollRunRow) => {
    setEditingRun(run);
    setForm({
      title: run.title || "",
      frequency: run.frequency || "Monthly",
      payPeriodStart: run.payPeriodStart || "",
      payPeriodEnd: run.payPeriodEnd || "",
      payDate: run.payDate || "",
      notes: run.notes || "",
    });
    setIsModalOpen(true);
  };

  const counts = runsRes?.counts ?? { all: 0, draft: 0, processing: 0, completed: 0, cancelled: 0 };
  const activeMonths = runsRes?.activeMonths ?? [];

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Payroll Runs</h1>
          <p className="text-sm text-muted-foreground">
            Process and manage payroll runs for each pay period.
          </p>
        </div>

        <Button
          size="sm"
          onClick={openAddModal}
          className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white self-start sm:self-auto"
        >
          <i className="ph ph-plus text-base" />
          <span>Add Payroll Run</span>
        </Button>
      </div>

      {/* Month & Year Strip Card */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
          >
            <i className="ph ph-caret-left text-sm" />
          </Button>
          <div className="text-sm font-bold text-foreground">
            {FULL_MONTHS[selectedMonth - 1]} {selectedYear}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
          >
            <i className="ph ph-caret-right text-sm" />
          </Button>
        </div>

        <div className="flex items-center overflow-x-auto divide-x divide-border/60">
          <button
            type="button"
            onClick={() => setSelectedYear((y) => y - 1)}
            className="px-3 py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 shrink-0"
            title="Previous year"
          >
            <i className="ph ph-caret-left text-xs" />
          </button>
          {SHORT_MONTHS.map((mLabel, idx) => {
            const mNum = idx + 1;
            const isSelected = selectedMonth === mNum;
            const hasRuns = activeMonths.includes(mNum);
            return (
              <button
                key={mLabel}
                type="button"
                onClick={() => {
                  setSelectedMonth(mNum);
                  setPage(1);
                }}
                className={`flex-1 min-w-[60px] py-2.5 px-2 text-xs font-medium text-center transition-colors relative ${
                  isSelected
                    ? "bg-emerald-600 text-white font-semibold"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                <span>{mLabel}</span>
                {hasRuns && (
                  <span
                    className={`block mx-auto mt-1 h-1 w-1 rounded-full ${
                      isSelected ? "bg-white" : "bg-emerald-600"
                    }`}
                  />
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setSelectedYear((y) => y + 1)}
            className="px-3 py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 shrink-0"
            title="Next year"
          >
            <i className="ph ph-caret-right text-xs" />
          </button>
        </div>
      </div>

      {/* Search & Status Tabs Card */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-border/70">
          <div className="relative w-full sm:w-72">
            <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
            <Input
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              placeholder="Search..."
              className="pl-9 h-9 w-full"
            />
          </div>
        </div>

        <div className="px-3 sm:px-4 flex items-center gap-1 overflow-x-auto">
          {[
            { key: "all", label: "All", count: counts.all, icon: "ph-squares-four" },
            { key: "draft", label: "Draft", count: counts.draft, icon: "ph-file-dashed" },
            { key: "processing", label: "Processing", count: counts.processing, icon: "ph-play" },
            { key: "completed", label: "Completed", count: counts.completed, icon: "ph-check-circle" },
            { key: "cancelled", label: "Cancelled", count: counts.cancelled, icon: "ph-x-circle" },
          ].map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-2 px-3 py-3 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  active
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <i className={`ph ${tab.icon} text-base`} />
                <span>{tab.label}</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold ${
                    active ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Payroll Runs Table */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-muted/50 border-b border-border/80 text-xs font-semibold text-muted-foreground">
                <th className="py-3.5 px-4 w-12">#</th>
                <th className="py-3.5 px-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (sortKey === "title") setSortAsc((v) => !v);
                      else {
                        setSortKey("title");
                        setSortAsc(true);
                      }
                    }}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <span>Title</span>
                    <i className="ph ph-caret-up-down text-xs" />
                  </button>
                </th>
                <th className="py-3.5 px-3">Frequency</th>
                <th className="py-3.5 px-3 whitespace-nowrap">Pay Period</th>
                <th className="py-3.5 px-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => {
                      if (sortKey === "payDate") setSortAsc((v) => !v);
                      else {
                        setSortKey("payDate");
                        setSortAsc(false);
                      }
                    }}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <span>Pay Date</span>
                    <i className="ph ph-caret-up-down text-xs" />
                  </button>
                </th>
                <th className="py-3.5 px-3">Employees</th>
                <th className="py-3.5 px-3 whitespace-nowrap">Gross Pay</th>
                <th className="py-3.5 px-3 whitespace-nowrap">Net Pay</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted-foreground">
                    <i className="ph ph-spinner-gap animate-spin text-xl mr-2 align-middle" />
                    Loading payroll runs...
                  </td>
                </tr>
              ) : paginatedRuns.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted-foreground">
                    <i className="ph ph-calendar-blank text-3xl block mx-auto mb-2 opacity-50" />
                    No payroll runs for {FULL_MONTHS[selectedMonth - 1]} {selectedYear}. Click
                    &quot;Add Payroll Run&quot; to create one.
                  </td>
                </tr>
              ) : (
                paginatedRuns.map((run, idx) => {
                  const rowNum = (safePage - 1) * rowsPerPage + idx + 1;
                  const st = STATUS_BADGE[run.displayStatus] ?? STATUS_BADGE.draft;
                  return (
                    <tr key={run.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4 text-muted-foreground font-medium">{rowNum}</td>
                      <td className="py-3.5 px-4 font-semibold text-foreground">
                        <Link
                          href={`/hr/payroll/runs/${run.id}`}
                          className="hover:text-primary transition-colors"
                        >
                          {run.title}
                        </Link>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-sky-500/10 text-sky-700 border-sky-500/20">
                          {run.frequency}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <i className="ph ph-calendar-blank" />
                          <span>{run.payPeriodStart}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <i className="ph ph-calendar-blank" />
                          <span>{run.payPeriodEnd}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <i className="ph ph-calendar-blank" />
                          <span>{run.payDate}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-foreground">
                        {run.employeeCount}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap font-semibold text-emerald-600">
                        {formatINR(run.grossPay)}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap font-semibold text-primary">
                        {formatINR(run.netPay)}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${st.cls}`}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <Link
                            href={`/hr/payroll/runs/${run.id}`}
                            title="View Run Details"
                            className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            <i className="ph ph-eye text-base" />
                          </Link>
                          <button
                            type="button"
                            title="Generate Payslips"
                            disabled={generatePayslipsMutation.isPending}
                            onClick={() => generatePayslipsMutation.mutate(run.id)}
                            className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                          >
                            <i className="ph ph-file-text text-base" />
                          </button>
                          <button
                            type="button"
                            title="Edit Payroll Run"
                            onClick={() => openEditModal(run)}
                            className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            <i className="ph ph-note-pencil text-base" />
                          </button>
                          <button
                            type="button"
                            title="Delete Payroll Run"
                            onClick={() => setDeleteTarget(run)}
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
              <Button
                size="sm"
                className="h-8 w-8 p-0 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {safePage}
              </Button>
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

      {/* Add / Edit Payroll Run Modal */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setEditingRun(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRun ? "Edit Payroll Run" : "Add New Payroll Run"}</DialogTitle>
            <DialogDescription className="sr-only">
              Configure payroll run title, frequency, pay period, and pay date
            </DialogDescription>
          </DialogHeader>

          <form
            id="payroll-run-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.title.trim()) {
                toast.error("Title is required");
                return;
              }
              saveMutation.mutate();
            }}
            className="space-y-4 py-1"
          >
            <div className="space-y-1.5">
              <Label>
                Title <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. April 2026 Monthly Payroll"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Payroll Frequency <span className="text-rose-500">*</span>
              </Label>
              <select
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                required
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="Monthly">Monthly</option>
                <option value="Bi-Weekly">Bi-Weekly</option>
                <option value="Weekly">Weekly</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Pay Period Start <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={form.payPeriodStart}
                onChange={(e) => setForm({ ...form, payPeriodStart: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Pay Period End <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={form.payPeriodEnd}
                onChange={(e) => setForm({ ...form, payPeriodEnd: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Pay Date <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={form.payDate}
                onChange={(e) => setForm({ ...form, payDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="e.g. Additional notes about this payroll run..."
              />
            </div>
          </form>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="payroll-run-form"
              disabled={saveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Payroll Run</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.title}</span> and all
              associated payslips? This action cannot be undone.
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
