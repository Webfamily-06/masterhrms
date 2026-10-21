'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, unwrapArray } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
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
  Tag as TagIcon,
  ExternalLink,
  FolderPlus,
  Settings,
  Grid,
  List,
  Sparkles,
  Filter,
  RefreshCw,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  X,
  Globe,
  Sliders,
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  ListOrdered,
  Quote,
  Code,
  Link2,
} from 'lucide-react';
import type { CmsPage } from '@/app/super/cms/page';

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
}

const DEFAULT_CATEGORIES: BlogCategory[] = [
  { id: 'cat-1', name: 'ERP Systems', slug: 'erp-systems', description: 'Core ERP architecture, databases, and enterprise planning.' },
  { id: 'cat-2', name: 'Global Payroll & Tax', slug: 'global-payroll-tax', description: 'Automated payroll calculations, statutory deductions, and cross-border pay runs.' },
  { id: 'cat-3', name: 'Workforce AI', slug: 'workforce-ai', description: 'Generative AI, talent analytics, and automated decision workflows.' },
  { id: 'cat-4', name: 'Supply Chain & Operations', slug: 'supply-chain-operations', description: 'Procurement, inventory tracking, and warehouse logistics.' },
  { id: 'cat-5', name: 'Compliance & HRMS', slug: 'compliance-hrms', description: 'Labor laws, audits, privacy standards, and statutory filings.' },
  { id: 'cat-6', name: 'Financial Ledgers', slug: 'financial-ledgers', description: 'Double-entry ledgers, reconciliation, and automated invoicing.' },
];

const DEFAULT_TAGS: BlogTag[] = [
  { id: 'tag-1', name: 'Payroll', slug: 'payroll' },
  { id: 'tag-2', name: 'AI', slug: 'ai' },
  { id: 'tag-3', name: 'Compliance', slug: 'compliance' },
  { id: 'tag-4', name: 'Automation', slug: 'automation' },
  { id: 'tag-5', name: 'Integration', slug: 'integration' },
  { id: 'tag-6', name: 'Security', slug: 'security' },
];

