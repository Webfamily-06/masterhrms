import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, CheckCircle2, Clock, Send, DollarSign, Loader2, Trash2 } from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";
import { PlanGuard, PlanLimitBar } from "@/components/plan-guard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/proposals")({
  component: ProposalsPage,
  head: () => ({ meta: [{ title: "Proposals & Quotes — Master ERP" }] }),
});

export type ProposalRecord = {
  id: string;
  title: string;
  client: string;
  amount: number;
  date: string;
  status: "draft" | "sent" | "accepted";
  created_at: string;
};

const DEFAULT_SEED_PROPOSALS: ProposalRecord[] = [
  { id: "PRP-2026-01", title: "Enterprise ERP Cloud Migration & Training Proposal", client: "Apex Global Ltd", amount: 450000, date: "2026-07-28", status: "sent", created_at: new Date().toISOString() },
  { id: "PRP-2026-02", title: "Biometric Hardware Infrastructure Setup Quote", client: "Nova Health System", amount: 890000, date: "2026-07-25", status: "accepted", created_at: new Date().toISOString() },
];

function ProposalsPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id;

  const [propTitle, setPropTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-platform-settings").maybeSingle();
      return data?.content as any;
    },
  });

  // 1. Fetch Realtime Proposals from Supabase Database
  const slugKey = `tenant-${tenantId || "default"}-proposals`;
  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["realtime-tenant-proposals", tenantId],
    queryFn: async () => {
      if (!tenantId) return DEFAULT_SEED_PROPOSALS;
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", slugKey).maybeSingle();
      if (data?.content && Array.isArray(data.content)) {
        return data.content as ProposalRecord[];
      }
      // Auto seed default on first load
      await supabase.from("cms_pages").upsert({ slug: slugKey, title: `Proposals ${tenantId}`, content: DEFAULT_SEED_PROPOSALS as any });
      return DEFAULT_SEED_PROPOSALS;
    },
    enabled: !!tenantId,
  });

  // 2. Realtime Channel Subscription
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`realtime-proposals-${tenantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cms_pages", filter: `slug=eq.${slugKey}` },
        () => {
          qc.invalidateQueries({ queryKey: ["realtime-tenant-proposals", tenantId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, qc, slugKey]);

  async function persistProposals(updatedList: ProposalRecord[]) {
    if (!tenantId) return;
    const { error } = await supabase
      .from("cms_pages")
      .upsert({ slug: slugKey, title: `Proposals ${tenantId}`, content: updatedList as any });
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["realtime-tenant-proposals", tenantId] });
  }

  async function addProposal() {
    if (!propTitle || !clientName || !amountInput) return toast.error("Please fill title, client name and amount");
    const num = parseFloat(amountInput);
    if (isNaN(num) || num <= 0) return toast.error("Invalid amount");

    setIsSaving(true);
    try {
      const newPrp: ProposalRecord = {
        id: `PRP-2026-${Math.floor(10 + Math.random() * 90)}`,
        title: propTitle,
        client: clientName,
        amount: num,
        date: new Date().toISOString().slice(0, 10),
        status: "draft",
        created_at: new Date().toISOString(),
      };

      const updated = [newPrp, ...proposals];
      await persistProposals(updated);

      toast.success(`Proposal "${newPrp.id}" Created & Saved to Supabase!`);
      setPropTitle("");
      setClientName("");
      setAmountInput("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create proposal");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateStatus(id: string, newStatus: ProposalRecord["status"]) {
    try {
      const updated = proposals.map((p) => (p.id === id ? { ...p, status: newStatus } : p));
      await persistProposals(updated);
      toast.success(`Proposal ${id} status updated to ${newStatus.toUpperCase()}!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  }

  async function deleteProposal(id: string) {
    try {
      const updated = proposals.filter((p) => p.id !== id);
      await persistProposals(updated);
      toast.success(`Proposal ${id} deleted`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete proposal");
    }
  }

  return (
    <PlanGuard moduleName="Proposals & Quotations" requiredPlan="starter">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <FileText className="size-6 text-primary" /> Realtime Proposals & Quotations
            </h1>
            <p className="text-xs text-muted-foreground">Digital client proposals & quotes synced in real-time to Supabase database.</p>
          </div>
          <div className="flex items-center gap-3">
            <PlanLimitBar used={proposals.length} limit={50} label="Proposals Quota" />
          </div>
        </div>

        {/* Create & List Grid */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Create Form */}
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle className="text-base">Create Proposal / Quote</CardTitle>
              <CardDescription className="text-xs">Generate instant quotation document.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Proposal Title *</label>
                <Input placeholder="e.g. ERP Cloud Implementation" value={propTitle} onChange={(e) => setPropTitle(e.target.value)} className="h-9 text-xs" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Client / Company Name *</label>
                <Input placeholder="Apex Global Ltd" value={clientName} onChange={(e) => setClientName(e.target.value)} className="h-9 text-xs" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Quoted Amount ({sysConfig?.currencySymbol || "₹"}) *</label>
                <Input type="number" placeholder="250000" value={amountInput} onChange={(e) => setAmountInput(e.target.value)} className="h-9 text-xs font-mono" />
              </div>

              <Button size="lg" onClick={addProposal} disabled={isSaving} className="w-full font-bold gap-2">
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Save Proposal Draft
              </Button>
            </CardContent>
          </Card>

          {/* Proposals List */}
          <Card className="lg:col-span-8">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Live Proposal Database ({proposals.length})</CardTitle>
                <CardDescription className="text-xs">Persistent quotation records synced live.</CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-xs text-emerald-600 bg-emerald-500/10">
                ● Live Database
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="py-12 grid place-items-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : proposals.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground italic space-y-1">
                  <FileText className="size-8 mx-auto opacity-30" />
                  <p>No proposals created yet. Create one using the form on the left.</p>
                </div>
              ) : (
                <div className="divide-y text-xs">
                  {proposals.map((p) => (
                    <div key={p.id} className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                      <div className="space-y-1 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-primary">{p.id}</span>
                          <Badge variant="outline" className="text-[9px]">
                            {p.date}
                          </Badge>
                        </div>
                        <p className="font-bold text-foreground text-sm">{p.title}</p>
                        <p className="text-[11px] text-muted-foreground">Client: {p.client}</p>
                      </div>

                      <div className="text-right space-y-1.5 shrink-0">
                        <p className="font-mono font-black text-sm text-emerald-600">{formatSystemAmount(p.amount, sysConfig)}</p>
                        <div className="flex items-center gap-2 justify-end">
                          <Badge className={`text-[9px] font-mono capitalize ${p.status === "accepted" ? "bg-emerald-500 text-white" : p.status === "sent" ? "bg-blue-500 text-white" : "bg-secondary text-foreground"}`}>
                            {p.status}
                          </Badge>
                          {p.status === "draft" && (
                            <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 px-2 font-semibold" onClick={() => updateStatus(p.id, "sent")}>
                              <Send className="size-3" /> Send
                            </Button>
                          )}
                          {p.status === "sent" && (
                            <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 px-2 font-semibold text-emerald-600" onClick={() => updateStatus(p.id, "accepted")}>
                              Accept
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="size-6 text-destructive" onClick={() => deleteProposal(p.id)}>
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PlanGuard>
  );
}
