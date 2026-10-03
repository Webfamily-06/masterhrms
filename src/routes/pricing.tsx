import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarketingLayout, PageHero } from "@/components/marketing/marketing-layout";
import {
  Check,
  Sparkles,
  Flame,
  Clock,
  Users,
  ArrowRight,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  FileText,
  Calculator,
  Minus,
  Plus,
  ShieldCheck,
  CreditCard,
  Loader2,
} from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { SubscriptionCheckoutModal } from "@/components/subscription/subscription-checkout-modal";
import { toast } from "sonner";


export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Transparent SaaS Pricing — Master ERP & HRMS" },
      {
        name: "description",
        content: "Predictable, multi-duration pricing for Master ERP & Autonomous HRMS. Monthly and annual plans with original and selling prices in INR.",
      },
    ],
  }),
});

export type BillingDurationKey = "1_month" | "1_year";

export interface CompanyDetails {
  companyName: string;
  supportEmail: string;
  contactNumber: string;
  companyAddress: string;
  taxGstNumber?: string | null;
  currency: string;
  currencySymbol: string;
}

export interface PublicPlanPricing {
  price: number;
  originalPrice?: number | null;
  discountAmount?: number;
  discountPercent?: number;
  hasDiscount?: boolean;
  monthlyEquivalent: number;
}

export interface PublicPlan {
  id: string;
  name: string;
  description: string;
  planType?: "standard" | "custom" | string;
  pricingModel?: "fixed" | "per_user" | string;
  pricePerUser?: number | null;
  pricePerUserOriginal?: number | null;
  billableUsers?: number | null;
  minUsers?: number;
  maxUsers?: number;
  isPopular: boolean;
  isTrial: boolean;
  trialDays: number;
  combinedUserLimit?: number | null;
  features: string[];
  pricing: Record<BillingDurationKey, PublicPlanPricing>;
}

export interface PublicPlansResponse {
  currency: string;
  currencySymbol: string;
  companyDetails?: CompanyDetails;
  plans: PublicPlan[];
}

