import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  BookOpen,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Loader2,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Calendar,
  User,
  Tag,
  ExternalLink,
  FolderPlus,
  Settings,
} from "lucide-react";
import type { CmsPage } from "@/routes/_authenticated/super/cms";

export const Route = createFileRoute("/_authenticated/super/blogs")({
  component: DedicatedBlogsManager,
  head: () => ({ meta: [{ title: "Blogs & Articles Manager — Super Admin" }] }),
});

const DEFAULT_BLOG_CATEGORIES = [
  "ERP Systems",
  "Global Payroll & Tax",
  "Workforce AI",
  "Supply Chain & Operations",
  "Compliance & HRMS",
  "Financial Ledgers",
];

function DedicatedBlogsManager() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("All Categories");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Category Dialog State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatInput, setNewCatInput] = useState("");

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<CmsPage | null>(null);

  // Dedicated Blog Form State
  const [form, setForm] = useState({
    title: "",
    slug: "",
    category: "ERP Systems",
    author: "Master ERP Editorial Team",
    coverImage: "",
    excerpt: "",
    body: "",
    published: true,
  });

  // 1. REALTIME QUERY: Fetch blog categories from Supabase cms_pages
  const { data: blogCategories = DEFAULT_BLOG_CATEGORIES } = useQuery({
    queryKey: ["realtime-blog-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-blog-categories").maybeSingle();
      if (data?.content && typeof data.content === "object" && "categories" in data.content) {
        return ((data.content as any).categories ?? DEFAULT_BLOG_CATEGORIES) as string[];
      }
      return DEFAULT_BLOG_CATEGORIES;
    },
  });

  // 2. REALTIME QUERY: Fetch all Blogs (slug starts with "blog-") from Supabase cms_pages
  const { data: blogs = [], isLoading } = useQuery({
    queryKey: ["super-dedicated-blogs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_pages")
        .select("*")
        .or("slug.ilike.blog-%,slug.eq.resource-blogs")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as CmsPage[]) || [];
    },
  });

  // Save Blog Categories Mutation
  async function persistCategories(updated: string[]) {
    const { error } = await supabase.from("cms_pages").upsert({
      slug: "system-blog-categories",
      title: "System Blog Categories",
      content: { categories: updated } as any,
      published: true,
    }, { onConflict: "slug" });
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["realtime-blog-categories"] });
  }

  // Create Category Handler
  async function handleAddCategory() {
    if (!newCatInput.trim()) return toast.error("Category name required");
    const cat = newCatInput.trim();
    if (blogCategories.includes(cat)) return toast.error("Category already exists");

    try {
      await persistCategories([...blogCategories, cat]);
      toast.success(`Category "${cat}" created in real-time!`);
      setNewCatInput("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create category");
    }
  }

  // Delete Category Handler
  async function handleDeleteCategory(catToDelete: string) {
    if (!confirm(`Delete category "${catToDelete}"?`)) return;
    try {
      const updated = blogCategories.filter((c) => c !== catToDelete);
      await persistCategories(updated);
      if (selectedCat === catToDelete) setSelectedCat("All Categories");
      toast.success(`Category "${catToDelete}" deleted`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category");
    }
  }

  // Filter Blogs by Search & Category
  const filteredBlogs = useMemo(() => {
    return blogs.filter((b) => {
      const cat = b.content?.category || "ERP Systems";
      const catMatch = selectedCat === "All Categories" || cat === selectedCat;
      const searchMatch =
        !search ||
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.slug.toLowerCase().includes(search.toLowerCase());
      return catMatch && searchMatch;
    });
  }, [blogs, selectedCat, search]);

  // Handle Thumbnail Image File Upload
  function handleThumbnailUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64Url = ev.target?.result as string;
      setForm((prev) => ({ ...prev, coverImage: base64Url }));
      toast.success(`Blog thumbnail "${file.name}" uploaded successfully!`);
    };
    reader.readAsDataURL(file);
  }

  // Open Dialog for Creating New Blog
  function handleOpenCreate() {
    setEditingBlog(null);
    setForm({
      title: "",
      slug: "",
      category: blogCategories[0] || "ERP Systems",
      author: "Master ERP Editorial Team",
      coverImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80",
      excerpt: "",
      body: "",
      published: true,
    });
    setIsCreateOpen(true);
  }

  // Open Dialog for Editing Existing Blog
  function handleOpenEdit(blog: CmsPage) {
    setEditingBlog(blog);
    setForm({
      title: blog.title,
      slug: blog.slug.replace(/^blog-/, ""),
      category: blog.content?.category || blogCategories[0] || "ERP Systems",
      author: blog.content?.author || "Master ERP Editorial Team",
      coverImage: blog.content?.coverImage || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80",
      excerpt: blog.meta_description || blog.content?.hero?.subtitle || "",
      body: blog.content?.body || "",
      published: blog.published,
    });
    setIsCreateOpen(true);
  }

  // Save Blog Mutation (Create / Update)
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Blog title is required");

      const cleanSlug = (form.slug || form.title.toLowerCase().replace(/[^a-z0-9-]/g, "-")).replace(/^blog-/, "");
      const finalSlug = `blog-${cleanSlug}`;

      const contentObj = {
        category: form.category,
        author: form.author,
        coverImage: form.coverImage,
        body: form.body,
        hero: {
          title: form.title,
          eyebrow: form.category,
          subtitle: form.excerpt,
        },
      };

      if (editingBlog) {
        const { error } = await supabase
          .from("cms_pages")
          .update({
            title: form.title,
            slug: finalSlug,
            meta_description: form.excerpt,
            content: contentObj as never,
            published: form.published,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingBlog.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("cms_pages")
          .insert({
            title: form.title,
            slug: finalSlug,
            meta_description: form.excerpt,
            content: contentObj as never,
            published: form.published,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingBlog ? "Blog article updated in real-time!" : "New Blog created & published to CMS!");
      qc.invalidateQueries({ queryKey: ["super-dedicated-blogs"] });
      qc.invalidateQueries({ queryKey: ["public-resources-articles"] });
      setIsCreateOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Delete Blog Handler
  async function handleDeleteBlog(id: string, title: string) {
    if (!confirm(`Are you sure you want to delete blog "${title}"?`)) return;
    try {
      const { error } = await supabase.from("cms_pages").delete().eq("id", id);
      if (error) throw error;
      toast.success("Blog post deleted from CMS");
      qc.invalidateQueries({ queryKey: ["super-dedicated-blogs"] });
      qc.invalidateQueries({ queryKey: ["public-resources-articles"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete blog");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Blogs & Articles Manager</h1>
            <Badge variant="secondary" className="gap-1 text-xs font-mono">
              <BookOpen className="size-3 text-primary" /> Dedicated Blog CMS
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Create blog articles, manage custom blog categories, upload thumbnails, and publish to CMS.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsCategoryModalOpen(true)} className="gap-1.5 text-xs">
            <FolderPlus className="size-4 text-primary" /> Manage Categories
          </Button>

          <Button size="sm" onClick={handleOpenCreate} className="gap-2 bg-primary font-bold">
            <Plus className="size-4" /> Create New Blog Article
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-4 rounded-2xl border shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search blogs by title or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <Select value={selectedCat} onValueChange={setSelectedCat}>
            <SelectTrigger className="h-9 text-xs w-[200px]">
              <SelectValue placeholder="Category filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Categories" className="text-xs">All Categories</SelectItem>
              {blogCategories.map((c) => (
                <SelectItem key={c} value={c} className="text-xs">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Blogs Cards Grid */}
      {isLoading ? (
        <div className="py-20 grid place-items-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : filteredBlogs.length === 0 ? (
        <Card className="p-12 text-center text-xs text-muted-foreground italic space-y-2">
          <BookOpen className="size-8 mx-auto opacity-30" />
          <p>No blog articles found. Click "Create New Blog Article" to write your first post.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBlogs.map((b) => {
            const cover =
              b.content?.coverImage ||
              "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80";

            return (
              <Card key={b.id} className="flex flex-col justify-between overflow-hidden hover:border-primary/60 transition-all group">
                <div>
                  {/* Blog Thumbnail Image */}
                  <div className="h-44 relative bg-secondary/40 overflow-hidden">
                    <img src={cover} alt={b.title} className="size-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
                    <div className="absolute top-3 left-3">
                      <Badge variant="outline" className="text-[10px] font-mono bg-background/80 backdrop-blur-md">
                        {b.content?.category || "ERP Systems"}
                      </Badge>
                    </div>
                    <div className="absolute top-3 right-3">
                      <Badge variant={b.published ? "default" : "secondary"} className="text-[9px] font-mono">
                        {b.published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                  </div>

                  <CardHeader className="p-4 pb-2 space-y-1">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                      <span className="flex items-center gap-1"><User className="size-3 text-primary" /> {b.content?.author || "Master ERP"}</span>
                      <span>·</span>
                      <span>{b.updated_at ? new Date(b.updated_at).toLocaleDateString() : "Published"}</span>
                    </div>
                    <CardTitle className="text-base font-bold line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                      {b.title}
                    </CardTitle>
                    <CardDescription className="text-xs leading-relaxed line-clamp-2 mt-1">
                      {b.meta_description || b.content?.hero?.subtitle || "No summary provided."}
                    </CardDescription>
                  </CardHeader>
                </div>

                <CardContent className="p-4 pt-0">
                  <div className="pt-3 border-t flex items-center justify-between">
                    <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[140px]" title={b.slug}>
                      /{b.slug}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button size="icon" variant="ghost" className="size-7" onClick={() => handleOpenEdit(b)} title="Edit Article">
                        <Edit className="size-3.5 text-primary" />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => handleDeleteBlog(b.id, b.title)} title="Delete Article">
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* DEDICATED BLOG EDITOR MODAL */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="size-5 text-primary" /> {editingBlog ? "Edit Blog Article" : "Create New Blog Article"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Write and publish an enterprise blog article with thumbnail cover image.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Title & Slug */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Article Title *</Label>
                <Input
                  placeholder="e.g. Modern Cloud ERP Transformation Trends"
                  value={form.title}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      title: val,
                      slug: prev.slug || val.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                    }));
                  }}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">URL Slug (slug: blog-*)</Label>
                <div className="flex items-center">
                  <span className="bg-secondary px-2.5 py-1.5 rounded-l-md border border-r-0 font-mono text-[10px] text-muted-foreground">blog-</span>
                  <Input
                    placeholder="modern-erp-cloud"
                    value={form.slug}
                    onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                    className="rounded-l-none text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Category & Author */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Category</Label>
                <Select value={form.category} onValueChange={(val) => setForm((prev) => ({ ...prev, category: val }))}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {blogCategories.map((c) => (
                      <SelectItem key={c} value={c} className="text-xs">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Author Name</Label>
                <Input
                  placeholder="Master ERP Editorial Team"
                  value={form.author}
                  onChange={(e) => setForm((prev) => ({ ...prev, author: e.target.value }))}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Thumbnail Cover Image Upload */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Thumbnail / Cover Image</span>
                <span className="text-[10px] text-muted-foreground">Upload file or paste URL</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://images.unsplash.com/..."
                  value={form.coverImage}
                  onChange={(e) => setForm((prev) => ({ ...prev, coverImage: e.target.value }))}
                  className="text-xs flex-1"
                />
                <input type="file" ref={fileInputRef} accept="image/*" onChange={handleThumbnailUpload} className="hidden" />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5 shrink-0 text-xs">
                  <Upload className="size-3.5" /> Upload Thumbnail
                </Button>
              </div>

              {/* Thumbnail Image Preview Box */}
              {form.coverImage && (
                <div className="h-28 relative rounded-xl border bg-secondary/30 overflow-hidden mt-2">
                  <img src={form.coverImage} alt="Thumbnail Preview" className="size-full object-cover" />
                  <Badge variant="outline" className="absolute bottom-2 left-2 text-[9px] bg-background/80 font-mono">
                    Live Thumbnail Preview
                  </Badge>
                </div>
              )}
            </div>

            {/* Excerpt / Summary */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Excerpt / Summary (Meta Description)</Label>
              <Textarea
                placeholder="Short 2-line article summary shown on homepage & blog grid cards..."
                rows={2}
                value={form.excerpt}
                onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
                className="text-xs resize-none"
              />
            </div>

            {/* Article Content Body */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Full Blog Article Content (Markdown / HTML)</Label>
              <Textarea
                placeholder="Write the full blog article content here..."
                rows={6}
                value={form.body}
                onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
                className="text-xs leading-relaxed"
              />
            </div>

            {/* Published Status Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl border bg-secondary/30 pt-2">
              <div>
                <p className="font-bold text-xs">Publish to Public CMS</p>
                <p className="text-[11px] text-muted-foreground">Make this blog visible on public /resources and landing pages</p>
              </div>
              <Switch checked={form.published} onCheckedChange={(val) => setForm((prev) => ({ ...prev, published: val }))} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-primary font-bold gap-2">
              {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              {editingBlog ? "Save Changes" : "Publish Blog"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MANAGE BLOG CATEGORIES MODAL (CREATE & DELETE CATEGORY) */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="size-5 text-primary" /> Manage Blog Categories
            </DialogTitle>
            <DialogDescription className="text-xs">
              Create new categories or delete existing categories for blog articles.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Create Category Input */}
            <div className="flex gap-2">
              <Input
                placeholder="New Category Name (e.g. AI & Automation)"
                value={newCatInput}
                onChange={(e) => setNewCatInput(e.target.value)}
                className="text-xs flex-1"
              />
              <Button onClick={handleAddCategory} className="bg-primary font-bold text-xs shrink-0 gap-1">
                <Plus className="size-3.5" /> Add Category
              </Button>
            </div>

            {/* Existing Categories List */}
            <div className="space-y-1.5 border rounded-xl p-3 bg-secondary/20 max-h-56 overflow-y-auto">
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Active Categories ({blogCategories.length})</div>
              {blogCategories.map((cat) => (
                <div key={cat} className="flex items-center justify-between p-2 rounded-lg border bg-card text-xs">
                  <span className="font-semibold">{cat}</span>
                  <Button size="icon" variant="ghost" className="size-6 text-destructive" onClick={() => handleDeleteCategory(cat)} title="Delete Category">
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsCategoryModalOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
