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
  Calendar,
  ArrowUpDown,
  Eye,
  Edit,
  Lock,
  Trash2,
  LayoutGrid,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";

interface IndicatorCategoryItem {
  id: string;
  name: string;
  code?: string;
  description?: string | null;
  isActive: boolean;
  status?: string;
  createdAt?: string;
}

const EMPTY_FORM = {
  name: "",
  description: "",
  status: "active" as "active" | "inactive",
};

function formatDateYmd(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toISOString().split("T")[0];
}

export default function HrPerformanceIndicatorCategoriesPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"name" | "createdAt">("createdAt");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IndicatorCategoryItem | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [viewItem, setViewItem] = useState<IndicatorCategoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IndicatorCategoryItem | null>(null);

  const { data: categories = [], isLoading } = useQuery<IndicatorCategoryItem[]>({
    queryKey: ["hr-performance-indicator-categories"],
    queryFn: async () => {
      const res = await api.get("/hr/performance/indicator-categories");
      return unwrapArray<IndicatorCategoryItem>(res);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const body = {
        ...payload,
        isActive: payload.status === "active",
      };
      if (editing) {
        return api.put(`/hr/performance/indicator-categories/${editing.id}`, body);
      }
      return api.post("/hr/performance/indicator-categories", body);
    },
    onSuccess: () => {
      toast.success(editing ? "Indicator category updated" : "Indicator category created");
      queryClient.invalidateQueries({ queryKey: ["hr-performance-indicator-categories"] });
      setFormOpen(false);
      setEditing(null);
      setFormData(EMPTY_FORM);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save indicator category"),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (item: IndicatorCategoryItem) =>
      api.patch(`/hr/performance/indicator-categories/${item.id}/status`, {
        isActive: !item.isActive,
      }),
    onSuccess: () => {
      toast.success("Category status updated");
      queryClient.invalidateQueries({ queryKey: ["hr-performance-indicator-categories"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/performance/indicator-categories/${id}`),
    onSuccess: () => {
      toast.success("Indicator category deleted");
      queryClient.invalidateQueries({ queryKey: ["hr-performance-indicator-categories"] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete indicator category"),
  });

  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categories.filter((c) => {
      if (!q) return true;
      return `${c.name} ${c.description || ""}`.toLowerCase().includes(q);
    });
  }, [categories, search]);

  const counts = useMemo(
    () => ({
      all: baseFiltered.length,
      active: baseFiltered.filter((c) => c.isActive !== false).length,
      inactive: baseFiltered.filter((c) => c.isActive === false).length,
    }),
    [baseFiltered]
  );

  const filtered = useMemo(() => {
    const list =
      activeTab === "all"
        ? baseFiltered
        : baseFiltered.filter((c) => (activeTab === "active" ? c.isActive !== false : c.isActive === false));
    return [...list].sort((a, b) => {
      if (sortBy === "name") {
        return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      const da = formatDateYmd(a.createdAt);
      const db = formatDateYmd(b.createdAt);
      return sortAsc ? da.localeCompare(db) : db.localeCompare(da);
    });
  }, [baseFiltered, activeTab, sortBy, sortAsc]);

  const totalResults = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const openAdd = () => {
    setEditing(null);
    setFormData(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (item: IndicatorCategoryItem) => {
    setEditing(item);
    setFormData({
      name: item.name || "",
      description: item.description || "",
      status: item.isActive === false ? "inactive" : "active",
    });
    setFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error("Category Name is required");
    saveMutation.mutate(formData);
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-7xl mx-auto">
      <PageHeader
        title="Indicator Categories"
        description="Manage categories used to group performance indicators."
        actions={
          <Button
            onClick={openAdd}
            className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Category
          </Button>
        }
      />

      {/* Search & Tabs Card */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4">
          <div className="relative max-w-[260px]">
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
        </div>

        {/* Status Tabs */}
        <div className="px-4 border-t border-border/70 flex items-center gap-6 overflow-x-auto">
          {[
            { key: "all" as const, label: "All", count: counts.all, Icon: LayoutGrid },
            { key: "active" as const, label: "Active", count: counts.active, Icon: CheckCircle2 },
            { key: "inactive" as const, label: "Inactive", count: counts.inactive, Icon: XCircle },
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
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy("createdAt");
                      setSortAsc((p) => !p);
                    }}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <span>Created At</span>
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                <th className="p-3.5 text-xs font-semibold text-muted-foreground text-right pr-5">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-sm text-muted-foreground">
                    Loading indicator categories...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-sm text-muted-foreground">
                    No indicator categories found. Click &ldquo;+ Add Category&rdquo; to create one.
                  </td>
                </tr>
              ) : (
                paginated.map((cat, idx) => {
                  const rowNum = (safePage - 1) * pageSize + idx + 1;
                  const isActive = cat.isActive !== false;
                  return (
                    <tr key={cat.id} className="hover:bg-muted/35 transition-colors">
                      <td className="p-3.5 text-sm font-medium text-muted-foreground">{rowNum}</td>
                      <td className="p-3.5 text-sm font-semibold text-foreground">{cat.name}</td>
                      <td className="p-3.5">
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
                      <td className="p-3.5 text-sm text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDateYmd(cat.createdAt)}
                        </span>
                      </td>
                      <td className="p-3.5 pr-5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            title="View Details"
                            onClick={() => setViewItem(cat)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-sky-600"
                            title="Edit Category"
                            onClick={() => openEdit(cat)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-amber-600"
                            title={isActive ? "Deactivate Category" : "Activate Category"}
                            onClick={() => toggleStatusMutation.mutate(cat)}
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                            title="Delete Category"
                            onClick={() => setDeleteTarget(cat)}
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

      {/* Indicator Category Details Modal */}
      <Dialog open={Boolean(viewItem)} onOpenChange={(o) => !o && setViewItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <span className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <LayoutGrid className="h-4 w-4" />
              </span>
              <span>Indicator Category Details</span>
            </DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Category Name</span>
                </div>
                <div className="text-sm font-semibold text-foreground mt-1">{viewItem.name}</div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" />
                  <span>Status</span>
                </div>
                <div className="mt-1.5">
                  {viewItem.isActive !== false ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border/80">
                      Inactive
                    </span>
                  )}
                </div>
              </div>
              <div className="sm:col-span-2">
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

      {/* Add / Edit Performance Indicator Category Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? "Edit Performance Indicator Category"
                : "Add Performance Indicator Category"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>
                Category Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Communication Skills"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="Assesses verbal and written communication abilities, listening skills, and effectiveness..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Status <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={formData.status}
                onValueChange={(val) =>
                  setFormData((p) => ({ ...p, status: val as "active" | "inactive" }))
                }
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
            <DialogTitle>Delete Indicator Category</DialogTitle>
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
