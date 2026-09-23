import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CartDrawer, CartItem } from "@/components/storefront/cart-drawer";
import { toast } from "sonner";
import {
  ShoppingBag,
  Search,
  SlidersHorizontal,
  Tag,
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  PhoneCall,
  Laptop,
  Shirt,
  Wrench,
  Layers,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/store")({
  component: PublicStorefrontPage,
});

const DEFAULT_CATALOG: CartItem[] = [
  {
    id: "p-1",
    name: "ZKTeco Biometric Time & Attendance Terminal (Fingerprint + RFID)",
    sku: "ZK-BIO-U300",
    price: 14500,
    quantity: 1,
    category: "Hardware & Devices",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=60",
  },
  {
    id: "p-2",
    name: "80mm High-Speed Thermal Receipt Printer (USB + Ethernet + Serial)",
    sku: "THM-PRT-80M",
    price: 6800,
    quantity: 1,
    category: "Hardware & Devices",
    image: "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=500&auto=format&fit=crop&q=60",
  },
  {
    id: "p-3",
    name: "Heavy Duty 5-Bill Electronic Cash Drawer with RJ11 Trigger Kick",
    sku: "DRW-RJ11-5B",
    price: 4200,
    quantity: 1,
    category: "Hardware & Devices",
    image: "https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=500&auto=format&fit=crop&q=60",
  },
  {
    id: "p-4",
    name: "Omnidirectional 2D QR & Barcode Desktop Scanner (Handsfree)",
    sku: "SCN-2D-DESK",
    price: 5400,
    quantity: 1,
    category: "Hardware & Devices",
    image: "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=500&auto=format&fit=crop&q=60",
  },
  {
    id: "p-5",
    name: "Corporate Executive Oxford Dress Shirt (Tailored Staff Apparel)",
    sku: "APP-OXF-WHT",
    price: 1850,
    quantity: 1,
    category: "Retail & Apparel",
    image: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=500&auto=format&fit=crop&q=60",
  },
  {
    id: "p-6",
    name: "Ergonomic Mesh Office Executive Chair with Lumbar Support",
    sku: "OFF-CHR-MESH",
    price: 8900,
    quantity: 1,
    category: "Office & Facilities",
    image: "https://images.unsplash.com/photo-1580481077195-c3a821a58875?w=500&auto=format&fit=crop&q=60",
  },
  {
    id: "p-7",
    name: "Enterprise Multi-Outlet POS Software Cloud License (Annual)",
    sku: "LIC-POS-CLOUD",
    price: 24000,
    quantity: 1,
    category: "Software & Services",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&auto=format&fit=crop&q=60",
  },
  {
    id: "p-8",
    name: "Smart Dual-Screen Customer Facing Display Tablet (10.1 inch IPS)",
    sku: "DSP-TAB-10IN",
    price: 11200,
    quantity: 1,
    category: "Hardware & Devices",
    image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&auto=format&fit=crop&q=60",
  },
];

const CATEGORIES = [
  { id: "all", label: "All Products", icon: Layers },
  { id: "Hardware & Devices", label: "POS Hardware & Terminals", icon: Wrench },
  { id: "Retail & Apparel", label: "Staff Apparel & Uniforms", icon: Shirt },
  { id: "Office & Facilities", label: "Office & Facilities", icon: Laptop },
  { id: "Software & Services", label: "Software & Subscriptions", icon: Tag },
];

