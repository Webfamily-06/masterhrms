import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile, useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatsOverviewGrid } from "@/components/ui/stats-overview-grid";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import {
  LifeBuoy,
  Download,
  CheckCircle2,
  Clock,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/ticket-reports")({
  component: TicketReportsPage,
});

interface HelpdeskTicketItem {
  id: string;
  ticketCode: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    department?: {
      name: string;
    };
  };
}

export function TicketReportsPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";

  // Filter states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Fetch Tickets
  const { data: rawTickets = [], isLoading } = useQuery({
    queryKey: ["helpdesk-tickets-report", tenantId],
    queryFn: async () => {
      try {
        const res: any = await api.get("/helpdesk/tickets");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // Fetch Stats
  const { data: stats } = useQuery({
    queryKey: ["helpdesk-stats-report", tenantId],
    queryFn: async () => {
      try {
        return await api.get("/helpdesk/summary/stats");
      } catch {
        return null;
      }
    },
  });

  const tickets: HelpdeskTicketItem[] = useMemo(() => {
    return rawTickets.map((t: any) => ({
      id: t.id,
      ticketCode: t.ticketCode || `TCK-${String(t.id).slice(0, 6).toUpperCase()}`,
      title: t.title || "Support Request",
      description: t.description || "",
      category: t.category || "General",
      priority: t.priority || "medium",
      status: t.status || "open",
      createdAt: t.createdAt || new Date().toISOString(),
      employee: t.employee,
    }));
  }, [rawTickets]);

  // Client Filtered Tickets
  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      const matchSearch =
        t.ticketCode.toLowerCase().includes(search.toLowerCase()) ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        (t.employee &&
          `${t.employee.firstName} ${t.employee.lastName}`
            .toLowerCase()
            .includes(search.toLowerCase()));

      const matchStatus = statusFilter === "all" ? true : t.status === statusFilter;
      const matchPriority = priorityFilter === "all" ? true : t.priority === priorityFilter;

      return matchSearch && matchStatus && matchPriority;
    });
  }, [tickets, search, statusFilter, priorityFilter]);

  // Metrics
  const totalCount = tickets.length;
  const openCount = stats?.openCount ?? tickets.filter((t) => t.status === "open").length;
  const inProgressCount = stats?.inProgressCount ?? tickets.filter((t) => t.status === "in_progress").length;
  const resolvedCount = stats?.resolvedCount ?? tickets.filter((t) => t.status === "resolved" || t.status === "closed").length;

  function exportCSV() {
    if (filtered.length === 0) return toast.error("No tickets to export");
    const headers = [
      "Ticket Code",
      "Title",
      "Category",
      "Priority",
      "Requester",
      "Department",
      "Date Created",
      "Status",
    ];

    const rows = filtered.map((t) => [
      `"${t.ticketCode}"`,
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.category}"`,
      t.priority,
      `"${t.employee ? `${t.employee.firstName} ${t.employee.lastName}` : "Staff"}"`,
      `"${t.employee?.department?.name || "General"}"`,
      new Date(t.createdAt).toISOString().slice(0, 10),
      t.status,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r: (string | number)[]) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `ticket-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Ticket report exported successfully!");
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "critical":
        return <Badge className="bg-rose-600 text-white">Critical</Badge>;
      case "high":
        return <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">High</Badge>;
      case "medium":
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">Medium</Badge>;
      case "low":
      default:
        return <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">Low</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "resolved":
      case "closed":
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">Resolved</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">In Progress</Badge>;
      case "open":
      default:
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">Open</Badge>;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <PageHeader
        title="Ticket Report"
        description="Omnichannel support requests, SLA compliance, and helpdesk resolutions."
        breadcrumbs={[
          { label: "Home" },
          { label: "Tickets" },
          { label: "Ticket Report" },
        ]}
        actions={
          <Button
            onClick={exportCSV}
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs font-semibold shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            Export CSV
          </Button>
        }
      />

      {/* ── KPI Metric Cards ── */}
      <StatsOverviewGrid columns={4}>
        <StatCard
          label="Total Tickets"
          value={totalCount}
          icon={<LifeBuoy className="w-5 h-5" />}
          variant="default"
          isLoading={isLoading}
        />
        <StatCard
          label="Open Tickets"
          value={openCount}
          icon={<Clock className="w-5 h-5" />}
          variant="warning"
          isLoading={isLoading}
        />
        <StatCard
          label="In Progress"
          value={inProgressCount}
          icon={<TrendingUp className="w-5 h-5" />}
          variant="info"
          isLoading={isLoading}
        />
        <StatCard
          label="Resolved"
          value={resolvedCount}
          icon={<CheckCircle2 className="w-5 h-5" />}
          variant="success"
          isLoading={isLoading}
        />
      </StatsOverviewGrid>

      {/* ── Filter Toolbar ── */}
      <FilterToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search code, requester, title...",
        }}
        filters={
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-8.5 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[130px] h-8.5 text-xs">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* ── Support Tickets Table ── */}
      <div className="rounded-xl border border-border/70 bg-card shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Ticket Code</TableHead>
                <TableHead>Title & Description</TableHead>
                <TableHead className="w-28">Category</TableHead>
                <TableHead className="w-24">Priority</TableHead>
                <TableHead className="w-36">Requester</TableHead>
                <TableHead className="w-28">Department</TableHead>
                <TableHead className="w-28">Created</TableHead>
                <TableHead className="w-28">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                    Loading ticket reports...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                    No tickets found matching the specified filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t) => (
                  <TableRow key={t.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-semibold text-primary">
                      {t.ticketCode}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5 max-w-sm sm:max-w-md">
                        <div className="text-xs font-medium text-foreground truncate">{t.title}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{t.description}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.category}</TableCell>
                    <TableCell>{getPriorityBadge(t.priority)}</TableCell>
                    <TableCell className="text-xs font-medium">
                      {t.employee ? `${t.employee.firstName} ${t.employee.lastName}` : "Staff Member"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t.employee?.department?.name || "General"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(t.status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
