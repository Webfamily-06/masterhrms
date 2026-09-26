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

const INITIAL_NOTES: Note[] = [
  {
    id: "note-1",
    title: "HR Onboarding Protocol 2026",
    content: "Verify identity documents, issue welcome kit, provision corporate laptop, and trigger induction training module.",
    tag: "hr",
    priority: "high",
    isPinned: true,
    isStarred: true,
    isTrash: false,
    updatedAt: format(new Date(), "yyyy-MM-dd HH:mm"),
  },
  {
    id: "note-2",
    title: "Monthly Payroll Run Checkpoints",
    content: "1. Lock biometric attendance on 28th.\n2. Verify approved leave encashments.\n3. Run statutory PF / TDS computations.\n4. Export bank transfer NEFT sheet.",
    tag: "finance",
    priority: "high",
    isPinned: true,
    isStarred: false,
    isTrash: false,
    updatedAt: format(new Date(), "yyyy-MM-dd HH:mm"),
  },
  {
    id: "note-3",
    title: "Sprint Retrospective Notes",
    content: "Team improved API response times by 35%. Action items: Refactor TanStack queries for caching and add realtime webhooks.",
    tag: "meeting",
    priority: "medium",
    isPinned: false,
    isStarred: true,
    isTrash: false,
    updatedAt: format(new Date(), "yyyy-MM-dd HH:mm"),
  },
];

