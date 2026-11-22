'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Banknote,
  Search,
  Printer,
  Calendar,
  Store,
  CreditCard,
} from 'lucide-react';

export default function CashSalesPage() {
  const [search, setSearch] = useState('');

  const { data: sales = [], isLoading } = useQuery<any[]>({
    queryKey: ['cash-sales-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/sales?limit=100');
      const all = Array.isArray(res.data) ? res.data : res.data?.data || [];
      return all.filter((s: any) => s.paymentMethod?.toLowerCase() === 'cash' || !s.paymentMethod);
    },
  });

  const filtered = useMemo(() => {
    return sales.filter((s) => {
      const q = search.toLowerCase();
      return (
        (s.invoiceNo && s.invoiceNo.toLowerCase().includes(q)) ||
        (s.customerName && s.customerName.toLowerCase().includes(q))
      );
    });
  }, [sales, search]);

  const totalCash = useMemo(() => {
    return sales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
  }, [sales]);

  return (
    <div className="space-y-6">
      <BreadcrumbNav className="mb-2" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Cash & Counter Sales</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time register receipts, counter transactions, and instant cash reconciliations.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
          <Printer className="w-4 h-4" /> Print Daily Register
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Total Cash Receipts</p>
              <h3 className="text-2xl font-bold mt-1">{sales.length}</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-600">
              <Banknote className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Register Cash Volume</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600">{formatSystemAmount(totalCash)}</h3>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600">
              <Store className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Average Ticket Size</p>
              <h3 className="text-2xl font-bold mt-1 text-purple-600">
                {formatSystemAmount(sales.length > 0 ? totalCash / sales.length : 0)}
              </h3>
            </div>
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 rounded-lg text-purple-600">
              <CreditCard className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search receipt # or customer..."
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
                <TableHead>Receipt ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Register Date</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead className="text-right">Paid Cash</TableHead>
                <TableHead className="text-center">Method</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Loading cash sales...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No cash counter sales recorded today.</TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono font-semibold text-primary">
                      {s.invoiceNo || s.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>{s.customerName || 'Counter Walk-in'} </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(s.date || s.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">{s.cashierName || 'Main Register'}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">
                      {formatSystemAmount(Number(s.paidAmount || s.total) || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono text-xs">CASH</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default">COLLECTED</Badge>
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
