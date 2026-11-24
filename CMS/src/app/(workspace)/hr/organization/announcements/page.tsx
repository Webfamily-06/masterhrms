'use client';

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Link } from "@/lib/router-compat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LayoutDashboard,
  Plus,
  Eye,
  Edit,
  BarChart2,
  Trash2,
  ArrowUpDown,
  Search,
  Calendar,
  Filter,
  Loader2,
  Megaphone,
  Paperclip,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AnnouncementItem {
  id: string;
  title: string;
  summary?: string | null;
  content?: string | null;
  category?: string | null;
  priority?: string | null;
  status?: string | null;
  targetType?: string | null;
  targetDepartments?: string[] | null;
  targetBranches?: string[] | null;
  isPinned?: boolean;
  publishDate?: string | null;
  expiryDate?: string | null;
  authorName?: string | null;
  acknowledgementRequired?: boolean;
  attachments?: any[] | null;
  viewCount?: number;
  _count?: { views?: number; acknowledgements?: number };
}

const CATEGORIES = [
  "HR Updates",
  "Policy Updates",
  "Company News",
  "Benefits",
  "IT Updates",
  "Events",
  "Training",
  "Compliance",
];

function formatDateYmd(dateStr?: string | null) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return format(d, "yyyy-MM-dd");
  } catch {
    return "—";
  }
}

function getAnnouncementLifecycle(ann: AnnouncementItem): "Active" | "Expired" {
  if (ann.expiryDate) {
    const exp = new Date(ann.expiryDate);
    if (!isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
      return "Expired";
    }
  }
  return "Active";
}

