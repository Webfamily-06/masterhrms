'use client';

import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Link } from "@/src/lib/router-compat";

const Chart = lazy(() => import("react-apexcharts"));

export default function PayrollDashboardPage() {

  // Distribution Bar Chart (height: 240)
  const distributionBarOptions: ApexCharts.ApexOptions = useMemo(() => ({
    chart: { height: 240, type: 'bar', stacked: true, toolbar: { show: false } },
    plotOptions: { bar: { columnWidth: '50%', borderRadius: 4 } },
    colors: ['#0d6efd', '#10b981'],
    xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] }
  }), []);
  const distributionBarSeries = useMemo(() => [
    { name: 'Base Salary', data: [120, 130, 125, 140, 135, 150] },
    { name: 'Allowances', data: [20, 25, 20, 30, 25, 35] }
  ], []);

  // Process Radial Gauge (height: 250)
  const processRadialOptions: ApexCharts.ApexOptions = useMemo(() => ({
    chart: { height: 250, type: 'radialBar' },
    colors: ['#03C95A'],
    plotOptions: { radialBar: { hollow: { size: '65%' }, dataLabels: { name: { show: true }, value: { fontSize: '22px', fontWeight: 'bold' } } } },
    labels: ['Processed']
  }), []);
  const processRadialSeries = useMemo(() => [85], []);

  // Trend Line Chart (height: 305)
  const trendLineOptions: ApexCharts.ApexOptions = useMemo(() => ({
    chart: { height: 305, type: 'line', toolbar: { show: false } },
    stroke: { curve: 'smooth', width: 2 },
    colors: ['#FF6F28'],
    xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] }
  }), []);
  const trendLineSeries = useMemo(() => [{ name: 'Payroll Total', data: [45, 52, 58, 65, 72, 78, 85, 90, 88, 92, 95, 100] }], []);

  // Mini KPI Sparklines (45x100)
  const insurenceSparkOptions: ApexCharts.ApexOptions = useMemo(() => ({
    chart: { height: 45, width: 100, type: 'bar', sparkline: { enabled: true } },
    colors: ['#0d6efd'],
    plotOptions: { bar: { columnWidth: '50%', borderRadius: 2 } }
  }), []);
  const contributionSparkOptions: ApexCharts.ApexOptions = useMemo(() => ({
    chart: { height: 45, width: 100, type: 'bar', sparkline: { enabled: true } },
    colors: ['#10b981'],
    plotOptions: { bar: { columnWidth: '50%', borderRadius: 2 } }
  }), []);
  const healthSparkOptions: ApexCharts.ApexOptions = useMemo(() => ({
    chart: { height: 45, width: 100, type: 'bar', sparkline: { enabled: true } },
    colors: ['#f59e0b'],
    plotOptions: { bar: { columnWidth: '50%', borderRadius: 2 } }
  }), []);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="dashboard-scope w-full">
      {/*  Breadcrumb  */}
				<div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
					<div className="my-auto mb-2">
						<h2 className="mb-1">Payroll Dashboard</h2>
						<nav>
							<ol className="breadcrumb mb-0">
								<li className="breadcrumb-item">
									<a href="index.html"><i className="ti ti-smart-home"></i></a>
								</li>
								<li className="breadcrumb-item">
									Dashboard
								</li>
								<li className="breadcrumb-item active" aria-current="page">Payroll Dashboard</li>
							</ol>
						</nav>
					</div>
					<div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
						<div className="me-2 mb-2">
							<div className="dropdown">
								<a href="#" onClick={(e) => e.preventDefault()}
									className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
									data-bs-toggle="dropdown">
									<i className="ti ti-arrow-bar-to-down me-1"></i>Montly Report
								</a>
								<ul className="dropdown-menu  dropdown-menu-end p-3">
									<li>
										<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">Daily Report</a>
									</li>
									<li>
										<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">Weekly Report </a>
									</li>
									<li>
										<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">Montly Report </a>
									</li>
									<li>
										<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">Yearly Report </a>
									</li>
								</ul>
							</div>
						</div>
						<div className="mb-2">
							<div className="input-icon w-100 position-relative">
								<span className="input-icon-addon">
									<i className="ti ti-calendar text-gray-9"></i>
								</span>
								<input type="text" className="form-control yearpicker" value="December 2025" />
							</div>
						</div>
						<div className="ms-2 head-icons">
							<a href="#" onClick={(e) => e.preventDefault()} className="" data-bs-toggle="tooltip" data-bs-placement="top"
								data-bs-original-title="Collapse" id="collapse-header">
								<i className="ti ti-chevrons-up"></i>
							</a>
						</div>
					</div>
				</div>
				{/*  /Breadcrumb  */}

				{/*  Processing  */}
				<div className="card mb-4">
					<div className="card-body">
						{/*  Pay  */}
						<div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
							<div className="d-flex align-items-center flex-wrap gap-3">
								<div className="d-flex align-items-center gap-2 border-end pe-3">
									<p className="mb-0 d-flex align-items-center gap-1 text-gray-9"> <i
											className="ti ti-point-filled text-success lh-0"></i> Payroll Status: </p>
									<span
										className="badge badge-soft-success rounded border border-success">Processing</span>
								</div>
								<div className="d-flex align-items-center gap-2 border-end pe-3">
									<p className="mb-0 d-flex align-items-center gap-1 text-gray-9"> Cut-off: Dec 25, 2024
									</p>
								</div>
								<div className="d-flex align-items-center gap-2">
									<p className="mb-0 d-flex align-items-center gap-1 text-gray-9"> Payment Date: Dec 31,
										2024 </p>
								</div>
							</div>
							<a href="#" className="btn btn-primary-gradient "> <i className="ti ti-analyze"></i> Run Payroll</a>
						</div>
					</div>
				</div>

				{/*  start row  */}
				<div className="row mb-4">
					<div className="col-xxl-5">
						{/*  Overview  */}
						<div className="card bg-dark position-relative overflow-hidden overview-card">
							<div className="card-body">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
									<h2 className="card-title text-white mb-0">Overview</h2>
									<div className="dropdown">
										<a href="#" onClick={(e) => e.preventDefault()}
											className="border btn btn-white btn-icon btn-sm d-inline-flex align-items-center justify-content-center rounded-circle"
											data-bs-toggle="dropdown">
											<i className="ti ti-dots-vertical fs-16"></i>
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
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
									<div className="d-flex align-items-center gap-2">
										<div className="avatar avatar-xl bg-primary rounded-circle">
											<i className="ti ti-moneybag fs-24"></i>
										</div>
										<div>
											<h3 className="custom-title mb-2 text-white">$2,458,320</h3>
											<p className="mb-0  text-white fs-13">Total Gross Payroll</p>
										</div>
									</div>
									<div className="d-flex align-items-center gap-2">
										<div className="avatar avatar-xl bg-secondary rounded-circle">
											<i className="ti ti-bell-dollar fs-24"></i>
										</div>
										<div>
											<h3 className="custom-title mb-2 text-white">$1,987,450</h3>
											<p className="mb-0  text-white fs-13">Net Payable Amount</p>
										</div>
									</div>
								</div>

								<div
									className="d-flex align-items-center justify-content-between flex-wrap flex-md-nowrap gap-3">
									{/*  Item 1  */}
									<div className="card mb-0 w-100 rounded-xxl pay-card">
										<div className="card-body text-center">
											<div className="d-flex align-items-center gap-2 flex-column">
												<div className="avatar avatar-xl bg-white rounded-circle mb-3">
													<i className="ti ti-flag-dollar fs-24 text-gray-9"></i>
												</div>
												<div>
													<h3 className="mb-2 custom-title">$1,987,450</h3>
													<p className="mb-0  text-gray-9 fs-13">Total <span
															className="d-block">Deductions</span> </p>
												</div>
											</div>
										</div>
									</div>
									{/*  Item 2  */}
									<div className="card mb-0 w-100 rounded-xxl pay-card">
										<div className="card-body text-center">
											<div className="d-flex align-items-center gap-2 flex-column">
												<div className="avatar avatar-xl bg-white rounded-circle mb-3">
													<i className="ti ti-loader-3 fs-24 text-gray-9"></i>
												</div>
												<div>
													<h3 className="mb-2 custom-title">12</h3>
													<p className="mb-0  text-gray-9 fs-13">Pending <span className="d-block">
															Approvals</span></p>
												</div>
											</div>
										</div>
									</div>
									{/*  Item 3  */}
									<div className="card mb-0 w-100 rounded-xxl pay-card">
										<div className="card-body text-center">
											<div className="d-flex align-items-center gap-2 flex-column">
												<div className="avatar avatar-xl bg-white rounded-circle mb-3">
													<i className="ti ti-info-triangle fs-24 text-gray-9"></i>
												</div>
												<div>
													<h3 className="mb-2 custom-title">24</h3>
													<p className="mb-0  text-gray-9 fs-13">Total Payroll <span
															className="d-block">Errors</span> </p>
												</div>
											</div>
										</div>
									</div>
								</div>

							</div>
							<img src="/assets/img/bg/bg-04.png" alt="bg" className="img-fluid pay-bg" />
						</div>

						{/*  Salery  */}
						<div className="row row-gap-3">

							<div className="col-xxl-6 col-xl-3 col-lg-6 col-sm-6">
								{/*  Item 1   */}
								<div className="card mb-0">
									<div className="card-body">
										<div className="d-flex align-items-center gap-2 mb-3">
											<div className="avatar avatar-md bg-dark rounded-circle">
												<i className="ti ti-info-triangle fs-12"></i>
											</div>
											<p className="mb-0 fs-13">Highest Salary</p>
										</div>
										<div
											className="mb-1 d-flex align-items-center justify-content-start gap-2 flex-wrap">
											<h4 className="mb-0 sub-title">$24,500</h4>
											<div
												className="border rounded-pill fs-13 text-gray-9 d-flex align-items-center gap-2 p-1 ps-2">
												+18%
												<p
													className="btn btn-sm btn-icon bg-success pe-none rounded-circle d-flex align-items-center justify-content-center fs-20 text-white">
													<i className="ti ti-arrow-up-right"></i>
												</p>
											</div>
										</div>
										<p className="mb-0 fs-12">CTO - Engineering</p>
									</div>
								</div>
							</div> {/*  end col  */}

							<div className="col-xxl-6 col-xl-3 col-lg-6 col-sm-6">
								{/*  Item 2   */}
								<div className="card mb-0">
									<div className="card-body">
										<div className="d-flex align-items-center gap-2 mb-3">
											<div className="avatar avatar-md bg-dark rounded-circle">
												<i className="ti ti-inner-shadow-bottom fs-12"></i>
											</div>
											<p className="mb-0 fs-13">Variable Pay</p>
										</div>
										<div
											className="mb-1 d-flex align-items-center justify-content-start gap-2 flex-wrap">
											<h4 className="mb-0 sub-title">$284K</h4>
											<div
												className="border rounded-pill fs-13 text-gray-9 d-flex align-items-center gap-2 p-1 ps-2">
												+18%
												<p
													className="btn btn-sm btn-icon pe-none bg-success rounded-circle d-flex align-items-center justify-content-center fs-20 text-white">
													<i className="ti ti-arrow-up-right"></i>
												</p>
											</div>
										</div>
										<p className="mb-0 fs-12">Bonuses + Commissions</p>
									</div>
								</div>
							</div> {/*  end col  */}

							<div className="col-xxl-6 col-xl-3 col-lg-6 col-sm-6">
								{/*  Item 3   */}
								<div className="card mb-0">
									<div className="card-body">
										<div className="d-flex align-items-center gap-2 mb-3">
											<div className="avatar avatar-md bg-dark rounded-circle">
												<i className="ti ti-info-triangle fs-12"></i>
											</div>
											<p className="mb-0 fs-13">After Deduction</p>
										</div>
										<div
											className="mb-1 d-flex align-items-center justify-content-start gap-2 flex-wrap">
											<h4 className="mb-0 sub-title">$1.99M</h4>
											<div
												className="border rounded-pill fs-13 text-gray-9 d-flex align-items-center gap-2 p-1 ps-2">
												-16%
												<p
													className="btn btn-sm btn-icon bg-danger pe-none rounded-circle d-flex align-items-center justify-content-center fs-20 text-white">
													<i className="ti ti-arrow-down-right"></i>
												</p>
											</div>
										</div>
										<p className="mb-0 fs-12">Employee take-home</p>
									</div>
								</div>
							</div> {/*  end col  */}

							<div className="col-xxl-6 col-xl-3 col-lg-6 col-sm-6">
								{/*  Item 4   */}
								<div className="card mb-0">
									<div className="card-body">
										<div className="d-flex align-items-center gap-2 mb-3">
											<div className="avatar avatar-md bg-dark rounded-circle">
												<i className="ti ti-report-money fs-12"></i>
											</div>
											<p className="mb-0 fs-13">Average Salary</p>
										</div>
										<div
											className="mb-1 d-flex align-items-center justify-content-start gap-2 flex-wrap">
											<h4 className="mb-0 sub-title">$78,450</h4>
											<div
												className="border rounded-pill fs-13 text-gray-9 d-flex align-items-center gap-2 p-1 ps-2">
												+18%
												<p
													className="btn btn-sm btn-icon pe-none bg-success rounded-circle d-flex align-items-center justify-content-center fs-20 text-white">
													<i className="ti ti-arrow-up-right"></i>
												</p>
											</div>
										</div>
										<p className="mb-0 fs-12">Median: $72,000</p>
									</div>
								</div>
							</div> {/*  end col  */}
						</div>
						{/*  end row  */}
					</div>

					<div className="col-xxl-7">
						{/*  Salary Range Distribution  */}
						<div className="card mb-0 mt-xxl-0 mt-4">
							<div className="card-body">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-2">
									<h5 className="mb-0 card-title">Salary Range Distribution</h5>
									<div className="dropdown">
										<a href="#" onClick={(e) => e.preventDefault()}
											className="border btn btn-light btn-icon btn-sm d-inline-flex align-items-center justify-content-center rounded-circle"
											data-bs-toggle="dropdown">
											<i className="ti ti-dots-vertical fs-16"></i>
										</a>
										<ul className="dropdown-menu mt-2 p-3">
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">
													Monthly
												</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">
													Weekly
												</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">
													Today
												</a>
											</li>
										</ul>
									</div>
								</div>

								<div>
									<div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-4">
										<h6 className="fs-24 d-flex align-items-center gap-2 mb-0 main-title"> <span
												className="fs-14 fw-normal text-gray-6">Average Salary</span> $78,450 </h6>
										<p className="d-flex align-items-center gap-1 mb-0 text-dark"> <i
												className="ti ti-circle-filled text-primary fs-12"></i> Salary Range </p>
									</div>
									<div id="distribution-chart">
  {isMounted && (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={distributionBarOptions} series={distributionBarSeries} type="bar" height={240} width="100%" />
    </Suspense>
  )}
