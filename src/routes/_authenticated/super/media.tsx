import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  FolderPlus,
  Upload,
  Copy,
  Folder,
  Image as ImageIcon,
  Trash2,
  Search,
  RefreshCw,
  Loader2,
  Building2,
  Plus,
  Globe,
  Sparkles,
  CheckCircle2,
  Tag,
  Filter,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/super/media")({
  component: MediaLibraryAdmin,
});

export type MediaFile = {
  id: string;
  name: string;
  folder: string;
  category: string;
  url: string;
  size: string;
  date: string;
};

export type ClientLogoItem = {
  id: string;
  name: string;
  badge: string;
  logoUrl?: string;
};

const DEFAULT_CATEGORIES = ["Logos", "Client Logos", "Certificates", "Documents", "Banners", "General"];
const DEFAULT_FOLDERS = ["Client Logos", "Logos & Graphics", "Banners", "Addon Icons", "Legal Attachments"];

const DEFAULT_CLIENT_LOGOS: ClientLogoItem[] = [
  { id: "c1", name: "Apex Global Manufacturing", badge: "Manufacturing" },
  { id: "c2", name: "Nova Health System", badge: "Healthcare" },
  { id: "c3", name: "Zenith Retail Cloud", badge: "Retail & E-Com" },
  { id: "c4", name: "Horizon Logistics", badge: "Logistics" },
  { id: "c5", name: "Reliance Tech Digital", badge: "Enterprise" },
  { id: "c6", name: "Tata Communications", badge: "Telecommunications" },
];

