import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Code,
  Key,
  Copy,
  Plus,
  Trash2,
  CheckCircle2,
  Lock,
  Globe,
  Terminal,
  FileCode,
  RefreshCw,
  Loader2,
  Sliders,
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

export type RestEndpoint = {
  id: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  category: "Employees" | "Attendance" | "Payroll" | "Addons" | "Tenants";
  curlExample: string;
  responseExample: string;
};

const REST_ENDPOINTS: RestEndpoint[] = [
  {
    id: "ep-1",
    method: "GET",
    path: "/api/v1/employees",
    description: "Fetch list of active employees with department and designation mapping.",
    category: "Employees",
    curlExample: `curl -X GET "https://api.masterhrms.com/v1/employees" \\
  -H "Authorization: Bearer mhrms_sec_live_998877" \\
  -H "Content-Type: application/json"`,
    responseExample: `{
  "status": "success",
  "count": 48,
  "data": [
    { "id": "emp_01", "name": "Aarav Sharma", "email": "aarav@workspace.com", "role": "Senior Engineer", "status": "active" }
  ]
}`,
  },
  {
    id: "ep-2",
    method: "POST",
    path: "/api/v1/attendance/punch",
    description: "Post a real-time biometric or manual clock-in punch timestamp.",
    category: "Attendance",
    curlExample: `curl -X POST "https://api.masterhrms.com/v1/attendance/punch" \\
  -H "Authorization: Bearer mhrms_sec_live_998877" \\
  -H "Content-Type: application/json" \\
  -d '{"employee_id": "emp_01", "type": "clock_in", "timestamp": "2026-08-18T09:00:00Z"}'`,
    responseExample: `{
  "status": "recorded",
  "punch_id": "pnch_99812",
  "message": "Clock-in verified at 09:00 AM"
}`,
  },
  {
    id: "ep-3",
    method: "GET",
    path: "/api/v1/payroll/summary",
    description: "Retrieve gross, net, TDS and statutory deduction summaries for current cycle.",
    category: "Payroll",
    curlExample: `curl -X GET "https://api.masterhrms.com/v1/payroll/summary?month=2026-08" \\
  -H "Authorization: Bearer mhrms_sec_live_998877"`,
    responseExample: `{
  "cycle": "August 2026",
  "total_gross": 4850000,
  "total_net": 4200000,
  "status": "processed"
}`,
  },
  {
    id: "ep-4",
    method: "POST",
    path: "/api/v1/addons/trigger-sync",
    description: "Force trigger remote cloud sync for installed add-ons (Tally, Biometric, OCR).",
    category: "Addons",
    curlExample: `curl -X POST "https://api.masterhrms.com/v1/addons/trigger-sync" \\
  -H "Authorization: Bearer mhrms_sec_live_998877" \\
  -d '{"addon_slug": "tally-importer"}'`,
    responseExample: `{
  "job_id": "job_sync_7761",
  "status": "queued"
}`,
  },
];

const DEFAULT_API_KEYS: ApiKeyRecord[] = [
  {
    id: "k-1",
    name: "Production Webhook Key (ZKTeco Biometric)",
    key_token: "mhrms_sec_live_998877a1b2c3d4e5f6",
    created_at: "2026-01-15",
    last_used: "2 mins ago",
    permissions: ["ep-1", "ep-2"],
  },
  {
    id: "k-2",
    name: "Tally Prime ERP ODBC Gateway",
    key_token: "mhrms_sec_tally_445566x1y2z3a4b5c6",
    created_at: "2026-03-10",
    last_used: "1 hour ago",
    permissions: ["ep-1", "ep-3", "ep-4"],
  },
];

