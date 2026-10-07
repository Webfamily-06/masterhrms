import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CalendarCheck,
  Clock,
  Lock,
  Unlock,
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  ShieldAlert,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/hr/attendance/records")({
  component: HrAttendanceRecordsPage,
});

export default function HrAttendanceRecordsPage() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getUTCMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getUTCFullYear()));
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal States
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    employeeId: "",
    date: new Date().toISOString().slice(0, 10),
    checkIn: "09:30",
    checkOut: "18:30",
    status: "present",
    hours: 9,
    notes: "",
  });
  const [lockNotes, setLockNotes] = useState("");

  // 1. Fetch Month Lock Status
  const { data: lockStatus, refetch: refetchLock } = useQuery({
    queryKey: ["hr-attendance-lock", selectedYear, selectedMonth],
    queryFn: async () => {
      const res = await api.get<{ year: number; month: number; isLocked: boolean; lockedAt?: string; notes?: string }>(
        `/api/v1/hr/attendance/month-lock?year=${selectedYear}&month=${selectedMonth}`
      );
      return res;
    },
  });

  // 2. Fetch Attendance Records
  const { data: recordsData, isLoading, refetch } = useQuery({
    queryKey: ["hr-attendance-records", selectedYear, selectedMonth, statusFilter, searchTerm],
    queryFn: async () => {
      const res = await api.get<{ data: any[]; total: number }>(
        `/api/v1/hr/attendance/records?year=${selectedYear}&month=${selectedMonth}&status=${statusFilter}&search=${searchTerm}`
      );
      return res;
    },
  });

  // 3. Fetch Employees for adjustment select
  const { data: employeesData } = useQuery({
    queryKey: ["hr-employees-lookup"],
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>("/api/v1/hr/employees?limit=200");
      return res.data || [];
    },
  });

  // Mutation: Adjust Attendance
  const adjustMutation = useMutation({
    mutationFn: async (payload: typeof adjustForm) => {
      const inTime = payload.checkIn ? `${payload.date}T${payload.checkIn}:00.000Z` : null;
      const outTime = payload.checkOut ? `${payload.date}T${payload.checkOut}:00.000Z` : null;
      return api.post("/api/v1/hr/attendance/records", {
        ...payload,
        checkIn: inTime,
        checkOut: outTime,
      });
    },
    onSuccess: () => {
      toast.success("Attendance record adjusted successfully");
      setAdjustModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["hr-attendance-records"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to adjust attendance");
    },
  });

  // Mutation: Set Month Lock
  const lockMutation = useMutation({
    mutationFn: async (isLocked: boolean) => {
      return api.post("/api/v1/hr/attendance/month-lock", {
        year: Number(selectedYear),
        month: Number(selectedMonth),
        isLocked,
        notes: lockNotes,
      });
    },
    onSuccess: (data: any) => {
      toast.success(data.isLocked ? "Month locked successfully" : "Month unlocked successfully");
      setLockModalOpen(false);
      refetchLock();
      queryClient.invalidateQueries({ queryKey: ["hr-attendance-records"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update month lock");
    },
  });

  const records = recordsData?.data || [];
  const presentCount = records.filter((r) => r.status === "present").length;
  const lateCount = records.filter((r) => r.status === "late").length;
  const halfDayCount = records.filter((r) => r.status === "half_day").length;
  const leaveCount = records.filter((r) => r.status === "on_leave").length;

  return (
    <div className="space-y-6">
      {/* Header & Lock Indicator */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Attendance Records"
          description="Authoritative organization-wide attendance ledger, manual adjustments, and month lock."
        />
        <div className="flex items-center gap-2">
          {lockStatus?.isLocked ? (
            <Badge variant="destructive" className="h-8 gap-1.5 px-3 font-medium">
              <Lock className="h-3.5 w-3.5" />
              Locked: {selectedMonth}/{selectedYear}
            </Badge>
          ) : (
            <Badge variant="outline" className="h-8 gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 px-3 font-medium">
              <Unlock className="h-3.5 w-3.5" />
              Open: {selectedMonth}/{selectedYear}
            </Badge>
          )}

          <Button
            variant={lockStatus?.isLocked ? "outline" : "destructive"}
            size="sm"
            onClick={() => setLockModalOpen(true)}
            className="gap-2"
          >
            {lockStatus?.isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {lockStatus?.isLocked ? "Unlock Period" : "Lock Month"}
          </Button>

          <Button
            size="sm"
            disabled={lockStatus?.isLocked}
            onClick={() => setAdjustModalOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Manual Entry
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Present Records"
          value={presentCount}
          description="Punched in standard hours"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
        />
        <StatCard
          title="Late Arrivals"
          value={lateCount}
          description="Arrived past grace threshold"
          icon={<Clock className="h-5 w-5 text-amber-500" />}
        />
        <StatCard
          title="Half-Day Records"
          value={halfDayCount}
          description="Worked under threshold"
          icon={<AlertCircle className="h-5 w-5 text-purple-500" />}
        />
        <StatCard
          title="Approved Leaves"
          value={leaveCount}
          description="Linked from Leave approvals"
          icon={<CalendarCheck className="h-5 w-5 text-blue-500" />}
        />
      </div>

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employee name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Statuses</option>
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="half_day">Half Day</option>
                <option value="on_leave">On Leave</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1)}>
                    {new Date(0, i).toLocaleString("default", { month: "long" })}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>

              <Button variant="ghost" size="icon" onClick={() => refetch()} className="h-9 w-9">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardHeader className="px-6 py-4">
          <CardTitle className="text-base font-semibold">Attendance Ledger</CardTitle>
          <CardDescription>
            Showing records for period {selectedMonth}/{selectedYear}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-6 py-3">Employee</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Check-In</th>
                  <th className="px-6 py-3">Check-Out</th>
                  <th className="px-6 py-3">Hours</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Source & Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                      Loading attendance records...
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                      No attendance records found for this period.
                    </td>
                  </tr>
                ) : (
                  records.map((r: any) => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="px-6 py-3.5 font-medium">
                        <div>
                          <span>
                            {r.employee?.firstName} {r.employee?.lastName}
                          </span>
                          <span className="block text-xs text-muted-foreground font-mono">
                            {r.employee?.employeeCode} • {r.employee?.department?.name || "General"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-xs">
                        {new Date(r.date).toISOString().slice(0, 10)}
                      </td>
                      <td className="px-6 py-3.5 text-xs font-mono">
                        {r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--"}
                      </td>
                      <td className="px-6 py-3.5 text-xs font-mono">
                        {r.checkOut ? new Date(r.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--"}
                      </td>
                      <td className="px-6 py-3.5 text-xs font-mono font-medium">
                        {r.hours ? `${Number(r.hours).toFixed(2)}h` : "--"}
                      </td>
                      <td className="px-6 py-3.5">
                        <Badge
                          variant={
                            r.status === "present"
                              ? "default"
                              : r.status === "late"
                              ? "secondary"
                              : r.status === "half_day"
                              ? "outline"
                              : "destructive"
                          }
                          className="capitalize text-xs font-normal"
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-muted-foreground max-w-xs truncate">
                        <span className="font-semibold text-foreground/80 mr-1">[{r.source || "WEB"}]</span>
                        {r.notes || "--"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Manual Entry Modal */}
      <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manual Attendance Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Employee</label>
              <select
                value={adjustForm.employeeId}
                onChange={(e) => setAdjustForm({ ...adjustForm, employeeId: e.target.value })}
                className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select Employee...</option>
                {employeesData?.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Date</label>
                <Input
                  type="date"
                  value={adjustForm.date}
                  onChange={(e) => setAdjustForm({ ...adjustForm, date: e.target.value })}
                  className="mt-1 h-9"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <select
                  value={adjustForm.status}
                  onChange={(e) => setAdjustForm({ ...adjustForm, status: e.target.value })}
                  className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="half_day">Half Day</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Check-In</label>
                <Input
                  type="time"
                  value={adjustForm.checkIn}
                  onChange={(e) => setAdjustForm({ ...adjustForm, checkIn: e.target.value })}
                  className="mt-1 h-9"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Check-Out</label>
                <Input
                  type="time"
                  value={adjustForm.checkOut}
                  onChange={(e) => setAdjustForm({ ...adjustForm, checkOut: e.target.value })}
                  className="mt-1 h-9"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Hours Worked</label>
              <Input
                type="number"
                step="0.5"
                value={adjustForm.hours}
                onChange={(e) => setAdjustForm({ ...adjustForm, hours: Number(e.target.value) })}
                className="mt-1 h-9"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Reason / Audit Notes (Required)</label>
              <Input
                placeholder="e.g. Biometric sync missed punch, verified by manager"
                value={adjustForm.notes}
                onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                className="mt-1 h-9"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!adjustForm.employeeId || !adjustForm.notes || adjustMutation.isPending}
              onClick={() => adjustMutation.mutate(adjustForm)}
            >
              {adjustMutation.isPending ? "Saving..." : "Save Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lock/Unlock Modal */}
      <Dialog open={lockModalOpen} onOpenChange={setLockModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {lockStatus?.isLocked ? "Unlock Attendance Month" : "Lock Attendance Month"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <p className="text-muted-foreground">
              {lockStatus?.isLocked
                ? `Unlocking ${selectedMonth}/${selectedYear} will allow attendance punches, regularizations, and corrections to be recorded again.`
                : `Locking ${selectedMonth}/${selectedYear} will permanently prevent further check-ins, edits, and regularization approvals for this month to ensure payroll readiness.`}
            </p>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Audit Reason Notes</label>
              <Input
                placeholder="e.g. Finalized month before payroll processing run"
                value={lockNotes}
                onChange={(e) => setLockNotes(e.target.value)}
                className="mt-1 h-9"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLockModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={lockStatus?.isLocked ? "default" : "destructive"}
              disabled={lockMutation.isPending}
              onClick={() => lockMutation.mutate(!lockStatus?.isLocked)}
            >
              {lockMutation.isPending
                ? "Updating..."
                : lockStatus?.isLocked
                ? "Confirm Unlock"
                : "Confirm Month Lock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
