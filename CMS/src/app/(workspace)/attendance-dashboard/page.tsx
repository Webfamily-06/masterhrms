'use client';

import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Link } from "@/src/lib/router-compat";

const Chart = lazy(() => import("react-apexcharts"));

export default function AttendanceDashboardPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <>
      {/*  Breadcrumb  */}
				<div className="d-xl-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
					<div className="my-auto mb-2">
						<h2 className="mb-1">Attendance Dashboard</h2>
						<nav>
							<ol className="breadcrumb mb-0">
								<li className="breadcrumb-item">
									<a href="index.html"><i className="ti ti-smart-home"></i></a>
								</li>
								<li className="breadcrumb-item">
									Dashboard
								</li>
								<li className="breadcrumb-item active" aria-current="page">Attendance Dashboard</li>
							</ol>
						</nav>
					</div>
					<div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
						<div className="d-flex align-items-center gap-3 p-2 border avatar-groups  rounded">
							<h5 className="d-flex align-items-center gap-1"><i
									className="ti ti-circle-filled text-primary fs-8"></i> 06 <span
									className="fs-13 fw-normal">Total Leaves</span> </h5>
							<div className="avatar-list-stacked avatar-group-sm ms-4">
								<span className="avatar avatar-rounded">
									<img className="border border-white" src="/assets/img/profiles/avatar-02.jpg" alt="img" />
								</span>
								<span className="avatar avatar-rounded">
									<img className="border border-white" src="/assets/img/profiles/avatar-03.jpg" alt="img" />
								</span>
								<span className="avatar avatar-rounded">
									<img className="border border-white" src="/assets/img/profiles/avatar-05.jpg" alt="img" />
								</span>
								<span className="avatar avatar-rounded">
									<img className="border border-white" src="/assets/img/profiles/avatar-06.jpg" alt="img" />
								</span>
								<span className="avatar avatar-rounded">
									<img className="border border-white" src="/assets/img/profiles/avatar-07.jpg" alt="img" />
								</span>
							</div>
						</div>
						<div className="mb-0">
							<div className="input-icon w-100 position-relative">
								<span className="input-icon-addon">
									<i className="ti ti-calendar text-gray-9"></i>
								</span>
								<input type="text" className="form-control yearpicker" value="December 2025" />
							</div>
						</div>
						<a href="#" className="btn btn-primary-gradient d-flex align-items-center gap-1"> <i
								className="ti ti-plus"></i> Apply Leave </a>
						<div className="ms-2 mt-2 head-icons">
							<a href="#" onClick={(e) => e.preventDefault()} className="" data-bs-toggle="tooltip" data-bs-placement="top"
								data-bs-original-title="Collapse" id="collapse-header">
								<i className="ti ti-chevrons-up"></i>
							</a>
						</div>
					</div>
				</div>
				{/*  /Breadcrumb  */}

				{/*  Overview Statistics  */}
				<div className="card">
					<div className="card-body">
						<div className="mb-1 d-flex align-items-center justify-content-between gap-2 flex-wrap mb-4">
							<h2 className="card-title mb-0">Overview Statistics</h2>
							<div className="dropdown">
								<a href="#" onClick={(e) => e.preventDefault()}
									className="border btn btn-white btn-md fw-normal d-inline-flex align-items-center justify-content-center rounded-pill gap-1 fw-medium"
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
						{/*  start row  */}
						<div className="row row-gap-4">

							{/*  Item 1  */}
							<div className="col-xxl-4 col-xl-6 col-lg-6 col-sm-6">
								<div className="card bg-light stat-card border shadow-none">
									<div className="card-body">
										<div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
											<div>
												<p className="fs-14 fw-medium mb-2">Total Employees</p>
												<div className="d-flex align-items-center gap-2">
													<h3 className="fs-20 mb-0">2,847</h3>
													<div className="d-flex align-items-center gap-1"> <span
															className="badge bg-success d-inline-flex align-items-center gap-1 rounded fs-12">
															<i className="ti ti-arrow-up-right"></i> 12%</span> vs yesterday
													</div>
												</div>
											</div>
											<div className="avatar avatar-lg bg-primary">
												<img src="/assets/img/icons/attendance-icon-1.svg" alt="attendance"
													className="img-fluid img-1" />
												<div className="avatar-1"></div>
											</div>
										</div>
									</div>
								</div>
							</div>

							{/*  Item 2  */}
							<div className="col-xxl-4 col-xl-6 col-lg-6 col-sm-6">
								<div className="card bg-light stat-card border shadow-none">
									<div className="card-body">
										<div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
											<div>
												<p className="fs-14 fw-medium mb-2">Present Today</p>
												<div className="d-flex align-items-center gap-2">
													<h3 className="fs-20 mb-0">2,458</h3>
													<div className="d-flex align-items-center gap-1"> <span
															className="badge bg-danger d-inline-flex align-items-center gap-1 rounded fs-12">
															<i className="ti ti-arrow-down-right"></i> 3.2%</span> vs
														yesterday </div>
												</div>
											</div>
											<div className="avatar avatar-lg bg-secondary">
												<img src="/assets/img/icons/attendance-icon-2.svg" alt="attendance"
													className="img-fluid img-1" />
												<div className="avatar-1 two"></div>
											</div>
										</div>
									</div>
								</div>
							</div>

							{/*  Item 3  */}
							<div className="col-xxl-4 col-xl-6 col-lg-6 col-sm-6">
								<div className="card bg-light stat-card border shadow-none">
									<div className="card-body">
										<div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
											<div>
												<p className="fs-14 fw-medium mb-2">Absent Today</p>
												<div className="d-flex align-items-center gap-2">
													<h3 className="fs-20 mb-0">124</h3>
													<div className="d-flex align-items-center gap-1"> <span
															className="badge bg-warning d-inline-flex align-items-center gap-1 rounded fs-12">
															<i className="ti ti-arrow-up-right"></i> 1.4%</span> vs
														yesterday </div>
												</div>
											</div>
											<div className="avatar avatar-lg bg-warning">
												<img src="/assets/img/icons/attendance-icon-2.svg" alt="attendance"
													className="img-fluid img-1" />
												<div className="avatar-1 three"></div>
											</div>
										</div>
									</div>
								</div>
							</div>

							{/*  Item 4  */}
							<div className="col-xxl-4 col-xl-6 col-lg-6 col-sm-6">
								<div className="card bg-light stat-card border shadow-none">
									<div className="card-body">
										<div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
											<div>
												<p className="fs-14 fw-medium mb-2">Late Arrivals</p>
												<div className="d-flex align-items-center gap-2">
													<h3 className="fs-20 mb-0">89</h3>
													<div className="d-flex align-items-center gap-1"> <span
															className="badge bg-info d-inline-flex align-items-center gap-1 rounded fs-12">
															<i className="ti ti-arrow-up-right"></i> 12%</span> vs yesterday
													</div>
												</div>
											</div>
											<div className="avatar avatar-lg bg-info">
												<img src="/assets/img/icons/attendance-icon-3.svg" alt="attendance"
													className="img-fluid img-1" />
												<div className="avatar-1 four"></div>
											</div>
										</div>
									</div>
								</div>
							</div>

							{/*  Item 5  */}
							<div className="col-xxl-4 col-xl-6 col-lg-6 col-sm-6">
								<div className="card bg-light stat-card border shadow-none">
									<div className="card-body">
										<div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
											<div>
												<p className="fs-14 fw-medium mb-2">Attendance Rate</p>
												<div className="d-flex align-items-center gap-2">
													<h3 className="fs-20 mb-0">86.3%</h3>
													<div className="d-flex align-items-center gap-1"> <span
															className="badge bg-success d-inline-flex align-items-center gap-1 rounded fs-12">
															<i className="ti ti-arrow-up-right"></i> 2.5%</span> vs
														yesterday </div>
												</div>
											</div>
											<div className="avatar avatar-lg bg-purple">
												<img src="/assets/img/icons/attendance-icon-4.svg" alt="attendance"
													className="img-fluid img-1" />
												<div className="avatar-1 five"></div>
											</div>
										</div>
									</div>
								</div>
							</div>

							{/*  Item 6  */}
							<div className="col-xxl-4 col-xl-6 col-lg-6 col-sm-6">
								<div className="card bg-light stat-card border shadow-none">
									<div className="card-body">
										<div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
											<div>
												<p className="fs-14 fw-medium mb-2">Pending Regularizations</p>
												<div className="d-flex align-items-center gap-2">
													<h3 className="fs-20 mb-0">42</h3>
													<div className="d-flex align-items-center gap-1"> <span
															className="badge bg-danger d-inline-flex align-items-center gap-1 rounded fs-12">
															<i className="ti ti-arrow-down-right"></i> 7%</span> vs
														yesterday </div>
												</div>
											</div>
											<div className="avatar avatar-lg bg-danger">
												<img src="/assets/img/icons/attendance-icon-5.svg" alt="attendance"
													className="img-fluid img-1" />
												<div className="avatar-1 six"></div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/*  Attendance Trends  */}
				<div className="row row-gap-4 mb-4">
					<div className="col-xxl-8">
						<div className="card mb-0">
							<div className="card-body pb-2">
								<div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-2">
									<h2 className="card-title mb-0">Attendance Trends</h2>
									<div className="day-active-item d-inline-flex align-items-center gap-2">
										<button className="day">1D</button>
										<button className="day">7D</button>
										<button className="day">1M</button>
										<button className="day active">1Y</button>
									</div>
								</div>
								<div id="attendancetrend-chart">
  {isMounted && (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={{ chart: { id: "attendancetrend-chart", toolbar: { show: false } }, colors: ["#0d6efd", "#10b981", "#f59e0b", "#6366f1"], dataLabels: { enabled: false } }} series={[{ name: "attendancetrend-chart", data: [30, 40, 35, 50, 49, 60, 70, 91, 125] }]} type="area" height={220} width="100%" />
    </Suspense>
  )}