</div>

									<div className="mt-2">
										<div
											className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-4">
											<h6 className="fs-14 mb-0 fw-medium card-title">Range</h6>
											<div className="dropdown">
												<a href="#" onClick={(e) => e.preventDefault()}
													className="d-inline-flex p-2 rounded align-items-center justify-content-center fs-14 fw-medium gap-1"
													data-bs-toggle="dropdown">
													Last 7 Days <i className="ti ti-chevron-down fs-14"></i>
												</a>
												<ul className="dropdown-menu mt-2 p-3">
													<li>
														<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">
															Monthly
														</a>
													</li>
													<li>
														<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">
															Weekly
														</a>
													</li>
													<li>
														<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">
															Today
														</a>
													</li>
												</ul>
											</div>
										</div>

										{/*  Item 1  */}
										<div className="range-item mb-3">
											<div className="d-flex align-items-center justify-content-between mb-1">
												<p className="mb-0">$30k-50k</p>
												<p className="fw-medium text-dark mb-0">285<span
														className="ms-2 fw-normal text-gray-6 fs-13">(22.8%)</span></p>
											</div>
											<div className="progress progress-pill-gradient">
												<div className="progress-bar" role="progressbar" style={{ width: "75%" }}
													aria-valuenow="75" aria-valuemin="0" aria-valuemax="100"></div>
											</div>
										</div>

										{/*  Item 2  */}
										<div className="range-item mb-3">
											<div className="d-flex align-items-center justify-content-between mb-1">
												<p className="mb-0">$50k-80k</p>
												<p className="fw-medium text-dark mb-0">478<span
														className="ms-2 fw-normal text-gray-6 fs-13">(38.3%)</span></p>
											</div>
											<div className="progress progress-pill-gradient">
												<div className="progress-bar" role="progressbar" style={{ width: "85%" }}
													aria-valuenow="85" aria-valuemin="0" aria-valuemax="100"></div>
											</div>
										</div>

										{/*  Item 3  */}
										<div className="range-item mb-3">
											<div className="d-flex align-items-center justify-content-between mb-1">
												<p className="mb-0">$80k-120k</p>
												<p className="fw-medium text-dark mb-0">342<span
														className="ms-2 fw-normal text-gray-6 fs-13">(27.4%)</span></p>
											</div>
											<div className="progress progress-pill-gradient">
												<div className="progress-bar" role="progressbar" style={{ width: "72%" }}
													aria-valuenow="72" aria-valuemin="0" aria-valuemax="100"></div>
											</div>
										</div>

										{/*  Item 4  */}
										<div className="range-item mb-3">
											<div className="d-flex align-items-center justify-content-between mb-1">
												<p className="mb-0">$80k-120k</p>
												<p className="fw-medium text-dark mb-0">98<span
														className="ms-2 fw-normal text-gray-6 fs-13">(7.8%)</span></p>
											</div>
											<div className="progress progress-pill-gradient">
												<div className="progress-bar" role="progressbar" style={{ width: "79%" }}
													aria-valuenow="79" aria-valuemin="0" aria-valuemax="100"></div>
											</div>
										</div>

										{/*  Item 5  */}
										<div className="range-item mb-4">
											<div className="d-flex align-items-center justify-content-between mb-1">
												<p className="mb-0">$80k-120k</p>
												<p className="fw-medium text-dark mb-0">45<span
														className="ms-2 fw-normal text-gray-6 fs-13">(3.6%)</span></p>
											</div>
											<div className="progress progress-pill-gradient">
												<div className="progress-bar" role="progressbar" style={{ width: "40%" }}
													aria-valuenow="40" aria-valuemin="0" aria-valuemax="100"></div>
											</div>
										</div>

										<div
											className="mb-0 fs-14 fw-medium text-dark d-flex align-items-center justify-content-center gap-2">
											View Salary Report in realtime
											<a href="#"
												className="btn btn-sm btn-icon border bg-light d-flex align-items-center justify-content-center rounded-circle"><i
													className="ti ti-arrow-curve-right fs-16"></i></a>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

				</div>
				{/*  end row  */}

				{/*  start row  */}
				<div className="row mb-4 row-gap-4">
					<div className="col-xxl-4 col-xl-6">
						<div className="card mb-0">
							<div className="card-body">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
									<h2 className="mb-0 card-title">Batch Processing Status</h2>
									<div className="dropdown">
										<a href="#" onClick={(e) => e.preventDefault()}
											className="border btn btn-white btn-md d-inline-flex align-items-center"
											data-bs-toggle="dropdown">
											<i className="ti ti-calendar me-1"></i>Montly
										</a>
										<ul className="dropdown-menu  dropdown-menu-end p-3">
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">Daily
													Report</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">Weekly
													Report </a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">Montly
													Report </a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">Yearly
													Report </a>
											</li>
										</ul>
									</div>
								</div>
								<div>
									<p className="mb-1">Combined Total</p>
									<h2 className="d-flex align-items-center align-items-center gap-2">$2,459,320 <span
											className="badge badge-soft-success fs-12 border border-success rounded-pill">3
											Batches</span> </h2>
								</div>

								<div className="process-chart">
									<div className="chart-1 chart">
										<h3 className="title">
											1120 Employees
											<span>$2,184,500</span>
										</h3>
										<div className="graph"></div>
									</div>
									<div className="chart-2 chart">
										<h3 className="title">
											60 Employees
											<span>$124,850</span>
										</h3>
										<div className="graph"></div>
									</div>
									<div className="chart-3 chart">
										<h3 className="title">
											63 Employees
											<span>$154,850</span>
										</h3>
										<div className="graph"></div>
									</div>
									<div id="process-chart">
  {isMounted && (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={processRadialOptions} series={processRadialSeries} type="radialBar" height={250} width="100%" />
    </Suspense>
  )}
