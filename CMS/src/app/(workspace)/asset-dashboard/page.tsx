"use client";

import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

const Chart = lazy(() => import("react-apexcharts"));

interface CategoryStat {
  name: string;
  count: number;
  percent: number;
}

interface RecentAssetRow {
  id: string;
  assetTag: string;
  name: string;
  category: string;
  categoryId?: string | null;
  assignedTo?: string | null;
  purchaseDate?: string | null;
  warrantyExpiry?: string | null;
  status: string;
  purchasePrice: number;
}

interface AssetDashboardData {
  summary: {
    totalAssets: number;
    assignedAssets: number;
    availableAssets: number;
    maintenanceAssets: number;
    disposedAssets: number;
    assignedRate: number;
    availableRate: number;
    totalPurchaseValue: number;
    totalCurrentValue: number;
    totalDepreciation: number;
    depreciationPercent: number;
    currentValuePercent: number;
  };
  purchaseTrend: {
    labels: string[];
    data: number[];
    total: number;
    growthPercent: number;
  };
  assetsByDepartment: {
    labels: string[];
    data: number[];
  };
  assetsByCategory: CategoryStat[];
  sparklines: {
    total: number[];
    assigned: number[];
    available: number[];
    value: number[];
    depreciation: number[];
  };
  recentAssets: RecentAssetRow[];
}

const formatINRCompact = (value: number) => {
  const v = Number(value) || 0;
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);
};

const formatDateISO = (raw?: string | null) => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  assigned: { label: "Assigned", cls: "badge-success" },
  available: { label: "Available", cls: "badge-purple" },
  maintenance: { label: "Maintenance", cls: "badge-warning" },
  disposed: { label: "Disposed", cls: "badge-danger" },
};

const CATEGORY_COLORS = ["#FF6F28", "#1B84FF", "#03C95A", "#FFC107", "#E70D0D", "#6366F1", "#14B8A6"];

