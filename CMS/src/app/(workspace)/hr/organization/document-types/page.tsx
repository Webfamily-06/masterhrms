'use client';

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StandardPagination } from "@/components/ui/standard-pagination";
import { GlobalExportDropdown } from "@/components/ui/global-export-dropdown";
import { exportToExcel, exportToPdf, ExportColumn } from "@/lib/export-utils";
import { Checkbox } from "@/components/ui/checkbox";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Search,
  RotateCcw,
  AlertTriangle,
  Loader2,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  _count?: {
    companyDocuments: number;
    onboardingTasks: number;
    totalUsage: number;
  };
}

export default function DocumentTypesPage() {
  const queryClient = useQueryClient();

  // Search & Filter state
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "required" | "optional">("all");

  // Form creation state
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createRequired, setCreateRequired] = useState<"Optional" | "Required">("Optional");

  // Expanded descriptions map
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

  // Edit Modal state
  const [editingItem, setEditingItem] = useState<DocumentTypeItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editRequired, setEditRequired] = useState<"Optional" | "Required">("Optional");

  // Delete / Safety Deactivate Modal state
  const [deletingItem, setDeletingItem] = useState<DocumentTypeItem | null>(null);

  // Pagination & selection state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Fetch Document Types
  const { data, isLoading } = useQuery<any>({
    queryKey: ["document-types", activeSearch, activeFilter],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (activeSearch) params.search = activeSearch;
      if (activeFilter !== "all") params.filter = activeFilter;
      const res = await api.get("/hr/organization/document-types", { params });
      return res?.data !== undefined ? res.data : res;
    },
  });

  const documentTypes: DocumentTypeItem[] = useMemo(() => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  }, [data]);

  const filteredDocumentTypes = useMemo(() => {
    return documentTypes.filter((doc) => {
      if (activeFilter === "required") return doc.isRequired;
      if (activeFilter === "optional") return !doc.isRequired;
      return true;
    });
  }, [documentTypes, activeFilter]);

  const paginatedDocumentTypes = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredDocumentTypes.slice(start, start + pageSize);
  }, [filteredDocumentTypes, page, pageSize]);

  const isAllCurrentPageSelected =
    paginatedDocumentTypes.length > 0 &&
    paginatedDocumentTypes.every((d) => selectedIds.includes(d.id));
  const isPartiallySelected =
    paginatedDocumentTypes.some((d) => selectedIds.includes(d.id)) &&
    !isAllCurrentPageSelected;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pageIds = paginatedDocumentTypes.map((d) => d.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageIds = new Set(paginatedDocumentTypes.map((d) => d.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    }
  };

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return await api.post("/hr/organization/document-types/bulk-delete", { ids });
    },
    onSuccess: () => {
      toast.success(`Deleted ${selectedIds.length} document type(s)`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["document-types"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Bulk delete failed");
    },
  });

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.length} selected document type(s)?`)) {
      bulkDeleteMutation.mutate(selectedIds);
    }
  };

  const docExportColumns: ExportColumn<DocumentTypeItem>[] = [
    { header: "Document Name", key: "name" },
    { header: "Requirement", key: "isRequired", format: (v) => (v ? "Required" : "Optional") },
    { header: "Description", key: "description", format: (v) => v || "—" },
    { header: "Created At", key: "createdAt", format: (v) => (v ? new Date(v).toLocaleDateString() : "—") },
  ];

  const handleExportExcel = async () => {
    const dataToExport =
      selectedIds.length > 0
        ? filteredDocumentTypes.filter((d) => selectedIds.includes(d.id))
        : filteredDocumentTypes;
    await exportToExcel({
      filename: `document_types_${new Date().toISOString().split("T")[0]}`,
      title: "Document Types Directory",
      columns: docExportColumns,
      data: dataToExport,
    });
    toast.success(`Exported ${dataToExport.length} document type(s) to Excel`);
  };

  const handleExportPdf = async () => {
    const dataToExport =
      selectedIds.length > 0
        ? filteredDocumentTypes.filter((d) => selectedIds.includes(d.id))
        : filteredDocumentTypes;
    await exportToPdf({
      filename: `document_types_${new Date().toISOString().split("T")[0]}`,
      title: "Document Types Directory",
      columns: docExportColumns,
      data: dataToExport,
    });
    toast.success(`Exported ${dataToExport.length} document type(s) to PDF`);
  };

  const counts = useMemo(() => {
    if (data?.counts) return data.counts;
    const total = documentTypes.length;
    const required = documentTypes.filter((d) => d.isRequired).length;
    const optional = total - required;
    return { total, required, optional };
  }, [data, documentTypes]);

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; description?: string; isRequired: boolean }) => {
      const res = await api.post("/hr/organization/document-types", payload);
      return res.data;
    },
    onSuccess: (res) => {
      toast.success(res.message || "Document type created successfully");
      queryClient.invalidateQueries({ queryKey: ["document-types"] });
      setCreateName("");
      setCreateDescription("");
      setCreateRequired("Optional");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create document type");
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: { name: string; description?: string; isRequired: boolean };
    }) => {
      const res = await api.put(`/hr/organization/document-types/${id}`, payload);
      return res.data;
    },
    onSuccess: (res) => {
      toast.success(res.message || "Document type updated successfully");
      queryClient.invalidateQueries({ queryKey: ["document-types"] });
      setEditingItem(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update document type");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ id, deactivate }: { id: string; deactivate?: boolean }) => {
      const url = `/hr/organization/document-types/${id}${deactivate ? "?deactivate=true" : ""}`;
      const res = await api.delete(url);
      return res.data;
    },
    onSuccess: (res) => {
      toast.success(res.message || "Document type removed successfully");
      queryClient.invalidateQueries({ queryKey: ["document-types"] });
      setDeletingItem(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to delete document type");
    },
  });

  // Handlers
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      toast.error("Please enter a document type name");
      return;
    }
    createMutation.mutate({
      name: createName.trim(),
      description: createDescription.trim() || undefined,
      isRequired: createRequired === "Required",
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchInput.trim());
  };

  const handleResetSearch = () => {
    setSearchInput("");
    setActiveSearch("");
  };

  const openEditModal = (item: DocumentTypeItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditDescription(item.description || "");
    setEditRequired(item.isRequired ? "Required" : "Optional");
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!editName.trim()) {
      toast.error("Please enter a document type name");
      return;
    }
    updateMutation.mutate({
      id: editingItem.id,
      payload: {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        isRequired: editRequired === "Required",
      },
    });
  };

  const toggleDescription = (id: string) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Document Types"
        description="Manage document types used for employee records and onboarding verification."
      />

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Add New Document Type Form (approx 35% / 4-cols on lg) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="shadow-sm border-slate-200/80 dark:border-slate-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Add New Document Type
              </CardTitle>
              <CardDescription>
                Define a document classification required for personnel records or new hire onboarding.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                {/* Document Type Name */}
                <div className="space-y-2">
                  <Label htmlFor="cms-create-doc-name" className="text-sm font-medium">
                    Document Type Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="cms-create-doc-name"
                    placeholder="e.g., Aadhaar Card, Passport, Degree"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="cms-create-doc-description" className="text-sm font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="cms-create-doc-description"
                    placeholder="Brief description of this document type..."
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {/* Required / Optional Dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="cms-create-doc-required" className="text-sm font-medium">
                    Required <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={createRequired}
                    onValueChange={(val: "Optional" | "Required") => setCreateRequired(val)}
                  >
                    <SelectTrigger id="cms-create-doc-required" className="w-full">
                      <SelectValue placeholder="Select requirement level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Optional">Optional</SelectItem>
                      <SelectItem value="Required">Required</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Required documents must be submitted during candidate onboarding before completion.
                  </p>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full mt-2"
                  disabled={createMutation.isPending || !createName.trim()}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding Document Type...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Document Type
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Search, Filter Tabs & Document Types Table (approx 65% / 8-cols on lg) */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="shadow-sm border-slate-200/80 dark:border-slate-800">
            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* Top Search & Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                {/* Search Form */}
                <form
                  onSubmit={handleSearchSubmit}
                  className="flex items-center gap-2 flex-1 max-w-md"
                >
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search document types..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="pl-9 w-full"
                    />
                  </div>
                  <Button type="submit" variant="secondary" size="sm" className="px-4">
                    Search
                  </Button>
                  {(searchInput || activeSearch) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResetSearch}
                      title="Clear search"
                    >
                      <RotateCcw className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </form>

                {/* Filter Tabs: All, Required, Optional */}
                <div className="flex items-center rounded-lg bg-muted p-1 border border-border self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setActiveFilter("all")}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                      activeFilter === "all"
                        ? "bg-background text-foreground shadow-sm font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    All ({counts.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter("required")}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                      activeFilter === "required"
                        ? "bg-background text-emerald-700 dark:text-emerald-400 shadow-sm font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Required ({counts.required})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter("optional")}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                      activeFilter === "optional"
                        ? "bg-background text-foreground shadow-sm font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Optional ({counts.optional})
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {selectedIds.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                      className="h-9 gap-1 text-xs"
                    >
                      Delete ({selectedIds.length})
                    </Button>
                  )}
                  <GlobalExportDropdown
                    onExportExcel={handleExportExcel}
                    onExportPdf={handleExportPdf}
                  />
                </div>
              </div>

              {/* Document Types Table */}
              <div className="rounded-md border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12 text-center">
                        <Checkbox
                          checked={isAllCurrentPageSelected ? true : isPartiallySelected ? "indeterminate" : false}
                          onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                          aria-label="Select all document types on this page"
                        />
                      </TableHead>
                      <TableHead className="w-[50%] font-semibold">Name</TableHead>
                      <TableHead className="w-[20%] font-semibold">Required</TableHead>
                      <TableHead className="w-[20%] text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Loading document types...</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredDocumentTypes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                            <Layers className="h-8 w-8 text-muted-foreground/60" />
                            <p className="text-sm font-medium">No document types found</p>
                            <p className="text-xs">
                              {activeSearch
                                ? "No results match your search query."
                                : "Add your first document type using the form on the left."}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedDocumentTypes.map((item) => {
                        const isExpanded = expandedDescriptions[item.id] || false;
                        const hasLongDescription =
                          Boolean(item.description && item.description.length > 80);
                        const isChecked = selectedIds.includes(item.id);

                        return (
                          <TableRow
                            key={item.id}
                            data-state={isChecked ? "selected" : undefined}
                            className="hover:bg-muted/40 transition-colors"
                          >
                            <TableCell className="w-12 text-center align-top py-3">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedIds((prev) => [...prev, item.id]);
                                  } else {
                                    setSelectedIds((prev) => prev.filter((id) => id !== item.id));
                                  }
                                }}
                                aria-label={`Select ${item.name}`}
                              />
                            </TableCell>
                            {/* Name & Expandable Description */}
                            <TableCell className="align-top py-3">
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5 p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                                  <FileText className="h-4 w-4" />
                                </div>
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-foreground">
                                      {item.name}
                                    </span>
                                    {!item.isActive && (
                                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                        Inactive
                                      </Badge>
                                    )}
                                  </div>
                                  {item.description ? (
                                    <div className="text-xs text-muted-foreground leading-relaxed">
                                      {hasLongDescription && !isExpanded ? (
                                        <>
                                          {item.description.slice(0, 80)}...{" "}
                                          <button
                                            type="button"
                                            onClick={() => toggleDescription(item.id)}
                                            className="text-primary hover:underline font-medium inline-block ml-1"
                                          >
                                            Show More
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          {item.description}
                                          {hasLongDescription && (
                                            <button
                                              type="button"
                                              onClick={() => toggleDescription(item.id)}
                                              className="text-primary hover:underline font-medium inline-block ml-1"
                                            >
                                              Show Less
                                            </button>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground/60 italic">
                                      No description provided
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>

                            {/* Required Badge */}
                            <TableCell className="align-middle py-3">
                              {item.isRequired ? (
                                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 font-medium">
                                  Required
                                </Badge>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200 dark:bg-slate-800 dark:text-slate-300 font-normal"
                                >
                                  Optional
                                </Badge>
                              )}
                            </TableCell>

                            {/* Actions: Edit & Delete */}
                            <TableCell className="text-right align-middle py-3">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditModal(item)}
                                  className="h-8 px-2 text-muted-foreground hover:text-foreground"
                                  title="Edit Document Type"
                                >
                                  <Pencil className="h-3.5 w-3.5 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletingItem(item)}
                                  className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  title="Delete Document Type"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                                  Delete
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

              {/* Standard Pagination */}
              <StandardPagination
                page={page}
                pageSize={pageSize}
                total={filteredDocumentTypes.length}
                onPageChange={(p) => setPage(p)}
                onPageSizeChange={(s) => {
                  setPageSize(s);
                  setPage(1);
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Document Type Modal */}
      <Dialog
        open={Boolean(editingItem)}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null);
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Edit Document Type</DialogTitle>
            <DialogDescription>
              Update the name, description, or onboarding requirement status.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cms-edit-doc-name" className="text-sm font-medium">
                Document Type Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cms-edit-doc-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cms-edit-doc-description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="cms-edit-doc-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cms-edit-doc-required" className="text-sm font-medium">
                Required <span className="text-destructive">*</span>
              </Label>
              <Select
                value={editRequired}
                onValueChange={(val: "Optional" | "Required") => setEditRequired(val)}
              >
                <SelectTrigger id="cms-edit-doc-required">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Optional">Optional</SelectItem>
                  <SelectItem value="Required">Required</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingItem(null)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending || !editName.trim()}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete / Safety Deactivate Confirmation Dialog */}
      <Dialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => {
          if (!open) setDeletingItem(null);
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {deletingItem?._count && (deletingItem._count.totalUsage > 0)
                ? "Document Type In Use"
                : "Delete Document Type"}
            </DialogTitle>
            <DialogDescription asChild className="pt-2 text-left space-y-2">
              <div>
                {deletingItem?._count && (deletingItem._count.totalUsage > 0) ? (
                  <>
                    <p>
                      <span className="font-semibold text-foreground">{deletingItem.name}</span> is
                      currently associated with{" "}
                      <span className="font-semibold text-foreground">
                        {deletingItem._count.companyDocuments} employee document(s)
                      </span>{" "}
                      and{" "}
                      <span className="font-semibold text-foreground">
                        {deletingItem._count.onboardingTasks} onboarding requirement(s)
                      </span>.
                    </p>
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                      To maintain regulatory audit compliance and preserve historical employee records,
                      this document type cannot be permanently deleted. You can deactivate it so it won&apos;t
                      be assigned to new employees.
                    </div>
                  </>
                ) : (
                  <p>
                    Are you sure you want to permanently delete{" "}
                    <span className="font-semibold text-foreground">{deletingItem?.name}</span>? This action
                    cannot be undone.
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingItem(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            {deletingItem?._count && deletingItem._count.totalUsage > 0 ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  if (deletingItem) {
                    deleteMutation.mutate({ id: deletingItem.id, deactivate: true });
                  }
                }}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deactivating...
                  </>
                ) : (
                  "Deactivate Document Type"
                )}
              </Button>
            ) : (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  if (deletingItem) {
                    deleteMutation.mutate({ id: deletingItem.id, deactivate: false });
                  }
                }}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Document Type"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
