'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, unwrapArray } from '@/lib/api';
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Tag as TagIcon,
  Plus,
  Search,
  Edit,
  Trash2,
  BookOpen,
  ArrowLeft,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { CmsPage } from '@/app/super/cms/page';

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
}

const DEFAULT_TAGS: BlogTag[] = [
  { id: 'tag-1', name: 'Payroll', slug: 'payroll' },
  { id: 'tag-2', name: 'AI', slug: 'ai' },
  { id: 'tag-3', name: 'Compliance', slug: 'compliance' },
  { id: 'tag-4', name: 'Automation', slug: 'automation' },
  { id: 'tag-5', name: 'Integration', slug: 'integration' },
  { id: 'tag-6', name: 'Security', slug: 'security' },
  { id: 'tag-7', name: 'Future of Work', slug: 'future-of-work' },
  { id: 'tag-8', name: 'Culture', slug: 'culture' },
  { id: 'tag-9', name: 'Productivity', slug: 'productivity' },
];

export default function BlogTagsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<BlogTag | null>(null);
  const [deletingTag, setDeletingTag] = useState<BlogTag | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');

  // 1. Fetch Tags
  const { data: tags = DEFAULT_TAGS, isLoading: isLoadingTags } = useQuery<BlogTag[]>({
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

  // 2. Fetch all blogs to count tag occurrences
  const { data: blogs = [] } = useQuery<CmsPage[]>({
    queryKey: ['cms-blogs-list'],
    queryFn: async () => {
      try {
        const res = await api.get('/cms/blogs');
        return unwrapArray<CmsPage>(res);
      } catch {
        return [];
      }
    },
  });

  // Tag frequency count
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    blogs.forEach((b: any) => {
      const postTags = b.content?.tags;
      if (Array.isArray(postTags)) {
        postTags.forEach((t: string) => {
          counts[t] = (counts[t] || 0) + 1;
        });
      }
    });
    return counts;
  }, [blogs]);

  // Filtered Tags
  const filteredTags = useMemo(() => {
    if (!search.trim()) return tags;
    const q = search.toLowerCase();
    return tags.filter(
      (t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q)
    );
  }, [tags, search]);

  // Mutation
  const saveTagsMutation = useMutation({
    mutationFn: async (updatedList: BlogTag[]) => {
      await api.put('/cms/pages/system-blog-tags', {
        title: 'System Blog Tags',
        content: { tags: updatedList },
        published: true,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cms-blog-tags'] });
      setIsModalOpen(false);
      setEditingTag(null);
      setFormName('');
      setFormSlug('');
      toast.success(editingTag ? 'Tag updated successfully!' : 'Tag created successfully!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save tag');
    },
  });

  const handleOpenAdd = () => {
    setEditingTag(null);
    setFormName('');
    setFormSlug('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: BlogTag) => {
    setEditingTag(t);
    setFormName(t.name);
    setFormSlug(t.slug);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      toast.error('Tag name is required');
      return;
    }
    const cleanSlug = (formSlug.trim() || formName.trim())
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (editingTag) {
      const updated = tags.map((t) =>
        t.id === editingTag.id ? { ...t, name: formName.trim(), slug: cleanSlug } : t
      );
      saveTagsMutation.mutate(updated);
    } else {
      const newTag: BlogTag = {
        id: `tag-${Date.now()}`,
        name: formName.trim(),
        slug: cleanSlug,
      };
      saveTagsMutation.mutate([...tags, newTag]);
    }
  };

  const handleDelete = (t: BlogTag) => {
    const updated = tags.filter((x) => x.id !== t.id);
    saveTagsMutation.mutate(updated);
    setDeletingTag(null);
  };

  return (
    <div className="space-y-6 w-full max-w-[1600px] mx-auto pb-16">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/super/blogs"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="size-3" /> Back to Articles
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <TagIcon className="size-5" />
            </span>
            Blog Tags
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Granular keywords and labels for cross-cutting search, indexing, and recommendation engines.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleOpenAdd} size="sm" className="gap-2 shadow-xs">
            <Plus className="size-4" /> Add Tag
          </Button>
          <BreadcrumbNav
            items={[
              { label: 'Dashboard', href: '/super' },
              { label: 'Blog Insights', href: '/super/blogs' },
              { label: 'Tags', href: '/super/blogs/tags' },
            ]}
          />
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/70 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tags by keyword or slug..."
            className="pl-9 h-9 text-xs"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground self-end sm:self-auto">
          <span>Total: <strong>{tags.length}</strong> tags</span>
        </div>
      </div>

      {/* Tags Cards */}
      {isLoadingTags ? (
        <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Loading tags...</p>
        </div>
      ) : filteredTags.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center space-y-3">
            <TagIcon className="size-10 text-muted-foreground/40 mx-auto" />
            <h3 className="text-sm font-semibold">No tags found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {search ? 'No tags matched your search query.' : 'Create tags to help readers discover related topics.'}
            </p>
            <Button onClick={handleOpenAdd} size="sm" variant="outline" className="gap-2">
              <Plus className="size-3.5" /> Create Tag
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredTags.map((tag) => {
            const count = tagCounts[tag.name] || 0;
            return (
              <Card key={tag.id} className="group hover:border-primary/50 transition-all shadow-2xs">
                <CardContent className="p-3.5 flex items-center justify-between">
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <TagIcon className="size-3 text-primary shrink-0" />
                      <span className="text-xs font-bold text-foreground truncate">{tag.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground truncate">{tag.slug}</span>
                      <span className="text-[10px] text-muted-foreground/80">• {count} {count === 1 ? 'post' : 'posts'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-6.5"
                      onClick={() => handleOpenEdit(tag)}
                      title="Edit Tag"
                    >
                      <Edit className="size-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-6.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeletingTag(tag)}
                      title="Delete Tag"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Tag Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{editingTag ? 'Edit Tag' : 'Create New Tag'}</DialogTitle>
            <DialogDescription>
              Tags are keywords used to link articles across multiple categories.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="tagName" className="text-xs font-semibold">Tag Name *</Label>
              <Input
                id="tagName"
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  if (!editingTag) {
                    setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
                  }
                }}
                placeholder="e.g. Productivity"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tagSlug" className="text-xs font-semibold">Slug *</Label>
              <Input
                id="tagSlug"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                placeholder="e.g. productivity"
                className="text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saveTagsMutation.isPending} className="gap-1.5">
              {saveTagsMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
              {editingTag ? 'Save Changes' : 'Create Tag'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingTag} onOpenChange={(o) => !o && setDeletingTag(null)}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="size-5" /> Delete Tag
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingTag?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setDeletingTag(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deletingTag && handleDelete(deletingTag)}
              disabled={saveTagsMutation.isPending}
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
