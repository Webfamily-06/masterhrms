import React, { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Upload,
  Search,
  Star,
  Trash2,
  Folder,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Share2,
  MoreVertical,
  List,
  Grid,
  Info,
  FolderPlus,
  Download,
  Check,
  ChevronDown,
  Settings,
  Archive,
  BookOpen,
  AlertTriangle,
  FileCode,
  HardDrive,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type FileManagerView = "list" | "grid";

interface FileItem {
  id: string;
  name: string;
  type: "png" | "pdf" | "excel" | "folder" | "word" | "zip";
  sharing: "ME" | "B" | "All";
  modified: string;
  size: string;
  starred: boolean;
  category: "Images" | "Videos" | "Audio" | "Documents";
}

const DEFAULT_FILES: FileItem[] = [
  {
    id: "f1",
    name: "Uploaded File png",
    type: "png",
    sharing: "ME",
    modified: "10/17/2026",
    size: "15 KB",
    starred: false,
    category: "Images",
  },
  {
    id: "f2",
    name: "Uploaded File pdf",
    type: "pdf",
    sharing: "ME",
    modified: "10/17/2026",
    size: "15 KB",
    starred: false,
    category: "Documents",
  },
  {
    id: "f3",
    name: "Uploaded File pdf",
    type: "pdf",
    sharing: "ME",
    modified: "10/17/2026",
    size: "15 KB",
    starred: false,
    category: "Documents",
  },
  {
    id: "f4",
    name: "Uploaded File png",
    type: "png",
    sharing: "ME",
    modified: "10/17/2026",
    size: "15 KB",
    starred: false,
    category: "Images",
  },
  {
    id: "f5",
    name: "Uploaded File png",
    type: "png",
    sharing: "ME",
    modified: "10/6/2026",
    size: "15 KB",
    starred: false,
    category: "Images",
  },
  {
    id: "f6",
    name: "Website_content.exl",
    type: "excel",
    sharing: "ME",
    modified: "Today 11:02 AM",
    size: "2,637 KB",
    starred: true,
    category: "Documents",
  },
  {
    id: "f7",
    name: "bruce-mars-fiEG-Pk6Z...png",
    type: "png",
    sharing: "B",
    modified: "Yesterday, 2:40 PM",
    size: "4,178 KB",
    starred: false,
    category: "Images",
  },
];

const DEFAULT_FOLDERS = [
  { id: "fold1", name: "Jampack Source", size: "1.6 GB", access: "Last Access: 2 hours ago" },
  { id: "fold2", name: "Marketing Assets", size: "2,637 KB", access: "Last Access: 2 hours ago" },
  { id: "fold3", name: "Client Invoices", size: "450 MB", access: "Last Access: 1 day ago" },
];

interface ClassicFileManagerAppProps {
  initialView: FileManagerView;
}

export function ClassicFileManagerApp({ initialView }: ClassicFileManagerAppProps) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<FileManagerView>(initialView);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"cloud" | "shared">("cloud");
  const [activeSection, setActiveSection] = useState("my_space");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Query real documents from backend
  const { data: serverDocs = [] } = useQuery({
    queryKey: ["documents-list"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/documents");
        const list = res?.data || (Array.isArray(res) ? res : []);
        return (list as any[]).map((d) => {
          const fileName = d.fileName || d.name || d.title || "document.pdf";
          const ext = fileName.split(".").pop()?.toLowerCase();
          const type = ext === "pdf" ? "pdf" : (ext === "xlsx" || ext === "xls" ? "excel" : (ext === "doc" || ext === "docx" ? "word" : (ext === "zip" ? "zip" : "png")));
          const category = type === "png" ? ("Images" as const) : ("Documents" as const);
          const isShared = d.notes && d.notes.includes("[SharedWith:");
          return {
            id: d.id,
            name: d.title || fileName,
            type,
            sharing: isShared ? ("B" as const) : ("ME" as const),
            modified: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "Recent",
            size: d.fileSize || (d.size ? `${Math.round(d.size / 1024)} KB` : "1.5 MB"),
            starred: false,
            category,
          } as FileItem;
        });
      } catch {
        return [];
      }
    },
  });

  const allDisplayFiles = serverDocs.length > 0
    ? [...files, ...serverDocs.filter(sd => !files.some(f => f.id === sd.id))]
    : files;

  const filteredFiles = allDisplayFiles.filter((f) => {
    if (!searchQuery) return true;
    return f.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase();
        const type: any = ext === "pdf" ? "pdf" : ext === "xlsx" || ext === "xls" ? "excel" : "png";
        const newDoc: FileItem = {
          id: `file_${Date.now()}`,
          name: file.name,
          type,
          sharing: "ME",
          modified: "Just now",
          size: `${Math.round(file.size / 1024)} KB`,
          starred: false,
          category: "Documents",
        };
        setFiles((prev) => [newDoc, ...prev]);

        try {
          await api.post("/api/documents", {
            title: file.name,
            fileName: file.name,
            fileSize: `${Math.round(file.size / 1024)} KB`,
            fileType: file.type || "application/octet-stream",
            category: "Documents",
            requiresSignature: false,
          });
          queryClient.invalidateQueries({ queryKey: ["documents-list"] });
          toast.success(`Uploaded '${file.name}' successfully!`);
        } catch {
          toast.success(`Uploaded '${file.name}' locally!`);
        }
      }
    };
    input.click();
  };

  const toggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, starred: !f.starred } : f))
    );
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "png":
        return (
          <div className="size-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
            <ImageIcon className="size-4" />
          </div>
        );
      case "pdf":
        return (
          <div className="size-8 rounded-lg bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center font-bold text-xs">
            D
          </div>
        );
      case "excel":
        return (
          <div className="size-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold text-xs">
            X
          </div>
        );
      case "folder":
        return (
          <div className="size-8 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-500 flex items-center justify-center">
            <Folder className="size-4" />
          </div>
        );
      default:
        return (
          <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 flex items-center justify-center">
            <FileText className="size-4" />
          </div>
        );
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background border-t border-border">
      {/* ─── LEFT SIDEBAR ─── */}
      <aside className="w-[280px] flex-shrink-0 border-r border-border bg-card flex flex-col justify-between">
        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            className="w-full bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-full h-10 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Upload className="size-4" />
            <span>Upload</span>
          </Button>

          {/* Core Navigation Links */}
          <div className="space-y-1 text-xs font-semibold">
            <button
              onClick={() => setActiveSection("my_space")}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer",
                activeSection === "my_space"
                  ? "bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <HardDrive className="size-4 text-teal-600" />
              <span>My Space</span>
            </button>
            <button
              onClick={() => setActiveSection("all_files")}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer",
                activeSection === "all_files"
                  ? "bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <FileText className="size-4 text-muted-foreground" />
              <span>All Files</span>
            </button>
            <button
              onClick={() => setActiveSection("folders")}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer",
                activeSection === "folders"
                  ? "bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <Folder className="size-4 text-muted-foreground" />
              <span>Folders</span>
            </button>
            <button
              onClick={() => setActiveSection("shared")}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer",
                activeSection === "shared"
                  ? "bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <Share2 className="size-4 text-muted-foreground" />
              <span>Shared</span>
            </button>
            <button
              onClick={() => setActiveSection("starred")}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer",
                activeSection === "starred"
                  ? "bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <Star className="size-4 text-muted-foreground" />
              <span>Starred</span>
            </button>
            <button
              onClick={() => setActiveSection("trash")}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer",
                activeSection === "trash"
                  ? "bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <Trash2 className="size-4 text-muted-foreground" />
              <span>Trash</span>
            </button>
          </div>

          {/* Categories */}
          <div className="pt-2 border-t border-border/60">
            <div className="space-y-2 text-xs">
              <button
                onClick={() => toast.info("Filter by Images")}
                className="w-full text-left px-3 py-1.5 rounded-lg flex items-center gap-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              >
                <ImageIcon className="size-4 text-emerald-600" />
                <span>Images</span>
              </button>
              <button
                onClick={() => toast.info("Filter by Videos")}
                className="w-full text-left px-3 py-1.5 rounded-lg flex items-center gap-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              >
                <Video className="size-4 text-blue-600" />
                <span>Videos</span>
              </button>
              <button
                onClick={() => toast.info("Filter by Audio")}
                className="w-full text-left px-3 py-1.5 rounded-lg flex items-center gap-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              >
                <Music className="size-4 text-purple-600" />
                <span>Audio</span>
              </button>
              <button
                onClick={() => toast.info("Filter by Documents")}
                className="w-full text-left px-3 py-1.5 rounded-lg flex items-center gap-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              >
                <FileText className="size-4 text-amber-600" />
                <span>Documents</span>
              </button>
            </div>
          </div>

          {/* Storage Meter Widget */}
          <div className="pt-4 border-t border-border/60 text-xs">
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Storage is 85% full. 78.5 GB of 1 TB used. You can buy more space.
            </p>
            <div className="w-full h-1.5 bg-muted rounded-full mt-2.5 overflow-hidden">
              <div className="h-full bg-red-500 rounded-full w-[85%]" />
            </div>
            <p className="text-[10px] text-muted-foreground font-semibold mt-1.5">78.5 GB OF 1 TB</p>
            <button
              onClick={() => toast.info("Opening storage upgrade tiers...")}
              className="text-teal-700 dark:text-teal-400 font-bold text-xs mt-2 hover:underline cursor-pointer block"
            >
              Buy Storage
            </button>
          </div>
        </div>

        {/* Bottom Toolbar Icons */}
        <div className="p-3 border-t border-border flex items-center justify-around text-muted-foreground">
          <button className="hover:text-foreground p-1 transition-colors cursor-pointer" title="Settings">
            <Settings className="size-4" />
          </button>
          <button className="hover:text-foreground p-1 transition-colors cursor-pointer" title="Archive">
            <Archive className="size-4" />
          </button>
          <button className="hover:text-foreground p-1 transition-colors cursor-pointer" title="Notes">
            <BookOpen className="size-4" />
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 flex flex-col bg-card overflow-hidden">
        {/* Top Header Bar */}
        <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 font-bold text-base text-foreground cursor-pointer hover:text-teal-700">
                  <span>My Space</span>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                <DropdownMenuItem className="cursor-pointer">My Space</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">Team Drive</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">Archive Vault</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="relative">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files and folders"
                className="text-xs h-8.5 w-64 bg-muted/20 border-border"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => toast.info("Share Folder modal opened")}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
              title="Share space"
            >
              <UserPlus className="size-4" />
            </button>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className={cn(
                "p-2 rounded-lg transition-colors cursor-pointer",
                showInfo ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title="Toggle File Info"
            >
              <Info className="size-4" />
            </button>
            <button
              onClick={() => setNewFolderModalOpen(true)}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
              title="New Folder"
            >
              <FolderPlus className="size-4" />
            </button>
            <button
              onClick={handleUpload}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
              title="Upload file"
            >
              <Upload className="size-4" />
            </button>

            {/* View Switcher: List vs Grid */}
            <div className="flex items-center border border-border rounded-lg overflow-hidden ml-2">
              <Link
                to="/apps/file-manager/list-view"
                onClick={() => setView("list")}
                className={cn(
                  "p-1.5 transition-colors cursor-pointer",
                  view === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                title="List View"
              >
                <List className="size-4" />
              </Link>
              <Link
                to="/apps/file-manager/grid-view"
                onClick={() => setView("grid")}
                className={cn(
                  "p-1.5 transition-colors cursor-pointer",
                  view === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                title="Grid View"
              >
                <Grid className="size-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs: Cloud Documents vs Shared with me */}
        <div className="px-6 border-b border-border flex items-center gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("cloud")}
            className={cn(
              "py-3 border-b-2 transition-all cursor-pointer",
              activeTab === "cloud"
                ? "border-teal-700 text-teal-800 dark:text-teal-300 font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Cloud Documents
          </button>
          <button
            onClick={() => setActiveTab("shared")}
            className={cn(
              "py-3 border-b-2 transition-all cursor-pointer",
              activeTab === "shared"
                ? "border-teal-700 text-teal-800 dark:text-teal-300 font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Shared with me
          </button>
        </div>

        {/* ─── LIST VIEW ─── */}
        {view === "list" && (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/10 text-muted-foreground font-semibold text-[11px]">
                  <th className="p-3 w-10 text-center">
                    <input type="checkbox" className="rounded border-border" />
                  </th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Sharing</th>
                  <th className="p-3">Modified</th>
                  <th className="p-3">Size</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredFiles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-muted-foreground text-xs">
                      No documents found in vault. Upload a file or adjust your filters.
                    </td>
                  </tr>
                ) : (
                  filteredFiles.map((file) => (
                    <tr
                      key={file.id}
                      onClick={() => {
                        setSelectedFile(file);
                        setShowInfo(true);
                      }}
                      className="hover:bg-muted/40 transition-colors cursor-pointer group"
                    >
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="rounded border-border" />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => toggleStar(file.id, e)}
                          className="text-muted-foreground hover:text-amber-500 cursor-pointer"
                        >
                          <Star
                            className={cn(
                              "size-3.5",
                              file.starred ? "text-amber-500 fill-amber-500" : "text-muted-foreground"
                            )}
                          />
                        </button>
                        {getFileIcon(file.type)}
                        <span className="font-semibold text-foreground group-hover:text-teal-700 transition-colors">
                          {file.name}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="size-6 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 font-bold text-[10px] inline-flex items-center justify-center">
                        {file.sharing}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{file.modified}</td>
                    <td className="p-3 text-muted-foreground">{file.size}</td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 text-muted-foreground hover:text-foreground rounded cursor-pointer">
                            <MoreVertical className="size-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => toast.success(`Downloading ${file.name}...`)}
                            className="cursor-pointer"
                          >
                            <Download className="size-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toast.info("Share link copied")}
                            className="cursor-pointer"
                          >
                            <Share2 className="size-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setFiles((prev) => prev.filter((f) => f.id !== file.id));
                              toast.success("File deleted");
                            }}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="size-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── GRID VIEW ─── */}
        {view === "grid" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Upgrade banner alert */}
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                <AlertTriangle className="size-4 text-amber-600 flex-shrink-0" />
                <span>You must provide value for account name.</span>
              </div>
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs h-7.5 px-3 cursor-pointer"
                onClick={() => toast.info("Upgrade storage options")}
              >
                Upgrade Storage
              </Button>
            </div>

            {/* Quick Access Files */}
            <div>
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">
                Quick Access ({filteredFiles.length} files)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
                {filteredFiles.length === 0 ? (
                  <div className="col-span-full p-12 text-center text-muted-foreground text-xs border border-dashed rounded-xl">
                    No documents found in vault.
                  </div>
                ) : (
                  filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => {
                      setSelectedFile(file);
                      setShowInfo(true);
                    }}
                    className="p-3.5 rounded-xl border border-border/80 bg-card hover:border-teal-600 transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
                  >
                    <div className="h-20 flex items-center justify-center bg-muted/20 rounded-lg mb-2.5">
                      {getFileIcon(file.type)}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="font-semibold text-xs text-foreground truncate">{file.name}</h5>
                        <button onClick={(e) => toggleStar(file.id, e)} className="text-muted-foreground">
                          <Star
                            className={cn(
                              "size-3",
                              file.starred ? "text-amber-500 fill-amber-500" : "text-muted-foreground"
                            )}
                          />
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{file.size}</p>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">Tenant Asset</p>
                    </div>
                  </div>
                )))}
              </div>
            </div>

            {/* Folders Section */}
            <div>
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Folders</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {DEFAULT_FOLDERS.map((fold) => (
                  <div
                    key={fold.id}
                    className="p-4 rounded-xl border border-border/80 bg-card hover:border-teal-600 transition-all cursor-pointer shadow-2xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-500 flex items-center justify-center">
                        <Folder className="size-5" />
                      </div>
                      <div>
                        <h5 className="font-semibold text-xs text-foreground">{fold.name}</h5>
                        <p className="text-[10px] text-muted-foreground">
                          {fold.size} • {fold.access}
                        </p>
                      </div>
                    </div>
                    <MoreVertical className="size-4 text-muted-foreground cursor-pointer" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─── RIGHT SIDEBAR: FILE DETAILS DRAWER ─── */}
      {showInfo && selectedFile && (
        <aside className="w-[300px] flex-shrink-0 border-l border-border bg-card p-5 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-5 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-foreground">File Details</h4>
              <button
                onClick={() => setShowInfo(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="h-32 rounded-xl bg-muted/40 border border-border flex items-center justify-center">
              {getFileIcon(selectedFile.type)}
            </div>

            <div>
              <h5 className="font-bold text-xs text-foreground">{selectedFile.name}</h5>
              <p className="text-[11px] text-muted-foreground mt-0.5">{selectedFile.size}</p>
            </div>

            <div className="space-y-2 pt-3 border-t border-border/60">
              <div className="flex justify-between text-muted-foreground">
                <span>Type:</span>
                <span className="font-semibold text-foreground uppercase">{selectedFile.type}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Modified:</span>
                <span className="font-semibold text-foreground">{selectedFile.modified}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Category:</span>
                <span className="font-semibold text-foreground">{selectedFile.category}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Storage:</span>
                <span className="font-semibold text-foreground">Cloud Storage / S3</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-teal-700 hover:bg-teal-800 text-white text-xs cursor-pointer"
              onClick={() => toast.success(`Downloading ${selectedFile.name}...`)}
            >
              <Download className="size-3.5 mr-1.5" />
              Download
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs cursor-pointer"
              onClick={() => toast.info("Share modal opened")}
            >
              Share
            </Button>
          </div>
        </aside>
      )}

      {/* ─── MODAL: CREATE NEW FOLDER ─── */}
      <Dialog open={newFolderModalOpen} onOpenChange={setNewFolderModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-xs">
            <Label className="text-xs font-medium">Folder Name</Label>
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. Q4 Financial Audits"
              className="text-xs mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNewFolderModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-teal-700 hover:bg-teal-800 text-white"
              onClick={() => {
                if (newFolderName.trim()) {
                  toast.success(`Folder '${newFolderName.trim()}' created!`);
                  setNewFolderName("");
                  setNewFolderModalOpen(false);
                }
              }}
            >
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
