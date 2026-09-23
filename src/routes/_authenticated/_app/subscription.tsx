import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  CreditCard,
  Sparkles,
  CheckCircle2,
  Zap,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  Store,
  Boxes,
  Loader2,
  FileText,
  Printer,
  Download,
  Receipt,
  ExternalLink,
  Layers,
  Building2,
  Calendar,
  Check,
  AlertTriangle,
  XCircle,
  ArrowDownRight,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatSystemAmount } from "@/lib/currency";
import { PaymentCheckoutModal } from "@/components/payment-checkout-modal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SubscriptionPlan } from "@/routes/_authenticated/super/plans";

export const Route = createFileRoute("/_authenticated/_app/subscription")({
  component: SubscriptionPage,
  head: () => ({ meta: [{ title: "Subscription & Invoices — Master ERP" }] }),
});

export type TenantInvoice = {
  id: string;
  invoiceNumber: string;
  itemName: string;
  itemType: "plan" | "addon";
  amount: number;
  paymentMethod: string;
  paymentId: string;
  date: string;
  status: "paid" | "pending";
  customerName?: string;
  customerEmail?: string;
};

export type PurchasedAddonItem = {
  addonId: string;
  addonSlug: string;
  name: string;
  price: number;
  category?: string;
  purchasedAt: string;
  expiresAt: string;
  status: "active" | "trial" | "expired";
  paymentMethod?: string;
  paymentId?: string;
  invoiceNo?: string;
  install_url?: string;
};

const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: "p1",
    name: "Starter Plan",
    price_monthly: 1999,
    price_annual: 19990,
    max_employees: 25,
    features: ["Core HR & Attendance", "Standard Support", "Basic Reporting"],
    included_addon_ids: [],
  },
  {
    id: "p2",
    name: "Growth Plan",
    price_monthly: 4999,
    price_annual: 49990,
    popular: true,
    max_employees: 100,
    features: ["Core HR & Shifts", "Automated Payroll Runs", "Multi-Tier Leaves", "5 Free Addons"],
    included_addon_ids: ["whatsapp-alerts", "ai-ocr"],
  },
  {
    id: "p3",
    name: "Enterprise Plan",
    price_monthly: 12999,
    price_annual: 129990,
    max_employees: 9999,
    features: ["All 16 HRM Modules", "Unlimited Addons", "Dedicated Success Manager", "24/7 Priority SLA"],
    included_addon_ids: [],
  },
];

