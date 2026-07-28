import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Sparkles, CheckCircle2, Zap, ArrowRight, ShieldCheck, HelpCircle, Store, Boxes, Loader2 } from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";
import { PaymentCheckoutModal } from "@/components/payment-checkout-modal";
import { PlanLimitBar } from "@/components/plan-guard";
import { toast } from "sonner";
import type { SubscriptionPlan } from "@/routes/_authenticated/super/plans";

export const Route = createFileRoute("/_authenticated/_app/subscription")({
  component: SubscriptionPage,
  head: () => ({ meta: [{ title: "Subscription & Billing — Master ERP" }] }),
});

const DEFAULT_PLANS = [
  {
    id: "p1",
    name: "Starter Plan",
    price_monthly: 1999,
    max_employees: 25,
    features: ["Core HR", "Attendance", "Standard Support"],
    included_addon_ids: [],
  },
  {
    id: "p2",
    name: "Growth Plan",
    price_monthly: 4999,
    popular: true,
    max_employees: 100,
    features: ["Core HR", "Payroll", "Leave", "5 Addons"],
    included_addon_ids: [],
  },
  {
    id: "p3",
    name: "Enterprise Plan",
    price_monthly: 12999,
    max_employees: 9999,
    features: ["All Modules", "Unlimited Addons", "Dedicated Success"],
    included_addon_ids: [],
  },
];

function SubscriptionPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id;

  const [currentPlanId, setCurrentPlanId] = useState("p2");
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<SubscriptionPlan | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  // 1. Fetch Plans
  const { data: plansData = DEFAULT_PLANS } = useQuery({
    queryKey: ["public-plans-list"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-monetization-plans").maybeSingle();
      if (data?.content && typeof data.content === "object" && "plans" in data.content) {
        return (data.content as any).plans as SubscriptionPlan[];
      }
      return DEFAULT_PLANS as any[];
    },
  });

  // 2. Fetch Super-Admin Available Addons
  const { data: availableAddons = [] } = useQuery({
    queryKey: ["realtime-super-addons-list"],
    queryFn: async () => {
      const { data } = await supabase.from("addons").select("id, name, category, price_monthly");
      return data || [];
    },
  });

  // 3. Fetch Tenant's Purchased Addons
  const purchasedSlugKey = `tenant-${tenantId || "default"}-purchased-addons`;
  const { data: purchasedAddonIds = [] } = useQuery({
    queryKey: ["realtime-purchased-addons", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", purchasedSlugKey).maybeSingle();
      if (data?.content && typeof data.content === "object" && "addon_ids" in data.content) {
        return ((data.content as any).addon_ids ?? []) as string[];
      }
      return [];
    },
    enabled: !!tenantId,
  });

  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-platform-settings").maybeSingle();
      return data?.content as any;
    },
  });

  // Upgrade Plan Callback after Payment Verification
  async function activatePlanAfterPayment(paymentDetails: { method: string; paymentId?: string }) {
    if (!selectedPlanForPayment || !tenantId) return;

    const plan = selectedPlanForPayment;
    setCurrentPlanId(plan.id);

    const bundledAddonIds = plan.included_addon_ids || [];
    const mergedAddons = Array.from(new Set([...purchasedAddonIds, ...bundledAddonIds]));

    await supabase.from("cms_pages").upsert({
      slug: purchasedSlugKey,
      title: `Purchased Addons ${tenantId}`,
      content: { addon_ids: mergedAddons } as any,
      published: true,
    }, { onConflict: "slug" });

    qc.invalidateQueries({ queryKey: ["realtime-purchased-addons", tenantId] });

    const addonNames = availableAddons
      .filter((a) => bundledAddonIds.includes(a.id))
      .map((a) => a.name);

    if (addonNames.length > 0) {
      toast.success(`🎉 Payment Verified via ${paymentDetails.method}! Upgraded to "${plan.name}". Bundled addons (${addonNames.join(", ")}) activated!`);
    } else {
      toast.success(`🎉 Payment Verified via ${paymentDetails.method}! Plan Upgraded to "${plan.name}".`);
    }

    setSelectedPlanForPayment(null);
  }

  function handlePlanSelect(plan: SubscriptionPlan) {
    if (plan.id === currentPlanId) return toast.info(`You are currently on "${plan.name}"!`);
    setSelectedPlanForPayment(plan);
    const price = plan.price_monthly || 0;

    if (price > 0) {
      setIsPaymentModalOpen(true);
    } else {
      // Free plan upgrade
      activatePlanAfterPayment({ method: "Free Tier" });
    }
  }

  const activePlan = plansData.find((p) => p.id === currentPlanId) || plansData[0] || DEFAULT_PLANS[0];

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <CreditCard className="size-6 text-primary" /> Subscription & Billing Console
          </h1>
          <p className="text-xs text-muted-foreground">Manage workspace tiers, Razorpay/PayPal/Bank payments & bundled default activated addons.</p>
        </div>
      </div>

      {/* Active Plan Banner */}
      <Card className="p-6 border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground font-bold">CURRENT ACTIVE TIER</Badge>
              <Badge variant="outline" className="font-mono text-xs">{activePlan.name}</Badge>
            </div>
            <h2 className="text-3xl font-black tracking-tight">{activePlan.name}</h2>
            <p className="text-xs text-muted-foreground max-w-xl">
              Includes access to core operations, priority infrastructure, and bundled addon modules.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-black font-mono text-primary">
              {formatSystemAmount(activePlan.price_monthly, sysConfig)}<span className="text-xs font-normal text-muted-foreground">/mo</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">Capacity: {activePlan.max_employees || 25} Employees</div>
          </div>
        </div>
      </Card>

      {/* Subscription Plans Grid */}
      <div className="space-y-4">
        <h3 className="font-extrabold text-lg flex items-center gap-2">
          <Sparkles className="size-5 text-amber-500" /> Available Workspace Plans
        </h3>

        <div className="grid md:grid-cols-3 gap-6">
          {plansData.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const price = plan.price_monthly || 0;

            return (
              <Card
                key={plan.id}
                className={`flex flex-col justify-between p-6 relative transition-all ${
                  isCurrent ? "border-2 border-primary shadow-lg" : "hover:border-primary/50"
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 right-6 bg-amber-500 text-white font-bold text-[10px]">
                    MOST POPULAR
                  </Badge>
                )}

                <div className="space-y-4">
                  <div>
                    <h4 className="font-extrabold text-xl">{plan.name}</h4>
                    <div className="text-2xl font-black font-mono mt-2 text-primary">
                      {formatSystemAmount(price, sysConfig)}
                      <span className="text-xs text-muted-foreground font-normal"> / month</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-3 border-t text-xs">
                    <div className="font-bold text-muted-foreground uppercase text-[10px]">Included Features & Addons</div>
                    {plan.features?.map((f: string, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t mt-6">
                  {isCurrent ? (
                    <Button disabled className="w-full font-bold text-xs" variant="secondary">
                      <CheckCircle2 className="size-4 mr-1 text-emerald-600" /> Current Plan
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handlePlanSelect(plan)}
                      className="w-full font-bold text-xs gap-2"
                      style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff" }}
                    >
                      <Zap className="size-4" /> Switch / Upgrade Plan
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 3-Option Payment Checkout Modal (Razorpay, PayPal, Manual Bank Transfer + Screenshot Upload) */}
      {selectedPlanForPayment && (selectedPlanForPayment.price_monthly || 0) > 0 && (
        <PaymentCheckoutModal
          open={isPaymentModalOpen}
          onOpenChange={(open) => {
            setIsPaymentModalOpen(open);
            if (!open) setSelectedPlanForPayment(null);
          }}
          title="Switch / Upgrade Workspace Plan"
          itemType="plan"
          itemId={selectedPlanForPayment.id}
          itemName={selectedPlanForPayment.name}
          amount={selectedPlanForPayment.price_monthly || 0}
          description={`Upgrade to ${selectedPlanForPayment.name} (${selectedPlanForPayment.max_employees || "Unlimited"} employee capacity)`}
          onSuccess={activatePlanAfterPayment}
        />
      )}
    </div>
  );
}
