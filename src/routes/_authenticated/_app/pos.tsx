import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PlanGuard } from "@/components/plan-guard";
import { formatSystemAmount } from "@/lib/currency";
import { toast } from "sonner";
import {
  ShoppingCart, Plus, Minus, Trash2, CreditCard, Printer, Search,
  Package, Edit2, Loader2, Receipt, History, Barcode, Tag, CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/pos")({
  component: PosPage,
  head: () => ({ meta: [{ title: "Point of Sale (POS) — Master ERP" }] }),
});

export type PosProduct = {
  id: string;
  name: string;
  price: number;
  category: string;
  sku: string;
  stock: number;
};

export type PosSale = {
  id: string;
  receiptNo: string;
  customer: string;
  items: { id: string; name: string; price: number; qty: number }[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMode: string;
  date: string;
};

const PAYMENT_MODES = ["Cash", "Card", "UPI", "Razorpay", "Bank Transfer"];
const CATEGORIES = ["Software", "Hardware", "Addon", "Services", "Subscription", "Consulting"];

const DEFAULT_PRODUCTS: PosProduct[] = [
  { id: "p1", name: "Enterprise SaaS License", price: 4999, category: "Software", sku: "POS-001", stock: 999 },
  { id: "p2", name: "Biometric Hardware Scanner", price: 12499, category: "Hardware", sku: "POS-002", stock: 25 },
  { id: "p3", name: "Thermal Receipt Printer", price: 3499, category: "Hardware", sku: "POS-003", stock: 15 },
  { id: "p4", name: "Cloud Backup Addon (Annual)", price: 999, category: "Addon", sku: "POS-004", stock: 999 },
  { id: "p5", name: "Implementation Consulting (1hr)", price: 2500, category: "Services", sku: "POS-005", stock: 999 },
  { id: "p6", name: "Custom API Integration", price: 8999, category: "Services", sku: "POS-006", stock: 999 },
];

function PosPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";

  const PRODUCTS_SLUG = `system-pos-products-${tenantId}`;
  const SALES_SLUG = `system-pos-sales-${tenantId}`;

  const [cart, setCart] = useState<{ id: string; name: string; price: number; qty: number }[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [customerName, setCustomerName] = useState("");
  const [paymentMode, setPaymentMode] = useState("Card");
  const [discountPct, setDiscountPct] = useState(0);
  const [lastReceipt, setLastReceipt] = useState<PosSale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<Omit<PosProduct, "id">>({ name: "", price: 0, category: "Services", sku: "", stock: 999 });

  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-platform-settings").maybeSingle();
      return data?.content as any;
    },
  });

  const { data: products = DEFAULT_PRODUCTS } = useQuery({
    queryKey: ["pos-products", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", PRODUCTS_SLUG).maybeSingle();
      if (data?.content && Array.isArray(data.content)) return data.content as PosProduct[];
      return DEFAULT_PRODUCTS;
    },
  });

  const { data: salesHistory = [] } = useQuery({
    queryKey: ["pos-sales", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", SALES_SLUG).maybeSingle();
      if (data?.content && Array.isArray(data.content)) return data.content as PosSale[];
      return [] as PosSale[];
    },
  });

  const persistProducts = useMutation({
    mutationFn: async (list: PosProduct[]) => {
      await supabase.from("cms_pages").upsert({ slug: PRODUCTS_SLUG, title: "POS Products", content: list as any, published: true }, { onConflict: "slug" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pos-products", tenantId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const persistSales = useMutation({
    mutationFn: async (list: PosSale[]) => {
      await supabase.from("cms_pages").upsert({ slug: SALES_SLUG, title: "POS Sales History", content: list as any, published: true }, { onConflict: "slug" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pos-sales", tenantId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === "all" || p.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [products, search, categoryFilter]);

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt = Math.round(subtotal * (discountPct / 100));
  const taxBase = subtotal - discountAmt;
  const tax = Math.round(taxBase * 0.18);
  const total = taxBase + tax;

  function addToCart(p: PosProduct) {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === p.id);
      if (existing) return prev.map((i) => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { id: p.id, name: p.name, price: p.price, qty: 1 }];
    });
  }

  function updateQty(id: string, delta: number) {
    setCart((prev) => prev.map((i) => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i));
  }

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }

  function handleCheckout() {
    if (cart.length === 0) return toast.error("Cart is empty");
    const sale: PosSale = {
      id: `TXN-${Date.now()}`,
      receiptNo: `RCP-${Date.now().toString().slice(-6)}`,
      customer: customerName || "Walk-in Customer",
      items: cart,
      subtotal,
      tax,
      discount: discountAmt,
      total,
      paymentMode,
      date: new Date().toLocaleString(),
    };
    const updatedSales = [sale, ...salesHistory];
    persistSales.mutate(updatedSales);
    setLastReceipt(sale);
    setIsReceiptOpen(true);
    setCart([]);
    setCustomerName("");
    setDiscountPct(0);
    toast.success(`Sale of ${formatSystemAmount(total, sysConfig?.currency)} recorded!`);
  }

  function addProduct() {
    if (!newProduct.name.trim()) return toast.error("Product name is required");
    const p: PosProduct = { ...newProduct, id: `prd-${Date.now()}` };
    persistProducts.mutate([p, ...products]);
    setIsAddProductOpen(false);
    setNewProduct({ name: "", price: 0, category: "Services", sku: "", stock: 999 });
    toast.success(`Product "${p.name}" added to catalog!`);
  }

  return (
    <PlanGuard moduleName="Point of Sale (POS)" requiredPlan="starter">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <ShoppingCart className="size-6 text-primary" /> Point of Sale (POS)
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Product catalog, cart management, GST billing & sales history.</p>
          </div>
        </div>

        <Tabs defaultValue="pos">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="pos" className="gap-1.5 text-xs"><ShoppingCart className="size-3.5" /> Sale Terminal</TabsTrigger>
            <TabsTrigger value="catalog" className="gap-1.5 text-xs"><Package className="size-3.5" /> Product Catalog</TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs"><History className="size-3.5" /> Sales History</TabsTrigger>
          </TabsList>

          {/* POS TERMINAL TAB */}
          <TabsContent value="pos" className="mt-4">
            <div className="grid lg:grid-cols-12 gap-4">
              {/* Product Grid */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products or SKU..." className="pl-9 text-xs" />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-36 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredProducts.map((p) => (
                    <Card key={p.id} onClick={() => addToCart(p)} className="p-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all space-y-1.5">
                      <div className="text-xs font-bold leading-tight">{p.name}</div>
                      <Badge variant="outline" className="text-[10px] font-mono">{p.category}</Badge>
                      <div className="flex items-center justify-between">
                        <div className="font-extrabold text-primary text-sm">{formatSystemAmount(p.price, sysConfig?.currency)}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{p.sku}</div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Cart Panel */}
              <div className="lg:col-span-5 space-y-3">
                <Card className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm flex items-center gap-2">
                      <ShoppingCart className="size-4 text-primary" /> Cart ({cart.length} items)
                    </h3>
                    {cart.length > 0 && (
                      <Button variant="ghost" size="sm" className="text-xs text-destructive h-7" onClick={() => setCart([])}>
                        Clear All
                      </Button>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Customer Name</Label>
                    <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Walk-in Customer" className="text-xs h-8" />
                  </div>

                  {cart.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-xs">
                      <ShoppingCart className="size-8 mx-auto opacity-20 mb-2" />
                      <p>Click products to add to cart</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-44 overflow-y-auto">
                      {cart.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/40 border">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold truncate">{item.name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{formatSystemAmount(item.price, sysConfig?.currency)} each</div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="icon" variant="ghost" className="size-6" onClick={() => updateQty(item.id, -1)}><Minus className="size-3" /></Button>
                            <span className="text-xs font-bold w-5 text-center">{item.qty}</span>
                            <Button size="icon" variant="ghost" className="size-6" onClick={() => updateQty(item.id, 1)}><Plus className="size-3" /></Button>
                            <Button size="icon" variant="ghost" className="size-6 text-destructive" onClick={() => removeFromCart(item.id)}><Trash2 className="size-3" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Order Summary */}
                  <div className="border-t pt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatSystemAmount(subtotal, sysConfig?.currency)}</span></div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Discount (%)</span>
                      <Input type="number" value={discountPct} onChange={(e) => setDiscountPct(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))} className="h-6 w-16 text-xs text-right" />
                    </div>
                    {discountAmt > 0 && <div className="flex justify-between text-green-600 font-semibold"><span>Discount</span><span>-{formatSystemAmount(discountAmt, sysConfig?.currency)}</span></div>}
                    <div className="flex justify-between text-muted-foreground"><span>GST (18%)</span><span>{formatSystemAmount(tax, sysConfig?.currency)}</span></div>
                    <div className="flex justify-between font-extrabold text-base border-t pt-2"><span>Total</span><span className="text-primary">{formatSystemAmount(total, sysConfig?.currency)}</span></div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Payment Mode</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {PAYMENT_MODES.map((m) => (
                        <button key={m} onClick={() => setPaymentMode(m)} className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${paymentMode === m ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/50"}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button onClick={handleCheckout} disabled={cart.length === 0 || persistSales.isPending} className="w-full font-bold gap-2 h-11">
                    {persistSales.isPending ? <Loader2 className="size-4 animate-spin" /> : <Receipt className="size-4" />}
                    Checkout — {formatSystemAmount(total, sysConfig?.currency)}
                  </Button>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* PRODUCT CATALOG TAB */}
          <TabsContent value="catalog" className="mt-4 space-y-3">
            <div className="flex justify-between items-center">
              <div className="text-sm font-bold">{products.length} Products in Catalog</div>
              <Button size="sm" onClick={() => setIsAddProductOpen(true)} className="gap-1.5 text-xs font-bold">
                <Plus className="size-4" /> Add Product
              </Button>
            </div>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-xs">
                <thead className="bg-secondary/50 text-muted-foreground">
                  <tr>
                    {["SKU", "Product Name", "Category", "Price", "Stock", ""].map((h) => (
                      <th key={h} className="p-2.5 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-t hover:bg-secondary/20">
                      <td className="p-2.5 font-mono text-muted-foreground">{p.sku}</td>
                      <td className="p-2.5 font-bold">{p.name}</td>
                      <td className="p-2.5"><Badge variant="outline" className="text-[10px]">{p.category}</Badge></td>
                      <td className="p-2.5 font-mono font-bold text-primary">{formatSystemAmount(p.price, sysConfig?.currency)}</td>
                      <td className="p-2.5 text-muted-foreground">{p.stock}</td>
                      <td className="p-2.5">
                        <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => persistProducts.mutate(products.filter((x) => x.id !== p.id))}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* SALES HISTORY TAB */}
          <TabsContent value="history" className="mt-4 space-y-3">
            <div className="text-sm font-bold">{salesHistory.length} Transactions</div>
            {salesHistory.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <History className="size-10 mx-auto opacity-20 mb-2" />
                <p className="text-sm font-bold">No sales recorded yet</p>
                <p className="text-xs">Complete a checkout to see transaction history</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/50 text-muted-foreground">
                    <tr>{["Receipt #", "Customer", "Items", "Total", "Payment", "Date"].map((h) => <th key={h} className="p-2.5 text-left font-semibold">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {salesHistory.map((s) => (
                      <tr key={s.id} className="border-t hover:bg-secondary/20">
                        <td className="p-2.5 font-mono font-bold">{s.receiptNo}</td>
                        <td className="p-2.5 font-semibold">{s.customer}</td>
                        <td className="p-2.5 text-muted-foreground">{s.items.length} items</td>
                        <td className="p-2.5 font-extrabold text-primary">{formatSystemAmount(s.total, sysConfig?.currency)}</td>
                        <td className="p-2.5"><Badge variant="outline" className="text-[10px]">{s.paymentMode}</Badge></td>
                        <td className="p-2.5 text-muted-foreground">{s.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Print Receipt Modal */}
        <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
          <DialogContent className="sm:max-w-[360px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="size-5 text-primary" /> Sale Receipt
              </DialogTitle>
            </DialogHeader>
            {lastReceipt && (
              <div className="space-y-3 py-2 text-xs font-mono">
                <div className="text-center space-y-0.5 border-b pb-3">
                  <div className="font-extrabold text-base text-primary">{sysConfig?.appName || "Master ERP"}</div>
                  <div className="text-muted-foreground">{lastReceipt.date}</div>
                  <div className="font-bold">Receipt #{lastReceipt.receiptNo}</div>
                </div>
                <div className="text-muted-foreground">Customer: <span className="text-foreground font-bold">{lastReceipt.customer}</span></div>
                <div className="space-y-1 border-y py-2">
                  {lastReceipt.items.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span>{item.name} x{item.qty}</span>
                      <span>{formatSystemAmount(item.price * item.qty, sysConfig?.currency)}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatSystemAmount(lastReceipt.subtotal, sysConfig?.currency)}</span></div>
                  {lastReceipt.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatSystemAmount(lastReceipt.discount, sysConfig?.currency)}</span></div>}
                  <div className="flex justify-between text-muted-foreground"><span>GST 18%</span><span>{formatSystemAmount(lastReceipt.tax, sysConfig?.currency)}</span></div>
                  <div className="flex justify-between font-extrabold text-sm border-t pt-1.5"><span>TOTAL</span><span className="text-primary">{formatSystemAmount(lastReceipt.total, sysConfig?.currency)}</span></div>
                </div>
                <div className="text-center text-[10px] text-muted-foreground border-t pt-2">
                  Payment: {lastReceipt.paymentMode} • Thank you for your business!
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReceiptOpen(false)}>Close</Button>
              <Button onClick={() => { toast.success("Receipt sent to printer!"); setIsReceiptOpen(false); }} className="gap-2 font-bold">
                <Printer className="size-4" /> Print Receipt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Product Modal */}
        <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
          <DialogContent className="sm:max-w-[380px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="size-5 text-primary" /> Add New Product
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1"><Label className="text-xs font-semibold">Product Name *</Label><Input value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="e.g. Premium Support Plan" className="text-xs" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs font-semibold">Price (₹)</Label><Input type="number" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })} className="text-xs" /></div>
                <div className="space-y-1"><Label className="text-xs font-semibold">SKU</Label><Input value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} placeholder="POS-007" className="text-xs" /></div>
              </div>
              <div className="space-y-1"><Label className="text-xs font-semibold">Category</Label>
                <Select value={newProduct.category} onValueChange={(v) => setNewProduct({ ...newProduct, category: v })}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddProductOpen(false)}>Cancel</Button>
              <Button onClick={addProduct} disabled={persistProducts.isPending} className="font-bold gap-2">
                {persistProducts.isPending && <Loader2 className="size-4 animate-spin" />} Add Product
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PlanGuard>
  );
}
