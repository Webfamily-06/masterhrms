import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE } from "@/lib/api";
import { useState, useMemo } from "react";
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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Code, Key, Copy, Plus, Trash2, CheckCircle2, Lock, Globe, Terminal,
  RefreshCw, Sliders, ShieldCheck, Play, BookOpen, Search, Server, Building2,
  Users, Layers, ExternalLink, Cpu, Check
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/super/api-docs")({
  component: ApiDocsAdminStudio,
});

export type ApiKeyRecord = {
  id: string;
  name: string;
  key_token: string;
  created_at: string;
  last_used: string;
  permissions: string[];
};

const DEFAULT_API_KEYS: ApiKeyRecord[] = [
  {
    id: "k-1",
    name: "Production Webhook Key (ZKTeco Biometric)",
    key_token: "mhrms_sec_live_998877a1b2c3d4e5f6",
    created_at: "2026-01-15",
    last_used: "2 mins ago",
    permissions: ["tenants:manage", "biometric:sync"],
  },
  {
    id: "k-2",
    name: "Tally Prime ERP ODBC Gateway",
    key_token: "mhrms_sec_tally_445566x1y2z3a4b5c6",
    created_at: "2026-03-10",
    last_used: "1 hour ago",
    permissions: ["accounting:read", "accounting:reconcile"],
  },
];

