'use client';

import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { toast } from "sonner";
import { Link } from "@/src/lib/router-compat";
import { OrganizationAnnouncementsWidget } from "@/components/dashboard/organization-announcements-widget";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, formatDistanceToNow } from "date-fns";

const Chart = lazy(() => import("react-apexcharts"));

function getInitials(name?: string | null) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function safeFormatDate(val?: string | Date | null, fmt = "dd MMM yyyy") {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, fmt);
}

export default function EmployeeDashboardPage() {
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const [isMounted, setIsMounted] = useState(false);
  const [applyLeaveOpen, setApplyLeaveOpen] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  // Apply Leave Form State
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [leaveFrom, setLeaveFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [leaveTo, setLeaveTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [leaveReason, setLeaveReason] = useState("");

  useEffect(() => {
    setIsMounted(true);
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { data: dashData, isLoading, refetch } = useQuery<any>({
    queryKey: ["me-dashboard-realtime"],
    queryFn: async () => {
      const res = await api.get<any>("/me/dashboard");
      return res?.data || res || {};
    },
    refetchInterval: 30000,
  });

  const employee = dashData?.employee || {};
  const attendanceToday = dashData?.attendanceToday || {};
  const attendanceSummary = dashData?.attendanceSummary || {};
  const leaveSummary = dashData?.leaveSummary || {};
  const shiftToday = dashData?.shiftToday || null;
  const projects: any[] = dashData?.projects || [];
  const tasks: any[] = dashData?.tasks || [];
  const performanceTrend = dashData?.performanceTrend || { labels: [], values: [], totalHours: 0, deltaPct: 0 };
  const skills: any[] = dashData?.skills || [];
  const teamBirthday = dashData?.teamBirthday || null;
  const nextHoliday = dashData?.nextHoliday || null;
  const teamMembers: any[] = dashData?.teamMembers || [];
  const notifications: any[] = dashData?.notifications || [];
  const meetings: any[] = dashData?.meetings || [];

  const isClockedIn = Boolean(attendanceToday?.checkIn && !attendanceToday?.checkOut);
  const isClockedOut = Boolean(attendanceToday?.checkIn && attendanceToday?.checkOut);

  const liveTimer = useMemo(() => {
    if (!attendanceToday?.checkIn) return "00:00:00";
    const startMs = new Date(attendanceToday.checkIn).getTime();
    const endMs = attendanceToday.checkOut ? new Date(attendanceToday.checkOut).getTime() : nowTick;
    const diffSec = Math.max(0, Math.floor((endMs - startMs) / 1000));
    const h = String(Math.floor(diffSec / 3600)).padStart(2, "0");
    const m = String(Math.floor((diffSec % 3600) / 60)).padStart(2, "0");
    const s = String(diffSec % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }, [attendanceToday?.checkIn, attendanceToday?.checkOut, nowTick]);

  const checkInMutation = useMutation({
    mutationFn: async () => api.post("/me/attendance/check-in", {}),
    onSuccess: () => {
      toast.success("Punched in successfully.");
      queryClient.invalidateQueries({ queryKey: ["me-dashboard-realtime"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to punch in.");
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => api.post("/me/attendance/check-out", {}),
    onSuccess: () => {
      toast.success("Punched out successfully.");
      queryClient.invalidateQueries({ queryKey: ["me-dashboard-realtime"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to punch out.");
    },
  });

  const applyLeaveMutation = useMutation({
    mutationFn: async () => {
      if (!leaveTypeId) throw new Error("Please select a leave type.");
      if (!leaveFrom || !leaveTo) throw new Error("Please select start and end dates.");
      return api.post("/me/leave/applications", {
        leaveTypeId,
        startDate: leaveFrom,
        endDate: leaveTo,
        reason: leaveReason.trim() || "Personal leave request",
      });
    },
    onSuccess: () => {
      toast.success("Leave request submitted successfully.");
      setApplyLeaveOpen(false);
      setLeaveReason("");
      queryClient.invalidateQueries({ queryKey: ["me-dashboard-realtime"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to submit leave request.");
    },
  });

  const dist = attendanceSummary?.distribution || { onTime: 0, late: 0, wfh: 0, absent: 0, onLeave: 0 };
  const leavesChartSeries = useMemo(() => {
    const arr = [
      Number(dist.onTime || 0),
      Number(dist.late || 0),
      Number(dist.wfh || 0),
      Number(dist.absent || 0),
      Number(dist.onLeave || 0),
    ];
    return arr.some((v) => v > 0) ? arr : [1, 0, 0, 0, 0];
  }, [dist.onTime, dist.late, dist.wfh, dist.absent, dist.onLeave]);

  const leavesChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { height: 185, type: "donut", toolbar: { show: false } },
      dataLabels: { enabled: false },
      colors: ["#0C4B5E", "#03C95A", "#F26522", "#E70D0D", "#FFC107"],
      labels: ["On Time", "Late", "Work From Home", "Absent", "On Leave"],
      legend: { show: false },
      responsive: [
        { breakpoint: 480, options: { chart: { width: 180 }, legend: { show: false } } },
      ],
    }),
    []
  );

  const performanceChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { height: 273, type: "area", toolbar: { show: false }, zoom: { enabled: false } },
      colors: ["#03C95A"],
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 2 },
      xaxis: {
        categories:
          performanceTrend?.labels?.length > 0
            ? performanceTrend.labels
            : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
      },
      yaxis: {
        labels: { formatter: (val: number) => `${Math.round(val)}h` },
      },
      grid: { padding: { left: -8, right: -4 } },
      legend: { show: false },
    }),
    [performanceTrend?.labels]
  );

  const performanceChartSeries = useMemo(
    () => [
      {
        name: "Logged Hours",
        data:
          performanceTrend?.values?.length > 0
            ? performanceTrend.values
            : [0, 0, 0, 0, 0, 0, 0],
      },
    ],
    [performanceTrend?.values]
  );

  const fullName = employee?.fullName || profile?.full_name || "Employee";
  const designation = employee?.designationName || employee?.position || "Team Member";
  const department = employee?.departmentName || "General";
  const todayHours = Number(attendanceSummary?.todayHours || 0);
  const weekHours = Number(attendanceSummary?.weekHours || 0);
  const monthHours = Number(attendanceSummary?.monthHours || 0);
  const overtimeHours = Number(attendanceSummary?.overtimeMonthHours || 0);
  const todayPct = Math.min(100, Math.round((todayHours / 9) * 100));
  const weekPct = Math.min(100, Math.round((weekHours / 40) * 100));
  const monthPct = Math.min(100, Math.round((monthHours / 160) * 100));
  const overtimePct = Math.min(100, Math.round((overtimeHours / 20) * 100));

  return (
    <div className="dashboard-scope w-full">
      {/* Breadcrumb */}
      <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
        <div className="my-auto mb-2">
          <h2 className="mb-1">Employee Dashboard</h2>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/me/dashboard"><i className="ti ti-smart-home"></i></Link>
              </li>
              <li className="breadcrumb-item">Dashboard</li>
              <li className="breadcrumb-item active" aria-current="page">Employee Dashboard</li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="btn btn-white d-inline-flex align-items-center"
          >
            <i className="ti ti-refresh me-1"></i>Refresh Live
          </button>
          <button
            type="button"
            onClick={() => setApplyLeaveOpen(true)}
            className="btn btn-primary d-inline-flex align-items-center"
          >
            <i className="ti ti-circle-plus me-1"></i>Apply Leave
          </button>
        </div>
      </div>

      {/* Live Status Alert */}
      {dashData?.metrics?.pendingLeavesCount > 0 && (
        <div className="alert bg-secondary-transparent alert-dismissible fade show mb-4">
          You have <strong>{dashData.metrics.pendingLeavesCount}</strong> pending leave request(s) awaiting approval.
          <Link to="/me/leave/applications" className="ms-2 text-primary fw-semibold">View Requests</Link>
        </div>
      )}

      {/* Row 1: Profile Card + Leave Distribution Donut + Leave Stats */}
      <div className="row">
        {/* Employee Profile Card */}
        <div className="col-xl-4 d-flex">
          <div className="card position-relative flex-fill">
            <div className="card-header bg-dark">
              <div className="d-flex align-items-center">
                <span className="avatar avatar-lg avatar-rounded border border-white border-2 flex-shrink-0 me-2 bg-primary text-white fw-bold d-inline-flex align-items-center justify-content-center">
                  {employee?.avatarUrl ? (
                    <img src={employee.avatarUrl} alt={fullName} className="w-100 h-100 rounded-circle object-fit-cover" />
                  ) : (
                    getInitials(fullName)
                  )}
                </span>
                <div>
                  <h5 className="text-white mb-1">{isLoading ? "Loading..." : fullName}</h5>
                  <div className="d-flex align-items-center">
                    <p className="text-white fs-12 mb-0">{designation}</p>
                    <span className="mx-1"><i className="ti ti-point-filled text-primary"></i></span>
                    <p className="fs-12 text-white-50 mb-0">{department}</p>
                  </div>
                </div>
              </div>
              <Link
                to="/profile"
                className="btn btn-icon btn-sm text-white rounded-circle edit-top"
                title="Edit Profile"
              >
                <i className="ti ti-edit"></i>
              </Link>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <span className="d-block mb-1 fs-13">Employee ID</span>
                <p className="text-gray-9 fw-medium">{employee?.employeeCode || "—"}</p>
              </div>
              <div className="mb-3">
                <span className="d-block mb-1 fs-13">Phone Number</span>
                <p className="text-gray-9">{employee?.phone || "Not provided"}</p>
              </div>
              <div className="mb-3">
                <span className="d-block mb-1 fs-13">Email Address</span>
                <p className="text-gray-9">{employee?.email || profile?.email || "—"}</p>
              </div>
              <div className="mb-3">
                <span className="d-block mb-1 fs-13">Report Office / Manager</span>
                <p className="text-gray-9">{employee?.managerName || "—"}</p>
              </div>
              <div>
                <span className="d-block mb-1 fs-13">Joined on</span>
                <p className="text-gray-9">{safeFormatDate(employee?.joinedAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance & Leave Distribution Donut */}
        <div className="col-xl-5 d-flex">
          <div className="card flex-fill">
            <div className="card-header">
              <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
                <h5>Attendance &amp; Leave Details</h5>
                <span className="badge bg-light text-dark border">
                  <i className="ti ti-calendar me-1"></i>{new Date().getFullYear()}
                </span>
              </div>
            </div>
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-6">
                  <div className="mb-3">
                    <div className="mb-3">
                      <p className="d-flex align-items-center">
                        <i className="ti ti-circle-filled fs-8 text-dark me-1"></i>
                        <span className="text-gray-9 fw-semibold me-1">{dist.onTime}</span> On time
                      </p>
                    </div>
                    <div className="mb-3">
                      <p className="d-flex align-items-center">
                        <i className="ti ti-circle-filled fs-8 text-success me-1"></i>
                        <span className="text-gray-9 fw-semibold me-1">{dist.late}</span> Late Attendance
                      </p>
                    </div>
                    <div className="mb-3">
                      <p className="d-flex align-items-center">
                        <i className="ti ti-circle-filled fs-8 text-primary me-1"></i>
                        <span className="text-gray-9 fw-semibold me-1">{dist.wfh}</span> Work From Home
                      </p>
                    </div>
                    <div className="mb-3">
                      <p className="d-flex align-items-center">
                        <i className="ti ti-circle-filled fs-8 text-danger me-1"></i>
                        <span className="text-gray-9 fw-semibold me-1">{dist.absent}</span> Absent
                      </p>
                    </div>
                    <div>
                      <p className="d-flex align-items-center">
                        <i className="ti ti-circle-filled fs-8 text-warning me-1"></i>
                        <span className="text-gray-9 fw-semibold me-1">{dist.onLeave}</span> On Leave
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3 d-flex justify-content-md-end">
                    <div id="leaves_chart" className="w-full" style={{ minHeight: 185 }}>
                      {isMounted && (
                        <Suspense fallback={<div className="p-4 text-center text-muted">Loading chart...</div>}>
                          <Chart options={leavesChartOptions} series={leavesChartSeries} type="donut" height={185} width="100%" />
                        </Suspense>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-md-12">
                  <div className="d-flex align-items-center justify-content-between pt-2 border-top">
                    <span className="fs-13 text-muted">
                      Active Shift: <strong className="text-dark">{shiftToday ? `${shiftToday.name} (${shiftToday.startTime} - ${shiftToday.endTime})` : "Default Shift"}</strong>
                    </span>
                    <Link to="/me/attendance/records" className="fs-12 text-primary fw-semibold">
                      Full Log
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Leave Summary Stats Card */}
        <div className="col-xl-3 d-flex">
          <div className="card flex-fill">
            <div className="card-header">
              <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
                <h5>Leave Summary</h5>
                <span className="badge bg-light text-dark border">{new Date().getFullYear()}</span>
              </div>
            </div>
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-sm-6">
                  <div className="mb-4">
                    <span className="d-block mb-1">Total Leaves</span>
                    <h4>{leaveSummary.totalLeaves ?? 0}</h4>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="mb-4">
                    <span className="d-block mb-1">Taken</span>
                    <h4>{leaveSummary.taken ?? 0}</h4>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="mb-4">
                    <span className="d-block mb-1">Absent</span>
                    <h4>{leaveSummary.absent ?? 0}</h4>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="mb-4">
                    <span className="d-block mb-1">Pending Req</span>
                    <h4>{leaveSummary.pendingRequests ?? 0}</h4>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="mb-4">
                    <span className="d-block mb-1">Worked Days</span>
                    <h4>{leaveSummary.workedDays ?? 0}</h4>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="mb-4">
                    <span className="d-block mb-1">Loss of Pay</span>
                    <h4>{leaveSummary.lossOfPay ?? 0}</h4>
                  </div>
                </div>
                <div className="col-sm-12">
                  <button
                    type="button"
                    className="btn btn-dark w-100"
                    onClick={() => setApplyLeaveOpen(true)}
                  >
                    Apply New Leave
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Live Attendance Punch Card + Total Hours Cards + Work Timeline */}
      <div className="row">
        <div className="col-xl-4 d-flex">
          <div className="card flex-fill border-primary attendance-bg">
            <div className="card-body">
              <div className="mb-4 text-center">
                <h6 className="fw-medium text-gray-5 mb-1">Attendance</h6>
                <h4>{isMounted ? format(new Date(nowTick), "hh:mm a, dd MMM yyyy") : "—"}</h4>
              </div>
              <div className="attendance-circle-progress attendance-progress mx-auto mb-3" data-value={todayPct}>
                <span className="progress-left">
                  <span className="progress-bar border-success"></span>
                </span>
                <span className="progress-right">
                  <span className="progress-bar border-success"></span>
                </span>
                <div className="total-work-hours text-center w-100">
                  <span className="fs-13 d-block mb-1">Total Hours</span>
                  <h6 className="tabular-nums">{liveTimer}</h6>
                </div>
              </div>
              <div className="text-center">
                <div className="badge badge-dark badge-md mb-3">
                  Logged Today : {todayHours.toFixed(2)} hrs
                </div>
                <h6 className="fw-medium d-flex align-items-center justify-content-center mb-4">
                  <i className="ti ti-fingerprint text-primary me-1"></i>
                  {attendanceToday?.checkIn
                    ? `Punched In at ${format(new Date(attendanceToday.checkIn), "hh:mm a")}`
                    : "Not punched in yet today"}
                </h6>
                {isClockedIn ? (
                  <button
                    type="button"
                    onClick={() => checkOutMutation.mutate()}
                    disabled={checkOutMutation.isPending}
                    className="btn btn-danger w-100"
                  >
                    {checkOutMutation.isPending ? "Punching Out..." : "Punch Out"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => checkInMutation.mutate()}
                    disabled={checkInMutation.isPending || isClockedOut}
                    className="btn btn-primary w-100"
                  >
                    {isClockedOut
                      ? "Shift Completed Today"
                      : checkInMutation.isPending
                      ? "Punching In..."
                      : "Punch In"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-8 d-flex">
          <div className="row flex-fill">
            <div className="col-xl-3 col-md-6">
              <div className="card">
                <div className="card-body">
                  <div className="border-bottom mb-3 pb-2">
                    <span className="avatar avatar-sm bg-primary mb-2"><i className="ti ti-clock-stop"></i></span>
                    <h2 className="mb-2 tabular-nums">{todayHours.toFixed(1)} / <span className="fs-20 text-gray-5">9</span></h2>
                    <p className="fw-medium text-truncate">Total Hours Today</p>
                  </div>
                  <div>
                    <p className="d-flex align-items-center fs-13">
                      <span className="avatar avatar-xs rounded-circle bg-success flex-shrink-0 me-2">
                        <i className="ti ti-arrow-up fs-12"></i>
                      </span>
                      <span>{todayPct}% of daily target</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6">
              <div className="card">
                <div className="card-body">
                  <div className="border-bottom mb-3 pb-2">
                    <span className="avatar avatar-sm bg-dark mb-2"><i className="ti ti-clock-up"></i></span>
                    <h2 className="mb-2 tabular-nums">{weekHours.toFixed(1)} / <span className="fs-20 text-gray-5">40</span></h2>
                    <p className="fw-medium text-truncate">Total Hours Week</p>
                  </div>
                  <div>
                    <p className="d-flex align-items-center fs-13">
                      <span className="avatar avatar-xs rounded-circle bg-success flex-shrink-0 me-2">
                        <i className="ti ti-arrow-up fs-12"></i>
                      </span>
                      <span>{weekPct}% of weekly target</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6">
              <div className="card">
                <div className="card-body">
                  <div className="border-bottom mb-3 pb-2">
                    <span className="avatar avatar-sm bg-info mb-2"><i className="ti ti-calendar-up"></i></span>
                    <h2 className="mb-2 tabular-nums">{monthHours.toFixed(1)} / <span className="fs-20 text-gray-5">160</span></h2>
                    <p className="fw-medium text-truncate">Total Hours Month</p>
                  </div>
                  <div>
                    <p className="d-flex align-items-center fs-13 text-truncate">
                      <span className="avatar avatar-xs rounded-circle bg-info flex-shrink-0 me-2">
                        <i className="ti ti-clock fs-12"></i>
                      </span>
                      <span>{monthPct}% of monthly target</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6">
              <div className="card">
                <div className="card-body">
                  <div className="border-bottom mb-3 pb-2">
                    <span className="avatar avatar-sm bg-pink mb-2"><i className="ti ti-calendar-star"></i></span>
                    <h2 className="mb-2 tabular-nums">{overtimeHours.toFixed(1)} / <span className="fs-20 text-gray-5">20</span></h2>
                    <p className="fw-medium text-truncate">Overtime this Month</p>
                  </div>
                  <div>
                    <p className="d-flex align-items-center fs-13 text-truncate">
                      <span className="avatar avatar-xs rounded-circle bg-warning flex-shrink-0 me-2">
                        <i className="ti ti-bolt fs-12"></i>
                      </span>
                      <span>{overtimePct}% of overtime cap</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Daily Hours Breakdown Bar */}
            <div className="col-md-12">
              <div className="card">
                <div className="card-body">
                  <div className="row">
                    <div className="col-xl-3">
                      <div className="mb-4">
                        <p className="d-flex align-items-center mb-1">
                          <i className="ti ti-point-filled text-dark-transparent me-1"></i>Total Working Hours
                        </p>
                        <h3>{todayHours.toFixed(1)}h</h3>
                      </div>
                    </div>
                    <div className="col-xl-3">
                      <div className="mb-4">
                        <p className="d-flex align-items-center mb-1">
                          <i className="ti ti-point-filled text-success me-1"></i>Productive Hours
                        </p>
                        <h3>{Math.max(0, todayHours - overtimeHours).toFixed(1)}h</h3>
                      </div>
                    </div>
                    <div className="col-xl-3">
                      <div className="mb-4">
                        <p className="d-flex align-items-center mb-1">
                          <i className="ti ti-point-filled text-warning me-1"></i>Late Arrival
                        </p>
                        <h3>{attendanceToday?.lateMinutes || 0}m</h3>
                      </div>
                    </div>
                    <div className="col-xl-3">
                      <div className="mb-4">
                        <p className="d-flex align-items-center mb-1">
                          <i className="ti ti-point-filled text-info me-1"></i>Overtime Today
                        </p>
                        <h3>{Math.round(Number(attendanceToday?.overtimeMinutes || 0))}m</h3>
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-12">
                      <div className="progress bg-transparent-dark mb-3" style={{ height: "24px" }}>
                        <div className="progress-bar bg-success rounded me-1" role="progressbar" style={{ width: `${Math.max(5, todayPct)}%` }}></div>
                        <div className="progress-bar bg-info rounded" role="progressbar" style={{ width: `${Math.min(20, overtimePct)}%` }}></div>
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
                        <span className="fs-10">09:00</span>
                        <span className="fs-10">11:00</span>
                        <span className="fs-10">01:00</span>
                        <span className="fs-10">03:00</span>
                        <span className="fs-10">05:00</span>
                        <span className="fs-10">07:00</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Projects + Tasks */}
      <div className="row">
        <div className="col-xl-6 d-flex">
          <div className="card flex-fill">
            <div className="card-header">
              <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
                <h5>Projects</h5>
                <Link to="/me/todo/gantt" className="btn btn-sm btn-outline-light text-dark border">
                  Timeline View
                </Link>
              </div>
            </div>
            <div className="card-body">
              {projects.length === 0 ? (
                <div className="py-5 text-center text-muted fs-13">No active projects assigned yet.</div>
              ) : (
                <div className="row">
                  {projects.slice(0, 2).map((proj: any) => (
                    <div className="col-md-6" key={proj.id}>
                      <div className="card mb-4 shadow-none mb-md-0">
                        <div className="card-body">
                          <div className="d-flex align-items-center justify-content-between mb-3">
                            <h6 className="text-truncate">{proj.name}</h6>
                            <span className="badge bg-primary-transparent text-primary text-capitalize">
                              {String(proj.status || "active").replace(/_/g, " ")}
                            </span>
                          </div>
                          <div className="mb-3">
                            <div className="d-flex align-items-center mb-2">
                              <span className="avatar avatar-sm bg-dark rounded-circle me-2 text-white fs-12 d-inline-flex align-items-center justify-content-center">
                                {getInitials(proj.clientName)}
                              </span>
                              <div>
                                <h6 className="fw-medium mb-0 fs-13">{proj.clientName || "Internal"}</h6>
                                <span className="fs-12 text-muted">Client / Sponsor</span>
                              </div>
                            </div>
                            <div className="d-flex align-items-center">
                              <span className="avatar avatar-sm bg-soft-danger rounded-circle me-2 d-inline-flex align-items-center justify-content-center">
                                <i className="ti ti-calendar text-danger fs-14"></i>
                              </span>
                              <div>
                                <h6 className="fw-medium mb-0 fs-13">{safeFormatDate(proj.dueDate)}</h6>
                                <span className="fs-12 text-muted">Deadline</span>
                              </div>
                            </div>
                          </div>
                          <div className="d-flex align-items-center justify-content-between bg-transparent-light border border-dashed rounded p-2 mb-3">
                            <div className="d-flex align-items-center">
                              <span className="avatar avatar-sm bg-success-transparent rounded-circle me-2 d-inline-flex align-items-center justify-content-center">
                                <i className="ti ti-list-check fs-16"></i>
                              </span>
                              <p className="mb-0 fs-13">
                                Tasks : <span className="text-gray-9 fw-semibold">{proj.completedTasks}</span> / {proj.totalTasks}
                              </p>
                            </div>
                            <span className="badge bg-light text-dark">{proj.progress}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tasks Widget */}
        <div className="col-xl-6 d-flex">
          <div className="card flex-fill">
            <div className="card-header">
              <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
                <h5>My Tasks</h5>
                <Link to="/me/todo" className="btn btn-sm btn-outline-light text-dark border">
                  View All Tasks
                </Link>
              </div>
            </div>
            <div className="card-body">
              {tasks.length === 0 ? (
                <div className="py-5 text-center text-muted fs-13">
                  No tasks yet. <Link to="/me/todo" className="text-primary fw-semibold">Create a task</Link>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {tasks.map((t: any) => (
                    <div key={t.id} className="list-group-item border rounded mb-2 p-2">
                      <div className="row align-items-center row-gap-2">
                        <div className="col-md-8">
                          <div className="d-flex align-items-center">
                            <i className={`ti ${t.completed ? "ti-circle-check text-success" : "ti-circle text-muted"} me-2`}></i>
                            <h6 className={`fs-14 mb-0 text-truncate ${t.completed ? "text-decoration-line-through text-muted" : ""}`}>
                              {t.title}
                            </h6>
                          </div>
                        </div>
                        <div className="col-md-4 text-md-end">
                          <span className={`badge ${t.completed ? "badge-soft-success" : "badge-soft-warning"} text-capitalize`}>
                            {t.completed ? "Completed" : t.priority || "Pending"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Performance Chart + My Skills + Team Birthday / Leave Policy / Next Holiday */}
      <div className="row">
        <div className="col-xl-5 d-flex">
          <div className="card flex-fill">
            <div className="card-header">
              <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
                <h5>Performance &amp; Hours Trend</h5>
                <span className="badge bg-light text-dark border">{new Date().getFullYear()}</span>
              </div>
            </div>
            <div className="card-body">
              <div>
                <div className="bg-light d-flex align-items-center rounded p-2 mb-3">
                  <h3 className="me-2 mb-0">{performanceTrend.totalHours ?? 0}h</h3>
                  <span className={`badge ${performanceTrend.deltaPct >= 0 ? "badge-outline-success bg-success-transparent" : "badge-outline-danger bg-danger-transparent"} rounded-pill me-1`}>
                    {performanceTrend.deltaPct >= 0 ? `+${performanceTrend.deltaPct}%` : `${performanceTrend.deltaPct}%`}
                  </span>
                  <span className="fs-12 text-muted">vs last month</span>
                </div>
                <div id="performance_chart2" style={{ minHeight: 273 }}>
                  {isMounted && (
                    <Suspense fallback={<div className="p-4 text-center text-muted">Loading chart...</div>}>
                      <Chart options={performanceChartOptions} series={performanceChartSeries} type="area" height={273} width="100%" />
                    </Suspense>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* My Skills / Trainings */}
        <div className="col-xl-4 d-flex">
          <div className="card flex-fill">
            <div className="card-header">
              <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
                <h5>My Skills &amp; Training</h5>
                <Link to="/me/training/trainings" className="btn btn-sm btn-outline-light text-dark border">
                  Explore
                </Link>
              </div>
            </div>
            <div className="card-body">
              {skills.length === 0 ? (
                <div className="py-5 text-center text-muted fs-13">No active training courses enrolled yet.</div>
              ) : (
                <div>
                  {skills.map((sk: any) => (
                    <div key={sk.id} className="border border-dashed bg-transparent-light rounded p-2 mb-2">
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center">
                          <span className="d-block border border-2 h-12 border-primary rounded-5 me-2"></span>
                          <div>
                            <h6 className="fw-medium mb-1 fs-14">{sk.name}</h6>
                            <p className="fs-12 text-muted mb-0">Updated : {safeFormatDate(sk.updatedAt)}</p>
                          </div>
                        </div>
                        <span className="badge bg-primary-transparent text-primary fw-semibold">
                          {sk.progress}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Team Birthday + Leave Policy + Next Holiday */}
        <div className="col-xl-3 d-flex">
          <div className="flex-fill">
            <div className="card card-bg-5 bg-dark mb-3">
              <div className="card-body">
                <div className="text-center">
                  <h5 className="text-white mb-3">Team Birthday</h5>
                  {teamBirthday ? (
                    <>
                      <span className="avatar avatar-xl avatar-rounded mb-2 bg-primary text-white fw-bold d-inline-flex align-items-center justify-content-center">
                        {teamBirthday.avatarUrl ? (
                          <img src={teamBirthday.avatarUrl} alt={teamBirthday.fullName} className="w-100 h-100 rounded-circle object-fit-cover" />
                        ) : (
                          getInitials(teamBirthday.fullName)
                        )}
                      </span>
                      <div className="mb-3">
                        <h6 className="text-white fw-medium mb-1">{teamBirthday.fullName}</h6>
                        <p className="text-white-50 fs-12 mb-1">{teamBirthday.designation}</p>
                        <span className="badge bg-primary">
                          {teamBirthday.isToday ? "Birthday Today!" : `In ${teamBirthday.daysAhead} day(s)`}
                        </span>
                      </div>
                      <Link to="/me/chat" className="btn btn-sm btn-primary">Send Wishes</Link>
                    </>
                  ) : (
                    <p className="text-white-50 fs-12 mb-0">No upcoming birthdays recorded.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="card bg-secondary mb-3">
              <div className="card-body d-flex align-items-center justify-content-between p-3">
                <div>
                  <h5 className="text-white mb-1">Leave Policy</h5>
                  <p className="text-white fs-12 mb-0">View active company rules</p>
                </div>
                <Link to="/me/leave/policies" className="btn btn-white btn-sm px-3">View All</Link>
              </div>
            </div>

            <div className="card bg-warning">
              <div className="card-body d-flex align-items-center justify-content-between p-3">
                <div>
                  <h5 className="mb-1">Next Holiday</h5>
                  <p className="text-gray-9 fs-12 mb-0">
                    {nextHoliday
                      ? `${nextHoliday.name}, ${safeFormatDate(nextHoliday.date)}`
                      : "No upcoming holidays"}
                  </p>
                </div>
                <Link to="/me/organization/holidays" className="btn btn-white btn-sm px-3">View All</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 5: Team Members + Notifications + Meetings Schedule + Company Announcements (1/4 each) */}
      <div className="row">
        {/* Team Members */}
        <div className="col-xl-3 col-md-6 d-flex">
          <div className="card flex-fill">
            <div className="card-header">
              <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
                <h5>Team Members</h5>
                <Link to="/me/employees" className="btn btn-light btn-sm">View All</Link>
              </div>
            </div>
            <div className="card-body">
              {teamMembers.length === 0 ? (
                <div className="py-4 text-center text-muted fs-13">No team members found in your department.</div>
              ) : (
                teamMembers.map((tm: any) => (
                  <div key={tm.id} className="d-flex align-items-center justify-content-between mb-3">
                    <div className="d-flex align-items-center">
                      <span className="avatar flex-shrink-0 bg-primary-transparent text-primary fw-bold rounded-circle d-inline-flex align-items-center justify-content-center">
                        {tm.avatarUrl ? (
                          <img src={tm.avatarUrl} className="rounded-circle w-100 h-100 object-fit-cover" alt={tm.fullName} />
                        ) : (
                          getInitials(tm.fullName)
                        )}
                      </span>
                      <div className="ms-2">
                        <h6 className="fs-14 fw-medium text-truncate mb-0">{tm.fullName}</h6>
                        <p className="fs-12 text-muted mb-0">{tm.designation}</p>
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-1">
                      {tm.email && (
                        <a href={`mailto:${tm.email}`} className="btn btn-light btn-icon btn-sm" title={tm.email}>
                          <i className="ti ti-mail-bolt fs-16"></i>
                        </a>
                      )}
                      <Link to="/me/chat" className="btn btn-light btn-icon btn-sm" title="Message">
                        <i className="ti ti-brand-hipchat fs-16"></i>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="col-xl-3 col-md-6 d-flex">
          <div className="card flex-fill">
            <div className="card-header">
              <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
                <h5>Notifications</h5>
                <Link to="/me/notifications" className="btn btn-light btn-sm">View All</Link>
              </div>
            </div>
            <div className="card-body">
              {notifications.length === 0 ? (
                <div className="py-4 text-center text-muted fs-13">You&apos;re all caught up! No new notifications.</div>
              ) : (
                notifications.map((n: any) => (
                  <div key={n.id} className="d-flex align-items-start mb-3">
                    <span className="avatar avatar-sm rounded-circle bg-primary-transparent text-primary flex-shrink-0 me-2 d-inline-flex align-items-center justify-content-center">
                      <i className="ti ti-bell fs-14"></i>
                    </span>
                    <div className="flex-fill min-w-0">
                      <h6 className="fs-14 fw-medium text-truncate mb-1">{n.title}</h6>
                      <p className="fs-12 text-muted mb-1 text-truncate">{n.body}</p>
                      <span className="fs-11 text-muted">
                        {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : "Just now"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Meetings Schedule */}
        <div className="col-xl-3 col-md-6 d-flex">
          <div className="card flex-fill">
            <div className="card-header">
              <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
                <h5>Meetings Schedule</h5>
                <Link to="/me/meetings" className="btn btn-light btn-sm">View All</Link>
              </div>
            </div>
            <div className="card-body schedule-timeline">
              {meetings.length === 0 ? (
                <div className="py-4 text-center text-muted fs-13">No upcoming meetings scheduled.</div>
              ) : (
                meetings.map((m: any) => (
                  <div key={m.id} className="d-flex align-items-start schedule-item mb-3">
                    <div className="d-flex align-items-center flex-fill timeline-hr">
                      <div className="me-3 flex-shrink-0">
                        <span className="fs-12 fw-medium text-dark d-block">
                          {m.timeLabel || safeFormatDate(m.startTime, "hh:mm a")}
                        </span>
                        <span className="fs-11 text-muted">{safeFormatDate(m.startTime, "dd MMM")}</span>
                      </div>
                      <div className="flex-fill bg-light rounded p-2">
                        <h6 className="fs-13 fw-semibold mb-1">{m.title}</h6>
                        <div className="d-flex align-items-center justify-content-between">
                          <span className="fs-12 text-muted">{m.category}</span>
                          {m.meetingUrl && (
                            <a href={m.meetingUrl} target="_blank" rel="noreferrer" className="fs-11 text-primary fw-semibold">
                              Join
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        {/* Company Announcements (1/4 Container Widget) */}
        <div className="col-xl-3 col-md-6 d-flex">
          <div className="card flex-fill border-0 bg-transparent shadow-none">
            <OrganizationAnnouncementsWidget compact className="flex-fill mb-0" />
          </div>
        </div>
      </div>

      {/* Apply Leave Modal */}
      <Dialog open={applyLeaveOpen} onOpenChange={setApplyLeaveOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              applyLeaveMutation.mutate();
            }}
            className="space-y-4 py-2"
          >
            <div>
              <label className="block text-sm font-medium mb-1">Leave Type</label>
              <select
                value={leaveTypeId}
                onChange={(e) => setLeaveTypeId(e.target.value)}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select Leave Type</option>
                {(leaveSummary.leaveTypes || []).map((lt: any) => (
                  <option key={lt.id} value={lt.id}>
                    {lt.name} ({lt.daysPerYear ?? 0} days/yr)
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">From Date</label>
                <input
                  type="date"
                  value={leaveFrom}
                  onChange={(e) => setLeaveFrom(e.target.value)}
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">To Date</label>
                <input
                  type="date"
                  value={leaveTo}
                  onChange={(e) => setLeaveTo(e.target.value)}
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reason</label>
              <textarea
                rows={3}
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder="Enter reason for leave..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setApplyLeaveOpen(false)}
                className="btn btn-light"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={applyLeaveMutation.isPending}
                className="btn btn-primary"
              >
                {applyLeaveMutation.isPending ? "Submitting..." : "Submit Application"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
