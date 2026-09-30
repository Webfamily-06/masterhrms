import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile, useSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  LifeBuoy,
  Download,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  ShieldCheck,
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
  const slaCompliance = stats?.slaCompliance ?? (totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 100);
  const criticalCount = tickets.filter((t) => t.priority === "critical" || t.priority === "high").length;

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
    <div className="space-y-6">
      {/* Top Header / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Ticket Report
          </h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <span>Tickets</span>
            <span>/</span>
            <span className="text-foreground font-medium">Ticket Report</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={exportCSV}
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs font-semibold shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI 6-Grid Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border border-border/80 shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Total Tickets</p>
                <h4 className="text-xl font-bold mt-0.5">{totalCount}</h4>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600">
                <LifeBuoy className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">All time logged</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Open Tickets</p>
                <h4 className="text-xl font-bold mt-0.5">{openCount}</h4>
              </div>
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[10px] text-amber-600 font-medium mt-2">Needs triage</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">In Progress</p>
                <h4 className="text-xl font-bold mt-0.5">{inProgressCount}</h4>
              </div>
              <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-950/60 flex items-center justify-center text-sky-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[10px] text-sky-600 font-medium mt-2">Under review</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Resolved</p>
                <h4 className="text-xl font-bold mt-0.5">{resolvedCount}</h4>
              </div>
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[10px] text-emerald-600 font-medium mt-2">Successfully closed</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">SLA Health</p>
                <h4 className="text-xl font-bold mt-0.5">{slaCompliance}%</h4>
              </div>
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[10px] text-indigo-600 font-medium mt-2">Target &gt; 90%</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">High / Critical</p>
                <h4 className="text-xl font-bold mt-0.5">{criticalCount}</h4>
              </div>
              <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[10px] text-rose-600 font-medium mt-2">Priority attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Ticket Table Card */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="p-4 sm:p-5 border-b pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">Support Tickets Registry</CardTitle>
              <Badge variant="outline" className="text-xs">
                {filtered.length} records
              </Badge>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-48 sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search code, requester, title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
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

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-28 text-xs font-semibold">Ticket ID</TableHead>
                  <TableHead className="text-xs font-semibold">Issue / Title</TableHead>
                  <TableHead className="text-xs font-semibold">Requester</TableHead>
                  <TableHead className="text-xs font-semibold">Department</TableHead>
                  <TableHead className="text-xs font-semibold">Category</TableHead>
                  <TableHead className="text-xs font-semibold">Created Date</TableHead>
                  <TableHead className="text-xs font-semibold">Priority</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                      Loading tickets...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                      No support tickets found matching filter criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((t) => (
                    <TableRow key={t.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-primary">
                        {t.ticketCode}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-xs text-foreground">{t.title}</div>
                        {t.description && (
                          <div className="text-[11px] text-muted-foreground line-clamp-1">
                            {t.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {t.employee ? `${t.employee.firstName} ${t.employee.lastName}` : "Organization Staff"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {t.employee?.department?.name || "General"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px] font-normal">
                          {t.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(t.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        {getPriorityBadge(t.priority)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(t.status)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
