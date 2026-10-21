'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, unwrapArray } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav';
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
  ArrowLeft,
  Save,
  CheckCircle2,
  Eye,
  Loader2,
  Upload,
  Image as ImageIcon,
  Calendar,
  User,
  Tag as TagIcon,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  RotateCw,
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link2,
  Eraser,
  Columns,
  Sparkles,
  X,
  AlertCircle,
  Clock,
  Layers,
  Globe,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeSlug from 'rehype-slug';
import { getResolvedPublicDomain, getResolvedPublicBlogUrl } from '@/lib/platform-domain';
import type { CmsPage } from '@/app/super/cms/page';
import type { BlogCategory, BlogTag } from '@/components/cms/blog-manager-studio';

interface DedicatedBlogEditorProps {
  articleId?: string;
  isNew?: boolean;
}

const DEFAULT_CATEGORIES: BlogCategory[] = [
  { id: 'cat-1', name: 'ERP Systems', slug: 'erp-systems', description: 'Core ERP architecture, databases, and enterprise planning.' },
  { id: 'cat-2', name: 'Global Payroll & Tax', slug: 'global-payroll-tax', description: 'Automated payroll calculations, statutory deductions, and cross-border pay runs.' },
  { id: 'cat-3', name: 'Workforce AI', slug: 'workforce-ai', description: 'Generative AI, talent analytics, and automated decision workflows.' },
  { id: 'cat-4', name: 'Supply Chain & Operations', slug: 'supply-chain-operations', description: 'Procurement, inventory tracking, and warehouse logistics.' },
  { id: 'cat-5', name: 'Compliance & HRMS', slug: 'compliance-hrms', description: 'Labor laws, audits, privacy standards, and statutory filings.' },
  { id: 'cat-6', name: 'Financial Ledgers', slug: 'financial-ledgers', description: 'Double-entry ledgers, reconciliation, and automated invoicing.' },
];

