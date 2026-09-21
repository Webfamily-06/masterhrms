import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  SlidersHorizontal,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Warehouse as WarehouseIcon,
  Package,
  Trash2,
  Eye,
  FileSpreadsheet,
  Boxes,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { formatSystemAmount } from "@/lib/currency";

export const Route = createFileRoute("/_authenticated/_app/adjustments")({
  component: AdjustmentsPage,
});

interface AdjustmentDetail {
  id: string;
  productId: string;
  quantity: number;
  product?: {
    id: string;
    name: string;
    sku: string;
    salePrice?: number;
    purchasePrice?: number;
    unit?: string;
  };
}

interface StockAdjustment {
  id: string;
  tenantId: string;
  warehouseId: string;
  type: "addition" | "subtraction";
  reason?: string | null;
  date: string;
  createdAt: string;
  warehouse?: {
    id: string;
    name: string;
    location?: string;
  };
  details: AdjustmentDetail[];
}

interface Warehouse {
  id: string;
  name: string;
  location?: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  salePrice: number;
  purchasePrice: number;
  warehouseStocks?: { warehouseId: string; quantity: number }[];
}

const PRESET_REASONS = [
  "Physical Inventory Count Audit",
  "Damaged / Broken Warehouse Stock",
  "Expired / Perished Goods",
  "Internal Shrinkage / Missing Items",
  "Found / Recovered Surplus Inventory",
  "Packaging Defect / Discarded Goods",
  "Quality Testing Sampling",
  "Other / Discrepancy Correction",
];

function AdjustmentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState<StockAdjustment | null>(null);

  // New Adjustment Form State
  const [targetWarehouseId, setTargetWarehouseId] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"addition" | "subtraction">("subtraction");
  const [reasonCategory, setReasonCategory] = useState(PRESET_REASONS[0]);
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<{ productId: string; quantity: number }[]>([
    { productId: "", quantity: 1 },
  ]);

  // 1. Fetch Adjustments
  const { data: adjustmentsData, isLoading } = useQuery({
    queryKey: ["adjustments", selectedWarehouse, selectedType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedWarehouse !== "all") params.append("warehouseId", selectedWarehouse);
      if (selectedType !== "all") params.append("type", selectedType);

      const res = await api.get<{ data: StockAdjustment[]; metrics: any }>(`/api/adjustments?${params.toString()}`);
      return res;
    },
  });

  // 2. Fetch Warehouses
  const { data: warehouses } = useQuery<Warehouse[]>({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get<Warehouse[]>("/api/products/warehouses");
      return Array.isArray(res) ? res : [];
    },
  });

  // 3. Fetch Products for selection
  const { data: products } = useQuery<Product[]>({
    queryKey: ["products-list"],
    queryFn: async () => {
      const res = await api.get<any>("/api/products");
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  const adjustments = useMemo(() => adjustmentsData?.data || [], [adjustmentsData]);
  const metrics = adjustmentsData?.metrics;

  // Filtered adjustments
  const filteredAdjustments = useMemo(() => {
    return adjustments.filter((adj) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const reasonMatch = adj.reason?.toLowerCase().includes(q);
      const warehouseMatch = adj.warehouse?.name?.toLowerCase().includes(q);
      const itemMatch = adj.details.some(
        (d) => d.product?.name.toLowerCase().includes(q) || d.product?.sku.toLowerCase().includes(q)
      );
      return reasonMatch || warehouseMatch || itemMatch;
    });
  }, [adjustments, search]);

  // Create Adjustment Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/api/adjustments", payload);
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || "Stock adjustment recorded successfully");
      queryClient.invalidateQueries({ queryKey: ["adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-list"] });
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      setIsNewModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to record adjustment");
    },
  });

  const resetForm = () => {
    setTargetWarehouseId("");
    setAdjustmentType("subtraction");
    setReasonCategory(PRESET_REASONS[0]);
    setNotes("");
    setLineItems([{ productId: "", quantity: 1 }]);
  };

  const handleAddLineItem = () => {
    setLineItems((prev) => [...prev, { productId: "", quantity: 1 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: "productId" | "quantity", value: any) => {
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmitAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetWarehouseId) {
      toast.error("Please select a target warehouse");
      return;
    }

    const validItems = lineItems.filter((i) => i.productId && i.quantity > 0);
    if (validItems.length === 0) {
      toast.error("Please select at least one valid product and quantity");
      return;
    }

    const fullReason = notes ? `${reasonCategory}: ${notes}` : reasonCategory;

    createMutation.mutate({
      warehouseId: targetWarehouseId,
      type: adjustmentType,
      reason: fullReason,
      details: validItems,
    });
  };

  // Helper to calculate stock in selected warehouse for a product
  const getProductStockInWarehouse = (productId: string, whId: string) => {
    if (!productId || !whId || !products) return null;
    const prod = products.find((p) => p.id === productId);
    if (!prod || !prod.warehouseStocks) return null;
    const ws = prod.warehouseStocks.find((w) => w.warehouseId === whId);
    return ws ? ws.quantity : 0;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <SlidersHorizontal className="size-6 text-indigo-500" />
            Physical Stock Adjustments & Count Audits
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Reconcile physical inventory discrepancies, log damaged/expired stock, and auto-post balanced double-entry GL ledger adjustments.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => {
              resetForm();
              setIsNewModalOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-2 text-sm font-semibold"
          >
            <Plus className="size-4" />
            Record Stock Adjustment
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-xs border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Audit Entries
              </p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">
                {metrics?.totalCount ?? adjustments.length}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Physical ledger reconciliations</p>
            </div>
            <div className="size-11 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <Boxes className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Stock Additions (+)
              </p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600">
                +{metrics?.totalAddedUnits ?? 0} <span className="text-xs font-normal text-muted-foreground">units</span>
              </h3>
              <p className="text-xs text-emerald-600/90 mt-0.5">
                {metrics?.totalAdditionsCount ?? 0} surplus audit entries
              </p>
            </div>
            <div className="size-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Stock Shrinkage / Losses (-)
              </p>
              <h3 className="text-2xl font-bold mt-1 text-rose-600">
                -{metrics?.totalSubtractedUnits ?? 0} <span className="text-xs font-normal text-muted-foreground">units</span>
              </h3>
              <p className="text-xs text-rose-600/90 mt-0.5">
                {metrics?.totalSubtractionsCount ?? 0} damage & loss write-offs
              </p>
            </div>
            <div className="size-11 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <ArrowDownRight className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Valuation Impact
              </p>
              <h3 className="text-2xl font-bold mt-1 text-amber-600">
                {formatSystemAmount(metrics?.totalValuationImpact || 0)}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Auto-posted to GL account 5020</p>
            </div>
            <div className="size-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Sparkles className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="shadow-xs border-border/80">
        <CardContent className="p-3.5 flex flex-col md:flex-row items-center gap-3 justify-between">
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search reason, SKU, or warehouse..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="All Warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                {warehouses?.map((wh) => (
                  <SelectItem key={wh.id} value={wh.id}>
                    {wh.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[170px] h-9 text-sm">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="addition">Addition (+ Surplus)</SelectItem>
                <SelectItem value="subtraction">Subtraction (- Deficit)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs text-muted-foreground self-end md:self-center">
            Showing <strong className="text-foreground">{filteredAdjustments.length}</strong> adjustment records
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-xs border-border/80 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[160px]">Audit Timestamp</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reason & Audit Note</TableHead>
                <TableHead className="text-center">Items Count</TableHead>
                <TableHead className="text-right">Units Impact</TableHead>
                <TableHead className="text-right">Valuation Impact</TableHead>
                <TableHead className="w-[90px] text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="size-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      Loading stock adjustments...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredAdjustments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <SlidersHorizontal className="size-10 text-muted-foreground/40 mb-2" />
                      <p className="text-base font-semibold text-foreground">No Stock Adjustments Found</p>
                      <p className="text-xs text-muted-foreground mt-1 mb-4 text-center">
                        Perform a physical stock count audit or log damaged items to record your first inventory reconciliation.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => {
                          resetForm();
                          setIsNewModalOpen(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        <Plus className="size-3.5 mr-1" />
                        Record Stock Adjustment
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAdjustments.map((adj) => {
                  const isAdd = adj.type === "addition";
                  const totalUnits = adj.details.reduce((sum, d) => sum + (d.quantity || 0), 0);
                  const valuation = adj.details.reduce(
                    (sum, d) => sum + (d.quantity || 0) * Number(d.product?.purchasePrice || 0),
                    0
                  );

                  return (
                    <TableRow key={adj.id} className="hover:bg-muted/20">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        <div className="font-medium text-foreground">
                          {new Date(adj.createdAt || adj.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {new Date(adj.createdAt || adj.date).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5 font-medium text-sm text-foreground">
                          <WarehouseIcon className="size-3.5 text-muted-foreground shrink-0" />
                          {adj.warehouse?.name || "Unknown Warehouse"}
                        </div>
                        {adj.warehouse?.location && (
                          <span className="text-[11px] text-muted-foreground">
                            {adj.warehouse.location}
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        {isAdd ? (
                          <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-200 flex items-center gap-1 w-fit text-xs font-semibold">
                            <ArrowUpRight className="size-3 text-emerald-600" />
                            Stock Surplus (+)
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 border-rose-200 flex items-center gap-1 w-fit text-xs font-semibold">
                            <ArrowDownRight className="size-3 text-rose-600" />
                            Stock Deficit (-)
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="max-w-xs">
                        <div className="text-sm font-medium text-foreground truncate">
                          {adj.reason || "Physical Count Reconciliation"}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <span>Ref: {adj.id.slice(0, 8)}</span>
                          <span>•</span>
                          <span className="text-indigo-600">GL Auto-Posted</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs font-mono">
                          {adj.details.length} line{adj.details.length > 1 ? "s" : ""}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right font-mono font-semibold text-sm">
                        <span className={isAdd ? "text-emerald-600" : "text-rose-600"}>
                          {isAdd ? "+" : "-"}
                          {totalUnits}
                        </span>
                      </TableCell>

                      <TableCell className="text-right font-mono font-medium text-sm text-foreground">
                        {formatSystemAmount(valuation)}
                      </TableCell>

                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedAdjustment(adj)}
                          className="h-8 w-8 p-0"
                          title="View Audit Details"
                        >
                          <Eye className="size-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ================= NEW ADJUSTMENT MODAL ================= */}
      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <SlidersHorizontal className="size-5 text-indigo-600" />
              Record Physical Stock Adjustment
            </DialogTitle>
            <DialogDescription>
              Adjust warehouse balance up or down to reflect physical cycle counts, damages, or shrinkage.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAdjustment} className="space-y-4 pt-2">
            {/* Top configuration row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Target Warehouse *</Label>
                <Select value={targetWarehouseId} onValueChange={setTargetWarehouseId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses?.map((wh) => (
                      <SelectItem key={wh.id} value={wh.id}>
                        {wh.name} {wh.location ? `(${wh.location})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Adjustment Type *</Label>
                <Select
                  value={adjustmentType}
                  onValueChange={(val: any) => setAdjustmentType(val)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subtraction" className="text-rose-600 font-medium">
                      Stock Subtraction (- Shrinkage / Damage)
                    </SelectItem>
                    <SelectItem value="addition" className="text-emerald-600 font-medium">
                      Stock Addition (+ Audit Surplus / Found Goods)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Reason selector & note */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Reason Category *</Label>
                <Select value={reasonCategory} onValueChange={setReasonCategory}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Audit Remarks / Serial Reference</Label>
                <Input
                  placeholder="e.g. Broken packaging during forklift move"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Line items section */}
            <div className="border border-border/80 rounded-lg p-3 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Package className="size-3.5" />
                  Line Items for Adjustment ({lineItems.length})
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddLineItem}
                  className="h-7 text-xs flex items-center gap-1 border-dashed"
                >
                  <Plus className="size-3" />
                  Add Product
                </Button>
              </div>

              <div className="space-y-2.5">
                {lineItems.map((item, idx) => {
                  const onHand = getProductStockInWarehouse(item.productId, targetWarehouseId);
                  const selectedProd = products?.find((p) => p.id === item.productId);

                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center bg-card p-2 rounded-md border border-border/60 shadow-2xs"
                    >
                      <div className="col-span-7">
                        <Select
                          value={item.productId}
                          onValueChange={(val) => handleUpdateItem(idx, "productId", val)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select product by SKU or name" />
                          </SelectTrigger>
                          <SelectContent className="max-h-56">
                            {products?.map((p) => (
                              <SelectItem key={p.id} value={p.id} className="text-xs">
                                <span className="font-medium">{p.name}</span>{" "}
                                <span className="text-muted-foreground font-mono">({p.sku})</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {targetWarehouseId && onHand !== null && (
                          <div className="text-[11px] text-muted-foreground mt-0.5 px-1">
                            Current On-Hand in Warehouse:{" "}
                            <strong className="text-foreground font-mono">{onHand} units</strong>
                          </div>
                        )}
                      </div>

                      <div className="col-span-3">
                        <Input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateItem(idx, "quantity", parseInt(e.target.value) || 1)
                          }
                          className="h-8 text-xs text-right font-mono"
                        />
                        {selectedProd?.purchasePrice && (
                          <div className="text-[10px] text-muted-foreground mt-0.5 text-right font-mono">
                            Cost: {formatSystemAmount(Number(selectedProd.purchasePrice) * item.quantity)}
                          </div>
                        )}
                      </div>

                      <div className="col-span-2 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={lineItems.length === 1}
                          onClick={() => handleRemoveLineItem(idx)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewModalOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                {createMutation.isPending ? "Posting Adjustment..." : "Record & Post to Ledger"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= AUDIT DETAIL MODAL ================= */}
      <Dialog
        open={!!selectedAdjustment}
        onOpenChange={(open) => { if (!open) setSelectedAdjustment(null); }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="size-5 text-indigo-600" />
              Stock Adjustment Audit Passport
            </DialogTitle>
            <DialogDescription>
              Record reference: <span className="font-mono">{selectedAdjustment?.id}</span>
            </DialogDescription>
          </DialogHeader>

          {selectedAdjustment && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg text-xs">
                <div>
                  <span className="text-muted-foreground">Warehouse:</span>
                  <div className="font-semibold text-foreground text-sm mt-0.5">
                    {selectedAdjustment.warehouse?.name}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Adjustment Classification:</span>
                  <div className="mt-0.5">
                    {selectedAdjustment.type === "addition" ? (
                      <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200">
                        + Stock Addition / Surplus
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-500/10 text-rose-700 border-rose-200">
                        - Stock Subtraction / Loss
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Recorded Date:</span>
                  <div className="font-medium text-foreground mt-0.5">
                    {new Date(selectedAdjustment.createdAt || selectedAdjustment.date).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Audit Reason:</span>
                  <div className="font-medium text-foreground mt-0.5">
                    {selectedAdjustment.reason || "Physical Count Reconciliation"}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Adjusted Line Items
                </Label>
                <div className="border border-border/80 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="text-xs">Product Item</TableHead>
                        <TableHead className="text-xs">SKU</TableHead>
                        <TableHead className="text-xs text-right">Quantity</TableHead>
                        <TableHead className="text-xs text-right">Unit Cost</TableHead>
                        <TableHead className="text-xs text-right">Line Valuation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedAdjustment.details.map((item) => {
                        const cost = Number(item.product?.purchasePrice || 0);
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="text-xs font-medium">
                              {item.product?.name || "Product Item"}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground">
                              {item.product?.sku || "—"}
                            </TableCell>
                            <TableCell className="text-xs font-mono font-semibold text-right">
                              <span
                                className={
                                  selectedAdjustment.type === "addition"
                                    ? "text-emerald-600"
                                    : "text-rose-600"
                                }
                              >
                                {selectedAdjustment.type === "addition" ? "+" : "-"}
                                {item.quantity}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs font-mono text-right text-muted-foreground">
                              {formatSystemAmount(cost)}
                            </TableCell>
                            <TableCell className="text-xs font-mono font-semibold text-right">
                              {formatSystemAmount(cost * item.quantity)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* GL Double-Entry Note */}
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-lg text-xs space-y-1">
                <div className="font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-indigo-600" />
                  Automated General Ledger Double-Entry
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {selectedAdjustment.type === "addition"
                    ? "Surplus stock recorded: Debited 1040 (Merchandise Inventory) and credited 5020 (Inventory Adjustment Gain)."
                    : "Shrinkage/Damage recorded: Debited 5020 (Inventory Shrinkage & Loss) and credited 1040 (Merchandise Inventory)."}
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedAdjustment(null)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
