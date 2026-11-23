'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function AITeamPerformanceInsightsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Performance Chart (15 blocks, 11 active orange, 4 inactive)
  const performanceChartOptions: any = {
    chart: {
      type: 'bar',
      height: 16,
      width: '100%',
      toolbar: { show: false },
      sparkline: { enabled: true },
    },
    plotOptions: {
      bar: {
        distributed: true,
        columnWidth: '80%',
        borderRadius: 8,
        borderRadiusApplication: 'around',
      }
    },
    colors: [
      ({ dataPointIndex }: { dataPointIndex: number }) =>
        dataPointIndex < 11 ? '#F26522' : '#E5E7EB'
    ],
    dataLabels: { enabled: false },
    grid: { show: false },
    xaxis: { labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { show: false, max: 1 },
    tooltip: { enabled: false }
  };
  const performanceChartSeries = [{
    data: Array(15).fill(1)
  }];

  // 2. Productivity Sparkline (area)
  const productivityOptions: any = {
    chart: { type: 'area', height: 40, sparkline: { enabled: true } },
    colors: ['#0C4B5E'],
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.6, opacityTo: 0.1 } },
    dataLabels: { enabled: false },
    tooltip: { enabled: false }
  };
  const productivitySeries = [{
    name: "Performance",
    data: [10, 20, 22, 25, 23, 20, 24, 27, 24]
  }];

  // 3. Top Performers Stacked Bar (performers-chart)
  const performersOptions: any = {
    chart: { width: 80, height: 40, type: 'bar', stacked: true, toolbar: { show: false }, sparkline: { enabled: true } },
    colors: ['#AB47BC', '#F3E8FF'],
    plotOptions: { bar: { horizontal: false, columnWidth: '60%', borderRadius: 2 } },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: { enabled: false }
  };
  const performersSeries = [
    { name: 'Top', data: [12, 10, 8, 14, 10] },
    { name: 'Other', data: [8, 10, 12, 6, 10] }
  ];

  // 4. Engagement Sparkline (area)
  const engagementOptions: any = {
    chart: { type: 'area', height: 40, sparkline: { enabled: true } },
    colors: ['#03C95A'],
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.6, opacityTo: 0.1 } },
    dataLabels: { enabled: false },
    tooltip: { enabled: false }
  };
  const engagementSeries = [{
    name: 'Performance',
    data: [10, 20, 18, 25, 22, 28, 24, 26, 30]
  }];

  // 5. Goals Mini Bar (goals-chart)
  const goalsOptions: any = {
    chart: { width: 80, height: 40, type: 'bar', toolbar: { show: false }, sparkline: { enabled: true } },
    colors: ['#FF6F28'],
    plotOptions: { bar: { columnWidth: '55%', borderRadius: 2 } },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: { enabled: false }
  };
  const goalsSeries = [{
    name: 'Goals',
    data: [4, 6, 8, 5, 9]
  }];

  // 6. Performance, Productivity & Engagement (ppe-chart)
  const ppeOptions: any = {
    chart: {
      height: 320,
      type: 'bar',
      stacked: true,
      toolbar: { show: false },
      parentHeightOffset: 0
    },
    colors: ['#F37438', '#F9B291', '#FCE0D3'],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '48%',
        borderRadius: 6,
        borderRadiusApplication: 'around',
        borderRadiusWhenStacked: 'all',
      }
    },
    stroke: { show: true, width: 4, colors: ['#fff'] },
    dataLabels: { enabled: false },
    grid: {
      borderColor: '#E5E7EB',
      strokeDashArray: 5,
      padding: { top: -10, right: -10, left: -10, bottom: 0 }
    },
    legend: {
      show: true,
      position: 'bottom',
      horizontalAlign: 'center',
      fontSize: '14px',
      labels: { colors: '#111827' }
    },
    xaxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: '#111827', fontSize: '13px', fontWeight: 500 } }
    },
    yaxis: {
      min: 0,
      max: 100,
      tickAmount: 5,
      labels: {
        offsetX: -20,
        style: { colors: '#111827', fontSize: '13px', fontWeight: 500 }
      }
    },
    fill: { opacity: 1 }
  };
  const ppeSeries = [
    { name: 'Performance', data: [45, 22, 38, 8, 22, 32, 40, 10, 45, 40, 22, 40] },
    { name: 'Productivity', data: [18, 16, 8, 40, 16, 40, 25, 35, 26, 10, 28, 16] },
    { name: 'Engagement', data: [15, 14, 42, 6, 16, 28, 18, 6, 15, 16, 16, 38] }
  ];

  // 7. Productivity & Quality Chart (Area)
  const prodQualityOptions: any = {
    chart: { height: 300, type: 'area', toolbar: { show: false }, zoom: { enabled: false } },
    colors: ['#0F5B78', '#FF6B1A'],
    dataLabels: { enabled: false },
    stroke: { curve: 'straight', width: 1, dashArray: [4, 4] },
    fill: { type: 'solid', opacity: [0.06, 0.04] },
    grid: {
      borderColor: '#E5E7EB',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      padding: { top: 0, right: 10, bottom: 0, left: -10 }
    },
    legend: { show: false },
    xaxis: {
      categories: ['', 'Jan', '', '', 'Feb', '', '', 'Mar', '', ''],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: '#6B7280', fontSize: '13px', fontWeight: 500 } }
    },
    yaxis: {
      min: 0,
      max: 100,
      tickAmount: 5,
      labels: { offsetX: -15, style: { colors: '#6B7280', fontSize: '13px', fontWeight: 500 } }
    },
    tooltip: { enabled: false }
  };
  const prodQualitySeries = [
    { name: 'Productivity', data: [66, 74, 90, 66, 67, 82, 80, 103, 84, 100] },
    { name: 'Quality', data: [36, 44, 66, 50, 53, 41, 56, 78, 55, 74] }
  ];

  // 8. Team Collaboration Scores (Scatter Dot-Matrix)
  const orangeData: any[] = [];
  const blueData: any[] = [];
  [68, 45, 95, 88, 52].forEach((val, i) => {
    for (let y = 4; y <= val; y += 7) {
      orangeData.push([i + 1 - 0.1, y]);
    }
  });
  [38, 24, 68, 24, 31].forEach((val, i) => {
    for (let y = 4; y <= val; y += 7) {
      blueData.push([i + 1 + 0.1, y]);
    }
  });

  const teamCollabOptions: any = {
    chart: { type: 'scatter', height: 260, toolbar: { show: false }, zoom: { enabled: false } },
    colors: ['#F97316', '#0F5B78'],
    markers: { size: 7, strokeWidth: 0, hover: { size: 10 } },
    dataLabels: { enabled: false },
    legend: { show: false },
    xaxis: {
      type: 'numeric',
      min: 0,
      max: 6,
      tickAmount: 6,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        formatter: (val: number) => {
          const categories = ['Dev', 'Operations', 'Sales', 'Marketing', 'Support'];
          return categories[Math.round(val) - 1] || '';
        },
        style: { colors: '#6B7280', fontSize: '13px', fontWeight: 500 }
      }
    },
    yaxis: {
      min: 0,
      max: 100,
      tickAmount: 5,
      labels: { offsetX: -15, style: { colors: '#6B7280', fontSize: '13px', fontWeight: 500 } }
    },
    grid: { borderColor: '#E5E7EB', strokeDashArray: 4, padding: { left: 10, right: 10, top: -10, bottom: 0 } },
    tooltip: { enabled: false }
  };
  const teamCollabSeries = [
    { name: 'Performance', data: orangeData },
    { name: 'Productivity', data: blueData }
  ];

  // 9. Goal Completion (radialBar)
  const goalCompletionOptions: any = {
    chart: { height: 210, type: 'radialBar', parentHeightOffset: 0 },
    series: [80, 65, 50],
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 225,
        hollow: { size: '28%' },
        track: { background: '#eeeeee', strokeWidth: '100%', margin: 10 },
        dataLabels: {
          name: { show: false },
          value: {
            show: true,
            fontSize: '28px',
            fontWeight: 600,
            color: '#222',
            offsetY: 10,
            formatter: () => '80%'
          }
        }
      }
    },
    stroke: { lineCap: 'round' },
    colors: ['#ff6720', '#3c7280', '#f4c542'],
    labels: ['Completed', 'Pending', 'Closed']
  };
  const goalCompletionSeries = [80, 65, 50];

  // 10. Productivity & Quality Metrics (Bubble)
  const prodMetricsOptions: any = {
    chart: { type: 'bubble', height: 315, toolbar: { show: false }, zoom: { enabled: false }, background: 'transparent' },
    dataLabels: { enabled: false },
    fill: { opacity: 0.9 },
    stroke: { width: 0 },
    colors: ['#66929F', '#F9A375'],
    grid: {
      borderColor: '#E2E8F0',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { left: 0, right: 0, top: 10, bottom: 5 }
    },
    plotOptions: { bubble: { minBubbleRadius: 3, maxBubbleRadius: 22 } },
    xaxis: {
      min: 0.6,
      max: 5.4,
      tickAmount: 4,
      labels: {
        offsetY: 10,
        style: { colors: '#0F172A', fontSize: '15px', fontWeight: 500 },
        formatter: (value: number) => {
          const weeks: any = { 1: 'Week 1', 2: 'Week 2', 3: 'Week 3', 4: 'Week 4', 5: 'Week 5' };
          return weeks[Math.round(value)] || '';
        }
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      min: 0,
      max: 100,
      tickAmount: 4,
      labels: { offsetX: -15, style: { colors: '#0F172A', fontSize: '15px', fontWeight: 500 } }
    },
    legend: { show: false },
    tooltip: { theme: 'light' }
  };
  const prodMetricsSeries = [
    {
      name: "Tasks Completed",
      data: [
        [1, 38, 22], [1.3, 55, 18], [1.9, 46, 17], [2.1, 45, 25],
        [2.2, 41, 14], [2.7, 57, 18], [3.2, 62, 15], [3.2, 43, 14],
        [3.6, 82, 16], [3.8, 35, 18], [4.2, 50, 24], [4.4, 52, 16]
      ]
    },
    {
      name: "Quality Score",
      data: [
        [1.0, 8, 20], [1.1, 50, 26], [1.5, 57, 30], [1.8, 33, 18],
        [2.1, 30, 32], [2.9, 57, 45], [3.0, 47, 25], [3.4, 36, 24],
        [4.0, 65, 22], [4.3, 66, 28], [4.8, 82, 24], [5.0, 44, 24]
      ]
    }
  ];

  // 11. Skill Assessment Radar (skill-assesment-chart)
  const skillOptions: any = {
    chart: { height: 300, type: 'radar', toolbar: { show: false } },
    colors: ['#ED6A2A'],
    stroke: { width: 2 },
    fill: { opacity: 0.05 },
    markers: { size: 4, colors: ['#ED6A2A'], strokeColors: '#fff', strokeWidth: 2, hover: { size: 6 } },
    xaxis: {
      categories: ['Technical', 'Communication', 'Leadership', 'Services', 'Challenges', 'Quality', 'Collaboration', ['Problem', 'Solving']],
      labels: { show: true, style: { colors: '#111827', fontSize: '13px', fontWeight: 500 } }
    },
    yaxis: [{ min: 0, max: 100, tickAmount: 4 }, { show: false }],
    grid: { show: false, padding: { top: -20, bottom: 0, left: 10, right: 0 } },
    plotOptions: {
      radar: {
        size: 130,
        polygons: {
          strokeColors: '#E2E8F0',
          connectorColors: '#E2E8F0',
          fill: { colors: ['transparent', 'transparent'] }
        }
      }
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: { enabled: true, theme: 'light' }
  };
  const skillSeries = [{
    name: 'Performance',
    data: [70, 38, 68, 62, 58, 72, 42, 66]
  }];

  return (
    <div className="dashboard-scope page-wrapper" style={{ minHeight: '100vh' }}>
      <div className="content">
        
				<div className="d-flex align-items-center justify-content-between flex-wrap mb-3">
					<div className="my-auto mb-2">
						<h2 className="mb-1">AI Team Performance Insights</h2>
						<nav>
							<ol className="breadcrumb mb-0">
								<li className="breadcrumb-item">
									<a href="/tenant/dashboard"><i className="ti ti-smart-home"></i></a>
								</li>
								<li className="breadcrumb-item">
									AI Center
								</li>
								<li className="breadcrumb-item active" aria-current="page">AI Team Performance Insights</li>
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
						<a href="#" className="btn btn-primary-gradient d-inline-flex align-items-center gap-2"> <i className="ti ti-repeat"></i> Deep Analysis</a>
					</div>
				</div>
				

				
				<div className="row row-gap-4 mb-4">

                    
                    <div className="col-xxl-5 col-xl-12 d-flex">
                        <div className="card w-100 flex-fill mb-0">
                            <div className="card-body">
                                <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-4">
                                    <div>
                                        <p className="mb-1">Overall Performance</p>
                                        <h3 className="mb-0 fs-24 fw-bold">89.8</h3>
                                    </div>
                                    <div className="avatar avatar-lg bg-secondary rounded">
                                        <i className="ti ti-users-plus fs-20"></i>
                                    </div>
                                </div>
								<div className="d-flex align-items-center justify-content-between gap-5 flex-lg-nowrap mb-4 pb-4 border-bottom">
									<div className="w-100 d-flex align-items-center justify-content-between gap-2 flex-wrap">
										<p className="mb-0 d-flex align-items-center justify-content-between gap-2 flex-wrap w-100">Team Average <span className="fw-semibold fs-16 text-dark">89%</span> </p>
										<div className="w-100" id="performance-chart"><Chart options={performanceChartOptions} series={performanceChartSeries} type="bar" height={16} width="100%" /></div>
									</div>
									<div className="d-inline-flex align-items-center bg-light border rounded-pill text-dark p-1 ps-2"> +4%
										<span className="bg-success btn-icon btn-sm rounded-circle d-flex align-items-center justify-content-center ms-1">
											<i className="ti ti-arrow-up-right fs-20"></i>
										</span>
									</div>
								</div>

								<div className="d-flex align-items-center justify-content-between gap-lg-2 gap-4 flex-lg-nowrap flex-wrap"> 
									<div className="text-center">
										<p className="mb-1">Employees</p>
										<h4 className="mb-0 fs-24 fw-bold">250</h4>
									</div>
									<div className="text-center">
										<p className="mb-1">Top Performers</p>
										<h4 className="mb-0 fs-24 fw-bold">38</h4>
									</div>
									<div className="text-center">
										<p className="mb-1">Teams Tracked</p>
										<h4 className="mb-0 fs-24 fw-bold">12</h4>
									</div>
									<div className="text-center">
										<p className="mb-1">Engagement</p>
										<h4 className="mb-0 fs-24 fw-bold">4.6/5</h4>
									</div>
								</div>
                            </div>
                        </div>
                    </div>
                    

					
					<div className="col-xxl-7 col-xl-12 d-flex">
						<div className="card w-100 mb-0">
							<div className="card-body p-0">
								
								<div className="row g-0">
									<div className="col-lg-6 col-md-6">
										<div className="bg-white p-4 border-bottom border-end">
											<div className="d-flex align-items-center justify-content-between gap-2 mb-3">
												<div>
													<p className="mb-1">Team Productivity</p>
													<h4 className="mb-0 fs-24 fw-bold">94%</h4>
												</div>
												<div id="productivity-chart"><Chart options={productivityOptions} series={productivitySeries} type="area" height={40} /></div>
											</div>
											<p className="d-flex align-items-center gap-1"> 
												<span className="badge bg-success-transparent rounded">2.3%<i className="ti ti-arrow-up-right ms-1"></i></span>
												vs last month
											</p>
										</div>
									</div>
									<div className="col-lg-6 col-md-6">
										<div className="bg-white p-4 border-bottom">
											<div className="d-flex align-items-center justify-content-between gap-2 mb-3">
												<div>
													<p className="mb-1">Top Performers</p>
													<h4 className="mb-0 fs-24 fw-bold">94%</h4>
												</div>
												<div id="performers-chart"><Chart options={performersOptions} series={performersSeries} type="bar" height={40} width={80} /></div>
											</div>
											<p className="d-flex align-items-center gap-1"> 
												<span className="badge bg-success-transparent rounded">+5 members<i className="ti ti-arrow-up-right ms-1"></i></span>
												vs last month
											</p>
										</div>
									</div>
									<div className="col-lg-6 col-md-6">
										<div className="bg-white p-4 border-end">
											<div className="d-flex align-items-center justify-content-between gap-2 mb-3">
												<div>
													<p className="mb-1">Engagement Score</p>
													<h4 className="mb-0 fs-24 fw-bold">4.6/5</h4>
												</div>
												<div id="engagement-chart"><Chart options={engagementOptions} series={engagementSeries} type="area" height={40} /></div>
											</div>
											<p className="d-flex align-items-center gap-1"> 
												<span className="badge bg-success-transparent rounded">+0.3%<i className="ti ti-arrow-up-right ms-1"></i></span>
												vs last month
											</p>
										</div>
									</div>
									<div className="col-lg-6 col-md-6">
										<div className="bg-white p-4">
											<div className="d-flex align-items-center justify-content-between gap-2 mb-3">
												<div>
													<p className="mb-1">Goals Completed</p>
													<h4 className="mb-0 fs-24 fw-bold">94%</h4>
												</div>
												<div id="goals-chart"><Chart options={goalsOptions} series={goalsSeries} type="bar" height={40} width={80} /></div>
											</div>
											<p className="d-flex align-items-center gap-1"> 
												<span className="badge bg-danger-transparent rounded">-12%<i className="ti ti-arrow-down-right ms-1"></i></span>
												vs last month
											</p>
										</div>
									</div>
								</div>
								
							</div>
						</div>
					</div>
					

					
					<div className="col-xxl-12 col-xl-12 d-flex">
						<div className="card w-100 mb-0">
							<div className="card-body">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
									<h2 className="mb-0 card-title">Performance, Productivity & Engagement</h2>
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
								<div id="performance-productivity-engagement-chart"><Chart options={ppeOptions} series={ppeSeries} type="bar" height={320} /></div>
							</div>
						</div>
					</div>
					

					
					<div className="col-xxl-12 col-xl-12 d-flex">
						<div className="card w-100 mb-0">
							<div className="card-body">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
									<h2 className="mb-0 card-title">AI Hiring Predictions</h2>
									<a href="#" className="border btn btn-light btn-icon btn-sm d-inline-flex align-items-center justify-content-center rounded-circle">
										<i className="ti ti-arrow-up-right fs-16"></i>
									</a>
								</div>

								
								<div className="row row-gap-4">
									<div className="col-xl-4 col-lg-6 col-md-6">
										<div className="card mb-0 overflow-hidden position-relative border border-primary border-opacity-10">
											<div className="card-body position-relative z-1"> 
												<div className="fs-16 fw-semibold text-dark mb-1">High-Performance Team</div>
												<p className="mb-4">
													Support team consistently exceeds targets. Consider them for complex projects and mentorship roles.
												</p>
												<div className="d-flex align-items-center gap-2">
													<span className="badge badge-primary">Manager Action Needed</span>
													<span className="badge badge-primary">30-day trend</span>
												</div>
											</div>
											<img src="#" alt="shadow" className="img-fluid position-absolute top-0 start-0" />
											<img src="#" alt="shadow" className="img-fluid position-absolute bottom-0 end-0" />
											<img src="#" alt="shadow" className="img-fluid position-absolute bottom-0 end-0 star-icon" />
										</div>
									</div>
									<div className="col-xl-4 col-lg-6 col-md-6">
										<div className="card mb-0 overflow-hidden position-relative border border-primary border-opacity-10">
											<div className="card-body position-relative z-1"> 
												<div className="fs-16 fw-semibold text-dark mb-1">Skills Gap Identified</div>
												<p className="mb-4">
													Leadership scores below target. Recommend leadership training for senior team members in Q3.
												</p>
												<div className="d-flex align-items-center gap-2">
													<span className="badge badge-primary">Manager Action Needed</span>
													<span className="badge badge-primary">30-day trend</span>
												</div>
											</div>
											<img src="#" alt="shadow" className="img-fluid position-absolute top-0 start-0" />
											<img src="#" alt="shadow" className="img-fluid position-absolute bottom-0 end-0" />
											<img src="#" alt="shadow" className="img-fluid position-absolute bottom-0 end-0 star-icon" />
										</div>
									</div>
									<div className="col-xl-4 col-lg-12 col-md-12">
										<div className="card mb-0 overflow-hidden position-relative border border-primary border-opacity-10">
											<div className="card-body position-relative z-1"> 
												<div className="fs-16 fw-semibold text-dark mb-1">Goal Achievement Prediction</div>
												<p className="mb-4">
													Based on current trajectory, 92% of team goals will month-end. On track for exceptional quarter.
												</p>
												<div className="d-flex align-items-center gap-2">
													<span className="badge badge-primary">Manager Action Needed</span>
													<span className="badge badge-primary">30-day trend</span>
												</div>
											</div>
											<img src="#" alt="shadow" className="img-fluid position-absolute top-0 start-0" />
											<img src="#" alt="shadow" className="img-fluid position-absolute bottom-0 end-0" />
											<img src="#" alt="shadow" className="img-fluid position-absolute bottom-0 end-0 star-icon" />
										</div>
									</div>
								</div>
								

							</div>
						</div>
					</div>
					

					
					<div className="col-xxl-4 col-xl-12 d-flex">
						<div className="card w-100 mb-0">
							<div className="card-body">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
									<h2 className="mb-0 card-title">Productivity & Quality Metrics</h2>
									<div className="dropdown">
										<a href="#"
											className="border btn btn-white btn-md d-inline-flex align-items-center"
											data-bs-toggle="dropdown">
											<i className="ti ti-chart-arrows-vertical fs-14 me-1"></i>Q1
										</a>
										<ul className="dropdown-menu  dropdown-menu-end p-3">
											<li>
												<a href="#" className="dropdown-item rounded-1">Q1</a>
											</li>
											<li>
												<a href="#" className="dropdown-item rounded-1">Q2</a>
											</li>
											<li>
												<a href="#" className="dropdown-item rounded-1">Q3</a>
											</li>
										</ul>
									</div>
								</div>
								<div id="productivity-quality-chart"><Chart options={prodQualityOptions} series={prodQualitySeries} type="area" height={300} /></div>
								<div className="d-flex align-items-center justify-content-center gap-3 mb-4">
									<p className="d-flex align-items-center gap-1 text-dark mb-0">
										<i className="ti ti-square-rounded-filled text-primary fs-13"></i> Tasks Completed
									</p>
									<p className="d-flex align-items-center gap-1 text-dark mb-0">
										<i className="ti ti-square-rounded-filled text-secondary fs-13"></i>Quality Score
									</p>
								</div>
								<p className="badge badge-outline-success text-dark bg-success-transparent fs-12 fw-medium mb-0 px-3 py-2 w-100 text-wrap"> Productivity up 18% while maintaining 94+.</p>
							</div>
						</div>
					</div>
					

					
					<div className="col-xxl-5 col-xl-6 d-flex">
						<div className="card w-100 mb-0">
							<div className="card-body">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
									<h2 className="mb-0 card-title">Team Collaboration Scores</h2>
									<div className="dropdown">
										<a href="#"
											className="border btn btn-white btn-md d-inline-flex align-items-center"
											data-bs-toggle="dropdown">
											<i className="ti ti-calendar fs-14 me-1"></i>Jan 2026
										</a>
										<ul className="dropdown-menu  dropdown-menu-end p-3">
											<li>
												<a href="#" className="dropdown-item rounded-1">Jan 2026</a>
											</li>
											<li>
												<a href="#" className="dropdown-item rounded-1">Feb 2026</a>
											</li>
											<li>
												<a href="#" className="dropdown-item rounded-1">Mar 2026</a>
											</li>
										</ul>
									</div>
								</div>
								<div className="d-flex align-items-center gap-3 mb-4">
									<p className="d-flex align-items-center gap-1 text-dark mb-0 border rounded px-2 py-1"> 
										<i className="ti ti-circle-filled text-primary fs-12"></i> Internal
									</p>
									<p className="d-flex align-items-center gap-1 text-dark mb-0 border rounded px-2 py-1">
										<i className="ti ti-circle-filled text-secondary fs-12"></i>Cross-team 
									</p>
								</div>
								<div className="mb-4" id="team-collaboration-chart"><Chart options={teamCollabOptions} series={teamCollabSeries} type="scatter" height={260} /></div>
								<p className="fs-14 mb-0 px-3 py-2 w-100 mb-0 text-dark bg-light-gradient-100 rounded"> Sales excels in cross-team collaboration (88 score).</p>
							</div>
						</div>
					</div>
					

					
					<div className="col-xxl-3 col-xl-6 d-flex">
						<div className="card w-100 mb-0">
							<div className="card-body">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
									<h2 className="mb-0 card-title">Goal Completion</h2>
									<div className="dropdown">
										<a href="#"
											className="border btn btn-white btn-md d-inline-flex align-items-center"
											data-bs-toggle="dropdown">
											<i className="ti ti-chart-arrows-vertical fs-14 me-1"></i>Q1
										</a>
										<ul className="dropdown-menu  dropdown-menu-end p-3">
											<li>
												<a href="#" className="dropdown-item rounded-1">Q1</a>
											</li>
											<li>
												<a href="#" className="dropdown-item rounded-1">Q2</a>
											</li>
											<li>
												<a href="#" className="dropdown-item rounded-1">Q3</a>
											</li>
										</ul>
									</div>
								</div>
								<div id="goal-completion-chart"><Chart options={goalCompletionOptions} series={goalCompletionSeries} type="radialBar" height={210} /></div>
								<div className="fs-14 fw-medium text-dark mb-4 text-center">Total Goals : 695</div>
								<div>
									<div className="d-flex align-items-center justify-content-between mb-2 border rounded-pill p-2 px-3">
										<p className="d-flex align-items-center gap-1 mb-0">
											<i className="ti ti-square-rounded-filled text-primary fs-10"></i>Completed
										</p>
										<span className="fs-14 fw-semibold mb-0 text-dark">342</span>
									</div>
									<div className="d-flex align-items-center justify-content-between mb-2 border rounded-pill p-2 px-3">
										<p className="d-flex align-items-center gap-1 mb-0">
											<i className="ti ti-square-rounded-filled text-secondary-700 fs-10"></i> In Progress
										</p>
										<span className="fs-14 fw-semibold mb-0 text-dark">185</span>
									</div>
									<div className="d-flex align-items-center justify-content-between border rounded-pill p-2 px-3">
										<p className="d-flex align-items-center gap-1 mb-0">
											<i className="ti ti-square-rounded-filled text-warning-300 fs-10"></i> Not Started
										</p>
										<span className="fs-14 fw-semibold mb-0 text-dark">64</span>
									</div>
								</div>
							</div>
						</div>
					</div>
					

					
					<div className="col-xxl-7 col-xl-6 d-flex">
						<div className="card w-100 mb-0">
							<div className="card-body">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
									<h2 className="mb-0 card-title">Productivity & Quality Metrics</h2>
									<div className="d-flex align-items-center gap-3">
										<p className="d-flex align-items-center gap-1 text-dark mb-0">
											<i className="ti ti-square-rounded-filled text-secondary fs-13"></i> Tasks Completed
										</p>
										<p className="d-flex align-items-center gap-1 text-dark mb-0">
											<i className="ti ti-square-rounded-filled text-primary fs-13"></i>Quality Score
										</p>
									</div>
									<div className="dropdown">
										<a href="#"
											className="border btn btn-white btn-md d-inline-flex align-items-center"
											data-bs-toggle="dropdown">
											<i className="ti ti-calendar fs-14 me-1"></i>Jan 2026
										</a>
										<ul className="dropdown-menu  dropdown-menu-end p-3">
											<li>
												<a href="#" className="dropdown-item rounded-1">Jan 2026</a>
											</li>
											<li>
												<a href="#" className="dropdown-item rounded-1">Feb 2026</a>
											</li>
											<li>
												<a href="#" className="dropdown-item rounded-1">Mar 2026</a>
											</li>
										</ul>
									</div>
								</div>
								<p className="mb-0 px-3 py-2 w-100 fs-14 border rounded text-dark"> Productivity up 18% while maintaining 94+ quality score.</p>
								<div id="productivity-quality-metrics-chart"><Chart options={prodMetricsOptions} series={prodMetricsSeries} type="bubble" height={315} /></div>
							</div>
						</div>
					</div>
					

					
					<div className="col-xxl-5 col-xl-6 d-flex">
						<div className="card w-100 mb-0">
							<div className="card-body">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
									<h2 className="mb-0 card-title">Skill Assesments</h2>
								</div>
								<div className="mb-4" id="skill-assesment-chart"><Chart options={skillOptions} series={skillSeries} type="radar" height={300} /></div>
								<p className="mb-0 p-2 w-100 fs-12 fw-medium border rounded text-secondary bg-secondary-transparent d-flex align-items-center gap-2"> <span className="btn-icon btn-sm bg-white rounded d-flex align-items-center justify-content-center"><i className="ti ti-thumb-up-filled fs-16"></i></span>  68% of employees score 80+, Strong Skills.</p>
							</div>
						</div>
					</div>
					

				</div>
				
      </div>
    </div>
  );
}
