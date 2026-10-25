import { Link } from "@/lib/router-compat";
import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapArray, unwrapData } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const Chart = lazy(() => import("react-apexcharts"));


interface AssetItem {
  id: string;
  name: string;
  user: string;
  userAvatar: string;
  category: string;
  purchaseDate: string;
  warranty: string;
  warrantyEndDate: string;
  cost: number;
  currentValue: number;
  depreciation: number;
  location: string;
  status: "Active" | "Inactive" | "Maintenance";
}

export function AssetDashboardView() {
  const [activeTab, setActiveTab] = useState<"register" | "analytics">("register");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [exportOpen, setExportOpen] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  // Modal States
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    user: "",
    employeeId: "",
    category: "IT Equipment",
    purchaseDate: "",
    warranty: "1 Year",
    warrantyEndDate: "",
    cost: 1000,
    location: "HQ - Floor 1",
    status: "Active" as "Active" | "Inactive" | "Maintenance",
  });

  const queryClient = useQueryClient();

  // Load Assets from Backend API
  const { data: rawAssets = [], isLoading, isError, error } = useQuery({
    queryKey: ["assets-list-data"],
    queryFn: async () => {
      const res = await api.get("/hr/assets");
      return unwrapArray(res);
    },
  });

  // Load Overview Aggregates
  const { data: overviewData } = useQuery({
    queryKey: ["assets-overview-data"],
    queryFn: async () => {
      const res = await api.get("/hr/assets/overview");
      return unwrapData(res);
    },
  });

  // Load Asset Categories
  const { data: rawCategories = [] } = useQuery({
    queryKey: ["assets-categories-data"],
    queryFn: async () => {
      const res = await api.get("/hr/assets/types");
      return unwrapArray(res);
    },
  });

  // Load Employees for assignment dropdown
  const { data: rawEmployees = [] } = useQuery({
    queryKey: ["assets-employees-list"],
    queryFn: async () => {
      const res = await api.get("/employees");
      return unwrapArray(res);
    },
  });

  const assets: AssetItem[] = useMemo(() => {
    if (!rawAssets || !Array.isArray(rawAssets) || rawAssets.length === 0) return [];
    return rawAssets.map((item: any, idx: number) => {
      const assignedEmp = item.assignedEmployee;
      const assignedName = assignedEmp
        ? `${assignedEmp.firstName || ""} ${assignedEmp.lastName || ""}`.trim() || assignedEmp.email
        : (item.assignedTo?.name || "Unassigned");

      return {
        id: item.id || item.assetTag || `AST-${String(idx + 1).padStart(3, "0")}`,
        name: item.name || "Asset Equipment",
        user: assignedName,
        userAvatar: item.assignedTo?.avatar || `/ui-assets/avatar-${String((idx % 12) + 1).padStart(2, "0")}.jpg`,
        category: item.categoryRel?.name || item.category || "General Asset",
        purchaseDate: item.purchaseDate
          ? new Date(item.purchaseDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : "—",
        warranty: item.warranty || "1 Year",
        warrantyEndDate: item.warrantyExpiry
          ? new Date(item.warrantyExpiry).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : "—",
        cost: Number(item.purchasePrice || item.cost || 0),
        currentValue: Number(item.currentValue || (item.purchasePrice ? Number(item.purchasePrice) * 0.8 : 0)),
        depreciation: Number(item.depreciation || (item.purchasePrice ? Number(item.purchasePrice) * 0.2 : 0)),
        location: item.location || "HQ Facility",
        status: (item.status === "available" || item.status === "Active" || item.status === "assigned"
          ? "Active"
          : item.status === "maintenance"
          ? "Maintenance"
          : "Inactive") as "Active" | "Inactive" | "Maintenance",
      };
    });
  }, [rawAssets]);

  // Filter and sort items
  const filteredAssets = useMemo(() => {
    return assets
      .filter((asset) => {
        const matchesSearch =
          asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          asset.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
          asset.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          asset.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === "all" || asset.category === categoryFilter;
        const matchesStatus = statusFilter === "all" || asset.status === statusFilter;
        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "az") return a.name.localeCompare(b.name);
        if (sortBy === "za") return b.name.localeCompare(a.name);
        if (sortBy === "high") return b.cost - a.cost;
        if (sortBy === "low") return a.cost - b.cost;
        return 0; // default order
      });
  }, [assets, searchQuery, categoryFilter, statusFilter, sortBy]);

  // Analytics Aggregates (Synchronized with backend overview aggregates)
  const totalAssetsCount = (overviewData as any)?.totalAssets ?? assets.length;
  const totalCost = (overviewData as any)?.totalValue ?? assets.reduce((sum, a) => sum + a.cost, 0);
  const totalCurrentValue = (overviewData as any)?.currentValue ?? assets.reduce((sum, a) => sum + a.currentValue, 0);
  const totalDepreciation = (overviewData as any)?.totalDepreciation ?? assets.reduce((sum, a) => sum + a.depreciation, 0);
  const activeCount = (overviewData as any)?.activeAssets ?? assets.filter((a) => a.status === "Active").length;
  const utilizationRate = Math.round((activeCount / (totalAssetsCount || 1)) * 100);

  // Handle Export
  const handleExport = (format: "pdf" | "excel") => {
    try {
      const csvContent = [
        ["Asset ID", "Asset Name", "Category", "User", "Purchase Date", "Cost", "Current Value", "Status"],
        ...filteredAssets.map((a) => [
          a.id,
          a.name,
          a.category,
          a.user,
          a.purchaseDate,
          `$${a.cost}`,
          `$${a.currentValue}`,
          a.status,
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Asset_Register_${new Date().toISOString().split("T")[0]}.${format === "excel" ? "csv" : "txt"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Asset Register exported successfully as ${format.toUpperCase()}`);
    } catch {
      toast.error("Failed to export Asset Register.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Live Mutations
  const createAssetMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const matchedCat = (rawCategories as any[]).find(
        (c) => c.name?.toLowerCase() === data.category?.toLowerCase() || c.id === data.category
      );
      const categoryId = matchedCat?.id;

      const payload = {
        name: data.name,
        categoryId: categoryId || undefined,
        purchasePrice: data.cost,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate).toISOString() : new Date().toISOString(),
        warrantyExpiry: data.warrantyEndDate ? new Date(data.warrantyEndDate).toISOString() : undefined,
        location: data.location || "HQ - Floor 1",
        status: data.status === "Active" ? "available" : data.status.toLowerCase(),
      };

      const res = await api.post("/hr/assets", payload);
      const createdAsset = unwrapData(res);

      if (data.employeeId && createdAsset?.id) {
        try {
          await api.post(`/hr/assets/${createdAsset.id}/assign`, {
            employeeId: data.employeeId,
            assignmentDate: new Date().toISOString(),
          });
        } catch (assignErr) {
          console.warn("Auto-assignment after asset creation failed:", assignErr);
        }
      }

      return createdAsset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets-list-data"] });
      queryClient.invalidateQueries({ queryKey: ["assets-overview-data"] });
      toast.success(`Asset "${formData.name}" added to registry successfully.`);
      setAddModalOpen(false);
      setFormData({
        name: "",
        user: "",
        employeeId: "",
        category: "IT Equipment",
        purchaseDate: "",
        warranty: "1 Year",
        warrantyEndDate: "",
        cost: 1000,
        location: "HQ - Floor 1",
        status: "Active",
      });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to create asset.");
    },
  });

  const updateAssetMutation = useMutation({
    mutationFn: async (asset: AssetItem) => {
      const payload = {
        name: asset.name,
        status: asset.status === "Active" ? "available" : asset.status.toLowerCase(),
      };
      const res = await api.put(`/hr/assets/${asset.id}`, payload);
      return unwrapData(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets-list-data"] });
      queryClient.invalidateQueries({ queryKey: ["assets-overview-data"] });
      toast.success("Asset updated successfully.");
      setEditModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update asset.");
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const res = await api.delete(`/hr/assets/${assetId}`);
      return unwrapData(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets-list-data"] });
      queryClient.invalidateQueries({ queryKey: ["assets-overview-data"] });
      toast.success("Asset deleted successfully.");
      setDeleteModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to delete asset.");
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Please provide an asset name.");
      return;
    }
    createAssetMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    updateAssetMutation.mutate(selectedAsset);
  };

  const handleDeleteSubmit = () => {
    if (!selectedAsset) return;
    deleteAssetMutation.mutate(selectedAsset.id);
  };

  // ApexCharts Configurations for Asset Analytics
  const purchaseTrendChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: "area",
        height: 260,
        toolbar: { show: false },
      },
      colors: ["#F97316", "#3B82F6"],
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.35,
          opacityTo: 0.05,
          stops: [0, 100],
        },
      },
      stroke: { curve: "smooth", width: 2 },
      series: [
        { name: "Acquisition Cost", data: [1800, 2600, 4500, 7600, 6900, 7600, 6200, 8000, 7300, 5400, 6000, 5400] },
        { name: "Depreciated Value", data: [1400, 2100, 3800, 6200, 5500, 6100, 5000, 6400, 5900, 4200, 4800, 4300] },
      ],
      xaxis: {
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        labels: { style: { colors: "#94A3B8", fontSize: "11px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { colors: "#94A3B8", fontSize: "11px" },
          formatter: (v) => "$" + v,
        },
      },
      grid: { borderColor: "var(--color-border-color, #E2E8F0)", strokeDashArray: 4 },
      legend: { position: "top", horizontalAlign: "right" },
      dataLabels: { enabled: false },
    }),
    []
  );

  const deptBarChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "bar", height: 260, toolbar: { show: false } },
      colors: ["#4F46E5"],
      plotOptions: {
        bar: { horizontal: true, barHeight: "50%", borderRadius: 4 },
      },
      series: [
        {
          name: "Assets Deployed",
          data: [42, 28, 19, 15, 12, 8],
        },
      ],
      xaxis: {
        categories: ["Engineering", "Sales & Marketing", "Finance & Admin", "Operations", "HR & Talent", "Executive"],
        labels: { style: { colors: "#94A3B8", fontSize: "11px" } },
      },
      yaxis: {
        labels: { style: { colors: "#94A3B8", fontSize: "11px" } },
      },
      grid: { borderColor: "var(--color-border-color, #E2E8F0)", strokeDashArray: 4 },
      dataLabels: { enabled: false },
    }),
    []
  );

  return (
    <div className="p-0">
      {/* ── Page Header (matching ui/asset-register.html lines 1272-1293) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 lg:mb-6">
        <div>
          <BreadcrumbNav />
          <h1 className="text-gray-900 dark:text-gray-100 text-xl font-bold mb-1">
            {activeTab === "register" ? "Asset Register" : "Asset Analytics"}
          </h1>
          <p className="text-sm text-default mb-0">
            {activeTab === "register"
              ? "Comprehensive hardware, equipment, and facility assets registry with warranty and depreciation tracking."
              : "Capital expenditure, asset valuation, depreciation schedules, and departmental allocation."}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Tab Switcher */}
          <div className="inline-flex bg-white dark:bg-slate-800 border border-border-color rounded-md p-1">
            <button
              type="button"
              onClick={() => setActiveTab("register")}
              className={cn(
                "btn-sm inline-flex items-center gap-1.5 cursor-pointer font-medium text-xs px-3 py-1.5 rounded",
                activeTab === "register"
                  ? "bg-dark text-white dark:bg-primary"
                  : "bg-transparent text-gray-700 dark:text-gray-300 hover:bg-light dark:hover:bg-slate-700"
              )}
            >
              <i className="ph-duotone ph-list-dashes text-sm"></i>
              <span>Asset Register</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("analytics")}
              className={cn(
                "btn-sm inline-flex items-center gap-1.5 cursor-pointer font-medium text-xs px-3 py-1.5 rounded",
                activeTab === "analytics"
                  ? "bg-dark text-white dark:bg-primary"
                  : "bg-transparent text-gray-700 dark:text-gray-300 hover:bg-light dark:hover:bg-slate-700"
              )}
            >
              <i className="ph-duotone ph-chart-bar text-sm"></i>
              <span>Asset Analytics</span>
            </button>
          </div>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 inline-flex items-center gap-2 hover:bg-light dark:hover:bg-slate-700 cursor-pointer shadow-xs transition-colors"
          >
            <i className="ph-duotone ph-printer"></i>
            <span>Print</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative inline-flex">
            <button
              type="button"
              onClick={() => setExportOpen((o) => !o)}
              className="cursor-pointer btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 inline-flex items-center gap-2 hover:bg-primary hover:border-primary hover:text-white transition-colors shadow-xs"
            >
              <i className="ph-duotone ph-download-simple font-normal"></i> Export{" "}
              <i className="ph-bold ph-caret-down text-xs"></i>
            </button>

            {exportOpen && (
              <div className="absolute right-0 top-full mt-2 min-w-44 bg-white dark:bg-slate-900 border border-border-color shadow-lg rounded-md p-2 space-y-1 z-30">
                <button
                  type="button"
                  onClick={() => {
                    handleExport("pdf");
                    setExportOpen(false);
                  }}
                  className="w-full text-left flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-800 cursor-pointer"
                >
                  Export as PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleExport("excel");
                    setExportOpen(false);
                  }}
                  className="w-full text-left flex items-center px-2 py-1.5 rounded-md text-xs text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-800 cursor-pointer"
                >
                  Export as Excel (CSV)
                </button>
              </div>
            )}
          </div>

          {/* Add New Asset Button */}
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="btn-sm bg-dark text-white border border-dark inline-flex items-center gap-2 hover:bg-primary-hover hover:border-primary-hover cursor-pointer shadow-xs transition-colors"
          >
            <i className="ph ph-plus"></i>
            <span>Add Asset</span>
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards (matching ui/asset-analytics.html) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        {/* Total Assets */}
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-default mb-1">Total Assets</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">{totalAssetsCount}</h3>
            <span className="text-[11px] text-success font-medium inline-flex items-center mt-1">
              <i className="ph ph-arrow-up text-[10px] me-1"></i> +8.5% YoY
            </span>
          </div>
          <div className="size-10 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center shrink-0">
            <i className="ph-duotone ph-desktop text-xl"></i>
          </div>
        </div>

        {/* Acquisition Cost */}
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-default mb-1">Purchase Cost</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">
              ${totalCost.toLocaleString()}
            </h3>
            <span className="text-[11px] text-default font-medium inline-flex items-center mt-1">
              Gross Capital Outlay
            </span>
          </div>
          <div className="size-10 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
            <i className="ph-duotone ph-money text-xl"></i>
          </div>
        </div>

        {/* Current Book Value */}
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-default mb-1">Current Book Value</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">
              ${totalCurrentValue.toLocaleString()}
            </h3>
            <span className="text-[11px] text-info font-medium inline-flex items-center mt-1">
              Net Capital Assets
            </span>
          </div>
          <div className="size-10 rounded-md bg-sky-50 dark:bg-sky-950/40 text-sky-600 flex items-center justify-center shrink-0">
            <i className="ph-duotone ph-chart-line-up text-xl"></i>
          </div>
        </div>

        {/* Accumulated Depreciation */}
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-default mb-1">Depreciation</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">
              ${totalDepreciation.toLocaleString()}
            </h3>
            <span className="text-[11px] text-amber-600 font-medium inline-flex items-center mt-1">
              Straight-Line Amort.
            </span>
          </div>
          <div className="size-10 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0">
            <i className="ph-duotone ph-trend-down text-xl"></i>
          </div>
        </div>

        {/* Utilization Rate */}
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-default mb-1">Active Utilization</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">{utilizationRate}%</h3>
            <span className="text-[11px] text-success font-medium inline-flex items-center mt-1">
              {activeCount} Active in Service
            </span>
          </div>
          <div className="size-10 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center shrink-0">
            <i className="ph-duotone ph-check-circle text-xl"></i>
          </div>
        </div>
      </div>

      {activeTab === "analytics" ? (
        /* ── Asset Analytics View (Charts) ── */
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Purchase & Depreciation Trend */}
            <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 lg:col-span-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-0">
                  Asset Value & Depreciation Trend (2025 - 2026)
                </h3>
                <span className="text-xs text-default">Monthly Schedule</span>
              </div>
              <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-default">Loading chart...</div>}>
                <Chart options={purchaseTrendChartOptions} series={purchaseTrendChartOptions.series} type="area" height={260} />
              </Suspense>
            </div>

            {/* Department Breakdown */}
            <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 lg:col-span-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-0">
                  Deployment by Department
                </h3>
                <span className="text-xs text-default">Units</span>
              </div>
              <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-default">Loading chart...</div>}>
                <Chart options={deptBarChartOptions} series={deptBarChartOptions.series} type="bar" height={260} />
              </Suspense>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Asset Register Table Container (matching ui/asset-register.html lines 1294-1702) ── */}
      <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 mt-4">
        {/* Table Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative w-64 search-input">
              <i className="ph ph-magnifying-glass absolute right-2.5 top-1/2 -translate-y-1/2 text-default text-sm pointer-events-none"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 pe-8 py-1.5 h-8 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Search assets, users, categories..."
              />
            </div>

            {/* Date Range Picker */}
            <div className="relative rangepicker-input w-[180px] h-[32px] leading-none">
              <span className="absolute inset-y-0 left-0 flex items-center px-2.5 text-muted-foreground text-xs pointer-events-none">
                <i className="ph-duotone ph-calendar text-sm"></i>
              </span>
              <input
                type="text"
                readOnly
                className="text-xs h-[32px] inline-block w-full bg-white dark:bg-slate-800 border border-border-color rounded-md focus:ring-0 pl-8 pr-2 cursor-pointer font-medium text-title"
                value="01 Jan 26 - 31 Dec 26"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Dropdown */}
            <div className="relative inline-flex">
              <button
                type="button"
                onClick={() => setFilterDropdownOpen((o) => !o)}
                className="cursor-pointer btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 inline-flex items-center gap-2 hover:bg-primary hover:border-primary hover:text-white transition-colors"
              >
                <i className="ph-duotone ph-funnel font-normal"></i> Filter{" "}
                <i className="ph-bold ph-caret-down text-xs"></i>
              </button>

              {filterDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 min-w-56 bg-white dark:bg-slate-900 border border-border-color shadow-lg rounded-md p-3 space-y-2 z-30">
                  <p className="text-xs font-bold text-title mb-1">Filter by Category</p>
                  {["all", "IT Equipment", "Furniture", "Printers", "Mobile", "Machinery"].map((cat) => (
                    <label key={cat} className="flex items-center gap-2 text-xs cursor-pointer text-gray-800 dark:text-gray-200">
                      <input
                        type="radio"
                        name="catFilter"
                        checked={categoryFilter === cat}
                        onChange={() => {
                          setCategoryFilter(cat);
                          setFilterDropdownOpen(false);
                        }}
                        className="size-3.5 rounded border-border-color text-primary focus:ring-0"
                      />
                      <span>{cat === "all" ? "All Categories" : cat}</span>
                    </label>
                  ))}
                  <div className="border-t border-border-color pt-2 mt-2">
                    <p className="text-xs font-bold text-title mb-1">Filter by Status</p>
                    {["all", "Active", "Inactive", "Maintenance"].map((st) => (
                      <label key={st} className="flex items-center gap-2 text-xs cursor-pointer text-gray-800 dark:text-gray-200">
                        <input
                          type="radio"
                          name="stFilter"
                          checked={statusFilter === st}
                          onChange={() => {
                            setStatusFilter(st);
                            setFilterDropdownOpen(false);
                          }}
                          className="size-3.5 rounded border-border-color text-primary focus:ring-0"
                        />
                        <span>{st === "all" ? "All Status" : st}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative inline-flex">
              <button
                type="button"
                onClick={() => setSortDropdownOpen((o) => !o)}
                className="cursor-pointer btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 inline-flex items-center gap-2 hover:bg-primary hover:border-primary hover:text-white transition-colors"
              >
                <i className="ph-duotone ph-arrows-down-up font-normal"></i> Sort By{" "}
                <i className="ph-bold ph-caret-down text-xs"></i>
              </button>

              {sortDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 min-w-44 bg-white dark:bg-slate-900 border border-border-color shadow-lg rounded-md p-2 space-y-1 z-30">
                  {[
                    { label: "Newest First", value: "newest" },
                    { label: "Asset Name: A - Z", value: "az" },
                    { label: "Asset Name: Z - A", value: "za" },
                    { label: "Purchase Cost: High", value: "high" },
                    { label: "Purchase Cost: Low", value: "low" },
                  ].map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => {
                        setSortBy(s.value);
                        setSortDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors",
                        sortBy === s.value
                          ? "bg-primary text-white"
                          : "text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-800"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["assets-list-data"] });
                toast.success("Asset register refreshed.");
              }}
              className="size-8 rounded-md border border-border-color bg-white dark:bg-slate-800 flex items-center justify-center text-default hover:bg-light dark:hover:bg-slate-700 cursor-pointer shadow-xs transition-colors"
              title="Refresh Register"
            >
              <i className="ph ph-arrow-clockwise"></i>
            </button>
          </div>
        </div>

        {/* ── Table Content (matching ui/asset-register.html lines 1358-1683) ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-default border-b border-border-color bg-slate-50/50 dark:bg-slate-800/40">
                <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Asset Name</th>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Asset User</th>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Category</th>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Purchase Date</th>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Warranty</th>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Warranty End Date</th>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Book Value</th>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Status</th>
                <th className="text-right py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-sm text-default">
                    No asset records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr key={asset.id} className="border-b border-border-color hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-3">
                      <div>
                        <p className="text-sm font-semibold text-title leading-tight mb-0.5">{asset.name}</p>
                        <span className="text-[11px] text-muted-foreground font-mono">{asset.id}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={asset.userAvatar}
                          alt={asset.user}
                          className="size-7 rounded-full object-cover shrink-0 border border-border-color"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/ui-assets/avatar-01.jpg";
                          }}
                        />
                        <span className="text-sm text-gray-900 dark:text-gray-100 font-medium">{asset.user}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-sm text-default">{asset.category}</td>
                    <td className="py-3 px-3 text-sm text-default">{asset.purchaseDate}</td>
                    <td className="py-3 px-3 text-sm text-default">{asset.warranty}</td>
                    <td className="py-3 px-3 text-sm text-default">{asset.warrantyEndDate}</td>
                    <td className="py-3 px-3">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0">${asset.currentValue.toLocaleString()}</p>
                      <span className="text-[10px] text-muted-foreground">Original: ${asset.cost.toLocaleString()}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={cn(
                          "text-[11px] font-medium px-2 py-0.5 rounded inline-block",
                          asset.status === "Active" && "bg-success-transparent text-success",
                          asset.status === "Inactive" && "bg-danger-transparent text-danger",
                          asset.status === "Maintenance" && "bg-warning-transparent text-warning"
                        )}
                      >
                        {asset.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right relative">
                      <div className="relative inline-flex">
                        <button
                          type="button"
                          onClick={() => setActionMenuOpen(actionMenuOpen === asset.id ? null : asset.id)}
                          className="size-7 rounded-md border border-border-color bg-white dark:bg-slate-800 text-default hover:bg-light dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer shadow-2xs"
                        >
                          <i className="ph-bold ph-dots-three-vertical text-sm"></i>
                        </button>

                        {actionMenuOpen === asset.id && (
                          <div className="absolute right-0 top-full mt-1 min-w-36 bg-white dark:bg-slate-900 border border-border-color shadow-lg rounded-md p-1.5 space-y-1 z-30 text-left">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAsset(asset);
                                setActionMenuOpen(null);
                                setEditModalOpen(true);
                              }}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <i className="ph-duotone ph-pencil-simple text-sm"></i>
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAsset(asset);
                                setActionMenuOpen(null);
                                setDeleteModalOpen(true);
                              }}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-danger hover:bg-light dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <i className="ph-duotone ph-trash text-sm"></i>
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Pagination (matching ui/asset-register.html lines 1685-1702) ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-2 border-t border-border-color">
          <div className="flex items-center gap-2">
            <span className="text-xs text-default">Showing {filteredAssets.length} of {assets.length} items</span>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" className="size-7 rounded-md text-xs bg-dark text-white flex items-center justify-center">1</button>
            <button type="button" className="size-7 rounded-md text-xs text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-800 flex items-center justify-center">2</button>
            <button type="button" className="size-7 rounded-md text-xs border border-border-color flex items-center justify-center text-default hover:bg-light dark:hover:bg-slate-800 ml-1">
              <i className="ph ph-caret-left text-xs"></i>
            </button>
            <button type="button" className="size-7 rounded-md text-xs border border-border-color flex items-center justify-center text-default hover:bg-light dark:hover:bg-slate-800">
              <i className="ph ph-caret-right text-xs"></i>
            </button>
          </div>
        </div>
      </div>

      {/* ── Add Asset Dialog Modal (matching ui/asset-register.html lines 1718-1768) ── */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden bg-white dark:bg-slate-900 border border-border-color">
          <DialogHeader className="p-4 border-b border-border-color">
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100">Add New Asset</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Asset Name *</label>
                <input
                  type="text"
                  required
                  placeholder='e.g. MacBook Pro 16"'
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Assigned Employee / User</label>
                {rawEmployees && (rawEmployees as any[]).length > 0 ? (
                  <select
                    value={formData.employeeId}
                    onChange={(e) => {
                      const empId = e.target.value;
                      const emp = (rawEmployees as any[]).find((em) => em.id === empId);
                      setFormData({
                        ...formData,
                        employeeId: empId,
                        user: emp ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.email : "",
                      });
                    }}
                    className="w-full px-3 py-2 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- Unassigned (Inventory) --</option>
                    {(rawEmployees as any[]).map((emp: any) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName ? `${emp.firstName} ${emp.lastName || ""}`.trim() : emp.email} ({emp.employeeId || emp.email})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. Ethan Walker (Optional)"
                    value={formData.user}
                    onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {rawCategories && (rawCategories as any[]).length > 0 ? (
                    (rawCategories as any[]).map((c: any) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))
                  ) : (
                    <>
                      <option value="IT Equipment">IT Equipment</option>
                      <option value="Furniture">Furniture</option>
                      <option value="Printers">Printers</option>
                      <option value="Mobile">Mobile</option>
                      <option value="Machinery">Machinery</option>
                      <option value="HVAC">HVAC</option>
                      <option value="Security">Security</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Purchase Cost ($)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Warranty Period</label>
                <input
                  type="text"
                  placeholder="e.g. 1 Year / 3 Years"
                  value={formData.warranty}
                  onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
            </div>

            <DialogFooter className="border-t border-border-color pt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 hover:bg-light cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-sm bg-dark text-white border border-dark hover:bg-primary-hover hover:border-primary-hover cursor-pointer"
              >
                Create Asset
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Asset Dialog Modal ── */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-white dark:bg-slate-900 border border-border-color">
          <DialogHeader className="p-4 border-b border-border-color">
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100">
              Edit Asset - {selectedAsset?.id}
            </DialogTitle>
          </DialogHeader>

          {selectedAsset && (
            <form onSubmit={handleEditSubmit} className="p-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Asset Name</label>
                <input
                  type="text"
                  required
                  value={selectedAsset.name}
                  onChange={(e) => setSelectedAsset({ ...selectedAsset, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Assigned User</label>
                <input
                  type="text"
                  required
                  value={selectedAsset.user}
                  onChange={(e) => setSelectedAsset({ ...selectedAsset, user: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Status</label>
                <select
                  value={selectedAsset.status}
                  onChange={(e) => setSelectedAsset({ ...selectedAsset, status: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>

              <DialogFooter className="border-t border-border-color pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 hover:bg-light cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-sm bg-dark text-white border border-dark hover:bg-primary-hover cursor-pointer"
                >
                  Save Changes
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Asset Confirmation Modal ── */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-sm p-4 text-center bg-white dark:bg-slate-900 border border-border-color">
          <div className="size-12 rounded-full bg-danger-transparent text-danger mx-auto flex items-center justify-center mb-3">
            <i className="ph-duotone ph-warning text-2xl"></i>
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">Delete Asset?</h3>
          <p className="text-xs text-default mb-4">
            Are you sure you want to delete <strong className="text-gray-900 dark:text-gray-100">{selectedAsset?.name}</strong> ({selectedAsset?.id}) from the asset register? This action cannot be undone.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 hover:bg-light cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteSubmit}
              className="btn-sm bg-danger text-white border border-danger hover:bg-danger/90 cursor-pointer"
            >
              Confirm Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AssetDashboardView;

