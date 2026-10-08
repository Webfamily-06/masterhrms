import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Clock,
  CalendarDays,
  Fingerprint,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/attendance-employee")({
  beforeLoad: () => {
    throw redirect({ to: "/me/attendance/records" });
  },
  component: EmployeeAttendancePage,
  head: () => ({ meta: [{ title: "My Attendance Matrix — Master HRMS" }] }),
});

export function EmployeeAttendancePage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [statusFilter, setStatusFilter] = useState("all");
  const [isRegularizeModalOpen, setIsRegularizeModalOpen] = useState(false);

  // Regularization Form State
  const [regDate, setRegDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [regCheckIn, setRegCheckIn] = useState("09:00");
  const [regCheckOut, setRegCheckOut] = useState("18:00");
  const [regReason, setRegReason] = useState("");

  // Fetch current employee's monthly attendance
  const { data: attendanceResponse, isLoading } = useQuery({
    queryKey: ["my-monthly-attendance", profile?.id, selectedMonth, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("month", selectedMonth);
      if (statusFilter !== "all") params.append("status", statusFilter);
      return await api.get(`/attendance?${params.toString()}`);
    },
  });

  const attendanceRecords: any[] = attendanceResponse?.data || attendanceResponse?.records || (Array.isArray(attendanceResponse) ? attendanceResponse : []);

  // Today's record for quick punch status
  const todayISO = new Date().toISOString().split("T")[0];
  const todayRecord = attendanceRecords.find((r: any) => {
    try {
      return new Date(r.date).toISOString().split("T")[0] === todayISO;
    } catch {
      return false;
    }
  });

  const isCheckedIn = Boolean(todayRecord?.checkIn);
  const isCheckedOut = Boolean(todayRecord?.checkOut);

  // Fetch employee's regularization requests
  const { data: regularizationsRes } = useQuery({
    queryKey: ["my-regularizations"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/api/v1/me/regularizations");
        return Array.isArray(res?.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });
  const myRegularizations: any[] = regularizationsRes || [];

  // Quick Punch In/Out Mutation (Server authoritative timestamps)
  const punchMut = useMutation({
    mutationFn: async (type: "check_in" | "check_out") => {
      if (type === "check_in") {
        return await api.post("/api/v1/me/attendance/check-in");
      } else {
        return await api.post("/api/v1/me/attendance/check-out");
      }
    },
    onSuccess: (_, type) => {
      toast.success(type === "check_in" ? "Punched in successfully!" : "Punched out successfully!");
      qc.invalidateQueries({ queryKey: ["my-monthly-attendance"] });
      qc.invalidateQueries({ queryKey: ["my-today-punch"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Punch operation failed.");
    },
  });

  // Regularization Submission Mutation
  const regularizeMut = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/api/v1/me/regularizations", {
        attendanceDate: payload.date,
        proposedIn: payload.checkIn ? `${payload.date}T${payload.checkIn}:00` : undefined,
        proposedOut: payload.checkOut ? `${payload.date}T${payload.checkOut}:00` : undefined,
        reason: payload.reason,
      });
    },
    onSuccess: () => {
      toast.success("Attendance regularization submitted successfully!");
      qc.invalidateQueries({ queryKey: ["my-monthly-attendance"] });
      qc.invalidateQueries({ queryKey: ["my-regularizations"] });
      setIsRegularizeModalOpen(false);
      setRegReason("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit regularization.");
    },
  });

  // Withdraw Regularization Mutation
  const withdrawMut = useMutation({
    mutationFn: async (id: string) => {
      return await api.post(`/api/v1/me/regularizations/${id}/withdraw`);
    },
    onSuccess: () => {
      toast.success("Regularization request withdrawn.");
      qc.invalidateQueries({ queryKey: ["my-regularizations"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to withdraw request.");
    },
  });

  const handleRegularizeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regDate || !regCheckIn || !regCheckOut || !regReason) {
      toast.error("Please fill in all regularization fields.");
      return;
    }
    regularizeMut.mutate({
      date: regDate,
      checkIn: regCheckIn,
      checkOut: regCheckOut,
      reason: regReason,
    });
  };

  // Metrics calculation
  const totalHoursMonth = attendanceRecords.reduce((acc, r) => acc + Number(r.hours || 0), 0);
  const daysPresent = attendanceRecords.filter((r) => r.status === "present").length;
  const daysLate = attendanceRecords.filter((r) => r.status === "late").length;
  const daysHalfDay = attendanceRecords.filter((r) => r.status === "half_day").length;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* ── Page Header matching ui-2/attendance-employee.html ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/hr/dashboard" className="hover:text-foreground">Home</Link>
            <span>/</span>
            <Link to="/hr/attendance" className="hover:text-foreground">Attendance</Link>
            <span>/</span>
            <span className="text-foreground font-semibold">Employee Attendance Matrix</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarDays className="size-6 text-primary" />
            <span>Employee Attendance</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your monthly punch log, production hours, and attendance regularization requests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsRegularizeModalOpen(true)}
            className="gap-1.5 h-9 font-bold bg-primary text-primary-foreground shadow-xs"
          >
            <Plus className="size-4" />
            <span>Request Regularization</span>
          </Button>
        </div>
      </div>

      {/* ── Punch Card & Daily Stat Bar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Punch Widget matching ui-2/attendance-employee.html */}
        <Card className="lg:col-span-4 bg-gradient-to-br from-card to-muted/20 shadow-xs border">
          <CardContent className="p-6 text-center flex flex-col items-center justify-between h-full">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground">Today's Punch Status</span>
              <h3 className="text-xl font-bold text-foreground">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </h3>
            </div>

            {/* Circular Punch Visual */}
            <div className="relative my-6 size-32 rounded-full border-4 border-primary/20 flex flex-col items-center justify-center bg-primary/5">
              <Fingerprint className="size-10 text-primary mb-1" />
              <span className="text-xs font-bold text-foreground">
                {isCheckedOut
                  ? "Checked Out"
                  : isCheckedIn
                  ? "Active Today"
                  : "Not Punched"}
              </span>
              {isCheckedIn && (
                <span className="text-[10px] text-muted-foreground font-mono">
                  In: {new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>

            {/* Punch Action Buttons */}
            <div className="w-full space-y-2">
              {!isCheckedIn ? (
                <Button
                  onClick={() => punchMut.mutate("check_in")}
                  disabled={punchMut.isPending}
                  className="w-full h-10 font-bold bg-primary text-primary-foreground"
                >
                  <Fingerprint className="size-4 mr-2" />
                  Punch In Now
                </Button>
              ) : !isCheckedOut ? (
                <Button
                  onClick={() => punchMut.mutate("check_out")}
                  disabled={punchMut.isPending}
                  variant="outline"
                  className="w-full h-10 font-bold border-rose-500/30 text-rose-600 hover:bg-rose-50"
                >
                  <Clock className="size-4 mr-2" />
                  Punch Out (End Day)
                </Button>
              ) : (
                <div className="text-xs font-semibold text-emerald-600 flex items-center justify-center gap-1.5 py-2">
                  <CheckCircle2 className="size-4" /> Day Completed ({todayRecord.hours || 8} hrs)
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: Metrics Grid matching ui-2/attendance-employee.html */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <span className="text-xs text-muted-foreground font-semibold">Total Productive Hours</span>
              <div className="my-2">
                <h3 className="text-2xl font-bold text-blue-600">{totalHoursMonth.toFixed(1)} hrs</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Recorded in {selectedMonth}</p>
              </div>
              <div className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                <Clock className="size-3" /> Monthly Aggregated
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <span className="text-xs text-muted-foreground font-semibold">Days Present On-Time</span>
              <div className="my-2">
                <h3 className="text-2xl font-bold text-emerald-600">{daysPresent} Days</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Standard Shifts Fulfilled</p>
              </div>
              <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="size-3" /> Punctual Attendance
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <span className="text-xs text-muted-foreground font-semibold">Late In / Half Days</span>
              <div className="my-2">
                <h3 className="text-2xl font-bold text-amber-600">{daysLate + daysHalfDay} Days</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {daysLate} Late • {daysHalfDay} Half Day
                </p>
              </div>
              <div className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                <AlertCircle className="size-3" /> Regularization Eligible
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Monthly Attendance Matrix Table ── */}
      <Card className="shadow-xs">
        <CardHeader className="p-4 border-b bg-muted/20 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold">Monthly Punch Matrix</CardTitle>
            <CardDescription className="text-xs">
              Review daily punch logs, check-in, check-out timestamps, and working hours.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground">Month:</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-8 text-xs w-36 bg-background"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-32 bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="late">Late In</SelectItem>
                <SelectItem value="half_day">Half Day</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-bold">Date</TableHead>
                <TableHead className="text-xs font-bold">Check In</TableHead>
                <TableHead className="text-xs font-bold">Check Out</TableHead>
                <TableHead className="text-xs font-bold">Total Hours</TableHead>
                <TableHead className="text-xs font-bold">Status</TableHead>
                <TableHead className="text-xs font-bold">Notes / Verification</TableHead>
                <TableHead className="text-xs font-bold text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-xs text-muted-foreground">
                    Loading monthly attendance matrix...
                  </TableCell>
                </TableRow>
              ) : attendanceRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-xs text-muted-foreground italic">
                    No attendance records logged for {selectedMonth}.
                  </TableCell>
                </TableRow>
              ) : (
                attendanceRecords.map((r: any) => {
                  const d = new Date(r.date);
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;

                  return (
                    <TableRow key={r.id || r.date} className="hover:bg-muted/30 text-xs">
                      <TableCell className="font-mono font-bold text-foreground">
                        {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </TableCell>

                      <TableCell className="font-mono text-muted-foreground">
                        {r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </TableCell>

                      <TableCell className="font-mono text-muted-foreground">
                        {r.checkOut ? new Date(r.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </TableCell>

                      <TableCell className="font-mono font-bold text-foreground">
                        {r.hours ? `${Number(r.hours).toFixed(2)} hrs` : "—"}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold capitalize",
                            r.status === "present" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
                            r.status === "late" && "bg-amber-500/10 text-amber-600 border-amber-500/30",
                            r.status === "half_day" && "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
                            r.status === "absent" && "bg-rose-500/10 text-rose-600 border-rose-500/30"
                          )}
                        >
                          {r.status?.replace("_", " ") || "Present"}
                        </Badge>
                      </TableCell>

                      <TableCell className="max-w-[200px] truncate text-muted-foreground text-[11px]" title={r.notes}>
                        {r.notes || (isWeekend ? "Weekly Off" : "Standard Punch")}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setRegDate(d.toISOString().split("T")[0]);
                            setIsRegularizeModalOpen(true);
                          }}
                          className="h-6 text-[10px] font-bold text-primary hover:underline"
                        >
                          Regularize
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Regularization Requests Tracker ── */}
      {myRegularizations.length > 0 && (
        <Card className="shadow-xs">
          <CardHeader className="p-4 border-b bg-muted/20">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              <span>My Regularization Requests</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Review submission status, manager remarks, or withdraw pending regularization requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-bold">Attendance Date</TableHead>
                  <TableHead className="text-xs font-bold">Proposed Timing</TableHead>
                  <TableHead className="text-xs font-bold">Reason</TableHead>
                  <TableHead className="text-xs font-bold">Status</TableHead>
                  <TableHead className="text-xs font-bold">Reviewed By / Notes</TableHead>
                  <TableHead className="text-xs font-bold text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myRegularizations.map((reg: any) => {
                  const regD = new Date(reg.attendanceDate);
                  return (
                    <TableRow key={reg.id} className="hover:bg-muted/30 text-xs">
                      <TableCell className="font-mono font-bold">
                        {regD.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {reg.proposedIn ? new Date(reg.proposedIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                        {" → "}
                        {reg.proposedOut ? new Date(reg.proposedOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground" title={reg.reason}>
                        {reg.reason}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold uppercase",
                            reg.status === "APPROVED" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
                            reg.status === "PENDING" && "bg-amber-500/10 text-amber-600 border-amber-500/30",
                            reg.status === "REJECTED" && "bg-rose-500/10 text-rose-600 border-rose-500/30",
                            reg.status === "WITHDRAWN" && "bg-slate-500/10 text-slate-500 border-slate-500/30"
                          )}
                        >
                          {reg.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[11px]">
                        {reg.reviewComments || (reg.reviewedAt ? `Reviewed on ${new Date(reg.reviewedAt).toLocaleDateString()}` : "Awaiting Manager Review")}
                      </TableCell>
                      <TableCell className="text-right">
                        {reg.status === "PENDING" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={withdrawMut.isPending}
                            onClick={() => withdrawMut.mutate(reg.id)}
                            className="h-6 text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 hover:underline"
                          >
                            Withdraw
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── Dialog: Attendance Regularization Request ── */}
      <Dialog open={isRegularizeModalOpen} onOpenChange={setIsRegularizeModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Clock className="size-5 text-primary" />
              <span>Attendance Regularization Request</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Submit missed punch corrections or work-from-home timing adjustments for manager sign-off.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRegularizeSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Attendance Date</Label>
              <Input
                type="date"
                value={regDate}
                onChange={(e) => setRegDate(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Corrected Check In</Label>
                <Input
                  type="time"
                  value={regCheckIn}
                  onChange={(e) => setRegCheckIn(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Corrected Check Out</Label>
                <Input
                  type="time"
                  value={regCheckOut}
                  onChange={(e) => setRegCheckOut(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reason for Correction <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="e.g. Biometric reader was offline / Client site visit / Network issue during punch"
                value={regReason}
                onChange={(e) => setRegReason(e.target.value)}
                className="text-xs min-h-[64px]"
                required
              />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsRegularizeModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={regularizeMut.isPending}
                className="font-bold bg-primary text-primary-foreground"
              >
                {regularizeMut.isPending ? "Submitting..." : "Submit Correction"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