</div>
								</div>

								<div className="d-flex align-items-center gap-3 mt-3 flex-wrap">
									<p className="d-flex align-items-center gap-2 fs-13 text-gray-9 mb-0"><i
											className="ti ti-circle-filled text-primary fs-12"></i> Full Time</p>
									<p className="d-flex align-items-center gap-2 fs-13 text-gray-9 mb-0"><i
											className="ti ti-circle-filled text-secondary fs-12"></i> Part Time</p>
									<p className="d-flex align-items-center gap-2 fs-13 text-gray-9 mb-0"><i
											className="ti ti-circle-filled text-dark fs-12"></i> Contractors</p>
								</div>


							</div>
						</div>
					</div>
					{/*  end col  */}

					<div className="col-xxl-4 col-xl-6">
						<div className="card mb-0">
							<div className="card-body">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-2">
									<h2 className="mb-0 card-title">6 Months Tax & Deduction Trend</h2>
								</div>
								<div id="chart-trend">
  {isMounted && (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={trendLineOptions} series={trendLineSeries} type="line" height={305} width="100%" />
    </Suspense>
  )}
</div>
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
									<h3 className="mb-0 d-flex align-items-center gap-2 fs-16">
										$1.71M
										<p
											className="btn btn-sm btn-icon bg-success pe-none d-flex align-items-center justify-content-center rounded-circle">
											<i className="ti ti-arrow-up-right fs-12"></i>
										</p>
									</h3>
									<div className="d-flex align-items-center gap-3">
										<p className="mb-0 fs-12 d-flex align-items-center gap-1"><span
												className="square-icon rounded-circle bg-secondary"><i
													className="ti ti-check text-white fs-9"></i></span> Federal Tax</p>
										<p className="mb-0 fs-12 d-flex align-items-center gap-1"><span
												className="square-icon rounded-circle bg-primary"><i
													className="ti ti-check text-white fs-9"></i></span>Deductions</p>
									</div>
								</div>
							</div>
						</div>
					</div>
					{/*  end col  */}

					<div className="col-xxl-4">
						<div className="row row-gap-4">
							<div className="col-xxl-12 col-xl-4">
								{/*  Item 1  */}
								<div className="card mb-0">
									<div className="card-body">
										<div>
											<div
												className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
												<h4 className="mb-2 fs-14">Life Insurance</h4>
												<div id="insurence-chart">
  {isMounted && (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={insurenceSparkOptions} series={[{ data: [25, 35, 45, 30, 40, 55, 60] }]} type="bar" height={45} width={100} />
    </Suspense>
  )}
