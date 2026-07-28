import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Store, Search, CheckCircle2, Plus, Sparkles, ArrowRight, ShieldCheck, Cpu, MessageSquare, Landmark, Lock } from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";
import { PlanGuard, PlanLimitBar } from "@/components/plan-guard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/marketplace")({
  component: MarketplacePage,
  head: () => ({ meta: [{ title: "Addons Marketplace — Master ERP" }] }),
});

const DEFAULT_ADDONS = [
  { id: "a1", name: "WhatsApp Alerts & Reminders", category: "Messaging", price: 0, isFree: true, active: true, desc: "Instant automated WhatsApp alerts for invoices, attendance & leave approvals." },
  { id: "a2", name: "Biometric Hardware Sync Engine", category: "Hardware", price: 0, isFree: true, active: true, desc: "Sync physical fingerprint & facial recognition attendance devices." },
  { id: "a3", name: "Tally Prime Ledger Importer", category: "Finance", price: 499, isFree: false, active: false, desc: "One-click XML/CSV migration and live 2-way sync with Tally ERP." },
  { id: "a4", name: "Stripe & Razorpay Gateway", category: "Payments", price: 0, isFree: true, active: true, desc: "Accept online client invoice payments via Credit Card, UPI & Net Banking." },
  { id: "a5", name: "Google Workspace SSO & Drive", category: "Auth & Storage", price: 299, isFree: false, active: false, desc: "OAuth 2.0 Single Sign-On and document storage sync to Google Drive." },
  { id: "a6", name: "AI Invoice OCR Reader", category: "AI & Automations", price: 799, isFree: false, active: false, desc: "Extract line items, GST numbers, and vendor details automatically from PDFs." },
];

function MarketplacePage() {
  const [addons, setAddons] = useState(DEFAULT_ADDONS);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "free" | "pro">("all");

  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-platform-settings").maybeSingle();
      return data?.content as any;
    },
  });

  const filtered = addons.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.category.toLowerCase().includes(search.toLowerCase());
    if (filterTab === "free") return matchesSearch && a.isFree;
    if (filterTab === "pro") return matchesSearch && !a.isFree;
    return matchesSearch;
  });

  const activeCount = addons.filter((a) => a.active).length;

  function toggleAddon(id: string) {
    setAddons((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const nextState = !a.active;
          toast.success(nextState ? `Addon "${a.name}" Activated!` : `Addon "${a.name}" Deactivated`);
          return { ...a, active: nextState };
        }
        return a;
      })
    );
  }

  return (
    <PlanGuard moduleName="Ecosystem Marketplace" requiredPlan="free">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Store className="size-6 text-primary" /> Tenant Addons Marketplace
            </h1>
            <p className="text-xs text-muted-foreground">500+ Ecosystem modules, hardware connectors, messaging channels & automated AI add-ons.</p>
          </div>
          <div className="flex items-center gap-3">
            <PlanLimitBar used={activeCount} limit={20} label="Active Addons Limit" />
          </div>
        </div>

        {/* Search & Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-4 rounded-2xl border shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search 500+ addons & integrations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-secondary/50 p-1 rounded-xl border w-full sm:w-auto">
            {(["all", "free", "pro"] as const).map((tab) => (
              <Button
                key={tab}
                variant={filterTab === tab ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs font-bold uppercase flex-1 sm:flex-none px-3"
                onClick={() => setFilterTab(tab)}
              >
                {tab === "free" ? "Free Addons 🎁" : tab === "pro" ? "Pro Addons ⭐" : "All Addons"}
              </Button>
            ))}
          </div>
        </div>

        {/* Addons Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((a) => (
            <Card key={a.id} className={`flex flex-col justify-between transition-all hover:shadow-lg ${a.active ? "border-emerald-500/50 bg-emerald-500/5" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <Badge variant="outline" className="text-[9px] font-mono">
                    {a.category}
                  </Badge>
                  {a.isFree ? (
                    <Badge className="bg-emerald-500 text-white font-mono text-[9px]">FREE ADDON</Badge>
                  ) : (
                    <span className="font-mono font-black text-xs text-primary">{formatSystemAmount(a.price, sysConfig)}/mo</span>
                  )}
                </div>
                <CardTitle className="text-base pt-1 leading-snug">{a.name}</CardTitle>
                <CardDescription className="text-xs leading-relaxed mt-1">{a.desc}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="pt-3 border-t flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Status: <strong className={a.active ? "text-emerald-600" : "text-muted-foreground"}>{a.active ? "Enabled" : "Disabled"}</strong>
                  </span>
                  <Button
                    size="sm"
                    variant={a.active ? "outline" : "default"}
                    className="font-bold text-xs gap-1.5"
                    onClick={() => toggleAddon(a.id)}
                  >
                    {a.active ? "Deactivate" : "Install Addon"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PlanGuard>
  );
}
