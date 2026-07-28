import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Target, Plus, PhoneCall, Mail, DollarSign, TrendingUp, Building2, UserCheck } from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";
import { PlanGuard, PlanLimitBar } from "@/components/plan-guard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/crm")({
  component: CrmPage,
  head: () => ({ meta: [{ title: "CRM & Pipelines — Master ERP" }] }),
});

const INITIAL_LEADS = [
  { id: "LD-101", name: "Anand Sharma", company: "Apex Global Manufacturing", val: 450000, stage: "lead", email: "anand@apexglobal.com" },
  { id: "LD-102", name: "Dr. Kavita Rao", company: "Nova Health System", val: 890000, stage: "qualified", email: "kavita@novahealth.org" },
  { id: "LD-103", name: "Vikram Malhotra", company: "Zenith Retail Cloud", val: 320000, stage: "proposal", email: "vikram@zenith.com" },
  { id: "LD-104", name: "Rohan Kapoor", company: "Horizon Logistics", val: 680000, stage: "won", email: "rohan@horizon.io" },
];

function CrmPage() {
  const [leads, setLeads] = useState(INITIAL_LEADS);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [val, setVal] = useState("");

  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-platform-settings").maybeSingle();
      return data?.content as any;
    },
  });

  const pipelineValue = leads.reduce((s, l) => s + l.val, 0);

  function addLead() {
    if (!name || !company || !val) return toast.error("Please enter lead name, company and deal value");
    const newLead = {
      id: `LD-${Math.floor(100 + Math.random() * 900)}`,
      name,
      company,
      val: parseFloat(val) || 100000,
      stage: "lead",
      email: `${name.toLowerCase().replace(/\s+/, ".")}@${company.toLowerCase().replace(/\s+/, "")}.com`,
    };
    setLeads([...leads, newLead]);
    toast.success(`Lead "${name}" added to CRM pipeline!`);
    setName("");
    setCompany("");
    setVal("");
  }

  function advanceStage(id: string) {
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          const next = l.stage === "lead" ? "qualified" : l.stage === "qualified" ? "proposal" : "won";
          toast.success(`Deal advanced to ${next.toUpperCase()}`);
          return { ...l, stage: next };
        }
        return l;
      })
    );
  }

  const stages = [
    { id: "lead", title: "New Prospects 🎯", color: "border-blue-500/30 bg-blue-500/5" },
    { id: "qualified", title: "Qualified Pitch ⚡", color: "border-purple-500/30 bg-purple-500/5" },
    { id: "proposal", title: "Proposal Sent 📄", color: "border-amber-500/30 bg-amber-500/5" },
    { id: "won", title: "Closed Won 🎉", color: "border-emerald-500/30 bg-emerald-500/5" },
  ];

  return (
    <PlanGuard moduleName="CRM & Sales Pipeline" requiredPlan="growth">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Target className="size-6 text-primary" /> CRM & Sales Pipeline
            </h1>
            <p className="text-xs text-muted-foreground">Manage enterprise client leads, deal forecasting & sales pipeline conversion.</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-mono text-xs px-3 py-1 bg-primary/10 text-primary border-primary/20">
              Pipeline Value: {formatSystemAmount(pipelineValue, sysConfig)}
            </Badge>
          </div>
        </div>

        {/* Quick Add Lead */}
        <Card className="p-4 bg-card shadow-xs">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input placeholder="Lead Contact Name" value={name} onChange={(e) => setName(e.target.value)} className="text-xs flex-1" />
            <Input placeholder="Company Name" value={company} onChange={(e) => setCompany(e.target.value)} className="text-xs flex-1" />
            <Input type="number" placeholder="Deal Value (₹)" value={val} onChange={(e) => setVal(e.target.value)} className="text-xs w-full sm:w-36 font-mono" />
            <Button onClick={addLead} className="font-bold text-xs gap-1.5 shrink-0">
              <Plus className="size-4" /> Add Lead
            </Button>
          </div>
        </Card>

        {/* Pipeline Columns Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stages.map((stg) => {
            const stgLeads = leads.filter((l) => l.stage === stg.id);
            const stgVal = stgLeads.reduce((s, l) => s + l.val, 0);

            return (
              <div key={stg.id} className={`p-4 rounded-2xl border ${stg.color} space-y-3`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">{stg.title}</span>
                  <span className="font-mono font-black text-xs text-primary">{formatSystemAmount(stgVal, sysConfig)}</span>
                </div>

                <div className="space-y-2.5 min-h-[300px]">
                  {stgLeads.map((l) => (
                    <Card key={l.id} className="p-3.5 space-y-2 shadow-xs hover:border-primary/50 transition-all bg-card">
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-[9px] text-muted-foreground">{l.id}</span>
                        <span className="font-mono font-black text-xs text-emerald-600">{formatSystemAmount(l.val, sysConfig)}</span>
                      </div>
                      <div>
                        <p className="font-bold text-xs text-foreground">{l.name}</p>
                        <p className="text-[11px] text-muted-foreground">{l.company}</p>
                      </div>
                      <div className="pt-2 border-t flex items-center justify-between">
                        <span className="text-[9px] text-muted-foreground font-mono truncate max-w-[120px]">{l.email}</span>
                        {l.stage !== "won" && (
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] font-bold text-primary px-1.5" onClick={() => advanceStage(l.id)}>
                            Advance →
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PlanGuard>
  );
}