</div>
											</div>
											<div
												className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
												<p className="mb-0 fs-13">Per Employee</p>
												<p className="mb-0 fs-13">$24.87</p>
											</div>
										</div>
									</div>
								</div>
							</div>
							<div className="col-xxl-12 col-xl-4">
								{/*  Item 2  */}
								<div className="card mb-0">
									<div className="card-body">
										<div>
											<div
												className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
												<h4 className="mb-2 fs-14">401(k) Contribution</h4>
												<div id="contribution-chart">
  {isMounted && (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={contributionSparkOptions} series={[{ data: [30, 40, 35, 50, 45, 60, 65] }]} type="bar" height={45} width={100} />
    </Suspense>
  )}
</div>
											</div>
											<div
												className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
												<p className="mb-0 fs-13">Per Employee</p>
												<p className="mb-0 fs-13">$10.47</p>
											</div>
										</div>
									</div>
								</div>
							</div>
							<div className="col-xxl-12 col-xl-4">
								{/*  Item 3  */}
								<div className="card mb-0">
									<div className="card-body">
										<div>
											<div
												className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
												<h4 className="mb-2 fs-14">Health Insurance</h4>
												<div id="health-chart">
  {isMounted && (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={healthSparkOptions} series={[{ data: [20, 25, 30, 35, 40, 45, 50] }]} type="bar" height={45} width={100} />
    </Suspense>
  )}
