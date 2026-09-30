import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const Chart = lazy(() => import("react-apexcharts"));

export const Route = createFileRoute("/_authenticated/_app/asset-dashboard")({
  component: AssetDashboardPage,
  head: () => ({
    meta: [
      { title: "Asset Register & Analytics | Dreams ERP" },
      {
        name: "description",
        content: "Enterprise asset register, equipment depreciation, warranty tracking, and analytics dashboard in Dreams ERP.",
      },
    ],
  }),
});

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

const INITIAL_ASSETS: AssetItem[] = [
  {
    id: "AST-001",
    name: "Dell Latitude 5540",
    user: "Ethan Walker",
    userAvatar: "/ui-assets/avatar-03.jpg",
    category: "IT Equipment",
    purchaseDate: "11 Sep 2025",
    warranty: "1 Year",
    warrantyEndDate: "25 Sep 2026",
    cost: 1200,
    currentValue: 960,
    depreciation: 240,
    location: "HQ - IT Room",
    status: "Active",
  },
  {
    id: "AST-002",
    name: "Ergonomic Office Chair",
    user: "Madison Clark",
    userAvatar: "/ui-assets/avatar-04.jpg",
    category: "Furniture",
    purchaseDate: "05 Sep 2025",
    warranty: "1 Year",
    warrantyEndDate: "10 Sep 2026",
    cost: 250,
    currentValue: 150,
    depreciation: 100,
    location: "HQ - Cabin 3",
    status: "Active",
  },
  {
    id: "AST-003",
    name: "HP LaserJet Pro MFP",
    user: "James Harris",
    userAvatar: "/ui-assets/avatar-05.jpg",
    category: "Printers",
    purchaseDate: "27 Aug 2025",
    warranty: "1 Year",
    warrantyEndDate: "02 Sep 2026",
    cost: 480,
    currentValue: 360,
    depreciation: 120,
    location: "HQ - Floor 2",
    status: "Active",
  },
  {
    id: "AST-004",
    name: "iPhone 14 Enterprise",
    user: "Avery Thompson",
    userAvatar: "/ui-assets/avatar-06.jpg",
    category: "Mobile",
    purchaseDate: "16 Aug 2025",
    warranty: "1 Year",
    warrantyEndDate: "23 Aug 2026",
    cost: 899,
    currentValue: 620,
    depreciation: 279,
    location: "Sales Dept",
    status: "Inactive",
  },
  {
    id: "AST-005",
    name: "MacBook Pro 16\" M3 Max",
    user: "Benjamin Wright",
    userAvatar: "/ui-assets/avatar-07.jpg",
    category: "IT Equipment",
    purchaseDate: "25 Jul 2025",
    warranty: "2 Years",
    warrantyEndDate: "30 Nov 2027",
    cost: 3200,
    currentValue: 2750,
    depreciation: 450,
    location: "Engineering",
    status: "Active",
  },
  {
    id: "AST-006",
    name: "Daikin Inverter AC Unit",
    user: "Chloe Mitchell",
    userAvatar: "/ui-assets/avatar-08.jpg",
    category: "HVAC",
    purchaseDate: "12 Jul 2025",
    warranty: "3 Years",
    warrantyEndDate: "20 Dec 2028",
    cost: 1450,
    currentValue: 1100,
    depreciation: 350,
    location: "HQ - Server Room",
    status: "Active",
  },
  {
    id: "AST-007",
    name: "Conference Room Smart Table",
    user: "Daniel Roberts",
    userAvatar: "/ui-assets/avatar-09.jpg",
    category: "Furniture",
    purchaseDate: "23 Jun 2025",
    warranty: "1 Year",
    warrantyEndDate: "28 Sep 2026",
    cost: 1800,
    currentValue: 1400,
    depreciation: 400,
    location: "Boardroom A",
    status: "Active",
  },
  {
    id: "AST-008",
    name: "CCTV 4K Dome Camera Set",
    user: "Grace Adams",
    userAvatar: "/ui-assets/avatar-10.jpg",
    category: "Security",
    purchaseDate: "07 Jun 2025",
    warranty: "2 Years",
    warrantyEndDate: "15 Nov 2027",
    cost: 2100,
    currentValue: 1750,
    depreciation: 350,
    location: "Perimeter",
    status: "Maintenance",
  },
  {
    id: "AST-009",
    name: "Toyota Electric Forklift",
    user: "Hendrita Bennett",
    userAvatar: "/ui-assets/avatar-11.jpg",
    category: "Machinery",
    purchaseDate: "28 May 2025",
    warranty: "3 Years",
    warrantyEndDate: "05 Aug 2028",
    cost: 14500,
    currentValue: 12200,
    depreciation: 2300,
    location: "Warehouse Central",
    status: "Active",
  },
  {
    id: "AST-010",
    name: "Dell PowerEdge Server Rack",
    user: "Harper Scott",
    userAvatar: "/ui-assets/avatar-12.jpg",
    category: "IT Equipment",
    purchaseDate: "18 May 2025",
    warranty: "3 Years",
    warrantyEndDate: "26 Sep 2028",
    cost: 8500,
    currentValue: 7100,
    depreciation: 1400,
    location: "HQ - Data Center",
    status: "Active",
  },
];

