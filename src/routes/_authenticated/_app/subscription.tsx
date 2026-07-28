import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Sparkles, CheckCircle2, Zap, ArrowRight, ShieldCheck, HelpCircle } from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";
import { PlanLimitBar } from "@/components/plan-guard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/subscription")({
  component: SubscriptionPage,
  head: () => ({ meta: [{ title: "Subscription & Billing — Master ERP" }] }),
});

const PLANS = [
  {
    id: "starter",
    name: "Starter Plan",
    priceMonthly: 1999,
    desc: "For small teams starting with POS, HRM, Products & Basic Invoicing.",
    limits: { employees: 25, invoices: 100, storage: "10 GB", pos: "Included", crm: "Locked" },
    perks: ["Up to 25 Employees", "POS Terminal Addon Included", "Standard Invoices", "Community Support"],
  },
  {
    id: "growth",
    name: "Growth Plan",
    priceMonthly: 4999,
    isPopular: true,
    desc: "Full Financial Ledgers, Accountant, CRM Pipelines & Projects.",
    limits: { employees: 100, invoices: 1000, storage: "50 GB", pos: "Included", crm: "Included" },
    perks: ["Up to 100 Employees", "General Ledger Accounting", "CRM Sales Pipeline", "Team Internal Chat", "Priority Support"],
  },
  {
    id: "enterprise",
    name: "Enterprise Multi-Entity",
    priceMonthly: 12999,
    desc: "Unlimited multi-tenant workspaces, 500+ addons, custom SLA & AI OCR.",
    limits: { employees: 999999, invoices: 999999, storage: "1 TB", pos: "Included", crm: "Included" },
    perks: ["Unlimited Employees & Data", "Multi-Tenant Isolation", "500+ Marketplace Addons", "Dedicated Account Manager", "SOC-2 & ISO Compliance"],
  },
];

function SubscriptionPage() {
  const [currentPlanId, setCurrentPlanId] = useState("growth");
  const [isUpgrading, setIsUpgrading] = useState(false);

  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-platform-settings").maybeSingle();
      return data?.content as any;
    },
  });

  function upgrade(planId: string) {
    if (planId === currentPlanId) return toast.info("You are currently on this plan!");
    setIsUpgrading(true);
    setTimeout(() => {
      setCurrentPlanId(planId);
      setIsUpgrading(false);
      const planObj = PLANS.find((p) => p.id === planId);
      toast.success(`Plan Upgraded to "${planObj?.name}"! Full features unlocked.`);
    }, 1200);
  }

  const activePlan = PLANS.find((p) => p.id === currentPlanId) || PLANS[1];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <CreditCard className="size-6 text-primary" /> Subscription & Upgrade Console
          </h1>
          <p className="text-xs text-muted-foreground">Manage your workspace tier, billing limits, capacity meters & 1-click plan upgrades.</p>
        </div>
        <Badge variant="outline" className="font-mono text-xs px-3 py-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
          ● Current Active Plan: {activePlan.name.toUpperCase()}
        </Badge>
      </div>

      {/* Workspace Plan Limit Meters */}
      <Card className="shadow-sm border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Workspace Plan Capacity & Usage Meters</span>
            <span className="text-xs font-mono text-muted-foreground">Tenant Billing ID: TNT-84920</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-4">
          <PlanLimitBar used={4} limit={activePlan.limits.employees} label="Employee Seats" />
          <PlanLimitBar used={18} limit={activePlan.limits.invoices} label="Monthly Sales Invoices" />
          <PlanLimitBar used={2} limit={10} label="Storage (GB)" />
        </CardContent>
      </Card>

      {/* Plans Pricing Grid */}
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black tracking-tight">Select Workspace Plan</h2>
          <p className="text-xs text-muted-foreground">Instantly unlock higher resource limits, advanced ERP modules & priority support.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 pt-2">
          {PLANS.map((p) => {
            const isCurrent = p.id === currentPlanId;
            return (
              <Card
                key={p.id}
                className={`relative flex flex-col justify-between transition-all hover:shadow-xl ${
                  p.isPopular ? "border-primary shadow-md scale-[1.02]" : ""
                } ${isCurrent ? "bg-primary/5 border-emerald-500" : ""}`}
              >
                {p.isPopular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white font-mono text-[10px]">
                    ★ MOST POPULAR ENTERPRISE CHOICE
                  </Badge>
                )}

                <CardHeader className="space-y-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold">{p.name}</CardTitle>
                    {isCurrent && <Badge variant="default">Active Plan</Badge>}
                  </div>
                  <CardDescription className="text-xs min-h-10 leading-relaxed">{p.desc}</CardDescription>
                  <div className="pt-2">
                    <span className="font-mono text-3xl font-black text-primary">{formatSystemAmount(p.priceMonthly, sysConfig)}</span>
                    <span className="text-xs text-muted-foreground font-mono"> / month</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 text-xs border-t pt-4">
                  <p className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">What's Included:</p>
                  {p.perks.map((perk) => (
                    <div key={perk} className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                      <span>{perk}</span>
                    </div>
                  ))}
                </CardContent>

                <CardFooter className="pt-4 border-t">
                  <Button
                    disabled={isCurrent || isUpgrading}
                    onClick={() => upgrade(p.id)}
                    className="w-full font-bold h-11 gap-2"
                    variant={isCurrent ? "outline" : p.isPopular ? "default" : "secondary"}
                    style={p.isPopular && !isCurrent ? { background: "linear-gradient(135deg, #6366f1, #8b5cf6)" } : {}}
                  >
                    {isCurrent ? "Current Active Plan" : "Upgrade to " + p.name} <ArrowRight className="size-4" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
