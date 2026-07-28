import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
  { id: "p1", name: "Starter Plan", price_monthly: 49, price_annual: 470, max_employees: 25, features: ["Core HR", "Attendance", "Standard Support"] },
  { id: "p2", name: "Growth Plan", price_monthly: 149, price_annual: 1430, max_employees: 100, features: ["Core HR", "Payroll", "Leave", "5 Addons"], popular: true },
  { id: "p3", name: "Enterprise Plan", price_monthly: 399, price_annual: 3830, max_employees: 500, features: ["All Modules", "Unlimited Addons", "Dedicated Success"] },
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

  // New Plan Dialog
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

  const plans = monetizationData?.plans ?? DEFAULT_PLANS;
  const coupons = monetizationData?.coupons ?? [];
  const orders = monetizationData?.orders ?? DEFAULT_ORDERS;
  const bankTransfers = monetizationData?.bankTransfers ?? [];

  // 2. REALTIME MUTATION: Save monetization state to Supabase
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

    // Generate new paid order
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
    if (!editingPlan?.name) return;
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
      };
      updatedPlans = [...plans, newP];
    }
    saveMonetizationMutation.mutate({ plans: updatedPlans });
    setIsPlanModalOpen(false);
    setEditingPlan(null);
    toast.success("Plan tier saved");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Plans & Monetization</h1>
            <Badge variant="secondary" className="gap-1 text-xs">
              <CreditCard className="size-3 text-primary" /> Realtime Billing & Invoices
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time subscription tiers, promo coupons, customer orders, and bank transfers synced with Supabase.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button size="sm" onClick={() => { setEditingPlan({ name: "", price_monthly: 99, price_annual: 950, max_employees: 50, features: ["Core HR", "Attendance"] }); setIsPlanModalOpen(true); }} className="gap-2">
            <Plus className="size-4" /> Add Plan Tier
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-4 w-[600px]">
          <TabsTrigger value="plans" className="gap-1.5 text-xs">
            <CreditCard className="size-3.5" /> Subscription Plans ({plans.length})
          </TabsTrigger>
          <TabsTrigger value="coupons" className="gap-1.5 text-xs">
            <Tag className="size-3.5" /> Coupons ({coupons.length})
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5 text-xs">
            <ShoppingBag className="size-3.5" /> Orders & Invoices ({orders.length})
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
              {plans.map((p) => (
                <Card key={p.id} className={`p-6 space-y-4 relative ${p.popular ? "border-primary shadow-md" : "border"}`}>
                  {p.popular && <Badge className="absolute -top-3 right-4 bg-primary text-primary-foreground">Popular</Badge>}
                  <div>
                    <h3 className="font-bold text-xl">{p.name}</h3>
                    <div className="mt-2 text-3xl font-extrabold">${p.price_monthly}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                    <p className="text-xs text-muted-foreground mt-1">Up to {p.max_employees} employees</p>
                  </div>
                  <div className="space-y-2 border-t pt-4 text-xs">
                    {p.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check className="size-3.5 text-primary" /> {f}
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setEditingPlan(p); setIsPlanModalOpen(true); }} className="w-full text-xs">
                    Edit Plan Tier
                  </Button>
                </Card>
              ))}
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
          {coupons.length === 0 ? (
            <Card className="p-8 text-center text-xs text-muted-foreground">
              No promo coupons created yet. Click "Create Coupon" to add discount codes.
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {coupons.map((c) => (
                <Card key={c.id} className="p-4 border space-y-2">
                  <div className="flex justify-between items-center">
                    <Badge variant="outline" className="font-mono text-sm font-bold bg-primary/10 text-primary">{c.code}</Badge>
                    <Badge variant={c.active ? "default" : "secondary"}>{c.discount_percent}% OFF</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">Used {c.used_count} of {c.max_uses} times</div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 3: ORDERS & INVOICES */}
        <TabsContent value="orders" className="space-y-4 pt-4">
          <Card className="overflow-hidden border">
            <table className="w-full text-xs text-left">
              <thead className="bg-secondary/50 font-semibold border-b text-[10px] uppercase">
                <tr>
                  <th className="p-3 pl-4">Order #</th>
                  <th className="p-3">Tenant Workspace</th>
                  <th className="p-3">Plan Tier</th>
                  <th className="p-3">Payment Method</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 pr-4 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No order records in database.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id}>
                      <td className="p-3 pl-4 font-mono font-bold text-primary">{o.order_number}</td>
                      <td className="p-3 font-semibold">{o.tenant_name}</td>
                      <td className="p-3">{o.plan_name}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px] font-mono">{o.payment_method || "PayPal"}</Badge>
                      </td>
                      <td className="p-3 font-bold">${o.amount}</td>
                      <td className="p-3"><Badge className="bg-emerald-600 text-white">{o.status}</Badge></td>
                      <td className="p-3 pr-4 text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelectedInvoiceOrder(o)} className="gap-1 text-[11px] h-7">
                          <FileText className="size-3" /> View Invoice
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        {/* TAB 4: BANK TRANSFERS */}
        <TabsContent value="bank_transfers" className="space-y-4 pt-4">
          <Card className="overflow-hidden border">
            <table className="w-full text-xs text-left">
              <thead className="bg-secondary/50 font-semibold border-b text-[10px] uppercase">
                <tr>
                  <th className="p-3 pl-4">Tenant</th>
                  <th className="p-3">Ref Number</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 pr-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {bankTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No bank transfer requests pending.
                    </td>
                  </tr>
                ) : (
                  bankTransfers.map((b) => (
                    <tr key={b.id}>
                      <td className="p-3 pl-4 font-bold">{b.tenant_name}</td>
                      <td className="p-3 font-mono">{b.reference_no}</td>
                      <td className="p-3 font-bold text-primary">${b.amount}</td>
                      <td className="p-3"><Badge variant={b.status === "approved" ? "default" : "outline"}>{b.status}</Badge></td>
                      <td className="p-3 pr-4 text-right">
                        {b.status === "pending" && (
                          <Button size="sm" onClick={() => handleApproveTransfer(b.id)}>Approve Payment</Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>

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

              <table className="w-full text-xs text-left">
                <thead className="bg-secondary font-semibold border-b">
                  <tr>
                    <th className="p-2">Description</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-2 font-medium">{selectedInvoiceOrder.plan_name} (Annual Subscription)</td>
                    <td className="p-2 text-right font-mono font-bold">${selectedInvoiceOrder.amount}.00</td>
                  </tr>
                </tbody>
              </table>

              <div className="flex justify-between items-center font-bold text-sm pt-2">
                <span>Total Amount Paid:</span>
                <span className="text-primary font-mono text-base">${selectedInvoiceOrder.amount}.00 USD</span>
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

      {/* Edit Plan Modal */}
      {editingPlan && (
        <Dialog open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader><DialogTitle>{editingPlan.id ? "Edit Plan Tier" : "Add Plan Tier"}</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label className="text-xs">Plan Name</Label>
                <Input value={editingPlan.name ?? ""} onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Monthly Price ($)</Label>
                <Input type="number" value={editingPlan.price_monthly ?? 0} onChange={(e) => setEditingPlan({ ...editingPlan, price_monthly: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Employee Quota</Label>
                <Input type="number" value={editingPlan.max_employees ?? 50} onChange={(e) => setEditingPlan({ ...editingPlan, max_employees: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPlanModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSavePlan}>Save Plan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
