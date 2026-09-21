import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
  Store,
  Key,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Clock,
  Package,
  Boxes,
  ShoppingCart,
  Users,
  MapPin,
  Trash2,
  X,
  Info,
  Eye,
  EyeOff,
  Save,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
  ShieldCheck,
  Search,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/shopify")({
  component: ShopifyHubPage,
});

export default function ShopifyHubPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Store Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("");
  const [shopDomain, setShopDomain] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [apiVersion, setApiVersion] = useState("2024-07");
  const [defaultWarehouseId, setDefaultWarehouseId] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [syncProducts, setSyncProducts] = useState(true);
  const [syncStock, setSyncStock] = useState(true);
  const [syncOrders, setSyncOrders] = useState(true);
  const [syncCustomers, setSyncCustomers] = useState(true);

  // Connection & Sync UI States
  const [testResult, setTestResult] = useState<{ ok?: boolean; message?: string } | null>(null);
  const [syncResult, setSyncResult] = useState<{ ok?: boolean; message?: string } | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [logSearch, setLogSearch] = useState("");
  const [selectedLogLevel, setSelectedLogLevel] = useState<string>("all");

  // Queries
  const { data: dashData, isLoading: dashLoading } = useQuery({
    queryKey: ["shopify-dashboard"],
    queryFn: () => api.get("/shopify/dashboard"),
    refetchInterval: 15000,
  });

  const { data: storesData } = useQuery({
    queryKey: ["shopify-stores"],
    queryFn: () => api.get("/shopify/stores"),
  });

  const { data: logsData, refetch: refetchLogs } = useQuery({
    queryKey: ["shopify-logs"],
    queryFn: () => api.get("/shopify/logs"),
  });

  const stores = storesData?.stores || dashData?.stores || [];
  const warehouses = storesData?.warehouses || [];
  const kpis = dashData?.kpis || {
    connected_stores: 0,
    total_stores: 0,
    linked_products: 0,
    shopify_sales: 0,
    error_count: 0,
  };
  const logs = logsData?.logs || dashData?.recent_logs || [];

  // Active Store Selection
  const activeStore = stores.find((s: any) => s.id === selectedStoreId) || stores[0] || null;

  // Mutations
  const testConnMutation = useMutation({
    mutationFn: (payload: any) => api.post("/shopify/test-connection", payload),
    onSuccess: (res: any) => {
      setTestResult(res);
      queryClient.invalidateQueries({ queryKey: ["shopify-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["shopify-stores"] });
    },
    onError: (err: any) => {
      setTestResult({ ok: false, message: err.message || "Connection test failed" });
    },
  });

  const saveStoreMutation = useMutation({
    mutationFn: (payload: any) => api.post("/shopify/stores", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopify-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["shopify-stores"] });
      queryClient.invalidateQueries({ queryKey: ["shopify-logs"] });
      setIsFormOpen(false);
      resetForm();
    },
  });

  const deleteStoreMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/shopify/stores/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopify-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["shopify-stores"] });
      queryClient.invalidateQueries({ queryKey: ["shopify-logs"] });
    },
  });

  const syncEntityMutation = useMutation({
    mutationFn: ({ endpoint, payload }: { endpoint: string; payload: any }) =>
      api.post(endpoint, payload),
    onSuccess: (res: any) => {
      setSyncResult(res);
      queryClient.invalidateQueries({ queryKey: ["shopify-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["shopify-logs"] });
      queryClient.invalidateQueries({ queryKey: ["pos-products-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["products-list"] });
    },
    onError: (err: any) => {
      setSyncResult({ ok: false, message: err.message || "Sync execution failed" });
    },
  });

  function resetForm() {
    setEditingStoreId(null);
    setStoreName("");
    setShopDomain("");
    setAccessToken("");
    setApiVersion("2024-07");
    setDefaultWarehouseId("");
    setShowToken(false);
    setTestResult(null);
  }

  function openEditForm(store: any) {
    setEditingStoreId(store.id);
    setStoreName(store.name || "");
    setShopDomain(store.shop_domain || "");
    setAccessToken(store.access_token || "");
    setApiVersion(store.api_version || "2024-07");
    setDefaultWarehouseId(store.default_warehouse_id || "");
    setSyncProducts(store.sync_products ?? true);
    setSyncStock(store.sync_stock ?? true);
    setSyncOrders(store.sync_orders ?? true);
    setSyncCustomers(store.sync_customers ?? true);
    setTestResult(null);
    setIsFormOpen(true);
  }

  function handleSaveStore(e: React.FormEvent) {
    e.preventDefault();
    saveStoreMutation.mutate({
      id: editingStoreId || undefined,
      name: storeName,
      shop_domain: shopDomain,
      access_token: accessToken,
      api_version: apiVersion,
      default_warehouse_id: defaultWarehouseId,
      sync_products: syncProducts,
      sync_stock: syncStock,
      sync_orders: syncOrders,
      sync_customers: syncCustomers,
    });
  }

  const filteredLogs = logs.filter((l: any) => {
    const matchSearch =
      !logSearch ||
      l.message?.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.action?.toLowerCase().includes(logSearch.toLowerCase());
    const matchLevel = selectedLogLevel === "all" || l.level === selectedLogLevel;
    return matchSearch && matchLevel;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-[#008060]/10 text-[#008060]">
              <Store className="w-5 h-5 text-[#008060]" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Shopify Integration Hub
            </h1>
            <Badge className="bg-[#008060] hover:bg-[#008060]/90 text-white font-medium text-xs px-2 py-0.5">
              Shopify v5.8
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Multi-store bidirectional catalog synchronization, warehouse stock management, POS visibility, and order ingestion.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchLogs();
              queryClient.invalidateQueries({ queryKey: ["shopify-dashboard"] });
            }}
            className="h-9 gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setIsFormOpen(true);
            }}
            className="h-9 gap-1.5 bg-[#008060] hover:bg-[#008060]/90 text-white font-medium"
          >
            <Plus className="w-4 h-4" />
            Connect Store
          </Button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 border border-border/60">
          <TabsTrigger value="dashboard" className="gap-2 data-[state=active]:bg-background data-[state=active]:text-[#008060] font-medium">
            <Store className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="stores" className="gap-2 data-[state=active]:bg-background data-[state=active]:text-[#008060] font-medium">
            <Store className="w-4 h-4" />
            Stores ({stores.length})
          </TabsTrigger>
          <TabsTrigger value="sync" className="gap-2 data-[state=active]:bg-background data-[state=active]:text-[#008060] font-medium">
            <RefreshCw className="w-4 h-4" />
            Sync Centre
          </TabsTrigger>
          <TabsTrigger value="mappings" className="gap-2 data-[state=active]:bg-background data-[state=active]:text-[#008060] font-medium">
            <MapPin className="w-4 h-4" />
            Locations & Mappings
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2 data-[state=active]:bg-background data-[state=active]:text-[#008060] font-medium">
            <Clock className="w-4 h-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        {/* ==========================================
            TAB 1: DASHBOARD
        ========================================== */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Zero Stores Alert */}
          {stores.length === 0 && (
            <Card className="border-[#008060]/30 bg-[#008060]/5">
              <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#008060]/10 rounded-full text-[#008060] mt-0.5">
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">No Shopify Store Connected Yet</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Connect your first Shopify shop to enable live product syncing into POS, stock adjustments, and order imports.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    resetForm();
                    setIsFormOpen(true);
                  }}
                  className="bg-[#008060] hover:bg-[#008060]/90 text-white shrink-0 font-medium"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Connect Store
                </Button>
              </CardContent>
            </Card>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border/60 hover:shadow-sm transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Connected Stores</span>
                  <div className="p-2 rounded-lg bg-[#008060]/10 text-[#008060]">
                    <Store className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-foreground">{kpis.connected_stores}</span>
                  <span className="text-xs text-muted-foreground">/ {kpis.total_stores} total</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                  Active multi-tenant endpoints
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 hover:shadow-sm transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Linked Products</span>
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                    <Package className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-foreground">{kpis.linked_products}</span>
                  <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200">POS Ready</Badge>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  Visible in POS & Barcode Scanner
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 hover:shadow-sm transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shopify Orders</span>
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-foreground">{kpis.shopify_sales}</span>
                  <span className="text-xs text-muted-foreground">Sales</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  Auto-deducted inventory
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 hover:shadow-sm transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Health Status</span>
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-emerald-600">
                    {kpis.error_count === 0 ? "Optimal" : `${kpis.error_count} Issues`}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  {kpis.error_count === 0 ? "No sync errors logged" : "Review logs tab for details"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Sync Action Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border/60 hover:border-[#008060]/50 transition-all cursor-pointer group" onClick={() => setActiveTab("sync")}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-[#008060]/10 text-[#008060] group-hover:bg-[#008060] group-hover:text-white transition-all">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground">Sync Products</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Pull catalog to POS or push items</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 hover:border-[#008060]/50 transition-all cursor-pointer group" onClick={() => setActiveTab("sync")}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground">Push Stock</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Sync warehouse inventory levels</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 hover:border-[#008060]/50 transition-all cursor-pointer group" onClick={() => setActiveTab("sync")}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground">Ingest Orders</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Import web sales into ERP records</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 hover:border-[#008060]/50 transition-all cursor-pointer group" onClick={() => setActiveTab("sync")}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-all">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground">Sync Customers</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Match & import customer profiles</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Connected Stores Overview Table */}
          <Card className="border-border/60">
            <CardHeader className="p-5 border-b border-border/40 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Active Connected Stores</CardTitle>
                <CardDescription className="text-xs">Stores currently registered in this tenant environment</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setActiveTab("stores")} className="text-xs h-8">
                Manage Stores
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store Name & Domain</TableHead>
                    <TableHead>API Version</TableHead>
                    <TableHead>Default Warehouse</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Sync</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                        No Shopify stores registered yet. Click "Connect Store" above to begin.
                      </TableCell>
                    </TableRow>
                  ) : (
                    stores.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="font-semibold text-foreground text-sm">{s.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            {s.shop_domain}
                            <ExternalLink className="w-3 h-3" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">{s.api_version || "2024-07"}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {s.warehouse_name || "Central Warehouse"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              s.status === "connected"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            }
                          >
                            {s.status === "connected" ? "Connected" : "Configured"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {s.last_sync_at ? new Date(s.last_sync_at).toLocaleString() : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedStoreId(s.id);
                              setActiveTab("sync");
                            }}
                            className="text-xs h-8 text-[#008060] border-[#008060]/30 hover:bg-[#008060]/10"
                          >
                            Sync Now
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==========================================
            TAB 2: STORES MANAGEMENT
        ========================================== */}
        <TabsContent value="stores" className="space-y-6">
          <Card className="border-border/60">
            <CardHeader className="p-5 border-b border-border/40 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Registered Shopify Stores</CardTitle>
                <CardDescription className="text-xs">
                  Connect multiple Shopify stores with separate Admin API tokens and warehouse targets
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  resetForm();
                  setIsFormOpen(true);
                }}
                className="bg-[#008060] hover:bg-[#008060]/90 text-white text-xs h-9 gap-1.5 font-medium"
              >
                <Plus className="w-4 h-4" />
                Connect New Store
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store Name</TableHead>
                    <TableHead>myshopify.com Domain</TableHead>
                    <TableHead>API Version</TableHead>
                    <TableHead>Default Target Warehouse</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                        No stores found. Click "Connect New Store" to add one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    stores.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-semibold text-foreground">{s.name}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{s.shop_domain}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{s.api_version || "2024-07"}</Badge>
                        </TableCell>
                        <TableCell>{s.warehouse_name || "Central Warehouse"}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              s.status === "connected"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-zinc-500/10 text-zinc-600 border-zinc-500/20"
                            }
                          >
                            {s.status === "connected" ? "Connected" : "Idle"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                testConnMutation.mutate({
                                  shop_domain: s.shop_domain,
                                  access_token: s.access_token,
                                  api_version: s.api_version,
                                  store_id: s.id,
                                });
                              }}
                              disabled={testConnMutation.isPending}
                              title="Test API Handshake"
                              className="h-8 px-2 text-muted-foreground hover:text-foreground"
                            >
                              <RefreshCw className={`w-4 h-4 ${testConnMutation.isPending ? "animate-spin" : ""}`} />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditForm(s)}
                              className="text-xs h-8 px-3"
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (confirm(`Are you sure you want to disconnect store "${s.name}"?`)) {
                                  deleteStoreMutation.mutate(s.id);
                                }
                              }}
                              className="h-8 px-2 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==========================================
            TAB 3: SYNC CENTRE
        ========================================== */}
        <TabsContent value="sync" className="space-y-6">
          {/* Store Selector Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg bg-card border border-border/60">
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium shrink-0">Target Store:</Label>
              <select
                value={activeStore?.id || ""}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="h-9 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-[#008060]"
              >
                {stores.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.shop_domain})
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              Last sync:{" "}
              <span className="font-medium text-foreground">
                {activeStore?.last_sync_at ? new Date(activeStore.last_sync_at).toLocaleString() : "Never"}
              </span>
            </div>
          </div>

          {/* Feedback Banner */}
          {syncResult && (
            <div
              className={`p-4 rounded-lg border text-sm flex items-start justify-between gap-3 ${
                syncResult.ok
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "bg-destructive/10 border-destructive/20 text-destructive"
              }`}
            >
              <div className="flex items-start gap-2.5">
                {syncResult.ok ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                )}
                <div>
                  <p className="font-semibold">{syncResult.ok ? "Synchronization Success" : "Sync Failed"}</p>
                  <p className="text-xs mt-0.5 opacity-90">{syncResult.message}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSyncResult(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Sync Entity Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Products Card */}
            <Card className="border-border/60 hover:shadow-sm transition-all">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-[#008060]/10 text-[#008060]">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Products Catalog</CardTitle>
                      <CardDescription className="text-xs">Sync items, SKUs, barcodes, pricing, and images</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">Bidirectional</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-2 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Pull products from Shopify directly into your local database and make them immediately purchasable in the POS terminal.
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      syncEntityMutation.mutate({
                        endpoint: "/shopify/sync/products",
                        payload: { store_id: activeStore?.id, mode: "pull" },
                      })
                    }
                    disabled={syncEntityMutation.isPending || !activeStore}
                    className="bg-[#008060] hover:bg-[#008060]/90 text-white font-medium text-xs h-9 gap-1.5 flex-1"
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    Pull to ERP & POS
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      syncEntityMutation.mutate({
                        endpoint: "/shopify/sync/products",
                        payload: { store_id: activeStore?.id, mode: "push" },
                      })
                    }
                    disabled={syncEntityMutation.isPending || !activeStore}
                    className="text-xs h-9 gap-1.5 flex-1"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Push to Shopify
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Warehouse Stock Card */}
            <Card className="border-border/60 hover:shadow-sm transition-all">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600">
                      <Boxes className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Warehouse Stock Levels</CardTitle>
                      <CardDescription className="text-xs">Keep Shopify inventory aligned with warehouse</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">Push Only</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-2 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Stocky acts as the single source of truth for physical inventory. Pushes live balances to Shopify locations.
                </p>
                <div className="pt-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      syncEntityMutation.mutate({
                        endpoint: "/shopify/sync/stock",
                        payload: { store_id: activeStore?.id },
                      })
                    }
                    disabled={syncEntityMutation.isPending || !activeStore}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs h-9 gap-1.5"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncEntityMutation.isPending ? "animate-spin" : ""}`} />
                    Push Stock Levels to Shopify
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Orders Ingestion Card */}
            <Card className="border-border/60 hover:shadow-sm transition-all">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600">
                      <ShoppingCart className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Orders Ingestion</CardTitle>
                      <CardDescription className="text-xs">Import web orders into ERP Sales records</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">Pull Only</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-2 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Imports paid and unfulfilled orders, generates Sales Invoices (SO_SHOPIFY_*), and deducts warehouse stock automatically.
                </p>
                <div className="pt-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      syncEntityMutation.mutate({
                        endpoint: "/shopify/sync/orders",
                        payload: { store_id: activeStore?.id },
                      })
                    }
                    disabled={syncEntityMutation.isPending || !activeStore}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs h-9 gap-1.5"
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    Fetch & Ingest Orders
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Customers Sync Card */}
            <Card className="border-border/60 hover:shadow-sm transition-all">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Customers Directory</CardTitle>
                      <CardDescription className="text-xs">Match & import customer profiles</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">Pull Only</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-2 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Matches customers by email and phone number, creating verified accounts in your ERP CRM records.
                </p>
                <div className="pt-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      syncEntityMutation.mutate({
                        endpoint: "/shopify/sync/customers",
                        payload: { store_id: activeStore?.id },
                      })
                    }
                    disabled={syncEntityMutation.isPending || !activeStore}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs h-9 gap-1.5"
                  >
                    <Users className="w-4 h-4" />
                    Sync Customer Profiles
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==========================================
            TAB 4: LOCATIONS & MAPPINGS
        ========================================== */}
        <TabsContent value="mappings" className="space-y-6">
          <Card className="border-border/60">
            <CardHeader className="p-5 border-b border-border/40">
              <CardTitle className="text-base font-semibold">Shopify Location to Warehouse Mappings</CardTitle>
              <CardDescription className="text-xs">
                Pair each physical Shopify Fulfillment Location with your local ERP warehouse to ensure correct inventory routing.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-border/60 bg-muted/20">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Default Target Warehouse</span>
                  <p className="text-sm font-medium text-foreground mt-1">
                    {activeStore?.warehouse_name || "Main Central Warehouse (Hub A)"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All incoming Shopify sales orders deduct from this warehouse unless specific location rules are applied.
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-border/60 bg-muted/20">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">SKU Auto-Linking Status</span>
                  <p className="text-sm font-medium text-emerald-600 mt-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Active (Exact SKU & Barcode Matching)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Matches incoming Shopify line items against ERP product catalog by standard barcode/SKU strings.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==========================================
            TAB 5: LOGS & AUDIT
        ========================================== */}
        <TabsContent value="logs" className="space-y-6">
          <Card className="border-border/60">
            <CardHeader className="p-5 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-semibold">Shopify Audit & Sync Logs</CardTitle>
                <CardDescription className="text-xs">Full history of synchronization actions, API calls, and errors</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-48">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-muted-foreground" />
                  <Input
                    placeholder="Search logs..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
                <select
                  value={selectedLogLevel}
                  onChange={(e) => setSelectedLogLevel(e.target.value)}
                  className="h-8 px-2 text-xs rounded-md border border-input bg-background focus:outline-none"
                >
                  <option value="all">All Levels</option>
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => api.post("/shopify/logs/clear").then(() => refetchLogs())}
                  className="text-xs h-8 text-muted-foreground hover:text-foreground"
                >
                  Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                        No activity logs found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              log.level === "success"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : log.level === "error"
                                ? "bg-destructive/10 text-destructive border-destructive/20"
                                : log.level === "warning"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                            }
                          >
                            {log.level}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-foreground whitespace-nowrap">
                          {log.action}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.message}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ==========================================
          CONNECT / EDIT STORE MODAL
      ========================================== */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-card border border-border/60 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#008060]/10 text-[#008060]">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-base">
                    {editingStoreId ? "Edit Shopify Store" : "Connect Shopify Store"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Authenticate using your Custom App Admin API Access Token
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStore} className="p-5 space-y-4">
              {testResult && (
                <div
                  className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                    testResult.ok
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                      : "bg-destructive/10 border-destructive/20 text-destructive"
                  }`}
                >
                  {testResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  )}
                  <div>
                    <span className="font-semibold">{testResult.ok ? "Connected" : "Connection Failed"}: </span>
                    {testResult.message}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Store Display Name</Label>
                <Input
                  placeholder="e.g. Fashion Boutique Main"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="h-9 text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Shop Domain (.myshopify.com)</Label>
                <Input
                  placeholder="e.g. your-store.myshopify.com"
                  value={shopDomain}
                  onChange={(e) => setShopDomain(e.target.value)}
                  className="h-9 text-sm font-mono"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Your permanent Shopify domain from the Shopify Admin settings.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Admin API Access Token (shpat_...)</Label>
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showToken ? "Hide" : "Show"}
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showToken ? "text" : "password"}
                    placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    className="h-9 text-sm font-mono pr-9"
                    required
                  />
                  <div className="absolute right-3 top-2.5 text-muted-foreground pointer-events-none">
                    <Key className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Created in Shopify Admin → Settings → Apps and sales channels → Develop apps.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">API Version</Label>
                  <select
                    value={apiVersion}
                    onChange={(e) => setApiVersion(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background focus:outline-none"
                  >
                    <option value="2024-07">2024-07 (Stable)</option>
                    <option value="2024-10">2024-10 (Current)</option>
                    <option value="2025-01">2025-01 (Latest)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Default Warehouse</Label>
                  <select
                    value={defaultWarehouseId}
                    onChange={(e) => setDefaultWarehouseId(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background focus:outline-none"
                  >
                    <option value="">Central Warehouse (Default)</option>
                    {warehouses.map((w: any) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/30 border border-border/60 space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Automatic Sync Features
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground">Sync Products</span>
                    <Switch checked={syncProducts} onCheckedChange={setSyncProducts} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground">Sync Stock</span>
                    <Switch checked={syncStock} onCheckedChange={setSyncStock} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground">Sync Orders</span>
                    <Switch checked={syncOrders} onCheckedChange={setSyncOrders} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground">Sync Customers</span>
                    <Switch checked={syncCustomers} onCheckedChange={setSyncCustomers} />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    testConnMutation.mutate({
                      shop_domain: shopDomain,
                      access_token: accessToken,
                      api_version: apiVersion,
                    })
                  }
                  disabled={testConnMutation.isPending || !shopDomain || !accessToken}
                  className="text-xs h-9 gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testConnMutation.isPending ? "animate-spin" : ""}`} />
                  Test Connection
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsFormOpen(false)}
                    className="text-xs h-9"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={saveStoreMutation.isPending}
                    className="bg-[#008060] hover:bg-[#008060]/90 text-white text-xs h-9 font-medium"
                  >
                    {saveStoreMutation.isPending ? "Saving..." : "Save Store"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
