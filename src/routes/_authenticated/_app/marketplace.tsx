import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Store, Search, CheckCircle2, Plus, Sparkles, ArrowRight, ShieldCheck, Cpu, MessageSquare, Landmark, Lock, CreditCard, ShoppingBag, Loader2, Check, ImageIcon } from "lucide-react";
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

const CATEGORY_IMAGES: Record<string, string> = {
  Messaging: "https://images.unsplash.com/photo-1611746872915-64382b5c76da?auto=format&fit=crop&w=600&q=80",
  Hardware: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=600&q=80",
  Finance: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80",
  Payments: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=600&q=80",
  "Auth & Storage": "https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?auto=format&fit=crop&w=600&q=80",
  "AI & Automations": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
  Productivity: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80",
  Analytics: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80",
};

const DEFAULT_SUPER_ADMIN_ADDONS = [
  {
    id: "a1",
    slug: "whatsapp-alerts",
    name: "WhatsApp Alerts & Reminders",
    category: "Messaging",
    price_monthly: 0,
    status: "available",
    description: "Instant automated WhatsApp alerts for invoices, attendance & leave approvals.",
    tagline: "Automated WhatsApp notifications",
    image: "https://images.unsplash.com/photo-1611746872915-64382b5c76da?auto=format&fit=crop&w=600&q=80",
    developer: "Master HRMS",
  },
  {
    id: "a2",
    slug: "biometric-sync",
    name: "Biometric Hardware Sync Engine",
    category: "Hardware",
    price_monthly: 0,
    status: "available",
    description: "Sync physical fingerprint & facial recognition attendance devices.",
    tagline: "Hardware attendance connector",
    image: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=600&q=80",
    developer: "Master HRMS",
  },
  {
    id: "a3",
    slug: "tally-importer",
    name: "Tally Prime Ledger Importer",
    category: "Finance",
    price_monthly: 499,
    status: "available",
    description: "One-click XML/CSV migration and live 2-way sync with Tally ERP.",
    tagline: "Tally Prime 2-way sync",
    image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80",
    developer: "FinTech Connect",
  },
  {
    id: "a4",
    slug: "stripe-razorpay",
    name: "Stripe & Razorpay Gateway",
    category: "Payments",
    price_monthly: 0,
    status: "available",
    description: "Accept online client invoice payments via Credit Card, UPI & Net Banking.",
    tagline: "Payment gateway integration",
    image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=600&q=80",
    developer: "PaymentHub",
  },
  {
    id: "a5",
    slug: "google-workspace",
    name: "Google Workspace SSO & Drive",
    category: "Auth & Storage",
    price_monthly: 299,
    status: "available",
    description: "OAuth 2.0 Single Sign-On and document storage sync to Google Drive.",
    tagline: "Google SSO & Cloud Drive",
    image: "https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?auto=format&fit=crop&w=600&q=80",
    developer: "CloudAuth Inc",
  },
  {
    id: "a6",
    slug: "ai-ocr-reader",
    name: "AI Invoice OCR Reader",
    category: "AI & Automations",
    price_monthly: 799,
    status: "available",
    description: "Extract line items, GST numbers, and vendor details automatically from PDFs.",
    tagline: "Smart AI document scanner",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
    developer: "NeuralAI Labs",
  },
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
      return data.map((item) => ({
        ...item,
        image: item.icon || (Array.isArray(item.screenshots) && item.screenshots[0]) || CATEGORY_IMAGES[item.category] || CATEGORY_IMAGES.Productivity,
      }));
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((a) => {
              const installed = isInstalled(a.id, a.slug);
              const isFree = (a.price_monthly || 0) === 0;
              const imageUrl = String(a.image || CATEGORY_IMAGES[a.category] || CATEGORY_IMAGES.Productivity);

              return (
                <Card
                  key={a.id}
                  className={`flex flex-col justify-between overflow-hidden transition-all hover:shadow-xl group ${
                    installed ? "border-emerald-500/50 bg-emerald-500/5" : ""
                  }`}
                >
                  {/* Image Banner */}
                  <div className="h-40 relative bg-secondary/40 overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={a.name}
                      className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                    
                    <div className="absolute top-3 left-3">
                      <Badge variant="outline" className="text-[10px] font-mono bg-background/80 backdrop-blur-md">
                        {a.category || "General"}
                      </Badge>
                    </div>

                    <div className="absolute top-3 right-3">
                      {isFree ? (
                        <Badge className="bg-emerald-500 text-white font-mono text-[9px] shadow-sm">FREE ADDON</Badge>
                      ) : (
                        <Badge className="bg-primary text-white font-mono text-[9px] shadow-sm">
                          {formatSystemAmount(a.price_monthly, sysConfig)}/mo
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <CardHeader className="pb-3 pt-3">
                    <CardTitle className="text-base font-bold leading-snug group-hover:text-primary transition-colors">
                      {a.name}
                    </CardTitle>
                    <CardDescription className="text-xs leading-relaxed mt-1 line-clamp-2">
                      {a.description || a.tagline}
                    </CardDescription>
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
          <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
            {selectedAddon && (
              <>
                {/* Modal Header Image Banner */}
                <div className="h-44 relative bg-secondary/40 overflow-hidden">
                  <img
                    src={String(selectedAddon.image || CATEGORY_IMAGES[selectedAddon.category] || CATEGORY_IMAGES.Productivity)}
                    alt={selectedAddon.name}
                    className="size-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                  
                  <div className="absolute bottom-3 left-4 right-4">
                    <Badge variant="outline" className="text-[10px] font-mono bg-background/80 backdrop-blur-md mb-1">
                      {selectedAddon.category || "General"}
                    </Badge>
                    <h3 className="font-bold text-lg text-foreground">{selectedAddon.name}</h3>
                  </div>
                </div>

                <div className="p-6 space-y-4 text-xs">
                  <p className="text-muted-foreground leading-relaxed">{selectedAddon.description}</p>

                  <div className="space-y-2 p-3.5 rounded-xl border bg-secondary/30 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span>Target Workspace:</span>
                      <strong className="text-foreground">{profile?.tenant?.name || "Current Tenant"}</strong>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Monthly Subscription Price:</span>
                      <strong className="text-primary font-mono font-bold">
                        {(selectedAddon.price_monthly || 0) === 0
                          ? "FREE"
                          : formatSystemAmount(selectedAddon.price_monthly, sysConfig) + " / month"}
                      </strong>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Super-Admin Publisher:</span>
                      <span>{selectedAddon.developer || "Master HRMS"}</span>
                    </div>
                  </div>
                </div>

                <DialogFooter className="p-4 pt-0 gap-2 sm:gap-0">
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
