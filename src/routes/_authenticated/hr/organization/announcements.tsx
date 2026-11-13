import React, { useState } from "react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { StandardPagination } from "@/components/ui/standard-pagination";
import {
  exportToExcel,
  exportToPdf,
  ExportColumn,
  exportAnnouncementAnalyticsExcel,
  exportAnnouncementAnalyticsCsv,
  exportAnnouncementAnalyticsPdf,
} from "@/lib/export-utils";
import { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/document-export-icons";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Megaphone,
  Plus,
  PlusCircle,
  Pencil,
  Edit2,
  Trash2,
  Pin,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Download,
  Eye,
  BarChart3,
  Layers,
  Search,
  Filter,
  Calendar,
  CalendarClock,
  Building2,
  GitBranch,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Flame,
  Clock,
  Send,
  Users,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Tag,
  Tags,
  Check,
  X,
  Sparkles,
  AlignLeft,
  FileText,
  FileSpreadsheet,
  Flag,
  Paperclip,
  Loader2,
} from "lucide-react";
import { createFileRoute } from '@tanstack/react-router';
import { RichTextEditor, FormattedAnnouncementContent } from "@/components/announcements/rich-text-editor";

interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  icon: string;
  isActive: boolean;
  displayOrder: number;
  _count?: { announcements: number };
}

interface AnnouncementRecord {
  id: string;
  title: string;
  summary?: string;
  content: string;
  category: string;
  categoryId?: string;
  categoryModel?: CategoryRecord;
  priority: string;
  status: string;
  targetType: string;
  targetDepartmentId?: string;
  targetBranchId?: string;
  targetDepartment?: { id: string; name: string };
  targetBranch?: { id: string; name: string };
  isPinned: boolean;
  publishDate: string;
  expiryDate?: string;
  authorName: string;
  acknowledgementRequired: boolean;
  viewCount: number;
  totalEligibleEmployees?: number;
  uniqueViewsCount?: number;
  acknowledgementCount?: number;
  acknowledgements?: Array<{ id: string; employeeId: string; acknowledgedAt: string }>;
  views?: Array<{ id: string; employeeId: string; viewCount: number }>;
}


export const Route = createFileRoute("/_authenticated/hr/organization/announcements")({
  component: AnnouncementsPage,
  head: () => ({
    meta: [{ title: "Company Announcements — Master HRMS" }],
  }),
});

