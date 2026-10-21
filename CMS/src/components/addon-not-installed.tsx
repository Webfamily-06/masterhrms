import React from "react";
import { Link } from "@/lib/router-compat";
import { ShoppingBag, ArrowLeft, Store, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AddonNotInstalledProps {
  addonName: string;
  addonSlug: string;
  category?: string;
  description?: string;
}

export function AddonNotInstalled({
  addonName,
  addonSlug,
  category = "E-Commerce",
  description,
}: AddonNotInstalledProps) {
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-200">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-xl shadow-amber-500/5">
          <ShoppingBag className="w-12 h-12 stroke-[1.75]" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-500 shadow-md">
          <Sparkles className="w-4 h-4" />
        </div>
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold mb-3 border border-amber-500/20">
        <span>HTTP 403 · Add-on Installation Required</span>
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl mb-3">
        {addonName} Not Installed
      </h1>

      <p className="text-base text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-2 leading-relaxed">
        Your workspace does not have an active installation of <strong className="text-slate-800 dark:text-slate-200">{addonName}</strong>.
      </p>

      <p className="text-sm text-slate-500 dark:text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
        {description || "To enable this add-on and access its real-time synchronization, store configuration, and dashboards, please install it from the Add-ons Marketplace."}
      </p>

      <div className="mb-8 p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 text-xs text-left max-w-sm w-full space-y-2 shadow-sm">
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
          <span className="font-medium">Add-on Module:</span>
          <Badge variant="outline" className="text-xs font-medium bg-slate-200/50 dark:bg-slate-800">
            {addonName}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
          <span className="font-medium">Category:</span>
          <Badge variant="outline" className="text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
            {category}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
          <span className="font-medium">Identifier:</span>
          <code className="font-mono text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
            {addonSlug}
          </code>
        </div>
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
          <span className="font-medium">Installation Status:</span>
          <Badge variant="outline" className="text-[10px] font-semibold border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10">
            NOT INSTALLED / DISABLED
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link to="/hrm-dashboard">
            <ArrowLeft className="w-4 h-4" />
            Return to Dashboard
          </Link>
        </Button>
        <Button asChild size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
          <Link to="/marketplace">
            <Store className="w-4 h-4" />
            Open Add-ons Marketplace
          </Link>
        </Button>
      </div>
    </div>
  );
}
