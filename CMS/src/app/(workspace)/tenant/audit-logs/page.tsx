'use client';

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AccessDenied } from "@/components/access-denied";
import { usePermissions } from "@/lib/permissions";

type AuditLogRow = {
  id: string;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  createdAt: string;
};

export default function TenantAuditLogsPage() {
  const { isWorkspaceAdmin, isSuperAdmin, loading, profile } = usePermissions();
  const isAuthorized = isWorkspaceAdmin || isSuperAdmin || profile?.roles?.includes("hr_admin");
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["tenant-audit-logs", search],
    queryFn: async () => {
      const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
      const res: any = await api.get(`/workspace/audit-logs${q}`);
      return res?.data || res || { logs: [], total: 0 };
    },
    enabled: isAuthorized,
  });

  const logs: AuditLogRow[] = Array.isArray(data?.logs) ? data.logs : [];

  if (!loading && !isAuthorized) {
    return <AccessDenied moduleName="Tenant Audit Logs" requiredPermission="workspace.audit.view" />;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Tenant Security & Audit Logs"
        description="Immutable activity log of administrative actions, role updates, and workspace configuration changes."
        actions={
          <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-1.5">
            <i className="ph ph-arrows-clockwise" />
            Refresh
          </Button>
        }
      />

      <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
            <Input
              placeholder="Search by actor email, action, or entity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <Badge variant="soft" className="text-xs">
            {data?.total ?? logs.length} recorded events
          </Badge>
        </CardContent>
      </Card>

      <div className="overflow-x-auto border border-border/80 rounded-lg bg-card">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border/70">
              <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">Timestamp</th>
              <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">Actor</th>
              <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">Action</th>
              <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">Resource</th>
              <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  <i className="ph ph-spinner-gap animate-spin text-xl text-primary block mx-auto mb-2" />
                  Loading audit logs...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No audit events found for this organization.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/40 transition-colors">
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="p-3 font-medium text-foreground">
                    {log.actorEmail || "System"}
                  </td>
                  <td className="p-3">
                    <Badge variant="soft" className="text-[10px] uppercase">
                      {log.action}
                    </Badge>
                  </td>
                  <td className="p-3 text-foreground">
                    {log.entityType}
                    {log.entityId ? ` (${log.entityId.slice(0, 12)})` : ""}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {log.ipAddress || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
