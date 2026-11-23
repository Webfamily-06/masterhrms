'use client';

import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Link } from "@/src/lib/router-compat";

const Chart = lazy(() => import("react-apexcharts"));

export default function ItAdminDashboardPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <>
      {/*  Breadcrumb  */}
				<div className="d-xl-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
					<div className="my-auto mb-2">
						<h2 className="mb-1">IT Admin Dashbaord</h2>
						<nav>
							<ol className="breadcrumb mb-0">
								<li className="breadcrumb-item">
									<a href="index.html"><i className="ti ti-smart-home"></i></a>
								</li>
								<li className="breadcrumb-item">
									Dashboard
								</li>
								<li className="breadcrumb-item active" aria-current="page">IT Admin Dashbaord</li>
							</ol>
						</nav>
					</div>
					<div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
						<div className="active-user-item">
							<div className="avatar avatar-md bg-success rounded"> <i className="ti ti-server fs-16"></i> </div>
							<p className="fs-12 mb-0">Active Users <span className="fs-14 fw-semibold text-dark ms-1">248</span>
							</p>
						</div>
						<div className="active-user-item">
							<div className="avatar avatar-md bg-danger rounded"> <i className="ti ti-info-octagon fs-16"></i>
							</div>
							<p className="fs-12 mb-0">Security Alerts <span
									className="fs-14 fw-semibold text-dark ms-1">3</span> </p>
						</div>
						<ul className="nav nav-tabs nav-tabs-solid custom-solid-tab">
							<li className="nav-item"><a className="nav-link active" href="#solid-tab1"
									data-bs-toggle="tab">Production</a></li>
							<li className="nav-item"><a className="nav-link" href="#solid-tab2" data-bs-toggle="tab">Staging</a>
							</li>
							<li className="nav-item"><a className="nav-link" href="#solid-tab3"
									data-bs-toggle="tab">Development</a></li>
						</ul>
						<div className=" mt-2 head-icons">
							<a href="#" onClick={(e) => e.preventDefault()} className="" data-bs-toggle="tooltip" data-bs-placement="top"
								data-bs-original-title="Collapse" id="collapse-header">
								<i className="ti ti-chevrons-up"></i>
							</a>
						</div>
					</div>
				</div>
				{/*  /Breadcrumb  */}


				{/*  HRMS System Uptime  */}
				<div className="row row-gap-4 mb-4">

					{/*  Item 1  */}
					<div className="col-xxl-3 col-xl-6 col-lg-6 col-md-6 col-sm-6 d-flex">
						<div className="card mb-0 flex-fill">
							<div className="card-body">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3">
									<p className="mb-0">HRMS System Uptime</p>
									<div className="avatar avatar bg-light rounded-circle border">
										<i className="ti ti-clock-share text-gray-6 fs-20"></i>
									</div>
								</div>
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
									<div>
										<h2 className="main-title mb-1">99.9%</h2>
										<p className="mb-0 fs-13">Last 30 days</p>
									</div>
									<div>
										<div id="uptime-chart">
  {isMounted && (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={{ chart: { id: "uptime-chart", toolbar: { show: false } }, colors: ["#0d6efd", "#10b981", "#f59e0b", "#6366f1"], dataLabels: { enabled: false } }} series={[{ name: "uptime-chart", data: [30, 40, 35, 50, 49, 60, 70, 91, 125] }]} type="area" height={220} width="100%" />
    </Suspense>
  )}
</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/*  Item 2  */}
					<div className="col-xxl-3 col-xl-6 col-lg-6 col-md-6 col-sm-6 d-flex">
						<div className="card mb-0 flex-fill">
							<div className="card-body">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3">
									<p className="mb-0">API Status</p>
									<div className="avatar avatar bg-light rounded-circle border">
										<i className="ti ti-api-app text-gray-6 fs-20"></i>
									</div>
								</div>
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
									<div>
										<h2 className="main-title mb-1">Healthy</h2>
										<p className="mb-0 fs-13">All operational</p>
									</div>
									<div>
										<div id="api-chart">
  {isMounted && (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={{ chart: { id: "api-chart", toolbar: { show: false } }, colors: ["#0d6efd", "#10b981", "#f59e0b", "#6366f1"], dataLabels: { enabled: false } }} series={[{ name: "api-chart", data: [30, 40, 35, 50, 49, 60, 70, 91, 125] }]} type="area" height={220} width="100%" />
    </Suspense>
  )}
