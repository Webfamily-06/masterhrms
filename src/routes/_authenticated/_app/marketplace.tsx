import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  X,
  Filter,
  Check,
  Info,
  ArrowUpRight,
  Zap,
} from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { PlanGuard } from "@/components/plan-guard";
import { toast } from "sonner";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";

export const Route = createFileRoute("/_authenticated/_app/marketplace")({
  component: MarketplacePage,
  head: () => ({ meta: [{ title: "Add-ons Marketplace — Master ERP" }] }),
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
    isInstalled?: boolean;
    isPlanIncluded?: boolean;
    isEntitled?: boolean;
    isFree?: boolean;
    isEnabled?: boolean;
    canDisable?: boolean;
    canEnable?: boolean;
    lifecycleStatus?: "INSTALLED" | "PLAN_INCLUDED" | "AVAILABLE_FREE" | "AVAILABLE_PAID" | "RESTRICTED" | "disabled" | "enabled" | "available" | string;
    allowedAction?: "OPEN" | "INSTALL" | "PURCHASE" | "VIEW_PLAN" | "RESTRICTED" | "enable" | "disable" | string;
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

// Soft pastel styling per category
function getCategoryBadgeColor(category?: string): string {
  const cat = (category || "").toLowerCase();
  if (cat.includes("communication")) return "bg-sky-500/10 text-sky-600 dark:text-sky-400";
  if (cat.includes("hardware") || cat.includes("biometric")) return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
  if (cat.includes("ai") || cat.includes("automation")) return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
  if (cat.includes("commerce") || cat.includes("pos")) return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
  if (cat.includes("finance") || cat.includes("accounting")) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  if (cat.includes("security") || cat.includes("auth")) return "bg-rose-500/10 text-rose-600 dark:text-rose-400";
  if (cat.includes("hr") || cat.includes("people")) return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
  if (cat.includes("developer") || cat.includes("compliance")) return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400";
  return "bg-primary/10 text-primary";
}

const LAUNCH_URLS: Record<string, string> = {
  pos: "/pos",
  crm: "/crm",
  finance: "/accounting",
  "biometric-sync": "/attendance",
  "google-workspace": "/google-workspace",
  "google-workspace-integration": "/google-workspace",
  "tally-importer": "/tally-importer",
  "tally-prime-sync": "/tally-importer",
  "asset-management": "/assets",
  "okr-performance": "/okr",
  "whatsapp-alerts": "/notifications",
  "ai-ocr": "/ai-ocr",
  "two-factor-auth": "/two-factor-auth",
  "backup-restore": "/backup-restore",
  "activity-logs": "/activity-logs",
  "internal-reminders": "/internal-reminders",
  "public-api": "/developer",
  "notice-board": "/notice-board",
  "outbound-webhooks": "/outbound-webhooks",
  "sms-gateway": "/sms-gateway",
  "woocommerce-sync": "/integrations",
  "woocommerce-hub": "/integrations",
  "shopify-sync": "/shopify",
  starter: "/subscription",
  growth: "/subscription",
  sovereign: "/subscription",
};

type StatusQuickFilter = "all" | "free" | "paid" | "installed" | "disabled" | "available";

function MarketplacePage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile();
  const tenantId = profile?.tenant_id || profile?.tenantId || "";

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusQuickFilter>("all");
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<CatalogProduct | null>(null);
  const [installingSlug, setInstallingSlug] = useState<string | null>(null);
  const [actionLoadingSlug, setActionLoadingSlug] = useState<string | null>(null);

  // Dedicated Workspace Subscription Plan Query (Strictly separated from add-on catalog)
  const { data: workspaceSub, isLoading: isSubLoading } = useQuery({
    queryKey: ["workspace-subscription", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get<any>("/workspace/subscription");
        return res || null;
      } catch (err) {
        console.error("Failed to load workspace subscription:", err);
        return null;
      }
    },
    enabled: !!tenantId,
    staleTime: 60 * 1000,
  });

  // Authoritative Checkout State
  const [checkoutProduct, setCheckoutProduct] = useState<CatalogProduct | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<
    "idle" | "creating_order" | "launching_gateway" | "verifying" | "fulfilling" | "settled" | "pending_settlement" | "failed" | "error"
  >("idle");
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // 1. Authoritative Commerce Catalog Query
  const { data: catalogData, isLoading: isCatalogLoading } = useQuery({
    queryKey: ["commerce-catalog", tenantId],
    queryFn: async () => {
      try {
        const queryParam = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
        const res = await api.get<{
          success: boolean;
          currency: string;
          totalProducts: number;
          summary?: {
            total: number;
            available: number;
            installed: number;
            planIncluded: number;
            free: number;
            paid: number;
          };
          products: CatalogProduct[];
        }>(`/commerce/catalog${queryParam}`);
        return res || { success: true, currency: "INR", totalProducts: 0, products: [] };
      } catch (err) {
        console.error("Failed to load commerce catalog:", err);
        return { success: false, currency: "INR", totalProducts: 0, products: [] };
      }
    },
    enabled: !!tenantId,
    staleTime: 60 * 1000,
  });

  // Strict Separation: Add-on Marketplace products ONLY (filter out base subscription plans)
  const addOnProducts = useMemo(() => {
    const raw = catalogData?.products || [];
    return raw.filter((p) => p.productType !== "BASE_PLAN");
  }, [catalogData]);

  // 2. Authoritative Price Resolution (Both Monthly and Yearly)
  function getProductMonthlyPrice(product: CatalogProduct): number {
    const monthly = product.prices?.find((p) => p.billingInterval === "1_month");
    if (monthly && typeof monthly.basePrice === "number") return monthly.basePrice;
    const defaultPrice = product.prices?.find((p) => p.isDefault);
    if (defaultPrice && typeof defaultPrice.basePrice === "number") return defaultPrice.basePrice;
    return 0;
  }

  function getProductYearlyPrice(product: CatalogProduct): number | null {
    const yearly = product.prices?.find((p) => p.billingInterval === "1_year");
    if (yearly && typeof yearly.basePrice === "number") return yearly.basePrice;
    const monthly = getProductMonthlyPrice(product);
    if (monthly > 0) return Math.round(monthly * 12 * 0.83); // Standard annual discount reference if not explicit
    return null;
  }

  // 3. Authoritative Lifecycle & Entitlement Verification
  function isProductDisabled(product: CatalogProduct): boolean {
    const status = String(product.eligibility?.lifecycleStatus || "").toLowerCase();
    if (status === "disabled") return true;
    if (product.eligibility?.isEnabled === false && product.eligibility?.isInstalled === true) return true;
    return false;
  }

  function isProductInstalled(product: CatalogProduct): boolean {
    if (isProductDisabled(product)) return true;
    if (product.eligibility?.isInstalled === true || product.eligibility?.alreadyOwned === true) return true;
    const slug = (product.slug || "").toLowerCase();
    const enabledMods = profile?.enabledModules || [];
    if (enabledMods.includes(slug)) return true;
    if (enabledMods.includes(slug.replace("prod_", ""))) return true;
    if (enabledMods.includes(slug.replace("addon_", ""))) return true;
    return false;
  }

  function isProductEnabled(product: CatalogProduct): boolean {
    if (isProductDisabled(product)) return false;
    return isProductInstalled(product);
  }

  function canDisableProduct(product: CatalogProduct): boolean {
    if (product.eligibility?.canDisable !== undefined) return product.eligibility.canDisable;
    const slug = (product.slug || "").toLowerCase();
    const coreSlugs = ["starter", "growth", "sovereign", "core_platform", "hrm", "hrms", "employees"];
    return !coreSlugs.includes(slug) && isProductInstalled(product) && !isProductDisabled(product);
  }

  function canEnableProduct(product: CatalogProduct): boolean {
    if (product.eligibility?.canEnable !== undefined) return product.eligibility.canEnable;
    return isProductDisabled(product);
  }

  function isProductPlanIncluded(product: CatalogProduct): boolean {
    return product.eligibility?.isPlanIncluded === true;
  }

  function isProductFree(product: CatalogProduct): boolean {
    if (product.eligibility?.isFree === true) return true;
    return getProductMonthlyPrice(product) === 0;
  }

  function getLaunchUrl(product: CatalogProduct): string {
    const slug = (product.slug || "").toLowerCase();
    return LAUNCH_URLS[slug] || LAUNCH_URLS[slug.replace("prod_", "")] || "/dashboard";
  }

  // 4. Authoritative Free Add-on Direct Installation (No Payment Gateway Redirect)
  async function handleInstallFree(product: CatalogProduct) {
    if (!tenantId) {
      toast.error("Authenticated workspace context required.");
      return;
    }

    try {
      setInstallingSlug(product.slug);
      const res = await api.post<{ success: boolean; message: string }>(`/addons/${product.slug}/install`);
      if (res?.success) {
        toast.success(res.message || `Add-on "${product.name}" installed successfully!`);
        qc.invalidateQueries({ queryKey: ["commerce-catalog", tenantId] });
        qc.invalidateQueries({ queryKey: ["current-session-user"] });
        qc.invalidateQueries({ queryKey: ["workspace-subscription"] });
        qc.invalidateQueries({ queryKey: ["addon-entitlements"] });
        qc.invalidateQueries({ queryKey: ["tenant-addon-entitlements"] });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to install add-on.");
    } finally {
      setInstallingSlug(null);
    }
  }

  // Authoritative Add-on Disable Action
  async function handleDisableAddon(product: CatalogProduct) {
    if (!tenantId) {
      toast.error("Authenticated workspace context required.");
      return;
    }
    try {
      setActionLoadingSlug(product.slug);
      const res = await api.post<{ success: boolean; message: string }>(`/addons/${product.slug}/disable`);
      if (res?.success) {
        toast.success(res.message || `Add-on "${product.name}" disabled.`);
        await Promise.all([
          qc.invalidateQueries({ queryKey: ["commerce-catalog"] }),
          qc.invalidateQueries({ queryKey: ["addon-entitlements"] }),
          qc.invalidateQueries({ queryKey: ["tenant-addon-entitlements"] }),
          qc.invalidateQueries({ queryKey: ["current-session-user"] }),
        ]);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to disable add-on.");
    } finally {
      setActionLoadingSlug(null);
    }
  }

  // Authoritative Add-on Enable Action
  async function handleEnableAddon(product: CatalogProduct) {
    if (!tenantId) {
      toast.error("Authenticated workspace context required.");
      return;
    }
    try {
      setActionLoadingSlug(product.slug);
      const res = await api.post<{ success: boolean; message: string }>(`/addons/${product.slug}/enable`);
      if (res?.success) {
        toast.success(res.message || `Add-on "${product.name}" enabled.`);
        await Promise.all([
          qc.invalidateQueries({ queryKey: ["commerce-catalog"] }),
          qc.invalidateQueries({ queryKey: ["addon-entitlements"] }),
          qc.invalidateQueries({ queryKey: ["tenant-addon-entitlements"] }),
          qc.invalidateQueries({ queryKey: ["current-session-user"] }),
        ]);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to enable add-on.");
    } finally {
      setActionLoadingSlug(null);
    }
  }

  // 5. Authoritative Paid Add-on Purchase & Checkout Handler
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
        qc.invalidateQueries({ queryKey: ["tenant-addon-entitlements"] });
        qc.invalidateQueries({ queryKey: ["current-session-user"] });
        toast.success(`Add-on "${checkoutProduct.name}" is now active on your workspace!`);
      } else if (finalState === "failed") {
        setCheckoutStep("failed");
        toast.error("Payment or order verification failed.");
      } else {
        setCheckoutStep("pending_settlement");
        qc.invalidateQueries({ queryKey: ["commerce-catalog", tenantId] });
        qc.invalidateQueries({ queryKey: ["tenant-addon-entitlements"] });
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
      qc.invalidateQueries({ queryKey: ["tenant-addon-entitlements"] });
      qc.invalidateQueries({ queryKey: ["current-session-user"] });
      toast.success("Sandbox settlement simulated successfully! Addon is now active.");
    } catch (err: any) {
      toast.error(err.message || "Simulated settlement failed.");
      setCheckoutStep("idle");
    }
  }

  // Authoritative dynamic categories with counts (strictly add-on products)
  const dynamicCategories = useMemo(() => {
    const map = new Map<string, number>();
    addOnProducts.forEach((p) => {
      const rawCat = p.category ? p.category.trim() : "General";
      const cat = rawCat === "Communications" ? "Communication" : rawCat;
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [addOnProducts]);

  // Authoritative Summary Counters (strictly add-on products)
  const summaryCounts = useMemo(() => {
    let installed = 0;
    let disabled = 0;
    let planIncluded = 0;
    let free = 0;
    let paid = 0;
    let available = 0;

    addOnProducts.forEach((p) => {
      const isDis = isProductDisabled(p);
      const isInst = isProductInstalled(p);
      const isInc = isProductPlanIncluded(p);
      const isFr = isProductFree(p);
      if (isDis) {
        disabled++;
      } else if (isInst) {
        installed++;
      } else {
        available++;
      }
      if (isInc) planIncluded++;
      if (isFr) free++;
      else paid++;
    });

    return {
      total: addOnProducts.length,
      installed,
      disabled,
      available,
      planIncluded,
      free,
      paid,
    };
  }, [addOnProducts, profile]);

  // Combined Search & Filters (strictly add-on products)
  const filteredProducts = useMemo(() => {
    return addOnProducts.filter((p) => {
      const matchesSearch =
        !search.trim() ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.category || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.description || "").toLowerCase().includes(search.toLowerCase());

      const rawCat = p.category ? p.category.trim() : "General";
      const cat = rawCat === "Communications" ? "Communication" : rawCat;
      const matchesCategory =
        filterCategory === "all" ||
        cat.toLowerCase() === filterCategory.toLowerCase();

      const installed = isProductInstalled(p);
      const disabled = isProductDisabled(p);
      const enabled = isProductEnabled(p);
      const planIncluded = isProductPlanIncluded(p);
      const free = isProductFree(p);

      let matchesStatus = true;
      if (statusFilter === "installed") {
        matchesStatus = enabled;
      } else if (statusFilter === "disabled") {
        matchesStatus = disabled;
      } else if (statusFilter === "free") {
        matchesStatus = free;
      } else if (statusFilter === "paid") {
        matchesStatus = !free && !planIncluded;
      } else if (statusFilter === "available") {
        matchesStatus = !installed;
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [addOnProducts, search, filterCategory, statusFilter, profile]);

  const hasActiveFilters = search.trim() !== "" || filterCategory !== "all" || statusFilter !== "all";

  function handleResetFilters() {
    setSearch("");
    setFilterCategory("all");
    setStatusFilter("all");
  }

  return (
    <PlanGuard moduleName="Addons Marketplace" requiredPlan="free">
      <TooltipProvider delayDuration={150}>
        <div className="space-y-6 max-w-full pb-12">
          {/* A. SIMPLIFIED PAGE HEADER */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
            <div>
              <BreadcrumbNav />
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                <Store className="size-6 text-primary" /> Add-ons Marketplace
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Discover, install, and manage extensions available to your workspace.
              </p>
            </div>

            {/* Authoritative DB-backed Summary Counters */}
            <div className="flex flex-wrap items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card text-xs font-medium cursor-help shadow-2xs">
                    <span className="size-2 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-muted-foreground">Available:</span>
                    <span className="font-bold text-foreground font-mono">{summaryCounts.available}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Not currently installed; purchase or eligibility may be required.
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card text-xs font-medium cursor-help shadow-2xs">
                    <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-muted-foreground">Installed:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{summaryCounts.installed}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  This add-on is installed in your workspace.
                </TooltipContent>
              </Tooltip>

              {summaryCounts.disabled > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card text-xs font-medium cursor-help shadow-2xs">
                      <span className="size-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-muted-foreground">Disabled:</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">{summaryCounts.disabled}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Installed add-ons currently disabled for this workspace.
                  </TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card text-xs font-medium cursor-help shadow-2xs">
                    <span className="size-2 rounded-full bg-purple-500 shrink-0" />
                    <span className="text-muted-foreground">Included in plan:</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400 font-mono">{summaryCounts.planIncluded}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Included in your current subscription tier.
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* TENANT SUBSCRIPTION PANEL (STRICT BILLING & METADATA SEPARATION) */}
          <div className="rounded-xl border bg-gradient-to-r from-card via-card to-primary/5 p-4 md:p-5 shadow-2xs relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider bg-background/80 border-primary/20 text-primary gap-1">
                    <ShieldCheck className="size-3 text-primary" /> Workspace Subscription Plan
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      workspaceSub?.status === "active"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                    }`}
                  >
                    {workspaceSub?.status || "Active"}
                  </Badge>
                </div>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <h2 className="text-xl font-black text-foreground tracking-tight">
                    {workspaceSub?.planName || "Standard Plan"}
                  </h2>
                  <span className="text-xs text-muted-foreground font-medium">
                    Billing Cycle: <strong className="text-foreground capitalize">{workspaceSub?.billingCycle || "Monthly"}</strong>
                  </span>
                  {workspaceSub?.expiresAt && (
                    <span className="text-xs text-muted-foreground font-medium">
                      Renews / Valid Until: <strong className="text-foreground">{new Date(workspaceSub.expiresAt).toLocaleDateString()}</strong>
                    </span>
                  )}
                  {workspaceSub?.maxEmployees && (
                    <span className="text-xs text-muted-foreground font-medium">
                      Seat Limit: <strong className="text-foreground">{workspaceSub.usage?.employees ?? 0} / {workspaceSub.maxEmployees} employees</strong>
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Your base HRMS plan and seat capacities are billed separately. Individual add-ons below are standalone extensions.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="outline" className="text-xs font-semibold gap-1.5 shadow-2xs bg-background" asChild>
                  <Link to="/subscription">
                    <CreditCard className="size-3.5 text-primary" /> Manage Subscription & Plans
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* MAIN LAYOUT: SIDEBAR + 4-COLUMN CARD GRID */}
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* B. COMPACT CATEGORY SIDEBAR */}
            <aside className="w-full lg:w-64 xl:w-72 shrink-0 space-y-5 rounded-xl border bg-card p-4 shadow-2xs">
              {/* Search Bar */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search add-ons..."
                    className="pl-8 pr-8 text-xs h-9 rounded-lg"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Status Quick-Filters */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Filter by Status
                  </label>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="text-[10px] text-primary hover:underline font-semibold"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  {[
                    { id: "all", label: "All Add-ons", count: summaryCounts.total },
                    { id: "free", label: "Free Add-ons", count: summaryCounts.free },
                    { id: "paid", label: "Pro / Paid Add-ons", count: summaryCounts.paid },
                    { id: "installed", label: "Installed Add-ons", count: summaryCounts.installed },
                    ...(summaryCounts.disabled > 0
                      ? [{ id: "disabled", label: "Disabled Add-ons", count: summaryCounts.disabled }]
                      : []),
                    { id: "available", label: "Available to Purchase", count: summaryCounts.available },
                  ].map((filter) => {
                    const active = statusFilter === filter.id;
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => setStatusFilter(filter.id as StatusQuickFilter)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
                        }`}
                      >
                        <span className="truncate">{filter.label}</span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                            active
                              ? "bg-primary-foreground/20 text-primary-foreground font-bold"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {filter.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Catalog Categories */}
              <div className="space-y-1.5 pt-3 border-t">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Categories
                </label>
                <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => setFilterCategory("all")}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      filterCategory === "all"
                        ? "bg-primary/10 text-primary font-bold border border-primary/20"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
                    }`}
                  >
                    <span>All Categories</span>
                    <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.2 rounded-md">
                      {summaryCounts.total}
                    </span>
                  </button>

                  {dynamicCategories.map(([cat, count]) => {
                    const active = filterCategory.toLowerCase() === cat.toLowerCase();
                    const CatIcon = getCategoryIcon(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFilterCategory(cat)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                          active
                            ? "bg-primary/10 text-primary font-bold border border-primary/20"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <CatIcon className="size-3.5 shrink-0 opacity-70" />
                          <span className="truncate">{cat}</span>
                        </span>
                        <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.2 rounded-md shrink-0 ml-1">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* C. MAIN CONTENT AREA & 4-COLUMN CARD GRID */}
            <main className="flex-1 min-w-0 space-y-4">
              {/* Active Filter Status Bar */}
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <div className="flex items-center gap-2">
                  <span>
                    Showing <strong className="text-foreground">{filteredProducts.length}</strong> of{" "}
                    <strong>{summaryCounts.total}</strong> add-ons
                  </span>
                  {filterCategory !== "all" && (
                    <Badge variant="outline" className="text-[10px] gap-1 font-medium bg-muted/50">
                      Category: {filterCategory}
                      <button type="button" onClick={() => setFilterCategory("all")}>
                        <X className="size-3" />
                      </button>
                    </Badge>
                  )}
                  {statusFilter !== "all" && (
                    <Badge variant="outline" className="text-[10px] gap-1 font-medium bg-muted/50 capitalize">
                      Status: {statusFilter}
                      <button type="button" onClick={() => setStatusFilter("all")}>
                        <X className="size-3" />
                      </button>
                    </Badge>
                  )}
                </div>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetFilters}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>

              {/* Grid Loading or Empty State */}
              {isCatalogLoading ? (
                <div className="py-24 grid place-items-center rounded-xl border bg-card">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="size-8 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">Loading marketplace catalog...</p>
                  </div>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-20 text-center rounded-xl border bg-card p-6 space-y-3">
                  <Store className="size-10 mx-auto text-muted-foreground/40" />
                  <h3 className="text-sm font-bold text-foreground">No add-ons found</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    No extensions match your current filter and search criteria. Try clearing filters or searching for something else.
                  </p>
                  <Button size="sm" variant="outline" onClick={handleResetFilters} className="text-xs">
                    Clear all filters
                  </Button>
                </div>
              ) : (
                /* DESKTOP 4-COLUMN RESPONSIVE GRID */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredProducts.map((product) => {
                    const disabled = isProductDisabled(product);
                    const installed = isProductInstalled(product);
                    const planIncluded = isProductPlanIncluded(product);
                    const isFree = isProductFree(product);
                    const monthlyVal = getProductMonthlyPrice(product);
                    const yearlyVal = getProductYearlyPrice(product);
                    const CatIcon = getCategoryIcon(product.category, product.name, product.icon);
                    const badgeColor = getCategoryBadgeColor(product.category);
                    const hasUploadedImg = isUploadedAssetUrl(product.image) || isUploadedAssetUrl(product.icon);
                    const displayImg = isUploadedAssetUrl(product.image) ? product.image! : isUploadedAssetUrl(product.icon) ? product.icon! : null;

                    return (
                      <Card
                        key={product.id}
                        className={`flex flex-col justify-between overflow-hidden transition-all duration-200 hover:shadow-md border bg-card group ${
                          disabled
                            ? "border-amber-500/40 bg-amber-500/[0.02]"
                            : installed
                            ? "border-emerald-500/40 bg-emerald-500/[0.02]"
                            : "border-border/70"
                        }`}
                      >
                        <div className="p-4 space-y-3 flex-1 flex flex-col">
                          {/* Card Top: Icon & Pricing/Status Badges */}
                          <div className="flex items-start justify-between gap-2">
                            {/* Icon or Uploaded Thumbnail */}
                            <div
                              className={`size-10 rounded-xl ${badgeColor} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}
                            >
                              {hasUploadedImg ? (
                                <img
                                  src={displayImg!}
                                  alt={product.name}
                                  className="size-full object-cover rounded-xl"
                                  loading="lazy"
                                />
                              ) : (
                                <CatIcon className="size-5" />
                              )}
                            </div>

                            {/* Status & Pricing Indicators with Accessible Tooltips */}
                            <div className="flex flex-col items-end gap-1">
                              {disabled ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 gap-1 cursor-help py-0.5"
                                    >
                                      <AlertCircle className="size-2.5" /> Disabled
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    This add-on is currently disabled for this workspace.
                                  </TooltipContent>
                                </Tooltip>
                              ) : installed ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 gap-1 cursor-help py-0.5"
                                    >
                                      <CheckCircle2 className="size-2.5" /> Installed
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    This add-on is installed in your workspace.
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] font-medium text-muted-foreground border-border cursor-help py-0.5"
                                    >
                                      Available
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    Not currently installed; purchase or eligibility may be required.
                                  </TooltipContent>
                                </Tooltip>
                              )}

                              {/* Commercial / Tier Badge */}
                              {planIncluded ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 cursor-help py-0"
                                    >
                                      Plan Included
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    Included in your current subscription.
                                  </TooltipContent>
                                </Tooltip>
                              ) : isFree ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 cursor-help py-0"
                                    >
                                      Free
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    No purchase payment is required for this catalog item.
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 cursor-help py-0"
                                    >
                                      Pro
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    Requires purchase unless your subscription already covers it.
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>

                          {/* Addon Name & Category */}
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                              {product.category || "Extension"}
                            </span>
                            <h3
                              className="font-bold text-sm text-foreground leading-tight line-clamp-1 group-hover:text-primary transition-colors cursor-pointer"
                              onClick={() => setSelectedProductForDetails(product)}
                            >
                              {product.name}
                            </h3>
                          </div>

                          {/* Short Description */}
                          <p
                            className="text-xs text-muted-foreground line-clamp-2 leading-relaxed flex-1 cursor-pointer"
                            onClick={() => setSelectedProductForDetails(product)}
                          >
                            {product.description}
                          </p>

                          {/* Price & Billing Intervals (Both Monthly and Yearly) */}
                          <div className="pt-2.5 border-t border-border/50 flex flex-col gap-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground text-[11px]">Pricing:</span>
                              <span className="font-mono font-bold text-foreground text-xs text-right">
                                {planIncluded ? (
                                  <span className="text-purple-600 dark:text-purple-400">Plan Included</span>
                                ) : isFree || (monthlyVal === 0 && (yearlyVal === null || yearlyVal === 0)) ? (
                                  <span className="text-blue-600 dark:text-blue-400">Free</span>
                                ) : (
                                  <span className="inline-flex items-baseline gap-1.5 flex-wrap justify-end">
                                    <span>
                                      {formatSystemAmount(monthlyVal)}
                                      <span className="text-[10px] font-normal text-muted-foreground">/mo</span>
                                    </span>
                                    {yearlyVal !== null && (
                                      <span className="text-[10px] text-muted-foreground font-normal">
                                        · {formatSystemAmount(yearlyVal)}/yr
                                      </span>
                                    )}
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Card Actions: Details + Primary Action / Enable / Disable */}
                        <div className="p-3 pt-0 flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs px-2.5 font-medium text-muted-foreground hover:text-foreground shrink-0"
                            onClick={() => setSelectedProductForDetails(product)}
                          >
                            Details
                          </Button>

                          <div className="flex-1 min-w-0 flex items-center gap-1">
                            {disabled ? (
                              <Button
                                size="sm"
                                className="w-full h-8 text-xs font-semibold gap-1 bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                                disabled={actionLoadingSlug === product.slug}
                                onClick={() => handleEnableAddon(product)}
                              >
                                {actionLoadingSlug === product.slug ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <Zap className="size-3" />
                                )}
                                Enable
                              </Button>
                            ) : installed ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="flex-1 h-8 text-xs font-semibold gap-1 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25"
                                  asChild
                                >
                                  <Link to={getLaunchUrl(product) as any}>
                                    <ExternalLink className="size-3" /> Open
                                  </Link>
                                </Button>
                                {canDisableProduct(product) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs px-2 font-medium text-muted-foreground hover:text-destructive hover:border-destructive/30 shrink-0"
                                    disabled={actionLoadingSlug === product.slug}
                                    onClick={() => handleDisableAddon(product)}
                                    title="Disable this add-on for your workspace"
                                  >
                                    {actionLoadingSlug === product.slug ? (
                                      <Loader2 className="size-3 animate-spin" />
                                    ) : (
                                      "Disable"
                                    )}
                                  </Button>
                                )}
                              </>
                            ) : isFree || planIncluded ? (
                              <Button
                                size="sm"
                                className="w-full h-8 text-xs font-semibold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                disabled={installingSlug === product.slug}
                                onClick={() => handleInstallFree(product)}
                              >
                                {installingSlug === product.slug ? (
                                  <>
                                    <Loader2 className="size-3 animate-spin" /> Installing...
                                  </>
                                ) : (
                                  <>
                                    <PackageCheck className="size-3" /> Install
                                  </>
                                )}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="w-full h-8 text-xs font-semibold gap-1"
                                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff" }}
                                onClick={() => handleStartCheckout(product)}
                              >
                                <ShoppingBag className="size-3" /> Purchase
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </main>
          </div>

          {/* D. DETAILS MODAL */}
          <Dialog open={!!selectedProductForDetails} onOpenChange={(open) => !open && setSelectedProductForDetails(null)}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
              {selectedProductForDetails && (() => {
                const product = selectedProductForDetails;
                const disabled = isProductDisabled(product);
                const installed = isProductInstalled(product);
                const planIncluded = isProductPlanIncluded(product);
                const isFree = isProductFree(product);
                const monthlyVal = getProductMonthlyPrice(product);
                const yearlyVal = getProductYearlyPrice(product);
                const ModalCatIcon = getCategoryIcon(product.category, product.name, product.icon);
                const modalBadgeColor = getCategoryBadgeColor(product.category);
                const modalHasUploadedImg = isUploadedAssetUrl(product.image) || isUploadedAssetUrl(product.icon);
                const modalDisplayImg = isUploadedAssetUrl(product.image) ? product.image! : isUploadedAssetUrl(product.icon) ? product.icon! : null;

                return (
                  <div className="space-y-4 text-xs">
                    {/* Header Banner */}
                    <div className="p-4 rounded-xl bg-muted/40 border flex items-start gap-4">
                      <div className={`size-14 rounded-2xl ${modalBadgeColor} flex items-center justify-center shrink-0 border`}>
                        {modalHasUploadedImg ? (
                          <img src={modalDisplayImg!} alt={product.name} className="size-full object-cover rounded-2xl" />
                        ) : (
                          <ModalCatIcon className="size-7" />
                        )}
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {product.category || "Extension"}
                          </Badge>
                          {product.version && (
                            <Badge variant="secondary" className="text-[10px] font-mono">
                              {product.version}
                            </Badge>
                          )}
                          {disabled ? (
                            <Badge className="bg-amber-500 text-white font-semibold text-[10px] gap-1">
                              <AlertCircle className="size-3" /> Disabled
                            </Badge>
                          ) : installed ? (
                            <Badge className="bg-emerald-500 text-white font-semibold text-[10px] gap-1">
                              <CheckCircle2 className="size-3" /> Installed
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground font-mono text-[10px]">
                              Available
                            </Badge>
                          )}
                          {planIncluded && (
                            <Badge className="bg-purple-500 text-white font-semibold text-[10px]">
                              Plan Included
                            </Badge>
                          )}
                        </div>
                        <h2 className="text-lg font-black text-foreground">{product.name}</h2>
                        <p className="text-xs text-muted-foreground">
                          {product.developer || "Master ERP Official Extension"}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">About this Add-on</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {product.long_description || product.description}
                      </p>
                    </div>

                    {/* Features List */}
                    {Array.isArray(product.features) && product.features.length > 0 && (
                      <div className="space-y-2 pt-2 border-t">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Key Capabilities</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {product.features.map((feat: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 border">
                              <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                              <span className="font-medium text-foreground text-[11px]">{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pricing Summary */}
                    <div className="p-3 bg-muted/40 rounded-xl flex items-center justify-between border">
                      <div>
                        <span className="text-muted-foreground text-[11px]">Authoritative License Rate:</span>
                        <div className="font-mono font-bold text-base text-primary">
                          {planIncluded ? (
                            "Included with Workspace Plan"
                          ) : isFree || (monthlyVal === 0 && (yearlyVal === null || yearlyVal === 0)) ? (
                            "Free (No Payment Required)"
                          ) : (
                            <div className="space-y-0.5">
                              <div>{formatSystemAmount(monthlyVal)} / month</div>
                              {yearlyVal !== null && (
                                <div className="text-xs text-muted-foreground font-normal">
                                  {formatSystemAmount(yearlyVal)} / year (Annual Billing)
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        {disabled ? (
                          <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/30">
                            Disabled in Workspace
                          </Badge>
                        ) : installed ? (
                          <Badge className="bg-emerald-500 text-white font-bold">
                            Active in Workspace
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground font-mono">
                            Ready to Activate
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Modal Actions */}
                    <DialogFooter className="flex justify-between sm:justify-between items-center w-full pt-3 border-t">
                      <Button size="sm" variant="outline" onClick={() => setSelectedProductForDetails(null)}>
                        Close
                      </Button>
                      <div className="flex gap-2">
                        {disabled ? (
                          <Button
                            size="sm"
                            className="font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                            disabled={actionLoadingSlug === product.slug}
                            onClick={() => {
                              setSelectedProductForDetails(null);
                              handleEnableAddon(product);
                            }}
                          >
                            {actionLoadingSlug === product.slug ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Zap className="size-3.5" />
                            )}
                            Enable Add-on
                          </Button>
                        ) : installed ? (
                          <div className="flex gap-2">
                            {canDisableProduct(product) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="font-semibold text-destructive hover:bg-destructive/10 border-destructive/30"
                                disabled={actionLoadingSlug === product.slug}
                                onClick={() => {
                                  setSelectedProductForDetails(null);
                                  handleDisableAddon(product);
                                }}
                              >
                                {actionLoadingSlug === product.slug ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  "Disable Add-on"
                                )}
                              </Button>
                            )}
                            <Button size="sm" className="font-bold gap-1.5 bg-primary" asChild>
                              <Link to={getLaunchUrl(product) as any}>
                                <ExternalLink className="size-3.5" /> Open Module
                              </Link>
                            </Button>
                          </div>
                        ) : isFree || planIncluded ? (
                          <Button
                            size="sm"
                            className="font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={installingSlug === product.slug}
                            onClick={() => {
                              setSelectedProductForDetails(null);
                              handleInstallFree(product);
                            }}
                          >
                            {installingSlug === product.slug ? (
                              <>
                                <Loader2 className="size-3.5 animate-spin" /> Installing...
                              </>
                            ) : (
                              <>
                                <PackageCheck className="size-3.5" /> Install Free
                              </>
                            )}
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

          {/* E. AUTHORITATIVE CHECKOUT DIALOG */}
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
      </TooltipProvider>
    </PlanGuard>
  );
}

export default MarketplacePage;
