"use client";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import {
  Upload,
  FolderOpen,
  Search,
  Check,
  FileIcon,
  FileText,
  Image as ImageIcon,
  Loader2,
  X,
  ExternalLink,
  AlertTriangle,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";

export interface AttachedFileItem {
  id: string;
  linkId?: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  url?: string;
  thumbnailKey?: string;
}

export interface UniversalFilePickerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelect: (file: AttachedFileItem) => void;
  onRemove?: (fileId: string) => void;
  selectedFile?: AttachedFileItem | null;
  moduleKey: string;
  pageKey: string;
  entityType?: string;
  entityId?: string;
  fieldKey?: string;
  allowedTypes?: string; // e.g. "image/*,application/pdf"
  maxSizeBytes?: number; // default 50 MB
  title?: string;
  trigger?: React.ReactNode;
  multiple?: boolean;
}

export function UniversalFilePicker({
  open,
  onOpenChange,
  onSelect,
  onRemove,
  selectedFile,
  moduleKey,
  pageKey,
  entityType,
  entityId,
  fieldKey = "attachment",
  allowedTypes = "*/*",
  maxSizeBytes = 50 * 1024 * 1024,
  title = "Attach File",
  trigger,
  multiple = false,
}: UniversalFilePickerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;

  const [activeTab, setActiveTab] = useState<"upload" | "explorer">("upload");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<AttachedFileItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isLinking, setIsLinking] = useState(false);
  const queryClient = useQueryClient();

  // Fetch selectable files for "From File Manager" tab
  const { data: selectableFiles = [], isLoading: isLoadingFiles } = useQuery<AttachedFileItem[]>({
    queryKey: ["file-picker-selectable", allowedTypes, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (allowedTypes && allowedTypes !== "*/*") params.append("accept", allowedTypes);
      if (searchQuery) params.append("search", searchQuery);
      if (maxSizeBytes) params.append("maxSize", String(maxSizeBytes));

      const res = await api.get(`/api/v1/files/picker/selectable?${params.toString()}`);
      return res.data?.files || [];
    },
    enabled: isOpen && activeTab === "explorer",
  });

  // Handle direct file upload in "Upload New" tab
  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > maxSizeBytes) {
      toast.error(`File size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds limit of ${(maxSizeBytes / 1024 / 1024).toFixed(0)} MB.`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);

    try {
      // 1. Ensure target system folder exists
      const ensureRes = await api.post("/api/v1/files/system-folders/ensure", {
        moduleKey,
        pageKey,
      });
      const targetFolderId = ensureRes.data?.targetFolderId;
      setUploadProgress(40);

      // 2. Upload file directly
      const formData = new FormData();
      formData.append("file", file);
      if (targetFolderId) formData.append("parentId", targetFolderId);
      formData.append("folder", `App Files/${moduleKey}/${pageKey}`);

      setUploadProgress(70);
      const uploadRes = await api.upload("/api/v1/files/uploads", formData);

      const uploadedNode = (uploadRes as any)?.node || uploadRes;
      setUploadProgress(90);

      // 3. Create FileLink if entity is specified
      let linkId: string | undefined;
      if (entityType && entityId) {
        const linkRes = await api.post("/api/v1/files/links", {
          fileId: uploadedNode.id,
          module: moduleKey,
          pageKey,
          entityType,
          entityId,
          fieldKey,
        });
        linkId = linkRes.data?.link?.id;
      }

      setUploadProgress(100);
      const attachedItem: AttachedFileItem = {
        id: uploadedNode.id,
        linkId,
        fileName: uploadedNode.fileName || file.name,
        fileSize: uploadedNode.fileSize || file.size,
        mimeType: uploadedNode.mimeType || file.type,
        url: uploadedNode.url,
      };

      onSelect(attachedItem);
      toast.success(`"${file.name}" uploaded and attached successfully.`);
      setOpen(false);
    } catch (err: any) {
      console.error("[FilePicker Upload Error]:", err);
      toast.error(err.response?.data?.error || err.message || "Failed to upload file.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (e.target) e.target.value = "";
    }
  };

  // Handle selecting an existing file in "From File Manager" tab
  const handleConfirmSelectExisting = async () => {
    if (!selectedCandidate) return;

    setIsLinking(true);
    try {
      let linkId: string | undefined;

      // Create FileLink to record zero-byte reference
      if (entityType && entityId) {
        const linkRes = await api.post("/api/v1/files/links", {
          fileId: selectedCandidate.id,
          module: moduleKey,
          pageKey,
          entityType,
          entityId,
          fieldKey,
        });
        linkId = linkRes.data?.link?.id;
      }

      onSelect({
        ...selectedCandidate,
        linkId,
      });

      toast.success(`Linked "${selectedCandidate.fileName}" to this record.`);
      setOpen(false);
      setSelectedCandidate(null);
    } catch (err: any) {
      console.error("[FilePicker Link Error]:", err);
      toast.error(err.response?.data?.error || err.message || "Failed to link existing file.");
    } finally {
      setIsLinking(false);
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes || isNaN(bytes)) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="w-full">
      {/* If file is already selected, display the attachment card */}
      {selectedFile ? (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-card/60 hover:bg-card transition-colors">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 rounded bg-primary/10 text-primary shrink-0">
              {selectedFile.mimeType?.startsWith("image/") ? (
                <ImageIcon className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate max-w-[280px]" title={selectedFile.fileName}>
                {selectedFile.fileName}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatSize(selectedFile.fileSize)}</span>
                <span>•</span>
                <span className="text-emerald-500 font-medium flex items-center gap-1">
                  <FileCheck className="w-3 h-3" /> Linked
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                window.open(`/tenant/files?focus=${selectedFile.id}`, "_blank");
              }}
              title="Open in File Manager"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              Open
            </Button>
            {onRemove && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                onClick={() => onRemove(selectedFile.id)}
                title="Remove attachment"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Remove
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* If no file attached, render Trigger or Default Upload Button */
        <Dialog open={isOpen} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            {trigger || (
              <Button type="button" variant="outline" className="w-full flex items-center justify-center gap-2 border-dashed h-20">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="text-sm font-medium">Click to upload or choose from File Manager</p>
                  <p className="text-xs text-muted-foreground">Max size: {(maxSizeBytes / 1024 / 1024).toFixed(0)} MB</p>
                </div>
              </Button>
            )}
          </DialogTrigger>

          <DialogContent className="max-w-2xl sm:max-w-2xl p-0 overflow-hidden">
            <DialogHeader className="p-5 pb-3 border-b">
              <DialogTitle className="text-base font-semibold flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-primary" />
                {title}
              </DialogTitle>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <div className="px-5 pt-3 border-b bg-muted/20">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload" className="text-xs font-medium">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload New
                  </TabsTrigger>
                  <TabsTrigger value="explorer" className="text-xs font-medium">
                    <FolderOpen className="w-4 h-4 mr-2" />
                    From File Manager
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* TAB 1: UPLOAD NEW */}
              <TabsContent value="upload" className="p-6 m-0 focus-visible:outline-none">
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl bg-card hover:bg-muted/10 transition-colors text-center relative">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-semibold mb-1">Choose a file from your computer</h4>
                  <p className="text-xs text-muted-foreground mb-4 max-w-sm">
                    Files will be organized automatically into{" "}
                    <span className="font-mono text-primary font-medium">App Files/{moduleKey}/{pageKey}</span>
                  </p>

                  {isUploading ? (
                    <div className="w-full max-w-xs space-y-2">
                      <div className="flex justify-between text-xs font-medium">
                        <span>Uploading directly to storage...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <Button type="button" variant="default" size="sm" asChild>
                        <span>Browse Files</span>
                      </Button>
                      <input
                        type="file"
                        className="hidden"
                        accept={allowedTypes}
                        onChange={handleDirectUpload}
                      />
                    </label>
                  )}
                </div>
              </TabsContent>

              {/* TAB 2: FROM FILE MANAGER */}
              <TabsContent value="explorer" className="p-5 m-0 space-y-4 focus-visible:outline-none">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Search your accessible files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                {/* Candidate Files List */}
                <div className="max-h-60 overflow-y-auto space-y-1.5 border rounded-lg p-2 bg-muted/10">
                  {isLoadingFiles ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      Loading files...
                    </div>
                  ) : selectableFiles.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      No matching accessible files found.
                    </div>
                  ) : (
                    selectableFiles.map((file) => {
                      const isSelected = selectedCandidate?.id === file.id;
                      return (
                        <div
                          key={file.id}
                          onClick={() => setSelectedCandidate(file)}
                          className={`flex items-center justify-between p-2.5 rounded-md cursor-pointer transition-colors text-xs ${
                            isSelected
                              ? "bg-primary/10 border border-primary/30 text-primary font-medium"
                              : "hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            {file.mimeType?.startsWith("image/") ? (
                              <ImageIcon className="w-4 h-4 text-sky-500 shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                            )}
                            <span className="truncate max-w-[320px]">{file.fileName}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-muted-foreground">{formatSize(file.fileSize)}</span>
                            {isSelected && <Check className="w-4 h-4 text-primary" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Privacy Warning Banner when an existing file is selected */}
                {selectedCandidate && (
                  <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                      <p className="font-semibold">Visibility & Permission Delegation Notice</p>
                      <p className="mt-0.5 opacity-90">
                        This file will become visible to anyone authorized to view this {entityType?.replace(/_/g, " ") || "record"}. A zero-byte link will be created without consuming extra quota.
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <DialogFooter className="p-4 border-t bg-muted/20 flex items-center justify-between">
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              {activeTab === "explorer" && (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={!selectedCandidate || isLinking}
                  onClick={handleConfirmSelectExisting}
                >
                  {isLinking ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Check className="w-4 h-4 mr-1.5" />}
                  Confirm Selection
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
