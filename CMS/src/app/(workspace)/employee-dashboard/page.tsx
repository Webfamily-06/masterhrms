'use client';

import { Link } from "@/src/lib/router-compat";
import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Chart = lazy(() => import("react-apexcharts"));

// ── SVG Circle Progress Component (Faithful to SmartHR circle-progress.js) ──
function CircleProgress({
  value,
  color = "#0d6efd",
  size = 48,
  strokeWidth = 4,
}: {
  value: number;
  color?: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[11px] font-bold text-slate-800 dark:text-slate-200">
        {value}%
      </span>
    </div>
  );
}

// ── Attendance Radial Clock ──
function AttendanceRadialClock({
  timeText = "5:45:32",
}: {
  timeText?: string;
}) {
  const size = 150;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - 0.65 * circumference;
  return (
    <div
      className="relative inline-flex items-center justify-center my-3"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#10B981"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute text-center flex flex-col items-center justify-center">
        <span className="text-[11px] text-muted-foreground">Total Hours</span>
        <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          {timeText}
        </span>
      </div>
    </div>
  );
}

export default function EmployeeDashboardPage() {
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentProfile();

  const [isMounted, setIsMounted] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);

  // Filter dropdown states
  const [leaveYear, setLeaveYear] = useState("2026");
  const [balanceYear, setBalanceYear] = useState("2026");
  const [perfYear, setPerfYear] = useState("2026");
  const [skillsYear, setSkillsYear] = useState("2026");
  const [projectsFilter, setProjectsFilter] = useState("Ongoing Projects");
  const [tasksFilter, setTasksFilter] = useState("All Projects");
  const [meetingsFilter, setMeetingsFilter] = useState("Today");

  // Clock In / Punch State
  const [isClockedIn, setIsClockedIn] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(20732); // 5h 45m 32s

  // Modals
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [leaveForm, setLeaveForm] = useState({
    employeeName: "Stephan Peralt",
    leaveType: "Medical Leave",
    from: "15/04/2026",
    to: "18/04/2026",
    days: "3",
    remaining: "16",
    reason: "",
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Timer simulation for Clock
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

  // 1. Leaves Donut Chart (#leaves_chart)
  const leavesChartOptions = useMemo<any>(
    () => ({
      chart: {
        height: 185,
        type: "donut",
        toolbar: { show: false },
        fontFamily: "inherit",
      },
      series: [15, 10, 5, 10, 60],
      labels: ["On Time", "Late", "Absent", "WFH", "Sick Leave"],
      colors: ["#0C4B5E", "#03C95A", "#F26522", "#E70D0D", "#FFC107"],
      dataLabels: { enabled: false },
      legend: { show: false },
      plotOptions: {
        pie: {
          donut: {
            size: "68%",
          },
        },
      },
      stroke: { width: 0 },
      tooltip: { theme: "dark" },
    }),
    []
  );

  // 2. Performance Area Chart (#performance_chart2)
  const performanceChartOptions = useMemo<any>(
    () => ({
      series: [
        {
          name: "Performance",
          data: [20, 20, 35, 35, 40, 60, 60],
        },
      ],
      chart: {
        height: 270,
        type: "area",
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: "inherit",
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
        },
      },
      grid: {
        borderColor: "#E2E8F0",
        strokeDashArray: 4,
        padding: { left: -8, right: -4 },
      },
      xaxis: {
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
        labels: { style: { colors: "#94A3B8", fontSize: "11px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        min: 10,
        max: 60,
        tickAmount: 5,
        labels: {
          style: { colors: "#94A3B8", fontSize: "11px" },
          formatter: (val: number) => `${val}K`,
        },
      },
      tooltip: { theme: "dark" },
    }),
    []
  );

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Leave application submitted successfully!");
    setLeaveModalOpen(false);
  };

  return (
    <div className="w-full min-w-0 space-y-5">
      {/* ── Breadcrumb & Actions Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 page-breadcrumb">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
            Employee Dashboard
          </h2>
          <nav>
            <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <li>
                <Link
                  to="/tenant/dashboard"
                  className="hover:text-primary inline-flex items-center"
                >
                  <i className="ti ti-smart-home text-sm mr-1"></i>
                </Link>
              </li>
              <li>/</li>
              <li>Dashboard</li>
              <li>/</li>
              <li className="text-slate-900 dark:text-white font-medium">
                Employee Dashboard
              </li>
            </ol>
          </nav>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Export Dropdown */}
          <div className="relative group">
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-card border border-border-color rounded-lg shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 transition-colors"
              onClick={() => toast.success("Exporting employee report...")}
            >
              <i className="ti ti-file-export text-slate-600 dark:text-slate-300"></i>
              Export
            </button>
          </div>

          {/* Date Picker Input */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
              <i className="ti ti-calendar text-xs"></i>
            </span>
            <input
              type="text"
              readOnly
              value="15-04-2025"
              className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-card border border-border-color rounded-lg focus:outline-none w-[120px] text-slate-700 dark:text-slate-200"
            />
          </div>

          {/* Collapse icon */}
          <button
            type="button"
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Collapse"
          >
            <i className="ti ti-chevrons-up text-base"></i>
          </button>
        </div>
      </div>

      {/* ── Status Announcement Banner ── */}
      {!alertDismissed && (
        <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 rounded-xl p-3 px-4 flex items-center justify-between text-xs text-blue-900 dark:text-blue-200 transition-all">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span>
              Your Leave Request on{" "}
              <strong className="font-semibold">“24th April 2024”</strong> has
              been Approved!!!
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAlertDismissed(true)}
            className="text-blue-700 dark:text-blue-300 hover:text-blue-900 p-1"
            aria-label="Close alert"
          >
            <i className="ti ti-x text-sm"></i>
          </button>
        </div>
      )}

      {/* ── ROW 1: Profile Card + Leave Donut + Leave Balance ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
        {/* Col 1: Profile Passport Card */}
        <div className="lg:col-span-4 bg-white dark:bg-card border border-border-color rounded-xl overflow-hidden shadow-xs flex flex-col justify-between">
          <div className="bg-slate-900 p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="relative size-14 rounded-full border-2 border-white overflow-hidden shrink-0 bg-slate-800">
                <img
                  src={profile?.avatar_url || "/assets/img/users/user-01.jpg"}
                  alt="Employee"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-0 right-0 size-4 bg-white rounded-full flex items-center justify-center">
                  <i className="ti ti-discount-check-filled text-emerald-500 text-xs"></i>
                </span>
              </div>
              <div className="min-w-0">
                <h5 className="text-white text-base font-bold truncate mb-0.5">
                  {profile?.full_name || "Stephan Peralt"}
                </h5>
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <span className="truncate">Senior Product Designer</span>
                  <span className="size-1 rounded-full bg-primary shrink-0"></span>
                  <span className="text-slate-400">UI/UX Design</span>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 space-y-3 text-xs">
            <div>
              <span className="block text-muted-foreground text-[11px] mb-0.5">
                Phone Number
              </span>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                +1 324 3453 545
              </p>
            </div>
            <div>
              <span className="block text-muted-foreground text-[11px] mb-0.5">
                Email Address
              </span>
              <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {profile?.email || "steperde124@example.com"}
              </p>
            </div>
            <div>
              <span className="block text-muted-foreground text-[11px] mb-0.5">
                Report Office
              </span>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Doglas Martini
              </p>
            </div>
            <div>
              <span className="block text-muted-foreground text-[11px] mb-0.5">
                Joined on
              </span>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                15 Jan 2024
              </p>
            </div>
          </div>
        </div>

        {/* Col 2: Leave Details Donut Chart */}
        <div className="lg:col-span-5 bg-white dark:bg-card border border-border-color rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h5 className="font-bold text-slate-900 dark:text-white text-sm mb-0">
              Leave Details
            </h5>
            <div className="relative">
              <select
                value={leaveYear}
                onChange={(e) => setLeaveYear(e.target.value)}
                className="text-xs bg-white dark:bg-card border border-border-color rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4 py-2">
            <div className="sm:col-span-6 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-slate-900"></span>
                <span className="font-bold text-slate-900 dark:text-white">
                  1254
                </span>
                <span className="text-muted-foreground">on time</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500"></span>
                <span className="font-bold text-slate-900 dark:text-white">
                  32
                </span>
                <span className="text-muted-foreground">Late Attendance</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-blue-600"></span>
                <span className="font-bold text-slate-900 dark:text-white">
                  658
                </span>
                <span className="text-muted-foreground">Work From Home</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-rose-500"></span>
                <span className="font-bold text-slate-900 dark:text-white">
                  14
                </span>
                <span className="text-muted-foreground">Absent</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-amber-500"></span>
                <span className="font-bold text-slate-900 dark:text-white">
                  68
                </span>
                <span className="text-muted-foreground">Sick Leave</span>
              </div>
            </div>

            <div className="sm:col-span-6 flex items-center justify-center min-h-[175px]">
              {isMounted && (
                <Suspense
                  fallback={
                    <div className="h-[175px] flex items-center justify-center text-xs text-muted-foreground">
                      Loading chart...
                    </div>
                  }
                >
                  <Chart
                    options={leavesChartOptions}
                    series={leavesChartOptions.series}
                    type="donut"
                    height={185}
                  />
                </Suspense>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-border-color">
            <p className="flex items-center gap-2 text-xs text-muted-foreground mb-0">
              <span className="size-4 rounded bg-primary text-white flex items-center justify-center text-[10px]">
                <i className="ti ti-check font-bold"></i>
              </span>
              Better than{" "}
              <span className="font-bold text-slate-900 dark:text-white">
                85%
              </span>{" "}
              of Employees
            </p>
          </div>
        </div>

        {/* Col 3: Leave Balance Summary */}
        <div className="lg:col-span-3 bg-white dark:bg-card border border-border-color rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-bold text-slate-900 dark:text-white text-sm mb-0">
              Leave Details
            </h5>
            <select
              value={balanceYear}
              onChange={(e) => setBalanceYear(e.target.value)}
              className="text-xs bg-white dark:bg-card border border-border-color rounded-lg px-2 py-1 text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs mb-4">
            <div className="border border-border-color/60 rounded-lg p-2.5 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="block text-[11px] text-muted-foreground mb-0.5">
                Total Leaves
              </span>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                16
              </h4>
            </div>
            <div className="border border-border-color/60 rounded-lg p-2.5 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="block text-[11px] text-muted-foreground mb-0.5">
                Taken
              </span>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                10
              </h4>
            </div>
            <div className="border border-border-color/60 rounded-lg p-2.5 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="block text-[11px] text-muted-foreground mb-0.5">
                Absent
              </span>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                2
              </h4>
            </div>
            <div className="border border-border-color/60 rounded-lg p-2.5 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="block text-[11px] text-muted-foreground mb-0.5">
                Request
              </span>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                0
              </h4>
            </div>
            <div className="border border-border-color/60 rounded-lg p-2.5 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="block text-[11px] text-muted-foreground mb-0.5">
                Worked Days
              </span>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                240
              </h4>
            </div>
            <div className="border border-border-color/60 rounded-lg p-2.5 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="block text-[11px] text-muted-foreground mb-0.5">
                Loss of Pay
              </span>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                2
              </h4>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setLeaveModalOpen(true)}
            className="w-full py-2 px-3 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors text-center shadow-xs"
          >
            Apply New Leave
          </button>
        </div>
      </div>

      {/* ── ROW 2: Attendance Punch Clock + Hourly Timeline ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Col 1: Attendance Radial Clock */}
        <div className="lg:col-span-4 bg-white dark:bg-card border-2 border-primary/40 rounded-xl p-4 shadow-xs flex flex-col items-center justify-between text-center bg-radial from-blue-50/30 to-white dark:from-slate-900 dark:to-card">
          <div className="mb-2">
            <h6 className="text-xs font-medium text-slate-500 mb-0.5">
              Attendance
            </h6>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              08:35 AM, 11 Mar 2025
            </h4>
          </div>

          <AttendanceRadialClock timeText={formatTimer(elapsedSeconds)} />

          <div className="w-full space-y-3">
            <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-slate-900 text-white">
              Production : 3.45 hrs
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
              <i className="ti ti-fingerprint text-primary text-base"></i>
              <span>Punch In at 10.00 AM</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsClockedIn(!isClockedIn);
                toast.info(
                  isClockedIn
                    ? "Successfully punched out."
                    : "Successfully punched in!"
                );
              }}
              className={`w-full py-2.5 px-4 text-xs font-bold rounded-lg transition-colors ${
                isClockedIn
                  ? "bg-primary hover:bg-primary/90 text-white shadow-xs"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {isClockedIn ? "Punch Out" : "Punch In"}
            </button>
          </div>
        </div>

        {/* Col 2: 4 Top KPI Cards + Segmented Working Hours Progress Bar */}
        <div className="lg:col-span-8 flex flex-col justify-between gap-4">
          {/* 4 KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-card border border-border-color rounded-xl p-3.5 shadow-xs">
              <div className="border-b border-border-color/60 pb-2 mb-2">
                <span className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                  <i className="ti ti-clock-stop text-base"></i>
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-0.5">
                  8.36 / <span className="text-xs text-slate-400 font-normal">9</span>
                </h3>
                <p className="text-[11px] text-muted-foreground truncate font-medium mb-0">
                  Total Hours Today
                </p>
              </div>
              <p className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold mb-0">
                <span className="size-4 rounded-full bg-emerald-100 flex items-center justify-center text-[10px]">
                  <i className="ti ti-arrow-up"></i>
                </span>
                <span>5% This Week</span>
              </p>
            </div>

            <div className="bg-white dark:bg-card border border-border-color rounded-xl p-3.5 shadow-xs">
              <div className="border-b border-border-color/60 pb-2 mb-2">
                <span className="size-8 rounded-lg bg-slate-900 text-white flex items-center justify-center mb-2">
                  <i className="ti ti-clock-up text-base"></i>
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-0.5">
                  10 / <span className="text-xs text-slate-400 font-normal">40</span>
                </h3>
                <p className="text-[11px] text-muted-foreground truncate font-medium mb-0">
                  Total Hours Week
                </p>
              </div>
              <p className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold mb-0">
                <span className="size-4 rounded-full bg-emerald-100 flex items-center justify-center text-[10px]">
                  <i className="ti ti-arrow-up"></i>
                </span>
                <span>7% Last Week</span>
              </p>
            </div>

            <div className="bg-white dark:bg-card border border-border-color rounded-xl p-3.5 shadow-xs">
              <div className="border-b border-border-color/60 pb-2 mb-2">
                <span className="size-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center mb-2">
                  <i className="ti ti-calendar-up text-base"></i>
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-0.5">
                  75 / <span className="text-xs text-slate-400 font-normal">98</span>
                </h3>
                <p className="text-[11px] text-muted-foreground truncate font-medium mb-0">
                  Total Hours Month
                </p>
              </div>
              <p className="flex items-center gap-1.5 text-[11px] text-rose-600 font-semibold mb-0">
                <span className="size-4 rounded-full bg-rose-100 flex items-center justify-center text-[10px]">
                  <i className="ti ti-arrow-down"></i>
                </span>
                <span>8% Last Month</span>
              </p>
            </div>

            <div className="bg-white dark:bg-card border border-border-color rounded-xl p-3.5 shadow-xs">
              <div className="border-b border-border-color/60 pb-2 mb-2">
                <span className="size-8 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center mb-2">
                  <i className="ti ti-calendar-star text-base"></i>
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-0.5">
                  16 / <span className="text-xs text-slate-400 font-normal">28</span>
                </h3>
                <p className="text-[11px] text-muted-foreground truncate font-medium mb-0">
                  Overtime this Month
                </p>
              </div>
              <p className="flex items-center gap-1.5 text-[11px] text-rose-600 font-semibold mb-0">
                <span className="size-4 rounded-full bg-rose-100 flex items-center justify-center text-[10px]">
                  <i className="ti ti-arrow-down"></i>
                </span>
                <span>6% Last Month</span>
              </p>
            </div>
          </div>

          {/* Segmented Working Hours Timeline */}
          <div className="bg-white dark:bg-card border border-border-color rounded-xl p-4 shadow-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div>
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground mb-0.5">
                  <span className="size-2 rounded-full bg-slate-700"></span>
                  Total Working hours
                </p>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  12h 36m
                </h4>
              </div>
              <div>
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground mb-0.5">
                  <span className="size-2 rounded-full bg-emerald-500"></span>
                  Productive Hours
                </p>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  08h 36m
                </h4>
              </div>
              <div>
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground mb-0.5">
                  <span className="size-2 rounded-full bg-amber-500"></span>
                  Break hours
                </p>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  22m 15s
                </h4>
              </div>
              <div>
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground mb-0.5">
                  <span className="size-2 rounded-full bg-sky-500"></span>
                  Overtime
                </p>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  02h 15m
                </h4>
              </div>
            </div>

            {/* Segmented Timeline Bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-lg h-6 flex overflow-hidden p-1 gap-1 mb-2">
              <div className="bg-emerald-500 rounded h-full" style={{ width: "22%" }}></div>
              <div className="bg-amber-400 rounded h-full" style={{ width: "7%" }}></div>
              <div className="bg-emerald-500 rounded h-full" style={{ width: "28%" }}></div>
              <div className="bg-amber-400 rounded h-full" style={{ width: "12%" }}></div>
              <div className="bg-emerald-500 rounded h-full" style={{ width: "20%" }}></div>
              <div className="bg-sky-500 rounded h-full" style={{ width: "11%" }}></div>
            </div>

            {/* Timestamps */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>06:00</span>
              <span>07:00</span>
              <span>08:00</span>
              <span>09:00</span>
              <span>10:00</span>
              <span>11:00</span>
              <span>12:00</span>
              <span>01:00</span>
              <span>02:00</span>
              <span>03:00</span>
              <span>04:00</span>
              <span>05:00</span>
              <span>06:00</span>
              <span>07:00</span>
              <span>08:00</span>
              <span>09:00</span>
              <span>10:00</span>
              <span>11:00</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 3: Projects + Tasks ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Col 1: Projects Card */}
        <div className="lg:col-span-6 bg-white dark:bg-card border border-border-color rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-bold text-slate-900 dark:text-white text-sm mb-0">
              Projects
            </h5>
            <select
              value={projectsFilter}
              onChange={(e) => setProjectsFilter(e.target.value)}
              className="text-xs bg-white dark:bg-card border border-border-color rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="Ongoing Projects">Ongoing Projects</option>
              <option value="All Projects">All Projects</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project Item 1 */}
            <div className="border border-border-color rounded-xl p-3 bg-slate-50/40 dark:bg-slate-800/20">
              <div className="flex items-center justify-between mb-2.5">
                <h6 className="font-bold text-slate-900 dark:text-white text-xs mb-0">
                  Office Management
                </h6>
                <button
                  type="button"
                  onClick={() => setEditTaskOpen(true)}
                  className="text-slate-400 hover:text-slate-700 p-1"
                >
                  <i className="ti ti-dots-vertical text-sm"></i>
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <img
                    src="/assets/img/users/user-32.jpg"
                    alt="Anthony Lewis"
                    className="size-7 rounded-full object-cover"
                  />
                  <div>
                    <h6 className="font-medium text-slate-900 dark:text-white text-xs mb-0">
                      Anthony Lewis
                    </h6>
                    <span className="text-[11px] text-muted-foreground">
                      Project Leader
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <i className="ti ti-calendar text-xs"></i>
                  </span>
                  <div>
                    <h6 className="font-medium text-slate-900 dark:text-white text-xs mb-0">
                      14 Jan 2024
                    </h6>
                    <span className="text-[11px] text-muted-foreground">
                      Deadline
                    </span>
                  </div>
                </div>

                <div className="border border-dashed border-border-color rounded-lg p-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="size-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px]">
                      <i className="ti ti-checklist"></i>
                    </span>
                    <span>
                      Tasks :{" "}
                      <strong className="text-slate-900 dark:text-white">
                        6
                      </strong>{" "}
                      /10
                    </span>
                  </div>
                  <div className="flex -space-x-1.5 overflow-hidden">
                    <img
                      className="inline-block size-5 rounded-full ring-2 ring-white object-cover"
                      src="/assets/img/profiles/avatar-06.jpg"
                      alt="member"
                    />
                    <img
                      className="inline-block size-5 rounded-full ring-2 ring-white object-cover"
                      src="/assets/img/profiles/avatar-07.jpg"
                      alt="member"
                    />
                    <img
                      className="inline-block size-5 rounded-full ring-2 ring-white object-cover"
                      src="/assets/img/profiles/avatar-08.jpg"
                      alt="member"
                    />
                    <span className="inline-flex items-center justify-center size-5 rounded-full bg-primary text-white text-[9px] font-bold ring-2 ring-white">
                      +2
                    </span>
                  </div>
                </div>

                <div className="bg-slate-200/60 dark:bg-slate-800 p-2 rounded-lg flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300 text-xs">
                    Time Spent
                  </span>
                  <h6 className="font-bold text-slate-900 dark:text-white text-xs mb-0">
                    65/120 <span className="font-normal text-[10px]">Hrs</span>
                  </h6>
                </div>
              </div>
            </div>

            {/* Project Item 2 */}
            <div className="border border-border-color rounded-xl p-3 bg-slate-50/40 dark:bg-slate-800/20">
              <div className="flex items-center justify-between mb-2.5">
                <h6 className="font-bold text-slate-900 dark:text-white text-xs mb-0">
                  Office Management
                </h6>
                <button
                  type="button"
                  onClick={() => setEditTaskOpen(true)}
                  className="text-slate-400 hover:text-slate-700 p-1"
                >
                  <i className="ti ti-dots-vertical text-sm"></i>
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <img
                    src="/assets/img/users/user-33.jpg"
                    alt="Anthony Lewis"
                    className="size-7 rounded-full object-cover"
                  />
                  <div>
                    <h6 className="font-medium text-slate-900 dark:text-white text-xs mb-0">
                      Anthony Lewis
                    </h6>
                    <span className="text-[11px] text-muted-foreground">
                      Project Leader
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <i className="ti ti-calendar text-xs"></i>
                  </span>
                  <div>
                    <h6 className="font-medium text-slate-900 dark:text-white text-xs mb-0">
                      14 Jan 2024
                    </h6>
                    <span className="text-[11px] text-muted-foreground">
                      Deadline
                    </span>
                  </div>
                </div>

                <div className="border border-dashed border-border-color rounded-lg p-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="size-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px]">
                      <i className="ti ti-checklist"></i>
                    </span>
                    <span>
                      Tasks :{" "}
                      <strong className="text-slate-900 dark:text-white">
                        6
                      </strong>{" "}
                      /10
                    </span>
                  </div>
                  <div className="flex -space-x-1.5 overflow-hidden">
                    <img
                      className="inline-block size-5 rounded-full ring-2 ring-white object-cover"
                      src="/assets/img/profiles/avatar-06.jpg"
                      alt="member"
                    />
                    <img
                      className="inline-block size-5 rounded-full ring-2 ring-white object-cover"
                      src="/assets/img/profiles/avatar-07.jpg"
                      alt="member"
                    />
                    <img
                      className="inline-block size-5 rounded-full ring-2 ring-white object-cover"
                      src="/assets/img/profiles/avatar-08.jpg"
                      alt="member"
                    />
                    <span className="inline-flex items-center justify-center size-5 rounded-full bg-primary text-white text-[9px] font-bold ring-2 ring-white">
                      +2
                    </span>
                  </div>
                </div>

                <div className="bg-slate-200/60 dark:bg-slate-800 p-2 rounded-lg flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300 text-xs">
                    Time Spent
                  </span>
                  <h6 className="font-bold text-slate-900 dark:text-white text-xs mb-0">
                    65/120 <span className="font-normal text-[10px]">Hrs</span>
                  </h6>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Col 2: Tasks Todo Card */}
        <div className="lg:col-span-6 bg-white dark:bg-card border border-border-color rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-bold text-slate-900 dark:text-white text-sm mb-0">
              Tasks
            </h5>
            <select
              value={tasksFilter}
              onChange={(e) => setTasksFilter(e.target.value)}
              className="text-xs bg-white dark:bg-card border border-border-color rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="All Projects">All Projects</option>
              <option value="Ongoing Projects">Ongoing Projects</option>
            </select>
          </div>

          <div className="space-y-2">
            {[
              {
                title: "Patient appointment booking",
                status: "Onhold",
                badgeClass: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
                checked: false,
                starred: true,
                avatars: ["avatar-13.jpg", "avatar-14.jpg", "avatar-15.jpg"],
              },
              {
                title: "Appointment booking with payment",
                status: "Inprogress",
                badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
                checked: false,
                starred: false,
                avatars: ["avatar-20.jpg", "avatar-21.jpg"],
              },
              {
                title: "Patient and Doctor video conferencing",
                status: "Completed",
                badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
                checked: false,
                starred: false,
                avatars: ["avatar-28.jpg", "avatar-29.jpg", "avatar-24.jpg"],
              },
              {
                title: "Private chat module",
                status: "Pending",
                badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
                checked: true,
                starred: false,
                avatars: ["avatar-23.jpg", "avatar-24.jpg", "avatar-25.jpg"],
              },
              {
                title: "Go-Live and Post-Implementation Support",
                status: "Inprogress",
                badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
                checked: false,
                starred: false,
                avatars: ["avatar-28.jpg", "avatar-29.jpg"],
              },
            ].map((t, idx) => (
              <div
                key={idx}
                className="border border-border-color rounded-lg p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <i className="ti ti-grid-dots text-slate-400 text-xs shrink-0 cursor-grab"></i>
                  <input
                    type="checkbox"
                    defaultChecked={t.checked}
                    className="size-3.5 rounded border-slate-300 text-primary focus:ring-0"
                  />
                  <i
                    className={`ti ${
                      t.starred
                        ? "ti-star-filled text-amber-500"
                        : "ti-star text-slate-400"
                    } text-xs shrink-0 cursor-pointer`}
                  ></i>
                  <span
                    className={`text-xs font-medium truncate ${
                      t.checked
                        ? "line-through text-muted-foreground"
                        : "text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {t.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.badgeClass}`}
                  >
                    ● {t.status}
                  </span>
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {t.avatars.map((av, avIdx) => (
                      <img
                        key={avIdx}
                        className="inline-block size-5 rounded-full ring-2 ring-white object-cover"
                        src={`/assets/img/profiles/${av}`}
                        alt="avatar"
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ROW 4: Performance + My Skills + 3 Promo Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
        {/* Col 1: Performance */}
        <div className="lg:col-span-5 bg-white dark:bg-card border border-border-color rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-bold text-slate-900 dark:text-white text-sm mb-0">
              Performance
            </h5>
            <select
              value={perfYear}
              onChange={(e) => setPerfYear(e.target.value)}
              className="text-xs bg-white dark:bg-card border border-border-color rounded-lg px-2 py-1 text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          <div className="space-y-2">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2 flex items-center gap-2 text-xs">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                98%
              </h3>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300">
                12%
              </span>
              <span className="text-muted-foreground">vs last years</span>
            </div>

            <div className="min-h-[270px]">
              {isMounted && (
                <Suspense
                  fallback={
                    <div className="h-[270px] flex items-center justify-center text-xs text-muted-foreground">
                      Loading chart...
                    </div>
                  }
                >
                  <Chart
                    options={performanceChartOptions}
                    series={performanceChartOptions.series}
                    type="area"
                    height={270}
                  />
                </Suspense>
              )}
            </div>
          </div>
        </div>

        {/* Col 2: My Skills */}
        <div className="lg:col-span-4 bg-white dark:bg-card border border-border-color rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-bold text-slate-900 dark:text-white text-sm mb-0">
              My Skills
            </h5>
            <select
              value={skillsYear}
              onChange={(e) => setSkillsYear(e.target.value)}
              className="text-xs bg-white dark:bg-card border border-border-color rounded-lg px-2 py-1 text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          <div className="space-y-2">
            {[
              { name: "Figma", updated: "15 May 2025", value: 95, color: "#0d6efd", borderClass: "border-primary" },
              { name: "HTML", updated: "12 May 2025", value: 85, color: "#10b981", borderClass: "border-emerald-500" },
              { name: "CSS", updated: "12 May 2025", value: 70, color: "#8b5cf6", borderClass: "border-purple-500" },
              { name: "Wordpress", updated: "15 May 2025", value: 61, color: "#06b6d4", borderClass: "border-cyan-500" },
              { name: "Javascript", updated: "13 May 2025", value: 58, color: "#0f172a", borderClass: "border-slate-800" },
            ].map((sk, idx) => (
              <div
                key={idx}
                className="border border-dashed border-border-color rounded-lg p-2 flex items-center justify-between bg-slate-50/40 dark:bg-slate-800/20"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`block w-1 h-8 rounded-full border-l-2 ${sk.borderClass}`}
                  ></span>
                  <div>
                    <h6 className="font-bold text-xs text-slate-900 dark:text-white mb-0">
                      {sk.name}
                    </h6>
                    <p className="text-[10px] text-muted-foreground mb-0">
                      Updated : {sk.updated}
                    </p>
                  </div>
                </div>
                <CircleProgress value={sk.value} color={sk.color} size={42} strokeWidth={4} />
              </div>
            ))}
          </div>
        </div>

        {/* Col 3: 3 Side Promo Cards */}
        <div className="lg:col-span-3 flex flex-col justify-between gap-3">
          {/* Card 1: Team Birthday */}
          <div className="bg-slate-900 text-white rounded-xl p-4 shadow-xs text-center flex flex-col items-center justify-between">
            <h5 className="text-white text-xs font-bold mb-2">Team Birthday</h5>
            <div className="size-14 rounded-full border-2 border-white/40 overflow-hidden mb-2">
              <img
                src="/assets/img/users/user-35.jpg"
                alt="Andrew Jermia"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="mb-3">
              <h6 className="text-white font-bold text-xs mb-0.5">
                Andrew Jermia
              </h6>
              <p className="text-[11px] text-slate-400 mb-0">IOS Developer</p>
            </div>
            <button
              type="button"
              onClick={() => toast.success("Birthday wishes sent to Andrew!")}
              className="px-3 py-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors w-full shadow-xs"
            >
              Send Wishes
            </button>
          </div>

          {/* Card 2: Leave Policy */}
          <div className="bg-slate-700 text-white rounded-xl p-3 px-4 shadow-xs flex items-center justify-between">
            <div>
              <h5 className="text-white text-xs font-bold mb-0.5">Leave Policy</h5>
              <p className="text-[11px] text-slate-300 mb-0">
                Last Updated : Today
              </p>
            </div>
            <button
              type="button"
              onClick={() => toast.info("Opening Leave Policy handbook...")}
              className="px-3 py-1 text-xs font-semibold bg-white text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              View All
            </button>
          </div>

          {/* Card 3: Next Holiday */}
          <div className="bg-amber-400 text-slate-950 rounded-xl p-3 px-4 shadow-xs flex items-center justify-between">
            <div>
              <h5 className="text-slate-950 text-xs font-bold mb-0.5">
                Next Holiday
              </h5>
              <p className="text-[11px] text-slate-800 font-medium mb-0">
                Diwali, 15 Sep 2025
              </p>
            </div>
            <Link
              to="/holidays"
              className="px-3 py-1 text-xs font-semibold bg-white text-slate-950 hover:bg-slate-100 rounded-lg transition-colors inline-block"
            >
              View All
            </Link>
          </div>
        </div>
      </div>

      {/* ── ROW 5: Team Members + Notifications + Meetings Schedule ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
        {/* Col 1: Team Members */}
        <div className="lg:col-span-4 bg-white dark:bg-card border border-border-color rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-bold text-slate-900 dark:text-white text-sm mb-0">
              Team Members
            </h5>
            <button
              type="button"
              onClick={() => toast.info("Opening team directory...")}
              className="text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium"
            >
              View All
            </button>
          </div>

          <div className="space-y-3">
            {[
              { name: "Alexander Jermai", role: "UI/UX Designer", img: "user-27.jpg" },
              { name: "Doglas Martini", role: "Product Designer", img: "user-42.jpg" },
              { name: "Daniel Esbella", role: "Project Manager", img: "user-43.jpg" },
              { name: "Daniel Esbella", role: "Team Lead", img: "user-11.jpg" },
              { name: "Stephan Peralt", role: "Team Lead", img: "user-44.jpg" },
              { name: "Andrew Jermia", role: "Project Lead", img: "user-54.jpg" },
            ].map((tm, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={`/assets/img/users/${tm.img}`}
                    alt={tm.name}
                    className="size-8 rounded-full border border-border-color object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <h6 className="font-bold text-slate-900 dark:text-white text-xs truncate mb-0">
                      {tm.name}
                    </h6>
                    <span className="text-[11px] text-muted-foreground truncate block">
                      {tm.role}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => toast.info(`Calling ${tm.name}...`)}
                    className="size-7 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs"
                    title="Phone"
                  >
                    <i className="ti ti-phone"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => toast.info(`Emailing ${tm.name}...`)}
                    className="size-7 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs"
                    title="Mail"
                  >
                    <i className="ti ti-mail-bolt"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => toast.info(`Opening chat with ${tm.name}...`)}
                    className="size-7 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs"
                    title="Hipchat"
                  >
                    <i className="ti ti-brand-hipchat"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Col 2: Notifications */}
        <div className="lg:col-span-4 bg-white dark:bg-card border border-border-color rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-bold text-slate-900 dark:text-white text-sm mb-0">
              Notifications
            </h5>
            <button
              type="button"
              onClick={() => toast.info("Opening notifications center...")}
              className="text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium"
            >
              View All
            </button>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Notification 1 */}
            <div className="flex items-start gap-2.5">
              <img
                src="/assets/img/users/user-27.jpg"
                alt="user"
                className="size-8 rounded-full border border-border-color object-cover shrink-0"
              />
              <div className="min-w-0">
                <h6 className="font-bold text-slate-900 dark:text-white text-xs truncate mb-0.5">
                  Lex Murphy requested access to UNIX
                </h6>
                <p className="text-[11px] text-muted-foreground mb-1">
                  Today at 9:42 AM
                </p>
                <div className="flex items-center gap-1.5 p-1 rounded bg-slate-50 dark:bg-slate-800/40 border border-border-color/60 max-w-fit">
                  <i className="ti ti-file-text text-rose-500 text-xs"></i>
                  <span className="font-semibold text-[11px] text-slate-800 dark:text-slate-200">
                    EY_review.pdf
                  </span>
                </div>
              </div>
            </div>

            {/* Notification 2 */}
            <div className="flex items-start gap-2.5">
              <img
                src="/assets/img/users/user-28.jpg"
                alt="user"
                className="size-8 rounded-full border border-border-color object-cover shrink-0"
              />
              <div className="min-w-0">
                <h6 className="font-bold text-slate-900 dark:text-white text-xs truncate mb-0.5">
                  Lex Murphy requested access to UNIX
                </h6>
                <p className="text-[11px] text-muted-foreground mb-0">
                  Today at 10:00 AM
                </p>
              </div>
            </div>

            {/* Notification 3 with Actions */}
            <div className="flex items-start gap-2.5">
              <img
                src="/assets/img/users/user-29.jpg"
                alt="user"
                className="size-8 rounded-full border border-border-color object-cover shrink-0"
              />
              <div className="min-w-0">
                <h6 className="font-bold text-slate-900 dark:text-white text-xs truncate mb-0.5">
                  Lex Murphy requested access to UNIX
                </h6>
                <p className="text-[11px] text-muted-foreground mb-1.5">
                  Today at 10:50 AM
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toast.success("Access request approved")}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-primary text-white rounded hover:bg-primary/90 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => toast.info("Access request declined")}
                    className="px-2.5 py-1 text-[11px] font-semibold border border-primary text-primary rounded hover:bg-primary/10 transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
            </div>

            {/* Notification 4 */}
            <div className="flex items-start gap-2.5">
              <img
                src="/assets/img/users/user-30.jpg"
                alt="user"
                className="size-8 rounded-full border border-border-color object-cover shrink-0"
              />
              <div className="min-w-0">
                <h6 className="font-bold text-slate-900 dark:text-white text-xs truncate mb-0.5">
                  Lex Murphy requested access to UNIX
                </h6>
                <p className="text-[11px] text-muted-foreground mb-0">
                  Today at 12:00 PM
                </p>
              </div>
            </div>

            {/* Notification 5 */}
            <div className="flex items-start gap-2.5">
              <img
                src="/assets/img/users/user-33.jpg"
                alt="user"
                className="size-8 rounded-full border border-border-color object-cover shrink-0"
              />
              <div className="min-w-0">
                <h6 className="font-bold text-slate-900 dark:text-white text-xs truncate mb-0.5">
                  Lex Murphy requested access to UNIX
                </h6>
                <p className="text-[11px] text-muted-foreground mb-0">
                  Today at 05:00 PM
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Col 3: Meetings Schedule */}
        <div className="lg:col-span-4 bg-white dark:bg-card border border-border-color rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-bold text-slate-900 dark:text-white text-sm mb-0">
              Meetings Schedule
            </h5>
            <select
              value={meetingsFilter}
              onChange={(e) => setMeetingsFilter(e.target.value)}
              className="text-xs bg-white dark:bg-card border border-border-color rounded-lg px-2 py-1 text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="Today">Today</option>
              <option value="This Month">This Month</option>
              <option value="This Year">This Year</option>
            </select>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 shrink-0 w-20">
                <span>09:25 AM</span>
                <span className="size-2 rounded-full bg-primary shrink-0"></span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg flex-1">
                <p className="font-bold text-slate-900 dark:text-white text-xs mb-0.5">
                  Marketing Strategy Presentation
                </p>
                <span className="text-[11px] text-muted-foreground">
                  Marketing
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 shrink-0 w-20">
                <span>09:20 AM</span>
                <span className="size-2 rounded-full bg-slate-700 shrink-0"></span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg flex-1">
                <p className="font-bold text-slate-900 dark:text-white text-xs mb-0.5">
                  Design Review Hospital, doctors Management Project
                </p>
                <span className="text-[11px] text-muted-foreground">Review</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 shrink-0 w-20">
                <span>09:18 AM</span>
                <span className="size-2 rounded-full bg-amber-500 shrink-0"></span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg flex-1">
                <p className="font-bold text-slate-900 dark:text-white text-xs mb-0.5">
                  Birthday Celebration of Employee
                </p>
                <span className="text-[11px] text-muted-foreground">
                  Celebration
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 shrink-0 w-20">
                <span>09:10 AM</span>
                <span className="size-2 rounded-full bg-emerald-500 shrink-0"></span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg flex-1">
                <p className="font-bold text-slate-900 dark:text-white text-xs mb-0.5">
                  Update of Project Flow
                </p>
                <span className="text-[11px] text-muted-foreground">
                  Development
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER: SmartHR Designed & Developed By Dreams ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border-color/60 pt-3 text-xs text-muted-foreground">
        <p className="mb-0">2014 - 2026 &copy; SmartHR.</p>
        <p className="mb-0">
          Designed &amp; Developed By{" "}
          <span className="text-primary font-semibold">Dreams</span>
        </p>
      </div>

      {/* ── MODAL 1: Add Leave (#add_leaves) ── */}
      <Dialog open={leaveModalOpen} onOpenChange={setLeaveModalOpen}>
        <DialogContent className="max-w-md p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              Add Leave
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleApplyLeave} className="space-y-3 text-xs mt-2">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Employee Name
              </label>
              <select
                value={leaveForm.employeeName}
                onChange={(e) =>
                  setLeaveForm({ ...leaveForm, employeeName: e.target.value })
                }
                className="w-full border border-border-color rounded-lg p-2 bg-white dark:bg-card focus:outline-none"
              >
                <option value="Stephan Peralt">Stephan Peralt</option>
                <option value="Anthony Lewis">Anthony Lewis</option>
                <option value="Brian Villalobos">Brian Villalobos</option>
                <option value="Harvey Smith">Harvey Smith</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Leave Type
              </label>
              <select
                value={leaveForm.leaveType}
                onChange={(e) =>
                  setLeaveForm({ ...leaveForm, leaveType: e.target.value })
                }
                className="w-full border border-border-color rounded-lg p-2 bg-white dark:bg-card focus:outline-none"
              >
                <option value="Medical Leave">Medical Leave</option>
                <option value="Casual Leave">Casual Leave</option>
                <option value="Annual Leave">Annual Leave</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  From
                </label>
                <input
                  type="date"
                  value="2026-04-15"
                  className="w-full border border-border-color rounded-lg p-2 bg-white dark:bg-card focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  To
                </label>
                <input
                  type="date"
                  value="2026-04-18"
                  className="w-full border border-border-color rounded-lg p-2 bg-white dark:bg-card focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  No of Days
                </label>
                <input
                  type="text"
                  value={leaveForm.days}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, days: e.target.value })
                  }
                  className="w-full border border-border-color rounded-lg p-2 bg-white dark:bg-card focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Remaining Days
                </label>
                <input
                  type="text"
                  value={leaveForm.remaining}
                  readOnly
                  className="w-full border border-border-color rounded-lg p-2 bg-slate-100 dark:bg-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Reason
              </label>
              <textarea
                rows={3}
                placeholder="Reason for leave..."
                value={leaveForm.reason}
                onChange={(e) =>
                  setLeaveForm({ ...leaveForm, reason: e.target.value })
                }
                className="w-full border border-border-color rounded-lg p-2 bg-white dark:bg-card focus:outline-none"
              ></textarea>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-color">
              <button
                type="button"
                onClick={() => setLeaveModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-border-color text-slate-700 dark:text-slate-200 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90"
              >
                Add Leaves
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 2: Edit Task (#edit_task) ── */}
      <Dialog open={editTaskOpen} onOpenChange={setEditTaskOpen}>
        <DialogContent className="max-w-lg p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              Edit Task
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs mt-2">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Todo Title
              </label>
              <input
                type="text"
                defaultValue="Patient appointment booking"
                className="w-full border border-border-color rounded-lg p-2 bg-white dark:bg-card focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  defaultValue="2026-05-15"
                  className="w-full border border-border-color rounded-lg p-2 bg-white dark:bg-card focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Project
                </label>
                <select className="w-full border border-border-color rounded-lg p-2 bg-white dark:bg-card focus:outline-none">
                  <option>Office Management</option>
                  <option>Clinic Management</option>
                  <option>Educational Platform</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-color">
              <button
                type="button"
                onClick={() => setEditTaskOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-border-color text-slate-700 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  toast.success("Task updated successfully!");
                  setEditTaskOpen(false);
                }}
                className="px-4 py-1.5 rounded-lg bg-primary text-white font-semibold"
              >
                Save
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
