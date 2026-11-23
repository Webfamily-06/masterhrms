'use client';

import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Link } from "@/src/lib/router-compat";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Chart = lazy(() => import("react-apexcharts"));

export default function RecruitmentDashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [newJobOpen, setNewJobOpen] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [aiMessages, setAiMessages] = useState<Array<{ sender: "ai" | "user"; text: string }>>([
    { sender: "ai", text: "How can i help you today" }
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: recData } = useQuery({
    queryKey: ["dashboard-recruitment-realtime"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/dashboard/recruitment");
        return res?.data || res || {};
      } catch {
        return null;
      }
    },
  });

  const recruitmentChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: "radialBar",
        height: 220,
        sparkline: { enabled: true }
      },
      plotOptions: {
        radialBar: {
          startAngle: -100,
          endAngle: 100,
          hollow: {
            size: "65%",
          },
          track: {
            background: "#e9ecef",
            strokeWidth: "97%",
          },
          dataLabels: {
            name: {
              show: false,
            },
            value: {
              show: false,
            },
          },
        },
      },
      colors: ["#FF7028"],
      labels: ["Total Applications"],
    }),
    []
  );

  const avgHireTimeOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: "bar",
        height: 220,
        stacked: true,
        toolbar: { show: false },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "45%",
          borderRadius: 4,
        },
      },
      colors: ["#0b4c5f", "#3e6f7c", "#9fb8bf", "#c9d8dc"],
      xaxis: {
        categories: ["Jan", "Feb", "Mar"],
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { show: false },
      grid: { show: false },
      legend: { show: false },
      dataLabels: { enabled: false },
    }),
    []
  );

  const avgHireTimeSeries = useMemo(
    () => [
      { name: "Applied to Shortlisted", data: [2, 4, 3] },
      { name: "Shortlisted", data: [1.7, 1.7, 1.7] },
      { name: "Interview to Offer", data: [4, 2, 2] },
      { name: "Acceptance", data: [3, 7, 5] },
    ],
    []
  );

  return (
    <div className="dashboard-scope w-full">
      
			<div className="content">

				{/*  Breadcrumb  */}
				<div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
					<div className="my-auto mb-2">
						<h2 className="mb-1">Recruitment Dashboard</h2>
						<nav>
							<ol className="breadcrumb mb-0">
								<li className="breadcrumb-item">
									<a href="index.html"><i className="ti ti-smart-home"></i></a>
								</li>
								<li className="breadcrumb-item">
									Dashboard
								</li>
								<li className="breadcrumb-item active" aria-current="page">Recruitment Dashboard</li>
							</ol>
						</nav>
					</div>
					<div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
						<div className="me-2 mb-2">
							<div className="input-icon w-100 position-relative">
								<span className="input-icon-addon">
									<i className="ti ti-calendar text-gray-9"></i>
								</span>
								<input type="text" className="form-control yearpicker" value="December 2025" />
							</div>
						</div>
						<div className="me-2 mb-2">
							<div className="dropdown">
								<a href="#" onClick={(e) => e.preventDefault()}
									className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
									data-bs-toggle="dropdown">
									<i className="ti ti-arrow-bar-to-down me-1"></i>Download Report
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
						<a href="#" className="btn btn-primary-gradient mb-2"> <i className="ti ti-plus"></i> Add New Job</a>
						<div className="ms-2 head-icons">
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
					<div className="col-xl-8">
						{/*  Candidate Hiring Analysis  */}
						<div className="card position-relative analysis-card">
							<div className="card-body">
								<div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
									<h3 className="mb-0 card-title">Candidates Hiring Analysis</h3>
									<div className="d-flex align-items-center gap-3">
										<div className="dropdown">
											<a href="#" onClick={(e) => e.preventDefault()}
												className="dropdown-toggle btn btn-light rounded-pill text-dark dropdown-icon-none"
												data-bs-toggle="dropdown">
												<i className="ti ti-adjustments-horizontal fs-16"></i>
											</a>
											<ul className="dropdown-menu dropdown-menu-end p-3">
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
										<a href="#"> <span><i
													className="ti ti-square-arrow-down-filled text-dark"></i></span> Last 30
											Days </a>
									</div>
								</div>

								<div className="table-responsive candidates-table">
									<table className="table table-nowrap table-borderless mb-0">
										<thead>
											<tr>
												<th className="fw-bold bg-white px-2 ps-0">Department</th>
												<th className="fw-normal bg-white px-2">Applicants</th>
												<th className="fw-normal bg-white px-2">Shortlisted</th>
												<th className="fw-normal bg-white px-2">Interviewed</th>
												<th className="fw-normal bg-white px-2">Offered</th>
												<th className="fw-normal bg-white px-2">Hired</th>
											</tr>
										</thead>
										<tbody>
											<tr>
												<td className="px-0 pe-5">
													<div className="d-flex align-items-center">
														<div>
															<h6 className="fw-normal mb-1 fs-14"><a
																	href="invoice-details.html">Marketing</a></h6>
															<span className="fs-13 d-inline-flex align-items-center">Product
																Manager</span>
														</div>
													</div>
												</td>
												<td>
													<div className="badge bg-primary fs-13  rounded-xxl py-2">14</div>
												</td>
												<td>
													<div className="badge bg-secondary  fs-13 rounded-xxl py-2">08</div>
												</td>

												<td>
													<div className="badge bg-light fs-13 rounded-xxl text-light py-2">14
													</div>
												</td>

												<td>
													<div className="badge bg-light fs-13 rounded-xxl text-light py-2">14
													</div>
												</td>

												<td>
													<div className="badge bg-light fs-13 rounded-xxl text-light py-2">14
													</div>
												</td>
											</tr>
											<tr>
												<td className="px-0 pe-5">
													<div className="d-flex align-items-center">
														<div>
															<h6 className="fw-normal mb-1 fs-14"><a
																	href="invoice-details.html">Data Analyst</a></h6>
															<span className="fs-13 d-inline-flex align-items-center">Jr Data
																Analyst</span>
														</div>
													</div>
												</td>
												<td>
													<div className="badge bg-primary  fs-13  rounded-xxl py-2">16</div>
												</td>
												<td>
													<div className="badge bg-secondary   fs-13 rounded-xxl py-2">12</div>
												</td>

												<td>
													<div className="badge bg-light  fs-13 rounded-xxl text-light py-2">14
													</div>
												</td>

												<td>
													<div className="badge bg-light  fs-13 rounded-xxl text-light py-2">14
													</div>
												</td>

												<td>
													<div className="badge bg-light  fs-13 rounded-xxl text-light py-2">14
													</div>
												</td>
											</tr>
											<tr>
												<td className="px-0 pe-5">
													<div className="d-flex align-items-center">
														<div>
															<h6 className="fw-normal mb-1 fs-14"><a
																	href="invoice-details.html">Project Coordinator</a>
															</h6>
															<span className="fs-13 d-inline-flex align-items-center">Jr
																Level</span>
														</div>
													</div>
												</td>
												<td>
													<div className="badge bg-primary  fs-13  rounded-xxl py-2">24</div>
												</td>
												<td>
													<div className="badge bg-secondary   fs-13 rounded-xxl py-2">06</div>
												</td>

												<td>
													<div className="badge bg-light  fs-13 rounded-xxl text-light py-2">14
													</div>
												</td>

												<td>
													<div className="badge bg-light  fs-13 rounded-xxl text-light py-2">14
													</div>
												</td>

												<td>
													<div className="badge bg-light  fs-13 rounded-xxl text-light py-2">14
													</div>
												</td>
											</tr>
											<tr>
												<td className="px-0 pe-5">
													<div className="d-flex align-items-center">
														<div>
															<h6 className="fw-normal mb-1 fs-14"><a
																	href="invoice-details.html">Design Lead</a></h6>
															<span className="fs-13 d-inline-flex align-items-center">UI
																Designer</span>
														</div>
													</div>
												</td>
												<td>
													<div className="badge bg-primary  fs-13  rounded-xxl py-2">12</div>
												</td>
												<td>
													<div className="badge bg-secondary   fs-13 rounded-xxl py-2">08</div>
												</td>

												<td>
													<div className="badge bg-dark  fs-13 rounded-xxl py-2">06</div>
												</td>

												<td>
													<div className="badge bg-info  fs-13 rounded-xxl py-2">05</div>
												</td>

												<td>
													<div className="badge bg-light  fs-13 rounded-xxl text-light py-2">14
													</div>
												</td>
											</tr>
											<tr>
												<td className="px-0 pe-5">
													<div className="d-flex align-items-center">
														<div>
															<h6 className="fw-normal mb-1 fs-14"><a
																	href="invoice-details.html">Project Manager</a></h6>
															<span className="fs-13 d-inline-flex align-items-center">Senior
																Manager</span>
														</div>
													</div>
												</td>
												<td>
													<div className="badge bg-primary  fs-13  rounded-xxl py-2">22</div>
												</td>
												<td>
													<div className="badge bg-secondary   fs-13 rounded-xxl py-2">20</div>
												</td>

												<td>
													<div className="badge bg-dark  fs-13 rounded-xxl py-2">16</div>
												</td>

												<td>
													<div className="badge bg-info  fs-13  rounded-xxl py-2">12</div>
												</td>

												<td>
													<div className="badge bg-success  fs-13  rounded-xxl py-2">04</div>
												</td>
											</tr>
										</tbody>
									</table>
								</div>

							</div>
						</div>

						<div className="card">
							<div className="card-body py-4">
								<div className="row row-gap-4">

									<div className="col-lg-3 col-md-6 col-sm-6 border-end">
										<div className="d-flex align-items-center justify-content-center flex-column gap-2">
											<div
												className="rounded-3 bg-primary-transparent bg-outline-primary d-flex align-items-center justify-content-center p-2">
												<i className="ti ti-briefcase fs-20"></i>
											</div>
											<div className="text-center">
												<h5 className="mb-0 fw-semibold fs-24 mb-1">47</h5>
												<p className="fs-14">Open Positions</p>
											</div>
										</div>
									</div>

									<div className="col-lg-3 col-md-6 col-sm-6 border-end">
										<div className="d-flex align-items-center justify-content-center flex-column gap-2">
											<div
												className="rounded-3 bg-secondary-transparent bg-outline-secondary d-flex align-items-center justify-content-center p-2">
												<i className="ti ti-users-group fs-20"></i>
											</div>
											<div className="text-center">
												<h5 className="mb-0 fw-semibold fs-24 mb-1">2,384</h5>
												<p className=" fs-14">Total Candidates</p>
											</div>
										</div>
									</div>

									<div className="col-lg-3 col-md-6 col-sm-6 border-end">
										<div className="d-flex align-items-center justify-content-center flex-column gap-2">
											<div
												className="rounded-3 bg-dark-transparent bg-outline-dark d-flex align-items-center justify-content-center p-2">
												<i className="ti ti-calendar-due fs-20"></i>
											</div>
											<div className="text-center">
												<h5 className="mb-0 fw-semibold fs-24 mb-1">12</h5>
												<p className=" fs-14">Interviews Today</p>
											</div>
										</div>
									</div>

									<div className="col-lg-3 col-md-6 col-sm-6">
										<div className="d-flex align-items-center justify-content-center flex-column gap-2">
											<div
												className="rounded-3 bg-info-transparent bg-outline-info d-flex align-items-center justify-content-center p-2">
												<i className="ti ti-files fs-20"></i>
											</div>
											<div className="text-center">
												<h5 className="mb-0 fw-semibold fs-24 mb-1">28</h5>
												<p className=" fs-14">Offers Released</p>
											</div>
										</div>
									</div>

								</div>
							</div>
						</div>
					</div>

					<div className="col-xl-4 d-flex flex-column">
						{/*  Salary Range Distribution  */}
						<div className="card">
							<div className="card-body">
								<div
									className="pb-2 d-flex align-items-center justify-content-between flex-wrap mb-3 gap-2">
									<h3 className="mb-0 card-title">Recruitment Overview</h3>
									<div className="d-flex align-items-center gap-3">
										<a href="#"> <span><i
													className="ti ti-square-arrow-down-filled text-dark"></i></span>
											Monthly</a>
									</div>
								</div>

								{/*  Top Stats  */}
								<div className="d-flex justify-content-between align-items-center mb-3">
									<div className="text-center">
										<p className="mb-1  fw-medium">Offer Acceptance</p>
										<h3 className="fw-bold mb-0">74.4%</h3>
									</div>
									<div className="text-center">
										<p className="mb-1  fw-medium">Overall Hire Rate</p>
										<h3 className="fw-bold mb-0">2.7%</h3>
									</div>
								</div>

								{/*  Chart  */}
								<div className="position-relative mx-auto recruitment-chart">
									{isMounted && (
    <Suspense fallback={<div style={{ height: 220 }} className="d-flex align-items-center justify-content-center text-muted">Loading chart...</div>}>
      <Chart options={recruitmentChartOptions} series={[68]} type="radialBar" height={220} />
    </Suspense>
  )}

									{/*  Center Text  */}
									<div className="position-absolute text-center"
										style={{ bottom: "18%", left: "50%", transform: "translateX(-50%)" }}>
										<h2 className="fw-bold mb-0">2,384</h2>
										<p className="mb-0 ">Total Applications</p>
									</div>
								</div>
							</div>
						</div>

						{/*  Overview  */}
						<div className="card bg-secondary position-relative overflow-hidden flex-fill">
							<div className="card-body d-flex flex-column justify-content-between z-2">
								<div className="mb-4">
									<p className="text-white mb-3">Quick Reminder</p>
									<h3 className="text-white fw-normal fs-20 mb-2">You have 21 Interview Schedule Today!
									</h3>
									<p className="text-white">Dont forget to schedule interviews </p>
								</div>
								<div>
									<a href="#"
										className="btn-primary-gradient rounded-pill d-inline-flex align-items-center gap-2 p-1 ps-3">
										Schedule Now
										<span
											className="btn btn-sm btn-icon bg-white rounded-circle d-flex align-items-center justify-content-center text-dark"><i
												className="ti ti-chevrons-right fs-20"></i></span>
									</a>
								</div>
							</div>
							<img src="/assets/img/bg/bg-05.png" alt="bg" className="img-fluid recruitment-bg" />
						</div>
					</div>

				</div>
				{/*  end row  */}

				{/*  start row  */}
				<div className="row">
					<div className="col-xl-4 d-flex">
						<div className="card flex-fill">
							<div className="card-body d-flex flex-column justify-content-between">
								<div className="mb-3">
									<div
										className="d-flex flex-column justify-content-center align-items-center mb-4 gap-2">
										<img src="/assets/img/robot.png" alt="robot"
											className="bg-primary-gradient p-2 rounded-3 mb-2" />
										<h4 className="mb-0">How can i help you today</h4>
										<p className="d-flex align-items-center gap-2">AI Payroll Assistant <span
												className="badge rounded-pill bg-success d-flex align-items-center gap-1"><i
													className="ti ti-circle-filled fs-6 text-white"></i> Online</span></p>
									</div>
									<div>
										<div className="d-flex align-items-center gap-2 flex-wrap mb-4">
											<span className="click-tag bg-light border text-dark">Analyze top candidates for
												Senior Developer role</span>
											<span className="click-tag bg-light border text-dark">Generate hiring
												report</span>
										</div>
										<div className="card bg-light border shadow-none rounded-md mb-0">
											<div className="card-body">
												<span className="d-flex align-items-center gap-1 mb-2 text-primary"> <i
														className="ti ti-sparkles"></i> AI Assistant</span>
												<p className="mb-0">👋 Welcome to your AI Recruitment Assistant! I'm here to
													help you</p>
											</div>
										</div>
									</div>
								</div>
								<div className="chat-input-item mt-3 bg-white rounded-pill">
									<input type="text" className="form-control"
										placeholder="Ask me anything about Requirement" />
									<a href="#" className="btn btn-icon"><i className="ti ti-send"></i></a>
								</div>
							</div>
						</div>
					</div>
					{/*  end col  */}

					<div className="col-xl-4 d-flex">
						<div className="card flex-fill">
							<div className="card-body d-flex flex-column justify-content-between">
								<div>
									<div
										className="pb-2 d-flex align-items-center justify-content-between flex-wrap mb-3 gap-2">
										<h3 className="mb-0 card-title">Average Time to Hire</h3>
										<div className="d-flex align-items-center gap-3">
											<a href="#"> <span><i
														className="ti ti-square-arrow-down-filled text-dark"></i></span>
												Last 30 Days </a>
										</div>
									</div>
									<div className="chartjs-wrapper-demo avghiretime-chart">
										{isMounted && (
    <Suspense fallback={<div style={{ height: 220 }} className="d-flex align-items-center justify-content-center text-muted">Loading chart...</div>}>
      <Chart options={avgHireTimeOptions} series={[{ name: "Applied", data: [2, 4, 3] }, { name: "Shortlisted", data: [5, 2, 4] }, { name: "Hired", data: [2, 3, 1] }]} type="bar" height={220} />
    </Suspense>
  )}
									</div>

									<div className="d-flex flex-column mb-3 gap-2">
										<div className="d-flex align-items-center justify-content-between">
											<div className="d-flex align-items-center">
												<span
													className="d-block border border-2 h-12 border-secondary border-opacity-100 rounded-5 me-2"></span>
												<p className="fs-14">Applied to Shortlisted</p>
											</div>
											<p className="badge bg-light border rounded-3 btn-sm fs-13 text-dark">05</p>
										</div>

										<div className="d-flex align-items-center justify-content-between">
											<div className="d-flex align-items-center">
												<span
													className="d-block border border-2 h-12 border-secondary border-opacity-75 rounded-5 me-2"></span>
												<p className="fs-14">Shortlisted</p>
											</div>
											<p className="badge bg-light border rounded-3 btn-sm fs-13 text-dark">07</p>
										</div>

										<div className="d-flex align-items-center justify-content-between">
											<div className="d-flex align-items-center">
												<span
													className="d-block border border-2 h-12 border-secondary border-opacity-50 rounded-5 me-2"></span>
												<p className="fs-14">Interview to Offer</p>
											</div>
											<p className="badge bg-light border rounded-3 btn-sm fs-13 text-dark">10</p>
										</div>

										<div className="d-flex align-items-center justify-content-between">
											<div className="d-flex align-items-center">
												<span
													className="d-block border border-2 h-12 border-secondary border-opacity-25 rounded-5 me-2"></span>
												<p className="fs-14">Acceptance</p>
											</div>
											<p className="badge bg-light border rounded-3 btn-sm fs-13 text-dark">03</p>
										</div>
									</div>
								</div>
								<div
									className="bg-soft-transparent-success rounded-3 text-start w-100 p-2 d-flex align-items-center gap-2 text-dark">
									<div className="avatar avatar-md rounded-3 bg-success flex-shrink-0 p-0">
										<span className="d-flex align-items-center"><i
												className="ti ti-arrow-up-right fs-20"></i></span>
									</div>
									12% faster than industry avg
								</div>
							</div>
						</div>
					</div>
					{/*  end col  */}

					<div className="col-xl-4 d-flex">
						{/*  Item 1  */}
						<div className="card flex-fill">
							<div className="card-body d-flex flex-column justify-content-between">
								<div>
									<div
										className="pb-2 d-flex align-items-center justify-content-between flex-wrap mb-3 gap-2">
										<h3 className="mb-0 card-title">Upcoming Schedules</h3>
										<div className="d-flex align-items-center gap-3">
											<a href="#"> <span><i
														className="ti ti-square-arrow-down-filled text-dark"></i></span>
												Last 30 Days </a>
										</div>
									</div>

									<div className="d-flex align-items-center justify-content-between mb-4">
										<div className="d-flex align-items-center">
											<div className="date-card border rounded-3">
												<p className="m-0 fs-13">Mar</p>
												<h4>02</h4>
											</div>
											<div>
												<h6 className="fs-14 fw-medium text-truncate mb-1"><a href="#">Product
														Designer</a></h6>
												<p className="fs-13"><i className="ti ti-clock-hour-3"></i> 09:00 AM - 10:30 AM
												</p>
											</div>
										</div>
										<div className="avatar flex-shrink-0">
											<img src="/assets/img/avatar/avatar-01.png" className="rounded-circle" alt="img" />
										</div>
									</div>
									<div className="d-flex align-items-center justify-content-between mb-4">
										<div className="d-flex align-items-center">
											<div className="date-card border rounded-3">
												<p className="m-0 fs-13">Apr</p>
												<h4>22</h4>
											</div>
											<div>
												<h6 className="fs-14 fw-medium text-truncate mb-1"><a href="#">Marketing
														Manager</a></h6>
												<p className="fs-13"><i className="ti ti-clock-hour-3"></i> 01:00 PM - 02:00 PM
												</p>
											</div>
										</div>
										<div className="avatar flex-shrink-0">
											<img src="/assets/img/avatar/avatar-02.png" className="rounded-circle" alt="img" />
										</div>
									</div>
									<div className="d-flex align-items-center justify-content-between mb-4">
										<div className="d-flex align-items-center">
											<div className="date-card border rounded-3">
												<p className="m-0 fs-13">May</p>
												<h4>11</h4>
											</div>
											<div>
												<h6 className="fs-14 fw-medium text-truncate mb-1"><a href="#">Sr. Data
														Science</a></h6>
												<p className="fs-13"><i className="ti ti-clock-hour-3"></i> 11:00 AM - 12:30 PM
												</p>
											</div>
										</div>
										<div className="avatar flex-shrink-0">
											<img src="/assets/img/avatar/avatar-03.jpg" className="rounded-circle" alt="img" />
										</div>
									</div>
									<div className="d-flex align-items-center justify-content-between mb-4">
										<div className="d-flex align-items-center">
											<div className="date-card border rounded-3">
												<p className="m-0 fs-13">Jun</p>
												<h4>07</h4>
											</div>
											<div>
												<h6 className="fs-14 fw-medium text-truncate mb-1"><a href="#">Software
														Engineer</a></h6>
												<p className="fs-13"><i className="ti ti-clock-hour-3"></i> 02:00 PM - 03:30 PM
												</p>
											</div>
										</div>
										<div className="avatar flex-shrink-0">
											<img src="/assets/img/avatar/avatar-04.png" className="rounded-circle" alt="img" />
										</div>
									</div>
									<div className="d-flex align-items-center justify-content-between mb-3">
										<div className="d-flex align-items-center">
											<div className="date-card border rounded-3">
												<p className="m-0 fs-13">Aug</p>
												<h4>18</h4>
											</div>
											<div>
												<h6 className="fs-14 fw-medium text-truncate mb-1"><a href="#">Financial
														Analyst</a></h6>
												<p className="fs-13"><i className="ti ti-clock-hour-3"></i> 03:00 PM - 04:00 PM
												</p>
											</div>
										</div>
										<div className="avatar flex-shrink-0">
											<img src="/assets/img/avatar/avatar-05.png" className="rounded-circle" alt="img" />
										</div>
									</div>
								</div>

								<a href="#" className="btn btn-primary-gradient w-100 mt-1">View All Schedule</a>
							</div>
						</div>

					</div>
					{/*  end col  */}
				</div>
				{/*  end row  */}

				<div className="col-xl-12">
					<div className="card">
						<div className="card-body">

							<div className="pb-2 d-flex align-items-center justify-content-between flex-wrap mb-3 gap-2">
								<h3 className="mb-0 card-title">Stage Performance</h3>
								<div className="d-flex align-items-center gap-3">
									<a href="#" className="btn btn-icon border bg-light rounded-pill p-2 text-dark"> <i
											className="ti ti-adjustments-horizontal fs-16"></i> </a>
									<a href="#"> <span><i className="ti ti-square-arrow-down-filled text-dark"></i></span>
										Last 30 Days </a>
								</div>
							</div>

							<div
								className="row flex-wrap g-3 row-cols-1 row-cols-sm-2 row-cols-md-2 row-cols-lg-3 row-cols-xl-3 row-cols-xxl-5 performance-card">

								<div className="col">
									<div className="card shadow-none mb-0 flex-fill">
										<div className="card-body">
											<div className="d-flex align-items-center justify-content-between mb-4">
												<div>
													<p className="fw-semibold text-truncate mb-0">Applied</p>
												</div>
												<div
													className="avatar avatar-lg bg-primary-gradient rounded-4 flex-shrink-0">
													<i className="ti ti-id text-white fs-24"></i>
												</div>
											</div>
											<div>
												<h2 className="mb-2">1,848</h2>
												<p className="fs-14 d-flex align-items-center justify-content-between mb-1">
													Overall Progress <span className="fs-13 fw-normal">36.3%</span> </p>
												<div className="progress progress-pill-primary">
													<div className="progress-bar" role="progressbar" style={{ width: "36.3%" }}
														aria-valuenow="75" aria-valuemin="0" aria-valuemax="100"></div>
												</div>
											</div>
										</div>
									</div>
								</div>

								<div className="col">
									<div className="card shadow-none mb-0 flex-fill">
										<div className="card-body">
											<div className="d-flex align-items-center justify-content-between mb-4">

												<div>
													<p className="fw-semibold text-truncate mb-0">Shortlisted</p>
												</div>
												<div
													className="avatar avatar-lg bg-secondary-gradient rounded-4 flex-shrink-0">
													<i className="ti ti-hourglass-low text-white fs-24"></i>
												</div>
											</div>
											<div>
												<h2 className="mb-2">2,384 </h2>
												<p className="fs-14 d-flex align-items-center justify-content-between mb-1">
													Conversion rate <span className="fs-13 fw-normal">37.4%</span> </p>
												<div className="progress progress-pill-secondary">
													<div className="progress-bar" role="progressbar" style={{ width: "37.4%" }}
														aria-valuenow="75" aria-valuemin="0" aria-valuemax="100"></div>
												</div>
											</div>
										</div>
									</div>
								</div>

								<div className="col">
									<div className="card shadow-none mb-0 flex-fill">
										<div className="card-body">
											<div className="d-flex align-items-center justify-content-between mb-4">

												<div>
													<p className="fw-semibold text-truncate mb-0">Interviewed</p>
												</div>
												<div className="avatar avatar-lg bg-dark-gradient rounded-4 flex-shrink-0">
													<i className="ti ti-calendar-up text-white fs-24"></i>
												</div>
											</div>
											<div>
												<h2 className="mb-2">892</h2>
												<p className="fs-14 d-flex align-items-center justify-content-between mb-1">
													Conversion rate <span className="fs-13 fw-normal">36.3%</span> </p>
												<div className="progress progress-pill-dark">
													<div className="progress-bar dark-progress" role="progressbar"
														style={{ width: "36.3%" }} aria-valuenow="75" aria-valuemin="0"
														aria-valuemax="100"></div>
												</div>
											</div>
										</div>
									</div>
								</div>

								<div className="col">
									<div className="card shadow-none mb-0 flex-fill">
										<div className="card-body">
											<div className="d-flex align-items-center justify-content-between mb-4">

												<div>
													<p className="fw-semibold text-truncate mb-0">Offered</p>
												</div>
												<div className="avatar avatar-lg bg-info-gradient rounded-4 flex-shrink-0">
													<i className="ti ti-file-description text-white fs-24"></i>
												</div>
											</div>
											<div>
												<h2 className="mb-2">324</h2>
												<p className="fs-14 d-flex align-items-center justify-content-between mb-1">
													Conversion rate <span className="fs-13 fw-normal">26.5%</span> </p>
												<div className="progress progress-pill-info">
													<div className="progress-bar" role="progressbar" style={{ width: "26.5%" }}
														aria-valuenow="75" aria-valuemin="0" aria-valuemax="100"></div>
												</div>
											</div>
										</div>
									</div>
								</div>

								<div className="col">
									<div className="card shadow-none mb-0 flex-fill">
										<div className="card-body">
											<div className="d-flex align-items-center justify-content-between mb-4">

												<div>
													<p className="fw-semibold text-truncate mb-0">Hired</p>
												</div>
												<div
													className="avatar avatar-lg bg-success-gradient rounded-4 flex-shrink-0">
													<i className="ti ti-user-check text-white fs-24"></i>
												</div>
											</div>
											<div>
												<h2 className="mb-2">64</h2>
												<p className="fs-14 d-flex align-items-center justify-content-between mb-1">
													Conversion rate <span className="fs-13 fw-normal">41.2%</span> </p>
												<div className="progress progress-pill-success">
													<div className="progress-bar" role="progressbar" style={{ width: "41.2%" }}
														aria-valuenow="75" aria-valuemin="0" aria-valuemax="100"></div>
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
					{/*  Schedules  */}
					<div className="col-xxl-4 d-flex">
						<div className="card flex-fill">
							<div className="card-body">
								<div
									className="pb-2 d-flex align-items-center justify-content-between flex-wrap mb-3 gap-2">
									<h3 className="mb-0 card-title">Recent Applications</h3>
								</div>
								<div className="border bg-light rounded-3 p-3 mb-4">
									<div className="d-flex justify-content-between align-items-center">
										<div className="d-flex align-items-center gap-2">
											<span className="avatar avatar-rounded flex-shrink-0">
												<img className="border border-white" src="/assets/img/users/user-49.jpg"
													alt="img" />
											</span>
											<div>
												<h6 className="text-truncate mb-1">Andrew Stuart</h6>
												<div className="d-flex align-items-center flex-wrap">
													<p className="fs-13">Frontend Developer</p>
												</div>
											</div>
										</div>
										<span className="badge badge-purple-transparent d-flex align-items-center gap-1"><i
												className="ti ti-circle-filled fs-6 text-purple"></i> Interview</span>
									</div>
									<div className="d-flex align-items-center justify-content-between border-top mt-2 pt-2">
										<p className="fs-13 mb-0"><i className="ti ti-user me-1"></i>7 years exp</p>
										<p className="fs-13 mb-0"><i className="ti ti-calendar me-1"></i>Applied: Dec 27, 2025
										</p>
									</div>
								</div>
								<div className="border bg-light rounded-3 p-3 mb-3">
									<div className="d-flex justify-content-between align-items-center">
										<div className="d-flex align-items-center gap-2">
											<span className="avatar avatar-rounded flex-shrink-0">
												<img className="border border-white" src="/assets/img/users/user-50.jpg"
													alt="img" />
											</span>
											<div>
												<h6 className="text-truncate mb-1">Jessica Brown</h6>
												<div className="d-flex align-items-center flex-wrap">
													<p className="fs-13">UI/UX Designer</p>
												</div>
											</div>
										</div>
										<span
											className="badge badge-secondary-transparent d-flex align-items-center gap-1"><i
												className="ti ti-circle-filled fs-6 text-secondary"></i> Shortlisted</span>
									</div>
									<div className="d-flex align-items-center justify-content-between border-top mt-2 pt-2">
										<p className="fs-13 mb-0"><i className="ti ti-user me-1"></i>7 years exp</p>
										<p className="fs-13 mb-0"><i className="ti ti-calendar me-1"></i>Applied: Dec 27, 2025
										</p>
									</div>
								</div>

								<a className="btn btn-primary-gradient w-100 mt-2">View All Schedule</a>
							</div>
						</div>
					</div>
					{/*  /Schedules  */}

					<div className="col-xxl-8">
						<div className="card openings-table">
							<div className="card-body">
								<div className="pb-2 d-flex align-items-center justify-content-between flex-wrap gap-2">
									<h3 className="mb-0 card-title">Active Job Openings</h3>
									<a href="#" onClick={(e) => e.preventDefault()}
										className="btn btn-white border btn-md d-inline-flex align-items-center"
										data-bs-toggle="dropdown">
										View All
									</a>
								</div>
							</div>
							<div className="table-responsive">
								<table className="table table-nowrap mb-0">
									<thead>
										<tr>
											<th>Job ID</th>
											<th>Date</th>
											<th>Job Title</th>
											<th>Location</th>
											<th>Department</th>
											<th>Applicants</th>
										</tr>
									</thead>
									<tbody>
										<tr>
											<td><a href="#">
													<p className="text-gray-5">JOB-001</p>
												</a></td>
											<td>
												<h6 className="fw-normal"><i className="ti ti-calendar-up"></i> Jan 03, 2026
												</h6>
											</td>
											<td>
												<h6 className="fw-medium mb-1">Frontend Developer</h6>
												<span
													className="badge badge-danger-transparent d-inline-flex align-items-center text-danger">
													High Priority </span>
											</td>
											<td>
												<h6 className="fw-normal"><i className="ti ti-map-pin-pin"></i> Remote</h6>
											</td>
											<td>
												<p>Engineering</p>
											</td>
											<td>
												<h6 className="fw-normal"><i className="ti ti-user"></i> 1452</h6>
											</td>
										</tr>
										<tr>
											<td><a href="#">
													<p className="text-gray-5">JOB-002</p>
												</a></td>
											<td>
												<h6 className="fw-normal"><i className="ti ti-calendar-up"></i> Jan 02, 2026
												</h6>
											</td>
											<td>
												<h6 className="fw-medium mb-1">Product Manager</h6>
												<span
													className="badge badge-danger-transparent d-inline-flex align-items-center text-danger">
													High Priority </span>
											</td>
											<td>
												<h6 className="fw-normal"><i className="ti ti-map-pin-pin"></i> Office</h6>
											</td>
											<td>
												<p>Product</p>
											</td>
											<td>
												<h6 className="fw-normal"><i className="ti ti-user"></i> 1342</h6>
											</td>
										</tr>
										<tr>
											<td><a href="#">
													<p className="text-gray-5">JOB-003</p>
												</a></td>
											<td>
												<h6 className="fw-normal"><i className="ti ti-calendar-up"></i> Jan 02, 2026
												</h6>
											</td>
											<td>
												<h6 className="fw-medium mb-1">UX Designer</h6>
												<span
													className="badge badge-danger-transparent d-inline-flex align-items-center text-danger">
													High Priority </span>
											</td>
											<td>
												<h6 className="fw-normal"><i className="ti ti-map-pin-pin"></i> Hybrid</h6>
											</td>
											<td>
												<p>Design</p>
											</td>
											<td>
												<h6 className="fw-normal"><i className="ti ti-user"></i> 1287</h6>
											</td>
										</tr>
										<tr>
											<td><a href="#">
													<p className="text-gray-5">JOB-004</p>
												</a></td>
											<td>
												<h6 className="fw-normal"><i className="ti ti-calendar-up"></i> Jan 01, 2026
												</h6>
											</td>
											<td>
												<h6 className="fw-medium mb-1">Sales Executive</h6>
												<span
													className="badge badge-info-transparent d-inline-flex align-items-center text-info">
													Medium </span>
											</td>
											<td>
												<h6 className="fw-normal"><i className="ti ti-map-pin-pin"></i> Office</h6>
											</td>
											<td>
												<p>Sales</p>
											</td>
											<td>
												<h6 className="fw-normal"><i className="ti ti-user"></i> 1198</h6>
											</td>
										</tr>
										<tr>
											<td><a href="#">
													<p className="text-gray-5">JOB-005</p>
												</a></td>
											<td>
												<h6 className="fw-normal"><i className="ti ti-calendar-up"></i> Jan 01, 2026
												</h6>
											</td>
											<td>
												<h6 className="fw-medium mb-1">DevOps Engineer</h6>
												<span
													className="badge badge-info-transparent d-inline-flex align-items-center text-info">
													Medium </span>
											</td>
											<td>
												<h6 className="fw-normal"><i className="ti ti-map-pin-pin"></i> Office</h6>
											</td>
											<td>
												<p>Engineering</p>
											</td>
											<td>
												<h6 className="fw-normal"><i className="ti ti-user"></i> 1134</h6>
											</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>


			</div>

			

		

      {/* Add New Job Modal */}
      <Dialog open={newJobOpen} onOpenChange={setNewJobOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add New Job Requisition</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              toast.success("Job opening created successfully");
              setNewJobOpen(false);
            }}
            className="space-y-4 pt-2"
          >
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Job Title</label>
              <input
                required
                type="text"
                placeholder="e.g. Senior Frontend Engineer"
                className="form-control"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Category / Department</label>
                <select className="form-select">
                  <option value="Engineering">Engineering</option>
                  <option value="Design">Design</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                  <option value="Human Resources">Human Resources</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Job Type</label>
                <select className="form-select">
                  <option value="Full Time">Full Time</option>
                  <option value="Part Time">Part Time</option>
                  <option value="Contract">Contract</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Number of Openings</label>
                <input type="number" defaultValue={1} min={1} className="form-control" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Closing Date</label>
                <input type="date" className="form-control" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setNewJobOpen(false)} className="btn btn-light">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Publish Requisition
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
