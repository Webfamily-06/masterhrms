"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckSquare,
  Plus,
  Search,
  Calendar,
  Tag,
  Trash2,
  Edit2,
  Clock,
  ListTodo,
  ArrowUpDown,
  CheckCircle2,
  Circle,
  Star,
  User,
  Users,
  X,
  Send,
  Paperclip,
  History,
  Check,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Layers,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import { format, isAfter, isBefore, startOfDay, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { LoadingState } from "@/components/system-states/loading-state";
import { EmptyState } from "@/components/system-states/empty-state";

export interface TodoChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface TodoCommentItem {
  id: string;
  author: string;
  authorId?: string;
  text: string;
  createdAt: string;
  avatar?: string;
}

export interface TodoAttachmentItem {
  id: string;
  name: string;
  url: string;
  size?: string;
  uploadedAt?: string;
}

export interface TodoActivityItem {
  id: string;
  text: string;
  timestamp: string;
}

export interface TodoAssigneeItem {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role?: string;
  department?: string;
  type?: "employee" | "user";
}

export interface TodoCategory {
  id: string;
  name: string;
  color?: string;
  bg?: string;
}

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: "urgent" | "high" | "medium" | "low" | string;
  tag: string;
  startDate: string;
  dueDate: string;
  createdAt: string;
  progress: number;
  starred: boolean;
  assignedTo?: string | null;
  assigneeId?: string | null;
  assignee?: {
    id: string;
    name?: string;
    type?: string;
    avatar?: string;
  } | null;
  assignees: TodoAssigneeItem[];
  checklist: TodoChecklistItem[];
  comments: TodoCommentItem[];
  attachments: TodoAttachmentItem[];
  activity: TodoActivityItem[];
  isCreator?: boolean;
  isAssignee?: boolean;
  sourceDomain?: string;
  badgeLabel?: string;
  badgeColor?: string;
}

export interface AssigneeOption {
  id: string;
  name: string;
  email: string;
  type: "employee" | "user";
  role?: string;
  department?: string;
  avatar?: string;
}

export interface UnifiedTodoAppProps {
  initialView?: "list" | "gantt";
  mode?: "hr" | "me" | "workspace" | "apps";
  title?: string;
  description?: string;
}

