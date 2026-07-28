import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Store, Search, CheckCircle2, Plus, Sparkles, ArrowRight, ShieldCheck, Cpu, MessageSquare, Landmark, Lock, CreditCard, ShoppingBag, Loader2, Check } from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";
import { PlanGuard, PlanLimitBar } from "@/components/plan-guard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/marketplace")({
  component: MarketplacePage,
  head: () => ({ meta: [{ title: "Addons Marketplace — Master ERP" }] }),
});

export type TenantPurchasedAddon = {
  addonId: string;
  addonSlug: string;
  addonName: string;
  priceMonthly: number;
  purchasedAt: string;
  status: "active" | "disabled";
};

const DEFAULT_SUPER_ADMIN_ADDONS = [
  { id: "a1", slug: "whatsapp-alerts", name: "WhatsApp Alerts & Reminders", category: "Messaging", price_monthly: 0, status: "available", description: "Instant automated WhatsApp alerts for invoices, attendance & leave approvals.", tagline: "Automated WhatsApp notifications" },
  { id: "a2", slug: "biometric-sync", name: "Biometric Hardware Sync Engine", category: "Hardware", price_monthly: 0, status: "available", description: "Sync physical fingerprint & facial recognition attendance devices.", tagline: "Hardware attendance connector" },
  { id: "a3", slug: "tally-importer", name: "Tally Prime Ledger Importer", category: "Finance", price_monthly: 499, status: "available", description: "One-click XML/CSV migration and live 2-way sync with Tally ERP.", tagline: "Tally Prime 2-way sync" },
  { id: "a4", slug: "stripe-razorpay", name: "Stripe & Razorpay Gateway", category: "Payments", price_monthly: 0, status: "available", description: "Accept online client invoice payments via Credit Card, UPI & Net Banking.", tagline: "Payment gateway integration" },
  { id: "a5", slug: "google-workspace", name: "Google Workspace SSO & Drive", category: "Auth & Storage", price_monthly: 299, status: "available", description: "OAuth 2.0 Single Sign-On and document storage sync to Google Drive.", tagline: "Google SSO & Cloud Drive" },
  { id: "a6", slug: "ai-ocr-reader", name: "AI Invoice OCR Reader", category: "AI & Automations", price_monthly: 799, status: "available", description: "Extract line items, GST numbers, and vendor details automatically from PDFs.", tagline: "Smart AI document scanner" },
];

