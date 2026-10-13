import { createFileRoute } from "@tanstack/react-router";
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
  Webhook,
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Check,
  Terminal,
  Activity,
  Loader2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";

export const Route = createFileRoute("/_authenticated/_app/outbound-webhooks")({
  component: OutboundWebhooksPage,
  head: () => ({
    meta: [{ title: "Outbound Webhooks & Event Streams — Master ERP" }],
  }),
});

interface WebhookEndpointItem {
  id: string;
  url: string;
  secretMasked: string;
  events: string[];
  status: "active" | "disabled";
  createdAt: string;
}

interface WebhookDeliveryLogItem {
  id: string;
  endpointId: string;
  event: string;
  statusCode?: number | null;
  durationMs: number;
  attempt: number;
  maxAttempts: number;
  status: "success" | "failed";
  error?: string | null;
  timestamp: string;
}

export function OutboundWebhooksPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"endpoints" | "logs">("endpoints");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdSecretModal, setCreatedSecretModal] = useState<{ rawSecret: string; endpoint: WebhookEndpointItem } | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Form State
  const [targetUrl, setTargetUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["*"]);

  // 1. Fetch endpoints
  const { data: endpoints = [], isLoading: isEndpointsLoading, refetch: refetchEndpoints } = useQuery<WebhookEndpointItem[]>({
    queryKey: ["tenant-webhook-endpoints"],
    queryFn: async () => {
      try {
        const res = await api.get<{ endpoints: WebhookEndpointItem[] }>("/outbound-webhooks/endpoints");
        return res?.endpoints || [];
      } catch {
        return [];
      }
    },
    staleTime: 5000,
  });

  // 2. Fetch delivery logs
  const { data: logs = [], isLoading: isLogsLoading, refetch: refetchLogs } = useQuery<WebhookDeliveryLogItem[]>({
    queryKey: ["tenant-webhook-logs"],
    queryFn: async () => {
      try {
        const res = await api.get<{ logs: WebhookDeliveryLogItem[] }>("/outbound-webhooks/logs");
        return res?.logs || [];
      } catch {
        return [];
      }
    },
    staleTime: 5000,
  });

  // 3. Create endpoint mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      return await api.post<{ endpoint: WebhookEndpointItem; rawSecret: string }>("/outbound-webhooks/endpoints", {
        url: targetUrl.trim(),
        events: selectedEvents,
      });
    },
    onSuccess: (data) => {
      toast.success("Webhook endpoint registered successfully!");
      setShowCreateModal(false);
      setTargetUrl("");
      setCreatedSecretModal(data);
      refetchEndpoints();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to register webhook endpoint (SSRF validation rejection).");
    },
  });

  // 4. Delete endpoint mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/outbound-webhooks/endpoints/${id}`);
    },
    onSuccess: () => {
      toast.success("Webhook endpoint deleted.");
      refetchEndpoints();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete endpoint.");
    },
  });

  // 5. Test dispatch mutation
  const testDispatchMutation = useMutation({
    mutationFn: async () => {
      return await api.post<{ success: boolean; deliveries: WebhookDeliveryLogItem[] }>("/outbound-webhooks/test-dispatch", {
        event: "test.ping",
        payload: {
          message: "Manual test ping from Master ERP workspace admin console",
          timestamp: new Date().toISOString(),
        },
      });
    },
    onSuccess: (data) => {
      toast.success(`Test ping dispatched to ${data?.deliveries?.length ?? 0} endpoints!`);
      refetchLogs();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Test dispatch failed.");
    },
  });

  const AVAILABLE_EVENTS = [
    { id: "*", label: "All Events (Wildcard Stream)" },
    { id: "employee.created", label: "Employee Created" },
    { id: "invoice.paid", label: "Invoice Paid" },
    { id: "attendance.logged", label: "Attendance Punched" },
    { id: "leave.approved", label: "Leave Request Approved" },
  ];

  const toggleEvent = (ev: string) => {
    if (ev === "*") {
      setSelectedEvents(["*"]);
      return;
    }
    const filteredWithoutAll = selectedEvents.filter((e) => e !== "*");
    if (filteredWithoutAll.includes(ev)) {
      const next = filteredWithoutAll.filter((e) => e !== ev);
      setSelectedEvents(next.length === 0 ? ["*"] : next);
    } else {
      setSelectedEvents([...filteredWithoutAll, ev]);
    }
  };

  const handleCopySecret = () => {
    if (!createdSecretModal?.rawSecret) return;
    navigator.clipboard.writeText(createdSecretModal.rawSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
    toast.success("Signing secret copied to clipboard");
  };

  return (
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <BreadcrumbNav />
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Outbound Webhooks</h1>
            <Badge variant="outline" className="text-xs font-mono">
              E6 Messaging Engine
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time event streams with HMAC-SHA256 request signatures, bounded retries, and strict SSRF / DNS rebinding defenses.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            size="sm"
            variant="outline"
            disabled={endpoints.length === 0 || testDispatchMutation.isPending}
            onClick={() => testDispatchMutation.mutate()}
            className="text-xs font-bold gap-1.5"
          >
            {testDispatchMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5 text-primary" />
            )}
            Send Test Ping
          </Button>

          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="text-xs font-bold gap-1.5 shadow-sm"
          >
            <Plus className="size-4" /> Register Endpoint
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === "endpoints" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("endpoints")}
          className="text-xs font-bold gap-1.5"
        >
          <Webhook className="size-3.5" /> Endpoints ({endpoints.length})
        </Button>
        <Button
          variant={activeTab === "logs" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("logs")}
          className="text-xs font-bold gap-1.5"
        >
          <Activity className="size-3.5" /> Delivery Logs ({logs.length})
        </Button>
      </div>

      {/* TAB 1: ENDPOINTS LIST */}
      {activeTab === "endpoints" && (
        <div className="space-y-4">
          {isEndpointsLoading ? (
            <Card className="p-16 text-center">
              <Loader2 className="size-8 animate-spin mx-auto text-primary" />
              <p className="text-xs text-muted-foreground mt-2">Loading endpoints...</p>
            </Card>
          ) : endpoints.length === 0 ? (
            <Card className="p-16 text-center border-dashed border-2">
              <Webhook className="size-10 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="font-bold text-sm text-foreground">No Webhook Endpoints Configured</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                Register an external HTTP URL to receive cryptographically signed ERP business events.
              </p>
              <Button size="sm" className="mt-4 font-bold" onClick={() => setShowCreateModal(true)}>
                Register First Endpoint
              </Button>
            </Card>
          ) : (
            <div className="grid gap-3">
              {endpoints.map((ep) => (
                <Card key={ep.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border shadow-xs hover:border-primary/40 transition-colors">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold">
                        ACTIVE
                      </Badge>
                      <h4 className="font-bold text-sm text-foreground font-mono truncate max-w-md">
                        {ep.url}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Subscribed Events:</span>
                      {ep.events.map((ev) => (
                        <Badge key={ev} variant="outline" className="font-mono text-[10px] bg-card">
                          {ev}
                        </Badge>
                      ))}
                    </div>

                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 font-mono">
                      <span>Secret: <strong>{ep.secretMasked}</strong></span>
                      <span>• Registered: {new Date(ep.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0 border-t md:border-t-0 pt-2 md:pt-0">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 text-xs font-bold gap-1"
                      onClick={() => {
                        if (confirm(`Delete webhook endpoint ${ep.url}?`)) {
                          deleteMutation.mutate(ep.id);
                        }
                      }}
                    >
                      <Trash2 className="size-3.5" /> Delete
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DELIVERY LOGS */}
      {activeTab === "logs" && (
        <Card className="border shadow-xs overflow-hidden">
          {isLogsLoading ? (
            <div className="p-16 text-center">
              <Loader2 className="size-8 animate-spin mx-auto text-primary" />
              <p className="text-xs text-muted-foreground mt-2">Loading delivery history...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-16 text-center space-y-2">
              <Activity className="size-10 text-muted-foreground/30 mx-auto" />
              <h3 className="font-bold text-sm text-foreground">No Delivery Attempts Recorded</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Trigger a test ping or perform a workspace mutation to generate delivery traces.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b font-bold uppercase text-[10px] text-muted-foreground tracking-wider">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Event</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">HTTP Code</th>
                    <th className="p-3">Duration</th>
                    <th className="p-3">Attempts</th>
                    <th className="p-3">Notes / Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-mono text-[11px]">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="p-3 font-semibold text-foreground">{log.event}</td>
                      <td className="p-3">
                        {log.status === "success" ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold gap-1">
                            <CheckCircle2 className="size-3" /> DELIVERED
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px] font-bold gap-1">
                            <XCircle className="size-3" /> FAILED
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 font-bold text-foreground">
                        {log.statusCode ? `HTTP ${log.statusCode}` : "—"}
                      </td>
                      <td className="p-3 text-muted-foreground">{log.durationMs} ms</td>
                      <td className="p-3 text-muted-foreground">{log.attempt} / {log.maxAttempts}</td>
                      <td className="p-3 text-muted-foreground truncate max-w-xs font-sans text-xs">
                        {log.error || "Acknowledged 200 OK"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* MODAL 1: REGISTER ENDPOINT */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Webhook className="size-4 text-primary" /> Register Webhook Destination
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provide an HTTPS receiver URL. Internal RFC 1918 subnets and cloud metadata endpoints are strictly blocked.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Target URL (HTTPS Recommended)</Label>
              <Input
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="text-xs h-9 font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Event Triggers</Label>
              <div className="space-y-2 border rounded-xl p-3 max-h-48 overflow-y-auto">
                {AVAILABLE_EVENTS.map((ev) => {
                  const checked = selectedEvents.includes(ev.id);
                  return (
                    <div
                      key={ev.id}
                      onClick={() => toggleEvent(ev.id)}
                      className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-muted/40 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {}}
                        className="rounded text-primary"
                      />
                      <span className="font-semibold text-foreground font-mono text-[11px]">{ev.label}</span>
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
              disabled={!targetUrl.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="font-bold"
            >
              {createMutation.isPending ? "Validating & Registering..." : "Register Endpoint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: RAW SECRET DISPLAY */}
      <Dialog open={!!createdSecretModal} onOpenChange={(open) => !open && setCreatedSecretModal(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-emerald-600">
              <ShieldCheck className="size-5" /> Webhook Registered Successfully
            </DialogTitle>
            <DialogDescription className="text-xs">
              Save your HMAC signing secret now. This secret is encrypted at rest and will <strong>never be shown in plaintext again</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded-xl border bg-muted/40 space-y-1 leading-relaxed">
              <span className="font-bold text-foreground">Signature Verification Header:</span>
              <p className="text-[11px] text-muted-foreground font-mono">
                X-MASTERHRMS-Signature: t=1697112000,v1=5d41402abc4b2a76b97...
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Signing Secret</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={createdSecretModal?.rawSecret || ""}
                  className="font-mono text-xs font-bold bg-muted/30 select-all"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 font-bold gap-1 text-xs"
                  onClick={handleCopySecret}
                >
                  {copiedSecret ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />} Copy Secret
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button size="sm" onClick={() => setCreatedSecretModal(null)} className="font-bold">
              Done & Secured
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default OutboundWebhooksPage;
