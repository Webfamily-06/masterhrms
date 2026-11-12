import { useState } from "react";
import { format } from "date-fns";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { StandardPagination } from "@/components/ui/standard-pagination";
import { GlobalListActionToolbar } from "@/components/ui/global-list-action-toolbar";
import { exportToExcel, exportToPdf, ExportColumn } from "@/lib/export-utils";
import { Checkbox } from "@/components/ui/checkbox";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
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
  Edit2,
  Trash2,
  Pin,
  CheckCircle2,
  AlertCircle,
  FileCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/organization/announcements")({
  component: AnnouncementsPage,
  head: () => ({
    meta: [{ title: "Company Announcements — Master HRMS" }],
  }),
});

interface AnnouncementRecord {
  id: string;
  title: string;
  summary?: string;
  content: string;
  category: string;
  priority: string;
  targetType: string;
  isPinned: boolean;
  publishDate: string;
  expiryDate?: string;
  authorName: string;
  acknowledgementRequired: boolean;
  viewCount: number;
  acknowledgements?: Array<{ id: string }>;
}

export function AnnouncementsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AnnouncementRecord | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formSummary, setFormSummary] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("company_news");
  const [formPriority, setFormPriority] = useState("normal");
  const [formTargetType, setFormTargetType] = useState("all_company");
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formAckRequired, setFormAckRequired] = useState(false);

  // Fetch announcements
  const { data: announcementsData, isLoading, refetch } = useQuery({
    queryKey: ["hr-announcements", search, categoryFilter],
    queryFn: async () => {
      const res = await api.get("/hr/organization/announcements", {
        params: {
          search: search || undefined,
          category: categoryFilter !== "all" ? categoryFilter : undefined,
          limit: 50,
        },
      });
      return res.data || res.items || res || [];
    },
  });

  const announcements: AnnouncementRecord[] = Array.isArray(announcementsData)
    ? announcementsData
    : (announcementsData?.data as any) || [];

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingItem?.id) {
        return await api.put(`/hr/organization/announcements/${editingItem.id}`, payload);
      }
      return await api.post("/hr/organization/announcements", payload);
    },
    onSuccess: () => {
      toast.success(editingItem ? "Announcement updated" : "Announcement published");
      setIsDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["hr-announcements"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save announcement");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/hr/organization/announcements/${id}`);
    },
    onSuccess: () => {
      toast.success("Announcement deleted");
      qc.invalidateQueries({ queryKey: ["hr-announcements"] });
      refetch();
    },
  });


  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const announcementExportColumns: ExportColumn<AnnouncementRecord>[] = [
    { header: "Title", key: "title" },
    { header: "Target Scope", key: "targetType", format: (v) => v || "All Organization" },
    { header: "Priority", key: "priority" },
    { header: "Start Date", key: "publishDate", format: (v) => (v ? new Date(v).toISOString().split("T")[0] : "") },
    { header: "End Date", key: "expiryDate", format: (v) => (v ? new Date(v).toISOString().split("T")[0] : "") },
    { header: "Status", key: "priority", format: (_v) => "Active" },
  ];

  const handleExportExcel = async () => {
    const dataToExport = selectedIds.length > 0
      ? announcements.filter((a: any) => selectedIds.includes(a.id))
      : announcements;
    await exportToExcel({
      filename: `announcements_${new Date().toISOString().split("T")[0]}`,
      title: "Announcements Directory",
      columns: announcementExportColumns,
      data: dataToExport,
    });
    toast.success(`Exported ${dataToExport.length} announcement(s) to Excel`);
  };

  const handleExportPdf = async () => {
    const dataToExport = selectedIds.length > 0
      ? announcements.filter((a: any) => selectedIds.includes(a.id))
      : announcements;
    await exportToPdf({
      filename: `announcements_${new Date().toISOString().split("T")[0]}`,
      title: "Announcements Directory",
      columns: announcementExportColumns,
      data: dataToExport,
    });
    toast.success(`Exported ${dataToExport.length} announcement(s) to PDF`);
  };

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      // Delete sequentially or via bulk
      for (const id of ids) {
        await api.delete(`/hr/organization/announcements/${id}`);
      }
    },
    onSuccess: () => {
      toast.success(`Deleted ${selectedIds.length} announcement(s)`);
      setSelectedIds([]);
      qc.invalidateQueries({ queryKey: ["hr-announcements"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Bulk delete failed");
    },
  });

  const currentPageIds = announcements.map((a: any) => a.id).filter(Boolean);
  const isAllCurrentPageSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));
  const isPartiallySelected =
    currentPageIds.some((id) => selectedIds.includes(id)) && !isAllCurrentPageSelected;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentPageIds])));
    } else {
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormTitle("");
    setFormSummary("");
    setFormContent("");
    setFormCategory("company_news");
    setFormPriority("normal");
    setFormTargetType("all_company");
    setFormIsPinned(false);
    setFormAckRequired(false);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (a: AnnouncementRecord) => {
    setEditingItem(a);
    setFormTitle(a.title);
    setFormSummary(a.summary || "");
    setFormContent(a.content);
    setFormCategory(a.category);
    setFormPriority(a.priority);
    setFormTargetType(a.targetType);
    setFormIsPinned(a.isPinned);
    setFormAckRequired(a.acknowledgementRequired);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      title: formTitle,
      summary: formSummary,
      content: formContent,
      category: formCategory,
      priority: formPriority,
      targetType: formTargetType,
      isPinned: formIsPinned,
      acknowledgementRequired: formAckRequired,
    });
  };

  const paginatedAnnouncements = announcements.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Announcements"
        description="Official broadcasts, corporate communications, and compliance notices."
        icon={Megaphone}
        
      />

      <GlobalListActionToolbar
        searchPlaceholder="Search announcements by title or content..."
        searchTerm={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        selectedCount={selectedIds.length}
        totalFilteredCount={announcements.length}
        onClearSelection={() => setSelectedIds([])}
        onBulkDelete={() => bulkDeleteMutation.mutate(selectedIds)}
        isActionLoading={bulkDeleteMutation.isPending}
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportPdf}
        primaryActionLabel="Publish Notice"
        onPrimaryAction={handleOpenAdd}
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">
                <Checkbox
                  checked={isAllCurrentPageSelected ? true : isPartiallySelected ? "indeterminate" : false}
                  onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                  aria-label="Select all announcements on this page"
                />
              </TableHead>
              <TableHead>Title & Category</TableHead>
              <TableHead>Target Scope</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Publish Date</TableHead>
              <TableHead>Policy Ack</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Loading announcements...
                </TableCell>
              </TableRow>
            ) : announcements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No announcements found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedAnnouncements.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="w-12 text-center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(a.id)}
                      onCheckedChange={(checked) => handleSelectRow(a.id, Boolean(checked))}
                      aria-label={`Select announcement ${a.title}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {a.isPinned && <Pin className="h-3.5 w-3.5 text-primary rotate-45" />}
                      <span className="font-semibold text-foreground">{a.title}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{a.summary || a.category}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {a.targetType === "all_company" ? "All Company" : a.targetType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        a.priority === "urgent"
                          ? "destructive"
                          : a.priority === "high"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {a.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(a.publishDate), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    {a.acknowledgementRequired ? (
                      <span className="flex items-center gap-1 text-xs text-amber-500 font-medium">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Required
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not Required</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(a)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(a.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
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

        <StandardPagination
          page={page}
          pageSize={pageSize}
          total={announcements.length}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Announcement" : "Create & Broadcast Announcement"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ann-title">Title *</Label>
              <Input
                id="ann-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Q4 Townhall & Strategic Update"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ann-summary">Summary</Label>
              <Input
                id="ann-summary"
                value={formSummary}
                onChange={(e) => setFormSummary(e.target.value)}
                placeholder="Brief one-line highlight"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ann-content">Full Content / Body *</Label>
              <Textarea
                id="ann-content"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={4}
                placeholder="Detailed announcement details, agenda, or guidelines..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ann-cat">Category</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger id="ann-cat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company_news">Company News</SelectItem>
                    <SelectItem value="policy_update">Policy Update</SelectItem>
                    <SelectItem value="event">Company Event</SelectItem>
                    <SelectItem value="celebration">Celebration</SelectItem>
                    <SelectItem value="urgent_alert">Urgent Alert</SelectItem>
                    <SelectItem value="holiday">Holiday</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ann-prio">Priority</Label>
                <Select value={formPriority} onValueChange={setFormPriority}>
                  <SelectTrigger id="ann-prio">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ann-pin"
                  checked={formIsPinned}
                  onCheckedChange={(checked) => setFormIsPinned(Boolean(checked))}
                />
                <Label htmlFor="ann-pin" className="text-sm font-medium">
                  Pin to top of employee dashboards
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="ann-ack"
                  checked={formAckRequired}
                  onCheckedChange={(checked) => setFormAckRequired(Boolean(checked))}
                />
                <Label htmlFor="ann-ack" className="text-sm font-medium">
                  Require digital employee policy acknowledgement
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending
                  ? "Broadcasting..."
                  : editingItem
                    ? "Update Announcement"
                    : "Broadcast Now"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
