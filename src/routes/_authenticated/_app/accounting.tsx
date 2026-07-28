import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Landmark, TrendingUp, TrendingDown, DollarSign, Plus, ArrowUpRight, ArrowDownRight, FileText, Filter } from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";
import { PlanGuard, PlanLimitBar } from "@/components/plan-guard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/accounting")({
  component: AccountingPage,
  head: () => ({ meta: [{ title: "Accountant & Ledgers — Master ERP" }] }),
});

const DEFAULT_TRANSACTIONS = [
  { id: "TX-1001", type: "income", category: "Client Invoice Payment", amount: 145000, date: "2026-07-28", status: "completed", party: "Apex Global Ltd" },
  { id: "TX-1002", type: "expense", category: "Cloud Hosting & Server", amount: 18500, date: "2026-07-27", status: "completed", party: "AWS Cloud" },
  { id: "TX-1003", type: "income", category: "Addon Marketplace Sales", amount: 48000, date: "2026-07-26", status: "completed", party: "Stripe Connect" },
  { id: "TX-1004", type: "expense", category: "Office Rent & Utilities", amount: 65000, date: "2026-07-25", status: "completed", party: "Horizon Workspace" },
  { id: "TX-1005", type: "income", category: "Consulting Retainer", amount: 82000, date: "2026-07-24", status: "completed", party: "Nova Tech" },
];

function AccountingPage() {
  const [txList, setTxList] = useState(DEFAULT_TRANSACTIONS);
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newType, setNewType] = useState<"income" | "expense">("income");

  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-platform-settings").maybeSingle();
      return data?.content as any;
    },
  });

  const totalIncome = txList.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = txList.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const netProfit = totalIncome - totalExpense;

  const filteredTx = txList.filter((t) => filterType === "all" || t.type === filterType);

  function addTransaction() {
    if (!newDesc || !newAmount) return toast.error("Please enter description and amount");
    const num = parseFloat(newAmount);
    if (isNaN(num) || num <= 0) return toast.error("Invalid amount");

    const newTx = {
      id: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
      type: newType,
      category: newDesc,
      amount: num,
      date: new Date().toISOString().slice(0, 10),
      status: "completed",
      party: "Internal Ledger Entry",
    };
    setTxList([newTx, ...txList]);
    toast.success(`Ledger Entry Added: ${newType.toUpperCase()} ${formatSystemAmount(num, sysConfig)}`);
    setNewDesc("");
    setNewAmount("");
  }

  return (
    <PlanGuard moduleName="Financial Ledgers & Accountant" requiredPlan="growth">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Landmark className="size-6 text-primary" /> Accountant & Ledgers
            </h1>
            <p className="text-xs text-muted-foreground">General ledger accounting, cashflow statement & double-entry balance sheets.</p>
          </div>
          <div className="flex items-center gap-3">
            <PlanLimitBar used={txList.length} limit={100} label="Ledger Capacity" />
          </div>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Total Revenue</p>
                <p className="text-2xl font-black font-mono text-emerald-600 mt-1">{formatSystemAmount(totalIncome, sysConfig)}</p>
                <p className="text-[11px] text-emerald-600/80 font-semibold mt-1">↑ +14.2% Month-over-Month</p>
              </div>
              <div className="size-11 rounded-2xl bg-emerald-500/10 text-emerald-600 grid place-items-center">
                <ArrowUpRight className="size-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-rose-500/5 border-rose-500/20">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Operating Expenses</p>
                <p className="text-2xl font-black font-mono text-rose-600 mt-1">{formatSystemAmount(totalExpense, sysConfig)}</p>
                <p className="text-[11px] text-rose-600/80 font-semibold mt-1">↓ -4.8% Expense Control</p>
              </div>
              <div className="size-11 rounded-2xl bg-rose-500/10 text-rose-600 grid place-items-center">
                <ArrowDownRight className="size-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-wider">Net EBITDA Profit</p>
                <p className="text-2xl font-black font-mono text-primary mt-1">{formatSystemAmount(netProfit, sysConfig)}</p>
                <p className="text-[11px] text-primary/80 font-semibold mt-1">Healthy Cash Reserves</p>
              </div>
              <div className="size-11 rounded-2xl bg-primary/10 text-primary grid place-items-center">
                <TrendingUp className="size-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Add Ledger Entry & Transactions Table */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Quick Entry Form */}
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle className="text-base">Post Ledger Voucher</CardTitle>
              <CardDescription className="text-xs">Record incoming revenue or business expense.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={newType === "income" ? "default" : "outline"}
                  className="text-xs font-bold"
                  onClick={() => setNewType("income")}
                >
                  Revenue (+)
                </Button>
                <Button
                  type="button"
                  variant={newType === "expense" ? "destructive" : "outline"}
                  className="text-xs font-bold"
                  onClick={() => setNewType("expense")}
                >
                  Expense (-)
                </Button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Description / Category</label>
                <Input
                  placeholder="e.g. Software Subscriptions"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Amount ({sysConfig?.currencySymbol || "₹"})</label>
                <Input
                  type="number"
                  placeholder="e.g. 25000"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <Button size="lg" onClick={addTransaction} className="w-full font-bold gap-2">
                <Plus className="size-4" /> Post Entry
              </Button>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card className="lg:col-span-8">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Ledger Journal</CardTitle>
                <CardDescription className="text-xs">Double-entry accounting transaction records.</CardDescription>
              </div>
              <div className="flex items-center gap-1.5 bg-secondary/50 p-1 rounded-lg border">
                {(["all", "income", "expense"] as const).map((f) => (
                  <Button
                    key={f}
                    variant={filterType === f ? "default" : "ghost"}
                    size="sm"
                    className="h-6 text-[10px] uppercase font-bold px-2.5"
                    onClick={() => setFilterType(f)}
                  >
                    {f}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y text-xs">
                {filteredTx.map((t) => (
                  <div key={t.id} className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div
                        className={`size-9 rounded-xl grid place-items-center ${
                          t.type === "income" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                        }`}
                      >
                        {t.type === "income" ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{t.category}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{t.party} · {t.date}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`font-mono font-black text-sm ${t.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                        {t.type === "income" ? "+" : "-"}{formatSystemAmount(t.amount, sysConfig)}
                      </p>
                      <Badge variant="outline" className="text-[9px] font-mono capitalize">
                        {t.status}
                      </Badge>
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
