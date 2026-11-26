'use client';

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapArray } from "@/lib/api";
import {
  useDebouncedValue,
  formatLeaveDays,
  extractLeaveErrorMessage,
  invalidateLeaveBalances,
} from "@/lib/leave-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Search,
  Filter,
  Info,
  X,
  RefreshCw,
  Plus,
  History,
  Sparkles,
  Scale,
} from "lucide-react";

export default function HrLeaveBalancesPage() {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 300);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState("all");
  const [selectedLeaveTypeFilter, setSelectedLeaveTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [ledgerModalEmployee, setLedgerModalEmployee] = useState<any | null>(null);

  const [adjustForm, setAdjustForm] = useState({
    employeeId: "",
    leaveTypeId: "",
    entryType: "CREDIT" as "CREDIT" | "DEBIT",
    days: 1,
    notes: "",
  });

  const yearOptions = useMemo(() => {
    const yrs: number[] = [];
    for (let y = currentYear - 2; y <= currentYear + 3; y++) yrs.push(y);
    return yrs;
  }, [currentYear]);

  // 1. Fetch Bulk Balances + Active Leave Types + Employee Dropdown Options in 1 authoritative API call
  const { data: balanceResponse, isLoading, isFetching, refetch } = useQuery({
    queryKey: [
      "hr-leave-balances",
      selectedYear,
      selectedEmployeeFilter,
      selectedLeaveTypeFilter,
      debouncedSearch,
      currentPage,
      pageSize,
    ],
    queryFn: async () => {
      return await api.get("/api/v1/hr/leave/balances", {
        params: {
          year: selectedYear,
          employeeId: selectedEmployeeFilter,
          leaveTypeId: selectedLeaveTypeFilter,
          search: debouncedSearch,
          page: currentPage,
          limit: pageSize,
        },
      });
    },
    staleTime: 25_000,
  });

  const employeesBalances: any[] = Array.isArray(balanceResponse?.data)
    ? balanceResponse.data
    : Array.isArray(balanceResponse)
    ? balanceResponse
    : [];
  const activeLeaveTypes: any[] = Array.isArray(balanceResponse?.leaveTypes)
    ? balanceResponse.leaveTypes
    : [];
  const allEmployees: any[] = Array.isArray(balanceResponse?.allEmployees)
    ? balanceResponse.allEmployees
    : [];
  const totalEmployees = Number(balanceResponse?.meta?.total ?? employeesBalances.length);

  // 2. Fetch Immutable Ledger Entries for Selected Employee
  const { data: ledgerEntries = [], isLoading: isLoadingLedger } = useQuery({
    queryKey: ["hr-leave-ledger", ledgerModalEmployee?.employeeId, selectedYear],
    queryFn: async () => {
      if (!ledgerModalEmployee?.employeeId) return [];
      const res = await api.get(
        `/api/v1/hr/leave/balances/${ledgerModalEmployee.employeeId}/ledger`,
        { params: { year: selectedYear } }
      );
      return unwrapArray(res);
    },
    enabled: Boolean(ledgerModalEmployee?.employeeId),
  });

  // 3. Sync / Re-Sync Balances Mutation (strictly idempotent per year)
  const syncMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/api/v1/hr/leave/balances/sync", { year: selectedYear });
    },
    onSuccess: async (data: any) => {
      toast.success(data?.message || `Synchronized ${selectedYear} leave balances successfully`);
      await invalidateLeaveBalances(queryClient);
    },
    onError: (err: unknown) => {
      toast.error(extractLeaveErrorMessage(err, "Failed to synchronize leave balances"));
    },
  });

  // 4. Manual Credit / Debit Adjustment Mutation
  const adjustMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/api/v1/hr/leave/balances/adjust", {
        ...payload,
        year: selectedYear,
      });
    },
    onSuccess: async () => {
      toast.success("Leave balance adjusted and immutable ledger entry recorded");
      await invalidateLeaveBalances(queryClient);
      setAdjustModalOpen(false);
      setAdjustForm({ employeeId: "", leaveTypeId: "", entryType: "CREDIT", days: 1, notes: "" });
    },
    onError: (err: unknown) => {
      toast.error(extractLeaveErrorMessage(err, "Failed to adjust leave balance"));
    },
  });

  const openAdjustForEmployee = (employeeId?: string, leaveTypeId?: string) => {
    setAdjustForm({
      employeeId: employeeId || allEmployees[0]?.id || "",
      leaveTypeId: leaveTypeId || activeLeaveTypes[0]?.id || "",
      entryType: "CREDIT",
      days: 1,
      notes: "",
    });
    setAdjustModalOpen(true);
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustForm.employeeId || !adjustForm.leaveTypeId) {
      toast.error("Please select both an employee and a leave type");
      return;
    }
    if (!adjustForm.days || Number(adjustForm.days) <= 0) {
      toast.error("Adjustment days must be greater than 0");
      return;
    }
    if (!adjustForm.notes.trim()) {
      toast.error("Audit reason / note is mandatory for manual balance adjustments");
      return;
    }
    adjustMutation.mutate({
      employeeId: adjustForm.employeeId,
      leaveTypeId: adjustForm.leaveTypeId,
      entryType: adjustForm.entryType,
      days: Number(adjustForm.days),
      notes: adjustForm.notes.trim(),
    });
  };

  const isPositiveLedgerType = (entryType: string) =>
    ["CREDIT", "ACCRUAL", "CARRY_FORWARD"].includes(String(entryType).toUpperCase());

  return (
    <div className="space-y-4 pb-12 max-w-full overflow-x-hidden">
      {/* 1. Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Leave Balances</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View employee leave quotas, synchronize annual entitlements, and record audited ledger adjustments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="h-9 text-xs border-slate-200 dark:border-slate-700 rounded-lg font-medium flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#00a76f] ${syncMutation.isPending ? "animate-spin" : ""}`} />
            {syncMutation.isPending ? "Syncing..." : `Sync ${selectedYear} Balances`}
          </Button>

          <Button
            type="button"
            onClick={() => openAdjustForEmployee()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg px-3.5 h-9 text-xs shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Manual Adjustment
          </Button>
        </div>
      </div>

      {/* 2. Notice Banner */}
      {!bannerDismissed && (
        <div className="bg-[#fffbeb] border border-[#fef3c7] text-[#92400e] rounded-xl p-3.5 shadow-xs flex items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center gap-2">
            <Info className="w-4 h-4 text-[#92400e] shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <span className="font-semibold">Note:</span> If you add a new Employee, Leave Type, or Leave Policy, you must click the{" "}
              <button
                type="button"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="font-semibold underline hover:text-[#78350f] cursor-pointer"
              >
                Sync Balances or Re-sync
              </button>{" "}
              button to apply the changes for the current year.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            className="text-[#92400e]/70 hover:text-[#92400e] transition-colors p-1 shrink-0 cursor-pointer"
            title="Dismiss notice"
            aria-label="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Filter Toolbar Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative w-full lg:w-56">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 h-9 text-xs border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
              />
            </div>

            {/* Employee Dropdown */}
            <Select
              value={selectedEmployeeFilter}
              onValueChange={(val) => {
                setSelectedEmployeeFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-52 h-9 text-xs border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium">
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="all">All Employees</SelectItem>
                {allEmployees.map((emp: any) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Leave Type Filter */}
            <Select
              value={selectedLeaveTypeFilter}
              onValueChange={(val) => {
                setSelectedLeaveTypeFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-44 h-9 text-xs border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium">
                <SelectValue placeholder="All Leave Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leave Types</SelectItem>
                {activeLeaveTypes.map((lt: any) => (
                  <SelectItem key={lt.id} value={lt.id}>
                    {lt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Year Selector */}
            <Select
              value={String(selectedYear)}
              onValueChange={(val) => {
                setSelectedYear(parseInt(val, 10));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-28 h-9 text-xs border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((yr) => (
                  <SelectItem key={yr} value={String(yr)}>
                    {yr}
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
            <Filter className={`w-3.5 h-3.5 text-slate-500 ${isFetching ? "animate-pulse" : ""}`} />
            Filters
          </button>
        </div>

        {/* Active Filter Badges */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-medium">
              Year: {selectedYear}
            </span>
            {selectedEmployeeFilter !== "all" && (
              <button
                type="button"
                onClick={() => setSelectedEmployeeFilter("all")}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium cursor-pointer"
              >
                Filtered Employee <X className="w-3 h-3" />
              </button>
            )}
            {selectedLeaveTypeFilter !== "all" && (
              <button
                type="button"
                onClick={() => setSelectedLeaveTypeFilter("all")}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium cursor-pointer"
              >
                Filtered Leave Type <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <span className="text-xs text-slate-500">
            {totalEmployees} {totalEmployees === 1 ? "employee" : "employees"}
          </span>
        </div>
      </div>

      {/* 4. Employee Balance Cards Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-[#00a76f]" />
          <span className="text-xs font-medium">Loading employee leave balances...</span>
        </div>
      ) : employeesBalances.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-12 text-center text-slate-400 shadow-xs">
          <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">No Employee Balances Found</p>
          <p className="text-xs text-slate-400 mt-1">
            Try adjusting your filters or click "Sync {selectedYear} Balances" to initialize entitlements.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {employeesBalances.map((emp) => (
              <div
                key={emp.employeeId}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Employee Profile | Employee Name | Employee Code */}
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="w-10 h-10 rounded-full shrink-0 border border-slate-200 dark:border-slate-700">
                        <AvatarImage src={emp.avatarUrl || ""} alt={emp.employeeName} />
                        <AvatarFallback className="bg-emerald-50 text-emerald-700 font-bold text-xs">
                          {String(emp.employeeName || "E")
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-tight truncate">
                          {emp.employeeName}
                        </h3>
                        <p className="text-xs text-slate-400 tabular-nums mt-0.5 uppercase truncate">
                          {emp.employeeCode}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Leave Breakdown Table: Scrollable Leave Type | Total | Used | Available */}
                  <div className="overflow-x-auto max-h-[265px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-10">
                        <TableRow className="bg-white dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-900 dark:bg-slate-900 border-t border-b border-slate-100 dark:border-slate-800">
                          <TableHead className="py-2.5 px-3.5 text-xs font-medium text-slate-600 dark:text-slate-400 text-left h-auto">
                            Leave Type
                          </TableHead>
                          <TableHead className="py-2.5 px-2 text-xs font-medium text-slate-600 dark:text-slate-400 text-center h-auto">
                            Total
                          </TableHead>
                          <TableHead className="py-2.5 px-2 text-xs font-medium text-[#e02424] text-center h-auto">
                            Used
                          </TableHead>
                          <TableHead className="py-2.5 px-2 text-xs font-medium text-[#00a76f] text-center h-auto">
                            Available
                          </TableHead>
                          <TableHead className="py-2.5 px-2 w-7 h-auto" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {emp.balances && emp.balances.length > 0 ? (
                          emp.balances.map((b: any) => (
                            <TableRow
                              key={b.leaveTypeId}
                              className="hover:bg-slate-50/60 dark:bg-slate-800/50 transition-colors border-b border-slate-100/80"
                            >
                              <TableCell className="py-2 px-3.5 text-xs text-slate-700 dark:text-slate-300 font-normal">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: b.color || "#3b82f6" }}
                                  />
                                  <span className="truncate">{b.leaveTypeName}</span>
                                </div>
                                {Number(b.pending || 0) > 0 && (
                                  <span className="text-[10px] text-amber-600 font-medium block pl-3.5">
                                    {formatLeaveDays(b.pending)}d pending
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="py-2 px-2 text-xs text-slate-700 dark:text-slate-300 text-center font-medium">
                                {formatLeaveDays(b.total)}
                              </TableCell>
                              <TableCell className="py-2 px-2 text-xs text-center font-medium text-[#e02424]">
                                {formatLeaveDays(b.used)}
                              </TableCell>
                              <TableCell className="py-2 px-2 text-xs text-center font-bold text-[#00a76f]">
                                {formatLeaveDays(b.available)}
                              </TableCell>
                              <TableCell className="py-2 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => setLedgerModalEmployee(emp)}
                                  className="text-slate-400 hover:text-[#00a76f] transition-colors cursor-pointer p-1"
                                  title={`View ${b.leaveTypeName} ledger & balance details`}
                                  aria-label={`View ${b.leaveTypeName} ledger for ${emp.employeeName}`}
                                >
                                  <Info className="w-3.5 h-3.5" />
                                </button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="py-5 text-center text-xs text-slate-400">
                              No active leave types configured yet.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Card Footer: Always accessible Ledger & Manual Adjustment actions */}
                <div className="px-3.5 py-2.5 bg-slate-50/70 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setLedgerModalEmployee(emp)}
                    className="h-8 px-2.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100"
                  >
                    <History className="w-3.5 h-3.5 mr-1.5 text-[#00a76f]" />
                    View Ledger
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openAdjustForEmployee(emp.employeeId)}
                    className="h-8 px-2.5 text-xs border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1 text-[#00a76f]" />
                    Credit / Debit
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Footer */}
          {totalEmployees > pageSize && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                Showing {(currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(totalEmployees, currentPage * pageSize)} of {totalEmployees} employees
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-8 text-xs"
                >
                  Previous
                </Button>
                <span className="px-2.5 py-1 rounded bg-[#00a76f] text-white font-bold text-xs">
                  {currentPage}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage * pageSize >= totalEmployees}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="h-8 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-30">
        <button
          type="button"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg hover:shadow-xl transition-all cursor-pointer"
          title={`Synchronize ${selectedYear} Balances`}
          aria-label={`Synchronize ${selectedYear} Balances`}
        >
          <Sparkles className="w-5 h-5 fill-current" />
        </button>
      </div>

      {/* 5. IMMUTABLE TRANSACTION LEDGER DIALOG */}
      <Dialog
        open={Boolean(ledgerModalEmployee)}
        onOpenChange={(open) => !open && setLedgerModalEmployee(null)}
      >
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <History className="w-4 h-4 text-[#00a76f]" />
              Immutable Leave Ledger — {ledgerModalEmployee?.employeeName} ({selectedYear})
            </DialogTitle>
            <DialogDescription className="text-xs">
              Audited chronological journal of annual accruals, manual credits/debits, leave deductions, and reversals.
            </DialogDescription>
          </DialogHeader>

          <div className="pt-2">
            {isLoadingLedger ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading ledger journal...</div>
            ) : ledgerEntries.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 border rounded-lg bg-slate-50/50 dark:bg-slate-800/40">
                No ledger transactions recorded for {selectedYear} yet. Click "Sync {selectedYear} Balances" or record a manual adjustment.
              </div>
            ) : (
              <div className="max-h-80 overflow-x-auto overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800/60 text-[11px]">
                      <TableHead className="py-2 px-3 whitespace-nowrap">Effective Date</TableHead>
                      <TableHead className="py-2 px-3 whitespace-nowrap">Operation</TableHead>
                      <TableHead className="py-2 px-3 whitespace-nowrap">Leave Type</TableHead>
                      <TableHead className="py-2 px-3 text-right whitespace-nowrap">Days</TableHead>
                      <TableHead className="py-2 px-3 text-right whitespace-nowrap">Balance</TableHead>
                      <TableHead className="py-2 px-3 whitespace-nowrap">Actor</TableHead>
                      <TableHead className="py-2 px-3">Reason / Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerEntries.map((entry: any) => {
                      const positive = isPositiveLedgerType(entry.entryType);
                      return (
                        <TableRow key={entry.id} className="text-xs border-b">
                          <TableCell className="py-2 px-3 text-slate-500 tabular-nums text-[11px] whitespace-nowrap">
                            {String(entry.effectiveAt || entry.createdAt || "").slice(0, 10)}
                          </TableCell>
                          <TableCell className="py-2 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                positive
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {entry.entryType}
                            </span>
                          </TableCell>
                          <TableCell className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {entry.leaveType?.name || "Leave"}
                          </TableCell>
                          <TableCell
                            className={`py-2 px-3 text-right font-bold whitespace-nowrap ${
                              positive ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {positive ? `+${formatLeaveDays(entry.days)}` : `-${formatLeaveDays(entry.days)}`}
                          </TableCell>
                          <TableCell className="py-2 px-3 text-right tabular-nums font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {formatLeaveDays(entry.balance)}
                          </TableCell>
                          <TableCell className="py-2 px-3 text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {entry.actorName || "HR / System"}
                          </TableCell>
                          <TableCell
                            className="py-2 px-3 text-slate-600 dark:text-slate-400 max-w-[200px] truncate"
                            title={entry.reason || entry.notes || ""}
                          >
                            {entry.reason || entry.notes || "System transaction"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => {
                const empId = ledgerModalEmployee?.employeeId || "";
                setLedgerModalEmployee(null);
                openAdjustForEmployee(empId);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Manual Adjustment
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLedgerModalEmployee(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. MANUAL CREDIT / DEBIT ADJUSTMENT DIALOG */}
      <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#00a76f]" />
              Manual Balance Adjustment ({selectedYear})
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record an audited CREDIT or DEBIT ledger entry. Negative resulting balances are blocked automatically.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdjustSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Employee *</Label>
              <Select
                value={adjustForm.employeeId}
                onValueChange={(val) => setAdjustForm({ ...adjustForm, employeeId: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {allEmployees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Leave Type *</Label>
              <Select
                value={adjustForm.leaveTypeId}
                onValueChange={(val) => setAdjustForm({ ...adjustForm, leaveTypeId: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select leave category" />
                </SelectTrigger>
                <SelectContent>
                  {activeLeaveTypes.map((lt: any) => (
                    <SelectItem key={lt.id} value={lt.id}>
                      {lt.name} ({formatLeaveDays(lt.daysPerYear)}d/yr)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Adjustment Operation *</Label>
                <Select
                  value={adjustForm.entryType}
                  onValueChange={(val: "CREDIT" | "DEBIT") =>
                    setAdjustForm({ ...adjustForm, entryType: val })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CREDIT">Credit (+ Add days)</SelectItem>
                    <SelectItem value="DEBIT">Debit (- Deduct days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Days *</Label>
                <Input
                  type="number"
                  min={0.5}
                  max={365}
                  step={0.5}
                  value={adjustForm.days}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setAdjustForm({ ...adjustForm, days: Number.isNaN(val) ? 0.5 : val });
                  }}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mandatory Reason / Audit Note *</Label>
              <Textarea
                rows={2}
                placeholder="State the business reason for this manual balance adjustment..."
                value={adjustForm.notes}
                onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                className="text-xs"
                required
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAdjustModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={adjustMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {adjustMutation.isPending ? "Recording..." : "Apply Adjustment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
