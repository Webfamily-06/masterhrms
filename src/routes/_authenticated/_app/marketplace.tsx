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
import { PaymentCheckoutModal } from "@/components/payment-checkout-modal";
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
  Productivity: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
  Integrations: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80",
  Finance: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80",
  HRM: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80",
  Communication: "https://images.unsplash.com/photo-1611746872915-64382b5c76da?auto=format&fit=crop&w=600&q=80",
  Hardware: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
  Security: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80",
};

const DEFAULT_SUPER_ADDONS = [
  { id: "a1", name: "WhatsApp Instant Alerts & Triggers", category: "Communication", price_monthly: 499, description: "Automated WhatsApp notifications for salary payslips, leave approvals, and invoice receipts.", slug: "whatsapp-alerts", developer: "Master HRMS", image: CATEGORY_IMAGES.Communication },
  { id: "a2", name: "Biometric Hardware Sync Engine", category: "Hardware", price_monthly: 999, description: "Direct TCP/IP and HTTP API sync with ZKTeco, ESSL, and Hikvision fingerprint terminals.", slug: "biometric-sync", developer: "Master HRMS", image: CATEGORY_IMAGES.Hardware },
  { id: "a3", name: "AI Invoice OCR & Parser", category: "Finance", price_monthly: 1299, description: "AI document scanner to extract vendor GST, line items, and totals automatically.", slug: "ai-ocr", developer: "Master HRMS", image: CATEGORY_IMAGES.Finance },
  { id: "a4", name: "Tally Prime Ledger Importer", category: "Finance", price_monthly: 799, description: "Import CSV/XML ledger transactions directly from Tally Prime with automatic account mapping.", slug: "tally-importer", developer: "Master HRMS", image: CATEGORY_IMAGES.Finance },
  { id: "a5", name: "Stripe & Razorpay Payment Gateway", category: "Finance", price_monthly: 0, description: "Accept online client payments via UPI, Credit/Debit Cards, and Net Banking.", slug: "razorpay-gateway", developer: "Master HRMS", image: CATEGORY_IMAGES.Finance },
  { id: "a6", name: "Google Workspace SSO & Drive", category: "Security", price_monthly: 599, description: "Google OAuth 2.0 single sign-on authentication and Google Drive document browser.", slug: "google-workspace", developer: "Master HRMS", image: CATEGORY_IMAGES.Security },
];

