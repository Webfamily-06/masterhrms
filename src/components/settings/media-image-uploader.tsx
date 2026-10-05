import React, { useState, useRef } from "react";
import { Upload, X, Check, Loader2, Image as ImageIcon, Sun, Moon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { toast } from "sonner";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayUrl = localPreview || currentUrl;

  async function handleFileSelected(file: File) {
    if (!file) return;

    // 1. Instant local preview (0ms latency)
    const localUrl = URL.createObjectURL(file);
    setLocalPreview(localUrl);

    // 2. Perform multipart upload to /api/v1/media/upload
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

      toast.success(`${label} uploaded and registered in Media Library!`);
      onUploaded({
        id: res.id,
        url: res.url,
        fileName: res.fileName,
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image to Media Library");
      setLocalPreview(null);
    } finally {
      setIsUploading(false);
    }
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
          <h4 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
            <ImageIcon className="size-4 text-primary" />
            {label}
          </h4>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {currentMediaId && (hasCustomOverride ?? true) && (
          <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            <Check className="size-2.5" /> Media Library
          </Badge>
        )}
      </div>

      {/* Interactive Preview Container */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-3 min-h-[110px] flex items-center justify-center transition-all ${
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-border/80 hover:border-muted-foreground/40"
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
                <span className="text-xs font-medium">Uploading to Media Library...</span>
              </div>
            )}
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center py-3 text-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
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
      <div className="flex items-center justify-between gap-2 pt-1">
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

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs h-8"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Upload className="size-3.5 text-primary" />
          )}
          {displayUrl ? "Replace File" : "Choose File"}
        </Button>

        {displayUrl && onRemove && (canRemove ?? (hasCustomOverride ?? true)) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
            onClick={() => {
              setLocalPreview(null);
              onRemove();
            }}
          >
            <X className="size-3.5" /> Remove
          </Button>
        )}
      </div>
    </div>
  );
}
