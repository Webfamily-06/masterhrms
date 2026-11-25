'use client';

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AccessDenied } from "@/components/access-denied";
import { usePermissions } from "@/lib/permissions";

type ModuleItem = {
  moduleKey: string;
  isEnabled: boolean;
  label?: string;
  description?: string;
};

const MODULE_META: Record<string, { label: string; description: string; icon: string; phase: string }> = {
  hrm: {
    label: "Core HRMS & Organization",
    description: "Employees, departments, attendance, leaves, recruitment, and performance.",
    icon: "ph-users-three",
    phase: "Active Core",
  },
  payroll: {
    label: "Payroll & Statutory Compliance",
    description: "Salary components, payroll runs, INR payslips, HSN 998517 billing, and TN registers.",
    icon: "ph-receipt",
    phase: "Active Core",
  },
  assets: {
    label: "Assets & Depreciation",
    description: "IT/office asset registry, employee assignments, and depreciation tracking.",
    icon: "ph-hard-drive",
    phase: "Active Core",
  },
  crm: {
    label: "CRM & Sales Pipeline",
    description: "Leads, deals, contacts, quotations, and customer relationship workflows.",
    icon: "ph-handshake",
    phase: "Next Phase",
  },
  pos: {
    label: "POS & Inventory",
    description: "Point of sale billing, product catalog, stock movements, and warehouses.",
    icon: "ph-storefront",
    phase: "Future Phase",
  },
  accounting: {
    label: "Accounting & Finance",
    description: "Chart of accounts, journals, expenses, and financial statements.",
    icon: "ph-bank",
    phase: "Optional",
  },
};

export default function TenantModulesPage() {
  const { isWorkspaceAdmin, isSuperAdmin, loading } = usePermissions();
  const isAuthorized = isWorkspaceAdmin || isSuperAdmin;
  const queryClient = useQueryClient();

  const { data: modules = [], isLoading } = useQuery<ModuleItem[]>({
    queryKey: ["workspace-modules"],
    queryFn: async () => {
      const res: any = await api.get("/workspace/modules");
      const raw = res?.modules || res?.data || (Array.isArray(res) ? res : []);
      return raw;
    },
    enabled: isAuthorized,
  });

  const toggleModuleMutation = useMutation({
    mutationFn: async (updatedModules: { moduleKey: string; isEnabled: boolean }[]) => {
      return await api.put("/workspace/modules", { modules: updatedModules });
    },
    onSuccess: () => {
      toast.success("Tenant module entitlements updated.");
      queryClient.invalidateQueries({ queryKey: ["workspace-modules"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-dashboard-summary"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update modules.");
    },
  });

  const mergedList = Object.keys(MODULE_META).map((key) => {
    const found = modules.find((m) => m.moduleKey?.toLowerCase() === key);
    return {
      moduleKey: key,
      isEnabled: found ? Boolean(found.isEnabled) : key === "hrm" || key === "payroll" || key === "assets",
      ...MODULE_META[key],
    };
  });

  const handleToggle = (targetKey: string, nextState: boolean) => {
    const payload = mergedList.map((m) => ({
      moduleKey: m.moduleKey,
      isEnabled: m.moduleKey === targetKey ? nextState : m.isEnabled,
    }));
    toggleModuleMutation.mutate(payload);
  };

  if (!loading && !isAuthorized) {
    return <AccessDenied moduleName="Tenant Modules" requiredPermission="workspace.modules.manage" />;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Tenant Modules & Entitlements"
        description="Enable or disable ERP suites for this organization. Core HR, Payroll, and Assets are active; CRM and POS can be activated when ready."
      />

      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground text-xs">
          <i className="ph ph-spinner-gap animate-spin text-2xl text-primary block mx-auto mb-2" />
          Loading module entitlements...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {mergedList.map((mod) => (
            <Card key={mod.moduleKey} className="border border-border/80 rounded-xl bg-card shadow-xs">
              <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg shrink-0">
                      <i className={`ph ${mod.icon}`} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="soft" className="text-[10px]">
                        {mod.phase}
                      </Badge>
                      <Badge variant={mod.isEnabled ? "success" : "warning"} className="text-[10px]">
                        {mod.isEnabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{mod.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {mod.description}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground uppercase font-medium">
                    Key: {mod.moduleKey}
                  </span>
                  <Button
                    size="xs"
                    variant={mod.isEnabled ? "outline" : "default"}
                    disabled={toggleModuleMutation.isPending}
                    onClick={() => handleToggle(mod.moduleKey, !mod.isEnabled)}
                    className="gap-1"
                  >
                    <i className={mod.isEnabled ? "ph ph-power" : "ph ph-check-circle"} />
                    {mod.isEnabled ? "Disable" : "Enable"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
