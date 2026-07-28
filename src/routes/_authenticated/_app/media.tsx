import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ImageIcon,
  Upload,
  Trash2,
  FileText,
  Search,
  FolderPlus,
  Folder,
  Copy,
  Plus,
  Filter,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { PlanGuard, PlanLimitBar } from "@/components/plan-guard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/media")({
  component: TenantMediaPage,
  head: () => ({ meta: [{ title: "Media Library — Master ERP" }] }),
});

export type TenantMediaAsset = {
  id: string;
  name: string;
  folder: string;
  category: string;
  size: string;
  type: "image" | "document";
  date: string;
  url: string;
};

const DEFAULT_TENANT_FOLDERS = ["Company Logos", "Invoices & Receipts", "Legal Contracts", "Employee Files", "General"];
const DEFAULT_TENANT_CATEGORIES = ["Logos", "Invoices", "Contracts", "Certificates", "General"];

const DEFAULT_SEED_ASSETS: TenantMediaAsset[] = [
  { id: "ast-01", name: "Company Logo HD.png", folder: "Company Logos", category: "Logos", size: "1.2 MB", type: "image", date: "2026-07-28", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80" },
  { id: "ast-02", name: "Employee Handbook 2026.pdf", folder: "Employee Files", category: "Certificates", size: "4.8 MB", type: "document", date: "2026-07-26", url: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=400&q=80" },
  { id: "ast-03", name: "GST Registration Certificate.pdf", folder: "Legal Contracts", category: "Invoices", size: "850 KB", type: "document", date: "2026-07-20", url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80" },
];

function TenantMediaPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id;

  const [selectedFolder, setSelectedFolder] = useState<string>("All");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [search, setSearch] = useState("");

  // Create Folder Dialog State
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Upload Dialog State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFolderChoice, setUploadFolderChoice] = useState<string>("Company Logos");
  const [uploadCategoryChoice, setUploadCategoryChoice] = useState<string>("Logos");
  const [selectedFileObj, setSelectedFileObj] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Realtime Database Query
  const slugKey = `tenant-${tenantId || "default"}-media-library`;
  const { data: mediaData, isLoading } = useQuery({
    queryKey: ["realtime-tenant-media-library", tenantId],
    queryFn: async () => {
      if (!tenantId) return { folders: DEFAULT_TENANT_FOLDERS, categories: DEFAULT_TENANT_CATEGORIES, files: DEFAULT_SEED_ASSETS };
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", slugKey).maybeSingle();
      if (data?.content && typeof data.content === "object" && "files" in data.content) {
        return {
          folders: ((data.content as any).folders ?? DEFAULT_TENANT_FOLDERS) as string[],
          categories: ((data.content as any).categories ?? DEFAULT_TENANT_CATEGORIES) as string[],
          files: ((data.content as any).files ?? DEFAULT_SEED_ASSETS) as TenantMediaAsset[],
        };
      }
      // Seed default
      const defaultState = { folders: DEFAULT_TENANT_FOLDERS, categories: DEFAULT_TENANT_CATEGORIES, files: DEFAULT_SEED_ASSETS };
      await supabase.from("cms_pages").upsert({ slug: slugKey, title: `Media Library ${tenantId}`, content: defaultState as any });
      return defaultState;
    },
    enabled: !!tenantId,
  });

  const folders = mediaData?.folders ?? DEFAULT_TENANT_FOLDERS;
  const categories = mediaData?.categories ?? DEFAULT_TENANT_CATEGORIES;
  const assets = mediaData?.files ?? DEFAULT_SEED_ASSETS;

  // Realtime Subscription Channel
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`realtime-media-${tenantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cms_pages", filter: `slug=eq.${slugKey}` },
        () => {
          qc.invalidateQueries({ queryKey: ["realtime-tenant-media-library", tenantId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, qc, slugKey]);

  async function persistMediaState(updatedData: { folders?: string[]; categories?: string[]; files?: TenantMediaAsset[] }) {
    if (!tenantId) return;
    const payload = {
      folders: updatedData.folders ?? folders,
      categories: updatedData.categories ?? categories,
      files: updatedData.files ?? assets,
    };
    const { error } = await supabase.from("cms_pages").upsert({ slug: slugKey, title: `Media Library ${tenantId}`, content: payload as any });
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["realtime-tenant-media-library", tenantId] });
  }

  // Create Folder Handler
  async function handleCreateFolder() {
    if (!newFolderName.trim()) return toast.error("Folder name required");
    const name = newFolderName.trim();
    if (folders.includes(name)) return toast.error("Folder already exists");

    try {
      await persistMediaState({ folders: [...folders, name] });
      toast.success(`Folder "${name}" created!`);
      setNewFolderName("");
      setIsFolderModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create folder");
    }
  }

  // File Selector for Upload Modal
  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const filesArr = e.target.files;
    if (!filesArr || filesArr.length === 0) return;
    const file = filesArr[0];
    setSelectedFileObj(file);

    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreviewUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  // Confirm Upload with Chosen Folder & Category
  async function handleConfirmUpload() {
    if (!selectedFileObj || !previewUrl) return toast.error("Please select a file");
    setIsUploading(true);

    try {
      const isImg = selectedFileObj.type.includes("image");
      const newAsset: TenantMediaAsset = {
        id: `ast-${Date.now()}`,
        name: selectedFileObj.name,
        folder: uploadFolderChoice || "Company Logos",
        category: uploadCategoryChoice || "Logos",
        size: `${(selectedFileObj.size / (1024 * 1024)).toFixed(1)} MB`,
        type: isImg ? "image" : "document",
        date: new Date().toISOString().slice(0, 10),
        url: previewUrl,
      };

      await persistMediaState({ files: [newAsset, ...assets] });
      toast.success(`Asset "${selectedFileObj.name}" uploaded to folder "${uploadFolderChoice}"!`);
      setSelectedFileObj(null);
      setPreviewUrl(null);
      setIsUploadModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  async function deleteAsset(id: string) {
    try {
      const updated = assets.filter((a) => a.id !== id);
      await persistMediaState({ files: updated });
      toast.success("Asset deleted");
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  }

  function handleCopyUrl(url: string) {
    navigator.clipboard.writeText(url);
    toast.success("Asset URL copied to clipboard!");
  }

  const filteredAssets = assets.filter((a) => {
    const matchesFolder = selectedFolder === "All" || a.folder === selectedFolder;
    const matchesCategory = selectedCategory === "All" || a.category === selectedCategory;
    const matchesSearch = !search || a.name.toLowerCase().includes(search.toLowerCase());
    return matchesFolder && matchesCategory && matchesSearch;
  });

  return (
    <PlanGuard moduleName="Media Library & Storage" requiredPlan="free">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <ImageIcon className="size-6 text-primary" /> Realtime Workspace Media & Assets
            </h1>
            <p className="text-xs text-muted-foreground">
              Create custom folders, tag asset categories, and upload company logos & GST documents.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setIsFolderModalOpen(true)} className="gap-1.5 text-xs">
              <FolderPlus className="size-4 text-primary" /> Create Folder
            </Button>
            <Button size="sm" onClick={() => setIsUploadModalOpen(true)} className="gap-1.5 text-xs bg-primary font-bold">
              <Upload className="size-4" /> Upload Asset (Folder & Category)
            </Button>
          </div>
        </div>

        {/* Plan Limit Bar */}
        <PlanLimitBar used={assets.length} limit={50} label="Storage Capacity & Asset Limit" />

        {/* Content Layout */}
        <div className="grid lg:grid-cols-[240px_1fr] gap-6 items-start">
          {/* Folders Navigation Sidebar */}
          <Card className="p-3 border shadow-xs space-y-1.5">
            <div className="flex items-center justify-between px-3 py-2 text-xs font-bold text-muted-foreground uppercase border-b mb-1">
              <span className="flex items-center gap-1.5"><Folder className="size-3.5" /> Folders</span>
              <Button size="icon" variant="ghost" className="size-6" onClick={() => setIsFolderModalOpen(true)} title="Create Folder">
                <Plus className="size-3.5" />
              </Button>
            </div>

            <button
              onClick={() => setSelectedFolder("All")}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                selectedFolder === "All" ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-secondary text-foreground"
              }`}
            >
              <span className="flex items-center gap-2">
                <Folder className="size-3.5" /> All Assets
              </span>
              <span className="font-mono text-[10px]">({assets.length})</span>
            </button>

            {folders.map((f) => {
              const count = assets.filter((x) => x.folder === f).length;
              return (
                <button
                  key={f}
                  onClick={() => setSelectedFolder(f)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                    selectedFolder === f ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-secondary text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Folder className="size-3.5 shrink-0" /> <span className="truncate">{f}</span>
                  </span>
                  <span className="font-mono text-[10px]">({count})</span>
                </button>
              );
            })}
          </Card>

          {/* Main Assets View */}
          <div className="space-y-4">
            {/* Search & Category Filter Pills */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border shadow-xs">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets by filename..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto py-1">
                <span className="text-[11px] font-bold text-muted-foreground shrink-0 flex items-center gap-1">
                  <Filter className="size-3" /> Category:
                </span>
                <Button
                  size="sm"
                  variant={selectedCategory === "All" ? "default" : "ghost"}
                  className="h-7 text-xs px-2.5 font-semibold shrink-0"
                  onClick={() => setSelectedCategory("All")}
                >
                  All
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    size="sm"
                    variant={selectedCategory === cat ? "default" : "ghost"}
                    className="h-7 text-xs px-2.5 font-semibold shrink-0"
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>

            {/* Assets Grid */}
            {isLoading ? (
              <div className="py-16 grid place-items-center">
                <Loader2 className="size-8 animate-spin text-primary" />
              </div>
            ) : filteredAssets.length === 0 ? (
              <Card className="p-12 text-center text-xs text-muted-foreground italic space-y-2">
                <ImageIcon className="size-8 mx-auto opacity-30" />
                <p>No assets found matching folder "{selectedFolder}" and category "{selectedCategory}".</p>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredAssets.map((ast) => (
                  <Card key={ast.id} className="overflow-hidden group hover:border-primary/50 transition-all flex flex-col justify-between">
                    <div className="h-36 bg-secondary/40 relative overflow-hidden flex items-center justify-center">
                      {ast.type === "image" ? (
                        <img src={ast.url} alt={ast.name} className="object-cover size-full group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="size-12 rounded-2xl bg-primary/10 text-primary grid place-items-center">
                          <FileText className="size-6" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button size="icon" variant="secondary" onClick={() => handleCopyUrl(ast.url)} title="Copy URL">
                          <Copy className="size-3.5" />
                        </Button>
                        <Button size="icon" variant="destructive" onClick={() => deleteAsset(ast.id)} title="Delete Asset">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                      <Badge variant="outline" className="absolute top-2 left-2 text-[9px] font-mono bg-background/80 backdrop-blur-xs">
                        {ast.category || "General"}
                      </Badge>
                    </div>

                    <CardContent className="p-3.5 space-y-1.5">
                      <p className="font-bold text-xs truncate" title={ast.name}>
                        {ast.name}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono pt-1 border-t">
                        <span className="truncate">{ast.folder}</span>
                        <span className="shrink-0">{ast.size}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* MODAL 1: CREATE NEW FOLDER */}
        <Dialog open={isFolderModalOpen} onOpenChange={setIsFolderModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderPlus className="size-5 text-primary" /> Create New Folder
              </DialogTitle>
              <DialogDescription className="text-xs">
                Create a folder directory to organize company assets and receipts.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Folder Name *</Label>
                <Input
                  placeholder="e.g. Logos, Vendor Invoices, Contracts"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFolderModalOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateFolder} className="bg-primary font-bold">Create Folder</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL 2: UPLOAD FILE WITH FOLDER & CATEGORY SELECTOR */}
        <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="size-5 text-primary" /> Upload Workspace File
              </DialogTitle>
              <DialogDescription className="text-xs">
                Select an image/document file, destination folder, and category.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Select File *</Label>
                <Input type="file" onChange={handleFileSelected} className="text-xs" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Destination Folder</Label>
                <Select value={uploadFolderChoice} onValueChange={setUploadFolderChoice}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {folders.map((f) => (
                      <SelectItem key={f} value={f} className="text-xs">
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Asset Category</Label>
                <Select value={uploadCategoryChoice} onValueChange={setUploadCategoryChoice}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c} className="text-xs">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {previewUrl && (
                <div className="p-2 border rounded-xl bg-secondary/30 text-center">
                  <img src={previewUrl} alt="Preview" className="h-28 mx-auto object-contain rounded-lg" />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>Cancel</Button>
              <Button onClick={handleConfirmUpload} disabled={isUploading || !selectedFileObj} className="bg-primary font-bold gap-2">
                {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Upload to Storage
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PlanGuard>
  );
}
