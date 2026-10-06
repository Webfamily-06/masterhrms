import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Chart = lazy(() => import("react-apexcharts"));

export const Route = createFileRoute("/_authenticated/_app/employee-dashboard")({
  component: EmployeeDashboardPage,
  head: () => ({
    meta: [
      { title: "Employee Dashboard | Dreams ERP" },
      { name: "description", content: "Personal workplace hub, attendance punch, leaves, performance and tasks." },
    ],
  }),
});

export default function EmployeeDashboardPage() {
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentProfile();

  const [isMounted, setIsMounted] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);

  // Year & Filter States
  const [leaveYear, setLeaveYear] = useState("2026");
  const [balanceYear, setBalanceYear] = useState("2026");
  const [perfYear, setPerfYear] = useState("2026");
  const [skillsYear, setSkillsYear] = useState("2026");
  const [projectsFilter, setProjectsFilter] = useState("Ongoing Projects");
  const [tasksFilter, setTasksFilter] = useState("All Projects");
  const [meetingsFilter, setMeetingsFilter] = useState("Today");

  // Clock In / Punch State
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [punchTime, setPunchTime] = useState<string>("10:00 AM");
  const [elapsedSeconds, setElapsedSeconds] = useState(20732); // 5h 45m 32s initial

  // Modal State
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    employeeName: profile?.full_name || "Stephan Peralt",
    leaveTypeId: "Medical Leave",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    days: 1,
    reason: "",
  });

  // Interactive Tasks Checklist State
  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: "Patient appointment booking",
      status: "Onhold",
      statusColor: "bg-pink-500/10 text-pink-600 border border-pink-500/20",
      avatars: ["/ui-assets/avatar-01.jpg", "/ui-assets/avatar-02.jpg"],
      starred: false,
      completed: false,
    },
    {
      id: 2,
      title: "Appointment booking with payment",
      status: "Inprogress",
      statusColor: "bg-warning-transparent text-warning border border-warning/20",
      avatars: ["/ui-assets/avatar-03.jpg", "/ui-assets/avatar-04.jpg"],
      starred: true,
      completed: false,
    },
    {
      id: 3,
      title: "Patient and Doctor video conferencing",
      status: "Completed",
      statusColor: "bg-success-transparent text-success border border-success/20",
      avatars: ["/ui-assets/avatar-05.jpg", "/ui-assets/avatar-06.jpg"],
      starred: false,
      completed: true,
    },
    {
      id: 4,
      title: "Private chat module with doctor",
      status: "Pending",
      statusColor: "bg-danger-transparent text-danger border border-danger/20",
      avatars: ["/ui-assets/avatar-07.jpg", "/ui-assets/avatar-08.jpg"],
      starred: false,
      completed: false,
    },
  ]);

  // Interactive Notifications State
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      user: "Lex Murphy",
      avatar: "/ui-assets/avatar-02.jpg",
      action: "requested access to UNIX directory",
      time: "Today at 9:42 AM",
      hasApproval: true,
      decision: null as null | "approved" | "declined",
    },
    {
      id: 2,
      user: "Ray Arnold",
      avatar: "/ui-assets/avatar-03.jpg",
      action: "left 6 comments on",
      attachment: "Isla Nublar SOC2 Compliance Report v2",
      time: "Yesterday at 11:47 PM",
    },
    {
      id: 3,
      user: "Lex Murphy",
      avatar: "/ui-assets/avatar-04.jpg",
      action: "requested access to UNIX directory trees",
      time: "Today at 10:50 AM",
      hasApproval: true,
      decision: null as null | "approved" | "declined",
    },
  ]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Live timer for Punch Clock
  useEffect(() => {
    let interval: any = null;
    if (isClockedIn) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isClockedIn]);

  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Real DB Queries
  const { data: attendanceData = [] } = useQuery<any[]>({
    queryKey: ["my-attendance"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/attendance");
        return Array.isArray(res) ? res : res?.data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: leaves = [] } = useQuery<any[]>({
    queryKey: ["my-leaves"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/leaves");
        return Array.isArray(res) ? res : res?.data || [];
      } catch {
        return [];
      }
    },
  });

  // Real DB Queries & Today's Punch State
  const { data: essDashboard } = useQuery({
    queryKey: ["ess-dashboard"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/api/v1/me/dashboard");
        return res?.data || null;
      } catch {
        return null;
      }
    },
  });

  const { data: leaveBalances = [] } = useQuery({
    queryKey: ["my-leave-balances"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/api/v1/me/leave-balance");
        return Array.isArray(res?.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });

  useEffect(() => {
    if (essDashboard?.todayAttendance) {
      const att = essDashboard.todayAttendance;
      if (att.checkIn && !att.checkOut) {
        setIsClockedIn(true);
        const inDate = new Date(att.checkIn);
        setPunchTime(inDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        setElapsedSeconds(Math.max(0, Math.floor((Date.now() - inDate.getTime()) / 1000)));
      } else if (att.checkIn && att.checkOut) {
        setIsClockedIn(false);
        const inDate = new Date(att.checkIn);
        setPunchTime(inDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        if (att.hours) {
          setElapsedSeconds(Math.round(att.hours * 3600));
        }
      }
    }
  }, [essDashboard]);

  // Clock In/Out Mutation (Server authoritative timestamps)
  const handlePunchToggle = async () => {
    try {
      if (!isClockedIn) {
        setIsClockedIn(true);
        await api.post("/api/v1/me/attendance/check-in");
        const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setPunchTime(timeStr);
        setElapsedSeconds(0);
        toast.success(`Punch In Recorded at ${timeStr}`);
      } else {
        setIsClockedIn(false);
        await api.post("/api/v1/me/attendance/check-out");
        toast.info(`Punch Out Recorded. Session Duration: ${formatTimer(elapsedSeconds)}`);
      }
      queryClient.invalidateQueries({ queryKey: ["my-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["ess-dashboard"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to record punch status");
    }
  };

  // Apply Leave Mutation with dry-run policy validation
  const applyLeaveMutation = useMutation({
    mutationFn: async (payload: typeof leaveForm) => {
      // Pre-validation dry run against employee entitlement
      try {
        const valRes: any = await api.post("/api/v1/me/leaves/validate", {
          leaveTypeId: payload.leaveTypeId,
          startDate: payload.startDate,
          endDate: payload.endDate,
        });
        if (valRes && !valRes.valid && valRes.blockingIssues?.length > 0) {
          throw new Error(valRes.blockingIssues[0]);
        }
      } catch (e: any) {
        if (e.message) throw e;
      }

      return await api.post("/api/leaves", {
        leaveTypeId: payload.leaveTypeId,
        startDate: payload.startDate,
        endDate: payload.endDate,
        days: payload.days,
        reason: payload.reason,
      });
    },
    onSuccess: () => {
      toast.success("Leave request submitted successfully!");
      setLeaveModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["my-leaves"] });
      queryClient.invalidateQueries({ queryKey: ["my-leave-balances"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit leave request.");
    },
  });

  // Chart Configurations
  const leavesChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        height: 185,
        type: "donut",
        toolbar: { show: false },
      },
      colors: ["#0E82FD", "#F37335", "#03C95A", "#E70D0D"],
      labels: ["Emergency", "Casual", "Medical", "Annual"],
      series: [14, 28, 42, 16],
      legend: { show: false },
      dataLabels: { enabled: false },
      stroke: { width: 2, colors: ["#ffffff"] },
      plotOptions: {
        pie: {
          donut: {
            size: "70%",
            labels: {
              show: true,
              total: {
                show: true,
                label: "Total Leaves",
                formatter: () => "16",
                style: { fontSize: "12px", color: "#6B7280" },
              },
            },
          },
        },
      },
    }),
    []
  );

  const performanceChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        height: 273,
        type: "area",
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      colors: ["#03C95A"],
      dataLabels: { enabled: false },
      stroke: { curve: "straight", width: 2 },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.45,
          opacityTo: 0.05,
          stops: [0, 90, 100],
        },
      },
      grid: {
        borderColor: "#f1f5f9",
        padding: { left: -8, right: -4 },
      },
      xaxis: {
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
        labels: {
          style: { colors: "#6B7280", fontSize: "12px" },
        },
      },
      yaxis: {
        min: 10,
        max: 60,
        tickAmount: 5,
        labels: {
          offsetX: -10,
          style: { colors: "#6B7280", fontSize: "12px" },
          formatter: (val: number) => `${val}K`,
        },
      },
      tooltip: {
        y: {
          formatter: (val: number) => `${val}K Score`,
        },
      },
    }),
    []
  );

  return (
    <div className="space-y-4">
      {/* ── Page Header / Breadcrumb (Dreams ERP Standard) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-border-color">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">Employee Dashboard</h1>
          <div className="flex items-center gap-1.5 text-xs text-default">
            <Link to="/hrm-dashboard" className="hover:text-primary">Dashboard</Link>
            <i className="ph ph-caret-right text-[10px]"></i>
            <span className="text-gray-900 dark:text-gray-100 font-medium">Employee Portal</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toast.success("Exporting employee report...")}
            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border-color bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-700 cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <i className="ph-duotone ph-file-arrow-down text-sm"></i>
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={() => setLeaveModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary hover:bg-primary-hover text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <i className="ph-bold ph-plus text-xs"></i>
            <span>Apply Leave</span>
          </button>
        </div>
      </div>

      {/* ── Status Announcement Banner ── */}
      {!alertDismissed && (
        <div className="bg-primary/10 border border-primary/20 rounded-md p-3 flex items-center justify-between text-xs text-primary dark:text-primary-light">
          <div className="flex items-center gap-2">
            <i className="ph-duotone ph-check-circle text-base shrink-0"></i>
            <span>Your leave request for <strong>24th April 2026</strong> has been approved by HR Administration.</span>
          </div>
          <button
            type="button"
            onClick={() => setAlertDismissed(true)}
            className="text-primary hover:text-primary-hover p-1"
          >
            <i className="ph-bold ph-x text-xs"></i>
          </button>
        </div>
      )}

      {/* ── Section 1: Employee Passport & Leave Summary ── */}
      <div className="grid grid-cols-12 gap-4">
        {/* Passport Profile Card */}
        <div className="col-span-12 lg:col-span-4 bg-white dark:bg-slate-900 border border-border-color rounded-md overflow-hidden flex flex-col">
          <div className="bg-slate-900 text-white p-4 flex items-center gap-3">
            <div className="relative size-14 rounded-full border-2 border-white overflow-hidden shrink-0 bg-slate-800">
              <img
                src={profile?.avatar_url || "/ui-assets/avatar-03.jpg"}
                alt={profile?.full_name || "Employee"}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/ui-assets/avatar-03.jpg";
                }}
              />
              <span className="absolute bottom-0 right-0 size-3.5 bg-success rounded-full border-2 border-white"></span>
            </div>
            <div className="overflow-hidden">
              <h2 className="text-sm font-bold text-white leading-tight truncate">
                {profile?.full_name || "Stephan Peralt"}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 truncate">Senior Product Designer</p>
              <span className="inline-block text-[10px] bg-white/20 text-white px-2 py-0.5 rounded mt-1 font-medium">
                UI/UX Design Team
              </span>
            </div>
          </div>

          <div className="p-4 space-y-2.5 text-xs text-default flex-1">
            <div className="flex justify-between items-center py-1 border-b border-border-color/60">
              <span className="text-muted-foreground">Employee ID</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100 font-mono">#EMP-0492</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border-color/60">
              <span className="text-muted-foreground">Email Address</span>
              <span className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[180px]">
                {profile?.email || "stephan.peralt@workspace.com"}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border-color/60">
              <span className="text-muted-foreground">Reporting Manager</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">Doglas Martini</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border-color/60">
              <span className="text-muted-foreground">Shift & Work Mode</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">Regular (09:00 - 18:00) · Hybrid</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground">Date of Joining</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">15 Jan 2024</span>
            </div>
          </div>
        </div>

        {/* Leave Breakdown & Donut */}
        <div className="col-span-12 lg:col-span-4 bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-border-color">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Leave Distribution</h3>
            <span className="text-xs text-muted-foreground font-mono">{leaveYear}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 my-auto py-2 items-center">
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#0E82FD]"></span>
                <span className="text-default">Emergency:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">14 hrs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#F37335]"></span>
                <span className="text-default">Casual:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">28 hrs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#03C95A]"></span>
                <span className="text-default">Medical:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">42 hrs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#E70D0D]"></span>
                <span className="text-default">Annual:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">16 hrs</span>
              </div>
            </div>

            <div className="flex justify-center">
              {isMounted && (
                <Suspense fallback={<div className="p-4 text-center"><Loader2 className="animate-spin size-4" /></div>}>
                  <Chart options={leavesChartOptions} series={leavesChartOptions.series} type="donut" height={160} />
                </Suspense>
              )}
            </div>
          </div>

          <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded border border-border-color/60 text-[11px] text-default flex items-center gap-2">
            <i className="ph-duotone ph-shield-check text-success text-base shrink-0"></i>
            <span>Attendance score is better than <strong>85%</strong> of peer team members.</span>
          </div>
        </div>

        {/* Leave Balance Counters */}
        <div className="col-span-12 lg:col-span-4 bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-border-color">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Leave Balance Summary</h3>
            <span className="text-xs text-muted-foreground font-mono">{balanceYear}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 my-auto py-2">
            <div className="p-2.5 rounded-md border border-border-color bg-slate-50/50 dark:bg-slate-800/30 text-center">
              <span className="text-[11px] text-default block mb-0.5">Total Allowed</span>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">16</p>
            </div>
            <div className="p-2.5 rounded-md border border-border-color bg-slate-50/50 dark:bg-slate-800/30 text-center">
              <span className="text-[11px] text-default block mb-0.5">Days Taken</span>
              <p className="text-lg font-bold text-primary">10</p>
            </div>
            <div className="p-2.5 rounded-md border border-border-color bg-slate-50/50 dark:bg-slate-800/30 text-center">
              <span className="text-[11px] text-default block mb-0.5">Remaining</span>
              <p className="text-lg font-bold text-success">6</p>
            </div>
            <div className="p-2.5 rounded-md border border-border-color bg-slate-50/50 dark:bg-slate-800/30 text-center">
              <span className="text-[11px] text-default block mb-0.5">Unpaid Leave</span>
              <p className="text-lg font-bold text-warning">2</p>
            </div>
            <div className="p-2.5 rounded-md border border-border-color bg-slate-50/50 dark:bg-slate-800/30 text-center">
              <span className="text-[11px] text-default block mb-0.5">Pending</span>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">0</p>
            </div>
            <div className="p-2.5 rounded-md border border-border-color bg-slate-50/50 dark:bg-slate-800/30 text-center">
              <span className="text-[11px] text-default block mb-0.5">Worked Days</span>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">240</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setLeaveModalOpen(true)}
            className="w-full py-2 text-xs font-semibold rounded-md border border-dark bg-dark text-white hover:bg-primary-hover hover:border-primary-hover cursor-pointer transition-colors shadow-xs"
          >
            Submit Leave Request
          </button>
        </div>
      </div>

      {/* ── Section 2: Punch Clock & Daily Hours Tracking ── */}
      <div className="grid grid-cols-12 gap-4">
        {/* Interactive Punch Clock */}
        <div className="col-span-12 lg:col-span-4 bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 text-center flex flex-col justify-between">
          <div className="pb-2 border-b border-border-color flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Time Clock</h3>
            <span className="text-xs text-muted-foreground">Today</span>
          </div>

          <div className="py-4">
            <div className="relative size-36 mx-auto mb-3 flex items-center justify-center">
              <svg width="144" height="144" className="rotate-[-90deg]">
                <circle cx="72" cy="72" r="60" stroke="#F1F5F9" strokeWidth="8" fill="none" className="dark:stroke-slate-800" />
                <circle
                  cx="72"
                  cy="72"
                  r="60"
                  stroke={isClockedIn ? "#03C95A" : "#0E82FD"}
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={377}
                  strokeDashoffset={377 - (65 / 100) * 377}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[11px] text-muted-foreground uppercase font-medium">Logged Time</span>
                <span className="text-xl font-mono font-bold text-gray-900 dark:text-gray-100">
                  {formatTimer(elapsedSeconds)}
                </span>
                <span className="text-[10px] text-success font-medium">Target: 8.5h</span>
              </div>
            </div>

            <p className="text-xs text-default mb-3">
              Punch In recorded at <strong className="text-gray-900 dark:text-gray-100">{punchTime}</strong>
            </p>

            <button
              type="button"
              onClick={handlePunchToggle}
              className={`w-full py-2.5 text-xs font-bold rounded-md text-white transition-colors cursor-pointer shadow-sm ${
                isClockedIn ? "bg-danger hover:bg-danger/90" : "bg-primary hover:bg-primary-hover"
              }`}
            >
              <i className={`ph-bold ${isClockedIn ? "ph-sign-out" : "ph-sign-in"} me-1.5`}></i>
              {isClockedIn ? "Punch Out" : "Punch In"}
            </button>
          </div>

          <div className="text-[11px] text-muted-foreground border-t border-border-color pt-2 flex justify-between">
            <span>Location: HQ Office</span>
            <span>IP: 192.168.1.104</span>
          </div>
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="col-span-12 lg:col-span-8 flex flex-col justify-between gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-default">Today's Hours</span>
                <div className="size-7 rounded bg-primary/10 text-primary flex items-center justify-center">
                  <i className="ph-duotone ph-clock text-base"></i>
                </div>
              </div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-0.5">8.36 / 9</h4>
              <span className="text-[10px] text-success font-medium">+5% vs avg</span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-default">Week Total</span>
                <div className="size-7 rounded bg-slate-900/10 text-slate-800 dark:text-slate-200 flex items-center justify-center">
                  <i className="ph-duotone ph-calendar-check text-base"></i>
                </div>
              </div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-0.5">32.5 / 40</h4>
              <span className="text-[10px] text-success font-medium">On track</span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-default">Month Total</span>
                <div className="size-7 rounded bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <i className="ph-duotone ph-chart-bar text-base"></i>
                </div>
              </div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-0.5">142 / 168</h4>
              <span className="text-[10px] text-default font-medium">84.5% complete</span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-default">Overtime</span>
                <div className="size-7 rounded bg-warning/10 text-warning flex items-center justify-center">
                  <i className="ph-duotone ph-timer text-base"></i>
                </div>
              </div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-0.5">12.5 hrs</h4>
              <span className="text-[10px] text-warning font-medium">Approved by lead</span>
            </div>
          </div>

          {/* Daily Timeline Bar */}
          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                Shift Activity Breakdown
              </h4>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-success"></span> Productive (8.2h)</span>
                <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-warning"></span> Break (45m)</span>
                <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-primary"></span> Meetings (1.5h)</span>
              </div>
            </div>

            <div className="h-5 w-full bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden flex gap-0.5 p-0.5">
              <div className="h-full bg-success rounded-xs" style={{ width: "35%" }} title="Productive"></div>
              <div className="h-full bg-warning rounded-xs" style={{ width: "10%" }} title="Lunch Break"></div>
              <div className="h-full bg-primary rounded-xs" style={{ width: "20%" }} title="Design Sprint Sync"></div>
              <div className="h-full bg-success rounded-xs" style={{ width: "25%" }} title="Productive Deep Work"></div>
              <div className="h-full bg-slate-300 dark:bg-slate-700 rounded-xs" style={{ width: "10%" }} title="Unfilled Shift"></div>
            </div>

            <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
              <span>09:00 AM</span>
              <span>11:00 AM</span>
              <span>01:00 PM</span>
              <span>03:00 PM</span>
              <span>05:00 PM</span>
              <span>07:00 PM</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 3: Tasks Checklist & Assigned Projects ── */}
      <div className="grid grid-cols-12 gap-4">
        {/* Interactive Tasks Checklist */}
        <div className="col-span-12 lg:col-span-7 bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <div className="flex items-center justify-between pb-3 border-b border-border-color mb-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">My Priority Tasks</h3>
            <span className="text-xs text-muted-foreground">{tasks.filter((t) => t.completed).length} of {tasks.length} Completed</span>
          </div>

          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-2.5 rounded-md border border-border-color hover:bg-slate-50/50 dark:hover:bg-slate-800/40 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() =>
                      setTasks((prev) =>
                        prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
                      )
                    }
                    className="size-4 rounded border-border-color text-primary focus:ring-0 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setTasks((prev) =>
                        prev.map((t) => (t.id === task.id ? { ...t, starred: !t.starred } : t))
                      )
                    }
                    className="text-muted-foreground hover:text-warning"
                  >
                    <i className={`ph-fill ${task.starred ? "ph-star text-warning" : "ph-star text-slate-300 dark:text-slate-600"}`}></i>
                  </button>
                  <span
                    className={`text-xs font-medium truncate ${
                      task.completed ? "line-through text-muted-foreground" : "text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    {task.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${task.statusColor}`}>
                    {task.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Assigned Projects */}
        <div className="col-span-12 lg:col-span-5 bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-border-color mb-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Assigned Projects</h3>
            <span className="text-xs text-muted-foreground font-mono">{projectsFilter}</span>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-md border border-border-color bg-slate-50/40 dark:bg-slate-800/30">
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">ERP Redesign & Component Library</h4>
                <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">In Progress</span>
              </div>
              <p className="text-[11px] text-default mb-2">Lead: Anthony Lewis · Due 15 Jul 2026</p>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: "72%" }}></div>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>72% completed</span>
                <span>18/25 Tasks</span>
              </div>
            </div>

            <div className="p-3 rounded-md border border-border-color bg-slate-50/40 dark:bg-slate-800/30">
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">Mobile Attendance Geo-fencing</h4>
                <span className="text-[10px] font-semibold text-success bg-success-transparent px-2 py-0.5 rounded">Testing</span>
              </div>
              <p className="text-[11px] text-default mb-2">Lead: Stephan Peralt · Due 30 Aug 2026</p>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div className="bg-success h-full rounded-full" style={{ width: "90%" }}></div>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>90% completed</span>
                <span>9/10 Tasks</span>
              </div>
            </div>
          </div>

          <Link
            to="/projects"
            className="w-full py-2 text-xs font-semibold rounded-md border border-border-color bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-700 text-center block mt-3 shadow-xs"
          >
            View All Projects
          </Link>
        </div>
      </div>

      {/* ── Section 4: Performance & Skills ── */}
      <div className="grid grid-cols-12 gap-4">
        {/* Performance Curve */}
        <div className="col-span-12 lg:col-span-7 bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <div className="flex items-center justify-between pb-3 border-b border-border-color mb-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Performance Review History</h3>
            <span className="text-xs text-success font-medium bg-success-transparent px-2 py-0.5 rounded-md">
              +12% vs last year
            </span>
          </div>

          {isMounted && (
            <Suspense fallback={<div className="p-8 text-center"><Loader2 className="animate-spin size-6 mx-auto text-primary" /></div>}>
              <Chart options={performanceChartOptions} series={[{ name: "Performance", data: [20, 35, 45, 38, 52, 48, 58] }]} type="area" height={240} />
            </Suspense>
          )}
        </div>

        {/* My Skills Tracker */}
        <div className="col-span-12 lg:col-span-5 bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
          <div className="flex items-center justify-between pb-3 border-b border-border-color mb-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Professional Skills</h3>
            <span className="text-xs text-muted-foreground font-mono">{skillsYear}</span>
          </div>

          <div className="space-y-3">
            {[
              { name: "Figma & UI Design Systems", level: 95, color: "bg-primary" },
              { name: "HTML & Modern CSS / Tailwind", level: 88, color: "bg-success" },
              { name: "React & TypeScript", level: 82, color: "bg-indigo" },
              { name: "Design Sprint & UX Research", level: 75, color: "bg-warning" },
            ].map((skill, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{skill.name}</span>
                  <span className="font-mono text-default">{skill.level}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${skill.color}`} style={{ width: `${skill.level}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Add Leave Modal ── */}
      <Dialog open={leaveModalOpen} onOpenChange={setLeaveModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 p-5 rounded-md border border-border-color">
          <DialogHeader className="pb-3 border-b border-border-color">
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100">
              Apply For Leave
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              applyLeaveMutation.mutate(leaveForm);
            }}
            className="space-y-3 mt-3 text-xs"
          >
            <div>
              <label className="font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Leave Type *</label>
              <select
                value={leaveForm.leaveTypeId}
                onChange={(e) => setLeaveForm({ ...leaveForm, leaveTypeId: e.target.value })}
                className="w-full px-3 py-2 border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="Medical Leave">Medical Leave</option>
                <option value="Casual Leave">Casual Leave</option>
                <option value="Annual Leave">Annual Leave</option>
                <option value="Maternity / Paternity">Maternity / Paternity</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Start Date *</label>
                <input
                  type="date"
                  value={leaveForm.startDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-900 dark:text-gray-100 mb-1 block">End Date *</label>
                <input
                  type="date"
                  value={leaveForm.endDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Number of Days</label>
              <input
                type="number"
                min={1}
                value={leaveForm.days}
                onChange={(e) => setLeaveForm({ ...leaveForm, days: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Reason for Leave</label>
              <textarea
                rows={3}
                placeholder="Briefly state reason for your leave request..."
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                className="w-full px-3 py-2 border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              ></textarea>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border-color">
              <button
                type="button"
                onClick={() => setLeaveModalOpen(false)}
                className="px-3 py-1.5 rounded-md border border-border-color bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={applyLeaveMutation.isPending}
                className="px-4 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-white font-semibold cursor-pointer shadow-xs"
              >
                {applyLeaveMutation.isPending ? "Submitting..." : "Submit Leave Request"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
