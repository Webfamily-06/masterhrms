'use client';

import { useState, useMemo, Suspense } from "react";
import dynamic from "next/dynamic";
import { Link } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useTenantBranding } from "@/lib/useTenantBranding";
import { useCurrentProfile } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function TenantDashboardPage() {
  const { branding } = useTenantBranding();
  const { data: profile } = useCurrentProfile();
  const [applicantTab, setApplicantTab] = useState<"openings" | "applicants">("applicants");

  const [todos, setTodos] = useState([
    { id: 1, text: "Add Holidays to 2026 Calendar", done: false, tag: "HR" },
    { id: 2, text: "Add Meeting to Client (Ignis Corp)", done: false, tag: "Meeting" },
    { id: 3, text: "Review Quarterly Performance with Adrian", done: true, tag: "Review" },
    { id: 4, text: "Executive Management Strategic Call", done: false, tag: "Strategy" },
    { id: 5, text: "Finalize Monthly Payroll Approvals", done: false, tag: "Payroll" },
    { id: 6, text: "Publish Updated Policy for Annual Increment", done: false, tag: "Policy" },
  ]);

  const { data: tenantMetrics } = useQuery({
    queryKey: ["tenant-dashboard-metrics"],
    queryFn: async () => {
      try {
        const res = await api.get<any>("/dashboard/tenant");
        return res?.data || res || {};
      } catch (err) {
        return {};
      }
    },
    refetchInterval: 30000,
  });

  const userName = profile?.full_name?.split(" ")[0] || "Adrian";
  const currencySymbol = tenantMetrics?.currencySymbol || branding.currencySymbol || "$";

  // Chart: Employees by Department
  const empDepartmentOptions: any = {
    chart: { type: "bar", height: 220, toolbar: { show: false } },
    colors: ["#0d6efd"],
    plotOptions: {
      bar: { borderRadius: 4, horizontal: true, barHeight: "45%" }
    },
    dataLabels: { enabled: false },
    grid: { borderColor: "rgba(100, 116, 139, 0.15)", strokeDashArray: 4 },
    xaxis: {
      categories: ["UI/UX", "Development", "Management", "HR", "Testing", "Marketing"],
      labels: { style: { colors: "#64748b", fontSize: "12px" } }
    },
    yaxis: { labels: { style: { colors: "#64748b", fontSize: "12px" } } }
  };
  const empDepartmentSeries = [{ name: "Employees", data: [80, 110, 80, 20, 60, 100] }];

  // Chart: Sales Overview (Income vs Expenses)
  const salesIncomeOptions: any = {
    chart: { type: "bar", height: 280, stacked: true, toolbar: { show: false } },
    colors: ["#0d6efd", "#cbd5e1"],
    plotOptions: {
      bar: { columnWidth: "55%", borderRadius: 4 }
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ["transparent"] },
    grid: { borderColor: "rgba(100, 116, 139, 0.15)", strokeDashArray: 4 },
    xaxis: {
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      labels: { style: { colors: "#64748b", fontSize: "11px" } }
    },
    yaxis: { labels: { style: { colors: "#64748b", fontSize: "11px" } } },
    legend: { position: "top", horizontalAlign: "right" }
  };
  const salesIncomeSeries = [
    { name: "Income", data: [40, 30, 45, 80, 85, 90, 80, 80, 80, 85, 20, 80] },
    { name: "Expenses", data: [60, 70, 55, 20, 15, 10, 20, 20, 20, 15, 80, 20] }
  ];

  // Chart: Attendance Overview Donut
  const attendanceDonutOptions: any = {
    chart: { type: "donut", height: 210 },
    labels: ["Present", "Late", "Permission", "Absent"],
    colors: ["#16a34a", "#64748b", "#f59e0b", "#e11d48"],
    dataLabels: { enabled: false },
    legend: { show: false },
    plotOptions: {
      pie: {
        donut: {
          size: "72%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Attendance",
              fontSize: "12px",
              color: "#64748b",
              formatter: () => "120/154"
            }
          }
        }
      }
    }
  };
  const attendanceDonutSeries = [59, 21, 2, 15];

  // Chart: Tasks Statistics Radial
  const taskStatsOptions: any = {
    chart: { type: "radialBar", height: 230 },
    plotOptions: {
      radialBar: {
        hollow: { size: "65%" },
        track: { background: "rgba(100, 116, 139, 0.1)" },
        dataLabels: {
          name: { show: true, fontSize: "12px", color: "#64748b", offsetY: -10 },
          value: { show: true, fontSize: "22px", fontWeight: "bold", offsetY: 4, formatter: () => "124/165" }
        }
      }
    },
    colors: ["#0d6efd"],
    labels: ["Tasks Done"]
  };
  const taskStatsSeries = [75];

  const toggleTodo = (id: number) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="Admin Dashboard"
        description="Comprehensive workspace telemetry, department capacity, workforce attendance and enterprise deliverables."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success("Exporting Dashboard Metrics PDF...")}
            >
              <i className="ti ti-file-export mr-1.5 text-sm" />
              Export
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => toast.info("Opening schedule manager...")}
            >
              <i className="ti ti-plus mr-1.5 text-sm" />
              Add Schedule
            </Button>
          </div>
        }
      />

      {/* Welcome Banner Card */}
      <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xl font-bold overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={userName} className="size-full object-cover" />
            ) : (
              userName.charAt(0)
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              Welcome Back, {userName}
              <span className="text-xs font-normal text-muted-foreground px-2 py-0.5 rounded-full bg-muted border border-border/60">
                Workspace Admin
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              You have <span className="text-primary font-semibold underline">21 Pending Approvals</span> & <span className="text-primary font-semibold underline">14 Leave Requests</span> requiring review today.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/hr/calendar">
            <Button variant="outline" size="sm">
              <i className="ti ti-calendar-cog mr-1.5 text-sm" />
              View Schedule
            </Button>
          </Link>
          <Link to="/hr/leave/applications">
            <Button variant="primary" size="sm">
              <i className="ti ti-square-rounded-plus mr-1.5 text-sm" />
              Leave Requests
            </Button>
          </Link>
        </div>
      </div>

      {/* 8 Primary KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs hover:border-primary/40 transition-all">
          <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
            <i className="ti ti-calendar-share text-lg" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">Attendance Overview</span>
          <div className="text-2xl font-bold tracking-tight text-foreground mt-1">120/154</div>
          <Link to="/hr/attendance/records" className="text-xs text-primary font-medium hover:underline inline-flex items-center mt-2">
            View Details <i className="ti ti-arrow-right ml-1 text-[10px]" />
          </Link>
        </div>

        <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs hover:border-primary/40 transition-all">
          <div className="size-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center mb-3">
            <i className="ti ti-browser text-lg" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">Total Projects</span>
          <div className="text-2xl font-bold tracking-tight text-foreground mt-1">90/125</div>
          <Link to="/projects" className="text-xs text-primary font-medium hover:underline inline-flex items-center mt-2">
            View All <i className="ti ti-arrow-right ml-1 text-[10px]" />
          </Link>
        </div>

        <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs hover:border-primary/40 transition-all">
          <div className="size-9 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center mb-3">
            <i className="ti ti-users-group text-lg" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">Total Clients</span>
          <div className="text-2xl font-bold tracking-tight text-foreground mt-1">69/86</div>
          <Link to="/clients" className="text-xs text-primary font-medium hover:underline inline-flex items-center mt-2">
            View All <i className="ti ti-arrow-right ml-1 text-[10px]" />
          </Link>
        </div>

        <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs hover:border-primary/40 transition-all">
          <div className="size-9 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center mb-3">
            <i className="ti ti-checklist text-lg" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">Total Tasks</span>
          <div className="text-2xl font-bold tracking-tight text-foreground mt-1">96/100</div>
          <Link to="/tasks" className="text-xs text-primary font-medium hover:underline inline-flex items-center mt-2">
            View All <i className="ti ti-arrow-right ml-1 text-[10px]" />
          </Link>
        </div>

        <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs hover:border-primary/40 transition-all">
          <div className="size-9 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center mb-3">
            <i className="ti ti-moneybag text-lg" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">Earnings</span>
          <div className="text-2xl font-bold tracking-tight text-foreground mt-1">{currencySymbol}21,445</div>
          <Link to="/invoices" className="text-xs text-primary font-medium hover:underline inline-flex items-center mt-2">
            View All <i className="ti ti-arrow-right ml-1 text-[10px]" />
          </Link>
        </div>

        <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs hover:border-primary/40 transition-all">
          <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
            <i className="ti ti-trending-up text-lg" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">Profit This Week</span>
          <div className="text-2xl font-bold tracking-tight text-foreground mt-1">{currencySymbol}5,544</div>
          <Link to="/profit-loss" className="text-xs text-primary font-medium hover:underline inline-flex items-center mt-2">
            View All <i className="ti ti-arrow-right ml-1 text-[10px]" />
          </Link>
        </div>

        <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs hover:border-primary/40 transition-all">
          <div className="size-9 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center mb-3">
            <i className="ti ti-users-group text-lg" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">Job Applicants</span>
          <div className="text-2xl font-bold tracking-tight text-foreground mt-1">98</div>
          <Link to="/hr/recruitment/job-postings" className="text-xs text-primary font-medium hover:underline inline-flex items-center mt-2">
            View All <i className="ti ti-arrow-right ml-1 text-[10px]" />
          </Link>
        </div>

        <div className="p-4 rounded-xl border border-border/80 bg-card shadow-xs hover:border-primary/40 transition-all">
          <div className="size-9 rounded-lg bg-slate-500/10 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-3">
            <i className="ti ti-user-star text-lg" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">New Hires</span>
          <div className="text-2xl font-bold tracking-tight text-foreground mt-1">45/48</div>
          <Link to="/hr/recruitment/candidates" className="text-xs text-primary font-medium hover:underline inline-flex items-center mt-2">
            View All <i className="ti ti-arrow-right ml-1 text-[10px]" />
          </Link>
        </div>
      </div>

      {/* Row 2: Department Distribution + Employee Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employees by Department Chart */}
        <div className="lg:col-span-2 rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-foreground text-sm">Employees By Department</h4>
              <p className="text-xs text-muted-foreground">Headcount distribution across active functional units</p>
            </div>
            <span className="text-xs text-emerald-600 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              +20% vs Last Month
            </span>
          </div>
          <div className="min-h-[220px]">
            <Suspense fallback={<div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">Loading Department Chart...</div>}>
              <Chart options={empDepartmentOptions} series={empDepartmentSeries} type="bar" height={220} />
            </Suspense>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2 pt-2 border-t border-border/60">
            <i className="ti ti-info-circle text-primary text-sm" />
            Engineering and Marketing units currently represent 58% of aggregate payroll headcount.
          </div>
        </div>

        {/* Employee Status & Top Performer */}
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-foreground text-sm">Employee Status</h4>
              <Badge variant="soft">Total 154</Badge>
            </div>

            {/* Stacked Progress Bar */}
            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden flex mb-4">
              <div style={{ width: "48%" }} className="bg-primary" title="Fulltime: 48%" />
              <div style={{ width: "20%" }} className="bg-sky-500" title="Contract: 20%" />
              <div style={{ width: "22%" }} className="bg-amber-500" title="Probation: 22%" />
              <div style={{ width: "10%" }} className="bg-rose-500" title="WFH: 10%" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs border border-border/70 rounded-lg p-3 bg-muted/20 mb-4">
              <div className="border-r border-border/60 pr-2">
                <span className="text-muted-foreground flex items-center gap-1">
                  <span className="size-2 rounded-full bg-primary" /> Fulltime (48%)
                </span>
                <span className="text-base font-bold text-foreground">112</span>
              </div>
              <div className="pl-2">
                <span className="text-muted-foreground flex items-center gap-1">
                  <span className="size-2 rounded-full bg-sky-500" /> Contract (20%)
                </span>
                <span className="text-base font-bold text-foreground">30</span>
              </div>
              <div className="border-r border-t border-border/60 pr-2 pt-2">
                <span className="text-muted-foreground flex items-center gap-1">
                  <span className="size-2 rounded-full bg-amber-500" /> Probation (22%)
                </span>
                <span className="text-base font-bold text-foreground">12</span>
              </div>
              <div className="pl-2 pt-2 border-t border-border/60">
                <span className="text-muted-foreground flex items-center gap-1">
                  <span className="size-2 rounded-full bg-rose-500" /> Remote (10%)
                </span>
                <span className="text-base font-bold text-foreground">04</span>
              </div>
            </div>

            {/* Top Performer Card */}
            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-sm">
                  <i className="ti ti-award text-base" />
                </div>
                <div>
                  <h6 className="text-xs font-semibold text-foreground">Daniel Esbella</h6>
                  <p className="text-[11px] text-muted-foreground">Lead iOS Developer</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground block">Rating</span>
                <span className="text-xs font-bold text-primary">99%</span>
              </div>
            </div>
          </div>

          <Link to="/hr/employees">
            <Button variant="outline" size="sm" className="w-full mt-2">
              View All Employees
            </Button>
          </Link>
        </div>
      </div>

      {/* Row 3: Attendance Donut & Clock-In/Out Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Donut */}
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground text-sm">Attendance Overview</h4>
            <span className="text-xs text-muted-foreground">Today</span>
          </div>
          <div className="min-h-[210px] flex items-center justify-center">
            <Suspense fallback={<div className="h-[210px] flex items-center justify-center text-xs text-muted-foreground">Loading Chart...</div>}>
              <Chart options={attendanceDonutOptions} series={attendanceDonutSeries} type="donut" height={210} />
            </Suspense>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-600" /> Present
              </span>
              <span className="font-medium text-foreground">59% (91)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-slate-500" /> Late
              </span>
              <span className="font-medium text-foreground">21% (32)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-500" /> Permission
              </span>
              <span className="font-medium text-foreground">2% (3)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-rose-600" /> Absent
              </span>
              <span className="font-medium text-foreground">15% (23)</span>
            </div>
          </div>
        </div>

        {/* Clock-In/Out Realtime Feed */}
        <div className="lg:col-span-2 rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-foreground text-sm">Clock-In / Clock-Out</h4>
              <Link to="/hr/attendance/records" className="text-xs text-primary hover:underline">
                View Full Attendance Report
              </Link>
            </div>
            <div className="space-y-2.5">
              <div className="p-3 rounded-lg border border-border/70 bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                    DE
                  </div>
                  <div>
                    <h6 className="text-xs font-semibold text-foreground">Daniel Esbella</h6>
                    <p className="text-[11px] text-muted-foreground">UI/UX Designer</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-emerald-600 font-medium">In: 09:15 AM</span>
                  <span className="text-muted-foreground">Production: 08:30 Hrs</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold text-[11px]">On Time</span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border/70 bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-sky-500/10 text-sky-600 font-bold text-xs flex items-center justify-center">
                    DM
                  </div>
                  <div>
                    <h6 className="text-xs font-semibold text-foreground">Doglas Martini</h6>
                    <p className="text-[11px] text-muted-foreground">Project Manager</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-emerald-600 font-medium">In: 09:36 AM</span>
                  <span className="text-muted-foreground">Production: 08:15 Hrs</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold text-[11px]">On Time</span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-rose-500/10 text-rose-600 font-bold text-xs flex items-center justify-center">
                    AL
                  </div>
                  <div>
                    <h6 className="text-xs font-semibold text-foreground">Anthony Lewis</h6>
                    <p className="text-[11px] text-muted-foreground">Marketing Lead</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-rose-600 font-medium">In: 10:15 AM</span>
                  <span className="text-rose-600 font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-[11px]">Late by 45 Min</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border/60 text-xs text-muted-foreground">
            <span>Biometric gateway synced 3 minutes ago</span>
            <Link to="/hr/attendance/shifts" className="text-primary hover:underline">
              Manage Shift Rosters
            </Link>
          </div>
        </div>
      </div>

      {/* Row 4: Jobs Applicants, Recent Staff Table & Interactive Todo List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job Openings / Applicants */}
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground text-sm">Recruitment Pipeline</h4>
            <div className="flex rounded-lg border border-border/70 p-0.5 bg-muted/40 text-xs">
              <button
                type="button"
                className={cn("px-2.5 py-1 rounded-md font-medium transition-all", applicantTab === "applicants" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground")}
                onClick={() => setApplicantTab("applicants")}
              >
                Applicants
              </button>
              <button
                type="button"
                className={cn("px-2.5 py-1 rounded-md font-medium transition-all", applicantTab === "openings" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground")}
                onClick={() => setApplicantTab("openings")}
              >
                Openings
              </button>
            </div>
          </div>

          {applicantTab === "applicants" ? (
            <div className="space-y-3">
              {[
                { name: "Brian Villalobos", role: "UI/UX Designer", exp: "5+ Years", loc: "USA", badge: "Reviewing" },
                { name: "Anthony Lewis", role: "Python Engineer", exp: "4+ Years", loc: "UK", badge: "Interviewed" },
                { name: "Stephan Peralt", role: "Android Developer", exp: "6+ Years", loc: "Canada", badge: "Shortlisted" },
                { name: "Doglas Martini", role: "React Developer", exp: "2+ Years", loc: "USA", badge: "Technical Test" },
              ].map((c) => (
                <div key={c.name} className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div>
                    <h6 className="font-semibold text-foreground">{c.name}</h6>
                    <span className="text-muted-foreground text-[11px]">{c.role} • {c.exp}</span>
                  </div>
                  <Badge variant="soft" className="text-[10px]">{c.badge}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { title: "Senior iOS Developer", openings: 25, dept: "Mobile Engineering" },
                { title: "Junior PHP Developer", openings: 20, dept: "Backend" },
                { title: "Junior React Developer", openings: 30, dept: "Frontend" },
                { title: "Senior Laravel Architect", openings: 10, dept: "Core API" },
              ].map((j) => (
                <div key={j.title} className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div>
                    <h6 className="font-semibold text-foreground">{j.title}</h6>
                    <span className="text-muted-foreground text-[11px]">{j.dept}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{j.openings} Openings</Badge>
                </div>
              ))}
            </div>
          )}

          <Link to="/hr/recruitment/job-postings">
            <Button variant="outline" size="sm" className="w-full">
              Manage Job Postings
            </Button>
          </Link>
        </div>

        {/* Employees Table Widget */}
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground text-sm">Active Workforce</h4>
            <Link to="/hr/employees" className="text-xs text-primary hover:underline">
              View All (154)
            </Link>
          </div>

          <div className="divide-y divide-border/60">
            {[
              { name: "Anthony Lewis", dept: "Finance", role: "Sr. Accountant", badge: "Finance" },
              { name: "Brian Villalobos", dept: "Development", role: "PHP Developer", badge: "Tech" },
              { name: "Stephan Peralt", dept: "Marketing", role: "Campaign Executive", badge: "Growth" },
              { name: "Doglas Martini", dept: "Management", role: "Project Manager", badge: "Lead" },
              { name: "Sara Connor", dept: "Design", role: "Product Designer", badge: "Creative" },
            ].map((emp) => (
              <div key={emp.name} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="size-7 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center">
                    {emp.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <h6 className="font-semibold text-foreground">{emp.name}</h6>
                    <span className="text-muted-foreground text-[11px]">{emp.role}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60 text-[10px]">
                  {emp.dept}
                </span>
              </div>
            ))}
          </div>

          <Link to="/hr/employees">
            <Button variant="outline" size="sm" className="w-full">
              Employee Directory
            </Button>
          </Link>
        </div>

        {/* Interactive Todo List */}
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-foreground text-sm">Action Items (Todo)</h4>
              <Badge variant="warning">{todos.filter((t) => !t.done).length} Pending</Badge>
            </div>

            <div className="space-y-2">
              {todos.map((todo) => (
                <div
                  key={todo.id}
                  onClick={() => toggleTodo(todo.id)}
                  className={cn(
                    "p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all",
                    todo.done
                      ? "border-border/60 bg-muted/40 text-muted-foreground line-through"
                      : "border-border/80 bg-card hover:border-primary/40"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={todo.done}
                      onChange={() => {}}
                      className="rounded border-border text-primary size-3.5 pointer-events-none"
                    />
                    <span>{todo.text}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">
                    {todo.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3"
            onClick={() => {
              const text = prompt("Enter new action item:");
              if (text) {
                setTodos((p) => [...p, { id: Date.now(), text, done: false, tag: "General" }]);
                toast.success("Todo item added!");
              }
            }}
          >
            <i className="ti ti-plus mr-1 text-sm" /> Add New Task
          </Button>
        </div>
      </div>

      {/* Row 5: Financial Operations (Sales Overview Chart & Recent Invoices) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Cashflow Chart */}
        <div className="lg:col-span-2 rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-foreground text-sm">Income vs Expenses</h4>
              <p className="text-xs text-muted-foreground">Monthly cash flow balance and financial commitments</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2 rounded-full bg-primary" /> Income
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2 rounded-full bg-slate-300 dark:bg-slate-700" /> Expenses
              </span>
            </div>
          </div>
          <div className="min-h-[280px]">
            <Suspense fallback={<div className="h-[280px] flex items-center justify-center text-xs text-muted-foreground">Loading Financial Chart...</div>}>
              <Chart options={salesIncomeOptions} series={salesIncomeSeries} type="bar" height={280} />
            </Suspense>
          </div>
        </div>

        {/* Invoices List */}
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground text-sm">Recent Invoices</h4>
            <Link to="/invoices" className="text-xs text-primary hover:underline">
              View All
            </Link>
          </div>

          <div className="divide-y divide-border/60">
            {[
              { id: "INV-002", title: "Redesign Website", client: "Logistics Pro", amount: "$3,560", status: "Unpaid" },
              { id: "INV-005", title: "Module Completion", client: "Yip Corp", amount: "$4,175", status: "Unpaid" },
              { id: "INV-003", title: "Change on Emp Module", client: "Ignis LLP", amount: "$6,985", status: "Unpaid" },
              { id: "INV-006", title: "Hospital Management", client: "HCL Corp", amount: "$6,458", status: "Paid" },
            ].map((inv) => (
              <div key={inv.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <h6 className="font-semibold text-foreground">{inv.title}</h6>
                  <span className="text-muted-foreground text-[11px]">{inv.id} • {inv.client}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-foreground block">{inv.amount}</span>
                  <span className={cn("text-[10px] font-semibold px-1.5 py-0.2 rounded", inv.status === "Paid" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600")}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <Link to="/invoices">
            <Button variant="outline" size="sm" className="w-full">
              Invoice Ledger
            </Button>
          </Link>
        </div>
      </div>

      {/* Row 6: Active Projects & Task Hour Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects Data Table */}
        <div className="lg:col-span-2 rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-foreground text-sm">Project Deliverables</h4>
              <p className="text-xs text-muted-foreground">Milestone progression and capacity consumption</p>
            </div>
            <Link to="/projects" className="text-xs text-primary hover:underline">
              View All Projects
            </Link>
          </div>

          <div className="overflow-x-auto border border-border/80 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Logged Hours</th>
                  <th className="p-3">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {[
                  { id: "PRO-001", name: "Office Management App", hours: "15/255 Hrs", pct: 40, priority: "High", pColor: "text-rose-600 bg-rose-500/10 border-rose-500/20" },
                  { id: "PRO-002", name: "Clinic Management System", hours: "15/255 Hrs", pct: 20, priority: "Low", pColor: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
                  { id: "PRO-003", name: "Educational LMS Platform", hours: "40/255 Hrs", pct: 50, priority: "Medium", pColor: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
                  { id: "PRO-004", name: "Chat & Call Mobile App", hours: "35/155 Hrs", pct: 50, priority: "High", pColor: "text-rose-600 bg-rose-500/10 border-rose-500/20" },
                  { id: "PRO-005", name: "Travel Planning Website", hours: "50/235 Hrs", pct: 60, priority: "Medium", pColor: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
                ].map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-semibold text-primary">{p.id}</td>
                    <td className="p-3 font-medium text-foreground">{p.name}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="w-16 text-[11px] text-muted-foreground">{p.hours}</span>
                        <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div style={{ width: `${p.pct}%` }} className="bg-primary h-full" />
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold border", p.pColor)}>
                        {p.priority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tasks Statistics Semi-Donut */}
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-foreground text-sm">Tasks Statistics</h4>
              <Badge variant="soft">124/165 Done</Badge>
            </div>
            <div className="min-h-[220px] flex items-center justify-center">
              <Suspense fallback={<div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">Loading Task Stats...</div>}>
                <Chart options={taskStatsOptions} series={taskStatsSeries} type="radialBar" height={220} />
              </Suspense>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-xs border-t border-border/60 pt-3">
              <div className="p-2 rounded bg-muted/20">
                <span className="text-muted-foreground block text-[11px]">Ongoing</span>
                <span className="font-bold text-amber-600">24%</span>
              </div>
              <div className="p-2 rounded bg-muted/20">
                <span className="text-muted-foreground block text-[11px]">On Hold</span>
                <span className="font-bold text-sky-600">10%</span>
              </div>
              <div className="p-2 rounded bg-muted/20">
                <span className="text-muted-foreground block text-[11px]">Overdue</span>
                <span className="font-bold text-rose-600">16%</span>
              </div>
              <div className="p-2 rounded bg-muted/20">
                <span className="text-muted-foreground block text-[11px]">Completed</span>
                <span className="font-bold text-emerald-600">50%</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900 text-white flex items-center justify-between mt-2">
            <div>
              <span className="text-xs font-bold text-emerald-400">389 / 689 Hrs</span>
              <p className="text-[10px] text-slate-300">Spent on overall tasks this week</p>
            </div>
            <i className="ti ti-clock text-xl text-slate-400" />
          </div>
        </div>
      </div>

      {/* Row 7: Interview Schedules, Recent Activities & Birthdays */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Schedules */}
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground text-sm">Upcoming Schedules</h4>
            <Link to="/hr/calendar" className="text-xs text-primary hover:underline">
              Full Calendar
            </Link>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-lg border border-border/80 bg-muted/20 space-y-2">
              <Badge variant="soft" className="text-[10px]">UI/UX Designer</Badge>
              <h6 className="text-xs font-semibold text-foreground">Interview Candidate - Sarah Jenkins</h6>
              <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                <span><i className="ti ti-calendar mr-1" />Today</span>
                <span><i className="ti ti-clock mr-1" />01:00 PM - 02:00 PM</span>
              </div>
              <Button size="xs" variant="primary" className="w-full mt-1">
                <i className="ti ti-video mr-1" /> Join Virtual Meeting
              </Button>
            </div>

            <div className="p-3 rounded-lg border border-border/80 bg-muted/20 space-y-2">
              <Badge variant="outline" className="text-[10px]">iOS Developer</Badge>
              <h6 className="text-xs font-semibold text-foreground">Technical Assessment - Alex Miller</h6>
              <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                <span><i className="ti ti-calendar mr-1" />Tomorrow</span>
                <span><i className="ti ti-clock mr-1" />03:30 PM - 04:30 PM</span>
              </div>
              <Button size="xs" variant="outline" className="w-full mt-1">
                <i className="ti ti-video mr-1" /> Join Meeting Room
              </Button>
            </div>
          </div>
        </div>

        {/* Recent Activities Feed */}
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground text-sm">Recent Activities</h4>
            <Link to="/activity-logs" className="text-xs text-primary hover:underline">
              Audit Logs
            </Link>
          </div>

          <div className="space-y-3">
            {[
              { user: "Matt Morgan", action: "Added new project milestone", target: "HRMS Portal", time: "10 mins ago" },
              { user: "Jay Ze", action: "Uploaded revised NDA agreement", target: "Contracts", time: "45 mins ago" },
              { user: "Mary Donald", action: "Approved leave request for", target: "Daniel Esbella", time: "1 hour ago" },
              { user: "George David", action: "Created procurement order", target: "Hardware PO#104", time: "2 hours ago" },
            ].map((act, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs">
                <div className="size-6 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  {act.user.charAt(0)}
                </div>
                <div>
                  <p className="text-foreground">
                    <span className="font-semibold">{act.user}</span> {act.action} <span className="text-primary font-medium">{act.target}</span>
                  </p>
                  <span className="text-[10px] text-muted-foreground">{act.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Birthdays Celebrations */}
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground text-sm">Celebrations & Birthdays</h4>
            <Badge variant="soft">Team Morale</Badge>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-amber-600 block">Today! 🎂</span>
                <h6 className="text-xs font-semibold text-foreground">Andrew Jermia</h6>
                <span className="text-[11px] text-muted-foreground">iOS Developer</span>
              </div>
              <Button size="xs" variant="primary" onClick={() => toast.success("Birthday wishes sent to Andrew!")}>
                Send Wishes
              </Button>
            </div>

            <div className="p-3 rounded-lg border border-border/80 bg-muted/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-medium text-muted-foreground block">Tomorrow</span>
                <h6 className="text-xs font-semibold text-foreground">Mary Zeen</h6>
                <span className="text-[11px] text-muted-foreground">UI/UX Designer</span>
              </div>
              <Button size="xs" variant="outline" onClick={() => toast.success("Reminder set for Mary's birthday!")}>
                Remind Me
              </Button>
            </div>

            <div className="p-3 rounded-lg border border-border/80 bg-muted/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-medium text-muted-foreground block">Jan 25</span>
                <h6 className="text-xs font-semibold text-foreground">Doglas Martini</h6>
                <span className="text-[11px] text-muted-foreground">.NET Lead</span>
              </div>
              <Button size="xs" variant="ghost" onClick={() => toast.success("Schedule card prepared!")}>
                Schedule Card
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
