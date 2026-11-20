import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Pencil,
  Star,
  Search,
  LayoutGrid,
  List as ListIcon,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  Sparkles,
  Store,
  DollarSign,
  Layers,
  CheckCircle2,
  X,
  Globe,
  Loader2,
  RefreshCw,
  Tag,
  Package,
  FolderPlus,
  Info,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ArrowUpDown,
  BookOpen,
  Eye,
  ShieldCheck,
  Share2,
  Cpu,
  ShoppingCart,
  FileText,
  Landmark,
  Users,
  Sliders,
  Navigation,
  Bot,
  Shield,
  Copy,
  Check,
  Zap,
  PhoneCall,
  MessageSquare,
  MessageCircle,
  Video,
  Mail,
  Webhook,
  Network,
  Calendar,
  CheckSquare,
  TrendingUp,
  ShoppingBag,
  Receipt,
  Boxes,
  Award,
  Compass,
  Folder,
  Scale,
  PiggyBank,
  Laptop,
  Clock,
  Fingerprint,
  Target,
  GraduationCap,
  TextSelect,
  FormInput,
  GitBranch,
  CreditCard,
  Code,
  LifeBuoy,
  History,
  StickyNote,
  Bell,
  HardDrive,
  Key,
  Lock,
} from "lucide-react";
import { formatSystemAmount, DEFAULT_CURRENCY_SETTINGS, SystemCurrencySettings } from "@/lib/currency";

export const Route = createFileRoute("/_authenticated/super/marketplace")({
  component: MarketplaceAdmin,
});

export type Addon = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  long_description: string | null;
  category: string;
  icon: string | null;
  image_url?: string | null;
  price_monthly: number;
  developer: string | null;
  status: string;
  featured: boolean;
  install_url: string | null;
  docs_url: string | null;
  version: string | null;
  features: string[];
  screenshots: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type CategoryDetail = {
  name: string;
  count: number;
  isDeletable: boolean;
};

const emptyAddon: Omit<Addon, "id"> = {
  slug: "",
  name: "",
  tagline: "",
  description: "",
  long_description: "",
  category: "HR",
  icon: "",
  price_monthly: 0,
  developer: "Master ERP Core Team",
  status: "available",
  featured: false,
  install_url: "",
  docs_url: "",
  version: "1.0.0",
  features: [],
  screenshots: [],
};

// Category icon & color mapping helper
function getCategoryMeta(categoryName: string) {
  const cat = (categoryName || "").toLowerCase();
  if (cat.includes("free")) {
    return {
      icon: Sparkles,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      accent: "text-emerald-600",
    };
  }
  if (cat.includes("social")) {
    return {
      icon: Share2,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      accent: "text-blue-600",
    };
  }
  if (cat.includes("integration")) {
    return {
      icon: Cpu,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20",
      accent: "text-indigo-600",
    };
  }
  if (cat.includes("commerce") || cat.includes("sale")) {
    return {
      icon: ShoppingCart,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      accent: "text-amber-600",
    };
  }
  if (cat.includes("content")) {
    return {
      icon: FileText,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/20",
      accent: "text-cyan-600",
    };
  }
  if (cat.includes("finance") || cat.includes("account")) {
    return {
      icon: Landmark,
      color: "text-teal-500",
      bg: "bg-teal-500/10",
      border: "border-teal-500/20",
      accent: "text-teal-600",
    };
  }
  if (cat.includes("hr")) {
    return {
      icon: Users,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
      border: "border-violet-500/20",
      accent: "text-violet-600",
    };
  }
  if (cat.includes("communication") || cat.includes("custom")) {
    return {
      icon: Sliders,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
      accent: "text-purple-600",
    };
  }
  if (cat.includes("mobility") || cat.includes("operation")) {
    return {
      icon: Navigation,
      color: "text-sky-500",
      bg: "bg-sky-500/10",
      border: "border-sky-500/20",
      accent: "text-sky-600",
    };
  }
  if (cat.includes("ai")) {
    return {
      icon: Bot,
      color: "text-fuchsia-500",
      bg: "bg-fuchsia-500/10",
      border: "border-fuchsia-500/20",
      accent: "text-fuchsia-600",
    };
  }
  if (cat.includes("security")) {
    return {
      icon: Shield,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
      border: "border-rose-500/20",
      accent: "text-rose-600",
    };
  }
  return {
    icon: Package,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    accent: "text-primary",
  };
}

// Icon name to Lucide Icon component mapping
const ICON_COMPONENT_MAP: Record<string, any> = {
  Sparkles,
  Share2,
  Cpu,
  ShoppingCart,
  FileText,
  Landmark,
  Users,
  Sliders,
  Navigation,
  Bot,
  Shield,
  Fingerprint,
  Scale,
  Award,
  Zap,
  PhoneCall,
  MessageSquare,
  MessageCircle,
  Video,
  Mail,
  Webhook,
  Network,
  Calendar,
  CheckSquare,
  TrendingUp,
  ShoppingBag,
  Store,
  Receipt,
  Boxes,
  Compass,
  Folder,
  PiggyBank,
  Laptop,
  Clock,
  BookOpen,
  ShieldCheck,
  Target,
  GraduationCap,
  TextSelect,
  FormInput,
  GitBranch,
  CreditCard,
  Code,
  LifeBuoy,
  History,
  StickyNote,
  Bell,
  HardDrive,
  Key,
  Lock,
  Package,
};

function AddonIconRenderer({ icon, name, category, className = "size-6" }: { icon: string | null; name: string; category: string; className?: string }) {
  if (icon && (icon.startsWith("http://") || icon.startsWith("https://") || icon.startsWith("/") || icon.startsWith("data:"))) {
    return <img src={icon} alt={name} className="size-full object-contain rounded" loading="lazy" />;
  }

  const meta = getCategoryMeta(category);
  const IconComponent = icon && ICON_COMPONENT_MAP[icon] ? ICON_COMPONENT_MAP[icon] : meta.icon;

  return <IconComponent className={`${className} ${meta.color}`} />;
}

