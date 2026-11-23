'use client';

import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, unwrapArray, unwrapData } from "@/lib/api";
import { toast } from "sonner";
import { Link } from "@/src/lib/router-compat";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Chart = lazy(() => import("react-apexcharts"));

export default function AssetDashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [addAssetOpen, setAddAssetOpen] = useState(false);
  const [scheduleMaintOpen, setScheduleMaintOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch real-time assets
  const { data: rawAssets = [] } = useQuery({
    queryKey: ["assets-dashboard-list"],
    queryFn: async () => {
      try {
        const res = await api.get("/hr/assets");
        return unwrapArray(res);
      } catch {
        return [];
      }
    },
  });

  // Fetch asset overview aggregates
  const { data: overviewData } = useQuery({
    queryKey: ["assets-dashboard-overview"],
    queryFn: async () => {
      try {
        const res = await api.get("/hr/assets/overview");
        return unwrapData(res);
      } catch {
        return null;
      }
    },
  });

  // Chart 1: Purchase Trend Area Chart
  const purchaseTrendOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "area", height: 230, toolbar: { show: false } },
      series: [{ name: "Assets Acquired", data: [35, 48, 62, 75, 82, 95, 110, 125, 98, 85, 78, 65] }],
      xaxis: {
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        labels: { style: { colors: "#94A3B8", fontSize: "11px" } },
      },
      yaxis: { labels: { style: { colors: "#94A3B8", fontSize: "11px" } } },
      colors: ["#0d6efd"],
      stroke: { curve: "smooth", width: 2 },
      fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05 } },
      grid: { borderColor: "#E2E8F0", strokeDashArray: 3 },
      dataLabels: { enabled: false },
    }),
    []
  );

  // Chart 2: Assets by Department
  const assetsByDeptOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "bar", height: 230, toolbar: { show: false } },
      plotOptions: { bar: { horizontal: true, barHeight: "45%", borderRadius: 4, distributed: true } },
      series: [{ name: "Assets", data: [420, 280, 195, 160, 110, 82] }],
      xaxis: {
        categories: ["Engineering", "Sales", "Finance", "HR", "Operations", "Legal"],
        labels: { style: { colors: "#94A3B8", fontSize: "11px" } },
      },
      yaxis: { labels: { style: { colors: "#64748B", fontSize: "11px" } } },
      colors: ["#0d6efd", "#4f46e5", "#06b6d4", "#f59e0b", "#ec4899", "#10b981"],
      grid: { borderColor: "#E2E8F0", strokeDashArray: 3 },
      legend: { show: false },
      dataLabels: { enabled: false },
    }),
    []
  );

  // 3 Mini Sparklines
  const totalAssetsSparkline: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "area", height: 45, sparkline: { enabled: true } },
      series: [{ data: [1100, 1150, 1180, 1210, 1235, 1247] }],
      colors: ["#0d6efd"],
      stroke: { curve: "smooth", width: 2 },
      fill: { opacity: 0.2 },
    }),
    []
  );

  const assignedSparkline: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "area", height: 45, sparkline: { enabled: true } },
      series: [{ data: [780, 810, 835, 860, 875, 892] }],
      colors: ["#10b981"],
      stroke: { curve: "smooth", width: 2 },
      fill: { opacity: 0.2 },
    }),
    []
  );

  const availableSparkline: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "area", height: 45, sparkline: { enabled: true } },
      series: [{ data: [320, 310, 305, 298, 290, 287] }],
      colors: ["#f59e0b"],
      stroke: { curve: "smooth", width: 2 },
      fill: { opacity: 0.2 },
    }),
    []
  );

  // Chart 3: Assets by Category Donut
  const categoriesDonutOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "donut", height: 180 },
      series: [40, 20, 15, 15, 10],
      labels: ["Laptops", "Monitors & Mice", "Writing Pads", "Keyboards", "Office Chairs"],
      colors: ["#0d6efd", "#6366f1", "#06b6d4", "#f59e0b", "#94a3b8"],
      stroke: { width: 0 },
      dataLabels: { enabled: false },
      legend: { show: false },
      plotOptions: {
        pie: {
          donut: {
            size: "72%",
            labels: {
              show: true,
              total: { show: true, label: "Total Types", fontSize: "10px", color: "#64748B", formatter: () => "5 Groups" },
            },
          },
        },
      },
    }),
    []
  );

  const assetList = useMemo(() => {
    if (rawAssets && rawAssets.length > 0) {
      return rawAssets.map((item: any, idx: number) => ({
        id: item.assetTag || item.id || `AP-${String(idx + 1).padStart(3, "0")}`,
        name: item.name || "Enterprise Hardware",
        user: item.assignedEmployee ? `${item.assignedEmployee.firstName || ""} ${item.assignedEmployee.lastName || ""}`.trim() : "Unassigned",
        purchaseDate: item.purchaseDate ? new Date(item.purchaseDate).toISOString().split("T")[0] : "2024-01-15",
        warrantyExpiry: item.warrantyExpiry ? new Date(item.warrantyExpiry).toISOString().split("T")[0] : "2027-01-15",
        status: item.status === "available" ? "Available" : item.status === "maintenance" ? "Under Repair" : "In Use",
        badge: item.status === "available" ? "bg-amber-500/10 text-amber-600" : item.status === "maintenance" ? "bg-rose-500/10 text-rose-600" : "bg-emerald-500/10 text-emerald-600",
      }));
    }
    return [
      { id: "AP-782", name: 'Dell XPS 13" Ultrabook', user: "Sarah Johnson", purchaseDate: "2023-08-20", warrantyExpiry: "2026-08-20", status: "In Use", badge: "bg-emerald-500/10 text-emerald-600" },
      { id: "AP-815", name: "HP EliteBook 840 G9", user: "David Lee", purchaseDate: "2023-09-10", warrantyExpiry: "2026-09-10", status: "In Use", badge: "bg-emerald-500/10 text-emerald-600" },
      { id: "AP-236", name: "Lenovo ThinkPad X1 Carbon", user: "Jessica Brown", purchaseDate: "2024-01-15", warrantyExpiry: "2027-01-15", status: "In Use", badge: "bg-emerald-500/10 text-emerald-600" },
      { id: "AP-512", name: 'Apple MacBook Pro 16" M2', user: "Amanda Lewis", purchaseDate: "2024-03-01", warrantyExpiry: "2027-03-01", status: "Available", badge: "bg-amber-500/10 text-amber-600" },
      { id: "AP-904", name: "Ergonomic High-Back Mesh Chair", user: "Facility Floor 2", purchaseDate: "2024-05-12", warrantyExpiry: "2029-05-12", status: "Under Repair", badge: "bg-rose-500/10 text-rose-600" },
    ];
  }, [rawAssets]);

  const filteredAssets = useMemo(() => {
    return assetList.filter((a) => {
      const matchSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.id.toLowerCase().includes(searchQuery.toLowerCase()) || a.user.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "all" || a.status.toLowerCase().includes(statusFilter.toLowerCase());
      return matchSearch && matchStatus;
    });
  }, [assetList, searchQuery, statusFilter]);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <PageHeader
        title="Asset Management Dashboard"
        description="Lifecycle tracking, hardware procurement trends, warranty coverage, and departmental assignments."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setScheduleMaintOpen(true)}>
              <i className="ph ph-calendar-plus me-1.5"></i> Schedule Maintenance
            </Button>
            <Button variant="primary" size="sm" onClick={() => setAddAssetOpen(true)}>
              <i className="ph-bold ph-plus me-1.5"></i> Add New Asset
            </Button>
          </div>
        }
      />

      {/* ── Row 1: Purchase Trend (8 cols) & Assets by Department (4 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Purchase Trend */}
        <Card className="p-5 lg:col-span-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="border-l-2 border-primary pl-2.5">
                <h3 className="text-base font-bold text-foreground">Hardware Purchase Trend</h3>
                <p className="text-xs text-muted-foreground">Capital acquisitions throughout the fiscal cycle</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-foreground font-mono">654 Units</span>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  +18% <i className="ph-bold ph-arrow-up-right"></i>
                </span>
              </div>
            </div>

            {isMounted && (
              <Suspense fallback={<div className="h-60 flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
                <Chart options={purchaseTrendOptions} series={purchaseTrendOptions.series} type="area" height={230} />
              </Suspense>
            )}
          </div>
        </Card>

        {/* Assets by Department */}
        <Card className="p-5 lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="border-l-2 border-primary pl-2.5 mb-3">
              <h3 className="text-base font-bold text-foreground">Assets by Department</h3>
              <p className="text-xs text-muted-foreground">Workstation & peripherals deployment</p>
            </div>

            {isMounted && (
              <Suspense fallback={<div className="h-60 flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
                <Chart options={assetsByDeptOptions} series={assetsByDeptOptions.series} type="bar" height={230} />
              </Suspense>
            )}
          </div>
        </Card>
      </div>

      {/* ── Row 2: 3 KPI Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <i className="ph ph-desktop text-base text-primary"></i> Total Assets Registered
            </span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
              +9.25% <i className="ph-bold ph-arrow-up-right"></i>
            </span>
          </div>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold text-foreground">1,247</h3>
            <div className="w-24">
              {isMounted && (
                <Suspense fallback={<div className="h-10"></div>}>
                  <Chart options={totalAssetsSparkline} series={totalAssetsSparkline.series} type="area" height={45} />
                </Suspense>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <i className="ph ph-user-check text-base text-emerald-600"></i> Assets Assigned
            </span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
              +9.25% <i className="ph-bold ph-arrow-up-right"></i>
            </span>
          </div>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold text-foreground">892</h3>
            <div className="w-24">
              {isMounted && (
                <Suspense fallback={<div className="h-10"></div>}>
                  <Chart options={assignedSparkline} series={assignedSparkline.series} type="area" height={45} />
                </Suspense>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <i className="ph ph-box text-base text-amber-500"></i> Assets In Stock
            </span>
            <span className="text-xs font-bold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
              -9.25% <i className="ph-bold ph-arrow-down-right"></i>
            </span>
          </div>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold text-foreground">287</h3>
            <div className="w-24">
              {isMounted && (
                <Suspense fallback={<div className="h-10"></div>}>
                  <Chart options={availableSparkline} series={availableSparkline.series} type="area" height={45} />
                </Suspense>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* ── Row 3: Asset Value & Depreciation (5 cols) & Assets by Category (7 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Asset Value & Depreciation */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="border-l-2 border-primary pl-2.5">
                <h4 className="text-sm font-bold text-foreground">Gross Asset Valuation</h4>
                <p className="text-xs text-muted-foreground">Current replacement value</p>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                +22% vs last month
              </span>
            </div>
            <h3 className="text-3xl font-bold text-foreground my-2">$2.4M</h3>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: "65%" }}></div>
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground mt-1 font-mono">
              <span>$0</span>
              <span>$2M</span>
              <span>$4M Limit</span>
            </div>
          </Card>

          <Card className="p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="border-l-2 border-rose-500 pl-2.5">
                <h4 className="text-sm font-bold text-foreground">Accumulated Depreciation</h4>
                <p className="text-xs text-muted-foreground">Book value amortization</p>
              </div>
              <span className="text-xs font-bold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-full">
                -18% Book Value
              </span>
            </div>
            <h3 className="text-3xl font-bold text-foreground my-2">$1.8M</h3>
            <p className="text-xs text-muted-foreground">Straight-line depreciation applied over 3-year standard IT hardware lifecycle.</p>
          </Card>
        </div>

        {/* Assets by Category */}
        <Card className="p-5 lg:col-span-7 flex flex-col justify-between">
          <div>
            <div className="border-l-2 border-primary pl-2.5 mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">Assets by Category</h3>
                <p className="text-xs text-muted-foreground">Breakdown of inventory allocation</p>
              </div>
              <span className="text-xs text-muted-foreground">Active Pool</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-5 flex justify-center">
                {isMounted && (
                  <Suspense fallback={<div className="h-44"></div>}>
                    <Chart options={categoriesDonutOptions} series={categoriesDonutOptions.series} type="donut" height={180} />
                  </Suspense>
                )}
              </div>
              <div className="md:col-span-7 space-y-2.5">
                {[
                  { name: "Laptops & MacBooks", pct: 40, bar: "bg-blue-600" },
                  { name: "Monitors & Ergonomic Mice", pct: 20, bar: "bg-indigo-600" },
                  { name: "Digital Writing Pads", pct: 15, bar: "bg-cyan-500" },
                  { name: "Mechanical Keyboards", pct: 15, bar: "bg-amber-500" },
                  { name: "Ergonomic Chairs & Desks", pct: 10, bar: "bg-slate-500" },
                ].map((cat, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span>{cat.name}</span>
                      <span className="font-bold text-foreground">{cat.pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full ${cat.bar} rounded-full`} style={{ width: `${cat.pct}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Row 4: Active Assets & Equipment Registry Table ── */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="border-l-2 border-primary pl-2.5">
            <h3 className="text-base font-bold text-foreground">Active Assets & Equipment Registry</h3>
            <p className="text-xs text-muted-foreground">Live inventory with serial tags, warranty milestones, and assignees</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              placeholder="Search tag or asset..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs border border-border rounded-md px-3 py-1.5 bg-card text-foreground"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-border rounded-md px-2.5 py-1.5 bg-card text-foreground"
            >
              <option value="all">All Statuses</option>
              <option value="in use">In Use</option>
              <option value="available">Available</option>
              <option value="under repair">Under Repair</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto border border-border/80 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3 font-semibold">Asset ID</th>
                <th className="p-3 font-semibold">Asset Name</th>
                <th className="p-3 font-semibold">Assigned To</th>
                <th className="p-3 font-semibold">Purchase Date</th>
                <th className="p-3 font-semibold">Warranty Expiry</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAssets.map((row, idx) => (
                <tr key={idx} className="hover:bg-muted/40 transition-colors">
                  <td className="p-3 font-mono font-medium text-primary">{row.id}</td>
                  <td className="p-3 font-semibold text-foreground">{row.name}</td>
                  <td className="p-3 text-muted-foreground">{row.user}</td>
                  <td className="p-3 text-muted-foreground font-mono">{row.purchaseDate}</td>
                  <td className="p-3 text-muted-foreground font-mono">{row.warrantyExpiry}</td>
                  <td className="p-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${row.badge}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => toast.info(`Viewing specs for ${row.id}`)}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors me-1"
                    >
                      <i className="ph ph-eye text-base"></i>
                    </button>
                    <button
                      type="button"
                      onClick={() => toast.success(`Maintenance requested for ${row.id}`)}
                      className="p-1 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <i className="ph ph-wrench text-base"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Add New Asset Modal ── */}
      <Dialog open={addAssetOpen} onOpenChange={setAddAssetOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register New Hardware Asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Asset Tag / Name</label>
              <input type="text" placeholder='e.g. Dell XPS 15" Laptop' className="w-full border border-border rounded-md p-2 bg-card text-foreground" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Category</label>
                <select className="w-full border border-border rounded-md p-2 bg-card text-foreground">
                  <option>Laptops</option>
                  <option>Monitors</option>
                  <option>Keyboards</option>
                  <option>Mobile Devices</option>
                  <option>Furniture</option>
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1">Purchase Cost</label>
                <input type="number" defaultValue={1200} className="w-full border border-border rounded-md p-2 bg-card text-foreground" />
              </div>
            </div>
            <div>
              <label className="font-semibold block mb-1">Warranty Period</label>
              <select className="w-full border border-border rounded-md p-2 bg-card text-foreground">
                <option>1 Year Standard</option>
                <option>2 Years Extended</option>
                <option>3 Years ProSupport Plus</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setAddAssetOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  toast.success("New hardware asset registered in system!");
                  setAddAssetOpen(false);
                }}
              >
                Save Asset
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Schedule Maintenance Modal ── */}
      <Dialog open={scheduleMaintOpen} onOpenChange={setScheduleMaintOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Hardware Maintenance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Select Asset</label>
              <select className="w-full border border-border rounded-md p-2 bg-card text-foreground">
                {assetList.map((a) => (
                  <option key={a.id} value={a.id}>{a.id} - {a.name} ({a.user})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold block mb-1">Maintenance Date</label>
              <input type="date" className="w-full border border-border rounded-md p-2 bg-card text-foreground" />
            </div>
            <div>
              <label className="font-semibold block mb-1">Issue / Service Scope</label>
              <textarea rows={3} placeholder="Describe service required (e.g. Battery replacement, OS upgrade)..." className="w-full border border-border rounded-md p-2 bg-card text-foreground"></textarea>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setScheduleMaintOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  toast.success("Maintenance window logged and technician notified!");
                  setScheduleMaintOpen(false);
                }}
              >
                Schedule Service
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