export function BlogManagerStudio() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // View & Filter State
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Dialog State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<CmsPage | null>(null);
  const [deletingBlog, setDeletingBlog] = useState<CmsPage | null>(null);

  // Category & Tag Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newTagName, setNewTagName] = useState('');

  // Blog Editor Form State
  const [form, setForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    category: 'ERP Systems',
    tags: [] as string[],
    author: 'Master ERP Editorial',
    readTime: '5 min read',
    coverImage: '',
    coverImageAlt: '',
    body: '',
    published: true,
    publishedAt: new Date().toISOString().split('T')[0],
    seoTitle: '',
    seoDescription: '',
    canonicalUrl: '',
    socialImage: '',
  });

  const [tagInput, setTagInput] = useState('');
  const [editorTab, setEditorTab] = useState<'content' | 'seo' | 'preview'>('content');

  // 1. Fetch Categories
  const { data: categories = DEFAULT_CATEGORIES } = useQuery<BlogCategory[]>({
    queryKey: ['cms-blog-categories'],
    queryFn: async () => {
      try {
        const page = await api.get('/cms/pages/system-blog-categories');
        if (page?.content && Array.isArray(page.content.categories)) {
          return page.content.categories.map((c: any) =>
            typeof c === 'string'
              ? { id: `cat-${c.toLowerCase().replace(/[^a-z0-9]/g, '-')}`, name: c, slug: c.toLowerCase().replace(/[^a-z0-9]/g, '-') }
              : c
          );
        }
        return DEFAULT_CATEGORIES;
      } catch {
        return DEFAULT_CATEGORIES;
      }
    },
  });

  // 2. Fetch Tags
  const { data: tags = DEFAULT_TAGS } = useQuery<BlogTag[]>({
    queryKey: ['cms-blog-tags'],
    queryFn: async () => {
      try {
        const page = await api.get('/cms/pages/system-blog-tags');
        if (page?.content && Array.isArray(page.content.tags)) {
          return page.content.tags;
        }
        return DEFAULT_TAGS;
      } catch {
        return DEFAULT_TAGS;
      }
    },
  });

  // 3. Fetch Blogs from shared CMS Pages
  const { data: pages = [], isLoading, refetch } = useQuery<CmsPage[]>({
    queryKey: ['cms-pages'],
    queryFn: async () => {
      try {
        const list = await api.get('/cms/pages');
        return unwrapArray<CmsPage>(list);
      } catch {
        return [];
      }
    },
  });

  const blogs = useMemo(() => {
    return pages.filter(
      (p: any) =>
        (p.slug && p.slug.startsWith('blog-')) ||
        p.slug === 'resource-blogs' ||
        p.content?.category === 'Blogs' ||
        p.content?.category === 'ERP Systems'
    );
  }, [pages]);

  // Category Mutations
  const categoryMutation = useMutation({
    mutationFn: async (updated: BlogCategory[]) => {
      await api.put('/cms/pages/system-blog-categories', {
        title: 'System Blog Categories',
        content: { categories: updated },
        published: true,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-blog-categories'] });
      toast.success('Categories updated successfully!');
      setNewCatName('');
      setNewCatDesc('');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update categories'),
  });

  // Tag Mutations
  const tagMutation = useMutation({
    mutationFn: async (updated: BlogTag[]) => {
      await api.put('/cms/pages/system-blog-tags', {
        title: 'System Blog Tags',
        content: { tags: updated },
        published: true,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-blog-tags'] });
      toast.success('Tags updated successfully!');
      setNewTagName('');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update tags'),
  });

  // Blog Save Mutation
  const saveBlogMutation = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error('Blog title is required');

      const rawSlug = form.slug || form.title.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
      const cleanSlug = rawSlug.replace(/^blog-/, '');
      const finalSlug = `blog-${cleanSlug}`;

      const contentObj = {
        category: form.category,
        tags: form.tags,
        author: form.author,
        readTime: form.readTime,
        coverImage: form.coverImage,
        coverImageAlt: form.coverImageAlt,
        body: form.body,
        excerpt: form.excerpt,
        publishedAt: form.publishedAt,
        seoTitle: form.seoTitle || form.title,
        seoDescription: form.seoDescription || form.excerpt,
        canonicalUrl: form.canonicalUrl || `/blog/${cleanSlug}`,
        socialImage: form.socialImage || form.coverImage,
        hero: {
          title: form.title,
          eyebrow: form.category,
          subtitle: form.excerpt,
        },
      };

      if (editingBlog) {
        await api.put(`/cms/pages/${finalSlug}`, {
          title: form.title,
          slug: finalSlug,
          meta_description: form.seoDescription || form.excerpt,
          content: contentObj,
          published: form.published,
        });
      } else {
        await api.post('/cms/pages', {
          title: form.title,
          slug: finalSlug,
          meta_description: form.seoDescription || form.excerpt,
          content: contentObj,
          published: form.published,
        });
      }
    },
    onSuccess: () => {
      toast.success(editingBlog ? 'Blog article updated successfully!' : 'New blog created & published to CMS!');
      qc.invalidateQueries({ queryKey: ['super-dedicated-blogs'] });
      qc.invalidateQueries({ queryKey: ['cms-pages'] });
      qc.invalidateQueries({ queryKey: ['public-resources-articles'] });
      setIsEditorOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Blog Delete Mutation
  const deleteBlogMutation = useMutation({
    mutationFn: async (slug: string) => {
      await api.delete(`/cms/pages/${slug}`);
    },
    onSuccess: () => {
      toast.success('Blog post deleted successfully');
      qc.invalidateQueries({ queryKey: ['super-dedicated-blogs'] });
      qc.invalidateQueries({ queryKey: ['cms-pages'] });
      qc.invalidateQueries({ queryKey: ['public-resources-articles'] });
      setDeletingBlog(null);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete blog'),
  });

  // Filter Blogs
  const filteredBlogs = useMemo(() => {
    return blogs.filter((b) => {
      const cat = b.content?.category || 'ERP Systems';
      const catMatch = selectedCat === 'all' || cat === selectedCat;
      const statusMatch =
        selectedStatus === 'all' ||
        (selectedStatus === 'published' && b.published) ||
        (selectedStatus === 'draft' && !b.published);
      const postTags: string[] = Array.isArray(b.content?.tags) ? b.content.tags : [];
      const tagMatch = selectedTag === 'all' || postTags.includes(selectedTag);
      const searchLower = search.toLowerCase();
      const searchMatch =
        !search ||
        b.title.toLowerCase().includes(searchLower) ||
        b.slug.toLowerCase().includes(searchLower) ||
        (b.content?.excerpt || '').toLowerCase().includes(searchLower) ||
        (b.content?.author || '').toLowerCase().includes(searchLower);

      return catMatch && statusMatch && tagMatch && searchMatch;
    });
  }, [blogs, selectedCat, selectedStatus, selectedTag, search]);

  // Paginated Blogs
  const paginatedBlogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBlogs.slice(start, start + pageSize);
  }, [filteredBlogs, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredBlogs.length / pageSize) || 1;

  // Handlers
  function handleOpenCreate() {
    setEditingBlog(null);
    setForm({
      title: '',
      slug: '',
      excerpt: '',
      category: categories[0]?.name || 'ERP Systems',
      tags: [],
      author: 'Master ERP Editorial',
      readTime: '5 min read',
      coverImage: '',
      coverImageAlt: '',
      body: '',
      published: true,
      publishedAt: new Date().toISOString().split('T')[0],
      seoTitle: '',
      seoDescription: '',
      canonicalUrl: '',
      socialImage: '',
    });
    setTagInput('');
    setEditorTab('content');
    setIsEditorOpen(true);
  }

  function handleOpenEdit(blog: CmsPage) {
    setEditingBlog(blog);
    const c = blog.content || {};
    setForm({
      title: blog.title,
      slug: blog.slug.replace(/^blog-/, ''),
      excerpt: c.excerpt || blog.meta_description || c.hero?.subtitle || '',
      category: c.category || categories[0]?.name || 'ERP Systems',
      tags: Array.isArray(c.tags) ? c.tags : [],
      author: c.author || 'Master ERP Editorial',
      readTime: c.readTime || '5 min read',
      coverImage: c.coverImage || '',
      coverImageAlt: c.coverImageAlt || blog.title,
      body: c.body || '',
      published: blog.published,
      publishedAt: c.publishedAt || new Date().toISOString().split('T')[0],
      seoTitle: c.seoTitle || blog.title,
      seoDescription: c.seoDescription || blog.meta_description || '',
      canonicalUrl: c.canonicalUrl || `/blog/${blog.slug.replace(/^blog-/, '')}`,
      socialImage: c.socialImage || c.coverImage || '',
    });
    setTagInput('');
    setEditorTab('content');
    setIsEditorOpen(true);
  }

  function handleAddTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (!form.tags.includes(trimmed)) {
      setForm((p) => ({ ...p, tags: [...p.tags, trimmed] }));
    }
    setTagInput('');
  }

  function handleRemoveTag(tag: string) {
    setForm((p) => ({ ...p, tags: p.tags.filter((t) => t !== tag) }));
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setForm((p) => ({ ...p, coverImage: base64 }));
      toast.success(`Image "${file.name}" uploaded successfully!`);
    };
    reader.readAsDataURL(file);
  }

  function handleAddCategorySubmit() {
    const trimmed = newCatName.trim();
    if (!trimmed) return toast.error('Category name required');
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      return toast.error('Category already exists');
    }
    const newCat: BlogCategory = {
      id: `cat-${Date.now()}`,
      name: trimmed,
      slug: trimmed.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      description: newCatDesc.trim() || undefined,
    };
    categoryMutation.mutate([...categories, newCat]);
  }

  function handleDeleteCategorySubmit(cat: BlogCategory) {
    // Safety check: count posts assigned to this category
    const assignedCount = blogs.filter((b) => (b.content?.category || 'ERP Systems') === cat.name).length;
    if (assignedCount > 0) {
      return toast.error(
        `Cannot delete category "${cat.name}". ${assignedCount} blog post(s) are assigned to it. Reassign them first.`
      );
    }
    categoryMutation.mutate(categories.filter((c) => c.id !== cat.id));
  }

  function handleAddTagSubmit() {
    const trimmed = newTagName.trim();
    if (!trimmed) return toast.error('Tag name required');
    if (tags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
      return toast.error('Tag already exists');
    }
    const newT: BlogTag = {
      id: `tag-${Date.now()}`,
      name: trimmed,
      slug: trimmed.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    };
    tagMutation.mutate([...tags, newT]);
  }

  function handleInsertMarkdown(prefix: string, suffix: string = '') {
    const textarea = document.getElementById('blog-editor-body') as HTMLTextAreaElement | null;
    if (!textarea) {
      setForm((p) => ({ ...p, body: p.body + `${prefix}text${suffix}` }));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end) || 'text';
    const replacement = `${prefix}${selectedText}${suffix}`;
    const newBody = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
    setForm((p) => ({ ...p, body: newBody }));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 10);
  }

  return (
    <div className="space-y-6">
      {/* Top Action Toolbar */}
      <Card className="p-3.5 border-border/70 shadow-xs bg-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left Toolbar Controls: Metrics & Filters */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="h-9 px-3 rounded-lg border border-border/70 bg-muted/40 flex items-center gap-2 text-xs font-semibold text-foreground shrink-0 shadow-2xs">
              <BookOpen className="size-4 text-primary shrink-0" />
              <span>{filteredBlogs.length} Articles</span>
            </div>

            <div className="h-5 w-px bg-border/70 hidden sm:block shrink-0" />

            {/* Category Filter */}
            <Select value={selectedCat} onValueChange={(v) => { setSelectedCat(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-9 text-xs w-[160px] rounded-lg border-border/70 bg-background shadow-2xs">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={(v: any) => { setSelectedStatus(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-9 text-xs w-[130px] rounded-lg border-border/70 bg-background shadow-2xs">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Drafts</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-border/70 rounded-lg p-0.5 bg-muted/30 shadow-2xs">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="size-7.5 rounded-md"
                onClick={() => setViewMode('list')}
                title="List View"
                aria-label="List View"
              >
                <List className="size-3.5" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="size-7.5 rounded-md"
                onClick={() => setViewMode('grid')}
                title="Grid View"
                aria-label="Grid View"
              >
                <Grid className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* Right Toolbar Controls: Search & Primary Actions */}
          <div className="flex items-center gap-2 flex-wrap justify-start lg:justify-end">
            <div className="relative flex-1 sm:w-64 min-w-[200px]">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search articles..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="h-9 pl-9 pr-8 text-xs rounded-lg border-border/70 bg-background focus-visible:ring-1 focus-visible:ring-primary shadow-2xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); setCurrentPage(1); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground size-4 flex items-center justify-center rounded-xs"
                  aria-label="Clear search"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCategoryModalOpen(true)}
              className="h-9 text-xs font-medium gap-1.5 rounded-lg border-border/70 hover:bg-muted/60 shadow-2xs"
            >
              <FolderPlus className="size-3.5" /> Categories
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTagModalOpen(true)}
              className="h-9 text-xs font-medium gap-1.5 rounded-lg border-border/70 hover:bg-muted/60 shadow-2xs"
            >
              <TagIcon className="size-3.5" /> Tags
            </Button>

            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="h-9 text-xs font-semibold gap-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs px-4"
            >
              <Plus className="size-3.5" /> Create Article
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Content: List or Grid */}
      {isLoading ? (
        <div className="py-24 grid place-items-center bg-card rounded-xl border border-border/60">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Loading articles from CMS...</p>
          </div>
        </div>
      ) : paginatedBlogs.length === 0 ? (
        <Card className="p-16 text-center text-muted-foreground border border-border/70">
          <BookOpen className="size-10 mx-auto mb-3 opacity-30 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">No blog articles found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {search || selectedCat !== 'all' || selectedStatus !== 'all'
              ? 'No articles match your active search and filter criteria. Try clearing filters.'
              : 'Start building your platform blog library by creating your first article.'}
          </p>
          <div className="flex items-center justify-center gap-2 mt-5">
            {(search || selectedCat !== 'all' || selectedStatus !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setSearch(''); setSelectedCat('all'); setSelectedStatus('all'); }}
                className="h-9 text-xs"
              >
                Clear Filters
              </Button>
            )}
            <Button size="sm" onClick={handleOpenCreate} className="h-9 text-xs gap-1.5">
              <Plus className="size-3.5" /> Create Article
            </Button>
          </div>
        </Card>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedBlogs.map((post) => {
              const c = post.content || {};
              const cleanSlug = post.slug.replace(/^blog-/, '');
              const publicUrl = `/blog/${cleanSlug}`;

              return (
                <Card key={post.id} className="overflow-hidden border border-border/70 flex flex-col justify-between hover:shadow-md transition-shadow bg-card">
                  <div>
                    <div className="h-44 bg-secondary/30 relative overflow-hidden flex items-center justify-center border-b border-border/50">
                      {c.coverImage ? (
                        <img
                          src={c.coverImage}
                          alt={c.coverImageAlt || post.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-muted-foreground flex flex-col items-center gap-1.5">
                          <ImageIcon className="size-8 opacity-40" />
                          <span className="text-[10px] font-medium">No Cover Image</span>
                        </div>
                      )}
                      <Badge
                        variant={post.published ? 'default' : 'outline'}
                        className={`absolute top-2.5 right-2.5 text-[10px] font-semibold tracking-wider ${
                          post.published
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-background/90 text-muted-foreground'
                        }`}
                      >
                        {post.published ? 'Live' : 'Draft'}
                      </Badge>
                    </div>

                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] font-medium border-primary/20 bg-primary/5 text-primary">
                          {c.category || 'ERP Systems'}
                        </Badge>
                        <span className="flex items-center gap-1 text-[11px]">
                          <Clock className="size-3" /> {c.readTime || '5 min read'}
                        </span>
                      </div>

                      <h3
                        onClick={() => handleOpenEdit(post)}
                        className="font-bold text-sm line-clamp-2 text-foreground hover:text-primary transition-colors cursor-pointer pt-1"
                      >
                        {post.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {c.excerpt || post.meta_description || 'No summary excerpt provided.'}
                      </p>
                    </CardContent>
                  </div>

                  <div className="p-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground bg-muted/20">
                    <span className="truncate max-w-[120px] font-mono text-[10px] text-muted-foreground/80">/{cleanSlug}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                        onClick={() => window.open(publicUrl, '_blank')}
                        title="View Live Page"
                        aria-label="View Live Page"
                      >
                        <ExternalLink className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary"
                        onClick={() => handleOpenEdit(post)}
                        title="Edit Article"
                        aria-label="Edit Article"
                      >
                        <Edit className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-lg hover:bg-rose-500/10 text-rose-500 hover:text-rose-600"
                        onClick={() => setDeletingBlog(post)}
                        title="Delete Article"
                        aria-label="Delete Article"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Grid View Pagination */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 px-1">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredBlogs.length)} of {filteredBlogs.length} articles
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="h-8 gap-1 text-xs"
                >
                  <ChevronLeft className="size-3.5" /> Previous
                </Button>
                <span className="px-2 font-mono text-xs">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="h-8 gap-1 text-xs"
                >
                  Next <ChevronRight className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* LIST / TABLE VIEW */
        <Card className="border border-border/70 shadow-xs overflow-hidden bg-card">
          <div className="overflow-x-auto min-h-[300px] flex flex-col justify-between">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 font-semibold border-b border-border/70 text-[11px] text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3 pl-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Article Title & Slug</th>
                  <th className="py-3 px-4 w-44">Category & Tags</th>
                  <th className="py-3 px-4 w-32 text-center">Status</th>
                  <th className="py-3 px-4 w-40">Author & Date</th>
                  <th className="py-3 px-4 pr-5 w-32 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {paginatedBlogs.map((post, idx) => {
                  const c = post.content || {};
                  const cleanSlug = post.slug.replace(/^blog-/, '');
                  const publicUrl = `/blog/${cleanSlug}`;

                  return (
                    <tr key={post.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="py-3.5 px-3 pl-4 text-center font-mono text-muted-foreground align-middle">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg bg-secondary/40 border border-border/60 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                            {c.coverImage ? (
                              <img src={c.coverImage} alt={post.title} className="w-full h-full object-cover" />
                            ) : (
                              <BookOpen className="size-4 opacity-40 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div
                              onClick={() => handleOpenEdit(post)}
                              className="font-semibold text-foreground text-xs hover:text-primary transition-colors cursor-pointer line-clamp-1"
                            >
                              {post.title}
                            </div>
                            <div className="text-[11px] text-muted-foreground/80 font-mono truncate max-w-sm mt-0.5">
                              /blog/{cleanSlug}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-middle">
                        <Badge variant="outline" className="text-[10px] font-medium border-primary/20 bg-primary/5 text-primary">
                          {c.category || 'ERP Systems'}
                        </Badge>
                        {Array.isArray(c.tags) && c.tags.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {c.tags.slice(0, 3).map((t: string) => (
                              <span key={t} className="text-[9px] bg-muted px-1.5 py-0.5 rounded-md font-mono text-muted-foreground border border-border/40">
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center align-middle">
                        <Badge
                          variant={post.published ? 'default' : 'outline'}
                          className={`text-[10px] font-semibold inline-flex items-center gap-1.5 ${
                            post.published
                              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                              : 'bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              post.published ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                          />
                          {post.published ? 'Published' : 'Draft'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground text-[11px] align-middle">
                        <div className="font-medium text-foreground">{c.author || 'Editorial Team'}</div>
                        <div className="text-[10px] opacity-70 flex items-center gap-1 mt-0.5">
                          <Calendar className="size-2.5" />
                          {c.publishedAt || (post.created_at ? new Date(post.created_at).toLocaleDateString() : '—')}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 pr-5 text-right align-middle">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                            onClick={() => window.open(publicUrl, '_blank')}
                            title="Open Live Public Route"
                            aria-label="Open Live Public Route"
                          >
                            <ExternalLink className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary"
                            onClick={() => handleOpenEdit(post)}
                            title="Edit Blog"
                            aria-label="Edit Blog"
                          >
                            <Edit className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg hover:bg-rose-500/10 text-rose-500 hover:text-rose-600"
                            onClick={() => setDeletingBlog(post)}
                            title="Delete Blog"
                            aria-label="Delete Blog"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Persistent Table Footer */}
            <div className="border-t border-border/70 p-3 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, filteredBlogs.length)} of {filteredBlogs.length} articles
              </span>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="h-8 gap-1 text-xs"
                  >
                    <ChevronLeft className="size-3.5" /> Previous
                  </Button>
                  <span className="px-2 font-mono text-xs">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="h-8 gap-1 text-xs"
                  >
                    Next <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ── Reference A: Blog Settings & Publication Editor Dialog ─── */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
          <DialogHeader className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <BookOpen className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                    {editingBlog ? 'Blog Settings — Edit Article' : 'Blog Settings — Create Article'}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Two-column publication studio for article details, media, taxonomies, and schedule.
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-end sm:self-auto">
                {/* Editor vs Live Preview Tab Switch */}
                <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5">
                  <button
                    type="button"
                    onClick={() => setEditorTab('content')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      editorTab === 'content'
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    Editor Layout
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTab('preview')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      editorTab === 'preview'
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    Live Preview
                  </button>
                </div>

                <Button
                  size="sm"
                  onClick={() => saveBlogMutation.mutate()}
                  disabled={saveBlogMutation.isPending}
                  className="gap-1.5 text-xs h-8"
                >
                  {saveBlogMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                  Save Article
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* TAB 1: REFERENCE A TWO-COLUMN EDITOR LAYOUT */}
          {editorTab === 'content' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-4">
              {/* ── LEFT COLUMN: WIDER EDITOR COLUMN (8 Cols) ─── */}
              <div className="lg:col-span-8 space-y-6">
                {/* Card 1: Blog Details Card */}
                <Card className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs rounded-xl space-y-5">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Blog Details
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Configure title, permalink slug, rich body content, and cover assets.
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[11px] font-mono">
                      Markdown Enabled
                    </Badge>
                  </div>

                  {/* Blog Title */}
                  <div className="space-y-1.5">
                    <Label htmlFor="blog-title-input" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Blog Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="blog-title-input"
                      value={form.title}
                      onChange={(e) => {
                        const title = e.target.value;
                        setForm((p) => ({
                          ...p,
                          title,
                          slug: p.slug || title.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, ''),
                        }));
                      }}
                      placeholder="e.g. 5 AI Skills Transforming Enterprise Payroll & Statutory Compliance"
                      className="h-10 text-sm font-medium border-slate-200 dark:border-slate-800 focus-visible:ring-primary"
                    />
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Public URL preview:</span>
                      <span className="font-mono text-primary font-medium">/blog/{form.slug || 'your-slug-here'}</span>
                    </div>
                  </div>

                  {/* URL Slug */}
                  <div className="space-y-1.5">
                    <Label htmlFor="blog-slug-input" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Permalink Slug <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 px-3 h-9">
                      <span className="font-mono text-xs text-slate-500 shrink-0">https://masterhrms.com/blog/</span>
                      <input
                        id="blog-slug-input"
                        value={form.slug}
                        onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                        placeholder="ai-skills-enterprise-payroll"
                        className="bg-transparent border-0 outline-none w-full font-mono text-xs text-slate-900 dark:text-slate-100 pl-1"
                      />
                    </div>
                  </div>

                  {/* Rich-Text / Markdown Editor with Toolbar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="blog-editor-body" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Article Content (Rich-Text Markdown)
                      </Label>
                      <span className="text-[11px] text-slate-400">Word count: {form.body ? form.body.trim().split(/\s+/).length : 0}</span>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-background">
                      {/* Editor Toolbar */}
                      <div className="flex items-center gap-1 p-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 overflow-x-auto">
                        <button
                          type="button"
                          onClick={() => handleInsertMarkdown('**', '**')}
                          title="Bold"
                          className="h-7 w-7 rounded flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                          <Bold className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertMarkdown('*', '*')}
                          title="Italic"
                          className="h-7 w-7 rounded flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                          <Italic className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertMarkdown('~~', '~~')}
                          title="Strikethrough"
                          className="h-7 w-7 rounded flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                          <Strikethrough className="size-3.5" />
                        </button>

                        <div className="h-4 w-px bg-slate-200 dark:border-slate-800 mx-1 shrink-0" />

                        <button
                          type="button"
                          onClick={() => handleInsertMarkdown('# ', '')}
                          title="Heading 1"
                          className="h-7 w-7 rounded flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                          <Heading1 className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertMarkdown('## ', '')}
                          title="Heading 2"
                          className="h-7 w-7 rounded flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                          <Heading2 className="size-3.5" />
                        </button>

                        <div className="h-4 w-px bg-slate-200 dark:border-slate-800 mx-1 shrink-0" />

                        <button
                          type="button"
                          onClick={() => handleInsertMarkdown('1. ', '')}
                          title="Numbered List"
                          className="h-7 w-7 rounded flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                          <ListOrdered className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertMarkdown('> ', '')}
                          title="Quote"
                          className="h-7 w-7 rounded flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                          <Quote className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertMarkdown('```\n', '\n```')}
                          title="Code Block"
                          className="h-7 w-7 rounded flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                          <Code className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertMarkdown('[', '](https://)')}
                          title="Hyperlink"
                          className="h-7 w-7 rounded flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                          <Link2 className="size-3.5" />
                        </button>
                      </div>

                      {/* Content Area */}
                      <Textarea
                        id="blog-editor-body"
                        value={form.body}
                        onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                        rows={14}
                        placeholder="Write or paste your article content here in Markdown syntax (# Heading, **bold**, lists, code blocks, quotes)..."
                        className="border-0 shadow-none rounded-none font-mono text-xs leading-relaxed focus-visible:ring-0 p-3.5 resize-y bg-transparent"
                      />
                    </div>
                  </div>

                  {/* Cover Image Drop Zone */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <ImageIcon className="size-3.5 text-primary" /> Featured Cover Image
                      </span>
                      {form.coverImage && (
                        <button
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, coverImage: '' }))}
                          className="text-[11px] text-destructive hover:underline"
                        >
                          Remove image
                        </button>
                      )}
                    </Label>

                    {form.coverImage ? (
                      <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-900/5 group">
                        <img
                          src={form.coverImage}
                          alt="Cover Preview"
                          className="w-full h-48 object-cover transition-transform group-hover:scale-[1.01]"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs h-8 gap-1.5"
                          >
                            <Upload className="size-3.5" /> Replace Image
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="cursor-pointer border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-primary/50 transition-colors rounded-xl p-6 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col items-center justify-center text-center gap-2"
                      >
                        <div className="p-2.5 rounded-full bg-primary/10 text-primary">
                          <Upload className="size-5" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                            Click to upload or drag and drop featured image
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            PNG, JPG, or WebP up to 5MB (1200×630 recommended)
                          </p>
                        </div>
                      </div>
                    )}

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />

                    {/* Direct Image URL input */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[11px] text-slate-400 shrink-0">Or enter image URL:</span>
                      <Input
                        value={form.coverImage}
                        onChange={(e) => setForm((p) => ({ ...p, coverImage: e.target.value }))}
                        placeholder="https://images.unsplash.com/photo-..."
                        className="h-8 text-xs font-mono border-slate-200 dark:border-slate-800"
                      />
                    </div>
                  </div>

                  {/* Short Summary / Excerpt */}
                  <div className="space-y-1.5">
                    <Label htmlFor="blog-excerpt-input" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Summary / Excerpt
                    </Label>
                    <Textarea
                      id="blog-excerpt-input"
                      value={form.excerpt}
                      onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))}
                      rows={2}
                      placeholder="Brief 1-2 sentence synopsis shown on blog cards and search listings..."
                      className="text-xs border-slate-200 dark:border-slate-800 resize-none"
                    />
                  </div>
                </Card>
              </div>

              {/* ── RIGHT COLUMN: NARROWER SETTINGS COLUMN (4 Cols) ─── */}
              <div className="lg:col-span-4 space-y-5">
                {/* 1. Blog Status Card */}
                <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Blog Status
                    </h4>
                    <Badge
                      variant={form.published ? 'default' : 'secondary'}
                      className={`text-[10px] uppercase font-semibold tracking-wider ${
                        form.published ? 'bg-emerald-600 hover:bg-emerald-600 text-white' : ''
                      }`}
                    >
                      {form.published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="space-y-0.5">
                      <Label htmlFor="status-toggle-card" className="text-xs font-medium cursor-pointer">
                        Live Visibility
                      </Label>
                      <p className="text-[11px] text-slate-500">
                        {form.published ? 'Article is visible to everyone' : 'Only admins can view in preview'}
                      </p>
                    </div>
                    <Switch
                      id="status-toggle-card"
                      checked={form.published}
                      onCheckedChange={(val) => setForm((p) => ({ ...p, published: val }))}
                    />
                  </div>
                </Card>

                {/* 2. Category Card */}
                <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Category
                    </h4>
                    <span className="text-[11px] text-primary cursor-pointer hover:underline" onClick={() => setIsCategoryModalOpen(true)}>
                      + Manage
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <Label className="text-xs text-slate-600 dark:text-slate-400">Select Primary Category</Label>
                    <Select
                      value={form.category}
                      onValueChange={(val) => setForm((p) => ({ ...p, category: val }))}
                    >
                      <SelectTrigger className="h-9 text-xs border-slate-200 dark:border-slate-800 w-full">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.name} className="text-xs">
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </Card>

                {/* 3. Tags Card */}
                <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Tags
                    </h4>
                    <span className="text-[11px] text-slate-400">{form.tags.length} selected</span>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="flex flex-wrap items-center gap-1.5 min-h-[36px] p-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-800/40">
                      {form.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1 text-[11px] py-0.5 px-2 bg-primary/10 text-primary border-primary/20">
                          #{tag}
                          <X className="size-3 cursor-pointer hover:text-destructive" onClick={() => handleRemoveTag(tag)} />
                        </Badge>
                      ))}
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            handleAddTag(tagInput);
                          }
                        }}
                        placeholder="Add tag and hit Enter..."
                        className="border-0 shadow-none h-6 text-xs flex-1 min-w-[120px] focus-visible:ring-0 p-0 bg-transparent"
                      />
                    </div>

                    {/* Quick Suggestions from existing tags */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {tags.slice(0, 5).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleAddTag(t.name)}
                          className="text-[10px] px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                        >
                          +{t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* 4. Publish Schedule & Author Card */}
                <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs rounded-xl space-y-3">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Publish Schedule & Author
                    </h4>
                  </div>

                  <div className="space-y-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-primary" /> Publish Date
                      </Label>
                      <Input
                        type="date"
                        value={form.publishedAt}
                        onChange={(e) => setForm((p) => ({ ...p, publishedAt: e.target.value }))}
                        className="h-9 text-xs border-slate-200 dark:border-slate-800"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <User className="size-3.5 text-primary" /> Author / Byline
                      </Label>
                      <Input
                        value={form.author}
                        onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))}
                        placeholder="Master ERP Editorial"
                        className="h-9 text-xs border-slate-200 dark:border-slate-800"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <Clock className="size-3.5 text-primary" /> Estimated Read Time
                      </Label>
                      <Input
                        value={form.readTime}
                        onChange={(e) => setForm((p) => ({ ...p, readTime: e.target.value }))}
                        placeholder="e.g. 5 min read"
                        className="h-9 text-xs border-slate-200 dark:border-slate-800"
                      />
                    </div>
                  </div>
                </Card>

                {/* 5. SEO & Google Snippet Card */}
                <Card className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs rounded-xl space-y-3">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      SEO & Search Snippet
                    </h4>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600 dark:text-slate-400">SEO Meta Title</Label>
                      <Input
                        value={form.seoTitle}
                        onChange={(e) => setForm((p) => ({ ...p, seoTitle: e.target.value }))}
                        placeholder={form.title || 'Search title'}
                        className="h-9 text-xs border-slate-200 dark:border-slate-800"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600 dark:text-slate-400">Meta Description</Label>
                      <Textarea
                        value={form.seoDescription}
                        onChange={(e) => setForm((p) => ({ ...p, seoDescription: e.target.value }))}
                        rows={2}
                        placeholder="Snippet shown in search engines..."
                        className="text-xs border-slate-200 dark:border-slate-800 resize-none"
                      />
                    </div>

                    {/* Google SERP Preview Box */}
                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Google SERP Preview</p>
                      <p className="text-xs font-medium text-blue-600 dark:text-blue-400 truncate">
                        {form.seoTitle || form.title || 'Untitled Article'} | MASTERHRMS
                      </p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
                        https://masterhrms.com/blog/{form.slug || 'slug'}
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                        {form.seoDescription || form.excerpt || 'Article summary will appear in Google search results here.'}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            /* TAB 2: LIVE FULL-PAGE PREVIEW */
            <div className="p-6 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 space-y-6 mt-4">
              <div className="space-y-3">
                <Badge variant="outline" className="capitalize text-xs">
                  {form.category}
                </Badge>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{form.title || 'Untitled Post'}</h1>
                <p className="text-sm text-muted-foreground italic">{form.excerpt}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground border-b pb-3 font-mono">
                  <span>Author: {form.author}</span>
                  <span>Read: {form.readTime}</span>
                  <span>Date: {form.publishedAt}</span>
                </div>
              </div>

              {form.coverImage && (
                <div className="w-full h-64 rounded-xl overflow-hidden border">
                  <img src={form.coverImage} alt={form.title} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="prose dark:prose-invert max-w-none text-xs leading-relaxed whitespace-pre-line text-foreground/90">
                {form.body || 'Article content will render here...'}
              </div>
            </div>
          )}

          <DialogFooter className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-3">
            <Button variant="outline" onClick={() => setIsEditorOpen(false)} className="text-xs h-9">
              Cancel
            </Button>
            <Button
              onClick={() => saveBlogMutation.mutate()}
              disabled={saveBlogMutation.isPending}
              className="gap-1.5 text-xs h-9"
            >
              {saveBlogMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Save Article
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ─── */}
      <Dialog open={!!deletingBlog} onOpenChange={(open) => !open && setDeletingBlog(null)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="size-5" /> Delete Blog Article?
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Are you sure you want to permanently delete article &quot;{deletingBlog?.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeletingBlog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingBlog && deleteBlogMutation.mutate(deletingBlog.slug)}
              disabled={deleteBlogMutation.isPending}
            >
              {deleteBlogMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Category Manager Modal ─── */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="size-5 text-primary" /> Manage Blog Categories
            </DialogTitle>
            <DialogDescription className="text-xs">
              Create, view, and organize topics for your enterprise knowledge hub.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            {/* Add Category Form */}
            <div className="p-3 border rounded-lg bg-secondary/20 space-y-2">
              <Label className="font-semibold">Add New Category</Label>
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Category Name (e.g. AI Automation)"
                className="h-8 text-xs"
              />
              <Input
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                placeholder="Short Description (optional)"
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                onClick={handleAddCategorySubmit}
                disabled={categoryMutation.isPending}
                className="w-full h-8 text-xs gap-1.5"
              >
                <Plus className="size-3.5" /> Add Category
              </Button>
            </div>

            {/* Existing Categories List */}
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {categories.map((cat) => {
                const count = blogs.filter((b) => (b.content?.category || 'ERP Systems') === cat.name).length;
                return (
                  <div key={cat.id} className="flex items-center justify-between p-2 border rounded-md bg-card">
                    <div>
                      <div className="font-semibold text-foreground text-xs">{cat.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        slug: /{cat.slug} • {count} post{count !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                      onClick={() => handleDeleteCategorySubmit(cat)}
                      title="Delete Category"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setIsCategoryModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Tag Manager Modal ─── */}
      <Dialog open={isTagModalOpen} onOpenChange={setIsTagModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TagIcon className="size-5 text-primary" /> Manage Blog Tags
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add and maintain topic tags for cross-filtering articles.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="flex items-center gap-2">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="New tag name (e.g. Docker, Microservices)..."
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                onClick={handleAddTagSubmit}
                disabled={tagMutation.isPending}
                className="h-8 text-xs gap-1 shrink-0"
              >
                <Plus className="size-3.5" /> Add Tag
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-60 overflow-y-auto p-2 border rounded-lg bg-card">
              {tags.map((t) => (
                <Badge key={t.id} variant="secondary" className="gap-1.5 text-xs py-1">
                  #{t.name}
                  <X
                    className="size-3 cursor-pointer hover:text-destructive"
                    onClick={() => tagMutation.mutate(tags.filter((x) => x.id !== t.id))}
                  />
                </Badge>
              ))}
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setIsTagModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BlogManagerStudio;
