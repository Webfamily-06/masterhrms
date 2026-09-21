import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/helpdesk")({
  component: HelpdeskPage,
  head: () => ({ meta: [{ title: "Employee Helpdesk & Tickets — Master HRMS" }] }),
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

export function HelpdeskPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");

  // Modals
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [selectedTicketPassport, setSelectedTicketPassport] = useState<any>(null);
  const [commentText, setCommentText] = useState("");

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
        </div>
      </div>

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

      {/* ─── MODAL 1: RAISE INTERNAL TICKET ─── */}
      <Dialog open={isCreateTicketOpen} onOpenChange={setIsCreateTicketOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <LifeBuoy className="size-5 text-primary" />
              <span>Raise Internal Helpdesk Ticket</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Submit your request to internal departments (IT, HR, Payroll, Facilities) for fast resolution.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createTicketMut.mutate(ticketForm);
            }}
            className="space-y-3.5 py-2 text-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Requester Staff Member *</Label>
              <Select
                required
                value={ticketForm.employeeId}
                onValueChange={(v) => setTicketForm({ ...ticketForm, employeeId: v })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choose Staff" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.first_name} {e.last_name} ({e.employee_code}) · {e.position || "Staff"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Subject / Title *</Label>
              <Input
                required
                placeholder="e.g. Need second monitor for design workstation"
                value={ticketForm.subject}
                onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Category *</Label>
                <Select
                  value={ticketForm.category}
                  onValueChange={(v) => setTicketForm({ ...ticketForm, category: v })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IT & Hardware">IT & Hardware</SelectItem>
                    <SelectItem value="Payroll & Salary">Payroll & Salary</SelectItem>
                    <SelectItem value="Leave & Attendance">Leave & Attendance</SelectItem>
                    <SelectItem value="HR Policies">HR Policies</SelectItem>
                    <SelectItem value="Workplace & Facilities">Workplace & Facilities</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Priority Level *</Label>
                <Select
                  value={ticketForm.priority}
                  onValueChange={(v) => setTicketForm({ ...ticketForm, priority: v })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent (4h SLA)</SelectItem>
                    <SelectItem value="high">High (12h SLA)</SelectItem>
                    <SelectItem value="medium">Medium (24h SLA)</SelectItem>
                    <SelectItem value="low">Low (48h SLA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Detailed Description *</Label>
              <Textarea
                required
                rows={3}
                placeholder="Please describe the issue, error messages, or exact assistance needed..."
                value={ticketForm.description}
                onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsCreateTicketOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createTicketMut.isPending} className="text-xs font-bold">
                Submit Ticket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: TICKET THREAD & CONVERSATION DRAWER ─── */}
      {selectedTicketPassport && (
        <Dialog open={!!selectedTicketPassport} onOpenChange={(o) => !o && setSelectedTicketPassport(null)}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center justify-between pr-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-5 text-primary" />
                  <span>Ticket {selectedTicketPassport.ticketCode}</span>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs font-bold ${
                    STATUS_CONFIG[selectedTicketPassport.status]?.bg
                  } ${STATUS_CONFIG[selectedTicketPassport.status]?.text} ${
                    STATUS_CONFIG[selectedTicketPassport.status]?.border
                  }`}
                >
                  {STATUS_CONFIG[selectedTicketPassport.status]?.label}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-foreground">
                {selectedTicketPassport.subject}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              {/* Ticket Details Box */}
              <div className="p-3 rounded-xl border bg-muted/20 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Requester:</span>
                  <span className="font-bold text-foreground">
                    {selectedTicketPassport.employee?.firstName} {selectedTicketPassport.employee?.lastName} ({selectedTicketPassport.employee?.department?.name || "General"})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-medium text-foreground">{selectedTicketPassport.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assigned Agent:</span>
                  <span className="font-medium text-primary font-mono">{selectedTicketPassport.assignedAgent}</span>
                </div>
                <div className="border-t pt-1.5 text-foreground leading-relaxed">
                  {selectedTicketPassport.description}
                </div>
              </div>

              {/* Comments Thread */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Activity & Replies ({selectedTicketPassport.comments?.length || 0})
                </Label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedTicketPassport.comments?.map((c: any) => (
                    <div
                      key={c.id}
                      className={`p-2.5 rounded-lg border text-xs leading-relaxed space-y-1 ${
                        c.isStaff ? "bg-primary/5 border-primary/20" : "bg-card"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="font-bold text-foreground flex items-center gap-1">
                          {c.authorName} {c.isStaff && <Badge className="text-[8px] h-4 px-1 bg-primary text-primary-foreground">Staff</Badge>}
                        </span>
                        <span className="font-mono">{new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p className="text-foreground">{c.message}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Reply Box */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!commentText.trim()) return;
                  addCommentMut.mutate({
                    ticketId: selectedTicketPassport.id,
                    message: commentText,
                    isStaff: true,
                  });
                }}
                className="flex items-center gap-2 pt-2 border-t"
              >
                <Input
                  placeholder="Type a reply or update..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button type="submit" size="sm" disabled={addCommentMut.isPending} className="h-8 text-xs font-bold gap-1">
                  <Send className="size-3" /> Reply
                </Button>
              </form>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 flex-wrap pt-2 border-t">
              {selectedTicketPassport.status !== "resolved" && (
                <Button
                  size="sm"
                  onClick={() => updateStatusMut.mutate({ id: selectedTicketPassport.id, status: "resolved" })}
                  className="text-xs font-bold h-8 bg-emerald-600 hover:bg-emerald-700 text-white mr-auto gap-1"
                >
                  <CheckCircle2 className="size-3.5" />
                  <span>Mark Resolved</span>
                </Button>
              )}

              <Button size="sm" variant="outline" onClick={() => setSelectedTicketPassport(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
