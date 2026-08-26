import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAddon } from "@/hooks/use-addon";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  HardDrive,
  Plus,
  Laptop,
  Monitor,
  Smartphone,
  Wrench,
  ShieldAlert,
  DollarSign,
  UserCheck,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Zap,
  Tag,
  Search,
  Filter,
  ArrowRight,
  Package,
  Layers,
  FileSpreadsheet,
  Trash2,
  CheckSquare,
  AlertTriangle,
  FileText,
  Clock,
  Printer,
  History,
  Send,
  Boxes,
  Building2,
  FolderPlus,
  QrCode,
  ExternalLink,
} from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";

export const Route = createFileRoute("/_authenticated/_app/assets")({
  component: AssetManagementPage,
  head: () => ({ meta: [{ title: "Asset Management — Master Workspace" }] }),
});

export function AssetManagementPage() {
  const queryClient = useQueryClient();
  const { isEntitled, isTrial, trialDaysLeft, startTrial, isStartingTrial, subscribe, isSubscribing } =
    useAddon("asset-management");

  const [activeTab, setActiveTab] = useState("inventory");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isDisposalModalOpen, setIsDisposalModalOpen] = useState(false);
  const [isDisposalMinutesOpen, setIsDisposalMinutesOpen] = useState(false);

  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [selectedDisposalBatch, setSelectedDisposalBatch] = useState<any>(null);

  // Forms state
  const [regForm, setRegForm] = useState({
    assetTag: "",
    name: "",
    category: "laptop",
    categoryId: "",
    brand: "",
    model: "",
    serialNumber: "",
    isBatch: false,
    totalQuantity: 1,
    unit: "pcs",
    location: "HQ Main Storage",
    purchasePrice: 0,
    purchaseDate: new Date().toISOString().slice(0, 10),
    warrantyExpiry: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    vendor: "",
    condition: "new",
    notes: "",
  });

  const [assignForm, setAssignForm] = useState({
    targetType: "employee", // employee, department, location
    employeeId: "",
    departmentId: "",
    locationName: "",
    quantity: 1,
    expectedReturnDate: "",
    conditionOnAssign: "good",
    notes: "",
  });

  const [returnForm, setReturnForm] = useState({
    returnedQuantity: 1,
    conditionOnReturn: "good",
    notes: "",
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    icon: "💻",
    prefix: "AST",
    description: "",
  });

  const [requestForm, setRequestForm] = useState({
    employeeId: "",
    categoryName: "Laptop",
    itemName: "",
    quantity: 1,
    priority: "medium",
    purpose: "",
  });

  const [disposalForm, setDisposalForm] = useState({
    title: "Q4 Equipment Write-off & Recycling",
    period: "Q4",
    justification: "Assets damaged beyond repair or obsolete.",
    selectedAssetId: "",
    quantity: 1,
    reason: "Damaged / End of life",
    bookValue: 0,
    disposalMethod: "scrap",
  });

  const [maintForm, setMaintForm] = useState({
    serviceType: "corrective",
    vendor: "",
    cost: 0,
    issueDescription: "",
    resolutionDetails: "",
  });

  // Queries
  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      try {
        const page = await api.get("/cms/pages/system-platform-settings");
        return page?.content || null;
      } catch {
        return null;
      }
    },
  });

  const { data: categoriesData, refetch: refetchCategories } = useQuery({
    queryKey: ["asset-categories"],
    queryFn: async () => {
      try {
        const res = await api.get("/addons/assets/categories");
        return res?.categories || [];
      } catch {
        return [];
      }
    },
    enabled: isEntitled,
  });

  const { data: assetsData, refetch: refetchAssets } = useQuery({
    queryKey: ["assets-list", categoryFilter, statusFilter, searchQuery],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (categoryFilter !== "all") params.append("category", categoryFilter);
        if (statusFilter !== "all") params.append("status", statusFilter);
        if (searchQuery) params.append("search", searchQuery);

        const res = await api.get(`/addons/assets?${params.toString()}`);
        return res;
      } catch {
        return { assets: [], summary: {} };
      }
    },
    enabled: isEntitled,
  });

  const { data: requestsData, refetch: refetchRequests } = useQuery({
    queryKey: ["asset-requests"],
    queryFn: async () => {
      try {
        const res = await api.get("/addons/assets/requests");
        return res?.requests || [];
      } catch {
        return [];
      }
    },
    enabled: isEntitled,
  });

  const { data: disposalsData, refetch: refetchDisposals } = useQuery({
    queryKey: ["asset-disposals"],
    queryFn: async () => {
      try {
        const res = await api.get("/addons/assets/disposals");
        return res?.batches || [];
      } catch {
        return [];
      }
    },
    enabled: isEntitled,
  });

  const { data: reportsData } = useQuery({
    queryKey: ["asset-reports"],
    queryFn: async () => {
      try {
        const res = await api.get("/addons/assets/reports");
        return res?.reports || {};
      } catch {
        return {};
      }
    },
    enabled: isEntitled && activeTab === "reports",
  });

  const { data: activityLogs = [] } = useQuery({
    queryKey: ["asset-activity-logs"],
    queryFn: async () => {
      try {
        const res = await api.get("/addons/assets/activity");
        return res?.logs || [];
      } catch {
        return [];
      }
    },
    enabled: isEntitled && activeTab === "audit",
  });

  const { data: employeesList } = useQuery({
    queryKey: ["active-employees-list"],
    queryFn: async () => {
      try {
        const res = await api.get("/employees");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: departmentsList } = useQuery({
    queryKey: ["departments-list"],
    queryFn: async () => {
      try {
        const res = await api.get("/employees/departments");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // Mutations
  const registerMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/addons/assets", regForm);
    },
    onSuccess: () => {
      toast.success("New company asset / lot registered!");
      setIsRegisterModalOpen(false);
      refetchAssets();
    },
    onError: (e: any) => toast.error(e.message || "Failed to register asset"),
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      return await api.post(`/addons/assets/${selectedAsset?.id}/allocate`, assignForm);
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || "Asset allocated!");
      setIsAssignModalOpen(false);
      refetchAssets();
    },
    onError: (e: any) => toast.error(e.message || "Failed to allocate asset"),
  });

  const returnMutation = useMutation({
    mutationFn: async () => {
      return await api.post(`/addons/assets/assignments/${selectedAssignment?.id}/return`, returnForm);
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || "Asset checked in!");
      setIsReturnModalOpen(false);
      refetchAssets();
    },
    onError: (e: any) => toast.error(e.message || "Failed to return asset"),
  });

  const createCategoryMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/addons/assets/categories", categoryForm);
    },
    onSuccess: () => {
      toast.success("Asset Category created!");
      setIsCategoryModalOpen(false);
      refetchCategories();
    },
    onError: (e: any) => toast.error(e.message || "Failed to create category"),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/addons/assets/categories/${id}`);
    },
    onSuccess: () => {
      toast.success("Category removed.");
      refetchCategories();
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete category"),
  });

  const submitRequestMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/addons/assets/requests", requestForm);
    },
    onSuccess: () => {
      toast.success("Asset request submitted for review!");
      setIsRequestModalOpen(false);
      refetchRequests();
    },
    onError: (e: any) => toast.error(e.message || "Failed to submit request"),
  });

  const reviewRequestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await api.post(`/addons/assets/requests/${id}/review`, { status });
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || "Request updated!");
      refetchRequests();
    },
    onError: (e: any) => toast.error(e.message || "Failed to update request"),
  });

  const createDisposalMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: disposalForm.title,
        period: disposalForm.period,
        justification: disposalForm.justification,
        items: [
          {
            assetId: disposalForm.selectedAssetId || assetsData?.assets?.[0]?.id,
            quantity: Number(disposalForm.quantity) || 1,
            reason: disposalForm.reason,
            bookValue: Number(disposalForm.bookValue) || 0,
            disposalMethod: disposalForm.disposalMethod,
          },
        ],
      };
      return await api.post("/addons/assets/disposals", payload);
    },
    onSuccess: () => {
      toast.success("Disposal & write-off batch created!");
      setIsDisposalModalOpen(false);
      refetchDisposals();
      refetchAssets();
    },
    onError: (e: any) => toast.error(e.message || "Failed to create disposal batch"),
  });

  const approveDisposalMutation = useMutation({
    mutationFn: async (batchId: string) => {
      return await api.post(`/addons/assets/disposals/${batchId}/approve`, {});
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || "Disposal approved and assets written off!");
      refetchDisposals();
      refetchAssets();
    },
    onError: (e: any) => toast.error(e.message || "Failed to approve disposal"),
  });

  // ─── ADDON GUARD: If Tenant is NOT subscribed / active ───
  if (!isEntitled) {
    return (
      <div className="max-w-4xl mx-auto py-8 space-y-6">
        <Card className="border-2 border-dashed border-primary/30 p-8 text-center bg-card shadow-sm space-y-6">
          <div className="size-16 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 grid place-items-center mx-auto shadow-xs">
            <HardDrive className="size-8" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <div className="flex items-center justify-center gap-2">
              <Badge variant="outline" className="text-xs uppercase font-mono tracking-wider border-blue-500/30 text-blue-600">
                Enterprise Add-on
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Hardware & IT Asset Lifecycle Management
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Track company laptops, lot batches, employee requests, multi-target allocations, write-off disposals,
              warranty alerts, and QR code handover sheets.
            </p>
          </div>

          {/* Feature List Preview */}
          <div className="grid sm:grid-cols-3 gap-3 max-w-2xl mx-auto text-left text-xs">
            <div className="p-3 rounded-xl border bg-muted/20 space-y-1">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Boxes className="size-3.5 text-blue-500" /> Batch / Lot Assets
              </span>
              <p className="text-[11px] text-muted-foreground">
                One record, multiple units (e.g. 50 chairs) with live quantity reconciliation.
              </p>
            </div>
            <div className="p-3 rounded-xl border bg-muted/20 space-y-1">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Send className="size-3.5 text-emerald-500" /> Employee Requests
              </span>
              <p className="text-[11px] text-muted-foreground">
                Self-service equipment requests, 4 priorities, and 1-click admin fulfillment.
              </p>
            </div>
            <div className="p-3 rounded-xl border bg-muted/20 space-y-1">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Trash2 className="size-3.5 text-rose-500" /> Write-Off Disposals
              </span>
              <p className="text-[11px] text-muted-foreground">
                Formal write-off batches, separation-of-duty approvals, and printable minutes.
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => startTrial()}
              disabled={isStartingTrial}
              className="gap-2 text-xs font-bold h-9 shadow-sm"
            >
              <Zap className="size-3.5" />
              <span>Start 14-Day Free Trial</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => subscribe("pro_annual")}
              disabled={isSubscribing}
              className="gap-2 text-xs font-semibold h-9 shadow-2xs"
            >
              <span>Subscribe ($39/mo)</span>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const assets = assetsData?.assets || [];
  const summary = assetsData?.summary || {};
  const requests = requestsData || [];
  const categories = categoriesData || [];
  const disposals = disposalsData || [];

  return (
    <div className="space-y-5 max-w-full pb-8">
      {/* ─── 1. COMPACT ENTERPRISE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
              <HardDrive className="size-4.5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Asset Management Suite</h1>
            <Badge variant="outline" className="text-[10px] font-mono border-blue-500/30 text-blue-600 bg-blue-500/5">
              {isTrial ? "Trial Active" : "Add-on Active"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Single & batch assets, employee requests, multi-target allocations, write-off disposals, and QR sheets.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsRequestModalOpen(true)}
            className="gap-1.5 text-xs font-semibold h-8 shadow-2xs"
          >
            <Send className="size-3.5 text-emerald-500" />
            <span>Request Asset</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsCategoryModalOpen(true)}
            className="gap-1.5 text-xs font-semibold h-8 shadow-2xs"
          >
            <FolderPlus className="size-3.5 text-indigo-500" />
            <span>Categories</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setIsRegisterModalOpen(true)}
            className="gap-1.5 text-xs font-semibold h-8 shadow-2xs"
          >
            <Plus className="size-3.5" />
            <span>Register Asset / Batch</span>
          </Button>
        </div>
      </div>

      {/* ─── 2. COMPACT 4-COLUMN KPI ROW ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="p-3.5 border shadow-2xs bg-card hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Total Assets & Lots
            </span>
            <div className="size-7 rounded-lg bg-blue-500/10 text-blue-600 grid place-items-center">
              <HardDrive className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black tracking-tight text-foreground">
              {summary.totalAssets ?? 0}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">
              Valuation: {formatSystemAmount(summary.totalValuation ?? 0, sysConfig)}
            </span>
          </div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Allocated / In Use
            </span>
            <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 grid place-items-center">
              <UserCheck className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black tracking-tight text-foreground">
              {summary.assignedCount ?? 0}
            </span>
            <span className="text-[11px] font-medium text-emerald-600">
              Active Handouts
            </span>
          </div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Available in Stock
            </span>
            <div className="size-7 rounded-lg bg-indigo-500/10 text-indigo-600 grid place-items-center">
              <Package className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black tracking-tight text-foreground">
              {summary.availableCount ?? 0}
            </span>
            <span className="text-[11px] font-medium text-indigo-600">
              Ready to Issue
            </span>
          </div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Pending Requests
            </span>
            <div className="size-7 rounded-lg bg-amber-500/10 text-amber-600 grid place-items-center">
              <Clock className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black tracking-tight text-foreground">
              {requests.filter((r: any) => r.status === "pending").length}
            </span>
            <span className="text-[11px] font-medium text-amber-600">
              Needs Approval
            </span>
          </div>
        </Card>
      </div>

      {/* ─── 3. ENTERPRISE SUB-TABS ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/40 h-8 p-0.5 overflow-x-auto flex-nowrap max-w-full">
          <TabsTrigger value="inventory" className="text-xs h-7">
            Inventory ({assets.length})
          </TabsTrigger>
          <TabsTrigger value="requests" className="text-xs h-7">
            Requests ({requests.length})
          </TabsTrigger>
          <TabsTrigger value="categories" className="text-xs h-7">
            Categories ({categories.length})
          </TabsTrigger>
          <TabsTrigger value="disposals" className="text-xs h-7">
            Disposals & Write-Offs ({disposals.length})
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-xs h-7">
            4 Operational Reports
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-xs h-7">
            Audit Log
          </TabsTrigger>
        </TabsList>

        {/* ===================== TAB 1: ASSET INVENTORY ===================== */}
        <TabsContent value="inventory" className="space-y-3">
          {/* Search & Filters */}
          <Card className="p-3 border shadow-2xs bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search tag, name, serial, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-8 text-xs w-36">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.slug}>
                      {c.icon} {c.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="laptop">Laptops</SelectItem>
                  <SelectItem value="desktop">Desktops</SelectItem>
                  <SelectItem value="furniture">Furniture</SelectItem>
                  <SelectItem value="license">Licenses</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="disposed">Disposed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Assets Table with Live Quantity Reconciliation */}
          <Card className="p-4 border shadow-2xs bg-card space-y-3">
            <div className="flex items-center justify-between border-b pb-2.5">
              <h3 className="font-bold text-sm text-foreground">Registered Assets & Batches</h3>
              <span className="text-xs text-muted-foreground font-mono">{assets.length} Records</span>
            </div>

            {assets.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground font-semibold text-[11px]">
                      <th className="pb-2 text-left">Asset Tag</th>
                      <th className="pb-2 text-left">Equipment / Model</th>
                      <th className="pb-2 text-left">Category</th>
                      <th className="pb-2 text-left">Qty (Stock / Total)</th>
                      <th className="pb-2 text-left">Custodian / Allocations</th>
                      <th className="pb-2 text-left">Location</th>
                      <th className="pb-2 text-left">Status</th>
                      <th className="pb-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {assets.map((ast: any) => (
                      <tr key={ast.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 font-mono font-bold text-primary">
                          <Link
                            to="/a/$tag"
                            params={{ tag: ast.assetTag }}
                            target="_blank"
                            className="hover:underline flex items-center gap-1"
                          >
                            <span>{ast.assetTag}</span>
                            <ExternalLink className="size-2.5 text-muted-foreground opacity-60" />
                          </Link>
                        </td>
                        <td className="py-2.5 font-semibold text-foreground">
                          <div className="space-y-0.5">
                            <span>{ast.name}</span>
                            {ast.serialNumber && (
                              <span className="text-[10px] text-muted-foreground font-mono block">
                                SN: {ast.serialNumber}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 capitalize text-muted-foreground">
                          {ast.categoryRel?.name || ast.category}
                        </td>
                        <td className="py-2.5 font-mono">
                          {ast.isBatch ? (
                            <Badge variant="outline" className="text-[10px] font-bold border-indigo-500/30 text-indigo-600 bg-indigo-500/5">
                              {ast.availableQuantity} / {ast.totalQuantity} {ast.unit} (Batch)
                            </Badge>
                          ) : (
                            <span className="text-[11px] font-medium">1 Unit</span>
                          )}
                        </td>
                        <td className="py-2.5">
                          {ast.assignedEmployee ? (
                            <span className="font-semibold text-foreground">
                              {ast.assignedEmployee.firstName} {ast.assignedEmployee.lastName}
                            </span>
                          ) : ast.assignments?.length > 0 ? (
                            <span className="text-[11px] text-muted-foreground">
                              {ast.assignments.length} Allocation(s)
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">— In Stock —</span>
                          )}
                        </td>
                        <td className="py-2.5 text-muted-foreground truncate max-w-xs">
                          {ast.location || "Main Storage"}
                        </td>
                        <td className="py-2.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] capitalize ${
                              ast.status === "available"
                                ? "border-indigo-500/30 text-indigo-600 bg-indigo-500/10"
                                : ast.status === "assigned"
                                ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                                : ast.status === "maintenance"
                                ? "border-amber-500/30 text-amber-600 bg-amber-500/10"
                                : "text-rose-600 border-rose-500/30 bg-rose-500/10"
                            }`}
                          >
                            {ast.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-right space-x-1">
                          {ast.availableQuantity > 0 ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedAsset(ast);
                                setAssignForm({
                                  targetType: "employee",
                                  employeeId: "",
                                  departmentId: "",
                                  locationName: "",
                                  quantity: 1,
                                  expectedReturnDate: "",
                                  conditionOnAssign: "good",
                                  notes: "",
                                });
                                setIsAssignModalOpen(true);
                              }}
                              className="h-6 text-[10px] px-2 font-bold shadow-2xs"
                            >
                              Allocate
                            </Button>
                          ) : null}

                          {ast.assignments?.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedAssignment(ast.assignments[0]);
                                setReturnForm({
                                  returnedQuantity: ast.assignments[0]?.quantity || 1,
                                  conditionOnReturn: "good",
                                  notes: "",
                                });
                                setIsReturnModalOpen(true);
                              }}
                              className="h-6 text-[10px] px-2 font-bold text-amber-600 shadow-2xs"
                            >
                              Return
                            </Button>
                          )}

                          <Link
                            to="/a/$tag"
                            params={{ tag: ast.assetTag }}
                            target="_blank"
                            className="inline-flex items-center justify-center size-6 rounded-md hover:bg-muted text-muted-foreground"
                          >
                            <QrCode className="size-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <Package className="size-8 text-muted-foreground/40 mx-auto" />
                <p className="text-xs text-muted-foreground">No assets found matching current filters.</p>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ===================== TAB 2: EMPLOYEE REQUESTS & APPROVALS ===================== */}
        <TabsContent value="requests" className="space-y-3">
          <Card className="p-4 border shadow-2xs bg-card space-y-3">
            <div className="flex items-center justify-between border-b pb-2.5">
              <div>
                <h3 className="font-bold text-sm text-foreground">Employee Equipment Requests</h3>
                <p className="text-[11px] text-muted-foreground">
                  Review staff submissions, prioritize urgencies, and fulfill with 1-click allocation.
                </p>
              </div>
              <Button size="sm" onClick={() => setIsRequestModalOpen(true)} className="h-7 text-xs font-bold shadow-2xs">
                <Plus className="size-3.5 mr-1" /> New Request
              </Button>
            </div>

            {requests.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground font-semibold text-[11px]">
                      <th className="pb-2 text-left">Staff Member</th>
                      <th className="pb-2 text-left">Item Requested</th>
                      <th className="pb-2 text-left">Qty</th>
                      <th className="pb-2 text-left">Priority</th>
                      <th className="pb-2 text-left">Business Justification</th>
                      <th className="pb-2 text-left">Status</th>
                      <th className="pb-2 text-right">Approval Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {requests.map((req: any) => (
                      <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 font-semibold text-foreground">
                          {req.employee?.firstName} {req.employee?.lastName}
                          <span className="text-[10px] text-muted-foreground block font-normal">
                            {req.employee?.department?.name || "General"}
                          </span>
                        </td>
                        <td className="py-2.5 font-medium text-foreground">
                          {req.itemName}
                        </td>
                        <td className="py-2.5 font-mono">{req.quantity}</td>
                        <td className="py-2.5">
                          <Badge
                            className={`text-[9px] uppercase font-bold ${
                              req.priority === "urgent"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                : req.priority === "high"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {req.priority}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-muted-foreground truncate max-w-xs">
                          {req.purpose}
                        </td>
                        <td className="py-2.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] capitalize ${
                              req.status === "pending"
                                ? "border-amber-500/30 text-amber-600 bg-amber-500/10"
                                : req.status === "approved" || req.status === "fulfilled"
                                ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                                : "border-rose-500/30 text-rose-600 bg-rose-500/10"
                            }`}
                          >
                            {req.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-right space-x-1">
                          {req.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => reviewRequestMutation.mutate({ id: req.id, status: "approved" })}
                                className="h-6 text-[10px] px-2 font-bold text-emerald-600 shadow-2xs"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => reviewRequestMutation.mutate({ id: req.id, status: "rejected" })}
                                className="h-6 text-[10px] px-2 text-rose-600"
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {req.status === "approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                reviewRequestMutation.mutate({ id: req.id, status: "fulfilled" });
                              }}
                              className="h-6 text-[10px] px-2 font-bold text-indigo-600 shadow-2xs"
                            >
                              Fulfill
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <Send className="size-8 text-muted-foreground/40 mx-auto" />
                <p className="text-xs text-muted-foreground">No staff asset requests submitted.</p>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ===================== TAB 3: CATEGORY MANAGER ===================== */}
        <TabsContent value="categories" className="space-y-3">
          <Card className="p-4 border shadow-2xs bg-card space-y-3">
            <div className="flex items-center justify-between border-b pb-2.5">
              <div>
                <h3 className="font-bold text-sm text-foreground">Asset Categories & Tag Prefixes</h3>
                <p className="text-[11px] text-muted-foreground">
                  Configure custom categories, icons, and automated barcode/tag prefixes.
                </p>
              </div>
              <Button size="sm" onClick={() => setIsCategoryModalOpen(true)} className="h-7 text-xs font-bold shadow-2xs">
                <Plus className="size-3.5 mr-1" /> Add Category
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categories.map((cat: any) => (
                <div key={cat.id} className="p-3.5 rounded-xl border bg-muted/20 space-y-2 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{cat.icon || "💻"}</span>
                      <div>
                        <span className="font-bold text-xs text-foreground block">{cat.name}</span>
                        <Badge variant="outline" className="text-[9px] font-mono border-primary/30 text-primary">
                          Prefix: {cat.prefix}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteCategoryMutation.mutate(cat.id)}
                      className="size-7 p-0 text-muted-foreground hover:text-rose-600"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    {cat.description || "Category registered for enterprise asset classification."}
                  </p>
                  <div className="text-[10px] text-muted-foreground font-mono pt-1 border-t">
                    {cat._count?.assets || 0} Registered Assets
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* ===================== TAB 4: DISPOSALS & WRITE-OFFS ===================== */}
        <TabsContent value="disposals" className="space-y-3">
          <Card className="p-4 border shadow-2xs bg-card space-y-3">
            <div className="flex items-center justify-between border-b pb-2.5">
              <div>
                <h3 className="font-bold text-sm text-foreground">Formal Write-Off & Disposal Batches</h3>
                <p className="text-[11px] text-muted-foreground">
                  Quarterly/yearly compliance write-offs, separation-of-duty approvals, and printable disposal minutes.
                </p>
              </div>
              <Button size="sm" onClick={() => setIsDisposalModalOpen(true)} className="h-7 text-xs font-bold shadow-2xs">
                <Plus className="size-3.5 mr-1" /> New Write-off Batch
              </Button>
            </div>

            {disposals.length > 0 ? (
              <div className="space-y-3">
                {disposals.map((batch: any) => (
                  <div key={batch.id} className="p-4 rounded-xl border bg-card space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs font-bold text-rose-600 border-rose-500/30">
                            {batch.batchNumber}
                          </Badge>
                          <Badge className="text-[10px] uppercase font-mono">
                            {batch.period}
                          </Badge>
                          <h4 className="font-bold text-sm text-foreground">{batch.title}</h4>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Justification: {batch.justification || "End of life write-off"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedDisposalBatch(batch);
                            setIsDisposalMinutesOpen(true);
                          }}
                          className="h-7 text-xs gap-1 shadow-2xs font-semibold"
                        >
                          <Printer className="size-3" />
                          <span>Disposal Minutes</span>
                        </Button>

                        {batch.status === "draft" && (
                          <Button
                            size="sm"
                            onClick={() => approveDisposalMutation.mutate(batch.id)}
                            className="h-7 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-2xs"
                          >
                            Approve & Write-off
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Batch Items list */}
                    <div className="grid gap-2 text-xs">
                      {batch.items?.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 text-xs">
                          <span className="font-semibold text-foreground">
                            {item.asset?.assetTag} · {item.asset?.name}
                          </span>
                          <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
                            <span>Qty: {item.quantity}</span>
                            <span>Book Value: {formatSystemAmount(item.bookValue, sysConfig)}</span>
                            <Badge variant="secondary" className="text-[9px] uppercase">
                              {item.disposalMethod}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <Trash2 className="size-8 text-muted-foreground/40 mx-auto" />
                <p className="text-xs text-muted-foreground">No write-off disposal batches registered.</p>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ===================== TAB 5: OPERATIONAL REPORTS ===================== */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="p-3 border shadow-2xs bg-card space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">1. Employee Assignments</span>
              <span className="text-xl font-bold text-foreground block">
                {reportsData?.employeeAssignments?.length ?? 0} Active
              </span>
              <span className="text-[10px] text-muted-foreground">Personal staff checkouts</span>
            </Card>

            <Card className="p-3 border shadow-2xs bg-card space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">2. Department Distribution</span>
              <span className="text-xl font-bold text-foreground block">
                {reportsData?.departmentAssignments?.length ?? 0} Allocations
              </span>
              <span className="text-[10px] text-muted-foreground">Team & room allocations</span>
            </Card>

            <Card className="p-3 border shadow-2xs bg-card space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">3. Total Reconciliation</span>
              <span className="text-xl font-bold text-foreground block">
                {reportsData?.inventoryReconciliation?.length ?? 0} Assets
              </span>
              <span className="text-[10px] text-muted-foreground">Single & batch lots</span>
            </Card>

            <Card className="p-3 border shadow-2xs bg-card space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">4. Damaged / In Repair</span>
              <span className="text-xl font-bold text-rose-600 block">
                {reportsData?.maintenanceAndDamaged?.length ?? 0} Units
              </span>
              <span className="text-[10px] text-muted-foreground">Under service tickets</span>
            </Card>
          </div>

          <Card className="p-4 border shadow-2xs bg-card space-y-3">
            <div className="flex items-center justify-between border-b pb-2.5">
              <h3 className="font-bold text-sm text-foreground">Active Custodian & Employee Handover Report</h3>
              <Button size="sm" variant="outline" onClick={() => window.print()} className="h-7 text-xs gap-1 font-bold shadow-2xs">
                <Printer className="size-3" />
                <span>Export / Print Report</span>
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground font-semibold text-[11px]">
                    <th className="pb-2 text-left">Staff Name</th>
                    <th className="pb-2 text-left">Department</th>
                    <th className="pb-2 text-left">Asset Tag</th>
                    <th className="pb-2 text-left">Equipment Name</th>
                    <th className="pb-2 text-left">Assigned Date</th>
                    <th className="pb-2 text-left">Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {reportsData?.employeeAssignments?.map((a: any) => (
                    <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 font-semibold text-foreground">
                        {a.employee?.firstName} {a.employee?.lastName}
                      </td>
                      <td className="py-2 text-muted-foreground">{a.employee?.department?.name || "General"}</td>
                      <td className="py-2 font-mono font-bold text-primary">{a.asset?.assetTag}</td>
                      <td className="py-2 text-foreground font-medium">{a.asset?.name}</td>
                      <td className="py-2 font-mono text-muted-foreground">
                        {new Date(a.assignedAt).toLocaleDateString()}
                      </td>
                      <td className="py-2 capitalize font-bold text-emerald-600">{a.conditionOnAssign}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ===================== TAB 6: AUDIT LOG ===================== */}
        <TabsContent value="audit" className="space-y-3">
          <Card className="p-4 border shadow-2xs bg-card space-y-3">
            <h3 className="font-bold text-sm text-foreground border-b pb-2.5">Asset Operations Audit Trail</h3>

            {activityLogs.length > 0 ? (
              <div className="space-y-2">
                {activityLogs.map((log: any) => (
                  <div key={log.id} className="p-2.5 rounded-xl border bg-muted/20 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="size-2 rounded-full bg-primary" />
                      <div>
                        <span className="font-semibold text-foreground">{log.details}</span>
                        <span className="text-[10px] text-muted-foreground font-mono block">
                          By: {log.performedBy || "System"} · Action: {log.actionType}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No recent activity logged.
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── MODAL 1: Register Single / Batch Asset ─── */}
      <Dialog open={isRegisterModalOpen} onOpenChange={setIsRegisterModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Register Equipment / Batch Lot</DialogTitle>
            <DialogDescription className="text-xs">
              Add individual devices or multi-unit batch lots with quantity reconciliation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Asset Tag (Leave blank to auto-generate)</Label>
                <Input
                  placeholder="e.g. AST-MAC-042"
                  value={regForm.assetTag}
                  onChange={(e) => setRegForm({ ...regForm, assetTag: e.target.value })}
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Category</Label>
                <Select
                  value={regForm.category}
                  onValueChange={(v) => setRegForm({ ...regForm, category: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.slug}>
                        {c.icon} {c.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="laptop">Laptop</SelectItem>
                    <SelectItem value="desktop">Desktop</SelectItem>
                    <SelectItem value="monitor">Monitor</SelectItem>
                    <SelectItem value="furniture">Furniture</SelectItem>
                    <SelectItem value="license">Software License</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Equipment / Item Name *</Label>
              <Input
                placeholder="e.g. Ergonomic Office Mesh Chair"
                value={regForm.name}
                onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            {/* Batch Toggle & Quantity */}
            <div className="p-2.5 rounded-xl border bg-muted/20 grid grid-cols-3 gap-2 items-center">
              <div className="flex items-center gap-2 col-span-1">
                <input
                  type="checkbox"
                  id="isBatchCheckbox"
                  checked={regForm.isBatch}
                  onChange={(e) => setRegForm({ ...regForm, isBatch: e.target.checked })}
                  className="size-4 text-primary rounded"
                />
                <Label htmlFor="isBatchCheckbox" className="text-xs font-bold cursor-pointer">
                  Batch / Lot
                </Label>
              </div>

              {regForm.isBatch ? (
                <>
                  <div className="space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground font-semibold">Total Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={regForm.totalQuantity}
                      onChange={(e) => setRegForm({ ...regForm, totalQuantity: Number(e.target.value) })}
                      className="h-7 text-xs font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground font-semibold">Unit (pcs, boxes)</Label>
                    <Input
                      value={regForm.unit}
                      onChange={(e) => setRegForm({ ...regForm, unit: e.target.value })}
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                </>
              ) : (
                <div className="col-span-2 space-y-0.5">
                  <Label className="text-[10px] text-muted-foreground font-semibold">Serial Number</Label>
                  <Input
                    placeholder="e.g. SN-894123"
                    value={regForm.serialNumber}
                    onChange={(e) => setRegForm({ ...regForm, serialNumber: e.target.value })}
                    className="h-7 text-xs font-mono"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Storage Location</Label>
                <Input
                  placeholder="e.g. HQ Floor 3 / Room 302"
                  value={regForm.location}
                  onChange={(e) => setRegForm({ ...regForm, location: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Purchase Price (Per Unit)</Label>
                <Input
                  type="number"
                  placeholder="150"
                  value={regForm.purchasePrice}
                  onChange={(e) => setRegForm({ ...regForm, purchasePrice: Number(e.target.value) })}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setIsRegisterModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => registerMutation.mutate()}
              disabled={registerMutation.isPending || !regForm.name}
              className="text-xs font-bold shadow-2xs"
            >
              Register Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: Allocate Asset / Batch ─── */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Allocate Asset / Handover</DialogTitle>
            <DialogDescription className="text-xs">
              Checkout single asset or batch units to Employee, Department, or Location.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-2.5 rounded-xl border bg-muted/20 space-y-0.5">
              <span className="font-bold text-foreground block">{selectedAsset?.name}</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                Available Stock: {selectedAsset?.availableQuantity} / {selectedAsset?.totalQuantity} {selectedAsset?.unit}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Target Type</Label>
                <Select
                  value={assignForm.targetType}
                  onValueChange={(v) => setAssignForm({ ...assignForm, targetType: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Staff Employee</SelectItem>
                    <SelectItem value="department">Department / Team</SelectItem>
                    <SelectItem value="location">Office Location</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Allocation Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  max={selectedAsset?.availableQuantity || 1}
                  value={assignForm.quantity}
                  onChange={(e) => setAssignForm({ ...assignForm, quantity: Number(e.target.value) })}
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>
            </div>

            {assignForm.targetType === "employee" && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Assign to Employee</Label>
                <Select
                  value={assignForm.employeeId}
                  onValueChange={(v) => setAssignForm({ ...assignForm, employeeId: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Staff Member" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeesList?.map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.position || "Staff"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {assignForm.targetType === "department" && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Target Department</Label>
                <Select
                  value={assignForm.departmentId}
                  onValueChange={(v) => setAssignForm({ ...assignForm, departmentId: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentsList?.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {assignForm.targetType === "location" && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Location / Room Name</Label>
                <Input
                  placeholder="e.g. Conference Room B"
                  value={assignForm.locationName}
                  onChange={(e) => setAssignForm({ ...assignForm, locationName: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setIsAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => assignMutation.mutate()}
              disabled={assignMutation.isPending}
              className="text-xs font-bold shadow-2xs"
            >
              Confirm Allocation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: Return Asset ─── */}
      <Dialog open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Process Return / Check-in</DialogTitle>
            <DialogDescription className="text-xs">
              Check in items back into available inventory with condition verification.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Return Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={returnForm.returnedQuantity}
                  onChange={(e) => setReturnForm({ ...returnForm, returnedQuantity: Number(e.target.value) })}
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Returned Condition</Label>
                <Select
                  value={returnForm.conditionOnReturn}
                  onValueChange={(v) => setReturnForm({ ...returnForm, conditionOnReturn: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Good / Undamaged</SelectItem>
                    <SelectItem value="fair">Fair / Used</SelectItem>
                    <SelectItem value="damaged">Damaged / Needs Repair</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setIsReturnModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => returnMutation.mutate()}
              disabled={returnMutation.isPending}
              className="text-xs font-bold text-amber-600 shadow-2xs"
            >
              Check in Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 4: Create Category ─── */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Add Asset Category</DialogTitle>
            <DialogDescription className="text-xs">
              Create category with custom emoji/icon and tag prefix.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs font-semibold">Category Name *</Label>
                <Input
                  placeholder="e.g. Ergonomic Furniture"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tag Prefix</Label>
                <Input
                  placeholder="FUR"
                  value={categoryForm.prefix}
                  onChange={(e) => setCategoryForm({ ...categoryForm, prefix: e.target.value.toUpperCase() })}
                  className="h-8 text-xs font-mono uppercase font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Emoji / Icon</Label>
              <Input
                placeholder="🪑"
                value={categoryForm.icon}
                onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setIsCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => createCategoryMutation.mutate()}
              disabled={createCategoryMutation.isPending || !categoryForm.name}
              className="text-xs font-bold shadow-2xs"
            >
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 5: Employee Request Asset ─── */}
      <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Submit Asset Request</DialogTitle>
            <DialogDescription className="text-xs">
              Request equipment, workstation accessories, or software licenses.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Requesting Staff Member *</Label>
              <Select
                value={requestForm.employeeId}
                onValueChange={(v) => setRequestForm({ ...requestForm, employeeId: v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select Staff" />
                </SelectTrigger>
                <SelectContent>
                  {employeesList?.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.position || "Staff"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Item / Model Name *</Label>
                <Input
                  placeholder="e.g. Dell 27-inch 4K Monitor"
                  value={requestForm.itemName}
                  onChange={(e) => setRequestForm({ ...requestForm, itemName: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Urgency / Priority</Label>
                <Select
                  value={requestForm.priority}
                  onValueChange={(v) => setRequestForm({ ...requestForm, priority: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Business Justification & Purpose *</Label>
              <Textarea
                placeholder="Explain why this equipment is needed for work projects..."
                value={requestForm.purpose}
                onChange={(e) => setRequestForm({ ...requestForm, purpose: e.target.value })}
                rows={2}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setIsRequestModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => submitRequestMutation.mutate()}
              disabled={submitRequestMutation.isPending || !requestForm.employeeId || !requestForm.itemName}
              className="text-xs font-bold shadow-2xs"
            >
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 6: Create Disposal Batch ─── */}
      <Dialog open={isDisposalModalOpen} onOpenChange={setIsDisposalModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Create Write-Off Disposal Batch</DialogTitle>
            <DialogDescription className="text-xs">
              Initiate formal asset disposal for audit and depreciation sign-off.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Batch Title</Label>
                <Input
                  value={disposalForm.title}
                  onChange={(e) => setDisposalForm({ ...disposalForm, title: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Disposal Period</Label>
                <Select
                  value={disposalForm.period}
                  onValueChange={(v) => setDisposalForm({ ...disposalForm, period: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Q1">Q1 Audit</SelectItem>
                    <SelectItem value="Q2">Q2 Audit</SelectItem>
                    <SelectItem value="Q3">Q3 Audit</SelectItem>
                    <SelectItem value="Q4">Q4 Audit</SelectItem>
                    <SelectItem value="Yearly">Annual Review</SelectItem>
                    <SelectItem value="Ad-hoc">Ad-hoc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Select Asset to Write Off</Label>
              <Select
                value={disposalForm.selectedAssetId}
                onValueChange={(v) => setDisposalForm({ ...disposalForm, selectedAssetId: v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select Equipment..." />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((ast: any) => (
                    <SelectItem key={ast.id} value={ast.id}>
                      {ast.assetTag} · {ast.name} (Stock: {ast.availableQuantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setIsDisposalModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => createDisposalMutation.mutate()}
              disabled={createDisposalMutation.isPending}
              className="text-xs font-bold text-rose-600 shadow-2xs"
            >
              Create Write-off Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 7: Printable Disposal Minutes PDF Sheet ─── */}
      <Dialog open={isDisposalMinutesOpen} onOpenChange={setIsDisposalMinutesOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Printer className="size-4 text-primary" />
              <span>Asset Disposal Minutes of Meeting</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs border p-4 rounded-xl bg-card">
            <div className="flex justify-between border-b pb-2">
              <div>
                <h4 className="font-bold text-foreground">{selectedDisposalBatch?.title}</h4>
                <span className="font-mono text-[11px] text-muted-foreground block">
                  Batch Ref: {selectedDisposalBatch?.batchNumber}
                </span>
              </div>
              <Badge variant="outline" className="font-mono text-xs text-rose-600">
                {selectedDisposalBatch?.status?.toUpperCase()}
              </Badge>
            </div>

            <p className="text-muted-foreground text-[11px]">
              <span className="font-semibold text-foreground">Justification: </span>
              {selectedDisposalBatch?.justification || "Equipment reached end-of-life and deemed unrepairable."}
            </p>

            <div className="space-y-1">
              <span className="font-bold text-foreground uppercase text-[10px]">Scrapped / Disposed Assets</span>
              <div className="divide-y divide-border border rounded-lg overflow-hidden">
                {selectedDisposalBatch?.items?.map((it: any) => (
                  <div key={it.id} className="p-2 flex justify-between text-[11px] bg-muted/10">
                    <span>{it.asset?.assetTag} · {it.asset?.name}</span>
                    <span className="font-mono font-semibold text-foreground">Qty: {it.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-dashed">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase block font-semibold">
                  IT Asset Committee Sign-off
                </span>
                <span className="text-xs font-semibold">Signature: ____________________</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase block font-semibold">
                  Finance / Audit Sign-off
                </span>
                <span className="text-xs font-semibold">Signature: ____________________</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setIsDisposalMinutesOpen(false)}>
              Close
            </Button>
            <Button size="sm" onClick={() => window.print()} className="text-xs font-bold gap-1 shadow-2xs">
              <Printer className="size-3.5" />
              <span>Print Minutes PDF</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