</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/*  Item 3  */}
					<div className="col-xxl-3 col-xl-6 col-lg-6 col-md-6 col-sm-6 d-flex">
						<div className="card mb-0 flex-fill">
							<div className="card-body">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3">
									<p className="mb-0">Open IT Tickets</p>
									<div className="avatar avatar bg-light rounded-circle border">
										<i className="ti ti-badge text-gray-6 fs-20"></i>
									</div>
								</div>
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
									<div>
										<h2 className="main-title mb-1">18</h2>
										<p className="mb-0 fs-13">5 high priority</p>
									</div>
									<div>
										<div id="tickets-chart">
  {isMounted && (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={{ chart: { id: "tickets-chart", toolbar: { show: false } }, colors: ["#0d6efd", "#10b981", "#f59e0b", "#6366f1"], dataLabels: { enabled: false } }} series={[{ name: "tickets-chart", data: [30, 40, 35, 50, 49, 60, 70, 91, 125] }]} type="area" height={220} width="100%" />
    </Suspense>
  )}
</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/*  Item 4  */}
					<div className="col-xxl-3 col-xl-6 col-lg-6 col-md-6 col-sm-6 d-flex">
						<div className="card mb-0 flex-fill">
							<div className="card-body">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3">
									<p className="mb-0">Background Jobs</p>
									<div className="avatar avatar bg-light rounded-circle border">
										<i className="ti ti-briefcase-2 text-gray-6 fs-20"></i>
									</div>
								</div>
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
									<div>
										<h2 className="main-title mb-1">Running</h2>
										<p className="mb-0 fs-13">12/12 jobs healthy</p>
									</div>
									<div>
										<div id="jobs-chart">
  {isMounted && (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={{ chart: { id: "jobs-chart", toolbar: { show: false } }, colors: ["#0d6efd", "#10b981", "#f59e0b", "#6366f1"], dataLabels: { enabled: false } }} series={[{ name: "jobs-chart", data: [30, 40, 35, 50, 49, 60, 70, 91, 125] }]} type="area" height={220} width="100%" />
    </Suspense>
  )}
</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/*  Storage Usage by Module   */}
				<div className="row row-gap-4 mb-4">
					<div className="col-xxl-8">
						<div className="card mb-0">
							<div className="card-body">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-2">
									<h2 className="card-title d-flex align-items-center gap-2 mb-0"><i
											className="ti ti-server text-primary fs-16"></i>Storage Usage by Module (GB)
									</h2>
									<div className="day-active-item one d-inline-flex align-items-center gap-2">
										<button className="day">1D</button>
										<button className="day">7D</button>
										<button className="day">1M</button>
										<button className="day active">1Y</button>
									</div>
								</div>

								<div id="storages-chart">
  {isMounted && (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={{ chart: { id: "storages-chart", toolbar: { show: false } }, colors: ["#0d6efd", "#10b981", "#f59e0b", "#6366f1"], dataLabels: { enabled: false } }} series={[{ name: "storages-chart", data: [30, 40, 35, 50, 49, 60, 70, 91, 125] }]} type="area" height={220} width="100%" />
    </Suspense>
  )}
