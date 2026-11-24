'use client';

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { Image as ImageIcon, FileText, X, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface LifecycleDocumentFieldProps {
  label?: string;
  folder?: string;
  documentUrl: string;
  documentName?: string;
  onChange: (url: string, name: string) => void;
  placeholder?: string;
}

export function isImageFile(url?: string | null, name?: string | null): boolean {
  const target = (name || url || "").toLowerCase();
  return (
    target.startsWith("data:image/") ||
    /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/.test(target)
  );
}

export function LifecycleDocumentField({
  label = "Document",
  folder = "tenant/documents",
  documentUrl,
  documentName = "",
  onChange,
  placeholder = "Select document file...",
}: LifecycleDocumentFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const displayName =
    documentName ||
    (documentUrl
      ? documentUrl.startsWith("data:")
        ? "Uploaded image"
        : documentUrl.split("/").pop()?.split("?")[0] || documentUrl
      : "");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);
      formData.append("tags", "lifecycle,document");

      // Uses authenticated api.upload so file is stored in Server Local Storage (/uploads/...) AND Media Library (media_files)
      const data: any = await api.upload("/v1/media/upload", formData);
      const url = data?.url || data?.data?.url || data?.fileUrl || "";
      if (!url) {
        throw new Error("Server did not return a stored media URL.");
      }

      onChange(url, file.name);
      toast.success(`${file.name} uploaded and saved to Media Storage.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to upload file to server storage.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          readOnly
          value={displayName}
          placeholder={placeholder}
          className="flex-1 bg-background text-sm cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.xlsx,.csv,.txt"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 gap-1.5 h-9"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
          Browse
        </Button>
        {documentUrl && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onChange("", "")}
            className="shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive"
            title="Remove attachment"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {documentUrl && (
        <div className="mt-2">
          {isImageFile(documentUrl, displayName) ? (
            <a
              href={documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-lg border border-border/80 overflow-hidden bg-muted/20 hover:opacity-90 transition-opacity"
            >
              <img
                src={documentUrl}
                alt={displayName || "Attachment preview"}
                className="h-20 w-auto max-w-[180px] object-cover"
              />
            </a>
          ) : (
            <a
              href={documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-muted/60 transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              <span className="truncate max-w-[220px]">{displayName}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export function DocumentPreviewBlock({
  url,
  name,
  label = "Document",
}: {
  url?: string | null;
  name?: string | null;
  label?: string;
}) {
  if (!url) return null;
  const displayName =
    name ||
    (url.startsWith("data:") ? "Attached File" : url.split("/").pop()?.split("?")[0] || "View Document");

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <FileText className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      {isImageFile(url, displayName) ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl border border-border/80 overflow-hidden bg-muted/10 hover:opacity-95 transition-opacity max-w-sm"
        >
          <img
            src={url}
            alt={displayName}
            className="w-full max-h-48 object-contain bg-white"
          />
        </a>
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs font-medium text-primary hover:bg-muted/50 transition-colors"
        >
          <FileText className="h-4 w-4" />
          <span>{displayName}</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}
