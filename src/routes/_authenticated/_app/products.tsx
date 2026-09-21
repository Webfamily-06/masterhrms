import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  Package,
  Plus,
  Search,
  Trash2,
  Edit2,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Layers,
  Minus,
  ShieldCheck,
  LayoutGrid,
  List as ListIcon,
  Tag,
  Percent,
  Ruler,
  Warehouse as WarehouseIcon,
  Eye,
  ChevronLeft,
  ChevronRight,
  Upload,
  Sparkles,
  CheckCircle2,
  Boxes,
  ArrowRight, ArrowRightLeft,
  RefreshCw,
  ImageIcon,
  ShoppingBag,
  ExternalLink,
  Barcode,
  Printer,
  Download,
} from "lucide-react";
import { formatSystemAmount } from "@/lib/currency";
import { PlanGuard, PlanLimitBar } from "@/components/plan-guard";
import { generateBarcodeSvg } from "@/lib/barcode";
import { AIContentGeneratorModal } from "@/components/ai-content-generator-modal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/products")({
  component: ProductsAndServicesPage,
  head: () => ({ meta: [{ title: "Products & Services Catalog — Master ERP" }] }),
});

export type ItemType = "Product" | "Service" | "Part";

export type WarehouseStock = {
  warehouseId: string;
  warehouseName: string;
  quantity: number;
};

export type CatalogItem = {
  id: string;
  name: string;
  type: ItemType;
  sku: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  taxRate: number;
  taxName: string;
  salePrice: number;
  purchasePrice: number;
  unit: string;
  quantity: number;
  warehouseStocks: WarehouseStock[];
  image: string;
  additionalImages: string[];
  shortDescription: string;
  description: string;
  createdAt: string;
};

export type Product = Partial<CatalogItem> & {
  id: string;
  name: string;
  price: number;
  stock: number;
  sku: string;
  hsn_sac: string;
  gst_rate: number;
  unit: string;
  low_stock_threshold: number;
  category: string;
  description: string;
};

export type ProductCategory = {
  id: string;
  name: string;
  color: string;
  description?: string;
};

export type TaxRecord = {
  id: string;
  name: string;
  rate: number;
};


export type BrandRecord = {
  id: string;
  name: string;
  description?: string;
  image: string;
};
export type UnitRecord = {
  id: string;
  name: string;
};

export type WarehouseRecord = {
  id: string;
  name: string;
  location?: string;
};

const DEFAULT_CATEGORIES: ProductCategory[] = [
  { id: "cat-1", name: "Electronics & Hardware", color: "#3b82f6" },
  { id: "cat-2", name: "Software Licenses", color: "#8b5cf6" },
  { id: "cat-3", name: "Professional Services", color: "#10b981" },
  { id: "cat-4", name: "Spare Parts & Accessories", color: "#f59e0b" },
];

const DEFAULT_TAXES: TaxRecord[] = [
  { id: "tax-1", name: "GST 18% (Standard Rate)", rate: 18 },
  { id: "tax-2", name: "GST 12% (Apparel/Hardware)", rate: 12 },
  { id: "tax-3", name: "GST 5% (Essentials)", rate: 5 },
  { id: "tax-4", name: "Zero Tax (0%)", rate: 0 },
];

const DEFAULT_UNITS: UnitRecord[] = [
  { id: "u-1", name: "Piece (Pcs)" },
  { id: "u-2", name: "Pair (Pr)" },
  { id: "u-3", name: "Kilogram (Kg)" },
  { id: "u-4", name: "Box (Bx)" },
  { id: "u-5", name: "Meter (Mtr)" },
  { id: "u-6", name: "Hours (Hr)" },
  { id: "u-7", name: "Month (Mo)" },
];

const DEFAULT_WAREHOUSES: WarehouseRecord[] = [
  { id: "wh-1", name: "Main Central Warehouse", location: "Hub Terminal A" },
  { id: "wh-2", name: "Retail Storefront Depot", location: "Downtown Branch" },
  { id: "wh-3", name: "Regional Transit Facility", location: "West Zone Logistics" },
];

const DEFAULT_CATALOG_ITEMS: CatalogItem[] = [
  {
    id: "item-01",
    name: "Enterprise ERP Cloud Server Appliance",
    type: "Product",
    sku: "PRD-94821",
    categoryId: "cat-1",
    categoryName: "Electronics & Hardware",
    categoryColor: "#3b82f6",
    taxRate: 18,
    taxName: "GST 18% (Standard Rate)",
    salePrice: 45000,
    purchasePrice: 32000,
    unit: "Piece (Pcs)",
    quantity: 24,
    warehouseStocks: [
      { warehouseId: "wh-1", warehouseName: "Main Central Warehouse", quantity: 18 },
      { warehouseId: "wh-2", warehouseName: "Retail Storefront Depot", quantity: 6 },
    ],
    image: "/images/no-image.png",
    additionalImages: [
      "/logo.webp",
      "/logo.webp",
    ],
    shortDescription: "High-performance rack-mountable dedicated local backup unit with RAID 10.",
    description: "Enterprise multi-core local sync appliance for high security on-premises and hybrid cloud installations with automatic failover.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "item-02",
    name: "Biometric AI Face & Fingerprint Terminal",
    type: "Part",
    sku: "PRT-38192",
    categoryId: "cat-1",
    categoryName: "Electronics & Hardware",
    categoryColor: "#3b82f6",
    taxRate: 18,
    taxName: "GST 18% (Standard Rate)",
    salePrice: 14500,
    purchasePrice: 9500,
    unit: "Piece (Pcs)",
    quantity: 42,
    warehouseStocks: [
      { warehouseId: "wh-1", warehouseName: "Main Central Warehouse", quantity: 30 },
      { warehouseId: "wh-2", warehouseName: "Retail Storefront Depot", quantity: 12 },
    ],
    image: "/images/no-image.png",
    additionalImages: [
      "/logo.webp",
    ],
    shortDescription: "Dual-camera biometric punch terminal with TCP/IP sync.",
    description: "Optical biometric sensor and infrared live face verification terminal supporting 5,000 users and offline memory buffering.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "item-03",
    name: "Custom ERP Implementation & Training",
    type: "Service",
    sku: "SRV-10294",
    categoryId: "cat-3",
    categoryName: "Professional Services",
    categoryColor: "#10b981",
    taxRate: 18,
    taxName: "GST 18% (Standard Rate)",
    salePrice: 25000,
    purchasePrice: 0,
    unit: "Hours (Hr)",
    quantity: 999,
    warehouseStocks: [],
    image: "/images/no-image.png",
    additionalImages: [],
    shortDescription: "Dedicated hands-on onboarding, migration from legacy software & team training.",
    description: "Full-day consultation with senior solution architects including data import, role configuration, chart of accounts setup, and staff coaching.",
    createdAt: new Date().toISOString(),
  },
];

