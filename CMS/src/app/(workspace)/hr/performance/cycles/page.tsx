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
  RefreshCw,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
} from "lucide-react";

interface ReviewCycleItem {
  id: string;
  name: string;
  title?: string;
  periodType?: string;
  frequency?: string;
  description?: string | null;
  status: string;
}

const FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semi-annual", label: "Semi-Annual" },
  { value: "annual", label: "Annual" },
];

function formatFrequencyLabel(raw?: string) {
  const s = String(raw || "quarterly").toLowerCase();
  const match = FREQUENCY_OPTIONS.find((f) => f.value === s);
  if (match) return match.label;
  if (s === "semi_annual" || s === "biannual") return "Semi-Annual";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function HrPerformanceCyclesPage() {
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<ReviewCycleItem | null>(null);
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [freqFilter, setFreqFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "frequency">("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<ReviewCycleItem | null>(null);

  const { data: cycles = [], isLoading } = useQuery<ReviewCycleItem[]>({
    queryKey: ["hr-performance-cycles"],
    queryFn: async () => {
      const res = await api.get("/hr/performance/cycles");
      return unwrapArray<ReviewCycleItem>(res);
    },
  });

  const resetForm = () => {
    setEditing(null);
    setName("");
    setFrequency("");
    setDescription("");
    setStatus("active");
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        frequency: frequency || "quarterly",
        periodType: frequency || "quarterly",
        description: description.trim(),
        status,
      };
      if (editing) {
        return api.put(`/hr/performance/cycles/${editing.id}`, payload);
      }
      return api.post("/hr/performance/cycles", payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Review cycle updated" : "Review cycle added");
      queryClient.invalidateQueries({ queryKey: ["hr-performance-cycles"] });
      resetForm();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save review cycle"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/performance/cycles/${id}`),
    onSuccess: () => {
      toast.success("Review cycle deleted");
      queryClient.invalidateQueries({ queryKey: ["hr-performance-cycles"] });
      setDeleteTarget(null);
      if (editing?.id === deleteTarget?.id) resetForm();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete review cycle"),
  });

  const filtered = useMemo(() => {
    const q = (appliedSearch || searchInput).trim().toLowerCase();
    return cycles
      .filter((c) => {
        const cFreq = String(c.frequency || c.periodType || "quarterly").toLowerCase();
        const cStatus = String(c.status || "active").toLowerCase();
        if (freqFilter !== "all" && cFreq !== freqFilter) return false;
        if (statusFilter !== "all" && cStatus !== statusFilter) return false;
        if (q) {
          const text = `${c.name || c.title || ""} ${c.description || ""} ${cFreq}`.toLowerCase();
          if (!text.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "frequency") {
          const fa = formatFrequencyLabel(a.frequency || a.periodType);
          const fb = formatFrequencyLabel(b.frequency || b.periodType);
          return sortAsc ? fa.localeCompare(fb) : fb.localeCompare(fa);
        }
        const na = a.name || a.title || "";
        const nb = b.name || b.title || "";
        return sortAsc ? na.localeCompare(nb) : nb.localeCompare(na);
      });
  }, [cycles, appliedSearch, searchInput, freqFilter, statusFilter, sortBy, sortAsc]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Review Cycle Name is required");
    if (!frequency) return toast.error("Please select a frequency");
    saveMutation.mutate();
  };

  const startEdit = (item: ReviewCycleItem) => {
    setEditing(item);
    setName(item.name || item.title || "");
    setFrequency(String(item.frequency || item.periodType || "quarterly").toLowerCase());
    setDescription(item.description || "");
    setStatus(String(item.status || "active").toLowerCase() === "inactive" ? "inactive" : "active");
  };

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      <PageHeader
        title="Review Cycles"
        description="Manage performance review cycles and their schedules."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Form Card */}
        <div className="lg:col-span-4 bg-card border border-border/80 rounded-xl shadow-xs p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-foreground">
              {editing ? "Edit Review Cycle" : "Add New Review Cycle"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {editing
                ? "Update the selected review cycle details"
                : "Fill in the details to create a new review cycle"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Review Cycle Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Annual Review 2026"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Frequency <span className="text-rose-500">*</span>
              </Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the review cycle"
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Status <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={status}
                onValueChange={(val) => setStatus(val as "active" | "inactive")}
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
              {editing && (
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {saveMutation.isPending
                  ? "Saving..."
                  : editing
                  ? "Update Review Cycle"
                  : "Add Review Cycle"}
              </Button>
            </div>
          </form>
        </div>

        {/* Right List Column */}
        <div className="lg:col-span-8 space-y-4">
          {/* Search & Filter Card */}
          <div className="bg-card border border-border/80 rounded-xl shadow-xs p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setAppliedSearch(searchInput)}
                  placeholder="Search review cycles..."
                  className="pl-9 h-9 bg-background"
                />
              </div>
              <Button
                type="button"
                onClick={() => setAppliedSearch(searchInput)}
                className="h-9 bg-emerald-500 hover:bg-emerald-600 text-white px-4"
              >
                Search
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select value={freqFilter} onValueChange={setFreqFilter}>
                <SelectTrigger className="h-9 bg-background">
                  <SelectValue placeholder="All Frequencies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Frequencies</SelectItem>
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 bg-background">
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
          <div className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/50">
                    <th className="p-3.5 text-xs font-semibold text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => {
                          setSortBy("name");
                          setSortAsc((p) => !p);
                        }}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        <span>Name</span>
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </th>
                    <th className="p-3.5 text-xs font-semibold text-muted-foreground w-36">
                      <button
                        type="button"
                        onClick={() => {
                          setSortBy("frequency");
                          setSortAsc((p) => !p);
                        }}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        <span>Frequency</span>
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </th>
                    <th className="p-3.5 text-xs font-semibold text-muted-foreground w-28">
                      Status
                    </th>
                    <th className="p-3.5 text-xs font-semibold text-muted-foreground text-right pr-5 w-24">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="p-10 text-center text-sm text-muted-foreground">
                        Loading review cycles...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-10 text-center text-sm text-muted-foreground">
                        No review cycles found. Create your first review cycle on the left.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((cycle) => {
                      const desc = cycle.description || "";
                      const isLong = desc.length > 90;
                      const expanded = Boolean(expandedIds[cycle.id]);
                      const isActive = String(cycle.status || "active").toLowerCase() !== "inactive";
                      return (
                        <tr key={cycle.id} className="hover:bg-muted/35 transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-start gap-3">
                              <div className="h-9 w-9 rounded-lg bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                <RefreshCw className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-foreground">
                                  {cycle.name || cycle.title}
                                </div>
                                {desc && (
                                  <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                    {isLong && !expanded ? `${desc.slice(0, 90)}...` : desc}
                                  </div>
                                )}
                                {isLong && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedIds((prev) => ({
                                        ...prev,
                                        [cycle.id]: !prev[cycle.id],
                                      }))
                                    }
                                    className="inline-flex items-center gap-0.5 text-xs font-medium text-sky-600 hover:text-sky-700 mt-1"
                                  >
                                    {expanded ? (
                                      <>
                                        <ChevronUp className="h-3.5 w-3.5" /> Show less
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="h-3.5 w-3.5" /> Show more
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 align-middle">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
                              {formatFrequencyLabel(cycle.frequency || cycle.periodType)}
                            </span>
                          </td>
                          <td className="p-3.5 align-middle">
                            {isActive ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border/80">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 pr-5 align-middle">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-sky-600"
                                title="Edit Review Cycle"
                                onClick={() => startEdit(cycle)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                                title="Delete Review Cycle"
                                onClick={() => setDeleteTarget(cycle)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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

      {/* Delete Confirm Modal */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Review Cycle</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending || !deleteTarget}
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
