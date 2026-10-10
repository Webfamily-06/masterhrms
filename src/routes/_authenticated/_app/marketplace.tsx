import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Store,
  Search,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  CreditCard,
  ShoppingBag,
  Loader2,
  Eye,
  ExternalLink,
  Tag,
  AlertCircle,
  Clock,
  RefreshCw,
  MessageSquare,
  Fingerprint,
  Landmark,
  Layers,
  Cpu,
  Users,
  Lock,
  Puzzle,
  PackageCheck,
  LayoutGrid,
} from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { PlanGuard } from "@/components/plan-guard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/marketplace")({
  component: MarketplacePage,
  head: () => ({ meta: [{ title: "Addons Marketplace — Master ERP" }] }),
});

export type CatalogPriceDefinition = {
  id: string;
  productId: string;
  currency: string;
  billingInterval: "1_month" | "1_year";
  pricingModel: "FLAT" | "PER_SEAT" | "SEAT_BAND";
  basePrice: number;
  originalPrice?: number | null;
  taxIncluded: boolean;
  isDefault: boolean;
};

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  productType: "BASE_PLAN" | "STANDALONE_PRODUCT" | "ADDON_FEATURE" | "ADDON_INTEGRATION";
  entitlementKey: string;
  targetEngine: "subscription" | "module" | "addon";
  description: string;
  category: string;
  isPublic: boolean;
  status: "ACTIVE" | "RETIRED" | "DRAFT";
  version: string;
  features: string[];
  prices: CatalogPriceDefinition[];
  eligibility?: {
    eligible: boolean;
    alreadyOwned?: boolean;
    reason?: string;
  };
  icon?: string;
  image?: string;
  tagline?: string;
  long_description?: string;
  developer?: string;
  screenshots?: string[];
};

// Check if image string is a genuine uploaded/persisted asset URL
function isUploadedAssetUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  return (
    url.startsWith("/uploads/") ||
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  );
}

// Consistent Lucide Category / Icon Resolver matching public addons design system
function getCategoryIcon(category?: string, productName?: string, iconName?: string) {
  const iconStr = (iconName || "").toLowerCase();
  const cat = (category || "").toLowerCase();
  const name = (productName || "").toLowerCase();

  if (iconStr === "messagesquare" || cat.includes("message") || cat.includes("communication") || name.includes("whatsapp") || name.includes("slack"))
    return MessageSquare;
  if (iconStr === "fingerprint" || cat.includes("hardware") || cat.includes("biometric") || name.includes("biometric") || name.includes("device"))
    return Fingerprint;
  if (iconStr === "sparkles" || cat.includes("ai") || cat.includes("automation") || name.includes("ocr") || name.includes("neural"))
    return Sparkles;
  if (iconStr === "store" || cat.includes("commerce") || cat.includes("retail") || cat.includes("pos") || name.includes("pos"))
    return Store;
  if (iconStr === "layers" || cat.includes("accounting") || name.includes("tally") || name.includes("bridge"))
    return Layers;
  if (iconStr === "landmark" || cat.includes("finance") || name.includes("ledger") || name.includes("currency") || name.includes("forex"))
    return Landmark;
  if (iconStr === "cpu" || cat.includes("operations") || cat.includes("asset"))
    return Cpu;
  if (iconStr === "creditcard" || cat.includes("payment"))
    return CreditCard;
  if (iconStr === "lock" || cat.includes("auth") || cat.includes("sso") || name.includes("google"))
    return Lock;
  if (iconStr === "shieldcheck" || cat.includes("security"))
    return ShieldCheck;
  if (iconStr === "users" || cat.includes("hr") || name.includes("okr") || name.includes("performance") || name.includes("starter") || name.includes("growth") || name.includes("sovereign"))
    return Users;
  return Puzzle;
}

const LAUNCH_URLS: Record<string, string> = {
  pos: "/pos",
  crm: "/crm",
  finance: "/accounting",
  "biometric-sync": "/attendance",
  "google-workspace": "/settings",
  "asset-management": "/assets",
  "okr-performance": "/okr",
  "whatsapp-alerts": "/notifications",
  "ai-ocr": "/ai-ocr",
  starter: "/subscription",
  growth: "/subscription",
  sovereign: "/subscription",
};