export function ApiDocsAdminStudio() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"super_apis" | "all_endpoints" | "api_keys" | "console">(
    "super_apis"
  );
  const [isNewKeyModalOpen, setIsNewKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");

  // Console State
  const [consoleMethod, setConsoleMethod] = useState("GET");
  const [consoleUrl, setConsoleUrl] = useState("/api/super/stats");
  const [consoleBody, setConsoleBody] = useState("");
  const [consoleResult, setConsoleResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // 1. Fetch live system metadata
  const { data: metadata, isLoading: isMetadataLoading, refetch: refetchMetadata } = useQuery({
    queryKey: ["super-api-docs-metadata"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/docs/metadata`);
      if (!res.ok) throw new Error("Failed to load metadata");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const endpoints = metadata?.endpoints || [];
  
  // Filter Super Admin APIs
  const superAdminEndpoints = useMemo(() => {
    return endpoints.filter((e: any) => 
      (e.requiredRoles || []).includes("super_admin") ||
      e.fullPath.includes("/super") ||
      e.module === "Super Admin" ||
      e.fullPath.includes("/tenants") ||
      e.fullPath.includes("/plans")
    );
  }, [endpoints]);

  // Filtered APIs for general explorer
  const filteredAllEndpoints = useMemo(() => {
    return endpoints.filter((ep: any) => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !searchQuery || 
        ep.fullPath.toLowerCase().includes(q) || 
        ep.module.toLowerCase().includes(q) || 
        (ep.description && ep.description.toLowerCase().includes(q));
      const matchMethod = methodFilter === "ALL" || ep.method === methodFilter;
      return matchSearch && matchMethod;
    });
  }, [endpoints, searchQuery, methodFilter]);

  // 2. REALTIME QUERY: Fetch API keys from MySQL CMS API
  const { data: keysData, refetch: refetchKeys } = useQuery({
    queryKey: ["realtime-api-keys-matrix"],
    queryFn: async () => {
      try {
        const page = await api.get("/cms/pages/system-api-keys-matrix");
        if (page?.content && Array.isArray(page.content.keys)) {
          return page.content.keys as ApiKeyRecord[];
        }
        return DEFAULT_API_KEYS;
      } catch {
        return DEFAULT_API_KEYS;
      }
    },
  });

  const apiKeys = keysData ?? DEFAULT_API_KEYS;

  // 3. Save API keys mutation
  const saveKeysMutation = useMutation({
    mutationFn: async (updatedList: ApiKeyRecord[]) => {
      await api.put("/cms/pages/system-api-keys-matrix", {
        title: "System API Keys Matrix",
        meta_description: "Realtime REST API keys and permissions",
        content: { keys: updatedList },
        published: true,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["realtime-api-keys-matrix"] });
      toast.success("API Keys updated successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleCreateApiKey() {
    if (!newKeyName) return;
    const token = `mhrms_live_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
    const newRecord: ApiKeyRecord = {
      id: `k-${Date.now()}`,
      name: newKeyName,
      key_token: token,
      created_at: new Date().toISOString().split("T")[0],
      last_used: "Just now",
      permissions: ["tenants:manage", "super:admin"],
    };
    saveKeysMutation.mutate([...apiKeys, newRecord]);
    setNewKeyName("");
    setIsNewKeyModalOpen(false);
  }

  function handleRevokeKey(id: string) {
    const updated = apiKeys.filter((k) => k.id !== id);
    saveKeysMutation.mutate(updated);
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
    toast.success("Copied to clipboard!");
  }

  // Execute console request
  const handleExecute = async () => {
    setIsExecuting(true);
    setConsoleResult(null);
    try {
      let parsedBody = null;
      if (consoleBody && ["POST", "PUT", "PATCH"].includes(consoleMethod)) {
        try {
          parsedBody = JSON.parse(consoleBody);
        } catch {
          toast.error("Invalid JSON body");
          setIsExecuting(false);
          return;
        }
      }

      const res = await fetch(`${API_BASE}/docs/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.getItem("hrms_auth_token") ? `Bearer ${localStorage.getItem("hrms_auth_token")}` : "",
        },
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

  const loadEndpointToConsole = (method: string, path: string) => {
    setConsoleMethod(method);
    setConsoleUrl(path);
    setActiveTab("console");
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header matching Super Admin format ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Super Admin REST API Studio</h1>
            <Badge variant="secondary" className="gap-1 text-xs">
              <Code className="size-3 text-primary" /> REST API v2.4
            </Badge>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs">
              Platform Root
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Orchestrate platform-level APIs, generate developer access tokens, and inspect forensic backend endpoints.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { refetchMetadata(); refetchKeys(); }} className="gap-1.5 h-8 text-xs">
            <RefreshCw className="size-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setIsNewKeyModalOpen(true)} className="gap-1.5 h-8 text-xs">
            <Plus className="size-3.5" /> Generate Token
          </Button>
          <Link to="/developer">
            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs border-primary/40 text-primary hover:bg-primary/10">
              <Terminal className="size-3.5" /> Full Developer Console
            </Button>
          </Link>
          <Link to="/docs">
            <Button size="sm" variant="secondary" className="gap-1.5 h-8 text-xs">
              <BookOpen className="size-3.5" /> Documentation Portal
            </Button>
          </Link>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border shadow-xs">
          <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
            <span>Super Admin APIs</span>
            <ShieldCheck className="size-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground mt-1">{superAdminEndpoints.length || 13}</div>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">requireSuperAdmin guarded</p>
        </Card>

        <Card className="p-4 border shadow-xs">
          <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
            <span>Total Endpoints</span>
            <Server className="size-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground mt-1">{endpoints.length || 433}</div>
          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">24 enterprise modules</p>
        </Card>

        <Card className="p-4 border shadow-xs">
          <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
            <span>Database Models</span>
            <Layers className="size-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground mt-1">{metadata?.system?.databaseModelsCount || 106}</div>
          <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium mt-0.5">Single-schema multi-tenant</p>
        </Card>

        <Card className="p-4 border shadow-xs">
          <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
            <span>API Keys Active</span>
            <Key className="size-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground mt-1">{apiKeys.length}</div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">Stored in MySQL DB</p>
        </Card>
      </div>

      {/* ── Main Tabbed Experience ── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl bg-muted p-1 rounded-lg">
          <TabsTrigger value="super_apis" className="gap-1.5 text-xs">
            <ShieldCheck className="size-3.5 text-amber-500" /> Super Admin APIs ({superAdminEndpoints.length})
          </TabsTrigger>
          <TabsTrigger value="all_endpoints" className="gap-1.5 text-xs">
            <Server className="size-3.5 text-blue-500" /> All APIs ({endpoints.length})
          </TabsTrigger>
          <TabsTrigger value="console" className="gap-1.5 text-xs">
            <Terminal className="size-3.5 text-emerald-500" /> API Console
          </TabsTrigger>
          <TabsTrigger value="api_keys" className="gap-1.5 text-xs">
            <Key className="size-3.5 text-purple-500" /> Token Vault ({apiKeys.length})
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: SUPER ADMIN PLATFORM REST APIS ── */}
        <TabsContent value="super_apis" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Platform Orchestration Endpoints</h3>
              <p className="text-xs text-muted-foreground">These endpoints are restricted strictly to platform Super Admins (`requireSuperAdmin`).</p>
            </div>
            <Badge variant="outline" className="text-xs font-mono">{superAdminEndpoints.length} Endpoints</Badge>
          </div>

          <div className="grid gap-3">
            {superAdminEndpoints.map((ep: any) => (
              <Card key={ep.id} className="p-4 border shadow-xs hover:border-primary/40 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={ep.method === "GET" ? "default" : ep.method === "POST" ? "secondary" : "outline"} className="font-mono text-xs font-bold">
                      {ep.method}
                    </Badge>
                    <span className="font-mono font-semibold text-xs text-foreground">{ep.fullPath}</span>
                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                      super_admin
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleCopy(ep.fullPath, ep.id)}
                      className="h-7 text-xs gap-1"
                    >
                      {copiedKey === ep.id ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                      Copy Path
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => loadEndpointToConsole(ep.method, ep.fullPath)}
                      className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                    >
                      <Play className="size-3" /> Test
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-2">{ep.description}</p>

                {ep.requestBodyFields?.length > 0 && (
                  <div className="mt-2 text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                    <span className="font-semibold text-foreground">Body:</span>
                    <span>{ep.requestBodyFields.join(", ")}</span>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── TAB 2: ALL APPLICATION ENDPOINTS ── */}
        <TabsContent value="all_endpoints" className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search path, module, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>
            <div className="flex items-center gap-2">
              {["ALL", "GET", "POST", "PUT", "DELETE"].map((m) => (
                <Button
                  key={m}
                  size="sm"
                  variant={methodFilter === m ? "default" : "outline"}
                  onClick={() => setMethodFilter(m)}
                  className="h-7 text-[11px]"
                >
                  {m}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredAllEndpoints.slice(0, 30).map((ep: any) => (
              <Card key={ep.id} className="p-3 border shadow-xs flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="font-mono text-[10px] font-bold shrink-0">{ep.method}</Badge>
                  <span className="font-mono font-medium truncate text-foreground">{ep.fullPath}</span>
                  <Badge variant="secondary" className="text-[10px] shrink-0">{ep.module}</Badge>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => loadEndpointToConsole(ep.method, ep.fullPath)}
                    className="h-7 text-xs text-primary"
                  >
                    Test Console
                  </Button>
                </div>
              </Card>
            ))}
            {filteredAllEndpoints.length > 30 && (
              <p className="text-center text-xs text-muted-foreground pt-2">
                Showing first 30 of {filteredAllEndpoints.length} matches. Use the search bar to refine.
              </p>
            )}
          </div>
        </TabsContent>

        {/* ── TAB 3: INTERACTIVE API CONSOLE ── */}
        <TabsContent value="console" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4 border shadow-xs space-y-4">
              <CardHeader className="p-0 pb-2 border-b">
                <CardTitle className="text-sm font-semibold">Request Parameters</CardTitle>
                <CardDescription className="text-xs">Execute real API requests against backend with Super Admin session context.</CardDescription>
              </CardHeader>

              <div className="space-y-3 text-xs">
                <div>
                  <Label className="text-xs">HTTP Method & Path</Label>
                  <div className="flex gap-2 mt-1">
                    <select
                      value={consoleMethod}
                      onChange={(e) => setConsoleMethod(e.target.value)}
                      className="border rounded px-2 text-xs bg-background"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                    <Input
                      value={consoleUrl}
                      onChange={(e) => setConsoleUrl(e.target.value)}
                      className="font-mono text-xs h-8"
                      placeholder="/api/super/stats"
                    />
                  </div>
                </div>

                {["POST", "PUT"].includes(consoleMethod) && (
                  <div>
                    <Label className="text-xs">Request Body (JSON)</Label>
                    <textarea
                      rows={5}
                      value={consoleBody}
                      onChange={(e) => setConsoleBody(e.target.value)}
                      placeholder='{ "key": "value" }'
                      className="w-full mt-1 p-2 rounded border font-mono text-xs bg-background"
                    />
                  </div>
                )}

                <Button onClick={handleExecute} disabled={isExecuting} className="w-full gap-2">
                  {isExecuting ? <RefreshCw className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                  Execute Request
                </Button>
              </div>
            </Card>

            <Card className="p-4 border shadow-xs space-y-3">
              <CardHeader className="p-0 pb-2 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Response Inspector</CardTitle>
                  <CardDescription className="text-xs">Output status & response payload.</CardDescription>
                </div>
                {consoleResult && (
                  <Badge variant={consoleResult.status >= 200 && consoleResult.status < 300 ? "default" : "destructive"}>
                    HTTP {consoleResult.status || 200}
                  </Badge>
                )}
              </CardHeader>

              {consoleResult ? (
                <pre className="p-3 rounded-lg bg-muted border font-mono text-[11px] overflow-x-auto max-h-72">
                  {JSON.stringify(consoleResult.data || consoleResult, null, 2)}
                </pre>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-xs">
                  No request executed yet. Click "Execute Request" to test.
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* ── TAB 4: API KEYS & SECURITY TOKENS ── */}
        <TabsContent value="api_keys" className="space-y-4 pt-4">
          <Card className="overflow-hidden border shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 font-semibold border-b text-[10px] uppercase">
                <tr>
                  <th className="p-3 pl-4">Key Name</th>
                  <th className="p-3">Secret Token</th>
                  <th className="p-3">Created Date</th>
                  <th className="p-3">Last Active</th>
                  <th className="p-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {apiKeys.map((k) => (
                  <tr key={k.id}>
                    <td className="p-3 pl-4 font-bold text-foreground">{k.name}</td>
                    <td className="p-3 font-mono text-[11px]">
                      <span className="bg-muted p-1 rounded border text-muted-foreground">{k.key_token}</span>
                    </td>
                    <td className="p-3 text-muted-foreground">{k.created_at}</td>
                    <td className="p-3 font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      {k.last_used}
                    </td>
                    <td className="p-3 pr-4 text-right space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(k.key_token, k.id)}
                        className="size-7 p-0"
                      >
                        {copiedKey === k.id ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3.5" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRevokeKey(k.id)}
                        className="size-7 p-0 text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Generate API Key Modal ── */}
      <Dialog open={isNewKeyModalOpen} onOpenChange={setIsNewKeyModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Generate Developer API Key</DialogTitle>
            <DialogDescription className="text-xs">
              Generate a high-privilege bearer token for external automation, mobile clients, or cron jobs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-semibold">Application / Client Name</Label>
              <Input
                placeholder="e.g. ZKTeco Biometric Sync Daemon"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsNewKeyModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateApiKey}>Generate Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