</div>

								{/*  start row  */}
								<div className="row row-gap-4 mt-3">
									{/*  Item 1  */}
									<div className="col-md-4 col-sm-6">
										<div className="card border bg-light mb-0">
											<div className="card-body">
												<p className="mb-2 fs-13">Hr</p>
												<h3
													className="mb-0 fs-14 fw-semibold d-flex align-items-center justify-content-between flex-wrap gap-2">
													Uptime: 99.9%<span><i
															className="ti ti-shield-check-filled text-success fs-16"></i></span>
												</h3>
											</div>
										</div>
									</div>
									{/*  Item 2  */}
									<div className="col-md-4 col-sm-6">
										<div className="card border bg-light mb-0">
											<div className="card-body">
												<p className="mb-2 fs-13">Payroll Engine</p>
												<h3
													className="mb-0 fs-14 fw-semibold d-flex align-items-center justify-content-between flex-wrap gap-2">
													Uptime: 96.9%<span><i
															className="ti ti-shield-check-filled text-success fs-16"></i></span>
												</h3>
											</div>
										</div>
									</div>
									{/*  Item 1  */}
									<div className="col-md-4 col-sm-6">
										<div className="card border bg-light mb-0">
											<div className="card-body">
												<p className="mb-2 fs-13">Attendance Sync</p>
												<h3
													className="mb-0 fs-14 fw-semibold d-flex align-items-center justify-content-between flex-wrap gap-2">
													Uptime: 99.9%<span><i
															className="ti ti-shield-check-filled text-success fs-16"></i></span>
												</h3>
											</div>
										</div>
									</div>
									{/*  Item 1  */}
									<div className="col-md-4 col-sm-6">
										<div className="card border bg-light mb-0">
											<div className="card-body">
												<p className="mb-2 fs-13">Recruitment Module</p>
												<h3
													className="mb-0 fs-14 fw-semibold d-flex align-items-center justify-content-between flex-wrap gap-2">
													Downtime:19.9%<span><i
															className="ti ti-settings-filled text-danger fs-16"></i></span>
												</h3>
											</div>
										</div>
									</div>
									{/*  Item 1  */}
									<div className="col-md-4 col-sm-6">
										<div className="card border bg-light mb-0">
											<div className="card-body">
												<p className="mb-2 fs-13">Leave Management</p>
												<h3
													className="mb-0 fs-14 fw-semibold d-flex align-items-center justify-content-between flex-wrap gap-2">
													Uptime: 91.9%<span><i
															className="ti ti-shield-check-filled text-success fs-16"></i></span>
												</h3>
											</div>
										</div>
									</div>
									{/*  Item 1  */}
									<div className="col-md-4 col-sm-6">
										<div className="card border bg-light mb-0">
											<div className="card-body">
												<p className="mb-2 fs-13">Document Storage</p>
												<h3
													className="mb-0 fs-14 fw-semibold d-flex align-items-center justify-content-between flex-wrap gap-2">
													Uptime: 95.9%<span><i
															className="ti ti-shield-check-filled text-success fs-16"></i></span>
												</h3>
											</div>
										</div>
									</div>
								</div>
								{/*  end row  */}
							</div>
						</div>
					</div>
					<div className="col-xxl-4">
						<div className="card">
							<div className="card-body">
								<h2 className="card-title d-flex align-items-center gap-2 mb-4"><i
										className="ti ti-shield text-primary fs-16"></i>
									MFA Enabled Users
								</h2>
								<p
									className="sub-title d-flex align-items-center justify-content-between flex-wrap gap-2 text-dark">
									<span className="fw-normal text-gray-6 fs-14"> 2,168 out of 2,436 users</span> 89%
								</p>
								<div id="mfa-chart">
  {isMounted && (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={{ chart: { id: "mfa-chart", toolbar: { show: false } }, colors: ["#0d6efd", "#10b981", "#f59e0b", "#6366f1"], dataLabels: { enabled: false } }} series={[{ name: "mfa-chart", data: [30, 40, 35, 50, 49, 60, 70, 91, 125] }]} type="area" height={220} width="100%" />
    </Suspense>
  )}
