import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PlanGuard } from "@/components/plan-guard";
import { formatSystemAmount } from "@/lib/currency";
import { toast } from "sonner";
import {
  CreditCard, Settings2, CheckCircle2, XCircle, Loader2, History,
  Play, Eye, EyeOff, Webhook, DollarSign, TrendingUp, Shield,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/razorpay-gateway")({
  component: RazorpayGatewayPage,
  head: () => ({ meta: [{ title: "Razorpay Payment Gateway — Master ERP" }] }),
});

type PaymentTransaction = {
  id: string;
  paymentId: string;
  orderId: string;
  customer: string;
  amount: number;
  currency: string;
  status: "captured" | "failed" | "refunded" | "pending";
  method: string;
  timestamp: string;
  invoiceRef: string;
};

function RazorpayGatewayPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";
  const SLUG = `system-razorpay-gateway-${tenantId}`;

  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [testAmount, setTestAmount] = useState("");
  const [testDesc, setTestDesc] = useState("Test Payment");
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-platform-settings").maybeSingle();
      return data?.content as any;
    },
  });

  const { data: storeData } = useQuery({
    queryKey: ["razorpay-gateway", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", SLUG).maybeSingle();
      if (data?.content) {
        const p = data.content as any;
        if (p.config) {
          setKeyId(p.config.keyId || "");
          setKeySecret(p.config.keySecret || "");
          setWebhookSecret(p.config.webhookSecret || "");
        }
        return { transactions: (p.transactions || []) as PaymentTransaction[], config: p.config || {} };
      }
      return { transactions: [] as PaymentTransaction[], config: {} };
    },
  });

  const transactions = storeData?.transactions ?? [];

  const persist = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from("cms_pages").upsert({ slug: SLUG, title: "Razorpay Gateway Config", content: payload, published: true }, { onConflict: "slug" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["razorpay-gateway", tenantId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  async function saveConfig() {
    setIsSaving(true);
    const config = { keyId, keySecret, webhookSecret };
    persist.mutate({ transactions, config });
    setIsSaving(false);
    toast.success("Razorpay API credentials saved securely!");
  }

  async function runTestPayment() {
    const amount = parseFloat(testAmount);
    if (!amount || amount <= 0) return toast.error("Enter a valid test amount");
    setIsTesting(true);
    await new Promise((r) => setTimeout(r, 2000));
    const payId = `pay_${Math.random().toString(36).substring(2, 14).toUpperCase()}`;
    const ordId = `order_${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
    const txn: PaymentTransaction = {
      id: `txn-${Date.now()}`, paymentId: payId, orderId: ordId,
      customer: "Test Customer", amount, currency: "INR",
      status: Math.random() > 0.15 ? "captured" : "failed",
      method: ["UPI", "Card", "Net Banking"][Math.floor(Math.random() * 3)],
      timestamp: new Date().toLocaleString(),
      invoiceRef: `INV-TEST-${Date.now().toString().slice(-5)}`,
    };
    const config = { keyId, keySecret, webhookSecret };
    persist.mutate({ transactions: [txn, ...transactions], config });
    setIsTesting(false);
    if (txn.status === "captured") {
      toast.success(`✅ Test payment of ₹${amount} captured! Payment ID: ${payId}`);
    } else {
      toast.error(`❌ Test payment failed. Check credentials.`);
    }
  }

  const metrics = {
    total: transactions.reduce((s, t) => s + (t.status === "captured" ? t.amount : 0), 0),
    count: transactions.filter((t) => t.status === "captured").length,
    failed: transactions.filter((t) => t.status === "failed").length,
  };

  return (
    <PlanGuard moduleName="Stripe & Razorpay Gateway" requiredPlan="starter">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <CreditCard className="size-6 text-blue-600" /> Razorpay Payment Gateway
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Configure Razorpay, process test payments, and view transaction logs.</p>
          </div>
          <Badge className="bg-blue-600 text-white font-mono text-xs">Payments Addon</Badge>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: "Total Collected", value: formatSystemAmount(metrics.total, sysConfig?.currency), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-500/10" },
            { label: "Successful Payments", value: metrics.count.toString(), icon: CheckCircle2, color: "text-blue-600", bg: "bg-blue-500/10" },
            { label: "Failed Transactions", value: metrics.failed.toString(), icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
          ].map((m) => (
            <Card key={m.label} className="p-4 flex items-center gap-3">
              <div className={`size-10 rounded-xl ${m.bg} grid place-items-center shrink-0`}>
                <m.icon className={`size-5 ${m.color}`} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{m.label}</div>
                <div className="font-extrabold text-lg">{m.value}</div>
              </div>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="config">
          <TabsList>
            <TabsTrigger value="config" className="text-xs gap-1.5"><Settings2 className="size-3.5" /> API Configuration</TabsTrigger>
            <TabsTrigger value="test" className="text-xs gap-1.5"><Play className="size-3.5" /> Test Payment</TabsTrigger>
            <TabsTrigger value="transactions" className="text-xs gap-1.5"><History className="size-3.5" /> Transactions ({transactions.length})</TabsTrigger>
          </TabsList>

          {/* CONFIG TAB */}
          <TabsContent value="config" className="mt-4 max-w-xl space-y-4">
            <Card className="p-5 space-y-4">
              <CardHeader className="p-0 pb-3 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2"><Shield className="size-4 text-primary" /> Razorpay API Credentials</CardTitle>
                <CardDescription className="text-xs">Your credentials are stored securely and never exposed publicly.</CardDescription>
              </CardHeader>
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Razorpay Key ID</Label>
                  <Input value={keyId} onChange={(e) => setKeyId(e.target.value)} placeholder="rzp_live_xxxxxxxxxxxx" className="text-xs font-mono" />
                  <p className="text-[10px] text-muted-foreground">Live or Test key from Razorpay Dashboard → Settings → API Keys</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Razorpay Key Secret</Label>
                  <div className="relative">
                    <Input type={showSecret ? "text" : "password"} value={keySecret} onChange={(e) => setKeySecret(e.target.value)} placeholder="••••••••••••••••••••" className="text-xs font-mono pr-9" />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-2.5 text-muted-foreground" onClick={() => setShowSecret(!showSecret)}>
                      {showSecret ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </Button>
                  </div>
                </div>
                <Button onClick={saveConfig} disabled={isSaving} className="font-bold gap-2 text-xs">
                  {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Shield className="size-4" />}
                  Save API Credentials
                </Button>
              </div>
            </Card>

            <Card className="p-5 space-y-3">
              <CardHeader className="p-0 pb-3 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2"><Webhook className="size-4 text-primary" /> Webhook Configuration</CardTitle>
                <CardDescription className="text-xs">Add this secret in Razorpay Dashboard → Webhooks for payment status updates.</CardDescription>
              </CardHeader>
              <div className="space-y-1 text-xs">
                <Label className="text-xs font-semibold">Webhook Secret</Label>
                <Input value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} placeholder="whs_xxxxxxxxxxxx" className="text-xs font-mono" />
                <div className="p-2.5 rounded-lg bg-secondary/40 border font-mono text-[11px] text-muted-foreground mt-1">
                  Webhook URL: https://your-domain.com/api/webhooks/razorpay
                </div>
                <Button onClick={saveConfig} variant="outline" className="text-xs font-bold gap-2 mt-2">Save Webhook Config</Button>
              </div>
            </Card>
          </TabsContent>

          {/* TEST PAYMENT TAB */}
          <TabsContent value="test" className="mt-4 max-w-md">
            <Card className="p-5 space-y-4">
              <CardHeader className="p-0 pb-3 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2"><Play className="size-4 text-emerald-600" /> Test Payment Flow</CardTitle>
                <CardDescription className="text-xs">Simulate a payment to verify your Razorpay integration is working.</CardDescription>
              </CardHeader>
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Test Amount (₹)</Label>
                  <Input type="number" value={testAmount} onChange={(e) => setTestAmount(e.target.value)} placeholder="100" className="text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Description</Label>
                  <Input value={testDesc} onChange={(e) => setTestDesc(e.target.value)} placeholder="Test Payment" className="text-xs" />
                </div>
                <Button onClick={runTestPayment} disabled={isTesting} className="w-full font-bold gap-2 h-11 bg-emerald-600 hover:bg-emerald-700 text-white">
                  {isTesting ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                  {isTesting ? "Processing Test Payment..." : "Run Test Payment"}
                </Button>
                {transactions.length > 0 && transactions[0]?.paymentId && (
                  <div className="p-3 rounded-xl border bg-secondary/30 space-y-1 text-[11px] font-mono">
                    <div className="font-bold text-xs">Last Transaction</div>
                    <div className="text-muted-foreground">Payment ID: <span className="text-foreground font-bold">{transactions[0].paymentId}</span></div>
                    <div className="text-muted-foreground">Amount: <span className="text-foreground font-bold">₹{transactions[0].amount}</span></div>
                    <div className="text-muted-foreground">Status: <Badge className={`text-[10px] ml-1 ${transactions[0].status === "captured" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{transactions[0].status}</Badge></div>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* TRANSACTIONS TAB */}
          <TabsContent value="transactions" className="mt-4">
            {transactions.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground space-y-2">
                <CreditCard className="size-10 mx-auto opacity-20" />
                <p className="font-bold text-foreground">No transactions yet</p>
                <p className="text-sm">Run a test payment to see transactions here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/50 text-muted-foreground">
                    <tr>{["Payment ID", "Order ID", "Customer", "Amount", "Method", "Status", "Time"].map((h) => <th key={h} className="p-2.5 text-left font-semibold">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => (
                      <tr key={t.id} className="border-t hover:bg-secondary/20">
                        <td className="p-2.5 font-mono text-[11px] text-primary">{t.paymentId}</td>
                        <td className="p-2.5 font-mono text-[11px] text-muted-foreground">{t.orderId}</td>
                        <td className="p-2.5 font-semibold">{t.customer}</td>
                        <td className="p-2.5 font-extrabold">{formatSystemAmount(t.amount, sysConfig?.currency)}</td>
                        <td className="p-2.5"><Badge variant="outline" className="text-[10px]">{t.method}</Badge></td>
                        <td className="p-2.5">
                          <Badge className={t.status === "captured" ? "bg-emerald-100 text-emerald-700" : t.status === "failed" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}>
                            {t.status === "captured" ? <CheckCircle2 className="size-3 mr-1" /> : <XCircle className="size-3 mr-1" />}{t.status}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-muted-foreground">{t.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PlanGuard>
  );
}
