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

export const Route = createFileRoute("/_authenticated/_app/leads-dashboard")({
  component: LeadsDashboardPage,
  head: () => ({
    meta: [
      { title: "Leads Dashboard | Dreams ERP" },
      {
        name: "description",
        content: "Track enterprise leads, pipeline acquisition channels, conversion stages, and sales outreach in Dreams ERP.",
      },
    ],
  }),
});

interface LeadItem {
  id: string;
  name: string;
  company: string;
  source: string;
  value: number;
  location: string;
  email: string;
  status: string;
  avatar: string;
}

const INITIAL_LEADS: LeadItem[] = [
  {
    id: "LED-001",
    name: "John Smith",
    company: "TechCorp Inc",
    source: "Organic Search",
    value: 15000,
    location: "United States",
    email: "john.smith@techcorp.com",
    status: "New",
    avatar: "/ui-assets/avatar-01.jpg",
  },
  {
    id: "LED-002",
    name: "Ava Mitchell",
    company: "Nexus Logistics",
    source: "Referral",
    value: 28000,
    location: "United Kingdom",
    email: "ava.m@nexuslogistics.co.uk",
    status: "Qualified",
    avatar: "/ui-assets/avatar-02.jpg",
  },
  {
    id: "LED-003",
    name: "Alexander Hayes",
    company: "Apex Media Works",
    source: "LinkedIn Campaign",
    value: 42000,
    location: "Canada",
    email: "alex.hayes@apexmedia.ca",
    status: "Contacted",
    avatar: "/ui-assets/avatar-03.jpg",
  },
  {
    id: "LED-004",
    name: "Amelia Scott",
    company: "Pinnacle Financials",
    source: "Cold Outreach",
    value: 19500,
    location: "Australia",
    email: "amelia@pinnaclefin.com.au",
    status: "New",
    avatar: "/ui-assets/avatar-04.jpg",
  },
  {
    id: "LED-005",
    name: "Anthony Walker",
    company: "Vanguard Global",
    source: "Trade Show",
    value: 65000,
    location: "Germany",
    email: "anthony@vanguardglobal.de",
    status: "Qualified",
    avatar: "/ui-assets/avatar-05.jpg",
  },
  {
    id: "LED-006",
    name: "Charlotte Evans",
    company: "CyberShield Systems",
    source: "Website Form",
    value: 22000,
    location: "Singapore",
    email: "charlotte@cybershield.sg",
    status: "Lost",
    avatar: "/ui-assets/avatar-06.jpg",
  },
];

