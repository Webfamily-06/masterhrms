'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatSystemAmount } from '@/lib/currency';
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ShoppingCart,
  Plus,
  Search,
  Printer,
  Truck,
  CheckCircle2,
  Clock,
  Eye,
} from 'lucide-react';
import Link from 'next/link';

export default function PurchaseOrdersPage() {
  const [search, setSearch] = useState('');

  const { data: purchases = [], isLoading } = useQuery<any[]>({
    queryKey: ['purchase-orders-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/purchases?limit=100');
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
  });

  const filtered = useMemo(() => {
    return purchases.filter((p) => {
      const q = search.toLowerCase();
      return (
        (p.purchaseNo && p.purchaseNo.toLowerCase().includes(q)) ||
        (p.supplier?.name && p.supplier.name.toLowerCase().includes(q)) ||
        (p.supplierName && p.supplierName.toLowerCase().includes(q))
      );
    });
  }, [purchases, search]);

  const totalProcured = useMemo(() => {
    return purchases.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
  }, [purchases]);

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Purchase Orders (PO)</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage supplier purchase orders, track inbound dispatches, and verify GRNs.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Link href="/purchases">
            <Button size="sm" className="gap-1.5 bg-primary">
              <Plus className="w-4 h-4" /> New Purchase Order
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Total Purchase Orders</p>
              <h3 className="text-2xl font-bold mt-1">{purchases.length}</h3>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Procurement Volume</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600">{formatSystemAmount(totalProcured)}</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-600">
              <Truck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Settled & Received</p>
              <h3 className="text-2xl font-bold mt-1 text-purple-600">
                {purchases.filter((p) => p.paymentStatus === 'PAID' || p.status === 'RECEIVED').length}
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
              placeholder="Search by PO # or supplier..."
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
                <TableHead>PO ID</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Paid Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Loading purchase orders...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No purchase orders found.</TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono font-semibold text-primary">
                      {p.purchaseNo || `PO-${p.id.slice(0, 6)}`}
                    </TableCell>
                    <TableCell className="font-medium">{p.supplier?.name || p.supplierName || 'Supplier'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(p.date || p.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatSystemAmount(Number(p.total) || 0)}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">
                      {formatSystemAmount(Number(p.paidAmount) || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={p.paymentStatus === 'PAID' ? 'default' : 'secondary'}>
                        {p.status || p.paymentStatus || 'ORDERED'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/purchases`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
