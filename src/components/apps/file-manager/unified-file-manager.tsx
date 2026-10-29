"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { getSocketClient } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Folder,
  FolderPlus,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  Upload,
  Search,
  Star,
  Trash2,
  Share2,
  MoreVertical,
  List,
  Grid,
  Info,
  Download,
  Check,
  ChevronRight,
  RefreshCw,
  X,
  ExternalLink,
  AlertTriangle,
  Loader2,
  Eye,
  Copy,
  HardDrive,
  File,
  Move,
  Edit2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type FileManagerView = "list" | "grid";
export type FileCategory =
  | "All"
  | "Documents"
  | "Images"
  | "Videos"
  | "Audio"
  | "Archives"
  | "Starred"
  | "Trash";

export interface FileItem {
  id: string;
  tenantId: string | null;
  name: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  formattedSize: string;
  url: string;
  filePath: string;
  folder: string;
  isFolder: boolean;
  parentId: string | null;
  category: string;
  isStarred: boolean;
  tags: string[];
  uploadedBy: string | null;
  usageCount: number;
  usages?: Array<{ id: string; entityType: string; entityId: string; fieldKey: string }>;
  shares?: any[];
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StorageStats {
  totalFiles: number;
  totalFolders: number;
  totalSizeBytes: number;
  formattedTotalSize: string;
  quotaBytes: number;
  formattedQuota: string;
  percentUsed: number;
  categoryBreakdown: Record<string, number>;
}

export interface UnifiedFileManagerProps {
  initialView?: FileManagerView;
  role?: "hr" | "me" | "tenant" | "admin";
  baseRoute?: string;
}

export function UnifiedFileManager({
  initialView = "list",
  role = "hr",
  baseRoute = "/hr/files",
}: UnifiedFileManagerProps) {
  const qc = useQueryClient();
  const { user } = useSession();
  const profile = useCurrentProfile();

  // View state
  const [view, setView] = useState<FileManagerView>(initialView);
  const [category, setCategory] = useState<FileCategory>("All");
  const [currentFolder, setCurrentFolder] = useState<{ id: string; name: string } | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string | null; name: string }>>([
    { id: null, name: "All Files" },
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"updatedAt" | "name" | "size" | "type">("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Selection & Inspector
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);
  const [showInspector, setShowInspector] = useState(false);

  // Modal states
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<FileItem | null>(null);
  const [selectedDestinationFolder, setSelectedDestinationFolder] = useState<string>("root");

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<FileItem | null>(null);
  const [shareWithEmail, setShareWithEmail] = useState("");
  const [shareRole, setShareRole] = useState("all");
  const [shareAccessLevel, setShareAccessLevel] = useState("view");
  const [shareExpiryDays, setShareExpiryDays] = useState("30");

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<FileItem | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FileItem | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Storage Stats
  const { data: stats } = useQuery<StorageStats>({
    queryKey: ["files-stats"],
    queryFn: async () => {
      try {
        const res = await api.get("/v1/files/stats");
        return res;
      } catch (e) {
        console.warn("Could not fetch storage stats:", e);
        return {
          totalFiles: 0,
          totalFolders: 0,
          totalSizeBytes: 0,
          formattedTotalSize: "0 B",
          quotaBytes: 10 * 1024 * 1024 * 1024,
          formattedQuota: "10 GB",
          percentUsed: 0,
          categoryBreakdown: {},
        };
      }
    },
  });

  // 2. Fetch Files & Folders
  const {
    data: filesData,
    isLoading,
    refetch,
  } = useQuery<{ items: FileItem[]; pagination: any }>({
    queryKey: [
      "files-list",
      category,
      currentFolder?.id,
      searchQuery,
      sortBy,
      sortOrder,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      } else {
        if (category === "Starred") {
          params.append("starred", "true");
        } else if (category === "Trash") {
          params.append("trashed", "true");
        } else {
          if (category !== "All") {
            params.append("category", category);
          }
          if (currentFolder) {
            params.append("parentId", currentFolder.id);
          } else {
            params.append("parentId", "root");
          }
        }
      }
      params.append("sortBy", sortBy);
      params.append("sortOrder", sortOrder);
      params.append("limit", "100");

      const res = await api.get(`/v1/files?${params.toString()}`);
      return res || { items: [], pagination: {} };
    },
  });

  // 3. Fetch Folders for Move Dialog
  const { data: folderList = [] } = useQuery<FileItem[]>({
    queryKey: ["files-folders-list"],
    queryFn: async () => {
      try {
        const res = await api.get("/v1/files?category=Folders&limit=100");
        return (res?.items || []).filter((item: FileItem) => item.isFolder);
      } catch {
        return [];
      }
    },
    enabled: isMoveOpen,
  });

  // 4. Fetch Shares for Share Dialog
  const { data: activeShares = [], refetch: refetchShares } = useQuery<any[]>({
    queryKey: ["file-shares", shareTarget?.id],
    queryFn: async () => {
      if (!shareTarget?.id) return [];
      try {
        const res = await api.get(`/v1/files/${shareTarget.id}/shares`);
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    enabled: isShareOpen && !!shareTarget?.id,
  });

  // Real-time Socket.IO subscriptions
  useEffect(() => {
    const socket = getSocketClient();
    const handleMutation = (event: any) => {
      qc.invalidateQueries({ queryKey: ["files-list"] });
      qc.invalidateQueries({ queryKey: ["files-stats"] });
    };

    socket.on("file:created", handleMutation);
    socket.on("file:updated", handleMutation);
    socket.on("file:moved", handleMutation);
    socket.on("file:trashed", handleMutation);
    socket.on("file:restored", handleMutation);
    socket.on("file:shared", handleMutation);

    return () => {
      socket.off("file:created", handleMutation);
      socket.off("file:updated", handleMutation);
      socket.off("file:moved", handleMutation);
      socket.off("file:trashed", handleMutation);
      socket.off("file:restored", handleMutation);
      socket.off("file:shared", handleMutation);
    };
  }, [qc]);

  const items = filesData?.items || [];
  const folders = useMemo(() => items.filter((i) => i.isFolder), [items]);
  const regularFiles = useMemo(() => items.filter((i) => !i.isFolder), [items]);

  // Navigate into folder
  const handleOpenFolder = (folderItem: FileItem) => {
    setCurrentFolder({ id: folderItem.id, name: folderItem.fileName });
    setBreadcrumbs((prev) => [...prev, { id: folderItem.id, name: folderItem.fileName }]);
    setCategory("All");
    setSelectedItem(null);
  };

  // Breadcrumb navigation click
  const handleBreadcrumbClick = (index: number) => {
    const target = breadcrumbs[index];
    const newCrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newCrumbs);
    if (target.id === null) {
      setCurrentFolder(null);
    } else {
      setCurrentFolder({ id: target.id, name: target.name });
    }
    setSelectedItem(null);
  };

  // Create folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      return toast.error("Please enter a folder name.");
    }
    try {
      await api.post("/v1/files/folder", {
        name: newFolderName.trim(),
        parentId: currentFolder?.id || null,
      });
      toast.success(`Folder "${newFolderName.trim()}" created successfully!`);
      setIsNewFolderOpen(false);
      setNewFolderName("");
      qc.invalidateQueries({ queryKey: ["files-list"] });
      qc.invalidateQueries({ queryKey: ["files-stats"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to create folder.");
    }
  };

  // Upload file(s)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }
    if (currentFolder?.id) {
      formData.append("parentId", currentFolder.id);
    }
    if (category !== "All" && category !== "Starred" && category !== "Trash") {
      formData.append("category", category);
    }

    try {
      await api.upload("/v1/files/upload", formData);
      toast.success(`Successfully uploaded ${files.length} file(s)!`);
      qc.invalidateQueries({ queryKey: ["files-list"] });
      qc.invalidateQueries({ queryKey: ["files-stats"] });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload file(s).");
    } finally {
      setIsUploading(false);
    }
  };

  // Toggle star
  const handleToggleStar = async (item: FileItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.post(`/v1/files/${item.id}/star`);
      toast.success(res?.isStarred ? "Added to Starred" : "Removed from Starred");
      qc.invalidateQueries({ queryKey: ["files-list"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle star.");
    }
  };

  // Rename item
  const handleRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    try {
      await api.patch(`/v1/files/${renameTarget.id}/rename`, {
        newName: renameValue.trim(),
      });
      toast.success(`Renamed successfully to "${renameValue.trim()}".`);
      setIsRenameOpen(false);
      setRenameTarget(null);
      setRenameValue("");
      qc.invalidateQueries({ queryKey: ["files-list"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to rename.");
    }
  };

  // Move item
  const handleMove = async () => {
    if (!moveTarget) return;
    try {
      await api.patch(`/v1/files/${moveTarget.id}/move`, {
        targetParentId: selectedDestinationFolder === "root" ? null : selectedDestinationFolder,
      });
      toast.success(`Moved "${moveTarget.fileName}" successfully.`);
      setIsMoveOpen(false);
      setMoveTarget(null);
      qc.invalidateQueries({ queryKey: ["files-list"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to move item.");
    }
  };

  // Trash or restore item
  const handleTrashOrRestore = async (item: FileItem, restore = false) => {
    try {
      if (restore) {
        await api.post("/v1/files/restore", { ids: [item.id] });
        toast.success(`Restored "${item.fileName}".`);
      } else {
        await api.post("/v1/files/trash", { ids: [item.id] });
        toast.success(`Moved "${item.fileName}" to Trash.`);
      }
      setIsDeleteOpen(false);
      setDeleteTarget(null);
      if (selectedItem?.id === item.id) setSelectedItem(null);
      qc.invalidateQueries({ queryKey: ["files-list"] });
      qc.invalidateQueries({ queryKey: ["files-stats"] });
    } catch (err: any) {
      if (err.code === "MEDIA_IN_USE") {
        toast.error(`Cannot delete: this file is currently used in ${err.usages?.length || 1} place(s).`);
      } else {
        toast.error(err.message || "Operation failed.");
      }
    }
  };

  // Download item with signed URL
  const handleDownload = async (item: FileItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.get(`/v1/files/${item.id}/signed-url`);
      if (res?.signedUrl) {
        const link = document.createElement("a");
        link.href = res.signedUrl;
        link.setAttribute("download", item.fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        window.open(item.url, "_blank");
      }
    } catch {
      window.open(item.url, "_blank");
    }
  };

  // Add share
  const handleAddShare = async () => {
    if (!shareTarget) return;
    try {
      let expiresAt: string | null = null;
      if (shareExpiryDays !== "never") {
        const d = new Date();
        d.setDate(d.getDate() + parseInt(shareExpiryDays, 10));
        expiresAt = d.toISOString();
      }

      await api.post(`/v1/files/${shareTarget.id}/share`, {
        sharedWith: shareWithEmail.trim() || null,
        sharedRole: shareRole === "all" ? null : shareRole,
        accessLevel: shareAccessLevel,
        expiresAt,
      });

      toast.success("Share permission granted.");
      setShareWithEmail("");
      refetchShares();
    } catch (err: any) {
      toast.error(err.message || "Failed to share file.");
    }
  };

  // Revoke share
  const handleRevokeShare = async (shareId: string) => {
    if (!shareTarget) return;
    try {
      await api.delete(`/v1/files/${shareTarget.id}/share/${shareId}`);
      toast.success("Share access revoked.");
      refetchShares();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke share.");
    }
  };

  // Copy signed share link
  const handleCopyShareLink = async (item: FileItem) => {
    try {
      const res = await api.get(`/v1/files/${item.id}/signed-url?expiresIn=604800`); // 7 days
      if (res?.signedUrl) {
        const fullUrl = `${window.location.origin}${res.signedUrl}`;
        await navigator.clipboard.writeText(fullUrl);
        toast.success("Temporary 7-day share link copied to clipboard!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate share link.");
    }
  };

  // Get icon by category / mime
  const getItemIcon = (item: FileItem) => {
    if (item.isFolder) {
      return (
        <div className="size-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
          <Folder className="size-5 fill-amber-500/20" />
        </div>
      );
    }
    const cat = item.category || "Documents";
    switch (cat) {
      case "Images":
        return (
          <div className="size-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
            <ImageIcon className="size-5" />
          </div>
        );
      case "Videos":
        return (
          <div className="size-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0">
            <Video className="size-5" />
          </div>
        );
      case "Audio":
        return (
          <div className="size-10 rounded-xl bg-pink-100 dark:bg-pink-950/60 text-pink-600 flex items-center justify-center shrink-0">
            <Music className="size-5" />
          </div>
        );
      case "Archives":
        return (
          <div className="size-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center shrink-0">
            <Archive className="size-5" />
          </div>
        );
      case "Documents":
      default:
        if (item.mimeType.includes("pdf")) {
          return (
            <div className="size-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center shrink-0 font-bold text-xs">
              PDF
            </div>
          );
        }
        if (item.mimeType.includes("sheet") || item.mimeType.includes("excel") || item.fileName.endsWith(".csv")) {
          return (
            <div className="size-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs">
              XLS
            </div>
          );
        }
        return (
          <div className="size-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
            <FileText className="size-5" />
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] min-h-[600px] bg-background text-foreground">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border bg-card/60 backdrop-blur-sm">
        {/* Left: Breadcrumbs & Title */}
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <HardDrive className="size-4 text-primary shrink-0 mr-1" />
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.id || "root"}>
                {idx > 0 && <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />}
                <button
                  type="button"
                  onClick={() => handleBreadcrumbClick(idx)}
                  className={cn(
                    "px-2 py-1 rounded-md text-sm transition-colors",
                    idx === breadcrumbs.length - 1
                      ? "font-semibold text-foreground bg-accent/60"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                  )}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Right: Actions & View Toggle */}
        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative w-48 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search files & folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Sort Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 hidden sm:flex">
                <span>Sort</span>
                <ChevronRight className="size-3.5 rotate-90" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setSortBy("updatedAt"); setSortOrder("desc"); }}>
                Date Modified (Newest)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortBy("updatedAt"); setSortOrder("asc"); }}>
                Date Modified (Oldest)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortBy("name"); setSortOrder("asc"); }}>
                Name (A to Z)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortBy("name"); setSortOrder("desc"); }}>
                Name (Z to A)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortBy("size"); setSortOrder("desc"); }}>
                Size (Largest)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortBy("size"); setSortOrder("asc"); }}>
                Size (Smallest)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Mode Toggle */}
          <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/40">
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon"
              className="size-8"
              onClick={() => setView("list")}
              title="List View"
            >
              <List className="size-4" />
            </Button>
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="size-8"
              onClick={() => setView("grid")}
              title="Grid View"
            >
              <Grid className="size-4" />
            </Button>
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="icon"
            className="size-9"
            onClick={() => refetch()}
            title="Refresh"
          >
            <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
          </Button>

          {/* New Folder Button */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => setIsNewFolderOpen(true)}
          >
            <FolderPlus className="size-4 text-amber-500" />
            <span className="hidden md:inline">New Folder</span>
          </Button>

          {/* Upload Button */}
          <Button
            variant="default"
            size="sm"
            className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            <span>{isUploading ? "Uploading..." : "Upload"}</span>
          </Button>
        </div>
      </div>

      {/* Main Container: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Category Sidebar */}
        <aside className="w-56 border-r border-border bg-card/40 p-3 hidden md:flex flex-col justify-between shrink-0">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider">
              Categories
            </div>
            {(
              [
                { id: "All", label: "All Files", icon: HardDrive },
                { id: "Documents", label: "Documents", icon: FileText },
                { id: "Images", label: "Images", icon: ImageIcon },
                { id: "Videos", label: "Videos", icon: Video },
                { id: "Audio", label: "Audio", icon: Music },
                { id: "Archives", label: "Archives", icon: Archive },
                { id: "Starred", label: "Starred", icon: Star },
                { id: "Trash", label: "Trash", icon: Trash2 },
              ] as const
            ).map((cat) => {
              const Icon = cat.icon;
              const isActive = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategory(cat.id);
                    setCurrentFolder(null);
                    setBreadcrumbs([{ id: null, name: cat.label }]);
                    setSelectedItem(null);
                  }}
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={cn("size-4", cat.id === "Starred" && "text-amber-400")} />
                    <span>{cat.label}</span>
                  </div>
                  {cat.id === "Starred" && (
                    <span className="text-xs opacity-70">★</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Storage Quota Card */}
          {stats && (
            <div className="mt-4 p-3 rounded-xl border border-border/80 bg-accent/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Storage Quota</span>
                <span className="text-muted-foreground">{stats.percentUsed}% used</span>
              </div>
              <Progress value={stats.percentUsed} className="h-1.5" />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{stats.formattedTotalSize}</span>
                <span>{stats.formattedQuota}</span>
              </div>
              <div className="pt-1 border-t border-border/40 text-[10px] text-muted-foreground flex justify-between">
                <span>{stats.totalFiles} files</span>
                <span>{stats.totalFolders} folders</span>
              </div>
            </div>
          )}
        </aside>

        {/* Center: File List / Grid Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm">Loading workspace files...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-72 border-2 border-dashed border-border rounded-2xl p-6 text-center space-y-3 bg-card/20">
              <div className="size-14 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
                <FolderPlus className="size-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">
                  {searchQuery ? "No matching files found" : "No files or folders here"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {searchQuery
                    ? `No assets matched "${searchQuery}". Try a different keyword.`
                    : "Upload files or create folders to organize your workspace documents."}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsNewFolderOpen(true)}
                  className="gap-1.5"
                >
                  <FolderPlus className="size-4" />
                  New Folder
                </Button>
                <Button
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5"
                >
                  <Upload className="size-4" />
                  Upload Files
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Folders Section (if any) */}
              {folders.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>Folders ({folders.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {folders.map((folder) => (
                      <div
                        key={folder.id}
                        onDoubleClick={() => handleOpenFolder(folder)}
                        onClick={() => {
                          setSelectedItem(folder);
                          setShowInspector(true);
                        }}
                        className={cn(
                          "group relative flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-accent/40 transition-all cursor-pointer shadow-sm hover:shadow",
                          selectedItem?.id === folder.id && "border-primary ring-1 ring-primary bg-accent/30"
                        )}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          {getItemIcon(folder)}
                          <div className="truncate">
                            <div className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {folder.fileName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {folder.formattedSize}
                            </div>
                          </div>
                        </div>

                        {/* Folder Action Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenFolder(folder)}>
                              <Eye className="size-4 mr-2" /> Open Folder
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setRenameTarget(folder);
                                setRenameValue(folder.fileName);
                                setIsRenameOpen(true);
                              }}
                            >
                              <Edit2 className="size-4 mr-2" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setMoveTarget(folder);
                                setSelectedDestinationFolder("root");
                                setIsMoveOpen(true);
                              }}
                            >
                              <Move className="size-4 mr-2" /> Move
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                setDeleteTarget(folder);
                                setIsDeleteOpen(true);
                              }}
                            >
                              <Trash2 className="size-4 mr-2" /> Move to Trash
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Files Section */}
              {regularFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>Files ({regularFiles.length})</span>
                  </div>

                  {view === "grid" ? (
                    /* Grid View */
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {regularFiles.map((file) => (
                        <div
                          key={file.id}
                          onClick={() => {
                            setSelectedItem(file);
                            setShowInspector(true);
                          }}
                          onDoubleClick={() => {
                            setPreviewTarget(file);
                            setIsPreviewOpen(true);
                          }}
                          className={cn(
                            "group relative flex flex-col justify-between p-3 rounded-2xl border border-border bg-card hover:bg-accent/30 transition-all cursor-pointer shadow-sm hover:shadow",
                            selectedItem?.id === file.id && "border-primary ring-1 ring-primary bg-accent/20"
                          )}
                        >
                          {/* Card Top: Preview or Thumbnail */}
                          <div className="relative aspect-square w-full rounded-xl bg-muted/40 flex items-center justify-center overflow-hidden mb-2">
                            {file.category === "Images" && file.url ? (
                              <img
                                src={file.url}
                                alt={file.fileName}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                loading="lazy"
                              />
                            ) : (
                              <div className="scale-125">{getItemIcon(file)}</div>
                            )}

                            {/* Star badge on top-left */}
                            <button
                              type="button"
                              onClick={(e) => handleToggleStar(file, e)}
                              className={cn(
                                "absolute top-2 left-2 size-7 rounded-full flex items-center justify-center backdrop-blur-md transition-opacity",
                                file.isStarred
                                  ? "bg-amber-400 text-white opacity-100"
                                  : "bg-black/30 text-white/80 opacity-0 group-hover:opacity-100 hover:text-amber-400"
                              )}
                              title={file.isStarred ? "Starred" : "Star"}
                            >
                              <Star className={cn("size-3.5", file.isStarred && "fill-current")} />
                            </button>

                            {/* Usages badge on top-right */}
                            {file.usageCount > 0 && (
                              <Badge
                                variant="secondary"
                                className="absolute top-2 right-2 text-[10px] h-5 px-1.5 bg-background/80 backdrop-blur-md"
                              >
                                In Use
                              </Badge>
                            )}
                          </div>

                          {/* Card Bottom: File Info */}
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-foreground truncate" title={file.fileName}>
                              {file.fileName}
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>{file.formattedSize}</span>
                              <span>{new Date(file.updatedAt).toLocaleDateString()}</span>
                            </div>
                          </div>

                          {/* 3-dots Context Menu */}
                          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="size-7 bg-background/80 shadow-xs">
                                  <MoreVertical className="size-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setPreviewTarget(file); setIsPreviewOpen(true); }}>
                                  <Eye className="size-4 mr-2" /> Preview
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownload(file)}>
                                  <Download className="size-4 mr-2" /> Download
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleStar(file)}>
                                  <Star className={cn("size-4 mr-2", file.isStarred && "fill-amber-400 text-amber-400")} />
                                  {file.isStarred ? "Unstar" : "Star"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setShareTarget(file); setIsShareOpen(true); }}>
                                  <Share2 className="size-4 mr-2" /> Share
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setRenameTarget(file); setRenameValue(file.fileName); setIsRenameOpen(true); }}>
                                  <Edit2 className="size-4 mr-2" /> Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setMoveTarget(file); setSelectedDestinationFolder("root"); setIsMoveOpen(true); }}>
                                  <Move className="size-4 mr-2" /> Move
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {file.deletedAt ? (
                                  <DropdownMenuItem onClick={() => handleTrashOrRestore(file, true)}>
                                    <RotateCcw className="size-4 mr-2 text-emerald-600" /> Restore
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => { setDeleteTarget(file); setIsDeleteOpen(true); }}
                                  >
                                    <Trash2 className="size-4 mr-2" /> Move to Trash
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* List View */
                    <div className="border border-border rounded-2xl bg-card overflow-hidden shadow-xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              <th className="py-3 px-4 w-10"></th>
                              <th className="py-3 px-4">Name</th>
                              <th className="py-3 px-4 hidden sm:table-cell">Category</th>
                              <th className="py-3 px-4 hidden md:table-cell">Size</th>
                              <th className="py-3 px-4 hidden lg:table-cell">Modified</th>
                              <th className="py-3 px-4 hidden sm:table-cell">Status</th>
                              <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {regularFiles.map((file) => (
                              <tr
                                key={file.id}
                                onClick={() => {
                                  setSelectedItem(file);
                                  setShowInspector(true);
                                }}
                                onDoubleClick={() => {
                                  setPreviewTarget(file);
                                  setIsPreviewOpen(true);
                                }}
                                className={cn(
                                  "group hover:bg-accent/30 transition-colors cursor-pointer",
                                  selectedItem?.id === file.id && "bg-accent/40"
                                )}
                              >
                                {/* Star Column */}
                                <td className="py-3 px-4 w-10 text-center" onClick={(e) => handleToggleStar(file, e)}>
                                  <Star
                                    className={cn(
                                      "size-4 transition-colors cursor-pointer",
                                      file.isStarred
                                        ? "text-amber-400 fill-amber-400"
                                        : "text-muted-foreground/30 hover:text-amber-400"
                                    )}
                                  />
                                </td>

                                {/* Name Column */}
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-3">
                                    {getItemIcon(file)}
                                    <div className="truncate max-w-xs sm:max-w-sm font-medium text-foreground">
                                      <span className="truncate block">{file.fileName}</span>
                                    </div>
                                  </div>
                                </td>

                                {/* Category Column */}
                                <td className="py-3 px-4 hidden sm:table-cell text-muted-foreground">
                                  <Badge variant="outline" className="text-xs font-normal">
                                    {file.category || "Documents"}
                                  </Badge>
                                </td>

                                {/* Size Column */}
                                <td className="py-3 px-4 hidden md:table-cell text-muted-foreground font-mono text-xs">
                                  {file.formattedSize}
                                </td>

                                {/* Modified Column */}
                                <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground text-xs">
                                  {new Date(file.updatedAt).toLocaleDateString()}
                                </td>

                                {/* In-Use Badge Column */}
                                <td className="py-3 px-4 hidden sm:table-cell">
                                  {file.usageCount > 0 ? (
                                    <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary">
                                      In Use ({file.usageCount})
                                    </Badge>
                                  ) : (
                                    <span className="text-xs text-muted-foreground/60">—</span>
                                  )}
                                </td>

                                {/* Actions Column */}
                                <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-8"
                                      onClick={() => handleDownload(file)}
                                      title="Download"
                                    >
                                      <Download className="size-4 text-muted-foreground hover:text-foreground" />
                                    </Button>

                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="size-8">
                                          <MoreVertical className="size-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => { setPreviewTarget(file); setIsPreviewOpen(true); }}>
                                          <Eye className="size-4 mr-2" /> Preview
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDownload(file)}>
                                          <Download className="size-4 mr-2" /> Download
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => { setShareTarget(file); setIsShareOpen(true); }}>
                                          <Share2 className="size-4 mr-2" /> Share
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => { setRenameTarget(file); setRenameValue(file.fileName); setIsRenameOpen(true); }}>
                                          <Edit2 className="size-4 mr-2" /> Rename
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => { setMoveTarget(file); setSelectedDestinationFolder("root"); setIsMoveOpen(true); }}>
                                          <Move className="size-4 mr-2" /> Move
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        {file.deletedAt ? (
                                          <DropdownMenuItem onClick={() => handleTrashOrRestore(file, true)}>
                                            <RotateCcw className="size-4 mr-2 text-emerald-600" /> Restore
                                          </DropdownMenuItem>
                                        ) : (
                                          <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={() => { setDeleteTarget(file); setIsDeleteOpen(true); }}
                                          >
                                            <Trash2 className="size-4 mr-2" /> Move to Trash
                                          </DropdownMenuItem>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>

        {/* Right Details Inspector Drawer */}
        {showInspector && selectedItem && (
          <aside className="w-80 border-l border-border bg-card/60 p-5 flex flex-col justify-between shrink-0 overflow-y-auto">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">File Details</h4>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => setShowInspector(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>

              {/* Preview Thumbnail */}
              <div className="aspect-video w-full rounded-xl bg-muted/40 border border-border flex items-center justify-center overflow-hidden">
                {selectedItem.category === "Images" && selectedItem.url ? (
                  <img
                    src={selectedItem.url}
                    alt={selectedItem.fileName}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="scale-150">{getItemIcon(selectedItem)}</div>
                )}
              </div>

              {/* Metadata Details */}
              <div className="space-y-3 text-xs">
                <div>
                  <div className="text-muted-foreground font-medium mb-0.5">Name</div>
                  <div className="font-semibold text-foreground break-all">{selectedItem.fileName}</div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-muted-foreground font-medium mb-0.5">Type</div>
                    <div className="text-foreground">{selectedItem.mimeType || "Directory"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground font-medium mb-0.5">Size</div>
                    <div className="text-foreground font-mono">{selectedItem.formattedSize}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-muted-foreground font-medium mb-0.5">Category</div>
                    <div className="text-foreground">{selectedItem.category}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground font-medium mb-0.5">Modified</div>
                    <div className="text-foreground">{new Date(selectedItem.updatedAt).toLocaleDateString()}</div>
                  </div>
                </div>

                {/* Usages Section */}
                {selectedItem.usages && selectedItem.usages.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-accent/30 border border-border space-y-1.5">
                    <div className="font-semibold text-primary flex items-center gap-1.5">
                      <Check className="size-3.5" />
                      Active Usages ({selectedItem.usages.length})
                    </div>
                    <ul className="space-y-1 text-[11px] text-muted-foreground">
                      {selectedItem.usages.map((u, idx) => (
                        <li key={u.id || idx}>
                          • {u.entityType} ({u.fieldKey})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-border space-y-2">
              {!selectedItem.isFolder && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5"
                    onClick={() => {
                      setPreviewTarget(selectedItem);
                      setIsPreviewOpen(true);
                    }}
                  >
                    <Eye className="size-4" /> Preview
                  </Button>
                  <Button
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={() => handleDownload(selectedItem)}
                  >
                    <Download className="size-4" /> Download
                  </Button>
                </div>
              )}

              <Button
                size="sm"
                variant="ghost"
                className="w-full justify-start text-xs gap-2"
                onClick={() => handleCopyShareLink(selectedItem)}
              >
                <Copy className="size-3.5" /> Copy Signed Link
              </Button>
            </div>
          </aside>
        )}
      </div>

      {/* DIALOG: New Folder */}
      <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Create a folder inside {currentFolder ? `"${currentFolder.name}"` : "the root directory"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                placeholder="e.g. Employee Documents, Q4 Invoices"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewFolderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>Create Folder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Rename */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Item</DialogTitle>
            <DialogDescription>Enter a new name for "{renameTarget?.fileName}".</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="rename-input">New Name</Label>
              <Input
                id="rename-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRename()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Move */}
      <Dialog open={isMoveOpen} onOpenChange={setIsMoveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move Item</DialogTitle>
            <DialogDescription>
              Select destination folder for "{moveTarget?.fileName}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Destination</Label>
              <Select
                value={selectedDestinationFolder}
                onValueChange={setSelectedDestinationFolder}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">📁 Root / Top Level</SelectItem>
                  {folderList
                    .filter((f) => f.id !== moveTarget?.id)
                    .map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        📁 {f.fileName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMoveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMove}>Move Here</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Share */}
      <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Share File</DialogTitle>
            <DialogDescription>
              Grant access to "{shareTarget?.fileName}" for team members or external collaborators.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Quick Share Link */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-accent/30 border border-border">
              <div className="text-xs">
                <div className="font-semibold text-foreground">Time-limited Share Link</div>
                <div className="text-muted-foreground">7-day secure access token</div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => shareTarget && handleCopyShareLink(shareTarget)}
                className="gap-1.5"
              >
                <Copy className="size-3.5" /> Copy Link
              </Button>
            </div>

            {/* Grant Permission Form */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Grant Access
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="share-email" className="text-xs">User Email / ID (optional)</Label>
                  <Input
                    id="share-email"
                    placeholder="user@masterhrms.com"
                    value={shareWithEmail}
                    onChange={(e) => setShareWithEmail(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Role Scope</Label>
                  <Select value={shareRole} onValueChange={setShareRole}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Entire Workspace</SelectItem>
                      <SelectItem value="hr_admin">HR Administrators</SelectItem>
                      <SelectItem value="manager">Managers</SelectItem>
                      <SelectItem value="employee">Employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Access Level</Label>
                  <Select value={shareAccessLevel} onValueChange={setShareAccessLevel}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">View Only</SelectItem>
                      <SelectItem value="download">View & Download</SelectItem>
                      <SelectItem value="edit">Full Edit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Expiry</Label>
                  <Select value={shareExpiryDays} onValueChange={setShareExpiryDays}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 Days</SelectItem>
                      <SelectItem value="30">30 Days</SelectItem>
                      <SelectItem value="90">90 Days</SelectItem>
                      <SelectItem value="never">Never (Permanent)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button size="sm" onClick={handleAddShare} className="w-full mt-2">
                Grant Permission
              </Button>
            </div>

            {/* Active Shares List */}
            {activeShares.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Permissions ({activeShares.length})
                </div>
                <div className="max-h-36 overflow-y-auto space-y-2">
                  {activeShares.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-card border border-border text-xs"
                    >
                      <div>
                        <span className="font-medium text-foreground">
                          {s.sharedWith || s.sharedRole || "Workspace Members"}
                        </span>
                        <span className="text-muted-foreground ml-2">({s.accessLevel})</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => handleRevokeShare(s.id)}
                      >
                        Revoke
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShareOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-4">
          <DialogHeader className="pb-2 border-b border-border">
            <DialogTitle className="truncate text-base">{previewTarget?.fileName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto min-h-[300px]">
            {previewTarget?.category === "Images" && previewTarget.url ? (
              <img
                src={previewTarget.url}
                alt={previewTarget.fileName}
                className="max-h-[70vh] max-w-full rounded-lg object-contain"
              />
            ) : previewTarget?.category === "Videos" && previewTarget.url ? (
              <video controls className="max-h-[70vh] max-w-full rounded-lg">
                <source src={previewTarget.url} type={previewTarget.mimeType} />
                Your browser does not support HTML5 video.
              </video>
            ) : previewTarget?.category === "Audio" && previewTarget.url ? (
              <div className="p-6 rounded-2xl bg-card border border-border flex flex-col items-center gap-4">
                <Music className="size-12 text-primary" />
                <audio controls src={previewTarget.url} className="w-72" />
              </div>
            ) : previewTarget?.mimeType === "application/pdf" && previewTarget.url ? (
              <iframe
                src={previewTarget.url}
                className="w-full h-[65vh] rounded-lg border border-border"
                title={previewTarget.fileName}
              />
            ) : (
              <div className="text-center space-y-3 p-8">
                <div className="size-16 rounded-2xl bg-muted/60 mx-auto flex items-center justify-center">
                  <File className="size-8 text-muted-foreground" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">{previewTarget?.fileName}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Direct browser preview is not available for this file type.
                  </p>
                </div>
                <Button size="sm" onClick={() => previewTarget && handleDownload(previewTarget)}>
                  <Download className="size-4 mr-2" /> Download to View
                </Button>
              </div>
            )}
          </div>
          <DialogFooter className="pt-2 border-t border-border flex items-center justify-between sm:justify-between">
            <span className="text-xs text-muted-foreground">{previewTarget?.formattedSize}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => previewTarget && handleDownload(previewTarget)}
              >
                <Download className="size-4 mr-2" /> Download
              </Button>
              <Button size="sm" onClick={() => setIsPreviewOpen(false)}>
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Delete / Move to Trash Confirmation */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              Move to Trash
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to move "{deleteTarget?.fileName}" to Trash?
              {deleteTarget?.usageCount && deleteTarget.usageCount > 0 ? (
                <div className="mt-2 p-2 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold">
                  ⚠️ Warning: This file is currently linked to {deleteTarget.usageCount} active system record(s).
                </div>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && handleTrashOrRestore(deleteTarget, false)}
            >
              Move to Trash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
