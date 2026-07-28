import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, CheckCircle2, Clock, Send, DollarSign, Download } from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";
import { PlanGuard, PlanLimitBar } from "@/components/plan-guard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/proposals")({
  component: ProposalsPage,
  head: () => ({ meta: [{ title: "Proposals & Quotes — Master ERP" }] }),
});

const INITIAL_PROPOSALS = [
  { id: "PRP-2026-01", title: "Enterprise ERP Cloud Migration & Training Proposal", client: "Apex Global Ltd", amount: 450000, date: "2026-07-28", status: "sent" },
  { id: "PRP-2026-02", title: "Biometric Hardware Infrastructure Setup Quote", client: "Nova Health System", amount: 890000, date: "2026-07-25", status: "accepted" },
  { id: "PRP-2026-03", title: "Custom WhatsApp API & Notification Addon Quotation", client: "Zenith Retail Cloud", amount: 120000, date: "2026-07-20", status: "draft" },
];

function ProposalsPage() {
  const [proposals, setProposals] = useState(INITIAL_PROPOSALS);
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [amount, setAmount] = useState("");

  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-platform-settings").maybeSingle();
      return data?.content as any;
    },
  });

  function addProposal() {
    if (!title || !client || !amount) return toast.error("Please fill title, client name and amount");
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return toast.error("Invalid amount");

    const newPrp = {
      id: `PRP-2026-${Math.floor(10 + Math.random() * 90)}`,
      title,
      client,
      amount: num,
      date: new Date().toISOString().slice(0, 10),
      status: "draft",
    };
    setProposals([newPrp, ...proposals]);
    toast.success(`Proposal "${newPrp.id}" Created!`);
    setTitle("");
    setClient("");
    setAmount("");
  }

  function sendProposal(id: string) {
    setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, status: "sent" } : p)));
    toast.success(`Proposal ${id} sent to client email!`);
  }

  return (
    <PlanGuard moduleName="Proposals & Quotations" requiredPlan="starter">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <FileText className="size-6 text-primary" /> Client Proposals & Quotations
            </h1>
            <p className="text-xs text-muted-foreground">Create professional business proposals, PDF quotes & digital client acceptance links.</p>
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
                <Input placeholder="e.g. ERP Cloud Implementation" value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 text-xs" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Client / Company Name *</label>
                <Input placeholder="Apex Global Ltd" value={client} onChange={(e) => setClient(e.target.value)} className="h-9 text-xs" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Quoted Amount ({sysConfig?.currencySymbol || "₹"}) *</label>
                <Input type="number" placeholder="250000" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9 text-xs font-mono" />
              </div>

              <Button size="lg" onClick={addProposal} className="w-full font-bold gap-2">
                <Plus className="size-4" /> Save Proposal Draft
              </Button>
            </CardContent>
          </Card>

          {/* Proposals List */}
          <Card className="lg:col-span-8">
            <CardHeader>
              <CardTitle className="text-base">Active Proposals ({proposals.length})</CardTitle>
              <CardDescription className="text-xs">Status of sent & draft quotations.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
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
                        <Badge className={`text-[9px] font-mono capitalize ${p.status === "accepted" ? "bg-emerald-500" : p.status === "sent" ? "bg-blue-500" : "bg-secondary text-foreground"}`}>
                          {p.status}
                        </Badge>
                        {p.status === "draft" && (
                          <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 px-2 font-semibold" onClick={() => sendProposal(p.id)}>
                            <Send className="size-3" /> Send
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PlanGuard>
  );
}
