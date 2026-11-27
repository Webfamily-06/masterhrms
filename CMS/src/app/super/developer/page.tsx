'use client';

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE, getAuthToken } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  Terminal,
  Code,
  ShieldCheck,
  Play,
  Copy,
  Check,
  Search,
  Server,
  Key,
  RefreshCw,
  Plus,
  Trash2,
  RotateCw,
  Ban,
  AlertTriangle,
  Clock,
  Loader2,
  BookOpen,
  ShieldAlert,
  Lock,
} from "lucide-react";

interface ApiEndpointItem {
  id?: string;
  method: string;
  fullPath: string;
  module?: string;
  description?: string;
  status?: string;
  requiredRoles?: string[];
  requestBodyFields?: string[];
}

interface PlatformApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  rateLimitPerMin: number;
  status: "active" | "revoked" | "expired";
  rawStatus?: "active" | "revoked";
  isExpired?: boolean;
  expiresAt: string | null;
  createdAt: string;
  createdBy: string;
  rotatedAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
}

const AVAILABLE_SCOPES = [
  { id: "super:read", label: "Super Read", desc: "Read platform stats, tenants, and billing summaries" },
  { id: "super:write", label: "Super Write", desc: "Mutate platform configuration and tenant lifecycle" },
  { id: "tenants:manage", label: "Tenants Manage", desc: "Provision, suspend, and export tenant workspaces" },
  { id: "billing:read", label: "Billing Read", desc: "Inspect invoices, subscriptions, and payment ledgers" },
  { id: "biometric:sync", label: "Biometric Sync", desc: "Push attendance device punches and sync logs" },
  { id: "webhooks:dispatch", label: "Webhooks Dispatch", desc: "Trigger outbound webhook notifications" },
  { id: "audit:read", label: "Audit Read", desc: "Query platform and tenant audit logs" },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
  POST: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  PUT: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  PATCH: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  DELETE: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
};

