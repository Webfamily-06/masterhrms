import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PlanGuard } from "@/components/plan-guard";
import { formatSystemAmount } from "@/lib/currency";
import { toast } from "sonner";
import {
  Target, Plus, PhoneCall, Mail, DollarSign, TrendingUp, Building2,
  UserCheck, Search, Edit2, Trash2, ArrowRight, CheckCircle2, XCircle,
  CalendarDays, Loader2, BarChart3, Eye,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/crm")({
  component: CrmPage,
  head: () => ({ meta: [{ title: "CRM & Sales Pipeline — Master ERP" }] }),
});

export type CrmLead = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  value: number;
  stage: "lead" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
  source: string;
  notes: string;
  nextFollowUp: string;
  createdAt: string;
};

const STAGES: { id: CrmLead["stage"]; label: string; color: string; bg: string }[] = [
  { id: "lead",        label: "🔵 Lead",        color: "text-blue-600",   bg: "bg-blue-500/10 border-blue-500/20" },
  { id: "qualified",   label: "🟡 Qualified",   color: "text-amber-600",  bg: "bg-amber-500/10 border-amber-500/20" },
  { id: "proposal",    label: "🟠 Proposal",    color: "text-orange-600", bg: "bg-orange-500/10 border-orange-500/20" },
  { id: "negotiation", label: "🟣 Negotiation", color: "text-purple-600", bg: "bg-purple-500/10 border-purple-500/20" },
  { id: "won",         label: "🟢 Won",          color: "text-emerald-600",bg: "bg-emerald-500/10 border-emerald-500/20" },
  { id: "lost",        label: "🔴 Lost",         color: "text-red-600",   bg: "bg-red-500/10 border-red-500/20" },
];

const SOURCES = ["Website", "Referral", "LinkedIn", "Cold Call", "Email Campaign", "Trade Show", "Partner"];

const EMPTY_LEAD: Omit<CrmLead, "id" | "createdAt"> = {
  name: "", company: "", email: "", phone: "", value: 0,
  stage: "lead", source: "Website", notes: "", nextFollowUp: "",
};

function CrmPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";

  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<CrmLead | null>(null);
  const [viewingLead, setViewingLead] = useState<CrmLead | null>(null);
  const [form, setForm] = useState<Omit<CrmLead, "id" | "createdAt">>(EMPTY_LEAD);

  const SLUG = `system-crm-pipeline-${tenantId}`;

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["crm-pipeline", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", SLUG).maybeSingle();
      if (data?.content && Array.isArray(data.content)) return data.content as CrmLead[];
      return [] as CrmLead[];
    },
  });

  const persist = useMutation({
    mutationFn: async (updatedLeads: CrmLead[]) => {
      const { error } = await supabase.from("cms_pages").upsert({
        slug: SLUG,
        title: "CRM Pipeline Data",
        content: updatedLeads as any,
        published: true,
      }, { onConflict: "slug" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-pipeline", tenantId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-platform-settings").maybeSingle();
      return data?.content as any;
    },
  });

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchStage = filterStage === "all" || l.stage === filterStage;
      const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.company.toLowerCase().includes(search.toLowerCase());
      return matchStage && matchSearch;
    });
  }, [leads, filterStage, search]);

  const metrics = useMemo(() => {
    const total = leads.reduce((s, l) => s + (l.value || 0), 0);
    const won = leads.filter((l) => l.stage === "won").reduce((s, l) => s + (l.value || 0), 0);
    const active = leads.filter((l) => !["won", "lost"].includes(l.stage)).length;
    const winRate = leads.length > 0 ? Math.round((leads.filter((l) => l.stage === "won").length / leads.length) * 100) : 0;
    return { total, won, active, winRate };
  }, [leads]);

  function openCreate() {
    setEditingLead(null);
    setForm(EMPTY_LEAD);
    setIsModalOpen(true);
  }

  function openEdit(lead: CrmLead) {
    setEditingLead(lead);
    setForm({ name: lead.name, company: lead.company, email: lead.email, phone: lead.phone, value: lead.value, stage: lead.stage, source: lead.source, notes: lead.notes, nextFollowUp: lead.nextFollowUp });
    setIsModalOpen(true);
  }

  function handleSave() {
    if (!form.name.trim() || !form.company.trim()) return toast.error("Name and Company are required");
    let updated: CrmLead[];
    if (editingLead) {
      updated = leads.map((l) => l.id === editingLead.id ? { ...editingLead, ...form } : l);
      toast.success("Lead updated!");
    } else {
      const newLead: CrmLead = { ...form, id: `LD-${Date.now()}`, createdAt: new Date().toISOString() };
      updated = [newLead, ...leads];
      toast.success(`Lead "${form.name}" added to pipeline!`);
    }
    persist.mutate(updated);
    setIsModalOpen(false);
  }

  function handleDelete(id: string) {
    const updated = leads.filter((l) => l.id !== id);
    persist.mutate(updated);
    toast.success("Lead removed from pipeline.");
  }

  function advanceStage(lead: CrmLead) {
    const stageIds = STAGES.map((s) => s.id);
    const idx = stageIds.indexOf(lead.stage);
    if (idx >= stageIds.length - 1) return;
    const nextStage = stageIds[idx + 1];
    const updated = leads.map((l) => l.id === lead.id ? { ...l, stage: nextStage as CrmLead["stage"] } : l);
    persist.mutate(updated);
    toast.success(`${lead.name} moved to ${STAGES[idx + 1].label}`);
  }

  return (
    <PlanGuard moduleName="CRM & Sales Pipeline" requiredPlan="starter">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Target className="size-6 text-primary" /> CRM & Sales Pipeline
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Track leads, manage deals, and monitor your full sales funnel.</p>
          </div>
          <Button onClick={openCreate} className="gap-2 font-bold shrink-0">
            <Plus className="size-4" /> Add Lead
          </Button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Pipeline Value", value: formatSystemAmount(metrics.total, sysConfig?.currency), icon: DollarSign, color: "text-blue-600", bg: "bg-blue-500/10" },
            { label: "Won Revenue", value: formatSystemAmount(metrics.won, sysConfig?.currency), icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10" },
            { label: "Active Deals", value: metrics.active.toString(), icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-500/10" },
            { label: "Win Rate", value: `${metrics.winRate}%`, icon: BarChart3, color: "text-purple-600", bg: "bg-purple-500/10" },
          ].map((m) => (
            <Card key={m.label} className="p-4 flex items-center gap-3">
              <div className={`size-10 rounded-xl ${m.bg} grid place-items-center shrink-0`}>
                <m.icon className={`size-5 ${m.color}`} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{m.label}</div>
                <div className="font-extrabold text-base">{m.value}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 text-xs" />
          </div>
          <Select value={filterStage} onValueChange={setFilterStage}>
            <SelectTrigger className="w-full sm:w-44 text-xs">
              <SelectValue placeholder="Filter by stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Kanban Pipeline Board */}
        {isLoading ? (
          <div className="py-20 grid place-items-center"><Loader2 className="size-8 animate-spin text-primary" /></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto">
            {STAGES.map((stage) => {
              const stageLeads = filteredLeads.filter((l) => l.stage === stage.id);
              return (
                <div key={stage.id} className={`rounded-2xl border p-3 space-y-2 min-w-[160px] ${stage.bg}`}>
                  <div className={`text-xs font-extrabold ${stage.color} flex items-center justify-between`}>
                    <span>{stage.label}</span>
                    <Badge variant="secondary" className="text-[10px] font-mono">{stageLeads.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {stageLeads.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground text-center py-4">No leads</p>
                    ) : (
                      stageLeads.map((lead) => (
                        <Card key={lead.id} className="p-2.5 space-y-1.5 shadow-xs cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setViewingLead(lead)}>
                          <div className="font-bold text-xs truncate">{lead.name}</div>
                          <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                            <Building2 className="size-3" /> {lead.company}
                          </div>
                          <div className="text-[10px] font-mono font-bold text-primary">{formatSystemAmount(lead.value, sysConfig?.currency)}</div>
                          <div className="flex gap-1 pt-0.5">
                            <Button size="icon" variant="ghost" className="size-5 text-muted-foreground" onClick={(e) => { e.stopPropagation(); openEdit(lead); }}>
                              <Edit2 className="size-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="size-5 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(lead.id); }}>
                              <Trash2 className="size-3" />
                            </Button>
                            {!["won", "lost"].includes(lead.stage) && (
                              <Button size="icon" variant="ghost" className={`size-5 ${stage.color}`} onClick={(e) => { e.stopPropagation(); advanceStage(lead); }} title="Advance Stage">
                                <ArrowRight className="size-3" />
                              </Button>
                            )}
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create / Edit Lead Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="size-5 text-primary" /> {editingLead ? "Edit Lead" : "Add New Lead"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-2 text-xs">
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <Label className="text-xs font-semibold">Contact Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Anand Sharma" className="text-xs" />
              </div>
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <Label className="text-xs font-semibold">Company *</Label>
                <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Apex Global Ltd" className="text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="anand@apex.com" className="text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" className="text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Deal Value (₹)</Label>
                <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })} className="text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Stage</Label>
                <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v as CrmLead["stage"] })}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Lead Source</Label>
                <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Next Follow-up Date</Label>
                <Input type="date" value={form.nextFollowUp} onChange={(e) => setForm({ ...form, nextFollowUp: e.target.value })} className="text-xs" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs font-semibold">Activity Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Meeting notes, requirements, next steps..." className="text-xs resize-none" rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={persist.isPending} className="font-bold gap-2">
                {persist.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                {editingLead ? "Save Changes" : "Add Lead"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Lead Detail Modal */}
        <Dialog open={!!viewingLead} onOpenChange={() => setViewingLead(null)}>
          <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCheck className="size-5 text-primary" /> Lead Details
              </DialogTitle>
            </DialogHeader>
            {viewingLead && (
              <div className="space-y-4 py-2 text-xs">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border">
                  <Avatar className="size-12">
                    <AvatarFallback className="bg-primary text-primary-foreground font-black text-lg">
                      {viewingLead.name[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-extrabold text-base">{viewingLead.name}</div>
                    <div className="text-muted-foreground flex items-center gap-1"><Building2 className="size-3" /> {viewingLead.company}</div>
                    <Badge className="mt-1 text-[10px]">{STAGES.find((s) => s.id === viewingLead.stage)?.label}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Deal Value", value: formatSystemAmount(viewingLead.value, sysConfig?.currency), icon: DollarSign },
                    { label: "Source", value: viewingLead.source, icon: TrendingUp },
                    { label: "Email", value: viewingLead.email || "—", icon: Mail },
                    { label: "Phone", value: viewingLead.phone || "—", icon: PhoneCall },
                  ].map((f) => (
                    <div key={f.label} className="p-2.5 rounded-xl bg-secondary/30 border">
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1"><f.icon className="size-3" /> {f.label}</div>
                      <div className="font-bold mt-0.5 truncate">{f.value}</div>
                    </div>
                  ))}
                </div>
                {viewingLead.nextFollowUp && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center gap-2 text-xs">
                    <CalendarDays className="size-4" /> <span className="font-bold">Next Follow-up: {viewingLead.nextFollowUp}</span>
                  </div>
                )}
                {viewingLead.notes && (
                  <div className="p-3 rounded-xl bg-secondary/30 border space-y-1">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase">Activity Notes</div>
                    <div className="leading-relaxed whitespace-pre-wrap">{viewingLead.notes}</div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { if (viewingLead) openEdit(viewingLead); setViewingLead(null); }}>
                <Edit2 className="size-4 mr-2" /> Edit Lead
              </Button>
              <Button onClick={() => setViewingLead(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PlanGuard>
  );
}
