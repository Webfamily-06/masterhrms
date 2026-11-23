'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function AIAttendanceInsightsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Rate Chart Options (sparkline bar)
  const rateChartOptions: any = {
    colors: ['#FF7129'],
    chart: {
      height: 60,
      type: 'bar',
      toolbar: { show: false },
      sparkline: { enabled: true },
    },
    plotOptions: {
      bar: {
        columnWidth: '80%',
        borderRadius: 5,
        horizontal: false,
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { show: false }
    },
    yaxis: { min: 0, max: 100, labels: { show: false } },
    grid: { show: false },
    legend: { show: false },
    tooltip: { enabled: true }
  };
  const rateChartSeries = [{
    name: 'Amount',
    data: [30, 60, 30, 40, 100, 80, 90, 50, 60, 40, 30, 60]
  }];

  // 2. Day Chart Options (sparkline bar)
  const dayChartOptions: any = {
    colors: ['#0C4B5E'],
    chart: {
      height: 60,
      type: 'bar',
      toolbar: { show: false },
      sparkline: { enabled: true },
    },
    plotOptions: {
      bar: {
        columnWidth: '80%',
        borderRadius: 10,
        horizontal: false,
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { show: false }
    },
    yaxis: { min: 0, max: 100, labels: { show: false } },
    grid: { show: false },
    legend: { show: false },
    tooltip: { enabled: true }
  };
  const dayChartSeries = [{
    name: 'Present',
    data: [80, 40, 20, 40, 100, 50, 40]
  }];

  // 3. Weekly Attendance Pattern (combo column & line)
  const weeklyAttendanceOptions: any = {
    chart: {
      height: 290,
      type: 'line',
      toolbar: { show: false },
      fontFamily: 'inherit'
    },
    colors: ['#0C4B5E', '#A1BCC7', '#F58229'],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '40%',
        borderRadius: 4,
        borderRadiusApplication: 'around'
      }
    },
    stroke: {
      width: [0, 0, 2],
      curve: 'straight'
    },
    markers: {
      size: [0, 0, 5],
      strokeWidth: 0,
      hover: { sizeOffset: 2 }
    },
    grid: {
      borderColor: '#EAEAEA',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } }
    },
    xaxis: {
      categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: ['#666666', '#666666', '#666666', '#F58229', '#666666', '#666666', '#666666'],
          fontSize: '13px',
          fontWeight: 500
        }
      }
    },
    yaxis: {
      min: 0,
      max: 8,
      tickAmount: 4,
      labels: {
        offsetX: -15,
        style: { colors: '#666666', fontSize: '13px' },
        formatter: (value: number) => value === 0 ? "0" : value + "K"
      }
    },
    legend: { show: false },
    dataLabels: { enabled: false }
  };
  const weeklyAttendanceSeries = [
    {
      name: 'Present',
      type: 'column',
      data: [7.6, 5.1, 3.3, 2.8, 2.8, 3.1, 6.7]
    },
    {
      name: 'Absent',
      type: 'column',
      data: [2.0, 1.0, 5.2, 0.8, 1.4, 0.8, 1.5]
    },
    {
      name: 'Late',
      type: 'line',
      data: [3.5, 1.9, 3.6, 0.8, 1.7, 1.0, 1.7]
    }
  ];

  // 4. Attendance Statistics (area gradient)
  const attendanceStatisticsOptions: any = {
    chart: {
      type: 'area',
      height: 230,
      toolbar: { show: false },
    },
    colors: ['#FF7A38', '#1B4D5A'],
    stroke: {
      curve: 'smooth',
      width: 2
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        type: 'vertical',
        opacityFrom: 0.85,
        opacityTo: 0.15,
        colorStops: [
          [
            { offset: 0, color: '#F58229', opacity: 0.4 },
            { offset: 1, color: '#FEF1EB', opacity: 0.9 }
          ],
          [
            { offset: 0, color: '#0C4B5E', opacity: 0.3 },
            { offset: 1, color: '#EDF2F4', opacity: 0.9 }
          ]
        ]
      }
    },
    dataLabels: { enabled: false },
    markers: {
      size: 5,
      strokeWidth: 0,
      hover: { size: 7 }
    },
    grid: {
      borderColor: '#EAEAEA',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } }
    },
    xaxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: '#666666',
          fontSize: '12px'
        }
      }
    },
    yaxis: {
      min: 100,
      max: 600,
      tickAmount: 5,
      labels: {
        offsetX: -15,
        style: { colors: '#666666', fontSize: '12px' }
      }
    },
    legend: { show: false },
  };
  const attendanceStatisticsSeries = [
    {
      name: 'Present',
      data: [490, 460, 380, 400, 390, 428, 380, 330, 410, 415, 410, 240]
    },
    {
      name: 'Absent',
      data: [235, 215, 190, 195, 195, 201, 190, 170, 200, 200, 200, 130]
    }
  ];

  // 5. Absenteeism Analysis Donut (analytics-chart)
  const analyticsOptions: any = {
    chart: {
      type: 'donut',
      height: 250,
    },
    labels: ['Vacation', 'Personal', 'Sick Leave', 'Emergency'],
    colors: ['#E5A913', '#1DB469', '#3291F2', '#F27032'],
    stroke: {
      show: true,
      width: 3,
      colors: ['#fff']
    },
    plotOptions: {
      pie: {
        expandOnClick: false,
        donut: {
          size: '60%',
        },
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => Math.round(val) + "%",
      style: {
        fontSize: '12px',
        fontWeight: 'bold',
      },
      dropShadow: { enabled: false }
    },
    legend: { show: false },
  };
  const analyticsSeries = [16, 8, 12, 64];

  // 6. On-Time & Late Department (department-chart)
  const departmentOptions: any = {
    chart: {
      type: 'bar',
      height: 300,
      stacked: true,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '42%',
        borderRadius: 6,
        borderRadiusApplication: 'around',
        borderRadiusWhenStacked: 'all',
      }
    },
    colors: ['#1A84FF', '#FFC107', '#E5E7EB'],
    dataLabels: { enabled: false },
    grid: {
      show: true,
      borderColor: '#EAEAEA',
      strokeDashArray: 3,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } },
      padding: { top: -10, left: 10, right: 10, bottom: 0 }
    },
    xaxis: {
      categories: ['Sales', 'Development', 'Marketing', 'Support'],
      min: 0,
      max: 1200,
      tickAmount: 6,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: '#666666', fontSize: '13px' }
      }
    },
    yaxis: {
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: '#000000', fontSize: '14px', fontWeight: 500 }
      }
    },
    legend: { show: false }
  };
  const departmentSeries = [
    { name: 'On-Time', data: [620, 670, 460, 650] },
    { name: 'Late', data: [300, 70, 95, 80] },
    { name: 'Remaining Track', data: [230, 410, 595, 420] }
  ];

  return (
    <div className="dashboard-scope page-wrapper" style={{ minHeight: '100vh' }}>
      <div className="content">
        
				<div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
					<div className="my-auto mb-2">
						<h2 className="mb-1">AI Attendance Insights</h2>
						<nav>
							<ol className="breadcrumb mb-0">
								<li className="breadcrumb-item">
									<a href="/tenant/dashboard"><i className="ti ti-smart-home"></i></a>
								</li>
								<li className="breadcrumb-item">
									AI Center
								</li>
								<li className="breadcrumb-item active" aria-current="page">AI Attendance Insights</li>
							</ol>
						</nav>
					</div>
					<div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
						<div className="me-2 mb-2">
							<div className="dropdown">
								<a href="#"
									className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
									data-bs-toggle="dropdown">
									<i className="ti ti-file-export me-1"></i>Export
								</a>
								<ul className="dropdown-menu  dropdown-menu-end p-3">
									<li>
										<a href="#" className="dropdown-item rounded-1"><i
												className="ti ti-file-type-pdf me-1"></i>Export as PDF</a>
									</li>
									<li>
										<a href="#" className="dropdown-item rounded-1"><i
												className="ti ti-file-type-xls me-1"></i>Export as Excel </a>
									</li>
								</ul>
							</div>
						</div>
						<a href="#" className="btn btn-primary-gradient mb-2"><i className="ti ti-refresh me-2"></i>Run AI Scan</a>
						<div className="ms-2 mb-2 head-icons">
							<a href="#" className="" data-bs-toggle="tooltip" data-bs-placement="top"
								data-bs-original-title="Collapse" id="collapse-header">
								<i className="ti ti-chevrons-up"></i>
							</a>
						</div>
					</div>
				</div>
				

				<div className="row">
				
					<div className="col-xxl-6 d-flex flex-column">
						<div className="row flex-fill">
							<div className="col-sm-6 d-flex">
								<div className="card flex-fill">
									<div className="card-body">
										<div className="d-flex align-items-center justify-content-between border-bottom mb-3 pb-3">
											<div className="d-flex align-items-center">
												<span className="py-2 px-1 rounded-pill bg-primary me-2">
													<i className="ti ti-users-group fs-16"></i>
												</span>
												<p className="fs-12">Overall Rate</p>
											</div>
											<h3 className="card-title mb-0">91.4%</h3>
										</div>
										
										<div className="mb-3"><Chart options={rateChartOptions} series={rateChartSeries} type="bar" height={60} /></div>
										<div className="d-flex align-items-center gap-1 flex-wrap">
											<span className="badge badge-success-transparent">2.3%<i className="ti ti-arrow-up-right ms-1"></i></span>
											<p> vs last month</p>
										</div>
									</div>
								</div>
							</div> 

							<div className="col-sm-6 d-flex">
								<div className="card flex-fill">
									<div className="card-body">
										<div className="d-flex align-items-center justify-content-between border-bottom mb-3 pb-3">
											<div className="d-flex align-items-center">
												<span className="py-2 px-1 rounded-pill bg-secondary me-2">
													<i className="ti ti-user-check fs-16"></i>
												</span>
												<p className="fs-12">Present Today</p>
											</div>
											<h3 className="card-title mb-0">774</h3>
										</div>
										<div className="mb-3"><Chart options={dayChartOptions} series={dayChartSeries} type="bar" height={60} /></div>
										<div className="d-flex align-items-center gap-1 flex-wrap">
											<span className="badge badge-success-transparent">4.2%<i className="ti ti-arrow-up-right ms-1"></i></span>
											<p>of workforce</p>
										</div>
									</div>
								</div>
							</div> 

							<div className="col-sm-6 d-flex">
								<div className="card bg-dark border-0 z-1 flex-fill">
									<div className="card-body">
										<div className="d-flex align-items-center justify-content-between mb-4">
											<div>
												<p className="fw-semibold text-white mb-1">On Leave</p>
												<h3 className="main-title text-white">42</h3>
											</div>
											<span className="avatar rounded-circle bg-primary mb-2">
												<i className="ti ti-user-cancel fs-20"></i>
											</span>
										</div>
										<div className="d-flex align-items-center gap-2 flex-wrap">
											<span className="badge badge-danger-transparent">10.1%<i className="ti ti-arrow-down-right ms-1"></i></span>
											<p className="text-white">less vs last month</p>
										</div>
										<img src="assets/img/bg/card-bg-06.png" alt="bg" className="img-fluid position-absolute top-0 end-0 z-n1 w-autp h-auto" />
									</div>
								</div>
							</div>

							<div className="col-sm-6 d-flex">
								<div className="card bg-secondary border-0 z-1 flex-fill">
									<div className="card-body">
										<div className="d-flex align-items-center justify-content-between mb-4">
											<div>
												<p className="fw-semibold text-white mb-1">Late Arrivals</p>
												<h3 className="main-title text-white">14</h3>
											</div>
											<span className="avatar rounded-circle bg-white mb-2">
												<i className="ti ti-clock-hour-4 text-dark fs-20"></i>
											</span>
										</div>
										<div className="d-flex align-items-center gap-2 flex-wrap">
											<span className="badge badge-danger-transparent">21.1%<i className="ti ti-arrow-down-right ms-1"></i></span>
											<p className="text-white">less vs last month</p>
										</div>
										<img src="assets/img/bg/card-bg-06.png" alt="bg" className="img-fluid position-absolute top-0 end-0 z-n1 w-autp h-full" />
									</div>
								</div>
							</div>
						</div>
					</div>
					

					<div className="col-xxl-6 d-flex">
						<div className="card flex-fill">
							<div className="card-body pb-0">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
									<h3 className="sub-title mb-0">Weekly Attendance Pattern</h3>
									<div className="dropdown">
										<a href="#"
											className="border btn btn-white btn-md fw-normal d-inline-flex align-items-center justify-content-center rounded gap-1 fw-medium" data-bs-toggle="dropdown"> <i className="ti ti-calendar fs-14"></i> Weekly
										</a>
										<ul className="dropdown-menu mt-2 p-3">
											<li>
												<a href="#" className="dropdown-item rounded-1">
													Today
												</a>
											</li>
											<li>
												<a href="#" className="dropdown-item rounded-1">
													Weekly
												</a>
											</li>
											<li>
												<a href="#" className="dropdown-item rounded-1">
													Monthly
												</a>
											</li>
										</ul>
									</div>
								</div>
								<div className="d-flex align-items-center gap-2 flex-wrap">
									<p className="text-dark mb-0"><i className="ti ti-circle-filled fs-12 text-secondary me-1"></i>Present</p>
									<p className="text-dark mb-0"><i className="ti ti-circle-filled fs-12 text-secondary-500 me-1"></i>Absent</p>
									<p className="text-dark mb-0"><i className="ti ti-circle-filled fs-12 text-primary me-1"></i>Late</p>
								</div>
								<div id="weekly-attendance"><Chart options={weeklyAttendanceOptions} series={weeklyAttendanceSeries} type="line" height={290} /></div>
							</div>
						</div>
					</div> 

				</div>

				<div className="row">

					<div className="col-xxl-8 col-xl-7 d-flex">
						<div className="card flex-fill">
							<div className="card-body pb-0">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
									<h3 className="sub-title mb-0">Attendance Statistics</h3>
									<div className="d-flex align-items-center gap-2">
										<span className="badge border fs-14 fw-normal text-body"><i className="ti ti-square-filled text-primary fs-12 me-1"></i>Present</span>
										<span className="badge border fs-14 fw-normal text-body"><i className="ti ti-square-filled text-secondary fs-12 me-1"></i>Absent</span>
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
								<div id="attendance-statistics"><Chart options={attendanceStatisticsOptions} series={attendanceStatisticsSeries} type="area" height={230} /></div>
							</div>
						</div>
					</div> 
				
					<div className="col-xxl-4 col-xl-5 d-flex">
						<div className="card flex-fill">
							<div className="card-body">

								<div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
									<h3>Detected Irregularities</h3>
									<div className="dropdown">
										<a href="#" className="border btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown">
											<i className="ti ti-calendar me-1 fs-14"></i>Today
										</a>
										<ul className="dropdown-menu  dropdown-menu-end p-3">
											<li>
												<a href="#" className="dropdown-item rounded-1">Today</a>
											</li>
											<li>
												<a href="#" className="dropdown-item rounded-1">Weekly</a>
											</li>
											<li>
												<a href="#" className="dropdown-item rounded-1">Monthly</a>
											</li>
										</ul>
									</div>
								</div>
								<div className="vstack gap-3">
									<div className="d-flex align-items-sm-center gap-3 ps-2 flex-column flex-sm-row border-start border-3 border-warning">
										<div className="flex-shrink-0">
											<p className="fw-medium text-dark mb-0">09:47 AM</p>
										</div>
										<div>
											<p className="fw-semibold text-dark mb-1">Repeated late pattern — R. Mehta</p>
											<p className="fs-13 mb-0">4th consecutive late arrival this week (&gt;30 min)</p>
										</div>
									</div>
									<div className="d-flex align-items-sm-center gap-3 ps-2 flex-column flex-sm-row border-start border-3 border-danger">
										<div className="flex-shrink-0">
											<p className="fw-medium text-dark mb-0">09:47 AM</p>
										</div>
										<div>
											<p className="fw-semibold text-dark mb-1">Early departure cluster — Ops team</p>
											<p className="fs-13 mb-0">3 members clocked out 2h early yesterday</p>
										</div>
									</div>
									<div className="d-flex align-items-sm-center gap-3 ps-2 flex-column flex-sm-row border-start border-3 border-info">
										<div className="flex-shrink-0">
											<p className="fw-medium text-dark mb-0">09:47 AM</p>
										</div>
										<div>
											<p className="fw-semibold text-dark mb-1">Overtime spike — Engineering</p>
											<p className="fs-13 mb-0">Average 11.2 hrs/day — release week pattern</p>
										</div>
									</div>
									<div className="d-flex align-items-sm-center gap-3 ps-2 flex-column flex-sm-row border-start border-3 border-purple">
										<div className="flex-shrink-0">
											<p className="fw-medium text-dark mb-0">09:47 AM</p>
										</div>
										<div>
											<p className="fw-semibold text-dark mb-1">Untracked check-out — 3 employees</p>
											<p className="fs-13 mb-0">No exit scan recorded on 13 May</p>
										</div>
									</div>

								</div>
							</div>
						</div>
					</div>

				</div>

				<div className="card bg-linear-gradient-100 overflow-hidden border-0 z-1">
					<div className="card-body p-4 p-md-5 d-flex align-items-center justify-content-md-between justify-content-center text-center text-md-start gap-3 flex-column flex-md-row">
						<div>
							<h3 className="text-white mb-1">Real-Time Attendance Dashboard</h3>
							<p className="text-white mb-3">Monitor live check-ins, track patterns, and receive instant alerts</p>
							<a href="#" className="border btn btn-white btn-md d-inline-flex align-items-center">View Realtime Dashboard<i className="ti ti-arrow-right ms-2"></i></a>
						</div>
						<div className="d-flex align-items-center gap-3">
							<div className="p-3 rounded text-center bg-white-100">
								<h3 className="text-white mb-1">242</h3>
								<p className="text-white">Checked In</p>
							</div>
							<div className="p-3 rounded text-center bg-white-100">
								<h3 className="text-white mb-1">8</h3>
								<p className="text-white">Pending</p>
							</div>
						</div>
						<img src="assets/img/bg/card-bg-07.png" alt="bg" className="img-fluid position-absolute top-0 start-50 translate-middle-x z-n1 w-auto h-auto" />
					</div>
				</div>

				<div className="row">
				
					<div className="col-xxl-6 col-xl-7 d-flex">
						<div className="card flex-fill">
							<div className="card-body">
								<div className="d-flex align-items-center justify-content-between flex-wrap mb-3 gap-2">
									<h3 className="sub-title mb-0">Absenteeism Analysis</h3>
									<div className="dropdown">
										<a href="#"
											className="border btn btn-white btn-md fw-normal d-inline-flex align-items-center justify-content-center rounded gap-1 fw-medium" data-bs-toggle="dropdown"> <i className="ti ti-calendar fs-14"></i> Weekly
										</a>
										<ul className="dropdown-menu mt-2 p-3">
											<li>
												<a href="#" className="dropdown-item rounded-1">
													Today
												</a>
											</li>
											<li>
												<a href="#" className="dropdown-item rounded-1">
													Weekly
												</a>
											</li>
											<li>
												<a href="#" className="dropdown-item rounded-1">
													Monthly
												</a>
											</li>
										</ul>
									</div>
								</div>
								<div className="row align-items-center">
									<div className="col-sm-6">
										<div className="vstack gap-3 me-sm-4">
											<div className="bg-primary-linear-gradient d-flex align-items-center justify-content-between p-2 rounded">
												<p className="text-dark d-inline-flex align-items-center mb-0"><i className="ti ti-square-filled text-primary fs-16 me-1"></i>Emergency</p>
												<span className="badge bg-white  text-dark">42 cases</span>
											</div>
											<div className="bg-warning-linear-gradient d-flex align-items-center justify-content-between p-2 rounded">
												<p className="text-dark d-inline-flex align-items-center mb-0"><i className="ti ti-square-filled text-warning fs-16 me-1"></i>Vacation</p>
												<span className="badge bg-white  text-dark">28 cases</span>
											</div>
											<div className="bg-success-linear-gradient d-flex align-items-center justify-content-between p-2 rounded">
												<p className="text-dark d-inline-flex align-items-center mb-0"><i className="ti ti-square-filled text-success fs-16 me-1"></i>Personal</p>
												<span className="badge bg-white  text-dark">42 cases</span>
											</div>
											<div className="bg-info-linear-gradient d-flex align-items-center justify-content-between p-2 rounded">
												<p className="text-dark d-inline-flex align-items-center mb-0"><i className="ti ti-square-filled text-info fs-16 me-1"></i>Sick Leave</p>
												<span className="badge bg-white  text-dark">42 cases</span>
											</div>

										</div>
									</div>
									<div className="col-sm-6">
										<div id="analytics-chart"><Chart options={analyticsOptions} series={analyticsSeries} type="donut" height={250} /></div>
									</div>
								</div>
								<div className="p-3 rounded border d-flex align-items-center gap-2 mt-3">
									<div className="avatar bg-light border avatar-rounded flex-shrink-0">
										<i className="ti ti-thumb-up-filled fs-24 text-primary"></i>
									</div>
									<div>
										<p className="mb-1">Absence Reasons Breakdown</p>
										<p className="text-dark">Sick leave accounts for 38% of absences. Consider wellness programs.</p>										
									</div>
								</div>
							</div>
						</div>
					</div>

					<div className="col-xxl-6 col-xl-5 d-flex">
						<div className="card flex-fill">
							<div className="card-body">
								<div className="d-flex align-items-center justify-content-between flex-wrap mb-3 gap-2">
									<h3 className="sub-title mb-0">On-Time & Late Department</h3>
									<div className="dropdown">
										<a href="#" className="border btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown">
											<i className="ti ti-calendar me-1 fs-14"></i>Today
										</a>
										<ul className="dropdown-menu  dropdown-menu-end p-3">
											<li>
												<a href="#" className="dropdown-item rounded-1">Today</a>
											</li>
											<li>
												<a href="#" className="dropdown-item rounded-1">Weekly</a>
											</li>
											<li>
												<a href="#" className="dropdown-item rounded-1">Monthly</a>
											</li>
										</ul>
									</div>
								</div>
								<div id="department-chart"><Chart options={departmentOptions} series={departmentSeries} type="bar" height={300} /></div>
								<div className="bg-info-transparent p-2 rounded border border-info">
									<p className="text-info fw-medium">Support team leads with 97%  arrival rate.</p>
								</div>
							</div>
						</div>
					</div> 

				</div>				

				<div className="card">
					<div className="card-body">

						<div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
							<h3 className="sub-title mb-0">AI Predictions & Alerts</h3>
							<div className="dropdown">
                                <a href="#" className="border btn btn-white btn-md d-inline-flex align-items-center" data-bs-toggle="dropdown">
                                    <i className="ti ti-calendar me-1 fs-14"></i>Today
                                </a>
                                <ul className="dropdown-menu  dropdown-menu-end p-3">
                                    <li>
                                        <a href="#" className="dropdown-item rounded-1">Today</a>
                                    </li>
                                    <li>
                                        <a href="#" className="dropdown-item rounded-1">Weekly</a>
                                    </li>
                                    <li>
                                        <a href="#" className="dropdown-item rounded-1">Monthly</a>
                                    </li>
                                </ul>
                            </div>
						</div>
								<div className="row g-4 justify-content-center">

									<div className="col-xl-4 col-md-6 d-flex">
										<div className="card border-bottom border-bottom-5 border-bottom-secondary mb-0 flex-fill">
											<div className="card-body">
												<div className="d-flex align-items-center justify-content-between mb-3">
													<span className="avatar avatar-xl rounded-circle bg-primary border border-8 border-primary-transparent">
														<i className="ti ti-refresh fs-20"></i>
													</span>
													<div className="dropdown">
														<a href="#" className="btn btn-white btn-icon btn-sm d-flex align-items-center justify-content-center p-0 rounded-pill" data-bs-toggle="dropdown"><i className="ti ti-dots-vertical"></i></a>
														<ul className="dropdown-menu  dropdown-menu-end p-3">
															<li>
																<a href="#" className="dropdown-item rounded-1">View</a>
															</li>
															<li>
																<a href="#" className="dropdown-item rounded-1">Delete</a>
															</li>
														</ul>
													</div>
												</div>
												<h5 className="mb-1">Predicted Absence Spike</h5>
												<p className="mb-3">15% increase in absences expected next Friday (May 21). Likely due to holiday weekend.</p>
												<div className="d-flex align-items-center flex-wrap gap-2">
													<span className="badge badge-xs badge-secondary-transparent">85% Confidence</span>
													<span className="badge badge-xs badge-secondary-transparent">7 days ahead</span>
												</div>
											</div>
										</div>
									</div> 

									<div className="col-xl-4 col-md-6 d-flex">
										<div className="card border-bottom border-bottom-5 border-bottom-purple mb-0 flex-fill">
											<div className="card-body">
												<div className="d-flex align-items-center justify-content-between mb-3">
													<span className="avatar avatar-xl rounded-circle bg-secondary border border-8 border-secondary-transparent">
														<i className="ti ti-server-bolt fs-20"></i>
													</span>
													<div className="dropdown">
														<a href="#" className="btn btn-white btn-icon btn-sm d-flex align-items-center justify-content-center p-0 rounded-pill" data-bs-toggle="dropdown"><i className="ti ti-dots-vertical"></i></a>
														<ul className="dropdown-menu  dropdown-menu-end p-3">
															<li>
																<a href="#" className="dropdown-item rounded-1">View</a>
															</li>
															<li>
																<a href="#" className="dropdown-item rounded-1">Delete</a>
															</li>
														</ul>
													</div>
												</div>
												<h5 className="mb-1">Optimal Attendance Period</h5>
												<p className="mb-3">Tuesday-Thursday shows consistently high attendance. Schedule critical meetings window.</p>
												<div className="d-flex align-items-center flex-wrap gap-2">
													<span className="badge badge-xs badge-purple-transparent">High Priority</span>
													<span className="badge badge-xs badge-purple-transparent">Actionable</span>
												</div>
											</div>
										</div>
									</div> 

									<div className="col-xl-4 col-md-6 d-flex">
										<div className="card border-bottom border-bottom-5 border-bottom-danger mb-0 flex-fill">
											<div className="card-body">
												<div className="d-flex align-items-center justify-content-between mb-3">
													<span className="avatar avatar-xl rounded-circle bg-dark border border-8 border-dark-transparent">
														<i className="ti ti-user-pause fs-20"></i>
													</span>
													<div className="dropdown">
														<a href="#" className="btn btn-white btn-icon btn-sm d-flex align-items-center justify-content-center p-0 rounded-pill" data-bs-toggle="dropdown"><i className="ti ti-dots-vertical"></i></a>
														<ul className="dropdown-menu  dropdown-menu-end p-3">
															<li>
																<a href="#" className="dropdown-item rounded-1">View</a>
															</li>
															<li>
																<a href="#" className="dropdown-item rounded-1">Delete</a>
															</li>
														</ul>
													</div>
												</div>
												<h5 className="mb-1">Late Arrival Pattern Alert</h5>
												<p className="mb-3">Development team shows 12% late arrival rate, up from 8% last month. Traffic or scheduling issue?</p>
												<div className="d-flex align-items-center flex-wrap gap-2">
													<span className="badge badge-xs badge-danger-transparent">Manager Action Needed</span>
													<span className="badge badge-xs badge-danger-transparent">30-day trend</span>
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