function MarketplacePage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id;

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterTab, setFilterTab] = useState<"all" | "installed" | "free" | "pro">("all");
  const [selectedAddon, setSelectedAddon] = useState<any | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-platform-settings").maybeSingle();
      return data?.content as any;
    },
  });

  const { data: superAdminAddons = DEFAULT_SUPER_ADDONS, isLoading: isAddonsLoading } = useQuery({
    queryKey: ["realtime-super-addons"],
    queryFn: async () => {
      const { data } = await supabase.from("addons").select("*").order("name");
      if (data && data.length > 0) return data;
      return DEFAULT_SUPER_ADDONS;
    },
  });

  const purchasedSlugKey = `tenant-${tenantId || "default"}-purchased-addons-v2`;
  const { data: installedAddons = [] } = useQuery({
    queryKey: ["realtime-tenant-installed-addons", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", purchasedSlugKey).maybeSingle();
      if (data?.content && Array.isArray(data.content)) {
        return data.content as TenantPurchasedAddon[];
      }
      return [];
    },
    enabled: !!tenantId,
  });

  function isInstalled(addonId: string, slug?: string) {
    return installedAddons.some((a) => (a.addonId === addonId || (slug && a.addonSlug === slug)) && a.status === "active");
  }

  async function persistInstalledAddons(list: TenantPurchasedAddon[]) {
    if (!tenantId) return;
    const { error } = await supabase
      .from("cms_pages")
      .upsert({ slug: purchasedSlugKey, title: `Addons ${tenantId}`, content: list as any });
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["realtime-tenant-installed-addons", tenantId] });
    qc.invalidateQueries({ queryKey: ["realtime-tenant-dashboard-stats", tenantId] });
  }

  async function activateAddonAfterPayment(paymentDetails: { method: string; paymentId?: string }) {
    if (!selectedAddon || !tenantId) return;

    const price = selectedAddon.price_monthly || 0;
    const newInstalledItem: TenantPurchasedAddon = {
      addonId: selectedAddon.id,
      addonSlug: selectedAddon.slug || selectedAddon.id,
      addonName: selectedAddon.name,
      priceMonthly: price,
      purchasedAt: new Date().toISOString(),
      status: "active",
    };

    const updated = [newInstalledItem, ...installedAddons.filter((a) => a.addonId !== selectedAddon.id)];
    await persistInstalledAddons(updated);

    toast.success(
      `🎉 Payment Verified via ${paymentDetails.method}! Addon "${selectedAddon.name}" is now active on your workspace!`
    );
    setSelectedAddon(null);
  }

  async function confirmFreePurchase() {
    if (!selectedAddon || !tenantId) return;
    setIsPurchasing(true);
    try {
      const newInstalledItem: TenantPurchasedAddon = {
        addonId: selectedAddon.id,
        addonSlug: selectedAddon.slug || selectedAddon.id,
        addonName: selectedAddon.name,
        priceMonthly: 0,
        purchasedAt: new Date().toISOString(),
        status: "active",
      };
      const updated = [newInstalledItem, ...installedAddons.filter((a) => a.addonId !== selectedAddon.id)];
      await persistInstalledAddons(updated);
      toast.success(`Free Addon "${selectedAddon.name}" installed successfully!`);
      setSelectedAddon(null);
    } catch (err: any) {
      toast.error(err.message || "Installation failed");
    } finally {
      setIsPurchasing(false);
    }
  }

  async function toggleUninstall(addonId: string, name: string) {
    try {
      const updated = installedAddons.filter((a) => a.addonId !== addonId && a.addonSlug !== addonId);
      await persistInstalledAddons(updated);
      toast.info(`Addon "${name}" uninstalled from workspace.`);
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    }
  }

  function handleSelectAddon(addon: any) {
    setSelectedAddon(addon);
    const price = addon.price_monthly || 0;
    if (price > 0) {
      setIsPaymentModalOpen(true);
    }
  }

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
    <PlanGuard moduleName="Addons Marketplace" requiredPlan="free">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Store className="size-6 text-primary" /> Addons Marketplace
            </h1>
            <p className="text-xs text-muted-foreground">Discover, purchase, and activate modular extensions for your ERP workspace.</p>
          </div>
          <div className="flex items-center gap-3">
            <PlanLimitBar used={activeCount} limit={50} label="Active Addons Limit" />
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search addons, categories..."
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["all", "installed", "free", "pro"] as const).map((tab) => (
              <Button
                key={tab}
                variant={filterTab === tab ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterTab(tab)}
                className="text-xs font-bold capitalize"
              >
                {tab === "all" ? "All Addons" : tab}
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
              const priceVal = a.price_monthly !== null && a.price_monthly !== undefined ? Number(a.price_monthly) : 0;
              const isFree = priceVal === 0 || isNaN(priceVal);
              const imageUrl = String((a as any).image || CATEGORY_IMAGES[a.category] || CATEGORY_IMAGES.Productivity);

              return (
                <Card
                  key={a.id}
                  className={`flex flex-col justify-between overflow-hidden transition-all hover:shadow-xl group ${
                    installed ? "border-emerald-500/50 bg-emerald-500/5" : ""
                  }`}
                >
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
                          {formatSystemAmount(priceVal, sysConfig)}/mo
                        </Badge>
                      )}
                    </div>
                  </div>

                  <CardHeader className="pb-3 pt-3">
                    <CardTitle className="text-base font-bold leading-snug group-hover:text-primary transition-colors">
                      {a.name}
                    </CardTitle>
                    <CardDescription className="text-xs leading-relaxed mt-1 line-clamp-2">
                      {a.description || (a as any).tagline}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-3">
                    <div className="pt-3 border-t flex items-center justify-between">
                      <div>
                        {installed ? (
                          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 font-mono">
                            ● Installed & Active
                          </span>
                        ) : isFree ? (
                          <span className="text-[11px] font-mono font-bold text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                            FREE ADDON
                          </span>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Price</span>
                            <span className="font-mono font-black text-sm text-primary">
                              {formatSystemAmount(priceVal, sysConfig)}
                            </span>
                          </div>
                        )}
                      </div>

                      {installed ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleUninstall(a.id, a.name)}
                          className="text-destructive hover:bg-destructive/10 text-xs font-semibold h-8"
                        >
                          Uninstall
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="font-bold text-xs gap-1.5"
                          style={!isFree ? { background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff" } : {}}
                          onClick={() => handleSelectAddon(a)}
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

        {/* Free Addon Installation Modal */}
        <Dialog open={!!selectedAddon && (selectedAddon.price_monthly || 0) === 0} onOpenChange={(open) => !open && setSelectedAddon(null)}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingBag className="size-5 text-emerald-600" /> Install Free Addon: {selectedAddon?.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Activate free addon on your workspace immediately.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <p className="text-muted-foreground">{selectedAddon?.description}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedAddon(null)}>Cancel</Button>
              <Button onClick={confirmFreePurchase} disabled={isPurchasing} className="font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                {isPurchasing ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Confirm & Install Free
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 3-Option Payment Checkout Modal (Razorpay, PayPal, Manual Bank Transfer + Screenshot Upload) */}
        {selectedAddon && (selectedAddon.price_monthly || 0) > 0 && (
          <PaymentCheckoutModal
            open={isPaymentModalOpen}
            onOpenChange={(open) => {
              setIsPaymentModalOpen(open);
              if (!open) setSelectedAddon(null);
            }}
            title="Purchase & Activate Addon"
            itemType="addon"
            itemId={selectedAddon.id}
            itemName={selectedAddon.name}
            amount={selectedAddon.price_monthly || 0}
            description={selectedAddon.description || `Monthly subscription for ${selectedAddon.name}`}
            onSuccess={activateAddonAfterPayment}
          />
        )}
      </div>
    </PlanGuard>
  );
}