</div>
											</div>
											<div
												className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
												<p className="mb-0 fs-13">Per Employee</p>
												<p className="mb-0 fs-13">$26.87</p>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
					{/*  end col  */}
				</div>
				{/*  end row  */}

				{/*  start row  */}
				<div className="row mb-4 row-gap-4">
					<div className="col-xl-6 d-flex">
						<div className="card flex-fill mb-0">
							<div className="card-body">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
									<h2 className="mb-0 card-title">Payroll Processing Pipeline</h2>
									<span className="badge badge-soft-danger border fs-12 rounded-pill">Processing 4 to
										6</span>
								</div>
								<div className="mb-4">
									<h3 className="fs-14 d-flex align-items-center justify-content-between mb-1">Overall
										Progress <span className="fs-13 fw-normal text-muted">(40%)</span> </h3>
									<div className="progress progress-pill-secondary">
										<div className="progress-bar" role="progressbar" style={{ width: "75%" }}
											aria-valuenow="75" aria-valuemin="0" aria-valuemax="100"></div>
									</div>
								</div>


								{/*  Item 1   */}
								<div className="pipline-check mb-2">
									<div className="d-flex align-items-center gap-2">
										<div className="form-check">
											<input className="form-check-input" type="radio" name="flexRadioDefault"
												id="flexRadioDefault1" checked />
											<label className="form-check-label text-dark" htmlFor="flexRadioDefault1"></label>
										</div>
										<div className="">
											<h3 className="mb-1 fs-14"> Data Validation</h3>
											<p className="mb-0 fs-13">All employee records validated</p>
										</div>
									</div>
									<div className="d-flex align-items-center gap-3">
										<span
											className="badge badge-soft-success d-inline-flex align-items-center gap-1 rounded-pill">
											<i className="ti ti-circle-filled text-success fs-5"></i> Completed</span>
										<div className="cirle-progress active">
											<span>2 Min</span>
										</div>
									</div>
								</div>

								{/*  Item 2   */}
								<div className="pipline-check mb-2">
									<div className="d-flex align-items-center gap-2">
										<div className="form-check">
											<input className="form-check-input" type="radio" name="flexRadioDefault"
												id="flexRadioDefault2" />
											<label className="form-check-label text-dark" htmlFor="flexRadioDefault2"></label>
										</div>
										<div className="">
											<h3 className="mb-1 fs-14">Attendance Calculation </h3>
											<p className="mb-0 fs-13">Working days and hours calculated</p>
										</div>
									</div>
									<div className="d-flex align-items-center gap-3">
										<span
											className="badge badge-soft-success d-inline-flex align-items-center gap-1 rounded-pill">
											<i className="ti ti-circle-filled text-success fs-5"></i> Completed</span>
										<div className="cirle-progress active">
											<span>4 Min</span>
										</div>
									</div>
								</div>

								{/*  Item 3   */}
								<div className="pipline-check mb-2">
									<div className="d-flex align-items-center gap-2">
										<div className="form-check">
											<input className="form-check-input" type="radio" name="flexRadioDefault"
												id="flexRadioDefault3" />
											<label className="form-check-label text-dark" htmlFor="flexRadioDefault3"></label>
										</div>
										<div className="">
											<h3 className="mb-1 fs-14">Salary Computation</h3>
											<p className="mb-0 fs-13">Base salary + allowances calculated</p>
										</div>
									</div>
									<div className="d-flex align-items-center gap-3">
										<span
											className="badge badge-soft-success d-inline-flex align-items-center gap-1 rounded-pill">
											<i className="ti ti-circle-filled text-success fs-5"></i> Completed</span>
										<div className="cirle-progress active">
											<span>3 Min</span>
										</div>
									</div>
								</div>

								{/*  Item 4   */}
								<div className="pipline-check mb-2">
									<div className="d-flex align-items-center gap-2">
										<div className="form-check">
											<input className="form-check-input" type="radio" name="flexRadioDefault"
												id="flexRadioDefault4" />
											<label className="form-check-label text-dark" htmlFor="flexRadioDefault4"></label>
										</div>
										<div className="">
											<h3 className="mb-1 fs-14"> Deductions Processing </h3>
											<p className="mb-0 fs-13">Tax, PF, and other deductions</p>
										</div>
									</div>
									<div className="d-flex align-items-center gap-3">
										<span
											className="badge badge-soft-info d-inline-flex align-items-center gap-1 rounded-pill">
											<i className="ti ti-circle-filled text-info fs-5"></i> Running</span>
										<div className="cirle-progress"></div>
									</div>
								</div>

								{/*  Item 5   */}
								<div className="pipline-check mb-2">
									<div className="d-flex align-items-center gap-2">
										<div className="form-check">
											<input className="form-check-input" type="radio" name="flexRadioDefault"
												id="flexRadioDefault5" />
											<label className="form-check-label text-dark" htmlFor="flexRadioDefault5"></label>
										</div>
										<div className="">
											<h3 className="mb-1 fs-14">Final Verification </h3>
											<p className="mb-0 fs-13">Admin approval required</p>
										</div>
									</div>
									<div className="d-flex align-items-center gap-3">
										<span
											className="badge bg-light d-inline-flex align-items-center gap-1 text-dark rounded-pill">
											<i className="ti ti-circle-filled text-dark fs-5"></i> Pending</span>
										<div className="cirle-progress"></div>
									</div>
								</div>

								{/*  Item 6   */}
								<div className="pipline-check mb-4">
									<div className="d-flex align-items-center gap-2">
										<div className="form-check">
											<input className="form-check-input" type="radio" name="flexRadioDefault"
												id="flexRadioDefault6" />
											<label className="form-check-label text-dark" htmlFor="flexRadioDefault6"></label>
										</div>
										<div className="">
											<h3 className="mb-1 fs-14">Payment Generation</h3>
											<p className="mb-0 fs-13">Bank file creation</p>
										</div>
									</div>
									<div className="d-flex align-items-center gap-3">
										<span
											className="badge bg-light d-inline-flex align-items-center gap-1 text-dark rounded-pill">
											<i className="ti ti-circle-filled text-dark fs-5"></i> Pending</span>
										<div className="cirle-progress"></div>
									</div>
								</div>

								<div className="d-flex align-items-center gap-2 flex-sm-row flex-column">
									<a href="#"
										className="btn btn-primary-gradient d-flex align-items-center justify-content-center gap-1 w-100 rounded-pill"><i
											className="ti ti-loader-3"></i>Continue Processing</a>
									<a href="#"
										className="btn btn-outline-primary d-flex align-items-center justify-content-center gap-1 w-100 rounded-pill"><i
											className="ti ti-file-export"></i>Export Report</a>
								</div>

							</div>
						</div>
					</div>
					{/*  end col   */}

					<div className="col-xl-6 d-flex">
						<div className="card flex-fill bg-linear-gradient mb-0">
							<div className="card-body d-flex flex-column align-items-start justify-content-between">
								<div>
									<div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-4">
										<div className="d-flex align-items-center gap-2">
											<div className="avatar avatar-xl bg-dark rounded-circle">
												<i className="ti ti-robot fs-24"></i>
											</div>
											<div>
												<h4 className="mb-1 sub-title">How can i help you today</h4>
												<p>AI Payroll Assistant</p>
											</div>
										</div>
										<span
											className="badge bg-success d-inline-flex align-items-center gap-1 rounded-pill"><i
												className="ti ti-point-filled text-white fs-6 lh-0"></i>Online</span>
									</div>

									<div>
										<h4 className="mb-2 fs-16 card-title">Quick Actions</h4>
										<div className="d-flex align-items-center gap-2 flex-wrap mb-3">
											<span className="click-tag active">Calculate overtime pay</span>
											<span className="click-tag">Generate tax report</span>
											<span className="click-tag">Error Detection</span>
											<span className="click-tag">Compliance Monitoring</span>
											<span className="click-tag">Analyze salary trends</span>
											<span className="click-tag">Review payroll errors</span>
										</div>
										<div className="card bg-transparent border rounded-md mb-5">
											<div className="card-body">
												<span className="d-flex align-items-center gap-2 mb-2 text-primary"> <i
														className="ti ti-sparkles fs-16"></i> AI Assistant</span>
												<p className="mb-1">Hello! I'm your AI Payroll Assistant. I can help you
													with payroll calculations, tax questions, compliance issues. How can
													I assist you today?</p>
												<p className="mb-0 text-dark">11:45 PM</p>
											</div>
										</div>
									</div>
								</div>
								<div className="w-100">
									<h5 className="mb-2 fs-13">Suggested Questions</h5>
									<div className="d-flex align-items-center gap-2 flex-wrap">
										<p className="mb-0">How do I process a bonus payment?</p>
										<p className="mb-0">What are the tax implications of workers?</p>
									</div>
									<div className="chat-input-item mt-3">
										<input type="text" className="form-control"
											placeholder="Ask me anything about payroll" />
										<a href="#" className="btn btn-icon"><i className="ti ti-send"></i></a>
									</div>
								</div>
							</div>
						</div>
					</div>
					{/*  end col   */}
				</div>
				{/*  end row  */}

			
    </div>
  );
}