const DEFAULT_TAG_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  internal: { label: "Internal", color: "text-slate-700 dark:text-slate-300", bg: "bg-slate-500/10 border-slate-500/20" },
  projects: { label: "Client Projects", color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-500/10 border-blue-500/20" },
  meetings: { label: "Meeting Prep", color: "text-purple-700 dark:text-purple-300", bg: "bg-purple-500/10 border-purple-500/20" },
  reminder: { label: "Action Reminder", color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-500/10 border-amber-500/20" },
  research: { label: "Research & Design", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/20" },
  operations: { label: "HR Operations", color: "text-cyan-700 dark:text-cyan-300", bg: "bg-cyan-500/10 border-cyan-500/20" },
};

const COLOR_PALETTE_OPTIONS = [
  { label: "Slate", color: "text-slate-700 dark:text-slate-300", bg: "bg-slate-500/10 border-slate-500/20", preview: "bg-slate-500" },
  { label: "Blue", color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-500/10 border-blue-500/20", preview: "bg-blue-500" },
  { label: "Purple", color: "text-purple-700 dark:text-purple-300", bg: "bg-purple-500/10 border-purple-500/20", preview: "bg-purple-500" },
  { label: "Emerald", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/20", preview: "bg-emerald-500" },
  { label: "Amber", color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-500/10 border-amber-500/20", preview: "bg-amber-500" },
  { label: "Rose", color: "text-rose-700 dark:text-rose-400", bg: "bg-rose-500/10 border-rose-500/20", preview: "bg-rose-500" },
  { label: "Cyan", color: "text-cyan-700 dark:text-cyan-300", bg: "bg-cyan-500/10 border-cyan-500/20", preview: "bg-cyan-500" },
  { label: "Indigo", color: "text-indigo-700 dark:text-indigo-300", bg: "bg-indigo-500/10 border-indigo-500/20", preview: "bg-indigo-500" },
];

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  urgent: { label: "Urgent", color: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30", dot: "bg-rose-500" },
  high: { label: "High", color: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30", dot: "bg-red-500" },
  medium: { label: "Medium", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30", dot: "bg-amber-500" },
  low: { label: "Low", color: "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30", dot: "bg-slate-400" },
};

/**
 * Reusable user avatar with authoritative profile photo and initials fallback
 */
export function UserAvatar({
  name = "",
  avatar = "",
  className = "w-6 h-6",
  fallbackClassName = "text-[10px] font-semibold",
}: {
  name?: string;
  avatar?: string | null;
  className?: string;
  fallbackClassName?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const initials = useMemo(() => {
    const clean = (name || "").trim();
    if (!clean) return "?";
    const parts = clean.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [name]);

  if (avatar && !imgError) {
    return (
      <img
        src={avatar}
        alt={name || "User"}
        className={cn("rounded-full object-cover shrink-0 border border-border/50 aspect-square", className)}
        onError={() => setImgError(true)}
      />
    );
  }

  const colors = [
    "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
    "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
    "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
  ];
  const hash = (name || "").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const colorClass = colors[hash % colors.length];

  return (
    <div
      className={cn(
        "rounded-full shrink-0 flex items-center justify-center border select-none aspect-square",
        colorClass,
        className
      )}
      title={name}
    >
      <span className={fallbackClassName}>{initials}</span>
    </div>
  );
}

/**
 * Searchable multi-assignee selector with chips, select-all, and tenant isolation
 */
export function MultiAssigneeSelector({
  value = [],
  onChange,
  assignees = [],
  isLoading = false,
  error = null,
  onRetry,
  disabled = false,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  assignees: AssigneeOption[];
  isLoading?: boolean;
  error?: any;
  onRetry?: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return assignees;
    const q = searchQuery.toLowerCase();
    return assignees.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.role && a.role.toLowerCase().includes(q)) ||
        (a.department && a.department.toLowerCase().includes(q))
    );
  }, [assignees, searchQuery]);

  const selectedAssignees = useMemo(() => {
    return value
      .map((id) => assignees.find((a) => a.id === id))
      .filter(Boolean) as AssigneeOption[];
  }, [value, assignees]);

  const toggleUser = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const handleSelectAll = () => {
    const allFilteredIds = filtered.map((a) => a.id);
    const combined = Array.from(new Set([...value, ...allFilteredIds]));
    onChange(combined);
  };

  const handleClear = () => {
    onChange([]);
  };

  return (
    <div className="space-y-2">
      {/* Selected Chips */}
      {selectedAssignees.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border bg-muted/30 min-h-[38px] items-center">
          {selectedAssignees.map((a) => (
            <div
              key={a.id}
              className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-background border text-xs shadow-xs"
            >
              <UserAvatar name={a.name} avatar={a.avatar} className="w-5 h-5 text-[9px]" />
              <span className="font-medium truncate max-w-[130px]">{a.name}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleUser(a.id);
                }}
                className="text-muted-foreground hover:text-rose-600 rounded-full p-0.5 transition-colors"
                title={`Remove ${a.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {selectedAssignees.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={handleClear}
              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-rose-600"
            >
              Clear all ({selectedAssignees.length})
            </Button>
          )}
        </div>
      )}

      {/* Popover Selector Trigger */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="w-full justify-between h-9 text-xs px-3 font-normal"
          >
            <span className="truncate">
              {value.length === 0
                ? "Select team members..."
                : `${value.length} team member${value.length > 1 ? "s" : ""} selected`}
            </span>
            <Users className="w-3.5 h-3.5 text-muted-foreground ml-2 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3 space-y-3" align="start">
          {/* Search input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search eligible users..."
              className="h-8 pl-8 text-xs"
              autoFocus
            />
          </div>

          {/* Action bar: Select All & Clear */}
          <div className="flex items-center justify-between text-xs pt-1 border-t">
            <span className="text-[11px] text-muted-foreground">
              {filtered.length} eligible member{filtered.length !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                Select All
              </button>
              {value.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[11px] text-muted-foreground hover:text-rose-600 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* List State */}
          <div className="max-h-[220px] overflow-y-auto space-y-1 pr-1">
            {isLoading ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Loading eligible assignees...
              </div>
            ) : error ? (
              <div className="py-4 text-center space-y-2">
                <p className="text-xs text-rose-600">Failed to load assignees</p>
                {onRetry && (
                  <Button type="button" size="sm" variant="outline" onClick={onRetry} className="h-6 text-xs">
                    Retry
                  </Button>
                )}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No eligible team members found.
              </div>
            ) : (
              filtered.map((user) => {
                const isSelected = value.includes(user.id);
                return (
                  <div
                    key={user.id}
                    onClick={() => toggleUser(user.id)}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors text-xs",
                      isSelected && "bg-primary/10 border border-primary/20"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                      <UserAvatar name={user.name} avatar={user.avatar} className="w-6 h-6 text-[10px]" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground truncate">{user.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {user.role || user.department || user.email}
                        </div>
                      </div>
                    </div>
                    <Checkbox checked={isSelected} onCheckedChange={() => toggleUser(user.id)} />
                  </div>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/**
 * Category Manager Dialog for creating, editing, and safely deleting workspace tags
 */
export function CategoryManagerDialog({
  open,
  onOpenChange,
  categories = [],
  onCreated,
  onUpdated,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: TodoCategory[];
  onCreated: (cat: TodoCategory) => void;
  onUpdated: (cat: TodoCategory) => void;
  onDeleted: (id: string) => void;
}) {
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(COLOR_PALETTE_OPTIONS[0]);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(COLOR_PALETTE_OPTIONS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!newCatName.trim()) {
      toast.error("Category name is required");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.post<{ success: boolean; data: TodoCategory }>("/todos/categories", {
        name: newCatName.trim(),
        color: newCatColor.color,
        bg: newCatColor.bg,
      });
      toast.success("Category created successfully");
      setNewCatName("");
      onCreated(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to create category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) {
      toast.error("Category name is required");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.put<{ success: boolean; data: TodoCategory }>(`/todos/categories/${id}`, {
        name: editName.trim(),
        color: editColor.color,
        bg: editColor.bg,
      });
      toast.success("Category updated");
      setEditingCatId(null);
      onUpdated(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsSubmitting(true);
    try {
      await api.delete(`/todos/categories/${id}`);
      toast.success("Category removed. Referencing tasks safely reset to Internal.");
      onDeleted(id);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to delete category");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            Manage Category Tags
          </DialogTitle>
          <DialogDescription className="text-xs">
            Create, customize, and manage tenant task categories. Deleting a category safely reassigns tasks to Internal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Create new category section */}
          <div className="p-3 rounded-lg border bg-muted/30 space-y-2.5">
            <Label className="text-xs font-semibold">New Category</Label>
            <div className="flex gap-2">
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Category name (e.g., Compliance, Onboarding)..."
                className="h-8 text-xs flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <Button
                size="sm"
                className="h-8 text-xs px-3 font-semibold"
                onClick={handleCreate}
                disabled={isSubmitting}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>
            {/* Color Palette Selector */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[11px] text-muted-foreground mr-1">Color:</span>
              {COLOR_PALETTE_OPTIONS.map((pal) => (
                <button
                  key={pal.label}
                  type="button"
                  onClick={() => setNewCatColor(pal)}
                  className={cn(
                    "w-5 h-5 rounded-full border-2 transition-transform",
                    pal.preview,
                    newCatColor.label === pal.label ? "scale-110 border-primary" : "border-transparent opacity-70"
                  )}
                  title={pal.label}
                />
              ))}
            </div>
          </div>

          {/* Existing Categories List */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Available Categories</Label>
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {categories.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-3 text-center">No categories found.</p>
              ) : (
                categories.map((cat) => {
                  const isEditing = editingCatId === cat.id;
                  const isProtected = cat.id === "internal";

                  if (isEditing) {
                    return (
                      <div key={cat.id} className="p-2.5 rounded-lg border bg-muted/40 space-y-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-7 text-xs"
                          autoFocus
                        />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {COLOR_PALETTE_OPTIONS.map((pal) => (
                              <button
                                key={pal.label}
                                type="button"
                                onClick={() => setEditColor(pal)}
                                className={cn(
                                  "w-4 h-4 rounded-full border-2 transition-transform",
                                  pal.preview,
                                  editColor.label === pal.label ? "scale-110 border-primary" : "border-transparent opacity-70"
                                )}
                                title={pal.label}
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs"
                              onClick={() => setEditingCatId(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              className="h-6 px-2 text-xs font-semibold"
                              onClick={() => handleUpdate(cat.id)}
                              disabled={isSubmitting}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-2 rounded-lg border bg-card text-xs group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5", cat.color, cat.bg)}>
                          {cat.name}
                        </Badge>
                        {isProtected && (
                          <span className="text-[10px] text-muted-foreground font-mono">(Default)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setEditingCatId(cat.id);
                            setEditName(cat.name);
                            const matchedPal = COLOR_PALETTE_OPTIONS.find((p) => p.color === cat.color) || COLOR_PALETTE_OPTIONS[0];
                            setEditColor(matchedPal);
                          }}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        {!isProtected && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-rose-600"
                            onClick={() => handleDelete(cat.id)}
                            disabled={isSubmitting}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UnifiedTodoApp({
  initialView = "list",
  mode = "workspace",
  title = "Todo & Tasks",
  description = "Consolidated task tracking, subtask checklists, and interactive Gantt scheduling.",
}: UnifiedTodoAppProps) {
  const queryClient = useQueryClient();
  const { user } = useSession();

  // Active view: list or gantt
  const [viewMode, setViewMode] = useState<"list" | "gantt">(() => {
    if (typeof window !== "undefined") {
      if (window.location.pathname.endsWith("/gantt")) return "gantt";
      const params = new URLSearchParams(window.location.search);
      const qView = params.get("view");
      if (qView === "gantt" || qView === "list") return qView;
    }
    return initialView;
  });

  // Sync viewMode changes to URL pathname and search param smoothly without full page refresh
  const handleViewChange = (newView: "list" | "gantt") => {
    setViewMode(newView);
    if (typeof window !== "undefined") {
      const pathname = window.location.pathname;
      let targetPath = pathname;
      if (newView === "gantt") {
        if (pathname === "/hr/todo") targetPath = "/hr/todo/gantt";
        else if (pathname === "/me/todo") targetPath = "/me/todo/gantt";
        else if (pathname === "/tenant/todo") targetPath = "/tenant/todo/gantt";
        else if (pathname === "/apps/todo/task-list") targetPath = "/apps/todo/gantt";
      } else {
        if (pathname === "/hr/todo/gantt") targetPath = "/hr/todo";
        else if (pathname === "/me/todo/gantt") targetPath = "/me/todo";
        else if (pathname === "/tenant/todo/gantt") targetPath = "/tenant/todo";
        else if (pathname === "/apps/todo/gantt") targetPath = "/apps/todo/task-list";
      }
      const url = new URL(window.location.href);
      url.pathname = targetPath;
      url.searchParams.set("view", newView);
      window.history.replaceState({}, "", url.toString());
    }
  };

  // Filter and search state
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | "pending" | "completed">("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"created" | "due" | "priority" | "progress">("created");

  // Selection & Modal State
  const [selectedTodo, setSelectedTodo] = useState<TodoItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [todoToDelete, setTodoToDelete] = useState<string | null>(null);

  // Detail panel active tab: Checklist, Comments, Files, Activity
  const [detailTab, setDetailTab] = useState<"checklist" | "comments" | "files" | "activity">("checklist");
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [newCommentText, setNewCommentText] = useState("");

  // Gantt Scale & Navigation
  const [timelineScale, setTimelineScale] = useState<"days" | "weeks">("days");
  const [ganttWindowOffset, setGanttWindowOffset] = useState<number>(0);

  // Task Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    tag: "internal",
    startDate: format(new Date(), "yyyy-MM-dd"),
    dueDate: format(addDays(new Date(), 5), "yyyy-MM-dd"),
    assignees: [] as string[],
    progress: 0,
    starred: false,
  });

  // 1. Fetch authorized tasks from authoritative API
  const { data: todosData = [], isLoading, refetch } = useQuery<TodoItem[]>({
    queryKey: ["todos"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>("/todos");
      return (res.data || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description || "",
        completed: Boolean(t.completed),
        priority: (t.priority || "medium").toLowerCase(),
        tag: (t.tag || "internal").toLowerCase(),
        startDate: t.startDate
          ? format(new Date(t.startDate), "yyyy-MM-dd")
          : format(new Date(t.createdAt || Date.now()), "yyyy-MM-dd"),
        dueDate: t.dueDate
          ? format(new Date(t.dueDate), "yyyy-MM-dd")
          : format(addDays(new Date(), 5), "yyyy-MM-dd"),
        createdAt: t.createdAt
          ? format(new Date(t.createdAt), "yyyy-MM-dd")
          : format(new Date(), "yyyy-MM-dd"),
        progress: typeof t.progress === "number" ? t.progress : t.completed ? 100 : 0,
        starred: Boolean(t.starred),
        assignedTo: t.assignedTo || t.assigneeId || null,
        assigneeId: t.assigneeId || t.assignedTo || null,
        assignee: t.assignee || null,
        assignees: Array.isArray(t.assignees) ? t.assignees : (t.assignee ? [t.assignee] : []),
        checklist: Array.isArray(t.checklist) ? t.checklist : [],
        comments: Array.isArray(t.comments) ? t.comments : [],
        attachments: Array.isArray(t.attachments) ? t.attachments : [],
        activity: Array.isArray(t.activity) ? t.activity : [],
        isCreator: Boolean(t.isCreator),
        isAssignee: Boolean(t.isAssignee),
        sourceDomain: t.sourceDomain,
        badgeLabel: t.badgeLabel,
        badgeColor: t.badgeColor,
      }));
    },
  });

  // 2. Fetch assignees for the tenant
  const {
    data: assignees = [],
    isLoading: isLoadingAssignees,
    error: assigneesError,
    refetch: refetchAssignees,
  } = useQuery<AssigneeOption[]>({
    queryKey: ["todos-assignees"],
    queryFn: async () => {
      try {
        const res = await api.get<{ success: boolean; data: AssigneeOption[] }>("/todos/assignees");
        return res.data || [];
      } catch {
        return [];
      }
    },
  });

  // 3. Fetch workspace categories from authoritative API
  const {
    data: categories = [],
    refetch: refetchCategories,
  } = useQuery<TodoCategory[]>({
    queryKey: ["todos-categories"],
    queryFn: async () => {
      try {
        const res = await api.get<{ success: boolean; data: TodoCategory[] }>("/todos/categories");
        return res.data || [];
      } catch {
        return Object.entries(DEFAULT_TAG_CONFIG).map(([id, cfg]) => ({
          id,
          name: cfg.label,
          color: cfg.color,
          bg: cfg.bg,
        }));
      }
    },
  });

  // Dynamic tag config map
  const tagConfigMap = useMemo(() => {
    const map: Record<string, { label: string; color: string; bg: string }> = { ...DEFAULT_TAG_CONFIG };
    categories.forEach((cat) => {
      map[cat.id] = {
        label: cat.name,
        color: cat.color || "text-slate-700 dark:text-slate-300",
        bg: cat.bg || "bg-slate-500/10 border-slate-500/20",
      };
    });
    return map;
  }, [categories]);

  // Auto-select task if URL query contains taskId or id (e.g. when navigated from Calendar)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const taskId = params.get("taskId") || params.get("id");
      if (taskId && todosData.length > 0 && !selectedTodo) {
        const found = todosData.find((t: any) => t.id === taskId);
        if (found) {
          setSelectedTodo(found);
        }
      }
    }
  }, [todosData, selectedTodo]);

  // Keep selectedTodo in sync with latest queried data
  useEffect(() => {
    if (selectedTodo) {
      const fresh = todosData.find((t) => t.id === selectedTodo.id);
      if (fresh) {
        setSelectedTodo(fresh);
      }
    }
  }, [todosData]);

  // Task Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/todos", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["hr-calendar-composite-events"] });
      toast.success("Task created successfully");
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to create task");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.put(`/todos/${id}`, data);
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["hr-calendar-composite-events"] });
      if (selectedTodo && data?.data?.id === selectedTodo.id) {
        setSelectedTodo(data.data);
      }
      toast.success("Task updated");
      setIsEditModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update task");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/todos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["hr-calendar-composite-events"] });
      toast.success("Task deleted");
      if (selectedTodo?.id === todoToDelete) {
        setSelectedTodo(null);
      }
      setTodoToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to delete task");
    },
  });

  // OPTIMISTIC MUTATION 1: Checklist Toggle (0ms delay, safe rollback)
  const toggleSubtaskMutation = useMutation({
    mutationFn: async ({ todoId, itemId, done }: { todoId: string; itemId: string; done: boolean }) => {
      const res = await api.patch(`/todos/${todoId}/checklist/${itemId}`, { done });
      return res.data;
    },
    onMutate: async ({ todoId, itemId, done }) => {
      await queryClient.cancelQueries({ queryKey: ["todos"] });
      const previousTodos = queryClient.getQueryData<TodoItem[]>(["todos"]);

      // Update query cache optimistically
      queryClient.setQueryData<TodoItem[]>(["todos"], (old) => {
        if (!old) return old;
        return old.map((t) => {
          if (t.id !== todoId) return t;
          const updatedChecklist = t.checklist.map((c) => (c.id === itemId ? { ...c, done } : c));
          const doneCount = updatedChecklist.filter((c) => c.done).length;
          const progress = updatedChecklist.length > 0 ? Math.round((doneCount / updatedChecklist.length) * 100) : t.progress;
          const completed = doneCount === updatedChecklist.length && updatedChecklist.length > 0;
          return {
            ...t,
            checklist: updatedChecklist,
            progress,
            completed: completed ? true : t.completed && !done ? false : t.completed,
          };
        });
      });

      // Update selectedTodo optimistically
      setSelectedTodo((prev) => {
        if (!prev || prev.id !== todoId) return prev;
        const updatedChecklist = prev.checklist.map((c) => (c.id === itemId ? { ...c, done } : c));
        const doneCount = updatedChecklist.filter((c) => c.done).length;
        const progress = updatedChecklist.length > 0 ? Math.round((doneCount / updatedChecklist.length) * 100) : prev.progress;
        const completed = doneCount === updatedChecklist.length && updatedChecklist.length > 0;
        return {
          ...prev,
          checklist: updatedChecklist,
          progress,
          completed: completed ? true : prev.completed && !done ? false : prev.completed,
        };
      });

      return { previousTodos };
    },
    onError: (err: any, variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(["todos"], context.previousTodos);
        const orig = context.previousTodos.find((t) => t.id === variables.todoId);
        if (orig) setSelectedTodo(orig);
      }
      toast.error("Failed to update checklist item");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });

  // Checklist Item Delete
  const deleteSubtaskMutation = useMutation({
    mutationFn: async ({ todoId, itemId }: { todoId: string; itemId: string }) => {
      const res = await api.delete(`/todos/${todoId}/checklist/${itemId}`);
      return res.data;
    },
    onMutate: async ({ todoId, itemId }) => {
      await queryClient.cancelQueries({ queryKey: ["todos"] });
      const previousTodos = queryClient.getQueryData<TodoItem[]>(["todos"]);

      queryClient.setQueryData<TodoItem[]>(["todos"], (old) => {
        if (!old) return old;
        return old.map((t) => {
          if (t.id !== todoId) return t;
          const updatedChecklist = t.checklist.filter((c) => c.id !== itemId);
          const doneCount = updatedChecklist.filter((c) => c.done).length;
          const progress = updatedChecklist.length > 0 ? Math.round((doneCount / updatedChecklist.length) * 100) : t.progress;
          return { ...t, checklist: updatedChecklist, progress };
        });
      });

      setSelectedTodo((prev) => {
        if (!prev || prev.id !== todoId) return prev;
        const updatedChecklist = prev.checklist.filter((c) => c.id !== itemId);
        const doneCount = updatedChecklist.filter((c) => c.done).length;
        const progress = updatedChecklist.length > 0 ? Math.round((doneCount / updatedChecklist.length) * 100) : prev.progress;
        return { ...prev, checklist: updatedChecklist, progress };
      });

      return { previousTodos };
    },
    onError: (_err, variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(["todos"], context.previousTodos);
        const orig = context.previousTodos.find((t) => t.id === variables.todoId);
        if (orig) setSelectedTodo(orig);
      }
      toast.error("Failed to delete checklist item");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });

  // OPTIMISTIC MUTATION 2: Add Comment (immediate text clear, optimistic append, failure text restore)
  const addCommentMutation = useMutation({
    mutationFn: async ({ todoId, text }: { todoId: string; text: string }) => {
      const res = await api.post(`/todos/${todoId}/comments`, { text });
      return res.data;
    },
    onMutate: async ({ todoId, text }) => {
      await queryClient.cancelQueries({ queryKey: ["todos"] });
      const previousTodos = queryClient.getQueryData<TodoItem[]>(["todos"]);
      const optimisticComment: TodoCommentItem = {
        id: `opt_${Date.now()}`,
        author: (user as any)?.name || user?.email || "Team Member",
        text,
        createdAt: new Date().toISOString(),
      };

      const preservedText = newCommentText;
      setNewCommentText("");

      setSelectedTodo((prev) => {
        if (!prev || prev.id !== todoId) return prev;
        return {
          ...prev,
          comments: [...prev.comments, optimisticComment],
        };
      });

      queryClient.setQueryData<TodoItem[]>(["todos"], (old) => {
        if (!old) return old;
        return old.map((t) => {
          if (t.id !== todoId) return t;
          return {
            ...t,
            comments: [...t.comments, optimisticComment],
          };
        });
      });

      return { previousTodos, preservedText, todoId };
    },
    onError: (err: any, _vars, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(["todos"], context.previousTodos);
        const orig = context.previousTodos.find((t) => t.id === context.todoId);
        if (orig) setSelectedTodo(orig);
      }
      if (context?.preservedText) {
        setNewCommentText(context.preservedText);
      }
      toast.error(err?.response?.data?.error || "Failed to post comment");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });

  // Quick Action Handlers
  const handleToggleComplete = (todo: TodoItem) => {
    const nextCompleted = !todo.completed;
    const nextProgress = nextCompleted ? 100 : 0;
    updateMutation.mutate({
      id: todo.id,
      data: { completed: nextCompleted, progress: nextProgress },
    });
  };

  const handleToggleStar = (todo: TodoItem) => {
    updateMutation.mutate({
      id: todo.id,
      data: { starred: !todo.starred },
    });
  };

  const handleAddSubtask = () => {
    if (!selectedTodo || !newSubtaskText.trim()) return;
    const newItems: TodoChecklistItem[] = [
      ...selectedTodo.checklist,
      {
        id: `chk_${Date.now()}`,
        text: newSubtaskText.trim(),
        done: false,
      },
    ];
    const doneCount = newItems.filter((c) => c.done).length;
    const newProgress = Math.round((doneCount / newItems.length) * 100);

    updateMutation.mutate({
      id: selectedTodo.id,
      data: { checklist: newItems, progress: newProgress },
    });
    setNewSubtaskText("");
  };

  const handleToggleSubtask = (itemId: string) => {
    if (!selectedTodo) return;
    const item = selectedTodo.checklist.find((c) => c.id === itemId);
    if (!item) return;
    toggleSubtaskMutation.mutate({
      todoId: selectedTodo.id,
      itemId,
      done: !item.done,
    });
  };

  const handleDeleteSubtask = (itemId: string) => {
    if (!selectedTodo) return;
    deleteSubtaskMutation.mutate({
      todoId: selectedTodo.id,
      itemId,
    });
  };

  const handleAddComment = () => {
    if (!selectedTodo || !newCommentText.trim() || addCommentMutation.isPending) return;
    addCommentMutation.mutate({
      todoId: selectedTodo.id,
      text: newCommentText.trim(),
    });
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      priority: "medium",
      tag: "internal",
      startDate: format(new Date(), "yyyy-MM-dd"),
      dueDate: format(addDays(new Date(), 5), "yyyy-MM-dd"),
      assignees: [],
      progress: 0,
      starred: false,
    });
  };

  const handleOpenEdit = (todo: TodoItem) => {
    setEditingTodo(todo);
    const existingAssigneeIds = (todo.assignees && todo.assignees.length > 0)
      ? todo.assignees.map((a) => a.id)
      : (todo.assigneeId ? [todo.assigneeId] : []);

    setFormData({
      title: todo.title,
      description: todo.description || "",
      priority: todo.priority,
      tag: todo.tag,
      startDate: todo.startDate,
      dueDate: todo.dueDate,
      assignees: existingAssigneeIds,
      progress: todo.progress,
      starred: todo.starred,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveModal = () => {
    if (!formData.title.trim()) {
      toast.error("Task title is required");
      return;
    }
    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      priority: formData.priority,
      tag: formData.tag,
      startDate: formData.startDate,
      dueDate: formData.dueDate,
      assignees: formData.assignees,
      assigneeId: formData.assignees[0] || null,
      assignedTo: formData.assignees[0] || null,
      progress: formData.progress,
      starred: formData.starred,
    };

    if (editingTodo) {
      updateMutation.mutate({
        id: editingTodo.id,
        data: payload,
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Metrics calculation
  const totalTasks = todosData.length;
  const pendingTasks = todosData.filter((t) => !t.completed).length;
  const completedTasks = todosData.filter((t) => t.completed).length;
  const urgentTasks = todosData.filter(
    (t) => (t.priority === "urgent" || t.priority === "high") && !t.completed
  ).length;
  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Filtered & Sorted Tasks
  const filteredTodos = useMemo(() => {
    return todosData
      .filter((t) => {
        if (statusTab === "pending" && t.completed) return false;
        if (statusTab === "completed" && !t.completed) return false;
        if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
        if (tagFilter !== "all" && t.tag !== tagFilter) return false;

        if (search.trim()) {
          const q = search.toLowerCase();
          const matchTitle = t.title.toLowerCase().includes(q);
          const matchDesc = t.description?.toLowerCase().includes(q);
          const matchSingleAssignee = t.assignee?.name?.toLowerCase().includes(q);
          const matchMultiAssignee = t.assignees?.some((a) => a.name.toLowerCase().includes(q));
          if (!matchTitle && !matchDesc && !matchSingleAssignee && !matchMultiAssignee) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "due") {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (sortBy === "priority") {
          const rank: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
          return (rank[b.priority] || 0) - (rank[a.priority] || 0);
        }
        if (sortBy === "progress") {
          return b.progress - a.progress;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [todosData, statusTab, priorityFilter, tagFilter, search, sortBy]);

  // Gantt Date Windows & Geometry
  const timelineDates = useMemo(() => {
    const dates: Date[] = [];
    const base = startOfDay(new Date());
    base.setDate(base.getDate() - 2 + ganttWindowOffset * 7);

    const totalDays = timelineScale === "days" ? 14 : 28;
    for (let i = 0; i < totalDays; i++) {
      dates.push(addDays(base, i));
    }
    return dates;
  }, [timelineScale, ganttWindowOffset]);

  const minGridTime = timelineDates[0]?.getTime() || Date.now();
  const maxGridTime = (timelineDates[timelineDates.length - 1]?.getTime() || Date.now()) + 86400000;
  const totalGridDuration = maxGridTime - minGridTime;

  if (isLoading) {
    return <LoadingState message="Loading authorized workspace tasks..." />;
  }

  return (
    <div className="space-y-6 max-w-full pb-16">
      {/* 1. Header Toolbar */}
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: "Dashboard", href: "/hr/dashboard" },
          { label: "Apps" },
          { label: "Todo & Tasks" },
          { label: viewMode === "gantt" ? "Gantt" : "Todo" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="inline-flex items-center rounded-lg bg-muted p-1 border">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewChange("list")}
                className="h-8 px-3 text-xs gap-1.5"
              >
                <ListTodo className="w-3.5 h-3.5" />
                Tasks
              </Button>
              <Button
                variant={viewMode === "gantt" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewChange("gantt")}
                className="h-8 px-3 text-xs gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                Gantt
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCategoryManagerOpen(true)}
              className="h-9 text-xs gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
              Categories
            </Button>

            <Button
              size="sm"
              onClick={() => {
                resetForm();
                setIsCreateModalOpen(true);
              }}
              className="h-9 text-xs gap-1.5 font-bold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Create Task
            </Button>
          </div>
        }
      />

      {/* 2. Statistical Overview Cards */}
      <StatsOverviewGrid columns={4}>
        <StatCard
          title="Total Deliverables"
          value={totalTasks}
          description="Authorized workspace tasks"
          icon={<ListTodo className="w-4 h-4 text-primary" />}
        />
        <StatCard
          title="Pending Actions"
          value={pendingTasks}
          description="In-progress or scheduled"
          icon={<Clock className="w-4 h-4 text-amber-500" />}
        />
        <StatCard
          title="Completed"
          value={completedTasks}
          description={`${completionRate}% overall completion`}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
        />
        <StatCard
          title="High Priority / Urgent"
          value={urgentTasks}
          description="Requires active attention"
          icon={<AlertCircle className="w-4 h-4 text-rose-500" />}
        />
      </StatsOverviewGrid>

      {/* 3. Search and Filtering Controls */}
      <Card className="border shadow-xs">
        <CardContent className="p-3.5 space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search tasks by title, description, or assignee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex items-center rounded-lg bg-muted p-1 border text-xs shrink-0">
              <button
                type="button"
                onClick={() => setStatusTab("all")}
                className={cn(
                  "px-3 py-1 rounded-md transition-all font-medium",
                  statusTab === "all" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                All ({totalTasks})
              </button>
              <button
                type="button"
                onClick={() => setStatusTab("pending")}
                className={cn(
                  "px-3 py-1 rounded-md transition-all font-medium",
                  statusTab === "pending" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Pending ({pendingTasks})
              </button>
              <button
                type="button"
                onClick={() => setStatusTab("completed")}
                className={cn(
                  "px-3 py-1 rounded-md transition-all font-medium",
                  statusTab === "completed" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Completed ({completedTasks})
              </button>
            </div>
          </div>

          {/* Secondary Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t text-xs">
            <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider mr-1">
              Filter:
            </span>

            {/* Priority Filter */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            {/* Tag/Category Filter */}
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="h-8 text-xs w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort Filter */}
            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
              <SelectTrigger className="h-8 text-xs w-[130px] ml-auto">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">Recently Created</SelectItem>
                <SelectItem value="due">Due Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="progress">Progress %</SelectItem>
              </SelectContent>
            </Select>

            {(priorityFilter !== "all" || tagFilter !== "all" || search) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setPriorityFilter("all");
                  setTagFilter("all");
                  setSearch("");
                }}
              >
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. Active View Switch: List View vs Gantt View */}
      {viewMode === "list" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Tasks List */}
          <div className={cn("space-y-3 transition-all", selectedTodo ? "lg:col-span-7 xl:col-span-8" : "lg:col-span-12")}>
            {filteredTodos.length === 0 ? (
              <EmptyState
                title="No tasks match criteria"
                description="Try adjusting your filters, searching for another keyword, or create a new task."
                actionLabel="Create Task"
                onAction={() => {
                  resetForm();
                  setIsCreateModalOpen(true);
                }}
              />
            ) : (
              filteredTodos.map((todo) => {
                const isSelected = selectedTodo?.id === todo.id;
                const pConfig = PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.medium;
                const tConfig = tagConfigMap[todo.tag] || { label: todo.tag, color: "text-slate-700 dark:text-slate-300", bg: "bg-slate-500/10 border-slate-500/20" };
                const isOverdue = !todo.completed && isBefore(new Date(todo.dueDate), startOfDay(new Date()));

                return (
                  <div
                    key={todo.id}
                    onClick={() => setSelectedTodo(todo)}
                    className={cn(
                      "group p-4 rounded-xl border bg-card transition-all cursor-pointer hover:shadow-md relative overflow-hidden",
                      isSelected && "border-primary ring-1 ring-primary/40 bg-primary/5",
                      todo.completed && "opacity-75 bg-muted/20"
                    )}
                  >
                    {/* Left Accent Bar */}
                    <div
                      className={cn(
                        "absolute left-0 top-0 bottom-0 w-1",
                        todo.completed ? "bg-emerald-500" : isOverdue ? "bg-rose-500" : "bg-primary"
                      )}
                    />

                    <div className="flex items-start justify-between gap-3 pl-1">
                      {/* Checkbox & Star */}
                      <div className="flex items-center gap-2 pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleToggleComplete(todo)}
                          className={cn(
                            "w-5 h-5 rounded-md border flex items-center justify-center transition-colors",
                            todo.completed
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-muted-foreground/40 hover:border-primary"
                          )}
                        >
                          {todo.completed && <Check className="w-3.5 h-3.5 stroke-3" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStar(todo)}
                          className="text-muted-foreground/40 hover:text-amber-500 transition-colors"
                        >
                          <Star
                            className={cn(
                              "w-4 h-4",
                              todo.starred ? "fill-amber-400 text-amber-400" : ""
                            )}
                          />
                        </button>
                      </div>

                      {/* Task Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4
                            className={cn(
                              "text-sm font-semibold text-foreground tracking-tight transition-all",
                              todo.completed && "line-through text-muted-foreground"
                            )}
                          >
                            {todo.title}
                          </h4>

                          {/* Category Badge */}
                          <Badge variant="outline" className={cn("text-[10px] px-2 py-0 border", tConfig.color, tConfig.bg)}>
                            {tConfig.label}
                          </Badge>

                          {/* Priority Badge */}
                          <Badge variant="outline" className={cn("text-[10px] px-2 py-0 border", pConfig.color)}>
                            {pConfig.label}
                          </Badge>

                          {todo.badgeLabel && (
                            <Badge variant="outline" className={cn("text-[10px] px-2 py-0", todo.badgeColor)}>
                              {todo.badgeLabel}
                            </Badge>
                          )}
                        </div>

                        {todo.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {todo.description}
                          </p>
                        )}

                        {/* Metadata row */}
                        <div className="flex items-center gap-4 mt-2.5 text-[11px] text-muted-foreground flex-wrap">
                          {/* Due Date */}
                          <div className={cn("flex items-center gap-1", isOverdue && "text-rose-600 font-semibold")}>
                            <Calendar className="w-3 h-3" />
                            <span>Due {todo.dueDate}</span>
                            {isOverdue && <span className="text-[10px] uppercase tracking-wider ml-0.5">(Overdue)</span>}
                          </div>

                          {/* Multi-Assignee Stack */}
                          {todo.assignees && todo.assignees.length > 0 ? (
                            <div className="flex items-center gap-1.5 bg-muted/60 px-2 py-0.5 rounded-md border text-foreground">
                              <div className="flex items-center -space-x-1.5">
                                {todo.assignees.slice(0, 3).map((a) => (
                                  <UserAvatar key={a.id} name={a.name} avatar={a.avatar} className="w-4 h-4 text-[8px] border-background" />
                                ))}
                              </div>
                              <span className="font-medium truncate max-w-[120px]">
                                {todo.assignees.length === 1
                                  ? todo.assignees[0].name
                                  : `${todo.assignees[0].name} +${todo.assignees.length - 1}`}
                              </span>
                            </div>
                          ) : todo.assignee?.name ? (
                            <div className="flex items-center gap-1.5 bg-muted/60 px-2 py-0.5 rounded-md border text-foreground">
                              <UserAvatar name={todo.assignee.name} avatar={todo.assignee.avatar} className="w-4 h-4 text-[8px]" />
                              <span className="font-medium truncate max-w-[120px]">{todo.assignee.name}</span>
                            </div>
                          ) : null}

                          {/* Checklist items indicator */}
                          {todo.checklist.length > 0 && (
                            <div className="flex items-center gap-1">
                              <CheckSquare className="w-3 h-3 text-muted-foreground" />
                              <span>
                                {todo.checklist.filter((c) => c.done).length}/{todo.checklist.length} subtasks
                              </span>
                            </div>
                          )}

                          {/* Comments indicator */}
                          {todo.comments.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span>{todo.comments.length} comments</span>
                            </div>
                          )}

                          {/* Progress */}
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <div className="flex-1 bg-muted h-1.5 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  todo.completed ? "bg-emerald-500" : "bg-primary"
                                )}
                                style={{ width: `${todo.progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono">{todo.progress}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Right action icons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(todo);
                          }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTodoToDelete(todo.id);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Slide-Over Detail Panel (Top on mobile, side on desktop) */}
          {selectedTodo && (
            <div className="col-span-12 lg:col-span-5 xl:col-span-4 order-first lg:order-none sticky top-4 sm:top-6 border rounded-xl bg-card shadow-lg p-4 sm:p-5 space-y-5 animate-in fade-in duration-200">
              {/* Panel Header */}
              <div className="flex items-start justify-between gap-3 border-b pb-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider">
                      Task Details
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">#{selectedTodo.id.slice(-6)}</span>
                  </div>
                  <h3 className="text-base font-bold text-foreground leading-snug truncate">
                    {selectedTodo.title}
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleOpenEdit(selectedTodo)}
                  >
                    <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setSelectedTodo(null)}
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>

              {/* Status and Attributes Grid */}
              <div className="space-y-3.5 text-xs">
                {/* Status Toggle Button */}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Button
                    variant={selectedTodo.completed ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-7 text-xs gap-1.5 font-medium",
                      selectedTodo.completed && "bg-emerald-600 hover:bg-emerald-700 text-white"
                    )}
                    onClick={() => handleToggleComplete(selectedTodo)}
                  >
                    {selectedTodo.completed ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Completed
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5" /> Mark Completed
                      </>
                    )}
                  </Button>
                </div>

                {/* Priority */}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Priority</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-medium px-2 py-0.5",
                      PRIORITY_CONFIG[selectedTodo.priority]?.color
                    )}
                  >
                    {PRIORITY_CONFIG[selectedTodo.priority]?.label || selectedTodo.priority}
                  </Badge>
                </div>

                {/* Category */}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-medium px-2 py-0.5",
                      tagConfigMap[selectedTodo.tag]?.color,
                      tagConfigMap[selectedTodo.tag]?.bg
                    )}
                  >
                    {tagConfigMap[selectedTodo.tag]?.label || selectedTodo.tag}
                  </Badge>
                </div>

                {/* Multi-Assignees */}
                <div className="flex items-start justify-between gap-2">
                  <span className="text-muted-foreground pt-1">Assignees</span>
                  <div className="flex flex-col items-end gap-1.5 max-w-[220px]">
                    {selectedTodo.assignees && selectedTodo.assignees.length > 0 ? (
                      selectedTodo.assignees.map((a) => (
                        <div key={a.id} className="flex items-center gap-1.5 font-medium text-foreground text-xs">
                          <UserAvatar name={a.name} avatar={a.avatar} className="w-4 h-4 text-[8px]" />
                          <span className="truncate max-w-[150px]">{a.name}</span>
                        </div>
                      ))
                    ) : selectedTodo.assignee?.name ? (
                      <div className="flex items-center gap-1.5 font-medium text-foreground text-xs">
                        <UserAvatar name={selectedTodo.assignee.name} avatar={selectedTodo.assignee.avatar} className="w-4 h-4 text-[8px]" />
                        <span>{selectedTodo.assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">Unassigned</span>
                    )}
                  </div>
                </div>

                {/* Due Date */}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Due Date</span>
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{selectedTodo.dueDate}</span>
                  </div>
                </div>

                {/* Progress Slider */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Task Progress</span>
                    <span className="font-mono font-bold text-foreground">{selectedTodo.progress}%</span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        selectedTodo.completed ? "bg-emerald-500" : "bg-primary"
                      )}
                      style={{ width: `${selectedTodo.progress}%` }}
                    />
                  </div>
                </div>

                {selectedTodo.description && (
                  <div className="pt-2 border-t text-muted-foreground">
                    <span className="block text-[11px] font-semibold text-foreground uppercase tracking-wider mb-1">
                      Description
                    </span>
                    <p className="text-xs leading-relaxed whitespace-pre-wrap">{selectedTodo.description}</p>
                  </div>
                )}
              </div>

              {/* Sub-panel Tabs (Checklist, Comments, Activity) */}
              <div className="border-t pt-3">
                <div className="flex items-center justify-between border-b pb-2 mb-3">
                  <div className="flex items-center gap-1">
                    <Button
                      variant={detailTab === "checklist" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setDetailTab("checklist")}
                      className="h-7 text-xs px-2.5 font-medium"
                    >
                      Checklist ({selectedTodo.checklist.length})
                    </Button>
                    <Button
                      variant={detailTab === "comments" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setDetailTab("comments")}
                      className="h-7 text-xs px-2.5 font-medium"
                    >
                      Comments ({selectedTodo.comments.length})
                    </Button>
                    <Button
                      variant={detailTab === "activity" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setDetailTab("activity")}
                      className="h-7 text-xs px-2.5 font-medium"
                    >
                      Activity
                    </Button>
                  </div>
                </div>

                {/* TAB 1: Checklist */}
                {detailTab === "checklist" && (
                  <div className="space-y-3">
                    {/* Add checklist input */}
                    <div className="flex items-center gap-2">
                      <Input
                        value={newSubtaskText}
                        onChange={(e) => setNewSubtaskText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                        placeholder="Add subtask / checklist item..."
                        className="h-8 text-xs"
                      />
                      <Button size="sm" className="h-8 text-xs px-3" onClick={handleAddSubtask}>
                        Add
                      </Button>
                    </div>

                    {/* Subtask items list with instant optimistic checkbox toggling */}
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {selectedTodo.checklist.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-2 text-center">
                          No subtasks added yet. Break this task into steps.
                        </p>
                      ) : (
                        selectedTodo.checklist.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-2 rounded-lg border bg-muted/30 text-xs group"
                          >
                            <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 select-none">
                              <Checkbox
                                checked={item.done}
                                onCheckedChange={() => handleToggleSubtask(item.id)}
                              />
                              <span className={cn("truncate transition-all", item.done && "line-through text-muted-foreground")}>
                                {item.text}
                              </span>
                            </label>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-rose-600 opacity-0 group-hover:opacity-100"
                              onClick={() => handleDeleteSubtask(item.id)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: Comments */}
                {detailTab === "comments" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                        placeholder="Post a comment..."
                        className="h-8 text-xs"
                        disabled={addCommentMutation.isPending}
                      />
                      <Button
                        size="sm"
                        className="h-8 text-xs px-3 font-semibold"
                        onClick={handleAddComment}
                        disabled={addCommentMutation.isPending || !newCommentText.trim()}
                      >
                        {addCommentMutation.isPending ? (
                          <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <Send className="w-3 h-3 mr-1" />
                        )}
                        Post
                      </Button>
                    </div>

                    <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                      {selectedTodo.comments.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-2 text-center">
                          No comments yet. Leave a note or update.
                        </p>
                      ) : (
                        selectedTodo.comments.map((cmt) => (
                          <div key={cmt.id} className="p-2.5 rounded-lg border bg-muted/20 space-y-1 text-xs">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <UserAvatar name={cmt.author} avatar={cmt.avatar} className="w-4 h-4 text-[8px]" />
                                <span className="font-semibold text-foreground">{cmt.author}</span>
                              </div>
                              <span>{format(new Date(cmt.createdAt), "MMM d, h:mm a")}</span>
                            </div>
                            <p className="text-xs text-foreground/90 whitespace-pre-wrap">{cmt.text}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: Activity */}
                {detailTab === "activity" && (
                  <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                    {selectedTodo.activity.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2 text-center">
                        No activity recorded.
                      </p>
                    ) : (
                      selectedTodo.activity.map((act) => (
                        <div key={act.id} className="flex items-start gap-2 text-xs py-1 border-b last:border-0">
                          <History className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-foreground font-medium">{act.text}</p>
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(act.timestamp), "MMM d, yyyy h:mm a")}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Panel Footer */}
              <div className="flex items-center justify-between pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                  onClick={() => setTodoToDelete(selectedTodo.id)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Delete Task
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-xs font-medium"
                  onClick={() => setSelectedTodo(null)}
                >
                  Close Panel
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ─── GANTT TIMELINE VIEW ─── */
        <div className="space-y-4">
          {/* Gantt Timeline Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border bg-card/60 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => setGanttWindowOffset((prev) => prev - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => setGanttWindowOffset(0)}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => setGanttWindowOffset((prev) => prev + 1)}
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center rounded-lg bg-muted p-1 border text-xs">
                <button
                  type="button"
                  onClick={() => setTimelineScale("days")}
                  className={cn(
                    "px-3 py-1 rounded-md transition-all font-medium",
                    timelineScale === "days" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  14 Days
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineScale("weeks")}
                  className={cn(
                    "px-3 py-1 rounded-md transition-all font-medium",
                    timelineScale === "weeks" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  28 Days
                </button>
              </div>
            </div>
          </div>

          {/* Gantt Chart Container */}
          <Card className="overflow-hidden border shadow-sm">
            <div className="overflow-x-auto">
              <div className="min-w-[950px]">
                {/* Timeline Header */}
                <div className="grid grid-cols-12 border-b bg-muted/40 text-xs font-semibold text-foreground">
                  <div className="col-span-4 p-3 border-r font-bold sticky left-0 bg-muted/95 backdrop-blur z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Task & Assignees</div>
                  <div className="col-span-8 grid" style={{ gridTemplateColumns: `repeat(${timelineDates.length}, minmax(0, 1fr))` }}>
                    {timelineDates.map((d, i) => {
                      const isToday = format(d, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                      return (
                        <div
                          key={i}
                          className={cn(
                            "p-2 text-center border-r last:border-r-0 text-[11px]",
                            isToday && "bg-primary/10 text-primary font-bold"
                          )}
                        >
                          <div>{format(d, "EEE")}</div>
                          <div className="text-[10px] text-muted-foreground">{format(d, "d")}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Timeline Rows */}
                <div className="divide-y">
                  {filteredTodos.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      No tasks found for the current timeline range.
                    </div>
                  ) : (
                    filteredTodos.map((todo) => {
                      const start = new Date(todo.startDate).getTime();
                      const end = new Date(todo.dueDate).getTime();

                      // Clamp within grid duration
                      const leftPercent = Math.max(
                        0,
                        Math.min(100, ((start - minGridTime) / totalGridDuration) * 100)
                      );
                      const widthPercent = Math.max(
                        4,
                        Math.min(100 - leftPercent, ((end - start) / totalGridDuration) * 100)
                      );

                      const pConfig = PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.medium;
                      const isOverdue = !todo.completed && isBefore(new Date(todo.dueDate), startOfDay(new Date()));

                      return (
                        <div
                          key={todo.id}
                          className="grid grid-cols-12 items-center hover:bg-muted/20 transition-colors group cursor-pointer"
                          onClick={() => setSelectedTodo(todo)}
                        >
                          {/* Task Info Column */}
                          <div className="col-span-4 p-3 border-r flex items-center justify-between gap-2 sticky left-0 bg-card/95 backdrop-blur z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className={cn("w-2 h-2 rounded-full", pConfig.dot)} />
                                <span
                                  className={cn(
                                    "text-xs font-semibold truncate",
                                    todo.completed && "line-through text-muted-foreground"
                                  )}
                                >
                                  {todo.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                                {todo.assignees && todo.assignees.length > 0 ? (
                                  <div className="flex items-center -space-x-1">
                                    {todo.assignees.slice(0, 2).map((a) => (
                                      <UserAvatar key={a.id} name={a.name} avatar={a.avatar} className="w-4 h-4 text-[7px]" />
                                    ))}
                                    <span className="ml-1 text-[10px] truncate max-w-[90px]">
                                      {todo.assignees.map((a) => a.name).join(", ")}
                                    </span>
                                  </div>
                                ) : todo.assignee?.name ? (
                                  <span className="truncate max-w-[100px]">{todo.assignee.name}</span>
                                ) : (
                                  <span>Unassigned</span>
                                )}
                                <span>&bull;</span>
                                <span className={cn(isOverdue && "text-rose-600 font-semibold")}>
                                  Due {todo.dueDate}
                                </span>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                              {todo.progress}%
                            </Badge>
                          </div>

                          {/* Gantt Bar Grid Column */}
                          <div className="col-span-8 p-3 relative h-12 flex items-center">
                            {/* Grid vertical lines */}
                            <div
                              className="absolute inset-0 grid pointer-events-none"
                              style={{ gridTemplateColumns: `repeat(${timelineDates.length}, minmax(0, 1fr))` }}
                            >
                              {timelineDates.map((_, idx) => (
                                <div key={idx} className="border-r last:border-r-0 border-muted/30 h-full" />
                              ))}
                            </div>

                            {/* Task Bar */}
                            <div
                              className={cn(
                                "absolute h-7 rounded-lg shadow-sm border px-2.5 flex items-center justify-between text-xs transition-all overflow-hidden cursor-pointer hover:shadow-md",
                                todo.completed
                                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                                  : isOverdue
                                  ? "bg-rose-500/15 border-rose-500/30 text-rose-800 dark:text-rose-300"
                                  : "bg-primary/15 border-primary/30 text-primary"
                              )}
                              style={{
                                left: `${leftPercent}%`,
                                width: `${widthPercent}%`,
                              }}
                              title={`${todo.title} (${todo.progress}%) | ${todo.startDate} to ${todo.dueDate}`}
                            >
                              {/* Internal Progress Fill Bar */}
                              <div
                                className={cn(
                                  "absolute left-0 top-0 bottom-0 opacity-25 pointer-events-none",
                                  todo.completed ? "bg-emerald-500" : isOverdue ? "bg-rose-500" : "bg-primary"
                                )}
                                style={{ width: `${todo.progress}%` }}
                              />
                              <span className="truncate font-semibold text-[11px] relative z-10">
                                {todo.title}
                              </span>
                              <span className="text-[10px] font-mono font-bold ml-1 relative z-10 shrink-0">
                                {todo.progress}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 5. Create / Edit Task Modal */}
      <Dialog
        open={isCreateModalOpen || isEditModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateModalOpen(false);
            setIsEditModalOpen(false);
            setEditingTodo(null);
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingTodo ? "Edit Task" : "Create New Task"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingTodo
                ? "Update task details, schedule, assignees, and priority."
                : "Add a new actionable deliverable to your authorized workspace."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Task Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Update employee compensation benchmarks"
                className="text-xs"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide additional context or requirements..."
                rows={3}
                className="text-xs"
              />
            </div>

            {/* Priority & Category */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(val) => setFormData({ ...formData, priority: val })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Category Tag</Label>
                  <button
                    type="button"
                    onClick={() => setIsCategoryManagerOpen(true)}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1"
                  >
                    <SlidersHorizontal className="w-3 h-3" /> Manage
                  </button>
                </div>
                <Select
                  value={formData.tag}
                  onValueChange={(val) => setFormData({ ...formData, tag: val })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Multi-Assignee Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Assignees</Label>
              <MultiAssigneeSelector
                value={formData.assignees}
                onChange={(ids) => setFormData({ ...formData, assignees: ids })}
                assignees={assignees}
                isLoading={isLoadingAssignees}
                error={assigneesError}
                onRetry={refetchAssignees}
              />
            </div>

            {/* Schedule: Start Date & Due Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Start Date (Gantt)</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Due Date</Label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
                setEditingTodo(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveModal}
              className="font-bold"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : null}
              {editingTodo ? "Save Changes" : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Category Manager Dialog */}
      <CategoryManagerDialog
        open={isCategoryManagerOpen}
        onOpenChange={setIsCategoryManagerOpen}
        categories={categories}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["todos-categories"] });
          queryClient.invalidateQueries({ queryKey: ["todos"] });
        }}
        onUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ["todos-categories"] });
          queryClient.invalidateQueries({ queryKey: ["todos"] });
        }}
        onDeleted={(deletedId) => {
          queryClient.invalidateQueries({ queryKey: ["todos-categories"] });
          queryClient.invalidateQueries({ queryKey: ["todos"] });
          if (formData.tag === deletedId) {
            setFormData((prev) => ({ ...prev, tag: "internal" }));
          }
        }}
      />

      {/* 7. Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={Boolean(todoToDelete)}
        onOpenChange={(open) => !open && setTodoToDelete(null)}
        title="Delete Task"
        description="Are you sure you want to permanently delete this task? This action cannot be undone."
        confirmLabel="Delete Task"
        onConfirm={() => {
          if (todoToDelete) {
            deleteMutation.mutate(todoToDelete);
          }
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

export default UnifiedTodoApp;