export default function AnnouncementsPage() {
  const qc = useQueryClient();

  // Filters & State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Active records for modals
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [formId, setFormId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formCategorySlug, setFormCategorySlug] = useState("company_news");
  const [formSummary, setFormSummary] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formPriority, setFormPriority] = useState("normal");
  const [formStatus, setFormStatus] = useState("published");
  const [formTargetType, setFormTargetType] = useState("all_company");
  const [formTargetDepartmentId, setFormTargetDepartmentId] = useState("");
  const [formTargetBranchId, setFormTargetBranchId] = useState("");
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formAckRequired, setFormAckRequired] = useState(false);
  const [formPublishDate, setFormPublishDate] = useState(new Date().toISOString().slice(0, 10));
  const [formExpiryDate, setFormExpiryDate] = useState("");
  const [formAttachmentUrl, setFormAttachmentUrl] = useState("");

  // Category CRUD Form State
  const [catFormId, setCatFormId] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catDescription, setCatDescription] = useState("");
  const [catColor, setCatColor] = useState("#3B82F6");
  const [catIcon, setCatIcon] = useState("ph-megaphone");
  const [catIsActive, setCatIsActive] = useState(true);
  const [catDisplayOrder, setCatDisplayOrder] = useState(0);

  // Analytics tab
  const [analyticsSubTab, setAnalyticsSubTab] = useState<"roster" | "department" | "branch">("roster");
  const [rosterSearch, setRosterSearch] = useState("");

  // 1. Fetch categories
  const { data: categories = [], refetch: refetchCategories } = useQuery({
    queryKey: ["announcement-categories"],
    queryFn: async () => {
      const res = await api.get("/announcements/categories");
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  // 2. Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ["hr-departments"],
    queryFn: async () => {
      try {
        const res = await api.get("/hr/organization/departments");
        return Array.isArray(res) ? res : res?.data || [];
      } catch {
        return [];
      }
    },
  });

  // 3. Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ["hr-branches"],
    queryFn: async () => {
      try {
        const res = await api.get("/hr/organization/branches");
        return Array.isArray(res) ? res : res?.data || [];
      } catch {
        return [];
      }
    },
  });

  // 4. Fetch Summary Metrics
  const { data: summaryMetrics } = useQuery({
    queryKey: ["announcements-summary-metrics"],
    queryFn: async () => {
      try {
        const res = await api.get("/announcements/summary/stats");
        return res;
      } catch {
        return {
          totalAnnouncements: 0,
          publishedCount: 0,
          draftCount: 0,
          scheduledCount: 0,
          expiredCount: 0,
          archivedCount: 0,
          complianceRate: 100,
        };
      }
    },
  });

  // 5. Fetch Announcements
  const { data: announcementsData, isLoading, refetch } = useQuery({
    queryKey: ["hr-announcements", search, statusFilter, categoryFilter, priorityFilter, departmentFilter, branchFilter, page, pageSize],
    queryFn: async () => {
      const params: any = {
        page,
        limit: pageSize,
      };
      if (search) params.search = search;
      if (statusFilter !== "all") params.status = statusFilter;
      if (categoryFilter !== "all") params.category = categoryFilter;
      if (priorityFilter !== "all") params.priority = priorityFilter;
      if (departmentFilter !== "all") params.departmentId = departmentFilter;
      if (branchFilter !== "all") params.branchId = branchFilter;

      const res = await api.get("/announcements", { params });
      return res;
    },
  });

  const announcements: AnnouncementRecord[] = Array.isArray(announcementsData)
    ? announcementsData
    : (announcementsData?.data as any) || (announcementsData?.items as any) || [];
  const totalCount = announcementsData?.total ?? announcements.length;

  // 6. Fetch dedicated analytics for selected announcement
  const { data: analyticsData, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ["announcement-analytics", selectedAnnouncement?.id],
    enabled: Boolean(isAnalyticsModalOpen && selectedAnnouncement?.id),
    queryFn: async () => {
      const res = await api.get(`/announcements/${selectedAnnouncement!.id}/analytics`);
      return res;
    },
  });

  // Save Announcement Mutation
  const saveAnnouncementMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (formId) {
        return await api.put(`/announcements/${formId}`, payload);
      }
      return await api.post("/announcements", payload);
    },
    onSuccess: () => {
      toast.success(formId ? "Announcement updated successfully" : "Announcement created successfully");
      setIsFormDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["hr-announcements"] });
      qc.invalidateQueries({ queryKey: ["announcements-summary-metrics"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save announcement");
    },
  });

  // Delete Announcement Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/announcements/${id}`);
    },
    onSuccess: () => {
      toast.success("Announcement deleted successfully");
      setIsDeleteDialogOpen(false);
      setDeletingId(null);
      qc.invalidateQueries({ queryKey: ["hr-announcements"] });
      qc.invalidateQueries({ queryKey: ["announcements-summary-metrics"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete announcement");
    },
  });

  // Bulk Action Mutation
  const bulkMutation = useMutation({
    mutationFn: async ({ action, ids }: { action: string; ids: string[] }) => {
      return await api.post("/announcements/bulk", { action, ids });
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || "Bulk action completed");
      setSelectedIds([]);
      qc.invalidateQueries({ queryKey: ["hr-announcements"] });
      qc.invalidateQueries({ queryKey: ["announcements-summary-metrics"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Bulk action failed");
    },
  });

  // Save Category Mutation
  const saveCategoryMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (catFormId) {
        return await api.put(`/announcements/categories/${catFormId}`, payload);
      }
      return await api.post("/announcements/categories", payload);
    },
    onSuccess: () => {
      toast.success(catFormId ? "Category updated" : "Category created");
      resetCategoryForm();
      refetchCategories();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save category");
    },
  });

  // Delete Category Mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/announcements/categories/${id}`);
    },
    onSuccess: () => {
      toast.success("Category deleted");
      refetchCategories();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete category");
    },
  });

  // Form Reset
  const resetForm = () => {
    setFormId(null);
    setFormTitle("");
    setFormCategoryId(categories[0]?.id || "");
    setFormCategorySlug(categories[0]?.slug || "company_news");
    setFormSummary("");
    setFormContent("");
    setFormPriority("normal");
    setFormStatus("published");
    setFormTargetType("all_company");
    setFormTargetDepartmentId("");
    setFormTargetBranchId("");
    setFormIsPinned(false);
    setFormAckRequired(false);
    setFormPublishDate(new Date().toISOString().slice(0, 10));
    setFormExpiryDate("");
    setFormAttachmentUrl("");
  };

  const openCreateModal = () => {
    resetForm();
    setIsFormDialogOpen(true);
  };

  const openEditModal = (item: AnnouncementRecord) => {
    setFormId(item.id);
    setFormTitle(item.title);
    setFormCategoryId(item.categoryId || "");
    setFormCategorySlug(item.category || "company_news");
    setFormSummary(item.summary || "");
    setFormContent(item.content || "");
    setFormPriority(item.priority || "normal");
    setFormStatus(item.status || "published");
    setFormTargetType(item.targetType || "all_company");
    setFormTargetDepartmentId(item.targetDepartmentId || "");
    setFormTargetBranchId(item.targetBranchId || "");
    setFormIsPinned(item.isPinned || false);
    setFormAckRequired(item.acknowledgementRequired || false);
    setFormPublishDate(item.publishDate ? item.publishDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setFormExpiryDate(item.expiryDate ? item.expiryDate.slice(0, 10) : "");
    setIsFormDialogOpen(true);
  };

  const handleSaveForm = (statusOverride?: string) => {
    if (!formTitle.trim()) {
      toast.error("Announcement title is required.");
      return;
    }
    if (!formContent.trim()) {
      toast.error("Announcement content is required.");
      return;
    }

    const payload = {
      title: formTitle.trim(),
      summary: formSummary.trim() || undefined,
      content: formContent,
      category: formCategorySlug,
      categoryId: formCategoryId || undefined,
      priority: formPriority,
      status: statusOverride || formStatus,
      targetType: formTargetType,
      targetDepartmentId: formTargetType === "department" || formTargetType === "custom" ? formTargetDepartmentId || null : null,
      targetBranchId: formTargetType === "branch" || formTargetType === "custom" ? formTargetBranchId || null : null,
      isPinned: formIsPinned,
      acknowledgementRequired: formAckRequired,
      publishDate: formPublishDate ? new Date(formPublishDate).toISOString() : new Date().toISOString(),
      expiryDate: formExpiryDate ? new Date(formExpiryDate).toISOString() : null,
      attachmentUrl: formAttachmentUrl.trim() || null,
    };

    saveAnnouncementMutation.mutate(payload);
  };

  const resetCategoryForm = () => {
    setCatFormId(null);
    setCatName("");
    setCatSlug("");
    setCatDescription("");
    setCatColor("#3B82F6");
    setCatIcon("ph-megaphone");
    setCatIsActive(true);
    setCatDisplayOrder(0);
  };

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(announcements.map((a) => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // Export handlers
  const announcementExportColumns: ExportColumn<AnnouncementRecord>[] = [
    { header: "Title", key: "title", width: 30 },
    { header: "Category", key: "category", width: 18, format: (v) => String(v).replace(/_/g, " ") },
    { header: "Priority", key: "priority", width: 12 },
    { header: "Status", key: "status", width: 14 },
    { header: "Scope", key: "targetType", width: 20 },
    { header: "Publish Date", key: "publishDate", width: 16, format: (v) => (v ? new Date(v).toISOString().split("T")[0] : "") },
    { header: "Expiry Date", key: "expiryDate", width: 16, format: (v) => (v ? new Date(v).toISOString().split("T")[0] : "-") },
    { header: "Ack Required", key: "acknowledgementRequired", width: 14, format: (v) => (v ? "Yes" : "No") },
    { header: "Views", key: "viewCount", width: 10 },
  ];

  const handleExportExcel = () => {
    const dataToExport = selectedIds.length > 0
      ? announcements.filter((a) => selectedIds.includes(a.id))
      : announcements;
    exportToExcel({
      filename: `company_announcements_${new Date().toISOString().split("T")[0]}`,
      title: "Company Announcements & Broadcasts",
      subtitle: `Exported on ${format(new Date(), "dd MMMM yyyy HH:mm")}`,
      columns: announcementExportColumns,
      data: dataToExport,
    });
  };

  const handleExportPdf = () => {
    const dataToExport = selectedIds.length > 0
      ? announcements.filter((a) => selectedIds.includes(a.id))
      : announcements;
    exportToPdf({
      filename: `company_announcements_${new Date().toISOString().split("T")[0]}`,
      title: "Company Announcements",
      subtitle: `Official Broadcaster Audit Report`,
      columns: announcementExportColumns,
      data: dataToExport,
    });
  };

  const handleExportCsv = () => {
    const dataToExport = selectedIds.length > 0
      ? announcements.filter((a) => selectedIds.includes(a.id))
      : announcements;
    const headers = ["Title", "Category", "Priority", "Status", "Scope", "Publish Date", "Expiry Date", "Ack Required", "Views"];
    const rows = dataToExport.map((a) => [
      `"${a.title.replace(/"/g, '""')}"`,
      `"${a.category}"`,
      `"${a.priority}"`,
      `"${a.status}"`,
      `"${a.targetType}"`,
      `"${a.publishDate ? a.publishDate.slice(0, 10) : ""}"`,
      `"${a.expiryDate ? a.expiryDate.slice(0, 10) : ""}"`,
      `"${a.acknowledgementRequired ? "Yes" : "No"}"`,
      `"${a.viewCount ?? 0}"`,
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `announcements_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const [isExportingAnalytics, setIsExportingAnalytics] = useState(false);

  const handleExportAnalytics = async (formatType: "excel" | "csv" | "pdf") => {
    if (!analyticsData || !selectedAnnouncement) {
      toast.error("No analytics data available to export.");
      return;
    }

    try {
      setIsExportingAnalytics(true);
      // Filter roster by current search query if present, otherwise export full eligible dataset
      const roster = (analyticsData.employeeRoster || []).filter((emp: any) => {
        if (!rosterSearch) return true;
        const q = rosterSearch.toLowerCase();
        return (
          emp.fullName?.toLowerCase().includes(q) ||
          emp.employeeCode?.toLowerCase().includes(q) ||
          emp.department?.toLowerCase().includes(q) ||
          emp.branch?.toLowerCase().includes(q)
        );
      });

      const options = {
        filename: `announcement_audit_${selectedAnnouncement.id}`,
        announcement: analyticsData.announcement || selectedAnnouncement,
        metrics: analyticsData.metrics || {
          totalEligibleEmployees: roster.length,
          uniqueViewsCount: roster.filter((r: any) => r.hasViewed).length,
          viewRate: roster.length > 0 ? Math.round((roster.filter((r: any) => r.hasViewed).length / roster.length) * 100) : 0,
          acknowledgementCount: roster.filter((r: any) => r.hasAcknowledged).length,
          acknowledgementRate: roster.length > 0 ? Math.round((roster.filter((r: any) => r.hasAcknowledged).length / roster.length) * 100) : 0,
          pendingAcknowledgements: selectedAnnouncement.acknowledgementRequired
            ? Math.max(0, roster.length - roster.filter((r: any) => r.hasAcknowledged).length)
            : 0,
        },
        roster,
        departmentBreakdown: analyticsData.departmentBreakdown || [],
        branchBreakdown: analyticsData.branchBreakdown || [],
      };

      if (formatType === "excel") {
        await exportAnnouncementAnalyticsExcel(options);
        toast.success("Excel compliance audit report exported successfully.");
      } else if (formatType === "csv") {
        exportAnnouncementAnalyticsCsv(options);
        toast.success("CSV compliance roster exported successfully.");
      } else if (formatType === "pdf") {
        await exportAnnouncementAnalyticsPdf(options);
        toast.success("PDF audit report generated successfully.");
      }
    } catch (err: any) {
      console.error("Export analytics error:", err);
      toast.error(err.message || "Failed to export analytics report.");
    } finally {
      setIsExportingAnalytics(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "urgent":
        return <Badge variant="destructive" className="gap-1 font-medium capitalize"><Flame className="h-3 w-3" /> Urgent</Badge>;
      case "high":
        return <Badge className="gap-1 font-medium bg-amber-500 hover:bg-amber-600 text-white capitalize"><AlertCircle className="h-3 w-3" /> High</Badge>;
      case "low":
        return <Badge variant="secondary" className="gap-1 font-normal text-muted-foreground capitalize"><Clock className="h-3 w-3" /> Low</Badge>;
      default:
        return <Badge variant="outline" className="gap-1 font-normal capitalize">Normal</Badge>;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "published":
        return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">Published</Badge>;
      case "scheduled":
        return <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30">Scheduled</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "expired":
        return <Badge variant="outline" className="text-muted-foreground">Expired</Badge>;
      case "archived":
        return <Badge variant="outline" className="border-dashed text-muted-foreground">Archived</Badge>;
      default:
        return <Badge variant="outline">{s}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <PageHeader
        title="Company Announcements"
        description="Official broadcasts, corporate communications, and compliance notices."
        icon={<Megaphone className="h-5 w-5" />}
        breadcrumbs={[
          { label: "HR Workspace", href: "/hr" },
          { label: "Organization", href: "/hr/organization" },
          { label: "Announcements" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCategoryModalOpen(true)}
              className="gap-1.5"
            >
              <Tags className="h-4 w-4" />
              Manage Categories
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Download className="h-4 w-4" />
                  Export
                  <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 text-xs">
                <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer py-2">
                  <ExcelIcon className="h-4 w-4" />
                  <span>Export to Excel (.xlsx)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCsv} className="gap-2 cursor-pointer py-2">
                  <CsvIcon className="h-4 w-4" />
                  <span>Export to CSV (.csv)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPdf} className="gap-2 cursor-pointer py-2">
                  <PdfIcon className="h-4 w-4" />
                  <span>Export to PDF Document</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="sm"
              onClick={openCreateModal}
              className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              <Plus className="h-4 w-4" />
              Publish Notice
            </Button>
          </div>
        }
      />

      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Notices</p>
            <p className="text-2xl font-bold mt-1">{summaryMetrics?.totalAnnouncements ?? announcements.length}</p>
          </div>
          <div className="p-2.5 bg-primary/10 rounded-full text-primary">
            <Megaphone className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Published</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
              {summaryMetrics?.publishedCount ?? 0}
            </p>
          </div>
          <div className="p-2.5 bg-emerald-500/10 rounded-full text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Scheduled</p>
            <p className="text-2xl font-bold mt-1 text-sky-600 dark:text-sky-400">
              {summaryMetrics?.scheduledCount ?? 0}
            </p>
          </div>
          <div className="p-2.5 bg-sky-500/10 rounded-full text-sky-600">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Action Required</p>
            <p className="text-2xl font-bold mt-1 text-purple-600 dark:text-purple-400">
              {summaryMetrics?.policyCount ?? 0}
            </p>
          </div>
          <div className="p-2.5 bg-purple-500/10 rounded-full text-purple-600">
            <FileCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Policy Compliance</p>
            <p className="text-2xl font-bold mt-1 text-primary">
              {summaryMetrics?.complianceRate ?? 100}%
            </p>
          </div>
          <div className="p-2.5 bg-primary/10 rounded-full text-primary">
            <Users className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ── Status Tabs ── */}
      <div className="flex border-b overflow-x-auto space-x-1">
        {[
          { key: "all", label: "All Notices", count: summaryMetrics?.totalAnnouncements },
          { key: "published", label: "Published", count: summaryMetrics?.publishedCount },
          { key: "draft", label: "Drafts", count: summaryMetrics?.draftCount },
          { key: "scheduled", label: "Scheduled", count: summaryMetrics?.scheduledCount },
          { key: "expired", label: "Expired", count: summaryMetrics?.expiredCount },
          { key: "archived", label: "Archived", count: summaryMetrics?.archivedCount },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setStatusFilter(tab.key);
              setPage(1);
            }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              statusFilter === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`text-xs px-1.5 py-0.2 rounded-full ${
                statusFilter === tab.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Search & Filter Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-lg border">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notices..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8 h-9 text-sm"
            />
          </div>

          {/* Category Filter */}
          <Select
            value={categoryFilter}
            onValueChange={(val) => {
              setCategoryFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[170px] h-9 text-sm">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c: any) => (
                <SelectItem key={c.id} value={c.slug}>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select
            value={priorityFilter}
            onValueChange={(val) => {
              setPriorityFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[130px] h-9 text-sm">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          {/* Department Filter */}
          <Select
            value={departmentFilter}
            onValueChange={(val) => {
              setDepartmentFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Branch Filter */}
          <Select
            value={branchFilter}
            onValueChange={(val) => {
              setBranchFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((b: any) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(search || statusFilter !== "all" || categoryFilter !== "all" || priorityFilter !== "all" || departmentFilter !== "all" || branchFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setCategoryFilter("all");
              setPriorityFilter("all");
              setDepartmentFilter("all");
              setBranchFilter("all");
              setPage(1);
            }}
            className="text-xs text-muted-foreground"
          >
            Reset Filters
          </Button>
        )}
      </div>

      {/* ── Bulk Actions Bar ── */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-primary">{selectedIds.length}</span>
            <span className="text-muted-foreground">notice(s) selected</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkMutation.mutate({ action: "publish", ids: selectedIds })}
              className="gap-1 text-xs"
            >
              <Send className="h-3.5 w-3.5 text-emerald-600" />
              Publish
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkMutation.mutate({ action: "archive", ids: selectedIds })}
              className="gap-1 text-xs"
            >
              <Layers className="h-3.5 w-3.5 text-amber-600" />
              Archive
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportExcel}
              className="gap-1 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (confirm(`Are you sure you want to delete ${selectedIds.length} selected announcements?`)) {
                  bulkMutation.mutate({ action: "delete", ids: selectedIds });
                }
              }}
              className="gap-1 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
              className="text-xs text-muted-foreground"
            >
              Deselect All
            </Button>
          </div>
        </div>
      )}

      {/* ── Announcements Table ── */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={announcements.length > 0 && selectedIds.length === announcements.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Title & Category</TableHead>
              <TableHead>Target Scope</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Publish Date</TableHead>
              <TableHead>Policy Acknowledgement</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                  Loading announcements...
                </TableCell>
              </TableRow>
            ) : announcements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                  No company announcements found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              announcements.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const ackCount = item.acknowledgements?.length || 0;
                const viewsCount = item.views?.length || item.viewCount || 0;
                const eligibleTotal = item.totalEligibleEmployees || 1;
                const ackRate = item.acknowledgementRequired ? Math.round((ackCount / eligibleTotal) * 100) : 0;

                return (
                  <TableRow key={item.id} className={isSelected ? "bg-muted/40" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleSelect(item.id)}
                      />
                    </TableCell>

                    <TableCell className="max-w-md">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.isPinned && (
                            <Badge variant="outline" className="gap-1 text-primary text-[10px] px-1 py-0 h-4 border-primary/40">
                              <Pin className="h-2.5 w-2.5 rotate-45" />
                              Pinned
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className="text-xs font-normal"
                            style={{
                              borderColor: item.categoryModel?.color ? `${item.categoryModel.color}40` : undefined,
                              backgroundColor: item.categoryModel?.color ? `${item.categoryModel.color}15` : undefined,
                              color: item.categoryModel?.color || undefined,
                            }}
                          >
                            {item.categoryModel?.name || item.category.replace(/_/g, " ")}
                          </Badge>
                        </div>

                        <p
                          className="font-medium text-foreground hover:text-primary cursor-pointer line-clamp-1 text-sm"
                          onClick={() => {
                            setSelectedAnnouncement(item);
                            setIsDetailsModalOpen(true);
                          }}
                        >
                          {item.title}
                        </p>

                        {item.summary && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {item.summary}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                        {item.targetType === "department" ? (
                          <>
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span>Dept: {item.targetDepartment?.name || "Target Dept"}</span>
                          </>
                        ) : item.targetType === "branch" ? (
                          <>
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span>Branch: {item.targetBranch?.name || "Target Branch"}</span>
                          </>
                        ) : item.targetType === "custom" ? (
                          <>
                            <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span>Custom Group</span>
                          </>
                        ) : (
                          <>
                            <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span>All Organization</span>
                          </>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      {getPriorityBadge(item.priority)}
                    </TableCell>

                    <TableCell>
                      {getStatusBadge(item.status)}
                    </TableCell>

                    <TableCell>
                      <div className="space-y-0.5 text-xs">
                        <div className="flex items-center gap-1 text-foreground font-medium">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span>{item.publishDate ? format(new Date(item.publishDate), "dd MMM yyyy") : "-"}</span>
                        </div>
                        {item.expiryDate && (
                          <div className="text-muted-foreground text-[11px]">
                            Exp: {format(new Date(item.expiryDate), "dd MMM yyyy")}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      {item.acknowledgementRequired ? (
                        <div className="space-y-1">
                          <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 text-xs">
                            <FileCheck className="h-3 w-3 mr-1" />
                            Required ({ackCount} signed)
                          </Badge>
                          <div className="flex items-center gap-1.5">
                            <Progress value={ackRate} className="h-1.5 w-20" />
                            <span className="text-[10px] text-muted-foreground">{ackRate}%</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not Required</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedAnnouncement(item);
                            setIsDetailsModalOpen(true);
                          }}
                          className="h-8 w-8 p-0"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(item)}
                          className="h-8 w-8 p-0"
                          title="Edit Notice"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedAnnouncement(item);
                            setIsAnalyticsModalOpen(true);
                          }}
                          className="h-8 w-8 p-0 text-primary"
                          title="Analytics & Roster"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeletingId(item.id);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          title="Delete Notice"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Standard Pagination ── */}
      <StandardPagination
        page={page}
        pageSize={pageSize}
        total={totalCount}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
      />

      {/* ── MODAL 1: Create / Edit Announcement ── */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              {formId ? (
                <Pencil className="h-5 w-5 text-primary shrink-0" />
              ) : (
                <Megaphone className="h-5 w-5 text-primary shrink-0" />
              )}
              <span>{formId ? "Edit Company Announcement" : "Create New Announcement"}</span>
            </DialogTitle>
            <DialogDescription>
              Broadcast critical company information, policy updates, and compliance notices.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Section 1: Announcement Information */}
            <div className="flex items-center gap-2 pb-1 border-b">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Announcement Information</span>
            </div>

            {/* Title & Category */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <Label htmlFor="form-title" className="text-sm font-medium">
                  Announcement Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="form-title"
                  placeholder="e.g. Annual All-Hands Kickoff 2026"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="form-category" className="text-sm font-medium">
                    Category
                  </Label>
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    + Manage
                  </button>
                </div>
                <Select
                  value={formCategorySlug}
                  onValueChange={(val) => {
                    setFormCategorySlug(val);
                    const found = categories.find((c: any) => c.slug === val);
                    if (found) setFormCategoryId(found.id);
                  }}
                >
                  <SelectTrigger id="form-category">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.slug}>
                        <div className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Short Summary */}
            <div className="space-y-1.5">
              <Label htmlFor="form-summary" className="text-sm font-medium">
                Short Description / Executive Summary
              </Label>
              <Textarea
                id="form-summary"
                rows={2}
                placeholder="Brief 1-2 sentence overview shown in dashboard feeds and push banners."
                value={formSummary}
                onChange={(e) => setFormSummary(e.target.value)}
              />
            </div>

            {/* Section 2: Announcement Content */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2 pb-1 border-b">
                <AlignLeft className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Announcement Content</span>
              </div>
              <RichTextEditor
                value={formContent}
                onChange={setFormContent}
                placeholder="Enter complete announcement details, guidelines, meeting links, or policy text..."
                minHeight="200px"
              />
            </div>

            {/* Section 3: Priority Settings & Flags */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2 pb-1 border-b">
                <Flag className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priority & Settings</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 rounded-lg border bg-muted/20">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">Priority</Label>
                  <Select value={formPriority} onValueChange={setFormPriority}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">Urgent Alert</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Low Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-2 border rounded bg-background">
                  <div>
                    <p className="text-sm font-medium">Pin to Top</p>
                    <p className="text-xs text-muted-foreground">Highlight as featured</p>
                  </div>
                  <Switch checked={formIsPinned} onCheckedChange={setFormIsPinned} />
                </div>

                <div className="flex items-center justify-between p-2 border rounded bg-background">
                  <div>
                    <p className="text-sm font-medium">Requires Signature</p>
                    <p className="text-xs text-muted-foreground">Compliance audit ack</p>
                  </div>
                  <Switch checked={formAckRequired} onCheckedChange={setFormAckRequired} />
                </div>
              </div>
            </div>

            {/* Section 4: Target Audience Scope */}
            <div className="space-y-2 p-3 rounded-lg border bg-muted/20">
              <div className="flex items-center gap-2 pb-1 border-b">
                <Users className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target Audience Scope</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Target Scope</Label>
                  <Select value={formTargetType} onValueChange={setFormTargetType}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_company">Company-wide (All Employees)</SelectItem>
                      <SelectItem value="department">Specific Department</SelectItem>
                      <SelectItem value="branch">Specific Branch</SelectItem>
                      <SelectItem value="custom">Branch & Department Combo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(formTargetType === "department" || formTargetType === "custom") && (
                  <div>
                    <Label className="text-xs">Department</Label>
                    <Select value={formTargetDepartmentId} onValueChange={setFormTargetDepartmentId}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Choose Department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d: any) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(formTargetType === "branch" || formTargetType === "custom") && (
                  <div>
                    <Label className="text-xs">Branch Location</Label>
                    <Select value={formTargetBranchId} onValueChange={setFormTargetBranchId}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Choose Branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((b: any) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* Section 5: Lifecycle Status & Publishing Schedule */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2 pb-1 border-b">
                <CalendarClock className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lifecycle & Publishing Schedule</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Lifecycle Status</Label>
                  <Select value={formStatus} onValueChange={setFormStatus}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="published">Publish Immediately</SelectItem>
                      <SelectItem value="scheduled">Schedule for Future</SelectItem>
                      <SelectItem value="draft">Save as Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Publish Date (Start)</Label>
                  <Input
                    type="date"
                    value={formPublishDate}
                    onChange={(e) => setFormPublishDate(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Expiry Date (Optional End)</Label>
                  <Input
                    type="date"
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* Section 6: Document Attachments */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2 pb-1 border-b">
                <Paperclip className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Document Attachments</span>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Document Attachment URL (Optional)</Label>
                <Input
                  placeholder="https://company-docs.s3.amazonaws.com/policies/cybersecurity-2026.pdf"
                  value={formAttachmentUrl}
                  onChange={(e) => setFormAttachmentUrl(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsFormDialogOpen(false)}>
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => handleSaveForm("draft")}
                disabled={saveAnnouncementMutation.isPending}
              >
                Save as Draft
              </Button>
              <Button
                onClick={() => handleSaveForm()}
                disabled={saveAnnouncementMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              >
                {formId ? "Update Notice" : formStatus === "scheduled" ? "Schedule Notice" : "Publish Now"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 2: Category Management CRUD ── */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Tags className="h-5 w-5 text-primary shrink-0" />
              <span>Announcement Categories</span>
            </DialogTitle>
            <DialogDescription>
              Configure classification labels, badge theme colors, and display sequence.
            </DialogDescription>
          </DialogHeader>

          {/* Create / Edit Category Form */}
          <div className="p-3.5 border rounded-lg bg-muted/20 space-y-3">
            <div className="flex items-center gap-2">
              {catFormId ? (
                <Pencil className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <PlusCircle className="h-4 w-4 text-primary shrink-0" />
              )}
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {catFormId ? "Edit Category" : "Add New Category"}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Category Name *</Label>
                <Input
                  placeholder="e.g. Product Release"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Color Theme</Label>
                <div className="flex items-center gap-1.5">
                  {["#3B82F6", "#8B5CF6", "#10B981", "#EC4899", "#EF4444", "#F59E0B", "#14B8A6", "#64748B"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCatColor(c)}
                      className={`size-6 rounded-full border-2 transition-transform ${
                        catColor === c ? "scale-110 border-foreground shadow" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Display Order</Label>
                <Input
                  type="number"
                  value={catDisplayOrder}
                  onChange={(e) => setCatDisplayOrder(Number(e.target.value))}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Description (Optional)</Label>
              <Input
                placeholder="Brief description of this announcement classification..."
                value={catDescription}
                onChange={(e) => setCatDescription(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <Switch checked={catIsActive} onCheckedChange={setCatIsActive} id="cat-active" />
                <Label htmlFor="cat-active" className="text-xs">Active in Notice Creation</Label>
              </div>

              <div className="flex items-center gap-2">
                {catFormId && (
                  <Button variant="ghost" size="sm" onClick={resetCategoryForm} className="h-8 text-xs">
                    Cancel
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => {
                    if (!catName.trim()) {
                      toast.error("Category name is required.");
                      return;
                    }
                    saveCategoryMutation.mutate({
                      name: catName.trim(),
                      slug: catSlug || catName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_"),
                      description: catDescription.trim() || undefined,
                      color: catColor,
                      icon: catIcon,
                      isActive: catIsActive,
                      displayOrder: catDisplayOrder,
                    });
                  }}
                  disabled={saveCategoryMutation.isPending}
                  className="h-8 text-xs"
                >
                  {catFormId ? "Update Category" : "Add Category"}
                </Button>
              </div>
            </div>
          </div>

          {/* Categories Table */}
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><span className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Category</span></TableHead>
                  <TableHead><span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> Notices Count</span></TableHead>
                  <TableHead><span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Status</span></TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                      No categories found.
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="size-3 rounded-full" style={{ backgroundColor: c.color }} />
                          <div>
                            <p className="font-medium text-xs text-foreground">{c.name}</p>
                            {c.description && <p className="text-[11px] text-muted-foreground">{c.description}</p>}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs">
                        <Badge variant="secondary" className="text-[11px]">
                          {c._count?.announcements ?? 0} notices
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge variant={c.isActive ? "outline" : "secondary"} className="text-[10px]">
                          {c.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCatFormId(c.id);
                              setCatName(c.name);
                              setCatSlug(c.slug);
                              setCatDescription(c.description || "");
                              setCatColor(c.color || "#3B82F6");
                              setCatIcon(c.icon || "ph-megaphone");
                              setCatIsActive(c.isActive);
                              setCatDisplayOrder(c.displayOrder || 0);
                            }}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            title="Edit Category"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Delete category "${c.name}"?`)) {
                                deleteCategoryMutation.mutate(c.id);
                              }
                            }}
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                            title="Delete Category"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 3: Announcement Details (HR View) ── */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedAnnouncement && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {getStatusBadge(selectedAnnouncement.status)}
                  {getPriorityBadge(selectedAnnouncement.priority)}
                  <Badge variant="outline" style={{ color: selectedAnnouncement.categoryModel?.color }}>
                    {selectedAnnouncement.categoryModel?.name || selectedAnnouncement.category.replace(/_/g, " ")}
                  </Badge>
                  {selectedAnnouncement.isPinned && (
                    <Badge variant="outline" className="text-primary gap-1">
                      <Pin className="h-3 w-3 rotate-45" /> Pinned
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold text-foreground">
                      {selectedAnnouncement.title}
                    </DialogTitle>
                    <DialogDescription className="mt-0.5">
                      Published by {selectedAnnouncement.authorName} on{" "}
                      {selectedAnnouncement.publishDate ? format(new Date(selectedAnnouncement.publishDate), "dd MMMM yyyy") : "-"}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Executive Summary */}
                {selectedAnnouncement.summary && (
                  <div className="p-3 bg-muted/40 rounded-lg border text-sm font-medium text-foreground">
                    {selectedAnnouncement.summary}
                  </div>
                )}

                {/* Formatted Content */}
                <div className="p-4 rounded-lg border bg-card text-foreground">
                  <FormattedAnnouncementContent content={selectedAnnouncement.content} />
                </div>

                {/* Metadata Card */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg border bg-muted/20 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Audience Target</span>
                    <span className="font-semibold text-foreground capitalize">
                      {selectedAnnouncement.targetType.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Unique Views</span>
                    <span className="font-semibold text-foreground">
                      {selectedAnnouncement.views?.length || selectedAnnouncement.viewCount || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Compliance Required</span>
                    <span className="font-semibold text-foreground">
                      {selectedAnnouncement.acknowledgementRequired ? "Yes (Formal Ack)" : "No"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Expiry Date</span>
                    <span className="font-semibold text-foreground">
                      {selectedAnnouncement.expiryDate ? format(new Date(selectedAnnouncement.expiryDate), "dd MMM yyyy") : "None"}
                    </span>
                  </div>
                </div>

                {/* Engagement Overview Quick Card */}
                <div className="p-4 rounded-lg border bg-primary/5 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">Engagement Statistics</p>
                    <p className="text-sm text-foreground">
                      {selectedAnnouncement.acknowledgements?.length || 0} signed out of eligible employees.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      setIsAnalyticsModalOpen(true);
                    }}
                    className="gap-1.5 text-xs"
                  >
                    <BarChart3 className="h-4 w-4" />
                    View Detailed Analytics
                  </Button>
                </div>
              </div>

              <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal(selectedAnnouncement)}
                  className="gap-1.5"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit Notice
                </Button>
                <Button size="sm" onClick={() => setIsDetailsModalOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── MODAL 4: Dedicated Announcement Statistics & Roster ── */}
      <Dialog open={isAnalyticsModalOpen} onOpenChange={setIsAnalyticsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Announcement Analytics & Compliance Audit
            </DialogTitle>
            <DialogDescription>
              {selectedAnnouncement?.title}
            </DialogDescription>
          </DialogHeader>

          {isAnalyticsLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Computing engagement metrics and employee roster...
            </div>
          ) : (
            <div className="space-y-5 py-2">
              {/* 4 Analytics KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 border rounded-lg bg-card">
                  <p className="text-[11px] font-medium uppercase text-muted-foreground">Target Audience</p>
                  <p className="text-xl font-bold mt-1 text-foreground">{analyticsData?.metrics?.totalEligibleEmployees ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Active Eligible Employees</p>
                </div>

                <div className="p-3 border rounded-lg bg-card">
                  <p className="text-[11px] font-medium uppercase text-muted-foreground">Unique Views</p>
                  <p className="text-xl font-bold mt-1 text-sky-600 dark:text-sky-400">
                    {analyticsData?.metrics?.uniqueViewsCount ?? 0}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {analyticsData?.metrics?.viewRate ?? 0}% View Rate
                  </p>
                </div>

                <div className="p-3 border rounded-lg bg-card">
                  <p className="text-[11px] font-medium uppercase text-muted-foreground">Signed Agreements</p>
                  <p className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                    {analyticsData?.metrics?.acknowledgementCount ?? 0}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {analyticsData?.metrics?.acknowledgementRate ?? 0}% Compliance
                  </p>
                </div>

                <div className="p-3 border rounded-lg bg-card">
                  <p className="text-[11px] font-medium uppercase text-muted-foreground">Pending Signatures</p>
                  <p className="text-xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                    {analyticsData?.metrics?.pendingAcknowledgements ?? 0}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting Review</p>
                </div>
              </div>

              {/* Sub-tabs: Roster vs Department vs Branch */}
              <div className="flex border-b space-x-2">
                <button
                  type="button"
                  onClick={() => setAnalyticsSubTab("roster")}
                  className={`pb-2 px-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                    analyticsSubTab === "roster"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span>Employee Roster ({analyticsData?.employeeRoster?.length ?? 0})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAnalyticsSubTab("department")}
                  className={`pb-2 px-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                    analyticsSubTab === "department"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Building2 className="h-4 w-4" />
                  <span>Department Breakdown ({analyticsData?.departmentBreakdown?.length ?? 0})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAnalyticsSubTab("branch")}
                  className={`pb-2 px-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                    analyticsSubTab === "branch"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <GitBranch className="h-4 w-4" />
                  <span>Branch Breakdown ({analyticsData?.branchBreakdown?.length ?? 0})</span>
                </button>
              </div>

              {/* Sub-tab 1: Employee Engagement Roster */}
              {analyticsSubTab === "roster" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative w-64">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search employee or code..."
                        value={rosterSearch}
                        onChange={(e) => setRosterSearch(e.target.value)}
                        className="pl-8 h-8 text-xs"
                      />
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isExportingAnalytics}
                          className="gap-1.5 h-8 text-xs font-medium"
                        >
                          {isExportingAnalytics ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                          ) : (
                            <Download className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <span>Export</span>
                          <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 text-xs">
                        <DropdownMenuItem
                          onClick={() => handleExportAnalytics("excel")}
                          disabled={isExportingAnalytics}
                          className="gap-2 cursor-pointer py-2"
                        >
                          <ExcelIcon className="h-4 w-4" />
                          <span>Export as Excel (.xlsx)</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleExportAnalytics("csv")}
                          disabled={isExportingAnalytics}
                          className="gap-2 cursor-pointer py-2"
                        >
                          <CsvIcon className="h-4 w-4" />
                          <span>Export as CSV (.csv)</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleExportAnalytics("pdf")}
                          disabled={isExportingAnalytics}
                          className="gap-2 cursor-pointer py-2"
                        >
                          <PdfIcon className="h-4 w-4" />
                          <span>Export as PDF (.pdf)</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="border rounded-md max-h-[350px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Department / Branch</TableHead>
                          <TableHead>Read Status</TableHead>
                          <TableHead>Compliance Signature</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          const roster = (analyticsData?.employeeRoster || []).filter((emp: any) => {
                            if (!rosterSearch) return true;
                            const q = rosterSearch.toLowerCase();
                            return (
                              emp.fullName.toLowerCase().includes(q) ||
                              emp.employeeCode.toLowerCase().includes(q) ||
                              emp.department.toLowerCase().includes(q)
                            );
                          });

                          if (roster.length === 0) {
                            return (
                              <TableRow>
                                <TableCell colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                                  No employees found.
                                </TableCell>
                              </TableRow>
                            );
                          }

                          return roster.map((emp: any) => (
                            <TableRow key={emp.employeeId}>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-xs text-foreground">{emp.fullName}</p>
                                  <p className="text-[11px] text-muted-foreground">{emp.employeeCode}</p>
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="text-xs">
                                  <p className="text-foreground">{emp.department}</p>
                                  <p className="text-[11px] text-muted-foreground">{emp.branch}</p>
                                </div>
                              </TableCell>

                              <TableCell>
                                {emp.hasViewed ? (
                                  <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30 text-[10px] gap-1">
                                    <Check className="h-2.5 w-2.5" />
                                    Read ({emp.viewCount}x)
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground text-[10px]">
                                    Unread
                                  </Badge>
                                )}
                              </TableCell>

                              <TableCell>
                                {emp.hasAcknowledged ? (
                                  <div className="space-y-0.5">
                                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] gap-1">
                                      <CheckCircle2 className="h-2.5 w-2.5" />
                                      Signed
                                    </Badge>
                                    <p className="text-[10px] text-muted-foreground">
                                      {emp.acknowledgedAt ? format(new Date(emp.acknowledgedAt), "dd MMM HH:mm") : ""}
                                    </p>
                                  </div>
                                ) : selectedAnnouncement?.acknowledgementRequired ? (
                                  <Badge variant="outline" className="border-amber-500/40 text-amber-600 text-[10px]">
                                    Pending
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ));
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Sub-tab 2: Department Breakdown */}
              {analyticsSubTab === "department" && (
                <div className="space-y-3">
                  {(analyticsData?.departmentBreakdown || []).map((dept: any) => (
                    <div key={dept.departmentName} className="p-3 border rounded-lg space-y-1.5 bg-card">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">{dept.departmentName}</span>
                        <span className="text-muted-foreground">
                          {dept.viewed} / {dept.eligible} viewed ({dept.viewRate}%) · {dept.acked} signed ({dept.ackRate}%)
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                            <span>View Rate</span>
                            <span>{dept.viewRate}%</span>
                          </div>
                          <Progress value={dept.viewRate} className="h-1.5" />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                            <span>Signature Rate</span>
                            <span>{dept.ackRate}%</span>
                          </div>
                          <Progress value={dept.ackRate} className="h-1.5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sub-tab 3: Branch Breakdown */}
              {analyticsSubTab === "branch" && (
                <div className="space-y-3">
                  {(analyticsData?.branchBreakdown || []).map((br: any) => (
                    <div key={br.branchName} className="p-3 border rounded-lg space-y-1.5 bg-card">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">{br.branchName}</span>
                        <span className="text-muted-foreground">
                          {br.viewed} / {br.eligible} viewed ({br.viewRate}%) · {br.acked} signed ({br.ackRate}%)
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                            <span>View Rate</span>
                            <span>{br.viewRate}%</span>
                          </div>
                          <Progress value={br.viewRate} className="h-1.5" />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                            <span>Signature Rate</span>
                            <span>{br.ackRate}%</span>
                          </div>
                          <Progress value={br.ackRate} className="h-1.5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAnalyticsModalOpen(false)}>
              Close Analytics
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Delete Dialog ── */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Announcement
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this company announcement? This operation removes all associated employee read records and compliance audit logs.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              disabled={deleteMutation.isPending}
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
