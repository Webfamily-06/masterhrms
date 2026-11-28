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
  Tag,
  Plus,
  Search,
  Trash2,
  Edit2,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';

export default function BrandsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState('');

  const { data: brands = [], isLoading } = useQuery<any[]>({
    queryKey: ['brands-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/products/brands');
      return Array.isArray(res.data) ? res.data : res.data?.brands || res.data?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (brandName: string) => {
      if (selectedBrand) {
        return api.put(`/api/products/brands/${selectedBrand.id}`, { name: brandName });
      }
      return api.post('/api/products/brands', { name: brandName });
    },
    onSuccess: () => {
      toast.success(selectedBrand ? 'Brand updated' : 'Brand created');
      queryClient.invalidateQueries({ queryKey: ['brands-list'] });
      setIsDialogOpen(false);
      setName('');
      setSelectedBrand(null);
    },
    onError: (err: any) => {
      toast.error((err?.response?.data?.error || err?.message) || 'Failed to save brand');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/products/brands/${id}`);
    },
    onSuccess: () => {
      toast.success('Brand deleted');
      queryClient.invalidateQueries({ queryKey: ['brands-list'] });
    },
    onError: (err: any) => {
      toast.error((err?.response?.data?.error || err?.message) || 'Failed to delete brand');
    },
  });

  const filtered = useMemo(() => {
    return brands.filter((b) => b.name?.toLowerCase().includes(search.toLowerCase()));
  }, [brands, search]);

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Product Brands</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage OEM labels, manufacturers, and product branding catalogs.</p>
        </div>
        <Button size="sm" onClick={() => { setSelectedBrand(null); setName(''); setIsDialogOpen(true); }} className="gap-1.5 bg-primary">
          <Plus className="w-4 h-4" /> Add Brand
        </Button>
      </div>

      <Card className="border-border">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search brand name..."
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
                <TableHead>Brand Name</TableHead>
                <TableHead className="text-center">Products Linked</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">Loading brands...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">No brands registered.</TableCell>
                </TableRow>
              ) : (
                filtered.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-primary" />
                        {b.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{b._count?.products || 0}</Badge>
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
                            setSelectedBrand(b);
                            setName(b.name);
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
                            if (confirm(`Delete brand ${b.name}?`)) {
                              deleteMutation.mutate(b.id);
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
            <DialogTitle>{selectedBrand ? 'Edit Brand' : 'Add Brand'}</DialogTitle>
            <DialogDescription>Enter the manufacturer or brand identity.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Brand Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sony, Apple, Nike"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={createMutation.isPending || !name.trim()}
              onClick={() => createMutation.mutate(name)}
            >
              Save Brand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
