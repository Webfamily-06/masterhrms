'use client';
import {  createFileRoute, useNavigate, Link  } from "@/src/lib/router-compat";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Webhook,
  ArrowLeft,
  Key,
  ShieldCheck,
  Send,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react";
import { PlanGuard } from "@/components/plan-guard";
import { toast } from "sonner";
import { WebhookNavHeader } from "@/components/addons/webhook-nav-header";

const Route = createFileRoute("/_authenticated/_app/addons/webhook/endpoints/new")({
  component: CreateWebhookEndpointPage,
  head: () => ({ meta: [{ title: "Create Webhook Endpoint — Master ERP" }] }),
});

function CreateWebhookEndpointPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [module, setModule] = useState("HRM Core");
  const [eventKey, setEventKey] = useState("hrm.employee.created");
  const [method, setMethod] = useState<"POST" | "GET" | "PUT">("POST");
  const [url, setUrl] = useState("");
  const [timeoutMs, setTimeoutMs] = useState("5000");
  const [maxRetries, setMaxRetries] = useState("3");
  const [isActive, setIsActive] = useState(true);
  const [customHeaders, setCustomHeaders] = useState<Array<{ key: string; value: string }>>([]);

  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [createdEndpointId, setCreatedEndpointId] = useState<string | null>(null);

  // Fetch Event Catalog
  const { data: eventsData } = useQuery({
    queryKey: ["webhook-events-catalog"],
    queryFn: async () => {
      const res = await api.get<{ events: any[] }>("/addons/webhook/events");
      return res?.events || [];
    },
  });

  const allEvents = eventsData || [];
  const moduleEvents = allEvents.filter((e) => e.module === module);
  const selectedEventDef = allEvents.find((e) => e.key === eventKey) || moduleEvents[0];

  function addHeaderRow() {
    setCustomHeaders([...customHeaders, { key: "", value: "" }]);
  }

  function removeHeaderRow(index: number) {
    setCustomHeaders(customHeaders.filter((_, i) => i !== index));
  }

  function updateHeader(index: number, field: "key" | "value", val: string) {
    const updated = [...customHeaders];
    updated[index][field] = val;
    setCustomHeaders(updated);
  }

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/addons/webhook/endpoints", payload);
    },
    onSuccess: (data: any) => {
      setCreatedSecret(data.rawSecret);
      setCreatedEndpointId(data.endpoint?.id);
      toast.success("Webhook endpoint registered successfully!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to create endpoint"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return toast.error("Destination URL is required");

    const headersJson: Record<string, string> = {};
    for (const h of customHeaders) {
      if (h.key.trim() && h.value.trim()) {
        headersJson[h.key.trim()] = h.value.trim();
      }
    }

    createMutation.mutate({
      name: name.trim() || new URL(url).hostname,
      module,
      eventKey,
      events: [eventKey],
      method,
      url: url.trim(),
      headersJson,
      timeoutMs: parseInt(timeoutMs) || 5000,
      maxRetries: parseInt(maxRetries) || 3,
      allowLocalhostForTest: true,
    });
  }

  return (
    <PlanGuard moduleName="Outbound Webhooks" requiredPlan="starter">
      <div className="space-y-6">
        <WebhookNavHeader activeTab="endpoints" />

        <div className="flex items-center gap-3">
          <Link to="/addons/webhook/endpoints">
            <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs">
              <ArrowLeft className="size-3.5" /> Back to Endpoints
            </Button>
          </Link>
          <span className="text-muted-foreground">•</span>
          <span className="text-xs font-semibold text-foreground">Create New Webhook Endpoint</span>
        </div>

        {/* Secret Reveal Modal / Card when created */}
        {createdSecret && (
          <Card className="border-amber-500/40 bg-amber-500/10 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-4" /> Save Your Webhook Signing Secret
              </CardTitle>
              <CardDescription className="text-xs">
                This secret is used to sign HMAC-SHA256 headers. For security, it will <strong>never be shown again</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 bg-card p-2.5 rounded-lg border font-mono text-xs">
                <span className="flex-1 select-all break-all">{createdSecret}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(createdSecret);
                    toast.success("Secret copied to clipboard!");
                  }}
                  className="h-7 text-xs gap-1 font-semibold"
                >
                  <Copy className="size-3" /> Copy
                </Button>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Link to="/addons/webhook/endpoints/$id" params={{ id: createdEndpointId! }}>
                  <Button size="sm" className="text-xs font-semibold">
                    Go to Endpoint Detail
                  </Button>
                </Link>
                <Link to="/addons/webhook/endpoints">
                  <Button size="sm" variant="outline" className="text-xs">
                    Return to Endpoints List
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-7 space-y-4">
            <form onSubmit={handleSubmit}>
              <Card className="border shadow-xs">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Webhook className="size-4 text-primary" /> Endpoint Configuration
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Configure your destination URL, HTTP method, and event trigger.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Endpoint Name / Label</label>
                    <Input
                      placeholder="e.g. Zapier HR Sync or Slack Notifications Webhook"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Source Module *</label>
                      <Select
                        value={module}
                        onValueChange={(val) => {
                          setModule(val);
                          const firstEv = allEvents.find((e) => e.module === val);
                          if (firstEv) setEventKey(firstEv.key);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HRM Core">HRM Core</SelectItem>
                          <SelectItem value="Attendance">Attendance</SelectItem>
                          <SelectItem value="Leave Management">Leave Management</SelectItem>
                          <SelectItem value="Payroll">Payroll</SelectItem>
                          <SelectItem value="Recruitment">Recruitment</SelectItem>
                          <SelectItem value="Sales & Invoicing">Sales & Invoicing</SelectItem>
                          <SelectItem value="Planning">Planning</SelectItem>
                          <SelectItem value="System">System / Healthcheck</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Trigger Event *</label>
                      <Select value={eventKey} onValueChange={setEventKey}>
                        <SelectTrigger className="h-8 text-xs font-mono">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {moduleEvents.map((e) => (
                            <SelectItem key={e.key} value={e.key}>
                              {e.label} ({e.key})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-1 space-y-1">
                      <label className="font-semibold text-foreground">HTTP Method</label>
                      <Select value={method} onValueChange={(val: any) => setMethod(val)}>
                        <SelectTrigger className="h-8 text-xs font-bold font-mono">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="POST">POST (Recommended)</SelectItem>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-3 space-y-1">
                      <label className="font-semibold text-foreground">Destination URL *</label>
                      <Input
                        type="url"
                        placeholder="https://api.yourcompany.com/webhook"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="h-8 text-xs font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1 border-t">
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Timeout (ms)</label>
                      <Input
                        type="number"
                        min={1000}
                        max={30000}
                        value={timeoutMs}
                        onChange={(e) => setTimeoutMs(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Max Retries</label>
                      <Select value={maxRetries} onValueChange={setMaxRetries}>
                        <SelectTrigger className="h-8 text-xs font-mono">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Attempt</SelectItem>
                          <SelectItem value="2">2 Retries</SelectItem>
                          <SelectItem value="3">3 Retries (Standard)</SelectItem>
                          <SelectItem value="5">5 Retries (Max)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Custom Headers */}
                  <div className="space-y-2 border-t pt-2">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-foreground">Custom Request Headers</label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={addHeaderRow}
                        className="h-6 text-[11px] gap-1 px-2 text-primary"
                      >
                        <Plus className="size-3" /> Add Header
                      </Button>
                    </div>
                    {customHeaders.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground italic">No custom headers added.</p>
                    ) : (
                      customHeaders.map((hdr, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input
                            placeholder="Header-Name"
                            value={hdr.key}
                            onChange={(e) => updateHeader(i, "key", e.target.value)}
                            className="h-7 text-xs font-mono flex-1"
                          />
                          <Input
                            placeholder="Value"
                            value={hdr.value}
                            onChange={(e) => updateHeader(i, "value", e.target.value)}
                            className="h-7 text-xs font-mono flex-1"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeHeaderRow(i)}
                            className="h-7 w-7 p-0 text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t pt-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={isActive} onCheckedChange={setIsActive} />
                      <span className="text-xs font-semibold">Enable immediately on save</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link to="/addons/webhook/endpoints">
                        <Button type="button" size="sm" variant="outline" className="h-8 text-xs">
                          Cancel
                        </Button>
                      </Link>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={createMutation.isPending || !url.trim()}
                        className="h-8 text-xs font-bold gap-1.5"
                      >
                        {createMutation.isPending ? "Registering..." : "Create Webhook Endpoint"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </form>
          </div>

          {/* Right Preview Panel */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-primary" /> Payload Preview & Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div>
                  <div className="font-semibold text-foreground mb-0.5">{selectedEventDef?.label}</div>
                  <p className="text-[11px] text-muted-foreground">{selectedEventDef?.description}</p>
                </div>

                <div className="p-3 bg-muted/40 rounded-xl border space-y-1">
                  <div className="text-[10px] uppercase font-mono text-muted-foreground font-bold">Headers Sent:</div>
                  <pre className="text-[11px] font-mono text-foreground leading-relaxed whitespace-pre-wrap">
{`Content-Type: application/json
X-Webhook-Event: ${eventKey}
X-Webhook-Delivery-Id: <uuid>
X-Webhook-Timestamp: ${Math.floor(Date.now() / 1000)}
X-Webhook-Signature: t=...,v1=<hmac-sha256>`}
                  </pre>
                </div>

                <div className="p-3 bg-muted/40 rounded-xl border space-y-1">
                  <div className="text-[10px] uppercase font-mono text-muted-foreground font-bold">Sample Body:</div>
                  <pre className="text-[11px] font-mono text-foreground leading-relaxed overflow-x-auto p-2 bg-card rounded border">
{JSON.stringify(selectedEventDef?.payloadSchema || {}, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PlanGuard>
  );
}

export default CreateWebhookEndpointPage;
