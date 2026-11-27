'use client';

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LifeBuoy,
  Plus,
  Search,
  MessageSquare,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Send,
  Loader2,
  Zap,
  CreditCard,
  Code2,
  Sparkles,
  HelpCircle,
  Building2,
  ShieldCheck,
  KeyRound,
  Layers,
  FileSpreadsheet,
  Headphones,
  ExternalLink,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

type SupportAgent = {
  id: string;
  agentId: string;
  name: string;
  email: string;
  role: string;
  ticketsAssigned?: number;
  ticketsResolved?: number;
  availability: "Available" | "Not Available" | string;
};

type RequestTypeStyle = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  group: "addon_upgrade" | "billing_invoices" | "technical_api" | "feature_request" | "access_module" | "general_support";
};

const REQUEST_TYPE_MAP: Record<string, RequestTypeStyle> = {
  // Slug request types
  addon_upgrade: {
    label: "Addon Upgrade",
    icon: Zap,
    color: "bg-purple-500/10 text-purple-600 border-purple-500/25",
    group: "addon_upgrade",
  },
  billing_invoices: {
    label: "Billing & Invoices",
    icon: CreditCard,
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25",
    group: "billing_invoices",
  },
  technical_api: {
    label: "Technical & API",
    icon: Code2,
    color: "bg-sky-500/10 text-sky-600 border-sky-500/25",
    group: "technical_api",
  },
  feature_request: {
    label: "Feature Request",
    icon: Sparkles,
    color: "bg-amber-500/10 text-amber-600 border-amber-500/25",
    group: "feature_request",
  },
  general_support: {
    label: "General Support",
    icon: HelpCircle,
    color: "bg-muted text-muted-foreground border-border",
    group: "general_support",
  },
  // Human label request types
  "access issue": {
    label: "Access Issue",
    icon: KeyRound,
    color: "bg-rose-500/10 text-rose-600 border-rose-500/25",
    group: "access_module",
  },
  "module issue": {
    label: "Module Issue",
    icon: Layers,
    color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/25",
    group: "access_module",
  },
  "billing & payments": {
    label: "Billing & Payments",
    icon: CreditCard,
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25",
    group: "billing_invoices",
  },
  "api / integration issues": {
    label: "API / Integration Issues",
    icon: Code2,
    color: "bg-sky-500/10 text-sky-600 border-sky-500/25",
    group: "technical_api",
  },
  "plan / subscription issues": {
    label: "Plan / Subscription Issues",
    icon: Zap,
    color: "bg-purple-500/10 text-purple-600 border-purple-500/25",
    group: "addon_upgrade",
  },
};

function resolveRequestTypeMeta(rawType?: string): RequestTypeStyle {
  if (!rawType) return REQUEST_TYPE_MAP.general_support;
  const key = rawType.trim().toLowerCase();
  if (REQUEST_TYPE_MAP[key]) return REQUEST_TYPE_MAP[key];
  return {
    label: rawType,
    icon: HelpCircle,
    color: "bg-muted text-muted-foreground border-border",
    group: "general_support",
  };
}

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories" },
  { value: "addon_upgrade", label: "Addon Upgrade (Slug)" },
  { value: "billing_invoices", label: "Billing & Invoices (Slug)" },
  { value: "technical_api", label: "Technical & API (Slug)" },
  { value: "feature_request", label: "Feature Request (Slug)" },
  { value: "general_support", label: "General Support (Slug)" },
  { value: "Access Issue", label: "Access Issue" },
  { value: "Module Issue", label: "Module Issue" },
  { value: "Billing & Payments", label: "Billing & Payments" },
  { value: "API / Integration Issues", label: "API / Integration Issues" },
  { value: "Plan / Subscription Issues", label: "Plan / Subscription Issues" },
];

const STATUS_BADGE: Record<string, { variant: "warning" | "info" | "success" | "secondary" | "outline"; label: string }> = {
  open: { variant: "warning", label: "Open" },
  in_progress: { variant: "info", label: "In Progress" },
  on_hold: { variant: "secondary", label: "On Hold" },
  resolved: { variant: "success", label: "Resolved" },
  closed: { variant: "outline", label: "Closed" },
};

