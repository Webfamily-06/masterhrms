import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Plus,
  Search,
  Activity,
  Send,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Layers,
  Settings,
  ListFilter,
  Check,
  RotateCw,
} from "lucide-react";
import { PlanGuard } from "@/components/plan-guard";
import { toast } from "sonner";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";

export const Route = createFileRoute("/_authenticated/_app/addons/webhook/endpoints/")({
  component: WebhookEndpointsPage,
  head: () => ({ meta: [{ title: "Webhook Endpoints — Master ERP" }] }),
});

export function WebhookNavHeader({ activeTab }: { activeTab: "endpoints" | "events" | "logs" | "settings" }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
      <div>
        <BreadcrumbNav />
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <Webhook className="size-6 text-primary" /> Webhook Engine
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Event-driven HTTP callback system with HMAC-SHA256 signatures, SSRF protection & bounded retries.
        </p>
      </div>

      {/* Segmented Control Links (Separate routes, not tabs) */}
      <div className="inline-flex items-center p-1 bg-muted/60 rounded-xl border border-border/50 text-xs font-semibold gap-1">
        <Link
          to="/addons/webhook/endpoints"
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === "endpoints"
              ? "bg-background text-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Webhook className="size-3.5" /> Endpoints
        </Link>
        <Link
          to="/addons/webhook/events"
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === "events"
              ? "bg-background text-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="size-3.5" /> Event Catalog
        </Link>
        <Link
          to="/addons/webhook/logs"
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === "logs"
              ? "bg-background text-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity className="size-3.5" /> Delivery Logs
        </Link>
        <Link
          to="/addons/webhook/settings"
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === "settings"
              ? "bg-background text-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings className="size-3.5" /> Settings
        </Link>
      </div>
    </div>
  );
}

