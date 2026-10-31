"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { getSocketClient } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  FolderOpen,
  FolderPlus,
  FolderUp,
  FolderInput,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileEdit,
  Image as ImageIcon,
  Film,
  Video,
  Music,
  Headphones,
  Archive,
  Upload,
  Search,
  Menu,
  Star,
  Trash2,
  Share2,
  MoreVertical,
  List as ListIcon,
  LayoutGrid,
  Table as TableIcon,
  Info,
  Download,
  Check,
  CheckSquare,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  RefreshCw,
  X,
  ExternalLink,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Eye,
  Copy,
  HardDrive,
  File,
  Move,
  Edit2,
  RotateCcw,
  PanelRight,
  ArrowUpDown,
  Home,
  Clock,
  CornerDownRight,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { ShareDialog } from "./share-dialog";
import { cn } from "@/lib/utils";

// Canonical MasterHRMS system font stack
const SYSTEM_FONT_STACK =
  "var(--font-sans), 'Public Sans', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

// Views supported by Windows 11 File Explorer
export type FileManagerView = "details" | "grid" | "list";

export type FileCategory =
  | "All"
  | "Documents"
  | "Images"
  | "Videos"
  | "Audio"
  | "Archives"
  | "Starred"
  | "Trash"
  | "Recent"
  | "Shared"
  | "Teams"
  | "Chat";

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
  lifecycleState?: "NORMAL" | "WARNING" | "CRITICAL" | "LOCKED";
  thresholdState?: "NORMAL" | "WARNING" | "CRITICAL" | "LOCKED";
  categoryBreakdown: Record<string, number>;
}

export interface UnifiedFileManagerProps {
  initialView?: FileManagerView;
  role?: "hr" | "me" | "tenant" | "admin" | "super";
  baseRoute?: string;
}

