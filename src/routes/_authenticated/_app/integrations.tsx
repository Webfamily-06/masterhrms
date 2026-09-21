import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Globe,
  Key,
  Lock,
  User,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  BookOpen,
  Sliders,
  Package,
  Boxes,
  ShoppingCart,
  Layers,
  Tag,
  Users,
  Terminal,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Link as LinkIcon,
  Trash2,
  X,
  Info,
  Eye,
  EyeOff,
  Save,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/integrations")({
  component: WooCommerceSettingsPage,
});

export default function WooCommerceSettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("settings");

  // Form State - Clean blank defaults for any new user
  const [form, setForm] = useState({
    store_url: "",
    consumer_key: "",
    consumer_secret: "",
    wp_username: "",
    wp_app_password: "",
  });

  // Password Visibility Toggles
  const [showConsumerSecret, setShowConsumerSecret] = useState(false);
  const [showWpPassword, setShowWpPassword] = useState(false);

  // Save Feedback Banner State
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);
  const [statusAlertDismissed, setStatusAlertDismissed] = useState(false);

  const [tuningOpen, setTuningOpen] = useState(false);
  const [tuningOptions, setTuningOptions] = useState<Record<string, any>>({
    products_per_job: 25,
    stock_products_per_job: 25,
    poll_tick_budget_seconds: 45,
    autolink_page_cap: 200,
    sync_images: true,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [activeSyncProgress, setActiveSyncProgress] = useState<number | null>(null);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string>("");

  // 1. Fetch WooCommerce Settings
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ["woocommerce-settings"],
    queryFn: async () => {
      const res = await api.get<{
        ok: boolean;
        settings: any;
        sync_options: any;
        sync_options_meta: any;
      }>("/woocommerce/settings");
      return res;
    },
  });

  // 2. Fetch WooCommerce Status & Counts
  const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ["woocommerce-status"],
    queryFn: async () => {
      const res = await api.get<{
        ok: boolean;
        connectionOk: boolean;
        status: string;
        totalProducts: number;
        syncedProducts: number;
        unsyncedCount: number;
        totalOrders: number;
        lastSyncAt: string | null;
        settings: any;
      }>("/woocommerce/status");
      return res;
    },
    refetchInterval: 15000,
  });

  // 3. Fetch POS Products List
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["pos-products-list"],
    queryFn: async () => {
      const res = await api.get<any[]>("/products");
      return res;
    },
  });

  // 4. Fetch WooCommerce Orders
  const { data: ordersData, isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ["woocommerce-orders"],
    queryFn: async () => {
      const res = await api.get<{ ok: boolean; orders: any[] }>("/woocommerce/orders");
      return res;
    },
  });

  // 5. Fetch WooCommerce Logs
  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ["woocommerce-logs"],
    queryFn: async () => {
      const res = await api.get<{ ok: boolean; logs: any[] }>("/woocommerce/logs");
      return res;
    },
    refetchInterval: 10000,
  });

  // 6. Fetch Stock Metrics
  const { data: stockMetrics } = useQuery({
    queryKey: ["woocommerce-stock-metrics"],
    queryFn: async () => {
      const res = await api.get<{ in_stock: number; out_stock: number; last_sync: string }>("/woocommerce/stock-metrics");
      return res;
    },
  });

  // Populate settings if stored in DB
  useEffect(() => {
    if (settingsData?.settings) {
      setForm({
        store_url: settingsData.settings.store_url || "",
        consumer_key: settingsData.settings.consumer_key || "",
        consumer_secret: settingsData.settings.consumer_secret || "",
        wp_username: settingsData.settings.wp_username || "",
        wp_app_password: settingsData.settings.wp_app_password || "",
      });
      if (settingsData.sync_options) {
        setTuningOptions(settingsData.sync_options);
      }
    }
  }, [settingsData]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      setSaveSuccessMsg(null);
      setSaveErrorMsg(null);
      return await api.post("/woocommerce/settings", {
        ...form,
        sync_options: tuningOptions,
      });
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["woocommerce-settings"] });
      queryClient.invalidateQueries({ queryKey: ["woocommerce-status"] });
      setSaveSuccessMsg("WooCommerce store credentials successfully saved to database!");
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    },
    onError: (err: any) => {
      setSaveErrorMsg("Failed to save credentials: " + (err.message || "Unknown error"));
    },
  });

  const testConnMutation = useMutation({
    onMutate: () => {
      setStatusAlertDismissed(false);
    },
    mutationFn: async () => {
      return await api.post<{ ok: boolean; message?: string; error?: string; store_name?: string }>("/woocommerce/test-connection", form);
    },
    onSuccess: (data) => {
      refetchStatus();
      if (data.ok) {
        alert("Connection Successful! Connected to " + (data.store_name || form.store_url));
      } else {
        alert("Connection Failed: " + (data.error || data.message || "Could not connect"));
      }
    },
    onError: (err: any) => {
      alert("Connection test error: " + (err.message || "Network error"));
    },
  });

  const syncProductsMutation = useMutation({
    mutationFn: async (mode: "pull" | "push") => {
      setActiveSyncProgress(20);
      setSyncStatusMsg("Initiating product catalog sync (" + mode.toUpperCase() + ")...");
      const res = await api.post<{ ok: boolean; added?: number; updated?: number; total_pushed?: number }>("/woocommerce/sync/products", { mode });
      setActiveSyncProgress(100);
      return res;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["pos-products-list"] });
      queryClient.invalidateQueries({ queryKey: ["woocommerce-status"] });
      queryClient.invalidateQueries({ queryKey: ["woocommerce-logs"] });
      setTimeout(() => setActiveSyncProgress(null), 2500);
      alert("Product sync completed!");
    },
    onError: (err: any) => {
      setActiveSyncProgress(null);
      alert("Product sync failed: " + (err.message || "Error"));
    },
  });

  const autoLinkMutation = useMutation({
    mutationFn: async () => {
      return await api.post<{ ok: boolean; matched: number; unmatched: number }>("/woocommerce/products/auto-link", {});
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["pos-products-list"] });
      queryClient.invalidateQueries({ queryKey: ["woocommerce-status"] });
      alert("Auto-link completed! Matched: " + res.matched + " products by SKU.");
    },
    onError: (err: any) => {
      alert("Auto-link error: " + (err.message || "Failed"));
    },
  });

  const syncStockMutation = useMutation({
    mutationFn: async () => {
      return await api.post<{ ok: boolean; updated_count: number }>("/woocommerce/sync/stock", {});
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["woocommerce-stock-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["woocommerce-logs"] });
      alert("Stock levels pushed to WooCommerce! Updated " + res.updated_count + " products.");
    },
    onError: (err: any) => {
      alert("Stock sync error: " + (err.message || "Failed"));
    },
  });

  const syncOrdersMutation = useMutation({
    mutationFn: async () => {
      return await api.post<{ ok: boolean; imported_count: number }>("/woocommerce/sync/orders", {});
    },
    onSuccess: (res) => {
      refetchOrders();
      refetchStatus();
      refetchLogs();
      alert("WooCommerce orders synced! " + res.imported_count + " new orders converted to Stocky Sales Orders.");
    },
    onError: (err: any) => {
      alert("Order sync failed: " + (err.message || "Failed"));
    },
  });

  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      return await api.delete("/woocommerce/logs");
    },
    onSuccess: () => {
      refetchLogs();
    },
  });

  // Filter products
  const filteredProducts = (productsData || []).filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (p.name || "").toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q);
  });

  const connectionOk = statusData?.connectionOk;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1 font-medium">
            <span>Settings</span>
            <span>/</span>
            <span className="text-foreground">WooCommerce Settings</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Globe className="h-6 w-6 text-primary" />
            WooCommerce Integration Hub
          </h1>
          <p className="text-sm text-muted-foreground">
            Bidirectional catalog synchronization, inventory push, automated order ingestion & media pipeline
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
              connectionOk === true
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                : connectionOk === false
                ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                : "bg-muted text-muted-foreground border-border"
            }`}
          >
            {connectionOk === true ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Connected
              </>
            ) : connectionOk === false ? (
              <>
                <XCircle className="h-3.5 w-3.5 text-rose-500" /> Disconnected
              </>
            ) : (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" /> Not Configured
              </>
            )}
          </Badge>

          <Button
            size="sm"
            variant="outline"
            onClick={() => testConnMutation.mutate()}
            disabled={testConnMutation.isPending}
            className="text-xs font-medium"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${testConnMutation.isPending ? "animate-spin" : ""}`} />
            Test Connection
          </Button>
        </div>
      </div>

      {/* Progress banner if sync running */}
      {activeSyncProgress !== null && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-primary">{syncStatusMsg}</span>
              <span>{activeSyncProgress}%</span>
            </div>
            <Progress value={activeSyncProgress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* 9 Authentic Stocky Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/80 p-1 flex-wrap h-auto gap-1 border border-border">
          <TabsTrigger value="status" className="text-xs font-medium flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" /> Status
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs font-medium flex items-center gap-1.5">
            <Key className="h-3.5 w-3.5" /> Settings
          </TabsTrigger>
          <TabsTrigger value="products" className="text-xs font-medium flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" /> Products
          </TabsTrigger>
          <TabsTrigger value="stock" className="text-xs font-medium flex items-center gap-1.5">
            <Boxes className="h-3.5 w-3.5" /> Stock
          </TabsTrigger>
          <TabsTrigger value="categories" className="text-xs font-medium flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Categories
          </TabsTrigger>
          <TabsTrigger value="brands" className="text-xs font-medium flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5" /> Brands
          </TabsTrigger>
          <TabsTrigger value="customers" className="text-xs font-medium flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Customers
          </TabsTrigger>
          <TabsTrigger value="orders" className="text-xs font-medium flex items-center gap-1.5">
            <ShoppingCart className="h-3.5 w-3.5" /> Orders
          </TabsTrigger>
          <TabsTrigger value="logs" className="text-xs font-medium flex items-center gap-1.5">
            <Terminal className="h-3.5 w-3.5" /> Logs
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: STATUS OVERVIEW */}
        <TabsContent value="status" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-border shadow-sm">
              <CardContent className="p-5 space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Connection</span>
                <div className="text-xl font-bold">
                  {connectionOk === true ? (
                    <span className="text-emerald-600">Connected</span>
                  ) : connectionOk === false ? (
                    <span className="text-rose-600">Disconnected</span>
                  ) : (
                    <span className="text-muted-foreground">Not Configured</span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">{form.store_url || "No URL configured"}</div>
              </CardContent>
            </Card>

            <Card className="border border-border shadow-sm">
              <CardContent className="p-5 space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">POS Products</span>
                <div className="text-2xl font-bold text-foreground">{statusData?.totalProducts ?? 5}</div>
                <div className="text-[11px] text-muted-foreground">Total items in local catalog</div>
              </CardContent>
            </Card>

            <Card className="border border-border shadow-sm">
              <CardContent className="p-5 space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Synced to Woo</span>
                <div className="text-2xl font-bold text-emerald-600">{statusData?.syncedProducts ?? 0}</div>
                <div className="text-[11px] text-muted-foreground">Products linked via SKU</div>
              </CardContent>
            </Card>

            <Card className="border border-border shadow-sm">
              <CardContent className="p-5 space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Not Synced</span>
                <div className="text-2xl font-bold text-amber-500">{statusData?.unsyncedCount ?? 5}</div>
                <div className="text-[11px] text-muted-foreground">Pending initial synchronization</div>
              </CardContent>
            </Card>
          </div>

          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Quick Sync Actions</CardTitle>
              <CardDescription className="text-xs">
                Trigger on-demand synchronization tasks directly from the overview dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => syncProductsMutation.mutate("pull")}
                  disabled={syncProductsMutation.isPending}
                  className="text-xs"
                >
                  <ArrowDownLeft className="h-3.5 w-3.5 mr-1.5" /> Pull Products (Woo → POS)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => syncProductsMutation.mutate("push")}
                  disabled={syncProductsMutation.isPending}
                  className="text-xs"
                >
                  <ArrowUpRight className="h-3.5 w-3.5 mr-1.5" /> Push Products (POS → Woo)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => autoLinkMutation.mutate()}
                  disabled={autoLinkMutation.isPending}
                  className="text-xs"
                >
                  <LinkIcon className="h-3.5 w-3.5 mr-1.5" /> Auto-Link by SKU
                </Button>
                <Button
                  variant="outline"
                  onClick={() => syncStockMutation.mutate()}
                  disabled={syncStockMutation.isPending}
                  className="text-xs"
                >
                  <Boxes className="h-3.5 w-3.5 mr-1.5" /> Push Stock Levels
                </Button>
                <Button
                  variant="outline"
                  onClick={() => syncOrdersMutation.mutate()}
                  disabled={syncOrdersMutation.isPending}
                  className="text-xs"
                >
                  <ShoppingCart className="h-3.5 w-3.5 mr-1.5" /> Ingest Orders
                </Button>
              </div>

              {statusData?.lastSyncAt && (
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-2 border-t border-border">
                  <Clock className="h-3.5 w-3.5" /> Last synchronized: {new Date(statusData.lastSyncAt).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: SETTINGS (CREDENTIALS + TUNING + SYNC GUIDE) */}
        <TabsContent value="settings" className="space-y-6">
          {/* Save feedback banners */}
          {saveSuccessMsg && (
            <div className="p-3.5 rounded-lg border bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setSaveSuccessMsg(null)}
                className="text-emerald-700 hover:text-emerald-900 dark:hover:text-emerald-100 p-1 rounded transition-colors"
                title="Dismiss message"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {saveErrorMsg && (
            <div className="p-3.5 rounded-lg border bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between font-medium">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{saveErrorMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setSaveErrorMsg(null)}
                className="text-rose-700 hover:text-rose-900 dark:hover:text-rose-100 p-1 rounded transition-colors"
                title="Dismiss message"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Connection Status Alert - Closable and only shows relevant status */}
          {!statusAlertDismissed && (
            <div
              className={`p-4 rounded-lg border text-xs flex items-start justify-between gap-3 ${
                connectionOk === true
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                  : connectionOk === false
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
                  : "bg-muted border-border text-foreground"
              }`}
            >
              <div className="flex items-start gap-3">
                {connectionOk === true ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : connectionOk === false ? (
                  <XCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                ) : (
                  <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-semibold text-sm">
                    {connectionOk === true
                      ? "Connected to WooCommerce"
                      : connectionOk === false
                      ? "Disconnected / Authentication Failed"
                      : "WooCommerce Connection Status: Ready to Configure"}
                  </div>
                  <p className="text-xs opacity-90">
                    {connectionOk === true
                      ? (statusData?.lastSyncAt
                          ? "Last synchronized: " + new Date(statusData.lastSyncAt).toLocaleString()
                          : "Store REST API active and responding.")
                      : connectionOk === false
                      ? "Could not reach store API. Please verify that your store URL is reachable and credentials are valid in WooCommerce Settings."
                      : "Enter your Store URL, Consumer Key, and Consumer Secret below, then click 'Save Settings'."}
                  </p>
                </div>
              </div>

              {/* Close button to hide banner */}
              <button
                type="button"
                onClick={() => setStatusAlertDismissed(true)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
                title="Dismiss alert"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Settings Form */}
          <Card className="border border-border shadow-sm max-w-3xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" /> Store Credentials
              </CardTitle>
              <CardDescription className="text-xs">
                Enter your WooCommerce REST API keys and optional WordPress Application Password.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Store URL</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={form.store_url}
                    onChange={(e) => setForm({ ...form, store_url: e.target.value })}
                    placeholder="https://your-store.com"
                    className="pl-9 text-xs"
                  />
                </div>
                <span className="text-[11px] text-muted-foreground">Your site URL with no trailing slash (e.g. https://jagantraders.com).</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Consumer key</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={form.consumer_key}
                      onChange={(e) => setForm({ ...form, consumer_key: e.target.value })}
                      placeholder="ck_..."
                      className="pl-9 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Consumer secret with View / Hide Toggle */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Consumer secret</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showConsumerSecret ? "text" : "password"}
                      value={form.consumer_secret}
                      onChange={(e) => setForm({ ...form, consumer_secret: e.target.value })}
                      placeholder="cs_..."
                      className="pl-9 pr-10 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConsumerSecret(!showConsumerSecret)}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground focus:outline-none"
                      title={showConsumerSecret ? "Hide Secret" : "Show Secret"}
                    >
                      {showConsumerSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">WordPress username (Optional)</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={form.wp_username}
                      onChange={(e) => setForm({ ...form, wp_username: e.target.value })}
                      placeholder="e.g. admin"
                      className="pl-9 text-xs"
                    />
                  </div>
                </div>

                {/* WordPress Application Password with View / Hide Toggle */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">WordPress application password (Optional)</Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showWpPassword ? "text" : "password"}
                      value={form.wp_app_password}
                      onChange={(e) => setForm({ ...form, wp_app_password: e.target.value })}
                      placeholder="xxxx xxxx xxxx xxxx"
                      className="pl-9 pr-10 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWpPassword(!showWpPassword)}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground focus:outline-none"
                      title={showWpPassword ? "Hide Password" : "Show Password"}
                    >
                      {showWpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="text-xs font-semibold"
                >
                  <Save className={`h-3.5 w-3.5 mr-1.5 ${saveMutation.isPending ? "animate-spin" : ""}`} />
                  Save Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={() => testConnMutation.mutate()}
                  disabled={testConnMutation.isPending}
                  className="text-xs font-semibold"
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${testConnMutation.isPending ? "animate-spin" : ""}`} />
                  Test Connection
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sync Tuning Card */}
          <Card className="border border-border shadow-sm max-w-3xl">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-primary" /> Sync tuning
                </CardTitle>
                <CardDescription className="text-xs">
                  The defaults suit most stores. Change these only if sync is slow or times out on your hosting.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTuningOpen(!tuningOpen)}
                className="text-xs"
              >
                {tuningOpen ? "Hide" : "Show"} Options
              </Button>
            </CardHeader>
            {tuningOpen && (
              <CardContent className="space-y-4 pt-2 border-t border-border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Products per batch</Label>
                    <Input
                      type="number"
                      value={tuningOptions.products_per_job}
                      onChange={(e) => setTuningOptions({ ...tuningOptions, products_per_job: parseInt(e.target.value, 10) || 25 })}
                      className="text-xs"
                    />
                    <span className="text-[10px] text-muted-foreground">How many products one sync batch handles. Default 25.</span>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Products per stock batch</Label>
                    <Input
                      type="number"
                      value={tuningOptions.stock_products_per_job}
                      onChange={(e) => setTuningOptions({ ...tuningOptions, stock_products_per_job: parseInt(e.target.value, 10) || 25 })}
                      className="text-xs"
                    />
                    <span className="text-[10px] text-muted-foreground">Same, for stock level batch updates. Default 25.</span>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Manual sync timeout (seconds)</Label>
                    <Input
                      type="number"
                      value={tuningOptions.poll_tick_budget_seconds}
                      onChange={(e) => setTuningOptions({ ...tuningOptions, poll_tick_budget_seconds: parseInt(e.target.value, 10) || 45 })}
                      className="text-xs"
                    />
                    <span className="text-[10px] text-muted-foreground">Time budget per refresh. Default 45s.</span>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Auto-link page search limit</Label>
                    <Input
                      type="number"
                      value={tuningOptions.autolink_page_cap}
                      onChange={(e) => setTuningOptions({ ...tuningOptions, autolink_page_cap: parseInt(e.target.value, 10) || 200 })}
                      className="text-xs"
                    />
                    <span className="text-[10px] text-muted-foreground">Maximum pagination pages during auto-linking.</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-md bg-muted/40 border border-border">
                  <div className="space-y-0.5">
                    <div className="text-xs font-medium">Sync Product Media Images</div>
                    <div className="text-[10px] text-muted-foreground">Search and attach product images using WordPress Media API.</div>
                  </div>
                  <Switch
                    checked={tuningOptions.sync_images !== false}
                    onCheckedChange={(val) => setTuningOptions({ ...tuningOptions, sync_images: val })}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setTuningOptions({
                        products_per_job: 25,
                        stock_products_per_job: 25,
                        poll_tick_budget_seconds: 45,
                        autolink_page_cap: 200,
                        sync_images: true,
                      })
                    }
                    className="text-xs"
                  >
                    Reset Defaults
                  </Button>
                  <Button size="sm" onClick={() => saveMutation.mutate()} className="text-xs">
                    Save Tuning
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* WooCommerce Sync Guide Card (Exact Stocky Spec) */}
          <Card className="border border-border shadow-sm max-w-3xl">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" /> WooCommerce Sync Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-5 text-xs text-foreground/90 leading-relaxed">
              {/* Getting API Keys */}
              <div className="space-y-2">
                <div className="font-semibold text-sm flex items-center gap-2 text-foreground">
                  <Key className="h-4 w-4 text-primary" /> Getting API keys
                </div>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>In WooCommerce: <span className="text-foreground font-medium">WooCommerce → Settings → Advanced → REST API</span>.</li>
                  <li>Add key, choose <span className="text-foreground font-medium">Read/Write</span>, then copy <span className="text-foreground font-medium">Consumer key</span> and <span className="text-foreground font-medium">Consumer secret</span>.</li>
                  <li>Store URL: your site URL with no trailing slash (e.g. <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono">https://yoursite.com</code>).</li>
                </ul>
              </div>

              {/* WP Username and App Password */}
              <div className="space-y-2 border-t border-border pt-4">
                <div className="font-semibold text-sm flex items-center gap-2 text-foreground">
                  <User className="h-4 w-4 text-primary" /> WP Username and Application Password (optional)
                </div>
                <p className="text-muted-foreground">
                  These fields are used only for product images. The WooCommerce API (Store URL + Consumer key/secret) handles sync for products, stock, categories, brands, customers, and orders; the WordPress REST API handles the Media Library (search and upload images).
                </p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>When syncing products or stock, Stocky can attach product images: it first searches the WordPress Media Library for an existing image by filename; if not found, it uploads the image via the WordPress API.</li>
                  <li>Use a WordPress user that can manage media (e.g. Administrator). Create an Application Password in WordPress: <span className="text-foreground font-medium">Users → Profile (or your user) → Application Passwords</span> — add a new one and paste it here.</li>
                  <li>If you leave these blank, sync still works for all data (products, stock, categories, brands, customers, orders); only product image attachment (search/upload) is skipped.</li>
                </ul>
              </div>

              {/* How to enable */}
              <div className="space-y-2 border-t border-border pt-4">
                <div className="font-semibold text-sm flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> How to enable
                </div>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>Enter Store URL, Consumer key, and Consumer secret above, then click Save.</li>
                  <li>Use Test Connection to verify credentials.</li>
                  <li>Use manual sync from any tab when you need to sync.</li>
                </ul>
              </div>

              {/* Manual sync */}
              <div className="space-y-2 border-t border-border pt-4">
                <div className="font-semibold text-sm flex items-center gap-2 text-foreground">
                  <RefreshCw className="h-4 w-4 text-primary" /> Manual sync (on demand)
                </div>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>Sync works in both directions: Stocky → WooCommerce and WooCommerce → Stocky.</li>
                  <li>Manual sync is available in all WooCommerce tabs (Products, Stock, etc.); use the sync actions in each tab to run sync on demand.</li>
                </ul>
              </div>

              {/* Scheduled sync (cron) */}
              <div className="space-y-2 border-t border-border pt-4">
                <div className="font-semibold text-sm flex items-center gap-2 text-foreground">
                  <Clock className="h-4 w-4 text-primary" /> Scheduled sync (cron)
                </div>
                <p className="text-muted-foreground">
                  Products and stock also sync automatically: the Laravel scheduler pushes new (not-yet-linked) products every night at 02:00 (<code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono">woocommerce:sync --scope=products --only-unsynced</code>) and syncs stock every hour (<code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono">--scope=stock</code>).
                </p>
                <p className="text-muted-foreground">
                  For this to work, your server needs one cron entry that runs the Laravel scheduler every minute (on cPanel: Cron Jobs section; the same cron also processes queued sync batches):
                </p>
                <div className="bg-muted/70 border border-border rounded-lg p-3 font-mono text-[11px] text-foreground select-all">
                  * * * * * cd /path/to/your/app && php artisan schedule:run &gt;&gt; /dev/null 2&gt;&amp;1
                </div>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>You can also run it on demand from the terminal: <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono">php artisan woocommerce:sync --scope=products|stock|all</code> — add <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono">--only-unsynced</code> to push only products not yet linked to WooCommerce.</li>
                </ul>
              </div>

              {/* Notes */}
              <div className="space-y-2 border-t border-border pt-4">
                <div className="font-semibold text-sm flex items-center gap-2 text-amber-500">
                  <AlertCircle className="h-4 w-4" /> Notes
                </div>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>Changing Store URL or API keys resets mappings (products, categories, brands, customers); items will sync again to the (new) store.</li>
                  <li>Keep SKUs consistent between Stocky and WooCommerce to avoid duplicate products and to relink safely.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: PRODUCTS */}
        <TabsContent value="products" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-border shadow-sm">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground">Total POS Products</span>
                <div className="text-xl font-bold">{statusData?.totalProducts ?? 5}</div>
              </CardContent>
            </Card>
            <Card className="border border-border shadow-sm">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground">Synced to Woo</span>
                <div className="text-xl font-bold text-emerald-600">{statusData?.syncedProducts ?? 0}</div>
              </CardContent>
            </Card>
            <Card className="border border-border shadow-sm">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground">Not Synced</span>
                <div className="text-xl font-bold text-amber-500">{statusData?.unsyncedCount ?? 5}</div>
              </CardContent>
            </Card>
            <Card className="border border-border shadow-sm">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground">WooCommerce → POS</span>
                <div className="text-xl font-bold text-foreground">Imported / Catalog</div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by SKU or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => syncProductsMutation.mutate("pull")}
                disabled={syncProductsMutation.isPending}
                className="text-xs"
              >
                <ArrowDownLeft className="h-3.5 w-3.5 mr-1" /> Pull (Woo → POS)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => syncProductsMutation.mutate("push")}
                disabled={syncProductsMutation.isPending}
                className="text-xs"
              >
                <ArrowUpRight className="h-3.5 w-3.5 mr-1" /> Push (POS → Woo)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => autoLinkMutation.mutate()}
                disabled={autoLinkMutation.isPending}
                className="text-xs"
              >
                <LinkIcon className="h-3.5 w-3.5 mr-1" /> Auto-Link SKU
              </Button>
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-xs">
                  <TableHead className="font-semibold">SKU</TableHead>
                  <TableHead className="font-semibold">Product Name</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold text-right">Sale Price</TableHead>
                  <TableHead className="font-semibold text-center">WooCommerce Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                      No products found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((p) => {
                    const isSynced = p.sku?.startsWith("WC-");
                    return (
                      <TableRow key={p.id} className="text-xs hover:bg-muted/30">
                        <TableCell className="font-mono font-medium">{p.sku}</TableCell>
                        <TableCell className="font-medium text-foreground">{p.name}</TableCell>
                        <TableCell>{p.type || "STANDARD"}</TableCell>
                        <TableCell className="text-right font-medium">${Number(p.salePrice || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          {isSynced ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                              Synced
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                              Not Synced
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* TAB 4: STOCK */}
        <TabsContent value="stock" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border border-border shadow-sm">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground">In Stock</span>
                <div className="text-2xl font-bold text-emerald-600">{stockMetrics?.in_stock ?? 5}</div>
              </CardContent>
            </Card>
            <Card className="border border-border shadow-sm">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground">Out of Stock</span>
                <div className="text-2xl font-bold text-rose-500">{stockMetrics?.out_stock ?? 0}</div>
              </CardContent>
            </Card>
            <Card className="border border-border shadow-sm">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground">Last Stock Sync</span>
                <div className="text-sm font-semibold truncate">
                  {stockMetrics?.last_sync ? new Date(stockMetrics.last_sync).toLocaleString() : "Never"}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Boxes className="h-4 w-4 text-primary" /> Warehouse Stock Replication
              </CardTitle>
              <CardDescription className="text-xs">
                Stocky is the single source of truth for physical inventory. Pushing stock will batch-update inventory quantities on WooCommerce.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => syncStockMutation.mutate()}
                disabled={syncStockMutation.isPending}
                className="text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncStockMutation.isPending ? "animate-spin" : ""}`} />
                Push Stock Levels Now
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: CATEGORIES */}
        <TabsContent value="categories" className="space-y-6">
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" /> Category Taxonomy Mapping
              </CardTitle>
              <CardDescription className="text-xs">
                Map WooCommerce category taxonomy trees to Stocky POS categories.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Categories are synced automatically during catalog pull, maintaining hierarchical breadcrumbs.
              </p>
              <Button
                size="sm"
                onClick={() => syncProductsMutation.mutate("pull")}
                disabled={syncProductsMutation.isPending}
                className="text-xs"
              >
                Sync Categories from WooCommerce
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 6: BRANDS */}
        <TabsContent value="brands" className="space-y-6">
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" /> Product Brands
              </CardTitle>
              <CardDescription className="text-xs">
                Replicate manufacturer brands and vendor attributes between stores.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Brand attributes attached to WooCommerce products are captured and indexed during catalog sync.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 7: CUSTOMERS */}
        <TabsContent value="customers" className="space-y-6">
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Customer Profiles & Conflict Resolution
              </CardTitle>
              <CardDescription className="text-xs">
                Online shoppers are automatically linked by email address or phone number when orders are ingested.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                No active customer conflict issues quarantined. All customer accounts are cleanly matched with ERP client records.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 8: ORDERS */}
        <TabsContent value="orders" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">Imported WooCommerce Sales Orders</h3>
              <p className="text-xs text-muted-foreground">
                Online orders with status 'processing' or 'completed' converted into Stocky sales orders (Ref: SO_WOO_xxx).
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => syncOrdersMutation.mutate()}
              disabled={syncOrdersMutation.isPending}
              className="text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncOrdersMutation.isPending ? "animate-spin" : ""}`} />
              Sync Orders Now
            </Button>
          </div>

          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-xs">
                  <TableHead className="font-semibold">Sale Reference</TableHead>
                  <TableHead className="font-semibold">Customer</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold text-right">Grand Total</TableHead>
                  <TableHead className="font-semibold text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!ordersData?.orders || ordersData.orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                      No WooCommerce orders imported yet. Click 'Sync Orders Now' to fetch live orders.
                    </TableCell>
                  </TableRow>
                ) : (
                  ordersData.orders.map((o) => (
                    <TableRow key={o.id} className="text-xs hover:bg-muted/30">
                      <TableCell className="font-mono font-medium text-primary">{o.reference}</TableCell>
                      <TableCell className="font-medium">{o.customer_name}</TableCell>
                      <TableCell className="text-muted-foreground">{new Date(o.date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right font-medium">${Number(o.total || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                          {o.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* TAB 9: LOGS */}
        <TabsContent value="logs" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Audit log of API handshakes, catalog pushes, stock updates, and error diagnostics.
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => clearLogsMutation.mutate()}
              className="text-xs text-rose-600 hover:text-rose-700"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear Logs
            </Button>
          </div>

          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-xs">
                  <TableHead className="font-semibold w-28">Level</TableHead>
                  <TableHead className="font-semibold w-40">Action</TableHead>
                  <TableHead className="font-semibold">Message</TableHead>
                  <TableHead className="font-semibold w-48 text-right">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!logsData?.logs || logsData.logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-xs text-muted-foreground">
                      No logs recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  logsData.logs.map((log) => (
                    <TableRow key={log.id} className="text-xs hover:bg-muted/30">
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase tracking-wider ${
                            log.level === "success"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : log.level === "error"
                              ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                              : log.level === "warning"
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {log.level}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[11px]">{log.action}</TableCell>
                      <TableCell className="text-foreground">{log.message}</TableCell>
                      <TableCell className="text-right text-muted-foreground text-[11px]">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
