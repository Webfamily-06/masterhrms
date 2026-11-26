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
  Folder,
  Shield,
  User,
  TrendingUp,
  Award,
  Scale,
  Heart,
  DollarSign,
  Briefcase,
  FileText,
  AlertTriangle,
  Edit,
  Lock,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
} from "lucide-react";

interface DocCategoryItem {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  icon: string;
  isMandatory: boolean;
  isActive: boolean;
  status?: string;
  documentsCount: number;
}

const ICON_OPTIONS = [
  { value: "folder", label: "Folder", Icon: Folder },
  { value: "shield", label: "Shield", Icon: Shield },
  { value: "user", label: "User", Icon: User },
  { value: "trending-up", label: "Trending Up", Icon: TrendingUp },
  { value: "award", label: "Award", Icon: Award },
  { value: "scale", label: "Scale", Icon: Scale },
  { value: "heart", label: "Heart", Icon: Heart },
  { value: "dollar-sign", label: "Dollar Sign", Icon: DollarSign },
  { value: "briefcase", label: "Briefcase", Icon: Briefcase },
  { value: "file-text", label: "Document", Icon: FileText },
];

function CategoryIcon({ name, className = "h-4 w-4" }: { name?: string; className?: string }) {
  const match = ICON_OPTIONS.find((i) => i.value === String(name || "folder").toLowerCase());
  const IconComp = match?.Icon || Folder;
  return <IconComp className={className} />;
}

