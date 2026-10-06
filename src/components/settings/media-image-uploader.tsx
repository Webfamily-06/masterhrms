import React, { useState, useRef } from "react";
import { Upload, X, Loader2, Image as ImageIcon, Sun, Moon, Folder, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface MediaFileAsset {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  folder: string;
  createdAt: string;
}

interface MediaImageUploaderProps {
  label: string;
  description?: string;
  currentUrl?: string;
  currentMediaId?: string | null;
  folder?: string;
  previewBg?: "light" | "dark" | "checker";
  recommendedDims?: string;
  hasCustomOverride?: boolean;
  canRemove?: boolean;
  onUploaded: (media: { id: string; url: string; fileName: string }) => void;
  onRemove?: () => void;
}

export function MediaImageUploader({
  label,
  description,
  currentUrl,
  currentMediaId,
  folder = "system/branding",
  previewBg: initialBg = "light",
  recommendedDims = "SVG, PNG or WebP with transparent background",
  hasCustomOverride,
  canRemove,
  onUploaded,
  onRemove,
}: MediaImageUploaderProps) {
  const [previewBg, setPreviewBg] = useState<"light" | "dark" | "checker">(initialBg);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [gallerySearch, setGallerySearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryModalFileInputRef = useRef<HTMLInputElement>(null);

  const displayUrl = localPreview || currentUrl;

  // Query media gallery files on demand when dialog opens
  const { data: mediaAssets = [], isLoading: isLoadingGallery, refetch: refetchGallery } = useQuery<MediaFileAsset[]>({
    queryKey: ["media-selector-list"],
    queryFn: async () => {
      try {
        const res = await api.get("/v1/media");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    enabled: isGalleryOpen,
  });

  const filteredAssets = mediaAssets.filter((asset) => {
    if (!gallerySearch) return true;
    return asset.fileName.toLowerCase().includes(gallerySearch.toLowerCase()) ||
      asset.folder.toLowerCase().includes(gallerySearch.toLowerCase());
  });

  async function handleFileSelected(file: File) {
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setLocalPreview(localUrl);

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const res = await api.upload<{
        id: string;
        url: string;
        fileName: string;
      }>("/v1/media/upload", formData);

      toast.success(`${label} uploaded and selected`);
      onUploaded({
        id: res.id,
        url: res.url,
        fileName: res.fileName,
      });
      if (isGalleryOpen) {
        setIsGalleryOpen(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
      setLocalPreview(null);
    } finally {
      setIsUploading(false);
    }
  }

  function handleSelectFromGallery(asset: MediaFileAsset) {
    setLocalPreview(asset.url);
    onUploaded({
      id: asset.id,
      url: asset.url,
      fileName: asset.fileName,
    });
    setIsGalleryOpen(false);
    toast.success(`Selected "${asset.fileName}" from Media Gallery`);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelected(file);
  }

  return (
    <div className="space-y-3 p-4 rounded-xl border bg-card/60 transition-all hover:border-primary/40">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground">
            {label}
          </h4>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {currentMediaId && (
          <span className="text-[10px] font-mono text-muted-foreground">
            ID: {currentMediaId.substring(0, 8)}...
          </span>
        )}
      </div>

      {/* Interactive Preview Container */}
      <div
        className={`relative border rounded-lg p-3 min-h-[110px] flex items-center justify-center transition-all ${
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground/40"
        } ${
          previewBg === "dark"
            ? "bg-slate-950 text-slate-100"
            : previewBg === "checker"
            ? "bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%),linear-gradient(-45deg,#f1f5f9_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f1f5f9_75%),linear-gradient(-45deg,transparent_75%,#f1f5f9_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0]"
            : "bg-white text-slate-900"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        {displayUrl ? (
          <div className="relative group max-w-full flex items-center justify-center py-2">
            <img
              src={displayUrl}
              alt={label}
              className="max-h-16 max-w-[240px] object-contain transition-transform group-hover:scale-105"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center rounded gap-2">
                <Loader2 className="size-5 animate-spin text-primary" />
                <span className="text-xs font-medium">Uploading to Media Gallery...</span>
              </div>
            )}
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center py-3 text-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="size-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-2">
              <Upload className="size-4" />
            </div>
            <p className="text-xs font-medium text-foreground">Click to upload or drag & drop</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{recommendedDims}</p>
          </div>
        )}

        {/* Backdrop Switcher in corner */}
        {displayUrl && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/80 backdrop-blur-md rounded-md p-0.5 border shadow-xs">
            <button
              type="button"
              title="Light background"
              onClick={() => setPreviewBg("light")}
              className={`p-1 rounded ${previewBg === "light" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Sun className="size-3" />
            </button>
            <button
              type="button"
              title="Dark background"
              onClick={() => setPreviewBg("dark")}
              className={`p-1 rounded ${previewBg === "dark" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Moon className="size-3" />
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelected(file);
          }}
        />

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-8"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <Loader2 className="size-3.5 animate-spin mr-1.5" />
            ) : (
              <Upload className="size-3.5 mr-1.5" />
            )}
            {displayUrl ? "Upload & Replace" : "Upload Image"}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-8"
            onClick={() => setIsGalleryOpen(true)}
          >
            <Folder className="size-3.5 mr-1.5" />
            Select from Media Gallery
          </Button>
        </div>

        {displayUrl && onRemove && (canRemove ?? (hasCustomOverride ?? true)) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => {
              setLocalPreview(null);
              onRemove();
            }}
          >
            <X className="size-3.5 mr-1" /> Remove
          </Button>
        )}
      </div>

      {/* Restrained Media Gallery Selector Modal */}
      <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-6">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-base font-bold text-foreground flex items-center justify-between">
              <span>Select from Media Gallery</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Choose an existing authoritative MediaFile reference or upload a new file.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search assets by file name..."
                value={gallerySearch}
                onChange={(e) => setGallerySearch(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>
            <input
              ref={galleryModalFileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelected(file);
              }}
            />
            <Button
              type="button"
              size="sm"
              className="text-xs h-8"
              disabled={isUploading}
              onClick={() => galleryModalFileInputRef.current?.click()}
            >
              {isUploading ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Upload className="size-3.5 mr-1.5" />}
              Upload New
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[380px] pt-3 pr-1">
            {isLoadingGallery ? (
              <div className="flex items-center justify-center p-12 text-muted-foreground gap-2">
                <Loader2 className="size-5 animate-spin" />
                <span className="text-xs">Loading media assets...</span>
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="border border-dashed rounded-lg p-10 text-center text-muted-foreground">
                <p className="text-xs font-medium">No media assets found</p>
                <p className="text-[11px] mt-1">Upload a new file above to select it.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredAssets.map((asset) => {
                  const isSelected = currentMediaId === asset.id;
                  const isImage = asset.mimeType.startsWith("image/");
                  return (
                    <div
                      key={asset.id}
                      onClick={() => handleSelectFromGallery(asset)}
                      className={`group cursor-pointer rounded-lg border p-2 flex flex-col justify-between transition-all hover:border-primary/50 hover:bg-muted/30 ${
                        isSelected ? "border-primary ring-1 ring-primary bg-primary/5" : ""
                      }`}
                    >
                      <div className="h-24 rounded bg-muted/40 flex items-center justify-center overflow-hidden mb-2">
                        {isImage ? (
                          <img
                            src={asset.url}
                            alt={asset.fileName}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-xs font-mono font-bold text-muted-foreground">
                            PDF
                          </span>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium truncate text-foreground" title={asset.fileName}>
                          {asset.fileName}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {(asset.fileSize / 1024).toFixed(1)} KB • {asset.folder}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className="w-full text-[11px] h-7 mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectFromGallery(asset);
                        }}
                      >
                        {isSelected ? "Current" : "Select"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
