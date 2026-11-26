'use client';

import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { OrganizationAnnouncementsWidget } from "@/components/dashboard/organization-announcements-widget";
import { Link } from "@/src/lib/router-compat";
import { format } from "date-fns";

const Chart = lazy(() => import("react-apexcharts"));

function formatCurrency(val: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(val) || 0);
}

export default function HrmDashboardPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: dash, isLoading, refetch } = useQuery<any>({
    queryKey: ["hr-dashboard-realtime"],
    queryFn: async () => {
      const res = await api.get<any>("/hr/dashboard");
      return res?.data || res || {};
    },
    refetchInterval: 30000,
  });

  const headcount = dash?.headcount || {
    total: 0,
    active: 0,
    onLeave: 0,
    terminated: 0,
    presentToday: 0,
    byEmploymentType: { full_time: 0, part_time: 0, contract: 0, intern: 0 },
  };
  const deptDist: Array<{ name: string; count: number }> = dash?.departmentDistribution || [];
  const attendanceTrend = dash?.attendanceTrend || { labels: ["Mon", "Tue", "Wed", "Thu", "Fri"], present: [0, 0, 0, 0, 0], absent: [0, 0, 0, 0, 0] };
  const lateArrivals: any[] = dash?.lateArrivalsToday || [];
  const leaveSummary = dash?.leaveSummary || { totalRequests: 0, pendingCount: 0, approvedCount: 0, distribution: [] };
  const pendingApprovals: any[] = dash?.pendingApprovals || [];
  const recruitment = dash?.recruitment || { totalJobs: 0, openJobs: 0 };
  const training = dash?.training || { totalCourses: 0, activeCourses: 0 };
  const payroll = dash?.payroll || { latestNet: 0, latestDeductions: 0, runsCount: 0, history: [] };
  const upcomingHolidays: any[] = dash?.upcomingHolidays || [];
  const upcomingMeetings: any[] = dash?.upcomingMeetings || [];

  const activePct = headcount.total > 0 ? Math.round((headcount.active / headcount.total) * 100) : 0;
  const presentPct = headcount.active > 0 ? Math.round((headcount.presentToday / headcount.active) * 100) : 0;

  const attendanceBarOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { height: 260, type: "bar", stacked: true, toolbar: { show: false } },
      plotOptions: { bar: { columnWidth: "45%", borderRadius: 4 } },
      colors: ["#16a34a", "#e11d48"],
      xaxis: { categories: attendanceTrend.labels },
      dataLabels: { enabled: false },
      legend: { position: "top" },
    }),
    [attendanceTrend.labels]
  );

  const attendanceBarSeries = useMemo(
    () => [
      { name: "Present", data: attendanceTrend.present },
      { name: "Absent / Off", data: attendanceTrend.absent },
    ],
    [attendanceTrend.present, attendanceTrend.absent]
  );

  const deptBarOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { height: 280, type: "bar", toolbar: { show: false } },
      colors: ["#0d6efd"],
      plotOptions: { bar: { borderRadius: 6, columnWidth: "45%" } },
      dataLabels: { enabled: false },
      xaxis: {
        categories: deptDist.length > 0 ? deptDist.map((d) => d.name) : ["General"],
        labels: { style: { fontSize: "12px" } },
      },
      grid: { strokeDashArray: 4 },
    }),
    [deptDist]
  );

  const deptBarSeries = useMemo(
    () => [
      {
        name: "Employees",
        data: deptDist.length > 0 ? deptDist.map((d) => d.count) : [0],
      },
    ],
    [deptDist]
  );

  const leaveDonutOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { height: 210, type: "donut", toolbar: { show: false } },
      colors: ["#0d6efd", "#16a34a", "#f59e0b", "#0284c7", "#e11d48"],
      labels:
        leaveSummary.distribution?.length > 0
          ? leaveSummary.distribution.map((d: any) => d.name)
          : ["No Leaves"],
      legend: { position: "bottom", fontSize: "12px" },
      dataLabels: { enabled: false },
    }),
    [leaveSummary.distribution]
  );

  const leaveDonutSeries = useMemo(
    () =>
      leaveSummary.distribution?.length > 0
        ? leaveSummary.distribution.map((d: any) => d.count)
        : [1],
    [leaveSummary.distribution]
  );

  return (
    <div className="dashboard-scope w-full">
      {/* Breadcrumb & Actions */}
      <div className="d-flex align-items-center justify-content-between flex-wrap mb-3">
        <div className="my-auto mb-2">
          <h2 className="mb-1">HR Dashboard</h2>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/hr/dashboard"><i className="ti ti-smart-home"></i></Link>
              </li>
              <li className="breadcrumb-item">Dashboard</li>
              <li className="breadcrumb-item active" aria-current="page">HR Dashboard</li>
            </ol>
          </nav>
        </div>
        <div className="d-flex align-items-center gap-2 mb-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="btn btn-white d-inline-flex align-items-center"
          >
            <i className="ti ti-refresh me-1"></i>Refresh Live
          </button>
          <Link to="/hr/employees/new" className="btn btn-primary d-inline-flex align-items-center">
            <i className="ti ti-user-plus me-1"></i>Add Employee
          </Link>
        </div>
      </div>

      {/* Row 1: 4 Live KPI Cards */}
      <div className="row">
        <div className="col-xl-3 col-md-6 d-flex">
          <div className="card flex-fill">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="avatar avatar-md bg-primary-transparent text-primary rounded-circle d-inline-flex align-items-center justify-content-center">
                  <i className="ti ti-users fs-20"></i>
                </span>
                <span className="badge bg-success-transparent text-success">{activePct}% Active</span>
              </div>
              <p className="fs-13 text-muted mb-1">Total Workforce</p>
              <h3 className="mb-1 tabular-nums">{isLoading ? "..." : headcount.total}</h3>
              <p className="fs-12 text-muted mb-0">
                {headcount.active} active · {headcount.onLeave} on leave
              </p>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 d-flex">
          <div className="card flex-fill">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="avatar avatar-md bg-success-transparent text-success rounded-circle d-inline-flex align-items-center justify-content-center">
                  <i className="ti ti-clock-check fs-20"></i>
                </span>
                <span className="badge bg-primary-transparent text-primary">{presentPct}% Present</span>
              </div>
              <p className="fs-13 text-muted mb-1">Present Today</p>
              <h3 className="mb-1 tabular-nums">{isLoading ? "..." : headcount.presentToday}</h3>
              <p className="fs-12 text-muted mb-0">
                {lateArrivals.length} late arrival(s) today
              </p>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 d-flex">
          <div className="card flex-fill">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="avatar avatar-md bg-warning-transparent text-warning rounded-circle d-inline-flex align-items-center justify-content-center">
                  <i className="ti ti-calendar-event fs-20"></i>
                </span>
                <Link to="/hr/leave/applications" className="fs-12 text-primary fw-semibold">Review</Link>
              </div>
              <p className="fs-13 text-muted mb-1">Pending Leave Requests</p>
              <h3 className="mb-1 tabular-nums">{isLoading ? "..." : leaveSummary.pendingCount}</h3>
              <p className="fs-12 text-muted mb-0">
                {leaveSummary.approvedCount} approved this year
              </p>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 d-flex">
          <div className="card flex-fill">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="avatar avatar-md bg-info-transparent text-info rounded-circle d-inline-flex align-items-center justify-content-center">
                  <i className="ti ti-briefcase fs-20"></i>
                </span>
                <Link to="/hr/recruitment/job-postings" className="fs-12 text-primary fw-semibold">Jobs</Link>
              </div>
              <p className="fs-13 text-muted mb-1">Open Job Postings</p>
              <h3 className="mb-1 tabular-nums">{isLoading ? "..." : recruitment.openJobs}</h3>
              <p className="fs-12 text-muted mb-0">
                {recruitment.totalJobs} total · {training.activeCourses} active trainings
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Attendance Trend + Department Distribution + Leave Breakdown */}
      <div className="row">
        <div className="col-xl-4 d-flex">
          <div className="card flex-fill">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="card-title mb-0">Attendance Trend (5 Days)</h5>
              <Link to="/hr/attendance/records" className="fs-12 text-primary fw-semibold">View All</Link>
            </div>
            <div className="card-body">
              {isMounted && (
                <Suspense fallback={<div className="p-4 text-center text-muted">Loading chart...</div>}>
                  <Chart options={attendanceBarOptions} series={attendanceBarSeries} type="bar" height={260} width="100%" />
                </Suspense>
              )}
            </div>
          </div>
        </div>

        <div className="col-xl-5 d-flex">
          <div className="card flex-fill">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="card-title mb-0">Department Distribution</h5>
              <Link to="/hr/organization/departments" className="fs-12 text-primary fw-semibold">Departments</Link>
            </div>
            <div className="card-body">
              {isMounted && (
                <Suspense fallback={<div className="p-4 text-center text-muted">Loading chart...</div>}>
                  <Chart options={deptBarOptions} series={deptBarSeries} type="bar" height={260} width="100%" />
                </Suspense>
              )}
            </div>
          </div>
        </div>

        <div className="col-xl-3 d-flex">
          <div className="card flex-fill">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="card-title mb-0">Leave Type Breakdown</h5>
              <span className="badge bg-light text-dark border">{leaveSummary.totalRequests}</span>
            </div>
            <div className="card-body d-flex flex-column justify-content-center">
              {isMounted && (
                <Suspense fallback={<div className="p-4 text-center text-muted">Loading chart...</div>}>
                  <Chart options={leaveDonutOptions} series={leaveDonutSeries} type="donut" height={210} width="100%" />
                </Suspense>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Pending Approvals + Late Arrivals + Payroll & Holidays + Company Announcements (1/4 each) */}
      <div className="row">
        <div className="col-xl-3 col-md-6 d-flex">
          <div className="card flex-fill">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="card-title mb-0">Pending Approvals</h5>
              <Link to="/hr/leave/applications" className="fs-12 text-primary fw-semibold">View All</Link>
            </div>
            <div className="card-body">
              {pendingApprovals.length === 0 ? (
                <p className="text-muted fs-13 text-center py-4 mb-0">No pending leave approvals.</p>
              ) : (
                pendingApprovals.map((item: any) => (
                  <div key={item.id} className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-2">
                    <div className="min-w-0">
                      <h6 className="fs-13 fw-semibold mb-0 text-truncate">{item.employeeName}</h6>
                      <span className="fs-11 text-muted">
                        {item.leaveType} · {item.days}d ({item.startDate ? format(new Date(item.startDate), "dd MMM") : "—"})
                      </span>
                    </div>
                    <span className="badge bg-warning-transparent text-warning">Pending</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 d-flex">
          <div className="card flex-fill">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="card-title mb-0">Late Arrivals Today</h5>
              <span className="badge bg-danger-transparent text-danger">{lateArrivals.length}</span>
            </div>
            <div className="card-body">
              {lateArrivals.length === 0 ? (
                <p className="text-muted fs-13 text-center py-4 mb-0">No late arrivals recorded today.</p>
              ) : (
                lateArrivals.map((la: any) => (
                  <div key={la.id} className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-2">
                    <div className="min-w-0">
                      <h6 className="fs-13 fw-semibold mb-0 text-truncate">{la.employeeName}</h6>
                      <span className="fs-11 text-muted">{la.department}</span>
                    </div>
                    <span className="badge bg-danger-transparent text-danger">+{la.lateMinutes}m</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 d-flex">
          <div className="card flex-fill">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="card-title mb-0">Payroll &amp; Schedule</h5>
              <Link to="/hr/payroll/runs" className="fs-12 text-primary fw-semibold">Payroll</Link>
            </div>
            <div className="card-body space-y-3">
              <div className="p-3 rounded bg-light border">
                <span className="fs-12 text-muted d-block">Latest Payroll Net</span>
                <h4 className="mb-0 tabular-nums">{formatCurrency(payroll.latestNet)}</h4>
                <span className="fs-11 text-muted">
                  Deductions: {formatCurrency(payroll.latestDeductions)} · {payroll.runsCount} runs
                </span>
              </div>
              <div>
                <h6 className="fs-12 text-muted text-uppercase mb-2">Upcoming Holidays</h6>
                {upcomingHolidays.length === 0 ? (
                  <p className="fs-12 text-muted mb-0">No upcoming holidays.</p>
                ) : (
                  upcomingHolidays.slice(0, 3).map((h: any) => (
                    <div key={h.id} className="d-flex align-items-center justify-content-between py-1">
                      <span className="fs-12 fw-medium text-truncate">{h.name}</span>
                      <span className="fs-11 text-muted">
                        {h.date ? format(new Date(h.date), "dd MMM") : "—"}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div>
                <h6 className="fs-12 text-muted text-uppercase mb-2">Upcoming Meetings</h6>
                {upcomingMeetings.length === 0 ? (
                  <p className="fs-12 text-muted mb-0">No scheduled meetings.</p>
                ) : (
                  upcomingMeetings.slice(0, 2).map((m: any) => (
                    <div key={m.id} className="d-flex align-items-center justify-content-between py-1">
                      <span className="fs-12 fw-medium text-truncate">{m.title}</span>
                      <span className="fs-11 text-muted">
                        {m.startTime ? format(new Date(m.startTime), "dd MMM") : "—"}
                      </span>
                    </div>
                  ))
                )}
              </div>
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
    </div>
  );
}
