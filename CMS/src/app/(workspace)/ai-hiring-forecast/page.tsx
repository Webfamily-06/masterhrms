'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function AIHiringForecastPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Hiring Timeline Forecast Chart (Multi-line)
  const hiringTimelineOptions: any = {
    chart: {
      type: "line",
      height: 330,
      toolbar: { show: false },
      zoom: { enabled: false },
      background: "transparent"
    },
    colors: ["#0B556B", "#FF5B14"],
    stroke: {
      width: 2.5,
      curve: "straight"
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: "#E5E7EB",
      strokeDashArray: 4,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: true } },
      padding: { top: 0, right: 0, bottom: -10, left: 10 }
    },
    markers: {
      size: [7, 7],
      strokeWidth: 2,
      hover: { size: 8 },
      discrete: [
        { seriesIndex: 0, dataPointIndex: 0, fillColor: "#0B556B", strokeColor: "#0B556B", size: 8, shape: "square" },
        { seriesIndex: 0, dataPointIndex: 2, fillColor: "#0B556B", strokeColor: "#0B556B", size: 8, shape: "square" },
        { seriesIndex: 0, dataPointIndex: 4, fillColor: "#0B556B", strokeColor: "#0B556B", size: 8, shape: "square" },
        { seriesIndex: 0, dataPointIndex: 6, fillColor: "#0B556B", strokeColor: "#0B556B", size: 8, shape: "square" },
        { seriesIndex: 0, dataPointIndex: 8, fillColor: "#0B556B", strokeColor: "#0B556B", size: 8, shape: "square" },
        { seriesIndex: 0, dataPointIndex: 10, fillColor: "#0B556B", strokeColor: "#0B556B", size: 8, shape: "square" },
        { seriesIndex: 1, dataPointIndex: 1, fillColor: "#fff", strokeColor: "#FF5B14", size: 8, shape: "circle" },
        { seriesIndex: 1, dataPointIndex: 3, fillColor: "#fff", strokeColor: "#FF5B14", size: 8, shape: "circle" },
        { seriesIndex: 1, dataPointIndex: 5, fillColor: "#fff", strokeColor: "#FF5B14", size: 8, shape: "circle" },
        { seriesIndex: 1, dataPointIndex: 7, fillColor: "#fff", strokeColor: "#FF5B14", size: 8, shape: "circle" },
        { seriesIndex: 1, dataPointIndex: 9, fillColor: "#fff", strokeColor: "#FF5B14", size: 8, shape: "circle" },
        { seriesIndex: 1, dataPointIndex: 11, fillColor: "#fff", strokeColor: "#FF5B14", size: 8, shape: "circle" },
      ]
    },
    xaxis: {
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: "#111827", fontSize: "14px", fontWeight: 500 }
      }
    },
    yaxis: {
      min: 0,
      max: 250,
      tickAmount: 5,
      labels: {
        offsetX: -10,
        style: { colors: "#111827", fontSize: "14px", fontWeight: 500 }
      }
    },
    legend: { show: false },
    tooltip: { theme: "light" }
  };
  const hiringTimelineSeries = [
    {
      name: "Predicted Hire",
      data: [110, 95, 152, 62, 80, 42, 185, 118, 170, 232, 135, 165]
    },
    {
      name: "Actual Hire",
      data: [28, 18, 65, 102, 20, 55, 95, 68, 110, 180, 92, 122]
    }
  ];

  // 2. Statistics Sparklines (4 charts)
  const statisticsChartOptions: any = {
    chart: { type: 'area', height: 70, sparkline: { enabled: true }, toolbar: { show: false } },
    colors: ['#f26522'],
    stroke: { curve: 'smooth', width: 2, lineCap: 'round' },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, inverseColors: false, opacityFrom: 0.6, opacityTo: 0.1, stops: [0, 90, 100] } },
    dataLabels: { enabled: false },
    tooltip: { enabled: false }
  };
  const statisticsChartSeries = [{
    name: "Performance",
    data: [4, 16, 18, 30, 32, 40, 38, 42]
  }];

  const statisticsChartTwoOptions: any = {
    chart: { type: 'area', height: 70, sparkline: { enabled: true }, toolbar: { show: false } },
    colors: ['#0C4B5E'],
    stroke: { curve: 'smooth', width: 2, lineCap: 'round' },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, inverseColors: false, opacityFrom: 0.6, opacityTo: 0.1, stops: [0, 90, 100] } },
    dataLabels: { enabled: false },
    tooltip: { enabled: false }
  };
  const statisticsChartTwoSeries = [{
    name: "Performance",
    data: [4, 16, 18, 30, 32, 40, 38, 42]
  }];

  const statisticsChartThreeOptions: any = {
    chart: { type: 'area', height: 70, sparkline: { enabled: true }, toolbar: { show: false } },
    colors: ['#AB47BC'],
    stroke: { curve: 'smooth', width: 2, lineCap: 'round' },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, inverseColors: false, opacityFrom: 0.6, opacityTo: 0.1, stops: [0, 90, 100] } },
    dataLabels: { enabled: false },
    tooltip: { enabled: false }
  };
  const statisticsChartThreeSeries = [{
    name: "Performance",
    data: [4, 20, 30, 35, 20, 25, 38, 42]
  }];

  const statisticsChartFourOptions: any = {
    chart: { type: 'area', height: 70, sparkline: { enabled: true }, toolbar: { show: false } },
    colors: ['#1b84ff'],
    stroke: { curve: 'smooth', width: 2, lineCap: 'round' },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, inverseColors: false, opacityFrom: 0.6, opacityTo: 0.1, stops: [0, 90, 100] } },
    dataLabels: { enabled: false },
    tooltip: { enabled: false }
  };
  const statisticsChartFourSeries = [{
    name: "Performance",
    data: [4, 16, 18, 30, 32, 40, 38, 42]
  }];

  // 3. Pipeline Overview Chart (Funnel bar)
  const pipelineOverviewOptions: any = {
    chart: { type: 'bar', height: 240, toolbar: { show: false } },
    plotOptions: {
      bar: {
        horizontal: true,
        distributed: true,
        isFunnel: true,
        isFunnel3d: false,
        barHeight: '75%',
        borderRadius: 0,
      }
    },
    colors: ['#F26522', '#0C4B5E', '#FFC107', '#03C95A'],
    dataLabels: {
      enabled: true,
      dropShadow: { enabled: false },
      formatter: (val: any, opt: any) => opt.w.globals.labels[opt.dataPointIndex],
      style: { colors: ['#ffffff'], fontSize: '14px', fontWeight: '600' }
    },
    xaxis: {
      categories: [
        'Applied : 165',
        'Screening : 96',
        'Interview : 82',
        'Accepted : 26'
      ],
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: { labels: { show: false } },
    grid: { show: false },
    legend: { show: false },
    tooltip: { enabled: true }
  };
  const pipelineOverviewSeries = [{
    name: 'Candidates',
    data: [165, 130, 110, 80]
  }];

  // 4. Budget Allocation by Department
  const budgetAllocationOptions: any = {
    chart: {
      height: 255,
      type: 'bar',
      stacked: true,
      toolbar: { show: false },
    },
    colors: ['#FF6F28', 'rgba(255, 111, 40, 0.25)'],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '65%',
        borderRadius: 5,
        borderRadiusApplication: 'end'
      },
    },
    xaxis: {
      categories: ['Dev', 'Sales', 'Marketing', 'Support'],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: '#6B7280', fontSize: '13px' }
      }
    },
    yaxis: {
      max: 100,
      tickAmount: 5,
      labels: {
        offsetX: -20,
        style: { colors: '#6B7280', fontSize: '13px' }
      }
    },
    grid: {
      show: true,
      borderColor: '#E5E7EB',
      strokeDashArray: 3,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } }
    },
    legend: { show: false },
    dataLabels: { enabled: false },
    fill: { opacity: 1 }
  };
  const budgetAllocationSeries = [
    { name: 'Used', data: [80, 43, 60, 43] },
    { name: 'Available', data: [20, 57, 40, 57] }
  ];

  // 5. Role Demand Forecast (radialBar)
  const roleDemandOptions: any = {
    chart: {
      type: 'radialBar',
      height: 400,
      width: '100%',
    },
    colors: ['#03C95A', '#AB47BC', '#FFC107', '#1B84FF', '#FF6F28'],
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        hollow: { size: '10%', background: 'transparent' },
        track: { background: '#E5E5E5', strokeWidth: '100%', margin: 10 },
        dataLabels: { show: false }
      }
    },
    grid: {
      show: false,
      padding: { top: -30, bottom: -10, left: -30, right: -30 },
    },
    stroke: { lineCap: 'butt' },
    labels: ['Green', 'Purple', 'Yellow', 'Blue', 'Red'],
  };
  const roleDemandSeries = [85, 70, 60, 55, 50];

  return (
    <div className="dashboard-scope w-full">
        
				<div className="d-flex align-items-center justify-content-between flex-wrap mb-3">
					<div className="my-auto mb-2">
						<h2 className="mb-1">AI Hiring Forecast</h2>
						<nav>
							<ol className="breadcrumb mb-0">
								<li className="breadcrumb-item">
									<a href="#"><i className="ti ti-smart-home"></i></a>
								</li>
								<li className="breadcrumb-item">
									AI Center
								</li>
								<li className="breadcrumb-item active" aria-current="page">AI Hiring Forecast</li>
							</ol>
						</nav>
					</div>
					<div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-3">
						<div className="dropdown">
							<a href="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown"> <i className="ti ti-file-export me-1"></i>Export</a>
							<ul className="dropdown-menu  dropdown-menu-end p-3">
								<li>
									<a href="#" className="dropdown-item rounded-1"><i className="ti ti-file-type-pdf me-1"></i>Export as PDF</a>
								</li>
								<li>
									<a href="#" className="dropdown-item rounded-1"><i className="ti ti-file-type-xls me-1"></i>Export as Excel </a>
								</li>
							</ul>
						</div>
						<a href="#" className="btn btn-primary-gradient d-inline-flex align-items-center gap-2"> <i className="ti ti-repeat"></i> Update Forecast</a>
					</div>
				</div>
				

				
				<div className="row row-gap-4 mb-4">
					
					<div className="col-lg-12">
						<div className="card mb-0">
							<div className="card-body pb-3">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
									<h2 className="mb-0 card-title">Hiring Timeline Forecast</h2>
									<div className="dropdown">
										<a href="#"
											className="border btn btn-white btn-md d-inline-flex align-items-center"
											data-bs-toggle="dropdown">
											<i className="ti ti-calendar me-1 fs-14"></i>2026
										</a>
										<ul className="dropdown-menu  dropdown-menu-end p-3">
											<li>
												<a href="#" className="dropdown-item rounded-1">2026</a>
											</li>
											<li>
												<a href="#" className="dropdown-item rounded-1">2025</a>
											</li>
											<li>
												<a href="#" className="dropdown-item rounded-1">2024</a>
											</li>
										</ul>
									</div>
								</div>
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-2">
									<div className="d-flex align-items-center gap-sm-4 gap-2 flex-wrap">
										<div className="border rounded p-3">
											<p className="mb-2">Avaerage Actual Hire </p>
											<h3 className="mb-0 fs-20 fw-semibold text-primary">169</h3>
										</div>
										<div className="border rounded p-3">
											<p className="mb-2">Average Predicted Hire  </p>
											<h3 className="mb-0 fs-20 fw-semibold text-secondary">215</h3>
										</div>
									</div>
									<div className="d-flex align-items-center gap-3">
										<p className="d-flex align-items-center gap-1 text-dark mb-0">
											<i className="ti ti-circle-filled text-primary fs-13"></i> Actual Hires
										</p>
										<p className="d-flex align-items-center gap-1 text-dark mb-0">
											<i className="ti ti-square-rounded-filled text-secondary fs-13"></i>Predicted Hires
										</p>
									</div>
								</div>
								
								<div id="hiring-timline-chart"><Chart options={hiringTimelineOptions} series={hiringTimelineSeries} type="line" height={330} /></div>
							</div>
						</div>
					</div>
					

					
					<div className="col-xxl-7 col-xl-8 d-flex">
						<div className="card mb-0 flex-fill">
							<div className="card-body">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
									<h2 className="mb-0 card-title">Hiring Statistics</h2>
									<div className="dropdown">
										<a href="#"
											className="border btn btn-white btn-md d-inline-flex align-items-center gap-2"
											data-bs-toggle="dropdown">
											<i className="ti ti-chart-arrows-vertical"></i>Q3
										</a>
										<ul className="dropdown-menu  dropdown-menu-end p-3">
											<li>
												<a href="#" className="dropdown-item rounded-1">Q3</a>
											</li>
											<li>
												<a href="#" className="dropdown-item rounded-1">Q2</a>
											</li>
											<li>
												<a href="#" className="dropdown-item rounded-1">Q1</a>
											</li>
										</ul>
									</div>
								</div>

								
								<div className="row row-gap-4">
									
									<div className="col-sm-6">
										<div className="card mb-0">
											<div className="card-body">
												<div className="d-flex align-items-center flex-wrap gap-3 mb-3">
													<div className="avatar avatar-lg bg-primary rounded-circle flex-shrink-0">
														<i className="ti ti-users-group text-white fs-24"></i>
													</div>
													<div>
														<p className="mb-1">Q3 Headcount Need</p> 
														<div  className="d-flex align-items-center gap-2">
															<h3 className="text-dark mb-0">+23 </h3>
															<div className="d-inline-flex align-items-center bg-light border rounded-pill text-dark p-1 ps-2"> +4<span className="bg-success btn-icon btn-sm rounded-circle d-flex align-items-center justify-content-center ms-1"><i className="ti ti-arrow-up-right fs-20"></i></span></div>
														</div>
													</div>
												</div>
												<div id="statistics-chart"><Chart options={statisticsChartOptions} series={statisticsChartSeries} type="area" height={70} /></div>
											</div>
										</div>
									</div>
									
									<div className="col-sm-6">
										<div className="card mb-0">
											<div className="card-body">
												<div className="d-flex align-items-center flex-wrap gap-3 mb-3">
													<div className="avatar avatar-lg bg-secondary rounded-circle flex-shrink-0">
														<i className="ti ti-info-octagon text-white fs-24"></i>
													</div>
													<div>
														<p className="mb-1">Attrition Risk</p> 
														<div  className="d-flex align-items-center gap-2">
															<h3 className="text-dark mb-0">7.2% </h3>
															<div className="d-inline-flex align-items-center bg-light border rounded-pill text-dark p-1 ps-2"> +18%<span className="bg-success btn-icon btn-sm rounded-circle d-flex align-items-center justify-content-center ms-1"><i className="ti ti-arrow-up-right fs-20"></i></span></div>
														</div>
													</div>
												</div>
												<div id="statistics-chart-two"><Chart options={statisticsChartTwoOptions} series={statisticsChartTwoSeries} type="area" height={70} /></div>
											</div>
										</div>
									</div>
									
									<div className="col-sm-6">
										<div className="card mb-0">
											<div className="card-body">
												<div className="d-flex align-items-center flex-wrap gap-3 mb-3">
													<div className="avatar avatar-lg bg-purple rounded-circle flex-shrink-0">
														<i className="ti ti-briefcase text-white fs-24"></i>
													</div>
													<div>
														<p className="mb-1">Open Roles</p> 
														<div  className="d-flex align-items-center gap-2">
															<h3 className="text-dark mb-0">18 </h3>
															<div className="d-inline-flex align-items-center bg-light border rounded-pill text-dark p-1 ps-2">-16%<span className="bg-danger btn-icon btn-sm rounded-circle d-flex align-items-center justify-content-center ms-1"><i className="ti ti-arrow-down-right fs-20"></i></span></div>
														</div>
													</div>
												</div>
												<div id="statistics-chart-three"><Chart options={statisticsChartThreeOptions} series={statisticsChartThreeSeries} type="area" height={70} /></div>
											</div>
										</div>
									</div>
									
									<div className="col-sm-6">
										<div className="card mb-0">
											<div className="card-body">
												<div className="d-flex align-items-center flex-wrap gap-3 mb-3">
													<div className="avatar avatar-lg bg-info rounded-circle flex-shrink-0">
														<i className="ti ti-file-search text-white fs-24"></i>
													</div>
													<div>
														<p className="mb-1">Offer Accept Rate</p> 
														<div  className="d-flex align-items-center gap-2">
															<h3 className="text-dark mb-0">83% </h3>
															<div className="d-inline-flex align-items-center bg-light border rounded-pill text-dark p-1 ps-2"> +8%<span className="bg-success btn-icon btn-sm rounded-circle d-flex align-items-center justify-content-center ms-1"><i className="ti ti-arrow-up-right fs-20"></i></span></div>
														</div>
													</div>
												</div>
												<div id="statistics-chart-four"><Chart options={statisticsChartFourOptions} series={statisticsChartFourSeries} type="area" height={70} /></div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
					

					
					<div className="col-xxl-5 col-xl-4 d-flex">
						<div className="card mb-0 flex-fill">
							<div className="card-body">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
									<h2 className="mb-0 card-title">Hiring Pipeline Overview</h2>
									<div className="dropdown">
										<a href="#"
											className="border btn btn-light btn-icon btn-sm d-inline-flex align-items-center justify-content-center rounded-circle"
											data-bs-toggle="dropdown">
											<i className="ti ti-dots-vertical fs-16"></i>
										</a>
										<ul className="dropdown-menu mt-2 p-3">
											<li>
												<a href="#" className="dropdown-item rounded-1">
													Monthly
												</a>
											</li>
											<li>
												<a href="#" className="dropdown-item rounded-1">
													Weekly
												</a>
											</li>
											<li>
												<a href="#" className="dropdown-item rounded-1">
													Today
												</a>
											</li>
										</ul>
									</div>
								</div>
								<div id="pipeline-overview-chart"><Chart options={pipelineOverviewOptions} series={pipelineOverviewSeries} type="bar" height={240} /></div>
								<div className="pipeline-value">
									<div className="value position-relative d-flex align-items-center justify-content-between text-dark"><p className="d-flex align-items-center gap-2 mb-0"><span className="bg-primary line"></span> Applied </p><span className="fs-20 fw-semibold">59%</span></div>
									<div className="value position-relative d-flex align-items-center justify-content-between text-dark"><p className="d-flex align-items-center gap-2 mb-0"><span className="bg-secondary line"></span> Screening </p><span className="fs-20 fw-semibold">21%</span></div>
									<div className="value position-relative d-flex align-items-center justify-content-between text-dark"><p className="d-flex align-items-center gap-2 mb-0"><span className="bg-warning line"></span> Interview </p><span className="fs-20 fw-semibold">12%</span></div>
									<div className="value position-relative d-flex align-items-center justify-content-between text-dark"><p className="d-flex align-items-center gap-2 mb-0"><span className="bg-success line"></span> Accepted </p><span className="fs-20 fw-semibold">8%</span></div>
								</div>
							</div>
						</div>
					</div>
					

					
					<div className="col-xxl-8 col-xl-12 d-flex">
						<div className="card mb-0 flex-fill">
							<div className="card-body p-0">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 my-3 px-4">
									<h2 className="mb-0 card-title">Open Role Pipeline</h2>
									<a href="#" className="border btn btn-light btn-icon btn-sm d-inline-flex align-items-center justify-content-center rounded-circle">
										<i className="ti ti-arrow-up-right fs-16"></i>
									</a>
								</div>

								<div className="table-responsive">
									<table className="table table-nowrap mb-0">
										<thead>
											<tr>
												<th>Role</th>
												<th>Department</th>
												<th>Urgency</th>
												<th>Openings</th>
												<th>Pipeline fill</th>
											</tr>
										</thead>
										<tbody>
											<tr>
												<td>
													<p className="fw-semibold mb-0"><a href="#">Office Management App</a></p>
												</td>
												<td><p className="fw-medium mb-0">Engineering</p></td>
												<td> 
													<span
														className="badge bg-outline-danger d-inline-flex align-items-center badge-xs">
														<i className="ti ti-point-filled me-1"></i>Critical
													</span>
												</td>
												<td>2</td>
												<td>
													<div className="progress progress-xs w-100" role="progressbar"
														aria-valuenow="40" aria-valuemin="0" aria-valuemax="100">
														<div className="progress-bar bg-primary progress-bar-striped" style={{"width":"90%"}}></div>
													</div>
												</td>
											</tr>
											<tr>
												<td>
													<p className="fw-semibold mb-0"><a href="#">Sales Executive</a></p>
												</td>
												<td><p className="fw-medium mb-0">Sales</p></td>
												<td> 
													<span
														className="badge bg-outline-purple d-inline-flex align-items-center badge-xs">
														<i className="ti ti-point-filled me-1"></i>High
													</span>
												</td>
												<td>5</td>
												<td>
													<div className="progress progress-xs w-100" role="progressbar"
														aria-valuenow="40" aria-valuemin="0" aria-valuemax="100">
														<div className="progress-bar bg-purple progress-bar-striped" style={{"width":"60%"}}></div>
													</div>
												</td>
											</tr>
											<tr>
												<td>
													<p className="fw-semibold mb-0"><a href="#">Product Designer</a></p>
												</td>
												<td><p className="fw-medium mb-0">Product</p></td>
												<td> 
													<span
														className="badge bg-outline-info d-inline-flex align-items-center badge-xs">
														<i className="ti ti-point-filled me-1"></i>Planned
													</span>
												</td>
												<td>3</td>
												<td>
													<div className="progress progress-xs w-100" role="progressbar"
														aria-valuenow="40" aria-valuemin="0" aria-valuemax="100">
														<div className="progress-bar bg-info progress-bar-striped" style={{"width":"78%"}}></div>
													</div>
												</td>
											</tr>
											<tr>
												<td>
													<p className="fw-semibold mb-0"><a href="#">Data Analyst</a></p>
												</td>
												<td><p className="fw-medium mb-0">Operations</p></td>
												<td> 
													<span
														className="badge bg-outline-purple d-inline-flex align-items-center badge-xs">
														<i className="ti ti-point-filled me-1"></i>High
													</span>
												</td>
												<td>6</td>
												<td>
													<div className="progress progress-xs w-100" role="progressbar"
														aria-valuenow="40" aria-valuemin="0" aria-valuemax="100">
														<div className="progress-bar bg-purple progress-bar-striped" style={{"width":"85%"}}></div>
													</div>
												</td>
											</tr>
											<tr>
												<td>
													<p className="fw-semibold mb-0"><a href="#">HR Business Partner</a></p>
												</td>
												<td><p className="fw-medium mb-0">HR & Admin</p></td>
												<td> 
													<span
														className="badge bg-outline-success d-inline-flex align-items-center badge-xs">
														<i className="ti ti-point-filled me-1"></i>Low
													</span>
												</td>
												<td>3</td>
												<td>
													<div className="progress progress-xs w-100" role="progressbar"
														aria-valuenow="40" aria-valuemin="0" aria-valuemax="100">
														<div className="progress-bar bg-success progress-bar-striped" style={{"width":"95%"}}></div>
													</div>
												</td>
											</tr>
											<tr>
												<td>
													<p className="fw-semibold mb-0"><a href="#">Digital Marketing Specialist</a></p>
												</td>
												<td><p className="fw-medium mb-0">Marketing</p></td>
												<td> 
													<span
														className="badge bg-outline-danger d-inline-flex align-items-center badge-xs">
														<i className="ti ti-point-filled me-1"></i>Critical
													</span>
												</td>
												<td>2</td>
												<td>
													<div className="progress progress-xs w-100" role="progressbar"
														aria-valuenow="40" aria-valuemin="0" aria-valuemax="100">
														<div className="progress-bar bg-primary progress-bar-striped" style={{"width":"90%"}}></div>
													</div>
												</td>
											</tr>
											<tr>
												<td>
													<p className="fw-semibold mb-0"><a href="#">Business Analyst</a></p>
												</td>
												<td><p className="fw-medium mb-0">Operations</p></td>
												<td> 
													<span className="badge bg-outline-info d-inline-flex align-items-center badge-xs">
														<i className="ti ti-point-filled me-1"></i>Planned
													</span>
												</td>
												<td>5</td>
												<td>
													<div className="progress progress-xs w-100" role="progressbar"
														aria-valuenow="40" aria-valuemin="0" aria-valuemax="100">
														<div className="progress-bar bg-info progress-bar-striped" style={{"width":"95%"}}></div>
													</div>
												</td>
											</tr>
										</tbody>
									</table>
								</div>
							</div>
						</div>
					</div>
					

					
					<div className="col-xxl-4 col-xl-6 d-flex">
						<div className="card mb-0 flex-fill">
							<div className="card-body">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
									<h2 className="mb-0 card-title">Budget Allocation by Department</h2>
									<div className="dropdown">
										<a href="#"
											className="border btn btn-light btn-icon btn-sm d-inline-flex align-items-center justify-content-center rounded-circle"
											data-bs-toggle="dropdown">
											<i className="ti ti-dots-vertical fs-16"></i>
										</a>
										<ul className="dropdown-menu mt-2 p-3">
											<li>
												<a href="#" className="dropdown-item rounded-1">
													Monthly
												</a>
											</li>
											<li>
												<a href="#" className="dropdown-item rounded-1">
													Weekly
												</a>
											</li>
											<li>
												<a href="#" className="dropdown-item rounded-1">
													Today
												</a>
											</li>
										</ul>
									</div>
								</div>
								<div className="d-flex align-items-center gap-3">
									<p className="d-flex align-items-center gap-1 text-dark mb-0">
										<i className="ti ti-square-rounded-filled text-primary fs-13"></i> Used
									</p>
									<p className="d-flex align-items-center gap-1 text-dark mb-0">
										<i className="ti ti-square-rounded-filled text-light fs-13"></i>Available 
									</p>
								</div>
								<div id="budget-allocation-chart"><Chart options={budgetAllocationOptions} series={budgetAllocationSeries} type="bar" height={255} /></div>
							</div>
						</div>
					</div>
					

					
					<div className="col-xxl-4 col-xl-6 d-flex">
						<div className="card mb-0 flex-fill">
							<div className="card-body">
								<div className="mb-4">
									<h2 className="mb-0 card-title">Role Demand Forecast</h2>
								</div>

								<div id="role-demand-chart"><Chart options={roleDemandOptions} series={roleDemandSeries} type="radialBar" height={400} /></div>
								<p className="d-flex align-items-center justify-content-between gap-2 mb-2 pb-2 border-bottom-dashed">Backend Dev <span className="badge bg-success">32%</span></p>
								<p className="d-flex align-items-center justify-content-between gap-2 mb-2 pb-2 border-bottom-dashed">Sales Rep <span className="badge bg-purple">24%</span></p>
								<p className="d-flex align-items-center justify-content-between gap-2 mb-2 pb-2 border-bottom-dashed">Designer <span className="badge bg-warning">24%</span></p>
								<p className="d-flex align-items-center justify-content-between gap-2 mb-2 pb-2 border-bottom-dashed">Support <span className="badge bg-info">20%</span></p>
								<p className="d-flex align-items-center justify-content-between gap-2 mb-0 pb-0">Engineer <span className="badge bg-primary">10%</span></p>
							</div>
						</div>
					</div>
					

					
					<div className="col-xxl-4 col-xl-6 d-flex">
						<div className="card mb-0 flex-fill">
							<div className="card-body">
								<div className="mb-4">
									<h2 className="mb-0 card-title">AI Hiring Predictions</h2>
								</div>

								
								<div className="card bg-info border-info mb-4">
									<div className="card-body">
										<h3 className="fs-16 fw-semibold text-white mb-2">High-Demand Alert: Frontend Developers</h3>
										<p className="fs-13 mb-4 text-white">Predicted need for 6 frontend developers by Q3. Market competition increasing. Recommend starting recruitment now</p>
										<div className="d-flex align-items-center gap-2">
											<span className="badge bg-white p-2 text-dark">Manager Action Needed</span>
											<span className="badge bg-white p-2 text-dark">30-day trend</span>
										</div>
									</div>
									<img src="#" alt="star-icon" className="img-fluid w-25 position-absolute bottom-0 end-0" />
								</div>

								
								<div className="card bg-purple border-purple mb-0">
									<div className="card-body">
										<h3 className="fs-16 fw-semibold text-white mb-2">Budget Optimization</h3>
										<p className="fs-13 mb-4 text-white">Development budget under-utilized by $35K. Recommend accelerating senior engineer hiring or increasing referral bonuses.</p>
										<div className="d-flex align-items-center gap-2">
											<span className="badge bg-white p-2 text-dark">High Priority</span>
											<span className="badge bg-white p-2 text-dark">Actionable</span>
										</div>
									</div>
									<img src="#" alt="star-icon" className="img-fluid w-25 position-absolute bottom-0 end-0" />
								</div>
							</div>
						</div>
					</div>
					

					
					<div className="col-xxl-4 col-xl-6 d-flex">
						<div className="card mb-0 flex-fill">
							<div className="card-body">
								<div className="mb-4">
									<h2 className="mb-0 card-title">Active Position</h2>
								</div>
								
								<div className="bg-success-gradient-100 rounded p-2 d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
									<div>
										<h3 className="fs-14 mb-2">Product Manager</h3>
										<div className="d-flex align-items-center gap-2">
											<p className="mb-0 d-flex align-items-center gap-1"> <i className="ti ti-users fw-medium text-gray-7"></i>15 Applicants</p>
											<span className="inner-line"></span>
											<p className="mb-0 d-flex align-items-center gap-1"> <i className="ti ti-clock-edit fw-medium text-gray-7"></i>3 Interview</p>
										</div>
									</div>
									<span className="badge badge-success d-inline-flex align-items-center">
										<i className="ti ti-point-filled me-1"></i>Active
									</span>
								</div>
								
								<div className="bg-success-gradient-100 rounded p-2 d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
									<div>
										<h3 className="fs-14 mb-2">QA Analyst</h3>
										<div className="d-flex align-items-center gap-2">
											<p className="mb-0 d-flex align-items-center gap-1"> <i className="ti ti-users fw-medium text-gray-7"></i>12 Applicants</p>
											<span className="inner-line"></span>
											<p className="mb-0 d-flex align-items-center gap-1"> <i className="ti ti-clock-edit fw-medium text-gray-7"></i>2 Interview</p>
										</div>
									</div>
									<span className="badge badge-success d-inline-flex align-items-center">
										<i className="ti ti-point-filled me-1"></i>Active
									</span>
								</div>
								
								<div className="bg-success-gradient-100 rounded p-2 d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
									<div>
										<h3 className="fs-14 mb-2">DevOps Engineer</h3>
										<div className="d-flex align-items-center gap-2">
											<p className="mb-0 d-flex align-items-center gap-1"> <i className="ti ti-users fw-medium text-gray-7"></i>16 Applicants</p>
											<span className="inner-line"></span>
											<p className="mb-0 d-flex align-items-center gap-1"> <i className="ti ti-clock-edit fw-medium text-gray-7"></i>5 Interview</p>
										</div>
									</div>
									<span className="badge badge-success d-inline-flex align-items-center">
										<i className="ti ti-point-filled me-1"></i>Active
									</span>
								</div>
								
								<div className="bg-danger-gradient-100 rounded p-2 d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
									<div>
										<h3 className="fs-14 mb-2">Data Scientist</h3>
										<div className="d-flex align-items-center gap-2">
											<p className="mb-0 d-flex align-items-center gap-1"> <i className="ti ti-users fw-medium text-gray-7"></i>18 Applicants</p>
											<span className="inner-line"></span>
											<p className="mb-0 d-flex align-items-center gap-1"> <i className="ti ti-clock-edit fw-medium text-gray-7"></i>4 Interview</p>
										</div>
									</div>
									<span className="badge badge-danger d-inline-flex align-items-center">
										<i className="ti ti-point-filled me-1"></i>Closed
									</span>
								</div>
								
								<div className="bg-success-gradient-100 rounded p-2 d-flex align-items-center justify-content-between gap-2 flex-wrap">
									<div>
										<h3 className="fs-14 mb-2">UX Designer</h3>
										<div className="d-flex align-items-center gap-2">
											<p className="mb-0 d-flex align-items-center gap-1"> <i className="ti ti-users fw-medium text-gray-7"></i>22 Applicants</p>
											<span className="inner-line"></span>
											<p className="mb-0 d-flex align-items-center gap-1"> <i className="ti ti-clock-edit fw-medium text-gray-7"></i>6 Interview</p>
										</div>
									</div>
									<span className="badge badge-purple d-inline-flex align-items-center">
										<i className="ti ti-point-filled me-1"></i>Interview
									</span>
								</div>
							</div>
						</div>
					</div>
					
				</div>
				
      </div>
  );
}