const PRIORITY_BADGE: Record<string, "destructive" | "warning" | "info" | "secondary"> = {
  urgent: "destructive",
  high: "destructive",
  medium: "warning",
  low: "info",
};

function escapeCsvCell(val: unknown): string {
  return `"${String(val ?? "").replace(/"/g, '""')}"`;
}

function SupportDeskAdmin() {
  const qc = useQueryClient();

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<"all" | "7d" | "30d">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "subject">("newest");

  // Selection & Dialogs
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("unassigned");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [activateTarget, setActivateTarget] = useState<any | null>(null);

  const [newTicket, setNewTicket] = useState({
    tenantId: "",
    subject: "",
    requestType: "addon_upgrade",
    targetAddonSlug: "",
    priority: "medium",
    message: "",
  });

  // 1. Fetch Tickets (load full super-admin list so slug + human label + 7-day filtering works accurately)
  const {
    data: tickets = [],
    isLoading: isTicketsLoading,
    isFetching: isTicketsFetching,
    refetch: refetchTickets,
  } = useQuery<any[]>({
    queryKey: ["super-platform-support-tickets"],
    queryFn: async () => {
      const res = await api.get("/support/platform/tickets");
      return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    },
  });

  // 2. Fetch Summary KPI Stats
  const { data: summary, isLoading: isSummaryLoading, refetch: refetchSummary } = useQuery<any>({
    queryKey: ["super-platform-support-summary"],
    queryFn: async () => {
      const res = await api.get("/support/platform/summary/stats");
      return res?.data || res || {};
    },
  });

  // 3. Fetch Real Support Agents (/super/support/agents) — Zero hardcoded AGENT_LIST
  const { data: agents = [], isLoading: isAgentsLoading } = useQuery<SupportAgent[]>({
    queryKey: ["super-support-agents"],
    queryFn: async () => {
      const res = await api.get("/super/support/agents");
      return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    },
  });

  // 4. Fetch Tenants for Create Ticket dialog
  const { data: tenants = [] } = useQuery<any[]>({
    queryKey: ["super-tenants-support-select"],
    queryFn: async () => {
      const res = await api.get("/super/tenants");
      return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    },
    enabled: isCreateOpen,
  });

  // 5. Fetch Active Ticket Detail so thread is always up-to-date
  const { data: activeTicketDetail } = useQuery<any>({
    queryKey: ["super-platform-support-ticket-detail", selectedTicketId],
    queryFn: async () => {
      if (!selectedTicketId) return null;
      const res = await api.get(`/support/platform/tickets/${selectedTicketId}`);
      return res?.data || res || null;
    },
    enabled: Boolean(selectedTicketId),
  });

  const selectedTicket = useMemo(() => {
    if (activeTicketDetail) return activeTicketDetail;
    if (!selectedTicketId) return null;
    return tickets.find((t) => t.id === selectedTicketId) || null;
  }, [activeTicketDetail, selectedTicketId, tickets]);

  // Mutations
  const createTicketMut = useMutation({
    mutationFn: async (payload: typeof newTicket) => {
      const res = await api.post("/support/platform/tickets", {
        tenantId: payload.tenantId,
        subject: payload.subject.trim(),
        requestType: payload.requestType,
        targetAddonSlug: payload.targetAddonSlug.trim() || undefined,
        priority: payload.priority,
        message: payload.message.trim() || undefined,
      });
      return res?.data || res;
    },
    onSuccess: () => {
      toast.success("Platform support ticket created.");
      setIsCreateOpen(false);
      setNewTicket({
        tenantId: "",
        subject: "",
        requestType: "addon_upgrade",
        targetAddonSlug: "",
        priority: "medium",
        message: "",
      });
      qc.invalidateQueries({ queryKey: ["super-platform-support-tickets"] });
      qc.invalidateQueries({ queryKey: ["super-platform-support-summary"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to create ticket."),
  });

  const updateTicketMut = useMutation({
    mutationFn: async ({
      id,
      status,
      priority,
    }: {
      id: string;
      status?: string;
      priority?: string;
    }) => {
      const res = await api.put(`/support/platform/tickets/${id}`, { status, priority });
      return res?.data || res;
    },
    onSuccess: () => {
      toast.success("Ticket updated.");
      qc.invalidateQueries({ queryKey: ["super-platform-support-tickets"] });
      qc.invalidateQueries({ queryKey: ["super-platform-support-summary"] });
      if (selectedTicketId) {
        qc.invalidateQueries({ queryKey: ["super-platform-support-ticket-detail", selectedTicketId] });
      }
    },
    onError: (e: any) => toast.error(e?.message || "Failed to update ticket."),
  });

  const actionTicketMut = useMutation({
    mutationFn: async ({
      id,
      action,
      status,
      adminNotes,
      replyMessage,
    }: {
      id: string;
      action?: string;
      status?: string;
      adminNotes?: string;
      replyMessage?: string;
    }) => {
      const res = await api.post(`/support/platform/tickets/${id}/action`, {
        action,
        status,
        adminNotes,
        replyMessage,
      });
      return res?.data || res;
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || "Ticket action completed.");
      setActivateTarget(null);
      qc.invalidateQueries({ queryKey: ["super-platform-support-tickets"] });
      qc.invalidateQueries({ queryKey: ["super-platform-support-summary"] });
      if (selectedTicketId) {
        qc.invalidateQueries({ queryKey: ["super-platform-support-ticket-detail", selectedTicketId] });
      }
      setReplyText("");
    },
    onError: (e: any) => toast.error(e?.message || "Action failed."),
  });

  const sendReplyMut = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
      const res = await api.post(`/support/platform/tickets/${ticketId}/messages`, { message });
      return res?.data || res;
    },
    onSuccess: () => {
      toast.success("Reply sent to Tenant Admin.");
      setReplyText("");
      qc.invalidateQueries({ queryKey: ["super-platform-support-tickets"] });
      qc.invalidateQueries({ queryKey: ["super-platform-support-summary"] });
      if (selectedTicketId) {
        qc.invalidateQueries({ queryKey: ["super-platform-support-ticket-detail", selectedTicketId] });
      }
    },
    onError: (e: any) => toast.error(e?.message || "Failed to post reply."),
  });

  const deleteTicketMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/support/platform/tickets/${id}`),
    onSuccess: (_data, deletedId) => {
      toast.success("Ticket deleted.");
      setDeleteTarget(null);
      if (selectedTicketId === deletedId) setSelectedTicketId(null);
      qc.invalidateQueries({ queryKey: ["super-platform-support-tickets"] });
      qc.invalidateQueries({ queryKey: ["super-platform-support-summary"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to delete ticket."),
  });

  // Filtered & sorted tickets (with real working Last 7 Days / Last 30 Days filter)
  const filteredTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const nowMs = Date.now();
    const cutoffMs =
      dateRangeFilter === "7d"
        ? nowMs - 7 * 86400000
        : dateRangeFilter === "30d"
        ? nowMs - 30 * 86400000
        : 0;

    return tickets
      .filter((t) => {
        if (cutoffMs > 0) {
          const createdMs = new Date(t.createdAt).getTime();
          if (Number.isNaN(createdMs) || createdMs < cutoffMs) return false;
        }
        if (statusFilter !== "all" && String(t.status || "").toLowerCase() !== statusFilter) {
          return false;
        }
        if (priorityFilter !== "all" && String(t.priority || "").toLowerCase() !== priorityFilter) {
          return false;
        }
        if (typeFilter !== "all") {
          const ticketType = String(t.requestType || "").toLowerCase();
          const filterLower = typeFilter.toLowerCase();
          if (ticketType !== filterLower) return false;
        }
        if (q) {
          const hit =
            String(t.ticketCode || "").toLowerCase().includes(q) ||
            String(t.subject || "").toLowerCase().includes(q) ||
            String(t.targetAddonSlug || "").toLowerCase().includes(q) ||
            String(t.tenant?.name || "").toLowerCase().includes(q) ||
            String(t.requestType || "").toLowerCase().includes(q);
          if (!hit) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "oldest") {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === "subject") {
          return String(a.subject || "").localeCompare(String(b.subject || ""));
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [tickets, searchQuery, statusFilter, priorityFilter, typeFilter, dateRangeFilter, sortBy]);

  const exportCsv = () => {
    if (filteredTickets.length === 0) {
      toast.error("No tickets to export.");
      return;
    }
    const headers = ["Ticket Code", "Subject", "Tenant", "Category", "Target Addon", "Priority", "Status", "Created At"];
    const rows = filteredTickets.map((t) => [
      escapeCsvCell(t.ticketCode),
      escapeCsvCell(t.subject),
      escapeCsvCell(t.tenant?.name || "Organization"),
      escapeCsvCell(resolveRequestTypeMeta(t.requestType).label),
      escapeCsvCell(t.targetAddonSlug || "N/A"),
      escapeCsvCell(t.priority),
      escapeCsvCell(t.status),
      escapeCsvCell(t.createdAt ? new Date(t.createdAt).toISOString() : ""),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `platform_support_tickets_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredTickets.length} tickets to CSV.`);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;
    const assignedAgent = agents.find((a) => a.id === selectedAgentId);
    const finalMessage = assignedAgent
      ? `[Handled by ${assignedAgent.name} — ${assignedAgent.role}]\n${replyText.trim()}`
      : replyText.trim();
    sendReplyMut.mutate({ ticketId: selectedTicket.id, message: finalMessage });
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Platform Support Desk"
        description="Unified cross-tenant support hub for SaaS add-on activations, billing inquiries, access issues, and technical escalations."
        icon={LifeBuoy}
        badge={
          <Badge variant="soft">
            {summary?.openCount ?? 0} Active
          </Badge>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchTickets();
                refetchSummary();
              }}
              disabled={isTicketsFetching}
            >
              <RefreshCw className={`size-3.5 ${isTicketsFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <FileSpreadsheet className="size-3.5 text-emerald-600" />
              Export CSV
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-3.5" />
              New Ticket
            </Button>
          </>
        }
      />

      {/* KPI Metrics Row from /support/platform/summary/stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Platform Tickets"
          value={summary?.totalTickets ?? 0}
          description={`${summary?.openCount ?? 0} currently open / in progress`}
          icon={LifeBuoy}
          variant="primary"
          isLoading={isSummaryLoading}
        />
        <StatCard
          label="Addon & Plan Requests"
          value={summary?.upgradeRequests ?? 0}
          description="1-click entitlement activations"
          icon={Zap}
          variant="purple"
          isLoading={isSummaryLoading}
        />
        <StatCard
          label="Billing & Technical"
          value={`${summary?.billingQueries ?? 0} / ${summary?.technicalIssues ?? 0}`}
          description="Billing inquiries / Technical & API"
          icon={CreditCard}
          variant="info"
          isLoading={isSummaryLoading}
        />
        <StatCard
          label="Resolved Tickets"
          value={summary?.resolvedCount ?? 0}
          description="Closed & resolved across tenants"
          icon={CheckCircle2}
          variant="success"
          isLoading={isSummaryLoading}
        />
      </div>

      {/* Filters Toolbar */}
      <Card className="p-3.5 border border-border/80 rounded-xl bg-card shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative min-w-[210px] flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search code, subject, tenant, addon..."
                className="h-8 text-xs pl-8"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 text-xs w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={dateRangeFilter}
              onValueChange={(v) => setDateRangeFilter(v as "all" | "7d" | "30d")}
            >
              <SelectTrigger className="h-8 text-xs w-36">
                <Calendar className="size-3 mr-1 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as "newest" | "oldest" | "subject")}>
              <SelectTrigger className="h-8 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="subject">Subject (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Main Split: Tickets Table (9 cols) + Real Agents Roster (3 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <Card className="border border-border/80 rounded-xl bg-card shadow-xs xl:col-span-9 overflow-hidden">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold">
                    Ticket &amp; Subject
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold">
                    Tenant
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold">
                    Category
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold">
                    Priority
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold">
                    Status
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isTicketsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-14 text-xs">
                      <Loader2 className="size-5 animate-spin text-primary mx-auto mb-2" />
                      Loading cross-tenant support tickets...
                    </TableCell>
                  </TableRow>
                ) : filteredTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-14 text-xs">
                      No platform support tickets match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTickets.map((t: any) => {
                    const reqMeta = resolveRequestTypeMeta(t.requestType);
                    const TypeIcon = reqMeta.icon;
                    const stMeta = STATUS_BADGE[String(t.status || "open").toLowerCase()] || {
                      variant: "outline" as const,
                      label: t.status || "Open",
                    };
                    const prioVariant = PRIORITY_BADGE[String(t.priority || "medium").toLowerCase()] || "secondary";
                    const canActivateAddon =
                      Boolean(t.targetAddonSlug) &&
                      t.status !== "resolved" &&
                      t.status !== "closed" &&
                      t.superAdminAction !== "addon_activated";

                    return (
                      <TableRow key={t.id} className="hover:bg-muted/40 transition-colors text-xs">
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-primary">{t.ticketCode}</span>
                              {t.targetAddonSlug && (
                                <Badge variant="purple" className="text-[9px] font-mono px-1.5 py-0">
                                  {t.targetAddonSlug.toUpperCase()}
                                </Badge>
                              )}
                            </div>
                            <span className="font-semibold text-foreground block max-w-[260px] truncate">
                              {t.subject}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Building2 className="size-3.5 text-primary shrink-0" />
                            <span className="font-medium text-foreground truncate max-w-[140px]">
                              {t.tenant?.name || "Organization"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] font-semibold gap-1 ${reqMeta.color}`}>
                            <TypeIcon className="size-3" />
                            <span>{reqMeta.label}</span>
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <Badge variant={prioVariant} className="text-[10px] capitalize">
                            {t.priority || "medium"}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <Badge variant={stMeta.variant} className="text-[10px]">
                            {stMeta.label}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {canActivateAddon && (
                              <Button
                                size="xs"
                                variant="soft"
                                onClick={() => setActivateTarget(t)}
                                className="bg-purple-500/10 text-purple-600 border-purple-500/20 hover:bg-purple-500/20"
                              >
                                <Zap className="size-3" />
                                Activate
                              </Button>
                            )}
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => setSelectedTicketId(t.id)}
                            >
                              <MessageSquare className="size-3 text-primary" />
                              Open ({t.messages?.length || 0})
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => setDeleteTarget(t)}
                              className="px-2 text-rose-600 hover:bg-rose-500/10"
                              title="Delete Ticket"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Right Sidebar: Real Support Agents Roster (/super/support/agents) */}
        <Card className="border border-border/80 rounded-xl bg-card shadow-xs xl:col-span-3 h-fit">
          <CardHeader className="p-4 pb-3 border-b border-border/60 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Headphones className="size-4 text-primary" />
              Support Agents
            </CardTitle>
            <Button asChild size="xs" variant="ghost">
              <Link href="/super/agents">
                Manage
                <ExternalLink className="size-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border/60 text-xs">
            {isAgentsLoading ? (
              <div className="p-6 text-center text-muted-foreground">
                <Loader2 className="size-4 animate-spin mx-auto mb-1 text-primary" />
                Loading agents...
              </div>
            ) : agents.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <p>No support agents registered.</p>
                <Button asChild size="xs" variant="soft" className="mt-2">
                  <Link href="/super/agents">Add Agents</Link>
                </Button>
              </div>
            ) : (
              agents.map((agent) => {
                const isAvailable = agent.availability === "Available";
                return (
                  <div key={agent.id} className="p-3.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <div className="size-8 rounded-full bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center border border-primary/20">
                          {agent.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span
                          className={`absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-card ${
                            isAvailable ? "bg-emerald-500" : "bg-muted-foreground/50"
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{agent.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{agent.role}</p>
                      </div>
                    </div>
                    <Badge variant={isAvailable ? "success" : "secondary"} className="text-[9px] shrink-0">
                      {isAvailable ? "Online" : "Away"}
                    </Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── CONVERSATION, STATUS/PRIORITY & ACTION DIALOG ─── */}
      <Dialog
        open={Boolean(selectedTicketId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTicketId(null);
            setReplyText("");
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-between gap-2 pr-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-primary" />
                <span>Ticket {selectedTicket?.ticketCode || "..."}</span>
              </div>
              {selectedTicket && (
                <Badge
                  variant={
                    STATUS_BADGE[String(selectedTicket.status || "open").toLowerCase()]?.variant || "outline"
                  }
                >
                  {STATUS_BADGE[String(selectedTicket.status || "open").toLowerCase()]?.label ||
                    selectedTicket.status}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-foreground">
              {selectedTicket?.tenant?.name || "Organization"} — {selectedTicket?.subject}
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4 py-1 text-xs">
              {/* Inline Status, Priority & Real Agent Selector Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/40 border border-border/60">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Status</Label>
                  <Select
                    value={String(selectedTicket.status || "open").toLowerCase()}
                    onValueChange={(val) =>
                      updateTicketMut.mutate({ id: selectedTicket.id, status: val })
                    }
                    disabled={updateTicketMut.isPending}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Priority</Label>
                  <Select
                    value={String(selectedTicket.priority || "medium").toLowerCase()}
                    onValueChange={(val) =>
                      updateTicketMut.mutate({ id: selectedTicket.id, priority: val })
                    }
                    disabled={updateTicketMut.isPending}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Responding Agent</Label>
                  <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Select agent..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Super Admin (Default)</SelectItem>
                      {agents.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} ({a.availability === "Available" ? "Online" : "Away"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 1-Click Add-on Activation Box */}
              {selectedTicket.targetAddonSlug && (
                <div className="p-3 rounded-xl border bg-purple-500/5 border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="font-bold text-purple-700 dark:text-purple-300 block">
                      Requested Add-on: {selectedTicket.targetAddonSlug.toUpperCase()}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Provision entitlement directly for {selectedTicket.tenant?.name || "this workspace"} with audit trail.
                    </span>
                  </div>

                  {selectedTicket.status !== "resolved" &&
                  selectedTicket.superAdminAction !== "addon_activated" ? (
                    <Button
                      size="xs"
                      variant="primary"
                      onClick={() => setActivateTarget(selectedTicket)}
                      disabled={actionTicketMut.isPending}
                      className="bg-purple-600 hover:bg-purple-700 text-white shrink-0"
                    >
                      <Zap className="size-3" />
                      1-Click Activate
                    </Button>
                  ) : (
                    <Badge variant="success" className="shrink-0">
                      Module Active
                    </Badge>
                  )}
                </div>
              )}

              {/* Chat Thread */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {(selectedTicket.messages || []).length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">No messages in this thread yet.</p>
                ) : (
                  (selectedTicket.messages || []).map((m: any) => {
                    const isSuper = m.senderType === "super_admin";
                    return (
                      <div
                        key={m.id}
                        className={`p-3 rounded-xl border text-xs leading-relaxed space-y-1 ${
                          isSuper
                            ? "bg-primary/5 border-primary/20 ml-6"
                            : "bg-muted/30 border-border/70 mr-6"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="font-bold flex items-center gap-1.5 text-foreground">
                            {isSuper ? (
                              <ShieldCheck className="size-3 text-primary" />
                            ) : (
                              <Building2 className="size-3 text-muted-foreground" />
                            )}
                            <span>{m.senderName}</span>
                            {isSuper && (
                              <Badge variant="soft" className="text-[9px] px-1.5 py-0">
                                Platform Team
                              </Badge>
                            )}
                          </span>
                          <span className="font-mono">
                            {m.createdAt
                              ? new Date(m.createdAt).toLocaleString([], {
                                  month: "short",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-foreground pt-0.5">{m.message}</p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reply Input */}
              <form onSubmit={handleSendReply} className="flex items-center gap-2 pt-2 border-t border-border/60">
                <Input
                  placeholder="Type official response to Tenant Admin..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="h-9 text-xs"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  disabled={sendReplyMut.isPending || !replyText.trim()}
                >
                  {sendReplyMut.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                  Reply
                </Button>
              </form>
            </div>
          )}

          <DialogFooter className="gap-2 flex-wrap pt-2 border-t border-border/60">
            {selectedTicket && selectedTicket.status !== "resolved" && (
              <Button
                size="sm"
                variant="success"
                onClick={() => actionTicketMut.mutate({ id: selectedTicket.id, status: "resolved" })}
                disabled={actionTicketMut.isPending}
                className="mr-auto"
              >
                <CheckCircle2 className="size-3.5" />
                Mark Resolved
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setSelectedTicketId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── CREATE TICKET DIALOG ─── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Raise Platform Support Ticket</DialogTitle>
            <DialogDescription className="text-xs">
              Create a support or add-on activation ticket on behalf of a tenant workspace.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTicket.tenantId) {
                toast.error("Please select a tenant organization.");
                return;
              }
              if (!newTicket.subject.trim()) {
                toast.error("Subject is required.");
                return;
              }
              createTicketMut.mutate(newTicket);
            }}
            className="space-y-3.5 text-xs"
          >
            <div className="space-y-1">
              <Label>Tenant Organization *</Label>
              <Select
                value={newTicket.tenantId}
                onValueChange={(val) => setNewTicket({ ...newTicket, tenantId: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select tenant workspace..." />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Subject *</Label>
              <Input
                placeholder="Brief summary of the request or issue"
                value={newTicket.subject}
                onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Category</Label>
                <Select
                  value={newTicket.requestType}
                  onValueChange={(val) => setNewTicket({ ...newTicket, requestType: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.filter((o) => o.value !== "all").map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Priority</Label>
                <Select
                  value={newTicket.priority}
                  onValueChange={(val) => setNewTicket({ ...newTicket, priority: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(newTicket.requestType === "addon_upgrade" ||
              newTicket.requestType === "Plan / Subscription Issues") && (
              <div className="space-y-1">
                <Label>Target Add-on Slug (Optional)</Label>
                <Input
                  placeholder="e.g. payroll, biometric, recruitment"
                  value={newTicket.targetAddonSlug}
                  onChange={(e) => setNewTicket({ ...newTicket, targetAddonSlug: e.target.value })}
                  className="font-mono"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label>Initial Message</Label>
              <Textarea
                rows={3}
                placeholder="Describe details or context for the tenant..."
                value={newTicket.message}
                onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={createTicketMut.isPending}>
                {createTicketMut.isPending && <Loader2 className="size-3.5 animate-spin" />}
                Create Ticket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── CONFIRM 1-CLICK ADDON ACTIVATION ─── */}
      <ConfirmationDialog
        open={Boolean(activateTarget)}
        onOpenChange={(open) => !open && !actionTicketMut.isPending && setActivateTarget(null)}
        title="Activate Add-on Entitlement?"
        description={
          activateTarget ? (
            <>
              Enable <strong className="font-mono text-foreground">{activateTarget.targetAddonSlug?.toUpperCase()}</strong> for{" "}
              <strong className="text-foreground">{activateTarget.tenant?.name || "this workspace"}</strong> and mark ticket{" "}
              <span className="font-mono">{activateTarget.ticketCode}</span> as resolved?
            </>
          ) : undefined
        }
        confirmLabel="Activate Entitlement"
        variant="default"
        icon={<Zap className="size-5" />}
        isLoading={actionTicketMut.isPending}
        onConfirm={() => {
          if (activateTarget) {
            actionTicketMut.mutate({ id: activateTarget.id, action: "activate_addon" });
          }
        }}
      />

      {/* ─── CONFIRM DELETE TICKET ─── */}
      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && !deleteTicketMut.isPending && setDeleteTarget(null)}
        title="Delete Support Ticket?"
        description={
          deleteTarget ? (
            <>
              Permanently delete ticket <strong className="font-mono text-foreground">{deleteTarget.ticketCode}</strong> (
              {deleteTarget.subject}) and its conversation history?
            </>
          ) : undefined
        }
        confirmLabel="Delete Ticket"
        variant="destructive"
        isLoading={deleteTicketMut.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteTicketMut.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}

export default SupportDeskAdmin;