export function WebhookEndpointsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch Endpoints
  const { data: endpointsData, isLoading, refetch } = useQuery({
    queryKey: ["webhook-endpoints", moduleFilter, statusFilter, search],
    queryFn: async () => {
      const res = await api.get<{ endpoints: any[] }>("/addons/webhook/endpoints", {
        params: {
          module: moduleFilter !== "all" ? moduleFilter : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          search: search.trim() || undefined,
        },
      });
      return res?.endpoints || [];
    },
  });

  const endpoints = endpointsData || [];

  // Toggle Mutation
  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.patch(`/addons/webhook/endpoints/${id}/toggle`);
    },
    onSuccess: () => {
      toast.success("Endpoint status toggled");
      qc.invalidateQueries({ queryKey: ["webhook-endpoints"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to toggle status"),
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/addons/webhook/endpoints/${id}`);
    },
    onSuccess: () => {
      toast.success("Webhook endpoint deleted");
      qc.invalidateQueries({ queryKey: ["webhook-endpoints"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete endpoint"),
  });

  // Test Mutation
  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.post(`/addons/webhook/endpoints/${id}/test`, { allowLocalhostForTest: true });
    },
    onSuccess: (data: any) => {
      const delivery = data?.delivery;
      if (delivery?.status === "success") {
        toast.success(`Test webhook delivered successfully! (HTTP ${delivery.statusCode})`);
      } else {
        toast.warning(`Test dispatch returned: ${delivery?.responseSnippet || delivery?.errorCode || "Failed"}`);
      }
      qc.invalidateQueries({ queryKey: ["webhook-endpoints"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to test endpoint"),
  });

  return (
    <PlanGuard moduleName="Outbound Webhooks" requiredPlan="starter">
      <div className="space-y-6">
        <WebhookNavHeader activeTab="endpoints" />

        {/* Filter Bar & Create Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border shadow-xs">
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <div className="relative min-w-[220px] flex-1">
              <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search endpoints by name, URL, or module..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                <SelectItem value="HRM Core">HRM Core</SelectItem>
                <SelectItem value="Attendance">Attendance</SelectItem>
                <SelectItem value="Leave Management">Leave</SelectItem>
                <SelectItem value="Payroll">Payroll</SelectItem>
                <SelectItem value="Recruitment">Recruitment</SelectItem>
                <SelectItem value="Sales & Invoicing">Sales & Invoicing</SelectItem>
                <SelectItem value="Planning">Planning</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              className="h-8 w-8 p-0"
              title="Refresh"
            >
              <RotateCw className="size-3.5" />
            </Button>
            <Link to="/addons/webhook/endpoints/new">
              <Button size="sm" className="h-8 text-xs font-semibold gap-1.5">
                <Plus className="size-3.5" /> Create Endpoint
              </Button>
            </Link>
          </div>
        </div>

        {/* Endpoints Table */}
        <Card className="border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Name & Module</th>
                  <th className="py-3 px-4">Method & URL</th>
                  <th className="py-3 px-4">Subscribed Event</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Delivery</th>
                  <th className="py-3 px-4">7d Success</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="size-4 animate-spin" /> Loading webhook endpoints...
                      </div>
                    </td>
                  </tr>
                ) : endpoints.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-muted-foreground">
                      <Webhook className="size-10 mx-auto opacity-30 mb-2" />
                      <h4 className="font-bold text-foreground text-sm">No Webhook Endpoints Found</h4>
                      <p className="text-xs mt-1 max-w-sm mx-auto">
                        Create an endpoint to receive real-time HTTP callbacks whenever HRMS or add-on events trigger.
                      </p>
                      <Link to="/addons/webhook/endpoints/new">
                        <Button size="sm" className="mt-4 text-xs gap-1">
                          <Plus className="size-3.5" /> Create First Endpoint
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ) : (
                  endpoints.map((ep: any) => (
                    <tr key={ep.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-medium">
                        <Link
                          to="/addons/webhook/endpoints/$id"
                          params={{ id: ep.id }}
                          className="font-bold text-foreground hover:text-primary transition-colors block"
                        >
                          {ep.name}
                        </Link>
                        <Badge variant="outline" className="text-[10px] font-mono mt-0.5">
                          {ep.module}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={ep.method === "POST" ? "default" : ep.method === "PUT" ? "secondary" : "outline"}
                            className="text-[10px] font-mono px-1.5 uppercase font-bold"
                          >
                            {ep.method}
                          </Badge>
                          <span className="font-mono text-[11px] text-foreground truncate max-w-[220px]" title={ep.url}>
                            {ep.urlHostOnly || ep.url}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          {ep.eventKey || ep.events?.[0] || "*"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={ep.status === "active"}
                            onCheckedChange={() => toggleMutation.mutate(ep.id)}
                            disabled={toggleMutation.isPending}
                          />
                          <span
                            className={`text-[11px] font-semibold ${
                              ep.status === "active" ? "text-emerald-600" : "text-muted-foreground"
                            }`}
                          >
                            {ep.status === "active" ? "Active" : "Disabled"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {ep.lastDeliveryAt ? (
                          <div>
                            <div className="flex items-center gap-1 text-[11px] font-medium">
                              {ep.lastDeliveryStatus === "success" ? (
                                <CheckCircle2 className="size-3 text-emerald-500" />
                              ) : (
                                <XCircle className="size-3 text-destructive" />
                              )}
                              <span>{new Date(ep.lastDeliveryAt).toLocaleTimeString()}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(ep.lastDeliveryAt).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">Never</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 bg-emerald-500/10">
                          {ep.successRate7d ?? 100}%
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => testMutation.mutate(ep.id)}
                            disabled={testMutation.isPending}
                            className="h-7 text-[11px] gap-1 px-2 text-primary hover:text-primary"
                            title="Send Test Dispatch"
                          >
                            <Send className="size-3" /> Test
                          </Button>
                          <Link to="/addons/webhook/endpoints/$id" params={{ id: ep.id }}>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="View Detail">
                              <Eye className="size-3.5" />
                            </Button>
                          </Link>
                          <Link to="/addons/webhook/endpoints/$id/edit" params={{ id: ep.id }}>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Edit Endpoint">
                              <Edit className="size-3.5" />
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Delete webhook endpoint "${ep.name}"?`)) {
                                deleteMutation.mutate(ep.id);
                              }
                            }}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            title="Delete Endpoint"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PlanGuard>
  );
}

export default WebhookEndpointsPage;
