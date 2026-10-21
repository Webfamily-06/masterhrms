'use client';
import {  createFileRoute  } from "@/src/lib/router-compat";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Code,
  ShieldCheck,
  AlertTriangle,
  Lock,
  ExternalLink,
  BookOpen,
  Terminal,
  Clock,
  Layers,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";



interface ApiKeyItem {
  id: string;
  name: string;
  keyMasked: string;
  scopes: string[];
  rateLimitPerMin: number;
  status: "active" | "revoked";
  createdAt: string;
  lastUsedAt?: string | null;
}

function PublicApiPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"keys" | "docs">("keys");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdRawKeyModal, setCreatedRawKeyModal] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Form State
  const [keyName, setKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    "employees:read",
    "attendance:read",
    "invoices:read",
  ]);
  const [rateLimit, setRateLimit] = useState(100);

  // 1. Fetch Keys
  const { data: keys = [], isLoading, refetch } = useQuery<ApiKeyItem[]>({
    queryKey: ["tenant-api-keys"],
    queryFn: async () => {
      try {
        const res = await api.get<{ keys: ApiKeyItem[] }>("/public-api/keys");
        return res?.keys || [];
      } catch {
        return [];
      }
    },
    staleTime: 5000,
  });

  // 2. Fetch OpenAPI Spec
  const { data: openApiSpec } = useQuery({
    queryKey: ["public-api-openapi-spec"],
    queryFn: async () => {
      try {
        const res = await api.get("/public-api/specs/openapi.json");
        return res;
      } catch {
        return null;
      }
    },
    enabled: activeTab === "docs",
    staleTime: 60 * 1000,
  });

  // 3. Create Key Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      return await api.post<{ key: ApiKeyItem; rawKey: string }>("/public-api/keys", {
        name: keyName.trim(),
        scopes: selectedScopes,
        rateLimitPerMin: Number(rateLimit),
      });
    },
    onSuccess: (data) => {
      toast.success("API Key generated successfully!");
      setShowCreateModal(false);
      setKeyName("");
      setCreatedRawKeyModal(data.rawKey);
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to generate API Key.");
    },
  });

  // 4. Revoke Key Mutation
  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/public-api/keys/${id}`);
    },
    onSuccess: () => {
      toast.success("API Key revoked immediately.");
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to revoke API Key.");
    },
  });

  const AVAILABLE_SCOPES = [
    { id: "employees:read", label: "Read Employees", desc: "Query workforce profiles and directory" },
    { id: "employees:write", label: "Write Employees", desc: "Create and update employee records" },
    { id: "attendance:read", label: "Read Attendance", desc: "Query timesheets and biometric punches" },
    { id: "invoices:read", label: "Read Invoices", desc: "Query bills and financial transactions" },
    { id: "webhooks:manage", label: "Manage Webhooks", desc: "Configure event delivery destinations" },
  ];

  const toggleScope = (scopeId: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scopeId) ? prev.filter((s) => s !== scopeId) : [...prev, scopeId]
    );
  };

  const handleCopyRawKey = () => {
    if (!createdRawKeyModal) return;
    navigator.clipboard.writeText(createdRawKeyModal);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    toast.success("API Key copied to clipboard");
  };

  return (
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <BreadcrumbNav />
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Developer Public API</h1>
            <Badge variant="outline" className="text-xs font-mono">
              E12 Collaboration Engine
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Generate cryptographically secure API credentials with scoped permissions, rate limits, and OpenAPI 3.0 specs.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="text-xs font-bold gap-1.5 shadow-sm"
          >
            <Plus className="size-4" /> Create API Key
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === "keys" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("keys")}
          className="text-xs font-bold gap-1.5"
        >
          <Key className="size-3.5" /> API Keys ({keys.length})
        </Button>
        <Button
          variant={activeTab === "docs" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("docs")}
          className="text-xs font-bold gap-1.5"
        >
          <BookOpen className="size-3.5" /> OpenAPI Specification & Endpoints
        </Button>
      </div>

      {/* TAB 1: API KEYS */}
      {activeTab === "keys" && (
        <div className="space-y-4">
          {isLoading ? (
            <Card className="p-16 text-center">
              <Loader2 className="size-8 animate-spin mx-auto text-primary" />
              <p className="text-xs text-muted-foreground mt-2">Loading API credentials...</p>
            </Card>
          ) : keys.length === 0 ? (
            <Card className="p-16 text-center border-dashed border-2">
              <Key className="size-10 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="font-bold text-sm text-foreground">No API Keys Generated Yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                Generate an API key to securely integrate ERP data with Zapier, custom scripts, or internal dashboards.
              </p>
              <Button size="sm" className="mt-4 font-bold" onClick={() => setShowCreateModal(true)}>
                Generate First API Key
              </Button>
            </Card>
          ) : (
            <div className="grid gap-3">
              {keys.map((k) => (
                <Card
                  key={k.id}
                  className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border shadow-xs transition-colors ${
                    k.status === "revoked" ? "opacity-60 bg-muted/20" : ""
                  }`}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-foreground">{k.name}</h4>
                      {k.status === "active" ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold">
                          ACTIVE
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px] font-bold">
                          REVOKED
                        </Badge>
                      )}
                      <span className="font-mono text-xs bg-muted/40 px-2 py-0.5 rounded border">
                        {k.keyMasked}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Scopes:</span>
                      {k.scopes.map((s) => (
                        <Badge key={s} variant="outline" className="font-mono text-[10px]">
                          {s}
                        </Badge>
                      ))}
                    </div>

                    <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                      <span>Rate limit: <strong>{k.rateLimitPerMin} req/min</strong></span>
                      <span>Created: {new Date(k.createdAt).toLocaleDateString()}</span>
                      <span>Last used: {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "Never"}</span>
                    </div>
                  </div>

                  {k.status === "active" && (
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0 border-t md:border-t-0 pt-2 md:pt-0">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 text-xs font-bold gap-1"
                        onClick={() => {
                          if (confirm(`Revoke API key "${k.name}"? Any applications using this key will immediately fail.`)) {
                            revokeMutation.mutate(k.id);
                          }
                        }}
                      >
                        <Trash2 className="size-3.5" /> Revoke Key
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: OPENAPI VIEWER */}
      {activeTab === "docs" && (
        <Card className="border shadow-xs">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Terminal className="size-5 text-primary" /> OpenAPI 3.0 Specification Reference
            </CardTitle>
            <CardDescription className="text-xs">
              Direct REST integration endpoints authenticated via <code className="bg-muted px-1 py-0.5 rounded font-mono">Authorization: Bearer mhr_live_...</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-xs font-mono">
            <div className="p-3.5 rounded-xl border bg-muted/30 space-y-2">
              <div className="font-bold text-foreground text-xs uppercase tracking-wider font-sans">
                Quick Start cURL Example
              </div>
              <pre className="p-3 bg-black text-emerald-400 rounded-lg text-xs overflow-x-auto">
{`curl -X GET "http://localhost:5000/api/v1/public-api/employees" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
              </pre>
            </div>

            <div className="space-y-3 pt-2 font-sans">
              <h3 className="font-bold text-sm text-foreground">Core Workspace Endpoints</h3>
              <div className="divide-y border rounded-xl overflow-hidden font-mono text-xs">
                {[
                  { method: "GET", path: "/api/v1/public-api/employees", scope: "employees:read", desc: "List workspace employee profiles with pagination" },
                  { method: "GET", path: "/api/v1/public-api/attendance", scope: "attendance:read", desc: "Fetch daily attendance records and punch intervals" },
                  { method: "GET", path: "/api/v1/public-api/invoices", scope: "invoices:read", desc: "Query sales invoices and client transaction ledgers" },
                  { method: "POST", path: "/api/v1/public-api/webhooks", scope: "webhooks:manage", desc: "Register an external HTTP webhook receiver" },
                ].map((ep, i) => (
                  <div key={i} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-muted/10">
                    <div className="flex items-center gap-2">
                      <span className="bg-primary/10 text-primary font-bold px-2 py-0.5 rounded text-[10px]">
                        {ep.method}
                      </span>
                      <span className="font-bold text-foreground">{ep.path}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {ep.scope}
                      </Badge>
                      <span className="text-muted-foreground text-xs font-sans">{ep.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MODAL 1: CREATE API KEY */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Key className="size-4 text-primary" /> Generate New API Key
            </DialogTitle>
            <DialogDescription className="text-xs">
              Keys are generated with 256-bit cryptographically secure entropy and hashed at rest.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Key Name / Description</Label>
              <Input
                placeholder="Zapier Sync or Mobile App Integration"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Rate Limit (Requests / minute)</Label>
              <Input
                type="number"
                min={10}
                max={1000}
                value={rateLimit}
                onChange={(e) => setRateLimit(parseInt(e.target.value) || 100)}
                className="text-xs h-9 font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Permission Scopes</Label>
              <div className="space-y-2 border rounded-xl p-3 max-h-48 overflow-y-auto">
                {AVAILABLE_SCOPES.map((sc) => {
                  const checked = selectedScopes.includes(sc.id);
                  return (
                    <div
                      key={sc.id}
                      onClick={() => toggleScope(sc.id)}
                      className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-muted/40 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {}}
                        className="mt-0.5 rounded text-primary"
                      />
                      <div>
                        <div className="font-bold text-foreground font-mono text-[11px]">{sc.label} ({sc.id})</div>
                        <div className="text-[10px] text-muted-foreground">{sc.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button size="sm" variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!keyName.trim() || selectedScopes.length === 0 || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="font-bold"
            >
              {createMutation.isPending ? "Generating..." : "Generate Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: RAW SECRET ONE-TIME DISPLAY */}
      <Dialog open={!!createdRawKeyModal} onOpenChange={(open) => !open && setCreatedRawKeyModal(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-emerald-600">
              <ShieldCheck className="size-5" /> API Key Created Successfully
            </DialogTitle>
            <DialogDescription className="text-xs">
              Please copy your key immediately. For enterprise security, this secret is hashed at rest and will <strong>never be displayed again</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded-xl border bg-amber-500/10 border-amber-500/20 text-amber-800 text-xs">
              <strong>Security Alert:</strong> Anyone with this key can access your workspace data within the assigned permission scopes. Store it securely in an environment variable or secrets manager.
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Raw Secret Key</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={createdRawKeyModal || ""}
                  className="font-mono text-xs font-bold bg-muted/40 select-all"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 font-bold gap-1 text-xs"
                  onClick={handleCopyRawKey}
                >
                  {copiedKey ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />} Copy Key
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button size="sm" onClick={() => setCreatedRawKeyModal(null)} className="font-bold">
              I Have Stored the Key Securely
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PublicApiPage;