export function ProductsAndServicesPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";

  const [activeTab, setActiveTab] = useState<"items" | "stock" | "categories" | "taxes" | "units">("items");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Multi-step item creator state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    type: "Product" as ItemType,
    sku: "",
    categoryId: "",
    taxRate: 18,
    taxName: "GST 18% (Standard Rate)",
    salePrice: 0,
    purchasePrice: 0,
    unit: "Piece (Pcs)",
    quantity: 0,
    targetWarehouseId: "",
    image: "",
    additionalImages: [] as string[],
    newImageInput: "",
    shortDescription: "",
    description: "",
  });

  // Modals
  const [viewingItem, setViewingItem] = useState<CatalogItem | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [addStockItem, setAddStockItem] = useState<CatalogItem | null>(null);
  const [transferStockItem, setTransferStockItem] = useState<CatalogItem | null>(null);
  const [transferFromWh, setTransferFromWh] = useState<string>("");
  const [transferToWh, setTransferToWh] = useState<string>("");
  const [transferQty, setTransferQty] = useState<number>(1);
  const [isTransferring, setIsTransferring] = useState(false);
  const [addStockQty, setAddStockQty] = useState(1);
  const [addStockWarehouseId, setAddStockWarehouseId] = useState("");
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Category Setup modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: "", color: "#3b82f6", description: "" });

  // Tax Setup modal
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [taxForm, setTaxForm] = useState({ name: "", rate: 18 });

  // Unit Setup modal
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [unitForm, setUnitForm] = useState({ name: "" });

  // Brand Setup modal
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [brandForm, setBrandForm] = useState({ name: "", description: "", image: "/images/no-image.png" });

  // Fetch Brands
  const { data: brands = [], refetch: refetchBrands } = useQuery({
    queryKey: ["catalog-brands", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/products/brands");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // Regional currency config
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

  // 1. Fetch Categories (Relational API)
  const categoriesSlug = `tenant-${tenantId}-catalog-categories`;
  const { data: categories = DEFAULT_CATEGORIES } = useQuery({
    queryKey: ["catalog-categories", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/products/categories");
        if (Array.isArray(res) && res.length > 0) return res as ProductCategory[];
        const page = await api.get(`/cms/pages/${categoriesSlug}`);
        if (Array.isArray(page?.content) && page.content.length > 0) return page.content as ProductCategory[];
        return DEFAULT_CATEGORIES;
      } catch {
        return DEFAULT_CATEGORIES;
      }
    },
  });

  // 2. Fetch Taxes (Relational API)
  const taxesSlug = `tenant-${tenantId}-catalog-taxes`;
  const { data: taxes = DEFAULT_TAXES } = useQuery({
    queryKey: ["catalog-taxes", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/products/taxes");
        if (Array.isArray(res) && res.length > 0) return res as TaxRecord[];
        const page = await api.get(`/cms/pages/${taxesSlug}`);
        if (Array.isArray(page?.content) && page.content.length > 0) return page.content as TaxRecord[];
        return DEFAULT_TAXES;
      } catch {
        return DEFAULT_TAXES;
      }
    },
  });

  // 3. Fetch Units (Relational API)
  const unitsSlug = `tenant-${tenantId}-catalog-units`;
  const { data: units = DEFAULT_UNITS } = useQuery({
    queryKey: ["catalog-units", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/products/units");
        if (Array.isArray(res) && res.length > 0) return res as UnitRecord[];
        const page = await api.get(`/cms/pages/${unitsSlug}`);
        if (Array.isArray(page?.content) && page.content.length > 0) return page.content as UnitRecord[];
        return DEFAULT_UNITS;
      } catch {
        return DEFAULT_UNITS;
      }
    },
  });

  // 4. Fetch Warehouses (Relational API)
  const warehousesSlug = `tenant-${tenantId}-catalog-warehouses`;
  const { data: warehouses = DEFAULT_WAREHOUSES } = useQuery({
    queryKey: ["catalog-warehouses", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/products/warehouses");
        if (Array.isArray(res) && res.length > 0) return res as WarehouseRecord[];
        const page = await api.get(`/cms/pages/${warehousesSlug}`);
        if (Array.isArray(page?.content) && page.content.length > 0) return page.content as WarehouseRecord[];
        return DEFAULT_WAREHOUSES;
      } catch {
        return DEFAULT_WAREHOUSES;
      }
    },
  });

  // 5. Fetch Catalog Items (Relational API with legacy CMS fallback)
  const itemsSlug = `tenant-${tenantId}-catalog-items-v2`;
  const { data: items = DEFAULT_CATALOG_ITEMS, isLoading: isItemsLoading } = useQuery({
    queryKey: ["catalog-items-v2", tenantId],
    queryFn: async () => {
      try {
        const relProducts = await api.get("/products");
        if (Array.isArray(relProducts) && relProducts.length > 0) {
          return relProducts as CatalogItem[];
        }
        const page = await api.get(`/cms/pages/${itemsSlug}`);
        if (Array.isArray(page?.content) && page.content.length > 0) return page.content as CatalogItem[];
        return DEFAULT_CATALOG_ITEMS;
      } catch {
        return DEFAULT_CATALOG_ITEMS;
      }
    },
  });

  async function persistItems(newItems: CatalogItem[]) {
    try {
      await api.put(`/cms/pages/${itemsSlug}`, {
        title: `Catalog Items ${tenantId}`,
        content: newItems,
        published: true,
      });
    } catch {}
    qc.invalidateQueries({ queryKey: ["catalog-items-v2", tenantId] });
    qc.invalidateQueries({ queryKey: ["pos-products-catalog", tenantId] });
  }

  async function persistCategories(newCats: ProductCategory[]) {
    try {
      await api.put(`/cms/pages/${categoriesSlug}`, {
        title: `Catalog Categories ${tenantId}`,
        content: newCats,
        published: true,
      });
    } catch {}
    qc.invalidateQueries({ queryKey: ["catalog-categories", tenantId] });
  }

  async function persistTaxes(newTaxes: TaxRecord[]) {
    await api.put(`/cms/pages/${taxesSlug}`, {
      title: `Catalog Taxes ${tenantId}`,
      content: newTaxes,
      published: true,
    });
    qc.invalidateQueries({ queryKey: ["catalog-taxes", tenantId] });
  }

  async function persistUnits(newUnits: UnitRecord[]) {
    await api.put(`/cms/pages/${unitsSlug}`, {
      title: `Catalog Units ${tenantId}`,
      content: newUnits,
      published: true,
    });
    qc.invalidateQueries({ queryKey: ["catalog-units", tenantId] });
  }

  // SKU Auto-generator
  function generateSKU() {
    const prefix = formData.type === "Product" ? "PRD" : formData.type === "Part" ? "PRT" : "SRV";
    const randomCode = Math.floor(10000 + Math.random() * 90000);
    const sku = `${prefix}-${randomCode}`;
    setFormData((prev) => ({ ...prev, sku }));
    toast.success(`Generated SKU: ${sku}`);
  }

  // Open Create Modal
  function handleOpenCreateModal() {
    const defaultCat = categories[0] || DEFAULT_CATEGORIES[0];
    const defaultTax = taxes[0] || DEFAULT_TAXES[0];
    const defaultUnit = units[0]?.name || "Piece (Pcs)";
    const defaultWh = warehouses[0]?.id || "wh-1";

    setFormData({
      name: "",
      type: "Product",
      sku: `PRD-${Math.floor(10000 + Math.random() * 90000)}`,
      categoryId: defaultCat.id,
      taxRate: defaultTax.rate,
      taxName: defaultTax.name,
      salePrice: 0,
      purchasePrice: 0,
      unit: defaultUnit,
      quantity: 10,
      targetWarehouseId: defaultWh,
      image: "/images/no-image.png",
      additionalImages: [],
      newImageInput: "",
      shortDescription: "",
      description: "",
    });
    setCreateStep(1);
    setIsCreateModalOpen(true);
  }

  // Submit New Item
  async function handleSaveNewItem() {
    if (!formData.name.trim()) return toast.error("Please enter an item name");
    if (!formData.sku.trim()) return toast.error("Please provide or generate a SKU");

    const selCategory = categories.find((c) => c.id === formData.categoryId) || categories[0] || DEFAULT_CATEGORIES[0];
    const selTax = taxes.find((t) => t.rate === formData.taxRate) || taxes[0] || DEFAULT_TAXES[0];
    const selWarehouse = warehouses.find((w) => w.id === formData.targetWarehouseId) || warehouses[0] || DEFAULT_WAREHOUSES[0];

    const warehouseStocks: WarehouseStock[] =
      formData.type === "Service"
        ? []
        : [
            {
              warehouseId: selWarehouse.id,
              warehouseName: selWarehouse.name,
              quantity: Number(formData.quantity) || 0,
            },
          ];

    const newItem: CatalogItem = {
      id: `item-${Date.now()}`,
      name: formData.name.trim(),
      type: formData.type,
      sku: formData.sku.trim(),
      categoryId: selCategory.id,
      categoryName: selCategory.name,
      categoryColor: selCategory.color,
      taxRate: selTax.rate,
      taxName: selTax.name,
      salePrice: Number(formData.salePrice) || 0,
      purchasePrice: Number(formData.purchasePrice) || 0,
      unit: formData.unit,
      quantity: formData.type === "Service" ? 999 : Number(formData.quantity) || 0,
      warehouseStocks,
      image: formData.image || "/images/no-image.png",
      additionalImages: formData.additionalImages,
      shortDescription: formData.shortDescription,
      description: formData.description,
      createdAt: new Date().toISOString(),
    };

    try {
      // 1. Save to real relational MySQL Product & ProductWarehouse tables
      await api.post("/products", {
        name: formData.name.trim(),
        type: formData.type,
        sku: formData.sku.trim(),
        categoryId: selCategory.id,
        categoryName: selCategory.name,
        taxRate: selTax.rate,
        salePrice: Number(formData.salePrice) || 0,
        purchasePrice: Number(formData.purchasePrice) || 0,
        unit: formData.unit,
        quantity: formData.type === "Service" ? 999 : Number(formData.quantity) || 0,
        warehouseId: selWarehouse.id,
        image: formData.image || "/images/no-image.png",
        shortDescription: formData.shortDescription,
        description: formData.description,
      });

      // 2. Refresh queries
      await persistItems([newItem, ...items]);
      qc.invalidateQueries({ queryKey: ["catalog-items-v2", tenantId] });
      qc.invalidateQueries({ queryKey: ["pos-products-catalog", tenantId] });
      toast.success(`🎉 ${newItem.type} "${newItem.name}" added to catalog successfully!`);
      setIsCreateModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save item");
    }
  }

  // Delete Item
  async function handleDeleteItem(id: string, name: string) {
    if (!confirm(`Are you sure you want to remove "${name}" from the catalog?`)) return;
    try {
      await api.delete(`/products/${id}`);
    } catch (err) {
      console.warn("Relational delete fallback:", err);
    }
    const updated = items.filter((i) => i.id !== id);
    await persistItems(updated);
    qc.invalidateQueries({ queryKey: ["catalog-items-v2", tenantId] });
    qc.invalidateQueries({ queryKey: ["pos-products-catalog", tenantId] });
    toast.info(`Item "${name}" removed.`);
    if (viewingItem?.id === id) setViewingItem(null);
  }

  // Add Stock Handler
  // Multi-Warehouse Transfer Handler (Calls /api/transfers)
  async function handleTransferStockSubmit() {
    if (!transferStockItem) return;
    if (!transferFromWh || !transferToWh) return toast.error("Please select both source and destination warehouses");
    if (transferFromWh === transferToWh) return toast.error("Source and destination warehouses cannot be the same");
    const qty = Number(transferQty);
    if (isNaN(qty) || qty <= 0) return toast.error("Please enter a valid transfer quantity");

    setIsTransferring(true);
    try {
      await api.post("/transfers", {
        fromWarehouseId: transferFromWh,
        toWarehouseId: transferToWh,
        items: [{ productId: transferStockItem.id, quantity: qty }],
        notes: "Inter-warehouse stock transfer requested from Products Studio"
      });
    } catch (err) {
      console.warn("Backend API sync fallback for transfer:", err);
    }

    // Update local state
    const sourceWh = warehouses.find(w => w.id === transferFromWh);
    const destWh = warehouses.find(w => w.id === transferToWh);

    const updated = items.map((item) => {
      if (item.id === transferStockItem.id) {
        const stocks = [...item.warehouseStocks];
        const srcIdx = stocks.findIndex(w => w.warehouseId === transferFromWh);
        const dstIdx = stocks.findIndex(w => w.warehouseId === transferToWh);
        if (srcIdx >= 0) stocks[srcIdx].quantity = Math.max(0, stocks[srcIdx].quantity - qty);
        if (dstIdx >= 0) {
          stocks[dstIdx].quantity += qty;
        } else {
          stocks.push({
            warehouseId: transferToWh,
            warehouseName: destWh?.name || "Warehouse",
            quantity: qty
          });
        }
        return { ...item, warehouseStocks: stocks };
      }
      return item;
    });

    await persistItems(updated);
    toast.success(`✓ Transferred ${qty} units from ${sourceWh?.name || "Source"} to ${destWh?.name || "Destination"}`);
    setIsTransferring(false);
    setTransferStockItem(null);
  }

  async function handleAddStockSubmit() {
    if (!addStockItem) return;
    const qtyToAdd = Number(addStockQty);
    if (isNaN(qtyToAdd) || qtyToAdd <= 0) return toast.error("Please enter a valid stock quantity");

    const selWarehouse = warehouses.find((w) => w.id === addStockWarehouseId) || warehouses[0] || DEFAULT_WAREHOUSES[0];

    try {
      await api.post("/products/stock/add", {
        productId: addStockItem.id,
        warehouseId: selWarehouse.id,
        quantity: qtyToAdd,
      });
    } catch (err) {
      console.warn("Relational add stock fallback:", err);
    }

    const updated = items.map((item) => {
      if (item.id === addStockItem.id) {
        const stocks = [...item.warehouseStocks];
        const whIndex = stocks.findIndex((w) => w.warehouseId === selWarehouse.id);
        if (whIndex >= 0) {
          stocks[whIndex].quantity += qtyToAdd;
        } else {
          stocks.push({
            warehouseId: selWarehouse.id,
            warehouseName: selWarehouse.name,
            quantity: qtyToAdd,
          });
        }
        return {
          ...item,
          quantity: item.quantity + qtyToAdd,
          warehouseStocks: stocks,
        };
      }
      return item;
    });

    await persistItems(updated);
    qc.invalidateQueries({ queryKey: ["catalog-items-v2", tenantId] });
    qc.invalidateQueries({ queryKey: ["pos-products-catalog", tenantId] });
    toast.success(`✓ Added ${qtyToAdd} ${addStockItem.unit} to "${selWarehouse.name}" for "${addStockItem.name}".`);
    setAddStockItem(null);
  }

  // Category Save
  async function handleSaveCategory() {
    if (!categoryForm.name.trim()) return toast.error("Please enter category name");
    const newCat: ProductCategory = {
      id: `cat-${Date.now()}`,
      name: categoryForm.name.trim(),
      color: categoryForm.color || "#3b82f6",
      description: categoryForm.description,
    };
    try {
      await api.post("/products/categories", {
        name: categoryForm.name.trim(),
        color: categoryForm.color || "#3b82f6",
        description: categoryForm.description,
      });
      qc.invalidateQueries({ queryKey: ["catalog-categories", tenantId] });
    } catch (err) {
      console.warn("Relational category save fallback:", err);
    }
    await persistCategories([...categories, newCat]);
    toast.success(`Category "${newCat.name}" created!`);
    setCategoryForm({ name: "", color: "#3b82f6", description: "" });
    setIsCategoryModalOpen(false);
  }

  // Tax Save
  async function handleSaveTax() {
    if (!taxForm.name.trim()) return toast.error("Please enter tax name");
    const newTax: TaxRecord = {
      id: `tax-${Date.now()}`,
      name: taxForm.name.trim(),
      rate: Number(taxForm.rate) || 0,
    };
    try {
      await api.post("/products/taxes", {
        name: taxForm.name.trim(),
        rate: Number(taxForm.rate) || 0,
      });
      qc.invalidateQueries({ queryKey: ["catalog-taxes", tenantId] });
    } catch (err) {
      console.warn("Relational tax save fallback:", err);
    }
    await persistTaxes([...taxes, newTax]);
    toast.success(`Tax rate "${newTax.name}" added!`);
    setTaxForm({ name: "", rate: 18 });
    setIsTaxModalOpen(false);
  }

  // Unit Save
  async function handleSaveUnit() {
    if (!unitForm.name.trim()) return toast.error("Please enter unit name");
    const newUnit: UnitRecord = {
      id: `unit-${Date.now()}`,
      name: unitForm.name.trim(),
    };
    try {
      await api.post("/products/units", {
        name: unitForm.name.trim(),
      });
      qc.invalidateQueries({ queryKey: ["catalog-units", tenantId] });
    } catch (err) {
      console.warn("Relational unit save fallback:", err);
    }
    await persistUnits([...units, newUnit]);
    toast.success(`Unit "${newUnit.name}" added!`);
    setUnitForm({ name: "" });
    setIsUnitModalOpen(false);
  }

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase()) ||
        item.categoryName.toLowerCase().includes(search.toLowerCase()) ||
        item.shortDescription.toLowerCase().includes(search.toLowerCase());

      const matchType = filterType === "all" || item.type.toLowerCase() === filterType.toLowerCase();
      const matchCat = filterCategory === "all" || item.categoryId === filterCategory;

      return matchSearch && matchType && matchCat;
    });
  }, [items, search, filterType, filterCategory]);

  return (
    <PlanGuard moduleName="Product & Service Add-on" requiredPlan="free">
      <div className="space-y-6 max-w-full pb-16">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Boxes className="size-6 text-primary" /> Products & Services Hub
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage product catalogs, service tiers, spare parts, SKU barcodes, multi-warehouse stocks, and taxes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleOpenCreateModal} className="h-9 font-bold text-xs gap-1.5 shadow-sm" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff" }}>
              <Plus className="size-4" /> Create New Item
            </Button>
          </div>
        </div>

        {/* Sneat Pro Product & Inventory KPI Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Total Catalog Items", value: `${items.length} Items`, desc: "Active products & services", icon: Boxes, color: "text-primary bg-primary/10" },
            { title: "Active Categories", value: `${categories.length} Categories`, desc: "Organized taxonomy groups", icon: Tag, color: "text-[oklch(0.60_0.17_155)] bg-[oklch(0.60_0.17_155/0.10)]" },
            { title: "Low Stock Alert", value: `${items.filter(i => i.type === "Product" && i.quantity < 5).length} Items`, desc: "Reorder threshold reached", icon: AlertTriangle, color: "text-[oklch(0.73_0.16_75)] bg-[oklch(0.73_0.16_75/0.10)]" },
            { title: "Tax Codes", value: `${taxes.length} Standard Rates`, desc: "GST/VAT rates configured", icon: Percent, color: "text-[oklch(0.60_0.20_200)] bg-[oklch(0.60_0.20_200/0.10)]" },
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

        {/* Main Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
          <TabsList className="grid grid-cols-2 sm:grid-cols-6 h-9 p-1 bg-muted/60">
            <TabsTrigger value="items" className="text-xs font-bold gap-1.5">
              <Package className="size-3.5" /> Items Catalog ({items.length})
            </TabsTrigger>
            <TabsTrigger value="stock" className="text-xs font-bold gap-1.5">
              <WarehouseIcon className="size-3.5" /> Stock Ledger
            </TabsTrigger>
            <TabsTrigger value="categories" className="text-xs font-bold gap-1.5">
              <Tag className="size-3.5" /> Categories ({categories.length})
            </TabsTrigger>
            <TabsTrigger value="brands" className="text-xs font-bold gap-1.5">
              <ShoppingBag className="size-3.5" /> Brands ({brands.length})
            </TabsTrigger>
            <TabsTrigger value="taxes" className="text-xs font-bold gap-1.5">
              <Percent className="size-3.5" /> Taxes ({taxes.length})
            </TabsTrigger>
            <TabsTrigger value="units" className="text-xs font-bold gap-1.5">
              <Ruler className="size-3.5" /> Units ({units.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: ITEMS CATALOG */}
          <TabsContent value="items" className="space-y-4">
            {/* Search, Filters & View Toggle Bar */}
            <Card className="p-4 border shadow-2xs space-y-3">
              <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by Name, SKU code, category..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Item Type Filter */}
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="h-9 w-[130px] text-xs">
                      <SelectValue placeholder="Item Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All Types</SelectItem>
                      <SelectItem value="product" className="text-xs">📦 Products</SelectItem>
                      <SelectItem value="service" className="text-xs">⚡ Services</SelectItem>
                      <SelectItem value="part" className="text-xs">🔩 Parts</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Category Filter */}
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="h-9 w-[160px] text-xs">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All Categories</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {(search || filterType !== "all" || filterCategory !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearch("");
                        setFilterType("all");
                        setFilterCategory("all");
                      }}
                      className="h-9 text-xs text-muted-foreground"
                    >
                      Clear
                    </Button>
                  )}

                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-1 border p-1 rounded-lg bg-secondary/20 ml-auto">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-1.5 rounded text-xs transition-all ${
                        viewMode === "grid" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:bg-secondary"
                      }`}
                      title="Grid View"
                    >
                      <LayoutGrid className="size-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-1.5 rounded text-xs transition-all ${
                        viewMode === "list" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:bg-secondary"
                      }`}
                      title="List View"
                    >
                      <ListIcon className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Results Grid / List */}
            {isItemsLoading ? (
              <div className="py-16 grid place-items-center">
                <RefreshCw className="size-8 animate-spin text-primary" />
              </div>
            ) : filteredItems.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground space-y-3">
                <Boxes className="size-10 mx-auto opacity-30 text-primary" />
                <p className="text-sm font-semibold">No items found matching your filter criteria.</p>
                <Button size="sm" variant="outline" onClick={handleOpenCreateModal}>
                  Create New Item
                </Button>
              </Card>
            ) : viewMode === "grid" ? (
              /* GRID VIEW */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredItems.map((item) => {
                  const typeBg =
                    item.type === "Product"
                      ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                      : item.type === "Service"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/20";

                  return (
                    <Card
                      key={item.id}
                      className="group overflow-hidden flex flex-col justify-between border shadow-2xs hover:border-primary/50 transition-all hover:shadow-md"
                    >
                      <div>
                        {/* Image Banner */}
                        <div className="h-44 relative bg-secondary/30 overflow-hidden cursor-pointer" onClick={() => setViewingItem(item)}>
                          <img
                            src={item.image || "/images/no-image.png"}
                            alt={item.name}
                            className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/images/no-image.png";
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

                          {/* Type Badge & Category */}
                          <div className="absolute top-3 left-3 flex items-center gap-1.5">
                            <Badge className={`text-[10px] font-bold uppercase font-mono ${typeBg}`}>
                              {item.type}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-background/80 backdrop-blur-md"
                              style={{ borderColor: item.categoryColor, color: item.categoryColor }}
                            >
                              ● {item.categoryName}
                            </Badge>
                          </div>

                          {/* Stock Badge */}
                          <div className="absolute top-3 right-3">
                            {item.type === "Service" ? (
                              <Badge className="bg-emerald-500 text-white text-[10px] font-mono">
                                Unlimited
                              </Badge>
                            ) : (
                              <Badge
                                className={`text-[10px] font-mono font-bold ${
                                  item.quantity <= 5
                                    ? "bg-rose-500 text-white"
                                    : "bg-background/90 text-foreground border"
                                }`}
                              >
                                {item.quantity} in stock
                              </Badge>
                            )}
                          </div>

                          {/* SKU Pill */}
                          <div className="absolute bottom-2.5 left-3">
                            <span className="text-[11px] font-mono font-bold text-foreground bg-background/80 px-2 py-0.5 rounded backdrop-blur-md border">
                              {item.sku}
                            </span>
                          </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-4 space-y-3">
                          <div>
                            <h3
                              className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors cursor-pointer"
                              onClick={() => setViewingItem(item)}
                            >
                              {item.name}
                            </h3>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {item.shortDescription || item.description || "No description provided."}
                            </p>
                          </div>

                          {/* Sale & Purchase Price Boxes */}
                          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                            <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                              <span className="text-[10px] font-semibold text-emerald-600 uppercase block">Sale Price</span>
                              <strong className="font-mono text-xs text-emerald-700 dark:text-emerald-400">
                                {formatSystemAmount(item.salePrice, sysConfig)}
                              </strong>
                            </div>
                            <div className="p-2 rounded-lg bg-secondary/50 border">
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase block">Purchase Price</span>
                              <strong className="font-mono text-xs text-foreground">
                                {formatSystemAmount(item.purchasePrice, sysConfig)}
                              </strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Actions Footer */}
                      <div className="p-3 border-t bg-muted/20 flex items-center justify-between gap-1.5 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setViewingItem(item)}
                            className="h-8 text-xs font-bold gap-1"
                          >
                            <Eye className="size-3.5 text-primary" /> View
                          </Button>
                          {item.type !== "Service" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setAddStockItem(item);
                                setAddStockQty(5);
                                setAddStockWarehouseId(warehouses[0]?.id || "wh-1");
                              }}
                              className="h-8 text-xs font-bold gap-1 text-emerald-600 border border-emerald-500/20"
                            >
                              <Plus className="size-3.5" /> Stock
                            </Button>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="size-8 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              /* LIST VIEW */
              <Card className="border shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Item / Product</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Sale Price</TableHead>
                        <TableHead className="text-right">Purchase Price</TableHead>
                        <TableHead className="text-center">Stock</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow key={item.id} className="hover:bg-muted/20">
                          <TableCell className="font-semibold text-foreground">
                            <div className="flex items-center gap-2.5">
                              <img src={item.image || "/images/no-image.png"} alt={item.name} className="size-8 rounded object-cover border" onError={(e) => { e.currentTarget.src = "/images/no-image.png"; }} />
                              <div>
                                <span className="font-bold block">{item.name}</span>
                                <span className="text-[10px] text-muted-foreground">{item.unit}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {item.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-primary font-bold">{item.sku}</TableCell>
                          <TableCell>
                            <Badge variant="outline" style={{ borderColor: item.categoryColor, color: item.categoryColor }}>
                              ● {item.categoryName}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-emerald-600">
                            {formatSystemAmount(item.salePrice, sysConfig)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {formatSystemAmount(item.purchasePrice, sysConfig)}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.type === "Service" ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                                Unlimited
                              </Badge>
                            ) : (
                              <Badge className="font-mono text-[10px] bg-secondary">
                                {item.quantity} {item.unit}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setViewingItem(item)}
                                className="h-7 text-xs font-bold gap-1 text-primary"
                              >
                                <Eye className="size-3.5" /> View
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteItem(item.id, item.name)}
                                className="size-7 text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* TAB 2: STOCK LEDGER */}
          <TabsContent value="stock" className="space-y-4">
            <Card className="border shadow-2xs overflow-hidden">
              <CardHeader className="p-4 border-b bg-muted/30 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <WarehouseIcon className="size-4 text-primary" /> Multi-Warehouse Stock Breakdown
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Live inventory counts segregated per warehouse facility.
                  </CardDescription>
                </div>
              </CardHeader>
              <div className="overflow-x-auto">
                <Table className="text-xs">
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Total Stock</TableHead>
                      <TableHead>Warehouse Breakdown</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/20">
                        <TableCell className="font-bold text-foreground">{item.name}</TableCell>
                        <TableCell className="font-mono text-primary font-semibold">{item.sku}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-mono">{item.type}</Badge>
                        </TableCell>
                        <TableCell className="font-mono font-bold text-foreground">
                          {item.type === "Service" ? "N/A (Service)" : `${item.quantity} ${item.unit}`}
                        </TableCell>
                        <TableCell>
                          {item.type === "Service" ? (
                            <span className="text-muted-foreground text-[11px]">No physical stock tracking</span>
                          ) : item.warehouseStocks?.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {item.warehouseStocks.map((w, idx) => (
                                <Badge key={idx} variant="secondary" className="text-[10px] font-mono">
                                  {w.warehouseName}: <strong className="ml-1 text-primary">{w.quantity}</strong>
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.type !== "Service" && (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setTransferStockItem(item);
                                  setTransferFromWh(warehouses[0]?.id || "wh-1");
                                  setTransferToWh(warehouses[1]?.id || warehouses[0]?.id || "wh-2");
                                  setTransferQty(1);
                                }}
                                className="h-7 text-xs font-semibold gap-1 text-indigo-600 border-indigo-500/30 hover:bg-indigo-50"
                              >
                                <ArrowRightLeft className="size-3" /> Transfer
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setAddStockItem(item);
                                  setAddStockQty(10);
                                  setAddStockWarehouseId(warehouses[0]?.id || "wh-1");
                                }}
                                className="h-7 text-xs font-bold gap-1 text-emerald-600 border-emerald-500/30"
                              >
                                <Plus className="size-3.5" /> Add Stock
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 3: CATEGORIES */}
          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Product & Service Categories</h3>
                <p className="text-xs text-muted-foreground">Color-coded category tags for reporting.</p>
              </div>
              <Button size="sm" onClick={() => setIsCategoryModalOpen(true)} className="gap-1.5 text-xs font-bold">
                <Plus className="size-3.5" /> Create Category
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map((cat) => {
                const count = items.filter((i) => i.categoryId === cat.id).length;
                return (
                  <Card key={cat.id} className="p-4 border shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-4 rounded-full border shadow-2xs shrink-0" style={{ backgroundColor: cat.color }} />
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{cat.name}</h4>
                        <span className="text-xs text-muted-foreground font-mono">{count} Items assigned</span>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={async () => {
                        if (confirm(`Delete category "${cat.name}"?`)) {
                          await persistCategories(categories.filter((c) => c.id !== cat.id));
                          toast.info("Category removed.");
                        }
                      }}
                      className="size-7 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* TAB 4: TAXES */}
          <TabsContent value="taxes" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Tax Rates & GST Config</h3>
                <p className="text-xs text-muted-foreground">Applicable tax rates for invoicing and price calculation.</p>
              </div>
              <Button size="sm" onClick={() => setIsTaxModalOpen(true)} className="gap-1.5 text-xs font-bold">
                <Plus className="size-3.5" /> Add Tax Rate
              </Button>
            </div>

            <Card className="border shadow-2xs overflow-hidden">
              <Table className="text-xs">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Tax Description</TableHead>
                    <TableHead className="text-center">Rate (%)</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxes.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-bold text-foreground">{t.name}</TableCell>
                      <TableCell className="text-center font-mono font-bold text-primary">{t.rate}%</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={async () => {
                            if (confirm(`Remove tax rate "${t.name}"?`)) {
                              await persistTaxes(taxes.filter((tx) => tx.id !== t.id));
                              toast.info("Tax rate removed.");
                            }
                          }}
                          className="size-7 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* TAB 5: UNITS */}
          <TabsContent value="units" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">Measurement Units</h3>
                <p className="text-xs text-muted-foreground">Standard measurement units for inventory packaging.</p>
              </div>
              <Button size="sm" onClick={() => setIsUnitModalOpen(true)} className="gap-1.5 text-xs font-bold">
                <Plus className="size-3.5" /> Add Unit
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {units.map((u) => (
                <Card key={u.id} className="p-3 border shadow-2xs flex items-center justify-between">
                  <span className="font-bold text-xs text-foreground">{u.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={async () => {
                      if (confirm(`Remove unit "${u.name}"?`)) {
                        await persistUnits(units.filter((un) => un.id !== u.id));
                        toast.info("Unit removed.");
                      }
                    }}
                    className="size-6 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* ─── MODAL 1: MULTI-STEP ITEM CREATOR ─── */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Boxes className="size-5 text-primary" /> Create New Item / Service
              </DialogTitle>
              <DialogDescription className="text-xs">
                Step {createStep} of 4 — Configure specifications, pricing, gallery images & warehouse.
              </DialogDescription>
            </DialogHeader>

            {/* Stepper Progress Indicator */}
            <div className="grid grid-cols-4 gap-2 pt-1 pb-3 border-b text-[11px] font-bold">
              {[
                { s: 1, label: "1. Basic Info" },
                { s: 2, label: "2. Pricing & Units" },
                { s: 3, label: "3. Media Gallery" },
                { s: 4, label: "4. Warehouse" },
              ].map((stepObj) => (
                <div
                  key={stepObj.s}
                  className={`p-2 rounded-lg text-center border transition-all ${
                    createStep === stepObj.s
                      ? "bg-primary text-primary-foreground border-primary font-black shadow-xs"
                      : createStep > stepObj.s
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-muted/40 text-muted-foreground border-transparent"
                  }`}
                >
                  {stepObj.label}
                </div>
              ))}
            </div>

            {/* STEP 1: BASIC INFORMATION */}
            {createStep === 1 && (
              <div className="space-y-4 py-2 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Item Type *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(val: ItemType) => setFormData({ ...formData, type: val })}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Product" className="text-xs">📦 Product (Physical Goods)</SelectItem>
                        <SelectItem value="Service" className="text-xs">⚡ Service (Labor / Consulting)</SelectItem>
                        <SelectItem value="Part" className="text-xs">🔩 Part (Component / Hardware)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Category *</Label>
                    <Select
                      value={formData.categoryId}
                      onValueChange={(val) => setFormData({ ...formData, categoryId: val })}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-xs">
                            <div className="flex items-center gap-2">
                              <span className="size-2.5 rounded-full inline-block" style={{ backgroundColor: c.color }} />
                              {c.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Item / Service Name *</Label>
                  <Input
                    placeholder="e.g. Enterprise Cloud Server Appliance"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-bold">SKU Code *</Label>
                      <button type="button" onClick={generateSKU} className="text-[10px] text-primary hover:underline font-bold">
                        ⚡ Auto-Generate
                      </button>
                    </div>
                    <Input
                      placeholder="e.g. PRD-84920"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Applicable Tax Rate</Label>
                    <Select
                      value={String(formData.taxRate)}
                      onValueChange={(val) => {
                        const sel = taxes.find((t) => t.rate === Number(val));
                        setFormData({ ...formData, taxRate: Number(val), taxName: sel?.name || "GST" });
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {taxes.map((t) => (
                          <SelectItem key={t.id} value={String(t.rate)} className="text-xs">
                            {t.name} ({t.rate}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Short Summary / Tagline</Label>
                  <Input
                    placeholder="Brief 1-line overview of this item"
                    value={formData.shortDescription}
                    onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold">Full Formatted Description</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setIsAiModalOpen(true)}
                      className="h-6 text-[10px] gap-1 font-bold text-indigo-600 border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 shadow-2xs"
                    >
                      <Sparkles className="size-3 text-indigo-500 animate-pulse" /> Generate with AI
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Detailed specifications, warranty details, and terms (or generate using AI above)..."
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="text-xs resize-none"
                  />
                </div>
              </div>
            )}

            {/* STEP 2: PRICING & UNITS */}
            {createStep === 2 && (
              <div className="space-y-4 py-2 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-emerald-600">Sale Price (Selling Rate) *</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={formData.salePrice}
                      onChange={(e) => setFormData({ ...formData, salePrice: parseFloat(e.target.value) || 0 })}
                      className="h-9 text-xs font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Purchase Price (Cost Rate)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={formData.purchasePrice}
                      onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Measurement Unit *</Label>
                    <Select
                      value={formData.unit}
                      onValueChange={(val) => setFormData({ ...formData, unit: val })}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((u) => (
                          <SelectItem key={u.id} value={u.name} className="text-xs">
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.type !== "Service" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Initial Stock Quantity *</Label>
                      <Input
                        type="number"
                        placeholder="10"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                        className="h-9 text-xs font-mono font-bold"
                      />
                    </div>
                  )}
                </div>

                {/* Profit Margin Preview Card */}
                {formData.salePrice > 0 && formData.purchasePrice > 0 && (
                  <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/20 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Gross Margin Estimate:</span>
                      <div className="font-mono font-black text-emerald-600 text-sm">
                        {formatSystemAmount(formData.salePrice - formData.purchasePrice, sysConfig)} per unit
                      </div>
                    </div>
                    <Badge className="bg-emerald-500 text-white font-mono">
                      {Math.round(((formData.salePrice - formData.purchasePrice) / formData.salePrice) * 100)}% Margin
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: MEDIA & IMAGES GALLERY */}
            {createStep === 3 && (
              <div className="space-y-4 py-2 text-xs">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <ImageIcon className="size-3.5 text-primary" /> Main Product Image (URL) *
                  </Label>
                  <Input
                    placeholder="https://images.unsplash.com/photo-..."
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                  {formData.image && (
                    <div className="h-32 rounded-xl border overflow-hidden bg-secondary/30 mt-2">
                      <img src={formData.image || "/images/no-image.png"} alt="Preview" className="size-full object-cover" onError={(e) => { e.currentTarget.src = "/images/no-image.png"; }} />
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-xs font-bold">Additional Gallery Images</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Paste additional image URL"
                      value={formData.newImageInput}
                      onChange={(e) => setFormData({ ...formData, newImageInput: e.target.value })}
                      className="h-9 text-xs font-mono flex-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        if (!formData.newImageInput.trim()) return;
                        setFormData({
                          ...formData,
                          additionalImages: [...formData.additionalImages, formData.newImageInput.trim()],
                          newImageInput: "",
                        });
                        toast.success("Additional image added to gallery");
                      }}
                      className="h-9 text-xs font-bold gap-1"
                    >
                      <Plus className="size-3.5" /> Add
                    </Button>
                  </div>

                  {formData.additionalImages.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 pt-2">
                      {formData.additionalImages.map((imgUrl, idx) => (
                        <div key={idx} className="relative h-16 rounded-lg border overflow-hidden group">
                          <img src={imgUrl} alt={`gallery-${idx}`} className="size-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                additionalImages: formData.additionalImages.filter((_, i) => i !== idx),
                              });
                            }}
                            className="absolute top-1 right-1 size-5 rounded-full bg-rose-500 text-white grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 4: WAREHOUSE & CONFIRMATION */}
            {createStep === 4 && (
              <div className="space-y-4 py-2 text-xs">
                {formData.type !== "Service" ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Assign Target Storage Warehouse *</Label>
                    <Select
                      value={formData.targetWarehouseId}
                      onValueChange={(val) => setFormData({ ...formData, targetWarehouseId: val })}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select Warehouse" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((w) => (
                          <SelectItem key={w.id} value={w.id} className="text-xs">
                            <div className="flex items-center gap-2">
                              <WarehouseIcon className="size-3.5 text-primary" />
                              <span>{w.name} {w.location ? `(${w.location})` : ""}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                    <strong className="block text-xs font-bold">⚡ Service Item Type Selected</strong>
                    <p className="text-[11px] mt-0.5">Physical warehouse allocation is not required for non-inventory consulting or cloud services.</p>
                  </div>
                )}

                {/* Final Overview Summary */}
                <Card className="p-3.5 border bg-muted/20 space-y-2 text-xs">
                  <h4 className="font-bold text-xs uppercase text-muted-foreground">Item Review Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div><span>Name:</span> <strong className="text-foreground block">{formData.name || "—"}</strong></div>
                    <div><span>SKU:</span> <strong className="font-mono text-primary block">{formData.sku || "—"}</strong></div>
                    <div><span>Sale Price:</span> <strong className="font-mono text-emerald-600 block">{formatSystemAmount(formData.salePrice, sysConfig)}</strong></div>
                    <div><span>Stock:</span> <strong className="font-mono text-foreground block">{formData.type === "Service" ? "Unlimited" : `${formData.quantity} ${formData.unit}`}</strong></div>
                  </div>
                </Card>
              </div>
            )}

            {/* Stepper Footer Controls */}
            <DialogFooter className="flex justify-between sm:justify-between items-center w-full pt-3 border-t">
              <div>
                {createStep > 1 ? (
                  <Button size="sm" variant="outline" onClick={() => setCreateStep(createStep - 1)} className="gap-1 text-xs">
                    <ChevronLeft className="size-3.5" /> Previous
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Cancel
                  </Button>
                )}
              </div>

              <div>
                {createStep < 4 ? (
                  <Button size="sm" onClick={() => setCreateStep(createStep + 1)} className="gap-1 text-xs font-bold">
                    Next <ChevronRight className="size-3.5" />
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleSaveNewItem} className="gap-1.5 text-xs font-bold bg-primary text-white">
                    <CheckCircle2 className="size-3.5" /> Save Item
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── MODAL 2: ITEM DETAILS PASSPORT & IMAGE CAROUSEL ─── */}
        <Dialog open={!!viewingItem} onOpenChange={(open) => !open && setViewingItem(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            {viewingItem && (() => {
              const allImages = [viewingItem.image, ...(viewingItem.additionalImages || [])].filter(Boolean);
              const currentImg = allImages[activeImageIndex] || viewingItem.image;

              return (
                <div className="space-y-5 text-xs">
                  <DialogHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="font-mono text-[10px]" style={{ borderColor: viewingItem.categoryColor, color: viewingItem.categoryColor }}>
                        ● {viewingItem.categoryName}
                      </Badge>
                      <Badge className="font-mono text-[10px] uppercase">{viewingItem.type}</Badge>
                    </div>
                    <DialogTitle className="text-lg font-black text-foreground mt-1">
                      {viewingItem.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs font-mono text-primary font-bold">
                      SKU: {viewingItem.sku}
                    </DialogDescription>
                  </DialogHeader>

                  {/* 1. Image Carousel Banner */}
                  <div className="space-y-2">
                    <div className="h-56 relative rounded-2xl border overflow-hidden bg-secondary/30">
                      <img src={currentImg || "/images/no-image.png"} alt={viewingItem.name} className="size-full object-cover" onError={(e) => { e.currentTarget.src = "/images/no-image.png"; }} />
                      {allImages.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1))}
                            className="absolute left-3 top-1/2 -translate-y-1/2 size-8 rounded-full bg-background/80 hover:bg-background text-foreground grid place-items-center shadow-md backdrop-blur-md"
                          >
                            <ChevronLeft className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 size-8 rounded-full bg-background/80 hover:bg-background text-foreground grid place-items-center shadow-md backdrop-blur-md"
                          >
                            <ChevronRight className="size-4" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Thumbnails */}
                    {allImages.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {allImages.map((img, i) => (
                          <div
                            key={i}
                            onClick={() => setActiveImageIndex(i)}
                            className={`size-14 rounded-lg border overflow-hidden cursor-pointer shrink-0 transition-all ${
                              activeImageIndex === i ? "ring-2 ring-primary border-primary" : "opacity-60 hover:opacity-100"
                            }`}
                          >
                            <img src={img || "/images/no-image.png"} alt={`thumb-${i}`} className="size-full object-cover" onError={(e) => { e.currentTarget.src = "/images/no-image.png"; }} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 2. Pricing & Inventory Key Figures */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase">Sale Price</span>
                      <div className="text-base font-black font-mono text-emerald-700 dark:text-emerald-300 mt-0.5">
                        {formatSystemAmount(viewingItem.salePrice, sysConfig)}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/50 border">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Purchase Cost</span>
                      <div className="text-base font-black font-mono text-foreground mt-0.5">
                        {formatSystemAmount(viewingItem.purchasePrice, sysConfig)}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                      <span className="text-[10px] font-bold text-primary uppercase">Total Stock</span>
                      <div className="text-base font-black font-mono text-primary mt-0.5">
                        {viewingItem.type === "Service" ? "Unlimited" : `${viewingItem.quantity} ${viewingItem.unit}`}
                      </div>
                    </div>
                  </div>

                  {/* 3. Warehouse Stocks Breakdown */}
                  {viewingItem.type !== "Service" && (
                    <div className="space-y-2 pt-2 border-t">
                      <h4 className="font-bold text-xs uppercase text-muted-foreground flex items-center gap-1.5">
                        <WarehouseIcon className="size-3.5 text-primary" /> Warehouse Stock Allocation
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {viewingItem.warehouseStocks?.map((w, idx) => (
                          <div key={idx} className="p-2.5 rounded-lg border bg-secondary/20 flex justify-between items-center text-xs">
                            <span className="font-semibold text-foreground">{w.warehouseName}</span>
                            <Badge variant="outline" className="font-mono font-bold text-primary bg-background">
                              {w.quantity} {viewingItem.unit}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. Barcode Generator Section */}
                  <div className="space-y-2 pt-2 border-t text-xs">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-xs uppercase text-muted-foreground flex items-center gap-1.5">
                        <Barcode className="size-4 text-primary" /> Code-128 Barcode Label
                      </h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const svgContent = generateBarcodeSvg(viewingItem.sku, { width: 220, height: 70, showText: true });
                          const blob = new Blob([svgContent], { type: "image/svg+xml" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `barcode-${viewingItem.sku}.svg`;
                          a.click();
                          URL.revokeObjectURL(url);
                          toast.success(`Downloaded SVG Barcode for ${viewingItem.sku}`);
                        }}
                        className="h-7 text-xs font-semibold gap-1"
                      >
                        <Download className="size-3" /> Download Barcode
                      </Button>
                    </div>
                    <div className="p-3 bg-white text-black rounded-xl border flex flex-col items-center justify-center space-y-1 shadow-2xs">
                      <div className="text-[10px] font-black uppercase tracking-wider text-gray-700">
                        {sysConfig?.appName || "MASTER ERP"}
                      </div>
                      <div className="text-xs font-bold text-gray-900 truncate max-w-xs">
                        {viewingItem.name}
                      </div>
                      <div
                        className="py-1"
                        dangerouslySetInnerHTML={{
                          __html: generateBarcodeSvg(viewingItem.sku, { width: 180, height: 50, showText: true }),
                        }}
                      />
                      <div className="text-xs font-black text-gray-900 font-mono">
                        MRP: {formatSystemAmount(viewingItem.salePrice, sysConfig)}
                      </div>
                    </div>
                  </div>

                  {/* 5. Additional Specifications */}
                  <div className="space-y-2 pt-2 border-t text-xs">
                    <h4 className="font-bold text-xs uppercase text-muted-foreground">Product Details & Taxes</h4>
                    <div className="grid grid-cols-2 gap-2 bg-muted/20 p-3 rounded-lg text-[11px]">
                      <div><span>Assigned Unit:</span> <strong className="text-foreground ml-1">{viewingItem.unit}</strong></div>
                      <div><span>Tax:</span> <strong className="text-foreground ml-1">{viewingItem.taxName} ({viewingItem.taxRate}%)</strong></div>
                    </div>
                    {viewingItem.description && (
                      <p className="text-muted-foreground leading-relaxed pt-1">{viewingItem.description}</p>
                    )}
                  </div>

                  <DialogFooter className="flex justify-between sm:justify-between items-center w-full pt-3 border-t">
                    <Button size="sm" variant="outline" onClick={() => setViewingItem(null)}>
                      Close
                    </Button>
                    {viewingItem.type !== "Service" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setAddStockItem(viewingItem);
                          setAddStockQty(5);
                          setAddStockWarehouseId(warehouses[0]?.id || "wh-1");
                        }}
                        className="gap-1 text-xs font-bold"
                      >
                        <Plus className="size-3.5" /> Add Stock
                      </Button>
                    )}
                  </DialogFooter>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* ─── MODAL: MULTI-WAREHOUSE TRANSFER POPUP ─── */}
      <Dialog open={!!transferStockItem} onOpenChange={(open) => !open && setTransferStockItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ArrowRightLeft className="size-5 text-indigo-600" /> Multi-Warehouse Stock Transfer
            </DialogTitle>
            <DialogDescription className="text-xs">
              Transfer inventory for <strong>{transferStockItem?.name}</strong> between facilities.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">From Warehouse *</Label>
                <Select value={transferFromWh} onValueChange={setTransferFromWh}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id} className="text-xs">
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">To Warehouse *</Label>
                <Select value={transferToWh} onValueChange={setTransferToWh}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id} className="text-xs">
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Transfer Quantity ({transferStockItem?.unit || 'units'}) *</Label>
              <Input
                type="number"
                min="1"
                className="text-xs font-mono font-bold"
                value={transferQty}
                onChange={(e) => setTransferQty(parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 p-2.5 text-[11px] text-muted-foreground">
              ⚡ State Machine: Automatically creates an approval record, logs the movement in <strong>ProductWarehouse</strong>, and syncs live with <strong>StockTransfer</strong>.
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setTransferStockItem(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isTransferring}
              onClick={handleTransferStockSubmit}
              className="font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <ArrowRightLeft className="size-3.5" /> Confirm Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: ADD STOCK POPUP ─── */}
        <Dialog open={!!addStockItem} onOpenChange={(open) => !open && setAddStockItem(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <WarehouseIcon className="size-5 text-emerald-600" /> Add Stock Quantity
              </DialogTitle>
              <DialogDescription className="text-xs">
                Increment warehouse stock for <strong>{addStockItem?.name}</strong> (SKU: {addStockItem?.sku}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Select Warehouse Location *</Label>
                <Select value={addStockWarehouseId} onValueChange={setAddStockWarehouseId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id} className="text-xs">
                        {w.name} {w.location ? `(${w.location})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Quantity to Add *</Label>
                <Input
                  type="number"
                  min="1"
                  value={addStockQty}
                  onChange={(e) => setAddStockQty(parseInt(e.target.value) || 0)}
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <DialogFooter>
              <Button size="sm" variant="outline" onClick={() => setAddStockItem(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddStockSubmit} className="font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="size-3.5" /> Confirm & Add Stock
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── MODAL 4: CREATE CATEGORY ─── */}
        <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Tag className="size-4 text-primary" /> Create New Category
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Category Name *</Label>
                <Input
                  placeholder="e.g. Server Accessories"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Category Color *</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={categoryForm.color}
                    onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                    className="size-9 rounded cursor-pointer border p-0.5"
                  />
                  <Input
                    value={categoryForm.color}
                    onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                    className="h-9 text-xs font-mono w-28"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button size="sm" variant="outline" onClick={() => setIsCategoryModalOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSaveCategory} className="font-bold">Create Category</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── MODAL 5: CREATE TAX ─── */}
        <Dialog open={isTaxModalOpen} onOpenChange={setIsTaxModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Percent className="size-4 text-primary" /> Add Tax Rate
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Tax Name *</Label>
                <Input
                  placeholder="e.g. GST 28% (Luxury)"
                  value={taxForm.name}
                  onChange={(e) => setTaxForm({ ...taxForm, name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Rate Percentage (%) *</Label>
                <Input
                  type="number"
                  placeholder="18"
                  value={taxForm.rate}
                  onChange={(e) => setTaxForm({ ...taxForm, rate: parseFloat(e.target.value) || 0 })}
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>
            </div>
            <DialogFooter>
              <Button size="sm" variant="outline" onClick={() => setIsTaxModalOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSaveTax} className="font-bold">Save Tax</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── MODAL 6: CREATE UNIT ─── */}
        {/* Brand Modal */}
      <Dialog open={isBrandModalOpen} onOpenChange={setIsBrandModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Add New Brand</DialogTitle>
            <DialogDescription className="text-xs">Create a product brand. Defaults to /images/no-image.png if image is not provided.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Brand Name *</Label>
              <Input
                placeholder="e.g. Samsung, Apple, Lenovo"
                value={brandForm.name}
                onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Description</Label>
              <Input
                placeholder="e.g. Computing and hardware peripherals"
                value={brandForm.description}
                onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Brand Logo URL (optional)</Label>
              <Input
                placeholder="/images/no-image.png"
                value={brandForm.image}
                onChange={(e) => setBrandForm({ ...brandForm, image: e.target.value })}
                className="h-8 text-xs"
              />
              <div className="mt-2 flex items-center gap-3">
                <div className="size-12 rounded border p-1 bg-muted/20 flex items-center justify-center">
                  <img
                    src={brandForm.image || "/images/no-image.png"}
                    alt="Brand Preview"
                    className="size-full object-contain"
                    onError={(e) => { e.currentTarget.src = "/images/no-image.png"; }}
                  />
                </div>
                <span className="text-[11px] text-muted-foreground">Default: /images/no-image.png</span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button size="sm" variant="outline" onClick={() => setIsBrandModalOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              onClick={async () => {
                if (!brandForm.name.trim()) return;
                try {
                  await api.post("/products/brands", {
                    name: brandForm.name.trim(),
                    description: brandForm.description.trim(),
                    image: brandForm.image?.trim() || "/images/no-image.png",
                  });
                  toast.success(`Brand "${brandForm.name}" created!`);
                  setIsBrandModalOpen(false);
                  setBrandForm({ name: "", description: "", image: "/images/no-image.png" });
                  refetchBrands();
                } catch (err: any) {
                  toast.error(err.message || "Failed to create brand");
                }
              }}
            >
              Save Brand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Ruler className="size-4 text-primary" /> Add Measurement Unit
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Unit Name *</Label>
                <Input
                  placeholder="e.g. Liter (Ltr)"
                  value={unitForm.name}
                  onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <DialogFooter>
              <Button size="sm" variant="outline" onClick={() => setIsUnitModalOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSaveUnit} className="font-bold">Save Unit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── MODAL 7: CONTEXTUAL AI CONTENT GENERATOR ─── */}
        <AIContentGeneratorModal
          open={isAiModalOpen}
          onOpenChange={setIsAiModalOpen}
          title="Product Description AI Assistant"
          defaultTopic={formData.name}
          defaultCategory="product"
          onInsert={(generatedText) => {
            setFormData((prev) => ({
              ...prev,
              description: generatedText,
              shortDescription: prev.shortDescription || generatedText.split("\n")[0].slice(0, 120),
            }));
          }}
        />
      </div>
    </PlanGuard>
  );
}
export default ProductsAndServicesPage;