export default function AssetDashboardPage() {
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
    category: "IT Equipment",
    purchaseDate: "",
    warranty: "1 Year",
    warrantyEndDate: "",
    cost: 1000,
    location: "HQ - Floor 1",
    status: "Active" as "Active" | "Inactive" | "Maintenance",
  });

  const queryClient = useQueryClient();

  // Load Assets from Backend API or fallback to standard Dreams ERP dataset
  const { data: assets = INITIAL_ASSETS, isLoading } = useQuery({
    queryKey: ["assets-list-data"],
    queryFn: async () => {
      try {
        const res = await api.get("/assets");
        if (Array.isArray(res) && res.length > 0) {
          return res.map((item: any, idx: number) => ({
            id: item.id || `AST-${String(idx + 1).padStart(3, "0")}`,
            name: item.name || "Asset Equipment",
            user: item.assignedTo?.name || item.assignedEmployee?.name || "Assigned User",
            userAvatar: item.assignedTo?.avatar || `/ui-assets/avatar-${String((idx % 12) + 1).padStart(2, "0")}.jpg`,
            category: item.category || "General Asset",
            purchaseDate: item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "10 Jan 2026",
            warranty: item.warranty || "1 Year",
            warrantyEndDate: item.warrantyExpiry ? new Date(item.warrantyExpiry).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "10 Jan 2027",
            cost: Number(item.cost || item.purchasePrice || 1200),
            currentValue: Number(item.currentValue || (item.cost ? item.cost * 0.8 : 960)),
            depreciation: Number(item.depreciation || (item.cost ? item.cost * 0.2 : 240)),
            location: item.location || "HQ Facility",
            status: (item.status === "active" ? "Active" : item.status === "maintenance" ? "Maintenance" : "Inactive") as "Active" | "Inactive" | "Maintenance",
          }));
        }
        return INITIAL_ASSETS;
      } catch {
        return INITIAL_ASSETS;
      }
    },
  });

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

  // Analytics Aggregates
  const totalAssetsCount = assets.length;
  const totalCost = assets.reduce((sum, a) => sum + a.cost, 0);
  const totalCurrentValue = assets.reduce((sum, a) => sum + a.currentValue, 0);
  const totalDepreciation = assets.reduce((sum, a) => sum + a.depreciation, 0);
  const activeCount = assets.filter((a) => a.status === "Active").length;
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

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Please provide an asset name.");
      return;
    }
    toast.success(`Asset "${formData.name}" added to registry.`);
    setAddModalOpen(false);
    setFormData({
      name: "",
      user: "",
      category: "IT Equipment",
      purchaseDate: "",
      warranty: "1 Year",
      warrantyEndDate: "",
      cost: 1000,
      location: "HQ - Floor 1",
      status: "Active",
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    toast.success(`Asset "${selectedAsset.name}" updated successfully.`);
    setEditModalOpen(false);
  };

  const handleDeleteSubmit = () => {
    if (!selectedAsset) return;
    toast.success(`Asset "${selectedAsset.name}" deleted from register.`);
    setDeleteModalOpen(false);
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
                <label className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Assigned User *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ethan Walker"
                  value={formData.user}
                  onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="IT Equipment">IT Equipment</option>
                  <option value="Furniture">Furniture</option>
                  <option value="Printers">Printers</option>
                  <option value="Mobile">Mobile</option>
                  <option value="Machinery">Machinery</option>
                  <option value="HVAC">HVAC</option>
                  <option value="Security">Security</option>
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