function MarketplacePage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id;

  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "free" | "pro" | "installed">("all");

  // Purchase Modal State
  const [selectedAddon, setSelectedAddon] = useState<any | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-platform-settings").maybeSingle();
      return data?.content as any;
    },
  });

  // 1. Fetch Super-Admin Assigned Addons from Supabase `addons` table
  const { data: superAdminAddons = [], isLoading: isAddonsLoading } = useQuery({
    queryKey: ["realtime-super-admin-addons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("addons").select("*").eq("status", "available").order("created_at", { ascending: false });
      if (error || !data || data.length === 0) {
        return DEFAULT_SUPER_ADMIN_ADDONS;
      }
      return data as any[];
    },
  });

  // 2. Fetch Installed/Purchased Addons for this Tenant from Supabase
  const purchasedSlugKey = `tenant-${tenantId || "default"}-purchased-addons`;
  const { data: installedAddons = [] } = useQuery({
    queryKey: ["realtime-tenant-installed-addons", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", purchasedSlugKey).maybeSingle();
      if (data?.content && Array.isArray(data.content)) {
        return data.content as TenantPurchasedAddon[];
      }
      // Seed initial default installed free addons
      const initialInstalled: TenantPurchasedAddon[] = [
        { addonId: "a1", addonSlug: "whatsapp-alerts", addonName: "WhatsApp Alerts & Reminders", priceMonthly: 0, purchasedAt: new Date().toISOString(), status: "active" },
        { addonId: "a2", addonSlug: "biometric-sync", addonName: "Biometric Hardware Sync Engine", priceMonthly: 0, purchasedAt: new Date().toISOString(), status: "active" },
      ];
      await supabase.from("cms_pages").upsert({ slug: purchasedSlugKey, title: `Addons ${tenantId}`, content: initialInstalled as any });
      return initialInstalled;
    },
    enabled: !!tenantId,
  });

  // Helper: check if an addon is installed & active for this tenant
  function isInstalled(addonId: string, slug?: string) {
    return installedAddons.some((a) => (a.addonId === addonId || (slug && a.addonSlug === slug)) && a.status === "active");
  }

  // Persist installed addons to Supabase
  async function persistInstalledAddons(list: TenantPurchasedAddon[]) {
    if (!tenantId) return;
    const { error } = await supabase
      .from("cms_pages")
      .upsert({ slug: purchasedSlugKey, title: `Addons ${tenantId}`, content: list as any });
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["realtime-tenant-installed-addons", tenantId] });
    qc.invalidateQueries({ queryKey: ["realtime-tenant-dashboard-stats", tenantId] });
  }

  // Handle Purchase Confirmation
  async function confirmPurchase() {
    if (!selectedAddon || !tenantId) return;
    setIsPurchasing(true);

    try {
      const isFree = (selectedAddon.price_monthly || 0) === 0;
      const newInstalledItem: TenantPurchasedAddon = {
        addonId: selectedAddon.id,
        addonSlug: selectedAddon.slug || selectedAddon.id,
        addonName: selectedAddon.name,
        priceMonthly: selectedAddon.price_monthly || 0,
        purchasedAt: new Date().toISOString(),
        status: "active",
      };

      const updated = [newInstalledItem, ...installedAddons.filter((a) => a.addonId !== selectedAddon.id)];
      await persistInstalledAddons(updated);

      toast.success(
        isFree
          ? `Free Addon "${selectedAddon.name}" installed successfully!`
          : `Addon "${selectedAddon.name}" purchased and activated on workspace!`
      );
      setSelectedAddon(null);
    } catch (err: any) {
      toast.error(err.message || "Purchase failed");
    } finally {
      setIsPurchasing(false);
    }
  }

  // Handle Uninstall / Toggle
  async function toggleUninstall(addonId: string, name: string) {
    try {
      const updated = installedAddons.filter((a) => a.addonId !== addonId && a.addonSlug !== addonId);
      await persistInstalledAddons(updated);
      toast.info(`Addon "${name}" uninstalled from workspace.`);
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    }
  }

  // Filter logic
  const filtered = superAdminAddons.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.category || "").toLowerCase().includes(search.toLowerCase()) ||
      (a.description || "").toLowerCase().includes(search.toLowerCase());

    const installed = isInstalled(a.id, a.slug);
    const isFree = (a.price_monthly || 0) === 0;

    if (filterTab === "free") return matchesSearch && isFree;
    if (filterTab === "pro") return matchesSearch && !isFree;
    if (filterTab === "installed") return matchesSearch && installed;
    return matchesSearch;
  });

  const activeCount = installedAddons.filter((a) => a.status === "active").length;

  return (
    <PlanGuard moduleName="Ecosystem Marketplace" requiredPlan="free">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Store className="size-6 text-primary" /> Super-Admin Ecosystem Marketplace
            </h1>
            <p className="text-xs text-muted-foreground">
              Official Super-Admin assigned ERP addons, integrations, hardware drivers & automated AI plugins.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PlanLimitBar used={activeCount} limit={20} label="Installed Addons Capacity" />
          </div>
        </div>

        {/* Search & Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-4 rounded-2xl border shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search Super-Admin addons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-secondary/50 p-1 rounded-xl border w-full sm:w-auto">
            {(["all", "free", "pro", "installed"] as const).map((tab) => (
              <Button
                key={tab}
                variant={filterTab === tab ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs font-bold uppercase flex-1 sm:flex-none px-3"
                onClick={() => setFilterTab(tab)}
              >
                {tab === "free"
                  ? "Free Addons 🎁"
                  : tab === "pro"
                  ? "Pro Addons ⭐"
                  : tab === "installed"
                  ? `Installed (${activeCount})`
                  : "All Addons"}
              </Button>
            ))}
          </div>
        </div>

        {/* Addons Grid */}
        {isAddonsLoading ? (
          <div className="py-16 grid place-items-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground italic space-y-2">
            <Store className="size-10 mx-auto opacity-30" />
            <p>No addons match your search criteria.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((a) => {
              const installed = isInstalled(a.id, a.slug);
              const isFree = (a.price_monthly || 0) === 0;

              return (
                <Card
                  key={a.id}
                  className={`flex flex-col justify-between transition-all hover:shadow-lg ${
                    installed ? "border-emerald-500/50 bg-emerald-500/5" : ""
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <Badge variant="outline" className="text-[9px] font-mono">
                        {a.category || "General"}
                      </Badge>
                      {isFree ? (
                        <Badge className="bg-emerald-500 text-white font-mono text-[9px]">FREE ADDON</Badge>
                      ) : (
                        <span className="font-mono font-black text-xs text-primary">
                          {formatSystemAmount(a.price_monthly, sysConfig)}/mo
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-base pt-1 leading-snug">{a.name}</CardTitle>
                    <CardDescription className="text-xs leading-relaxed mt-1">{a.description || a.tagline}</CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-3">
                    <div className="pt-3 border-t flex items-center justify-between">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        Status:{" "}
                        <strong className={installed ? "text-emerald-600 font-bold" : "text-muted-foreground"}>
                          {installed ? "Installed & Active" : "Available"}
                        </strong>
                      </span>

                      {installed ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="font-bold text-xs gap-1 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                          onClick={() => toggleUninstall(a.id, a.name)}
                        >
                          <Check className="size-3.5" /> Installed
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant={isFree ? "default" : "secondary"}
                          className="font-bold text-xs gap-1.5"
                          style={!isFree ? { background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff" } : {}}
                          onClick={() => setSelectedAddon(a)}
                        >
                          <ShoppingBag className="size-3.5" /> {isFree ? "Install Free" : "Purchase Addon"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* PURCHASE / INSTALLATION CONFIRMATION MODAL */}
        <Dialog open={!!selectedAddon} onOpenChange={(open) => !open && setSelectedAddon(null)}>
          <DialogContent className="sm:max-w-[460px]">
            {selectedAddon && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <ShoppingBag className="size-5 text-primary" />{" "}
                    {(selectedAddon.price_monthly || 0) === 0 ? "Install Free Addon" : "Purchase Addon License"}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Confirm adding this Super-Admin addon to your active workspace tenant.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-3 text-xs">
                  <div className="p-3 rounded-xl border bg-secondary/30 space-y-1">
                    <div className="flex justify-between font-bold text-sm">
                      <span>{selectedAddon.name}</span>
                      <span className="font-mono text-primary">
                        {(selectedAddon.price_monthly || 0) === 0
                          ? "FREE"
                          : formatSystemAmount(selectedAddon.price_monthly, sysConfig) + "/mo"}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">{selectedAddon.description}</p>
                  </div>

                  <div className="space-y-2 p-3 rounded-xl border bg-card text-[11px] text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Target Workspace:</span>
                      <strong className="text-foreground">{profile?.tenant?.name || "Current Tenant"}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Billing Cycle:</span>
                      <strong className="text-foreground">Monthly Recurring</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Super-Admin Developer:</span>
                      <strong className="text-foreground">{selectedAddon.developer || "Master HRMS"}</strong>
                    </div>
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setSelectedAddon(null)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmPurchase}
                    disabled={isPurchasing}
                    className="font-bold gap-2"
                    style={{ background: "linear-gradient(135deg, #10b981, #0d9488)", color: "#fff" }}
                  >
                    {isPurchasing ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                    {(selectedAddon.price_monthly || 0) === 0 ? "Confirm & Install Now" : "Pay & Activate Addon"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PlanGuard>
  );
}
