import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Ticket,
  Plus,
  Search,
  FileSpreadsheet,
  ChevronDown,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Send,
  Loader2,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  UserCheck,
  Building2,
  Tag
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/super/tenant-support-tickets")({
  component: TenantSupportTicketsPage,
});

export type SupportTicket = {
  id: string;
  ticketCode: string;
  subject: string;
  requestType: string;
  priority: "high" | "medium" | "low" | string;
  status: "open" | "resolved" | "closed" | "on_hold" | "reopened" | string;
  tenantId: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
  };
  messages?: Array<{
    id: string;
    senderType: string;
    senderName: string;
    message: string;
    createdAt: string;
  }>;
  createdAt: string;
};

const COMPANY_AVATARS = [
  "/ui-assets/company/company-01.svg",
  "/ui-assets/company/company-02.svg",
  "/ui-assets/company/company-03.svg",
  "/ui-assets/company/company-04.svg",
  "/ui-assets/company/company-05.svg",
  "/ui-assets/company/company-06.svg",
];

const AGENT_LIST = [
  { name: "Edgar Hansel", role: "Senior Specialist", activeTickets: 6, online: true },
  { name: "Ann Lynch", role: "Billing Lead", activeTickets: 3, online: true },
  { name: "Jessie Otero", role: "DevOps Engineer", activeTickets: 5, online: false },
  { name: "Mark Peterson", role: "Support Agent", activeTickets: 2, online: true },
];

