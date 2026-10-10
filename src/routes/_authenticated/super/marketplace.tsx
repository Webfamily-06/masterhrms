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
  category: "Productivity",
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

function MarketplaceAdmin() {
  const qc = useQueryClient();

  // Search, Filters & View Mode
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<string>("featured");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

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

  // 1. Fetch System Settings to derive configured authoritative application currency
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

  // Effective Authoritative Currency Settings
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

  // Computed summary metrics from live data
  const metrics = useMemo(() => {
    const total = addons.length;
    const categoriesCount = categoryDetails.length;
    const published = addons.filter((a) => a.status === "available" || a.status === "active").length;
    const beta = addons.filter((a) => a.status === "beta").length;
    const draftOrArchived = addons.filter((a) => a.status === "draft" || a.status === "archived").length;
    const featuredCount = addons.filter((a) => Boolean(a.featured)).length;
    return { total, categoriesCount, published, beta, draftOrArchived, featuredCount };
  }, [addons, categoryDetails]);

  // Filtered and sorted addons list
  const filteredAddons = useMemo(() => {
    let result = addons.filter((a) => {
      const matchesSearch =
        !searchQuery ||
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.tagline ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.developer ?? "").toLowerCase().includes(searchQuery.toLowerCase());

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

  // Handle PNG Screenshots multi-upload to /v1/media/upload
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <Store className="size-7 text-primary" />
              Marketplace Addons
            </h1>
            <Badge variant="secondary" className="gap-1 text-xs font-mono font-bold">
              {metrics.total} Extensions
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Manage ecosystem extensions, categories, media assets, pricing tiers, and public store availability.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Public Store Action */}
          <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs h-9">
            <Link to="/addons" target="_blank">
              <Globe className="size-3.5 text-primary" /> Public Store
              <ExternalLink className="size-3 text-muted-foreground ml-0.5" />
            </Link>
          </Button>

          {/* Refresh Action */}
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

          {/* New Addon Primary Action */}
          <Button size="sm" onClick={openNewAddon} className="gap-1.5 text-xs h-9 font-semibold">
            <Plus className="size-4" /> New Addon
          </Button>
        </div>
      </div>

      {/* 2. SUMMARY METRICS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="p-4 border shadow-2xs bg-card/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Extensions</span>
            <Package className="size-4 text-primary" />
          </div>
          <div className="text-2xl font-bold mt-2">{metrics.total}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
            <span className="text-emerald-600 font-bold">{metrics.published} live</span> • {metrics.draftOrArchived} draft/archived
          </p>
        </Card>

        <Card className="p-4 border shadow-2xs bg-card/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Addon Categories</span>
            <Layers className="size-4 text-primary" />
          </div>
          <div className="text-2xl font-bold mt-2">{metrics.categoriesCount}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Distinct taxonomy domains
          </p>
        </Card>

        <Card className="p-4 border shadow-2xs bg-card/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Published & Active</span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold mt-2 text-emerald-700">{metrics.published}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Visible on public /addons catalog
          </p>
        </Card>

        <Card className="p-4 border shadow-2xs bg-card/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Featured Addons</span>
            <Star className="size-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="text-2xl font-bold mt-2 text-amber-600">{metrics.featuredCount}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Highlighted with spotlight badge
          </p>
        </Card>
      </div>

      {/* 3. PROMINENT ADDON CATEGORIES MANAGEMENT PANEL */}
      <Card className="border shadow-2xs overflow-hidden">
        <CardHeader className="p-4 pb-3 border-b bg-secondary/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              Addon Categories
              <Badge variant="outline" className="text-[10px] font-mono">
                {categoryDetails.length} Categories
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Select a category to filter extensions below, or create, rename, and manage taxonomy categories.
            </CardDescription>
          </div>

          <Button size="sm" variant="outline" onClick={openNewCategory} className="gap-1.5 h-8 text-xs font-semibold shrink-0">
            <FolderPlus className="size-3.5 text-primary" /> New Category
          </Button>
        </CardHeader>

        <CardContent className="p-4">
          {isLoadingCategories ? (
            <div className="py-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" /> Loading category taxonomy...
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {/* "All Categories" Pill/Card */}
              <div
                onClick={() => setCategoryFilter("All")}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                  categoryFilter === "All"
                    ? "bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/20"
                    : "bg-background hover:bg-secondary/40 border-border text-foreground"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold line-clamp-1">All Categories</span>
                  <Tag className={`size-3.5 ${categoryFilter === "All" ? "text-primary-foreground" : "text-muted-foreground"}`} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`text-[11px] font-mono font-semibold ${categoryFilter === "All" ? "text-primary-foreground/90" : "text-muted-foreground"}`}>
                    {metrics.total} Addons
                  </span>
                  {categoryFilter === "All" && (
                    <span className="text-[10px] font-bold uppercase tracking-wider">Active</span>
                  )}
                </div>
              </div>

              {/* Dynamic Categorized Cards with Edit and Delete actions */}
              {categoryDetails.map((cat) => {
                const isSelected = categoryFilter.toLowerCase() === cat.name.toLowerCase();
                return (
                  <div
                    key={cat.name}
                    className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between group relative ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/20"
                        : "bg-background hover:border-primary/40 border-border text-foreground"
                    }`}
                  >
                    {/* Header Row: Title & Action Controls */}
                    <div className="flex items-start justify-between gap-1">
                      <span
                        onClick={() => setCategoryFilter(cat.name)}
                        className="text-xs font-bold line-clamp-1 cursor-pointer hover:underline"
                        title={cat.name}
                      >
                        {cat.name}
                      </span>

                      {/* Edit / Delete action icons */}
                      <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditCategory(cat);
                          }}
                          className={`p-1 rounded hover:bg-secondary/80 transition-colors ${
                            isSelected ? "text-primary-foreground hover:text-white hover:bg-white/20" : "text-muted-foreground hover:text-foreground"
                          }`}
                          title={`Edit ${cat.name}`}
                        >
                          <Pencil className="size-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDeleteCategory(cat);
                          }}
                          className={`p-1 rounded hover:bg-destructive/10 transition-colors ${
                            isSelected ? "text-primary-foreground hover:text-destructive-foreground hover:bg-destructive" : "text-muted-foreground hover:text-destructive"
                          }`}
                          title={`Delete ${cat.name}`}
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </div>

                    {/* Footer Row: Count & Selection Pill */}
                    <div
                      onClick={() => setCategoryFilter(cat.name)}
                      className="mt-2 flex items-center justify-between cursor-pointer"
                    >
                      <span className={`text-[11px] font-mono font-semibold ${isSelected ? "text-primary-foreground/90" : "text-muted-foreground"}`}>
                        {cat.count} {cat.count === 1 ? "Addon" : "Addons"}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-bold uppercase tracking-wider">Active</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. SEARCH, FILTER & VIEW CONTROLS TOOLBAR */}
      <Card className="p-4 shadow-2xs border space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, slug, tagline, developer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
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

          {/* Filters & View Mode Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Filter Dropdown */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 w-[150px] text-xs">
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

            {/* Status Filter Dropdown */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[140px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                <SelectItem value="available" className="text-xs">Available (Live)</SelectItem>
                <SelectItem value="featured" className="text-xs">Featured Only</SelectItem>
                <SelectItem value="beta" className="text-xs">Beta Testing</SelectItem>
                <SelectItem value="coming_soon" className="text-xs">Coming Soon</SelectItem>
                <SelectItem value="free" className="text-xs">Free ($0)</SelectItem>
                <SelectItem value="paid" className="text-xs">Paid Extensions</SelectItem>
              </SelectContent>
            </Select>

            {/* Sorting Dropdown */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-9 w-[140px] text-xs">
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
            <div className="flex items-center border p-0.5 rounded-lg bg-secondary/30">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded text-xs transition-all ${
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
                className={`p-1.5 rounded text-xs transition-all ${
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
          {categoryFilter !== "All" && (
            <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive" onClick={() => setCategoryFilter("All")}>
              Category: {categoryFilter}
              <X className="size-3" />
            </Badge>
          )}
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
        /* GRID VIEW */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAddons.map((a) => {
            const hasIcon = a.icon && (a.icon.startsWith("http") || a.icon.startsWith("data:") || a.icon.startsWith("/"));
            const formattedPrice = a.price_monthly === 0
              ? "Free"
              : `${formatSystemAmount(Number(a.price_monthly), activeCurrencyConfig)} / mo`;

            return (
              <Card
                key={a.id}
                className="group hover:border-primary/50 transition-all flex flex-col justify-between shadow-2xs border bg-card"
              >
                <CardContent className="p-5 space-y-4">
                  {/* Top Row: Icon, Status Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="size-13 shrink-0 rounded-xl border bg-secondary/30 grid place-items-center overflow-hidden p-1 shadow-2xs">
                      {hasIcon ? (
                        <img src={a.icon!} alt={a.name} className="size-11 object-contain rounded" loading="lazy" />
                      ) : (
                        <div className="size-11 rounded-lg bg-primary/10 text-primary font-bold grid place-items-center text-base">
                          {a.name?.[0] || "A"}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1 justify-end">
                      {a.featured && (
                        <Badge className="bg-amber-500 text-white text-[10px] gap-1 shadow-2xs">
                          <Star className="size-3 fill-white" /> Featured
                        </Badge>
                      )}
                      <Badge
                        variant={a.status === "available" || a.status === "active" ? "secondary" : "outline"}
                        className="text-[10px] capitalize"
                      >
                        {a.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        v{a.version ?? "1.0.0"}
                      </Badge>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-base line-clamp-1 group-hover:text-primary transition-colors">
                        {a.name}
                      </h3>
                      <span className="font-bold text-xs text-emerald-600 font-mono shrink-0">
                        {formattedPrice}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {a.category}
                      </Badge>
                      <span className="text-[11px] font-mono text-muted-foreground truncate">
                        /{a.slug}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
                      {a.tagline || a.description || "No description provided."}
                    </p>
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="pt-3 border-t flex items-center justify-between gap-2 text-xs">
                    <div className="text-[11px] text-muted-foreground truncate max-w-[120px]">
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
                        className="h-8 px-2.5 text-xs font-semibold"
                      >
                        <Pencil className="size-3.5 mr-1" /> Edit
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmDeleteAddon(a)}
                        className="h-8 px-2 text-destructive hover:bg-destructive/10"
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
        /* TABLE/LIST VIEW */
        <Card className="border shadow-2xs overflow-hidden">
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
                  const hasIcon = a.icon && (a.icon.startsWith("http") || a.icon.startsWith("data:") || a.icon.startsWith("/"));
                  const formattedPrice = a.price_monthly === 0
                    ? "Free"
                    : `${formatSystemAmount(Number(a.price_monthly), activeCurrencyConfig)} / mo`;

                  return (
                    <tr key={a.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="p-3 pl-4">
                        <div className="flex items-center gap-3">
                          <div className="size-9 shrink-0 rounded-lg border bg-background grid place-items-center overflow-hidden p-0.5 shadow-2xs">
                            {hasIcon ? (
                              <img src={a.icon!} alt={a.name} className="size-8 object-contain rounded" loading="lazy" />
                            ) : (
                              <div className="size-7 rounded bg-primary/10 text-primary font-bold text-xs grid place-items-center">
                                {a.name?.[0] || "A"}
                              </div>
                            )}
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
                        <Badge variant="secondary" className="text-[10px]">
                          {a.category}
                        </Badge>
                      </td>

                      <td className="p-3">
                        <Badge
                          variant={a.status === "available" || a.status === "active" ? "secondary" : "outline"}
                          className="text-[10px] capitalize"
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
                          <Button variant="outline" size="sm" onClick={() => openEditAddon(a)} className="h-7 px-2 text-xs font-semibold">
                            <Pencil className="size-3 mr-1" /> Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => confirmDeleteAddon(a)} className="h-7 px-1.5 text-destructive hover:bg-destructive/10">
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
                  value={editing.category || "Productivity"}
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
                    {editing.icon && (editing.icon.startsWith("http") || editing.icon.startsWith("data:") || editing.icon.startsWith("/")) ? (
                      <img src={editing.icon} alt="Preview" className="size-14 object-contain rounded" loading="lazy" />
                    ) : (
                      <div className="text-center text-[10px] text-muted-foreground p-1">No PNG Icon</div>
                    )}
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={editing.icon ?? ""}
                        onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                        placeholder="Paste image URL (/uploads/... or https://...)"
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
                        className="gap-1.5 shrink-0 h-9 text-xs"
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
                      Upload a local PNG file via real Media File API, or paste a canonical storage path.
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
                  placeholder="/dashboard/addons/install"
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Tagline (Pitch)">
                  <Input
                    value={editing.tagline ?? ""}
                    onChange={(e) => setEditing({ ...editing, tagline: e.target.value })}
                    placeholder="Automated workforce alerts via WhatsApp Business Cloud API"
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