</div>
							</div>
						</div>
					</div>
					<div className="col-xxl-4">
						<div className="card bg-dark position-relative mb-0">
							<div className="card-body position-relative z-1">
								<div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-4">
									<h2 className="card-title mb-0 text-white">Attendance Status</h2>
									<div className="input-icon rounded-circle position-relative mb-2 custom-datepicker">
										<span className="input-icon-addon">
											<i className="ti ti-calendar text-gray-9"></i>
										</span>
										<input type="text" className="form-control datetimepicker" value="15-04-2025" />
									</div>
								</div>
								<div className="mb-3">
									<p className="mb-1 text-white">Total Working Days</p>
									<h3 className="main-title mb-0 text-white">300</h3>
								</div>

								<div className="progress working-progress bg-soft-light mb-1 py-1 px-1 px-1 mb-3">
									<div className="progress-bar bg-primary  me-1" role="progressbar" style={{ width: "40%" }}
										data-bs-toggle="tooltip" data-bs-placement="Top"></div>
									<div className="progress-bar bg-primary-8  me-1" role="progressbar" style={{ width: "20%" }}
										data-bs-toggle="tooltip" data-bs-placement="Top"></div>
									<div className="progress-bar bg-primary-7  me-1" role="progressbar" style={{ width: "10%" }}
										data-bs-toggle="tooltip" data-bs-placement="Top"></div>
									<div className="progress-bar bg-primary-6  me-1" role="progressbar" style={{ width: "10%" }}
										data-bs-toggle="tooltip" data-bs-placement="Top"></div>
									<div className="progress-bar bg-primary-5" role="progressbar" style={{ width: "20%" }}
										data-bs-toggle="tooltip" data-bs-placement="Top"></div>
								</div>


								<div
									className="attendance-percent d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
									<div className="percent"> <i className="ti ti-circle-filled fs-10 text-primary"></i> Present
									</div>
									<p className="mb-0">2458</p>
								</div>
								<div
									className="attendance-percent d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
									<div className="percent"> <i className="ti ti-circle-filled fs-10 text-primary-8"></i> WFH
									</div>
									<p className="mb-0">187</p>
								</div>
								<div
									className="attendance-percent d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
									<div className="percent"> <i className="ti ti-circle-filled fs-10 text-primary-7"></i> Late
									</div>
									<p className="mb-0">89</p>
								</div>
								<div
									className="attendance-percent d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
									<div className="percent"> <i className="ti ti-circle-filled fs-10 text-primary-6"></i> On
										Leave </div>
									<p className="mb-0">78</p>
								</div>
								<div
									className="attendance-percent d-flex align-items-center justify-content-between gap-2 flex-wrap mb-0">
									<div className="percent"> <i className="ti ti-circle-filled fs-10 text-primary-5"></i>
										Absent </div>
									<p className="mb-0">124</p>
								</div>
							</div>
							<img src="/assets/img/bg/attendance-bg-2.png" alt="attendance"
								className="img-fluid img-1 position-absolute top-0 end-0" />
						</div>
					</div>
				</div>

				{/*  start row  */}
				<div className="row row-gap-4 mb-4">
					<div className="col-xxl-6 col-xl-12 col-lg-12 d-flex">
						<div className="card mb-0 flex-fill">
							<div className="card-body pb-2">
								<div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-2">
									<h2 className="card-title mb-0">Office vs Remote</h2>
									<div className="d-flex align-items-center gap-2">
										<p className="d-inline-flex align-items-center gap-1 mb-0"> <i
												className="ti ti-circle-filled fs-8 text-primary"></i> Office </p>
										<p className="d-inline-flex align-items-center gap-1 mb-0"> <i
												className="ti ti-circle-filled fs-8 text-secondary"></i> Remote </p>
									</div>
									<div className="dropdown">
										<a href="#" onClick={(e) => e.preventDefault()}
											className="border btn btn-white btn-md fw-normal d-inline-flex align-items-center justify-content-center rounded gap-1 fw-medium"
											data-bs-toggle="dropdown">
											<i className="ti ti-calendar fs-14"></i> Weekly
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
								<div id="office-chart">
  {isMounted && (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={{ chart: { id: "office-chart", toolbar: { show: false } }, colors: ["#0d6efd", "#10b981", "#f59e0b", "#6366f1"], dataLabels: { enabled: false } }} series={[{ name: "office-chart", data: [30, 40, 35, 50, 49, 60, 70, 91, 125] }]} type="area" height={220} width="100%" />
    </Suspense>
  )}