export default function TenantSupportTicketsPage() {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  // Modals
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteTicket, setDeleteTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState("");

  // New ticket state
  const [newTicket, setNewTicket] = useState({
    tenantId: "",
    subject: "",
    requestType: "Access Issue",
    priority: "medium",
    message: "",
  });

  // 1. Fetch tickets from backend
  const { data: tickets = [], isLoading } = useQuery<SupportTicket[]>({
    queryKey: ["platform-support-tickets"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/support/platform/tickets");
        return Array.isArray(res) ? res : res?.data || [];
      } catch (err) {
        console.error("Failed to fetch tickets", err);
        return [];
      }
    },
  });

  // 2. Fetch tenants for ticket creation
  const { data: tenants = [] } = useQuery<any[]>({
    queryKey: ["super-tenants-list"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/super/tenants");
        return Array.isArray(res) ? res : res?.data || [];
      } catch {
        return [];
      }
    },
  });

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return api.put(`/api/support/platform/tickets/${id}`, { status });
    },
    onSuccess: (_, vars) => {
      toast.success(`Ticket marked as ${vars.status}`);
      queryClient.invalidateQueries({ queryKey: ["platform-support-tickets"] });
      if (activeTicket && activeTicket.id === vars.id) {
        setActiveTicket({ ...activeTicket, status: vars.status });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update ticket status");
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: async (payload: typeof newTicket) => {
      return api.post("/api/support/platform/tickets", payload);
    },
    onSuccess: () => {
      toast.success("Support ticket created successfully");
      queryClient.invalidateQueries({ queryKey: ["platform-support-tickets"] });
      setIsAddModalOpen(false);
      setNewTicket({
        tenantId: "",
        subject: "",
        requestType: "Access Issue",
        priority: "medium",
        message: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create ticket");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/support/platform/tickets/${id}`);
    },
    onSuccess: () => {
      toast.success("Ticket deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["platform-support-tickets"] });
      setDeleteTicket(null);
      if (activeTicket && deleteTicket && activeTicket.id === deleteTicket.id) {
        setActiveTicket(null);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete ticket");
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      return api.post(`/api/support/platform/tickets/${id}/messages`, { message });
    },
    onSuccess: (newMsg) => {
      toast.success("Reply sent to tenant admin");
      queryClient.invalidateQueries({ queryKey: ["platform-support-tickets"] });
      if (activeTicket) {
        setActiveTicket({
          ...activeTicket,
          messages: [...(activeTicket.messages || []), newMsg],
        });
      }
      setReplyText("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send message");
    },
  });

  // KPI Calculations
  const totalCount = tickets.length;
  const openCount = tickets.filter((t) => t.status === "open").length;
  const pendingCount = tickets.filter((t) => t.status === "on_hold" || t.status === "reopened").length;
  const solvedCount = tickets.filter((t) => t.status === "resolved" || t.status === "closed").length;

  // Categories count
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      "Access Issue": 0,
      "Module Issue": 0,
      "Billing & Payments": 0,
      "API / Integration Issues": 0,
      "Plan / Subscription Issues": 0,
    };
    tickets.forEach((t) => {
      const cat = t.requestType || "Access Issue";
      if (counts[cat] !== undefined) {
        counts[cat]++;
      } else {
        counts[cat] = 1;
      }
    });
    return counts;
  }, [tickets]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchSearch =
        t.ticketCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.tenant?.name && t.tenant.name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchPriority =
        priorityFilter === "all" ? true : t.priority.toLowerCase() === priorityFilter.toLowerCase();

      const matchStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "open"
          ? t.status === "open"
          : statusFilter === "pending"
          ? t.status === "on_hold" || t.status === "reopened"
          : t.status === "resolved" || t.status === "closed";

      const matchCategory =
        categoryFilter === "all" ? true : t.requestType === categoryFilter;

      return matchSearch && matchPriority && matchStatus && matchCategory;
    }).sort((a, b) => {
      if (sortBy === "asc") return a.subject.localeCompare(b.subject);
      if (sortBy === "desc") return b.subject.localeCompare(a.subject);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [tickets, searchTerm, priorityFilter, statusFilter, categoryFilter, sortBy]);

  const exportCSV = () => {
    const headers = ["Ticket ID", "Subject", "Category", "Tenant", "Priority", "Status", "Created Date"];
    const rows = filteredTickets.map((t) => [
      `"${t.ticketCode}"`,
      `"${t.subject}"`,
      `"${t.requestType}"`,
      `"${t.tenant?.name || "Workspace"}"`,
      `"${t.priority}"`,
      `"${t.status}"`,
      `"${new Date(t.createdAt).toLocaleDateString()}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tenant_support_tickets_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Support tickets exported to CSV");
  };

  const getCompanyAvatar = (idx: number) => {
    return COMPANY_AVATARS[idx % COMPANY_AVATARS.length];
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Tenant Support Tickets
          </h2>
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
            <span className="hover:text-primary cursor-pointer">Super Admin</span>
            <span>/</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">Tenant Support Tickets</span>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Dropdown */}
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors shadow-sm text-slate-700 dark:text-slate-200"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Add New Ticket Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm shadow-primary/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Ticket</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* New Tickets */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Ticket className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> +5.50%
            </span>
          </div>
          <div className="mt-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{totalCount}</h2>
            <span className="text-xs text-slate-500 font-medium">New Tickets</span>
          </div>
        </div>

        {/* Open Tickets */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
              <Ticket className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> +2.10%
            </span>
          </div>
          <div className="mt-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{openCount}</h2>
            <span className="text-xs text-slate-500 font-medium">Open Tickets</span>
          </div>
        </div>

        {/* Pending Tickets */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 flex items-center justify-center">
              <Ticket className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> +1.40%
            </span>
          </div>
          <div className="mt-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{pendingCount}</h2>
            <span className="text-xs text-slate-500 font-medium">Pending Tickets</span>
          </div>
        </div>

        {/* Solved Tickets */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <Ticket className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> +8.20%
            </span>
          </div>
          <div className="mt-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{solvedCount}</h2>
            <span className="text-xs text-slate-500 font-medium">Solved Tickets</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100">Ticket List</h4>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search code or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">Priority: All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">Status: All</option>
            <option value="open">Open</option>
            <option value="pending">On Hold</option>
            <option value="solved">Solved</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="recent">Last 7 Days</option>
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      </div>

      {/* Main 2-Column Content */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Side: Ticket Cards (8-9 cols) */}
        <div className="xl:col-span-9 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
              <p className="text-xs">Loading platform support tickets...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500">
              <Ticket className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No support tickets found</p>
              <p className="text-xs text-slate-400">All tenant issues are currently resolved!</p>
            </div>
          ) : (
            filteredTickets.map((t, idx) => {
              const avatarSrc = getCompanyAvatar(idx);
              const agent = AGENT_LIST[idx % AGENT_LIST.length];

              return (
                <div
                  key={t.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    {/* Ticket Code & Priority Badge Box */}
                    <div className="md:col-span-3">
                      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl p-4 text-center">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 mb-1 font-mono">
                          #{t.ticketCode}
                        </p>
                        <div className="my-1.5">
                          {t.priority === "high" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              High
                            </span>
                          ) : t.priority === "low" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                              Low
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              Medium
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {new Date(t.createdAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Ticket Details & Actors */}
                    <div className="md:col-span-9 space-y-3">
                      {/* Title & Actions Row */}
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-semibold text-sm text-slate-900 dark:text-white">
                            {t.subject}
                          </h5>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                            {t.requestType || "Access Issue"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            title="View & Reply"
                            onClick={() => setActiveTicket(t)}
                            className="p-1 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            title="Delete Ticket"
                            onClick={() => setDeleteTicket(t)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Raised By, Assignee, Status Controls */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        {/* Raised By */}
                        <div>
                          <p className="text-[11px] text-slate-400 mb-1">Ticket Raised By</p>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-700 bg-white p-0.5 flex items-center justify-center">
                              <img
                                src={avatarSrc}
                                alt="company"
                                className="w-full h-full object-contain rounded-full"
                              />
                            </div>
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {t.tenant?.name || "Corporate Workspace"}
                            </span>
                          </div>
                        </div>

                        {/* Assignee */}
                        <div>
                          <p className="text-[11px] text-slate-400 mb-1">Assignee</p>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                              {agent.name.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              {agent.name}
                            </span>
                          </div>
                        </div>

                        {/* Status Select */}
                        <div>
                          <p className="text-[11px] text-slate-400 mb-1">Status</p>
                          <select
                            value={t.status}
                            onChange={(e) =>
                              updateStatusMutation.mutate({ id: t.id, status: e.target.value })
                            }
                            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none"
                          >
                            <option value="open">Open</option>
                            <option value="on_hold">On Hold</option>
                            <option value="reopened">Reopened</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Close</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Side: Categories & Support Agents (3-4 cols) */}
        <div className="xl:col-span-3 space-y-4">
          {/* Ticket Categories */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Ticket Categories</h4>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {Object.entries(categoryCounts).map(([cat, count]) => {
                const isSelected = categoryFilter === cat;
                return (
                  <div
                    key={cat}
                    onClick={() => setCategoryFilter(isSelected ? "all" : cat)}
                    className={`flex items-center justify-between p-3.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                      isSelected ? "bg-primary/5 font-semibold text-primary" : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <span>{cat}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Support Agents */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Support Agents</h4>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {AGENT_LIST.map((agent, i) => (
                <div key={i} className="flex items-center justify-between p-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center">
                        {agent.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                          agent.online ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                      ></span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-100">{agent.name}</p>
                      <p className="text-[10px] text-slate-400">{agent.role}</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                    {agent.activeTickets} tickets
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Details & Chat Modal */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-primary">#{activeTicket.ticketCode}</span>
                <h4 className="font-semibold text-base text-slate-900 dark:text-white truncate max-w-sm">
                  {activeTicket.subject}
                </h4>
              </div>
              <button
                onClick={() => setActiveTicket(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Conversation Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
              {/* Ticket Meta Info */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2">
                <div>
                  <span className="text-slate-400 text-[10px]">Tenant:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{activeTicket.tenant?.name || "Workspace"}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Category:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{activeTicket.requestType}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Priority:</span>
                  <p className="font-semibold capitalize text-slate-800 dark:text-slate-100">{activeTicket.priority}</p>
                </div>
              </div>

              {/* Messages list */}
              <div className="space-y-3 pt-2">
                {(activeTicket.messages || []).map((msg, i) => (
                  <div
                    key={i}
                    className={`p-3.5 rounded-xl border ${
                      msg.senderType === "super_admin"
                        ? "bg-primary/5 border-primary/20 ml-6"
                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 mr-6"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {msg.senderName}
                        {msg.senderType === "super_admin" && (
                          <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] bg-primary text-white">
                            Staff
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {msg.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Reply Input Box */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!replyText.trim()) return;
                  replyMutation.mutate({ id: activeTicket.id, message: replyText.trim() });
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Type a response message to tenant admin..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={replyMutation.isPending || !replyText.trim()}
                  className="px-4 py-2 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40"
                >
                  {replyMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Send Reply
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add New Ticket Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-semibold text-base text-slate-900 dark:text-white">Add New Support Ticket</h4>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTicket.subject) {
                  toast.error("Subject is required");
                  return;
                }
                createTicketMutation.mutate(newTicket);
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Tenant Organization
                </label>
                <select
                  value={newTicket.tenantId}
                  onChange={(e) => setNewTicket({ ...newTicket, tenantId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                >
                  <option value="">Select Tenant Organization</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Ticket Subject *
                </label>
                <input
                  type="text"
                  placeholder="Brief summary of the issue"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Category
                  </label>
                  <select
                    value={newTicket.requestType}
                    onChange={(e) => setNewTicket({ ...newTicket, requestType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="Access Issue">Access Issue</option>
                    <option value="Module Issue">Module Issue</option>
                    <option value="Billing & Payments">Billing & Payments</option>
                    <option value="API / Integration Issues">API / Integration Issues</option>
                    <option value="Plan / Subscription Issues">Plan / Subscription Issues</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Priority
                  </label>
                  <select
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Initial Message / Details
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the issue reported..."
                  value={newTicket.message}
                  onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTicketMutation.isPending}
                  className="px-4 py-2 text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-primary/20"
                >
                  {createTicketMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-sm w-full p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-base text-slate-900 dark:text-white">Delete Ticket?</h4>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to permanently delete ticket <strong className="text-slate-700 dark:text-slate-200">#{deleteTicket.ticketCode}</strong>?
            </p>
            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                onClick={() => setDeleteTicket(null)}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTicket.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-rose-600/20"
              >
                {deleteMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
