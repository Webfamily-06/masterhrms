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
  CalendarDays,
  Plus,
  Search,
  Trash2,
  Edit2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function LeaveTypesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '', maxDays: '12', isPaid: true });

  const { data: types = [], isLoading } = useQuery<any[]>({
    queryKey: ['leave-types-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/leave/types');
      return Array.isArray(res.data) ? res.data : res.data?.types || res.data?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      if (selectedType) {
        return api.put(`/api/leave/types/${selectedType.id}`, { ...payload, maxDays: Number(payload.maxDays) || 12 });
      }
      return api.post('/api/leave/types', { ...payload, maxDays: Number(payload.maxDays) || 12 });
    },
    onSuccess: () => {
      toast.success(selectedType ? 'Leave type updated' : 'Leave policy created');
      queryClient.invalidateQueries({ queryKey: ['leave-types-list'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to save leave type');
    },
  });

  const resetForm = () => {
    setSelectedType(null);
    setFormData({ name: '', code: '', maxDays: '12', isPaid: true });
  };

  const filtered = useMemo(() => {
    return types.filter((t) => t.name?.toLowerCase().includes(search.toLowerCase()) || t.code?.toLowerCase().includes(search.toLowerCase()));
  }, [types, search]);

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Leave Types & Entitlement Policies</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Define statutory leave categories (Casual, Sick, Maternity, Earned) and quotas.</p>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-1.5 bg-primary">
          <Plus className="w-4 h-4" /> Add Leave Policy
        </Button>
      </div>

      <Card className="border-border">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search leave policies..."
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
                <TableHead>Leave Type</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-center">Annual Entitlement</TableHead>
                <TableHead className="text-center">Classification</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Loading policies...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No leave types configured.</TableCell>
                </TableRow>
              ) : (
                filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-primary" />
                        {t.name}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-xs uppercase">{t.code || t.name.slice(0, 3)}</TableCell>
                    <TableCell className="text-center font-bold">{t.maxDays || t.days || 12} Days</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={t.isPaid ? 'default' : 'secondary'}>
                        {t.isPaid ? 'PAID LEAVE' : 'UNPAID'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default">ACTIVE</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setSelectedType(t);
                          setFormData({ name: t.name, code: t.code || '', maxDays: String(t.maxDays || 12), isPaid: Boolean(t.isPaid) });
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
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
            <DialogTitle>{selectedType ? 'Edit Leave Policy' : 'Add Leave Type'}</DialogTitle>
            <DialogDescription>Configure annual quota and remuneration rules.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Policy Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Annual Vacation"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="AL"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Days Allowed</Label>
                <Input
                  type="number"
                  value={formData.maxDays}
                  onChange={(e) => setFormData({ ...formData, maxDays: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={createMutation.isPending || !formData.name.trim()}
              onClick={() => createMutation.mutate(formData)}
            >
              Save Policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
