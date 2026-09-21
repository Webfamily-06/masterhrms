import { createFileRoute, Link } from "@tanstack/react-router";
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
  ShoppingCart,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Truck,
  Building2,
  Warehouse as WarehouseIcon,
  DollarSign,
  Package,
  Trash2,
  Eye,
  Check,
  Ban,
  CreditCard,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { formatSystemAmount } from "@/lib/currency";

export const Route = createFileRoute("/_authenticated/_app/purchases")({
  component: PurchasesPage,
});

interface PurchaseDetail {
  id: string;
  productId: string;
  productName: string;
  cost: number;
  quantity: number;
  taxRate: number;
  subtotal: number;
  product?: {
    id: string;
    name: string;
    sku: string;
    unit?: string;
  };
}

interface Purchase {
  id: string;
  purchaseNo: string;
  supplierId?: string;
  warehouseId?: string;
  status: "ordered" | "received" | "cancelled";
  total: number;
  paidAmount: number;
  paymentStatus: "unpaid" | "partial" | "paid";
  notes?: string;
  date: string;
  createdAt: string;
  supplier?: { id: string; name: string; phone?: string; email?: string };
  warehouse?: { id: string; name: string; location?: string };
  details: PurchaseDetail[];
}

interface Supplier {
  id: string;
  name: string;
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
  purchasePrice?: number;
  salePrice?: number;
}

