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
  Warehouse as WarehouseIcon,
  Plus,
  Search,
  MapPin,
  Phone,
  Mail,
  Trash2,
  Edit2,
  Printer,
  Building,
} from 'lucide-react';
import { toast } from 'sonner';

interface WarehouseItem {
  id: string;
  name: string;
  location?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  isDefault?: boolean;
  createdAt: string;
  _count?: { stocks: number; sales: number; purchases: number };
}

export default function WarehousePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    city: '',
    phone: '',
    email: '',
  });

  const { data: warehouses = [], isLoading } = useQuery<WarehouseItem[]>({
    queryKey: ['warehouses-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/products/warehouses');
      return Array.isArray(res.data) ? res.data : res.data?.warehouses || res.data?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      if (selectedWarehouse) {
        return api.put(`/api/products/warehouses/${selectedWarehouse.id}`, payload);
      }
      return api.post('/api/products/warehouses', payload);
    },
    onSuccess: () => {
      toast.success(selectedWarehouse ? 'Warehouse updated successfully' : 'Warehouse created successfully');
      queryClient.invalidateQueries({ queryKey: ['warehouses-list'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to save warehouse');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/products/warehouses/${id}`);
    },
    onSuccess: () => {
      toast.success('Warehouse deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['warehouses-list'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to delete warehouse');
    },
  });

  const resetForm = () => {
    setSelectedWarehouse(null);
    setFormData({ name: '', location: '', city: '', phone: '', email: '' });
  };

  const handleOpenEdit = (w: WarehouseItem) => {
    setSelectedWarehouse(w);
    setFormData({
      name: w.name || '',
      location: w.location || '',
      city: w.city || '',
      phone: w.phone || '',
      email: w.email || '',
    });
    setIsDialogOpen(true);
  };

  const filtered = useMemo(() => {
    return warehouses.filter((w) => {
      const q = search.toLowerCase();
      return (
        w.name.toLowerCase().includes(q) ||
        (w.city && w.city.toLowerCase().includes(q)) ||
        (w.location && w.location.toLowerCase().includes(q))
      );
    });
  }, [warehouses, search]);

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Warehouse Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Maintain multi-location fulfillment facilities, storage zones, and branch locations.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-1.5 bg-primary">
            <Plus className="w-4 h-4" /> Add Warehouse
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Active Warehouses</p>
              <h3 className="text-2xl font-bold mt-1">{warehouses.length}</h3>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600">
              <WarehouseIcon className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Default Facility</p>
              <h3 className="text-base font-semibold mt-1 truncate">
                {warehouses.find((w) => w.isDefault)?.name || 'Primary Central Depot'}
              </h3>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-600">
              <Building className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Coverage Cities</p>
              <h3 className="text-2xl font-bold mt-1 text-purple-600">
                {new Set(warehouses.map((w) => w.city).filter(Boolean)).size || 1}
              </h3>
            </div>
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 rounded-lg text-purple-600">
              <MapPin className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search warehouses by name or location..."
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
                <TableHead>Warehouse</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Contact Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-center">Default Hub</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Loading warehouses...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No warehouses configured.</TableCell>
                </TableRow>
              ) : (
                filtered.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center font-bold">
                          <WarehouseIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">{w.name}</div>
                          <div className="text-xs text-muted-foreground">Created {new Date(w.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        {[w.location, w.city].filter(Boolean).join(', ') || 'Central Area'}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{w.phone || '—'}</TableCell>
                    <TableCell className="text-xs">{w.email || '—'}</TableCell>
                    <TableCell className="text-center">
                      {w.isDefault ? (
                        <Badge variant="default">Primary Hub</Badge>
                      ) : (
                        <Badge variant="secondary">Branch</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEdit(w)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => {
                            if (confirm(`Delete warehouse ${w.name}?`)) {
                              deleteMutation.mutate(w.id);
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}</DialogTitle>
            <DialogDescription>Configure warehouse facility details and storage coordinates.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Warehouse Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. South Regional Hub"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Address / Street Location</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Plot 42, Logistics Park"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Bangalore"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 9876543210"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="warehouse@domain.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={createMutation.isPending || !formData.name.trim()}
              onClick={() => createMutation.mutate(formData)}
            >
              {createMutation.isPending ? 'Saving...' : 'Save Facility'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
