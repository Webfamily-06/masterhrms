'use client';

import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Link } from "@/src/lib/router-compat";

const Chart = lazy(() => import("react-apexcharts"));

export default function LeadsDashboardPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="dashboard-scope w-full">
      {/*  Breadcrumb  */}
				<div className="d-md-flex d-block align-items-center justify-content-between mb-3">
					<div className="my-auto mb-2">
						<h2 className="mb-1">Leads Dashboard</h2>
						<nav>
							<ol className="breadcrumb mb-0">
								<li className="breadcrumb-item">
									<a href="https://smarthr.dreamstechnologies.com/hrm/html/index.html"><i className="ti ti-smart-home"></i></a>
								</li>
								<li className="breadcrumb-item">
									Dashboard
								</li>
								<li className="breadcrumb-item active" aria-current="page">Leads Dashboard</li>
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
					<div className="col-xl-3 col-md-6">
						<div className="card position-relative">
							<div className="card-body">
								<div className="d-flex align-items-center mb-3">
									<div className="avatar avatar-md br-10 icon-rotate bg-primary flex-shrink-0">
										<span className="d-flex align-items-center"><i
												className="ti ti-delta text-white fs-16"></i></span>
									</div>
									<div className="ms-3">
										<p className="fw-medium text-truncate mb-1">Total No of Leads</p>
										<h5>6000</h5>
									</div>
								</div>
								<div className="progress progress-xs mb-2">
									<div className="progress-bar bg-primary" role="progressbar" style={{ width: "40%" }}></div>
								</div>
								<p className="fw-medium fs-13 mb-0"><span className="text-danger fs-12"><i
											className="ti ti-arrow-wave-right-up me-1"></i>-4.01% </span> from last week</p>
							</div>
						</div>
					</div>
					<div className="col-xl-3 col-md-6">
						<div className="card position-relative">
							<div className="card-body">
								<div className="d-flex align-items-center mb-3">
									<div className="avatar avatar-md br-10 icon-rotate bg-secondary flex-shrink-0">
										<span className="d-flex align-items-center"><i
												className="ti ti-currency text-white fs-16"></i></span>
									</div>
									<div className="ms-3">
										<p className="fw-medium text-truncate mb-1">No of New Leads</p>
										<h5>120</h5>
									</div>
								</div>
								<div className="progress progress-xs mb-2">
									<div className="progress-bar bg-secondary" role="progressbar" style={{ width: "40%" }}></div>
								</div>
								<p className="fw-medium fs-13 mb-0"><span className="text-success fs-12"><i
											className="ti ti-arrow-wave-right-up me-1"></i>+20.01% </span> from last week
								</p>
							</div>
						</div>
					</div>
					<div className="col-xl-3 col-md-6">
						<div className="card position-relative">
							<div className="card-body">
								<div className="d-flex align-items-center mb-3">
									<div className="avatar avatar-md br-10 icon-rotate bg-danger flex-shrink-0">
										<span className="d-flex align-items-center"><i
												className="ti ti-stairs-up text-white fs-16"></i></span>
									</div>
									<div className="ms-3">
										<p className="fw-medium text-truncate mb-1">No of Lost Leads</p>
										<h5>30</h5>
									</div>
								</div>
								<div className="progress progress-xs mb-2">
									<div className="progress-bar bg-pink" role="progressbar" style={{ width: "40%" }}></div>
								</div>
								<p className="fw-medium fs-13 mb-0"><span className="text-success fs-12"><i
											className="ti ti-arrow-wave-right-up me-1"></i>+55% </span> from last week</p>
							</div>
						</div>
					</div>
					<div className="col-xl-3 col-md-6">
						<div className="card position-relative">
							<div className="card-body">
								<div className="d-flex align-items-center mb-3">
									<div className="avatar avatar-md br-10 icon-rotate bg-purple flex-shrink-0">
										<span className="d-flex align-items-center"><i
												className="ti ti-users-group text-white fs-16"></i></span>
									</div>
									<div className="ms-3">
										<p className="fw-medium text-truncate mb-1">No of Total Customers</p>
										<h5>9895</h5>
									</div>
								</div>
								<div className="progress progress-xs mb-2">
									<div className="progress-bar bg-purple" role="progressbar" style={{ width: "40%" }}></div>
								</div>
								<p className="fw-medium fs-13 mb-0"><span className="text-success fs-12"><i
											className="ti ti-arrow-wave-right-up me-1"></i>+55% </span> from last week</p>
							</div>
						</div>
					</div>
				</div>
				<div className="row">
					<div className="col-xl-8 d-flex">
						<div className="card flex-fill">
							<div className="card-header">
								<div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
									<h5>Pipeline Stages</h5>
									<div className="dropdown">
										<a href="#" onClick={(e) => e.preventDefault()}
											className="btn btn-white border btn-md d-inline-flex align-items-center"
											data-bs-toggle="dropdown">
											<i className="ti ti-calendar me-1 fs-14"></i>2023 - 2024
										</a>
										<ul className="dropdown-menu  dropdown-menu-end p-3">
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">2023 -
													2024</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">2022 -
													2023</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">2021 -
													2023</a>
											</li>
										</ul>
									</div>
								</div>
							</div>
							<div className="card-body pb-0">
								<div className="row g-2 justify-content-center mb-3">
									<div className="col-md col-sm-4 col-6">
										<div className="border rounded p-2">
											<p className="mb-1 d-flex align-items-center gap-1"><i
													className="ti ti-square-rounded-filled text-primary fs-13"></i>Contacted
											</p>
											<h6>50000</h6>
										</div>
									</div>
									<div className="col-md col-sm-4 col-6">
										<div className="border rounded p-2">
											<p className="mb-1 d-flex align-items-center gap-1"><i
													className="ti ti-square-rounded-filled text-secondary fs-13"></i>Oppurtunity
											</p>
											<h6>25985</h6>
										</div>
									</div>
									<div className="col-md col-sm-4 col-6">
										<div className="border rounded p-2">
											<p className="mb-1 d-flex align-items-center gap-1"><i
													className="ti ti-square-rounded-filled text-info fs-13"></i>Not
												Contacted</p>
											<h6>12566</h6>
										</div>
									</div>
								</div>
								<div id="revenue-income"></div>
							</div>
						</div>
					</div>
					<div className="col-xl-4 d-flex">
						<div className="card flex-fill">
							<div className="card-header">
								<div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
									<h5>New Leads</h5>
									<div className="dropdown">
										<a href="#" onClick={(e) => e.preventDefault()}
											className="btn btn-white border btn-md d-inline-flex align-items-center"
											data-bs-toggle="dropdown">
											<i className="ti ti-calendar me-1 fs-14"></i>This Week
										</a>
										<ul className="dropdown-menu  dropdown-menu-end p-3">
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">This
													Week</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">This
													Month</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">This
													Year</a>
											</li>
										</ul>
									</div>
								</div>
							</div>
							<div className="card-body pb-0">
								<div id="heat_chart">
  {isMounted && (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={{ chart: { id: "heat_chart", toolbar: { show: false } }, colors: ["#0d6efd", "#10b981", "#f59e0b", "#6366f1"], dataLabels: { enabled: false } }} series={[{ name: "heat_chart", data: [30, 40, 35, 50, 49, 60, 70, 91, 125] }]} type="area" height={220} width="100%" />
    </Suspense>
  )}
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
									<h5>Lost Leads </h5>
									<div className="dropdown">
										<a href="#" onClick={(e) => e.preventDefault()}
											className="btn btn-white border-0 dropdown-toggle dropdown-sm btn-sm d-inline-flex align-items-center"
											data-bs-toggle="dropdown" aria-expanded="false">
											Sales Pipeline
										</a>
										<ul className="dropdown-menu dropdown-menu-end p-3">
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
							<div className="card-body py-0">
								<div>
									<div id="leads_stage"></div>
								</div>
							</div>
						</div>
					</div>
					<div className="col-xl-4 d-flex">
						<div className="card flex-fill">
							<div className="card-header">
								<div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
									<h5>Leads By Companies</h5>
									<div className="dropdown">
										<a href="#" onClick={(e) => e.preventDefault()}
											className="btn btn-white border btn-md d-inline-flex align-items-center"
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
													className="avatar rounded-circle bg-white border flex-shrink-0 me-2">
													<img src="/assets/img/company/company-24.svg" className="w-auto h-auto"
														alt="Img" />
												</a>
												<div>
													<h6 className="fw-medium mb-1">Pitch</h6>
													<p className="text-truncate">Value : $45,985</p>
												</div>
											</div>
											<span className="badge badge-purple d-inline-flex align-items-center">
												<i className="ti ti-point-filled me-1"></i> Not Contacted
											</span>
										</div>
									</div>
									<div className="border border-dashed bg-transparent-light rounded p-2 mb-2">
										<div className="d-flex align-items-center justify-content-between">
											<div className="d-flex align-items-center">
												<a href="#" onClick={(e) => e.preventDefault()}
													className="avatar rounded-circle bg-white border flex-shrink-0 me-2">
													<img src="/assets/img/company/company-25.svg" className="w-auto h-auto"
														alt="Img" />
												</a>
												<div>
													<h6 className="fw-medium mb-1">Initech</h6>
													<p className="text-truncate">Value : $21,145</p>
												</div>
											</div>
											<span className="badge badge-success d-inline-flex align-items-center">
												<i className="ti ti-point-filled me-1"></i>Closed
											</span>
										</div>
									</div>
									<div className="border border-dashed bg-transparent-light rounded p-2 mb-2">
										<div className="d-flex align-items-center justify-content-between">
											<div className="d-flex align-items-center">
												<a href="#" onClick={(e) => e.preventDefault()}
													className="avatar rounded-circle bg-white border flex-shrink-0 me-2">
													<img src="/assets/img/company/company-26.svg" className="w-auto h-auto"
														alt="Img" />
												</a>
												<div>
													<h6 className="fw-medium mb-1">Umbrella Corp</h6>
													<p className="text-truncate">Value : $15,685</p>
												</div>
											</div>
											<span className="badge badge-secondary d-inline-flex align-items-center">
												<i className="ti ti-point-filled me-1"></i>Contacted
											</span>
										</div>
									</div>
									<div className="border border-dashed bg-transparent-light rounded p-2 mb-2">
										<div className="d-flex align-items-center justify-content-between">
											<div className="d-flex align-items-center">
												<a href="#" onClick={(e) => e.preventDefault()}
													className="avatar rounded-circle bg-white border flex-shrink-0 me-2">
													<img src="/assets/img/company/company-27.svg" className="w-auto h-auto"
														alt="Img" />
												</a>
												<div>
													<h6 className="fw-medium mb-1">Capital Partners</h6>
													<p className="text-truncate">Value : $12,105</p>
												</div>
											</div>
											<span className="badge badge-secondary d-inline-flex align-items-center">
												<i className="ti ti-point-filled me-1"></i>Contacted
											</span>
										</div>
									</div>
									<div className="border border-dashed bg-transparent-light rounded p-2">
										<div className="d-flex align-items-center justify-content-between">
											<div className="d-flex align-items-center">
												<a href="#" onClick={(e) => e.preventDefault()}
													className="avatar rounded-circle bg-white border flex-shrink-0 me-2">
													<img src="/assets/img/company/company-28.svg" className="w-auto h-auto"
														alt="Img" />
												</a>
												<div>
													<h6 className="fw-medium mb-1">Massive Dynamic</h6>
													<p className="text-truncate">Value : $2,546</p>
												</div>
											</div>
											<span className="badge badge-danger d-inline-flex align-items-center">
												<i className="ti ti-point-filled me-1"></i>Lost
											</span>
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
									<h5>Leads by Source</h5>
									<div className="dropdown">
										<a href="#" onClick={(e) => e.preventDefault()}
											className="btn btn-white border btn-md d-inline-flex align-items-center"
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
								<div id="donut-chart-2">
  {isMounted && (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={{ chart: { id: "donut-chart-2", toolbar: { show: false } }, colors: ["#0d6efd", "#10b981", "#f59e0b", "#6366f1"], dataLabels: { enabled: false } }} series={[{ name: "donut-chart-2", data: [30, 40, 35, 50, 49, 60, 70, 91, 125] }]} type="area" height={220} width="100%" />
    </Suspense>
  )}
