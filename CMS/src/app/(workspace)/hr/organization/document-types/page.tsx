'use client';

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Edit,
  Trash2,
  ArrowUpDown,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface DocumentTypeItem {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description: string | null;
  isRequired: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function DocumentTypesPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [requiredFilter, setRequiredFilter] = useState<"all" | "required" | "optional">("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [editingItem, setEditingItem] = useState<DocumentTypeItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentTypeItem | null>(null);

  // Left Form Card State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isRequired, setIsRequired] = useState<"optional" | "required">("optional");

  const { data: docTypes = [], isLoading, refetch } = useQuery<DocumentTypeItem[]>({
    queryKey: ["document-types-list", activeSearch, requiredFilter],
    queryFn: async () => {
      const res = await api.get("/hr/organization/document-types", {
        params: {
          search: activeSearch || undefined,
          filter: requiredFilter,
        },
      });
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  const sortedDocTypes = [...docTypes].sort((a, b) =>
    sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        isRequired: isRequired === "required",
      };
      if (editingItem) {
        return await api.put(`/hr/organization/document-types/${editingItem.id}`, payload);
      }
      return await api.post("/hr/organization/document-types", payload);
    },
    onSuccess: (res: any) => {
      toast.success(
        res?.announcementPushed
          ? `${editingItem ? "Updated" : "Created"} as Required — missing-document announcement pushed to existing employees.`
          : editingItem
            ? "Document type updated."
            : "Document type created successfully."
      );
      setEditingItem(null);
      setName("");
      setDescription("");
      setIsRequired("optional");
      queryClient.invalidateQueries({ queryKey: ["document-types-list"] });
      queryClient.invalidateQueries({ queryKey: ["wizard-document-types"] });
      queryClient.invalidateQueries({ queryKey: ["announcements-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-company-announcements"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to save document type.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/hr/organization/document-types/${id}`);
    },
    onSuccess: () => {
      toast.success("Document type deleted.");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["document-types-list"] });
      queryClient.invalidateQueries({ queryKey: ["wizard-document-types"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Cannot delete document type.");
    },
  });

  const startEdit = (item: DocumentTypeItem) => {
    setEditingItem(item);
    setName(item.name || "");
    setDescription(item.description || "");
    setIsRequired(item.isRequired ? "required" : "optional");
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setName("");
    setDescription("");
    setIsRequired("optional");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchInput.trim());
  };

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Document Types"
        description="Manage document types used for employee records."
      />

      {/* ── 2-Column Split Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Add / Edit Document Type Form Card */}
        <div className="lg:col-span-4 rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-border/70">
            <h2 className="text-base font-bold text-foreground">
              {editingItem ? "Edit Document Type" : "Add New Document Type"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {editingItem
                ? "Update the selected document type details"
                : "Fill in the details to create a new document type"}
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) {
                toast.error("Document Type Name is required.");
                return;
              }
              saveMutation.mutate();
            }}
            className="p-5 space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="doc-type-name" className="text-xs font-semibold text-foreground">
                Document Type Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="doc-type-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Passport, National ID, Contract"
                className="h-10 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-type-desc" className="text-xs font-semibold text-foreground">
                Description
              </Label>
              <Textarea
                id="doc-type-desc"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the document type"
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Required</Label>
              <Select
                value={isRequired}
                onValueChange={(v) => setIsRequired(v as "optional" | "required")}
              >
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="optional">Optional</SelectItem>
                  <SelectItem value="required">Required</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Is this document required for all employees?
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="w-full h-10 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs gap-1.5"
              >
                {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editingItem ? "Save Changes" : "Add Document Type"}
              </Button>
              {editingItem && (
                <Button type="button" variant="outline" onClick={cancelEdit} className="h-10 text-xs">
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* Right Column: Search/Filter Card + Document Types Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs space-y-3">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    if (!e.target.value.trim()) setActiveSearch("");
                  }}
                  placeholder="Search document types..."
                  className="pl-9 h-9 text-xs bg-background"
                />
              </div>
              <Button
                type="submit"
                className="h-9 px-4 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Search
              </Button>
            </form>

            <div>
              <Select
                value={requiredFilter}
                onValueChange={(v) => setRequiredFilter(v as "all" | "required" | "optional")}
              >
                <SelectTrigger className="w-[180px] h-9 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="required">Required</SelectItem>
                  <SelectItem value="optional">Optional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/80">
                  <TableHead className="text-xs font-semibold text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                      className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer"
                    >
                      Name
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
                    </button>
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground w-28">Required</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-right pr-6 w-28">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-32 text-center text-sm text-muted-foreground">
                      Loading document types...
                    </TableCell>
                  </TableRow>
                ) : sortedDocTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-32 text-center text-sm text-muted-foreground">
                      No document types found. Create one using the form on the left.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedDocTypes.map((item) => {
                    const desc = item.description || "";
                    const isLong = desc.length > 75;
                    const expanded = Boolean(expandedIds[item.id]);

                    return (
                      <TableRow
                        key={item.id}
                        className="hover:bg-muted/40 transition-colors border-b border-border/50 last:border-0"
                      >
                        <TableCell>
                          <div className="flex items-start gap-3">
                            <div className="h-9 w-9 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground leading-snug">{item.name}</p>
                              {desc && (
                                <p
                                  className={cn(
                                    "text-xs text-muted-foreground mt-0.5 leading-relaxed",
                                    !expanded && isLong && "line-clamp-2"
                                  )}
                                >
                                  {desc}
                                </p>
                              )}
                              {isLong && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedIds((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                                  }
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline mt-1 cursor-pointer"
                                >
                                  {expanded ? (
                                    <>
                                      <ChevronUp className="h-3 w-3" /> Show less
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-3 w-3" /> Show more
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[11px] font-medium px-2.5 py-0.5 rounded-md",
                              item.isRequired
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-muted text-muted-foreground border-border"
                            )}
                          >
                            {item.isRequired ? "Required" : "Optional"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="inline-flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                              title="Edit Document Type"
                              onClick={() => startEdit(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                              title="Delete Document Type"
                              onClick={() => setDeleteTarget(item)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Delete Document Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
