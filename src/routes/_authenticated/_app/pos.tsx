import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getSocketClient } from "@/lib/socket";
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
import {
  printThermalReceipt,
  triggerCashDrawerKick,
  generateThermalReceiptHtml,
  openThermalPrintWindow,
} from "@/lib/qz-print";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ShoppingCart,
  Monitor,
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
  Utensils,
  CreditCard,
  Banknote,
  LayoutGrid,
  Tag,
  Laptop,
  Cpu,
  Briefcase,
  Wrench,
  Filter,
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
  image?: string;
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
  { id: "prd-1", name: "Enterprise ERP Server Appliance", price: 45000, stock: 24, sku: "PRD-94821", hsn_sac: "8471", gst_rate: 18, unit: "Pcs", low_stock_threshold: 5, category: "Hardware", description: "Dedicated on-premises ERP node", image: "/images/no-image.webp" },
  { id: "prd-2", name: "Biometric AI Terminal", price: 14500, stock: 42, sku: "PRT-38192", hsn_sac: "8471", gst_rate: 18, unit: "Pcs", low_stock_threshold: 5, category: "Hardware", description: "Infrared face & finger terminal", image: "/images/no-image.webp" },
  { id: "prd-3", name: "Thermal Receipt Printer 80mm", price: 6800, stock: 15, sku: "PRD-59302", hsn_sac: "8443", gst_rate: 18, unit: "Pcs", low_stock_threshold: 3, category: "Hardware", description: "USB + Ethernet POS thermal printer", image: "/images/no-image.webp" },
  { id: "prd-4", name: "Handheld Laser Barcode Scanner", price: 2900, stock: 30, sku: "PRD-10294", hsn_sac: "8471", gst_rate: 18, unit: "Pcs", low_stock_threshold: 5, category: "Hardware", description: "High-speed 1D/2D USB barcode reader", image: "/images/no-image.webp" },
  { id: "prd-5", name: "ERP Implementation & Setup", price: 25000, stock: 999, sku: "SRV-10294", hsn_sac: "998314", gst_rate: 18, unit: "Hr", low_stock_threshold: 0, category: "Services", description: "Consultation and deployment", image: "/images/no-image.webp" },
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
  const [receiptPaperSize, setReceiptPaperSize] = useState<"80mm" | "58mm">("80mm");
  const [isHeldOpen, setIsHeldOpen] = useState(false);
  const [holdName, setHoldName] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeRef = useRef<HTMLInputElement>(null);

  // Multi-Platform F2 Barcode Scanner Dialog State
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const scannerModalInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus scanner input when modal opens
  useEffect(() => {
    if (isScannerModalOpen) {
      setTimeout(() => {
        scannerModalInputRef.current?.focus();
      }, 100);
    }
  }, [isScannerModalOpen]);

  // Category Icon helper
  function getCategoryIcon(cat: string) {
    const c = cat.toLowerCase();
    if (c === "all" || c === "all menu") return <Utensils className="size-5 text-orange-500" />;
    if (c.includes("hardware") || c.includes("computer") || c.includes("device")) return <Laptop className="size-5 text-indigo-500" />;
    if (c.includes("electronic") || c.includes("chip") || c.includes("ai")) return <Cpu className="size-5 text-blue-500" />;
    if (c.includes("service") || c.includes("consult")) return <Sparkles className="size-5 text-emerald-500" />;
    if (c.includes("spare") || c.includes("part") || c.includes("accessor")) return <Wrench className="size-5 text-amber-500" />;
    if (c.includes("software") || c.includes("license")) return <Briefcase className="size-5 text-purple-500" />;
    return <Package className="size-5 text-primary" />;
  }

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

  // Register Shift State
  const [isRegisterOpenModalOpen, setIsRegisterOpenModalOpen] = useState(false);
  const [isRegisterCloseModalOpen, setIsRegisterCloseModalOpen] = useState(false);
  const [openingFloatInput, setOpeningFloatInput] = useState("1000");
  const [actualCashInput, setActualCashInput] = useState("");
  const [shiftCloseNotes, setShiftCloseNotes] = useState("");
  const [closedReport, setClosedReport] = useState<any>(null);

  const { data: shiftStatus, refetch: refetchShift } = useQuery({
    queryKey: ["pos-register-shift", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/sales/register/current");
        return res || { isOpen: false };
      } catch {
        return { isOpen: false };
      }
    },
  });

  async function handleOpenShift() {
    try {
      const floatAmt = Number(openingFloatInput || 0);
      await api.post("/sales/register/open", {
        openingFloat: floatAmt,
        notes: "Shift opened from terminal",
      });
      toast.success(`Register shift opened with starting float: ${fmt(floatAmt)}`);
      refetchShift();
      setIsRegisterOpenModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to open register shift");
    }
  }

  async function handleCloseShift() {
    try {
      const counted = Number(actualCashInput || 0);
      const res = await api.post("/sales/register/close", {
        actualCash: counted,
        notes: shiftCloseNotes,
      });
      toast.success(res?.message || "Shift closed successfully");
      setClosedReport(res?.report || null);
      refetchShift();
    } catch (err: any) {
      toast.error(err.message || "Failed to close shift");
    }
  }

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

  // Load products from catalog (relational API + CMS fallback)
    // Load categories from database
  const { data: dbCategories = [] } = useQuery({
    queryKey: ["pos-db-categories", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/products/categories");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const categoryImageMap = useMemo(() => {
    const map: Record<string, string> = {};
    (dbCategories as any[]).forEach((cat: any) => {
      if (cat?.name) {
        map[cat.name] = cat.image || "/images/no-image.webp";
      }
    });
    return map;
  }, [dbCategories]);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["pos-products-catalog", tenantId],
    queryFn: async () => {
      try {
        const relProducts = await api.get("/products");
        if (Array.isArray(relProducts) && relProducts.length > 0) {
          const mapped = relProducts.map((item: any) => ({
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
            image: item.image || "/images/no-image.webp",
          })) as Product[];
          try {
            localStorage.setItem(`pos_offline_catalog_${tenantId}`, JSON.stringify(mapped));
          } catch {}
          return mapped;
        }

        const pageV2 = await api.get(`/cms/pages/${PRODUCTS_SLUG}`);
        if (pageV2?.content && Array.isArray(pageV2.content) && pageV2.content.length > 0) {
          const mapped = pageV2.content.map((item: any) => ({
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
            image: item.image || "/images/no-image.webp",
          })) as Product[];
          try {
            localStorage.setItem(`pos_offline_catalog_${tenantId}`, JSON.stringify(mapped));
          } catch {}
          return mapped;
        }

        try {
          const cached = localStorage.getItem(`pos_offline_catalog_${tenantId}`);
          if (cached) return JSON.parse(cached);
        } catch {}
        return [];
      } catch {
        try {
          const cached = localStorage.getItem(`pos_offline_catalog_${tenantId}`);
          if (cached) return JSON.parse(cached);
        } catch {}
        return [];
      }
    },
  });

  // Sales history
  const { data: salesHistory = [] } = useQuery<PosSale[]>({
    queryKey: ["pos-sales", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/invoices/pos/sales");
        if (Array.isArray(res)) {
          try {
            localStorage.setItem(`pos_cached_sales_${tenantId}`, JSON.stringify(res));
          } catch {}
          return res as PosSale[];
        }
        return [] as PosSale[];
      } catch {
        try {
          const cached = localStorage.getItem(`pos_cached_sales_${tenantId}`);
          if (cached) return JSON.parse(cached);
        } catch {}
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
      return [...prev, { id: p.id, name: p.name, price: itemPrice, qty: 1, gst_rate: itemTax, hsn_sac: p.hsn_sac || "8471", unit: p.unit || "Pcs", sku: p.sku, image: (p as any).image || "/images/no-image.webp" }];
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
      // Cross-platform trigger: F2 on Windows/Linux/Android, or Cmd+B / Ctrl+B on macOS/Linux
      const isF2 = e.key === "F2" || e.code === "F2" || (e as any).keyCode === 113;
      const isMacBarcode = (e.metaKey || e.ctrlKey) && (e.key === "b" || e.key === "B" || (e as any).code === "KeyB");

      if (isF2 || isMacBarcode) {
        e.preventDefault();
        setIsScannerModalOpen(true);
        return;
      }

      const target = e.target as HTMLElement;
      // If user is focused on a normal text field or modal, allow normal typing
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
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

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const cat = p.category || "General";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [products]);

  // ⚡ Real-time Inventory & Stock Synchronization across open POS counters
  useEffect(() => {
    const socket = getSocketClient();

    function onInventoryUpdated(payload: any) {
      if (payload?.items && Array.isArray(payload.items)) {
        qc.setQueryData<Product[]>(["pos-products-catalog", tenantId], (old) => {
          if (!old) return old;
          const map = new Map(payload.items.map((i: any) => [i.productId, i.quantityDecremented || 1]));
          return old.map((p) => {
            const dec = map.get(p.id);
            if (dec !== undefined) {
              return { ...p, stock: Math.max(0, p.stock - Number(dec)) };
            }
            return p;
          });
        });
      }
    }

    function onPosSaleCreated() {
      qc.invalidateQueries({ queryKey: ["tenant-sales-history", tenantId] });
      qc.invalidateQueries({ queryKey: ["pos-held-orders", tenantId] });
    }

    function onPosHeldUpdated() {
      qc.invalidateQueries({ queryKey: ["pos-held-orders", tenantId] });
    }

    socket.on("inventory:stock_updated", onInventoryUpdated);
    socket.on("pos:sale_created", onPosSaleCreated);
    socket.on("pos:held_updated", onPosHeldUpdated);

    return () => {
      socket.off("inventory:stock_updated", onInventoryUpdated);
      socket.off("pos:sale_created", onPosSaleCreated);
      socket.off("pos:held_updated", onPosHeldUpdated);
    };
  }, [tenantId, qc]);

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt = Math.round(subtotal * (discountPct / 100));
  const { igst, cgst, sgst, total } = computeTax(subtotal || 1, discountAmt, taxMode, cart.length ? cart : [{ price: 1, qty: 1, gst_rate: 18 } as any]);
  const realTax = cart.length ? computeTax(subtotal, discountAmt, taxMode, cart) : { igst: 0, cgst: 0, sgst: 0, total: 0 };

  // ⚡ Real-time Dual-Screen Customer Display Cart Broadcast (Zero Latency BroadcastChannel + Socket.io)
  useEffect(() => {
    try {
      const channel = new BroadcastChannel("stocky_pos_display");
      channel.postMessage({
        type: "CART_UPDATE",
        cart,
        subtotal,
        discountAmt,
        tax: realTax,
        total: realTax.total,
        customerName,
        currency: sysConfig?.currency || "INR",
      });
      channel.close();
    } catch {}

    try {
      const socket = getSocketClient();
      if (socket.connected) {
        socket.emit("pos:cart_update", {
          tenantId,
          cart,
          subtotal,
          discountAmt,
          tax: realTax,
          total: realTax.total,
          customerName,
          currency: sysConfig?.currency || "INR",
        });
      }
    } catch {}
  }, [cart, subtotal, discountAmt, realTax, customerName, tenantId, sysConfig?.currency]);



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

    if (paymentMode === "cash") { try { triggerCashDrawerKick(); } catch {} }
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
      try {
        const ch = new BroadcastChannel("stocky_pos_display");
        ch.postMessage({ type: "SALE_COMPLETED", receiptNo: sale.receiptNo });
        ch.close();
      } catch {}
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
      <div className="space-y-4 max-w-full pb-16">
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
            {/* Register Shift Status / Action */}
            {shiftStatus?.isOpen ? (
              <Button
                onClick={() => setIsRegisterCloseModalOpen(true)}
                className="h-9 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <Banknote className="size-4" /> Shift Open ({fmt(shiftStatus?.shift?.openingFloat || 0)})
              </Button>
            ) : (
              <Button
                onClick={() => setIsRegisterOpenModalOpen(true)}
                className="h-9 text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
              >
                <Banknote className="size-4" /> Open Register Shift
              </Button>
            )}

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
          <TabsContent value="pos" className="mt-4 space-y-5">
            {/* ── TOP ACTION BAR: Search Menu, F2 Scanner & Cashier Profile Header ── */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card border rounded-3xl p-3 shadow-2xs">
              {/* Search Menu Input */}
              <div className="relative flex-1 max-w-xl">
                <Search className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search menu by product name, category, or SKU..."
                  className="pl-10 h-10 text-xs rounded-2xl border-border/70 bg-muted/20 focus-visible:bg-background"
                />
                {search && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-2 top-2 size-6 text-muted-foreground"
                    onClick={() => setSearch("")}
                  >
                    <X className="size-3.5" />
                  </Button>
                )}
              </div>

              {/* Right: Dual-Screen Customer Display & Multi-OS F2 Scanner */}
              <div className="flex items-center gap-2.5 flex-wrap justify-end">
                {/* Secondary Customer Display Launcher */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.open("/customer-display", "CustomerDisplay", "width=1024,height=768")}
                  className="h-10 text-xs font-bold gap-1.5 rounded-2xl border-border/70 hover:bg-orange-500/10 hover:text-orange-600 hover:border-orange-400 cursor-pointer shadow-2xs"
                  title="Launch secondary customer-facing display window / dual screen"
                >
                  <Monitor className="size-4 text-orange-500" />
                  <span className="hidden sm:inline">Customer Display</span>
                </Button>
                {/* Multi-OS F2 Scanner Button */}
                <Button
                  onClick={() => setIsScannerModalOpen(true)}
                  className="h-10 text-xs font-bold gap-2 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl shadow-xs px-3.5"
                  title="Multi-Platform Barcode & QR Scanner (Press F2 or ⌘+B)"
                >
                  <ScanLine className="size-4 animate-pulse" />
                  <span>Scan / Barcode</span>
                  <kbd className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">F2</kbd>
                </Button>
              </div>
            </div>

            {/* ── CATEGORIES SECTION (Horizontal Rounded Cards matching Reference Image) ── */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-foreground tracking-tight">Categories</h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-border/70"
                    onClick={() => setCategoryFilter("all")}
                  >
                    <Filter className="size-3.5 text-muted-foreground" /> Filter
                  </Button>
                </div>
              </div>

              {/* Horizontal Scrollable Categories */}
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {categories.map((c) => {
                  const isActive = categoryFilter === c;
                  const count = c === "all" ? products.length : (categoryCounts[c] || 0);
                  const displayName = c === "all" ? "All Menu" : c;

                  return (
                    <div
                      key={c}
                      onClick={() => setCategoryFilter(c)}
                      className={cn(
                        "w-24 h-24 sm:w-28 sm:h-28 rounded-3xl border transition-all flex flex-col items-center justify-center p-2.5 cursor-pointer shrink-0 select-none",
                        isActive
                          ? "border-2 border-orange-500 bg-orange-500/10 text-orange-600 shadow-sm ring-2 ring-orange-500/20"
                          : "border-border/70 bg-card hover:border-orange-300 hover:bg-orange-500/5 text-foreground"
                      )}
                    >
                      <div className="size-9 rounded-2xl bg-muted/30 overflow-hidden flex items-center justify-center mb-1.5 shrink-0 border border-border/40">
                        {c === "all" ? (
                          <Utensils className="size-5 text-orange-500" />
                        ) : (
                          <img
                            src={categoryImageMap[c] || "/images/no-image.webp"}
                            alt={displayName}
                            className="size-full object-contain p-1"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/images/no-image.webp";
                            }}
                           loading="lazy"/>
                        )}
                      </div>
                      <div className="text-xs font-bold truncate max-w-[85px] leading-tight text-center">
                        {displayName}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                        {count} Item
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── MAIN WORKSPACE: Products Grid (Left 7 cols) & Detail Items Cart (Right 5 cols) ── */}
            <div className="grid lg:grid-cols-12 gap-5 items-start">
              {/* LEFT: Select Menu (Product Grid) */}
              <div className="lg:col-span-7 xl:col-span-8 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-black text-foreground tracking-tight">
                    Select Menu ({filteredProducts.length})
                  </h2>
                  <span className="text-xs text-muted-foreground">Click card or scan to add to cart</span>
                </div>

                {/* Product Cards Grid with Big Images */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredProducts.map((p) => {
                    const isLow = p.low_stock_threshold > 0 && p.stock <= p.low_stock_threshold;
                    return (
                      <Card
                        key={p.id}
                        onClick={() => {
                          playScannerBeep();
                          addToCart(p);
                        }}
                        className="rounded-3xl border border-border/80 bg-card p-3.5 shadow-xs hover:shadow-md transition-all group cursor-pointer flex flex-col justify-between overflow-hidden hover:border-orange-400 select-none"
                      >
                        {/* Big Image Container (matching Reference Image) */}
                        <div className="h-40 sm:h-44 w-full rounded-2xl overflow-hidden bg-muted/40 relative mb-3 flex items-center justify-center border">
                          <img
                            src={(p as any).image || "/images/no-image.webp"}
                            alt={p.name}
                            className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/images/no-image.webp";
                            }}
                           loading="lazy"/>
                          {/* Top-Left Badge */}
                          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 flex-wrap">
                            <span className="bg-blue-600 text-white font-black text-[10px] rounded-lg px-2 py-0.5 shadow-sm font-mono">
                              {p.gst_rate}% GST
                            </span>
                            {p.sku?.startsWith("WC-") && (
                              <span className="bg-purple-600 text-white font-bold text-[9px] rounded-lg px-1.5 py-0.5 shadow-sm">
                                WooCommerce
                              </span>
                            )}
                            {p.sku?.startsWith("SH-") && (
                              <span className="bg-emerald-600 text-white font-bold text-[9px] rounded-lg px-1.5 py-0.5 shadow-sm">
                                Shopify
                              </span>
                            )}
                          </div>
                          {isLow && (
                            <span className="absolute top-2.5 right-2.5 bg-amber-500 text-white font-bold text-[9px] rounded-lg px-1.5 py-0.5 shadow-sm font-mono">
                              Low Stock
                            </span>
                          )}
                        </div>

                        {/* Title & Availability */}
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm text-foreground leading-tight line-clamp-1 group-hover:text-orange-600 transition-colors">
                            {p.name}
                          </h4>
                          <div className="text-[11px] text-muted-foreground flex items-center justify-between font-medium">
                            <span>{p.stock} Available</span>
                            <span className="font-mono text-[10px] bg-secondary/80 px-1 rounded">{p.sku}</span>
                          </div>
                        </div>

                        {/* Footer Price & Add Button */}
                        <div className="mt-3 flex items-baseline justify-between pt-2 border-t border-dashed">
                          <div className="font-black text-base text-foreground font-mono">
                            {fmt(p.price, sysConfig?.currency)}
                            <span className="text-[11px] font-normal text-muted-foreground font-sans ml-1">/ Portion</span>
                          </div>
                          <div className="size-7 rounded-full bg-orange-500/10 text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
                            <Plus className="size-3.5" />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT: Detail Items (Cart Panel - Matching Reference Image) */}
              <div className="lg:col-span-5 xl:col-span-4">
                <Card className="rounded-3xl border border-border/80 bg-card p-4 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-base text-foreground">Detail Items</h3>
                    {cart.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-destructive h-7 hover:bg-destructive/10"
                        onClick={() => setCart([])}
                      >
                        Clear Cart
                      </Button>
                    )}
                  </div>

                  {/* Customer Information Input */}
                  <div className="space-y-2 p-2.5 rounded-2xl bg-muted/20 border text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-muted-foreground">Customer Details</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[11px] p-0 text-orange-600 hover:text-orange-700"
                        onClick={() => setCustomerName(customerName === "Walk-in Customer" ? "" : "Walk-in Customer")}
                      >
                        Reset to Walk-in
                      </Button>
                    </div>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Customer Name (e.g. Walk-in Customer)"
                      className="h-8 text-xs rounded-xl bg-background"
                    />
                  </div>

                  {/* Cart Items List */}
                  {cart.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground text-xs space-y-2">
                      <ShoppingCart className="size-10 mx-auto opacity-20" />
                      <p className="font-bold">Cart is currently empty</p>
                      <p className="text-[11px]">Tap any menu card or scan a barcode to add</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {cart.map((item) => (
                        <div key={item.id} className="p-2.5 rounded-2xl bg-secondary/30 border border-border/60 flex items-center gap-3">
                          {/* Thumbnail */}
                          <div className="size-14 rounded-2xl overflow-hidden bg-muted/40 border shrink-0 flex items-center justify-center p-1">
                            <img
                              src={item.image || "/images/no-image.webp"}
                              alt={item.name}
                              className="size-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/images/no-image.webp";
                              }}
                             loading="lazy"/>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-foreground truncate">{item.name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                              {item.unit || "Pcs"} · GST {item.gst_rate}%
                            </div>
                            <div className="font-black text-xs font-mono text-orange-600 mt-1">
                              {fmt(item.price * item.qty, sysConfig?.currency)}
                            </div>
                          </div>

                          {/* Stepper with Coral/Orange buttons */}
                          <div className="flex items-center gap-1 shrink-0 bg-background/80 rounded-xl p-0.5 border">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-6 rounded-md bg-orange-500/10 text-orange-600 hover:bg-orange-500 hover:text-white"
                              onClick={() => updateQty(item.id, -1)}
                            >
                              <Minus className="size-3" />
                            </Button>
                            <span className="text-xs font-bold w-6 text-center font-mono">{item.qty}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-6 rounded-md bg-orange-500 text-white hover:bg-orange-600 shadow-xs"
                              onClick={() => updateQty(item.id, 1)}
                            >
                              <Plus className="size-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Order Calculation Summary (Matching Reference Image) */}
                  <div className="border-t border-dashed pt-3 space-y-2 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Item</span>
                      <span className="font-mono">{cart.reduce((s, i) => s + i.qty, 0)} (Items)</span>
                    </div>

                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="font-mono">{fmt(subtotal, sysConfig?.currency)}</span>
                    </div>

                    {discountAmt > 0 && (
                      <div className="flex justify-between text-emerald-600 font-semibold">
                        <span>Discount ({discountPct}%)</span>
                        <span className="font-mono">-{fmt(discountAmt, sysConfig?.currency)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax (18% GST)</span>
                      <span className="font-mono">+{fmt(realTax.cgst + realTax.sgst + realTax.igst, sysConfig?.currency)}</span>
                    </div>

                    <div className="flex justify-between items-baseline pt-2 border-t text-foreground">
                      <span className="font-bold text-sm">Total</span>
                      <span className="font-black text-xl font-mono text-orange-600">
                        {fmt(realTax.total, sysConfig?.currency)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Method Selector (Square Icons matching Reference Image) */}
                  <div className="space-y-2 pt-1">
                    <Label className="text-xs font-bold text-foreground">Payment Method</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "Cash", label: "Cash", icon: Banknote },
                        { id: "Card", label: "Debit", icon: CreditCard },
                        { id: "UPI", label: "QRIS", icon: QrCode },
                      ].map((pm) => (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => setPaymentMode(pm.id)}
                          className={cn(
                            "p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 text-xs transition-all",
                            paymentMode === pm.id
                              ? "border-2 border-orange-500 bg-orange-500/10 text-orange-600 font-bold shadow-xs"
                              : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                          )}
                        >
                          <pm.icon className="size-4" />
                          <span className="text-[11px] font-semibold">{pm.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pay Now Button */}
                  <Button
                    onClick={handleCheckout}
                    disabled={cart.length === 0}
                    className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-black text-sm rounded-2xl shadow-md gap-2"
                  >
                    <Receipt className="size-4" />
                    <span>Pay Now • {fmt(realTax.total, sysConfig?.currency)}</span>
                  </Button>

                  {/* Park / Hold Order Actions */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsHeldOpen(true)}
                      disabled={cart.length === 0}
                      className="text-xs text-muted-foreground hover:text-amber-600 gap-1 h-7"
                    >
                      <PauseCircle className="size-3.5" /> Hold / Park Order
                    </Button>

                    {heldOrders.length > 0 && (
                      <span className="text-[11px] font-bold text-amber-600">
                        {heldOrders.length} Held Orders
                      </span>
                    )}
                  </div>
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
                        <td className="p-2.5 font-bold text-foreground">
                          <div className="flex items-center gap-2">
                            <img
                              src={(p as any).image || "/images/no-image.webp"}
                              alt={p.name}
                              className="size-8 rounded border object-contain bg-secondary/20 p-0.5 shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/images/no-image.webp";
                              }}
                             loading="lazy"/>
                            <span>{p.name}</span>
                          </div>
                        </td>
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

        
        {/* ─── MODAL: MULTI-PLATFORM F2 BARCODE & QR SCANNER ─── */}
        <Dialog open={isScannerModalOpen} onOpenChange={setIsScannerModalOpen}>
          <DialogContent className="sm:max-w-lg rounded-3xl p-6">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0 border border-orange-500/20">
                  <ScanLine className="size-5 animate-pulse" />
                </div>
                <div>
                  <DialogTitle className="text-base font-black">Multi-Platform Barcode Scanner</DialogTitle>
                  <DialogDescription className="text-xs">
                    Supports Windows, macOS, Linux, Android, iOS & Hardware Laser Guns
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Visual Scanning Frame */}
              <div className="relative h-40 rounded-2xl bg-black/90 overflow-hidden border border-border/80 flex flex-col items-center justify-center p-4 text-center">
                {/* Laser Scanning Line Animation */}
                <div className="absolute inset-x-6 h-0.5 bg-orange-500 shadow-[0_0_12px_2px_rgba(249,115,22,0.85)] animate-bounce" />
                <Barcode className="size-14 text-white/30" />
                <p className="text-xs text-white/90 font-mono font-bold mt-2">Ready to Scan Barcode</p>
                <span className="text-[10px] text-white/50 font-mono">USB · Bluetooth · Laser Gun · Camera</span>
              </div>

              {/* Barcode Input Field */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Barcode / SKU Input</Label>
                <div className="flex gap-2">
                  <Input
                    ref={scannerModalInputRef}
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleBarcodeSearch(barcodeInput);
                        setBarcodeInput("");
                      }
                    }}
                    placeholder="Scan barcode with laser gun or type SKU..."
                    className="h-10 text-xs font-mono font-bold rounded-xl"
                  />
                  <Button
                    onClick={() => {
                      handleBarcodeSearch(barcodeInput);
                      setBarcodeInput("");
                    }}
                    className="h-10 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl px-4"
                  >
                    Add to Cart
                  </Button>
                </div>
              </div>

              {/* Camera Scanner for Phones / Tablets / MacBooks */}
              <div className="pt-2 border-t flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Camera className="size-3.5" />
                  <span>On Mobile, Tablet or MacBook?</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsScannerModalOpen(false);
                    startCameraScanner();
                  }}
                  className="text-xs h-8 gap-1.5 border-orange-500/40 text-orange-600 hover:bg-orange-500/10 font-bold rounded-xl"
                >
                  <Camera className="size-3.5" /> Open Camera Scanner
                </Button>
              </div>
            </div>

            <DialogFooter className="border-t pt-3 sm:justify-between items-center">
              <span className="text-[11px] text-muted-foreground font-mono">
                Shortcut: <kbd className="bg-muted px-1.5 py-0.5 rounded border">F2</kbd> or <kbd className="bg-muted px-1.5 py-0.5 rounded border">⌘ + B</kbd>
              </span>
              <Button size="sm" variant="ghost" onClick={() => setIsScannerModalOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

{/* ─── MODAL 4: GST RECEIPT ─── */}
        <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
          <DialogContent className="sm:max-w-[440px] max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-1">
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Receipt className="size-5 text-primary" /> POS Tax Invoice Receipt
                </DialogTitle>
                <div className="flex items-center gap-1 bg-muted p-0.5 rounded-md border text-[11px]">
                  <button
                    type="button"
                    onClick={() => setReceiptPaperSize("80mm")}
                    className={cn(
                      "px-2 py-0.5 rounded font-semibold transition-all",
                      receiptPaperSize === "80mm"
                        ? "bg-background text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    80mm Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiptPaperSize("58mm")}
                    className={cn(
                      "px-2 py-0.5 rounded font-semibold transition-all",
                      receiptPaperSize === "58mm"
                        ? "bg-background text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    58mm Mobile
                  </button>
                </div>
              </div>
            </DialogHeader>
            {lastReceipt && (
              <div
                className={cn(
                  "p-3.5 my-1 bg-white text-zinc-900 border border-dashed border-zinc-300 rounded-md shadow-xs font-mono select-text transition-all",
                  receiptPaperSize === "58mm" ? "text-[10px] max-w-[280px] mx-auto" : "text-xs max-w-[340px] mx-auto"
                )}
              >
                {/* Store Header */}
                <div className="text-center space-y-0.5 border-b border-dashed border-zinc-300 pb-2 mb-2 flex flex-col items-center">
                  <div className="font-extrabold text-sm uppercase tracking-wide text-zinc-900">
                    {sysConfig?.appName || "MASTER POS"}
                  </div>
                  {sysConfig?.address && (
                    <div className="text-[10px] text-zinc-600 leading-tight">{sysConfig.address}</div>
                  )}
                  {sysConfig?.phone && (
                    <div className="text-[10px] text-zinc-600">Tel: {sysConfig.phone}</div>
                  )}
                  {sysConfig?.gstin && (
                    <div className="text-[10px] font-bold text-zinc-800">GSTIN: {sysConfig.gstin}</div>
                  )}
                </div>

                {/* Receipt Metadata */}
                <div className="space-y-0.5 border-b border-dashed border-zinc-300 pb-2 mb-2 text-[10px]">
                  <div className="flex justify-between font-bold">
                    <span>RC: {lastReceipt.receiptNo}</span>
                    <span>{lastReceipt.date}</span>
                  </div>
                  {lastReceipt.cashier && (
                    <div className="text-zinc-600">Cashier: {lastReceipt.cashier}</div>
                  )}
                  <div className="text-zinc-700">
                    Customer: <strong>{lastReceipt.customer || "Walk-in Guest"}</strong>
                  </div>
                  {lastReceipt.customerGstin && (
                    <div className="text-zinc-600">Cust GSTIN: {lastReceipt.customerGstin}</div>
                  )}
                </div>

                {/* Itemized Line Items */}
                <div className="space-y-1.5 border-b border-dashed border-zinc-300 pb-2 mb-2">
                  <div className="flex justify-between font-bold text-[10px] text-zinc-700 border-b border-zinc-200 pb-1">
                    <span>ITEM & DETAILS</span>
                    <span>AMOUNT</span>
                  </div>
                  {lastReceipt.items.map((item) => (
                    <div key={item.id} className="space-y-0.5">
                      <div className="font-bold text-zinc-900 truncate">{item.name}</div>
                      <div className="flex justify-between text-[10px] text-zinc-600">
                        <span>
                          {item.qty} x {fmt(item.price, sysConfig?.currency)}
                        </span>
                        <span className="font-bold text-zinc-900">
                          {fmt(item.price * item.qty, sysConfig?.currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Financial Summary & Tax Breakout */}
                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between text-zinc-600">
                    <span>Subtotal</span>
                    <span>{fmt(lastReceipt.subtotal, sysConfig?.currency)}</span>
                  </div>
                  {lastReceipt.discountAmt > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Discount</span>
                      <span>-{fmt(lastReceipt.discountAmt, sysConfig?.currency)}</span>
                    </div>
                  )}
                  {lastReceipt.taxMode === "sgst_cgst" ? (
                    <>
                      <div className="flex justify-between text-zinc-600">
                        <span>CGST</span>
                        <span>{fmt(lastReceipt.cgst, sysConfig?.currency)}</span>
                      </div>
                      <div className="flex justify-between text-zinc-600">
                        <span>SGST</span>
                        <span>{fmt(lastReceipt.sgst, sysConfig?.currency)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-zinc-600">
                      <span>Tax / IGST</span>
                      <span>{fmt(lastReceipt.igst, sysConfig?.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-sm border-y-2 border-double border-zinc-900 py-1 my-1">
                    <span>GRAND TOTAL</span>
                    <span>{fmt(lastReceipt.total, sysConfig?.currency)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-700 font-medium">
                    <span>Paid via ({lastReceipt.paymentMode})</span>
                    <span>{fmt(lastReceipt.total, sysConfig?.currency)}</span>
                  </div>
                </div>

                {/* Barcode & Footer Notice */}
                <div className="text-center pt-2 mt-2 border-t border-dashed border-zinc-300 space-y-1">
                  <div className="text-[10px] font-bold text-zinc-800">*** THANK YOU FOR VISITING ***</div>
                  <div className="text-[9px] text-zinc-500">
                    Goods once sold are subject to store exchange policy.
                  </div>
                  <div className="font-mono text-[10px] tracking-widest text-zinc-700 pt-1">
                    *{lastReceipt.receiptNo}*
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="gap-1.5 sm:gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setIsReceiptOpen(false)}>
                Close
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  try {
                    triggerCashDrawerKick();
                    toast.success("Cash drawer kick pulse sent (ESC/POS pin 2)");
                  } catch (e) {
                    toast.error("Drawer kick error: " + (e instanceof Error ? e.message : "Unknown error"));
                  }
                }}
                className="text-xs"
              >
                Kick Drawer
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={async () => {
                  if (!lastReceipt) return;
                  const storeInfo = {
                    appName: sysConfig?.appName,
                    companyName: sysConfig?.appName,
                    address: sysConfig?.address,
                    phone: sysConfig?.phone,
                    email: sysConfig?.email,
                    gstin: sysConfig?.gstin,
                    currencySymbol: sysConfig?.currency_symbol || "₹",
                  };
                  try {
                    await printThermalReceipt(lastReceipt, storeInfo, "Receipt Printer", false, receiptPaperSize);
                    toast.success(`Silent print dispatched via QZ-Tray (${receiptPaperSize})`);
                  } catch (e) {
                    toast.info(`Thermal print queued (${receiptPaperSize})`);
                  }
                }}
                className="gap-1.5 text-xs font-semibold"
              >
                <Printer className="size-3.5" /> QZ Silent Print
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (!lastReceipt) return;
                  const storeInfo = {
                    appName: sysConfig?.appName,
                    companyName: sysConfig?.appName,
                    address: sysConfig?.address,
                    phone: sysConfig?.phone,
                    email: sysConfig?.email,
                    gstin: sysConfig?.gstin,
                    currencySymbol: sysConfig?.currency_symbol || "₹",
                  };
                  const html = generateThermalReceiptHtml(lastReceipt, storeInfo, receiptPaperSize);
                  openThermalPrintWindow(html, `Receipt_${lastReceipt.receiptNo}`);
                }}
                className="gap-2 font-bold bg-primary text-white"
              >
                <Printer className="size-4" /> Print Thermal Receipt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── MODAL: Open Register Shift ── */}
        <Dialog open={isRegisterOpenModalOpen} onOpenChange={setIsRegisterOpenModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Banknote className="size-5 text-amber-500" /> Open Cash Register Shift
              </DialogTitle>
              <DialogDescription>
                Enter the starting cash float present in the terminal cash drawer before ringing up sales.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Starting Float Amount ({sysConfig?.currency_symbol || "₹"})</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={openingFloatInput}
                  onChange={(e) => setOpeningFloatInput(e.target.value)}
                  placeholder="e.g. 1000"
                  className="font-bold text-lg font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  Cash float provided to cashier for daily change breakdown.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRegisterOpenModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleOpenShift} className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5">
                <CheckCircle2 className="size-4" /> Open Register
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── MODAL: Close Register Shift & Settle ── */}
        <Dialog open={isRegisterCloseModalOpen} onOpenChange={setIsRegisterCloseModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="size-5 text-emerald-600" /> End Shift & Cash Drawer Reconciliation
              </DialogTitle>
              <DialogDescription>
                Review expected register balances, enter counted cash, and reconcile discrepancies.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg border bg-muted/30">
                  <span className="text-muted-foreground">Cashier:</span>
                  <p className="font-bold text-sm mt-0.5">{shiftStatus?.shift?.cashierName || "Cashier"}</p>
                </div>
                <div className="p-2.5 rounded-lg border bg-muted/30">
                  <span className="text-muted-foreground">Terminal:</span>
                  <p className="font-bold text-sm mt-0.5">{shiftStatus?.shift?.registerName || "Counter Terminal"}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl border bg-muted/20 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Opening Float:</span>
                  <span className="font-mono font-semibold">{fmt(shiftStatus?.shift?.openingFloat || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cash Sales:</span>
                  <span className="font-mono font-semibold text-emerald-600">+{fmt(shiftStatus?.shift?.cashSales || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Card Sales:</span>
                  <span className="font-mono font-semibold text-blue-600">{fmt(shiftStatus?.shift?.cardSales || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">UPI / Digital:</span>
                  <span className="font-mono font-semibold text-purple-600">{fmt(shiftStatus?.shift?.upiSales || 0)}</span>
                </div>
                {(shiftStatus?.shift?.cashIn || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cash In (Drawer drops):</span>
                    <span className="font-mono font-semibold text-emerald-600">+{fmt(shiftStatus?.shift?.cashIn || 0)}</span>
                  </div>
                )}
                {(shiftStatus?.shift?.cashOut || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cash Out (Safe drops):</span>
                    <span className="font-mono font-semibold text-rose-600">-{fmt(shiftStatus?.shift?.cashOut || 0)}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between font-bold text-sm">
                  <span>Expected Cash in Drawer:</span>
                  <span className="font-mono text-primary">{fmt(shiftStatus?.shift?.expectedCash || 0)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Counted Cash in Drawer ({sysConfig?.currency_symbol || "₹"})</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={actualCashInput}
                  onChange={(e) => setActualCashInput(e.target.value)}
                  placeholder="Enter counted physical cash..."
                  className="font-bold text-lg font-mono"
                />
                {actualCashInput !== "" && !isNaN(Number(actualCashInput)) && (
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-muted-foreground">Discrepancy (Over / Short):</span>
                    <span className={`font-mono font-bold ${Number(actualCashInput) - (shiftStatus?.shift?.expectedCash || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {Number(actualCashInput) - (shiftStatus?.shift?.expectedCash || 0) >= 0 ? "+" : ""}
                      {fmt(Number(actualCashInput) - (shiftStatus?.shift?.expectedCash || 0))}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Closing Notes / Discrepancy Reason</Label>
                <Input
                  value={shiftCloseNotes}
                  onChange={(e) => setShiftCloseNotes(e.target.value)}
                  placeholder="e.g. Balanced drawer, safe drop verified"
                  className="text-xs"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRegisterCloseModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCloseShift}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
              >
                <CheckCircle2 className="size-4" /> Close Register & Settle
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PlanGuard>
  );
}

export default PosPage;
