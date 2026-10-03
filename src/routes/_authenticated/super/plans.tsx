import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Check,
  RefreshCw,
  Loader2,
  Users,
  Sparkles,
  Flame,
  Clock,
  Building2,
  Shield,
  Layers,
  Calculator,
  AlertCircle,
  Tag,
} from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";

export const Route = createFileRoute("/_authenticated/super/plans")({
  component: SuperAdminPlansPage,
});

export type BillingDurationKey = "1_month" | "1_year";

export interface PlanSubscriber {
  id: string;
  tenantId: string;
  status: string;
  expiresAt: string | null;
  tenant?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface SubscriptionPlanRecord {
  id: string;
  name: string;
  description: string | null;
  status: string;
  planType?: "standard" | "custom" | string;
  pricingModel?: "fixed" | "per_user" | string;
  currency?: string;
  priceMonthly: number;
  priceMonthlyOriginal?: number | null;
  priceQuarterly: number | null;
  priceSemiAnnual: number | null;
  priceAnnual: number;
  priceAnnualOriginal?: number | null;
  pricePerUser?: number | null;
  pricePerUserOriginal?: number | null;
  billableUsers?: number | null;
  minUsers?: number | null;
  maxUsersLimit?: number | null;
  durationPrices: Record<string, number> | null;
  isTrial: boolean;
  trialDays: number;
  maxEmployees: number | null;
  maxUsers: number | null;
  storageLimitGb: number | null;
  features: string[];
  includedAddonIds: string[];
  isPopular: boolean;
  sortOrder: number;
  isPublic: boolean;
  _count?: {
    subscriptions: number;
  };
  subscriptions?: PlanSubscriber[];
}

export type SubscriptionPlan = SubscriptionPlanRecord & {
  price_monthly: number;
  price_annual: number;
  max_employees?: number;
  max_users?: number | null;
  included_addon_ids?: string[];
  popular?: boolean;
};

export function SuperAdminPlansPage() {
  const queryClient = useQueryClient();
  const [selectedDuration, setSelectedDuration] = useState<BillingDurationKey>("1_month");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<SubscriptionPlanRecord> | null>(null);
  const [selectedSubscribersPlan, setSelectedSubscribersPlan] = useState<SubscriptionPlanRecord | null>(null);

  // Form states for Create/Edit
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "active",
    planType: "standard" as "standard" | "custom",
    pricingModel: "fixed" as "fixed" | "per_user",
    currency: "INR",
    priceMonthly: 199,
    priceMonthlyOriginal: 249 as number | null,
    priceQuarterly: 549,
    priceSemiAnnual: 999,
    priceAnnual: 1899,
    priceAnnualOriginal: 2399 as number | null,
    pricePerUser: 100 as number | null,
    pricePerUserOriginal: 125 as number | null,
    billableUsers: 25,
    isTrial: false,
    trialDays: 3,
    combinedUserLimit: 50,
    storageLimitGb: 10,
    featuresText: "",
    isPopular: false,
    sortOrder: 0,
    isPublic: true,
  });

  // Query: Fetch plans from live database via GET /api/super/plans
  const {
    data: plans = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery<SubscriptionPlanRecord[]>({
    queryKey: ["super-admin-subscription-plans"],
    queryFn: async () => {
      const res = await api.get("/super/plans");
      return Array.isArray(res) ? res : res?.plans || [];
    },
  });

  // Mutation: Create or Update Plan
  const savePlanMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingPlan?.id) {
        return await api.put(`/super/plans/${editingPlan.id}`, payload);
      }
      return await api.post("/super/plans", payload);
    },
    onSuccess: () => {
      toast.success(editingPlan?.id ? "Plan updated successfully" : "New plan created successfully");
      setIsPlanModalOpen(false);
      setEditingPlan(null);
      queryClient.invalidateQueries({ queryKey: ["super-admin-subscription-plans"] });
      queryClient.invalidateQueries({ queryKey: ["public-billing-plans"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save subscription plan");
    },
  });

  // Mutation: Delete Plan
  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      return await api.delete(`/super/plans/${planId}`);
    },
    onSuccess: () => {
      toast.success("Plan deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["super-admin-subscription-plans"] });
      queryClient.invalidateQueries({ queryKey: ["public-billing-plans"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete plan");
    },
  });

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData({
      name: "",
      description: "",
      status: "active",
      planType: "standard",
      pricingModel: "fixed",
      currency: "INR",
      priceMonthly: 199,
      priceMonthlyOriginal: 249,
      priceQuarterly: 549,
      priceSemiAnnual: 999,
      priceAnnual: 1899,
      priceAnnualOriginal: 2399,
      pricePerUser: 100,
      pricePerUserOriginal: 125,
      billableUsers: 25,
      isTrial: false,
      trialDays: 3,
      combinedUserLimit: 50,
      storageLimitGb: 10,
      featuresText: "Core HR & Employee Directory\nBiometric Attendance & Leave\nEmployee Self-Service Portal\nStandard Email Support",
      isPopular: false,
      sortOrder: (plans.length || 0) + 1,
      isPublic: true,
    });
    setIsPlanModalOpen(true);
  };

  const openEditModal = (plan: SubscriptionPlanRecord) => {
    setEditingPlan(plan);
    const durationPrices = plan.durationPrices || {};
    const userLimit = plan.maxUsers ?? plan.maxEmployees ?? 50;

    setFormData({
      name: plan.name || "",
      description: plan.description || "",
      status: plan.status || "active",
      planType: (plan.planType === "custom" ? "custom" : "standard") as "standard" | "custom",
      pricingModel: (plan.pricingModel === "per_user" ? "per_user" : "fixed") as "fixed" | "per_user",
      currency: plan.currency || "INR",
      priceMonthly: Number(durationPrices["1_month"] ?? plan.priceMonthly ?? 0),
      priceMonthlyOriginal: plan.priceMonthlyOriginal !== null && plan.priceMonthlyOriginal !== undefined ? Number(plan.priceMonthlyOriginal) : null,
      priceQuarterly: Number(durationPrices["3_months"] ?? plan.priceQuarterly ?? 0),
      priceSemiAnnual: Number(durationPrices["6_months"] ?? plan.priceSemiAnnual ?? 0),
      priceAnnual: Number(durationPrices["1_year"] ?? plan.priceAnnual ?? 0),
      priceAnnualOriginal: plan.priceAnnualOriginal !== null && plan.priceAnnualOriginal !== undefined ? Number(plan.priceAnnualOriginal) : null,
      pricePerUser: plan.pricePerUser !== null && plan.pricePerUser !== undefined ? Number(plan.pricePerUser) : null,
      pricePerUserOriginal: plan.pricePerUserOriginal !== null && plan.pricePerUserOriginal !== undefined ? Number(plan.pricePerUserOriginal) : null,
      billableUsers: plan.billableUsers ? Number(plan.billableUsers) : 25,
      isTrial: Boolean(plan.isTrial),
      trialDays: 3,
      combinedUserLimit: userLimit,
      storageLimitGb: plan.storageLimitGb ?? 10,
      featuresText: Array.isArray(plan.features) ? plan.features.join("\n") : "",
      isPopular: Boolean(plan.isPopular),
      sortOrder: plan.sortOrder ?? 0,
      isPublic: plan.isPublic !== false,
    });
    setIsPlanModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Plan name is required");
      return;
    }

    // Validation for Per-User plan
    if (formData.planType === "custom" && formData.pricingModel === "per_user") {
      const userCount = Number(formData.billableUsers);
      if (!Number.isInteger(userCount) || userCount < 1 || userCount > 99999) {
        toast.error("Billable user count must be an integer between 1 and 99,999.");
        return;
      }
      if (formData.pricePerUser === null || formData.pricePerUser === undefined || formData.pricePerUser < 0) {
        toast.error("Price per user must be a non-negative number.");
        return;
      }
      if (formData.pricePerUserOriginal !== null && formData.pricePerUserOriginal < (formData.pricePerUser || 0)) {
        toast.error("Selling price per user cannot exceed original price per user.");
        return;
      }
    } else {
      // Fixed price plan validation
      if (formData.priceMonthly < 0 || formData.priceAnnual < 0) {
        toast.error("Plan prices must be non-negative.");
        return;
      }
      if (formData.priceMonthlyOriginal !== null && formData.priceMonthlyOriginal < formData.priceMonthly) {
        toast.error("Monthly selling price cannot exceed original price.");
        return;
      }
      if (formData.priceAnnualOriginal !== null && formData.priceAnnualOriginal < formData.priceAnnual) {
        toast.error("Annual selling price cannot exceed original price.");
        return;
      }
    }

    const durationPrices: Record<string, number> = {
      "1_month": Number(formData.priceMonthly) || 0,
      "3_months": Number(formData.priceQuarterly) || 0,
      "6_months": Number(formData.priceSemiAnnual) || 0,
      "1_year": Number(formData.priceAnnual) || 0,
    };

    const features = formData.featuresText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const userLimit = formData.combinedUserLimit ? Number(formData.combinedUserLimit) : null;

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      status: formData.status,
      planType: formData.planType,
      pricingModel: formData.planType === "custom" ? formData.pricingModel : "fixed",
      currency: formData.currency,
      priceMonthly: Number(formData.priceMonthly) || 0,
      priceMonthlyOriginal: formData.priceMonthlyOriginal !== null ? Number(formData.priceMonthlyOriginal) : null,
      priceQuarterly: Number(formData.priceQuarterly) || null,
      priceSemiAnnual: Number(formData.priceSemiAnnual) || null,
      priceAnnual: Number(formData.priceAnnual) || 0,
      priceAnnualOriginal: formData.priceAnnualOriginal !== null ? Number(formData.priceAnnualOriginal) : null,
      pricePerUser: formData.pricePerUser !== null ? Number(formData.pricePerUser) : null,
      pricePerUserOriginal: formData.pricePerUserOriginal !== null ? Number(formData.pricePerUserOriginal) : null,
      billableUsers: Number(formData.billableUsers) || 1,
      durationPrices,
      isTrial: formData.isTrial,
      trialDays: 3, // Exactly 3 days per requirement
      maxUsers: userLimit,
      maxEmployees: userLimit,
      storageLimitGb: formData.storageLimitGb ? Number(formData.storageLimitGb) : null,
      features,
      isPopular: formData.isPopular,
      sortOrder: Number(formData.sortOrder) || 0,
      isPublic: formData.isPublic,
    };

    savePlanMutation.mutate(payload);
  };

  const handleDeletePlan = (plan: SubscriptionPlanRecord) => {
    if ((plan._count?.subscriptions || 0) > 0) {
      toast.error(`Cannot delete "${plan.name}": It has ${plan._count?.subscriptions} active subscriber(s). Please reassign them first.`);
      return;
    }
    if (confirm(`Are you sure you want to permanently delete plan "${plan.name}"?`)) {
      deletePlanMutation.mutate(plan.id);
    }
  };

  // Helper to calculate plan display pricing
  const getPlanPricingDetails = (plan: SubscriptionPlanRecord, duration: BillingDurationKey) => {
    const isPerUser = plan.pricingModel === "per_user";
    if (isPerUser) {
      const userCount = plan.billableUsers || 1;
      const unitSelling = Number(plan.pricePerUser || 0);
      const unitOriginal = plan.pricePerUserOriginal !== null && plan.pricePerUserOriginal !== undefined
        ? Number(plan.pricePerUserOriginal)
        : null;

      const multiplier = duration === "1_year" ? 12 : 1;
      const annualDiscount = duration === "1_year" ? 0.8 : 1.0;
      const totalSelling = Math.round(unitSelling * userCount * multiplier * annualDiscount);
      const totalOriginal = unitOriginal !== null ? Math.round(unitOriginal * userCount * multiplier) : totalSelling;
      const hasDiscount = totalOriginal > totalSelling;
      const discountPercent = hasDiscount && totalOriginal > 0 ? Math.round(((totalOriginal - totalSelling) / totalOriginal) * 100) : 0;

      return {
        isPerUser: true,
        userCount,
        unitSelling,
        unitOriginal,
        totalSelling,
        totalOriginal,
        hasDiscount,
        discountPercent,
      };
    }

    let selling = 0;
    let original: number | null = null;

    if (duration === "1_year") {
      selling = Number(plan.durationPrices?.["1_year"] ?? plan.priceAnnual ?? (plan.priceMonthly ? plan.priceMonthly * 12 : 0));
      original = plan.priceAnnualOriginal !== null && plan.priceAnnualOriginal !== undefined
        ? Number(plan.priceAnnualOriginal)
        : (plan.priceMonthlyOriginal ? Number(plan.priceMonthlyOriginal) * 12 : null);
    } else {
      selling = Number(plan.durationPrices?.["1_month"] ?? plan.priceMonthly ?? 0);
      original = plan.priceMonthlyOriginal !== null && plan.priceMonthlyOriginal !== undefined
        ? Number(plan.priceMonthlyOriginal)
        : null;
    }

    const hasDiscount = original !== null && original > selling;
    const discountPercent = hasDiscount && original ? Math.round(((original - selling) / original) * 100) : 0;

    return {
      isPerUser: false,
      userCount: plan.maxUsers ?? plan.maxEmployees,
      unitSelling: selling,
      unitOriginal: original,
      totalSelling: selling,
      totalOriginal: original ?? selling,
      hasDiscount,
      discountPercent,
    };
  };

  const getDurationLabel = (duration: BillingDurationKey): string => {
    return duration === "1_year" ? "1 Year" : "1 Month";
  };

  const filteredPlans = plans.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.name?.toLowerCase().includes(term) ||
      p.description?.toLowerCase().includes(term) ||
      p.features?.some((f) => f.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Context Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Subscription Plans</h1>
            <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary border-primary/20">
              Live Database
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Configure Standard and Custom SaaS pricing, per-user billing models, 3-day trials, and feature entitlements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            onClick={openCreateModal}
            size="sm"
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Create Plan
          </Button>
        </div>
      </div>

      {/* Duration Selector & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-3 rounded-xl border shadow-xs">
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg w-full sm:w-auto">
          {(["1_month", "1_year"] as BillingDurationKey[]).map((dur) => (
            <button
              key={dur}
              onClick={() => setSelectedDuration(dur)}
              className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                selectedDuration === dur
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {getDurationLabel(dur)}
              {dur === "1_year" && (
                <span className="ml-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  Annual (1 Year)
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search plans or features..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 text-xs h-9"
          />
        </div>
      </div>

      {/* Plans Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-12">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-96 rounded-2xl bg-muted/40 animate-pulse border" />
          ))}
        </div>
      ) : filteredPlans.length === 0 ? (
        <Card className="py-16 text-center border-dashed">
          <CardContent className="space-y-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg">No subscription plans found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {searchTerm ? "No plans match your current search query." : "Get started by creating your first subscription plan."}
            </p>
            <Button onClick={openCreateModal} size="sm" className="mt-2">
              <Plus className="h-4 w-4 mr-1.5" />
              Create First Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => {
            const pricing = getPlanPricingDetails(plan, selectedDuration);
            const activeSubs = plan._count?.subscriptions || plan.subscriptions?.length || 0;
            const userQuota = plan.maxUsers ?? plan.maxEmployees;

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col transition-all duration-300 motion-safe:animate-in motion-safe:fade-in-50 motion-safe:zoom-in-95 hover:shadow-md ${
                  plan.isPopular ? "border-primary shadow-sm ring-1 ring-primary/20" : "border-border"
                } ${plan.status !== "active" ? "opacity-75 bg-muted/20" : ""}`}
              >
                {/* Popular or Trial Ribbon */}
                <div className="absolute -top-3 left-4 right-4 flex justify-between items-center pointer-events-none">
                  {plan.isPopular ? (
                    <Badge className="bg-primary text-primary-foreground font-semibold text-[11px] gap-1 shadow-xs pointer-events-auto">
                      <Flame className="h-3 w-3 fill-current" />
                      Most Popular
                    </Badge>
                  ) : <div />}

                  {plan.isTrial && (
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-semibold text-[11px] gap-1 pointer-events-auto">
                      <Clock className="h-3 w-3" />
                      3-Day Free Trial
                    </Badge>
                  )}
                </div>

                <CardHeader className="pt-6 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <CardTitle className="text-xl font-bold tracking-tight">{plan.name}</CardTitle>
                        {plan.planType === "custom" && (
                          <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20">
                            Custom Plan
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs line-clamp-2 mt-1">
                        {plan.description || "Comprehensive enterprise HRM & ERP capabilities."}
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        variant={plan.status === "active" ? "default" : "secondary"}
                        className={`text-[10px] uppercase font-semibold ${
                          plan.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {plan.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Price display with strikethrough original price if discounted */}
                  <div className="pt-4 border-t mt-3">
                    {pricing.isPerUser ? (
                      <div>
                        <div className="flex items-baseline gap-2">
                          {pricing.hasDiscount && pricing.unitOriginal && (
                            <del className="text-sm font-semibold text-muted-foreground line-through font-mono">
                              {formatSystemAmount(pricing.unitOriginal, { showDecimals: false })}
                            </del>
                          )}
                          <span className="text-3xl font-extrabold tracking-tight text-foreground font-mono">
                            {formatSystemAmount(pricing.unitSelling, { showDecimals: false })}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium">
                            / user / mo
                          </span>
                          {pricing.hasDiscount && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border-emerald-500/20 ml-1">
                              Save {pricing.discountPercent}%
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            Total: <strong className="text-foreground">{formatSystemAmount(pricing.totalSelling, { showDecimals: false })}</strong>
                          </span>
                          <span className="text-[11px]">
                            ({pricing.userCount} users &bull; {getDurationLabel(selectedDuration)})
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-baseline gap-2">
                          {pricing.hasDiscount && pricing.unitOriginal && (
                            <del className="text-base font-semibold text-muted-foreground line-through font-mono">
                              {formatSystemAmount(pricing.unitOriginal, { showDecimals: false })}
                            </del>
                          )}
                          <span className="text-3xl font-extrabold tracking-tight text-foreground font-mono">
                            {formatSystemAmount(pricing.totalSelling, { showDecimals: false })}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium">
                            / {getDurationLabel(selectedDuration)}
                          </span>
                          {pricing.hasDiscount && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border-emerald-500/20 ml-1">
                              Save {pricing.discountPercent}%
                            </Badge>
                          )}
                        </div>

                        {selectedDuration === "1_year" && (
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                            Effective {formatSystemAmount(pricing.totalSelling / 12, { showDecimals: false })} / month
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-4 pb-4">
                  {/* Combined User Limit or Per-User Quota */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/40 text-xs">
                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      {pricing.isPerUser ? "Billable User Basis" : "Combined User Limit"}
                    </span>
                    <span className="font-bold text-foreground">
                      {pricing.isPerUser
                        ? `${pricing.userCount} Configured Users (Up to 99,999)`
                        : userQuota
                        ? `Up to ${userQuota} Users`
                        : "Unlimited Users"}
                    </span>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Features & Entitlements</p>
                    <ul className="space-y-1.5 text-xs">
                      {(plan.features || []).slice(0, 6).map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                          <span className="text-foreground/90">{feat}</span>
                        </li>
                      ))}
                      {(plan.features || []).length > 6 && (
                        <li className="text-[11px] text-muted-foreground pl-5.5 font-medium">
                          +{(plan.features || []).length - 6} more capabilities
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Active Subscribers Pill */}
                  <div className="pt-2 border-t">
                    <button
                      onClick={() => setSelectedSubscribersPlan(plan)}
                      className="w-full flex items-center justify-between text-xs p-2 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground group"
                    >
                      <span className="flex items-center gap-1.5 font-medium">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        {activeSubs} {activeSubs === 1 ? "Subscriber" : "Subscribers"}
                      </span>
                      <span className="text-[11px] text-primary group-hover:underline">View tenants &rarr;</span>
                    </button>
                  </div>
                </CardContent>

                <CardFooter className="pt-3 border-t bg-muted/10 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(plan)}
                    className="flex-1 gap-1.5 text-xs h-8"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit Plan
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePlan(plan)}
                    className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    title="Delete Plan"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT PLAN DIALOG */}
      <Dialog open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan?.id ? "Edit Subscription Plan" : "Create New Subscription Plan"}</DialogTitle>
            <DialogDescription>
              Configure duration-specific pricing, original vs selling prices, custom per-user models, and 3-day trial settings.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            {/* PLAN TYPE SELECTOR */}
            <div className="p-3.5 rounded-lg border bg-muted/20 space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-foreground">Plan Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, planType: "standard", pricingModel: "fixed" })}
                  className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                    formData.planType === "standard"
                      ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <span className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    Standard Plan
                  </span>
                  <span className="text-[11px] text-muted-foreground">Fixed pricing tiers for standard organizations</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, planType: "custom" })}
                  className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                    formData.planType === "custom"
                      ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <span className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                    <Calculator className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                    Custom Plan
                  </span>
                  <span className="text-[11px] text-muted-foreground">Flexible fixed or per-user dynamic pricing model</span>
                </button>
              </div>

              {/* PRICING MODEL SELECTOR (When Custom Plan is selected) */}
              {formData.planType === "custom" && (
                <div className="pt-2 border-t mt-2 space-y-1.5">
                  <Label className="text-xs font-semibold">Custom Pricing Model</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer ${
                      formData.pricingModel === "fixed" ? "bg-primary/5 border-primary font-semibold" : "bg-card"
                    }`}>
                      <input
                        type="radio"
                        name="pricingModel"
                        value="fixed"
                        checked={formData.pricingModel === "fixed"}
                        onChange={() => setFormData({ ...formData, pricingModel: "fixed" })}
                        className="text-primary"
                      />
                      Fixed Price
                    </label>

                    <label className={`flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer ${
                      formData.pricingModel === "per_user" ? "bg-primary/5 border-primary font-semibold" : "bg-card"
                    }`}>
                      <input
                        type="radio"
                        name="pricingModel"
                        value="per_user"
                        checked={formData.pricingModel === "per_user"}
                        onChange={() => setFormData({ ...formData, pricingModel: "per_user" })}
                        className="text-primary"
                      />
                      Per-User Price
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="plan-name">Plan Name *</Label>
                <Input
                  id="plan-name"
                  required
                  placeholder="e.g. Enterprise Sovereign"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="plan-status">Status</Label>
                <select
                  id="plan-status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plan-desc">Short Description</Label>
              <Input
                id="plan-desc"
                placeholder="High-level target audience or value proposition..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* CONDITIONAL PRICING CONFIGURATION: PER-USER VS FIXED */}
            {formData.planType === "custom" && formData.pricingModel === "per_user" ? (
              <div className="p-3.5 rounded-lg border bg-purple-500/5 border-purple-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300">
                      Per-User Pricing Model (INR ₹)
                    </h4>
                    <p className="text-[11px] text-muted-foreground">Charge based on the number of configured billable seats.</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono border-purple-500/30 text-purple-700 dark:text-purple-300">
                    Per-User Engine
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Price Per User (Selling) *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      required
                      placeholder="100"
                      value={formData.pricePerUser ?? ""}
                      onChange={(e) => setFormData({ ...formData, pricePerUser: Number(e.target.value) || 0 })}
                      className="h-9 text-sm font-mono font-semibold"
                    />
                    <p className="text-[10px] text-muted-foreground">Charged to customer</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Original Price Per User</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="125"
                      value={formData.pricePerUserOriginal ?? ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        pricePerUserOriginal: e.target.value === "" ? null : Number(e.target.value),
                      })}
                      className="h-9 text-sm font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">List price for strikethrough</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Number of Users *</Label>
                    <Input
                      type="number"
                      min="1"
                      max="99999"
                      step="1"
                      required
                      value={formData.billableUsers}
                      onChange={(e) => setFormData({ ...formData, billableUsers: Number(e.target.value) })}
                      className="h-9 text-sm font-mono font-semibold"
                    />
                    <p className="text-[10px] text-muted-foreground">Range: 1 to 99,999</p>
                  </div>
                </div>

                {/* Validation Warnings for Per-User */}
                {(formData.billableUsers < 1 || formData.billableUsers > 99999 || !Number.isInteger(Number(formData.billableUsers))) && (
                  <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 text-destructive text-xs font-medium">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    User count must be a whole integer between 1 and 99,999.
                  </div>
                )}

                {formData.pricePerUserOriginal !== null && (formData.pricePerUserOriginal || 0) < (formData.pricePerUser || 0) && (
                  <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Selling price per user cannot be greater than original price per user.
                  </div>
                )}

                {/* Live Calculated Dynamic Preview */}
                <div className="p-2.5 rounded-md bg-background border flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Calculator className="h-3.5 w-3.5 text-purple-600" />
                    Calculated Monthly Total:
                  </span>
                  <div className="text-right">
                    <span className="font-extrabold text-foreground font-mono text-sm">
                      {formatSystemAmount((formData.pricePerUser || 0) * (formData.billableUsers || 1))}
                    </span>
                    <span className="text-[11px] text-muted-foreground ml-1.5">
                      ({formatSystemAmount(formData.pricePerUser || 0)} &times; {formData.billableUsers || 1} users)
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* STANDARD & FIXED PRICING SECTION: 1 Month & 1 Year (Selling & Original) */
              <div className="p-3.5 rounded-lg border bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Duration Pricing (INR ₹)</h4>
                    <p className="text-[11px] text-muted-foreground">Original vs Selling prices for 1 Month and 1 Year billing cycles.</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">Currency: INR (₹)</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 1 Month Pricing */}
                  <div className="p-2.5 rounded-md bg-background border space-y-2">
                    <span className="text-xs font-bold text-primary flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      1 Month Billing
                    </span>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Selling Price (₹) *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={formData.priceMonthly}
                        onChange={(e) => setFormData({ ...formData, priceMonthly: Number(e.target.value) })}
                        className="h-8 text-xs font-mono font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Original Price (₹)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Leave blank if no discount"
                        value={formData.priceMonthlyOriginal ?? ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          priceMonthlyOriginal: e.target.value === "" ? null : Number(e.target.value),
                        })}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    {formData.priceMonthlyOriginal !== null && formData.priceMonthlyOriginal > formData.priceMonthly && (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        Discount: {formatSystemAmount(formData.priceMonthlyOriginal - formData.priceMonthly)} (
                        {Math.round(((formData.priceMonthlyOriginal - formData.priceMonthly) / formData.priceMonthlyOriginal) * 100)}% off)
                      </p>
                    )}
                    {formData.priceMonthlyOriginal !== null && formData.priceMonthlyOriginal < formData.priceMonthly && (
                      <p className="text-[10px] text-destructive font-medium">
                        Selling price cannot exceed original price.
                      </p>
                    )}
                  </div>

                  {/* 1 Year Pricing */}
                  <div className="p-2.5 rounded-md bg-background border space-y-2">
                    <span className="text-xs font-bold text-primary flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      1 Year Billing
                    </span>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Selling Price (₹) *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={formData.priceAnnual}
                        onChange={(e) => setFormData({ ...formData, priceAnnual: Number(e.target.value) })}
                        className="h-8 text-xs font-mono font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Original Price (₹)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Leave blank if no discount"
                        value={formData.priceAnnualOriginal ?? ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          priceAnnualOriginal: e.target.value === "" ? null : Number(e.target.value),
                        })}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    {formData.priceAnnualOriginal !== null && formData.priceAnnualOriginal > formData.priceAnnual && (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        Discount: {formatSystemAmount(formData.priceAnnualOriginal - formData.priceAnnual)} (
                        {Math.round(((formData.priceAnnualOriginal - formData.priceAnnual) / formData.priceAnnualOriginal) * 100)}% off)
                      </p>
                    )}
                    {formData.priceAnnualOriginal !== null && formData.priceAnnualOriginal < formData.priceAnnual && (
                      <p className="text-[10px] text-destructive font-medium">
                        Selling price cannot exceed original price.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* COMBINED USER LIMIT */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="combined-users" className="text-xs font-semibold">Combined User Limit (Admins + Employees)</Label>
                <span className="text-[11px] text-muted-foreground">Leave empty or 0 for unlimited</span>
              </div>
              <Input
                id="combined-users"
                type="number"
                placeholder="e.g. 50"
                value={formData.combinedUserLimit || ""}
                onChange={(e) => setFormData({ ...formData, combinedUserLimit: Number(e.target.value) || 0 })}
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Authoritative combined quota enforced across tenant admins, HR managers, and employees.
              </p>
            </div>

            {/* INTERNAL ENTITLEMENT QUOTAS (Hidden from public card) */}
            <div className="p-3 rounded-lg border border-border/60 bg-muted/10 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                Internal Entitlement Quota (Hidden from Public Cards)
              </div>
              <div className="space-y-1">
                <Label htmlFor="storage-limit" className="text-xs">Storage Quota (GB)</Label>
                <Input
                  id="storage-limit"
                  type="number"
                  placeholder="e.g. 10"
                  value={formData.storageLimitGb || ""}
                  onChange={(e) => setFormData({ ...formData, storageLimitGb: Number(e.target.value) || 0 })}
                  className="h-8 text-xs max-w-xs"
                />
              </div>
            </div>

            {/* 3-DAY FREE TRIAL CONFIGURATION */}
            <div className="p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">3-Day Free Trial Eligibility</Label>
                  <p className="text-[11px] text-muted-foreground">Allow new tenants to activate an exact 3-day evaluation on this plan</p>
                </div>
                <Switch
                  checked={formData.isTrial}
                  onCheckedChange={(checked) => setFormData({ ...formData, isTrial: checked })}
                />
              </div>

              {formData.isTrial && (
                <div className="pt-2 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Fixed trial duration: <strong>3 Days</strong> from tenant activation timestamp.</span>
                </div>
              )}
            </div>

            {/* FEATURES LIST */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="plan-features">Features & Entitlements (One per line)</Label>
                <span className="text-[11px] text-muted-foreground">Rendered as feature entitlements</span>
              </div>
              <Textarea
                id="plan-features"
                rows={4}
                placeholder="Core HR & Employee Directory&#10;Biometric Attendance & Leave&#10;Employee Self-Service Portal"
                value={formData.featuresText}
                onChange={(e) => setFormData({ ...formData, featuresText: e.target.value })}
                className="text-xs font-mono"
              />
            </div>

            {/* TOGGLES: Popular, Public, Sort Order */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t">
              <div className="flex items-center justify-between p-2 rounded-md border">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium">Most Popular</p>
                  <p className="text-[10px] text-muted-foreground">Highlight with badge</p>
                </div>
                <Switch
                  checked={formData.isPopular}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPopular: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-md border">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium">Public in CMS</p>
                  <p className="text-[10px] text-muted-foreground">Show on /pricing</p>
                </div>
                <Switch
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-md border">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium">Sort Order</p>
                  <p className="text-[10px] text-muted-foreground">Display sequence</p>
                </div>
                <Input
                  type="number"
                  min="0"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) || 0 })}
                  className="h-8 w-16 text-xs text-right"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPlanModalOpen(false)}
                disabled={savePlanMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savePlanMutation.isPending}
                className="gap-2"
              >
                {savePlanMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingPlan?.id ? "Update Plan" : "Create Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* SUBSCRIBERS INSPECTOR DIALOG */}
      <Dialog
        open={Boolean(selectedSubscribersPlan)}
        onOpenChange={(open) => !open && setSelectedSubscribersPlan(null)}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Subscribers: {selectedSubscribersPlan?.name}
            </DialogTitle>
            <DialogDescription>
              Active and past tenant workspaces subscribed to this plan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {!selectedSubscribersPlan?.subscriptions || selectedSubscribersPlan.subscriptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No active tenant subscriptions found for this plan.
              </div>
            ) : (
              <div className="border rounded-md divide-y max-h-72 overflow-y-auto">
                {selectedSubscribersPlan.subscriptions.map((sub) => (
                  <div key={sub.id} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-foreground">{sub.tenant?.name || "Workspace"}</p>
                      <p className="text-[11px] text-muted-foreground">Slug: {sub.tenant?.slug || sub.tenantId}</p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          sub.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {sub.status}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground">
                        {sub.expiresAt ? `Expires: ${new Date(sub.expiresAt).toLocaleDateString()}` : "Ongoing"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSubscribersPlan(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