export function SubscriptionPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";

  const [currentPlanId, setCurrentPlanId] = useState("");
  const { data: subscription, error: subscriptionError } = useQuery({
    queryKey: ["workspace-subscription", tenantId], enabled: tenantId !== "default",
    queryFn: () => api.get("/workspace/subscription"),
  });
  useEffect(() => { setCurrentPlanId(subscription?.planId || ""); }, [subscription?.planId]);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedDowngradePlan, setSelectedDowngradePlan] = useState("Starter Plan");
  const [downgradeLoading, setDowngradeLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState("pricing");
  const [cancelFeedback, setCancelFeedback] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  const requestPlan = useMutation({
    mutationFn: (plan: SubscriptionPlan) => api.post("/support/platform/tickets", {
      subject: "Subscription plan change: " + plan.name, requestType: "billing_invoices", priority: "medium",
      message: "Please review our request to change to plan " + plan.name + " (" + plan.id + ") and confirm pricing, billing, and workspace limits before activation.",
    }),
    onSuccess: () => toast.success("Plan change requested. Super Admin will review it in platform support."),
    onError: (error: Error) => toast.error(error.message),
  });

  async function handleDowngrade() {
    setDowngradeLoading(true);
    try {
      await api.post("/support/platform/tickets", {
        subject: `Plan Downgrade Request: ${selectedDowngradePlan}`,
        requestType: "billing_invoices",
        priority: "medium",
        message: `Tenant ${tenantId} requested a plan downgrade to ${selectedDowngradePlan}. Effective next billing renewal.`,
      });
      toast.success("Downgrade request scheduled for the next renewal cycle.");
      setShowDowngradeModal(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule downgrade.");
    } finally {
      setDowngradeLoading(false);
    }
  }

  async function handleCancelSubscription() {
    setCancelLoading(true);
    try {
      await api.post("/support/platform/tickets", {
        subject: `Subscription Cancellation Request: Tenant ${tenantId}`,
        requestType: "billing_invoices",
        priority: "high",
        message: `Tenant ${tenantId} has requested subscription cancellation.\nReason: ${cancelReason}\nFeedback: ${cancelFeedback || "No additional feedback provided."}`,
      });
      toast.success("Cancellation request logged. Your account manager will contact you before cycle ends.");
      setShowCancelModal(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit cancellation request.");
    } finally {
      setCancelLoading(false);
    }
  }
  const [viewingInvoice, setViewingInvoice] = useState<TenantInvoice | null>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Subscription Plans
  const { data: plansData = [] } = useQuery({
    queryKey: ["public-plans-list"],
    queryFn: async () => {
      try {
        const page = await api.get("/cms/pages/system-monetization-plans");
        if (page?.content && typeof page.content === "object" && "plans" in page.content) {
          return (page.content as any).plans as SubscriptionPlan[];
        }
        return [];
      } catch {
        return DEFAULT_PLANS;
      }
    },
  });

  // 2. Fetch Super-Admin Available Addons
  const { data: availableAddons = [] } = useQuery({
    queryKey: ["realtime-super-addons-list"],
    queryFn: async () => {
      try {
        const page = await api.get("/cms/pages/system-addons-catalog");
        return Array.isArray(page?.content) ? page.content : [];
      } catch {
        return [];
      }
    },
  });

  // 3. Fetch Tenant Active Purchased Addons
  const purchasedSlugKey = `tenant-${tenantId}-purchased-addons-v2`;
  const { data: purchasedAddons = [] } = useQuery({
    queryKey: ["realtime-purchased-addons-v2", tenantId],
    queryFn: async () => {
      try {
        const page = await api.get(`/cms/pages/${purchasedSlugKey}`);
        if (Array.isArray(page?.content) && page.content.length > 0) {
          return page.content as PurchasedAddonItem[];
        }
        return [];
      } catch {
        return [];
      }
    },
  });

  // 4. Fetch Tenant Invoices & Payment Ledger
  const { data: invoices = [] } = useQuery<TenantInvoice[]>({
    queryKey: ["realtime-tenant-invoices", tenantId],
    queryFn: async () => {
      try {
        const result = await api.get("/payments/razorpay/transactions");
        return (Array.isArray(result?.transactions) ? result.transactions : []).map((transaction: any): TenantInvoice => ({
          id: transaction.id,
          invoiceNumber: transaction.invoiceRef || transaction.orderId,
          itemName: "Razorpay payment",
          itemType: "plan",
          amount: Number(transaction.amount || 0),
          paymentMethod: transaction.method || "Razorpay",
          paymentId: transaction.paymentId || transaction.orderId,
          date: transaction.timestamp || new Date().toISOString(),
          status: transaction.status === "captured" ? "paid" : "pending",
        }));
      } catch {
        return [];
      }
    },
  });

  // Platform regional settings
  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      try {
        const page = await api.get("/cms/pages/system-platform-settings");
        return page?.content || null;
      } catch {
        return null;
      }
    },
  });

  function handlePlanSelect(plan: SubscriptionPlan) {
    if (plan.id !== currentPlanId) requestPlan.mutate(plan);
  }

  function handlePrintInvoice() {
    window.print();
  }

  const activePlan =
    plansData.find((p) => p.id === currentPlanId) || { name: subscription?.planName || "Unassigned", price_monthly: 0, max_employees: subscription?.maxEmployees };

  return (
    <div className="space-y-8 max-w-full pb-12">
      {subscriptionError && <p role="alert" className="text-destructive">Unable to load your subscription: {subscriptionError.message}</p>}
      {subscription && <Card className="p-4 text-sm space-y-2"><p className="font-semibold">Workspace limits controlled by Super Admin</p><p>Employees: {subscription.usage.employees} / {subscription.maxEmployees ?? "Unlimited"} · Users: {subscription.usage.users} / {subscription.maxUsers ?? "Unlimited"}</p><p>Access: {subscription.status}{subscription.expiresAt ? " · Expires " + new Date(subscription.expiresAt).toLocaleDateString() : ""}</p></Card>}
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <CreditCard className="size-6 text-primary" /> Subscription, Addons & Invoices
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage workspace tiers, view currently purchased add-ons, and download official payment tax invoices.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          asChild
          className="gap-2 font-bold text-xs"
        >
          <Link to="/marketplace">
            <Store className="size-4 text-primary" /> Browse Addons Marketplace
          </Link>
        </Button>
      </div>

      {/* Sneat Pro Subscription & Licensing KPI Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Current Active Tier", value: activePlan.name, desc: "Organization subscription tier", icon: CreditCard, color: "text-primary bg-primary/10" },
          { title: "Active Addons", value: `${purchasedAddons.length} Modules`, desc: "Installed marketplace add-ons", icon: Store, color: "text-[oklch(0.60_0.17_155)] bg-[oklch(0.60_0.17_155/0.10)]" },
          { title: "Paid Invoices", value: `${invoices.length} Invoices`, desc: "Lifetime subscription bills", icon: Receipt, color: "text-[oklch(0.73_0.16_75)] bg-[oklch(0.73_0.16_75/0.10)]" },
          { title: "Enterprise Security", value: "Verified Active", desc: "Multi-tenant isolation & SSL", icon: ShieldCheck, color: "text-[oklch(0.60_0.20_200)] bg-[oklch(0.60_0.20_200/0.10)]" },
        ].map((w) => (
          <Card key={w.title} className="border border-border/70 shadow-xs">
            <CardContent className="p-5 flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">{w.title}</span>
                <h4 className="text-xl font-bold tracking-tight text-foreground">{w.value}</h4>
                <p className="text-[11px] text-muted-foreground font-mono">{w.desc}</p>
              </div>
              <div className={cn("size-10 rounded-lg flex items-center justify-center shrink-0", w.color)}>
                <w.icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Plan Banner */}
      <Card className="p-6 border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground font-bold">
                CURRENT ACTIVE TIER
              </Badge>
              <Badge variant="outline" className="font-mono text-xs">
                {activePlan.name}
              </Badge>
            </div>
            <h2 className="text-3xl font-black tracking-tight">{activePlan.name}</h2>
            <p className="text-xs text-muted-foreground max-w-xl">
              Includes access to core operations, priority infrastructure, and bundled add-on modules.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-black font-mono text-primary">
              {formatSystemAmount(activePlan.price_monthly, sysConfig)}
              <span className="text-xs font-normal text-muted-foreground">/mo</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Capacity: {activePlan.max_employees || 25} Employees
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-primary/20 mt-4">
          <Button
            size="sm"
            onClick={() => {
              const el = document.getElementById("available-subscription-tiers");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="gap-1.5 font-bold text-xs"
          >
            <Zap className="size-3.5" /> Upgrade / Change Plan
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowDowngradeModal(true)}
            className="gap-1.5 font-semibold text-xs border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
          >
            <ArrowDownRight className="size-3.5" /> Downgrade Plan
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowCancelModal(true)}
            className="gap-1.5 font-semibold text-xs text-destructive hover:bg-destructive/10"
          >
            <XCircle className="size-3.5" /> Cancel Subscription
          </Button>
        </div>
      </Card>

      {/* SECTION 1: CURRENTLY ACTIVE / PURCHASED ADDONS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-lg flex items-center gap-2">
              <Boxes className="size-5 text-indigo-500" /> Active & Purchased Add-ons
            </h3>
            <p className="text-xs text-muted-foreground">
              Module extensions installed on your workspace instance.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {purchasedAddons.length} Active Modules
          </Badge>
        </div>

        {purchasedAddons.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <Boxes className="size-10 text-muted-foreground/40 mx-auto mb-2" />
            <h4 className="font-bold text-sm">No Independent Add-ons Purchased Yet</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Explore our marketplace to activate modules like WhatsApp Alerts, POS Billing, AI Studio, or Biometric Hardware Sync.
            </p>
            <Button size="sm" className="mt-4 gap-1.5 font-bold text-xs" asChild>
              <Link to="/marketplace">
                <Store className="size-3.5" /> Open Marketplace
              </Link>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {purchasedAddons.map((addon) => (
              <Card key={addon.addonId || addon.addonSlug} className="p-4 flex flex-col justify-between border shadow-xs hover:border-primary/40 transition-colors">
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{addon.name}</h4>
                      <Badge variant="secondary" className="text-[10px] mt-1 capitalize font-semibold">
                        {addon.category || "Extension"}
                      </Badge>
                    </div>
                    <Badge className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      ✓ {addon.status?.toUpperCase() || "ACTIVE"}
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1 font-mono text-[11px] pt-1">
                    <div className="flex justify-between">
                      <span>Rate:</span>
                      <strong className="text-foreground">{formatSystemAmount(addon.price, sysConfig)}/mo</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Activated:</span>
                      <span>{addon.purchasedAt ? new Date(addon.purchasedAt).toLocaleDateString() : "Active"}</span>
                    </div>
                    {addon.paymentMethod && (
                      <div className="flex justify-between">
                        <span>Paid Via:</span>
                        <span className="text-primary font-semibold">{addon.paymentMethod}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t mt-3 flex items-center justify-between gap-2">
                  {addon.install_url ? (
                    <Button size="sm" variant="outline" className="w-full h-8 text-xs font-bold gap-1.5" asChild>
                      <Link to={addon.install_url as any}>
                        <ExternalLink className="size-3.5 text-primary" /> Open Module
                      </Link>
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">Installed</Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: BILLING & TAX INVOICES TABLE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-lg flex items-center gap-2">
              <Receipt className="size-5 text-emerald-500" /> Billing History & Tax Invoices
            </h3>
            <p className="text-xs text-muted-foreground">
              Official receipts with invoice dates, payment gateway IDs, and 1-click PDF download options.
            </p>
          </div>
        </div>

        <Card className="border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b text-[11px] font-bold text-muted-foreground uppercase">
                <tr>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Item / Subscription</th>
                  <th className="p-3">Invoice Date</th>
                  <th className="p-3">Payment Method</th>
                  <th className="p-3">Payment ID / Ref</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground text-xs">
                      No invoices recorded yet. Upgrades and add-on purchases will appear here.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv: TenantInvoice) => (
                    <tr key={inv.id} className="hover:bg-muted/20">
                      <td className="p-3 font-mono font-bold text-primary">{inv.invoiceNumber}</td>
                      <td className="p-3 font-semibold text-foreground">{inv.itemName}</td>
                      <td className="p-3 text-muted-foreground font-mono">{inv.date}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px] font-semibold bg-secondary/50">
                          {inv.paymentMethod}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-muted-foreground truncate max-w-[120px]">
                        {inv.paymentId}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-foreground">
                        {formatSystemAmount(inv.amount, sysConfig)}
                      </td>
                      <td className="p-3 text-center">
                        <Badge className="text-[9px] bg-emerald-500 text-white font-bold py-0 h-4 uppercase">
                          ✓ PAID
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setViewingInvoice(inv)}
                            className="h-7 text-xs font-bold gap-1 text-primary hover:bg-primary/10"
                          >
                            <FileText className="size-3.5" /> View & Download
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* SECTION 3: AVAILABLE PLANS GRID */}
      <div id="available-subscription-tiers" className="space-y-4 pt-4 border-t">
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
                    <div className="font-bold text-muted-foreground uppercase text-[10px]">
                      Included Features & Addons
                    </div>
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
                      disabled={requestPlan.isPending}
                      className="w-full font-bold text-xs gap-2"
                      style={{
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        color: "#fff",
                      }}
                    >
                      <Zap className="size-4" /> Request Plan Change
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* MODAL: VIEW & DOWNLOAD OFFICIAL TAX INVOICE */}
      <Dialog open={!!viewingInvoice} onOpenChange={(open) => !open && setViewingInvoice(null)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Receipt className="size-5 text-primary" /> Official Tax Invoice
            </DialogTitle>
            <DialogDescription className="text-xs">
              Official payment invoice and receipt document.
            </DialogDescription>
          </DialogHeader>

          {viewingInvoice && (
            <div ref={printAreaRef} className="p-6 border rounded-xl bg-card space-y-6 text-xs print:p-0 print:border-none">
              {/* Header Bar */}
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h2 className="text-lg font-black text-primary">{sysConfig?.appName || "Master ERP Enterprise"}</h2>
                  <p className="text-muted-foreground text-[11px] mt-0.5">{sysConfig?.address || "Global Cloud SaaS Platform"}</p>
                  <p className="text-muted-foreground text-[11px]">Support: support@mastererp.com</p>
                </div>
                <div className="text-right">
                  <Badge className="bg-primary text-primary-foreground font-mono font-bold text-xs">
                    TAX INVOICE
                  </Badge>
                  <div className="font-mono font-bold mt-1 text-sm">{viewingInvoice.invoiceNumber}</div>
                  <div className="text-muted-foreground text-[11px]">Date: {viewingInvoice.date}</div>
                </div>
              </div>

              {/* Billed To & Payment Meta */}
              <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3.5 rounded-lg">
                <div>
                  <span className="font-bold text-[10px] uppercase text-muted-foreground">Billed To:</span>
                  <div className="font-bold text-foreground text-sm mt-0.5">{viewingInvoice.customerName || "Tenant Admin"}</div>
                  <div className="text-muted-foreground text-[11px]">{viewingInvoice.customerEmail || "admin@workspace.com"}</div>
                  <div className="text-muted-foreground text-[11px] font-mono mt-1">Tenant ID: {tenantId}</div>
                </div>
                <div className="text-right space-y-0.5">
                  <span className="font-bold text-[10px] uppercase text-muted-foreground">Payment Details:</span>
                  <div className="font-semibold text-foreground mt-0.5">Gateway: {viewingInvoice.paymentMethod}</div>
                  <div className="font-mono text-emerald-600 font-bold text-[11px]">Txn ID: {viewingInvoice.paymentId}</div>
                  <div className="text-emerald-600 font-bold text-[11px] uppercase">Status: {viewingInvoice.status}</div>
                </div>
              </div>

              {/* Itemized Line Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60 border-b font-bold text-[10px] text-muted-foreground uppercase">
                    <tr>
                      <th className="p-2.5 text-left">Description</th>
                      <th className="p-2.5 text-center">Type</th>
                      <th className="p-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-2.5 font-bold text-foreground">{viewingInvoice.itemName}</td>
                      <td className="p-2.5 text-center">
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {viewingInvoice.itemType}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold">
                        {formatSystemAmount(viewingInvoice.amount, sysConfig)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totals Breakdown */}
              <div className="space-y-1.5 pt-2 border-t text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span className="font-mono">{formatSystemAmount(viewingInvoice.amount, sysConfig)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax (Included):</span>
                  <span className="font-mono">₹0.00</span>
                </div>
                <div className="flex justify-between font-black text-sm text-foreground border-t pt-2">
                  <span>Total Amount Paid:</span>
                  <span className="font-mono text-primary">{formatSystemAmount(viewingInvoice.amount, sysConfig)}</span>
                </div>
              </div>

              {/* Footer Stamp */}
              <div className="text-center pt-3 border-t text-[10px] text-muted-foreground">
                <p>Thank you for choosing Master ERP Enterprise! This is a computer-generated tax invoice.</p>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between sm:justify-between items-center w-full">
            <Button size="sm" variant="outline" onClick={() => setViewingInvoice(null)}>
              Close
            </Button>
            <div className="flex gap-2">
              <Button size="sm" onClick={handlePrintInvoice} className="gap-1.5 font-bold">
                <Printer className="size-3.5" /> Print / Save PDF
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DOWNGRADE MODAL */}
      <Dialog open={showDowngradeModal} onOpenChange={setShowDowngradeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-amber-600">
              <AlertTriangle className="size-5 text-amber-600" /> Plan Downgrade Confirmation
            </DialogTitle>
            <DialogDescription className="text-xs">
              Please review the restrictions that will take effect at the end of your current billing cycle.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold">Select Target Tier</label>
              <Select value={selectedDowngradePlan} onValueChange={setSelectedDowngradePlan}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Starter Plan">Starter Plan (25 Employees)</SelectItem>
                  <SelectItem value="Growth Plan">Growth Plan (100 Employees)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-bold">Scheduled Policy</p>
              <p className="text-[11px]">
                Your employee seats and enterprise add-ons will adjust upon cycle completion. No immediate disruption will occur.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowDowngradeModal(false)}>
              Keep Current Plan
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={downgradeLoading}
              onClick={handleDowngrade}
              className="font-bold gap-1.5"
            >
              {downgradeLoading ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Schedule Downgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CANCEL SUBSCRIPTION MODAL */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-destructive">
              <XCircle className="size-5 text-destructive" /> Cancel Subscription
            </DialogTitle>
            <DialogDescription className="text-xs">
              We're sorry to see you go. Help us improve by providing your feedback.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold">Primary Reason</label>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pricing">Pricing / Budget constraints</SelectItem>
                  <SelectItem value="missing_features">Missing features</SelectItem>
                  <SelectItem value="switching">Switching to alternative solution</SelectItem>
                  <SelectItem value="temporary">Temporary business pause</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold">Additional Comments (Optional)</label>
              <Textarea
                placeholder="What could we have done better?"
                value={cancelFeedback}
                onChange={(e) => setCancelFeedback(e.target.value)}
                className="text-xs h-20"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCancelModal(false)}>
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={cancelLoading}
              onClick={handleCancelSubscription}
              className="font-bold gap-1.5"
            >
              {cancelLoading ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default SubscriptionPage;
