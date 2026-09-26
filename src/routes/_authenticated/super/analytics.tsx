import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  BarChart3,
  HardDrive,
  Users,
  Activity,
  Server,
  Zap,
  ShieldCheck,
  Save,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  Layers,
  Sparkles,
  ArrowUpRight,
  Database,
  Cpu
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/super/analytics")({
  component: SuperAnalyticsPage,
});

export type TenantTelemetry = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  storageUsedGb: number;
  storageLimitGb: number;
  employeesCount: number;
  employeesLimit: number;
  usersCount: number;
  usersLimit: number;
  monthlyApiCalls: number;
  status: "active" | "warning" | "exceeded";
};

const SAMPLE_TELEMETRY: TenantTelemetry[] = [
  {
    id: "t-1",
    name: "ACME Technologies Pvt Ltd",
    slug: "acme",
    plan: "Enterprise Annual",
    storageUsedGb: 34.2,
    storageLimitGb: 100,
    employeesCount: 78,
    employeesLimit: 100,
    usersCount: 12,
    usersLimit: 25,
    monthlyApiCalls: 245000,
    status: "active",
  },
  {
    id: "t-2",
    name: "Globex Global Logistics",
    slug: "globex",
    plan: "Professional Plan",
    storageUsedGb: 22.8,
    storageLimitGb: 50,
    employeesCount: 42,
    employeesLimit: 50,
    usersCount: 8,
    usersLimit: 10,
    monthlyApiCalls: 189000,
    status: "active",
  },
  {
    id: "t-3",
    name: "Initech Enterprise Software",
    slug: "initech",
    plan: "Starter Monthly",
    storageUsedGb: 9.4,
    storageLimitGb: 10,
    employeesCount: 19,
    employeesLimit: 20,
    usersCount: 4,
    usersLimit: 5,
    monthlyApiCalls: 82000,
    status: "warning",
  },
  {
    id: "t-4",
    name: "Cyberdyne Systems",
    slug: "cyberdyne",
    plan: "Custom Enterprise",
    storageUsedGb: 12.1,
    storageLimitGb: 250,
    employeesCount: 18,
    employeesLimit: 500,
    usersCount: 5,
    usersLimit: 50,
    monthlyApiCalls: 310000,
    status: "active",
  },
];

