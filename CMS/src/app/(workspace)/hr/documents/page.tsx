"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapArray } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Filter,
  Box,
  Globe,
  Clock,
  Bell,
  Eye,
  Calendar,
  Download,
  MoreVertical,
  Edit,
  RefreshCw,
  Trash2,
  FolderOpen,
  FileText,
  CheckCircle2,
  Archive,
  XCircle,
  AlertTriangle,
  LayoutGrid,
  Image as ImageIcon,
  X,
  RotateCcw,
} from "lucide-react";

interface CategoryOption {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

interface HrDocumentItem {
  id: string;
  documentCode?: string;
  title: string;
  description?: string;
  notes?: string;
  categoryId?: string | null;
  category: string;
  categoryColor?: string;
  categoryIcon?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  fileType?: string;
  status: "draft" | "under_review" | "approved" | "published" | "archived" | "expired" | string;
  requiresAcknowledgment: boolean;
  version: string;
  downloadCount: number;
  effectiveDate?: string;
  expiryDate?: string;
  lastUpdate?: string;
  uploadedByName?: string;
  uploadedByEmail?: string;
  uploadedByAvatar?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

const STATUS_OPTIONS = [
  { key: "draft", label: "Draft", icon: FileText },
  { key: "under_review", label: "Under Review", icon: Clock },
  { key: "approved", label: "Approved", icon: CheckCircle2 },
  { key: "published", label: "Published", icon: Eye },
  { key: "archived", label: "Archived", icon: Archive },
  { key: "expired", label: "Expired", icon: AlertTriangle },
] as const;

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "C";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function isImageUrl(url?: string, fileName?: string, fileType?: string) {
  if (fileType?.startsWith("image/")) return true;
  const target = (fileName || url || "").toLowerCase();
  return /\.(png|jpe?g|gif|webp|svg)$/.test(target);
}

function DocStatusBadge({ status }: { status: string }) {
  const s = String(status || "published").toLowerCase();
  const map: Record<string, { label: string; cls: string }> = {
    published: {
      label: "Published",
      cls: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    },
    expired: {
      label: "Expired",
      cls: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    },
    draft: {
      label: "Draft",
      cls: "bg-slate-500/10 text-slate-600 border-slate-500/20",
    },
    under_review: {
      label: "Under Review",
      cls: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    },
    approved: {
      label: "Approved",
      cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    },
    archived: {
      label: "Archived",
      cls: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
    },
  };
  const info = map[s] || map.published;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${info.cls}`}
    >
      {info.label}
    </span>
  );
}

export default function HrDocumentsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeTab, setActiveTab] = useState<
    "all" | "draft" | "under_review" | "approved" | "published" | "archived" | "expired"
  >("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<HrDocumentItem | null>(null);
  const [viewTarget, setViewTarget] = useState<HrDocumentItem | null>(null);
  const [statusTarget, setStatusTarget] = useState<HrDocumentItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HrDocumentItem | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFileName, setFormFileName] = useState("");
  const [formFileUrl, setFormFileUrl] = useState("");
  const [formFileSize, setFormFileSize] = useState("");
  const [formFileType, setFormFileType] = useState("");
  const [formEffectiveDate, setFormEffectiveDate] = useState("");
  const [formExpiryDate, setFormExpiryDate] = useState("");
  const [formRequiresAck, setFormRequiresAck] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [nextStatus, setNextStatus] = useState("published");

  const { data: documents = [], isLoading } = useQuery<HrDocumentItem[]>({
    queryKey: ["hr-company-documents"],
    queryFn: async () => {
      const res = await api.get("/hr/documents");
      return unwrapArray<HrDocumentItem>(res);
    },
  });

  const { data: categories = [] } = useQuery<CategoryOption[]>({
    queryKey: ["hr-document-categories-for-vault"],
    queryFn: async () => {
      const res = await api.get("/hr/documents/categories");
      return unwrapArray<CategoryOption>(res);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      id?: string;
      title: string;
      categoryId: string;
      description?: string;
      fileName: string;
      fileUrl?: string;
      fileSize?: string;
      fileType?: string;
      effectiveDate?: string;
      expiryDate?: string;
      requiresAcknowledgment: boolean;
    }) => {
      if (payload.id) {
        return api.put(`/hr/documents/${payload.id}`, payload);
      }
      return api.post("/hr/documents", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-company-documents"] });
      toast.success(editTarget ? "Document updated." : "Document uploaded.");
      setFormOpen(false);
      setEditTarget(null);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to save document.");
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return api.patch(`/hr/documents/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-company-documents"] });
      toast.success("Document status updated.");
      setStatusTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update status.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/hr/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-company-documents"] });
      toast.success("Document deleted.");
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to delete document.");
    },
  });

  function resetForm() {
    setFormTitle("");
    setFormCategoryId("");
    setFormDescription("");
    setFormFileName("");
    setFormFileUrl("");
    setFormFileSize("");
    setFormFileType("");
    setFormEffectiveDate("");
    setFormExpiryDate("");
    setFormRequiresAck(false);
  }

  function openUpload() {
    resetForm();
    setEditTarget(null);
    setFormOpen(true);
  }

  function openEdit(doc: HrDocumentItem) {
    setEditTarget(doc);
    setFormTitle(doc.title || "");
    const matchedCat =
      doc.categoryId ||
      categories.find((c) => c.name.toLowerCase() === (doc.category || "").toLowerCase())?.id ||
      "";
    setFormCategoryId(matchedCat);
    setFormDescription(doc.description || doc.notes || "");
    setFormFileName(doc.fileName || "");
    setFormFileUrl(doc.fileUrl || "");
    setFormFileSize(doc.fileSize || "");
    setFormFileType(doc.fileType || "");
    setFormEffectiveDate(doc.effectiveDate || "");
    setFormExpiryDate(doc.expiryDate || "");
    setFormRequiresAck(Boolean(doc.requiresAcknowledgment));
    setFormOpen(true);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "hr-documents");
      const uploaded: any = await api.upload("/v1/media/upload", fd);
      const url = uploaded?.url || uploaded?.fileUrl || uploaded?.data?.url || "";
      setFormFileName(file.name);
      setFormFileUrl(url);
      setFormFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
      setFormFileType(file.type || "application/octet-stream");
      toast.success(`${file.name} uploaded.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || "File upload failed.");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDownload(doc: HrDocumentItem) {
    try {
      await api.post(`/hr/documents/${doc.id}/download`, {});
      queryClient.invalidateQueries({ queryKey: ["hr-company-documents"] });
    } catch {
      // non-blocking counter update
    }
    if (doc.fileUrl) {
      window.open(doc.fileUrl, "_blank", "noopener,noreferrer");
    } else {
      toast.info("No downloadable file attached to this document.");
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error("Document Title is required.");
      return;
    }
    if (!formCategoryId) {
      toast.error("Please select a category.");
      return;
    }
    if (!editTarget && !formFileName.trim()) {
      toast.error("Please select a document file.");
      return;
    }
    saveMutation.mutate({
      id: editTarget?.id,
      title: formTitle.trim(),
      categoryId: formCategoryId,
      description: formDescription.trim() || undefined,
      fileName: formFileName.trim() || `${formTitle.trim().replace(/\s+/g, "_")}.pdf`,
      fileUrl: formFileUrl || undefined,
      fileSize: formFileSize || undefined,
      fileType: formFileType || undefined,
      effectiveDate: formEffectiveDate || undefined,
      expiryDate: formExpiryDate || undefined,
      requiresAcknowledgment: formRequiresAck,
    });
  }

  function clearFilters() {
    setSearch("");
    setSelectedCategory("all");
    setActiveTab("all");
    setPage(1);
  }

  // KPI metrics
  const kpis = useMemo(() => {
    const total = documents.length;
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    let published = 0;
    let expiringSoon = 0;
    let needsAck = 0;

    for (const d of documents) {
      const s = String(d.status || "").toLowerCase();
      if (s === "published") published += 1;
      if (d.requiresAcknowledgment) needsAck += 1;
      if (d.expiryDate && s !== "expired" && s !== "archived") {
        const expMs = new Date(d.expiryDate).getTime();
        if (!Number.isNaN(expMs) && expMs >= now && expMs - now <= thirtyDaysMs) {
          expiringSoon += 1;
        }
      }
    }

    const publishedPct = total > 0 ? Math.round((published / total) * 100) : 0;
    const ackPct = total > 0 ? Math.round((needsAck / total) * 100) : 0;
    return { total, published, publishedPct, expiringSoon, needsAck, ackPct };
  }, [documents]);

  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((d) => {
      if (selectedCategory !== "all") {
        const catMatch =
          d.categoryId === selectedCategory ||
          d.category.toLowerCase() ===
            (categories.find((c) => c.id === selectedCategory)?.name || "").toLowerCase();
        if (!catMatch) return false;
      }
      if (q) {
        const hay = `${d.title} ${d.description || ""} ${d.category} ${d.fileName || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [documents, search, selectedCategory, categories]);

  const tabCounts = useMemo(() => {
    const counts = {
      all: baseFiltered.length,
      draft: 0,
      under_review: 0,
      approved: 0,
      published: 0,
      archived: 0,
      expired: 0,
    };
    for (const d of baseFiltered) {
      const s = String(d.status || "published").toLowerCase() as keyof typeof counts;
      if (s in counts && s !== "all") {
        counts[s] += 1;
      }
    }
    return counts;
  }, [baseFiltered]);

  const filteredDocs = useMemo(() => {
    if (activeTab === "all") return baseFiltered;
    return baseFiltered.filter((d) => String(d.status || "").toLowerCase() === activeTab);
  }, [baseFiltered, activeTab]);

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (selectedCategory !== "all" ? 1 : 0) +
    (activeTab !== "all" ? 1 : 0);

  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredDocs.slice(start, start + pageSize);
  }, [filteredDocs, safePage, pageSize]);

  const startIdx = filteredDocs.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIdx = Math.min(safePage * pageSize, filteredDocs.length);

  const tabs: Array<{
    key: "all" | "draft" | "under_review" | "approved" | "published" | "archived" | "expired";
    label: string;
    count: number;
    icon: React.ReactNode;
  }> = [
    { key: "all", label: "All", count: tabCounts.all, icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { key: "draft", label: "Draft", count: tabCounts.draft, icon: <FileText className="h-3.5 w-3.5" /> },
    {
      key: "under_review",
      label: "Under Review",
      count: tabCounts.under_review,
      icon: <Search className="h-3.5 w-3.5" />,
    },
    {
      key: "approved",
      label: "Approved",
      count: tabCounts.approved,
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    {
      key: "published",
      label: "Published",
      count: tabCounts.published,
      icon: <Globe className="h-3.5 w-3.5" />,
    },
    {
      key: "archived",
      label: "Archived",
      count: tabCounts.archived,
      icon: <Archive className="h-3.5 w-3.5" />,
    },
    {
      key: "expired",
      label: "Expired",
      count: tabCounts.expired,
      icon: <XCircle className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      <PageHeader
        title="HR Documents"
        description="Store and manage official HR documents for employees."
        actions={
          <Button
            onClick={openUpload}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Upload Document
          </Button>
        }
      />

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs p-5 flex items-center justify-between">
          <div className="space-y-1 z-10">
            <div className="text-xs font-medium text-muted-foreground">Total Documents</div>
            <div className="text-2xl font-bold text-foreground">{kpis.total}</div>
            <div className="text-xs text-muted-foreground">All time</div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-slate-500/10 border border-slate-500/15 text-slate-600 flex items-center justify-center z-10">
            <Box className="h-5 w-5" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs p-5 flex items-center justify-between">
          <div className="space-y-1 z-10">
            <div className="text-xs font-medium text-muted-foreground">Published</div>
            <div className="text-2xl font-bold text-foreground">{kpis.published}</div>
            <div className="text-xs font-medium text-blue-600">{kpis.publishedPct}% of total</div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center z-10">
            <Globe className="h-5 w-5" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs p-5 flex items-center justify-between">
          <div className="space-y-1 z-10">
            <div className="text-xs font-medium text-muted-foreground">Expiring Soon</div>
            <div className="text-2xl font-bold text-foreground">{kpis.expiringSoon}</div>
            <div className="text-xs font-medium text-amber-600">Within 30 days</div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center z-10">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs p-5 flex items-center justify-between">
          <div className="space-y-1 z-10">
            <div className="text-xs font-medium text-muted-foreground">Needs Acknowledgment</div>
            <div className="text-2xl font-bold text-foreground">{kpis.needsAck}</div>
            <div className="text-xs font-medium text-rose-600">{kpis.ackPct}% of total</div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center z-10">
            <Bell className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar + Status Tabs */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-border/60">
          <div className="relative w-full sm:flex-1 sm:min-w-[200px] max-w-xs">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search..."
              className="pl-9 h-9"
            />
          </div>

          <Select
            value={selectedCategory}
            onValueChange={(v) => {
              setSelectedCategory(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[190px] h-9">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center justify-end gap-2">
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Clear Filters
              </Button>
            )}
            <Button
              variant={activeFilterCount > 0 ? "primary" : "outline"}
              size="sm"
              onClick={clearFilters}
              className={`h-9 gap-1.5 ${
                activeFilterCount > 0
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                  : ""
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white text-emerald-700 px-1 text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="px-4 flex items-center gap-1 overflow-x-auto bg-card">
          {tabs.map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setActiveTab(t.key);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-2 px-3 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    active
                      ? "bg-emerald-600 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Document Cards Grid OR Empty State */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-52 rounded-xl border border-border/80 bg-card animate-pulse"
            />
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <div className="py-20 px-6 flex flex-col items-center justify-center text-center">
          <div className="h-16 w-16 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground mb-4">
            <FolderOpen className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-foreground mb-1">No documents found</h3>
          <p className="text-sm text-muted-foreground mb-5">
            Upload your first document to get started
          </p>
          <Button
            onClick={openUpload}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Upload Document
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {paginated.map((doc) => {
              const catColor = doc.categoryColor || "#3B82F6";
              const uploaderName = doc.uploadedByName || "Company";
              const isExpired = String(doc.status).toLowerCase() === "expired";

              return (
                <div
                  key={doc.id}
                  className="rounded-xl border border-border/80 bg-card shadow-xs hover:shadow-sm transition-shadow flex flex-col justify-between p-4"
                >
                  <div className="space-y-3">
                    {/* Title + Eye */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm text-foreground leading-snug line-clamp-2">
                        {doc.title}
                      </h3>
                      <button
                        type="button"
                        title="View Document Details"
                        onClick={() => setViewTarget(doc)}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Last Update */}
                    <div className="space-y-0.5 text-xs text-muted-foreground">
                      <div>Last Update:</div>
                      <div className="inline-flex items-center gap-1.5 text-foreground/80 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {doc.lastUpdate || "-"}
                      </div>
                    </div>

                    {/* Category Pill + Version + Bell */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-medium border truncate max-w-[70%]"
                        style={{
                          backgroundColor: `${catColor}18`,
                          color: catColor,
                          borderColor: `${catColor}35`,
                        }}
                      >
                        {doc.category}
                      </span>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/80 shrink-0">
                        <span>v.{doc.version || "1.0"}</span>
                        {doc.requiresAcknowledgment && (
                          <span title="Requires Acknowledgment">
                            <Bell className="h-3.5 w-3.5 text-rose-500" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Badge + Expiry warning */}
                    <div className="space-y-1.5">
                      <div>
                        <DocStatusBadge status={doc.status} />
                      </div>
                      {isExpired && doc.expiryDate && (
                        <div className="text-[11px] font-medium text-rose-600">
                          Expires: {doc.expiryDate}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {doc.uploadedByAvatar ? (
                        <img
                          src={doc.uploadedByAvatar}
                          alt={uploaderName}
                          className="h-7 w-7 rounded-full object-cover border border-border/60 shrink-0"
                        />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center border border-primary/20 shrink-0">
                          {getInitials(uploaderName)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-foreground truncate">
                          {uploaderName}
                        </div>
                        {doc.uploadedByEmail && (
                          <div className="text-[10px] text-muted-foreground truncate">
                            {doc.uploadedByEmail}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground px-1">
                        <Download className="h-3 w-3" />
                        {doc.downloadCount ?? 0}
                      </span>
                      <button
                        type="button"
                        title="Download Document"
                        onClick={() => handleDownload(doc)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => openEdit(doc)}>
                            <Edit className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setNextStatus(doc.status || "published");
                              setStatusTarget(doc);
                            }}
                          >
                            <RefreshCw className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                            Update Status
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(doc)}
                            className="text-rose-600 focus:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Bar */}
          <div className="rounded-xl border border-border/80 bg-card shadow-xs px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <div>
              Showing <span className="font-semibold text-foreground">{startIdx}</span> to{" "}
              <span className="font-semibold text-foreground">{endIdx}</span> of{" "}
              <span className="font-semibold text-foreground">{filteredDocs.length}</span> results
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(Number(v));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12</SelectItem>
                    <SelectItem value="24">24</SelectItem>
                    <SelectItem value="48">48</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="xs"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  « Previous
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(Math.max(0, safePage - 3), Math.min(totalPages, safePage + 2))
                  .map((pNum) => (
                    <Button
                      key={pNum}
                      variant={pNum === safePage ? "primary" : "outline"}
                      size="xs"
                      className={
                        pNum === safePage
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                          : ""
                      }
                      onClick={() => setPage(pNum)}
                    >
                      {pNum}
                    </Button>
                  ))}
                <Button
                  variant="outline"
                  size="xs"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next »
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Upload New Document / Edit Document Modal */}
      <Dialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) {
            setEditTarget(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit Document" : "Upload New Document"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {!editTarget && (
              <div className="text-xs font-semibold text-foreground">Basic Information</div>
            )}

            <div className="space-y-1.5">
              <Label>
                Document Title <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Employee Handbook 2024"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Category <span className="text-rose-500">*</span>
              </Label>
              <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief description of the document contents and purpose"
              />
            </div>

            {/* File Upload Section */}
            <div className="pt-1 space-y-2">
              <div className="text-xs font-semibold text-foreground">File Upload</div>
              <Label>
                File {!editTarget && <span className="text-rose-500">*</span>}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  value={formFileName}
                  readOnly
                  placeholder="Select document file..."
                  className="flex-1 bg-muted/20"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadingFile}
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5 shrink-0"
                >
                  <ImageIcon className="h-4 w-4" />
                  {uploadingFile ? "Uploading..." : "Browse"}
                </Button>
                {formFileName && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormFileName("");
                      setFormFileUrl("");
                      setFormFileSize("");
                      setFormFileType("");
                    }}
                    className="h-9 w-9 p-0 shrink-0"
                    title="Clear file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {formFileUrl && isImageUrl(formFileUrl, formFileName, formFileType) && (
                <div className="mt-2">
                  <img
                    src={formFileUrl}
                    alt={formFileName}
                    className="h-24 w-36 object-cover rounded-lg border border-border/80 bg-muted/20"
                  />
                </div>
              )}
            </div>

            {/* Validity & Settings */}
            <div className="pt-1 space-y-3">
              <div className="text-xs font-semibold text-foreground">Validity &amp; Settings</div>

              <div className="space-y-1.5">
                <Label>Effective Date</Label>
                <Input
                  type="date"
                  value={formEffectiveDate}
                  onChange={(e) => setFormEffectiveDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={formExpiryDate}
                  onChange={(e) => setFormExpiryDate(e.target.value)}
                />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={formRequiresAck}
                  onChange={(e) => setFormRequiresAck(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-emerald-600"
                />
                <span className="text-sm font-medium text-foreground">
                  Requires Acknowledgment
                </span>
              </label>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending || uploadingFile}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Document Status Modal (6-step icon stepper + dropdown) */}
      <Dialog open={Boolean(statusTarget)} onOpenChange={(o) => !o && setStatusTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Update Document Status</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Visual 6-icon Status Row */}
            <div className="grid grid-cols-6 gap-2 text-center">
              {STATUS_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = nextStatus === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setNextStatus(opt.key)}
                    className="flex flex-col items-center gap-1.5 group focus:outline-none"
                  >
                    <div
                      className={`h-11 w-11 rounded-full flex items-center justify-center transition-colors ${
                        selected
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 group-hover:bg-slate-200 dark:bg-muted dark:text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span
                      className={`text-[11px] leading-tight ${
                        selected
                          ? "font-semibold text-blue-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <Label>
                Status <span className="text-rose-500">*</span>
              </Label>
              <Select value={nextStatus} onValueChange={setNextStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStatusTarget(null)}>
                Cancel
              </Button>
              <Button
                disabled={statusMutation.isPending}
                onClick={() =>
                  statusTarget &&
                  statusMutation.mutate({ id: statusTarget.id, status: nextStatus })
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {statusMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Document Details Modal */}
      <Dialog open={Boolean(viewTarget)} onOpenChange={(o) => !o && setViewTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewTarget?.title || "Document Details"}</DialogTitle>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <DocStatusBadge status={viewTarget.status} />
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                  {viewTarget.category}
                </span>
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  v.{viewTarget.version || "1.0"}
                </span>
                {viewTarget.requiresAcknowledgment && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 text-rose-600 border border-rose-500/20 px-2 py-0.5 text-xs font-medium">
                    <Bell className="h-3 w-3" />
                    Requires Acknowledgment
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground mb-0.5">Effective Date</div>
                  <div className="font-medium text-foreground">
                    {viewTarget.effectiveDate || viewTarget.lastUpdate || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-0.5">Expiry Date</div>
                  <div className="font-medium text-foreground">
                    {viewTarget.expiryDate || "No expiry"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-0.5">File Name</div>
                  <div className="font-medium text-foreground truncate">
                    {viewTarget.fileName || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-0.5">Downloads</div>
                  <div className="font-medium text-foreground">
                    {viewTarget.downloadCount ?? 0}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Description</div>
                <div className="rounded-lg border border-border/80 bg-muted/30 p-3 text-foreground whitespace-pre-wrap">
                  {viewTarget.description || viewTarget.notes || "No description provided."}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setViewTarget(null)}>
                  Close
                </Button>
                <Button
                  onClick={() => handleDownload(viewTarget)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">{deleteTarget?.title}</span>? This
            action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
