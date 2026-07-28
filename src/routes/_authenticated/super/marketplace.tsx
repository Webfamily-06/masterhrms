import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Filter,
  CheckCircle2,
  X,
  FileCode,
  Globe,
  Loader2,
  RefreshCw,
  Tag,
  Package,
} from "lucide-react";

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
  price_monthly: number;
  developer: string | null;
  status: string;
  featured: boolean;
  install_url: string | null;
  docs_url: string | null;
  version: string | null;
  features: string[];
  screenshots: string[];
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
  developer: "Master HRMS",
  status: "available",
  featured: false,
  install_url: "",
  docs_url: "",
  version: "1.0.0",
  features: [],
  screenshots: [],
};

const PRESET_CATEGORIES = [
  "All",
  "Productivity",
  "Core HR",
  "Payroll & Tax",
  "Attendance",
  "Performance",
  "Analytics",
  "Security & SSO",
  "Integrations",
  "Utilities",
];

function MarketplaceAdmin() {
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [editing, setEditing] = useState<(Addon | (typeof emptyAddon & { id?: string })) | null>(null);
  const [open, setOpen] = useState(false);
  const [featuresText, setFeaturesText] = useState("");
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const iconFileInputRef = useRef<HTMLInputElement>(null);
  const screenshotFileInputRef = useRef<HTMLInputElement>(null);

  const { data: addons, isLoading, refetch } = useQuery({
    queryKey: ["admin-addons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("addons").select("*").order("name");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        features: Array.isArray((r as { features?: unknown }).features) ? ((r as { features: string[] }).features) : [],
        screenshots: Array.isArray((r as { screenshots?: unknown }).screenshots) ? ((r as { screenshots: string[] }).screenshots) : [],
      })) as Addon[];
    },
  });

  // Unique categories list
  const categories = useMemo(() => {
    const set = new Set<string>(PRESET_CATEGORIES.slice(1));
    (addons ?? []).forEach((a) => {
      if (a.category) set.add(a.category);
    });
    return ["All", ...Array.from(set).sort()];
  }, [addons]);

  // Filtered addons list
  const filteredAddons = useMemo(() => {
    if (!addons) return [];
    return addons.filter((a) => {
      const matchesSearch =
        !searchQuery ||
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.tagline ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.developer ?? "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = categoryFilter === "All" || a.category.toLowerCase() === categoryFilter.toLowerCase();

      let matchesStatus = true;
      if (statusFilter === "featured") matchesStatus = a.featured;
      else if (statusFilter === "free") matchesStatus = a.price_monthly === 0;
      else if (statusFilter === "paid") matchesStatus = a.price_monthly > 0;
      else if (statusFilter !== "all") matchesStatus = a.status === statusFilter;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [addons, searchQuery, categoryFilter, statusFilter]);

  const upsert = useMutation({
    mutationFn: async (a: Partial<Addon> & { id?: string }) => {
      const payload = { ...a } as Record<string, unknown>;
      if (a.id) {
        const { error } = await supabase.from("addons").update(payload as never).eq("id", a.id);
        if (error) throw error;
      } else {
        delete payload.id;
        const { error } = await supabase.from("addons").insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Addon saved successfully");
      qc.invalidateQueries({ queryKey: ["admin-addons"] });
      qc.invalidateQueries({ queryKey: ["public-addons"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("addons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Addon deleted");
      qc.invalidateQueries({ queryKey: ["admin-addons"] });
      qc.invalidateQueries({ queryKey: ["public-addons"] });
    },
  });

  function openNew() {
    setEditing({ ...emptyAddon });
    setFeaturesText("");
    setScreenshots([]);
    setOpen(true);
  }

  function openEdit(a: Addon) {
    setEditing(a);
    setFeaturesText((a.features ?? []).join("\n"));
    setScreenshots(a.screenshots ?? []);
    setOpen(true);
  }

  function save() {
    if (!editing) return;
    if (!editing.name || !editing.slug) {
      return toast.error("Name and slug are required fields");
    }
    const features = featuresText.split("\n").map((l) => l.trim()).filter(Boolean);
    upsert.mutate({ ...editing, features, screenshots } as never);
  }

  // Handle PNG Icon upload from local file input
  function handleIconFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editing) return;

    if (!file.type.startsWith("image/")) {
      return toast.error("Please upload an image file (PNG, JPG, SVG, WebP)");
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setEditing({ ...editing, icon: dataUrl });
      toast.success("PNG Icon updated! Save changes to apply.");
    };
    reader.readAsDataURL(file);
  }

  // Handle PNG Screenshots upload from local file input
  function handleScreenshotFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    files.forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setScreenshots((prev) => [...prev, dataUrl]);
      };
      reader.readAsDataURL(file);
    });
    toast.success(`Added ${files.length} screenshot image(s)`);
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Marketplace Addons</h1>
            <Badge variant="secondary" className="gap-1 text-xs">
              <Store className="size-3 text-primary" /> {addons?.length ?? 0} Total Extensions
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Manage extensions, upload PNG icons/screenshots, set monthly pricing, and features.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button size="sm" onClick={openNew} className="gap-2">
            <Plus className="size-4" /> New Addon
          </Button>
        </div>
      </div>

      {/* Filter & View Switcher Bar */}
      <Card className="p-4 shadow-xs border">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search addons by name, tagline, developer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Filters & View Mode Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 w-[160px] text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat} className="text-xs">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[150px] text-xs">
                <SelectValue placeholder="Status & Price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Items</SelectItem>
                <SelectItem value="featured" className="text-xs">⭐ Featured Only</SelectItem>
                <SelectItem value="free" className="text-xs">Free ($0)</SelectItem>
                <SelectItem value="paid" className="text-xs">Paid Addons</SelectItem>
                <SelectItem value="available" className="text-xs">Status: Available</SelectItem>
                <SelectItem value="beta" className="text-xs">Status: Beta</SelectItem>
                <SelectItem value="coming_soon" className="text-xs">Status: Coming Soon</SelectItem>
              </SelectContent>
            </Select>

            {/* View Switcher Toggle */}
            <div className="flex items-center gap-1 border p-1 rounded-lg bg-secondary/20">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded text-xs transition-all ${
                  viewMode === "grid" ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-secondary text-muted-foreground"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded text-xs transition-all ${
                  viewMode === "list" ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-secondary text-muted-foreground"
                }`}
                title="List View"
              >
                <ListIcon className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Results Stats */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>Showing {filteredAddons.length} of {addons?.length ?? 0} addons</span>
        {categoryFilter !== "All" && (
          <Badge variant="outline" className="text-[10px] gap-1">
            Category: {categoryFilter}
            <X className="size-3 cursor-pointer" onClick={() => setCategoryFilter("All")} />
          </Badge>
        )}
      </div>

      {/* Main Content View (Grid vs List) */}
      {isLoading ? (
        <div className="py-20 grid place-items-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : filteredAddons.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground space-y-3">
          <Package className="size-10 mx-auto opacity-40 text-primary" />
          <p className="text-sm font-medium">No addons match your filters.</p>
          <Button variant="outline" size="sm" onClick={() => { setSearchQuery(""); setCategoryFilter("All"); setStatusFilter("all"); }}>
            Reset Filters
          </Button>
        </Card>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAddons.map((a) => (
            <Card key={a.id} className="group hover:border-primary/50 transition-all flex flex-col justify-between shadow-xs">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  {/* PNG Icon or Fallback Icon */}
                  <div className="size-12 shrink-0 rounded-xl border bg-secondary/30 grid place-items-center overflow-hidden p-1">
                    {a.icon && (a.icon.startsWith("http") || a.icon.startsWith("data:")) ? (
                      <img src={a.icon} alt={a.name} className="size-10 object-contain rounded" />
                    ) : (
                      <div className="size-10 rounded-lg bg-primary/10 text-primary font-bold grid place-items-center text-base">
                        {a.name[0]}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1 justify-end">
                    {a.featured && (
                      <Badge className="bg-amber-500 text-white text-[10px]">
                        <Star className="size-3 mr-1 fill-white" /> Featured
                      </Badge>
                    )}
                    <Badge variant={a.status === "available" ? "secondary" : "outline"} className="text-[10px] capitalize">
                      {a.status}
                    </Badge>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base line-clamp-1">{a.name}</h3>
                    <span className="font-semibold text-xs text-primary shrink-0">
                      {a.price_monthly === 0 ? "Free" : `$${a.price_monthly}/mo`}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {a.tagline || a.description || "No description specified."}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t pt-3 font-mono">
                  <span className="truncate max-w-[140px]">/{a.slug}</span>
                  <Badge variant="outline" className="text-[10px]">{a.category}</Badge>
                </div>
              </CardContent>

              <div className="px-5 pb-4 pt-0 flex items-center justify-end gap-2 border-t mt-auto pt-3">
                <a href={`/addons/${a.slug}`} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-primary mr-auto flex items-center gap-1">
                  View CMS <ExternalLink className="size-3" />
                </a>
                <Button size="sm" variant="outline" onClick={() => openEdit(a)} className="gap-1 text-xs">
                  <Pencil className="size-3.5" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`Delete addon "${a.name}"?`)) del.mutate(a.id);
                  }}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* LIST / TABLE VIEW */
        <Card className="overflow-hidden shadow-xs border">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-secondary/50 font-semibold border-b text-muted-foreground uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3 pl-4">Addon Icon & Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Price / Month</th>
                  <th className="p-3">Developer</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Features & Shots</th>
                  <th className="p-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredAddons.map((a) => (
                  <tr key={a.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="p-3 pl-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 shrink-0 rounded-lg border bg-background grid place-items-center overflow-hidden p-0.5">
                          {a.icon && (a.icon.startsWith("http") || a.icon.startsWith("data:")) ? (
                            <img src={a.icon} alt={a.name} className="size-8 object-contain rounded" />
                          ) : (
                            <div className="size-7 rounded bg-primary/10 text-primary font-bold text-xs grid place-items-center">
                              {a.name[0]}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-xs flex items-center gap-1.5">
                            {a.name}
                            {a.featured && <Star className="size-3 text-amber-500 fill-amber-500" />}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">/addons/{a.slug}</div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3">
                      <Badge variant="secondary" className="text-[10px]">{a.category}</Badge>
                    </td>

                    <td className="p-3 font-semibold">
                      {a.price_monthly === 0 ? "Free" : `$${a.price_monthly}/mo`}
                    </td>

                    <td className="p-3 text-muted-foreground">{a.developer ?? "Master HRMS"}</td>

                    <td className="p-3">
                      <Badge variant={a.status === "available" ? "default" : "outline"} className="text-[10px] capitalize">
                        {a.status}
                      </Badge>
                    </td>

                    <td className="p-3 text-muted-foreground">
                      {a.features?.length ?? 0} features · {a.screenshots?.length ?? 0} PNGs
                    </td>

                    <td className="p-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(a)} className="size-7">
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Delete ${a.name}?`)) del.mutate(a.id);
                          }}
                          className="size-7 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* EDIT & NEW ADDON MODAL WITH PNG UPLOAD */}
      {editing && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Store className="size-5 text-primary" />
                {("id" in editing && editing.id) ? `Edit Addon — ${editing.name}` : "Create New Addon"}
              </DialogTitle>
              <DialogDescription>
                Configure addon details, PNG icon images, monthly pricing, features, and screenshots.
              </DialogDescription>
            </DialogHeader>

            <div className="grid md:grid-cols-2 gap-4 py-2">
              <Field label="Addon Name *">
                <Input
                  value={editing.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const autoSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                    setEditing({ ...editing, name, slug: editing.slug || autoSlug });
                  }}
                  placeholder="e.g. Expense Claims"
                />
              </Field>

              <Field label="URL Slug *">
                <Input
                  value={editing.slug}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  placeholder="e.g. expense-claims"
                  className="font-mono text-xs"
                />
              </Field>

              <Field label="Category">
                <Input
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  placeholder="e.g. Productivity"
                />
              </Field>

              <Field label="Monthly Price ($ USD)">
                <Input
                  type="number"
                  step="0.01"
                  value={editing.price_monthly}
                  onChange={(e) => setEditing({ ...editing, price_monthly: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </Field>

              {/* PNG ICON UPLOAD & IMAGE URL FIELD */}
              <div className="md:col-span-2 p-4 rounded-xl border bg-secondary/10 space-y-3">
                <Label className="text-xs font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="size-4 text-primary" /> PNG Icon Image (Upload file or URL)
                  </span>
                  {editing.icon && <span className="text-[10px] text-emerald-600 font-normal">✓ Icon set</span>}
                </Label>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {/* PNG Icon Preview */}
                  <div className="size-16 shrink-0 rounded-xl border bg-background grid place-items-center overflow-hidden p-1 shadow-xs">
                    {editing.icon && (editing.icon.startsWith("http") || editing.icon.startsWith("data:")) ? (
                      <img src={editing.icon} alt="Preview" className="size-14 object-contain rounded" />
                    ) : (
                      <div className="text-center text-xs text-muted-foreground p-1">
                        No PNG Icon
                      </div>
                    )}
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={editing.icon ?? ""}
                        onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                        placeholder="Paste image URL (https://.../icon.png or data:image/...)"
                        className="text-xs font-mono h-9"
                      />

                      {/* Hidden File Input for PNG Picker */}
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
                        onClick={() => iconFileInputRef.current?.click()}
                        className="gap-1.5 shrink-0 h-9 text-xs"
                      >
                        <Upload className="size-3.5 text-primary" /> Upload PNG
                      </Button>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      Select a local PNG image file from your device, or paste a direct image URL.
                    </p>
                  </div>
                </div>
              </div>

              <Field label="Developer / Company">
                <Input
                  value={editing.developer ?? ""}
                  onChange={(e) => setEditing({ ...editing, developer: e.target.value })}
                  placeholder="Master HRMS"
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
                <Select value={editing.status} onValueChange={(val) => setEditing({ ...editing, status: val })}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available (Public)</SelectItem>
                    <SelectItem value="beta">Beta Testing</SelectItem>
                    <SelectItem value="coming_soon">Coming Soon</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Install Route / Action URL">
                <Input
                  value={editing.install_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, install_url: e.target.value })}
                  placeholder="e.g. /dashboard/addons/install"
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Tagline (Short pitch)">
                  <Input
                    value={editing.tagline ?? ""}
                    onChange={(e) => setEditing({ ...editing, tagline: e.target.value })}
                    placeholder="Automated expense claims with OCR receipt scanning"
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
                    rows={5}
                    value={editing.long_description ?? ""}
                    onChange={(e) => setEditing({ ...editing, long_description: e.target.value })}
                    className="text-xs leading-relaxed"
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Features Included (One feature per line)">
                  <Textarea
                    rows={4}
                    value={featuresText}
                    onChange={(e) => setFeaturesText(e.target.value)}
                    placeholder={"Real-time sync\nCustom expense policies\nMulti-currency support"}
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
                    onClick={() => screenshotFileInputRef.current?.click()}
                    className="gap-1.5 text-xs h-8"
                  >
                    <Upload className="size-3.5 text-primary" /> Upload PNG Screenshots
                  </Button>
                </div>

                {screenshots.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                    {screenshots.map((src, idx) => (
                      <div key={idx} className="relative group rounded-lg border bg-background overflow-hidden aspect-video">
                        <img src={src} alt={`Screenshot ${idx + 1}`} className="w-full h-full object-cover" />
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
                    No screenshots added. Click "Upload PNG Screenshots" to add visual previews.
                  </p>
                )}
              </div>

              <div className="md:col-span-2 border-t pt-3">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.featured}
                    onChange={(e) => setEditing({ ...editing, featured: e.target.checked })}
                    className="size-4 rounded accent-primary"
                  />
                  <span>Feature on Public Marketplace & CMS Pages</span>
                </label>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={upsert.isPending} className="gap-2">
                {upsert.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Save Addon
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
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}
