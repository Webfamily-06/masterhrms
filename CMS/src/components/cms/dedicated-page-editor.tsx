'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Loader2,
  Save,
  ArrowLeft,
  Eye,
  ExternalLink,
  Code2,
  LayoutTemplate,
  Columns,
  Monitor,
  Tablet,
  Smartphone,
  Check,
  Copy,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Undo2,
  Redo2,
  Layers,
  Heading1,
  Heading2,
  FileCode,
  Globe,
  Shield,
  HelpCircle,
  MessageSquareQuote,
  CheckCircle2,
} from 'lucide-react';
import { MediaPickerModal, type MediaFileItem } from '@/components/media/media-picker-modal';
import { getTrustedCanonicalBlogUrl, validateCanonicalUrlOverride } from '@/lib/platform-domain';
import { DynamicPageContent, CmsSection } from '@/components/cms/dynamic-template-renderer';
import { sanitizeHtml, generateSandboxedIframeDoc } from '@/src/lib/html-sanitizer';
import { contentToHtml, htmlToContent } from '@/src/lib/cms-html-converter';

export interface DedicatedPageEditorProps {
  pageId?: string;
  isNew?: boolean;
}

export function DedicatedPageEditor({ pageId, isNew = false }: DedicatedPageEditorProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Mode: Visual, Source (HTML), Split View, Live Preview
  const [editorMode, setEditorMode] = useState<'visual' | 'source' | 'split' | 'preview'>('visual');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Media Library Modal state
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<'hero' | 'seo' | 'source' | 'section'>('source');
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  // Dirty state tracker
  const [isDirty, setIsDirty] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Core Page Fields
  const [id, setId] = useState<string>(pageId || '');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [published, setPublished] = useState(false);
  const [template, setTemplate] = useState<'landing' | 'content' | 'pricing' | 'legal' | 'compare' | 'standard'>('standard');
  const [metaDescription, setMetaDescription] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [socialImage, setSocialImage] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState<string | null>(null);

  // Structured Content state
  const [content, setContent] = useState<DynamicPageContent>({
    template: 'standard',
    hero: { eyebrow: '', title: '', subtitle: '', primary_cta_text: '', primary_cta_url: '', secondary_cta_text: '', secondary_cta_url: '' },
    body: '',
    html: '',
    sections: [],
    faqs: [],
    testimonials: [],
    cta: { heading: '', subtitle: '', buttonText: '', buttonUrl: '' },
  });

  // Source / HTML Code state
  const [htmlSource, setHtmlSource] = useState('');
  const [htmlError, setHtmlError] = useState<string | null>(null);

  // Undo / Redo history stack for HTML / Source editor
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch Page by persistent ID
  const {
    data: initialPage,
    isLoading,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: ['cms-page-by-id', pageId],
    queryFn: async () => {
      if (isNew || !pageId) return null;
      try {
        const res = await api.get(`/cms/pages/by-id/${pageId}`);
        return res;
      } catch (err: any) {
        throw new Error(err.message || 'Failed to load page');
      }
    },
    enabled: Boolean(!isNew && pageId),
  });

  // Populate state once loaded
  useEffect(() => {
    if (initialPage) {
      setId(initialPage.id || pageId || '');
      setTitle(initialPage.title || '');
      setSlug(initialPage.slug || '');
      setPublished(Boolean(initialPage.published));
      setMetaDescription(initialPage.metaDescription || initialPage.meta_description || '');
      setExpectedUpdatedAt(initialPage.updatedAt || null);

      const pageContent = (initialPage.content || {}) as DynamicPageContent;
      setContent(pageContent);
      setTemplate(pageContent.template || 'standard');
      setSeoTitle(pageContent.seoTitle || '');
      setSocialImage(pageContent.socialImage || '');
      setCanonicalUrl(pageContent.canonicalUrl || '');

      const initialHtml = contentToHtml(pageContent, initialPage.title);
      setHtmlSource(initialHtml);
      undoStackRef.current = [initialHtml];
      redoStackRef.current = [];
      setIsDirty(false);
    } else if (isNew) {
      const defaultTitle = 'Untitled Page';
      const defaultContent: DynamicPageContent = {
        template: 'standard',
        hero: { eyebrow: 'Welcome', title: 'New Enterprise Page', subtitle: 'Describe your core value proposition here.' },
        body: 'Start drafting page content here using visual sections or raw HTML.',
        sections: [
          { id: 'sec-1', type: 'cards', title: 'Feature Spotlight', badge: 'NEW', body: 'Highlight key benefits and technical milestones.', enabled: true, order: 1 }
        ],
        faqs: [],
        testimonials: [],
        cta: { heading: 'Ready to modernize?', subtitle: 'Get started today.', buttonText: 'Explore Platform', buttonUrl: '/pricing' }
      };
      setTitle(defaultTitle);
      setSlug(`page-${Date.now().toString(36)}`);
      setContent(defaultContent);
      setPublished(false);
      const generated = contentToHtml(defaultContent, defaultTitle);
      setHtmlSource(generated);
      undoStackRef.current = [generated];
      redoStackRef.current = [];
      setIsDirty(true);
    }
  }, [initialPage, isNew, pageId]);

  // Handle HTML Source changes with Undo/Redo tracking
  const handleHtmlSourceChange = (newVal: string, recordUndo = true) => {
    if (recordUndo && newVal !== htmlSource) {
      undoStackRef.current.push(htmlSource);
      if (undoStackRef.current.length > 50) undoStackRef.current.shift();
      redoStackRef.current = [];
    }
    setHtmlSource(newVal);
    setIsDirty(true);

    // Basic HTML syntax validation (check for unclosed tags)
    const openTags = (newVal.match(/<([a-z1-6]+)(?:\s+[^>]*)?>/gi) || [])
      .map((t) => t.replace(/<([a-z1-6]+)[\s\S]*/i, '$1').toLowerCase())
      .filter((t) => !['img', 'br', 'hr', 'input', 'meta', 'link'].includes(t));
    const closeTags = (newVal.match(/<\/([a-z1-6]+)>/gi) || [])
      .map((t) => t.replace(/<\/([a-z1-6]+)>/i, '$1').toLowerCase());

    if (Math.abs(openTags.length - closeTags.length) > 3) {
      setHtmlError(`Potential HTML tag mismatch: ${openTags.length} opening tags vs ${closeTags.length} closing tags.`);
    } else {
      setHtmlError(null);
    }

    // Update structured content representation
    setContent((prev) => htmlToContent(newVal, prev));
  };

  const handleUndo = () => {
    if (undoStackRef.current.length > 0) {
      const prev = undoStackRef.current.pop()!;
      redoStackRef.current.push(htmlSource);
      setHtmlSource(prev);
      setContent((c) => htmlToContent(prev, c));
      setIsDirty(true);
    }
  };

  const handleRedo = () => {
    if (redoStackRef.current.length > 0) {
      const next = redoStackRef.current.pop()!;
      undoStackRef.current.push(htmlSource);
      setHtmlSource(next);
      setContent((c) => htmlToContent(next, c));
      setIsDirty(true);
    }
  };

  // Synchronize when switching to HTML / Source mode
  const handleTabChange = (newMode: 'visual' | 'source' | 'split' | 'preview') => {
    if (newMode === 'source' || newMode === 'split') {
      // Re-generate HTML from structured content if modified visually
      const syncHtml = contentToHtml(content, title);
      setHtmlSource(syncHtml);
    }
    setEditorMode(newMode);
  };

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (overridePublished?: boolean) => {
      const isPub = typeof overridePublished === 'boolean' ? overridePublished : published;

      // Ensure content has updated HTML representation and SEO fields
      const payloadContent: DynamicPageContent = {
        ...content,
        template,
        seoTitle: seoTitle.trim() || undefined,
        socialImage: socialImage.trim() || undefined,
        canonicalUrl: canonicalUrl.trim() || undefined,
        html: sanitizeHtml(htmlSource),
        body: content.body || sanitizeHtml(htmlSource),
      };

      if (isNew || !id) {
        // Create new page
        const res = await api.post('/cms/pages', {
          title: title.trim(),
          slug: slug.trim(),
          metaDescription: metaDescription.trim() || null,
          content: payloadContent,
          published: isPub,
        });
        return res;
      } else {
        // Update page by persistent ID
        const res = await api.put(`/cms/pages/by-id/${id}`, {
          title: title.trim(),
          slug: slug.trim(),
          metaDescription: metaDescription.trim() || null,
          content: payloadContent,
          published: isPub,
          expectedUpdatedAt,
        });
        return res;
      }
    },
    onSuccess: (savedData) => {
      setIsDirty(false);
      setExpectedUpdatedAt(savedData.updatedAt || new Date().toISOString());
      if (isNew && savedData.id) {
        setId(savedData.id);
        toast.success(`Page '${savedData.title}' created successfully!`);
        router.replace(`/super/cms/${savedData.id}/edit`);
      } else {
        toast.success(`Page '${savedData.title}' saved successfully!`);
      }
      queryClient.invalidateQueries({ queryKey: ['cms-pages'] });
      queryClient.invalidateQueries({ queryKey: ['cms-page-by-id', savedData.id || id] });
    },
    onError: (err: any) => {
      if (err.status === 409 || err.message?.includes('Conflict')) {
        setConflictError(err.message || 'This page was modified in another session. Please review before overwriting.');
        setConflictModalOpen(true);
      } else {
        toast.error(err.message || 'Failed to save page.');
      }
    },
  });

  // Media Insertion Handler
  const handleMediaSelected = (file: MediaFileItem) => {
    if (mediaTarget === 'hero') {
      setContent((prev) => ({
        ...prev,
        hero: { ...prev.hero, heroImage: file.url },
      }));
      setIsDirty(true);
      toast.success(`Hero image assigned: ${file.originalName}`);
    } else if (mediaTarget === 'seo') {
      setSocialImage(file.url);
      setIsDirty(true);
      toast.success(`Social preview image set: ${file.originalName}`);
    } else if (mediaTarget === 'section' && activeSectionId) {
      setContent((prev) => ({
        ...prev,
        sections: (prev.sections || []).map((sec) =>
          sec.id === activeSectionId ? { ...sec, image: file.url } : sec
        ),
      }));
      setIsDirty(true);
      toast.success(`Image added to section`);
    } else if (mediaTarget === 'source') {
      const imgTag = `\n<img src="${file.url}" alt="${file.originalName.replace(/\.[^.]+$/, '')}" class="w-full rounded-xl shadow-md my-4" />\n`;
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const val = htmlSource;
        const nextVal = val.substring(0, start) + imgTag + val.substring(end);
        handleHtmlSourceChange(nextVal, true);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + imgTag.length, start + imgTag.length);
        }, 50);
      } else {
        handleHtmlSourceChange(htmlSource + imgTag, true);
      }
      toast.success(`Inserted ${file.originalName} into source`);
    }
    setMediaPickerOpen(false);
  };

  // Section Management Helpers
  const addSection = (type: CmsSection['type'] = 'cards') => {
    const newSec: CmsSection = {
      id: `sec-${Date.now().toString(36)}`,
      type,
      title: type === 'cards' ? 'Feature Grid' : type === 'faq' ? 'FAQ Section' : 'Content Block',
      badge: 'FEATURE',
      body: 'Detailed description of this component.',
      enabled: true,
      order: (content.sections?.length || 0) + 1,
    };
    const nextSections = [...(content.sections || []), newSec];
    setContent((prev) => ({ ...prev, sections: nextSections }));
    setIsDirty(true);
  };

  const removeSection = (secId: string) => {
    const nextSections = (content.sections || []).filter((s) => s.id !== secId);
    setContent((prev) => ({ ...prev, sections: nextSections }));
    setIsDirty(true);
  };

  const moveSection = (secId: string, direction: 'up' | 'down') => {
    const secs = [...(content.sections || [])];
    const idx = secs.findIndex((s) => s.id === secId);
    if (idx === -1) return;
    if (direction === 'up' && idx > 0) {
      const temp = secs[idx - 1];
      secs[idx - 1] = secs[idx];
      secs[idx] = temp;
    } else if (direction === 'down' && idx < secs.length - 1) {
      const temp = secs[idx + 1];
      secs[idx + 1] = secs[idx];
      secs[idx] = temp;
    }
    // Update order
    secs.forEach((s, i) => (s.order = i + 1));
    setContent((prev) => ({ ...prev, sections: secs }));
    setIsDirty(true);
  };

  // Sandboxed Iframe Preview Document
  const iframeDoc = useMemo(() => {
    return generateSandboxedIframeDoc(htmlSource, title);
  }, [htmlSource, title]);

  // Derived Public URL
  const publicUrl = useMemo(() => {
    if (!slug) return '/p/untitled';
    if (slug === 'home' || slug === 'footer') return '/';
    if (['about', 'team', 'pricing', 'contact'].includes(slug)) return `/${slug}`;
    if (slug.startsWith('legal-')) return `/legal/${slug.replace('legal-', '')}`;
    return `/p/${slug}`;
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Loading CMS page record...</p>
      </div>
    );
  }

  if (loadError && !isNew) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <AlertTriangle className="size-12 text-destructive mx-auto" />
        <h2 className="text-xl font-bold">Failed to load CMS Page</h2>
        <p className="text-sm text-muted-foreground">{loadError.message}</p>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RefreshCw className="size-4" /> Retry Loading
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-[1700px] mx-auto pb-20">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (isDirty && !window.confirm('You have unsaved changes. Exit anyway?')) return;
              router.push('/super/cms');
            }}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back to CMS Studio
          </Button>
          <div className="h-4 w-px bg-border/80 hidden sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <Input
                id="page-title-input"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="Page Title"
                className="text-sm font-bold h-8 w-[220px] sm:w-[300px]"
              />
              <Input
                id="page-slug-input"
                value={slug}
                onChange={(e) => {
                  const clean = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
                  setSlug(clean);
                  setIsDirty(true);
                }}
                placeholder="url-slug"
                className="text-xs h-8 font-mono w-[140px] sm:w-[180px]"
              />
              <Badge
                variant={published ? 'default' : 'secondary'}
                className={`text-[10px] uppercase font-semibold tracking-wider ${
                  published ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'text-muted-foreground'
                }`}
              >
                {published ? 'Live' : 'Draft'}
              </Badge>
              {isDirty && (
                <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/40">
                  Unsaved
                </Badge>
              )}
            </div>
            {id && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono mt-0.5">
                <span>ID: {id}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(id);
                    setCopiedId(true);
                    toast.success('Persistent Page ID copied!');
                    setTimeout(() => setCopiedId(false), 2000);
                  }}
                  className="hover:text-foreground transition-colors inline-flex items-center gap-1"
                  title="Copy Page ID"
                >
                  {copiedId ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Editor Mode Tabs & Save Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Editor Mode Switcher */}
          <div className="flex items-center rounded-lg border border-border/80 bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => handleTabChange('visual')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                editorMode === 'visual' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutTemplate className="size-3.5" /> Visual Editor
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('source')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                editorMode === 'source' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Code2 className="size-3.5" /> HTML / Source
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('split')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                editorMode === 'split' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Columns className="size-3.5" /> Split View
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('preview')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                editorMode === 'preview' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Eye className="size-3.5" /> Live Preview
            </button>
          </div>

          {/* Published Route External Link */}
          <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs h-8">
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" title="View Public Page">
              <ExternalLink className="size-3.5" /> Public View
            </a>
          </Button>

          {/* Quick Publish Switch */}
          <div className="flex items-center gap-1.5 border border-border/80 rounded-lg px-2.5 h-8 bg-card">
            <Label htmlFor="publish-toggle" className="text-xs font-medium cursor-pointer">
              {published ? 'Published' : 'Draft'}
            </Label>
            <Switch
              id="publish-toggle"
              checked={published}
              onCheckedChange={(val) => {
                setPublished(val);
                setIsDirty(true);
              }}
            />
          </div>

          {/* Save Button */}
          <Button
            id="page-save-button"
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="gap-1.5 text-xs h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold cursor-pointer"
          >
            {saveMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            {isNew ? 'Create Page' : 'Save Page'}
          </Button>
        </div>
      </div>

      {/* 2. Visual Mode */}
      {editorMode === 'visual' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Visual Sections Manager (Col 8) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Hero Section Card */}
            <Card className="border border-border/80 shadow-xs">
              <CardHeader className="p-4 border-b border-border/60 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    <CardTitle className="text-sm font-bold">Hero Banner Component</CardTitle>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMediaTarget('hero');
                      setMediaPickerOpen(true);
                    }}
                    className="h-7 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/5"
                  >
                    <ImageIcon className="size-3" /> Hero Media
                  </Button>
                </div>
                <CardDescription className="text-xs">
                  Main headline, eyebrow tag, and primary calls to action.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Eyebrow Tag</Label>
                    <Input
                      value={content.hero?.eyebrow || ''}
                      onChange={(e) => {
                        setContent((p) => ({ ...p, hero: { ...p.hero, eyebrow: e.target.value } }));
                        setIsDirty(true);
                      }}
                      placeholder="e.g. ENTERPRISE SUITE"
                      className="text-xs h-8 mt-1"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Hero Headline</Label>
                    <Input
                      value={content.hero?.title || ''}
                      onChange={(e) => {
                        setContent((p) => ({ ...p, hero: { ...p.hero, title: e.target.value } }));
                        setIsDirty(true);
                      }}
                      placeholder="Main banner title"
                      className="text-xs h-8 mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Subtitle / Narrative</Label>
                  <Textarea
                    value={content.hero?.subtitle || ''}
                    onChange={(e) => {
                      setContent((p) => ({ ...p, hero: { ...p.hero, subtitle: e.target.value } }));
                      setIsDirty(true);
                    }}
                    placeholder="Clear 1-2 sentence value statement"
                    className="text-xs resize-none h-18 mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/50">
                  <div>
                    <Label className="text-xs">Primary CTA Button</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <Input
                        value={content.hero?.primary_cta_text || ''}
                        onChange={(e) => {
                          setContent((p) => ({ ...p, hero: { ...p.hero, primary_cta_text: e.target.value } }));
                          setIsDirty(true);
                        }}
                        placeholder="e.g. Get Started"
                        className="text-xs h-8"
                      />
                      <Input
                        value={content.hero?.primary_cta_url || ''}
                        onChange={(e) => {
                          setContent((p) => ({ ...p, hero: { ...p.hero, primary_cta_url: e.target.value } }));
                          setIsDirty(true);
                        }}
                        placeholder="/pricing"
                        className="text-xs h-8 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Secondary CTA Button</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <Input
                        value={content.hero?.secondary_cta_text || ''}
                        onChange={(e) => {
                          setContent((p) => ({ ...p, hero: { ...p.hero, secondary_cta_text: e.target.value } }));
                          setIsDirty(true);
                        }}
                        placeholder="e.g. Schedule Demo"
                        className="text-xs h-8"
                      />
                      <Input
                        value={content.hero?.secondary_cta_url || ''}
                        onChange={(e) => {
                          setContent((p) => ({ ...p, hero: { ...p.hero, secondary_cta_url: e.target.value } }));
                          setIsDirty(true);
                        }}
                        placeholder="/contact"
                        className="text-xs h-8 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dynamic Sections Manager */}
            <Card className="border border-border/80 shadow-xs">
              <CardHeader className="p-4 border-b border-border/60 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="size-4 text-primary" />
                    <CardTitle className="text-sm font-bold">Dynamic Page Sections ({content.sections?.length || 0})</CardTitle>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addSection('cards')}
                      className="h-7 text-xs gap-1"
                    >
                      <Plus className="size-3" /> Add Feature Cards
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addSection('rich-text')}
                      className="h-7 text-xs gap-1"
                    >
                      <Plus className="size-3" /> Add Text Block
                    </Button>
                  </div>
                </div>
                <CardDescription className="text-xs">
                  Reorder, customize, and configure layout sections for this page.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {(!content.sections || content.sections.length === 0) ? (
                  <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                    No custom sections added yet. Click &apos;Add Feature Cards&apos; or &apos;Add Text Block&apos; above.
                  </div>
                ) : (
                  content.sections.map((sec, index) => (
                    <div
                      key={sec.id || index}
                      className="p-3.5 rounded-lg border border-border/70 bg-card/60 space-y-3 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-muted-foreground">#{index + 1}</span>
                          <Input
                            value={sec.title || ''}
                            onChange={(e) => {
                              const next = [...(content.sections || [])];
                              next[index].title = e.target.value;
                              setContent((p) => ({ ...p, sections: next }));
                              setIsDirty(true);
                            }}
                            placeholder="Section Title"
                            className="text-xs h-7 font-semibold max-w-[220px]"
                          />
                          <Input
                            value={sec.badge || ''}
                            onChange={(e) => {
                              const next = [...(content.sections || [])];
                              next[index].badge = e.target.value;
                              setContent((p) => ({ ...p, sections: next }));
                              setIsDirty(true);
                            }}
                            placeholder="Badge (optional)"
                            className="text-xs h-7 max-w-[120px]"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => moveSection(sec.id!, 'up')}
                            disabled={index === 0}
                            className="size-7 text-muted-foreground hover:text-foreground"
                            title="Move Up"
                          >
                            <ArrowUp className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => moveSection(sec.id!, 'down')}
                            disabled={index === (content.sections?.length || 0) - 1}
                            className="size-7 text-muted-foreground hover:text-foreground"
                            title="Move Down"
                          >
                            <ArrowDown className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setActiveSectionId(sec.id!);
                              setMediaTarget('section');
                              setMediaPickerOpen(true);
                            }}
                            className="size-7 text-primary hover:bg-primary/10"
                            title="Attach Image"
                          >
                            <ImageIcon className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSection(sec.id!)}
                            className="size-7 text-destructive hover:bg-destructive/10"
                            title="Delete Section"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>

                      <Textarea
                        value={sec.body || ''}
                        onChange={(e) => {
                          const next = [...(content.sections || [])];
                          next[index].body = e.target.value;
                          setContent((p) => ({ ...p, sections: next }));
                          setIsDirty(true);
                        }}
                        placeholder="Section content / markdown description..."
                        className="text-xs resize-none h-18"
                      />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Main Rich Body */}
            <Card className="border border-border/80 shadow-xs">
              <CardHeader className="p-4 border-b border-border/60 bg-muted/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold">Main Article & Editorial Content</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMediaTarget('source');
                      setMediaPickerOpen(true);
                    }}
                    className="h-7 text-xs gap-1"
                  >
                    <ImageIcon className="size-3" /> Insert Media
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <Textarea
                  value={content.body || ''}
                  onChange={(e) => {
                    const nextBody = e.target.value;
                    setContent((p) => ({ ...p, body: nextBody }));
                    setIsDirty(true);
                  }}
                  placeholder="Enter detailed page content, markdown narrative, or HTML markup..."
                  className="text-xs font-mono min-h-[220px]"
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Page Settings & SEO Sidebar (Col 4) */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border border-border/80 shadow-xs">
              <CardHeader className="p-4 border-b border-border/60 bg-muted/20">
                <CardTitle className="text-sm font-bold">Page Settings & Routing</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5">
                <div>
                  <Label className="text-xs font-semibold">Page Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="e.g. Enterprise Payroll Solutions"
                    className="text-xs h-8 mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">URL Slug</Label>
                  <Input
                    value={slug}
                    onChange={(e) => {
                      const clean = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
                      setSlug(clean);
                      setIsDirty(true);
                    }}
                    placeholder="e.g. enterprise-payroll"
                    className="text-xs h-8 font-mono mt-1"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                    Public Path: <span className="text-foreground font-semibold">{publicUrl}</span>
                  </p>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Template Layout</Label>
                  <Select
                    value={template}
                    onValueChange={(val: any) => {
                      setTemplate(val);
                      setContent((p) => ({ ...p, template: val }));
                      setIsDirty(true);
                    }}
                  >
                    <SelectTrigger className="text-xs h-8 mt-1">
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard Content Page</SelectItem>
                      <SelectItem value="landing">Marketing Landing Page</SelectItem>
                      <SelectItem value="pricing">Pricing & Monetization</SelectItem>
                      <SelectItem value="legal">Legal & Compliance Policy</SelectItem>
                      <SelectItem value="compare">Competitive Comparison</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-semibold">Publication Status</Label>
                      <p className="text-[10px] text-muted-foreground">Drafts are hidden from anonymous visitors.</p>
                    </div>
                    <Switch
                      checked={published}
                      onCheckedChange={(val) => {
                        setPublished(val);
                        setIsDirty(true);
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SEO & Social Share Card */}
            <Card className="border border-border/80 shadow-xs">
              <CardHeader className="p-4 border-b border-border/60 bg-muted/20">
                <CardTitle className="text-sm font-bold">SEO & Metadata</CardTitle>
                <CardDescription className="text-xs">Search engine optimization and social preview card.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5">
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Meta Title</Label>
                    <span className={`text-[10px] ${seoTitle.length > 60 ? 'text-amber-500 font-semibold' : 'text-muted-foreground'}`}>
                      {seoTitle.length}/60
                    </span>
                  </div>
                  <Input
                    value={seoTitle}
                    onChange={(e) => {
                      setSeoTitle(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder={title || 'Optimal 50-60 char title'}
                    className="text-xs h-8 mt-1"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Meta Description</Label>
                    <span className={`text-[10px] ${metaDescription.length > 160 ? 'text-amber-500 font-semibold' : 'text-muted-foreground'}`}>
                      {metaDescription.length}/160
                    </span>
                  </div>
                  <Textarea
                    value={metaDescription}
                    onChange={(e) => {
                      setMetaDescription(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="Brief 140-160 character search snippet"
                    className="text-xs resize-none h-16 mt-1"
                  />
                </div>

                {/* Social Image */}
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Social Preview Banner</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setMediaTarget('seo');
                        setMediaPickerOpen(true);
                      }}
                      className="h-6 px-1.5 text-[11px] text-primary"
                    >
                      Choose Media
                    </Button>
                  </div>
                  {socialImage ? (
                    <div className="relative aspect-[1200/630] rounded-md overflow-hidden border border-border mt-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={socialImage} alt="Social banner" className="size-full object-cover" />
                    </div>
                  ) : (
                    <Input
                      value={socialImage}
                      onChange={(e) => {
                        setSocialImage(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="Paste image URL or pick from library"
                      className="text-xs h-8 mt-1"
                    />
                  )}
                </div>

                {/* Canonical URL Override */}
                <div>
                  <Label className="text-xs font-semibold">Canonical URL Override</Label>
                  <Input
                    value={canonicalUrl}
                    onChange={(e) => {
                      setCanonicalUrl(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder={getTrustedCanonicalBlogUrl(slug)}
                    className="text-xs h-8 font-mono mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 3. HTML / Source Editor Mode */}
      {editorMode === 'source' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-card p-2 rounded-lg border border-border/80 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const tag = '<h1>Heading 1</h1>\n';
                  handleHtmlSourceChange(htmlSource + tag, true);
                }}
                className="h-7 px-2 text-xs gap-1"
              >
                <Heading1 className="size-3" /> H1
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const tag = '<h2>Heading 2</h2>\n';
                  handleHtmlSourceChange(htmlSource + tag, true);
                }}
                className="h-7 px-2 text-xs gap-1"
              >
                <Heading2 className="size-3" /> H2
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const tag = '<p>Paragraph text content goes here.</p>\n';
                  handleHtmlSourceChange(htmlSource + tag, true);
                }}
                className="h-7 px-2 text-xs"
              >
                &lt;p&gt;
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const tag = '<section class="content-block">\n  <h2>Section Title</h2>\n  <p>Section narrative...</p>\n</section>\n';
                  handleHtmlSourceChange(htmlSource + tag, true);
                }}
                className="h-7 px-2 text-xs"
              >
                &lt;section&gt;
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const tag = '<div class="cards-grid">\n  <div class="card">\n    <h3>Card Title</h3>\n    <p>Card description...</p>\n  </div>\n</div>\n';
                  handleHtmlSourceChange(htmlSource + tag, true);
                }}
                className="h-7 px-2 text-xs"
              >
                Card Grid
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setMediaTarget('source');
                  setMediaPickerOpen(true);
                }}
                className="h-7 px-2 text-xs gap-1 border-primary/40 text-primary"
              >
                <ImageIcon className="size-3" /> Insert Image
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const tag = '<a href="/pricing" class="cta-button">Action Link</a>';
                  handleHtmlSourceChange(htmlSource + tag, true);
                }}
                className="h-7 px-2 text-xs"
              >
                &lt;a&gt; Link
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const tag = '<ul>\n  <li>Feature Item 1</li>\n  <li>Feature Item 2</li>\n</ul>\n';
                  handleHtmlSourceChange(htmlSource + tag, true);
                }}
                className="h-7 px-2 text-xs"
              >
                &lt;ul&gt; List
              </Button>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={undoStackRef.current.length === 0}
                className="h-7 px-2 text-xs gap-1"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="size-3.5" /> Undo
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRedo}
                disabled={redoStackRef.current.length === 0}
                className="h-7 px-2 text-xs gap-1"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="size-3.5" /> Redo
              </Button>
            </div>
          </div>

          {htmlError && (
            <div className="p-2.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{htmlError}</span>
            </div>
          )}

          <div className="relative border border-border/80 rounded-xl overflow-hidden shadow-xs bg-slate-950">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/60 text-slate-400 text-xs font-mono">
              <span>HTML / Source Markup</span>
              <span>UTF-8 | Sanitized</span>
            </div>
            <textarea
              ref={textareaRef}
              value={htmlSource}
              onChange={(e) => handleHtmlSourceChange(e.target.value)}
              className="w-full h-[600px] p-4 font-mono text-xs text-slate-100 bg-transparent resize-y outline-none leading-relaxed"
              placeholder="<h1>Your Page Title</h1>&#10;<p>Write clean HTML markup here...</p>"
              spellCheck={false}
            />
          </div>
        </div>
      )}

      {/* 4. Split View Mode */}
      {editorMode === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[750px]">
          {/* Left: Source Code */}
          <div className="flex flex-col border border-border/80 rounded-xl overflow-hidden shadow-xs bg-slate-950">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-900/80 text-slate-400 text-xs font-mono">
              <span className="flex items-center gap-1.5">
                <FileCode className="size-3.5 text-primary" /> HTML Source
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMediaTarget('source');
                  setMediaPickerOpen(true);
                }}
                className="h-6 px-1.5 text-[11px] text-primary hover:bg-slate-800"
              >
                + Image
              </Button>
            </div>
            <textarea
              ref={textareaRef}
              value={htmlSource}
              onChange={(e) => handleHtmlSourceChange(e.target.value)}
              className="flex-1 w-full p-4 font-mono text-xs text-slate-100 bg-transparent resize-none outline-none leading-relaxed"
              placeholder="<h1>Start typing HTML...</h1>"
              spellCheck={false}
            />
          </div>

          {/* Right: Sandboxed Live Preview */}
          <div className="flex flex-col border border-border/80 rounded-xl overflow-hidden shadow-xs bg-background">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/60 bg-muted/40 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <Eye className="size-3.5 text-primary" /> Sandboxed Preview
              </span>
              <Badge variant="outline" className="text-[10px]">
                Isolated Iframe
              </Badge>
            </div>
            <iframe
              srcDoc={iframeDoc}
              sandbox="allow-same-origin"
              title="Live Sandboxed Preview"
              className="flex-1 w-full border-none bg-white dark:bg-slate-950"
            />
          </div>
        </div>
      )}

      {/* 5. Live Preview Mode */}
      {editorMode === 'preview' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-card p-2 rounded-lg border border-border/80">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant={previewDevice === 'desktop' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPreviewDevice('desktop')}
                className="h-7 text-xs gap-1"
              >
                <Monitor className="size-3.5" /> Desktop
              </Button>
              <Button
                type="button"
                variant={previewDevice === 'tablet' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPreviewDevice('tablet')}
                className="h-7 text-xs gap-1"
              >
                <Tablet className="size-3.5" /> Tablet (768px)
              </Button>
              <Button
                type="button"
                variant={previewDevice === 'mobile' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPreviewDevice('mobile')}
                className="h-7 text-xs gap-1"
              >
                <Smartphone className="size-3.5" /> Mobile (375px)
              </Button>
            </div>
            <Badge variant="outline" className="text-xs gap-1 text-emerald-600 dark:text-emerald-400">
              <Shield className="size-3" /> Sandboxed Rendering
            </Badge>
          </div>

          <div className="min-h-[700px] flex justify-center bg-muted/20 border border-border/70 rounded-xl p-4 overflow-auto">
            <iframe
              srcDoc={iframeDoc}
              sandbox="allow-same-origin"
              title="Full Live Preview"
              style={{
                width: previewDevice === 'desktop' ? '100%' : previewDevice === 'tablet' ? '768px' : '375px',
                height: '750px',
              }}
              className="border border-border/80 rounded-xl shadow-md bg-white dark:bg-slate-950 transition-all duration-300"
            />
          </div>
        </div>
      )}

      {/* Media Picker Modal */}
      <MediaPickerModal
        open={mediaPickerOpen}
        onOpenChange={setMediaPickerOpen}
        allowedTypes={['image/*']}
        title={mediaTarget === 'hero' ? 'Select Hero Media' : mediaTarget === 'seo' ? 'Select Social Share Image' : 'Select Image Asset'}
        onSelect={handleMediaSelected}
      />

      {/* 409 Conflict Dialog */}
      <Dialog open={conflictModalOpen} onOpenChange={setConflictModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" /> Stale Edit Detected (Conflict)
            </DialogTitle>
            <DialogDescription className="text-xs">
              {conflictError}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-xs text-muted-foreground leading-relaxed">
            Another administrative session updated this page after you opened it. Your changes are currently preserved in the editor so you won&apos;t lose work.
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setConflictModalOpen(false);
                refetch();
              }}
            >
              Discard &amp; Reload Latest
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                setExpectedUpdatedAt(null); // Bypass OCC
                setConflictModalOpen(false);
                saveMutation.mutate();
              }}
            >
              Overwrite Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
