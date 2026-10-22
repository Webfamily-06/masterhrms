import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  Folders,
  Plus,
  Search,
  Edit,
  Trash2,
  BookOpen,
  ArrowLeft,
  AlertCircle,
  Loader2,
} from "lucide-react";
import type { CmsPage } from "@/routes/_authenticated/super/cms";

export const Route = createFileRoute("/_authenticated/super/blogs/categories")({
  component: BlogCategoriesPage,
  head: () => ({ meta: [{ title: "Blog Categories — Super Admin" }] }),
});

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

const DEFAULT_CATEGORIES: BlogCategory[] = [
  { id: "cat-1", name: "ERP Systems", slug: "erp-systems", description: "Core ERP architecture, databases, and enterprise planning." },
  { id: "cat-2", name: "Global Payroll & Tax", slug: "global-payroll-tax", description: "Automated payroll calculations, statutory deductions, and cross-border pay runs." },
  { id: "cat-3", name: "Workforce AI", slug: "workforce-ai", description: "Generative AI, talent analytics, and automated decision workflows." },
  { id: "cat-4", name: "Supply Chain & Operations", slug: "supply-chain-operations", description: "Procurement, inventory tracking, and warehouse logistics." },
  { id: "cat-5", name: "Compliance & HRMS", slug: "compliance-hrms", description: "Labor laws, audits, privacy standards, and statutory filings." },
  { id: "cat-6", name: "Automation Insights", slug: "automation-insights", description: "Automated operational playbooks, schedulers, and routine elimination." },
];

function BlogCategoriesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<BlogCategory | null>(null);

  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDesc, setFormDesc] = useState("");

  const { data: categories = DEFAULT_CATEGORIES, isLoading: isLoadingCats } = useQuery<BlogCategory[]>({
    queryKey: ["cms-blog-categories"],
    queryFn: async () => {
      try {
        const page: any = await api.get("/cms/pages/system-blog-categories");
        if (page?.content && Array.isArray(page.content.categories)) {
          return page.content.categories.map((c: any) =>
            typeof c === "string"
              ? { id: `cat-${c.toLowerCase().replace(/[^a-z0-9]/g, "-")}`, name: c, slug: c.toLowerCase().replace(/[^a-z0-9]/g, "-") }
              : c
          );
        }
        return DEFAULT_CATEGORIES;
      } catch {
        return DEFAULT_CATEGORIES;
      }
    },
  });

  const { data: blogs = [] } = useQuery<CmsPage[]>({
    queryKey: ["cms-blogs-list"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/cms/blogs");
        return Array.isArray(res) ? res : res?.data || [];
      } catch {
        return [];
      }
    },
  });

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    blogs.forEach((b: any) => {
      const cat = b.content?.category;
      if (cat) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    return counts;
  }, [blogs]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter(
      (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q)
    );
  }, [categories, search]);

  const saveCategoriesMutation = useMutation({
    mutationFn: async (updatedList: BlogCategory[]) => {
      await api.put("/cms/pages/system-blog-categories", {
        title: "System Blog Categories",
        content: { categories: updatedList },
        published: true,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-blog-categories"] });
      setIsModalOpen(false);
      setEditingCategory(null);
      setFormName("");
      setFormSlug("");
      setFormDesc("");
      toast.success(editingCategory ? "Category updated successfully!" : "Category created successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save category");
    },
  });

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormName("");
    setFormSlug("");
    setFormDesc("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: BlogCategory) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormDesc(cat.description || "");
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      toast.error("Category name is required");
      return;
    }
    const cleanSlug = (formSlug.trim() || formName.trim())
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (editingCategory) {
      const updated = categories.map((c) =>
        c.id === editingCategory.id
          ? { ...c, name: formName.trim(), slug: cleanSlug, description: formDesc.trim() }
          : c
      );
      saveCategoriesMutation.mutate(updated);
    } else {
      const newCat: BlogCategory = {
        id: `cat-${Date.now()}`,
        name: formName.trim(),
        slug: cleanSlug,
        description: formDesc.trim(),
      };
      saveCategoriesMutation.mutate([...categories, newCat]);
    }
  };

  const handleDelete = (cat: BlogCategory) => {
    const updated = categories.filter((c) => c.id !== cat.id);
    saveCategoriesMutation.mutate(updated);
    setDeletingCategory(null);
  };

  return (
    <div className="space-y-6 w-full max-w-[1600px] mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/super/blogs"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="size-3" /> Back to Articles
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Folders className="size-5" />
            </span>
            Blog Categories
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Organize articles into thematic taxonomies, topics, and navigational hierarchies.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleOpenAdd} size="sm" className="gap-2 shadow-xs">
            <Plus className="size-4" /> Add Category
          </Button>
          <BreadcrumbNav
            items={[
              { label: "Dashboard", href: "/super" },
              { label: "Blog Insights", href: "/super/blogs" },
              { label: "Categories", href: "/super/blogs/categories" },
            ]}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/70 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories by name, slug or description..."
            className="pl-9 h-9 text-xs"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground self-end sm:self-auto">
          <span>Total: <strong>{categories.length}</strong> categories</span>
        </div>
      </div>

      {isLoadingCats ? (
        <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Loading blog categories...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center space-y-3">
            <Folders className="size-10 text-muted-foreground/40 mx-auto" />
            <h3 className="text-sm font-semibold">No categories found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {search ? "No categories matched your search criteria." : "Get started by creating your first blog category."}
            </p>
            <Button onClick={handleOpenAdd} size="sm" variant="outline" className="gap-2">
              <Plus className="size-3.5" /> Create Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((cat) => {
            const articleCount = categoryCounts[cat.name] || 0;
            return (
              <Card key={cat.id} className="group hover:border-primary/50 transition-all duration-200 shadow-2xs">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                        <span>{cat.name}</span>
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 font-mono font-normal">
                          {cat.slug}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-xs line-clamp-2">
                        {cat.description || "No description provided."}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => handleOpenEdit(cat)}
                        title="Edit Category"
                      >
                        <Edit className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeletingCategory(cat)}
                        title="Delete Category"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2 border-t border-border/40 mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="size-3.5 text-primary" />
                    <span><strong>{articleCount}</strong> {articleCount === 1 ? "article" : "articles"}</span>
                  </div>
                  <Link
                    to="/super/blogs"
                    search={{ category: cat.name } as any}
                    className="text-primary hover:underline font-medium text-[11px]"
                  >
                    View Articles →
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Create New Category"}</DialogTitle>
            <DialogDescription>
              Categories allow readers and authors to navigate articles by thematic topic.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="catName" className="text-xs font-semibold">Category Name *</Label>
              <Input
                id="catName"
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  if (!editingCategory) {
                    setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
                  }
                }}
                placeholder="e.g. Workforce AI"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="catSlug" className="text-xs font-semibold">Slug *</Label>
              <Input
                id="catSlug"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                placeholder="e.g. workforce-ai"
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="catDesc" className="text-xs font-semibold">Description</Label>
              <Textarea
                id="catDesc"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Brief summary of articles in this category..."
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saveCategoriesMutation.isPending} className="gap-1.5">
              {saveCategoriesMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
              {editingCategory ? "Save Changes" : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingCategory} onOpenChange={(o) => !o && setDeletingCategory(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="size-5" /> Delete Category
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingCategory?.name}</strong>? Articles assigned to this category will not be deleted, but will become uncategorized.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setDeletingCategory(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deletingCategory && handleDelete(deletingCategory)}
              disabled={saveCategoriesMutation.isPending}
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
