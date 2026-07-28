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
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/super/media")({
  component: MediaLibraryAdmin,
});

export type MediaFile = {
  id: string;
  name: string;
  folder: string;
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

const DEFAULT_FOLDERS = ["Banners", "Addon Icons", "Logos", "Logos & Graphics", "Legal Attachments"];

const DEFAULT_CLIENT_LOGOS: ClientLogoItem[] = [
  { id: "c1", name: "Apex Global Manufacturing", badge: "Manufacturing" },
  { id: "c2", name: "Nova Health System", badge: "Healthcare" },
  { id: "c3", name: "Zenith Retail Cloud", badge: "Retail & E-Com" },
  { id: "c4", name: "Horizon Logistics", badge: "Logistics" },
  { id: "c5", name: "Reliance Tech Digital", badge: "Enterprise" },
  { id: "c6", name: "Tata Communications", badge: "Telecommunications" },
  { id: "c7", name: "Mahindra Operations", badge: "Automotive" },
  { id: "c8", name: "Infosys Cloud Services", badge: "IT & Tech" },
];

function MediaLibraryAdmin() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"media" | "logos">("media");
  const [selectedFolder, setSelectedFolder] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Folder Dialog
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Client Logos Form Dialog
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientBadge, setNewClientBadge] = useState("Enterprise");

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
        files: (mediaParsed.files ?? []) as MediaFile[],
        clientLogos: (logoParsed.logos ?? DEFAULT_CLIENT_LOGOS) as ClientLogoItem[],
      };
    },
  });

  const folders = mediaData?.folders ?? DEFAULT_FOLDERS;
  const files = mediaData?.files ?? [];
  const clientLogos = mediaData?.clientLogos ?? DEFAULT_CLIENT_LOGOS;

  // 2. Save Media Library Mutation
  const saveMediaMutation = useMutation({
    mutationFn: async (updatedData: { folders?: string[]; files?: MediaFile[] }) => {
      const payload = {
        folders: updatedData.folders ?? folders,
        files: updatedData.files ?? files,
      };
      const { error } = await supabase.from("cms_pages").upsert({
        slug: "system-media-library",
        title: "System Media Library",
        meta_description: "Realtime media assets and PNG files",
        content: payload as any,
        published: true,
      }, { onConflict: "slug" });
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
      const { error } = await supabase.from("cms_pages").upsert({
        slug: "system-client-logos",
        title: "Enterprise Client Logos",
        meta_description: "Live homepage client logos and partner badges",
        content: { logos: updatedLogos } as any,
        published: true,
      }, { onConflict: "slug" });
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

  function handleCreateFolder() {
    if (!newFolderName) return;
    if (folders.includes(newFolderName)) {
      return toast.error("Folder already exists");
    }
    saveMediaMutation.mutate({ folders: [...folders, newFolderName] });
    setNewFolderName("");
    setIsFolderModalOpen(false);
    toast.success("Folder created in real-time");
  }

  function handleAddClientLogo() {
    if (!newClientName) return toast.error("Please enter client company name");
    const newLogo: ClientLogoItem = {
      id: `logo-${Date.now()}`,
      name: newClientName,
      badge: newClientBadge || "Enterprise",
    };
    saveLogosMutation.mutate([...clientLogos, newLogo]);
    setNewClientName("");
    setIsLogoModalOpen(false);
  }

  function handleDeleteClientLogo(id: string) {
    const updated = clientLogos.filter((l) => l.id !== id);
    saveLogosMutation.mutate(updated);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const uploaded = Array.from(e.target.files ?? []);
    if (uploaded.length === 0) return;

    uploaded.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        const newMedia: MediaFile = {
          id: `m-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: file.name,
          folder: selectedFolder === "All" ? "Banners" : selectedFolder,
          url,
          size: `${Math.round(file.size / 1024)} KB`,
          date: new Date().toISOString().split("T")[0],
        };
        saveMediaMutation.mutate({ files: [newMedia, ...files] });
      };
      reader.readAsDataURL(file);
    });
    toast.success(`Uploaded ${uploaded.length} image file(s)`);
  }

  function handleDeleteFile(id: string) {
    const updatedFiles = files.filter((f) => f.id !== id);
    saveMediaMutation.mutate({ files: updatedFiles });
    toast.success("Media file deleted");
  }

  const filteredFiles = files.filter((f) => {
    const matchesFolder = selectedFolder === "All" || f.folder === selectedFolder;
    const matchesSearch = !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Media & Client Logos Manager</h1>
            <Badge variant="secondary" className="gap-1 text-xs font-mono">
              <ImageIcon className="size-3 text-primary" /> Realtime Assets Sync
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Manage media uploads, PNG logos, and homepage enterprise client partner logos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="size-4" /> Refresh
          </Button>

          <Button size="sm" onClick={() => setIsLogoModalOpen(true)} className="gap-2 bg-primary">
            <Plus className="size-4" /> Add Client Logo
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-2 w-[320px] mb-6">
          <TabsTrigger value="media" className="gap-2 text-xs">
            <ImageIcon className="size-4" /> Media Files ({files.length})
          </TabsTrigger>
          <TabsTrigger value="logos" className="gap-2 text-xs">
            <Building2 className="size-4" /> Client Logos ({clientLogos.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: MEDIA FILES MANAGER */}
        <TabsContent value="media">
          {isLoading ? (
            <div className="py-20 grid place-items-center">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid lg:grid-cols-[240px_1fr] gap-6 items-start">
              {/* Folders Sidebar */}
              <Card className="p-3 border shadow-xs space-y-1">
                <div className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase border-b mb-1">Folders</div>
                <button
                  onClick={() => setSelectedFolder("All")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                    selectedFolder === "All" ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-secondary"
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
                        selectedFolder === f ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-secondary"
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Folder className="size-3.5" /> {f}
                      </span>
                      <span className="font-mono text-[10px]">({count})</span>
                    </button>
                  );
                })}
              </Card>

              {/* Media Files Grid */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Search image filename..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2 text-xs">
                      <Upload className="size-3.5" /> Upload Assets
                    </Button>
                  </div>
                </div>

                {filteredFiles.length === 0 ? (
                  <Card className="p-12 text-center text-xs text-muted-foreground">
                    No image files found in "{selectedFolder}". Click "Upload Assets" to add images.
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredFiles.map((file) => (
                      <Card key={file.id} className="group overflow-hidden hover:border-primary/50 transition-all">
                        <div className="aspect-video bg-secondary/30 relative flex items-center justify-center overflow-hidden">
                          <img src={file.url} alt={file.name} className="object-cover size-full group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button size="icon" variant="secondary" onClick={() => handleCopyPath(file.url)} title="Copy URL">
                              <Copy className="size-3.5" />
                            </Button>
                            <Button size="icon" variant="destructive" onClick={() => handleDeleteFile(file.id)} title="Delete">
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="p-3 space-y-1">
                          <div className="font-semibold text-xs truncate" title={file.name}>{file.name}</div>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                            <span>{file.size}</span>
                            <span>{file.date}</span>
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

        {/* TAB 2: CLIENT ENTERPRISE LOGOS MANAGER */}
        <TabsContent value="logos">
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Building2 className="size-5 text-primary" /> Enterprise Client Logos Stream
                </CardTitle>
                <CardDescription className="text-xs">
                  Logos managed here render in real-time on the public homepage client carousel.
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-xs text-emerald-600 bg-emerald-500/10 border-emerald-500/30">
                Live Homepage Sync
              </Badge>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {clientLogos.map((logo) => (
                <div key={logo.id} className="p-4 rounded-xl border bg-card flex items-center justify-between gap-3 group hover:border-primary/50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center font-bold text-sm font-mono">
                      {logo.name[0]}
                    </div>
                    <div>
                      <div className="font-bold text-xs line-clamp-1">{logo.name}</div>
                      <Badge variant="secondary" className="text-[9px] font-mono mt-0.5">{logo.badge}</Badge>
                    </div>
                  </div>

                  <Button size="icon" variant="ghost" onClick={() => handleDeleteClientLogo(logo.id)} className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Client Logo Modal */}
      <Dialog open={isLogoModalOpen} onOpenChange={setIsLogoModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Enterprise Client Partner Logo</DialogTitle>
            <DialogDescription>Add a new company name and partner badge to the homepage logo stream.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Client Company Name</Label>
              <Input
                placeholder="Apex Global Industries"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Industry / Partner Badge</Label>
              <Input
                placeholder="e.g. Manufacturing, FinTech, Enterprise"
                value={newClientBadge}
                onChange={(e) => setNewClientBadge(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLogoModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddClientLogo} className="bg-primary">Add Client Logo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
