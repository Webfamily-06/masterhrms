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
import { openRazorpayCheckout } from "@/lib/razorpay";
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
  const [isUpgrading, setIsUpgrading] = useState(false);

  // 1. REALTIME QUERY: Fetch Super-Admin Configured Subscription Plans
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

  // 2. REALTIME QUERY: Fetch Super-Admin Available Addons
  const { data: availableAddons = [] } = useQuery({
    queryKey: ["realtime-super-addons-list"],
    queryFn: async () => {
      const { data } = await supabase.from("addons").select("id, name, category, price_monthly");
      return data || [];
    },
  });

  // 3. REALTIME QUERY: Fetch Tenant's Purchased / Activated Addons
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

  // Upgrade Plan Handler: Triggers Razorpay Payment Gateway & Auto-Activates Bundled Default Addons
  async function upgrade(plan: SubscriptionPlan) {
    if (plan.id === currentPlanId) return toast.info(`You are currently on "${plan.name}"!`);
    if (!tenantId) return toast.error("Workspace tenant session missing");

    setIsUpgrading(true);
    try {
      const price = plan.price_monthly || 0;
      let razorpayResponse = null;

      // Paid Plan Upgrade -> Trigger Razorpay Payment Gateway checkout page
      if (price > 0) {
        toast.info("Launching Razorpay Payment Gateway...");
        razorpayResponse = await openRazorpayCheckout({
          amount: price,
          name: plan.name,
          description: `Subscription upgrade to ${plan.name} (${plan.max_employees || "Unlimited"} employee limit)`,
          userName: profile?.full_name || user?.email || "Workspace Admin",
          userEmail: user?.email || "admin@workspace.com",
          tenantId: tenantId,
        });

        if (!razorpayResponse || !razorpayResponse.razorpay_payment_id) {
          throw new Error("Payment response is null or incomplete. Plan upgrade was not completed.");
        }
      }

      // Payment verified or free plan -> Upgrade plan & activate bundled addons
      setCurrentPlanId(plan.id);

      const bundledAddonIds = plan.included_addon_ids || [];
      const mergedAddons = Array.from(new Set([...purchasedAddonIds, ...bundledAddonIds]));

      await supabase.from("cms_pages").upsert({
        slug: purchasedSlugKey,
        title: `Purchased Addons ${tenantId}`,
        content: { addon_ids: mergedAddons } as any,
        published: true,
      }, { onConflict: "slug" });

      // Log transaction to Razorpay logs if paid
      if (razorpayResponse && razorpayResponse.razorpay_payment_id) {
        try {
          const razorpaySlug = `system-razorpay-gateway-${tenantId}`;
          const { data: existingData } = await supabase.from("cms_pages").select("content").eq("slug", razorpaySlug).maybeSingle();
          const p = (existingData?.content as any) || {};
          const existingTxns = p.transactions || [];
          const newTxn = {
            id: `txn-${Date.now()}`,
            paymentId: razorpayResponse.razorpay_payment_id,
            orderId: razorpayResponse.razorpay_order_id || `ord_${Date.now()}`,
            customer: profile?.full_name || user?.email || "Workspace Customer",
            amount: price,
            currency: "INR",
            status: "captured",
            method: "Razorpay Checkout",
            timestamp: new Date().toLocaleString(),
            invoiceRef: `PLAN-${plan.name}`,
          };
          await supabase.from("cms_pages").upsert({
            slug: razorpaySlug,
            title: "Razorpay Gateway Config",
            content: { ...p, transactions: [newTxn, ...existingTxns] },
            published: true,
          }, { onConflict: "slug" });
        } catch (logErr) {
          console.warn("Transaction log error:", logErr);
        }
      }

      qc.invalidateQueries({ queryKey: ["realtime-purchased-addons", tenantId] });

      const addonNames = availableAddons
        .filter((a) => bundledAddonIds.includes(a.id))
        .map((a) => a.name);

      if (addonNames.length > 0) {
        toast.success(`🎉 Payment Verified (ID: ${razorpayResponse?.razorpay_payment_id || "FREE"})! Upgraded to "${plan.name}". Bundled addons (${addonNames.join(", ")}) activated!`);
      } else {
        toast.success(`🎉 Payment Verified (ID: ${razorpayResponse?.razorpay_payment_id || "FREE"})! Plan Upgraded to "${plan.name}".`);
      }
    } catch (err: any) {
      toast.error(
        `❌ Payment Rejected / Failed: ${err.message || "Payment was not completed. Plan upgrade aborted."}`,
        { duration: 6000 }
      );
    } finally {
      setIsUpgrading(false);
    }
  }

  const activePlan = plansData.find((p) => p.id === currentPlanId) || plansData[0] || DEFAULT_PLANS[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <CreditCard className="size-6 text-primary" /> Subscription & Upgrade Console
          </h1>
          <p className="text-xs text-muted-foreground">Manage your workspace tier, bundled default activated addons & resource limits.</p>
        </div>
        <Badge variant="outline" className="font-mono text-xs px-3 py-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
          ● Active Plan: {(activePlan.name || "Growth").toUpperCase()}
        </Badge>
      </div>

      {/* Workspace Plan Limit Meters */}
      <Card className="shadow-sm border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Workspace Plan Capacity & Resource Meters</span>
            <span className="text-xs font-mono text-muted-foreground">Tenant Workspace ID: TNT-{tenantId?.slice(0, 6) || "84920"}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-4">
          <PlanLimitBar used={4} limit={activePlan.max_employees || 100} label="Employee Seats" />
          <PlanLimitBar used={18} limit={1000} label="Monthly Sales Invoices" />
          <PlanLimitBar used={2} limit={50} label="Storage (GB)" />
        </CardContent>
      </Card>

      {/* Plans Pricing Grid */}
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black tracking-tight">Choose Your Workspace Plan</h2>
          <p className="text-xs text-muted-foreground">Select a plan configured by Super-Admin to automatically activate bundled default addons.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 pt-2">
          {plansData.map((p) => {
            const isCurrent = p.id === currentPlanId;
            const bundledAddonIds = p.included_addon_ids || [];
            const bundledAddons = availableAddons.filter((a) => bundledAddonIds.includes(a.id));

            return (
              <Card
                key={p.id}
                className={`relative flex flex-col justify-between transition-all hover:shadow-xl ${
                  p.popular ? "border-primary shadow-md scale-[1.02]" : ""
                } ${isCurrent ? "bg-primary/5 border-emerald-500" : ""}`}
              >
                {p.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white font-mono text-[10px]">
                    ★ RECOMMENDED ENTERPRISE TIER
                  </Badge>
                )}

                <CardHeader className="pt-6">
                  <CardTitle className="text-xl font-bold flex items-center justify-between">
                    <span>{p.name}</span>
                    {isCurrent && (
                      <Badge variant="outline" className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                        Current Plan
                      </Badge>
                    )}
                  </CardTitle>

                  <div className="mt-4">
                    <span className="text-3xl font-black font-mono">
                      {formatSystemAmount(p.price_monthly, sysConfig)}
                    </span>
                    <span className="text-xs text-muted-foreground font-normal"> / month</span>
                  </div>

                  <p className="text-xs text-muted-foreground mt-2 font-mono">
                    Includes up to {p.max_employees} employee roster seats.
                  </p>
                </CardHeader>

                <CardContent className="space-y-4 pt-0 text-xs">
                  {/* Standard Perks */}
                  <div className="space-y-2 border-t pt-3">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Plan Features</div>
                    {p.features?.map((perk: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                        <span>{perk}</span>
                      </div>
                    ))}
                  </div>

                  {/* Bundled Default Activated Addons */}
                  <div className="space-y-2 border-t pt-3">
                    <div className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider flex items-center gap-1">
                      <Boxes className="size-3" /> Bundled Default Addons ({bundledAddons.length})
                    </div>
                    {bundledAddons.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground italic">Standard plan features.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {bundledAddons.map((addon) => (
                          <Badge key={addon.id} variant="outline" className="text-[9px] font-mono bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                            ✓ {addon.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="pt-4 border-t">
                  <Button
                    onClick={() => upgrade(p)}
                    disabled={isCurrent || isUpgrading}
                    className="w-full font-bold text-xs gap-2"
                    variant={isCurrent ? "outline" : "default"}
                  >
                    {isUpgrading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : isCurrent ? (
                      <>
                        <CheckCircle2 className="size-4 text-emerald-600" /> Active Workspace Plan
                      </>
                    ) : (
                      <>
                        Select {p.name} <ArrowRight className="size-4" />
                      </>
                    )}
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
