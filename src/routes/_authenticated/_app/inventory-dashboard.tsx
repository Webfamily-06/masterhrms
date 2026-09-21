import { usePermissions } from "@/lib/permissions";
import { AccessDenied } from "@/components/access-denied";
import { Loader2, ArrowRightLeft, Plus, AlertTriangle, Package, Warehouse as WarehouseIcon, Layers, TrendingUp } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatSystemAmount } from "@/lib/currency";
import { initFlatpickr } from "@/lib/init-dashboard";
import { initInventoryCharts } from "@/lib/dashboard-charts";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/_app/inventory-dashboard")({
  component: InventoryDashboardPage,
});

export default function InventoryDashboardPage() {
  const { canAccessModule, loading } = usePermissions();

  // 1. Fetch live inventory dashboard analytics
  const { data: invData, isLoading: invLoading } = useQuery({
    queryKey: ["dashboard-inventory-metrics"],
    queryFn: async () => {
      const res = await api.get<any>("/api/dashboard/inventory");
      return res.data;
    },
  });

  // 2. Fetch live product catalog records
  const { data: productsRes, isLoading: productsLoading } = useQuery({
    queryKey: ["dashboard-inventory-products"],
    queryFn: async () => {
      const res = await api.get<any>("/api/products");
      if (Array.isArray(res.data)) return res.data;
      return res.data?.data || [];
    },
  });
  const products: any[] = Array.isArray(productsRes) ? productsRes : [];

  useEffect(() => {
    // 1. Bind interactive flatpickr to calendar input
    initFlatpickr();

    // 2. Initialize exact page charts
    const cleanup = initInventoryCharts();

    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <p className="text-xs text-muted-foreground font-medium animate-pulse">Verifying workspace permissions...</p>
      </div>
    );
  }

  if (!canAccessModule("inventory")) {
    return (
      <AccessDenied
        moduleName="Inventory Dashboard"
        requiredPermission="inventory.dashboard.view"
        message="You do not have permission to access the Inventory Dashboard."
      />
    );
  }

  const totalStock = invData?.totalStockUnits ?? products.reduce((acc, p) => acc + (p.warehouseStocks?.reduce((s: number, ws: any) => s + (ws.quantity || 0), 0) || 0), 0);
  const totalValuation = invData?.totalValuation ?? products.reduce((acc, p) => {
    const stock = p.warehouseStocks?.reduce((s: number, ws: any) => s + (ws.quantity || 0), 0) || 0;
    return acc + (stock * Number(p.salePrice || 0));
  }, 0);
  const totalProducts = invData?.totalProducts ?? products.length;
  const lowStockCount = invData?.lowStockCount ?? 0;
  const outOfStockCount = invData?.outOfStockCount ?? 0;
  const categories = invData?.categories || [];
  const warehouses = invData?.warehouses || [];
  const lowStockAlerts = invData?.lowStockAlerts || [];

  return (
    <div className="w-full min-w-0 flex-1">
      <div className="p-3 lg:py-6 lg:px-0">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 lg:mb-6">
          <div>
            <h1 className="text-gray-900 dark:text-gray-100 text-xl max-lg:text-lg font-bold mb-0">Inventory Dashboard</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Realtime warehouse balances, stock valuations, and item movements.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative rangepicker-input w-[174px] h-[28px] leading-none">
              <span className="absolute inset-y-0 left-0 flex items-center px-3 text-muted-foreground text-dark text-xs!">
                <i className="icon-calendar"></i>
              </span>
              <input
                type="text"
                className="form-input text-xs! h-[28px] inline-block w-full bg-light border-border-color rounded-md focus:ring-0 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:border-border-color pl-8! ps-8!"
                data-provider="flatpickr"
                data-date-format="d M y"
                data-range-date="true"
                defaultValue="01 Jan 26 to 20 Jan 26"
                id="picker"
              />
            </div>
            <Link
              to="/transfers"
              className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 inline-flex items-center gap-1.5 hover:bg-light cursor-pointer text-xs"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-primary" /> Stock Transfers
            </Link>
            <Link
              to="/products"
              className="btn-sm bg-dark text-white border border-dark inline-flex items-center gap-2 hover:bg-primary-hover hover:border-primary-hover cursor-pointer text-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add Product
            </Link>
          </div>
        </div>

        {/* Top KPI Grid */}
        <div className="grid grid-cols-1 xxl:grid-cols-12 lg:grid-cols-12 md:grid-cols-12 gap-3 mb-3 w-full">
          {/* Card 1 & 2: Total Stock & Inventory Value */}
          <div className="flex flex-col gap-3 xxl:col-span-3 lg:col-span-6 md:col-span-6 min-w-0">
            <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 relative overflow-hidden flex-1 shadow-2xs">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Stock Units</p>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl max-lg:text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">
                      {invLoading ? "..." : totalStock.toLocaleString("en-IN")}
                    </h2>
                    <span className="text-[11px] font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                      Live
                    </span>
                  </div>
                </div>
                <div className="size-9 rounded-md bg-emerald-500 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-white" />
                </div>
              </div>
              <div id="inv-total-stock-spark" className="w-full"></div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 relative overflow-hidden flex-1 shadow-2xs">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Inventory Value</p>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl max-lg:text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">
                      {invLoading ? "..." : formatSystemAmount(totalValuation)}
                    </h2>
                    <span className="text-[11px] font-medium bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 px-1.5 py-0.5 rounded">
                      Assets
                    </span>
                  </div>
                </div>
                <div className="size-9 rounded-md bg-orange-500 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
              </div>
              <div id="inv-value-spark" className="w-full"></div>
            </div>
          </div>

          {/* Card 3: Category Distribution */}
          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 xxl:col-span-4 lg:col-span-6 md:col-span-6 min-w-0 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-0">Category Distribution</h3>
              <Badge variant="outline" className="text-xs">
                {categories.length} Categories
              </Badge>
            </div>
            <div id="inv-category-chart" className="w-full"></div>
            <div className="space-y-1.5 mt-2">
              {categories.slice(0, 4).map((cat: any) => (
                <div key={cat.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-primary inline-block"></span>
                    {cat.name}
                  </span>
                  <span className="font-semibold">{cat.count} items</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Product Stock Levels & Alerts */}
          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 xxl:col-span-5 lg:col-span-12 md:col-span-12 min-w-0 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-0">Stock Health & Alerts</h3>
              <div className="flex items-center gap-2">
                <span className="text-[11px] bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 font-semibold px-2 py-0.5 rounded">
                  {outOfStockCount} Out of Stock
                </span>
                <span className="text-[11px] bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 font-semibold px-2 py-0.5 rounded">
                  {lowStockCount} Low Stock
                </span>
              </div>
            </div>
            <div id="inv-stock-levels-chart" className="w-full"></div>
            <div className="flex items-center justify-center gap-6 mt-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-muted-foreground">Total Catalog Products ({totalProducts})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-rose-500"></span>
                <span className="text-muted-foreground">Stock Depleted ({outOfStockCount})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Second Row: Warehouses & Low Stock Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
          {/* Warehouse Stock Breakdown */}
          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 pb-3 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <WarehouseIcon className="w-4 h-4 text-primary" />
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-0">Warehouse Hubs</h3>
              </div>
              <Link to="/products" className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 inline-flex items-center gap-1 hover:bg-light text-xs">
                Manage Stock <i className="ph ph-caret-right text-[10px]"></i>
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse">
                <tbody>
                  {warehouses.length === 0 ? (
                    <tr>
                      <td className="py-6 text-center text-xs text-muted-foreground">No warehouse hubs registered.</td>
                    </tr>
                  ) : (
                    warehouses.map((w: any) => (
                      <tr key={w.id} className="align-middle border-b border-border/40 last:border-0">
                        <td className="py-2.5 pe-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="size-8 rounded-md bg-light dark:bg-slate-800 flex items-center justify-center shrink-0">
                              <WarehouseIcon className="w-4 h-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate mb-0">{w.name}</p>
                              <p className="text-[11px] text-muted-foreground mb-0">Active Storage Hub</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="text-[11px] text-muted-foreground mb-0">Assigned SKUs</p>
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-0">{w.itemsCount || 0} Products</p>
                        </td>
                        <td className="py-2.5 ps-3 text-end">
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]">
                            Online
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Low Stock Watchlist */}
          <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 pb-3 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-0">Low Stock Watchlist</h3>
              </div>
              <Link to="/products" className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 inline-flex items-center gap-1 hover:bg-light text-xs">
                Restock <i className="ph ph-caret-right text-[10px]"></i>
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse">
                <tbody>
                  {lowStockAlerts.length === 0 ? (
                    <tr>
                      <td className="py-6 text-center text-xs text-muted-foreground">All products are within healthy stock thresholds!</td>
                    </tr>
                  ) : (
                    lowStockAlerts.slice(0, 5).map((item: any) => (
                      <tr key={item.id} className="align-middle border-b border-border/40 last:border-0">
                        <td className="py-2.5 pe-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="size-8 rounded-md bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4 text-amber-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate mb-0">{item.name}</p>
                              <p className="text-[11px] text-muted-foreground font-mono mb-0">{item.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="text-[11px] text-muted-foreground mb-0">Current Qty</p>
                          <p className="text-xs font-bold text-rose-600 mb-0">{item.stock} / {item.threshold} min</p>
                        </td>
                        <td className="py-2.5 ps-3 text-end">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded inline-block ${
                            item.stock === 0
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            {item.stock === 0 ? "Depleted" : "Low Stock"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Third Row: Real Product Stock Catalog Table */}
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 pb-[6px] shadow-2xs">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-0">Active Product Catalog & Realtime Balances</h3>
            <Link to="/products" className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 inline-flex items-center gap-1 hover:bg-light text-xs">
              View All Products <i className="ph ph-caret-right text-[10px]"></i>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border-color bg-light/50 dark:bg-slate-800/50">
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Product</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">SKU</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Category</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Unit</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Quantity</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Selling Price</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Cost Price</th>
                  <th className="text-center py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Status</th>
                </tr>
              </thead>
              <tbody>
                {productsLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground animate-pulse">
                      Loading product stock levels...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      No products found. Add products in the Product Catalog.
                    </td>
                  </tr>
                ) : (
                  products.slice(0, 8).map((p: any) => {
                    const totalQty = p.warehouseStocks?.reduce((acc: number, ws: any) => acc + (ws.quantity || 0), 0) || 0;
                    const isOut = totalQty <= 0;
                    const isLow = !isOut && totalQty <= (p.lowStockThreshold || 5);

                    return (
                      <tr key={p.id} className="border-b border-border-color last:border-0 hover:bg-light/20 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="size-7 rounded-md bg-light dark:bg-slate-800 flex items-center justify-center shrink-0 font-bold text-primary text-xs">
                              {p.name.charAt(0)}
                            </div>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">{p.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground font-mono">{p.sku}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{p.category?.name || "General"}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{p.unit || "Pcs"}</td>
                        <td className="py-2.5 px-3 text-right font-bold tabular-nums text-gray-900 dark:text-gray-100">
                          {totalQty}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums font-medium text-emerald-600">
                          {formatSystemAmount(Number(p.salePrice || 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                          {formatSystemAmount(Number(p.purchasePrice || 0))}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded ${
                              isOut
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                                : isLow
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            }`}
                          >
                            {isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <footer className="footer px-6 pb-3 mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground border-t border-border-color pt-4">
        <p>{new Date().getFullYear()} &copy; Master HRMS & Global SaaS ERP Enterprise</p>
      </footer>
    </div>
  );
}
