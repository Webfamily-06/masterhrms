import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Tag,
  Ticket,
  Plus,
  Search,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  FolderPlus,
  Trash2,
  Pencil,
  RefreshCw,
  User,
  Send,
  Loader2,
  Filter,
  Zap,
  CreditCard,
  Code2,
  Sparkles,
  HelpCircle,
  Building2,
  ShieldCheck,
  Check,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/super/support")({
  component: SupportDeskAdmin,
  head: () => ({ meta: [{ title: "Platform Support & Add-on Activations — Super Admin" }] }),
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
  in_progress: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30", label: "In Progress" },
  resolved: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30", label: "Resolved" },
  closed: { bg: "bg-muted", text: "text-muted-foreground", border: "border-border", label: "Closed" },
};

export function SupportDeskAdmin() {
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState("");

  // Queries
  const { data: tickets = [], isLoading: isTicketsLoading } = useQuery({
    queryKey: ["super-platform-support-tickets", statusFilter, typeFilter, searchQuery],
    queryFn: async () => {
      try {
        let url = `/support/platform/tickets?isSuper=true&status=${statusFilter}&requestType=${typeFilter}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
        const res = await api.get(url);
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: summary } = useQuery({
    queryKey: ["super-platform-support-summary"],
    queryFn: async () => {
      try {
        return await api.get("/support/platform/summary/stats?isSuper=true");
      } catch {
        return { totalTickets: 0, upgradeRequests: 0, billingQueries: 0, technicalIssues: 0, resolvedCount: 0 };
      }
    },
  });

  // Mutations
  const actionTicketMut = useMutation({
    mutationFn: async ({ id, action, status, replyMessage }: { id: string; action?: string; status?: string; replyMessage?: string }) =>
      api.post(`/support/platform/tickets/${id}/action`, { action, status, replyMessage }),
    onSuccess: (res: any) => {
      toast.success(res.message || "Action executed successfully!");
      qc.invalidateQueries({ queryKey: ["super-platform-support-tickets"] });
      qc.invalidateQueries({ queryKey: ["super-platform-support-summary"] });
      if (selectedTicket) {
        setSelectedTicket(res.ticket);
      }
      setReplyText("");
    },
    onError: (e: any) => toast.error(e.message || "Action failed"),
  });

  const sendSuperReplyMut = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) =>
      api.post(`/support/platform/tickets/${ticketId}/messages`, { message, senderType: "super_admin" }),
    onSuccess: () => {
      toast.success("Reply sent to Tenant Admin");
      qc.invalidateQueries({ queryKey: ["super-platform-support-tickets"] });
      setReplyText("");
    },
    onError: (e: any) => toast.error(e.message || "Failed to post message"),
  });

  const deleteTicketMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/support/platform/tickets/${id}`),
    onSuccess: () => {
      toast.success("Ticket deleted");
      qc.invalidateQueries({ queryKey: ["super-platform-support-tickets"] });
      qc.invalidateQueries({ queryKey: ["super-platform-support-summary"] });
      setSelectedTicket(null);
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete ticket"),
  });

  return (
    <div className="space-y-6 max-w-full pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <ShieldCheck className="size-6 text-primary" /> Super Admin — Platform Support & SaaS Requests
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cross-tenant support hub. Review SaaS add-on upgrades, billing requests, technical tickets, and activate customer modules in 1-click.
          </p>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <LifeBuoy className="size-3.5 text-blue-500" /> Total Platform Tickets
          </span>
          <div className="text-xl font-black font-mono text-foreground">
            {summary?.totalTickets || tickets.length} Total
          </div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1 bg-purple-500/5 border-purple-500/20">
          <span className="text-[11px] font-bold text-purple-600 flex items-center gap-1.5">
            <Zap className="size-3.5" /> Pending Addon Activations
          </span>
          <div className="text-xl font-black font-mono text-purple-600">
            {summary?.upgradeRequests || 0} Requests
          </div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <CreditCard className="size-3.5 text-emerald-500" /> Billing Inquiries
          </span>
          <div className="text-xl font-black font-mono text-emerald-600">
            {summary?.billingQueries || 0} Inquiries
          </div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1 bg-emerald-500/5 border-emerald-500/20">
          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5" /> Resolved Tickets
          </span>
          <div className="text-xl font-black font-mono text-emerald-600">
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
              placeholder="Search code, subject, tenant..."
              className="h-7 text-xs pl-8 w-48 sm:w-60 bg-background"
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-7 text-xs w-44 bg-background">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="addon_upgrade">🚀 Addon Upgrade</SelectItem>
              <SelectItem value="billing_invoices">💳 Billing & Invoices</SelectItem>
              <SelectItem value="technical_api">🔌 Technical & API</SelectItem>
              <SelectItem value="feature_request">💡 Feature Request</SelectItem>
              <SelectItem value="general_support">💬 General Support</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
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

      {/* Super Admin Support Table */}
      <Card className="border shadow-2xs">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 text-xs">
                <TableHead className="text-xs">Ticket Code & Subject</TableHead>
                <TableHead className="text-xs">Organization / Tenant</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Target Addon</TableHead>
                <TableHead className="text-xs">Priority</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Super Admin Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isTicketsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12 text-xs">
                    Loading cross-tenant support requests...
                  </TableCell>
                </TableRow>
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12 text-xs italic">
                    No platform support requests found.
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
                          <span className="font-bold text-foreground block max-w-[240px] truncate">{t.subject}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(t.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="size-3.5 text-primary" />
                          <span className="font-bold text-foreground">{t.tenant?.name || "Organization"}</span>
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

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* 1-Click Activate Addon Button */}
                          {t.requestType === "addon_upgrade" && t.targetAddonSlug && t.status !== "resolved" && (
                            <Button
                              size="sm"
                              onClick={() => actionTicketMut.mutate({ id: t.id, action: "activate_addon" })}
                              className="h-6 text-[10px] font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1 shadow-2xs"
                            >
                              <Zap className="size-3" />
                              <span>1-Click Activate</span>
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedTicket(t)}
                            className="h-6 text-[10px] font-bold gap-1"
                          >
                            <MessageSquare className="size-3 text-primary" />
                            <span>Respond ({t.messages?.length || 0})</span>
                          </Button>

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

      {/* ─── MODAL: SUPER ADMIN CHAT & RESOLUTION DRAWER ─── */}
      {selectedTicket && (
        <Dialog open={!!selectedTicket} onOpenChange={(o) => !o && setSelectedTicket(null)}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center justify-between pr-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-primary" />
                  <span>Super Admin Ticket Desk: {selectedTicket.ticketCode}</span>
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
                Organization: {selectedTicket.tenant?.name} · {selectedTicket.subject}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              {/* Target Addon Quick Action Box */}
              {selectedTicket.targetAddonSlug && (
                <div className="p-3 rounded-xl border bg-purple-500/5 border-purple-500/20 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-bold text-purple-700 dark:text-purple-300 block">
                      Requested Add-on: {selectedTicket.targetAddonSlug.toUpperCase()} Suite
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Click below to instantly activate this module for {selectedTicket.tenant?.name}.
                    </span>
                  </div>

                  {selectedTicket.status !== "resolved" ? (
                    <Button
                      size="sm"
                      onClick={() => actionTicketMut.mutate({ id: selectedTicket.id, action: "activate_addon" })}
                      disabled={actionTicketMut.isPending}
                      className="text-xs font-bold h-7 bg-purple-600 hover:bg-purple-700 text-white gap-1"
                    >
                      <Zap className="size-3" /> Activate Entitlement
                    </Button>
                  ) : (
                    <Badge className="bg-emerald-600 text-white text-[10px] font-bold gap-1">
                      ✓ Module Active
                    </Badge>
                  )}
                </div>
              )}

              {/* Chat Thread */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
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

              {/* Super Admin Reply Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!replyText.trim()) return;
                  sendSuperReplyMut.mutate({
                    ticketId: selectedTicket.id,
                    message: replyText,
                  });
                }}
                className="flex items-center gap-2 pt-2 border-t"
              >
                <Input
                  placeholder="Type official response from Super Admin..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button type="submit" size="sm" disabled={sendSuperReplyMut.isPending} className="h-8 text-xs font-bold gap-1 bg-purple-600 hover:bg-purple-700 text-white">
                  <Send className="size-3" /> Reply
                </Button>
              </form>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 flex-wrap pt-2 border-t">
              {selectedTicket.status !== "resolved" && (
                <Button
                  size="sm"
                  onClick={() => actionTicketMut.mutate({ id: selectedTicket.id, status: "resolved" })}
                  className="text-xs font-bold h-8 bg-emerald-600 hover:bg-emerald-700 text-white mr-auto gap-1"
                >
                  <CheckCircle2 className="size-3.5" />
                  <span>Mark Resolved</span>
                </Button>
              )}

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