export function NotesPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";

  const [activeFolder, setActiveFolder] = useState<"all" | "starred" | "trash">("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem(`hrms_notes_${tenantId}`);
    return saved ? JSON.parse(saved) : INITIAL_NOTES;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const [form, setForm] = useState({
    title: "",
    content: "",
    tag: "general" as Note["tag"],
    priority: "medium" as Note["priority"],
    isPinned: false,
    isStarred: false,
  });

  function saveNotes(newNotes: Note[]) {
    setNotes(newNotes);
    localStorage.setItem(`hrms_notes_${tenantId}`, JSON.stringify(newNotes));
  }

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
      const updated = notes.map((n) =>
        n.id === editingNote.id
          ? {
              ...n,
              title: form.title.trim(),
              content: form.content.trim(),
              tag: form.tag,
              priority: form.priority,
              isPinned: form.isPinned,
              isStarred: form.isStarred,
              updatedAt: format(new Date(), "yyyy-MM-dd HH:mm"),
            }
          : n
      );
      saveNotes(updated);
      toast.success("Note updated.");
    } else {
      const newNote: Note = {
        id: `note-${Date.now()}`,
        title: form.title.trim(),
        content: form.content.trim(),
        tag: form.tag,
        priority: form.priority,
        isPinned: form.isPinned,
        isStarred: form.isStarred,
        isTrash: false,
        updatedAt: format(new Date(), "yyyy-MM-dd HH:mm"),
      };
      saveNotes([newNote, ...notes]);
      toast.success("Note created.");
    }

    setIsModalOpen(false);
  }

  function toggleStar(id: string) {
    const updated = notes.map((n) => (n.id === id ? { ...n, isStarred: !n.isStarred } : n));
    saveNotes(updated);
  }

  function togglePin(id: string) {
    const updated = notes.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n));
    saveNotes(updated);
    toast.success("Note pin status updated.");
  }

  function moveToTrash(id: string) {
    const updated = notes.map((n) => (n.id === id ? { ...n, isTrash: true } : n));
    saveNotes(updated);
    toast.success("Moved note to trash.");
  }

  function restoreFromTrash(id: string) {
    const updated = notes.map((n) => (n.id === id ? { ...n, isTrash: false } : n));
    saveNotes(updated);
    toast.success("Note restored.");
  }

  function permanentlyDelete(id: string) {
    const updated = notes.filter((n) => n.id !== id);
    saveNotes(updated);
    toast.success("Note permanently deleted.");
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

  return (
    <div className="space-y-5 max-w-full pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            <h1 className="text-2xl font-black tracking-tight text-foreground">Workspace Notes</h1>
            <Badge variant="outline" className="text-[10px] font-mono">
              {filteredNotes.length} Notes
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Personal memos, meeting minutes, company standard operating procedures, and quick drafts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportNotesTxt} className="gap-1.5 text-xs font-semibold">
            <Download className="size-3.5" /> Export Notes
          </Button>
          <Button size="sm" onClick={handleOpenCreate} className="gap-1.5 text-xs font-bold bg-primary text-primary-foreground">
            <Plus className="size-3.5" /> New Note
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar Nav */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="p-4 space-y-4">
            {/* Folder Views */}
            <div className="space-y-1">
              <button
                onClick={() => setActiveFolder("all")}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all text-left",
                  activeFolder === "all" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
                )}
              >
                <span className="flex items-center gap-2">
                  <FileText className="size-4" /> All Active Notes
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {notes.filter((n) => !n.isTrash).length}
                </Badge>
              </button>

              <button
                onClick={() => setActiveFolder("starred")}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all text-left",
                  activeFolder === "starred" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
                )}
              >
                <span className="flex items-center gap-2">
                  <Star className="size-4 text-amber-500 fill-amber-500" /> Starred & Important
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {notes.filter((n) => n.isStarred && !n.isTrash).length}
                </Badge>
              </button>

              <button
                onClick={() => setActiveFolder("trash")}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all text-left",
                  activeFolder === "trash" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
                )}
              >
                <span className="flex items-center gap-2">
                  <Trash2 className="size-4 text-rose-500" /> Trash / Bin
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {notes.filter((n) => n.isTrash).length}
                </Badge>
              </button>
            </div>

            {/* Tag Categories */}
            <div className="border-t pt-3 space-y-1">
              <h4 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                Topic Tags
              </h4>
              <button
                onClick={() => setSelectedTag("all")}
                className={cn(
                  "w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-between",
                  selectedTag === "all" ? "bg-muted font-bold text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>All Topics</span>
              </button>
              {Object.entries(TAGS).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => setSelectedTag(key)}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-between",
                    selectedTag === key ? "bg-muted font-bold text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-full", t.bg)} />
                    {t.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Priority Filter */}
            <div className="border-t pt-3 space-y-1">
              <h4 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                Priority
              </h4>
              {(["all", "high", "medium", "low"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPriority(p)}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 rounded-md text-xs capitalize font-medium transition-all",
                    selectedPriority === p ? "bg-muted font-bold text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p} Priority
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Notes Grid */}
        <div className="lg:col-span-9 space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in title or note contents..."
              className="pl-9 text-xs h-9"
            />
          </div>

          {filteredNotes.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground text-xs italic">
              No notes found in this view. Click "New Note" above to write one.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredNotes.map((note) => {
                const tagInfo = TAGS[note.tag] || TAGS.general;
                return (
                  <Card
                    key={note.id}
                    className={cn(
                      "p-4 flex flex-col justify-between transition-all hover:shadow-md border",
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

                      <h3 className="font-bold text-sm text-foreground mb-1 line-clamp-1">{note.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-line leading-relaxed mb-4">
                        {note.content}
                      </p>
                    </div>

                    <div className="border-t pt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-mono text-[10px] flex items-center gap-1">
                        <Clock className="size-3" /> {note.updatedAt.slice(0, 10)}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {note.isTrash ? (
                          <>
                            <Button size="icon" variant="ghost" className="size-6 text-emerald-600" onClick={() => restoreFromTrash(note.id)} title="Restore">
                              <Check className="size-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="size-6 text-rose-600" onClick={() => permanentlyDelete(note.id)} title="Delete Forever">
                              <Trash2 className="size-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="icon" variant="ghost" className="size-6" onClick={() => handleOpenEdit(note)} title="Edit Note">
                              <Edit2 className="size-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="size-6 text-rose-500" onClick={() => moveToTrash(note.id)} title="Move to Trash">
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
        </div>
      </div>

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
