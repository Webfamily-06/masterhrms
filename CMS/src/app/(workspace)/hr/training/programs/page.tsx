"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapArray } from "@/lib/api";
import { useWorkspaceSettings } from "@/src/context/workspace-settings-context";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LifecycleDocumentField } from "@/components/hr/lifecycle-document-field";
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
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Eye,
  Edit,
  Trash2,
  Tag,
  Clock,
  Users,
  LayoutGrid,
  FileEdit,
  CheckCircle2,
  XCircle,
  PlayCircle,
  X,
} from "lucide-react";

type ProgramStatus = "draft" | "active" | "completed" | "cancelled";

interface TrainingTypeOption {
  id: string;
  name: string;
}

interface TrainingProgramItem {
  id: string;
  name: string;
  title: string;
  trainingTypeId?: string | null;
  trainingType?: { id: string; name: string } | null;
  category: string;
  description: string;
  durationHours: number;
  cost: number;
  capacity: number;
  status: ProgramStatus;
  materialsUrl: string;
  materialsName: string;
  prerequisites: string;
  isMandatory: boolean;
  allowSelfEnrollment: boolean;
  totalSessions: number;
  totalEmployees: number;
}

const EMPTY_FORM = {
  name: "",
  trainingTypeId: "",
  description: "",
  durationHours: "",
  cost: "",
  capacity: "",
  status: "" as "" | ProgramStatus,
  materialsUrl: "",
  materialsName: "",
  prerequisites: "",
  isMandatory: false,
  allowSelfEnrollment: false,
};

function StatusBadge({ status }: { status: ProgramStatus }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
        Active
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
        Completed
      </span>
    );
  }
  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
        Cancelled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border/80">
      Draft
    </span>
  );
}

