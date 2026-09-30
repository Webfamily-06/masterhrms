import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, formatInventoryError } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  RotateCcw,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  FileText,
  AlertCircle,
  Loader2,
  Eye,
  ReceiptText,
  CreditCard,
  PackageX,
} from "lucide-react";
import { toast } from "sonner";
import { formatSystemAmount } from "@/lib/currency";

export const Route = createFileRoute("/_authenticated/_app/returns")({
  component: ReturnsPage,
  head: () => ({ meta: [{ title: "Returns & Credit/Debit Notes — Master ERP" }] }),
});

// ==========================================
// Types
// ==========================================
interface SalesReturn {
  id: string;
  returnNumber: string;
  returnDate: string;
  status: "draft" | "approved" | "completed";
  reason: string | null;
  totalAmount: string;
  taxAmount: string;
  subtotal: string;
  sale: { invoiceNo: string; date: string };
  customer: { name: string; email: string } | null;
  creditNote: CreditNote | null;
}

interface PurchaseReturn {
  id: string;
  returnNumber: string;
  returnDate: string;
  status: "draft" | "approved" | "completed";
  reason: string | null;
  totalAmount: string;
  taxAmount: string;
  subtotal: string;
  purchase: { purchaseNo: string; date: string };
  supplier: { name: string } | null;
  debitNote: DebitNote | null;
}

interface CreditNote {
  id: string;
  noteNumber: string;
  amount: string;
  allocatedAmount: string;
  balanceAmount: string;
  status: string;
  noteDate: string;
  customer: { name: string } | null;
}

interface DebitNote {
  id: string;
  noteNumber: string;
  amount: string;
  allocatedAmount: string;
  balanceAmount: string;
  status: string;
  noteDate: string;
  supplier: { name: string } | null;
}

// ==========================================
// Helpers
// ==========================================
const statusBadge = (status: string) => {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    draft: { label: "Draft", variant: "secondary" },
    approved: { label: "Approved", variant: "default" },
    completed: { label: "Completed", variant: "outline" },
    active: { label: "Active", variant: "default" },
    voided: { label: "Voided", variant: "destructive" },
  };
  const cfg = map[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
};

const fmt = (v: string | number | undefined) =>
  formatSystemAmount(Number(v ?? 0));

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

