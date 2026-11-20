import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Boxes, Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { ERP_MODULES } from "@/lib/erp-modules";
import { AddonConfigDrawer } from "@/components/addons/AddonConfigDrawer";

export const Route = createFileRoute("/_authenticated/tenant/modules")({
  component: TenantModulesPage,
  head: () => ({
    meta: [{ title: "Modules & Features — Master HRMS" }],
  }),
});

function TenantModulesPage() {
  const qc = useQueryClient();
  const [selectedModule, setSelectedModule] = useState<{
    key: string;
    name: string;
    description?: string;
  } | null>(null);

  const { data: serverModules, isLoading } = useQuery<any[]>({
    queryKey: ["workspace-modules-status"],
    queryFn: async () => {
      const res = await api.get<any[]>("/workspace/modules");
      return Array.isArray(res) ? res : [];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ moduleKey, isEnabled }: { moduleKey: string; isEnabled: boolean }) => {
      return api.put("/workspace/modules", { moduleKey, isEnabled });
    },
    onSuccess: (_res, vars) => {
      toast.success(`Module '${vars.moduleKey}' ${vars.isEnabled ? "enabled" : "disabled"} across workspace.`);
      qc.invalidateQueries({ queryKey: ["workspace-modules-status"] });
      qc.invalidateQueries({ queryKey: ["tenant-dashboard-metrics"] });
      qc.invalidateQueries({ queryKey: ["current-profile"] });
      qc.invalidateQueries({ queryKey: ["app-config"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update workspace module status.");
    },
  });

  const modulesList = serverModules && serverModules.length > 0
    ? serverModules
    : ERP_MODULES.map((m) => ({ ...m, isEnabled: true }));

  const handleToggle = (key: string, currentEnabled: boolean) => {
    if (key === "hrm") {
      toast.info("Core HRM module is required and cannot be disabled.");
      return;
    }
    toggleMutation.mutate({ moduleKey: key, isEnabled: !currentEnabled });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Modules & Feature Toggles
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enable or disable platform suites across your workspace dashboards and sidebars in real-time.
          </p>
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing workspace modules...
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {modulesList.map((mod: any) => {
          const isEnabled = mod.isEnabled !== false;
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
                      disabled={toggleMutation.isPending}
                      onCheckedChange={() => handleToggle(mod.key, isEnabled)}
                    />
                  )}
                </div>
                <CardDescription className="text-xs mt-2 line-clamp-2">
                  {mod.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/50 pt-2.5">
                  <span>Workspace Decision Authority</span>
                  <span className={isEnabled ? "text-emerald-500 font-medium" : "text-muted-foreground"}>
                    {isEnabled ? "Active" : "Disabled"}
                  </span>
                </div>
                {isEnabled && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs h-7 gap-1.5"
                    onClick={() =>
                      setSelectedModule({
                        key: mod.key,
                        name: mod.name,
                        description: mod.description,
                      })
                    }
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Configure Integration
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedModule && (
        <AddonConfigDrawer
          isOpen={!!selectedModule}
          onClose={() => setSelectedModule(null)}
          addonSlug={selectedModule.key}
          addonName={selectedModule.name}
          addonDescription={selectedModule.description}
        />
      )}
    </div>
  );
}
