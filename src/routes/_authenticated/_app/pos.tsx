import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { PlanGuard } from "@/components/plan-guard";
import { formatSystemAmount, type SystemCurrencySettings } from "@/lib/currency";
import { generateBarcodeSvg, playScannerBeep } from "@/lib/barcode";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Printer,
  Search,
  Package,
  Loader2,
  Receipt,
  History,
  Barcode,
  PauseCircle,
  PlayCircle,
  BarChart3,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  X,
  Keyboard,
  Wifi,
  WifiOff,
  RefreshCw,
  Camera,
  Download,
  Copy,
  Sliders,
  CheckCircle2,
  Sparkles,
  QrCode,
  ScanLine,
} from "lucide-react";
import type { Product } from "./products";

export const Route = createFileRoute("/_authenticated/_app/pos")({
  component: PosPage,
  head: () => ({ meta: [{ title: "Point of Sale (POS) & Barcode Hub — Master ERP" }] }),
});

export type CartItem = {
  id: string;
  name: string;
  sku?: string;
  hsn_sac?: string;
  unit?: string;
  price: number;
  qty: number;
  quantity?: number;
  gst_rate: number;
  stock?: number;
};

export type PosSale = {
  id: string;
  receiptNo: string;
  customer: string;
  customerName?: string;
  customerGstin?: string;
  paymentMode: string;
  items: CartItem[];
  subtotal: number;
  discountPct?: number;
  discountAmt: number;
  taxMode?: "igst" | "sgst_cgst";
  taxBase?: number;
  igst: number;
  cgst: number;
  sgst: number;
  total: number;
  cashier?: string;
  date: string;
  completedAt?: string;
};

export type HeldOrder = {
  id: string;
  name: string;
  label?: string;
  savedAt: string;
  heldAt?: string;
  customer: string;
  customerName?: string;
  cart: CartItem[];
  items?: CartItem[];
  paymentMode?: string;
  taxMode?: "igst" | "sgst_cgst";
  discountPct?: number;
};

const DEFAULT_PRODUCTS: Product[] = [
  { id: "prd-1", name: "Enterprise ERP Server Appliance", price: 45000, stock: 24, sku: "PRD-94821", hsn_sac: "8471", gst_rate: 18, unit: "Pcs", low_stock_threshold: 5, category: "Hardware", description: "Dedicated on-premises ERP node" },
  { id: "prd-2", name: "Biometric AI Terminal", price: 14500, stock: 42, sku: "PRT-38192", hsn_sac: "8471", gst_rate: 18, unit: "Pcs", low_stock_threshold: 5, category: "Hardware", description: "Infrared face & finger terminal" },
  { id: "prd-3", name: "Thermal Receipt Printer 80mm", price: 6800, stock: 15, sku: "PRD-59302", hsn_sac: "8443", gst_rate: 18, unit: "Pcs", low_stock_threshold: 3, category: "Hardware", description: "USB + Ethernet POS thermal printer" },
  { id: "prd-4", name: "Handheld Laser Barcode Scanner", price: 2900, stock: 30, sku: "PRD-10294", hsn_sac: "8471", gst_rate: 18, unit: "Pcs", low_stock_threshold: 5, category: "Hardware", description: "High-speed 1D/2D USB barcode reader" },
  { id: "prd-5", name: "ERP Implementation & Setup", price: 25000, stock: 999, sku: "SRV-10294", hsn_sac: "998314", gst_rate: 18, unit: "Hr", low_stock_threshold: 0, category: "Services", description: "Consultation and deployment" },
];

function fmt(n: number, cfg?: any): string {
  return formatSystemAmount(n, cfg);
}

function computeTax(base: number, discountAmt: number, taxMode: "igst" | "sgst_cgst", items: CartItem[]) {
  const discounted = Math.max(0, base - discountAmt);
  let igst = 0, cgst = 0, sgst = 0;
  const taxBase = discounted;

  items.forEach((item) => {
    const itemNet = (item.price * item.qty) - (item.qty / (items.reduce((s, i) => s + i.qty, 0) || 1)) * discountAmt;
    const net = Math.max(0, itemNet);
    const rate = item.gst_rate;
    if (taxMode === "igst") {
      igst += Math.round(net * (rate / 100));
    } else {
      cgst += Math.round(net * ((rate / 2) / 100));
      sgst += Math.round(net * ((rate / 2) / 100));
    }
  });
  const totalTax = taxMode === "igst" ? igst : cgst + sgst;
  return { igst, cgst, sgst, total: Math.round(taxBase + totalTax) };
}

function PosPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";

  const PRODUCTS_SLUG = `tenant-${tenantId}-catalog-items-v2`;
  const LEGACY_PRODUCTS_SLUG = `system-products-catalog-${tenantId}`;

  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [customerName, setCustomerName] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [paymentMode, setPaymentMode] = useState("Card");
  const [discountPct, setDiscountPct] = useState(0);
  const [taxMode, setTaxMode] = useState<"igst" | "sgst_cgst">("sgst_cgst");
  const [lastReceipt, setLastReceipt] = useState<PosSale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isHeldOpen, setIsHeldOpen] = useState(false);
  const [holdName, setHoldName] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeRef = useRef<HTMLInputElement>(null);

  // Barcode Studio & Generator State
  const [isBarcodeStudioOpen, setIsBarcodeStudioOpen] = useState(false);
  const [selectedBarcodeProduct, setSelectedBarcodeProduct] = useState<string>("all");
  const [barcodeCopies, setBarcodeCopies] = useState<number>(24);
  const [showPriceOnLabel, setShowPriceOnLabel] = useState<boolean>(true);
  const [showStoreOnLabel, setShowStoreOnLabel] = useState<boolean>(true);

  // Camera Barcode Scanner State
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Offline Cache & Local Sync Engine
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [offlineQueue, setOfflineQueue] = useState<PosSale[]>(() => {
    try {
      const stored = localStorage.getItem(`pos_offline_sales_${tenantId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Listen for online/offline events & auto-sync
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      toast.success("🌐 Network connection restored!");
      try {
        const stored = localStorage.getItem(`pos_offline_sales_${tenantId}`);
        const queue: PosSale[] = stored ? JSON.parse(stored) : [];
        if (queue.length > 0) {
          toast.info(`Syncing ${queue.length} offline sale(s) to server...`);
          for (const sale of queue) {
            await api.post("/invoices/pos/sales", sale);
          }
          localStorage.removeItem(`pos_offline_sales_${tenantId}`);
          setOfflineQueue([]);
          qc.invalidateQueries({ queryKey: ["pos-sales", tenantId] });
          toast.success(`✓ All ${queue.length} offline sale(s) synced to database!`);
        }
      } catch (err: any) {
        toast.error("Offline sync partially failed: " + err.message);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("📡 Offline mode active. Sales will be safely cached locally.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [tenantId, qc]);

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

  // Load products from catalog (merges catalog-items-v2 and legacy catalog)
  const { data: products = DEFAULT_PRODUCTS } = useQuery({
    queryKey: ["pos-products-catalog", tenantId],
    queryFn: async () => {
      try {
        const pageV2 = await api.get(`/cms/pages/${PRODUCTS_SLUG}`);
        if (pageV2?.content && Array.isArray(pageV2.content) && pageV2.content.length > 0) {
          return pageV2.content.map((item: any) => ({
            id: item.id,
            name: item.name,
            price: Number(item.salePrice ?? item.price ?? 0),
            stock: Number(item.quantity ?? item.stock ?? 0),
            sku: item.sku || `PRD-${item.id}`,
            hsn_sac: item.hsn_sac || "8471",
            gst_rate: Number(item.taxRate ?? item.gst_rate ?? 18),
            unit: item.unit || "Pcs",
            low_stock_threshold: 5,
            category: item.categoryName || item.category || "General",
            description: item.shortDescription || item.description || "",
            salePrice: Number(item.salePrice ?? item.price ?? 0),
            image: item.image,
          })) as Product[];
        }

        const pageLegacy = await api.get(`/cms/pages/${LEGACY_PRODUCTS_SLUG}`);
        if (pageLegacy?.content && Array.isArray(pageLegacy.content)) {
          return pageLegacy.content as Product[];
        }

        return DEFAULT_PRODUCTS;
      } catch {
        return DEFAULT_PRODUCTS;
      }
    },
  });

  // Sales history
  const { data: salesHistory = [] } = useQuery({
    queryKey: ["pos-sales", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/invoices/pos/sales");
        return Array.isArray(res) ? (res as PosSale[]) : [];
      } catch {
        return [] as PosSale[];
      }
    },
  });

  // Held orders
  const { data: heldOrders = [] } = useQuery({
    queryKey: ["pos-held", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/invoices/pos/held");
        return Array.isArray(res) ? (res as HeldOrder[]) : [];
      } catch {
        return [] as HeldOrder[];
      }
    },
  });

  const persistSales = useMutation({
    mutationFn: async (list: PosSale[]) => {
      if (list.length > 0) {
        await api.post("/invoices/pos/sales", list[0]);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pos-sales", tenantId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const persistHeld = useMutation({
    mutationFn: async (list: HeldOrder[]) => {
      await api.post("/invoices/pos/held", { heldOrders: list });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pos-held", tenantId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  function addToCart(p: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === p.id);
      if (existing) return prev.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
      const itemPrice = Number((p as any).salePrice ?? p.price ?? 0);
      const itemTax = Number((p as any).taxRate ?? p.gst_rate ?? 18);
      return [...prev, { id: p.id, name: p.name, price: itemPrice, qty: 1, gst_rate: itemTax, hsn_sac: p.hsn_sac || "8471", unit: p.unit || "Pcs", sku: p.sku }];
    });
  }

  // Barcode scanner: match & add to cart with audio beep
  const handleBarcodeSearch = useCallback((skuQuery: string) => {
    const trimmed = skuQuery.trim().toUpperCase();
    if (!trimmed) return;

    const product = products.find(
      (p) =>
        (p.sku && p.sku.toUpperCase() === trimmed) ||
        (p.id && p.id.toUpperCase() === trimmed) ||
        (p.name && p.name.toUpperCase().includes(trimmed))
    );

    if (product) {
      playScannerBeep();
      addToCart(product);
      toast.success(`✓ [SCANNED] Added "${product.name}" to cart!`);
    } else {
      toast.error(`❌ No product found for Barcode/SKU: "${trimmed}"`);
    }
    setBarcodeInput("");
  }, [products]);

  // Hardware USB/Bluetooth Laser Scanner Auto-Detector
  useEffect(() => {
    let keyBuffer = "";
    let lastTime = Date.now();

    function onGlobalKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      // If user is focused on a normal text field or modal, allow normal typing
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        if (e.key === "F2") {
          e.preventDefault();
          barcodeRef.current?.focus();
        }
        return;
      }

      if (e.key === "F2") {
        e.preventDefault();
        barcodeRef.current?.focus();
        return;
      }

      const now = Date.now();
      if (now - lastTime > 120) {
        keyBuffer = ""; // Reset if typing slowly (human speed vs laser scanner burst)
      }
      lastTime = now;

      if (e.key === "Enter") {
        if (keyBuffer.length >= 3) {
          e.preventDefault();
          handleBarcodeSearch(keyBuffer);
          keyBuffer = "";
        }
      } else if (e.key.length === 1) {
        keyBuffer += e.key;
      }
    }

    window.addEventListener("keydown", onGlobalKeyDown);
    return () => window.removeEventListener("keydown", onGlobalKeyDown);
  }, [handleBarcodeSearch]);

  // Camera Barcode Scanner Controls
  async function startCameraScanner() {
    setIsCameraScannerOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setCameraStream(stream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      toast.error("Camera access denied or not available. Use manual SKU barcode search.");
    }
  }

  function stopCameraScanner() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
    setIsCameraScannerOpen(false);
  }

  const filteredProducts = useMemo(() =>
    products.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q));
      const matchCat = categoryFilter === "all" || p.category === categoryFilter;
      return matchSearch && matchCat;
    }), [products, search, categoryFilter]
  );

  const categories = useMemo(() => ["all", ...new Set(products.map((p) => p.category))], [products]);

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt = Math.round(subtotal * (discountPct / 100));
  const { igst, cgst, sgst, total } = computeTax(subtotal || 1, discountAmt, taxMode, cart.length ? cart : [{ price: 1, qty: 1, gst_rate: 18 } as any]);
  const realTax = cart.length ? computeTax(subtotal, discountAmt, taxMode, cart) : { igst: 0, cgst: 0, sgst: 0, total: 0 };

  function updateQty(id: string, delta: number) {
    setCart((prev) => prev.map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)));
  }

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }

  function handleCheckout() {
    if (cart.length === 0) return toast.error("Cart is empty");
    const sale: PosSale = {
      id: `SALE-${Date.now()}`,
      receiptNo: `POS-${Math.floor(100000 + Math.random() * 900000)}`,
      customer: customerName || "Walk-in Customer",
      customerGstin: customerGstin || undefined,
      paymentMode,
      items: cart,
      subtotal,
      discountPct,
      discountAmt,
      taxMode,
      taxBase: realTax.total - (realTax.igst + realTax.cgst + realTax.sgst),
      igst: realTax.igst,
      cgst: realTax.cgst,
      sgst: realTax.sgst,
      total: realTax.total,
      cashier: profile?.full_name || profile?.email || "Admin Cashier",
      date: new Date().toLocaleString("en-IN"),
    };

    if (!isOnline) {
      const updatedQueue = [sale, ...offlineQueue];
      setOfflineQueue(updatedQueue);
      localStorage.setItem(`pos_offline_sales_${tenantId}`, JSON.stringify(updatedQueue));
      setLastReceipt(sale);
      setIsReceiptOpen(true);
      setCart([]);
      setCustomerName("");
      setCustomerGstin("");
      setDiscountPct(0);
      toast.warning(`📡 Offline: Sale of ${fmt(realTax.total, sysConfig?.currency)} stored in local cache!`);
    } else {
      persistSales.mutate([sale, ...salesHistory]);
      setLastReceipt(sale);
      setIsReceiptOpen(true);
      setCart([]);
      setCustomerName("");
      setCustomerGstin("");
      setDiscountPct(0);
      toast.success(`Sale of ${fmt(realTax.total, sysConfig?.currency)} recorded!`);
    }
  }

  function holdOrder() {
    if (cart.length === 0) return toast.error("Cart is empty");
    const held: HeldOrder = {
      id: `HELD-${Date.now()}`,
      name: holdName || `Order #${heldOrders.length + 1}`,
      savedAt: new Date().toLocaleTimeString(),
      cart,
      customer: customerName,
    };
    persistHeld.mutate([held, ...heldOrders]);
    setCart([]);
    setCustomerName("");
    setHoldName("");
    setIsHeldOpen(false);
    toast.success(`Order "${held.name}" parked!`);
  }

  function recallOrder(held: HeldOrder) {
    setCart(held.cart);
    setCustomerName(held.customer);
    persistHeld.mutate(heldOrders.filter((o) => o.id !== held.id));
    toast.success(`"${held.name}" recalled to cart!`);
  }

  // Analytics
  const todaySales = useMemo(() => {
    const today = new Date().toLocaleDateString("en-IN");
    return salesHistory.filter((s) => s.date.startsWith(today.split(", ")[0]));
  }, [salesHistory]);

  const todayRevenue = todaySales.reduce((s, t) => s + t.total, 0);

  const barcodeItemsToPrint = useMemo(() => {
    if (selectedBarcodeProduct === "all") return products;
    return products.filter((p) => p.id === selectedBarcodeProduct);
  }, [products, selectedBarcodeProduct]);

  return (
    <PlanGuard moduleName="Point of Sale (POS)" requiredPlan="free">
      <div className="space-y-4 max-w-7xl pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <ShoppingCart className="size-6 text-primary" /> Point of Sale & Barcode Hub
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              High-speed barcode scanner, Code-128 label generator, offline cache, and instant GST tax invoice printing.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Barcode Label Studio Generator Button */}
            <Button
              onClick={() => setIsBarcodeStudioOpen(true)}
              className="h-9 text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              <Barcode className="size-4" /> Barcode Generator
            </Button>

            {/* Network Status Badge */}
            <Badge
              variant={isOnline ? "default" : "destructive"}
              className={`text-xs gap-1.5 font-bold py-1 px-2.5 ${isOnline ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"}`}
            >
              {isOnline ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
              {isOnline ? "Online Sync Active" : `Offline Cache (${offlineQueue.length})`}
            </Badge>

            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground bg-secondary/40 rounded-lg px-2.5 py-1.5 border">
              <Keyboard className="size-3.5 text-primary" />
              <span><kbd className="bg-background border rounded px-1 font-mono font-bold text-[10px]">F2</kbd> Scanner Focus</span>
            </div>
          </div>
        </div>

        {/* Sneat Pro POS Terminal & Inventory KPI Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Today's POS Sales", value: formatSystemAmount(salesHistory.reduce((acc, s) => acc + (s.total || 0), 0), sysConfig), desc: `From ${salesHistory.length} completed orders`, icon: ShoppingCart, color: "text-primary bg-primary/10" },
            { title: "Products in POS", value: `${products.length} Products`, desc: "Live retail barcode items", icon: Package, color: "text-[oklch(0.60_0.17_155)] bg-[oklch(0.60_0.17_155/0.10)]" },
            { title: "Terminal Sync", value: isOnline ? "Online Live" : `Offline (${offlineQueue.length})`, desc: "Port 4000 local sync", icon: Wifi, color: "text-[oklch(0.73_0.16_75)] bg-[oklch(0.73_0.16_75/0.10)]" },
            { title: "Active Categories", value: `${categories.length - 1} Categories`, desc: "Organized inventory catalog", icon: BarChart3, color: "text-[oklch(0.60_0.20_200)] bg-[oklch(0.60_0.20_200/0.10)]" },
          ].map((w) => (
            <Card key={w.title} className="border border-border/70 shadow-xs">
              <CardContent className="p-5 flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">{w.title}</span>
                  <h4 className="text-xl font-bold tracking-tight text-foreground">{w.value}</h4>
                  <p className="text-[11px] text-muted-foreground font-mono">{w.desc}</p>
                </div>
                <div className={cn("size-10 rounded-lg flex items-center justify-center shrink-0", w.color)}>
                  <w.icon className="size-5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="pos">
          <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:flex h-9 p-1 bg-muted/60">
            <TabsTrigger value="pos" className="gap-1.5 text-xs font-bold">
              <ShoppingCart className="size-3.5" /> Sale Terminal
            </TabsTrigger>
            <TabsTrigger value="catalog" className="gap-1.5 text-xs font-bold">
              <Package className="size-3.5" /> Catalog & Barcodes
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs font-bold">
              <History className="size-3.5" /> History ({salesHistory.length})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5 text-xs font-bold">
              <BarChart3 className="size-3.5" /> Analytics
            </TabsTrigger>
          </TabsList>

          {/* ===== TAB 1: POS TERMINAL ===== */}
          <TabsContent value="pos" className="mt-4">
            <div className="grid lg:grid-cols-12 gap-4">
              {/* Product Grid & Barcode Bar */}
              <div className="lg:col-span-7 space-y-3">
                {/* Barcode Scanner Input Bar with Camera Toggle */}
                <div className="flex items-center gap-2 p-2 border-2 border-indigo-500/30 rounded-xl bg-indigo-500/5 shadow-2xs">
                  <ScanLine className="size-4 text-indigo-600 animate-pulse shrink-0 ml-1" />
                  <Input
                    ref={barcodeRef}
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleBarcodeSearch(barcodeInput);
                    }}
                    placeholder="Scan barcode with laser gun or type SKU + Enter (F2)..."
                    className="border-0 bg-transparent text-xs h-8 focus-visible:ring-0 font-mono font-bold text-foreground placeholder:text-muted-foreground/60"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleBarcodeSearch(barcodeInput)}
                    className="text-xs h-8 gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                  >
                    Scan / Add
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={startCameraScanner}
                    className="text-xs h-8 gap-1 border-indigo-500/30 text-indigo-600 hover:bg-indigo-500/10 shrink-0 font-semibold"
                    title="Scan via Laptop/Phone Camera"
                  >
                    <Camera className="size-3.5" /> Camera
                  </Button>
                </div>

                {/* Search & Category */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search products by name, SKU..."
                      className="pl-9 text-xs h-9"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-36 text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs">
                          {c === "all" ? "All Categories" : c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Product Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredProducts.map((p) => (
                    <Card
                      key={p.id}
                      onClick={() => {
                        playScannerBeep();
                        addToCart(p);
                      }}
                      className="p-3 cursor-pointer hover:border-indigo-500 hover:bg-indigo-500/5 transition-all space-y-1.5 select-none border shadow-2xs group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="text-xs font-bold leading-tight line-clamp-1 group-hover:text-indigo-600">
                          {p.name}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[9px] font-mono">{p.category}</Badge>
                        <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 text-[9px] font-mono">
                          {p.gst_rate}% GST
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="font-black text-indigo-600 text-sm font-mono">
                          {fmt(p.price, sysConfig?.currency)}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono bg-secondary/80 px-1.5 py-0.5 rounded">
                          {p.sku}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Cart & Billing Panel */}
              <div className="lg:col-span-5 space-y-3">
                <Card className="p-4 space-y-3 border shadow-2xs">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-sm flex items-center gap-2">
                      <ShoppingCart className="size-4 text-indigo-600" /> Active Cart ({cart.length} items)
                    </h3>
                    {cart.length > 0 && (
                      <Button variant="ghost" size="sm" className="text-xs text-destructive h-7" onClick={() => setCart([])}>
                        Clear Cart
                      </Button>
                    )}
                  </div>

                  {/* Customer & GSTIN */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Customer</Label>
                      <Input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Walk-in Customer"
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">GSTIN (Optional)</Label>
                      <Input
                        value={customerGstin}
                        onChange={(e) => setCustomerGstin(e.target.value)}
                        placeholder="22AAAAA0000A1Z5"
                        className="text-xs h-8 font-mono"
                      />
                    </div>
                  </div>

                  {/* GST Mode Toggle */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 border text-xs">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5 text-indigo-500" />
                      <span className="font-semibold">{taxMode === "igst" ? "IGST (Interstate)" : "CGST + SGST (Intrastate)"}</span>
                    </div>
                    <Switch
                      checked={taxMode === "igst"}
                      onCheckedChange={(v) => setTaxMode(v ? "igst" : "sgst_cgst")}
                    />
                  </div>

                  {/* Cart Items List */}
                  {cart.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-xs space-y-1.5">
                      <ShoppingCart className="size-8 mx-auto opacity-20" />
                      <p className="font-semibold">Cart is currently empty</p>
                      <p className="text-[11px]">Click items or scan barcode above to start billing</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {cart.map((item) => {
                        const itemBase = item.price * item.qty;
                        const gstAmt = Math.round(itemBase * (item.gst_rate / 100));
                        return (
                          <div key={item.id} className="p-2 rounded-lg bg-secondary/40 border space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold truncate">{item.name}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  {fmt(item.price, sysConfig?.currency)} × {item.qty} · GST {item.gst_rate}% (+{fmt(gstAmt, sysConfig?.currency)})
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button size="icon" variant="ghost" className="size-6" onClick={() => updateQty(item.id, -1)}>
                                  <Minus className="size-3" />
                                </Button>
                                <span className="text-xs font-bold w-5 text-center font-mono">{item.qty}</span>
                                <Button size="icon" variant="ghost" className="size-6" onClick={() => updateQty(item.id, 1)}>
                                  <Plus className="size-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="size-6 text-destructive" onClick={() => removeFromCart(item.id)}>
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Order Calculation Summary */}
                  <div className="border-t pt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="font-mono">{fmt(subtotal, sysConfig?.currency)}</span>
                    </div>

                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Discount %</span>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={discountPct}
                          onChange={(e) => setDiscountPct(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="w-16 h-6 text-xs text-right font-mono"
                        />
                        <span>% (-{fmt(discountAmt, sysConfig?.currency)})</span>
                      </div>
                    </div>

                    {taxMode === "sgst_cgst" ? (
                      <>
                        <div className="flex justify-between text-muted-foreground">
                          <span>CGST</span>
                          <span className="font-mono">+{fmt(realTax.cgst, sysConfig?.currency)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>SGST</span>
                          <span className="font-mono">+{fmt(realTax.sgst, sysConfig?.currency)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-muted-foreground">
                        <span>IGST</span>
                        <span className="font-mono">+{fmt(realTax.igst, sysConfig?.currency)}</span>
                      </div>
                    )}

                    <div className="flex justify-between font-black text-base border-t pt-2 text-foreground">
                      <span>GRAND TOTAL</span>
                      <span className="text-primary font-mono">{fmt(realTax.total, sysConfig?.currency)}</span>
                    </div>
                  </div>

                  {/* Payment Mode Selector */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {["Cash", "Card", "UPI", "Bank"].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentMode(mode)}
                        className={`p-2 rounded-lg text-xs font-bold transition-all border ${
                          paymentMode === mode ? "bg-indigo-600 text-white border-indigo-600 shadow-xs" : "bg-secondary/40 text-foreground hover:bg-secondary"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsHeldOpen(true)}
                      disabled={cart.length === 0}
                      className="text-xs h-9 gap-1 font-semibold"
                    >
                      <PauseCircle className="size-3.5 text-amber-500" /> Hold Order
                    </Button>
                    <Button
                      onClick={handleCheckout}
                      disabled={cart.length === 0}
                      className="text-xs h-9 gap-1 font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    >
                      <Receipt className="size-3.5" /> Checkout & Print
                    </Button>
                  </div>

                  {/* Held Orders Quick Recall */}
                  {heldOrders.length > 0 && (
                    <div className="border-t pt-2 space-y-1">
                      <div className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <PauseCircle className="size-3 text-amber-500" /> Parked / Held Orders ({heldOrders.length})
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {heldOrders.map((h) => (
                          <Badge
                            key={h.id}
                            onClick={() => recallOrder(h)}
                            className="cursor-pointer bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20 text-xs py-1 px-2 font-mono gap-1"
                          >
                            <PlayCircle className="size-3" /> {h.name} ({h.cart?.length || 0})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ===== TAB 2: CATALOG & BARCODE GENERATOR LIST ===== */}
          <TabsContent value="catalog" className="mt-4 space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="text-sm font-bold">{products.length} Products & Barcodes in Catalog</div>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedBarcodeProduct("all");
                  setIsBarcodeStudioOpen(true);
                }}
                className="gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Printer className="size-3.5" /> Print All Barcode Labels (A4 Sheet)
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border shadow-2xs">
              <table className="w-full text-xs">
                <thead className="bg-secondary/50 text-muted-foreground">
                  <tr>
                    <th className="p-2.5 text-left font-semibold">SKU / Barcode</th>
                    <th className="p-2.5 text-left font-semibold">Barcode Preview</th>
                    <th className="p-2.5 text-left font-semibold">Product Name</th>
                    <th className="p-2.5 text-left font-semibold">Category</th>
                    <th className="p-2.5 text-left font-semibold">GST %</th>
                    <th className="p-2.5 text-right font-semibold">Price</th>
                    <th className="p-2.5 text-center font-semibold">Stock</th>
                    <th className="p-2.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const isLow = p.low_stock_threshold > 0 && p.stock <= p.low_stock_threshold;
                    return (
                      <tr key={p.id} className="border-t hover:bg-secondary/20">
                        <td className="p-2.5 font-mono font-bold text-indigo-600">{p.sku}</td>
                        <td className="p-2.5">
                          <div
                            className="bg-white p-1 rounded border inline-block cursor-pointer"
                            onClick={() => {
                              setSelectedBarcodeProduct(p.id);
                              setIsBarcodeStudioOpen(true);
                            }}
                            dangerouslySetInnerHTML={{
                              __html: generateBarcodeSvg(p.sku, { width: 110, height: 32, showText: false }),
                            }}
                          />
                        </td>
                        <td className="p-2.5 font-bold text-foreground">{p.name}</td>
                        <td className="p-2.5"><Badge variant="outline" className="text-[10px]">{p.category}</Badge></td>
                        <td className="p-2.5"><Badge className="bg-indigo-100 text-indigo-700 text-[10px]">{p.gst_rate}%</Badge></td>
                        <td className="p-2.5 font-mono font-bold text-primary text-right">{fmt(p.price, sysConfig?.currency)}</td>
                        <td className="p-2.5 text-center">
                          <span className={`font-mono font-bold ${isLow ? "text-red-500" : ""}`}>{p.stock}</span>
                        </td>
                        <td className="p-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedBarcodeProduct(p.id);
                                setIsBarcodeStudioOpen(true);
                              }}
                              className="h-7 text-xs font-semibold gap-1 text-indigo-600"
                            >
                              <Barcode className="size-3.5" /> Label Studio
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                playScannerBeep();
                                addToCart(p);
                                toast.success(`Added ${p.name} to cart`);
                              }}
                              className="h-7 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <Plus className="size-3" /> Sell
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ===== TAB 3: HISTORY ===== */}
          <TabsContent value="history" className="mt-4 space-y-3">
            <div className="text-sm font-bold">{salesHistory.length} Transactions Completed</div>
            {salesHistory.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <History className="size-10 mx-auto opacity-20 mb-2" />
                <p className="text-sm font-bold">No sales recorded yet</p>
                <p className="text-xs">Complete a checkout in the POS terminal</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border shadow-2xs">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/50 text-muted-foreground">
                    <tr>
                      <th className="p-2.5 text-left font-semibold">Receipt #</th>
                      <th className="p-2.5 text-left font-semibold">Customer</th>
                      <th className="p-2.5 text-left font-semibold">Items</th>
                      <th className="p-2.5 text-right font-semibold">Subtotal</th>
                      <th className="p-2.5 text-right font-semibold">GST</th>
                      <th className="p-2.5 text-right font-semibold">Total</th>
                      <th className="p-2.5 text-center font-semibold">Mode</th>
                      <th className="p-2.5 text-right font-semibold">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesHistory.map((s) => (
                      <tr key={s.id} className="border-t hover:bg-secondary/20">
                        <td className="p-2.5 font-mono font-bold text-primary">{s.receiptNo}</td>
                        <td className="p-2.5 font-semibold">{s.customer}</td>
                        <td className="p-2.5 text-muted-foreground">{s.items.length} item(s)</td>
                        <td className="p-2.5 font-mono text-right">{fmt(s.subtotal, sysConfig?.currency)}</td>
                        <td className="p-2.5 font-mono text-indigo-600 text-right">+{fmt((s.igst || 0) + (s.cgst || 0) + (s.sgst || 0), sysConfig?.currency)}</td>
                        <td className="p-2.5 font-black text-primary text-right font-mono">{fmt(s.total, sysConfig?.currency)}</td>
                        <td className="p-2.5 text-center"><Badge variant="outline" className="text-[10px]">{s.paymentMode}</Badge></td>
                        <td className="p-2.5 text-muted-foreground text-right">{s.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ===== TAB 4: ANALYTICS ===== */}
          <TabsContent value="analytics" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="p-4 border shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Today's POS Sales</span>
                <div className="text-2xl font-black font-mono text-emerald-600 mt-1">{fmt(todayRevenue, sysConfig?.currency)}</div>
                <span className="text-xs text-muted-foreground">{todaySales.length} bills completed today</span>
              </Card>
              <Card className="p-4 border shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Total Transactions</span>
                <div className="text-2xl font-black font-mono text-indigo-600 mt-1">{salesHistory.length}</div>
                <span className="text-xs text-muted-foreground">All-time cashier records</span>
              </Card>
              <Card className="p-4 border shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Active Catalog Items</span>
                <div className="text-2xl font-black font-mono text-foreground mt-1">{products.length}</div>
                <span className="text-xs text-muted-foreground">With printable barcodes</span>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* ─── MODAL 1: BARCODE GENERATOR & LABEL PRINTING STUDIO ─── */}
        <Dialog open={isBarcodeStudioOpen} onOpenChange={setIsBarcodeStudioOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Barcode className="size-5 text-indigo-600" /> Product Barcode Generator & Label Printing Studio
              </DialogTitle>
              <DialogDescription className="text-xs">
                Generate high-density Code-128 barcode labels for products. Print single labels or complete multi-label A4 sheets.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Controls Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-secondary/30 border">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Select Product / All</Label>
                  <Select value={selectedBarcodeProduct} onValueChange={setSelectedBarcodeProduct}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All Products (Batch Sheet)</SelectItem>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {p.name} ({p.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Labels Sheet Copies</Label>
                  <Select value={String(barcodeCopies)} onValueChange={(v) => setBarcodeCopies(Number(v))}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1" className="text-xs">1 Label (Single)</SelectItem>
                      <SelectItem value="6" className="text-xs">6 Labels (Small Roll)</SelectItem>
                      <SelectItem value="12" className="text-xs">12 Labels</SelectItem>
                      <SelectItem value="24" className="text-xs">24 Labels (Standard A4)</SelectItem>
                      <SelectItem value="30" className="text-xs">30 Labels (High Density)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPriceOnLabel}
                      onChange={(e) => setShowPriceOnLabel(e.target.checked)}
                      className="rounded"
                    />
                    <span className="font-semibold text-xs">Show Price</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showStoreOnLabel}
                      onChange={(e) => setShowStoreOnLabel(e.target.checked)}
                      className="rounded"
                    />
                    <span className="font-semibold text-xs">Store Name</span>
                  </label>
                </div>
              </div>

              {/* Printable Barcode Sheet Preview Container */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs uppercase text-muted-foreground">Print Preview Layout:</span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {barcodeItemsToPrint.length === 1 ? `${barcodeCopies} Copies` : `${barcodeItemsToPrint.length} Products`}
                  </Badge>
                </div>

                <div id="printable-barcode-sheet" className="p-4 bg-white text-black rounded-xl border max-h-80 overflow-y-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Array.from({
                      length: selectedBarcodeProduct === "all" ? barcodeItemsToPrint.length : barcodeCopies,
                    }).map((_, idx) => {
                      const item =
                        selectedBarcodeProduct === "all"
                          ? barcodeItemsToPrint[idx]
                          : barcodeItemsToPrint[0] || products[0];
                      if (!item) return null;

                      return (
                        <div
                          key={idx}
                          className="border border-dashed border-gray-300 p-2 text-center rounded bg-white space-y-1 shadow-2xs"
                        >
                          {showStoreOnLabel && (
                            <div className="text-[9px] font-black uppercase tracking-wider text-gray-700">
                              {sysConfig?.appName || "MASTER ERP"}
                            </div>
                          )}
                          <div className="text-[11px] font-bold text-gray-900 truncate">
                            {item.name}
                          </div>
                          <div
                            className="py-0.5 flex justify-center"
                            dangerouslySetInnerHTML={{
                              __html: generateBarcodeSvg(item.sku, { width: 140, height: 40, showText: true }),
                            }}
                          />
                          {showPriceOnLabel && (
                            <div className="text-xs font-black text-gray-900 font-mono">
                              MRP: {fmt(item.price, sysConfig?.currency)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex justify-between sm:justify-between items-center w-full pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => setIsBarcodeStudioOpen(false)}>
                Close
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const item = barcodeItemsToPrint[0] || products[0];
                    const svgContent = generateBarcodeSvg(item.sku, { width: 220, height: 70, showText: true });
                    const blob = new Blob([svgContent], { type: "image/svg+xml" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `barcode-${item.sku}.svg`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success(`Downloaded SVG Barcode for ${item.sku}`);
                  }}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <Download className="size-3.5" /> Download SVG
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const printContents = document.getElementById("printable-barcode-sheet")?.innerHTML;
                    if (!printContents) return;
                    const printWin = window.open("", "_blank");
                    if (printWin) {
                      printWin.document.write(`
                        <html>
                          <head>
                            <title>Print Barcode Labels</title>
                            <style>
                              body { font-family: sans-serif; margin: 20px; }
                              .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
                              .label { border: 1px dashed #ccc; padding: 10px; text-align: center; page-break-inside: avoid; }
                              @media print { body { margin: 0; } }
                            </style>
                          </head>
                          <body>
                            <div class="grid">${printContents}</div>
                            <script>window.onload = function() { window.print(); window.close(); }<\/script>
                          </body>
                        </html>
                      `);
                      printWin.document.close();
                    }
                  }}
                  className="gap-1.5 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Printer className="size-3.5" /> Print Barcode Labels Sheet
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── MODAL 2: CAMERA BARCODE SCANNER ─── */}
        <Dialog open={isCameraScannerOpen} onOpenChange={(open) => !open && stopCameraScanner()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Camera className="size-5 text-indigo-600" /> Interactive Camera Barcode Scanner
              </DialogTitle>
              <DialogDescription className="text-xs">
                Hold product barcode in front of camera to automatically scan and add to cart.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              {/* Video Camera Viewport */}
              <div className="relative h-64 rounded-2xl border-2 border-indigo-500/40 overflow-hidden bg-black flex items-center justify-center">
                <video ref={videoRef} autoPlay playsInline muted className="size-full object-cover" />

                {/* Animated Laser Scanning Line Overlay */}
                <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-28 border-2 border-indigo-400 rounded-xl pointer-events-none shadow-lg">
                  <div className="w-full h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-bounce mt-14" />
                </div>

                <div className="absolute bottom-2 text-center text-[10px] text-white/80 bg-black/60 px-2 py-0.5 rounded backdrop-blur-md">
                  Align Barcode Inside Target Box
                </div>
              </div>

              {/* Sample Quick Scan Buttons */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">1-Click Quick Scan Simulation:</span>
                <div className="flex flex-wrap gap-1.5">
                  {products.slice(0, 4).map((p) => (
                    <Button
                      key={p.id}
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        handleBarcodeSearch(p.sku);
                        stopCameraScanner();
                      }}
                      className="text-[11px] h-7 font-mono gap-1"
                    >
                      <Barcode className="size-3 text-indigo-500" /> {p.sku}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button size="sm" variant="outline" onClick={stopCameraScanner}>
                Close Camera
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── MODAL 3: HOLD ORDER ─── */}
        <Dialog open={isHeldOpen} onOpenChange={setIsHeldOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PauseCircle className="size-5 text-amber-500" /> Hold Order
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-xs">
              <p className="text-muted-foreground">Park this order and start a new one. You can recall it anytime.</p>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Order Label</Label>
                <Input
                  value={holdName}
                  onChange={(e) => setHoldName(e.target.value)}
                  placeholder="e.g. Table 3, Counter 2, Customer..."
                  className="text-xs"
                />
              </div>
              <div className="p-3 bg-secondary/30 rounded-lg text-muted-foreground border">
                {cart.length} item(s) · Total: <strong className="text-foreground">{fmt(realTax.total, sysConfig?.currency)}</strong>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsHeldOpen(false)}>Cancel</Button>
              <Button onClick={holdOrder} className="font-bold gap-2 bg-amber-600 hover:bg-amber-700 text-white">
                <PauseCircle className="size-4" /> Park Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── MODAL 4: GST RECEIPT ─── */}
        <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
          <DialogContent className="sm:max-w-[420px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="size-5 text-primary" /> GST Tax Invoice Receipt
              </DialogTitle>
            </DialogHeader>
            {lastReceipt && (
              <div className="space-y-3 py-1 text-xs font-mono">
                {/* Company Header */}
                <div className="text-center space-y-1 border-b pb-3 flex flex-col items-center">
                  <img src="/logo.webp" alt="Store Logo" className="h-8 max-w-[120px] object-contain mb-0.5" />
                  <div className="font-extrabold text-base text-primary">{sysConfig?.appName || "Master ERP"}</div>
                  {sysConfig?.address && <div className="text-muted-foreground text-[10px]">{sysConfig.address}</div>}
                  {sysConfig?.gstin && <div className="text-[10px]">GSTIN: <strong>{sysConfig.gstin}</strong></div>}
                  <div className="text-muted-foreground text-[10px]">{lastReceipt.date}</div>
                  <div className="font-bold">Receipt # {lastReceipt.receiptNo}</div>
                </div>

                {/* Customer Info */}
                <div className="space-y-0.5 text-[10px]">
                  <div>Bill To: <strong>{lastReceipt.customer}</strong></div>
                  {lastReceipt.customerGstin && <div>GSTIN: <strong>{lastReceipt.customerGstin}</strong></div>}
                </div>

                {/* Items */}
                <div className="space-y-1 border-y py-2">
                  <div className="grid grid-cols-12 text-[10px] text-muted-foreground font-bold">
                    <span className="col-span-5">Item</span>
                    <span className="col-span-2 text-right">Qty</span>
                    <span className="col-span-2 text-right">Rate</span>
                    <span className="col-span-3 text-right">Amount</span>
                  </div>
                  {lastReceipt.items.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 text-[10px]">
                      <span className="col-span-5 truncate">{item.name}</span>
                      <span className="col-span-2 text-right">{item.qty}</span>
                      <span className="col-span-2 text-right">{fmt(item.price, sysConfig?.currency)}</span>
                      <span className="col-span-3 text-right font-bold">{fmt(item.price * item.qty, sysConfig?.currency)}</span>
                    </div>
                  ))}
                </div>

                {/* GST Breakup */}
                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{fmt(lastReceipt.subtotal, sysConfig?.currency)}</span>
                  </div>
                  {lastReceipt.discountAmt > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount</span>
                      <span>-{fmt(lastReceipt.discountAmt, sysConfig?.currency)}</span>
                    </div>
                  )}
                  {lastReceipt.taxMode === "sgst_cgst" ? (
                    <>
                      <div className="flex justify-between text-muted-foreground">
                        <span>CGST</span>
                        <span>{fmt(lastReceipt.cgst, sysConfig?.currency)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>SGST</span>
                        <span>{fmt(lastReceipt.sgst, sysConfig?.currency)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-muted-foreground">
                      <span>IGST</span>
                      <span>{fmt(lastReceipt.igst, sysConfig?.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-extrabold text-sm border-t pt-1.5">
                    <span>TOTAL</span>
                    <span className="text-primary">{fmt(lastReceipt.total, sysConfig?.currency)}</span>
                  </div>
                </div>

                <div className="text-center text-[10px] text-muted-foreground border-t pt-2">
                  Payment: {lastReceipt.paymentMode} · Thank you for your business!
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReceiptOpen(false)}>Close</Button>
              <Button onClick={() => window.print()} className="gap-2 font-bold bg-primary text-white">
                <Printer className="size-4" /> Print Thermal Receipt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PlanGuard>
  );
}

export default PosPage;
