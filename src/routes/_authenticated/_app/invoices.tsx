import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Receipt, Plus, Download, Send, CheckCircle2, AlertCircle, DollarSign } from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";
import { PlanGuard, PlanLimitBar } from "@/components/plan-guard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/invoices")({
  component: InvoicesPage,
  head: () => ({ meta: [{ title: "Sales Invoices — Master ERP" }] }),
});

const INITIAL_INVOICES = [
  { id: "INV-2026-901", client: "Apex Global Manufacturing", amount: 145000, date: "2026-07-28", dueDate: "2026-08-15", status: "paid" },
  { id: "INV-2026-902", client: "Nova Health System", amount: 289000, date: "2026-07-25", dueDate: "2026-08-10", status: "pending" },
  { id: "INV-2026-903", client: "Zenith Retail Cloud", amount: 68000, date: "2026-07-20", dueDate: "2026-08-05", status: "overdue" },
];

function InvoicesPage() {
  const [invoices, setInvoices] = useState(INITIAL_INVOICES);
  const [client, setClient] = useState("");
  const [amount, setAmount] = useState("");

  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-platform-settings").maybeSingle();
      return data?.content as any;
    },
  });

  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);

  function createInvoice() {
    if (!client || !amount) return toast.error("Please enter client name and invoice amount");
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return toast.error("Invalid amount");

    const newInv = {
      id: `INV-2026-${Math.floor(900 + Math.random() * 99)}`,
      client,
      amount: num,
      date: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
      status: "pending",
    };
    setInvoices([newInv, ...invoices]);
    toast.success(`Invoice "${newInv.id}" generated successfully!`);
    setClient("");
    setAmount("");
  }

  function markPaid(id: string) {
    setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, status: "paid" } : i)));
    toast.success(`Invoice ${id} marked as PAID!`);
  }

  return (
    <PlanGuard moduleName="Sales Invoices & Billing" requiredPlan="free">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Receipt className="size-6 text-primary" /> Sales Invoices & Billing
            </h1>
            <p className="text-xs text-muted-foreground">GST-compliant tax invoices, online payment collection & automated reminders.</p>
          </div>
          <div className="flex items-center gap-3">
            <PlanLimitBar used={invoices.length} limit={100} label="Monthly Invoice Quota" />
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Collected Paid Invoices</p>
                <p className="text-2xl font-black font-mono text-emerald-600 mt-1">{formatSystemAmount(totalPaid, sysConfig)}</p>
              </div>
              <CheckCircle2 className="size-8 text-emerald-600 opacity-80" />
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-wider">Total Invoiced Amount</p>
                <p className="text-2xl font-black font-mono text-primary mt-1">{formatSystemAmount(totalInvoiced, sysConfig)}</p>
              </div>
              <Receipt className="size-8 text-primary opacity-80" />
            </CardContent>
          </Card>
        </div>

        {/* Form & Invoices List */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Create Form */}
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle className="text-base">Generate GST Invoice</CardTitle>
              <CardDescription className="text-xs">Create new GST tax invoice for client.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Client Name *</label>
                <Input placeholder="Apex Global Ltd" value={client} onChange={(e) => setClient(e.target.value)} className="h-9 text-xs" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Invoice Amount ({sysConfig?.currencySymbol || "₹"}) *</label>
                <Input type="number" placeholder="145000" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9 text-xs font-mono" />
              </div>

              <Button size="lg" onClick={createInvoice} className="w-full font-bold gap-2">
                <Plus className="size-4" /> Issue Invoice
              </Button>
            </CardContent>
          </Card>

          {/* Invoices List */}
          <Card className="lg:col-span-8">
            <CardHeader>
              <CardTitle className="text-base">Invoice Ledger ({invoices.length})</CardTitle>
              <CardDescription className="text-xs">Issued invoices & payment status.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y text-xs">
                {invoices.map((inv) => (
                  <div key={inv.id} className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                    <div className="space-y-1 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-primary">{inv.id}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">Issued {inv.date} · Due {inv.dueDate}</span>
                      </div>
                      <p className="font-bold text-foreground text-sm">{inv.client}</p>
                    </div>

                    <div className="text-right space-y-1.5 shrink-0">
                      <p className="font-mono font-black text-sm text-emerald-600">{formatSystemAmount(inv.amount, sysConfig)}</p>
                      <div className="flex items-center gap-2 justify-end">
                        <Badge
                          className={`text-[9px] font-mono capitalize ${
                            inv.status === "paid" ? "bg-emerald-500" : inv.status === "pending" ? "bg-amber-500" : "bg-red-500"
                          }`}
                        >
                          {inv.status}
                        </Badge>
                        {inv.status !== "paid" && (
                          <Button size="sm" variant="outline" className="h-6 text-[10px] font-semibold px-2" onClick={() => markPaid(inv.id)}>
                            Mark Paid
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
