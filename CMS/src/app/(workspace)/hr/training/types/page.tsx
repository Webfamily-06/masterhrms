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
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Eye,
  Edit,
  Users,
  Trash2,
  BookOpen,
  BarChart2,
  GitBranch,
  Building2,
  FileText,
  X,
} from "lucide-react";

interface BranchItem {
  id: string;
  name: string;
}

interface DepartmentItem {
  id: string;
  name: string;
  branchId?: string | null;
  branchName?: string;
}

interface TrainingTypeItem {
  id: string;
  name: string;
  description: string;
  branchId?: string | null;
  branch?: BranchItem | null;
  departmentIds: string[];
  departments: DepartmentItem[];
  programsCount: number;
}

const EMPTY_FORM = {
  name: "",
  description: "",
  branchId: "",
};

export default function HrTrainingTypesPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedDept, setSelectedDept] = useState("all");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TrainingTypeItem | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [viewItem, setViewItem] = useState<TrainingTypeItem | null>(null);
  const [assignItem, setAssignItem] = useState<TrainingTypeItem | null>(null);
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<TrainingTypeItem | null>(null);

  const { data: types = [], isLoading } = useQuery<TrainingTypeItem[]>({
    queryKey: ["hr-training-types"],
    queryFn: async () => {
      const res = await api.get("/hr/training/types");
      return unwrapArray<TrainingTypeItem>(res);
    },
  });

  const { data: branches = [] } = useQuery<BranchItem[]>({
    queryKey: ["hr-org-branches-training"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/branches?limit=200");
      return unwrapArray<BranchItem>(res);
    },
  });

  const { data: departments = [] } = useQuery<DepartmentItem[]>({
    queryKey: ["hr-org-departments-training"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/departments?limit=300");
      return unwrapArray<DepartmentItem>(res);
    },
  });

  const branchNameMap = useMemo(
    () => new Map(branches.map((b) => [b.id, b.name])),
    [branches]
  );

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      if (editing) {
        return api.put(`/hr/training/types/${editing.id}`, payload);
      }
      return api.post("/hr/training/types", payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Training type updated" : "Training type created");
      queryClient.invalidateQueries({ queryKey: ["hr-training-types"] });
      setFormOpen(false);
      setEditing(null);
      setFormData(EMPTY_FORM);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save training type"),
  });

  const assignMutation = useMutation({
    mutationFn: async ({ id, departmentIds }: { id: string; departmentIds: string[] }) =>
      api.patch(`/hr/training/types/${id}/departments`, { departmentIds }),
    onSuccess: () => {
      toast.success("Departments assigned");
      queryClient.invalidateQueries({ queryKey: ["hr-training-types"] });
      setAssignItem(null);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to assign departments"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/training/types/${id}`),
    onSuccess: () => {
      toast.success("Training type deleted");
      queryClient.invalidateQueries({ queryKey: ["hr-training-types"] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete training type"),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return types
      .filter((t) => {
        if (selectedBranch !== "all" && t.branchId !== selectedBranch) return false;
        if (selectedDept !== "all" && !(t.departmentIds || []).includes(selectedDept)) return false;
        if (q) {
          const deptsText = (t.departments || []).map((d) => `${d.name} ${d.branchName || ""}`).join(" ");
          const text = `${t.name} ${t.description || ""} ${t.branch?.name || ""} ${deptsText}`.toLowerCase();
          if (!text.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => (sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
  }, [types, search, selectedBranch, selectedDept, sortAsc]);

  const totalResults = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const hasFilters = Boolean(search || selectedBranch !== "all" || selectedDept !== "all");

  const openAdd = () => {
    setEditing(null);
    setFormData(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (item: TrainingTypeItem) => {
    setEditing(item);
    setFormData({
      name: item.name || "",
      description: item.description || "",
      branchId: item.branchId || "",
    });
    setFormOpen(true);
  };

  const openAssign = (item: TrainingTypeItem) => {
    setAssignItem(item);
    setSelectedDeptIds(item.departmentIds || []);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error("Name is required");
    if (!formData.branchId && branches.length > 0) return toast.error("Please select a branch");
    saveMutation.mutate(formData);
  };

  const availableDeptsForAssign = useMemo(() => {
    if (!assignItem?.branchId) return departments;
    const branchFiltered = departments.filter((d) => !d.branchId || d.branchId === assignItem.branchId);
    return branchFiltered.length > 0 ? branchFiltered : departments;
  }, [departments, assignItem]);

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-7xl mx-auto">
      <PageHeader
        title="Training Types"
        description="Manage training types used to categorize training programs."
        actions={
          <Button
            onClick={openAdd}
            className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Training Type
          </Button>
        }
      />

      {/* Filter Bar Card */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-[260px]">
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
          value={selectedBranch}
          onValueChange={(val) => {
            setSelectedBranch(val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[175px] h-9 bg-background">
            <SelectValue placeholder="All Branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedDept}
          onValueChange={(val) => {
            setSelectedDept(val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[185px] h-9 bg-background">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setSelectedBranch("all");
                setSelectedDept("all");
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
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">Departments</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground w-28">
                  Programs
                </th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground text-right pr-5 w-40">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-sm text-muted-foreground">
                    Loading training types...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-sm text-muted-foreground">
                    No training types found. Click &ldquo;+ Add Training Type&rdquo; to create one.
                  </td>
                </tr>
              ) : (
                paginated.map((item, idx) => {
                  const rowNum = (safePage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={item.id} className="hover:bg-muted/35 transition-colors">
                      <td className="p-3.5 text-sm font-medium text-muted-foreground">{rowNum}</td>
                      <td className="p-3.5 text-sm font-semibold text-foreground">{item.name}</td>
                      <td className="p-3.5">
                        {item.departments && item.departments.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {item.departments.map((dept) => (
                              <div
                                key={dept.id}
                                className="px-2.5 py-1 rounded-md border border-border/80 bg-muted/30 leading-tight"
                              >
                                <div className="text-xs font-semibold text-foreground">
                                  {dept.name}
                                </div>
                                {(dept.branchName || item.branch?.name) && (
                                  <div className="text-[11px] text-muted-foreground">
                                    {dept.branchName || item.branch?.name}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {item.branch?.name ? `${item.branch.name} (No departments)` : "—"}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-sm font-semibold text-foreground">
                        {item.programsCount ?? 0}
                      </td>
                      <td className="p-3.5 pr-5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            title="View Details"
                            onClick={() => setViewItem(item)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-sky-600"
                            title="Edit Training Type"
                            onClick={() => openEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-emerald-600"
                            title="Assign Departments"
                            onClick={() => openAssign(item)}
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                            title="Delete Training Type"
                            onClick={() => setDeleteTarget(item)}
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

      {/* Training Type Details Modal */}
      <Dialog open={Boolean(viewItem)} onOpenChange={(o) => !o && setViewItem(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <span className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <BookOpen className="h-4 w-4" />
              </span>
              <span>Training Type Details</span>
            </DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Name</span>
                  </div>
                  <div className="text-sm font-semibold text-foreground mt-1">{viewItem.name}</div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BarChart2 className="h-3.5 w-3.5" />
                    <span>Programs</span>
                  </div>
                  <div className="text-sm font-semibold text-foreground mt-1">
                    {viewItem.programsCount ?? 0}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <GitBranch className="h-3.5 w-3.5" />
                  <span>Branch</span>
                </div>
                <div className="text-sm font-semibold text-foreground mt-1">
                  {viewItem.branch?.name || "—"}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>Departments</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {viewItem.departments && viewItem.departments.length > 0 ? (
                    viewItem.departments.map((d) => (
                      <div
                        key={d.id}
                        className="px-3 py-1.5 rounded-lg border border-border/80 bg-muted/30"
                      >
                        <div className="text-xs font-semibold text-foreground">{d.name}</div>
                        {(d.branchName || viewItem.branch?.name) && (
                          <div className="text-[11px] text-muted-foreground">
                            {d.branchName || viewItem.branch?.name}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No departments assigned.</span>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Description</span>
                </div>
                <p className="text-sm font-medium text-foreground mt-1 leading-relaxed">
                  {viewItem.description || "No description provided."}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add / Edit Training Type Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Training Type" : "Add New Training Type"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>
                Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Technical Skills Training"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="e.g. Training focused on improving technical skills..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Branch <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={formData.branchId}
                onValueChange={(val) => setFormData((p) => ({ ...p, branchId: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* Assign Departments Multi-Select Modal */}
      <Dialog open={Boolean(assignItem)} onOpenChange={(o) => !o && setAssignItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Departments</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>
              Departments <span className="text-rose-500">*</span>
            </Label>

            {/* Selected chips container */}
            <div className="min-h-[44px] p-2 rounded-lg border border-border/80 bg-background flex flex-wrap items-center gap-1.5">
              {selectedDeptIds.length === 0 ? (
                <span className="text-xs text-muted-foreground px-1">
                  Select departments below...
                </span>
              ) : (
                selectedDeptIds.map((id) => {
                  const dept = departments.find((d) => d.id === id);
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted border border-border/80 text-foreground"
                    >
                      <span>{dept?.name || id}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedDeptIds((prev) => prev.filter((item) => item !== id))
                        }
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })
              )}
            </div>

            {/* Available departments checklist */}
            <div className="max-h-52 overflow-y-auto border border-border/70 rounded-lg divide-y divide-border/50">
              {availableDeptsForAssign.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No departments found.
                </div>
              ) : (
                availableDeptsForAssign.map((dept) => {
                  const checked = selectedDeptIds.includes(dept.id);
                  const bName = dept.branchId ? branchNameMap.get(dept.branchId) : "";
                  return (
                    <label
                      key={dept.id}
                      className="flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted/40 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedDeptIds((prev) =>
                              checked ? prev.filter((x) => x !== dept.id) : [...prev, dept.id]
                            )
                          }
                          className="h-4 w-4 rounded border-border accent-emerald-500"
                        />
                        <span className="font-medium text-foreground">{dept.name}</span>
                      </div>
                      {bName && <span className="text-xs text-muted-foreground">{bName}</span>}
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignItem(null)}>
              Cancel
            </Button>
            <Button
              disabled={assignMutation.isPending || !assignItem}
              onClick={() =>
                assignItem &&
                assignMutation.mutate({ id: assignItem.id, departmentIds: selectedDeptIds })
              }
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {assignMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Modal */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Training Type</DialogTitle>
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