</div>
								<div>
									<h6 className="mb-3">Status</h6>
									<div className="d-flex align-items-center justify-content-between mb-2">
										<p className="f-13 mb-0"><i
												className="ti ti-circle-filled text-secondary me-1"></i>Google</p>
										<p className="f-13 fw-medium text-gray-9">40%</p>
									</div>
									<div className="d-flex align-items-center justify-content-between mb-2">
										<p className="f-13 mb-0"><i className="ti ti-circle-filled text-warning me-1"></i>Paid
										</p>
										<p className="f-13 fw-medium text-gray-9">35%</p>
									</div>
									<div className="d-flex align-items-center justify-content-between mb-2">
										<p className="f-13 mb-0"><i className="ti ti-circle-filled text-pink me-1"></i>Campaigns
										</p>
										<p className="f-13 fw-medium text-gray-9">15%</p>
									</div>
									<div className="d-flex align-items-center justify-content-between">
										<p className="f-13 mb-0"><i
												className="ti ti-circle-filled text-purple me-1"></i>Referals</p>
										<p className="f-13 fw-medium text-gray-9">10%</p>
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
											className="btn btn-light btn-icon btn-sm d-flex justify-content-center align-items-center border-0 p-2"><i
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
												className="ti ti-phone-x fs-16"></i></a>
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
											<img src="/assets/img/users/user-45.jpg"
												className="rounded-circle border border-2" alt="img" />
										</a>
										<div className="ms-2">
											<h6 className="fs-14 fw-medium text-truncate mb-1"><a href="#">Doglas
													Martini</a></h6>
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
					<div className="col-xl-4 d-flex">
						<div className="card flex-fill">
							<div className="card-header">
								<div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
									<h5>Recent Activities</h5>
									<div>
										<a href="https://smarthr.dreamstechnologies.com/hrm/html/activity.html" className="btn btn-light btn-md">View All</a>
									</div>
								</div>
							</div>
							<div className="card-body schedule-timeline activity-timeline">
								<div className="d-flex align-items-start">
									<div className="avatar avatar-md avatar-rounded bg-success flex-shrink-0">
										<i className="ti ti-phone fs-20"></i>
									</div>
									<div className="flex-fill ps-3 pb-4 timeline-flow">
										<p className="fw-medium text-gray-9 mb-1"><a href="https://smarthr.dreamstechnologies.com/hrm/html/activity.html">Drain responded to
												your appointment schedule question.</a></p>
										<span>09:25 PM</span>
									</div>
								</div>
								<div className="d-flex align-items-start">
									<div className="avatar avatar-md avatar-rounded bg-info flex-shrink-0">
										<i className="ti ti-message-circle-2 fs-20"></i>
									</div>
									<div className="flex-fill ps-3 pb-4 timeline-flow">
										<p className="fw-medium text-gray-9 mb-1"><a href="https://smarthr.dreamstechnologies.com/hrm/html/activity.html">You sent 1 Message
												to the James.</a></p>
										<span>10:25 PM</span>
									</div>
								</div>
								<div className="d-flex align-items-start">
									<div className="avatar avatar-md avatar-rounded bg-success flex-shrink-0">
										<i className="ti ti-phone fs-20"></i>
									</div>
									<div className="flex-fill ps-3 pb-4 timeline-flow">
										<p className="fw-medium text-gray-9 mb-1"><a href="https://smarthr.dreamstechnologies.com/hrm/html/activity.html">Denwar responded
												to your appointment on 25 Jan 2025, 08:15 PM</a></p>
										<span>09:25 PM</span>
									</div>
								</div>
								<div className="d-flex align-items-start">
									<div className="avatar avatar-md avatar-rounded bg-purple flex-shrink-0">
										<i className="ti ti-user-circle fs-20"></i>
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
					<div className="col-xl-4 d-flex">
						<div className="card flex-fill">
							<div className="card-header">
								<div className="d-flex align-items-center justify-content-between flex-wrap">
									<h5>Notifications</h5>
									<div>
										<a href="#" className="btn btn-light btn-md">View All</a>
									</div>
								</div>
							</div>
							<div className="card-body">
								<div className="d-flex align-items-start mb-4">
									<a href="#" onClick={(e) => e.preventDefault()} className="avatar flex-shrink-0">
										<img src="/assets/img/users/user-27.jpg" className="rounded-circle border border-2"
											alt="img" />
									</a>
									<div className="ms-2">
										<h6 className="fs-14 fw-medium text-truncate mb-1">Lex Murphy requested access to
											UNIX </h6>
										<p className="fs-13 mb-2">Today at 9:42 AM</p>
										<div className="d-flex align-items-center">
											<a href="#" className="avatar avatar-sm border flex-shrink-0 me-2"><img
													src="/assets/img/social/pdf-icon.svg" className="w-auto h-auto"
													alt="Img" /></a>
											<h6 className="fw-normal"><a href="#">EY_review.pdf</a></h6>
										</div>
									</div>
								</div>
								<div className="d-flex align-items-start mb-4">
									<a href="#" onClick={(e) => e.preventDefault()} className="avatar flex-shrink-0">
										<img src="/assets/img/users/user-28.jpg" className="rounded-circle border border-2"
											alt="img" />
									</a>
									<div className="ms-2">
										<h6 className="fs-14 fw-medium text-truncate mb-1">Lex Murphy requested access to
											UNIX </h6>
										<p className="fs-13 mb-0">Today at 10:00 AM</p>
									</div>
								</div>
								<div className="d-flex align-items-start mb-4">
									<a href="#" onClick={(e) => e.preventDefault()} className="avatar flex-shrink-0">
										<img src="/assets/img/users/user-29.jpg" className="rounded-circle border border-2"
											alt="img" />
									</a>
									<div className="ms-2">
										<h6 className="fs-14 fw-medium text-truncate mb-1">Lex Murphy requested access to
											UNIX </h6>
										<p className="fs-13 mb-2">Today at 10:50 AM</p>
										<div className="d-flex align-items-center">
											<a href="#" className="btn btn-primary btn-sm me-2">Approve</a>
											<a href="#" className="btn btn-outline-primary btn-sm">Decline</a>
										</div>
									</div>
								</div>
								<div className="d-flex align-items-start">
									<a href="#" onClick={(e) => e.preventDefault()} className="avatar flex-shrink-0">
										<img src="/assets/img/users/user-33.jpg" className="rounded-circle border border-2"
											alt="img" />
									</a>
									<div className="ms-2">
										<h6 className="fs-14 fw-medium text-truncate mb-1">Lex Murphy requested access to
											UNIX </h6>
										<p className="fs-13 mb-0">Today at 05:00 PM</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div className="row">
					<div className="col-xl-5 d-flex">
						<div className="card flex-fill">
							<div className="card-header">
								<div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2">
									<h5>Top Countries</h5>
									<div className="dropdown">
										<a href="#" onClick={(e) => e.preventDefault()}
											className="btn btn-white border-0 dropdown-toggle dropdown-sm btn-sm d-inline-flex align-items-center"
											data-bs-toggle="dropdown" aria-expanded="false">
											Referrals
										</a>
										<ul className="dropdown-menu dropdown-menu-end p-3">
											<li>
												<a href="#" onClick={(e) => e.preventDefault()}
													className="dropdown-item rounded-1">Referrals</a>
											</li>
											<li>
												<a href="#" onClick={(e) => e.preventDefault()} className="dropdown-item rounded-1">Sales
													Pipeline</a>
											</li>
										</ul>
									</div>
								</div>
							</div>
							<div className="card-body">
								<div className="row align-items-center">
									<div className="col-xxl-5 col-sm-6">
										<div className="pe-3 border-end">
											<div className="d-flex align-items-center mb-4">
												<span className="me-2"><i
														className="ti ti-point-filled text-primary fs-16"></i></span>
												<a href="https://smarthr.dreamstechnologies.com/hrm/html/countries.html"
													className="avatar rounded-circle flex-shrink-0 border border-2">
													<img src="/flags/sg.svg"
														className="img-fluid rounded-circle" alt="img" />
												</a>
												<div className="ms-2">
													<h6 className="fw-medium text-truncate mb-1"><a
															href="https://smarthr.dreamstechnologies.com/hrm/html/countries.html">Singapore</a></h6>
													<span className="fs-13 text-truncate">Leads : 236</span>
												</div>
											</div>
											<div className="d-flex align-items-center mb-4">
												<span className="me-2"><i
														className="ti ti-point-filled text-secondary fs-16"></i></span>
												<a href="https://smarthr.dreamstechnologies.com/hrm/html/countries.html"
													className="avatar rounded-circle flex-shrink-0 border border-2">
													<img src="/flags/fr.svg"
														className="img-fluid rounded-circle" alt="img" />
												</a>
												<div className="ms-2">
													<h6 className="fw-medium text-truncate mb-1"><a
															href="https://smarthr.dreamstechnologies.com/hrm/html/countries.html">France</a></h6>
													<span className="fs-13 text-truncate">Leads : 589</span>
												</div>
											</div>
											<div className="d-flex align-items-center mb-4">
												<span className="me-2"><i
														className="ti ti-point-filled text-info fs-16"></i></span>
												<a href="https://smarthr.dreamstechnologies.com/hrm/html/countries.html"
													className="avatar rounded-circle flex-shrink-0 border border-2">
													<img src="/flags/no.svg"
														className="img-fluid rounded-circle" alt="img" />
												</a>
												<div className="ms-2">
													<h6 className="fw-medium text-truncate mb-1"><a
															href="https://smarthr.dreamstechnologies.com/hrm/html/countries.html">Norway</a></h6>
													<span className="fs-13 text-truncate">Leads : 221</span>
												</div>
											</div>
											<div className="d-flex align-items-center mb-4">
												<span className="me-2"><i
														className="ti ti-point-filled text-danger fs-16"></i></span>
												<a href="https://smarthr.dreamstechnologies.com/hrm/html/countries.html"
													className="avatar rounded-circle flex-shrink-0 border border-2">
													<img src="/flags/us.svg"
														className="img-fluid rounded-circle" alt="img" />
												</a>
												<div className="ms-2">
													<h6 className="fw-medium text-truncate mb-1"><a
															href="https://smarthr.dreamstechnologies.com/hrm/html/countries.html">USA</a></h6>
													<span className="fs-13 text-truncate">Leads : 350</span>
												</div>
											</div>
											<div className="d-flex align-items-center">
												<span className="me-2"><i
														className="ti ti-point-filled text-warning fs-16"></i></span>
												<a href="https://smarthr.dreamstechnologies.com/hrm/html/countries.html"
													className="avatar rounded-circle flex-shrink-0 border border-2">
													<img src="/flags/ae.svg"
														className="img-fluid rounded-circle" alt="img" />
												</a>
												<div className="ms-2">
													<h6 className="fw-medium text-truncate mb-1"><a
															href="https://smarthr.dreamstechnologies.com/hrm/html/countries.html">UAE</a></h6>
													<span className="fs-13 text-truncate">Leads : 221</span>
												</div>
											</div>
										</div>
									</div>
									<div className="col-xxl-7 col-sm-6">
										<div id="donut-chart-3">
  {isMounted && (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>}>
      <Chart options={{ chart: { id: "donut-chart-3", toolbar: { show: false } }, colors: ["#0d6efd", "#10b981", "#f59e0b", "#6366f1"], dataLabels: { enabled: false } }} series={[{ name: "donut-chart-3", data: [30, 40, 35, 50, 49, 60, 70, 91, 125] }]} type="area" height={220} width="100%" />
    </Suspense>
  )}
