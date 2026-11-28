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
  Scale,
  Plus,
  Search,
  Trash2,
  Edit2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function UnitsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', shortName: '' });

  const { data: units = [], isLoading } = useQuery<any[]>({
    queryKey: ['units-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/products/units');
      return Array.isArray(res.data) ? res.data : res.data?.units || res.data?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      if (selectedUnit) {
        return api.put(`/api/products/units/${selectedUnit.id}`, payload);
      }
      return api.post('/api/products/units', payload);
    },
    onSuccess: () => {
      toast.success(selectedUnit ? 'Unit updated' : 'Unit created');
      queryClient.invalidateQueries({ queryKey: ['units-list'] });
      setIsDialogOpen(false);
      setFormData({ name: '', shortName: '' });
      setSelectedUnit(null);
    },
    onError: (err: any) => {
      toast.error((err?.response?.data?.error || err?.message) || 'Failed to save unit');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/products/units/${id}`);
    },
    onSuccess: () => {
      toast.success('Unit deleted');
      queryClient.invalidateQueries({ queryKey: ['units-list'] });
    },
    onError: (err: any) => {
      toast.error((err?.response?.data?.error || err?.message) || 'Failed to delete unit');
    },
  });

  const filtered = useMemo(() => {
    return units.filter((u) => u.name?.toLowerCase().includes(search.toLowerCase()) || u.shortName?.toLowerCase().includes(search.toLowerCase()));
  }, [units, search]);

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Units of Measure (UOM)</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage measurement metrics (Pieces, Kilograms, Liters, Boxes) for stock cataloging.</p>
        </div>
        <Button size="sm" onClick={() => { setSelectedUnit(null); setFormData({ name: '', shortName: '' }); setIsDialogOpen(true); }} className="gap-1.5 bg-primary">
          <Plus className="w-4 h-4" /> Add Unit
        </Button>
      </div>

      <Card className="border-border">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search units..."
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
                <TableHead>Unit Name</TableHead>
                <TableHead>Short Code</TableHead>
                <TableHead className="text-center">Products</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">Loading units...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">No measurement units defined.</TableCell>
                </TableRow>
              ) : (
                filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                      <div className="flex items-center gap-2">
                        <Scale className="w-4 h-4 text-primary" />
                        {u.name}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-xs uppercase">{u.shortName}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{u._count?.products || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setSelectedUnit(u);
                            setFormData({ name: u.name, shortName: u.shortName || '' });
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
                            if (confirm(`Delete unit ${u.name}?`)) {
                              deleteMutation.mutate(u.id);
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
            <DialogTitle>{selectedUnit ? 'Edit Unit' : 'Add Unit of Measure'}</DialogTitle>
            <DialogDescription>Define standard inventory unit names and abbreviated symbols.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Unit Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Kilogram, Box, Piece"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Short Code *</Label>
              <Input
                value={formData.shortName}
                onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                placeholder="e.g. kg, bx, pcs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={createMutation.isPending || !formData.name || !formData.shortName}
              onClick={() => createMutation.mutate(formData)}
            >
              Save Unit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
