import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileSearch, ShieldCheck, Clock, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tenant/audit-logs")({
  component: TenantAuditLogsPage,
  head: () => ({
    meta: [{ title: "Audit Logs — Master HRMS" }],
  }),
});

function TenantAuditLogsPage() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["tenant-audit-logs"],
    queryFn: async () => {
      try {
        const res = await api.get("/audit-logs");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <FileSearch className="h-6 w-6 text-primary" />
          Workspace Audit Logs & Compliance Ledger
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Immutable event log tracking administrative logins, permission edits, and data access.
        </p>
      </div>

      <Card className="border-border/80">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border/60 uppercase tracking-wider text-[11px] text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3.5">Action Event</th>
                  <th className="p-3.5">Actor / User</th>
                  <th className="p-3.5">Target Resource</th>
                  <th className="p-3.5">IP Address</th>
                  <th className="p-3.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading audit logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No audit events recorded yet for this workspace.
                    </td>
                  </tr>
                ) : (
                  logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3.5 font-medium text-foreground">
                        <Badge variant="outline" className="font-mono text-[10px] bg-muted/60">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="p-3.5 font-medium text-foreground">{log.actor}</td>
                      <td className="p-3.5 text-muted-foreground">{log.resource}</td>
                      <td className="p-3.5 font-mono text-[11px] text-muted-foreground">{log.ip || "—"}</td>
                      <td className="p-3.5 text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
