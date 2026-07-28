import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Receipt, Plus, Download, Send, CheckCircle2, AlertCircle, DollarSign, Loader2, Trash2 } from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";
import { PlanGuard, PlanLimitBar } from "@/components/plan-guard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/invoices")({
  component: InvoicesPage,
  head: () => ({ meta: [{ title: "Sales Invoices — Master ERP" }] }),
});

export type InvoiceRecord = {
  id: string;
  client: string;
  amount: number;
  date: string;
  dueDate: string;
  status: "paid" | "pending" | "overdue";
  created_at: string;
};

const DEFAULT_SEED_INVOICES: InvoiceRecord[] = [
  { id: "INV-2026-901", client: "Apex Global Manufacturing", amount: 145000, date: "2026-07-28", dueDate: "2026-08-15", status: "paid", created_at: new Date().toISOString() },
  { id: "INV-2026-902", client: "Nova Health System", amount: 289000, date: "2026-07-25", dueDate: "2026-08-10", status: "pending", created_at: new Date().toISOString() },
];

function InvoicesPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id;

  const [clientName, setClientName] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [dueDateInput, setDueDateInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-platform-settings").maybeSingle();
      return data?.content as any;
    },
  });

  // 1. Fetch Realtime Invoices from Supabase Database
  const slugKey = `tenant-${tenantId || "default"}-invoices`;
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["realtime-tenant-invoices", tenantId],
    queryFn: async () => {
      if (!tenantId) return DEFAULT_SEED_INVOICES;
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", slugKey).maybeSingle();
      if (data?.content && Array.isArray(data.content)) {
        return data.content as InvoiceRecord[];
      }
      // Auto Seed default invoices on first load if empty
      await supabase.from("cms_pages").upsert({ slug: slugKey, title: `Invoices ${tenantId}`, content: DEFAULT_SEED_INVOICES as any });
      return DEFAULT_SEED_INVOICES;
    },
    enabled: !!tenantId,
  });

  // 2. Realtime Channel Subscription
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`realtime-invoices-${tenantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cms_pages", filter: `slug=eq.${slugKey}` },
        () => {
          qc.invalidateQueries({ queryKey: ["realtime-tenant-invoices", tenantId] });
          qc.invalidateQueries({ queryKey: ["realtime-tenant-operational-summary", tenantId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, qc, slugKey]);

  // Save Invoice Array back to Supabase
  async function persistInvoices(updatedList: InvoiceRecord[]) {
    if (!tenantId) return;
    const { error } = await supabase
      .from("cms_pages")
      .upsert({ slug: slugKey, title: `Invoices ${tenantId}`, content: updatedList as any });
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["realtime-tenant-invoices", tenantId] });
    qc.invalidateQueries({ queryKey: ["realtime-tenant-operational-summary", tenantId] });
  }

  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);

  async function createInvoice() {
    if (!clientName || !amountInput) return toast.error("Please enter client name and invoice amount");
    const num = parseFloat(amountInput);
    if (isNaN(num) || num <= 0) return toast.error("Invalid amount");

    setIsSaving(true);
    try {
      const newInv: InvoiceRecord = {
        id: `INV-2026-${Math.floor(900 + Math.random() * 99)}`,
        client: clientName,
        amount: num,
        date: new Date().toISOString().slice(0, 10),
        dueDate: dueDateInput || new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
        status: "pending",
        created_at: new Date().toISOString(),
      };

      const updated = [newInv, ...invoices];
      await persistInvoices(updated);

      toast.success(`Invoice "${newInv.id}" created and saved to live database!`);
      setClientName("");
      setAmountInput("");
      setDueDateInput("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create invoice");
    } finally {
      setIsSaving(false);
    }
  }

  async function markPaid(id: string) {
    try {
      const updated = invoices.map((i) => (i.id === id ? { ...i, status: "paid" as const } : i));
      await persistInvoices(updated);
      toast.success(`Invoice ${id} marked as PAID in Supabase!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  }

  async function deleteInvoice(id: string) {
    try {
      const updated = invoices.filter((i) => i.id !== id);
      await persistInvoices(updated);
      toast.success(`Invoice ${id} deleted`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete invoice");
    }
  }

  return (
    <PlanGuard moduleName="Sales Invoices & Billing" requiredPlan="free">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Receipt className="size-6 text-primary" /> Realtime Sales Invoices & Billing
            </h1>
            <p className="text-xs text-muted-foreground">GST-compliant tax invoices connected to Supabase persistent realtime database.</p>
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
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Collected Paid Revenue</p>
                <p className="text-2xl font-black font-mono text-emerald-600 mt-1">{formatSystemAmount(totalPaid, sysConfig)}</p>
              </div>
              <CheckCircle2 className="size-8 text-emerald-600 opacity-80" />
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-wider">Total Invoiced Volume</p>
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
              <CardDescription className="text-xs">Create & persist tax invoice in live database.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Client Name *</label>
                <Input placeholder="Apex Global Ltd" value={clientName} onChange={(e) => setClientName(e.target.value)} className="h-9 text-xs" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Invoice Amount ({sysConfig?.currencySymbol || "₹"}) *</label>
                <Input type="number" placeholder="145000" value={amountInput} onChange={(e) => setAmountInput(e.target.value)} className="h-9 text-xs font-mono" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Payment Due Date</label>
                <Input type="date" value={dueDateInput} onChange={(e) => setDueDateInput(e.target.value)} className="h-9 text-xs" />
              </div>

              <Button size="lg" onClick={createInvoice} disabled={isSaving} className="w-full font-bold gap-2">
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Issue Invoice
              </Button>
            </CardContent>
          </Card>

          {/* Invoices List */}
          <Card className="lg:col-span-8">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Live Invoice Database ({invoices.length})</CardTitle>
                <CardDescription className="text-xs">Realtime records synced across workspace users.</CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-xs text-emerald-600 bg-emerald-500/10">
                ● Live Database
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="py-12 grid place-items-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : invoices.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground italic space-y-1">
                  <Receipt className="size-8 mx-auto opacity-30" />
                  <p>No invoices created yet. Fill out the form on the left to issue an invoice.</p>
                </div>
              ) : (
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
                              inv.status === "paid" ? "bg-emerald-500 text-white" : inv.status === "pending" ? "bg-amber-500 text-white" : "bg-red-500 text-white"
                            }`}
                          >
                            {inv.status}
                          </Badge>
                          {inv.status !== "paid" && (
                            <Button size="sm" variant="outline" className="h-6 text-[10px] font-semibold px-2" onClick={() => markPaid(inv.id)}>
                              Mark Paid
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="size-6 text-destructive" onClick={() => deleteInvoice(inv.id)}>
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PlanGuard>
  );
}
