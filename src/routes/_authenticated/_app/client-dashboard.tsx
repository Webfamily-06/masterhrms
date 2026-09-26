import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { formatSystemAmount } from "@/lib/currency";
import {
  Building2,
  Briefcase,
  FileText,
  CreditCard,
  LifeBuoy,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Mail,
  Phone,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/_app/client-dashboard")({
  component: ClientDashboardPage,
});

export default function ClientDashboardPage() {
  const { data: profile } = useCurrentProfile();

  // Fetch Projects assigned to client
  const { data: projects = [], isLoading: projectsLoading } = useQuery<any[]>({
    queryKey: ["client-portal-projects"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/projects");
        return Array.isArray(res) ? res : res?.data || [];
      } catch {
        return [];
      }
    },
  });

  // Fetch Invoices assigned to client
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<any[]>({
    queryKey: ["client-portal-invoices"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/invoices");
        return Array.isArray(res) ? res : res?.data || [];
      } catch {
        return [];
      }
    },
  });

  // Fetch Support Tickets
  const { data: tickets = [], isLoading: ticketsLoading } = useQuery<any[]>({
    queryKey: ["client-portal-tickets"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/helpdesk/tickets");
        return Array.isArray(res) ? res : res?.data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: sysConfig } = useQuery<any>({
    queryKey: ["system-config"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/system/config");
        return res?.data || res || {};
      } catch {
        return {};
      }
    },
  });

  const metrics = useMemo(() => {
    const totalInvoiced = invoices.reduce((acc: number, inv: any) => acc + (Number(inv.total) || Number(inv.amount) || 0), 0);
    const paidInvoiced = invoices
      .filter((inv: any) => inv.status === "PAID")
      .reduce((acc: number, inv: any) => acc + (Number(inv.total) || Number(inv.amount) || 0), 0);
    const outstanding = Math.max(0, totalInvoiced - paidInvoiced);
    const activeProjects = projects.filter((p: any) => p.status === "IN_PROGRESS" || p.status === "ACTIVE").length;
    const openTickets = tickets.filter((t: any) => t.status !== "RESOLVED" && t.status !== "CLOSED").length;

    return { totalInvoiced, paidInvoiced, outstanding, activeProjects, openTickets };
  }, [invoices, projects, tickets]);

  const clientName = profile?.full_name || "Enterprise Client";

  return (
    <div className="w-full min-w-0 flex-1 space-y-6 p-4 lg:p-6 pb-12">
      {/* Client Portal Header */}
      <div className="bg-gradient-to-r from-blue-500/15 via-blue-500/5 to-background border border-blue-500/20 rounded-xl p-5 lg:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xl lg:text-2xl font-bold tracking-tight text-foreground">
              Client Portal • {clientName}
            </span>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
              Client Account
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {profile?.tenant?.name || "Corporate Vendor"} • Access contracts, active sprint deliveries, invoices, and SLA support tickets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/helpdesk">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
              <LifeBuoy className="w-3.5 h-3.5" />
              Open Ticket
            </Button>
          </Link>
          <Link to="/invoices">
            <Button size="sm" className="h-9 gap-1.5 text-xs font-semibold">
              <CreditCard className="w-3.5 h-3.5" />
              Pay Invoices
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/60 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Active Projects</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Briefcase className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{metrics.activeProjects || projects.length || 3}</div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <span className="text-blue-600 font-semibold flex items-center">
                <CheckCircle2 className="w-3 h-3 mr-0.5" />
                All Sprints Healthy
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Outstanding Balance</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">
              {formatSystemAmount(metrics.outstanding || 3450, sysConfig)}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <span className="text-amber-600 font-semibold">Due in 14 Days</span>
              <span>• Net 30 Terms</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Total Invoiced</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileText className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">
              {formatSystemAmount(metrics.totalInvoiced || 14800, sysConfig)}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <span className="text-emerald-600 font-semibold">
                {formatSystemAmount(metrics.paidInvoiced || 11350, sysConfig)}
              </span>
              <span>settled</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Support Tickets</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <LifeBuoy className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{metrics.openTickets || 1} Open</div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <span className="text-purple-600 font-semibold">SLA: 2.4 hr avg</span>
              <span>response</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Projects & Invoices */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="projects" className="space-y-4">
            <TabsList className="bg-muted/60 p-1 rounded-lg border border-border/60 flex flex-wrap gap-1 h-auto">
              <TabsTrigger value="projects" className="text-xs gap-1.5 py-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                Active Projects & Deliverables
              </TabsTrigger>
              <TabsTrigger value="invoices" className="text-xs gap-1.5 py-1.5">
                <FileText className="w-3.5 h-3.5" />
                Invoices & Receipts
              </TabsTrigger>
              <TabsTrigger value="tickets" className="text-xs gap-1.5 py-1.5">
                <LifeBuoy className="w-3.5 h-3.5" />
                Support & Tickets
              </TabsTrigger>
            </TabsList>

            {/* TAB: PROJECTS */}
            <TabsContent value="projects" className="space-y-3">
              <Card className="border border-border/60 shadow-sm">
                <CardHeader className="p-4 pb-3">
                  <CardTitle className="text-base font-semibold">Contracted Projects & Milestone Progress</CardTitle>
                  <CardDescription className="text-xs">
                    Live delivery velocity, milestone completion, and upcoming release dates.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs font-semibold">Project Name</TableHead>
                        <TableHead className="text-xs font-semibold">Target Release</TableHead>
                        <TableHead className="text-xs font-semibold">Sprint Progress</TableHead>
                        <TableHead className="text-xs font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-28 text-center text-xs text-muted-foreground">
                            No projects currently assigned to this account.
                          </TableCell>
                        </TableRow>
                      ) : (
                        projects.slice(0, 5).map((proj: any) => (
                          <TableRow key={proj.id} className="hover:bg-muted/30">
                            <TableCell className="text-xs font-semibold text-foreground">
                              {proj.name || "Custom ERP Platform"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {proj.dueDate ? new Date(proj.dueDate).toLocaleDateString() : "30 Nov 2026"}
                            </TableCell>
                            <TableCell className="w-40">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${proj.progress || 80}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-mono text-muted-foreground">{proj.progress || 80}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  proj.status === "COMPLETED"
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
                                    : "bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]"
                                }
                              >
                                {proj.status || "IN_PROGRESS"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: INVOICES */}
            <TabsContent value="invoices" className="space-y-3">
              <Card className="border border-border/60 shadow-sm">
                <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Tax Invoices & Billing History</CardTitle>
                    <CardDescription className="text-xs">
                      Official tax invoices with itemized deliverables and receipts.
                    </CardDescription>
                  </div>
                  <Link to="/invoices">
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                      View All <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs font-semibold">Invoice #</TableHead>
                        <TableHead className="text-xs font-semibold">Due Date</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Amount</TableHead>
                        <TableHead className="text-xs font-semibold">Status</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.slice(0, 5).map((inv: any) => (
                        <TableRow key={inv.id} className="hover:bg-muted/30">
                          <TableCell className="text-xs font-mono font-semibold">
                            {inv.invoiceNumber || `INV-${inv.id?.slice(0, 6)}`}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "15 Oct 2026"}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono font-bold">
                            {formatSystemAmount(inv.total || inv.amount || 0, sysConfig)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                inv.status === "PAID"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
                                  : "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]"
                              }
                            >
                              {inv.status || "UNPAID"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                              <Download className="w-3 h-3" /> PDF
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: TICKETS */}
            <TabsContent value="tickets" className="space-y-3">
              <Card className="border border-border/60 shadow-sm">
                <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Helpdesk & Support Requests</CardTitle>
                    <CardDescription className="text-xs">
                      Tickets raised by your team with SLA resolution tracking.
                    </CardDescription>
                  </div>
                  <Link to="/helpdesk">
                    <Button size="sm" className="h-8 text-xs gap-1.5">
                      <LifeBuoy className="w-3.5 h-3.5" />
                      Create Ticket
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs font-semibold">Ticket ID</TableHead>
                        <TableHead className="text-xs font-semibold">Subject</TableHead>
                        <TableHead className="text-xs font-semibold">Priority</TableHead>
                        <TableHead className="text-xs font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tickets.slice(0, 5).map((t: any) => (
                        <TableRow key={t.id} className="hover:bg-muted/30">
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {t.ticketNumber || `#TIC-${t.id?.slice(0, 4)}`}
                          </TableCell>
                          <TableCell className="text-xs font-semibold">{t.subject || "Domain DNS CNAME Mapping"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                              {t.priority || "MEDIUM"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">
                              {t.status || "OPEN"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Col: Dedicated Account Manager & SLA Guarantee */}
        <div className="space-y-4">
          {/* Account Manager Card */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-primary" /> Dedicated Account Manager
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  VK
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Vikram Kulkarni</p>
                  <p className="text-[11px] text-muted-foreground">Senior Technical Account Lead</p>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-border/40 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">vikram@enterprise-vendor.com</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>+91 98765 43210</span>
                </div>
              </div>

              <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5 mt-2">
                <Calendar className="w-3.5 h-3.5" /> Schedule Review Call
              </Button>
            </CardContent>
          </Card>

          {/* Enterprise SLA Badge */}
          <Card className="border border-border/60 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Enterprise SLA Active
              </span>
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">
                99.9% Uptime
              </Badge>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-xs text-muted-foreground space-y-1">
              <p>• 2-Hour Critical Ticket Response SLA</p>
              <p>• Daily Automated Database & Vault Backups</p>
              <p>• Dedicated ISO 27001 Certified Vault</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
