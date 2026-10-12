import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  Users,
  Search,
  Eye,
  Loader2,
  BookmarkCheck,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/notice-board")({
  component: NoticeBoardPage,
  head: () => ({
    meta: [{ title: "Company Notice Board & Policies — Master ERP" }],
  }),
});

interface NoticeItem {
  id: string;
  title: string;
  content: string;
  priority: "INFO" | "WARNING" | "URGENT";
  category: string;
  targetDepartment?: string | null;
  requiresAcknowledgement: boolean;
  expiresAt?: string | null;
  createdAt: string;
  acknowledgedByMe?: boolean;
  acknowledgementsCount?: number;
}

export function NoticeBoardPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const userRoles = profile?.roles || [];
  const isAdmin = userRoles.some((r) => ["admin", "super_admin", "tenant_admin", "hr_admin"].includes(r));

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState<NoticeItem | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formPriority, setFormPriority] = useState<"INFO" | "WARNING" | "URGENT">("INFO");
  const [formCategory, setFormCategory] = useState("Company Announcement");
  const [formDepartment, setFormDepartment] = useState("all");
  const [formRequiresAck, setFormRequiresAck] = useState(false);

  // 1. Fetch Notices
  const { data: notices = [], isLoading, refetch } = useQuery<NoticeItem[]>({
    queryKey: ["tenant-notices"],
    queryFn: async () => {
      try {
        const res = await api.get<{ notices: NoticeItem[] }>("/notice-board/notices");
        return res?.notices || [];
      } catch {
        return [];
      }
    },
    staleTime: 5000,
  });

  // 2. Create Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/notice-board/notices", {
        title: formTitle.trim(),
        content: formContent.trim(),
        priority: formPriority,
        category: formCategory,
        targetDepartment: formDepartment === "all" ? null : formDepartment,
        requiresAcknowledgement: formRequiresAck,
      });
    },
    onSuccess: () => {
      toast.success("Notice posted to workspace board!");
      setShowCreateModal(false);
      resetForm();
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to post notice.");
    },
  });

  // 3. Edit Mutation
  const editMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.put(`/notice-board/notices/${id}`, {
        title: formTitle.trim(),
        content: formContent.trim(),
        priority: formPriority,
        category: formCategory,
        targetDepartment: formDepartment === "all" ? null : formDepartment,
        requiresAcknowledgement: formRequiresAck,
      });
    },
    onSuccess: () => {
      toast.success("Notice updated successfully!");
      setEditingNotice(null);
      resetForm();
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update notice.");
    },
  });

  // 4. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/notice-board/notices/${id}`);
    },
    onSuccess: () => {
      toast.success("Notice removed.");
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete notice.");
    },
  });

  // 5. Acknowledge Mutation
  const ackMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.post(`/notice-board/notices/${id}/acknowledge`);
    },
    onSuccess: () => {
      toast.success("Policy acknowledged and signed.");
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to acknowledge notice.");
    },
  });

  const resetForm = () => {
    setFormTitle("");
    setFormContent("");
    setFormPriority("INFO");
    setFormCategory("Company Announcement");
    setFormDepartment("all");
    setFormRequiresAck(false);
  };

  const handleOpenEdit = (n: NoticeItem) => {
    setEditingNotice(n);
    setFormTitle(n.title);
    setFormContent(n.content);
    setFormPriority(n.priority);
    setFormCategory(n.category);
    setFormDepartment(n.targetDepartment || "all");
    setFormRequiresAck(n.requiresAcknowledgement);
  };

  const filtered = notices.filter((n) => {
    const matchesSearch =
      search === "" ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase());
    const matchesPriority = priorityFilter === "ALL" || n.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const getPriorityBadge = (p: NoticeItem["priority"]) => {
    switch (p) {
      case "URGENT":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 font-bold text-[10px] gap-1"><AlertTriangle className="size-3" /> URGENT</Badge>;
      case "WARNING":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold text-[10px] gap-1"><Info className="size-3" /> WARNING</Badge>;
      default:
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold text-[10px] gap-1"><Info className="size-3" /> INFO</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Company Notice Board</h1>
            <Badge variant="outline" className="text-xs font-mono">
              E12 Collaboration Engine
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Broadcast workspace notices, mandatory compliance policies, and departmental announcements.
          </p>
        </div>

        {isAdmin && (
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="text-xs font-bold gap-1.5 shadow-sm self-start sm:self-auto"
          >
            <Plus className="size-4" /> Post Notice
          </Button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search notice titles or content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-bold text-muted-foreground uppercase mr-1">Priority:</span>
          {["ALL", "INFO", "WARNING", "URGENT"].map((p) => (
            <Button
              key={p}
              variant={priorityFilter === p ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2 font-semibold"
              onClick={() => setPriorityFilter(p)}
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      {/* Notices Grid */}
      {isLoading ? (
        <Card className="p-16 text-center">
          <Loader2 className="size-8 animate-spin mx-auto text-primary" />
          <p className="text-xs text-muted-foreground mt-2">Loading notice board...</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-16 text-center border-dashed border-2">
          <Megaphone className="size-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-bold text-sm text-foreground">No Notices Posted</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            There are currently no active announcements matching your query.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((notice) => (
            <Card key={notice.id} className="p-5 border shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {getPriorityBadge(notice.priority)}
                  <h3 className="font-bold text-base text-foreground">{notice.title}</h3>
                  <Badge variant="secondary" className="text-[10px] font-semibold">
                    {notice.category}
                  </Badge>
                  {notice.targetDepartment && (
                    <Badge variant="outline" className="text-[10px] gap-1 font-mono">
                      <Users className="size-3" /> {notice.targetDepartment}
                    </Badge>
                  )}
                </div>

                <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                  <Calendar className="size-3" /> {new Date(notice.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className="text-xs text-foreground/90 whitespace-pre-line leading-relaxed">
                {notice.content}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t">
                <div className="flex items-center gap-3">
                  {notice.requiresAcknowledgement && (
                    <div className="flex items-center gap-2">
                      {notice.acknowledgedByMe ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs gap-1 font-bold">
                          <CheckCircle2 className="size-3.5" /> Policy Acknowledged
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          className="h-8 text-xs font-bold gap-1.5 bg-primary"
                          onClick={() => ackMutation.mutate(notice.id)}
                          disabled={ackMutation.isPending}
                        >
                          <BookmarkCheck className="size-3.5" /> Acknowledge Policy
                        </Button>
                      )}

                      {isAdmin && (
                        <span className="text-[11px] text-muted-foreground font-mono">
                          ({notice.acknowledgementsCount ?? 0} team members signed)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground"
                      onClick={() => handleOpenEdit(notice)}
                    >
                      <Pencil className="size-3" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs font-semibold gap-1 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm(`Delete notice "${notice.title}"?`)) {
                          deleteMutation.mutate(notice.id);
                        }
                      }}
                    >
                      <Trash2 className="size-3" /> Delete
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE & EDIT MODAL */}
      <Dialog
        open={showCreateModal || !!editingNotice}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateModal(false);
            setEditingNotice(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Megaphone className="size-4 text-primary" /> {editingNotice ? "Edit Notice" : "Post Company Notice"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Publish announcements visible to workspace team members across roles.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Title</Label>
              <Input
                placeholder="Holiday Calendar 2026 or Updated Security Policy"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Priority</Label>
                <Select value={formPriority} onValueChange={(v: any) => setFormPriority(v)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INFO">Info</SelectItem>
                    <SelectItem value="WARNING">Warning</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Target Department</Label>
                <Select value={formDepartment} onValueChange={setFormDepartment}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Entire Workspace (All)</SelectItem>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Sales & Marketing">Sales & Marketing</SelectItem>
                    <SelectItem value="Human Resources">Human Resources</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Category</Label>
              <Input
                placeholder="Company Announcement, Policy, Benefits"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Notice Body / Message</Label>
              <Textarea
                placeholder="Write full announcement details..."
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                className="text-xs min-h-[100px]"
              />
            </div>

            <div className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between">
              <div>
                <div className="font-bold text-foreground">Require Employee Acknowledgement</div>
                <div className="text-[10px] text-muted-foreground">
                  Track employee read receipts for mandatory compliance bulletins.
                </div>
              </div>
              <input
                type="checkbox"
                checked={formRequiresAck}
                onChange={(e) => setFormRequiresAck(e.target.checked)}
                className="size-4 rounded text-primary"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setEditingNotice(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!formTitle.trim() || !formContent.trim() || createMutation.isPending || editMutation.isPending}
              onClick={() => {
                if (editingNotice) {
                  editMutation.mutate(editingNotice.id);
                } else {
                  createMutation.mutate();
                }
              }}
              className="font-bold"
            >
              {createMutation.isPending || editMutation.isPending ? "Saving..." : editingNotice ? "Save Changes" : "Publish Notice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default NoticeBoardPage;