</div>
							</div>
						</div>
					</div>
					<div className="col-xxl-6 col-xl-12 col-lg-12 d-flex">
						<div className="card mb-0 flex-fill">
							<div className="card-body">
								<div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-4">
									<h2 className="card-title mb-0">Attendance Summary</h2>
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

								<div className="avghours-container mb-4">
									<div className="fs-14 fw-medium text-gray-6">Avg Working Hours</div>
									<div className="progress-area">
										<div className="tooltip-bubble" style={{ left: "75%" }}>
											9.5 hrs
											<span className="tooltip-arrow"></span>
										</div>

										<div className="progress-bar-track">
											<div className="progress-bar-fill" style={{ width: "75%" }}></div>
											<div className="track-dots"></div>
										</div>
									</div>
									<p className="d-inline-flex align-items-center gap-2"><span
											className="badge bg-danger d-inline-flex align-items-center gap-1 fs-12"><i
												className="ti ti-arrow-down-right"></i>3.2%</span>Compared to yesterday</p>
								</div>

								<div className="row row-gap-3">
									<div className="col-lg-4">
										<div className="card text-center mb-0 shadow-none">
											<div className="card-body">
												<h3 className="main-title mb-1">2,458</h3>
												<p>Check-in Count</p>
											</div>
										</div>
									</div>
									<div className="col-lg-4">
										<div className="card text-center mb-0 shadow-none">
											<div className="card-body">
												<h3 className="main-title mb-1">2,201</h3>
												<p>Check-out Count</p>
											</div>
										</div>
									</div>
									<div className="col-lg-4">
										<div className="card text-center mb-0 shadow-none">
											<div className="card-body">
												<h3 className="main-title mb-1">9:12 AM</h3>
												<p>Check-in Time</p>
											</div>
										</div>
									</div>
								</div>

							</div>
						</div>
					</div>
				</div>
				{/*  end row  */}

				{/*  Frequent Late Arrivals  */}
				<div className="row row-gap-4 mb-4 justify-content-center">

					{/*  Item 1  */}
					<div className="col-xxl-4 col-xl-6 col-lg-6 col-md-6 d-flex">
						<div className="card arrival-card flex-fill mb-0">
							<div className="card-body position-relative z-1">
								<div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-4">
									<h2 className="card-title mb-0">Frequent Late Arrivals</h2>
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
								<p className="mb-1">No of Employees</p>
								<h3 className="main-title mb-0 d-flex align-items-center gap-2">22 <span
										className="badge badge-soft-purple fs-11">Warnings</span> </h3>
								<div className="mt-4 d-flex align-items-center justify-content-between gap-2">
									<div className="avatar-list-stacked avatar-group-sm">
										<span className="avatar avatar-rounded">
											<img className="border border-white" src="/assets/img/profiles/avatar-02.jpg"
												alt="img" />
										</span>
										<span className="avatar avatar-rounded">
											<img className="border border-white" src="/assets/img/profiles/avatar-03.jpg"
												alt="img" />
										</span>
										<span className="avatar avatar-rounded">
											<img className="border border-white" src="/assets/img/profiles/avatar-05.jpg"
												alt="img" />
										</span>
										<span className="avatar avatar-rounded">
											<img className="border border-white" src="/assets/img/profiles/avatar-06.jpg"
												alt="img" />
										</span>
										<span className="avatar avatar-rounded">
											<img className="border border-white" src="/assets/img/profiles/avatar-07.jpg"
												alt="img" />
										</span>
										<a className="avatar bg-white avatar-rounded text-fixed-white fs-12 border text-dark"
											href="#" onClick={(e) => e.preventDefault()}>
											<span className="text-dark">+9</span>
										</a>
									</div>
									<div
										className="rounded-pill bg-white border fs-13 text-gray-9 d-inline-flex align-items-center gap-2 p-1 ps-2">
										+15.5%
										<p
											className="btn pe-none btn-sm btn-icon bg-danger rounded-circle d-flex align-items-center justify-content-center text-white">
											<i className="ti ti-arrow-down-right fs-14 "></i>
										</p>
									</div>
								</div>
							</div>
							<img src="/assets/img/bg/attendance-bg.png" alt="attendance" className="img-fluid img-1" />
						</div>
					</div>

					{/*  Item 2  */}
					<div className="col-xxl-4 col-xl-6 col-lg-6 col-md-6 d-flex">
						<div className="card arrival-card arrival-card-1 flex-fill mb-0">
							<div className="card-body position-relative">
								<div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-4">
									<h2 className="card-title mb-0">Missing Punches</h2>
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
								<p className="mb-1">Total Number of Missing Punches</p>
								<h3 className="main-title mb-0 d-flex align-items-center gap-2">09 <span
										className="badge badge-soft-danger fs-11">Critical</span> </h3>
								<div className="mt-4 d-flex align-items-center justify-content-between gap-2">
									<div className="avatar-list-stacked avatar-group-sm">
										<span className="avatar avatar-rounded">
											<img className="border border-white" src="/assets/img/profiles/avatar-02.jpg"
												alt="img" />
										</span>
										<span className="avatar avatar-rounded">
											<img className="border border-white" src="/assets/img/profiles/avatar-03.jpg"
												alt="img" />
										</span>
										<span className="avatar avatar-rounded">
											<img className="border border-white" src="/assets/img/profiles/avatar-05.jpg"
												alt="img" />
										</span>
										<span className="avatar avatar-rounded">
											<img className="border border-white" src="/assets/img/profiles/avatar-06.jpg"
												alt="img" />
										</span>
										<span className="avatar avatar-rounded">
											<img className="border border-white" src="/assets/img/profiles/avatar-07.jpg"
												alt="img" />
										</span>
										<a className="avatar bg-white avatar-rounded text-fixed-white fs-12 border text-dark"
											href="#" onClick={(e) => e.preventDefault()}>
											<span className="text-dark">+6</span>
										</a>
									</div>
									<div
										className="rounded-pill value bg-white border fs-13 text-gray-9 d-inline-flex align-items-center gap-2 p-1 ps-2">
										+18.5%
										<p
											className="btn pe-none btn-sm btn-icon bg-success rounded-circle d-flex align-items-center justify-content-center text-white">
											<i className="ti ti-arrow-up-right fs-14 "></i>
										</p>
									</div>
								</div>
							</div>
							<img src="/assets/img/bg/attendance-bg-1.png" alt="attendance" className="img-fluid img-1" />
						</div>
					</div>

					{/*  Item 3  */}
					<div className="col-xxl-4 col-xl-6 d-flex">
						<div className="card arrival-card flex-fill mb-0">
							<div className="card-body position-relative">
								<div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-4">
									<h2 className="card-title mb-0">Violations Statistics</h2>
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
								{/*  start row  */}
								<div className="row row-gap-3">
									<div className="col-sm-7">
										<p className="mb-3 d-flex align-items-center gap-2 text-dark"> <span
												className="stat-pill bg-primary-gradient"></span> Late Arrivals </p>
										<p className="mb-3 d-flex align-items-center gap-2 text-dark"> <span
												className="stat-pill bg-secondary-gradient"></span> Missing Punches </p>
										<p className="mb-0 d-flex align-items-center gap-2 text-dark"> <span
												className="stat-pill bg-success-gradient"></span> Attendance Below 75% </p>
									</div>
									<div className="col-sm-5">
										<div id="violation-chart">
  {isMounted && (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={{ chart: { id: "violation-chart", toolbar: { show: false } }, colors: ["#0d6efd", "#10b981", "#f59e0b", "#6366f1"], dataLabels: { enabled: false } }} series={[{ name: "violation-chart", data: [30, 40, 35, 50, 49, 60, 70, 91, 125] }]} type="area" height={220} width="100%" />
    </Suspense>
  )}