export function DedicatedBlogEditor({ articleId, isNew = false }: DedicatedBlogEditorProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // History state for undo/redo
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [copiedLink, setCopiedLink] = useState(false);
  const [editorView, setEditorView] = useState<'editor' | 'split' | 'preview'>('editor');

  // Form State
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
  const [resolvedDomain, setResolvedDomain] = useState('localhost:3000');

  useEffect(() => {
    setResolvedDomain(getResolvedPublicDomain());
  }, []);

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

  // 2. Fetch Article Data if Editing
  const {
    data: article,
    isLoading: isArticleLoading,
    isError: isArticleError,
  } = useQuery<CmsPage | null>({
    queryKey: ['cms-blog-article', articleId],
    queryFn: async () => {
      if (!articleId || isNew) return null;
      try {
        // Try dedicated by-id endpoint first
        const res = await api.get(`/cms/pages/by-id/${articleId}`).catch(async () => {
          return await api.get(`/cms/blogs/${articleId}`);
        });
        return res as CmsPage;
      } catch {
        // Fallback to slug search
        const pages = await api.get('/cms/pages');
        const list = unwrapArray<CmsPage>(pages);
        const match = list.find((p) => p.id === articleId || p.slug === articleId || p.slug === `blog-${articleId}`);
        if (!match) throw new Error('Article not found');
        return match;
      }
    },
    enabled: Boolean(articleId && !isNew),
  });

  // Sync article data into form
  useEffect(() => {
    if (article) {
      const c = article.content || {};
      const initialBody = c.body || c.richText || '';
      setForm({
        title: article.title || '',
        slug: article.slug.replace(/^blog-/, ''),
        excerpt: c.excerpt || article.meta_description || c.hero?.subtitle || '',
        category: c.category || categories[0]?.name || 'ERP Systems',
        tags: Array.isArray(c.tags) ? c.tags : [],
        author: c.author || 'Master ERP Editorial',
        readTime: c.readTime || '5 min read',
        coverImage: c.coverImage || '',
        coverImageAlt: c.coverImageAlt || article.title,
        body: initialBody,
        published: article.published ?? true,
        publishedAt: c.publishedAt || (article.created_at ? new Date(article.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
        seoTitle: c.seoTitle || article.title,
        seoDescription: c.seoDescription || article.meta_description || '',
        canonicalUrl: c.canonicalUrl || '',
        socialImage: c.socialImage || c.coverImage || '',
      });
      setHistory([initialBody]);
      setHistoryIndex(0);
    }
  }, [article, categories]);

  // Update body with history tracking
  const updateBody = (newBody: string, addToHistory = true) => {
    setForm((prev) => ({ ...prev, body: newBody }));
    if (addToHistory) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newBody);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      setForm((prev) => ({ ...prev, body: history[nextIndex] }));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setForm((prev) => ({ ...prev, body: history[nextIndex] }));
    }
  };

  // Rich-Text Toolbar Action Helper
  const handleInsertMarkdown = (prefix: string, suffix: string = '', defaultText: string = 'text') => {
    const textarea = textareaRef.current || (document.getElementById('blog-editor-body') as HTMLTextAreaElement | null);
    if (!textarea) {
      updateBody(form.body + `${prefix}${defaultText}${suffix}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end) || defaultText;
    const replacement = `${prefix}${selectedText}${suffix}`;
    const newBody = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
    updateBody(newBody);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 10);
  };

  const handleClearFormatting = () => {
    const textarea = textareaRef.current || (document.getElementById('blog-editor-body') as HTMLTextAreaElement | null);
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (start === end) return;
    const selectedText = textarea.value.substring(start, end);
    // Strip markdown symbols
    const cleaned = selectedText.replace(/[*_~`#>]/g, '');
    const newBody = textarea.value.substring(0, start) + cleaned + textarea.value.substring(end);
    updateBody(newBody);
  };

  // Tag Handling
  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (!form.tags.includes(trimmed)) {
      setForm((p) => ({ ...p, tags: [...p.tags, trimmed] }));
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setForm((p) => ({ ...p, tags: p.tags.filter((t) => t !== tag) }));
  };

  // Image Upload Handling
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image file must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setForm((p) => ({ ...p, coverImage: base64 }));
      toast.success(`Image "${file.name}" uploaded successfully!`);
    };
    reader.readAsDataURL(file);
  };

  // Save Mutation
  const saveArticleMutation = useMutation({
    mutationFn: async (overridePublished?: boolean) => {
      if (!form.title.trim()) throw new Error('Blog title is required');

      const rawSlug = form.slug || form.title.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
      const cleanSlug = rawSlug.replace(/^blog-/, '');
      const finalSlug = `blog-${cleanSlug}`;
      const isPublished = typeof overridePublished === 'boolean' ? overridePublished : form.published;

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
        canonicalUrl: form.canonicalUrl || getResolvedPublicBlogUrl(finalSlug),
        socialImage: form.socialImage || form.coverImage,
        hero: {
          title: form.title,
          eyebrow: form.category,
          subtitle: form.excerpt,
        },
      };

      if (!isNew && articleId) {
        // Update existing article by persistent ID
        await api.put(`/cms/pages/by-id/${articleId}`, {
          title: form.title,
          slug: finalSlug,
          metaDescription: form.seoDescription || form.excerpt,
          content: contentObj,
          published: isPublished,
        });
      } else {
        // Create new article with persistent UUID
        const res = await api.post('/cms/blogs', {
          title: form.title,
          slug: finalSlug,
          metaDescription: form.seoDescription || form.excerpt,
          content: contentObj,
          published: isPublished,
        });
        return res;
      }
    },
    onSuccess: (data: any) => {
      toast.success(isNew ? 'New blog article created successfully!' : 'Blog article updated successfully!');
      qc.invalidateQueries({ queryKey: ['cms-pages'] });
      qc.invalidateQueries({ queryKey: ['cms-blog-article', articleId] });
      qc.invalidateQueries({ queryKey: ['public-resources-articles'] });

      if (isNew && data?.id) {
        router.push(`/super/blogs/${data.id}/edit`);
      } else {
        router.push('/super/blogs');
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save blog article');
    },
  });

  const cleanSlug = (form.slug || form.title.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '')).replace(/^blog-/, '');
  const publicBlogUrl = getResolvedPublicBlogUrl(cleanSlug, { isDraft: !form.published });

  const copyPublicLink = () => {
    navigator.clipboard.writeText(publicBlogUrl);
    setCopiedLink(true);
    toast.success('Public URL copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Not Found State
  if (articleId && !isNew && isArticleError) {
    return (
      <div className="w-full max-w-[1200px] mx-auto py-16 px-4">
        <Card className="border-destructive/40 bg-card p-8 text-center space-y-4">
          <div className="size-14 mx-auto rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <AlertCircle className="size-7" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Blog Article Not Found</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            The article with ID <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{articleId}</code> does not exist or may have been deleted.
          </p>
          <div className="pt-2">
            <Button onClick={() => router.push('/super/blogs')} className="gap-2">
              <ArrowLeft className="size-4" /> Return to Blog Insights
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Loading State
  if (articleId && !isNew && isArticleLoading) {
    return (
      <div className="w-full max-w-[1200px] mx-auto py-24 px-4 text-center space-y-4">
        <Loader2 className="size-8 animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Loading article details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-[1600px] mx-auto pb-24">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/super/blogs')}
              className="gap-1.5 text-xs h-8 px-2.5"
            >
              <ArrowLeft className="size-3.5" /> Back to Articles
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span className="p-1 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <BookOpen className="size-4" />
              </span>
              {isNew ? 'Create New Article' : `Edit: ${form.title || 'Untitled'}`}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            {isNew
              ? 'Author a new editorial insight, technical playbook, or industry analysis.'
              : `Persistent ID: ${articleId || article?.id || 'Auto-assigned'}`}
          </p>
        </div>

        <BreadcrumbNav
          items={[
            { label: 'Dashboard', href: '/super' },
            { label: 'CMS Studio', href: '/super/cms' },
            { label: 'Blogs & Insights', href: '/super/blogs' },
            { label: isNew ? 'New Article' : 'Edit Article' },
          ]}
        />
      </div>

      {/* Dynamic Domain Bar & Action Header */}
      <Card className="p-4 border-border/70 shadow-xs bg-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Badge variant="outline" className="font-mono text-xs gap-1.5 py-1 px-2.5 bg-muted/40">
              <Globe className="size-3.5 text-primary" />
              <span>Domain: {resolvedDomain}</span>
            </Badge>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono bg-muted/30 px-2.5 py-1 rounded-md border border-border/50">
              <span className="truncate max-w-[320px] sm:max-w-[450px]">{publicBlogUrl}</span>
              <button
                type="button"
                onClick={copyPublicLink}
                className="hover:text-foreground transition-colors p-0.5"
                title="Copy public link"
              >
                {copiedLink ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              </button>
            </div>

            <a
              href={publicBlogUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
            >
              <span>Open Public Page</span>
              <ExternalLink className="size-3" />
            </a>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push('/super/blogs')}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => saveArticleMutation.mutate(false)}
              disabled={saveArticleMutation.isPending}
              className="text-xs h-9"
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => saveArticleMutation.mutate(true)}
              disabled={saveArticleMutation.isPending}
              className="gap-2 text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
            >
              {saveArticleMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="size-3.5" />
              )}
              {isNew ? 'Publish Article' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Two-Column Editor Grid (Matches Reference Layout Standard) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Column (8 Cols): Blog Details & Rich Text Editor */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-border/70 shadow-xs bg-card">
            <CardHeader className="pb-4 border-b border-border/60">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <BookOpen className="size-4 text-primary" /> Blog Details
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Craft the article title, permalink slug, and formatted markdown body.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-5">
              {/* Blog Title */}
              <div className="space-y-1.5">
                <Label htmlFor="blog-title" className="text-xs font-semibold text-foreground">
                  Blog Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="blog-title"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Building Autonomous Multi-Country Payroll Systems"
                  className="text-sm font-semibold h-10"
                />
              </div>

              {/* Permalink Slug */}
              <div className="space-y-1.5">
                <Label htmlFor="blog-slug" className="text-xs font-semibold text-foreground">
                  Permalink Slug
                </Label>
                <div className="flex items-center rounded-lg border border-border/70 bg-muted/20 overflow-hidden focus-within:ring-2 focus-within:ring-primary/40">
                  <span className="px-3 py-2 text-xs font-mono text-muted-foreground bg-muted/40 border-r border-border/70 shrink-0">
                    {resolvedDomain}/blog/
                  </span>
                  <Input
                    id="blog-slug"
                    value={form.slug}
                    onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                    placeholder="autonomous-payroll-systems"
                    className="border-0 shadow-none focus-visible:ring-0 text-xs font-mono h-9 rounded-none"
                  />
                </div>
              </div>

              {/* Rich-Text Markdown Editor Section */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label htmlFor="blog-editor-body" className="text-xs font-semibold text-foreground">
                    Article Content (Markdown)
                  </Label>
                  <div className="flex items-center gap-1 border border-border/70 p-0.5 rounded-lg bg-muted/30">
                    <button
                      type="button"
                      onClick={() => setEditorView('editor')}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        editorView === 'editor' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Editor
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorView('split')}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        editorView === 'split' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Split View
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorView('preview')}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        editorView === 'preview' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Live Preview
                    </button>
                  </div>
                </div>

                {/* Rich-Text Toolbar */}
                <div className="flex items-center gap-1 p-1.5 rounded-t-lg border border-border/70 bg-muted/40 flex-wrap">
                  {/* Undo / Redo */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    title="Undo (Ctrl+Z)"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    title="Redo (Ctrl+Y)"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <RotateCw className="size-3.5" />
                  </Button>

                  <div className="h-4 w-px bg-border/80 mx-1" />

                  {/* Formatting: Bold, Italic, Strikethrough */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleInsertMarkdown('**', '**', 'bold text')}
                    title="Bold (**text**)"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <Bold className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleInsertMarkdown('*', '*', 'italic text')}
                    title="Italic (*text*)"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <Italic className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleInsertMarkdown('~~', '~~', 'strikethrough text')}
                    title="Strikethrough (~~text~~)"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <Strikethrough className="size-3.5" />
                  </Button>

                  <div className="h-4 w-px bg-border/80 mx-1" />

                  {/* Headings */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleInsertMarkdown('# ', '', 'Heading 1')}
                    title="Heading 1 (# text)"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <Heading1 className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleInsertMarkdown('## ', '', 'Heading 2')}
                    title="Heading 2 (## text)"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <Heading2 className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleInsertMarkdown('### ', '', 'Heading 3')}
                    title="Heading 3 (### text)"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <Heading3 className="size-3.5" />
                  </Button>

                  <div className="h-4 w-px bg-border/80 mx-1" />

                  {/* Lists */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleInsertMarkdown('- ', '', 'Bullet item')}
                    title="Unordered List (- text)"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <List className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleInsertMarkdown('1. ', '', 'Numbered item')}
                    title="Ordered List (1. text)"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <ListOrdered className="size-3.5" />
                  </Button>

                  <div className="h-4 w-px bg-border/80 mx-1" />

                  {/* Quotes, Code, Links */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleInsertMarkdown('> ', '', 'Quote text')}
                    title="Blockquote (> text)"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <Quote className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleInsertMarkdown('```\n', '\n```', 'code block')}
                    title="Code Block (```code```)"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <Code className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleInsertMarkdown('[', '](https://example.com)', 'Link Title')}
                    title="Insert Link ([text](url))"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <Link2 className="size-3.5" />
                  </Button>

                  <div className="h-4 w-px bg-border/80 mx-1" />

                  {/* Clear formatting */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleClearFormatting}
                    title="Clear Formatting"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  >
                    <Eraser className="size-3.5" />
                  </Button>
                </div>

                {/* Editor Content Area */}
                {editorView === 'editor' && (
                  <Textarea
                    id="blog-editor-body"
                    ref={textareaRef}
                    value={form.body}
                    onChange={(e) => updateBody(e.target.value)}
                    rows={18}
                    placeholder="Write your article in GitHub-flavored Markdown..."
                    className="rounded-t-none border-t-0 font-mono text-xs leading-relaxed focus-visible:ring-1 resize-y"
                  />
                )}

                {editorView === 'split' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-t-0 border-border/70 rounded-b-lg overflow-hidden">
                    <Textarea
                      id="blog-editor-body"
                      ref={textareaRef}
                      value={form.body}
                      onChange={(e) => updateBody(e.target.value)}
                      rows={18}
                      placeholder="Write markdown here..."
                      className="border-0 rounded-none font-mono text-xs leading-relaxed resize-none focus-visible:ring-0 border-r border-border/60"
                    />
                    <div className="p-4 bg-muted/10 overflow-y-auto max-h-[460px] prose dark:prose-invert prose-xs max-w-none">
                      {form.body ? (
                        <ReactMarkdown rehypePlugins={[rehypeSlug]}>{form.body}</ReactMarkdown>
                      ) : (
                        <p className="text-muted-foreground italic text-xs">Live markdown preview will appear here...</p>
                      )}
                    </div>
                  </div>
                )}

                {editorView === 'preview' && (
                  <div className="p-6 rounded-b-lg border border-t-0 border-border/70 bg-card overflow-y-auto min-h-[400px] max-h-[600px] prose dark:prose-invert prose-sm max-w-none">
                    {form.body ? (
                      <ReactMarkdown rehypePlugins={[rehypeSlug]}>{form.body}</ReactMarkdown>
                    ) : (
                      <p className="text-muted-foreground italic text-xs">No content to preview.</p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <span>Formatting: Markdown supported</span>
                  <span>{form.body.split(/\s+/).filter(Boolean).length} words • {form.body.length} characters</span>
                </div>
              </div>

              {/* Excerpt */}
              <div className="space-y-1.5 pt-2">
                <Label htmlFor="blog-excerpt" className="text-xs font-semibold text-foreground">
                  Summary / Excerpt
                </Label>
                <Textarea
                  id="blog-excerpt"
                  value={form.excerpt}
                  onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))}
                  rows={3}
                  placeholder="A concise synopsis displayed on article cards, search listings, and social previews."
                  className="text-xs resize-none"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Column (4 Cols): Settings & Organization */}
        <div className="lg:col-span-4 space-y-6">
          {/* 1. Publishing & Status Card */}
          <Card className="border-border/70 shadow-xs bg-card">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold text-foreground flex items-center justify-between">
                <span>Publishing & Status</span>
                <Badge variant={form.published ? 'default' : 'secondary'} className="text-[10px]">
                  {form.published ? 'Published' : 'Draft'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border/70 bg-muted/20">
                <div className="space-y-0.5">
                  <Label htmlFor="publish-status-toggle" className="text-xs font-semibold cursor-pointer">
                    Live Publication
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    {form.published ? 'Article is visible to the public' : 'Article is saved as an unpublished draft'}
                  </p>
                </div>
                <Switch
                  id="publish-status-toggle"
                  checked={form.published}
                  onCheckedChange={(checked) => setForm((p) => ({ ...p, published: checked }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="published-date" className="text-xs font-semibold text-foreground">
                  Publish Date
                </Label>
                <div className="relative">
                  <Input
                    id="published-date"
                    type="date"
                    value={form.publishedAt}
                    onChange={(e) => setForm((p) => ({ ...p, publishedAt: e.target.value }))}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="author-name" className="text-xs font-semibold text-foreground">
                  Author Name
                </Label>
                <Input
                  id="author-name"
                  value={form.author}
                  onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))}
                  placeholder="Master ERP Editorial"
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="read-time" className="text-xs font-semibold text-foreground">
                  Reading Time
                </Label>
                <Input
                  id="read-time"
                  value={form.readTime}
                  onChange={(e) => setForm((p) => ({ ...p, readTime: e.target.value }))}
                  placeholder="5 min read"
                  className="text-xs h-9"
                />
              </div>
            </CardContent>
          </Card>

          {/* 2. Cover Image Card */}
          <Card className="border-border/70 shadow-xs bg-card">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <ImageIcon className="size-4 text-primary" /> Featured Cover Image
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {form.coverImage ? (
                <div className="space-y-3">
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-border/70 bg-muted/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.coverImage}
                      alt={form.coverImageAlt || 'Cover image'}
                      className="size-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, coverImage: '' }))}
                      className="absolute top-2 right-2 p-1 rounded-md bg-black/70 text-white hover:bg-destructive transition-colors"
                      title="Remove image"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full text-xs h-8 gap-1.5"
                  >
                    <Upload className="size-3.5" /> Replace Image
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border/80 hover:border-primary/60 rounded-xl p-6 text-center cursor-pointer transition-colors bg-muted/10 space-y-2"
                >
                  <div className="size-10 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Upload className="size-5" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">Click to upload cover image</p>
                  <p className="text-[11px] text-muted-foreground">PNG, JPG, WebP up to 5MB</p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              <div className="space-y-1.5">
                <Label htmlFor="cover-url" className="text-xs font-semibold text-foreground">
                  Or Image URL
                </Label>
                <Input
                  id="cover-url"
                  value={form.coverImage}
                  onChange={(e) => setForm((p) => ({ ...p, coverImage: e.target.value }))}
                  placeholder="/images/blog/blog-1.jpg or https://..."
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cover-alt" className="text-xs font-semibold text-foreground">
                  Alt Text (SEO & Accessibility)
                </Label>
                <Input
                  id="cover-alt"
                  value={form.coverImageAlt}
                  onChange={(e) => setForm((p) => ({ ...p, coverImageAlt: e.target.value }))}
                  placeholder="Descriptive alt text for the cover image"
                  className="text-xs h-9"
                />
              </div>
            </CardContent>
          </Card>

          {/* 3. Organization & Tags Card */}
          <Card className="border-border/70 shadow-xs bg-card">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Layers className="size-4 text-primary" /> Categorization & Tags
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="blog-category" className="text-xs font-semibold text-foreground">
                  Primary Category
                </Label>
                <Select
                  value={form.category}
                  onValueChange={(val) => setForm((p) => ({ ...p, category: val }))}
                >
                  <SelectTrigger id="blog-category" className="text-xs h-9">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name} className="text-xs">
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="blog-tags" className="text-xs font-semibold text-foreground">
                  Article Tags
                </Label>
                <div className="flex gap-1.5">
                  <Input
                    id="blog-tags"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag(tagInput);
                      }
                    }}
                    placeholder="Type tag and press enter..."
                    className="text-xs h-8"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddTag(tagInput)}
                    className="text-xs h-8 px-2.5"
                  >
                    Add
                  </Button>
                </div>

                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {form.tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="hover:text-destructive transition-colors ml-0.5"
                          title={`Remove ${t}`}
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 4. SEO & Social Metadata Card */}
          <Card className="border-border/70 shadow-xs bg-card">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sparkles className="size-4 text-primary" /> SEO & Social Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="seo-title" className="text-xs font-semibold text-foreground">
                  SEO Meta Title
                </Label>
                <Input
                  id="seo-title"
                  value={form.seoTitle}
                  onChange={(e) => setForm((p) => ({ ...p, seoTitle: e.target.value }))}
                  placeholder={form.title || 'Optimal 50-60 character title'}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="seo-desc" className="text-xs font-semibold text-foreground">
                  SEO Meta Description
                </Label>
                <Textarea
                  id="seo-desc"
                  value={form.seoDescription}
                  onChange={(e) => setForm((p) => ({ ...p, seoDescription: e.target.value }))}
                  rows={2}
                  placeholder={form.excerpt || 'Brief 140-160 character description'}
                  className="text-xs resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="canonical-url" className="text-xs font-semibold text-foreground">
                  Canonical URL
                </Label>
                <Input
                  id="canonical-url"
                  value={form.canonicalUrl}
                  onChange={(e) => setForm((p) => ({ ...p, canonicalUrl: e.target.value }))}
                  placeholder={publicBlogUrl}
                  className="text-xs font-mono h-9"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
