import { usePermissions } from "@/lib/permissions";
import { AccessDenied } from "@/components/access-denied";
import { Loader2 } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { initFlatpickr } from "@/lib/init-dashboard";
import { initSalesCharts } from "@/lib/dashboard-charts";

export const Route = createFileRoute("/_authenticated/_app/analytics")({
  component: AnalyticsPage,
});

export default function AnalyticsPage() {
  const { canAccessModule, loading } = usePermissions();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <p className="text-xs text-muted-foreground font-medium animate-pulse">Verifying workspace permissions...</p>
      </div>
    );
  }

  if (!canAccessModule("analytics")) {
    return (
      <AccessDenied
        moduleName="Analytics Overview"
        requiredPermission="analytics.dashboard.view"
        message="You do not have permission to access the Analytics Overview."
      />
    );
  }

  useEffect(() => {
    // 1. Bind interactive flatpickr to calendar input
    initFlatpickr();

    // 2. Initialize exact page charts
    const cleanup = initSalesCharts();

    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, []);

  return (
    <div className="w-full min-w-0 flex-1">
      <div className="p-3 lg:py-6 lg:px-0">

    
					<div className="flex flex-wrap items-center justify-between gap-3 mb-3 lg:mb-6">
						<h1 className="text-gray-900 text-xl font-bold mb-0">Sales Dashboard</h1>
						<div className="flex items-center gap-2 flex-wrap">
							<div className="flex items-center -space-x-2 me-1">
								<img src="/images/avatars/avatar-3.png" className="size-7 rounded-full border-2 border-white" alt="user" />
								<img src="/images/avatars/avatar-4.png" className="size-7 rounded-full border-2 border-white" alt="user" />
								<img src="/images/avatars/avatar-5.png" className="size-7 rounded-full border-2 border-white" alt="user" />
								<img src="/images/avatars/avatar-6.png" className="size-7 rounded-full border-2 border-white" alt="user" />
								<button type="button" className="size-7 rounded-full border-2 border-white bg-primary text-white text-xs flex items-center justify-center hover:bg-primary-hover cursor-pointer"><i className="ph ph-plus"></i></button>
							</div>
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

					
					<div className="grid grid-cols-1 xl:grid-cols-12 gap-3 mb-3">

						<div className="bg-white border border-border-color rounded-md p-4 xl:col-span-8">
							<div className="flex items-center justify-between mb-3 flex-wrap gap-3">
								<h2 className="text-lg max-lg:text-[17px] text-title mb-0">Revenue Trends</h2>
								<div className="flex items-center gap-1 bg-light rounded-md p-1 text-[11px]">
									<button type="button" className="px-2 py-0.5 rounded text-default hover:bg-white cursor-pointer">1D</button>
									<button type="button" className="px-2 py-0.5 rounded text-default hover:bg-white cursor-pointer">7D</button>
									<button type="button" className="px-2 py-0.5 rounded text-default hover:bg-white cursor-pointer">1M</button>
									<button type="button" className="px-2 py-0.5 rounded bg-white shadow-sm text-gray-900 font-medium cursor-pointer">1Y</button>
								</div>
							</div>
							<div id="sales-revenue-trends-chart"></div>
						</div>

						<div className="bg-white border border-border-color rounded-md p-4 xl:col-span-4 relative overflow-hidden">
							<div className="flex items-center justify-between mb-3">
								<h3 className="text-lg max-lg:text-[17px] text-title mb-0">Sales by Region</h3>
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
							
							<div id="chart-container" className="h-64"></div>

							
							<div className="bg-gradient-to-br from-primary to-success text-white rounded-md p-3 mt-3">
								<div className="flex items-center gap-2 mb-2"><h4 className="text-xl font-bold mb-0 text-white">$2.4M</h4><span className="text-[11px] text-white">vs last month</span></div>
								<div className="h-1 bg-white/20 rounded-full mb-1 overflow-hidden"><div className="h-full bg-white rounded-full" style={{ width: "60%" }}></div></div>
								<div className="flex items-center justify-between text-[10px] text-white"><span>0</span><span>2M</span><span>4M</span></div>
							</div>
						</div>

					</div>

					
					<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-3">
						<div className="bg-white border border-border-color rounded-md p-4">
							<div className="flex items-center justify-between"><div><p className="text-xs text-default mb-1">Revenue</p><h3 className="text-2xl font-bold text-gray-900 mb-0">12.8K</h3></div><div className="size-10 rounded-md bg-success flex items-center justify-center shrink-0"><i className="ph-duotone ph-currency-circle-dollar text-white text-lg"></i></div></div>
						</div>
						<div className="bg-white border border-border-color rounded-md p-4">
							<div className="flex items-center justify-between"><div><p className="text-xs text-default mb-1">Open Invoices</p><h3 className="text-2xl font-bold text-gray-900 mb-0">28</h3></div><div className="size-10 rounded-md bg-orange flex items-center justify-center shrink-0"><i className="ph-duotone ph-file-text text-white text-lg"></i></div></div>
						</div>
						<div className="bg-white border border-border-color rounded-md p-4">
							<div className="flex items-center justify-between"><div><p className="text-xs text-default mb-1">Open Orders</p><h3 className="text-2xl font-bold text-gray-900 mb-0">156</h3></div><div className="size-10 rounded-md bg-primary flex items-center justify-center shrink-0"><i className="ph-duotone ph-shopping-cart text-white text-lg"></i></div></div>
						</div>
						<div className="bg-white border border-border-color rounded-md p-4">
							<div className="flex items-center justify-between"><div><p className="text-xs text-default mb-1">New Customers</p><h3 className="text-2xl font-bold text-gray-900 mb-0">378</h3></div><div className="size-10 rounded-md bg-purple flex items-center justify-center shrink-0"><i className="ph-duotone ph-user-plus text-white text-lg"></i></div></div>
						</div>
					</div>

					
					<div className="grid grid-cols-1 xl:grid-cols-3 gap-3 mb-3">

						<div className="bg-white border border-border-color rounded-md p-4">
							<div className="flex items-center justify-between mb-4"><h2 className="text-lg max-lg:text-[17px] max-xxl:text-[16px] text-title mb-0">Top Customers</h2><a href="customers.html" className="btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-1 hover:bg-primary hover:text-white hover:border-primary">View All <i className="icon-chevron-right"></i></a></div>
							<div className="space-y-3">
								<div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 min-w-0"><img src="/images/avatars/avatar-3.png" className="size-9 rounded-full border border-border-color shrink-0" alt="user" /><div className="min-w-0"><p className="text-xs font-semibold text-title truncate mb-0">Robert Cosper</p><p className="text-[11px] text-default mb-0"><a href="#">#CUS0020</a></p></div></div><div className="text-end"><p className="text-xs font-semibold text-title mb-0">$4,500</p><p className="text-[11px] text-default mb-0">Spent</p></div></div>
								<div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 min-w-0"><img src="/images/avatars/avatar-4.png" className="size-9 rounded-full border border-border-color shrink-0" alt="user" /><div className="min-w-0"><p className="text-xs font-semibold text-title truncate mb-0">Helen Nelson</p><p className="text-[11px] text-default mb-0"><a href="#">#CUS0019</a></p></div></div><div className="text-end"><p className="text-xs font-semibold text-title mb-0">$5,200</p><p className="text-[11px] text-default mb-0">Spent</p></div></div>
								<div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 min-w-0"><img src="/images/avatars/avatar-5.png" className="size-9 rounded-full border border-border-color shrink-0" alt="user" /><div className="min-w-0"><p className="text-xs font-semibold text-title truncate mb-0">Thomas Neal</p><p className="text-[11px] text-default mb-0"><a href="#">#CUS0018</a></p></div></div><div className="text-end"><p className="text-xs font-semibold text-title mb-0">$2,800</p><p className="text-[11px] text-default mb-0">Spent</p></div></div>
								<div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 min-w-0"><img src="/images/avatars/avatar-6.png" className="size-9 rounded-full border border-border-color shrink-0" alt="user" /><div className="min-w-0"><p className="text-xs font-semibold text-title truncate mb-0">Sarah Spivey</p><p className="text-[11px] text-default mb-0"><a href="#">#CUS0017</a></p></div></div><div className="text-end"><p className="text-xs font-semibold text-title mb-0">$1,750</p><p className="text-[11px] text-default mb-0">Spent</p></div></div>
								<div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 min-w-0"><img src="/images/avatars/avatar-7.png" className="size-9 rounded-full border border-border-color shrink-0" alt="user" /><div className="min-w-0"><p className="text-xs font-semibold text-title truncate mb-0">Jared Griffin</p><p className="text-[11px] text-default mb-0"><a href="#">#CUS0016</a></p></div></div><div className="text-end"><p className="text-xs font-semibold text-title mb-0">$3,000</p><p className="text-[11px] text-default mb-0">Spent</p></div></div>
							</div>
						</div>

						<div className="bg-white border border-border-color rounded-md p-4">
							<div className="flex items-center justify-between mb-4"><h2 className="text-lg max-lg:text-[17px] max-xxl:text-[16px] text-title mb-0">Top Selling Products</h2><a href="products.html" className="btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-1 hover:bg-primary hover:text-white hover:border-primary">View All <i className="icon-chevron-right"></i></a></div>
							<div className="space-y-3">
								<div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 min-w-0"><div className="size-9 rounded-md bg-light flex items-center justify-center shrink-0"><i className="ph-fill ph-apple-logo text-gray-900"></i></div><div className="min-w-0"><p className="text-xs font-semibold text-title truncate mb-0">Apple iPhone 15</p><div className="flex items-center gap-2"><p className="text-[11px] text-default mb-0">$250</p><span className="text-[10px] bg-success-transparent text-success px-1.5 py-0.5 rounded">In Stock</span></div></div></div><div className="text-end"><p className="text-xs font-semibold text-title mb-0">1,250</p><p className="text-[11px] text-default mb-0">Sales</p></div></div>
								<div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 min-w-0"><div className="size-9 rounded-md bg-light flex items-center justify-center shrink-0"><i className="ph-duotone ph-laptop text-gray-900"></i></div><div className="min-w-0"><p className="text-xs font-semibold text-title truncate mb-0">Dell XPS 13 9310</p><div className="flex items-center gap-2"><p className="text-[11px] text-default mb-0">$185</p><span className="text-[10px] bg-success-transparent text-success px-1.5 py-0.5 rounded">In Stock</span></div></div></div><div className="text-end"><p className="text-xs font-semibold text-title mb-0">2,250</p><p className="text-[11px] text-default mb-0">Sales</p></div></div>
								<div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 min-w-0"><div className="size-9 rounded-md bg-light flex items-center justify-center shrink-0"><i className="ph-duotone ph-headphones text-gray-900"></i></div><div className="min-w-0"><p className="text-xs font-semibold text-title truncate mb-0">Bose QuietComfort 45</p><div className="flex items-center gap-2"><p className="text-[11px] text-default mb-0">$120</p><span className="text-[10px] bg-success-transparent text-success px-1.5 py-0.5 rounded">In Stock</span></div></div></div><div className="text-end"><p className="text-xs font-semibold text-title mb-0">1,600</p><p className="text-[11px] text-default mb-0">Sales</p></div></div>
								<div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 min-w-0"><div className="size-9 rounded-md bg-light flex items-center justify-center shrink-0"><i className="ph-duotone ph-sneaker text-gray-900"></i></div><div className="min-w-0"><p className="text-xs font-semibold text-title truncate mb-0">Adidas Running Shoe</p><div className="flex items-center gap-2"><p className="text-[11px] text-default mb-0">$140</p><span className="text-[10px] bg-danger-transparent text-danger px-1.5 py-0.5 rounded">Out of Stock</span></div></div></div><div className="text-end"><p className="text-xs font-semibold text-title mb-0">1,850</p><p className="text-[11px] text-default mb-0">Sales</p></div></div>
								<div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 min-w-0"><div className="size-9 rounded-md bg-light flex items-center justify-center shrink-0"><i className="ph-duotone ph-fan text-gray-900"></i></div><div className="min-w-0"><p className="text-xs font-semibold text-title truncate mb-0">Dyson Vacuum Cleaner</p><div className="flex items-center gap-2"><p className="text-[11px] text-default mb-0">$220</p><span className="text-[10px] bg-success-transparent text-success px-1.5 py-0.5 rounded">In Stock</span></div></div></div><div className="text-end"><p className="text-xs font-semibold text-title mb-0">2,200</p><p className="text-[11px] text-default mb-0">Sales</p></div></div>
							</div>
						</div>

						<div className="bg-white border border-border-color rounded-md p-4">
							<div className="flex items-center justify-between mb-4"><h2 className="text-lg max-lg:text-[17px] max-xxl:text-[16px] text-title mb-0">Recent Transactions</h2><a href="transactions.html" className="btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-1 hover:bg-primary hover:text-white hover:border-primary">View All <i className="icon-chevron-right"></i></a></div>
							<div className="space-y-3">
								<div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 min-w-0"><img src="/images/avatars/avatar-3.png" className="size-9 rounded-full border border-border-color shrink-0" alt="user" /><div className="min-w-0"><p className="text-xs font-semibold text-title truncate mb-0">Alexander Kenn</p><div className="flex items-center gap-2"><p className="text-[11px] text-default mb-0"><a href="#">#PAY0020</a></p><span className="text-[10px] bg-success-transparent text-success px-1.5 py-0.5 rounded">Paid</span></div></div></div><div className="text-end"><p className="text-xs font-semibold text-title mb-0">$500</p><p className="text-[11px] text-default mb-0">05 Sep 2025</p></div></div>
								<div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 min-w-0"><img src="/images/avatars/avatar-4.png" className="size-9 rounded-full border border-border-color shrink-0" alt="user" /><div className="min-w-0"><p className="text-xs font-semibold text-title truncate mb-0">Gabriella White</p><div className="flex items-center gap-2"><p className="text-[11px] text-default mb-0"><a href="#">#PAY0019</a></p><span className="text-[10px] bg-warning-transparent text-warning px-1.5 py-0.5 rounded">Pending</span></div></div></div><div className="text-end"><p className="text-xs font-semibold text-title mb-0">$250</p><p className="text-[11px] text-default mb-0">11 Sep 2025</p></div></div>
								<div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 min-w-0"><img src="/images/avatars/avatar-5.png" className="size-9 rounded-full border border-border-color shrink-0" alt="user" /><div className="min-w-0"><p className="text-xs font-semibold text-title truncate mb-0">Christopher Rey</p><div className="flex items-center gap-2"><p className="text-[11px] text-default mb-0"><a href="#">#PAY0018</a></p><span className="text-[10px] bg-danger-transparent text-danger px-1.5 py-0.5 rounded">Failed</span></div></div></div><div className="text-end"><p className="text-xs font-semibold text-title mb-0">$300</p><p className="text-[11px] text-default mb-0">27 Aug 2025</p></div></div>
								<div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 min-w-0"><img src="/images/avatars/avatar-6.png" className="size-9 rounded-full border border-border-color shrink-0" alt="user" /><div className="min-w-0"><p className="text-xs font-semibold text-title truncate mb-0">Penelope Ton</p><div className="flex items-center gap-2"><p className="text-[11px] text-default mb-0"><a href="#">#PAY0017</a></p><span className="text-[10px] bg-success-transparent text-success px-1.5 py-0.5 rounded">Paid</span></div></div></div><div className="text-end"><p className="text-xs font-semibold text-title mb-0">$850</p><p className="text-[11px] text-default mb-0">15 Aug 2025</p></div></div>
								<div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 min-w-0"><img src="/images/avatars/avatar-7.png" className="size-9 rounded-full border border-border-color shrink-0" alt="user" /><div className="min-w-0"><p className="text-xs font-semibold text-title truncate mb-0">Catherine Lan</p><div className="flex items-center gap-2"><p className="text-[11px] text-default mb-0"><a href="#">#PAY0016</a></p><span className="text-[10px] bg-warning-transparent text-warning px-1.5 py-0.5 rounded">Pending</span></div></div></div><div className="text-end"><p className="text-xs font-semibold text-title mb-0">$600</p><p className="text-[11px] text-default mb-0">02 Aug 2025</p></div></div>
							</div>
						</div>
					</div>

					
					<div className="bg-white border border-border-color rounded-md p-4">
						<div className="flex items-center justify-between mb-3">
							<h2 className="text-lg max-lg:text-[17px] text-title mb-0">Recent Sales Activity</h2>
							<a href="sales-orders.html" className="btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-1 hover:bg-primary hover:text-white hover:border-primary">View All <i className="icon-chevron-right"></i></a>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead><tr className="text-xs text-default border-b border-border-color"><th className="text-left py-2 px-2 font-semibold text-gray-900">ID</th><th className="text-left py-2 px-2 font-semibold text-gray-900">Type</th><th className="text-left py-2 px-2 font-semibold text-gray-900">Customer</th><th className="text-left py-2 px-2 font-semibold text-gray-900">Amount</th><th className="text-left py-2 px-2 font-semibold text-gray-900">Date</th><th className="text-left py-2 px-2 font-semibold text-gray-900">Status</th></tr></thead>
								<tbody>
									<tr className="border-b border-border-color last:border-0"><td className="py-2.5 px-2 text-xs text-default"><a href="#">#INV0020</a></td><td className="py-2.5 px-2 text-xs text-default">Invoice</td><td className="py-2.5 px-2"><div className="flex items-center gap-2"><img src="/images/avatars/avatar-3.png" className="size-7 rounded-full border border-border-color shrink-0" alt="user" /><span className="text-xs font-semibold text-title">Alexander Kenn</span></div></td><td className="py-2.5 px-2 text-xs text-gray-900">$500</td><td className="py-2.5 px-2 text-xs text-default">11 Sep 2025</td><td className="py-2.5 px-2"><span className="text-[11px] bg-success-transparent text-success px-2 py-0.5 rounded">Paid</span></td></tr>
									<tr className="border-b border-border-color last:border-0"><td className="py-2.5 px-2 text-xs text-default"><a href="#">#SAO0019</a></td><td className="py-2.5 px-2 text-xs text-default">Sales Order</td><td className="py-2.5 px-2"><div className="flex items-center gap-2"><img src="/images/avatars/avatar-4.png" className="size-7 rounded-full border border-border-color shrink-0" alt="user" /><span className="text-xs font-semibold text-title">Gabriella White</span></div></td><td className="py-2.5 px-2 text-xs text-gray-900">$650</td><td className="py-2.5 px-2 text-xs text-default">05 Sep 2025</td><td className="py-2.5 px-2"><span className="text-[11px] bg-warning-transparent text-warning px-2 py-0.5 rounded">Pending</span></td></tr>
									<tr className="border-b border-border-color last:border-0"><td className="py-2.5 px-2 text-xs text-default"><a href="#">#CRN0018</a></td><td className="py-2.5 px-2 text-xs text-default">Credit Note</td><td className="py-2.5 px-2"><div className="flex items-center gap-2"><img src="/images/avatars/avatar-5.png" className="size-7 rounded-full border border-border-color shrink-0" alt="user" /><span className="text-xs font-semibold text-title">Christopher Rey</span></div></td><td className="py-2.5 px-2 text-xs text-gray-900">$120</td><td className="py-2.5 px-2 text-xs text-default">27 Aug 2025</td><td className="py-2.5 px-2"><span className="text-[11px] bg-danger-transparent text-danger px-2 py-0.5 rounded">Issued</span></td></tr>
									<tr className="border-b border-border-color last:border-0"><td className="py-2.5 px-2 text-xs text-default"><a href="#">#SAQ0017</a></td><td className="py-2.5 px-2 text-xs text-default">Sales Quote</td><td className="py-2.5 px-2"><div className="flex items-center gap-2"><img src="/images/avatars/avatar-6.png" className="size-7 rounded-full border border-border-color shrink-0" alt="user" /><span className="text-xs font-semibold text-title">Penelope Ton</span></div></td><td className="py-2.5 px-2 text-xs text-gray-900">$860</td><td className="py-2.5 px-2 text-xs text-default">16 Aug 2025</td><td className="py-2.5 px-2"><span className="text-[11px] bg-info-transparent text-info px-2 py-0.5 rounded">Sent</span></td></tr>
									<tr className="border-b border-border-color last:border-0"><td className="py-2.5 px-2 text-xs text-default"><a href="#">#INV0011</a></td><td className="py-2.5 px-2 text-xs text-default">Invoice</td><td className="py-2.5 px-2"><div className="flex items-center gap-2"><img src="/images/avatars/avatar-7.png" className="size-7 rounded-full border border-border-color shrink-0" alt="user" /><span className="text-xs font-semibold text-title">Catherine Lan</span></div></td><td className="py-2.5 px-2 text-xs text-gray-900">$650</td><td className="py-2.5 px-2 text-xs text-default">18 May 2025</td><td className="py-2.5 px-2"><span className="text-[11px] bg-success-transparent text-success px-2 py-0.5 rounded">Paid</span></td></tr>
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
