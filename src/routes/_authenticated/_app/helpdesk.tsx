import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile, useSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Send,
  User,
  Laptop,
  Wallet,
  Calendar,
  Building2,
  ShieldAlert,
  Flame,
  HelpCircle,
  Check,
  X,
  Trash2,
  Eye,
  Filter,
  ShieldCheck,
  Sparkles,
  BarChart3,
  Layers,
  Edit2,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/helpdesk")({
  component: HelpdeskPage,
  head: () => ({ meta: [{ title: "Employee Helpdesk & Support Tickets — Master HRMS" }] }),
});

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  urgent: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/30", icon: Flame },
  high: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30", icon: AlertCircle },
  medium: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30", icon: Clock },
  low: { bg: "bg-muted", text: "text-muted-foreground", border: "border-border", icon: HelpCircle },
};

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  open: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30", label: "Open" },
  in_progress: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30", label: "In Progress" },
  resolved: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30", label: "Resolved" },
  closed: { bg: "bg-muted", text: "text-muted-foreground", border: "border-border", label: "Closed" },
};

export type SlaPolicy = {
  id: string;
  priority: "urgent" | "high" | "medium" | "low";
  description: string;
  firstResponseTime: string;
  resolutionTime: string;
  escalationTime: string;
  escalatesTo: string;
};

const DEFAULT_SLA_POLICIES: SlaPolicy[] = [
  {
    id: "sla-1",
    priority: "urgent",
    description: "System-wide outage or payroll blocker affecting all staff",
    firstResponseTime: "30 Minutes",
    resolutionTime: "2 – 4 Hours",
    escalationTime: "1 Hour",
    escalatesTo: "Engineering & IT Lead",
  },
  {
    id: "sla-2",
    priority: "high",
    description: "Hardware crash, employee access loss, or critical bug",
    firstResponseTime: "1 Hour",
    resolutionTime: "8 Hours",
    escalationTime: "2 Hours",
    escalatesTo: "Support Supervisor",
  },
  {
    id: "sla-3",
    priority: "medium",
    description: "Standard software requests, leave queries, or policy clarification",
    firstResponseTime: "4 Hours",
    resolutionTime: "24 Hours",
    escalationTime: "8 Hours",
    escalatesTo: "HR Operations Officer",
  },
  {
    id: "sla-4",
    priority: "low",
    description: "General questions, documentation feedback, or asset info",
    firstResponseTime: "12 Hours",
    resolutionTime: "48 Hours",
    escalationTime: "24 Hours",
    escalatesTo: "Helpdesk Queue",
  },
];

