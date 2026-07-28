import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, Search, Tag, DollarSign, Layers } from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";
import { PlanGuard, PlanLimitBar } from "@/components/plan-guard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/products")({
  component: ProductsPage,
  head: () => ({ meta: [{ title: "Products & Services — Master ERP" }] }),
});

const INITIAL_ITEMS = [
  { id: "PRD-01", name: "Enterprise ERP Cloud License", category: "Software", price: 4999, stock: 999, sku: "SKU-ERP-01" },
  { id: "PRD-02", name: "Biometric Fingerprint Scanner", category: "Hardware", price: 12499, stock: 45, sku: "SKU-BIO-02" },
  { id: "PRD-03", name: "Thermal Receipt Printer", category: "Hardware", price: 3499, stock: 18, sku: "SKU-PRN-03" },
  { id: "PRD-04", name: "Custom API Development (10 Hours)", category: "Services", price: 15000, stock: 50, sku: "SKU-SRV-04" },
  { id: "PRD-05", name: "WhatsApp Notification Gateway Addon", category: "Addon", price: 999, stock: 999, sku: "SKU-WA-05" },
];

function ProductsPage() {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Software");
  const [price, setPrice] = useState("");

  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-platform-settings").maybeSingle();
      return data?.content as any;
    },
  });

  const filtered = items.filter(
    (i) => i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase())
  );

  function addProduct() {
    if (!name || !price) return toast.error("Please fill in item name and price");
    const p = parseFloat(price);
    if (isNaN(p) || p <= 0) return toast.error("Invalid price");

    const newItem = {
      id: `PRD-${Math.floor(10 + Math.random() * 90)}`,
      name,
      category,
      price: p,
      stock: 100,
      sku: `SKU-${category.substring(0, 3).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`,
    };
    setItems([...items, newItem]);
    toast.success(`Product "${name}" added to catalog!`);
    setName("");
    setPrice("");
  }

  return (
    <PlanGuard moduleName="Products & Services Catalog" requiredPlan="free">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Package className="size-6 text-primary" /> Products & Services Catalog
            </h1>
            <p className="text-xs text-muted-foreground">Inventory master, service rate cards, SKUs & product pricing database.</p>
          </div>
          <div className="flex items-center gap-3">
            <PlanLimitBar used={items.length} limit={100} label="Product Catalog Capacity" />
          </div>
        </div>

        {/* Add Product & Catalog Table */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Add Item Form */}
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle className="text-base">Add New Item / Service</CardTitle>
              <CardDescription className="text-xs">Register new inventory SKU or billing service.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Item / Service Title *</label>
                <Input placeholder="e.g. Payroll Audit Service" value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-xs" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Category</label>
                <Input placeholder="Software, Hardware, Services..." value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 text-xs" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Price ({sysConfig?.currencySymbol || "₹"}) *</label>
                <Input type="number" placeholder="4999" value={price} onChange={(e) => setPrice(e.target.value)} className="h-9 text-xs font-mono" />
              </div>

              <Button size="lg" onClick={addProduct} className="w-full font-bold gap-2">
                <Plus className="size-4" /> Save to Catalog
              </Button>
            </CardContent>
          </Card>

          {/* Catalog List */}
          <Card className="lg:col-span-8">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Product Inventory ({items.length})</CardTitle>
                <CardDescription className="text-xs">Active products & services available for Invoices & POS.</CardDescription>
              </div>
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
                <Input placeholder="Search catalog..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs bg-card" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y text-xs">
                {filtered.map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] font-mono">
                          {item.sku}
                        </Badge>
                        <Badge className="text-[9px] font-mono">{item.category}</Badge>
                      </div>
                      <p className="font-bold text-foreground text-sm">{item.name}</p>
                    </div>

                    <div className="text-right">
                      <p className="font-mono font-black text-sm text-emerald-600">{formatSystemAmount(item.price, sysConfig)}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">Stock: {item.stock} units</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PlanGuard>
  );
}