</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/*  Late Arrivals & Alerts   */}
				<div className="row row-gap-4 mb-4">
					<div className="col-xxl-7">
						<div className="card mb-0">
							<div className="card-body">
								<div
									className="mb-1 d-flex align-items-center justify-content-between gap-2 flex-wrap mb-4">
									<h2 className="card-title mb-0">Late Arrivals & Alerts</h2>
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

								<div className="alerts-list">
									{/*  Item 1  */}
									<div className="alerts-item mb-3">
										<div>
											<div className="d-flex align-items-center gap-2">
												<div className="avatar rounded-circle">
													<img src="/assets/img/users/user-06.jpg" alt="user"
														className="img-fluid img-1 rounded-circle" />
												</div>
												<div>
													<h3 className="fs-14 fw-medium mb-1"><a href="#">Michael Johnson</a>
													</h3>
													<p className="mb-0  fs-13">Administration Head</p>
												</div>
											</div>
										</div>
										<div>
											<h4 className="d-flex align-items-center gap-1 fs-14 mb-0"><span
													className="fw-normal text-gray-6 ">Check-in: </span> 09:45 AM</h4>
										</div>
										<div className="d-flex justify-content-center">
											<div id="arrival-chart-1">
  {isMounted && (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={{ chart: { id: "arrival-chart-1", toolbar: { show: false } }, colors: ["#0d6efd", "#10b981", "#f59e0b", "#6366f1"], dataLabels: { enabled: false } }} series={[{ name: "arrival-chart-1", data: [30, 40, 35, 50, 49, 60, 70, 91, 125] }]} type="area" height={220} width="100%" />
    </Suspense>
  )}