function MethodBadge({ method }: { method: string }) {
  const m = (method || "GET").toUpperCase();
  return (
    <span
      className={`px-2 py-0.5 rounded text-[11px] font-bold border shrink-0 ${
        METHOD_COLORS[m] || "bg-muted text-muted-foreground border-border"
      }`}
    >
      {m}
    </span>
  );
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function SuperDeveloperPortalPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"reference" | "tester" | "keys">("reference");

  // API Reference state
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [moduleFilter, setModuleFilter] = useState("ALL");
  const [scopeFilter, setScopeFilter] = useState<"all" | "super">("all");
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpointItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Interactive Tester state
  const [testerMethod, setTesterMethod] = useState("GET");
  const [testerPath, setTesterPath] = useState("/super/stats");
  const [testerBody, setTesterBody] = useState("");
  const [testerApiKey, setTesterApiKey] = useState("");
  const [testerResult, setTesterResult] = useState<{
    status: number;
    statusText: string;
    durationMs: number;
    body: unknown;
    error?: string;
  } | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // API Keys Vault state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["super:read"]);
  const [newKeyRateLimit, setNewKeyRateLimit] = useState("120");
  const [newKeyExpiresAt, setNewKeyExpiresAt] = useState("");

  // Show-once secret reveal dialog state
  const [revealedSecret, setRevealedSecret] = useState<{
    name: string;
    prefix: string;
    secret: string;
    action: "created" | "rotated";
  } | null>(null);
  const [hasCopiedSecret, setHasCopiedSecret] = useState(false);

  // Confirmation dialogs for key lifecycle
  const [keyActionConfirm, setKeyActionConfirm] = useState<{
    type: "rotate" | "revoke" | "delete";
    key: PlatformApiKey;
  } | null>(null);

  // 1. Live API metadata query
  const {
    data: metadataRes,
    isLoading: isLoadingMetadata,
    isError: isMetadataError,
    refetch: refetchMetadata,
  } = useQuery({
    queryKey: ["super-developer-metadata"],
    queryFn: async () => {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/docs/metadata`, { headers });
      if (!res.ok) throw new Error(`Metadata endpoint returned HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const endpoints: ApiEndpointItem[] = useMemo(() => {
    const raw = metadataRes?.data || metadataRes || {};
    return Array.isArray(raw.endpoints) ? raw.endpoints : [];
  }, [metadataRes]);

  const modules = useMemo(
    () => Array.from(new Set(endpoints.map((e) => e.module || "General"))).sort(),
    [endpoints]
  );

  const superAdminEndpoints = useMemo(() => {
    return endpoints.filter(
      (e) =>
        (e.requiredRoles || []).includes("super_admin") ||
        (e.fullPath || "").includes("/super") ||
        e.module === "Super Admin"
    );
  }, [endpoints]);

  const filteredEndpoints = useMemo(() => {
    const source = scopeFilter === "super" ? superAdminEndpoints : endpoints;
    const q = searchQuery.trim().toLowerCase();
    return source.filter((ep) => {
      const matchSearch =
        !q ||
        (ep.fullPath || "").toLowerCase().includes(q) ||
        (ep.module || "").toLowerCase().includes(q) ||
        (ep.description || "").toLowerCase().includes(q);
      const matchMethod = methodFilter === "ALL" || (ep.method || "").toUpperCase() === methodFilter;
      const matchModule = moduleFilter === "ALL" || (ep.module || "General") === moduleFilter;
      return matchSearch && matchMethod && matchModule;
    });
  }, [endpoints, superAdminEndpoints, scopeFilter, searchQuery, methodFilter, moduleFilter]);

  // 2. Real API Keys Vault query
  const {
    data: keysRes,
    isLoading: isLoadingKeys,
    isError: isKeysError,
    error: keysError,
    refetch: refetchKeys,
  } = useQuery({
    queryKey: ["super-platform-api-keys"],
    queryFn: async () => {
      const res = await api.get("/super/api-keys");
      return res?.data || res || {};
    },
  });

  const apiKeys: PlatformApiKey[] = useMemo(
    () => (Array.isArray(keysRes?.keys) ? keysRes.keys : []),
    [keysRes]
  );

  const activeKeysCount = useMemo(
    () => apiKeys.filter((k) => k.status === "active").length,
    [apiKeys]
  );

  // Mutations for API Keys Vault
  const createKeyMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      scopes: string[];
      rateLimitPerMin: number;
      expiresAt: string | null;
    }) => {
      const res = await api.post("/super/api-keys", payload);
      return res?.data || res || {};
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["super-platform-api-keys"] });
      setIsCreateModalOpen(false);
      setNewKeyName("");
      setNewKeyScopes(["super:read"]);
      setNewKeyRateLimit("120");
      setNewKeyExpiresAt("");
      if (data?.secret && data?.key) {
        setHasCopiedSecret(false);
        setRevealedSecret({
          name: data.key.name,
          prefix: data.key.prefix,
          secret: data.secret,
          action: "created",
        });
      }
      toast.success("Platform API key created.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create API key.");
    },
  });

  const rotateKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/super/api-keys/${id}/rotate`, {});
      return res?.data || res || {};
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["super-platform-api-keys"] });
      setKeyActionConfirm(null);
      if (data?.secret && data?.key) {
        setHasCopiedSecret(false);
        setRevealedSecret({
          name: data.key.name,
          prefix: data.key.prefix,
          secret: data.secret,
          action: "rotated",
        });
      }
      toast.success("API key rotated. Previous secret invalidated.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to rotate API key.");
    },
  });

  const revokeKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/super/api-keys/${id}/revoke`, {});
      return res?.data || res || {};
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["super-platform-api-keys"] });
      setKeyActionConfirm(null);
      toast.success(data?.message || "API key revoked.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to revoke API key.");
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/super/api-keys/${id}`);
      return res?.data || res || {};
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["super-platform-api-keys"] });
      setKeyActionConfirm(null);
      toast.success(data?.message || "API key deleted.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete API key.");
    },
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleScope = (scopeId: string) => {
    setNewKeyScopes((prev) =>
      prev.includes(scopeId) ? prev.filter((s) => s !== scopeId) : [...prev, scopeId]
    );
  };

  const handleCreateKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newKeyName.trim().length < 2) {
      toast.error("Please enter a descriptive key name (at least 2 characters).");
      return;
    }
    if (newKeyScopes.length === 0) {
      toast.error("Select at least one permission scope.");
      return;
    }
    const rateLimit = Number(newKeyRateLimit) || 120;
    if (rateLimit < 10 || rateLimit > 10000) {
      toast.error("Rate limit must be between 10 and 10,000 requests/min.");
      return;
    }

    createKeyMutation.mutate({
      name: newKeyName.trim(),
      scopes: newKeyScopes,
      rateLimitPerMin: rateLimit,
      expiresAt: newKeyExpiresAt ? new Date(`${newKeyExpiresAt}T23:59:59.000Z`).toISOString() : null,
    });
  };

  const loadEndpointIntoTester = (ep: ApiEndpointItem) => {
    setTesterMethod((ep.method || "GET").toUpperCase());
    const cleanPath = (ep.fullPath || "").replace(/^\/api/, "") || "/health";
    setTesterPath(cleanPath);
    if (ep.requestBodyFields && ep.requestBodyFields.length > 0 && ["POST", "PUT", "PATCH"].includes((ep.method || "").toUpperCase())) {
      const skeleton: Record<string, string> = {};
      for (const field of ep.requestBodyFields) {
        skeleton[field] = "";
      }
      setTesterBody(JSON.stringify(skeleton, null, 2));
    } else {
      setTesterBody("");
    }
    setActiveTab("tester");
  };

  const executeLiveRequest = async () => {
    const trimmedPath = testerPath.trim();
    if (!trimmedPath) {
      toast.error("Enter an API path to test.");
      return;
    }

    let parsedBody: string | undefined;
    if (["POST", "PUT", "PATCH"].includes(testerMethod) && testerBody.trim()) {
      try {
        JSON.parse(testerBody);
        parsedBody = testerBody;
      } catch {
        toast.error("Request body must be valid JSON.");
        return;
      }
    }

    setIsExecuting(true);
    setTesterResult(null);
    const started = performance.now();

    try {
      const normalized = trimmedPath.startsWith("/api/")
        ? trimmedPath.slice(4)
        : trimmedPath.startsWith("/")
        ? trimmedPath
        : `/${trimmedPath}`;
      const url = `${API_BASE}${normalized}`;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const token = getAuthToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      if (testerApiKey.trim()) {
        headers["X-API-Key"] = testerApiKey.trim();
      }

      const res = await fetch(url, {
        method: testerMethod,
        headers,
        body: parsedBody,
      });

      const durationMs = Math.round(performance.now() - started);
      const text = await res.text();
      let body: unknown = text;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = text;
      }

      setTesterResult({
        status: res.status,
        statusText: res.statusText || (res.ok ? "OK" : "Error"),
        durationMs,
        body,
      });

      if (res.ok) {
        toast.success(`HTTP ${res.status} (${durationMs} ms)`);
      } else {
        toast.warning(`HTTP ${res.status} ${res.statusText}`);
      }
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - started);
      setTesterResult({
        status: 0,
        statusText: "Network Error",
        durationMs,
        body: null,
        error: err?.message || "Request failed",
      });
      toast.error(err?.message || "Request execution failed");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleConfirmKeyAction = () => {
    if (!keyActionConfirm) return;
    const { type, key } = keyActionConfirm;
    if (type === "rotate") rotateKeyMutation.mutate(key.id);
    else if (type === "revoke") revokeKeyMutation.mutate(key.id);
    else if (type === "delete") deleteKeyMutation.mutate(key.id);
  };

  return (
    <div className="w-full min-w-0 space-y-5">
      <PageHeader
        title="Developer Portal"
        description="Unified API Reference, live authenticated Interactive Tester, and SHA-256 hashed Platform API Keys Vault."
        icon={Code}
        badge={
          <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
            Platform Root
          </Badge>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchMetadata();
                refetchKeys();
              }}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="size-3.5" />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setActiveTab("keys");
                setIsCreateModalOpen(true);
              }}
              className="gap-1.5 text-xs"
            >
              <Plus className="size-3.5" />
              New API Key
            </Button>
          </>
        }
      />

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Discovered API Endpoints</p>
              <p className="text-2xl font-bold text-foreground tabular-nums mt-1">
                {isLoadingMetadata ? "..." : endpoints.length}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {modules.length} backend modules
              </p>
            </div>
            <div className="size-10 rounded-xl bg-sky-500/10 text-sky-600 border border-sky-500/20 flex items-center justify-center">
              <Server className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Super Admin Routes</p>
              <p className="text-2xl font-bold text-foreground tabular-nums mt-1">
                {isLoadingMetadata ? "..." : superAdminEndpoints.length}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Protected by requireSuperAdmin
              </p>
            </div>
            <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center">
              <ShieldCheck className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active Platform API Keys</p>
              <p className="text-2xl font-bold text-foreground tabular-nums mt-1">
                {isLoadingKeys ? "..." : activeKeysCount}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {apiKeys.length} total stored (SHA-256 hashed)
              </p>
            </div>
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center">
              <Key className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main 3-Tab Portal */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-xl bg-muted/70 p-1 rounded-xl">
          <TabsTrigger value="reference" className="gap-1.5 text-xs">
            <BookOpen className="size-3.5" />
            API Reference
            <span className="ml-1 text-[10px] tabular-nums opacity-75">({endpoints.length})</span>
          </TabsTrigger>
          <TabsTrigger value="tester" className="gap-1.5 text-xs">
            <Terminal className="size-3.5" />
            Interactive Tester
          </TabsTrigger>
          <TabsTrigger value="keys" className="gap-1.5 text-xs">
            <Key className="size-3.5" />
            API Keys Vault
            <span className="ml-1 text-[10px] tabular-nums opacity-75">({apiKeys.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: API REFERENCE ─── */}
        <TabsContent value="reference" className="space-y-4">
          <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search endpoints, modules, or descriptions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setScopeFilter("all")}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        scopeFilter === "all"
                          ? "bg-background text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      All Endpoints
                    </button>
                    <button
                      type="button"
                      onClick={() => setScopeFilter("super")}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        scopeFilter === "super"
                          ? "bg-background text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Super Admin Only
                    </button>
                  </div>

                  <select
                    aria-label="Filter by HTTP method"
                    value={methodFilter}
                    onChange={(e) => setMethodFilter(e.target.value)}
                    className="h-9 px-2.5 rounded-md border border-border bg-background text-xs text-foreground"
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
                    className="h-9 px-2.5 rounded-md border border-border bg-background text-xs text-foreground max-w-[180px]"
                  >
                    <option value="ALL">All Modules</option>
                    {modules.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {isLoadingMetadata ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="size-6 animate-spin text-primary" />
                  <p className="text-xs">Loading live OpenAPI route catalog...</p>
                </div>
              ) : isMetadataError ? (
                <Alert variant="danger">
                  <AlertTriangle className="size-4" />
                  <AlertTitle>Unable to load API metadata</AlertTitle>
                  <AlertDescription className="flex items-center justify-between gap-2">
                    <span>Could not reach /api/docs/metadata. Ensure the backend server is online.</span>
                    <Button size="sm" variant="outline" onClick={() => refetchMetadata()}>
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : filteredEndpoints.length === 0 ? (
                <div className="py-14 text-center text-muted-foreground border border-dashed rounded-lg">
                  <Code className="size-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-foreground">No endpoints match your filters</p>
                  <p className="text-xs mt-1">Adjust search terms, HTTP method, or module filter.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-border/80 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/80">
                        <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 w-24">
                          Method
                        </th>
                        <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">
                          Endpoint Path
                        </th>
                        <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">
                          Module
                        </th>
                        <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredEndpoints.slice(0, 100).map((ep, idx) => {
                        const rowKey = `${ep.method}-${ep.fullPath}-${idx}`;
                        return (
                          <tr
                            key={rowKey}
                            className="hover:bg-muted/40 transition-colors cursor-pointer"
                            onClick={() => setSelectedEndpoint(ep)}
                          >
                            <td className="p-3">
                              <MethodBadge method={ep.method} />
                            </td>
                            <td className="p-3">
                              <div className="tabular-nums font-semibold text-foreground break-all">
                                {ep.fullPath}
                              </div>
                              {ep.description && (
                                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                                  {ep.description}
                                </p>
                              )}
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <Badge variant="outline" className="text-[10px]">
                                {ep.module || "General"}
                              </Badge>
                            </td>
                            <td className="p-3 text-right whitespace-nowrap">
                              <div
                                className="inline-flex items-center gap-1.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  onClick={() => handleCopy(ep.fullPath, rowKey)}
                                  title="Copy path"
                                >
                                  {copiedId === rowKey ? (
                                    <Check className="size-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="size-3.5" />
                                  )}
                                </Button>
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={() => loadEndpointIntoTester(ep)}
                                  className="gap-1"
                                >
                                  <Play className="size-3" />
                                  Test
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredEndpoints.length > 100 && (
                    <div className="p-3 text-center text-[11px] text-muted-foreground bg-muted/20 border-t border-border/60">
                      Showing first 100 of {filteredEndpoints.length} matching endpoints. Refine your search to view more.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 2: INTERACTIVE TESTER ─── */}
        <TabsContent value="tester" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <Card className="lg:col-span-5 border border-border/80 rounded-xl bg-card shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Terminal className="size-4 text-primary" />
                  Request Builder
                </CardTitle>
                <CardDescription className="text-xs">
                  Executes live requests against the backend API using your active Super Admin Bearer session.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Method & Endpoint Path</Label>
                  <div className="flex gap-2">
                    <select
                      aria-label="HTTP Method"
                      value={testerMethod}
                      onChange={(e) => setTesterMethod(e.target.value)}
                      className="h-9 px-2.5 rounded-md border border-border bg-background text-xs font-bold text-foreground"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                    <Input
                      value={testerPath}
                      onChange={(e) => setTesterPath(e.target.value)}
                      placeholder="/super/stats"
                      className="h-9 text-xs flex-1"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Base URL: <code className="font-mono">{API_BASE}</code>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Optional X-API-Key Header</Label>
                  <Input
                    type="password"
                    value={testerApiKey}
                    onChange={(e) => setTesterApiKey(e.target.value)}
                    placeholder="mhk_live_... (optional)"
                    className="h-9 text-xs"
                  />
                </div>

                {["POST", "PUT", "PATCH"].includes(testerMethod) && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">JSON Request Body</Label>
                    <textarea
                      rows={6}
                      value={testerBody}
                      onChange={(e) => setTesterBody(e.target.value)}
                      placeholder={'{\n  "example": true\n}'}
                      className="w-full p-3 rounded-lg border border-border bg-muted/30 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: "Platform Stats", method: "GET", path: "/super/stats" },
                    { label: "List Plans", method: "GET", path: "/super/plans" },
                    { label: "API Keys", method: "GET", path: "/super/api-keys" },
                    { label: "Offboarding Queue", method: "GET", path: "/super/lifecycle/offboarding" },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setTesterMethod(preset.method);
                        setTesterPath(preset.path);
                        setTesterBody("");
                      }}
                      className="px-2 py-1 rounded-md border border-border bg-muted/40 hover:bg-muted text-[11px] font-medium text-foreground transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <Button
                  onClick={executeLiveRequest}
                  disabled={isExecuting}
                  className="w-full gap-2 text-xs"
                >
                  {isExecuting ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Play className="size-3.5" />
                  )}
                  Send Request
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-7 border border-border/80 rounded-xl bg-card shadow-xs flex flex-col">
              <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-semibold">Response Inspector</CardTitle>
                  <CardDescription className="text-xs">
                    Live HTTP status, latency, and formatted payload output.
                  </CardDescription>
                </div>
                {testerResult && (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[11px] ${
                        testerResult.status >= 200 && testerResult.status < 300
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                          : "bg-rose-500/10 text-rose-600 border-rose-500/30"
                      }`}
                    >
                      HTTP {testerResult.status} {testerResult.statusText}
                    </Badge>
                    <Badge variant="secondary"className="text-[11px] gap-1">
                      <Clock className="size-3" />
                      {testerResult.durationMs} ms
                    </Badge>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() =>
                        handleCopy(
                          typeof testerResult.body === "string"
                            ? testerResult.body
                            : JSON.stringify(testerResult.body, null, 2),
                          "tester-response"
                        )
                      }
                    >
                      {copiedId === "tester-response" ? (
                        <Check className="size-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex-1">
                {testerResult ? (
                  testerResult.error ? (
                    <Alert variant="danger">
                      <AlertTriangle className="size-4" />
                      <AlertTitle>Request Error</AlertTitle>
                      <AlertDescription>{testerResult.error}</AlertDescription>
                    </Alert>
                  ) : (
                    <pre className="p-3.5 rounded-lg bg-muted/50 border border-border font-mono text-xs overflow-auto max-h-[460px] text-foreground">
                      {typeof testerResult.body === "string"
                        ? testerResult.body
                        : JSON.stringify(testerResult.body, null, 2)}
                    </pre>
                  )
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-muted-foreground border border-dashed rounded-lg text-xs gap-2">
                    <Terminal className="size-7 opacity-40" />
                    <p>Configure a request on the left and click &ldquo;Send Request&rdquo; to inspect the live response.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── TAB 3: API KEYS VAULT ─── */}
        <TabsContent value="keys" className="space-y-4">
          <Alert variant="info">
            <Lock className="size-4" />
            <AlertTitle>Zero-Knowledge Secret Storage</AlertTitle>
            <AlertDescription>
              Platform API keys are stored using SHA-256 hashes only. Full plaintext secrets are displayed once at creation or rotation and cannot be retrieved afterward.
            </AlertDescription>
          </Alert>

          <Card className="border border-border/80 rounded-xl bg-card shadow-xs overflow-hidden">
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold">Platform API Keys Vault</CardTitle>
                <CardDescription className="text-xs">
                  Manage scoped integration credentials, per-minute rate limits, and rotation lifecycles.
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setIsCreateModalOpen(true)} className="gap-1.5 text-xs">
                <Plus className="size-3.5" />
                Generate API Key
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingKeys ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="size-6 animate-spin text-primary" />
                  <p className="text-xs">Loading platform API keys...</p>
                </div>
              ) : isKeysError ? (
                <div className="p-6">
                  <Alert variant="danger">
                    <AlertTriangle className="size-4" />
                    <AlertTitle>Failed to load API Keys</AlertTitle>
                    <AlertDescription className="flex items-center justify-between gap-2">
                      <span>{(keysError as any)?.message || "Could not query /api/super/api-keys."}</span>
                      <Button size="sm" variant="outline" onClick={() => refetchKeys()}>
                        Retry
                      </Button>
                    </AlertDescription>
                  </Alert>
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground px-4">
                  <Key className="size-10 mx-auto mb-2.5 opacity-40" />
                  <p className="text-sm font-semibold text-foreground">No Platform API Keys Created</p>
                  <p className="text-xs max-w-sm mx-auto mt-1">
                    Generate a scoped API key to authenticate trusted backend integrations, biometric gateways, or automation jobs.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="mt-4 gap-1.5 text-xs"
                  >
                    <Plus className="size-3.5" />
                    Generate First Key
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto border-t border-border/80">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/80">
                        <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">
                          Key Name
                        </th>
                        <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">
                          Key Prefix
                        </th>
                        <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">
                          Scopes
                        </th>
                        <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">
                          Rate Limit
                        </th>
                        <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">
                          Status
                        </th>
                        <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">
                          Lifecycle
                        </th>
                        <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {apiKeys.map((keyItem) => {
                        const isRevoked = keyItem.status === "revoked";
                        const isExpired = keyItem.status === "expired";

                        return (
                          <tr key={keyItem.id} className="hover:bg-muted/40 transition-colors">
                            <td className="p-3">
                              <div className="font-semibold text-foreground">{keyItem.name}</div>
                              <div className="text-[11px] text-muted-foreground">
                                By {keyItem.createdBy}
                              </div>
                            </td>
                            <td className="p-3 tabular-nums text-[11px] whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded bg-muted border border-border text-foreground">
                                {keyItem.prefix}••••••••
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {(keyItem.scopes || []).map((scope) => (
                                  <Badge
                                    key={scope}
                                    variant="outline"
                                    className="text-[10px] bg-primary/5 border-primary/20"
                                  >
                                    {scope}
                                  </Badge>
                                ))}
                              </div>
                            </td>
                            <td className="p-3 tabular-nums whitespace-nowrap text-foreground">
                              {keyItem.rateLimitPerMin}/min
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <Badge
                                variant="outline"
                                className={`text-[10px] uppercase font-bold ${
                                  isRevoked
                                    ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                    : isExpired
                                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                }`}
                              >
                                {keyItem.status}
                              </Badge>
                            </td>
                            <td className="p-3 text-[11px] text-muted-foreground whitespace-nowrap">
                              <div>Created: {formatDateTime(keyItem.createdAt)}</div>
                              {keyItem.rotatedAt && <div>Rotated: {formatDateTime(keyItem.rotatedAt)}</div>}
                              {keyItem.expiresAt && <div>Expires: {formatDateTime(keyItem.expiresAt)}</div>}
                            </td>
                            <td className="p-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                {!isRevoked && (
                                  <>
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      onClick={() => setKeyActionConfirm({ type: "rotate", key: keyItem })}
                                      title="Rotate secret"
                                      className="gap-1"
                                    >
                                      <RotateCw className="size-3" />
                                      Rotate
                                    </Button>
                                    <Button
                                      size="xs"
                                      variant="ghost"
                                      onClick={() => setKeyActionConfirm({ type: "revoke", key: keyItem })}
                                      title="Revoke key"
                                      className="text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 gap-1"
                                    >
                                      <Ban className="size-3" />
                                      Revoke
                                    </Button>
                                  </>
                                )}
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  onClick={() => setKeyActionConfirm({ type: "delete", key: keyItem })}
                                  title="Delete key permanently"
                                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Endpoint Specification Dialog ─── */}
      <Dialog open={Boolean(selectedEndpoint)} onOpenChange={(o) => !o && setSelectedEndpoint(null)}>
        <DialogContent className="max-w-xl">
          {selectedEndpoint && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <MethodBadge method={selectedEndpoint.method} />
                  <Badge variant="outline" className="text-[11px]">
                    {selectedEndpoint.module || "General"}
                  </Badge>
                </div>
                <DialogTitle className="text-sm break-all">
                  {selectedEndpoint.fullPath}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {selectedEndpoint.description || "Authenticated REST API endpoint."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2 text-xs">
                {selectedEndpoint.requiredRoles && selectedEndpoint.requiredRoles.length > 0 && (
                  <div className="space-y-1">
                    <span className="font-semibold text-foreground block">Required Roles</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedEndpoint.requiredRoles.map((r) => (
                        <Badge key={r} variant="secondary"className="text-[10px]">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEndpoint.requestBodyFields && selectedEndpoint.requestBodyFields.length > 0 && (
                  <div className="space-y-1">
                    <span className="font-semibold text-foreground block">Expected Body Fields</span>
                    <div className="p-2.5 rounded-lg bg-muted/50 border text-[11px]">
                      {selectedEndpoint.requestBodyFields.join(", ")}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedEndpoint(null)}>
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    loadEndpointIntoTester(selectedEndpoint);
                    setSelectedEndpoint(null);
                  }}
                  className="gap-1.5"
                >
                  <Terminal className="size-3.5" />
                  Load in Interactive Tester
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Create API Key Dialog ─── */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="size-4 text-primary" />
              Generate Platform API Key
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure name, least-privilege scopes, rate limit, and optional expiration date.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateKeySubmit} className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="api-key-name" className="text-xs font-semibold">
                Key Name *
              </Label>
              <Input
                id="api-key-name"
                placeholder="e.g. ZKTeco Biometric Sync Service"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Permission Scopes *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {AVAILABLE_SCOPES.map((scope) => {
                  const checked = newKeyScopes.includes(scope.id);
                  return (
                    <label
                      key={scope.id}
                      className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        checked
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleScope(scope.id)}
                        className="mt-0.5 rounded border-border text-primary"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-[11px] text-foreground">
                          {scope.id}
                        </div>
                        <div className="text-[10px] text-muted-foreground leading-snug">
                          {scope.desc}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="api-key-rate" className="text-xs font-semibold">
                  Rate Limit (req/min)
                </Label>
                <Input
                  id="api-key-rate"
                  type="number"
                  min={10}
                  max={10000}
                  value={newKeyRateLimit}
                  onChange={(e) => setNewKeyRateLimit(e.target.value)}
                  className="h-9 text-xs tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="api-key-expires" className="text-xs font-semibold">
                  Expires On (Optional)
                </Label>
                <Input
                  id="api-key-expires"
                  type="date"
                  value={newKeyExpiresAt}
                  onChange={(e) => setNewKeyExpiresAt(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createKeyMutation.isPending}
                className="gap-1.5"
              >
                {createKeyMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Key className="size-3.5" />
                )}
                Generate Key
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Show-Once Secret Reveal Dialog ─── */}
      <Dialog
        open={Boolean(revealedSecret)}
        onOpenChange={(open) => {
          if (!open) setRevealedSecret(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-amber-600" />
              {revealedSecret?.action === "rotated"
                ? "New Rotated API Secret Generated"
                : "Copy Your New API Secret Now"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              This secret for <strong>{revealedSecret?.name}</strong> is displayed only once. We only store its SHA-256 hash and cannot recover it later.
            </DialogDescription>
          </DialogHeader>

          {revealedSecret && (
            <div className="space-y-3 py-2">
              <Alert variant="warning">
                <AlertTriangle className="size-4" />
                <AlertTitle>Store this key securely</AlertTitle>
                <AlertDescription>
                  Save it immediately in your secrets manager or environment variables before closing this window.
                </AlertDescription>
              </Alert>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Plaintext API Secret</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={revealedSecret.secret}
                    className="text-xs font-semibold bg-muted/50 select-all"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(revealedSecret.secret);
                      setHasCopiedSecret(true);
                      toast.success("API secret copied to clipboard");
                    }}
                    className="shrink-0 gap-1.5"
                  >
                    {hasCopiedSecret ? (
                      <>
                        <Check className="size-3.5 text-emerald-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              onClick={() => setRevealedSecret(null)}
              className="w-full sm:w-auto"
            >
              I Have Stored This Secret
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Confirm Rotate / Revoke / Delete Dialog ─── */}
      <ConfirmationDialog
        open={Boolean(keyActionConfirm)}
        onOpenChange={(open) => !open && setKeyActionConfirm(null)}
        title={
          keyActionConfirm?.type === "rotate"
            ? `Rotate API Key "${keyActionConfirm.key.name}"?`
            : keyActionConfirm?.type === "revoke"
            ? `Revoke API Key "${keyActionConfirm.key.name}"?`
            : `Delete API Key "${keyActionConfirm?.key.name}"?`
        }
        description={
          keyActionConfirm?.type === "rotate"
            ? "A new secret will be generated and shown once. Any integration using the previous secret will fail immediately."
            : keyActionConfirm?.type === "revoke"
            ? "Revoking immediately invalidates this key. Its audit metadata will remain visible in the vault."
            : "This permanently removes the key record from the platform vault. This action cannot be undone."
        }
        confirmLabel={
          keyActionConfirm?.type === "rotate"
            ? "Rotate Key"
            : keyActionConfirm?.type === "revoke"
            ? "Revoke Key"
            : "Delete Permanently"
        }
        variant={keyActionConfirm?.type === "rotate" ? "default" : "destructive"}
        isLoading={
          rotateKeyMutation.isPending ||
          revokeKeyMutation.isPending ||
          deleteKeyMutation.isPending
        }
        onConfirm={handleConfirmKeyAction}
      />
    </div>
  );
}
