import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Boxes, CheckCircle2, ShieldCheck, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ERP_MODULES } from "@/lib/erp-modules";

export const Route = createFileRoute("/_authenticated/tenant/modules")({
  component: TenantModulesPage,
  head: () => ({
    meta: [{ title: "Modules & Features — Master HRMS" }],
  }),
});

function TenantModulesPage() {
  const qc = useQueryClient();
  const [enabledKeys, setEnabledKeys] = useState<string[]>([
    "hrm",
    "recruitment",
    "payroll",
    "attendance",
    "performance",
    "training",
    "assets",
  ]);

  const toggleModule = (key: string) => {
    if (key === "hrm") {
      toast.info("Core HRM module is required and cannot be disabled.");
      return;
    }
    setEnabledKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
    toast.success(`Module state updated.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Boxes className="h-6 w-6 text-primary" />
            Modules & Feature Toggles
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enable or disable platform suites across your workspace in real-time.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {ERP_MODULES.map((mod) => {
          const isEnabled = enabledKeys.includes(mod.key);
          const isCore = mod.key === "hrm";

          return (
            <Card key={mod.key} className="border-border/80 flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-md bg-primary/10 text-primary">
                      <Boxes className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">{mod.name}</CardTitle>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {mod.key}
                      </span>
                    </div>
                  </div>
                  {isCore ? (
                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                      Required
                    </Badge>
                  ) : (
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => toggleModule(mod.key)}
                    />
                  )}
                </div>
                <CardDescription className="text-xs mt-2 line-clamp-2">
                  {mod.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/50 pt-2.5">
                  <span>Included in Sovereign Plan</span>
                  <span className={isEnabled ? "text-emerald-500 font-medium" : "text-muted-foreground"}>
                    {isEnabled ? "Active" : "Disabled"}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