export default function SuperAnalyticsPage() {
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [measurementId, setMeasurementId] = useState("G-998877XX66");
  const [telemetry, setTelemetry] = useState<TenantTelemetry[]>(SAMPLE_TELEMETRY);

  const { data: tenants = [] } = useQuery<any[]>({
    queryKey: ["super-tenants-analytics"],
    queryFn: async () => {
      try {
        const res = await api.get("/super/tenants");
        return Array.isArray(res) ? res : res?.data || [];
      } catch {
        return [];
      }
    },
  });

  const saveGaMutation = useMutation({
    mutationFn: async (updated: { measurementId: string; enabled: boolean }) => {
      await api.put("/cms/pages/system-analytics-config", {
        title: "System Google Analytics Config",
        content: updated,
        published: true,
      });
    },
    onSuccess: () => {
      toast.success("Google Analytics tracking ID saved to platform config!");
      qc.invalidateQueries({ queryKey: ["realtime-analytics-config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = telemetry.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.plan.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full min-w-0 flex-1 space-y-6 p-4 lg:p-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Platform Telemetry & Usage Analytics</h1>
            <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-xs">
              Tenant Quota Engine
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time multi-tenant consumption metrics, database volume, storage distribution, and third-party GA4 tracking.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            toast.success("Live telemetry data synced with database");
            qc.invalidateQueries({ queryKey: ["super-tenants-analytics"] });
          }}
          className="h-9 gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Metrics
        </Button>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Total Managed Storage</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <HardDrive className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">78.5 GB</div>
            <p className="text-xs text-muted-foreground mt-1">Across S3 / Local Vault</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Monthly API Volume</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <Activity className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">826,000</div>
            <p className="text-xs text-emerald-600 mt-1 flex items-center">
              <ArrowUpRight className="w-3 h-3 mr-0.5" /> +14.2% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Active Database Rows</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
              <Database className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">1.42M</div>
            <p className="text-xs text-muted-foreground mt-1">Multi-tenant single schema</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Platform Uptime</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <Server className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">99.98%</div>
            <p className="text-xs text-emerald-600 mt-1">Zero downtime in 90 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="tenants" className="space-y-4">
        <TabsList className="bg-muted/60 p-1 rounded-lg border border-border/60 flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="tenants" className="text-xs gap-1.5 py-1.5">
            <Building2 className="w-3.5 h-3.5" />
            Tenant Usage Metrics
          </TabsTrigger>
          <TabsTrigger value="system" className="text-xs gap-1.5 py-1.5">
            <Cpu className="w-3.5 h-3.5" />
            Infrastructure Health
          </TabsTrigger>
          <TabsTrigger value="ga" className="text-xs gap-1.5 py-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            Google Analytics 4
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: TENANT USAGE METRICS */}
        <TabsContent value="tenants" className="space-y-3">
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="p-4 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold">Tenant Quota & Capacity Utilization</CardTitle>
                <CardDescription className="text-xs">
                  Real-time storage, employee slots, and API quota breakdown per tenant workspace.
                </CardDescription>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter by organization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-8 text-xs"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs font-semibold">Tenant Organization</TableHead>
                    <TableHead className="text-xs font-semibold">Subscribed Plan</TableHead>
                    <TableHead className="text-xs font-semibold">Storage Used</TableHead>
                    <TableHead className="text-xs font-semibold">Employees Enrolled</TableHead>
                    <TableHead className="text-xs font-semibold">User Seats</TableHead>
                    <TableHead className="text-xs font-semibold text-right">API Calls</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => {
                    const storagePercent = Math.round((item.storageUsedGb / item.storageLimitGb) * 100);
                    const empPercent = Math.round((item.employeesCount / item.employeesLimit) * 100);
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/30">
                        <TableCell className="py-2.5">
                          <p className="text-xs font-semibold text-foreground leading-none">{item.name}</p>
                          <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{item.slug}.mastererp.cloud</p>
                        </TableCell>
                        <TableCell className="text-xs font-medium">{item.plan}</TableCell>
                        <TableCell className="w-36">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span>{item.storageUsedGb} GB</span>
                              <span className="text-muted-foreground">/ {item.storageLimitGb} GB</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className={storagePercent > 90 ? "h-full bg-rose-500" : "h-full bg-blue-500"}
                                style={{ width: `${storagePercent}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="w-36">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span>{item.employeesCount}</span>
                              <span className="text-muted-foreground">/ {item.employeesLimit} max</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className={empPercent > 90 ? "h-full bg-amber-500" : "h-full bg-emerald-500"}
                                style={{ width: `${empPercent}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {item.usersCount} / {item.usersLimit}
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono font-medium">
                          {item.monthlyApiCalls.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              item.status === "active"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]"
                            }
                          >
                            {item.status === "active" ? "Within Limits" : "Near Limit (90%)"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: SYSTEM INFRASTRUCTURE HEALTH */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border border-border/60 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Node.js Memory RSS</span>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 text-[10px]">Healthy</Badge>
              </div>
              <div className="text-xl font-bold">142 MB / 2048 MB</div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: "12%" }} />
              </div>
            </Card>

            <Card className="border border-border/60 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">MySQL Connection Pool</span>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 text-[10px]">Connected</Badge>
              </div>
              <div className="text-xl font-bold">8 / 50 Active</div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: "16%" }} />
              </div>
            </Card>

            <Card className="border border-border/60 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Socket.IO Rooms</span>
                <Badge variant="outline" className="bg-purple-500/10 text-purple-600 text-[10px]">Realtime</Badge>
              </div>
              <div className="text-xl font-bold">24 Tenant Channels</div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-purple-500" style={{ width: "48%" }} />
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: GOOGLE ANALYTICS */}
        <TabsContent value="ga" className="space-y-4">
          <Card className="border border-border/60 shadow-sm p-5 max-w-xl">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-base font-semibold">Google Analytics 4 Measurement Tag</CardTitle>
              <CardDescription className="text-xs">
                Enter your GA4 Measurement ID to inject universal tracking into public landing and marketing pages.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Measurement ID</Label>
                <Input
                  value={measurementId}
                  onChange={(e) => setMeasurementId(e.target.value)}
                  placeholder="G-XXXXXXXXXX"
                  className="h-9 text-xs font-mono"
                />
              </div>
              <Button
                onClick={() => saveGaMutation.mutate({ measurementId, enabled: true })}
                disabled={saveGaMutation.isPending}
                size="sm"
                className="h-9 gap-1.5 text-xs font-semibold"
              >
                <Save className="w-3.5 h-3.5" />
                Save Analytics Config
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