export default function PurchasesPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [paymentModalPurchase, setPaymentModalPurchase] = useState<Purchase | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");

  // Create form state
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [status, setStatus] = useState<"ordered" | "received">("ordered");
  const [paymentStatus, setPaymentStatus] = useState<"unpaid" | "paid">("unpaid");
  const [notes, setNotes] = useState("");
  const [poDate, setPoDate] = useState(new Date().toISOString().slice(0, 10));
  const [lineItems, setLineItems] = useState<{ productId: string; productName: string; cost: number; quantity: number; taxRate: number }[]>([
    { productId: "", productName: "", cost: 0, quantity: 1, taxRate: 18 },
  ]);

  // 1. Fetch Purchases
  const { data: purchasesRes, isLoading: purchasesLoading } = useQuery({
    queryKey: ["purchases-list", statusFilter],
    queryFn: async () => {
      const url = statusFilter && statusFilter !== "all" ? `/api/purchases?status=${statusFilter}` : "/api/purchases";
      const res = await api.get<{ data: Purchase[] }>(url);
      return res.data || [];
    },
  });
  const purchases: Purchase[] = purchasesRes || [];

  // 2. Fetch Suppliers
  const { data: suppliersRes } = useQuery({
    queryKey: ["suppliers-for-po"],
    queryFn: async () => {
      const res = await api.get<{ data: Supplier[] }>("/api/suppliers");
      return res.data || [];
    },
  });
  const suppliers: Supplier[] = suppliersRes || [];

  // 3. Fetch Warehouses
  const { data: warehousesRes } = useQuery({
    queryKey: ["warehouses-for-po"],
    queryFn: async () => {
      const res = await api.get<any>("/api/products/warehouses");
      return Array.isArray(res) ? res : res.data || [];
    },
  });
  const warehouses: Warehouse[] = warehousesRes || [];

  // 4. Fetch Products
  const { data: productsRes } = useQuery({
    queryKey: ["products-for-po"],
    queryFn: async () => {
      const res = await api.get<any>("/api/products");
      return Array.isArray(res) ? res : res.data || [];
    },
  });
  const products: Product[] = productsRes || [];

  // Mutations
  const createPurchaseMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/api/purchases", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Purchase order created successfully!");
      setIsCreateOpen(false);
      resetCreateForm();
      queryClient.invalidateQueries({ queryKey: ["purchases-list"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-inventory-metrics"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to create purchase order");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.patch(`/api/purchases/${id}/status`, { status });
      return res.data;
    },
    onSuccess: (_, variables) => {
      toast.success(`Purchase order marked as ${variables.status.toUpperCase()}`);
      if (selectedPurchase && selectedPurchase.id === variables.id) {
        setSelectedPurchase(null);
      }
      queryClient.invalidateQueries({ queryKey: ["purchases-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-inventory-metrics"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to update purchase status");
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async ({ id, amount, method }: { id: string; amount: number; method: string }) => {
      const res = await api.post(`/api/purchases/${id}/payments`, { amount, paymentMethod: method });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Supplier payment recorded successfully!");
      setPaymentModalPurchase(null);
      setPayAmount(0);
      queryClient.invalidateQueries({ queryKey: ["purchases-list"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to record payment");
    },
  });

  const resetCreateForm = () => {
    setSupplierId("");
    setWarehouseId("");
    setStatus("ordered");
    setPaymentStatus("unpaid");
    setNotes("");
    setPoDate(new Date().toISOString().slice(0, 10));
    setLineItems([{ productId: "", productName: "", cost: 0, quantity: 1, taxRate: 18 }]);
  };

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { productId: "", productName: "", cost: 0, quantity: 1, taxRate: 18 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    const next = [...lineItems];
    next[index] = {
      ...next[index],
      productId: prodId,
      productName: prod?.name || "",
      cost: Number(prod?.purchasePrice || 0),
    };
    setLineItems(next);
  };

  const handleItemFieldChange = (index: number, field: "cost" | "quantity" | "taxRate", value: number) => {
    const next = [...lineItems];
    next[index] = { ...next[index], [field]: value };
    setLineItems(next);
  };

  const computedOrderTotal = useMemo(() => {
    return lineItems.reduce((sum, it) => {
      const lineCost = (Number(it.cost) || 0) * (Number(it.quantity) || 1);
      const lineTax = (lineCost * (Number(it.taxRate) || 0)) / 100;
      return sum + lineCost + lineTax;
    }, 0);
  }, [lineItems]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = lineItems.filter((it) => it.productId && it.quantity > 0);
    if (validItems.length === 0) {
      toast.error("Please add at least one product line item");
      return;
    }
    createPurchaseMutation.mutate({
      supplierId: supplierId || null,
      warehouseId: warehouseId || null,
      status,
      paymentStatus,
      paidAmount: paymentStatus === "paid" ? computedOrderTotal : 0,
      notes,
      date: poDate,
      items: validItems,
    });
  };

  // Metrics
  const metrics = useMemo(() => {
    const totalCount = purchases.length;
    const awaitingReceipt = purchases.filter((p) => p.status === "ordered").length;
    const received = purchases.filter((p) => p.status === "received").length;
    const totalOutflow = purchases.reduce((acc, p) => acc + Number(p.total || 0), 0);
    return { totalCount, awaitingReceipt, received, totalOutflow };
  }, [purchases]);

  // Filtered Purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const q = searchQuery.toLowerCase();
      return (
        p.purchaseNo.toLowerCase().includes(q) ||
        (p.supplier?.name && p.supplier.name.toLowerCase().includes(q)) ||
        (p.warehouse?.name && p.warehouse.name.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q))
      );
    });
  }, [purchases, searchQuery]);

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "ordered":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1 font-medium">
            <Clock className="w-3 h-3" /> Awaiting Receipt
          </Badge>
        );
      case "received":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3 h-3" /> Received & Stocked
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-1 font-medium">
            <XCircle className="w-3 h-3" /> Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{s}</Badge>;
    }
  };

  const getPaymentBadge = (ps: string) => {
    switch (ps) {
      case "paid":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]">
            Paid in Full
          </Badge>
        );
      case "partial":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[11px]">
            Partial Payment
          </Badge>
        );
      case "unpaid":
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[11px]">
            Unpaid / Credit
          </Badge>
        );
      default:
        return <Badge variant="outline">{ps}</Badge>;
    }
  };

  return (
    <div className="w-full min-w-0 p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-50 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary" />
            Purchases & Purchase Orders (PO)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate purchase orders, receive vendor consignments, increment warehouse stock, and track payables.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/suppliers" className="btn-sm bg-white dark:bg-slate-800 border border-border-color text-gray-900 dark:text-gray-100 inline-flex items-center gap-1.5 hover:bg-light text-xs">
            <Building2 className="w-3.5 h-3.5 text-primary" /> Supplier Directory
          </Link>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
            <Plus className="w-4 h-4" /> Create Purchase Order
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Purchase Orders</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{metrics.totalCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Awaiting Delivery</p>
              <h3 className="text-2xl font-bold text-blue-600 mt-1">{metrics.awaitingReceipt}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Received & Stocked</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{metrics.received}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gross Outflow Spend</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">{formatSystemAmount(metrics.totalOutflow)}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border border-border/70 shadow-xs">
        <CardHeader className="p-4 border-b border-border/70">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search PO #, supplier, warehouse..."
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
                  <SelectItem value="ordered">Awaiting Receipt</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {purchasesLoading ? (
            <div className="p-12 text-center text-muted-foreground animate-pulse">Loading purchase orders...</div>
          ) : filteredPurchases.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No purchase orders found.</p>
              <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(true)}>
                Create First Purchase Order
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[140px] font-semibold text-xs">PO NUMBER</TableHead>
                    <TableHead className="font-semibold text-xs">SUPPLIER</TableHead>
                    <TableHead className="font-semibold text-xs">WAREHOUSE</TableHead>
                    <TableHead className="font-semibold text-xs">DATE</TableHead>
                    <TableHead className="font-semibold text-xs">STATUS</TableHead>
                    <TableHead className="font-semibold text-xs text-right">TOTAL</TableHead>
                    <TableHead className="font-semibold text-xs text-center">PAYMENT</TableHead>
                    <TableHead className="font-semibold text-xs text-right">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((po) => {
                    const dueAmt = Math.max(0, Number(po.total) - Number(po.paidAmount));
                    return (
                      <TableRow key={po.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs font-semibold text-primary">
                          {po.purchaseNo}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-xs text-gray-900 dark:text-gray-100">
                            {po.supplier?.name || "Direct Vendor"}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {po.warehouse?.name || "Main Warehouse"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(po.date).toLocaleDateString("en-IN")}
                        </TableCell>
                        <TableCell>{getStatusBadge(po.status)}</TableCell>
                        <TableCell className="text-right font-bold text-xs">
                          {formatSystemAmount(Number(po.total))}
                        </TableCell>
                        <TableCell className="text-center">
                          {getPaymentBadge(po.paymentStatus)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => setSelectedPurchase(po)}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> View
                            </Button>

                            {po.status === "ordered" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                                onClick={() => updateStatusMutation.mutate({ id: po.id, status: "received" })}
                                disabled={updateStatusMutation.isPending}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Receive
                              </Button>
                            )}

                            {po.paymentStatus !== "paid" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                                onClick={() => {
                                  setPaymentModalPurchase(po);
                                  setPayAmount(dueAmt);
                                }}
                              >
                                <CreditCard className="w-3.5 h-3.5 mr-1" /> Pay
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

      {/* Create Purchase Order Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" /> Create Purchase Order (PO)
            </DialogTitle>
            <DialogDescription>
              Order raw materials or retail products from registered vendors with automatic stock updates.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Vendor / Supplier</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Destination Warehouse</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Warehouse" />
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Order Date</Label>
                <Input
                  type="date"
                  value={poDate}
                  onChange={(e) => setPoDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Consignment Status</Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ordered">Ordered (In-Transit)</SelectItem>
                    <SelectItem value="received">Received (Increment Stock Now)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Payment Status</Label>
                <Select value={paymentStatus} onValueChange={(val: any) => setPaymentStatus(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Unpaid / On Credit</SelectItem>
                    <SelectItem value="paid">Paid in Full</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product Line Items */}
            <div className="space-y-2 pt-2 border-t border-border/70">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Purchase Items Manifest</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddLineItem} className="h-7 text-xs gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </Button>
              </div>

              <div className="space-y-2">
                {lineItems.map((item, idx) => {
                  const lineTotal = (Number(item.cost) || 0) * (Number(item.quantity) || 1);
                  const lineTaxAmt = (lineTotal * (Number(item.taxRate) || 0)) / 100;

                  return (
                    <div key={idx} className="flex items-start gap-2 p-2.5 rounded-md bg-muted/30 border border-border/60">
                      <div className="flex-1 space-y-1">
                        <Select
                          value={item.productId}
                          onValueChange={(val) => handleProductSelect(idx, val)}
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
                      </div>

                      <div className="w-24 space-y-1">
                        <Input
                          type="number"
                          placeholder="Cost"
                          value={item.cost || ""}
                          onChange={(e) => handleItemFieldChange(idx, "cost", parseFloat(e.target.value) || 0)}
                          className="h-9 text-xs"
                        />
                      </div>

                      <div className="w-20 space-y-1">
                        <Input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleItemFieldChange(idx, "quantity", parseInt(e.target.value) || 1)}
                          className="h-9 text-xs"
                        />
                      </div>

                      <div className="w-20 space-y-1">
                        <Input
                          type="number"
                          placeholder="GST %"
                          value={item.taxRate}
                          onChange={(e) => handleItemFieldChange(idx, "taxRate", parseFloat(e.target.value) || 0)}
                          className="h-9 text-xs"
                        />
                      </div>

                      <div className="w-24 pt-2 text-right text-xs font-bold text-gray-900 dark:text-gray-100 shrink-0">
                        {formatSystemAmount(lineTotal + lineTaxAmt)}
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveLineItem(idx)}
                        disabled={lineItems.length <= 1}
                        className="h-9 w-9 text-muted-foreground hover:text-rose-600 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2 text-sm font-bold">
                <span>Grand Total: <strong className="text-emerald-600">{formatSystemAmount(computedOrderTotal)}</strong></span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold">Notes / Terms</Label>
              <Textarea
                placeholder="Payment terms, delivery timeline, or supplier notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPurchaseMutation.isPending} className="gap-2">
                {createPurchaseMutation.isPending ? "Submitting..." : "Generate Purchase Order"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Supplier Payment Dialog */}
      <Dialog open={Boolean(paymentModalPurchase)} onOpenChange={(open) => !open && setPaymentModalPurchase(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" /> Record Supplier Payment
            </DialogTitle>
            <DialogDescription>
              Record cash, bank, or UPI disbursement against PO #{paymentModalPurchase?.purchaseNo}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 pt-2">
            <div className="p-3 rounded-lg bg-muted/40 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Order Amount:</span>
                <span className="font-bold">{formatSystemAmount(Number(paymentModalPurchase?.total || 0))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Already Paid:</span>
                <span className="text-emerald-600 font-semibold">{formatSystemAmount(Number(paymentModalPurchase?.paidAmount || 0))}</span>
              </div>
              <div className="flex justify-between border-t border-border/60 pt-1">
                <span className="text-muted-foreground">Remaining Balance:</span>
                <span className="text-rose-600 font-bold">
                  {formatSystemAmount(Math.max(0, Number(paymentModalPurchase?.total || 0) - Number(paymentModalPurchase?.paidAmount || 0)))}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Disbursement Amount</Label>
              <Input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Payment Mode</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank Transfer">Bank Transfer (NEFT/RTGS)</SelectItem>
                  <SelectItem value="Cash">Cash / Petty Cash</SelectItem>
                  <SelectItem value="UPI">UPI / Online</SelectItem>
                  <SelectItem value="Cheque">Corporate Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setPaymentModalPurchase(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (paymentModalPurchase && payAmount > 0) {
                    recordPaymentMutation.mutate({
                      id: paymentModalPurchase.id,
                      amount: payAmount,
                      method: paymentMethod,
                    });
                  }
                }}
                disabled={recordPaymentMutation.isPending || payAmount <= 0}
              >
                {recordPaymentMutation.isPending ? "Recording..." : "Confirm Payment"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* View PO Details Dialog */}
      <Dialog open={Boolean(selectedPurchase)} onOpenChange={(open) => !open && setSelectedPurchase(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <div className="flex items-center justify-between pr-4">
              <DialogTitle className="font-mono text-base font-bold text-primary">
                {selectedPurchase?.purchaseNo}
              </DialogTitle>
              {selectedPurchase && getStatusBadge(selectedPurchase.status)}
            </div>
            <DialogDescription>Purchase Order Manifest & Line Items</DialogDescription>
          </DialogHeader>

          {selectedPurchase && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 text-xs">
                <div>
                  <span className="text-muted-foreground">Supplier:</span>
                  <p className="font-semibold text-foreground mt-0.5">{selectedPurchase.supplier?.name || "Direct Vendor"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Warehouse:</span>
                  <p className="font-semibold text-foreground mt-0.5">{selectedPurchase.warehouse?.name || "Main Warehouse"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p className="font-medium text-foreground mt-0.5">
                    {new Date(selectedPurchase.date).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Payment Status:</span>
                  <div className="mt-0.5">{getPaymentBadge(selectedPurchase.paymentStatus)}</div>
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
                        <TableHead className="text-xs font-semibold text-right">COST</TableHead>
                        <TableHead className="text-xs font-semibold text-center">QTY</TableHead>
                        <TableHead className="text-xs font-semibold text-right">SUBTOTAL</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPurchase.details?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs font-medium">{item.productName || item.product?.name}</TableCell>
                          <TableCell className="text-xs text-right">{formatSystemAmount(Number(item.cost))}</TableCell>
                          <TableCell className="text-xs text-center font-bold">{item.quantity}</TableCell>
                          <TableCell className="text-xs text-right font-bold text-emerald-600">
                            {formatSystemAmount(Number(item.subtotal))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/60 text-sm font-bold">
                <span>Total Amount:</span>
                <span className="text-emerald-600">{formatSystemAmount(Number(selectedPurchase.total))}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