export function PricingPage() {
  const [selectedDuration, setSelectedDuration] = useState<BillingDurationKey>("1_year");
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  
  // Checkout / Order Summary Modal State
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PublicPlan | null>(null);

  const { user } = useSession();
  const { data: profile } = useCurrentProfile();
  const navigate = useNavigate();

  // Query: Live database-driven plans from GET /api/billing/public-plans
  const {
    data: billingData,
    isLoading,
    isError,
    refetch,
  } = useQuery<PublicPlansResponse>({
    queryKey: ["public-billing-plans"],
    queryFn: async () => {
      const res = await api.get("/billing/public-plans");
      return res;
    },
    staleTime: 5 * 60 * 1000,
  });

  const plans = billingData?.plans || [];
  const company = billingData?.companyDetails;

  const durationOptions: { key: BillingDurationKey; label: string; badge?: string }[] = [
    { key: "1_month", label: "Monthly" },
    { key: "1_year", label: "Annual (1 Year)", badge: "Save ~20%" },
  ];

  const handleUserCountChange = (planId: string, val: number) => {
    // Clamp between 1 and 99,999
    const sanitized = Math.min(99999, Math.max(1, Math.floor(val) || 1));
    setUserCounts((prev) => ({ ...prev, [planId]: sanitized }));
  };

  const handleIncrementUser = (planId: string, current: number, max = 99999) => {
    const nextVal = Math.min(max, current + 1);
    handleUserCountChange(planId, nextVal);
  };

  const handleDecrementUser = (planId: string, current: number) => {
    const nextVal = Math.max(1, current - 1);
    handleUserCountChange(planId, nextVal);
  };

  // Open Checkout Order Summary Modal
  const handleOpenCheckout = (plan: PublicPlan) => {
    setSelectedPlan(plan);
    setCheckoutModalOpen(true);
  };

  return (
    <MarketingLayout>
      <PageHero
        eyebrow="Transparent Cloud Pricing"
        title="Predictable Pricing for Growing Organizations"
        subtitle="Choose between flexible monthly billing or discounted annual subscriptions. All plans include automated payroll, biometric attendance, self-service portals, and enterprise security."
      >
        {/* Customer-Facing Duration Selector: 1 Month and 1 Year */}
        <div className="inline-flex items-center justify-center gap-1.5 p-1.5 rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md shadow-xs max-w-sm mx-auto">
          {durationOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSelectedDuration(opt.key)}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                selectedDuration === opt.key
                  ? "bg-primary text-primary-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{opt.label}</span>
              {opt.badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none ${
                    selectedDuration === opt.key
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {opt.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </PageHero>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {isLoading ? (
            <div className="grid gap-8 grid-cols-1 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[480px] rounded-3xl bg-muted/40 animate-pulse border" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-16 space-y-4">
              <p className="text-muted-foreground">Unable to load active pricing plans at this time.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Try Again
              </Button>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Sparkles className="h-10 w-10 text-primary mx-auto" />
              <h3 className="text-xl font-bold">Custom Pricing Available</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                No public plans are active currently. Please reach out directly to our enterprise solutions team.
              </p>
              <Link to="/contact">
                <Button className="mt-4">Contact Enterprise Sales</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 lg:gap-8 grid-cols-1 md:grid-cols-3 items-start">
              {plans.map((plan) => {
                const isCustom = plan.planType === "custom";
                const isPerUser = plan.pricingModel === "per_user";
                const userCount = userCounts[plan.id] ?? plan.billableUsers ?? 25;
                const userQuota = plan.combinedUserLimit;
                const maxSeatLimit = plan.maxUsers || 99999;

                // Per-user dynamic calculation
                let sellingTotal = 0;
                let originalTotal: number | null = null;
                let hasDiscount = false;
                let discountPercent = 0;
                let monthlyEquivalent = 0;

                if (isPerUser) {
                  const unitSelling = Number(plan.pricePerUser || 0);
                  const unitOriginal = plan.pricePerUserOriginal ? Number(plan.pricePerUserOriginal) : null;
                  const monthsMultiplier = selectedDuration === "1_year" ? 12 : 1;
                  const annualDiscountFactor = selectedDuration === "1_year" ? 0.8 : 1.0;

                  sellingTotal = Math.round(unitSelling * userCount * monthsMultiplier * annualDiscountFactor);
                  originalTotal = unitOriginal ? Math.round(unitOriginal * userCount * monthsMultiplier) : sellingTotal;
                  hasDiscount = Boolean(originalTotal && originalTotal > sellingTotal);
                  discountPercent = hasDiscount && originalTotal ? Math.round(((originalTotal - sellingTotal) / originalTotal) * 100) : 0;
                  monthlyEquivalent = selectedDuration === "1_year" ? Math.round(sellingTotal / 12) : sellingTotal;
                } else {
                  const durPricing = plan.pricing?.[selectedDuration];
                  sellingTotal = durPricing?.price || 0;
                  originalTotal = durPricing?.originalPrice ?? null;
                  hasDiscount = Boolean(durPricing?.hasDiscount);
                  discountPercent = durPricing?.discountPercent || 0;
                  monthlyEquivalent = durPricing?.monthlyEquivalent || 0;
                }

                return (
                  <div
                    key={plan.id}
                    className={`relative p-6 sm:p-7 rounded-2xl flex flex-col transition-all duration-300 ${
                      isCustom
                        ? "bg-gradient-to-b from-card via-card to-purple-500/5 border-2 border-purple-500/50 shadow-lg ring-1 ring-purple-500/20"
                        : plan.isPopular
                        ? "bg-card border-2 border-primary shadow-xl ring-1 ring-primary/20 md:-translate-y-1 z-10"
                        : "bg-card border border-border/80 shadow-xs hover:border-primary/40 hover:shadow-md"
                    }`}
                  >
                    {/* Popular or Custom Badge */}
                    {isCustom ? (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-[11px] uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3" />
                        Custom Plan
                      </div>
                    ) : plan.isPopular ? (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-primary text-primary-foreground font-bold text-[11px] uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                        <Flame className="h-3 w-3 fill-current" />
                        Most Popular
                      </div>
                    ) : null}

                    {/* 1. Header (Category, Trial badge, Name, Description) */}
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[11px] font-bold uppercase tracking-wider font-mono ${isCustom ? "text-purple-600 dark:text-purple-400" : "text-primary"}`}>
                            {isCustom ? "Custom Enterprise" : "Standard Cloud"}
                          </span>
                          {isPerUser && (
                            <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 font-semibold py-0 h-4">
                              Per-User
                            </Badge>
                          )}
                        </div>

                        {plan.isTrial && (
                          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-semibold gap-1 py-0 h-4">
                            <Clock className="h-3 w-3" /> 3-Day Trial
                          </Badge>
                        )}
                      </div>

                      <h3 className="mt-1.5 text-xl sm:text-2xl font-black text-foreground tracking-tight">{plan.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {plan.description}
                      </p>
                    </div>

                    {/* 2. User Capacity / Stepper */}
                    {isPerUser ? (
                      <div className="mt-3.5 p-3 rounded-xl bg-purple-500/10 border border-purple-500/25 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                            <Calculator className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                            User Quantity:
                          </span>
                          <span className="font-mono text-xs font-extrabold text-foreground px-2 py-0.5 rounded-md bg-card border border-purple-500/30">
                            {userCount} Seats
                          </span>
                        </div>

                        {/* Stepper Controls */}
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={userCount <= 1}
                            onClick={() => handleDecrementUser(plan.id, userCount)}
                            className="h-8 w-8 p-0 rounded-lg shrink-0 font-bold border-purple-500/30 hover:bg-purple-500/20"
                            title="Decrease seats (Min: 1)"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>

                          <Input
                            type="number"
                            min="1"
                            max={maxSeatLimit}
                            value={userCount}
                            onChange={(e) => handleUserCountChange(plan.id, Number(e.target.value))}
                            className="h-8 text-center text-xs font-mono font-bold border-purple-500/30 bg-card"
                          />

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={userCount >= maxSeatLimit}
                            onClick={() => handleIncrementUser(plan.id, userCount, maxSeatLimit)}
                            className="h-8 w-8 p-0 rounded-lg shrink-0 font-bold border-purple-500/30 hover:bg-purple-500/20"
                            title="Increase seats (Max: 99,999)"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {/* Presets */}
                        <div className="flex items-center gap-1 flex-wrap pt-0.5">
                          <span className="text-[10px] text-muted-foreground font-semibold mr-0.5">Presets:</span>
                          {[10, 25, 50, 100, 250].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleUserCountChange(plan.id, preset)}
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold transition-colors ${
                                userCount === preset
                                  ? "bg-purple-600 text-white shadow-xs"
                                  : "bg-card text-muted-foreground hover:text-foreground border border-purple-500/20 hover:border-purple-500/40"
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>

                        {/* Rate info */}
                        <div className="pt-1.5 border-t border-purple-500/20 flex justify-between items-center text-[10px] text-purple-950 dark:text-purple-200">
                          <span className="text-muted-foreground">Per-User Rate:</span>
                          <span className="font-mono font-bold">{formatSystemAmount(plan.pricePerUser || 0)} / user / mo</span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3.5 flex items-center justify-between py-2 px-3 rounded-xl bg-muted/40 border border-border/60 text-xs">
                        <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-primary" />
                          Combined User Limit
                        </span>
                        <span className="font-bold text-foreground">
                          {userQuota ? `Up to ${userQuota} Users` : "Unlimited Users"}
                        </span>
                      </div>
                    )}

                    {/* 3. Pricing Block */}
                    <div className="mt-4 pt-3.5 border-t border-border/60">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        {hasDiscount && originalTotal && (
                          <del className="text-sm font-semibold text-muted-foreground line-through font-mono">
                            {formatSystemAmount(originalTotal, { showDecimals: false })}
                          </del>
                        )}
                        <span className="text-3xl font-extrabold font-mono text-foreground tracking-tight">
                          {formatSystemAmount(sellingTotal, { showDecimals: false })}
                        </span>
                        <span className="text-muted-foreground text-xs font-semibold">
                          / {selectedDuration === "1_year" ? "Year" : "Month"}
                        </span>
                        {hasDiscount && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border-emerald-500/20 py-0 h-4 ml-1">
                            Save {discountPercent}%
                          </Badge>
                        )}
                      </div>

                      {selectedDuration === "1_year" && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                          Effective {formatSystemAmount(monthlyEquivalent, { showDecimals: false })} / month
                        </p>
                      )}

                      {isPerUser && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Billed for {userCount} seats ({selectedDuration === "1_year" ? "Annual with ~20% discount" : "Monthly"}).
                        </p>
                      )}
                    </div>

                    {/* 4. Choose Plan CTA Button (Immediately below pricing) */}
                    <div className="mt-4">
                      <Button
                        type="button"
                        onClick={() => handleOpenCheckout(plan)}
                        className={`w-full font-bold h-10 rounded-xl gap-2 transition-all ${
                          isCustom
                            ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20 hover:from-purple-700 hover:to-indigo-700"
                            : plan.isPopular
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90"
                            : "border border-border bg-background hover:bg-muted text-foreground"
                        }`}
                        variant={plan.isPopular || isCustom ? "default" : "outline"}
                      >
                        {plan.isTrial ? "Start 3-Day Free Trial" : "Choose Plan"}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* 5. Features List (Naturally flowing below CTA) */}
                    <div className="mt-4 pt-3.5 border-t border-border/60">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                        Included Features:
                      </p>
                      <ul className="space-y-2 text-xs text-foreground font-medium">
                        {(plan.features || []).map((feat, idx) => (
                          <li key={idx} className="flex gap-2 items-start">
                            <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <span className="leading-tight">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Dynamic Platform Company Details & Compliance Section */}
      <section className="border-t bg-muted/20 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                {company?.companyName || "Master ERP & Autonomous HRMS"}
              </h4>
              <p className="text-xs text-muted-foreground max-w-xl">
                All subscriptions are billed securely in INR (₹) via Razorpay. Prices exclude local statutory taxes where applicable.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              {company?.supportEmail && (
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                  <a href={`mailto:${company.supportEmail}`} className="hover:underline">{company.supportEmail}</a>
                </div>
              )}
              {company?.contactNumber && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-primary" />
                  <span>{company.contactNumber}</span>
                </div>
              )}
              {company?.companyAddress && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  <span>{company.companyAddress}</span>
                </div>
              )}
              {company?.taxGstNumber && (
                <Badge variant="outline" className="text-[10px] font-mono">
                  GSTIN: {company.taxGstNumber}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ENTERPRISE SUBSCRIPTION CHECKOUT MODAL */}
      <SubscriptionCheckoutModal
        open={checkoutModalOpen}
        onOpenChange={setCheckoutModalOpen}
        plan={selectedPlan}
        initialDuration={selectedDuration}
        initialUserCount={selectedPlan ? (userCounts[selectedPlan.id] ?? selectedPlan.billableUsers ?? 25) : 25}
      />
    </MarketingLayout>
  );
}

