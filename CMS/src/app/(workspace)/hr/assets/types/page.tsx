"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface AssetTypeItem {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  prefix?: string;
  icon?: string | null;
  _count?: { assets: number };
}

export default function HrAssetTypesPage() {
  const queryClient = useQueryClient();

  const [editingItem, setEditingItem] = useState<AssetTypeItem | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<AssetTypeItem | null>(null);

  const { data: rawTypes = [], isLoading } = useQuery<AssetTypeItem[]>({
    queryKey: ["hr-asset-types", appliedSearch],
    queryFn: async () => {
      const res = await api.get("/hr/assets/types", {
        params: appliedSearch ? { search: appliedSearch } : undefined,
      });
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res?.categories)) return res.categories;
      return [];
    },
  });

  const sortedTypes = useMemo(() => {
    const list = [...rawTypes];
    list.sort((a, b) => {
      const cmp = (a.name || "").localeCompare(b.name || "");
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [rawTypes, sortAsc]);

  const resetForm = () => {
    setEditingItem(null);
    setName("");
    setDescription("");
  };

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; description: string }) =>
      api.post("/hr/assets/types", payload),
    onSuccess: () => {
      toast.success("Asset type added successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-asset-types"] });
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to add asset type");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name: string; description: string } }) =>
      api.patch(`/hr/assets/types/${id}`, payload),
    onSuccess: () => {
      toast.success("Asset type updated successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-asset-types"] });
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update asset type");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/hr/assets/types/${id}`),
    onSuccess: () => {
      toast.success("Asset type deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-asset-types"] });
      if (editingItem?.id === deleteTarget?.id) resetForm();
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete asset type");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      toast.error("Asset Type Name is required");
      return;
    }
    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        payload: { name: cleanName, description: description.trim() },
      });
    } else {
      createMutation.mutate({ name: cleanName, description: description.trim() });
    }
  };

  const handleStartEdit = (item: AssetTypeItem) => {
    setEditingItem(item);
    setName(item.name || "");
    setDescription(item.description || "");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchInput.trim());
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Asset Types</h1>
        <p className="text-sm text-muted-foreground">
          Categorize assets by type for better organization.
        </p>
      </div>

      {/* Main 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Card: Add / Edit Asset Type */}
        <div className="lg:col-span-4 rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
          <div className="p-5 border-b border-border/70">
            <h2 className="text-base font-bold text-foreground">
              {editingItem ? "Edit Asset Type" : "Add New Asset Type"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {editingItem
                ? "Update the details of this asset type"
                : "Fill in the details to create a new asset type"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="asset-type-name" className="text-sm font-medium text-foreground">
                Asset Type Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="asset-type-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Laptop, Furniture, Vehicle"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="asset-type-desc" className="text-sm font-medium text-foreground">
                Description
              </Label>
              <Textarea
                id="asset-type-desc"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the asset type"
                className="resize-y"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                type="submit"
                disabled={isSaving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium h-10"
              >
                {isSaving
                  ? editingItem
                    ? "Updating..."
                    : "Adding..."
                  : editingItem
                  ? "Update Asset Type"
                  : "Add Asset Type"}
              </Button>
              {editingItem && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="h-10"
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* Right Column: Search & Table */}
        <div className="lg:col-span-8 space-y-4">
          {/* Search Bar Card */}
          <form
            onSubmit={handleSearchSubmit}
            className="rounded-xl border border-border/80 bg-card p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
          >
            <div className="relative flex-1">
              <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base" />
              <Input
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  if (e.target.value === "") setAppliedSearch("");
                }}
                placeholder="Search asset types..."
                className="pl-9 h-10 w-full"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-5 flex-1 sm:flex-none"
              >
                Search
              </Button>
              {appliedSearch && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  onClick={() => {
                    setSearchInput("");
                    setAppliedSearch("");
                  }}
                >
                  Reset
                </Button>
              )}
            </div>
          </form>

          {/* Asset Types Table Card */}
          <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-muted/50 border-b border-border/80 text-xs font-semibold text-muted-foreground">
                    <th className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => setSortAsc((v) => !v)}
                        className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
                      >
                        <span>Name</span>
                        <i
                          className={`ph ${
                            sortAsc ? "ph-arrow-up" : "ph-arrow-down"
                          } text-xs text-muted-foreground`}
                        />
                      </button>
                    </th>
                    <th className="py-3.5 px-4 w-36">Assets</th>
                    <th className="py-3.5 px-4 w-28 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {isLoading ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-muted-foreground">
                        <i className="ph ph-spinner-gap animate-spin text-xl mr-2 align-middle" />
                        Loading asset types...
                      </td>
                    </tr>
                  ) : sortedTypes.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-muted-foreground">
                        <i className="ph ph-shapes text-3xl block mx-auto mb-2 opacity-50" />
                        No asset types found. Add one using the form on the left.
                      </td>
                    </tr>
                  ) : (
                    sortedTypes.map((item) => {
                      const desc = (item.description || "").trim();
                      const isLong = desc.length > 85;
                      const isExpanded = Boolean(expandedIds[item.id]);
                      const displayDesc =
                        !desc
                          ? "No description provided"
                          : isExpanded || !isLong
                          ? desc
                          : `${desc.slice(0, 85)}...`;
                      const assetCount = item._count?.assets ?? 0;

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-muted/30 transition-colors ${
                            editingItem?.id === item.id ? "bg-emerald-500/5" : ""
                          }`}
                        >
                          <td className="py-4 px-4 align-top">
                            <div className="flex items-start gap-3">
                              <div className="h-9 w-9 shrink-0 rounded-lg bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 flex items-center justify-center mt-0.5">
                                <i className="ph ph-shapes text-lg" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-foreground leading-snug">
                                  {item.name}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed break-words max-w-md">
                                  {displayDesc}
                                </p>
                                {isLong && (
                                  <button
                                    type="button"
                                    onClick={() => toggleExpand(item.id)}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline mt-1"
                                  >
                                    <i
                                      className={`ph ${
                                        isExpanded ? "ph-caret-up" : "ph-caret-down"
                                      } text-xs`}
                                    />
                                    <span>{isExpanded ? "Show less" : "Show more"}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 align-middle whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border border-border/80 bg-muted/40 text-foreground">
                              {assetCount} {assetCount === 1 ? "asset" : "assets"}
                            </span>
                          </td>
                          <td className="py-4 px-4 align-middle text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(item)}
                                title="Edit Asset Type"
                                className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                              >
                                <i className="ph ph-note-pencil text-base" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(item)}
                                title="Delete Asset Type"
                                className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                              >
                                <i className="ph ph-trash text-base" />
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
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Asset Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.name}</span>? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
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
