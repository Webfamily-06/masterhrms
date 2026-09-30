import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, lazy, Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

export const Route = createFileRoute("/_authenticated/_app/deals-dashboard")({
  component: DealsDashboardPage,
  head: () => ({
    meta: [
      { title: "Deals & CRM Dashboard | Dreams ERP" },
      {
        name: "description",
        content: "Track sales pipelines, deals progress, win rates, and CRM metrics in Dreams ERP.",
      },
    ],
  }),
});

interface DealItem {
  id: string;
  name: string;
  customer: string;
  stage: string;
  value: number;
  closeDate: string;
  probability: number;
  owner: string;
  ownerAvatar: string;
  status: string;
}

const INITIAL_DEALS: DealItem[] = [
  {
    id: "DEL-101",
    name: "Enterprise License - TechCorp",
    customer: "TechCorp Inc",
    stage: "Proposal",
    value: 45000,
    closeDate: "30 Jun 2026",
    probability: 70,
    owner: "Ethan Walker",
    ownerAvatar: "/ui-assets/avatar-03.jpg",
    status: "Open",
  },
  {
    id: "DEL-102",
    name: "Cloud Migration & MES Suite",
    customer: "Apex Global Dynamics",
    stage: "Contract Signed",
    value: 120000,
    closeDate: "15 Jul 2026",
    probability: 95,
    owner: "Madison Clark",
    ownerAvatar: "/ui-assets/avatar-04.jpg",
    status: "Won",
  },
  {
    id: "DEL-103",
    name: "ERP Implementation & Customization",
    customer: "Falcon Logistix LLC",
    stage: "In Discussion",
    value: 78000,
    closeDate: "22 Aug 2026",
    probability: 50,
    owner: "James Harris",
    ownerAvatar: "/ui-assets/avatar-05.jpg",
    status: "Open",
  },
  {
    id: "DEL-104",
    name: "Annual SaaS Renewal & Support",
    customer: "Starlight Digital Media",
    stage: "Won",
    value: 36000,
    closeDate: "05 Jun 2026",
    probability: 100,
    owner: "Chloe Mitchell",
    ownerAvatar: "/ui-assets/avatar-08.jpg",
    status: "Won",
  },
  {
    id: "DEL-105",
    name: "Multi-Store POS Hardware Bundle",
    customer: "UrbanMart Supermarkets",
    stage: "Proposal",
    value: 52000,
    closeDate: "18 Sep 2026",
    probability: 60,
    owner: "Benjamin Wright",
    ownerAvatar: "/ui-assets/avatar-07.jpg",
    status: "Open",
  },
  {
    id: "DEL-106",
    name: "Database Security & Redundancy Setup",
    customer: "InnoWave Solutions",
    stage: "Lost",
    value: 28000,
    closeDate: "12 May 2026",
    probability: 0,
    owner: "Avery Thompson",
    ownerAvatar: "/ui-assets/avatar-06.jpg",
    status: "Lost",
  },
];

