import { createFileRoute, Link } from "@tanstack/react-router";
import { CustomDomainSettings } from "@/components/custom-domain-settings";
import { useTenantBranding } from "@/lib/useTenantBranding";
import { Globe, ChevronRight, ArrowLeft, ShieldCheck, Sparkles, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/_app/settings/custom-domain")({
  component: TenantCustomDomainRoutePage,
});

export function TenantCustomDomainRoutePage() {
  const { branding } = useTenantBranding();

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Link to="/workspace" className="hover:text-foreground transition-colors flex items-center gap-1">
              <Building2 className="size-3" />
              <span>Workspace</span>
            </Link>
            <ChevronRight className="size-3" />
            <Link to="/settings" search={{ tab: "workspace" } as any} className="hover:text-foreground transition-colors">
              Settings
            </Link>
            <ChevronRight className="size-3" />
            <span className="text-foreground font-medium">Custom Domain</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Globe className="size-6 text-primary" />
            Primary Custom Domain
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Connect your company&apos;s apex or branded subdomain to this workspace for a seamless white-label experience.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/settings" search={{ tab: "workspace" } as any}>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
              <ArrowLeft className="size-3.5" /> Back to Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Custom Domain Settings Component */}
      <CustomDomainSettings />
    </div>
  );
}
