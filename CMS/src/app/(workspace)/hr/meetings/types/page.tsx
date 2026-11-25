"use client";

import { useMemo, useState } from "react";
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
import { toast } from "sonner";
import {
  Search,
  Clock,
  Edit,
  Lock,
  Trash2,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface MeetingTypeItem {
  id: string;
  name: string;
  description?: string;
  color: string;
  defaultDuration: number;
  meetingsCount: number;
  isActive: boolean;
  status: "active" | "inactive";
}

export default function HrMeetingTypesPage() {
  const queryClient = useQueryClient();

  // Left form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#000000");
  const [defaultDuration, setDefaultDuration] = useState("15");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  // Right list filters
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<MeetingTypeItem | null>(null);

  const { data: types = [], isLoading } = useQuery<MeetingTypeItem[]>({
    queryKey: ["hr-meeting-types"],
    queryFn: async () => {
      const res = await api.get("/hr/meetings/types");
      return unwrapArray<MeetingTypeItem>(res);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      id?: string | null;
      name: string;
      description?: string;
      color: string;
      defaultDuration: number;
      status: string;
    }) => {
      if (payload.id) {
        return api.put(`/hr/meetings/types/${payload.id}`, payload);
      }
      return api.post("/hr/meetings/types", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-meeting-types"] });
      toast.success(editingId ? "Meeting type updated." : "Meeting type created.");
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to save meeting type.");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (id: string) => api.patch(`/hr/meetings/types/${id}/status`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-meeting-types"] });
      toast.success("Meeting type status toggled.");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to toggle status.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/meetings/types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-meeting-types"] });
      toast.success("Meeting type deleted.");
      if (deleteTarget && editingId === deleteTarget.id) resetForm();
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to delete meeting type.");
    },
  });

  function resetForm() {
    setEditingId(null);
    setName("");
    setDescription("");
    setColor("#000000");
    setDefaultDuration("15");
    setStatus("active");
  }

  function startEdit(item: MeetingTypeItem) {
    setEditingId(item.id);
    setName(item.name || "");
    setDescription(item.description || "");
    setColor(item.color || "#6366f1");
    setDefaultDuration(String(item.defaultDuration || 30));
    setStatus(item.isActive ? "active" : "inactive");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }
    saveMutation.mutate({
      id: editingId,
      name: name.trim(),
      description: description.trim() || undefined,
      color: color || "#000000",
      defaultDuration: Math.max(5, Number(defaultDuration) || 15),
      status,
    });
  }

  const filtered = useMemo(() => {
    const q = (appliedSearch || searchInput).trim().toLowerCase();
    return [...types]
      .filter((t) => {
        if (statusFilter === "active" && !t.isActive) return false;
        if (statusFilter === "inactive" && t.isActive) return false;
        if (q) {
          const hay = `${t.name} ${t.description || ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const cmp = a.name.localeCompare(b.name);
        return sortAsc ? cmp : -cmp;
      });
  }, [types, appliedSearch, searchInput, statusFilter, sortAsc]);

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      <PageHeader
        title="Meeting Types"
        description="Define categories for organizing meetings."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Sticky Form Card */}
        <div className="lg:col-span-4 rounded-xl border border-border/80 bg-card shadow-xs p-5 space-y-4 lg:sticky lg:top-6">
          <div>
            <h2 className="text-base font-bold text-foreground">
              {editingId ? "Edit Meeting Type" : "Add New Meeting Type"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {editingId
                ? "Update the selected meeting type details"
                : "Fill in the details to create a new meeting type"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Client Call, Team Sync"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the meeting type"
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Color <span className="text-rose-500">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={/^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#000000"}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-12 rounded-md border border-input bg-background p-1 cursor-pointer shrink-0"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#000000"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                Default Duration (minutes) <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                min={5}
                max={480}
                value={defaultDuration}
                onChange={(e) => setDefaultDuration(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Status <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as "active" | "inactive")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saveMutation.isPending
                  ? "Saving..."
                  : editingId
                  ? "Update Meeting Type"
                  : "Add Meeting Type"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* Right List Panel */}
        <div className="lg:col-span-8 space-y-4">
          {/* Search + Status Filter Card */}
          <div className="rounded-xl border border-border/80 bg-card shadow-xs p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setAppliedSearch(searchInput);
                  }}
                  placeholder="Search meeting types..."
                  className="pl-9 h-9"
                />
              </div>
              <Button
                type="button"
                onClick={() => setAppliedSearch(searchInput)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4"
              >
                Search
              </Button>
            </div>

            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px] h-9">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table Card */}
          <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/50">
                    <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      <button
                        type="button"
                        onClick={() => setSortAsc(!sortAsc)}
                        className="inline-flex items-center gap-1 hover:text-foreground uppercase"
                      >
                        Name
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Duration
                    </th>
                    <th className="text-center text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Meetings
                    </th>
                    <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Status
                    </th>
                    <th className="text-right text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        Loading meeting types...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-muted-foreground">
                        No meeting types found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item) => {
                      const desc = item.description || "";
                      const isLong = desc.length > 65;
                      const expanded = Boolean(expandedIds[item.id]);

                      return (
                        <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                          <td className="p-3.5 max-w-md">
                            <div className="flex items-start gap-2.5">
                              <span
                                className="h-3 w-3 rounded-full mt-1 shrink-0"
                                style={{ backgroundColor: item.color || "#6366f1" }}
                              />
                              <div className="min-w-0">
                                <div className="font-semibold text-foreground">{item.name}</div>
                                {desc && (
                                  <p
                                    className={`text-xs text-muted-foreground mt-0.5 ${
                                      !expanded && isLong ? "line-clamp-2" : ""
                                    }`}
                                  >
                                    {desc}
                                  </p>
                                )}
                                {isLong && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedIds((prev) => ({
                                        ...prev,
                                        [item.id]: !prev[item.id],
                                      }))
                                    }
                                    className="inline-flex items-center gap-0.5 text-[11px] font-medium text-blue-600 hover:underline mt-1"
                                  >
                                    {expanded ? (
                                      <>
                                        <ChevronUp className="h-3 w-3" />
                                        Show less
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="h-3 w-3" />
                                        Show more
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              {item.defaultDuration} min
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full border border-border/80 bg-muted/30 px-2 text-xs font-medium text-foreground">
                              {item.meetingsCount ?? 0}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                                item.isActive
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : "bg-slate-500/10 text-slate-600 border-slate-500/20"
                              }`}
                            >
                              {item.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                title="Edit"
                                onClick={() => startEdit(item)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-amber-600 hover:bg-amber-500/10 transition-colors"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title={item.isActive ? "Deactivate" : "Activate"}
                                onClick={() => toggleStatusMutation.mutate(item.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              >
                                <Lock className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Delete"
                                onClick={() => setDeleteTarget(item)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-rose-600 hover:bg-rose-500/10 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Meeting Type</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">{deleteTarget?.name}</span>? This
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