</div>
							</div>
						</div>

						<div className="card mb-0">
							<div className="card-body">
								<h2 className="card-title d-flex align-items-center gap-2 mb-4"><i
										className="ti ti-settings-2 text-primary fs-16"></i>Quick IT Actions</h2>

								<div className="row row-gap-4">
									{/*  Item 1  */}
									<div className="col-xxl-6 col-xl-4 col-lg-6 col-md-6 col-sm-6">
										<div className="text-center">
											<div className="avatar avatar-xl bg-dark rounded-circle p-3 mb-2">
												<img src="/assets/img/icons/action-icon-1.svg" alt="action"
													className="img-fluid img-1 " />
											</div>
											<p className="mb-0 fw-medium">Restart HRMS Services</p>
										</div>
									</div>
									{/*  Item 2  */}
									<div className="col-xxl-6 col-xl-4 col-lg-6 col-md-6 col-sm-6">
										<div className="text-center">
											<div className="avatar avatar-xl bg-dark rounded-circle p-3 mb-2">
												<img src="/assets/img/icons/action-icon-2.svg" alt="action"
													className="img-fluid img-1 " />
											</div>
											<p className="mb-0 fw-medium">Sync Biometric </p>
										</div>
									</div>
									{/*  Item 3  */}
									<div className="col-xxl-6 col-xl-4 col-lg-6 col-md-6 col-sm-6">
										<div className="text-center">
											<div className="avatar avatar-xl bg-dark rounded-circle p-3 mb-2">
												<img src="/assets/img/icons/action-icon-3.svg" alt="action"
													className="img-fluid img-1 " />
											</div>
											<p className="mb-0 fw-medium">Clear System Cache</p>
										</div>
									</div>
									{/*  Item 4  */}
									<div className="col-xxl-6 col-xl-4 col-lg-6 col-md-6 col-sm-6">
										<div className="text-center">
											<div className="avatar avatar-xl bg-dark rounded-circle p-3 mb-2">
												<img src="/assets/img/icons/action-icon-4.svg" alt="action"
													className="img-fluid img-1 " />
											</div>
											<p className="mb-0 fw-medium">Schedule Maintenance</p>
										</div>
									</div>
									{/*  Item 5  */}
									<div className="col-xxl-6 col-xl-4 col-lg-6 col-md-6 col-sm-6">
										<div className="text-center">
											<div className="avatar avatar-xl bg-dark rounded-circle p-3 mb-2">
												<img src="/assets/img/icons/action-icon-5.svg" alt="action"
													className="img-fluid img-1 " />
											</div>
											<p className="mb-0 fw-medium">Stop Background Jobs</p>
										</div>
									</div>
									{/*  Item 6  */}
									<div className="col-xxl-6 col-xl-4 col-lg-6 col-md-6 col-sm-6">
										<div className="text-center">
											<div className="avatar avatar-xl bg-dark rounded-circle p-3 mb-2">
												<img src="/assets/img/icons/action-icon-6.svg" alt="action"
													className="img-fluid img-1 " />
											</div>
											<p className="mb-0 fw-medium">Re-run Payroll Job</p>
										</div>
									</div>
								</div>

							</div>
						</div>
					</div>
				</div>

				{/*  User Access & Role Management  */}
				<div className="card">
					<div className="card-body pb-0">
						<div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-4">
							<h2 className="card-title mb-0"> User Access & Role Management </h2>
							<div className="dropdown">
								<a href="#" onClick={(e) => e.preventDefault()}
									className="border btn btn-white btn-md fw-normal d-inline-flex align-items-center justify-content-center rounded gap-1 fw-medium"
									data-bs-toggle="dropdown">
									<i className="ti ti-calendar fs-14"></i> Today
								</a>
								<ul className="dropdown-menu mt-2 p-3">
									<li>
										<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">
											Today
										</a>
									</li>
									<li>
										<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">
											Weekly
										</a>
									</li>
									<li>
										<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">
											Monthly
										</a>
									</li>
								</ul>
							</div>
						</div>
						<div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-4">
							<p className="fs-14 fw-semibold text-gray-9 mb-0">Peak Hours (Today)</p>
							<div className="d-flex align-items-center gap-3 flex-wrap">
								<p className="d-flex align-items-center gap-1 mb-0"> <i
										className="ti ti-square-rounded-filled text-primary fs-15"></i> Low (0-50%) </p>
								<p className="d-flex align-items-center gap-1 mb-0"> <i
										className="ti ti-square-rounded-filled text-success fs-15"></i> Medium (50-70%) </p>
								<p className="d-flex align-items-center gap-1 mb-0"> <i
										className="ti ti-square-rounded-filled text-warning fs-15"></i> High (70-90%) </p>
								<p className="d-flex align-items-center gap-1 mb-0"> <i
										className="ti ti-square-rounded-filled text-danger fs-15"></i> Peak (90-100%) </p>
							</div>
						</div>

						{/*  start row  */}
						<div className="row row-gap-4 row-cols-1 row-cols-sm-2 row-cols-md-5 mb-4">
							{/*  Item 1  */}
							<div className="col">
								<div className="card border mb-0">
									<div className="card-body">
										<p className="mb-2 fs-13 d-flex align-items-center justify-content-between">9 AM <i
												className="ti ti-circle-filled text-primary fs-8"></i> </p>
										<h3
											className="mb-3 fs-16 fw-semibold d-flex align-items-center justify-content-between flex-wrap gap-2">
											85%</h3>
										<div className="progress progress-xs mb-2">
											<div className="progress-bar bg-primary progress-bar-striped" role="progressbar"
												style={{ width: "85%" }}></div>
										</div>
									</div>
								</div>
							</div>
							{/*  Item 2  */}
							<div className="col">
								<div className="card border mb-0">
									<div className="card-body">
										<p className="mb-2 fs-13 d-flex align-items-center justify-content-between">10 AM <i
												className="ti ti-circle-filled text-danger fs-8"></i> </p>
										<h3
											className="mb-3 fs-16 fw-semibold d-flex align-items-center justify-content-between flex-wrap gap-2">
											92%</h3>
										<div className="progress progress-xs mb-2">
											<div className="progress-bar bg-danger progress-bar-striped" role="progressbar"
												style={{ width: "92%" }}></div>
										</div>
									</div>
								</div>
							</div>
							{/*  Item 3  */}
							<div className="col">
								<div className="card border mb-0">
									<div className="card-body">
										<p className="mb-2 fs-13 d-flex align-items-center justify-content-between">11 AM <i
												className="ti ti-circle-filled text-primary fs-8"></i> </p>
										<h3
											className="mb-3 fs-16 fw-semibold d-flex align-items-center justify-content-between flex-wrap gap-2">
											78%</h3>
										<div className="progress progress-xs mb-2">
											<div className="progress-bar bg-primary progress-bar-striped" role="progressbar"
												style={{ width: "78%" }}></div>
										</div>
									</div>
								</div>
							</div>
							{/*  Item 4  */}
							<div className="col">
								<div className="card border mb-0">
									<div className="card-body">
										<p className="mb-2 fs-13 d-flex align-items-center justify-content-between">12 AM <i
												className="ti ti-circle-filled text-success fs-8"></i> </p>
										<h3
											className="mb-3 fs-16 fw-semibold d-flex align-items-center justify-content-between flex-wrap gap-2">
											45%</h3>
										<div className="progress progress-xs mb-2">
											<div className="progress-bar bg-success progress-bar-striped" role="progressbar"
												style={{ width: "45%" }}></div>
										</div>
									</div>
								</div>
							</div>
							{/*  Item 5  */}
							<div className="col">
								<div className="card border mb-0">
									<div className="card-body">
										<p className="mb-2 fs-13 d-flex align-items-center justify-content-between">1 AM <i
												className="ti ti-circle-filled text-success fs-8"></i> </p>
										<h3
											className="mb-3 fs-16 fw-semibold d-flex align-items-center justify-content-between flex-wrap gap-2">
											38%</h3>
										<div className="progress progress-xs mb-2">
											<div className="progress-bar bg-success progress-bar-striped" role="progressbar"
												style={{ width: "38%" }}></div>
										</div>
									</div>
								</div>
							</div>
							{/*  Item 6  */}
							<div className="col">
								<div className="card border mb-0">
									<div className="card-body">
										<p className="mb-2 fs-13 d-flex align-items-center justify-content-between">2 AM <i
												className="ti ti-circle-filled text-warning fs-8"></i> </p>
										<h3
											className="mb-3 fs-16 fw-semibold d-flex align-items-center justify-content-between flex-wrap gap-2">
											68%</h3>
										<div className="progress progress-xs mb-2">
											<div className="progress-bar bg-warning progress-bar-striped" role="progressbar"
												style={{ width: "68%" }}></div>
										</div>
									</div>
								</div>
							</div>
							{/*  Item 7  */}
							<div className="col">
								<div className="card border mb-0">
									<div className="card-body">
										<p className="mb-2 fs-13 d-flex align-items-center justify-content-between">3 AM <i
												className="ti ti-circle-filled text-primary fs-8"></i> </p>
										<h3
											className="mb-3 fs-16 fw-semibold d-flex align-items-center justify-content-between flex-wrap gap-2">
											82%</h3>
										<div className="progress progress-xs mb-2">
											<div className="progress-bar bg-primary progress-bar-striped" role="progressbar"
												style={{ width: "82%" }}></div>
										</div>
									</div>
								</div>
							</div>
							{/*  Item 8  */}
							<div className="col">
								<div className="card border mb-0">
									<div className="card-body">
										<p className="mb-2 fs-13 d-flex align-items-center justify-content-between">4 AM <i
												className="ti ti-circle-filled text-danger fs-8"></i> </p>
										<h3
											className="mb-3 fs-16 fw-semibold d-flex align-items-center justify-content-between flex-wrap gap-2">
											85%</h3>
										<div className="progress progress-xs mb-2">
											<div className="progress-bar bg-danger progress-bar-striped" role="progressbar"
												style={{ width: "85%" }}></div>
										</div>
									</div>
								</div>
							</div>
							{/*  Item 9  */}
							<div className="col">
								<div className="card border mb-0">
									<div className="card-body">
										<p className="mb-2 fs-13 d-flex align-items-center justify-content-between">5 AM <i
												className="ti ti-circle-filled text-primary fs-8"></i> </p>
										<h3
											className="mb-3 fs-16 fw-semibold d-flex align-items-center justify-content-between flex-wrap gap-2">
											88%</h3>
										<div className="progress progress-xs mb-2">
											<div className="progress-bar bg-primary progress-bar-striped" role="progressbar"
												style={{ width: "88%" }}></div>
										</div>
									</div>
								</div>
							</div>
							{/*  Item 10  */}
							<div className="col">
								<div className="card border mb-0">
									<div className="card-body">
										<p className="mb-2 fs-13 d-flex align-items-center justify-content-between">6 AM <i
												className="ti ti-circle-filled text-warning fs-8"></i> </p>
										<h3
											className="mb-3 fs-16 fw-semibold d-flex align-items-center justify-content-between flex-wrap gap-2">
											52%</h3>
										<div className="progress progress-xs mb-2">
											<div className="progress-bar bg-warning progress-bar-striped" role="progressbar"
												style={{ width: "52%" }}></div>
										</div>
									</div>
								</div>
							</div>
						</div>
						{/*  end row  */}

						<h2 className="card-title mb-0"> Login Count Analysis </h2>
						<div id="logactivity-chart">
  {isMounted && (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={{ chart: { id: "logactivity-chart", toolbar: { show: false } }, colors: ["#0d6efd", "#10b981", "#f59e0b", "#6366f1"], dataLabels: { enabled: false } }} series={[{ name: "logactivity-chart", data: [30, 40, 35, 50, 49, 60, 70, 91, 125] }]} type="area" height={220} width="100%" />
    </Suspense>
  )}
