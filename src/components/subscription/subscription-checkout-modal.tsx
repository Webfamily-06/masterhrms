import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { api, setToken } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { formatSystemAmount } from "@/lib/currency";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Tag,
  Building,
  Lock,
  Mail,
  User,
  X,
  CreditCard,
  FileText,
} from "lucide-react";

export interface PublicPlanPricing {
  price: number;
  originalPrice?: number | null;
  discountAmount?: number;
  discountPercentage?: number;
  discountPercent?: number;
  hasDiscount?: boolean;
  monthlyEquivalent?: number;
}

export interface PublicPlan {
  id: string;
  name: string;
  description: string | null;
  planType?: "standard" | "custom" | string;
  pricingModel?: "fixed" | "per_user" | string;
  priceMonthly?: number;
  priceMonthlyOriginal?: number | null;
  priceAnnual?: number;
  priceAnnualOriginal?: number | null;
  pricePerUser?: number | null;
  pricePerUserOriginal?: number | null;
  minUsers?: number | null;
  maxUsers?: number | null;
  maxUsersLimit?: number | null;
  billableUsers?: number | null;
  isPopular?: boolean;
  isTrial?: boolean;
  trialDays?: number;
  combinedUserLimit?: number | null;
  features: string[];
  pricing?: Record<string, PublicPlanPricing>;
}

export interface SubscriptionCheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PublicPlan | null;
  initialDuration?: "1_month" | "1_year";
  initialUserCount?: number;
  onSuccess?: (info: { status: string; invoiceNo?: string; planName: string }) => void;
}

