import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  CheckSquare,
  ArrowRight,
  UserCheck,
  LogIn,
  LogOut,
  Timer,
  AlertCircle,
  FileText,
  CalendarDays,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/")({
  component: EmployeeDashboardFoundation,
});

export function EmployeeDashboardFoundation() {
  const queryClient = useQueryClient();
  const [seconds, setSeconds] = useState(0);

  // 1. Fetch live attendance punch status
  const { data: punchStatus, refetch: refetchPunch } = useQuery({
    queryKey: ["me-attendance-status"],
    queryFn: async () => {
      const res = await api.get("/api/v1/me/attendance/status");
      return res.data;
    },
    refetchInterval: 15000,
  });

  // 2. Fetch leave balances
  const { data: leaveBalances = [] } = useQuery({
    queryKey: ["me-leave-balance"],
    queryFn: async () => {
      const res = await api.get("/api/v1/me/leave/balance");
      return res.data;
    },
  });

  // 3. Local clock timer
  useEffect(() => {
    if (punchStatus?.elapsedSeconds) {
      setSeconds(punchStatus.elapsedSeconds);
    }
  }, [punchStatus]);

  useEffect(() => {
    if (punchStatus?.isCheckedIn) {
      const interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [punchStatus?.isCheckedIn]);

  // 4. Punch In/Out Mutation
  const punchMutation = useMutation({
    mutationFn: async (type: "check_in" | "check_out") => {
      const res = await api.post("/api/v1/me/attendance/punch", { type });
      return res.data;
    },
    onSuccess: (data: any, vars) => {
      toast.success(vars === "check_in" ? "Clocked in successfully!" : "Clocked out successfully!");
      refetchPunch();
      queryClient.invalidateQueries({ queryKey: ["me-attendance-status"] });
      queryClient.invalidateQueries({ queryKey: ["me-attendance-records"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Punch failed");
    },
  });

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const totalLeaveAvailable = leaveBalances.reduce((acc: number, b: any) => acc + (b.available || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="My Workplace"
          description="Your personal self-service portal for attendance, leaves, shifts, and requests."
        />
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-6 gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 font-medium">
            <UserCheck className="h-3.5 w-3.5" />
            Self-Service Active
          </Badge>
        </div>
      </div>

      {/* Clock-In Banner / Widget */}
      <Card className="border-border/80 bg-gradient-to-r from-blue-50/50 via-background to-emerald-50/30 dark:from-blue-950/20 dark:to-emerald-950/10">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1.5 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Shift Schedule
                </span>
                <Badge variant="secondary" className="font-mono text-xs">
                  {punchStatus?.shift?.name || "General Shift"} ({punchStatus?.shift?.startTime} - {punchStatus?.shift?.endTime})
                </Badge>
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                {punchStatus?.isCheckedIn ? "You are currently clocked in" : "You are not clocked in"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {punchStatus?.isCheckedIn
                  ? `Clocked in at ${new Date(punchStatus.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : "Start your workday timer by clocking in below."}
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center font-mono">
                <div className="text-3xl font-extrabold tracking-tight text-primary">
                  {formatTimer(seconds)}
                </div>
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
                  Logged Time Today
                </span>
              </div>

              <div>
                {punchStatus?.isCheckedIn ? (
                  <Button
                    size="lg"
                    variant="destructive"
                    className="gap-2 font-semibold shadow-md"
                    onClick={() => punchMutation.mutate("check_out")}
                    disabled={punchMutation.isPending}
                  >
                    <LogOut className="w-5 h-5" />
                    Clock Out
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="gap-2 font-semibold bg-emerald-600 hover:bg-emerald-700 shadow-md"
                    onClick={() => punchMutation.mutate("check_in")}
                    disabled={punchMutation.isPending}
                  >
                    <LogIn className="w-5 h-5" />
                    Clock In
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Leave Balance"
          value={`${totalLeaveAvailable} days`}
          description="Available paid leave quota"
          icon={<Calendar className="h-5 w-5 text-primary" />}
        />
        <StatCard
          label="Today's Status"
          value={punchStatus?.status ? punchStatus.status.replace("_", " ").toUpperCase() : "NOT MARKED"}
          description="Attendance category"
          icon={<Clock className="h-5 w-5 text-emerald-500" />}
        />
        <StatCard
          label="Applicable Policy"
          value={punchStatus?.policy?.name || "Corporate Policy"}
          description={`Grace period: ${punchStatus?.policy?.graceMinutes || 15}m`}
          icon={<AlertCircle className="h-5 w-5 text-amber-500" />}
        />
        <StatCard
          label="Shift Definition"
          value={punchStatus?.shift?.name || "General Shift"}
          description={`${punchStatus?.shift?.startTime} - ${punchStatus?.shift?.endTime}`}
          icon={<Timer className="h-5 w-5 text-purple-500" />}
        />
      </div>

      {/* Quick Action Navigation Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/80 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Time & Attendance Self-Service
            </CardTitle>
            <CardDescription className="text-xs">
              Check attendance calendar, submit regularizations, and view upcoming shift rosters.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/40 transition-colors">
              <div>
                <p className="text-xs font-semibold">Attendance Log</p>
                <p className="text-[11px] text-muted-foreground">View daily in/out punches and monthly calendar</p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link to="/me/attendance/records" className="gap-1.5 text-xs">
                  View <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/40 transition-colors">
              <div>
                <p className="text-xs font-semibold">Punch Regularization</p>
                <p className="text-[11px] text-muted-foreground">Correct missing check-ins or biometric misses</p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link to="/me/attendance/regularizations" className="gap-1.5 text-xs">
                  Request <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/40 transition-colors">
              <div>
                <p className="text-xs font-semibold">My Shifts & Swaps</p>
                <p className="text-[11px] text-muted-foreground">Check monthly roster and request shift swaps</p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link to="/me/attendance/shifts" className="gap-1.5 text-xs">
                  Shifts <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-emerald-500" />
              Leaves & Absences
            </CardTitle>
            <CardDescription className="text-xs">
              Apply for leave with instant dry-run calculations, view quota ledgers, and team calendar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/40 transition-colors">
              <div>
                <p className="text-xs font-semibold">Apply for Leave</p>
                <p className="text-[11px] text-muted-foreground">Dry-run validation, sandwich rule check & submission</p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link to="/me/leave/applications" className="gap-1.5 text-xs">
                  Apply <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/40 transition-colors">
              <div>
                <p className="text-xs font-semibold">Leave Balance & Ledger</p>
                <p className="text-[11px] text-muted-foreground">Inspect immutable audit ledger of leave credits & debits</p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link to="/me/leave/balance" className="gap-1.5 text-xs">
                  Ledger <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/40 transition-colors">
              <div>
                <p className="text-xs font-semibold">Team Absence Calendar</p>
                <p className="text-[11px] text-muted-foreground">Check department colleagues on leave</p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link to="/me/leave/team-calendar" className="gap-1.5 text-xs">
                  Team <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
