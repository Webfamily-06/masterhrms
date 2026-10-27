import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Image as ImageIcon,
  Upload,
  Search,
  Check,
  FileText,
  Loader2,
  Folder,
  Eye,
  X,
  FileIcon,
} from "lucide-react";
import { toast } from "sonner";

export interface MediaFileItem {
  id: string;
  originalName?: string;
  fileName?: string;
  url: string;
  mimeType: string;
  sizeBytes?: number;
  fileSize?: number;
  folder?: string;
  tags?: string[];
  createdAt: string;
}

interface MediaPickerModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelect: (file: MediaFileItem) => void;
  allowedTypes?: string[]; // e.g. ['image/*', 'application/pdf']
  trigger?: React.ReactNode;
  title?: string;
  defaultFolder?: string;
}

export function MediaPickerModal({
  open,
  onOpenChange,
  onSelect,
  allowedTypes,
  trigger,
  title = "Select Media Asset",
  defaultFolder = "All",
}: MediaPickerModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;

  const [search, setSearch] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>(defaultFolder);
  const [selectedFile, setSelectedFile] = useState<MediaFileItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch tenant media items
  const { data: mediaItems = [], isLoading } = useQuery<MediaFileItem[]>({
    queryKey: ["media-files", selectedFolder],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedFolder && selectedFolder !== "All") {
        params.append("folder", selectedFolder);
      }
      const queryStr = params.toString() ? `?${params.toString()}` : "";
      const res = await api.get(`/api/v1/media${queryStr}`);
      return res.data || [];
    },
    enabled: isOpen,
  });

  // Extract distinct folders from loaded items and preset standard folders
  const folderList = useMemo(() => {
    const set = new Set<string>(["All", "Chat/Images", "Chat/Documents", "branding", "general"]);
    for (const item of mediaItems) {
      if (item.folder) set.add(item.folder);
    }
    return Array.from(set);
  }, [mediaItems]);

  // Filter items by search query, folder, and allowed mime types
  const filteredItems = useMemo(() => {
    return mediaItems.filter((item) => {
      const name = (item.fileName || item.originalName || "").toLowerCase();
      if (search && !name.includes(search.toLowerCase())) {
        return false;
      }
      if (selectedFolder && selectedFolder !== "All" && item.folder !== selectedFolder) {
        return false;
      }
      if (allowedTypes && allowedTypes.length > 0) {
        const match = allowedTypes.some((type) => {
          if (type.endsWith("/*")) {
            const prefix = type.slice(0, -2);
            return item.mimeType?.startsWith(prefix);
          }
          return item.mimeType === type;
        });
        if (!match) return false;
      }
      return true;
    });
  }, [mediaItems, search, selectedFolder, allowedTypes]);

  // Direct upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Determine target upload folder
    let targetFolder = selectedFolder !== "All" ? selectedFolder : "Chat/Images";
    if (file.type?.startsWith("image/")) {
      targetFolder = "Chat/Images";
    } else if (file.type?.startsWith("audio/")) {
      targetFolder = "Chat/Audio";
    } else if (file.type?.includes("pdf") || file.name.match(/\.(docx?|xlsx?|pptx?|pdf|txt|csv)$/i)) {
      targetFolder = "Chat/Documents";
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", targetFolder);

    setIsUploading(true);
    try {
      const res = await api.upload("/api/v1/media/upload", formData);
      toast.success("File uploaded to Media Library");
      queryClient.invalidateQueries({ queryKey: ["media-files"] });
      setSelectedFile(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || "Upload failed");
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
    <>
      <Dialog open={isOpen} onOpenChange={setOpen}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent
          className="max-w-4xl max-h-[85vh] flex flex-col p-6 font-sans"
          style={{ fontFamily: "var(--font-sans), 'Public Sans', sans-serif" }}
        >
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-teal-600" />
              {title}
            </DialogTitle>
          </DialogHeader>

          {/* Action bar: search, folder filter tabs, and upload button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 py-2 border-b">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search media by filename..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs font-sans"
              />
            </div>

            {/* Folder selection buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {folderList.map((folder) => {
                const isSelected = selectedFolder === folder;
                return (
                  <button
                    key={folder}
                    type="button"
                    onClick={() => setSelectedFolder(folder)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                      isSelected
                        ? "bg-teal-700 text-white"
                        : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Folder className="size-3" />
                    <span>{folder}</span>
                  </button>
                );
              })}
            </div>

            <div>
              <label className="cursor-pointer">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 h-9 text-xs font-sans border-teal-600/30 hover:border-teal-600 text-teal-800 dark:text-teal-400"
                  disabled={isUploading}
                  asChild
                >
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
          <div className="flex-1 overflow-y-auto min-h-[320px] max-h-[460px] border rounded-lg p-3 bg-muted/10 font-sans">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <FileText className="h-8 w-8 mb-2 opacity-40 text-teal-600" />
                <p className="text-xs">No media files found in folder</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">Upload an image or document above to populate</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredItems.map((item) => {
                  const isSelected = selectedFile?.id === item.id;
                  const isImg = item.mimeType?.startsWith("image/");
                  const isPdf = item.mimeType?.includes("pdf") || item.fileName?.endsWith(".pdf");
                  const displayName = item.fileName || item.originalName || "Asset";
                  const displaySize = item.fileSize || item.sizeBytes || 0;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedFile(item)}
                      className={`group relative flex flex-col items-center rounded-lg border p-2 cursor-pointer transition-all hover:border-teal-600/80 ${
                        isSelected
                          ? "border-teal-600 bg-teal-50/40 dark:bg-teal-950/20 ring-2 ring-teal-600/30"
                          : "border-border bg-card"
                      }`}
                    >
                      <div className="h-24 w-full rounded bg-muted/40 flex items-center justify-center overflow-hidden mb-2 relative">
                        {isImg ? (
                          <img
                            src={item.url}
                            alt={displayName}
                            className="h-full w-full object-cover rounded"
                          />
                        ) : isPdf ? (
                          <div className="flex flex-col items-center justify-center p-2 text-rose-600">
                            <FileText className="h-8 w-8" />
                            <span className="text-[10px] font-bold mt-1">PDF</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-2 text-teal-600">
                            <FileIcon className="h-8 w-8" />
                            <span className="text-[10px] font-bold mt-1">DOC</span>
                          </div>
                        )}

                        {/* Quick View Button for images */}
                        {isImg && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewModalUrl(item.url);
                            }}
                            className="absolute bottom-1 right-1 p-1 bg-black/60 hover:bg-black/80 text-white rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Preview image"
                          >
                            <Eye className="size-3" />
                          </button>
                        )}
                      </div>

                      <span className="text-[11px] font-medium text-foreground truncate w-full text-center" title={displayName}>
                        {displayName}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1 text-[9px] text-muted-foreground">
                        <span>{(displaySize / 1024).toFixed(0)} KB</span>
                        {item.folder && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[80px]">{item.folder}</span>
                          </>
                        )}
                      </div>

                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-xs">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer with Selected Item Details */}
          <DialogFooter className="pt-3 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-sans">
            <div className="text-xs text-muted-foreground truncate max-w-sm flex items-center gap-2">
              {selectedFile ? (
                <>
                  <span className="font-semibold text-foreground">Selected:</span>
                  <span className="truncate">{selectedFile.fileName || selectedFile.originalName}</span>
                  <Badge variant="outline" className="text-[10px] h-4">
                    {selectedFile.folder || "Media"}
                  </Badge>
                </>
              ) : (
                "Click an item above to select"
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!selectedFile}
                onClick={handleConfirm}
                className="bg-teal-700 hover:bg-teal-800 text-white"
              >
                Select Asset
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Internal Zoom Preview Lightbox for Media Picker */}
      {previewModalUrl && (
        <Dialog open={!!previewModalUrl} onOpenChange={() => setPreviewModalUrl(null)}>
          <DialogContent className="max-w-2xl p-2 bg-black/90 border-0 flex flex-col items-center justify-center">
            <img
              src={previewModalUrl}
              alt="Asset Preview"
              className="max-h-[75vh] w-auto object-contain rounded"
            />
            <div className="w-full flex justify-end p-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPreviewModalUrl(null)}
                className="text-xs"
              >
                Close Preview
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