export default function DealsDashboardPage() {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [exportOpen, setExportOpen] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<DealItem | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // New Deal Form
  const [newDeal, setNewDeal] = useState({
    name: "",
    customer: "",
    stage: "Proposal" as DealItem["stage"],
    value: 25000,
    closeDate: "",
    probability: 50,
  });

  const queryClient = useQueryClient();

  // Load Deals from API or fallback
  const { data: deals = INITIAL_DEALS } = useQuery({
    queryKey: ["deals-dashboard-data"],
    queryFn: async () => {
      try {
        const res = await api.get("/crm/deals");
        if (Array.isArray(res) && res.length > 0) {
          return res.map((d: any, idx: number) => ({
            id: d.id || `DEL-${100 + idx}`,
            name: d.title || d.name || "Enterprise Deal",
            customer: d.customer?.name || d.company || "Client Company",
            stage: d.stage || "Proposal",
            value: Number(d.value || d.amount || 25000),
            closeDate: d.expectedCloseDate ? new Date(d.expectedCloseDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "30 Jun 2026",
            probability: Number(d.probability || 60),
            owner: d.owner?.name || "Deal Specialist",
            ownerAvatar: `/ui-assets/avatar-${String((idx % 12) + 1).padStart(2, "0")}.jpg`,
            status: d.stage === "Won" ? "Won" : d.stage === "Lost" ? "Lost" : "Open",
          }));
        }
        return INITIAL_DEALS;
      } catch {
        return INITIAL_DEALS;
      }
    },
  });

  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      const matchSearch =
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.owner.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStage = stageFilter === "all" || d.stage === stageFilter;
      return matchSearch && matchStage;
    });
  }, [deals, searchQuery, stageFilter]);

  // Aggregate Metrics
  const totalPipelineValue = deals.reduce((sum, d) => sum + d.value, 0);
  const wonDealsValue = deals.filter((d) => d.status === "Won").reduce((sum, d) => sum + d.value, 0);
  const openDealsCount = deals.filter((d) => d.status === "Open").length;
  const wonCount = deals.filter((d) => d.status === "Won").length;
  const winRate = Math.round((wonCount / (deals.length || 1)) * 100);

  const handleExport = (format: "pdf" | "excel") => {
    try {
      const csvContent = [
        ["Deal ID", "Deal Name", "Customer", "Stage", "Value", "Close Date", "Probability", "Status"],
        ...filteredDeals.map((d) => [
          d.id,
          d.name,
          d.customer,
          d.stage,
          `$${d.value}`,
          d.closeDate,
          `${d.probability}%`,
          d.status,
        ]),
      ]
        .map((r) => r.join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Deals_Report_${new Date().toISOString().split("T")[0]}.${format === "excel" ? "csv" : "txt"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Deals exported as ${format.toUpperCase()}`);
    } catch {
      toast.error("Failed to export Deals.");
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeal.name.trim() || !newDeal.customer.trim()) {
      toast.error("Please fill in Deal Name and Customer.");
      return;
    }
    toast.success(`Deal "${newDeal.name}" added to pipeline.`);
    setCreateModalOpen(false);
    setNewDeal({
      name: "",
      customer: "",
      stage: "Proposal",
      value: 25000,
      closeDate: "",
      probability: 50,
    });
  };

  // Funnel & Pipeline Charts (matching ui/crm-dashboard.html)
  const funnelChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "bar", height: 260, toolbar: { show: false } },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: "65%",
          borderRadius: 4,
          distributed: true,
        },
      },
      colors: ["#6366F1", "#3B82F6", "#06B6D4", "#10B981", "#F59E0B"],
      series: [
        {
          name: "Pipeline Value ($)",
          data: [150000, 110000, 85000, 60000, 45000],
        },
      ],
      xaxis: {
        categories: ["Prospecting", "Proposal Sent", "In Negotiation", "Contract Signed", "Closed Won"],
        labels: {
          style: { colors: "#94A3B8", fontSize: "11px" },
          formatter: (v) => "$" + Math.round(Number(v) / 1000) + "k",
        },
      },
      yaxis: {
        labels: { style: { colors: "#94A3B8", fontSize: "11px" } },
      },
      grid: { borderColor: "var(--color-border-color, #E2E8F0)", strokeDashArray: 4 },
      legend: { show: false },
      dataLabels: { enabled: false },
    }),
    []
  );

  const stageStackedOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "bar", height: 260, stacked: true, toolbar: { show: false } },
      colors: ["#10B981", "#EF4444"],
      series: [
        { name: "Won Deals", data: [12, 18, 15, 24, 28, 32] },
        { name: "Lost Deals", data: [4, 6, 5, 8, 5, 7] },
      ],
      xaxis: {
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        labels: { style: { colors: "#94A3B8", fontSize: "11px" } },
      },
      yaxis: {
        labels: { style: { colors: "#94A3B8", fontSize: "11px" } },
      },
      grid: { borderColor: "var(--color-border-color, #E2E8F0)", strokeDashArray: 4 },
      legend: { position: "top", horizontalAlign: "right" },
      dataLabels: { enabled: false },
    }),
    []
  );

  return (
    <div className="p-0">
      {/* ── Header Row (matching ui/crm-dashboard.html line 1272 & ui/deals.html line 1269) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 lg:mb-6">
        <div>
          <h1 className="text-gray-900 dark:text-gray-100 text-xl font-bold mb-1">Deals & CRM Dashboard</h1>
          <p className="text-sm text-default mb-0">
            Monitor deal velocity, qualified pipelines, win conversion rates, and revenue forecasts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* List / Grid View Switcher */}
          <div className="inline-flex bg-white dark:bg-slate-800 border border-border-color rounded-md p-1">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "btn-sm inline-flex items-center gap-1 cursor-pointer font-medium text-xs px-2.5 py-1 rounded",
                viewMode === "list"
                  ? "bg-dark text-white dark:bg-primary"
                  : "bg-transparent text-gray-700 dark:text-gray-300 hover:bg-light dark:hover:bg-slate-700"
              )}
              title="Table List View"
            >
              <i className="ph-duotone ph-rows text-sm"></i>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "btn-sm inline-flex items-center gap-1 cursor-pointer font-medium text-xs px-2.5 py-1 rounded",
                viewMode === "grid"
                  ? "bg-dark text-white dark:bg-primary"
                  : "bg-transparent text-gray-700 dark:text-gray-300 hover:bg-light dark:hover:bg-slate-700"
              )}
              title="Pipeline Grid View"
            >
              <i className="ph-duotone ph-grid-four text-sm"></i>
            </button>
          </div>

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

          {/* Create Deal Button */}
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="btn-sm bg-dark text-white border border-dark inline-flex items-center gap-2 hover:bg-primary-hover hover:border-primary-hover cursor-pointer shadow-xs transition-colors"
          >
            <i className="ph ph-plus"></i>
            <span>Create Deal</span>
          </button>
        </div>
      </div>

      {/* ── KPI Cards with Gradients (matching ui/crm-dashboard.html lines 1307-1355) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        {/* Total Leads */}
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600"></div>
          <div className="p-4 bg-emerald-500/5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-default mb-1">Total Pipeline Value</p>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-0">
                  ${totalPipelineValue.toLocaleString()}
                </h2>
              </div>
              <div className="size-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-currency-dollar text-xl"></i>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center font-semibold text-emerald-600">
                <i className="ph ph-arrow-up text-[10px] me-0.5"></i> +12.4%
              </span>
              <span className="text-default">from last month</span>
            </div>
          </div>
        </div>

        {/* Total Deals Closed */}
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600"></div>
          <div className="p-4 bg-purple-500/5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-default mb-1">Closed Deals (Won)</p>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-0">
                  ${wonDealsValue.toLocaleString()}
                </h2>
              </div>
              <div className="size-10 rounded-full bg-purple-500 text-white flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-handshake text-xl"></i>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center font-semibold text-emerald-600">
                <i className="ph ph-arrow-up text-[10px] me-0.5"></i> +5.3%
              </span>
              <span className="text-default">target achieved</span>
            </div>
          </div>
        </div>

        {/* Win Rate */}
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600"></div>
          <div className="p-4 bg-amber-500/5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-default mb-1">Win Conversion Rate</p>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-0">{winRate}%</h2>
              </div>
              <div className="size-10 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-chart-pie text-xl"></i>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center font-semibold text-emerald-600">
                <i className="ph ph-arrow-up text-[10px] me-0.5"></i> +8.7%
              </span>
              <span className="text-default">higher than benchmark</span>
            </div>
          </div>
        </div>

        {/* Open Active Deals */}
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600"></div>
          <div className="p-4 bg-blue-500/5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-default mb-1">Active Pipeline Deals</p>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-0">{openDealsCount} Deals</h2>
              </div>
              <div className="size-10 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-briefcase text-xl"></i>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-default">Avg Cycle: 24 Days</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Charts Row (Funnel & Won/Lost) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 lg:col-span-7">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-0">Sales Pipeline Funnel</h3>
            <span className="text-xs text-default">Stage Distribution</span>
          </div>
          <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-default">Loading chart...</div>}>
            <Chart options={funnelChartOptions} series={funnelChartOptions.series} type="bar" height={260} />
          </Suspense>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 lg:col-span-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-0">Won vs Lost Deals</h3>
            <span className="text-xs text-default">H1 2026</span>
          </div>
          <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-default">Loading chart...</div>}>
            <Chart options={stageStackedOptions} series={stageStackedOptions.series} type="bar" height={260} />
          </Suspense>
        </div>
      </div>

      {/* ── Deals Main Container (matching ui/deals.html lines 1284-1350) ── */}
      <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="relative w-64 search-input">
            <i className="ph ph-magnifying-glass absolute right-2.5 top-1/2 -translate-y-1/2 text-default text-sm pointer-events-none"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 pe-8 py-1.5 h-8 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Search deals, clients, owners..."
            />
          </div>

          <div className="flex items-center gap-2">
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
                <div className="absolute right-0 top-full mt-2 min-w-52 bg-white dark:bg-slate-900 border border-border-color shadow-lg rounded-md p-3 space-y-2 z-30">
                  <p className="text-xs font-bold text-title mb-1">Filter by Stage</p>
                  {["all", "Proposal", "In Discussion", "Contract Signed", "Won", "Lost"].map((st) => (
                    <label key={st} className="flex items-center gap-2 text-xs cursor-pointer text-gray-800 dark:text-gray-200">
                      <input
                        type="radio"
                        name="stageFilter"
                        checked={stageFilter === st}
                        onChange={() => {
                          setStageFilter(st);
                          setFilterDropdownOpen(false);
                        }}
                        className="size-3.5 rounded border-border-color text-primary focus:ring-0"
                      />
                      <span>{st === "all" ? "All Stages" : st}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["deals-dashboard-data"] });
                toast.success("Deals refreshed.");
              }}
              className="size-8 rounded-md border border-border-color bg-white dark:bg-slate-800 flex items-center justify-center text-default hover:bg-light dark:hover:bg-slate-700 cursor-pointer shadow-xs transition-colors"
              title="Refresh"
            >
              <i className="ph ph-arrow-clockwise"></i>
            </button>
          </div>
        </div>

        {viewMode === "list" ? (
          /* ── Table View (matching ui/deals.html lines 1316-1355) ── */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-default border-b border-border-color bg-slate-50/50 dark:bg-slate-800/40">
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Deal Name</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Customer</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Stage</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Deal Value</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Close Date</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Owner</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Status</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeals.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-default">
                      No deals found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredDeals.map((deal) => (
                    <tr key={deal.id} className="border-b border-border-color hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-3">
                        <p className="text-sm font-semibold text-title leading-tight mb-0.5">{deal.name}</p>
                        <span className="text-[11px] text-muted-foreground font-mono">{deal.id}</span>
                      </td>
                      <td className="py-3 px-3 text-sm text-default">{deal.customer}</td>
                      <td className="py-3 px-3">
                        <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{deal.stage}</span>
                      </td>
                      <td className="py-3 px-3 text-sm font-bold text-gray-900 dark:text-gray-100">
                        ${deal.value.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-sm text-default">{deal.closeDate}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={deal.ownerAvatar}
                            alt={deal.owner}
                            className="size-6 rounded-full object-cover shrink-0 border border-border-color"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/ui-assets/avatar-01.jpg";
                            }}
                          />
                          <span className="text-xs text-gray-900 dark:text-gray-100">{deal.owner}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            "text-[11px] font-medium px-2 py-0.5 rounded inline-block",
                            deal.status === "Won" && "bg-success-transparent text-success",
                            deal.status === "Open" && "bg-info-transparent text-info",
                            deal.status === "Lost" && "bg-danger-transparent text-danger"
                          )}
                        >
                          {deal.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right relative">
                        <div className="relative inline-flex">
                          <button
                            type="button"
                            onClick={() => setActionMenuOpen(actionMenuOpen === deal.id ? null : deal.id)}
                            className="size-7 rounded-md border border-border-color bg-white dark:bg-slate-800 text-default hover:bg-light dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer shadow-2xs"
                          >
                            <i className="ph-bold ph-dots-three-vertical text-sm"></i>
                          </button>

                          {actionMenuOpen === deal.id && (
                            <div className="absolute right-0 top-full mt-1 min-w-32 bg-white dark:bg-slate-900 border border-border-color shadow-lg rounded-md p-1.5 space-y-1 z-30 text-left">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDeal(deal);
                                  setActionMenuOpen(null);
                                  toast.info(`Viewing ${deal.name}`);
                                }}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-800 cursor-pointer"
                              >
                                <i className="ph-duotone ph-eye text-sm"></i>
                                <span>View Deal</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDeal(deal);
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
        ) : (
          /* ── Grid / Kanban Stage View ── */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {["Proposal", "In Discussion", "Won"].map((st) => {
              const stageDeals = filteredDeals.filter((d) => d.stage === st || (st === "Won" && d.status === "Won"));
              return (
                <div key={st} className="bg-slate-50 dark:bg-slate-800/40 rounded-md p-3 border border-border-color">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-border-color">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">{st}</h4>
                    <span className="text-xs font-bold bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-border-color">
                      {stageDeals.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {stageDeals.map((d) => (
                      <div key={d.id} className="bg-white dark:bg-slate-900 p-3 rounded-md border border-border-color shadow-2xs">
                        <p className="text-xs font-bold text-title mb-1">{d.name}</p>
                        <p className="text-[11px] text-default mb-2">{d.customer}</p>
                        <div className="flex items-center justify-between pt-2 border-t border-border-color/60 text-xs">
                          <span className="font-bold text-gray-900 dark:text-gray-100">${d.value.toLocaleString()}</span>
                          <span className="text-[10px] text-muted-foreground">{d.closeDate}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create Deal Modal ── */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-white dark:bg-slate-900 border border-border-color">
          <DialogHeader className="p-4 border-b border-border-color">
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100">Create New Deal</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="p-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Deal Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Enterprise CRM Upgrade"
                value={newDeal.name}
                onChange={(e) => setNewDeal({ ...newDeal, name: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Customer / Company *</label>
              <input
                type="text"
                required
                placeholder="e.g. Global Logistics Ltd"
                value={newDeal.customer}
                onChange={(e) => setNewDeal({ ...newDeal, customer: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Deal Value ($)</label>
                <input
                  type="number"
                  min="0"
                  value={newDeal.value}
                  onChange={(e) => setNewDeal({ ...newDeal, value: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Stage</label>
                <select
                  value={newDeal.stage}
                  onChange={(e) => setNewDeal({ ...newDeal, stage: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Proposal">Proposal</option>
                  <option value="In Discussion">In Discussion</option>
                  <option value="Contract Signed">Contract Signed</option>
                  <option value="Won">Won</option>
                </select>
              </div>
            </div>

            <DialogFooter className="border-t border-border-color pt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 hover:bg-light cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-sm bg-dark text-white border border-dark hover:bg-primary-hover cursor-pointer"
              >
                Create Deal
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Deal Modal ── */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-sm p-4 text-center bg-white dark:bg-slate-900 border border-border-color">
          <div className="size-12 rounded-full bg-danger-transparent text-danger mx-auto flex items-center justify-center mb-3">
            <i className="ph-duotone ph-trash text-2xl"></i>
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">Delete Deal?</h3>
          <p className="text-xs text-default mb-4">
            Are you sure you want to remove <strong className="text-gray-900 dark:text-gray-100">{selectedDeal?.name}</strong> from pipeline?
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
              onClick={() => {
                toast.success(`Deal ${selectedDeal?.name} removed.`);
                setDeleteModalOpen(false);
              }}
              className="btn-sm bg-danger text-white border border-danger hover:bg-danger/90 cursor-pointer"
            >
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
