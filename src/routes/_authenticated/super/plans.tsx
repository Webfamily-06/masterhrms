import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  CreditCard,
  Tag,
  ShoppingBag,
  Building,
  Plus,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
  DollarSign,
  Search,
  Check,
  Calendar,
  Percent,
  RefreshCw,
  Loader2,
  FileText,
  Printer,
  Download,
  Store,
  Zap,
  Boxes,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/super/plans")({
  component: PlansMonetizationAdmin,
});

export type SubscriptionPlan = {
  id: string;
  name: string;
  price_monthly: number;
  price_annual: number;
  max_employees: number;
  features: string[];
  included_addon_ids?: string[]; // Addons auto-activated when user selects this plan
  popular?: boolean;
};

export type PromoCoupon = {
  id: string;
  code: string;
  discount_percent: number;
  max_uses: number;
  used_count: number;
  active: boolean;
};

export type CustomerOrder = {
  id: string;
  order_number: string;
  tenant_name: string;
  plan_name: string;
  amount: number;
  payment_method: "PayPal" | "Razorpay" | "Bank Transfer";
  status: "paid" | "pending" | "failed";
  date: string;
};

export type BankTransferRequest = {
  id: string;
  tenant_name: string;
  amount: number;
  reference_no: string;
  receipt_url: string;
  status: "pending" | "approved" | "rejected";
  date: string;
};

const DEFAULT_PLANS: SubscriptionPlan[] = [
  { id: "p1", name: "Starter Plan", price_monthly: 49, price_annual: 470, max_employees: 25, features: ["Core HR", "Attendance", "Standard Support"], included_addon_ids: [] },
  { id: "p2", name: "Growth Plan", price_monthly: 149, price_annual: 1430, max_employees: 100, features: ["Core HR", "Payroll", "Leave", "5 Addons"], included_addon_ids: [], popular: true },
  { id: "p3", name: "Enterprise Plan", price_monthly: 399, price_annual: 3830, max_employees: 500, features: ["All Modules", "Unlimited Addons", "Dedicated Success"], included_addon_ids: [] },
];

const DEFAULT_ORDERS: CustomerOrder[] = [
  { id: "o1", order_number: "ORD-9901", tenant_name: "Acme Corp", plan_name: "Growth Plan", amount: 149, payment_method: "PayPal", status: "paid", date: "2026-07-27" },
  { id: "o2", order_number: "ORD-9902", tenant_name: "Cyberdyne Systems", plan_name: "Enterprise Plan", amount: 399, payment_method: "Razorpay", status: "paid", date: "2026-07-26" },
];

