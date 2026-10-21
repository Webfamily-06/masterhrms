'use client';
import { useState, useEffect } from "react";
import {  createFileRoute, Link, useParams  } from "@/src/lib/router-compat";
import { 
  ArrowLeft, 
  RotateCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Copy,
  Check,
  Send,
  ExternalLink,
  ShieldCheck,
  Server,
  Edit,
  Key,
  Eye,
  EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { PlanGuard } from "@/components/plan-guard";
import { WebhookNavHeader } from "@/components/addons/webhook-nav-header";
import { getAuthHeaders } from "@/lib/api";

const Route = createFileRoute("/_authenticated/_app/addons/webhook/endpoints/$id/")({
  component: WebhookEndpointDetailPage,
});

interface EndpointDetail {
  id: string;
  name: string;
  eventKey: string;
  module: string;
  method: "GET" | "POST" | "PUT";
  url: string;
  secretMasked?: string;
  headersJson: Record<string, string>;
  isActive: boolean;
  timeoutMs: number;
  maxRetries: number;
  consecutiveFailures: number;
  disabledReason?: string;
  lastDeliveryAt?: string;
  successRate7d: number;
  version: number;
  createdAt: string;
}

interface DeliveryLogItem {
  id: string;
  eventKey: string;
  status: "queued" | "success" | "failed" | "retrying" | "dead";
  attempt: number;
  httpStatus?: number;
  durationMs?: number;
  createdAt: string;
}

function WebhookEndpointDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const [endpoint, setEndpoint] = useState<EndpointDetail | null>(null);
  const [logs, setLogs] = useState<DeliveryLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/addons/webhook/endpoints/${id}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load endpoint details");
      const data = await res.json();
      setEndpoint(data.endpoint);
      setLogs(data.recentDeliveries || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load endpoint");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleToggle = async (active: boolean) => {
    try {
      const res = await fetch(`/api/v1/addons/webhook/endpoints/${id}/toggle`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive: active }),
      });
      if (!res.ok) throw new Error("Failed to toggle endpoint");
      toast.success(`Endpoint ${active ? "activated" : "deactivated"}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRotateSecret = async () => {
    if (!confirm("Are you sure you want to rotate the HMAC secret? The current secret will be invalidated immediately.")) {
      return;
    }
    try {
      setRotating(true);
      const res = await fetch(`/api/v1/addons/webhook/endpoints/${id}/rotate-secret`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to rotate secret");
      const data = await res.json();
      setRevealedSecret(data.rawSecret);
      toast.success("Secret rotated successfully. Please copy it now as it will not be displayed again.");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRotating(false);
    }
  };

  const handleTestDispatch = async () => {
    try {
      setTesting(true);
      const res = await fetch(`/api/v1/addons/webhook/endpoints/${id}/test`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Test dispatch failed");
      toast.success(`Test webhook dispatched! Status: ${data.delivery?.status || "queued"}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Test dispatch failed");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="flex items-center space-x-2 text-muted-foreground">
          <RotateCw className="w-5 h-5 animate-spin" />
          <span>Loading endpoint configuration...</span>
        </div>
      </div>
    );
  }

  if (!endpoint) {
    return (
      <div className="p-8 space-y-4">
        <h2 className="text-xl font-bold">Endpoint Not Found</h2>
        <Button asChild variant="outline">
          <Link to="/addons/webhook/endpoints">Back to Endpoints</Link>
        </Button>
      </div>
    );
  }

  return (
    <PlanGuard moduleName="Outbound Webhooks" requiredPlan="starter">
      <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
        <WebhookNavHeader activeTab="endpoints" />

        {/* Top bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
          <div className="flex items-center space-x-3">
            <Button asChild variant="ghost" size="icon">
              <Link to="/addons/webhook/endpoints">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold tracking-tight">{endpoint.name}</h1>
                <Badge variant={endpoint.isActive ? "default" : "secondary"}>
                  {endpoint.isActive ? "Active" : "Disabled"}
                </Badge>
                <Badge variant="outline" className="font-mono">{endpoint.method}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono break-all">
                {endpoint.url}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" onClick={handleTestDispatch} disabled={testing}>
              <Send className={`w-4 h-4 mr-2 ${testing ? "animate-spin" : ""}`} />
              Send Test Event
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/addons/webhook/endpoints/$id/edit" params={{ id: endpoint.id }}>
                <Edit className="w-4 h-4 mr-2" /> Edit
              </Link>
            </Button>
          </div>
        </div>

        {/* Circuit breaker alert if disabled */}
        {endpoint.disabledReason && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center space-x-3 text-rose-700">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Circuit Breaker Auto-Disabled</p>
              <p className="text-xs">{endpoint.disabledReason}</p>
            </div>
          </div>
        )}

        {/* Secret Reveal Card if just rotated */}
        {revealedSecret && (
          <Card className="border-amber-500/30 bg-amber-500/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-amber-800 flex items-center">
                <Key className="w-4 h-4 mr-2" /> Newly Generated Webhook Signing Secret
              </CardTitle>
              <CardDescription className="text-xs text-amber-700">
                Copy this HMAC secret now. It will NEVER be shown again in plain text.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center space-x-2">
              <input
                readOnly
                value={revealedSecret}
                className="font-mono text-xs p-2 bg-background border rounded flex-1 select-all"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(revealedSecret);
                  toast.success("Secret copied to clipboard");
                }}
              >
                <Copy className="w-4 h-4 mr-1" /> Copy
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Configuration Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase font-semibold">Event Trigger</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-sm font-semibold">{endpoint.eventKey}</p>
              <p className="text-xs text-muted-foreground mt-1">Module: {endpoint.module}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase font-semibold">Reliability & SLA</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold font-mono text-emerald-600">{endpoint.successRate7d}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                Timeout: {endpoint.timeoutMs}ms | Retries: {endpoint.maxRetries}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs text-muted-foreground uppercase font-semibold">Secret Key</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleRotateSecret} disabled={rotating} className="text-xs h-7">
                <Key className="w-3.5 h-3.5 mr-1" /> Rotate
              </Button>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-xs text-muted-foreground">whsec_••••••••••••••••</p>
              <p className="text-[11px] text-muted-foreground mt-1">HMAC-SHA256 signature calculated on payload</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Deliveries */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Deliveries (Last 20)</CardTitle>
              <CardDescription className="text-xs">Audit log of outbound HTTP dispatches to this endpoint</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/addons/webhook/events">
                View All in Event Catalog
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No delivery attempts recorded yet for this endpoint.
              </div>
            ) : (
              <div className="divide-y text-xs">
                {logs.map((log) => (
                  <div key={log.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {log.status === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-500" />
                      )}
                      <div>
                        <span className="font-mono font-medium">{log.eventKey}</span>
                        <span className="text-muted-foreground ml-2">Attempt #{log.attempt}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="font-mono">{log.httpStatus || "N/A"}</span>
                      <span className="text-muted-foreground">{log.durationMs ? `${log.durationMs}ms` : "—"}</span>
                      <span className="text-muted-foreground">{new Date(log.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PlanGuard>
  );
}

export default WebhookEndpointDetailPage;
