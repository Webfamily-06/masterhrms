'use client';

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ScrollText,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  FileSpreadsheet,
  Eye,
  Copy,
  Check,
  Building2,
  User as UserIcon,
  Globe,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCcw,
  Terminal,
  Database,
  Lock,
  Network,
  Cookie,
  Settings2,
} from "lucide-react";

type AuditLogEntry = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  tenantId: string | null;
  tenantName: string | null;
  tenantSlug: string | null;
  actorId: string | null;
  actorEmail: string | null;
  before: unknown;
  after: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

type AuditLogsResponse = {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type ConfigCheckItem = {
  key: string;
  category: "database" | "auth" | "networking" | "cookies" | "environment";
  status: "PASS" | "WARN" | "FAIL";
  valueSanitized: string;
  message: string;
  remediation?: string;
};

type ConfigAuditResult = {
  timestamp: string;
  nodeEnv: string;
  isProductionReady: boolean;
  score: number;
  checks: ConfigCheckItem[];
  summary: {
    passed: number;
    warnings: number;
    failures: number;
  };
};

const ACTION_FILTER_OPTIONS = [
  { value: "all", label: "All Actions" },
  { value: "TENANT", label: "Tenant Lifecycle" },
  { value: "SUBSCRIPTION", label: "Subscriptions & Billing" },
  { value: "DOMAIN", label: "Custom Domains" },
  { value: "PLAN", label: "Subscription Plans" },
  { value: "ROLE", label: "Roles & RBAC" },
  { value: "USER", label: "Platform Users" },
  { value: "SETTINGS", label: "Platform Settings" },
  { value: "BACKUP", label: "Database Backups" },
  { value: "COUPON", label: "Discount Coupons" },
  { value: "REFERRAL", label: "Referral Program" },
  { value: "IMPERSONAT", label: "Impersonation" },
];

function getActionBadgeVariant(action: string): "success" | "warning" | "info" | "purple" | "soft" | "outline" {
  const upper = action.toUpperCase();
  if (upper.includes("DELETE") || upper.includes("REVOK") || upper.includes("REJECT") || upper.includes("SUSPEND")) {
    return "warning";
  }
  if (upper.includes("CREATE") || upper.includes("APPROVE") || upper.includes("GRANT") || upper.includes("ACTIVATE")) {
    return "success";
  }
  if (upper.includes("IMPERSONAT") || upper.includes("SECURITY") || upper.includes("ROLE")) {
    return "purple";
  }
  if (upper.includes("UPDATE") || upper.includes("EDIT") || upper.includes("PATCH")) {
    return "info";
  }
  return "soft";
}

function formatJson(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getCategoryIcon(category: ConfigCheckItem["category"]) {
  switch (category) {
    case "database":
      return Database;
    case "auth":
      return Lock;
    case "networking":
      return Network;
    case "cookies":
      return Cookie;
    default:
      return Settings2;
  }
}

export default function SuperAuditLogsPage() {
  const [activeTab, setActiveTab] = useState<"audit_trail" | "config_audit">("audit_trail");

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [tenantId, setTenantId] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Inspection Dialog
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [copiedPanel, setCopiedPanel] = useState<"before" | "after" | null>(null);

  // Config Audit Category Filter
  const [configCategoryFilter, setConfigCategoryFilter] = useState("all");

  // 1. Tenants list for filter dropdown
  const { data: tenants = [] } = useQuery<Array<{ id: string; name: string; slug: string }>>({
    queryKey: ["super-tenants-audit-filter"],
    queryFn: async () => {
      const res = await api.get("/super/tenants");
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      return list.map((t: any) => ({
        id: String(t.id),
        name: String(t.name || t.slug || "Workspace"),
        slug: String(t.slug || ""),
      }));
    },
  });

  // 2. Platform Audit Logs Query
  const {
    data: auditResponse,
    isLoading: logsLoading,
    isFetching: logsFetching,
    error: logsError,
    refetch: refetchLogs,
  } = useQuery<AuditLogsResponse>({
    queryKey: ["super-audit-logs", page, limit, tenantId, actionFilter, search, fromDate, toDate],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit };
      if (tenantId !== "all") params.tenantId = tenantId;
      if (actionFilter !== "all") params.action = actionFilter;
      if (search.trim()) params.search = search.trim();
      if (fromDate) params.from = new Date(`${fromDate}T00:00:00.000Z`).toISOString();
      if (toDate) params.to = new Date(`${toDate}T23:59:59.999Z`).toISOString();

      const res = await api.get("/super/audit-logs", { params });
      const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      return {
        data: rows as AuditLogEntry[],
        total: Number(res?.total ?? rows.length),
        page: Number(res?.page ?? page),
        limit: Number(res?.limit ?? limit),
        totalPages: Math.max(1, Number(res?.totalPages ?? 1)),
      };
    },
  });

  // 3. Environment Security Config Audit Query
  const {
    data: configAudit,
    isLoading: configLoading,
    isFetching: configFetching,
    error: configError,
    refetch: refetchConfigAudit,
  } = useQuery<ConfigAuditResult | null>({
    queryKey: ["super-config-audit"],
    queryFn: async () => {
      const res = await api.get("/super/config-audit");
      const unwrapped = res?.audit || res?.data?.audit || res?.data || null;
      return unwrapped as ConfigAuditResult | null;
    },
  });

  const logs = auditResponse?.data ?? [];
  const totalEvents = auditResponse?.total ?? 0;
  const totalPages = auditResponse?.totalPages ?? 1;

  // Derived KPI metrics from live responses
  const pageMetrics = useMemo(() => {
    const actors = new Set(logs.map((l) => l.actorEmail || l.actorId).filter(Boolean));
    const affectedTenants = new Set(logs.map((l) => l.tenantId).filter(Boolean));
    return {
      distinctActors: actors.size,
      affectedTenants: affectedTenants.size,
    };
  }, [logs]);

  const filteredConfigChecks = useMemo(() => {
    const checks = configAudit?.checks ?? [];
    if (configCategoryFilter === "all") return checks;
    return checks.filter((c) => c.category === configCategoryFilter);
  }, [configAudit, configCategoryFilter]);

  const hasActiveFilters =
    tenantId !== "all" || actionFilter !== "all" || search.trim() !== "" || fromDate !== "" || toDate !== "";

  const resetFilters = () => {
    setTenantId("all");
    setActionFilter("all");
    setSearch("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const handleCopyJson = (value: unknown, panel: "before" | "after") => {
    navigator.clipboard.writeText(formatJson(value));
    setCopiedPanel(panel);
    toast.success(`Copied ${panel} JSON payload`);
    setTimeout(() => setCopiedPanel(null), 1800);
  };

  const handleExportCsv = () => {
    if (logs.length === 0) {
      toast.info("No audit log records on this page to export.");
      return;
    }
    const escapeCell = (val: unknown) => `"${String(val ?? "").replace(/"/g, '""')}"`;
    const headers = [
      "ID",
      "Timestamp",
      "Action",
      "Entity Type",
      "Entity ID",
      "Tenant Name",
      "Tenant Slug",
      "Actor Email",
      "Actor ID",
      "IP Address",
      "User Agent",
    ];
    const rows = logs.map((row) => [
      escapeCell(row.id),
      escapeCell(row.createdAt ? new Date(row.createdAt).toISOString() : ""),
      escapeCell(row.action),
      escapeCell(row.entityType || ""),
      escapeCell(row.entityId || ""),
      escapeCell(row.tenantName || "Platform Global"),
      escapeCell(row.tenantSlug || ""),
      escapeCell(row.actorEmail || ""),
      escapeCell(row.actorId || ""),
      escapeCell(row.ipAddress || ""),
      escapeCell(row.userAgent || ""),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `super_audit_logs_p${page}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${logs.length} audit event(s) to CSV`);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Platform Audit Logs & Security Audit"
        description="Immutable Super Admin governance trail (survives tenant deletion) and live production environment security posture."
        icon={ScrollText}
        breadcrumbs={[
          { label: "Super Admin", href: "/super" },
          { label: "System Controls" },
          { label: "Audit Logs" },
        ]}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => {
                refetchLogs();
                refetchConfigAudit();
              }}
              disabled={logsFetching || configFetching}
            >
              <RefreshCw className={`size-3.5 ${logsFetching || configFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleExportCsv}
              disabled={logs.length === 0}
            >
              <FileSpreadsheet className="size-3.5 text-emerald-600" />
              Export CSV
            </Button>
          </>
        }
      />

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Audit Events"
          value={totalEvents.toLocaleString()}
          description={hasActiveFilters ? "Matching current filter criteria" : "Persisted platform audit records"}
          icon={ScrollText}
          variant="primary"
          isLoading={logsLoading}
        />
        <StatCard
          title="Active Actors (Page)"
          value={pageMetrics.distinctActors}
          description={`Across ${logs.length} event(s) shown`}
          icon={UserIcon}
          variant="info"
          isLoading={logsLoading}
        />
        <StatCard
          title="Workspaces Touched (Page)"
          value={pageMetrics.affectedTenants}
          description="Distinct tenant scopes in view"
          icon={Building2}
          variant="purple"
          isLoading={logsLoading}
        />
        <StatCard
          title="Env Security Score"
          value={configAudit ? `${configAudit.score}%` : "—"}
          description={
            configAudit
              ? `${configAudit.summary.passed} pass · ${configAudit.summary.warnings} warn · ${configAudit.summary.failures} fail`
              : "Runtime environment posture"
          }
          badge={
            configAudit ? (
              <Badge variant={configAudit.isProductionReady ? "success" : "warning"} className="text-[10px]">
                {configAudit.isProductionReady ? "Ready" : "Review"}
              </Badge>
            ) : undefined
          }
          icon={configAudit?.isProductionReady ? ShieldCheck : ShieldAlert}
          variant={configAudit?.isProductionReady ? "success" : "warning"}
          isLoading={configLoading}
        />
      </div>

      {/* Main View Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "audit_trail" | "config_audit")} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="audit_trail" className="gap-2 text-xs">
            <ScrollText className="size-3.5" />
            Platform Audit Trail ({totalEvents.toLocaleString()})
          </TabsTrigger>
          <TabsTrigger value="config_audit" className="gap-2 text-xs">
            <ShieldCheck className="size-3.5" />
            Environment Security Config Audit
            {configAudit && (
              <Badge
                variant={configAudit.summary.failures > 0 ? "destructive" : configAudit.summary.warnings > 0 ? "warning" : "success"}
                className="text-[10px] py-0 px-1.5 ml-1"
              >
                {configAudit.score}%
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PLATFORM AUDIT TRAIL */}
        <TabsContent value="audit_trail" className="space-y-4 pt-4">
          {logsError && (
            <Alert variant="ghost-danger" icon={<AlertTriangle className="size-4" />}>
              <AlertTitle>Failed to load platform audit logs</AlertTitle>
              <AlertDescription>
                {(logsError as any)?.message || "An unexpected error occurred while fetching audit events."}
              </AlertDescription>
            </Alert>
          )}

          {/* Filters Card */}
          <Card className="p-4 border border-border/80 rounded-xl shadow-xs space-y-3 bg-muted/10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by action key, actor ID, or IP address..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-8 h-9 text-xs bg-background"
                />
              </div>

              {/* Tenant Filter */}
              <Select
                value={tenantId}
                onValueChange={(val) => {
                  setTenantId(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="All Workspaces" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Workspaces</SelectItem>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Action Filter */}
              <Select
                value={actionFilter}
                onValueChange={(val) => {
                  setActionFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_FILTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Page Size */}
              <Select
                value={String(limit)}
                onValueChange={(val) => {
                  setLimit(Number(val));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground font-medium">Date Range:</span>
                <Input
                  type="date"
                  aria-label="From date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 w-auto text-xs bg-background"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="date"
                  aria-label="To date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 w-auto text-xs bg-background"
                />
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs gap-1.5 text-muted-foreground">
                  <RotateCcw className="size-3.5" />
                  Clear Filters
                </Button>
              )}
            </div>
          </Card>

          {/* Paginated Audit Table */}
          <Card className="border border-border/80 rounded-xl shadow-xs overflow-hidden">
            {logsLoading ? (
              <div className="py-16 text-center space-y-2">
                <Loader2 className="size-8 animate-spin mx-auto text-primary" />
                <p className="text-xs text-muted-foreground">Loading platform audit logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-16 px-4 text-center space-y-2">
                <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <ScrollText className="size-6" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">No audit events recorded</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  {hasActiveFilters
                    ? "No audit events match your active search, tenant, action, or date filters."
                    : "Administrative mutations across tenants, plans, domains, roles, and platform settings will automatically appear here."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="p-3 whitespace-nowrap">Timestamp</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Entity</th>
                      <th className="p-3">Workspace</th>
                      <th className="p-3">Actor</th>
                      <th className="p-3 whitespace-nowrap">IP Address</th>
                      <th className="p-3 text-right">Payload</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {logs.map((row) => (
                      <tr key={row.id} className="hover:bg-muted/40 transition-colors">
                        <td className="p-3 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <Clock className="size-3 shrink-0" />
                            <span>{row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}</span>
                          </div>
                        </td>

                        <td className="p-3">
                          <Badge variant={getActionBadgeVariant(row.action)} className="font-mono text-[10px]">
                            {row.action}
                          </Badge>
                        </td>

                        <td className="p-3">
                          {row.entityType || row.entityId ? (
                            <div className="space-y-0.5">
                              <span className="font-semibold text-foreground block">
                                {row.entityType || "Entity"}
                              </span>
                              {row.entityId && (
                                <span className="font-mono text-[10px] text-muted-foreground block truncate max-w-[160px]" title={row.entityId}>
                                  {row.entityId}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        <td className="p-3">
                          {row.tenantName ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 font-medium text-foreground">
                                <Building2 className="size-3 text-muted-foreground shrink-0" />
                                <span>{row.tenantName}</span>
                              </div>
                              {row.tenantSlug && (
                                <span className="font-mono text-[10px] text-muted-foreground block">
                                  {row.tenantSlug}
                                </span>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              Platform Global
                            </Badge>
                          )}
                        </td>

                        <td className="p-3">
                          <div className="space-y-0.5">
                            <span className="font-medium text-foreground block">
                              {row.actorEmail || "System / Automated"}
                            </span>
                            {row.actorId && (
                              <span className="font-mono text-[10px] text-muted-foreground block truncate max-w-[140px]" title={row.actorId}>
                                {row.actorId}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Globe className="size-3 shrink-0" />
                            <span>{row.ipAddress || "—"}</span>
                          </div>
                        </td>

                        <td className="p-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-[11px] gap-1"
                            onClick={() => setSelectedEntry(row)}
                          >
                            <Eye className="size-3" />
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Footer */}
            {!logsLoading && totalEvents > 0 && (
              <div className="px-4 py-3 border-t border-border/70 bg-muted/15 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">
                  Showing page <strong className="text-foreground">{page}</strong> of{" "}
                  <strong className="text-foreground">{totalPages}</strong> ({totalEvents.toLocaleString()} total events)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    disabled={page <= 1 || logsFetching}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="size-3.5" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    disabled={page >= totalPages || logsFetching}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* TAB 2: ENVIRONMENT SECURITY CONFIG AUDIT */}
        <TabsContent value="config_audit" className="space-y-4 pt-4">
          {configError && (
            <Alert variant="ghost-danger" icon={<AlertTriangle className="size-4" />}>
              <AlertTitle>Failed to run environment security audit</AlertTitle>
              <AlertDescription>
                {(configError as any)?.message || "Could not retrieve configuration audit checks."}
              </AlertDescription>
            </Alert>
          )}

          {configLoading ? (
            <Card className="p-16 border border-border/80 rounded-xl text-center space-y-2">
              <Loader2 className="size-8 animate-spin mx-auto text-primary" />
              <p className="text-xs text-muted-foreground">Evaluating runtime environment security controls...</p>
            </Card>
          ) : !configAudit ? (
            <Card className="p-16 border border-border/80 rounded-xl text-center space-y-2">
              <ShieldAlert className="size-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-semibold text-foreground">No security audit data available</p>
              <Button variant="outline" size="sm" onClick={() => refetchConfigAudit()} className="gap-1.5 text-xs">
                <RefreshCw className="size-3.5" /> Re-run Security Audit
              </Button>
            </Card>
          ) : (
            <>
              {/* Production Readiness Summary Banner */}
              <Alert
                variant={configAudit.isProductionReady ? "ghost-success" : "ghost-warning"}
                icon={
                  configAudit.isProductionReady ? (
                    <ShieldCheck className="size-5" />
                  ) : (
                    <AlertTriangle className="size-5" />
                  )
                }
              >
                <AlertTitle className="flex items-center gap-2 flex-wrap">
                  <span>
                    {configAudit.isProductionReady
                      ? "Environment Passed Production Readiness Checks"
                      : "Production Hardening Recommendations Detected"}
                  </span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    NODE_ENV: {configAudit.nodeEnv}
                  </Badge>
                </AlertTitle>
                <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
                  <span>
                    Score: <strong>{configAudit.score}/100</strong> ({configAudit.summary.passed} Passed,{" "}
                    {configAudit.summary.warnings} Warnings, {configAudit.summary.failures} Failures) · Audited{" "}
                    {configAudit.timestamp ? new Date(configAudit.timestamp).toLocaleString() : "just now"}.
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchConfigAudit()}
                    disabled={configFetching}
                    className="h-7 text-xs gap-1.5 shrink-0 bg-background"
                  >
                    <RefreshCw className={`size-3 ${configFetching ? "animate-spin" : ""}`} />
                    Re-run Audit
                  </Button>
                </AlertDescription>
              </Alert>

              {/* Checks Filter & Table */}
              <Card className="border border-border/80 rounded-xl shadow-xs overflow-hidden">
                <CardHeader className="p-4 border-b bg-muted/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Terminal className="size-4 text-primary" />
                      Runtime Configuration Controls
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Sanitized inspection of database, authentication, networking, and cookie security variables.
                    </CardDescription>
                  </div>

                  <Select value={configCategoryFilter} onValueChange={setConfigCategoryFilter}>
                    <SelectTrigger className="h-8 w-[180px] text-xs bg-background">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="environment">Environment</SelectItem>
                      <SelectItem value="database">Database</SelectItem>
                      <SelectItem value="auth">Authentication</SelectItem>
                      <SelectItem value="networking">Networking</SelectItem>
                      <SelectItem value="cookies">Cookies</SelectItem>
                    </SelectContent>
                  </Select>
                </CardHeader>

                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-muted/50 border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                          <th className="p-3">Status</th>
                          <th className="p-3">Control Key</th>
                          <th className="p-3">Category</th>
                          <th className="p-3">Sanitized Value</th>
                          <th className="p-3">Diagnostic &amp; Remediation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/70">
                        {filteredConfigChecks.map((check) => {
                          const CatIcon = getCategoryIcon(check.category);
                          return (
                            <tr key={check.key} className="hover:bg-muted/40 transition-colors">
                              <td className="p-3 whitespace-nowrap">
                                {check.status === "PASS" ? (
                                  <Badge variant="success" className="text-[10px] gap-1">
                                    <CheckCircle2 className="size-3" /> PASS
                                  </Badge>
                                ) : check.status === "WARN" ? (
                                  <Badge variant="warning" className="text-[10px] gap-1">
                                    <AlertTriangle className="size-3" /> WARN
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-[10px] gap-1">
                                    <XCircle className="size-3" /> FAIL
                                  </Badge>
                                )}
                              </td>
                              <td className="p-3 font-mono font-bold text-foreground whitespace-nowrap">
                                {check.key}
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5 text-muted-foreground capitalize">
                                  <CatIcon className="size-3.5" />
                                  {check.category}
                                </span>
                              </td>
                              <td className="p-3 font-mono text-[11px] text-muted-foreground max-w-[220px] truncate" title={check.valueSanitized}>
                                {check.valueSanitized}
                              </td>
                              <td className="p-3 space-y-1">
                                <p className="text-foreground">{check.message}</p>
                                {check.remediation && (
                                  <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                                    Remediation: {check.remediation}
                                  </p>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* BEFORE / AFTER JSON INSPECTION DIALOG */}
      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col p-0 overflow-hidden">
          {selectedEntry && (
            <>
              <DialogHeader className="px-6 py-4 border-b border-border/70">
                <DialogTitle className="flex items-center gap-2 text-base font-bold flex-wrap">
                  <ScrollText className="size-5 text-primary" />
                  <span>Audit Event Inspection</span>
                  <Badge variant={getActionBadgeVariant(selectedEntry.action)} className="font-mono text-[10px]">
                    {selectedEntry.action}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs font-mono">
                  Event ID: {selectedEntry.id} · {new Date(selectedEntry.createdAt).toLocaleString()}
                </DialogDescription>
              </DialogHeader>

              <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
                {/* Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg border bg-muted/20 space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Actor</span>
                    <span className="font-semibold text-foreground block break-all">
                      {selectedEntry.actorEmail || "System / Automated"}
                    </span>
                    {selectedEntry.actorId && (
                      <span className="font-mono text-[10px] text-muted-foreground block truncate">
                        {selectedEntry.actorId}
                      </span>
                    )}
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/20 space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Workspace Scope</span>
                    <span className="font-semibold text-foreground block">
                      {selectedEntry.tenantName || "Platform Global"}
                    </span>
                    {selectedEntry.tenantId && (
                      <span className="font-mono text-[10px] text-muted-foreground block truncate">
                        {selectedEntry.tenantSlug ? `${selectedEntry.tenantSlug} · ` : ""}
                        {selectedEntry.tenantId}
                      </span>
                    )}
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/20 space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Entity &amp; Network</span>
                    <span className="font-semibold text-foreground block">
                      {selectedEntry.entityType || "—"} {selectedEntry.entityId ? `(${selectedEntry.entityId})` : ""}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground block">
                      IP: {selectedEntry.ipAddress || "—"}
                    </span>
                  </div>
                </div>

                {selectedEntry.userAgent && (
                  <div className="p-2.5 rounded-lg border bg-muted/15 font-mono text-[11px] text-muted-foreground break-all">
                    <span className="font-sans font-bold text-foreground mr-1.5">User-Agent:</span>
                    {selectedEntry.userAgent}
                  </div>
                )}

                {/* Side-by-Side Before / After JSON */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="border rounded-xl overflow-hidden flex flex-col bg-card">
                    <div className="px-3.5 py-2 border-b bg-muted/40 flex items-center justify-between">
                      <span className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                        Before State (Masked)
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] gap-1"
                        onClick={() => handleCopyJson(selectedEntry.before, "before")}
                      >
                        {copiedPanel === "before" ? (
                          <Check className="size-3 text-emerald-600" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                        Copy
                      </Button>
                    </div>
                    <pre className="p-3.5 text-[11px] font-mono overflow-auto max-h-72 bg-slate-950/5 dark:bg-slate-950/60 text-foreground whitespace-pre-wrap break-all">
                      {selectedEntry.before !== null && selectedEntry.before !== undefined
                        ? formatJson(selectedEntry.before)
                        : "// No prior state recorded"}
                    </pre>
                  </div>

                  <div className="border rounded-xl overflow-hidden flex flex-col bg-card">
                    <div className="px-3.5 py-2 border-b bg-muted/40 flex items-center justify-between">
                      <span className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                        After State / Payload (Masked)
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] gap-1"
                        onClick={() => handleCopyJson(selectedEntry.after, "after")}
                      >
                        {copiedPanel === "after" ? (
                          <Check className="size-3 text-emerald-600" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                        Copy
                      </Button>
                    </div>
                    <pre className="p-3.5 text-[11px] font-mono overflow-auto max-h-72 bg-slate-950/5 dark:bg-slate-950/60 text-foreground whitespace-pre-wrap break-all">
                      {selectedEntry.after !== null && selectedEntry.after !== undefined
                        ? formatJson(selectedEntry.after)
                        : "// No after payload recorded"}
                    </pre>
                  </div>
                </div>
              </div>

              <DialogFooter className="px-6 py-3.5 border-t border-border/70 bg-muted/10">
                <Button variant="outline" size="sm" onClick={() => setSelectedEntry(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
