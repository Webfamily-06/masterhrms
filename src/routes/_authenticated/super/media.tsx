import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Upload,
  Copy,
  Folder,
  Image as ImageIcon,
  FileText,
  Trash2,
  Search,
  RefreshCw,
  Loader2,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/super/media")({
  component: PlatformMediaGallery,
});

export interface MediaUsageItem {
  id: string;
  entityType: string;
  entityId: string;
  fieldKey: string;
}

export interface PlatformMediaFile {
  id: string;
  tenantId: string | null;
  storageDisk: string;
  filePath: string;
  url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  width?: number | null;
  height?: number | null;
  checksumSha: string;
  folder: string;
  tags: string[];
  uploadedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  usages: MediaUsageItem[];
}

const DEFAULT_FOLDERS = [
  "system/branding",
  "general",
  "marketing",
  "documents",
  "clients",
];

function PlatformMediaGallery() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("All");
  const [selectedType, setSelectedType] = useState<"ALL" | "IMAGE" | "DOCUMENT">("ALL");

  // Upload modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFolder, setUploadFolder] = useState("system/branding");
  const [uploadTags, setUploadTags] = useState("branding");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Deletion conflict modal states
  const [selectedFileForDelete, setSelectedFileForDelete] = useState<PlatformMediaFile | null>(null);
  const [inUseConflict, setInUseConflict] = useState<{
    file: PlatformMediaFile;
    usages: MediaUsageItem[];
    message: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Authoritative Platform Media Query from MySQL API
  const {
    data: mediaList = [],
    isLoading,
    refetch,
  } = useQuery<PlatformMediaFile[]>({
    queryKey: ["platform-canonical-media"],
    queryFn: async () => {
      try {
        const res = await api.get("/v1/media");
        return Array.isArray(res) ? res : [];
      } catch (err: any) {
        toast.error(err.message || "Failed to load platform media");
        return [];
      }
    },
  });

  // Extract distinct folders
  const availableFolders = useMemo(() => {
    const set = new Set<string>(DEFAULT_FOLDERS);
    for (const f of mediaList) {
      if (f.folder) set.add(f.folder);
    }
    return Array.from(set);
  }, [mediaList]);

  // Filter media files
  const filteredFiles = useMemo(() => {
    return mediaList.filter((f) => {
      const matchesSearch =
        !searchQuery ||
        f.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.folder.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.tags && f.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

      const matchesFolder =
        selectedFolder === "All" || f.folder === selectedFolder;

      const isImg = f.mimeType.startsWith("image/");
      const matchesType =
        selectedType === "ALL" ||
        (selectedType === "IMAGE" && isImg) ||
        (selectedType === "DOCUMENT" && !isImg);

      return matchesSearch && matchesFolder && matchesType;
    });
  }, [mediaList, searchQuery, selectedFolder, selectedType]);

  // File selected for upload
  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);
    } else {
      setPreviewUrl(null);
    }
  }

  // Confirm upload
  async function handleConfirmUpload() {
    if (!selectedFile) {
      return toast.error("Please select a file to upload");
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("folder", uploadFolder);
      formData.append("tags", uploadTags);

      await api.upload("/v1/media/upload", formData);

      toast.success(`Asset "${selectedFile.name}" registered in Platform Media Gallery!`);
      qc.invalidateQueries({ queryKey: ["platform-canonical-media"] });
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsUploadModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  }

  // Delete file handler
  async function handleDeleteFile(file: PlatformMediaFile, force = false) {
    setIsDeleting(true);
    try {
      await api.delete(`/v1/media/${file.id}${force ? "?force=true" : ""}`);
      toast.success(`Deleted "${file.fileName}" from Platform Media Gallery`);
      qc.invalidateQueries({ queryKey: ["platform-canonical-media"] });
      setSelectedFileForDelete(null);
      setInUseConflict(null);
    } catch (err: any) {
      if (err.status === 409 || err.code === "MEDIA_IN_USE" || err.response?.status === 409) {
        setInUseConflict({
          file,
          usages: file.usages || [],
          message: err.message || "This file is currently in use by active system settings.",
        });
      } else {
        toast.error(err.message || "Failed to delete file");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Platform Media Gallery
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Authoritative platform asset repository for system branding, documents, and global media.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-2"
          >
            <RefreshCw className="size-4" /> Refresh
          </Button>

          <Button
            onClick={() => {
              setSelectedFile(null);
              setPreviewUrl(null);
              setIsUploadModalOpen(true);
            }}
            className="gap-2 bg-primary"
          >
            <Upload className="size-4" /> Upload Asset
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl border bg-card/60">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search assets by name, folder or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedFolder} onValueChange={setSelectedFolder}>
            <SelectTrigger className="w-36 text-xs h-9">
              <SelectValue placeholder="Folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Folders</SelectItem>
              {availableFolders.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedType}
            onValueChange={(val: any) => setSelectedType(val)}
          >
            <SelectTrigger className="w-32 text-xs h-9">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="IMAGE">Images</SelectItem>
              <SelectItem value="DOCUMENT">Documents</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Media Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center p-16 text-muted-foreground gap-2">
          <Loader2 className="size-6 animate-spin text-primary" />
          <span className="text-sm font-medium">Loading platform media assets...</span>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="border border-dashed rounded-xl p-16 text-center text-muted-foreground">
          <Folder className="size-10 mx-auto mb-3 opacity-40 text-primary" />
          <h3 className="text-base font-semibold text-foreground">No media assets found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {searchQuery
              ? "No assets matched your search filter. Try clearing your search query."
              : "Upload platform assets like logos, favicons, or document templates to register them here."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsUploadModalOpen(true)}
            className="mt-4 gap-1.5 text-xs"
          >
            <Upload className="size-3.5" /> Upload First Asset
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredFiles.map((file) => {
            const isInUse = file.usages && file.usages.length > 0;
            const isImage = file.mimeType.startsWith("image/");

            return (
              <Card
                key={file.id}
                className="overflow-hidden border bg-card/60 transition-all hover:border-primary/40 hover:shadow-xs group flex flex-col justify-between"
              >
                <div>
                  <div className="h-36 bg-slate-100 dark:bg-slate-900 border-b flex items-center justify-center p-3 relative">
                    {isImage ? (
                      <img
                        src={file.url}
                        alt={file.fileName}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <FileText className="size-10 text-primary mb-1" />
                        <span className="text-[10px] font-mono uppercase">
                          {file.mimeType.split("/")[1] || "DOCUMENT"}
                        </span>
                      </div>
                    )}

                    {isInUse ? (
                      <Badge
                        variant="default"
                        className="absolute top-2 left-2 text-[10px] bg-emerald-600 gap-1 font-sans"
                      >
                        <CheckCircle className="size-2.5" /> In Use ({file.usages.length})
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="absolute top-2 left-2 text-[10px] font-sans opacity-70"
                      >
                        Unused
                      </Badge>
                    )}
                  </div>

                  <CardContent className="p-3 text-xs space-y-2">
                    <div>
                      <p
                        className="font-semibold truncate text-foreground text-sm"
                        title={file.fileName}
                      >
                        {file.fileName}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {(file.fileSize / 1024).toFixed(1)} KB • {file.folder}
                      </p>
                    </div>

                    {isInUse && (
                      <div className="p-2 rounded bg-muted/60 border text-[10px] space-y-0.5">
                        <span className="font-semibold text-primary block">Active Usages:</span>
                        {file.usages.map((u, i) => (
                          <div key={i} className="truncate text-muted-foreground">
                            • {u.fieldKey} ({u.entityType})
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </div>

                <div className="p-3 pt-0 border-t flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Copy URL"
                      aria-label="Copy URL"
                      className="size-7 p-0"
                      onClick={() => copyToClipboard(file.url, "URL")}
                    >
                      <Copy className="size-3.5" />
                    </Button>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="size-7 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="View File"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    title="Delete Media"
                    aria-label="Delete Media"
                    className="size-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (isInUse) {
                        setInUseConflict({
                          file,
                          usages: file.usages,
                          message: `File is actively used by ${file.usages.length} setting(s).`,
                        });
                      } else {
                        setSelectedFileForDelete(file);
                      }
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Platform Asset</DialogTitle>
            <DialogDescription>
              Upload media to the canonical platform storage repository.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Destination Folder</Label>
              <Select value={uploadFolder} onValueChange={setUploadFolder}>
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableFolders.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Tags (comma-separated)</Label>
              <Input
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                placeholder="branding, logo, vector"
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs">Select File</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,application/pdf"
                className="hidden"
                onChange={handleFileSelected}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                {previewUrl ? (
                  <div className="flex flex-col items-center">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-24 max-w-full object-contain mb-2"
                    />
                    <p className="text-xs font-medium text-foreground">
                      {selectedFile?.name}
                    </p>
                  </div>
                ) : selectedFile ? (
                  <div className="flex flex-col items-center">
                    <FileText className="size-10 text-primary mb-2" />
                    <p className="text-xs font-medium text-foreground">
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <Upload className="size-8 mb-2 opacity-50" />
                    <p className="text-xs font-medium text-foreground">
                      Click to choose file
                    </p>
                    <p className="text-[11px] mt-0.5">
                      PNG, JPG, WebP, SVG, ICO, or PDF (up to 10MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUploadModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!selectedFile || isUploading}
              onClick={handleConfirmUpload}
              className="gap-2"
            >
              {isUploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
              Upload Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={!!selectedFileForDelete}
        onOpenChange={(open) => !open && setSelectedFileForDelete(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Media File</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove &quot;{selectedFileForDelete?.fileName}&quot;?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedFileForDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={() => selectedFileForDelete && handleDeleteFile(selectedFileForDelete, false)}
            >
              {isDeleting ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deletion Conflict (MEDIA_IN_USE) Modal */}
      <Dialog
        open={!!inUseConflict}
        onOpenChange={(open) => !open && setInUseConflict(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="size-5" />
              Media File Is In Use
            </DialogTitle>
            <DialogDescription>
              This file cannot be deleted because it is actively referenced by system settings.
            </DialogDescription>
          </DialogHeader>

          {inUseConflict && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300">
                <p className="font-medium">{inUseConflict.message}</p>
              </div>

              <div>
                <p className="font-semibold text-foreground mb-1">Active References:</p>
                <div className="space-y-1 max-h-36 overflow-y-auto border rounded p-2 bg-muted/40 font-mono text-[11px]">
                  {inUseConflict.usages.map((u, i) => (
                    <div key={i} className="truncate">
                      • {u.fieldKey} ({u.entityType})
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInUseConflict(null)}
            >
              Close
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={() => inUseConflict && handleDeleteFile(inUseConflict.file, true)}
            >
              {isDeleting ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
              Force Delete Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
