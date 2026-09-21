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

        {/* ─── 2. EXACT CRM-STYLE 4-COLUMN KPI ROW (100% REAL DB DATA) ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-3">

          {/* Total Employees */}
          <div className="bg-white border border-border-color rounded-md overflow-hidden dark:bg-card dark:border-border">
            <div className="h-1 bg-gradient-to-r from-success via-warning to-danger"></div>
            <div className="p-4 bg-success/5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-default mb-1">Total Employees</p>
                  <h2 className="text-2xl max-lg:text-xl font-bold text-gray-900 dark:text-white mb-0">{totalEmployees}</h2>
                </div>
                <div className="size-10 rounded-full bg-success flex items-center justify-center shrink-0">
                  <i className="ph-duotone ph-user text-white text-lg"></i>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center font-semibold text-success">
                  <i className="ph ph-arrow-up text-[10px] me-0.5"></i>+{newEmployeesThisMonth}
                </span>
                <span className="text-default">this month</span>
              </div>
            </div>
          </div>

          {/* Present Today */}
          <div className="bg-white border border-border-color rounded-md overflow-hidden dark:bg-card dark:border-border">
            <div className="h-1 bg-gradient-to-r from-purple via-pink to-purple"></div>
            <div className="p-4 bg-purple/5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-default mb-1">Present Today</p>
                  <h2 className="text-2xl max-lg:text-xl font-bold text-gray-900 dark:text-white mb-0">{presentToday}</h2>
                </div>
                <div className="size-10 rounded-full bg-purple flex items-center justify-center shrink-0">
                  <i className="ph-duotone ph-info text-white text-lg"></i>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center font-semibold text-success">
                  <i className="ph ph-arrow-up text-[10px] me-0.5"></i>{presentPercentage}%
                </span>
                <span className="text-default">attendance</span>
              </div>
            </div>
          </div>

          {/* On Leave */}
          <div className="bg-white border border-border-color rounded-md overflow-hidden dark:bg-card dark:border-border">
            <div className="h-1 bg-gradient-to-r from-warning via-orange to-warning"></div>
            <div className="p-4 bg-warning/5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-default mb-1">On Leave</p>
                  <h2 className="text-2xl max-lg:text-xl font-bold text-gray-900 dark:text-white mb-0">{onLeaveToday}</h2>
                </div>
                <div className="size-10 rounded-full bg-warning flex items-center justify-center shrink-0">
                  <i className="ph-duotone ph-medal text-white text-lg"></i>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center font-semibold text-warning">
                  <i className="ph ph-clock text-[10px] me-0.5"></i>Today
                </span>
                <span className="text-default">approved leave</span>
              </div>
            </div>
          </div>

          {/* Pending Approvals */}
          <div className="bg-white border border-border-color rounded-md overflow-hidden dark:bg-card dark:border-border">
            <div className="h-1 bg-gradient-to-r from-pink via-purple to-pink"></div>
            <div className="p-4 bg-pink/5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-default mb-1">Pending Approvals</p>
                  <h2 className="text-2xl max-lg:text-xl font-bold text-gray-900 dark:text-white mb-0">{totalPending}</h2>
                </div>
                <div className="size-10 rounded-full bg-pink flex items-center justify-center shrink-0">
                  <i className="ph-duotone ph-credit-card text-white text-lg"></i>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={`inline-flex items-center font-semibold ${totalPending > 0 ? "text-danger" : "text-success"}`}>
                  <i className={`ph ${totalPending > 0 ? "ph-arrow-down" : "ph-arrow-up"} text-[10px] me-0.5`}></i>
                  {totalPending > 0 ? `+${totalPending}` : "0"}
                </span>
                <span className="text-default">{totalPending > 0 ? "requires action" : "All cleared"}</span>
              </div>
            </div>
          </div>

        </div>

        {/* ─── 3. MAIN OPERATIONAL 2-COLUMN SECTION (EXACT CRM CONTAINER UI) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Attendance Today */}
          <div className="bg-white border border-border-color rounded-md overflow-hidden dark:bg-card dark:border-border flex flex-col justify-between">
            <div className="p-4 flex flex-col justify-between flex-1 space-y-4">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-border-color pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-full bg-success flex items-center justify-center shrink-0">
                      <i className="ph-duotone ph-clock text-white text-base"></i>
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-gray-900 dark:text-white">Attendance Today</h5>
                      <p className="text-[11px] text-default">Real-time attendance & live punch status</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center text-[10px] font-semibold text-success bg-success/10 border border-success/30 px-2 py-0.5 rounded-full">
                    <span className="size-1.5 rounded-full bg-success me-1 animate-pulse"></span> MySQL Real-Time
                  </span>
                </div>

                {/* Attendance Breakdown Grid - 4 Sub-Boxes */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 rounded-md bg-success/5 border border-success/20">
                    <span className="text-[11px] font-semibold text-default block">Present</span>
                    <span className="text-lg font-bold text-success">{presentToday}</span>
                  </div>
                  <div className="p-2.5 rounded-md bg-warning/5 border border-warning/20">
                    <span className="text-[11px] font-semibold text-default block">Late</span>
                    <span className="text-lg font-bold text-warning">{lateToday}</span>
                  </div>
                  <div className="p-2.5 rounded-md bg-danger/5 border border-danger/20">
                    <span className="text-[11px] font-semibold text-default block">Absent</span>
                    <span className="text-lg font-bold text-danger">{absentToday}</span>
                  </div>
                  <div className="p-2.5 rounded-md bg-purple/5 border border-purple/20">
                    <span className="text-[11px] font-semibold text-default block">On Leave</span>
                    <span className="text-lg font-bold text-purple">{onLeaveToday}</span>
                  </div>
                </div>

                {/* Visual Proportion Bar */}
                <div className="space-y-1.5">
                  <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-muted/30 overflow-hidden flex">
                    <div style={{ width: `${totalEmployees > 0 ? (presentToday / totalEmployees) * 100 : 0}%` }} className="bg-success transition-all duration-500" title={`Present: ${presentToday}`} />
                    <div style={{ width: `${totalEmployees > 0 ? (lateToday / totalEmployees) * 100 : 0}%` }} className="bg-warning transition-all duration-500" title={`Late: ${lateToday}`} />
                    <div style={{ width: `${totalEmployees > 0 ? (absentToday / totalEmployees) * 100 : 0}%` }} className="bg-danger transition-all duration-500" title={`Absent: ${absentToday}`} />
                    <div style={{ width: `${totalEmployees > 0 ? (onLeaveToday / totalEmployees) * 100 : 0}%` }} className="bg-purple transition-all duration-500" title={`On Leave: ${onLeaveToday}`} />
                  </div>
                  <div className="flex justify-between text-[11px] text-default font-mono">
                    <span>{presentPercentage}% Attendance Rate</span>
                    <span>{totalEmployees} Total Staff</span>
                  </div>
                </div>

                {/* Today's Live Clock-in Roster */}
                {stats?.todayRoster && stats.todayRoster.length > 0 && (
                  <div className="space-y-1.5 pt-3 border-t border-border-color">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-default block">
                      Live Clock-In Stream Today
                    </span>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {stats.todayRoster.slice(0, 4).map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between text-[11px] p-2 rounded-md bg-gray-50/70 dark:bg-muted/20 border border-border-color">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-900 dark:text-white">{r.name}</span>
                            <span className="text-default font-mono text-[10px]">#{r.employeeCode}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-success font-bold">
                              {r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded border border-success/30 text-success bg-success/10 font-bold">
                              PUNCH IN
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border-color flex justify-end">
                <Link
                  to="/attendance"
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  View Full Attendance Sheet <i className="ph ph-arrow-right text-[11px]"></i>
                </Link>
              </div>
            </div>
          </div>

          {/* Right: Pending Approvals */}
          <div className="bg-white border border-border-color rounded-md overflow-hidden dark:bg-card dark:border-border flex flex-col justify-between">
            <div className="p-4 flex flex-col justify-between flex-1 space-y-4">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-border-color pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-full bg-purple flex items-center justify-center shrink-0">
                      <i className="ph-duotone ph-bell-ringing text-white text-base"></i>
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-gray-900 dark:text-white">Pending Approvals</h5>
                      <p className="text-[11px] text-default">Administrative requests requiring action</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center text-[10px] font-mono font-bold text-purple bg-purple/10 border border-purple/30 px-2 py-0.5 rounded-full">
                    {totalPending} Actionable
                  </span>
                </div>

                {/* Clickable Real Approval Rows */}
                <div className="space-y-2">
                  <Link
                    to="/leave"
                    className="flex items-center justify-between p-2.5 rounded-md border border-border-color bg-gray-50/70 dark:bg-muted/10 hover:border-warning/50 hover:bg-warning/5 transition-all text-xs group"
                  >
                    <span className="flex items-center gap-2.5 text-gray-900 dark:text-white font-medium">
                      <div className="size-7 rounded-md bg-warning/10 text-warning flex items-center justify-center">
                        <i className="ph-duotone ph-calendar-check text-sm"></i>
                      </div>
                      <span>Leave Requests</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${pendingLeaves > 0 ? "border border-warning/30 text-warning bg-warning/10" : "text-default bg-gray-100 dark:bg-muted/30"}`}>
                        {pendingLeaves}
                      </span>
                      <i className="ph ph-caret-right text-default text-xs group-hover:translate-x-0.5 transition-transform"></i>
                    </div>
                  </Link>

                  <Link
                    to="/expenses"
                    className="flex items-center justify-between p-2.5 rounded-md border border-border-color bg-gray-50/70 dark:bg-muted/10 hover:border-danger/50 hover:bg-danger/5 transition-all text-xs group"
                  >
                    <span className="flex items-center gap-2.5 text-gray-900 dark:text-white font-medium">
                      <div className="size-7 rounded-md bg-danger/10 text-danger flex items-center justify-center">
                        <i className="ph-duotone ph-receipt text-sm"></i>
                      </div>
                      <span>Expense Claims</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${pendingExpenses > 0 ? "border border-danger/30 text-danger bg-danger/10" : "text-default bg-gray-100 dark:bg-muted/30"}`}>
                        {pendingExpenses}
                      </span>
                      <i className="ph ph-caret-right text-default text-xs group-hover:translate-x-0.5 transition-transform"></i>
                    </div>
                  </Link>

                  <Link
                    to="/attendance"
                    className="flex items-center justify-between p-2.5 rounded-md border border-border-color bg-gray-50/70 dark:bg-muted/10 hover:border-primary/50 hover:bg-primary/5 transition-all text-xs group"
                  >
                    <span className="flex items-center gap-2.5 text-gray-900 dark:text-white font-medium">
                      <div className="size-7 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                        <i className="ph-duotone ph-clock-user text-sm"></i>
                      </div>
                      <span>Attendance Corrections</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold text-default bg-gray-100 dark:bg-muted/30">
                        {pendingAttendance}
                      </span>
                      <i className="ph ph-caret-right text-default text-xs group-hover:translate-x-0.5 transition-transform"></i>
                    </div>
                  </Link>

                  <Link
                    to="/documents"
                    className="flex items-center justify-between p-2.5 rounded-md border border-border-color bg-gray-50/70 dark:bg-muted/10 hover:border-purple/50 hover:bg-purple/5 transition-all text-xs group"
                  >
                    <span className="flex items-center gap-2.5 text-gray-900 dark:text-white font-medium">
                      <div className="size-7 rounded-md bg-purple/10 text-purple flex items-center justify-center">
                        <i className="ph-duotone ph-file-lock text-sm"></i>
                      </div>
                      <span>Document Sign-Offs</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold text-default bg-gray-100 dark:bg-muted/30">
                        {pendingDocs}
                      </span>
                      <i className="ph ph-caret-right text-default text-xs group-hover:translate-x-0.5 transition-transform"></i>
                    </div>
                  </Link>
                </div>
              </div>

              <div className="pt-3 border-t border-border-color flex justify-end">
                <Link
                  to="/leave"
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  View All Approvals <i className="ph ph-arrow-right text-[11px]"></i>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 4. PAYROLL & ALERTS 2-COLUMN SECTION (EXACT CRM CONTAINER UI) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Payroll Status Card */}
          <div className="bg-white border border-border-color rounded-md overflow-hidden dark:bg-card dark:border-border flex flex-col justify-between min-w-0">
            <div className="p-4 flex flex-col justify-between flex-1 space-y-4">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-border-color pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-full bg-warning flex items-center justify-center shrink-0">
                      <i className="ph-duotone ph-wallet text-white text-base"></i>
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-gray-900 dark:text-white">Payroll — {currentMonthYear}</h5>
                      <p className="text-[11px] text-default">Current cycle disbursement & processing status</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    payrollStatus === "Processed"
                      ? "border-success/30 text-success bg-success/10"
                      : payrollStatus === "Pending"
                      ? "border-warning/30 text-warning bg-warning/10"
                      : "border-border-color text-default bg-gray-100 dark:bg-muted/30"
                  }`}>
                    {payrollStatus}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-md bg-purple/5 border border-purple/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-default block">Staff Included</span>
                    <span className="text-base font-bold text-gray-900 dark:text-white mt-1 block">{payrollEmployees} Staff</span>
                  </div>
                  <div className="p-3 rounded-md bg-warning/5 border border-warning/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-default block">Payroll Status</span>
                    <span className="text-base font-bold text-warning mt-1 block">{payrollStatus}</span>
                  </div>
                  <div className="p-3 rounded-md bg-success/5 border border-success/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-default block">Gross Payroll</span>
                    <span className="text-base font-bold text-success mt-1 block">${grossPayroll.toLocaleString()}</span>
                  </div>
                  <div className="p-3 rounded-md bg-pink/5 border border-pink/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-default block">Net Payroll</span>
                    <span className="text-base font-bold text-pink mt-1 block">${netPayroll.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border-color flex justify-end">
                <Link
                  to="/payroll"
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  Open Payroll <i className="ph ph-arrow-right text-[11px]"></i>
                </Link>
              </div>
            </div>
          </div>

          {/* Alerts & Reminders */}
          <div className="bg-white border border-border-color rounded-md overflow-hidden dark:bg-card dark:border-border flex flex-col justify-between min-w-0">
            <div className="p-4 flex flex-col justify-between flex-1 space-y-4">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-border-color pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-full bg-pink flex items-center justify-center shrink-0">
                      <i className="ph-duotone ph-warning-diamond text-white text-base"></i>
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-gray-900 dark:text-white">Alerts & Reminders</h5>
                      <p className="text-[11px] text-default">System notices and overdue tasks requiring action</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-pink/30 text-pink bg-pink/10">
                    {dynamicAlerts.length} Notices
                  </span>
                </div>

                <div className="space-y-2">
                  {dynamicAlerts.length > 0 ? (
                    dynamicAlerts.map((alt) => (
                      <div
                        key={alt.id}
                        className="flex items-center justify-between p-2.5 rounded-md border border-border-color bg-gray-50/70 dark:bg-muted/10 text-xs gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <i className="ph-duotone ph-warning text-warning text-base shrink-0"></i>
                          <span className="text-gray-900 dark:text-gray-200 truncate">{alt.text}</span>
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
                    <div className="p-4 text-center rounded-md bg-success/5 border border-success/20 text-xs text-success font-medium">
                      <i className="ph-duotone ph-check-circle text-lg block mb-1"></i>
                      All HR operations are clear! No pending alerts or overdue actions.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 5. QUICK ACTIONS SECTION (EXACT CRM CONTAINER UI) ─── */}
        <div className="bg-white border border-border-color rounded-md overflow-hidden dark:bg-card dark:border-border">
          <div className="p-4">
            <div className="flex items-center justify-between border-b border-border-color pb-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <i className="ph-duotone ph-lightning text-white text-base"></i>
                </div>
                <h5 className="font-bold text-sm text-gray-900 dark:text-white">Quick Operations</h5>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <button
                type="button"
                onClick={() => navigate({ to: "/employees" })}
                className="h-10 px-3 text-xs justify-start gap-2.5 rounded-md border border-border-color bg-gray-50/70 dark:bg-muted/10 hover:border-primary/50 hover:bg-primary/5 transition-all font-medium flex items-center text-gray-900 dark:text-white cursor-pointer"
              >
                <i className="ph-duotone ph-user-plus text-primary text-base shrink-0"></i>
                <span className="truncate">Add Employee</span>
              </button>
              <button
                type="button"
                onClick={() => navigate({ to: "/attendance" })}
                className="h-10 px-3 text-xs justify-start gap-2.5 rounded-md border border-border-color bg-gray-50/70 dark:bg-muted/10 hover:border-success/50 hover:bg-success/5 transition-all font-medium flex items-center text-gray-900 dark:text-white cursor-pointer"
              >
                <i className="ph-duotone ph-clock text-success text-base shrink-0"></i>
                <span className="truncate">Clock In/Out</span>
              </button>
              <button
                type="button"
                onClick={() => navigate({ to: "/leave" })}
                className="h-10 px-3 text-xs justify-start gap-2.5 rounded-md border border-border-color bg-gray-50/70 dark:bg-muted/10 hover:border-warning/50 hover:bg-warning/5 transition-all font-medium flex items-center text-gray-900 dark:text-white cursor-pointer"
              >
                <i className="ph-duotone ph-calendar-check text-warning text-base shrink-0"></i>
                <span className="truncate">Apply Leave</span>
              </button>
              <button
                type="button"
                onClick={() => navigate({ to: "/payroll" })}
                className="h-10 px-3 text-xs justify-start gap-2.5 rounded-md border border-border-color bg-gray-50/70 dark:bg-muted/10 hover:border-purple/50 hover:bg-purple/5 transition-all font-medium flex items-center text-gray-900 dark:text-white cursor-pointer"
              >
                <i className="ph-duotone ph-wallet text-purple text-base shrink-0"></i>
                <span className="truncate">Run Payroll</span>
              </button>
              <button
                type="button"
                onClick={() => navigate({ to: "/announcements" })}
                className="h-10 px-3 text-xs justify-start gap-2.5 rounded-md border border-border-color bg-gray-50/70 dark:bg-muted/10 hover:border-pink/50 hover:bg-pink/5 transition-all font-medium flex items-center text-gray-900 dark:text-white cursor-pointer"
              >
                <i className="ph-duotone ph-megaphone text-pink text-base shrink-0"></i>
                <span className="truncate">Announcement</span>
              </button>
              <button
                type="button"
                onClick={() => navigate({ to: "/expenses" })}
                className="h-10 px-3 text-xs justify-start gap-2.5 rounded-md border border-border-color bg-gray-50/70 dark:bg-muted/10 hover:border-danger/50 hover:bg-danger/5 transition-all font-medium flex items-center text-gray-900 dark:text-white cursor-pointer"
              >
                <i className="ph-duotone ph-receipt text-danger text-base shrink-0"></i>
                <span className="truncate">Create Expense</span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── 6. RECENT HR ACTIVITY (EXACT CRM CONTAINER UI) ─── */}
        <div className="bg-white border border-border-color rounded-md overflow-hidden dark:bg-card dark:border-border">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border-color pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-full bg-success flex items-center justify-center shrink-0">
                  <i className="ph-duotone ph-clock-counter-clockwise text-white text-base"></i>
                </div>
                <div>
                  <h5 className="font-bold text-sm text-gray-900 dark:text-white">Recent HR Activity</h5>
                  <p className="text-[11px] text-default">
                    Real-time operational audit trail fetched directly from your MySQL database.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-success/30 text-success bg-success/10">
                Live Feed
              </span>
            </div>

            {activities.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border-color text-default font-semibold text-[11px]">
                      <th className="pb-2 text-left w-20">Time</th>
                      <th className="pb-2 text-left w-36">User / Staff</th>
                      <th className="pb-2 text-left">Action</th>
                      <th className="pb-2 text-left w-28">Module</th>
                      <th className="pb-2 text-right w-28">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-color/50">
                    {activities.map((act: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50/60 dark:hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 font-mono text-[11px] text-default">{act.time}</td>
                        <td className="py-2.5 font-semibold text-gray-900 dark:text-white">{act.user}</td>
                        <td className="py-2.5 text-default">{act.action}</td>
                        <td className="py-2.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded border border-border-color text-default bg-gray-100 dark:bg-muted/30">
                            {act.module}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${act.badgeClass}`}>
                            {act.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <i className="ph-duotone ph-tray text-3xl text-default/50 block"></i>
                <p className="text-xs text-default font-medium">
                  No recent HR activity found in the database.
                </p>
                <p className="text-[11px] text-default/70">
                  Actions like clock-ins, leave submissions, and new employee onboarding will appear here in real-time.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      </PlanGuard>
  );
}