</div>
										</div>
									</div>

									{/*  Item 2  */}
									<div className="alerts-item mb-3">
										<div>
											<div className="d-flex align-items-center gap-2">
												<div className="avatar rounded-circle">
													<img src="/assets/img/users/user-07.jpg" alt="user"
														className="img-fluid img-1 rounded-circle" />
												</div>
												<div>
													<h3 className="fs-14 fw-medium mb-1"><a href="#">Emily Davis</a></h3>
													<p className="mb-0  fs-13">Frontend Developer</p>
												</div>
											</div>
										</div>
										<div>
											<h4 className="d-flex align-items-center gap-1 fs-14 mb-0"><span
													className="fw-normal text-gray-6 ">Check-in: </span> 09:30 AM</h4>
										</div>
										<div className="d-flex justify-content-center">
											<div id="arrival-chart-2">
  {isMounted && (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={{ chart: { id: "arrival-chart-2", toolbar: { show: false } }, colors: ["#0d6efd", "#10b981", "#f59e0b", "#6366f1"], dataLabels: { enabled: false } }} series={[{ name: "arrival-chart-2", data: [30, 40, 35, 50, 49, 60, 70, 91, 125] }]} type="area" height={220} width="100%" />
    </Suspense>
  )}
</div>
										</div>
									</div>

									{/*  Item 3  */}
									<div className="alerts-item mb-3">
										<div>
											<div className="d-flex align-items-center gap-2">
												<div className="avatar rounded-circle">
													<img src="/assets/img/users/user-08.jpg" alt="user"
														className="img-fluid img-1 rounded-circle" />
												</div>
												<div>
													<h3 className="fs-14 fw-medium mb-1"><a href="#">Robert Martinez</a>
													</h3>
													<p className="mb-0  fs-13">Finance Manager</p>
												</div>
											</div>
										</div>
										<div>
											<h4 className="d-flex align-items-center gap-1 fs-14 mb-0"><span
													className="fw-normal text-gray-6 ">Check-in: </span> 09:25 AM</h4>
										</div>
										<div className="d-flex justify-content-center">
											<div id="arrival-chart-3">
  {isMounted && (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={{ chart: { id: "arrival-chart-3", toolbar: { show: false } }, colors: ["#0d6efd", "#10b981", "#f59e0b", "#6366f1"], dataLabels: { enabled: false } }} series={[{ name: "arrival-chart-3", data: [30, 40, 35, 50, 49, 60, 70, 91, 125] }]} type="area" height={220} width="100%" />
    </Suspense>
  )}