export default function AssetDashboardPage() {
  const queryClient = useQueryClient();
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    data: dashboard,
    isLoading,
    refetch,
    isFetching,
  } = useQuery<AssetDashboardData>({
    queryKey: ["hr-assets-dashboard-live"],
    queryFn: async () => {
      const res = await api.get("/hr/assets/dashboard");
      return res?.data ?? res;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/hr/assets/${id}`),
    onSuccess: () => {
      toast.success("Asset deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-assets-dashboard-live"] });
      queryClient.invalidateQueries({ queryKey: ["hr-assets-list"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete asset");
    },
  });

  const summary = dashboard?.summary ?? {
    totalAssets: 0,
    assignedAssets: 0,
    availableAssets: 0,
    maintenanceAssets: 0,
    disposedAssets: 0,
    assignedRate: 0,
    availableRate: 0,
    totalPurchaseValue: 0,
    totalCurrentValue: 0,
    totalDepreciation: 0,
    depreciationPercent: 0,
    currentValuePercent: 0,
  };

  // Purchase Trend Area Chart (live monthly counts)
  const purchaseTrendOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { height: 253, type: "area", toolbar: { show: false } },
      stroke: { curve: "smooth", width: 2 },
      colors: ["#03C95A"],
      dataLabels: { enabled: false },
      xaxis: {
        categories: dashboard?.purchaseTrend?.labels ?? [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ],
      },
      yaxis: { min: 0, forceNiceScale: true },
    }),
    [dashboard?.purchaseTrend?.labels]
  );

  const purchaseTrendSeries = useMemo(
    () => [
      {
        name: "Purchased",
        data: dashboard?.purchaseTrend?.data ?? new Array(12).fill(0),
      },
    ],
    [dashboard?.purchaseTrend?.data]
  );

  // Assets by Department Horizontal Bar Chart (live)
  const deptLabels = dashboard?.assetsByDepartment?.labels?.length
    ? dashboard.assetsByDepartment.labels
    : ["No Data"];
  const deptData = dashboard?.assetsByDepartment?.data?.length
    ? dashboard.assetsByDepartment.data
    : [0];

  const assetDeptOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { height: 296, type: "bar", toolbar: { show: false } },
      colors: ["#0C4B5E"],
      plotOptions: {
        bar: { borderRadius: 4, horizontal: true, barHeight: "35%" },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: deptLabels,
        labels: { style: { colors: "#6B7280", fontSize: "12px" } },
      },
      grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
    }),
    [deptLabels]
  );

  const assetDeptSeries = useMemo(() => [{ name: "Assets", data: deptData }], [deptData]);

  // Sparklines (live monthly data)
  const makeSparklineOptions = (color: string, height = 116): ApexCharts.ApexOptions => ({
    chart: { type: "bar", height, toolbar: { show: false }, sparkline: { enabled: true } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "65%" } },
    colors: [color],
    tooltip: { enabled: true },
  });

  const totalSparkOptions = useMemo(() => makeSparklineOptions("#FF6F28", 116), []);
  const assignedSparkOptions = useMemo(() => makeSparklineOptions("#0C4B5E", 116), []);
  const availableSparkOptions = useMemo(() => makeSparklineOptions("#7C3AED", 116), []);
  const valueSparkOptions = useMemo(() => makeSparklineOptions("#0C4B5E", 65), []);
  const depSparkOptions = useMemo(() => makeSparklineOptions("#E70D0D", 60), []);

  const totalSparkSeries = useMemo(
    () => [{ name: "Assets", data: dashboard?.sparklines?.total ?? new Array(12).fill(0) }],
    [dashboard?.sparklines?.total]
  );
  const assignedSparkSeries = useMemo(
    () => [{ name: "Assigned", data: dashboard?.sparklines?.assigned ?? new Array(12).fill(0) }],
    [dashboard?.sparklines?.assigned]
  );
  const availableSparkSeries = useMemo(
    () => [{ name: "Available", data: dashboard?.sparklines?.available ?? new Array(12).fill(0) }],
    [dashboard?.sparklines?.available]
  );
  const valueSparkSeries = useMemo(
    () => [{ name: "Purchase Value", data: dashboard?.sparklines?.value ?? new Array(12).fill(0) }],
    [dashboard?.sparklines?.value]
  );
  const depSparkSeries = useMemo(
    () => [
      {
        name: "Depreciation",
        data: dashboard?.sparklines?.depreciation ?? new Array(12).fill(0),
      },
    ],
    [dashboard?.sparklines?.depreciation]
  );

  // Assets by Category Donut Chart (live)
  const categoryStats = dashboard?.assetsByCategory ?? [];
  const assetCategoriesOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { height: 290, type: "donut" },
      colors: CATEGORY_COLORS,
      labels: categoryStats.length ? categoryStats.map((c) => c.name) : ["No Assets"],
      legend: { position: "bottom" },
    }),
    [categoryStats]
  );
  const assetCategoriesSeries = useMemo(
    () => (categoryStats.length ? categoryStats.map((c) => c.count) : [1]),
    [categoryStats]
  );

  // Filtered Table Rows (live DB assets)
  const filteredAssets = useMemo(() => {
    const list = dashboard?.recentAssets ?? [];
    const q = searchQuery.trim().toLowerCase();
    return list.filter((item) => {
      if (statusFilter !== "all" && item.status?.toLowerCase() !== statusFilter) return false;
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (q) {
        const hay = `${item.assetTag} ${item.name} ${item.assignedTo || ""} ${item.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [dashboard?.recentAssets, searchQuery, statusFilter, categoryFilter]);

  const maxAxisVal = Math.max(summary.totalPurchaseValue, 10000);

  return (
    <div className="dashboard-scope w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5">
      {/* Breadcrumb & Header Actions */}
      <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
        <div className="my-auto mb-2">
          <h2 className="mb-1">Asset Management</h2>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link href="/hrm-dashboard">
                  <i className="ti ti-smart-home"></i>
                </Link>
              </li>
              <li className="breadcrumb-item">Dashboard</li>
              <li className="breadcrumb-item active" aria-current="page">
                Asset Management
              </li>
            </ol>
          </nav>
        </div>

        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap gap-2">
          <Link href="/hr/assets" className="btn btn-white mb-2">
            <i className="ti ti-user me-1"></i> Assign Asset
          </Link>
          <Link href="/hr/assets/depreciation" className="btn btn-secondary mb-2">
            <i className="ti ti-chart-line me-1"></i> Depreciation Report
          </Link>
          <Link href="/hr/assets" className="btn btn-primary-gradient mb-2">
            <i className="ti ti-plus me-1"></i> Add New Asset
          </Link>
        </div>
      </div>

      {/* Row 1: Purchase Trend + Assets by Department */}
      <div className="row">
        <div className="col-xl-8">
          <div className="card position-relative analysis-card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2 mb-3">
                <h3 className="mb-0 card-title">Purchase Trend</h3>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="border btn btn-white btn-sm fw-medium d-inline-flex align-items-center gap-1"
                >
                  <i className={`ti ti-refresh fs-14 ${isFetching ? "animate-spin" : ""}`}></i>
                  <span>Refresh</span>
                </button>
              </div>

              <div className="mb-1 d-flex align-items-center gap-2 flex-wrap">
                <h4 className="mb-0">{summary.totalAssets.toLocaleString("en-IN")}</h4>
                <div className="border rounded-pill bg-light fs-13 text-gray-9 d-flex align-items-center gap-2 p-2px ps-2">
                  {dashboard?.purchaseTrend?.growthPercent !== undefined
                    ? `${dashboard.purchaseTrend.growthPercent >= 0 ? "+" : ""}${dashboard.purchaseTrend.growthPercent}%`
                    : "0%"}
                  <span className="btn btn-sm btn-icon pe-none bg-success rounded-circle d-flex align-items-center justify-content-center text-white">
                    <i className="ti ti-arrow-up-right fs-16"></i>
                  </span>
                </div>
                <p className="mb-0 fs-14">total registered assets</p>
              </div>

              <div id="purchase-trend" style={{ position: "relative" }}>
                {isMounted && (
                  <Suspense
                    fallback={
                      <div className="h-48 flex items-center justify-center text-muted-foreground text-xs">
                        Loading chart...
                      </div>
                    }
                  >
                    <Chart
                      options={purchaseTrendOptions}
                      series={purchaseTrendSeries}
                      type="area"
                      height={253}
                      width="100%"
                    />
                  </Suspense>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4 d-flex flex-column">
          <div className="card flex-fill">
            <div className="card-body">
              <div className="pb-2 d-flex align-items-center justify-content-between flex-wrap mb-3">
                <h5 className="mb-0">Assets by Department</h5>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="btn btn-sm btn-icon border-0 bg-transparent"
                  title="Refresh department chart"
                >
                  <i className="ti ti-refresh fs-18 text-secondary"></i>
                </button>
              </div>

              <div id="assets-department">
                {isMounted && (
                  <Suspense
                    fallback={
                      <div
                        style={{ height: 296 }}
                        className="d-flex align-items-center justify-content-center text-muted"
                      >
                        Loading chart...
                      </div>
                    }
                  >
                    <Chart
                      options={assetDeptOptions}
                      series={assetDeptSeries}
                      type="bar"
                      height={296}
                    />
                  </Suspense>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: 3 Live KPI Sparkline Cards */}
      <div className="row">
        <div className="col-xl-4">
          <div className="card">
            <div className="card-body">
              <div className="mb-3 d-flex align-items-center justify-content-between flex-wrap">
                <p className="mb-0 d-flex align-items-center">
                  <i className="ti ti-device-desktop text-primary fs-20 me-1"></i> Total Assets
                </p>
                <p className="d-flex align-items-center fs-14 text-success fw-bold mb-0">
                  <i className="ti ti-square-rounded-chevron-up me-1"></i>
                  {summary.totalAssets > 0 ? "100%" : "0%"}
                </p>
              </div>
              <h2>{summary.totalAssets.toLocaleString("en-IN")}</h2>
              <div id="total-assets">
                {isMounted && (
                  <Suspense fallback={<div style={{ height: 116 }}>Loading...</div>}>
                    <Chart
                      options={totalSparkOptions}
                      series={totalSparkSeries}
                      type="bar"
                      height={116}
                    />
                  </Suspense>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4">
          <div className="card">
            <div className="card-body">
              <div className="mb-3 d-flex align-items-center justify-content-between flex-wrap">
                <p className="mb-0 d-flex align-items-center">
                  <i className="ti ti-user-star text-secondary fs-20 me-1"></i> Assets Assigned
                </p>
                <p className="d-flex align-items-center fs-14 text-success fw-bold mb-0">
                  <i className="ti ti-square-rounded-chevron-up me-1"></i>
                  {summary.assignedRate}%
                </p>
              </div>
              <h2>{summary.assignedAssets.toLocaleString("en-IN")}</h2>
              <div id="assets-assigned">
                {isMounted && (
                  <Suspense fallback={<div style={{ height: 116 }}>Loading...</div>}>
                    <Chart
                      options={assignedSparkOptions}
                      series={assignedSparkSeries}
                      type="bar"
                      height={116}
                    />
                  </Suspense>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4">
          <div className="card">
            <div className="card-body">
              <div className="mb-3 d-flex align-items-center justify-content-between flex-wrap">
                <p className="mb-0 d-flex align-items-center">
                  <i className="ti ti-cylinder-plus text-purple fs-20 me-1"></i> Assets Available
                </p>
                <p className="d-flex align-items-center fs-14 text-primary fw-bold mb-0">
                  <i className="ti ti-square-rounded-chevron-up me-1"></i>
                  {summary.availableRate}%
                </p>
              </div>
              <h2>{summary.availableAssets.toLocaleString("en-IN")}</h2>
              <div id="assets-available">
                {isMounted && (
                  <Suspense fallback={<div style={{ height: 116 }}>Loading...</div>}>
                    <Chart
                      options={availableSparkOptions}
                      series={availableSparkSeries}
                      type="bar"
                      height={116}
                    />
                  </Suspense>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Asset Value + Depreciated Value + Assets by Category */}
      <div className="row">
        <div className="col-xl-5">
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2 mb-3">
                <h3 className="mb-0 card-title">Asset Value</h3>
                <span className="badge bg-light text-dark border">Original Cost</span>
              </div>

              <div className="mb-3 d-flex align-items-center gap-2 flex-wrap">
                <h4 className="mb-0">{formatINRCompact(summary.totalPurchaseValue)}</h4>
                <div className="border rounded-pill bg-light fs-13 text-gray-9 d-flex align-items-center gap-2 p-2px ps-2">
                  {summary.currentValuePercent}%
                  <span className="btn pe-none btn-sm btn-icon bg-success rounded-circle d-flex align-items-center justify-content-center text-white">
                    <i className="ti ti-arrow-up-right fs-16"></i>
                  </span>
                </div>
                <p className="mb-0 fs-14">current value retained</p>
              </div>

              <div className="d-flex align-items-center justify-content-between px-2 asset-value-lable">
                <p className="fs-12 m-0 fw-semibold">₹0</p>
                <p className="fs-12 m-0 fw-semibold">{formatINRCompact(maxAxisVal / 2)}</p>
                <p className="fs-12 m-0 fw-semibold">{formatINRCompact(maxAxisVal)}</p>
              </div>

              <div id="asset-value">
                {isMounted && (
                  <Suspense fallback={<div style={{ height: 65 }}>Loading...</div>}>
                    <Chart
                      options={valueSparkOptions}
                      series={valueSparkSeries}
                      type="bar"
                      height={65}
                    />
                  </Suspense>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2 mb-3">
                <h3 className="mb-0 card-title">Depreciated Value</h3>
                <Link href="/hr/assets/depreciation" className="fs-12 text-primary fw-medium">
                  View Report
                </Link>
              </div>

              <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap">
                <div className="mb-1 d-flex flex-column gap-2">
                  <h4 className="mb-0">{formatINRCompact(summary.totalCurrentValue)}</h4>
                  <div className="d-flex align-items-center gap-2">
                    <div className="border rounded-pill bg-light fs-13 text-gray-9 d-flex align-items-center gap-2 p-2px ps-2">
                      -{summary.depreciationPercent}%
                      <span className="btn pe-none btn-sm btn-icon bg-danger rounded-circle d-flex align-items-center justify-content-center text-white">
                        <i className="ti ti-arrow-down-right fs-16"></i>
                      </span>
                    </div>
                    <p className="mb-0 fs-14">depreciated</p>
                  </div>
                </div>
                <div id="depreciated-value" className="flex-1 min-w-[140px]">
                  {isMounted && (
                    <Suspense fallback={<div style={{ height: 60 }}>Loading...</div>}>
                      <Chart
                        options={depSparkOptions}
                        series={depSparkSeries}
                        type="bar"
                        height={60}
                      />
                    </Suspense>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-7 d-flex">
          <div className="card flex-fill">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2 mb-4">
                <h3 className="mb-0 card-title">Assets by Category</h3>
                <Link href="/hr/assets/types" className="fs-12 text-primary fw-medium">
                  Manage Types
                </Link>
              </div>

              <div className="row d-flex align-items-center justify-content-center">
                <div className="col-md-6">
                  <div id="asset-categories-chart">
                    {isMounted && (
                      <Suspense
                        fallback={
                          <div className="h-48 flex items-center justify-center text-muted-foreground text-xs">
                            Loading chart...
                          </div>
                        }
                      >
                        <Chart
                          options={assetCategoriesOptions}
                          series={assetCategoriesSeries}
                          type="donut"
                          height={290}
                          width="100%"
                        />
                      </Suspense>
                    )}
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="asset-list space-y-2.5">
                    {categoryStats.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No categorized assets yet.
                      </p>
                    ) : (
                      categoryStats.slice(0, 6).map((cat, idx) => (
                        <div
                          key={cat.name}
                          className="asset-item border rounded-pill overflow-hidden"
                        >
                          <div className="bar flex items-center justify-between px-3 py-2 relative">
                            <div
                              className="absolute inset-y-0 left-0 opacity-15"
                              style={{
                                width: `${Math.max(8, cat.percent)}%`,
                                backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                              }}
                            />
                            <span className="relative z-10 text-xs font-semibold text-foreground">
                              {cat.name}
                            </span>
                            <span className="relative z-10 text-xs font-bold text-foreground">
                              {cat.percent}% ({cat.count})
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Live Assets Inventory Table */}
      <div className="card job-opening-table">
        <div className="card-body">
          <div className="pb-2 d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
            <h3 className="mb-0 card-title">Company Assets</h3>
            <Link
              href="/hr/assets"
              className="btn btn-primary-gradient btn-sm d-inline-flex align-items-center"
            >
              View All
            </Link>
          </div>

          <div className="mb-3 grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-control"
                placeholder="Search by Asset ID, Name, Assignee..."
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-select"
              aria-label="Filter by status"
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="assigned">Assigned</option>
              <option value="maintenance">Maintenance</option>
              <option value="disposed">Disposed</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="form-select"
              aria-label="Filter by category"
            >
              <option value="all">All Categories</option>
              {categoryStats.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-nowrap mb-0">
            <thead>
              <tr>
                <th>Asset ID</th>
                <th>Asset Name</th>
                <th>Assigned To</th>
                <th>Purchase Date</th>
                <th>Warranty Expiry</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    Loading live asset records...
                  </td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    No assets found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredAssets.slice(0, 15).map((asset) => {
                  const st = STATUS_META[asset.status?.toLowerCase()] ?? {
                    label: asset.status || "Available",
                    cls: "badge-secondary",
                  };
                  return (
                    <tr key={asset.id}>
                      <td>
                        <Link href={`/hr/assets/${asset.id}`} className="text-gray-5 fw-medium">
                          {asset.assetTag}
                        </Link>
                      </td>
                      <td>
                        <Link
                          href={`/hr/assets/${asset.id}`}
                          className="fw-medium text-dark text-decoration-none"
                        >
                          {asset.name}
                        </Link>
                      </td>
                      <td>{asset.assignedTo || "Unassigned"}</td>
                      <td>
                        <i className="ti ti-calendar-up me-1"></i>
                        {formatDateISO(asset.purchaseDate)}
                      </td>
                      <td>
                        <i className="ti ti-calendar-up me-1"></i>
                        {formatDateISO(asset.warrantyExpiry)}
                      </td>
                      <td>
                        <span
                          className={`badge ${st.cls} d-inline-flex align-items-center badge-xs`}
                        >
                          <i className="ti ti-point-filled me-1"></i>
                          {st.label}
                        </span>
                      </td>
                      <td>
                        <div className="action-icon d-inline-flex align-items-center gap-2">
                          <Link
                            href={`/hr/assets/${asset.id}`}
                            title="View Asset Details"
                            className="text-secondary"
                          >
                            <i className="ti ti-eye"></i>
                          </Link>
                          <button
                            type="button"
                            title="Delete Asset"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete asset "${asset.name}" (${asset.assetTag})?`
                                )
                              ) {
                                deleteMutation.mutate(asset.id);
                              }
                            }}
                            className="border-0 bg-transparent text-danger p-0"
                          >
                            <i className="ti ti-trash"></i>
                          </button>
                        </div>
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
  );
}
