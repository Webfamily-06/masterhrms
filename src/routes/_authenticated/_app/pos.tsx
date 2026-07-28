import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, DollarSign, Printer, Search, Sparkles, CheckCircle2, UserCheck } from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";
import { PlanGuard, PlanLimitBar } from "@/components/plan-guard";

export const Route = createFileRoute("/_authenticated/_app/pos")({
  component: PosPage,
  head: () => ({ meta: [{ title: "Point of Sale (POS) — Master ERP" }] }),
});

const DEFAULT_PRODUCTS = [
  { id: "1", name: "Enterprise SaaS License", price: 4999, category: "Software", sku: "POS-001" },
  { id: "2", name: "Biometric Hardware Scanner", price: 12499, category: "Hardware", sku: "POS-002" },
  { id: "3", name: "Thermal Receipt Printer", price: 3499, category: "Hardware", sku: "POS-003" },
  { id: "4", name: "Cloud Backup Addon", price: 999, category: "Addon", sku: "POS-004" },
  { id: "5", name: "Implementation Consulting (1hr)", price: 2500, category: "Services", sku: "POS-005" },
  { id: "6", name: "Custom API Integration", price: 8999, category: "Services", sku: "POS-006" },
];

function PosPage() {
  const [cart, setCart] = useState<{ id: string; name: string; price: number; qty: number }[]>([]);
  const [search, setSearch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [paymentMode, setPaymentMode] = useState<"cash" | "card" | "upi">("card");
  const [lastReceipt, setLastReceipt] = useState<any | null>(null);

  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-platform-settings").maybeSingle();
      return data?.content as any;
    },
  });

  const filteredProducts = DEFAULT_PRODUCTS.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())
  );

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const tax = Math.round(subtotal * 0.18); // 18% GST
  const total = subtotal + tax;

  function addToCart(p: typeof DEFAULT_PRODUCTS[0]) {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === p.id);
      if (existing) {
        return prev.map((item) => (item.id === p.id ? { ...item, qty: item.qty + 1 } : item));
      }
      return [...prev, { id: p.id, name: p.name, price: p.price, qty: 1 }];
    });
  }

  function updateQty(id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
        .filter((item) => item.qty > 0)
    );
  }

  function checkout() {
    if (cart.length === 0) return toast.error("Cart is empty");
    const receipt = {
      id: `INV-POS-${Math.floor(100000 + Math.random() * 900000)}`,
      customer: customerName || "Walk-in Customer",
      items: cart,
      subtotal,
      tax,
      total,
      mode: paymentMode,
      date: new Date().toLocaleString(),
    };
    setLastReceipt(receipt);
    toast.success(`Checkout Complete! ${formatSystemAmount(total, sysConfig)} paid via ${paymentMode.toUpperCase()}`);
    setCart([]);
    setCustomerName("");
  }

  return (
    <PlanGuard moduleName="Point of Sale (POS)" requiredPlan="starter">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight">POS Terminal</h1>
              <Badge variant="secondary" className="font-mono text-xs">
                Free Addon Active
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Instant cashier checkout, barcode billing & receipt printer interface.</p>
          </div>
          <div className="flex items-center gap-3">
            <PlanLimitBar used={cart.length} limit={50} label="Cart Items" />
          </div>
        </div>

        {/* POS Grid: Left Products Catalog, Right Cart Checkout */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Column: Products Grid */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                placeholder="Search products, hardware, services or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-card"
              />
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredProducts.map((p) => (
                <Card
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="cursor-pointer hover:border-primary/60 hover:shadow-md transition-all group"
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <Badge variant="outline" className="text-[9px] font-mono">
                        {p.category}
                      </Badge>
                      <span className="text-[10px] font-mono text-muted-foreground">{p.sku}</span>
                    </div>
                    <h3 className="font-bold text-xs line-clamp-1 group-hover:text-primary transition-colors">{p.name}</h3>
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-mono font-black text-sm text-emerald-600">{formatSystemAmount(p.price, sysConfig)}</span>
                      <Button size="icon" variant="ghost" className="size-7 rounded-full group-hover:bg-primary group-hover:text-white">
                        <Plus className="size-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Right Column: Active Cart & Checkout */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="shadow-lg border-primary/20">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShoppingCart className="size-4 text-primary" /> Active Cart
                  </span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {cart.reduce((a, b) => a + b.qty, 0)} Items
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Cart Items List */}
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {cart.length === 0 ? (
                    <div className="py-12 text-center text-xs text-muted-foreground space-y-1">
                      <ShoppingCart className="size-8 mx-auto opacity-30" />
                      <p>Click products on left to add to bill</p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2.5 rounded-xl border bg-secondary/30 text-xs">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-bold truncate">{item.name}</p>
                          <p className="text-[10px] font-mono text-muted-foreground">
                            {formatSystemAmount(item.price, sysConfig)} x {item.qty}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button size="icon" variant="outline" className="size-6" onClick={() => updateQty(item.id, -1)}>
                            <Minus className="size-3" />
                          </Button>
                          <span className="font-mono font-bold w-4 text-center">{item.qty}</span>
                          <Button size="icon" variant="outline" className="size-6" onClick={() => updateQty(item.id, 1)}>
                            <Plus className="size-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="size-6 text-destructive" onClick={() => updateQty(item.id, -item.qty)}>
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Customer & Payment Mode */}
                <div className="space-y-3 pt-2 border-t">
                  <Input
                    placeholder="Customer Name (Optional)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-9 text-xs"
                  />

                  <div className="grid grid-cols-3 gap-2">
                    {(["card", "upi", "cash"] as const).map((mode) => (
                      <Button
                        key={mode}
                        type="button"
                        variant={paymentMode === mode ? "default" : "outline"}
                        size="sm"
                        className="text-xs font-bold uppercase"
                        onClick={() => setPaymentMode(mode)}
                      >
                        {mode}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Total Summary */}
                <div className="space-y-1.5 p-3 rounded-xl bg-secondary/40 border text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatSystemAmount(subtotal, sysConfig)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>GST (18%)</span>
                    <span className="font-mono">{formatSystemAmount(tax, sysConfig)}</span>
                  </div>
                  <div className="flex justify-between text-base font-black pt-1 border-t">
                    <span>Total Pay</span>
                    <span className="font-mono text-emerald-600">{formatSystemAmount(total, sysConfig)}</span>
                  </div>
                </div>

                <Button size="lg" onClick={checkout} className="w-full font-bold h-11 gap-2" style={{ background: "linear-gradient(135deg, #10b981, #0d9488)" }}>
                  <CreditCard className="size-4" /> Charge {formatSystemAmount(total, sysConfig)}
                </Button>
              </CardContent>
            </Card>

            {/* Receipt Modal Preview */}
            {lastReceipt && (
              <Card className="bg-emerald-500/5 border-emerald-500/30">
                <CardContent className="p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-emerald-600">
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4" /> Last Receipt Printed</span>
                    <span className="font-mono">{lastReceipt.id}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-[11px]">
                    <span>{lastReceipt.customer}</span>
                    <span>{lastReceipt.date}</span>
                  </div>
                  <div className="flex justify-between font-black text-sm pt-1 border-t border-emerald-500/20">
                    <span>Paid ({lastReceipt.mode.toUpperCase()})</span>
                    <span className="font-mono text-emerald-600">{formatSystemAmount(lastReceipt.total, sysConfig)}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PlanGuard>
  );
}
