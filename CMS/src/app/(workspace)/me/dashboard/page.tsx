'use client';

import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Link } from "@/src/lib/router-compat";
import { CountryFlag } from "@/components/ui/country-flag";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Chart = lazy(() => import("react-apexcharts"));

export default function EmployeeDashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [applyLeaveOpen, setApplyLeaveOpen] = useState(false);
  const [punchedIn, setPunchedIn] = useState(true);
  const [timer, setTimer] = useState("05:45:32");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const leavesChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        height: 185,
        type: "donut",
        toolbar: { show: false },
      },
      dataLabels: { enabled: false },
      series: [15, 10, 5, 10, 60],
      colors: ["#F26522", "#FFC107", "#E70D0D", "#03C95A", "#0C4B5E"],
      labels: ["On Time", "Late", "Work From Home", "Absent", "Sick Leave"],
      legend: { show: false },
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: { width: 180 },
            legend: { show: false },
          },
        },
      ],
    }),
    []
  );

  const leavesChartSeries = useMemo(() => [15, 10, 5, 10, 60], []);

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
      stroke: { curve: "straight" },
      xaxis: {
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
      },
      yaxis: {
        min: 10,
        max: 60,
        tickAmount: 5,
        labels: {
          formatter: (val) => val + "K",
        },
      },
      grid: {
        padding: { left: -8, right: -4 },
      },
      legend: { show: false },
    }),
    []
  );

  const performanceChartSeries = useMemo(
    () => [
      {
        name: "Performance",
        data: [20, 20, 35, 35, 40, 60, 60],
      },
    ],
    []
  );

  return (
    <div className="dashboard-scope w-full">
      {/*  Breadcrumb  */}
				<div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
					<div className="my-auto mb-2">
						<h2 className="mb-1">Employee Dashboard</h2>
						<nav>
							<ol className="breadcrumb mb-0">
								<li className="breadcrumb-item">
									<a href="#"><i className="ti ti-smart-home"></i></a>
								</li>
								<li className="breadcrumb-item">
									Dashboard
								</li>
								<li className="breadcrumb-item active" aria-current="page">Employee Dashboard</li>
							</ol>
						</nav>
					</div>
					<div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
						<div className="me-2 mb-2">
							<div className="dropdown">
								<a href="#" onClick={(e) => e.preventDefault()}
									className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
									data-bs-toggle="dropdown">
									<i className="ti ti-file-export me-1"></i>Export
								</a>
								<ul className="dropdown-menu  dropdown-menu-end p-3">
									<li>
										<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1"><i
												className="ti ti-file-type-pdf me-1"></i>Export as PDF</a>
									</li>
									<li>
										<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1"><i
												className="ti ti-file-type-xls me-1"></i>Export as Excel </a>
									</li>
								</ul>
							</div>
						</div>
						<div className="input-icon w-120 position-relative mb-2">
							<span className="input-icon-addon">
								<i className="ti ti-calendar text-gray-9"></i>
							</span>
							<input type="text" className="form-control datetimepicker" value="15-04-2025" />
						</div>
						<div className="ms-2 mb-2 head-icons">
							<a href="#" onClick={(e) => e.preventDefault()} className="" data-bs-toggle="tooltip" data-bs-placement="top"
								data-bs-original-title="Collapse" id="collapse-header">
								<i className="ti ti-chevrons-up"></i>
							</a>
						</div>
					</div>
				</div>
				{/*  /Breadcrumb  */}

				<div
					className="alert bg-secondary-transparent alert-dismissible fade show mb-4 d-flex align-items-center justify-content-between gap-2">
					Your Leave Request on “24th April 2024” has been Approved!!!
					<button type="button" className="btn-close fs-14" data-bs-dismiss="alert" aria-label="Close"><i
							className="ti ti-x"></i></button>
				</div>
				<div className="row">
					<div className="col-xxl-4 d-flex">
						<div className="card position-relative flex-fill">
							<div className="card-header bg-dark">
								<div className="d-flex align-items-center flex-wrap gap-2">
									<span
										className="avatar avatar-lg avatar-rounded border border-white border-2 flex-shrink-0 me-2 position-relative">
										<img src="/assets/img/users/user-01.jpg" alt="Img" />
										<span
											className="position-absolute employee-verify-badge bg-white fs-14 d-inline-flex align-items-center justify-content-center rounded-circle"><i
												className="ti ti-discount-check-filled text-success"></i></span>
									</span>
									<div>
										<h5 className="text-white mb-1">Stephan Peralt</h5>
										<div className="d-flex align-items-center">
											<p className="text-white fs-12 mb-0">Senior Product Designer</p>
											<span className="mx-1"><i className="ti ti-point-filled text-primary"></i></span>
											<p className="fs-12">UI/UX Design</p>
										</div>
									</div>
								</div>
							</div>
							<div className="card-body rounded-top">
								<div className="mb-3">
									<span className="d-block mb-1 fs-13">Phone Number</span>
									<p className="text-gray-9 d-flex align-items-center gap-1.5"><CountryFlag country="US" size="xs" /> +1 324 3453 545</p>
								</div>
								<div className="mb-3">
									<span className="d-block mb-1 fs-13">Email Address</span>
									<p className="text-gray-9">steperde124@example.com</p>
								</div>
								<div className="mb-3">
									<span className="d-block mb-1 fs-13">Report Office</span>
									<p className="text-gray-9">Doglas Martini</p>
								</div>
								<div>
									<span className="d-block mb-1 fs-13">Joined on</span>
									<p className="text-gray-9">15 Jan 2024</p>
								</div>
							</div>
						</div>
					</div>
					<div className="col-xxl-5 col-xl-6 d-flex">
						<div className="card flex-fill">
							<div className="card-header">
								<div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
									<h5>Leave Details</h5>
									<div className="dropdown">
										<a href="#" onClick={(e) => e.preventDefault()}
											className="border btn btn-white btn-md d-inline-flex align-items-center"
											data-bs-toggle="dropdown">
											<i className="ti ti-calendar me-1 fs-14"></i>2026
										</a>
										<ul className="dropdown-menu  dropdown-menu-end p-3">
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">2026</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">2025</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">2024</a>
											</li>
										</ul>
									</div>
								</div>
							</div>
							<div className="card-body">
								<div className="row align-items-center">
									<div className="col-md-6">
										<div className="mb-3">
											<div className="mb-3">
												<p className="d-flex align-items-center"><i
														className="ti ti-circle-filled fs-8 text-dark me-1"></i>
													<span className="text-gray-9 fw-semibold me-1">1254</span>
													on time
												</p>
											</div>
											<div className="mb-3">
												<p className="d-flex align-items-center"><i
														className="ti ti-circle-filled fs-8 text-success me-1"></i>
													<span className="text-gray-9 fw-semibold me-1">32</span>
													Late Attendance
												</p>
											</div>
											<div className="mb-3">
												<p className="d-flex align-items-center"><i
														className="ti ti-circle-filled fs-8 text-primary me-1"></i>
													<span className="text-gray-9 fw-semibold me-1">658</span>
													Work From Home
												</p>
											</div>
											<div className="mb-3">
												<p className="d-flex align-items-center"><i
														className="ti ti-circle-filled fs-8 text-danger me-1"></i>
													<span className="text-gray-9 fw-semibold me-1">14</span>
													Absent
												</p>
											</div>
											<div>
												<p className="d-flex align-items-center"><i
														className="ti ti-circle-filled fs-8 text-warning me-1"></i>
													<span className="text-gray-9 fw-semibold me-1">68</span>
													Sick Leave
												</p>
											</div>
										</div>
									</div>
									<div className="col-md-6">
										<div className="mb-3 d-flex justify-content-md-end">
											
<div className="d-flex justify-content-center align-items-center" style={{ minHeight: "185px" }}>
  {isMounted && (
    <Suspense fallback={<div className="h-[185px] flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={leavesChartOptions} series={leavesChartSeries} type="donut" height={185} width="100%" />
    </Suspense>
  )}
</div>

										</div>
									</div>
									<div className="col-md-12">
										<div>
											<p className="d-flex align-items-center gap-2"><span
													className="square-icon rounded bg-primary"><i
														className="ti ti-check text-white fs-10 fw-bold"></i></span>Better
												than <span className="text-gray-9">85%</span> of Employees</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
					<div className="col-xxl-3 col-xl-6 d-flex">
						<div className="card flex-fill">
							<div className="card-header">
								<div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
									<h5>Leave Details</h5>
									<div className="dropdown">
										<a href="#" onClick={(e) => e.preventDefault()}
											className="border btn btn-white btn-md d-inline-flex align-items-center"
											data-bs-toggle="dropdown">
											<i className="ti ti-calendar me-1 fs-14"></i>2026
										</a>
										<ul className="dropdown-menu  dropdown-menu-end p-3">
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">2026</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">2025</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">2024</a>
											</li>
										</ul>
									</div>
								</div>
							</div>
							<div className="card-body">
								<div className="row align-items-center">
									<div className="col-sm-6">
										<div className="mb-4">
											<span className="d-block mb-1">Total Leaves</span>
											<h4>16</h4>
										</div>
									</div>
									<div className="col-sm-6">
										<div className="mb-4">
											<span className="d-block mb-1">Taken</span>
											<h4>10</h4>
										</div>
									</div>
									<div className="col-sm-6">
										<div className="mb-4">
											<span className="d-block mb-1">Absent</span>
											<h4>2</h4>
										</div>
									</div>
									<div className="col-sm-6">
										<div className="mb-4">
											<span className="d-block mb-1">Request</span>
											<h4>0</h4>
										</div>
									</div>
									<div className="col-sm-6">
										<div className="mb-4">
											<span className="d-block mb-1">Worked Days</span>
											<h4>240</h4>
										</div>
									</div>
									<div className="col-sm-6">
										<div className="mb-4">
											<span className="d-block mb-1">Loss of Pay</span>
											<h4>2</h4>
										</div>
									</div>
									<div className="col-sm-12">
										<div>
											<a href="#" className="btn btn-dark w-100" data-bs-toggle="modal"
												data-bs-target="#add_leaves">Apply New Leave</a>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div className="row">
					<div className="col-xxl-4 d-flex">
						<div className="card flex-fill border-primary attendance-bg">
							<div className="card-body">
								<div className="mb-4 text-center">
									<h6 className="fw-medium text-gray-5 mb-1">Attendance</h6>
									<h4>08:35 AM, 11 Mar 2025</h4>
								</div>
								<div className="attendance-circle-progress attendance-progress mx-auto mb-3"
									data-value='65'>
									<span className="progress-left">
										<span className="progress-bar border-success"></span>
									</span>
									<span className="progress-right">
										<span className="progress-bar border-success"></span>
									</span>
									<div className="total-work-hours text-center w-100">
										<span className="fs-13 d-block mb-1">Total Hours</span>
										<h6>5:45:32</h6>
									</div>
								</div>
								<div className="text-center">
									<div className="badge badge-dark badge-md mb-3">Production : 3.45 hrs</div>
									<h6 className="fw-medium d-flex align-items-center justify-content-center mb-4">
										<i className="ti ti-fingerprint text-primary me-1"></i>
										Punch In at 10.00 AM
									</h6>
									<a href="#" className="btn btn-primary w-100">Punch Out</a>
								</div>
							</div>
						</div>
					</div>
					<div className="col-xxl-8 d-flex">
						<div className="row flex-fill">
							<div className="col-xl-3 col-md-6">
								<div className="card">
									<div className="card-body">
										<div className="border-bottom mb-3 pb-2">
											<span className="avatar avatar-sm bg-primary mb-2"><i
													className="ti ti-clock-stop"></i></span>
											<h2 className="mb-2">8.36 / <span className="fs-20 text-gray-5"> 9</span></h2>
											<p className="fw-medium text-truncate">Total Hours Today</p>
										</div>
										<div>
											<p className="d-flex align-items-center fs-13">
												<span
													className="avatar avatar-xs rounded-circle bg-success flex-shrink-0 me-2">
													<i className="ti ti-arrow-up fs-12"></i>
												</span>
												<span>5% This Week</span>
											</p>
										</div>
									</div>
								</div>
							</div>
							<div className="col-xl-3 col-md-6">
								<div className="card">
									<div className="card-body">
										<div className="border-bottom mb-3 pb-2">
											<span className="avatar avatar-sm bg-dark mb-2"><i
													className="ti ti-clock-up"></i></span>
											<h2 className="mb-2">10 / <span className="fs-20 text-gray-5"> 40</span></h2>
											<p className="fw-medium text-truncate">Total Hours Week</p>
										</div>
										<div>
											<p className="d-flex align-items-center fs-13">
												<span
													className="avatar avatar-xs rounded-circle bg-success flex-shrink-0 me-2">
													<i className="ti ti-arrow-up fs-12"></i>
												</span>
												<span>7% Last Week</span>
											</p>
										</div>
									</div>
								</div>
							</div>
							<div className="col-xl-3 col-md-6">
								<div className="card">
									<div className="card-body">
										<div className="border-bottom mb-3 pb-2">
											<span className="avatar avatar-sm bg-info mb-2"><i
													className="ti ti-calendar-up"></i></span>
											<h2 className="mb-2">75 / <span className="fs-20 text-gray-5"> 98</span></h2>
											<p className="fw-medium text-truncate">Total Hours Month</p>
										</div>
										<div>
											<p className="d-flex align-items-center fs-13 text-truncate">
												<span
													className="avatar avatar-xs rounded-circle bg-danger flex-shrink-0 me-2">
													<i className="ti ti-arrow-down fs-12"></i>
												</span>
												<span>8% Last Month</span>
											</p>
										</div>
									</div>
								</div>
							</div>
							<div className="col-xl-3 col-md-6">
								<div className="card">
									<div className="card-body">
										<div className="border-bottom mb-3 pb-2">
											<span className="avatar avatar-sm bg-pink mb-2"><i
													className="ti ti-calendar-star"></i></span>
											<h2 className="mb-2">16 / <span className="fs-20 text-gray-5"> 28</span></h2>
											<p className="fw-medium text-truncate">Overtime this Month</p>
										</div>
										<div>
											<p className="d-flex align-items-center fs-13 text-truncate">
												<span
													className="avatar avatar-xs rounded-circle bg-danger flex-shrink-0 me-2">
													<i className="ti ti-arrow-down fs-12"></i>
												</span>
												<span>6% Last Month</span>
											</p>
										</div>
									</div>
								</div>
							</div>
							<div className="col-md-12">
								<div className="card">
									<div className="card-body">
										<div className="row">
											<div className="col-xl-3">
												<div className="mb-4">
													<p className="d-flex align-items-center mb-1"><i
															className="ti ti-point-filled text-dark-transparent me-1"></i>Total
														Working hours</p>
													<h3>12h 36m</h3>
												</div>
											</div>
											<div className="col-xl-3">
												<div className="mb-4">
													<p className="d-flex align-items-center mb-1"><i
															className="ti ti-point-filled text-success me-1"></i>Productive
														Hours</p>
													<h3>08h 36m</h3>
												</div>
											</div>
											<div className="col-xl-3">
												<div className="mb-4">
													<p className="d-flex align-items-center mb-1"><i
															className="ti ti-point-filled text-warning me-1"></i>Break hours
													</p>
													<h3>22m 15s</h3>
												</div>
											</div>
											<div className="col-xl-3">
												<div className="mb-4">
													<p className="d-flex align-items-center mb-1"><i
															className="ti ti-point-filled text-info me-1"></i>Overtime</p>
													<h3>02h 15m</h3>
												</div>
											</div>
										</div>
										<div className="row">
											<div className="col-md-12">
												<div className="progress bg-transparent-dark mb-3" style={{ height: "24px" }}>
													<div className="progress-bar bg-white rounded" role="progressbar"
														style={{ width: "18%" }}></div>
													<div className="progress-bar bg-success rounded me-2" role="progressbar"
														style={{ width: "18%" }}></div>
													<div className="progress-bar bg-warning rounded me-2" role="progressbar"
														style={{ width: "5%" }}></div>
													<div className="progress-bar bg-success rounded me-2" role="progressbar"
														style={{ width: "28%" }}></div>
													<div className="progress-bar bg-warning rounded me-2" role="progressbar"
														style={{ width: "17%" }}></div>
													<div className="progress-bar bg-success rounded me-2" role="progressbar"
														style={{ width: "22%" }}></div>
													<div className="progress-bar bg-warning rounded me-2" role="progressbar"
														style={{ width: "5%" }}></div>
													<div className="progress-bar bg-info rounded me-2" role="progressbar"
														style={{ width: "3%" }}></div>
													<div className="progress-bar bg-info rounded" role="progressbar"
														style={{ width: "2%" }}></div>
													<div className="progress-bar bg-white rounded" role="progressbar"
														style={{ width: "18%" }}></div>
												</div>

											</div>
											<div className="co-md-12">
												<div
													className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
													<span className="fs-10">06:00</span>
													<span className="fs-10">07:00</span>
													<span className="fs-10">08:00</span>
													<span className="fs-10">09:00</span>
													<span className="fs-10">10:00</span>
													<span className="fs-10">11:00</span>
													<span className="fs-10">12:00</span>
													<span className="fs-10">01:00</span>
													<span className="fs-10">02:00</span>
													<span className="fs-10">03:00</span>
													<span className="fs-10">04:00</span>
													<span className="fs-10">05:00</span>
													<span className="fs-10">06:00</span>
													<span className="fs-10">07:00</span>
													<span className="fs-10">08:00</span>
													<span className="fs-10">09:00</span>
													<span className="fs-10">10:00</span>
													<span className="fs-10">11:00</span>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div className="row">
					<div className="col-xxl-6 d-flex">
						<div className="card flex-fill">
							<div className="card-header">
								<div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
									<h5>Projects</h5>
									<div className="dropdown">
										<a href="#" onClick={(e) => e.preventDefault()}
											className="btn btn-white border-0 dropdown-toggle dropdown-sm border btn-sm d-inline-flex align-items-center"
											data-bs-toggle="dropdown">
											Ongoing Projects
										</a>
										<ul className="dropdown-menu  dropdown-menu-end p-3">
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">All
													Projects</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">Ongoing
													Projects</a>
											</li>
										</ul>
									</div>
								</div>
							</div>
							<div className="card-body">
								<div className="row">
									<div className="col-md-6">
										<div className="card mb-4 shadow-none mb-md-0">
											<div className="card-body">
												<div className="d-flex align-items-center justify-content-between mb-3">
													<h6>Office Management</h6>
													<div className="dropdown">
														<a href="#" onClick={(e) => e.preventDefault()}
															className="d-inline-flex align-items-center"
															data-bs-toggle="dropdown">
															<i className="ti ti-dots-vertical"></i>
														</a>
														<ul className="dropdown-menu dropdown-menu-end p-3">
															<li>
																<a href="#" onClick={(e) => e.preventDefault()}
																	className="dropdown-item rounded-1"
																	data-bs-toggle="modal"
																	data-bs-target="#edit_task"><i
																		className="ti ti-edit me-2"></i>Edit</a>
															</li>
															<li>
																<a href="#" onClick={(e) => e.preventDefault()}
																	className="dropdown-item rounded-1"
																	data-bs-toggle="modal"
																	data-bs-target="#delete_modal"><i
																		className="ti ti-trash me-2"></i>Delete</a>
															</li>
														</ul>
													</div>
												</div>
												<div>
													<div className="d-flex align-items-center mb-3">
														<a href="#" onClick={(e) => e.preventDefault()} className="avatar">
															<img src="/assets/img/users/user-32.jpg"
																className="img-fluid rounded-circle" alt="img" />
														</a>
														<div className="ms-2">
															<h6 className="fw-normal"><a href="#" onClick={(e) => e.preventDefault()}>Anthony
																	Lewis</a></h6>
															<span className="fs-13 d-block">Project Leader</span>
														</div>
													</div>
													<div className="d-flex align-items-center mb-3">
														<a href="#" onClick={(e) => e.preventDefault()}
															className="avatar bg-soft-primary rounded-circle">
															<i className="ti ti-calendar text-primary fs-16"></i>
														</a>
														<div className="ms-2">
															<h6 className="fw-normal">14 Jan 2024</h6>
															<span className="fs-13 d-block">Deadline</span>
														</div>
													</div>
													<div
														className="d-flex align-items-center justify-content-between bg-transparent-light border border-dashed rounded p-2 mb-3">
														<div className="d-flex align-items-center">
															<span
																className="avatar avatar-sm bg-success-transparent rounded-circle me-1"><i
																	className="ti ti-checklist fs-16"></i></span>
															<p>Tasks : <span className="text-gray-9">6 </span> /10</p>
														</div>
														<div className="avatar-list-stacked avatar-group-sm">
															<span className="avatar avatar-rounded">
																<img className="border border-white"
																	src="/assets/img/profiles/avatar-06.jpg" alt="img" />
															</span>
															<span className="avatar avatar-rounded">
																<img className="border border-white"
																	src="/assets/img/profiles/avatar-07.jpg" alt="img" />
															</span>
															<span className="avatar avatar-rounded">
																<img className="border border-white"
																	src="/assets/img/profiles/avatar-08.jpg" alt="img" />
															</span>
															<a className="avatar bg-primary avatar-rounded text-fixed-white fs-12 fw-medium"
																href="#" onClick={(e) => e.preventDefault()}>
																+2
															</a>
														</div>
													</div>
													<div
														className="bg-soft-secondary p-2 rounded d-flex align-items-center justify-content-between">
														<p className="text-secondary mb-0 text-truncate">Time Spent</p>
														<h5 className="text-secondary text-truncate">65/120 <span
																className="fs-14 fw-normal">Hrs</span></h5>
													</div>
												</div>
											</div>
										</div>
									</div>
									<div className="col-md-6">
										<div className="card shadow-none mb-0">
											<div className="card-body">
												<div className="d-flex align-items-center justify-content-between mb-3">
													<h6>Office Management</h6>
													<div className="dropdown">
														<a href="#" onClick={(e) => e.preventDefault()}
															className="d-inline-flex align-items-center"
															data-bs-toggle="dropdown">
															<i className="ti ti-dots-vertical"></i>
														</a>
														<ul className="dropdown-menu dropdown-menu-end p-3">
															<li>
																<a href="#" onClick={(e) => e.preventDefault()}
																	className="dropdown-item rounded-1"
																	data-bs-toggle="modal"
																	data-bs-target="#edit_task"><i
																		className="ti ti-edit me-2"></i>Edit</a>
															</li>
															<li>
																<a href="#" onClick={(e) => e.preventDefault()}
																	className="dropdown-item rounded-1"
																	data-bs-toggle="modal"
																	data-bs-target="#delete_modal"><i
																		className="ti ti-trash me-2"></i>Delete</a>
															</li>
														</ul>
													</div>
												</div>
												<div>
													<div className="d-flex align-items-center mb-3">
														<a href="#" onClick={(e) => e.preventDefault()} className="avatar">
															<img src="/assets/img/users/user-33.jpg"
																className="img-fluid rounded-circle" alt="img" />
														</a>
														<div className="ms-2">
															<h6 className="fw-normal"><a href="#" onClick={(e) => e.preventDefault()}>Anthony
																	Lewis</a></h6>
															<span className="fs-13 d-block">Project Leader</span>
														</div>
													</div>
													<div className="d-flex align-items-center mb-3">
														<a href="#" onClick={(e) => e.preventDefault()}
															className="avatar bg-soft-primary rounded-circle">
															<i className="ti ti-calendar text-primary fs-16"></i>
														</a>
														<div className="ms-2">
															<h6 className="fw-normal">14 Jan 2024</h6>
															<span className="fs-13 d-block">Deadline</span>
														</div>
													</div>
													<div
														className="d-flex align-items-center justify-content-between bg-transparent-light border border-dashed rounded p-2 mb-3">
														<div className="d-flex align-items-center">
															<span
																className="avatar avatar-sm bg-success-transparent rounded-circle me-1"><i
																	className="ti ti-checklist fs-16"></i></span>
															<p>Tasks : <span className="text-gray-9">6 </span> /10</p>
														</div>
														<div className="avatar-list-stacked avatar-group-sm">
															<span className="avatar avatar-rounded">
																<img className="border border-white"
																	src="/assets/img/profiles/avatar-06.jpg" alt="img" />
															</span>
															<span className="avatar avatar-rounded">
																<img className="border border-white"
																	src="/assets/img/profiles/avatar-07.jpg" alt="img" />
															</span>
															<span className="avatar avatar-rounded">
																<img className="border border-white"
																	src="/assets/img/profiles/avatar-08.jpg" alt="img" />
															</span>
															<a className="avatar bg-primary avatar-rounded text-fixed-white fs-12 fw-medium"
																href="#" onClick={(e) => e.preventDefault()}>
																+2
															</a>
														</div>
													</div>
													<div
														className="bg-soft-secondary p-2 rounded d-flex align-items-center justify-content-between">
														<p className="text-secondary mb-0 text-truncate">Time Spent</p>
														<h5 className="text-secondary text-truncate">65/120 <span
																className="fs-14 fw-normal">Hrs</span></h5>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
					<div className="col-xxl-6 d-flex">
						<div className="card flex-fill">
							<div className="card-header">
								<div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
									<h5>Tasks</h5>
									<div className="dropdown">
										<a href="#" onClick={(e) => e.preventDefault()}
											className="btn btn-white border-0 dropdown-toggle dropdown-sm border btn-sm d-inline-flex align-items-center"
											data-bs-toggle="dropdown">
											All Projects
										</a>
										<ul className="dropdown-menu  dropdown-menu-end p-3">
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">All
													Projects</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">Ongoing
													Projects</a>
											</li>
										</ul>
									</div>
								</div>
							</div>
							<div className="card-body">
								<div
									className="list-group list-group-flush d-flex justify-content-between flex-column h-100">
									<div className="list-group-item border rounded p-2">
										<div className="row align-items-center row-gap-3">
											<div className="col-md-8">
												<div className="todo-inbox-check d-flex align-items-center">
													<span><i className="ti ti-grid-dots me-2"></i></span>
													<div className="form-check">
														<input className="form-check-input" type="checkbox" />
													</div>
													<span className="me-2 d-flex align-items-center rating-select"><i
															className="ti ti-star-filled filled"></i></span>
													<div className="strike-info">
														<h4 className="fs-14 text-truncate">Patient appointment booking</h4>
													</div>
												</div>
											</div>
											<div className="col-md-4">
												<div
													className="d-flex align-items-center justify-content-md-end flex-wrap row-gap-3">
													<span
														className="badge bg-soft-pink d-inline-flex align-items-center me-2"><i
															className="fas fa-circle fs-6 me-1"></i>Onhold</span>
													<div className="d-flex align-items-center">
														<div className="avatar-list-stacked avatar-group-sm">
															<span className="avatar avatar-rounded">
																<img className="border border-white"
																	src="/assets/img/profiles/avatar-13.jpg" alt="img" />
															</span>
															<span className="avatar avatar-rounded">
																<img className="border border-white"
																	src="/assets/img/profiles/avatar-14.jpg" alt="img" />
															</span>
															<span className="avatar avatar-rounded">
																<img className="border border-white"
																	src="/assets/img/profiles/avatar-15.jpg" alt="img" />
															</span>
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>
									<div className="list-group-item border rounded p-2">
										<div className="row align-items-center row-gap-3">
											<div className="col-md-8">
												<div className="todo-inbox-check d-flex align-items-center">
													<span><i className="ti ti-grid-dots me-2"></i></span>
													<div className="form-check">
														<input className="form-check-input" type="checkbox" />
													</div>
													<span className="me-2 rating-select d-flex align-items-center"><i
															className="ti ti-star"></i></span>
													<div className="strike-info">
														<h4 className="fs-14 text-truncate">Appointment booking with payment
														</h4>
													</div>
												</div>
											</div>
											<div className="col-md-4">
												<div
													className="d-flex align-items-center justify-content-md-end flex-wrap row-gap-3">
													<span
														className="badge bg-transparent-purple d-flex align-items-center me-2"><i
															className="fas fa-circle fs-6 me-1"></i>Inprogress</span>
													<div className="d-flex align-items-center">
														<div className="avatar-list-stacked avatar-group-sm">
															<span className="avatar avatar-rounded">
																<img className="border border-white"
																	src="/assets/img/profiles/avatar-20.jpg" alt="img" />
															</span>
															<span className="avatar avatar-rounded">
																<img className="border border-white"
																	src="/assets/img/profiles/avatar-21.jpg" alt="img" />
															</span>
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>
									<div className="list-group-item border rounded p-2">
										<div className="row align-items-center row-gap-3">
											<div className="col-md-8">
												<div className="todo-inbox-check d-flex align-items-center">
													<span><i className="ti ti-grid-dots me-2"></i></span>
													<div className="form-check">
														<input className="form-check-input" type="checkbox" />
													</div>
													<span className="me-2 rating-select d-flex align-items-center"><i
															className="ti ti-star"></i></span>
													<div className="strike-info">
														<h4 className="fs-14 text-truncate">Patient and Doctor video
															conferencing</h4>
													</div>
												</div>
											</div>
											<div className="col-md-4">
												<div
													className="d-flex align-items-center justify-content-md-end flex-wrap row-gap-3">
													<span className="badge badge-soft-success align-items-center me-2"><i
															className="fas fa-circle fs-6 me-1"></i>Completed</span>
													<div className="d-flex align-items-center">
														<div className="avatar-list-stacked avatar-group-sm">
															<span className="avatar avatar-rounded">
																<img className="border border-white"
																	src="/assets/img/profiles/avatar-28.jpg" alt="img" />
															</span>
															<span className="avatar avatar-rounded">
																<img className="border border-white"
																	src="/assets/img/profiles/avatar-29.jpg" alt="img" />
															</span>
															<span className="avatar avatar-rounded">
																<img className="border border-white"
																	src="/assets/img/profiles/avatar-24.jpg" alt="img" />
															</span>
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>
									<div className="list-group-item border rounded p-2">
										<div className="row align-items-center row-gap-3">
											<div className="col-md-8">
												<div
													className="todo-inbox-check d-flex align-items-center todo-strike-content">
													<span><i className="ti ti-grid-dots me-2"></i></span>
													<div className="form-check">
														<input className="form-check-input" type="checkbox" defaultChecked={false} />
													</div>
													<span className="me-2 rating-select d-flex align-items-center"><i
															className="ti ti-star"></i></span>
													<div className="strike-info">
														<h4 className="fs-14 text-truncate">Private chat module</h4>
													</div>
												</div>
											</div>
											<div className="col-md-4">
												<div
													className="d-flex align-items-center justify-content-md-end flex-wrap row-gap-3">
													<span
														className="badge badge-secondary-transparent d-flex align-items-center me-2"><i
															className="fas fa-circle fs-6 me-1"></i>Pending</span>
													<div className="d-flex align-items-center">
														<div className="avatar-list-stacked avatar-group-sm">
															<span className="avatar avatar-rounded">
																<img className="border border-white"
																	src="/assets/img/profiles/avatar-23.jpg" alt="img" />
															</span>
															<span className="avatar avatar-rounded">
																<img className="border border-white"
																	src="/assets/img/profiles/avatar-24.jpg" alt="img" />
															</span>
															<span className="avatar avatar-rounded">
																<img className="border border-white"
																	src="/assets/img/profiles/avatar-25.jpg" alt="img" />
															</span>
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>
									<div className="list-group-item border rounded p-2">
										<div className="row align-items-center row-gap-3">
											<div className="col-md-8">
												<div className="todo-inbox-check d-flex align-items-center">
													<span><i className="ti ti-grid-dots me-2"></i></span>
													<div className="form-check">
														<input className="form-check-input" type="checkbox" />
													</div>
													<span className="me-2 rating-select d-flex align-items-center"><i
															className="ti ti-star"></i></span>
													<div className="strike-info">
														<h4 className="fs-14 text-truncate">Go-Live and Post-Implementation
															Support</h4>
													</div>
												</div>
											</div>
											<div className="col-md-4">
												<div
													className="d-flex align-items-center justify-content-md-end flex-wrap row-gap-3">
													<span
														className="badge bg-transparent-purple d-flex align-items-center me-2"><i
															className="fas fa-circle fs-6 me-1"></i>Inprogress</span>
													<div className="d-flex align-items-center">
														<div className="avatar-list-stacked avatar-group-sm">
															<span className="avatar avatar-rounded">
																<img className="border border-white"
																	src="/assets/img/profiles/avatar-28.jpg" alt="img" />
															</span>
															<span className="avatar avatar-rounded">
																<img className="border border-white"
																	src="/assets/img/profiles/avatar-29.jpg" alt="img" />
															</span>
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div className="row">
					<div className="col-xxl-5 d-flex">
						<div className="card flex-fill">
							<div className="card-header">
								<div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
									<h5>Performance</h5>
									<div className="dropdown">
										<a href="#" onClick={(e) => e.preventDefault()}
											className="border btn btn-white btn-md d-inline-flex align-items-center"
											data-bs-toggle="dropdown">
											<i className="ti ti-calendar me-1 fs-14"></i>2026
										</a>
										<ul className="dropdown-menu  dropdown-menu-end p-3">
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">2026</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">2025</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">2024</a>
											</li>
										</ul>
									</div>
								</div>
							</div>
							<div className="card-body">
								<div>
									<div className="bg-light d-flex align-items-center rounded p-2">
										<h3 className="me-2">98%</h3>
										<span
											className="badge badge-outline-success bg-success-transparent rounded-pill me-1">12%</span>
										<span>vs last years</span>
									</div>
									
<div style={{ minHeight: "273px" }}>
  {isMounted && (
    <Suspense fallback={<div className="h-[273px] flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={performanceChartOptions} series={performanceChartSeries} type="area" height={273} width="100%" />
    </Suspense>
  )}
</div>

								</div>
							</div>
						</div>
					</div>
					<div className="col-xxl-4 col-xl-6 d-flex">
						<div className="card flex-fill">
							<div className="card-header">
								<div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
									<h5>My Skills</h5>
									<div className="dropdown">
										<a href="#" onClick={(e) => e.preventDefault()}
											className="border btn btn-white btn-md d-inline-flex align-items-center"
											data-bs-toggle="dropdown">
											<i className="ti ti-calendar me-1 fs-14"></i>2026
										</a>
										<ul className="dropdown-menu  dropdown-menu-end p-3">
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">2026</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">2025</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">2024</a>
											</li>
										</ul>
									</div>
								</div>
							</div>
							<div className="card-body">
								<div>
									<div className="border border-dashed bg-transparent-light rounded p-2 mb-2">
										<div className="d-flex align-items-center justify-content-between">
											<div className="d-flex align-items-center">
												<span
													className="d-block border border-2 h-12 border-primary rounded-5 me-2 left-line"></span>
												<div>
													<h6 className="fw-medium mb-1">Figma</h6>
													<p>Updated : 15 May 2025</p>
												</div>
											</div>
											<div className="circle-progress circle-progress-md" data-value='95'>
												<span className="progress-left">
													<span className="progress-bar border-primary"></span>
												</span>
												<span className="progress-right">
													<span className="progress-bar border-primary"></span>
												</span>
												<div className="progress-value">95%</div>
											</div>
										</div>
									</div>
									<div className="border border-dashed bg-transparent-light rounded p-2 mb-2">
										<div className="d-flex align-items-center justify-content-between">
											<div className="d-flex align-items-center">
												<span
													className="d-block border border-2 h-12 border-success rounded-5 me-2 left-line"></span>
												<div>
													<h6 className="fw-medium mb-1">HTML</h6>
													<p>Updated : 12 May 2025</p>
												</div>
											</div>
											<div className="circle-progress circle-progress-md" data-value='85'>
												<span className="progress-left">
													<span className="progress-bar border-success"></span>
												</span>
												<span className="progress-right">
													<span className="progress-bar border-success"></span>
												</span>
												<div className="progress-value">85%</div>
											</div>
										</div>
									</div>
									<div className="border border-dashed bg-transparent-light rounded p-2 mb-2">
										<div className="d-flex align-items-center justify-content-between">
											<div className="d-flex align-items-center">
												<span
													className="d-block border border-2 h-12 border-purple rounded-5 me-2 left-line"></span>
												<div>
													<h6 className="fw-medium mb-1">CSS</h6>
													<p>Updated : 12 May 2025</p>
												</div>
											</div>
											<div className="circle-progress circle-progress-md" data-value='70'>
												<span className="progress-left">
													<span className="progress-bar border-purple"></span>
												</span>
												<span className="progress-right">
													<span className="progress-bar border-purple"></span>
												</span>
												<div className="progress-value">70%</div>
											</div>
										</div>
									</div>
									<div className="border border-dashed bg-transparent-light rounded p-2 mb-2">
										<div className="d-flex align-items-center justify-content-between">
											<div className="d-flex align-items-center">
												<span
													className="d-block border border-2 h-12 border-info rounded-5 me-2 left-line"></span>
												<div>
													<h6 className="fw-medium mb-1">Wordpress</h6>
													<p>Updated : 15 May 2025</p>
												</div>
											</div>
											<div className="circle-progress circle-progress-md" data-value='61'>
												<span className="progress-left">
													<span className="progress-bar border-info"></span>
												</span>
												<span className="progress-right">
													<span className="progress-bar border-info"></span>
												</span>
												<div className="progress-value">61%</div>
											</div>
										</div>
									</div>
									<div className="border border-dashed bg-transparent-light rounded p-2">
										<div className="d-flex align-items-center justify-content-between">
											<div className="d-flex align-items-center">
												<span
													className="d-block border border-2 h-12 border-dark rounded-5 me-2 left-line"></span>
												<div>
													<h6 className="fw-medium mb-1">Javascript</h6>
													<p>Updated : 13 May 2025</p>
												</div>
											</div>
											<div className="circle-progress circle-progress-md" data-value='58'>
												<span className="progress-left">
													<span className="progress-bar border-dark"></span>
												</span>
												<span className="progress-right">
													<span className="progress-bar border-dark"></span>
												</span>
												<div className="progress-value">58%</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
					<div className="col-xxl-3 col-xl-6 d-flex">
						<div className="flex-fill">
							<div className="card card-bg-5 bg-dark mb-3">
								<div className="card-body">
									<div className="text-center">
										<h5 className="text-white mb-4">Team Birthday</h5>
										<span className="avatar avatar-xl avatar-rounded mb-2">
											<img src="/assets/img/users/user-35.jpg" alt="Img" />
										</span>
										<div className="mb-3">
											<h6 className="text-white fw-medium mb-1">Andrew Jermia</h6>
											<p>IOS Developer</p>
										</div>
										<a href="#" className="btn btn-sm btn-primary">Send Wishes</a>
									</div>
								</div>
							</div>
							<div className="card bg-secondary mb-3">
								<div className="card-body d-flex align-items-center justify-content-between p-3">
									<div>
										<h5 className="text-white mb-1">Leave Policy</h5>
										<p className="text-white">Last Updated : Today</p>
									</div>
									<a href="#" className="btn btn-white btn-sm px-3">View All</a>
								</div>
							</div>
							<div className="card bg-warning">
								<div className="card-body d-flex align-items-center justify-content-between p-3">
									<div>
										<h5 className="mb-1">Next Holiday</h5>
										<p className="text-gray-9">Diwali, 15 Sep 2025</p>
									</div>
									<a href="#" className="btn btn-white btn-sm px-3">View All</a>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div className="row">
					<div className="col-xxl-4 col-xl-6 d-flex">
						<div className="card flex-fill">
							<div className="card-header">
								<div className="d-flex align-items-center justify-content-between flex-wrap">
									<h5>Team Members</h5>
									<div>
										<a href="#" className="btn btn-light btn-md">View All</a>
									</div>
								</div>
							</div>
							<div className="card-body">
								<div className="d-flex align-items-center justify-content-between mb-4">
									<div className="d-flex align-items-center">
										<a href="#" onClick={(e) => e.preventDefault()} className="avatar flex-shrink-0">
											<img src="/assets/img/users/user-27.jpg"
												className="rounded-circle border border-2" alt="img" />
										</a>
										<div className="ms-2">
											<h6 className="fs-14 fw-medium text-truncate mb-1"><a href="#">Alexander
													Jermai</a></h6>
											<p className="fs-13">UI/UX Designer</p>
										</div>
									</div>
									<div className="d-flex align-items-center">
										<a href="#" className="btn btn-light btn-icon btn-sm me-2"><i
												className="ti ti-phone fs-16"></i></a>
										<a href="#" className="btn btn-light btn-icon btn-sm me-2"><i
												className="ti ti-mail-bolt fs-16"></i></a>
										<a href="#" className="btn btn-light btn-icon btn-sm"><i
												className="ti ti-brand-hipchat fs-16"></i></a>
									</div>
								</div>
								<div className="d-flex align-items-center justify-content-between mb-4">
									<div className="d-flex align-items-center">
										<a href="#" onClick={(e) => e.preventDefault()} className="avatar flex-shrink-0">
											<img src="/assets/img/users/user-42.jpg"
												className="rounded-circle border border-2" alt="img" />
										</a>
										<div className="ms-2">
											<h6 className="fs-14 fw-medium text-truncate mb-1"><a href="#">Doglas
													Martini</a></h6>
											<p className="fs-13">Product Designer</p>
										</div>
									</div>
									<div className="d-flex align-items-center">
										<a href="#" className="btn btn-light btn-icon btn-sm me-2"><i
												className="ti ti-phone fs-16"></i></a>
										<a href="#" className="btn btn-light btn-icon btn-sm me-2"><i
												className="ti ti-mail-bolt fs-16"></i></a>
										<a href="#" className="btn btn-light btn-icon btn-sm"><i
												className="ti ti-brand-hipchat fs-16"></i></a>
									</div>
								</div>
								<div className="d-flex align-items-center justify-content-between mb-4">
									<div className="d-flex align-items-center">
										<a href="#" onClick={(e) => e.preventDefault()} className="avatar flex-shrink-0">
											<img src="/assets/img/users/user-43.jpg"
												className="rounded-circle border border-2" alt="img" />
										</a>
										<div className="ms-2">
											<h6 className="fs-14 fw-medium text-truncate mb-1"><a href="#">Daniel
													Esbella</a></h6>
											<p className="fs-13">Project Manager</p>
										</div>
									</div>
									<div className="d-flex align-items-center">
										<a href="#" className="btn btn-light btn-icon btn-sm me-2"><i
												className="ti ti-phone fs-16"></i></a>
										<a href="#" className="btn btn-light btn-icon btn-sm me-2"><i
												className="ti ti-mail-bolt fs-16"></i></a>
										<a href="#" className="btn btn-light btn-icon btn-sm"><i
												className="ti ti-brand-hipchat fs-16"></i></a>
									</div>
								</div>
								<div className="d-flex align-items-center justify-content-between mb-4">
									<div className="d-flex align-items-center">
										<a href="#" onClick={(e) => e.preventDefault()} className="avatar flex-shrink-0">
											<img src="/assets/img/users/user-11.jpg"
												className="rounded-circle border border-2" alt="img" />
										</a>
										<div className="ms-2">
											<h6 className="fs-14 fw-medium text-truncate mb-1"><a href="#">Daniel
													Esbella</a></h6>
											<p className="fs-13">Team Lead</p>
										</div>
									</div>
									<div className="d-flex align-items-center">
										<a href="#" className="btn btn-light btn-icon btn-sm me-2"><i
												className="ti ti-phone fs-16"></i></a>
										<a href="#" className="btn btn-light btn-icon btn-sm me-2"><i
												className="ti ti-mail-bolt fs-16"></i></a>
										<a href="#" className="btn btn-light btn-icon btn-sm"><i
												className="ti ti-brand-hipchat fs-16"></i></a>
									</div>
								</div>
								<div className="d-flex align-items-center justify-content-between mb-4">
									<div className="d-flex align-items-center">
										<a href="#" onClick={(e) => e.preventDefault()} className="avatar flex-shrink-0">
											<img src="/assets/img/users/user-44.jpg"
												className="rounded-circle border border-2" alt="img" />
										</a>
										<div className="ms-2">
											<h6 className="fs-14 fw-medium text-truncate mb-1"><a href="#">Stephan
													Peralt</a></h6>
											<p className="fs-13">Team Lead</p>
										</div>
									</div>
									<div className="d-flex align-items-center">
										<a href="#" className="btn btn-light btn-icon btn-sm me-2"><i
												className="ti ti-phone fs-16"></i></a>
										<a href="#" className="btn btn-light btn-icon btn-sm me-2"><i
												className="ti ti-mail-bolt fs-16"></i></a>
										<a href="#" className="btn btn-light btn-icon btn-sm"><i
												className="ti ti-brand-hipchat fs-16"></i></a>
									</div>
								</div>
								<div className="d-flex align-items-center justify-content-between">
									<div className="d-flex align-items-center">
										<a href="#" onClick={(e) => e.preventDefault()} className="avatar flex-shrink-0">
											<img src="/assets/img/users/user-54.jpg"
												className="rounded-circle border border-2" alt="img" />
										</a>
										<div className="ms-2">
											<h6 className="fs-14 fw-medium text-truncate mb-1"><a href="#">Andrew Jermia</a>
											</h6>
											<p className="fs-13">Project Lead</p>
										</div>
									</div>
									<div className="d-flex align-items-center">
										<a href="#" className="btn btn-light btn-icon btn-sm me-2"><i
												className="ti ti-phone fs-16"></i></a>
										<a href="#" className="btn btn-light btn-icon btn-sm me-2"><i
												className="ti ti-mail-bolt fs-16"></i></a>
										<a href="#" className="btn btn-light btn-icon btn-sm"><i
												className="ti ti-brand-hipchat fs-16"></i></a>
									</div>
								</div>
							</div>
						</div>
					</div>
					<div className="col-xxl-4 col-xl-6 d-flex">
						<div className="card flex-fill">
							<div className="card-header">
								<div className="d-flex align-items-center justify-content-between flex-wrap">
									<h5>Notifications</h5>
									<div>
										<a href="#" className="btn btn-light btn-md">View All</a>
									</div>
								</div>
							</div>
							<div className="card-body">
								<div className="d-flex align-items-start mb-4">
									<a href="#" onClick={(e) => e.preventDefault()} className="avatar flex-shrink-0">
										<img src="/assets/img/users/user-27.jpg" className="rounded-circle border border-2"
											alt="img" />
									</a>
									<div className="ms-2">
										<h6 className="fs-14 fw-medium text-truncate mb-1">Lex Murphy requested access to
											UNIX </h6>
										<p className="fs-13 mb-2">Today at 9:42 AM</p>
										<div className="d-flex align-items-center">
											<a href="#" className="avatar avatar-sm border flex-shrink-0 me-2"><img
													src="/assets/img/social/pdf-icon.svg" className="w-auto h-auto"
													alt="Img" /></a>
											<h6 className="fw-normal"><a href="#">EY_review.pdf</a></h6>
										</div>
									</div>
								</div>
								<div className="d-flex align-items-start mb-4">
									<a href="#" onClick={(e) => e.preventDefault()} className="avatar flex-shrink-0">
										<img src="/assets/img/users/user-28.jpg" className="rounded-circle border border-2"
											alt="img" />
									</a>
									<div className="ms-2">
										<h6 className="fs-14 fw-medium text-truncate mb-1">Lex Murphy requested access to
											UNIX </h6>
										<p className="fs-13 mb-0">Today at 10:00 AM</p>
									</div>
								</div>
								<div className="d-flex align-items-start mb-4">
									<a href="#" onClick={(e) => e.preventDefault()} className="avatar flex-shrink-0">
										<img src="/assets/img/users/user-29.jpg" className="rounded-circle border border-2"
											alt="img" />
									</a>
									<div className="ms-2">
										<h6 className="fs-14 fw-medium text-truncate mb-1">Lex Murphy requested access to
											UNIX </h6>
										<p className="fs-13 mb-2">Today at 10:50 AM</p>
										<div className="d-flex align-items-center">
											<a href="#" className="btn btn-primary btn-sm me-2">Approve</a>
											<a href="#" className="btn btn-outline-primary btn-sm">Decline</a>
										</div>
									</div>
								</div>
								<div className="d-flex align-items-start mb-4">
									<a href="#" onClick={(e) => e.preventDefault()} className="avatar flex-shrink-0">
										<img src="/assets/img/users/user-30.jpg" className="rounded-circle border border-2"
											alt="img" />
									</a>
									<div className="ms-2">
										<h6 className="fs-14 fw-medium text-truncate mb-1">Lex Murphy requested access to
											UNIX </h6>
										<p className="fs-13 mb-0">Today at 12:00 PM</p>
									</div>
								</div>
								<div className="d-flex align-items-start">
									<a href="#" onClick={(e) => e.preventDefault()} className="avatar flex-shrink-0">
										<img src="/assets/img/users/user-33.jpg" className="rounded-circle border border-2"
											alt="img" />
									</a>
									<div className="ms-2">
										<h6 className="fs-14 fw-medium text-truncate mb-1">Lex Murphy requested access to
											UNIX </h6>
										<p className="fs-13 mb-0">Today at 05:00 PM</p>
									</div>
								</div>
							</div>
						</div>
					</div>
					<div className="col-xxl-4 d-flex">
						<div className="card flex-fill">
							<div className="card-header">
								<div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
									<h5>Meetings Schedule</h5>
									<div className="dropdown">
										<a href="#" onClick={(e) => e.preventDefault()}
											className="border btn btn-white btn-md d-inline-flex align-items-center"
											data-bs-toggle="dropdown">
											<i className="ti ti-calendar me-1 fs-14"></i>Today
										</a>
										<ul className="dropdown-menu  dropdown-menu-end p-3">
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">Today</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">This
													Month</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">This
													Year</a>
											</li>
										</ul>
									</div>
								</div>
							</div>
							<div className="card-body schedule-timeline">
								<div className="d-flex align-items-start">
									<div className="d-flex align-items-center active-time">
										<span>09:25 AM</span>
										<span><i className="ti ti-point-filled text-primary fs-20"></i></span>
									</div>
									<div className="flex-fill ps-3 pb-4 timeline-flow">
										<div className="bg-light p-2 rounded">
											<p className="fw-medium text-gray-9 mb-1">Marketing Strategy Presentation</p>
											<span>Marketing</span>
										</div>
									</div>
								</div>
								<div className="d-flex align-items-start">
									<div className="d-flex align-items-center active-time">
										<span>09:20 AM</span>
										<span><i className="ti ti-point-filled text-secondary fs-20"></i></span>
									</div>
									<div className="flex-fill ps-3 pb-4 timeline-flow">
										<div className="bg-light p-2 rounded">
											<p className="fw-medium text-gray-9 mb-1">Design Review Hospital, doctors
												Management Project</p>
											<span>Review</span>
										</div>
									</div>
								</div>
								<div className="d-flex align-items-start">
									<div className="d-flex align-items-center active-time">
										<span>09:18 AM</span>
										<span><i className="ti ti-point-filled text-warning fs-20"></i></span>
									</div>
									<div className="flex-fill ps-3 pb-4 timeline-flow">
										<div className="bg-light p-2 rounded">
											<p className="fw-medium text-gray-9 mb-1">Birthday Celebration of Employee</p>
											<span>Celebration</span>
										</div>
									</div>
								</div>
								<div className="d-flex align-items-start">
									<div className="d-flex align-items-center active-time">
										<span>09:10 AM</span>
										<span><i className="ti ti-point-filled text-success fs-20"></i></span>
									</div>
									<div className="flex-fill ps-3 timeline-flow">
										<div className="bg-light p-2 rounded">
											<p className="fw-medium text-gray-9 mb-1">Update of Project Flow</p>
											<span>Development</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			

      {/* Apply Leave Modal */}
      <Dialog open={applyLeaveOpen} onOpenChange={setApplyLeaveOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              toast.success("Leave request submitted successfully");
              setApplyLeaveOpen(false);
            }}
            className="space-y-4 pt-2"
          >
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Leave Type</label>
              <select className="form-select">
                <option value="annual">Annual Leave</option>
                <option value="casual">Casual Leave</option>
                <option value="sick">Sick Leave</option>
                <option value="wfh">Work From Home</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">From Date</label>
                <input type="date" required className="form-control" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">To Date</label>
                <input type="date" required className="form-control" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Reason</label>
              <textarea rows={3} placeholder="Provide details about your leave..." className="form-control" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setApplyLeaveOpen(false)} className="btn btn-light">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Submit Request
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
