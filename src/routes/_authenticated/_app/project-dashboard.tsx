import { usePermissions } from "@/lib/permissions";
import { AccessDenied } from "@/components/access-denied";
import { Loader2 } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { initFlatpickr } from "@/lib/init-dashboard";
import { initProjectCharts } from "@/lib/dashboard-charts";

export const Route = createFileRoute("/_authenticated/_app/project-dashboard")({
  component: ProjectDashboardPage,
});

export default function ProjectDashboardPage() {
  const { canAccessModule, loading } = usePermissions();

  const { data: projectData } = useQuery({
    queryKey: ["dashboard-projects"],
    queryFn: async () => {
      const res = await api.get<any>("/dashboard/projects");
      return res;
    },
  });

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
										<h2 className="text-xl max-lg:text-lg font-bold text-gray-900 mb-0">{projectData?.totalProjects ?? 0}</h2>
										<span className="text-[11px] text-success font-medium inline-flex items-center">
											<i className="ph ph-arrow-up text-[10px]"></i>Live
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
										<h2 className="text-xl max-lg:text-lg font-bold text-gray-900 mb-0">{projectData?.activeProjects ?? 0}</h2>
										<span className="text-[11px] text-success font-medium inline-flex items-center">
											<i className="ph ph-arrow-up text-[10px]"></i>Live
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
									<p className="text-xs text-default mb-1">Finished Tasks</p>
									<div className="flex items-center gap-2">
										<h2 className="text-xl max-lg:text-lg font-bold text-gray-900 mb-0">{projectData?.completedTasks ?? 0}</h2>
										<span className="text-[11px] text-success font-medium inline-flex items-center">
											<i className="ph ph-arrow-up text-[10px]"></i>Live
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
									<p className="text-xs text-default mb-1">In-Progress Tasks</p>
									<div className="flex items-center gap-2">
										<h2 className="text-xl max-lg:text-lg font-bold text-gray-900 mb-0">{projectData?.inProgressTasks ?? 0}</h2>
										<span className="text-[11px] text-success font-medium inline-flex items-center">
											<i className="ph ph-arrow-up text-[10px]"></i>Live
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
								<Link to="/tasks" className="btn-sm bg-white border border-border-color text-dark hover:bg-primary hover:border-primary hover:text-white flex items-center justify-center gap-1 cursor-pointer">
									View All<i className="icon-chevron-right"></i>
								</Link>
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
										{projectData?.recentTasks && projectData.recentTasks.length > 0 ? (
											projectData.recentTasks.map((task: any) => (
												<tr key={task.id} className="border-b border-border-color last:border-0 hover:bg-light/20 transition-colors">
													<td className="py-2.5 px-2">
														<p className="text-[11px] text-default mb-1 leading-tight">#{task.id.slice(0, 8).toUpperCase()}</p>
														<p className="text-xs font-semibold text-title mb-0 leading-tight">{task.title}</p>
													</td>
													<td className="py-2.5 px-2 vertical-middle">
														<p className="text-xs font-semibold text-title mb-0">{task.assignedTo || "Unassigned"}</p>
														<span className="text-[10px] text-muted-foreground">{task.projectName}</span>
													</td>
													<td className="py-2.5 px-2 vertical-middle">
														<span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded font-medium capitalize ${
															task.status === "done" ? "bg-success-transparent text-success" :
															task.status === "in_progress" ? "bg-info-transparent text-info" :
															"bg-warning-transparent text-warning"
														}`}>
															{task.status?.replace("_", " ") || "Pending"}
														</span>
													</td>
												</tr>
											))
										) : (
											<tr>
												<td colSpan={3} className="py-8 text-center text-xs text-muted-foreground">
													No tasks recorded in this workspace.
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</div>

						<div className="bg-white border border-border-color rounded-md p-4 pb-1.5">
							<div className="flex items-center justify-between flex-wrap gap-2 mb-3">
								<h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Milestones</h3>
								<Link to="/projects" className="btn-sm bg-white border border-border-color text-dark hover:bg-primary hover:border-primary hover:text-white flex items-center justify-center gap-1 cursor-pointer">
									View All<i className="icon-chevron-right"></i>
								</Link>
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
										{projectData?.recentMilestones && projectData.recentMilestones.length > 0 ? (
											projectData.recentMilestones.map((ms: any) => (
												<tr key={ms.id} className="border-b border-border-color last:border-0 hover:bg-light/20 transition-colors">
													<td className="py-2.5 px-2">
														<span className="text-xs text-default font-medium">#{ms.id.slice(0, 8).toUpperCase()}</span>
													</td>
													<td className="py-2.5 px-2">
														<p className="text-xs font-semibold text-title mb-0">{ms.title}</p>
														<span className="text-[10px] text-muted-foreground">{ms.projectName}</span>
													</td>
													<td className="py-2.5 px-2 text-xs text-default">
														{ms.dueDate ? new Date(ms.dueDate).toLocaleDateString() : "—"}
													</td>
													<td className="py-2.5 px-2">
														<span className={`text-[11px] px-2 py-0.5 rounded capitalize ${
															ms.status === "completed" ? "bg-success-transparent text-success" :
															ms.status === "in_progress" ? "bg-info-transparent text-info" :
															"bg-warning-transparent text-warning"
														}`}>
															{ms.status?.replace("_", " ") || "Pending"}
														</span>
													</td>
												</tr>
											))
										) : (
											<tr>
												<td colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
													No milestones defined in this workspace.
												</td>
											</tr>
										)}
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
							<div className="py-8 text-center text-xs text-muted-foreground">
								No timesheet submissions recorded for this workspace.
							</div>

						</div>

						<div className="bg-white border border-border-color rounded-md p-4 lg:col-span-6 xl:col-span-4">
							<div className="flex items-center justify-between flex-wrap gap-2 mb-3">
								<h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Teams</h3>
								<Link to="/departments" className="btn-sm bg-white border border-border-color text-dark hover:bg-primary hover:border-primary hover:text-white flex items-center justify-center gap-1 cursor-pointer">
									View All<i className="icon-chevron-right"></i>
								</Link>
							</div>
							<div className="py-8 text-center text-xs text-muted-foreground">
								Project teams are organized dynamically via Department and Staff directories.
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
									{projectData?.recentProjects && projectData.recentProjects.length > 0 ? (
										projectData.recentProjects.map((proj: any) => (
											<tr key={proj.id} className="border-b border-border-color last:border-0 hover:bg-light/20 transition-colors">
												<td className="py-2.5 px-2 text-xs text-default font-medium">
													#{proj.id.slice(0, 8).toUpperCase()}
												</td>
												<td className="py-2.5 px-2">
													<p className="text-xs font-semibold text-title mb-0">{proj.name}</p>
													<span className="text-[11px] text-muted-foreground">{proj.taskCount || 0} tasks</span>
												</td>
												<td className="py-2.5 px-2 text-xs text-default">
													{proj.clientName || "Internal"}
												</td>
												<td className="py-2.5 px-2">
													<div className="w-24 bg-gray-200 rounded-full h-1.5 overflow-hidden">
														<div className="bg-primary h-1.5 rounded-full" style={{ width: `${proj.progress || 0}%` }}></div>
													</div>
													<span className="text-[10px] text-muted-foreground">{proj.progress || 0}%</span>
												</td>
												<td className="py-2.5 px-2">
													<span className={`text-[11px] px-2 py-0.5 rounded capitalize ${
														proj.status === "completed" ? "bg-success-transparent text-success" :
														proj.status === "in_progress" ? "bg-info-transparent text-info" :
														"bg-warning-transparent text-warning"
													}`}>
														{proj.status?.replace("_", " ") || "Pending"}
													</span>
												</td>
											</tr>
										))
									) : (
										<tr>
											<td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
												No projects registered in this workspace.
											</td>
										</tr>
									)}
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