function MarketplaceAdmin() {
  const qc = useQueryClient();

  // Search, Filters & View Mode
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<string>("featured");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Addon Editor State
  const [editing, setEditing] = useState<Partial<Addon> | null>(null);
  const [addonModalOpen, setAddonModalOpen] = useState(false);
  const [featuresText, setFeaturesText] = useState("");
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [isUploadingScreenshots, setIsUploadingScreenshots] = useState(false);
  const iconFileInputRef = useRef<HTMLInputElement>(null);
  const screenshotFileInputRef = useRef<HTMLInputElement>(null);

  // Addon Deletion Confirmation State
  const [addonToDelete, setAddonToDelete] = useState<Addon | null>(null);
  const [deleteAddonModalOpen, setDeleteAddonModalOpen] = useState(false);

  // Category Management State
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState<"create" | "edit">("create");
  const [targetCategoryOldName, setTargetCategoryOldName] = useState("");
  const [categoryInputName, setCategoryInputName] = useState("");
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryDetail | null>(null);
  const [deleteCategoryModalOpen, setDeleteCategoryModalOpen] = useState(false);

  // 1. Fetch System Settings for authoritative currency
  const { data: systemPlatformSettings } = useQuery({
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

  const activeCurrencyConfig = useMemo<Partial<SystemCurrencySettings>>(() => {
    return {
      defaultCurrency: systemPlatformSettings?.defaultCurrency || "INR",
      currencySymbol: systemPlatformSettings?.currencySymbol || "₹",
      showDecimals: false,
    };
  }, [systemPlatformSettings]);

  // 2. Fetch All Addons from authoritative endpoint
  const {
    data: addons = [],
    isLoading: isLoadingAddons,
    refetch: refetchAddons,
    isError: isErrorAddons,
    error: addonsError,
  } = useQuery({
    queryKey: ["admin-addons"],
    queryFn: async () => {
      const res = await api.get<Addon[]>("/super/addons");
      return Array.isArray(res) ? res : [];
    },
  });

  // 3. Fetch Category Details (with addon counts & deletable flags)
  const {
    data: categoryDetails = [],
    isLoading: isLoadingCategories,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ["admin-addon-categories-details"],
    queryFn: async () => {
      const res = await api.get<CategoryDetail[]>("/super/addons/categories?details=true");
      return Array.isArray(res) ? res : [];
    },
  });

  // Unique list of category names
  const categoryNames = useMemo(() => {
    return ["All", ...categoryDetails.map((c) => c.name).sort()];
  }, [categoryDetails]);

  // Computed summary metrics
  const metrics = useMemo(() => {
    const total = addons.length;
    const categoriesCount = categoryDetails.length;
    const published = addons.filter((a) => a.status === "available" || a.status === "active").length;
    const freeCount = addons.filter((a) => Number(a.price_monthly ?? 0) === 0).length;
    const featuredCount = addons.filter((a) => Boolean(a.featured)).length;
    return { total, categoriesCount, published, freeCount, featuredCount };
  }, [addons, categoryDetails]);

  // Filtered and sorted addons list
  const filteredAddons = useMemo(() => {
    let result = addons.filter((a) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        a.name.toLowerCase().includes(query) ||
        a.slug.toLowerCase().includes(query) ||
        (a.tagline ?? "").toLowerCase().includes(query) ||
        (a.description ?? "").toLowerCase().includes(query) ||
        (a.category ?? "").toLowerCase().includes(query) ||
        (a.developer ?? "").toLowerCase().includes(query) ||
        (Array.isArray(a.features) && a.features.some((f) => f.toLowerCase().includes(query)));

      const matchesCat =
        categoryFilter === "All" || a.category.toLowerCase() === categoryFilter.toLowerCase();

      let matchesStatus = true;
      if (statusFilter === "featured") matchesStatus = Boolean(a.featured);
      else if (statusFilter === "free") matchesStatus = Number(a.price_monthly ?? 0) === 0;
      else if (statusFilter === "paid") matchesStatus = Number(a.price_monthly ?? 0) > 0;
      else if (statusFilter !== "all") matchesStatus = a.status === statusFilter;

      return matchesSearch && matchesCat && matchesStatus;
    });

    // Sorting
    result = [...result].sort((a, b) => {
      if (sortBy === "featured") {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      if (sortBy === "name_desc") return b.name.localeCompare(a.name);
      if (sortBy === "price_asc") return Number(a.price_monthly) - Number(b.price_monthly);
      if (sortBy === "price_desc") return Number(b.price_monthly) - Number(a.price_monthly);
      if (sortBy === "newest") {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      }
      return 0;
    });

    return result;
  }, [addons, searchQuery, categoryFilter, statusFilter, sortBy]);

  // Copy slug helper
  const handleCopySlug = (slug: string) => {
    navigator.clipboard.writeText(slug);
    setCopiedSlug(slug);
    toast.success(`Copied slug: /${slug}`);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  // ==========================================
  // SYNC CANONICAL 133 ADDONS MUTATION
  // ==========================================
  const syncCanonicalMutation = useMutation({
    mutationFn: async () => {
      return await api.post<{ message: string; createdCount: number; updatedCount: number; total: number }>("/super/addons/sync-canonical", {});
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Successfully synchronized 133 canonical add-ons catalog!");
      qc.invalidateQueries({ queryKey: ["admin-addons"] });
      qc.invalidateQueries({ queryKey: ["admin-addon-categories-details"] });
      qc.invalidateQueries({ queryKey: ["admin-addon-categories"] });
      qc.invalidateQueries({ queryKey: ["public-addons"] });
      qc.invalidateQueries({ queryKey: ["public-addon-categories"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to synchronize canonical add-ons");
    },
  });

  // ==========================================
  // ADDON MUTATIONS
  // ==========================================
  const upsertAddon = useMutation({
    mutationFn: async (a: Partial<Addon> & { id?: string }) => {
      const payload = {
        name: a.name,
        slug: a.slug,
        tagline: a.tagline || null,
        description: a.description || null,
        longDescription: a.long_description || (a as any).longDescription || null,
        category: a.category,
        priceMonthly: a.price_monthly ?? (a as any).priceMonthly ?? 0,
        icon: a.icon || null,
        screenshots: a.screenshots || [],
        features: a.features || [],
        developer: a.developer || null,
        version: a.version || "1.0.0",
        docsUrl: a.docs_url || (a as any).docsUrl || null,
        installUrl: a.install_url || (a as any).installUrl || null,
        featured: Boolean(a.featured),
        status: a.status || "available",
      };

      if (a.id && !a.id.startsWith("addon-")) {
        return await api.put(`/super/addons/${a.id}`, payload);
      } else {
        return await api.post("/super/addons", payload);
      }
    },
    onSuccess: () => {
      toast.success("Addon saved successfully");
      qc.invalidateQueries({ queryKey: ["admin-addons"] });
      qc.invalidateQueries({ queryKey: ["admin-addon-categories-details"] });
      qc.invalidateQueries({ queryKey: ["admin-addon-categories"] });
      qc.invalidateQueries({ queryKey: ["public-addons"] });
      qc.invalidateQueries({ queryKey: ["public-addon-categories"] });
      setAddonModalOpen(false);
    },
    onError: (e: any) => {
      toast.error(e?.message || "Failed to save addon");
    },
  });

  const deleteAddon = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/super/addons/${id}`);
    },
    onSuccess: (res: any) => {
      if (res?.archived) {
        toast.info(res.message || "Addon referenced by entitlements. Archived instead of hard-deleted.");
      } else {
        toast.success(res?.message || "Addon deleted successfully");
      }
      qc.invalidateQueries({ queryKey: ["admin-addons"] });
      qc.invalidateQueries({ queryKey: ["admin-addon-categories-details"] });
      qc.invalidateQueries({ queryKey: ["admin-addon-categories"] });
      qc.invalidateQueries({ queryKey: ["public-addons"] });
      qc.invalidateQueries({ queryKey: ["public-addon-categories"] });
      setDeleteAddonModalOpen(false);
      setAddonToDelete(null);
    },
    onError: (e: any) => {
      toast.error(e?.message || "Failed to delete addon");
    },
  });

  // ==========================================
  // CATEGORY MUTATIONS
  // ==========================================
  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      return await api.post("/super/addons/categories", { name });
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || "Category created successfully");
      qc.invalidateQueries({ queryKey: ["admin-addon-categories-details"] });
      qc.invalidateQueries({ queryKey: ["admin-addon-categories"] });
      qc.invalidateQueries({ queryKey: ["public-addon-categories"] });
      setCategoryModalOpen(false);
      setCategoryInputName("");
    },
    onError: (e: any) => {
      toast.error(e?.message || "Failed to create category");
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) => {
      return await api.put(`/super/addons/categories/${encodeURIComponent(oldName)}`, { newName });
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || "Category updated successfully");
      qc.invalidateQueries({ queryKey: ["admin-addon-categories-details"] });
      qc.invalidateQueries({ queryKey: ["admin-addon-categories"] });
      qc.invalidateQueries({ queryKey: ["admin-addons"] });
      qc.invalidateQueries({ queryKey: ["public-addons"] });
      qc.invalidateQueries({ queryKey: ["public-addon-categories"] });
      setCategoryModalOpen(false);
      setCategoryInputName("");
    },
    onError: (e: any) => {
      toast.error(e?.message || "Failed to update category");
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      return await api.delete(`/super/addons/categories/${encodeURIComponent(name)}`);
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || "Category deleted successfully");
      qc.invalidateQueries({ queryKey: ["admin-addon-categories-details"] });
      qc.invalidateQueries({ queryKey: ["admin-addon-categories"] });
      qc.invalidateQueries({ queryKey: ["public-addon-categories"] });
      setDeleteCategoryModalOpen(false);
      setCategoryToDelete(null);
      if (categoryFilter === categoryToDelete?.name) {
        setCategoryFilter("All");
      }
    },
    onError: (e: any) => {
      toast.error(e?.message || "Failed to delete category");
    },
  });

  // Modal openers
  function openNewAddon() {
    setEditing({ ...emptyAddon });
    setFeaturesText("");
    setScreenshots([]);
    setAddonModalOpen(true);
  }

  function openEditAddon(a: Addon) {
    setEditing(a);
    setFeaturesText((a.features ?? []).join("\n"));
    setScreenshots(a.screenshots ?? []);
    setAddonModalOpen(true);
  }

  function confirmDeleteAddon(a: Addon) {
    setAddonToDelete(a);
    setDeleteAddonModalOpen(true);
  }

  function openNewCategory() {
    setCategoryModalMode("create");
    setTargetCategoryOldName("");
    setCategoryInputName("");
    setCategoryModalOpen(true);
  }

  function openEditCategory(cat: CategoryDetail) {
    setCategoryModalMode("edit");
    setTargetCategoryOldName(cat.name);
    setCategoryInputName(cat.name);
    setCategoryModalOpen(true);
  }

  function confirmDeleteCategory(cat: CategoryDetail) {
    setCategoryToDelete(cat);
    setDeleteCategoryModalOpen(true);
  }

  function handleSaveCategory() {
    if (!categoryInputName.trim()) {
      return toast.error("Category name is required");
    }
    if (categoryModalMode === "create") {
      createCategoryMutation.mutate(categoryInputName.trim());
    } else {
      updateCategoryMutation.mutate({
        oldName: targetCategoryOldName,
        newName: categoryInputName.trim(),
      });
    }
  }

  function saveAddon() {
    if (!editing) return;
    if (!editing.name || !editing.slug) {
      return toast.error("Name and URL slug are required fields");
    }
    const features = featuresText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    upsertAddon.mutate({ ...editing, features, screenshots } as never);
  }

  // Handle PNG Icon upload to /v1/media/upload
  async function handleIconFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editing) return;

    if (!file.type.startsWith("image/")) {
      return toast.error("Please upload an image file (PNG, JPG, SVG, WebP)");
    }

    try {
      setIsUploadingIcon(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "addons/icons");
      const res = await api.upload<{ url: string }>("/v1/media/upload", fd);
      if (res?.url) {
        setEditing((prev) => (prev ? { ...prev, icon: res.url } : null));
        toast.success("PNG Icon uploaded successfully! Save changes to apply.");
      } else {
        toast.error("Upload failed: No URL returned from media server");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload icon");
    } finally {
      setIsUploadingIcon(false);
      if (iconFileInputRef.current) iconFileInputRef.current.value = "";
    }
  }

  // Handle PNG Screenshots multi-upload
  async function handleScreenshotFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    try {
      setIsUploadingScreenshots(true);
      const uploadedUrls: string[] = [];
      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", "addons/screenshots");
        const res = await api.upload<{ url: string }>("/v1/media/upload", fd);
        if (res?.url) {
          uploadedUrls.push(res.url);
        }
      }
      if (uploadedUrls.length > 0) {
        setScreenshots((prev) => [...prev, ...uploadedUrls]);
        toast.success(`Uploaded ${uploadedUrls.length} screenshot image(s)!`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload screenshots");
    } finally {
      setIsUploadingScreenshots(false);
      if (screenshotFileInputRef.current) screenshotFileInputRef.current.value = "";
    }
  }

  return (
    <div className="w-full min-w-0 space-y-6 pb-16">
      {/* 1. TOP BREADCRUMB */}
      <BreadcrumbNav className="mb-2" />

      {/* 2. EXECUTIVE HERO HEADER */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-secondary/30 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Enterprise Catalog
              </div>
              <Badge variant="secondary" className="font-mono text-xs font-bold gap-1">
                <Package className="size-3 text-primary" />
                {metrics.total} Canonical Modules
              </Badge>
              <Badge variant="outline" className="font-mono text-xs">
                {metrics.categoriesCount} Taxonomy Domains
              </Badge>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
              Marketplace & Modules Catalog
            </h1>

            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              Super Admin control center for all 133 canonical ecosystem extensions across Free Addons, Social Media, Integrations, E-Commerce, Content, Finance, HR, Operations, AI, and Security domains.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Sync Canonical 133 Addons Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncCanonicalMutation.mutate()}
              disabled={syncCanonicalMutation.isPending}
              className="gap-2 text-xs h-9 border-primary/20 hover:border-primary/40 hover:bg-primary/5 font-semibold"
              title="Ensure all 133 canonical addons from documentation matrix are synchronized"
            >
              {syncCanonicalMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin text-primary" />
              ) : (
                <Sparkles className="size-3.5 text-primary" />
              )}
              Sync 133 Canonical Catalog
            </Button>

            {/* Public Store Link */}
            <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs h-9">
              <Link to="/addons" target="_blank">
                <Globe className="size-3.5 text-primary" /> Public Store
                <ExternalLink className="size-3 text-muted-foreground ml-0.5" />
              </Link>
            </Button>

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchAddons();
                refetchCategories();
              }}
              className="gap-1.5 text-xs h-9"
              title="Refresh database records"
            >
              <RefreshCw className="size-3.5" /> Refresh
            </Button>

            {/* Create Addon */}
            <Button size="sm" onClick={openNewAddon} className="gap-1.5 text-xs h-9 font-semibold shadow-xs">
              <Plus className="size-4" /> New Addon
            </Button>
          </div>
        </div>
      </div>

      {/* 3. METRIC KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="p-4 border shadow-xs bg-card/60 relative overflow-hidden group hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Catalog</span>
            <div className="size-8 rounded-lg bg-primary/10 grid place-items-center text-primary">
              <Package className="size-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-extrabold mt-2 text-foreground">{metrics.total}</div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <span className="text-emerald-600 font-bold">{metrics.published} live</span> • {metrics.freeCount} free tiers
          </p>
        </Card>

        <Card className="p-4 border shadow-xs bg-card/60 relative overflow-hidden group hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Taxonomy Domains</span>
            <div className="size-8 rounded-lg bg-indigo-500/10 grid place-items-center text-indigo-600">
              <Layers className="size-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-extrabold mt-2 text-foreground">{metrics.categoriesCount}</div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Domain categories
          </p>
        </Card>

        <Card className="p-4 border shadow-xs bg-card/60 relative overflow-hidden group hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Active & Published</span>
            <div className="size-8 rounded-lg bg-emerald-500/10 grid place-items-center text-emerald-600">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-extrabold mt-2 text-emerald-600">{metrics.published}</div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Available on public marketplace
          </p>
        </Card>

        <Card className="p-4 border shadow-xs bg-card/60 relative overflow-hidden group hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Spotlight Featured</span>
            <div className="size-8 rounded-lg bg-amber-500/10 grid place-items-center text-amber-500">
              <Star className="size-4 fill-amber-500" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-extrabold mt-2 text-amber-600">{metrics.featuredCount}</div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Highlighted with spotlight badges
          </p>
        </Card>
      </div>

      {/* 4. MODERN CATEGORY FILTER RIBBON */}
      <Card className="border shadow-xs overflow-hidden">
        <div className="p-3.5 px-4 border-b bg-secondary/15 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary" />
            <span className="text-xs font-bold text-foreground">Taxonomy Domains & Categories</span>
            <Badge variant="outline" className="text-[10px] font-mono">
              {categoryDetails.length} Domains
            </Badge>
          </div>

          <Button size="sm" variant="ghost" onClick={openNewCategory} className="gap-1.5 h-7 text-xs font-semibold">
            <FolderPlus className="size-3.5 text-primary" /> New Domain
          </Button>
        </div>

        <div className="p-3">
          {isLoadingCategories ? (
            <div className="py-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" /> Loading categories...
            </div>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {/* "All" Filter Tab */}
              <button
                type="button"
                onClick={() => setCategoryFilter("All")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 border ${
                  categoryFilter === "All"
                    ? "bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/20"
                    : "bg-background hover:bg-secondary/60 text-foreground border-border"
                }`}
              >
                <Tag className="size-3.5" />
                <span>All Modules</span>
                <Badge
                  variant={categoryFilter === "All" ? "secondary" : "outline"}
                  className="text-[10px] px-1.5 py-0 font-mono"
                >
                  {metrics.total}
                </Badge>
              </button>

              {/* Dynamic Category Tabs */}
              {categoryDetails.map((cat) => {
                const isSelected = categoryFilter.toLowerCase() === cat.name.toLowerCase();
                const meta = getCategoryMeta(cat.name);
                const CatIcon = meta.icon;

                return (
                  <div key={cat.name} className="relative group shrink-0 flex items-center">
                    <button
                      type="button"
                      onClick={() => setCategoryFilter(cat.name)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/20"
                          : "bg-background hover:bg-secondary/60 text-foreground border-border"
                      }`}
                    >
                      <CatIcon className={`size-3.5 ${isSelected ? "text-primary-foreground" : meta.color}`} />
                      <span className="truncate max-w-[140px]">{cat.name}</span>
                      <Badge
                        variant={isSelected ? "secondary" : "outline"}
                        className="text-[10px] px-1.5 py-0 font-mono"
                      >
                        {cat.count}
                      </Badge>
                    </button>

                    {/* Quick Edit/Delete Category Controls on Hover */}
                    <div className="hidden group-hover:flex items-center gap-0.5 ml-1 bg-background/80 backdrop-blur-xs p-0.5 rounded-lg border shadow-xs">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditCategory(cat);
                        }}
                        className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                        title={`Rename ${cat.name}`}
                      >
                        <Pencil className="size-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDeleteCategory(cat);
                        }}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        title={`Delete ${cat.name}`}
                      >
                        <Trash2 className="size-2.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* 5. SEARCH & CONTROLS TOOLBAR */}
      <Card className="p-4 shadow-xs border space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search 133 addons by name, slug, tagline, features, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-9 text-xs rounded-xl"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns & View Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Dropdown */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 w-[160px] text-xs rounded-xl">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categoryNames.map((cat) => (
                  <SelectItem key={cat} value={cat} className="text-xs">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[140px] text-xs rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                <SelectItem value="active" className="text-xs">Active (Verified)</SelectItem>
                <SelectItem value="available" className="text-xs">Available</SelectItem>
                <SelectItem value="featured" className="text-xs">Featured Only</SelectItem>
                <SelectItem value="beta" className="text-xs">Beta Testing</SelectItem>
                <SelectItem value="coming_soon" className="text-xs">Coming Soon</SelectItem>
                <SelectItem value="free" className="text-xs">Free ($0)</SelectItem>
                <SelectItem value="paid" className="text-xs">Paid Tiers</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Dropdown */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-9 w-[140px] text-xs rounded-xl">
                <ArrowUpDown className="size-3 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured" className="text-xs">Featured First</SelectItem>
                <SelectItem value="newest" className="text-xs">Newest First</SelectItem>
                <SelectItem value="name_asc" className="text-xs">Name: A to Z</SelectItem>
                <SelectItem value="name_desc" className="text-xs">Name: Z to A</SelectItem>
                <SelectItem value="price_asc" className="text-xs">Price: Low to High</SelectItem>
                <SelectItem value="price_desc" className="text-xs">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>

            {/* View Switcher Toggle */}
            <div className="flex items-center border p-0.5 rounded-xl bg-secondary/30">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs transition-all ${
                  viewMode === "grid"
                    ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                    : "hover:bg-secondary text-muted-foreground"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg text-xs transition-all ${
                  viewMode === "table"
                    ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                    : "hover:bg-secondary text-muted-foreground"
                }`}
                title="Table/List View"
              >
                <ListIcon className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Results Count & Active Filter Pills */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
          <span>
            Showing <strong className="text-foreground">{filteredAddons.length}</strong> of {addons.length} extensions
          </span>

          <div className="flex items-center gap-1.5">
            {categoryFilter !== "All" && (
              <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive" onClick={() => setCategoryFilter("All")}>
                Category: {categoryFilter}
                <X className="size-3" />
              </Badge>
            )}
            {statusFilter !== "all" && (
              <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive" onClick={() => setStatusFilter("all")}>
                Status: {statusFilter}
                <X className="size-3" />
              </Badge>
            )}
            {searchQuery && (
              <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive" onClick={() => setSearchQuery("")}>
                Search: "{searchQuery}"
                <X className="size-3" />
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* 6. MAIN CONTENT VIEW: GRID VS TABLE */}
      {isLoadingAddons ? (
        <div className="py-24 grid place-items-center">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-mono mt-2">Loading marketplace extensions...</p>
        </div>
      ) : isErrorAddons ? (
        <Card className="p-12 text-center text-muted-foreground space-y-3">
          <AlertTriangle className="size-10 mx-auto text-destructive" />
          <p className="text-sm font-semibold text-foreground">Failed to load marketplace catalog</p>
          <p className="text-xs max-w-md mx-auto">{(addonsError as any)?.message || "A network or authentication error occurred."}</p>
          <Button variant="outline" size="sm" onClick={() => refetchAddons()} className="mt-2">
            Retry Loading
          </Button>
        </Card>
      ) : filteredAddons.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground space-y-3 border-dashed">
          <Package className="size-10 mx-auto opacity-40 text-primary" />
          <p className="text-sm font-medium text-foreground">No addons match your current filters.</p>
          <p className="text-xs">Try clearing the search query or reset category filter.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setCategoryFilter("All");
              setStatusFilter("all");
            }}
          >
            Reset Filters
          </Button>
        </Card>
      ) : viewMode === "grid" ? (
        /* REDESIGNED GRID VIEW */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAddons.map((a) => {
            const formattedPrice = a.price_monthly === 0
              ? "Free"
              : `${formatSystemAmount(Number(a.price_monthly), activeCurrencyConfig)} / mo`;
            const meta = getCategoryMeta(a.category);

            return (
              <Card
                key={a.id}
                className="group hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between border bg-card rounded-2xl overflow-hidden"
              >
                <CardContent className="p-5 space-y-4">
                  {/* Top Row: Icon, Category Pill, Status Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className={`size-13 shrink-0 rounded-2xl border ${meta.border} ${meta.bg} grid place-items-center p-2 shadow-2xs group-hover:scale-105 transition-transform`}>
                      <AddonIconRenderer icon={a.icon} name={a.name} category={a.category} className="size-6" />
                    </div>

                    <div className="flex flex-wrap gap-1 justify-end items-center">
                      {a.featured && (
                        <Badge className="bg-amber-500 text-white text-[10px] gap-1 shadow-2xs font-semibold">
                          <Star className="size-2.5 fill-white" /> Featured
                        </Badge>
                      )}
                      <Badge
                        variant={a.status === "available" || a.status === "active" ? "secondary" : "outline"}
                        className="text-[10px] capitalize font-medium"
                      >
                        {a.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        v{a.version ?? "1.0.0"}
                      </Badge>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-base line-clamp-1 group-hover:text-primary transition-colors" title={a.name}>
                        {a.name}
                      </h3>
                      <span className={`font-bold text-xs font-mono shrink-0 ${Number(a.price_monthly) === 0 ? "text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full" : "text-foreground"}`}>
                        {formattedPrice}
                      </span>
                    </div>

                    {/* Category & Slug Row */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${meta.border} ${meta.bg} ${meta.accent}`}>
                        {a.category}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleCopySlug(a.slug)}
                        className="text-[11px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-1 group/btn px-1.5 py-0.5 rounded hover:bg-secondary/60 transition-colors"
                        title="Click to copy slug"
                      >
                        <span>/{a.slug}</span>
                        {copiedSlug === a.slug ? (
                          <Check className="size-3 text-emerald-600" />
                        ) : (
                          <Copy className="size-3 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                        )}
                      </button>
                    </div>

                    {/* Tagline / Description */}
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-[32px]">
                      {a.tagline || a.description || "Enterprise modular add-on capability."}
                    </p>

                    {/* Feature tags */}
                    {Array.isArray(a.features) && a.features.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {a.features.slice(0, 2).map((feat, idx) => (
                          <span key={idx} className="text-[10px] text-muted-foreground bg-secondary/40 border border-border/40 px-2 py-0.5 rounded-md truncate max-w-[150px]">
                            ✓ {feat}
                          </span>
                        ))}
                        {a.features.length > 2 && (
                          <span className="text-[10px] text-muted-foreground px-1 py-0.5 font-mono">
                            +{a.features.length - 2} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="pt-3 border-t flex items-center justify-between gap-2 text-xs">
                    <div className="text-[11px] text-muted-foreground truncate max-w-[110px]" title={a.developer || "Master ERP"}>
                      {a.developer || "Master ERP"}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                        title="View Public Store Page"
                      >
                        <Link to="/addons/$slug" params={{ slug: a.slug }} target="_blank">
                          <Eye className="size-3.5 mr-1" /> Store
                        </Link>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditAddon(a)}
                        className="h-8 px-2.5 text-xs font-semibold rounded-xl"
                      >
                        <Pencil className="size-3.5 mr-1" /> Edit
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmDeleteAddon(a)}
                        className="h-8 px-2 text-destructive hover:bg-destructive/10 rounded-xl"
                        title="Delete or Archive Addon"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* REDESIGNED TABLE/LIST VIEW */
        <Card className="border shadow-xs overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 border-b text-muted-foreground uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3 pl-4">Extension</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Version</th>
                  <th className="p-3">Monthly Price</th>
                  <th className="p-3 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredAddons.map((a) => {
                  const formattedPrice = a.price_monthly === 0
                    ? "Free"
                    : `${formatSystemAmount(Number(a.price_monthly), activeCurrencyConfig)} / mo`;
                  const meta = getCategoryMeta(a.category);

                  return (
                    <tr key={a.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="p-3 pl-4">
                        <div className="flex items-center gap-3">
                          <div className={`size-9 shrink-0 rounded-xl border ${meta.border} ${meta.bg} grid place-items-center p-1 shadow-2xs`}>
                            <AddonIconRenderer icon={a.icon} name={a.name} category={a.category} className="size-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-xs flex items-center gap-1.5">
                              {a.name}
                              {a.featured && <Star className="size-3 text-amber-500 fill-amber-500" />}
                            </div>
                            <span className="font-mono text-[11px] text-muted-foreground">/{a.slug}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${meta.border} ${meta.bg} ${meta.accent}`}>
                          {a.category}
                        </span>
                      </td>

                      <td className="p-3">
                        <Badge
                          variant={a.status === "available" || a.status === "active" ? "secondary" : "outline"}
                          className="text-[10px] capitalize font-medium"
                        >
                          {a.status}
                        </Badge>
                      </td>

                      <td className="p-3 font-mono text-[11px]">v{a.version ?? "1.0.0"}</td>

                      <td className="p-3 font-mono font-bold text-emerald-600">{formattedPrice}</td>

                      <td className="p-3 text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs">
                            <Link to="/addons/$slug" params={{ slug: a.slug }} target="_blank">
                              <Eye className="size-3 mr-1" /> View
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openEditAddon(a)} className="h-7 px-2 text-xs font-semibold rounded-lg">
                            <Pencil className="size-3 mr-1" /> Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => confirmDeleteAddon(a)} className="h-7 px-1.5 text-destructive hover:bg-destructive/10 rounded-lg">
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ========================================== */}
      {/* 7. ADDON CREATE / EDIT MODAL DIALOG */}
      {/* ========================================== */}
      {editing && (
        <Dialog open={addonModalOpen} onOpenChange={setAddonModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Store className="size-5 text-primary" />
                {"id" in editing && editing.id ? `Edit Addon — ${editing.name}` : "Create New Addon"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Configure extension metadata, real PNG icon, media gallery, pricing, and availability.
              </DialogDescription>
            </DialogHeader>

            <div className="grid md:grid-cols-2 gap-4 py-2">
              <Field label="Addon Name *">
                <Input
                  value={editing.name ?? ""}
                  onChange={(e) => {
                    const name = e.target.value;
                    const autoSlug = name
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, "");
                    setEditing({ ...editing, name, slug: editing.slug || autoSlug });
                  }}
                  placeholder="e.g. WhatsApp Instant Alerts"
                />
              </Field>

              <Field label="URL Slug *">
                <Input
                  value={editing.slug ?? ""}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  placeholder="e.g. whatsapp-alerts"
                  className="font-mono text-xs"
                />
              </Field>

              <Field label="Category *">
                <Select
                  value={editing.category || "HR"}
                  onValueChange={(val) => setEditing({ ...editing, category: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryNames.filter((c) => c !== "All").map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label={`Monthly Price (${activeCurrencyConfig.currencySymbol || "₹"})`}>
                <Input
                  type="number"
                  step="1"
                  value={editing.price_monthly ?? 0}
                  onChange={(e) => setEditing({ ...editing, price_monthly: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </Field>

              {/* PNG ICON UPLOAD & DIRECT URL FIELD */}
              <div className="md:col-span-2 p-4 rounded-xl border bg-secondary/10 space-y-3">
                <Label className="text-xs font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="size-4 text-primary" /> PNG Icon Image (Upload file or URL)
                  </span>
                  {editing.icon && <span className="text-[10px] text-emerald-600 font-semibold">Icon Configured</span>}
                </Label>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="size-16 shrink-0 rounded-xl border bg-background grid place-items-center overflow-hidden p-1 shadow-2xs">
                    <AddonIconRenderer icon={editing.icon ?? null} name={editing.name || "Addon"} category={editing.category || "HR"} className="size-8" />
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={editing.icon ?? ""}
                        onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                        placeholder="Paste image URL or Lucide icon name (Sparkles, Bot, Users...)"
                        className="text-xs font-mono h-9"
                      />
                      <input
                        type="file"
                        ref={iconFileInputRef}
                        accept="image/png, image/jpeg, image/svg+xml, image/webp"
                        onChange={handleIconFileSelect}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isUploadingIcon}
                        onClick={() => iconFileInputRef.current?.click()}
                        className="gap-1.5 shrink-0 h-9 text-xs font-semibold"
                      >
                        {isUploadingIcon ? <Loader2 className="size-3.5 animate-spin text-primary" /> : <Upload className="size-3.5 text-primary" />}
                        {isUploadingIcon ? "Uploading..." : "Upload PNG"}
                      </Button>
                      {editing.icon && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditing({ ...editing, icon: null })}
                          className="h-9 px-2 text-destructive hover:bg-destructive/10"
                          title="Remove icon"
                        >
                          <X className="size-3.5" />
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Upload a local PNG file via real Media File API, paste an image URL, or enter a canonical Lucide icon identifier.
                    </p>
                  </div>
                </div>
              </div>

              <Field label="Developer / Team">
                <Input
                  value={editing.developer ?? ""}
                  onChange={(e) => setEditing({ ...editing, developer: e.target.value })}
                  placeholder="Master ERP Core Team"
                />
              </Field>

              <Field label="Version Number">
                <Input
                  value={editing.version ?? ""}
                  onChange={(e) => setEditing({ ...editing, version: e.target.value })}
                  placeholder="1.0.0"
                />
              </Field>

              <Field label="Availability Status">
                <Select value={editing.status || "available"} onValueChange={(val) => setEditing({ ...editing, status: val })}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (Verified)</SelectItem>
                    <SelectItem value="available">Available (Public)</SelectItem>
                    <SelectItem value="beta">Beta Testing</SelectItem>
                    <SelectItem value="coming_soon">Coming Soon</SelectItem>
                    <SelectItem value="draft">Draft (Hidden)</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Install Route / Action URL">
                <Input
                  value={editing.install_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, install_url: e.target.value })}
                  placeholder="/addons/..."
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Tagline (Pitch)">
                  <Input
                    value={editing.tagline ?? ""}
                    onChange={(e) => setEditing({ ...editing, tagline: e.target.value })}
                    placeholder="Short 1-sentence enterprise value proposition"
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Short Description">
                  <Textarea
                    rows={2}
                    value={editing.description ?? ""}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    className="text-xs"
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Long Description (Markdown enabled)">
                  <Textarea
                    rows={4}
                    value={editing.long_description ?? ""}
                    onChange={(e) => setEditing({ ...editing, long_description: e.target.value })}
                    className="text-xs leading-relaxed"
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Features Included (One line per feature)">
                  <Textarea
                    rows={3}
                    value={featuresText}
                    onChange={(e) => setFeaturesText(e.target.value)}
                    placeholder={"Real-time sync\nAutomated notifications\nCustom templates"}
                    className="text-xs font-mono"
                  />
                </Field>
              </div>

              {/* PNG SCREENSHOTS GALLERY UPLOAD & MANAGER */}
              <div className="md:col-span-2 p-4 rounded-xl border bg-secondary/10 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <ImageIcon className="size-4 text-primary" /> PNG Screenshots Gallery ({screenshots.length})
                  </Label>
                  <input
                    type="file"
                    ref={screenshotFileInputRef}
                    accept="image/*"
                    multiple
                    onChange={handleScreenshotFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploadingScreenshots}
                    onClick={() => screenshotFileInputRef.current?.click()}
                    className="gap-1.5 text-xs h-8"
                  >
                    {isUploadingScreenshots ? <Loader2 className="size-3.5 animate-spin text-primary" /> : <Upload className="size-3.5 text-primary" />}
                    {isUploadingScreenshots ? "Uploading..." : "Upload PNG Screenshots"}
                  </Button>
                </div>

                {screenshots.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                    {screenshots.map((src, idx) => (
                      <div key={idx} className="relative group rounded-lg border bg-background overflow-hidden aspect-video shadow-2xs">
                        <img src={src} alt={`Screenshot ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
                        <button
                          type="button"
                          onClick={() => setScreenshots((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-80 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                    No screenshots added yet. Click "Upload PNG Screenshots" to persist previews.
                  </p>
                )}
              </div>

              <div className="md:col-span-2 border-t pt-3">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editing.featured)}
                    onChange={(e) => setEditing({ ...editing, featured: e.target.checked })}
                    className="size-4 rounded accent-primary"
                  />
                  <span>Spotlight Feature on Public Marketplace & CMS Pages</span>
                </label>
              </div>

              {/* Version History & Changelog */}
              <AddonReleaseHistorySection
                addon={editing}
                onVersionPublished={(newVer) =>
                  setEditing((prev) => (prev ? { ...prev, version: newVer } : null))
                }
              />
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setAddonModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveAddon} disabled={upsertAddon.isPending} className="gap-2 font-semibold">
                {upsertAddon.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Save Addon
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================== */}
      {/* 8. CATEGORY CREATE / EDIT MODAL DIALOG */}
      {/* ========================================== */}
      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="size-5 text-primary" />
              {categoryModalMode === "create" ? "Create New Category" : `Edit Category — ${targetCategoryOldName}`}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {categoryModalMode === "create"
                ? "Add a new domain category to organize extensions in the marketplace."
                : `Renaming will safely update all associated add-ons assigned to '${targetCategoryOldName}'.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Field label="Category Name *">
              <Input
                value={categoryInputName}
                onChange={(e) => setCategoryInputName(e.target.value)}
                placeholder="e.g. Communication, Hardware, AI & ML"
                autoFocus
              />
            </Field>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveCategory}
              disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
              className="gap-2 font-semibold"
            >
              {(createCategoryMutation.isPending || updateCategoryMutation.isPending) ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              {categoryModalMode === "create" ? "Create Category" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================== */}
      {/* 9. DELETE CATEGORY CONFIRMATION DIALOG */}
      {/* ========================================== */}
      {categoryToDelete && (
        <Dialog open={deleteCategoryModalOpen} onOpenChange={setDeleteCategoryModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="size-5" />
                Delete Category — {categoryToDelete.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {categoryToDelete.count > 0 ? (
                  <span className="text-destructive font-semibold">
                    Warning: Cannot delete category '{categoryToDelete.name}' because {categoryToDelete.count} add-on(s) are currently assigned to it.
                    Please reassign or delete those extensions first.
                  </span>
                ) : (
                  <span>
                    Are you sure you want to delete category '{categoryToDelete.name}'? This category has no assigned extensions and can be safely removed.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setDeleteCategoryModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={categoryToDelete.count > 0 || deleteCategoryMutation.isPending}
                onClick={() => deleteCategoryMutation.mutate(categoryToDelete.name)}
                className="gap-2"
              >
                {deleteCategoryMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                Delete Category
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================== */}
      {/* 10. DELETE ADDON CONFIRMATION DIALOG */}
      {/* ========================================== */}
      {addonToDelete && (
        <Dialog open={deleteAddonModalOpen} onOpenChange={setDeleteAddonModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="size-5" />
                Delete Addon — {addonToDelete.name}
              </DialogTitle>
              <DialogDescription className="text-xs space-y-2">
                <p>
                  Are you sure you want to remove <strong className="text-foreground">{addonToDelete.name}</strong> (<code className="font-mono text-foreground">/{addonToDelete.slug}</code>)?
                </p>
                <p className="text-muted-foreground">
                  If this add-on has active tenant entitlements, subscriptions, or historical orders, the system will safely <strong>soft-archive</strong> it to preserve audit records.
                </p>
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setDeleteAddonModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleteAddon.isPending}
                onClick={() => deleteAddon.mutate(addonToDelete.id)}
                className="gap-2 font-semibold"
              >
                {deleteAddon.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                Confirm Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-foreground">{label}</Label>
      {children}
    </div>
  );
}

type AddonRelease = {
  id: string;
  addonId: string;
  addonSlug: string;
  version: string;
  previousVersion: string | null;
  changeSummary: string;
  releaseNotes: string | null;
  isPublic: boolean;
  actorEmail: string | null;
  metadataDiff: Record<string, any> | null;
  createdAt: string;
};

function AddonReleaseHistorySection({
  addon,
  onVersionPublished,
}: {
  addon: Partial<Addon>;
  onVersionPublished: (newVersion: string) => void;
}) {
  const qc = useQueryClient();
  const [isPublishingOpen, setIsPublishingOpen] = useState(false);
  const [versionInput, setVersionInput] = useState("");
  const [summaryInput, setSummaryInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const { data: releaseData, isLoading, refetch } = useQuery({
    queryKey: ["super-addon-releases", addon.slug],
    queryFn: async () => {
      if (!addon.slug) return { releases: [] };
      return api.get<{
        addonSlug: string;
        currentVersion: string;
        totalReleases: number;
        releases: AddonRelease[];
      }>(`/super/addons/${addon.slug}/releases`);
    },
    enabled: Boolean(addon.slug && addon.id),
  });

  const releases = releaseData?.releases || [];

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!addon.slug) throw new Error("Add-on slug missing");
      return api.post(`/super/addons/${addon.slug}/releases`, {
        version: versionInput,
        changeSummary: summaryInput,
        releaseNotes: notesInput,
        isPublic,
      });
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || "Version published successfully");
      setIsPublishingOpen(false);
      setVersionInput("");
      setSummaryInput("");
      setNotesInput("");
      refetch();
      qc.invalidateQueries({ queryKey: ["admin-addons"] });
      if (data?.currentVersion) {
        onVersionPublished(data.currentVersion);
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err.message || "Failed to publish version");
    },
  });

  if (!addon.id) {
    return (
      <div className="md:col-span-2 p-3.5 rounded-xl border bg-secondary/10 space-y-1.5">
        <div className="text-xs font-bold text-foreground flex items-center gap-2">
          <BookOpen className="size-4 text-primary" /> Version History & Changelog
        </div>
        <p className="text-[11px] text-muted-foreground">
          Save this add-on to database first before recording formal historical release versions.
        </p>
      </div>
    );
  }

  return (
    <div className="md:col-span-2 p-3.5 rounded-xl border bg-secondary/10 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-primary" />
          <span className="text-xs font-bold text-foreground">Version History & Changelog</span>
          <Badge variant="outline" className="font-mono text-[10px]">
            Current: v{addon.version || "1.0.0"}
          </Badge>
          <Badge variant="secondary" className="font-mono text-[10px]">
            {releases.length} {releases.length === 1 ? "Release" : "Releases"}
          </Badge>
        </div>
        <Button
          type="button"
          size="sm"
          variant={isPublishingOpen ? "secondary" : "outline"}
          onClick={() => {
            setIsPublishingOpen((prev) => !prev);
            if (!versionInput && addon.version) {
              const parts = String(addon.version).replace(/^v/i, "").split(".");
              if (parts.length === 3 && !isNaN(Number(parts[2]))) {
                setVersionInput(`${parts[0]}.${parts[1]}.${Number(parts[2]) + 1}`);
              }
            }
          }}
          className="h-7 text-xs gap-1.5"
        >
          <Plus className="size-3" />
          {isPublishingOpen ? "Cancel" : "Publish New Release"}
        </Button>
      </div>

      {isPublishingOpen && (
        <div className="p-3 rounded-lg border bg-background space-y-3 shadow-xs">
          <div className="text-xs font-bold text-foreground">Publish New Version Release</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-semibold">Release Version (SemVer) *</Label>
              <Input
                value={versionInput}
                onChange={(e) => setVersionInput(e.target.value)}
                placeholder="e.g. 1.1.0 or 2.0.0"
                className="h-8 text-xs font-mono mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px] font-semibold">Change Summary *</Label>
              <Input
                value={summaryInput}
                onChange={(e) => setSummaryInput(e.target.value)}
                placeholder="e.g. Added thermal printing support and device retry"
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-[11px] font-semibold">Detailed Release Notes (Optional)</Label>
            <Textarea
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="Full changelog details or release documentation..."
              className="text-xs mt-1 min-h-[50px]"
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground select-none">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded border"
              />
              <span>Publicly visible on public marketplace store</span>
            </label>
            <Button
              type="button"
              size="sm"
              disabled={publishMutation.isPending || !versionInput.trim() || !summaryInput.trim()}
              onClick={() => publishMutation.mutate()}
              className="h-8 text-xs font-bold gap-1.5"
            >
              {publishMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Publish v{versionInput.trim() || "..."}
            </Button>
          </div>
        </div>
      )}

      {/* Historical Releases List */}
      <div className="space-y-1.5 pt-1">
        {isLoading ? (
          <div className="py-3 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="size-3.5 animate-spin text-primary" /> Loading release history...
          </div>
        ) : releases.length === 0 ? (
          <div className="py-3 text-center text-[11px] text-muted-foreground border rounded-lg bg-background/50">
            No historical release records stored for this add-on yet. Use <span className="font-semibold text-foreground">Publish New Release</span> above to record the first immutable changelog entry.
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {releases.map((rel) => (
              <div key={rel.id} className="p-2.5 rounded-lg border bg-background text-xs space-y-1 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[11px]">
                      v{rel.version}
                    </span>
                    {rel.previousVersion && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        (prev: v{rel.previousVersion})
                      </span>
                    )}
                    <span className="font-semibold text-foreground">{rel.changeSummary}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{new Date(rel.createdAt).toLocaleDateString()}</span>
                    <Badge variant={rel.isPublic ? "outline" : "secondary"} className="text-[9px] py-0">
                      {rel.isPublic ? "Public" : "Internal"}
                    </Badge>
                  </div>
                </div>
                {rel.releaseNotes && (
                  <p className="text-[11px] text-muted-foreground pl-1 border-l-2 border-primary/20 italic mt-1">
                    {rel.releaseNotes}
                  </p>
                )}
                {rel.actorEmail && (
                  <div className="text-[10px] text-muted-foreground text-right font-mono">
                    by {rel.actorEmail}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