export function SubscriptionCheckoutModal({
  open,
  onOpenChange,
  plan,
  initialDuration = "1_month",
  initialUserCount,
  onSuccess,
}: SubscriptionCheckoutModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useSession();
  const { data: profile } = useCurrentProfile(user);

  // Flow step: 1 = Register / Login (only if not authenticated), 2 = Review & Payment, 3 = Success
  const [step, setStep] = useState<1 | 2>(1);
  const [authMode, setAuthMode] = useState<"register" | "login">("register");

  // Registration / Login Form State
  const [fullName, setFullName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Billing & Plan Configuration
  const [duration, setDuration] = useState<"1_month" | "1_year">(initialDuration);
  const [userCount, setUserCount] = useState<number>(() => {
    return initialUserCount || plan?.billableUsers || 25;
  });

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    finalAmount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Checkout submission state
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{
    invoiceNo?: string;
    status: string;
    expiresAt?: string;
  } | null>(null);

  // Sync initial duration and plan defaults when modal opens or plan changes
  useEffect(() => {
    if (open) {
      setDuration(initialDuration);
      if (plan) {
        setUserCount(initialUserCount || plan.billableUsers || 25);
      }
      setCouponCode("");
      setAppliedCoupon(null);
      setCouponError(null);
      setSuccessInfo(null);
      setAuthError(null);
      // If user is already authenticated, jump straight to review & payment
      if (user) {
        setStep(2);
      } else {
        setStep(1);
      }
    }
  }, [open, plan, initialDuration, initialUserCount, user]);

  // Determine if current user is an authorized tenant admin
  const isTenantAdmin = useMemo(() => {
    if (!profile) return false;
    const roles: string[] = profile.roles || [];
    return roles.some((r: string) => ["hr_admin", "admin", "super_admin", "owner"].includes(r));
  }, [profile]);

  // Calculate pricing breakdown
  const pricingCalculation = useMemo(() => {
    if (!plan) return { originalTotal: 0, sellingSubtotal: 0, finalPayable: 0, durationSavings: 0 };

    const isPerUser = plan.pricingModel === "per_user";
    const count = isPerUser ? Math.max(1, Math.min(99999, Math.floor(userCount || 1))) : 1;
    const months = duration === "1_year" ? 12 : 1;

    let originalTotal = 0;
    let sellingSubtotal = 0;

    if (isPerUser) {
      const rateSelling = plan.pricePerUser || 0;
      const rateOriginal = plan.pricePerUserOriginal || rateSelling;
      const annualFactor = duration === "1_year" ? 0.8 : 1.0;

      originalTotal = Math.round(rateOriginal * count * months);
      sellingSubtotal = Math.round(rateSelling * count * months * annualFactor);
    } else {
      if (duration === "1_year") {
        originalTotal = plan.pricing?.["1_year"]?.originalPrice || ((plan.priceMonthlyOriginal || plan.priceMonthly || 0) * 12);
        sellingSubtotal = plan.pricing?.["1_year"]?.price || plan.priceAnnual || 0;
      } else {
        originalTotal = plan.pricing?.["1_month"]?.originalPrice || plan.priceMonthlyOriginal || plan.priceMonthly || 0;
        sellingSubtotal = plan.pricing?.["1_month"]?.price || plan.priceMonthly || 0;
      }
    }

    const durationSavings = Math.max(0, originalTotal - sellingSubtotal);
    const couponDiscount = appliedCoupon?.discountAmount || 0;
    const finalPayable = Math.max(0, sellingSubtotal - couponDiscount);

    return {
      originalTotal,
      sellingSubtotal,
      durationSavings,
      couponDiscount,
      finalPayable: plan.isTrial ? 0 : finalPayable,
    };
  }, [plan, duration, userCount, appliedCoupon]);

  // Handle seat quantity change
  const handleQuantityChange = (newCount: number) => {
    const valid = Math.max(1, Math.min(99999, Math.floor(newCount)));
    setUserCount(valid);
    // Invalidate applied coupon if user count changed
    if (appliedCoupon) {
      setAppliedCoupon(null);
      toast.info("Pricing recalculated for updated seat count. Please re-apply coupon.");
    }
  };

  // Handle Coupon Application
  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !plan) return;
    setIsValidatingCoupon(true);
    setCouponError(null);

    try {
      const res = await api.post("/billing/calculate", {
        planId: plan.id,
        duration,
        userCount: plan.pricingModel === "per_user" ? userCount : undefined,
        couponCode: couponCode.trim(),
        tenantId: profile?.tenant_id || undefined,
      });

      if (res.coupon && res.coupon.valid) {
        setAppliedCoupon({
          code: couponCode.trim().toUpperCase(),
          discountAmount: res.couponDiscount || 0,
          finalAmount: res.finalAmount,
        });
        toast.success(`Coupon ${couponCode.toUpperCase()} applied successfully!`);
      } else {
        const errorMsg = res.coupon?.error || "This coupon code is invalid or expired.";
        setCouponError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err: any) {
      const msg = err.message || "Failed to validate coupon code.";
      setCouponError(msg);
      toast.error(msg);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
    toast.info("Coupon removed.");
  };

  // Handle In-Modal Registration / Login
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSubmittingAuth(true);

    try {
      if (authMode === "register") {
        if (!fullName.trim() || !workEmail.trim() || !password.trim()) {
          throw new Error("Please complete all required fields.");
        }
        if (password.length < 8) {
          throw new Error("Password must be at least 8 characters.");
        }

        const res = await api.post("/auth/register", {
          fullName: fullName.trim(),
          email: workEmail.trim(),
          password,
          companyName: companyName.trim() || `${fullName.trim()}'s Organization`,
        });

        if (res.token) {
          setToken(res.token);
          await queryClient.invalidateQueries({ queryKey: ["current-session-user"] });
          toast.success("Account & workspace created successfully!");
          setStep(2);
        } else {
          throw new Error("Registration succeeded but no authorization token was returned.");
        }
      } else {
        // Login mode
        if (!workEmail.trim() || !password.trim()) {
          throw new Error("Please enter your email and password.");
        }

        const res = await api.post("/auth/login", {
          email: workEmail.trim(),
          password,
        });

        if (res.token) {
          setToken(res.token);
          await queryClient.invalidateQueries({ queryKey: ["current-session-user"] });
          toast.success("Signed in successfully!");
          setStep(2);
        } else {
          throw new Error("Login succeeded but no authorization token was returned.");
        }
      }
    } catch (err: any) {
      const msg = err.message || "Authentication failed. Please check your credentials.";
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Handle Payment / Checkout Execution
  const handleExecutePayment = async () => {
    if (!plan) return;

    if (!user) {
      setStep(1);
      return;
    }

    if (!isTenantAdmin) {
      toast.error("Unauthorized: Only workspace administrators can purchase or modify subscriptions.");
      return;
    }

    setIsProcessingPayment(true);

    try {
      // 1. Handle Free Trial Activation
      if (plan.isTrial) {
        const trialRes = await api.post("/billing/trial-activate", {
          planId: plan.id,
        });

        setSuccessInfo({
          status: "trialing",
          expiresAt: trialRes.subscription?.trialEndsAt,
        });

        await queryClient.invalidateQueries({ queryKey: ["billing-plans"] });
        await queryClient.invalidateQueries({ queryKey: ["current-session-user"] });
        toast.success("3-Day Full Access Trial Activated!");
        onSuccess?.({
          status: "trialing",
          planName: plan.name,
        });
        return;
      }

      // 2. Paid Plan: Create authoritative invoice on backend
      const planRes = await api.post("/billing/change-plan", {
        planId: plan.id,
        duration,
        couponCode: appliedCoupon?.code,
        userCount: plan.pricingModel === "per_user" ? userCount : undefined,
        paymentMethod: "razorpay",
      });

      const invoice = planRes.invoice;
      if (!invoice) throw new Error("Backend failed to generate subscription invoice.");

      // If final amount is 0 (100% coupon discount)
      if (!planRes.requiresPayment || Number(invoice.amount) === 0) {
        setSuccessInfo({
          invoiceNo: invoice.invoiceNo,
          status: "active",
          expiresAt: invoice.periodEnd,
        });
        await queryClient.invalidateQueries({ queryKey: ["billing-plans"] });
        await queryClient.invalidateQueries({ queryKey: ["current-session-user"] });
        toast.success(`Subscription activated! Invoice #${invoice.invoiceNo}`);
        onSuccess?.({
          status: "active",
          invoiceNo: invoice.invoiceNo,
          planName: plan.name,
        });
        return;
      }

      // 3. Create Gateway Order via Razorpay
      const checkoutRes = await api.post("/billing/checkout", {
        invoiceId: invoice.id,
      });

      // 4. Open Razorpay Checkout Window
      const rzpResponse = await openRazorpayCheckout({
        amount: checkoutRes.amount,
        name: plan.name,
        description: `Master HRMS: ${invoice.invoiceNo}`,
        userName: profile?.full_name || user.email.split("@")[0],
        userEmail: user.email,
        tenantId: profile?.tenant_id || undefined,
        keyId: checkoutRes.keyId,
        orderId: checkoutRes.orderId,
      });

      // 5. Server-side Payment Verification
      const verifyRes = await api.post("/billing/verify", {
        invoiceId: invoice.id,
        razorpay_order_id: rzpResponse.razorpay_order_id,
        razorpay_payment_id: rzpResponse.razorpay_payment_id,
        razorpay_signature: rzpResponse.razorpay_signature,
      });

      setSuccessInfo({
        invoiceNo: verifyRes.invoiceNo || invoice.invoiceNo,
        status: "active",
        expiresAt: verifyRes.expiresAt,
      });

      await queryClient.invalidateQueries({ queryKey: ["billing-plans"] });
      await queryClient.invalidateQueries({ queryKey: ["current-session-user"] });
      toast.success(`Payment verified! Subscription active. Invoice #${verifyRes.invoiceNo}`);
      onSuccess?.({
        status: "active",
        invoiceNo: verifyRes.invoiceNo,
        planName: plan.name,
      });
    } catch (err: any) {
      console.error("[CheckoutModal] Payment failure:", err);
      const msg = err.message || "Payment process could not be completed.";
      toast.error(msg);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border border-border shadow-2xl rounded-2xl bg-background">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                Complete Your Subscription
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Enterprise billing and instant workspace activation in INR.
              </DialogDescription>
            </div>
            {!user && !successInfo && (
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full border border-border">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${step === 1 ? "bg-primary text-primary-foreground" : "bg-muted-foreground/30 text-foreground"}`}>
                  1
                </span>
                <span>Account</span>
                <span className="text-muted-foreground/40">→</span>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${step === 2 ? "bg-primary text-primary-foreground" : "bg-muted-foreground/30 text-foreground"}`}>
                  2
                </span>
                <span>Payment</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto space-y-6">
          {/* SUCCESS SCREEN */}
          {successInfo ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold tracking-tight text-foreground">
                  {successInfo.status === "trialing" ? "Trial Activated Successfully" : "Subscription Confirmed!"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {successInfo.status === "trialing"
                    ? "Your 3-day full access enterprise trial is now active. All modules and features are unlocked."
                    : `Your payment was verified and Invoice #${successInfo.invoiceNo} has been generated.`}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/30 border border-border text-xs max-w-sm mx-auto text-left space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Workspace Plan:</span>
                  <span className="font-semibold text-foreground">{plan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                    Active
                  </Badge>
                </div>
                {successInfo.invoiceNo && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoice Reference:</span>
                    <span className="font-mono font-semibold">{successInfo.invoiceNo}</span>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-center gap-3">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                <Button
                  className="gap-2 font-medium"
                  onClick={() => {
                    onOpenChange(false);
                    navigate({ to: "/subscription" as never });
                  }}
                >
                  Manage Workspace Subscription <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : step === 1 && !user ? (
            /* STEP 1: VISITOR REGISTRATION / LOGIN */
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div>
                  <h4 className="font-semibold text-sm text-foreground">
                    {authMode === "register" ? "Create Your Workspace Account" : "Sign In to Your Workspace"}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {authMode === "register"
                      ? "Enter your details to provision your enterprise organization."
                      : "Access your existing account to assign this subscription."}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  className="text-xs text-primary font-medium hover:underline"
                  onClick={() => {
                    setAuthMode(authMode === "register" ? "login" : "register");
                    setAuthError(null);
                  }}
                >
                  {authMode === "register" ? "Have an account? Sign in" : "Need an account? Sign up"}
                </Button>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authMode === "register" && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-foreground">Full Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="e.g. Rahul Sharma"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="pl-9 text-xs h-9"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-foreground">Organization / Company Name *</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="e.g. Acme Technologies Pvt Ltd"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="pl-9 text-xs h-9"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">Work Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="name@company.com"
                      value={workEmail}
                      onChange={(e) => setWorkEmail(e.target.value)}
                      className="pl-9 text-xs h-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Minimum 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 text-xs h-9"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isSubmittingAuth} className="gap-2 font-medium">
                    {isSubmittingAuth ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Provisioning...
                      </>
                    ) : (
                      <>
                        {authMode === "register" ? "Create Workspace & Continue" : "Sign In & Continue"}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            /* STEP 2: PLAN REVIEW & PAYMENT */
            <div className="space-y-5">
              {/* Authenticated Context Banner */}
              {user && (
                <div className="p-3 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                      <Building className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {profile?.tenant?.name || "Workspace Account"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Admin: {profile?.email || user.email}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-medium">
                    {isTenantAdmin ? "Tenant Admin" : "Employee"}
                  </Badge>
                </div>
              )}

              {/* Permission Warning if not Tenant Admin */}
              {user && !isTenantAdmin && (
                <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold">Administrator Privileges Required</p>
                    <p className="text-[11px] leading-relaxed">
                      Your current account has the role of an employee. Only tenant administrators can purchase or change subscription plans. Please contact your workspace administrator to complete this purchase.
                    </p>
                  </div>
                </div>
              )}

              {/* Selected Plan Summary Card */}
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base text-foreground">{plan.name}</h4>
                      <Badge variant="secondary" className="text-[10px] uppercase font-mono tracking-wide">
                        {plan.planType === "custom" ? "Custom SaaS" : "Standard"}
                      </Badge>
                      {plan.isTrial && (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                          3-Day Free Trial
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {plan.description || "Enterprise multi-module SaaS plan with complete autonomous capabilities."}
                    </p>
                  </div>

                  {/* Duration Selector Tabs */}
                  <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border text-xs">
                    <button
                      type="button"
                      onClick={() => setDuration("1_month")}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                        duration === "1_month"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuration("1_year")}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                        duration === "1_year"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>Annual</span>
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">(-20%)</span>
                    </button>
                  </div>
                </div>

                {/* Per-User Plan Seat Stepper */}
                {plan.pricingModel === "per_user" && (
                  <div className="pt-3 border-t border-border/70 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-primary" />
                          Billable User Seats
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Rate: {formatSystemAmount(plan.pricePerUser || 0)} / user / month
                        </p>
                      </div>

                      {/* Stepper Controls */}
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => handleQuantityChange(userCount - 5)}
                          disabled={userCount <= 1}
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          min={1}
                          max={99999}
                          value={userCount}
                          onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                          className="w-20 h-8 text-center text-xs font-mono font-bold"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => handleQuantityChange(userCount + 5)}
                          disabled={userCount >= 99999}
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-muted-foreground mr-1">Presets:</span>
                      {[10, 25, 50, 100, 250].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleQuantityChange(preset)}
                          className={`px-2 py-0.5 text-[11px] rounded border transition-colors ${
                            userCount === preset
                              ? "bg-primary text-primary-foreground border-primary font-bold"
                              : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                          }`}
                        >
                          {preset} users
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Coupon Section */}
              <div className="p-4 rounded-xl border border-border bg-card space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-primary" />
                    Promo / Partner Coupon
                  </Label>
                  {appliedCoupon && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveCoupon}
                      className="h-6 text-[11px] text-destructive hover:text-destructive px-2"
                    >
                      <X className="h-3 w-3 mr-1" /> Remove
                    </Button>
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Enter code (e.g. WELCOME20)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    disabled={!!appliedCoupon || isValidatingCoupon}
                    className="font-mono uppercase text-xs h-9"
                  />
                  {!appliedCoupon ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleApplyCoupon}
                      disabled={isValidatingCoupon || !couponCode.trim()}
                      className="h-9 px-4 font-semibold text-xs"
                    >
                      {isValidatingCoupon ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
                    </Button>
                  ) : (
                    <Badge variant="outline" className="h-9 px-3 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Applied
                    </Badge>
                  )}
                </div>

                {appliedCoupon && (
                  <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Coupon code {appliedCoupon.code} applied: -{formatSystemAmount(appliedCoupon.discountAmount)} discount.
                  </p>
                )}

                {couponError && (
                  <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {couponError}
                  </p>
                )}
              </div>

              {/* Authoritative Billing Breakdown */}
              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2 text-xs">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Base Plan Subtotal:</span>
                  <span className="font-mono font-medium text-foreground">
                    {formatSystemAmount(pricingCalculation.originalTotal)}
                  </span>
                </div>

                {pricingCalculation.durationSavings > 0 && (
                  <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                    <span>Duration Discount ({duration === "1_year" ? "Annual" : "Promotional"}):</span>
                    <span className="font-mono font-medium">
                      -{formatSystemAmount(pricingCalculation.durationSavings)}
                    </span>
                  </div>
                )}

                {appliedCoupon && (
                  <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                    <span>Coupon Discount ({appliedCoupon.code}):</span>
                    <span className="font-mono font-medium">
                      -{formatSystemAmount(appliedCoupon.discountAmount)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Applicable GST / Taxes:</span>
                  <span className="font-mono">₹0.00 (Included)</span>
                </div>

                <div className="pt-2.5 border-t border-border flex justify-between items-baseline">
                  <div>
                    <span className="font-bold text-sm text-foreground">Final Payable Amount:</span>
                    <p className="text-[11px] text-muted-foreground">
                      Billed {duration === "1_year" ? "Annually" : "Monthly"} in INR
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black font-mono tracking-tight text-foreground">
                      {plan.isTrial ? "₹0.00" : formatSystemAmount(pricingCalculation.finalPayable)}
                    </span>
                    {plan.isTrial && (
                      <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                        (3 Days Free Access)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Action Footer */}
              <div className="pt-2 flex items-center justify-between border-t border-border">
                {!user ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep(1)}
                    className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to Account
                  </Button>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>256-bit SSL Bank-Grade Encryption</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    disabled={isProcessingPayment}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleExecutePayment}
                    disabled={Boolean(isProcessingPayment || (user && !isTenantAdmin))}
                    className="gap-2 font-bold px-5 bg-primary text-primary-foreground shadow-sm"
                  >
                    {isProcessingPayment ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : plan.isTrial ? (
                      <>
                        Start 3-Day Free Trial
                        <ArrowRight className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4" />
                        Continue to Secure Payment ({formatSystemAmount(pricingCalculation.finalPayable)})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
