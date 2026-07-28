import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Lock, Sparkles, ArrowRight, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type PlanTier = "free" | "starter" | "growth" | "enterprise";

interface PlanGuardProps {
  requiredPlan?: PlanTier;
  currentPlan?: string;
  moduleName: string;
  featureDesc?: string;
  limitReached?: boolean;
  limitMessage?: string;
  children: ReactNode;
}

const PLAN_HIERARCHY: Record<string, number> = {
  free: 0,
  starter: 1,
  growth: 2,
  enterprise: 3,
};

export function PlanGuard({
  requiredPlan = "starter",
  currentPlan = "starter",
  moduleName,
  featureDesc = "Upgrade your workspace plan to unlock this enterprise module with unlimited capacity, automation, and real-time syncing.",
  limitReached = false,
  limitMessage,
  children,
}: PlanGuardProps) {
  const normCurrent = (currentPlan || "free").toLowerCase();
  const normRequired = requiredPlan.toLowerCase();

  const currentLevel = PLAN_HIERARCHY[normCurrent] ?? 1;
  const requiredLevel = PLAN_HIERARCHY[normRequired] ?? 1;

  const isLocked = currentLevel < requiredLevel || limitReached;

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="relative rounded-3xl overflow-hidden border bg-card p-8 md:p-12 text-center space-y-6 shadow-xl max-w-3xl mx-auto my-8">
      {/* Background Glow */}
      <div
        className="absolute -top-24 -right-24 size-96 rounded-full opacity-25 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.6) 0%, transparent 70%)", filter: "blur(60px)" }}
      />
      <div
        className="absolute -bottom-24 -left-24 size-96 rounded-full opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(168,85,247,0.5) 0%, transparent 70%)", filter: "blur(60px)" }}
      />

      {/* Lock Icon */}
      <div className="relative z-10 size-16 rounded-3xl bg-primary/10 text-primary border border-primary/30 grid place-items-center mx-auto shadow-md">
        {limitReached ? <ShieldAlert className="size-8 text-amber-500" /> : <Lock className="size-8 text-primary" />}
      </div>

      {/* Text */}
      <div className="relative z-10 space-y-2 max-w-xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
          <Sparkles className="size-3.5" /> Plan Restriction · {requiredPlan.toUpperCase()} TIER
        </div>
        <h2 className="text-2xl md:text-3xl font-black tracking-tight">
          {limitReached ? limitMessage || `${moduleName} Limit Reached` : `Unlock ${moduleName} Module`}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{featureDesc}</p>
      </div>

      {/* Perks List */}
      <div className="relative z-10 grid sm:grid-cols-2 gap-3 max-w-md mx-auto text-left text-xs text-muted-foreground pt-2">
        <div className="flex items-center gap-2 bg-secondary/40 p-2.5 rounded-xl border border-border">
          <CheckCircle2 className="size-4 text-emerald-500 shrink-0" /> Unlimited Transactions & Logs
        </div>
        <div className="flex items-center gap-2 bg-secondary/40 p-2.5 rounded-xl border border-border">
          <CheckCircle2 className="size-4 text-emerald-500 shrink-0" /> Multi-User Team Roles
        </div>
        <div className="flex items-center gap-2 bg-secondary/40 p-2.5 rounded-xl border border-border">
          <CheckCircle2 className="size-4 text-emerald-500 shrink-0" /> 500+ Marketplace Addons
        </div>
        <div className="flex items-center gap-2 bg-secondary/40 p-2.5 rounded-xl border border-border">
          <CheckCircle2 className="size-4 text-emerald-500 shrink-0" /> 24/7 Dedicated Support
        </div>
      </div>

      {/* Actions */}
      <div className="relative z-10 pt-4 flex flex-col sm:flex-row gap-3 justify-center">
        <Button size="lg" asChild className="font-bold gap-2 shadow-lg" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
          <Link to="/subscription">
            Upgrade Workspace Plan <ArrowRight className="size-4" />
          </Link>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link to="/marketplace">Explore Addons Marketplace</Link>
        </Button>
      </div>
    </div>
  );
}

export function PlanLimitBar({
  used,
  limit,
  label = "Plan Usage",
}: {
  used: number;
  limit: number;
  label?: string;
}) {
  const percent = Math.min(Math.round((used / limit) * 100), 100);
  const isNearLimit = percent >= 80;

  return (
    <div className="space-y-1.5 p-3 rounded-xl border bg-card text-xs">
      <div className="flex items-center justify-between font-semibold">
        <span>{label}</span>
        <span className="font-mono">
          {used} / {limit === 999999 ? "∞" : limit}
        </span>
      </div>
      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            percent >= 90 ? "bg-red-500" : isNearLimit ? "bg-amber-500" : "bg-primary"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {isNearLimit && limit !== 999999 && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
          ⚠️ Approaching plan capacity limit. <Link to="/subscription" className="underline font-bold">Upgrade Plan</Link>
        </p>
      )}
    </div>
  );
}
