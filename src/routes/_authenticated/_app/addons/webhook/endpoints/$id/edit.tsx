import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { 
  ArrowLeft, 
  Save, 
  RotateCw, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  Send,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { PlanGuard } from "@/components/plan-guard";
import { WebhookNavHeader } from "../index";
import { getAuthHeaders } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/_app/addons/webhook/endpoints/$id/edit")({
  component: EditWebhookEndpointPage,
});

interface EventItem {
  key: string;
  module: string;
  label: string;
  samplePayload: any;
}

function EditWebhookEndpointPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [modules, setModules] = useState<string[]>([]);

  const [name, setName] = useState("");
  const [module, setModule] = useState("");
  const [eventKey, setEventKey] = useState("");
  const [method, setMethod] = useState<"POST" | "GET" | "PUT">("POST");
  const [url, setUrl] = useState("");
  const [customHeaders, setCustomHeaders] = useState<{ key: string; value: string }[]>([]);
  const [timeoutMs, setTimeoutMs] = useState(10000);
  const [maxRetries, setMaxRetries] = useState(3);
  const [isActive, setIsActive] = useState(true);
  const [version, setVersion] = useState(1);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [eventsRes, endpointRes] = await Promise.all([
          fetch("/api/v1/addons/webhook/events", { headers: getAuthHeaders() }),
          fetch(`/api/v1/addons/webhook/endpoints/${id}`, { headers: getAuthHeaders() })
        ]);

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          setEvents(eventsData.events || []);
          setModules(eventsData.modules || []);
        }

        if (endpointRes.ok) {
          const epData = await endpointRes.json();
          const ep = epData.endpoint;
          if (ep) {
            setName(ep.name || "");
            setModule(ep.module || "");
            setEventKey(ep.eventKey || "");
            setMethod(ep.method || "POST");
            setUrl(ep.url || "");
            setTimeoutMs(ep.timeoutMs || 10000);
            setMaxRetries(ep.maxRetries || 3);
            setIsActive(ep.isActive ?? true);
            setVersion(ep.version || 1);

            if (ep.headersJson && typeof ep.headersJson === "object") {
              const headersArr = Object.entries(ep.headersJson).map(([k, v]) => ({
                key: k,
                value: String(v)
              }));
              setCustomHeaders(headersArr);
            }
          }
        }
      } catch (err: any) {
        toast.error("Failed to load endpoint details");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim() || !eventKey) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setSubmitting(true);
      const headersMap: Record<string, string> = {};
      customHeaders.forEach((h) => {
        if (h.key.trim()) headersMap[h.key.trim()] = h.value.trim();
      });

      const res = await fetch(`/api/v1/addons/webhook/endpoints/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: name.trim(),
          module,
          eventKey,
          method,
          url: url.trim(),
          headersJson: headersMap,
          timeoutMs,
          maxRetries,
          isActive,
          version,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update webhook endpoint");
      }

      toast.success("Webhook endpoint updated successfully");
      navigate({ to: "/addons/webhook/endpoints/$id", params: { id } });
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedEventObj = events.find((e) => e.key === eventKey);

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

  return (
    <PlanGuard moduleName="Outbound Webhooks" requiredPlan="starter">
      <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
        <WebhookNavHeader activeTab="endpoints" />

        <div className="flex items-center space-x-3 border-b pb-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/addons/webhook/endpoints/$id" params={{ id }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Edit Webhook Endpoint</h1>
            <p className="text-xs text-muted-foreground">Modify destination target, headers, and retry tolerances</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Endpoint Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Endpoint Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="method">HTTP Method *</Label>
                  <Select value={method} onValueChange={(val: any) => setMethod(val)}>
                    <SelectTrigger id="method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POST">POST (JSON Body)</SelectItem>
                      <SelectItem value="PUT">PUT (JSON Body)</SelectItem>
                      <SelectItem value="GET">GET (Query Parameters)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">Destination URL (Validated HTTPS) *</Label>
                <Input
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://api.yourdomain.com/webhooks"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Module</Label>
                  <Select value={module} onValueChange={(val) => { setModule(val); setEventKey(""); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Module" />
                    </SelectTrigger>
                    <SelectContent>
                      {modules.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Event Key *</Label>
                  <Select value={eventKey} onValueChange={setEventKey}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Event" />
                    </SelectTrigger>
                    <SelectContent>
                      {events
                        .filter((e) => !module || e.module === module)
                        .map((e) => (
                          <SelectItem key={e.key} value={e.key}>{e.key} ({e.label})</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <Label className="text-sm font-medium">Active Status</Label>
                  <p className="text-xs text-muted-foreground">Toggle to enable or pause deliveries</p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </CardContent>
          </Card>

          {/* Custom Headers */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Custom Request Headers</CardTitle>
                <CardDescription className="text-xs">Optional authorization headers or tracking IDs</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCustomHeaders([...customHeaders, { key: "", value: "" }])}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Header
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {customHeaders.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No custom headers configured.</p>
              ) : (
                customHeaders.map((header, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <Input
                      placeholder="Header Name (e.g. X-Custom-Auth)"
                      value={header.key}
                      onChange={(e) => {
                        const copy = [...customHeaders];
                        copy[idx].key = e.target.value;
                        setCustomHeaders(copy);
                      }}
                      className="font-mono text-xs"
                    />
                    <Input
                      placeholder="Value"
                      value={header.value}
                      onChange={(e) => {
                        const copy = [...customHeaders];
                        copy[idx].value = e.target.value;
                        setCustomHeaders(copy);
                      }}
                      className="font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setCustomHeaders(customHeaders.filter((_, i) => i !== idx));
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-rose-500" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Sample payload preview if event selected */}
          {selectedEventObj && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase text-muted-foreground font-semibold flex items-center">
                  <Eye className="w-3.5 h-3.5 mr-1.5" /> Sample Event Payload Schema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="p-3 bg-muted/60 rounded text-xs font-mono overflow-x-auto max-h-48">
                  {JSON.stringify(selectedEventObj.samplePayload, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end space-x-3">
            <Button asChild type="button" variant="outline">
              <Link to="/addons/webhook/endpoints/$id" params={{ id }}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={submitting}>
              <Save className="w-4 h-4 mr-2" />
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </PlanGuard>
  );
}
