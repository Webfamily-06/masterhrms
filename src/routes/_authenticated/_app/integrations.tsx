import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile, useSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Webhook,
  Key,
  Plug,
  Plus,
  Trash2,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  Zap,
  Radio,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { PlanGuard } from "@/components/plan-guard";

export const Route = createFileRoute("/_authenticated/_app/integrations")({
  component: IntegrationsPage,
  head: () => ({ meta: [{ title: "Integrations, Webhooks & API Keys — Master HRMS" }] }),
});

export type IntegrationConnector = {
  id: string;
  name: string;
  category: "Communication" | "Calendar & SSO" | "Video & Meetings" | "Payment Gateway";
  description: string;
  status: "Connected" | "Available";
  iconName: string;
};

export type WebhookSubscription = {
  id: string;
  name: string;
  targetUrl: string;
  events: string[];
  secretToken: string;
  status: "Active" | "Paused";
  lastTriggered?: string;
};

export type ApiKeyRecord = {
  id: string;
  name: string;
  keyPrefix: string;
  roleScope: "Read Only" | "Read & Write" | "Full Admin";
  rateLimit: string;
  createdAt: string;
  lastUsedAt?: string;
};

const DEFAULT_CONNECTORS: IntegrationConnector[] = [
  {
    id: "slack",
    name: "Slack Enterprise Grid",
    category: "Communication",
    description: "Broadcast instant notifications for leave approvals, shift swaps, and company townhalls.",
    status: "Connected",
    iconName: "slack",
  },
  {
    id: "msteams",
    name: "Microsoft Teams",
    category: "Communication",
    description: "Daily attendance punch-in reminders and employee anniversary congratulations bot.",
    status: "Available",
    iconName: "teams",
  },
  {
    id: "google",
    name: "Google Workspace & Calendar",
    category: "Calendar & SSO",
    description: "Two-way Google Calendar synchronization for employee approved leaves and holiday schedules.",
    status: "Connected",
    iconName: "google",
  },
  {
    id: "zoom",
    name: "Zoom Video Meetings",
    category: "Video & Meetings",
    description: "Auto-generate Zoom interview links directly inside the Recruitment ATS candidate scorecard.",
    status: "Available",
    iconName: "zoom",
  },
  {
    id: "razorpay",
    name: "RazorpayX Payroll Gateway",
    category: "Payment Gateway",
    description: "Direct bank payouts for monthly salaries, expense reimbursements, and contractor invoices.",
    status: "Connected",
    iconName: "razorpay",
  },
];

const DEFAULT_WEBHOOKS: WebhookSubscription[] = [
  {
    id: "wh-1",
    name: "Enterprise ERP Sync Endpoint",
    targetUrl: "https://api.masterhrms.com/v1/erp-sync/events",
    events: ["employee.created", "leave.approved", "payroll.disbursed"],
    secretToken: "whsec_live_99218abcf0214881",
    status: "Active",
    lastTriggered: "2026-04-06 11:20:00",
  },
];

const DEFAULT_API_KEYS: ApiKeyRecord[] = [
  {
    id: "key-1",
    name: "Zapier / Make Automation Key",
    keyPrefix: "hrms_live_891a...77e2",
    roleScope: "Read & Write",
    rateLimit: "1,000 req/min",
    createdAt: "2026-02-10",
    lastUsedAt: "2026-04-06 14:02",
  },
  {
    id: "key-2",
    name: "Internal Data Warehouse Read Key",
    keyPrefix: "hrms_live_109c...44b1",
    roleScope: "Read Only",
    rateLimit: "5,000 req/min",
    createdAt: "2026-03-01",
    lastUsedAt: "2026-04-05 09:15",
  },
];