function MediaLibraryAdmin() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"media" | "logos">("media");
  const [selectedFolder, setSelectedFolder] = useState<string>("All");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Folder Modal
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Upload Modal State (with Folder & Category Choice)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFolderChoice, setUploadFolderChoice] = useState<string>("Client Logos");
  const [uploadCategoryChoice, setUploadCategoryChoice] = useState<string>("Client Logos");
  const [selectedFileObj, setSelectedFileObj] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Logo Direct File Input for Client Logo
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // 1. REALTIME QUERY: Fetch media library from Supabase
  const { data: mediaData, isLoading, refetch } = useQuery({
    queryKey: ["realtime-media-library"],
    queryFn: async () => {
      const [mediaRes, logoRes] = await Promise.all([
        supabase.from("cms_pages").select("content").eq("slug", "system-media-library").maybeSingle(),
        supabase.from("cms_pages").select("content").eq("slug", "system-client-logos").maybeSingle(),
      ]);

      const mediaParsed = (mediaRes.data?.content as any) || {};
      const logoParsed = (logoRes.data?.content as any) || {};

      return {
        folders: (mediaParsed.folders ?? DEFAULT_FOLDERS) as string[],
        categories: (mediaParsed.categories ?? DEFAULT_CATEGORIES) as string[],
        files: (mediaParsed.files ?? []) as MediaFile[],
        clientLogos: (logoParsed.logos ?? DEFAULT_CLIENT_LOGOS) as ClientLogoItem[],
      };
    },
  });

  const folders = mediaData?.folders ?? DEFAULT_FOLDERS;
  const categories = mediaData?.categories ?? DEFAULT_CATEGORIES;
  const files = mediaData?.files ?? [];
  const clientLogos = mediaData?.clientLogos ?? DEFAULT_CLIENT_LOGOS;

  // 2. Save Media Library Mutation
  const saveMediaMutation = useMutation({
    mutationFn: async (updatedData: { folders?: string[]; categories?: string[]; files?: MediaFile[] }) => {
      const payload = {
        folders: updatedData.folders ?? folders,
        categories: updatedData.categories ?? categories,
        files: updatedData.files ?? files,
      };
      const { error } = await supabase.from("cms_pages").upsert(
        {
          slug: "system-media-library",
          title: "System Media Library",
          meta_description: "Realtime media assets, folders and category uploads",
          content: payload as any,
          published: true,
        },
        { onConflict: "slug" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["realtime-media-library"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // 3. Save Client Logos Mutation
  const saveLogosMutation = useMutation({
    mutationFn: async (updatedLogos: ClientLogoItem[]) => {
      const { error } = await supabase.from("cms_pages").upsert(
        {
          slug: "system-client-logos",
          title: "Enterprise Client Logos",
          meta_description: "Live homepage client logos and partner badges",
          content: { logos: updatedLogos } as any,
          published: true,
        },
        { onConflict: "slug" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Client logos updated in real-time on public homepage!");
      qc.invalidateQueries({ queryKey: ["realtime-media-library"] });
      qc.invalidateQueries({ queryKey: ["homepage-client-logos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleCopyPath(url: string) {
    navigator.clipboard.writeText(url);
    toast.success("Image URL path copied to clipboard!");
  }

  // Create Folder Handler
  function handleCreateFolder() {
    if (!newFolderName.trim()) return toast.error("Folder name required");
    const name = newFolderName.trim();
    if (folders.includes(name)) {
      return toast.error("Folder already exists");
    }
    saveMediaMutation.mutate({ folders: [...folders, name] });
    setNewFolderName("");
    setIsFolderModalOpen(false);
    toast.success(`Folder "${name}" created in real-time`);
  }

  // File Selected for Upload Modal
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
  function handleConfirmUpload() {
    if (!selectedFileObj || !previewUrl) return toast.error("Please select a file to upload");

    setIsUploading(true);
    try {
      const newMedia: MediaFile = {
        id: `m-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: selectedFileObj.name,
        folder: uploadFolderChoice || "Client Logos",
        category: uploadCategoryChoice || "Client Logos",
        url: previewUrl,
        size: `${Math.round(selectedFileObj.size / 1024)} KB`,
        date: new Date().toISOString().split("T")[0],
      };

      // Also automatically register into Client Logos if category is Client Logos or Logos
      if (uploadCategoryChoice === "Client Logos" || uploadFolderChoice === "Client Logos") {
        const logoItem: ClientLogoItem = {
          id: `logo-${Date.now()}`,
          name: selectedFileObj.name.replace(/\.[^/.]+$/, ""),
          badge: "Partner Logo",
          logoUrl: previewUrl,
        };
        saveLogosMutation.mutate([...clientLogos, logoItem]);
      }

      saveMediaMutation.mutate({ files: [newMedia, ...files] });
      toast.success(`Asset uploaded into folder "${uploadFolderChoice}" [${uploadCategoryChoice}]!`);
      setSelectedFileObj(null);
      setPreviewUrl(null);
      setIsUploadModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  // Simplified Direct Client Logo Image File Upload (No Client Name Required!)
  function handleDirectLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const filesArr = e.target.files;
    if (!filesArr || filesArr.length === 0) return;
    const file = filesArr[0];

    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      const logoName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

      const logoItem: ClientLogoItem = {
        id: `logo-${Date.now()}`,
        name: logoName,
        badge: "Client Logo",
        logoUrl: url,
      };

      // Also save to Media Files
      const mediaItem: MediaFile = {
        id: `m-${Date.now()}`,
        name: file.name,
        folder: "Client Logos",
        category: "Client Logos",
        url,
        size: `${Math.round(file.size / 1024)} KB`,
        date: new Date().toISOString().split("T")[0],
      };

      saveLogosMutation.mutate([...clientLogos, logoItem]);
      saveMediaMutation.mutate({ files: [mediaItem, ...files] });
      toast.success(`Client Logo "${file.name}" uploaded to live homepage logo carousel!`);
    };
    reader.readAsDataURL(file);
  }

  function handleDeleteFile(id: string) {
    const updatedFiles = files.filter((f) => f.id !== id);
    saveMediaMutation.mutate({ files: updatedFiles });
    toast.success("Media file deleted");
  }

  function handleDeleteClientLogo(id: string) {
    const updated = clientLogos.filter((l) => l.id !== id);
    saveLogosMutation.mutate(updated);
  }

  const filteredFiles = files.filter((f) => {
    const matchesFolder = selectedFolder === "All" || f.folder === selectedFolder;
    const matchesCategory = selectedCategory === "All" || f.category === selectedCategory;
    const matchesSearch = !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Media & Client Logos Hub</h1>
            <Badge variant="secondary" className="gap-1 text-xs font-mono">
              <ImageIcon className="size-3 text-primary" /> Realtime Assets Sync
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Create custom folders, choose asset categories, and upload client logos directly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsFolderModalOpen(true)} className="gap-1.5 text-xs">
            <FolderPlus className="size-4 text-primary" /> Create Folder
          </Button>

          <input
            type="file"
            ref={logoFileInputRef}
            accept="image/*"
            onChange={handleDirectLogoUpload}
            className="hidden"
          />
          <Button size="sm" onClick={() => logoFileInputRef.current?.click()} className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
            <Upload className="size-4" /> Upload Client Logo
          </Button>

          <Button size="sm" onClick={() => setIsUploadModalOpen(true)} className="gap-1.5 text-xs bg-primary">
            <Plus className="size-4" /> Upload File (Folder & Category)
          </Button>
        </div>
      </div>

      {/* Tabs: Media Manager vs Homepage Client Logos */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-2 w-[340px] mb-6">
          <TabsTrigger value="media" className="gap-2 text-xs">
            <ImageIcon className="size-4" /> Media Files ({files.length})
          </TabsTrigger>
          <TabsTrigger value="logos" className="gap-2 text-xs">
            <Building2 className="size-4" /> Homepage Client Logos ({clientLogos.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: MEDIA FILES MANAGER (Folders & Categories) */}
        <TabsContent value="media">
          {isLoading ? (
            <div className="py-20 grid place-items-center">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid lg:grid-cols-[250px_1fr] gap-6 items-start">
              {/* Folders Sidebar */}
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
                    <Folder className="size-3.5" /> All Media
                  </span>
                  <span className="font-mono text-[10px]">({files.length})</span>
                </button>

                {folders.map((f) => {
                  const count = files.filter((x) => x.folder === f).length;
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

              {/* Main Content Area */}
              <div className="space-y-4">
                {/* Search & Category Filter Pills */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border shadow-xs">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Search assets by filename..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
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

                {/* Media Grid */}
                {filteredFiles.length === 0 ? (
                  <Card className="p-12 text-center text-xs text-muted-foreground italic space-y-2">
                    <ImageIcon className="size-8 mx-auto opacity-30" />
                    <p>No image files found matching folder "{selectedFolder}" and category "{selectedCategory}".</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredFiles.map((file) => (
                      <Card key={file.id} className="group overflow-hidden hover:border-primary/50 transition-all flex flex-col justify-between">
                        <div className="aspect-video bg-secondary/30 relative flex items-center justify-center overflow-hidden">
                          <img src={file.url} alt={file.name} className="object-cover size-full group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button size="icon" variant="secondary" onClick={() => handleCopyPath(file.url)} title="Copy Image URL">
                              <Copy className="size-3.5" />
                            </Button>
                            <Button size="icon" variant="destructive" onClick={() => handleDeleteFile(file.id)} title="Delete Asset">
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                          <Badge variant="outline" className="absolute top-2 left-2 text-[9px] font-mono bg-background/80 backdrop-blur-xs">
                            {file.category || "General"}
                          </Badge>
                        </div>
                        <div className="p-3 space-y-1">
                          <div className="font-bold text-xs truncate" title={file.name}>{file.name}</div>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono pt-1 border-t">
                            <span className="truncate">{file.folder}</span>
                            <span className="shrink-0">{file.size}</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: HOMEPAGE CLIENT LOGOS STREAM */}
        <TabsContent value="logos">
          <Card className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Building2 className="size-5 text-primary" /> Live Homepage Client Logos
                </CardTitle>
                <CardDescription className="text-xs">
                  Upload client logos directly (no company name required). Logos render in real-time on the public landing page.
                </CardDescription>
              </div>

              <label>
                <input type="file" accept="image/*" onChange={handleDirectLogoUpload} className="hidden" />
                <Button asChild size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer">
                  <span>
                    <Upload className="size-4" /> Upload Client Logo
                  </span>
                </Button>
              </label>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {clientLogos.map((logo) => (
                <div key={logo.id} className="p-4 rounded-xl border bg-card flex items-center justify-between gap-3 group hover:border-primary/50 transition-all">
                  <div className="flex items-center gap-3">
                    {logo.logoUrl ? (
                      <img src={logo.logoUrl} alt={logo.name} className="size-10 object-contain rounded-lg border p-1 shrink-0 bg-background" />
                    ) : (
                      <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center font-bold text-sm font-mono shrink-0">
                        {logo.name[0]}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate" title={logo.name}>{logo.name}</div>
                      <Badge variant="secondary" className="text-[9px] font-mono mt-0.5">{logo.badge}</Badge>
                    </div>
                  </div>

                  <Button size="icon" variant="ghost" onClick={() => handleDeleteClientLogo(logo.id)} className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL 1: CREATE NEW FOLDER */}
      <Dialog open={isFolderModalOpen} onOpenChange={setIsFolderModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="size-5 text-primary" /> Create New Folder
            </DialogTitle>
            <DialogDescription className="text-xs">
              Create a custom folder directory to organize logos, banners, and documents.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Folder Name *</Label>
              <Input
                placeholder="e.g. Client Logos, Executive Photos, Banners"
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
              <Upload className="size-5 text-primary" /> Upload Asset File
            </DialogTitle>
            <DialogDescription className="text-xs">
              Choose an image file, destination folder, and category tag.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* File Input */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select File *</Label>
              <Input type="file" accept="image/*" onChange={handleFileSelected} className="text-xs" />
            </div>

            {/* Folder Selection */}
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

            {/* Category Selection */}
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

            {/* Image Preview */}
            {previewUrl && (
              <div className="p-2 border rounded-xl bg-secondary/30 text-center">
                <img src={previewUrl} alt="Preview" className="h-28 mx-auto object-contain rounded-lg" />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmUpload} disabled={isUploading || !selectedFileObj} className="bg-primary font-bold gap-2">
              {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Upload to Media
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
