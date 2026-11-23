'use client';

import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Link } from "@/src/lib/router-compat";

const Chart = lazy(() => import("react-apexcharts"));

export default function DealsDashboardPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  
  const dealsStageOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        height: 310,
        type: 'bar',
        stacked: true,
        toolbar: { show: false },
      },
      colors: ['#FF6F28', '#F8F9FA'],
      plotOptions: {
        bar: {
          borderRadius: 8,
          horizontal: false,
          columnWidth: '55%',
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: ['Inpipeline', 'Follow Up', 'Schedule', 'Conversion'],
        labels: {
          style: {
            colors: '#6B7280',
            fontSize: '13px',
          }
        }
      },
      legend: { show: false },
    }),
    []
  );

  const dealsStageSeries = useMemo(() => [
    { name: 'Income', data: [80, 40, 100, 20] },
    { name: 'Expenses', data: [100, 100, 100, 100] }
  ], []);

  // SmartHR pipeline_chart: Horizontal Funnel Bar Chart
  const pipelineOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: 'bar',
        height: 300,
        toolbar: { show: false },
        sparkline: { enabled: true }
      },
      plotOptions: {
        bar: {
          horizontal: true,
          distributed: true,
          barHeight: '85%',
          borderRadius: 8,
        },
      },
      colors: ['#F26522', '#F37438', '#F5844E', '#F69364', '#F7A37A', '#F9B291'],
      dataLabels: {
        enabled: true,
        textAnchor: 'middle',
        formatter: (val, opt) => opt.w.globals.labels[opt.dataPointIndex] || '',
        style: { fontSize: '13px', fontWeight: 500, colors: ['#fff'] }
      },
      xaxis: {
        categories: [
          'Marketing : 7,898', 'Sales : 4,658', 'Email : 2,898',
          'Chat : 789', 'Operational : 655', 'Calls : 454'
        ]
      },
      tooltip: { enabled: false }
    }),
    []
  );
  const pipelineSeries = useMemo(() => [{ name: 'Pipeline', data: [130, 110, 90, 70, 50, 40] }], []);

  // SmartHR top_deal_chart / deal_chart: Radar Chart
  const topDealOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { height: 200, type: 'radar', toolbar: { show: false } },
      colors: ['#F37438', '#B359C3', '#1CCE6B'],
      stroke: { width: 2, curve: 'smooth' },
      fill: { opacity: 0.3 },
      markers: { size: 0 },
      legend: { show: false },
      xaxis: { categories: ['Mar', 'Feb', 'Jan', 'Aug', 'Jul', 'Jun', 'May', 'Apr'] }
    }),
    []
  );
  const topDealSeries = useMemo(() => [
    { name: 'Series 1', data: [80, 50, 30, 40, 100, 20] },
    { name: 'Series 2', data: [20, 30, 40, 80, 20, 80] },
    { name: 'Series 3', data: [44, 76, 78, 13, 43, 10] }
  ], []);

  return (
    <div className="dashboard-scope w-full">
      {/*  Breadcrumb  */}
				<div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
					<div className="my-auto mb-2">
						<h2 className="mb-1">Deals Dashboard</h2>
						<nav>
							<ol className="breadcrumb mb-0">
								<li className="breadcrumb-item">
									<a href="https://smarthr.dreamstechnologies.com/hrm/html/index.html"><i className="ti ti-smart-home"></i></a>
								</li>
								<li className="breadcrumb-item">
									Dashboard
								</li>
								<li className="breadcrumb-item active" aria-current="page">Deals Dashboard</li>
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
						<div className="input-icon mb-2 position-relative">
							<span className="input-icon-addon">
								<i className="ti ti-calendar text-gray-9"></i>
							</span>
							<input type="text" className="form-control date-range bookingrange"
								placeholder="dd/mm/yyyy - dd/mm/yyyy" />
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

				<div className="row">
					<div className="col-xl-6 d-flex">
						<div className="card flex-fill">
							<div className="card-header">
								<div className="d-flex align-items-center justify-content-between">
									<h5>Pipeline Stages</h5>
									<div className="dropdown">
										<a href="#" onClick={(e) => e.preventDefault()}
											className="border btn btn-white btn-md d-inline-flex align-items-center"
											data-bs-toggle="dropdown">
											<i className="ti ti-calendar me-1 fs-14"></i>This Week
										</a>
										<ul className="dropdown-menu  dropdown-menu-end p-3">
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">This
													Month</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">This
													Week</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">Last
													Week</a>
											</li>
										</ul>
									</div>
								</div>
							</div>
							<div className="card-body">
								<div id="pipeline_chart">
  {isMounted && (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={pipelineOptions} series={pipelineSeries} type="bar" height={300} width="100%" />
    </Suspense>
  )}
</div>
								<div>
									<h6 className="mb-3">Leads Values By Stages</h6>
									<div className="row g-2 justify-content-center">
										<div className="col-md col-sm-4 col-6">
											<div className="border rounded text-start p-2">
												<p className="mb-1"><i className="ti ti-point-filled text-primary"></i>Marketing
												</p>
												<h6>$5,221,45</h6>
											</div>
										</div>
										<div className="col-md col-sm-4 col-6">
											<div className="border rounded text-start p-2">
												<p className="mb-1"><i className="ti ti-point-filled text-primary"></i>Sales</p>
												<h6>$30,424</h6>
											</div>
										</div>
										<div className="col-md col-sm-4 col-6">
											<div className="border rounded text-start p-2">
												<p className="mb-1"><i className="ti ti-point-filled text-primary"></i>Email</p>
												<h6>$21,135</h6>
											</div>
										</div>
										<div className="col-md col-sm-4 col-6">
											<div className="border rounded text-start p-2">
												<p className="mb-1"><i className="ti ti-point-filled text-primary"></i>Chat</p>
												<h6>$15,235</h6>
											</div>
										</div>
										<div className="col-md col-sm-4 col-6">
											<div className="border rounded text-start p-2">
												<p className="mb-1"><i
														className="ti ti-point-filled text-primary"></i>Operational</p>
												<h6>$10,557</h6>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
					<div className="col-xl-6 d-flex">
						<div className="row flex-fill">
							<div className="col-sm-6">
								<div className="card border-white border-2 overlay-bg-3 position-relative">
									<div className="card-body">
										<div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
											<div>
												<p className="fw-medium mb-1">Total Deals</p>
												<h5>$45,221,45</h5>
											</div>
											<div className="avatar avatar-md br-10 icon-rotate bg-primary">
												<span className="d-flex align-items-center"><i
														className="ti ti-delta text-white fs-16"></i></span>
											</div>
										</div>
										<div className="progress progress-xs mb-2">
											<div className="progress-bar bg-primary" role="progressbar" style={{ width: "40%" }}>
											</div>
										</div>
										<p className="fw-medium fs-13"><span className="text-danger fs-12"><i
													className="ti ti-arrow-wave-right-up me-1"></i>-4.01% </span> from last
											week</p>
									</div>
								</div>
								<div className="card border-white border-2 overlay-bg-3 position-relative">
									<div className="card-body">
										<div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
											<div>
												<p className="fw-medium mb-1">Deal Value</p>
												<h5>$12,545,68</h5>
											</div>
											<div className="avatar avatar-md br-10 icon-rotate bg-secondary">
												<span className="d-flex align-items-center"><i
														className="ti ti-currency text-white fs-16"></i></span>
											</div>
										</div>
										<div className="progress progress-xs mb-2">
											<div className="progress-bar bg-secondary" role="progressbar"
												style={{ width: "40%" }}></div>
										</div>
										<p className="fw-medium fs-13"><span className="text-success fs-12"><i
													className="ti ti-arrow-wave-right-up me-1"></i>+20.01% </span> from last
											week</p>
									</div>
								</div>
								<div className="card border-white border-2 overlay-bg-3 position-relative">
									<div className="card-body">
										<div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
											<div>
												<p className="fw-medium mb-1">Revenue this month </p>
												<h5>$46,548,48</h5>
											</div>
											<div className="avatar avatar-md br-10 icon-rotate bg-pink">
												<span className="d-flex align-items-center"><i
														className="ti ti-stairs-up text-white fs-16"></i></span>
											</div>
										</div>
										<div className="progress progress-xs mb-2">
											<div className="progress-bar bg-pink" role="progressbar" style={{ width: "40%" }}>
											</div>
										</div>
										<p className="fw-medium fs-13"><span className="text-success fs-12"><i
													className="ti ti-arrow-wave-right-up me-1"></i>+55% </span> from last
											week</p>
									</div>
								</div>
							</div>
							<div className="col-sm-6">
								<div className="card border-white border-2 overlay-bg-3 position-relative">
									<div className="card-body">
										<div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
											<div>
												<p className="fw-medium mb-1">Total Customers</p>
												<h5>9895</h5>
											</div>
											<div className="avatar avatar-md br-10 icon-rotate bg-purple">
												<span className="d-flex align-items-center"><i
														className="ti ti-users-group text-white fs-16"></i></span>
											</div>
										</div>
										<div className="progress progress-xs mb-2">
											<div className="progress-bar bg-purple" role="progressbar" style={{ width: "40%" }}>
											</div>
										</div>
										<p className="fw-medium fs-13"><span className="text-success fs-12"><i
													className="ti ti-arrow-wave-right-up me-1"></i>+55% </span> from last
											week</p>
									</div>
								</div>
								<div className="card border-white border-2 overlay-bg-3 position-relative">
									<div className="card-body">
										<div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
											<div>
												<p className="fw-medium mb-1">Conversion Rate</p>
												<h5>51.96%</h5>
											</div>
											<div className="avatar avatar-md br-10 icon-rotate bg-info">
												<span className="d-flex align-items-center"><i
														className="ti ti-swipe text-white fs-16"></i></span>
											</div>
										</div>
										<div className="progress progress-xs mb-2">
											<div className="progress-bar bg-info" role="progressbar" style={{ width: "40%" }}>
											</div>
										</div>
										<p className="fw-medium fs-13"><span className="text-danger fs-12"><i
													className="ti ti-arrow-wave-right-up me-1"></i>-6.01% </span> from last
											week</p>
									</div>
								</div>
								<div className="card border-white border-2 overlay-bg-3 position-relative">
									<div className="card-body">
										<div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
											<div>
												<p className="fw-medium mb-1">Active Customers </p>
												<h5>8987</h5>
											</div>
											<div className="avatar avatar-md br-10 icon-rotate bg-warning">
												<span className="d-flex align-items-center"><i
														className="ti ti-star text-white fs-16"></i></span>
											</div>
										</div>
										<div className="progress progress-xs mb-2">
											<div className="progress-bar bg-warning" role="progressbar" style={{ width: "40%" }}>
											</div>
										</div>
										<p className="fw-medium fs-13"><span className="text-danger fs-12"><i
													className="ti ti-arrow-wave-right-up me-1"></i>-3.22% </span> from last
											week</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div className="row">
					<div className="col-xl-4 d-flex">
						<div className="card flex-fill">
							<div className="card-header">
								<div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
									<h5>Deals by Stage</h5>
									<div className="dropdown">
										<a href="#" onClick={(e) => e.preventDefault()}
											className="border btn btn-white btn-md d-inline-flex align-items-center"
											data-bs-toggle="dropdown">
											<i className="ti ti-calendar me-1 fs-14"></i>This Week
										</a>
										<ul className="dropdown-menu  dropdown-menu-end p-3">
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">This
													Month</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">This
													Week</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">Last
													Week</a>
											</li>
										</ul>
									</div>
								</div>
							</div>
							<div className="card-body pb-0">
								<div>
									<div className="d-flex align-items-center">
										<h3 className="me-2">$20,245</h3>
										<span
											className="badge badge-outline-success border border-success bg-success-transparent rounded-pill me-1"><i
												className="ti ti-arrow-up"></i>12%</span>
										<span>vs last years</span>
									</div>
									<div id="deals_stage">
    {isMounted && (
      <Suspense fallback={<div style={{ height: 310 }} className="d-flex align-items-center justify-content-center text-muted">Loading chart...</div>}>
        <Chart options={dealsStageOptions} series={dealsStageSeries} type="bar" height={310} />
      </Suspense>
    )}
  </div>
								</div>
							</div>
						</div>
					</div>
					<div className="col-xl-4 d-flex">
						<div className="card flex-fill">
							<div className="card-header">
								<div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
									<h5>Deals By Companies</h5>
									<div className="dropdown">
										<a href="#" onClick={(e) => e.preventDefault()}
											className="border btn btn-white btn-md d-inline-flex align-items-center"
											data-bs-toggle="dropdown">
											<i className="ti ti-calendar me-1 fs-14"></i>This Week
										</a>
										<ul className="dropdown-menu  dropdown-menu-end p-3">
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">This
													Month</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">This
													Week</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">Last
													Week</a>
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
												<a href="#" onClick={(e) => e.preventDefault()}
													className="avatar rounded-circle border bg-white flex-shrink-0 me-2">
													<img src="/assets/img/company/company-24.svg"
														className="w-auto h-auto p-1" alt="Img" />
												</a>
												<div>
													<h6 className="fw-medium mb-1">Pitch</h6>
													<p className="text-truncate">Closing Deal date 05 April, 2025</p>
												</div>
											</div>
											<div>
												<h6>$3655</h6>
											</div>
										</div>
									</div>
									<div className="border border-dashed bg-transparent-light rounded p-2 mb-2">
										<div className="d-flex align-items-center justify-content-between">
											<div className="d-flex align-items-center">
												<a href="#" onClick={(e) => e.preventDefault()}
													className="avatar rounded-circle border bg-white flex-shrink-0 me-2">
													<img src="/assets/img/company/company-25.svg" className="w-auto h-auto"
														alt="Img" />
												</a>
												<div>
													<h6 className="fw-medium mb-1">Initech</h6>
													<p className="text-truncate">Closing Deal date 05 May, 2025</p>
												</div>
											</div>
											<div>
												<h6>$2185</h6>
											</div>
										</div>
									</div>
									<div className="border border-dashed bg-transparent-light rounded p-2 mb-2">
										<div className="d-flex align-items-center justify-content-between">
											<div className="d-flex align-items-center">
												<a href="#" onClick={(e) => e.preventDefault()}
													className="avatar rounded-circle border bg-white flex-shrink-0 me-2">
													<img src="/assets/img/company/company-26.svg" className="w-auto h-auto"
														alt="Img" />
												</a>
												<div>
													<h6 className="fw-medium mb-1">Umbrella Corp</h6>
													<p className="text-truncate">Closing Deal date 29 April, 2025</p>
												</div>
											</div>
											<div>
												<h6>$1583</h6>
											</div>
										</div>
									</div>
									<div className="border border-dashed bg-transparent-light rounded p-2 mb-2">
										<div className="d-flex align-items-center justify-content-between">
											<div className="d-flex align-items-center">
												<a href="#" onClick={(e) => e.preventDefault()}
													className="avatar rounded-circle border bg-white flex-shrink-0 me-2">
													<img src="/assets/img/company/company-27.svg" className="w-auto h-auto"
														alt="Img" />
												</a>
												<div>
													<h6 className="fw-medium mb-1">Capital Partners</h6>
													<p className="text-truncate">Closing Deal date 23 Mar, 2025</p>
												</div>
											</div>
											<div>
												<h6>$6584</h6>
											</div>
										</div>
									</div>
									<div className="border border-dashed bg-transparent-light rounded p-2">
										<div className="d-flex align-items-center justify-content-between">
											<div className="d-flex align-items-center">
												<a href="#" onClick={(e) => e.preventDefault()}
													className="avatar rounded-circle border bg-white flex-shrink-0 me-2">
													<img src="/assets/img/company/company-28.svg" className="w-auto h-auto"
														alt="Img" />
												</a>
												<div>
													<h6 className="fw-medium mb-1">Massive Dynamic</h6>
													<p className="text-truncate">Closing Deal date 23 Feb, 2025</p>
												</div>
											</div>
											<div>
												<h6>$2153</h6>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
					<div className="col-xl-4 d-flex">
						<div className="card flex-fill">
							<div className="card-header">
								<div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
									<h5>Top Deals</h5>
									<div className="dropdown">
										<a href="#" onClick={(e) => e.preventDefault()}
											className="border btn btn-white btn-md d-inline-flex align-items-center"
											data-bs-toggle="dropdown">
											<i className="ti ti-calendar me-1 fs-14"></i>This Week
										</a>
										<ul className="dropdown-menu  dropdown-menu-end p-3">
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">This
													Month</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">This
													Week</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">Last
													Week</a>
											</li>
										</ul>
									</div>
								</div>
							</div>
							<div className="card-body">
								<div className="text-center">
									<div className="chart-canvas-wrapper" style={{ minHeight: "200px" }}>
  {isMounted && (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={topDealOptions} series={topDealSeries} type="radar" height={200} width="100%" />
    </Suspense>
  )}
</div>
								</div>
								<div>
									<h6 className="mb-3">Status</h6>
									<div className="d-flex align-items-center justify-content-between mb-2">
										<p className="f-13 mb-0"><i
												className="ti ti-circle-filled text-primary me-1"></i>Marketing</p>
										<p className="f-13 fw-medium text-gray-9">$5,69,877</p>
									</div>
									<div className="d-flex align-items-center justify-content-between mb-2">
										<p className="f-13 mb-0"><i className="ti ti-circle-filled text-secondary me-1"></i>Chat
										</p>
										<p className="f-13 fw-medium text-gray-9">$4,84,575</p>
									</div>
									<div className="d-flex align-items-center justify-content-between">
										<p className="f-13 mb-0"><i className="ti ti-circle-filled text-warning me-1"></i>Email
										</p>
										<p className="f-13 fw-medium text-gray-9">$1,84,575</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div className="row">
					<div className="col-xl-4 d-flex">
						<div className="card flex-fill">
							<div className="card-header">
								<div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
									<h5>Deals By Country</h5>
									<div>
										<a href="https://smarthr.dreamstechnologies.com/hrm/html/countries.html" className="btn btn-light btn-md">View All</a>
									</div>
								</div>
							</div>
							<div className="card-body py-2">
								<div className="table-responsive pt-1">
									<table className="table table-nowrap table-borderless mb-0">
										<tbody>
											<tr>
												<td className="px-0">
													<div className="d-flex align-items-center mb-2">
														<a href="https://smarthr.dreamstechnologies.com/hrm/html/countries.html"
															className="avatar rounded-circle border border-2">
															<img src="/flags/us.svg"
																className="img-fluid rounded-circle" alt="img" />
														</a>
														<div className="ms-2">
															<h6 className="fw-medium mb-1"><a href="https://smarthr.dreamstechnologies.com/hrm/html/countries.html">USA</a>
															</h6>
															<span className="fs-13 d-inline-flex align-items-center">Deals :
																350</span>
														</div>
													</div>
												</td>
												<td>
													<div className="text-center mb-2">
														<span className="country-chart-1"
															data-width="100%">0,3,0,2,1,3,1</span>
													</div>
												</td>
												<td className="px-0 text-end">
													<div className="mb-2">
														<p className="fs-13 mb-1">Total Value</p>
														<h6 className="fw-medium">$1065.00</h6>
													</div>
												</td>
											</tr>
											<tr>
												<td className="px-0">
													<div className="d-flex align-items-center mb-2">
														<a href="https://smarthr.dreamstechnologies.com/hrm/html/countries.html"
															className="avatar rounded-circle border border-2">
															<img src="/flags/ae.svg"
																className="img-fluid rounded-circle" alt="img" />
														</a>
														<div className="ms-2">
															<h6 className="fw-medium mb-1"><a href="https://smarthr.dreamstechnologies.com/hrm/html/countries.html">UAE</a>
															</h6>
															<span className="fs-13 d-inline-flex align-items-center">Deals :
																221</span>
														</div>
													</div>
												</td>
												<td>
													<div className="text-center mb-2">
														<span className="country-chart-1"
															data-width="100%">0,3,0,2,1,3,1</span>
													</div>
												</td>
												<td className="px-0 text-end">
													<div className="mb-2">
														<p className="fs-13 mb-1">Total Value</p>
														<h6 className="fw-medium">$966.00</h6>
													</div>
												</td>
											</tr>
											<tr>
												<td className="px-0">
													<div className="d-flex align-items-center mb-2">
														<a href="https://smarthr.dreamstechnologies.com/hrm/html/countries.html"
															className="avatar rounded-circle border border-2">
															<img src="/flags/sg.svg"
																className="img-fluid rounded-circle" alt="img" />
														</a>
														<div className="ms-2">
															<h6 className="fw-medium mb-1"><a
																	href="https://smarthr.dreamstechnologies.com/hrm/html/countries.html">Singapore</a></h6>
															<span className="fs-13 d-inline-flex align-items-center">Deals :
																236</span>
														</div>
													</div>
												</td>
												<td>
													<div className="text-center mb-2">
														<span className="country-chart-2"
															data-width="100%">0,3,0,2,1,3,1</span>
													</div>
												</td>
												<td className="px-0 text-end">
													<div className="mb-2">
														<p className="fs-13 mb-1">Total Value</p>
														<h6 className="fw-medium">$959.00</h6>
													</div>
												</td>
											</tr>
											<tr>
												<td className="px-0">
													<div className="d-flex align-items-center mb-2">
														<a href="https://smarthr.dreamstechnologies.com/hrm/html/countries.html"
															className="avatar rounded-circle border border-2">
															<img src="/flags/fr.svg"
																className="img-fluid rounded-circle" alt="img" />
														</a>
														<div className="ms-2">
															<h6 className="fw-medium mb-1"><a
																	href="https://smarthr.dreamstechnologies.com/hrm/html/countries.html">France</a></h6>
															<span className="fs-13 d-inline-flex align-items-center">Deals :
																589</span>
														</div>
													</div>
												</td>
												<td>
													<div className="text-center mb-2">
														<span className="country-chart-1"
															data-width="100%">0,3,0,2,1,3,1</span>
													</div>
												</td>
												<td className="px-0 text-end">
													<div className="mb-2">
														<p className="fs-13 mb-1">Total Value</p>
														<h6 className="fw-medium">$879.00</h6>
													</div>
												</td>
											</tr>
											<tr>
												<td className="px-0">
													<div className="d-flex align-items-center">
														<a href="https://smarthr.dreamstechnologies.com/hrm/html/countries.html"
															className="avatar rounded-circle border border-2">
															<img src="/flags/no.svg"
																className="img-fluid rounded-circle" alt="img" />
														</a>
														<div className="ms-2">
															<h6 className="fw-medium mb-1"><a
																	href="https://smarthr.dreamstechnologies.com/hrm/html/countries.html">Norway</a></h6>
															<span className="fs-13 d-inline-flex align-items-center">Deals :
																221</span>
														</div>
													</div>
												</td>
												<td>
													<div className="text-center">
														<span className="country-chart-2"
															data-width="100%">0,3,0,2,1,3,1</span>
													</div>
												</td>
												<td className="px-0 text-end">
													<p className="fs-13 mb-1">Total Value</p>
													<h6 className="fw-medium">$632.00</h6>
												</td>
											</tr>
										</tbody>
									</table>
								</div>
							</div>
						</div>
					</div>
					<div className="col-xl-4 d-flex">
						<div className="card flex-fill">
							<div className="card-header">
								<div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
									<h5 className="mb-0">Won Deals Stage</h5>
									<div className="dropdown">
										<a href="#" onClick={(e) => e.preventDefault()}
											className="border btn btn-white btn-md d-inline-flex align-items-center"
											data-bs-toggle="dropdown">
											<i className="ti ti-calendar me-1 fs-14"></i>This Week
										</a>
										<ul className="dropdown-menu  dropdown-menu-end p-3">
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">This
													Month</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">This
													Week</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">Last
													Week</a>
											</li>
										</ul>
									</div>
								</div>
							</div>
							<div className="card-body">
								<div className="text-center mb-4">
									<p className="mb-1 fw-medium">Stages Won This Year</p>
									<div className="d-flex align-items-center justify-content-center">
										<h3 className="me-2">$45,899,79</h3>
										<span className="badge badge-soft-danger border-danger border rounded-pill"><i
												className="ti ti-arrow-narrow-down me-1"></i> 12%</span>
									</div>
								</div>
								<div className="stage-chart-main">
									<div className="deal-stage-chart">
										<div
											className="text-center d-flex align-items-center justify-content-center flex-column bg-secondary rounded-circle chart-stage-1">
											<span className="d-block text-white mb-1">Conversion</span>
											<h6 className="text-white">48%</h6>
										</div>
										<div
											className="text-center d-flex align-items-center justify-content-center flex-column bg-danger rounded-circle chart-stage-2">
											<span className="d-block text-white mb-1">Calls</span>
											<h6 className="text-white">24%</h6>
										</div>
										<div
											className="text-center d-flex align-items-center justify-content-center flex-column bg-warning rounded-circle chart-stage-3">
											<span className="d-block text-white mb-1">Email</span>
											<h6 className="text-white">39%</h6>
										</div>
										<div
											className="text-center d-flex align-items-center justify-content-center flex-column bg-success rounded-circle chart-stage-4">
											<span className="d-block text-white mb-1">Chats</span>
											<h6 className="text-white">20%</h6>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
					<div className="col-xl-4 d-flex">
						<div className="card flex-fill">
							<div className="card-header">
								<div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
									<h5>Recent Follow Up</h5>
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
										<a href="#"
											className="btn btn-light btn-icon btn-sm d-flex justify-content-center align-items-center border-0 p-2 "><i
												className="ti ti-mail-bolt fs-16"></i></a>
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
									<div className="d-flex align-items-center"><a href="#"
											className="btn btn-light btn-icon btn-sm d-flex justify-content-center align-items-center border-0 p-2"><i
												className="ti ti-phone fs-16"></i></a>
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
										<a href="#"
											className="btn btn-light btn-icon btn-sm d-flex justify-content-center align-items-center border-0 p-2"><i
												className="ti ti-mail-bolt fs-16"></i></a>
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
										<a href="#"
											className="btn btn-light btn-icon btn-sm d-flex justify-content-center align-items-center border-0 p-2"><i
												className="ti ti-brand-hipchat fs-16"></i></a>
									</div>
								</div>
								<div className="d-flex align-items-center justify-content-between">
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
										<a href="#"
											className="btn btn-light btn-icon btn-sm d-flex justify-content-center align-items-center border-0 p-2"><i
												className="ti ti-brand-hipchat fs-16"></i></a>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div className="row">
					<div className="col-xl-8 d-flex">
						<div className="card flex-fill">
							<div
								className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-2">
								<h5>Recent Deals</h5>
								<div className="d-flex align-items-center">
									<div>
										<a href="https://smarthr.dreamstechnologies.com/hrm/html/deals.html" className="btn btn-md btn-light">View All</a>
									</div>
								</div>
							</div>
							<div className="card-body p-0">
								<div className="table-responsive">
									<table className="table table-nowrap dashboard-table mb-0">
										<thead>
											<tr>
												<th>Deal Name</th>
												<th>Stage</th>
												<th>Deal Value</th>
												<th>Owner</th>
												<th>Closed Date</th>
											</tr>
										</thead>
										<tbody>
											<tr>
												<td>
													<h6 className="fw-medium"><a href="https://smarthr.dreamstechnologies.com/hrm/html/deals-details.html">Collins</a></h6>
												</td>
												<td>Quality To Buy</td>
												<td>
													$4,50,000
												</td>
												<td>
													<div className="d-flex align-items-center">
														<a href="#" className="avatar avatar-rounded flex-shrink-0 me-2">
															<img src="/assets/img/users/user-32.jpg" alt="Img" />
														</a>
														<h6 className="fw-medium"><a href="#">Anthony Lewis</a></h6>
													</div>
												</td>
												<td>14 Jan 2024</td>
											</tr>
											<tr>
												<td>
													<h6 className="fw-medium"><a href="https://smarthr.dreamstechnologies.com/hrm/html/deals-details.html">Konopelski</a>
													</h6>
												</td>
												<td>Proposal Made</td>
												<td>
													$3,15,000
												</td>
												<td>
													<div className="d-flex align-items-center">
														<a href="#" className="avatar avatar-rounded flex-shrink-0 me-2">
															<img src="/assets/img/users/user-09.jpg" alt="Img" />
														</a>
														<h6 className="fw-medium"><a href="#">Brian Villalobos</a></h6>
													</div>
												</td>
												<td>21 Jan 2024</td>
											</tr>
											<tr>
												<td>
													<h6 className="fw-medium"><a href="https://smarthr.dreamstechnologies.com/hrm/html/deals-details.html">Adams</a></h6>
												</td>
												<td>Contact Made</td>
												<td>
													$8,40,000
												</td>
												<td>
													<div className="d-flex align-items-center">
														<a href="#" className="avatar avatar-rounded flex-shrink-0 me-2">
															<img src="/assets/img/users/user-01.jpg" alt="Img" />
														</a>
														<h6 className="fw-medium"><a href="#">Harvey Smith</a></h6>
													</div>
												</td>
												<td>20 Feb 2024</td>
											</tr>
											<tr>
												<td>
													<h6 className="fw-medium"><a href="https://smarthr.dreamstechnologies.com/hrm/html/deals-details.html">Schumm</a></h6>
												</td>
												<td>Quality To Buy</td>
												<td>
													$6,10,000
												</td>
												<td>
													<div className="d-flex align-items-center">
														<a href="#" className="avatar avatar-rounded flex-shrink-0 me-2">
															<img src="/assets/img/users/user-33.jpg" alt="Img" />
														</a>
														<h6 className="fw-medium"><a href="#">Stephan Peralt</a></h6>
													</div>
												</td>
												<td>15 Mar 2024</td>
											</tr>
											<tr>
												<td>
													<h6 className="fw-medium"><a href="https://smarthr.dreamstechnologies.com/hrm/html/deals-details.html">Wisozk</a></h6>
												</td>
												<td>Presentation</td>
												<td>
													$4,70,000
												</td>
												<td>
													<div className="d-flex align-items-center">
														<a href="#" className="avatar avatar-rounded flex-shrink-0 me-2">
															<img src="/assets/img/users/user-34.jpg" alt="Img" />
														</a>
														<h6 className="fw-medium"><a href="#">Doglas Martini</a></h6>
													</div>
												</td>
												<td>12 Apr 2024</td>
											</tr>
										</tbody>
									</table>
								</div>
							</div>
						</div>
					</div>
					<div className="col-xl-4 d-flex">
						<div className="card flex-fill">
							<div className="card-header">
								<div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
									<h5>Recent Activities</h5>
									<div>
										<a href="https://smarthr.dreamstechnologies.com/hrm/html/activity.html" className="btn btn-md btn-light">View All</a>
									</div>
								</div>
							</div>
							<div className="card-body schedule-timeline activity-timeline">
								<div className="d-flex align-items-start">
									<div className="avatar avatar-md avatar-rounded bg-success flex-shrink-0">
										<i className="ti ti-phone-filled fs-16"></i>
									</div>
									<div className="flex-fill ps-3 pb-4 timeline-flow">
										<p className="fw-medium text-gray-9 mb-1"><a href="https://smarthr.dreamstechnologies.com/hrm/html/activity.html">Drain responded to
												your appointment schedule question.</a></p>
										<span>09:25 PM</span>
									</div>
								</div>
								<div className="d-flex align-items-start">
									<div className="avatar avatar-md avatar-rounded bg-info flex-shrink-0">
										<i className="ti ti-message-circle-2-filled fs-16"></i>
									</div>
									<div className="flex-fill ps-3 pb-4 timeline-flow">
										<p className="fw-medium text-gray-9 mb-1"><a href="https://smarthr.dreamstechnologies.com/hrm/html/activity.html">You sent 1 Message
												to the James.</a></p>
										<span>10:25 PM</span>
									</div>
								</div>
								<div className="d-flex align-items-start">
									<div className="avatar avatar-md avatar-rounded bg-success flex-shrink-0">
										<i className="ti ti-phone-filled fs-16"></i>
									</div>
									<div className="flex-fill ps-3 pb-4 timeline-flow">
										<p className="fw-medium text-gray-9 mb-1"><a href="https://smarthr.dreamstechnologies.com/hrm/html/activity.html">Denwar responded
												to your appointment on 25 Jan 2025, 08:15 PM</a></p>
										<span>09:25 PM</span>
									</div>
								</div>
								<div className="d-flex align-items-start">
									<div className="avatar avatar-md avatar-rounded bg-purple flex-shrink-0">
										<i className="ti ti-user-circle fs-16"></i>
									</div>
									<div className="flex-fill ps-3 timeline-flow">
										<p className="fw-medium text-gray-9 mb-1"><a href="https://smarthr.dreamstechnologies.com/hrm/html/activity.html"
												className="d-flex align-items-center">Meeting With <img
													src="/assets/img/users/user-58.jpg"
													className="avatar avatar-sm rounded-circle mx-2" alt="Img" />Abraham</a>
										</p>
										<span>09:25 PM</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			
    </div>
  );
}
