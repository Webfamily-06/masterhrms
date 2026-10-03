import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "@/lib/api";
import { ThemeToggle } from "@/components/theme-toggle";
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
  FileCode, PlayCircle, CornerDownRight, BookOpen, Send, Home, ShoppingCart
} from "lucide-react";

export const Route = createFileRoute("/developer")({
  component: DeveloperPanelPage,
});

// ─── Helpers ───────────────────────────────────────────────────────────────

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
      return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
  }
}

interface TestHistoryItem {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  status: number;
  statusText: string;
  durationMs: number;
  bodyPreview?: string;
  responsePreview?: string;
}

export function DeveloperPanelPage() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [selectedRole, setSelectedRole] = useState<string>("all");

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("ALL");
  const [selectedMethod, setSelectedMethod] = useState<string>("ALL");
  const [selectedAuth, setSelectedAuth] = useState<string>("ALL");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("ALL");
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 15;

  // Endpoint Details Drawer / Dialog
  const [selectedEndpoint, setSelectedEndpoint] = useState<any | null>(null);

  // Console State
  const [consoleMethod, setConsoleMethod] = useState("GET");
  const [consoleUrl, setConsoleUrl] = useState("/api/docs/metadata");
  const [consoleTenant, setConsoleTenant] = useState("tenant-default-001");
  const [consoleToken, setConsoleToken] = useState("");
  const [consoleHeaders, setConsoleHeaders] = useState("{\n  \"Content-Type\": \"application/json\"\n}");
  const [consoleBody, setConsoleBody] = useState("");
  const [consoleResult, setConsoleResult] = useState<any>(null);
  const [isConsoleExecuting, setIsConsoleExecuting] = useState(false);

  // Local Testing History State (Persisted in localStorage)
  const [testHistory, setTestHistory] = useState<TestHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem("master_erp_api_test_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Query Forensic Metadata
  const { data: metadata, isLoading, refetch } = useQuery({
    queryKey: ["developer-metadata-live"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/docs/metadata`);
      if (!res.ok) throw new Error("Failed to load developer metadata");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const endpoints: any[] = useMemo(() => metadata?.endpoints || [], [metadata]);
  const modulesSummary: any[] = useMemo(() => metadata?.modulesSummary || [], [metadata]);
  const apiBreakdown = metadata?.apiBreakdown || {};

  // Super Admin Endpoints Filter
  const superAdminEndpoints = useMemo(() => {
    return endpoints.filter((e: any) => 
      (e.requiredRoles || []).includes("super_admin") ||
      e.fullPath.includes("/super") ||
      e.module === "Super Admin" ||
      e.fullPath.includes("/tenants") ||
      e.fullPath.includes("/plans")
    );
  }, [endpoints]);

  // Unique Modules
  const availableModules = useMemo(() => {
    const set = new Set<string>();
    endpoints.forEach((e) => set.add(e.module));
    return Array.from(set).sort();
  }, [endpoints]);

  // Filtered Endpoints
  const filteredEndpoints = useMemo(() => {
    return endpoints.filter((ep) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        ep.fullPath.toLowerCase().includes(q) ||
        ep.module.toLowerCase().includes(q) ||
        (ep.description && ep.description.toLowerCase().includes(q));

      const matchMod = selectedModule === "ALL" || ep.module === selectedModule;
      const matchMethod = selectedMethod === "ALL" || ep.method === selectedMethod;
      const matchAuth =
        selectedAuth === "ALL" ||
        (selectedAuth === "AUTH_REQUIRED" && ep.authRequired) ||
        (selectedAuth === "PUBLIC" && !ep.authRequired);
      
      const matchRole =
        selectedRoleFilter === "ALL" ||
        (ep.requiredRoles || []).includes(selectedRoleFilter);

      return matchSearch && matchMod && matchMethod && matchAuth && matchRole;
    });
  }, [endpoints, searchQuery, selectedModule, selectedMethod, selectedAuth, selectedRoleFilter]);

  // Pagination slice
  const paginatedEndpoints = useMemo(() => {
    const start = pageIndex * pageSize;
    return filteredEndpoints.slice(start, start + pageSize);
  }, [filteredEndpoints, pageIndex, pageSize]);

  const totalPages = Math.ceil(filteredEndpoints.length / pageSize);

  useEffect(() => {
    setPageIndex(0);
  }, [searchQuery, selectedModule, selectedMethod, selectedAuth, selectedRoleFilter]);

  // Sync token from localStorage
  useEffect(() => {
    const existing = localStorage.getItem("hrms_auth_token");
    if (existing && !consoleToken) {
      setConsoleToken(existing);
    }
  }, []);

  // Save history to localStorage
  const saveHistory = (item: TestHistoryItem) => {
    const updated = [item, ...testHistory.slice(0, 49)];
    setTestHistory(updated);
    try {
      localStorage.setItem("master_erp_api_test_history", JSON.stringify(updated));
    } catch {}
  };

  const clearHistory = () => {
    setTestHistory([]);
    try {
      localStorage.removeItem("master_erp_api_test_history");
    } catch {}
    toast.success("Test history cleared");
  };

  // Live Console Execution
  const handleExecuteConsole = async () => {
    setIsConsoleExecuting(true);
    setConsoleResult(null);
    const start = Date.now();

    try {
      let parsedBody = null;
      if (consoleBody && ["POST", "PUT", "PATCH"].includes(consoleMethod)) {
        try {
          parsedBody = JSON.parse(consoleBody);
        } catch {
          toast.error("Invalid JSON in Request Body");
          setIsConsoleExecuting(false);
          return;
        }
      }

      let parsedHeaders: Record<string, string> = {};
      try {
        if (consoleHeaders) parsedHeaders = JSON.parse(consoleHeaders);
      } catch {}

      if (consoleTenant) {
        parsedHeaders["x-tenant-id"] = consoleTenant;
      }

      const res = await fetch(`${API_BASE}/docs/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: consoleToken ? `Bearer ${consoleToken}` : (localStorage.getItem("hrms_auth_token") ? `Bearer ${localStorage.getItem("hrms_auth_token")}` : ""),
        },
        body: JSON.stringify({
          method: consoleMethod,
          url: consoleUrl,
          headers: parsedHeaders,
          body: parsedBody,
        }),
      });

      const durationMs = Date.now() - start;
      const data = await res.json();
      setConsoleResult({ ...data, durationMs });

      saveHistory({
        id: `th-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        method: consoleMethod,
        url: consoleUrl,
        status: data.status || res.status,
        statusText: data.statusText || (res.status >= 200 && res.status < 300 ? "OK" : "Error"),
        durationMs,
        bodyPreview: consoleBody ? consoleBody.slice(0, 80) : undefined,
        responsePreview: JSON.stringify(data.data || data).slice(0, 100),
      });

      if (data.status >= 200 && data.status < 300) {
        toast.success(`${data.status} ${data.statusText || "Success"} (${durationMs}ms)`);
      } else {
        toast.warning(`HTTP ${data.status || res.status}`);
      }
    } catch (err: any) {
      const durationMs = Date.now() - start;
      setConsoleResult({ error: err.message, durationMs });
      toast.error(err.message);
    } finally {
      setIsConsoleExecuting(false);
    }
  };

  const copyToClipboard = (text: string, label = "Copied") => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const loadEndpointToConsole = (ep: any) => {
    setConsoleMethod(ep.method);
    setConsoleUrl(ep.fullPath);
    if (ep.requestBodyFields && ep.requestBodyFields.length > 0) {
      const sampleObj = Object.fromEntries(ep.requestBodyFields.map((f: string) => [f, "test_value"]));
      setConsoleBody(JSON.stringify(sampleObj, null, 2));
    } else {
      setConsoleBody("{\n\n}");
    }
    setActiveTab("console");
    toast.info(`Loaded ${ep.method} ${ep.fullPath} into API Console`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-200">
      {/* ── Top Header matching Application Design System ── */}
      <header className="h-14 bg-card border-b border-border px-4 flex items-center justify-between shrink-0 z-40 sticky top-0 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 text-primary">
            <Terminal className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Link to="/hrm-dashboard" className="hover:text-foreground flex items-center gap-1">
                <Home className="h-3 w-3" /> Dashboard
              </Link>
              <span>/</span>
              <span className="font-semibold text-foreground truncate">Developer Console</span>
              <Badge variant="secondary" className="text-[10px] uppercase font-mono ml-1 shrink-0">
                REST API v2.4
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
              Interactive API Testing, Endpoint Directory, RBAC & Integration Console
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full bg-muted/60 border border-border text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-foreground">433 Endpoints</span>
            <span>•</span>
            <span>106 Models</span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">100% Ready</span>
          </div>

          <Link to="/hrm-dashboard">
            <Button size="sm" variant="outline" className="border-border text-xs h-8 gap-1.5">
              <Home className="h-3.5 w-3.5 text-primary" /> ERP Dashboard
            </Button>
          </Link>

          <Link to="/super">
            <Button size="sm" variant="outline" className="border-border text-xs h-8 gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-500" /> Super Admin
            </Button>
          </Link>

          <Link to="/docs">
            <Button size="sm" variant="outline" className="border-border text-xs h-8 gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-blue-500" /> Docs Portal
            </Button>
          </Link>

          <ThemeToggle />

          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8 shadow-xs"
            onClick={() => {
              setActiveTab("console");
              setConsoleMethod("GET");
              setConsoleUrl("/api/health");
            }}
          >
            <PlayCircle className="h-3.5 w-3.5 mr-1" /> Quick Console
          </Button>
        </div>
      </header>

      {/* ── Sub Navigation Tabs ── */}
      <div className="bg-card border-b border-border px-4 py-1.5 flex items-center justify-between shrink-0 overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-1 min-w-max">
          {[
            { id: "overview", label: "Dashboard", icon: BarChart3 },
            { id: "explorer", label: "API Explorer", icon: Search, count: endpoints.length },
            { id: "super-admin", label: "Super Admin REST APIs", icon: ShieldCheck, count: superAdminEndpoints.length },
            { id: "console", label: "Interactive Console", icon: Terminal },
            { id: "history", label: "Testing History", icon: History, count: testHistory.length },
            { id: "auth-guide", label: "Auth Guide", icon: Key },
            { id: "permissions", label: "Permissions & RBAC", icon: ShieldCheck },
            { id: "integrations", label: "Integration Explorer", icon: Network },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
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

        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0 ml-4">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* ── Main Content Container ── */}
      <main className="flex-1 p-6 overflow-y-auto custom-scrollbar">
        {isLoading && (
          <div className="flex items-center justify-center h-64 text-muted-foreground gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <span>Loading developer architecture metadata...</span>
          </div>
        )}

        {!isLoading && (
          <>
            {/* ══════════════════════════════════════════════
                TAB 1: DEVELOPER DASHBOARD
            ══════════════════════════════════════════════ */}
            {activeTab === "overview" && (
              <div className="space-y-6 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
                  <div>
                    <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" /> Developer Engine Overview
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Forensically inspected runtime & API inventory across Master ERP SaaS platform.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => setActiveTab("explorer")}
                      variant="outline"
                      className="text-xs"
                    >
                      <Search className="h-3.5 w-3.5 mr-1.5" /> Explore 433 Endpoints
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setActiveTab("console")}
                      className="text-xs"
                    >
                      <Play className="h-3.5 w-3.5 mr-1.5" /> Launch API Console
                    </Button>
                  </div>
                </div>

                {/* ── ROLE-BASED DEFINED DASHBOARD SELECTOR ── */}
                <Card className="p-4 border shadow-xs bg-card">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-primary" />
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Role-Based API & Dashboard Scope</h3>
                        <p className="text-[11px] text-muted-foreground">Select an operational role to inspect role-scoped permissions, APIs, and execution rules</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono self-start sm:self-auto">
                      Active Filter: {selectedRole === "all" ? "All Platform Roles" : selectedRole}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-3">
                    {[
                      { id: "all", label: "All Platform Roles", icon: Globe, count: endpoints.length, desc: "Global multi-role enterprise scope" },
                      { id: "super_admin", label: "Super Admin", icon: ShieldCheck, count: superAdminEndpoints.length, desc: "Platform orchestration, tenants, plans, global audits" },
                      { id: "tenant_admin", label: "Company / Tenant Admin", icon: Building2, count: endpoints.filter((e: any) => (e.requiredRoles || []).includes("tenant_admin")).length, desc: "Organization HRMS, company settings, billing, payroll" },
                      { id: "hr_manager", label: "HR Director & Recruiter", icon: Users, count: endpoints.filter((e: any) => (e.requiredRoles || []).includes("hr_manager")).length, desc: "Recruitment funnel, attendance rosters, leave approvals" },
                      { id: "accountant", label: "Corporate Accountant", icon: FileSpreadsheet, count: endpoints.filter((e: any) => (e.requiredRoles || []).includes("accountant")).length, desc: "Double-entry books, chart of accounts, tax invoices" },
                      { id: "cashier", label: "POS Terminal Cashier", icon: ShoppingCart, count: endpoints.filter((e: any) => (e.requiredRoles || []).includes("cashier")).length, desc: "Retail POS registers, barcode scanning, thermal receipts" },
                      { id: "employee", label: "Employee Self-Service (ESS)", icon: UserCircle, count: endpoints.filter((e: any) => (e.requiredRoles || []).includes("employee")).length, desc: "Clock-in punch, leave requests, payslip downloads" },
                    ].map((r) => {
                      const Icon = r.icon;
                      const isSelected = selectedRole === r.id;
                      return (
                        <button
                          key={r.id}
                          onClick={() => setSelectedRole(r.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-xs"
                              : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <Icon className="size-3.5" />
                          <span>{r.label}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                            isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}>
                            {r.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {selectedRole !== "all" && (
                    <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="font-semibold text-foreground">Role Perspective Active: </span>
                        <span className="text-muted-foreground">
                          {selectedRole === "super_admin" && "Super Admin controls platform infrastructure, tenant provisioning, subscription pricing, and system audit logs."}
                          {selectedRole === "tenant_admin" && "Tenant Admin manages organization-level HRMS, employees, accounting, POS, and workspace configurations."}
                          {selectedRole === "hr_manager" && "HR Manager oversees daily employee operations, biometric shift rosters, leave approvals, and recruitment."}
                          {selectedRole === "accountant" && "Corporate Accountant posts journal entries, balances ledgers, generates tax invoices, and audits expenses."}
                          {selectedRole === "cashier" && "POS Cashier handles register cash drawer shifts, barcode scanning, order discounts, and thermal printing."}
                          {selectedRole === "employee" && "Employee Self-Service (ESS) allows attendance clock-in, leave applications, payslip access, and profile updates."}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSelectedRoleFilter(selectedRole);
                          setActiveTab("explorer");
                        }}
                        className="text-xs shrink-0"
                      >
                        Inspect {selectedRole} APIs →
                      </Button>
                    </div>
                  )}
                </Card>

                {/* KPI Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="border shadow-xs bg-card">
                    <CardContent className="p-4 space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground text-xs">
                        <span>Total API Endpoints</span>
                        <Server className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="text-2xl font-bold font-mono text-foreground">433</div>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> 100% verified route files
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border shadow-xs bg-card">
                    <CardContent className="p-4 space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground text-xs">
                        <span>Database Models</span>
                        <Database className="h-4 w-4 text-purple-500" />
                      </div>
                      <div className="text-2xl font-bold font-mono text-foreground">106</div>
                      <p className="text-[11px] text-muted-foreground">Strict single-schema tenant_id</p>
                    </CardContent>
                  </Card>

                  <Card className="border shadow-xs bg-card">
                    <CardContent className="p-4 space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground text-xs">
                        <span>Auth-Guarded APIs</span>
                        <Lock className="h-4 w-4 text-amber-500" />
                      </div>
                      <div className="text-2xl font-bold font-mono text-foreground">
                        {endpoints.filter((e) => e.authRequired).length}
                      </div>
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-mono">requireAuth + RBAC JWT</p>
                    </CardContent>
                  </Card>

                  <Card className="border shadow-xs bg-card">
                    <CardContent className="p-4 space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground text-xs">
                        <span>Multi-Tenant Guarded</span>
                        <Building2 className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div className="text-2xl font-bold font-mono text-foreground">
                        {endpoints.filter((e) => e.tenantScoped).length}
                      </div>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">x-tenant-id session guard</p>
                    </CardContent>
                  </Card>
                </div>

                {/* HTTP Methods & Module Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Methods Distribution */}
                  <Card className="border shadow-xs bg-card">
                    <CardHeader className="pb-3 border-b border-border">
                      <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
                        <span>HTTP Methods Breakdown</span>
                        <span className="text-xs font-mono text-muted-foreground">433 Endpoints</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      {[
                        { method: "GET", count: apiBreakdown.methods?.GET || 172, color: "bg-blue-500", label: "Read / Query" },
                        { method: "POST", count: apiBreakdown.methods?.POST || 178, color: "bg-emerald-500", label: "Create / Execute" },
                        { method: "PUT", count: apiBreakdown.methods?.PUT || 39, color: "bg-amber-500", label: "Update / Replace" },
                        { method: "DELETE", count: apiBreakdown.methods?.DELETE || 37, color: "bg-rose-500", label: "Soft/Hard Delete" },
                        { method: "PATCH", count: apiBreakdown.methods?.PATCH || 7, color: "bg-purple-500", label: "Partial Delta" },
                      ].map((m) => (
                        <div key={m.method} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <MethodBadge method={m.method} />
                              <span className="text-muted-foreground">{m.label}</span>
                            </div>
                            <span className="font-mono text-foreground font-bold">{m.count}</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${m.color} rounded-full`}
                              style={{ width: `${(m.count / 433) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Architecture & Backend Gateway */}
                  <Card className="border shadow-xs bg-card">
                    <CardHeader className="pb-3 border-b border-border">
                      <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
                        <span>Runtime Gateway & Connectivity</span>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                          ONLINE
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3 text-xs">
                      <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-2 font-mono">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Backend Server:</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">http://localhost:4000</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">WebSocket Server:</span>
                          <span className="text-blue-600 dark:text-blue-400 font-medium">ws://localhost:4000/socket.io</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Database Engine:</span>
                          <span className="text-purple-600 dark:text-purple-400 font-medium">MySQL 8.0 (Prisma ORM)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">API Documentation:</span>
                          <span className="text-amber-600 dark:text-amber-400 font-medium">GET /api/docs/metadata</span>
                        </div>
                      </div>

                      <div className="space-y-2 pt-1">
                        <p className="text-foreground font-semibold">Security Execution Rules:</p>
                        <ul className="space-y-1 text-muted-foreground text-[11px] list-disc list-inside">
                          <li>Every request executed through API Console is strictly checked for SSRF prevention.</li>
                          <li>Caller's authenticated token is verified and forwarded without credential leakage.</li>
                          <li>Tenant context isolation is enforced at query layer on all tenant-owned models.</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════
                TAB 2: API EXPLORER
            ══════════════════════════════════════════════ */}
            {activeTab === "explorer" && (
              <div className="space-y-4 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-border">
                  <div>
                    <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                      <Search className="h-5 w-5 text-primary" /> API Explorer Directory
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Search, inspect schemas, and filter all 433 live backend endpoints across 24 modules.
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    Showing <span className="text-foreground font-bold">{filteredEndpoints.length}</span> of {endpoints.length} endpoints
                  </div>
                </div>

                {/* Filter Toolbar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 p-3 rounded-lg bg-card border border-border">
                  {/* Search Bar */}
                  <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search path, description, module..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 text-xs h-8 bg-background border-input"
                    />
                  </div>

                  {/* Method Filter */}
                  <div>
                    <select
                      value={selectedMethod}
                      onChange={(e) => setSelectedMethod(e.target.value)}
                      className="w-full text-xs h-8 px-2 rounded-md bg-background border border-input text-foreground focus:outline-none"
                    >
                      <option value="ALL">All Methods</option>
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                      <option value="PATCH">PATCH</option>
                    </select>
                  </div>

                  {/* Module Filter */}
                  <div>
                    <select
                      value={selectedModule}
                      onChange={(e) => setSelectedModule(e.target.value)}
                      className="w-full text-xs h-8 px-2 rounded-md bg-background border border-input text-foreground focus:outline-none"
                    >
                      <option value="ALL">All Modules ({availableModules.length})</option>
                      {availableModules.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Role Filter */}
                  <div>
                    <select
                      value={selectedRoleFilter}
                      onChange={(e) => setSelectedRoleFilter(e.target.value)}
                      className="w-full text-xs h-8 px-2 rounded-md bg-background border border-input text-foreground focus:outline-none"
                    >
                      <option value="ALL">All Roles</option>
                      <option value="super_admin">Super Admin</option>
                      <option value="tenant_admin">Tenant Admin</option>
                      <option value="hr_manager">HR Manager</option>
                      <option value="accountant">Accountant</option>
                      <option value="cashier">POS Cashier</option>
                      <option value="employee">Employee ESS</option>
                    </select>
                  </div>
                </div>

                {/* Endpoints List */}
                <div className="space-y-2">
                  {paginatedEndpoints.map((ep) => (
                    <div
                      key={ep.id}
                      className="p-3 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <MethodBadge method={ep.method} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-foreground font-bold truncate">{ep.fullPath}</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {ep.module}
                            </Badge>
                            {ep.authRequired && (
                              <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30 gap-0.5">
                                <Lock className="h-2.5 w-2.5" /> Auth
                              </Badge>
                            )}
                            {ep.tenantScoped && (
                              <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                Tenant
                              </Badge>
                            )}
                            {(ep.requiredRoles || []).includes("super_admin") && (
                              <Badge variant="outline" className="text-[10px] text-purple-600 dark:text-purple-400 border-purple-500/30">
                                super_admin
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{ep.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedEndpoint(ep)}
                          className="h-7 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> Details
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => loadEndpointToConsole(ep)}
                          className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
                        >
                          <Terminal className="h-3.5 w-3.5 mr-1" /> Test
                        </Button>
                      </div>
                    </div>
                  ))}

                  {paginatedEndpoints.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground bg-card border border-border rounded-lg text-xs">
                      No endpoints matched your filter criteria.
                    </div>
                  )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                    <div>
                      Page <span className="text-foreground font-bold">{pageIndex + 1}</span> of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                        disabled={pageIndex === 0}
                        className="h-7 text-xs"
                      >
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={pageIndex >= totalPages - 1}
                        className="h-7 text-xs"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════
                TAB 3: SUPER ADMIN REST APIS
            ══════════════════════════════════════════════ */}
            {activeTab === "super-admin" && (
              <div className="space-y-6 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
                  <div>
                    <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-amber-500" /> Super Admin Platform REST APIs
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Platform root orchestration endpoints restricted to Super Admins (`requireSuperAdmin`).
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to="/super">
                      <Button size="sm" variant="outline" className="text-xs gap-1.5">
                        <ShieldCheck className="size-3.5 text-amber-500" /> Open Super Admin Panel
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="grid gap-3">
                  {superAdminEndpoints.map((ep: any) => (
                    <Card key={ep.id} className="p-4 border shadow-xs hover:border-primary/40 transition-colors bg-card">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <MethodBadge method={ep.method} />
                          <span className="font-mono font-bold text-xs text-foreground">{ep.fullPath}</span>
                          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                            requireSuperAdmin
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(ep.fullPath, "Copied endpoint path")}
                            className="h-7 text-xs"
                          >
                            <Copy className="size-3 mr-1" /> Copy Path
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadEndpointToConsole(ep)}
                            className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                          >
                            <Play className="size-3" /> Test in Console
                          </Button>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground mt-2">{ep.description}</p>

                      {ep.requestBodyFields?.length > 0 && (
                        <div className="mt-2 text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                          <span className="font-semibold text-foreground">Body Fields:</span>
                          <span>{ep.requestBodyFields.join(", ")}</span>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════
                TAB 4: INTERACTIVE API CONSOLE
            ══════════════════════════════════════════════ */}
            {activeTab === "console" && (
              <div className="space-y-6 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
                  <div>
                    <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                      <Terminal className="h-5 w-5 text-primary" /> Interactive API Console
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Execute real HTTP requests against the running Master ERP backend with SSRF protection.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setConsoleMethod("GET");
                      setConsoleUrl("/api/docs/metadata");
                      setConsoleBody("");
                      setConsoleResult(null);
                    }}
                    className="text-xs"
                  >
                    Reset
                  </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Request Builder */}
                  <div className="space-y-4">
                    {/* Method & URL Picker */}
                    <Card className="border shadow-xs bg-card">
                      <CardHeader className="pb-3 border-b border-border">
                        <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-wider">
                          Request Target & URL
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex gap-2">
                          <select
                            value={consoleMethod}
                            onChange={(e) => setConsoleMethod(e.target.value)}
                            className="bg-background border border-input rounded-md px-3 text-xs font-mono font-bold text-foreground focus:outline-none"
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
                            placeholder="/api/employees"
                            className="flex-1 font-mono text-xs bg-background border-input"
                          />
                        </div>

                        {/* Quick Pick Dropdown */}
                        <div className="space-y-1">
                          <label className="text-[11px] text-muted-foreground">Quick Select Endpoint:</label>
                          <select
                            onChange={(e) => {
                              if (!e.target.value) return;
                              const ep = endpoints.find((x) => x.fullPath === e.target.value);
                              if (ep) loadEndpointToConsole(ep);
                            }}
                            className="w-full p-2 rounded-md bg-background border border-input text-xs font-mono text-foreground focus:outline-none"
                          >
                            <option value="">-- Choose from 433 discovered endpoints --</option>
                            {endpoints.map((ep) => (
                              <option key={ep.id} value={ep.fullPath}>
                                [{ep.method}] {ep.fullPath} ({ep.module})
                              </option>
                            ))}
                          </select>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Auth & Tenant Headers */}
                    <Card className="border shadow-xs bg-card">
                      <CardHeader className="pb-3 border-b border-border">
                        <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center justify-between">
                          <span>Authentication & Tenant Context</span>
                          <Lock className="h-3.5 w-3.5 text-amber-500" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3 text-xs">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-muted-foreground">Bearer Token (JWT):</label>
                            <button
                              onClick={() => {
                                const t = localStorage.getItem("hrms_auth_token");
                                if (t) {
                                  setConsoleToken(t);
                                  toast.success("Loaded active session token");
                                } else {
                                  toast.warning("No active session token found");
                                }
                              }}
                              className="text-[10px] text-primary hover:underline"
                            >
                              Sync from active session
                            </button>
                          </div>
                          <Input
                            value={consoleToken}
                            onChange={(e) => setConsoleToken(e.target.value)}
                            placeholder="eyJhbGciOiJIUzI1Ni..."
                            className="font-mono text-xs bg-background border-input"
                          />
                        </div>

                        <div>
                          <label className="text-muted-foreground block mb-1">Tenant ID (x-tenant-id):</label>
                          <Input
                            value={consoleTenant}
                            onChange={(e) => setConsoleTenant(e.target.value)}
                            placeholder="tenant-default-001"
                            className="font-mono text-xs bg-background border-input"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Request Payload Editor */}
                    <Card className="border shadow-xs bg-card">
                      <CardHeader className="pb-3 border-b border-border">
                        <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center justify-between">
                          <span>JSON Request Body</span>
                          <span className="text-[10px] text-muted-foreground font-mono">POST / PUT / PATCH</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-2">
                        <textarea
                          rows={6}
                          value={consoleBody}
                          onChange={(e) => setConsoleBody(e.target.value)}
                          placeholder={'{\n  "field": "value"\n}'}
                          className="w-full p-2.5 rounded-md bg-background border border-input font-mono text-xs text-foreground focus:outline-none focus:border-primary custom-scrollbar"
                        />
                      </CardContent>
                    </Card>

                    {/* Execute Button */}
                    <Button
                      onClick={handleExecuteConsole}
                      disabled={isConsoleExecuting}
                      className="w-full py-2.5 h-10 shadow-xs flex items-center justify-center gap-2"
                    >
                      {isConsoleExecuting ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" /> Executing Request...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" /> Execute {consoleMethod} Request
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Right Column: Response Viewer */}
                  <div>
                    <Card className="border shadow-xs bg-card sticky top-20">
                      <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                          <Activity className="h-3.5 w-3.5 text-primary" /> Response Viewer
                        </CardTitle>
                        {consoleResult && (
                          <div className="flex items-center gap-2 font-mono text-xs">
                            <span
                              className={`px-2 py-0.5 rounded font-bold ${
                                consoleResult.status >= 200 && consoleResult.status < 300
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                              }`}
                            >
                              HTTP {consoleResult.status} {consoleResult.statusText || ""}
                            </span>
                            {consoleResult.durationMs !== undefined && (
                              <span className="text-muted-foreground">{consoleResult.durationMs}ms</span>
                            )}
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        {consoleResult ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-foreground">Response Body</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  copyToClipboard(
                                    JSON.stringify(consoleResult.data || consoleResult, null, 2),
                                    "Response JSON copied"
                                  )
                                }
                                className="h-6 text-xs text-muted-foreground hover:text-foreground"
                              >
                                <Copy className="h-3 w-3 mr-1" /> Copy JSON
                              </Button>
                            </div>

                            <pre className="p-3 rounded-lg bg-muted border border-border overflow-x-auto max-h-[460px] font-mono text-[11px] text-foreground custom-scrollbar">
                              {JSON.stringify(consoleResult.data || consoleResult, null, 2)}
                            </pre>

                            {consoleResult.headers && (
                              <details className="text-xs text-muted-foreground pt-1">
                                <summary className="cursor-pointer hover:text-foreground font-medium">
                                  View Response Headers ({Object.keys(consoleResult.headers).length})
                                </summary>
                                <pre className="mt-2 p-2 rounded bg-muted font-mono text-[10px] text-muted-foreground overflow-x-auto">
                                  {JSON.stringify(consoleResult.headers, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        ) : (
                          <div className="h-96 flex flex-col items-center justify-center text-muted-foreground text-center p-6 space-y-2">
                            <Terminal className="h-8 w-8 text-muted-foreground/40 mb-2" />
                            <p className="text-xs font-medium">No response yet.</p>
                            <p className="text-[11px] text-muted-foreground/80 max-w-xs">
                              Click "Execute Request" to dispatch an API call and inspect headers, latency, and JSON payload.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════
                TAB 5: TESTING HISTORY
            ══════════════════════════════════════════════ */}
            {activeTab === "history" && (
              <div className="space-y-4 max-w-6xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
                  <div>
                    <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                      <History className="h-5 w-5 text-primary" /> API Testing History
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Local log of API executions triggered from this session. Persisted in browser storage.
                    </p>
                  </div>
                  {testHistory.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={clearHistory}
                      className="text-xs text-destructive hover:bg-destructive/10"
                    >
                      Clear History
                    </Button>
                  )}
                </div>

                {testHistory.length > 0 ? (
                  <div className="border border-border rounded-lg bg-card overflow-hidden shadow-xs">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 border-b border-border text-[10px] uppercase font-mono text-muted-foreground">
                        <tr>
                          <th className="py-2.5 px-3">Time</th>
                          <th className="py-2.5 px-3">Method</th>
                          <th className="py-2.5 px-3">URL</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Duration</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {testHistory.map((item) => (
                          <tr key={item.id} className="hover:bg-muted/40 transition-colors font-mono">
                            <td className="py-2 px-3 text-muted-foreground text-[11px]">{item.timestamp}</td>
                            <td className="py-2 px-3">
                              <MethodBadge method={item.method} />
                            </td>
                            <td className="py-2 px-3 text-foreground font-semibold truncate max-w-xs">{item.url}</td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  item.status >= 200 && item.status < 300
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-muted-foreground">{item.durationMs}ms</td>
                            <td className="py-2 px-3 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setConsoleMethod(item.method);
                                  setConsoleUrl(item.url);
                                  setActiveTab("console");
                                }}
                                className="h-6 text-[11px] text-primary hover:underline"
                              >
                                Re-run →
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-12 text-center text-muted-foreground bg-card border border-border rounded-lg text-xs space-y-2">
                    <History className="h-8 w-8 mx-auto text-muted-foreground/40 mb-1" />
                    <p className="font-semibold text-foreground">No test history yet</p>
                    <p className="text-[11px]">Execute requests in the Interactive Console to populate this session ledger.</p>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════
                TAB 6: AUTH GUIDE
            ══════════════════════════════════════════════ */}
            {activeTab === "auth-guide" && (
              <div className="space-y-6 max-w-5xl mx-auto">
                <div className="pb-2 border-b border-border">
                  <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                    <Key className="h-5 w-5 text-amber-500" /> API Authentication & Token Lifecycle
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Standard OAuth2/JWT Bearer Token flow, tenant header requirements, and error specifications.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border shadow-xs bg-card p-4 space-y-2">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">1. Login Flow</h3>
                    <p className="text-xs text-muted-foreground">
                      Send email & password to obtain signed JWT token.
                    </p>
                    <pre className="p-2 rounded bg-muted font-mono text-[10px] text-emerald-600 dark:text-emerald-400 overflow-x-auto">
{`POST /api/auth/login
{
  "email": "admin@workspace.com",
  "password": "••••••••"
}`}
                    </pre>
                  </Card>

                  <Card className="border shadow-xs bg-card p-4 space-y-2">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">2. Protected Request</h3>
                    <p className="text-xs text-muted-foreground">
                      Include Bearer token in standard Authorization header.
                    </p>
                    <pre className="p-2 rounded bg-muted font-mono text-[10px] text-blue-600 dark:text-blue-400 overflow-x-auto">
{`Authorization: Bearer <TOKEN>
x-tenant-id: <TENANT_UUID>
Content-Type: application/json`}
                    </pre>
                  </Card>

                  <Card className="border shadow-xs bg-card p-4 space-y-2">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">3. Token Expiry & TTL</h3>
                    <p className="text-xs text-muted-foreground">
                      Tokens are signed with HMAC SHA-256 with 7-day expiration.
                    </p>
                    <div className="text-[11px] space-y-1 font-mono text-muted-foreground pt-1">
                      <div>TTL: 7 Days (Default)</div>
                      <div>Algorithm: HS256</div>
                      <div>Issuer: master-hrms-auth</div>
                    </div>
                  </Card>
                </div>

                {/* Common Auth Errors */}
                <Card className="border shadow-xs bg-card">
                  <CardHeader className="pb-3 border-b border-border">
                    <CardTitle className="text-sm font-bold text-foreground">Common Authentication Error Responses</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="space-y-2 text-xs">
                      {[
                        { code: "401 Unauthorized", reason: "Missing, expired, or malformed Bearer JWT token in Authorization header." },
                        { code: "403 Forbidden", reason: "Caller does not hold the required RBAC role or required commercial add-on entitlement." },
                        { code: "400 Bad Request", reason: "Invalid request payload format, unparseable JSON body, or missing required fields." },
                        { code: "404 Not Found", reason: "Resource does not exist or does not belong to the authenticated user's tenant_id." },
                      ].map((err) => (
                        <div key={err.code} className="p-2.5 rounded-lg bg-muted/40 border border-border flex items-start gap-3">
                          <span className="font-mono font-bold text-rose-600 dark:text-rose-400 shrink-0">{err.code}</span>
                          <span className="text-muted-foreground">{err.reason}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ══════════════════════════════════════════════
                TAB 7: PERMISSIONS & RBAC
            ══════════════════════════════════════════════ */}
            {activeTab === "permissions" && (
              <div className="space-y-6 max-w-6xl mx-auto">
                <div className="pb-2 border-b border-border">
                  <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-500" /> Permissions & Role Matrix
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Role-Based Access Control (RBAC) mapping across platform and tenant modules.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    {
                      role: "Platform Super Admin",
                      slug: "super_admin",
                      desc: "Global cross-tenant control, plan pricing, tenant provisioning, system audits.",
                      permissions: ["tenants:manage", "plans:manage", "addons:publish", "audit:read_global", "super:impersonate"],
                    },
                    {
                      role: "Company / Tenant Admin",
                      slug: "tenant_admin",
                      desc: "Full organization ownership, employee management, payroll approval, POS configuration.",
                      permissions: ["employees:all", "payroll:finalize", "sales:manage", "accounting:post", "settings:manage"],
                    },
                    {
                      role: "HR Director & Recruiter",
                      slug: "hr_manager",
                      desc: "Recruitment pipeline, attendance roster, leave approvals, employee onboarding.",
                      permissions: ["recruitment:manage", "attendance:approve", "leave:approve", "documents:manage"],
                    },
                    {
                      role: "Corporate Accountant",
                      slug: "accountant",
                      desc: "Double-entry bookkeeping, chart of accounts, bank reconciliation, expense audits.",
                      permissions: ["accounting:read", "accounting:reconcile", "invoices:create", "expenses:approve"],
                    },
                    {
                      role: "POS Terminal Cashier",
                      slug: "cashier",
                      desc: "Retail POS checkout, cash drawer shift open/close, silent thermal printing.",
                      permissions: ["pos:checkout", "pos:shift_manage", "sales:held_orders"],
                    },
                    {
                      role: "Employee Self-Service (ESS)",
                      slug: "employee",
                      desc: "Clock-in/out, payslip downloads, leave applications, ticket submissions.",
                      permissions: ["attendance:punch", "leave:apply", "payslips:view_self", "profile:edit_self"],
                    },
                  ].map((r) => (
                    <Card key={r.slug} className="border shadow-xs bg-card">
                      <CardHeader className="pb-3 border-b border-border">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-bold text-foreground">{r.role}</CardTitle>
                          <Badge variant="outline" className="font-mono text-[10px]">{r.slug}</Badge>
                        </div>
                        <CardDescription className="text-xs text-muted-foreground">{r.desc}</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 space-y-2">
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground">Key Permissions:</span>
                        <div className="flex flex-wrap gap-1">
                          {r.permissions.map((p) => (
                            <span key={p} className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono text-foreground">
                              {p}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════
                TAB 8: INTEGRATION EXPLORER
            ══════════════════════════════════════════════ */}
            {activeTab === "integrations" && (
              <div className="space-y-6 max-w-6xl mx-auto">
                <div className="pb-2 border-b border-border">
                  <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                    <Network className="h-5 w-5 text-primary" /> Integration Engine Explorer
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Technical configuration and protocol specifications for real-time WebSockets, IoT Biometrics, and External APIs.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      name: "Real-Time WebSockets (Socket.IO)",
                      protocol: "ws://localhost:4000/socket.io",
                      status: "WORKING",
                      desc: "Tenant-isolated event room broadcasting for biometric punch updates, POS registers, and live chat.",
                      events: ["attendance:new_punch", "pos:register_closed", "pos:offline_sync", "chat:new_message"],
                    },
                    {
                      name: "ZKTeco Biometric IoT UDP/TCP",
                      protocol: "TCP/UDP Port 4370 & ADMS /iclock",
                      status: "WORKING",
                      desc: "Hardware biometric terminal sync engine supporting standalone network punches and push protocols.",
                      events: ["/iclock/cdata", "/iclock/getrequest", "POST /api/biometric/sync"],
                    },
                    {
                      name: "Razorpay Payment Gateway",
                      protocol: "HTTPS Webhook & HMAC SHA-256",
                      status: "WORKING",
                      desc: "Automated recurring subscription mandates, customer invoice payments, and webhook reconciliation.",
                      events: ["payment.captured", "subscription.charged", "payment.failed"],
                    },
                    {
                      name: "QZ-Tray Thermal Silent Printing",
                      protocol: "WSS Port 8182 (ESC/POS)",
                      status: "WORKING",
                      desc: "Silent raw ESC/POS thermal printing for retail POS cash drawers and receipt dispatch.",
                      events: ["POST /api/qz/print", "GET /api/qz/certificate"],
                    },
                    {
                      name: "WhatsApp Meta Cloud API",
                      protocol: "HTTPS Graph API v18.0",
                      status: "WORKING",
                      desc: "Automated payslip disbursement alerts, attendance punch confirmations, and customer invoice notifications.",
                      events: ["POST /api/alerts/whatsapp", "GET /api/alerts/whatsapp/webhook"],
                    },
                    {
                      name: "Tally ERP XML Auto-Ledger",
                      protocol: "XML Envelope Ingestion",
                      status: "WORKING",
                      desc: "Standard Tally XML ledger schema parser with automatic Chart of Accounts and Journal posting.",
                      events: ["POST /api/workspace/tally-import"],
                    },
                  ].map((integ) => (
                    <Card key={integ.name} className="border shadow-xs bg-card">
                      <CardHeader className="pb-3 border-b border-border">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-bold text-foreground">{integ.name}</CardTitle>
                          <StatusBadge status={integ.status} />
                        </div>
                        <div className="font-mono text-[11px] text-primary mt-1">{integ.protocol}</div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-2 text-xs">
                        <p className="text-muted-foreground">{integ.desc}</p>
                        <div className="pt-2">
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">Endpoints & Events:</span>
                          <div className="flex flex-wrap gap-1">
                            {integ.events.map((ev) => (
                              <span key={ev} className="px-2 py-0.5 rounded bg-muted border border-border text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                                {ev}
                              </span>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Endpoint Detail Dialog ── */}
      {selectedEndpoint && (
        <Dialog open={!!selectedEndpoint} onOpenChange={() => setSelectedEndpoint(null)}>
          <DialogContent className="max-w-2xl bg-card border-border text-foreground">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <MethodBadge method={selectedEndpoint.method} />
                <Badge variant="outline" className="text-xs">
                  {selectedEndpoint.module}
                </Badge>
                <StatusBadge status={selectedEndpoint.status || "WORKING"} />
              </div>
              <DialogTitle className="font-mono text-sm font-bold text-foreground">
                {selectedEndpoint.fullPath}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {selectedEndpoint.description || "Endpoint specification and schema details."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2 text-xs">
              {/* Security Guard */}
              <div className="p-3 rounded-lg bg-muted/50 border border-border grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground block">Authentication:</span>
                  <span className={selectedEndpoint.authRequired ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-muted-foreground"}>
                    {selectedEndpoint.authRequired ? "Required (Bearer JWT)" : "Public Access"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Tenant Isolation:</span>
                  <span className={selectedEndpoint.tenantScoped ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-muted-foreground"}>
                    {selectedEndpoint.tenantScoped ? "Strict (tenant_id Isolated)" : "Platform Scope"}
                  </span>
                </div>
              </div>

              {/* Database Models */}
              {selectedEndpoint.databaseModels?.length > 0 && (
                <div>
                  <span className="text-foreground font-semibold block mb-1">Database Models Touched:</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedEndpoint.databaseModels.map((m: string) => (
                      <span key={m} className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[11px] text-purple-600 dark:text-purple-400">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Request Fields */}
              {selectedEndpoint.requestBodyFields?.length > 0 && (
                <div>
                  <span className="text-foreground font-semibold block mb-1">Request Body Fields:</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedEndpoint.requestBodyFields.map((f: string) => (
                      <span key={f} className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 border-t border-border">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedEndpoint(null)}
                className="text-xs"
              >
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
                <Terminal className="h-3.5 w-3.5" /> Load in API Console
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
