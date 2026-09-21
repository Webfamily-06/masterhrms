import { usePermissions } from "@/lib/permissions";
import { AccessDenied } from "@/components/access-denied";
import { Loader2 } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { initFlatpickr } from "@/lib/init-dashboard";
import { initProcurementCharts } from "@/lib/dashboard-charts";

export const Route = createFileRoute("/_authenticated/_app/procurement-dashboard")({
  component: ProcurementDashboardPage,
});

export default function ProcurementDashboardPage() {
  const { canAccessModule, loading } = usePermissions();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <p className="text-xs text-muted-foreground font-medium animate-pulse">Verifying workspace permissions...</p>
      </div>
    );
  }

  if (!canAccessModule("procurement")) {
    return (
      <AccessDenied
        moduleName="Procurement Dashboard"
        requiredPermission="procurement.dashboard.view"
        message="You do not have permission to access the Procurement Dashboard."
      />
    );
  }

  useEffect(() => {
    // 1. Bind interactive flatpickr to calendar input
    initFlatpickr();

    // 2. Initialize exact page charts
    const cleanup = initProcurementCharts();

    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, []);

  return (
    <div className="w-full min-w-0 flex-1">
      <div className="p-3 lg:py-6 lg:px-0">
                    
					<div className="flex flex-wrap items-center justify-between gap-3 mb-3 lg:mb-6">
						<h1 className="text-gray-900 text-xl font-bold mb-0">Procurement Dashboard</h1>
						<div className="flex items-center gap-2">
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

					
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-3 mb-3">
						<div className="bg-white border border-border-color rounded-md p-4 overflow-hidden">
							<div className="flex items-center gap-3 mb-2">
								<div className="size-10 rounded-full bg-success flex items-center justify-center shrink-0">
									<i className="ph-duotone ph-user-circle text-white text-lg"></i>
								</div>
									<div className="min-w-0"><p className="text-xs text-default mb-1">Total Spend</p>
										<div className="text-xl font-bold text-gray-900 mb-0">$2,145</div>
									</div>
								</div>
							<div id="proc-spark-1" className="-mx-4 -mb-4"></div>
						</div>
						<div className="bg-white border border-border-color rounded-md p-4 overflow-hidden">
							<div className="flex items-center gap-3 mb-2">
								<div className="size-10 rounded-full bg-purple flex items-center justify-center shrink-0">
									<i className="ph-duotone ph-info text-white text-lg"></i>
								</div>
								<div className="min-w-0">
									<p className="text-xs text-default mb-1">Purchase Orders</p><div className="text-xl font-bold text-gray-900 mb-0">128</div>
								</div>
							</div>
							<div id="proc-spark-2" className="-mx-4 -mb-4"></div>
						</div>
						<div className="bg-white border border-border-color rounded-md p-4 overflow-hidden">
							<div className="flex items-center gap-3 mb-2">
								<div className="size-10 rounded-full bg-orange flex items-center justify-center shrink-0">
									<i className="ph-duotone ph-clock text-white text-lg"></i>
								</div>
								<div className="min-w-0"><p className="text-xs text-default mb-1">On Time Delivery</p>
									<div className="text-xl font-bold text-gray-900 mb-0">88%</div>
								</div>
							</div>
							<div id="proc-spark-3" className="-mx-4 -mb-4"></div>
						</div>
						<div className="bg-white border border-border-color rounded-md p-4 overflow-hidden">
							<div className="flex items-center gap-3 mb-2">
								<div className="size-10 rounded-full bg-pink flex items-center justify-center shrink-0">
									<i className="ph-duotone ph-credit-card text-white text-lg"></i>
								</div>
								<div className="min-w-0"><p className="text-xs text-default mb-1">Avg PO Value</p>
									<div className="text-xl font-bold text-gray-900 mb-0">$600</div>
								</div>
							</div>
							<div id="proc-spark-4" className="-mx-4 -mb-4"></div>
						</div>
					</div>

					
					<div className="grid grid-cols-1 xl:grid-cols-12 gap-3 mb-3">
						<div className="bg-white border border-border-color rounded-md p-4 xl:col-span-5">
							<div className="flex items-center justify-between mb-3">
								<h2 className="text-lg max-lg:text-[17px] text-title mb-0">Top Suppliers</h2>
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
							<div id="proc-top-suppliers-chart"></div>
						</div>
						<div className="bg-white border border-border-color rounded-md p-4 xl:col-span-7">
							<div className="flex items-center justify-between mb-3">
								<h2 className="text-lg max-lg:text-[17px] text-title mb-0">Monthly Spend Trend</h2>
								<div className="hs-dropdown [--placement:bottom-right] [--auto-close:inside] relative inline-flex">
									<button type="button" className="hs-dropdown-toggle cursor-pointer btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-2 hover:bg-primary hover:border-primary hover:text-white focus:bg-primary focus:border-primary focus:text-white  focus:outline-hidden" aria-haspopup="menu" aria-expanded="false" aria-label="Dropdown">
										January <i className="icon-chevron-down"></i>
									</button>

									<div className="hs-dropdown-menu transition-[opacity,margin] duration hs-dropdown-open:opacity-100 opacity-0 hidden min-w-50 bg-white border border-border-color shadow rounded-md mt-2 z-1" role="menu" aria-orientation="vertical" tabIndex={-1}>
										<div className="p-2 space-y-1"> 
											<a className="flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light hover:text-gray-900 focus:outline-hidden focus:bg-white" href="#">
												January
											</a>
											<a className="flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light hover:text-gray-900 focus:outline-hidden focus:bg-white" href="#">
												February
											</a> 
											<a className="flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 hover:bg-light hover:text-gray-900 focus:outline-hidden focus:bg-white" href="#">
												March
											</a> 
										</div>
									</div>
								</div>
							</div>
							<div id="proc-monthly-spend-chart"></div>
						</div>
					</div>

					
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-3">

						<div className="bg-white border border-border-color rounded-md p-4 lg:col-span-4">
							<div className="flex items-center justify-between mb-3">
								<h2 className="text-lg max-lg:text-[17px] text-title mb-0">Payments</h2>
								<a href="procurement-analytics.html" className="btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-1 hover:bg-primary hover:text-white hover:border-primary">View All <i className="icon-chevron-right"></i></a>
							</div>
							<div className="space-y-3">
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-2 min-w-0">
										<img src="/images/avatars/avatar-3.png" className="size-9 rounded-full border border-border-color shrink-0" alt="user" />
										<div className="min-w-0">
											<p className="text-xs font-semibold text-title truncate mb-0">Robert Cosper</p>
											<p className="text-[11px] text-default mb-0"><a href="#">#CUS0020</a></p>
										</div>
									</div>
									<div className="text-end">
										<p className="text-xs font-semibold text-title mb-0">$2,300</p>
										<span className="text-[10px] bg-success-transparent text-success px-1.5 py-0.5 rounded">Paid</span>
									</div>
								</div>
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-2 min-w-0">
										<img src="/images/avatars/avatar-4.png" className="size-9 rounded-full border border-border-color shrink-0" alt="user" />
										<div className="min-w-0">
											<p className="text-xs font-semibold text-title truncate mb-0">Helen Nelson</p>
											<p className="text-[11px] text-default mb-0"><a href="#">#CUS0019</a></p>
										</div>
									</div>
									<div className="text-end">
										<p className="text-xs font-semibold text-title mb-0">$3,600</p>
										<span className="text-[10px] bg-warning-transparent text-warning px-1.5 py-0.5 rounded">Pending</span>
									</div>
								</div>
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-2 min-w-0">
										<img src="/images/avatars/avatar-5.png" className="size-9 rounded-full border border-border-color shrink-0" alt="user" />
										<div className="min-w-0">
											<p className="text-xs font-semibold text-title truncate mb-0">Thomas Neal</p>
											<p className="text-[11px] text-default mb-0"><a href="#">#CUS0018</a></p>
										</div>
									</div>
									<div className="text-end">
										<p className="text-xs font-semibold text-title mb-0">$4,100</p>
										<span className="text-[10px] bg-danger-transparent text-danger px-1.5 py-0.5 rounded">Failed
										</span>
									</div>
									</div>
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-2 min-w-0">
										<img src="/images/avatars/avatar-6.png" className="size-9 rounded-full border border-border-color shrink-0" alt="user" />
										<div className="min-w-0">
											<p className="text-xs font-semibold text-title truncate mb-0">Sarah Spivey</p>
											<p className="text-[11px] text-default mb-0"><a href="#">#CUS0017</a></p>
										</div>
									</div>
									<div className="text-end">
										<p className="text-xs font-semibold text-title mb-0">$1,500</p>
										<span className="text-[10px] bg-success-transparent text-success px-1.5 py-0.5 rounded">Paid
										</span>
									</div>
								</div>
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-2 min-w-0">
										<img src="/images/avatars/avatar-7.png" className="size-9 rounded-full border border-border-color shrink-0" alt="user" />
										<div className="min-w-0">
											<p className="text-xs font-semibold text-title truncate mb-0">Jared Griffin</p>
											<p className="text-[11px] text-default mb-0"><a href="#">#CUS0016</a></p>
										</div>
									</div>
									<div className="text-end">
										<p className="text-xs font-semibold text-title mb-0">$2,700</p>
										<span className="text-[10px] bg-warning-transparent text-warning px-1.5 py-0.5 rounded">Pending</span>
									</div>
								</div>
							</div>
						</div>

						<div className="bg-white border border-border-color rounded-md p-4 lg:col-span-8">
							<div className="flex items-center justify-between mb-3">
								<h2 className="text-lg max-lg:text-[17px] text-title mb-0">Top Orders</h2>
								<a href="procurement-analytics.html" className="btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-1 hover:bg-primary hover:text-white hover:border-primary">View All <i className="icon-chevron-right"></i>
								</a>
							</div>
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead>
										<tr className="text-xs text-default border-b border-border-color">
											<th className="text-left py-2 px-2 font-semibold text-gray-900">ID</th>
											<th className="text-left py-2 px-2 font-semibold text-gray-900">Supplier</th>
											<th className="text-left py-2 px-2 font-semibold text-gray-900">Category</th>
											<th className="text-left py-2 px-2 font-semibold text-gray-900">Amount</th>
											<th className="text-left py-2 px-2 font-semibold text-gray-900">Status</th>
										</tr>
									</thead>
									<tbody>
										<tr className="border-b border-border-color last:border-0">
											<td className="py-2.5 px-2 text-xs text-default"><a href="#">#ORD0020</a></td>
											<td className="py-2.5 px-2">
												<div className="flex items-center gap-2">
												    <div className="size-7 rounded-md bg-success-transparent flex items-center justify-center">
													    <i className="ph-duotone ph-buildings text-success"></i>
												   </div>
												   <span className="text-xs font-semibold text-title">Alpha Distributors</span>
											    </div>
										    </td>
											<td className="py-2.5 px-2 text-xs text-default">Raw Materials</td>
												<td className="py-2.5 px-2 text-xs text-gray-900">$500</td>
											<td className="py-2.5 px-2">
												<span className="inline-flex items-center text-[11px] bg-success-transparent text-success px-2 py-0.5 rounded">Delivered 
												<i className="ph ph-check text-[10px] ms-1"></i></span>
											</td>
										</tr>
									<tr className="border-b border-border-color last:border-0">
										<td className="py-2.5 px-2 text-xs text-default"><a href="#">#ORD0019</a></td>
										<td className="py-2.5 px-2">
											<div className="flex items-center gap-2">
												<div className="size-7 rounded-md bg-orange-transparent flex items-center justify-center">
													<i className="ph-duotone ph-storefront text-orange"></i>
												</div>
												<span className="text-xs font-semibold text-title">Beta Industries</span>
											</div>
										</td>
										<td className="py-2.5 px-2 text-xs text-default">IT Equipment</td>
										<td className="py-2.5 px-2 text-xs text-gray-900">$650</td>
										<td className="py-2.5 px-2">
											<span className="inline-flex items-center text-[11px] bg-warning-transparent text-warning px-2 py-0.5 rounded">
												Pending <i className="ph ph-clock text-[10px] ms-1"></i>
											</span>
										</td>
									</tr>
									<tr className="border-b border-border-color last:border-0">
										<td className="py-2.5 px-2 text-xs text-default"><a href="#">#ORD0018</a></td>
										<td className="py-2.5 px-2">
											<div className="flex items-center gap-2">
												<div className="size-7 rounded-md bg-info-transparent flex items-center justify-center">
													<i className="ph-duotone ph-leaf text-info"></i>
												</div>
												<span className="text-xs font-semibold text-title">Zenith Supplies</span>
											</div>
										</td>
										<td className="py-2.5 px-2 text-xs text-default">IT Equipment</td>
										<td className="py-2.5 px-2 text-xs text-gray-900">$120</td>
										<td className="py-2.5 px-2">
											<span className="inline-flex items-center text-[11px] bg-info-transparent text-info px-2 py-0.5 rounded">
												In Transit <i className="ph ph-truck text-[10px] ms-1"></i>
											</span>
										</td>
									</tr>
									<tr className="border-b border-border-color last:border-0">
										<td className="py-2.5 px-2 text-xs text-default"><a href="#">#ORD0017</a></td>
										<td className="py-2.5 px-2">
											<div className="flex items-center gap-2">
												<div className="size-7 rounded-md bg-purple-transparent flex items-center justify-center">
													<i className="ph-duotone ph-circle text-purple"></i>
												</div>
												<span className="text-xs font-semibold text-title">Orion Equipments</span>
											</div>
										</td>
										<td className="py-2.5 px-2 text-xs text-default">Office Supplies</td>
										<td className="py-2.5 px-2 text-xs text-gray-900">$860</td>
										<td className="py-2.5 px-2">
											<span className="inline-flex items-center text-[11px] bg-success-transparent text-success px-2 py-0.5 rounded">
												Delivered <i className="ph ph-check text-[10px] ms-1"></i>
											</span>
										</td>
									</tr>
									</tbody>
								</table>
							</div>
						</div>

					</div>

					
					<div className="grid grid-cols-1 xl:grid-cols-12 gap-3 mb-3">
						<div className="bg-white border border-border-color rounded-md p-4 xxl:col-span-4 xl:col-span-12">
							<div className="flex items-center justify-between mb-3">
								<h2 className="text-lg max-lg:text-[17px] text-title mb-0">Supplier Performance</h2>
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
							<div id="proc-supplier-perf-chart"></div>
							<div className="flex items-center justify-center gap-4 mt-2 text-[11px]"><div className="flex items-center gap-1"><span className="size-2 rounded-full bg-info"></span><span className="text-default">Quality</span></div><div className="flex items-center gap-1"><span className="size-2 rounded-full bg-orange"></span><span className="text-default">Cost Efficiency</span></div></div>
						</div>
						<div className="bg-white border border-border-color rounded-md p-4 xxl:col-span-4 xl:col-span-6">
							<div className="flex items-center justify-between mb-3">
								<h2 className="text-lg max-lg:text-[17px] text-title mb-0">Spend by Category</h2>
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
							<div className="flex items-center justify-center">
								<div id="proc-spend-cat-chart"></div> 
							</div>
							<div className="space-y-1.5 mt-3">
								<div className="flex items-center justify-between gap-2 text-[11px]"><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-success"></span><span className="text-default">Clothing</span></div><span className="font-semibold text-gray-900">42%</span></div>
								<div className="flex items-center justify-between gap-2 text-[11px]"><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-orange"></span><span className="text-default">Beauty Products</span></div><span className="font-semibold text-gray-900">38%</span></div>
								<div className="flex items-center justify-between gap-2 text-[11px]"><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-info"></span><span className="text-default">Electronics</span></div><span className="font-semibold text-gray-900">20%</span></div>
							</div>
						</div>
						<div className="bg-white border border-border-color rounded-md p-4 xxl:col-span-4 xl:col-span-6">
							<div className="flex items-center justify-between mb-3">
								<h2 className="text-lg max-lg:text-[17px] text-title mb-0">Order Status</h2>
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
							<div id="proc-order-status-chart" className="flex justify-center"></div>
							<div className="grid grid-cols-2 gap-2 mt-3">
								<div className="flex items-center gap-2 text-[11px]"><span className="size-2 rounded-full bg-success"></span><span className="text-default">Approved</span></div>
								<div className="flex items-center gap-2 text-[11px]"><span className="size-2 rounded-full bg-orange"></span><span className="text-default">Pending</span></div>
								<div className="flex items-center gap-2 text-[11px]"><span className="size-2 rounded-full bg-info"></span><span className="text-default">Delivered</span></div>
								<div className="flex items-center gap-2 text-[11px]"><span className="size-2 rounded-full bg-danger"></span><span className="text-default">Rejected</span></div>
							</div>
						</div>
					</div>

					
					<div className="bg-white border border-border-color rounded-md p-4">
						<div className="flex items-center justify-between mb-3 flex-wrap gap-3">
							<h2 className="text-lg max-lg:text-[17px] text-title mb-0">Recent Procurement Activity</h2>
							<a href="procurement-analytics.html" className="btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-1 hover:bg-primary hover:text-white hover:border-primary">View All <i className="icon-chevron-right"></i></a></div>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead><tr className="text-xs text-default border-b border-border-color">
									<th className="text-left py-2 px-2 font-semibold text-gray-900">ID</th>
									<th className="text-left py-2 px-2 font-semibold text-gray-900">Supplier</th>
									<th className="text-left py-2 px-2 font-semibold text-gray-900">Requestor</th>
									<th className="text-left py-2 px-2 font-semibold text-gray-900">Purchase ID</th>
									<th className="text-left py-2 px-2 font-semibold text-gray-900">Ordered Qty</th>
									<th className="text-left py-2 px-2 font-semibold text-gray-900">Delivered Qty</th>
									<th className="text-left py-2 px-2 font-semibold text-gray-900">Delivery Date</th>
									<th className="text-left py-2 px-2 font-semibold text-gray-900">Status</th>
								</tr>
							</thead>
								<tbody>
									<tr className="border-b border-border-color last:border-0">
										<td className="py-2.5 px-2 text-xs text-default"><a href="#">#PAR0020</a></td>
										<td className="py-2.5 px-2 text-xs font-semibold text-title">Alpha Distributors</td>
										<td className="py-2.5 px-2">
											<div className="flex items-center gap-2">
												<img src="/images/avatars/avatar-3.png" className="size-7 rounded-full border border-border-color shrink-0" alt="user" />
												<span className="text-xs font-semibold text-title">Alexander Kenn</span>
											</div></td>
											<td className="py-2.5 px-2 text-xs text-default"><a href="#">#POD0020</a></td>
											<td className="py-2.5 px-2 text-xs text-gray-900">02</td>
											<td className="py-2.5 px-2 text-xs text-gray-900">02</td>
											<td className="py-2.5 px-2 text-xs text-default">11 Sep 2025</td>
											<td className="py-2.5 px-2">
												<span className="text-[11px] bg-success-transparent text-success px-2 py-0.5 rounded">Delivered</span>
											</td>
										</tr>
									<tr className="border-b border-border-color last:border-0">
										<td className="py-2.5 px-2 text-xs text-default"><a href="#">#PAR0019</a></td>
										<td className="py-2.5 px-2 text-xs font-semibold text-title">Beta Industries</td>
										<td className="py-2.5 px-2"><div className="flex items-center gap-2">
											<img src="/images/avatars/avatar-4.png" className="size-7 rounded-full border border-border-color shrink-0" alt="user" />
											<span className="text-xs font-semibold text-title">Gabriella White</span>
										</div></td>
										<td className="py-2.5 px-2 text-xs text-default"><a href="#">#POD0019</a></td>
										<td className="py-2.5 px-2 text-xs text-gray-900">03</td>
										<td className="py-2.5 px-2 text-xs text-gray-900">03</td>
										<td className="py-2.5 px-2 text-xs text-default">05 Sep 2025</td>
										<td className="py-2.5 px-2">
											<span className="text-[11px] bg-success-transparent text-success px-2 py-0.5 rounded">Delivered</span></td>
										</tr>
									<tr className="border-b border-border-color last:border-0">
										<td className="py-2.5 px-2 text-xs text-default"><a href="#">#PAR0018</a></td>
										<td className="py-2.5 px-2 text-xs font-semibold text-title">Zenith Supplies</td>
										<td className="py-2.5 px-2">
											<div className="flex items-center gap-2">
												<img src="/images/avatars/avatar-5.png" className="size-7 rounded-full border border-border-color shrink-0" alt="user" />
												<span className="text-xs font-semibold text-title">Christopher Rey</span>
											</div></td>
											<td className="py-2.5 px-2 text-xs text-default"><a href="#">#POD0018</a></td>
											<td className="py-2.5 px-2 text-xs text-gray-900">05</td>
											<td className="py-2.5 px-2 text-xs text-gray-900">05</td>
											<td className="py-2.5 px-2 text-xs text-default">27 Aug 2025</td>
											<td className="py-2.5 px-2">
												<span className="text-[11px] bg-success-transparent text-success px-2 py-0.5 rounded">Delivered</span>
											</td>
											</tr>
									<tr className="border-b border-border-color last:border-0">
										<td className="py-2.5 px-2 text-xs text-default"><a href="#">#PAR0017</a></td>
										<td className="py-2.5 px-2 text-xs font-semibold text-title">Orion Equipments</td>
										<td className="py-2.5 px-2"><div className="flex items-center gap-2">
											<img src="/images/avatars/avatar-6.png" className="size-7 rounded-full border border-border-color shrink-0" alt="user" />
											<span className="text-xs font-semibold text-title">Penelope Ton</span>
										</div></td><td className="py-2.5 px-2 text-xs text-default"><a href="#">#POD0017</a></td>
										<td className="py-2.5 px-2 text-xs text-gray-900">10</td>
										<td className="py-2.5 px-2 text-xs text-gray-900">04</td>
										<td className="py-2.5 px-2 text-xs text-default">16 Aug 2025</td>
										<td className="py-2.5 px-2">
											<span className="text-[11px] bg-info-transparent text-info px-2 py-0.5 rounded">Partially Delivered</span>
										</td>
										</tr>
									<tr className="border-b border-border-color last:border-0">
										<td className="py-2.5 px-2 text-xs text-default"><a href="#">#PAR0011</a></td>
										<td className="py-2.5 px-2 text-xs font-semibold text-title">Stellar Tools</td>
										<td className="py-2.5 px-2">
											<div className="flex items-center gap-2">
											<img src="/images/avatars/avatar-7.png" className="size-7 rounded-full border border-border-color shrink-0" alt="user" />
											<span className="text-xs font-semibold text-title">Catherine Lan</span>
										</div></td>
										<td className="py-2.5 px-2 text-xs text-default"><a href="#">#POD0011</a></td>
										<td className="py-2.5 px-2 text-xs text-gray-900">07</td>
										<td className="py-2.5 px-2 text-xs text-gray-900">07</td>
										<td className="py-2.5 px-2 text-xs text-default">18 May 2025</td>
										<td className="py-2.5 px-2">
											<span className="text-[11px] bg-success-transparent text-success px-2 py-0.5 rounded">Delivered</span>
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
