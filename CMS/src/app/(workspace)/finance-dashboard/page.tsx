'use client';

import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Link } from "@/src/lib/router-compat";

const Chart = lazy(() => import("react-apexcharts"));

export default function FinanceDashboardPage() {

	// Reimbursement Mini Sparkline (height: 45)
	const reimbursementSparkOptions: ApexCharts.ApexOptions = useMemo(() => ({
		chart: { height: 45, type: 'bar', sparkline: { enabled: true } },
		colors: ['#FF6F28'],
		plotOptions: { bar: { columnWidth: '50%', borderRadius: 2 } }
	}), []);
	const reimbursementSparkSeries = useMemo(() => [{ name: 'Reimbursement', data: [15, 22, 18, 25, 30, 22, 28] }], []);

	// Headcount Bar (height: 240)
	const headcountBarOptions: ApexCharts.ApexOptions = useMemo(() => ({
		chart: { height: 240, type: 'bar', toolbar: { show: false } },
		colors: ['#1B84FF'],
		plotOptions: { bar: { columnWidth: '45%', borderRadius: 3 } },
		xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] }
	}), []);
	const headcountBarSeries = useMemo(() => [{ name: 'Headcount', data: [45, 52, 58, 65, 72, 78] }], []);

	// Cost Semi-Donut (height: 200) matching SmartHR cost_chart
	const costDonutOptions: ApexCharts.ApexOptions = useMemo(() => ({
		chart: { height: 200, type: 'donut', toolbar: { show: false } },
		plotOptions: {
			pie: {
				startAngle: -90,
				endAngle: 90,
				offsetY: 10,
				donut: {
					size: '75%',
					labels: {
						show: true,
						total: {
							show: true,
							label: 'Total Cost',
							fontSize: '11px',
							fontWeight: 500,
							color: '#94a3b8',
							offsetY: -10,
							formatter: () => 'Total Cost'
						},
						value: {
							show: true,
							fontSize: '18px',
							fontWeight: 700,
							color: '#f8fafc',
							offsetY: 6,
							formatter: () => '$2,458,900'
						}
					}
				}
			}
		},
		colors: ['#3b82f6', '#10b981', '#06b6d4', '#f59e0b', '#8b5cf6', '#ec4899'],
		labels: ['Salaries', 'Benefits', 'Bonuses', 'Overtime', 'Training', 'Incentives'],
		legend: { show: false },
		dataLabels: { enabled: false },
		stroke: { width: 3, colors: ['#ffffff'] }
	}), []);
	const costDonutSeries = useMemo(() => [40, 10, 10, 20, 10, 10], []);

	// Budget Area Chart (height: 280)
	const budgetAreaOptions: ApexCharts.ApexOptions = useMemo(() => ({
		chart: { height: 280, type: 'area', toolbar: { show: false } },
		stroke: { curve: 'smooth', width: 2 },
		colors: ['#03C95A', '#FF6F28'],
		xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] }
	}), []);
	const budgetAreaSeries = useMemo(() => [
		{ name: 'Allocated', data: [50, 60, 70, 80, 75, 85] },
		{ name: 'Spent', data: [40, 45, 55, 65, 60, 70] }
	], []);

	// Finance Stacked Bar (height: 140)
	const financeStackedOptions: ApexCharts.ApexOptions = useMemo(() => ({
		chart: { height: 140, type: 'bar', stacked: true, toolbar: { show: false } },
		colors: ['#0d6efd', '#f59e0b'],
		plotOptions: { bar: { columnWidth: '50%', borderRadius: 2 } },
		xaxis: { categories: ['Q1', 'Q2', 'Q3', 'Q4'] }
	}), []);
	const financeStackedSeries = useMemo(() => [
		{ name: 'Revenue', data: [120, 150, 180, 210] },
		{ name: 'Expenses', data: [80, 95, 110, 130] }
	], []);

	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);


	const payrollPaymentOptions: ApexCharts.ApexOptions = useMemo(
		() => ({
			chart: {
				type: 'bar',
				height: 45,
				stacked: true,
				stackType: '100%',
				toolbar: { show: false },
				sparkline: { enabled: true }
			},
			plotOptions: {
				bar: {
					horizontal: true,
					barHeight: '100%',
					borderRadius: 4,
				},
			},
			colors: ['#FF6F28', '#E5E7EB'],
			tooltip: { enabled: true },
		}),
		[]
	);

	const payrollPaymentSeries = useMemo(() => [
		{ name: 'Payroll', data: [600] },
		{ name: 'Remaining', data: [1000] },
	], []);

	return (
		<div className="dashboard-scope w-full">
			{/*  Breadcrumb  */}
			<div className="d-flex align-items-center justify-content-between flex-wrap mb-3">
				<div className="my-auto mb-2">
					<h2 className="mb-1">Finance Dashboard</h2>
					<nav>
						<ol className="breadcrumb mb-0">
							<li className="breadcrumb-item">
								<a href="https://smarthr.dreamstechnologies.com/hrm/html/index.html"><i className="ti ti-smart-home"></i></a>
							</li>
							<li className="breadcrumb-item">
								Dashboard
							</li>
							<li className="breadcrumb-item active" aria-current="page">Finance Dashboard</li>
						</ol>
					</nav>
				</div>
				<div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-3 mb-2">
					<div className="input-icon position-relative">
						<span className="input-icon-addon">
							<i className="ti ti-calendar text-gray-9"></i>
						</span>
						<input type="text" className="form-control date-range bookingrange"
							placeholder="dd/mm/yyyy - dd/mm/yyyy" />
					</div>
					<a href="#" className="btn btn-primary d-inline-flex align-items-center"><i
						className="ti ti-file-export me-1"></i>Export CSV</a>
					<div className="mt-2 head-icons">
						<a href="#" onClick={(e) => e.preventDefault()} className="" data-bs-toggle="tooltip" data-bs-placement="top"
							data-bs-original-title="Collapse" id="collapse-header">
							<i className="ti ti-chevrons-up"></i>
						</a>
					</div>
				</div>
			</div>
			{/*  /Breadcrumb  */}

			{/*  start row  */}
			<div className="row">

				<div className="col-xl-6 d-flex">
					<div className="card flex-fill">
						<div className="card-body">
							<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
								<div className="avatar drop-shadow-xs border border-white avatar-rounded z-1">
									<img src="/assets/img/icons/title-icon-01.svg" alt="icon"
										className="img-fluid w-auto h-auto rounded-0" />
									<img src="/assets/img/bg/title-bg-01.png" alt="bg"
										className="position-absolute top-0 start-0 title-bg z-n1 rounded-0" />
								</div>
								<a href="https://smarthr.dreamstechnologies.com/hrm/html/budgets.html"
									className="btn btn-icon d-inline-flex align-items-center justify-content-center btn-light rounded-circle"><i
										className="ti ti-arrow-up-right"></i></a>
							</div>
							<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
								<div>
									<p className="mb-1">Budget Remaining</p>
									<h2 className="d-inline-flex align-items-center">$2,458,900 <span
										className="btn btn-icon d-inline-flex align-items-center justify-content-center btn-xs bg-success text-white pe-none rounded-circle ms-2"><i
											className="ti ti-caret-up-filled"></i></span></h2>
								</div>
								<div>
									<span className="border rounded-pill d-inline-flex align-items-center py-1 px-2"><i
										className="ti ti-calendar-stats me-1"></i>Updated : 15 Jan 2025</span>
								</div>
							</div>
							<div className="row g-2">
								<div className="col-5">
									<p className="fs-12 text-dark mb-1">Salary Budget</p>
									<div className="progress progress-xl mb-1" role="progressbar" aria-valuenow={10}
										aria-valuemin={0} aria-valuemax={100}>
										<div className="progress-bar progress-bar-striped" style={{ width: "100%" }}>
										</div>
									</div>
									<p className="mb-0">$1,229,450</p>
								</div>
								<div className="col-3">
									<p className="fs-12 text-dark mb-1">Benefits</p>
									<div className="progress progress-xl mb-1" role="progressbar" aria-valuenow={10}
										aria-valuemin={0} aria-valuemax={100}>
										<div className="progress-bar progress-bar-striped bg-secondary"
											style={{ width: "100%" }}>
										</div>
									</div>
									<p className="mb-0">$491,780</p>
								</div>
								<div className="col-4">
									<p className="fs-12 text-dark mb-1">HR Operations</p>
									<div className="progress progress-xl mb-1" role="progressbar" aria-valuenow={10}
										aria-valuemin={0} aria-valuemax={100}>
										<div className="progress-bar progress-bar-striped bg-dark" style={{ width: "100%" }}>
										</div>
									</div>
									<p className="mb-0">$737,670</p>
								</div>
							</div>
						</div> {/*  end card body  */}
					</div> {/*  end card  */}
				</div> {/*  end col  */}

				<div className="col-xl-3 col-md-6 d-flex">
					<div className="card z-1 flex-fill overflow-hidden">
						<div className="card-body d-flex flex-column justify-content-between">
							<div>
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
									<div className="avatar drop-shadow-xs border border-white avatar-rounded z-1">
										<img src="/assets/img/icons/title-icon-02.svg" alt="icon"
											className="img-fluid w-auto h-auto rounded-0" />
										<img src="/assets/img/bg/title-bg-02.png" alt="bg"
											className="position-absolute top-0 start-0 title-bg z-n1 rounded-0" />
									</div>
									<a href="#"
										className="btn btn-icon d-inline-flex align-items-center justify-content-center btn-light rounded-circle"><i
											className="ti ti-refresh"></i></a>
								</div>
								<div className="mb-4">
									<p className="mb-1">Total Payroll</p>
									<h2 className="mb-0 d-inline-flex align-items-center">$2,458,900 <span
										className="btn btn-icon d-inline-flex align-items-center justify-content-center btn-xs bg-success text-white pe-none rounded-circle ms-2"><i
											className="ti ti-caret-up-filled"></i></span></h2>
								</div>
							</div>
							<div id="payroll-payment">
								{isMounted && (
									<Suspense fallback={<div style={{ height: 45 }} className="d-flex align-items-center justify-content-center text-muted">Loading...</div>}>
										<Chart options={payrollPaymentOptions} series={payrollPaymentSeries} type="bar" height={45} />
									</Suspense>
								)}
							</div>
						</div> {/*  end card body  */}
						<img src="/assets/img/bg/dashboard-bg.png" alt="bg"
							className="img-fluid position-absolute top-0 start-0 z-n1 w-100" />
					</div> {/*  end card  */}
				</div> {/*  end col  */}

				<div className="col-xl-3 col-md-6 d-flex">
					<div className="card z-1 flex-fill overflow-hidden">
						<div className="card-body d-flex flex-column justify-content-between">
							<div>
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
									<div className="avatar drop-shadow-xs border border-white avatar-rounded z-1">
										<img src="/assets/img/icons/title-icon-03.svg" alt="icon"
											className="img-fluid w-auto h-auto rounded-0" />
										<img src="/assets/img/bg/title-bg-03.png" alt="bg"
											className="position-absolute top-0 start-0 title-bg z-n1 rounded-0" />
									</div>
									<a href="#"
										className="btn btn-icon d-inline-flex align-items-center justify-content-center btn-light rounded-circle"><i
											className="ti ti-refresh"></i></a>
								</div>
								<div className="mb-4">
									<p className="mb-1">Reimbrusement</p>
									<h2 className="mb-0 d-inline-flex align-items-center">$124,200 <span
										className="btn btn-icon d-inline-flex align-items-center justify-content-center btn-xs bg-danger text-white pe-none rounded-circle ms-2"><i
											className="ti ti-caret-down-filled"></i></span></h2>
								</div>
							</div>
							<div id="reimbrusement-chart" className="mt-auto">
								{isMounted && (
									<Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
										<Chart options={reimbursementSparkOptions} series={reimbursementSparkSeries} type="bar" height={45} width="100%" />
									</Suspense>
								)}
							</div>
						</div> {/*  end card body  */}
						<img src="/assets/img/bg/attendance-bg.png" alt="bg"
							className="img-fluid position-absolute top-0 start-0 z-n1 w-100" />
					</div> {/*  end card  */}
				</div> {/*  end col  */}

			</div>
			{/*  end row  */}

			{/*  start row  */}
			<div className="row">

				<div className="col-xl-8 d-flex">
					<div className="card flex-fill">
						<div className="card-body pb-0">
							<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
								<h2 className="card-title mb-0 text-decoration-underline">Headcount vs Payroll Growth
								</h2>
								<div className="d-flex align-items-center gap-3">
									<p className="mb-0"><i className="ti ti-square-filled text-primary me-2"></i>Payroll
										Growth</p>
									<p className="mb-0"><i className="ti ti-square-filled text-gray-2 me-2"></i>Head Count
									</p>
								</div>
								<a href="#"
									className="btn btn-icon d-inline-flex align-items-center justify-content-center btn-light rounded-circle"><i
										className="ti ti-download"></i></a>
							</div>
							<div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
								<div>
									<h3 className="main-title mb-1">+14%</h3>
									<p className="mb-0">Increased From the Last Quarter</p>
								</div>
								<div className="dropdown">
									<a href="#" onClick={(e) => e.preventDefault()}
										className="btn btn-white btn-sm d-inline-flex align-items-center rounded-pill"
										data-bs-toggle="dropdown">
										<i className="ti ti-calendar-due me-1"></i>1st Quarter
									</a>
									<ul className="dropdown-menu mt-2 p-3">
										<li>
											<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">
												1st Quarter
											</a>
										</li>
										<li>
											<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">
												2nd Quarter
											</a>
										</li>
										<li>
											<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">
												3rd Quarter
											</a>
										</li>
										<li>
											<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">
												4th Quarter
											</a>
										</li>
									</ul>
								</div>
							</div>
							<div id="headcount-chart">
								{isMounted && (
									<Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
										<Chart options={headcountBarOptions} series={headcountBarSeries} type="bar" height={240} width="100%" />
									</Suspense>
								)}
							</div>
						</div> {/*  end card body  */}
					</div> {/*  end card  */}
				</div> {/*  end col  */}

				<div className="col-xl-4 d-flex">
					<div className="card flex-fill">
						<div className="card-body">
							<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
								<h2 className="card-title mb-0 text-decoration-underline">HR Cost Breakdown</h2>
								<a href="#"
									className="btn btn-icon d-inline-flex align-items-center justify-content-center btn-light rounded-circle"><i
										className="ti ti-refresh"></i></a>
							</div>
							<div className="mb-2">
								<div className="chart-canvas-wrapper" style={{ minHeight: "200px" }}>
									{isMounted && (
										<Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
											<Chart options={costDonutOptions} series={costDonutSeries} type="donut" height={200} width="100%" />
										</Suspense>
									)}
								</div>
							</div>

							<div className="row g-3">
								<div className="col-6 col-sm-4">
									<div className="border-start border-2 border-primary/50 ps-2">
										<p className="fs-12 mb-1 text-muted-foreground">Salaries</p>
										<h3 className="fs-14 mb-0 text-foreground">184K</h3>
									</div>
								</div>
								<div className="col-6 col-sm-4">
									<div className="border-start border-2 border-emerald-500/50 ps-2">
										<p className="fs-12 mb-1 text-muted-foreground">Benefits</p>
										<h3 className="fs-14 mb-0 text-foreground">89K</h3>
									</div>
								</div>
								<div className="col-6 col-sm-4">
									<div className="border-start border-2 border-cyan-500/50 ps-2">
										<p className="fs-12 mb-1 text-muted-foreground">Bonuses</p>
										<h3 className="fs-14 mb-0 text-foreground">66K</h3>
									</div>
								</div>
								<div className="col-6 col-sm-4">
									<div className="border-start border-2 border-amber-500/50 ps-2">
										<p className="fs-12 mb-1 text-muted-foreground">Overtime</p>
										<h3 className="fs-14 mb-0 text-foreground">96K</h3>
									</div>
								</div>
								<div className="col-6 col-sm-4">
									<div className="border-start border-2 border-purple-500/50 ps-2">
										<p className="fs-12 mb-1 text-muted-foreground">Training</p>
										<h3 className="fs-14 mb-0 text-foreground">42K</h3>
									</div>
								</div>
								<div className="col-6 col-sm-4">
									<div className="border-start border-2 border-rose-500/50 ps-2">
										<p className="fs-12 mb-1 text-muted-foreground">Incentives</p>
										<h3 className="fs-14 mb-0 text-foreground">56K</h3>
									</div>
								</div>
							</div>
						</div> {/*  end card body  */}
					</div> {/*  end card  */}
				</div> {/*  end col  */}

			</div>

			{/*  start row  */}
			<div className="row">

				<div className="col-xxl-4 col-xl-5 d-flex">
					<div className="card flex-fill">
						<div className="card-body d-flex flex-column justify-content-between">
							<div>
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
									<div className="d-flex align-items-center">
										<div
											className="avatar drop-shadow-xs border border-white avatar-rounded z-1 me-2">
											<img src="/assets/img/icons/title-icon-04.svg" alt="icon"
												className="img-fluid w-auto h-auto" />
											<img src="/assets/img/bg/title-bg-04.png" alt="icon"
												className="position-absolute top-0 start-0 title-bg z-n1" />
										</div>
										<div>
											<h2 className="sub-title mb-1">How can i help today</h2>
											<p className="fs-13 mb-0">AI HR Finance Assistant</p>
										</div>
									</div>
									<a href="#"
										className="btn btn-icon d-inline-flex align-items-center justify-content-center btn-light rounded-circle"><i
											className="ti ti-refresh"></i></a>
								</div>
								<div className="card bg-light border-0 shadow-none rounded-4 mb-1">
									<div className="card-body">
										<span className="d-flex align-items-center gap-1 mb-2 text-primary"> <i
											className="ti ti-sparkles"></i> AI Assistant</span>
										<p className="mb-0">👋 Hi! I'm your AI HR Finance Assistant. I can help you
											analyze payroll costs, forecast budgets, identify compensation trends.
										</p>
									</div>
								</div>
							</div>
							<div className="chat-input-item bg-white dark:bg-slate-800/80 border border-border/60 w-100 rounded-3 mt-3">
								<input type="text" className="form-control"
									placeholder="Ask me anything about Finance...." />
								<button type="submit" className="btn btn-dark btn-icon rounded-3"><i
									className="ti ti-send"></i></button>
							</div>
						</div>
					</div>
				</div>

				<div className="col-xxl-8 col-xl-7 d-flex">
					<div className="card flex-fill">
						<div className="card-body pb-0">
							<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
								<h2 className="card-title mb-0 text-decoration-underline">Department Budget vs Actual
								</h2>
								<a href="#"
									className="btn btn-icon d-inline-flex align-items-center justify-content-center btn-light rounded-circle"><i
										className="ti ti-download"></i></a>
							</div>
							<div id="budget-chart">
								{isMounted && (
									<Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
										<Chart options={budgetAreaOptions} series={budgetAreaSeries} type="area" height={280} width="100%" />
									</Suspense>
								)}
							</div>
						</div> {/*  end card body  */}
					</div> {/*  end card  */}
				</div> {/*  end col  */}

			</div>

			{/*  start row  */}
			<div className="row">

				<div className="col-xxl-6 d-flex">
					<div className="card flex-fill">
						<div className="card-body">
							<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
								<div className="d-flex align-items-center gap-2 flex-wrap">
									<h2 className="card-title mb-0 text-decoration-underline">Financial Health</h2>
									<div className="dropdown">
										<a href="#" onClick={(e) => e.preventDefault()}
											className="btn btn-white btn-sm d-inline-flex align-items-center rounded-pill"
											data-bs-toggle="dropdown">
											<i className="ti ti-calendar-due me-1"></i>Yearly
										</a>
										<ul className="dropdown-menu mt-2 p-3">
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">
													Monthly
												</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">
													Yearly
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
								<a href="#"
									className="btn btn-icon d-inline-flex align-items-center justify-content-center btn-light rounded-circle"><i
										className="ti ti-download"></i></a>
							</div>
							<div className="d-sm-flex align-items-end gap-3 justify-content-between">
								<div id="finance-chart" className="w-100 mb-sm-0 mb-2">
									{isMounted && (
										<Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
											<Chart options={financeStackedOptions} series={financeStackedSeries} type="bar" height={140} width="100%" />
										</Suspense>
									)}
								</div>
								<div className="flex-shrink-0 text-sm-end">
									<p className="mb-1">Total Amount</p>
									<h2 className="main-title mb-3">$4,56,545</h2>
									<p className="fs-12"><span
										className="badge bg-success d-inline-flex align-items-center me-1"><i
											className="ti ti-arrow-up-right me-1"></i>2.5%</span> vs Last Year</p>
								</div>
							</div>
						</div> {/*  end card body  */}
					</div> {/*  end card  */}
				</div> {/*  end col  */}

				<div className="col-xxl-3 col-md-6 d-flex">
					<div className="card bg-secondary z-1 overflow-hidden flex-fill">
						<div className="card-body d-flex flex-column justify-content-between">
							<div>
								<h2 className="card-title text-decoration-underline text-white mb-2">Payroll Forecast
								</h2>
								<p className="text-white mb-3">Upgrade to Payroll Forecasting to predict upcoming salary
									expenses, optimize cash flow, and make confident financial decisions.</p>
							</div>
							<a href="#" className="btn btn-xl btn-primary w-100">Upgrade Now</a>
						</div> {/*  end card body  */}
						<img src="/assets/img/bg/payroll-bg.png" alt="bg"
							className="img-fluid position-absolute top-0 start-0 h-100 w-100 z-n1 blend-luminosity" />
					</div> {/*  end card  */}
				</div> {/*  end col  */}

				<div className="col-xxl-3 col-md-6 d-flex">
					<div className="card flex-fill">
						<div className="card-body">
							<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
								<h2 className="card-title mb-0 text-decoration-underline">Pending Payments</h2>
								<a href="#"
									className="btn btn-icon d-inline-flex align-items-center justify-content-center btn-light rounded-circle"><i
										className="ti ti-download"></i></a>
							</div>
							<div className="d-flex align-items-center justify-content-between mb-3">
								<p className="mb-0">Total Amount</p>
								<h3 className="card-title mb-0">$69856</h3>
							</div>
							<div className="avatar-list-stacked avatar-group mb-3">
								<a href="#" className="avatar avatar-rounded">
									<img className="border border-white" src="/assets/img/users/user-31.jpg" alt="user" />
								</a>
								<a href="#" className="avatar avatar-rounded">
									<img className="border border-white" src="/assets/img/users/user-32.jpg" alt="user" />
								</a>
								<a href="#" className="avatar avatar-rounded">
									<img className="border border-white" src="/assets/img/users/user-29.jpg" alt="user" />
								</a>
								<a href="#" className="avatar avatar-rounded">
									<img className="border border-white" src="/assets/img/users/user-56.jpg" alt="user" />
								</a>
								<a className="avatar bg-light border avatar-rounded fs-16 text-dark fw-normal" href="#">
									+9
								</a>
							</div>
							<a href="#" className="btn btn-dark d-flex align-items-center justify-content-center"><i
								className="ti ti-moneybag me-1"></i>Transfer Now</a>
						</div> {/*  end card body  */}
					</div> {/*  end card  */}
				</div> {/*  end col  */}

			</div>
			{/*  end row  */}

			{/*  start row  */}
			<div className="row">

				<div className="col-xl-12">
					<div className="card flex-fill">
						<div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
							<h2 className="mb-0 card-title text-decoration-underline">Recent HR Transactions</h2>
							<a href="https://smarthr.dreamstechnologies.com/hrm/html/payments.html" className="btn btn-md btn-primary">View All</a>
						</div>
						<div className="card-body p-0">
							<div className="table-responsive">
								<table className="table table-nowrap table-striped mb-0">
									<thead>
										<tr>
											<th>Transaction ID</th>
											<th>Employee</th>
											<th>Catgeory</th>
											<th>Amount</th>
											<th>Date</th>
											<th>Status</th>
											<th></th>
										</tr>
									</thead>
									<tbody>
										<tr>
											<td><a href="https://smarthr.dreamstechnologies.com/hrm/html/invoice-details.html">TRX565545878</a></td>
											<td>
												<div className="d-flex align-items-center">
													<a href="https://smarthr.dreamstechnologies.com/hrm/html/employee-details.html"
														className="avatar avatar-md border avatar-rounded">
														<img src="/assets/img/users/user-32.jpg" className="img-fluid"
															alt="employee" />
													</a>
													<div className="ms-2">
														<p className="fw-medium mb-0"><a
															href="https://smarthr.dreamstechnologies.com/hrm/html/employee-details.html">Anthony Lewis</a></p>
													</div>
												</div>
											</td>
											<td>Bonus</td>
											<td className="text-dark">$15,000</td>
											<td><i className="ti ti-calendar-up me-1"></i><span className="text-dark">Jan
												06, 2026</span></td>
											<td>
												<span className="badge badge-success-transparent">Approved</span>
											</td>
											<td>
												<div className="action-icon d-inline-flex">
													<a href="#" className="me-2"><i className="ti ti-printer"></i></a>
													<a href="#" onClick={(e) => e.preventDefault()} data-bs-toggle="modal"
														data-bs-target="#delete_modal"><i
															className="ti ti-trash"></i></a>
												</div>
											</td>
										</tr>
										<tr>
											<td><a href="https://smarthr.dreamstechnologies.com/hrm/html/invoice-details.html">TRX654412454</a></td>
											<td>
												<div className="d-flex align-items-center">
													<a href="https://smarthr.dreamstechnologies.com/hrm/html/employee-details.html"
														className="avatar avatar-md border avatar-rounded">
														<img src="/assets/img/users/user-09.jpg" className="img-fluid"
															alt="employee" />
													</a>
													<div className="ms-2">
														<p className="fw-medium mb-0"><a
															href="https://smarthr.dreamstechnologies.com/hrm/html/employee-details.html">Brian Villalobos</a>
														</p>
													</div>
												</div>
											</td>
											<td>Training</td>
											<td className="text-dark">$2,500</td>
											<td><i className="ti ti-calendar-up me-1"></i><span className="text-dark">Jan
												05, 2026</span></td>
											<td>
												<span className="badge badge-pink-transparent">Pending</span>
											</td>
											<td>
												<div className="action-icon d-inline-flex">
													<a href="#" className="me-2"><i className="ti ti-printer"></i></a>
													<a href="#" onClick={(e) => e.preventDefault()} data-bs-toggle="modal"
														data-bs-target="#delete_modal"><i
															className="ti ti-trash"></i></a>
												</div>
											</td>
										</tr>
										<tr>
											<td><a href="https://smarthr.dreamstechnologies.com/hrm/html/invoice-details.html">TRX552145547</a></td>
											<td>
												<div className="d-flex align-items-center">
													<a href="https://smarthr.dreamstechnologies.com/hrm/html/employee-details.html"
														className="avatar avatar-md border avatar-rounded">
														<img src="/assets/img/users/user-01.jpg" className="img-fluid"
															alt="employee" />
													</a>
													<div className="ms-2">
														<p className="fw-medium mb-0"><a
															href="https://smarthr.dreamstechnologies.com/hrm/html/employee-details.html">Harvey Smith</a></p>
													</div>
												</div>
											</td>
											<td>Commission</td>
											<td className="text-dark">$124,500</td>
											<td><i className="ti ti-calendar-up me-1"></i><span className="text-dark">Jan
												04, 2026</span></td>
											<td>
												<span className="badge badge-purple-transparent">Processing</span>
											</td>
											<td>
												<div className="action-icon d-inline-flex">
													<a href="#" className="me-2"><i className="ti ti-printer"></i></a>
													<a href="#" onClick={(e) => e.preventDefault()} data-bs-toggle="modal"
														data-bs-target="#delete_modal"><i
															className="ti ti-trash"></i></a>
												</div>
											</td>
										</tr>
										<tr>
											<td><a href="https://smarthr.dreamstechnologies.com/hrm/html/invoice-details.html">TRX254124457</a></td>
											<td>
												<div className="d-flex align-items-center">
													<a href="https://smarthr.dreamstechnologies.com/hrm/html/employee-details.html"
														className="avatar avatar-md border avatar-rounded">
														<img src="/assets/img/users/user-33.jpg" className="img-fluid"
															alt="employee" />
													</a>
													<div className="ms-2">
														<p className="fw-medium mb-0"><a
															href="https://smarthr.dreamstechnologies.com/hrm/html/employee-details.html">Stephan Peralt</a></p>
													</div>
												</div>
											</td>
											<td>Reimbursement</td>
											<td className="text-dark">$1,250</td>
											<td><i className="ti ti-calendar-up me-1"></i><span className="text-dark">Jan
												03, 2026</span></td>
											<td>
												<span className="badge badge-pink-transparent">Pending</span>
											</td>
											<td>
												<div className="action-icon d-inline-flex">
													<a href="#" className="me-2"><i className="ti ti-printer"></i></a>
													<a href="#" onClick={(e) => e.preventDefault()} data-bs-toggle="modal"
														data-bs-target="#delete_modal"><i
															className="ti ti-trash"></i></a>
												</div>
											</td>
										</tr>
										<tr>
											<td><a href="https://smarthr.dreamstechnologies.com/hrm/html/invoice-details.html">TRX124512442</a></td>
											<td>
												<div className="d-flex align-items-center">
													<a href="https://smarthr.dreamstechnologies.com/hrm/html/employee-details.html"
														className="avatar avatar-md border avatar-rounded">
														<img src="/assets/img/users/user-34.jpg" className="img-fluid"
															alt="employee" />
													</a>
													<div className="ms-2">
														<p className="fw-medium mb-0"><a
															href="https://smarthr.dreamstechnologies.com/hrm/html/employee-details.html">Doglas Martini</a></p>
													</div>
												</div>
											</td>
											<td>Payroll</td>
											<td className="text-dark">$782,000</td>
											<td><i className="ti ti-calendar-up me-1"></i><span className="text-dark">Jan
												02, 2026</span></td>
											<td>
												<span className="badge badge-secondary-transparent">Processed</span>
											</td>
											<td>
												<div className="action-icon d-inline-flex">
													<a href="#" className="me-2"><i className="ti ti-printer"></i></a>
													<a href="#" onClick={(e) => e.preventDefault()} data-bs-toggle="modal"
														data-bs-target="#delete_modal"><i
															className="ti ti-trash"></i></a>
												</div>
											</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div> {/*  end card body  */}
					</div> {/*  end card  */}
				</div> {/*  end col  */}
			</div>
			{/*  end row  */}


		</div>
	);
}
