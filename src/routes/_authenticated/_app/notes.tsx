import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useCurrentProfile, useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  FileText,
  Plus,
  Search,
  Star,
  Trash2,
  Edit2,
  Tag,
  Pin,
  Clock,
  Sparkles,
  Download,
  Check,
  Share2,
  FolderLock,
  Layers,
  Archive,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/notes")({
  component: NotesPage,
  head: () => ({ meta: [{ title: "Workspace Notes & Documentation — Master HRMS" }] }),
});

export type Note = {
  id: string;
  title: string;
  content: string;
  tag: "general" | "hr" | "finance" | "engineering" | "meeting" | "policy";
  priority: "high" | "medium" | "low";
  isPinned: boolean;
  isStarred: boolean;
  isTrash: boolean;
  updatedAt: string;
  color?: string;
};

const TAGS: Record<string, { label: string; color: string; bg: string }> = {
  general: { label: "General", color: "text-slate-700 dark:text-slate-300", bg: "bg-slate-500/10 border-slate-500/20" },
  hr: { label: "HR Policies", color: "text-purple-700 dark:text-purple-300", bg: "bg-purple-500/10 border-purple-500/20" },
  finance: { label: "Finance & Tax", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/20" },
  engineering: { label: "Tech & Architecture", color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-500/10 border-blue-500/20" },
  meeting: { label: "Meeting Minutes", color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-500/10 border-amber-500/20" },
  policy: { label: "Compliance & Legal", color: "text-rose-700 dark:text-rose-300", bg: "bg-rose-500/10 border-rose-500/20" },
};

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { LoadingState } from "@/components/system-states/loading-state";
import { EmptyState } from "@/components/system-states/empty-state";

export function NotesPage() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  const [activeFolder, setActiveFolder] = useState<"all" | "starred" | "trash">("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: notesData, isLoading } = useQuery({
    queryKey: ["notes"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>("/notes?isTrash=all");
      return res.data || [];
    },
  });

  const notes: Note[] = useMemo(() => {
    return (notesData || []).map((n: any) => ({
      id: n.id,
      title: n.title,
      content: n.content || "",
      tag: (n.tag || "general") as Note["tag"],
      priority: (n.priority || "medium") as Note["priority"],
      isPinned: Boolean(n.isPinned),
      isStarred: Boolean(n.isStarred),
      isTrash: Boolean(n.isTrash),
      updatedAt: n.updatedAt ? format(new Date(n.updatedAt), "yyyy-MM-dd HH:mm") : format(new Date(), "yyyy-MM-dd HH:mm"),
      color: n.color || undefined,
    }));
  }, [notesData]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteToDeleteForever, setNoteToDeleteForever] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    content: "",
    tag: "general" as Note["tag"],
    priority: "medium" as Note["priority"],
    isPinned: false,
    isStarred: false,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/notes", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Note created.");
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to create note");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.put(`/notes/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to update note");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/notes/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Note permanently deleted.");
      setNoteToDeleteForever(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to delete note");
    },
  });

  function handleOpenCreate() {
    setEditingNote(null);
    setForm({
      title: "",
      content: "",
      tag: "general",
      priority: "medium",
      isPinned: false,
      isStarred: false,
    });
    setIsModalOpen(true);
  }

  function handleOpenEdit(note: Note) {
    setEditingNote(note);
    setForm({
      title: note.title,
      content: note.content,
      tag: note.tag,
      priority: note.priority,
      isPinned: note.isPinned,
      isStarred: note.isStarred,
    });
    setIsModalOpen(true);
  }

  function handleSaveNote() {
    if (!form.title.trim()) {
      toast.error("Note title is required.");
      return;
    }

    if (editingNote) {
      updateMutation.mutate(
        {
          id: editingNote.id,
          data: {
            title: form.title.trim(),
            content: form.content.trim(),
            tag: form.tag,
            priority: form.priority,
            isPinned: form.isPinned,
            isStarred: form.isStarred,
          },
        },
        {
          onSuccess: () => {
            toast.success("Note updated.");
            setIsModalOpen(false);
          },
        }
      );
    } else {
      createMutation.mutate({
        title: form.title.trim(),
        content: form.content.trim(),
        tag: form.tag,
        priority: form.priority,
        isPinned: form.isPinned,
        isStarred: form.isStarred,
      });
    }
  }

  function toggleStar(id: string) {
    const n = notes.find((item) => item.id === id);
    if (!n) return;
    updateMutation.mutate(
      {
        id,
        data: { isStarred: !n.isStarred },
      },
      {
        onSuccess: () => toast.success(n.isStarred ? "Removed from starred" : "Added to starred"),
      }
    );
  }

  function togglePin(id: string) {
    const n = notes.find((item) => item.id === id);
    if (!n) return;
    updateMutation.mutate(
      {
        id,
        data: { isPinned: !n.isPinned },
      },
      {
        onSuccess: () => toast.success("Note pin status updated."),
      }
    );
  }

  function moveToTrash(id: string) {
    updateMutation.mutate(
      {
        id,
        data: { isTrash: true },
      },
      {
        onSuccess: () => toast.success("Moved note to trash."),
      }
    );
  }

  function restoreFromTrash(id: string) {
    updateMutation.mutate(
      {
        id,
        data: { isTrash: false },
      },
      {
        onSuccess: () => toast.success("Note restored."),
      }
    );
  }

  function permanentlyDelete(id: string) {
    deleteMutation.mutate(id);
  }

  function exportNotesTxt() {
    const content = notes
      .filter((n) => !n.isTrash)
      .map((n) => `=== ${n.title} (${n.tag.toUpperCase()}) ===\nLast Updated: ${n.updatedAt}\n\n${n.content}\n\n------------------------\n`)
      .join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hrms_notes_${format(new Date(), "yyyyMMdd")}.txt`;
    link.click();
    toast.success("Notes exported to text file.");
  }

  // Filtered notes
  const filteredNotes = useMemo(() => {
    return notes
      .filter((n) => {
        if (activeFolder === "starred") return n.isStarred && !n.isTrash;
        if (activeFolder === "trash") return n.isTrash;
        return !n.isTrash;
      })
      .filter((n) => (selectedTag === "all" ? true : n.tag === selectedTag))
      .filter((n) => (selectedPriority === "all" ? true : n.priority === selectedPriority))
      .filter((n) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [notes, activeFolder, selectedTag, selectedPriority, searchQuery]);

  // KPI Counts
  const activeCount = notes.filter((n) => !n.isTrash).length;
  const starredCount = notes.filter((n) => n.isStarred && !n.isTrash).length;
  const pinnedCount = notes.filter((n) => n.isPinned && !n.isTrash).length;
  const trashCount = notes.filter((n) => n.isTrash).length;

  return (
    <div className="space-y-6 max-w-full pb-8">
      {/* ─── PageHeader ─── */}
      <PageHeader
        title="Workspace Notes"
        description="Personal memos, meeting minutes, company standard operating procedures, and quick drafts."
        icon={<FileText className="size-5 text-primary" />}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Workplace", href: "/notes" },
          { label: "Workspace Notes" },
        ]}
        badge={
          <Badge variant="outline" className="text-[10px] font-mono border-border/80">
            {filteredNotes.length} Notes Shown
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={exportNotesTxt}
              className="gap-1.5 text-xs font-semibold"
            >
              <Download className="size-3.5" /> Export Notes
            </Button>
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="gap-1.5 text-xs font-semibold shadow-2xs"
            >
              <Plus className="size-3.5" /> New Note
            </Button>
          </div>
        }
      />

      {/* ─── KPI Stats Overview Grid ─── */}
      <StatsOverviewGrid columns={4}>
        <StatCard
          label="Active Notes"
          value={activeCount}
          icon={<FileText className="size-4.5" />}
          description="Workspace active memos"
          variant="default"
          isLoading={isLoading}
        />
        <StatCard
          label="Starred & Important"
          value={starredCount}
          icon={<Star className="size-4.5 text-amber-500 fill-amber-500" />}
          description="Bookmarked for quick review"
          variant="warning"
          isLoading={isLoading}
        />
        <StatCard
          label="Pinned Notes"
          value={pinnedCount}
          icon={<Pin className="size-4.5" />}
          description="Priority notes fixed at top"
          variant="primary"
          isLoading={isLoading}
        />
        <StatCard
          label="Trash / Bin"
          value={trashCount}
          icon={<Trash2 className="size-4.5" />}
          description="Pending permanent purge"
          variant="rose"
          isLoading={isLoading}
        />
      </StatsOverviewGrid>

      {/* ─── FilterToolbar ─── */}
      <FilterToolbar
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: "Search in title or note contents...",
        }}
        filters={
          <>
            {/* Folder Views Toggle */}
            <div className="flex items-center border border-border/70 rounded-lg p-0.5 bg-muted/40 shrink-0">
              <Button
                size="sm"
                variant={activeFolder === "all" ? "secondary" : "ghost"}
                onClick={() => setActiveFolder("all")}
                className={cn(
                  "h-7 px-2.5 text-xs font-semibold gap-1.5",
                  activeFolder === "all" && "bg-background shadow-2xs font-bold text-foreground"
                )}
              >
                <FileText className="size-3.5" /> All ({activeCount})
              </Button>
              <Button
                size="sm"
                variant={activeFolder === "starred" ? "secondary" : "ghost"}
                onClick={() => setActiveFolder("starred")}
                className={cn(
                  "h-7 px-2.5 text-xs font-semibold gap-1.5",
                  activeFolder === "starred" && "bg-background shadow-2xs font-bold text-foreground"
                )}
              >
                <Star className="size-3.5 text-amber-500 fill-amber-500" /> Starred ({starredCount})
              </Button>
              <Button
                size="sm"
                variant={activeFolder === "trash" ? "secondary" : "ghost"}
                onClick={() => setActiveFolder("trash")}
                className={cn(
                  "h-7 px-2.5 text-xs font-semibold gap-1.5",
                  activeFolder === "trash" && "bg-background shadow-2xs font-bold text-foreground"
                )}
              >
                <Trash2 className="size-3.5 text-rose-500" /> Trash ({trashCount})
              </Button>
            </div>

            {/* Tag Filter */}
            <Select value={selectedTag} onValueChange={setSelectedTag}>
              <SelectTrigger className="w-[140px] text-xs h-8.5 bg-background border-border/80">
                <SelectValue placeholder="Topics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {Object.entries(TAGS).map(([key, t]) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger className="w-[130px] text-xs h-8.5 bg-background border-border/80">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high" className="text-xs">High Priority</SelectItem>
                <SelectItem value="medium" className="text-xs">Medium Priority</SelectItem>
                <SelectItem value="low" className="text-xs">Low Priority</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      {/* ─── Notes Content Grid ─── */}
      {isLoading ? (
        <LoadingState
          variant="cards"
          rows={3}
          message="Loading workspace notes and memos..."
        />
      ) : filteredNotes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No notes found"
          description={
            searchQuery || selectedTag !== "all" || selectedPriority !== "all"
              ? "No notes match your current filter parameters."
              : activeFolder === "starred"
              ? "No starred notes yet. Click the star icon on any note to mark it as important."
              : activeFolder === "trash"
              ? "Your trash is empty."
              : "No notes registered in this workspace yet. Write your first memo to get started."
          }
          actionLabel="Create First Note"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredNotes.map((note) => {
            const tagInfo = TAGS[note.tag] || TAGS.general;
            return (
              <Card
                key={note.id}
                className={cn(
                  "p-4 flex flex-col justify-between transition-all hover:shadow-xs border border-border/70 bg-card rounded-xl",
                  note.isPinned && "ring-1 ring-primary/40 bg-primary/[0.02]"
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant="outline" className={cn("text-[10px] font-semibold border", tagInfo.bg, tagInfo.color)}>
                      {tagInfo.label}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => togglePin(note.id)}
                        className={cn(
                          "size-6 rounded flex items-center justify-center transition-colors cursor-pointer",
                          note.isPinned ? "text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                        title={note.isPinned ? "Unpin note" : "Pin note to top"}
                      >
                        <Pin className="size-3.5" />
                      </button>
                      <button
                        onClick={() => toggleStar(note.id)}
                        className={cn(
                          "size-6 rounded flex items-center justify-center transition-colors cursor-pointer",
                          note.isStarred ? "text-amber-500 fill-amber-500" : "text-muted-foreground hover:text-foreground"
                        )}
                        title={note.isStarred ? "Starred" : "Star note"}
                      >
                        <Star className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-semibold text-sm text-foreground mb-1 line-clamp-1">{note.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-line leading-relaxed mb-4">
                    {note.content}
                  </p>
                </div>

                <div className="border-t border-border/60 pt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-mono text-[10px] flex items-center gap-1">
                    <Clock className="size-3 text-muted-foreground/70" /> {note.updatedAt.slice(0, 10)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {note.isTrash ? (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-6 text-emerald-600 hover:bg-emerald-500/10"
                          onClick={() => restoreFromTrash(note.id)}
                          title="Restore"
                        >
                          <Check className="size-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-6 text-rose-600 hover:bg-rose-500/10"
                          onClick={() => setNoteToDeleteForever(note.id)}
                          title="Delete Forever"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-6"
                          onClick={() => handleOpenEdit(note)}
                          title="Edit Note"
                        >
                          <Edit2 className="size-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-6 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                          onClick={() => moveToTrash(note.id)}
                          title="Move to Trash"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── ConfirmationDialog for Permanent Note Deletion ─── */}
      <ConfirmationDialog
        open={!!noteToDeleteForever}
        onOpenChange={(open) => !open && setNoteToDeleteForever(null)}
        title="Permanently Delete Note?"
        description="This will permanently delete this note from the trash bin. This action cannot be reversed."
        confirmLabel="Delete Forever"
        onConfirm={() => {
          if (noteToDeleteForever) {
            permanentlyDelete(noteToDeleteForever);
          }
        }}
        isLoading={deleteMutation.isPending}
      />

      {/* Modal: Create or Edit Note */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5 text-primary" /> {editingNote ? "Edit Note" : "Create Workspace Note"}
            </DialogTitle>
            <DialogDescription>
              Write personal memos, meeting summaries, or team operating guidelines.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-bold">Title *</Label>
              <Input
                placeholder="Note title..."
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Category Tag</Label>
                <Select value={form.tag} onValueChange={(val: any) => setForm({ ...form, tag: val })}>
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TAGS).map(([key, t]) => (
                      <SelectItem key={key} value={key} className="text-xs">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold">Priority</Label>
                <Select value={form.priority} onValueChange={(val: any) => setForm({ ...form, priority: val })}>
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high" className="text-xs">High</SelectItem>
                    <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                    <SelectItem value="low" className="text-xs">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold">Note Body</Label>
              <Textarea
                rows={6}
                placeholder="Write your note here..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="mt-1 text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveNote} className="font-bold">
              {editingNote ? "Save Changes" : "Create Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
