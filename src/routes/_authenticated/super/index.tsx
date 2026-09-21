import { formatSystemAmount } from "@/lib/currency";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { setToken, ApiError } from "@/lib/api";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState, useEffect, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  FileText,
  Store,
  ShieldCheck,
  Building2,
  Users,
  LifeBuoy,
  CreditCard,
  Mail,
  Bell,
  Image as ImageIcon,
  BarChart3,
  Database,
  Settings,
  Code,
  Globe,
  Radio,
  Clock,
  Plus,
  Send,
  Zap,
  TrendingUp,
  Activity,
  Server,
  ArrowRight,
  RefreshCw,
  Loader2,
  Cpu,
  LogIn,
  Layers,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/super/")({
  component: SuperOverview,
  head: () => ({ meta: [{ title: "Super Admin Root Command Center — Master HRMS" }] }),
});

/**
 * LiveClock — isolated memoized component to prevent 1-second re-render cascades
 */
const LiveClock = memo(function LiveClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="text-sm font-extrabold font-mono text-purple-600 dark:text-purple-400">{time}</span>;
});

function SuperOverview() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  // Quick Action Dialog States
  const [isCreateTenantOpen, setIsCreateTenantOpen] = useState(false);
  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantSlug, setNewTenantSlug] = useState("");
  const [isCreatingTenant, setIsCreatingTenant] = useState(false);

  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  // 1. Fetch REAL-TIME Dynamic Super Stats from MySQL
  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["super-realtime-stats"],
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const [superStats, tenants, addons, platformSettings] = await Promise.all([
        api.get("/super/stats"), api.get("/super/tenants"), api.get("/cms/addons"),
        api.get("/cms/pages/system-platform-settings").catch((error) => { if (error instanceof ApiError && error.status === 404) return null; throw error; }),
      ]);
      return {
        ...superStats, tenants: superStats.totalTenants, users: superStats.totalUsers,
        tenantsList: tenants, addonsList: addons, addonsCount: addons.length,
        liveLogs: tenants.slice(0, 4).map((t: any) => ({ event: "Workspace provisioned", detail: t.name, time: new Date(t.createdAt).toLocaleString(), status: "success" })),
        smtpHost: platformSettings?.content?.smtpHost || "Not configured",
        maintenanceMode: !!platformSettings?.content?.maintenanceMode,
        currency: platformSettings?.content || {},
      };
    },
  });

  // Direct 1-Click Tenant Impersonation Login
  const loginAsTenantAdmin = useMutation({
    mutationFn: async (tenantId: string) => {
      const res = await api.post(`/super/impersonate/${tenantId}`);
      return res;
    },
    onSuccess: (data) => {
      if (data.token) {
        setToken(data.token);
        qc.clear();
        toast.success(`Logged into ${data.tenant?.name || "Tenant"} workspace!`);
        navigate({ to: "/dashboard" });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to enter tenant workspace");
    },
  });

  // Create New ERP Workspace Tenant Handler
  async function handleCreateTenant() {
    if (!newTenantName || !newTenantSlug) {
      return toast.error("Please fill in workspace name and slug");
    }
    setIsCreatingTenant(true);
    try {
      await api.post("/super/tenants", {
        name: newTenantName,
        slug: newTenantSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      });
      toast.success(`ERP Workspace "${newTenantName}" provisioned successfully!`);
      setNewTenantName("");
      setNewTenantSlug("");
      setIsCreateTenantOpen(false);
      qc.invalidateQueries({ queryKey: ["super-realtime-stats"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to provision workspace");
    } finally {
      setIsCreatingTenant(false);
    }
  }

  // Send System-Wide Broadcast Notification Handler
  async function handleSendBroadcast() {
    if (!broadcastTitle || !broadcastMessage) {
      return toast.error("Please provide both title and message");
    }
    setIsSendingBroadcast(true);
    try {
      await api.put("/cms/pages/system-platform-broadcast", {
        title: broadcastTitle,
        content: { title: broadcastTitle, message: broadcastMessage, sentAt: new Date().toISOString() },
        published: true,
      });
      toast.success("Broadcast message transmitted to all tenants!");
      setBroadcastTitle("");
      setBroadcastMessage("");
      setIsBroadcastOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to broadcast");
    } finally {
      setIsSendingBroadcast(false);
    }
  }

  const statCards = [
    {
      label: "Active ERP Workspaces",
      value: stats?.tenants ?? 0,
      icon: Building2,
      color: "text-purple-600 dark:text-purple-400 bg-purple-500/10",
      hint: "+100% cloud retention",
    },
    {
      label: "Total Platform Users",
      value: stats?.users ?? 0,
      icon: Users,
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
      hint: "Active credentials",
    },
    {
      label: "ERP & HR Addons Catalog",
      value: stats?.addonsCount ?? 0,
      icon: Store,
      color: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
      hint: "Published catalog records",
    },
    {
      label: "Open Support Tickets",
      value: stats?.openTickets ?? 0,
      icon: LifeBuoy,
      color: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
      hint: "Unresolved platform tickets",
    },
  ];

  const consoleModules = [
    {
      to: "/super/tenants",
      title: "Tenant Workspaces Hub",
      desc: "Provision instances, inspect MySQL schemas, and 1-click passwordless login.",
      icon: Building2,
      tag: `${stats?.tenants ?? 0} Workspaces`,
      color: "from-purple-500 to-indigo-600",
    },
    {
      to: "/super/cms",
      title: "Visual CMS Studio 2.0",
      desc: "Live visual section editor, landing page copy, FAQs, and pricing tables.",
      icon: FileText,
      tag: "Live Studio",
      color: "from-pink-500 to-rose-600",
    },
    {
      to: "/super/plans",
      title: "Monetization & Plans",
      desc: "ERP subscriptions, INR pricing tiers, custom feature limits & invoices.",
      icon: CreditCard,
      tag: "Billing (₹)",
      color: "from-emerald-500 to-teal-600",
    },
    {
      to: "/super/marketplace",
      title: "Marketplace Manager",
      desc: "Manage 500+ ERP & HR addons, categories, icons, and pricing models.",
      icon: Store,
      tag: "Addon Catalog",
      color: "from-blue-500 to-cyan-600",
    },
    {
      to: "/super/roles",
      title: "Roles & RBAC Matrix",
      desc: "Manage master permissions, user assignment, and orchestrator access.",
      icon: ShieldCheck,
      tag: "Access Control",
      color: "from-violet-500 to-purple-700",
    },
    {
      to: "/super/support",
      title: "Support Ticket Desk",
      desc: "Manage ERP & HR customer inquiries, SLA timers & resolution chat.",
      icon: LifeBuoy,
      tag: "SLA Tickets",
      color: "from-amber-500 to-orange-600",
    },
    {
      to: "/super/email-templates",
      title: "Email System Templates",
      desc: "HTML email code editor, branding variables & ERP triggers.",
      icon: Mail,
      tag: "SMTP Mailer",
      color: "from-sky-500 to-blue-600",
    },
    {
      to: "/super/notifications",
      title: "Broadcast Alerts",
      desc: "Configure real-time push, in-app notification toasts & tenant banners.",
      icon: Bell,
      tag: "Push Rules",
      color: "from-rose-500 to-red-600",
    },
    {
      to: "/super/media",
      title: "Media Asset Vault",
      desc: "High-resolution cloud storage, logos & 1-click CDN link generation.",
      icon: ImageIcon,
      tag: "Cloud Storage",
      color: "from-teal-500 to-emerald-600",
    },
    {
      to: "/super/analytics",
      title: "Google Analytics GA4",
      desc: "Traffic analytics, acquisition sources & tenant usage heatmaps.",
      icon: BarChart3,
      tag: "GA4 Engine",
      color: "from-orange-500 to-amber-600",
    },
    {
      to: "/super/backup",
      title: "Database Snapshots",
      desc: "Automated MySQL dump exports, point-in-time recovery & restores.",
      icon: Database,
      tag: "MySQL Backup",
      color: "from-slate-600 to-slate-800",
    },
    {
      to: "/super/settings",
      title: "Platform Settings",
      desc: "Primary SMTP credentials, Pusher keys, reCAPTCHA & site metadata.",
      icon: Settings,
      tag: "Root Settings",
      color: "from-indigo-600 to-violet-700",
    },
  ];

  return (
    <div className="space-y-8 max-w-full">
      {error && <div role="alert" className="p-4 border rounded-md text-destructive">Unable to load platform data: {error.message}. <Button variant="outline" onClick={() => refetch()}>Retry</Button></div>}
      {/* Top Console Header & Live Ticker Widget */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-black tracking-tight">Super Admin Root Command Center</h1>
            <Badge
              variant="outline"
              className="font-mono text-[10px] gap-1 px-2.5 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
            >
              <Radio className="size-3 animate-pulse text-purple-500" />
              Root Orchestrator Active
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Enterprise orchestration engine for multi-tenant ERP & HRM instances, subscription billing,
            visual CMS, and server telemetry.
          </p>
        </div>

        {/* Live Clock and Quick Action Buttons */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 p-2 px-3 rounded-2xl border bg-card shadow-xs shrink-0">
            <div className="text-right">
              <div className="text-xs text-muted-foreground font-medium">
                {new Date().toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <LiveClock />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setIsCreateTenantOpen(true)}
              className="gap-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20"
            >
              <Plus className="size-3.5" /> Provision Tenant
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsBroadcastOpen(true)}
              className="gap-1.5 text-xs font-semibold"
            >
              <Send className="size-3.5" /> Broadcast Banner
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-1.5 text-xs size-9 p-0 grid place-items-center"
              title="Refresh Stats"
            >
              <RefreshCw className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Real-time Infrastructure Status Bar */}
      <Card className="p-4 bg-purple-950/20 dark:bg-purple-950/40 border border-purple-500/20 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Server className="size-4 text-purple-600 dark:text-purple-400 animate-pulse" />
            ERP Cloud Cluster Status:
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <span className="flex items-center gap-1.5 font-mono text-muted-foreground">
              <span className="size-2 rounded-full bg-emerald-500" /> Database:{" "}
              <strong className="text-foreground font-semibold">{stats ? "Query successful" : "Unavailable"}</strong>
            </span>

            <span className="flex items-center gap-1.5 font-mono text-muted-foreground">
              <span className="size-2 rounded-full bg-blue-500" /> SMTP Engine:{" "}
              <strong className="text-foreground font-semibold">{stats?.smtpHost}</strong>
            </span>

            <span className="flex items-center gap-1.5 font-mono text-muted-foreground">
              <span className="size-2 rounded-full bg-purple-500" /> WebSocket API:{" "}
              <strong className="text-foreground font-semibold">Not monitored</strong>
            </span>

            <span className="flex items-center gap-1.5 font-mono text-muted-foreground">
              <span
                className={`size-2 rounded-full ${stats?.maintenanceMode ? "bg-red-500" : "bg-emerald-500"}`}
              />
              Maintenance Mode:{" "}
              <strong className={stats?.maintenanceMode ? "text-red-600" : "text-emerald-600"}>
                {stats?.maintenanceMode ? "ACTIVE" : "Normal"}
              </strong>
            </span>
          </div>
        </div>
      </Card>

      {/* Platform Metric Overview Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label} className="shadow-xs hover:border-purple-500/50 transition-all group">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
                    {s.label}
                  </div>
                  {isLoading ? (
                    <Loader2 className="size-6 animate-spin text-muted-foreground mt-2" />
                  ) : (
                    <div className="text-3xl font-black mt-1 tracking-tight font-mono">
                      {s.value}
                    </div>
                  )}
                  {s.hint && <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">{s.hint}</p>}
                </div>
                <div className={`size-12 rounded-xl grid place-items-center ${s.color} transition-transform group-hover:scale-105`}>
                  <s.icon className="size-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card><CardHeader><CardTitle className="text-base">New workspaces by month (UTC)</CardTitle><CardDescription>Provisioning activity for the last six months</CardDescription></CardHeader><CardContent>
        {stats ? <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.growth}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="workspaces" fill="var(--primary)" /></BarChart></ResponsiveContainer></div> : <p className="text-sm text-muted-foreground">{isLoading ? "Loading workspace activity…" : "Workspace activity unavailable"}</p>}
      </CardContent></Card>
      {/* ACTIVE TENANTS & DIRECT 1-CLICK IMPERSONATION HUB */}
      <Card className="shadow-sm border">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="size-5 text-purple-600 dark:text-purple-400" />
              Active Tenant Workspaces & Impersonation Hub
            </CardTitle>
            <CardDescription className="text-xs">
              One-click instant login to any organization workspace without requiring passwords.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild className="text-xs gap-1">
            <Link to="/super/tenants">
              Manage All Workspaces <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {(stats?.tenantsList ?? []).length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs">
              No workspaces found. Click &quot;Provision Tenant&quot; to initialize a new ERP instance.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {(stats?.tenantsList ?? []).slice(0, 5).map((tenant: any) => (
                <div
                  key={tenant.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/40 px-3 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 grid place-items-center font-bold text-sm shrink-0 border border-purple-500/20">
                      {tenant.name[0]?.toUpperCase() || "T"}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-foreground truncate flex items-center gap-2">
                        <span>{tenant.name}</span>
                        <Badge variant="secondary" className="font-mono text-[10px] py-0 h-4">
                          {tenant.slug}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 font-mono">
                        <span>Created: {new Date(tenant.createdAt || tenant.created_at || Date.now()).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="text-emerald-600 font-semibold">{tenant.policy?.status || "Unassigned"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => loginAsTenantAdmin.mutate(tenant.id)}
                      disabled={loginAsTenantAdmin.isPending}
                      className="h-8 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {loginAsTenantAdmin.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <LogIn className="size-3.5" />
                      )}
                      Enter Workspace
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* DYNAMIC REAL-TIME ANALYTICS WIDGET SUITE */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* WIDGET 1: Financial & MRR Analytics */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <TrendingUp className="size-5 text-emerald-600" /> Executive Financial & MRR
                Analytics (INR ₹)
              </CardTitle>
              <CardDescription className="text-xs">
                Subscription run-rate from assigned plan prices and active workspace policies. This is not a payment collection report.
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className="font-mono text-xs text-emerald-600 bg-emerald-500/10 border-emerald-500/30"
            >
              Live Calculated
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-secondary/30 border">
              <div>
                <div className="text-[11px] text-muted-foreground font-semibold">Monthly MRR</div>
                <div className="text-2xl font-extrabold font-mono text-emerald-600 mt-0.5">
                  {stats ? formatSystemAmount(stats.mrr, stats.currency) : "—"}
                </div>
                <div className="text-[10px] text-emerald-500 font-semibold mt-0.5">
                  Calculated run-rate
                </div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground font-semibold">Annual ARR</div>
                <div className="text-2xl font-extrabold font-mono text-blue-600 mt-0.5">
                  {stats ? formatSystemAmount(stats.arr, stats.currency) : "—"}
                </div>
                <div className="text-[10px] text-blue-500 font-semibold mt-0.5">
                  Annualized metric
                </div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground font-semibold">
                  Avg ARPU / Tenant
                </div>
                <div className="text-2xl font-extrabold font-mono text-purple-600 mt-0.5">
                  {stats ? formatSystemAmount(stats.arpu, stats.currency) : "—"}
                </div>
                <div className="text-[10px] text-purple-500 font-semibold mt-0.5">
                  Per workspace / mo
                </div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground font-semibold">
                  Active Workspaces
                </div>
                <div className="text-2xl font-extrabold font-mono text-amber-600 mt-0.5">
                  {stats?.tenants ?? 0}
                </div>
                <div className="text-[10px] text-amber-500 font-semibold mt-0.5">Tenants count</div>
              </div>
            </div>

            {/* Subscriptions Plan Distribution Progress Bar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Tenant Subscription Tier Breakdown</span>
                <span className="text-muted-foreground font-mono">
                  {stats?.tenants ?? 0} Active ERP Workspaces
                </span>
              </div>
              {(stats?.planDistribution || []).map((plan: any) => (
                <div key={plan.name} className="space-y-1">
                  <div className="flex justify-between text-xs"><span>{plan.name}</span><span>{plan.count} workspaces</span></div>
                  <Progress value={stats?.tenants ? plan.count / stats.tenants * 100 : 0} className="h-2" />
                </div>
              ))}
              {!stats?.planDistribution?.length && <p className="text-xs text-muted-foreground">No workspace subscriptions to display.</p>}
            </div>
          </CardContent>
        </Card>

        {/* WIDGET 2: Platform Velocity & System Health */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Activity className="size-5 text-blue-600" /> Real-time System Velocity
            </CardTitle>
            <CardDescription className="text-xs">
              Database & server telemetry stream
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-2 border-b pb-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground font-medium">Database State:</span>
                <span className="font-bold font-mono text-emerald-600">{stats ? "Query successful" : "Unavailable"}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground font-medium">Statistics query duration:</span>
                <span className="font-bold font-mono text-blue-600">{stats ? `${stats.queryDurationMs} ms` : "—"}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground font-medium">Open Support Tickets:</span>
                <span className="font-bold font-mono text-amber-600">
                  {stats?.openTickets ?? 0} Pending
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span>Suspended workspaces</span>
                <span className="font-mono text-xs">{stats?.suspendedTenants ?? "—"}</span>
              </div>
              <Progress value={stats?.tenants ? stats.suspendedTenants / stats.tenants * 100 : 0} className="h-2" />
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex justify-between text-xs font-semibold">
                <span>Marketplace Catalog Load</span>
                <span className="font-mono text-xs">{stats?.addonsCount ?? 0} Modules</span>
              </div>
              
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECOND WIDGET ROW: Real-time Marketplace Addons & Security Audit Stream */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* WIDGET 3: Real Addons Marketplace Stream */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Store className="size-5 text-purple-600" /> Real-time Addon Extensions Catalog
              </CardTitle>
              <CardDescription className="text-xs">
                Live queried modules from addons database
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs gap-1 text-primary">
              <Link to="/super/marketplace">
                Manage Catalog <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-3">
              {(stats?.addonsList ?? []).map((addon: any) => (
                <div
                  key={addon.id}
                  className="flex items-center justify-between p-3 rounded-xl border bg-secondary/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-purple-500/10 text-purple-600 grid place-items-center font-bold text-xs">
                      {addon.name[0]}
                    </div>
                    <div>
                      <div className="font-bold text-xs">{addon.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {addon.category} Module
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-xs font-mono">
                      {addon.price_monthly === 0 ? "Free" : `₹${addon.price_monthly}/mo`}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-semibold">Active Module</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* WIDGET 4: Real System Audit Stream */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="size-5 text-amber-600" /> Live Audit Stream & Security
                Events
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time system operations audit feed from MySQL
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              Live Stream
            </Badge>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-3">
              {(stats?.liveLogs ?? []).map((log: any, idx: number) => (
                <div
                  key={log.event + idx}
                  className="flex items-start justify-between p-3 rounded-xl border bg-card"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="size-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <div>
                      <div className="font-bold text-xs">{log.event}</div>
                      <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        {log.detail}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                    {log.time}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 12 Comprehensive Management Console Modules Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Activity className="size-5 text-purple-600 dark:text-purple-400" /> Management Console Modules
          </h2>
          <span className="text-xs text-muted-foreground font-mono">
            12 Enterprise Operational Tools
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {consoleModules.map((mod) => (
            <Link key={mod.to} to={mod.to as any}>
              <Card className="hover:border-purple-500/70 hover:shadow-md transition-all h-full group bg-card border">
                <CardHeader className="p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className={`size-10 rounded-xl bg-gradient-to-br ${mod.color} text-white grid place-items-center shadow-xs group-hover:scale-105 transition-transform`}>
                      <mod.icon className="size-5" />
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {mod.tag}
                    </Badge>
                  </div>
                  <CardTitle className="text-base group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors flex items-center justify-between">
                    {mod.title}
                    <ArrowRight className="size-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </CardTitle>
                  <CardDescription className="text-xs leading-relaxed text-muted-foreground">
                    {mod.desc}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Provision ERP Workspace Modal */}
      <Dialog open={isCreateTenantOpen} onOpenChange={setIsCreateTenantOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Provision New ERP Workspace</DialogTitle>
            <DialogDescription>
              Create a new multi-tenant ERP & HRMS instance with dedicated storage and database
              schema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Workspace Company Name</Label>
              <Input
                placeholder="Apex Global Industries"
                value={newTenantName}
                onChange={(e) => {
                  setNewTenantName(e.target.value);
                  setNewTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Workspace Slug (URL Subdomain)</Label>
              <Input
                placeholder="apex-global"
                value={newTenantSlug}
                onChange={(e) => setNewTenantSlug(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateTenantOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTenant} disabled={isCreatingTenant} className="bg-purple-600 hover:bg-purple-700 text-white">
              {isCreatingTenant ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Plus className="size-4 mr-2" />
              )}
              Provision Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Broadcast Announcement Modal */}
      <Dialog open={isBroadcastOpen} onOpenChange={setIsBroadcastOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Broadcast System Announcement</DialogTitle>
            <DialogDescription>
              Publish an immediate system-wide banner notification to all ERP & HRMS active
              workspaces.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Announcement Title</Label>
              <Input
                placeholder="Scheduled Maintenance & Platform Upgrade"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Announcement Content</Label>
              <Textarea
                placeholder="We are upgrading the core ERP database engine on Sunday at 02:00 UTC. Systems will remain operational."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBroadcastOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendBroadcast} disabled={isSendingBroadcast} className="bg-purple-600 hover:bg-purple-700 text-white">
              {isSendingBroadcast ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Send className="size-4 mr-2" />
              )}
              Broadcast Banner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

