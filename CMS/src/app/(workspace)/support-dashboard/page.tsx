'use client';

import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Link } from "@/src/lib/router-compat";

const Chart = lazy(() => import("react-apexcharts"));

export default function SupportDashboardPage() {

	// Support Ticket Trends (height: 220)
	const ticketTrendsOptions: ApexCharts.ApexOptions = useMemo(() => ({
		chart: { height: 220, type: 'area', toolbar: { show: false } },
		stroke: { curve: 'smooth', width: 2 },
		colors: ['#0d6efd', '#10b981'],
		xaxis: { categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }
	}), []);
	const ticketTrendsSeries = useMemo(() => [
		{ name: 'Opened', data: [35, 45, 40, 55, 60, 48, 52] },
		{ name: 'Resolved', data: [30, 40, 42, 50, 58, 45, 50] }
	], []);

	// Ticket Status Bar (height: 220)
	const ticketStatusOptions: ApexCharts.ApexOptions = useMemo(() => ({
		chart: { height: 220, type: 'bar', toolbar: { show: false } },
		plotOptions: { bar: { columnWidth: '45%', borderRadius: 4 } },
		colors: ['#03C95A'],
		xaxis: { categories: ['Open', 'In Progress', 'Pending', 'Closed'] }
	}), []);
	const ticketStatusSeries = useMemo(() => [{ name: 'Tickets', data: [28, 42, 18, 95] }], []);

	// SLA Compliance Radial Gauge (height: 230) matching SmartHR
	const slaComplianceOptions: ApexCharts.ApexOptions = useMemo(() => ({
		chart: { height: 230, type: 'radialBar', sparkline: { enabled: true } },
		colors: ['#F26522'],
		plotOptions: {
			radialBar: {
				startAngle: -110,
				endAngle: 250,
				hollow: { size: '62%' },
				track: { background: 'rgba(255, 255, 255, 0.08)', strokeWidth: '100%' },
				dataLabels: {
					name: { show: false },
					value: {
						fontSize: '24px',
						fontWeight: 600,
						color: '#f8fafc',
						offsetY: 0,
						formatter: (val: any) => `${Number(val).toFixed(1)}%`
					}
				}
			}
		},
		stroke: { lineCap: 'round' }
	}), []);
	const slaComplianceSeries = useMemo(() => [80.5], []);

	// Backlog Growth Line (height: 220)
	const backlogGrowthOptions: ApexCharts.ApexOptions = useMemo(() => ({
		chart: { height: 220, type: 'line', toolbar: { show: false } },
		stroke: { curve: 'straight', width: 2 },
		colors: ['#FF6F28'],
		xaxis: { categories: ['Week 1', 'Week 2', 'Week 3', 'Week 4'] }
	}), []);
	const backlogGrowthSeries = useMemo(() => [{ name: 'Backlog', data: [14, 18, 12, 9] }], []);

	// Tickets by Category Semi-Donut (height: 200) matching SmartHR ticket-category
	const ticketCategoryOptions: ApexCharts.ApexOptions = useMemo(() => ({
		chart: { height: 200, type: 'donut', toolbar: { show: false } },
		plotOptions: {
			pie: {
				startAngle: -90,
				endAngle: 90,
				offsetY: 10,
				donut: {
					size: '72%',
					labels: { show: false }
				}
			}
		},
		colors: ['#F68B4A', '#6E8F99', '#45C676', '#F2BE1A', '#4C8DFF', '#E53935'],
		labels: ['IT Support', 'HR', 'Payroll', 'Access', 'Hardware', 'Other'],
		legend: { show: false },
		dataLabels: { enabled: false },
		stroke: { width: 3, colors: ['#ffffff'] }
	}), []);
	const ticketCategorySeries = useMemo(() => [30, 12, 10, 18, 8, 12], []);

	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	return (
		<div className="dashboard-scope w-full">
			{/*  Breadcrumb  */}
			<div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
				<div className="my-auto mb-2">
					<h2 className="mb-1">Help Desk Dashboard</h2>
					<nav>
						<ol className="breadcrumb mb-0">
							<li className="breadcrumb-item">
								<a href="index.html"><i className="ti ti-smart-home"></i></a>
							</li>
							<li className="breadcrumb-item">
								Dashboard
							</li>
							<li className="breadcrumb-item active" aria-current="page">Help Desk Dashboard</li>
						</ol>
					</nav>
				</div>
				<div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
					<a href="#" className="btn btn-white me-2 mb-2"> <i className="ti ti-user"></i> Assign Agent</a>
					<a href="#" className="btn btn-secondary me-2 mb-2"> <i className="ti ti-clock-check"></i> Close
						Ticket</a>
					<a href="#" className="btn btn-primary-gradient mb-2"> <i className="ti ti-plus"></i> Create Ticket</a>
					<div className="ms-2 mb-2 head-icons">
						<a href="#" onClick={(e) => e.preventDefault()} className="" data-bs-toggle="tooltip" data-bs-placement="top"
							data-bs-original-title="Collapse" id="collapse-header">
							<i className="ti ti-chevrons-up"></i>
						</a>
					</div>
				</div>
			</div>
			{/*  /Breadcrumb  */}

			{/*  Processing  */}
			<div className="row">
				<div className="col-xl-2 col-lg-4 col-md-6">
					<div className="card shadow-none ticket-card bg-primary-transparent card-1">
						<div className="card-body">
							<div className="d-inline-flex flex-column gap-3">
								<div className="avatar avatar-lg bg-primary rounded-3 flex-shrink-0">
									<i className="ti ti-users-plus text-white fs-24"></i>
								</div>
								<p className="mb-0 text-gray-6">Total Tickets</p>
								<h2 className="mb-0">2,847</h2>
								<div>
									<div
										className="rounded-pill bg-light fs-13 text-gray-9 d-inline-flex align-items-center gap-2 p-2px ps-2">
										+12.5%
										<p
											className="btn pe-none btn-sm btn-icon bg-success rounded-circle d-flex align-items-center justify-content-center text-white">
											<i className="ti ti-arrow-up-right fs-20 "></i>
										</p>
									</div>
								</div>
							</div>
						</div>
						<span className="bg-primary"></span>
					</div>
				</div>
				<div className="col-xl-2 col-lg-4 col-md-6">
					<div className="card shadow-none ticket-card bg-secondary-transparent card-2">
						<div className="card-body">
							<div className="d-inline-flex flex-column gap-3">
								<div className="avatar avatar-lg bg-secondary rounded-3 flex-shrink-0">
									<i className="ti ti-users-plus text-white fs-24"></i>
								</div>
								<p className="mb-0 text-gray-6">Open Tickets</p>
								<h2 className="mb-0">342</h2>
								<div>
									<div
										className="rounded-pill bg-light fs-13 text-gray-9 d-inline-flex align-items-center gap-2 p-2px ps-2">
										+8.2%
										<p
											className="btn btn-sm pe-none btn-icon bg-success rounded-circle d-flex align-items-center justify-content-center text-white">
											<i className="ti ti-arrow-up-right fs-20 "></i>
										</p>
									</div>
								</div>
							</div>
						</div>
						<span className="bg-secondary"></span>
					</div>
				</div>
				<div className="col-xl-2 col-lg-4 col-md-6">
					<div className="card shadow-none ticket-card bg-success-transparent card-3">
						<div className="card-body">
							<div className="d-inline-flex flex-column gap-3">
								<div className="avatar avatar-lg bg-success rounded-3 flex-shrink-0">
									<i className="ti ti-users-plus text-white fs-24"></i>
								</div>
								<p className="mb-0 text-gray-6">Resolved Today</p>
								<h2 className="mb-0">128</h2>
								<div>
									<div
										className="rounded-pill bg-light fs-13 text-gray-9 d-inline-flex align-items-center gap-2 p-2px ps-2">
										+15.5%
										<p
											className="btn pe-none btn-sm btn-icon bg-success rounded-circle d-flex align-items-center justify-content-center text-white">
											<i className="ti ti-arrow-up-right fs-20 "></i>
										</p>
									</div>
								</div>
							</div>
						</div>
						<span className="bg-success"></span>
					</div>
				</div>
				<div className="col-xl-2 col-lg-4 col-md-6">
					<div className="card shadow-none ticket-card bg-info-transparent card-4">
						<div className="card-body">
							<div className="d-inline-flex flex-column gap-3">
								<div className="avatar avatar-lg bg-info rounded-3 flex-shrink-0">
									<i className="ti ti-users-plus text-white fs-24"></i>
								</div>
								<p className="mb-0 text-gray-6">Avg Time</p>
								<h2 className="mb-0">2.4h</h2>
								<div>
									<div
										className="rounded-pill bg-light fs-13 text-gray-9 d-inline-flex align-items-center gap-2 p-2px ps-2">
										+12.3%
										<p
											className="btn pe-none btn-sm btn-icon bg-success rounded-circle d-flex align-items-center justify-content-center text-white">
											<i className="ti ti-arrow-up-right fs-20 "></i>
										</p>
									</div>
								</div>
							</div>
						</div>
						<span className="bg-info"></span>
					</div>
				</div>
				<div className="col-xl-2 col-lg-4 col-md-6">
					<div className="card shadow-none border-0 ticket-card bg-danger-transparent card-5">
						<div className="card-body">
							<div className="d-inline-flex flex-column gap-3">
								<div className="avatar avatar-lg bg-danger rounded-3 flex-shrink-0">
									<i className="ti ti-users-plus text-white fs-24"></i>
								</div>
								<p className="mb-0 text-gray-6">Overdue</p>
								<h2 className="mb-0">23</h2>
								<div>
									<div
										className="rounded-pill bg-light fs-13 text-gray-9 d-inline-flex align-items-center gap-2 p-2px ps-2">
										-5.2%
										<p
											className="btn pe-none btn-sm btn-icon bg-danger rounded-circle d-flex align-items-center justify-content-center text-white">
											<i className="ti ti-arrow-down-right fs-20 "></i>
										</p>
									</div>
								</div>
							</div>
						</div>
						<span className="bg-danger"></span>
					</div>
				</div>
				<div className="col-xl-2 col-lg-4 col-md-6">
					<div className="card shadow-none ticket-card bg-pink-transparent card-6">
						<div className="card-body">
							<div className="d-inline-flex flex-column gap-3">
								<div className="avatar avatar-lg bg-pink rounded-3 flex-shrink-0">
									<i className="ti ti-users-plus text-white fs-24"></i>
								</div>
								<p className="mb-0 text-gray-6">Active Agents</p>
								<h2 className="mb-0">42</h2>
								<div>
									<div
										className="rounded-pill bg-light fs-13 text-gray-9 d-inline-flex align-items-center gap-2 p-2px ps-2">
										+8.2%
										<p
											className="btn pe-none btn-sm btn-icon bg-success rounded-circle d-flex align-items-center justify-content-center text-white">
											<i className="ti ti-arrow-up-right fs-20 "></i>
										</p>
									</div>
								</div>
							</div>
						</div>
						<span className="bg-pink"></span>
					</div>
				</div>
			</div>

			{/*  start row  */}
			<div className="row">
				<div className="col-xxl-6 d-flex">
					{/*  Ticket Trends  */}
					<div className="card flex-fill">
						<div className="card-body">
							<div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-2">
								<h3 className="mb-0 card-title">Ticket Trends</h3>
								<div className="dropdown">
									<a href="#" onClick={(e) => e.preventDefault()}
										className="border btn btn-white btn-md fw-normal d-inline-flex align-items-center justify-content-center rounded gap-1 fw-medium"
										data-bs-toggle="dropdown">
										<i className="ti ti-calendar fs-14"></i> Monthly
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

							<div>
								<div id="ticket-trends">
									{isMounted && (
										<Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
											<Chart options={ticketTrendsOptions} series={ticketTrendsSeries} type="area" height={220} width="100%" />
										</Suspense>
									)}
								</div>
								<div className="d-flex align-items-center justify-content-center gap-3 flex-wrap">
									<p className="d-flex align-items-center gap-1 mb-0 text-dark"> <i
										className="ti ti-circle-filled text-primary fs-14"></i> Created </p>
									<p className="d-flex align-items-center gap-1 mb-0 text-dark"> <i
										className="ti ti-circle-filled text-secondary fs-14"></i> Resolved </p>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div className="col-xxl-6 d-flex">
					{/*  Ticket Trends  */}
					<div className="card flex-fill">
						<div className="card-body">
							<div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
								<h3 className="mb-0 card-title">Tickets By Status</h3>
								<div className="dropdown">
									<a href="#" onClick={(e) => e.preventDefault()}
										className="border btn btn-white btn-md fw-normal d-inline-flex align-items-center justify-content-center rounded gap-1 fw-medium"
										data-bs-toggle="dropdown">
										<i className="ti ti-calendar fs-14"></i> Monthly
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

							<div className="row align-items-center justify-content-center">
								<div className="col-lg-6">
									<div id="ticket-status">
										{isMounted && (
											<Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
												<Chart options={ticketStatusOptions} series={ticketStatusSeries} type="bar" height={220} width="100%" />
											</Suspense>
										)}
									</div>
								</div>
								<div className="col-lg-6">
									<div className="d-flex justify-content-between align-items-center mb-3">
										<p className="mb-0">Total Tickets</p>
										<h2 className="main-title">968</h2>
									</div>
									<div className="d-flex flex-column gap-3">
										<div
											className="bg-light d-flex align-items-center justify-content-between rounded-pill px-3 py-2">
											<p className="mb-0 d-flex align-items-center gap-1"><i
												className="ti ti-square-filled fs-8 text-primary"></i> Open</p>
											<p className="mb-0 fw-semibold text-dark">653</p>
										</div>
										<div
											className="bg-light d-flex align-items-center justify-content-between rounded-pill px-3 py-2">
											<p className="mb-0 d-flex align-items-center gap-1"><i
												className="ti ti-square-filled fs-8 text-info"></i> In Progres</p>
											<p className="mb-0 fw-semibold text-dark">342</p>
										</div>
										<div
											className="bg-light d-flex align-items-center justify-content-between rounded-pill px-3 py-2">
											<p className="mb-0 d-flex align-items-center gap-1"><i
												className="ti ti-square-filled fs-8 text-warning"></i> On Hold</p>
											<p className="mb-0 fw-semibold text-dark">185</p>
										</div>
										<div
											className="bg-light d-flex align-items-center justify-content-between rounded-pill px-3 py-2">
											<p className="mb-0 d-flex align-items-center gap-1"><i
												className="ti ti-square-filled fs-8 text-purple"></i> Closed</p>
											<p className="mb-0 fw-semibold text-dark">67</p>
										</div>
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
				<div className="col-xxl-4 col-xl-6 d-flex">
					<div className="card mb-0 flex-fill">
						<div className="card-body">
							<div className="d-flex align-items-center justify-content-between flex-wrap gap-3 ">
								<h3 className="mb-0 card-title">SLA Compliance</h3>
								<div className="dropdown">
									<a href="#" onClick={(e) => e.preventDefault()}
										className="border btn btn-white btn-md fw-normal d-inline-flex align-items-center justify-content-center rounded gap-1 fw-medium"
										data-bs-toggle="dropdown">
										<i className="ti ti-calendar fs-14"></i> Monthly
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
							<div className="sla-wrapper">
								<div id="sla-compliance">
									{isMounted && (
										<Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
											<Chart options={slaComplianceOptions} series={slaComplianceSeries} type="radialBar" height={220} width="100%" />
										</Suspense>
									)}
								</div>
							</div>
							<div className="d-flex flex-column gap-3">
								<div className="d-flex align-items-center justify-content-between">
									<div className="d-flex align-items-center">
										<span className="bg-success rounded-pill me-2 d-inline-block" style={{ width: 4, height: 16 }}></span>
										<p className="mb-0 fs-13 text-muted-foreground">First Response SLA</p>
									</div>
									<span
										className="badge bg-success d-inline-flex align-items-center gap-1 rounded-pill fs-13">96.2%</span>
								</div>

								<div className="d-flex align-items-center justify-content-between">
									<div className="d-flex align-items-center">
										<span className="bg-success rounded-pill me-2 d-inline-block" style={{ width: 4, height: 16 }}></span>
										<p className="mb-0 fs-13 text-muted-foreground">Resolution SLA</p>
									</div>
									<span
										className="badge bg-success d-inline-flex align-items-center gap-1 rounded-pill fs-13">92.8%</span>
								</div>

								<div className="d-flex align-items-center justify-content-between">
									<div className="d-flex align-items-center">
										<span className="bg-warning rounded-pill me-2 d-inline-block" style={{ width: 4, height: 16 }}></span>
										<p className="mb-0 fs-13 text-muted-foreground">Escalation SLA</p>
									</div>
									<span
										className="badge bg-danger d-inline-flex align-items-center gap-1 rounded-pill fs-13">89.5%</span>
								</div>
							</div>
						</div>
					</div>
				</div>
				{/*  end col  */}

				<div className="col-xxl-4 col-xl-6">
					<div className="card mb-0">
						<div className="card-body">
							<div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
								<h3 className="mb-0 card-title">Backlog Growth</h3>
								<div className="dropdown">
									<a href="#" onClick={(e) => e.preventDefault()}
										className="border btn btn-white btn-md fw-normal d-inline-flex align-items-center justify-content-center rounded gap-1 fw-medium"
										data-bs-toggle="dropdown">
										<i className="ti ti-calendar fs-14"></i> Monthly
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

							<div id="backlog-growth">
								{isMounted && (
									<Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
										<Chart options={backlogGrowthOptions} series={backlogGrowthSeries} type="line" height={220} width="100%" />
									</Suspense>
								)}
							</div>

							<p className="mb-0 gap-2 text-dark text-center">
								<span className="badge bg-success rounded-circle p-1 me-2">
									<i className="ti ti-caret-up-filled text-white fs-14"></i>
								</span>
								12% Compared to Last Week
							</p>
						</div>
					</div>
				</div>
				{/*  end col  */}

				<div className="col-xxl-4 col-xl-12">
					<div className="card mb-0">
						<div className="card-body">
							<div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-2">
								<h3 className="mb-0 card-title">Tickets by Category</h3>
								<div className="dropdown">
									<a href="#" onClick={(e) => e.preventDefault()}
										className="border btn btn-white btn-md fw-normal d-inline-flex align-items-center justify-content-center rounded gap-1 fw-medium"
										data-bs-toggle="dropdown">
										<i className="ti ti-calendar fs-14"></i> Monthly
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

							<div className="position-relative mb-4" style={{ height: "200px" }}>
								<div className="chart-canvas-wrapper" style={{ minHeight: "200px" }}>
									{isMounted && (
										<Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
											<Chart options={ticketCategoryOptions} series={ticketCategorySeries} type="donut" height={200} width="100%" />
										</Suspense>
									)}
								</div>
							</div>

							<div className="row row-gap-3">
								<div className="col-lg-4 col-md-4">
									<div className="border-start border-2 border-primary/60 text-center ps-2 py-1">
										<p className="d-inline-flex align-items-center mb-1 fs-12 text-muted-foreground">IT Support</p>
										<h4 className="fs-14 mb-0 text-foreground">485</h4>
									</div>
								</div>

								<div className="col-lg-4 col-md-4">
									<div className="border-start border-2 border-slate-500/60 text-center ps-2 py-1">
										<p className="d-inline-flex align-items-center mb-1 fs-12 text-muted-foreground">HR</p>
										<h4 className="fs-14 mb-0 text-foreground">342</h4>
									</div>
								</div>

								<div className="col-lg-4 col-md-4">
									<div className="border-start border-2 border-success/60 text-center ps-2 py-1">
										<p className="d-inline-flex align-items-center mb-1 fs-12 text-muted-foreground">Payroll</p>
										<h4 className="fs-14 mb-0 text-foreground">268</h4>
									</div>
								</div>

								<div className="col-lg-4 col-md-4">
									<div className="border-start border-2 border-warning/60 text-center ps-2 py-1">
										<p className="d-inline-flex align-items-center mb-1 fs-12 text-muted-foreground">Access</p>
										<h4 className="fs-14 mb-0 text-foreground">195</h4>
									</div>
								</div>

								<div className="col-lg-4 col-md-4">
									<div className="border-start border-2 border-info/60 text-center ps-2 py-1">
										<p className="d-inline-flex align-items-center mb-1 fs-12 text-muted-foreground">Hardware</p>
										<h4 className="fs-14 mb-0 text-foreground">412</h4>
									</div>
								</div>

								<div className="col-lg-4 col-md-4">
									<div className="border-start border-2 border-danger/60 text-center ps-2 py-1">
										<p className="d-inline-flex align-items-center mb-1 fs-12 text-muted-foreground">Other</p>
										<h4 className="fs-14 mb-0 text-foreground">145</h4>
									</div>
								</div>

							</div>
						</div>
					</div>
				</div>
				{/*  end col  */}
			</div>
			{/*  end row  */}

			<div className="row">
				<div className="col-xxl-8 col-xl-12">
					<div className="card">
						<div className="card-body">
							<div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
								<h3 className="mb-0 card-title">Agent Performance</h3>
								<div className="dropdown">
									<a href="#" onClick={(e) => e.preventDefault()}
										className="border btn btn-white btn-md fw-normal d-inline-flex align-items-center justify-content-center rounded gap-1 fw-medium"
										data-bs-toggle="dropdown">
										<i className="ti ti-calendar fs-14"></i> Monthly
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
							<div className="agent-grid-wrapper">
								<div className="card shadow-none">
									<div className="d-flex align-items-center">
										<a href="invoice-details.html" className="avatar">
											<img src="/assets/img/avatar/avatar-01.png"
												className="img-fluid rounded-circle" alt="img" />
										</a>
										<div className="ms-2">
											<h4 className="fw-medium fs-14 mb-1">Michael Johnson</h4>
											<p className="d-inline-flex align-items-center mb-0"><i
												className="ti ti-star-filled text-warning me-1"></i>4.6</p>
										</div>
									</div>
									<div>
										<p className="fs-13 mb-1">Avg Resolution Time</p>
										<p className="fw-medium mb-0 text-dark">1.8h</p>
									</div>
									<div>
										<div className="d-flex justify-content-between align-items-center chart-title">
											<p className="text-dark mb-0">Resolution Rate</p>
											<p className="text-dark mb-0">70%</p>
										</div>
										<div className="agent-performance" data-filled="17"></div>
									</div>
								</div>
								<div className="card shadow-none">
									<div className="d-flex align-items-center">
										<a href="invoice-details.html" className="avatar">
											<img src="/assets/img/avatar/avatar-02.png"
												className="img-fluid rounded-circle" alt="img" />
										</a>
										<div className="ms-2">
											<h4 className="fw-medium fs-14 mb-1">Emily Davis</h4>
											<p className="d-inline-flex align-items-center mb-0"><i
												className="ti ti-star-filled text-warning me-1"></i>4.8</p>
										</div>
									</div>
									<div>
										<p className="fs-13 mb-1">Avg Resolution Time</p>
										<p className="fw-medium mb-0 text-dark">1.4h</p>
									</div>
									<div>
										<div className="d-flex justify-content-between align-items-center chart-title">
											<p className="text-dark mb-0">Resolution Rate</p>
											<p className="text-dark mb-0">95%</p>
										</div>
										<div className="agent-performance" data-filled="19"></div>
									</div>
								</div>
								<div className="card shadow-none">
									<div className="d-flex align-items-center">
										<a href="invoice-details.html" className="avatar">
											<img src="/assets/img/avatar/avatar-03.jpg"
												className="img-fluid rounded-circle" alt="img" />
										</a>
										<div className="ms-2">
											<h4 className="fw-medium fs-14 mb-1">Robert Martinez</h4>
											<p className="d-inline-flex align-items-center mb-0"><i
												className="ti ti-star-filled text-warning me-1"></i>4.3</p>
										</div>
									</div>
									<div>
										<p className="fs-13 mb-1">Avg Resolution Time</p>
										<p className="fw-medium mb-0 text-dark">1.1h</p>
									</div>
									<div>
										<div className="d-flex justify-content-between align-items-center chart-title">
											<p className="text-dark mb-0">Resolution Rate</p>
											<p className="text-dark mb-0">60%</p>
										</div>
										<div className="agent-performance" data-filled="16"></div>
									</div>
								</div>
								<div className="card mb-0 shadow-none">
									<div className="d-flex align-items-center">
										<a href="invoice-details.html" className="avatar">
											<img src="/assets/img/avatar/avatar-04.png"
												className="img-fluid rounded-circle" alt="img" />
										</a>
										<div className="ms-2">
											<h4 className="fw-medium fs-14 mb-1">Megan Walker</h4>
											<p className="d-inline-flex align-items-center mb-0"><i
												className="ti ti-star-filled text-warning me-1"></i>4.5 </p>
										</div>
									</div>
									<div>
										<p className="fs-13 mb-1">Avg Resolution Time</p>
										<p className="fw-medium mb-0 text-dark">1.9h</p>
									</div>
									<div>
										<div className="d-flex justify-content-between align-items-center chart-title">
											<p className="text-dark mb-0">Resolution Rate</p>
											<p className="text-dark mb-0">80%</p>
										</div>
										<div className="agent-performance" data-filled="18"></div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				{/*  Clock-In/Out  */}
				<div className="col-xxl-4 col-xl-12 d-flex">
					<div className="card flex-fill">
						<div className="card-body">
							<div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-2">
								<h3 className="mb-0 card-title">Activity Feed</h3>
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

							<div className="">
								<div className="d-flex align-items-center justify-content-between mb-3 p-2 br-5">
									<div className="d-flex align-items-center">
										<span
											className="avatar rounded-circle bg-transparent-primary text-primary mb-2 flex-shrink-0">
											<i className="ti ti-brand-hipchat fs-16"></i>
										</span>
										<div className="ms-3">
											<h4 className="fs-14 fw-medium text-truncate mb-1">Michael Chen replied to
												TKT-1247</h4>
											<p className="fs-13 mb-1">Added troubleshooting steps for connect</p>
											<p className="fs-13"><i className="ti ti-clock-record"></i> 5 min ago</p>
										</div>
									</div>
								</div>
								<div className="d-flex align-items-center justify-content-between mb-3 p-2 br-5">
									<div className="d-flex align-items-center">
										<span
											className="avatar rounded-circle bg-transparent-secondary text-secondary mb-2 flex-shrink-0">
											<i className="ti ti-user fs-16"></i>
										</span>
										<div className="ms-3">
											<h4 className="fs-14 fw-medium text-truncate mb-1">New ticket assigned to
												Sarah Johnson</h4>
											<p className="fs-13 mb-1">TKT-1248: Network connectivity issues</p>
											<p className="fs-13"><i className="ti ti-clock-record"></i> 12 min ago</p>
										</div>
									</div>
								</div>
								<div className="d-flex align-items-center justify-content-between mb-3 p-2 br-5">
									<div className="d-flex align-items-center">
										<span
											className="avatar rounded-circle bg-transparent-success text-success mb-2 flex-shrink-0">
											<i className="ti ti-checklist fs-16"></i>
										</span>
										<div className="ms-3">
											<h4 className="fs-14 fw-medium text-truncate mb-1">TKT-1240 marked as
												resolved</h4>
											<p className="fs-13 mb-1">Password reset completed successfully</p>
											<p className="fs-13"><i className="ti ti-clock-record"></i> 34 min ago</p>
										</div>
									</div>
								</div>
								<div className="d-flex align-items-center justify-content-between mb-3 p-2 br-5">
									<div className="d-flex align-items-center">
										<span
											className="avatar rounded-circle bg-transparent-danger text-danger mb-2 flex-shrink-0">
											<i className="ti ti-calendar-x fs-16"></i>
										</span>
										<div className="ms-3">
											<h4 className="fs-14 fw-medium text-truncate mb-1">SLA deadline approaching
											</h4>
											<p className="fs-13 mb-1">TKT-1239 has 2 hours remaining</p>
											<p className="fs-13"><i className="ti ti-clock-record"></i> 45 min ago</p>
										</div>
									</div>
								</div>
							</div>
							<a href="#" className="btn btn-light btn-md w-100 py-2">View All Activity</a>
						</div>
					</div>
				</div>
				{/*  /Clock-In/Out  */}
			</div>


		</div>
	);
}
