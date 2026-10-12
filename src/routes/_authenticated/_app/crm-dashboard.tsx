import { usePermissions } from "@/lib/permissions";
import { AccessDenied } from "@/components/access-denied";
import { Loader2 } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatSystemAmount } from "@/lib/currency";
import { initFlatpickr } from "@/lib/init-dashboard";
import { initCrmCharts } from "@/lib/dashboard-charts";

export const Route = createFileRoute("/_authenticated/_app/crm-dashboard")({
  component: CrmDashboardPage,
});

export default function CrmDashboardPage() {
  const { canAccessModule, loading } = usePermissions();

  const { data: crmData } = useQuery({
    queryKey: ["dashboard-sales-crm"],
    queryFn: async () => {
      const res = await api.get<any>("/dashboard/sales-crm");
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

  if (!canAccessModule("crm")) {
    return (
      <AccessDenied
        moduleName="Sales CRM Dashboard"
        requiredPermission="crm.dashboard.view"
        message="You do not have permission to access the Sales CRM Dashboard."
      />
    );
  }

  useEffect(() => {
    // 1. Bind interactive flatpickr to calendar input
    initFlatpickr();

    // 2. Initialize exact page charts
    const cleanup = initCrmCharts();

    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, []);

  return (
    <div className="w-full min-w-0 flex-1">
      <div className="p-3 lg:py-6 lg:px-0">

					
					<div className="flex flex-wrap items-center justify-between gap-3 mb-3 lg:mb-6">
						<h1 className="text-gray-900 text-xl max-lg:text-lg font-bold mb-0">CRM Dashboard</h1>
						<div className="flex items-center flex-wrap gap-2">
							<div className="flex items-center -space-x-2 me-1">
								<img src="/images/avatars/avatar-3.webp" className="size-7 rounded-full border-2 border-white" alt="user"  loading="lazy"/>
								<img src="/images/avatars/avatar-4.webp" className="size-7 rounded-full border-2 border-white" alt="user"  loading="lazy"/>
								<img src="/images/avatars/avatar-5.webp" className="size-7 rounded-full border-2 border-white" alt="user"  loading="lazy"/>
								<img src="/images/avatars/avatar-6.webp" className="size-7 rounded-full border-2 border-white" alt="user"  loading="lazy"/>
								<button type="button" className="size-7 rounded-full border-2 border-white bg-primary text-white text-xs flex items-center justify-center hover:bg-primary-hover cursor-pointer"><i className="ph ph-plus"></i></button>
							</div>
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

						<div className="bg-white border border-border-color rounded-md overflow-hidden">
							<div className="h-1 bg-gradient-to-r from-success via-warning to-danger"></div>
							<div className="p-4 bg-success/5">
								<div className="flex items-start justify-between mb-3">
									<div>
										<p className="text-xs text-default mb-1">Total Leads / Customers</p>
										<h2 className="text-2xl max-lg:text-xl font-bold text-gray-900 mb-0">{crmData?.totalCustomers ?? 0}</h2>
									</div>
									<div className="size-10 rounded-full bg-success flex items-center justify-center shrink-0">
										<i className="ph-duotone ph-user text-white text-lg"></i>
									</div>
								</div>
								<div className="flex items-center gap-2 text-xs">
									<span className="inline-flex items-center font-semibold text-success"><i className="ph ph-arrow-up text-[10px] me-0.5"></i>Live</span>
									<span className="text-default">database records</span>
								</div>
							</div>
						</div>

						<div className="bg-white border border-border-color rounded-md overflow-hidden">
							<div className="h-1 bg-gradient-to-r from-purple via-pink to-purple"></div>
							<div className="p-4 bg-purple/5">
								<div className="flex items-start justify-between mb-3">
									<div>
										<p className="text-xs text-default mb-1">Total Deals Closed</p>
										<h2 className="text-2xl max-lg:text-xl font-bold text-gray-900 mb-0">{crmData?.wonDeals ?? 0}</h2>
									</div>
									<div className="size-10 rounded-full bg-purple flex items-center justify-center shrink-0">
										<i className="ph-duotone ph-info text-white text-lg"></i>
									</div>
								</div>
								<div className="flex items-center gap-2 text-xs">
									<span className="inline-flex items-center font-semibold text-success"><i className="ph ph-arrow-up text-[10px] me-0.5"></i>Live</span>
									<span className="text-default">database records</span>
								</div>
							</div>
						</div>

						<div className="bg-white border border-border-color rounded-md overflow-hidden">
							<div className="h-1 bg-gradient-to-r from-warning via-orange to-warning"></div>
							<div className="p-4 bg-warning/5">
								<div className="flex items-start justify-between mb-3">
									<div>
										<p className="text-xs text-default mb-1">Total Opportunities</p>
										<h2 className="text-2xl max-lg:text-xl font-bold text-gray-900 mb-0">{crmData?.totalDeals ?? 0}</h2>
									</div>
									<div className="size-10 rounded-full bg-warning flex items-center justify-center shrink-0">
										<i className="ph-duotone ph-medal text-white text-lg"></i>
									</div>
								</div>
								<div className="flex items-center gap-2 text-xs">
									<span className="inline-flex items-center font-semibold text-success"><i className="ph ph-arrow-up text-[10px] me-0.5"></i>Live</span>
									<span className="text-default">database records</span>
								</div>
							</div>
						</div>

						<div className="bg-white border border-border-color rounded-md overflow-hidden">
							<div className="h-1 bg-gradient-to-r from-pink via-purple to-pink"></div>
							<div className="p-4 bg-pink/5">
								<div className="flex items-start justify-between mb-3">
									<div>
										<p className="text-xs text-default mb-1">Total Revenue</p>
										<h2 className="text-2xl max-lg:text-xl font-bold text-gray-900 mb-0">{formatSystemAmount(crmData?.totalRevenue ?? 0)}</h2>
									</div>
									<div className="size-10 rounded-full bg-pink flex items-center justify-center shrink-0">
										<i className="ph-duotone ph-credit-card text-white text-lg"></i>
									</div>
								</div>
								<div className="flex items-center gap-2 text-xs">
									<span className="inline-flex items-center font-semibold text-success"><i className="ph ph-arrow-up text-[10px] me-0.5"></i>Live</span>
									<span className="text-default">database records</span>
								</div>
							</div>
						</div>

					</div>

					<div className="grid grid-cols-1 xl:grid-cols-12 gap-3 mb-3">

						
						<div className="bg-white border border-border-color rounded-md p-4 pb-1.5 xl:col-span-4">
							<div className="flex items-center justify-between flex-wrap gap-2 mb-3">
								<h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Recent Leads</h3>
								<Link to="/leads-dashboard" className="btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-1 hover:bg-primary hover:text-white hover:border-primary">View All <i className="ph ph-caret-right text-[10px]"></i></Link>
							</div>
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<tbody>
										{crmData?.recentOrders && crmData.recentOrders.length > 0 ? (
											crmData.recentOrders.slice(0, 5).map((order: any) => (
												<tr key={order.id} className="border-b border-border-color last:border-0 hover:bg-light/20 transition-colors">
													<td className="py-2.5 pe-3">
														<div className="flex items-center gap-2 min-w-0">
															<div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
																{order.customerName?.charAt(0) || "C"}
															</div>
															<div className="min-w-0">
																<span className="block text-[11px] text-default font-medium leading-tight mb-1">
																	#{order.invoiceNo || order.id.slice(0, 6)}
																</span>
																<p className="text-xs font-semibold text-title truncate mb-0 leading-tight">
																	{order.customerName}
																</p>
															</div>
														</div>
													</td>
													<td className="py-2.5 px-3 vertical-middle">
														<div className="min-w-0">
															<p className="text-[11px] text-default mb-1 leading-tight">Amount</p>
															<p className="text-xs font-semibold text-title truncate mb-0 leading-tight">
																{formatSystemAmount(order.amount)}
															</p>
														</div>
													</td>
													<td className="py-2.5 ps-3 text-right vertical-middle">
														<span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded font-medium ${
															order.status === "PAID" ? "bg-success-transparent text-success" : "bg-warning-transparent text-warning"
														}`}>
															{order.status || "Pending"}
														</span>
													</td>
												</tr>
											))
										) : (
											<tr>
												<td colSpan={3} className="py-8 text-center text-xs text-muted-foreground">
													No recent leads or orders recorded in this workspace.
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</div>

						
						<div className="bg-white border border-border-color rounded-md p-4 xl:col-span-8">
							<div className="flex items-center justify-between flex-wrap gap-2 mb-3">
								<h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Leads Generated</h3>
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
							<div id="crm-leads-generated-chart"></div>
							<div className="flex items-center justify-center flex-wrap gap-4 text-[11px]">
								<div className="flex items-center gap-1">
									<span className="size-2 rounded-full bg-pink"></span>
									<span className="text-default">No of Leads Expected</span>
								</div>
								<div className="flex items-center gap-1">
									<span className="size-2 rounded-full bg-success"></span>
									<span className="text-default">No of Leads Generated</span>
								</div>
							</div>
						</div>

					</div>
					
					<div className="grid grid-cols-1 xl:grid-cols-12 gap-3 mb-3">

						
						<div className="bg-white border border-border-color rounded-md p-4 pb-1.5 xl:col-span-7">
							<div className="flex items-center justify-between flex-wrap gap-2 mb-3">
								<h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Recent Deals</h3>
								<Link to="/deals-dashboard" className="btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-1 hover:bg-primary hover:text-white hover:border-primary">View All <i className="ph ph-caret-right text-[10px]"></i></Link>
							</div>
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead>
										<tr className="text-xs text-default border-b border-border-color">
											<th className="text-left py-2 px-2 font-semibold text-gray-900">ID</th>
											<th className="text-left py-2 px-2 font-semibold text-gray-900">Deal Name</th>
											<th className="text-left py-2 px-2 font-semibold text-gray-900">Stage</th>
											<th className="text-left py-2 px-2 font-semibold text-gray-900">Amount</th>
											<th className="text-left py-2 px-2 font-semibold text-gray-900">Date</th>
										</tr>
									</thead>
									<tbody>
										{crmData?.recentDeals && crmData.recentDeals.length > 0 ? (
											crmData.recentDeals.slice(0, 5).map((deal: any) => (
												<tr key={deal.id} className="border-b border-border-color last:border-0 hover:bg-light/20 transition-colors">
													<td className="py-2.5 px-2 text-xs text-default">
														#{deal.invoiceNo || deal.id.slice(0, 6)}
													</td>
													<td className="py-2.5 px-2 text-xs font-semibold text-title">
														{deal.title}
													</td>
													<td className="py-2.5 px-2">
														<span className={`text-[11px] px-2 py-0.5 rounded ${
															deal.stage === "Closed Won" ? "bg-success-transparent text-success" : "bg-info-transparent text-info"
														}`}>
															{deal.stage}
														</span>
													</td>
													<td className="py-2.5 px-2 text-xs font-semibold text-gray-900">
														{formatSystemAmount(deal.amount)}
													</td>
													<td className="py-2.5 px-2 text-xs text-muted-foreground">
														{deal.date ? new Date(deal.date).toLocaleDateString() : "—"}
													</td>
												</tr>
											))
										) : (
											<tr>
												<td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
													No deal records available in this workspace.
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</div>

						
						<div className="bg-white border border-border-color rounded-md p-4 xl:col-span-5">
							<div className="flex items-center justify-between flex-wrap gap-2 mb-3">
								<h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Deals Pipeline</h3>
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
							
							{crmData?.pipelineStages && crmData.pipelineStages.length > 0 ? (
								<div className="space-y-3">
									{crmData.pipelineStages.map((st: any, idx: number) => (
										<div key={idx} className="flex items-center justify-between gap-2">
											<div className="flex items-center gap-2">
												<span className="size-2 rounded-full bg-primary"></span>
												<span className="text-xs text-default">{st.stage}</span>
											</div>
											<span className="text-xs font-semibold text-gray-900">{st.count} ({formatSystemAmount(st.value)})</span>
										</div>
									))}
								</div>
							) : (
								<div className="py-8 text-center text-xs text-muted-foreground">
									No pipeline stages active in this workspace.
								</div>
							)}
						</div>

					</div>
					
					<div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
						<div className="bg-white border border-border-color rounded-md p-4 xl:col-span-5">
							<div className="flex items-center justify-between flex-wrap gap-2 mb-3">
								<h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Contact By Sources</h3>
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
							<div className="flex items-center flex-col sm:flex-row gap-4">
								<div id="crm-contact-sources-chart" className="shrink-0"></div>
								<div className="flex-1 space-y-3">
									<div className="flex items-center justify-between gap-2">
									<div className="flex items-center gap-2">
										<span className="size-2 rounded-full bg-info"></span>
											<span className="text-xs text-default">Organic Search</span>
										</div>
										<span className="text-xs font-semibold text-gray-900">25%</span>
									</div>
									<div className="flex items-center justify-between gap-2">
									<div className="flex items-center gap-2">
										<span className="size-2 rounded-full bg-orange"></span>
											<span className="text-xs text-default">Campaigns</span>
										</div>
										<span className="text-xs font-semibold text-gray-900">15%</span>
									</div>
									<div className="flex items-center justify-between gap-2">
									<div className="flex items-center gap-2">
										<span className="size-2 rounded-full bg-success"></span>
											<span className="text-xs text-default">Referral</span>
										</div>
										<span className="text-xs font-semibold text-gray-900">15%</span>
									</div>
									<div className="flex items-center justify-between gap-2">
									<div className="flex items-center gap-2">
										<span className="size-2 rounded-full bg-pink"></span>
											<span className="text-xs text-default">Marketing</span>
										</div>
										<span className="text-xs font-semibold text-gray-900">10%</span>
									</div>
									<div className="flex items-center justify-between gap-2">
									<div className="flex items-center gap-2">
										<span className="size-2 rounded-full bg-purple"></span>
											<span className="text-xs text-default">Paid Social</span>
										</div>
										<span className="text-xs font-semibold text-gray-900">15%</span>
									</div>
									<div className="flex items-center justify-between gap-2">
									<div className="flex items-center gap-2">
										<span className="size-2 rounded-full bg-warning"></span>
											<span className="text-xs text-default">Events</span>
										</div>
										<span className="text-xs font-semibold text-gray-900">20%</span>
									</div>
								</div>
							</div>
						</div>

						
						<div className="bg-white border border-border-color rounded-md p-4 pb-1.5 xl:col-span-7">
							<div className="flex items-center justify-between flex-wrap gap-2 mb-3">
								<h3 className="text-lg max-lg:text-[17px] font-bold text-title mb-0">Recent Contacts</h3>
								<div className="flex items-center gap-2">
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
									<Link to="/contacts" className="btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-1 hover:bg-primary hover:text-white hover:border-primary">View All <i className="ph ph-caret-right text-[10px]"></i></Link>
								</div>
							</div>
							<div className="overflow-x-auto">
								<table className="w-full text-sm border-collapse">
									<thead>
										<tr className="text-xs text-default border-b border-border-color">
											<th className="text-left py-2 px-2 font-semibold text-gray-900">ID</th>
											<th className="text-left py-2 px-2 font-semibold text-gray-900">Contact</th>
											<th className="text-left py-2 px-2 font-semibold text-gray-900">Phone Number</th>
											<th className="text-left py-2 px-2 font-semibold text-gray-900">Status</th>
										</tr>
									</thead>
									<tbody>
										{crmData?.recentContacts && crmData.recentContacts.length > 0 ? (
											crmData.recentContacts.slice(0, 5).map((contact: any) => (
												<tr key={contact.id} className="border-b border-border-color last:border-0 hover:bg-light/20 transition-colors">
													<td className="py-2.5 px-2 text-xs text-default">
														#{contact.id.slice(0, 6).toUpperCase()}
													</td>
													<td className="py-2.5 px-2">
														<div className="flex items-center gap-2">
															<div className="size-7 rounded-full bg-info/10 text-info flex items-center justify-center font-bold text-xs shrink-0">
																{contact.name?.charAt(0) || "C"}
															</div>
															<p className="text-nowrap text-xs font-semibold text-title mb-0">{contact.name}</p>
														</div>
													</td>
													<td className="py-2.5 px-2 text-xs text-default">
														<span>{contact.phone || "—"}</span>
													</td>
													<td className="py-2.5 px-2">
														<span className="inline-flex items-center text-[11px] bg-success-transparent text-success px-2 py-0.5 rounded">
															<i className="ph ph-check-circle text-[10px] me-1"></i>Active
														</span>
													</td>
												</tr>
											))
										) : (
											<tr>
												<td colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
													No contacts recorded in this workspace.
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>

						</div>

					</div>

				</div>

      <footer className="footer px-6 pb-3 mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground border-t border-border-color pt-4">
        <p>{new Date().getFullYear()} &copy; Developed and maintained by Webfamily Tech Solutions</p>
      </footer>
    </div>
  );
}
