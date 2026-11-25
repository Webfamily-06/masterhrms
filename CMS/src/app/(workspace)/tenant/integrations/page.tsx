'use client';

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AccessDenied } from "@/components/access-denied";
import { usePermissions } from "@/lib/permissions";

type IntegrationItem = {
  key: string;
  name: string;
  category: string;
  status: "connected" | "pending" | "available";
  summary: string;
  managePath: string;
};

const ICON_MAP: Record<string, string> = {
  smtp_email: "ph-envelope-simple",
  file_storage: "ph-cloud-arrow-up",
  biometric_sync: "ph-fingerprint",
  custom_domain: "ph-globe",
  tenant_addons: "ph-puzzle-piece",
};

export default function TenantIntegrationsPage() {
  const { isWorkspaceAdmin, isSuperAdmin, loading } = usePermissions();
  const isAuthorized = isWorkspaceAdmin || isSuperAdmin;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["tenant-integrations-status"],
    queryFn: async () => {
      const res: any = await api.get("/workspace/integrations/status");
      return res?.data || res || { integrations: [] };
    },
    enabled: isAuthorized,
  });

  const integrations: IntegrationItem[] = Array.isArray(data?.integrations) ? data.integrations : [];

  if (!loading && !isAuthorized) {
    return <AccessDenied moduleName="Tenant Integrations" requiredPermission="workspace.integrations.view" />;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Tenant Integrations & Connectors"
        description="Live status of email gateways, storage drivers, biometric attendance devices, custom domains, and installed add-ons."
        actions={
          <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-1.5">
            <i className="ph ph-arrows-clockwise" />
            Refresh Status
          </Button>
        }
      />

      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground text-xs">
          <i className="ph ph-spinner-gap animate-spin text-2xl text-primary block mx-auto mb-2" />
          Checking live integration connectors...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {integrations.map((item) => (
            <Card key={item.key} className="border border-border/80 rounded-xl bg-card shadow-xs">
              <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg shrink-0">
                      <i className={`ph ${ICON_MAP[item.key] || "ph-plugs-connected"}`} />
                    </div>
                    <Badge
                      variant={
                        item.status === "connected"
                          ? "success"
                          : item.status === "pending"
                          ? "warning"
                          : "soft"
                      }
                      className="text-[10px] uppercase"
                    >
                      {item.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground">{item.category}</p>
                    <h3 className="text-sm font-semibold text-foreground mt-0.5">{item.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{item.summary}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60 flex justify-end">
                  <Link href={item.managePath}>
                    <Button size="xs" variant="outline" className="gap-1">
                      Configure
                      <i className="ph ph-arrow-right" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
