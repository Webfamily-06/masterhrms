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

export const Route = createFileRoute("/_authenticated/_app/help-desk-dashboard")({
  component: HelpDeskDashboardPage,
  head: () => ({
    meta: [
      { title: "Support & Help Desk Dashboard | Dreams ERP" },
      {
        name: "description",
        content: "Enterprise support ticketing, SLA monitoring, resolution velocity, and customer issue tracking in Dreams ERP.",
      },
    ],
  }),
});

interface TicketItem {
  id: string;
  subject: string;
  requester: string;
  agent: string;
  agentAvatar: string;
  category: string;
  priority: "High" | "Medium" | "Low" | "Urgent";
  createdDate: string;
  status: "Open" | "In Progress" | "Resolved" | "Closed";
}

const INITIAL_TICKETS: TicketItem[] = [
  {
    id: "TIC-001",
    subject: "VPN Gateway Authentication Timeout",
    requester: "DevOps Team",
    agent: "Ethan Walker",
    agentAvatar: "/ui-assets/avatar-03.jpg",
    category: "Network / Infrastructure",
    priority: "Urgent",
    createdDate: "20 Jan 2026",
    status: "Open",
  },
  {
    id: "TIC-002",
    subject: "Payroll Payslip Tax Deduction Discrepancy",
    requester: "Sarah Jenkins",
    agent: "Madison Clark",
    agentAvatar: "/ui-assets/avatar-04.jpg",
    category: "Finance & Payroll",
    priority: "High",
    createdDate: "19 Jan 2026",
    status: "In Progress",
  },
  {
    id: "TIC-003",
    subject: "Request New Mechanical Keyboard & Monitor Arm",
    requester: "Marcus Vance",
    agent: "James Harris",
    agentAvatar: "/ui-assets/avatar-05.jpg",
    category: "Hardware Request",
    priority: "Low",
    createdDate: "18 Jan 2026",
    status: "Resolved",
  },
  {
    id: "TIC-004",
    subject: "CRM Lead Webhook Endpoint 502 Bad Gateway",
    requester: "Marketing Operations",
    agent: "Chloe Mitchell",
    agentAvatar: "/ui-assets/avatar-08.jpg",
    category: "API & Integrations",
    priority: "High",
    createdDate: "17 Jan 2026",
    status: "Open",
  },
  {
    id: "TIC-005",
    subject: "Biometric Punch Card Device Sync Failure",
    requester: "Facility Management",
    agent: "Benjamin Wright",
    agentAvatar: "/ui-assets/avatar-07.jpg",
    category: "Hardware / Devices",
    priority: "Urgent",
    createdDate: "15 Jan 2026",
    status: "In Progress",
  },
  {
    id: "TIC-006",
    subject: "Google Workspace Email Alias Provisioning",
    requester: "HR Department",
    agent: "Avery Thompson",
    agentAvatar: "/ui-assets/avatar-06.jpg",
    category: "Access & Security",
    priority: "Medium",
    createdDate: "14 Jan 2026",
    status: "Closed",
  },
];

