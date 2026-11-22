'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatSystemAmount } from '@/lib/currency';
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
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  Building2,
  Trash2,
  Edit2,
  Download,
  Printer,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  gstin?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  creditLimit?: number | null;
  notes?: string | null;
  createdAt: string;
  sales?: { total: number; paidAmount: number; paymentStatus: string }[];
  _count?: { sales: number };
}

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gstin: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    creditLimit: '',
    notes: '',
  });

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/customers');
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      if (selectedCustomer) {
        return api.put(`/api/customers/${selectedCustomer.id}`, payload);
      }
      return api.post('/api/customers', payload);
    },
    onSuccess: () => {
      toast.success(selectedCustomer ? 'Customer updated successfully' : 'Customer created successfully');
      queryClient.invalidateQueries({ queryKey: ['customers-list'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to save customer');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/customers/${id}`);
    },
    onSuccess: () => {
      toast.success('Customer deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['customers-list'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to delete customer');
    },
  });

  const resetForm = () => {
    setSelectedCustomer(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      gstin: '',
      address: '',
      city: '',
      state: '',
      country: 'India',
      creditLimit: '',
      notes: '',
    });
  };

  const handleOpenEdit = (c: Customer) => {
    setSelectedCustomer(c);
    setFormData({
      name: c.name || '',
      email: c.email || '',
      phone: c.phone || '',
      gstin: c.gstin || '',
      address: c.address || '',
      city: c.city || '',
      state: c.state || '',
      country: c.country || 'India',
      creditLimit: c.creditLimit ? String(c.creditLimit) : '',
      notes: c.notes || '',
    });
    setIsDialogOpen(true);
  };

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q))
      );
    });
  }, [customers, search]);

  const totalOutstanding = useMemo(() => {
    return customers.reduce((acc, c) => {
      if (!c.sales) return acc;
      const outstanding = c.sales.reduce((sum, s) => sum + (s.total - (s.paidAmount || 0)), 0);
      return acc + (outstanding > 0 ? outstanding : 0);
    }, 0);
  }, [customers]);

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Customers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage client accounts, credit terms, and transaction histories.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-1.5 bg-primary">
            <Plus className="w-4 h-4" /> Add Customer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Total Customers</p>
              <h3 className="text-2xl font-bold mt-1">{customers.length}</h3>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Total Receivables (AR)</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-600">{formatSystemAmount(totalOutstanding)}</h3>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg text-amber-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Active Transactions</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600">
                {customers.reduce((sum, c) => sum + (c._count?.sales || 0), 0)}
              </h3>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <div className="p-4 border-b border-border flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, city..."
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
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead className="text-right">Credit Limit</TableHead>
                <TableHead className="text-center">Orders</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Loading customers...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No customers found.</TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                          {c.name.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">{c.name}</div>
                          <div className="text-xs text-muted-foreground">Joined {new Date(c.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        {c.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3 text-muted-foreground" /> {c.email}</div>}
                        {c.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-muted-foreground" /> {c.phone}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        {[c.city, c.state, c.country].filter(Boolean).join(', ') || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{c.gstin || '—'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {c.creditLimit ? formatSystemAmount(c.creditLimit) : 'No Limit'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{c._count?.sales || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEdit(c)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => {
                            if (confirm(`Delete customer ${c.name}?`)) {
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
            <DialogDescription>Fill out the profile and billing details for this customer.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Customer / Company Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Acme Corporation"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="billing@acme.com"
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
            <div className="space-y-1.5">
              <Label>GSTIN</Label>
              <Input
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                placeholder="29AAAAA0000A1Z5"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Credit Limit (₹)</Label>
              <Input
                type="number"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                placeholder="50000"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street address, Suite / Floor"
              />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
              />
            </div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={createMutation.isPending || !formData.name.trim()}
              onClick={() => createMutation.mutate(formData)}
            >
              {createMutation.isPending ? 'Saving...' : 'Save Customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