</div>
					</div>
				</div>

				{/*  start row  */}
				<div className="row row-gap-4 mb-4">
					<div className="col-xxl-5 d-flex">
						<div className="card flex-fill mb-0">
							<div className="card-body">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
									<h2 className="card-title d-flex align-items-center gap-2 mb-0"><i
											className="ti ti-script text-primary fs-16"></i>HRMS Usage Trend</h2>
									<div className="day-active-item one d-inline-flex align-items-center gap-2">
										<button className="day">1H</button>
										<button className="day">1D</button>
										<button className="day active">1W</button>
										<button className="day">1m</button>
									</div>
								</div>
								<div className="mb-3">
									<div id="Usage-chart">
  {isMounted && (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={{ chart: { id: "Usage-chart", toolbar: { show: false } }, colors: ["#0d6efd", "#10b981", "#f59e0b", "#6366f1"], dataLabels: { enabled: false } }} series={[{ name: "Usage-chart", data: [30, 40, 35, 50, 49, 60, 70, 91, 125] }]} type="area" height={220} width="100%" />
    </Suspense>
  )}
</div>
								</div>

								{/*  Security   */}
								<div>
									<div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-4">
										<h2 className="mb-0 fs-14"> Security & Compliance </h2>
										<div className="dropdown">
											<a href="#" onClick={(e) => e.preventDefault()}
												className="border btn btn-white btn-md fw-normal d-inline-flex align-items-center justify-content-center rounded gap-1 fw-medium"
												data-bs-toggle="dropdown">
												<i className="ti ti-calendar fs-14"></i> Today
											</a>
											<ul className="dropdown-menu mt-2 p-3">
												<li>
													<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">
														Today
													</a>
												</li>
												<li>
													<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">
														Weekly
													</a>
												</li>
												<li>
													<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">
														Monthly
													</a>
												</li>
											</ul>
										</div>
									</div>

									{/*  Item 1  */}
									<div
										className="d-flex flex-md-row flex-column align-items-md-center align-items-start justify-content-between gap-3 flex-wrap mb-4">
										<div className="security-item d-flex align-items-center gap-4">
											<h3 className="main-title mb-0">47 <span className="bg-primary line"></span></h3>
											<h4 className="fs-14 mb-0">
												Failed Logins
												<span className="pt-1 d-block fs-12 fw-normal text-gray-6">Last 24h</span>
											</h4>
										</div>
										<div id="failed-chart">
  {isMounted && (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={{ chart: { id: "failed-chart", toolbar: { show: false } }, colors: ["#0d6efd", "#10b981", "#f59e0b", "#6366f1"], dataLabels: { enabled: false } }} series={[{ name: "failed-chart", data: [30, 40, 35, 50, 49, 60, 70, 91, 125] }]} type="area" height={220} width="100%" />
    </Suspense>
  )}