function ApiDocsAdminStudio() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"api_keys" | "endpoints_matrix" | "interactive_docs">(
    "api_keys",
  );
  const [isNewKeyModalOpen, setIsNewKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");

  // 1. REALTIME QUERY: Fetch API keys from MySQL API
  const {
    data: keysData,
    isLoading,
    refetch,
  } = useQuery({
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

  // 2. REALTIME MUTATION: Save API keys to MySQL API
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
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleCreateApiKey() {
    if (!newKeyName) return;
    const token = `mhrms_sec_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
    const newRecord: ApiKeyRecord = {
      id: `k-${Date.now()}`,
      name: newKeyName,
      key_token: token,
      created_at: new Date().toISOString().split("T")[0],
      last_used: "Never",
      permissions: ["ep-1", "ep-2", "ep-3"],
    };
    saveKeysMutation.mutate([...apiKeys, newRecord]);
    setNewKeyName("");
    setIsNewKeyModalOpen(false);
    toast.success("New API key generated successfully!");
  }

  function handleRevokeKey(id: string) {
    const updated = apiKeys.filter((k) => k.id !== id);
    saveKeysMutation.mutate(updated);
    toast.success("API key revoked");
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">API & Documentation</h1>
            <Badge variant="secondary" className="gap-1 text-xs">
              <Code className="size-3 text-primary" /> REST API v1
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Generate developer API keys, configure endpoint permission scopes, and view curl
            documentation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setIsNewKeyModalOpen(true)} className="gap-2">
            <Plus className="size-4" /> Generate API Key
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-3 w-[450px]">
          <TabsTrigger value="api_keys" className="gap-1.5 text-xs">
            <Key className="size-3.5" /> API Keys ({apiKeys.length})
          </TabsTrigger>
          <TabsTrigger value="endpoints_matrix" className="gap-1.5 text-xs">
            <Sliders className="size-3.5" /> Endpoint Matrix
          </TabsTrigger>
          <TabsTrigger value="interactive_docs" className="gap-1.5 text-xs">
            <Terminal className="size-3.5" /> REST Docs
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: API KEYS */}
        <TabsContent value="api_keys" className="space-y-4 pt-4">
          <Card className="overflow-hidden border shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-secondary/50 font-semibold border-b text-[10px] uppercase">
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
                    <td className="p-3 pl-4 font-bold">{k.name}</td>
                    <td className="p-3 font-mono text-[11px]">
                      <span className="bg-secondary p-1 rounded border">{k.key_token}</span>
                    </td>
                    <td className="p-3 text-muted-foreground">{k.created_at}</td>
                    <td className="p-3 font-mono text-[10px] text-emerald-600 font-semibold">
                      {k.last_used}
                    </td>
                    <td className="p-3 pr-4 text-right space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(k.key_token)}
                        className="size-7 p-0"
                      >
                        <Copy className="size-3.5" />
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

        {/* TAB 2: ENDPOINTS MATRIX */}
        <TabsContent value="endpoints_matrix" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {REST_ENDPOINTS.map((ep) => (
              <Card key={ep.id} className="p-4 border shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant={ep.method === "GET" ? "default" : "secondary"}>{ep.method}</Badge>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {ep.category}
                  </Badge>
                </div>
                <div className="font-mono text-xs font-bold">{ep.path}</div>
                <p className="text-xs text-muted-foreground">{ep.description}</p>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 3: INTERACTIVE DOCS */}
        <TabsContent value="interactive_docs" className="space-y-6 pt-4">
          {REST_ENDPOINTS.map((ep) => (
            <Card key={ep.id} className="p-6 border shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={ep.method === "GET" ? "default" : "secondary"}>{ep.method}</Badge>
                <span className="font-mono font-bold text-sm">{ep.path}</span>
              </div>
              <p className="text-xs text-muted-foreground">{ep.description}</p>

              <div className="space-y-2">
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>Curl Request Example</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopy(ep.curlExample)}
                    className="size-6 p-0"
                  >
                    <Copy className="size-3" />
                  </Button>
                </div>
                <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 text-xs font-mono overflow-x-auto">
                  {ep.curlExample}
                </pre>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold">Sample Response JSON</div>
                <pre className="p-4 rounded-xl bg-slate-900 text-emerald-400 text-xs font-mono overflow-x-auto">
                  {ep.responseExample}
                </pre>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Generate API Key Modal */}
      <Dialog open={isNewKeyModalOpen} onOpenChange={setIsNewKeyModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Generate Developer API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs font-semibold">Key Identifier / Application Name</Label>
            <Input
              placeholder="e.g. Payroll Mobile App Connector"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewKeyModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateApiKey}>Generate Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
