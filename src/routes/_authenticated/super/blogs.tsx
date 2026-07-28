import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
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
  Sparkles,
  Newspaper,
  Layers,
  ExternalLink,
  CheckCircle2,
  Calendar,
  User,
  Tag,
} from "lucide-react";
import type { CmsPage } from "@/routes/_authenticated/super/cms";

export const Route = createFileRoute("/_authenticated/super/blogs")({
  component: SuperBlogsManager,
});

const BLOG_CATEGORIES = [
  "All Categories",
  "ERP Systems",
  "Global Payroll & Tax",
  "Workforce AI",
  "Supply Chain & Inventory",
  "Case Studies",
  "Compliance & HRMS",
];

function SuperBlogsManager() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("All Categories");

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<CmsPage | null>(null);
  const [deletingBlog, setDeletingBlog] = useState<CmsPage | null>(null);

  // Form State
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

  // Query All Blogs & Case Studies from Supabase cms_pages
  const { data: blogs, isLoading, refetch } = useQuery({
    queryKey: ["super-blogs-manager"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_pages")
        .select("*")
        .or("slug.ilike.blog-%,slug.ilike.case-study-%,slug.eq.resource-blogs,slug.eq.resource-case-studies")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as CmsPage[]) || [];
    },
  });

  // Filter Blogs by Search & Category
  const filteredBlogs = useMemo(() => {
    if (!blogs) return [];
    return blogs.filter((b) => {
      const cat = b.content?.category || (b.slug.includes("case-study") ? "Case Studies" : "ERP Systems");
      const catMatch = selectedCat === "All Categories" || cat === selectedCat;
      const searchMatch =
        !search ||
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.slug.toLowerCase().includes(search.toLowerCase());
      return catMatch && searchMatch;
    });
  }, [blogs, selectedCat, search]);

  // Create / Update Blog Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.title || !form.slug) throw new Error("Title and slug are required");

      const finalSlug = form.slug.startsWith("blog-") || form.slug.startsWith("case-study-")
        ? form.slug
        : form.category === "Case Studies"
        ? `case-study-${form.slug}`
        : `blog-${form.slug}`;

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
        sections: [
          { title: "Key Highlights", body: form.body.slice(0, 200) + "..." }
        ]
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
      toast.success(editingBlog ? "Blog article updated!" : "New blog post published!");
      setIsCreateOpen(false);
      setEditingBlog(null);
      resetForm();
      qc.invalidateQueries({ queryKey: ["super-blogs-manager"] });
      qc.invalidateQueries({ queryKey: ["cms-pages"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Delete Blog Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deletingBlog) return;
      const { error } = await supabase.from("cms_pages").delete().eq("id", deletingBlog.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Blog post deleted");
      setDeletingBlog(null);
      qc.invalidateQueries({ queryKey: ["super-blogs-manager"] });
      qc.invalidateQueries({ queryKey: ["cms-pages"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function resetForm() {
    setForm({
      title: "",
      slug: "",
      category: "ERP Systems",
      author: "Master ERP Editorial Team",
      coverImage: "",
      excerpt: "",
      body: "",
      published: true,
    });
  }

  function handleOpenEdit(b: CmsPage) {
    setEditingBlog(b);
    setForm({
      title: b.title,
      slug: b.slug,
      category: b.content?.category || (b.slug.includes("case-study") ? "Case Studies" : "ERP Systems"),
      author: b.content?.author || "Master ERP Editorial Team",
      coverImage: b.content?.coverImage || "",
      excerpt: b.meta_description || b.content?.hero?.subtitle || "",
      body: b.content?.body || "",
      published: b.published,
    });
    setIsCreateOpen(true);
  }

  function handleTitleChange(val: string) {
    const autoSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    setForm((prev) => ({
      ...prev,
      title: val,
      slug: prev.category === "Case Studies" ? `case-study-${autoSlug}` : `blog-${autoSlug}`,
    }));
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Blogs & Case Studies Manager</h1>
            <Badge variant="secondary" className="gap-1 text-xs">
              <BookOpen className="size-3 text-primary" /> Editorial Portal
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Create, edit, publish, and map public articles, technical insights, and enterprise case studies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setEditingBlog(null);
              setIsCreateOpen(true);
            }}
            className="gap-2 bg-primary"
          >
            <Plus className="size-4" /> Add New Blog / Case Study
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search blogs, case studies, or tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {BLOG_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  selectedCat === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-secondary text-muted-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Blog Cards Grid */}
      {isLoading ? (
        <div className="py-24 grid place-items-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : filteredBlogs.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          No blogs or case studies found matching your filters.
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredBlogs.map((b) => {
            const cat = b.content?.category || (b.slug.includes("case-study") ? "Case Studies" : "ERP Systems");
            const author = b.content?.author || "Editorial Team";
            const dateStr = b.updated_at ? new Date(b.updated_at).toLocaleDateString() : "Recent";

            return (
              <Card key={b.id} className="hover:border-primary/60 transition-all flex flex-col justify-between group">
                <CardHeader className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] font-mono bg-secondary/50">
                      {cat}
                    </Badge>
                    <Badge
                      variant={b.published ? "default" : "outline"}
                      className={b.published ? "bg-emerald-600 text-white text-[10px]" : "text-muted-foreground text-[10px]"}
                    >
                      {b.published ? "Live" : "Draft"}
                    </Badge>
                  </div>

                  <div>
                    <CardTitle className="text-base group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                      {b.title}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1.5 line-clamp-2 leading-relaxed">
                      {b.meta_description || b.content?.hero?.subtitle || "No excerpt provided."}
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-0 space-y-4">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t pt-3 font-mono">
                    <span className="flex items-center gap-1"><User className="size-3 text-primary" /> {author}</span>
                    <span className="flex items-center gap-1"><Calendar className="size-3" /> {dateStr}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t pt-3">
                    <a
                      href={`/p/${b.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1 font-mono"
                    >
                      /p/{b.slug} <ExternalLink className="size-3" />
                    </a>

                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(b)} className="h-7 px-2 text-xs">
                        <Edit className="size-3.5 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeletingBlog(b)} className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10">
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

      {/* Create / Edit Blog Dialog Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="size-5 text-primary" /> {editingBlog ? "Edit Blog Post" : "Create New Blog / Case Study"}
            </DialogTitle>
            <DialogDescription>
              Publish articles to the CMS blog directory with rich markdown & section highlights.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Article Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. AI-Powered Payroll Trends"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Category</Label>
                <Select value={form.category} onValueChange={(val) => setForm((prev) => ({ ...prev, category: val }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ERP Systems">ERP Systems</SelectItem>
                    <SelectItem value="Global Payroll & Tax">Global Payroll & Tax</SelectItem>
                    <SelectItem value="Workforce AI">Workforce AI</SelectItem>
                    <SelectItem value="Supply Chain & Inventory">Supply Chain & Inventory</SelectItem>
                    <SelectItem value="Case Studies">Enterprise Case Studies</SelectItem>
                    <SelectItem value="Compliance & HRMS">Compliance & HRMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">URL Slug</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="blog-ai-payroll"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Author Name</Label>
                <Input
                  value={form.author}
                  onChange={(e) => setForm((prev) => ({ ...prev, author: e.target.value }))}
                  placeholder="Master ERP Editorial Team"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Excerpt / Meta Description (SEO)</Label>
              <Textarea
                value={form.excerpt}
                onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
                rows={2}
                placeholder="Short summary displayed on blog listings and search engines..."
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Main Article Body Content</Label>
              <Textarea
                value={form.body}
                onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
                rows={6}
                placeholder="Full article content text..."
                className="text-xs leading-relaxed font-sans"
              />
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.published}
                  onCheckedChange={(val) => setForm((prev) => ({ ...prev, published: val }))}
                  id="pub-toggle"
                />
                <Label htmlFor="pub-toggle" className="text-xs font-semibold cursor-pointer">
                  {form.published ? "Publish Immediately (Live)" : "Save as Draft"}
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {editingBlog ? "Save Blog Changes" : "Publish Article"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {deletingBlog && (
        <Dialog open={!!deletingBlog} onOpenChange={() => setDeletingBlog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <Trash2 className="size-5" /> Delete Blog Post?
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>"{deletingBlog.title}"</strong>?
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setDeletingBlog(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null} Delete Article
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
