import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile, useSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Send,
  Zap,
  CreditCard,
  Code2,
  HelpCircle,
  Flame,
  ShieldCheck,
  Eye,
  Trash2,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/support")({
  component: SupportPage,
  head: () => ({ meta: [{ title: "Platform Support & SaaS Requests — Master ERP" }] }),
});

const REQUEST_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  addon_upgrade: { label: "Addon Upgrade", icon: Zap, color: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  billing_invoices: { label: "Billing & Invoices", icon: CreditCard, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  technical_api: { label: "Technical & API", icon: Code2, color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  feature_request: { label: "Feature Request", icon: Sparkles, color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  general_support: { label: "General Support", icon: HelpCircle, color: "bg-muted text-muted-foreground border-border" },
};

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  open: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30", label: "Open" },
  in_progress: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30", label: "Under Review" },
  resolved: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30", label: "Resolved" },
  closed: { bg: "bg-muted", text: "text-muted-foreground", border: "border-border", label: "Closed" },
};

export function SupportPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState("");

  // Forms
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    requestType: "addon_upgrade",
    targetAddonSlug: "recruitment",
    priority: "high",
    message: "",
  });

  // Queries
  const { data: tickets = [], isLoading: isTicketsLoading } = useQuery({
    queryKey: ["platform-support-tickets", tenantId, selectedTypeFilter, selectedStatusFilter, searchQuery],
    queryFn: async () => {
      try {
        let url = `/support/platform/tickets?requestType=${selectedTypeFilter}&status=${selectedStatusFilter}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
        const res = await api.get(url);
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: summary } = useQuery({
    queryKey: ["platform-support-summary", tenantId],
    queryFn: async () => {
      try {
        return await api.get("/support/platform/summary/stats");
      } catch {
        return { totalTickets: 0, upgradeRequests: 0, billingQueries: 0, technicalIssues: 0, resolvedCount: 0 };
      }
    },
  });

  // Mutations
  const createTicketMut = useMutation({
    mutationFn: async (payload: any) => api.post("/support/platform/tickets", payload),
    onSuccess: () => {
      toast.success("Platform support ticket sent to Super Admin!");
      qc.invalidateQueries({ queryKey: ["platform-support-tickets"] });
      qc.invalidateQueries({ queryKey: ["platform-support-summary"] });
      setIsCreateOpen(false);
      resetTicketForm();
    },
    onError: (e: any) => toast.error(e.message || "Failed to create ticket"),
  });

  const sendReplyMut = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) =>
      api.post(`/support/platform/tickets/${ticketId}/messages`, { message, senderType: "tenant_admin" }),
    onSuccess: () => {
      toast.success("Message sent to Super Admin");
      qc.invalidateQueries({ queryKey: ["platform-support-tickets"] });
      setReplyMessage("");
    },
    onError: (e: any) => toast.error(e.message || "Failed to send message"),
  });

  function resetTicketForm() {
    setTicketForm({
      subject: "",
      requestType: "addon_upgrade",
      targetAddonSlug: "recruitment",
      priority: "high",
      message: "",
    });
  }

  return (
    <div className="space-y-6 max-w-full pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Zap className="size-6 text-primary" /> Platform Support & Super Admin Requests
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Direct communication channel with Platform Super Admins for Add-on suite activations, billing invoices, API capacity, and technical support.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => {
              resetTicketForm();
              setIsCreateOpen(true);
            }}
            className="text-xs font-bold h-8 shadow-sm gap-1.5 bg-primary text-primary-foreground"
          >
            <Plus className="size-3.5" />
            <span>New Super Admin Request</span>
          </Button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <LifeBuoy className="size-3.5 text-blue-500" /> Platform Requests
          </span>
          <div className="text-xl font-black font-mono text-foreground">
            {summary?.totalTickets || tickets.length} Total
          </div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1 bg-purple-500/5 border-purple-500/20">
          <span className="text-[11px] font-bold text-purple-600 flex items-center gap-1.5">
            <Zap className="size-3.5" /> Addon Upgrades
          </span>
          <div className="text-xl font-black font-mono text-purple-600">
            {summary?.upgradeRequests || 0} Requests
          </div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <CreditCard className="size-3.5 text-emerald-500" /> Billing Queries
          </span>
          <div className="text-xl font-black font-mono text-emerald-600">
            {summary?.billingQueries || 0} Inquiries
          </div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-600" /> Resolved
          </span>
          <div className="text-xl font-black font-mono text-foreground">
            {summary?.resolvedCount || 0} Resolved
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
              placeholder="Search code, subject, addon..."
              className="h-7 text-xs pl-8 w-48 sm:w-60 bg-background"
            />
          </div>

          <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
            <SelectTrigger className="h-7 text-xs w-44 bg-background">
              <SelectValue placeholder="All Request Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Request Types</SelectItem>
              <SelectItem value="addon_upgrade">Addon Upgrade</SelectItem>
              <SelectItem value="billing_invoices">Billing & Invoices</SelectItem>
              <SelectItem value="technical_api">Technical & API</SelectItem>
              <SelectItem value="feature_request">Feature Request</SelectItem>
              <SelectItem value="general_support">General Support</SelectItem>
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
            <SelectItem value="in_progress">Under Review</SelectItem>
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
                <TableHead className="text-xs">Request Code & Subject</TableHead>
                <TableHead className="text-xs">Request Category</TableHead>
                <TableHead className="text-xs">Target Addon Suite</TableHead>
                <TableHead className="text-xs">Priority</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Super Admin Action</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isTicketsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12 text-xs">
                    Loading platform support tickets...
                  </TableCell>
                </TableRow>
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12 text-xs italic">
                    No platform requests found. Click "New Super Admin Request" to contact platform operations.
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((t: any) => {
                  const reqType = REQUEST_TYPE_CONFIG[t.requestType] || REQUEST_TYPE_CONFIG.general_support;
                  const st = STATUS_CONFIG[t.status] || STATUS_CONFIG.open;
                  const TypeIcon = reqType.icon;

                  return (
                    <TableRow key={t.id} className="hover:bg-muted/20 text-xs">
                      <TableCell>
                        <div>
                          <span className="font-mono font-black text-primary block">{t.ticketCode}</span>
                          <span className="font-bold text-foreground block max-w-[260px] truncate">{t.subject}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(t.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] font-bold gap-1 ${reqType.color}`}>
                          <TypeIcon className="size-3" />
                          <span>{reqType.label}</span>
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {t.targetAddonSlug ? (
                          <Badge variant="outline" className="text-[10px] font-mono font-bold bg-primary/10 text-primary border-primary/20">
                            {t.targetAddonSlug.toUpperCase()}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground italic text-[11px]">N/A</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold capitalize">
                          {t.priority}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] font-bold ${st.bg} ${st.text} ${st.border}`}>
                          {st.label}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {t.superAdminAction === "addon_activated" ? (
                          <Badge className="bg-emerald-600 text-white text-[10px] font-bold gap-1 shadow-2xs">
                            <CheckCircle2 className="size-3" /> Addon Enabled
                          </Badge>
                        ) : t.superAdminAction ? (
                          <span className="font-mono text-[11px] text-primary">{t.superAdminAction}</span>
                        ) : (
                          <span className="text-muted-foreground italic text-[11px]">Pending Super Admin</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedTicket(t)}
                          className="h-6 text-[10px] font-bold gap-1"
                        >
                          <MessageSquare className="size-3 text-primary" />
                          <span>Chat ({t.messages?.length || 0})</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ─── MODAL 1: CREATE SUPER ADMIN REQUEST ─── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Zap className="size-5 text-primary" />
              <span>Submit Platform Support Request</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Request add-on activations, invoice adjustments, or platform assistance directly from Super Admins.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createTicketMut.mutate(ticketForm);
            }}
            className="space-y-3.5 py-2 text-xs"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Request Category *</Label>
                <Select
                  value={ticketForm.requestType}
                  onValueChange={(v) => setTicketForm({ ...ticketForm, requestType: v })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="addon_upgrade">🚀 Addon Suite Upgrade</SelectItem>
                    <SelectItem value="billing_invoices">💳 Billing & Invoices</SelectItem>
                    <SelectItem value="technical_api">🔌 Technical & API Limits</SelectItem>
                    <SelectItem value="feature_request">💡 Feature Request</SelectItem>
                    <SelectItem value="general_support">💬 General Platform Support</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {ticketForm.requestType === "addon_upgrade" && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Target Add-on Suite *</Label>
                  <Select
                    value={ticketForm.targetAddonSlug}
                    onValueChange={(v) => setTicketForm({ ...ticketForm, targetAddonSlug: v })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recruitment">Recruitment & ATS Suite</SelectItem>
                      <SelectItem value="shifts">Shift Rostering & Swaps</SelectItem>
                      <SelectItem value="okr">OKR Performance & Goals</SelectItem>
                      <SelectItem value="assets">Asset Management & Hardware</SelectItem>
                      <SelectItem value="biometric_sync">Biometric Device Sync</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Subject / Title *</Label>
              <Input
                required
                placeholder="e.g. Request to enable Recruitment ATS module for our hiring expansion"
                value={ticketForm.subject}
                onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Priority Level *</Label>
              <Select
                value={ticketForm.priority}
                onValueChange={(v) => setTicketForm({ ...ticketForm, priority: v })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Detailed Message for Super Admin *</Label>
              <Textarea
                required
                rows={3}
                placeholder="Please describe what your organization requires..."
                value={ticketForm.message}
                onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createTicketMut.isPending} className="text-xs font-bold">
                Send Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: CHAT WITH SUPER ADMIN ─── */}
      {selectedTicket && (
        <Dialog open={!!selectedTicket} onOpenChange={(o) => !o && setSelectedTicket(null)}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center justify-between pr-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-5 text-primary" />
                  <span>Platform Request: {selectedTicket.ticketCode}</span>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs font-bold ${
                    STATUS_CONFIG[selectedTicket.status]?.bg
                  } ${STATUS_CONFIG[selectedTicket.status]?.text} ${
                    STATUS_CONFIG[selectedTicket.status]?.border
                  }`}
                >
                  {STATUS_CONFIG[selectedTicket.status]?.label}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-foreground">
                {selectedTicket.subject}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              {/* Messages History */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {selectedTicket.messages?.map((m: any) => {
                  const isSuper = m.senderType === "super_admin";
                  return (
                    <div
                      key={m.id}
                      className={`p-3 rounded-xl border text-xs leading-relaxed space-y-1 ${
                        isSuper ? "bg-purple-500/10 border-purple-500/30 text-purple-950 dark:text-purple-100" : "bg-card"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="font-bold flex items-center gap-1.5">
                          {isSuper ? <ShieldCheck className="size-3 text-purple-600" /> : <Building2 className="size-3 text-primary" />}
                          <span>{m.senderName}</span>
                          {isSuper && <Badge className="text-[8px] h-4 px-1 bg-purple-600 text-white">Super Admin</Badge>}
                        </span>
                        <span className="font-mono">{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p className="pt-0.5">{m.message}</p>
                    </div>
                  );
                })}
              </div>

              {/* Reply Box */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!replyMessage.trim()) return;
                  sendReplyMut.mutate({
                    ticketId: selectedTicket.id,
                    message: replyMessage,
                  });
                }}
                className="flex items-center gap-2 pt-2 border-t"
              >
                <Input
                  placeholder="Send a follow-up message to Super Admin..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button type="submit" size="sm" disabled={sendReplyMut.isPending} className="h-8 text-xs font-bold gap-1">
                  <Send className="size-3" /> Send
                </Button>
              </form>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button size="sm" variant="outline" onClick={() => setSelectedTicket(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