function MarketplacePage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile();
  const tenantId = profile?.tenant_id || profile?.tenantId || "";

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterTab, setFilterTab] = useState<"all" | "installed" | "pro">("all");
  const [filterType, setFilterType] = useState<"all" | "addons" | "modules" | "plans">("all");
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<CatalogProduct | null>(null);

  // Authoritative Checkout State
  const [checkoutProduct, setCheckoutProduct] = useState<CatalogProduct | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<
    "idle" | "creating_order" | "launching_gateway" | "verifying" | "fulfilling" | "settled" | "pending_settlement" | "failed" | "error"
  >("idle");
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // 1. Authoritative Commerce Catalog Query
  const { data: catalogProducts = [], isLoading: isCatalogLoading } = useQuery({
    queryKey: ["commerce-catalog", tenantId],
    queryFn: async () => {
      try {
        const queryParam = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
        const res = await api.get<{
          success: boolean;
          currency: string;
          totalProducts: number;
          products: CatalogProduct[];
        }>(`/commerce/catalog${queryParam}`);
        return res?.products || [];
      } catch (err) {
        console.error("Failed to load commerce catalog:", err);
        return [];
      }
    },
    enabled: !!tenantId,
    staleTime: 60 * 1000,
  });

  // 2. Authoritative Price Resolution
  function getProductMonthlyPrice(product: CatalogProduct): number {
    const monthly = product.prices?.find((p) => p.billingInterval === "1_month");
    if (monthly && typeof monthly.basePrice === "number") return monthly.basePrice;
    const defaultPrice = product.prices?.find((p) => p.isDefault);
    if (defaultPrice && typeof defaultPrice.basePrice === "number") return defaultPrice.basePrice;
    return 0;
  }

  // 3. Authoritative Entitlement / Installed Verification
  function isProductInstalled(product: CatalogProduct): boolean {
    if (product.eligibility?.alreadyOwned === true) return true;
    const slug = (product.slug || "").toLowerCase();
    const enabledMods = profile?.enabledModules || [];
    if (enabledMods.includes(slug)) return true;
    if (enabledMods.includes(slug.replace("prod_", ""))) return true;
    if (enabledMods.includes(slug.replace("addon_", ""))) return true;
    return false;
  }

  function getLaunchUrl(product: CatalogProduct): string {
    const slug = (product.slug || "").toLowerCase();
    return LAUNCH_URLS[slug] || LAUNCH_URLS[slug.replace("prod_", "")] || "/dashboard";
  }

  // 4. Authoritative Purchase & Checkout Handler
  async function handleStartCheckout(product: CatalogProduct) {
    if (!tenantId) {
      toast.error("Authenticated workspace context required.");
      return;
    }

    setCheckoutProduct(product);
    setCheckoutStep("idle");
    setCreatedOrder(null);
    setCheckoutError(null);
  }

  async function executeRazorpayCheckout() {
    if (!checkoutProduct || !tenantId) return;

    try {
      setCheckoutStep("creating_order");
      setCheckoutError(null);

      // Step 1: Create Order on Server (Authoritative Price & Snapshot)
      const idempotencyKey = `market_${tenantId}_${checkoutProduct.slug}_${Date.now()}`;
      const orderPayload = {
        items: [
          {
            productSlug: checkoutProduct.slug,
            billingCycle: "1_month",
          },
        ],
        idempotencyKey,
      };

      const orderRes = await api.post<{ success: boolean; order: any }>("/commerce/orders", orderPayload);
      if (!orderRes?.success || !orderRes.order) {
        throw new Error("Server failed to create commerce order.");
      }
      const order = orderRes.order;
      setCreatedOrder(order);

      // Step 2: Initiate Razorpay Checkout on Server
      setCheckoutStep("launching_gateway");
      const initRes = await api.post<{
        success: boolean;
        orderId: string;
        gatewayOrderId: string;
        amount: number;
        currency: string;
        keyId: string;
        orderNumber: string;
        customer: { name: string; email: string };
      }>("/commerce/checkout/initiate", { orderId: order.id });

      if (!initRes?.success || !initRes.gatewayOrderId) {
        throw new Error("Failed to initialize gateway session.");
      }

      // Step 3: Open Razorpay Sandbox Checkout Modal
      const rzpRes = await openRazorpayCheckout({
        amount: initRes.amount / 100,
        name: checkoutProduct.name,
        description: checkoutProduct.description || `Monthly subscription for ${checkoutProduct.name}`,
        userName: profile?.full_name || user?.email || "Workspace Admin",
        userEmail: user?.email || "admin@workspace.com",
        tenantId,
        keyId: initRes.keyId,
        orderId: initRes.gatewayOrderId,
      });

      // Step 4: Await Authoritative Server Settlement
      // A payment callback from Razorpay is NOT settlement. Entitlements are NEVER granted client-side.
      setCheckoutStep("verifying");
      toast.info(`Payment received by gateway (${rzpRes.razorpay_payment_id}). Awaiting server settlement...`);

      // Poll order status for authoritative confirmation
      let finalState: "settled" | "pending_settlement" | "failed" = "pending_settlement";
      for (let attempt = 1; attempt <= 12; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        try {
          const pollRes = await api.get<{ success: boolean; order: any }>(`/commerce/orders/${order.id}`);
          const fetchedOrder = pollRes?.order;
          if (!fetchedOrder) continue;

          // Check if order failed or expired
          if (fetchedOrder.status === "FAILED" || fetchedOrder.status === "CANCELLED" || fetchedOrder.status === "EXPIRED") {
            finalState = "failed";
            setCheckoutError(`Order terminated with status: ${fetchedOrder.status}`);
            break;
          }

          // Check if payment captured (PAID)
          if (fetchedOrder.status === "PAID") {
            if (fetchedOrder.fulfillmentStatus === "FULFILLED") {
              finalState = "settled";
              break;
            } else {
              // Webhook verified & settled, but outbox worker is still fulfilling
              setCheckoutStep("fulfilling");
            }
          }
        } catch {
          // Continue polling
        }
      }

      if (finalState === "settled") {
        setCheckoutStep("settled");
        qc.invalidateQueries({ queryKey: ["commerce-catalog", tenantId] });
        qc.invalidateQueries({ queryKey: ["current-session-user"] });
        toast.success(`Add-on "${checkoutProduct.name}" is now active on your workspace!`);
      } else if (finalState === "failed") {
        setCheckoutStep("failed");
        toast.error("Payment or order verification failed.");
      } else {
        // Pending webhook settlement or outbox delay: do NOT claim settled!
        setCheckoutStep("pending_settlement");
        qc.invalidateQueries({ queryKey: ["commerce-catalog", tenantId] });
        toast.info("Payment confirmed by gateway. Authoritative settlement is completing in background.");
      }
    } catch (err: any) {
      console.error("[marketplace/checkout] error:", err);
      const errMsg = err?.message || "Checkout failed or was cancelled.";
      if (errMsg.toLowerCase().includes("closed") || errMsg.toLowerCase().includes("cancelled")) {
        toast.info("Checkout window was closed. Order remains open.");
        setCheckoutStep("idle");
      } else {
        setCheckoutError(errMsg);
        setCheckoutStep("error");
        toast.error(errMsg);
      }
    }
  }

  // Developer Test Settlement (Non-production fallback when localhost webhook is unreachable)
  async function handleSimulateDevSettlement() {
    if (!createdOrder || !tenantId) return;
    try {
      setCheckoutStep("verifying");
      await api.post("/commerce/checkout/simulate", {
        orderId: createdOrder.id,
        outcome: "SUCCESS",
        notes: "Dev testing simulation via marketplace UI",
      });
      setCheckoutStep("settled");
      qc.invalidateQueries({ queryKey: ["commerce-catalog", tenantId] });
      qc.invalidateQueries({ queryKey: ["current-session-user"] });
      toast.success("Sandbox settlement simulated successfully! Addon is now active.");
    } catch (err: any) {
      toast.error(err.message || "Simulated settlement failed.");
      setCheckoutStep("idle");
    }
  }

  // Categories derivation from server catalog
  const categories = useMemo(() => {
    const set = new Set<string>();
    catalogProducts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["all", ...Array.from(set).sort()];
  }, [catalogProducts]);

  // Filtering
  const filtered = catalogProducts.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      filterCategory === "all" ||
      (p.category || "").toLowerCase() === filterCategory.toLowerCase();

    const installed = isProductInstalled(p);
    let matchesTab = true;
    if (filterTab === "installed") matchesTab = installed;
    else if (filterTab === "pro") matchesTab = !installed;

    let matchesType = true;
    if (filterType === "addons") {
      matchesType = p.productType === "ADDON_FEATURE" || p.productType === "ADDON_INTEGRATION";
    } else if (filterType === "modules") {
      matchesType = p.productType === "STANDALONE_PRODUCT";
    } else if (filterType === "plans") {
      matchesType = p.productType === "BASE_PLAN";
    }

    return matchesSearch && matchesCategory && matchesTab && matchesType;
  });

  return (
    <PlanGuard moduleName="Addons Marketplace" requiredPlan="free">
      <div className="space-y-6 max-w-full pb-12">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Store className="size-6 text-primary" /> Addons Marketplace
            </h1>
            <p className="text-xs text-muted-foreground">
              Discover and activate enterprise extensions backed by server-authoritative pricing and isolation.
            </p>
          </div>
        </div>

        {/* Product Type Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase mr-1 shrink-0 flex items-center gap-1">
            <LayoutGrid className="size-3 text-primary" /> Type:
          </span>
          {[
            { id: "all", label: "All Items" },
            { id: "addons", label: "Add-ons & Integrations" },
            { id: "modules", label: "ERP Modules" },
            { id: "plans", label: "Subscription Plans" },
          ].map((t) => (
            <Button
              key={t.id}
              variant={filterType === t.id ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType(t.id as any)}
              className="h-7 text-xs px-2.5 rounded-lg shrink-0 font-semibold"
            >
              {t.label}
            </Button>
          ))}
        </div>

        {/* Search & Status Filters */}
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
            {(["all", "installed", "pro"] as const).map((tab) => (
              <Button
                key={tab}
                variant={filterTab === tab ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterTab(tab)}
                className="text-xs font-bold capitalize"
              >
                {tab === "all" ? "All Status" : tab === "installed" ? "Installed & Active" : "Available to Purchase"}
              </Button>
            ))}
          </div>
        </div>

        {/* Category Navigation Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase mr-1 shrink-0 flex items-center gap-1">
            <Tag className="size-3 text-primary" /> Categories:
          </span>
          {categories.map((cat: string) => (
            <Button
              key={cat}
              variant={filterCategory.toLowerCase() === cat.toLowerCase() ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterCategory(cat)}
              className="h-7 text-xs px-2.5 rounded-lg shrink-0 font-semibold capitalize"
            >
              {cat === "all" ? "All Categories" : cat}
            </Button>
          ))}
        </div>

        {/* Addons Grid */}
        {isCatalogLoading ? (
          <div className="py-16 grid place-items-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground italic space-y-2">
            <Store className="size-10 mx-auto opacity-30" />
            <p>No extensions match your search criteria.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((product) => {
              const installed = isProductInstalled(product);
              const priceVal = getProductMonthlyPrice(product);
              const CatIcon = getCategoryIcon(product.category, product.name, product.icon);
              const hasUploadedImg = isUploadedAssetUrl(product.image) || isUploadedAssetUrl(product.icon);
              const displayImg = isUploadedAssetUrl(product.image) ? product.image! : isUploadedAssetUrl(product.icon) ? product.icon! : null;

              return (
                <Card
                  key={product.id}
                  className={`flex flex-col justify-between overflow-hidden transition-all hover:shadow-xl group border shadow-xs ${
                    installed ? "border-emerald-500/50 bg-emerald-500/5" : ""
                  }`}
                >
                  {/* Top Thumbnail Banner / Neutral Category Graphic */}
                  <div
                    className="h-40 relative bg-gradient-to-br from-primary/10 via-purple-500/10 to-emerald-500/10 border-b overflow-hidden cursor-pointer flex items-center justify-center"
                    onClick={() => setSelectedProductForDetails(product)}
                  >
                    {hasUploadedImg ? (
                      <img
                        src={displayImg!}
                        alt={product.name}
                        className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="size-16 rounded-2xl bg-background/80 backdrop-blur-md border shadow-md grid place-items-center text-primary group-hover:scale-110 transition-transform">
                        <CatIcon className="size-8" />
                      </div>
                    )}

                    <div className="absolute top-3 left-3">
                      <Badge variant="outline" className="text-[10px] font-mono bg-background/85 backdrop-blur-md gap-1">
                        <CatIcon className="size-3 text-primary" /> {product.category || "General"}
                      </Badge>
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      {product.productType === "BASE_PLAN" && (
                        <Badge variant="secondary" className="font-mono text-[9px] bg-background/90 text-primary border shadow-xs">
                          Plan Tier
                        </Badge>
                      )}
                      <Badge className="bg-primary text-white font-mono text-[9px] shadow-sm">
                        {formatSystemAmount(priceVal)}/mo
                      </Badge>
                    </div>
                  </div>

                  <CardHeader className="pb-2 pt-3 cursor-pointer" onClick={() => setSelectedProductForDetails(product)}>
                    <CardTitle className="text-base font-bold leading-snug group-hover:text-primary transition-colors">
                      {product.name}
                    </CardTitle>
                    <CardDescription className="text-xs leading-relaxed mt-1 line-clamp-2">
                      {product.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-3">
                    <div className="pt-3 border-t flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedProductForDetails(product)}
                        className="h-8 text-xs font-semibold gap-1.5 flex-1"
                      >
                        <Eye className="size-3.5 text-primary" /> View Details
                      </Button>

                      {installed ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 text-xs font-bold gap-1 text-emerald-600 border border-emerald-500/20"
                          asChild
                        >
                          <Link to={getLaunchUrl(product) as any}>
                            <ExternalLink className="size-3.5" /> Launch
                          </Link>
                        </Button>
                      ) : product.productType === "BASE_PLAN" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs font-bold gap-1 border-primary/40 text-primary hover:bg-primary/10"
                          asChild
                        >
                          <Link to="/subscription">
                            <ExternalLink className="size-3.5" /> Manage Plan
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-8 font-bold text-xs gap-1.5"
                          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff" }}
                          onClick={() => handleStartCheckout(product)}
                        >
                          <ShoppingBag className="size-3.5" /> Purchase
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* MODAL: VIEW FULL ADDON DETAILS */}
        <Dialog open={!!selectedProductForDetails} onOpenChange={(open) => !open && setSelectedProductForDetails(null)}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            {selectedProductForDetails && (() => {
              const product = selectedProductForDetails;
              const installed = isProductInstalled(product);
              const priceVal = getProductMonthlyPrice(product);
              const ModalCatIcon = getCategoryIcon(product.category, product.name, product.icon);
              const modalHasUploadedImg = isUploadedAssetUrl(product.image) || isUploadedAssetUrl(product.icon);
              const modalDisplayImg = isUploadedAssetUrl(product.image) ? product.image! : isUploadedAssetUrl(product.icon) ? product.icon! : null;

              return (
                <div className="space-y-4 text-xs">
                  {/* Banner Image / Neutral Lucide Category Icon Box */}
                  <div className="h-44 rounded-xl relative overflow-hidden bg-gradient-to-br from-primary/10 via-purple-500/10 to-emerald-500/10 border flex items-center justify-center">
                    {modalHasUploadedImg ? (
                      <img src={modalDisplayImg!} alt={product.name} className="size-full object-cover" loading="lazy" />
                    ) : (
                      <div className="size-16 rounded-2xl bg-background/90 border shadow-md grid place-items-center text-primary">
                        <ModalCatIcon className="size-8" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/25 to-transparent" />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <Badge className="bg-background/85 backdrop-blur-md text-foreground font-mono text-[10px] gap-1">
                        <ModalCatIcon className="size-3 text-primary" /> {product.category || "Extension"}
                      </Badge>
                      <Badge variant="outline" className="bg-background/85 font-mono text-[10px]">
                        {product.version || "v1.0.0"}
                      </Badge>
                      {product.productType === "BASE_PLAN" && (
                        <Badge variant="secondary" className="bg-background/90 text-primary font-mono text-[10px]">
                          Subscription Plan
                        </Badge>
                      )}
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                      <div>
                        <h2 className="text-xl font-black text-foreground">{product.name}</h2>
                        <p className="text-muted-foreground text-xs mt-0.5">{product.developer || "Master ERP Platform Official"}</p>
                      </div>
                      <Badge className="bg-primary text-white font-mono font-bold text-xs">
                        {formatSystemAmount(priceVal)}/mo
                      </Badge>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <h3 className="font-bold text-sm text-foreground">About this Add-on</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {product.long_description || product.description}
                    </p>
                  </div>

                  {/* Key Features List */}
                  {Array.isArray(product.features) && product.features.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      <h4 className="font-bold text-xs uppercase text-muted-foreground">Included Features & Capabilities</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {product.features.map((feat: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 border">
                            <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                            <span className="font-medium text-foreground text-[11px]">{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status & Pricing Banner */}
                  <div className="p-3 bg-muted/40 rounded-xl flex items-center justify-between border">
                    <div>
                      <span className="text-muted-foreground text-[11px]">Monthly License Rate:</span>
                      <div className="font-mono font-bold text-base text-primary">
                        {formatSystemAmount(priceVal)}
                      </div>
                    </div>
                    <div>
                      {installed ? (
                        <Badge className="bg-emerald-500 text-white font-bold">
                          INSTALLED & ACTIVE
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground font-mono">
                          Ready to Purchase
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <DialogFooter className="flex justify-between sm:justify-between items-center w-full pt-2 border-t">
                    <Button size="sm" variant="outline" onClick={() => setSelectedProductForDetails(null)}>
                      Close
                    </Button>
                    <div className="flex gap-2">
                      {installed ? (
                        <Button size="sm" className="font-bold gap-1.5 bg-primary" asChild>
                          <Link to={getLaunchUrl(product) as any}>
                            <ExternalLink className="size-3.5" /> Launch Module
                          </Link>
                        </Button>
                      ) : product.productType === "BASE_PLAN" ? (
                        <Button size="sm" variant="outline" className="font-bold gap-1.5 border-primary/40 text-primary hover:bg-primary/10" asChild>
                          <Link to="/subscription">
                            <ExternalLink className="size-3.5" /> Manage Workspace Plan
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedProductForDetails(null);
                            handleStartCheckout(product);
                          }}
                          className="font-bold gap-1.5"
                          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff" }}
                        >
                          <ShoppingBag className="size-3.5" /> Purchase & Activate
                        </Button>
                      )}
                    </div>
                  </DialogFooter>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* MODAL: AUTHORITATIVE CHECKOUT DIALOG */}
        <Dialog
          open={!!checkoutProduct}
          onOpenChange={(open) => {
            if (
              !open &&
              checkoutStep !== "creating_order" &&
              checkoutStep !== "launching_gateway" &&
              checkoutStep !== "verifying" &&
              checkoutStep !== "fulfilling"
            ) {
              setCheckoutProduct(null);
              setCheckoutStep("idle");
              setCreatedOrder(null);
              setCheckoutError(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-md text-xs">
            {checkoutProduct && (() => {
              const priceVal = getProductMonthlyPrice(checkoutProduct);
              return (
                <div className="space-y-4">
                  <DialogHeader>
                    <DialogTitle className="text-base font-black flex items-center gap-2">
                      <CreditCard className="size-5 text-primary" /> Checkout: {checkoutProduct.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Server-authoritative sandbox payment powered by Razorpay.
                    </DialogDescription>
                  </DialogHeader>

                  {/* Order Preview */}
                  <div className="p-3 bg-secondary/30 rounded-xl border space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Product:</span>
                      <span className="font-bold text-foreground">{checkoutProduct.name}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Billing Interval:</span>
                      <Badge variant="outline" className="text-[10px] font-mono">1 Month</Badge>
                    </div>
                    <div className="flex justify-between items-center text-xs pt-2 border-t">
                      <span className="font-bold text-foreground">Authoritative Amount:</span>
                      <span className="font-mono font-bold text-base text-primary">
                        {formatSystemAmount(priceVal)}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">
                      * Taxes calculated and sealed server-side upon order creation.
                    </p>
                  </div>

                  {/* Status & Feedback */}
                  {checkoutStep === "creating_order" && (
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center gap-2 text-blue-600">
                      <Loader2 className="size-4 animate-spin shrink-0" />
                      <span>Creating immutable order snapshot on server...</span>
                    </div>
                  )}

                  {checkoutStep === "launching_gateway" && (
                    <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center gap-2 text-purple-600">
                      <Loader2 className="size-4 animate-spin shrink-0" />
                      <span>Opening Razorpay Sandbox Checkout window...</span>
                    </div>
                  )}

                  {checkoutStep === "verifying" && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-amber-600">
                      <Loader2 className="size-4 animate-spin shrink-0" />
                      <div>
                        <p className="font-bold">Gateway Payment Received</p>
                        <p className="text-[10px]">Awaiting authoritative server webhook verification...</p>
                      </div>
                    </div>
                  )}

                  {checkoutStep === "fulfilling" && (
                    <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center gap-2 text-indigo-600">
                      <Loader2 className="size-4 animate-spin shrink-0" />
                      <div>
                        <p className="font-bold">Payment Settled (PAID)</p>
                        <p className="text-[10px]">Processing transactional outbox fulfillment & granting entitlements...</p>
                      </div>
                    </div>
                  )}

                  {checkoutStep === "settled" && (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-emerald-600">
                      <CheckCircle2 className="size-5 shrink-0" />
                      <div>
                        <p className="font-bold">Payment Verified & Settled!</p>
                        <p className="text-[10px]">Addon is now active on your workspace.</p>
                      </div>
                    </div>
                  )}

                  {checkoutStep === "pending_settlement" && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-amber-600">
                      <AlertCircle className="size-5 shrink-0" />
                      <div>
                        <p className="font-bold">Settlement In Progress</p>
                        <p className="text-[10px]">Payment received by gateway. Webhook settlement or outbox worker is finalizing in the background. Entitlement will activate once complete.</p>
                      </div>
                    </div>
                  )}

                  {(checkoutStep === "error" || checkoutStep === "failed") && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-2 text-destructive">
                      <AlertCircle className="size-5 shrink-0" />
                      <div>
                        <p className="font-bold">Checkout / Payment Incomplete</p>
                        <p className="text-[10px]">{checkoutError || "An error occurred during checkout or payment settlement."}</p>
                      </div>
                    </div>
                  )}

                  {/* Trust & Security Badge */}
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
                    <span>HMAC-SHA256 Webhook Verification • Zero Client Pricing Authority</span>
                  </div>

                  <DialogFooter className="flex justify-between sm:justify-between items-center pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCheckoutProduct(null);
                        setCheckoutStep("idle");
                      }}
                      disabled={checkoutStep === "creating_order" || checkoutStep === "launching_gateway"}
                    >
                      {checkoutStep === "settled" ? "Done" : checkoutStep === "pending_settlement" ? "Close" : "Cancel"}
                    </Button>

                    <div className="flex gap-2">
                      {checkoutStep === "idle" && (
                        <Button
                          size="sm"
                          onClick={executeRazorpayCheckout}
                          className="font-bold gap-1.5"
                          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff" }}
                        >
                          <CreditCard className="size-3.5" /> Pay with Razorpay Sandbox
                        </Button>
                      )}

                      {/* Developer Sandbox Instant Settlement (Dev Only Fallback) */}
                      {import.meta.env.DEV && createdOrder && checkoutStep !== "settled" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={handleSimulateDevSettlement}
                          className="text-[10px] h-8 font-mono border"
                        >
                          <RefreshCw className="size-3 mr-1" /> Dev Simulate Settlement
                        </Button>
                      )}
                    </div>
                  </DialogFooter>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </PlanGuard>
  );
}

export default MarketplacePage;