export default function HrTrainingProgramsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { formatCurrency } = useWorkspaceSettings();

  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [activeTab, setActiveTab] = useState<"all" | ProgramStatus>("all");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TrainingProgramItem | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<TrainingProgramItem | null>(null);

  const { data: programs = [], isLoading } = useQuery<TrainingProgramItem[]>({
    queryKey: ["hr-training-programs"],
    queryFn: async () => {
      const res = await api.get("/hr/training/programs");
      return unwrapArray<TrainingProgramItem>(res);
    },
  });

  const { data: trainingTypes = [] } = useQuery<TrainingTypeOption[]>({
    queryKey: ["hr-training-types"],
    queryFn: async () => {
      const res = await api.get("/hr/training/types");
      return unwrapArray<TrainingTypeOption>(res);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const body = {
        name: payload.name.trim(),
        title: payload.name.trim(),
        trainingTypeId: payload.trainingTypeId || null,
        description: payload.description.trim(),
        durationHours: Number(payload.durationHours || 0),
        cost: payload.cost !== "" ? Number(payload.cost) : 0,
        capacity: Number(payload.capacity || 20),
        status: payload.status || "draft",
        materialsUrl: payload.materialsUrl || "",
        materialsName: payload.materialsName || "",
        prerequisites: payload.prerequisites.trim(),
        isMandatory: payload.isMandatory,
        allowSelfEnrollment: payload.allowSelfEnrollment,
      };
      if (editing) {
        return api.put(`/hr/training/programs/${editing.id}`, body);
      }
      return api.post("/hr/training/programs", body);
    },
    onSuccess: () => {
      toast.success(editing ? "Training program updated" : "Training program created");
      queryClient.invalidateQueries({ queryKey: ["hr-training-programs"] });
      queryClient.invalidateQueries({ queryKey: ["hr-training-types"] });
      setFormOpen(false);
      setEditing(null);
      setFormData(EMPTY_FORM);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save training program"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/training/programs/${id}`),
    onSuccess: () => {
      toast.success("Training program deleted");
      queryClient.invalidateQueries({ queryKey: ["hr-training-programs"] });
      queryClient.invalidateQueries({ queryKey: ["hr-training-types"] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete training program"),
  });

  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return programs.filter((p) => {
      if (selectedType !== "all" && p.trainingTypeId !== selectedType) return false;
      if (q) {
        const text = `${p.name} ${p.trainingType?.name || p.category || ""} ${p.description || ""}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [programs, search, selectedType]);

  const counts = useMemo(
    () => ({
      all: baseFiltered.length,
      draft: baseFiltered.filter((p) => p.status === "draft").length,
      active: baseFiltered.filter((p) => p.status === "active").length,
      completed: baseFiltered.filter((p) => p.status === "completed").length,
      cancelled: baseFiltered.filter((p) => p.status === "cancelled").length,
    }),
    [baseFiltered]
  );

  const filtered = useMemo(() => {
    const list =
      activeTab === "all"
        ? baseFiltered
        : baseFiltered.filter((p) => p.status === activeTab);
    return [...list].sort((a, b) =>
      sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    );
  }, [baseFiltered, activeTab, sortAsc]);

  const totalResults = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const hasFilters = Boolean(search || selectedType !== "all");

  const openAdd = () => {
    setEditing(null);
    setFormData(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (item: TrainingProgramItem) => {
    setEditing(item);
    setFormData({
      name: item.name || item.title || "",
      trainingTypeId: item.trainingTypeId || "",
      description: item.description || "",
      durationHours: item.durationHours ? String(item.durationHours) : "",
      cost: item.cost !== undefined && item.cost !== null ? Number(item.cost).toFixed(2) : "",
      capacity: item.capacity ? String(item.capacity) : "",
      status: item.status || "draft",
      materialsUrl: item.materialsUrl || "",
      materialsName: item.materialsName || "",
      prerequisites: item.prerequisites || "",
      isMandatory: Boolean(item.isMandatory),
      allowSelfEnrollment: Boolean(item.allowSelfEnrollment),
    });
    setFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error("Program name is required");
    if (!formData.trainingTypeId && trainingTypes.length > 0) {
      return toast.error("Please select a training type");
    }
    if (!formData.durationHours) return toast.error("Duration (hours) is required");
    if (!formData.capacity) return toast.error("Capacity is required");
    if (!formData.status) return toast.error("Please select a status");
    saveMutation.mutate(formData);
  };

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      <PageHeader
        title="Training Programs"
        description="Manage training programs, materials, and enrollment settings."
        actions={
          <Button
            onClick={openAdd}
            className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Training Program
          </Button>
        }
      />

      {/* Filter & Tabs Card */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-[280px]">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search..."
              className="pl-9 h-9 bg-background"
            />
          </div>

          <Select
            value={selectedType}
            onValueChange={(val) => {
              setSelectedType(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[200px] h-9 bg-background">
              <SelectValue placeholder="All Training Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Training Types</SelectItem>
              {trainingTypes.map((tt) => (
                <SelectItem key={tt.id} value={tt.id}>
                  {tt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center justify-end gap-2">
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setSelectedType("all");
                  setPage(1);
                }}
                className="h-9 text-xs"
              >
                <X className="h-3.5 w-3.5 mr-1" /> Reset
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              Filters
            </Button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="px-4 border-t border-border/70 flex items-center gap-6 overflow-x-auto">
          {[
            { key: "all" as const, label: "All", count: counts.all, Icon: LayoutGrid },
            { key: "draft" as const, label: "Draft", count: counts.draft, Icon: FileEdit },
            { key: "active" as const, label: "Active", count: counts.active, Icon: PlayCircle },
            { key: "completed" as const, label: "Completed", count: counts.completed, Icon: CheckCircle2 },
            { key: "cancelled" as const, label: "Cancelled", count: counts.cancelled, Icon: XCircle },
          ].map(({ key, label, count, Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveTab(key);
                  setPage(1);
                }}
                className={`py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    active ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Data Table Card */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/80 bg-muted/50">
                <th className="p-3.5 text-xs font-semibold text-muted-foreground w-12">#</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => setSortAsc((p) => !p)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <span>Name</span>
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">Duration</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">Cost</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">Capacity</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground text-right pr-5">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-sm text-muted-foreground">
                    Loading training programs...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-sm text-muted-foreground">
                    No training programs found. Click &ldquo;+ Add Training Program&rdquo; to create one.
                  </td>
                </tr>
              ) : (
                paginated.map((prog, idx) => {
                  const rowNum = (safePage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={prog.id} className="hover:bg-muted/35 transition-colors">
                      <td className="p-3.5 text-sm font-medium text-muted-foreground">{rowNum}</td>
                      <td className="p-3.5">
                        <div className="space-y-1.5 min-w-[220px]">
                          <div className="text-sm font-semibold text-foreground">{prog.name}</div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
                              <Tag className="h-3 w-3" />
                              {prog.trainingType?.name || prog.category}
                            </span>
                            {prog.isMandatory && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                                Mandatory
                              </span>
                            )}
                            {prog.allowSelfEnrollment && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
                                Self-Enrollment
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 text-sm text-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {prog.durationHours} hours
                        </span>
                      </td>
                      <td className="p-3.5 text-sm font-semibold text-foreground whitespace-nowrap">
                        {formatCurrency(prog.cost)}
                      </td>
                      <td className="p-3.5 text-sm text-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          {prog.capacity}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <StatusBadge status={prog.status} />
                      </td>
                      <td className="p-3.5 pr-5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            title="View Program Details"
                            onClick={() => router.push(`/hr/training/programs/${prog.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-sky-600"
                            title="Edit Training Program"
                            onClick={() => openEdit(prog)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                            title="Delete Training Program"
                            onClick={() => setDeleteTarget(prog)}
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

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-border/70 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <div>
            Showing{" "}
            <span className="font-medium text-foreground">
              {totalResults === 0 ? 0 : (safePage - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-foreground">
              {Math.min(safePage * pageSize, totalResults)}
            </span>{" "}
            of <span className="font-medium text-foreground">{totalResults}</span> results
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs">Rows per page:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[70px] h-8 bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                « Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(Math.max(0, safePage - 3), Math.min(totalPages, safePage + 2))
                .map((pNum) => (
                  <Button
                    key={pNum}
                    variant={pNum === safePage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(pNum)}
                    className={`h-8 w-8 p-0 text-xs ${
                      pNum === safePage
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500"
                        : ""
                    }`}
                  >
                    {pNum}
                  </Button>
                ))}
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next »
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Training Program Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Training Program" : "Add New Training Program"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>
                Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Advanced Leadership Program"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Training Type <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={formData.trainingTypeId}
                onValueChange={(val) => setFormData((p) => ({ ...p, trainingTypeId: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Training Type" />
                </SelectTrigger>
                <SelectContent>
                  {trainingTypes.map((tt) => (
                    <SelectItem key={tt.id} value={tt.id}>
                      {tt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="e.g. A comprehensive program designed to develop leadership skills..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Duration (hours) <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                min={0}
                step="0.5"
                value={formData.durationHours}
                onChange={(e) => setFormData((p) => ({ ...p, durationHours: e.target.value }))}
                placeholder="e.g. 8"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Cost</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData((p) => ({ ...p, cost: e.target.value }))}
                placeholder="e.g. 500.00"
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Capacity <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                min={1}
                value={formData.capacity}
                onChange={(e) => setFormData((p) => ({ ...p, capacity: e.target.value }))}
                placeholder="e.g. 20"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Status <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={formData.status}
                onValueChange={(val) =>
                  setFormData((p) => ({ ...p, status: val as ProgramStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <LifecycleDocumentField
              label="Materials"
              folder="tenant/training-materials"
              documentUrl={formData.materialsUrl}
              documentName={formData.materialsName}
              placeholder="Select materials file..."
              onChange={(url, name) =>
                setFormData((p) => ({ ...p, materialsUrl: url, materialsName: name }))
              }
            />

            <div className="space-y-1.5">
              <Label>Prerequisites</Label>
              <Textarea
                rows={3}
                value={formData.prerequisites}
                onChange={(e) => setFormData((p) => ({ ...p, prerequisites: e.target.value }))}
                placeholder="e.g. Basic computer skills, completion of onboarding training..."
              />
            </div>

            <div className="space-y-2.5 pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.isMandatory}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, isMandatory: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-border accent-emerald-500"
                />
                <span className="text-sm font-semibold text-foreground">Mandatory Training</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.allowSelfEnrollment}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, allowSelfEnrollment: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-border accent-emerald-500"
                />
                <span className="text-sm font-semibold text-foreground">Allow Self-Enrollment</span>
              </label>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Modal */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Training Program</DialogTitle>
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
