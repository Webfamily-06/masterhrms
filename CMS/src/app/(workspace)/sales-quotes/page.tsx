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
  FileText,
  Plus,
  Search,
  Printer,
  Trash2,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SalesQuotesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    clientName: '',
    clientEmail: '',
    amount: '',
    validUntil: '',
    notes: '',
  });

  const { data: quotes = [], isLoading } = useQuery<any[]>({
    queryKey: ['sales-quotes-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/crm/proposals');
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      return api.post('/api/crm/proposals', {
        ...payload,
        amount: Number(payload.amount) || 0,
        validUntil: payload.validUntil ? new Date(payload.validUntil).toISOString() : null,
      });
    },
    onSuccess: () => {
      toast.success('Sales quotation created successfully');
      queryClient.invalidateQueries({ queryKey: ['sales-quotes-list'] });
      setIsDialogOpen(false);
      setFormData({ title: '', clientName: '', clientEmail: '', amount: '', validUntil: '', notes: '' });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to create quotation');
    },
  });

  const convertMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/api/crm/proposals/${id}/convert`, {});
    },
    onSuccess: () => {
      toast.success('Quotation converted to active sales invoice!');
      queryClient.invalidateQueries({ queryKey: ['sales-quotes-list'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to convert quotation');
    },
  });

  const filtered = useMemo(() => {
    return quotes.filter((q) => {
      const term = search.toLowerCase();
      return (
        (q.proposalNo && q.proposalNo.toLowerCase().includes(term)) ||
        (q.title && q.title.toLowerCase().includes(term)) ||
        (q.clientName && q.clientName.toLowerCase().includes(term))
      );
    });
  }, [quotes, search]);

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Sales Quotes & Estimates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Generate client quotations, estimate values, track validity, and convert to invoices.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button size="sm" onClick={() => setIsDialogOpen(true)} className="gap-1.5 bg-primary">
            <Plus className="w-4 h-4" /> Create Quotation
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Total Quotations</p>
              <h3 className="text-2xl font-bold mt-1">{quotes.length}</h3>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Quoted Pipeline</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600">
                {formatSystemAmount(quotes.reduce((acc, q) => acc + (Number(q.amount) || 0), 0))}
              </h3>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-600">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Accepted & Converted</p>
              <h3 className="text-2xl font-bold mt-1 text-purple-600">
                {quotes.filter((q) => q.status === 'ACCEPTED').length}
              </h3>
            </div>
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 rounded-lg text-purple-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search quotes by title, client, quote #..."
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
                <TableHead>Quote ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Proposal Title</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Loading quotations...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No active quotations found.</TableCell>
                </TableRow>
              ) : (
                filtered.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-mono font-semibold text-primary">
                      {q.proposalNo || q.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{q.clientName}</div>
                      {q.clientEmail && <div className="text-xs text-muted-foreground">{q.clientEmail}</div>}
                    </TableCell>
                    <TableCell className="font-medium text-gray-800 dark:text-gray-200">{q.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {q.validUntil ? new Date(q.validUntil).toLocaleDateString() : '30 Days'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatSystemAmount(Number(q.amount) || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={q.status === 'ACCEPTED' ? 'default' : 'secondary'}>
                        {q.status || 'PENDING'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 text-primary"
                        onClick={() => convertMutation.mutate(q.id)}
                        disabled={convertMutation.isPending || q.status === 'CONVERTED'}
                      >
                        Convert <ArrowRight className="w-3 h-3" />
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Sales Quotation</DialogTitle>
            <DialogDescription>Create a formal estimate for your prospective or existing client.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Quotation / Project Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Enterprise HRMS Software License"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Client Name *</Label>
              <Input
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                placeholder="Client / Company Name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Client Email</Label>
                <Input
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                  placeholder="client@domain.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Quoted Amount (₹) *</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="75000"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Validity Expiry Date</Label>
              <Input
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={createMutation.isPending || !formData.title || !formData.clientName}
              onClick={() => createMutation.mutate(formData)}
            >
              {createMutation.isPending ? 'Generating...' : 'Issue Quotation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