</div>
										</div>
									</div>

									{/*  Item 4  */}
									<div className="alerts-item">
										<div>
											<div className="d-flex align-items-center gap-2">
												<div className="avatar rounded-circle">
													<img src="/assets/img/users/user-09.jpg" alt="user"
														className="img-fluid img-1 rounded-circle" />
												</div>
												<div>
													<h3 className="fs-14 fw-medium mb-1"><a href="#">Megan Walker</a></h3>
													<p className="mb-0  fs-13">SEO Analyst</p>
												</div>
											</div>
										</div>
										<div>
											<h4 className="d-flex align-items-center gap-1 fs-14 mb-0"><span
													className="fw-normal text-gray-6 ">Check-in: </span> 09:10 AM</h4>
										</div>
										<div className="d-flex justify-content-center">
											<div id="arrival-chart-4">
  {isMounted && (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={{ chart: { id: "arrival-chart-4", toolbar: { show: false } }, colors: ["#0d6efd", "#10b981", "#f59e0b", "#6366f1"], dataLabels: { enabled: false } }} series={[{ name: "arrival-chart-4", data: [30, 40, 35, 50, 49, 60, 70, 91, 125] }]} type="area" height={220} width="100%" />
    </Suspense>
  )}
</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/*  AI Assistant  */}
					<div className="col-xxl-5 d-flex">
						<div className="card flex-fill bg-linear-gradient mb-0">
							<div className="card-header bg-dark">
								<div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
									<div className="d-flex align-items-center gap-2">
										<div className="avatar avatar-xl bg-white rounded-circle">
											<i className="ti ti-sparkles fs-24 text-dark"></i>
										</div>
										<div>
											<h4 className="mb-1 text-white">AI Assistant</h4>
											<p className="fs-13 mb-0 text-white">Always here to help</p>
										</div>
									</div>
									<span
										className="badge bg-success d-inline-flex align-items-center gap-1 rounded-pill"><i
											className="ti ti-point-filled text-white fs-5 lh-0"></i>Online</span>
								</div>
							</div>
							<div className="card-body bg-light">
								<span className="d-flex align-items-center gap-2 mb-2 text-secondary"> <i
										className="ti ti-sparkles text-secondary"></i> AI Assistant</span>
								<p className="mb-0 text-gray-5">Hello! I'm your AI Attendance Assistant. I can help you
									analyze attendance patterns, generate reports, and provide insights. How can I
									assist you today?</p>
							</div>

							<div className="card-body chat-inner-item">
								<p className="mb-3 fs-14 text-dark">Suggested Questions</p>
								<div className="d-inline-flex flex-column gap-2">
									<p className="mb-2 prompt">Show me today's attendance summary</p>
									<p className="mb-0 prompt active">Why is attendance low on Fridays?</p>
								</div>
							</div>
							<div className="card-body border-top">
								<div className="chat-input-item item-new">
									<input type="text" className="form-control" placeholder="Ask me anything about payroll" />
									<a href="#" className="btn btn-icon"><i className="ti ti-send"></i></a>
								</div>
							</div>
						</div>
					</div>
				</div>

			
    </>
  );
}
