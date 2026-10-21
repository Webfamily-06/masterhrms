import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { Image, Upload, Search, Check, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface MediaFileItem {
  id: string;
  originalName: string;
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  folder: string;
  tags: string[];
  createdAt: string;
}

interface MediaPickerModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelect: (file: MediaFileItem) => void;
  allowedTypes?: string[]; // e.g. ['image/*', 'application/pdf']
  trigger?: React.ReactNode;
  title?: string;
}

export function MediaPickerModal({
  open,
  onOpenChange,
  onSelect,
  allowedTypes,
  trigger,
  title = "Select Media Asset",
}: MediaPickerModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;

  const [search, setSearch] = useState("");
  const [selectedFile, setSelectedFile] = useState<MediaFileItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  // Fetch tenant media items
  const { data: mediaItems = [], isLoading } = useQuery<MediaFileItem[]>({
    queryKey: ["media-files", search],
    queryFn: async () => {
      const res = await api.get("/api/v1/media");
      return res.data || [];
    },
    enabled: isOpen,
  });

  // Filter items by search query and allowed mime types
  const filteredItems = mediaItems.filter((item) => {
    if (search && !item.originalName.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (allowedTypes && allowedTypes.length > 0) {
      const match = allowedTypes.some((type) => {
        if (type.endsWith("/*")) {
          const prefix = type.slice(0, -2);
          return item.mimeType.startsWith(prefix);
        }
        return item.mimeType === type;
      });
      if (!match) return false;
    }
    return true;
  });

  // Direct upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "general/picker");

    setIsUploading(true);
    try {
      const res = await api.upload("/api/v1/media/upload", formData);
      toast.success("File uploaded successfully");
      queryClient.invalidateQueries({ queryKey: ["media-files"] });
      setSelectedFile(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirm = () => {
    if (selectedFile) {
      onSelect(selectedFile);
      setOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Image className="h-4 w-4 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* Action bar: search and upload button */}
        <div className="flex items-center justify-between gap-3 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search media by filename..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <div>
            <label className="cursor-pointer">
              <Button size="sm" variant="outline" className="gap-2 h-9 text-xs" disabled={isUploading} asChild>
                <span>
                  {isUploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  Upload New
                </span>
              </Button>
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                accept={allowedTypes?.join(",")}
              />
            </label>
          </div>
        </div>

        {/* Media Grid */}
        <div className="flex-1 overflow-y-auto min-h-[300px] border rounded-lg p-3 bg-muted/20">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <FileText className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-xs">No media files found</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {filteredItems.map((item) => {
                const isSelected = selectedFile?.id === item.id;
                const isImg = item.mimeType.startsWith("image/");

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedFile(item)}
                    className={`group relative flex flex-col items-center rounded-lg border p-2 cursor-pointer transition-all hover:border-primary/80 ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="h-20 w-full rounded bg-muted/50 flex items-center justify-center overflow-hidden mb-2">
                      {isImg ? (
                        <img
                          src={item.url}
                          alt={item.originalName}
                          className="h-full w-full object-cover rounded"
                        />
                      ) : (
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-foreground truncate w-full text-center">
                      {item.originalName}
                    </span>
                    <span className="text-[9px] text-muted-foreground">
                      {(item.sizeBytes / 1024).toFixed(0)} KB
                    </span>
                    {isSelected && (
                      <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="pt-3 border-t flex items-center justify-between">
          <div className="text-xs text-muted-foreground truncate max-w-sm">
            {selectedFile ? `Selected: ${selectedFile.originalName}` : "No file selected"}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={!selectedFile} onClick={handleConfirm}>
              Select File
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