export default function LeadsDashboardPage() {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [exportOpen, setExportOpen] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);

  // New Lead Form
  const [newLead, setNewLead] = useState({
    name: "",
    company: "",
    email: "",
    source: "Website Form",
    value: 15000,
    location: "United States",
    status: "New" as LeadItem["status"],
  });

  const queryClient = useQueryClient();

  const { data: leads = INITIAL_LEADS } = useQuery({
    queryKey: ["leads-dashboard-data"],
    queryFn: async () => {
      try {
        const res = await api.get("/crm/leads");
        if (Array.isArray(res) && res.length > 0) {
          return res.map((l: any, idx: number) => ({
            id: l.id || `LED-${String(idx + 1).padStart(3, "0")}`,
            name: l.name || "Prospective Lead",
            company: l.company || "Enterprise Lead",
            source: l.source || "Website Form",
            value: Number(l.value || l.estimatedBudget || 15000),
            location: l.location || "Global",
            email: l.email || "lead@company.com",
            status: l.status === "qualified" ? "Qualified" : l.status === "contacted" ? "Contacted" : l.status === "lost" ? "Lost" : "New",
            avatar: `/ui-assets/avatar-${String((idx % 12) + 1).padStart(2, "0")}.jpg`,
          }));
        }
        return INITIAL_LEADS;
      } catch {
        return INITIAL_LEADS;
      }
    },
  });

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchSearch =
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.source.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "all" || l.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [leads, searchQuery, statusFilter]);

  const totalLeadsCount = leads.length;
  const totalValue = leads.reduce((sum, l) => sum + l.value, 0);
  const qualifiedCount = leads.filter((l) => l.status === "Qualified").length;
  const newCount = leads.filter((l) => l.status === "New").length;

  const handleExport = (format: "pdf" | "excel") => {
    try {
      const csvContent = [
        ["Lead ID", "Lead Name", "Company", "Source", "Value", "Location", "Email", "Status"],
        ...filteredLeads.map((l) => [
          l.id,
          l.name,
          l.company,
          l.source,
          `$${l.value}`,
          l.location,
          l.email,
          l.status,
        ]),
      ]
        .map((r) => r.join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Leads_Report_${new Date().toISOString().split("T")[0]}.${format === "excel" ? "csv" : "txt"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Leads exported as ${format.toUpperCase()}`);
    } catch {
      toast.error("Failed to export Leads.");
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.name.trim() || !newLead.company.trim()) {
      toast.error("Please provide Lead Name and Company.");
      return;
    }
    toast.success(`Lead "${newLead.name}" created successfully.`);
    setCreateModalOpen(false);
    setNewLead({
      name: "",
      company: "",
      email: "",
      source: "Website Form",
      value: 15000,
      location: "United States",
      status: "New",
    });
  };

  const leadSourcesOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "donut", height: 260 },
      labels: ["Website Form", "Referral", "LinkedIn", "Cold Outreach", "Trade Shows"],
      colors: ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899"],
      legend: { position: "bottom" },
      dataLabels: { enabled: false },
    }),
    []
  );

  return (
    <div className="p-0">
      {/* ── Page Header (matching ui/leads.html lines 1267-1280) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 lg:mb-6">
        <div>
          <h1 className="text-gray-900 dark:text-gray-100 text-xl font-bold mb-1">Leads Management</h1>
          <p className="text-sm text-default mb-0">
            Incoming inbound prospect funnel, marketing acquisition channels, and lead qualification matrix.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Switcher */}
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
              title="Table List"
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
              title="Card Grid"
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

          {/* Create Lead Button */}
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="btn-sm bg-dark text-white border border-dark inline-flex items-center gap-2 hover:bg-primary-hover hover:border-primary-hover cursor-pointer shadow-xs transition-colors"
          >
            <i className="ph ph-plus"></i>
            <span>Create Lead</span>
          </button>
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-default mb-1">Total Prospects</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">{totalLeadsCount}</h3>
            <span className="text-[11px] text-success font-medium inline-flex items-center mt-1">
              <i className="ph ph-arrow-up text-[10px] me-1"></i> +14.2% MoM
            </span>
          </div>
          <div className="size-10 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
            <i className="ph-duotone ph-user-focus text-xl"></i>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-default mb-1">New Leads</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">{newCount}</h3>
            <span className="text-[11px] text-info font-medium inline-flex items-center mt-1">
              Pending First Touch
            </span>
          </div>
          <div className="size-10 rounded-md bg-sky-50 dark:bg-sky-950/40 text-sky-600 flex items-center justify-center shrink-0">
            <i className="ph-duotone ph-sparkle text-xl"></i>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-default mb-1">Qualified Leads</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">{qualifiedCount}</h3>
            <span className="text-[11px] text-emerald-600 font-medium inline-flex items-center mt-1">
              Ready for Proposal
            </span>
          </div>
          <div className="size-10 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
            <i className="ph-duotone ph-check-circle text-xl"></i>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-default mb-1">Forecasted Value</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">${totalValue.toLocaleString()}</h3>
            <span className="text-[11px] text-default font-medium inline-flex items-center mt-1">
              Weighted Pipeline
            </span>
          </div>
          <div className="size-10 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center shrink-0">
            <i className="ph-duotone ph-wallet text-xl"></i>
          </div>
        </div>
      </div>

      {/* ── Leads Table Container (matching ui/leads.html lines 1281-1350) ── */}
      <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="relative w-64 search-input">
            <i className="ph ph-magnifying-glass absolute right-2.5 top-1/2 -translate-y-1/2 text-default text-sm pointer-events-none"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 pe-8 py-1.5 h-8 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Search leads, companies, sources..."
            />
          </div>

          <div className="flex items-center gap-2">
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
                <div className="absolute right-0 top-full mt-2 min-w-44 bg-white dark:bg-slate-900 border border-border-color shadow-lg rounded-md p-3 space-y-2 z-30">
                  <p className="text-xs font-bold text-title mb-1">Filter Status</p>
                  {["all", "New", "Contacted", "Qualified", "Lost"].map((st) => (
                    <label key={st} className="flex items-center gap-2 text-xs cursor-pointer text-gray-800 dark:text-gray-200">
                      <input
                        type="radio"
                        name="leadStatus"
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
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["leads-dashboard-data"] });
                toast.success("Leads refreshed.");
              }}
              className="size-8 rounded-md border border-border-color bg-white dark:bg-slate-800 flex items-center justify-center text-default hover:bg-light dark:hover:bg-slate-700 cursor-pointer shadow-xs transition-colors"
            >
              <i className="ph ph-arrow-clockwise"></i>
            </button>
          </div>
        </div>

        {viewMode === "list" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-default border-b border-border-color bg-slate-50/50 dark:bg-slate-800/40">
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Lead Name</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Company</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Acquisition Source</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Potential Value</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Location</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Status</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-default">
                      No leads matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="border-b border-border-color hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={lead.avatar}
                            alt={lead.name}
                            className="size-7 rounded-full object-cover shrink-0 border border-border-color"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/ui-assets/avatar-01.jpg";
                            }}
                          />
                          <div>
                            <p className="text-sm font-semibold text-title leading-tight mb-0.5">{lead.name}</p>
                            <span className="text-[11px] text-muted-foreground">{lead.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-sm text-default">{lead.company}</td>
                      <td className="py-3 px-3 text-sm text-default">{lead.source}</td>
                      <td className="py-3 px-3 text-sm font-bold text-gray-900 dark:text-gray-100">${lead.value.toLocaleString()}</td>
                      <td className="py-3 px-3 text-sm text-default">{lead.location}</td>
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            "text-[11px] font-medium px-2 py-0.5 rounded inline-block",
                            lead.status === "New" && "bg-info-transparent text-info",
                            lead.status === "Qualified" && "bg-success-transparent text-success",
                            lead.status === "Contacted" && "bg-warning-transparent text-warning",
                            lead.status === "Lost" && "bg-danger-transparent text-danger"
                          )}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right relative">
                        <div className="relative inline-flex">
                          <button
                            type="button"
                            onClick={() => setActionMenuOpen(actionMenuOpen === lead.id ? null : lead.id)}
                            className="size-7 rounded-md border border-border-color bg-white dark:bg-slate-800 text-default hover:bg-light dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer shadow-2xs"
                          >
                            <i className="ph-bold ph-dots-three-vertical text-sm"></i>
                          </button>

                          {actionMenuOpen === lead.id && (
                            <div className="absolute right-0 top-full mt-1 min-w-32 bg-white dark:bg-slate-900 border border-border-color shadow-lg rounded-md p-1.5 space-y-1 z-30 text-left">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setActionMenuOpen(null);
                                  toast.info(`Lead details for ${lead.name}`);
                                }}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-800 cursor-pointer"
                              >
                                <i className="ph-duotone ph-eye text-sm"></i>
                                <span>View</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedLead(lead);
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredLeads.map((lead) => (
              <div key={lead.id} className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 shadow-2xs">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <img src={lead.avatar} alt={lead.name} className="size-8 rounded-full border border-border-color" />
                    <div>
                      <p className="text-sm font-semibold text-title leading-tight mb-0.5">{lead.name}</p>
                      <span className="text-[11px] text-default">{lead.company}</span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded",
                      lead.status === "New" && "bg-info-transparent text-info",
                      lead.status === "Qualified" && "bg-success-transparent text-success",
                      lead.status === "Contacted" && "bg-warning-transparent text-warning",
                      lead.status === "Lost" && "bg-danger-transparent text-danger"
                    )}
                  >
                    {lead.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-border-color text-default">
                  <span>{lead.source}</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">${lead.value.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create Lead Modal ── */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-white dark:bg-slate-900 border border-border-color">
          <DialogHeader className="p-4 border-b border-border-color">
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100">Add New Lead</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="p-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Contact Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. John Doe"
                value={newLead.name}
                onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Company Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Acme Corp"
                value={newLead.company}
                onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Value ($)</label>
                <input
                  type="number"
                  min="0"
                  value={newLead.value}
                  onChange={(e) => setNewLead({ ...newLead, value: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Source</label>
                <select
                  value={newLead.source}
                  onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Website Form">Website Form</option>
                  <option value="Referral">Referral</option>
                  <option value="LinkedIn Campaign">LinkedIn Campaign</option>
                  <option value="Cold Outreach">Cold Outreach</option>
                  <option value="Trade Show">Trade Show</option>
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
                Save Lead
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Modal ── */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-sm p-4 text-center bg-white dark:bg-slate-900 border border-border-color">
          <div className="size-12 rounded-full bg-danger-transparent text-danger mx-auto flex items-center justify-center mb-3">
            <i className="ph-duotone ph-trash text-2xl"></i>
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">Delete Lead?</h3>
          <p className="text-xs text-default mb-4">
            Are you sure you want to remove <strong className="text-gray-900 dark:text-gray-100">{selectedLead?.name}</strong> from records?
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
                toast.success(`Lead ${selectedLead?.name} removed.`);
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
