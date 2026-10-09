import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Terminal, Code, Layers, Database, ShieldCheck, Activity, Play, Copy,
  CheckCircle2, AlertTriangle, XCircle, Search, Server, Workflow, Radio, Download,
  ExternalLink, ChevronRight, ChevronDown, Sparkles, Key, Globe, Sliders, Boxes,
  FileText, Printer, Bell, Cpu, RefreshCw, Clock, ArrowRight, ListFilter, Check,
  FileSpreadsheet, Lock, Users, Building2, UserCircle, Network, Package, Zap,
  BarChart3, TrendingUp, GitBranch, Shield, Eye, Settings, History, HelpCircle,
  FileCode, PlayCircle, BookOpen, Send
} from "lucide-react";
import { WebApisRuntimePanel } from "@/components/web-apis/web-apis-panel";

export const Route = createFileRoute("/_authenticated/super/developer")({
  component: SuperDeveloperPage,
});

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  POST: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  PUT: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  PATCH: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  DELETE: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
};

function MethodBadge({ method }: { method: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${METHOD_COLORS[method] || "bg-muted text-muted-foreground border-border"}`}>
      {method}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "WORKING":
    case "RESOLVED":
      return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold text-[10px]">WORKING</Badge>;
    case "PARTIAL":
      return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold text-[10px]">PARTIAL</Badge>;
    case "MISSING":
      return <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-semibold text-[10px]">MISSING</Badge>;
    default:
      return <Badge variant="secondary" className="font-semibold text-[10px]">{status}</Badge>;
  }
}

export function SuperDeveloperPage() {
  const [activeTab, setActiveTab] = useState<
    "web-apis" | "overview" | "explorer" | "super-admin" | "console" | "auth-guide" | "permissions" | "integrations"
  >("web-apis");

  const [selectedRole, setSelectedRole] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [moduleFilter, setModuleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedEndpoint, setSelectedEndpoint] = useState<any | null>(null);

  // Console State
  const [consoleMethod, setConsoleMethod] = useState("GET");
  const [consoleUrl, setConsoleUrl] = useState("/api/health");
  const [consoleBody, setConsoleBody] = useState("");
  const [consoleResult, setConsoleResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Query metadata
  const { data: metadata, isLoading, refetch } = useQuery({
    queryKey: ["developer-metadata"],
    queryFn: async () => {
      const token = localStorage.getItem("hrms_auth_token") || localStorage.getItem("auth_token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/docs/metadata`, { headers });
      if (!res.ok) throw new Error("Failed to load metadata");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const endpoints = metadata?.endpoints || [];
  const modules = useMemo(() => Array.from(new Set(endpoints.map((e: any) => e.module || "General"))).sort(), [endpoints]);

  const superAdminEndpoints = useMemo(() => {
    return endpoints.filter((e: any) =>
      (e.requiredRoles || []).includes("super_admin") ||
      e.fullPath.includes("/super") ||
      e.module === "Super Admin" ||
      e.fullPath.includes("/tenants") ||
      e.fullPath.includes("/plans")
    );
  }, [endpoints]);

  const filteredEndpoints = useMemo(() => {
    return endpoints.filter((ep: any) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !searchQuery ||
        ep.fullPath.toLowerCase().includes(q) ||
        ep.module.toLowerCase().includes(q) ||
        (ep.description && ep.description.toLowerCase().includes(q));
      const matchMethod = methodFilter === "ALL" || ep.method === methodFilter;
      const matchModule = moduleFilter === "ALL" || ep.module === moduleFilter;
      const matchStatus = statusFilter === "ALL" || (ep.status || "WORKING") === statusFilter;
      const matchRole =
        selectedRole === "all" ||
        (ep.requiredRoles && ep.requiredRoles.includes(selectedRole)) ||
        (ep.requiredRoles?.length === 0 && selectedRole === "authenticated");
      return matchSearch && matchMethod && matchModule && matchStatus && matchRole;
    });
  }, [endpoints, searchQuery, methodFilter, moduleFilter, statusFilter, selectedRole]);

  const executeApiCall = async () => {
    setIsExecuting(true);
    setConsoleResult(null);
    try {
      let parsedBody = undefined;
      if (consoleBody.trim() && (consoleMethod === "POST" || consoleMethod === "PUT" || consoleMethod === "PATCH")) {
        try {
          parsedBody = JSON.parse(consoleBody);
        } catch {
          toast.error("Invalid JSON body.");
          setIsExecuting(false);
          return;
        }
      }

      const res = await fetch(`${API_BASE}/docs/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: consoleMethod,
          url: consoleUrl,
          body: parsedBody,
        }),
      });

      const data = await res.json();
      setConsoleResult(data);
      if (data.status >= 200 && data.status < 300) {
        toast.success(`HTTP ${data.status} ${data.statusText || "OK"}`);
      } else {
        toast.warning(`HTTP ${data.status || "Error"}`);
      }
    } catch (err: any) {
      setConsoleResult({ error: err.message });
      toast.error(err.message);
    } finally {
      setIsExecuting(false);
    }
  };

  const loadEndpointToConsole = (ep: any) => {
    setConsoleMethod(ep.method);
    setConsoleUrl(ep.fullPath);
    setActiveTab("console");
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header matching Super Admin format ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Terminal className="size-6 text-primary" /> Developer Console & Web APIs
            </h1>
            <Badge variant="secondary" className="gap-1 text-xs">
              <Sparkles className="size-3 text-primary animate-pulse" /> 8 Web APIs
            </Badge>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs">
              Platform Root
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time browser Web APIs runtime, interactive API testing, endpoint directory, and RBAC matrix.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 h-8 text-xs">
            <RefreshCw className="size-3.5" /> Refresh
          </Button>
          <Button
            size="sm"
            className="gap-1.5 h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => {
              setActiveTab("console");
              setConsoleMethod("GET");
              setConsoleUrl("/api/health");
            }}
          >
            <PlayCircle className="size-3.5" /> Quick Console
          </Button>
          <Link to="/docs">
            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs">
              <BookOpen className="size-3.5 text-blue-500" /> API Docs
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Sub Navigation Tabs ── */}
      <div className="bg-card border border-border rounded-xl p-1.5 flex items-center justify-between overflow-x-auto custom-scrollbar shadow-xs">
        <div className="flex items-center gap-1 min-w-max">
          {[
            { id: "web-apis", label: "Web APIs Runtime (8)", icon: Sparkles, count: 8 },
            { id: "overview", label: "Dashboard", icon: BarChart3 },
            { id: "explorer", label: "API Explorer", icon: Search, count: endpoints.length },
            { id: "super-admin", label: "Super Admin APIs", icon: ShieldCheck, count: superAdminEndpoints.length },
            { id: "console", label: "Interactive Console", icon: Terminal },
            { id: "auth-guide", label: "Auth Guide", icon: Key },
            { id: "permissions", label: "Permissions & RBAC", icon: ShieldCheck },
            { id: "integrations", label: "Integrations", icon: Network },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TAB 1: 8 WEB APIS RUNTIME ── */}
      {activeTab === "web-apis" && (
        <div className="space-y-6">
          <WebApisRuntimePanel />
        </div>
      )}

      {/* ── TAB 2: OVERVIEW ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-xs border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total API Endpoints</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{endpoints.length || 433}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Server className="size-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Super Admin Scope</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{superAdminEndpoints.length || 72}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <ShieldCheck className="size-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Web APIs Integrated</p>
                  <p className="text-2xl font-bold text-foreground mt-1">8 / 8</p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="size-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Service Architecture</p>
                  <p className="text-lg font-bold text-foreground mt-1">Multi-Tenant</p>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Building2 className="size-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-xs border-border">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Web APIs Quick Inspection</CardTitle>
              <CardDescription className="text-xs">
                Installed core browser APIs actively powering HRMS workflows.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {[
                  { name: "Web Storage API", desc: "Typed TTL + Cross-Tab Sync", status: "Active" },
                  { name: "Geolocation API", desc: "Clock-In & Geofence Verification", status: "Active" },
                  { name: "Clipboard API", desc: "1-Click Copy & Paste Reading", status: "Active" },
                  { name: "Fetch API", desc: "Resilient Backoff Retries", status: "Active" },
                  { name: "Notification API", desc: "Desktop Alerts & Audio Chime", status: "Active" },
                  { name: "Media Devices API", desc: "Webcam Selfie Punch-in & ID", status: "Active" },
                  { name: "Online/Offline API", desc: "Offline Queue & Auto-Sync", status: "Active" },
                  { name: "File API", desc: "Dropzone, Canvas Compress, CSV", status: "Active" },
                ].map((item) => (
                  <div key={item.name} className="p-3 rounded-lg border border-border bg-muted/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{item.name}</span>
                      <span className="size-2 rounded-full bg-emerald-500" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB 3: API EXPLORER ── */}
      {activeTab === "explorer" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search endpoints (e.g. /attendance, /tenants, /payroll)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                aria-label="Filter by HTTP method"
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="h-9 px-3 rounded-lg border border-border bg-card text-xs text-foreground"
              >
                <option value="ALL">All Methods</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>

              <select
                aria-label="Filter by module"
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="h-9 px-3 rounded-lg border border-border bg-card text-xs text-foreground max-w-[150px]"
              >
                <option value="ALL">All Modules</option>
                {modules.map((m: any) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden shadow-xs">
            {filteredEndpoints.slice(0, 50).map((ep: any) => (
              <div
                key={`${ep.method}-${ep.fullPath}`}
                className="p-3.5 hover:bg-muted/50 transition-colors flex items-center justify-between gap-4 cursor-pointer"
                onClick={() => setSelectedEndpoint(ep)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <MethodBadge method={ep.method} />
                  <span className="font-mono text-xs font-semibold text-foreground truncate">
                    {ep.fullPath}
                  </span>
                  <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">
                    {ep.module || "General"}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadEndpointToConsole(ep);
                    }}
                  >
                    <Terminal className="size-3" /> Test
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 4: SUPER ADMIN REST APIS ── */}
      {activeTab === "super-admin" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center gap-3">
            <ShieldCheck className="size-5 text-amber-500 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-foreground">Restricted Super Admin & Platform Endpoints:</span> Requires elevated Super Admin JWT token credentials.
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden shadow-xs">
            {superAdminEndpoints.map((ep: any) => (
              <div
                key={`${ep.method}-${ep.fullPath}`}
                className="p-3.5 hover:bg-muted/50 transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <MethodBadge method={ep.method} />
                  <span className="font-mono text-xs font-semibold text-foreground truncate">
                    {ep.fullPath}
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    super_admin
                  </Badge>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => loadEndpointToConsole(ep)}
                >
                  <Play className="size-3" /> Console
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 5: INTERACTIVE CONSOLE ── */}
      {activeTab === "console" && (
        <div className="space-y-4">
          <Card className="shadow-xs border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Live Sandbox API Console</CardTitle>
              <CardDescription className="text-xs">
                Execute live requests against the backend server with custom method, endpoint URL, and JSON payload.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  aria-label="Select HTTP method"
                  value={consoleMethod}
                  onChange={(e) => setConsoleMethod(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-border bg-card text-xs font-mono font-bold text-foreground"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
                <Input
                  value={consoleUrl}
                  onChange={(e) => setConsoleUrl(e.target.value)}
                  placeholder="/api/health"
                  className="h-9 text-xs font-mono flex-1"
                />
                <Button
                  size="sm"
                  className="h-9 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={executeApiCall}
                  disabled={isExecuting}
                >
                  {isExecuting ? <RefreshCw className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                  Send Request
                </Button>
              </div>

              {(consoleMethod === "POST" || consoleMethod === "PUT" || consoleMethod === "PATCH") && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">JSON Body</label>
                  <textarea
                    rows={4}
                    value={consoleBody}
                    onChange={(e) => setConsoleBody(e.target.value)}
                    placeholder='{ "key": "value" }'
                    className="w-full p-3 rounded-lg border border-border bg-muted/40 font-mono text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}

              {consoleResult && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Execution Response</label>
                  <div className="p-3 rounded-lg bg-muted/70 border border-border font-mono text-xs max-h-96 overflow-y-auto custom-scrollbar">
                    <pre>{JSON.stringify(consoleResult, null, 2)}</pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB 6: AUTH GUIDE ── */}
      {activeTab === "auth-guide" && (
        <Card className="shadow-xs border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Authentication & Token Specification</CardTitle>
            <CardDescription className="text-xs">
              Bearer token authorization standards for platform and workspace APIs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-muted/50 border border-border font-mono">
              Authorization: Bearer &lt;JWT_TOKEN&gt;
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Every authenticated route requires a valid JSON Web Token generated during workspace login or Super Admin authentication.
              Tokens carry tenant metadata (`tenantId`), user privileges (`roles`), and session identity.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── TAB 7: PERMISSIONS & RBAC ── */}
      {activeTab === "permissions" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { role: "Super Admin", slug: "super_admin", desc: "Global tenant provisioning, subscription catalog, platform backups." },
            { role: "Tenant Admin", slug: "tenant_admin", desc: "Workspace configuration, employee lifecycle, payroll approval." },
            { role: "HR Manager", slug: "hr_manager", desc: "Recruitment, attendance records, leave requests, appraisals." },
            { role: "Accountant", slug: "accountant", desc: "Invoicing, payment ledger, statutory reports, tax filing." },
            { role: "Cashier", slug: "cashier", desc: "POS checkout, cash registers, receipt thermal printing." },
            { role: "Employee (ESS)", slug: "employee", desc: "Clock-in punch, leave applications, payslip viewing." },
          ].map((r) => (
            <Card key={r.slug} className="shadow-xs border-border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">{r.role}</CardTitle>
                  <Badge variant="outline" className="text-[10px] font-mono">{r.slug}</Badge>
                </div>
                <CardDescription className="text-xs">{r.desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* ── TAB 8: INTEGRATIONS ── */}
      {activeTab === "integrations" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="shadow-xs border-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="size-4 text-emerald-500" /> Biometric IoT Gateway
              </CardTitle>
              <CardDescription className="text-xs">
                ZKTeco, eSSL, Realtime biometric punch synchronization via WebSocket/ODBC.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-xs border-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileSpreadsheet className="size-4 text-blue-500" /> Tally Prime XML Sync
              </CardTitle>
              <CardDescription className="text-xs">
                Bi-directional ledger export and voucher sync with Tally Prime 4.x.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* ── Endpoint Detail Dialog ── */}
      {selectedEndpoint && (
        <Dialog open={!!selectedEndpoint} onOpenChange={() => setSelectedEndpoint(null)}>
          <DialogContent className="max-w-2xl bg-card border-border text-foreground">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <MethodBadge method={selectedEndpoint.method} />
                <Badge variant="outline" className="text-xs">{selectedEndpoint.module}</Badge>
                <StatusBadge status={selectedEndpoint.status || "WORKING"} />
              </div>
              <DialogTitle className="font-mono text-sm font-bold text-foreground">
                {selectedEndpoint.fullPath}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {selectedEndpoint.description || "Endpoint specification and schema details."}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex items-center justify-between pt-2 border-t border-border">
              <Button size="sm" variant="outline" onClick={() => setSelectedEndpoint(null)} className="text-xs">
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  loadEndpointToConsole(selectedEndpoint);
                  setSelectedEndpoint(null);
                }}
                className="text-xs gap-1.5"
              >
                <Terminal className="size-3.5" /> Load in API Console
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