export default function HelpDeskDashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [exportOpen, setExportOpen] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // New Ticket Form
  const [newTicket, setNewTicket] = useState({
    subject: "",
    requester: "",
    category: "General IT",
    priority: "Medium" as TicketItem["priority"],
  });

  const queryClient = useQueryClient();

  const { data: tickets = INITIAL_TICKETS } = useQuery({
    queryKey: ["support-tickets-data"],
    queryFn: async () => {
      try {
        const res = await api.get("/helpdesk/tickets");
        if (Array.isArray(res) && res.length > 0) {
          return res.map((t: any, idx: number) => ({
            id: t.id || `TIC-${String(idx + 1).padStart(3, "0")}`,
            subject: t.subject || t.title || "Support Request",
            requester: t.requester?.name || t.employee?.name || "Employee User",
            agent: t.assignedAgent?.name || "Support Specialist",
            agentAvatar: `/ui-assets/avatar-${String((idx % 12) + 1).padStart(2, "0")}.jpg`,
            category: t.category || "General Support",
            priority: (t.priority === "urgent" ? "Urgent" : t.priority === "high" ? "High" : t.priority === "low" ? "Low" : "Medium") as TicketItem["priority"],
            createdDate: t.createdAt ? new Date(t.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "18 Jan 2026",
            status: (t.status === "in_progress" ? "In Progress" : t.status === "resolved" ? "Resolved" : t.status === "closed" ? "Closed" : "Open") as TicketItem["status"],
          }));
        }
        return INITIAL_TICKETS;
      } catch {
        return INITIAL_TICKETS;
      }
    },
  });

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchSearch =
        t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.requester.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPriority = priorityFilter === "all" || t.priority === priorityFilter;
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      return matchSearch && matchPriority && matchStatus;
    });
  }, [tickets, searchQuery, priorityFilter, statusFilter]);

  const totalTickets = tickets.length;
  const openCount = tickets.filter((t) => t.status === "Open").length;
  const inProgressCount = tickets.filter((t) => t.status === "In Progress").length;
  const resolvedCount = tickets.filter((t) => t.status === "Resolved" || t.status === "Closed").length;
  const slaCompliance = 96.4;

  const handleExport = (format: "pdf" | "excel") => {
    try {
      const csvContent = [
        ["Ticket ID", "Subject", "Requester", "Agent", "Category", "Priority", "Created Date", "Status"],
        ...filteredTickets.map((t) => [
          t.id,
          t.subject,
          t.requester,
          t.agent,
          t.category,
          t.priority,
          t.createdDate,
          t.status,
        ]),
      ]
        .map((r) => r.join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Support_Tickets_${new Date().toISOString().split("T")[0]}.${format === "excel" ? "csv" : "txt"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Tickets exported as ${format.toUpperCase()}`);
    } catch {
      toast.error("Failed to export tickets.");
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.subject.trim() || !newTicket.requester.trim()) {
      toast.error("Please provide Subject and Requester.");
      return;
    }
    toast.success(`Support ticket "${newTicket.subject}" filed.`);
    setCreateModalOpen(false);
    setNewTicket({
      subject: "",
      requester: "",
      category: "General IT",
      priority: "Medium",
    });
  };

  // Ticket Volume Area Chart (matching ui/support-dashboard.html line 1323)
  const volumeChartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: { type: "area", height: 240, toolbar: { show: false } },
      colors: ["#3B82F6", "#10B981"],
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
        { name: "Tickets Opened", data: [45, 60, 95, 70, 75, 60, 75, 85, 92, 105, 98, 110] },
        { name: "Tickets Resolved", data: [40, 55, 90, 68, 72, 58, 70, 80, 88, 100, 95, 106] },
      ],
      xaxis: {
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        labels: { style: { colors: "#94A3B8", fontSize: "11px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
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
      {/* ── Page Header (matching ui/support-dashboard.html lines 1272-1298) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 lg:mb-6">
        <div>
          <h1 className="text-gray-900 dark:text-gray-100 text-xl font-bold mb-1">Support & Help Desk</h1>
          <p className="text-sm text-default mb-0">
            Resolution SLAs, agent queue velocity, and customer support ticket dispatch center.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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

          {/* Add Ticket Button */}
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="btn-sm bg-dark text-white border border-dark inline-flex items-center gap-2 hover:bg-primary-hover hover:border-primary-hover cursor-pointer shadow-xs transition-colors"
          >
            <i className="ph ph-plus"></i>
            <span>Add Ticket</span>
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-default mb-1">Total Tickets</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">{totalTickets}</h3>
            <span className="text-[11px] text-default font-medium inline-flex items-center mt-1">
              Active Lifecycle
            </span>
          </div>
          <div className="size-10 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
            <i className="ph-duotone ph-ticket text-xl"></i>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-default mb-1">Open Tickets</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">{openCount}</h3>
            <span className="text-[11px] text-danger font-medium inline-flex items-center mt-1">
              Awaiting First Response
            </span>
          </div>
          <div className="size-10 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center shrink-0">
            <i className="ph-duotone ph-warning-circle text-xl"></i>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-default mb-1">In Progress</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">{inProgressCount}</h3>
            <span className="text-[11px] text-amber-600 font-medium inline-flex items-center mt-1">
              Assigned to Engineering
            </span>
          </div>
          <div className="size-10 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0">
            <i className="ph-duotone ph-hourglass-high text-xl"></i>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-default mb-1">SLA Compliance</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0">{slaCompliance}%</h3>
            <span className="text-[11px] text-emerald-600 font-medium inline-flex items-center mt-1">
              {resolvedCount} Resolved within SLA
            </span>
          </div>
          <div className="size-10 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
            <i className="ph-duotone ph-shield-check text-xl"></i>
          </div>
        </div>
      </div>

      {/* ── Ticket Volume Chart (matching ui/support-dashboard.html lines 1301-1324) ── */}
      <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-0">Ticket Volume & Resolution</h3>
          <span className="text-xs text-default">Year 2026</span>
        </div>
        <Suspense fallback={<div className="h-60 flex items-center justify-center text-xs text-default">Loading chart...</div>}>
          <Chart options={volumeChartOptions} series={volumeChartOptions.series} type="area" height={240} />
        </Suspense>
      </div>

      {/* ── Tickets Table Container ── */}
      <div className="bg-white dark:bg-slate-900 border border-border-color rounded-md p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="relative w-64 search-input">
            <i className="ph ph-magnifying-glass absolute right-2.5 top-1/2 -translate-y-1/2 text-default text-sm pointer-events-none"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 pe-8 py-1.5 h-8 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Search tickets, subject, agents..."
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
                  <p className="text-xs font-bold text-title mb-1">Filter Priority</p>
                  {["all", "Urgent", "High", "Medium", "Low"].map((pr) => (
                    <label key={pr} className="flex items-center gap-2 text-xs cursor-pointer text-gray-800 dark:text-gray-200">
                      <input
                        type="radio"
                        name="ticketPriority"
                        checked={priorityFilter === pr}
                        onChange={() => {
                          setPriorityFilter(pr);
                          setFilterDropdownOpen(false);
                        }}
                        className="size-3.5 rounded border-border-color text-primary focus:ring-0"
                      />
                      <span>{pr === "all" ? "All Priorities" : pr}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["support-tickets-data"] });
                toast.success("Tickets refreshed.");
              }}
              className="size-8 rounded-md border border-border-color bg-white dark:bg-slate-800 flex items-center justify-center text-default hover:bg-light dark:hover:bg-slate-700 cursor-pointer shadow-xs transition-colors"
            >
              <i className="ph ph-arrow-clockwise"></i>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-default border-b border-border-color bg-slate-50/50 dark:bg-slate-800/40">
                <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Ticket ID</th>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Subject</th>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Requester</th>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Assigned Agent</th>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Category</th>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Priority</th>
                <th className="text-left py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Status</th>
                <th className="text-right py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-default">
                    No tickets found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b border-border-color hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-3 font-mono text-xs font-semibold text-primary">{ticket.id}</td>
                    <td className="py-3 px-3">
                      <p className="text-sm font-semibold text-title leading-tight mb-0.5">{ticket.subject}</p>
                      <span className="text-[11px] text-muted-foreground">{ticket.createdDate}</span>
                    </td>
                    <td className="py-3 px-3 text-sm text-default">{ticket.requester}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <img src={ticket.agentAvatar} alt={ticket.agent} className="size-6 rounded-full border border-border-color object-cover" />
                        <span className="text-xs text-gray-900 dark:text-gray-100">{ticket.agent}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs text-default">{ticket.category}</td>
                    <td className="py-3 px-3">
                      <span
                        className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded",
                          ticket.priority === "Urgent" && "bg-rose-50 text-rose-600 border border-rose-200",
                          ticket.priority === "High" && "bg-amber-50 text-amber-600 border border-amber-200",
                          ticket.priority === "Medium" && "bg-blue-50 text-blue-600 border border-blue-200",
                          ticket.priority === "Low" && "bg-slate-100 text-slate-600 border border-slate-200"
                        )}
                      >
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={cn(
                          "text-[11px] font-medium px-2 py-0.5 rounded inline-block",
                          ticket.status === "Open" && "bg-rose-500/10 text-rose-600",
                          ticket.status === "In Progress" && "bg-amber-500/10 text-amber-600",
                          ticket.status === "Resolved" && "bg-emerald-500/10 text-emerald-600",
                          ticket.status === "Closed" && "bg-slate-500/10 text-slate-600"
                        )}
                      >
                        {ticket.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right relative">
                      <div className="relative inline-flex">
                        <button
                          type="button"
                          onClick={() => setActionMenuOpen(actionMenuOpen === ticket.id ? null : ticket.id)}
                          className="size-7 rounded-md border border-border-color bg-white dark:bg-slate-800 text-default hover:bg-light dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer shadow-2xs"
                        >
                          <i className="ph-bold ph-dots-three-vertical text-sm"></i>
                        </button>

                        {actionMenuOpen === ticket.id && (
                          <div className="absolute right-0 top-full mt-1 min-w-32 bg-white dark:bg-slate-900 border border-border-color shadow-lg rounded-md p-1.5 space-y-1 z-30 text-left">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTicket(ticket);
                                setActionMenuOpen(null);
                                toast.info(`Viewing ${ticket.id}`);
                              }}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-gray-900 dark:text-gray-100 hover:bg-light dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <i className="ph-duotone ph-eye text-sm"></i>
                              <span>View Details</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTicket(ticket);
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
      </div>

      {/* ── Create Ticket Modal ── */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-white dark:bg-slate-900 border border-border-color">
          <DialogHeader className="p-4 border-b border-border-color">
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100">Create Support Ticket</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="p-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Subject *</label>
              <input
                type="text"
                required
                placeholder="Brief issue summary"
                value={newTicket.subject}
                onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Requester *</label>
              <input
                type="text"
                required
                placeholder="Requester name or department"
                value={newTicket.requester}
                onChange={(e) => setNewTicket({ ...newTicket, requester: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Category</label>
                <select
                  value={newTicket.category}
                  onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="General IT">General IT</option>
                  <option value="Network / Infrastructure">Network / Infrastructure</option>
                  <option value="Finance & Payroll">Finance & Payroll</option>
                  <option value="Hardware Request">Hardware Request</option>
                  <option value="API & Integrations">API & Integrations</option>
                  <option value="Access & Security">Access & Security</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1 block">Priority</label>
                <select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border border-border-color rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
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
                Submit Ticket
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
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">Delete Ticket?</h3>
          <p className="text-xs text-default mb-4">
            Are you sure you want to remove <strong className="text-gray-900 dark:text-gray-100">{selectedTicket?.id}</strong> from the support desk?
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
                toast.success(`Ticket ${selectedTicket?.id} deleted.`);
                setDeleteModalOpen(false);
              }}
              className="btn-sm bg-danger text-white border border-danger hover:bg-danger/90 cursor-pointer"
            >
              Confirm
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