export function UnifiedFileManager({
  initialView = "details",
  role = "hr",
  baseRoute = "/hr/files",
}: UnifiedFileManagerProps) {
  const qc = useQueryClient();
  const { user } = useSession();
  const profile = useCurrentProfile();

  // Multi-View state with preference persistence
  const [view, setView] = useState<FileManagerView>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("master_hrms_file_view") as FileManagerView;
      if (saved === "details" || saved === "grid" || saved === "list") return saved;
    }
    return initialView || "details";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("master_hrms_file_view", view);
    }
  }, [view]);

  // Navigation & Category filter state
  const [category, setCategory] = useState<FileCategory>("All");
  const [currentFolder, setCurrentFolder] = useState<{ id: string; name: string } | null>(null);
  const [folderHistory, setFolderHistory] = useState<Array<{ id: string | null; name: string }>>([
    { id: null, name: role === "me" ? "My Files" : "Home" },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Search & Sorting state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"updatedAt" | "name" | "size" | "type">("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Selection state (Multi-Selection support)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [showInspector, setShowInspector] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: FileItem | null;
  } | null>(null);

  // Action Dialogs
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [moveTargets, setMoveTargets] = useState<FileItem[]>([]);
  const [selectedDestinationFolder, setSelectedDestinationFolder] = useState<string>("root");

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTargets, setDeleteTargets] = useState<FileItem[]>([]);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<FileItem | null>(null);
  const [isPermanentDeleteOpen, setIsPermanentDeleteOpen] = useState(false);
  const [permanentDeleteTargets, setPermanentDeleteTargets] = useState<FileItem[]>([]);
  const [isEmptyTrashConfirm, setIsEmptyTrashConfirm] = useState(false);

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<FileItem | null>(null);
  const [modalPreviewSignedUrl, setModalPreviewSignedUrl] = useState<string | null>(null);
  const [previewSignedUrl, setPreviewSignedUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Storage Stats
  const { data: stats } = useQuery<StorageStats>({
    queryKey: ["files-stats"],
    queryFn: async () => {
      try {
        const res = await api.get("/v1/files/stats");
        return res;
      } catch (e) {
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
      role,
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
        } else if (category === "Recent") {
          // Recent: sorted by date modified across root and folders
          params.append("limit", "50");
        } else if (category === "Shared") {
          params.append("view", "shared-with-me");
          params.append("category", "Shared");
        } else if (category === "Teams") {
          params.append("category", "Teams");
        } else if (category === "Chat") {
          params.append("category", "Chat");
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

      // Role scoped views
      if (role === "tenant") {
        params.append("view", "org");
      } else if (role === "me") {
        params.append("view", "my");
      }

      params.append("sortBy", sortBy);
      params.append("sortOrder", sortOrder);
      params.append("limit", "150");

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

  // Real-time Socket.IO subscriptions
  useEffect(() => {
    const socket = getSocketClient();
    const handleMutation = () => {
      qc.invalidateQueries({ queryKey: ["files-list"] });
      qc.invalidateQueries({ queryKey: ["files-stats"] });
    };

    socket.on("file:created", handleMutation);
    socket.on("file:updated", handleMutation);
    socket.on("file:moved", handleMutation);
    socket.on("file:trashed", handleMutation);
    socket.on("file:restored", handleMutation);
    socket.on("file:deleted", handleMutation);
    socket.on("file:acl:updated", handleMutation);
    socket.on("file:team:created", handleMutation);
    socket.on("file:team:updated", handleMutation);
    socket.on("file:team:deleted", handleMutation);
    socket.on("storage.usage.updated", handleMutation);

    return () => {
      socket.off("file:created", handleMutation);
      socket.off("file:updated", handleMutation);
      socket.off("file:moved", handleMutation);
      socket.off("file:trashed", handleMutation);
      socket.off("file:restored", handleMutation);
      socket.off("file:deleted", handleMutation);
      socket.off("file:acl:updated", handleMutation);
      socket.off("file:team:created", handleMutation);
      socket.off("file:team:updated", handleMutation);
      socket.off("file:team:deleted", handleMutation);
      socket.off("storage.usage.updated", handleMutation);
    };
  }, [qc]);

  const items = filesData?.items || [];
  const folders = useMemo(() => items.filter((i) => i.isFolder), [items]);
  const regularFiles = useMemo(() => items.filter((i) => !i.isFolder), [items]);

  // Derived Selection items
  const selectedItems = useMemo(() => {
    return items.filter((i) => selectedIds.has(i.id));
  }, [items, selectedIds]);

  const activeInspectorItem = useMemo(() => {
    if (selectedItems.length === 1) return selectedItems[0];
    if (lastSelectedId) return items.find((i) => i.id === lastSelectedId) || null;
    return null;
  }, [selectedItems, lastSelectedId, items]);

  // Close context menu on outside click or pointerdown
  useEffect(() => {
    const handleOutside = (e: MouseEvent | PointerEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleResize = () => setContextMenu(null);
    window.addEventListener("pointerdown", handleOutside);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("pointerdown", handleOutside);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Fetch signed preview URL for active inspector item
  useEffect(() => {
    let active = true;
    if (activeInspectorItem && !activeInspectorItem.isFolder && showInspector) {
      setIsLoadingPreview(true);
      api
        .get(`/v1/files/nodes/${activeInspectorItem.id}/preview`)
        .then((res) => {
          if (active && res?.signedUrl) {
            setPreviewSignedUrl(res.signedUrl);
          }
        })
        .catch(() => {
          if (active) setPreviewSignedUrl(activeInspectorItem.url || null);
        })
        .finally(() => {
          if (active) setIsLoadingPreview(false);
        });
    } else {
      setPreviewSignedUrl(null);
      setIsLoadingPreview(false);
    }
    return () => {
      active = false;
    };
  }, [activeInspectorItem, showInspector]);

  // Fetch signed preview URL for preview modal target
  useEffect(() => {
    let active = true;
    setModalPreviewSignedUrl(null);
    if (previewTarget && !previewTarget.isFolder && isPreviewModalOpen) {
      api
        .get(`/v1/files/nodes/${previewTarget.id}/preview`)
        .then((res) => {
          if (active && res?.signedUrl) {
            setModalPreviewSignedUrl(res.signedUrl);
          }
        })
        .catch(() => {
          if (active) setModalPreviewSignedUrl(previewTarget.url || null);
        });
    }
    return () => {
      active = false;
    };
  }, [previewTarget, isPreviewModalOpen]);

  // Keyboard navigation & Shortcuts (Ctrl+A, Delete, F2, Escape, Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      // Ctrl+A / Cmd+A: Select All
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelectedIds(new Set(items.map((i) => i.id)));
        return;
      }

      // Escape: Clear selection / close menus
      if (e.key === "Escape") {
        setSelectedIds(new Set());
        setContextMenu(null);
        return;
      }

      // Delete: Move selected to Recycle Bin, or Permanently Delete if inside Trash or Shift key pressed
      if (e.key === "Delete" && selectedIds.size > 0) {
        e.preventDefault();
        if (category === "Trash" || e.shiftKey) {
          setPermanentDeleteTargets(selectedItems);
          setIsEmptyTrashConfirm(false);
          setIsPermanentDeleteOpen(true);
        } else {
          setDeleteTargets(selectedItems);
          setIsDeleteOpen(true);
        }
        return;
      }

      // F2: Rename single selected item
      if (e.key === "F2" && selectedItems.length === 1) {
        e.preventDefault();
        const target = selectedItems[0];
        setRenameTarget(target);
        setRenameValue(target.fileName);
        setIsRenameOpen(true);
        return;
      }

      // Enter: Open single selected folder or preview single selected file
      if (e.key === "Enter" && selectedItems.length === 1) {
        e.preventDefault();
        const target = selectedItems[0];
        if (target.isFolder) {
          handleOpenFolder(target);
        } else {
          setPreviewTarget(target);
          setIsPreviewModalOpen(true);
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, selectedIds, selectedItems, category]);

  // Navigate into folder
  const handleOpenFolder = (folderItem: FileItem) => {
    const newEntry = { id: folderItem.id, name: folderItem.fileName };
    const nextHistory = folderHistory.slice(0, historyIndex + 1);
    nextHistory.push(newEntry);

    setFolderHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setCurrentFolder(newEntry);
    setCategory("All");
    setSelectedIds(new Set());
    setLastSelectedId(null);
  };

  // Navigate Up one folder level
  const handleNavigateUp = () => {
    if (historyIndex > 0) {
      const parent = folderHistory[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setCurrentFolder(parent.id ? { id: parent.id, name: parent.name } : null);
      setSelectedIds(new Set());
    } else if (currentFolder) {
      setCurrentFolder(null);
      setSelectedIds(new Set());
    }
  };

  // Back in history
  const handleHistoryBack = () => {
    if (historyIndex > 0) {
      const prev = folderHistory[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setCurrentFolder(prev.id ? { id: prev.id, name: prev.name } : null);
      setSelectedIds(new Set());
    }
  };

  // Forward in history
  const handleHistoryForward = () => {
    if (historyIndex < folderHistory.length - 1) {
      const next = folderHistory[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setCurrentFolder(next.id ? { id: next.id, name: next.name } : null);
      setSelectedIds(new Set());
    }
  };

  // Jump to specific breadcrumb segment
  const handleJumpToSegment = (index: number) => {
    const target = folderHistory[index];
    const nextHistory = folderHistory.slice(0, index + 1);
    setFolderHistory(nextHistory);
    setHistoryIndex(index);
    setCurrentFolder(target.id ? { id: target.id, name: target.name } : null);
    setSelectedIds(new Set());
  };

  // Multi-Selection handler (single, ctrl, shift)
  const handleSelectItem = (
    item: FileItem,
    e: React.MouseEvent,
    forceCheckbox = false
  ) => {
    e.stopPropagation();

    if (e.ctrlKey || e.metaKey || forceCheckbox) {
      // Toggle selection
      const next = new Set(selectedIds);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      setSelectedIds(next);
      setLastSelectedId(item.id);
    } else if (e.shiftKey && lastSelectedId) {
      // Range selection
      const itemIds = items.map((i) => i.id);
      const startIdx = itemIds.indexOf(lastSelectedId);
      const endIdx = itemIds.indexOf(item.id);
      if (startIdx !== -1 && endIdx !== -1) {
        const [low, high] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        const range = itemIds.slice(low, high + 1);
        setSelectedIds(new Set(range));
      }
    } else {
      // Single selection
      setSelectedIds(new Set([item.id]));
      setLastSelectedId(item.id);
    }
  };

  // Select all toggle
  const handleToggleSelectAll = (forceSelect?: boolean | "indeterminate") => {
    if (forceSelect === true) {
      setSelectedIds(new Set(items.map((i) => i.id)));
      return;
    }
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  // Right-click context menu with boundary safety
  const handleContextMenu = (e: React.MouseEvent, item: FileItem | null) => {
    e.preventDefault();
    e.stopPropagation();

    if (item && !selectedIds.has(item.id)) {
      setSelectedIds(new Set([item.id]));
      setLastSelectedId(item.id);
    }

    const menuWidth = 240;
    const menuHeight = item ? 360 : 280;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 12);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 12);

    setContextMenu({
      x: Math.max(12, x),
      y: Math.max(12, y),
      item,
    });
  };

  // Windows 11 Filename validation
  const validateWindowsName = (name: string): { isValid: boolean; error?: string } => {
    if (!name || !name.trim()) return { isValid: false, error: "Name cannot be empty." };
    if (/[\\/:*?"<>|]/.test(name)) {
      return { isValid: false, error: 'A file name cannot contain any of the following: \\ / : * ? " < > |' };
    }
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i.test(name.trim())) {
      return { isValid: false, error: `"${name}" is a reserved system device name.` };
    }
    if (name.endsWith(".") || name.endsWith(" ")) {
      return { isValid: false, error: "Name cannot end with a period or space." };
    }
    return { isValid: true };
  };

  // Create folder
  const handleCreateFolder = async () => {
    const val = validateWindowsName(newFolderName);
    if (!val.isValid) {
      return toast.error(val.error);
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

    // Validate filenames
    for (let i = 0; i < files.length; i++) {
      const v = validateWindowsName(files[i].name);
      if (!v.isValid) {
        return toast.error(`File "${files[i].name}": ${v.error}`);
      }
    }

    setIsUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
      formData.append("relativePaths", (files[i] as any).webkitRelativePath || files[i].name);
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
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || err.message || "Failed to upload file(s).";
      const isQuota = errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("exceeded") || errMsg.toLowerCase().includes("limit reached");
      if (isQuota) {
        toast.error(errMsg, { duration: 6000 });
      } else {
        toast.error(errMsg);
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (folderInputRef.current) folderInputRef.current.value = "";
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
    const val = validateWindowsName(renameValue.trim());
    if (!val.isValid) {
      return toast.error(val.error);
    }

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

  // Move items (single or batch)
  const handleMove = async () => {
    if (moveTargets.length === 0) return;
    try {
      const targetParentId = selectedDestinationFolder === "root" ? null : selectedDestinationFolder;
      for (const target of moveTargets) {
        await api.patch(`/v1/files/${target.id}/move`, { targetParentId });
      }
      toast.success(`Moved ${moveTargets.length} item(s) successfully.`);
      setIsMoveOpen(false);
      setMoveTargets([]);
      setSelectedIds(new Set());
      qc.invalidateQueries({ queryKey: ["files-list"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to move item(s).");
    }
  };

  // Batch Trash or Restore
  const handleBatchTrashOrRestore = async (restore = false, customTargets?: FileItem[]) => {
    const targets = customTargets && customTargets.length > 0 ? customTargets : (deleteTargets.length > 0 ? deleteTargets : selectedItems);
    if (targets.length === 0) return;

    try {
      const ids = targets.map((t) => t.id);
      if (restore) {
        await api.post("/v1/files/restore", { ids });
        toast.success(`Restored ${ids.length} item(s) from Recycle Bin.`);
      } else {
        await api.post("/v1/files/trash", { ids });
        toast.success(`Moved ${ids.length} item(s) to Recycle Bin.`);
      }
      setIsDeleteOpen(false);
      setDeleteTargets([]);
      setSelectedIds(new Set());
      qc.invalidateQueries({ queryKey: ["files-list"] });
      qc.invalidateQueries({ queryKey: ["files-stats"] });
    } catch (err: any) {
      if (err.code === "MEDIA_IN_USE") {
        toast.error(`Cannot delete: asset is actively used in ${err.usages?.length || 1} system record(s).`);
      } else {
        toast.error(err.message || "Operation failed.");
      }
    }
  };

  // Permanent Purge Delete (for Recycle Bin items or Empty Recycle Bin)
  const handlePermanentDelete = async () => {
    try {
      if (isEmptyTrashConfirm) {
        await api.post("/v1/files/purge", { emptyTrash: true });
        toast.success("Recycle Bin emptied successfully.");
      } else {
        const ids = permanentDeleteTargets.map((t) => t.id);
        if (ids.length === 0) return;
        await api.post("/v1/files/purge", { ids });
        toast.success(`Permanently deleted ${ids.length} item(s).`);
      }
      setIsPermanentDeleteOpen(false);
      setPermanentDeleteTargets([]);
      setIsEmptyTrashConfirm(false);
      setSelectedIds(new Set());
      qc.invalidateQueries({ queryKey: ["files-list"] });
      qc.invalidateQueries({ queryKey: ["files-stats"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to permanently delete item(s).");
    }
  };

  // Download item with authorized signed URL
  const handleDownload = async (item: FileItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.get(`/v1/files/nodes/${item.id}/download`);
      const downloadUrl = res?.signedUrl || item.url;
      if (downloadUrl) {
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.setAttribute("download", item.fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch {
      window.open(item.url, "_blank");
    }
  };

  // Copy signed link
  const handleCopySignedLink = async (item: FileItem) => {
    try {
      const res = await api.get(`/v1/files/nodes/${item.id}/download?expiresIn=604800`);
      const link = res?.signedUrl || item.url;
      if (link) {
        await navigator.clipboard.writeText(link);
        toast.success("Time-limited secure link copied to clipboard!");
      }
    } catch (err: any) {
      toast.error("Failed to generate link.");
    }
  };

  // Friendly type label
  const getFriendlyType = (item: FileItem) => {
    if (item.isFolder) return "File folder";
    const ext = item.fileName.split(".").pop()?.toUpperCase() || "";
    if (item.mimeType.includes("pdf")) return "PDF Document";
    if (item.mimeType.includes("image")) return `${ext || "PNG"} Image`;
    if (item.mimeType.includes("video")) return `${ext || "MP4"} Video`;
    if (item.mimeType.includes("audio")) return `${ext || "MP3"} Audio`;
    if (item.mimeType.includes("sheet") || item.mimeType.includes("excel") || ext === "CSV") return "Spreadsheet";
    if (item.mimeType.includes("zip") || item.mimeType.includes("tar") || ext === "ZIP") return "Compressed Archive";
    if (ext === "DOCX" || ext === "DOC" || item.mimeType.includes("word")) return "Microsoft Word Document";
    return `${ext} Document`;
  };

  // Icon generator for authentic Windows 11 Explorer look
  const getItemIcon = (item: FileItem, large = false) => {
    const imgSize = large ? "size-12 sm:size-14" : "size-5";
    const containerCls = large
      ? "size-16 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
      : "size-8 rounded-lg flex items-center justify-center shrink-0 transition-transform";

    if (item.isFolder) {
      return (
        <div className={cn(containerCls, "bg-primary/5")}>
          <img
            src="/FILE-MANAGER/Folder.ico"
            alt="Folder"
            className={cn("object-contain select-none pointer-events-none drop-shadow-xs", imgSize)}
            loading="lazy"
            draggable={false}
          />
        </div>
      );
    }

    const cat = item.category || "Documents";
    const mime = (item.mimeType || "").toLowerCase();
    const name = (item.fileName || "").toLowerCase();

    // Spreadsheets (Excel, CSV)
    if (
      mime.includes("sheet") ||
      mime.includes("excel") ||
      mime.includes("csv") ||
      name.endsWith(".xlsx") ||
      name.endsWith(".xls") ||
      name.endsWith(".csv")
    ) {
      return (
        <div className={cn(containerCls, "bg-emerald-500/5")}>
          <img
            src="/FILE-MANAGER/excel.svg"
            alt="Spreadsheet"
            className={cn("object-contain select-none pointer-events-none drop-shadow-xs", imgSize)}
            loading="lazy"
            draggable={false}
          />
        </div>
      );
    }

    // PDF Documents
    if (mime.includes("pdf") || name.endsWith(".pdf")) {
      return (
        <div className={cn(containerCls, "bg-rose-500/5")}>
          <img
            src="/FILE-MANAGER/pdf.svg"
            alt="PDF"
            className={cn("object-contain select-none pointer-events-none drop-shadow-xs", imgSize)}
            loading="lazy"
            draggable={false}
          />
        </div>
      );
    }

    // Word Documents (DOCX, DOC) & Office Documents
    if (
      mime.includes("word") ||
      mime.includes("officedocument.wordprocessingml") ||
      name.endsWith(".docx") ||
      name.endsWith(".doc") ||
      name.endsWith(".dotx") ||
      name.endsWith(".dot") ||
      name.endsWith(".odt")
    ) {
      return (
        <div className={cn(containerCls, "bg-blue-600/5")}>
          <img
            src="/FILE-MANAGER/docx_icon.svg"
            alt="Word Document"
            className={cn("object-contain select-none pointer-events-none drop-shadow-xs", imgSize)}
            loading="lazy"
            draggable={false}
          />
        </div>
      );
    }

    // Code & Script Files
    if (
      mime.includes("javascript") ||
      mime.includes("typescript") ||
      mime.includes("json") ||
      mime.includes("html") ||
      mime.includes("css") ||
      mime.includes("xml") ||
      mime.includes("sql") ||
      name.endsWith(".js") ||
      name.endsWith(".ts") ||
      name.endsWith(".tsx") ||
      name.endsWith(".jsx") ||
      name.endsWith(".json") ||
      name.endsWith(".html") ||
      name.endsWith(".css") ||
      name.endsWith(".sql") ||
      name.endsWith(".py") ||
      name.endsWith(".env") ||
      name.endsWith(".config")
    ) {
      return (
        <div className={cn(containerCls, "bg-primary/5")}>
          <img
            src="/FILE-MANAGER/config.ico"
            alt="Configuration"
            className={cn("object-contain select-none pointer-events-none drop-shadow-xs", imgSize)}
            loading="lazy"
            draggable={false}
          />
        </div>
      );
    }

    // Executable / Applications
    if (
      name.endsWith(".exe") ||
      name.endsWith(".msi") ||
      name.endsWith(".bat") ||
      name.endsWith(".cmd") ||
      name.endsWith(".sh") ||
      name.endsWith(".bin")
    ) {
      return (
        <div className={cn(containerCls, "bg-primary/5")}>
          <img
            src="/FILE-MANAGER/exe.ico"
            alt="Application"
            className={cn("object-contain select-none pointer-events-none drop-shadow-xs", imgSize)}
            loading="lazy"
            draggable={false}
          />
        </div>
      );
    }

    // Images
    if (cat === "Images" || mime.includes("image")) {
      return (
        <div className={cn(containerCls, "bg-sky-500/5")}>
          <img
            src="/FILE-MANAGER/Photos%20file.ico"
            alt="Image"
            className={cn("object-contain select-none pointer-events-none drop-shadow-xs", imgSize)}
            loading="lazy"
            draggable={false}
          />
        </div>
      );
    }

    // Videos
    if (cat === "Videos" || mime.includes("video")) {
      return (
        <div className={cn(containerCls, "bg-indigo-500/5")}>
          <img
            src="/FILE-MANAGER/Video%20file.ico"
            alt="Video"
            className={cn("object-contain select-none pointer-events-none drop-shadow-xs", imgSize)}
            loading="lazy"
            draggable={false}
          />
        </div>
      );
    }

    // Audio
    if (cat === "Audio" || mime.includes("audio")) {
      return (
        <div className={cn(containerCls, "bg-amber-500/5")}>
          <img
            src="/FILE-MANAGER/Audio%20file.ico"
            alt="Audio"
            className={cn("object-contain select-none pointer-events-none drop-shadow-xs", imgSize)}
            loading="lazy"
            draggable={false}
          />
        </div>
      );
    }

    // Archives / Compressed
    if (
      cat === "Archives" ||
      mime.includes("zip") ||
      mime.includes("compressed") ||
      mime.includes("tar") ||
      name.endsWith(".zip") ||
      name.endsWith(".rar") ||
      name.endsWith(".7z") ||
      name.endsWith(".tar") ||
      name.endsWith(".gz")
    ) {
      return (
        <div className={cn(containerCls, "bg-amber-500/5")}>
          <img
            src="/FILE-MANAGER/Zip.ico"
            alt="Archive"
            className={cn("object-contain select-none pointer-events-none drop-shadow-xs", imgSize)}
            loading="lazy"
            draggable={false}
          />
        </div>
      );
    }

    // General Documents
    if (cat === "Documents" || mime.includes("document")) {
      return (
        <div className={cn(containerCls, "bg-blue-600/5")}>
          <img
            src="/FILE-MANAGER/docx_icon.svg"
            alt="Document"
            className={cn("object-contain select-none pointer-events-none drop-shadow-xs", imgSize)}
            loading="lazy"
            draggable={false}
          />
        </div>
      );
    }

    // Text & Notes (.txt, .rtf, .md, .log)
    if (
      mime.includes("text") ||
      name.endsWith(".txt") ||
      name.endsWith(".rtf") ||
      name.endsWith(".md") ||
      name.endsWith(".log")
    ) {
      return (
        <div className={cn(containerCls, "bg-blue-500/5")}>
          <img
            src="/FILE-MANAGER/Notes.ico"
            alt="Text Document"
            className={cn("object-contain select-none pointer-events-none drop-shadow-xs", imgSize)}
            loading="lazy"
            draggable={false}
          />
        </div>
      );
    }

    // Fallback Generic File
    return (
      <div className={cn(containerCls, "bg-muted/40")}>
        <img
          src="/FILE-MANAGER/Blank.ico"
          alt="File"
          className={cn("object-contain select-none pointer-events-none drop-shadow-xs", imgSize)}
          loading="lazy"
          draggable={false}
        />
      </div>
    );
  };

  const renderSidebarContent = (onItemClick?: () => void) => (
    <>
      <div className="space-y-4">
        {/* Quick Access / System Navigation */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">
            <img src="/FILE-MANAGER/Quick%20Access.ico" alt="" className="size-3.5 object-contain shrink-0" draggable={false} />
            <span>Quick Access</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onItemClick?.();
              setCategory("All");
              setCurrentFolder(null);
              setFolderHistory([{ id: null, name: "Home" }]);
              setHistoryIndex(0);
              setSelectedIds(new Set());
            }}
            className={cn(
              "flex items-center gap-2.5 w-full px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors text-left",
              category === "All" && !currentFolder
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            )}
          >
            <img
              src="/FILE-MANAGER/Desktop.ico"
              alt="Home"
              className="size-4 object-contain shrink-0"
              draggable={false}
            />
            <span>Home</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onItemClick?.();
              setCategory("All");
              setCurrentFolder(null);
              setFolderHistory([{ id: null, name: "My Files" }]);
              setHistoryIndex(0);
              setSelectedIds(new Set());
            }}
            className={cn(
              "flex items-center gap-2.5 w-full px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors text-left",
              role === "me" && category === "All" && !currentFolder
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            )}
          >
            <img
              src="/FILE-MANAGER/Folder%20User.ico"
              alt="My Files"
              className="size-4 object-contain shrink-0"
              draggable={false}
            />
            <span>My Files</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onItemClick?.();
              setCategory("Recent");
              setCurrentFolder(null);
              setFolderHistory([{ id: null, name: "Recent" }]);
              setHistoryIndex(0);
              setSelectedIds(new Set());
            }}
            className={cn(
              "flex items-center gap-2.5 w-full px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors text-left",
              category === "Recent"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            )}
          >
            <img
              src="/FILE-MANAGER/Recent.ico"
              alt="Recent"
              className="size-4 object-contain shrink-0"
              draggable={false}
            />
            <span>Recent</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onItemClick?.();
              setCategory("Starred");
              setCurrentFolder(null);
              setFolderHistory([{ id: null, name: "Starred" }]);
              setHistoryIndex(0);
              setSelectedIds(new Set());
            }}
            className={cn(
              "flex items-center gap-2.5 w-full px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors text-left",
              category === "Starred"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            )}
          >
            <img
              src="/FILE-MANAGER/Folder%20Favourites.ico"
              alt="Starred"
              className="size-4 object-contain shrink-0"
              draggable={false}
            />
            <span>Starred</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onItemClick?.();
              setCategory("Shared");
              setCurrentFolder(null);
              setFolderHistory([{ id: null, name: "Shared with Me" }]);
              setHistoryIndex(0);
              setSelectedIds(new Set());
            }}
            className={cn(
              "flex items-center gap-2.5 w-full px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors text-left",
              category === "Shared"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            )}
          >
            <img
              src="/FILE-MANAGER/Folder%20Links.ico"
              alt="Shared with Me"
              className="size-4 object-contain shrink-0"
              draggable={false}
            />
            <span>Shared with Me</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onItemClick?.();
              setCategory("Teams");
              setCurrentFolder(null);
              setFolderHistory([{ id: null, name: "Team Folders" }]);
              setHistoryIndex(0);
              setSelectedIds(new Set());
            }}
            className={cn(
              "flex items-center gap-2.5 w-full px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors text-left",
              category === "Teams"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            )}
          >
            <img
              src="/FILE-MANAGER/Users.ico"
              alt="Team Folders"
              className="size-4 object-contain shrink-0"
              draggable={false}
            />
            <span>Team Folders</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onItemClick?.();
              setCategory("Chat");
              setCurrentFolder(null);
              setFolderHistory([{ id: null, name: "Chat Attachments" }]);
              setHistoryIndex(0);
              setSelectedIds(new Set());
            }}
            className={cn(
              "flex items-center gap-2.5 w-full px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors text-left",
              category === "Chat"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            )}
          >
            <img
              src="/FILE-MANAGER/Folder%20Shared.ico"
              alt="Chat Attachments"
              className="size-4 object-contain shrink-0"
              draggable={false}
            />
            <span>Chat Attachments</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onItemClick?.();
              setCategory("Trash");
              setCurrentFolder(null);
              setFolderHistory([{ id: null, name: "Recycle Bin" }]);
              setHistoryIndex(0);
              setSelectedIds(new Set());
            }}
            className={cn(
              "flex items-center gap-2.5 w-full px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors text-left",
              category === "Trash"
                ? "bg-destructive text-destructive-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            )}
          >
            <img
              src="/FILE-MANAGER/Trash%20Empty.ico"
              alt="Recycle Bin"
              className="size-4 object-contain shrink-0"
              draggable={false}
            />
            <span>Recycle Bin</span>
          </button>
        </div>

        {/* Categories Section */}
        <div className="space-y-0.5">
          <div className="text-[11px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">
            Categories
          </div>
          {(
            [
              { id: "Documents", label: "Documents", iconSrc: "/FILE-MANAGER/Folder%20Documents.ico" },
              { id: "Images", label: "Images", iconSrc: "/FILE-MANAGER/Folder%20Pictures.ico" },
              { id: "Videos", label: "Videos", iconSrc: "/FILE-MANAGER/Folder%20Videos.ico" },
              { id: "Audio", label: "Audio", iconSrc: "/FILE-MANAGER/Folder%20Music.ico" },
              { id: "Archives", label: "Archives", iconSrc: "/FILE-MANAGER/Zip.ico" },
            ] as const
          ).map((cat) => {
            const isActive = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  onItemClick?.();
                  setCategory(cat.id);
                  setCurrentFolder(null);
                  setFolderHistory([{ id: null, name: cat.label }]);
                  setHistoryIndex(0);
                  setSelectedIds(new Set());
                }}
                className={cn(
                  "flex items-center gap-2.5 w-full px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors text-left",
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                )}
              >
                <img
                  src={cat.iconSrc}
                  alt={cat.label}
                  className="size-4 object-contain shrink-0"
                  draggable={false}
                />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Storage Quota Meter */}
      {stats && (
        <div className="p-3 rounded-xl border border-border/80 bg-accent/20 space-y-2 mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">Storage</span>
            <div className="flex items-center gap-1.5">
              {stats.lifecycleState === "LOCKED" ? (
                <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 font-bold uppercase tracking-wider animate-pulse">
                  Locked
                </Badge>
              ) : stats.lifecycleState === "CRITICAL" ? (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-medium bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30">
                  Critical
                </Badge>
              ) : stats.lifecycleState === "WARNING" ? (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                  Warning
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-normal text-muted-foreground border-border/60">
                  Normal
                </Badge>
              )}
              <span className="text-muted-foreground font-mono">{stats.percentUsed}%</span>
            </div>
          </div>
          <Progress
            value={stats.percentUsed}
            className={cn(
              "h-1.5",
              stats.percentUsed >= 100
                ? "[&>div]:bg-destructive"
                : stats.percentUsed >= 90
                ? "[&>div]:bg-orange-500"
                : stats.percentUsed >= 80
                ? "[&>div]:bg-amber-500"
                : ""
            )}
          />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
            <span>{stats.formattedTotalSize}</span>
            <span>{stats.formattedQuota}</span>
          </div>
        </div>
      )}
    </>
  );

  const renderInspectorInner = () => {
    if (!activeInspectorItem) return null;
    return (
      <>
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/80">
            <div className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <img src="/FILE-MANAGER/Info.ico" alt="" className="size-3.5 object-contain shrink-0" draggable={false} />
              <span>Details Pane</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-foreground"
              onClick={() => setShowInspector(false)}
              title="Close details pane"
            >
              <X className="size-3.5" />
            </Button>
          </div>

          {/* Rich Preview Box */}
          <div className="aspect-video w-full rounded-xl bg-muted/40 border border-border/60 flex items-center justify-center overflow-hidden">
            {isLoadingPreview ? (
              <Loader2 className="size-6 animate-spin text-primary" />
            ) : activeInspectorItem.isFolder ? (
              <div className="scale-125">{getItemIcon(activeInspectorItem, true)}</div>
            ) : activeInspectorItem.category === "Images" && (previewSignedUrl || activeInspectorItem.url) ? (
              <img
                src={previewSignedUrl || activeInspectorItem.url}
                alt={activeInspectorItem.fileName}
                className="w-full h-full object-contain"
              />
            ) : activeInspectorItem.mimeType?.includes("video") && previewSignedUrl ? (
              <video controls src={previewSignedUrl} className="w-full h-full object-contain" />
            ) : activeInspectorItem.mimeType?.includes("audio") && previewSignedUrl ? (
              <audio controls src={previewSignedUrl} className="w-64" />
            ) : (
              <div className="scale-125">{getItemIcon(activeInspectorItem, true)}</div>
            )}
          </div>

          {/* Sanitized Metadata List */}
          <div className="space-y-2.5 text-xs">
            <div>
              <div className="text-[11px] font-medium text-muted-foreground">Name</div>
              <div className="font-semibold text-foreground break-all">{activeInspectorItem.fileName}</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[11px] font-medium text-muted-foreground">Type</div>
                <div className="text-foreground">{getFriendlyType(activeInspectorItem)}</div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-muted-foreground">Size</div>
                <div className="text-foreground font-mono">{activeInspectorItem.formattedSize}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[11px] font-medium text-muted-foreground">Category</div>
                <div className="text-foreground">{activeInspectorItem.category}</div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-muted-foreground">Modified</div>
                <div className="text-foreground">{new Date(activeInspectorItem.updatedAt).toLocaleDateString()}</div>
              </div>
            </div>

            {/* In-Use Usages Section */}
            {activeInspectorItem.usages && activeInspectorItem.usages.length > 0 && (
              <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                <div className="font-semibold text-primary flex items-center gap-1.5 text-xs">
                  <Check className="size-3.5" />
                  In Use ({activeInspectorItem.usages.length} reference{activeInspectorItem.usages.length > 1 ? "s" : ""})
                </div>
                <ul className="space-y-0.5 text-[11px] text-muted-foreground">
                  {activeInspectorItem.usages.map((u, idx) => (
                    <li key={u.id || idx}>
                      • {u.entityType} ({u.fieldKey})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions inside Inspector */}
        <div className="pt-3 border-t border-border/80 space-y-2">
          {category === "Trash" || activeInspectorItem.deletedAt ? (
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-1.5 h-8 text-xs text-primary hover:bg-primary/10"
                onClick={() => handleBatchTrashOrRestore(true, [activeInspectorItem])}
              >
                <RotateCcw className="size-3.5" /> Restore
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="w-full gap-1.5 h-8 text-xs"
                onClick={() => {
                  setPermanentDeleteTargets([activeInspectorItem]);
                  setIsEmptyTrashConfirm(false);
                  setIsPermanentDeleteOpen(true);
                }}
              >
                <Trash2 className="size-3.5" /> Delete Permanently
              </Button>
            </div>
          ) : (
            <>
              {!activeInspectorItem.isFolder && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5 h-8 text-xs"
                    onClick={() => {
                      setPreviewTarget(activeInspectorItem);
                      setIsPreviewModalOpen(true);
                    }}
                  >
                    <Eye className="size-3.5" /> Preview
                  </Button>
                  <Button
                    size="sm"
                    className="w-full gap-1.5 h-8 text-xs"
                    onClick={() => handleDownload(activeInspectorItem)}
                  >
                    <Download className="size-3.5" /> Download
                  </Button>
                </div>
              )}

              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start text-xs gap-2 h-8"
                onClick={() => {
                  setShareTarget(activeInspectorItem);
                  setIsShareOpen(true);
                }}
              >
                <Share2 className="size-3.5 text-primary" />
                <span>Manage Access & Share</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="w-full justify-start text-xs gap-2 h-8"
                onClick={() => handleCopySignedLink(activeInspectorItem)}
              >
                <img src="/FILE-MANAGER/Link.ico" alt="" className="size-3.5 object-contain shrink-0" draggable={false} />
                <span>Copy Secure Link</span>
              </Button>
            </>
          )}
        </div>
      </>
    );
  };

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => handleContextMenu(e, null)}
      style={{ fontFamily: SYSTEM_FONT_STACK }}
      className="flex flex-col h-[calc(100vh-74px)] min-h-[640px] bg-background text-foreground select-none font-sans overflow-hidden border border-border/80 rounded-xl shadow-xs"
    >
      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-ignore
        webkitdirectory="true"
        directory="true"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* ----------------------------------------------------------------------- */}
      {/* A. WINDOWS 11 COMMAND / RIBBON BAR                                      */}
      {/* ----------------------------------------------------------------------- */}
      <header
        style={{ fontFamily: SYSTEM_FONT_STACK }}
        className="flex flex-wrap items-center justify-between gap-1.5 px-3 py-1.5 border-b border-border/80 bg-card/75 backdrop-blur-md shrink-0 font-sans"
      >
        {role === "super" && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/25 text-xs font-semibold text-primary mr-2 shadow-2xs">
            <HardDrive className="size-3.5" />
            <span>Platform Media & Assets (Global Scope)</span>
          </div>
        )}
        <div className="flex items-center gap-1 overflow-x-auto">
          {category !== "Trash" ? (
            <>
              {/* New Button Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 gap-1.5 font-medium text-xs hover:bg-accent/60"
                  >
                    <img src="/FILE-MANAGER/Folder.ico" alt="" className="size-4 object-contain shrink-0" draggable={false} />
                    <span>New</span>
                    <ChevronRight className="size-3 rotate-90 opacity-60 ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  style={{ fontFamily: SYSTEM_FONT_STACK }}
                  className="w-48 text-xs font-sans"
                >
                  <DropdownMenuItem onClick={() => setIsNewFolderOpen(true)} className="gap-2">
                    <img src="/FILE-MANAGER/Folder.ico" alt="" className="size-4 object-contain shrink-0" draggable={false} /> Folder
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="gap-2">
                    <Upload className="size-4 text-primary" /> Upload Files
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => folderInputRef.current?.click()} className="gap-2">
                    <img src="/FILE-MANAGER/Folder%20Downloads.ico" alt="" className="size-4 object-contain shrink-0" draggable={false} /> Upload Folder
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="h-4 w-px bg-border/80 mx-1" />

              {/* Move to (active when items selected) */}
              <Button
                variant="ghost"
                size="sm"
                disabled={selectedIds.size === 0}
                onClick={() => {
                  setMoveTargets(selectedItems);
                  setSelectedDestinationFolder("root");
                  setIsMoveOpen(true);
                }}
                className="h-8 px-2.5 gap-1.5 font-medium text-xs hover:bg-accent/60 disabled:opacity-40"
                title="Move to folder"
              >
                <img src="/FILE-MANAGER/Folder%20Open.ico" alt="" className="size-3.5 object-contain shrink-0" draggable={false} />
                <span className="hidden sm:inline">Move</span>
              </Button>

              {/* Share Button (active when 1 item selected) */}
              <Button
                variant="ghost"
                size="sm"
                disabled={selectedItems.length !== 1}
                onClick={() => {
                  if (selectedItems.length === 1) {
                    setShareTarget(selectedItems[0]);
                    setIsShareOpen(true);
                  }
                }}
                className="h-8 px-2.5 gap-1.5 font-medium text-xs hover:bg-accent/60 disabled:opacity-40"
                title="Share with people, teams, or create public link"
              >
                <Share2 className="size-3.5 text-primary" />
                <span className="hidden sm:inline">Share</span>
              </Button>

              {/* Copy Link (active when 1 file selected) */}
              <Button
                variant="ghost"
                size="sm"
                disabled={selectedItems.length !== 1 || selectedItems[0]?.isFolder}
                onClick={() => selectedItems[0] && handleCopySignedLink(selectedItems[0])}
                className="h-8 px-2.5 gap-1.5 font-medium text-xs hover:bg-accent/60 disabled:opacity-40"
                title="Copy secure link"
              >
                <img src="/FILE-MANAGER/Link.ico" alt="" className="size-3.5 object-contain shrink-0" draggable={false} />
                <span className="hidden sm:inline">Copy link</span>
              </Button>

              {/* Rename (active when exactly 1 item selected, F2) */}
              <Button
                variant="ghost"
                size="sm"
                disabled={selectedItems.length !== 1}
                onClick={() => {
                  if (selectedItems.length === 1) {
                    setRenameTarget(selectedItems[0]);
                    setRenameValue(selectedItems[0].fileName);
                    setIsRenameOpen(true);
                  }
                }}
                className="h-8 px-2.5 gap-1.5 font-medium text-xs hover:bg-accent/60 disabled:opacity-40"
                title="Rename (F2)"
              >
                <img src="/FILE-MANAGER/Notes.ico" alt="" className="size-3.5 object-contain shrink-0" draggable={false} />
                <span className="hidden md:inline">Rename</span>
              </Button>

              {/* Recycle Bin / Delete Button */}
              <Button
                variant="ghost"
                size="sm"
                disabled={selectedIds.size === 0}
                onClick={() => {
                  setDeleteTargets(selectedItems);
                  setIsDeleteOpen(true);
                }}
                className="h-8 px-2.5 gap-1.5 font-medium text-xs text-destructive hover:bg-destructive/10 disabled:opacity-40"
                title="Move to Recycle Bin (Delete)"
              >
                <img src="/FILE-MANAGER/Trash%20Empty.ico" alt="" className="size-3.5 object-contain shrink-0" draggable={false} />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </>
          ) : (
            <>
              {/* Recycle Bin specific actions */}
              <Button
                variant="ghost"
                size="sm"
                disabled={selectedIds.size === 0}
                onClick={() => handleBatchTrashOrRestore(true, selectedItems)}
                className="h-8 px-2.5 gap-1.5 font-medium text-xs text-primary hover:bg-primary/10 disabled:opacity-40"
                title="Restore selected items"
              >
                <RotateCcw className="size-3.5" />
                <span>Restore selected ({selectedIds.size})</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={items.length === 0}
                onClick={() => handleBatchTrashOrRestore(true, items)}
                className="h-8 px-2.5 gap-1.5 font-medium text-xs hover:bg-accent/60 disabled:opacity-40"
                title="Restore all items in Recycle Bin"
              >
                <RotateCcw className="size-3.5" />
                <span className="hidden sm:inline">Restore all items</span>
              </Button>

              <div className="h-4 w-px bg-border/80 mx-1" />

              <Button
                variant="ghost"
                size="sm"
                disabled={selectedIds.size === 0}
                onClick={() => {
                  setPermanentDeleteTargets(selectedItems);
                  setIsEmptyTrashConfirm(false);
                  setIsPermanentDeleteOpen(true);
                }}
                className="h-8 px-2.5 gap-1.5 font-medium text-xs text-destructive hover:bg-destructive/10 disabled:opacity-40"
                title="Permanently delete selected items (Shift+Delete)"
              >
                <Trash2 className="size-3.5" />
                <span>Delete permanently</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={items.length === 0}
                onClick={() => {
                  setPermanentDeleteTargets([]);
                  setIsEmptyTrashConfirm(true);
                  setIsPermanentDeleteOpen(true);
                }}
                className="h-8 px-2.5 gap-1.5 font-medium text-xs text-destructive hover:bg-destructive/10 disabled:opacity-40"
                title="Permanently delete all items in Recycle Bin"
              >
                <img src="/FILE-MANAGER/Trash%20Empty.ico" alt="" className="size-3.5 object-contain shrink-0" draggable={false} />
                <span className="hidden sm:inline">Empty Recycle Bin</span>
              </Button>
            </>
          )}

          {/* Selection indicator pill */}
          {selectedIds.size > 0 && (
            <Badge variant="secondary" className="text-[11px] h-6 px-2 font-normal gap-1 bg-primary/10 text-primary border-primary/20">
              <span>{selectedIds.size} selected</span>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="hover:text-destructive ml-1"
                title="Clear selection"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
        </div>

        {/* Ribbon Right Actions: Sort, View Switcher, Preview Toggle, Refresh */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Sort Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-xs hover:bg-accent/60">
                <ArrowUpDown className="size-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">Sort</span>
                <ChevronRight className="size-3 rotate-90 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              style={{ fontFamily: SYSTEM_FONT_STACK }}
              className="w-44 text-xs font-sans"
            >
              <DropdownMenuItem onClick={() => { setSortBy("name"); setSortOrder("asc"); }}>
                Name (A to Z)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortBy("name"); setSortOrder("desc"); }}>
                Name (Z to A)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setSortBy("updatedAt"); setSortOrder("desc"); }}>
                Date modified (Newest)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortBy("updatedAt"); setSortOrder("asc"); }}>
                Date modified (Oldest)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setSortBy("size"); setSortOrder("desc"); }}>
                Size (Largest)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortBy("size"); setSortOrder("asc"); }}>
                Size (Smallest)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 1-Click Segmented View Mode Switcher (Hidden on narrow mobile screens) */}
          <div className="hidden sm:flex items-center bg-muted/60 p-0.5 rounded-md border border-border/50">
            <Button
              type="button"
              variant={view === "details" ? "secondary" : "ghost"}
              size="icon"
              className={cn("size-7 rounded-sm", view === "details" ? "bg-background text-primary shadow-xs font-medium" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setView("details")}
              title="Details View"
            >
              <TableIcon className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant={view === "grid" ? "secondary" : "ghost"}
              size="icon"
              className={cn("size-7 rounded-sm", view === "grid" ? "bg-background text-primary shadow-xs font-medium" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setView("grid")}
              title="Grid View"
            >
              <LayoutGrid className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon"
              className={cn("size-7 rounded-sm", view === "list" ? "bg-background text-primary shadow-xs font-medium" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setView("list")}
              title="List View"
            >
              <ListIcon className="size-3.5" />
            </Button>
          </div>

          {/* Multi-View Mode Switcher (Details, Grid, List) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-xs hover:bg-accent/60">
                {view === "details" && <TableIcon className="size-3.5 text-primary" />}
                {view === "grid" && <LayoutGrid className="size-3.5 text-primary" />}
                {view === "list" && <ListIcon className="size-3.5 text-primary" />}
                <span className="capitalize hidden sm:inline">{view}</span>
                <ChevronRight className="size-3 rotate-90 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              style={{ fontFamily: SYSTEM_FONT_STACK }}
              className="w-36 text-xs font-sans"
            >
              <DropdownMenuItem onClick={() => setView("details")} className="gap-2">
                <TableIcon className="size-4" /> Details
                {view === "details" && <Check className="size-3.5 ml-auto text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setView("grid")} className="gap-2">
                <LayoutGrid className="size-4" /> Grid / Tiles
                {view === "grid" && <Check className="size-3.5 ml-auto text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setView("list")} className="gap-2">
                <ListIcon className="size-4" /> Compact List
                {view === "list" && <Check className="size-3.5 ml-auto text-primary" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Toggle Details / Preview Pane */}
          <Button
            variant={showInspector ? "secondary" : "ghost"}
            size="icon"
            className="size-8"
            onClick={() => setShowInspector(!showInspector)}
            title="Toggle Details pane"
          >
            <img src="/FILE-MANAGER/Info.ico" alt="" className="size-4 object-contain shrink-0" draggable={false} />
          </Button>

          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => refetch()}
            title="Refresh (F5)"
          >
            {isLoading ? (
              <RefreshCw className="size-3.5 animate-spin" />
            ) : (
              <img src="/FILE-MANAGER/History.ico" alt="Refresh" className="size-3.5 object-contain shrink-0" draggable={false} />
            )}
          </Button>
        </div>
      </header>

      {/* ----------------------------------------------------------------------- */}
      {/* C. WINDOWS 11 BREADCRUMB / ADDRESS BAR & SEARCH                         */}
      {/* ----------------------------------------------------------------------- */}
      <div
        style={{ fontFamily: SYSTEM_FONT_STACK }}
        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 border-b border-border/60 bg-muted/20 text-xs font-sans"
      >
        {/* Mobile Navigation Drawer Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden size-7 rounded-md shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => setMobileNavOpen(true)}
          title="Open Navigation Menu"
        >
          <Menu className="size-4" />
        </Button>

        {/* Navigation History Buttons */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 rounded-md"
            disabled={historyIndex <= 0}
            onClick={handleHistoryBack}
            title="Back (Alt+Left)"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 rounded-md"
            disabled={historyIndex >= folderHistory.length - 1}
            onClick={handleHistoryForward}
            title="Forward (Alt+Right)"
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 rounded-md hidden xs:inline-flex"
            disabled={!currentFolder}
            onClick={handleNavigateUp}
            title="Up to parent folder (Alt+Up)"
          >
            <ChevronUp className="size-4" />
          </Button>
        </div>

        {/* Windows 11 Breadcrumbs Address Bar Container */}
        <div className="flex-1 flex items-center h-8 px-2 rounded-lg border border-border/80 bg-background/60 shadow-2xs overflow-hidden min-w-0">
          <img
            src="/FILE-MANAGER/Drives/Hardrive.ico"
            alt="Drive"
            className="size-3.5 object-contain shrink-0 mr-1.5"
            draggable={false}
          />
          <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-none py-0.5 min-w-0">
            {folderHistory.map((seg, idx) => (
              <React.Fragment key={seg.id || "root"}>
                {idx > 0 && <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />}
                <button
                  type="button"
                  onClick={() => handleJumpToSegment(idx)}
                  className={cn(
                    "px-1.5 py-0.5 rounded text-xs transition-colors",
                    idx === historyIndex
                      ? "font-semibold text-primary bg-primary/10 border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                  )}
                >
                  {seg.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Search Box on Right */}
        <div className="relative w-28 sm:w-48 md:w-60 shrink-0 transition-all focus-within:w-40 sm:focus-within:w-60">
          <img
            src="/FILE-MANAGER/Search.ico"
            alt=""
            className="absolute left-2.5 top-2.5 size-3.5 object-contain pointer-events-none"
            draggable={false}
          />
          <Input
            type="text"
            placeholder={`Search ${currentFolder ? currentFolder.name : "files"}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-7 h-8 text-xs bg-background/60"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* MAIN EXPLORER BODY: SIDEBAR + CONTENT VIEW + DETAILS PANE               */}
      {/* ----------------------------------------------------------------------- */}
      <div className="flex flex-1 overflow-hidden">
        {/* --------------------------------------------------------------------- */}
        {/* B. NAVIGATION SIDEBAR (Desktop & Mobile Drawer)                      */}
        {/* --------------------------------------------------------------------- */}
        <aside
          style={{ fontFamily: SYSTEM_FONT_STACK }}
          className="w-52 border-r border-border/80 bg-card/40 p-2.5 hidden md:flex flex-col justify-between shrink-0 font-sans"
        >
          {renderSidebarContent()}
        </aside>

        {/* Mobile Navigation Sheet */}
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="p-3 w-72 max-w-[85vw] flex flex-col justify-between overflow-y-auto font-sans">
            <SheetHeader className="pb-2 border-b text-left">
              <SheetTitle className="text-sm font-semibold flex items-center gap-2">
                <img src="/FILE-MANAGER/Folder.ico" alt="" className="size-4 object-contain shrink-0" />
                <span>File Explorer</span>
              </SheetTitle>
            </SheetHeader>
            {renderSidebarContent(() => setMobileNavOpen(false))}
          </SheetContent>
        </Sheet>

        {/* --------------------------------------------------------------------- */}
        {/* D. MULTI-VIEW CONTENT AREA                                            */}
        {/* --------------------------------------------------------------------- */}
        <main
          onClick={() => {
            // Click on blank space clears selection
            setSelectedIds(new Set());
          }}
          onContextMenu={(e) => handleContextMenu(e, null)}
          style={{ fontFamily: SYSTEM_FONT_STACK }}
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 font-sans"
        >
          {/* Storage Quota Alerts */}
          {stats?.lifecycleState === "LOCKED" && (
            <div className="flex items-center gap-3 p-3.5 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-xs md:text-sm font-medium">
              <AlertTriangle className="size-4 shrink-0 text-destructive animate-bounce" />
              <div className="flex-1">
                <span className="font-semibold">Workspace Storage Locked (100% Full):</span> New uploads are blocked until storage is freed. You can permanently purge items from the Recycle Bin or upgrade the workspace storage allocation.
              </div>
            </div>
          )}
          {stats?.lifecycleState === "CRITICAL" && (
            <div className="flex items-center gap-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl text-orange-700 dark:text-orange-400 text-xs md:text-sm font-medium">
              <AlertCircle className="size-4 shrink-0 text-orange-600 dark:text-orange-400" />
              <div className="flex-1">
                <span className="font-semibold">Storage Capacity Critical ({stats.percentUsed}%):</span> Your workspace is approaching its capacity ceiling. New uploads will lock at 100%.
              </div>
            </div>
          )}
          {stats?.lifecycleState === "WARNING" && (
            <div className="flex items-center gap-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-800 dark:text-amber-400 text-xs font-medium">
              <AlertCircle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="flex-1">
                <span className="font-semibold">Storage Notice:</span> Workspace storage consumption is at {stats.percentUsed}%.
              </div>
            </div>
          )}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-xs">Loading items...</p>
            </div>
          ) : items.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center h-80 border-2 border-dashed border-border rounded-2xl p-6 text-center space-y-3 bg-card/20">
              <img
                src="/FILE-MANAGER/Folder%203D.ico"
                alt="Empty Folder"
                className="size-16 object-contain drop-shadow-md mx-auto pointer-events-none select-none"
                draggable={false}
              />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">
                  {searchQuery ? "No matching files or folders" : "This folder is empty"}
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  {searchQuery
                    ? `No items matched "${searchQuery}". Check your spelling or try another query.`
                    : "Drag files here, or use the command ribbon above to upload files and create folders."}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setIsNewFolderOpen(true)} className="gap-1.5 text-xs h-8">
                  <img src="/FILE-MANAGER/Folder.ico" alt="" className="size-3.5 object-contain" draggable={false} /> New Folder
                </Button>
                <Button size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5 text-xs h-8">
                  <Upload className="size-3.5" /> Upload Files
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Folders Group (shown in Grid and Details views if folders exist) */}
              {folders.length > 0 && view === "grid" && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Folders ({folders.length})
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {folders.map((folder) => {
                      const isSelected = selectedIds.has(folder.id);
                      return (
                        <div
                          key={folder.id}
                          onDoubleClick={() => handleOpenFolder(folder)}
                          onClick={(e) => handleSelectItem(folder, e)}
                          onContextMenu={(e) => handleContextMenu(e, folder)}
                          className={cn(
                            "group relative flex items-center gap-3 p-2.5 rounded-xl border border-border/80 bg-card hover:bg-accent/40 transition-all cursor-pointer shadow-2xs",
                            isSelected && "border-primary ring-1.5 ring-primary bg-primary/10"
                          )}
                        >
                          {getItemIcon(folder)}
                          <div className="truncate flex-1 min-w-0">
                            <div className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {folder.fileName}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {folder.formattedSize}
                            </div>
                          </div>
                          {/* Checkbox indicator */}
                          <div
                            onClick={(e) => handleSelectItem(folder, e, true)}
                            className={cn(
                              "size-4 rounded border border-muted-foreground/30 flex items-center justify-center transition-opacity shrink-0",
                              isSelected ? "bg-primary border-primary text-primary-foreground opacity-100" : "opacity-0 group-hover:opacity-100"
                            )}
                          >
                            {isSelected && <Check className="size-3" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------------- */}
              {/* 1. DETAILS VIEW (Table layout with sortable columns)           */}
              {/* --------------------------------------------------------------- */}
              {view === "details" && (
                <div className="border border-border/80 rounded-xl bg-card overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border/80 bg-muted/30 text-muted-foreground font-semibold">
                          <th className="py-2.5 px-3 w-8 text-center" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={
                                items.length > 0 && selectedIds.size === items.length
                                  ? true
                                  : selectedIds.size > 0
                                  ? "indeterminate"
                                  : false
                              }
                              onCheckedChange={handleToggleSelectAll}
                              aria-label="Select all"
                            />
                          </th>
                          <th
                            className="py-2.5 px-3 cursor-pointer hover:text-foreground"
                            onClick={() => {
                              setSortBy("name");
                              setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                            }}
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Name</span>
                              {sortBy === "name" && (
                                <ArrowUpDown className="size-3 text-primary" />
                              )}
                            </div>
                          </th>
                          <th
                            className="py-2.5 px-3 hidden sm:table-cell cursor-pointer hover:text-foreground"
                            onClick={() => {
                              setSortBy("updatedAt");
                              setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                            }}
                          >
                            <div className="flex items-center gap-1.5">
                              <span>Date modified</span>
                              {sortBy === "updatedAt" && (
                                <ArrowUpDown className="size-3 text-primary" />
                              )}
                            </div>
                          </th>
                          <th className="py-2.5 px-3 hidden md:table-cell">Type</th>
                          <th
                            className="py-2.5 px-3 text-right hidden sm:table-cell cursor-pointer hover:text-foreground"
                            onClick={() => {
                              setSortBy("size");
                              setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                            }}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <span>Size</span>
                              {sortBy === "size" && (
                                <ArrowUpDown className="size-3 text-primary" />
                              )}
                            </div>
                          </th>
                          <th className="py-2.5 px-3 text-right w-16">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {items.map((item) => {
                          const isSelected = selectedIds.has(item.id);
                          return (
                            <tr
                              key={item.id}
                              onClick={(e) => handleSelectItem(item, e)}
                              onDoubleClick={() => {
                                if (item.isFolder) handleOpenFolder(item);
                                else {
                                  setPreviewTarget(item);
                                  setIsPreviewModalOpen(true);
                                }
                              }}
                              onContextMenu={(e) => handleContextMenu(e, item)}
                              className={cn(
                                "group hover:bg-accent/40 transition-colors cursor-pointer",
                                isSelected && "bg-primary/10 hover:bg-primary/15 border-l-2 border-primary"
                              )}
                            >
                              {/* Checkbox */}
                              <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => {
                                    const next = new Set(selectedIds);
                                    if (isSelected) next.delete(item.id);
                                    else next.add(item.id);
                                    setSelectedIds(next);
                                    setLastSelectedId(item.id);
                                  }}
                                />
                              </td>

                              {/* Name with icon & star */}
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-2.5">
                                  {getItemIcon(item)}
                                  <span className="font-medium text-foreground truncate max-w-xs sm:max-w-md">
                                    {item.fileName}
                                  </span>
                                  {!item.isFolder && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleToggleStar(item, e)}
                                      className={cn(
                                        "opacity-0 group-hover:opacity-100 transition-opacity ml-1",
                                        item.isStarred && "opacity-100 text-primary fill-primary"
                                      )}
                                      title={item.isStarred ? "Unstar" : "Star"}
                                    >
                                      <Star className={cn("size-3.5", item.isStarred ? "fill-primary text-primary" : "text-muted-foreground hover:text-primary")} />
                                    </button>
                                  )}
                                  {item.usageCount > 0 && (
                                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-primary/10 text-primary border-primary/20">
                                      In Use
                                    </Badge>
                                  )}
                                </div>
                              </td>

                              {/* Date modified */}
                              <td className="py-2 px-3 text-muted-foreground hidden sm:table-cell">
                                {new Date(item.updatedAt).toLocaleDateString()}
                              </td>

                              {/* Type */}
                              <td className="py-2 px-3 text-muted-foreground hidden md:table-cell">
                                {getFriendlyType(item)}
                              </td>

                              {/* Size */}
                              <td className="py-2 px-3 text-right font-mono text-muted-foreground hidden sm:table-cell">
                                {item.isFolder ? "—" : item.formattedSize}
                              </td>

                              {/* Actions Dropdown */}
                              <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100">
                                      <MoreVertical className="size-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    style={{ fontFamily: SYSTEM_FONT_STACK }}
                                    className="text-xs font-sans"
                                  >
                                    {category === "Trash" || item.deletedAt ? (
                                      <>
                                        <DropdownMenuItem onClick={() => handleBatchTrashOrRestore(true, [item])}>
                                          <RotateCcw className="size-4 mr-2 text-primary" /> Restore
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="text-destructive focus:text-destructive"
                                          onClick={() => {
                                            setPermanentDeleteTargets([item]);
                                            setIsEmptyTrashConfirm(false);
                                            setIsPermanentDeleteOpen(true);
                                          }}
                                        >
                                          <Trash2 className="size-4 mr-2" /> Delete Permanently
                                        </DropdownMenuItem>
                                      </>
                                    ) : (
                                      <>
                                        {item.isFolder ? (
                                          <DropdownMenuItem onClick={() => handleOpenFolder(item)}>
                                            <img src="/FILE-MANAGER/Folder%20Open.ico" alt="" className="size-4 mr-2 object-contain" draggable={false} /> Open Folder
                                          </DropdownMenuItem>
                                        ) : (
                                          <>
                                            <DropdownMenuItem onClick={() => { setShareTarget(item); setIsShareOpen(true); }}>
                                              <Share2 className="size-4 mr-2 text-primary" /> Share
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => { setPreviewTarget(item); setIsPreviewModalOpen(true); }}>
                                              <Eye className="size-4 mr-2 text-primary" /> Preview
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleDownload(item)}>
                                              <Download className="size-4 mr-2 text-primary" /> Download
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleCopySignedLink(item)}>
                                              <img src="/FILE-MANAGER/Link.ico" alt="" className="size-4 mr-2 object-contain" draggable={false} /> Copy link
                                            </DropdownMenuItem>
                                          </>
                                        )}
                                        <DropdownMenuItem onClick={() => { setRenameTarget(item); setRenameValue(item.fileName); setIsRenameOpen(true); }}>
                                          <img src="/FILE-MANAGER/Notes.ico" alt="" className="size-4 mr-2 object-contain" draggable={false} /> Rename
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => { setMoveTargets([item]); setSelectedDestinationFolder("root"); setIsMoveOpen(true); }}>
                                          <img src="/FILE-MANAGER/Folder%20Open.ico" alt="" className="size-4 mr-2 object-contain" draggable={false} /> Move
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="text-destructive focus:text-destructive"
                                          onClick={() => { setDeleteTargets([item]); setIsDeleteOpen(true); }}
                                        >
                                          <img src="/FILE-MANAGER/Trash%20Empty.ico" alt="" className="size-4 mr-2 object-contain" draggable={false} /> Delete
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------------- */}
              {/* 2. GRID / TILES VIEW (Card grid with preview thumbnails)      */}
              {/* --------------------------------------------------------------- */}
              {view === "grid" && regularFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Files ({regularFiles.length})
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
                    {regularFiles.map((file) => {
                      const isSelected = selectedIds.has(file.id);
                      return (
                        <div
                          key={file.id}
                          onClick={(e) => handleSelectItem(file, e)}
                          onDoubleClick={() => {
                            setPreviewTarget(file);
                            setIsPreviewModalOpen(true);
                          }}
                          onContextMenu={(e) => handleContextMenu(e, file)}
                          className={cn(
                            "group relative flex flex-col justify-between p-2.5 rounded-xl border border-border/80 bg-card hover:bg-accent/30 transition-all cursor-pointer shadow-2xs",
                            isSelected && "border-primary ring-1.5 ring-primary bg-primary/5 shadow-xs"
                          )}
                        >
                          {/* Thumbnail / Icon Container */}
                          <div className="relative aspect-square w-full rounded-lg bg-muted/30 border border-border/40 flex items-center justify-center overflow-hidden mb-2">
                            {file.category === "Images" && file.url ? (
                              <img
                                src={file.url}
                                alt={file.fileName}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                loading="lazy"
                              />
                            ) : (
                              getItemIcon(file, true)
                            )}

                            {/* Checkbox badge on top-left */}
                            <div
                              onClick={(e) => handleSelectItem(file, e, true)}
                              className={cn(
                                "absolute top-1.5 left-1.5 size-5 rounded border border-border bg-background/90 flex items-center justify-center transition-opacity shadow-xs",
                                isSelected ? "bg-primary border-primary text-primary-foreground opacity-100" : "opacity-0 group-hover:opacity-100"
                              )}
                            >
                              {isSelected && <Check className="size-3.5" />}
                            </div>

                            {/* Star badge on top-right */}
                            <button
                              type="button"
                              onClick={(e) => handleToggleStar(file, e)}
                              className={cn(
                                "absolute top-1.5 right-1.5 size-5 rounded-full flex items-center justify-center backdrop-blur-md transition-opacity",
                                file.isStarred
                                  ? "bg-primary text-primary-foreground opacity-100 shadow-xs"
                                  : "bg-background/80 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-primary hover:bg-background"
                              )}
                            >
                              <Star className={cn("size-3", file.isStarred && "fill-current")} />
                            </button>
                          </div>

                          {/* File Label */}
                          <div className="space-y-0.5">
                            <div className="text-xs font-semibold text-foreground truncate" title={file.fileName}>
                              {file.fileName}
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                              <span>{file.formattedSize}</span>
                              <span>{new Date(file.updatedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------------- */}
              {/* 3. LIST VIEW (Compact dense rows)                             */}
              {/* --------------------------------------------------------------- */}
              {view === "list" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {items.map((item) => {
                    const isSelected = selectedIds.has(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={(e) => handleSelectItem(item, e)}
                        onDoubleClick={() => {
                          if (item.isFolder) handleOpenFolder(item);
                          else {
                            setPreviewTarget(item);
                            setIsPreviewModalOpen(true);
                          }
                        }}
                        onContextMenu={(e) => handleContextMenu(e, item)}
                        className={cn(
                          "group flex items-center gap-2.5 p-2 rounded-lg border border-border/80 bg-card hover:bg-accent/40 transition-colors cursor-pointer",
                          isSelected && "border-primary ring-1 ring-primary bg-primary/5 shadow-xs"
                        )}
                      >
                        {getItemIcon(item)}
                        <div className="truncate flex-1 min-w-0">
                          <div className="text-xs font-medium text-foreground truncate group-hover:text-primary">
                            {item.fileName}
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                            <span>{item.formattedSize}</span>
                            <span>•</span>
                            <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div
                          onClick={(e) => handleSelectItem(item, e, true)}
                          className={cn(
                            "size-4 rounded border border-muted-foreground/30 flex items-center justify-center shrink-0 transition-opacity",
                            isSelected ? "bg-primary border-primary text-primary-foreground opacity-100" : "opacity-0 group-hover:opacity-100"
                          )}
                        >
                          {isSelected && <Check className="size-3" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </main>

        {/* --------------------------------------------------------------------- */}
        {/* E. PREVIEW / DETAILS PANE (Desktop Aside + Mobile/Tablet Sheet)       */}
        {/* --------------------------------------------------------------------- */}
        {showInspector && activeInspectorItem && (
          <aside
            style={{ fontFamily: SYSTEM_FONT_STACK }}
            className="w-80 border-l border-border/80 bg-card/65 backdrop-blur-md p-4 hidden lg:flex flex-col justify-between shrink-0 overflow-y-auto font-sans"
          >
            {renderInspectorInner()}
          </aside>
        )}

        {/* Mobile & Tablet Details Sheet */}
        <Sheet open={showInspector && !!activeInspectorItem} onOpenChange={(open) => setShowInspector(open)}>
          <SheetContent side="right" className="w-[320px] sm:w-[380px] max-w-[92vw] p-4 flex flex-col justify-between overflow-y-auto font-sans lg:hidden">
            <SheetHeader className="sr-only text-left">
              <SheetTitle>File Details</SheetTitle>
            </SheetHeader>
            {renderInspectorInner()}
          </SheetContent>
        </Sheet>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* WINDOWS 11 RIGHT-CLICK CONTEXT MENU                                    */}
      {/* ----------------------------------------------------------------------- */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            fontFamily: SYSTEM_FONT_STACK,
          }}
          className="fixed z-50 w-56 rounded-xl border border-border/80 bg-popover/95 text-popover-foreground shadow-xl text-xs backdrop-blur-md p-1.5 animate-in fade-in-0 zoom-in-95 select-none font-sans"
          onClick={(e) => e.stopPropagation()}
        >
            {contextMenu.item ? (
              category === "Trash" || contextMenu.item.deletedAt ? (
                <>
                  <div
                    onClick={() => {
                      handleBatchTrashOrRestore(true, [contextMenu.item!]);
                      setContextMenu(null);
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-primary hover:bg-primary/10 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="size-4" />
                    <span className="font-medium">Restore</span>
                  </div>
                  <div
                    onClick={() => {
                      setPermanentDeleteTargets([contextMenu.item!]);
                      setIsEmptyTrashConfirm(false);
                      setIsPermanentDeleteOpen(true);
                      setContextMenu(null);
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                  >
                    <Trash2 className="size-4" />
                    <span className="font-medium">Delete Permanently</span>
                    <kbd className="ml-auto text-[10px] font-mono text-destructive/80 bg-destructive/10 px-1.5 py-0.5 rounded border border-destructive/20">
                      Shift+Del
                    </kbd>
                  </div>
                  <div className="h-px bg-border/60 my-1" />
                  <div
                    onClick={() => {
                      setShowInspector(true);
                      setContextMenu(null);
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors"
                  >
                    <img src="/FILE-MANAGER/Info.ico" alt="" className="size-4 object-contain shrink-0" draggable={false} />
                    <span className="font-medium">Properties</span>
                    <kbd className="ml-auto text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/60">
                      Alt+Enter
                    </kbd>
                  </div>
                </>
              ) : (
                <>
                  {contextMenu.item.isFolder ? (
                    <div
                      onClick={() => {
                        handleOpenFolder(contextMenu.item!);
                        setContextMenu(null);
                      }}
                      className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                    >
                      <img src="/FILE-MANAGER/Folder%20Open.ico" alt="" className="size-4 object-contain shrink-0" draggable={false} />
                      <span className="font-medium">Open</span>
                      <kbd className="ml-auto text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/60">
                        Enter
                      </kbd>
                    </div>
                  ) : (
                    <>
                      <div
                        onClick={() => {
                          setShareTarget(contextMenu.item);
                          setIsShareOpen(true);
                          setContextMenu(null);
                        }}
                        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                      >
                        <Share2 className="size-4 text-primary" />
                        <span className="font-medium">Share...</span>
                      </div>
                      <div
                        onClick={() => {
                          setPreviewTarget(contextMenu.item);
                          setIsPreviewModalOpen(true);
                          setContextMenu(null);
                        }}
                        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                      >
                        <Eye className="size-4 text-primary" />
                        <span className="font-medium">Preview</span>
                        <kbd className="ml-auto text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/60">
                          Space
                        </kbd>
                      </div>
                      <div
                        onClick={() => {
                          handleDownload(contextMenu.item!);
                          setContextMenu(null);
                        }}
                        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                      >
                        <Download className="size-4 text-primary" />
                        <span className="font-medium">Download</span>
                      </div>
                      <div
                        onClick={() => {
                          handleCopySignedLink(contextMenu.item!);
                          setContextMenu(null);
                        }}
                        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                      >
                        <img src="/FILE-MANAGER/Link.ico" alt="" className="size-4 object-contain shrink-0" draggable={false} />
                        <span className="font-medium">Copy Secure Link</span>
                      </div>
                      <div
                        onClick={() => {
                          handleToggleStar(contextMenu.item!);
                          setContextMenu(null);
                        }}
                        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                      >
                        <Star
                          className={cn(
                            "size-4 text-primary",
                            contextMenu.item.isStarred && "fill-primary"
                          )}
                        />
                        <span className="font-medium">
                          {contextMenu.item.isStarred ? "Unstar" : "Star"}
                        </span>
                      </div>
                    </>
                  )}
                  <div
                    onClick={() => {
                      setRenameTarget(contextMenu.item);
                      setRenameValue(contextMenu.item!.fileName);
                      setIsRenameOpen(true);
                      setContextMenu(null);
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                  >
                    <img src="/FILE-MANAGER/Notes.ico" alt="" className="size-4 object-contain shrink-0" draggable={false} />
                    <span className="font-medium">Rename</span>
                    <kbd className="ml-auto text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/60">
                      F2
                    </kbd>
                  </div>
                  <div
                    onClick={() => {
                      setMoveTargets([contextMenu.item!]);
                      setSelectedDestinationFolder("root");
                      setIsMoveOpen(true);
                      setContextMenu(null);
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                  >
                    <img src="/FILE-MANAGER/Folder%20Open.ico" alt="" className="size-4 object-contain shrink-0" draggable={false} />
                    <span className="font-medium">Move to...</span>
                  </div>
                  <div className="h-px bg-border/60 my-1" />
                  <div
                    onClick={() => {
                      setDeleteTargets([contextMenu.item!]);
                      setIsDeleteOpen(true);
                      setContextMenu(null);
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                  >
                    <img src="/FILE-MANAGER/Trash%20Empty.ico" alt="" className="size-4 object-contain shrink-0" draggable={false} />
                    <span className="font-medium">Move to Recycle Bin</span>
                    <kbd className="ml-auto text-[10px] font-mono text-destructive/80 bg-destructive/10 px-1.5 py-0.5 rounded border border-destructive/20">
                      Del
                    </kbd>
                  </div>
                  <div className="h-px bg-border/60 my-1" />
                  <div
                    onClick={() => {
                      setShowInspector(true);
                      setContextMenu(null);
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors"
                  >
                    <img src="/FILE-MANAGER/Info.ico" alt="" className="size-4 object-contain shrink-0" draggable={false} />
                    <span className="font-medium">Properties</span>
                    <kbd className="ml-auto text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/60">
                      Alt+Enter
                    </kbd>
                  </div>
                </>
              )
            ) : (
              /* Canvas context menu */
              category === "Trash" ? (
                <>
                  <div
                    onClick={() => {
                      setView(view === "details" ? "grid" : view === "grid" ? "list" : "details");
                      setContextMenu(null);
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                  >
                    <LayoutGrid className="size-4 text-primary" />
                    <span className="font-medium">Switch View ({view})</span>
                  </div>
                  <div
                    onClick={() => {
                      refetch();
                      setContextMenu(null);
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                  >
                    <img src="/FILE-MANAGER/History.ico" alt="" className="size-4 object-contain shrink-0" draggable={false} />
                    <span className="font-medium">Refresh</span>
                    <kbd className="ml-auto text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/60">
                      F5
                    </kbd>
                  </div>
                  <div className="h-px bg-border/60 my-1" />
                  <div
                    onClick={() => {
                      handleBatchTrashOrRestore(true, items);
                      setContextMenu(null);
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                  >
                    <RotateCcw className="size-4 text-primary" />
                    <span className="font-medium">Restore All Items</span>
                  </div>
                  <div
                    onClick={() => {
                      setPermanentDeleteTargets([]);
                      setIsEmptyTrashConfirm(true);
                      setIsPermanentDeleteOpen(true);
                      setContextMenu(null);
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                  >
                    <img src="/FILE-MANAGER/Trash%20Empty.ico" alt="" className="size-4 object-contain shrink-0" draggable={false} />
                    <span className="font-medium">Empty Recycle Bin</span>
                  </div>
                  <div className="h-px bg-border/60 my-1" />
                  <div
                    onClick={() => {
                      handleToggleSelectAll(true);
                      setContextMenu(null);
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors"
                  >
                    <CheckSquare className="size-4 text-muted-foreground" />
                    <span className="font-medium">Select All</span>
                    <kbd className="ml-auto text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/60">
                      Ctrl+A
                    </kbd>
                  </div>
                </>
              ) : (
                <>
                  <div
                    onClick={() => {
                      setView(view === "details" ? "grid" : view === "grid" ? "list" : "details");
                      setContextMenu(null);
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                  >
                    <LayoutGrid className="size-4 text-primary" />
                    <span className="font-medium">Switch View ({view})</span>
                  </div>
                  <div
                    onClick={() => {
                      refetch();
                      setContextMenu(null);
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                  >
                    <img src="/FILE-MANAGER/History.ico" alt="" className="size-4 object-contain shrink-0" draggable={false} />
                    <span className="font-medium">Refresh</span>
                    <kbd className="ml-auto text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/60">
                      F5
                    </kbd>
                  </div>
                  <div className="h-px bg-border/60 my-1" />
                  <div
                    onClick={() => {
                      setIsNewFolderOpen(true);
                      setContextMenu(null);
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                  >
                    <img src="/FILE-MANAGER/Folder.ico" alt="" className="size-4 object-contain shrink-0" draggable={false} />
                    <span className="font-medium">New Folder</span>
                    <kbd className="ml-auto text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/60">
                      Ctrl+Shift+N
                    </kbd>
                  </div>
                  <div
                    onClick={() => {
                      fileInputRef.current?.click();
                      setContextMenu(null);
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                  >
                    <Upload className="size-4 text-primary" />
                    <span className="font-medium">Upload Files</span>
                  </div>
                  <div
                    onClick={() => {
                      folderInputRef.current?.click();
                      setContextMenu(null);
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                  >
                    <img src="/FILE-MANAGER/Folder%20Downloads.ico" alt="" className="size-4 object-contain shrink-0" draggable={false} />
                    <span className="font-medium">Upload Folder</span>
                  </div>
                  <div className="h-px bg-border/60 my-1" />
                  <div
                    onClick={() => {
                      handleToggleSelectAll(true);
                      setContextMenu(null);
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors"
                  >
                    <CheckSquare className="size-4 text-muted-foreground" />
                    <span className="font-medium">Select All</span>
                    <kbd className="ml-auto text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/60">
                      Ctrl+A
                    </kbd>
                  </div>
                </>
              )
            )}
          </div>
        )}

      {/* ----------------------------------------------------------------------- */}
      {/* DIALOG: CREATE NEW FOLDER                                              */}
      {/* ----------------------------------------------------------------------- */}
      <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
        <DialogContent style={{ fontFamily: SYSTEM_FONT_STACK }} className="sm:max-w-md font-sans">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              <img src="/FILE-MANAGER/Folder.ico" alt="" className="size-4 object-contain shrink-0" draggable={false} />
              Create New Folder
            </DialogTitle>
            <DialogDescription className="text-xs">
              Folder will be created in {currentFolder ? `"${currentFolder.name}"` : "the root directory"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="folder-name" className="text-xs">Folder Name</Label>
              <Input
                id="folder-name"
                placeholder="e.g. Employee Documents, Payroll Reports"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                className="text-xs h-9"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsNewFolderOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateFolder} className="text-xs bg-primary text-primary-foreground hover:bg-primary/90">
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------------------------------------- */}
      {/* DIALOG: RENAME ITEM                                                    */}
      {/* ----------------------------------------------------------------------- */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent style={{ fontFamily: SYSTEM_FONT_STACK }} className="sm:max-w-md font-sans">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              <img src="/FILE-MANAGER/Notes.ico" alt="" className="size-4 object-contain shrink-0" draggable={false} />
              Rename Item
            </DialogTitle>
            <DialogDescription className="text-xs">
              Enter a new name for "{renameTarget?.fileName}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="rename-input" className="text-xs">New Name</Label>
              <Input
                id="rename-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRename()}
                className="text-xs h-9"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsRenameOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleRename} className="text-xs bg-primary text-primary-foreground hover:bg-primary/90">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------------------------------------- */}
      {/* DIALOG: MOVE ITEM(S)                                                   */}
      {/* ----------------------------------------------------------------------- */}
      <Dialog open={isMoveOpen} onOpenChange={setIsMoveOpen}>
        <DialogContent style={{ fontFamily: SYSTEM_FONT_STACK }} className="sm:max-w-md font-sans">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              <img src="/FILE-MANAGER/Folder%20Open.ico" alt="" className="size-4 object-contain shrink-0" draggable={false} />
              Move {moveTargets.length} Item(s)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select destination folder.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Destination Folder</Label>
              <Select value={selectedDestinationFolder} onValueChange={setSelectedDestinationFolder}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent style={{ fontFamily: SYSTEM_FONT_STACK }} className="text-xs font-sans">
                  <SelectItem value="root">
                    <span className="flex items-center gap-2">
                      <img src="/FILE-MANAGER/Drives/Hardrive.ico" alt="" className="size-3.5 object-contain inline-block shrink-0" />
                      <span>Root Directory</span>
                    </span>
                  </SelectItem>
                  {folderList
                    .filter((f) => !moveTargets.some((m) => m.id === f.id))
                    .map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        <span className="flex items-center gap-2">
                          <img src="/FILE-MANAGER/Folder.ico" alt="" className="size-3.5 object-contain inline-block shrink-0" />
                          <span>{f.fileName}</span>
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsMoveOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleMove} className="text-xs bg-primary text-primary-foreground hover:bg-primary/90">
              Move Here
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------------------------------------- */}
      {/* DIALOG: DELETE / TRASH CONFIRMATION                                    */}
      {/* ----------------------------------------------------------------------- */}
      <Dialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) setDeleteTargets([]);
        }}
      >
        <DialogContent style={{ fontFamily: SYSTEM_FONT_STACK }} className="sm:max-w-md font-sans">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive text-sm font-semibold">
              <img src="/FILE-MANAGER/Trash%20Empty.ico" alt="" className="size-4 object-contain shrink-0" draggable={false} />
              Move to Recycle Bin
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-xs space-y-2 text-muted-foreground pt-1">
                <div>
                  Are you sure you want to move {deleteTargets.length} item(s) to the Recycle Bin?
                </div>
                {deleteTargets.some((t) => t.usageCount && t.usageCount > 0) && (
                  <div className="p-2 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-1.5">
                    <ShieldAlert className="size-4 shrink-0" />
                    Warning: One or more selected files are linked to active system records (branding, chat, documents).
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsDeleteOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={() => handleBatchTrashOrRestore(false)} className="text-xs">
              Move to Recycle Bin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------------------------------------- */}
      {/* DIALOG: PERMANENT PURGE DELETE CONFIRMATION                            */}
      {/* ----------------------------------------------------------------------- */}
      <Dialog open={isPermanentDeleteOpen} onOpenChange={setIsPermanentDeleteOpen}>
        <DialogContent style={{ fontFamily: SYSTEM_FONT_STACK }} className="sm:max-w-md font-sans">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive text-sm font-semibold">
              <ShieldAlert className="size-5 shrink-0 text-destructive" />
              {isEmptyTrashConfirm ? "Empty Recycle Bin?" : "Permanently Delete Item(s)?"}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-xs space-y-2.5 text-muted-foreground pt-1">
                {isEmptyTrashConfirm ? (
                  <div>
                    Are you sure you want to permanently delete all <strong>{items.length}</strong> item(s) in the Recycle Bin?
                  </div>
                ) : (
                  <div>
                    Are you sure you want to permanently delete <strong>{permanentDeleteTargets.length}</strong> selected item(s)?
                    <ul className="mt-2 max-h-32 overflow-y-auto space-y-1 rounded border border-border/60 bg-muted/30 p-2 font-mono text-[11px]">
                      {permanentDeleteTargets.map((t) => (
                        <li key={t.id} className="truncate flex items-center gap-1.5 text-foreground">
                          <span className="text-destructive">•</span>
                          <span className="truncate">{t.fileName}</span>
                          <span className="text-muted-foreground text-[10px]">({t.formattedSize})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold flex items-start gap-2">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <div>
                    <strong>This action cannot be undone.</strong> The file(s) and their object storage data will be permanently purged from the workspace. Quota will be freed immediately.
                  </div>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsPermanentDeleteOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handlePermanentDelete}
              className="text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isEmptyTrashConfirm ? "Empty Recycle Bin" : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------------------------------------- */}
      {/* DIALOG: FULL PREVIEW MODAL                                             */}
      {/* ----------------------------------------------------------------------- */}
      <Dialog
        open={isPreviewModalOpen}
        onOpenChange={(open) => {
          setIsPreviewModalOpen(open);
          if (!open) {
            setPreviewTarget(null);
            setModalPreviewSignedUrl(null);
          }
        }}
      >
        <DialogContent style={{ fontFamily: SYSTEM_FONT_STACK }} className="sm:max-w-3xl max-h-[90vh] flex flex-col p-4 font-sans">
          <DialogHeader className="pb-2 border-b border-border">
            <DialogTitle className="truncate text-sm font-semibold">{previewTarget?.fileName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto min-h-[320px]">
            {previewTarget?.category === "Images" && (modalPreviewSignedUrl || previewTarget.url) ? (
              <img
                src={modalPreviewSignedUrl || previewTarget.url}
                alt={previewTarget.fileName}
                className="max-h-[70vh] max-w-full rounded-lg object-contain"
              />
            ) : previewTarget?.mimeType?.includes("video") && (modalPreviewSignedUrl || previewTarget.url) ? (
              <video controls className="max-h-[70vh] max-w-full rounded-lg">
                <source src={modalPreviewSignedUrl || previewTarget.url} type={previewTarget.mimeType} />
                Your browser does not support HTML5 video.
              </video>
            ) : previewTarget?.mimeType?.includes("audio") && (modalPreviewSignedUrl || previewTarget.url) ? (
              <div className="p-6 rounded-2xl bg-card border border-border flex flex-col items-center gap-4">
                <Music className="size-12 text-primary" />
                <audio controls src={modalPreviewSignedUrl || previewTarget.url} className="w-72" />
              </div>
            ) : previewTarget?.mimeType === "application/pdf" && (modalPreviewSignedUrl || previewTarget.url) ? (
              <iframe
                src={modalPreviewSignedUrl || previewTarget.url}
                className="w-full h-[65vh] rounded-lg border border-border"
                title={previewTarget.fileName}
              />
            ) : (
              <div className="text-center space-y-3 p-8">
                <div className="size-16 rounded-2xl bg-muted/60 mx-auto flex items-center justify-center">
                  <File className="size-8 text-muted-foreground" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground">{previewTarget?.fileName}</h4>
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
            <span className="text-xs text-muted-foreground font-mono">{previewTarget?.formattedSize}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => previewTarget && handleDownload(previewTarget)}
                className="text-xs h-8"
              >
                <Download className="size-3.5 mr-1.5" /> Download
              </Button>
              <Button size="sm" onClick={() => setIsPreviewModalOpen(false)} className="text-xs h-8">
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------------------------------------- */}
      {/* DIALOG: SHARE & COLLABORATION MODAL                                    */}
      {/* ----------------------------------------------------------------------- */}
      <ShareDialog
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        fileItem={shareTarget}
        onAclChanged={() => refetch()}
      />
    </div>
  );
}
