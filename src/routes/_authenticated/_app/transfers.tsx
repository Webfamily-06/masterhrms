import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  ArrowRightLeft,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Warehouse as WarehouseIcon,
  AlertCircle,
  Package,
  Trash2,
  Eye,
  Check,
  Ban,
  Boxes,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/transfers")({
  component: TransfersPage,
});

interface TransferDetail {
  id: string;
  productId: string;
  quantity: number;
  product?: {
    id: string;
    name: string;
    sku: string;
    salePrice: number;
    purchasePrice: number;
  };
}

interface StockTransfer {
  id: string;
  transferNo: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  status: "pending" | "approved" | "in_transit" | "completed" | "rejected";
  notes?: string | null;
  createdAt: string;
  fromWarehouse?: { id: string; name: string; location?: string };
  toWarehouse?: { id: string; name: string; location?: string };
  details: TransferDetail[];
}

interface Warehouse {
  id: string;
  name: string;
  location?: string;
  isDefault?: boolean;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  salePrice: number;
  warehouseStocks?: { warehouseId: string; quantity: number }[];
}

export default function TransfersPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);

  // New transfer form state
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [transferItems, setTransferItems] = useState<{ productId: string; quantity: number }[]>([
    { productId: "", quantity: 1 },
  ]);

  // 1. Fetch Transfers
  const { data: transfersRes, isLoading: transfersLoading } = useQuery({
    queryKey: ["stock-transfers", statusFilter],
    queryFn: async () => {
      const url = statusFilter && statusFilter !== "all" ? `/api/transfers?status=${statusFilter}` : "/api/transfers";
      const res = await api.get<{ data: StockTransfer[] }>(url);
      return res.data || [];
    },
  });
  const transfers: StockTransfer[] = transfersRes || [];

  // 2. Fetch Warehouses
  const { data: warehousesRes } = useQuery({
    queryKey: ["warehouses-list"],
    queryFn: async () => {
      const res = await api.get<{ data: Warehouse[] } | Warehouse[]>("/api/products/warehouses");
      return Array.isArray(res) ? res : res.data || [];
    },
  });
  const warehouses: Warehouse[] = warehousesRes || [];

  // 3. Fetch Products
  const { data: productsRes } = useQuery({
    queryKey: ["products-for-transfer"],
    queryFn: async () => {
      const res = await api.get<{ data: Product[] } | Product[]>("/api/products");
      return Array.isArray(res) ? res : res.data || [];
    },
  });
  const products: Product[] = productsRes || [];

  // 4. Fetch Warehouse Summary
  const { data: summaryRes } = useQuery({
    queryKey: ["transfers-warehouse-summary"],
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>("/api/transfers/warehouses/summary");
      return res.data || [];
    },
  });
  const warehouseSummaries = summaryRes || [];

  // Mutations
  const createTransferMutation = useMutation({
    mutationFn: async (payload: {
      fromWarehouseId: string;
      toWarehouseId: string;
      notes: string;
      items: { productId: string; quantity: number }[];
    }) => {
      const res = await api.post("/api/transfers", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Stock transfer order submitted successfully!");
      setIsCreateOpen(false);
      resetCreateForm();
      queryClient.invalidateQueries({ queryKey: ["stock-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["transfers-warehouse-summary"] });
      queryClient.invalidateQueries({ queryKey: ["products-for-transfer"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to create transfer");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.patch(`/api/transfers/${id}/status`, { status });
      return res.data;
    },
    onSuccess: (_, variables) => {
      toast.success(`Transfer status updated to ${variables.status.replace("_", " ").toUpperCase()}`);
      if (selectedTransfer && selectedTransfer.id === variables.id) {
        setSelectedTransfer(null);
      }
      queryClient.invalidateQueries({ queryKey: ["stock-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["transfers-warehouse-summary"] });
      queryClient.invalidateQueries({ queryKey: ["products-for-transfer"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to update transfer status");
    },
  });

  const resetCreateForm = () => {
    setFromWarehouseId("");
    setToWarehouseId("");
    setNotes("");
    setTransferItems([{ productId: "", quantity: 1 }]);
  };

  const handleAddItem = () => {
    setTransferItems([...transferItems, { productId: "", quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (transferItems.length <= 1) return;
    setTransferItems(transferItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: "productId" | "quantity", value: any) => {
    const next = [...transferItems];
    next[index] = { ...next[index], [field]: value };
    setTransferItems(next);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromWarehouseId || !toWarehouseId) {
      toast.error("Please select both source and destination warehouses.");
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      toast.error("Source and destination warehouses cannot be the same.");
      return;
    }
    const validItems = transferItems.filter((it) => it.productId && it.quantity > 0);
    if (validItems.length === 0) {
      toast.error("Please add at least one valid product item.");
      return;
    }
    createTransferMutation.mutate({
      fromWarehouseId,
      toWarehouseId,
      notes,
      items: validItems,
    });
  };

  // Helper to get available quantity of a product in the selected source warehouse
  const getAvailableStock = (prodId: string, whId: string) => {
    if (!prodId || !whId) return 0;
    const prod = products.find((p) => p.id === prodId);
    if (!prod || !prod.warehouseStocks) return 0;
    const ws = prod.warehouseStocks.find((w) => w.warehouseId === whId);
    return ws ? ws.quantity : 0;
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = transfers.length;
    const pending = transfers.filter((t) => t.status === "pending").length;
    const inTransit = transfers.filter((t) => t.status === "in_transit").length;
    const completed = transfers.filter((t) => t.status === "completed").length;
    return { total, pending, inTransit, completed };
  }, [transfers]);

  // Filtered transfers
  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      const matchSearch =
        t.transferNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.fromWarehouse?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.toWarehouse?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSearch;
    });
  }, [transfers, searchQuery]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1 font-medium">
            <Clock className="w-3 h-3" /> Pending Review
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1 font-medium">
            <Check className="w-3 h-3" /> Approved / Staged
          </Badge>
        );
      case "in_transit":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1 font-medium">
            <Truck className="w-3 h-3" /> In-Transit
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3 h-3" /> Received & Completed
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-1 font-medium">
            <XCircle className="w-3 h-3" /> Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="w-full min-w-0 p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-50 flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-primary" />
            Stock Transfers & In-Transit
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dispatch, track, and receive inventory across multi-warehouse locations with atomic ledger balances.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => {
              resetCreateForm();
              setIsCreateOpen(true);
            }}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Transfer Order
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Transfers</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{metrics.total}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Boxes className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending Approvals</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">{metrics.pending}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active In-Transit</p>
              <h3 className="text-2xl font-bold text-purple-600 mt-1">{metrics.inTransit}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600">
              <Truck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completed Transfers</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{metrics.completed}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warehouse Summary Cards if available */}
      {warehouseSummaries.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {warehouseSummaries.map((ws: any) => (
            <Card key={ws.warehouseId} className="border border-border/70 bg-card/60 backdrop-blur-xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <WarehouseIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">{ws.warehouseName}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{ws.totalItems} SKUs</Badge>
                </div>
                <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-border/40 text-xs text-muted-foreground">
                  <span>Stock Units: <strong className="text-foreground font-semibold">{ws.totalUnits}</strong></span>
                  <span>Valuation: <strong className="text-foreground font-semibold">₹{Number(ws.totalValuation || 0).toLocaleString("en-IN")}</strong></span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Main Table Card */}
      <Card className="border border-border/70 shadow-xs">
        <CardHeader className="p-4 border-b border-border/70">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search transfer #, warehouse, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[170px] h-9 text-xs">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="in_transit">In-Transit</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {transfersLoading ? (
            <div className="p-12 text-center text-muted-foreground animate-pulse">
              Loading transfer orders...
            </div>
          ) : filteredTransfers.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <ArrowRightLeft className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No stock transfer orders found.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resetCreateForm();
                  setIsCreateOpen(true);
                }}
              >
                Create First Transfer
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[140px] font-semibold text-xs">TRANSFER #</TableHead>
                    <TableHead className="font-semibold text-xs">ROUTE (FROM → TO)</TableHead>
                    <TableHead className="font-semibold text-xs text-center">ITEMS</TableHead>
                    <TableHead className="font-semibold text-xs text-center">TOTAL UNITS</TableHead>
                    <TableHead className="font-semibold text-xs">STATUS</TableHead>
                    <TableHead className="font-semibold text-xs">DATE</TableHead>
                    <TableHead className="font-semibold text-xs text-right">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransfers.map((t) => {
                    const totalUnits = t.details?.reduce((acc, d) => acc + d.quantity, 0) || 0;
                    return (
                      <TableRow key={t.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs font-semibold text-primary">
                          {t.transferNo}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-xs font-medium">
                            <span className="text-muted-foreground">{t.fromWarehouse?.name || "Source"}</span>
                            <ArrowRightLeft className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                            <span className="text-foreground font-semibold">{t.toWarehouse?.name || "Destination"}</span>
                          </div>
                          {t.notes && (
                            <p className="text-[11px] text-muted-foreground/80 truncate max-w-xs mt-0.5">{t.notes}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          <Badge variant="secondary" className="font-normal text-[11px]">
                            {t.details?.length || 0} Products
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-semibold text-xs">
                          {totalUnits}
                        </TableCell>
                        <TableCell>{getStatusBadge(t.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(t.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => setSelectedTransfer(t)}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> View
                            </Button>

                            {/* Workflow Actions */}
                            {t.status === "pending" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                                  onClick={() => updateStatusMutation.mutate({ id: t.id, status: "approved" })}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  <Check className="w-3.5 h-3.5 mr-1" /> Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                                  onClick={() => updateStatusMutation.mutate({ id: t.id, status: "rejected" })}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  <Ban className="w-3.5 h-3.5 mr-1" /> Reject
                                </Button>
                              </>
                            )}

                            {t.status === "approved" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 border-purple-200"
                                onClick={() => updateStatusMutation.mutate({ id: t.id, status: "in_transit" })}
                                disabled={updateStatusMutation.isPending}
                              >
                                <Truck className="w-3.5 h-3.5 mr-1" /> Dispatch
                              </Button>
                            )}

                            {t.status === "in_transit" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                                onClick={() => updateStatusMutation.mutate({ id: t.id, status: "completed" })}
                                disabled={updateStatusMutation.isPending}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Receive
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Transfer Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-primary" /> Create Stock Transfer Order
            </DialogTitle>
            <DialogDescription>
              Transfer inventory items between warehouses with real-time stock verification.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Source Warehouse (From)</Label>
                <Select value={fromWarehouseId} onValueChange={setFromWarehouseId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select Source Warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} {w.location ? `(${w.location})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Destination Warehouse (To)</Label>
                <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select Destination Warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id} disabled={w.id === fromWarehouseId}>
                        {w.name} {w.location ? `(${w.location})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2 pt-2 border-t border-border/70">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Products to Transfer</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="h-7 text-xs gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add Product
                </Button>
              </div>

              <div className="space-y-2">
                {transferItems.map((item, idx) => {
                  const availableStock = getAvailableStock(item.productId, fromWarehouseId);
                  const isStockInsufficient = fromWarehouseId && item.productId && item.quantity > availableStock;

                  return (
                    <div key={idx} className="flex items-start gap-2 p-2.5 rounded-md bg-muted/30 border border-border/60">
                      <div className="flex-1 space-y-1">
                        <Select
                          value={item.productId}
                          onValueChange={(val) => handleItemChange(idx, "productId", val)}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select Product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} ({p.sku})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {fromWarehouseId && item.productId && (
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            Available in source:{" "}
                            <strong className={availableStock > 0 ? "text-emerald-600" : "text-rose-600 font-bold"}>
                              {availableStock} units
                            </strong>
                          </div>
                        )}
                      </div>

                      <div className="w-28 space-y-1">
                        <Input
                          type="number"
                          min="1"
                          max={fromWarehouseId ? availableStock : undefined}
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, "quantity", parseInt(e.target.value) || 1)}
                          className={`h-9 text-xs ${isStockInsufficient ? "border-rose-500 bg-rose-50/50" : ""}`}
                          placeholder="Qty"
                        />
                        {isStockInsufficient && (
                          <span className="text-[10px] text-rose-600 flex items-center gap-0.5">
                            <AlertCircle className="w-3 h-3" /> Exceeds stock
                          </span>
                        )}
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={transferItems.length <= 1}
                        className="h-9 w-9 text-muted-foreground hover:text-rose-600 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <Label className="text-xs font-semibold">Notes / Purpose</Label>
              <Textarea
                placeholder="Reason for inter-warehouse movement, courier details, etc..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTransferMutation.isPending} className="gap-2">
                {createTransferMutation.isPending ? "Creating Transfer..." : "Submit Transfer Order"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transfer Details Dialog */}
      <Dialog open={Boolean(selectedTransfer)} onOpenChange={(open) => !open && setSelectedTransfer(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <div className="flex items-center justify-between pr-4">
              <DialogTitle className="font-mono text-base font-bold text-primary">
                {selectedTransfer?.transferNo}
              </DialogTitle>
              {selectedTransfer && getStatusBadge(selectedTransfer.status)}
            </div>
            <DialogDescription>Stock Transfer Order Manifest & Line Items</DialogDescription>
          </DialogHeader>

          {selectedTransfer && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 text-xs">
                <div>
                  <span className="text-muted-foreground">Source Warehouse:</span>
                  <p className="font-semibold text-foreground mt-0.5">{selectedTransfer.fromWarehouse?.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Destination Warehouse:</span>
                  <p className="font-semibold text-foreground mt-0.5">{selectedTransfer.toWarehouse?.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Created On:</span>
                  <p className="font-medium text-foreground mt-0.5">
                    {new Date(selectedTransfer.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Notes:</span>
                  <p className="font-medium text-foreground mt-0.5">{selectedTransfer.notes || "No notes provided"}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Line Items Manifest
                </h4>
                <div className="border border-border/70 rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-xs font-semibold">PRODUCT</TableHead>
                        <TableHead className="text-xs font-semibold">SKU</TableHead>
                        <TableHead className="text-xs font-semibold text-right">QTY</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTransfer.details?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs font-medium">{item.product?.name || item.productId}</TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">{item.product?.sku || "—"}</TableCell>
                          <TableCell className="text-xs text-right font-bold">{item.quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Status Action Buttons within Drawer */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                {selectedTransfer.status === "pending" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-rose-600 border-rose-200 hover:bg-rose-50"
                      onClick={() => updateStatusMutation.mutate({ id: selectedTransfer.id, status: "rejected" })}
                      disabled={updateStatusMutation.isPending}
                    >
                      <Ban className="w-3.5 h-3.5 mr-1" /> Reject Transfer
                    </Button>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => updateStatusMutation.mutate({ id: selectedTransfer.id, status: "approved" })}
                      disabled={updateStatusMutation.isPending}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" /> Approve Transfer
                    </Button>
                  </>
                )}

                {selectedTransfer.status === "approved" && (
                  <Button
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() => updateStatusMutation.mutate({ id: selectedTransfer.id, status: "in_transit" })}
                    disabled={updateStatusMutation.isPending}
                  >
                    <Truck className="w-3.5 h-3.5 mr-1" /> Dispatch to In-Transit
                  </Button>
                )}

                {selectedTransfer.status === "in_transit" && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => updateStatusMutation.mutate({ id: selectedTransfer.id, status: "completed" })}
                    disabled={updateStatusMutation.isPending}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Confirm Receipt & Complete
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
