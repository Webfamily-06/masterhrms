import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Layers,
  Search,
  Plus,
  RefreshCw,
  Code,
  Copy,
  Check,
} from "lucide-react";
import { PlanGuard } from "@/components/plan-guard";
import { toast } from "sonner";
import { WebhookNavHeader } from "./endpoints";

export const Route = createFileRoute("/_authenticated/_app/addons/webhook/events")({
  component: WebhookEventCatalogPage,
  head: () => ({ meta: [{ title: "Webhook Event Catalog — Master ERP" }] }),
});

export function WebhookEventCatalogPage() {
  const [search, setSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState("all");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { data: eventsData, isLoading, refetch } = useQuery({
    queryKey: ["webhook-events-catalog"],
    queryFn: async () => {
      const res = await api.get<{ events: any[] }>("/addons/webhook/events");
      return res?.events || [];
    },
  });

  const events = eventsData || [];
  const modulesList = Array.from(new Set(events.map((e: any) => e.module)));

  let filtered = events;
  if (selectedModule !== "all") {
    filtered = filtered.filter((e: any) => e.module === selectedModule);
  }
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (e: any) =>
        e.key.toLowerCase().includes(q) ||
        e.label.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.module.toLowerCase().includes(q)
    );
  }

  function copyEventKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    toast.success(`Copied "${key}" to clipboard`);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  return (
    <PlanGuard moduleName="Outbound Webhooks" requiredPlan="starter">
      <div className="space-y-6">
        <WebhookNavHeader activeTab="events" />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border shadow-xs">
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <div className="relative min-w-[220px] flex-1">
              <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search events by key, name, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue placeholder="All Modules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {modulesList.map((m: any) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs text-muted-foreground font-mono">
            {filtered.length} event{filtered.length === 1 ? "" : "s"} available
          </div>
        </div>

        {/* Event Cards Grid */}
        {isLoading ? (
          <div className="py-20 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <RefreshCw className="size-4 animate-spin" /> Loading event catalog...
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed p-12 text-center text-muted-foreground">
            <Layers className="size-10 mx-auto opacity-30 mb-2" />
            <h4 className="font-bold text-foreground text-sm">No Events Match Query</h4>
            <p className="text-xs mt-1">Try clearing your search query or module filter.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((item: any) => (
              <Card key={item.key} className="border shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge variant="outline" className="text-[10px] font-mono mb-1">
                        {item.module}
                      </Badge>
                      <CardTitle className="text-sm font-bold text-foreground">
                        {item.label}
                      </CardTitle>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyEventKey(item.key)}
                      className="h-7 text-[10px] font-mono gap-1 text-muted-foreground hover:text-foreground"
                    >
                      {copiedKey === item.key ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                      {item.key}
                    </Button>
                  </div>
                  <CardDescription className="text-xs mt-1">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="p-3 bg-muted/40 rounded-xl border text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold text-muted-foreground uppercase">
                      <span className="flex items-center gap-1">
                        <Code className="size-3" /> Payload Schema
                      </span>
                      <span>JSON Object</span>
                    </div>
                    <pre className="text-[11px] font-mono text-foreground leading-relaxed overflow-x-auto p-2 bg-card rounded border max-h-36">
{JSON.stringify(item.payloadSchema, null, 2)}
                    </pre>
                  </div>

                  <div className="flex items-center justify-end border-t pt-2">
                    <Link to="/addons/webhook/endpoints/new">
                      <Button size="sm" variant="default" className="h-7 text-xs font-semibold gap-1">
                        <Plus className="size-3" /> Create Webhook for this Event
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PlanGuard>
  );
}

export default WebhookEventCatalogPage;