</div>
									</div>

									{/*  Item 2  */}
									<div
										className="d-flex flex-md-row flex-column  align-items-md-center align-items-start justify-content-between gap-3 flex-wrap mb-4">
										<div className="security-item d-flex align-items-center gap-4">
											<h3 className="main-title mb-0">12 <span className="bg-secondary line"></span></h3>
											<h4 className="fs-14 mb-0">
												Suspicious Alerts
												<span className="pt-1 d-block fs-12 fw-normal text-gray-6">Active</span>
											</h4>
										</div>
										<div id="alerts-chart">
  {isMounted && (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={{ chart: { id: "alerts-chart", toolbar: { show: false } }, colors: ["#0d6efd", "#10b981", "#f59e0b", "#6366f1"], dataLabels: { enabled: false } }} series={[{ name: "alerts-chart", data: [30, 40, 35, 50, 49, 60, 70, 91, 125] }]} type="area" height={220} width="100%" />
    </Suspense>
  )}
</div>
									</div>

									{/*  Item 3  */}
									<div
										className="d-flex flex-md-row flex-column  align-items-md-center align-items-start justify-content-between gap-3 flex-wrap">
										<div className="security-item d-flex align-items-center gap-4">
											<h3 className="main-title mb-0">27 <span className="bg-warning line"></span></h3>
											<h4 className="fs-14 mb-0">
												Blocked IPs
												<span className="pt-1 d-block fs-12 fw-normal text-gray-6">Currently
													blocked</span>
											</h4>
										</div>
										<div id="blocked-chart">
  {isMounted && (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={{ chart: { id: "blocked-chart", toolbar: { show: false } }, colors: ["#0d6efd", "#10b981", "#f59e0b", "#6366f1"], dataLabels: { enabled: false } }} series={[{ name: "blocked-chart", data: [30, 40, 35, 50, 49, 60, 70, 91, 125] }]} type="area" height={220} width="100%" />
    </Suspense>
  )}
