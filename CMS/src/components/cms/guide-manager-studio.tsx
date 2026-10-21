'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
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
  FileText,
  Plus,
  Search,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Download,
  Sparkles,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';

export interface ResourceGuide {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  type: string;
  downloadUrl: string;
  coverImage?: string;
  coverImageAlt?: string;
  order: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const CATEGORIES = [
  'Compliance',
  'Payroll',
  'Performance',
  'Core HR',
  'Operations',
  'Security',
  'General',
];

const GUIDE_TYPES = [
  'PDF · 24 pages',
  'Playbook · 18 pages',
  'Toolkit · 12 pages',
  'Template · 15 pages',
  'Whitepaper · 30 pages',
  'Checklist · 8 pages',
];

export function GuideManagerStudio() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<ResourceGuide | null>(null);
  const [deletingGuide, setDeletingGuide] = useState<ResourceGuide | null>(null);

  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    category: 'Compliance',
    type: 'PDF · 24 pages',
    downloadUrl: '',
    coverImage: '/images/resources/guide-compliance.jpg',
    coverImageAlt: '',
    isActive: true,
  });

  const { data: guides = [], isLoading, refetch, isRefetching } = useQuery<ResourceGuide[]>({
    queryKey: ['super-cms-guides'],
    queryFn: async () => {
      try {
        const res = await api.get('/cms/guides?all=true');
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const filtered = useMemo(() => {
    return guides.filter((g) => {
      const matchSearch =
        !search ||
        g.title.toLowerCase().includes(search.toLowerCase()) ||
        g.description.toLowerCase().includes(search.toLowerCase()) ||
        g.slug.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCat === 'all' || g.category === selectedCat;
      return matchSearch && matchCat;
    });
  }, [guides, search, selectedCat]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingGuide) {
        return await api.put(`/cms/guides/${editingGuide.id}`, form);
      } else {
        return await api.post('/cms/guides', form);
      }
    },
    onSuccess: () => {
      toast.success(editingGuide ? 'Guide updated successfully!' : 'Guide created successfully!');
      setIsModalOpen(false);
      setEditingGuide(null);
      setForm({
        title: '',
        slug: '',
        description: '',
        category: 'Compliance',
        type: 'PDF · 24 pages',
        downloadUrl: '',
        coverImage: '/images/resources/guide-compliance.jpg',
        coverImageAlt: '',
        isActive: true,
      });
      qc.invalidateQueries({ queryKey: ['super-cms-guides'] });
      qc.invalidateQueries({ queryKey: ['public-resource-guides'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || 'Failed to save resource guide');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/cms/guides/${id}`);
    },
    onSuccess: () => {
      toast.success('Resource guide deleted successfully');
      setDeletingGuide(null);
      qc.invalidateQueries({ queryKey: ['super-cms-guides'] });
      qc.invalidateQueries({ queryKey: ['public-resource-guides'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || 'Failed to delete guide');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      return await api.patch('/cms/guides/reorder', { orderedIds });
    },
    onSuccess: () => {
      toast.success('Guide order updated!');
      qc.invalidateQueries({ queryKey: ['super-cms-guides'] });
      qc.invalidateQueries({ queryKey: ['public-resource-guides'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || 'Failed to reorder guides');
    },
  });

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (reorderMutation.isPending) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= filtered.length) return;

    const copy = [...filtered];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;

    const orderedIds = copy.map((g) => g.id);
    reorderMutation.mutate(orderedIds);
  };

  const handleEdit = (guide: ResourceGuide) => {
    setEditingGuide(guide);
    setForm({
      title: guide.title,
      slug: guide.slug,
      description: guide.description,
      category: guide.category || 'Compliance',
      type: guide.type || 'PDF · 24 pages',
      downloadUrl: guide.downloadUrl || '',
      coverImage: guide.coverImage || '/images/resources/guide-compliance.jpg',
      coverImageAlt: guide.coverImageAlt || guide.title,
      isActive: guide.isActive !== false,
    });
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingGuide(null);
    setForm({
      title: '',
      slug: '',
      description: '',
      category: 'Compliance',
      type: 'PDF · 24 pages',
      downloadUrl: '/downloads/enterprise-resource-guide.pdf',
      coverImage: '/images/resources/guide-compliance.jpg',
      coverImageAlt: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <Card className="border shadow-sm">
        <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <FileText className="size-5 text-primary" />
                Resource Guides & PDF Playbooks
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Manage downloadable whitepapers, statutory compliance PDFs, and templates rendered on /resources.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isRefetching}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className={`size-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button size="sm" onClick={handleCreate} className="gap-1.5 text-xs">
                <Plus className="size-3.5" />
                Add New Guide
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search guides by title, slug, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <Select value={selectedCat} onValueChange={setSelectedCat}>
              <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Guides Table / List */}
      <Card className="border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">Loading resource guides...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="size-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm font-semibold">No resource guides found</p>
            <p className="text-xs text-muted-foreground">
              {search ? 'Try adjusting your search query or filter.' : 'Click "Add New Guide" to create your first CMS playbook.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="p-3 pl-4">#</th>
                  <th className="p-3">Title & Identifier</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Format / Type</th>
                  <th className="p-3">Download URL</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Order</th>
                  <th className="p-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 pl-4 font-mono text-muted-foreground">{idx + 1}</td>
                    <td className="p-3 max-w-[280px]">
                      <div className="font-semibold text-foreground text-sm line-clamp-1">{item.title}</div>
                      <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{item.slug}</div>
                      <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{item.description}</div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px] font-medium bg-primary/5 text-primary border-primary/20">
                        {item.category || 'General'}
                      </Badge>
                    </td>
                    <td className="p-3 font-mono text-[11px]">{item.type || 'PDF'}</td>
                    <td className="p-3 max-w-[200px]">
                      <div className="font-mono text-[11px] truncate text-muted-foreground" title={item.downloadUrl}>
                        {item.downloadUrl}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-semibold ${
                          item.isActive !== false ? 'bg-emerald-500/10 text-emerald-600' : 'text-muted-foreground'
                        }`}
                      >
                        {item.isActive !== false ? 'Live' : 'Hidden'}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          disabled={idx === 0 || reorderMutation.isPending}
                          onClick={() => handleMove(idx, 'up')}
                          title="Move Up"
                        >
                          <ArrowUp className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          disabled={idx === filtered.length - 1 || reorderMutation.isPending}
                          onClick={() => handleMove(idx, 'down')}
                          title="Move Down"
                        >
                          <ArrowDown className="size-3" />
                        </Button>
                      </div>
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => handleEdit(item)}
                          title="Edit Guide"
                        >
                          <Edit className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                          onClick={() => setDeletingGuide(item)}
                          title="Delete Guide"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Add / Edit Guide Dialog ─── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              {editingGuide ? 'Edit Resource Guide' : 'Create New Resource Guide'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure PDF guide titles, download links, and category metadata for the public resources hub.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Guide Title *</Label>
              <Input
                placeholder="e.g. Enterprise ERP & HR Compliance Checklist 2026"
                value={form.title}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    title: val,
                    slug: prev.slug || val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
                  }));
                }}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">URL Slug / Identifier *</Label>
                <Input
                  placeholder="e.g. enterprise-compliance-checklist"
                  value={form.slug}
                  onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(val) => setForm((prev) => ({ ...prev, category: val }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description *</Label>
              <Textarea
                placeholder="Brief summary of the guide or playbook..."
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Format / Type Badge</Label>
                <Input
                  placeholder="e.g. PDF · 24 pages"
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Download URL or File Path *</Label>
                <Input
                  placeholder="e.g. /downloads/guide.pdf or https://..."
                  value={form.downloadUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, downloadUrl: e.target.value }))}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold">Published & Active</Label>
                <p className="text-[11px] text-muted-foreground">
                  When enabled, this resource is visible to the public on /resources.
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={!form.title.trim() || !form.description.trim() || !form.downloadUrl.trim() || saveMutation.isPending}
              className="text-xs gap-1.5"
            >
              {saveMutation.isPending ? 'Saving...' : editingGuide ? 'Save Changes' : 'Create Guide'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ─── */}
      <Dialog open={!!deletingGuide} onOpenChange={(open) => !open && setDeletingGuide(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <Trash2 className="size-4" /> Delete Resource Guide
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to delete &ldquo;{deletingGuide?.title}&rdquo;? This action will remove it from the public resources directory.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setDeletingGuide(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deletingGuide && deleteMutation.mutate(deletingGuide.id)}
              disabled={deleteMutation.isPending}
              className="text-xs"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
