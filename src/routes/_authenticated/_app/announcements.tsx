import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile, useSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Megaphone,
  Pin,
  Calendar,
  Users,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  Pencil,
  Building2,
  ShieldAlert,
  Flame,
  Clock,
  Send,
  FileCheck2,
  BellRing,
  Sparkles,
  ExternalLink,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/announcements")({
  component: AnnouncementsPage,
  head: () => ({ meta: [{ title: "Company Broadcasts & Announcements — Master HRMS" }] }),
});

const CATEGORY_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  company_news: { label: "Company News", bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30" },
  policy_update: { label: "Policy Update", bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/30" },
  event: { label: "Event & Wellness", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30" },
  celebration: { label: "Celebration", bg: "bg-pink-500/10", text: "text-pink-600 dark:text-pink-400", border: "border-pink-500/30" },
  urgent_alert: { label: "Urgent Alert", bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/30" },
  holiday: { label: "Holiday Notice", bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30" },
};

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; icon: any }> = {
  urgent: { bg: "bg-rose-600 text-white", text: "text-rose-600", icon: Flame },
  high: { bg: "bg-amber-500 text-white", text: "text-amber-600", icon: AlertCircle },
  normal: { bg: "bg-blue-600 text-white", text: "text-blue-600", icon: BellRing },
  low: { bg: "bg-muted text-muted-foreground", text: "text-muted-foreground", icon: Clock },
};

export function AnnouncementsPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");

  // Modals & Drawers
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
  const [isAcknowledgementsOpen, setIsAcknowledgementsOpen] = useState(false);
  const [selectedForAckView, setSelectedForAckView] = useState<any>(null);
  const [ackComment, setAckComment] = useState("");

  // Forms
  const [form, setForm] = useState({
    title: "",
    summary: "",
    content: "",
    category: "company_news",
    priority: "normal",
    targetType: "all_company",
    targetDepartmentId: "",
    isPinned: false,
    authorName: "",
    attachmentUrl: "",
    acknowledgementRequired: false,
    expiryDate: "",
  });

  // Queries
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      try {
        const res = await api.get("/departments");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      try {
        const res = await api.get("/employees");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const currentEmployee = employees.find((e: any) => e.email === user?.email) || employees[0];

  const { data: announcements = [], isLoading: isAnnouncementsLoading } = useQuery({
    queryKey: ["announcements", tenantId, selectedCategory, selectedPriority, selectedDepartment, searchQuery],
    queryFn: async () => {
      try {
        let url = `/announcements?category=${selectedCategory}&priority=${selectedPriority}&departmentId=${selectedDepartment}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
        const res = await api.get(url);
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: summary } = useQuery({
    queryKey: ["announcements-summary", tenantId],
    queryFn: async () => {
      try {
        return await api.get("/announcements/summary/stats");
      } catch {
        return { totalAnnouncements: 0, pinnedCount: 0, urgentCount: 0, policyCount: 0, complianceRate: 100 };
      }
    },
  });

  // Mutations
  const createAnnouncementMut = useMutation({
    mutationFn: async (payload: any) => api.post("/announcements", payload),
    onSuccess: () => {
      toast.success("Announcement broadcasted successfully!");
      qc.invalidateQueries({ queryKey: ["announcements"] });
      qc.invalidateQueries({ queryKey: ["announcements-summary"] });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message || "Failed to create announcement"),
  });

  const updateAnnouncementMut = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) =>
      api.put(`/announcements/${id}`, payload),
    onSuccess: () => {
      toast.success("Announcement updated!");
      qc.invalidateQueries({ queryKey: ["announcements"] });
      setEditingAnnouncement(null);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message || "Failed to update announcement"),
  });

  const deleteAnnouncementMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/announcements/${id}`),
    onSuccess: () => {
      toast.success("Announcement removed");
      qc.invalidateQueries({ queryKey: ["announcements"] });
      qc.invalidateQueries({ queryKey: ["announcements-summary"] });
      if (selectedAnnouncement) setSelectedAnnouncement(null);
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete announcement"),
  });

  const acknowledgeMut = useMutation({
    mutationFn: async ({ id, employeeId, comments }: { id: string; employeeId: string; comments?: string }) =>
      api.post(`/announcements/${id}/acknowledge`, { employeeId, comments }),
    onSuccess: () => {
      toast.success("Official compliance acknowledgement recorded!");
      qc.invalidateQueries({ queryKey: ["announcements"] });
      qc.invalidateQueries({ queryKey: ["announcements-summary"] });
      setAckComment("");
    },
    onError: (e: any) => toast.error(e.message || "Failed to record acknowledgement"),
  });

  function resetForm() {
    setForm({
      title: "",
      summary: "",
      content: "",
      category: "company_news",
      priority: "normal",
      targetType: "all_company",
      targetDepartmentId: "",
      isPinned: false,
      authorName: profile?.full_name || "Management / HR",
      attachmentUrl: "",
      acknowledgementRequired: false,
      expiryDate: "",
    });
  }

  function openEditModal(ann: any) {
    setEditingAnnouncement(ann);
    setForm({
      title: ann.title,
      summary: ann.summary || "",
      content: ann.content,
      category: ann.category,
      priority: ann.priority,
      targetType: ann.targetType,
      targetDepartmentId: ann.targetDepartmentId || "",
      isPinned: ann.isPinned,
      authorName: ann.authorName,
      attachmentUrl: ann.attachmentUrl || "",
      acknowledgementRequired: ann.acknowledgementRequired,
      expiryDate: ann.expiryDate ? new Date(ann.expiryDate).toISOString().split("T")[0] : "",
    });
  }

  const pinnedAnnouncements = announcements.filter((a: any) => a.isPinned);
  const regularAnnouncements = announcements.filter((a: any) => !a.isPinned);

  return (
    <div className="space-y-6 max-w-7xl pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Megaphone className="size-6 text-primary" /> Company Announcements & Broadcast Feeds
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Organization-wide news, urgent alerts, policy compliance signatures, and targeted department broadcasts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setIsCreateOpen(true);
            }}
            className="text-xs font-bold h-8 shadow-sm gap-1.5 bg-primary text-primary-foreground"
          >
            <Plus className="size-3.5" />
            <span>New Announcement</span>
          </Button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <Megaphone className="size-3.5 text-blue-500" /> Total Broadcasts
          </span>
          <div className="text-xl font-black font-mono text-foreground">
            {summary?.totalAnnouncements || announcements.length} Published
          </div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <Pin className="size-3.5 text-amber-500" /> Pinned Hero Updates
          </span>
          <div className="text-xl font-black font-mono text-amber-600">
            {summary?.pinnedCount || pinnedAnnouncements.length} Pinned
          </div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <ShieldAlert className="size-3.5 text-purple-500" /> Policy Directives
          </span>
          <div className="text-xl font-black font-mono text-purple-600">
            {summary?.policyCount || 0} Policies
          </div>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1 bg-emerald-500/5 border-emerald-500/20">
          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5">
            <FileCheck2 className="size-3.5" /> Compliance Rate
          </span>
          <div className="text-xl font-black font-mono text-emerald-600">
            {summary?.complianceRate || 100}% Acknowledged
          </div>
        </Card>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-2 rounded-xl border">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, summary, author..."
              className="h-7 text-xs pl-8 w-48 sm:w-60 bg-background"
            />
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-7 text-xs w-40 bg-background">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="company_news">Company News</SelectItem>
              <SelectItem value="policy_update">Policy Update</SelectItem>
              <SelectItem value="event">Event & Wellness</SelectItem>
              <SelectItem value="celebration">Celebration</SelectItem>
              <SelectItem value="urgent_alert">Urgent Alert</SelectItem>
              <SelectItem value="holiday">Holiday Notice</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedPriority} onValueChange={setSelectedPriority}>
            <SelectTrigger className="h-7 text-xs w-32 bg-background">
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
        </div>

        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
          <SelectTrigger className="h-7 text-xs w-44 bg-background">
            <SelectValue placeholder="All Target Audiences" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments (Company-wide)</SelectItem>
            {departments.map((d: any) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name} Only
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ─── PINNED HERO SECTION ─── */}
      {pinnedAnnouncements.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Pin className="size-4 text-amber-500 rotate-45" />
            <h2 className="text-sm font-bold tracking-tight text-foreground uppercase tracking-wider">
              Pinned & Important Directives
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pinnedAnnouncements.map((ann: any) => {
              const cat = CATEGORY_CONFIG[ann.category] || CATEGORY_CONFIG.company_news;
              const pri = PRIORITY_CONFIG[ann.priority] || PRIORITY_CONFIG.normal;
              const PriIcon = pri.icon;
              const hasAcknowledged = ann.acknowledgements?.some((ack: any) => ack.employeeId === currentEmployee?.id);

              return (
                <Card
                  key={ann.id}
                  className="border shadow-2xs hover:shadow-sm transition-all duration-200 bg-card overflow-hidden flex flex-col justify-between"
                >
                  <CardHeader className="p-4 pb-2 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={`text-[10px] font-bold ${cat.bg} ${cat.text} ${cat.border}`}>
                          {cat.label}
                        </Badge>
                        <Badge className={`text-[9px] font-bold h-4.5 px-1.5 gap-1 ${pri.bg}`}>
                          <PriIcon className="size-2.5" />
                          <span className="capitalize">{ann.priority}</span>
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                        <Calendar className="size-3" />
                        <span>{new Date(ann.publishDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <CardTitle
                      onClick={() => setSelectedAnnouncement(ann)}
                      className="text-base font-black tracking-tight text-foreground hover:text-primary cursor-pointer leading-snug line-clamp-2"
                    >
                      {ann.title}
                    </CardTitle>
                    {ann.summary && (
                      <CardDescription className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {ann.summary}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="p-4 pt-2 border-t bg-muted/10 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                        <Building2 className="size-3.5 text-primary" />
                        <span>{ann.targetDepartment ? ann.targetDepartment.name : "All Company"}</span>
                        <span>·</span>
                        <span className="font-medium text-foreground">{ann.authorName}</span>
                      </div>

                      <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                        <Eye className="size-3" /> {ann.viewCount} views
                      </span>
                    </div>

                    {/* Acknowledgement Action Box */}
                    {ann.acknowledgementRequired && (
                      <div className="p-2.5 rounded-lg border bg-background/80 flex items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-bold text-foreground block">
                            Compliance Signature Required
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {ann.acknowledgements?.length || 0} employees signed
                          </span>
                        </div>

                        {hasAcknowledged ? (
                          <Badge className="bg-emerald-600 text-white text-[10px] font-bold gap-1 shadow-2xs">
                            <CheckCircle2 className="size-3" /> Signed
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => {
                              if (!currentEmployee?.id) {
                                toast.error("No employee profile found.");
                                return;
                              }
                              acknowledgeMut.mutate({ id: ann.id, employeeId: currentEmployee.id });
                            }}
                            disabled={acknowledgeMut.isPending}
                            className="h-6 text-[10px] font-bold bg-primary text-primary-foreground gap-1"
                          >
                            <FileCheck2 className="size-3" /> Acknowledge
                          </Button>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <Button
                        size="sm"
                        variant="link"
                        onClick={() => setSelectedAnnouncement(ann)}
                        className="text-xs p-0 h-auto font-bold text-primary gap-1"
                      >
                        <span>Read Full Announcement</span>
                        <ExternalLink className="size-3" />
                      </Button>

                      <div className="flex items-center gap-1">
                        {ann.acknowledgementRequired && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedForAckView(ann);
                              setIsAcknowledgementsOpen(true);
                            }}
                            className="h-6 text-[10px] font-bold gap-1"
                          >
                            <Users className="size-3" />
                            <span>Audit Log ({ann.acknowledgements?.length || 0})</span>
                          </Button>
                        )}

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditModal(ann)}
                          className="size-6 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Delete announcement "${ann.title}"?`)) {
                              deleteAnnouncementMut.mutate(ann.id);
                            }
                          }}
                          className="size-6 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── REGULAR ANNOUNCEMENTS FEED ─── */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold tracking-tight text-foreground uppercase tracking-wider">
          All Announcements & Bulletins ({regularAnnouncements.length})
        </h2>

        {isAnnouncementsLoading ? (
          <Card className="p-8 text-center text-xs text-muted-foreground">
            Loading company announcements...
          </Card>
        ) : regularAnnouncements.length === 0 ? (
          <Card className="p-8 text-center text-xs text-muted-foreground italic">
            No regular announcements found matching criteria. Click "New Announcement" to publish a broadcast.
          </Card>
        ) : (
          <div className="space-y-3">
            {regularAnnouncements.map((ann: any) => {
              const cat = CATEGORY_CONFIG[ann.category] || CATEGORY_CONFIG.company_news;
              const pri = PRIORITY_CONFIG[ann.priority] || PRIORITY_CONFIG.normal;
              const hasAcknowledged = ann.acknowledgements?.some((ack: any) => ack.employeeId === currentEmployee?.id);

              return (
                <Card
                  key={ann.id}
                  className="border shadow-2xs hover:shadow-sm transition-all duration-200 bg-card overflow-hidden"
                >
                  <div className="p-4 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] font-bold ${cat.bg} ${cat.text} ${cat.border}`}>
                          {cat.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-medium capitalize">
                          {ann.priority} Priority
                        </Badge>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Building2 className="size-3 text-primary" />
                          {ann.targetDepartment ? ann.targetDepartment.name : "All Company"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                        <span>Published {new Date(ann.publishDate).toLocaleDateString()}</span>
                        <span>·</span>
                        <span>{ann.viewCount} views</span>
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <h3
                          onClick={() => setSelectedAnnouncement(ann)}
                          className="text-base font-black text-foreground hover:text-primary cursor-pointer leading-snug"
                        >
                          {ann.title}
                        </h3>
                        {ann.summary && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {ann.summary}
                          </p>
                        )}
                      </div>

                      {ann.acknowledgementRequired && (
                        <div className="shrink-0 flex items-center gap-1.5">
                          {hasAcknowledged ? (
                            <Badge className="bg-emerald-600 text-white text-[10px] font-bold gap-1 shadow-2xs">
                              <CheckCircle2 className="size-3" /> Signed
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => {
                                if (!currentEmployee?.id) {
                                  toast.error("No employee profile found.");
                                  return;
                                }
                                acknowledgeMut.mutate({ id: ann.id, employeeId: currentEmployee.id });
                              }}
                              disabled={acknowledgeMut.isPending}
                              className="h-6 text-[10px] font-bold bg-primary text-primary-foreground gap-1"
                            >
                              <FileCheck2 className="size-3" /> Acknowledge
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t text-xs">
                      <span className="text-muted-foreground text-[11px]">
                        Author: <strong className="text-foreground">{ann.authorName}</strong>
                      </span>

                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedAnnouncement(ann)}
                          className="h-6 text-[10px] font-bold"
                        >
                          View Details
                        </Button>

                        {ann.acknowledgementRequired && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedForAckView(ann);
                              setIsAcknowledgementsOpen(true);
                            }}
                            className="h-6 text-[10px] font-bold gap-1"
                          >
                            <Users className="size-3" />
                            <span>Audit ({ann.acknowledgements?.length || 0})</span>
                          </Button>
                        )}

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditModal(ann)}
                          className="size-6 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Delete announcement "${ann.title}"?`)) {
                              deleteAnnouncementMut.mutate(ann.id);
                            }
                          }}
                          className="size-6 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── MODAL 1: CREATE / EDIT ANNOUNCEMENT ─── */}
      <Dialog
        open={isCreateOpen || !!editingAnnouncement}
        onOpenChange={(o) => {
          if (!o) {
            setIsCreateOpen(false);
            setEditingAnnouncement(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Megaphone className="size-5 text-primary" />
              <span>{editingAnnouncement ? "Edit Announcement" : "Create Company Announcement"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Publish news, policy updates, urgent bulletins, or celebrations across the organization.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editingAnnouncement) {
                updateAnnouncementMut.mutate({ id: editingAnnouncement.id, payload: form });
              } else {
                createAnnouncementMut.mutate(form);
              }
            }}
            className="space-y-3.5 py-2 text-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Title / Headline *</Label>
              <Input
                required
                placeholder="e.g. Mandatory Cybersecurity Policy Update 2026"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Short Summary / Highlights</Label>
              <Input
                placeholder="Brief 1-2 sentence overview for notification cards..."
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Category *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company_news">📰 Company News</SelectItem>
                    <SelectItem value="policy_update">🛡️ Policy Update</SelectItem>
                    <SelectItem value="event">🌿 Event & Wellness</SelectItem>
                    <SelectItem value="celebration">🎉 Celebration</SelectItem>
                    <SelectItem value="urgent_alert">🚨 Urgent Alert</SelectItem>
                    <SelectItem value="holiday">🏖️ Holiday Notice</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Priority *</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Target Audience *</Label>
                <Select value={form.targetType} onValueChange={(v) => setForm({ ...form, targetType: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_company">🏢 All Company</SelectItem>
                    <SelectItem value="department">👥 Specific Department</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.targetType === "department" && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Department *</Label>
                  <Select
                    value={form.targetDepartmentId}
                    onValueChange={(v) => setForm({ ...form, targetDepartmentId: v })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choose Dept" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {form.targetType === "all_company" && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Author / Published By</Label>
                  <Input
                    placeholder="e.g. Executive Office / HR"
                    value={form.authorName}
                    onChange={(e) => setForm({ ...form, authorName: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Announcement Body (Markdown Supported) *</Label>
              <Textarea
                required
                rows={5}
                placeholder="Write detailed announcements, guidelines, agenda, or policy text..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="text-xs font-mono"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold block cursor-pointer">Pin to Top Hero Banner</Label>
                <span className="text-[10px] text-muted-foreground">
                  Displays in high-visibility top section on all dashboards.
                </span>
              </div>
              <Switch checked={form.isPinned} onCheckedChange={(c) => setForm({ ...form, isPinned: c })} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold block cursor-pointer">Require Compliance Signature</Label>
                <span className="text-[10px] text-muted-foreground">
                  Employees must click "Acknowledge" to record digital compliance timestamp.
                </span>
              </div>
              <Switch
                checked={form.acknowledgementRequired}
                onCheckedChange={(c) => setForm({ ...form, acknowledgementRequired: c })}
              />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingAnnouncement(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createAnnouncementMut.isPending || updateAnnouncementMut.isPending}
                className="text-xs font-bold"
              >
                {editingAnnouncement ? "Save Changes" : "Publish Announcement"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: VIEW FULL ANNOUNCEMENT PASSPORT ─── */}
      {selectedAnnouncement && (
        <Dialog open={!!selectedAnnouncement} onOpenChange={(o) => !o && setSelectedAnnouncement(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold ${
                    CATEGORY_CONFIG[selectedAnnouncement.category]?.bg
                  } ${CATEGORY_CONFIG[selectedAnnouncement.category]?.text} ${
                    CATEGORY_CONFIG[selectedAnnouncement.category]?.border
                  }`}
                >
                  {CATEGORY_CONFIG[selectedAnnouncement.category]?.label}
                </Badge>
                <Badge className="text-[10px] font-bold capitalize">
                  {selectedAnnouncement.priority} Priority
                </Badge>
                {selectedAnnouncement.isPinned && (
                  <Badge className="bg-amber-500 text-white text-[10px] font-bold gap-1">
                    <Pin className="size-2.5" /> Pinned
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-xl font-black text-foreground leading-snug">
                {selectedAnnouncement.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 pt-1 font-mono">
                <span>By {selectedAnnouncement.authorName}</span>
                <span>·</span>
                <span>{new Date(selectedAnnouncement.publishDate).toLocaleDateString()}</span>
                <span>·</span>
                <span>{selectedAnnouncement.viewCount} Views</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Summary box */}
              {selectedAnnouncement.summary && (
                <div className="p-3 rounded-xl border bg-muted/20 text-xs italic text-foreground leading-relaxed">
                  "{selectedAnnouncement.summary}"
                </div>
              )}

              {/* Main Content */}
              <div className="p-4 rounded-xl border bg-card text-xs text-foreground leading-relaxed whitespace-pre-line font-sans">
                {selectedAnnouncement.content}
              </div>

              {/* Acknowledgement Status */}
              {selectedAnnouncement.acknowledgementRequired && (
                <div className="p-3.5 rounded-xl border bg-primary/5 border-primary/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-foreground block text-xs">
                        Digital Compliance Acknowledgement
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {selectedAnnouncement.acknowledgements?.length || 0} employees have acknowledged this directive.
                      </span>
                    </div>

                    {selectedAnnouncement.acknowledgements?.some((a: any) => a.employeeId === currentEmployee?.id) ? (
                      <Badge className="bg-emerald-600 text-white text-xs font-bold gap-1">
                        <CheckCircle2 className="size-3.5" /> You Have Signed
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!currentEmployee?.id) {
                            toast.error("No employee profile found.");
                            return;
                          }
                          acknowledgeMut.mutate({ id: selectedAnnouncement.id, employeeId: currentEmployee.id });
                        }}
                        disabled={acknowledgeMut.isPending}
                        className="text-xs font-bold h-8 bg-primary text-primary-foreground gap-1.5"
                      >
                        <FileCheck2 className="size-3.5" />
                        <span>Acknowledge & Agree</span>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button size="sm" variant="outline" onClick={() => setSelectedAnnouncement(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── MODAL 3: HR COMPLIANCE AUDIT LOG DRAWER ─── */}
      {selectedForAckView && (
        <Dialog open={isAcknowledgementsOpen} onOpenChange={setIsAcknowledgementsOpen}>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <FileCheck2 className="size-5 text-primary" />
                <span>Compliance Audit: {selectedForAckView.title}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                List of all team members who reviewed and digitally signed this policy/directive.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead className="text-xs">Employee</TableHead>
                    <TableHead className="text-xs">Department</TableHead>
                    <TableHead className="text-xs">Signed Timestamp</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {selectedForAckView.acknowledgements?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8 text-xs italic">
                        No employees have acknowledged yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectedForAckView.acknowledgements?.map((ack: any) => (
                      <TableRow key={ack.id} className="text-xs hover:bg-muted/20">
                        <TableCell>
                          <span className="font-bold text-foreground block">
                            {ack.employee?.firstName} {ack.employee?.lastName}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {ack.employee?.employeeCode}
                          </span>
                        </TableCell>

                        <TableCell className="text-muted-foreground">
                          {ack.employee?.department?.name || "General"}
                        </TableCell>

                        <TableCell className="font-mono text-muted-foreground text-[11px]">
                          {new Date(ack.acknowledgedAt).toLocaleString()}
                        </TableCell>

                        <TableCell>
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] font-bold">
                            Verified Signed
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button size="sm" variant="outline" onClick={() => setIsAcknowledgementsOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