export default function PublicStorefrontPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Fetch real database products if available, fallback to catalog
  const { data: dbProducts = [] } = useQuery<CartItem[]>({
    queryKey: ["storefront-products"],
    queryFn: async () => {
      try {
        const res = await api.get("/products");
        const list = Array.isArray(res) ? res : res?.data || [];
        if (list.length > 0) {
          return list.map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku || "SKU-PROD",
            price: Number(p.salePrice || p.price || 1500),
            quantity: 1,
            category: p.category?.name || "General Goods",
            image: p.image || null,
          }));
        }
        return [];
      } catch {
        return [];
      }
    },
  });

  const catalog = dbProducts;

  const filteredProducts = useMemo(() => {
    return catalog.filter((prod: CartItem) => {
      const matchCat =
        selectedCategory === "all" ||
        prod.category?.toLowerCase() === selectedCategory.toLowerCase();
      const matchSearch =
        !searchQuery ||
        prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.sku.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [catalog, selectedCategory, searchQuery]);

  const totalCartCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);

  const handleAddToCart = (product: CartItem) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    toast.success(`Added "${product.name.slice(0, 30)}..." to cart!`);
  };

  const handleUpdateQty = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((i) => {
          if (i.id === id) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
    toast.info("Item removed from cart");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 flex flex-col justify-between">
      {/* 1. Announcement Topbar */}
      <div className="bg-zinc-900 text-zinc-300 text-xs py-2 px-4 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <span>Currency: <strong className="text-white font-mono">INR (₹)</strong></span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline text-emerald-400 font-semibold">✨ Nationwide Free Express Shipping on B2B Orders</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <PhoneCall className="size-3 text-primary" />
              <span>B2B Sales Desk: +91 44 2828 9000</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Storefront Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-border-color dark:border-zinc-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="size-9 rounded-lg bg-primary flex items-center justify-center text-white font-black text-lg shadow-sm">
              T
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-gray-900 dark:text-white">TSV Commerce</span>
              <span className="text-[10px] text-primary block font-mono font-semibold uppercase tracking-wider">Enterprise Storefront</span>
            </div>
          </Link>

          {/* Search Bar */}
          <div className="flex-1 max-w-md relative hidden sm:block">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search POS hardware, terminals, uniforms, supplies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 text-xs rounded-full border border-border-color dark:border-zinc-700 bg-gray-50/80 dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Actions: Portal / App & Cart Trigger */}
          <div className="flex items-center gap-3">
            <Link
              to="/pos"
              className="text-xs font-semibold text-muted-foreground hover:text-primary hidden md:inline-flex items-center gap-1"
            >
              POS Register <ArrowRight className="size-3" />
            </Link>

            <Button
              onClick={() => setIsCartOpen(true)}
              className="relative gap-2 h-9 text-xs font-bold rounded-full bg-primary hover:bg-primary/90 text-white shadow-sm"
            >
              <ShoppingBag className="size-4" />
              <span className="hidden sm:inline">Cart</span>
              {totalCartCount > 0 && (
                <span className="size-5 rounded-full bg-white text-primary text-[10px] font-black flex items-center justify-center shrink-0">
                  {totalCartCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* 3. Hero Promo Banner */}
      <section className="bg-gradient-to-r from-blue-900 via-indigo-900 to-zinc-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/20 text-blue-300 border border-blue-400/30">
              <Sparkles className="size-3.5" /> B2B Multi-Outlet Retail Hardware & Catalog
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Enterprise Storefront & POS Peripherals
            </h1>
            <p className="text-sm text-zinc-300">
              Direct source procurement for biometric time clocks, thermal receipt printers, cash drawers, and retail hardware.
            </p>
          </div>
          <div className="flex gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur border border-white/10 text-center space-y-1">
              <ShieldCheck className="size-5 mx-auto text-emerald-400" />
              <span className="font-bold block">3-Year Warranty</span>
              <span className="text-[10px] text-zinc-300">On all terminals</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur border border-white/10 text-center space-y-1">
              <Truck className="size-5 mx-auto text-blue-400" />
              <span className="font-bold block">Next-Day Dispatch</span>
              <span className="text-[10px] text-zinc-300">Direct warehouse push</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Category Filter Buttons */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory.toLowerCase() === cat.id.toLowerCase();
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-primary text-white shadow-sm"
                    : "bg-white dark:bg-zinc-900 border border-border-color dark:border-zinc-800 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. Product Grid */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-16 flex-1">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">
              {selectedCategory === "all" ? "All Catalog Items" : selectedCategory}
            </h3>
            <p className="text-xs text-muted-foreground">Showing {filteredProducts.length} verified products</p>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <ShoppingBag className="size-12 mx-auto text-muted-foreground/40" />
            <p className="text-sm font-semibold text-muted-foreground">No products found matching your filter.</p>
            <Button variant="outline" size="sm" onClick={() => { setSelectedCategory("all"); setSearchQuery(""); }}>
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                className="group bg-white dark:bg-zinc-900 border border-border-color dark:border-zinc-800 rounded-lg overflow-hidden shadow-xs hover:shadow-md hover:border-primary/50 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="h-44 bg-gray-100 dark:bg-zinc-800/60 overflow-hidden relative">
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                       loading="lazy"/>
                    ) : (
                      <div className="size-full flex items-center justify-center text-muted-foreground/30">
                        <ShoppingBag className="size-12" />
                      </div>
                    )}
                    <span className="absolute top-2.5 left-2.5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/90 dark:bg-zinc-900/90 text-gray-900 dark:text-white backdrop-blur shadow-xs">
                      {p.category}
                    </span>
                  </div>

                  <div className="p-4 space-y-2">
                    <span className="text-[10px] font-mono text-muted-foreground block">{p.sku}</span>
                    <h4 className="font-bold text-xs text-gray-900 dark:text-white line-clamp-2 leading-relaxed">
                      {p.name}
                    </h4>
                  </div>
                </div>

                <div className="p-4 pt-0 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-lg font-black text-primary font-mono">₹{p.price.toLocaleString()}</span>
                      <span className="text-[10px] text-muted-foreground block">+18% GST</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      In Stock
                    </span>
                  </div>

                  <Button
                    onClick={() => handleAddToCart(p)}
                    className="w-full gap-2 text-xs font-bold h-9 bg-gray-900 hover:bg-gray-800 text-white dark:bg-primary dark:hover:bg-primary/90"
                  >
                    <ShoppingBag className="size-3.5" />
                    <span>Add to Cart</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 6. Footer */}
      <footer className="bg-white dark:bg-zinc-900 border-t border-border-color dark:border-zinc-800 py-8 px-4 text-xs text-muted-foreground text-center">
        <p>© 2026 TSV Global Solutions Pvt Ltd. Built with Stocky Multi-Outlet Architecture standard.</p>
      </footer>

      {/* Flyout Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onClearCart={() => setCartItems([])}
      />
    </div>
  );
}
