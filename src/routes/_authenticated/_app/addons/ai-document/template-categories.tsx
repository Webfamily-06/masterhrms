import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { 
  FolderTree, 
  Plus, 
  RotateCw, 
  Trash2, 
  Edit, 
  Save, 
  X,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PlanGuard } from "@/components/plan-guard";
import { AiDocumentNavHeader } from "@/components/ai/ai-document-nav-header";
import { getAuthHeaders } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/_app/addons/ai-document/template-categories")({
  component: AiDocTemplateCategoriesPage,
});

interface CategoryItem {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

function AiDocTemplateCategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Form state
  const [editingCat, setEditingCat] = useState<CategoryItem | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(1);
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/addons/ai-document/categories", {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : data.categories || []);
      }
    } catch (err: any) {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleStartCreate = () => {
    setEditingCat({ id: "", name: "", description: "", isActive: true, sortOrder: categories.length + 1 });
    setName("");
    setDescription("");
    setSortOrder(categories.length + 1);
  };

  const handleStartEdit = (cat: CategoryItem) => {
    setEditingCat(cat);
    setName(cat.name);
    setDescription(cat.description || "");
    setSortOrder(cat.sortOrder);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      setSaving(true);
      const isNew = !editingCat?.id;
      const url = isNew
        ? "/api/v1/addons/ai-document/categories"
        : `/api/v1/addons/ai-document/categories/${editingCat?.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          sortOrder,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save category");
      }

      toast.success(isNew ? "Category created" : "Category updated");
      setEditingCat(null);
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: CategoryItem) => {
    if (!confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;
    try {
      const res = await fetch(`/api/v1/addons/ai-document/categories/${cat.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Cannot delete category (it may be in use by templates)");
      }
      toast.success("Category deleted");
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <PlanGuard moduleName="AI Document" requiredPlan="growth">
      <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
        <AiDocumentNavHeader activeTab="categories" />

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <FolderTree className="w-5 h-5 text-primary" />
                  <span>Template Categories</span>
                </CardTitle>
                <CardDescription>
                  Group templates into clean taxonomy folders (Blog, Social, HR, Marketing, etc.).
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={fetchCategories} disabled={loading}>
                  <RotateCw className="w-4 h-4 mr-1.5" /> Refresh
                </Button>
                <Button size="sm" onClick={handleStartCreate}>
                  <Plus className="w-4 h-4 mr-1.5" /> New Category
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Inline Editor if active */}
            {editingCat && (
              <form onSubmit={handleSave} className="p-4 border rounded-lg bg-muted/30 space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="font-semibold text-sm">
                    {editingCat.id ? "Edit Category" : "Add New Category"}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => setEditingCat(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Category Name *</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Finance & Accounting"
                      className="text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Sort Order</Label>
                    <Input
                      type="number"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(Number(e.target.value))}
                      className="text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short summary of documents under this category..."
                    className="text-xs"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingCat(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={saving}>
                    <Save className="w-4 h-4 mr-1.5" />
                    {saving ? "Saving..." : "Save Category"}
                  </Button>
                </div>
              </form>
            )}

            {/* Categories Table */}
            {loading ? (
              <div className="py-12 text-center text-muted-foreground text-xs flex justify-center items-center space-x-2">
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Loading categories...</span>
              </div>
            ) : categories.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs border rounded-md">
                No categories configured. Click "New Category" to create one.
              </div>
            ) : (
              <div className="border rounded-md divide-y overflow-hidden text-xs">
                <div className="bg-muted/40 px-4 py-2 font-semibold grid grid-cols-12 gap-2 text-muted-foreground">
                  <span className="col-span-1">#</span>
                  <span className="col-span-4">Category Name</span>
                  <span className="col-span-5">Description</span>
                  <span className="col-span-2 text-right">Actions</span>
                </div>
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="px-4 py-3 grid grid-cols-12 gap-2 items-center hover:bg-muted/20 transition-colors"
                  >
                    <span className="col-span-1 font-mono text-muted-foreground">{cat.sortOrder}</span>
                    <span className="col-span-4 font-semibold text-foreground text-sm flex items-center">
                      <FolderTree className="w-3.5 h-3.5 mr-2 text-primary" />
                      {cat.name}
                    </span>
                    <span className="col-span-5 text-muted-foreground truncate">{cat.description || "—"}</span>
                    <div className="col-span-2 flex justify-end space-x-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleStartEdit(cat)}
                      >
                        <Edit className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-500 hover:text-rose-600"
                        onClick={() => handleDelete(cat)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PlanGuard>
  );
}
