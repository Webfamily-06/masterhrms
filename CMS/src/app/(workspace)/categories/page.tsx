'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FolderTree,
  Plus,
  Search,
  Trash2,
  Edit2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState('');

  const { data: categories = [], isLoading } = useQuery<any[]>({
    queryKey: ['categories-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/products/categories');
      return Array.isArray(res.data) ? res.data : res.data?.categories || res.data?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (catName: string) => {
      if (selectedCat) {
        return api.put(`/api/products/categories/${selectedCat.id}`, { name: catName });
      }
      return api.post('/api/products/categories', { name: catName });
    },
    onSuccess: () => {
      toast.success(selectedCat ? 'Category updated' : 'Category created');
      queryClient.invalidateQueries({ queryKey: ['categories-list'] });
      setIsDialogOpen(false);
      setName('');
      setSelectedCat(null);
    },
    onError: (err: any) => {
      toast.error((err?.response?.data?.error || err?.message) || 'Failed to save category');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/products/categories/${id}`);
    },
    onSuccess: () => {
      toast.success('Category deleted');
      queryClient.invalidateQueries({ queryKey: ['categories-list'] });
    },
    onError: (err: any) => {
      toast.error((err?.response?.data?.error || err?.message) || 'Failed to delete category');
    },
  });

  const filtered = useMemo(() => {
    return categories.filter((c) => c.name?.toLowerCase().includes(search.toLowerCase()));
  }, [categories, search]);

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Product Categories</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Organize taxonomy, product lines, and POS department groupings.</p>
        </div>
        <Button size="sm" onClick={() => { setSelectedCat(null); setName(''); setIsDialogOpen(true); }} className="gap-1.5 bg-primary">
          <Plus className="w-4 h-4" /> Add Category
        </Button>
      </div>

      <Card className="border-border">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search category name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Category Name</TableHead>
                <TableHead className="text-center">Items in Category</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">Loading categories...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">No product categories defined.</TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                      <div className="flex items-center gap-2">
                        <FolderTree className="w-4 h-4 text-primary" />
                        {c.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{c._count?.products || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default">ACTIVE</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setSelectedCat(c);
                            setName(c.name);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-700"
                          onClick={() => {
                            if (confirm(`Delete category ${c.name}?`)) {
                              deleteMutation.mutate(c.id);
                            }
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{selectedCat ? 'Edit Category' : 'Add Category'}</DialogTitle>
            <DialogDescription>Define a product classification category.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Category Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Electronics, Footwear, Groceries"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={createMutation.isPending || !name.trim()}
              onClick={() => createMutation.mutate(name)}
            >
              Save Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
