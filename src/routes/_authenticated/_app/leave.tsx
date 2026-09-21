import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile, useSession, hasRole } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Check,
  X,
  CalendarCheck,
  Clock,
  UserX,
  Users,
  CalendarDays, LayoutGrid, List,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/leave")({
  component: Leave,
  head: () => ({ meta: [{ title: "Leave Management — Master HRMS" }] }),
});

function daysBetween(a: string, b: string, halfDay: boolean) {
  if (halfDay) return 0.5;
  const d1 = new Date(a),
    d2 = new Date(b);
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1);
}

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  cancelled: { label: "Cancelled", className: "bg-secondary text-muted-foreground" },
};

function Leave() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [halfDay, setHalfDay] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const isHR = hasRole(profile, "hr_admin") || hasRole(profile, "super_admin");
  const isManager = hasRole(profile, "manager");

  // My employee record
  const { data: myEmployee } = useQuery({
    queryKey: ["my-employee", user?.id],
    enabled: !!user,
    queryFn: async () => {
      try {
        const res = await api.get("/employees");
        return Array.isArray(res) ? res.find((e: any) => e.userId === user?.id || e.email === user?.email) : null;
      } catch {
        return null;
      }
    },
  });

  // Leave types
  const { data: rawLeaveTypes = [] } = useQuery({
    queryKey: ["leave-types"],
    queryFn: async () => {
      try {
        const res = await api.get("/leave/types");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const leaveTypes = rawLeaveTypes.map((lt: any) => ({
    ...lt,
    id: lt.id,
    name: lt.name,
    days_per_year: lt.daysPerYear ?? lt.days_per_year ?? 12,
    color: lt.color ?? "#3B82F6",
  }));

  // All leave requests
  const { data: rawRequests = [] } = useQuery({
    queryKey: ["leave-requests"],
    queryFn: async () => {
      try {
        const res = await api.get("/leave/requests");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const requests = rawRequests.map((r: any) => ({
    ...r,
    id: r.id,
    employee_id: r.employeeId ?? r.employee_id,
    leave_type_id: r.leaveTypeId ?? r.leave_type_id,
    start_date: r.startDate ? String(r.startDate).slice(0, 10) : r.start_date,
    end_date: r.endDate ? String(r.endDate).slice(0, 10) : r.end_date,
    days: r.days,
    status: r.status,
    reason: r.reason,
    employees: r.employee ? {
      first_name: r.employee.firstName ?? r.employee.first_name,
      last_name: r.employee.lastName ?? r.employee.last_name,
      employee_code: r.employee.employeeCode ?? r.employee.employee_code,
    } : null,
    leave_types: r.leaveType ? {
      name: r.leaveType.name,
      color: r.leaveType.color,
      days_per_year: r.leaveType.daysPerYear ?? r.leaveType.days_per_year,
    } : null,
  }));

  // Calculate leave balances for my employee
  const leaveBalances = leaveTypes.map((lt: any) => {
    const used = requests
      .filter(
        (r: any) =>
          r.employee_id === myEmployee?.id &&
          r.leave_type_id === lt.id &&
          r.status === "approved",
      )
      .reduce((s: number, r: any) => s + Number(r.days), 0);
    return {
      ...lt,
      used,
      remaining: Math.max(0, lt.days_per_year - used),
    };
  });

  // Who's out today
  const today = new Date().toISOString().slice(0, 10);
  const whoIsOutToday = requests.filter(
    (r: any) =>
      r.status === "approved" && r.start_date <= today && r.end_date >= today,
  );

  // Filtered requests
  const filtered = requests.filter(
    (r: any) => statusFilter === "all" || r.status === statusFilter,
  );

  // Submit leave request
  const createMut = useMutation({
    mutationFn: async (form: FormData) => {
      const start = String(form.get("start_date"));
      const end = String(form.get("end_date"));
      await api.post("/leave/requests", {
        employeeId: myEmployee?.id,
        leaveTypeId: String(form.get("leave_type_id")),
        startDate: start,
        endDate: halfDay ? start : end,
        reason: String(form.get("reason") || ""),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setOpen(false);
      setHalfDay(false);
      toast.success("Leave request submitted!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Approve
  const approveMut = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/leave/requests/${id}/status`, { status: "approved" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
      toast.success("Leave approved ✓");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Reject with reason
  const rejectMut = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await api.patch(`/leave/requests/${id}/status`, { status: "rejected", reason });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
      setRejectTarget(null);
      setRejectReason("");
      toast.success("Leave rejected.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <CalendarCheck className="size-6 text-primary" /> Leave Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Submit, track and approve leave requests with balance tracking.
          </p>
        </div>
        {myEmployee && (
          <Button onClick={() => setOpen(true)} className="gap-2 font-bold">
            <Plus className="size-4" /> Request Leave
          </Button>
        )}
      </div>

      {/* Leave Balance Cards — Sneat Pro Widget Grid */}
      {myEmployee && leaveBalances.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            My Leave Balances — {new Date().getFullYear()}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {leaveBalances.map((lb: any) => {
              const pct = Math.min(100, Math.round((lb.used / lb.days_per_year) * 100));
              return (
                <Card key={lb.id} className="border border-border/70 shadow-xs">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-3 rounded-full shrink-0"
                          style={{ backgroundColor: lb.color || "#7367F0" }}
                        />
                        <span className="text-xs font-bold truncate text-foreground">{lb.name}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {lb.used}/{lb.days_per_year} Used
                      </Badge>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-3xl font-bold tracking-tight text-foreground">{lb.remaining}</div>
                        <div className="text-[11px] text-muted-foreground font-medium">Days Remaining</div>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: lb.color || "#7367F0" }}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Who's Out Today — Sneat Pro Card */}
      {whoIsOutToday.length > 0 && (
        <Card className="border border-border/70 shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="size-8 rounded-lg bg-[oklch(0.73_0.16_75/0.10)] text-[oklch(0.73_0.16_75)] flex items-center justify-center shrink-0">
                <UserX className="size-4.5" />
              </div>
              <span className="font-bold text-sm text-foreground">Who's Out Today</span>
              <Badge variant="secondary" className="text-[10px] font-medium">{format(new Date(), "dd MMM yyyy")}</Badge>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {whoIsOutToday.map((r: any) => (
                <div key={r.id} className="flex items-center gap-2 bg-muted/40 border border-border/60 rounded-full px-3 py-1 text-xs">
                  <Avatar className="size-5.5">
                    <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                      {r.employees?.first_name?.[0]}{r.employees?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-semibold text-foreground">
                    {r.employees?.first_name} {r.employees?.last_name}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground text-[11px]">{r.leave_types?.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {["all", "pending", "approved", "rejected"].map((s) => {
          const count = s === "all" ? requests.length : requests.filter((r: any) => r.status === s).length;
          const isSelected = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                  : "border-border/70 text-muted-foreground hover:border-primary/40 hover:text-foreground bg-card"
              )}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
              <span className={cn("ml-1.5", isSelected ? "opacity-90" : "opacity-60")}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Requests Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/40">
                <TableHead className="text-xs">Employee</TableHead>
                <TableHead className="text-xs">Leave Type</TableHead>
                <TableHead className="text-xs">Duration</TableHead>
                <TableHead className="text-xs">Days</TableHead>
                <TableHead className="text-xs">Reason</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12 italic">
                    No leave requests found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r: any) => (
                  <TableRow key={r.id} className="hover:bg-secondary/20">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7">
                          <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                            {r.employees?.first_name?.[0]}{r.employees?.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-bold text-xs">
                            {r.employees?.first_name} {r.employees?.last_name}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {r.employees?.employee_code}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span
                          className="size-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: r.leave_types?.color || "#6366f1" }}
                        />
                        {r.leave_types?.name || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {r.start_date}
                      {r.start_date !== r.end_date && ` → ${r.end_date}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {r.days === 0.5 ? "½ day" : `${r.days}d`}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] text-xs text-muted-foreground truncate">
                      {r.reason || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={`font-bold text-[10px] border-0 ${STATUS_STYLE[r.status]?.className}`}>
                        {STATUS_STYLE[r.status]?.label ?? r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === "pending" && (isHR || isManager) && (
                        <div className="inline-flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                            onClick={() => approveMut.mutate(r.id)}
                            disabled={approveMut.isPending}
                            title="Approve"
                          >
                            <Check className="size-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => setRejectTarget({ id: r.id, name: `${r.employees?.first_name} ${r.employees?.last_name}` })}
                            title="Reject"
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ===================== MODAL: REQUEST LEAVE ===================== */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="size-5 text-primary" /> New Leave Request
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMut.mutate(new FormData(e.currentTarget));
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Leave Type *</Label>
              <Select name="leave_type_id" required>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select leave type..." />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ backgroundColor: t.color || "#6366f1" }} />
                        {t.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Half Day Option */}
            <div className="flex items-center gap-2 p-3 rounded-lg border bg-secondary/30">
              <Checkbox
                id="half-day"
                checked={halfDay}
                onCheckedChange={(v) => setHalfDay(!!v)}
              />
              <label htmlFor="half-day" className="text-xs font-semibold cursor-pointer">
                Half Day Leave
              </label>
              <span className="text-[10px] text-muted-foreground ml-auto">0.5 days deducted</span>
            </div>

            <div className={`grid gap-3 ${halfDay ? "" : "grid-cols-2"}`}>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{halfDay ? "Date" : "Start Date"} *</Label>
                <Input name="start_date" type="date" required className="text-xs" />
              </div>
              {!halfDay && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">End Date *</Label>
                  <Input name="end_date" type="date" required className="text-xs" />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reason</Label>
              <Textarea name="reason" rows={3} placeholder="Brief description of reason..." className="text-xs resize-none" />
            </div>

            {/* Balance Reminder */}
            {leaveBalances.length > 0 && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-400">
                <span className="font-bold">Available balances:</span>{" "}
                {leaveBalances.map((lb: any) => `${lb.name}: ${lb.remaining}d`).join(" · ")}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMut.isPending} className="font-bold">
                {createMut.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===================== MODAL: REJECT WITH REASON ===================== */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <X className="size-5" /> Reject Leave Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <p className="text-muted-foreground">
              You are rejecting the leave request from{" "}
              <strong className="text-foreground">{rejectTarget?.name}</strong>.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Rejection Reason *</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Please provide a reason for rejection..."
                className="text-xs resize-none"
              />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectMut.isPending}
              onClick={() => rejectMut.mutate({ id: rejectTarget!.id, reason: rejectReason })}
              className="font-bold"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