</div>
									</div>
								</div>
							</div>
						</div>
					</div>
					<div className="col-xl-7 d-flex">
						<div className="card flex-fill">
							<div
								className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-2">
								<h5>Recent Leads</h5>
								<div className="d-flex align-items-center">
									<div>
										<a href="https://smarthr.dreamstechnologies.com/hrm/html/leads.html" className="btn btn-light btn-md">View All</a>
									</div>
								</div>
							</div>
							<div className="card-body p-0">
								<div className="table-responsive">
									<table className="table table-nowrap dashboard-table mb-0">
										<thead>
											<tr>
												<th>Company Name</th>
												<th>Stage</th>
												<th>Created Date</th>
												<th>Lead Owner</th>
											</tr>
										</thead>
										<tbody>
											<tr>
												<td>
													<div className="d-flex align-items-center file-name-icon">
														<a href="https://smarthr.dreamstechnologies.com/hrm/html/company-details.html"
															className="avatar border rounded-circle">
															<img src="/assets/img/company/company-01.svg"
																className="img-fluid" alt="img" />
														</a>
														<div className="ms-2">
															<h6 className="fw-medium"><a
																	href="https://smarthr.dreamstechnologies.com/hrm/html/company-details.html">BrightWave</a></h6>
														</div>
													</div>
												</td>
												<td>
													<span
														className="badge badge-secondary d-inline-flex align-items-center">
														<i className="ti ti-point-filled me-1"></i>
														Contacted
													</span>
												</td>
												<td>
													14 Jan 2024
												</td>
												<td>William Parsons</td>
											</tr>
											<tr>
												<td>
													<div className="d-flex align-items-center file-name-icon">
														<a href="https://smarthr.dreamstechnologies.com/hrm/html/company-details.html"
															className="avatar border rounded-circle">
															<img src="/assets/img/company/company-02.svg"
																className="img-fluid" alt="img" />
														</a>
														<div className="ms-2">
															<h6 className="fw-medium"><a
																	href="https://smarthr.dreamstechnologies.com/hrm/html/company-details.html">Stellar</a></h6>
														</div>
													</div>
												</td>
												<td>
													<span className="badge badge-success d-inline-flex align-items-center">
														<i className="ti ti-point-filled me-1"></i>
														Closed
													</span>
												</td>
												<td>
													21 Jan 2024
												</td>
												<td>Lucille Tomberlin</td>
											</tr>
											<tr>
												<td>
													<div className="d-flex align-items-center file-name-icon">
														<a href="https://smarthr.dreamstechnologies.com/hrm/html/company-details.html"
															className="avatar border rounded-circle">
															<img src="/assets/img/company/company-03.svg"
																className="img-fluid" alt="img" />
														</a>
														<div className="ms-2">
															<h6 className="fw-medium"><a
																	href="https://smarthr.dreamstechnologies.com/hrm/html/company-details.html">Quantum</a></h6>
														</div>
													</div>
												</td>
												<td>
													<span className="badge badge-danger d-inline-flex align-items-center">
														<i className="ti ti-point-filled me-1"></i>
														Lost
													</span>
												</td>
												<td>
													20 Feb 2024
												</td>
												<td>Frederick Johnson</td>
											</tr>
											<tr>
												<td>
													<div className="d-flex align-items-center file-name-icon">
														<a href="https://smarthr.dreamstechnologies.com/hrm/html/company-details.html"
															className="avatar border rounded-circle">
															<img src="/assets/img/company/company-04.svg"
																className="img-fluid" alt="img" />
														</a>
														<div className="ms-2">
															<h6 className="fw-medium"><a
																	href="https://smarthr.dreamstechnologies.com/hrm/html/company-details.html">EcoVision</a></h6>
														</div>
													</div>
												</td>
												<td>
													<span className="badge badge-purple d-inline-flex align-items-center">
														<i className="ti ti-point-filled me-1"></i>
														Not Contacted
													</span>
												</td>
												<td>
													15 Mar 2024
												</td>
												<td>Sarah Henry</td>
											</tr>
											<tr>
												<td>
													<div className="d-flex align-items-center file-name-icon">
														<a href="https://smarthr.dreamstechnologies.com/hrm/html/company-details.html"
															className="avatar border rounded-circle">
															<img src="/assets/img/company/company-05.svg"
																className="img-fluid" alt="img" />
														</a>
														<div className="ms-2">
															<h6 className="fw-medium"><a
																	href="https://smarthr.dreamstechnologies.com/hrm/html/company-details.html">Aurora</a></h6>
														</div>
													</div>
												</td>
												<td>
													<span className="badge badge-success d-inline-flex align-items-center">
														<i className="ti ti-point-filled me-1"></i>
														Closed
													</span>
												</td>
												<td>
													12 Apr 2024
												</td>
												<td>Thomas Miller</td>
											</tr>
										</tbody>
									</table>
								</div>
							</div>
						</div>
					</div>
				</div>
			
    </div>
  );
}
