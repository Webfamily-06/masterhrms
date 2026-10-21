'use client';
import {  createFileRoute  } from "@/src/lib/router-compat";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ShieldAlert,
  Search,
  Download,
  Filter,
  Eye,
  Calendar,
  User,
  Activity,
  Layers,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";



interface ActivityLogItem {
  id: string;
  source: "audit_log" | "setting_audit";
  timestamp: string;
  actorId: string;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

function ActivityLogsPage() {
  const [search, setSearch] = useState("");
  const [selectedEntityType, setSelectedEntityType] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedLogForDetails, setSelectedLogForDetails] = useState<ActivityLogItem | null>(null);

  // 1. Fetch activity logs
  const limit = 25;
  const { data: logsResponse, isLoading, refetch } = useQuery<{
    logs: ActivityLogItem[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }>({
    queryKey: ["tenant-activity-logs", page, selectedEntityType, search],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });
        if (selectedEntityType !== "all") params.append("entityType", selectedEntityType);
        if (search.trim()) params.append("action", search.trim());

        const res = await api.get<{
          logs: ActivityLogItem[];
          pagination: { total: number; page: number; limit: number; totalPages: number };
        }>(`/activity-logs?${params.toString()}`);
        return res || { logs: [], pagination: { total: 0, page: 1, limit: 25, totalPages: 1 } };
      } catch {
        return { logs: [], pagination: { total: 0, page: 1, limit: 25, totalPages: 1 } };
      }
    },
    staleTime: 5000,
  });

  const logs = logsResponse?.logs || (logsResponse as any)?.items || [];
  const pagination = logsResponse?.pagination || {
    total: (logsResponse as any)?.total || logs.length,
    page: (logsResponse as any)?.page || 1,
    limit: (logsResponse as any)?.limit || 25,
    totalPages: (logsResponse as any)?.totalPages || 1,
  };

  const handleExportCsv = () => {
    window.open("/api/activity-logs/export/csv", "_blank");
    toast.success("Downloading RFC 4180 Activity Log CSV export...");
  };

  const ENTITY_OPTIONS = [
    "all",
    "Employee",
    "Department",
    "LeaveApplication",
    "Invoice",
    "WebhookEndpoint",
    "Backup",
    "Setting",
    "User",
  ];

  return (
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <BreadcrumbNav />
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Activity & Audit Logs</h1>
            <Badge variant="outline" className="text-xs font-mono">
              E10 Audit Engine
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Immutable, tenant-scoped ledger tracking all administrative mutations with automatic credential & PII redaction.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="font-bold gap-1.5 self-start sm:self-auto text-xs"
          onClick={handleExportCsv}
        >
          <FileSpreadsheet className="size-4 text-emerald-600" /> Export CSV (RFC 4180)
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search action (e.g. employee.created, setting.updated)..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 text-xs h-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Filter className="size-3" /> Entity:
          </span>
          <div className="flex gap-1">
            {ENTITY_OPTIONS.map((opt) => (
              <Button
                key={opt}
                variant={selectedEntityType === opt ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs px-2.5 rounded-lg font-semibold capitalize"
                onClick={() => {
                  setSelectedEntityType(opt);
                  setPage(1);
                }}
              >
                {opt}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Card */}
      <Card className="border shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center">
            <Loader2 className="size-8 animate-spin mx-auto text-primary" />
            <p className="text-xs text-muted-foreground mt-2">Loading audit trail...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <Activity className="size-10 text-muted-foreground/30 mx-auto" />
            <h3 className="font-bold text-sm text-foreground">No Audit Logs Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No matching activity records recorded for the current filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b font-bold uppercase text-[10px] text-muted-foreground tracking-wider">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Entity Type</th>
                  <th className="p-3">Actor</th>
                  <th className="p-3">IP Address</th>
                  <th className="p-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y font-mono text-[11px]">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp || (log as any).createdAt).toLocaleString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="font-mono text-[10px] font-bold bg-card">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="p-3 font-semibold text-foreground">{log.entityType}</td>
                    <td className="p-3 text-muted-foreground truncate max-w-[140px]">
                      {log.actorEmail || log.actorId}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {log.ipAddress || "Internal"}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs font-semibold gap-1 text-primary hover:bg-primary/10"
                        onClick={() => setSelectedLogForDetails(log)}
                      >
                        <Eye className="size-3.5" /> Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-3 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
            <div>
              Showing page <strong className="text-foreground">{pagination.page}</strong> of{" "}
              <strong className="text-foreground">{pagination.totalPages}</strong> ({pagination.total} total events)
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 text-xs px-2 gap-1"
              >
                <ChevronLeft className="size-3.5" /> Prev
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 text-xs px-2 gap-1"
              >
                Next <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* DETAIL INSPECTION MODAL */}
      <Dialog open={!!selectedLogForDetails} onOpenChange={(open) => !open && setSelectedLogForDetails(null)}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Activity className="size-5 text-primary" /> Audit Record Inspection
            </DialogTitle>
            <DialogDescription className="text-xs">
              Raw state snapshot with automatic secret & PII sanitization.
            </DialogDescription>
          </DialogHeader>

          {selectedLogForDetails && (
            <div className="space-y-4 text-xs py-2">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg border bg-muted/20 font-mono text-[11px]">
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-bold">Action:</span>
                  <div className="font-bold text-foreground">{selectedLogForDetails.action}</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-bold">Entity:</span>
                  <div className="font-bold text-foreground">{selectedLogForDetails.entityType} ({selectedLogForDetails.entityId || "N/A"})</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-bold">Actor:</span>
                  <div className="text-foreground truncate">{selectedLogForDetails.actorEmail || selectedLogForDetails.actorId}</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-bold">IP Address:</span>
                  <div className="text-foreground">{selectedLogForDetails.ipAddress || "Internal"}</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Payload & Redacted State
                </span>
                <pre className="p-3 rounded-xl border bg-card text-[11px] font-mono overflow-x-auto max-h-64 leading-relaxed">
                  {JSON.stringify(selectedLogForDetails.details || {}, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 border-t">
            <Button size="sm" variant="outline" onClick={() => setSelectedLogForDetails(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ActivityLogsPage;