// ==========================================
// Create Sales Return Dialog
// ==========================================
function CreateSalesReturnDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [saleId, setSaleId] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([
    { productId: "", productName: "", quantity: 1, unitPrice: 0, taxRate: 0 },
  ]);

  const { data: salesData } = useQuery({
    queryKey: ["sales-list"],
    queryFn: () => api.get("/sales").then((r) => r.data),
    enabled: open,
  });

  const { data: productsData } = useQuery({
    queryKey: ["products-list"],
    queryFn: () => api.get("/products").then((r) => r.data),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post("/returns/sales", payload).then((r) => r.data),
    onSuccess: () => {
      toast.success("Sales return draft created");
      qc.invalidateQueries({ queryKey: ["sales-returns"] });
      onClose();
    },
    onError: (err: any) => toast.error(formatInventoryError(err) || "Failed to create return"),
  });

  const addItem = () =>
    setItems((prev) => [...prev, { productId: "", productName: "", quantity: 1, unitPrice: 0, taxRate: 0 }]);

  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const updateItem = (i: number, field: string, val: any) =>
    setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, [field]: val } : item)));

  const handleSubmit = () => {
    if (!saleId) return toast.error("Please select a sale");
    if (items.some((it) => !it.productId)) return toast.error("All items must have a product selected");
    createMutation.mutate({ saleId, reason, notes, items });
  };

  const sales = (salesData?.sales || salesData || []) as any[];
  const products = (productsData?.products || productsData || []) as any[];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-orange-500" />
            Create Sales Return
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sale selector */}
          <div className="space-y-1">
            <Label>Original Sale / Invoice *</Label>
            <Select value={saleId} onValueChange={setSaleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select sale invoice…" />
              </SelectTrigger>
              <SelectContent>
                {sales.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.invoiceNo} — {s.customerName || s.customer?.name || "Walk-in"} (
                    {fmt(s.total)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div className="space-y-1">
            <Label>Reason</Label>
            <Input
              placeholder="e.g. Damaged goods, wrong item…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {/* Items */}
          <div className="space-y-2">
            <Label>Return Items *</Label>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end p-2 border rounded-md bg-muted/30">
                <div className="col-span-4">
                  <Label className="text-xs text-muted-foreground">Product</Label>
                  <Select
                    value={item.productId}
                    onValueChange={(v) => {
                      const p = products.find((p: any) => p.id === v);
                      updateItem(i, "productId", v);
                      updateItem(i, "productName", p?.name || "");
                      updateItem(i, "unitPrice", p?.salePrice || 0);
                      updateItem(i, "taxRate", p?.taxRate?.rate || 0);
                    }}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Qty</Label>
                  <Input
                    type="number"
                    min={1}
                    className="h-8"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, "quantity", Number(e.target.value))}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Unit Price</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    className="h-8"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(i, "unitPrice", Number(e.target.value))}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Tax %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    className="h-8"
                    value={item.taxRate}
                    onChange={(e) => updateItem(i, "taxRate", Number(e.target.value))}
                  />
                </div>
                <div className="col-span-1 text-right text-sm font-medium pt-4">
                  {fmt(item.quantity * item.unitPrice * (1 + item.taxRate / 100))}
                </div>
                <div className="col-span-1 flex justify-end pt-3">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(i)}>
                    <i className="ph ph-trash text-sm"></i>
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addItem} className="gap-1">
              <Plus className="h-3 w-3" /> Add Item
            </Button>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label>Internal Notes</Label>
            <Textarea
              rows={2}
              placeholder="Optional internal notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Draft Return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// Create Purchase Return Dialog
// ==========================================
function CreatePurchaseReturnDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [purchaseId, setPurchaseId] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([
    { productId: "", productName: "", quantity: 1, unitCost: 0, taxRate: 0 },
  ]);

  const { data: purchasesData } = useQuery({
    queryKey: ["purchases-list"],
    queryFn: () => api.get("/purchases").then((r) => r.data),
    enabled: open,
  });

  const { data: productsData } = useQuery({
    queryKey: ["products-list"],
    queryFn: () => api.get("/products").then((r) => r.data),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post("/returns/purchases", payload).then((r) => r.data),
    onSuccess: () => {
      toast.success("Purchase return draft created");
      qc.invalidateQueries({ queryKey: ["purchase-returns"] });
      onClose();
    },
    onError: (err: any) => toast.error(formatInventoryError(err) || "Failed to create return"),
  });

  const addItem = () =>
    setItems((prev) => [...prev, { productId: "", productName: "", quantity: 1, unitCost: 0, taxRate: 0 }]);
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, val: any) =>
    setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, [field]: val } : item)));

  const handleSubmit = () => {
    if (!purchaseId) return toast.error("Please select a purchase");
    if (items.some((it) => !it.productId)) return toast.error("All items must have a product selected");
    createMutation.mutate({ purchaseId, reason, notes, items });
  };

  const purchases = (purchasesData?.purchases || purchasesData || []) as any[];
  const products = (productsData?.products || productsData || []) as any[];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageX className="h-5 w-5 text-red-500" />
            Create Purchase Return
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Original Purchase *</Label>
            <Select value={purchaseId} onValueChange={setPurchaseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select purchase…" />
              </SelectTrigger>
              <SelectContent>
                {purchases.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.purchaseNo} — {p.supplier?.name || "Unknown Supplier"} ({fmt(p.total)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Reason</Label>
            <Input placeholder="e.g. Defective goods, over-delivery…" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Return Items *</Label>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end p-2 border rounded-md bg-muted/30">
                <div className="col-span-4">
                  <Label className="text-xs text-muted-foreground">Product</Label>
                  <Select
                    value={item.productId}
                    onValueChange={(v) => {
                      const p = products.find((p: any) => p.id === v);
                      updateItem(i, "productId", v);
                      updateItem(i, "productName", p?.name || "");
                      updateItem(i, "unitCost", p?.purchasePrice || 0);
                      updateItem(i, "taxRate", p?.taxRate?.rate || 0);
                    }}
                  >
                    <SelectTrigger className="h-8"><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>
                      {products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Qty</Label>
                  <Input type="number" min={1} className="h-8" value={item.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))} />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Unit Cost</Label>
                  <Input type="number" min={0} step={0.01} className="h-8" value={item.unitCost} onChange={(e) => updateItem(i, "unitCost", Number(e.target.value))} />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Tax %</Label>
                  <Input type="number" min={0} max={100} className="h-8" value={item.taxRate} onChange={(e) => updateItem(i, "taxRate", Number(e.target.value))} />
                </div>
                <div className="col-span-1 text-right text-sm font-medium pt-4">
                  {fmt(item.quantity * item.unitCost * (1 + item.taxRate / 100))}
                </div>
                <div className="col-span-1 flex justify-end pt-3">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(i)}>
                    <i className="ph ph-trash text-sm"></i>
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addItem} className="gap-1">
              <Plus className="h-3 w-3" /> Add Item
            </Button>
          </div>

          <div className="space-y-1">
            <Label>Internal Notes</Label>
            <Textarea rows={2} placeholder="Optional internal notes…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Draft Return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// Main Page