function PlansMonetizationAdmin() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"plans" | "coupons" | "orders" | "bank_transfers">("plans");

  // New Coupon Dialog
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newDiscount, setNewDiscount] = useState(20);

  // New Plan Dialog State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<SubscriptionPlan> | null>(null);

  // Invoice Dialog
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<CustomerOrder | null>(null);

  // 1. REALTIME QUERY: Fetch plans & billing data from Supabase
  const { data: monetizationData, isLoading, refetch } = useQuery({
    queryKey: ["realtime-plans-monetization"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-monetization-plans").maybeSingle();
      if (data?.content) {
        const parsed = data.content as any;
        return {
          plans: (parsed.plans ?? DEFAULT_PLANS) as SubscriptionPlan[],
          coupons: (parsed.coupons ?? []) as PromoCoupon[],
          orders: (parsed.orders ?? DEFAULT_ORDERS) as CustomerOrder[],
          bankTransfers: (parsed.bankTransfers ?? []) as BankTransferRequest[],
        };
      }
      return { plans: DEFAULT_PLANS, coupons: [], orders: DEFAULT_ORDERS, bankTransfers: [] };
    },
  });

  // 2. REALTIME QUERY: Fetch available Super-Admin Addons from `addons` table
  const { data: availableAddons = [] } = useQuery({
    queryKey: ["realtime-super-addons-list"],
    queryFn: async () => {
      const { data } = await supabase.from("addons").select("id, name, slug, category, price_monthly").order("name", { ascending: true });
      return data || [];
    },
  });

  const plans = monetizationData?.plans ?? DEFAULT_PLANS;
  const coupons = monetizationData?.coupons ?? [];
  const orders = monetizationData?.orders ?? DEFAULT_ORDERS;
  const bankTransfers = monetizationData?.bankTransfers ?? [];

  // 3. REALTIME MUTATION: Save monetization state to Supabase
  const saveMonetizationMutation = useMutation({
    mutationFn: async (updatedData: {
      plans?: SubscriptionPlan[];
      coupons?: PromoCoupon[];
      orders?: CustomerOrder[];
      bankTransfers?: BankTransferRequest[];
    }) => {
      const payload = {
        plans: updatedData.plans ?? plans,
        coupons: updatedData.coupons ?? coupons,
        orders: updatedData.orders ?? orders,
        bankTransfers: updatedData.bankTransfers ?? bankTransfers,
      };
      const { error } = await supabase.from("cms_pages").upsert({
        slug: "system-monetization-plans",
        title: "System Monetization & Subscriptions",
        meta_description: "Realtime subscription plans, coupons, orders, and bank transfers",
        content: payload as any,
        published: true,
      }, { onConflict: "slug" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["realtime-plans-monetization"] });
      qc.invalidateQueries({ queryKey: ["public-plans-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleCreateCoupon() {
    if (!newCode) return;
    const newCoupon: PromoCoupon = {
      id: `c-${Date.now()}`,
      code: newCode.toUpperCase(),
      discount_percent: newDiscount,
      max_uses: 100,
      used_count: 0,
      active: true,
    };
    saveMonetizationMutation.mutate({ coupons: [...coupons, newCoupon] });
    setNewCode("");
    setIsCouponModalOpen(false);
    toast.success("Coupon code created in real-time");
  }

  function handleApproveTransfer(id: string) {
    const target = bankTransfers.find((b) => b.id === id);
    const updatedTransfers = bankTransfers.map((b) => (b.id === id ? { ...b, status: "approved" as const } : b));

    let updatedOrders = orders;
    if (target) {
      const newOrder: CustomerOrder = {
        id: `o-${Date.now()}`,
        order_number: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        tenant_name: target.tenant_name,
        plan_name: "Annual Subscription Plan",
        amount: target.amount,
        payment_method: "Bank Transfer",
        status: "paid",
        date: new Date().toISOString().split("T")[0],
      };
      updatedOrders = [newOrder, ...orders];
    }

    saveMonetizationMutation.mutate({ bankTransfers: updatedTransfers, orders: updatedOrders });
    toast.success("Bank transfer approved & order invoice generated!");
  }

  function handleSavePlan() {
    if (!editingPlan?.name) return toast.error("Plan name is required");
    let updatedPlans: SubscriptionPlan[];
    if (editingPlan.id) {
      updatedPlans = plans.map((p) => (p.id === editingPlan.id ? ({ ...p, ...editingPlan } as SubscriptionPlan) : p));
    } else {
      const newP: SubscriptionPlan = {
        id: `p-${Date.now()}`,
        name: editingPlan.name,
        price_monthly: editingPlan.price_monthly || 99,
        price_annual: editingPlan.price_annual || 990,
        max_employees: editingPlan.max_employees || 50,
        features: editingPlan.features || ["Core HR", "Attendance"],
        included_addon_ids: editingPlan.included_addon_ids || [],
      };
      updatedPlans = [...plans, newP];
    }
    saveMonetizationMutation.mutate({ plans: updatedPlans });
    setIsPlanModalOpen(false);
    setEditingPlan(null);
    toast.success("Subscription Plan & bundled default activated addons saved!");
  }

  function toggleAddonInPlan(addonId: string) {
    const currentList = editingPlan?.included_addon_ids || [];
    const exists = currentList.includes(addonId);
    const updatedList = exists ? currentList.filter((id) => id !== addonId) : [...currentList, addonId];
    setEditingPlan({ ...editingPlan, included_addon_ids: updatedList });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Plans & Monetization Console</h1>
            <Badge variant="secondary" className="gap-1 text-xs font-mono">
              <CreditCard className="size-3 text-primary" /> Realtime Sync Enabled
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Configure subscription plan tiers, bundle default activated addons, and manage promo coupons & bank transfers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button size="sm" onClick={() => { setEditingPlan({ name: "", price_monthly: 99, price_annual: 950, max_employees: 50, features: ["Core HR", "Attendance"], included_addon_ids: [] }); setIsPlanModalOpen(true); }} className="gap-2 bg-primary">
            <Plus className="size-4" /> Add Plan Tier
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-4 w-[620px]">
          <TabsTrigger value="plans" className="gap-1.5 text-xs">
            <CreditCard className="size-3.5" /> Subscription Plans ({plans.length})
          </TabsTrigger>
          <TabsTrigger value="coupons" className="gap-1.5 text-xs">
            <Tag className="size-3.5" /> Coupons ({coupons.length})
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5 text-xs">
            <ShoppingBag className="size-3.5" /> Orders ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="bank_transfers" className="gap-1.5 text-xs">
            <Building className="size-3.5" /> Bank Transfers ({bankTransfers.filter((b) => b.status === "pending").length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: SUBSCRIPTION PLANS */}
        <TabsContent value="plans" className="space-y-4 pt-4">
          {isLoading ? (
            <div className="py-20 grid place-items-center">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {plans.map((p) => {
                const bundledAddonIds = p.included_addon_ids || [];
                const bundledAddonNames = availableAddons
                  .filter((a) => bundledAddonIds.includes(a.id))
                  .map((a) => a.name);

                return (
                  <Card key={p.id} className={`p-6 flex flex-col justify-between relative ${p.popular ? "border-primary shadow-md" : "border"}`}>
                    {p.popular && <Badge className="absolute -top-3 right-4 bg-primary text-primary-foreground font-mono text-[10px]">Popular Tier</Badge>}
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-bold text-xl">{p.name}</h3>
                        <div className="mt-2 text-3xl font-extrabold font-mono">${p.price_monthly}<span className="text-xs font-normal text-muted-foreground">/mo</span></div>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">Up to {p.max_employees} employee seats</p>
                      </div>

                      {/* Standard Features */}
                      <div className="space-y-1.5 border-t pt-3 text-xs">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Standard Perks</div>
                        {p.features.map((f, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Check className="size-3.5 text-primary shrink-0" /> {f}
                          </div>
                        ))}
                      </div>

                      {/* Default Activated Addons Section */}
                      <div className="space-y-1.5 border-t pt-3 text-xs">
                        <div className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider flex items-center gap-1">
                          <Boxes className="size-3" /> Default Activated Addons ({bundledAddonIds.length})
                        </div>
                        {bundledAddonNames.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground italic">No default addons bundled yet.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {bundledAddonNames.map((name, i) => (
                              <Badge key={i} variant="outline" className="text-[9px] font-mono bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                ✓ {name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <Button variant="outline" size="sm" onClick={() => { setEditingPlan(p); setIsPlanModalOpen(true); }} className="w-full text-xs font-bold gap-2 mt-6">
                      <Pencil className="size-3.5" /> Edit Plan & Bundled Addons
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: COUPONS */}
        <TabsContent value="coupons" className="space-y-4 pt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm">Active Promo Coupons ({coupons.length})</h3>
            <Button size="sm" onClick={() => setIsCouponModalOpen(true)} className="gap-1.5 text-xs">
              <Plus className="size-3.5" /> Create Coupon
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {coupons.map((c) => (
              <Card key={c.id} className="p-4 border space-y-2">
                <div className="flex justify-between items-center">
                  <Badge className="font-mono text-sm">{c.code}</Badge>
                  <span className="font-bold text-emerald-600 text-sm">{c.discount_percent}% OFF</span>
                </div>
                <div className="text-xs text-muted-foreground font-mono">Uses: {c.used_count} / {c.max_uses}</div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 3: ORDERS */}
        <TabsContent value="orders" className="space-y-4 pt-4">
          <Card className="overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-secondary/40 font-semibold border-b">
                <tr>
                  <th className="p-3">Order #</th>
                  <th className="p-3">Tenant Name</th>
                  <th className="p-3">Plan Name</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-secondary/20">
                    <td className="p-3 font-mono font-bold">{o.order_number}</td>
                    <td className="p-3 font-bold">{o.tenant_name}</td>
                    <td className="p-3">{o.plan_name}</td>
                    <td className="p-3 font-mono font-bold">${o.amount}</td>
                    <td className="p-3"><Badge variant="default">{o.status}</Badge></td>
                    <td className="p-3">
                      <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setSelectedInvoiceOrder(o)}>
                        View Invoice
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        {/* TAB 4: BANK TRANSFERS */}
        <TabsContent value="bank_transfers" className="space-y-4 pt-4">
          <Card className="overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-secondary/40 font-semibold border-b">
                <tr>
                  <th className="p-3">Tenant Name</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Ref #</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {bankTransfers.map((b) => (
                  <tr key={b.id}>
                    <td className="p-3 font-bold">{b.tenant_name}</td>
                    <td className="p-3 font-mono">${b.amount}</td>
                    <td className="p-3 font-mono">{b.reference_no}</td>
                    <td className="p-3"><Badge variant={b.status === "approved" ? "default" : "secondary"}>{b.status}</Badge></td>
                    <td className="p-3">
                      {b.status === "pending" && (
                        <Button size="sm" onClick={() => handleApproveTransfer(b.id)} className="h-7 text-xs bg-emerald-600">
                          Approve Transfer
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL: EDIT PLAN TIER & REALTIME BUNDLED DEFAULT ACTIVATED ADDONS */}
      {editingPlan && (
        <Dialog open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
          <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="size-5 text-primary" />
                {editingPlan.id ? "Edit Plan Tier & Default Activated Addons" : "Add New Subscription Plan Tier"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Select real-time Super-Admin marketplace addons that will be <strong>automatically activated by default</strong> when a tenant chooses this plan.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Plan Name *</Label>
                  <Input
                    placeholder="Growth Plan"
                    value={editingPlan.name ?? ""}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Max Employee Seats</Label>
                  <Input
                    type="number"
                    value={editingPlan.max_employees ?? 50}
                    onChange={(e) => setEditingPlan({ ...editingPlan, max_employees: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Monthly Price ($)</Label>
                  <Input
                    type="number"
                    value={editingPlan.price_monthly ?? 0}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price_monthly: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Annual Price ($)</Label>
                  <Input
                    type="number"
                    value={editingPlan.price_annual ?? 0}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price_annual: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* REAL-TIME MARKETPLACE ADDONS SELECTOR */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                    <Store className="size-4" /> Default Activated Addons (Realtime Sync)
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {(editingPlan.included_addon_ids || []).length} selected
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Check the addons below. When a user selects <strong>{editingPlan.name || "this plan"}</strong>, these addons are automatically unlocked & activated for their workspace!
                </p>

                {availableAddons.length === 0 ? (
                  <div className="p-4 rounded-xl border bg-secondary/30 text-center text-xs text-muted-foreground">
                    No marketplace addons found in Super-Admin DB. Add modules in /super/marketplace first.
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-xl bg-secondary/20">
                    {availableAddons.map((addon) => {
                      const isChecked = (editingPlan.included_addon_ids || []).includes(addon.id);
                      return (
                        <div
                          key={addon.id}
                          onClick={() => toggleAddonInPlan(addon.id)}
                          className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                            isChecked ? "bg-emerald-500/10 border-emerald-500/50 text-foreground font-semibold" : "bg-card hover:bg-secondary/50 text-muted-foreground"
                          }`}
                        >
                          <Checkbox checked={isChecked} onCheckedChange={() => toggleAddonInPlan(addon.id)} />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-xs truncate">{addon.name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {addon.price_monthly === 0 ? "Free" : `$${addon.price_monthly}/mo`} · {addon.category || "Module"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsPlanModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSavePlan} className="bg-primary font-bold">Save Plan Tier</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Invoice View Modal */}
      {selectedInvoiceOrder && (
        <Dialog open={!!selectedInvoiceOrder} onOpenChange={() => setSelectedInvoiceOrder(null)}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="size-5 text-primary" /> Tax Invoice — {selectedInvoiceOrder.order_number}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 border-y my-2 text-xs">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-extrabold text-sm text-primary">Master HRMS Inc.</h4>
                  <p className="text-muted-foreground">100 Tech Park, Suite 400</p>
                  <p className="text-muted-foreground">support@masterhrms.com</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="font-mono text-xs">{selectedInvoiceOrder.order_number}</Badge>
                  <p className="text-muted-foreground mt-1">Date: {selectedInvoiceOrder.date}</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-secondary/30 space-y-1">
                <div className="font-bold">Billed To:</div>
                <div className="font-semibold text-foreground">{selectedInvoiceOrder.tenant_name}</div>
                <div className="text-muted-foreground">Payment Method: {selectedInvoiceOrder.payment_method || "PayPal"}</div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => window.print()} className="gap-1.5 text-xs">
                <Printer className="size-3.5" /> Print / Save PDF
              </Button>
              <Button onClick={() => setSelectedInvoiceOrder(null)}>Close Invoice</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Coupon Modal */}
      <Dialog open={isCouponModalOpen} onOpenChange={setIsCouponModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Create Discount Coupon</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Coupon Code</Label>
              <Input placeholder="e.g. SUMMER20" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Discount Percentage (%)</Label>
              <Input type="number" value={newDiscount} onChange={(e) => setNewDiscount(parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCouponModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCoupon}>Create Code</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
