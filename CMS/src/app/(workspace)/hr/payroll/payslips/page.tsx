"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@/lib/router-compat";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface PayslipItem {
  id: string;
  employeeId: string;
  periodMonth: number;
  periodYear: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  displayStatus: "generated" | "downloaded" | string;
  payDate: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  generatedOn: string;
  employee?: EmployeeOption | null;
  breakdown: {
    basicSalary: number;
    componentEarnings: number;
    totalEarnings: number;
    lopDeduction: number;
    overtimeEarnings: number;
    grossPay: number;
    totalDeductions: number;
    netPay: number;
    earnings: Array<{ name: string; amount: number }>;
    deductions: Array<{ name: string; amount: number }>;
    attendance: {
      workingDays: number;
      presentDays: number;
      absentDays: number;
      halfDays: number;
      holidayDays: number;
      paidLeave: number;
      unpaidLeave: number;
      lopDays: number;
      effectivePaidDays: number;
      overtimeHours: number;
    };
  };
}

interface PayslipsResponse {
  payslips: PayslipItem[];
  counts: {
    all: number;
    generated: number;
    downloaded: number;
  };
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toISOString().slice(0, 10);
};

export default function HrPayrollPayslipsPage() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isEmployeePortal = currentPath.startsWith("/me");
  const queryClient = useQueryClient();
  const now = new Date();

  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [searchInput, setSearchInput] = useState("");
  const [employeeInput, setEmployeeInput] = useState("all");
  const [appliedFilters, setAppliedFilters] = useState({ search: "", employeeId: "all" });
  const [activeTab, setActiveTab] = useState<"all" | "generated" | "downloaded">("all");
  const [sortKey, setSortKey] = useState<"payDate" | "generatedOn">("payDate");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [selectedStub, setSelectedStub] = useState<PayslipItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PayslipItem | null>(null);

  const { data: employees = [] } = useQuery<EmployeeOption[]>({
    queryKey: ["hr-employees-dropdown"],
    queryFn: async () => {
      const res = await api.get("/employees", { params: { limit: 200 } });
      const raw = res?.employees ?? res?.data?.employees ?? res?.data ?? res;
      return Array.isArray(raw) ? raw : [];
    },
  });

  const { data: payslipsRes, isLoading } = useQuery<PayslipsResponse>({
    queryKey: ["hr-payroll-payslips", selectedYear, selectedMonth, activeTab, appliedFilters],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/payroll/payslips", {
        params: {
          year: selectedYear,
          month: selectedMonth,
          ...(activeTab !== "all" ? { status: activeTab } : {}),
          ...(appliedFilters.employeeId !== "all" ? { employeeId: appliedFilters.employeeId } : {}),
          ...(appliedFilters.search ? { search: appliedFilters.search } : {}),
        },
      });
      const payload = res?.data ?? res ?? {};
      return {
        payslips: Array.isArray(payload.payslips) ? payload.payslips : [],
        counts: payload.counts ?? { all: 0, generated: 0, downloaded: 0 },
      };
    },
  });

  const sortedPayslips = useMemo(() => {
    const list = [...(payslipsRes?.payslips ?? [])];
    list.sort((a, b) => {
      const aVal = sortKey === "payDate" ? a.payDate : a.generatedOn;
      const bVal = sortKey === "payDate" ? b.payDate : b.generatedOn;
      const cmp = String(aVal || "").localeCompare(String(bVal || ""));
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [payslipsRes?.payslips, sortKey, sortAsc]);

  const totalResults = sortedPayslips.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = sortedPayslips.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const handleDownloadPdf = async (ps: PayslipItem) => {
    const empName = ps.employee
      ? `${ps.employee.firstName || ""} ${ps.employee.lastName || ""}`.trim()
      : "Employee";
    const safeName = (ps.employee?.employeeCode || empName).replace(/[^a-zA-Z0-9_-]+/g, "_");
    const fileName = `Payslip_${safeName}_${ps.periodYear}_${String(ps.periodMonth).padStart(2, "0")}.pdf`;
    try {
      setDownloadingKey(`pdf-${ps.id}`);
      await api.download(`/api/v1/hr/payroll/payslips/${ps.id}/download/pdf`, fileName);
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-payslips"] });
      if (selectedStub?.id === ps.id) {
        setSelectedStub({ ...ps, displayStatus: "downloaded" });
      }
      toast.success("PDF payslip downloaded");
    } catch (err: any) {
      toast.error(err?.message || "Failed to download PDF payslip");
    } finally {
      setDownloadingKey(null);
    }
  };

  const handleDownloadExcel = async (ps: PayslipItem) => {
    const empName = ps.employee
      ? `${ps.employee.firstName || ""} ${ps.employee.lastName || ""}`.trim()
      : "Employee";
    const safeName = (ps.employee?.employeeCode || empName).replace(/[^a-zA-Z0-9_-]+/g, "_");
    const fileName = `Payslip_${safeName}_${ps.periodYear}_${String(ps.periodMonth).padStart(2, "0")}.xlsx`;
    try {
      setDownloadingKey(`xlsx-${ps.id}`);
      await api.download(`/api/v1/hr/payroll/payslips/${ps.id}/download/excel`, fileName);
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-payslips"] });
      if (selectedStub?.id === ps.id) {
        setSelectedStub({ ...ps, displayStatus: "downloaded" });
      }
      toast.success("Excel payslip downloaded");
    } catch (err: any) {
      toast.error(err?.message || "Failed to download Excel payslip");
    } finally {
      setDownloadingKey(null);
    }
  };

  const handleBulkExportExcel = async () => {
    const qs = new URLSearchParams({
      year: String(selectedYear),
      month: String(selectedMonth),
      ...(appliedFilters.employeeId !== "all" ? { employeeId: appliedFilters.employeeId } : {}),
    }).toString();
    const fileName = `Payslips_${selectedYear}_${String(selectedMonth).padStart(2, "0")}.xlsx`;
    try {
      setDownloadingKey("bulk-xlsx");
      await api.download(`/api/v1/hr/payroll/payslips/export/excel?${qs}`, fileName);
      toast.success("Payslips exported to Excel");
    } catch (err: any) {
      toast.error(err?.message || "Failed to export Excel");
    } finally {
      setDownloadingKey(null);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/hr/payroll/payslips/${id}`),
    onSuccess: () => {
      toast.success("Payslip deleted");
      if (selectedStub?.id === deleteTarget?.id) setSelectedStub(null);
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-payslips"] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete payslip"),
  });

  const counts = payslipsRes?.counts ?? { all: 0, generated: 0, downloaded: 0 };
  const yearOptions = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Payslips</h1>
          <p className="text-sm text-muted-foreground">Browse and download employee payslips.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={downloadingKey === "bulk-xlsx"}
          onClick={handleBulkExportExcel}
          className="h-9 gap-1.5 self-start sm:self-auto"
        >
          <i className="ph ph-file-xls text-base text-emerald-600" />
          <span>{downloadingKey === "bulk-xlsx" ? "Exporting..." : "Export Excel"}</span>
        </Button>
      </div>

      {/* 12-Month Horizontal Selector */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="flex items-center overflow-x-auto divide-x divide-border/60">
          {SHORT_MONTHS.map((mLabel, idx) => {
            const mNum = idx + 1;
            const isSelected = selectedMonth === mNum;
            return (
              <button
                key={mLabel}
                type="button"
                onClick={() => {
                  setSelectedMonth(mNum);
                  setPage(1);
                }}
                className={`flex-1 min-w-[68px] py-3 px-2 text-center transition-colors ${
                  isSelected
                    ? "bg-emerald-600 text-white font-semibold"
                    : "text-foreground hover:bg-muted/40"
                }`}
              >
                <div className="text-xs font-semibold">{mLabel}</div>
                {isSelected && <div className="text-[10px] opacity-90 mt-0.5">{selectedYear}</div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters & Status Tabs Card */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="p-3 sm:p-4 space-y-3 border-b border-border/70">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
              <div className="relative w-full sm:w-56">
                <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
                <Input
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    if (e.target.value === "") setAppliedFilters((p) => ({ ...p, search: "" }));
                  }}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    setAppliedFilters({ search: searchInput.trim(), employeeId: employeeInput })
                  }
                  placeholder="Search..."
                  className="pl-9 h-9 w-full"
                />
              </div>

              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(Number(e.target.value));
                  setPage(1);
                }}
                className="h-9 w-full sm:w-32 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                aria-label="Select year"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <select
                value={employeeInput}
                onChange={(e) => setEmployeeInput(e.target.value)}
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
                className="h-9 gap-1.5"
                onClick={() => {
                  setPage(1);
                  setAppliedFilters({ search: searchInput.trim(), employeeId: employeeInput });
                }}
              >
                <i className="ph ph-funnel text-base" />
                <span>Filters</span>
              </Button>
              {(appliedFilters.search || appliedFilters.employeeId !== "all") && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 text-muted-foreground"
                  onClick={() => {
                    setSearchInput("");
                    setEmployeeInput("all");
                    setAppliedFilters({ search: "", employeeId: "all" });
                  }}
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-border/80 bg-muted/40 text-foreground">
              Year: {selectedYear}
            </span>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="px-3 sm:px-4 flex items-center gap-1 overflow-x-auto">
          {[
            { key: "all", label: "All", count: counts.all, icon: "ph-squares-four" },
            { key: "generated", label: "Generated", count: counts.generated, icon: "ph-file-text" },
            { key: "downloaded", label: "Downloaded", count: counts.downloaded, icon: "ph-check-circle" },
          ].map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key as any);
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

      {/* Main Content: Table + Optional Sticky Pay Stub Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Table Column */}
        <div
          className={`${
            selectedStub ? "lg:col-span-8" : "lg:col-span-12"
          } rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-muted/50 border-b border-border/80 text-xs font-semibold text-muted-foreground">
                  <th className="py-3.5 px-4 w-12">#</th>
                  <th className="py-3.5 px-4">Employee</th>
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
                  <th className="py-3.5 px-3 whitespace-nowrap">Net Pay</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => {
                        if (sortKey === "generatedOn") setSortAsc((v) => !v);
                        else {
                          setSortKey("generatedOn");
                          setSortAsc(false);
                        }
                      }}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      <span>Generated On</span>
                      <i className="ph ph-caret-up-down text-xs" />
                    </button>
                  </th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      <i className="ph ph-spinner-gap animate-spin text-xl mr-2 align-middle" />
                      Loading payslips...
                    </td>
                  </tr>
                ) : paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      <i className="ph ph-file-text text-3xl block mx-auto mb-2 opacity-50" />
                      No payslips generated for {SHORT_MONTHS[selectedMonth - 1]} {selectedYear}.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((ps, idx) => {
                    const rowNum = (safePage - 1) * rowsPerPage + idx + 1;
                    const emp = ps.employee;
                    const empName = emp
                      ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim()
                      : "Employee";
                    const initials = emp
                      ? `${emp.firstName?.[0] || ""}${emp.lastName?.[0] || ""}`.toUpperCase()
                      : "E";
                    const isDownloaded = ps.displayStatus === "downloaded";

                    return (
                      <tr
                        key={ps.id}
                        className={`hover:bg-muted/30 transition-colors ${
                          selectedStub?.id === ps.id ? "bg-emerald-500/5" : ""
                        }`}
                      >
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
                              <div className="font-semibold text-foreground truncate">
                                {empName}
                              </div>
                              {emp?.employeeCode && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {emp.employeeCode}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <i className="ph ph-calendar-blank" />
                            <span>{formatDateISO(ps.payDate)}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap font-semibold text-foreground">
                          {formatINR(ps.netSalary)}
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              isDownloaded
                                ? "bg-purple-500/10 text-purple-700 border-purple-500/20"
                                : "bg-sky-500/10 text-sky-700 border-sky-500/20"
                            }`}
                          >
                            {isDownloaded ? "Downloaded" : "Generated"}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <i className="ph ph-calendar-blank" />
                            <span>{formatDateISO(ps.generatedOn)}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            <button
                              type="button"
                              title="View Pay Stub"
                              onClick={() => setSelectedStub(ps)}
                              className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            >
                              <i className="ph ph-eye text-base" />
                            </button>
                            <button
                              type="button"
                              title="Download PDF Payslip"
                              disabled={downloadingKey === `pdf-${ps.id}`}
                              onClick={() => handleDownloadPdf(ps)}
                              className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                            >
                              <i className="ph ph-file-pdf text-base" />
                            </button>
                            <button
                              type="button"
                              title="Download Excel Payslip"
                              disabled={downloadingKey === `xlsx-${ps.id}`}
                              onClick={() => handleDownloadExcel(ps)}
                              className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                            >
                              <i className="ph ph-file-xls text-base" />
                            </button>
                            {!isEmployeePortal && (
                              <button
                                type="button"
                                title="Delete Payslip"
                                onClick={() => setDeleteTarget(ps)}
                                className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                              >
                                <i className="ph ph-trash text-base" />
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

        {/* Right Pay Stub Drawer Panel (Screenshots 6, 7, 8) */}
        {selectedStub && (
          <div className="lg:col-span-4 rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden lg:sticky lg:top-4">
            {/* Stub Header */}
            <div className="px-4 py-3.5 border-b border-border/70 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-foreground">Pay Stub</h2>
                <div className="text-[11px] text-muted-foreground">
                  {selectedStub.payPeriodStart} → {selectedStub.payPeriodEnd}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Download PDF"
                  disabled={downloadingKey === `pdf-${selectedStub.id}`}
                  onClick={() => handleDownloadPdf(selectedStub)}
                  className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                >
                  <i className="ph ph-file-pdf text-base" />
                </button>
                <button
                  type="button"
                  title="Download Excel"
                  disabled={downloadingKey === `xlsx-${selectedStub.id}`}
                  onClick={() => handleDownloadExcel(selectedStub)}
                  className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
                >
                  <i className="ph ph-file-xls text-base" />
                </button>
                <button
                  type="button"
                  title="Close"
                  onClick={() => setSelectedStub(null)}
                  className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  <i className="ph ph-x text-base" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4 max-h-[78vh] overflow-y-auto text-xs">
              {/* Employee Banner */}
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-semibold overflow-hidden">
                    {selectedStub.employee?.avatarUrl ? (
                      <img
                        src={selectedStub.employee.avatarUrl}
                        alt={`${selectedStub.employee.firstName} ${selectedStub.employee.lastName}`}
                        className="h-full w-full object-cover"
                      />
                    ) : selectedStub.employee ? (
                      `${selectedStub.employee.firstName?.[0] || ""}${selectedStub.employee.lastName?.[0] || ""}`.toUpperCase()
                    ) : (
                      "E"
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground truncate">
                      {selectedStub.employee
                        ? `${selectedStub.employee.firstName} ${selectedStub.employee.lastName}`
                        : "Employee"}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {selectedStub.employee?.employeeCode || "—"}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-muted-foreground">Pay Date</div>
                  <div className="font-semibold text-foreground">
                    {formatDateISO(selectedStub.payDate)}
                  </div>
                </div>
              </div>

              {/* Attendance */}
              <div className="space-y-1.5">
                <div className="font-semibold text-muted-foreground">Attendance</div>
                <div className="rounded-lg border border-border/70 divide-y divide-border/60">
                  {[
                    { label: "Working Days", val: selectedStub.breakdown.attendance.workingDays, cls: "text-foreground" },
                    { label: "Present Days", val: selectedStub.breakdown.attendance.presentDays.toFixed(2), cls: "text-emerald-600" },
                    { label: "Absent Days", val: selectedStub.breakdown.attendance.absentDays, cls: "text-rose-600" },
                    { label: "Half Days", val: selectedStub.breakdown.attendance.halfDays.toFixed(2), cls: "text-amber-600" },
                    { label: "Holiday Days", val: selectedStub.breakdown.attendance.holidayDays, cls: "text-primary" },
                    { label: "Paid Leave", val: selectedStub.breakdown.attendance.paidLeave.toFixed(2), cls: "text-emerald-600" },
                    { label: "Unpaid Leave", val: selectedStub.breakdown.attendance.unpaidLeave.toFixed(2), cls: "text-rose-600" },
                    { label: "LOP Days", val: selectedStub.breakdown.attendance.lopDays.toFixed(2), cls: "text-rose-600" },
                    { label: "Effective Paid Days", val: selectedStub.breakdown.attendance.effectivePaidDays.toFixed(2), cls: "text-emerald-600" },
                    { label: "Overtime Hours", val: selectedStub.breakdown.attendance.overtimeHours.toFixed(2), cls: "text-purple-600" },
                  ].map((row) => (
                    <div key={row.label} className="px-3 py-1.5 flex items-center justify-between">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className={`font-semibold ${row.cls}`}>{row.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gross Pay Calculation */}
              <div className="space-y-1.5">
                <div className="font-semibold text-muted-foreground">Gross Pay Calculation</div>
                <div className="rounded-lg border border-border/70 divide-y divide-border/60">
                  <div className="px-3 py-1.5 flex justify-between">
                    <span className="text-muted-foreground">Basic Salary</span>
                    <span className="font-semibold text-foreground">
                      {formatINR(selectedStub.breakdown.basicSalary)}
                    </span>
                  </div>
                  <div className="px-3 py-1.5 flex justify-between">
                    <span className="text-muted-foreground">Component Earnings</span>
                    <span className="font-semibold text-emerald-600">
                      +{formatINR(selectedStub.breakdown.componentEarnings)}
                    </span>
                  </div>
                  <div className="px-3 py-1.5 flex justify-between bg-emerald-500/5 font-semibold">
                    <span className="text-foreground">Total Earnings</span>
                    <span className="text-emerald-700">
                      {formatINR(selectedStub.breakdown.totalEarnings)}
                    </span>
                  </div>
                  <div className="px-3 py-1.5 flex justify-between">
                    <span className="text-muted-foreground">LOP Deduction</span>
                    <span className="font-semibold text-rose-600">
                      -{formatINR(selectedStub.breakdown.lopDeduction)}
                    </span>
                  </div>
                  <div className="px-3 py-1.5 flex justify-between">
                    <span className="text-muted-foreground">Overtime Earnings</span>
                    <span className="font-semibold text-emerald-600">
                      +{formatINR(selectedStub.breakdown.overtimeEarnings)}
                    </span>
                  </div>
                  <div className="px-3 py-2 flex justify-between items-center bg-emerald-500/10">
                    <div>
                      <div className="font-bold text-foreground">Gross Pay</div>
                      <div className="text-[10px] text-muted-foreground">
                        Total Earnings − LOP + Overtime
                      </div>
                    </div>
                    <span className="text-sm font-bold text-emerald-700">
                      {formatINR(selectedStub.breakdown.grossPay)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Earnings / Allowances */}
              {selectedStub.breakdown.earnings.length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-semibold text-emerald-700 flex items-center gap-1">
                    <i className="ph ph-trend-up" />
                    <span>Earnings / Allowances</span>
                  </div>
                  <div className="rounded-lg border border-border/70 divide-y divide-border/60">
                    {selectedStub.breakdown.earnings.map((e, i) => (
                      <div key={i} className="px-3 py-1.5 flex justify-between">
                        <span className="text-muted-foreground">{e.name}</span>
                        <span className="font-semibold text-emerald-600">
                          +{formatINR(e.amount)}
                        </span>
                      </div>
                    ))}
                    <div className="px-3 py-1.5 flex justify-between bg-emerald-500/5 font-bold">
                      <span>Total Allowances</span>
                      <span className="text-emerald-700">
                        +{formatINR(selectedStub.breakdown.componentEarnings)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Deductions */}
              {selectedStub.breakdown.deductions.length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-semibold text-rose-700 flex items-center gap-1">
                    <i className="ph ph-trend-down" />
                    <span>Deductions</span>
                  </div>
                  <div className="rounded-lg border border-border/70 divide-y divide-border/60">
                    {selectedStub.breakdown.deductions.map((d, i) => (
                      <div key={i} className="px-3 py-1.5 flex justify-between">
                        <span className="text-muted-foreground">{d.name}</span>
                        <span className="font-semibold text-rose-600">
                          -{formatINR(d.amount)}
                        </span>
                      </div>
                    ))}
                    <div className="px-3 py-1.5 flex justify-between bg-rose-500/5 font-bold">
                      <span>Total Deductions</span>
                      <span className="text-rose-700">
                        -{formatINR(selectedStub.breakdown.totalDeductions)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Net Pay Summary */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-1.5">
                <div className="font-bold text-foreground mb-1">Net Pay Summary</div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Basic Salary</span>
                  <span className="font-medium text-foreground">
                    {formatINR(selectedStub.breakdown.basicSalary)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Earnings</span>
                  <span className="font-medium text-emerald-600">
                    +{formatINR(selectedStub.breakdown.totalEarnings)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gross Pay</span>
                  <span className="font-medium text-foreground">
                    {formatINR(selectedStub.breakdown.grossPay)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Deductions</span>
                  <span className="font-medium text-rose-600">
                    -{formatINR(selectedStub.breakdown.totalDeductions)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 mt-1 border-t border-emerald-500/20">
                  <span className="font-bold text-sm text-foreground">Net Pay</span>
                  <span className="font-bold text-base text-emerald-700">
                    {formatINR(selectedStub.breakdown.netPay)}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Net Pay = Gross Pay − Total Deductions
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Payslip</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this payslip? This action cannot be undone.
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
