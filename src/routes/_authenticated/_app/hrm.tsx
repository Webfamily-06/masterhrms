import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Clock,
  CalendarCheck,
  Wallet,
  ArrowRight,
  UserPlus,
  AlertTriangle,
  Receipt,
  FileText,
  FolderLock,
  CalendarDays,
  Sparkles,
  Layers,
  Megaphone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  Building,
  ShieldCheck,
  ChevronRight,
  Plus,
  Inbox,
  RefreshCw,
} from "lucide-react";
import { PlanGuard } from "@/components/plan-guard";
import { formatSystemAmount } from "@/lib/currency";
import { useSession, useCurrentProfile } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/_app/hrm")({
  component: HrmHubPage,
  head: () => ({ meta: [{ title: "HRM Hub — Master ERP Operations Control Center" }] }),
});

export function HrmHubPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);

  // Platform currency & regional config from MySQL
  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      try {
        const page = await api.get("/cms/pages/system-platform-settings");
        return (page?.content as any) || null;
      } catch {
        return null;
      }
    },
  });

  // Fetch 100% LIVE REALTIME operational stats from backend MySQL DB
  const {
    data: stats,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["hrm-live-db-stats"],
    queryFn: async () => {
      const res = await api.get("/dashboard/hrm-hub");
      return res;
    },
    refetchInterval: 30000, // Auto-refresh every 30s for live operations
  });

  const totalEmployees = stats?.totalEmployees ?? 0;
  const newEmployeesThisMonth = stats?.newEmployeesThisMonth ?? 0;
  const presentToday = stats?.presentToday ?? 0;
  const lateToday = stats?.lateToday ?? 0;
  const absentToday = stats?.absentToday ?? 0;
  const onLeaveToday = stats?.onLeaveToday ?? 0;
  const pendingLeaves = stats?.pendingLeaves ?? 0;
  const pendingExpenses = stats?.pendingExpenses ?? 0;
  const pendingAttendance = stats?.pendingAttendance ?? 0;
  const pendingDocs = stats?.pendingDocs ?? 0;
  const totalPending = stats?.totalPendingApprovals ?? 0;

  const payrollEmployees = stats?.payrollEmployees ?? 0;
  const grossPayroll = stats?.grossPayroll ?? 0;
  const netPayroll = stats?.netPayroll ?? 0;
  const payrollStatus = stats?.payrollStatus ?? "No Run";

  const activities = stats?.activities ?? [];

  const totalActiveStaff = totalEmployees > 0 ? totalEmployees : 1;
  const presentPercentage = totalEmployees > 0 ? Math.round((presentToday / totalActiveStaff) * 100) : 0;

  const currentMonthYear = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  // Dynamic Real-Time Alerts based purely on live DB records
  const dynamicAlerts = [];
  if (pendingLeaves > 0) {
    dynamicAlerts.push({
      id: "leave-alert",
      text: `${pendingLeaves} leave request(s) awaiting approval in the system`,
      actionLabel: "Review Leaves",
      url: "/leave",
      variant: "warning",
    });
  }
  if (pendingExpenses > 0) {
    dynamicAlerts.push({
      id: "exp-alert",
      text: `${pendingExpenses} expense claim(s) submitted for verification`,
      actionLabel: "Review Expenses",
      url: "/expenses",
      variant: "warning",
    });
  }
  if (payrollStatus === "DRAFT" || payrollStatus === "No Run") {
    dynamicAlerts.push({
      id: "payroll-alert",
      text: `Monthly payroll status: ${payrollStatus} for ${currentMonthYear}`,
      actionLabel: "Open Payroll",
      url: "/payroll",
      variant: "info",
    });
  }
  if (totalEmployees === 0) {
    dynamicAlerts.push({
      id: "emp-alert",
      text: "No active employees found in this workspace. Add your first employee to begin.",
      actionLabel: "Add Employee",
      url: "/employees",
      variant: "info",
    });
  }

  return (
    <PlanGuard moduleName="HRM Suite Hub" requiredPlan="starter">
      <div className="space-y-5 max-w-full pb-8">
        {/* ─── 1. COMPACT HEADER WITH LIVE STATUS ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                <Users className="size-4.5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">HRM Hub</h1>
              <Badge variant="outline" className="text-[10px] font-mono font-medium px-2 py-0 border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
                ● Live Database
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real-time workforce metrics and today's live HR operations.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              disabled={isRefetching || isLoading}
              className="gap-1.5 text-xs font-semibold h-8 shadow-2xs"
              title="Sync Realtime Database"
            >
              <RefreshCw className={`size-3.5 ${isRefetching ? "animate-spin text-primary" : ""}`} />
              <span className="hidden sm:inline">Sync DB</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate({ to: "/attendance" })}
              className="gap-1.5 text-xs font-semibold h-8 shadow-2xs"
            >
              <Clock className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Mark Attendance</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate({ to: "/payroll" })}
              className="gap-1.5 text-xs font-semibold h-8 shadow-2xs"
            >
              <Wallet className="size-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Run Payroll</span>
            </Button>
            <Button
              size="sm"
              onClick={() => navigate({ to: "/employees" })}
              className="gap-1.5 text-xs font-semibold h-8 shadow-2xs"
            >
              <Plus className="size-3.5" />
              <span>Add Employee</span>
            </Button>
          </div>
        </div>

        {/* ─── 2. COMPACT 4-COLUMN KPI ROW (100% REAL DB DATA) ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Total Employees */}
          <Card className="p-4 border shadow-2xs bg-card hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Employees
              </span>
              <div className="size-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 grid place-items-center">
                <Users className="size-3.5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black tracking-tight text-foreground">
                {totalEmployees}
              </span>
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                <TrendingUp className="size-3" /> +{newEmployeesThisMonth} this month
              </span>
            </div>
          </Card>

          {/* Present Today */}
          <Card className="p-4 border shadow-2xs bg-card hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Present Today
              </span>
              <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center">
                <Clock className="size-3.5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black tracking-tight text-foreground">
                {presentToday}
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground">
                {presentPercentage}% attendance
              </span>
            </div>
          </Card>

          {/* On Leave */}
          <Card className="p-4 border shadow-2xs bg-card hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                On Leave
              </span>
              <div className="size-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 grid place-items-center">
                <CalendarCheck className="size-3.5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black tracking-tight text-foreground">
                {onLeaveToday}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">
                Today
              </span>
            </div>
          </Card>

          {/* Pending Approvals */}
          <Card className="p-4 border shadow-2xs bg-card hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Pending Approvals
              </span>
              <div className="size-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 grid place-items-center">
                <AlertCircle className="size-3.5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black tracking-tight text-foreground">
                {totalPending}
              </span>
              <span className={`text-[11px] font-semibold ${totalPending > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}`}>
                {totalPending > 0 ? "Requires action" : "All cleared"}
              </span>
            </div>
          </Card>
        </div>

        {/* ─── 3. MAIN OPERATIONAL 2-COLUMN SECTION (100% REAL DB DATA) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Attendance Today */}
          <Card className="p-4 border shadow-2xs bg-card flex flex-col justify-between space-y-3.5">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2.5">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-primary" />
                  <h3 className="font-bold text-sm text-foreground">Attendance Today</h3>
                </div>
                <Badge variant="outline" className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5">
                  MySQL Real-Time
                </Badge>
              </div>

              {/* Attendance Breakdown Grid */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-0.5">
                  <span className="text-[11px] font-semibold text-muted-foreground block">Present</span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {presentToday}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-0.5">
                  <span className="text-[11px] font-semibold text-muted-foreground block">Late</span>
                  <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {lateToday}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-0.5">
                  <span className="text-[11px] font-semibold text-muted-foreground block">Absent</span>
                  <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                    {absentToday}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-0.5">
                  <span className="text-[11px] font-semibold text-muted-foreground block">On Leave</span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {onLeaveToday}
                  </span>
                </div>
              </div>

              {/* Segmented Progress Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
                  <div style={{ width: `${totalEmployees > 0 ? (presentToday / totalEmployees) * 100 : 0}%` }} className="bg-emerald-500" title={`Present: ${presentToday}`} />
                  <div style={{ width: `${totalEmployees > 0 ? (lateToday / totalEmployees) * 100 : 0}%` }} className="bg-amber-500" title={`Late: ${lateToday}`} />
                  <div style={{ width: `${totalEmployees > 0 ? (absentToday / totalEmployees) * 100 : 0}%` }} className="bg-rose-500" title={`Absent: ${absentToday}`} />
                  <div style={{ width: `${totalEmployees > 0 ? (onLeaveToday / totalEmployees) * 100 : 0}%` }} className="bg-blue-500" title={`On Leave: ${onLeaveToday}`} />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>{presentPercentage}% Attendance Rate</span>
                  <span>{totalEmployees} Total Staff</span>
                </div>
              </div>

              {/* Today's Live Clock-in Roster */}
              {stats?.todayRoster && stats.todayRoster.length > 0 && (
                <div className="space-y-1 pt-2 border-t">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Live Clock-In Stream Today
                  </span>
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {stats.todayRoster.slice(0, 4).map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-muted/20 border">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground">{r.name}</span>
                          <span className="text-muted-foreground font-mono text-[9px]">#{r.employeeCode}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-emerald-600 font-bold">
                            {r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                          </span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/30 text-emerald-600 bg-emerald-500/5 font-bold">
                            PUNCH IN
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t flex justify-end">
              <Link
                to="/attendance"
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                View Full Attendance Sheet <ArrowRight className="size-3" />
              </Link>
            </div>
          </Card>

          {/* Right: Pending Approvals */}
          <Card className="p-4 border shadow-2xs bg-card flex flex-col justify-between space-y-3.5">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between border-b pb-2.5">
                <div className="flex items-center gap-2">
                  <AlertCircle className="size-4 text-rose-500" />
                  <h3 className="font-bold text-sm text-foreground">Pending Approvals</h3>
                </div>
                <Badge variant="secondary" className="text-[10px] font-mono font-bold">
                  {totalPending} Actionable
                </Badge>
              </div>

              {/* Clickable Real Approval Rows */}
              <div className="space-y-1.5">
                <Link
                  to="/leave"
                  className="flex items-center justify-between p-2 rounded-xl border bg-muted/20 hover:bg-muted/60 transition-colors text-xs group"
                >
                  <span className="flex items-center gap-2 text-foreground font-medium">
                    <CalendarCheck className="size-3.5 text-amber-500" />
                    <span>Leave Requests</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className={`text-[10px] font-mono h-4.5 px-1.5 ${pendingLeaves > 0 ? "border-amber-500/30 text-amber-600 bg-amber-500/10" : "text-muted-foreground"}`}>
                      {pendingLeaves}
                    </Badge>
                    <ChevronRight className="size-3 text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>

                <Link
                  to="/expenses"
                  className="flex items-center justify-between p-2 rounded-xl border bg-muted/20 hover:bg-muted/60 transition-colors text-xs group"
                >
                  <span className="flex items-center gap-2 text-foreground font-medium">
                    <Receipt className="size-3.5 text-rose-500" />
                    <span>Expense Claims</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className={`text-[10px] font-mono h-4.5 px-1.5 ${pendingExpenses > 0 ? "border-rose-500/30 text-rose-600 bg-rose-500/10" : "text-muted-foreground"}`}>
                      {pendingExpenses}
                    </Badge>
                    <ChevronRight className="size-3 text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>

                <Link
                  to="/attendance"
                  className="flex items-center justify-between p-2 rounded-xl border bg-muted/20 hover:bg-muted/60 transition-colors text-xs group"
                >
                  <span className="flex items-center gap-2 text-foreground font-medium">
                    <Clock className="size-3.5 text-blue-500" />
                    <span>Attendance Corrections</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] font-mono h-4.5 px-1.5 text-muted-foreground">
                      {pendingAttendance}
                    </Badge>
                    <ChevronRight className="size-3 text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>

                <Link
                  to="/documents"
                  className="flex items-center justify-between p-2 rounded-xl border bg-muted/20 hover:bg-muted/60 transition-colors text-xs group"
                >
                  <span className="flex items-center gap-2 text-foreground font-medium">
                    <FolderLock className="size-3.5 text-indigo-500" />
                    <span>Document Sign-Offs</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] font-mono h-4.5 px-1.5 text-muted-foreground">
                      {pendingDocs}
                    </Badge>
                    <ChevronRight className="size-3 text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              </div>
            </div>

            <div className="pt-2 border-t flex justify-end">
              <Link
                to="/leave"
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                View All Approvals <ArrowRight className="size-3" />
              </Link>
            </div>
          </Card>
        </div>

        {/* ─── 4. PAYROLL & ALERTS 2-COLUMN SECTION (100% REAL DB DATA) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Payroll Status Card */}
          <Card className="p-4 border shadow-2xs bg-card flex flex-col justify-between space-y-3.5 min-w-0 overflow-hidden">
            <div className="space-y-3 min-w-0">
              <div className="flex items-center justify-between border-b pb-2.5 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Wallet className="size-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <h3 className="font-bold text-sm text-foreground truncate">
                    Payroll — {currentMonthYear}
                  </h3>
                </div>
                <Badge
                  className={`text-[10px] font-semibold shrink-0 ${
                    payrollStatus === "PAID"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300"
                      : payrollStatus === "APPROVED"
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300"
                  }`}
                >
                  {payrollStatus}
                </Badge>
              </div>

              {/* 2x2 Spacious Key-Value Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs min-w-0">
                {/* Staff Included */}
                <div className="p-2.5 rounded-xl border bg-muted/20 space-y-1 min-w-0 overflow-hidden">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block truncate">
                    Staff Included
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-foreground block truncate">
                    {payrollEmployees} Staff
                  </span>
                </div>

                {/* Status */}
                <div className="p-2.5 rounded-xl border bg-muted/20 space-y-1 min-w-0 overflow-hidden">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block truncate">
                    Payroll Status
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-foreground block truncate">
                    {payrollStatus}
                  </span>
                </div>

                {/* Gross Payroll */}
                <div className="p-2.5 rounded-xl border bg-muted/20 space-y-1 min-w-0 overflow-hidden">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block truncate">
                    Gross Payroll
                  </span>
                  <span
                    className="text-xs sm:text-sm font-bold text-foreground block truncate font-mono"
                    title={formatSystemAmount(grossPayroll, sysConfig)}
                  >
                    {formatSystemAmount(grossPayroll, sysConfig)}
                  </span>
                </div>

                {/* Net Payroll */}
                <div className="p-2.5 rounded-xl border bg-muted/20 space-y-1 min-w-0 overflow-hidden">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block truncate">
                    Net Payroll
                  </span>
                  <span
                    className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 block truncate font-mono"
                    title={formatSystemAmount(netPayroll, sysConfig)}
                  >
                    {formatSystemAmount(netPayroll, sysConfig)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2.5 border-t flex justify-end">
              <Link
                to="/payroll"
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5 shrink-0"
              >
                <span>Open Payroll</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </Card>

          {/* Alerts & Reminders */}
          <Card className="p-4 border shadow-2xs bg-card flex flex-col justify-between space-y-3 min-w-0 overflow-hidden">
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b pb-2.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-amber-500" />
                  <h3 className="font-bold text-sm text-foreground">Alerts & Reminders</h3>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {dynamicAlerts.length} Notices
                </Badge>
              </div>

              <div className="space-y-1.5">
                {dynamicAlerts.length > 0 ? (
                  dynamicAlerts.map((alt) => (
                    <div
                      key={alt.id}
                      className="flex items-center justify-between p-2 rounded-xl border bg-muted/20 text-xs gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-amber-500 font-bold shrink-0">⚠️</span>
                        <span className="text-muted-foreground truncate">{alt.text}</span>
                      </div>
                      <Link
                        to={alt.url}
                        className="text-[11px] font-bold text-primary hover:underline shrink-0 whitespace-nowrap"
                      >
                        {alt.actionLabel} →
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    ✨ All HR operations are clear! No pending alerts or overdue actions.
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* ─── 5. QUICK ACTIONS SECTION ─── */}
        <Card className="p-3.5 border shadow-2xs bg-card">
          <div className="flex items-center justify-between border-b pb-2 mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Quick Operations
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: "/employees" })}
              className="h-9 text-xs justify-start gap-2 shadow-2xs hover:border-primary/40 font-medium"
            >
              <UserPlus className="size-3.5 text-blue-500 shrink-0" />
              <span className="truncate">Add Employee</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: "/attendance" })}
              className="h-9 text-xs justify-start gap-2 shadow-2xs hover:border-primary/40 font-medium"
            >
              <Clock className="size-3.5 text-emerald-500 shrink-0" />
              <span className="truncate">Clock In/Out</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: "/leave" })}
              className="h-9 text-xs justify-start gap-2 shadow-2xs hover:border-primary/40 font-medium"
            >
              <CalendarCheck className="size-3.5 text-amber-500 shrink-0" />
              <span className="truncate">Apply Leave</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: "/payroll" })}
              className="h-9 text-xs justify-start gap-2 shadow-2xs hover:border-primary/40 font-medium"
            >
              <Wallet className="size-3.5 text-indigo-500 shrink-0" />
              <span className="truncate">Run Payroll</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: "/announcements" })}
              className="h-9 text-xs justify-start gap-2 shadow-2xs hover:border-primary/40 font-medium"
            >
              <Megaphone className="size-3.5 text-purple-500 shrink-0" />
              <span className="truncate">Announcement</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: "/expenses" })}
              className="h-9 text-xs justify-start gap-2 shadow-2xs hover:border-primary/40 font-medium"
            >
              <Receipt className="size-3.5 text-rose-500 shrink-0" />
              <span className="truncate">Create Expense</span>
            </Button>
          </div>
        </Card>

        {/* ─── 6. RECENT HR ACTIVITY (100% REAL DB AUDIT TRAIL) ─── */}
        <Card className="p-4 border shadow-2xs bg-card space-y-3">
          <div className="flex items-center justify-between border-b pb-2.5">
            <div>
              <h3 className="font-bold text-sm text-foreground">Recent HR Activity</h3>
              <p className="text-[11px] text-muted-foreground">
                Real-time operational audit trail fetched directly from your MySQL database.
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              Live Feed
            </Badge>
          </div>

          {activities.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground font-semibold text-[11px]">
                    <th className="pb-2 text-left w-20">Time</th>
                    <th className="pb-2 text-left w-36">User / Staff</th>
                    <th className="pb-2 text-left">Action</th>
                    <th className="pb-2 text-left w-28">Module</th>
                    <th className="pb-2 text-right w-28">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {activities.map((act: any, i: number) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 font-mono text-[11px] text-muted-foreground">{act.time}</td>
                      <td className="py-2.5 font-semibold text-foreground">{act.user}</td>
                      <td className="py-2.5 text-muted-foreground">{act.action}</td>
                      <td className="py-2.5">
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          {act.module}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${act.badgeClass}`}>
                          {act.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center space-y-2">
              <Inbox className="size-8 text-muted-foreground/40 mx-auto" />
              <p className="text-xs text-muted-foreground font-medium">
                No recent HR activity found in the database.
              </p>
              <p className="text-[11px] text-muted-foreground/70">
                Actions like clock-ins, leave submissions, and new employee onboarding will appear here in real-time.
              </p>
            </div>
          )}
        </Card>
      </div>
    </PlanGuard>
  );
}
