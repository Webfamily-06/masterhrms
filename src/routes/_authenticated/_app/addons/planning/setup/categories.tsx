import React, { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PlanningNavHeader } from "@/components/planning/planning-nav-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit, Trash2, FolderPlus, Save } from "lucide-react";
import { toast } from "sonner";
import { getAuthHeaders } from "@/lib/api";

export const Route = createFileRoute(
  "/_authenticated/_app/addons/planning/setup/categories"
)({
  component: SetupCategoriesPage,
});

export default function SetupCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    sortOrder: 1,
    isActive: true,
  });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/addons/planning/categories", {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        setCategories(json.data || (Array.isArray(json) ? json : []));
      }
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setForm({
      name: "",
      sortOrder: categories.length + 1,
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (cat: any) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Category name is required");

    try {
      setSaving(true);
      const url = editingId
        ? `/api/v1/addons/planning/categories/${editingId}`
        : "/api/v1/addons/planning/categories";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });

      if (res.ok) {
        toast.success(editingId ? "Category updated" : "Category created");
        setModalOpen(false);
        fetchCategories();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to save category");
      }
    } catch {
      toast.error("Error saving category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete category "${name}"?`)) return;
    try {
      const res = await fetch(`/api/v1/addons/planning/categories/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        toast.success("Category deleted");
        fetchCategories();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to delete category");
      }
    } catch {
      toast.error("Network error deleting category");
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <PlanningNavHeader active="categories" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Strategic Categories</h1>
          <p className="text-xs text-muted-foreground">
            Classify challenges and initiatives across functional or thematic business pillars.
          </p>
        </div>
        <Button onClick={openCreateModal} size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Add Category
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Order</TableHead>
                  <TableHead>Category Name</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="text-right w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-mono text-xs">{cat.sortOrder}</TableCell>
                    <TableCell className="font-medium text-xs">{cat.name}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          cat.isActive
                            ? "bg-green-500/10 text-green-600 border border-green-500/20"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {cat.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditModal(cat)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(cat.id, cat.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>Setup functional categorization for strategic challenges.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label>Category Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Digital Transformation"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Display Order</Label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((p) => ({ ...p, sortOrder: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className="flex items-center justify-between border p-2.5 rounded-lg">
              <div>
                <Label className="text-xs">Active Status</Label>
                <p className="text-[11px] text-muted-foreground">Available in dropdown selectors</p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((p) => ({ ...p, isActive: checked }))}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