export default function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState<"title" | "publishDate">("publishDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewTarget, setViewTarget] = useState<AnnouncementItem | null>(null);
  const [analyticsTarget, setAnalyticsTarget] = useState<AnnouncementItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementItem | null>(null);
  const [quickResponse, setQuickResponse] = useState("");

  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "Company News",
    priority: "normal",
    isPinned: false,
    publishDate: new Date().toISOString().split("T")[0],
    expiryDate: "",
    targetType: "all_company",
    acknowledgementRequired: true,
  });

  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ["branches-dropdown"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/branches", { params: { limit: 100 } });
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ["departments-dropdown"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/departments", { params: { limit: 100 } });
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  const { data: rawAnnouncements = [], isLoading } = useQuery<AnnouncementItem[]>({
    queryKey: ["announcements-list", search, deptFilter, branchFilter],
    queryFn: async () => {
      const res = await api.get("/hr/organization/announcements", {
        params: {
          limit: 100,
          search: search.trim() || undefined,
          departmentId: deptFilter !== "all" ? deptFilter : undefined,
          branchId: branchFilter !== "all" ? branchFilter : undefined,
        },
      });
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<any>({
    queryKey: ["announcement-analytics", analyticsTarget?.id],
    enabled: Boolean(analyticsTarget?.id),
    queryFn: async () => {
      const res = await api.get(`/hr/organization/announcements/${analyticsTarget!.id}/analytics`);
      return res?.data || res || {};
    },
  });

  const announcements = useMemo(() => {
    const filtered = rawAnnouncements.filter((a) => {
      const start = formatDateYmd(a.publishDate);
      if (fromDate && start !== "—" && start < fromDate) return false;
      if (toDate && start !== "—" && start > toDate) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      const av = sortBy === "title" ? (a.title || "").toLowerCase() : (a.publishDate || "");
      const bv = sortBy === "title" ? (b.title || "").toLowerCase() : (b.publishDate || "");
      return sortOrder === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [rawAnnouncements, fromDate, toDate, sortBy, sortOrder]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        summary: form.content.trim().slice(0, 180),
        content: form.content.trim(),
        category: form.category,
        priority: form.priority,
        status: "published",
        targetType: form.targetType,
        isPinned: form.isPinned,
        publishDate: form.publishDate ? new Date(form.publishDate).toISOString() : new Date().toISOString(),
        expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
        acknowledgementRequired: form.acknowledgementRequired,
      };
      if (editingId) {
        return await api.put(`/hr/organization/announcements/${editingId}`, payload);
      }
      return await api.post("/hr/organization/announcements", payload);
    },
    onSuccess: () => {
      toast.success(
        editingId
          ? "Announcement updated and synced across all dashboards."
          : "Announcement published to the entire organization."
      );
      setIsDialogOpen(false);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["announcements-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-company-announcements"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to save announcement.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/hr/organization/announcements/${id}`);
    },
    onSuccess: () => {
      toast.success("Announcement deleted.");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["announcements-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-company-announcements"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to delete announcement.");
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, comments }: { id: string; comments: string }) => {
      await api.post(`/hr/organization/announcements/${id}/acknowledge`, {
        comments: comments.trim() || "Read and acknowledged.",
      });
    },
    onSuccess: () => {
      toast.success("Response recorded.");
      setQuickResponse("");
      queryClient.invalidateQueries({ queryKey: ["announcement-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-company-announcements"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to record response.");
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({
      title: "",
      content: "",
      category: "Company News",
      priority: "normal",
      isPinned: false,
      publishDate: new Date().toISOString().split("T")[0],
      expiryDate: "",
      targetType: "all_company",
      acknowledgementRequired: true,
    });
    setIsDialogOpen(true);
  };

  const openEdit = (ann: AnnouncementItem) => {
    setEditingId(ann.id);
    setForm({
      title: ann.title || "",
      content: ann.content || ann.summary || "",
      category: ann.category || "Company News",
      priority: ann.priority || "normal",
      isPinned: Boolean(ann.isPinned),
      publishDate: formatDateYmd(ann.publishDate) !== "—" ? formatDateYmd(ann.publishDate) : new Date().toISOString().split("T")[0],
      expiryDate: formatDateYmd(ann.expiryDate) !== "—" ? formatDateYmd(ann.expiryDate) : "",
      targetType: ann.targetType || "all_company",
      acknowledgementRequired: Boolean(ann.acknowledgementRequired),
    });
    setIsDialogOpen(true);
  };

  const handleSort = (col: "title" | "publishDate") => {
    if (sortBy === col) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortOrder("asc");
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setDeptFilter("all");
    setBranchFilter("all");
    setFromDate("");
    setToDate("");
  };

  return (
    <div className="w-full space-y-5">
      {/* ── Page Header (Matches Screenshot 1) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Announcements</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create and manage announcements for your organization.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={openCreate}
            className="h-9 px-4 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Add Announcement
          </Button>
        </div>
      </div>

      {/* ── Filter Toolbar Card ── */}
      <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative w-full sm:w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-9 h-9 text-xs bg-background"
            />
          </div>

          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[155px] h-9 text-xs bg-background">
              <SelectValue placeholder="All Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Department</SelectItem>
              {departments.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[145px] h-9 text-xs bg-background">
              <SelectValue placeholder="All Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branch</SelectItem>
              {branches.map((b: any) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-[150px] h-9 text-xs bg-background"
            aria-label="Start date"
          />

          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-[150px] h-9 text-xs bg-background"
            aria-label="End date"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleResetFilters}
          className="h-9 gap-1.5 text-xs"
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
        </Button>
      </div>

      {/* ── Announcements Data Table Card ── */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/80">
                <TableHead className="w-12 text-xs font-semibold text-muted-foreground">#</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => handleSort("title")}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                  >
                    Title
                    <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
                  </button>
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Category</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => handleSort("publishDate")}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                  >
                    Date Range
                    <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
                  </button>
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Audience</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Attachments</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground text-right pr-6">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                    Loading announcements...
                  </TableCell>
                </TableRow>
              ) : announcements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
                      <Megaphone className="h-7 w-7 opacity-50" />
                      <p className="text-sm font-medium text-foreground">No announcements found</p>
                      <p className="text-xs">Publish an announcement to notify everyone across all dashboards.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                announcements.map((ann, idx) => {
                  const isHigh = ann.priority === "high" || ann.priority === "urgent";
                  const lifecycle = getAnnouncementLifecycle(ann);
                  const deptCount = Array.isArray(ann.targetDepartments) ? ann.targetDepartments.length : 0;
                  const branchCount = Array.isArray(ann.targetBranches) ? ann.targetBranches.length : 0;
                  const isCompanyWide = !deptCount && !branchCount;
                  const attCount = Array.isArray(ann.attachments) ? ann.attachments.length : 0;

                  return (
                    <TableRow
                      key={ann.id}
                      className="hover:bg-muted/40 transition-colors border-b border-border/50 last:border-0"
                    >
                      <TableCell className="text-xs font-semibold text-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-semibold text-foreground">{ann.title}</span>
                          {ann.isPinned && (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                            >
                              Featured
                            </Badge>
                          )}
                          {isHigh && (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                            >
                              High Priority
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-muted/40 text-muted-foreground border-border/80 capitalize"
                        >
                          {(ann.category || "Company News").replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 opacity-70" />
                            <span>{formatDateYmd(ann.publishDate)}</span>
                          </div>
                          {ann.expiryDate && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 opacity-70" />
                              <span>{formatDateYmd(ann.expiryDate)}</span>
                            </div>
                          )}
                          <div>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-medium px-2 py-0 rounded-md",
                                lifecycle === "Active"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                  : "bg-muted text-muted-foreground border-border"
                              )}
                            >
                              {lifecycle}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isCompanyWide ? (
                          <Badge
                            variant="outline"
                            className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                          >
                            Company-wide
                          </Badge>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {deptCount > 0 && (
                              <Badge
                                variant="outline"
                                className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              >
                                {deptCount} Departments
                              </Badge>
                            )}
                            {branchCount > 0 && (
                              <Badge
                                variant="outline"
                                className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              >
                                {branchCount} Branches
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {attCount > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <Paperclip className="h-3.5 w-3.5" />
                            {attCount}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="inline-flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="View & Respond"
                            onClick={() => {
                              setViewTarget(ann);
                              setQuickResponse("");
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="Edit Announcement"
                            onClick={() => openEdit(ann)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            title="Response Analytics"
                            onClick={() => setAnalyticsTarget(ann)}
                          >
                            <BarChart2 className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                            title="Delete Announcement"
                            onClick={() => setDeleteTarget(ann)}
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
      </div>

      {/* ── Create / Edit Announcement Dialog ── */}
      <Dialog open={isDialogOpen} onOpenChange={(o) => !o && setIsDialogOpen(false)}>
        <DialogContent className="sm:max-w-lg p-6">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Announcement" : "Add Announcement"}</DialogTitle>
            <DialogDescription>
              Published announcements appear immediately on every employee&apos;s dashboard widget.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.title.trim() || !form.content.trim()) {
                toast.error("Title and message content are required.");
                return;
              }
              saveMutation.mutate();
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Annual Performance Review Process"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(val) => setForm((p) => ({ ...p, category: val }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(val) => setForm((p) => ({ ...p, priority: val }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Start Date</Label>
                <Input
                  type="date"
                  value={form.publishDate}
                  onChange={(e) => setForm((p) => ({ ...p, publishDate: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">End Date</Label>
                <Input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm((p) => ({ ...p, expiryDate: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Announcement Message *</Label>
              <Textarea
                rows={4}
                value={form.content}
                onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                placeholder="Write the full announcement message..."
                required
              />
            </div>

            <div className="flex flex-wrap items-center gap-5 pt-1">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <Checkbox
                  checked={form.isPinned}
                  onCheckedChange={(c) => setForm((p) => ({ ...p, isPinned: Boolean(c) }))}
                />
                Featured Announcement
              </label>
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <Checkbox
                  checked={form.acknowledgementRequired}
                  onCheckedChange={(c) => setForm((p) => ({ ...p, acknowledgementRequired: Boolean(c) }))}
                />
                Require Employee Response
              </label>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saveMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editingId ? "Save Changes" : "Publish Announcement"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── View & Respond Dialog ── */}
      <Dialog open={Boolean(viewTarget)} onOpenChange={(o) => !o && setViewTarget(null)}>
        <DialogContent className="sm:max-w-lg p-6">
          <DialogHeader>
            <DialogTitle>{viewTarget?.title}</DialogTitle>
            <DialogDescription>
              {viewTarget?.category?.replace(/_/g, " ") || "Company News"} • {formatDateYmd(viewTarget?.publishDate)}
            </DialogDescription>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-4 pt-2">
              <div className="rounded-lg border border-border/70 bg-muted/20 p-4 text-sm whitespace-pre-line max-h-60 overflow-y-auto">
                {viewTarget.content || viewTarget.summary || "No details."}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={quickResponse}
                  onChange={(e) => setQuickResponse(e.target.value)}
                  placeholder="Add your response or acknowledgement..."
                  className="h-9 text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={respondMutation.isPending}
                  onClick={() =>
                    respondMutation.mutate({
                      id: viewTarget.id,
                      comments: quickResponse || "Read and acknowledged.",
                    })
                  }
                  className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Send className="h-3.5 w-3.5" />
                  Respond
                </Button>
              </div>
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setViewTarget(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Analytics & Employee Responses Dialog ── */}
      <Dialog open={Boolean(analyticsTarget)} onOpenChange={(o) => !o && setAnalyticsTarget(null)}>
        <DialogContent className="sm:max-w-lg p-6">
          <DialogHeader>
            <DialogTitle>Announcement Responses</DialogTitle>
            <DialogDescription>{analyticsTarget?.title}</DialogDescription>
          </DialogHeader>
          {analyticsLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">Loading responses...</div>
          ) : (
            <div className="space-y-3 pt-2 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-muted-foreground">Views</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">
                    {analyticsData?.stats?.totalViews ?? analyticsData?.viewCount ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-muted-foreground">Responses</p>
                  <p className="text-lg font-bold text-emerald-600 mt-0.5">
                    {analyticsData?.stats?.acknowledgedCount ?? analyticsData?.acknowledgements?.length ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-muted-foreground">Audience</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">
                    {analyticsData?.stats?.totalTargeted ?? "All"}
                  </p>
                </div>
              </div>
              {Array.isArray(analyticsData?.acknowledgements) && analyticsData.acknowledgements.length > 0 && (
                <div className="max-h-48 overflow-y-auto divide-y divide-border/60 border rounded-lg">
                  {analyticsData.acknowledgements.map((ack: any) => (
                    <div key={ack.id} className="p-2.5 flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">
                          {ack.employee?.firstName} {ack.employee?.lastName}
                        </p>
                        <p className="text-muted-foreground mt-0.5">{ack.comments || "Acknowledged"}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatDateYmd(ack.acknowledgedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setAnalyticsTarget(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Announcement Dialog ── */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Delete Announcement</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.title}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
