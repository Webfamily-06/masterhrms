'use client';

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState, useMemo, useRef } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Search,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  Sparkles,
  Layers,
  CheckCircle2,
  X,
  Globe,
  Loader2,
  RefreshCw,
  Tag,
  Package,
  FolderPlus,
  AlertTriangle,
  ArrowRight,
  Shield,
  Bot,
  Users,
  Landmark,
  FileText,
  ShoppingCart,
  Cpu,
  Share2,
  Sliders,
  Navigation,
  CheckCircle,
  History,
  Rocket,
} from "lucide-react";
import { formatSystemAmount, SystemCurrencySettings } from "@/lib/currency";

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

export type AddonReleaseRecord = {
  id: string;
  addonId: string;
  addonSlug: string;
  version: string;
  previousVersion: string | null;
  changeSummary: string;
  releaseNotes: string | null;
  isPublic: boolean;
  actorEmail: string;
  createdAt: string;
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
  status: "active",
  featured: false,
  install_url: "",
  docs_url: "",
  version: "1.0.0",
  features: [],
  screenshots: [],
};

function AddonIconRenderer({
  icon,
  name,
  category,
}: {
  icon: string | null;
  name: string;
  category: string;
  className?: string;
}) {
  let resolvedIcon = icon;
  if (
    resolvedIcon &&
    !resolvedIcon.startsWith("/") &&
    !resolvedIcon.startsWith("http") &&
    !resolvedIcon.startsWith("data:")
  ) {
    if (
      resolvedIcon.endsWith(".png") ||
      resolvedIcon.endsWith(".svg") ||
      resolvedIcon.endsWith(".jpg") ||
      resolvedIcon.endsWith(".webp")
    ) {
      resolvedIcon = `/addons-icons/${resolvedIcon}`;
    }
  }

  if (
    resolvedIcon &&
    (resolvedIcon.startsWith("http://") ||
      resolvedIcon.startsWith("https://") ||
      resolvedIcon.startsWith("/uploads/") ||
      resolvedIcon.startsWith("/addons-icons/") ||
      resolvedIcon.startsWith("/") ||
      resolvedIcon.startsWith("data:"))
  ) {
    return (
      <img
        src={resolvedIcon}
        alt={name}
        className="size-11 object-contain rounded-xl"
        loading="lazy"
      />
    );
  }

  const c = (category || "").toLowerCase();
  if (c.includes("social")) {
    return (
      <div className="size-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shadow-xs">
        <Share2 className="size-6" />
      </div>
    );
  }
  if (c.includes("integration")) {
    return (
      <div className="size-11 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shadow-xs">
        <Cpu className="size-6" />
      </div>
    );
  }
  if (c.includes("commerce") || c.includes("sale")) {
    return (
      <div className="size-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shadow-xs">
        <ShoppingCart className="size-6" />
      </div>
    );
  }
  if (c.includes("content")) {
    return (
      <div className="size-11 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center shadow-xs">
        <FileText className="size-6" />
      </div>
    );
  }
  if (c.includes("finance")) {
    return (
      <div className="size-11 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shadow-xs">
        <Landmark className="size-6" />
      </div>
    );
  }
  if (c.includes("hr")) {
    return (
      <div className="size-11 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center shadow-xs">
        <Users className="size-6" />
      </div>
    );
  }
  if (c.includes("communication") || c.includes("custom")) {
    return (
      <div className="size-11 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shadow-xs">
        <Sliders className="size-6" />
      </div>
    );
  }
  if (c.includes("mobility") || c.includes("operation")) {
    return (
      <div className="size-11 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center shadow-xs">
        <Navigation className="size-6" />
      </div>
    );
  }
  if (c.includes("ai")) {
    return (
      <div className="size-11 rounded-xl bg-fuchsia-500/10 text-fuchsia-600 flex items-center justify-center shadow-xs">
        <Bot className="size-6" />
      </div>
    );
  }
  if (c.includes("security")) {
    return (
      <div className="size-11 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shadow-xs">
        <Shield className="size-6" />
      </div>
    );
  }

  return (
    <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
      <Package className="size-6" />
    </div>
  );
}

