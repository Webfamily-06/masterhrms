import { usePermissions } from "@/lib/permissions";
import { AccessDenied } from "@/components/access-denied";
import { Loader2 } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { initFlatpickr } from "@/lib/init-dashboard";
import { initSupportCharts } from "@/lib/dashboard-charts";

export const Route = createFileRoute("/_authenticated/_app/support-dashboard")({
  component: SupportDashboardPage,
});

export default function SupportDashboardPage() {
  const { canAccessModule, loading } = usePermissions();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <p className="text-xs text-muted-foreground font-medium animate-pulse">Verifying workspace permissions...</p>
      </div>
    );
  }

  if (!canAccessModule("support")) {
    return (
      <AccessDenied
        moduleName="Support Dashboard"
        requiredPermission="support.dashboard.view"
        message="You do not have permission to access the Support Dashboard."
      />
    );
  }

  useEffect(() => {
    // 1. Bind interactive flatpickr to calendar input
    initFlatpickr();

    // 2. Initialize exact page charts
    const cleanup = initSupportCharts();

    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, []);

  return (
    <div className="w-full min-w-0 flex-1">
      <div className="p-3 lg:py-6 lg:px-0">

					<div className="flex flex-wrap items-center justify-between gap-3 mb-3 lg:mb-6">
						<h1 className="text-gray-900 text-xl font-bold mb-0">Support Dashboard</h1>
						<div className="flex items-center gap-2 flex-wrap">
							<button type="button" className="btn-sm bg-dark text-white border border-dark inline-flex items-center gap-2 hover:bg-primary-hover hover:border-primary-hover cursor-pointer" data-hs-overlay="#add-modal"><i className="ph ph-plus"></i> Add Tickets</button>
							<div className="relative rangepicker-input w-[174px] h-[28px] leading-none">
								<span className="absolute inset-y-0 left-0 flex items-center px-3 text-muted-foreground text-dark text-xs!">
									<i className="icon-calendar"></i>
								</span>
								<input type="text" className="form-input text-xs! h-[28px] inline-block w-full bg-light border-border-color rounded-lg focus:ring-0 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:border-border-color pl-8! ps-8!" data-provider="flatpickr" data-date-format="d M y" data-range-date="true" defaultValue="01 Jan 26 to 20 Jan 26" id="picker" />
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

					
					<div className="bg-white border border-border-color rounded-md p-4 mb-3">
						<div className="flex items-center justify-between mb-3">
							<h2 className="text-lg max-lg:text-[17px] text-title mb-0">Ticket Volume</h2>
							<div className="hs-dropdown [--placement:bottom-right] [--auto-close:inside] relative inline-flex">
								<button type="button" className="hs-dropdown-toggle cursor-pointer btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-2 hover:bg-primary hover:border-primary hover:text-white focus:bg-primary focus:border-primary focus:text-white  focus:outline-hidden" aria-haspopup="menu" aria-expanded="false" aria-label="Dropdown">
									2026 <i className="icon-chevron-down"></i>
								</button>
								<div className="hs-dropdown-menu transition-[opacity,margin] duration hs-dropdown-open:opacity-100 opacity-0 hidden min-w-50 bg-white border border-border-color shadow rounded-md mt-2 z-1" role="menu" aria-orientation="vertical" tabIndex={-1}>
									<div className="p-2 space-y-1"> 
										<a className="flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light hover:text-gray-900 focus:outline-hidden focus:bg-white" href="#">
											2026
										</a>
										<a className="flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light hover:text-gray-900 focus:outline-hidden focus:bg-white" href="#">
											2025
										</a> 
										<a className="flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light hover:text-gray-900 focus:outline-hidden focus:bg-white" href="#">
											2024
										</a> 
									</div>
								</div>
							</div>
						</div>
						<div id="sup-ticket-volume-chart"></div>
					</div>

					
					<div className="grid grid-cols-1 xl:grid-cols-12 gap-3 mb-3">

						<div className="bg-white border border-border-color rounded-md p-4 xl:col-span-4">
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-lg max-lg:text-[17px] text-title mb-0">SLA Breaches</h2>
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
										</div>
									</div>
								</div>
							</div>
							<div id="sup-sla-pie" className="flex justify-center"></div>
							<div className="flex items-center justify-center gap-3 mt-3 text-[11px]">
								<div className="flex items-center gap-1"><span className="size-2 rounded-full bg-success"></span><span className="text-default">SLA Compliant</span></div>
								<div className="flex items-center gap-1"><span className="size-2 rounded-full bg-orange"></span><span className="text-default">SLA Breached</span></div>
							</div>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xl:col-span-8">
							<div className="bg-white border border-border-color rounded-md p-4 overflow-hidden">
								<div className="flex items-center justify-between mb-2">
									<div>
										<p className="text-xs text-default mb-1">Open Tickets</p>
										<div className="flex items-baseline gap-2">
											<h3 className="text-xl font-bold text-gray-900 mb-0">128</h3>
											<span className="text-[11px] text-success font-medium inline-flex items-center"><i className="ph ph-arrow-up text-[10px]"></i>5.52%</span>
										</div>
									</div>
									<div className="size-9 rounded-md bg-orange-transparent flex items-center justify-center shrink-0">
										<i className="ph-duotone ph-folder-open text-orange"></i>
									</div>
								</div>
								<div id="sup-spark-1" className="-mx-4 -mb-4"></div>
							</div>
							
							<div className="bg-white border border-border-color rounded-md p-4 overflow-hidden">
								<div className="flex items-center justify-between mb-2">
									<div>
										<p className="text-xs text-default mb-1">Avg Response</p>
										<div className="flex items-baseline gap-2">
											<h3 className="text-xl font-bold text-gray-900 mb-0">2.4 hrs</h3>
											<span className="text-[11px] text-success font-medium inline-flex items-center"><i className="ph ph-arrow-up text-[10px]"></i>7.32%</span>
										</div>
									</div>
									<div className="size-9 rounded-md bg-danger-transparent flex items-center justify-center shrink-0">
										<i className="ph-duotone ph-chart-line-up text-danger"></i>
									</div>
								</div>
								<div id="sup-spark-2" className="-mx-4 -mb-4"></div>
							</div>

							<div className="bg-white border border-border-color rounded-md p-4 overflow-hidden">
								<div className="flex items-center justify-between mb-2">
									<div>
										<p className="text-xs text-default mb-1">SLA Compliance</p>
										<div className="flex items-baseline gap-2">
											<h3 className="text-xl font-bold text-gray-900 mb-0">94%</h3>
											<span className="text-[11px] text-success font-medium inline-flex items-center"><i className="ph ph-arrow-up text-[10px]"></i>9.42%</span>
										</div>
									</div>
									<div className="size-9 rounded-md bg-success-transparent flex items-center justify-center shrink-0">
										<i className="ph-duotone ph-package text-success"></i>
									</div>
								</div>
								<div id="sup-spark-3" className="-mx-4 -mb-4"></div>
							</div>

							<div className="bg-white border border-border-color rounded-md p-4 overflow-hidden">
								<div className="flex items-center justify-between mb-2">
									<div>
										<p className="text-xs text-default mb-1">KB Articles</p>
										<div className="flex items-baseline gap-2">
											<h3 className="text-xl font-bold text-gray-900 mb-0">378</h3>
											<span className="text-[11px] text-success font-medium inline-flex items-center"><i className="ph ph-arrow-up text-[10px]"></i>8.34%</span>
										</div>
									</div>
									<div className="size-9 rounded-md bg-purple-transparent flex items-center justify-center shrink-0">
										<i className="ph-duotone ph-book-open text-purple"></i>
									</div>
								</div>
								<div id="sup-spark-4" className="-mx-4 -mb-4"></div>
							</div>
						</div>

					</div>

					
					<div className="grid grid-cols-1 xl:grid-cols-12 gap-3 mb-3">

						<div className="xl:col-span-4">
							<div className="bg-white border border-border-color rounded-md p-4 mb-3">
								<div className="flex items-center justify-between mb-4">
									<h2 className="text-lg max-lg:text-[17px] text-title mb-0">Satisfaction Rate</h2>
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
											</div>
										</div>
									</div>
								</div>
								<div id="sup-satisfaction-gauge" className="flex justify-center"></div>
								<div className="flex items-center justify-center gap-3 mt-3 text-[11px]">
									<div className="flex items-center gap-1">
										<span className="size-2 rounded-full bg-danger"></span><span className="text-default">Dissatisfied</span>
									</div>
									<div className="flex items-center gap-1">
										<span className="size-2 rounded-full bg-info"></span><span className="text-default">Neutral</span>
									</div>
									<div className="flex items-center gap-1">
										<span className="size-2 rounded-full bg-success"></span><span className="text-default">Satisfied</span>
									</div>
								</div>
							</div>

							<div className="bg-white border border-border-color rounded-md p-4 pb-1">
								<div className="flex items-center justify-between mb-3">
									<h2 className="text-lg max-lg:text-[17px] text-title mb-0">Ticket Response Rate</h2>
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
											</div>
										</div>
									</div>
								</div>
								<div id="sup-response-rate-chart"></div>
							</div>
						</div>

						<div className="bg-white border border-border-color rounded-md p-4 xl:col-span-8">
							<div className="flex items-center justify-between mb-3">
								<h2 className="text-lg max-lg:text-[17px] text-title mb-0">Recent Tickets</h2>
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
										</div>
									</div>
								</div>
							</div>
							<div className="space-y-3">

								
								<div className="sm:grid sm:grid-cols-12 items-center flex justify-between gap-3">
									<div className="flex items-center gap-2 min-w-0 col-span-12 sm:col-span-4">
										<img src="/images/avatars/avatar-3.png" className="size-9 rounded-full border border-border-color shrink-0" alt="user" />
										<div className="min-w-0">
											<p className="text-xs font-semibold text-title truncate mb-0">Robert Cosper</p>
											<p className="text-[11px] text-default mb-0"><a href="#">#CUS0020</a></p>
										</div>
									</div>
									<div className="hidden sm:block sm:col-span-3">
										<p className="text-[11px] text-default mb-0">Ticket Count</p>
										<p className="text-xs font-semibold text-title mb-0">45</p>
									</div>
									<div className="hidden md:block sm:col-span-2">
										<p className="text-[11px] text-default mb-0">Last Ticket</p>
										<p className="text-xs font-semibold text-title mb-0">05 Sep 2025</p>
									</div>
									<div className="sm:col-span-3 text-end">
										<p className="text-[11px] text-default mb-0">Status</p>
										<span className="text-[11px] bg-info-transparent text-info px-2 py-0.5 rounded">Open</span>
									</div>
								</div>

								
								<div className="sm:grid sm:grid-cols-12 items-center flex justify-between gap-3">
									<div className="flex items-center gap-2 min-w-0 col-span-12 sm:col-span-4">
										<img src="/images/avatars/avatar-4.png" className="size-9 rounded-full border border-border-color shrink-0" alt="user" />
										<div className="min-w-0">
											<p className="text-xs font-semibold text-title truncate mb-0">Helen Nelson</p>
											<p className="text-[11px] text-default mb-0"><a href="#">#CUS0019</a></p>
										</div>
									</div>
									<div className="hidden sm:block sm:col-span-3">
										<p className="text-[11px] text-default mb-0">Ticket Count</p>
										<p className="text-xs font-semibold text-title mb-0">41</p>
									</div>
									<div className="hidden md:block sm:col-span-2">
										<p className="text-[11px] text-default mb-0">Last Ticket</p>
										<p className="text-xs font-semibold text-title mb-0">11 Sep 2025</p>
									</div>
									<div className="sm:col-span-3 text-end">
										<p className="text-[11px] text-default mb-0">Status</p>
										<span className="text-[11px] bg-warning-transparent text-warning px-2 py-0.5 rounded">Pending</span>
									</div>
								</div>

								
								<div className="sm:grid sm:grid-cols-12 items-center flex justify-between gap-3">
									<div className="flex items-center gap-2 min-w-0 col-span-12 sm:col-span-4">
										<img src="/images/avatars/avatar-5.png" className="size-9 rounded-full border border-border-color shrink-0" alt="user" />
										<div className="min-w-0">
											<p className="text-xs font-semibold text-title truncate mb-0">Thomas Neal</p>
											<p className="text-[11px] text-default mb-0"><a href="#">#CUS0018</a></p>
										</div>
									</div>
									<div className="hidden sm:block sm:col-span-3">
										<p className="text-[11px] text-default mb-0">Ticket Count</p>
										<p className="text-xs font-semibold text-title mb-0">36</p>
									</div>
									<div className="hidden md:block sm:col-span-2">
										<p className="text-[11px] text-default mb-0">Last Ticket</p>
										<p className="text-xs font-semibold text-title mb-0">27 Aug 2025</p>
									</div>
									<div className="sm:col-span-3 text-end">
										<p className="text-[11px] text-default mb-0">Status</p>
										<span className="text-[11px] bg-success-transparent text-success px-2 py-0.5 rounded">Resolved</span>
									</div>
								</div>

								
								<div className="sm:grid sm:grid-cols-12 items-center flex justify-between gap-3">
									<div className="flex items-center gap-2 min-w-0 col-span-12 sm:col-span-4">
										<img src="/images/avatars/avatar-6.png" className="size-9 rounded-full border border-border-color shrink-0" alt="user" />
										<div className="min-w-0">
											<p className="text-xs font-semibold text-title truncate mb-0">Sarah Spivey</p>
											<p className="text-[11px] text-default mb-0"><a href="#">#CUS0017</a></p>
										</div>
									</div>
									<div className="hidden sm:block sm:col-span-3">
										<p className="text-[11px] text-default mb-0">Ticket Count</p>
										<p className="text-xs font-semibold text-title mb-0">32</p>
									</div>
									<div className="hidden md:block sm:col-span-2">
										<p className="text-[11px] text-default mb-0">Last Ticket</p>
										<p className="text-xs font-semibold text-title mb-0">15 Aug 2025</p>
									</div>
									<div className="sm:col-span-3 text-end">
										<p className="text-[11px] text-default mb-0">Status</p>
										<span className="text-[11px] bg-danger-transparent text-danger px-2 py-0.5 rounded">Closed</span>
									</div>
								</div>

								
								<div className="sm:grid sm:grid-cols-12 items-center flex justify-between gap-3">
									<div className="flex items-center gap-2 min-w-0 col-span-12 sm:col-span-4">
										<img src="/images/avatars/avatar-7.png" className="size-9 rounded-full border border-border-color shrink-0" alt="user" />
										<div className="min-w-0">
											<p className="text-xs font-semibold text-title truncate mb-0">Jared Griffin</p>
											<p className="text-[11px] text-default mb-0"><a href="#">#CUS0016</a></p>
										</div>
									</div>
									<div className="hidden sm:block sm:col-span-3">
										<p className="text-[11px] text-default mb-0">Ticket Count</p>
										<p className="text-xs font-semibold text-title mb-0">29</p>
									</div>
									<div className="hidden md:block sm:col-span-2">
										<p className="text-[11px] text-default mb-0">Last Ticket</p>
										<p className="text-xs font-semibold text-title mb-0">03 Aug 2025</p>
									</div>
									<div className="sm:col-span-3 text-end">
										<p className="text-[11px] text-default mb-0">Status</p>
										<span className="text-[11px] bg-info-transparent text-info px-2 py-0.5 rounded">Open</span>
									</div>
								</div>

								
								<div className="sm:grid sm:grid-cols-12 items-center flex justify-between gap-3">
									<div className="flex items-center gap-2 min-w-0 col-span-12 sm:col-span-4">
										<img src="/images/avatars/avatar-8.png" className="size-9 rounded-full border border-border-color shrink-0" alt="user" />
										<div className="min-w-0">
											<p className="text-xs font-semibold text-title truncate mb-0">Alexander Kenn</p>
											<p className="text-[11px] text-default mb-0"><a href="#">#CUS0015</a></p>
										</div>
									</div>
									<div className="hidden sm:block sm:col-span-3">
										<p className="text-[11px] text-default mb-0">Ticket Count</p>
										<p className="text-xs font-semibold text-title mb-0">25</p>
									</div>
									<div className="hidden md:block sm:col-span-2">
										<p className="text-[11px] text-default mb-0">Last Ticket</p>
										<p className="text-xs font-semibold text-title mb-0">28 Jul 2025</p>
									</div>
									<div className="sm:col-span-3 text-end">
										<p className="text-[11px] text-default mb-0">Status</p>
										<span className="text-[11px] bg-warning-transparent text-warning px-2 py-0.5 rounded">Pending</span>
									</div>
								</div>

								
								<div className="sm:grid sm:grid-cols-12 items-center flex justify-between gap-3">
									<div className="flex items-center gap-2 min-w-0 col-span-12 sm:col-span-4">
										<img src="/images/avatars/avatar-3.png" className="size-9 rounded-full border border-border-color shrink-0" alt="user" />
										<div className="min-w-0">
											<p className="text-xs font-semibold text-title truncate mb-0">Alex Thompson</p>
											<p className="text-[11px] text-default mb-0"><a href="#">#CUS0018</a></p>
										</div>
									</div>
									<div className="hidden sm:block sm:col-span-3">
										<p className="text-[11px] text-default mb-0">Ticket Count</p>
										<p className="text-xs font-semibold text-title mb-0">35</p>
									</div>
									<div className="hidden md:block sm:col-span-2">
										<p className="text-[11px] text-default mb-0">Last Ticket</p>
										<p className="text-xs font-semibold text-title mb-0">15 Jul 2025</p>
									</div>
									<div className="sm:col-span-3 text-end">
										<p className="text-[11px] text-default mb-0">Status</p>
										<span className="text-[11px] bg-success-transparent text-success px-2 py-0.5 rounded">Resolved</span>
									</div>
								</div>

								
								<div className="sm:grid sm:grid-cols-12 items-center flex justify-between gap-3">
									<div className="flex items-center gap-2 min-w-0 col-span-12 sm:col-span-4">
										<img src="/images/avatars/avatar-5.png" className="size-9 rounded-full border border-border-color shrink-0" alt="user" />
										<div className="min-w-0">
											<p className="text-xs font-semibold text-title truncate mb-0">Maria Garcia</p>
											<p className="text-[11px] text-default mb-0"><a href="#">#CUS0019</a></p>
										</div>
									</div>
									<div className="hidden sm:block sm:col-span-3">
										<p className="text-[11px] text-default mb-0">Ticket Count</p>
										<p className="text-xs font-semibold text-title mb-0">40</p>
									</div>
									<div className="hidden md:block sm:col-span-2">
										<p className="text-[11px] text-default mb-0">Last Ticket</p>
										<p className="text-xs font-semibold text-title mb-0">10 Jul 2025</p>
									</div>
									<div className="sm:col-span-3 text-end">
										<p className="text-[11px] text-default mb-0">Status</p>
										<span className="text-[11px] bg-warning-transparent text-warning px-2 py-0.5 rounded">Pending</span>
									</div>
								</div>

								
								<div className="sm:grid sm:grid-cols-12 items-center flex justify-between gap-3">
									<div className="flex items-center gap-2 min-w-0 col-span-12 sm:col-span-4">
										<img src="/images/avatars/avatar-7.png" className="size-9 rounded-full border border-border-color shrink-0" alt="user" />
										<div className="min-w-0">
											<p className="text-xs font-semibold text-title truncate mb-0">Thomas Mervin</p>
											<p className="text-[11px] text-default mb-0"><a href="#">#CUS0020</a></p>
										</div>
									</div>
									<div className="hidden sm:block sm:col-span-3">
										<p className="text-[11px] text-default mb-0">Ticket Count</p>
										<p className="text-xs font-semibold text-title mb-0">32</p>
									</div>
									<div className="hidden md:block sm:col-span-2">
										<p className="text-[11px] text-default mb-0">Last Ticket</p>
										<p className="text-xs font-semibold text-title mb-0">28 June 2025</p>
									</div>
									<div className="sm:col-span-3 text-end">
										<p className="text-[11px] text-default mb-0">Status</p>
										<span className="text-[11px] bg-success-transparent text-success px-2 py-0.5 rounded">Resolved</span>
									</div>
								</div>

								
								<div className="sm:grid sm:grid-cols-12 items-center flex justify-between gap-3">
									<div className="flex items-center gap-2 min-w-0 col-span-12 sm:col-span-4">
										<img src="/images/avatars/avatar-9.png" className="size-9 rounded-full border border-border-color shrink-0" alt="user" />
										<div className="min-w-0">
											<p className="text-xs font-semibold text-title truncate mb-0">Regina Bryant</p>
											<p className="text-[11px] text-default mb-0"><a href="#">#CUS0021</a></p>
										</div>
									</div>
									<div className="hidden sm:block sm:col-span-3">
										<p className="text-[11px] text-default mb-0">Ticket Count</p>
										<p className="text-xs font-semibold text-title mb-0">22</p>
									</div>
									<div className="hidden md:block sm:col-span-2">
										<p className="text-[11px] text-default mb-0">Last Ticket</p>
										<p className="text-xs font-semibold text-title mb-0">19 June 2025</p>
									</div>
									<div className="sm:col-span-3 text-end">
										<p className="text-[11px] text-default mb-0">Status</p>
										<span className="text-[11px] bg-info-transparent text-info px-2 py-0.5 rounded">Open</span>
									</div>
								</div>

							</div>
						</div>
					</div>

					
					<div className="bg-white border border-border-color rounded-md p-4 pb-1.5">
						<div className="flex items-center justify-between mb-3">
							<h2 className="text-lg max-lg:text-[17px] text-title mb-0">All Tickets</h2>
							<a href="tickets.html" className="btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-1 hover:bg-primary hover:text-white hover:border-primary">View All <i className="icon-chevron-right"></i></a>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="text-xs text-default border-b border-border-color">
										<th className="text-left py-2 px-2 font-semibold text-gray-900">Ticket ID</th>
										<th className="text-left py-2 px-2 font-semibold text-gray-900">Customer</th>
										<th className="text-left py-2 px-2 font-semibold text-gray-900">Created On</th>
										<th className="text-left py-2 px-2 font-semibold text-gray-900">Subject</th>
										<th className="text-left py-2 px-2 font-semibold text-gray-900">Priority</th>
										<th className="text-left py-2 px-2 font-semibold text-gray-900">Last Updated</th>
										<th className="text-left py-2 px-2 font-semibold text-gray-900">Assigned To</th>
										<th className="text-left py-2 px-2 font-semibold text-gray-900">Status</th>
									</tr>
								</thead>
								<tbody>
									<tr className="border-b border-border-color last:border-0">
										<td className="py-2.5 px-2 text-xs text-default"><a href="#">#TKT0020</a></td>
										<td className="py-2.5 px-2">
											<div className="flex items-center gap-2">
												<img src="/images/avatars/avatar-3.png" className="size-7 rounded-full border border-border-color shrink-0" alt="user" /><span className="text-xs font-semibold text-title">Alexander Kenn</span>
											</div>
										</td>
										<td className="py-2.5 px-2 text-xs text-default">11 Sep 2025</td>
										<td className="py-2.5 px-2 text-xs text-default">Login Issue</td>
										<td className="py-2.5 px-2"><span className="text-[11px] bg-info-transparent text-info px-2 py-0.5 rounded">Low</span></td>
										<td className="py-2.5 px-2 text-xs text-default">26 Sep 2025</td>
										<td className="py-2.5 px-2">
											<div className="flex items-center gap-2">
												<img src="/images/avatars/avatar-4.png" className="size-7 rounded-full border border-border-color shrink-0" alt="user" /><span className="text-xs font-semibold text-title">Steven Schroer</span>
											</div>
										</td>
										<td className="py-2.5 px-2"><span className="text-[11px] bg-info-transparent text-info px-2 py-0.5 rounded">Open</span></td>
									</tr>
									<tr className="border-b border-border-color last:border-0">
										<td className="py-2.5 px-2 text-xs text-default"><a href="#">#TKT0019</a></td>
										<td className="py-2.5 px-2">
											<div className="flex items-center gap-2">
												<img src="/images/avatars/avatar-4.png" className="size-7 rounded-full border border-border-color shrink-0" alt="user" /><span className="text-xs font-semibold text-title">Gabriella White</span>
											</div>
										</td>
										<td className="py-2.5 px-2 text-xs text-default">05 Sep 2025</td>
										<td className="py-2.5 px-2 text-xs text-default">Invoice Query</td>
										<td className="py-2.5 px-2"><span className="text-[11px] bg-warning-transparent text-warning px-2 py-0.5 rounded">Medium</span></td>
										<td className="py-2.5 px-2 text-xs text-default">20 Sep 2025</td>
										<td className="py-2.5 px-2">
											<div className="flex items-center gap-2">
												<img src="/images/avatars/avatar-5.png" className="size-7 rounded-full border border-border-color shrink-0" alt="user" /><span className="text-xs font-semibold text-title">Regina Bryant</span>
											</div>
										</td>
										<td className="py-2.5 px-2"><span className="text-[11px] bg-warning-transparent text-warning px-2 py-0.5 rounded">Pending</span></td>
									</tr>
									<tr className="border-b border-border-color last:border-0">
										<td className="py-2.5 px-2 text-xs text-default"><a href="#">#TKT0018</a></td>
										<td className="py-2.5 px-2">
											<div className="flex items-center gap-2">
												<img src="/images/avatars/avatar-5.png" className="size-7 rounded-full border border-border-color shrink-0" alt="user" /><span className="text-xs font-semibold text-title">Christopher Rey</span>
											</div>
										</td>
										<td className="py-2.5 px-2 text-xs text-default">27 Aug 2025</td>
										<td className="py-2.5 px-2 text-xs text-default">Password Reset</td>
										<td className="py-2.5 px-2"><span className="text-[11px] bg-danger-transparent text-danger px-2 py-0.5 rounded">High</span></td>
										<td className="py-2.5 px-2 text-xs text-default">11 Sep 2025</td>
										<td className="py-2.5 px-2">
											<div className="flex items-center gap-2">
												<img src="/images/avatars/avatar-6.png" className="size-7 rounded-full border border-border-color shrink-0" alt="user" /><span className="text-xs font-semibold text-title">James Parker</span>
											</div>
										</td>
										<td className="py-2.5 px-2"><span className="text-[11px] bg-success-transparent text-success px-2 py-0.5 rounded">Resolved</span></td>
									</tr>
									<tr className="border-b border-border-color last:border-0">
										<td className="py-2.5 px-2 text-xs text-default"><a href="#">#TKT0017</a></td>
										<td className="py-2.5 px-2">
											<div className="flex items-center gap-2">
												<img src="/images/avatars/avatar-6.png" className="size-7 rounded-full border border-border-color shrink-0" alt="user" /><span className="text-xs font-semibold text-title">Penelope Ton</span>
											</div>
										</td>
										<td className="py-2.5 px-2 text-xs text-default">16 Aug 2025</td>
										<td className="py-2.5 px-2 text-xs text-default">Purchase Order Issue</td>
										<td className="py-2.5 px-2"><span className="text-[11px] bg-info-transparent text-info px-2 py-0.5 rounded">Low</span></td>
										<td className="py-2.5 px-2 text-xs text-default">31 Aug 2025</td>
										<td className="py-2.5 px-2">
											<div className="flex items-center gap-2">
												<img src="/images/avatars/avatar-7.png" className="size-7 rounded-full border border-border-color shrink-0" alt="user" /><span className="text-xs font-semibold text-title">Muriel Hood</span>
											</div>
										</td>
										<td className="py-2.5 px-2"><span className="text-[11px] bg-danger-transparent text-danger px-2 py-0.5 rounded">Closed</span></td>
									</tr>
									<tr className="border-b border-border-color last:border-0">
										<td className="py-2.5 px-2 text-xs text-default"><a href="#">#TKT0011</a></td>
										<td className="py-2.5 px-2">
											<div className="flex items-center gap-2">
												<img src="/images/avatars/avatar-7.png" className="size-7 rounded-full border border-border-color shrink-0" alt="user" />
												<span className="text-xs font-semibold text-title">Catherine Lan</span>
											</div>
										</td>
										<td className="py-2.5 px-2 text-xs text-default">18 May 2025</td>
										<td className="py-2.5 px-2 text-xs text-default">Bug Report</td>
										<td className="py-2.5 px-2"><span className="text-[11px] bg-info-transparent text-info px-2 py-0.5 rounded">Low</span></td>
										<td className="py-2.5 px-2 text-xs text-default">02 Jun 2025</td>
										<td className="py-2.5 px-2">
											<div className="flex items-center gap-2">
												<img src="/images/avatars/avatar-8.png" className="size-7 rounded-full border border-border-color shrink-0" alt="user" />
												<span className="text-xs font-semibold text-title">Tina Williams</span>
											</div>
										</td>
										<td className="py-2.5 px-2"><span className="text-[11px] bg-warning-transparent text-warning px-2 py-0.5 rounded">Pending</span></td>
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