export default function HrDocumentCategoriesPage() {
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<DocCategoryItem | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [icon, setIcon] = useState("folder");
  const [isMandatory, setIsMandatory] = useState("optional");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<DocCategoryItem | null>(null);

  const { data: categories = [], isLoading } = useQuery<DocCategoryItem[]>({
    queryKey: ["hr-document-categories"],
    queryFn: async () => {
      const res = await api.get("/hr/documents/categories");
      return unwrapArray<DocCategoryItem>(res);
    },
  });

  const resetForm = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setColor("#3B82F6");
    setIcon("folder");
    setIsMandatory("optional");
    setStatus("active");
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        color: color.trim() || "#3B82F6",
        icon,
        isMandatory: isMandatory === "mandatory",
        status,
        isActive: status === "active",
      };
      if (editing) {
        return api.put(`/hr/documents/categories/${editing.id}`, payload);
      }
      return api.post("/hr/documents/categories", payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Category updated" : "Category added");
      queryClient.invalidateQueries({ queryKey: ["hr-document-categories"] });
      resetForm();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save category"),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (item: DocCategoryItem) =>
      api.patch(`/hr/documents/categories/${item.id}/status`, {
        isActive: !item.isActive,
      }),
    onSuccess: () => {
      toast.success("Category status updated");
      queryClient.invalidateQueries({ queryKey: ["hr-document-categories"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/documents/categories/${id}`),
    onSuccess: () => {
      toast.success("Category deleted");
      queryClient.invalidateQueries({ queryKey: ["hr-document-categories"] });
      setDeleteTarget(null);
      if (editing?.id === deleteTarget?.id) resetForm();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete category"),
  });

  const filtered = useMemo(() => {
    const q = (appliedSearch || searchInput).trim().toLowerCase();
    return categories
      .filter((cat) => {
        const active = cat.isActive !== false && cat.status !== "inactive";
        if (statusFilter === "active" && !active) return false;
        if (statusFilter === "inactive" && active) return false;
        if (typeFilter === "mandatory" && !cat.isMandatory) return false;
        if (typeFilter === "optional" && cat.isMandatory) return false;
        if (q) {
          const text = `${cat.name} ${cat.description || ""}`.toLowerCase();
          if (!text.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => (sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
  }, [categories, appliedSearch, searchInput, statusFilter, typeFilter, sortAsc]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Category Name is required");
    saveMutation.mutate();
  };

  const startEdit = (item: DocCategoryItem) => {
    setEditing(item);
    setName(item.name);
    setDescription(item.description || "");
    setColor(item.color || "#3B82F6");
    setIcon(item.icon || "folder");
    setIsMandatory(item.isMandatory ? "mandatory" : "optional");
    setStatus(item.isActive === false ? "inactive" : "active");
  };

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      <PageHeader
        title="Document Categories"
        description="Organize HR documents into categories."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Form Card */}
        <div className="lg:col-span-4 bg-card border border-border/80 rounded-xl shadow-xs p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-foreground">
              {editing ? "Edit Category" : "Add New Category"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {editing
                ? "Update the selected document category details"
                : "Fill in the details to create a new document category"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Category Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., HR Policies, Contracts"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the category"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>
                  Color <span className="text-rose-500">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-9 w-10 rounded-md border border-border/80 bg-background p-0.5 cursor-pointer shrink-0"
                  />
                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-9 tabular-nums text-xs uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>
                  Icon <span className="text-rose-500">*</span>
                </Label>
                <Select value={icon} onValueChange={setIcon}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="inline-flex items-center gap-2">
                          <opt.Icon className="h-3.5 w-3.5" />
                          <span>{opt.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Mandatory Category</Label>
              <Select value={isMandatory} onValueChange={setIsMandatory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="optional">No, Optional</SelectItem>
                  <SelectItem value="mandatory">Yes, Mandatory</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Documents in mandatory categories require acknowledgment
              </p>
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
                  ? "Update Category"
                  : "Add Category"}
              </Button>
            </div>
          </form>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-8 space-y-4">
          {/* Search & Filters Card */}
          <div className="bg-card border border-border/80 rounded-xl shadow-xs p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setAppliedSearch(searchInput)}
                  placeholder="Search categories..."
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

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 bg-background">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="mandatory">Mandatory</SelectItem>
                  <SelectItem value="optional">Optional</SelectItem>
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
                        onClick={() => setSortAsc((p) => !p)}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        <span>Category</span>
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </th>
                    <th className="p-3.5 text-xs font-semibold text-muted-foreground w-24">
                      Documents
                    </th>
                    <th className="p-3.5 text-xs font-semibold text-muted-foreground w-28">
                      Type
                    </th>
                    <th className="p-3.5 text-xs font-semibold text-muted-foreground w-24">
                      Status
                    </th>
                    <th className="p-3.5 text-xs font-semibold text-muted-foreground text-right pr-5 w-28">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-sm text-muted-foreground">
                        Loading document categories...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-sm text-muted-foreground">
                        No document categories found. Create one on the left.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((cat) => {
                      const desc = cat.description || "";
                      const isLong = desc.length > 85;
                      const expanded = Boolean(expandedIds[cat.id]);
                      const isActive = cat.isActive !== false && cat.status !== "inactive";
                      return (
                        <tr key={cat.id} className="hover:bg-muted/35 transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-start gap-3">
                              <div
                                className="h-9 w-9 rounded-lg text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs"
                                style={{ backgroundColor: cat.color || "#3B82F6" }}
                              >
                                <CategoryIcon name={cat.icon} className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-semibold text-foreground">
                                    {cat.name}
                                  </span>
                                  {cat.isMandatory && (
                                    <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                  )}
                                </div>
                                {desc && (
                                  <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                    {isLong && !expanded ? `${desc.slice(0, 85)}...` : desc}
                                  </div>
                                )}
                                {isLong && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedIds((prev) => ({
                                        ...prev,
                                        [cat.id]: !prev[cat.id],
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
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground border border-border/70">
                              <FileText className="h-3 w-3 text-muted-foreground" />
                              {cat.documentsCount ?? 0}
                            </span>
                          </td>
                          <td className="p-3.5 align-middle">
                            {cat.isMandatory ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                                <AlertTriangle className="h-3 w-3" />
                                Mandatory
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
                                Optional
                              </span>
                            )}
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
                                title="Edit Category"
                                onClick={() => startEdit(cat)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-amber-600"
                                title={isActive ? "Deactivate" : "Activate"}
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
          </div>
        </div>
      </div>

      {/* Delete Confirm Modal */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Document Category</DialogTitle>
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