function MarketplaceAdmin() {
  const qc = useQueryClient();

  // Search & Category filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Free Addons");

  // Addon Editor State
  const [editing, setEditing] = useState<Partial<Addon> | null>(null);
  const [addonModalOpen, setAddonModalOpen] = useState(false);
  const [featuresText, setFeaturesText] = useState("");
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [isUploadingScreenshots, setIsUploadingScreenshots] = useState(false);
  const iconFileInputRef = useRef<HTMLInputElement>(null);
  const screenshotFileInputRef = useRef<HTMLInputElement>(null);

  // Addon Details Modal State
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [viewingAddon, setViewingAddon] = useState<Addon | null>(null);

  // Add-on Releases Manager State
  const [releasesAddon, setReleasesAddon] = useState<Addon | null>(null);
  const [releaseVersion, setReleaseVersion] = useState("");
  const [releaseSummary, setReleaseSummary] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [releaseIsPublic, setReleaseIsPublic] = useState(true);
  const [releaseError, setReleaseError] = useState<string | null>(null);

  // Addon Deletion Confirmation State
  const [addonToDelete, setAddonToDelete] = useState<Addon | null>(null);

  // Category Management State
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState<"create" | "edit">("create");
  const [targetCategoryOldName, setTargetCategoryOldName] = useState("");
  const [categoryInputName, setCategoryInputName] = useState("");
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryDetail | null>(null);

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
      const unwrapped = (res as any)?.data || res;
      return Array.isArray(unwrapped) ? unwrapped : [];
    },
  });

  // 3. Fetch Category Details
  const { data: categoryDetails = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ["admin-addon-categories-details"],
    queryFn: async () => {
      const res = await api.get<CategoryDetail[]>("/super/addons/categories?details=true");
      const unwrapped = (res as any)?.data || res;
      return Array.isArray(unwrapped) ? unwrapped : [];
    },
  });

  // 4. Fetch Releases for currently selected addon in Releases Manager Dialog
  const {
    data: releasesData,
    isLoading: isLoadingReleases,
    refetch: refetchReleases,
  } = useQuery<{
    addonId: string;
    addonSlug: string;
    addonName: string;
    currentVersion: string;
    totalReleases: number;
    releases: AddonReleaseRecord[];
  }>({
    queryKey: ["super-addon-releases", releasesAddon?.slug],
    queryFn: async () => {
      const res = await api.get(`/super/addons/${encodeURIComponent(releasesAddon!.slug)}/releases`);
      return res?.data || res || {};
    },
    enabled: Boolean(releasesAddon?.slug),
  });

  const publishReleaseMutation = useMutation({
    mutationFn: async (payload: {
      slug: string;
      version: string;
      changeSummary: string;
      releaseNotes?: string;
      isPublic: boolean;
    }) => {
      return await api.post(`/super/addons/${encodeURIComponent(payload.slug)}/releases`, {
        version: payload.version,
        changeSummary: payload.changeSummary,
        releaseNotes: payload.releaseNotes || undefined,
        isPublic: payload.isPublic,
      });
    },
    onSuccess: (res: any) => {
      setReleaseError(null);
      setReleaseVersion("");
      setReleaseSummary("");
      setReleaseNotes("");
      setReleaseIsPublic(true);
      toast.success(res?.message || "Add-on release published successfully.");
      qc.invalidateQueries({ queryKey: ["super-addon-releases", releasesAddon?.slug] });
      qc.invalidateQueries({ queryKey: ["admin-addons"] });
      qc.invalidateQueries({ queryKey: ["public-addons"] });
    },
    onError: (err: any) => {
      const msg = err?.message || "Failed to publish add-on release.";
      setReleaseError(msg);
      toast.error(msg);
    },
  });

  const preferredCategoryOrder = [
    "free add-ons",
    "free addons",
    "free",
    "social media",
    "integration",
    "integrations",
    "e-commerces and saas",
    "e-commerce & sales",
    "e-commerce",
    "content management",
    "finance",
    "hr",
    "industrial solutions",
    "communication",
    "mobility",
    "ai",
    "security",
    "mobile app",
    "payment gateways",
    "accounting",
    "operations",
  ];

  const orderedCategoryDetails = useMemo(() => {
    return [...categoryDetails].sort((a, b) => {
      const aLower = a.name.toLowerCase();
      const bLower = b.name.toLowerCase();
      const aIdx = preferredCategoryOrder.findIndex((p) => aLower.includes(p) || p.includes(aLower));
      const bIdx = preferredCategoryOrder.findIndex((p) => bLower.includes(p) || p.includes(bLower));
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [categoryDetails]);

  function sortAddonsByReference(items: Addon[]): Addon[] {
    return [...items].sort((a, b) => a.name.localeCompare(b.name));
  }

  const metrics = useMemo(() => {
    const total = addons.length;
    const categoriesCount = categoryDetails.length;
    const published = addons.filter((a) => a.status === "available" || a.status === "active").length;
    const freeCount = addons.filter((a) => Number(a.price_monthly ?? 0) === 0).length;
    return { total, categoriesCount, published, freeCount };
  }, [addons, categoryDetails]);

  const groupedAddonsByCategory = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const map = new Map<string, Addon[]>();

    orderedCategoryDetails.forEach((cat) => {
      map.set(cat.name, []);
    });

    addons.forEach((a) => {
      const matchesSearch =
        !query ||
        a.name.toLowerCase().includes(query) ||
        a.slug.toLowerCase().includes(query) ||
        (a.tagline ?? "").toLowerCase().includes(query) ||
        (a.category ?? "").toLowerCase().includes(query) ||
        (Array.isArray(a.features) && a.features.some((f: string) => String(f).toLowerCase().includes(query)));

      if (!matchesSearch) return;

      const catName = a.category;
      if (!map.has(catName)) {
        map.set(catName, []);
      }
      map.get(catName)!.push(a);
    });

    return map;
  }, [addons, orderedCategoryDetails, searchQuery]);

  // Sync Canonical 133 Addons
  const syncCanonicalMutation = useMutation({
    mutationFn: async () => {
      return await api.post<{ message: string; createdCount: number; updatedCount: number; total: number }>(
        "/super/addons/sync-canonical",
        {}
      );
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Successfully synchronized canonical add-ons catalog!");
      qc.invalidateQueries({ queryKey: ["admin-addons"] });
      qc.invalidateQueries({ queryKey: ["admin-addon-categories-details"] });
      qc.invalidateQueries({ queryKey: ["admin-addon-categories"] });
      qc.invalidateQueries({ queryKey: ["public-addons"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to synchronize canonical add-ons");
    },
  });

  // Toggle Catalog Status (Active / Disabled)
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      return await api.put(`/super/addons/${id}`, { status: newStatus });
    },
    onSuccess: (_, variables) => {
      const isNowActive = variables.newStatus === "active" || variables.newStatus === "available";
      toast.success(isNowActive ? "Add-on enabled in catalog" : "Add-on disabled in catalog");
      qc.invalidateQueries({ queryKey: ["admin-addons"] });
      qc.invalidateQueries({ queryKey: ["public-addons"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update add-on status");
    },
  });

  // Create / Update Addon
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
        status: a.status || "active",
      };

      if (a.id && !a.id.startsWith("addon-")) {
        return await api.put(`/super/addons/${a.id}`, payload);
      } else {
        return await api.post("/super/addons", payload);
      }
    },
    onSuccess: () => {
      toast.success("Add-on saved successfully");
      qc.invalidateQueries({ queryKey: ["admin-addons"] });
      qc.invalidateQueries({ queryKey: ["admin-addon-categories-details"] });
      qc.invalidateQueries({ queryKey: ["admin-addon-categories"] });
      qc.invalidateQueries({ queryKey: ["public-addons"] });
      setAddonModalOpen(false);
      setDetailsModalOpen(false);
    },
    onError: (e: any) => {
      toast.error(e?.message || "Failed to save add-on");
    },
  });

  // Delete Addon
  const deleteAddon = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/super/addons/${id}`);
    },
    onSuccess: (res: any) => {
      if (res?.archived) {
        toast.info(res.message || "Add-on referenced by entitlements. Archived instead of hard-deleted.");
      } else {
        toast.success(res?.message || "Add-on deleted successfully");
      }
      qc.invalidateQueries({ queryKey: ["admin-addons"] });
      qc.invalidateQueries({ queryKey: ["admin-addon-categories-details"] });
      qc.invalidateQueries({ queryKey: ["admin-addon-categories"] });
      qc.invalidateQueries({ queryKey: ["public-addons"] });
      setAddonToDelete(null);
      setDetailsModalOpen(false);
    },
    onError: (e: any) => {
      toast.error(e?.message || "Failed to delete add-on");
    },
  });

  // Category Mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => api.post("/super/addons/categories", { name }),
    onSuccess: (res: any) => {
      toast.success(res?.message || "Category created successfully");
      qc.invalidateQueries({ queryKey: ["admin-addon-categories-details"] });
      qc.invalidateQueries({ queryKey: ["admin-addon-categories"] });
      setCategoryModalOpen(false);
      setCategoryInputName("");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to create category"),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) =>
      api.put(`/super/addons/categories/${encodeURIComponent(oldName)}`, { newName }),
    onSuccess: (res: any) => {
      toast.success(res?.message || "Category updated successfully");
      qc.invalidateQueries({ queryKey: ["admin-addon-categories-details"] });
      qc.invalidateQueries({ queryKey: ["admin-addon-categories"] });
      qc.invalidateQueries({ queryKey: ["admin-addons"] });
      setCategoryModalOpen(false);
      setCategoryInputName("");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to update category"),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (name: string) => api.delete(`/super/addons/categories/${encodeURIComponent(name)}`),
    onSuccess: (res: any) => {
      toast.success(res?.message || "Category deleted successfully");
      qc.invalidateQueries({ queryKey: ["admin-addon-categories-details"] });
      qc.invalidateQueries({ queryKey: ["admin-addon-categories"] });
      setCategoryToDelete(null);
      if (selectedCategory === categoryToDelete?.name) {
        setSelectedCategory("Free Addons");
      }
    },
    onError: (e: any) => toast.error(e?.message || "Failed to delete category"),
  });

  // Openers
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

  function openViewDetails(a: Addon) {
    setViewingAddon(a);
    setDetailsModalOpen(true);
  }

  function openReleasesManager(a: Addon) {
    setReleasesAddon(a);
    setReleaseVersion("");
    setReleaseSummary("");
    setReleaseNotes("");
    setReleaseIsPublic(true);
    setReleaseError(null);
  }

  function openNewCategory() {
    setCategoryModalMode("create");
    setTargetCategoryOldName("");
    setCategoryInputName("");
    setCategoryModalOpen(true);
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

  function handlePublishRelease(e: React.FormEvent) {
    e.preventDefault();
    if (!releasesAddon) return;
    const trimmedVer = releaseVersion.trim().replace(/^v/i, "");
    if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/.test(trimmedVer)) {
      setReleaseError("Version must follow semantic versioning (e.g. 1.2.0 or 2.0.0-beta.1).");
      return;
    }
    if (!releaseSummary.trim()) {
      setReleaseError("Change summary is required.");
      return;
    }
    setReleaseError(null);
    publishReleaseMutation.mutate({
      slug: releasesAddon.slug,
      version: trimmedVer,
      changeSummary: releaseSummary.trim(),
      releaseNotes: releaseNotes.trim() || undefined,
      isPublic: releaseIsPublic,
    });
  }

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
        toast.success("Image uploaded! Click 'Save Addon' to persist.");
      } else {
        toast.error("Upload failed: No URL returned from media server");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload image to storage");
    } finally {
      setIsUploadingIcon(false);
      if (iconFileInputRef.current) iconFileInputRef.current.value = "";
    }
  }

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
        if (res?.url) uploadedUrls.push(res.url);
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
    <div className="w-full min-w-0 space-y-5">
      <PageHeader
        title="Add-on Marketplace Catalog"
        description="Super Admin platform catalog for managing add-on modules, category taxonomy, availability toggles, and SemVer release history."
        icon={Package}
        badge={
          <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            {metrics.total} Modules ({metrics.published} Active)
          </Badge>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncCanonicalMutation.mutate()}
              disabled={syncCanonicalMutation.isPending}
              className="gap-1.5 text-xs"
            >
              {syncCanonicalMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin text-emerald-600" />
              ) : (
                <RefreshCw className="size-3.5 text-emerald-600" />
              )}
              Sync 133 Add-ons
            </Button>
            <Button variant="outline" size="sm" onClick={openNewCategory} className="gap-1.5 text-xs">
              <FolderPlus className="size-3.5" />
              New Category
            </Button>
            <Button size="sm" onClick={openNewAddon} className="gap-1.5 text-xs">
              <Plus className="size-3.5" />
              New Add-on
            </Button>
          </>
        }
      />

      {/* Summary Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200/80 dark:border-emerald-800/40 bg-gradient-to-r from-emerald-50/50 via-background to-emerald-50/20 dark:from-emerald-950/20 dark:via-background dark:to-emerald-950/10 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-2xl bg-emerald-100/90 dark:bg-emerald-900/60 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Sparkles className="size-6" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                CATALOG GOVERNANCE
              </div>
              <h2 className="text-lg font-bold text-foreground tracking-tight">
                {metrics.total} Catalog Add-ons across {metrics.categoriesCount} Categories
              </h2>
              <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                {metrics.published} active modules &bull; {metrics.freeCount} free extensions. Manage tenant entitlements from the Companies Governance Drawer.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const el = document.getElementById("marketplace-explorer-content");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="gap-1.5 text-xs shrink-0"
          >
            Jump to Catalog <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Main 2-Column Catalog Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
        {/* Left Sidebar: Category Filter */}
        <div className="w-full lg:w-64 xl:w-72 shrink-0 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              placeholder="Search add-ons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-10 text-xs rounded-xl bg-card border-border/80"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-3 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <Card className="border border-border/80 shadow-xs overflow-hidden rounded-xl bg-card">
            <div className="p-2 space-y-1 max-h-[540px] overflow-y-auto">
              {isLoadingCategories ? (
                <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="size-3.5 animate-spin text-emerald-600" /> Loading categories...
                </div>
              ) : (
                orderedCategoryDetails.map((cat) => {
                  const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
                  return (
                    <div key={cat.name} className="flex items-center gap-1 group">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat.name);
                          const targetId = "section-" + cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                          const el = document.getElementById(targetId);
                          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <span className="truncate pr-2">{cat.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] shrink-0 ${
                            isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {cat.count}
                        </span>
                      </button>
                      {cat.isDeletable && (
                        <button
                          type="button"
                          onClick={() => setCategoryToDelete(cat)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive rounded transition-opacity"
                          title={`Delete category ${cat.name}`}
                        >
                          <Trash2 className="size-3" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-2 border-t bg-muted/20 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground px-2 font-medium">Categories</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={openNewCategory}
                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
              >
                <FolderPlus className="size-3 text-emerald-600" /> Add
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Main Showcase: Catalog Cards */}
        <div id="marketplace-explorer-content" className="flex-1 w-full min-w-0 space-y-8">
          {isLoadingAddons ? (
            <div className="py-24 grid place-items-center">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground mt-3">Loading marketplace catalog...</p>
            </div>
          ) : isErrorAddons ? (
            <Card className="p-12 text-center text-muted-foreground space-y-3 rounded-xl">
              <AlertTriangle className="size-10 mx-auto text-destructive" />
              <p className="text-sm font-semibold text-foreground">Failed to load marketplace catalog</p>
              <p className="text-xs max-w-md mx-auto">
                {(addonsError as any)?.message || "A network or authentication error occurred."}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetchAddons()} className="mt-2">
                Retry Loading
              </Button>
            </Card>
          ) : (
            <div className="space-y-8">
              {orderedCategoryDetails.map((cat) => {
                const rawItems = groupedAddonsByCategory.get(cat.name) || [];
                const items = sortAddonsByReference(rawItems);
                if (items.length === 0) return null;
                const sectionId = "section-" + cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

                return (
                  <div key={cat.name} id={sectionId} className="space-y-4 scroll-mt-6">
                    <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="size-2.5 rounded-full bg-emerald-600" />
                        <h3 className="text-base font-semibold text-foreground tracking-tight">{cat.name}</h3>
                        <span className="text-xs text-muted-foreground font-normal">
                          {items.length} {items.length === 1 ? "add-on" : "add-ons"}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">
                        {items.filter((a) => a.status !== "disabled").length} Active
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                      {items.map((addon) => (
                        <AddonCatalogCard
                          key={addon.id}
                          addon={addon}
                          onViewDetails={() => openViewDetails(addon)}
                          onEdit={() => openEditAddon(addon)}
                          onManageReleases={() => openReleasesManager(addon)}
                          onToggleStatus={(newStatus) =>
                            toggleStatusMutation.mutate({ id: addon.id, newStatus })
                          }
                          onDelete={() => setAddonToDelete(addon)}
                          isToggling={
                            toggleStatusMutation.isPending && toggleStatusMutation.variables?.id === addon.id
                          }
                          activeCurrencyConfig={activeCurrencyConfig}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ADDON DETAILS MODAL (Super Admin Catalog Inspector) */}
      {viewingAddon && (
        <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <div className="flex items-start gap-4 pt-2">
                <div className="size-16 rounded-2xl border bg-secondary/30 grid place-items-center p-2 shadow-xs shrink-0">
                  <AddonIconRenderer
                    icon={viewingAddon.icon}
                    name={viewingAddon.name}
                    category={viewingAddon.category}
                  />
                </div>

                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <DialogTitle className="text-lg font-bold text-foreground">
                      {viewingAddon.name}
                    </DialogTitle>
                    <Badge
                      variant={
                        viewingAddon.status === "active" || viewingAddon.status === "available"
                          ? "default"
                          : "outline"
                      }
                      className={
                        viewingAddon.status === "active" || viewingAddon.status === "available"
                          ? "bg-emerald-600 text-white capitalize text-[10px]"
                          : "text-muted-foreground capitalize text-[10px]"
                      }
                    >
                      {viewingAddon.status}
                    </Badge>
                  </div>

                  <div className="flex items-center flex-wrap gap-2 text-xs">
                    <span className="text-muted-foreground tabular-nums">/{viewingAddon.slug}</span>
                    <span className="text-muted-foreground">&bull;</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {viewingAddon.category}
                    </Badge>
                    <span className="text-muted-foreground">&bull;</span>
                    <span className="font-semibold text-emerald-600 tabular-nums">
                      {Number(viewingAddon.price_monthly) === 0
                        ? "Free"
                        : `${formatSystemAmount(Number(viewingAddon.price_monthly), activeCurrencyConfig)} / mo`}
                    </span>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-5 py-4 border-t text-xs">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground">Overview & Capabilities</Label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {viewingAddon.tagline || viewingAddon.description || "Enterprise modular extension capability."}
                </p>
                {viewingAddon.long_description && (
                  <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                    {viewingAddon.long_description}
                  </p>
                )}
              </div>

              {Array.isArray(viewingAddon.features) && viewingAddon.features.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">Key Features & Inclusions</Label>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {viewingAddon.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-xl border bg-secondary/15">
                        <CheckCircle className="size-3.5 text-emerald-600 shrink-0" />
                        <span className="text-xs text-foreground truncate">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(viewingAddon.screenshots) && viewingAddon.screenshots.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">Module Screenshots</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {viewingAddon.screenshots.map((s, idx) => (
                      <div key={idx} className="rounded-xl border bg-background overflow-hidden aspect-video shadow-2xs">
                        <img src={s} alt="Screenshot" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3.5 rounded-xl border bg-secondary/10 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] text-muted-foreground">Developer: </span>
                  <span className="text-xs font-semibold text-foreground">
                    {viewingAddon.developer || "Master ERP Core Team"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">SemVer Version: </span>
                  <span className="text-xs font-semibold text-foreground">
                    v{viewingAddon.version || "1.0.0"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">Action Route: </span>
                  <span className="text-xs font-semibold text-foreground">
                    {viewingAddon.install_url || `/addons/${viewingAddon.slug}`}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-row items-center justify-between border-t pt-4 flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
                <Link href={`/addons/${viewingAddon.slug}`} target="_blank">
                  <Globe className="size-3.5 text-emerald-600" /> Public Listing
                  <ExternalLink className="size-3 text-muted-foreground ml-0.5" />
                </Link>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const target = viewingAddon;
                    setDetailsModalOpen(false);
                    openReleasesManager(target);
                  }}
                  className="text-xs gap-1.5"
                >
                  <History className="size-3.5" />
                  Manage Releases
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setDetailsModalOpen(false);
                    openEditAddon(viewingAddon);
                  }}
                  className="text-xs gap-1.5"
                >
                  <Pencil className="size-3.5" />
                  Edit Add-on
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDetailsModalOpen(false)} className="text-xs">
                  Close
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ADD-ON RELEASES MANAGER DIALOG */}
      <Dialog open={Boolean(releasesAddon)} onOpenChange={(open) => !open && setReleasesAddon(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <History className="size-4 text-primary" />
              Add-on Releases Manager — {releasesAddon?.name}
            </DialogTitle>
            <DialogDescription className="text-xs flex items-center gap-2 flex-wrap">
              <span className="tabular-nums">/{releasesAddon?.slug}</span>
              <span>&bull;</span>
              <span>
                Current Version:{" "}
                <strong className="text-foreground">
                  v{releasesData?.currentVersion || releasesAddon?.version || "1.0.0"}
                </strong>
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2 text-xs">
            {/* Publish New Release Form */}
            <form
              onSubmit={handlePublishRelease}
              className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                  <Rocket className="size-3.5 text-primary" />
                  Publish New SemVer Release
                </h4>
                <Badge variant="outline"className="text-[10px]">
                  Immutable History
                </Badge>
              </div>

              {releaseError && (
                <Alert variant="danger">
                  <AlertTriangle className="size-4" />
                  <AlertDescription className="text-xs">{releaseError}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="rel-ver" className="text-xs font-semibold">
                    Version (SemVer) *
                  </Label>
                  <Input
                    id="rel-ver"
                    placeholder="e.g. 2.1.0"
                    value={releaseVersion}
                    onChange={(e) => setReleaseVersion(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label htmlFor="rel-summary" className="text-xs font-semibold">
                    Change Summary *
                  </Label>
                  <Input
                    id="rel-summary"
                    placeholder="e.g. Added automated webhook retries and payroll sync fixes"
                    value={releaseSummary}
                    onChange={(e) => setReleaseSummary(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="rel-notes" className="text-xs font-semibold">
                  Detailed Release Notes (Optional)
                </Label>
                <Textarea
                  id="rel-notes"
                  rows={3}
                  placeholder="Markdown or bulleted changelog notes..."
                  value={releaseNotes}
                  onChange={(e) => setReleaseNotes(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Switch checked={releaseIsPublic} onCheckedChange={setReleaseIsPublic} />
                  <span className="font-medium text-foreground">Visible on Public Changelog</span>
                </label>

                <Button
                  type="submit"
                  size="sm"
                  disabled={publishReleaseMutation.isPending}
                  className="gap-1.5 text-xs"
                >
                  {publishReleaseMutation.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Rocket className="size-3.5" />
                  )}
                  Publish Release
                </Button>
              </div>
            </form>

            {/* Release History List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground">
                  Published Releases ({releasesData?.releases?.length ?? 0})
                </h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => refetchReleases()}
                  className="gap-1 text-xs"
                >
                  <RefreshCw className="size-3" />
                  Refresh
                </Button>
              </div>

              {isLoadingReleases ? (
                <div className="py-10 flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  Loading release history...
                </div>
              ) : !releasesData?.releases || releasesData.releases.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground border border-dashed rounded-xl">
                  <Tag className="size-7 mx-auto mb-2 opacity-40" />
                  <p className="font-semibold text-foreground">No releases published yet</p>
                  <p className="text-[11px] mt-0.5">
                    Publish the first versioned changelog entry above to start tracking releases.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {releasesData.releases.map((rel) => (
                    <div
                      key={rel.id}
                      className="p-3 rounded-xl border border-border/80 bg-card space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Badge className="tabular-nums text-[11px] bg-primary/10 text-primary border border-primary/20">
                            v{rel.version}
                          </Badge>
                          {rel.previousVersion && (
                            <span className="text-[10px] text-muted-foreground">
                              from v{rel.previousVersion}
                            </span>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              rel.isPublic
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {rel.isPublic ? "Public" : "Internal"}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(rel.createdAt).toLocaleString()} &bull; {rel.actorEmail}
                        </span>
                      </div>
                      <p className="font-semibold text-foreground">{rel.changeSummary}</p>
                      {rel.releaseNotes && (
                        <p className="text-[11px] text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {rel.releaseNotes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setReleasesAddon(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADDON CREATE / EDIT MODAL DIALOG */}
      {editing && (
        <Dialog open={addonModalOpen} onOpenChange={setAddonModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Pencil className="size-4" />
                </div>
                {"id" in editing && editing.id ? `Edit Add-on — ${editing.name}` : "Create New Add-on"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Upload image icons to storage, configure pricing, enable/disable status, and write feature copy.
              </DialogDescription>
            </DialogHeader>

            <div className="grid md:grid-cols-2 gap-4 py-2">
              <Field label="Add-on Name *">
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
                  className="rounded-xl text-xs h-9"
                />
              </Field>

              <Field label="URL Slug *">
                <Input
                  value={editing.slug ?? ""}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  placeholder="e.g. whatsapp-alerts"
                  className="text-xs rounded-xl h-9"
                />
              </Field>

              <Field label="Category *">
                <Select
                  value={editing.category || "HR"}
                  onValueChange={(val) => setEditing({ ...editing, category: val })}
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryDetails.map((cat) => (
                      <SelectItem key={cat.name} value={cat.name} className="text-xs">
                        {cat.name}
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
                  onChange={(e) =>
                    setEditing({ ...editing, price_monthly: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0"
                  className="rounded-xl text-xs h-9"
                />
              </Field>

              <div className="md:col-span-2 p-3.5 rounded-xl border bg-secondary/15 flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-foreground">Catalog Availability Status</Label>
                  <p className="text-[11px] text-muted-foreground">
                    {editing.status === "disabled"
                      ? "Currently Disabled (Hidden from tenant marketplace)"
                      : "Currently Active & Discoverable in Marketplace"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold tabular-nums text-foreground">
                    {editing.status === "disabled" ? "Disabled" : "Active"}
                  </span>
                  <Switch
                    checked={editing.status !== "disabled"}
                    onCheckedChange={(checked) =>
                      setEditing({ ...editing, status: checked ? "active" : "disabled" })
                    }
                  />
                </div>
              </div>

              <div className="md:col-span-2 p-4 rounded-xl border border-dashed bg-secondary/10 space-y-3">
                <Label className="text-xs font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="size-4 text-emerald-600" /> Icon Image
                  </span>
                  {editing.icon && (
                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">
                      Image Configured
                    </span>
                  )}
                </Label>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="size-16 shrink-0 rounded-2xl border bg-card grid place-items-center overflow-hidden p-1 shadow-xs">
                    <AddonIconRenderer
                      icon={editing.icon ?? null}
                      name={editing.name || "Addon"}
                      category={editing.category || "HR"}
                    />
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={editing.icon ?? ""}
                        onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                        placeholder="Saved storage URL (/uploads/addons/icons/...) or image link"
                        className="text-xs tabular-nums h-9 rounded-xl"
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
                        className="gap-1.5 shrink-0 h-9 text-xs font-semibold rounded-xl"
                      >
                        {isUploadingIcon ? (
                          <Loader2 className="size-3.5 animate-spin text-emerald-600" />
                        ) : (
                          <Upload className="size-3.5 text-emerald-600" />
                        )}
                        {isUploadingIcon ? "Uploading..." : "Upload"}
                      </Button>
                      {editing.icon && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditing({ ...editing, icon: null })}
                          className="h-9 px-2 text-destructive hover:bg-destructive/10 rounded-xl"
                          title="Remove icon"
                        >
                          <X className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Field label="Developer / Team">
                <Input
                  value={editing.developer ?? ""}
                  onChange={(e) => setEditing({ ...editing, developer: e.target.value })}
                  placeholder="Master ERP Core Team"
                  className="rounded-xl text-xs h-9"
                />
              </Field>

              <Field label="Version Number">
                <Input
                  value={editing.version ?? ""}
                  onChange={(e) => setEditing({ ...editing, version: e.target.value })}
                  placeholder="1.0.0"
                  className="rounded-xl text-xs h-9"
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Tagline (Brief Pitch)">
                  <Input
                    value={editing.tagline ?? ""}
                    onChange={(e) => setEditing({ ...editing, tagline: e.target.value })}
                    placeholder="Short 1-sentence value proposition"
                    className="rounded-xl text-xs h-9"
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Short Description">
                  <Textarea
                    rows={2}
                    value={editing.description ?? ""}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    className="text-xs rounded-xl"
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Features Included (One feature per line)">
                  <Textarea
                    rows={3}
                    value={featuresText}
                    onChange={(e) => setFeaturesText(e.target.value)}
                    placeholder={"Real-time sync\nAutomated notifications\nCustom templates"}
                    className="text-xs tabular-nums rounded-xl"
                  />
                </Field>
              </div>

              <div className="md:col-span-2 p-4 rounded-xl border bg-secondary/10 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <ImageIcon className="size-4 text-emerald-600" /> Screenshots Gallery ({screenshots.length})
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
                    className="gap-1.5 text-xs h-8 rounded-xl"
                  >
                    {isUploadingScreenshots ? (
                      <Loader2 className="size-3.5 animate-spin text-emerald-600" />
                    ) : (
                      <Upload className="size-3.5 text-emerald-600" />
                    )}
                    {isUploadingScreenshots ? "Uploading..." : "Upload Screenshots"}
                  </Button>
                </div>

                {screenshots.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                    {screenshots.map((src, idx) => (
                      <div
                        key={idx}
                        className="relative group rounded-xl border bg-background overflow-hidden aspect-video shadow-2xs"
                      >
                        <img src={src} alt="Screenshot" className="w-full h-full object-cover" loading="lazy" />
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
                  <p className="text-xs text-muted-foreground text-center py-3 border border-dashed rounded-xl">
                    No screenshots added yet.
                  </p>
                )}
              </div>

              <div className="md:col-span-2 border-t pt-3">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editing.featured)}
                    onChange={(e) => setEditing({ ...editing, featured: e.target.checked })}
                    className="size-4 rounded"
                  />
                  <span>Spotlight Feature on Public Marketplace & CMS Pages</span>
                </label>
              </div>
            </div>

            <DialogFooter className="mt-4 border-t pt-4">
              <Button variant="outline" onClick={() => setAddonModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveAddon} disabled={upsertAddon.isPending} className="gap-2">
                {upsertAddon.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Save Add-on
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* CATEGORY MANAGEMENT DIALOG */}
      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="size-5 text-primary" />
              {categoryModalMode === "create"
                ? "Create New Category"
                : `Edit Category — ${targetCategoryOldName}`}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {categoryModalMode === "create"
                ? "Add a new domain taxonomy category to organize add-on modules."
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
                className="rounded-xl text-xs"
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
              className="gap-2"
            >
              {createCategoryMutation.isPending || updateCategoryMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              {categoryModalMode === "create" ? "Create Category" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CATEGORY CONFIRMATION DIALOG */}
      <ConfirmationDialog
        open={Boolean(categoryToDelete)}
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
        title={`Delete Category "${categoryToDelete?.name}"?`}
        description={
          categoryToDelete && categoryToDelete.count > 0
            ? `Cannot delete '${categoryToDelete.name}' while ${categoryToDelete.count} add-on(s) remain assigned. Reassign them first.`
            : `Are you sure you want to remove category '${categoryToDelete?.name}'?`
        }
        confirmLabel="Delete Category"
        variant="destructive"
        isLoading={deleteCategoryMutation.isPending}
        onConfirm={() => {
          if (categoryToDelete && categoryToDelete.count === 0) {
            deleteCategoryMutation.mutate(categoryToDelete.name);
          } else {
            toast.error("Cannot delete a category that still contains add-ons.");
          }
        }}
      />

      {/* DELETE ADDON CONFIRMATION DIALOG */}
      <ConfirmationDialog
        open={Boolean(addonToDelete)}
        onOpenChange={(open) => !open && setAddonToDelete(null)}
        title={`Delete Add-on "${addonToDelete?.name}"?`}
        description="If this add-on has active tenant entitlements or historical records, it will be safely soft-archived instead of permanently deleted."
        confirmLabel="Confirm Delete"
        variant="destructive"
        isLoading={deleteAddon.isPending}
        onConfirm={() => {
          if (addonToDelete) deleteAddon.mutate(addonToDelete.id);
        }}
      />
    </div>
  );
}

function AddonCatalogCard({
  addon,
  onViewDetails,
  onEdit,
  onManageReleases,
  onToggleStatus,
  onDelete,
  isToggling,
  activeCurrencyConfig,
}: {
  addon: Addon;
  onViewDetails: () => void;
  onEdit: () => void;
  onManageReleases: () => void;
  onToggleStatus: (newStatus: string) => void;
  onDelete: () => void;
  isToggling?: boolean;
  activeCurrencyConfig: Partial<SystemCurrencySettings>;
}) {
  const isEnabled = addon.status !== "disabled";
  const isFree = Number(addon.price_monthly) <= 0;
  const priceDisplay = isFree
    ? "Free"
    : `${formatSystemAmount(Number(addon.price_monthly), activeCurrencyConfig)} / mo`;

  return (
    <Card
      className={`border border-border/80 rounded-xl bg-card p-4 text-center flex flex-col items-center justify-between transition-all duration-200 group relative hover:shadow-md hover:border-primary/50 ${
        !isEnabled ? "opacity-75 bg-muted/20 border-dashed" : ""
      }`}
    >
      {/* Top Super Admin Controls */}
      <div className="w-full flex items-center justify-between mb-2">
        <div
          className="flex items-center gap-1.5"
          title={isEnabled ? "Disable add-on in catalog" : "Enable add-on in catalog"}
        >
          <Switch
            checked={isEnabled}
            disabled={isToggling}
            onCheckedChange={(checked) => onToggleStatus(checked ? "active" : "disabled")}
            className="scale-75 origin-left"
          />
          <span className="text-[10px] text-muted-foreground select-none">
            {isEnabled ? "Active" : "Disabled"}
          </span>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onManageReleases}
            className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
            title="Manage Releases"
          >
            <History className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Edit Add-on"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Delete / Archive Add-on"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Centered Icon */}
      <div onClick={onViewDetails} className="cursor-pointer group-hover:scale-105 transition-transform my-1">
        <AddonIconRenderer icon={addon.icon} name={addon.name} category={addon.category} />
      </div>

      {/* Name, Version & Price */}
      <div className="mt-2 w-full space-y-1">
        <h4
          onClick={onViewDetails}
          className="text-xs font-bold text-foreground line-clamp-2 min-h-[32px] flex items-center justify-center leading-snug cursor-pointer group-hover:text-primary transition-colors"
          title={addon.name}
        >
          {addon.name}
        </h4>
        <div className="flex items-center justify-center gap-1.5 text-[10px]">
          <Badge variant="secondary"className="tabular-nums text-[10px] px-1.5 py-0">
            v{addon.version || "1.0.0"}
          </Badge>
          <span className="font-semibold text-emerald-600 tabular-nums">{priceDisplay}</span>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-3 pt-2 border-t border-border/50 w-full flex items-center justify-between gap-2 text-[11px]">
        <button
          type="button"
          onClick={onManageReleases}
          className="font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <Tag className="size-3" />
          Releases
        </button>
        <button
          type="button"
          onClick={onViewDetails}
          className="font-semibold text-primary hover:underline flex items-center gap-1 transition-colors"
        >
          <span>Details</span>
          <ExternalLink className="size-2.5" />
        </button>
      </div>
    </Card>
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

export default MarketplaceAdmin;