export function HelpdeskPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"tickets" | "dashboard" | "sla">("tickets");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");

  // Modals
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [selectedTicketPassport, setSelectedTicketPassport] = useState<any>(null);
  const [commentText, setCommentText] = useState("");

  // SLA State
  const [slaPolicies, setSlaPolicies] = useState<SlaPolicy[]>(() => {
    const saved = localStorage.getItem(`hrms_sla_policies_${tenantId}`);
    return saved ? JSON.parse(saved) : DEFAULT_SLA_POLICIES;
  });
  const [isSlaModalOpen, setIsSlaModalOpen] = useState(false);
  const [editingSla, setEditingSla] = useState<SlaPolicy | null>(null);
  const [slaForm, setSlaForm] = useState({
    priority: "medium" as SlaPolicy["priority"],
    description: "",
    firstResponseTime: "4 Hours",
    resolutionTime: "24 Hours",
    escalationTime: "8 Hours",
    escalatesTo: "Helpdesk Manager",
  });

  function saveSlaPolicies(newPolicies: SlaPolicy[]) {
    setSlaPolicies(newPolicies);
    localStorage.setItem(`hrms_sla_policies_${tenantId}`, JSON.stringify(newPolicies));
  }

  // Forms
  const [ticketForm, setTicketForm] = useState({
    employeeId: "",
    subject: "",
    category: "IT & Hardware",
    priority: "medium",
    description: "",
  });

  // Queries
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      try {
        const res = await api.get("/employees");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: tickets = [], isLoading: isTicketsLoading } = useQuery({
    queryKey: ["helpdesk-tickets", tenantId, selectedCategoryFilter, selectedPriorityFilter, selectedStatusFilter, searchQuery],
    queryFn: async () => {
      try {
        let url = `/helpdesk/tickets?category=${selectedCategoryFilter}&priority=${selectedPriorityFilter}&status=${selectedStatusFilter}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
        const res = await api.get(url);
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: summary } = useQuery({
    queryKey: ["helpdesk-summary", tenantId],
    queryFn: async () => {
      try {
        return await api.get("/helpdesk/summary/stats");
      } catch {
        return { totalTickets: 0, openCount: 0, inProgressCount: 0, resolvedCount: 0, slaCompliance: 100 };
      }
    },
  });

  // Mutations
  const createTicketMut = useMutation({
    mutationFn: async (payload: any) => api.post("/helpdesk/tickets", payload),
    onSuccess: () => {
      toast.success("Helpdesk ticket submitted successfully!");
      qc.invalidateQueries({ queryKey: ["helpdesk-tickets"] });
      qc.invalidateQueries({ queryKey: ["helpdesk-summary"] });
      setIsCreateTicketOpen(false);
      resetTicketForm();
    },
    onError: (e: any) => toast.error(e.message || "Failed to create ticket"),
  });

  const addCommentMut = useMutation({
    mutationFn: async ({ ticketId, message, isStaff }: { ticketId: string; message: string; isStaff: boolean }) =>
      api.post(`/helpdesk/tickets/${ticketId}/comments`, { message, isStaff }),
    onSuccess: () => {
      toast.success("Reply added to ticket thread");
      qc.invalidateQueries({ queryKey: ["helpdesk-tickets"] });
      setCommentText("");
    },
    onError: (e: any) => toast.error(e.message || "Failed to post reply"),
  });

  const updateStatusMut = useMutation({
    mutationFn: async ({ id, status, resolutionNotes }: { id: string; status: string; resolutionNotes?: string }) =>
      api.put(`/helpdesk/tickets/${id}/status`, { status, resolutionNotes }),
    onSuccess: (res: any) => {
      toast.success(res.message || "Ticket status updated!");
      qc.invalidateQueries({ queryKey: ["helpdesk-tickets"] });
      qc.invalidateQueries({ queryKey: ["helpdesk-summary"] });
      if (selectedTicketPassport) {
        setSelectedTicketPassport(res.ticket);
      }
    },
    onError: (e: any) => toast.error(e.message || "Failed to update ticket status"),
  });

  const deleteTicketMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/helpdesk/tickets/${id}`),
    onSuccess: () => {
      toast.success("Ticket deleted");
      qc.invalidateQueries({ queryKey: ["helpdesk-tickets"] });
      qc.invalidateQueries({ queryKey: ["helpdesk-summary"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete ticket"),
  });

  function resetTicketForm() {
    setTicketForm({
      employeeId: employees[0]?.id || "",
      subject: "",
      category: "IT & Hardware",
      priority: "medium",
      description: "",
    });
  }

  function handleSaveSla() {
    if (!slaForm.description.trim()) return toast.error("Description is required");
    if (editingSla) {
      const updated = slaPolicies.map((s) => (s.id === editingSla.id ? { ...s, ...slaForm } : s));
      saveSlaPolicies(updated);
      toast.success("SLA policy updated.");
    } else {
      const newSla: SlaPolicy = {
        id: `sla-${Date.now()}`,
        ...slaForm,
      };
      saveSlaPolicies([...slaPolicies, newSla]);
      toast.success("New SLA policy defined.");
    }
    setIsSlaModalOpen(false);
  }

  function handleDeleteSla(id: string) {
    saveSlaPolicies(slaPolicies.filter((s) => s.id !== id));
    toast.success("SLA policy removed.");
  }

  return (
    <div className="space-y-6 max-w-full pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <LifeBuoy className="size-6 text-primary" /> Internal Helpdesk & Employee Support
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Internal organization support ticketing for IT hardware, payroll queries, leave policies, and facility issues with SLA tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === "tickets" && (
            <Button
              size="sm"
              onClick={() => {
                resetTicketForm();
                setIsCreateTicketOpen(true);
              }}
              className="text-xs font-bold h-8 shadow-sm gap-1.5 bg-primary text-primary-foreground"
            >
              <Plus className="size-3.5" />
              <span>Raise Internal Ticket</span>
            </Button>
          )}

          {activeTab === "sla" && (
            <Button
              size="sm"
              onClick={() => {
                setEditingSla(null);
                setSlaForm({
                  priority: "medium",
                  description: "",
                  firstResponseTime: "4 Hours",
                  resolutionTime: "24 Hours",
                  escalationTime: "8 Hours",
                  escalatesTo: "Helpdesk Manager",
                });
                setIsSlaModalOpen(true);
              }}
              className="text-xs font-bold h-8 shadow-sm gap-1.5 bg-primary text-primary-foreground"
            >
              <Plus className="size-3.5" />
              <span>Add SLA Policy</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full sm:w-auto h-10 bg-secondary/50 p-1 border">
          <TabsTrigger value="tickets" className="text-xs font-bold gap-2">
            <LifeBuoy className="size-3.5" /> Active Tickets ({tickets.length})
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="text-xs font-bold gap-2">
            <BarChart3 className="size-3.5" /> Help Desk Dashboard
          </TabsTrigger>
          <TabsTrigger value="sla" className="text-xs font-bold gap-2">
            <ShieldCheck className="size-3.5" /> SLA Policies ({slaPolicies.length})
          </TabsTrigger>
        </TabsList>

        {/* ===================== TAB 1: TICKETS ===================== */}
        <TabsContent value="tickets" className="space-y-6">
          {/* Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                <LifeBuoy className="size-3.5 text-blue-500" /> Total Tickets
              </span>
              <div className="text-xl font-black font-mono text-foreground">
                {summary?.totalTickets || tickets.length} Total
              </div>
            </Card>

            <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                <Clock className="size-3.5 text-amber-500" /> Open Tickets
              </span>
              <div className="text-xl font-black font-mono text-amber-600">
                {summary?.openCount || 0} Open
              </div>
            </Card>

            <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                <AlertCircle className="size-3.5 text-blue-500" /> In Progress
              </span>
              <div className="text-xl font-black font-mono text-blue-600">
                {summary?.inProgressCount || 0} Active
              </div>
            </Card>

            <Card className="p-3.5 border shadow-2xs bg-card space-y-1 bg-emerald-500/5 border-emerald-500/20">
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5" /> SLA Compliance
              </span>
              <div className="text-xl font-black font-mono text-emerald-600">
                {summary?.slaCompliance || 100}% Resolved
              </div>
            </Card>
          </div>

          {/* Filters Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-2 rounded-xl border">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search code, subject, staff..."
                  className="h-7 text-xs pl-8 w-48 sm:w-56 bg-background"
                />
              </div>

              <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                <SelectTrigger className="h-7 text-xs w-44 bg-background">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="IT & Hardware">IT & Hardware</SelectItem>
                  <SelectItem value="Payroll & Salary">Payroll & Salary</SelectItem>
                  <SelectItem value="Leave & Attendance">Leave & Attendance</SelectItem>
                  <SelectItem value="HR Policies">HR Policies</SelectItem>
                  <SelectItem value="Workplace & Facilities">Workplace & Facilities</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedPriorityFilter} onValueChange={setSelectedPriorityFilter}>
                <SelectTrigger className="h-7 text-xs w-32 bg-background">
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
            </div>

            <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
              <SelectTrigger className="h-7 text-xs w-36 bg-background">
                <SelectValue placeholder="All Statuses" />
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

          {/* Tickets Table */}
          <Card className="border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead className="text-xs">Ticket Code & Subject</TableHead>
                    <TableHead className="text-xs">Requester Staff</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs">Priority</TableHead>
                    <TableHead className="text-xs">Assigned Agent</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isTicketsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-12 text-xs">
                        Loading helpdesk tickets...
                      </TableCell>
                    </TableRow>
                  ) : tickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-12 text-xs italic">
                        No tickets found. Click "Raise Internal Ticket" to submit a request.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tickets.map((t: any) => {
                      const pri = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium;
                      const st = STATUS_CONFIG[t.status] || STATUS_CONFIG.open;
                      const PriIcon = pri.icon;

                      return (
                        <TableRow key={t.id} className="hover:bg-muted/20 text-xs">
                          <TableCell>
                            <div>
                              <span className="font-mono font-black text-primary block">{t.ticketCode}</span>
                              <span className="font-bold text-foreground block max-w-[260px] truncate">{t.subject}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {new Date(t.createdAt).toLocaleDateString()} · SLA {t.slaHours}h
                              </span>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="size-6 border">
                                <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                                  {t.employee?.firstName?.[0]}
                                  {t.employee?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="font-medium text-foreground block">
                                  {t.employee?.firstName} {t.employee?.lastName}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {t.employee?.department?.name || "General"}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-medium bg-muted/40">
                              {t.category}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] font-bold capitalize gap-1 ${pri.bg} ${pri.text} ${pri.border}`}>
                              <PriIcon className="size-3" />
                              <span>{t.priority}</span>
                            </Badge>
                          </TableCell>

                          <TableCell className="text-muted-foreground text-xs">
                            {t.assignedAgent || "Unassigned"}
                          </TableCell>

                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] font-bold ${st.bg} ${st.text} ${st.border}`}>
                              {st.label}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedTicketPassport(t)}
                                className="h-6 text-[10px] font-bold gap-1"
                              >
                                <MessageSquare className="size-3 text-primary" />
                                <span>Thread ({t.comments?.length || 0})</span>
                              </Button>

                              {t.status !== "resolved" && t.status !== "closed" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateStatusMut.mutate({ id: t.id, status: "resolved" })}
                                  className="h-6 text-[10px] font-bold text-emerald-600 border-emerald-500/30 gap-1"
                                >
                                  <CheckCircle2 className="size-3" />
                                  <span>Resolve</span>
                                </Button>
                              )}

                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm(`Delete ticket ${t.ticketCode}?`)) {
                                    deleteTicketMut.mutate(t.id);
                                  }
                                }}
                                className="size-6 text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="size-3" />
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
        </TabsContent>

        {/* ===================== TAB 2: HELP DESK DASHBOARD ===================== */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 border shadow-2xs space-y-2">
              <span className="text-xs text-muted-foreground font-semibold">Average Response Time</span>
              <h3 className="text-2xl font-black text-foreground font-mono">1.8 Hours</h3>
              <p className="text-[11px] text-emerald-600 font-semibold">▲ 24% faster than target</p>
            </Card>

            <Card className="p-4 border shadow-2xs space-y-2">
              <span className="text-xs text-muted-foreground font-semibold">First Contact Resolution</span>
              <h3 className="text-2xl font-black text-foreground font-mono">78.4%</h3>
              <p className="text-[11px] text-emerald-600 font-semibold">▲ 4.2% this quarter</p>
            </Card>

            <Card className="p-4 border shadow-2xs space-y-2">
              <span className="text-xs text-muted-foreground font-semibold">Customer Satisfaction</span>
              <h3 className="text-2xl font-black text-amber-500 font-mono">4.8 / 5.0</h3>
              <p className="text-[11px] text-muted-foreground">Based on 142 resolved ratings</p>
            </Card>

            <Card className="p-4 border shadow-2xs space-y-2">
              <span className="text-xs text-muted-foreground font-semibold">Overdue / SLA Breached</span>
              <h3 className="text-2xl font-black text-rose-600 font-mono">0 Tickets</h3>
              <p className="text-[11px] text-emerald-600 font-semibold">● 100% On-Time SLA</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-5">
              <h4 className="font-bold text-sm mb-4">Tickets by Category</h4>
              <div className="space-y-3">
                {[
                  { name: "IT & Hardware Provisioning", count: 42, pct: 45 },
                  { name: "Payroll & Compensation Queries", count: 24, pct: 26 },
                  { name: "Leave & Attendance Regularization", count: 16, pct: 17 },
                  { name: "HR Policies & Compliance", count: 8, pct: 9 },
                  { name: "Workplace & Facilities", count: 3, pct: 3 },
                ].map((c) => (
                  <div key={c.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>{c.name}</span>
                      <span className="font-mono text-muted-foreground">{c.count} tickets ({c.pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${c.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h4 className="font-bold text-sm mb-4">Support Agent Workload</h4>
              <div className="space-y-3">
                {[
                  { name: "Siddharth Verma (IT Support Lead)", resolved: 38, open: 2 },
                  { name: "Ananya Iyer (HR Operations)", resolved: 22, open: 1 },
                  { name: "Rahul Sharma (Payroll Specialist)", resolved: 19, open: 0 },
                ].map((agent) => (
                  <div key={agent.name} className="p-3 bg-muted/40 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold block text-foreground">{agent.name}</span>
                      <span className="text-[10px] text-muted-foreground">{agent.resolved} resolved this month</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {agent.open} active
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ===================== TAB 3: SLA POLICIES ===================== */}
        <TabsContent value="sla" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="size-4.5 text-primary" /> Service Level Agreement (SLA) Matrix
              </CardTitle>
              <CardDescription className="text-xs">
                Guaranteed response and resolution deadlines configured by priority tier.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs font-bold">Priority Tier</TableHead>
                    <TableHead className="text-xs font-bold">Scope & Description</TableHead>
                    <TableHead className="text-xs font-bold">First Response Target</TableHead>
                    <TableHead className="text-xs font-bold">Resolution Target</TableHead>
                    <TableHead className="text-xs font-bold">Escalation Deadline</TableHead>
                    <TableHead className="text-xs font-bold">Escalates To</TableHead>
                    <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slaPolicies.map((sla) => (
                    <TableRow key={sla.id}>
                      <TableCell className="text-xs font-bold capitalize">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold capitalize",
                            sla.priority === "urgent"
                              ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                              : sla.priority === "high"
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                              : "bg-blue-500/10 text-blue-600 border-blue-500/30"
                          )}
                        >
                          {sla.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-foreground max-w-xs">
                        {sla.description}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-semibold text-primary">
                        {sla.firstResponseTime}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-semibold text-emerald-600">
                        {sla.resolutionTime}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {sla.escalationTime}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground">
                        {sla.escalatesTo}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() => {
                              setEditingSla(sla);
                              setSlaForm({
                                priority: sla.priority,
                                description: sla.description,
                                firstResponseTime: sla.firstResponseTime,
                                resolutionTime: sla.resolutionTime,
                                escalationTime: sla.escalationTime,
                                escalatesTo: sla.escalatesTo,
                              });
                              setIsSlaModalOpen(true);
                            }}
                          >
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 text-rose-500"
                            onClick={() => handleDeleteSla(sla.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal: Create Ticket */}
      <Dialog open={isCreateTicketOpen} onOpenChange={setIsCreateTicketOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <LifeBuoy className="size-5 text-primary" /> Raise Internal Support Ticket
            </DialogTitle>
            <DialogDescription className="text-xs">
              Submit your request to IT, HR, or workplace management with automatic SLA tracking.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-bold">Requester Staff Employee</Label>
              <Select
                value={ticketForm.employeeId}
                onValueChange={(val) => setTicketForm({ ...ticketForm, employeeId: val })}
              >
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue placeholder="Select employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id} className="text-xs">
                      {e.firstName} {e.lastName} ({e.employeeCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold">Ticket Subject *</Label>
              <Input
                placeholder="e.g. Need external monitor setup / Tax declaration query"
                value={ticketForm.subject}
                onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Category</Label>
                <Select
                  value={ticketForm.category}
                  onValueChange={(val) => setTicketForm({ ...ticketForm, category: val })}
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IT & Hardware" className="text-xs">IT & Hardware</SelectItem>
                    <SelectItem value="Payroll & Salary" className="text-xs">Payroll & Salary</SelectItem>
                    <SelectItem value="Leave & Attendance" className="text-xs">Leave & Attendance</SelectItem>
                    <SelectItem value="HR Policies" className="text-xs">HR Policies</SelectItem>
                    <SelectItem value="Workplace & Facilities" className="text-xs">Workplace & Facilities</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold">Priority</Label>
                <Select
                  value={ticketForm.priority}
                  onValueChange={(val) => setTicketForm({ ...ticketForm, priority: val })}
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent" className="text-xs text-rose-600 font-bold">Urgent (SLA 4h)</SelectItem>
                    <SelectItem value="high" className="text-xs text-amber-600 font-bold">High (SLA 8h)</SelectItem>
                    <SelectItem value="medium" className="text-xs">Medium (SLA 24h)</SelectItem>
                    <SelectItem value="low" className="text-xs">Low (SLA 48h)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold">Description & Issue Details</Label>
              <Textarea
                rows={4}
                placeholder="Please describe the issue, error codes, or requirements..."
                value={ticketForm.description}
                onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsCreateTicketOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!ticketForm.subject.trim()) {
                  toast.error("Subject is required");
                  return;
                }
                createTicketMut.mutate(ticketForm);
              }}
              disabled={createTicketMut.isPending}
              className="font-bold"
            >
              Submit Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: SLA Policy Configuration */}
      <Dialog open={isSlaModalOpen} onOpenChange={setIsSlaModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <ShieldCheck className="size-5 text-primary" />
              {editingSla ? "Edit SLA Policy" : "Create New SLA Policy"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-bold">Priority Tier</Label>
              <Select
                value={slaForm.priority}
                onValueChange={(v: any) => setSlaForm({ ...slaForm, priority: v })}
              >
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent" className="text-xs">Urgent</SelectItem>
                  <SelectItem value="high" className="text-xs">High</SelectItem>
                  <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                  <SelectItem value="low" className="text-xs">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold">Description & Trigger Conditions</Label>
              <Input
                placeholder="e.g. Critical database or payroll blocker"
                value={slaForm.description}
                onChange={(e) => setSlaForm({ ...slaForm, description: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">First Response</Label>
                <Input
                  value={slaForm.firstResponseTime}
                  onChange={(e) => setSlaForm({ ...slaForm, firstResponseTime: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Resolution Target</Label>
                <Input
                  value={slaForm.resolutionTime}
                  onChange={(e) => setSlaForm({ ...slaForm, resolutionTime: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Escalation Time</Label>
                <Input
                  value={slaForm.escalationTime}
                  onChange={(e) => setSlaForm({ ...slaForm, escalationTime: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Escalates To</Label>
                <Input
                  value={slaForm.escalatesTo}
                  onChange={(e) => setSlaForm({ ...slaForm, escalatesTo: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsSlaModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveSla} className="font-bold">
              Save SLA Policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Passport Dialog / Ticket Detail Thread */}
      <Dialog open={!!selectedTicketPassport} onOpenChange={(open) => !open && setSelectedTicketPassport(null)}>
        {selectedTicketPassport && (
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <div className="flex items-center justify-between pr-6">
                <span className="font-mono font-black text-primary text-sm">
                  {selectedTicketPassport.ticketCode}
                </span>
                <Badge variant="outline" className="text-[10px] font-bold capitalize">
                  {selectedTicketPassport.status}
                </Badge>
              </div>
              <DialogTitle className="text-base font-bold text-foreground">
                {selectedTicketPassport.subject}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-muted/40 rounded-lg space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Category: <strong>{selectedTicketPassport.category}</strong></span>
                  <span>Priority: <strong>{selectedTicketPassport.priority}</strong></span>
                </div>
                {selectedTicketPassport.description && (
                  <p className="text-foreground pt-1 border-t mt-1 leading-relaxed">
                    {selectedTicketPassport.description}
                  </p>
                )}
              </div>

              {/* Thread comments */}
              <div>
                <h4 className="font-bold text-xs mb-2 flex items-center gap-1.5">
                  <MessageSquare className="size-3.5 text-primary" /> Conversation Thread
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(!selectedTicketPassport.comments || selectedTicketPassport.comments.length === 0) ? (
                    <p className="text-muted-foreground italic text-[11px]">No replies posted yet.</p>
                  ) : (
                    selectedTicketPassport.comments.map((c: any, i: number) => (
                      <div key={i} className="p-2.5 rounded-lg border bg-card space-y-1">
                        <div className="flex justify-between font-bold text-[11px]">
                          <span>{c.isStaff ? "Support Specialist" : "Requester Employee"}</span>
                          <span className="text-muted-foreground font-mono text-[9px]">
                            {new Date(c.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-muted-foreground">{c.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Reply box */}
              <div className="flex gap-2">
                <Input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Type your response to this ticket..."
                  className="text-xs h-8"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && commentText.trim()) {
                      addCommentMut.mutate({
                        ticketId: selectedTicketPassport.id,
                        message: commentText.trim(),
                        isStaff: true,
                      });
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (!commentText.trim()) return;
                    addCommentMut.mutate({
                      ticketId: selectedTicketPassport.id,
                      message: commentText.trim(),
                      isStaff: true,
                    });
                  }}
                  disabled={addCommentMut.isPending || !commentText.trim()}
                  className="h-8 gap-1 font-bold text-xs"
                >
                  <Send className="size-3.5" /> Send
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button size="sm" onClick={() => setSelectedTicketPassport(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
