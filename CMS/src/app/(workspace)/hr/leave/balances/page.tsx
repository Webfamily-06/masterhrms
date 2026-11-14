'use client';

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapArray, unwrapData } from "@/lib/api";
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
} from "lucide-react";

export default function HrLeaveBalancesPage() {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState("all");
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [ledgerModalEmployee, setLedgerModalEmployee] = useState<any>(null);

  const [adjustForm, setAdjustForm] = useState({
    employeeId: "",
    leaveTypeId: "",
    entryType: "CREDIT",
    days: 1,
    notes: "",
  });

  // 1. Fetch Balances
  const { data: balanceResponse, isLoading, refetch } = useQuery({
    queryKey: ["hr-leave-balances", selectedYear, selectedEmployeeFilter, searchTerm],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/leave/balances", {
        params: {
          year: selectedYear,
          employeeId: selectedEmployeeFilter,
          search: searchTerm,
        },
      });
      return res;
    },
  });

  const employeesBalances: any[] = Array.isArray(balanceResponse?.data)
    ? balanceResponse.data
    : Array.isArray(balanceResponse)
    ? balanceResponse
    : [];
  const activeLeaveTypes: any[] = Array.isArray(balanceResponse?.leaveTypes)
    ? balanceResponse.leaveTypes
    : [];

  // 2. Fetch Active Employees for dropdown
  const { data: allEmployees = [] } = useQuery({
    queryKey: ["hr-all-employees-list"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/employees", { params: { status: "active", limit: 100 } }).catch(async () => {
        return await api.get("/api/employees", { params: { status: "active", limit: 100 } });
      });
      return unwrapArray(res);
    },
    staleTime: 60_000,
  });

  // 3. Fetch Ledger Entries for selected modal employee
  const { data: ledgerEntries = [], isLoading: isLoadingLedger } = useQuery({
    queryKey: ["hr-employee-ledger", ledgerModalEmployee?.employeeId],
    queryFn: async () => {
      if (!ledgerModalEmployee?.employeeId) return [];
      const res = await api.get(`/api/v1/hr/leave/balances/${ledgerModalEmployee.employeeId}/ledger`);
      return unwrapArray(res);
    },
    enabled: !!ledgerModalEmployee?.employeeId,
  });

  // 4. Sync Balances Mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/api/v1/hr/leave/balances/sync");
      return res;
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || "Leave balances synchronized successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-leave-balances"] });
    },
    onError: (err: any) => toast.error(err?.message || err?.response?.data?.error || "Failed to synchronize balances"),
  });

  // 5. Manual Adjustment Mutation
  const adjustMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/api/v1/hr/leave/balances/adjust", payload);
      return res;
    },
    onSuccess: () => {
      toast.success("Leave balance adjusted and immutable ledger transaction recorded");
      queryClient.invalidateQueries({ queryKey: ["hr-leave-balances"] });
      queryClient.invalidateQueries({ queryKey: ["hr-employee-ledger"] });
      setAdjustModalOpen(false);
      setAdjustForm({ employeeId: "", leaveTypeId: "", entryType: "CREDIT", days: 1, notes: "" });
    },
    onError: (err: any) => toast.error(err?.message || err?.response?.data?.error || "Failed to adjust balance"),
  });

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustForm.employeeId || !adjustForm.leaveTypeId || !adjustForm.notes.trim()) {
      toast.error("Please fill in all adjustment fields including mandatory notes");
      return;
    }
    adjustMutation.mutate(adjustForm);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Header with Title & Description (Reference Screenshot 2) */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Leave Balances</h1>
        <p className="text-xs text-slate-500 mt-0.5">View and manage leave balances.</p>
      </div>

      {/* 2. Notice Banner (Reference Screenshot 2) */}
      {!bannerDismissed && (
        <div className="bg-[#fff9e6] border border-[#fde68a] text-[#b45309] rounded-xl p-3.5 shadow-xs flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#b45309] shrink-0" />
            <span>
              <span className="font-semibold">Note:</span> If you add a new Employee, Leave Type, or Leave Policy, you must click the{" "}
              <button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="font-bold underline hover:text-[#92400e] cursor-pointer"
              >
                Sync Balances or Re-sync
              </button>{" "}
              button to apply the changes for the current year.
            </span>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            className="text-[#b45309]/70 hover:text-[#b45309] transition-colors p-1"
            title="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Filter Toolbar Card (Reference Screenshot 2) */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs border-slate-200 rounded-lg bg-white"
              />
            </div>

            {/* Employee Dropdown */}
            <Select value={selectedEmployeeFilter} onValueChange={setSelectedEmployeeFilter}>
              <SelectTrigger className="w-full sm:w-48 h-9 text-xs border-slate-200 rounded-lg bg-white text-slate-700 font-medium">
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {allEmployees.map((emp: any) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Year Dropdown */}
            <Select
              value={String(selectedYear)}
              onValueChange={(val) => setSelectedYear(parseInt(val, 10))}
            >
              <SelectTrigger className="w-32 h-9 text-xs border-slate-200 rounded-lg bg-white text-slate-700 font-medium">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032].map((yr) => (
                  <SelectItem key={yr} value={String(yr)}>
                    {yr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Right: Filters Action Button */}
          <button
            onClick={() => refetch()}
            className="h-9 px-3.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors self-end sm:self-auto"
          >
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            Filters
          </button>
        </div>

        {/* Row 2: Active Filter Badge */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs text-slate-700 font-medium">
            Year: {selectedYear}
          </span>
        </div>
      </div>

      {/* 4. Employee Balance Cards Grid (Reference Screenshot 2) */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-[#00a76f]" />
          <span className="text-xs font-medium">Loading employee leave balances...</span>
        </div>
      ) : employeesBalances.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-xl p-12 text-center text-slate-400 shadow-xs">
          <p className="font-semibold text-sm text-slate-700">No Employee Balances Found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or click Sync Balances to initialize.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employeesBalances.map((emp) => (
            <div
              key={emp.employeeId}
              className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Card Header: Avatar, Name, and Employee Code */}
              <div className="p-4 flex items-center gap-3">
                <Avatar className="w-10 h-10 rounded-full shrink-0 border border-slate-200">
                  <AvatarImage src={emp.avatarUrl || ""} alt={emp.employeeName} />
                  <AvatarFallback className="bg-emerald-50 text-emerald-700 font-bold text-xs">
                    {emp.employeeName
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <h3 className="font-semibold text-sm text-slate-900 leading-tight truncate">
                    {emp.employeeName}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5 uppercase">
                    {emp.employeeCode}
                  </p>
                </div>
              </div>

              {/* Leave Breakdown Table (Reference Screenshot 2) */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white hover:bg-white border-t border-b border-slate-100">
                      <TableHead className="py-2.5 px-3.5 text-xs font-medium text-slate-600 text-left h-auto">
                        Leave Type
                      </TableHead>
                      <TableHead className="py-2.5 px-2 text-xs font-medium text-slate-600 text-center h-auto">
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
                      emp.balances.map((b: any) => {
                        const total = Math.round(b.total || 0);
                        const used = Math.round(b.used || 0);
                        const available = Math.round(b.available || 0);

                        return (
                          <TableRow
                            key={b.leaveTypeId}
                            className="hover:bg-slate-50/60 transition-colors border-b border-slate-100/80"
                          >
                            <TableCell className="py-2 px-3.5 text-xs text-slate-700 font-normal">
                              {b.leaveTypeName}
                            </TableCell>
                            <TableCell className="py-2 px-2 text-xs text-slate-700 text-center font-medium">
                              {total}
                            </TableCell>
                            <TableCell className="py-2 px-2 text-xs text-center font-medium text-[#e02424]">
                              {used}
                            </TableCell>
                            <TableCell className="py-2 px-2 text-xs text-center font-bold text-[#00a76f]">
                              {available}
                            </TableCell>
                            <TableCell className="py-2 px-2 text-center">
                              <button
                                onClick={() => setLedgerModalEmployee(emp)}
                                className="text-slate-300 hover:text-slate-600 transition-colors cursor-pointer"
                                title="View Ledger Details"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="py-4 text-center text-xs text-slate-400">
                          No balance records for this year.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Sparkle Button */}
      <div className="fixed bottom-6 right-6 z-30">
        <button
          onClick={() => syncMutation.mutate()}
          className="w-12 h-12 rounded-full bg-[#00a76f] hover:bg-[#008f5d] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          title="Synchronize Balances"
        >
          <Sparkles className="w-5 h-5 fill-current" />
        </button>
      </div>

      {/* 5. TRANSACTION LEDGER DIALOG */}
      <Dialog open={!!ledgerModalEmployee} onOpenChange={() => setLedgerModalEmployee(null)}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <History className="w-4 h-4 text-[#00a76f]" />
              Immutable Leave Ledger — {ledgerModalEmployee?.employeeName}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete historical transaction journal recording all accruals, usage debits, and adjustments.
            </DialogDescription>
          </DialogHeader>

          <div className="pt-2">
            {isLoadingLedger ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading ledger journal...</div>
            ) : ledgerEntries.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">No ledger transactions found.</div>
            ) : (
              <div className="max-h-72 overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 text-[11px]">
                      <TableHead className="py-2 px-3">Date</TableHead>
                      <TableHead className="py-2 px-3">Type</TableHead>
                      <TableHead className="py-2 px-3">Leave Type</TableHead>
                      <TableHead className="py-2 px-3 text-right">Days</TableHead>
                      <TableHead className="py-2 px-3">Reason / Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerEntries.map((entry: any) => (
                      <TableRow key={entry.id} className="text-xs border-b">
                        <TableCell className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                          {entry.createdAt?.slice(0, 10)}
                        </TableCell>
                        <TableCell className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              entry.entryType === "CREDIT"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {entry.entryType}
                          </span>
                        </TableCell>
                        <TableCell className="py-2 px-3 font-medium text-slate-800">
                          {entry.leaveType?.name || "Standard Leave"}
                        </TableCell>
                        <TableCell
                          className={`py-2 px-3 text-right font-bold ${
                            entry.entryType === "CREDIT" ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {entry.entryType === "CREDIT" ? `+${entry.days}` : `-${entry.days}`}
                        </TableCell>
                        <TableCell className="py-2 px-3 text-slate-600 truncate max-w-[180px]">
                          {entry.reason || entry.referenceId || "System adjustment"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              size="sm"
              className="bg-[#00a76f] hover:bg-[#008f5d] text-white"
              onClick={() => {
                setAdjustForm((prev) => ({
                  ...prev,
                  employeeId: ledgerModalEmployee?.employeeId || "",
                }));
                setLedgerModalEmployee(null);
                setAdjustModalOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Manual Adjustment
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setLedgerModalEmployee(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. MANUAL ADJUSTMENT DIALOG */}
      <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#00a76f]" />
              Manual Balance Adjustment
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record a compliant audit ledger credit or debit adjustment.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdjustSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Employee *</Label>
              <Select
                value={adjustForm.employeeId}
                onValueChange={(val) => setAdjustForm({ ...adjustForm, employeeId: val })}
                required
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
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
                required
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select leave category" />
                </SelectTrigger>
                <SelectContent>
                  {activeLeaveTypes.map((lt: any) => (
                    <SelectItem key={lt.id} value={lt.id}>
                      {lt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Adjustment Type *</Label>
                <Select
                  value={adjustForm.entryType}
                  onValueChange={(val) => setAdjustForm({ ...adjustForm, entryType: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CREDIT">Credit (Add days)</SelectItem>
                    <SelectItem value="DEBIT">Debit (Deduct days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Days *</Label>
                <Input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={adjustForm.days}
                  onChange={(e) => setAdjustForm({ ...adjustForm, days: parseFloat(e.target.value) || 1 })}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reason / Audit Note *</Label>
              <Textarea
                rows={2}
                placeholder="Reason for manual adjustment..."
                value={adjustForm.notes}
                onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                className="text-xs"
                required
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAdjustModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={adjustMutation.isPending}
                className="bg-[#00a76f] hover:bg-[#008f5d] text-white"
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
