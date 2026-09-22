import { usePermissions } from "@/lib/permissions";
import { AccessDenied } from "@/components/access-denied";
import { Loader2 } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { initFlatpickr } from "@/lib/init-dashboard";
import { initPosCharts } from "@/lib/dashboard-charts";

export const Route = createFileRoute("/_authenticated/_app/pos-dashboard")({
  component: PosDashboardPage,
});

export default function PosDashboardPage() {
  const { canAccessModule, loading } = usePermissions();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <p className="text-xs text-muted-foreground font-medium animate-pulse">Verifying workspace permissions...</p>
      </div>
    );
  }

  if (!canAccessModule("pos")) {
    return (
      <AccessDenied
        moduleName="POS Dashboard"
        requiredPermission="pos.dashboard.view"
        message="You do not have permission to access the POS Dashboard."
      />
    );
  }

  // Realtime POS Dashboard metrics with ultra-resilient fallback
  const { data: posMetrics, isLoading } = useQuery({
    queryKey: ["pos-dashboard-metrics"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/dashboard/pos");
        const topList = res?.topProducts || res?.data?.topProducts;
        if (Array.isArray(topList) && topList.length > 0) {
          return res?.data ? res.data : res;
        }
      } catch (err) {
        console.warn("[POS Dashboard] /dashboard/pos error, falling back to /products:", err);
      }

      // Fallback directly to catalog products if POS metrics endpoint is empty or in transition
      try {
        const prodRes: any = await api.get("/products");
        const list = Array.isArray(prodRes) ? prodRes : (Array.isArray(prodRes?.data) ? prodRes.data : prodRes?.products || []);
        return {
          topProducts: list.slice(0, 12).map((p: any) => {
            const name = p.name || "Product";
            const lower = name.toLowerCase();
            let icon = "ph-package";
            if (lower.includes("server") || lower.includes("hardware") || lower.includes("appliance")) icon = "ph-hard-drives";
            else if (lower.includes("printer") || lower.includes("thermal")) icon = "ph-printer";
            else if (lower.includes("scanner") || lower.includes("barcode")) icon = "ph-barcode";
            else if (lower.includes("terminal") || lower.includes("biometric")) icon = "ph-fingerprint";
            else if (lower.includes("service") || lower.includes("setup")) icon = "ph-briefcase";

            const totalStock = p.quantity ?? p.stock ?? (p.warehouseStocks?.reduce((s: number, w: any) => s + (w.quantity || 0), 0) || 0);

            return {
              id: p.id,
              productId: p.id,
              name: p.name,
              sku: p.sku ? (p.sku.startsWith("#") ? p.sku : `#${p.sku}`) : `#PRD-${p.id?.slice(0, 6).toUpperCase()}`,
              quantitySold: p.salesCount || 0,
              amount: Number(p.salePrice || p.price || 0),
              price: Number(p.salePrice || p.price || 0),
              category: typeof p.category === "string" ? p.category : (p.category?.name || "General"),
              stock: totalStock,
              image: p.image && p.image !== "/images/no-image.png" ? p.image : null,
              icon,
            };
          }),
        };
      } catch (e) {
        return { topProducts: [] };
      }
    },
    refetchInterval: 15000,
  });

  const topProducts = posMetrics?.topProducts || [];

  useEffect(() => {
    // 1. Bind interactive flatpickr to calendar input
    initFlatpickr();

    // 2. Initialize exact page charts
    const cleanup = initPosCharts();

    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, []);

  return (
    <div className="w-full min-w-0 flex-1">
      <div className="p-3 lg:py-6 lg:px-0">
                    
					
					<div className="flex flex-wrap items-center justify-between gap-3 mb-3 lg:mb-6">
						<h1 className="text-gray-900 text-xl font-bold mb-0">POS Dashboard</h1>
						<div className="flex items-center gap-2">
							<div className="relative rangepicker-input w-[174px] h-[28px] leading-none">
								<span className="absolute inset-y-0 left-0 flex items-center px-3 text-muted-foreground text-dark text-xs!">
									<i className="icon-calendar"></i>
								</span>
								<input type="text" className="form-input text-xs! h-[28px] inline-block w-full bg-light border-border-color rounded-lg focus:ring-0 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:border-border-color pl-8! ps-8!" data-provider="flatpickr" data-date-format="d M y" data-range-date="true" placeholder="Select date range" id="picker" />
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

						<div className="bg-white dark:bg-card border border-border-color rounded-md p-4 xl:col-span-5 shadow-xs flex flex-col">
							<div className="flex items-center justify-between mb-4">
								<div className="flex items-center gap-2">
									<h2 className="text-lg max-lg:text-[17px] text-title mb-0">Top Products</h2>
									<span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
										Available In Stock
									</span>
								</div>
								<Link to="/products" className="btn-sm bg-white dark:bg-card border border-border-color text-gray-900 dark:text-gray-100 inline-flex items-center gap-1 hover:bg-primary hover:text-white hover:border-primary transition-colors">
									View All <i className="icon-chevron-right"></i>
								</Link>
							</div>

							<div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
								{isLoading ? (
									Array.from({ length: 5 }).map((_, idx) => (
										<div key={idx} className="flex items-center justify-between gap-3 sm:grid grid-cols-1 sm:grid-cols-12 animate-pulse py-1">
											<div className="flex items-center gap-2.5 min-w-0 sm:col-span-6">
												<div className="size-9 rounded-md bg-gray-200 dark:bg-gray-700 shrink-0"></div>
												<div className="min-w-0 space-y-1.5 flex-1">
													<div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
													<div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
												</div>
											</div>
											<div className="min-w-0 hidden sm:block sm:col-span-3 space-y-1.5">
												<div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-14"></div>
												<div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-10"></div>
											</div>
											<div className="min-w-0 text-end sm:col-span-3 space-y-1.5 flex flex-col items-end">
												<div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
												<div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
											</div>
										</div>
									))
								) : topProducts.length > 0 ? (
									topProducts.map((prod: any) => (
										<div key={prod.id || prod.productId} className="flex items-center justify-between gap-3 sm:grid grid-cols-1 sm:grid-cols-12 group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 p-1.5 -mx-1.5 rounded-lg transition-colors">
											<div className="flex items-center gap-2.5 min-w-0 sm:col-span-6">
												<div className="size-9 rounded-md bg-light dark:bg-slate-800 flex items-center justify-center shrink-0 border border-border-color/60 overflow-hidden">
													{prod.image ? (
														<img src={prod.image} alt={prod.name} className="size-full object-cover" />
													) : (
														<i className={`ph-duotone ${prod.icon || 'ph-package'} text-gray-900 dark:text-gray-100 text-lg`}></i>
													)}
												</div>
												<div className="min-w-0">
													<p className="text-[11px] text-default mb-0 font-mono">
														<Link to="/products" className="hover:text-primary transition-colors">
															{prod.sku}
														</Link>
													</p>
													<p className="text-xs font-semibold text-title truncate mb-0 group-hover:text-primary transition-colors" title={prod.name}>
														{prod.name}
													</p>
												</div>
											</div>
											<div className="min-w-0 hidden sm:block sm:col-span-3">
												<p className="text-[11px] text-default mb-0">Availability</p>
												<p className="text-xs font-semibold text-title mb-0">
													{prod.quantitySold > 0 ? (
														<span>{prod.quantitySold} sold</span>
													) : (
														<span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
															<span className="size-1.5 rounded-full bg-emerald-500 inline-block"></span>
															{prod.stock > 0 ? `${prod.stock} in stock` : 'In catalog'}
														</span>
													)}
												</p>
											</div>
											<div className="min-w-0 text-end sm:col-span-3">
												<p className="text-[11px] text-default mb-0">Price</p>
												<p className="text-xs font-semibold text-title mb-0 text-emerald-600 dark:text-emerald-400">
													₹{Number(prod.amount || prod.price || 0).toLocaleString('en-IN')}
												</p>
											</div>
										</div>
									))
								) : (
									<div className="py-8 text-center text-muted-foreground">
										<i className="ph-duotone ph-package text-3xl mb-1 text-gray-400"></i>
										<p className="text-xs">No products found in catalogue</p>
									</div>
								)}
							</div>
						</div>

						<div className="bg-white border border-border-color rounded-md p-4 xl:col-span-7">
							<div className="flex items-center justify-between mb-3">
								<h2 className="text-lg max-lg:text-[17px] text-title mb-0">Product Sales</h2>
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
							<div className="flex items-center justify-between mb-2 flex-wrap gap-3">
								<div>
									<p className="text-xs text-default mb-1">Total Sales</p>
									<div className="flex items-center gap-2">
										<h3 className="text-2xl font-bold text-gray-900 mb-0">₹{Number(posMetrics?.todaySales || 0).toLocaleString("en-IN")}</h3>
										<span className="size-5 rounded-full bg-success-transparent text-success inline-flex items-center justify-center text-[10px]"><i className="ph ph-arrow-up-right"></i></span>
									</div>
								</div>
								<span className="text-[11px] bg-light text-default border border-border-color px-2 py-1 rounded">Updated : 15 Jan 2025</span>
							</div>
							<div id="pos-product-sales-chart"></div>
						</div>

					</div>

					
					<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-3">

						<div className="bg-white border border-border-color rounded-md p-4 overflow-hidden">
							<div className="flex items-center gap-3 mb-2">
								<div className="size-10 rounded-full bg-primary flex items-center justify-center shrink-0">
									<i className="ph-duotone ph-shopping-bag text-white text-lg"></i>
								</div>
								<div className="min-w-0">
									<p className="text-xs text-default mb-1">Total Sales</p>
									<h3 className="text-xl font-bold text-gray-900 mb-0">₹{Number(posMetrics?.todaySales || 0).toLocaleString("en-IN")}</h3>
								</div>
							</div>
							<div className="flex items-center gap-2 text-[11px] mb-1"><span className="text-success font-medium inline-flex items-center"><i className="ph ph-arrow-up text-[10px] me-0.5"></i>+12.4%</span>
								<span className="text-default">Last 30 days</span>
							</div>
							<div id="pos-spark-1" className="-mx-4 -mb-4"></div>
						</div>

						<div className="bg-white border border-border-color rounded-md p-4 overflow-hidden">
							<div className="flex items-center gap-3 mb-2">
								<div className="size-10 rounded-full bg-purple flex items-center justify-center shrink-0">
									<i className="ph-duotone ph-arrows-clockwise text-white text-lg"></i>
								</div>
								<div className="min-w-0">
									<p className="text-xs text-default mb-1">Repeat Customers</p>
									<h3 className="text-xl font-bold text-gray-900 mb-0">42%</h3>
								</div>
							</div>
							<div className="flex items-center gap-2 text-[11px] mb-1"><span className="text-success font-medium inline-flex items-center"><i className="ph ph-arrow-up text-[10px] me-0.5"></i>+4.33%</span>
								<span className="text-default">Last 30 days</span>
							</div>
							<div id="pos-spark-2" className="-mx-4 -mb-4"></div>
						</div>

						<div className="bg-white border border-border-color rounded-md p-4 overflow-hidden">
							<div className="flex items-center gap-3 mb-2">
								<div className="size-10 rounded-full bg-info flex items-center justify-center shrink-0">
									<i className="ph-duotone ph-list-bullets text-white text-lg"></i>
								</div>
								<div className="min-w-0">
									<p className="text-xs text-default mb-1">Total Transactions</p>
									<h3 className="text-xl font-bold text-gray-900 mb-0">1,645</h3>
								</div>
							</div>
							<div className="flex items-center gap-2 text-[11px] mb-1"><span className="text-success font-medium inline-flex items-center"><i className="ph ph-arrow-up text-[10px] me-0.5"></i>+5.87%</span>
								<span className="text-default">Last 30 days</span>
							</div>
							<div id="pos-spark-3" className="-mx-4 -mb-4"></div>
						</div>

						<div className="bg-white border border-border-color rounded-md p-4 overflow-hidden">
							<div className="flex items-center gap-3 mb-2">
								<div className="size-10 rounded-full bg-pink flex items-center justify-center shrink-0">
									<i className="ph-duotone ph-currency-circle-dollar text-white text-lg"></i>
								</div>
								<div className="min-w-0">
									<p className="text-xs text-default mb-1">Gross Profit</p>
									<h3 className="text-xl font-bold text-gray-900 mb-0">₹{Number(posMetrics?.avgTicketSize || 0).toLocaleString("en-IN")}</h3>
								</div>
							</div>
							<div className="flex items-center gap-2 text-[11px] mb-1"><span className="text-success font-medium inline-flex items-center"><i className="ph ph-arrow-up text-[10px] me-0.5"></i>+2.68%</span>
								<span className="text-default">Last 30 days</span>
							</div>
							<div id="pos-spark-4" className="-mx-4 -mb-4"></div>
						</div>

					</div>

					
					<div className="grid grid-cols-1 xl:grid-cols-12 gap-3 mb-3">
						<div className="bg-white border border-border-color rounded-md p-4 xl:col-span-7">
							<div className="flex items-center justify-between mb-3">
								<h2 className="text-lg max-lg:text-[17px] text-title mb-0">Sales Vs Returns</h2>
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
							<div id="pos-sales-returns-chart"></div>
							<div className="flex items-center justify-center gap-4 mt-2 text-[11px]">
								<div className="flex items-center gap-1"><span className="size-2 rounded-full bg-success"></span><span className="text-default">Sales</span></div>
								<div className="flex items-center gap-1"><span className="size-2 rounded-full bg-orange"></span><span className="text-default">Returns</span></div>
							</div>
						</div>

						<div className="bg-white border border-border-color rounded-md p-4 xl:col-span-5">
							<div className="flex items-center justify-between mb-3 flex-wrap gap-2">
								<h2 className="text-lg max-lg:text-[17px] text-title mb-0">High Selling Categories</h2>
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
							<div id="pos-categories-radar"></div>
						</div>
					</div>

					
					<div className="bg-white border border-border-color rounded-md p-4">
						<div className="flex items-center justify-between mb-3">
							<h2 className="text-lg max-lg:text-[17px] text-title mb-0">Recent Orders</h2>
							<a href="sales-orders.html" className="btn-sm bg-white border border-border-color text-gray-900 inline-flex items-center gap-1 hover:bg-primary hover:text-white hover:border-primary">View Orders <i className="icon-chevron-right"></i></a>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="text-xs text-default border-b border-border-color">
										<th className="text-left py-2 px-2 font-semibold text-gray-900">ID</th>
										<th className="text-left py-2 px-2 font-semibold text-gray-900">Customer</th>
										<th className="text-left py-2 px-2 font-semibold text-gray-900">Email</th>
										<th className="text-left py-2 px-2 font-semibold text-gray-900">Date</th>
										<th className="text-left py-2 px-2 font-semibold text-gray-900">Items</th>
										<th className="text-left py-2 px-2 font-semibold text-gray-900">Total</th>
										<th className="text-left py-2 px-2 font-semibold text-gray-900">Payment Method</th>
										<th className="text-left py-2 px-2 font-semibold text-gray-900">Status</th>
									</tr>
								</thead>
								<tbody>
									{posMetrics?.recentTransactions && posMetrics.recentTransactions.length > 0 ? (
										posMetrics.recentTransactions.map((tx: any) => (
											<tr key={tx.id} className="border-b border-border-color last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-850 transition-colors">
												<td className="py-2.5 px-2 text-xs font-mono text-default">
													<Link to="/pos" className="hover:text-primary transition-colors">
														#{tx.invoiceNo || tx.id.slice(0, 8)}
													</Link>
												</td>
												<td className="py-2.5 px-2">
													<div className="flex items-center gap-2">
														<div className="size-7 rounded-full bg-light flex items-center justify-center text-xs font-bold text-gray-700 uppercase border border-border-color shrink-0">
															{(tx.customerName || "C").slice(0, 1)}
														</div>
														<span className="text-xs font-semibold text-title">{tx.customerName || "Walk-in Customer"}</span>
													</div>
												</td>
												<td className="py-2.5 px-2 text-xs text-default">{tx.cashierName || "Cashier"}</td>
												<td className="py-2.5 px-2 text-xs text-default">
													{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
												</td>
												<td className="py-2.5 px-2 text-xs text-gray-900">-</td>
												<td className="py-2.5 px-2 text-xs font-semibold text-gray-900">
													₹{Number(tx.total || 0).toLocaleString("en-IN")}
												</td>
												<td className="py-2.5 px-2 text-xs text-default">{tx.paymentMethod || "Cash"}</td>
												<td className="py-2.5 px-2">
													<span className="text-[11px] bg-success-transparent text-success px-2 py-0.5 rounded font-medium capitalize">
														{tx.paymentStatus || "Completed"}
													</span>
												</td>
											</tr>
										))
									) : (
										<tr>
											<td colSpan={8} className="py-12 text-center text-muted-foreground text-xs">
												<i className="ph-duotone ph-receipt text-3xl mb-2 text-gray-400 block"></i>
												No recent orders found. Orders created in POS will appear here in real time.
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