</div>
									</div>
								</div>
							</div>
						</div>
					</div>
					<div className="col-xxl-7">
						{/*  User Roles Distribution  */}
						<div className="card">
							<div className="card-body">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
									<h2 className="card-title d-flex align-items-center gap-2 mb-0"><i
											className="ti ti-script text-primary fs-16"></i>User Roles Distribution</h2>
									<div className="dropdown">
										<a href="#" onClick={(e) => e.preventDefault()}
											className="border btn btn-white btn-md fw-normal d-inline-flex align-items-center justify-content-center rounded gap-1 fw-medium"
											data-bs-toggle="dropdown">
											<i className="ti ti-calendar fs-14"></i> Today
										</a>
										<ul className="dropdown-menu mt-2 p-3">
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">
													Today
												</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">
													Weekly
												</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">
													Monthly
												</a>
											</li>
										</ul>
									</div>
								</div>
								<div
									className="d-flex align-items-start align-items-md-center flex-column flex-md-row gap-3">
									{/*  Item 1  */}
									<div className="user-role-item one">
										<p className="mb-0 fs-12 text-dark">Employees</p>
										<div className="progress progress-xl my-1 rounded">
											<div className="progress-bar bg-primary progress-bar-striped" role="progressbar"
												style={{ width: "100%" }}></div>
										</div>
										<p className="mb-0">2145</p>
									</div>

									{/*  Item 2  */}
									<div className="user-role-item two">
										<p className="mb-0 fs-12 text-dark">Managers</p>
										<div className="progress progress-xl my-1 rounded">
											<div className="progress-bar bg-secondary progress-bar-striped"
												role="progressbar" style={{ width: "100%" }}></div>
										</div>
										<p className="mb-0">234</p>
									</div>

									{/*  Item 3  */}
									<div className="user-role-item three">
										<p className="mb-0 fs-12 text-dark">HR Operations</p>
										<div className="progress progress-xl my-1 rounded">
											<div className="progress-bar bg-dark progress-bar-striped" role="progressbar"
												style={{ width: "100%" }}></div>
										</div>
										<p className="mb-0">45</p>
									</div>

									{/*  Item 4  */}
									<div className="user-role-item four">
										<p className="mb-0 fs-12 text-dark">Admins</p>
										<div className="progress progress-xl my-1 rounded">
											<div className="progress-bar bg-warning progress-bar-striped" role="progressbar"
												style={{ width: "100%" }}></div>
										</div>
										<p className="mb-0">12</p>
									</div>
								</div>

							</div>
						</div>

						{/*  Integration Error Counts (24h)  */}
						<div className="card mb-0">
							<div className="card-body pb-0">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-1">
									<h2 className="card-title d-flex align-items-center gap-2 mb-0"><i
											className="ti ti-sparkles text-primary fs-16"></i>Integration Error Counts (24h)
									</h2>
									<div className="dropdown">
										<a href="#" onClick={(e) => e.preventDefault()}
											className="border btn btn-white btn-md fw-normal d-inline-flex align-items-center justify-content-center rounded gap-1 fw-medium"
											data-bs-toggle="dropdown">
											<i className="ti ti-calendar fs-14"></i> Today
										</a>
										<ul className="dropdown-menu mt-2 p-3">
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">
													Today
												</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">
													Weekly
												</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">
													Monthly
												</a>
											</li>
										</ul>
									</div>
								</div>
								<div id="error-chart">
  {isMounted && (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={{ chart: { id: "error-chart", toolbar: { show: false } }, colors: ["#0d6efd", "#10b981", "#f59e0b", "#6366f1"], dataLabels: { enabled: false } }} series={[{ name: "error-chart", data: [30, 40, 35, 50, 49, 60, 70, 91, 125] }]} type="area" height={220} width="100%" />
    </Suspense>
  )}
</div>
							</div>
						</div>
					</div>
				</div>
				{/*  end row  */}

			
    </>
  );
}
