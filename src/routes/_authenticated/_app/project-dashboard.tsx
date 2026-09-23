import { usePermissions } from "@/lib/permissions";
import { AccessDenied } from "@/components/access-denied";
import { Loader2 } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { initFlatpickr } from "@/lib/init-dashboard";
import { initProjectCharts } from "@/lib/dashboard-charts";

export const Route = createFileRoute("/_authenticated/_app/project-dashboard")({
  component: ProjectDashboardPage,
});

export default function ProjectDashboardPage() {
  const { canAccessModule, loading } = usePermissions();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <p className="text-xs text-muted-foreground font-medium animate-pulse">Verifying workspace permissions...</p>
      </div>
    );
  }

  if (!canAccessModule("project")) {
    return (
      <AccessDenied
        moduleName="Project Dashboard"
        requiredPermission="project.dashboard.view"
        message="You do not have permission to access the Project Dashboard."
      />
    );
  }

  useEffect(() => {
    // 1. Bind interactive flatpickr to calendar input
    initFlatpickr();

    // 2. Initialize exact page charts
    const cleanup = initProjectCharts();

    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, []);

  return (
    <div className="w-full min-w-0 flex-1">
      <div className="p-3 lg:p-6 lg:px-0">

					<div className="flex flex-wrap items-center justify-between gap-3 mb-3 lg:mb-6">
						<h1 className="text-gray-900 text-xl max-lg:text-lg font-bold mb-0">Project Dashboard</h1>
						<div className="flex items-center flex-wrap gap-2">
							<div className="relative rangepicker-input w-[174px] h-[28px] leading-none">
								<span className="absolute inset-y-0 left-0 flex items-center px-3 text-muted-foreground text-dark text-xs!">
									<i className="icon-calendar"></i>
								</span>
								<input type="text" className="form-input text-xs! h-[28px] inline-block w-full bg-light border-border-color rounded-md focus:ring-0 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:border-border-color pl-8! ps-8!" data-provider="flatpickr" data-date-format="d M y" data-range-date="true" defaultValue="01 Jan 26 to 20 Jan 26" id="picker" />
							</div>
							<div className="hs-dropdown [--placement:bottom-right] [--auto-close:inside] relative inline-flex">
                                <button type="button" className="hs-dropdown-toggle cursor-pointer btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-2 hover:bg-primary hover:border-primary hover:text-white focus:bg-primary focus:border-primary focus:text-white  focus:outline-hidden" aria-haspopup="menu" aria-expanded="false" aria-label="Dropdown">
                                    <i className="icon-download font-normal"></i>  Export <i className="icon-chevron-down"></i>
                                </button>

                                <div className="hs-dropdown-menu transition-[opacity,margin] duration hs-dropdown-open:opacity-100 opacity-0 hidden min-w-50 bg-white border border-border-color shadow rounded-md mt-2 z-1" role="menu" aria-orientation="vertical" tabIndex={-1}>
                                    <div className="p-2 space-y-1"> 
                                        <a className="flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light hover:text-gray-900 focus:outline-hidden focus:bg-white" href="#">
                                            Export as PDF
                                        </a>
                                        <a className="flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light hover:text-gray-900 focus:outline-hidden focus:bg-white" href="#">
                                            Export as Excel
                                        </a>  
                                    </div>
                                </div>
                            </div>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-3">
						
						<div className="bg-white border border-border-color rounded-md p-4 overflow-hidden">
							<div className="flex items-center gap-3 mb-2">
								<div className="size-10 rounded-full bg-orange-transparent flex items-center justify-center shrink-0">
									<i className="ph-duotone ph-folder-user text-orange text-lg"></i>
								</div>
								<div className="min-w-0">
									<p className="text-xs text-default mb-1">Total Projects</p>
									<div className="flex items-center gap-2">
										<h2 className="text-xl max-lg:text-lg font-bold text-gray-900 mb-0">65</h2>
										<span className="text-[11px] text-success font-medium inline-flex items-center">
											<i className="ph ph-arrow-up text-[10px]"></i>5.62%
										</span>
									</div>
								</div>
							</div>
							<div id="pj-spark-1" className="-mx-4 -mb-4"></div>
						</div>

						
						<div className="bg-white border border-border-color rounded-md p-4 overflow-hidden">
							<div className="flex items-center gap-3 mb-2">
								<div className="size-10 rounded-full bg-info-transparent flex items-center justify-center shrink-0">
									<i className="ph-duotone ph-circle-half text-info text-lg"></i>
								</div>
								<div className="min-w-0">
									<p className="text-xs text-default mb-1">Active Projects</p>
									<div className="flex items-center gap-2">
										<h2 className="text-xl max-lg:text-lg font-bold text-gray-900 mb-0">32</h2>
										<span className="text-[11px] text-success font-medium inline-flex items-center">
											<i className="ph ph-arrow-up text-[10px]"></i>6.64%
										</span>
									</div>
								</div>
							</div>
							<div id="pj-spark-2" className="-mx-4 -mb-4"></div>
						</div>

						
						<div className="bg-white border border-border-color rounded-md p-4 overflow-hidden">
							<div className="flex items-center gap-3 mb-2">
								<div className="size-10 rounded-full bg-purple-transparent flex items-center justify-center shrink-0">
									<i className="ph-duotone ph-check-circle text-purple text-lg"></i>
								</div>
								<div className="min-w-0">
									<p className="text-xs text-default mb-1">Finished Projects</p>
									<div className="flex items-center gap-2">
										<h2 className="text-xl max-lg:text-lg font-bold text-gray-900 mb-0">33</h2>
										<span className="text-[11px] text-success font-medium inline-flex items-center">
											<i className="ph ph-arrow-up text-[10px]"></i>4.84%
										</span>
									</div>
								</div>
							</div>
							<div id="pj-spark-3" className="-mx-4 -mb-4"></div>
						</div>

						
						<div className="bg-white border border-border-color rounded-md p-4 overflow-hidden">
							<div className="flex items-center gap-3 mb-2">
								<div className="size-10 rounded-full bg-success-transparent flex items-center justify-center shrink-0">
									<i className="ph-duotone ph-users text-success text-lg"></i>
								</div>
								<div className="min-w-0">
									<p className="text-xs text-default mb-1">Active Users</p>
									<div className="flex items-center gap-2">
										<h2 className="text-xl max-lg:text-lg font-bold text-gray-900 mb-0">254</h2>
										<span className="text-[11px] text-success font-medium inline-flex items-center">
											<i className="ph ph-arrow-up text-[10px]"></i>4.65%
										</span>
									</div>
								</div>
							</div>
							<div id="pj-spark-4" className="-mx-4 -mb-4"></div>
						</div>
					</div>

					<div className="grid grid-cols-1 xl:grid-cols-12 gap-3 mb-3">

						<div className="bg-white border border-border-color rounded-md p-4 pb-0 xl:col-span-8">
							<div className="flex items-center justify-between flex-wrap gap-2 mb-3">
								<h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Projects Progress</h3>
								<div className="hs-dropdown [--placement:bottom-right] [--auto-close:inside] relative inline-flex">
									<button type="button" className="hs-dropdown-toggle cursor-pointer btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-2 hover:bg-primary hover:border-primary hover:text-white focus:bg-primary focus:border-primary focus:text-white  focus:outline-hidden" aria-haspopup="menu" aria-expanded="false" aria-label="Dropdown">
										Weekly <i className="icon-chevron-down"></i>
									</button>

									<div className="hs-dropdown-menu transition-[opacity,margin] duration hs-dropdown-open:opacity-100 opacity-0 hidden min-w-50 bg-white border border-border-color shadow rounded-md mt-2 z-1" role="menu" aria-orientation="vertical" tabIndex={-1}>
										<div className="p-2 space-y-1"> 
											<a className="flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light hover:text-gray-900 focus:outline-hidden focus:bg-white" href="#">
												Weekly
											</a>
											<a className="flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light hover:text-gray-900 focus:outline-hidden focus:bg-white" href="#">
												Monthly
											</a>  
											<a className="flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light hover:text-gray-900 focus:outline-hidden focus:bg-white" href="#">
												Yearly
											</a>  
											<a className="flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light hover:text-gray-900 focus:outline-hidden focus:bg-white" href="#">
												Today
											</a>  
										</div>
									</div>
								</div>
							</div>
							<div className="flex items-center justify-center flex-wrap gap-3 mb-2 text-[11px]">
								<div className="flex items-center gap-1">
									<span className="size-2 rounded-full bg-success"></span>
									<span className="text-default">Completed</span>
								</div>
								<div className="flex items-center gap-1">
									<span className="size-2 rounded-full bg-info"></span>
									<span className="text-default">Inprogress</span>
								</div>
								<div className="flex items-center gap-1">
									<span className="size-2 rounded-full bg-warning"></span>
									<span className="text-default">Not Started Yet</span>
								</div>
								<div className="flex items-center gap-1">
									<span className="size-2 rounded-full bg-danger"></span>
									<span className="text-default">Cancelled</span>
								</div>
							</div>
							<div id="pj-progress-chart"></div>
						</div>

						<div className="bg-white border border-border-color rounded-md p-4 pb-0 xl:col-span-4">
							<div className="flex items-center justify-between mb-2">
								<h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Resource Utilization</h3>
								<div className="hs-dropdown [--placement:bottom-right] [--auto-close:inside] relative inline-flex">
									<button type="button" className="hs-dropdown-toggle cursor-pointer btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-2 hover:bg-primary hover:border-primary hover:text-white focus:bg-primary focus:border-primary focus:text-white  focus:outline-hidden" aria-haspopup="menu" aria-expanded="false" aria-label="Dropdown">
										Weekly <i className="icon-chevron-down"></i>
									</button>

									<div className="hs-dropdown-menu transition-[opacity,margin] duration hs-dropdown-open:opacity-100 opacity-0 hidden min-w-50 bg-white border border-border-color shadow rounded-md mt-2 z-1" role="menu" aria-orientation="vertical" tabIndex={-1}>
										<div className="p-2 space-y-1"> 
											<a className="flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light hover:text-gray-900 focus:outline-hidden focus:bg-white" href="#">
												Weekly
											</a>
											<a className="flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light hover:text-gray-900 focus:outline-hidden focus:bg-white" href="#">
												Monthly
											</a>  
											<a className="flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light hover:text-gray-900 focus:outline-hidden focus:bg-white" href="#">
												Yearly
											</a>  
											<a className="flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light hover:text-gray-900 focus:outline-hidden focus:bg-white" href="#">
												Today
											</a>  
										</div>
									</div>
								</div>
							</div>
							<div id="resource-chart"></div>
						</div>

					</div>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
						<div className="bg-white border border-border-color rounded-md p-4 pb-1.5">
							<div className="flex items-center justify-between flex-wrap gap-2 mb-3">
								<h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Tasks</h3>
								<a href="tasks.html" className="btn-sm bg-white border border-border-color text-dark hover:bg-primary hover:border-primary hover:text-white flex items-center justify-center gap-1 cursor-pointer">
									View All<i className="icon-chevron-right"></i>
								</a>
							</div>
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead>
										<tr className="text-xs text-default border-b border-border-color">
											<th className="text-left py-2 px-2 font-semibold text-gray-900">Task Name</th>
											<th className="text-left py-2 px-2 font-semibold text-gray-900">Assigned To</th>
											<th className="text-left py-2 px-2 font-semibold text-gray-900">Status</th>
										</tr>
									</thead>
									<tbody>
										<tr className="border-b border-border-color last:border-0 hover:bg-light/20 transition-colors">
											<td className="py-2.5 px-2">
												<p className="text-[11px] text-default mb-1 leading-tight"><a href="#">#TSK0020</a></p>
												<p className="text-xs font-semibold text-title mb-0 leading-tight">Design Employee Dashboard</p>
											</td>
											<td className="py-2.5 px-2 vertical-middle">
												<div className="flex items-center gap-2">
													<div className="size-7 overflow-hidden">
														<a href="#">
															<img src="/images/avatars/avatar-3.webp" className="rounded-full border border-border-color w-full h-full object-cover" alt="Alexander"  loading="lazy"/>
														</a>
													</div>
													<p className="text-xs font-semibold text-title"><a href="#" className="text-title hover:text-primary transition-colors">Alexander Kenn</a></p>
												</div>
											</td>
											<td className="py-2.5 px-2 vertical-middle">
												<span className="inline-flex items-center text-[11px] bg-success-transparent text-success px-2 py-0.5 rounded font-medium">
													Completed <i className="ph ph-check text-[10px] ms-1"></i>
												</span>
											</td>
										</tr>
										<tr className="border-b border-border-color last:border-0 hover:bg-light/20 transition-colors">
											<td className="py-2.5 px-2">
												<p className="text-[11px] text-default mb-1 leading-tight"><a href="#">#TSK0019</a></p>
												<p className="text-xs font-semibold text-title mb-0 leading-tight">Build Patient Registration Form</p>
											</td>
											<td className="py-2.5 px-2 vertical-middle">
												<div className="flex items-center gap-2">													
													<div className="size-7 overflow-hidden">
														<a href="#">
															<img src="/images/avatars/avatar-4.webp" className="border border-border-color w-full h-full object-cover rounded-full" alt="Gabriella"  loading="lazy"/>
														</a>
													</div>
													<p className="text-xs font-semibold text-title"><a href="#" className="text-title hover:text-primary transition-colors">Gabriella White</a></p>
												</div>
											</td>
											<td className="py-2.5 px-2 vertical-middle">
												<span className="inline-flex items-center text-[11px] bg-warning-transparent text-warning px-2 py-0.5 rounded font-medium">
													Pending <i className="ph ph-clock text-[10px] ms-1"></i>
												</span>
											</td>
										</tr>
										<tr className="border-b border-border-color last:border-0 hover:bg-light/20 transition-colors">
											<td className="py-2.5 px-2">
												<p className="text-[11px] text-default mb-1 leading-tight"><a href="#">#TSK0018</a></p>
												<p className="text-xs font-semibold text-title mb-0 leading-tight">Develop Quiz &amp; Assessment</p>
											</td>
											<td className="py-2.5 px-2 vertical-middle">
												<div className="flex items-center gap-2">
													<div className="size-7 overflow-hidden">
														<a href="#">
															<img src="/images/avatars/avatar-5.webp" className="rounded-full border border-border-color shrink-0" alt="Christopher"  loading="lazy"/>
														</a>
													</div>
													<p className="text-xs font-semibold text-title"><a href="#" className="text-title hover:text-primary transition-colors">Christopher Rey</a></p>
												</div>
											</td>
											<td className="py-2.5 px-2 vertical-middle">
												<span className="inline-flex items-center text-[11px] bg-info-transparent text-info px-2 py-0.5 rounded font-medium">
													In Progress <i className="ph ph-arrow-clockwise text-[10px] ms-1"></i>
												</span>
											</td>
										</tr>
										<tr className="border-b border-border-color last:border-0 hover:bg-light/20 transition-colors">
											<td className="py-2.5 px-2">
												<p className="text-[11px] text-default mb-1 leading-tight"><a href="#">#TSK0017</a></p>
												<p className="text-xs font-semibold text-title mb-0 leading-tight">Integrate Voice &amp; Video Calling</p>
											</td>
											<td className="py-2.5 px-2 vertical-middle">
												<div className="flex items-center gap-2">
													<div className="size-7 overflow-hidden">
														<a href="#">
															<img src="/images/avatars/avatar-6.webp" className="rounded-full border border-border-color w-full h-full object-cover" alt="Penelope"  loading="lazy"/>
														</a>
													</div>
													<p className="text-xs font-semibold text-title"><a href="#" className="text-title hover:text-primary transition-colors">Penelope Ton</a></p>
												</div>
											</td>
											<td className="py-2.5 px-2 vertical-middle">
												<span className="inline-flex items-center text-[11px] bg-success-transparent text-success px-2 py-0.5 rounded font-medium">
													Completed <i className="ph ph-check text-[10px] ms-1"></i>
												</span>
											</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>

						<div className="bg-white border border-border-color rounded-md p-4 pb-1.5">
							<div className="flex items-center justify-between flex-wrap gap-2 mb-3">
								<h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Milestones</h3>
								<a href="milestones.html" className="btn-sm bg-white border border-border-color text-dark hover:bg-primary hover:border-primary hover:text-white flex items-center justify-center gap-1 cursor-pointer">
									View All<i className="icon-chevron-right"></i>
								</a>
							</div>
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead>
										<tr className="text-xs text-default border-b border-border-color">
											<th className="text-left py-2 px-2 font-semibold text-gray-900">ID</th>
											<th className="text-left py-2 px-2 font-semibold text-gray-900">Milestone Name</th>
											<th className="text-left py-2 px-2 font-semibold text-gray-900">Target Date</th>
											<th className="text-left py-2 px-2 font-semibold text-gray-900">Status</th>
										</tr>
									</thead>
									<tbody>
										<tr className="border-b border-border-color last:border-0">
											<td className="py-2.5 px-2">
												<a href="#" className="text-xs text-default hover:text-primary transition-colors">#MLS0020</a>
											</td>
											<td className="py-2.5 px-2 text-xs font-semibold text-title">Requirement Gathering</td>
											<td className="py-2.5 px-2 text-xs text-default">11 Sep 2025</td>
											<td className="py-2.5 px-2">
												<span className="text-[11px] bg-success-transparent text-success px-2 py-0.5 rounded">Planned</span>
											</td>
										</tr>
										<tr className="border-b border-border-color last:border-0">
											<td className="py-2.5 px-2">
												<a href="#" className="text-xs text-default hover:text-primary transition-colors">#MLS0019</a>
											</td>
											<td className="py-2.5 px-2 text-xs font-semibold text-title">Design Phase</td>
											<td className="py-2.5 px-2 text-xs text-default">05 Sep 2025</td>
											<td className="py-2.5 px-2">
												<span className="text-[11px] bg-warning-transparent text-warning px-2 py-0.5 rounded">Pending</span>
											</td>
										</tr>
										<tr className="border-b border-border-color last:border-0">
											<td className="py-2.5 px-2">
												<a href="#" className="text-xs text-default hover:text-primary transition-colors">#MLS0018</a>
											</td>
											<td className="py-2.5 px-2 text-xs font-semibold text-title">First Pass API</td>
											<td className="py-2.5 px-2 text-xs text-default">27 Aug 2025</td>
											<td className="py-2.5 px-2">
												<span className="text-[11px] bg-info-transparent text-info px-2 py-0.5 rounded">On Track</span>
											</td>
										</tr>
										<tr className="border-b border-border-color last:border-0">
											<td className="py-2.5 px-2">
												<a href="#" className="text-xs text-default hover:text-primary transition-colors">#MLS0017</a>
											</td>
											<td className="py-2.5 px-2 text-xs font-semibold text-title">App Store Submission</td>
											<td className="py-2.5 px-2 text-xs text-default">16 Aug 2025</td>
											<td className="py-2.5 px-2">
												<span className="text-[11px] bg-success-transparent text-success px-2 py-0.5 rounded">Planned</span>
											</td>
										</tr>
										<tr className="border-b border-border-color last:border-0">
											<td className="py-2.5 px-2">
												<a href="#" className="text-xs text-default hover:text-primary transition-colors">#MLS0011</a>
											</td>
											<td className="py-2.5 px-2 text-xs font-semibold text-title">Beta Release</td>
											<td className="py-2.5 px-2 text-xs text-default">18 May 2025</td>
											<td className="py-2.5 px-2">
												<span className="text-[11px] bg-info-transparent text-info px-2 py-0.5 rounded">On Track</span>
											</td>
										</tr>
									</tbody>
								</table>

							</div>
						</div>
					</div>

					<div className="grid grid-cols-1 xl:grid-cols-12 lg:grid-cols-12 gap-3 mb-3">
						<div className="bg-white border border-border-color rounded-md p-4 lg:col-span-12 xl:col-span-4">
							<div className="flex items-center justify-between flex-wrap gap-2 mb-3">
								<h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Timesheet</h3>
								<div className="hs-dropdown [--placement:bottom-right] [--auto-close:inside] relative inline-flex">
									<button type="button" className="hs-dropdown-toggle cursor-pointer btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-2 hover:bg-primary hover:border-primary hover:text-white focus:bg-primary focus:border-primary focus:text-white  focus:outline-hidden" aria-haspopup="menu" aria-expanded="false" aria-label="Dropdown">
										Weekly <i className="icon-chevron-down"></i>
									</button>

									<div className="hs-dropdown-menu transition-[opacity,margin] duration hs-dropdown-open:opacity-100 opacity-0 hidden min-w-50 bg-white border border-border-color shadow rounded-md mt-2 z-1" role="menu" aria-orientation="vertical" tabIndex={-1}>
										<div className="p-2 space-y-1"> 
											<a className="flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light hover:text-gray-900 focus:outline-hidden focus:bg-white" href="#">
												Weekly
											</a>
											<a className="flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light hover:text-gray-900 focus:outline-hidden focus:bg-white" href="#">
												Monthly
											</a>  
											<a className="flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light hover:text-gray-900 focus:outline-hidden focus:bg-white" href="#">
												Yearly
											</a>  
											<a className="flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light hover:text-gray-900 focus:outline-hidden focus:bg-white" href="#">
												Today
											</a>  
										</div>
									</div>
								</div>
							</div>
							<div className="space-y-3">
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-2 min-w-0">
										<img src="/images/avatars/avatar-3.webp" className="size-9 rounded-full border border-border-color shrink-0" alt="Anastasia Leton"  loading="lazy"/>
										<div className="min-w-0">
											<p className="text-xs font-semibold text-title truncate mb-0">Anastasia Leton</p>
											<p className="text-[11px] text-default truncate mb-0">Design Employee Dashboard</p>
										</div>
									</div>
									<div className="text-end shrink-0">
										<p className="text-[11px] text-default mb-0">05 Sep 2025</p>
										<span className="text-[10px] bg-success-transparent text-success px-1.5 py-0.5 rounded">Approved</span>
									</div>
								</div>
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-2 min-w-0">
										<img src="/images/avatars/avatar-4.webp" className="size-9 rounded-full border border-border-color shrink-0" alt="Noah Bennett"  loading="lazy"/>
										<div className="min-w-0">
											<p className="text-xs font-semibold text-title truncate mb-0">Noah Bennett</p>
											<p className="text-[11px] text-default truncate mb-0">Build Patient Form</p>
										</div>
									</div>
									<div className="text-end shrink-0">
										<p className="text-[11px] text-default mb-0">11 Sep 2025</p>
										<span className="text-[10px] bg-warning-transparent text-warning px-1.5 py-0.5 rounded">Pending</span>
									</div>
								</div>
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-2 min-w-0">
										<img src="/images/avatars/avatar-5.webp" className="size-9 rounded-full border border-border-color shrink-0" alt="Victoria Ellsworth"  loading="lazy"/>
										<div className="min-w-0">
											<p className="text-xs font-semibold text-title truncate mb-0">Victoria Ellsworth</p>
											<p className="text-[11px] text-default truncate mb-0">Develop Quiz</p>
										</div>
									</div>
									<div className="text-end shrink-0">
										<p className="text-[11px] text-default mb-0">28 Aug 2025</p>
										<span className="text-[10px] bg-info-transparent text-info px-1.5 py-0.5 rounded">Submitted</span>
									</div>
								</div>
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-2 min-w-0">
										<img src="/images/avatars/avatar-6.webp" className="size-9 rounded-full border border-border-color shrink-0" alt="Noah Kensington"  loading="lazy"/>
										<div className="min-w-0">
											<p className="text-xs font-semibold text-title truncate mb-0">Noah Kensington</p>
											<p className="text-[11px] text-default truncate mb-0">Integrate Voice</p>
										</div>
									</div>
									<div className="text-end shrink-0">
										<p className="text-[11px] text-default mb-0">17 Aug 2025</p>
										<span className="text-[10px] bg-success-transparent text-success px-1.5 py-0.5 rounded">Approved</span>
									</div>
								</div>
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-2 min-w-0">
										<img src="/images/avatars/avatar-7.webp" className="size-9 rounded-full border border-border-color shrink-0" alt="Liam Gallagher"  loading="lazy"/>
										<div className="min-w-0">
											<p className="text-xs font-semibold text-title truncate mb-0">Liam Gallagher</p>
											<p className="text-[11px] text-default truncate mb-0">Refactor API Authentication</p>
										</div>
									</div>
									<div className="text-end shrink-0">
										<p className="text-[11px] text-default mb-0">14 Aug 2025</p>
										<span className="text-[10px] bg-secondary-transparent text-secondary px-1.5 py-0.5 rounded">In Progress</span>
									</div>
								</div>
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-2 min-w-0">
										<img src="/images/avatars/avatar-8.webp" className="size-9 rounded-full border border-border-color shrink-0" alt="Sophia Vance"  loading="lazy"/>
										<div className="min-w-0">
											<p className="text-xs font-semibold text-title truncate mb-0">Sophia Vance</p>
											<p className="text-[11px] text-default truncate mb-0">Setup Webhook Listeners</p>
										</div>
									</div>
									<div className="text-end shrink-0">
										<p className="text-[11px] text-default mb-0">09 Aug 2025</p>
										<span className="text-[10px] bg-danger-transparent text-danger px-1.5 py-0.5 rounded">Rejected</span>
									</div>
								</div>
							</div>

						</div>

						<div className="bg-white border border-border-color rounded-md p-4 lg:col-span-6 xl:col-span-4">
							<div className="flex items-center justify-between flex-wrap gap-2 mb-3">
								<h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Teams</h3>
								<a href="departments.html" className="btn-sm bg-white border border-border-color text-dark hover:bg-primary hover:border-primary hover:text-white flex items-center justify-center gap-1 cursor-pointer">
									View All<i className="icon-chevron-right"></i>
								</a>
							</div>
							<div className="space-y-2">
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-2 min-w-0">
										<a href="#" className="shrink-0 group hover:opacity-80 transition-opacity">
											<img src="/images/avatars/avatar-4.webp" className="size-9 rounded-full border border-border-color" alt="Chloe Mitchell"  loading="lazy"/>
										</a>
										<div className="min-w-0">
											<p className="mb-0">
												<a href="#" className="text-xs font-semibold text-title truncate block hover:text-primary transition-colors">Chloe Mitchell (TL)</a>
											</p>
											<p className="text-[11px] text-default mb-0">UI/UX Designing</p>
										</div>
									</div>
									<div className="text-end shrink-0">
										<p className="text-[11px] text-default mb-1">Team Members</p>
										<div className="flex items-center -space-x-2 justify-end">
											<img src="/images/avatars/avatar-3.webp" className="size-5 rounded-full border-2 border-white" alt="Anastasia Leton"  loading="lazy"/>
											<img src="/images/avatars/avatar-5.webp" className="size-5 rounded-full border-2 border-white" alt="Victoria Ellsworth"  loading="lazy"/>
											<span className="size-5 rounded-full bg-primary text-white text-[9px] flex items-center justify-center border-2 border-white">+5</span>
										</div>
									</div>
								</div>
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-2 min-w-0">
										<a href="#" className="shrink-0 group hover:opacity-80 transition-opacity">
											<img src="/images/avatars/avatar-5.webp" className="size-9 rounded-full border border-border-color" alt="Daniel Roberts"  loading="lazy"/>
										</a>
										<div className="min-w-0">
											<p className="mb-0">
												<a href="#" className="text-xs font-semibold text-title truncate block hover:text-primary transition-colors">Daniel Roberts (TL)</a>
											</p>
											<p className="text-[11px] text-default mb-0">Frontend Developer</p>
										</div>
									</div>
									<div className="text-end shrink-0">
										<p className="text-[11px] text-default mb-1">Team Members</p>
										<div className="flex items-center -space-x-2 justify-end">
											<img src="/images/avatars/avatar-4.webp" className="size-5 rounded-full border-2 border-white" alt="Chloe Mitchell"  loading="lazy"/>
											<img src="/images/avatars/avatar-7.webp" className="size-5 rounded-full border-2 border-white" alt="Daniel Roberts"  loading="lazy"/>
											<span className="size-5 rounded-full bg-primary text-white text-[9px] flex items-center justify-center border-2 border-white">+5</span>
										</div>
									</div>
								</div>
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-2 min-w-0">
										<a href="#" className="shrink-0 group hover:opacity-80 transition-opacity">
											<img src="/images/avatars/avatar-6.webp" className="size-9 rounded-full border border-border-color" alt="Grace Adams"  loading="lazy"/>
										</a>
										<div className="min-w-0">
											<p className="mb-0">
												<a href="#" className="text-xs font-semibold text-title truncate block hover:text-primary transition-colors">Grace Adams (TL)</a>
											</p>
											<p className="text-[11px] text-default mb-0">React Developer</p>
										</div>
									</div>
									<div className="text-end shrink-0">
										<p className="text-[11px] text-default mb-1">Team Members</p>
										<div className="flex items-center -space-x-2 justify-end">
											<img src="/images/avatars/avatar-3.webp" className="size-5 rounded-full border-2 border-white" alt="Ethan Turner"  loading="lazy"/>
											<img src="/images/avatars/avatar-8.webp" className="size-5 rounded-full border-2 border-white" alt="Marcus Vance"  loading="lazy"/>
											<span className="size-5 rounded-full bg-primary text-white text-[9px] flex items-center justify-center border-2 border-white">+5</span>
										</div>
									</div>
								</div>
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-2 min-w-0">
										<a href="#" className="shrink-0 group hover:opacity-80 transition-opacity">
											<img src="/images/avatars/avatar-7.webp" className="size-9 rounded-full border border-border-color" alt="Hendrita Bennett"  loading="lazy"/>
										</a>
										<div className="min-w-0">
											<p className="mb-0">
												<a href="#" className="text-xs font-semibold text-title truncate block hover:text-primary transition-colors">Hendrita Bennett (TL)</a>
											</p>
											<p className="text-[11px] text-default mb-0">Backend Developer</p>
										</div>
									</div>
									<div className="text-end shrink-0">
										<p className="text-[11px] text-default mb-1">Team Members</p>
										<div className="flex items-center -space-x-2 justify-end">
											<img src="/images/avatars/avatar-4.webp" className="size-5 rounded-full border-2 border-white" alt="Chloe Mitchell"  loading="lazy"/>
											<img src="/images/avatars/avatar-6.webp" className="size-5 rounded-full border-2 border-white" alt="Grace Adams"  loading="lazy"/>
											<span className="size-5 rounded-full bg-primary text-white text-[9px] flex items-center justify-center border-2 border-white">+5</span>
										</div>
									</div>
								</div>
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-2 min-w-0">
										<a href="#" className="shrink-0 group hover:opacity-80 transition-opacity">
											<img src="/images/avatars/avatar-8.webp" className="size-9 rounded-full border border-border-color" alt="Marcus Vance"  loading="lazy"/>
										</a>
										<div className="min-w-0">
											<p className="mb-0">
												<a href="#" className="text-xs font-semibold text-title truncate block hover:text-primary transition-colors">Marcus Vance (TL)</a>
											</p>
											<p className="text-[11px] text-default mb-0">DevOps Engineer</p>
										</div>
									</div>
									<div className="text-end shrink-0">
										<p className="text-[11px] text-default mb-1">Team Members</p>
										<div className="flex items-center -space-x-2 justify-end">
											<img src="/images/avatars/avatar-1.webp" className="size-5 rounded-full border-2 border-white" alt="Alice Johnson"  loading="lazy"/>
											<img src="/images/avatars/avatar-2.webp" className="size-5 rounded-full border-2 border-white" alt="Boe Johnson"  loading="lazy"/>
											<span className="size-5 rounded-full bg-primary text-white text-[9px] flex items-center justify-center border-2 border-white">+3</span>
										</div>
									</div>
								</div>
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-2 min-w-0">
										<a href="#" className="shrink-0 group hover:opacity-80 transition-opacity">
											<img src="/images/avatars/avatar-9.webp" className="size-9 rounded-full border border-border-color" alt="Sophia Gallagher"  loading="lazy"/>
										</a>
										<div className="min-w-0">
											<p className="mb-0">
												<a href="#" className="text-xs font-semibold text-title truncate block hover:text-primary transition-colors">Sophia Gallagher (TL)</a>
											</p>
											<p className="text-[11px] text-default mb-0">QA Automation</p>
										</div>
									</div>
									<div className="text-end shrink-0">
										<p className="text-[11px] text-default mb-1">Team Members</p>
										<div className="flex items-center -space-x-2 justify-end">
											<img src="/images/avatars/avatar-10.webp" className="size-5 rounded-full border-2 border-white" alt="Isabella Martin"  loading="lazy"/>
											<img src="/images/avatars/avatar-11.webp" className="size-5 rounded-full border-2 border-white" alt="James Wilson"  loading="lazy"/>
											<span className="size-5 rounded-full bg-primary text-white text-[9px] flex items-center justify-center border-2 border-white">+4</span>
										</div>
									</div>
								</div>
							</div>

						</div>

						<div className="bg-white border border-border-color rounded-md p-4 lg:col-span-6 xl:col-span-4">
							<div className="flex items-center justify-between flex-wrap gap-2 mb-3">
								<h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Task Summary</h3>
								<div className="hs-dropdown [--placement:bottom-right] [--auto-close:inside] relative inline-flex">
									<button type="button" className="hs-dropdown-toggle cursor-pointer btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-2 hover:bg-primary hover:border-primary hover:text-white focus:bg-primary focus:border-primary focus:text-white  focus:outline-hidden" aria-haspopup="menu" aria-expanded="false" aria-label="Dropdown">
										Weekly <i className="icon-chevron-down"></i>
									</button>

									<div className="hs-dropdown-menu transition-[opacity,margin] duration hs-dropdown-open:opacity-100 opacity-0 hidden min-w-50 bg-white border border-border-color shadow rounded-md mt-2 z-1" role="menu" aria-orientation="vertical" tabIndex={-1}>
										<div className="p-2 space-y-1"> 
											<a className="flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light hover:text-gray-900 focus:outline-hidden focus:bg-white" href="#">
												Weekly
											</a>
											<a className="flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light hover:text-gray-900 focus:outline-hidden focus:bg-white" href="#">
												Monthly
											</a>  
											<a className="flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light hover:text-gray-900 focus:outline-hidden focus:bg-white" href="#">
												Yearly
											</a>  
											<a className="flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light hover:text-gray-900 focus:outline-hidden focus:bg-white" href="#">
												Today
											</a>  
										</div>
									</div>
								</div>
							</div>
							<div id="pj-task-summary-chart" className="flex justify-center"></div>
							<div className="space-y-2 mt-3">
								<div className="flex items-center justify-between gap-2 text-[11px]">
									<div className="flex items-center gap-2">
										<span className="size-2 rounded-full bg-success"></span>
										<span className="text-default">Completed</span>
									</div>
									<span className="font-semibold text-gray-900">30%</span>
								</div>
								<div className="flex items-center justify-between gap-2 text-[11px]">
									<div className="flex items-center gap-2">
										<span className="size-2 rounded-full bg-orange"></span>
										<span className="text-default">Pending</span>
									</div>
									<span className="font-semibold text-gray-900">25%</span>
								</div>
								<div className="flex items-center justify-between gap-2 text-[11px]">
									<div className="flex items-center gap-2">
										<span className="size-2 rounded-full bg-info"></span>
										<span className="text-default">In Progress</span>
									</div>
									<span className="font-semibold text-gray-900">20%</span>
								</div>
								<div className="flex items-center justify-between gap-2 text-[11px]">
									<div className="flex items-center gap-2">
										<span className="size-2 rounded-full bg-purple"></span>
										<span className="text-default">Active</span>
									</div>
									<span className="font-semibold text-gray-900">15%</span>
								</div>
								<div className="flex items-center justify-between gap-2 text-[11px]">
									<div className="flex items-center gap-2">
										<span className="size-2 rounded-full bg-danger"></span>
										<span className="text-default">Cancelled</span>
									</div>
									<span className="font-semibold text-gray-900">10%</span>
								</div>
							</div>
						</div>

					</div>

					
					<div className="bg-white border border-border-color rounded-md p-4 pb-1.5">
						<div className="flex items-center justify-between flex-wrap gap-2 mb-3">
							<h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">All Project</h3>
							<div className="hs-dropdown [--placement:bottom-right] [--auto-close:inside] relative inline-flex">
								<button type="button" className="hs-dropdown-toggle cursor-pointer btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-2 hover:bg-primary hover:border-primary hover:text-white focus:bg-primary focus:border-primary focus:text-white  focus:outline-hidden" aria-haspopup="menu" aria-expanded="false" aria-label="Dropdown">
									Weekly <i className="icon-chevron-down"></i>
								</button>
								<div className="hs-dropdown-menu transition-[opacity,margin] duration hs-dropdown-open:opacity-100 opacity-0 hidden min-w-50 bg-white border border-border-color shadow rounded-md mt-2 z-1" role="menu" aria-orientation="vertical" tabIndex={-1}>
									<div className="p-2 space-y-1"> 
										<a className="flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light hover:text-gray-900 focus:outline-hidden focus:bg-white" href="#">
											Weekly
										</a>
										<a className="flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light hover:text-gray-900 focus:outline-hidden focus:bg-white" href="#">
											Monthly
										</a>  
										<a className="flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light hover:text-gray-900 focus:outline-hidden focus:bg-white" href="#">
											Yearly
										</a>  
										<a className="flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light hover:text-gray-900 focus:outline-hidden focus:bg-white" href="#">
											Today
										</a>  
									</div>
								</div>
							</div>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="text-xs text-default border-b border-border-color">
										<th className="text-left py-2 px-2 font-semibold text-gray-900">ID</th>
										<th className="text-left py-2 px-2 font-semibold text-gray-900">Project Name</th>
										<th className="text-left py-2 px-2 font-semibold text-gray-900">Priority</th>
										<th className="text-left py-2 px-2 font-semibold text-gray-900">Project Lead</th>
										<th className="text-left py-2 px-2 font-semibold text-gray-900">Status</th>
									</tr>
								</thead>
								<tbody>
									<tr className="border-b border-border-color last:border-0">
										<td className="py-2.5 px-2">
											<a href="#" className="text-xs text-default hover:text-primary transition-colors">#PRO0020</a>
										</td>
										<td className="py-2.5 px-2">
											<div className="flex items-center gap-2">
												<a href="#" className="size-7 rounded-md bg-success-transparent flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity">
													<i className="ph-duotone ph-buildings text-success"></i>
												</a>
												<p className="mb-0">
													<a href="#" className="text-xs font-semibold text-title hover:text-primary transition-colors">Office Management App</a>
												</p>
											</div>
										</td>
										<td className="py-2.5 px-2">
											<span className="text-[11px] bg-info-transparent text-info px-2 py-0.5 rounded">Low</span>
										</td>
										<td className="py-2.5 px-2">
											<div className="flex items-center gap-2">
												<div className="size-7 shrink-0">
													<img src="/images/avatars/avatar-3.webp" className="rounded-full border border-border-color" alt="Ethan Walker"  loading="lazy"/>
												</div>
												<p className="text-xs font-semibold text-title mb-0 whitespace-nowrap">Ethan Walker</p>
											</div>
										</td>
										<td className="py-2.5 px-2">
											<span className="text-[11px] bg-success-transparent text-success px-2 py-0.5 rounded">Completed</span>
										</td>
									</tr>
									<tr className="border-b border-border-color last:border-0">
										<td className="py-2.5 px-2">
											<a href="#" className="text-xs text-default hover:text-primary transition-colors">#PRO0019</a>
										</td>
										<td className="py-2.5 px-2">
											<div className="flex items-center gap-2">
												<a href="#" className="size-7 rounded-md bg-info-transparent flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity">
													<i className="ph-duotone ph-first-aid-kit text-info"></i>
												</a>
												<p className="mb-0">
													<a href="#" className="text-xs font-semibold text-title hover:text-primary transition-colors">Clinic Management</a>
												</p>
											</div>
										</td>
										<td className="py-2.5 px-2">
											<span className="text-[11px] bg-warning-transparent text-warning px-2 py-0.5 rounded">Medium</span>
										</td>
										<td className="py-2.5 px-2">
											<div className="flex items-center gap-2">
												<div className="size-7 shrink-0">
													<img src="/images/avatars/avatar-4.webp" className="rounded-full border border-border-color" alt="Madison Clark"  loading="lazy"/>
												</div>
												<p className="text-xs font-semibold text-title mb-0 whitespace-nowrap">Madison Clark</p>
											</div>
										</td>
										<td className="py-2.5 px-2">
											<span className="text-[11px] bg-info-transparent text-info px-2 py-0.5 rounded">In Progress</span>
										</td>
									</tr>
									<tr className="border-b border-border-color last:border-0">
										<td className="py-2.5 px-2">
											<a href="#" className="text-xs text-default hover:text-primary transition-colors">#PRO0018</a>
										</td>
										<td className="py-2.5 px-2">
											<div className="flex items-center gap-2">
												<a href="#" className="size-7 rounded-md bg-orange-transparent flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity">
													<i className="ph-duotone ph-graduation-cap text-orange"></i>
												</a>
												<p className="mb-0">
													<a href="#" className="text-xs font-semibold text-title hover:text-primary transition-colors">Educational Platform</a>
												</p>
											</div>
										</td>
										<td className="py-2.5 px-2">
											<span className="text-[11px] bg-danger-transparent text-danger px-2 py-0.5 rounded">High</span>
										</td>
										<td className="py-2.5 px-2">
											<div className="flex items-center gap-2">
												<div className="size-7 shrink-0">
													<img src="/images/avatars/avatar-5.webp" className="rounded-full border border-border-color" alt="James Harris"  loading="lazy"/>
												</div>
												<p className="text-xs font-semibold text-title mb-0 whitespace-nowrap">James Harris</p>
											</div>
										</td>
										<td className="py-2.5 px-2">
											<span className="text-[11px] bg-success-transparent text-success px-2 py-0.5 rounded">Completed</span>
										</td>
									</tr>
									<tr className="border-b border-border-color last:border-0">
										<td className="py-2.5 px-2">
											<a href="#" className="text-xs text-default hover:text-primary transition-colors">#PRO0017</a>
										</td>
										<td className="py-2.5 px-2">
											<div className="flex items-center gap-2">
												<a href="#" className="size-7 rounded-md bg-pink-transparent flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity">
													<i className="ph-duotone ph-chat-circle text-pink"></i>
												</a>
												<p className="mb-0">
													<a href="#" className="text-xs font-semibold text-title hover:text-primary transition-colors">Chat &amp; Call Mobile App</a>
												</p>
											</div>
										</td>
										<td className="py-2.5 px-2">
											<span className="text-[11px] bg-info-transparent text-info px-2 py-0.5 rounded">Low</span>
										</td>
										<td className="py-2.5 px-2">
											<div className="flex items-center gap-2">
												<div className="size-7 shrink-0">
													<img src="/images/avatars/avatar-6.webp" className="rounded-full border border-border-color" alt="Avery Thompson"  loading="lazy"/>
												</div>
												<p className="text-xs font-semibold text-title mb-0 whitespace-nowrap">Avery Thompson</p>
											</div>
										</td>
										<td className="py-2.5 px-2">
											<span className="text-[11px] bg-info-transparent text-info px-2 py-0.5 rounded">In Progress</span>
										</td>
									</tr>
									<tr className="border-b border-border-color last:border-0">
										<td className="py-2.5 px-2">
											<a href="#" className="text-xs text-default hover:text-primary transition-colors">#PRO0011</a>
										</td>
										<td className="py-2.5 px-2">
											<div className="flex items-center gap-2">
												<a href="#" className="size-7 rounded-md bg-purple-transparent flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity">
													<i className="ph-duotone ph-storefront text-purple"></i>
												</a>
												<p className="mb-0">
													<a href="#" className="text-xs font-semibold text-title hover:text-primary transition-colors">POS Admin Software</a>
												</p>
											</div>
										</td>
										<td className="py-2.5 px-2">
											<span className="text-[11px] bg-info-transparent text-info px-2 py-0.5 rounded">Low</span>
										</td>
										<td className="py-2.5 px-2">
											<div className="flex items-center gap-2">
												<div className="size-7 shrink-0">
													<img src="/images/avatars/avatar-7.webp" className="rounded-full border border-border-color" alt="Harper Scott"  loading="lazy"/>
												</div>
												<p className="text-xs font-semibold text-title mb-0 whitespace-nowrap">Harper Scott</p>
											</div>
										</td>
										<td className="py-2.5 px-2">
											<span className="text-[11px] bg-success-transparent text-success px-2 py-0.5 rounded">Completed</span>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>

				</div>

      <footer className="footer px-6 pb-3 mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground border-t border-border-color pt-4">
        <p>{new Date().getFullYear()} &copy; Developed and maintained by Webfamily Tech Solutions</p>
      </footer>
    </div>
  );
}
