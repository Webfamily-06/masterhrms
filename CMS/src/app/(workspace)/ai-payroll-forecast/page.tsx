'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function AIPayrollForecastPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Payroll Forecast Mixed Line/Area
  const payrollForecastOptions: any = {
    chart: {
      height: 320,
      type: 'line',
      toolbar: { show: false },
      fontFamily: 'inherit',
    },
    colors: [
      '#FF6B2C',                  // Actual
      '#0B4F6C',                  // Forecast
      'rgba(11, 79, 108, 0.15)',  // Upper Cone
      'transparent'               // Lower Mask
    ],
    fill: {
      type: ['solid', 'solid', 'solid', 'solid'],
      opacity: [1, 1, 1, 1]
    },
    stroke: {
      width: [3, 3, 0, 0],
      dashArray: [0, 5, 0, 0],
      curve: 'straight'
    },
    grid: {
      borderColor: '#E2E8F0',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } }
    },
    dataLabels: { enabled: false },
    markers: {
      size: 5,
      colors: ['#FF6B2C', '#0B4F6C', 'transparent', 'transparent'],
      strokeColors: '#ffffff',
      strokeWidth: 0,
      hover: { size: 7 }
    },
    xaxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: '12px' } }
    },
    yaxis: {
      min: 0, max: 6, tickAmount: 6,
      labels: {
        offsetX: -15,
        formatter: (val: number) => val + "M",
        style: { fontSize: '12px' }
      }
    },
    legend: { show: false }
  };
  const payrollForecastSeries = [
    {
      name: 'Actual Payroll',
      type: 'line',
      data: [1.1, 1.8, 1.5, 1.7, 2.1, 2.7, 3.4, 3.9, 4.1, null, null, null]
    },
    {
      name: 'Forecast',
      type: 'line',
      data: [null, null, null, null, null, null, null, null, 4.1, 4.3, 4.6, 5.0]
    },
    {
      name: 'Prediction Cone Upper',
      type: 'area',
      data: [null, null, null, null, null, null, null, null, 4.1, 4.8, 5.2, 5.6]
    },
    {
      name: 'Prediction Cone Lower',
      type: 'area',
      data: [null, null, null, null, null, null, null, null, 4.1, 3.4, 3.6, 3.8]
    }
  ];

  // 2. Variance Analysis (variance-chart)
  const varianceOptions: any = {
    chart: {
      height: 280,
      type: 'bar',
      stacked: true,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        columnWidth: '55%',
        borderRadius: 0
      }
    },
    colors: [
      'rgba(245, 130, 41, 0.08)',
      '#0C4B5E'
    ],
    stroke: {
      show: true,
      width: [0, 3],
      colors: ['transparent', '#0C4B5E']
    },
    dataLabels: {
      enabled: true,
      textAnchor: 'middle',
      formatter: (val: any, opts: any) => {
        if (opts.seriesIndex === 1) {
          const percentages = ['0.9%', '5.1%', '', '(0.1%)', '(2.5%)', '(4.5%)'];
          return percentages[opts.dataPointIndex] || '';
        }
        return '';
      },
      offsetY: -28,
      style: {
        fontSize: '12px',
        fontWeight: '600',
        colors: ['#000000']
      },
      background: {
        enabled: true,
        color: '#ffffff',
        foreColor: '#000000',
        padding: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EAEAEA',
        opacity: 1,
        dropShadow: { enabled: false }
      }
    },
    grid: {
      show: true,
      borderColor: '#F1F3F5',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } }
    },
    xaxis: {
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: '#7A7A7A', fontSize: '13px', fontWeight: 500 } }
    },
    yaxis: {
      min: 0,
      max: 250000,
      tickAmount: 5,
      labels: {
        offsetX: -15,
        style: { colors: '#7A7A7A', fontSize: '13px' },
        formatter: (value: number) => {
          if (value === 0) return "0";
          return "$" + (value / 1000) + "K";
        }
      }
    },
    legend: { show: false },
  };
  const varianceSeries = [
    {
      name: 'Actual',
      type: 'bar',
      data: [
        { x: 'Dev', y: 108000, goals: [{ name: 'Budget', value: 6000, strokeHeight: 4, strokeColor: '#F26522', strokeLineCap: 'round' }] },
        { x: 'Sales', y: 138000, goals: [{ name: 'Budget', value: 6000, strokeHeight: 4, strokeColor: '#F26522', strokeLineCap: 'round' }] },
        { x: 'Marketing', y: 10000, goals: [{ name: 'Budget', value: 6000, strokeHeight: 4, strokeColor: '#F26522', strokeLineCap: 'round' }] },
        { x: 'UI/UX Design', y: 92000, goals: [{ name: 'Budget', value: 6000, strokeHeight: 4, strokeColor: '#F26522', strokeLineCap: 'round' }] },
        { x: 'Support', y: 92000, goals: [{ name: 'Budget', value: 6000, strokeHeight: 4, strokeColor: '#F26522', strokeLineCap: 'round' }] },
        { x: 'Operations', y: 202000, goals: [{ name: 'Budget', value: 6000, strokeHeight: 4, strokeColor: '#F26522', strokeLineCap: 'round' }] }
      ]
    },
    {
      name: 'Top Indicator',
      type: 'bar',
      data: [
        { x: 'Dev', y: 4000 },
        { x: 'Sales', y: 4000 },
        { x: 'Marketing', y: 4000 },
        { x: 'UI/UX Design', y: 4000 },
        { x: 'Support', y: 4000 },
        { x: 'Operations', y: 4000 }
      ]
    }
  ];

  // 3. Mini Sparklines (forecast-chart, projection-chart, overtime-chart, risk-chart)
  const forecastOptions: any = {
    chart: { type: 'rangeBar', height: 60, width: 80, toolbar: { show: false }, sparkline: { enabled: true } },
    plotOptions: { bar: { columnWidth: '65%', distributed: true, borderRadius: 2 } },
    colors: ['#F26522', '#F26522', '#F26522', '#F26522', '#F26522', '#F26522', '#F26522'],
    tooltip: { enabled: true }
  };
  const forecastSeries = [{
    name: 'Forecast',
    data: [
      { x: 'Mon', y: [15, 75] },
      { x: 'Tue', y: [25, 65] },
      { x: 'Wed', y: [0, 90] },
      { x: 'Thu', y: [15, 75] },
      { x: 'Fri', y: [35, 55] },
      { x: 'Sat', y: [15, 75] },
      { x: 'Sun', y: [15, 75] }
    ]
  }];

  const projectionOptions: any = {
    chart: { type: 'rangeBar', height: 60, width: 80, toolbar: { show: false }, sparkline: { enabled: true } },
    plotOptions: { bar: { columnWidth: '55%', distributed: true, borderRadius: 2 } },
    colors: ['#0C4B5E', '#0C4B5E', '#0C4B5E', '#0C4B5E', '#0B4F6C', '#0C4B5E', '#0C4B5E', '#0C4B5E'],
    tooltip: { enabled: true }
  };
  const projectionSeries = [{
    name: 'Projection',
    data: [
      { x: 'Mon', y: [12, 18] },
      { x: 'Tue', y: [6, 24] },
      { x: 'Wed', y: [6, 24] },
      { x: 'Thu', y: [9, 21] },
      { x: 'Fri', y: [0, 30] },
      { x: 'Sat', y: [10, 20] },
      { x: 'Sun', y: [11, 19] },
    ]
  }];

  const overtimeOptions: any = {
    chart: { type: 'rangeBar', height: 60, width: 80, toolbar: { show: false }, sparkline: { enabled: true } },
    plotOptions: { bar: { columnWidth: '55%', distributed: true, borderRadius: 2 } },
    colors: ['#1B84FF', '#1B84FF', '#1B84FF', '#1B84FF', '#1B84FF', '#1B84FF', '#1B84FF'],
    tooltip: { enabled: true }
  };
  const overtimeSeries = [{
    name: 'Overtime',
    data: [
      { x: 'Mon', y: [25, 75] },
      { x: 'Tue', y: [35, 65] },
      { x: 'Wed', y: [10, 90] },
      { x: 'Thu', y: [40, 60] },
      { x: 'Fri', y: [25, 75] },
      { x: 'Sat', y: [15, 85] },
      { x: 'Sun', y: [20, 80] }
    ]
  }];

  const riskOptions: any = {
    chart: { type: 'rangeBar', height: 80, width: 80, toolbar: { show: false }, sparkline: { enabled: true } },
    plotOptions: { bar: { columnWidth: '55%', distributed: true, borderRadius: 2 } },
    colors: ['#E70D0D', '#E70D0D', '#E70D0D', '#E70D0D', '#E70D0D', '#E70D0D', '#E70D0D'],
    tooltip: { enabled: true }
  };
  const riskSeries = [{
    name: 'Risk',
    data: [
      { x: 'Mon', y: [20, 75] },
      { x: 'Tue', y: [28, 68] },
      { x: 'Wed', y: [10, 85] },
      { x: 'Thu', y: [-15, 110] },
      { x: 'Fri', y: [35, 60] },
      { x: 'Sat', y: [20, 75] },
      { x: 'Sun', y: [20, 75] }
    ]
  }];

  // 4. Cost Breakdown Donut (breakdown-chart)
  const breakdownOptions: any = {
    chart: { type: 'donut', height: 220 },
    stroke: { show: true, width: 4, colors: ['#ffffff'], lineCap: 'round' },
    colors: ['#0B4F6C', '#FFC107', '#1B84FF', '#FF6B2C'],
    labels: ['Salary', 'Taxes', 'Bonuses', 'Benefits'],
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: { enabled: true }
  };
  const breakdownSeries = [70, 10, 14, 6];

  return (
    <div className="dashboard-scope page-wrapper" style={{ minHeight: '100vh' }}>
      <div className="content">
        
				<div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
					<div className="my-auto mb-2">
						<h2 className="mb-1">AI Payroll Forecast</h2>
						<nav>
							<ol className="breadcrumb mb-0">
								<li className="breadcrumb-item">
									<a href="/tenant/dashboard"><i className="ti ti-smart-home"></i></a>
								</li>
								<li className="breadcrumb-item">
									AI Center
								</li>
								<li className="breadcrumb-item active" aria-current="page">AI Payroll Forecast</li>
							</ol>
						</nav>
					</div>
					<div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
						<div className="me-2 mb-2">
							<div className="dropdown">
								<a href="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
									data-bs-toggle="dropdown">
									<i className="ti ti-file-export me-1"></i>Full Report
								</a>
								<ul className="dropdown-menu  dropdown-menu-end p-3">
									<li>
										<a href="#" className="dropdown-item rounded-1"><i className="ti ti-file-type-pdf me-1"></i>Export as PDF</a>
									</li>
									<li>
										<a href="#" className="dropdown-item rounded-1"><i className="ti ti-file-type-xls me-1"></i>Export as Excel </a>
									</li>
								</ul>
							</div>
						</div>
						<a href="#" className="btn btn-primary-gradient mb-2"><i className="ti ti-refresh me-2"></i>Reforecast</a>
						<div className="ms-2 mb-2 head-icons">
							<a href="#" className="" data-bs-toggle="tooltip" data-bs-placement="top"
								data-bs-original-title="Collapse" id="collapse-header">
								<i className="ti ti-chevrons-up"></i>
							</a>
						</div>
					</div>
				</div>
				

				<div className="row">
				
					<div className="col-xxl-12">
						<div className="card flex-fill">
							<div className="card-body">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
									<div>
										<h3 className="sub-title d-inline-flex align-items-center mb-1"><i className="ti ti-file-dollar text-primary fs-20 me-1"></i>Budget Alerts</h3>
										<p>AI-powered insights</p>
									</div>
									<div className="dropdown">
										<a href="#" className="border btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown">
											<i className="ti ti-calendar me-1 fs-14"></i>July 2026
										</a>
										<ul className="dropdown-menu  dropdown-menu-end p-3">
											<li>
												<a href="#" className="dropdown-item rounded-1">July 2026</a>
											</li>
											<li>
												<a href="#" className="dropdown-item rounded-1">Aug 2026</a>
											</li>
											<li>
												<a href="#" className="dropdown-item rounded-1"> Sep 2026</a>
											</li>
										</ul>
									</div>
								</div>

								<div className="row g-4">

									<div className="col-xl-3 col-sm-6 d-flex">
										<div className="card bg-danger z-1 border-0 mb-0 flex-fill">
											<div className="card-body">
												<p className="text-white fw-semibold mb-1">Under Budget</p>
												<p className="text-white mb-0">Dev team 3% below forecast</p>
											</div>
											<img src="assets/img/bg/card-bg-08.png" alt="bg" className="img-fluid position-absolute top-0 end-0 z-n1 w-auto h-auto" />
											<div className="budget-bg bg-danger-900"></div>
										</div> 
									</div> 									

									<div className="col-xl-3 col-sm-6 d-flex">
										<div className="card bg-success z-1 border-0 mb-0 flex-fill">
											<div className="card-body">
												<p className="text-white fw-semibold mb-1">Over Budget</p>
												<p className="text-white mb-0">Sales bonuses exceeded by 8%</p>
											</div>
											<img src="assets/img/bg/card-bg-08.png" alt="bg" className="img-fluid position-absolute top-0 end-0 z-n1 w-auto h-auto" />
											<div className="budget-bg bg-success-900"></div>
										</div> 
									</div> 									

									<div className="col-xl-3 col-sm-6 d-flex">
										<div className="card bg-purple z-1 border-0 mb-0 flex-fill">
											<div className="card-body">
												<p className="text-white fw-semibold mb-1">Trending Up</p>
												<p className="text-white mb-0">Q3 costs predicted +5.2%</p>
											</div>
											<img src="assets/img/bg/card-bg-08.png" alt="bg" className="img-fluid position-absolute top-0 end-0 z-n1 w-auto h-auto" />
											<div className="budget-bg bg-purple-900"></div>
										</div> 
									</div> 									

									<div className="col-xl-3 col-sm-6 d-flex">
										<div className="card bg-info z-1 border-0 mb-0 flex-fill">
											<div className="card-body">
												<p className="text-white fw-semibold mb-1">Review Needed</p>
												<p className="text-white mb-0">Benefits costs up 12% YoY</p>
											</div>
											<img src="assets/img/bg/card-bg-08.png" alt="bg" className="img-fluid position-absolute top-0 end-0 z-n1 w-auto h-auto" />
											<div className="budget-bg bg-info-900"></div>
										</div> 
									</div> 

								</div>
							</div>
						</div>
					</div>

				</div>		

				<div className="card">
					<div className="card-body pb-0">

						<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
							<div>
								<h3 className="sub-title d-inline-flex align-items-center mb-1"><i className="ti ti-server text-primary fs-20 me-1"></i>Payroll Forecast</h3>
								<p>Predictive payroll modelling with 94.2% confidence · LSTM time-series model · Updated 14 May 2026</p>
							</div>
							<div className="dropdown">
								<a href="#" className="border btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown">
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
						
						<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
							<div className="d-flex align-items-center flex-wrap gap-3">
								<p className="fw-medium d-inline-flex align-items-center gap-2 mb-0">Actual Payroll <span className="text-primary custom-title fw-semibold">9.6M</span></p>
								<p className="fw-medium d-inline-flex align-items-center gap-2 mb-0">Forecast Payroll <span className="text-secondary custom-title fw-semibold">12.6M</span></p>
								<p className="fw-medium d-inline-flex align-items-center gap-2 mb-0">Confidence Band <span className="text-info custom-title fw-semibold">95%</span></p>
							</div>
							<div className="d-flex align-items-center flex-wrap gap-3">
								<p className="d-inline-flex align-items-center gap-1 mb-0"><span className="line-icon d-inline-block bg-primary"></span>Actual Payroll</p>
								<p className="d-inline-flex align-items-center gap-1 mb-0"><span className="line-icon d-inline-block bg-secondary"></span>AI Forecast</p>
							</div>

						</div>
						<div id="payroll-forecast"><Chart options={payrollForecastOptions} series={payrollForecastSeries} type="line" height={320} /></div>
					</div>
				</div> 

				<div className="row">

					<div className="col-xxl-6 col-xl-12 d-flex">
						<div className="card flex-fill">
							<div className="card-body pb-0">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
									<div>
										<h3 className="sub-title d-inline-flex align-items-center mb-1"><i className="ti ti-server text-primary fs-20 me-1"></i>Variance Analysis</h3>
										<p>Budget vs actual comparison</p>
									</div>
									<div className="d-flex align-items-center gap-2">
										<span className="badge border fs-14 fw-normal text-body"><i className="ti ti-square-filled text-primary fs-12 me-1"></i>Budget</span>
										<span className="badge border fs-14 fw-normal text-body"><i className="ti ti-square-filled text-secondary fs-12 me-1"></i>Actual</span>
									</div>
									<div className="dropdown">
										<a href="#" className="border btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown">
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
								<div id="variance-chart"><Chart options={varianceOptions} series={varianceSeries} type="bar" height={280} /></div>
							</div>
						</div>
					</div> 
				
					<div className="col-xxl-6 d-flex flex-column">

						<div className="row flex-fill">

							<div className="col-sm-6 d-flex">
								<div className="card flex-fill">
									<div className="card-body">

										<div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
											<div className="avatar bg-primary oval-rounded">
												<i className="ti ti-clock-share fs-20"></i>
											</div>
											<p className="text-dark fs-16 fw-semibold">Recent Forecast</p>
										</div>
										<div className="d-flex align-items-center justify-content-between">
											<div>
												<h2 className="mb-1">$2.41M</h2>
												<div className="d-flex align-items-center gap-1 flex-wrap">
													<span className="badge badge-success-transparent">2.3%<i className="ti ti-arrow-up-right ms-1"></i></span>
													<p> vs Apr</p>
												</div>
											</div>
											<div id="forecast-chart"><Chart options={forecastOptions} series={forecastSeries} type="rangeBar" height={60} width={80} /></div>
										</div>
									</div> 
								</div> 
							</div> 

							<div className="col-sm-6 d-flex">
								<div className="card flex-fill">
									<div className="card-body">

										<div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
											<div className="avatar bg-secondary oval-rounded">
												<i className="ti ti-api-app fs-20"></i>
											</div>
											<p className="text-dark fs-16 fw-semibold">Q2 Projection</p>
										</div>
										<div className="d-flex align-items-center justify-content-between">
											<div>
												<h2 className="mb-1">$7.18M</h2>
												<p className="fs-13">Within Budget</p>
											</div>
											<div id="projection-chart"><Chart options={projectionOptions} series={projectionSeries} type="rangeBar" height={60} width={80} /></div>
										</div>
									</div> 
								</div> 
							</div> 

							<div className="col-sm-6 d-flex">
								<div className="card flex-fill">
									<div className="card-body">

										<div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
											<div className="avatar bg-info oval-rounded">
												<i className="ti ti-badge fs-20"></i>
											</div>
											<p className="text-dark fs-16 fw-semibold">Overtime Est</p>
										</div>
										<div className="d-flex align-items-center justify-content-between">
											<div>
												<h2 className="mb-1">$84K</h2>
												<div className="d-flex align-items-center gap-1 flex-wrap">
													<span className="badge badge-danger-transparent">−12%<i className="ti ti-arrow-down-right ms-1"></i></span>
													<p>Vs Forecast</p>
												</div>
											</div>
											<div id="overtime-chart"><Chart options={overtimeOptions} series={overtimeSeries} type="rangeBar" height={60} width={80} /></div>
										</div>
									</div> 
								</div> 
							</div> 

							<div className="col-sm-6 d-flex">
								<div className="card flex-fill">
									<div className="card-body">

										<div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
											<div className="avatar bg-danger oval-rounded">
												<i className="ti ti-briefcase-2 fs-20"></i>
											</div>
											<p className="text-dark fs-16 fw-semibold">Variance Risk</p>
										</div>
										<div className="d-flex align-items-center justify-content-between">
											<div>
												<h2 className="mb-1">1.2%</h2>
												<p className="fs-13">Low Risk Band</p>
											</div>
											<div id="risk-chart"><Chart options={riskOptions} series={riskSeries} type="rangeBar" height={80} width={80} /></div>
										</div>
									</div> 
								</div> 
							</div> 

						</div>
					</div>

				</div>	

				<div className="row">
				
					<div className="col-xxl-6 col-xl-7 d-flex">
						<div className="card flex-fill">
							<div className="card-body">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
									<div>
										<h3 className="sub-title d-inline-flex align-items-center mb-1"><i className="ti ti-server text-primary fs-20 me-1"></i>Department Payroll Costs</h3>
										<p>Monthly allocation by team</p>
									</div>
									<a href="#" className="border btn btn-light btn-icon btn-sm d-inline-flex align-items-center justify-content-center rounded-circle">
										<i className="ti ti-arrow-up-right fs-16"></i>
									</a>
								</div>
								<div className="w-100 d-flex flex-column flex-sm-row">
									<div className="payroll-item col-development flex-grow-1 px-2 position-relative">
										<p className="fs-16 fw-semibold text-dark mb-1">$105000</p>
										<p className="fs-12 mb-5">Development</p>
										<p className="fs-13 text-success mb-4"><i className="ti ti-circle-arrow-up me-1"></i>32.1%</p>
										<div className="progress progress-xl rounded mb-2 mb-sm-0" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100">
											<div className="progress-bar progress-bar-striped bg-primary" style={{"width":"100%"}}></div>
										</div>
									</div>

									<div className="payroll-item flex-grow-1 px-2 position-relative">
										<p className="fs-16 fw-semibold text-dark mb-1">$70000</p>
										<p className="fs-12 mb-5">Sales</p>
										<p className="fs-13 text-danger mb-4"><i className="ti ti-circle-arrow-down me-1"></i>16%</p>
										<div className="progress progress-xl rounded mb-2 mb-sm-0" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100">
											<div className="progress-bar progress-bar-striped bg-secondary" style={{"width":"100%"}}></div>
										</div>
									</div>

									<div className="payroll-item flex-grow-1 px-2 position-relative">
										<p className="fs-16 fw-semibold text-dark mb-1">$35000</p>
										<p className="fs-12 mb-5">Marketing</p>
										<p className="fs-13 text-success mb-4"><i className="ti ti-circle-arrow-up me-1"></i>15.3%</p>
										<div className="progress progress-xl rounded mb-2 mb-sm-0" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100">
											<div className="progress-bar progress-bar-striped bg-warning" style={{"width":"100%"}}></div>
										</div>
									</div>

									<div className="payroll-item flex-grow-1 px-2 position-relative">
										<p className="fs-16 fw-semibold text-dark mb-1">$12000</p>
										<p className="fs-12 mb-5">Support</p>
										<p className="fs-13 text-success mb-4"><i className="ti ti-circle-arrow-up me-1"></i>12.1%</p>
										<div className="progress progress-xl rounded mb-2 mb-sm-0" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100">
											<div className="progress-bar progress-bar-striped bg-info" style={{"width":"100%"}}></div>
										</div>
									</div>

									<div className="payroll-item flex-grow-1 px-2 position-relative">
										<p className="fs-16 fw-semibold text-dark mb-1">$8000</p>
										<p className="fs-12 mb-5">Operations</p>
										<p className="fs-13 text-success mb-4"><i className="ti ti-circle-arrow-up me-1"></i>8.4%</p>
										<div className="progress progress-xl rounded mb-2 mb-sm-0" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100">
											<div className="progress-bar progress-bar-striped bg-purple" style={{"width":"100%"}}></div>
										</div>
									</div>

								</div>

							</div>
						</div>
					</div>

					<div className="col-xxl-6 col-xl-5 d-flex">
						<div className="card flex-fill">
							<div className="card-body">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
									<div>
										<h3 className="sub-title d-inline-flex align-items-center mb-1"><i className="ti ti-server text-primary fs-20 me-1"></i>Cost Breakdown</h3>
										<p>Current month distribution</p>
									</div>
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
								<div className="row align-items-center">
									<div className="col-sm-6">
										<div id="breakdown-chart"><Chart options={breakdownOptions} series={breakdownSeries} type="donut" height={220} /></div>
									</div>
									<div className="col-sm-6">
										<div className="breakdown-labels vstack gap-3">
											<div className="d-flex align-items-center justify-content-between">
												<p className="fs-13 mb-0 d-inline-block"><i className="ti ti-circle-filled text-secondary fs-10 me-1"></i>Salary</p>
												<p className="fs-12 mb-0 d-flex align-items-center gap-2 text-dark"><span className="lebel-line d-inline-block flex-grow-1"></span>70.%</p>
											</div>
											<div className="d-flex align-items-center justify-content-between">
												<p className="fs-13 mb-0 d-inline-block"><i className="ti ti-circle-filled text-warning fs-10 me-1"></i>Taxes</p>
												<p className="fs-12 mb-0 d-flex align-items-center gap-2 text-dark"><span className="lebel-line d-inline-block flex-grow-1"></span>10%</p>
											</div>
											<div className="d-flex align-items-center justify-content-between">
												<p className="fs-13 mb-0 d-inline-block"><i className="ti ti-circle-filled text-info fs-10 me-1"></i>Bonuses</p>
												<p className="fs-12 mb-0 d-flex align-items-center gap-2 text-dark"><span className="lebel-line d-inline-block flex-grow-1"></span>14%</p>
											</div>
											<div className="d-flex align-items-center justify-content-between">
												<p className="fs-13 mb-0 d-inline-block"><i className="ti ti-circle-filled text-primary fs-10 me-1"></i>Benefits</p>
												<p className="fs-12 mb-0 d-flex align-items-center gap-2 text-dark"><span className="lebel-line d-inline-block flex-grow-1"></span>6%</p>
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
  );
}