// ==========================================
function ReturnsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("sales-returns");
  const [createSalesOpen, setCreateSalesOpen] = useState(false);
  const [createPurchaseOpen, setCreatePurchaseOpen] = useState(false);
  const [viewReturn, setViewReturn] = useState<SalesReturn | PurchaseReturn | null>(null);

  // Data queries
  const { data: salesReturnsData, isLoading: srLoading } = useQuery({
    queryKey: ["sales-returns"],
    queryFn: () => api.get("/returns/sales").then((r) => r.data),
  });

  const { data: purchaseReturnsData, isLoading: prLoading } = useQuery({
    queryKey: ["purchase-returns"],
    queryFn: () => api.get("/returns/purchases").then((r) => r.data),
  });

  const { data: creditNotesData, isLoading: cnLoading } = useQuery({
    queryKey: ["credit-notes"],
    queryFn: () => api.get("/returns/credit-notes").then((r) => r.data),
  });

  const { data: debitNotesData, isLoading: dnLoading } = useQuery({
    queryKey: ["debit-notes"],
    queryFn: () => api.get("/returns/debit-notes").then((r) => r.data),
  });

  // Approve mutations
  const approveSR = useMutation({
    mutationFn: (id: string) => api.patch(`/returns/sales/${id}/approve`).then((r) => r.data),
    onSuccess: () => { toast.success("Sales return approved — Credit Note issued & GL posted"); qc.invalidateQueries({ queryKey: ["sales-returns"] }); qc.invalidateQueries({ queryKey: ["credit-notes"] }); },
    onError: (err: any) => toast.error(formatInventoryError(err) || "Approval failed"),
  });

  const approvePR = useMutation({
    mutationFn: (id: string) => api.patch(`/returns/purchases/${id}/approve`).then((r) => r.data),
    onSuccess: () => { toast.success("Purchase return approved — Debit Note issued & GL posted"); qc.invalidateQueries({ queryKey: ["purchase-returns"] }); qc.invalidateQueries({ queryKey: ["debit-notes"] }); },
    onError: (err: any) => toast.error(formatInventoryError(err) || "Approval failed"),
  });

  const completeSR = useMutation({
    mutationFn: (id: string) => api.patch(`/returns/sales/${id}/complete`).then((r) => r.data),
    onSuccess: () => { toast.success("Sales return completed"); qc.invalidateQueries({ queryKey: ["sales-returns"] }); },
    onError: (err: any) => toast.error(formatInventoryError(err) || "Failed"),
  });

  const completePR = useMutation({
    mutationFn: (id: string) => api.patch(`/returns/purchases/${id}/complete`).then((r) => r.data),
    onSuccess: () => { toast.success("Purchase return completed"); qc.invalidateQueries({ queryKey: ["purchase-returns"] }); },
    onError: (err: any) => toast.error(formatInventoryError(err) || "Failed"),
  });

  // Filtered data
  const salesReturns: SalesReturn[] = (salesReturnsData?.returns || salesReturnsData || []).filter((r: SalesReturn) =>
    !search || r.returnNumber.toLowerCase().includes(search.toLowerCase()) ||
    r.sale?.invoiceNo?.toLowerCase().includes(search.toLowerCase()) ||
    r.customer?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const purchaseReturns: PurchaseReturn[] = (purchaseReturnsData?.returns || purchaseReturnsData || []).filter((r: PurchaseReturn) =>
    !search || r.returnNumber.toLowerCase().includes(search.toLowerCase()) ||
    r.purchase?.purchaseNo?.toLowerCase().includes(search.toLowerCase()) ||
    r.supplier?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const creditNotes: CreditNote[] = (creditNotesData || []).filter((n: CreditNote) =>
    !search || n.noteNumber.toLowerCase().includes(search.toLowerCase()) ||
    n.customer?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const debitNotes: DebitNote[] = (debitNotesData || []).filter((n: DebitNote) =>
    !search || n.noteNumber.toLowerCase().includes(search.toLowerCase()) ||
    n.supplier?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <RotateCcw className="h-6 w-6 text-orange-500" />
            Returns & Credit/Debit Notes
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage sales & purchase returns with automated inventory and GL posting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCreatePurchaseOpen(true)} className="gap-2">
            <PackageX className="h-4 w-4" />
            Purchase Return
          </Button>
          <Button onClick={() => setCreateSalesOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Sales Return
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Sales Returns", value: salesReturns.length, icon: RotateCcw, color: "text-orange-500" },
          { label: "Purchase Returns", value: purchaseReturns.length, icon: PackageX, color: "text-red-500" },
          { label: "Credit Notes", value: creditNotes.length, icon: CreditCard, color: "text-green-500" },
          { label: "Debit Notes", value: debitNotes.length, icon: FileText, color: "text-blue-500" },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search returns, notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 md:w-auto md:inline-flex">
          <TabsTrigger value="sales-returns" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Sales Returns
          </TabsTrigger>
          <TabsTrigger value="purchase-returns" className="gap-2">
            <PackageX className="h-4 w-4" />
            Purchase Returns
          </TabsTrigger>
          <TabsTrigger value="credit-notes" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Credit Notes
          </TabsTrigger>
          <TabsTrigger value="debit-notes" className="gap-2">
            <FileText className="h-4 w-4" />
            Debit Notes
          </TabsTrigger>
        </TabsList>

        {/* Sales Returns Tab */}
        <TabsContent value="sales-returns">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sales Returns</CardTitle>
              <CardDescription>Returns raised against sales invoices</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {srLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : salesReturns.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <RotateCcw className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No sales returns found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Return #</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Credit Note</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesReturns.map((sr) => (
                      <TableRow key={sr.id}>
                        <TableCell className="font-mono font-medium">{sr.returnNumber}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">{sr.sale?.invoiceNo}</TableCell>
                        <TableCell>{sr.customer?.name || "—"}</TableCell>
                        <TableCell>{fmtDate(sr.returnDate)}</TableCell>
                        <TableCell className="text-right font-medium">{fmt(sr.totalAmount)}</TableCell>
                        <TableCell>{statusBadge(sr.status)}</TableCell>
                        <TableCell>
                          {sr.creditNote ? (
                            <span className="text-xs font-mono text-green-600">{sr.creditNote.noteNumber}</span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {sr.status === "draft" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 text-green-600 border-green-600 hover:bg-green-50"
                                onClick={() => approveSR.mutate(sr.id)}
                                disabled={approveSR.isPending}
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Approve
                              </Button>
                            )}
                            {sr.status === "approved" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1"
                                onClick={() => completeSR.mutate(sr.id)}
                                disabled={completeSR.isPending}
                              >
                                <Clock className="h-3 w-3" />
                                Complete
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchase Returns Tab */}
        <TabsContent value="purchase-returns">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Purchase Returns</CardTitle>
              <CardDescription>Returns raised against purchase orders</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {prLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : purchaseReturns.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <PackageX className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No purchase returns found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Return #</TableHead>
                      <TableHead>Purchase #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Debit Note</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseReturns.map((pr) => (
                      <TableRow key={pr.id}>
                        <TableCell className="font-mono font-medium">{pr.returnNumber}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">{pr.purchase?.purchaseNo}</TableCell>
                        <TableCell>{pr.supplier?.name || "—"}</TableCell>
                        <TableCell>{fmtDate(pr.returnDate)}</TableCell>
                        <TableCell className="text-right font-medium">{fmt(pr.totalAmount)}</TableCell>
                        <TableCell>{statusBadge(pr.status)}</TableCell>
                        <TableCell>
                          {pr.debitNote ? (
                            <span className="text-xs font-mono text-blue-600">{pr.debitNote.noteNumber}</span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {pr.status === "draft" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 text-green-600 border-green-600 hover:bg-green-50"
                                onClick={() => approvePR.mutate(pr.id)}
                                disabled={approvePR.isPending}
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Approve
                              </Button>
                            )}
                            {pr.status === "approved" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1"
                                onClick={() => completePR.mutate(pr.id)}
                                disabled={completePR.isPending}
                              >
                                <Clock className="h-3 w-3" />
                                Complete
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credit Notes Tab */}
        <TabsContent value="credit-notes">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Credit Notes</CardTitle>
              <CardDescription>Customer credits issued from approved sales returns</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {cnLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : creditNotes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No credit notes found. Approve a sales return to generate one.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Note #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Allocated</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditNotes.map((cn) => (
                      <TableRow key={cn.id}>
                        <TableCell className="font-mono font-medium text-green-600">{cn.noteNumber}</TableCell>
                        <TableCell>{cn.customer?.name || "—"}</TableCell>
                        <TableCell>{fmtDate(cn.noteDate)}</TableCell>
                        <TableCell className="text-right font-medium">{fmt(cn.amount)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{fmt(cn.allocatedAmount)}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">{fmt(cn.balanceAmount)}</TableCell>
                        <TableCell>{statusBadge(cn.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Debit Notes Tab */}
        <TabsContent value="debit-notes">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Debit Notes</CardTitle>
              <CardDescription>Supplier debit claims from approved purchase returns</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {dnLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : debitNotes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No debit notes found. Approve a purchase return to generate one.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Note #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Allocated</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {debitNotes.map((dn) => (
                      <TableRow key={dn.id}>
                        <TableCell className="font-mono font-medium text-blue-600">{dn.noteNumber}</TableCell>
                        <TableCell>{dn.supplier?.name || "—"}</TableCell>
                        <TableCell>{fmtDate(dn.noteDate)}</TableCell>
                        <TableCell className="text-right font-medium">{fmt(dn.amount)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{fmt(dn.allocatedAmount)}</TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">{fmt(dn.balanceAmount)}</TableCell>
                        <TableCell>{statusBadge(dn.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateSalesReturnDialog open={createSalesOpen} onClose={() => setCreateSalesOpen(false)} />
      <CreatePurchaseReturnDialog open={createPurchaseOpen} onClose={() => setCreatePurchaseOpen(false)} />
    </div>
  );
}