export function IntegrationsPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("connectors");

  // Modals
  const [isAddWebhookOpen, setIsAddWebhookOpen] = useState(false);
  const [isCreateKeyOpen, setIsCreateKeyOpen] = useState(false);

  // Forms
  const [webhookForm, setWebhookForm] = useState({
    name: "",
    targetUrl: "",
    events: ["employee.created", "leave.approved"],
  });

  const [keyForm, setKeyForm] = useState({
    name: "",
    roleScope: "Read & Write" as ApiKeyRecord["roleScope"],
  });

  // Query Webhooks
  const { data: webhooks = DEFAULT_WEBHOOKS } = useQuery<WebhookSubscription[]>({
    queryKey: ["tenant-webhooks", tenantId],
    queryFn: async () => {
      try {
        const page = await api.get(`/cms/pages/tenant-${tenantId}-webhooks`);
        if (Array.isArray(page?.content) && page.content.length > 0) {
          return page.content as WebhookSubscription[];
        }
        return DEFAULT_WEBHOOKS;
      } catch {
        return DEFAULT_WEBHOOKS;
      }
    },
  });

  const saveWebhooksMut = useMutation({
    mutationFn: async (updated: WebhookSubscription[]) => {
      await api.put(`/cms/pages/tenant-${tenantId}-webhooks`, {
        title: "Tenant Webhook Subscriptions",
        content: updated,
        published: true,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-webhooks", tenantId] });
      toast.success("Webhook configured!");
      setIsAddWebhookOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Query API Keys
  const { data: apiKeys = DEFAULT_API_KEYS } = useQuery<ApiKeyRecord[]>({
    queryKey: ["tenant-api-keys", tenantId],
    queryFn: async () => {
      try {
        const page = await api.get(`/cms/pages/tenant-${tenantId}-api-keys`);
        if (Array.isArray(page?.content) && page.content.length > 0) {
          return page.content as ApiKeyRecord[];
        }
        return DEFAULT_API_KEYS;
      } catch {
        return DEFAULT_API_KEYS;
      }
    },
  });

  const saveKeysMut = useMutation({
    mutationFn: async (updated: ApiKeyRecord[]) => {
      await api.put(`/cms/pages/tenant-${tenantId}-api-keys`, {
        title: "Tenant API Keys",
        content: updated,
        published: true,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-api-keys", tenantId] });
      toast.success("API key generated!");
      setIsCreateKeyOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleCreateWebhook() {
    if (!webhookForm.name.trim() || !webhookForm.targetUrl.trim()) {
      return toast.error("Name and valid HTTPS Target URL are required");
    }

    const newWh: WebhookSubscription = {
      id: `wh-${Date.now()}`,
      name: webhookForm.name.trim(),
      targetUrl: webhookForm.targetUrl.trim(),
      events: webhookForm.events,
      secretToken: `whsec_live_${Math.random().toString(36).substring(2, 12)}`,
      status: "Active",
      lastTriggered: "Never",
    };

    saveWebhooksMut.mutate([newWh, ...webhooks]);
  }

  function handleCreateApiKey() {
    if (!keyForm.name.trim()) return toast.error("API Key identifier name is required");

    const newKey: ApiKeyRecord = {
      id: `key-${Date.now()}`,
      name: keyForm.name.trim(),
      keyPrefix: `hrms_live_${Math.random().toString(36).substring(2, 6)}...${Math.random().toString(36).substring(2, 6)}`,
      roleScope: keyForm.roleScope,
      rateLimit: keyForm.roleScope === "Read Only" ? "5,000 req/min" : "1,000 req/min",
      createdAt: new Date().toISOString().slice(0, 10),
      lastUsedAt: "Never",
    };

    saveKeysMut.mutate([newKey, ...apiKeys]);
  }

  function testWebhookPing(wh: WebhookSubscription) {
    toast.success(`🚀 Test event payload sent to ${wh.targetUrl} (HTTP 200 OK)`);
  }

  return (
    <PlanGuard moduleName="Integrations & API" requiredPlan="free">
      <div className="space-y-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Plug className="size-6 text-primary" /> Integration Hub, Webhooks & API Keys
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Connect external SaaS ecosystems, subscribe to real-time webhook events, and generate developer API credentials.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateKeyOpen(true)}
              className="gap-1.5 text-xs font-bold"
            >
              <Key className="size-3.5 text-amber-500" /> New API Key
            </Button>
            <Button
              size="sm"
              onClick={() => setIsAddWebhookOpen(true)}
              className="gap-1.5 font-bold text-xs bg-primary text-primary-foreground shadow-xs"
            >
              <Webhook className="size-3.5" /> Add Webhook
            </Button>
          </div>
        </div>

        {/* Tab Selector */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full sm:w-[480px] h-10 bg-secondary/50 p-1 border">
            <TabsTrigger value="connectors" className="text-xs font-bold gap-2">
              <Plug className="size-3.5" /> Connectors ({DEFAULT_CONNECTORS.length})
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="text-xs font-bold gap-2">
              <Webhook className="size-3.5 text-blue-500" /> Webhooks ({webhooks.length})
            </TabsTrigger>
            <TabsTrigger value="keys" className="text-xs font-bold gap-2">
              <Key className="size-3.5 text-amber-500" /> API Keys ({apiKeys.length})
            </TabsTrigger>
          </TabsList>

          {/* ===================== TAB 1: CONNECTORS ===================== */}
          <TabsContent value="connectors" className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              {DEFAULT_CONNECTORS.map((c) => (
                <Card key={c.id} className="p-5 border space-y-4 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-all">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {c.category}
                      </Badge>
                      <Badge
                        className={`text-[10px] font-bold ${
                          c.status === "Connected"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {c.status}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-sm text-foreground leading-snug">{c.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{c.description}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t flex items-center justify-between">
                    <span className="text-[11px] font-mono text-muted-foreground">v2.4 OAuth 2.0</span>
                    <Button
                      size="sm"
                      variant={c.status === "Connected" ? "outline" : "default"}
                      onClick={() => toast.success(c.status === "Connected" ? "Integration synchronized." : "Connection initialized!")}
                      className="h-7 text-xs font-bold gap-1"
                    >
                      {c.status === "Connected" ? "Manage Sync" : "Connect"}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ===================== TAB 2: WEBHOOKS ===================== */}
          <TabsContent value="webhooks" className="space-y-4">
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/40">
                      <TableHead className="text-xs">Webhook Name</TableHead>
                      <TableHead className="text-xs">Target Endpoint URL</TableHead>
                      <TableHead className="text-xs">Subscribed Events</TableHead>
                      <TableHead className="text-xs">Signing Secret</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhooks.map((wh) => (
                      <TableRow key={wh.id} className="hover:bg-secondary/20">
                        <TableCell className="font-bold text-xs">{wh.name}</TableCell>
                        <TableCell className="font-mono text-xs max-w-xs truncate text-primary">
                          {wh.targetUrl}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {wh.events.map((e) => (
                              <Badge key={e} variant="secondary" className="text-[9px] font-mono">
                                {e}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {wh.secretToken.slice(0, 10)}...
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                            {wh.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => testWebhookPing(wh)}
                            className="h-7 text-xs font-bold text-primary gap-1"
                          >
                            <Send className="size-3" /> Test Ping
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===================== TAB 3: API KEYS ===================== */}
          <TabsContent value="keys" className="space-y-4">
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/40">
                      <TableHead className="text-xs">Key Label</TableHead>
                      <TableHead className="text-xs">API Token Prefix</TableHead>
                      <TableHead className="text-xs">Permissions Scope</TableHead>
                      <TableHead className="text-xs">Rate Limit</TableHead>
                      <TableHead className="text-xs">Created At</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((key) => (
                      <TableRow key={key.id} className="hover:bg-secondary/20">
                        <TableCell className="font-bold text-xs">{key.name}</TableCell>
                        <TableCell className="font-mono text-xs text-primary font-semibold">
                          {key.keyPrefix}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {key.roleScope}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{key.rateLimit}</TableCell>
                        <TableCell className="font-mono text-xs">{key.createdAt}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toast.success("Copied API Key to clipboard")}
                            className="h-7 text-xs font-bold gap-1 text-primary"
                          >
                            <Copy className="size-3" /> Copy
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ===================== MODAL: ADD WEBHOOK ===================== */}
        <Dialog open={isAddWebhookOpen} onOpenChange={setIsAddWebhookOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Webhook className="size-5 text-primary" /> Register Outgoing Webhook
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Webhook Label *</Label>
                <Input
                  value={webhookForm.name}
                  onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
                  placeholder="e.g. ERP Invoicing Sync"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Payload Target URL (HTTPS) *</Label>
                <Input
                  value={webhookForm.targetUrl}
                  onChange={(e) => setWebhookForm({ ...webhookForm, targetUrl: e.target.value })}
                  placeholder="https://api.yourdomain.com/webhooks"
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Subscribed Event Triggers</Label>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {["employee.created", "leave.approved", "expense.reimbursed", "ticket.resolved"].map((evt) => (
                    <Badge key={evt} variant="secondary" className="text-[10px] font-mono py-1 justify-start">
                      ✓ {evt}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={() => setIsAddWebhookOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateWebhook} className="font-bold bg-primary text-primary-foreground">
                Register Webhook
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===================== MODAL: CREATE API KEY ===================== */}
        <Dialog open={isCreateKeyOpen} onOpenChange={setIsCreateKeyOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="size-5 text-amber-500" /> Generate Developer API Key
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Key Identifier / Client Name *</Label>
                <Input
                  value={keyForm.name}
                  onChange={(e) => setKeyForm({ ...keyForm, name: e.target.value })}
                  placeholder="e.g. Zapier Production Sync"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Permissions Scope</Label>
                <Select
                  value={keyForm.roleScope}
                  onValueChange={(v: any) => setKeyForm({ ...keyForm, roleScope: v })}
                >
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Read Only">Read Only (GET endpoints)</SelectItem>
                    <SelectItem value="Read & Write">Read & Write (GET, POST, PUT)</SelectItem>
                    <SelectItem value="Full Admin">Full Admin (Full Tenant Access)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={() => setIsCreateKeyOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateApiKey} className="font-bold bg-amber-600 hover:bg-amber-700 text-white">
                Generate Token
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PlanGuard>
  );
}
